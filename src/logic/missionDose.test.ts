import { describe, expect, it } from 'vitest';
import { missionDose } from './missionDose';

const LANDING = Date.parse('2026-05-04T00:00:00Z');
const DAY = 86_400_000;

describe('missionDose', () => {
  it('adds the cruise (1.84 mSv/day) and the surface (0.64 mSv/day)', () => {
    const d = missionDose(LANDING + 100 * DAY, LANDING, 180);
    expect(d.transitMilliSievert).toBeCloseTo(331.2);
    expect(d.surfaceMilliSievert).toBeCloseTo(64);
    expect(d.totalMilliSievert).toBeCloseTo(395.2);
    expect(d.fractionOfCareerLimit).toBeCloseTo(395.2 / 600);
  });

  it('counts no surface dose before landing', () => {
    expect(missionDose(LANDING - DAY, LANDING, 180).surfaceMilliSievert).toBe(0);
  });
});
