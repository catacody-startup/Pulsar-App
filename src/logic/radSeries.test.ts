import { describe, expect, it } from 'vitest';
import { radDoseRateAt, radMean, type RadSeries } from './radSeries';

const series: RadSeries = {
  firstSol: 100,
  binsPerSol: 4,
  values: [
    [10, 12, null, 14],
    [16, null, null, null],
  ],
};

describe('RAD series', () => {
  it('interpolates between bin centers', () => {
    expect(radDoseRateAt(series, 100 + 0.125)).toBe(10); // center of bin 0
    expect(radDoseRateAt(series, 100 + 0.25)).toBe(11); // halfway to bin 1
    expect(radDoseRateAt(series, 100 + 0.875)).toBe(14);
    expect(radDoseRateAt(series, 101 + 0.125)).toBe(16);
  });

  it('fills short gaps with the nearest bin and is null outside the series', () => {
    expect(radDoseRateAt(series, 100 + 0.625)).not.toBeNull();
    expect(radDoseRateAt(series, 90)).toBeNull();
    expect(radDoseRateAt(series, 120)).toBeNull();
  });

  it('averages a range of sols', () => {
    expect(radMean(series, 100, 100)).toBe(12);
    expect(radMean(series, 100, 101)).toBe(13);
  });
});
