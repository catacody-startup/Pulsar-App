/**
 * Estimated dose equivalent of the mission so far, against NASA's career limit:
 * the cruise to Mars plus the days on the surface, at the rates measured by RAD.
 */
import { MISSION } from '../config/mission';
import { CRUISE_RADIATION, GALE_SURFACE_RADIATION } from '../config/radiation';
import { THRESHOLDS } from '../config/thresholds';

const DAY_MS = 86_400_000;

export interface MissionDose {
  transitMilliSievert: number;
  surfaceMilliSievert: number;
  totalMilliSievert: number;
  /** Total ÷ career limit (600 mSv, NASA-STD-3001 [V1 4030]). */
  fractionOfCareerLimit: number;
}

export function missionDose(
  nowMs: number,
  landingMs: number = MISSION.landingMs,
  transitDays: number = MISSION.transitDays,
): MissionDose {
  const transit = transitDays * CRUISE_RADIATION.doseEquivalentPerDay;
  const daysOnSurface = Math.max(0, (nowMs - landingMs) / DAY_MS);
  const surface = daysOnSurface * GALE_SURFACE_RADIATION.doseEquivalentPerDay;
  const total = transit + surface;
  return {
    transitMilliSievert: transit,
    surfaceMilliSievert: surface,
    totalMilliSievert: total,
    fractionOfCareerLimit: total / THRESHOLDS.radiation.careerLimitMilliSievert,
  };
}
