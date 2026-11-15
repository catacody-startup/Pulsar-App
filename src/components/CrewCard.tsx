import { ACTIVITY_LABEL, STATUS_LABEL } from '../config/indicators';
import type { Assessment } from '../logic/assess';
import { STATUS_STYLE } from './status';
import { doneClock } from './WhatNow';

const LEFT_BORDER = { ok: 'border-l-ok', watch: 'border-l-watch', act: 'border-l-act' } as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface Props {
  assessment: Assessment;
  /** Alerts whose action is marked as done: rule → when. */
  done: Record<string, number>;
  /** The crew member signed in on this device. */
  isYou: boolean;
  /** Where the card leads; without it the card is not a link (mission control). */
  href?: string;
  onOpen?: () => void;
}

/** One crew member on the crew page: how they are, what they are doing and the most urgent alert. */
export function CrewCard({ assessment: a, done, isYou, href, onOpen }: Props) {
  const style = STATUS_STYLE[a.overall.status];
  const r = a.reading;
  const sleep = a.indicators.find((i) => i.id === 'sleep');
  const [first, ...more] = a.alerts;
  const className = `group flex flex-col gap-2 rounded-lg border border-l-4 bg-slate-900/60 px-4 py-3 ${style.border} ${LEFT_BORDER[a.overall.status]}`;
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200"
          aria-hidden
        >
          {initials(a.crew.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-100 group-hover:text-white">
            {a.crew.name}
            {isYou && <span className="ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-medium text-sky-300">You</span>}
          </h3>
          <p className="truncate text-sm text-slate-400">
            {a.crew.role} · {ACTIVITY_LABEL[r.activity]}
          </p>
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${style.chip}`}>
          <span className={`h-2 w-2 rounded-full ${style.dot} ${a.overall.status === 'act' ? 'animate-pulse' : ''}`} aria-hidden />
          {STATUS_LABEL[a.overall.status]}
        </span>
      </div>
      <p className="text-sm text-slate-200">
        {first ? (
          <>
            {first.action.title}
            {done[first.rule] !== undefined && (
              <span className="text-ok"> · ✓ done {doneClock(done[first.rule]!)}</span>
            )}
            {more.length > 0 && <span className="text-slate-400"> · +{more.length} more</span>}
          </>
        ) : (
          <span className="text-slate-300">All {a.indicators.length} indicators in range.</span>
        )}
      </p>
      <p className="flex flex-wrap gap-x-3 text-xs tabular-nums text-slate-400">
        <span>HR {r.heartRate} bpm</span>
        <span>SpO₂ {r.spo2}%</span>
        <span>
          BP {r.systolic}/{r.diastolic}
        </span>
        {sleep && !Number.isNaN(sleep.value) && <span>Slept {sleep.value.toFixed(1)} h</span>}
        <span className={a.todaysCheckIn ? 'text-slate-400' : 'text-slate-500'}>
          {a.todaysCheckIn ? 'Check-in done' : 'Check-in pending'}
        </span>
      </p>
    </>
  );
  if (!href || !onOpen) return <div className={className}>{body}</div>;
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOpen();
      }}
      className={`${className} transition-colors hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500`}
    >
      {body}
    </a>
  );
}
