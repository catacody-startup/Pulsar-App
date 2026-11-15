import { useState, type FormEvent } from 'react';
import { CHECKIN_QUESTIONS } from '../config/checkin';
import type { Connection } from '../hooks/useHabitat';
import { formatMarsClock, localMeanSolarHours } from '../logic/marsTime';
import type { CheckIn, CheckInAnswers } from '../logic/types';
import { t } from '../i18n/i18n';

interface Props {
  /** Today's check-in answered in the app, if any. */
  today?: CheckIn;
  missionSol: number;
  eastLongitudeDeg: number;
  connection: Connection;
  /** Someone else's check-in: shown, not answered. */
  readOnly: boolean;
  /** First name of the crew member. */
  name: string;
  /** The saved check-in has not reached the habitat server yet. */
  waiting: boolean;
  onSave: (answers: CheckInAnswers) => void;
}

type Draft = Partial<CheckInAnswers>;

/** Daily wellbeing check-in: four questions, 1 to 5. */
export function CheckInForm({ today, missionSol, eastLongitudeDeg, connection, readOnly, name, waiting, onSave }: Props) {
  const where =
    connection === 'live'
      ? t('Saved on the habitat server: every device sees it.')
      : t('No habitat server right now: it stays on this device and is sent when the server is back.');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const complete = CHECKIN_QUESTIONS.every((q) => draft[q.id] !== undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    onSave(draft as CheckInAnswers);
    setEditing(false);
  };

  if (readOnly) {
    return (
      <section aria-labelledby="checkin" className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
        <h3 id="checkin" className="text-xs uppercase tracking-wide text-slate-400">
          {t('Daily check-in · Sol {sol}', { sol: missionSol })}
        </h3>
        <p className="mt-2 text-sm text-slate-200">
          {today
            ? t('{name} did it at {clock} LMST.', { name, clock: formatMarsClock(localMeanSolarHours(today.t, eastLongitudeDeg)) })
            : t('{name} has not done it yet.', { name })}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">{t('Only {name}, signed in, can answer it.', { name })}</p>
      </section>
    );
  }

  if (today && !editing) {
    return (
      <section aria-labelledby="checkin" className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
        <h3 id="checkin" className="text-xs uppercase tracking-wide text-slate-400">
          {t('Daily check-in · Sol {sol}', { sol: missionSol })}
        </h3>
        <p className="mt-2 text-sm text-slate-200">
          {t('Done at {clock} LMST. Thanks — see you tomorrow.', { clock: formatMarsClock(localMeanSolarHours(today.t, eastLongitudeDeg)) })}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {waiting ? t('Waiting on this device to reach the habitat server.') : t('On the habitat server: every device sees it.')}
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft({ mood: today.mood, stress: today.stress, sleepQuality: today.sleepQuality, isolation: today.isolation });
            setEditing(true);
          }}
          className="mt-2 text-sm text-sky-400 hover:text-sky-300"
        >
          {t('Change answers')}
        </button>
      </section>
    );
  }

  return (
    <form aria-labelledby="checkin" onSubmit={submit} className="rounded-lg border border-sky-900/70 bg-slate-900/60 px-4 py-3">
      <h3 id="checkin" className="text-xs uppercase tracking-wide text-slate-400">
        {t('Daily check-in · Sol {sol} · under a minute', { sol: missionSol })}
      </h3>
      <div className="mt-2 space-y-3">
        {CHECKIN_QUESTIONS.map((q) => (
          <fieldset key={q.id}>
            <legend className="text-sm text-slate-200">{t(q.question)}</legend>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-20 text-right text-[11px] text-slate-500">{t(q.low)}</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((v) => {
                  const checked = draft[q.id] === v;
                  return (
                    <label
                      key={v}
                      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border text-sm tabular-nums focus-within:ring-2 focus-within:ring-sky-500/60 ${
                        checked ? 'border-sky-500 bg-sky-500/20 text-slate-50' : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={v}
                        checked={checked}
                        onChange={() => setDraft((d) => ({ ...d, [q.id]: v }))}
                        className="sr-only"
                      />
                      {v}
                    </label>
                  );
                })}
              </div>
              <span className="w-20 text-[11px] text-slate-500">{t(q.high)}</span>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={!complete}
          className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('Save check-in')}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-400 hover:text-slate-200">
            {t('Cancel')}
          </button>
        )}
        <span className="text-[11px] text-slate-500">{where}</span>
      </div>
    </form>
  );
}
