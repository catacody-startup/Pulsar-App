import { describe, expect, it } from 'vitest';
import { CREW } from '../config/crew';
import { MISSION } from '../config/mission';
import { RULES, THRESHOLDS } from '../config/thresholds';
import { SOURCES } from '../config/sources';
import { msAtLocalSolDate } from './marsTime';
import {
  evaluateBloodPressure,
  evaluateExercise,
  evaluateHeartRate,
  evaluateIndicators,
  evaluateRadiation,
  evaluateSleep,
  evaluateSpo2,
  EVALUATION_SOLS,
  EVALUATION_WINDOW_MINUTES,
  maxHeartRate,
  overallStatus,
  worstStatus,
} from './indicators';
import { createSimulator, floorToMinute, MINUTE_MS } from './simulator';
import type { SimEvent, SolSummary, VitalsReading } from './types';

const crew = CREW[0]!;
const NOW = Date.parse('2026-11-14T22:40:30Z');

/** 30 identical readings, with overrides. */
function readings(over: Partial<VitalsReading> = {}, count = 30): VitalsReading[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i * MINUTE_MS,
    heartRate: 62,
    spo2: 98,
    systolic: 115,
    diastolic: 74,
    doseRate: THRESHOLDS.radiation.baselineDoseRate,
    activity: 'rest' as const,
    ...over,
  }));
}

function sols(sleep: number[], exercise: number[] = sleep.map(() => 90)): SolSummary[] {
  return sleep.map((sleepHours, i) => ({
    localSol: 100 + i,
    missionSol: i,
    sleepHours,
    exerciseMinutes: exercise[i]!,
    doseMilliGray: 0.216,
    complete: i < sleep.length - 1,
    nightComplete: true,
  }));
}

describe('rules', () => {
  it('every rule cites at least one known source', () => {
    for (const rule of Object.values(RULES)) {
      expect(rule.sources.length).toBeGreaterThan(0);
      for (const id of rule.sources) expect(SOURCES).toHaveProperty(id);
    }
  });

  it('the worst status wins', () => {
    expect(worstStatus(['ok', 'ok'])).toBe('ok');
    expect(worstStatus(['ok', 'watch', 'ok'])).toBe('watch');
    expect(worstStatus(['watch', 'act', 'ok'])).toBe('act');
    expect(worstStatus([])).toBe('ok');
  });
});

describe('overall status', () => {
  it('answers with the worst indicator and lists the flagged ones, most urgent first', () => {
    const results = [
      evaluateHeartRate(crew, readings()),
      evaluateSpo2(readings({ spo2: 93 })),
      evaluateRadiation(readings({ doseRate: THRESHOLDS.radiation.baselineDoseRate * 3 })),
    ];
    const overall = overallStatus(results);
    expect(overall.status).toBe('act');
    expect(overall.flagged.map((r) => r.id)).toEqual(['radiation', 'spo2']);
    expect(overallStatus([evaluateHeartRate(crew, readings())])).toEqual({ status: 'ok', flagged: [] });
  });

  it('reports last nights and today’s exercise as context', () => {
    // The last 7 nights: 7, 8, 9, 6, 7, 8, 9.
    expect(evaluateSleep(sols([6, 7, 8, 9, 6, 7, 8, 9])).average).toBe(7.7);
    const progress = sols([8, 8, 8], [90, 90, 40]);
    expect(evaluateExercise(progress).today).toBe(40);
  });
});

describe('heart rate', () => {
  it('normal, high, very high, low and very low at rest', () => {
    expect(evaluateHeartRate(crew, readings({ heartRate: 70 })).rule).toBe('heartRate.normal');
    expect(evaluateHeartRate(crew, readings({ heartRate: 101 })).rule).toBe('heartRate.high');
    expect(evaluateHeartRate(crew, readings({ heartRate: 121 })).rule).toBe('heartRate.veryHigh');
    expect(evaluateHeartRate(crew, readings({ heartRate: 49 })).rule).toBe('heartRate.low');
    expect(evaluateHeartRate(crew, readings({ heartRate: 39 })).rule).toBe('heartRate.veryLow');
  });

  it('a slow heart is expected asleep, down to 40 bpm', () => {
    expect(evaluateHeartRate(crew, readings({ heartRate: 46, activity: 'sleep' })).rule).toBe('heartRate.asleep');
    expect(evaluateHeartRate(crew, readings({ heartRate: 38, activity: 'sleep' })).status).toBe('act');
  });

  it('while exercising, only near-maximal effort draws attention', () => {
    const max = maxHeartRate(crew.age);
    expect(max).toBeCloseTo(208 - 0.7 * 38);
    expect(evaluateHeartRate(crew, readings({ heartRate: 140, activity: 'exercise' })).rule).toBe('heartRate.exercise');
    expect(evaluateHeartRate(crew, readings({ heartRate: Math.ceil(max * 0.96), activity: 'exercise' })).rule).toBe(
      'heartRate.nearMax',
    );
  });

  it('averages the last minutes, so one odd reading is not an alarm', () => {
    const rs = readings({ heartRate: 70 });
    rs[rs.length - 1] = { ...rs.at(-1)!, heartRate: 130 };
    expect(evaluateHeartRate(crew, rs).status).toBe('ok');
  });
});

describe('SpO₂', () => {
  it('normal from 95%, hypoxic at 94% or lower, emergency below 90%', () => {
    expect(evaluateSpo2(readings({ spo2: 95 })).status).toBe('ok');
    expect(evaluateSpo2(readings({ spo2: 94 })).status).toBe('watch');
    expect(evaluateSpo2(readings({ spo2: 90 })).status).toBe('watch');
    expect(evaluateSpo2(readings({ spo2: 89 })).status).toBe('act');
  });
});

describe('blood pressure', () => {
  it('follows the ACC/AHA categories on the resting average', () => {
    expect(evaluateBloodPressure(readings({ systolic: 125, diastolic: 78 })).rule).toBe('bloodPressure.normal');
    expect(evaluateBloodPressure(readings({ systolic: 132, diastolic: 78 })).rule).toBe('bloodPressure.high');
    expect(evaluateBloodPressure(readings({ systolic: 120, diastolic: 82 })).rule).toBe('bloodPressure.high');
    expect(evaluateBloodPressure(readings({ systolic: 185, diastolic: 100 })).rule).toBe('bloodPressure.crisis');
    expect(evaluateBloodPressure(readings({ systolic: 150, diastolic: 121 })).rule).toBe('bloodPressure.crisis');
  });

  it('ignores the rise of exercise, except the stop criterion', () => {
    const afterSession = [...readings({ systolic: 150, activity: 'exercise' }, 20), ...readings({}, 10)];
    expect(evaluateBloodPressure(afterSession).rule).toBe('bloodPressure.normal');
    expect(evaluateBloodPressure(readings({ systolic: 170, activity: 'exercise' })).rule).toBe('bloodPressure.exercise');
    expect(evaluateBloodPressure(readings({ systolic: 255, activity: 'exercise' })).rule).toBe(
      'bloodPressure.exerciseStop',
    );
  });
});

describe('radiation', () => {
  const base = THRESHOLDS.radiation.baselineDoseRate;
  it('compares the dose rate with the normal background of Gale Crater', () => {
    expect(evaluateRadiation(readings({ doseRate: base * 1.05 })).status).toBe('ok');
    expect(evaluateRadiation(readings({ doseRate: base * 1.3 })).status).toBe('watch');
    const storm = evaluateRadiation(readings({ doseRate: base * 2.5 }));
    expect(storm.rule).toBe('radiation.storm');
    expect(storm.ratio).toBeCloseTo(2.5);
  });
});

describe('sleep', () => {
  it('looks at last night and at the debt of the week', () => {
    expect(evaluateSleep(sols([8, 8, 8, 8, 8, 8, 8, 7.5])).rule).toBe('sleep.ok');
    expect(evaluateSleep(sols([8, 8, 8, 8, 8, 8, 8, 6.5])).rule).toBe('sleep.short');
    expect(evaluateSleep(sols([6, 6, 6, 6, 6, 6, 6, 6])).rule).toBe('sleep.debt');
    expect(evaluateSleep(sols([8, 8, 8, 8, 8, 8, 8, 2])).rule).toBe('sleep.none');
  });

  it('waits for the night to end before counting it', () => {
    const week = sols([8, 8, 8, 8, 8, 8, 8, 1]);
    week[week.length - 1] = { ...week.at(-1)!, nightComplete: false };
    expect(evaluateSleep(week).rule).toBe('sleep.ok');
  });
});

describe('exercise', () => {
  it('checks the last complete sol and missed sessions in a row', () => {
    expect(evaluateExercise(sols([8, 8, 8], [90, 80, 0])).rule).toBe('exercise.ok');
    expect(evaluateExercise(sols([8, 8, 8], [90, 45, 0])).rule).toBe('exercise.short');
    expect(evaluateExercise(sols([8, 8, 8], [10, 0, 0])).rule).toBe('exercise.missed');
  });
});

describe('with the simulator', () => {
  const evaluate = (events: SimEvent[], at = NOW) => {
    const sim = createSimulator({ crew, events });
    return evaluateIndicators({
      crew,
      recent: sim.recentReadings(at, EVALUATION_WINDOW_MINUTES),
      sols: sim.recentSols(at, EVALUATION_SOLS),
    });
  };
  const start = floorToMinute(NOW) - 3 * 60 * MINUTE_MS;
  const event = (kind: SimEvent['kind'], intensity: number): SimEvent => ({
    kind,
    start,
    durationMin: 12 * 60,
    intensity,
  });
  const statusOf = (rs: ReturnType<typeof evaluate>, id: string) => rs.find((r) => r.id === id)!.status;

  it('a normal evening is all good', () => {
    const rs = evaluate([]);
    expect(rs.map((r) => r.id)).toEqual([
      'heartRate',
      'spo2',
      'bloodPressure',
      'radiation',
      'sleep',
      'exercise',
      'wellbeing',
    ]);
    expect(worstStatus(rs.map((r) => r.status))).toBe('ok');
  });

  it('each simulated event turns its indicator red', () => {
    expect(statusOf(evaluate([event('solarStorm', 3)]), 'radiation')).toBe('act');
    expect(statusOf(evaluate([event('lowOxygen', 6)]), 'spo2')).toBe('watch');
    expect(statusOf(evaluate([event('lowOxygen', 10)]), 'spo2')).toBe('act');
    expect(statusOf(evaluate([event('illness', 70)]), 'heartRate')).toBe('act');
  });

  it('a sleepless night shows up the next sol', () => {
    const sim = createSimulator({ crew });
    const today = sim.localSolAt(NOW);
    const nightStart = msAtLocalSolDate(today - 1 + 18 / 24, MISSION.site.eastLongitudeDeg);
    const rs = evaluate([{ kind: 'sleepLoss', start: nightStart, durationMin: 18 * 60, intensity: 1 }]);
    expect(rs.find((r) => r.id === 'sleep')!.rule).toBe('sleep.none');
  });
});
