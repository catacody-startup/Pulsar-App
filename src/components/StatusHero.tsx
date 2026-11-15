import { INDICATORS, OVERALL_ANSWER, STATUS_LABEL } from '../config/indicators';
import type { Overall } from '../logic/indicators';
import { STATUS_STYLE } from './status';
import { t } from '../i18n/i18n';

interface Props {
  overall: Overall;
  total: number;
  /** When the crew member marked as done the last action of the alerts that ask to act now, if all are done. */
  actedAt?: string;
}

/** The answer to "Am I OK?", visible at a glance. */
export function StatusHero({ overall, total, actedAt }: Props) {
  const style = STATUS_STYLE[overall.status];
  const flagged = overall.flagged.map((r) => t(INDICATORS[r.id].inSentence));
  return (
    <section aria-labelledby="am-i-ok" className={`rounded-xl border px-5 py-4 ${style.panel}`}>
      <h2 id="am-i-ok" className="text-xs font-medium uppercase tracking-widest text-slate-400">
        {t('Am I OK?')}
      </h2>
      <p className={`mt-1 flex items-center gap-3 text-3xl font-bold sm:text-4xl ${style.text}`} role="status">
        <span className={`h-4 w-4 shrink-0 rounded-full ${style.dot} ${overall.status === 'act' ? 'animate-pulse' : ''}`} aria-hidden />
        {t(STATUS_LABEL[overall.status])}
      </p>
      <p className="mt-2 text-slate-200">{OVERALL_ANSWER[overall.status](flagged, total)}</p>
      {actedAt && overall.status !== 'ok' && (
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok/20 text-xs text-ok" aria-hidden>
            ✓
          </span>
          {t('Action marked as done at {clock} LMST. Keep at it until the readings are back in range.', { clock: actedAt })}
        </p>
      )}
    </section>
  );
}
