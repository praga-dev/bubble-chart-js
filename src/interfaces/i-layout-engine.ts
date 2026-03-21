import { BubbleState } from '../models/internal/bubble-state';

/**
 * ILayoutEngine — computes and updates bubble positions.
 * Writes ONLY physics fields: x, y, radius, vx, vy.
 * Never touches render fields (renderX, renderY, etc.).
 */
export interface ILayoutEngine {
  /**
   * Initialize layout with data and canvas dimensions.
   * Computes initial positions and radii.
   */
  initialize(bubbles: BubbleState[], width: number, height: number): void;

  /**
   * Run one tick of the layout/simulation.
   * @returns true if still active (physics not settled), false if settled
   */
  tick(): boolean;

  /**
   * Called when chart.update() is invoked with new data.
   * Reconciles existing bubbles with new data, sets tweenFrom for continuity.
   */
  update(bubbles: BubbleState[], width: number, height: number): void;

  /** Release any resources (timers, etc.) */
  dispose(): void;
}
