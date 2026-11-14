/** Time ranges of the trend charts and how readings are averaged in each. */
export const TREND_RANGES = [
  { id: '24h', label: '24 h', minutes: 24 * 60, bucketMinutes: 10 },
  { id: '7d', label: '7 days', minutes: 7 * 24 * 60, bucketMinutes: 60 },
] as const;

export type TrendRangeId = (typeof TREND_RANGES)[number]['id'];

/**
 * Chart colors for the dark surface (categorical slots 1 and 2 of the
 * reference palette, validated for CVD separation and contrast on #0f172a).
 */
export const CHART_COLORS = {
  series1: '#3987e5',
  series2: '#d95926',
  band: 'rgba(148, 163, 184, 0.14)',
  grid: '#1e293b',
  axisText: '#94a3b8',
  surface: '#0f172a',
} as const;
