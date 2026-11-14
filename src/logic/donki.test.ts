import { describe, expect, it } from 'vitest';
import sep2017 from '../data/donkiSep2017.json';
import { donkiDate, parseDonki, upcomingMarsArrivals, type DonkiResponses } from './donki';

const events = parseDonki(sep2017 as DonkiResponses);

describe('DONKI', () => {
  it('reads every kind of event, newest first', () => {
    const kinds = new Set(events.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['CME', 'GST', 'IPS', 'SEP']);
    for (let i = 1; i < events.length; i++) expect(events[i - 1]!.time).toBeGreaterThanOrEqual(events[i]!.time);
  });

  it('finds the fast CME of 10 September 2017 and its forecast arrival at Mars', () => {
    const cme = events.find((e) => e.id === '2017-09-10T16:09:00-CME-001')!;
    expect(cme.detail).toMatch(/^2650 km\/s/);
    // Earliest WSA-ENLIL arrival at Mars among the model runs, a glancing blow.
    expect(new Date(cme.marsArrival!).toISOString()).toBe('2017-09-13T22:00:00.000Z');
    expect(cme.marsGlancingBlow).toBe(true);
  });

  it('describes SEPs by instrument and storms by Kp', () => {
    const sep = events.find((e) => e.id === '2017-09-10T16:25:00-SEP-001')!;
    expect(sep.detail).toContain('>100 MeV');
    const gst = events.find((e) => e.id === '2017-09-07T21:00:00-GST-001')!;
    expect(gst.detail).toBe('Kp 8 at Earth');
  });

  it('lists CMEs about to reach Mars', () => {
    const onset = Date.parse('2017-09-10T22:00:00Z');
    const soon = upcomingMarsArrivals(events, onset, 96);
    expect(soon.length).toBeGreaterThan(0);
    expect(soon[0]!.marsArrival).toBe(Date.parse('2017-09-13T22:00:00Z'));
    expect(upcomingMarsArrivals(events, onset, 24)).toEqual([]);
  });

  it('formats dates the way DONKI expects', () => {
    expect(donkiDate(Date.parse('2026-11-15T03:00:00Z'))).toBe('2026-11-15');
  });
});
