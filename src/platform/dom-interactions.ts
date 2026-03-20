/**
 * DOM Interaction Handler — Web platform input handling.
 *
 * Manages mouse events, hit testing, and resize observation on Canvas elements.
 * Extracted from renderer.ts and tooltip.ts.
 */

import { PositionedNode } from '../core/types';

/**
 * Gets the mouse position relative to the canvas, accounting for HiDPI scaling.
 */
export function getMousePosition(
  event: MouseEvent,
  canvas: HTMLCanvasElement
): { mouseX: number; mouseY: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  return {
    mouseX: (event.clientX - rect.left) * dpr,
    mouseY: (event.clientY - rect.top) * dpr,
  };
}

/**
 * Finds the bubble under the mouse pointer.
 * Uses simple distance check — O(n) per call.
 */
export function findHoveredNode(
  mouseX: number,
  mouseY: number,
  nodes: PositionedNode[]
): PositionedNode | null {
  return (
    nodes.find(
      (node) => Math.hypot(mouseX - node.x, mouseY - node.y) < node.radius
    ) || null
  );
}

/**
 * Creates a debounced resize handler using ResizeObserver or window.resize fallback.
 */
export function createResizeHandler(
  container: HTMLElement,
  onResize: () => void
): { destroy: () => void } {
  let resizeObserver: ResizeObserver | null = null;
  let rafId: number | null = null;

  const handleResize = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      onResize();
      rafId = null;
    });
  };

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  } else {
    handleResize();
    window.addEventListener('resize', handleResize);
  }

  return {
    destroy: () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      window.removeEventListener('resize', handleResize);
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

/**
 * Creates a throttled event handler using requestAnimationFrame.
 */
export function createRAFThrottle(
  handler: (event: MouseEvent) => void
): { handle: (event: MouseEvent) => void; cancel: () => void } {
  let frameId: number | null = null;

  return {
    handle: (event: MouseEvent) => {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        handler(event);
        frameId = null;
      });
    },
    cancel: () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    },
  };
}
