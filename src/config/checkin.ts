import type { CheckInAnswers } from '../logic/types';

/**
 * Daily wellbeing check-in: four quick questions on a 1–5 scale.
 * NASA asks for "minimally obtrusive measures" of psychological state on
 * missions beyond 6 months or beyond low Earth orbit (OCHMO-TB-016).
 */
export const CHECKIN_QUESTIONS: {
  id: keyof CheckInAnswers;
  question: string;
  low: string;
  high: string;
  /** Whether a high answer is the good one. */
  higherIsBetter: boolean;
}[] = [
  { id: 'mood', question: 'How is your mood?', low: 'Very low', high: 'Very good', higherIsBetter: true },
  { id: 'stress', question: 'How stressed do you feel?', low: 'Not at all', high: 'Very', higherIsBetter: false },
  { id: 'sleepQuality', question: 'How well did you sleep?', low: 'Very poorly', high: 'Very well', higherIsBetter: true },
  { id: 'isolation', question: 'How isolated or lonely do you feel?', low: 'Not at all', high: 'Very', higherIsBetter: false },
];

export const CHECKIN = {
  /** An answer this far into the bad end (1–2 for good-is-high, 4–5 for good-is-low) counts as low. */
  lowAtOrBelow: 2,
  lowAtOrAbove: 4,
  /** Local hour the simulated crew member does the check-in on past sols. */
  simulatedHour: 20,
};
