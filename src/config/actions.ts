import type { SourceId } from './sources';
import { RULES, THRESHOLDS, type RuleId } from './thresholds';

/** Rules that raise an alert: every rule whose status is not "ok". */
export type AlertRuleId = {
  [K in RuleId]: (typeof RULES)[K]['status'] extends 'ok' ? never : K;
}[RuleId];

export interface Action {
  /** What is going on, in a few words. */
  title: string;
  /** What to do now, in order. Concrete and doable without help from Earth. */
  steps: string[];
  /** Where the steps come from, when a source backs them. */
  sources?: SourceId[];
}

const T = THRESHOLDS;

/**
 * "What do I do now?": one concrete action per alert. Help from Earth can be
 * 20 minutes away, so the steps rely on the crew and the crew medical officer.
 */
export const ACTIONS: Record<AlertRuleId, Action> = {
  'heartRate.high': {
    title: 'Heart rate high at rest',
    steps: [
      'Sit down and rest for 10 minutes, breathing slowly.',
      'Drink water and check for fever, pain or stress.',
      `If it stays above ${T.heartRate.normal.max} bpm after resting, tell the crew medical officer.`,
    ],
  },
  'heartRate.veryHigh': {
    title: 'Heart rate very high at rest',
    steps: [
      'Stop what you are doing and sit or lie down.',
      'Tell the crew medical officer now.',
      'If you feel chest pain, faintness or shortness of breath, call a crewmate to stay with you.',
    ],
  },
  'heartRate.low': {
    title: 'Heart rate low',
    steps: [
      'If you feel dizzy or faint, sit or lie down.',
      'Check that the sensor is in place and recheck in 10 minutes.',
      'If it stays low and you feel unwell, tell the crew medical officer.',
    ],
  },
  'heartRate.veryLow': {
    title: 'Heart rate very low',
    steps: [
      'Sit or lie down and call a crewmate to stay with you.',
      'Tell the crew medical officer now.',
      'Check that the sensor is in place: a loose sensor can read low.',
    ],
  },
  'heartRate.nearMax': {
    title: 'Near-maximal effort',
    steps: [
      `Ease off until your heart rate is back under ${T.heartRate.nearMaxFraction * 100}% of your maximum.`,
      'Stop if you feel chest pain, dizziness or unusual breathlessness.',
    ],
    sources: ['acsm'],
  },
  'spo2.low': {
    title: 'Oxygen saturation low',
    steps: [
      'Check that the sensor sits well and your hand is warm, then recheck.',
      'Check the cabin oxygen reading on the habitat panel.',
      `Rest and breathe slowly; if it stays at ${T.spo2.hypoxicAtOrBelow}% or lower, put on an oxygen mask and tell the crew medical officer.`,
    ],
    sources: ['ochmo-tb-003', 'who-oximetry-2011'],
  },
  'spo2.emergency': {
    title: 'Oxygen saturation critically low',
    steps: [
      'Put on an oxygen mask now.',
      'Alert the crew: check the cabin oxygen partial pressure.',
      'Tell the crew medical officer now.',
    ],
    sources: ['ochmo-tb-003', 'who-oximetry-2011'],
  },
  'bloodPressure.high': {
    title: 'Blood pressure high',
    steps: [
      'Sit quietly for 5 minutes and measure again.',
      'Go easy on salt and caffeine today.',
      'If it stays high, report it at the next medical conference.',
    ],
    sources: ['acc-aha-2017'],
  },
  'bloodPressure.crisis': {
    title: 'Blood pressure dangerously high',
    steps: [
      'Sit down and rest; measure again in 5 minutes.',
      'Tell the crew medical officer now.',
      'Headache, chest pain, vision changes or confusion make it an emergency.',
    ],
    sources: ['acc-aha-2017'],
  },
  'bloodPressure.exerciseStop': {
    title: 'Blood pressure too high for exercise',
    steps: ['Stop the exercise now and cool down slowly.', 'Measure again after 5 minutes of rest.'],
    sources: ['acsm'],
  },
  'radiation.elevated': {
    title: 'Radiation above normal',
    steps: [
      'Check the space weather updates from Earth.',
      'Postpone EVAs that are not essential.',
      'Be ready to move to the storm shelter.',
    ],
    sources: ['ochmo-tb-020'],
  },
  'radiation.storm': {
    title: 'Solar particle event: take shelter',
    steps: [
      'Go to the storm shelter, the most shielded area of the habitat, now.',
      'Cancel EVAs; crew outside return to the habitat.',
      `Stay sheltered until the dose rate is back under ${T.radiation.stormFactor}× normal.`,
    ],
    sources: ['ochmo-tb-020'],
  },
  'sleep.short': {
    title: 'Short night',
    steps: [
      'Plan an early night: lights out on time, screens dimmed an hour before.',
      'Avoid caffeine in the second half of the sol.',
      'A 20-minute nap helps if the plan allows it.',
    ],
    sources: ['ochmo-sleep'],
  },
  'sleep.debt': {
    title: 'Sleep debt building up',
    steps: [
      'Tell the commander: move critical tasks and EVAs away from you today.',
      'Protect a full sleep period tonight, with no work after dinner.',
      'Use the habitat lighting to keep a regular bedtime.',
    ],
    sources: ['ochmo-sleep'],
  },
  'sleep.none': {
    title: 'Almost no sleep last night',
    steps: [
      'Avoid critical tasks and EVAs today; tell the commander.',
      'Take a 20–30 minute nap if you can.',
      'Go to bed early tonight.',
    ],
    sources: ['ochmo-sleep'],
  },
  'exercise.short': {
    title: 'Exercise below the prescription',
    steps: [
      `Complete today’s session: ~30 min aerobic and 30–60 min resistive (${T.exercise.prescribedMinutes} min in total).`,
    ],
    sources: ['ochmo-tb-031'],
  },
  'exercise.missed': {
    title: 'Exercise sessions missed',
    steps: [
      'Do the full session first thing today.',
      'Tell the commander so the session is protected in the plan.',
      'Without exercise, muscle, bone and aerobic capacity drop week after week.',
    ],
    sources: ['ochmo-tb-031'],
  },
  'wellbeing.low': {
    title: 'Not feeling great today',
    steps: [
      'Talk with a crewmate you trust, or with the commander.',
      'Make room for something you enjoy: music, a message home, time at the window or with the plants.',
      'Keep your sleep and exercise routine: both help mood.',
    ],
    sources: ['ochmo-tb-016'],
  },
  'wellbeing.persistent': {
    title: 'Low wellbeing two sols in a row',
    steps: [
      'Tell the crew medical officer today.',
      'Ask for a private psychological conference (PPC) with the behavioral health team on Earth.',
      'Lighten today’s plan if you can, and do the next check-in tomorrow.',
    ],
    sources: ['ochmo-tb-016'],
  },
};

/** Shown under "What do I do now?" when there are no alerts. */
export const NO_ALERTS_TEXT = 'Nothing to act on. Keep to your plan.';

/** Names of the plan items shown when there is nothing to act on. */
export const PLAN_ITEM_LABEL = {
  wake: 'Wake-up',
  exercise: 'Exercise session',
  bedtime: 'Lights out',
} as const;
