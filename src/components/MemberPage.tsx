import { ACTIVITY_LABEL } from '../config/indicators';
import { MISSION } from '../config/mission';
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
import { WhatNow } from './WhatNow';

interface Props {
  assessment: Assessment;
  sim: Simulator;
  now: number;
  missionSol: number;
  dose: MissionDose;
  weather: SpaceWeather;
  cmeInHours?: number;
  onSaveCheckIn: (answers: CheckInAnswers) => void;
  onBack: () => void;
}

/** One crew member: "Am I OK?", "What do I do now?", indicators, check-in and trends. */
export function MemberPage({ assessment: a, sim, now, missionSol, dose, weather, cmeInHours, onSaveCheckIn, onBack }: Props) {
  return (
    <>
      <p className="text-sm text-slate-400">
        <a
          href="/"
          onClick={(e) => (e.preventDefault(), onBack())}
          className="mr-2 text-sky-400 hover:text-sky-300"
        >
          ← Crew
        </a>
        <span className="font-medium text-slate-200">{a.crew.name}</span> · {a.crew.role} · {ACTIVITY_LABEL[a.reading.activity]}
      </p>
      <StatusHero overall={a.overall} total={a.indicators.length} />
      <WhatNow alerts={a.alerts} next={a.next} cmeInHours={cmeInHours} />
      <section aria-labelledby="indicators">
        <h2 id="indicators" className="mb-2 text-sm text-slate-400">
          Indicators · vitals update every minute (simulated)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {a.indicators.map((r) => (
            <IndicatorCard key={r.id} result={r} age={a.crew.age} dose={dose} />
          ))}
          <div className="sm:col-span-2">
            <CheckInForm
              key={a.crew.id}
              today={a.todaysCheckIn}
              missionSol={missionSol}
              eastLongitudeDeg={MISSION.site.eastLongitudeDeg}
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
