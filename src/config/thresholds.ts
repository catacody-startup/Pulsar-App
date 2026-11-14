import type { IndicatorId, Status } from '../logic/types';
import { GALE_SURFACE_RADIATION } from './radiation';
import type { SourceId } from './sources';

/**
 * Thresholds of every indicator. Each rule says where its numbers come from;
 * when a cut-off is Pulsar's own choice (a prototype decision, not a medical
 * standard) the rule says so in `basis`.
 */
export const THRESHOLDS = {
  heartRate: {
    /** Minutes averaged, so one noisy reading doesn't raise an alarm. */
    windowMinutes: 5,
    normal: { min: 50, max: 100 },
    act: { min: 40, max: 120 },
    /** Fraction of the age-predicted maximum that counts as near-maximal effort. */
    nearMaxFraction: 0.96,
  },
  spo2: {
    windowMinutes: 5,
    /** 94% or lower: hypoxic. */
    hypoxicAtOrBelow: 94,
    /** Below 90%: emergency. */
    emergencyBelow: 90,
  },
  bloodPressure: {
    /** Blood pressure is classified on an average, never on one reading. */
    windowMinutes: 30,
    high: { systolic: 130, diastolic: 80 },
    crisis: { systolic: 180, diastolic: 120 },
    exerciseStop: { systolic: 250, diastolic: 115 },
  },
  radiation: {
    windowMinutes: 15,
    /** Normal dose rate of the habitat, µGy/h. */
    baselineDoseRate: GALE_SURFACE_RADIATION.absorbedDoseRate,
    /** Multiples of the baseline: above the daily cycle of a few %, and a storm under way. */
    elevatedFactor: 1.25,
    stormFactor: 2,
    careerLimitMilliSievert: 600,
  },
  sleep: {
    recommendedHours: 7,
    /** Average over the last nights that counts as a sleep debt. */
    debtAverageHours: 6,
    debtNights: 7,
    /** A night this short is like a night without sleep. */
    almostNoneHours: 3,
  },
  wellbeing: {
    /** Check-ins older than this many sols no longer count. */
    maxAgeSols: 1,
  },
  exercise: {
    prescribedMinutes: 90,
    minimumMinutes: 60,
    /** A sol under this counts as a missed session. */
    missedBelowMinutes: 30,
    missedSolsInARow: 2,
  },
};

export interface Rule {
  indicator: IndicatorId;
  status: Status;
  /** What the rule means, shown under the indicator. */
  text: string;
  sources: SourceId[];
  /** When the cut-off is not taken straight from the sources. */
  basis?: string;
}

const T = THRESHOLDS;

export const RULES = {
  // Heart rate
  'heartRate.normal': {
    indicator: 'heartRate',
    status: 'ok',
    text: `Within ${T.heartRate.normal.min}–${T.heartRate.normal.max} bpm, the normal adult range.`,
    sources: ['who-oximetry-2011'],
  },
  'heartRate.high': {
    indicator: 'heartRate',
    status: 'watch',
    text: `Above ${T.heartRate.normal.max} bpm without exercising.`,
    sources: ['who-oximetry-2011'],
  },
  'heartRate.low': {
    indicator: 'heartRate',
    status: 'watch',
    text: `Below ${T.heartRate.normal.min} bpm.`,
    sources: ['who-oximetry-2011'],
  },
  'heartRate.asleep': {
    indicator: 'heartRate',
    status: 'ok',
    text: `Asleep: the heart slows down at night; only below ${T.heartRate.act.min} bpm is a concern.`,
    sources: ['who-oximetry-2011'],
    basis: `Pulsar rule: the ${T.heartRate.normal.min} bpm floor applies awake.`,
  },
  'heartRate.veryHigh': {
    indicator: 'heartRate',
    status: 'act',
    text: `Above ${T.heartRate.act.max} bpm without exercising.`,
    sources: ['who-oximetry-2011'],
    basis: `Pulsar margin: ${T.heartRate.act.max - T.heartRate.normal.max} bpm above the normal range.`,
  },
  'heartRate.veryLow': {
    indicator: 'heartRate',
    status: 'act',
    text: `Below ${T.heartRate.act.min} bpm.`,
    sources: ['who-oximetry-2011'],
    basis: `Pulsar margin: ${T.heartRate.normal.min - T.heartRate.act.min} bpm below the normal range.`,
  },
  'heartRate.exercise': {
    indicator: 'heartRate',
    status: 'ok',
    text: `Exercising, below ${T.heartRate.nearMaxFraction * 100}% of the age-predicted maximum.`,
    sources: ['acsm', 'tanaka-2001'],
  },
  'heartRate.nearMax': {
    indicator: 'heartRate',
    status: 'watch',
    text: `Near-maximal effort: ${T.heartRate.nearMaxFraction * 100}% or more of the age-predicted maximum.`,
    sources: ['acsm', 'tanaka-2001'],
  },

  // Oxygen saturation
  'spo2.normal': {
    indicator: 'spo2',
    status: 'ok',
    text: `${T.spo2.hypoxicAtOrBelow + 1}% or above, normal.`,
    sources: ['who-oximetry-2011'],
  },
  'spo2.low': {
    indicator: 'spo2',
    status: 'watch',
    text: `${T.spo2.hypoxicAtOrBelow}% or lower: low oxygen (hypoxia).`,
    sources: ['who-oximetry-2011', 'ochmo-tb-003'],
  },
  'spo2.emergency': {
    indicator: 'spo2',
    status: 'act',
    text: `Below ${T.spo2.emergencyBelow}%: a medical emergency.`,
    sources: ['who-oximetry-2011', 'ochmo-tb-003'],
  },

  // Blood pressure
  'bloodPressure.normal': {
    indicator: 'bloodPressure',
    status: 'ok',
    text: `Below ${T.bloodPressure.high.systolic}/${T.bloodPressure.high.diastolic} mmHg (normal or elevated).`,
    sources: ['acc-aha-2017'],
  },
  'bloodPressure.high': {
    indicator: 'bloodPressure',
    status: 'watch',
    text: `${T.bloodPressure.high.systolic}/${T.bloodPressure.high.diastolic} mmHg or more: high blood pressure.`,
    sources: ['acc-aha-2017'],
  },
  'bloodPressure.crisis': {
    indicator: 'bloodPressure',
    status: 'act',
    text: `Above ${T.bloodPressure.crisis.systolic} and/or ${T.bloodPressure.crisis.diastolic} mmHg: hypertensive crisis.`,
    sources: ['acc-aha-2017'],
  },
  'bloodPressure.exercise': {
    indicator: 'bloodPressure',
    status: 'ok',
    text: `Exercising: pressure rises with effort; safe below ${T.bloodPressure.exerciseStop.systolic}/${T.bloodPressure.exerciseStop.diastolic} mmHg.`,
    sources: ['acsm'],
  },
  'bloodPressure.exerciseStop': {
    indicator: 'bloodPressure',
    status: 'act',
    text: `Above ${T.bloodPressure.exerciseStop.systolic} or ${T.bloodPressure.exerciseStop.diastolic} mmHg while exercising: stop.`,
    sources: ['acsm'],
  },

  // Radiation
  'radiation.normal': {
    indicator: 'radiation',
    status: 'ok',
    text: 'Normal background of the Martian surface (galactic cosmic rays).',
    sources: ['hassler-2014', 'ochmo-tb-020'],
  },
  'radiation.elevated': {
    indicator: 'radiation',
    status: 'watch',
    text: `Dose rate ${T.radiation.elevatedFactor}× the normal background or more.`,
    sources: ['ochmo-tb-020', 'hassler-2014'],
    basis: 'Pulsar cut-off, above the daily cycle of a few percent (Rafkin 2014); NASA requires alerting the crew when levels are expected to exceed acceptable values [V2 6100].',
  },
  'radiation.storm': {
    indicator: 'radiation',
    status: 'act',
    text: `Dose rate ${T.radiation.stormFactor}× the normal background or more: solar particle event.`,
    sources: ['ochmo-tb-020', 'hrr'],
    basis: 'Pulsar cut-off; exposures must be kept as low as reasonably achievable [V1 4029], so the crew shelters while it lasts.',
  },

  // Sleep
  'sleep.ok': {
    indicator: 'sleep',
    status: 'ok',
    text: `${T.sleep.recommendedHours} h or more last night.`,
    sources: ['ochmo-sleep'],
  },
  'sleep.short': {
    indicator: 'sleep',
    status: 'watch',
    text: `Less than ${T.sleep.recommendedHours} h last night (adults need 7–9 h).`,
    sources: ['ochmo-sleep', 'hrr'],
  },
  'sleep.debt': {
    indicator: 'sleep',
    status: 'act',
    text: `${T.sleep.debtAverageHours} h or less on average over the last ${T.sleep.debtNights} nights: performance drops as after 24–36 h awake.`,
    sources: ['ochmo-sleep', 'hrr'],
  },
  'sleep.none': {
    indicator: 'sleep',
    status: 'act',
    text: `Less than ${T.sleep.almostNoneHours} h last night: close to a night without sleep.`,
    sources: ['ochmo-sleep', 'hrr'],
    basis: 'Pulsar cut-off for a night almost without sleep.',
  },

  // Exercise
  'exercise.ok': {
    indicator: 'exercise',
    status: 'ok',
    text: `${T.exercise.minimumMinutes} min or more last sol (prescription: ${T.exercise.prescribedMinutes} min, aerobic + resistive).`,
    sources: ['ochmo-tb-031'],
  },
  'exercise.short': {
    indicator: 'exercise',
    status: 'watch',
    text: `Less than ${T.exercise.minimumMinutes} min last sol.`,
    sources: ['ochmo-tb-031', 'hrr'],
    basis: 'Lower end of the prescription: ~30 min aerobic + 30 min resistive.',
  },
  'exercise.missed': {
    indicator: 'exercise',
    status: 'act',
    text: `Sessions missed ${T.exercise.missedSolsInARow} sols in a row (under ${T.exercise.missedBelowMinutes} min each).`,
    sources: ['ochmo-tb-031', 'hrr'],
    basis: 'Pulsar cut-off; aerobic capacity, muscle strength and bone density must be maintained in-mission [V1 4003, 4024, 4027].',
  },

  // Wellbeing (daily check-in)
  'wellbeing.pending': {
    indicator: 'wellbeing',
    status: 'ok',
    text: 'No recent check-in: answer today’s four questions.',
    sources: ['ochmo-tb-016'],
  },
  'wellbeing.ok': {
    indicator: 'wellbeing',
    status: 'ok',
    text: 'Check-in answers in a good range.',
    sources: ['ochmo-tb-016'],
  },
  'wellbeing.low': {
    indicator: 'wellbeing',
    status: 'watch',
    text: 'Low answers in the last check-in (mood, stress, sleep or isolation).',
    sources: ['ochmo-tb-016', 'hrr'],
    basis: 'Pulsar cut-off: 1–2 on mood or sleep, 4–5 on stress or isolation.',
  },
  'wellbeing.persistent': {
    indicator: 'wellbeing',
    status: 'act',
    text: 'Low answers two sols in a row.',
    sources: ['ochmo-tb-016', 'hrr'],
    basis: 'Pulsar cut-off: a low check-in that repeats the next sol.',
  },
} satisfies Record<string, Rule>;

export type RuleId = keyof typeof RULES;
