/**
 * SimulationState — live physics state exposed via chart.simulation getter.
 */
export interface SimulationSnapshot {
  readonly alpha:      number;
  readonly settled:    boolean;
  readonly tickCount:  number;
  readonly bubbles: ReadonlyArray<{
    readonly id:      string;
    readonly x:       number;
    readonly y:       number;
    readonly radius:  number;
    readonly vx:      number;
    readonly vy:      number;
  }>;
}
