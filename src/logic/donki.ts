/**
 * Space weather from NASA DONKI: coronal mass ejections (CME), solar energetic
 * particle events (SEP), geomagnetic storms (GST) and interplanetary shocks (IPS),
 * reduced to what the crew needs, above all whether something is headed for Mars.
 */

export type SpaceWeatherKind = 'CME' | 'SEP' | 'GST' | 'IPS';

export interface SpaceWeatherEvent {
  id: string;
  kind: SpaceWeatherKind;
  /** Start of the event, ms. */
  time: number;
  /** Short description, e.g. "2650 km/s" or "GOES13 >100 MeV". */
  detail: string;
  /** For CMEs: predicted arrival at Mars (WSA-ENLIL model), ms. */
  marsArrival?: number;
  marsGlancingBlow?: boolean;
  link?: string;
}

// Subsets of the DONKI responses that Pulsar reads (live responses have more fields).
interface RawImpact {
  location?: string;
  arrivalTime?: string | null;
  isGlancingBlow?: boolean;
}
interface RawCme {
  activityID: string;
  startTime: string;
  sourceLocation?: string;
  link?: string;
  cmeAnalyses?: { isMostAccurate?: boolean; speed?: number | null; enlilList?: { impactList?: RawImpact[] | null }[] | null }[] | null;
}
interface RawSep {
  sepID: string;
  eventTime: string;
  link?: string;
  instruments?: { displayName: string }[];
}
interface RawGst {
  gstID: string;
  startTime: string;
  link?: string;
  allKpIndex?: { kpIndex: number }[];
}
interface RawIps {
  activityID: string;
  eventTime: string;
  location?: string;
  link?: string;
}

export interface DonkiResponses {
  CME?: RawCme[];
  SEP?: RawSep[];
  GST?: RawGst[];
  IPS?: RawIps[];
}

/** DONKI times look like "2017-09-10T16:09Z". */
export const parseDonkiTime = (text: string): number => Date.parse(text);

function parseCme(c: RawCme): SpaceWeatherEvent {
  const analyses = c.cmeAnalyses ?? [];
  const best = analyses.find((a) => a.isMostAccurate) ?? analyses[0];
  // Earliest predicted arrival at Mars across every model run.
  let marsArrival: number | undefined;
  let marsGlancingBlow: boolean | undefined;
  for (const a of analyses) {
    for (const run of a.enlilList ?? []) {
      for (const impact of run.impactList ?? []) {
        if (!impact.location?.includes('Mars') || !impact.arrivalTime) continue;
        const t = parseDonkiTime(impact.arrivalTime);
        if (marsArrival === undefined || t < marsArrival) {
          marsArrival = t;
          marsGlancingBlow = impact.isGlancingBlow;
        }
      }
    }
  }
  const speed = best?.speed ? `${Math.round(best.speed)} km/s` : 'speed not measured';
  return {
    id: c.activityID,
    kind: 'CME',
    time: parseDonkiTime(c.startTime),
    detail: c.sourceLocation ? `${speed} · from ${c.sourceLocation}` : speed,
    ...(marsArrival !== undefined ? { marsArrival, marsGlancingBlow } : {}),
    link: c.link,
  };
}

const parseSep = (s: RawSep): SpaceWeatherEvent => ({
  id: s.sepID,
  kind: 'SEP',
  time: parseDonkiTime(s.eventTime),
  detail: (s.instruments ?? []).map((i) => i.displayName).join(', ') || 'detected',
  link: s.link,
});

const parseGst = (g: RawGst): SpaceWeatherEvent => {
  const kp = Math.max(0, ...(g.allKpIndex ?? []).map((k) => k.kpIndex));
  return { id: g.gstID, kind: 'GST', time: parseDonkiTime(g.startTime), detail: `Kp ${kp} at Earth`, link: g.link };
};

const parseIps = (i: RawIps): SpaceWeatherEvent => ({
  id: i.activityID,
  kind: 'IPS',
  time: parseDonkiTime(i.eventTime),
  detail: `at ${i.location ?? 'unknown location'}`,
  link: i.link,
});

/** Every event, newest first. */
export function parseDonki(responses: DonkiResponses): SpaceWeatherEvent[] {
  return [
    ...(responses.CME ?? []).map(parseCme),
    ...(responses.SEP ?? []).map(parseSep),
    ...(responses.GST ?? []).map(parseGst),
    ...(responses.IPS ?? []).map(parseIps),
  ].sort((a, b) => b.time - a.time);
}

/** CMEs forecast to reach Mars after `nowMs` and within `hours`, soonest first. */
export function upcomingMarsArrivals(events: readonly SpaceWeatherEvent[], nowMs: number, hours: number): SpaceWeatherEvent[] {
  return events
    .filter((e) => e.marsArrival !== undefined && e.marsArrival > nowMs && e.marsArrival <= nowMs + hours * 3_600_000)
    .sort((a, b) => a.marsArrival! - b.marsArrival!);
}

/** "YYYY-MM-DD" in UTC, as DONKI expects. */
export function donkiDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
