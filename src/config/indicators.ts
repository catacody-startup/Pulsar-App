import type { Activity, IndicatorId, Status } from '../logic/types';
import { t } from '../i18n/i18n';

/** How each indicator is named (as a title and inside a sentence) and measured on screen. */
export const INDICATORS: Record<IndicatorId, { label: string; inSentence: string; unit: string }> = {
  heartRate: { label: 'Heart rate', inSentence: 'heart rate', unit: 'bpm' },
  spo2: { label: 'SpO₂', inSentence: 'SpO₂', unit: '%' },
  bloodPressure: { label: 'Blood pressure', inSentence: 'blood pressure', unit: 'mmHg' },
  radiation: { label: 'Radiation', inSentence: 'radiation', unit: 'µGy/h' },
  sleep: { label: 'Sleep last night', inSentence: 'sleep', unit: 'h' },
  exercise: { label: 'Exercise last sol', inSentence: 'exercise', unit: 'min' },
  wellbeing: { label: 'Wellbeing', inSentence: 'wellbeing', unit: '/ 5' },
};

export const STATUS_LABEL: Record<Status, string> = {
  ok: 'All good',
  watch: 'Attention',
  act: 'Act now',
};

/** Answer to "Am I OK?" for each overall status. */
export const OVERALL_ANSWER: Record<Status, (flagged: string[], total: number) => string> = {
  ok: (_, total) => t('Yes. All {total} indicators are in range.', { total }),
  watch: (flagged) => t('Mostly. Keep an eye on: {list}.', { list: flagged.join(', ') }),
  act: (flagged) => t('Not right now. Needs action: {list}.', { list: flagged.join(', ') }),
};

/** What the crew member is doing now, as shown next to their name. */
export const ACTIVITY_LABEL: Record<Activity, string> = {
  sleep: 'Asleep',
  rest: 'Resting',
  work: 'Working',
  exercise: 'Exercising',
};

/** Summary of the crew on the crew page, from the count of crew members per status. */
export const CREW_SUMMARY: Record<Status, (count: number) => string> = {
  ok: (n) => t('{n} all good', { n }),
  watch: (n) => t(n === 1 ? '{n} needs attention' : '{n} need attention', { n }),
  act: (n) => t(n === 1 ? '{n} needs to act now' : '{n} need to act now', { n }),
};
