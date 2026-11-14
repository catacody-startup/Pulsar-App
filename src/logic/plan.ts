/** The next item of the crew member's plan for the sol, for "What do I do now?" when all is good. */
import type { SolPlan } from './simulator';

export type PlanItemKind = 'wake' | 'exercise' | 'bedtime';

export interface PlanItem {
  kind: PlanItemKind;
  /** Local mean solar time, Mars hours; may be above 24 (after midnight). */
  hour: number;
}

/**
 * @param hour local time now, Mars hours [0, 24)
 * @param today plan of the current local sol
 * @param tomorrow plan of the next local sol (its wake-up comes after tonight)
 */
export function nextPlanItem(hour: number, today: SolPlan, tomorrow: SolPlan): PlanItem {
  if (hour < today.wakeHour) return { kind: 'wake', hour: today.wakeHour };
  if (today.exerciseMinutes > 0 && hour < today.exerciseStartHour) {
    return { kind: 'exercise', hour: today.exerciseStartHour };
  }
  if (hour < today.bedtimeHour) return { kind: 'bedtime', hour: today.bedtimeHour };
  return { kind: 'wake', hour: tomorrow.wakeHour + 24 };
}
