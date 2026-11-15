import { useCallback, useEffect, useState } from 'react';
import { CREW } from '../config/crew';

/** A crew member signed in on this device. */
export interface Session {
  crewId: string;
  token: string;
  expires: number;
  /** Started from the demo control, without a face. */
  demo: boolean;
}

const KEY = 'pulsar.session.v1';

function read(): Session | null {
  try {
    const s = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<Session> | null;
    if (!s || typeof s.token !== 'string' || typeof s.crewId !== 'string' || typeof s.expires !== 'number') return null;
    if (!CREW.some((c) => c.id === s.crewId) || s.expires <= Date.now()) return null;
    return { crewId: s.crewId, token: s.token, expires: s.expires, demo: s.demo === true };
  } catch {
    return null;
  }
}

function write(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private mode: the sign-in lasts while the page is open.
  }
}

const authHeader = (s: Session) => ({ Authorization: `Bearer ${s.token}` });

/** Who is signed in on this device, checked with the habitat server when the app opens. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(read);

  const update = useCallback((next: Session | null) => {
    write(next);
    setSession(next);
  }, []);

  // The server may have ended it (signed out elsewhere, face forgotten, expired).
  useEffect(() => {
    const s = read();
    if (!s) return;
    fetch('/api/session', { headers: authHeader(s) })
      .then((res) => {
        if (res.status === 401) update(null);
      })
      .catch(() => {
        // Offline: keep it; the server checks every change anyway.
      });
  }, [update]);

  // Expire on time, even with the page open.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => update(null), Math.max(0, session.expires - Date.now()));
    return () => clearTimeout(timer);
  }, [session, update]);

  const signOut = useCallback(async () => {
    if (session) await fetch('/api/session', { method: 'DELETE', headers: authHeader(session) }).catch(() => null);
    update(null);
  }, [session, update]);

  const forgetFace = useCallback(async () => {
    if (!session) return false;
    const res = await fetch('/api/face', { method: 'DELETE', headers: authHeader(session) }).catch(() => null);
    if (res?.ok || res?.status === 401) update(null);
    return res?.ok === true;
  }, [session, update]);

  return { session, signIn: update, signOut, forgetFace };
}
