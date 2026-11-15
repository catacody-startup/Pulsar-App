import { describe, expect, it } from 'vitest';
import { CREW, DEMO_CREW_ID } from '../config/crew';
import { MISSION } from '../config/mission';
import { SCENARIOS } from '../config/scenarios';
import { assessCrewMember } from './assess';
import { msAtLocalSolDate } from './marsTime';
import { resolveScenario } from './scenarios';
import { createSimulator } from './simulator';

const LON = MISSION.site.eastLongitudeDeg;
const NOW = Date.parse('2026-11-14T22:40:00Z');
const calendar = createSimulator({ crew: CREW[0]! });
const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!;

describe('crew', () => {
  it('has unique ids and a demo crew member', () => {
    expect(new Set(CREW.map((c) => c.id)).size).toBe(CREW.length);
    expect(CREW.some((c) => c.id === DEMO_CREW_ID)).toBe(true);
  });

  it('nobody needs to act on a normal week, and most of the time everyone is all good', () => {
    const today = calendar.localSolAt(NOW);
    let samples = 0;
    let allGood = 0;
    for (const crew of CREW) {
      const sim = createSimulator({ crew });
      for (let sol = today - 7; sol < today; sol++) {
        for (let hour = 0; hour < 24; hour += 1.5) {
          const a = assessCrewMember(sim, msAtLocalSolDate(sol + hour / 24, LON));
          expect(a.overall.status, `${crew.id} sol ${sol} ${hour}h: ${a.overall.flagged.map((f) => f.rule)}`).not.toBe('act');
          samples++;
          if (a.overall.status === 'ok') allGood++;
        }
      }
    }
    expect(allGood / samples).toBeGreaterThan(0.75);
  });

  it('staggers the exercise sessions, so the crew shares the equipment', () => {
    const starts = CREW.map((c) => c.schedule.exerciseStartHour).sort((a, b) => a - b);
    for (let i = 1; i < starts.length; i++) expect(starts[i]! - starts[i - 1]!).toBeGreaterThanOrEqual(2);
  });
});

describe('scenarios with the crew', () => {
  const assessAll = (id: string, at = NOW) => {
    const events = resolveScenario(scenario(id), at, calendar, LON);
    return Object.fromEntries(
      CREW.map((crew) => [crew.id, assessCrewMember(createSimulator({ crew, events }), at)]),
    );
  };

  it('radiation and cabin air reach the whole crew', () => {
    for (const id of ['solar-storm', 'low-oxygen']) {
      for (const a of Object.values(assessAll(id))) expect(a.overall.status).toBe('act');
    }
  });

  it('a fever is personal: only the demo crew member gets it', () => {
    const all = assessAll('fever');
    expect(all[DEMO_CREW_ID]!.alerts.map((a) => a.indicator)).toContain('heartRate');
    for (const [id, a] of Object.entries(all)) {
      if (id !== DEMO_CREW_ID) expect(a.alerts.map((x) => x.indicator)).not.toContain('heartRate');
    }
  });

  it('a check-in answered in the app counts for today', () => {
    const sim = createSimulator({ crew: CREW[0]! });
    const localSol = sim.localSolAt(NOW);
    const low = { mood: 1, stress: 5, sleepQuality: 2, isolation: 5, localSol, t: NOW, simulated: false };
    const a = assessCrewMember(sim, NOW, [low]);
    expect(a.todaysCheckIn).toEqual(low);
    expect(a.indicators.find((r) => r.id === 'wellbeing')!.status).not.toBe('ok');
  });
});
