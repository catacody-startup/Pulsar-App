/**
 * Deterministic simulator of one crew member: a wearable reading every minute
 * (heart rate, SpO₂, blood pressure), the habitat dosimeter, and the daily plan
 * (sleep, work, exercise) on Mars time.
 *
 * Every value is a pure function of (crew member, events, minute), so any
 * window of history can be computed on its own, in any order, on any device.
 */
import { MISSION } from '../config/mission';
import { SIMULATOR, type SimulatorParams } from '../config/simulator';
import {
  localSolDate,
  MARS_HOUR_IN_MINUTES,
  missionSol,
  msAtLocalSolDate,
} from './marsTime';
import { hashString, random01, randomSigned, smoothNoise } from './random';
import type {
  Activity,
  CrewProfile,
  EventKind,
  SimEvent,
  SolSummary,
  VitalsReading,
} from './types';

export const MINUTE_MS = 60_000;

export function floorToMinute(ms: number): number {
  return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
}

/** The plan of one local sol, after its deterministic day-to-day variation. */
export interface SolPlan {
  localSol: number;
  /** Mars hour this sol when the crew member wakes up. */
  wakeHour: number;
  /** Mars hour this sol when lights go out; above 24 means after midnight. */
  bedtimeHour: number;
  exerciseStartHour: number;
  /** Earth minutes; 0 when the session is skipped. */
  exerciseMinutes: number;
}

export interface SimulatorOptions {
  crew: CrewProfile;
  events?: readonly SimEvent[];
  eastLongitudeDeg?: number;
  landingMs?: number;
  params?: SimulatorParams;
}

/** Noise channels: each one gets its own seed so they don't move together. */
const CHANNEL = { plan: 1, heartRate: 2, spo2: 3, systolic: 4, diastolic: 5, dose: 6 } as const;

/** Trapezoid 0→1→0 of an event at minute `t`. */
export function eventEnvelope(
  event: SimEvent,
  t: number,
  rampUpMin: number,
  rampDownMin: number,
): number {
  const minutes = (t - event.start) / MINUTE_MS;
  if (minutes < 0 || minutes >= event.durationMin) return 0;
  const up = rampUpMin > 0 ? Math.min(1, minutes / rampUpMin) : 1;
  const down = rampDownMin > 0 ? Math.min(1, (event.durationMin - minutes) / rampDownMin) : 1;
  return Math.max(0, Math.min(up, down));
}

function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createSimulator(options: SimulatorOptions) {
  const {
    crew,
    events = [],
    eastLongitudeDeg = MISSION.site.eastLongitudeDeg,
    landingMs = MISSION.landingMs,
    params = SIMULATOR,
  } = options;
  const seed = hashString(crew.id);
  const { schedule } = crew;
  const jitter = params.schedule;

  const lsdAt = (ms: number) => localSolDate(ms, eastLongitudeDeg);
  const msAt = (lsd: number) => msAtLocalSolDate(lsd, eastLongitudeDeg);

  // Plans are pure functions of the sol: computed once and reused by every minute of it.
  const plans = new Map<number, SolPlan>();
  function solPlan(localSol: number): SolPlan {
    let plan = plans.get(localSol);
    if (!plan) {
      plan = computeSolPlan(localSol);
      plans.set(localSol, plan);
    }
    return plan;
  }

  function computeSolPlan(localSol: number): SolPlan {
    const r = (k: number) => random01(seed, CHANNEL.plan, localSol, k);
    const [delayMin, delayMax] = jitter.lateNightDelayHours;
    const lateNight = r(3) < jitter.lateNightChance ? delayMin + (delayMax - delayMin) * r(4) : 0;
    const skipExercise = r(6) < jitter.skipExerciseChance;
    return {
      localSol,
      wakeHour: schedule.wakeHour + (r(1) * 2 - 1) * jitter.wakeJitterHours,
      bedtimeHour: schedule.bedtimeHour + (r(2) * 2 - 1) * jitter.bedtimeJitterHours + lateNight,
      exerciseStartHour: schedule.exerciseStartHour + (r(5) * 2 - 1) * jitter.exerciseStartJitterHours,
      exerciseMinutes: skipExercise
        ? 0
        : Math.round(schedule.exerciseMinutes + (r(7) * 2 - 1) * jitter.exerciseMinutesJitter),
    };
  }

  /** Sum of intensity × envelope of every active event of one kind. */
  function eventLevel(kind: EventKind, t: number): number {
    const shape = params.events[kind];
    let level = 0;
    for (const e of events) {
      if (e.kind === kind) level += e.intensity * eventEnvelope(e, t, shape.rampUpMin, shape.rampDownMin);
    }
    return level;
  }

  /** A storm of intensity k multiplies the dose rate by k at its peak. */
  function stormFactor(t: number): number {
    const shape = params.events.solarStorm;
    let factor = 1;
    for (const e of events) {
      if (e.kind === 'solarStorm') factor += (e.intensity - 1) * eventEnvelope(e, t, shape.rampUpMin, shape.rampDownMin);
    }
    return factor;
  }

  function isAwakeByEvent(t: number): boolean {
    return eventLevel('sleepLoss', t) > 0;
  }

  /** Where `t` falls in the local sol: sol number, hour of sol, plan of the sol and the one before. */
  function locate(t: number) {
    const lsd = lsdAt(t);
    const localSol = Math.floor(lsd);
    return { localSol, hour: (lsd - localSol) * 24, plan: solPlan(localSol), previous: solPlan(localSol - 1) };
  }

  function activityAt(ms: number): Activity {
    const t = floorToMinute(ms);
    return activityOf(t, locate(t));
  }

  function activityOf(t: number, { hour, plan, previous }: ReturnType<typeof locate>): Activity {
    const asleep =
      (hour < plan.wakeHour && hour >= previous.bedtimeHour - 24) || hour >= plan.bedtimeHour;
    if (asleep) return isAwakeByEvent(t) ? 'rest' : 'sleep';
    const exerciseEnd = plan.exerciseStartHour + plan.exerciseMinutes / MARS_HOUR_IN_MINUTES;
    if (plan.exerciseMinutes > 0 && hour >= plan.exerciseStartHour && hour < exerciseEnd) return 'exercise';
    if (hour >= schedule.workStartHour && hour < schedule.workEndHour) return 'work';
    return 'rest';
  }

  /** 0→1→0 effort inside an exercise session (warm-up and cool-down). */
  function exerciseEffort(hour: number, plan: SolPlan): number {
    const elapsed = (hour - plan.exerciseStartHour) * MARS_HOUR_IN_MINUTES;
    const remaining = plan.exerciseMinutes - elapsed;
    const ramp = jitter.exerciseRampMinutes;
    return clamp(Math.min(elapsed / ramp, remaining / ramp), 0, 1);
  }

  function noise(channel: number, minute: number, amp: { slow: number; fast: number; jitter: number }) {
    const { slow, fast } = params.noisePeriods;
    return (
      amp.slow * smoothNoise(seed ^ (channel * 0x9e3779b1), minute, slow) +
      amp.fast * smoothNoise(seed ^ (channel * 0x85ebca6b), minute, fast) +
      amp.jitter * randomSigned(seed, channel, minute)
    );
  }

  /** Daily wave in [-1, 1] that peaks at `peakHour`. */
  const wave = (hour: number, peakHour: number) => Math.cos((2 * Math.PI * (hour - peakHour)) / 24);

  function readingAt(ms: number): VitalsReading {
    const t = floorToMinute(ms);
    const minute = t / MINUTE_MS;
    const where = locate(t);
    const { hour, plan } = where;
    const activity = activityOf(t, where);
    // During warm-up and cool-down the body is between resting and full effort.
    const effort = activity === 'exercise' ? exerciseEffort(hour, plan) : 0;
    const blend = (offset: Record<Activity, number>) =>
      activity === 'exercise' ? offset.rest + (offset.exercise - offset.rest) * effort : offset[activity];

    const hr = params.heartRate;
    const illness = eventLevel('illness', t);
    const lowOxygen = eventLevel('lowOxygen', t);
    const heartRate =
      crew.baseline.restingHeartRate +
      blend(hr.offset) +
      hr.circadianAmplitude * wave(hour, hr.circadianPeakHour) +
      noise(CHANNEL.heartRate, minute, hr.noise) +
      illness +
      lowOxygen * params.events.lowOxygen.heartRatePerPoint;

    const spo2 =
      crew.baseline.spo2 + blend(params.spo2.offset) + noise(CHANNEL.spo2, minute, params.spo2.noise) - lowOxygen;

    const bp = params.bloodPressure;
    const systolic =
      crew.baseline.systolic +
      blend(bp.systolicOffset) +
      noise(CHANNEL.systolic, minute, bp.systolicNoise) +
      illness * params.events.illness.systolicPerBeat;
    const diastolic =
      crew.baseline.diastolic + blend(bp.diastolicOffset) + noise(CHANNEL.diastolic, minute, bp.diastolicNoise);

    const rad = params.radiation;
    const doseRate =
      rad.baseDoseRate *
      (1 + rad.diurnalAmplitude * wave(hour, rad.diurnalPeakHour) + noise(CHANNEL.dose, minute, rad.noise)) *
      stormFactor(t);

    return {
      t,
      heartRate: round(clamp(heartRate, 30, 220)),
      spo2: round(clamp(spo2, 50, 100)),
      systolic: round(clamp(systolic, 70, 250)),
      diastolic: round(clamp(diastolic, 40, 150)),
      doseRate: round(Math.max(0, doseRate), 2),
      activity,
    };
  }

  /** One reading per minute in [fromMs, toMs). */
  function readings(fromMs: number, toMs: number): VitalsReading[] {
    const out: VitalsReading[] = [];
    for (let t = Math.ceil(fromMs / MINUTE_MS) * MINUTE_MS; t < toMs; t += MINUTE_MS) out.push(readingAt(t));
    return out;
  }

  /** The last `minutes` readings, ending with the minute of `nowMs`. */
  function recentReadings(nowMs: number, minutes: number): VitalsReading[] {
    const end = floorToMinute(nowMs) + MINUTE_MS;
    return readings(end - minutes * MINUTE_MS, end);
  }

  function countMinutes(fromMs: number, toMs: number, activity: Activity): number {
    let count = 0;
    for (let t = Math.ceil(fromMs / MINUTE_MS) * MINUTE_MS; t < toMs; t += MINUTE_MS) {
      if (activityAt(t) === activity) count++;
    }
    return count;
  }

  // Summaries of finished sols never change: computed once.
  const finishedSols = new Map<number, SolSummary>();

  /** Day-level indicators of a local sol, counting only what happened before `untilMs`. */
  function summarizeSol(localSol: number, untilMs = Number.POSITIVE_INFINITY): SolSummary {
    const finished = msAt(localSol + 1) <= untilMs;
    const cached = finished ? finishedSols.get(localSol) : undefined;
    if (cached) return cached;
    const summary = computeSolSummary(localSol, untilMs);
    if (finished) finishedSols.set(localSol, summary);
    return summary;
  }

  function computeSolSummary(localSol: number, untilMs: number): SolSummary {
    const start = msAt(localSol);
    const end = Math.min(msAt(localSol + 1), untilMs);
    // The night that ends this sol: from 18:00 of the previous sol to 12:00 of this one.
    const nightStart = msAt(localSol - 1 + 18 / 24);
    const nightEnd = Math.min(msAt(localSol + 12 / 24), untilMs);
    let doseMicroGray = 0;
    for (const r of readings(start, end)) doseMicroGray += r.doseRate / 60;
    return {
      localSol,
      missionSol: missionSol(start + MINUTE_MS, landingMs, eastLongitudeDeg),
      sleepHours: round(countMinutes(nightStart, nightEnd, 'sleep') / 60, 1),
      exerciseMinutes: countMinutes(start, end, 'exercise'),
      doseMilliGray: round(doseMicroGray / 1000, 3),
      complete: msAt(localSol + 1) <= untilMs,
      // Sleep ends at the planned wake-up: from then on the night's count is final.
      nightComplete: msAt(localSol + solPlan(localSol).wakeHour / 24) <= untilMs,
    };
  }

  /** Summaries of the last `count` sols, oldest first; the last one is the sol in progress. */
  function recentSols(nowMs: number, count: number): SolSummary[] {
    const current = Math.floor(lsdAt(nowMs));
    const out: SolSummary[] = [];
    for (let s = current - count + 1; s <= current; s++) out.push(summarizeSol(s, nowMs));
    return out;
  }

  return {
    crew,
    solPlan,
    activityAt,
    readingAt,
    readings,
    recentReadings,
    summarizeSol,
    recentSols,
    localSolAt: (ms: number) => Math.floor(lsdAt(ms)),
    missionSolAt: (ms: number) => missionSol(ms, landingMs, eastLongitudeDeg),
  };
}

export type Simulator = ReturnType<typeof createSimulator>;
