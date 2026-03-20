import { ResolvedBubbleStyle } from '../core/types';

/**
 * IRenderer — Platform abstraction for drawing primitives.
 *
 * The orchestration layer uses this to render positioned bubbles.
 * It must never call Canvas2D / CustomPainter directly.
 *
 * Implementations:
 *   JS: CanvasRenderer (wraps CanvasRenderingContext2D)
 *   Flutter: CustomPainterRenderer (wraps Canvas)
 */
export interface IRenderer {
  /**
   * Returns the usable dimensions of the rendering surface.
   */
  getSize(): { width: number; height: number };

  /**
   * Clears the entire rendering surface.
   */
  clear(): void;

  /**
   * Draws a filled circle with optional stroke.
   */
  drawCircle(
    x: number,
    y: number,
    radius: number,
    fillColor: string,
    strokeColor: string,
    strokeWidth: number,
    opacity?: number
  ): void;

  /**
   * Draws text at the specified position.
   */
  drawText(
    text: string,
    x: number,
    y: number,
    style: Pick<
      ResolvedBubbleStyle,
      'fontSize' | 'fontFamily' | 'fontWeight' | 'fontStyle' | 'fontColor' | 'textAlign' | 'textBaseline'
    >
  ): void;

  /**
   * Performs initial setup (e.g., HiDPI scaling).
   * Returns the logical dimensions after setup.
   */
  setup(): { width: number; height: number };

  /**
   * Tears down the renderer, releasing resources.
   */
  destroy(): void;
}
