import { useMemo, useState } from 'react';
import { INDICATORS } from '../config/indicators';
import { MISSION } from '../config/mission';
import { THRESHOLDS } from '../config/thresholds';
import { CHART_COLORS, TREND_RANGES, type TrendRangeId } from '../config/trends';
import { formatMarsClock, localMeanSolarHours, missionSol } from '../logic/marsTime';
import type { Simulator } from '../logic/simulator';
import { bucketMeans, marsClockTicks, solTicks, stats, type Stats } from '../logic/trends';
import type { VitalsReading } from '../logic/types';
import { LineChart, type LineSeries } from './charts/LineChart';
import { SolBarChart } from './charts/SolBarChart';
import { t } from '../i18n/i18n';

interface Props {
  sim: Simulator;
  now: number;
}

const LON = MISSION.site.eastLongitudeDeg;

function formatTime(t: number): string {
  return `Sol ${missionSol(t, MISSION.landingMs, LON)} · ${formatMarsClock(localMeanSolarHours(t, LON))}`;
}

function Card({ title, note, summary, children }: { title: string; note: string; summary?: string; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 pb-2 pt-3">
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 px-1">
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        <span className="text-[11px] text-slate-500">{note}</span>
      </header>
      {children}
      {summary && <p className="px-1 pt-1 text-[11px] tabular-nums text-slate-400">{summary}</p>}
    </article>
  );
}

const fmt = (digits: number) => (v: number) => v.toFixed(digits);
const summaryOf = (s: Stats | null, unit: string, digits = 0) =>
  s
    ? t('Min {min} · avg {avg} · max {max} {unit}', {
        min: s.min.toFixed(digits),
        avg: s.mean.toFixed(digits),
        max: s.max.toFixed(digits),
        unit: t(unit),
      })
    : undefined;

/** Trends of 24 h or 7 days, each with its normal range marked. */
export function Trends({ sim, now }: Props) {
  const [rangeId, setRangeId] = useState<TrendRangeId>('24h');
  const range = TREND_RANGES.find((r) => r.id === rangeId)!;
  const readings = useMemo(() => sim.recentReadings(now, range.minutes), [sim, now, range.minutes]);
  const sols = useMemo(() => sim.recentSols(now, 7), [sim, now]);

  const from = now - range.minutes * 60_000;
  const xRange: [number, number] = [from, now];
  const xTicks = range.id === '24h' ? marsClockTicks(from, now, 6, LON) : solTicks(from, now, MISSION.landingMs, LON);
  const line = (id: string, label: string, color: string, pick: (r: VitalsReading) => number): LineSeries => ({
    id,
    label,
    color,
    points: bucketMeans(readings, range.bucketMinutes, pick),
  });
  const pickStats = (pick: (r: VitalsReading) => number) => stats(readings.map(pick));
  const hr = THRESHOLDS.heartRate;
  const bp = THRESHOLDS.bloodPressure;
  const rad = THRESHOLDS.radiation;
  const elevated = rad.baselineDoseRate * rad.elevatedFactor;
  const averaged = t('{n}-min averages', { n: range.bucketMinutes });
  const over = t('over the last {range}', { range: t(range.label) });

  const nights = sols.filter((s) => s.nightComplete);
  const days = sols;

  return (
    <section aria-labelledby="trends" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trends" className="text-xs font-medium uppercase tracking-widest text-slate-400">
          {t('Trends')}
        </h2>
        <div role="radiogroup" aria-label={t('Time range')} className="flex rounded-md border border-slate-700 p-0.5 text-sm">
          {TREND_RANGES.map((r) => (
            <button
              key={r.id}
              role="radio"
              aria-checked={r.id === rangeId}
              onClick={() => setRangeId(r.id)}
              className={`rounded px-3 py-1 ${r.id === rangeId ? 'bg-slate-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card
          title={`${t(INDICATORS.heartRate.label)} (${t('bpm')})`}
          note={`${t('Shaded: normal {min}–{max}', { min: hr.normal.min, max: hr.normal.max })} · ${averaged}`}
          summary={summaryOf(pickStats((r) => r.heartRate), 'bpm')}
        >
          <LineChart
            ariaLabel={`${t('Heart rate')} ${over}`}
            series={[line('hr', t('Heart rate'), CHART_COLORS.series1, (r) => r.heartRate)]}
            band={{ from: hr.normal.min, to: hr.normal.max }}
            xRange={xRange}
            xTicks={xTicks}
            formatValue={fmt(0)}
            formatTime={formatTime}
          />
        </Card>
        <Card
          title={`${t(INDICATORS.spo2.label)} (%)`}
          note={`${t('Shaded: normal ≥ {n}%', { n: THRESHOLDS.spo2.hypoxicAtOrBelow + 1 })} · ${averaged}`}
          summary={summaryOf(pickStats((r) => r.spo2), '%')}
        >
          <LineChart
            ariaLabel={`SpO₂ ${over}`}
            series={[line('spo2', 'SpO₂', CHART_COLORS.series1, (r) => r.spo2)]}
            band={{ from: THRESHOLDS.spo2.hypoxicAtOrBelow + 1, to: 100 }}
            refLines={[{ value: THRESHOLDS.spo2.emergencyBelow, label: t('Emergency < {n}%', { n: THRESHOLDS.spo2.emergencyBelow }) }]}
            xRange={xRange}
            xTicks={xTicks}
            formatValue={fmt(0)}
            formatTime={formatTime}
          />
        </Card>
        <Card
          title={`${t(INDICATORS.bloodPressure.label)} (mmHg)`}
          note={averaged}
          summary={(() => {
            const s = pickStats((r) => r.systolic);
            const d = pickStats((r) => r.diastolic);
            return s && d
              ? t('Avg {sys}/{dia} · max {maxSys}/{maxDia} mmHg', {
                  sys: s.mean.toFixed(0),
                  dia: d.mean.toFixed(0),
                  maxSys: s.max,
                  maxDia: d.max,
                })
              : undefined;
          })()}
        >
          <div className="mb-1 flex gap-3 px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: CHART_COLORS.series1 }} /> {t('Systolic')}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: CHART_COLORS.series2 }} /> {t('Diastolic')}
            </span>
          </div>
          <LineChart
            ariaLabel={`${t('Blood pressure')} ${over}`}
            series={[
              line('sys', t('Sys'), CHART_COLORS.series1, (r) => r.systolic),
              line('dia', t('Dia'), CHART_COLORS.series2, (r) => r.diastolic),
            ]}
            refLines={[
              { value: bp.high.systolic, label: `${t('Systolic')} ${bp.high.systolic}` },
              { value: bp.high.diastolic, label: `${t('Diastolic')} ${bp.high.diastolic}` },
            ]}
            xRange={xRange}
            xTicks={xTicks}
            formatValue={fmt(0)}
            formatTime={formatTime}
          />
        </Card>
        <Card
          title={`${t(INDICATORS.radiation.label)} (µGy/h)`}
          note={`${t('Shaded: normal < {n}', { n: elevated.toFixed(1) })} · ${averaged}`}
          summary={summaryOf(pickStats((r) => r.doseRate), 'µGy/h', 1)}
        >
          <LineChart
            ariaLabel={`${t('Radiation dose rate')} ${over}`}
            series={[line('dose', t('Dose rate'), CHART_COLORS.series1, (r) => r.doseRate)]}
            band={{ from: 0, to: elevated }}
            refLines={[{ value: rad.baselineDoseRate * rad.stormFactor, label: t('Shelter ≥ {n}', { n: (rad.baselineDoseRate * rad.stormFactor).toFixed(1) }) }]}
            xRange={xRange}
            xTicks={xTicks}
            formatValue={fmt(0)}
            formatTime={formatTime}
            fromZero
          />
        </Card>
        <Card title={t('Sleep per night (h)')} note={t('Line: {n} h recommended', { n: THRESHOLDS.sleep.recommendedHours })}>
          <SolBarChart
            ariaLabel={t('Hours of sleep per night over the last sols')}
            bars={nights.map((s) => ({ key: String(s.localSol), label: `Sol ${s.missionSol}`, value: s.sleepHours }))}
            refLines={[{ value: THRESHOLDS.sleep.recommendedHours, label: `${THRESHOLDS.sleep.recommendedHours} h` }]}
            formatValue={fmt(1)}
          />
        </Card>
        <Card
          title={t('Exercise per sol (min)')}
          note={t('Lines: prescribed {p}, minimum {m} · today in progress', {
            p: THRESHOLDS.exercise.prescribedMinutes,
            m: THRESHOLDS.exercise.minimumMinutes,
          })}
        >
          <SolBarChart
            ariaLabel={t('Minutes of exercise per sol over the last sols')}
            bars={days.map((s) => ({
              key: String(s.localSol),
              label: s.complete ? `Sol ${s.missionSol}` : t('Today'),
              value: s.exerciseMinutes,
              partial: !s.complete,
            }))}
            refLines={[
              { value: THRESHOLDS.exercise.prescribedMinutes, label: String(THRESHOLDS.exercise.prescribedMinutes) },
              { value: THRESHOLDS.exercise.minimumMinutes, label: String(THRESHOLDS.exercise.minimumMinutes) },
            ]}
            formatValue={fmt(0)}
          />
        </Card>
      </div>
    </section>
  );
}
