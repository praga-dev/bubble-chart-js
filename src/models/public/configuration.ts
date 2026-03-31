import { DataItem } from './data-item';

// ── Primitive type aliases ─────────────────────────────────────────────────

export type RenderMode = "auto" | "svg" | "canvas";
export type RenderLayer = "background" | "shadows" | "bubbles" | "text" | "overlay" | "debug";
export type EasingFn = (t: number) => number;
export type UnsubscribeFn = () => void;

// ── Physics layout config ──────────────────────────────────────────────────

export interface PhysicsLayoutConfig {
  /** Optional seed for deterministic initial placement. */
  seed?: number;
  /** Strength of centering force. Default: 0.012 */
  centerStrength?: number;
  /** Extra padding added to each bubble's collision radius. Default: 3 */
  collisionPad?: number;
  /** Velocity decay per tick (0–1). Default: 0.82 */
  velocityDecay?: number;
  /** Strength of wall repulsion force. Default: 0.15 */
  wallStrength?: number;
  /** Rate at which alpha decays each tick. Default: 0.0228 */
  alphaDecay?: number;
  /** Alpha threshold below which simulation is considered settled. Default: 0.001 */
  alphaMin?: number;
  /** Maximum velocity magnitude per tick. Default: 8 */
  maxVelocity?: number;
  /**
   * How update() affects the running simulation.
   * "restart" reheats alpha to 1 on every update (default).
   * "momentum" preserves current velocities and alpha.
   */
  updateBehavior?: "restart" | "momentum";
}

// ── Layout config ──────────────────────────────────────────────────────────

export interface LayoutConfig {
  type: "static" | "physics";
  physics?: PhysicsLayoutConfig;
}

// ── Glass appearance options ───────────────────────────────────────────────

export interface GlassOptions {
  /**
   * Glow intensity multiplier (0–1). Scales bloom opacity and blur spread.
   * 0 = no glow, 1 = maximum glow. Default: 0.35
   */
  glowIntensity?: number;
  /**
   * stdDeviation for the outer Gaussian blur halo (full mode only).
   * Higher = softer, wider halo. Default: 12
   */
  blurRadius?: number;
}

// ── Render config ──────────────────────────────────────────────────────────

export interface RenderConfig {
  mode?: RenderMode;
  theme?: "flat" | "glass";
  /**
   * Controls whether glass-mode uses expensive filter effects.
   * "safe" = CSS drop-shadow (compatible); "full" = feGaussianBlur bloom (GPU).
   */
  glassPerformanceHint?: "safe" | "full";
  /** Fine-tune glass glow appearance. Only applies when theme is "glass". */
  glassOptions?: GlassOptions;
}

// ── Interaction config ─────────────────────────────────────────────────────

export interface InteractionConfig {
  /** Scale factor applied to hovered bubble. Default: 1.08 */
  hoverScale?: number;
  /** Lerp factor for hover scale animation (0–1). Default: 0.10 */
  hoverEase?: number;
  /** Whether to show a tooltip on hover. Default: true */
  tooltipEnabled?: boolean;
}

// ── Animation config ───────────────────────────────────────────────────────

export interface AnimationConfig {
  /** Number of frames for entry animation. Default: 25 */
  entryDuration?: number;
  /** Easing function applied to position/radius tweens. */
  transitionEasing?: EasingFn;
}

// ── Debug config ───────────────────────────────────────────────────────────

export interface DebugConfig {
  showGrid?: boolean;
  showVelocityVectors?: boolean;
  showCollisionPairs?: boolean;
  showBubbleIds?: boolean;
  /** Opacity of debug overlay layer. Default: 0.55 */
  overlayOpacity?: number;
  /**
   * Draw the exact hit-test radius ring for each bubble.
   * Useful for verifying hover detection accuracy.
   */
  showHitRadius?: boolean;
}

// ── V1 backward-compat sub-configs ─────────────────────────────────────────

/** Tooltip styling options — V1 fields preserved for backward compatibility. */
export interface TooltipOptions {
  backgroundColor?: string;
  fontColor?: string;
  fontFamily?: string;
  fontSize?: number | string;
  padding?: string | number;
  margin?: string | number;
  borderStyle?: string;
  borderWidth?: string | number;
  borderColor?: string;
  boxShadow?: string;
  maxWidth?: string | number;
  minWidth?: string | number;
  maxHeight?: string | number;
  minHeight?: string | number;
  zIndex?: number | string;
  transition?: string;
  transform?: string;
  backdropFilter?: string;
  opacity?: number | string;
  pointerEvents?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  letterSpacing?: string | number;
  /** Custom formatter for tooltip content. Receives the raw DataItem. */
  formatter?: (data: any) => string;
}

/** Bubble appearance overrides — V1 fields preserved for backward compatibility. */
export interface BubbleAppearance {
  bubbleColor?: string;
  borderColor?: string;
  borderThickness?: number;
  opacity?: number;
}

/** Font rendering options — V1 fields preserved for backward compatibility. */
export interface FontOptions {
  fontColor?: string;
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  textBaseline?: string;
  textTransform?: string;
}

// ── Main Configuration interface ───────────────────────────────────────────

export interface Configuration {
  // ── Required ────────────────────────────────────────────────────────────────
  canvasContainerId: string;
  data: DataItem[];

  // ── V2 grouped config ────────────────────────────────────────────────────────
  layout?: LayoutConfig;
  render?: RenderConfig;
  interaction?: InteractionConfig;
  animation?: AnimationConfig;
  debug?: DebugConfig;

  // ── V2 callbacks ─────────────────────────────────────────────────────────────
  onRendererResolved?: (resolved: "svg" | "canvas", reason: "auto-init") => void;

  // ── V1 shorthand fields (still accepted — mapped by config normalizer) ────────
  fontSize?: number;
  defaultFontColor?: string;
  defaultFontFamily?: string;
  defaultBubbleColor?: string;
  colorPalette?: string[];
  canvasBackgroundColor?: string;
  canvasBorderColor?: string;
  minRadius?: number;
  maxLines?: number | "auto";
  textWrap?: boolean;
  isResizeCanvasOnWindowSizeChange?: boolean;
  showToolTip?: boolean;
  cursorType?: string;
  tooltipOptions?: TooltipOptions;
  bubbleAppearance?: BubbleAppearance;
  fontOptions?: FontOptions;

  // ── V1 deprecated (works with console.warn in V2) ────────────────────────────
  /** @deprecated Use chart.on("bubble:click", fn) instead */
  onBubbleClick?: (bubbleData: any, event: PointerEvent | MouseEvent) => void;

  // ── Theme shorthand (maps to render.theme) ───────────────────────────────────
  theme?: "flat" | "glass";
}
