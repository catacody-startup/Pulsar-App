/** Daily wellbeing check-in: score, low answers, and merging simulated and real answers. */
import { CHECKIN, CHECKIN_QUESTIONS } from '../config/checkin';
import type { CheckIn, CheckInAnswers } from './types';

/** Wellbeing score 1–5 (5 best): good-is-low answers are flipped before averaging. */
export function wellbeingScore(answers: CheckInAnswers): number {
  const values = CHECKIN_QUESTIONS.map((q) => (q.higherIsBetter ? answers[q.id] : 6 - answers[q.id]));
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Questions answered at the bad end of the scale. */
export function lowAnswers(answers: CheckInAnswers): (keyof CheckInAnswers)[] {
  return CHECKIN_QUESTIONS.filter((q) =>
    q.higherIsBetter ? answers[q.id] <= CHECKIN.lowAtOrBelow : answers[q.id] >= CHECKIN.lowAtOrAbove,
  ).map((q) => q.id);
}

/** One check-in per sol, oldest first; an answer given in the app wins over a simulated one. */
export function mergeCheckIns(...lists: readonly (readonly CheckIn[])[]): CheckIn[] {
  const bySol = new Map<number, CheckIn>();
  for (const c of lists.flat()) {
    const existing = bySol.get(c.localSol);
    if (!existing || (existing.simulated && !c.simulated) || (existing.simulated === c.simulated && c.t > existing.t)) {
      bySol.set(c.localSol, c);
    }
  }
  return [...bySol.values()].sort((a, b) => a.localSol - b.localSol);
}
