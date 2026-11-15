/**
 * Everything the app shows about one crew member at a given minute:
 * the latest reading, the traffic light per indicator, the overall answer,
 * the alerts with their actions and what comes next in the plan.
 */
import { MISSION } from '../config/mission';
import { buildAlerts, type Alert } from './alerts';
import { mergeCheckIns } from './checkin';
import {
  evaluateIndicators,
  EVALUATION_SOLS,
  EVALUATION_WINDOW_MINUTES,
  overallStatus,
  type IndicatorResult,
  type Overall,
} from './indicators';
import { localMeanSolarHours } from './marsTime';
import { nextPlanItem, type PlanItem } from './plan';
import type { Simulator } from './simulator';
import type { CheckIn, CrewProfile, VitalsReading } from './types';

export interface Assessment {
  crew: CrewProfile;
  /** The reading of the current minute. */
  reading: VitalsReading;
  indicators: IndicatorResult[];
  overall: Overall;
  alerts: Alert[];
  /** Local sol in progress. */
  localSol: number;
  /** Today's check-in, if the crew member answered it in the app. */
  todaysCheckIn?: CheckIn;
  next: PlanItem;
}

/**
 * @param answered check-ins answered in the app (they win over the simulated ones)
 */
export function assessCrewMember(
  sim: Simulator,
  now: number,
  answered: readonly CheckIn[] = [],
  eastLongitudeDeg: number = MISSION.site.eastLongitudeDeg,
): Assessment {
  const recent = sim.recentReadings(now, EVALUATION_WINDOW_MINUTES);
  const sols = sim.recentSols(now, EVALUATION_SOLS);
  const checkIns = mergeCheckIns(sim.pastCheckIns(now, EVALUATION_SOLS), answered);
  const indicators = evaluateIndicators({ crew: sim.crew, recent, sols, checkIns });
  const localSol = sim.localSolAt(now);
  const hour = localMeanSolarHours(now, eastLongitudeDeg);
  const todaysCheckIn = answered.find((c) => c.localSol === localSol);
  return {
    crew: sim.crew,
    reading: recent.at(-1)!,
    indicators,
    overall: overallStatus(indicators),
    alerts: buildAlerts(indicators),
    localSol,
    ...(todaysCheckIn ? { todaysCheckIn } : {}),
    next: nextPlanItem(hour, sim.solPlan(localSol), sim.solPlan(localSol + 1)),
  };
}
