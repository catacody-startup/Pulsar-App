import { describe, expect, it } from 'vitest';
import { hashInts, hashString, random01, randomSigned, smoothNoise } from './random';

describe('random', () => {
  it('is deterministic', () => {
    expect(hashString('lucia')).toBe(hashString('lucia'));
    expect(hashString('lucia')).not.toBe(hashString('lucio'));
    expect(hashInts(1, 2, 3)).toBe(hashInts(1, 2, 3));
    expect(hashInts(1, 2, 3)).not.toBe(hashInts(3, 2, 1));
  });

  it('spreads values uniformly in [0, 1) and [-1, 1)', () => {
    const xs = Array.from({ length: 10_000 }, (_, i) => random01(42, i));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeCloseTo(0.5, 1);
    const below = xs.filter((x) => x < 0.1).length / xs.length;
    expect(below).toBeGreaterThan(0.08);
    expect(below).toBeLessThan(0.12);
    for (let i = 0; i < 1000; i++) {
      const v = randomSigned(7, i);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
    }
  });

  it('smooth noise stays in [-1, 1] and drifts without jumps', () => {
    let previous = smoothNoise(9, 0, 30);
    for (let x = 1; x < 3000; x++) {
      const v = smoothNoise(9, x, 30);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
      expect(Math.abs(v - previous)).toBeLessThan(0.11);
      previous = v;
    }
    // On the knots it takes the random value of the knot.
    expect(smoothNoise(9, 60, 30)).toBeCloseTo(randomSigned(9, 2), 12);
  });
});
