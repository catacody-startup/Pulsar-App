import { useState } from 'react';
import { CHART_COLORS } from '../../config/trends';
import { niceTicks } from '../../logic/trends';
import { useWidth } from './useWidth';

export interface SolBar {
  key: string;
  label: string;
  value: number;
  /** Still in progress (today): drawn lighter. */
  partial?: boolean;
}

interface Props {
  bars: SolBar[];
  /** Reference lines; their short label sits in the right margin. */
  refLines?: { value: number; label: string }[];
  formatValue: (v: number) => string;
  height?: number;
  ariaLabel: string;
}

const M = { top: 16, right: 30, bottom: 22, left: 36 };
const BAR_MAX = 24;

/** Path of a bar with a 4px rounded top and a square base. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** One column per sol, with reference lines and a tooltip per bar. */
export function SolBarChart({ bars, refLines = [], formatValue, height = 170, ariaLabel }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value), ...refLines.map((r) => r.value)) * 1.12;
  const innerW = Math.max(10, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const slot = innerW / Math.max(1, bars.length);
  const barW = Math.min(BAR_MAX, slot * 0.6);
  const y = (v: number) => M.top + (1 - v / max) * innerH;
  const yTicks = niceTicks(0, max, 4);
  const hovered = hover !== null ? bars[hover] : undefined;

  return (
    <div ref={ref} className="relative" role="img" aria-label={ariaLabel}>
      <svg width={width} height={height} className="block" onPointerLeave={() => setHover(null)}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={M.left + innerW} y1={y(v)} y2={y(v)} stroke={CHART_COLORS.grid} strokeWidth={1} />
            <text x={M.left - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill={CHART_COLORS.axisText}>
              {formatValue(v)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = M.left + slot * (i + 0.5);
          const top = y(b.value);
          return (
            <g
              key={b.key}
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              {/* Hit area bigger than the bar. */}
              <rect x={cx - slot / 2} y={M.top} width={slot} height={innerH} fill="transparent" />
              {b.value > 0 && (
                <path
                  d={barPath(cx - barW / 2, top, barW, M.top + innerH - top)}
                  fill={CHART_COLORS.series1}
                  fillOpacity={b.partial ? 0.45 : hover === i ? 1 : 0.9}
                />
              )}
              <text x={cx} y={top - 4} fontSize={10} textAnchor="middle" fill={CHART_COLORS.axisText}>
                {formatValue(b.value)}
              </text>
              <text x={cx} y={height - 6} fontSize={10} textAnchor="middle" fill={CHART_COLORS.axisText}>
                {b.label}
              </text>
            </g>
          );
        })}
        {refLines.map((r) => (
          <g key={r.label} pointerEvents="none">
            <line x1={M.left} x2={M.left + innerW} y1={y(r.value)} y2={y(r.value)} stroke={CHART_COLORS.axisText} strokeOpacity={0.7} strokeWidth={1} />
            <text x={M.left + innerW + 4} y={y(r.value) + 3} fontSize={10} fill={CHART_COLORS.axisText}>
              {r.label}
            </text>
          </g>
        ))}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(M.left + slot * (hover! + 0.5) - 60, 0), width - 120) }}
        >
          <span className="font-semibold tabular-nums text-slate-100">{formatValue(hovered.value)}</span>{' '}
          <span className="text-slate-400">
            {hovered.label}
            {hovered.partial ? ' (so far)' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
