/**
 * Where Earth and Mars are, and how long a signal takes between them.
 *
 * Keplerian elements and their rates from E. M. Standish, "Keplerian Elements
 * for Approximate Positions of the Major Planets" (NASA JPL Solar System
 * Dynamics), Table 1, valid 1800–2050: heliocentric ecliptic positions
 * (J2000) accurate to a few thousand km at worst for these two planets,
 * far below what matters for a signal delay.
 */

interface Elements {
  /** Semi-major axis, AU. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Inclination, degrees. */
  I: number;
  /** Mean longitude, degrees. */
  L: number;
  /** Longitude of perihelion, degrees. */
  varpi: number;
  /** Longitude of the ascending node, degrees. */
  node: number;
}

/** Elements at J2000 and their change per Julian century. */
const PLANETS: Record<'earth' | 'mars', { at2000: Elements; perCentury: Elements }> = {
  // The Earth-Moon barycenter: at most ~4,700 km from Earth's center.
  earth: {
    at2000: { a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, varpi: 102.93768193, node: 0 },
    perCentury: { a: 0.00000562, e: -0.00004392, I: -0.01294668, L: 35999.37244981, varpi: 0.32327364, node: 0 },
  },
  mars: {
    at2000: { a: 1.52371034, e: 0.0933941, I: 1.84969142, L: -4.55343205, varpi: -23.94362959, node: 49.55953891 },
    perCentury: { a: 0.00001847, e: 0.00007882, I: -0.00813131, L: 19140.30268499, varpi: 0.44441088, node: -0.29257343 },
  },
};

/** Light time over one astronomical unit, seconds (IAU 2012: 149,597,870.7 km at 299,792.458 km/s). */
export const LIGHT_SECONDS_PER_AU = 149_597_870.7 / 299_792.458;
const DEG = Math.PI / 180;
const MS_PER_DAY = 86_400_000;
const JD_AT_UNIX_EPOCH = 2_440_587.5;
/** TT − UTC (TDB differs from TT by under 2 ms). */
const TT_MINUS_UTC_MS = 69_184;

export type Vector = [number, number, number];

/** Heliocentric ecliptic position (J2000), AU. */
export function heliocentric(planet: keyof typeof PLANETS, ms: number): Vector {
  const T = ((ms + TT_MINUS_UTC_MS) / MS_PER_DAY + JD_AT_UNIX_EPOCH - 2_451_545) / 36_525;
  const { at2000: p, perCentury: r } = PLANETS[planet];
  const a = p.a + r.a * T;
  const e = p.e + r.e * T;
  const I = (p.I + r.I * T) * DEG;
  const L = p.L + r.L * T;
  const varpi = p.varpi + r.varpi * T;
  const node = (p.node + r.node * T) * DEG;
  const omega = varpi * DEG - node;
  // Mean anomaly in (−π, π], then Kepler's equation by Newton's method.
  const M = ((((L - varpi) % 360) + 540) % 360 - 180) * DEG;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 10; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x1 = a * (Math.cos(E) - e);
  const y1 = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const [cw, sw, cn, sn, ci, si] = [Math.cos(omega), Math.sin(omega), Math.cos(node), Math.sin(node), Math.cos(I), Math.sin(I)];
  return [
    (cw * cn - sw * sn * ci) * x1 + (-sw * cn - cw * sn * ci) * y1,
    (cw * sn + sw * cn * ci) * x1 + (-sw * sn + cw * cn * ci) * y1,
    sw * si * x1 + cw * si * y1,
  ];
}

/** Earth–Mars distance, AU. */
export function earthMarsDistance(ms: number): number {
  const [ex, ey, ez] = heliocentric('earth', ms);
  const [mx, my, mz] = heliocentric('mars', ms);
  return Math.hypot(mx - ex, my - ey, mz - ez);
}

export interface SignalDelay {
  distanceAu: number;
  /** Distance, millions of km. */
  distanceMillionKm: number;
  /** One-way light time, seconds. */
  oneWaySeconds: number;
  /** There and back: the soonest an answer from Earth can arrive, seconds. */
  roundTripSeconds: number;
}

/** How long a signal takes between the habitat and Earth at `ms`. */
export function signalDelay(ms: number): SignalDelay {
  const distanceAu = earthMarsDistance(ms);
  const oneWaySeconds = distanceAu * LIGHT_SECONDS_PER_AU;
  return {
    distanceAu,
    distanceMillionKm: (distanceAu * 149_597_870.7) / 1e6,
    oneWaySeconds,
    roundTripSeconds: 2 * oneWaySeconds,
  };
}

/** "12 min 34 s", "58 s", "5 h 45 min". */
export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s >= 3600) {
    const totalMinutes = Math.round(s / 60);
    return `${Math.floor(totalMinutes / 60)} h ${String(totalMinutes % 60).padStart(2, '0')} min`;
  }
  const m = Math.floor(s / 60);
  return m === 0 ? `${s} s` : `${m} min ${String(s % 60).padStart(2, '0')} s`;
}
