import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { SOURCES } from '../config/sources';
import { RULES } from '../config/thresholds';
import type { IndicatorResult } from '../logic/indicators';
import type { Status } from '../logic/types';

export const STATUS_DOT: Record<Status, string> = {
  ok: 'bg-ok',
  watch: 'bg-watch',
  act: 'bg-act',
};

const STATUS_BORDER: Record<Status, string> = {
  ok: 'border-slate-800',
  watch: 'border-watch/60',
  act: 'border-act/70',
};

export function formatIndicatorValue(r: IndicatorResult): string {
  switch (r.id) {
    case 'bloodPressure':
      return `${r.value}/${r.value2 ?? '–'}`;
    case 'radiation':
      return r.value.toFixed(1);
    case 'sleep':
      return r.value.toFixed(1);
    default:
      return String(r.value);
  }
}

export function IndicatorTile({ result }: { result: IndicatorResult }) {
  const meta = INDICATORS[result.id];
  const rule = RULES[result.rule];
  return (
    <div className={`rounded-lg border bg-slate-900/60 px-4 py-3 ${STATUS_BORDER[result.status]}`}>
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[result.status]}`} aria-hidden />
        {meta.label}
        <span className="sr-only">: {STATUS_LABEL[result.status]}</span>
      </dt>
      <dd className="mt-1">
        <span className="text-2xl font-semibold tabular-nums">{formatIndicatorValue(result)}</span>
        <span className="ml-1 text-sm text-slate-400">{meta.unit}</span>
        <p className="mt-1 text-xs text-slate-300">{rule.text}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Source: {rule.sources.map((id) => SOURCES[id].short).join(' · ')}
        </p>
      </dd>
    </div>
  );
}
