import { useMemo } from 'react';
import { CREW, DEFAULT_CREW_ID } from './config/crew';
import { MISSION } from './config/mission';
import { IndicatorTile } from './components/IndicatorTile';
import { useMinuteClock } from './hooks/useMinuteClock';
import { evaluateIndicators, EVALUATION_SOLS, EVALUATION_WINDOW_MINUTES } from './logic/indicators';
import { formatMarsClock, localMeanSolarHours } from './logic/marsTime';
import { createSimulator } from './logic/simulator';
import type { Activity } from './logic/types';

const crew = CREW.find((c) => c.id === DEFAULT_CREW_ID) ?? CREW[0]!;

const ACTIVITY_LABEL: Record<Activity, string> = {
  sleep: 'Asleep',
  rest: 'Resting',
  work: 'Working',
  exercise: 'Exercising',
};

export function App() {
  const now = useMinuteClock();
  const sim = useMemo(() => createSimulator({ crew }), []);
  const recent = useMemo(() => sim.recentReadings(now, EVALUATION_WINDOW_MINUTES), [sim, now]);
  const sols = useMemo(() => sim.recentSols(now, EVALUATION_SOLS), [sim, now]);
  const indicators = useMemo(() => evaluateIndicators({ crew, recent, sols }), [recent, sols]);
  const reading = recent.at(-1)!;
  const sol = sim.missionSolAt(now);
  const clock = formatMarsClock(localMeanSolarHours(now, MISSION.site.eastLongitudeDeg));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <img src="/pulsar.svg" alt="" width={28} height={28} className="h-7 w-7" />
        <h1 className="text-lg font-semibold tracking-tight">Pulsar</h1>
        <p className="ml-auto text-right text-sm tabular-nums text-slate-300">
          Sol {sol} · {clock} <span className="text-slate-500">LMST · {MISSION.site.name}</span>
        </p>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        <section>
          <h2 className="text-xl font-semibold">{crew.name}</h2>
          <p className="text-sm text-slate-400">
            {crew.role} · {ACTIVITY_LABEL[reading.activity]}
          </p>
        </section>
        <section aria-labelledby="indicators">
          <h3 id="indicators" className="mb-2 text-sm text-slate-400">
            Indicators · vitals update every minute (simulated)
          </h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {indicators.map((r) => (
              <IndicatorTile key={r.id} result={r} />
            ))}
          </dl>
        </section>
      </main>
      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        Prototype – not for medical use.
      </footer>
    </div>
  );
}
