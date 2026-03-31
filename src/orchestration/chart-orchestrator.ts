import { Configuration, RenderLayer, UnsubscribeFn } from '../models/public/configuration';
import { DataItem } from '../models/public/data-item';
import { BubbleState } from '../models/internal/bubble-state';
import { SimulationSnapshot } from '../models/internal/simulation-state';
import { IRenderer, LayerHook, RenderFrameState } from '../interfaces/i-renderer';
import { ILayoutEngine } from '../interfaces/i-layout-engine';
import { EventBus, EventName, EventHandler } from '../core/event-bus';
import { AnimationLoop } from '../core/animation/animation-loop';
import { StaticLayout } from '../core/layout/static-layout';
import { PhysicsLayout } from '../core/layout/physics-layout';
import { CanvasRenderer } from '../renderers/canvas/canvas-renderer';
import { SvgRenderer } from '../renderers/svg/svg-renderer';
import { DomInteractionHandler } from '../platform/dom-interaction-handler';
import { DomTooltip } from '../features/tooltip';
import { validateConfig, resolveRenderer, warnDataLimitExceeded } from '../utils/validation';
import { normalizeConfig } from '../utils/config';
import { generateId } from '../utils/helper';
import { stepTween, stepScale, initBubbleEntry, initBubbleTransition } from '../core/animation/tween';

const PKG = 'bubble-chart-js';
const DEFAULT_COLORS = [
  '#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#34495E', '#F1C40F', '#16A085',
];

export class ChartOrchestrator {
  private readonly config:       Configuration;
  private readonly instanceId:   string;
  private bubbles:               BubbleState[] = [];
  private readonly layoutEngine: ILayoutEngine;
  private readonly renderer:     IRenderer;
  private readonly loop:         AnimationLoop;
  private readonly eventBus:     EventBus;
  private readonly interaction:  DomInteractionHandler;
  private tooltip:               DomTooltip | null = null;
  private resolvedRenderer:      'svg' | 'canvas';
  private lastSnapshot:          Readonly<SimulationSnapshot>;
  private physicsWasActive       = false;
  private readonly containerEl:  HTMLElement;

  constructor(rawConfig: Partial<Configuration> & { canvasContainerId: string; data: DataItem[] }) {
    const config = normalizeConfig(rawConfig);
    validateConfig(config);  // throws if id missing
    this.config = config;
    this.instanceId = generateId('bcjs');

    // ── Find container ──────────────────────────────────────────────────────
    const container = document.getElementById(config.canvasContainerId);
    if (!container) {
      throw new Error(`${PKG}: Container element #${config.canvasContainerId} not found.`);
    }
    this.containerEl = container;

    // ── Resolve renderer (ONCE at init) ─────────────────────────────────────
    const mode = config.render?.mode ?? 'auto';
    this.resolvedRenderer = resolveRenderer(config.data.length, mode);

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${PKG}: renderer resolved to "${this.resolvedRenderer}" based on ${config.data.length} items at init.`
      );
    }

    // Fire onRendererResolved callback — only when mode was "auto"
    if (mode === 'auto' && config.onRendererResolved) {
      config.onRendererResolved(this.resolvedRenderer, 'auto-init');
    }

    // Warn about deprecated onBubbleClick
    if (config.onBubbleClick) {
      console.warn(
        `${PKG}: onBubbleClick config option is deprecated. ` +
        `Use chart.on('bubble:click', fn) instead.`
      );
    }

    // ── Create subsystems ───────────────────────────────────────────────────
    this.loop        = new AnimationLoop();
    this.eventBus    = new EventBus();
    this.interaction = new DomInteractionHandler();

    const layoutCfg = config.layout;
    if (layoutCfg?.type === 'physics') {
      this.layoutEngine = new PhysicsLayout(layoutCfg.physics);
    } else {
      this.layoutEngine = new StaticLayout();
    }

    this.renderer = this.resolvedRenderer === 'svg'
      ? new SvgRenderer(config)
      : new CanvasRenderer(config);

    // ── Mount renderer ──────────────────────────────────────────────────────
    this.renderer.mount(container);

    // ── Build initial bubble states ─────────────────────────────────────────
    const width  = container.clientWidth;
    const height = container.clientHeight;
    this.bubbles = config.data.map((item, i) => this.createBubbleState(item, i, config));

    // ── Initialize layout ───────────────────────────────────────────────────
    this.layoutEngine.initialize(this.bubbles, width, height);

    // ── Initialize tween for all bubbles (entry animation) ──────────────────
    for (const b of this.bubbles) {
      initBubbleEntry(b);
      // After entry init, sync render position to physics position for static layout
      b.renderX      = b.x;
      b.renderY      = b.y;
      b.renderRadius = b.radius;
    }

    // ── Build initial snapshot ──────────────────────────────────────────────
    this.lastSnapshot = this.buildSnapshot();

    // ── Mount interaction handler ───────────────────────────────────────────
    // Get the root element from the renderer (canvas el or svg el)
    const surfaceEl = container.querySelector('canvas, svg') as HTMLElement | null;
    if (surfaceEl) {
      this.interaction.mount(surfaceEl);
      this.interaction.updateBubbles(this.bubbles);
    }

    // ── Wire hover → targetScale ────────────────────────────────────────────
    this.interaction.onHover((item) => {
      const hoverScale = config.interaction?.hoverScale ?? 1.08;
      for (const b of this.bubbles) {
        b.targetScale = (item && b.id === item.id) ? hoverScale : 1.0;
      }
      // Emit hover event
      this.eventBus.emit('bubble:hover', item);
      // Wake the loop for the scale animation
      this.loop.start();
    });

    // ── Wire click → event bus ──────────────────────────────────────────────
    this.interaction.onClick((item, event) => {
      this.eventBus.emit('bubble:click', { item, event });
      // V1 deprecated onBubbleClick compat
      if (config.onBubbleClick) {
        config.onBubbleClick(item, event);
      }
    });

    // ── Tooltip ─────────────────────────────────────────────────────────────
    if (config.interaction?.tooltipEnabled !== false && config.showToolTip !== false) {
      this.tooltip = new DomTooltip(container, this.instanceId, config);

      // DomInteractionHandler is the single source of truth for which bubble is hovered.
      // Track the currently hovered item so the pointermove listener can reposition
      // the tooltip on every move within the same bubble (onHover only fires on change).
      let hoveredItem: DataItem | null = null;
      this.interaction.onHover((item) => {
        hoveredItem = item;
        if (!item) this.tooltip?.hide();
      });

      const surfaceForTooltip = container.querySelector('canvas, svg') as HTMLElement | null;
      if (surfaceForTooltip) {
        surfaceForTooltip.addEventListener('pointermove', (e: Event) => {
          const pe = e as PointerEvent;
          if (hoveredItem) {
            this.tooltip?.show(hoveredItem, pe.clientX, pe.clientY, config);
          }
        });
      }
    }

    // ── Animation loop subscribers ─────────────────────────────────────────
    this.loop.subscribe('physics', (_ts) => {
      const active = this.layoutEngine.tick();
      if (active) {
        this.lastSnapshot = this.buildSnapshot();
        this.eventBus.emit('simulation:tick', this.lastSnapshot);
        this.physicsWasActive = true;
      } else if (this.physicsWasActive) {
        // Physics just settled
        this.physicsWasActive = false;
        this.lastSnapshot = this.buildSnapshot();
        this.eventBus.emit('simulation:settled', this.lastSnapshot);
      }
      return active;
    });

    this.loop.subscribe('tween', (_ts) => {
      const easingFn  = config.animation?.transitionEasing;
      const hoverEase = config.interaction?.hoverEase ?? 0.10;
      let anyActive = false;
      for (const b of this.bubbles) {
        const tActive = stepTween(b, easingFn);
        const sActive = stepScale(b, hoverEase);
        anyActive = anyActive || tActive || sActive;
      }
      return anyActive;
    });

    const theme = config.render?.theme ?? 'flat';
    this.loop.subscribe('render', (ts) => {
      const state: RenderFrameState = {
        width:     container.clientWidth,
        height:    container.clientHeight,
        dpr:       window.devicePixelRatio || 1,
        theme,
        timestamp: ts,
      };
      this.renderer.renderFrame(this.bubbles, state);
      this.interaction.updateBubbles(this.bubbles);
      return false;  // render never drives the loop
    });

    // ── Resize handling ─────────────────────────────────────────────────────
    if (config.isResizeCanvasOnWindowSizeChange !== false) {
      const resizeObs = new ResizeObserver(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.renderer.resize(w, h);
        this.layoutEngine.update(this.bubbles, w, h);
        this.loop.start();
      });
      resizeObs.observe(container);
      // Store for cleanup
      (this as any)._resizeObs = resizeObs;
    }

    // ── Start the loop ──────────────────────────────────────────────────────
    this.loop.start();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  on<K extends EventName>(event: K, handler: EventHandler<K>): UnsubscribeFn {
    return this.eventBus.on(event, handler);
  }

  get simulation(): Readonly<SimulationSnapshot> {
    return this.lastSnapshot;
  }

  update(newData: DataItem[]): void {
    // Validate new data
    const tempConfig = { ...this.config, data: newData };
    validateConfig(tempConfig);

    // Warn if SVG renderer receives > 25 items
    warnDataLimitExceeded(newData.length, this.resolvedRenderer);

    // For SVG mode: silently truncate to top 25
    const effectiveData = (this.resolvedRenderer === 'svg' && newData.length > 25)
      ? [...newData].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, 25)
      : newData;

    const width  = this.containerEl.clientWidth;
    const height = this.containerEl.clientHeight;

    // Reconcile bubbles
    const existingById = new Map<string, BubbleState>(
      this.bubbles.map(b => [b.id, b])
    );
    const newBubbles: BubbleState[] = [];

    effectiveData.forEach((item, i) => {
      const existing = existingById.get(item.id!);
      if (existing) {
        // Update fields
        existing.label   = item.label;
        existing.value   = item.value;
        existing.color   = this.resolveColor(item, i, this.config);
        existing.opacity = this.resolveOpacity(item, this.config);
        if (item.icon !== undefined) existing.icon = item.icon;
        existing.shadowDirty = true;
        newBubbles.push(existing);
      } else {
        // New bubble
        const b = this.createBubbleState(item, i, this.config);
        initBubbleEntry(b);
        newBubbles.push(b);
      }
    });

    this.bubbles = newBubbles;

    // Re-run layout with reconciled bubbles
    this.layoutEngine.update(this.bubbles, width, height);

    // Set up transitions for existing bubbles (they have new physics positions)
    for (const b of this.bubbles) {
      if (b.tweenProgress >= 1) {
        // Already settled — start a position transition
        initBubbleTransition(b, b.x, b.y, b.radius);
      }
      // For new bubbles: already initialized via initBubbleEntry above
    }

    // Restart the loop
    this.physicsWasActive = true;
    this.loop.start();
  }

  destroy(): void {
    // Force-clear all event bus subscriptions
    this.eventBus.clear();

    this.loop.stop();
    this.renderer.dispose();
    this.interaction.dispose();
    this.layoutEngine.dispose();
    this.tooltip?.dispose();

    const resizeObs = (this as any)._resizeObs as ResizeObserver | undefined;
    resizeObs?.disconnect();
  }

  addLayerHook(hook: Omit<LayerHook, 'id'>): string {
    return this.renderer.addLayerHook(hook);
  }

  removeLayerHook(id: string): void {
    this.renderer.removeLayerHook(id);
  }

  getLayerHooks(layer?: RenderLayer): ReadonlyArray<LayerHook> {
    return this.renderer.getLayerHooks(layer);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private createBubbleState(item: DataItem, index: number, config: Configuration): BubbleState {
    return {
      id:      item.id!,
      label:   item.label,
      value:   item.value,
      color:   this.resolveColor(item, index, config),
      opacity: this.resolveOpacity(item, config),
      icon:    item.icon,
      x:      0, y: 0, radius: 0,
      vx:     0, vy: 0,
      renderX:      0, renderY: 0, renderRadius: 0,
      renderScale:  1, targetScale: 1,
      tweenProgress: 1,
      tweenFrom:    undefined,
      shadowDirty:  true,
    };
  }

  private resolveColor(item: DataItem, index: number, config: Configuration): string {
    if (item.bubbleColor) return item.bubbleColor;
    if (config.colorPalette?.length) {
      return config.colorPalette[index % config.colorPalette.length];
    }
    if (config.defaultBubbleColor) return config.defaultBubbleColor;
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  }

  private resolveOpacity(item: DataItem, config: Configuration): number {
    // Priority: per-item > bubbleAppearance.opacity > 1 (fully opaque)
    const raw = item.opacity ?? config.bubbleAppearance?.opacity ?? 1;
    return Math.min(1, Math.max(0, raw));
  }

  private buildSnapshot(): Readonly<SimulationSnapshot> {
    return Object.freeze({
      alpha:     (this.layoutEngine as any).alpha ?? 0,
      settled:   !this.physicsWasActive,
      tickCount: (this.lastSnapshot?.tickCount ?? 0) + 1,
      bubbles:   Object.freeze(this.bubbles.map(b => Object.freeze({
        id:     b.id,
        x:      b.x,
        y:      b.y,
        radius: b.radius,
        vx:     b.vx,
        vy:     b.vy,
      }))),
    });
  }
}
