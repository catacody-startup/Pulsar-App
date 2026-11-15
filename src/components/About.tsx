import { INDICATORS, STATUS_LABEL } from '../config/indicators';
import { MISSION } from '../config/mission';
import { DATA_SOURCES } from '../config/about';
import { SOURCES, type SourceId } from '../config/sources';
import { RULES, type Rule } from '../config/thresholds';
import type { IndicatorId } from '../logic/types';
import { STATUS_STYLE } from './status';
import { t } from '../i18n/i18n';



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
        <h2 className="text-2xl font-semibold">{t('About Pulsar')}</h2>
        <p>
          {t(
            'On the way to Mars and on its surface, help from Earth can be up to 20 minutes away, so astronauts have to notice health changes themselves. Pulsar answers two questions on one screen:',
          )}{' '}
          <strong>{t('Am I OK?')}</strong> {t('and')} <strong>{t('What do I do now?')}</strong>
        </p>
        <p>
          {t(
            'It follows a crew of four living in a habitat in {site}, where NASA’s Curiosity rover has measured the radiation since 2012: heart rate, blood oxygen and blood pressure every minute, radiation, sleep, exercise and a daily wellbeing check-in.',
            { site: t(MISSION.site.name) },
          )}{' '}
          {t(
            'A server on the habitat’s network keeps the crew’s data, so every tablet and phone sees the same; each crew member signs in with their face and changes only their own data.',
          )}{' '}
          {t(
            'Each indicator gets a traffic light (all good, attention, act now) from thresholds with a cited source, and each alert comes with concrete steps the crew can take without waiting for Earth.',
          )}{' '}
          {t('Mission control on Earth sees the crew one signal delay late and gets a health report every 6 Mars hours.')}
        </p>
        <p className="rounded-lg border border-watch/50 bg-watch/10 px-4 py-2 text-sm">
          {t('Prototype – not for medical use. Vital signs are simulated; radiation and space weather are real NASA data.')}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('NASA data and documents used')}</h2>
        <ul className="space-y-2">
          {DATA_SOURCES.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
              <a href={`#ref-${d.id}`} className="font-medium text-sky-400 hover:text-sky-300">
                {SOURCES[d.id].short}
              </a>
              <p className="mt-1 text-sm text-slate-300">{t(d.use)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('Every threshold and where it comes from')}</h2>
        <p className="text-sm text-slate-400">
          {t('When a cut-off is Pulsar’s own choice rather than a published value, the table says so.')}
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">{t('Indicator')}</th>
                <th className="px-3 py-2">{t('Status')}</th>
                <th className="px-3 py-2">{t('Rule')}</th>
                <th className="px-3 py-2">{t('Source')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ORDER.flatMap((indicator) =>
                rules
                  .filter((r) => r.indicator === indicator)
                  .map((r, i) => (
                    <tr key={`${indicator}-${r.text}`} className="align-top">
                      <td className="px-3 py-2 text-slate-300">{i === 0 ? t(INDICATORS[indicator].label) : ''}</td>
                      <td className="px-3 py-2">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[r.status].chip}`}>
                          {t(STATUS_LABEL[r.status])}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {t(r.text)}
                        {r.basis && <span className="mt-0.5 block text-xs text-slate-500">{t(r.basis)}</span>}
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
        <h2 className="text-lg font-semibold">{t('References')}</h2>
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
        <h2 className="text-lg font-semibold text-slate-200">{t('Team and license')}</h2>
        <p>
          {t(
            'Built by team CataCody (Uruguay) for the NASA Space Apps Challenge 2026, challenge “Create Health Monitoring Software for Astronauts on Space Missions”, with the help of an AI coding assistant (Claude, by Anthropic).',
          )}
        </p>
        <p>
          {t('Released under the Apache License 2.0. Source code:')}{' '}
          <a href="https://github.com/catacody-startup/Pulsar-App" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300">
            github.com/catacody-startup/Pulsar-App
          </a>
          .
        </p>
      </section>
    </article>
  );
}
