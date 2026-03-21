/**
 * BubbleState — internal physics + render state for a single bubble.
 * State split enforced: ILayoutEngine writes physics fields, ITweenSystem writes render fields.
 * Renderer reads ONLY renderX, renderY, renderRadius, renderScale.
 */
export interface BubbleState {
  // ── Identity ──────────────────────────────────────────────────────────────
  id:     string;
  label:  string;
  value:  number;
  color:  string;
  icon?:  string;

  // ── Physics fields — ILayoutEngine writes ONLY ────────────────────────────
  x:      number;
  y:      number;
  radius: number;
  vx:     number;   // velocity (physics mode only — zero in static mode)
  vy:     number;

  // ── Render fields — ITweenSystem writes ONLY ─────────────────────────────
  // Renderer reads ONLY these. Never reads x/y directly.
  renderX:      number;
  renderY:      number;
  renderRadius: number;
  renderScale:  number;   // current scale (hover + entry animation)
  targetScale:  number;   // lerp target — 1.0 normal, hoverScale when hovered

  // ── Tween control ─────────────────────────────────────────────────────────
  tweenProgress: number;   // 0 → 1; 1 means tween complete, renderX/Y/Radius == x/y/radius
  tweenFrom?: Readonly<{ x: number; y: number; radius: number }>;

  // ── Cache ─────────────────────────────────────────────────────────────────
  shadowCache?:  OffscreenCanvas | HTMLCanvasElement;
  shadowDirty:   boolean;   // true when color or radius changes
}
