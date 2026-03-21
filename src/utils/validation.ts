import { Configuration } from '../models/public/configuration';
import { DataItem } from '../models/public/data-item';

const PKG = 'bubble-chart-js';

/**
 * Validates configuration and data before chart initialization.
 * Throws synchronously if DataItem.id is missing (V2 breaking change).
 *
 * @throws Error if any DataItem is missing the required `id` field.
 */
export function validateConfig(config: Configuration): boolean {
  if (!config) {
    console.error(`${PKG}: Invalid config object.`);
    return false;
  }

  if (!config.canvasContainerId?.trim()) {
    console.error(`${PKG}: canvasContainerId is required.`);
    return false;
  }

  if (!Array.isArray(config.data) || config.data.length === 0) {
    console.error(`${PKG}: data must be a non-empty array.`);
    return false;
  }

  // V2: id is required — throw synchronously, no partial render
  config.data.forEach((item: DataItem, index: number) => {
    if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
      throw new Error(
        `${PKG}: DataItem at index ${index} is missing required field 'id'.\n` +
        `See migration guide: https://github.com/Praga-Dev/bubbleChartJS/blob/main/MIGRATION.md`
      );
    }
  });

  return true;
}

/**
 * Warns if data length exceeds 25 in auto/SVG mode (renderer was resolved at init).
 * Called during chart.update() when data crosses the 25-item boundary.
 * The renderer does NOT change — this is informational only.
 */
export function warnDataLimitExceeded(
  dataLength: number,
  resolvedRenderer: 'svg' | 'canvas'
): void {
  if (resolvedRenderer === 'svg' && dataLength > 25) {
    console.warn(
      `${PKG}: chart.update() received ${dataLength} items but this instance uses the SVG renderer ` +
      `(resolved at init for ≤25 items). Only the top 25 items will be rendered. ` +
      `Use topN(data) to pre-select, or destroy + reinitialize for a Canvas instance.`
    );
  }
}

/**
 * Resolves the renderer type once at init time. Never changes after init.
 *
 * "auto" → SVG when data.length ≤ 25, Canvas otherwise.
 * Explicit "svg" or "canvas" → returns that directly.
 */
export function resolveRenderer(
  dataLength: number,
  mode: 'auto' | 'svg' | 'canvas'
): 'svg' | 'canvas' {
  if (mode === 'svg')    return 'svg';
  if (mode === 'canvas') return 'canvas';
  return dataLength <= 25 ? 'svg' : 'canvas';
}
