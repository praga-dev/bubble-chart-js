import { IAnimationLoop, FrameCallback } from '../../interfaces/i-animation-loop';

export class AnimationLoop implements IAnimationLoop {
  private readonly subscribers = new Map<string, FrameCallback>();
  private rafId: number | null = null;

  /**
   * Arrow property ensures stable `this` binding for requestAnimationFrame.
   * This is THE only place isActive is computed — no subscriber-level short-circuit.
   */
  private readonly tick = (ts: DOMHighResTimeStamp): void => {
    let anyActive = false;
    // Evaluate ALL subscribers — no short-circuit ||=
    for (const fn of this.subscribers.values()) {
      const active = fn(ts);
      anyActive = anyActive || active;
    }
    if (anyActive) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null; // auto-sleep
    }
  };

  subscribe(id: string, fn: FrameCallback): void {
    this.subscribers.set(id, fn);
    // Auto-start if not already running
    if (this.rafId === null) {
      this.start();
    }
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  start(): void {
    if (this.rafId !== null) return; // already running
    if (this.subscribers.size === 0) return;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
