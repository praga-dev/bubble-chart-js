import { BubbleState } from '../../models/internal/bubble-state';
import { EasingFn } from '../../models/public/configuration';

/** Standard easing functions. */
export const Easing = {
  linear: (t: number): number => t,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  easeInCubic:  (t: number): number => t * t * t,
};

/**
 * Steps the position/radius tween for a single bubble toward its physics target.
 * Writes to renderX, renderY, renderRadius, tweenProgress.
 * Syncs render fields to physics fields when tween completes.
 *
 * @param b - BubbleState to update
 * @param easingFn - Easing function (default: easeInOutCubic)
 * @returns true if tween is still active, false if complete
 */
export function stepTween(b: BubbleState, easingFn: EasingFn = Easing.easeInOutCubic): boolean {
  if (b.tweenProgress >= 1) {
    // Already complete — ensure sync (guard against float drift)
    b.renderX      = b.x;
    b.renderY      = b.y;
    b.renderRadius = b.radius;
    return false;
  }

  const TWEEN_SPEED = 0.05; // progress per frame
  b.tweenProgress = Math.min(1, b.tweenProgress + TWEEN_SPEED);
  const t = easingFn(b.tweenProgress);

  if (b.tweenFrom) {
    b.renderX      = b.tweenFrom.x      + (b.x      - b.tweenFrom.x)      * t;
    b.renderY      = b.tweenFrom.y      + (b.y      - b.tweenFrom.y)      * t;
    b.renderRadius = b.tweenFrom.radius + (b.radius - b.tweenFrom.radius) * t;
  } else {
    b.renderX      = b.x;
    b.renderY      = b.y;
    b.renderRadius = b.radius;
  }

  // Sync on completion
  if (b.tweenProgress >= 1) {
    b.renderX      = b.x;
    b.renderY      = b.y;
    b.renderRadius = b.radius;
    return false;
  }
  return true;
}

/**
 * Steps the renderScale for a single bubble toward targetScale.
 * Uses lerp with hoverEase factor for smooth hover animation.
 *
 * @param b - BubbleState to update
 * @param hoverEase - Lerp factor (default: 0.10)
 * @returns true if scale is still animating, false if settled
 */
export function stepScale(b: BubbleState, hoverEase: number = 0.10): boolean {
  const delta = b.targetScale - b.renderScale;
  if (Math.abs(delta) < 0.001) {
    b.renderScale = b.targetScale;
    return false;
  }
  b.renderScale += delta * hoverEase;
  return true;
}

/**
 * Initializes a new bubble for entry animation.
 * Sets renderScale = 0, targetScale = 1, tweenProgress = 0.
 * Call this when a bubble is first added to the chart.
 */
export function initBubbleEntry(b: BubbleState): void {
  b.renderX      = b.x;
  b.renderY      = b.y;
  b.renderRadius = b.radius;
  b.renderScale  = 0;
  b.targetScale  = 1;
  b.tweenProgress = 0;
  b.tweenFrom    = undefined;
  b.shadowDirty  = true;
}

/**
 * Prepares a bubble for a position/radius transition (after chart.update()).
 * Captures current render position as tweenFrom.
 */
export function initBubbleTransition(b: BubbleState, newX: number, newY: number, newRadius: number): void {
  b.tweenFrom = { x: b.renderX, y: b.renderY, radius: b.renderRadius };
  b.x      = newX;
  b.y      = newY;
  b.radius = newRadius;
  b.tweenProgress = 0;
  b.shadowDirty   = true;
}
