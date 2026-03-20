import { Configuration } from '../models/public/configuration';
import { mergeConfig } from '../utils/config';
import { orchestrateChart, ChartInstance } from '../orchestration/chart-orchestrator';

/**
 * Initializes the chart by merging config with defaults and orchestrating rendering.
 *
 * This is the bridge between the Public API (Layer 1) and the Orchestration layer (Layer 2).
 */
export function initializeChartService(
  config: Partial<Configuration> = {}
): { config: Configuration; instance: ChartInstance } | undefined {
  if (!config) {
    console.error('Configuration is not valid. Chart initialization aborted.');
    return;
  }

  if (!config.data || config.data.length === 0) {
    console.error('No valid data provided. Chart initialization aborted.');
    return;
  }

  const safeConfig = {
    canvasContainerId: config.canvasContainerId ?? 'chart-container',
    data: config.data ?? [],
    ...config,
  };

  const finalConfig = mergeConfig(safeConfig);
  const instance = orchestrateChart(finalConfig);
  if (!instance) return undefined;

  return {
    config: finalConfig,
    instance,
  };
}
