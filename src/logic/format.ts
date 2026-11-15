import type { IndicatorResult } from './indicators';

/** The main value of an indicator as shown on screen (and in reports). */
export function formatIndicatorValue(r: IndicatorResult): string {
  switch (r.id) {
    case 'bloodPressure':
      return `${r.value}/${r.value2 ?? '–'}`;
    case 'radiation':
    case 'sleep':
    case 'wellbeing':
      return Number.isNaN(r.value) ? '–' : r.value.toFixed(1);
    default:
      return String(r.value);
  }
}
