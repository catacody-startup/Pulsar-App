/** Helpers for the trend charts: averaging readings into buckets, clean ticks and Mars-time axes. */
import { localSolDate, missionSol, msAtLocalSolDate, formatMarsClock } from './marsTime';
import type { VitalsReading } from './types';

const MINUTE_MS = 60_000;

export interface Point {
  /** Middle of the bucket, ms. */
  t: number;
  v: number;
}

/**
 * Mean of `pick` per bucket of `bucketMinutes`, aligned to absolute bucket
 * boundaries so a bucket keeps its value as time goes by.
 */
export function bucketMeans(
  readings: readonly VitalsReading[],
  bucketMinutes: number,
  pick: (r: VitalsReading) => number,
): Point[] {
  const size = bucketMinutes * MINUTE_MS;
  const out: Point[] = [];
  let key = Number.NaN;
  let sum = 0;
  let count = 0;
  const flush = () => {
    if (count > 0) out.push({ t: key * size + size / 2, v: sum / count });
  };
  for (const r of readings) {
    const k = Math.floor(r.t / size);
    if (k !== key) {
      flush();
      key = k;
      sum = 0;
      count = 0;
    }
    sum += pick(r);
    count++;
  }
  flush();
  return out;
}

/** Up to ~`count` round tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) return [min];
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  return ticks;
}

/** Y range that holds every value and the reference band, with a little air. */
export function yDomain(values: readonly number[], keepVisible: readonly number[] = []): [number, number] {
  const all = [...values, ...keepVisible].filter(Number.isFinite);
  if (all.length === 0) return [0, 1];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

export interface TimeTick {
  t: number;
  label: string;
}

/** Ticks every `stepHours` of local Mars time (e.g. 06:00, 12:00) inside [from, to]. */
export function marsClockTicks(fromMs: number, toMs: number, stepHours: number, eastLongitudeDeg: number): TimeTick[] {
  const step = stepHours / 24;
  const ticks: TimeTick[] = [];
  const first = Math.ceil(localSolDate(fromMs, eastLongitudeDeg) / step) * step;
  for (let lsd = first; ; lsd += step) {
    const t = msAtLocalSolDate(lsd, eastLongitudeDeg);
    if (t > toMs) break;
    ticks.push({ t, label: formatMarsClock((lsd - Math.floor(lsd + 1e-9)) * 24 + 1e-6) });
  }
  return ticks;
}

/** A tick at the start of every sol inside [from, to], labeled with its mission sol. */
export function solTicks(fromMs: number, toMs: number, landingMs: number, eastLongitudeDeg: number): TimeTick[] {
  const ticks: TimeTick[] = [];
  for (let sol = Math.ceil(localSolDate(fromMs, eastLongitudeDeg)); ; sol++) {
    const t = msAtLocalSolDate(sol, eastLongitudeDeg);
    if (t > toMs) break;
    ticks.push({ t, label: `Sol ${missionSol(t + MINUTE_MS, landingMs, eastLongitudeDeg)}` });
  }
  return ticks;
}

export interface Stats {
  min: number;
  mean: number;
  max: number;
}

export function stats(values: readonly number[]): Stats | null {
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, mean: sum / values.length, max };
}
