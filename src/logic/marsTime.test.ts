import { describe, expect, it } from 'vitest';
import {
  formatMarsClock,
  localMeanSolarHours,
  localSolDate,
  marsSolDate,
  missionSol,
  msAtLocalSolDate,
  msAtMissionSolDate,
  SOL_IN_EARTH_DAYS,
} from './marsTime';

const GALE_EAST_LON = 137.4417;
const SOL_MS = SOL_IN_EARTH_DAYS * 86_400_000;

describe('marsTime', () => {
  it('matches the Mars24 worked example (2000-01-06 00:00 UTC ≈ MSD 44795.9998)', () => {
    expect(marsSolDate(Date.parse('2000-01-06T00:00:00Z'))).toBeCloseTo(44795.9998, 3);
  });

  it('puts Curiosity’s landing in the Gale afternoon (about 15:00 LMST)', () => {
    const hours = localMeanSolarHours(Date.parse('2012-08-06T05:17:57Z'), GALE_EAST_LON);
    expect(hours).toBeGreaterThan(14.75);
    expect(hours).toBeLessThan(15.25);
  });

  it('advances one sol every 24 h 39 min 35 s', () => {
    const t = Date.parse('2026-11-14T12:00:00Z');
    expect(localSolDate(t + SOL_MS, GALE_EAST_LON) - localSolDate(t, GALE_EAST_LON)).toBeCloseTo(1, 9);
  });

  it('converts back from local sol date to Earth time', () => {
    const t = Date.parse('2026-11-14T22:41:13Z');
    expect(msAtLocalSolDate(localSolDate(t, GALE_EAST_LON), GALE_EAST_LON)).toBeCloseTo(t, -1);
  });

  it('counts mission sols from the landing sol (sol 0)', () => {
    const landing = Date.parse('2026-05-04T00:00:00Z');
    expect(missionSol(landing, landing, GALE_EAST_LON)).toBe(0);
    const startOfLandingSol = msAtLocalSolDate(Math.floor(localSolDate(landing, GALE_EAST_LON)), GALE_EAST_LON);
    expect(missionSol(startOfLandingSol + 10 * SOL_MS + 1000, landing, GALE_EAST_LON)).toBe(10);
  });

  it('turns a mission sol date back into Earth time', () => {
    const landing = Date.parse('2012-08-06T05:17:57Z');
    // Curiosity sol 1812 began on 10 September 2017 (UTC), around 03:20.
    const t = msAtMissionSolDate(1812, landing, GALE_EAST_LON);
    expect(missionSol(t + 1000, landing, GALE_EAST_LON)).toBe(1812);
    expect(new Date(t).toISOString().slice(0, 10)).toBe('2017-09-10');
  });

  it('formats the time of sol', () => {
    expect(formatMarsClock(0)).toBe('00:00');
    expect(formatMarsClock(6.5)).toBe('06:30');
    expect(formatMarsClock(23.999)).toBe('23:59');
    expect(formatMarsClock(25.25)).toBe('01:15');
  });
});
