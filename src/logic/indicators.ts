/**
 * Traffic light per indicator: turns the latest readings and the sol
 * summaries into ok / watch / act, naming the rule (and so the source) behind it.
 */
import { RULES, THRESHOLDS, type RuleId } from '../config/thresholds';
import { lowAnswers, wellbeingScore } from './checkin';
import type { CheckIn, CheckInAnswers, CrewProfile, IndicatorId, SolSummary, Status, VitalsReading } from './types';

export interface IndicatorResult {
  id: IndicatorId;
  status: Status;
  rule: RuleId;
  /** Main value, in the indicator's unit (bpm, %, mmHg systolic, µGy/h, h, min). */
  value: number;
  /** Diastolic pressure, for blood pressure. */
  value2?: number;
  /** For radiation: dose rate ÷ normal background. */
  ratio?: number;
  /** For sleep: average of the last nights, h. */
  average?: number;
  /** For exercise: minutes so far in the sol in progress. */
  today?: number;
  /** For wellbeing: the check-in evaluated and whether today's is done. */
  checkIn?: CheckIn;
  checkedInToday?: boolean;
  low?: (keyof CheckInAnswers)[];
}

export interface EvaluationInput {
  crew: CrewProfile;
  /** Recent readings, oldest first; the last one is now. Needs at least the longest window. */
  recent: readonly VitalsReading[];
  /** Recent sols, oldest first; the last one is the sol in progress. */
  sols: readonly SolSummary[];
  /** Daily check-ins, one per sol, oldest first. */
  checkIns?: readonly CheckIn[];
}

const STATUS_RANK: Record<Status, number> = { ok: 0, watch: 1, act: 2 };

export function worstStatus(statuses: readonly Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst), 'ok');
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function lastMinutes(recent: readonly VitalsReading[], minutes: number): readonly VitalsReading[] {
  if (recent.length === 0) throw new Error('No readings to evaluate');
  return recent.slice(-minutes);
}

function result(id: IndicatorId, rule: RuleId, value: number, extra: Partial<IndicatorResult> = {}): IndicatorResult {
  return { id, status: RULES[rule].status, rule, value, ...extra };
}

/** Age-predicted maximum heart rate (Tanaka et al. 2001). */
export function maxHeartRate(age: number): number {
  return 208 - 0.7 * age;
}

const isExercising = (rs: readonly VitalsReading[]) => rs.at(-1)?.activity === 'exercise';

export function evaluateHeartRate(crew: CrewProfile, recent: readonly VitalsReading[]): IndicatorResult {
  const t = THRESHOLDS.heartRate;
  const window = lastMinutes(recent, t.windowMinutes);
  const hr = Math.round(mean(window.map((r) => r.heartRate)));
  if (isExercising(window)) {
    const nearMax = hr >= t.nearMaxFraction * maxHeartRate(crew.age);
    return result('heartRate', nearMax ? 'heartRate.nearMax' : 'heartRate.exercise', hr);
  }
  if (hr > t.act.max) return result('heartRate', 'heartRate.veryHigh', hr);
  if (hr < t.act.min) return result('heartRate', 'heartRate.veryLow', hr);
  if (hr > t.normal.max) return result('heartRate', 'heartRate.high', hr);
  if (hr < t.normal.min) {
    return result('heartRate', window.at(-1)?.activity === 'sleep' ? 'heartRate.asleep' : 'heartRate.low', hr);
  }
  return result('heartRate', 'heartRate.normal', hr);
}

export function evaluateSpo2(recent: readonly VitalsReading[]): IndicatorResult {
  const t = THRESHOLDS.spo2;
  const spo2 = Math.round(mean(lastMinutes(recent, t.windowMinutes).map((r) => r.spo2)));
  if (spo2 < t.emergencyBelow) return result('spo2', 'spo2.emergency', spo2);
  if (spo2 <= t.hypoxicAtOrBelow) return result('spo2', 'spo2.low', spo2);
  return result('spo2', 'spo2.normal', spo2);
}

export function evaluateBloodPressure(recent: readonly VitalsReading[]): IndicatorResult {
  const t = THRESHOLDS.bloodPressure;
  const window = lastMinutes(recent, t.windowMinutes);
  if (isExercising(window)) {
    // During exercise only the last minutes count, and only the stop criterion applies.
    const now = window.slice(-THRESHOLDS.heartRate.windowMinutes);
    const sys = Math.round(mean(now.map((r) => r.systolic)));
    const dia = Math.round(mean(now.map((r) => r.diastolic)));
    const stop = sys > t.exerciseStop.systolic || dia > t.exerciseStop.diastolic;
    return result('bloodPressure', stop ? 'bloodPressure.exerciseStop' : 'bloodPressure.exercise', sys, { value2: dia });
  }
  // At rest, average the resting readings of the window (exercise inflates them).
  const resting = window.filter((r) => r.activity !== 'exercise');
  const sys = Math.round(mean(resting.map((r) => r.systolic)));
  const dia = Math.round(mean(resting.map((r) => r.diastolic)));
  if (sys > t.crisis.systolic || dia > t.crisis.diastolic) {
    return result('bloodPressure', 'bloodPressure.crisis', sys, { value2: dia });
  }
  if (sys >= t.high.systolic || dia >= t.high.diastolic) {
    return result('bloodPressure', 'bloodPressure.high', sys, { value2: dia });
  }
  return result('bloodPressure', 'bloodPressure.normal', sys, { value2: dia });
}

export function evaluateRadiation(recent: readonly VitalsReading[]): IndicatorResult {
  const t = THRESHOLDS.radiation;
  const rate = mean(lastMinutes(recent, t.windowMinutes).map((r) => r.doseRate));
  const ratio = rate / t.baselineDoseRate;
  const value = Math.round(rate * 100) / 100;
  if (ratio >= t.stormFactor) return result('radiation', 'radiation.storm', value, { ratio });
  if (ratio >= t.elevatedFactor) return result('radiation', 'radiation.elevated', value, { ratio });
  return result('radiation', 'radiation.normal', value, { ratio });
}

export function evaluateSleep(sols: readonly SolSummary[]): IndicatorResult {
  const t = THRESHOLDS.sleep;
  const nights = sols.filter((s) => s.nightComplete);
  const last = nights.at(-1);
  if (!last) throw new Error('No complete night to evaluate');
  const hours = last.sleepHours;
  const recentNights = nights.slice(-t.debtNights);
  const average = Math.round(mean(recentNights.map((s) => s.sleepHours)) * 10) / 10;
  const extra = { average };
  if (hours < t.almostNoneHours) return result('sleep', 'sleep.none', hours, extra);
  if (recentNights.length >= t.debtNights && average <= t.debtAverageHours) {
    return result('sleep', 'sleep.debt', hours, extra);
  }
  if (hours < t.recommendedHours) return result('sleep', 'sleep.short', hours, extra);
  return result('sleep', 'sleep.ok', hours, extra);
}

export function evaluateExercise(sols: readonly SolSummary[]): IndicatorResult {
  const t = THRESHOLDS.exercise;
  const done = sols.filter((s) => s.complete);
  const last = done.at(-1);
  if (!last) throw new Error('No complete sol to evaluate');
  const minutes = last.exerciseMinutes;
  const lastFew = done.slice(-t.missedSolsInARow);
  const missedInARow =
    lastFew.length === t.missedSolsInARow && lastFew.every((s) => s.exerciseMinutes < t.missedBelowMinutes);
  const current = sols.at(-1);
  const extra = { today: current && !current.complete ? current.exerciseMinutes : 0 };
  if (missedInARow) return result('exercise', 'exercise.missed', minutes, extra);
  if (minutes < t.minimumMinutes) return result('exercise', 'exercise.short', minutes, extra);
  return result('exercise', 'exercise.ok', minutes, extra);
}

export function evaluateWellbeing(checkIns: readonly CheckIn[], currentSol: number): IndicatorResult {
  const t = THRESHOLDS.wellbeing;
  const recent = checkIns.filter((c) => c.localSol <= currentSol && c.localSol >= currentSol - t.maxAgeSols);
  const latest = recent.at(-1);
  const checkedInToday = latest?.localSol === currentSol;
  if (!latest) return result('wellbeing', 'wellbeing.pending', Number.NaN, { checkedInToday });
  const low = lowAnswers(latest);
  const extra = { checkIn: latest, checkedInToday, low };
  const value = wellbeingScore(latest);
  if (low.length > 0) {
    const previous = checkIns.find((c) => c.localSol === latest.localSol - 1);
    const persistent = previous !== undefined && lowAnswers(previous).length > 0;
    return result('wellbeing', persistent ? 'wellbeing.persistent' : 'wellbeing.low', value, extra);
  }
  return result('wellbeing', 'wellbeing.ok', value, extra);
}

/** Every indicator, in display order. */
export function evaluateIndicators({ crew, recent, sols, checkIns = [] }: EvaluationInput): IndicatorResult[] {
  const currentSol = sols.at(-1)?.localSol ?? Number.NaN;
  return [
    evaluateHeartRate(crew, recent),
    evaluateSpo2(recent),
    evaluateBloodPressure(recent),
    evaluateRadiation(recent),
    evaluateSleep(sols),
    evaluateExercise(sols),
    evaluateWellbeing(checkIns, currentSol),
  ];
}

export interface Overall {
  status: Status;
  /** Indicators that are not ok, the most urgent first. */
  flagged: IndicatorResult[];
}

/** "Am I OK?": the worst status and what caused it. */
export function overallStatus(results: readonly IndicatorResult[]): Overall {
  const flagged = results
    .filter((r) => r.status !== 'ok')
    .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status]);
  return { status: worstStatus(results.map((r) => r.status)), flagged };
}

/** How many minutes of readings `evaluateIndicators` needs. */
export const EVALUATION_WINDOW_MINUTES = Math.max(
  THRESHOLDS.heartRate.windowMinutes,
  THRESHOLDS.spo2.windowMinutes,
  THRESHOLDS.bloodPressure.windowMinutes,
  THRESHOLDS.radiation.windowMinutes,
);

/** How many sols `evaluateIndicators` needs: the sleep-debt nights plus the sol in progress. */
export const EVALUATION_SOLS = Math.max(THRESHOLDS.sleep.debtNights, THRESHOLDS.exercise.missedSolsInARow) + 1;
