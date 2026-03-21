/**
 * DataItem — public data model for a single bubble.
 *
 * `id` is optional — if omitted, it is auto-derived at init time:
 *   - Falls back to `label` if all labels are unique across the dataset.
 *   - Falls back to `label+value` (e.g. "Chrome65") if labels are not unique.
 * Providing an explicit `id` is recommended for stable reconciliation on chart.update().
 */
export interface DataItem {
  /** Optional. Enables stable reconciliation on chart.update(). Auto-derived from label or label+value if omitted. */
  id?:          string;
  label:        string;
  value:        number;
  bubbleColor?: string;
  /** Fill opacity for this bubble (0–1). Overrides bubbleAppearance.opacity. Default: 1 */
  opacity?:     number;
  /** Unicode codepoint or ligature string ("trending_up", "\ue7fd") */
  icon?:        string;
  /** Per-item font override, e.g. "Material Symbols Outlined" */
  iconFont?:    string;
}
