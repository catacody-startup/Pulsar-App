/**
 * Mars time from Earth time, following the NASA GISS Mars24 algorithm
 * (Allison & McEwen 2000, https://www.giss.nasa.gov/tools/mars24/help/algorithm.html).
 *
 * - Mars Sol Date (MSD): sols elapsed since 29 December 1873, at Mars' prime meridian.
 * - Local sol date: MSD shifted to a site's local mean solar time (LMST).
 *   Its integer part names the local sol and its fraction is the time of sol.
 */

const MS_PER_EARTH_DAY = 86_400_000;
const JD_AT_UNIX_EPOCH = 2_440_587.5;
/** TT − UTC: 37 leap seconds (none added since 2017) + 32.184 s. */
const TT_MINUS_UTC_MS = 69_184;
/** Julian Date (TT) at MSD 0. */
const MSD_EPOCH_JD_TT = 2_405_522.0028779;

/** A mean solar day on Mars, in Earth days (24 h 39 min 35 s). */
export const SOL_IN_EARTH_DAYS = 1.0274912517;
/** One Mars hour (1/24 sol), in Earth minutes (≈ 61.65). */
export const MARS_HOUR_IN_MINUTES = SOL_IN_EARTH_DAYS * 60;

export function marsSolDate(ms: number): number {
  const jdTT = (ms + TT_MINUS_UTC_MS) / MS_PER_EARTH_DAY + JD_AT_UNIX_EPOCH;
  return (jdTT - MSD_EPOCH_JD_TT) / SOL_IN_EARTH_DAYS;
}

export function localSolDate(ms: number, eastLongitudeDeg: number): number {
  return marsSolDate(ms) + eastLongitudeDeg / 360;
}

/** Inverse of `localSolDate`: the Earth time (ms) of a local sol date. */
export function msAtLocalSolDate(lsd: number, eastLongitudeDeg: number): number {
  const msd = lsd - eastLongitudeDeg / 360;
  const jdTT = msd * SOL_IN_EARTH_DAYS + MSD_EPOCH_JD_TT;
  return (jdTT - JD_AT_UNIX_EPOCH) * MS_PER_EARTH_DAY - TT_MINUS_UTC_MS;
}

/** Local mean solar time at the site, in Mars hours [0, 24). */
export function localMeanSolarHours(ms: number, eastLongitudeDeg: number): number {
  const lsd = localSolDate(ms, eastLongitudeDeg);
  return (lsd - Math.floor(lsd)) * 24;
}

/** Mission sol at `ms`, counting the landing sol as sol 0 (like Curiosity). */
export function missionSol(ms: number, landingMs: number, eastLongitudeDeg: number): number {
  return (
    Math.floor(localSolDate(ms, eastLongitudeDeg)) -
    Math.floor(localSolDate(landingMs, eastLongitudeDeg))
  );
}

/** "HH:MM" for a time of sol given in Mars hours. */
export function formatMarsClock(hours: number): string {
  const totalMinutes = Math.floor((((hours % 24) + 24) % 24) * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
