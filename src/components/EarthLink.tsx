import { MISSION_CONTROL } from '../config/earth';
import { MISSION } from '../config/mission';
import { SOURCES } from '../config/sources';
import { formatMarsClock } from '../logic/marsTime';
import { formatDuration, type SignalDelay } from '../logic/planets';
import { reportAt } from '../logic/transmissions';
import { t } from '../i18n/i18n';

/** How far Earth is today, in light time: the soonest mission control can see or answer anything. */
export function EarthLink({ delay, now }: { delay: SignalDelay; now: number }) {
  const last = reportAt(now, MISSION_CONTROL.reportEveryMarsHours, MISSION.site.eastLongitudeDeg);
  const next = reportAt(now, MISSION_CONTROL.reportEveryMarsHours, MISSION.site.eastLongitudeDeg, -1);
  return (
    <article className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <h3 className="text-xs uppercase tracking-wide text-slate-400">{t('Link to Earth')}</h3>
      <p className="mt-1">
        <span className="text-3xl font-semibold tabular-nums">{formatDuration(delay.oneWaySeconds)}</span>
        <span className="ml-1 text-sm text-slate-400">{t('one way')}</span>
      </p>
      <p className="text-xs text-slate-400">
        {t('Round trip {time} · {km} million km ({au} AU)', {
          time: formatDuration(delay.roundTripSeconds),
          km: Math.round(delay.distanceMillionKm),
          au: delay.distanceAu.toFixed(2),
        })}
      </p>
      <p className="mt-2 text-sm text-slate-200">
        {t('Mission control sees the habitat {late} late, and an answer takes at least {trip}: the crew acts on its own first.', {
          late: formatDuration(delay.oneWaySeconds),
          trip: formatDuration(delay.roundTripSeconds),
        })}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {t(
          last.arrivesAt > now
            ? 'Health report to Earth every {every} Mars hours: last sent at {last} LMST (still on its way), next at {next} LMST.'
            : 'Health report to Earth every {every} Mars hours: last sent at {last} LMST, next at {next} LMST.',
          { every: MISSION_CONTROL.reportEveryMarsHours, last: formatMarsClock(last.hour), next: formatMarsClock(next.hour) },
        )}
      </p>
      <p className="mt-auto pt-2 text-[11px] text-slate-500">
        {t('Source:')} {SOURCES['jpl-approx-pos'].short} ({t('planet positions')})
      </p>
    </article>
  );
}
