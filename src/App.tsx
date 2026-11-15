import { useMemo } from 'react';
import { SPACE_WEATHER_HEADS_UP } from './config/actions';
import { CREW } from './config/crew';
import { MISSION } from './config/mission';
import { About } from './components/About';
import { CrewPage } from './components/CrewPage';
import { DemoBar } from './components/DemoBar';
import { MemberPage } from './components/MemberPage';
import { useCheckIns } from './hooks/useCheckIns';
import { useMinuteClock } from './hooks/useMinuteClock';
import { usePath } from './hooks/usePath';
import { useScenario } from './hooks/useScenario';
import { useSpaceWeather } from './hooks/useSpaceWeather';
import { assessCrewMember } from './logic/assess';
import { upcomingMarsArrivals } from './logic/donki';
import { formatMarsClock, localMeanSolarHours } from './logic/marsTime';
import { missionDose } from './logic/missionDose';
import { parseRoute, routePath, type Route } from './logic/route';
import { resolveScenario } from './logic/scenarios';
import { createSimulator } from './logic/simulator';

const CREW_IDS = CREW.map((c) => c.id);
/** Calendar and daily plans only: they don't depend on events. */
const calendar = createSimulator({ crew: CREW[0]! });

const NAV: [Route, string][] = [
  [{ page: 'crew' }, 'Crew'],
  [{ page: 'about' }, 'About'],
];

export function App() {
  const now = useMinuteClock();
  const [path, navigate] = usePath();
  const route = parseRoute(path, CREW_IDS);
  const go = (r: Route) => navigate(routePath(r));
  const { scenario, anchorMs, choose } = useScenario();
  const events = useMemo(
    () => resolveScenario(scenario, anchorMs, calendar, MISSION.site.eastLongitudeDeg),
    [scenario, anchorMs],
  );
  const sims = useMemo(() => CREW.map((crew) => createSimulator({ crew, events })), [events]);
  const replay = events.find((e) => e.kind === 'sepReplay');
  const weather = useSpaceWeather(now, replay ? replay.start : null);
  const [cme] = upcomingMarsArrivals(weather.events, weather.now, SPACE_WEATHER_HEADS_UP.withinHours);
  const cmeInHours = cme ? Math.max(1, Math.round((cme.marsArrival! - weather.now) / 3_600_000)) : undefined;
  const { byCrew, save: saveCheckIn } = useCheckIns();

  // Only the crew members on screen are evaluated.
  const shownId = route.page === 'member' ? route.crewId : route.page === 'about' ? 'none' : 'all';
  const shown = useMemo(
    () => (shownId === 'all' ? sims : sims.filter((s) => s.crew.id === shownId)),
    [sims, shownId],
  );
  const assessments = useMemo(
    () => shown.map((sim) => assessCrewMember(sim, now, byCrew[sim.crew.id] ?? [])),
    [shown, now, byCrew],
  );
  const dose = missionDose(now);
  const sol = calendar.missionSolAt(now);
  const clock = formatMarsClock(localMeanSolarHours(now, MISSION.site.eastLongitudeDeg));
  const navPage = route.page === 'member' || route.page === 'notFound' ? 'crew' : route.page;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-800 px-4 py-3">
        <img src="/pulsar.svg" alt="" width={28} height={28} className="h-7 w-7" />
        <h1 className="text-lg font-semibold tracking-tight">
          <a href="/" onClick={(e) => (e.preventDefault(), go({ page: 'crew' }))}>
            Pulsar
          </a>
        </h1>
        <nav className="ml-4 flex gap-3 text-sm" aria-label="Pages">
          {NAV.map(([r, label]) => (
            <a
              key={label}
              href={routePath(r)}
              aria-current={navPage === r.page ? 'page' : undefined}
              onClick={(e) => (e.preventDefault(), go(r))}
              className={navPage === r.page ? 'text-slate-100' : 'text-slate-400 hover:text-slate-200'}
            >
              {label}
            </a>
          ))}
        </nav>
        <p className="ml-auto text-right text-sm tabular-nums text-slate-300">
          Sol {sol} · {clock} <span className="text-slate-500">LMST · {MISSION.site.name}</span>
        </p>
      </header>
      {route.page !== 'about' && <DemoBar scenario={scenario} onChoose={choose} />}
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5">
        {route.page === 'about' && <About />}
        {(route.page === 'crew' || route.page === 'notFound') && (
          <CrewPage
            assessments={assessments}
            dose={dose}
            weather={weather}
            cmeInHours={cmeInHours}
            hrefOf={(crewId) => routePath({ page: 'member', crewId })}
            onOpen={(crewId) => go({ page: 'member', crewId })}
          />
        )}
        {route.page === 'member' && assessments[0] && (
          <MemberPage
            assessment={assessments[0]}
            sim={shown[0]!}
            now={now}
            missionSol={sol}
            dose={dose}
            weather={weather}
            cmeInHours={cmeInHours}
            onSaveCheckIn={(answers) => saveCheckIn(route.crewId, answers, assessments[0]!.localSol, Date.now())}
            onBack={() => go({ page: 'crew' })}
          />
        )}
      </main>
      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        Prototype – not for medical use.
      </footer>
    </div>
  );
}
