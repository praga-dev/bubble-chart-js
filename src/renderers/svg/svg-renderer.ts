import { IRenderer, LayerHook, LayerHookFn, DrawContext, RenderFrameState } from '../../interfaces/i-renderer';
import { BubbleState } from '../../models/internal/bubble-state';
import { Configuration, RenderLayer } from '../../models/public/configuration';
import { generateId } from '../../utils/helper';
import { computeFontSize } from '../../features/text-wrapper';

const NS = 'http://www.w3.org/2000/svg';
const LAYER_ORDER: RenderLayer[] = ['background', 'shadows', 'bubbles', 'text', 'overlay', 'debug'];

export class SvgRenderer implements IRenderer {
  private svgEl!:     SVGSVGElement;
  private defsEl!:    SVGDefsElement;
  private container!: HTMLElement;
  private width  = 0;
  private height = 0;

  // One <g> per layer
  private readonly layerGroups  = new Map<RenderLayer, SVGGElement>();
  // Hooks per layer, sorted by priority ascending
  private readonly hooksByLayer = new Map<RenderLayer, LayerHook[]>();

  constructor(private readonly config: Configuration) {
    for (const layer of LAYER_ORDER) {
      this.hooksByLayer.set(layer, []);
    }
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.width     = container.clientWidth;
    this.height    = container.clientHeight;

    container.style.position = container.style.position || 'relative';

    // Create root SVG
    this.svgEl = document.createElementNS(NS, 'svg') as SVGSVGElement;
    Object.assign(this.svgEl.style, {
      display:  'block',
      width:    '100%',
      height:   '100%',
      position: 'absolute',
      top:      '0',
      left:     '0',
      overflow: 'visible',
    });
    this.svgEl.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

    // Defs for gradients and filters
    this.defsEl = document.createElementNS(NS, 'defs') as SVGDefsElement;
    this.svgEl.appendChild(this.defsEl);

    // Create one <g> per layer in pipeline order
    for (const layer of LAYER_ORDER) {
      const g = document.createElementNS(NS, 'g') as SVGGElement;
      g.setAttribute('data-layer', layer);
      this.svgEl.appendChild(g);
      this.layerGroups.set(layer, g);
    }

    container.appendChild(this.svgEl);

    // Register built-in hooks
    this.registerBuiltinHook('background', 0, this.drawBackground.bind(this));
    this.registerBuiltinHook('shadows',    0, this.drawShadows.bind(this));
    this.registerBuiltinHook('bubbles',    0, this.drawBubbles.bind(this));
    this.registerBuiltinHook('text',       0, this.drawText.bind(this));
    this.registerBuiltinHook('overlay',    0, () => {});
    this.registerBuiltinHook('debug',      0, this.drawDebug.bind(this));
  }

  renderFrame(bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    // Update defs (gradients) before rendering layers
    this.syncGradientDefs(bubbles, state);

    for (const layer of LAYER_ORDER) {
      this.renderLayer(layer, bubbles, state);
    }
  }

  renderLayer(layer: RenderLayer, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    const hooks = this.hooksByLayer.get(layer);
    const g     = this.layerGroups.get(layer);
    if (!hooks || !g) return;

    // Clear this layer's <g> — hooks rebuild it from scratch each frame
    while (g.firstChild) g.removeChild(g.firstChild);

    const drawCtx: DrawContext = { type: 'svg', svg: g };

    for (const hook of hooks) {
      // SVG isolation: hooks append to ctx.svg (<g>) — naturally scoped.
      // No save/restore needed — the <g> itself provides isolation.
      hook.fn(drawCtx, bubbles, state);
    }
  }

  addLayerHook(hook: Omit<LayerHook, 'id'>): string {
    // Enforce that public callers cannot register with the reserved "builtin:" prefix
    if ((hook as any).id && String((hook as any).id).startsWith('builtin:')) {
      throw new Error('"builtin:" prefix is reserved for internal use.');
    }
    const id = generateId('hook');
    const entry: LayerHook = { ...hook, id };
    this.insertHook(entry);
    return id;
  }

  removeLayerHook(id: string): void {
    for (const hooks of this.hooksByLayer.values()) {
      const idx = hooks.findIndex(h => h.id === id);
      if (idx !== -1) { hooks.splice(idx, 1); return; }
    }
  }

  getLayerHooks(layer?: RenderLayer): ReadonlyArray<LayerHook> {
    if (layer) return this.hooksByLayer.get(layer) ?? [];
    const all: LayerHook[] = [];
    for (const hooks of this.hooksByLayer.values()) all.push(...hooks);
    return all;
  }

  resize(width: number, height: number): void {
    this.width  = width;
    this.height = height;
    this.svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  dispose(): void {
    this.svgEl.remove();
    for (const hooks of this.hooksByLayer.values()) hooks.length = 0;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Registers an internal built-in hook using the reserved "builtin:" prefix.
   * This method is intentionally separate from the public addLayerHook() to
   * enforce the prefix restriction at the type boundary.
   */
  private registerBuiltinHook(layer: RenderLayer, priority: number, fn: LayerHookFn): void {
    const id   = `builtin:${layer}`;
    const hook: LayerHook = { id, layer, priority, fn };
    this.insertHook(hook);
  }

  /**
   * Inserts a hook in priority-ascending order, preserving insertion order for
   * ties (stable sort behaviour via scan from the tail).
   */
  private insertHook(hook: LayerHook): void {
    const hooks = this.hooksByLayer.get(hook.layer)!;
    let i = hooks.length;
    while (i > 0 && hooks[i - 1].priority > hook.priority) i--;
    hooks.splice(i, 0, hook);
  }

  /**
   * Ensures one radial gradient definition per unique bubble color exists in
   * <defs> when the theme is "glass". Clears all defs for the "flat" theme.
   */
  private syncGradientDefs(bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (state.theme !== 'glass') { this.defsEl.innerHTML = ''; return; }

    const seenColors = new Set<string>();
    for (const b of bubbles) {
      if (seenColors.has(b.color)) continue;
      seenColors.add(b.color);
      const id = `bcjs-grad-${b.color.replace(/[^a-z0-9]/gi, '')}`;

      // Remove existing and recreate to reflect any color change
      const existing = this.defsEl.querySelector(`#${id}`);
      if (existing) existing.remove();

      const grad = document.createElementNS(NS, 'radialGradient') as SVGRadialGradientElement;
      grad.setAttribute('id', id);
      grad.setAttribute('cx', '35%');
      grad.setAttribute('cy', '35%');
      grad.setAttribute('r',  '65%');

      const stop1 = document.createElementNS(NS, 'stop') as SVGStopElement;
      stop1.setAttribute('offset',     '0%');
      stop1.setAttribute('stop-color', this.lightenColor(b.color, 0.45));

      const stop2 = document.createElementNS(NS, 'stop') as SVGStopElement;
      stop2.setAttribute('offset',     '60%');
      stop2.setAttribute('stop-color', b.color);

      const stop3 = document.createElementNS(NS, 'stop') as SVGStopElement;
      stop3.setAttribute('offset',     '100%');
      stop3.setAttribute('stop-color', this.darkenColor(b.color, 0.15));

      grad.appendChild(stop1);
      grad.appendChild(stop2);
      grad.appendChild(stop3);
      this.defsEl.appendChild(grad);
    }
  }

  // ── Built-in draw passes ───────────────────────────────────────────────────

  private drawBackground(ctx: DrawContext, _bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (!this.config.canvasBackgroundColor?.trim() || !ctx.svg) return;
    const rect = document.createElementNS(NS, 'rect') as SVGRectElement;
    rect.setAttribute('x',      '0');
    rect.setAttribute('y',      '0');
    rect.setAttribute('width',  String(state.width));
    rect.setAttribute('height', String(state.height));
    rect.setAttribute('fill',   `#${this.config.canvasBackgroundColor}`);
    ctx.svg.appendChild(rect);
  }

  private drawShadows(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (state.theme !== 'glass' || !ctx.svg) return;

    const useBlur = this.config.render?.glassPerformanceHint === 'full';

    for (const b of bubbles) {
      const r = b.renderRadius * b.renderScale;

      const glassOpts   = this.config.render?.glassOptions;
      const intensity   = Math.min(1, Math.max(0, glassOpts?.glowIntensity ?? 0.65));
      const outerStdDev = glassOpts?.blurRadius ?? 12;
      const innerStdDev = Math.max(2, Math.round(outerStdDev * 0.42));

      if (useBlur) {
        // glassPerformanceHint "full": double-layer feGaussianBlur bloom halo.
        // Outer layer bleeds beyond the bubble edge for a visible glow ring.
        // Inner layer adds warm depth behind the bubble face.
        for (const [rMult, stdDev, baseOpacity] of [
          [1.3, outerStdDev, 0.38],   // outer wide bloom
          [0.9, innerStdDev, 0.55],   // inner tight core glow
        ] as [number, number, number][]) {
          const filterId = `bcjs-blur-${b.color.replace(/[^a-z0-9]/gi, '')}-${stdDev}`;
          if (!this.defsEl.querySelector(`#${filterId}`)) {
            const filter = document.createElementNS(NS, 'filter') as SVGFilterElement;
            filter.setAttribute('id', filterId);
            // Expand filter region so outer bloom is not clipped at bounding box edge
            filter.setAttribute('x', '-50%');
            filter.setAttribute('y', '-50%');
            filter.setAttribute('width',  '200%');
            filter.setAttribute('height', '200%');
            const blur = document.createElementNS(NS, 'feGaussianBlur') as SVGFEGaussianBlurElement;
            blur.setAttribute('stdDeviation', String(stdDev));
            filter.appendChild(blur);
            this.defsEl.appendChild(filter);
          }
          const circle = document.createElementNS(NS, 'circle') as SVGCircleElement;
          circle.setAttribute('cx',      String(b.renderX));
          circle.setAttribute('cy',      String(b.renderY));
          circle.setAttribute('r',       String(r * rMult));
          circle.setAttribute('fill',    b.color);
          circle.setAttribute('opacity', String(+(baseOpacity * intensity).toFixed(3)));
          circle.setAttribute('filter',  `url(#${filterId})`);
          ctx.svg.appendChild(circle);
        }
      } else {
        // glassPerformanceHint "safe": CSS drop-shadow only — no feGaussianBlur.
        const spread  = Math.round(8 + intensity * 10);
        const opacity = (0.35 + intensity * 0.25).toFixed(2);
        const circle  = document.createElementNS(NS, 'circle') as SVGCircleElement;
        circle.setAttribute('cx',      String(b.renderX));
        circle.setAttribute('cy',      String(b.renderY));
        circle.setAttribute('r',       String(r * 0.95));
        circle.setAttribute('fill',    b.color);
        circle.setAttribute('opacity', opacity);
        circle.style.filter = `drop-shadow(0 5px ${spread}px ${b.color}) drop-shadow(0 2px 4px rgba(0,0,0,0.35))`;
        ctx.svg.appendChild(circle);
      }
    }
  }

  private drawBubbles(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (!ctx.svg) return;

    for (const b of bubbles) {
      const r      = b.renderRadius * b.renderScale;
      const circle = document.createElementNS(NS, 'circle') as SVGCircleElement;
      circle.setAttribute('cx', String(b.renderX));
      circle.setAttribute('cy', String(b.renderY));
      circle.setAttribute('r',  String(r));

      if (state.theme === 'glass') {
        const gradId = `bcjs-grad-${b.color.replace(/[^a-z0-9]/gi, '')}`;
        circle.setAttribute('fill', `url(#${gradId})`);
      } else {
        // "flat" theme: solid fill
        circle.setAttribute('fill', b.color);
      }

      circle.setAttribute('data-bubble-id', b.id);
      ctx.svg.appendChild(circle);

      // Glass inner highlight ellipse
      if (state.theme === 'glass') {
        const highlight = document.createElementNS(NS, 'ellipse') as SVGEllipseElement;
        highlight.setAttribute('cx',      String(b.renderX - r * 0.2));
        highlight.setAttribute('cy',      String(b.renderY - r * 0.25));
        highlight.setAttribute('rx',      String(r * 0.35));
        highlight.setAttribute('ry',      String(r * 0.18));
        highlight.setAttribute('fill',    'rgba(255,255,255,0.25)');
        highlight.setAttribute('opacity', '0.7');
        ctx.svg.appendChild(highlight);
      }
    }
  }

  private drawText(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (!ctx.svg) return;

    const baseFontSize = this.config.fontSize        ?? 12;
    const fontFamily   = this.config.defaultFontFamily ?? 'Arial';
    const fontColor    = this.config.defaultFontColor  ?? '#ffffff';
    const textWrap     = this.config.textWrap          ?? true;
    const maxLines     = this.config.maxLines          ?? 'auto';

    for (const b of bubbles) {
      const r    = b.renderRadius * b.renderScale;
      const size = computeFontSize(r, baseFontSize);
      if (size < 6) continue;

      // Icon rendered above the label
      if (b.icon) {
        const iconFont = (b as any).iconFont ?? 'Material Symbols Outlined';
        const iconEl   = document.createElementNS(NS, 'text') as SVGTextElement;
        iconEl.setAttribute('x',                String(b.renderX));
        iconEl.setAttribute('y',                String(b.renderY - r * 0.3));
        iconEl.setAttribute('text-anchor',      'middle');
        iconEl.setAttribute('dominant-baseline', 'middle');
        iconEl.setAttribute('font-family',      iconFont);
        iconEl.setAttribute('font-size',        String(size));
        iconEl.setAttribute('fill',             fontColor);
        iconEl.textContent = b.icon;
        ctx.svg.appendChild(iconEl);
      }

      if (textWrap) {
        const maxWidth   = r * 1.5;
        const lineHeight = size * 1.4;
        const words      = b.label.trim().split(/\s+/);
        const lines: string[] = [];
        let current = '';

        // Word-wrap using estimated average character width (fontSize * 0.55)
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          if (test.length * size * 0.55 <= maxWidth) {
            current = test;
          } else {
            if (current) lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);

        const limit   = maxLines === 'auto' ? lines.length : maxLines;
        const visible = lines.slice(0, limit);
        const startY  = b.renderY - ((visible.length - 1) * lineHeight) / 2;

        for (let i = 0; i < visible.length; i++) {
          const textEl = document.createElementNS(NS, 'text') as SVGTextElement;
          textEl.setAttribute('x',                String(b.renderX));
          textEl.setAttribute('y',                String(startY + i * lineHeight));
          textEl.setAttribute('text-anchor',      'middle');
          textEl.setAttribute('dominant-baseline', 'middle');
          textEl.setAttribute('font-family',      `${fontFamily}, sans-serif`);
          textEl.setAttribute('font-size',        String(size));
          textEl.setAttribute('fill',             fontColor);
          textEl.textContent = visible[i];
          ctx.svg.appendChild(textEl);
        }
      } else {
        const textEl = document.createElementNS(NS, 'text') as SVGTextElement;
        textEl.setAttribute('x',                String(b.renderX));
        textEl.setAttribute('y',                String(b.renderY));
        textEl.setAttribute('text-anchor',      'middle');
        textEl.setAttribute('dominant-baseline', 'middle');
        textEl.setAttribute('font-family',      `${fontFamily}, sans-serif`);
        textEl.setAttribute('font-size',        String(size));
        textEl.setAttribute('fill',             fontColor);
        textEl.textContent = b.label;
        ctx.svg.appendChild(textEl);
      }
    }
  }

  private drawDebug(ctx: DrawContext, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void {
    if (process.env.NODE_ENV === 'production' || !this.config.debug || !ctx.svg) return;

    const opacity = this.config.debug.overlayOpacity ?? 0.55;

    if (this.config.debug.showVelocityVectors) {
      const scale = 5;
      for (const b of bubbles) {
        const line = document.createElementNS(NS, 'line') as SVGLineElement;
        line.setAttribute('x1',           String(b.renderX));
        line.setAttribute('y1',           String(b.renderY));
        line.setAttribute('x2',           String(b.renderX + b.vx * scale));
        line.setAttribute('y2',           String(b.renderY + b.vy * scale));
        line.setAttribute('stroke',       '#ff0');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity',      String(opacity));
        ctx.svg.appendChild(line);
      }
    }

    if (this.config.debug.showBubbleIds) {
      for (const b of bubbles) {
        const textEl = document.createElementNS(NS, 'text') as SVGTextElement;
        textEl.setAttribute('x',           String(b.renderX));
        textEl.setAttribute('y',           String(b.renderY - b.renderRadius - 12));
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('fill',        '#fff');
        textEl.setAttribute('font-size',   '10');
        textEl.setAttribute('opacity',     String(opacity));
        textEl.textContent = b.id;
        ctx.svg.appendChild(textEl);
      }
    }
  }

  // ── Color utilities ────────────────────────────────────────────────────────

  private lightenColor(hex: string, amount: number): string { return this.shiftColor(hex,  amount); }
  private darkenColor(hex: string,  amount: number): string { return this.shiftColor(hex, -amount); }

  /**
   * Shifts each RGB channel of a hex color by amount * 255.
   * Positive amount lightens; negative darkens. Clamps to [0, 255].
   * Handles both 3-digit and 6-digit hex strings, with or without '#'.
   */
  private shiftColor(hex: string, amount: number): string {
    const h    = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r    = Math.max(0, Math.min(255, parseInt(full.slice(0, 2), 16) + Math.round(amount * 255)));
    const g    = Math.max(0, Math.min(255, parseInt(full.slice(2, 4), 16) + Math.round(amount * 255)));
    const b    = Math.max(0, Math.min(255, parseInt(full.slice(4, 6), 16) + Math.round(amount * 255)));
    return `rgb(${r},${g},${b})`;
  }
}
