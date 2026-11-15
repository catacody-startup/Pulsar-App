import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { SOURCES } from '../config/sources';
import { RULES, THRESHOLDS } from '../config/thresholds';
import { formatIndicatorValue } from '../logic/format';
import { maxHeartRate, type IndicatorResult } from '../logic/indicators';
import type { MissionDose } from '../logic/missionDose';
import { STATUS_STYLE } from './status';

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
        ? `Max for age ≈ ${Math.round(maxHeartRate(age))} bpm`
        : `Average of the last ${THRESHOLDS.heartRate.windowMinutes} min`;
    case 'spo2':
      return `Average of the last ${THRESHOLDS.spo2.windowMinutes} min`;
    case 'bloodPressure':
      return r.rule.startsWith('bloodPressure.exercise')
        ? 'During exercise'
        : `Resting average of the last ${THRESHOLDS.bloodPressure.windowMinutes} min`;
    case 'radiation':
      return `${(r.ratio ?? 1).toFixed(1)}× normal · Mission dose ≈ ${Math.round(dose.totalMilliSievert)} of ${THRESHOLDS.radiation.careerLimitMilliSievert} mSv career limit`;
    case 'sleep':
      return r.average === undefined ? null : `${THRESHOLDS.sleep.debtNights}-night average: ${r.average.toFixed(1)} h`;
    case 'exercise':
      return `Today so far: ${r.today ?? 0} of ${THRESHOLDS.exercise.prescribedMinutes} min`;
    case 'wellbeing': {
      if (!r.checkIn) return 'Check-in pending';
      const c = r.checkIn;
      const answers = `Mood ${c.mood} · stress ${c.stress} · sleep ${c.sleepQuality} · isolation ${c.isolation}`;
      return r.checkedInToday ? `Today: ${answers}` : `Last sol: ${answers} · today’s pending`;
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
          {meta.label}
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
          {STATUS_LABEL[result.status]}
        </span>
      </header>
      <p className="mt-1">
        <span className="text-3xl font-semibold tabular-nums">{formatIndicatorValue(result)}</span>
        <span className="ml-1 text-sm text-slate-400">{meta.unit}</span>
      </p>
      {extra && <p className="text-xs text-slate-400">{extra}</p>}
      <p className="mt-2 text-sm text-slate-200">{rule.text}</p>
      <p className="mt-auto pt-2 text-[11px] text-slate-500">
        Source: {rule.sources.map((id) => SOURCES[id].short).join(' · ')}
        {'basis' in rule && rule.basis ? <span className="block">{rule.basis}</span> : null}
      </p>
    </article>
  );
}
