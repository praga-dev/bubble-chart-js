import { PositionedNode } from '../core/types';

/**
 * IInteractionHandler — Platform abstraction for user input.
 *
 * Implementations:
 *   JS: DOMInteractionHandler (addEventListener, getBoundingClientRect)
 *   Flutter: GestureHandler (GestureDetector, Listener)
 */
export interface IInteractionHandler {
  /**
   * Registers a tap/click handler.
   * @param callback - receives the positioned node that was tapped, or null if background
   */
  onTap(callback: (node: PositionedNode | null, event: any) => void): void;

  /**
   * Registers a hover/pointer-move handler.
   * @param callback - receives the hovered node, or null if no bubble is under the pointer
   */
  onHover(callback: (node: PositionedNode | null, event: any) => void): void;

  /**
   * Hit-tests a point against positioned nodes.
   * @returns the node under the point, or null
   */
  hitTest(x: number, y: number, nodes: PositionedNode[]): PositionedNode | null;

  /**
   * Cleans up all registered event listeners.
   */
  dispose(): void;
}
