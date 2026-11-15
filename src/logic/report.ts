/**
 * The health report for mission control: what the habitat sends to Earth,
 * as plain content (the PDF is drawn from it in src/report/pdf.ts).
 */
import { ACTION_DONE } from '../config/actions';
import { CREW_SUMMARY, INDICATORS, STATUS_LABEL } from '../config/indicators';
import { MISSION } from '../config/mission';
import { SOURCES, type Source, type SourceId } from '../config/sources';
import { RULES, THRESHOLDS } from '../config/thresholds';
import type { Assessment } from './assess';
import { formatIndicatorValue } from './format';
import { formatMarsClock, localMeanSolarHours, missionSol } from './marsTime';
import type { MissionDose } from './missionDose';
import { formatDuration, type SignalDelay } from './planets';
import type { SolSummary, Status } from './types';
import { dateLocale, t } from '../i18n/i18n';

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
  `${new Date(ms).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })} UTC`;

const REPORT_SOURCES: SourceId[] = ['nasa-std-3001-v1', 'msl-rad-pds', 'donki', 'mars24', 'jpl-approx-pos'];

export function buildReport({ at, crew, sols, done, dose, delay, scenario }: ReportInput): Report {
  // +1 s: a report sent on the hour reads 06:00, not 05:59 (floating point).
  const sol = missionSol(at + 1000, MISSION.landingMs, LON);
  const time = clock(at + 1000);
  const radiation = crew[0]?.indicators.find((r) => r.id === 'radiation');
  const counts = (['act', 'watch', 'ok'] as Status[])
    .map((s) => [s, crew.filter((a) => a.overall.status === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => CREW_SUMMARY[s](n))
    .join(', ');
  return {
    title: t('Pulsar · Crew health report for mission control'),
    subtitle: t('Habitat at {site}, Mars · Sol {sol}, {time} LMST · {utc}', { site: t(MISSION.site.name), sol, time, utc: utc(at) }),
    notes: [
      t('Prototype – not for medical use. Vital signs are simulated; radiation is NASA data (MSL RAD at Gale Crater).'),
      ...(scenario ? [t('Demo scenario in play: {name}.', { name: t(scenario) })] : []),
    ],
    habitat: [
      [t('Crew'), `${crew.length} · ${counts}`],
      [
        t('Radiation'),
        radiation
          ? t('{value} µGy/h ({ratio}× normal) · {status}', {
              value: formatIndicatorValue(radiation),
              ratio: (radiation.ratio ?? 1).toFixed(1),
              status: t(STATUS_LABEL[radiation.status]),
            })
          : '–',
      ],
      [
        t('Mission dose'),
        t('≈ {dose} mSv of the {limit} mSv career limit (cruise + surface)', {
          dose: Math.round(dose.totalMilliSievert),
          limit: THRESHOLDS.radiation.careerLimitMilliSievert,
        }),
      ],
      [
        t('Signal to Earth'),
        t('{time} one way · {km} million km ({au} AU)', {
          time: formatDuration(delay.oneWaySeconds),
          km: Math.round(delay.distanceMillionKm),
          au: delay.distanceAu.toFixed(2),
        }),
      ],
    ],
    crew: crew.map((a) => {
      const marked = done[a.crew.id] ?? {};
      const today = a.todaysCheckIn;
      return {
        name: a.crew.name,
        role: t(a.crew.role),
        status: a.overall.status,
        indicators: a.indicators.map((r) => ({
          label: t(INDICATORS[r.id].label),
          value: `${formatIndicatorValue(r)} ${t(INDICATORS[r.id].unit)}`,
          status: r.status,
          note: t(RULES[r.rule].text),
        })),
        alerts: a.alerts.map((al) => ({
          title: t(al.action.title),
          status: al.status,
          ...(marked[al.rule] !== undefined ? { done: ACTION_DONE.done(clock(marked[al.rule]!)) } : {}),
        })),
        checkIn: today
          ? t('Done at {clock} LMST: mood {mood}, stress {stress}, sleep {sleep}, isolation {isolation} (1–5).', {
              clock: clock(today.t),
              mood: today.mood,
              stress: today.stress,
              sleep: today.sleepQuality,
              isolation: today.isolation,
            })
          : t('Not done yet this sol.'),
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
