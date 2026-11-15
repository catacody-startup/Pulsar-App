import type { CrewProfile } from '../logic/types';

/**
 * Simulated crew of the habitat: four fictional people with the values of
 * healthy adults. Schedule hours are local mean solar time at the habitat;
 * exercise sessions are staggered so the crew shares the equipment.
 *
 * Every session is ~90 min: ~30 min aerobic + ~60 min resistive, the in-flight
 * prescription in NASA's Exercise Overview technical brief (OCHMO-TB-031).
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
      exerciseMinutes: 90,
    },
  },
  {
    id: 'kenji',
    name: 'Kenji Watanabe',
    role: 'Commander',
    age: 47,
    baseline: { restingHeartRate: 58, spo2: 97.4, systolic: 118, diastolic: 74 },
    schedule: {
      wakeHour: 6,
      bedtimeHour: 22,
      workStartHour: 7.5,
      workEndHour: 19,
      exerciseStartHour: 6.5,
      exerciseMinutes: 90,
    },
  },
  {
    id: 'amara',
    name: 'Amara Okafor',
    role: 'Crew medical officer',
    age: 42,
    baseline: { restingHeartRate: 64, spo2: 97.8, systolic: 110, diastolic: 70 },
    schedule: {
      wakeHour: 7,
      bedtimeHour: 23,
      workStartHour: 8.5,
      workEndHour: 19.5,
      exerciseStartHour: 12.5,
      exerciseMinutes: 90,
    },
  },
  {
    id: 'erik',
    name: 'Erik Lindqvist',
    role: 'Geologist',
    age: 33,
    baseline: { restingHeartRate: 56, spo2: 97.9, systolic: 116, diastolic: 70 },
    schedule: {
      wakeHour: 7.25,
      bedtimeHour: 23.25,
      workStartHour: 8.5,
      workEndHour: 19,
      exerciseStartHour: 19.5,
      exerciseMinutes: 90,
    },
  },
];

export type CrewId = string;

export function crewMember(id: CrewId): CrewProfile | undefined {
  return CREW.find((c) => c.id === id);
}

/** The crew member the personal events of the demo scenarios happen to. */
export const DEMO_CREW_ID = 'lucia';
