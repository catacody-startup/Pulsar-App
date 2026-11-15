/** Face enrollments and sign-in sessions of the habitat server. Never sent to devices. */
import { createHash, randomBytes } from 'node:crypto';
import { FACE } from '../src/config/face';
import { emptyHabitat, parseHabitatData, type HabitatData } from '../src/logic/habitat';

export interface FaceEnrollment {
  /** One descriptor per picture taken when enrolling. */
  descriptors: number[][];
  enrolledAt: number;
  /** Last sign-in; the face is forgotten `enrollmentTtlHours` after it. */
  lastUsed: number;
}

export interface Session {
  crewId: string;
  expires: number;
  /** Started from the demo control, without a face. */
  demo?: boolean;
}

/** Everything the server keeps: the habitat data (public) and faces and sessions (private). */
export interface ServerState {
  habitat: HabitatData;
  faces: Record<string, FaceEnrollment>;
  /** By SHA-256 of the token: a copy of the file does not give anyone a session. */
  sessions: Record<string, Session>;
}

const HOUR = 3_600_000;

export function emptyState(): ServerState {
  return { habitat: emptyHabitat(), faces: {}, sessions: {} };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A descriptor: `descriptorLength` finite numbers of a sane size, or null. */
export function parseDescriptor(value: unknown, length = FACE.descriptorLength): number[] | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  return value.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 10) ? (value as number[]) : null;
}

/** State read from the file. Files from before faces existed hold only the habitat data. */
export function parseState(value: unknown, crewIds: readonly string[]): ServerState {
  if (!isObject(value) || !('habitat' in value)) return { ...emptyState(), habitat: parseHabitatData(value, crewIds) };
  const state = { ...emptyState(), habitat: parseHabitatData(value.habitat, crewIds) };
  const faces = isObject(value.faces) ? value.faces : {};
  for (const id of crewIds) {
    const f = faces[id];
    if (!isObject(f) || !Array.isArray(f.descriptors) || typeof f.enrolledAt !== 'number' || typeof f.lastUsed !== 'number') continue;
    const descriptors = f.descriptors.map((d) => parseDescriptor(d)).filter((d): d is number[] => d !== null);
    if (descriptors.length > 0) state.faces[id] = { descriptors, enrolledAt: f.enrolledAt, lastUsed: f.lastUsed };
  }
  const sessions = isObject(value.sessions) ? value.sessions : {};
  for (const [hash, s] of Object.entries(sessions)) {
    if (isObject(s) && typeof s.crewId === 'string' && crewIds.includes(s.crewId) && typeof s.expires === 'number') {
      state.sessions[hash] = { crewId: s.crewId, expires: s.expires, ...(s.demo === true ? { demo: true } : {}) };
    }
  }
  return state;
}

export function distance(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(sum);
}

/** Drops faces unused for too long and expired sessions. */
export function prune(state: ServerState, now: number, config = FACE): ServerState {
  const faces = Object.fromEntries(
    Object.entries(state.faces).filter(([, f]) => now - f.lastUsed < config.enrollmentTtlHours * HOUR),
  );
  const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([, s]) => s.expires > now));
  return { ...state, faces, sessions };
}

/** The enrolled crew member closest to `descriptor`, if closer than the match distance. */
export function bestMatch(
  faces: ServerState['faces'],
  descriptor: readonly number[],
  config = FACE,
): { crewId: string; distance: number } | null {
  let best: { crewId: string; distance: number } | null = null;
  for (const [crewId, f] of Object.entries(faces)) {
    for (const d of f.descriptors) {
      const dist = distance(d, descriptor);
      if (dist < config.matchDistance && (!best || dist < best.distance)) best = { crewId, distance: dist };
    }
  }
  return best;
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function newSession(crewId: string, now: number, demo = false, config = FACE) {
  const token = randomBytes(32).toString('base64url');
  const session: Session = { crewId, expires: now + config.sessionHours * HOUR, ...(demo ? { demo: true } : {}) };
  return { token, hash: hashToken(token), session };
}
