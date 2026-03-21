import { DataItem } from '../models/public/data-item';

/**
 * Returns the top N items by value descending.
 * Tie-breaking: secondary sort by label alphabetically ascending (deterministic).
 *
 * Pure selector — no warnings, no side effects.
 * id must already exist on items before calling topN.
 *
 * @example
 * const chart = initializeChart({
 *   canvasContainerId: "chart",
 *   data: topN(myLargeDataset, 25),
 * });
 */
export function topN(data: DataItem[], n: number = 25): DataItem[] {
  return [...data]
    .sort(
      (a, b) =>
        b.value - a.value || a.label.localeCompare(b.label)
    )
    .slice(0, n);
}
