/**
 * The health report for mission control: what the habitat sends to Earth,
 * as plain content (the PDF is drawn from it in src/report/pdf.ts).
 */
import { ACTION_DONE } from '../config/actions';
import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { MISSION } from '../config/mission';
import { SOURCES, type Source, type SourceId } from '../config/sources';
import { RULES, THRESHOLDS } from '../config/thresholds';
import type { Assessment } from './assess';
import { formatIndicatorValue } from './format';
import { formatMarsClock, localMeanSolarHours, missionSol } from './marsTime';
import type { MissionDose } from './missionDose';
import { formatDuration, type SignalDelay } from './planets';
import type { SolSummary, Status } from './types';

export interface ReportInput {
  /** When the report is made (sent), ms. */
  at: number;
  /** The crew assessed at `at`. */
  crew: Assessment[];
  /** Past sols of each crew member, oldest first (complete sols only). */
  sols: Record<string, SolSummary[]>;
  /** Alerts each crew member had marked as done: rule → when. */
  done: Record<string, Record<string, number>>;
  dose: MissionDose;
  delay: SignalDelay;
  /** Label of the demo scenario in play, if not the normal sol. */
  scenario?: string;
}

export interface ReportIndicator {
  label: string;
  value: string;
  status: Status;
  note: string;
}

export interface ReportCrewMember {
  name: string;
  role: string;
  status: Status;
  indicators: ReportIndicator[];
  alerts: { title: string; status: Status; done?: string }[];
  checkIn: string;
  sols: { sol: number; sleepHours: number; exerciseMinutes: number }[];
}

export interface Report {
  title: string;
  /** Where and when. */
  subtitle: string;
  notes: string[];
  habitat: [string, string][];
  crew: ReportCrewMember[];
  sources: string[];
  fileName: string;
}

const LON = MISSION.site.eastLongitudeDeg;
const clock = (ms: number) => formatMarsClock(localMeanSolarHours(ms, LON));
const utc = (ms: number) =>
  `${new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

const REPORT_SOURCES: SourceId[] = ['nasa-std-3001-v1', 'msl-rad-pds', 'donki', 'mars24', 'jpl-approx-pos'];

export function buildReport({ at, crew, sols, done, dose, delay, scenario }: ReportInput): Report {
  const sol = missionSol(at, MISSION.landingMs, LON);
  const time = clock(at);
  const radiation = crew[0]?.indicators.find((r) => r.id === 'radiation');
  const counts = (['act', 'watch', 'ok'] as Status[])
    .map((s) => [s, crew.filter((a) => a.overall.status === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${STATUS_LABEL[s].toLowerCase()}`)
    .join(', ');
  return {
    title: 'Pulsar · Crew health report for mission control',
    subtitle: `Habitat at ${MISSION.site.name}, Mars · Sol ${sol}, ${time} LMST · ${utc(at)}`,
    notes: [
      'Prototype – not for medical use. Vital signs are simulated; radiation is NASA data (MSL RAD at Gale Crater).',
      ...(scenario ? [`Demo scenario in play: ${scenario}.`] : []),
    ],
    habitat: [
      ['Crew', `${crew.length} · ${counts}`],
      [
        'Radiation',
        radiation
          ? `${formatIndicatorValue(radiation)} µGy/h (${(radiation.ratio ?? 1).toFixed(1)}× normal) · ${STATUS_LABEL[radiation.status]}`
          : '–',
      ],
      [
        'Mission dose',
        `≈ ${Math.round(dose.totalMilliSievert)} mSv of the ${THRESHOLDS.radiation.careerLimitMilliSievert} mSv career limit (cruise + surface)`,
      ],
      [
        'Signal to Earth',
        `${formatDuration(delay.oneWaySeconds)} one way · ${Math.round(delay.distanceMillionKm)} million km (${delay.distanceAu.toFixed(2)} AU)`,
      ],
    ],
    crew: crew.map((a) => {
      const marked = done[a.crew.id] ?? {};
      const today = a.todaysCheckIn;
      return {
        name: a.crew.name,
        role: a.crew.role,
        status: a.overall.status,
        indicators: a.indicators.map((r) => ({
          label: INDICATORS[r.id].label,
          value: `${formatIndicatorValue(r)} ${INDICATORS[r.id].unit}`,
          status: r.status,
          note: RULES[r.rule].text,
        })),
        alerts: a.alerts.map((al) => ({
          title: al.action.title,
          status: al.status,
          ...(marked[al.rule] !== undefined ? { done: ACTION_DONE.done(clock(marked[al.rule]!)) } : {}),
        })),
        checkIn: today
          ? `Done at ${clock(today.t)} LMST: mood ${today.mood}, stress ${today.stress}, sleep ${today.sleepQuality}, isolation ${today.isolation} (1–5).`
          : 'Not done yet this sol.',
        sols: (sols[a.crew.id] ?? []).map((s) => ({ sol: s.missionSol, sleepHours: s.sleepHours, exerciseMinutes: s.exerciseMinutes })),
      };
    }),
    sources: REPORT_SOURCES.map((id) => {
      const s: Source = SOURCES[id];
      return `${s.short}: ${s.url ?? s.title}`;
    }),
    fileName: `pulsar-report-sol${sol}-${time.replace(':', '')}.pdf`,
  };
}
