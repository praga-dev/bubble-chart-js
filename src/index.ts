import { BubbleChart } from './models/public/bubble-chart';
import { DataItem } from './models/public/data-item';
import { Configuration } from './models/public/configuration';
import { ChartOrchestrator } from './orchestration/chart-orchestrator';

export { BubbleChart };
export type { DataItem, Configuration };
export type { SimulationSnapshot } from './models/internal/simulation-state';
export type { RenderLayer, UnsubscribeFn, EasingFn, GlassOptions } from './models/public/configuration';
export type { LayerHook, LayerHookFn, DrawContext, RenderFrameState } from './interfaces/i-renderer';

/**
 * Returns the top N items by value descending.
 * Tie-breaking: label alphabetically ascending (deterministic, testable).
 * Pure selector — no warnings, no side effects. id must already exist on items.
 *
 * @example
 * initializeChart({ canvasContainerId: "chart", data: topN(myData, 25) });
 */
export { topN } from './utils/top-n';

/**
 * Creates and renders a new bubble chart.
 *
 * DataItem.id is optional — auto-derived from label or label+value if omitted.
 * Providing explicit ids is recommended for stable chart.update() reconciliation.
 *
 * @throws Error if canvasContainerId element is not found.
 *
 * @example
 * const chart = initializeChart({
 *   canvasContainerId: "chart",
 *   data: [{ id: "a", label: "Item A", value: 100, bubbleColor: "#ff5733" }],
 *   layout: { type: "physics" },
 *   render: { mode: "auto", theme: "glass" },
 * });
 */
export function initializeChart(
  config: Partial<Configuration> & { canvasContainerId: string; data: DataItem[] }
): BubbleChart {
  const orchestrator = new ChartOrchestrator(config);
  return new BubbleChart(orchestrator);
}

import { topN as _topN } from './utils/top-n';

// UMD/browser globals
declare global {
  interface Window {
    initializeChart: typeof initializeChart;
    BubbleChart:     typeof BubbleChart;
    topN:            typeof _topN;
  }
}
if (typeof window !== 'undefined') {
  window.initializeChart = initializeChart;
  window.BubbleChart     = BubbleChart;
  window.topN            = _topN;
}
