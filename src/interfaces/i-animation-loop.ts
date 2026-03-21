/**
 * FrameCallback — return true = still active, false = idle (loop may sleep).
 * ALL subscribers are evaluated every tick — no short-circuit.
 */
export type FrameCallback = (timestamp: DOMHighResTimeStamp) => boolean;

/**
 * IAnimationLoop — centralized RAF loop with auto-sleep.
 * When all subscribers return false, the loop stops automatically.
 * Restarts automatically when any subscriber returns true again.
 */
export interface IAnimationLoop {
  /**
   * Subscribe a callback to the animation loop.
   * @param id - Stable string ID for this subscriber
   * @param fn - Called every frame; returns true if still active
   */
  subscribe(id: string, fn: FrameCallback): void;

  /** Remove a subscriber by ID. */
  unsubscribe(id: string): void;

  /** Force-start the loop (needed after a period of all-false returns). */
  start(): void;

  /** Force-stop the loop (e.g., during chart.destroy()). */
  stop(): void;
}
