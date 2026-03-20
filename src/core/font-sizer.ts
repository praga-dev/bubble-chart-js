/**
 * Font Sizer — Pure math, platform-agnostic.
 *
 * Calculates dynamic font sizes based on bubble radius, ensuring
 * labels remain readable at all scales.
 */

/**
 * Computes an appropriate font size for a bubble's label based on its radius.
 *
 * @param radius - Bubble radius in pixels
 * @param baseFontSize - Default font size from config
 * @param fontWeight - Numeric font weight (100-900)
 * @param avgCharsPerLine - Average characters per line estimate
 * @returns Computed font size in pixels (minimum 8)
 */
export function computeFontSize(
  radius: number,
  baseFontSize: number = 14,
  fontWeight: number = 400,
  avgCharsPerLine: number = 6
): number {
  const weightFactor = fontWeight >= 700 ? 1.25 : fontWeight >= 500 ? 1.1 : 1;

  // Adjust max font size to allow better scaling for large bubbles
  const maxFontSize = Math.min(radius / avgCharsPerLine, radius / 1.2);

  let resultedFontSize = Math.min(
    baseFontSize * weightFactor,
    maxFontSize,
    radius * 0.8
  );

  // Dynamic min size: ensures readability for small bubbles
  resultedFontSize = Math.max(resultedFontSize, Math.max(8, radius / 6));
  return Math.round(resultedFontSize);
}
