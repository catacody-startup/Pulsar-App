import { useMemo } from 'react';
import { CREW, DEFAULT_CREW_ID } from './config/crew';
import { MISSION } from './config/mission';
import { useMinuteClock } from './hooks/useMinuteClock';
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

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>}
      </dd>
    </div>
  );
}

export function App() {
  const now = useMinuteClock();
  const sim = useMemo(() => createSimulator({ crew }), []);
  const reading = sim.readingAt(now);
  const lastSol = useMemo(() => sim.summarizeSol(sim.localSolAt(now) - 1), [sim, now]);
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
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <section>
          <h2 className="text-xl font-semibold">{crew.name}</h2>
          <p className="text-sm text-slate-400">
            {crew.role} · {ACTIVITY_LABEL[reading.activity]}
          </p>
        </section>
        <section aria-labelledby="live">
          <h3 id="live" className="mb-2 text-sm text-slate-400">
            Live readings · one per minute (simulated)
          </h3>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Heart rate" value={reading.heartRate} unit="bpm" />
            <Stat label="SpO₂" value={reading.spo2} unit="%" />
            <Stat label="Blood pressure" value={`${reading.systolic}/${reading.diastolic}`} unit="mmHg" />
            <Stat label="Radiation" value={reading.doseRate.toFixed(1)} unit="µGy/h" />
          </dl>
        </section>
        <section aria-labelledby="last-sol">
          <h3 id="last-sol" className="mb-2 text-sm text-slate-400">
            Last sol · Sol {lastSol.missionSol}
          </h3>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Sleep" value={lastSol.sleepHours.toFixed(1)} unit="h" />
            <Stat label="Exercise" value={lastSol.exerciseMinutes} unit="min" />
            <Stat label="Dose" value={lastSol.doseMilliGray.toFixed(3)} unit="mGy" />
          </dl>
        </section>
      </main>
      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        Prototype – not for medical use.
      </footer>
    </div>
  );
}
