import type { SpaceWeatherKind } from '../logic/donki';

/** How each kind of DONKI event is named on screen. */
export const SPACE_WEATHER_LABEL: Record<SpaceWeatherKind, string> = {
  CME: 'Coronal mass ejection',
  SEP: 'Solar energetic particles',
  GST: 'Geomagnetic storm',
  IPS: 'Interplanetary shock',
};

/** How many events the panel lists. */
export const SPACE_WEATHER_MAX_EVENTS = 6;
