import { CREW_SUMMARY } from '../config/indicators';
import type { SpaceWeather } from '../hooks/useSpaceWeather';
import type { Assessment } from '../logic/assess';
import type { MissionDose } from '../logic/missionDose';
import type { Status } from '../logic/types';
import type { FeedItem } from '../logic/habitat';
import type { SignalDelay } from '../logic/planets';
import { CrewCard } from './CrewCard';
import { CrewFeed } from './CrewFeed';
import { EarthLink } from './EarthLink';
import { IndicatorCard } from './IndicatorCard';
import { SpaceWeatherPanel } from './SpaceWeatherPanel';
import { HeadsUp } from './WhatNow';

interface Props {
  assessments: Assessment[];
  dose: MissionDose;
  weather: SpaceWeather;
  cmeInHours?: number;
  /** Alerts each crew member marked as done: crew id → rule → when. */
  done: Record<string, Record<string, number>>;
  feed: FeedItem[];
  signedInAs: string | null;
  delay: SignalDelay;
  now: number;
  hrefOf: (crewId: string) => string;
  onOpen: (crewId: string) => void;
}

const ORDER: Status[] = ['act', 'watch', 'ok'];

/** The whole crew at a glance, and the habitat they share. */
export function CrewPage(props: Props) {
  const { assessments, dose, weather, cmeInHours, done, feed, signedInAs, delay, now, hrefOf, onOpen } = props;
  const counts = ORDER.map((s) => [s, assessments.filter((a) => a.overall.status === s).length] as const).filter(
    ([, n]) => n > 0,
  );
  const radiation = assessments[0]?.indicators.find((r) => r.id === 'radiation');
  return (
    <>
      <section aria-labelledby="crew" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="crew" className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Crew
          </h2>
          <p className="text-sm text-slate-300" role="status">
            {counts.map(([s, n]) => CREW_SUMMARY[s](n)).join(' · ')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {assessments.map((a) => (
            <CrewCard
              key={a.crew.id}
              assessment={a}
              done={done[a.crew.id] ?? {}}
              isYou={signedInAs === a.crew.id}
              href={hrefOf(a.crew.id)}
              onOpen={() => onOpen(a.crew.id)}
            />
          ))}
        </div>
        <p className="text-[11px] text-slate-500">Vital signs are simulated; open a crew member to see their indicators, trends and check-in.</p>
      </section>
      {cmeInHours !== undefined && <HeadsUp hours={cmeInHours} />}
      <CrewFeed items={feed} />
      <section aria-labelledby="habitat" className="space-y-2">
        <h2 id="habitat" className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Habitat · shared by the crew
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {radiation && <IndicatorCard result={radiation} age={0} dose={dose} />}
          <EarthLink delay={delay} now={now} />
        </div>
      </section>
      <SpaceWeatherPanel weather={weather} />
    </>
  );
}
