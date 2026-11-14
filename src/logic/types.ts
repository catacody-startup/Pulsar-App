/** What the crew member is doing in a given minute. */
export type Activity = 'sleep' | 'rest' | 'work' | 'exercise';

/** Resting values of a healthy crew member, before activity and noise. */
export interface CrewBaseline {
  /** Resting heart rate, beats per minute. */
  restingHeartRate: number;
  /** Oxygen saturation at rest, %. */
  spo2: number;
  /** Blood pressure at rest, mmHg. */
  systolic: number;
  diastolic: number;
}

/**
 * Daily plan, in local mean solar time of the habitat (Mars hours, 0–24).
 * Durations are in Earth minutes, the unit wearables and medical guidelines use.
 */
export interface CrewSchedule {
  wakeHour: number;
  /** Lights out. Values above 24 mean after midnight. */
  bedtimeHour: number;
  workStartHour: number;
  workEndHour: number;
  exerciseStartHour: number;
  exerciseMinutes: number;
}

export interface CrewProfile {
  id: string;
  name: string;
  role: string;
  baseline: CrewBaseline;
  schedule: CrewSchedule;
}

/** Things that can happen to the crew or the habitat during a simulation. */
export type EventKind = 'solarStorm' | 'lowOxygen' | 'illness' | 'sleepLoss';

export interface SimEvent {
  kind: EventKind;
  /** Earth time when it starts, ms since the Unix epoch. */
  start: number;
  durationMin: number;
  /**
   * Peak strength, in the kind's own unit:
   * solarStorm = dose-rate multiplier, lowOxygen = SpO₂ points lost,
   * illness = extra heart beats per minute, sleepLoss = unused (1).
   */
  intensity: number;
}

/** One reading of the wearable and the habitat dosimeter: one per minute. */
export interface VitalsReading {
  /** Start of the minute, ms since the Unix epoch (UTC). */
  t: number;
  heartRate: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  /** Absorbed dose rate in the habitat, µGy/h. */
  doseRate: number;
  activity: Activity;
}

/** Day-level indicators, one per local sol. */
export interface SolSummary {
  /** Local sol number at the habitat (integer part of the local sol date). */
  localSol: number;
  /** Sol of the mission, landing = 0. */
  missionSol: number;
  /** Sleep of the night that ended this sol, Earth hours. */
  sleepHours: number;
  exerciseMinutes: number;
  /** Absorbed dose during the sol, mGy. */
  doseMilliGray: number;
  /** False while the sol is still in progress. */
  complete: boolean;
}
