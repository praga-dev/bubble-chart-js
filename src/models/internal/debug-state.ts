/**
 * DebugState — collision pairs, grid cells, velocities for debug rendering.
 * Only populated when config.debug is set. Tree-shaken in production.
 */
export interface DebugState {
  collisionPairs: ReadonlyArray<readonly [string, string]>; // ids of colliding bubbles
  velocities:     ReadonlyArray<{ id: string; vx: number; vy: number }>;
}
