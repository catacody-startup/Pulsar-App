import { INDICATORS, OVERALL_ANSWER, STATUS_LABEL } from '../config/indicators';
import type { Overall } from '../logic/indicators';
import { STATUS_STYLE } from './status';

interface Props {
  overall: Overall;
  total: number;
}

/** The answer to "Am I OK?", visible at a glance. */
export function StatusHero({ overall, total }: Props) {
  const style = STATUS_STYLE[overall.status];
  const flagged = overall.flagged.map((r) => INDICATORS[r.id].label.toLowerCase());
  return (
    <section aria-labelledby="am-i-ok" className={`rounded-xl border px-5 py-4 ${style.panel}`}>
      <h2 id="am-i-ok" className="text-xs font-medium uppercase tracking-widest text-slate-400">
        Am I OK?
      </h2>
      <p className={`mt-1 flex items-center gap-3 text-3xl font-bold sm:text-4xl ${style.text}`} role="status">
        <span className={`h-4 w-4 shrink-0 rounded-full ${style.dot} ${overall.status === 'act' ? 'animate-pulse' : ''}`} aria-hidden />
        {STATUS_LABEL[overall.status]}
      </p>
      <p className="mt-2 text-slate-200">{OVERALL_ANSWER[overall.status](flagged, total)}</p>
    </section>
  );
}
