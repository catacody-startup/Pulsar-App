import { describe, expect, it } from 'vitest';
import { CREW } from '../config/crew';
import { HISTORY_MINUTES, SIMULATOR } from '../config/simulator';
import { MISSION } from '../config/mission';
import { msAtLocalSolDate } from './marsTime';
import { createSimulator, eventEnvelope, floorToMinute, MINUTE_MS } from './simulator';
import type { SimEvent, VitalsReading } from './types';

const crew = CREW[0]!;
const NOW = Date.parse('2026-11-14T22:40:30Z');
const HOUR_MS = 60 * MINUTE_MS;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const meanOf = (rs: VitalsReading[], key: 'heartRate' | 'spo2' | 'systolic' | 'diastolic' | 'doseRate') =>
  mean(rs.map((r) => r[key]));

describe('simulator', () => {
  const sim = createSimulator({ crew });
  const week = sim.recentReadings(NOW, HISTORY_MINUTES);

  it('gives the same data every time, on every device', () => {
    const again = createSimulator({ crew }).recentReadings(NOW, 120);
    expect(again).toEqual(week.slice(-120));
    expect(sim.readingAt(NOW)).toEqual(sim.readingAt(NOW));
  });

  it('keeps 7 days of history, one reading per minute, ending now', () => {
    expect(week).toHaveLength(7 * 24 * 60);
    expect(week.at(-1)!.t).toBe(floorToMinute(NOW));
    for (let i = 1; i < week.length; i++) expect(week[i]!.t - week[i - 1]!.t).toBe(MINUTE_MS);
  });

  it('stays within healthy ranges on a normal week', () => {
    for (const r of week) {
      expect(r.heartRate).toBeGreaterThanOrEqual(40);
      expect(r.heartRate).toBeLessThanOrEqual(160);
      expect(r.spo2).toBeGreaterThanOrEqual(94);
      expect(r.spo2).toBeLessThanOrEqual(100);
      expect(r.systolic).toBeGreaterThan(90);
      expect(r.systolic).toBeLessThan(170);
      expect(r.diastolic).toBeGreaterThan(55);
      expect(r.diastolic).toBeLessThan(90);
      expect(r.doseRate).toBeGreaterThan(7);
      expect(r.doseRate).toBeLessThan(10.5);
    }
  });

  it('follows the day: lower heart rate asleep, higher at work and much higher exercising', () => {
    const by = (a: VitalsReading['activity']) => week.filter((r) => r.activity === a);
    const sleep = meanOf(by('sleep'), 'heartRate');
    const rest = meanOf(by('rest'), 'heartRate');
    const work = meanOf(by('work'), 'heartRate');
    const exercise = meanOf(by('exercise'), 'heartRate');
    expect(sleep).toBeLessThan(rest);
    expect(rest).toBeLessThan(work);
    expect(work + 30).toBeLessThan(exercise);
    expect(meanOf(by('sleep'), 'systolic')).toBeLessThan(meanOf(by('rest'), 'systolic'));
  });

  it('plans each sol with some variation around the crew schedule', () => {
    const today = sim.localSolAt(NOW);
    const plans = Array.from({ length: 30 }, (_, i) => sim.solPlan(today - i));
    for (const p of plans) {
      expect(Math.abs(p.wakeHour - crew.schedule.wakeHour)).toBeLessThanOrEqual(SIMULATOR.schedule.wakeJitterHours);
      expect(p.bedtimeHour).toBeGreaterThanOrEqual(crew.schedule.bedtimeHour - SIMULATOR.schedule.bedtimeJitterHours);
      expect(p.exerciseMinutes).toBeLessThanOrEqual(crew.schedule.exerciseMinutes + SIMULATOR.schedule.exerciseMinutesJitter);
    }
    expect(new Set(plans.map((p) => p.wakeHour)).size).toBe(30);
  });

  it('summarizes each sol: sleep, exercise and dose', () => {
    const sols = sim.recentSols(NOW, 7);
    expect(sols).toHaveLength(7);
    expect(sols.at(-1)!.complete).toBe(false);
    expect(sols.at(-1)!.missionSol).toBe(sim.missionSolAt(NOW));
    for (const s of sols.slice(0, -1)) {
      expect(s.complete).toBe(true);
      expect(s.sleepHours).toBeGreaterThan(4);
      expect(s.sleepHours).toBeLessThan(10);
      expect(s.exerciseMinutes).toBeLessThanOrEqual(130);
      // 0.21 mGy per Earth day (Curiosity RAD) ≈ 0.216 mGy per sol.
      expect(s.doseMilliGray).toBeGreaterThan(0.2);
      expect(s.doseMilliGray).toBeLessThan(0.23);
    }
  });

  it('counts sleep and exercise in agreement with the minute-by-minute activity', () => {
    const solNumber = sim.localSolAt(NOW) - 2;
    const plan = sim.solPlan(solNumber);
    const summary = sim.summarizeSol(solNumber);
    expect(Math.abs(summary.exerciseMinutes - plan.exerciseMinutes)).toBeLessThanOrEqual(1);
  });
});

describe('simulated events', () => {
  const start = floorToMinute(NOW) - 6 * HOUR_MS;
  const withEvent = (kind: SimEvent['kind'], intensity: number, durationMin = 24 * 60) =>
    createSimulator({ crew, events: [{ kind, start, durationMin, intensity }] });
  const calm = createSimulator({ crew });
  // Hours 3 to 4 of the event, past every ramp up.
  const window = (s: ReturnType<typeof createSimulator>) => s.readings(start + 3 * HOUR_MS, start + 4 * HOUR_MS);

  it('shape: ramps up, holds and ramps down, zero outside', () => {
    const e: SimEvent = { kind: 'illness', start: 0, durationMin: 100, intensity: 10 };
    expect(eventEnvelope(e, -MINUTE_MS, 10, 20)).toBe(0);
    expect(eventEnvelope(e, 5 * MINUTE_MS, 10, 20)).toBeCloseTo(0.5);
    expect(eventEnvelope(e, 50 * MINUTE_MS, 10, 20)).toBe(1);
    expect(eventEnvelope(e, 90 * MINUTE_MS, 10, 20)).toBeCloseTo(0.5);
    expect(eventEnvelope(e, 100 * MINUTE_MS, 10, 20)).toBe(0);
  });

  it('a solar storm multiplies the dose rate', () => {
    const ratio = meanOf(window(withEvent('solarStorm', 20)), 'doseRate') / meanOf(window(calm), 'doseRate');
    expect(ratio).toBeGreaterThan(19.5);
    expect(ratio).toBeLessThan(20.5);
  });

  it('low oxygen drops SpO₂ and speeds up the heart', () => {
    const low = window(withEvent('lowOxygen', 7));
    expect(meanOf(window(calm), 'spo2') - meanOf(low, 'spo2')).toBeGreaterThan(6);
    expect(meanOf(low, 'heartRate') - meanOf(window(calm), 'heartRate')).toBeGreaterThan(8);
  });

  it('illness raises heart rate and blood pressure', () => {
    const ill = window(withEvent('illness', 20));
    expect(meanOf(ill, 'heartRate') - meanOf(window(calm), 'heartRate')).toBeGreaterThan(15);
    expect(meanOf(ill, 'systolic')).toBeGreaterThan(meanOf(window(calm), 'systolic'));
  });

  it('a sleepless night shows up in the sleep of the next sol', () => {
    const solNumber = calm.localSolAt(NOW) - 1;
    // Awake from 18:00 of the sol before until noon.
    const nightStart = msAtLocalSolDate(solNumber - 1 + 18 / 24, MISSION.site.eastLongitudeDeg);
    const sleepless = createSimulator({
      crew,
      events: [{ kind: 'sleepLoss', start: nightStart, durationMin: 18 * 60, intensity: 1 }],
    });
    expect(calm.summarizeSol(solNumber).sleepHours).toBeGreaterThan(4);
    expect(sleepless.summarizeSol(solNumber).sleepHours).toBe(0);
  });
});
