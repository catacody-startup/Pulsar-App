import { describe, expect, it } from 'vitest';
import { MISSION } from '../config/mission';
import { localMeanSolarHours, missionSol } from './marsTime';
import { bucketMeans, marsClockTicks, niceTicks, solTicks, stats, yDomain } from './trends';
import type { VitalsReading } from './types';

const LON = MISSION.site.eastLongitudeDeg;
const reading = (minute: number, heartRate: number): VitalsReading => ({
  t: minute * 60_000,
  heartRate,
  spo2: 97,
  systolic: 115,
  diastolic: 74,
  doseRate: 8.75,
  activity: 'rest',
});

describe('trends', () => {
  it('averages readings per bucket, aligned to bucket boundaries', () => {
    const rs = [reading(5, 60), reading(6, 62), reading(10, 70), reading(19, 80), reading(20, 90)];
    expect(bucketMeans(rs, 10, (r) => r.heartRate)).toEqual([
      { t: 5 * 60_000, v: 61 },
      { t: 15 * 60_000, v: 75 },
      { t: 25 * 60_000, v: 90 },
    ]);
    expect(bucketMeans([], 10, (r) => r.heartRate)).toEqual([]);
  });

  it('summarizes a range with min, mean and max', () => {
    expect(stats([3, 1, 2])).toEqual({ min: 1, mean: 2, max: 3 });
    expect(stats([])).toBeNull();
  });

  it('picks round ticks', () => {
    expect(niceTicks(48, 103, 4)).toEqual([60, 80, 100]);
    expect(niceTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(5, 5)).toEqual([5]);
  });

  it('keeps the normal range visible in the y range', () => {
    const [lo, hi] = yDomain([60, 70], [50, 100]);
    expect(lo).toBeLessThan(50);
    expect(hi).toBeGreaterThan(100);
    expect(yDomain([3, 3])).toEqual([2 - 0.16, 4 + 0.16]);
  });

  it('labels the time axis with Mars local time and mission sols', () => {
    const to = Date.parse('2026-11-14T22:40:00Z');
    const from = to - 24 * 3600_000;
    const ticks = marsClockTicks(from, to, 6, LON);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const tick of ticks) {
      expect(tick.t).toBeGreaterThanOrEqual(from);
      expect(tick.t).toBeLessThanOrEqual(to);
      expect(['00:00', '06:00', '12:00', '18:00']).toContain(tick.label);
      expect(Math.round(localMeanSolarHours(tick.t, LON) * 60) % 360).toBe(0);
    }
    const sols = solTicks(to - 7 * 86_400_000, to, MISSION.landingMs, LON);
    // 7 Earth days are 6.8 sols: 6 or 7 sol starts.
    expect(sols.length).toBeGreaterThanOrEqual(6);
    expect(sols.length).toBeLessThanOrEqual(7);
    expect(sols.at(-1)!.label).toBe(`Sol ${missionSol(to, MISSION.landingMs, LON)}`);
  });
});
