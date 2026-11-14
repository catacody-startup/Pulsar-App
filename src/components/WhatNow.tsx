import { NO_ALERTS_TEXT, PLAN_ITEM_LABEL } from '../config/actions';
import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { SOURCES } from '../config/sources';
import type { Alert } from '../logic/alerts';
import { formatMarsClock } from '../logic/marsTime';
import type { PlanItem } from '../logic/plan';
import { STATUS_STYLE } from './status';

interface Props {
  alerts: Alert[];
  next: PlanItem;
}

const ALERT_BORDER = { watch: 'border-l-watch', act: 'border-l-act' } as const;

function AlertCard({ alert }: { alert: Alert }) {
  const style = STATUS_STYLE[alert.status];
  const { action } = alert;
  return (
    <article className={`rounded-lg border border-l-4 bg-slate-900/70 px-4 py-3 ${style.border} ${ALERT_BORDER[alert.status]}`}>
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
          {STATUS_LABEL[alert.status]}
        </span>
        <h3 className="font-semibold text-slate-100">{action.title}</h3>
        <span className="text-xs text-slate-500">{INDICATORS[alert.indicator].label}</span>
      </header>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-200 marker:text-slate-500">
        {action.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {action.sources && (
        <p className="mt-2 text-[11px] text-slate-500">
          Based on: {action.sources.map((id) => SOURCES[id].short).join(' · ')}
        </p>
      )}
    </article>
  );
}

/** The answer to "What do I do now?": one concrete action per alert. */
export function WhatNow({ alerts, next }: Props) {
  return (
    <section aria-labelledby="what-now" className="space-y-2">
      <h2 id="what-now" className="text-xs font-medium uppercase tracking-widest text-slate-400">
        What do I do now?
      </h2>
      {alerts.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-slate-200">
          {NO_ALERTS_TEXT}{' '}
          <span className="text-slate-400">
            Next: {PLAN_ITEM_LABEL[next.kind].toLowerCase()} at {formatMarsClock(next.hour)} LMST.
          </span>
        </p>
      ) : (
        alerts.map((a) => <AlertCard key={a.rule} alert={a} />)
      )}
    </section>
  );
}
