import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { MISSION } from '../config/mission';
import { RAD_BACKGROUND_DOSE_RATE, RAD_REPLAY } from '../config/radiation';
import { SOURCES, type SourceId } from '../config/sources';
import { RULES, type Rule } from '../config/thresholds';
import type { IndicatorId } from '../logic/types';
import { STATUS_STYLE } from './status';

const DATA_SOURCES: { id: SourceId; use: string }[] = [
  {
    id: 'msl-rad-pds',
    use: `Radiation in the habitat: the dose rate Curiosity measured at Gale Crater. Each habitat sol replays one of the quiet sols ${RAD_REPLAY.quietSols.from}–${RAD_REPLAY.quietSols.to} at the same local time (background ≈ ${RAD_BACKGROUND_DOSE_RATE.toFixed(1)} µGy/h), and the “Solar storm” scenario replays the solar particle event of 10 September 2017.`,
  },
  {
    id: 'donki',
    use: 'Space weather: CMEs (with WSA-ENLIL arrival forecasts at Mars), solar energetic particles, geomagnetic storms and shocks of the last 30 days, live through the Pulsar server, which keeps the NASA API key. DONKI’s record of September 2017 goes with the storm replay.',
  },
  {
    id: 'nasa-std-3001-v1',
    use: 'Crew health standards behind the thresholds and actions, through NASA’s technical briefs on radiation, atmosphere, sleep, exercise and behavioral health.',
  },
  { id: 'hrr', use: 'The spaceflight health risks each indicator tracks.' },
  { id: 'mars24', use: 'Mars time: mission sol and local mean solar time at Gale Crater.' },
];

const ORDER: IndicatorId[] = ['heartRate', 'spo2', 'bloodPressure', 'radiation', 'sleep', 'exercise', 'wellbeing'];

function Sources({ ids }: { ids: SourceId[] }) {
  return (
    <>
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ' · '}
          <a href={`#ref-${id}`} className="text-sky-400 hover:text-sky-300">
            {SOURCES[id].short}
          </a>
        </span>
      ))}
    </>
  );
}

/** What Pulsar is, the NASA data it uses, every threshold with its source, and references. */
export function About() {
  const rules = Object.values(RULES) as Rule[];
  return (
    <article className="space-y-8 text-slate-200">
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">About Pulsar</h2>
        <p>
          On the way to Mars and on its surface, help from Earth can be up to 20 minutes away, so astronauts have to notice
          health changes themselves. Pulsar answers two questions on one screen: <strong>Am I OK?</strong> and{' '}
          <strong>What do I do now?</strong>
        </p>
        <p>
          It follows a crew member living in a habitat in {MISSION.site.name}, where NASA’s Curiosity rover has measured the
          radiation since 2012: heart rate, blood oxygen and blood pressure every minute, radiation, sleep, exercise and a
          daily wellbeing check-in. Each indicator gets a traffic light (all good, attention, act now) from thresholds with a
          cited source, and each alert comes with concrete steps the crew can take without waiting for Earth.
        </p>
        <p className="rounded-lg border border-watch/50 bg-watch/10 px-4 py-2 text-sm">
          Prototype – not for medical use. Vital signs are simulated; radiation and space weather are real NASA data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">NASA data and documents used</h2>
        <ul className="space-y-2">
          {DATA_SOURCES.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
              <a href={`#ref-${d.id}`} className="font-medium text-sky-400 hover:text-sky-300">
                {SOURCES[d.id].short}
              </a>
              <p className="mt-1 text-sm text-slate-300">{d.use}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Every threshold and where it comes from</h2>
        <p className="text-sm text-slate-400">
          When a cut-off is Pulsar’s own choice rather than a published value, the table says so.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Indicator</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ORDER.flatMap((indicator) =>
                rules
                  .filter((r) => r.indicator === indicator)
                  .map((r, i) => (
                    <tr key={`${indicator}-${r.text}`} className="align-top">
                      <td className="px-3 py-2 text-slate-300">{i === 0 ? INDICATORS[indicator].label : ''}</td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[r.status].chip}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.text}
                        {r.basis && <span className="mt-0.5 block text-xs text-slate-500">{r.basis}</span>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <Sources ids={r.sources} />
                      </td>
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">References</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {(Object.keys(SOURCES) as SourceId[]).map((id) => {
            const s = SOURCES[id];
            return (
              <li key={id} id={`ref-${id}`} className="scroll-mt-20">
                <span className="text-slate-200">{s.title}</span>
                {'url' in s && s.url && (
                  <>
                    {' '}
                    <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-sky-400 hover:text-sky-300">
                      {s.url}
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-2 text-sm text-slate-400">
        <h2 className="text-lg font-semibold text-slate-200">Team and license</h2>
        <p>
          Built by team CataCody (Uruguay) for the NASA Space Apps Challenge 2026, challenge “Create Health Monitoring
          Software for Astronauts on Space Missions”, with the help of an AI coding assistant (Claude, by Anthropic).
        </p>
        <p>
          Released under the Apache License 2.0. Source code:{' '}
          <a href="https://github.com/catacody-startup/Pulsar-App" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300">
            github.com/catacody-startup/Pulsar-App
          </a>
          .
        </p>
      </section>
    </article>
  );
}
