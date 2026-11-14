import { describe, expect, it } from 'vitest';
import { CREW } from '../config/crew';
import { MISSION } from '../config/mission';
import { SCENARIOS } from '../config/scenarios';
import { evaluateIndicators, EVALUATION_SOLS, EVALUATION_WINDOW_MINUTES, overallStatus } from './indicators';
import { localMeanSolarHours, msAtLocalSolDate } from './marsTime';
import { resolveScenario } from './scenarios';
import { createSimulator, floorToMinute, MINUTE_MS } from './simulator';

const crew = CREW[0]!;
const LON = MISSION.site.eastLongitudeDeg;
const base = createSimulator({ crew });
const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!;

function evaluateScenario(id: string, at: number) {
  const events = resolveScenario(scenario(id), at, base, LON);
  const sim = createSimulator({ crew, events });
  return evaluateIndicators({
    crew,
    recent: sim.recentReadings(at, EVALUATION_WINDOW_MINUTES),
    sols: sim.recentSols(at, EVALUATION_SOLS),
    checkIns: sim.pastCheckIns(at, EVALUATION_SOLS),
  });
}

/** An Earth time at the given local hour of a recent sol. */
const atLocalHour = (hour: number) => {
  const today = base.localSolAt(Date.parse('2026-11-14T22:40:00Z'));
  return Math.round(msAtLocalSolDate(today + hour / 24, LON));
};

describe('scenarios', () => {
  it('have unique ids', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });

  it('anchor relative times at the moment they are chosen', () => {
    const at = atLocalHour(14);
    const [storm] = resolveScenario(scenario('solar-storm'), at, base, LON);
    expect(storm!.start).toBe(floorToMinute(at) - 8 * 60 * MINUTE_MS);
  });

  it('a sleepless night covers the last night that is over', () => {
    const evening = atLocalHour(20);
    const [night] = resolveScenario(scenario('sleepless'), evening, base, LON);
    expect(localMeanSolarHours(night!.start, LON)).toBeCloseTo(18, 1);
    expect(night!.start).toBeLessThan(evening - 20 * 60 * MINUTE_MS);
  });

  it.each([
    ['nominal', null, 'ok'],
    ['solar-storm', 'radiation', 'act'],
    ['low-oxygen', 'spo2', 'act'],
    ['fever', 'heartRate', 'watch'],
    ['sleepless', 'sleep', 'act'],
    ['missed-workouts', 'exercise', 'act'],
    ['isolation', 'wellbeing', 'act'],
  ] as const)('%s shows up on %s as %s', (id, indicator, status) => {
    for (const hour of [10.5, 20]) {
      const results = evaluateScenario(id, atLocalHour(hour));
      const overall = overallStatus(results);
      if (indicator === null) expect(overall.status).toBe(status);
      else expect(results.find((r) => r.id === indicator)!.status).toBe(status);
    }
  });
});
