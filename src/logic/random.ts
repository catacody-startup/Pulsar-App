/**
 * Deterministic noise: same inputs, same output, no hidden state.
 *
 * The simulator draws every random number from a hash of (seed, position),
 * so any minute of any day can be computed on its own and every device that
 * runs Pulsar sees exactly the same data.
 */

/** 32-bit FNV-1a hash of a string, used to turn ids into seeds. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Finalizer with good avalanche (lowbias32, by Chris Wellons). */
function mix(value: number): number {
  let x = value;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Hashes a list of 32-bit integers into one 32-bit unsigned integer. */
export function hashInts(...values: number[]): number {
  let h = 0x811c9dc5;
  for (const v of values) h = mix(Math.imul(h ^ (v | 0), 0x01000193));
  return h;
}

/** Uniform number in [0, 1) for the given integers. */
export function random01(...values: number[]): number {
  return hashInts(...values) / 0x100000000;
}

/** Uniform number in [-1, 1) for the given integers. */
export function randomSigned(...values: number[]): number {
  return random01(...values) * 2 - 1;
}

/**
 * Smooth noise in [-1, 1]: random values at every `period` steps of `x`,
 * joined with a smoothstep curve so consecutive minutes drift instead of jumping.
 */
export function smoothNoise(seed: number, x: number, period: number): number {
  const position = x / period;
  const knot = Math.floor(position);
  const f = position - knot;
  const eased = f * f * (3 - 2 * f);
  const a = randomSigned(seed, knot);
  const b = randomSigned(seed, knot + 1);
  return a + (b - a) * eased;
}
