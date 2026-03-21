import { IRenderer, LayerHook, LayerHookFn, DrawContext, RenderFrameState } from '../../interfaces/i-renderer';
import { BubbleState } from '../../models/internal/bubble-state';
import { Configuration, RenderLayer } from '../../models/public/configuration';
import { DprManager } from './dpr-manager';
import { generateId } from '../../utils/helper';
import { computeFontSize, ITextMeasurer } from '../../features/text-wrapper';

const LAYER_ORDER: RenderLayer[] = ['background', 'shadows', 'bubbles', 'text', 'overlay', 'debug'];
const PKG = 'bubble-chart-js';

/** Canvas-backed text measurer (local to this renderer). */
class CanvasTextMeasurer implements ITextMeasurer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}
  measureText(text: string, fontSize: number, fontWeight: number, fontStyle: string, fontFamily: string): number {
    this.ctx.save();
    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    const width = this.ctx.measureText(text).width;
    this.ctx.restore();
    return width;
  }
}

export class CanvasRenderer implements IRenderer {
  private canvas!: HTMLCanvasElement;
  private ctx!:    CanvasRenderingContext2D;
  private dpr!:    DprManager;
  private measurer!: CanvasTextMeasurer;
  private container!: HTMLElement;

  // Hook storage: hooksByLayer[layer] = sorted array by priority
  private readonly hooksByLayer = new Map<RenderLayer, LayerHook[]>();

  constructor(private readonly config: Configuration) {
    for (const layer of LAYER_ORDER) {
      this.hooksByLayer.set(layer, []);
    }
  }

  mount(container: HTMLElement): void {
    this.container = container;

    // Create canvas
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      display:  'block',
      width:    '100%',
      height:   '100%',
      position: 'absolute',
      top:      '0',
      left:     '0',
    });

    // Canvas background
    if (this.config.canvasBackgroundColor?.trim()) {
      this.canvas.style.background = `#${this.config.canvasBackgroundColor}`;
    }

    container.style.position = container.style.position || 'relative';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error(`${PKG}: Failed to get 2D canvas context.`);
    this.ctx = ctx;
    this.measurer = new CanvasTextMeasurer(ctx);

    this.dpr = new DprManager(this.canvas, container);
    this.dpr.sync();

    // Register built-in hooks
    this.registerBuiltinHook('background', 0, this.drawBackground);
    this.registerBuiltinHook('shadows',    0, this.drawShadows);
    this.registerBuiltinHook('bubbles',    0, this.drawBubbles);
    this.registerBuiltinHook('text',       0, this.drawText);
    // overlay and debug: built-in no-ops (hooks can be added by developers)
    this.registerBuiltinHook('overlay',    0, () => {});
    this.registerBuiltinHook('debug',      0, this.drawDebug);
  }

  renderFrame(bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    for (const layer of LAYER_ORDER) {
      this.renderLayer(layer, bubbles, state);
    }
  }

  renderLayer(layer: RenderLayer, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    const hooks = this.hooksByLayer.get(layer);
    if (!hooks) return;

    const drawCtx: DrawContext = { type: 'canvas', canvas: this.ctx };

    for (const hook of hooks) {
      this.ctx.save();
      try {
        hook.fn(drawCtx, bubbles, state);
      } finally {
        this.ctx.restore();  // unconditional — even if hook throws
      }
    }
  }

  addLayerHook(hook: Omit<LayerHook, 'id'>): string {
    const id = generateId('hook');
    const entry: LayerHook = { ...hook, id };
    this.insertHook(entry);
    return id;
  }

  removeLayerHook(id: string): void {
    for (const [, hooks] of this.hooksByLayer) {
      const idx = hooks.findIndex(h => h.id === id);
      if (idx !== -1) {
        hooks.splice(idx, 1);
        return;
      }
    }
  }

  getLayerHooks(layer?: RenderLayer): ReadonlyArray<LayerHook> {
    if (layer) return this.hooksByLayer.get(layer) ?? [];
    const all: LayerHook[] = [];
    for (const hooks of this.hooksByLayer.values()) all.push(...hooks);
    return all;
  }

  resize(width: number, height: number): void {
    this.dpr.sync();
  }

  dispose(): void {
    this.canvas.remove();
    for (const hooks of this.hooksByLayer.values()) hooks.length = 0;
  }

  get logicalWidth():  number { return this.dpr?.logicalWidth  ?? 0; }
  get logicalHeight(): number { return this.dpr?.logicalHeight ?? 0; }
  get currentDpr():    number { return this.dpr?.dpr ?? 1; }

  /** Internal registration — bypasses the public guard, assigns "builtin:" prefix IDs. */
  private registerBuiltinHook(layer: RenderLayer, priority: number, fn: LayerHookFn, suffix?: string): void {
    const id = `builtin:${suffix ?? layer}`;
    const hook: LayerHook = { id, layer, priority, fn: fn.bind(this) };
    this.insertHook(hook);
  }

  private insertHook(hook: LayerHook): void {
    const hooks = this.hooksByLayer.get(hook.layer)!;
    // Insert maintaining priority order (ascending). Ties: append (registration order).
    let i = hooks.length;
    while (i > 0 && hooks[i - 1].priority > hook.priority) i--;
    hooks.splice(i, 0, hook);
  }

  // ── Built-in draw passes ───────────────────────────────────────────────────

  private drawBackground(ctx: DrawContext, _bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (!ctx.canvas) return;
    const c = ctx.canvas;
    c.clearRect(0, 0, state.width, state.height);
    if (this.config.canvasBackgroundColor?.trim()) {
      c.fillStyle = `#${this.config.canvasBackgroundColor}`;
      c.fillRect(0, 0, state.width, state.height);
    }
  }

  private drawShadows(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (state.theme !== 'glass') return;
    if (!ctx.canvas) return;
    const c = ctx.canvas;

    const maxBlur = this.config.render?.glassPerformanceHint === 'full' ? 28 : 12;

    for (const b of bubbles) {
      const r  = b.renderRadius * b.renderScale;
      const rx = b.renderX;
      const ry = b.renderY;

      c.shadowColor   = b.color;
      c.shadowBlur    = Math.min(r * 0.6, maxBlur);
      c.shadowOffsetX = 0;
      c.shadowOffsetY = 0;

      c.beginPath();
      c.arc(rx, ry, r * 0.95, 0, Math.PI * 2);
      c.fillStyle = b.color;
      c.fill();
    }
  }

  private drawBubbles(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (!ctx.canvas) return;
    const c = ctx.canvas;

    for (const b of bubbles) {
      const r  = b.renderRadius * b.renderScale;
      const rx = b.renderX;
      const ry = b.renderY;

      c.beginPath();
      c.arc(rx, ry, r, 0, Math.PI * 2);

      if (state.theme === 'glass') {
        // Radial gradient: lighter in upper-left, full color elsewhere
        const grad = c.createRadialGradient(rx - r * 0.3, ry - r * 0.3, r * 0.1, rx, ry, r);
        grad.addColorStop(0,   this.lightenColor(b.color, 0.45));
        grad.addColorStop(0.6, b.color);
        grad.addColorStop(1,   this.darkenColor(b.color, 0.15));
        c.fillStyle = grad;
      } else {
        c.fillStyle = b.color;
      }
      c.fill();

      if (state.theme === 'glass') {
        // Inner highlight arc
        c.beginPath();
        c.arc(rx - r * 0.2, ry - r * 0.25, r * 0.45, Math.PI * 1.1, Math.PI * 1.9);
        c.strokeStyle = 'rgba(255,255,255,0.35)';
        c.lineWidth   = r * 0.08;
        c.stroke();
      }
    }
  }

  private drawText(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (!ctx.canvas) return;
    const c = ctx.canvas;

    const baseFontSize  = this.config.fontSize      ?? 12;
    const fontFamily    = this.config.defaultFontFamily ?? 'Arial';
    const fontColor     = this.config.defaultFontColor  ?? '#ffffff';
    const textWrap      = this.config.textWrap      ?? true;
    const maxLines      = this.config.maxLines      ?? 'auto';

    for (const b of bubbles) {
      const r    = b.renderRadius * b.renderScale;
      const size = computeFontSize(r, baseFontSize);
      if (size < 6) continue;  // too small to render text

      c.fillStyle  = fontColor;
      c.font       = `400 ${size}px ${fontFamily}, sans-serif`;
      c.textAlign  = 'center';
      c.textBaseline = 'middle';

      if (textWrap) {
        const maxWidth   = r * 1.5;
        const lineHeight = size * 1.4;
        const words = b.label.trim().split(/\s+/);
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          if (c.measureText(test).width <= maxWidth) {
            current = test;
          } else {
            if (current) lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);

        const limit = maxLines === 'auto' ? lines.length : maxLines;
        const visible = lines.slice(0, limit);

        const startY = b.renderY - ((visible.length - 1) * lineHeight) / 2;
        for (let i = 0; i < visible.length; i++) {
          c.fillText(visible[i], b.renderX, startY + i * lineHeight);
        }
      } else {
        c.fillText(b.label, b.renderX, b.renderY);
      }

      // Icon rendering
      if (b.icon) {
        const iconFont = (b as any).iconFont ?? 'Material Symbols Outlined';
        c.font = `${size}px "${iconFont}"`;
        c.fillText(b.icon, b.renderX, b.renderY - r * 0.3);
      }
    }
  }

  private drawDebug(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    // Tree-shaken in production by DefinePlugin + dead-code elimination
    if (process.env.NODE_ENV !== 'production' && this.config.debug) {
      if (!ctx.canvas) return;
      const c = ctx.canvas;
      const opacity = this.config.debug.overlayOpacity ?? 0.55;
      c.globalAlpha = opacity;

      if (this.config.debug.showVelocityVectors) {
        for (const b of bubbles) {
          const scale = 5;
          c.beginPath();
          c.moveTo(b.renderX, b.renderY);
          c.lineTo(b.renderX + b.vx * scale, b.renderY + b.vy * scale);
          c.strokeStyle = '#ff0';
          c.lineWidth   = 2;
          c.stroke();
        }
      }

      if (this.config.debug.showBubbleIds) {
        c.fillStyle  = '#fff';
        c.font       = '10px monospace';
        c.textAlign  = 'center';
        c.textBaseline = 'top';
        for (const b of bubbles) {
          c.fillText(b.id, b.renderX, b.renderY - b.renderRadius - 12);
        }
      }
    }
  }

  // ── Color utilities ────────────────────────────────────────────────────────

  private lightenColor(hex: string, amount: number): string {
    return this.shiftColor(hex, amount);
  }
  private darkenColor(hex: string, amount: number): string {
    return this.shiftColor(hex, -amount);
  }
  private shiftColor(hex: string, amount: number): string {
    // Parse #rrggbb or #rgb
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    const r = Math.max(0, Math.min(255, parseInt(full.slice(0, 2), 16) + Math.round(amount * 255)));
    const g = Math.max(0, Math.min(255, parseInt(full.slice(2, 4), 16) + Math.round(amount * 255)));
    const b = Math.max(0, Math.min(255, parseInt(full.slice(4, 6), 16) + Math.round(amount * 255)));
    return `rgb(${r},${g},${b})`;
  }
}
