import type { EventKind } from '../logic/types';
import { DEMO_CREW_ID } from './crew';

/**
 * Demo scenarios: events injected into the simulation so the panel and the
 * alerts can be seen in every state. Radiation and cabin air reach the whole
 * crew; personal events happen to one crew member (Lucía). Times are relative
 * to the moment the scenario is chosen.
 */
export interface ScenarioEvent {
  kind: EventKind;
  /** Crew member it happens to; without it, the whole habitat (radiation, cabin air). */
  crewId?: string;
  /** When it started: minutes before the scenario was chosen… */
  startMinutesAgo?: number;
  /** …or at 18:00 of the sol before the last completed night (to cover that night)… */
  lastNight?: boolean;
  /** …or at the start of the sol this many sols ago. */
  solsAgo?: number;
  durationMin: number;
  intensity: number;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  events: ScenarioEvent[];
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'nominal',
    label: 'Normal sol',
    description: 'Nothing unusual: a regular sol in the habitat.',
    events: [],
  },
  {
    id: 'solar-storm',
    label: 'Solar storm (real data)',
    description:
      'Replay of the solar particle event of 10 September 2017 as Curiosity’s RAD measured it at Gale Crater, starting 8 hours ago. It reaches the whole crew: radiation stays at shelter level for about 8 more hours.',
    events: [{ kind: 'sepReplay', startMinutesAgo: 8 * 60, durationMin: 3 * 24 * 60, intensity: 1 }],
  },
  {
    id: 'low-oxygen',
    label: 'Low cabin oxygen',
    description: 'Oxygen in the habitat started dropping 25 minutes ago: the whole crew’s SpO₂ falls below 90%.',
    events: [{ kind: 'lowOxygen', startMinutesAgo: 25, durationMin: 6 * 60, intensity: 9 }],
  },
  {
    id: 'fever',
    label: 'Fever',
    description: 'Lucía has had an infection since this morning: heart rate and blood pressure are up.',
    events: [{ kind: 'illness', crewId: DEMO_CREW_ID, startMinutesAgo: 6 * 60, durationMin: 48 * 60, intensity: 55 }],
  },
  {
    id: 'sleepless',
    label: 'Sleepless night',
    description: 'Lucía was awake through the whole of last night.',
    events: [{ kind: 'sleepLoss', crewId: DEMO_CREW_ID, lastNight: true, durationMin: 18 * 60, intensity: 1 }],
  },
  {
    id: 'missed-workouts',
    label: 'Missed workouts',
    description: 'Lucía has not exercised for the last two sols.',
    events: [{ kind: 'skipExercise', crewId: DEMO_CREW_ID, solsAgo: 2, durationMin: 3 * 25 * 60, intensity: 1 }],
  },
  {
    id: 'isolation',
    label: 'Feeling isolated',
    description: 'Lucía’s last two check-ins came back low: low mood, stress and loneliness.',
    // From the start of the sol before yesterday to the start of today: covers both check-ins.
    events: [{ kind: 'lowMood', crewId: DEMO_CREW_ID, solsAgo: 2, durationMin: 2 * 1479, intensity: 2 }],
  },
];

export const DEFAULT_SCENARIO_ID = 'nominal';
