import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../config/actions';
import { SOURCES } from '../config/sources';
import { RULES, THRESHOLDS } from '../config/thresholds';
import { buildAlerts } from './alerts';
import type { IndicatorResult } from './indicators';
import { nextPlanItem } from './plan';
import type { SolPlan } from './simulator';

const result = (rule: keyof typeof RULES): IndicatorResult => ({
  id: RULES[rule].indicator,
  status: RULES[rule].status,
  rule,
  value: 0,
});

describe('alerts', () => {
  it('every rule that is not ok has a concrete action', () => {
    for (const [id, rule] of Object.entries(RULES)) {
      const action = (ACTIONS as Record<string, (typeof ACTIONS)[keyof typeof ACTIONS]>)[id];
      if (rule.status === 'ok') expect(action).toBeUndefined();
      else {
        expect(action, id).toBeDefined();
        expect(action!.steps.length).toBeGreaterThan(0);
        for (const s of action!.sources ?? []) expect(SOURCES).toHaveProperty(s);
      }
    }
  });

  it('lists only what needs attention, the most urgent first', () => {
    const alerts = buildAlerts([
      result('heartRate.normal'),
      result('sleep.short'),
      result('radiation.storm'),
      result('exercise.ok'),
    ]);
    expect(alerts.map((a) => a.rule)).toEqual(['radiation.storm', 'sleep.short']);
    expect(alerts[0]!.action.title).toMatch(/shelter/i);
    expect(alerts[0]!.action.steps.join(' ')).toContain(`${THRESHOLDS.radiation.stormFactor}×`);
    expect(buildAlerts([result('spo2.normal')])).toEqual([]);
  });
});

describe('next item of the plan', () => {
  const plan = (over: Partial<SolPlan> = {}): SolPlan => ({
    localSol: 1,
    wakeHour: 6.5,
    bedtimeHour: 23,
    exerciseStartHour: 16,
    exerciseMinutes: 90,
    ...over,
  });

  it('walks through the sol: wake-up, exercise, lights out, next wake-up', () => {
    expect(nextPlanItem(3, plan(), plan())).toEqual({ kind: 'wake', hour: 6.5 });
    expect(nextPlanItem(10, plan(), plan())).toEqual({ kind: 'exercise', hour: 16 });
    expect(nextPlanItem(18, plan(), plan())).toEqual({ kind: 'bedtime', hour: 23 });
    expect(nextPlanItem(23.5, plan(), plan({ wakeHour: 7 }))).toEqual({ kind: 'wake', hour: 31 });
  });

  it('skips the exercise when the sol has none', () => {
    expect(nextPlanItem(10, plan({ exerciseMinutes: 0 }), plan())).toEqual({ kind: 'bedtime', hour: 23 });
  });
});
