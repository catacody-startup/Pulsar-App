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
    age: 38,
    baseline: { restingHeartRate: 61, spo2: 97.6, systolic: 114, diastolic: 72 },
    schedule: {
      wakeHour: 6.75,
      bedtimeHour: 22.75,
      workStartHour: 8,
      workEndHour: 19,
      exerciseStartHour: 16,
      // ~30 min aerobic + ~60 min resistive, the in-flight prescription in
      // NASA's Exercise Overview technical brief (OCHMO-TB-031).
      exerciseMinutes: 90,
    },
  },
];

export const DEFAULT_CREW_ID = 'lucia';
