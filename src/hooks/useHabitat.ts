import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CREW } from '../config/crew';
import { HABITAT_SERVER } from '../config/habitat';
import { ACTION_RULES, applyChanges, emptyHabitat, parseHabitatData, type Change, type HabitatData } from '../logic/habitat';
import type { CheckInAnswers } from '../logic/types';

/** Last data received from the habitat server, to show while offline. */
const CACHE_KEY = 'pulsar.habitat.v1';
/** Changes made on this device that have not reached the habitat server yet. */
const OUTBOX_KEY = 'pulsar.outbox.v2';
/** Outbox of stage 2, without sign-in: those changes would be refused now. */
const OLD_OUTBOX_KEY = 'pulsar.outbox.v1';
/** Check-ins of stage 1, kept only in the browser: replaced by the habitat server. */
const OLD_KEY = 'pulsar.checkins.v1';

const CREW_IDS = CREW.map((c) => c.id);

export type Connection = 'connecting' | 'live' | 'offline';

/** A change waiting on this device, with the sign-in of the crew member who made it. */
interface Pending {
  change: Change;
  token: string;
}

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

function parseChange(c: unknown): Change | null {
  const { kind, crewId, checkIn, rule, t } = (c ?? {}) as Record<string, unknown>;
  if (typeof crewId !== 'string' || !CREW_IDS.includes(crewId)) return null;
  if (kind === 'checkIn') {
    const valid = parseHabitatData({ checkIns: { [crewId]: [checkIn] } }, CREW_IDS).checkIns[crewId]?.[0];
    return valid ? { kind, crewId, checkIn: valid } : null;
  }
  if (typeof rule !== 'string' || !ACTION_RULES.includes(rule)) return null;
  if (kind === 'actionDone' && typeof t === 'number') return { kind, crewId, rule, t };
  if (kind === 'actionUndone') return { kind, crewId, rule };
  return null;
}

function parseOutbox(value: unknown): Pending[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p: unknown): Pending[] => {
    const { change, token } = (p ?? {}) as Record<string, unknown>;
    const valid = parseChange(change);
    return valid && typeof token === 'string' ? [{ change: valid, token }] : [];
  });
}

function send({ change, token }: Pending): Promise<Response> {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  switch (change.kind) {
    case 'checkIn': {
      const { mood, stress, sleepQuality, isolation, t, localSol } = change.checkIn;
      return fetch(`/api/crew/${change.crewId}/check-ins/${localSol}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ mood, stress, sleepQuality, isolation, t }),
      });
    }
    case 'actionDone':
      return fetch(`/api/crew/${change.crewId}/actions-done/${change.rule}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ t: change.t }),
      });
    case 'actionUndone':
      return fetch(`/api/crew/${change.crewId}/actions-done/${change.rule}`, { method: 'DELETE', headers });
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
  const [outbox, setOutbox] = useState<Pending[]>(() => read(OUTBOX_KEY, parseOutbox, []));
  const [connection, setConnection] = useState<Connection>('connecting');
  const outboxRef = useRef(outbox);
  const sending = useRef(false);

  const replaceOutbox = useCallback((next: Pending[]) => {
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
        const pending = outboxRef.current[0]!;
        const res = await send(pending).catch(() => null);
        if (res === null || res.status >= 500 || res.status === 429) break; // try again later
        // Confirmed, or refused for good (a sol long over, a sign-in that ended): it leaves the device.
        if (!res.ok) console.warn('The habitat server refused a change:', res.status, await res.text());
        replaceOutbox(outboxRef.current.filter((p) => p !== pending));
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
      window.localStorage.removeItem(OLD_OUTBOX_KEY);
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
    (change: Change, token: string) => {
      replaceOutbox([...outboxRef.current, { change, token }]);
      void flush();
    },
    [flush, replaceOutbox],
  );
  const saveCheckIn = useCallback(
    (token: string, crewId: string, answers: CheckInAnswers, localSol: number, t: number) =>
      queue({ kind: 'checkIn', crewId, checkIn: { ...answers, localSol, t, simulated: false } }, token),
    [queue],
  );
  const markDone = useCallback(
    (token: string, crewId: string, rule: string, t: number) => queue({ kind: 'actionDone', crewId, rule, t }, token),
    [queue],
  );
  const undoDone = useCallback(
    (token: string, crewId: string, rule: string) => queue({ kind: 'actionUndone', crewId, rule }, token),
    [queue],
  );

  const data = useMemo(
    () => applyChanges(server, outbox.map((p) => p.change), HABITAT_SERVER.keepSols),
    [server, outbox],
  );
  /** Crew members whose check-in is still waiting on this device. */
  const checkInWaitingFor = useMemo(
    () => new Set(outbox.filter((p) => p.change.kind === 'checkIn').map((p) => p.change.crewId)),
    [outbox],
  );

  return { data, connection, waiting: outbox.length, checkInWaitingFor, saveCheckIn, markDone, undoDone };
}
