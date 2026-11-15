/**
 * The data the habitat server keeps, and the changes devices send to it.
 * Shared by the server and the app: the app shows the server's data with its
 * own waiting changes applied on top, so it works the same while offline.
 */
import { CHECKIN_QUESTIONS } from '../config/checkin';
import type { CheckIn, CheckInAnswers } from './types';

export interface HabitatData {
  /** Check-ins answered in the app, per crew member, oldest first. */
  checkIns: Record<string, CheckIn[]>;
}

/** A change made on a device, waiting to reach the habitat server or already applied. */
export type Change = { kind: 'checkIn'; crewId: string; checkIn: CheckIn };

export function emptyHabitat(): HabitatData {
  return { checkIns: {} };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The four answers, each an integer from 1 to 5, or null if anything is off. */
export function parseAnswers(value: unknown): CheckInAnswers | null {
  if (!isObject(value)) return null;
  const out: Partial<CheckInAnswers> = {};
  for (const q of CHECKIN_QUESTIONS) {
    const v = value[q.id];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) return null;
    out[q.id] = v;
  }
  return out as CheckInAnswers;
}

function parseCheckIn(value: unknown): CheckIn | null {
  const answers = parseAnswers(value);
  if (!answers || !isObject(value)) return null;
  const { localSol, t } = value;
  if (typeof localSol !== 'number' || !Number.isInteger(localSol) || typeof t !== 'number' || !Number.isFinite(t)) {
    return null;
  }
  return { ...answers, localSol, t, simulated: false };
}

/** Habitat data read from a file or the network: anything malformed or of an unknown crew member is dropped. */
export function parseHabitatData(value: unknown, crewIds: readonly string[]): HabitatData {
  const data = emptyHabitat();
  if (!isObject(value) || !isObject(value.checkIns)) return data;
  for (const id of crewIds) {
    const list = value.checkIns[id];
    if (!Array.isArray(list)) continue;
    const valid = list.map(parseCheckIn).filter((c): c is CheckIn => c !== null);
    if (valid.length > 0) data.checkIns[id] = valid.sort((a, b) => a.localSol - b.localSol);
  }
  return data;
}

/** Applies a change: one check-in per sol (the newest wins), keeping the last `keepSols` sols. */
export function applyChange(data: HabitatData, change: Change, keepSols: number): HabitatData {
  switch (change.kind) {
    case 'checkIn': {
      const list = data.checkIns[change.crewId] ?? [];
      const latest = Math.max(change.checkIn.localSol, ...list.map((c) => c.localSol));
      const next = [...list.filter((c) => c.localSol !== change.checkIn.localSol), change.checkIn]
        .filter((c) => c.localSol > latest - keepSols)
        .sort((a, b) => a.localSol - b.localSol);
      return { ...data, checkIns: { ...data.checkIns, [change.crewId]: next } };
    }
  }
}

export function applyChanges(data: HabitatData, changes: readonly Change[], keepSols: number): HabitatData {
  return changes.reduce((d, c) => applyChange(d, c, keepSols), data);
}
