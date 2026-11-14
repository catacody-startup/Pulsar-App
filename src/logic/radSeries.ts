/**
 * Dose rate measured by Curiosity's RAD at Gale Crater, by Curiosity sol and
 * local time, from the half-hour series built by scripts/rad/build.mjs.
 */

export interface RadSeries {
  firstSol: number;
  binsPerSol: number;
  /** values[sol - firstSol][bin], µGy/h; null where RAD has no data. */
  values: (number | null)[][];
}

/** Value of a bin, or the nearest bin with data within `maxGap` bins (or null). */
function binValue(series: RadSeries, index: number, maxGap = 6): number | null {
  const total = series.values.length * series.binsPerSol;
  const at = (i: number) =>
    i < 0 || i >= total ? null : (series.values[Math.floor(i / series.binsPerSol)]?.[i % series.binsPerSol] ?? null);
  for (let d = 0; d <= maxGap; d++) {
    const v = at(index - d) ?? at(index + d);
    if (v !== null) return v;
  }
  return null;
}

/**
 * Dose rate at a Curiosity local sol date (sol + fraction of sol), linearly
 * interpolated between the centers of the half-hour bins. Null outside the series.
 */
export function radDoseRateAt(series: RadSeries, curiositySolDate: number): number | null {
  const position = (curiositySolDate - series.firstSol) * series.binsPerSol - 0.5;
  const i = Math.floor(position);
  const f = position - i;
  const a = binValue(series, i);
  const b = binValue(series, i + 1);
  if (a === null) return b;
  if (b === null) return a;
  return a + (b - a) * f;
}

/** Mean of every value of the sols in [fromSol, toSol]. */
export function radMean(series: RadSeries, fromSol: number, toSol: number): number {
  let sum = 0;
  let count = 0;
  for (let sol = fromSol; sol <= toSol; sol++) {
    for (const v of series.values[sol - series.firstSol] ?? []) {
      if (v !== null) {
        sum += v;
        count++;
      }
    }
  }
  return count ? sum / count : Number.NaN;
}
