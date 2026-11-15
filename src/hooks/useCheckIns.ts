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
 * Check-ins answered in the app, per crew member, kept in this browser for now
 * (the habitat server takes them over next).
 */
export function useCheckIns() {
  const [store, setStore] = useState<Store>(read);
  const save = useCallback((crewId: string, answers: CheckInAnswers, localSol: number, t: number) => {
    const entry: CheckIn = { ...answers, localSol, t, simulated: false };
    setStore((prev) => {
      const list = prev[crewId] ?? [];
      const nextList = [...list.filter((c) => c.localSol !== localSol), entry].sort((a, b) => a.localSol - b.localSol);
      const next = { ...prev, [crewId]: nextList };
      write(next);
      return next;
    });
  }, []);
  return { byCrew: store, save };
}
