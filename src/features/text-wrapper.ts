/**
 * Text measurer interface — platform-specific (canvas, SVG) implementations provided externally.
 */
export interface ITextMeasurer {
  measureText(
    text:       string,
    fontSize:   number,
    fontWeight: number,
    fontStyle:  string,
    fontFamily: string
  ): number;
}

/**
 * Splits text into lines that fit within maxWidth.
 * Respects maxLines limit (or "auto" = unlimited).
 * Adds "…" ellipsis when text is truncated.
 */
export function getWrappedLines(
  measurer:   ITextMeasurer,
  text:       string,
  maxWidth:   number,
  maxLines:   number | 'auto',
  radius:     number,
  fontSize:   number,
  fontWeight: number = 400,
  fontStyle:  string = 'normal',
  fontFamily: string = 'Arial'
): string[] {
  if (!text?.trim()) return [];

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measurer.measureText(testLine, fontSize, fontWeight, fontStyle, fontFamily);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Apply maxLines limit
  const limit = maxLines === 'auto' ? lines.length : maxLines;
  if (lines.length <= limit) return lines;

  // Truncate and add ellipsis to last visible line
  const truncated = lines.slice(0, limit);
  const lastLine = truncated[limit - 1];
  let shortened = lastLine;
  while (
    shortened.length > 0 &&
    measurer.measureText(shortened + '…', fontSize, fontWeight, fontStyle, fontFamily) > maxWidth
  ) {
    shortened = shortened.slice(0, -1).trimEnd();
  }
  truncated[limit - 1] = shortened + '…';
  return truncated;
}

/**
 * Computes an appropriate font size for a bubble based on its radius.
 * Ensures labels remain readable at all scales.
 */
export function computeFontSize(
  radius:          number,
  baseFontSize:    number = 12,
  fontWeight:      number = 400,
  avgCharsPerLine: number = 6
): number {
  const weightFactor = fontWeight >= 700 ? 1.25 : fontWeight >= 500 ? 1.1 : 1.0;
  const maxFontSize = Math.min(radius / avgCharsPerLine, radius / 1.2);
  let size = Math.min(baseFontSize * weightFactor, maxFontSize, radius * 0.8);
  size = Math.max(size, Math.max(8, radius / 6));
  return Math.round(size);
}
