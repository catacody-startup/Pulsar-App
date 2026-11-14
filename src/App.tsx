import { useMemo } from 'react';
import { SPACE_WEATHER_HEADS_UP } from './config/actions';
import { CREW, DEFAULT_CREW_ID } from './config/crew';
import { MISSION } from './config/mission';
import { About } from './components/About';
import { CheckInForm } from './components/CheckInForm';
import { DemoBar } from './components/DemoBar';
import { IndicatorCard } from './components/IndicatorCard';
import { SpaceWeatherPanel } from './components/SpaceWeatherPanel';
import { StatusHero } from './components/StatusHero';
import { Trends } from './components/Trends';
import { WhatNow } from './components/WhatNow';
import { useCheckIns } from './hooks/useCheckIns';
import { useMinuteClock } from './hooks/useMinuteClock';
import { usePath } from './hooks/usePath';
import { useScenario } from './hooks/useScenario';
import { useSpaceWeather } from './hooks/useSpaceWeather';
import {
  evaluateIndicators,
  EVALUATION_SOLS,
  EVALUATION_WINDOW_MINUTES,
  overallStatus,
} from './logic/indicators';
import { buildAlerts } from './logic/alerts';
import { mergeCheckIns } from './logic/checkin';
import { upcomingMarsArrivals } from './logic/donki';
import { formatMarsClock, localMeanSolarHours } from './logic/marsTime';
import { missionDose } from './logic/missionDose';
import { nextPlanItem } from './logic/plan';
import { resolveScenario } from './logic/scenarios';
import { createSimulator } from './logic/simulator';
import type { Activity } from './logic/types';

const crew = CREW.find((c) => c.id === DEFAULT_CREW_ID) ?? CREW[0]!;
/** Calendar and daily plans only: they don't depend on events. */
const calendar = createSimulator({ crew });

const ACTIVITY_LABEL: Record<Activity, string> = {
  sleep: 'Asleep',
  rest: 'Resting',
  work: 'Working',
  exercise: 'Exercising',
};

export function App() {
  const now = useMinuteClock();
  const [path, navigate] = usePath();
  const onAbout = path === '/about';
  const { scenario, anchorMs, choose } = useScenario();
  const events = useMemo(
    () => resolveScenario(scenario, anchorMs, calendar, MISSION.site.eastLongitudeDeg),
    [scenario, anchorMs],
  );
  const sim = useMemo(() => createSimulator({ crew, events }), [events]);
  const replay = events.find((e) => e.kind === 'sepReplay');
  const weather = useSpaceWeather(now, replay ? replay.start : null);
  const [cme] = upcomingMarsArrivals(weather.events, weather.now, SPACE_WEATHER_HEADS_UP.withinHours);
  const cmeInHours = cme ? Math.max(1, Math.round((cme.marsArrival! - weather.now) / 3_600_000)) : undefined;
  const recent = useMemo(() => sim.recentReadings(now, EVALUATION_WINDOW_MINUTES), [sim, now]);
  const sols = useMemo(() => sim.recentSols(now, EVALUATION_SOLS), [sim, now]);
  const { checkIns: answered, save: saveCheckIn } = useCheckIns(crew.id);
  const checkIns = useMemo(
    () => mergeCheckIns(sim.pastCheckIns(now, EVALUATION_SOLS), answered),
    [sim, now, answered],
  );
  const indicators = useMemo(() => evaluateIndicators({ crew, recent, sols, checkIns }), [recent, sols, checkIns]);
  const overall = overallStatus(indicators);
  const dose = missionDose(now);
  const reading = recent.at(-1)!;
  const sol = sim.missionSolAt(now);
  const hour = localMeanSolarHours(now, MISSION.site.eastLongitudeDeg);
  const clock = formatMarsClock(hour);
  const alerts = buildAlerts(indicators);
  const today = sim.localSolAt(now);
  const todaysCheckIn = answered.find((c) => c.localSol === today);
  const next = nextPlanItem(hour, sim.solPlan(today), sim.solPlan(today + 1));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <img src="/pulsar.svg" alt="" width={28} height={28} className="h-7 w-7" />
        <h1 className="text-lg font-semibold tracking-tight">
          <a href="/" onClick={(e) => (e.preventDefault(), navigate('/'))}>
            Pulsar
          </a>
        </h1>
        <nav className="ml-4 flex gap-3 text-sm" aria-label="Pages">
          {[
            ['/', 'Dashboard'],
            ['/about', 'About'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              onClick={(e) => (e.preventDefault(), navigate(href!))}
              className={path === href ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'}
            >
              {label}
            </a>
          ))}
        </nav>
        <p className="ml-auto text-right text-sm tabular-nums text-slate-300">
          Sol {sol} · {clock} <span className="text-slate-500">LMST · {MISSION.site.name}</span>
        </p>
      </header>
      {!onAbout && <DemoBar scenario={scenario} onChoose={choose} />}
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5">
        {onAbout ? (
          <About />
        ) : (
          <>
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">{crew.name}</span> · {crew.role} ·{' '}
              {ACTIVITY_LABEL[reading.activity]}
            </p>
            <StatusHero overall={overall} total={indicators.length} />
            <WhatNow alerts={alerts} next={next} cmeInHours={cmeInHours} />
            <section aria-labelledby="indicators">
              <h2 id="indicators" className="mb-2 text-sm text-slate-400">
                Indicators · vitals update every minute (simulated)
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {indicators.map((r) => (
                  <IndicatorCard key={r.id} result={r} age={crew.age} dose={dose} />
                ))}
                <div className="sm:col-span-2">
                  <CheckInForm
                    today={todaysCheckIn}
                    missionSol={sol}
                    eastLongitudeDeg={MISSION.site.eastLongitudeDeg}
                    onSave={(answers) => saveCheckIn(answers, today, Date.now())}
                  />
                </div>
              </div>
            </section>
            <SpaceWeatherPanel weather={weather} />
            <Trends sim={sim} now={now} />
          </>
        )}
      </main>
      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        Prototype – not for medical use.
      </footer>
    </div>
  );
}
