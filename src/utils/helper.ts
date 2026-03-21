/**
 * Generates a short random ID for hook registration and instance identification.
 * Format: prefix + 4 hex chars, e.g. "hook_a3f9", "bcjs_1f2e"
 */
export function generateId(prefix: string = 'id'): string {
  const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `${prefix}_${hex}`;
}

/**
 * Clamps a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b at ratio t.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Maps a value from [inputMin, inputMax] to [outputMin, outputMax].
 */
export function mapRange(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  if (inputMax === inputMin) return outputMin;
  const ratio = (value - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
}

/**
 * Checks if OffscreenCanvas is available in this environment.
 */
export function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}
