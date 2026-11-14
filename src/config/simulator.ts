import type { Activity, EventKind } from '../logic/types';
import { GALE_SURFACE_RADIATION } from './radiation';

/** Ramp up and down of an event (minutes) plus its side effects. */
interface EventShape {
  rampUpMin: number;
  rampDownMin: number;
  [effect: string]: number;
}

/** How many minutes of history the app keeps and shows: 7 Earth days. */
export const HISTORY_MINUTES = 7 * 24 * 60;

/**
 * Parameters of the simulated crew member. Offsets are added to the
 * crew member's baseline; noise amplitudes are the peak of each component.
 */
export const SIMULATOR = {
  /** Day-to-day variation of the schedule (deterministic per sol). */
  schedule: {
    wakeJitterHours: 0.35,
    bedtimeJitterHours: 0.5,
    /** Chance of a late night (extra work, insomnia) and how much later lights go out. */
    lateNightChance: 0.1,
    lateNightDelayHours: [1.5, 2.75] as const,
    exerciseStartJitterHours: 0.75,
    exerciseMinutesJitter: 20,
    /** Chance of skipping the exercise session. */
    skipExerciseChance: 0.1,
    /** Warm-up and cool-down at the start and end of each session, minutes. */
    exerciseRampMinutes: 6,
  },

  heartRate: {
    offset: { sleep: -6, rest: 0, work: 8, exercise: 62 } satisfies Record<Activity, number>,
    /** Circadian swing (bpm) and the local hour of its peak. */
    circadianAmplitude: 3,
    circadianPeakHour: 16,
    noise: { slow: 3, fast: 1.5, jitter: 1 },
  },

  spo2: {
    offset: { sleep: -1, rest: 0, work: 0, exercise: -1 } satisfies Record<Activity, number>,
    noise: { slow: 0.6, fast: 0.3, jitter: 0.4 },
  },

  bloodPressure: {
    // Nocturnal dipping while asleep; systolic rises with exercise, diastolic barely moves.
    systolicOffset: { sleep: -11, rest: 0, work: 4, exercise: 32 } satisfies Record<Activity, number>,
    diastolicOffset: { sleep: -7, rest: 0, work: 3, exercise: 3 } satisfies Record<Activity, number>,
    systolicNoise: { slow: 4, fast: 2, jitter: 1.5 },
    diastolicNoise: { slow: 3, fast: 1.5, jitter: 1 },
  },

  radiation: {
    /**
     * The habitat's dose rate is the one Curiosity's RAD measured at Gale Crater
     * (config/radiation.ts): no extra shielding modeled. The figures below are
     * only a fallback for times the RAD series doesn't cover.
     */
    baseDoseRate: GALE_SURFACE_RADIATION.absorbedDoseRate, // µGy/h
    /**
     * Daily cycle of a few percent, higher in the afternoon when the atmosphere
     * above the crater is thinner (Rafkin et al. 2014, JGR Planets 119).
     */
    diurnalAmplitude: 0.03,
    diurnalPeakHour: 16,
    noise: { slow: 0.02, fast: 0.01, jitter: 0.01 }, // fraction of the dose rate
  },

  /** Answers of the simulated daily check-in on past sols (1–5), before variation. */
  checkIn: {
    mood: 4,
    stress: 2,
    isolation: 2,
    /** Up to this much up or down, deterministic per sol. */
    jitter: 0.6,
    /** Sleep quality from the hours slept that night: at or above each value, that answer. */
    sleepQualityByHours: [
      { hours: 7, answer: 4 },
      { hours: 5, answer: 3 },
      { hours: 0, answer: 2 },
    ],
  },

  /** Periods of the two smooth-noise components, minutes. */
  noisePeriods: { slow: 45, fast: 8 },

  /** Shape of each event (ramp up and down, minutes) and its side effects. */
  events: {
    // intensity = peak dose-rate multiplier (synthetic storm)
    solarStorm: { rampUpMin: 45, rampDownMin: 480 },
    // the dose rate follows the solar particle event measured by RAD (config/radiation.ts)
    sepReplay: { rampUpMin: 0, rampDownMin: 0 },
    // intensity = SpO₂ points lost; the heart compensates
    lowOxygen: { rampUpMin: 15, rampDownMin: 20, heartRatePerPoint: 1.5 },
    // intensity = extra bpm (fever, infection); blood pressure follows a little
    illness: { rampUpMin: 120, rampDownMin: 180, systolicPerBeat: 0.4 },
    // the crew member stays awake through the planned sleep
    sleepLoss: { rampUpMin: 0, rampDownMin: 0 },
    // the exercise sessions inside the event don't happen
    skipExercise: { rampUpMin: 0, rampDownMin: 0 },
    // intensity = points the check-in answers get worse (mood, stress, isolation)
    lowMood: { rampUpMin: 0, rampDownMin: 0 },
  } satisfies Record<EventKind, EventShape>,
};

export type SimulatorParams = typeof SIMULATOR;
