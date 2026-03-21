/**
 * Creates a seeded pseudo-random number generator using the mulberry32 algorithm.
 * Produces deterministic float values in [0, 1) for a given seed.
 *
 * @param seed - Integer seed. Pass Date.now() for natural randomness in production.
 * @returns A function that returns the next random float in [0, 1) on each call.
 *
 * @example
 * const rand = seededRandom(42);
 * rand(); // always the same sequence for seed=42
 */
export function seededRandom(seed: number): () => number {
  // mulberry32 implementation
  let s = seed >>> 0;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
