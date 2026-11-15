import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CREW } from '../config/crew';
import { HABITAT_SERVER } from '../config/habitat';
import { ACTION_RULES, applyChanges, emptyHabitat, parseHabitatData, type Change, type HabitatData } from '../logic/habitat';
import type { CheckInAnswers } from '../logic/types';

/** Last data received from the habitat server, to show while offline. */
const CACHE_KEY = 'pulsar.habitat.v1';
/** Changes made on this device that have not reached the habitat server yet. */
const OUTBOX_KEY = 'pulsar.outbox.v1';
/** Check-ins of stage 1, kept only in the browser: replaced by the habitat server. */
const OLD_KEY = 'pulsar.checkins.v1';

const CREW_IDS = CREW.map((c) => c.id);

export type Connection = 'connecting' | 'live' | 'offline';

function read<T>(key: string, parse: (value: unknown) => T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parse(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the change still lives in memory until it is sent.
  }
}

function parseOutbox(value: unknown): Change[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c: unknown): Change[] => {
    const { kind, crewId, checkIn, rule, t } = (c ?? {}) as Record<string, unknown>;
    if (typeof crewId !== 'string' || !CREW_IDS.includes(crewId)) return [];
    if (kind === 'checkIn') {
      const valid = parseHabitatData({ checkIns: { [crewId]: [checkIn] } }, CREW_IDS).checkIns[crewId]?.[0];
      return valid ? [{ kind, crewId, checkIn: valid }] : [];
    }
    if (typeof rule !== 'string' || !ACTION_RULES.includes(rule)) return [];
    if (kind === 'actionDone' && typeof t === 'number') return [{ kind, crewId, rule, t }];
    if (kind === 'actionUndone') return [{ kind, crewId, rule }];
    return [];
  });
}

function send(change: Change): Promise<Response> {
  const json = { 'Content-Type': 'application/json' };
  switch (change.kind) {
    case 'checkIn': {
      const { mood, stress, sleepQuality, isolation, t, localSol } = change.checkIn;
      return fetch(`/api/crew/${change.crewId}/check-ins/${localSol}`, {
        method: 'PUT',
        headers: json,
        body: JSON.stringify({ mood, stress, sleepQuality, isolation, t }),
      });
    }
    case 'actionDone':
      return fetch(`/api/crew/${change.crewId}/actions-done/${change.rule}`, {
        method: 'PUT',
        headers: json,
        body: JSON.stringify({ t: change.t }),
      });
    case 'actionUndone':
      return fetch(`/api/crew/${change.crewId}/actions-done/${change.rule}`, { method: 'DELETE' });
  }
}

/**
 * The crew's data on the habitat server, followed live (server-sent events).
 * Changes made here are applied on screen at once and wait on the device
 * until the server confirms them, so nothing is lost while offline.
 */
export function useHabitat() {
  const [server, setServer] = useState<HabitatData>(() =>
    read(CACHE_KEY, (v) => parseHabitatData(v, CREW_IDS), emptyHabitat()),
  );
  const [outbox, setOutbox] = useState<Change[]>(() => read(OUTBOX_KEY, parseOutbox, []));
  const [connection, setConnection] = useState<Connection>('connecting');
  const outboxRef = useRef(outbox);
  const sending = useRef(false);

  const replaceOutbox = useCallback((next: Change[]) => {
    outboxRef.current = next;
    write(OUTBOX_KEY, next);
    setOutbox(next);
  }, []);

  /** Sends the waiting changes, oldest first; stops at the first one that can't get through. */
  const flush = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      while (outboxRef.current.length > 0) {
        const change = outboxRef.current[0]!;
        const res = await send(change).catch(() => null);
        if (res === null || res.status >= 500 || res.status === 429) break; // try again later
        // Confirmed, or refused for good (e.g. a sol that is long over): it leaves the device.
        if (!res.ok) console.warn('The habitat server refused a change:', res.status, await res.text());
        replaceOutbox(outboxRef.current.filter((c) => c !== change));
      }
    } finally {
      sending.current = false;
    }
  }, [replaceOutbox]);

  // Live updates. EventSource reconnects by itself after a dropped connection,
  // but not after an error response (server down behind the proxy): then we reopen it.
  useEffect(() => {
    try {
      window.localStorage.removeItem(OLD_KEY);
    } catch {
      // Nothing to clean up.
    }
    if (typeof EventSource === 'undefined') {
      setConnection('offline');
      return;
    }
    let source: EventSource;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      source = new EventSource('/api/stream');
      source.addEventListener('habitat', (e) => {
        try {
          const data = parseHabitatData(JSON.parse((e as MessageEvent<string>).data).data, CREW_IDS);
          setServer(data);
          write(CACHE_KEY, data);
          setConnection('live');
          void flush();
        } catch {
          // A malformed event: wait for the next one.
        }
      });
      source.onerror = () => {
        setConnection('offline');
        if (source.readyState === EventSource.CLOSED) {
          retry = setTimeout(open, HABITAT_SERVER.retrySeconds * 1000);
        }
      };
    };
    open();
    return () => {
      clearTimeout(retry);
      source.close();
    };
  }, [flush]);

  // While something is waiting, keep trying.
  useEffect(() => {
    if (outbox.length === 0) return;
    const timer = setInterval(() => void flush(), HABITAT_SERVER.retrySeconds * 1000);
    const online = () => void flush();
    window.addEventListener('online', online);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', online);
    };
  }, [outbox.length, flush]);

  const queue = useCallback(
    (change: Change) => {
      replaceOutbox([...outboxRef.current, change]);
      void flush();
    },
    [flush, replaceOutbox],
  );
  const saveCheckIn = useCallback(
    (crewId: string, answers: CheckInAnswers, localSol: number, t: number) =>
      queue({ kind: 'checkIn', crewId, checkIn: { ...answers, localSol, t, simulated: false } }),
    [queue],
  );
  const markDone = useCallback(
    (crewId: string, rule: string, t: number) => queue({ kind: 'actionDone', crewId, rule, t }),
    [queue],
  );
  const undoDone = useCallback((crewId: string, rule: string) => queue({ kind: 'actionUndone', crewId, rule }), [queue]);

  const data = useMemo(() => applyChanges(server, outbox, HABITAT_SERVER.keepSols), [server, outbox]);
  /** Crew members whose check-in is still waiting on this device. */
  const checkInWaitingFor = useMemo(
    () => new Set(outbox.filter((c) => c.kind === 'checkIn').map((c) => c.crewId)),
    [outbox],
  );

  return { data, connection, waiting: outbox.length, checkInWaitingFor, saveCheckIn, markDone, undoDone };
}
