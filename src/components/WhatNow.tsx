import { ACTION_DONE, NO_ALERTS_TEXT, PLAN_ITEM_LABEL, SPACE_WEATHER_HEADS_UP } from '../config/actions';
import { MISSION } from '../config/mission';
import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { SOURCES } from '../config/sources';
import type { Alert } from '../logic/alerts';
import { formatMarsClock, localMeanSolarHours } from '../logic/marsTime';
import { formatDuration } from '../logic/planets';
import type { PlanItem } from '../logic/plan';
import { STATUS_STYLE } from './status';
import { t } from '../i18n/i18n';

interface Props {
  alerts: Alert[];
  next: PlanItem;
  /** Hours until a CME forecast by DONKI reaches Mars, if one is coming soon. */
  cmeInHours?: number;
  /** Alerts whose action is marked as done: rule → when. */
  done: Record<string, number>;
  /** Only the crew member, signed in, marks their actions as done. */
  canAct: boolean;
  onDone: (rule: string) => void;
  onUndo: (rule: string) => void;
  /** Earth–habitat round trip today, seconds: the soonest mission control can answer. */
  roundTripSeconds: number;
}

/** Heads-up before a CME forecast by DONKI reaches Mars. */
export function HeadsUp({ hours }: { hours: number }) {
  const h = SPACE_WEATHER_HEADS_UP;
  return (
    <article className="rounded-lg border border-l-4 border-sky-900/70 border-l-sky-500 bg-slate-900/70 px-4 py-3">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-300">{t('Heads-up')}</span>
        <h3 className="font-semibold text-slate-100">{h.title(hours)}</h3>
        <span className="text-xs text-slate-500">{t('Space weather')}</span>
      </header>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200 marker:text-slate-500">
        {h.steps.map((step) => (
          <li key={step}>{t(step)}</li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-slate-500">{t('Based on:')} {h.sources.map((id) => SOURCES[id].short).join(' · ')}</p>
    </article>
  );
}

const ALERT_BORDER = { watch: 'border-l-watch', act: 'border-l-act' } as const;

export const doneClock = (ms: number) => formatMarsClock(localMeanSolarHours(ms, MISSION.site.eastLongitudeDeg));

interface AlertCardProps {
  alert: Alert;
  doneAt?: number;
  canAct: boolean;
  onDone: () => void;
  onUndo: () => void;
}

function AlertCard({ alert, doneAt, canAct, onDone, onUndo }: AlertCardProps) {
  const style = STATUS_STYLE[alert.status];
  const { action } = alert;
  return (
    <article className={`rounded-lg border border-l-4 bg-slate-900/70 px-4 py-3 ${style.border} ${ALERT_BORDER[alert.status]}`}>
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
          {t(STATUS_LABEL[alert.status])}
        </span>
        <h3 className="font-semibold text-slate-100">{t(action.title)}</h3>
        <span className="text-xs text-slate-500">{t(INDICATORS[alert.indicator].label)}</span>
      </header>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200 marker:text-slate-500">
        {action.steps.map((step) => (
          <li key={step}>{t(step)}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {doneAt !== undefined ? (
          <p className="flex items-center gap-2 text-sm text-slate-200">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok/20 text-xs text-ok" aria-hidden>
              ✓
            </span>
            {ACTION_DONE.done(doneClock(doneAt))}
            {canAct && (
              <button type="button" onClick={onUndo} className="text-xs text-slate-400 underline hover:text-slate-200">
                {t(ACTION_DONE.undo)}
              </button>
            )}
          </p>
        ) : !canAct ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-100 hover:border-slate-400 hover:bg-slate-800"
          >
            {t(ACTION_DONE.button)}
          </button>
        )}
        {action.sources && (
          <p className="text-[11px] text-slate-500">{t('Based on:')} {action.sources.map((id) => SOURCES[id].short).join(' · ')}</p>
        )}
      </div>
    </article>
  );
}

/** The answer to "What do I do now?": one concrete action per alert. */
export function WhatNow({ alerts, next, cmeInHours, done, canAct, onDone, onUndo, roundTripSeconds }: Props) {
  return (
    <section aria-labelledby="what-now" className="space-y-2">
      <h2 id="what-now" className="text-xs font-medium uppercase tracking-widest text-slate-400">
        {t('What do I do now?')}
      </h2>
      {alerts.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-slate-200">
          {t(NO_ALERTS_TEXT)}{' '}
          <span className="text-slate-400">
            {t('Next: {item} at {clock} LMST.', { item: t(PLAN_ITEM_LABEL[next.kind]).toLowerCase(), clock: formatMarsClock(next.hour) })}
          </span>
        </p>
      ) : (
        alerts.map((a) => (
          <AlertCard
            key={a.rule}
            alert={a}
            doneAt={done[a.rule]}
            canAct={canAct}
            onDone={() => onDone(a.rule)}
            onUndo={() => onUndo(a.rule)}
          />
        ))
      )}
      {alerts.some((a) => a.status === 'act') && (
        <p className="px-1 text-xs text-slate-400">
          {t(
            'An answer from mission control takes at least {time} today (signal there and back): act now with your crew and the crew medical officer.',
            { time: formatDuration(roundTripSeconds) },
          )}
        </p>
      )}
      {/* After the alerts: a forecast is less urgent than what is happening now. */}
      {cmeInHours !== undefined && <HeadsUp hours={cmeInHours} />}
    </section>
  );
}
