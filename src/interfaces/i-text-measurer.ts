/**
 * ITextMeasurer — Platform abstraction for text width measurement.
 *
 * The core engine needs to measure text width for wrapping calculations,
 * but the measurement API is platform-specific:
 *   JS: CanvasRenderingContext2D.measureText()
 *   Flutter: TextPainter.layout().width
 *
 * Implementations must be injected into the core engine — it must never
 * import platform-specific measurement APIs directly.
 */
export interface ITextMeasurer {
  /**
   * Measures the rendered width of a text string in pixels.
   *
   * @param text - The text to measure
   * @param fontSize - Font size in pixels
   * @param fontWeight - Numeric font weight (100-900)
   * @param fontStyle - Font style: 'normal' | 'italic' | 'oblique'
   * @param fontFamily - Font family name
   * @returns Width of the text in pixels
   */
  measureWidth(
    text: string,
    fontSize: number,
    fontWeight: number,
    fontStyle: string,
    fontFamily: string
  ): number;
}
