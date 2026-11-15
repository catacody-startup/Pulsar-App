import { ACTIVITY_LABEL } from '../config/indicators';
import { MISSION } from '../config/mission';
import type { Connection } from '../hooks/useHabitat';
import type { SpaceWeather } from '../hooks/useSpaceWeather';
import type { Assessment } from '../logic/assess';
import type { MissionDose } from '../logic/missionDose';
import type { Simulator } from '../logic/simulator';
import type { CheckInAnswers } from '../logic/types';
import { CheckInForm } from './CheckInForm';
import { IndicatorCard } from './IndicatorCard';
import { SpaceWeatherPanel } from './SpaceWeatherPanel';
import { StatusHero } from './StatusHero';
import { Trends } from './Trends';
import { doneClock, WhatNow } from './WhatNow';
import { t } from '../i18n/i18n';

interface Props {
  assessment: Assessment;
  sim: Simulator;
  now: number;
  missionSol: number;
  dose: MissionDose;
  weather: SpaceWeather;
  cmeInHours?: number;
  connection: Connection;
  /** Today's check-in is saved on this device but has not reached the habitat server yet. */
  checkInWaiting: boolean;
  /** Alerts whose action is marked as done: rule → when. */
  done: Record<string, number>;
  /** Who is signed in on this device, if anyone: only the crew member changes their own data. */
  signedInAs: string | null;
  /** Earth–habitat round trip today, seconds. */
  roundTripSeconds: number;
  onSignIn: () => void;
  onDone: (rule: string) => void;
  onUndo: (rule: string) => void;
  onSaveCheckIn: (answers: CheckInAnswers) => void;
  onBack: () => void;
}

/** If every alert that asks to act now is marked as done, when the last one was (local time). */
function actedAt(a: Assessment, done: Record<string, number>): string | undefined {
  const urgent = a.alerts.filter((al) => al.status === 'act');
  if (urgent.length === 0 || urgent.some((al) => done[al.rule] === undefined)) return undefined;
  return doneClock(Math.max(...urgent.map((al) => done[al.rule]!)));
}

/** One crew member: "Am I OK?", "What do I do now?", indicators, check-in and trends. */
export function MemberPage(props: Props) {
  const { assessment: a, sim, now, missionSol, dose, weather, cmeInHours, connection, checkInWaiting, onSaveCheckIn, onBack } = props;
  const { done, onDone, onUndo, signedInAs, onSignIn, roundTripSeconds } = props;
  const mine = signedInAs === a.crew.id;
  const first = a.crew.name.split(' ')[0] ?? a.crew.name;
  return (
    <>
      <p className="text-sm text-slate-400">
        <a
          href="/"
          onClick={(e) => (e.preventDefault(), onBack())}
          className="mr-2 text-sky-400 hover:text-sky-300"
        >
          ← {t('Crew')}
        </a>
        <span className="font-medium text-slate-200">{a.crew.name}</span> · {t(a.crew.role)} · {t(ACTIVITY_LABEL[a.reading.activity])}
      </p>
      <StatusHero overall={a.overall} total={a.indicators.length} actedAt={actedAt(a, done)} />
      {!mine && (
        <p className="rounded-lg border border-dashed border-slate-700 px-4 py-2 text-sm text-slate-300">
          {signedInAs ? t('This is {name}’s panel: only {name} can change it.', { name: first }) : t('Viewing {name}’s panel.', { name: first })}{' '}
          {!signedInAs && (
            <button type="button" onClick={onSignIn} className="text-sky-400 hover:text-sky-300">
              {t('Sign in with your face to answer your check-in and mark your actions as done.')}
            </button>
          )}
        </p>
      )}
      <WhatNow
        alerts={a.alerts}
        next={a.next}
        cmeInHours={cmeInHours}
        done={done}
        canAct={mine}
        roundTripSeconds={roundTripSeconds}
        onDone={onDone}
        onUndo={onUndo}
      />
      <section aria-labelledby="indicators">
        <h2 id="indicators" className="mb-2 text-sm text-slate-400">
          {t('Indicators · vitals update every minute (simulated)')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {a.indicators.map((r) => (
            <IndicatorCard key={r.id} result={r} age={a.crew.age} dose={dose} />
          ))}
          <div className="sm:col-span-2">
            <CheckInForm
              readOnly={!mine}
              name={first}
              key={a.crew.id}
              today={a.todaysCheckIn}
              missionSol={missionSol}
              eastLongitudeDeg={MISSION.site.eastLongitudeDeg}
              connection={connection}
              waiting={checkInWaiting}
              onSave={onSaveCheckIn}
            />
          </div>
        </div>
      </section>
      <SpaceWeatherPanel weather={weather} />
      <Trends key={a.crew.id} sim={sim} now={now} />
    </>
  );
}
