import { useMemo } from 'react';
import { CREW, DEFAULT_CREW_ID } from './config/crew';
import { MISSION } from './config/mission';
import { IndicatorCard } from './components/IndicatorCard';
import { StatusHero } from './components/StatusHero';
import { useMinuteClock } from './hooks/useMinuteClock';
import {
  evaluateIndicators,
  EVALUATION_SOLS,
  EVALUATION_WINDOW_MINUTES,
  overallStatus,
} from './logic/indicators';
import { formatMarsClock, localMeanSolarHours } from './logic/marsTime';
import { missionDose } from './logic/missionDose';
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
  const overall = overallStatus(indicators);
  const dose = missionDose(now);
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
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5">
        <p className="text-sm text-slate-400">
          <span className="font-medium text-slate-200">{crew.name}</span> · {crew.role} ·{' '}
          {ACTIVITY_LABEL[reading.activity]}
        </p>
        <StatusHero overall={overall} total={indicators.length} />
        <section aria-labelledby="indicators">
          <h2 id="indicators" className="mb-2 text-sm text-slate-400">
            Indicators · vitals update every minute (simulated)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {indicators.map((r) => (
              <IndicatorCard key={r.id} result={r} age={crew.age} dose={dose} />
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        Prototype – not for medical use.
      </footer>
    </div>
  );
}
