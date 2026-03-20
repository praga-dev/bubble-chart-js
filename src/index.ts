import { BubbleChart } from "./models/public/bubble-chart";
import { Configuration } from "./models/public/configuration";

/**
 * Factory function to create and render a new BubbleChart.
 * This ensures vanilla JS users get a clean instance with .update() and .destroy()
 */
export function initializeChart(config: Partial<Configuration>): BubbleChart {
  return new BubbleChart(config);
}

// Explicitly export for TypeScript and ES Modules
export { BubbleChart };

// Declare the global `window` property correctly
declare global {
  interface Window {
    initializeChart: typeof initializeChart;
    BubbleChart: typeof BubbleChart;
  }
}

// Assign to `window` for UMD usage via <script> tags
if (typeof window !== 'undefined') {
  window.initializeChart = initializeChart;
  window.BubbleChart = BubbleChart;
}
