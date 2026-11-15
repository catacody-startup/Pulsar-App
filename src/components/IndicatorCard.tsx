import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { SOURCES } from '../config/sources';
import { RULES, THRESHOLDS } from '../config/thresholds';
import { formatIndicatorValue } from '../logic/format';
import { maxHeartRate, type IndicatorResult } from '../logic/indicators';
import type { MissionDose } from '../logic/missionDose';
import { STATUS_STYLE } from './status';
import { t } from '../i18n/i18n';

interface Props {
  result: IndicatorResult;
  age: number;
  dose: MissionDose;
}

/** Extra context under the value, specific to each indicator. */
function detail({ result: r, age, dose }: Props): string | null {
  switch (r.id) {
    case 'heartRate':
      return r.rule === 'heartRate.exercise' || r.rule === 'heartRate.nearMax'
        ? t('Max for age ≈ {max} bpm', { max: Math.round(maxHeartRate(age)) })
        : t('Average of the last {n} min', { n: THRESHOLDS.heartRate.windowMinutes });
    case 'spo2':
      return t('Average of the last {n} min', { n: THRESHOLDS.spo2.windowMinutes });
    case 'bloodPressure':
      return r.rule.startsWith('bloodPressure.exercise')
        ? t('During exercise')
        : t('Resting average of the last {n} min', { n: THRESHOLDS.bloodPressure.windowMinutes });
    case 'radiation':
      return t('{ratio}× normal · Mission dose ≈ {dose} of {limit} mSv career limit', {
        ratio: (r.ratio ?? 1).toFixed(1),
        dose: Math.round(dose.totalMilliSievert),
        limit: THRESHOLDS.radiation.careerLimitMilliSievert,
      });
    case 'sleep':
      return r.average === undefined
        ? null
        : t('{n}-night average: {avg} h', { n: THRESHOLDS.sleep.debtNights, avg: r.average.toFixed(1) });
    case 'exercise':
      return t('Today so far: {n} of {target} min', { n: r.today ?? 0, target: THRESHOLDS.exercise.prescribedMinutes });
    case 'wellbeing': {
      if (!r.checkIn) return t('Check-in pending');
      const c = r.checkIn;
      const answers = t('Mood {mood} · stress {stress} · sleep {sleep} · isolation {isolation}', {
        mood: c.mood,
        stress: c.stress,
        sleep: c.sleepQuality,
        isolation: c.isolation,
      });
      return r.checkedInToday ? t('Today: {answers}', { answers }) : t('Last sol: {answers} · today’s pending', { answers });
    }
  }
}

export function IndicatorCard(props: Props) {
  const { result } = props;
  const meta = INDICATORS[result.id];
  const rule = RULES[result.rule];
  const style = STATUS_STYLE[result.status];
  const extra = detail(props);
  return (
    <article className={`flex flex-col rounded-lg border bg-slate-900/60 px-4 py-3 ${style.border}`}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden />
          {t(meta.label)}
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
          {t(STATUS_LABEL[result.status])}
        </span>
      </header>
      <p className="mt-1">
        <span className="text-3xl font-semibold tabular-nums">{formatIndicatorValue(result)}</span>
        <span className="ml-1 text-sm text-slate-400">{t(meta.unit)}</span>
      </p>
      {extra && <p className="text-xs text-slate-400">{extra}</p>}
      <p className="mt-2 text-sm text-slate-200">{t(rule.text)}</p>
      <p className="mt-auto pt-2 text-[11px] text-slate-500">
        {t('Source:')} {rule.sources.map((id) => SOURCES[id].short).join(' · ')}
        {'basis' in rule && rule.basis ? <span className="block">{t(rule.basis)}</span> : null}
      </p>
    </article>
  );
}
