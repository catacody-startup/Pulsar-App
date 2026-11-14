import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CHART_COLORS } from '../../config/trends';
import { niceTicks, yDomain, type Point, type TimeTick } from '../../logic/trends';
import { useWidth } from './useWidth';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: Point[];
}

interface Props {
  series: LineSeries[];
  /** Normal range, drawn as a band behind the lines (the card names it). */
  band?: { from: number; to: number };
  /** Thresholds drawn as hairlines with a label. */
  refLines?: { value: number; label: string }[];
  xRange: [number, number];
  xTicks: TimeTick[];
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  /** Start the y axis at zero (for magnitudes such as dose rate). */
  fromZero?: boolean;
  height?: number;
  ariaLabel: string;
}

const M = { top: 10, right: 44, bottom: 22, left: 36 };

/** Time-series line chart with a normal-range band, crosshair and tooltip. */
export function LineChart({
  series,
  band,
  refLines = [],
  xRange,
  xTicks,
  formatValue,
  formatTime,
  fromZero,
  height = 170,
  ariaLabel,
}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const values = series.flatMap((s) => s.points.map((p) => p.v));
  const keep = [...(band ? [band.from, band.to] : []), ...refLines.map((r) => r.value), ...(fromZero ? [0] : [])];
  let [y0, y1] = yDomain(values, keep);
  if (fromZero) y0 = 0;
  const innerW = Math.max(10, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const x = (t: number) => M.left + ((t - xRange[0]) / (xRange[1] - xRange[0])) * innerW;
  const y = (v: number) => M.top + (1 - (v - y0) / (y1 - y0)) * innerH;
  const yTicks = niceTicks(y0, y1, 4);
  const base = series[0]?.points ?? [];

  const path = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');

  const nearest = (px: number) => {
    if (base.length === 0) return null;
    const t = xRange[0] + ((px - M.left) / innerW) * (xRange[1] - xRange[0]);
    let best = 0;
    for (let i = 1; i < base.length; i++) if (Math.abs(base[i]!.t - t) < Math.abs(base[best]!.t - t)) best = i;
    return best;
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(nearest(e.clientX - rect.left));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (base.length === 0) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = e.key === 'ArrowLeft' ? -1 : 1;
      setHover((h) => Math.min(base.length - 1, Math.max(0, (h ?? base.length - 1) + step)));
    } else if (e.key === 'Escape') setHover(null);
  };

  const hoverT = hover !== null ? base[hover]?.t : undefined;
  const tooltipLeft = hoverT !== undefined ? Math.min(Math.max(x(hoverT) - 70, 0), width - 140) : 0;

  return (
    <div
      ref={ref}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
      onKeyDown={onKey}
      onFocus={() => setHover((h) => h ?? (base.length ? base.length - 1 : null))}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-pan-y">
        {band && (
          <rect
            x={M.left}
            width={innerW}
            y={y(Math.min(band.to, y1))}
            height={Math.max(0, y(Math.max(band.from, y0)) - y(Math.min(band.to, y1)))}
            fill={CHART_COLORS.band}
          />
        )}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + innerW} y1={y(v)} y2={y(v)} stroke={CHART_COLORS.grid} strokeWidth={1} />
            <text x={M.left - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill={CHART_COLORS.axisText}>
              {formatValue(v)}
            </text>
          </g>
        ))}
        {refLines.map((r) => (
          <g key={r.label}>
            <line x1={M.left} x2={M.left + innerW} y1={y(r.value)} y2={y(r.value)} stroke={CHART_COLORS.axisText} strokeOpacity={0.6} strokeWidth={1} />
            <text x={M.left + 4} y={y(r.value) - 4} fontSize={10} fill={CHART_COLORS.axisText}>
              {r.label}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text key={tick.t} x={x(tick.t)} y={height - 6} fontSize={10} textAnchor="middle" fill={CHART_COLORS.axisText}>
            {tick.label}
          </text>
        ))}
        {series.map((s) => (
          <path key={s.id} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) => {
          const last = s.points.at(-1);
          if (!last) return null;
          return (
            <g key={`${s.id}-end`}>
              <circle cx={x(last.t)} cy={y(last.v)} r={4} fill={s.color} stroke={CHART_COLORS.surface} strokeWidth={2} />
              {series.length > 1 && (
                <text x={x(last.t) + 8} y={y(last.v) + 3} fontSize={10} fill={CHART_COLORS.axisText}>
                  {s.label}
                </text>
              )}
            </g>
          );
        })}
        {hoverT !== undefined && (
          <g pointerEvents="none">
            <line x1={x(hoverT)} x2={x(hoverT)} y1={M.top} y2={M.top + innerH} stroke={CHART_COLORS.axisText} strokeWidth={1} />
            {series.map((s) => {
              const p = s.points[hover!];
              return p ? (
                <circle key={s.id} cx={x(p.t)} cy={y(p.v)} r={4} fill={s.color} stroke={CHART_COLORS.surface} strokeWidth={2} />
              ) : null;
            })}
          </g>
        )}
      </svg>
      {hoverT !== undefined && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-[140px] rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1.5 text-xs shadow-lg"
          style={{ left: tooltipLeft }}
        >
          <div className="text-[10px] text-slate-400">{formatTime(hoverT)}</div>
          {series.map((s) => {
            const p = s.points[hover!];
            return p ? (
              <div key={s.id} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
                <span className="font-semibold tabular-nums text-slate-100">{formatValue(p.v)}</span>
                <span className="text-slate-400">{s.label}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
