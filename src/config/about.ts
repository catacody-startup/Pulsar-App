import { RAD_BACKGROUND_DOSE_RATE, RAD_REPLAY } from './radiation';
import type { SourceId } from './sources';

/** The NASA data and documents Pulsar uses, and what for (About page). */
export const DATA_SOURCES: { id: SourceId; use: string }[] = [
  {
    id: 'msl-rad-pds',
    use: `Radiation in the habitat: the dose rate Curiosity measured at Gale Crater. Each habitat sol replays one of the quiet sols ${RAD_REPLAY.quietSols.from}–${RAD_REPLAY.quietSols.to} at the same local time (background ≈ ${RAD_BACKGROUND_DOSE_RATE.toFixed(1)} µGy/h), and the “Solar storm” scenario replays the solar particle event of 10 September 2017.`,
  },
  {
    id: 'donki',
    use: 'Space weather: CMEs (with WSA-ENLIL arrival forecasts at Mars), solar energetic particles, geomagnetic storms and shocks of the last 30 days, live through the Pulsar server, which keeps the NASA API key. DONKI’s record of September 2017 goes with the storm replay.',
  },
  {
    id: 'nasa-std-3001-v1',
    use: 'Crew health standards behind the thresholds and actions, through NASA’s technical briefs on radiation, atmosphere, sleep, exercise and behavioral health.',
  },
  { id: 'hrr', use: 'The spaceflight health risks each indicator tracks.' },
  { id: 'mars24', use: 'Mars time: mission sol and local mean solar time at Gale Crater.' },
  {
    id: 'jpl-approx-pos',
    use: 'Where Earth and Mars are today, and so how long a signal takes between the habitat and mission control (and the soonest an answer can arrive).',
  },
];
