import { useCallback, useState } from 'react';
import type { CheckIn, CheckInAnswers } from '../logic/types';

const KEY = 'pulsar.checkins.v1';

type Store = Record<string, CheckIn[]>;

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode or storage full: the check-in still counts for this session.
  }
}

/**
 * Check-ins answered in the app, kept in this browser for now
 * (stage 2 moves them to the habitat server).
 */
export function useCheckIns(crewId: string) {
  const [list, setList] = useState<CheckIn[]>(() => read()[crewId] ?? []);
  const save = useCallback(
    (answers: CheckInAnswers, localSol: number, t: number) => {
      const entry: CheckIn = { ...answers, localSol, t, simulated: false };
      setList((prev) => {
        const next = [...prev.filter((c) => c.localSol !== localSol), entry].sort((a, b) => a.localSol - b.localSol);
        write({ ...read(), [crewId]: next });
        return next;
      });
    },
    [crewId],
  );
  return { checkIns: list, save };
}
