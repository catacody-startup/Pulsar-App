import type { IndicatorId, Status } from '../logic/types';

/** How each indicator is named and measured on screen. */
export const INDICATORS: Record<IndicatorId, { label: string; unit: string }> = {
  heartRate: { label: 'Heart rate', unit: 'bpm' },
  spo2: { label: 'SpO₂', unit: '%' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg' },
  radiation: { label: 'Radiation', unit: 'µGy/h' },
  sleep: { label: 'Sleep last night', unit: 'h' },
  exercise: { label: 'Exercise last sol', unit: 'min' },
};

export const STATUS_LABEL: Record<Status, string> = {
  ok: 'All good',
  watch: 'Attention',
  act: 'Act now',
};

/** Answer to "Am I OK?" for each overall status. */
export const OVERALL_ANSWER: Record<Status, (flagged: string[], total: number) => string> = {
  ok: (_, total) => `Yes. All ${total} indicators are in range.`,
  watch: (flagged) => `Mostly. Keep an eye on: ${flagged.join(', ')}.`,
  act: (flagged) => `Not right now. Needs action: ${flagged.join(', ')}.`,
};
