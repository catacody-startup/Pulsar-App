import type { CrewProfile } from '../logic/types';

/**
 * Simulated crew. Fictional people with values of healthy adults.
 * Schedule hours are local mean solar time at the habitat.
 */
export const CREW: readonly CrewProfile[] = [
  {
    id: 'lucia',
    name: 'Lucía Ferreira',
    role: 'Flight engineer',
    baseline: { restingHeartRate: 61, spo2: 97.6, systolic: 116, diastolic: 74 },
    schedule: {
      wakeHour: 6.75,
      bedtimeHour: 22.75,
      workStartHour: 8,
      workEndHour: 19,
      exerciseStartHour: 16,
      // Around two hours a day, like crews on the ISS (aerobic + resistive).
      exerciseMinutes: 105,
    },
  },
];

export const DEFAULT_CREW_ID = 'lucia';
