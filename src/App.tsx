import { useCallback, useMemo } from 'react';
import { SPACE_WEATHER_HEADS_UP } from './config/actions';
import { CREW, crewMember } from './config/crew';
import { MISSION } from './config/mission';
import { About } from './components/About';
import { CrewPage } from './components/CrewPage';
import { DemoBar } from './components/DemoBar';
import { EarthPage } from './components/EarthPage';
import { ReportButton } from './components/ReportButton';
import { MemberPage } from './components/MemberPage';
import { HabitatStatus } from './components/HabitatStatus';
import { SignInPage } from './components/SignInPage';
import { useHabitat } from './hooks/useHabitat';
import { useSession } from './hooks/useSession';
import { useMinuteClock } from './hooks/useMinuteClock';
import { usePath } from './hooks/usePath';
import { useScenario } from './hooks/useScenario';
import { useSpaceWeather } from './hooks/useSpaceWeather';
import { assessCrewMember } from './logic/assess';
import { upcomingMarsArrivals } from './logic/donki';
import { crewFeed, currentActionsDone, habitatAsOf } from './logic/habitat';
import { formatMarsClock, localMeanSolarHours, SOL_IN_EARTH_DAYS } from './logic/marsTime';
import { missionDose } from './logic/missionDose';
import { signalDelay } from './logic/planets';
import { buildReport } from './logic/report';
import { parseRoute, routePath, type Route } from './logic/route';
import { resolveScenario } from './logic/scenarios';
import { createSimulator } from './logic/simulator';

const CREW_IDS = CREW.map((c) => c.id);
/** Calendar and daily plans only: they don't depend on events. */
const calendar = createSimulator({ crew: CREW[0]! });

const NAV: [Route, string][] = [
  [{ page: 'crew' }, 'Crew'],
  [{ page: 'earth' }, 'Mission control'],
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
  const habitat = useHabitat();
  const { session, signIn, signOut, forgetFace } = useSession();
  const me = session ? crewMember(session.crewId) : undefined;
  const byCrew = habitat.data.checkIns;

  // Only the crew members on screen are evaluated.
  const shownId =
    route.page === 'member' ? route.crewId : route.page === 'crew' || route.page === 'notFound' ? 'all' : 'none';
  const shown = useMemo(
    () => (shownId === 'all' ? sims : sims.filter((s) => s.crew.id === shownId)),
    [sims, shownId],
  );
  const assessments = useMemo(
    () => shown.map((sim) => assessCrewMember(sim, now, byCrew[sim.crew.id] ?? [])),
    [shown, now, byCrew],
  );
  const done = useMemo(
    () => Object.fromEntries(CREW_IDS.map((id) => [id, currentActionsDone(habitat.data, id, now)])),
    [habitat.data, now],
  );
  const feed = useMemo(
    () => crewFeed(habitat.data, now - SOL_IN_EARTH_DAYS * 86_400_000, now + 60_000).slice(0, 6),
    [habitat.data, now],
  );
  const dose = missionDose(now);
  const delay = useMemo(() => signalDelay(now), [now]);
  /** The crew as it was at `t`, with the habitat data of then (mission control, reports). */
  const crewAt = useCallback(
    (t: number) => {
      const then = habitatAsOf(habitat.data, t);
      return sims.map((sim) => assessCrewMember(sim, t, then.checkIns[sim.crew.id] ?? []));
    },
    [sims, habitat.data],
  );
  const doneAt = useCallback(
    (t: number) => {
      const then = habitatAsOf(habitat.data, t);
      return Object.fromEntries(CREW_IDS.map((id) => [id, currentActionsDone(then, id, t)]));
    },
    [habitat.data],
  );
  /** The health report for mission control as it was at `t`. */
  const reportAt = useCallback(
    (t: number) =>
      buildReport({
        at: t,
        crew: crewAt(t),
        sols: Object.fromEntries(sims.map((sim) => [sim.crew.id, sim.recentSols(t, 8).slice(0, -1)])),
        done: doneAt(t),
        dose: missionDose(t),
        delay: signalDelay(t),
        ...(scenario.events.length > 0 ? { scenario: scenario.label } : {}),
      }),
    [crewAt, doneAt, sims, scenario],
  );
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
        {session && me ? (
          <a
            href={routePath({ page: 'signIn' })}
            onClick={(e) => (e.preventDefault(), go({ page: 'signIn' }))}
            className="ml-2 flex items-center gap-1.5 rounded-full border border-slate-700 py-0.5 pl-0.5 pr-2.5 text-sm text-slate-200 hover:border-slate-500"
            title="Signed in on this device"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/25 text-[11px] font-semibold text-sky-200" aria-hidden>
              {me.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </span>
            {me.name.split(' ')[0]}
          </a>
        ) : (
          <a
            href={routePath({ page: 'signIn' })}
            aria-current={route.page === 'signIn' ? 'page' : undefined}
            onClick={(e) => (e.preventDefault(), go({ page: 'signIn' }))}
            className="ml-2 rounded-full border border-sky-700 px-3 py-0.5 text-sm text-sky-300 hover:border-sky-500 hover:text-sky-200"
          >
            Sign in
          </a>
        )}
        <div className="ml-auto flex flex-col items-end">
          <p className="text-right text-sm tabular-nums text-slate-300">
            Sol {sol} · {clock} <span className="text-slate-500">LMST · {MISSION.site.name}</span>
          </p>
          <HabitatStatus connection={habitat.connection} waiting={habitat.waiting} />
        </div>
      </header>
      {route.page !== 'about' && route.page !== 'signIn' && <DemoBar scenario={scenario} onChoose={choose} />}
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5">
        {route.page === 'about' && <About />}
        {route.page === 'earth' && (
          <EarthPage
            now={now}
            delay={delay}
            crewAt={crewAt}
            doneAt={doneAt}
            reportButton={(r) => (
              <ReportButton
                make={() => reportAt(r.sentAt)}
                label="PDF"
                className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              />
            )}
          />
        )}
        {route.page === 'signIn' && (
          <SignInPage
            session={session}
            onSignedIn={signIn}
            onSignOut={() => void signOut()}
            onForgetFace={forgetFace}
            onGoToPanel={(crewId) => go({ page: 'member', crewId })}
          />
        )}
        {(route.page === 'crew' || route.page === 'notFound') && (
          <CrewPage
            assessments={assessments}
            dose={dose}
            weather={weather}
            cmeInHours={cmeInHours}
            done={done}
            feed={feed}
            signedInAs={session?.crewId ?? null}
            delay={delay}
            now={now}
            reportButton={<ReportButton make={() => reportAt(Date.now())} label="Health report for mission control (PDF)" />}
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
            connection={habitat.connection}
            checkInWaiting={habitat.checkInWaitingFor.has(route.crewId)}
            done={done[route.crewId] ?? {}}
            signedInAs={session?.crewId ?? null}
            roundTripSeconds={delay.roundTripSeconds}
            onSignIn={() => go({ page: 'signIn' })}
            onDone={(rule) => session && habitat.markDone(session.token, route.crewId, rule, Date.now())}
            onUndo={(rule) => session && habitat.undoDone(session.token, route.crewId, rule)}
            onSaveCheckIn={(answers) =>
              session && habitat.saveCheckIn(session.token, route.crewId, answers, assessments[0]!.localSol, Date.now())
            }
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
