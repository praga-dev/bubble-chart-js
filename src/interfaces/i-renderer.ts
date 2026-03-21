import { BubbleState } from '../models/internal/bubble-state';
import { RenderLayer } from '../models/public/configuration';

/**
 * RenderFrameState — metadata passed to each layer hook.
 */
export interface RenderFrameState {
  readonly width:     number;
  readonly height:    number;
  readonly dpr:       number;
  readonly theme:     "flat" | "glass";
  readonly timestamp: DOMHighResTimeStamp;
}

/**
 * DrawContext — renderer-agnostic context wrapper for layer hooks.
 * Hook authors use this instead of a raw canvas/svg union.
 * ctx.save()/ctx.restore() is called by the renderer around each hook — hook authors
 * do NOT need to clean up context state.
 */
export interface DrawContext {
  readonly type:    "canvas" | "svg";
  readonly canvas?: CanvasRenderingContext2D;   // defined when type === "canvas"
  readonly svg?:    SVGGElement;                // the layer's <g> group — defined when type === "svg"
}

export type LayerHookFn = (
  ctx:     DrawContext,
  bubbles: ReadonlyArray<BubbleState>,
  state:   RenderFrameState
) => void;

export interface LayerHook {
  id:       string;
  layer:    RenderLayer;
  priority: number;   // lower runs first; default: 0; built-ins register at 0
  fn:       LayerHookFn;
}

/**
 * IRenderer — renders one frame.
 * Built-in passes are registered internally as hooks with prefix "builtin:".
 * Developers can remove any built-in and replace it.
 */
export interface IRenderer {
  /** Mount the renderer into the container element. */
  mount(container: HTMLElement): void;

  /** Render a complete frame. Called every animation tick by the orchestrator. */
  renderFrame(bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void;

  /** Render a single layer (used internally and for testing). */
  renderLayer(layer: RenderLayer, bubbles: ReadonlyArray<BubbleState>, state: RenderFrameState): void;

  /** Register a developer layer hook. Returns a stable hook ID. */
  addLayerHook(hook: Omit<LayerHook, "id">): string;

  /** Remove a hook by ID. Built-in IDs use "builtin:" prefix. */
  removeLayerHook(id: string): void;

  /** Get all hooks, optionally filtered by layer. */
  getLayerHooks(layer?: RenderLayer): ReadonlyArray<LayerHook>;

  /** Handle container resize. */
  resize(width: number, height: number): void;

  /** Release DOM resources. */
  dispose(): void;
}
