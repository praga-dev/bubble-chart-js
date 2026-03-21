/**
 * DataItem — public data model for a single bubble.
 *
 * V2 BREAKING CHANGE: `id` is now required.
 * If id is missing, initializeChart() throws synchronously before any render.
 *
 * Migration:
 *   Option A (recommended): { id: "revenue", label: "Revenue", value: 450 }
 *   Option B (derive from label, only if labels are unique and stable):
 *     data.map(d => ({ ...d, id: d.label }))
 */
export interface DataItem {
  /** REQUIRED in V2. Enables stable reconciliation on chart.update(). */
  id:           string;
  label:        string;
  value:        number;
  bubbleColor?: string;
  /** Unicode codepoint or ligature string ("trending_up", "\ue7fd") */
  icon?:        string;
  /** Per-item font override, e.g. "Material Symbols Outlined" */
  iconFont?:    string;
}
