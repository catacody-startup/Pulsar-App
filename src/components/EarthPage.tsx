import { useMemo } from 'react';
import { CREW_SUMMARY } from '../config/indicators';
import { MISSION_CONTROL } from '../config/earth';
import { MISSION } from '../config/mission';
import type { Assessment } from '../logic/assess';
import { formatMarsClock, localMeanSolarHours, missionSol } from '../logic/marsTime';
import { formatDuration, type SignalDelay } from '../logic/planets';
import { reportSchedule, type Transmission } from '../logic/transmissions';
import type { Status } from '../logic/types';
import { CrewCard } from './CrewCard';

interface Props {
  now: number;
  delay: SignalDelay;
  /** The crew as mission control knows it at `t`: what had happened on Mars one signal delay earlier. */
  crewAt: (t: number) => Assessment[];
  /** Alerts each crew member had marked as done at `t`. */
  doneAt: (t: number) => Record<string, Record<string, number>>;
  /** Report download, when available. */
  reportButton?: (report: Transmission) => React.ReactNode;
}

const LON = MISSION.site.eastLongitudeDeg;
const ORDER: Status[] = ['act', 'watch', 'ok'];

export const formatUtc = (ms: number) =>
  `${new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

const marsTime = (ms: number) =>
  `Sol ${missionSol(ms, MISSION.landingMs, LON)} · ${formatMarsClock(localMeanSolarHours(ms, LON))} LMST`;

const summary = (crew: Assessment[]) =>
  ORDER.map((s) => [s, crew.filter((a) => a.overall.status === s).length] as const)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => CREW_SUMMARY[s](n))
    .join(' · ');

const inMinutes = (ms: number) => formatDuration(Math.max(0, ms / 1000));

/** Mission control on Earth: the crew one signal delay late, and the habitat's periodic reports. */
export function EarthPage({ now, delay, crewAt, doneAt, reportButton }: Props) {
  const oneWayMs = delay.oneWaySeconds * 1000;
  const seenAt = now - oneWayMs;
  const crew = useMemo(() => crewAt(seenAt), [crewAt, seenAt]);
  const done = useMemo(() => doneAt(seenAt), [doneAt, seenAt]);
  const schedule = useMemo(
    () => reportSchedule(now, MISSION_CONTROL.reportEveryMarsHours, LON, MISSION_CONTROL.reportsShown),
    [now],
  );
  const reports = useMemo(() => schedule.received.map((r) => ({ r, crew: crewAt(r.sentAt) })), [schedule, crewAt]);

  return (
    <>
      <section aria-labelledby="earth" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="earth" className="text-xl font-semibold">
            Mission control · Earth
          </h2>
          <p className="text-sm tabular-nums text-slate-300">{formatUtc(now)}</p>
        </div>
        <div className="rounded-lg border border-l-4 border-sky-900/70 border-l-sky-500 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          <p>
            You see the habitat as it was <strong>{formatDuration(delay.oneWaySeconds)} ago</strong> ({marsTime(seenAt)}):
            that is how long its signal takes to cross {Math.round(delay.distanceMillionKm)} million km today.
          </p>
          <p className="mt-1 text-slate-400">
            A message sent now reaches the crew at {formatUtc(now + oneWayMs)}; their answer is back at{' '}
            {formatUtc(now + 2 * oneWayMs)} at the earliest.
          </p>
        </div>
      </section>

      <section aria-labelledby="earth-crew" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="earth-crew" className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Crew · as received
          </h2>
          <p className="text-sm text-slate-300">{summary(crew)}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {crew.map((a) => (
            <CrewCard key={a.crew.id} assessment={a} done={done[a.crew.id] ?? {}} isYou={false} />
          ))}
        </div>
      </section>

      <section aria-labelledby="reports" className="space-y-2">
        <h2 id="reports" className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Health reports from the habitat · every {MISSION_CONTROL.reportEveryMarsHours} Mars hours
        </h2>
        <ul className="space-y-1 text-sm text-slate-300">
          {schedule.inTransit && (
            <li>
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" aria-hidden />
              Report of {marsTime(schedule.inTransit.sentAt)} is on its way: arrives at {formatUtc(schedule.inTransit.arrivesAt)}{' '}
              (in {inMinutes(schedule.inTransit.arrivesAt - now)}).
            </li>
          )}
          <li className="text-slate-400">
            Next report leaves the habitat at {marsTime(schedule.next.sentAt)} (in {inMinutes(schedule.next.sentAt - now)}).
          </li>
        </ul>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-slate-900 text-xs text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Report</th>
                <th className="px-3 py-2 font-medium">Sent</th>
                <th className="px-3 py-2 font-medium">Received</th>
                <th className="px-3 py-2 font-medium">Crew</th>
                {reportButton && <th className="px-3 py-2 font-medium" aria-label="Download" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60">
              {reports.map(({ r, crew: c }) => (
                <tr key={r.sentAt}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">{marsTime(r.sentAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-400">{formatUtc(r.sentAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-400">{formatUtc(r.arrivesAt)}</td>
                  <td className="px-3 py-2 text-slate-200">{summary(c)}</td>
                  {reportButton && <td className="px-3 py-2 text-right">{reportButton(r)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">
          Alerts that need action reach mission control with the live data, one signal delay late; reports bring the whole
          picture of each crew member at a fixed time.
        </p>
      </section>
    </>
  );
}
