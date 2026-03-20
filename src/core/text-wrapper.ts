/**
 * Text Wrapper — Core text wrapping algorithm.
 *
 * Platform-agnostic: uses ITextMeasurer interface instead of
 * CanvasRenderingContext2D directly. The wrapping logic is pure;
 * only text width measurement is delegated to the platform.
 */

import { ITextMeasurer } from '../interfaces/i-text-measurer';

/**
 * Computes wrapped lines of text that fit within a given width.
 *
 * @param textMeasurer - Platform-specific text measurement implementation
 * @param text - The text to wrap
 * @param maxLineWidth - Maximum width per line in pixels
 * @param maxAllowedLines - Max lines allowed, or 'auto' to compute from radius
 * @param radius - Bubble radius (used for auto line calculation)
 * @param fontSize - Font size in pixels
 * @param fontWeight - Numeric font weight (100-900)
 * @param fontStyle - Font style: 'normal' | 'italic' | 'oblique'
 * @param fontFamily - Font family name
 * @param horizontalPadding - Horizontal padding inside the bubble
 * @param verticalPadding - Vertical padding inside the bubble
 * @param lineHeightFactor - Line height multiplier
 * @returns Array of wrapped text lines
 */
export function getWrappedLines(
  textMeasurer: ITextMeasurer,
  text: string,
  maxLineWidth: number,
  maxAllowedLines: number | 'auto' | undefined,
  radius: number,
  fontSize: number = 14,
  fontWeight: number = 400,
  fontStyle: string = 'normal',
  fontFamily: string = 'Arial',
  horizontalPadding: number = 0,
  verticalPadding: number = 5,
  lineHeightFactor: number = 1.2
): string[] {
  const availableHeight = 1.5 * (radius - verticalPadding);
  const lineHeight = fontSize * lineHeightFactor;

  const calculatedMaxLines = Math.max(
    1,
    Math.floor(availableHeight / lineHeight)
  );

  const maxLines =
    maxAllowedLines === 'auto' || maxAllowedLines === undefined
      ? calculatedMaxLines
      : Math.min(maxAllowedLines, calculatedMaxLines);

  // Adjust max line width by removing horizontal padding
  maxLineWidth = Math.max(0, maxLineWidth - horizontalPadding * 2);

  // Break text into words
  const words = text.split(' ');

  let currentLine = '';
  const lines: string[] = [];
  let isTruncated = false;
  let isWordTruncated = false;

  // Helper: measure text using the platform abstraction
  const measure = (t: string): number =>
    textMeasurer.measureWidth(t, fontSize, fontWeight, fontStyle, fontFamily);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measure(testLine);

    if (testWidth <= maxLineWidth) {
      currentLine = testLine;
    } else {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = word;

      const currentLineWidth = measure(currentLine);

      // Truncate the word if it's too long for a single line
      if (currentLineWidth > maxLineWidth) {
        let truncatedText = currentLine;

        while (
          measure(truncatedText + '...') > maxLineWidth &&
          truncatedText.length > 0
        ) {
          truncatedText = truncatedText.slice(0, -1);
        }

        lines.push(truncatedText + '...');
        isWordTruncated = true;
        break;
      }
    }

    if (lines.length >= maxLines) {
      isTruncated = true;
      break;
    }
  }

  if (currentLine && lines.length < maxLines && !isWordTruncated) {
    lines.push(currentLine);
  }

  // Add "..." if text is truncated
  if (isTruncated && lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    let truncatedText = lastLine;

    while (
      measure(truncatedText + '...') > maxLineWidth &&
      truncatedText.length > 0
    ) {
      truncatedText = truncatedText.slice(0, -1);
    }

    lines[lines.length - 1] = truncatedText + '...';
  }

  return lines;
}
