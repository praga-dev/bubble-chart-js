import { BubbleState } from '../models/internal/bubble-state';
import { DataItem } from '../models/public/data-item';

export type BubbleClickHandler = (item: DataItem, event: PointerEvent) => void;
export type BubbleHoverHandler = (item: DataItem | null) => void;

/**
 * IInteractionHandler — manages pointer events on the chart surface.
 */
export interface IInteractionHandler {
  /** Attach event listeners to the renderer's DOM element. */
  mount(element: HTMLElement | SVGElement): void;

  /** Update the current bubble positions (called after each render). */
  updateBubbles(bubbles: ReadonlyArray<BubbleState>): void;

  /** Register a click handler. Returns unsubscribe fn. */
  onClick(handler: BubbleClickHandler): () => void;

  /** Register a hover handler. Returns unsubscribe fn. */
  onHover(handler: BubbleHoverHandler): () => void;

  /** Release all event listeners. */
  dispose(): void;
}
