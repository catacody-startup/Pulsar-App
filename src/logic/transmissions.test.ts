import { describe, expect, it } from 'vitest';
import { localMeanSolarHours, SOL_IN_EARTH_DAYS } from './marsTime';
import { signalDelay } from './planets';
import { reportAt, reportSchedule } from './transmissions';

const LON = 137.4417;
const NOW = Date.parse('2026-11-15T03:00:00Z');
const MARS_HOUR_MS = (SOL_IN_EARTH_DAYS * 86_400_000) / 24;

describe('reports to Earth', () => {
  it('go out at whole multiples of the period, local time, and arrive one signal delay later', () => {
    const r = reportAt(NOW, 6, LON);
    expect(r.sentAt).toBeLessThanOrEqual(NOW);
    expect(NOW - r.sentAt).toBeLessThan(6 * MARS_HOUR_MS);
    expect(r.hour % 6).toBe(0);
    expect(Math.abs(localMeanSolarHours(r.sentAt, LON) - (r.hour % 24))).toBeLessThan(1e-6);
    expect(r.arrivesAt - r.sentAt).toBeCloseTo(signalDelay(r.sentAt).oneWaySeconds * 1000, 0);
    expect(reportAt(NOW, 6, LON, -1).sentAt - r.sentAt).toBeCloseTo(6 * MARS_HOUR_MS, -1);
  });

  it('a report just sent is in transit until it arrives', () => {
    const sent = reportAt(NOW, 6, LON).sentAt;
    const justAfter = reportSchedule(sent + 60_000, 6, LON, 3);
    expect(justAfter.inTransit?.sentAt).toBe(sent);
    expect(justAfter.received[0]!.sentAt).toBeLessThan(sent);
    expect(justAfter.received).toHaveLength(3);
    const later = reportSchedule(sent + 30 * 60_000, 6, LON, 3);
    expect(later.inTransit).toBeUndefined();
    expect(later.received[0]!.sentAt).toBe(sent);
    expect(later.next.sentAt).toBeGreaterThan(sent + 30 * 60_000);
  });
});
