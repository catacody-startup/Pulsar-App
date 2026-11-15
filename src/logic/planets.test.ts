import { describe, expect, it } from 'vitest';
import { earthMarsDistance, formatDuration, heliocentric, LIGHT_SECONDS_PER_AU, signalDelay } from './planets';

describe('Earth–Mars signal delay', () => {
  it('puts the planets at their distance from the Sun', () => {
    const earth = Math.hypot(...heliocentric('earth', Date.parse('2026-01-03T00:00:00Z')));
    expect(earth).toBeCloseTo(0.9833, 3); // perihelion, early January
    const mars = Math.hypot(...heliocentric('mars', Date.parse('2026-11-15T00:00:00Z')));
    expect(mars).toBeGreaterThan(1.38);
    expect(mars).toBeLessThan(1.67);
  });

  it('matches the closest approaches of 2003, 2018 and 2020', () => {
    // NASA/JPL: 27 Aug 2003 0.37272 AU (55.76 million km); 31 Jul 2018 0.38496 AU; 6 Oct 2020 0.41492 AU.
    expect(earthMarsDistance(Date.parse('2003-08-27T09:51:00Z'))).toBeCloseTo(0.37272, 2);
    expect(earthMarsDistance(Date.parse('2018-07-31T07:50:00Z'))).toBeCloseTo(0.38496, 2);
    expect(earthMarsDistance(Date.parse('2020-10-06T14:18:00Z'))).toBeCloseTo(0.41492, 2);
  });

  it('stays between about 3 and 22 light minutes', () => {
    for (let t = Date.parse('2026-01-01'); t < Date.parse('2028-03-01'); t += 5 * 86_400_000) {
      const { oneWaySeconds } = signalDelay(t);
      expect(oneWaySeconds).toBeGreaterThan(3 * 60);
      expect(oneWaySeconds).toBeLessThan(22.5 * 60);
    }
  });

  it('turns distance into light time', () => {
    expect(LIGHT_SECONDS_PER_AU).toBeCloseTo(499.005, 3);
    const d = signalDelay(Date.parse('2026-11-15T00:00:00Z'));
    expect(d.roundTripSeconds).toBeCloseTo(2 * d.oneWaySeconds);
    expect(d.distanceMillionKm).toBeCloseTo(d.distanceAu * 149.5978707, 6);
    expect(formatDuration(754)).toBe('12 min 34 s');
    expect(formatDuration(58.4)).toBe('58 s');
    expect(formatDuration(344 * 60 + 58)).toBe('5 h 45 min');
  });
});
