import { MISSION_CONTROL } from '../config/earth';
import { MISSION } from '../config/mission';
import { SOURCES } from '../config/sources';
import { formatMarsClock } from '../logic/marsTime';
import { formatDuration, type SignalDelay } from '../logic/planets';
import { reportAt } from '../logic/transmissions';

/** How far Earth is today, in light time: the soonest mission control can see or answer anything. */
export function EarthLink({ delay, now }: { delay: SignalDelay; now: number }) {
  const last = reportAt(now, MISSION_CONTROL.reportEveryMarsHours, MISSION.site.eastLongitudeDeg);
  const next = reportAt(now, MISSION_CONTROL.reportEveryMarsHours, MISSION.site.eastLongitudeDeg, -1);
  return (
    <article className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <h3 className="text-xs uppercase tracking-wide text-slate-400">Link to Earth</h3>
      <p className="mt-1">
        <span className="text-3xl font-semibold tabular-nums">{formatDuration(delay.oneWaySeconds)}</span>
        <span className="ml-1 text-sm text-slate-400">one way</span>
      </p>
      <p className="text-xs text-slate-400">
        Round trip {formatDuration(delay.roundTripSeconds)} · {Math.round(delay.distanceMillionKm)} million km (
        {delay.distanceAu.toFixed(2)} AU)
      </p>
      <p className="mt-2 text-sm text-slate-200">
        Mission control sees the habitat {formatDuration(delay.oneWaySeconds)} late, and an answer takes at least{' '}
        {formatDuration(delay.roundTripSeconds)}: the crew acts on its own first.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Health report to Earth every {MISSION_CONTROL.reportEveryMarsHours} Mars hours: last sent at {formatMarsClock(last.hour)}{' '}
        LMST{last.arrivesAt > now ? ' (still on its way)' : ''}, next at {formatMarsClock(next.hour)} LMST.
      </p>
      <p className="mt-auto pt-2 text-[11px] text-slate-500">Source: {SOURCES['jpl-approx-pos'].short} (planet positions)</p>
    </article>
  );
}
