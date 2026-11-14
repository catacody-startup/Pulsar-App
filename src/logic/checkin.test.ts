import { describe, expect, it } from 'vitest';
import { CREW } from '../config/crew';
import { lowAnswers, mergeCheckIns, wellbeingScore } from './checkin';
import { evaluateWellbeing } from './indicators';
import { createSimulator } from './simulator';
import type { CheckIn } from './types';

const good = { mood: 4, stress: 2, sleepQuality: 4, isolation: 2 };
const checkIn = (localSol: number, answers = good, simulated = true, t = localSol * 1000): CheckIn => ({
  ...answers,
  localSol,
  t,
  simulated,
});

describe('check-in', () => {
  it('scores 1–5 with stress and isolation flipped', () => {
    expect(wellbeingScore(good)).toBe(4);
    expect(wellbeingScore({ mood: 5, stress: 1, sleepQuality: 5, isolation: 1 })).toBe(5);
    expect(wellbeingScore({ mood: 1, stress: 5, sleepQuality: 1, isolation: 5 })).toBe(1);
  });

  it('flags answers at the bad end of each scale', () => {
    expect(lowAnswers(good)).toEqual([]);
    expect(lowAnswers({ mood: 2, stress: 4, sleepQuality: 3, isolation: 5 })).toEqual(['mood', 'stress', 'isolation']);
  });

  it('keeps one check-in per sol, and the one answered in the app wins', () => {
    const merged = mergeCheckIns([checkIn(2), checkIn(1)], [checkIn(2, { ...good, mood: 1 }, false)]);
    expect(merged.map((c) => [c.localSol, c.simulated])).toEqual([
      [1, true],
      [2, false],
    ]);
  });
});

describe('wellbeing indicator', () => {
  const low = { mood: 2, stress: 4, sleepQuality: 3, isolation: 4 };

  it('asks for a check-in when there is none recent', () => {
    const r = evaluateWellbeing([checkIn(5)], 10);
    expect(r.rule).toBe('wellbeing.pending');
    expect(r.status).toBe('ok');
  });

  it('uses yesterday’s answers until today’s check-in is done', () => {
    const r = evaluateWellbeing([checkIn(9)], 10);
    expect(r.rule).toBe('wellbeing.ok');
    expect(r.checkedInToday).toBe(false);
    expect(evaluateWellbeing([checkIn(9), checkIn(10, good, false)], 10).checkedInToday).toBe(true);
  });

  it('low once is attention; low two sols in a row is act now', () => {
    expect(evaluateWellbeing([checkIn(9), checkIn(10, low, false)], 10).rule).toBe('wellbeing.low');
    expect(evaluateWellbeing([checkIn(9, low), checkIn(10, low, false)], 10).rule).toBe('wellbeing.persistent');
    // A good answer today clears yesterday's low one.
    expect(evaluateWellbeing([checkIn(9, low), checkIn(10, good, false)], 10).rule).toBe('wellbeing.ok');
  });
});

describe('simulated check-ins', () => {
  const sim = createSimulator({ crew: CREW[0]! });
  const now = Date.parse('2026-11-14T22:40:00Z');

  it('exist for past sols only, answered at 20:00 local time, within 1–5', () => {
    const past = sim.pastCheckIns(now, 30);
    expect(past).toHaveLength(30);
    expect(past.at(-1)!.localSol).toBe(sim.localSolAt(now) - 1);
    for (const c of past) {
      expect(c.simulated).toBe(true);
      expect(c.t).toBeLessThan(now);
      for (const v of [c.mood, c.stress, c.sleepQuality, c.isolation]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it('are mostly fine on normal sols, and sleep quality follows the night', () => {
    const past = sim.pastCheckIns(now, 30);
    const lowOnes = past.filter((c) => lowAnswers(c).length > 0);
    expect(lowOnes.length).toBeLessThanOrEqual(5);
    for (const c of lowOnes) expect(lowAnswers(c)).toEqual(['sleepQuality']);
  });
});
