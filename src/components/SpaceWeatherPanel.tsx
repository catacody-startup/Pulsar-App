import { SPACE_WEATHER_LABEL, SPACE_WEATHER_MAX_EVENTS } from '../config/spaceWeather';
import type { SpaceWeather } from '../hooks/useSpaceWeather';

const formatUtc = (ms: number) =>
  `${new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

/** Latest space weather from NASA DONKI, flagging what is headed for Mars. */
export function SpaceWeatherPanel({ weather }: { weather: SpaceWeather }) {
  const events = weather.events.slice(0, SPACE_WEATHER_MAX_EVENTS);
  const subtitle =
    weather.mode === 'replay'
      ? `Replay of September 2017 · clock at ${formatUtc(weather.now)}`
      : weather.status === 'loading'
        ? 'Loading from NASA DONKI…'
        : weather.status === 'error'
          ? 'NASA DONKI is not answering right now; the habitat’s own radiation reading still works.'
          : `Live from NASA DONKI · last 30 days · ${weather.events.length} events`;
  return (
    <section aria-labelledby="space-weather" className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="space-weather" className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Space weather
        </h2>
        <span className="text-[11px] text-slate-500">{subtitle}</span>
      </div>
      {events.length > 0 && (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/60">
          {events.map((e) => {
            const headedForMars = e.marsArrival !== undefined;
            const arrived = headedForMars && e.marsArrival! <= weather.now;
            return (
              <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-sm">
                <span className="w-44 shrink-0 text-xs tabular-nums text-slate-500">{formatUtc(e.time)}</span>
                <span className="font-medium text-slate-200">{SPACE_WEATHER_LABEL[e.kind]}</span>
                <span className="text-slate-400">{e.detail}</span>
                {headedForMars && (
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-300">
                    Mars {arrived ? 'arrival was forecast' : 'arrival forecast'} {formatUtc(e.marsArrival!)}
                    {e.marsGlancingBlow ? ' · glancing blow' : ''}
                  </span>
                )}
                {e.link && (
                  <a href={e.link} target="_blank" rel="noreferrer" className="ml-auto text-xs text-sky-400 hover:text-sky-300">
                    DONKI ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {weather.mode === 'live' && weather.status === 'ok' && events.length === 0 && (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          No events in the last 30 days.
        </p>
      )}
    </section>
  );
}
