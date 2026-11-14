import type { EventKind } from '../logic/types';

/**
 * Demo scenarios: events injected into the simulated crew member so the
 * panel and the alerts can be seen in every state. Times are relative to
 * the moment the scenario is chosen.
 */
export interface ScenarioEvent {
  kind: EventKind;
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
      'Replay of the solar particle event of 10 September 2017 as Curiosity’s RAD measured it at Gale Crater, starting 8 hours ago.',
    events: [{ kind: 'sepReplay', startMinutesAgo: 8 * 60, durationMin: 3 * 24 * 60, intensity: 1 }],
  },
  {
    id: 'low-oxygen',
    label: 'Low cabin oxygen',
    description: 'Oxygen in the habitat started dropping 25 minutes ago: SpO₂ falls below 90%.',
    events: [{ kind: 'lowOxygen', startMinutesAgo: 25, durationMin: 6 * 60, intensity: 9 }],
  },
  {
    id: 'fever',
    label: 'Fever',
    description: 'An infection since this morning: heart rate and blood pressure are up.',
    events: [{ kind: 'illness', startMinutesAgo: 6 * 60, durationMin: 48 * 60, intensity: 45 }],
  },
  {
    id: 'sleepless',
    label: 'Sleepless night',
    description: 'Awake through the whole of last night.',
    events: [{ kind: 'sleepLoss', lastNight: true, durationMin: 18 * 60, intensity: 1 }],
  },
  {
    id: 'missed-workouts',
    label: 'Missed workouts',
    description: 'No exercise for the last two sols.',
    events: [{ kind: 'skipExercise', solsAgo: 2, durationMin: 3 * 25 * 60, intensity: 1 }],
  },
  {
    id: 'isolation',
    label: 'Feeling isolated',
    description: 'The last two check-ins came back low: low mood, stress and loneliness.',
    // From the start of the sol before yesterday to the start of today: covers both check-ins.
    events: [{ kind: 'lowMood', solsAgo: 2, durationMin: 2 * 1479, intensity: 2 }],
  },
];

export const DEFAULT_SCENARIO_ID = 'nominal';
