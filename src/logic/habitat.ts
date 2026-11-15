/**
 * The data the habitat server keeps, and the changes devices send to it.
 * Shared by the server and the app: the app shows the server's data with its
 * own waiting changes applied on top, so it works the same while offline.
 */
import { ACTION_DONE, ACTIONS } from '../config/actions';
import { CHECKIN_QUESTIONS } from '../config/checkin';
import type { CheckIn, CheckInAnswers } from './types';

export interface HabitatData {
  /** Check-ins answered in the app, per crew member, oldest first. */
  checkIns: Record<string, CheckIn[]>;
  /** Alerts whose action each crew member marked as done: rule → when (ms). */
  actionsDone: Record<string, Record<string, number>>;
}

/** A change made on a device, waiting to reach the habitat server or already applied. */
export type Change =
  | { kind: 'checkIn'; crewId: string; checkIn: CheckIn }
  | { kind: 'actionDone'; crewId: string; rule: string; t: number }
  | { kind: 'actionUndone'; crewId: string; rule: string };

/** Rules with an action that can be marked as done. */
export const ACTION_RULES: readonly string[] = Object.keys(ACTIONS);

export function emptyHabitat(): HabitatData {
  return { checkIns: {}, actionsDone: {} };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

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
  if (typeof localSol !== 'number' || !Number.isInteger(localSol) || !isTime(t)) return null;
  return { ...answers, localSol, t, simulated: false };
}

/** Habitat data read from a file or the network: anything malformed or of an unknown crew member is dropped. */
export function parseHabitatData(value: unknown, crewIds: readonly string[]): HabitatData {
  const data = emptyHabitat();
  if (!isObject(value)) return data;
  const checkIns = isObject(value.checkIns) ? value.checkIns : {};
  const done = isObject(value.actionsDone) ? value.actionsDone : {};
  for (const id of crewIds) {
    const list = checkIns[id];
    if (Array.isArray(list)) {
      const valid = list.map(parseCheckIn).filter((c): c is CheckIn => c !== null);
      if (valid.length > 0) data.checkIns[id] = valid.sort((a, b) => a.localSol - b.localSol);
    }
    const rules = done[id];
    if (isObject(rules)) {
      const valid = Object.entries(rules).filter(([rule, t]) => ACTION_RULES.includes(rule) && isTime(t));
      if (valid.length > 0) data.actionsDone[id] = Object.fromEntries(valid) as Record<string, number>;
    }
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
    case 'actionDone': {
      const rules = { ...data.actionsDone[change.crewId], [change.rule]: change.t };
      return { ...data, actionsDone: { ...data.actionsDone, [change.crewId]: rules } };
    }
    case 'actionUndone': {
      const { [change.rule]: _, ...rules } = data.actionsDone[change.crewId] ?? {};
      return { ...data, actionsDone: { ...data.actionsDone, [change.crewId]: rules } };
    }
  }
}

export function applyChanges(data: HabitatData, changes: readonly Change[], keepSols: number): HabitatData {
  return changes.reduce((d, c) => applyChange(d, c, keepSols), data);
}

/** Actions a crew member marked as done recently enough to still count: rule → when. */
export function currentActionsDone(data: HabitatData, crewId: string, now: number): Record<string, number> {
  const since = now - ACTION_DONE.validHours * 3_600_000;
  return Object.fromEntries(Object.entries(data.actionsDone[crewId] ?? {}).filter(([, t]) => t >= since && t <= now + 60_000));
}

export type FeedItem =
  | { kind: 'checkIn'; crewId: string; t: number }
  | { kind: 'actionDone'; crewId: string; rule: string; t: number };

/** What the crew did in the app since `since`, newest first. */
export function crewFeed(data: HabitatData, since: number, now: number): FeedItem[] {
  const items: FeedItem[] = [];
  for (const [crewId, list] of Object.entries(data.checkIns)) {
    for (const c of list) if (c.t >= since && c.t <= now) items.push({ kind: 'checkIn', crewId, t: c.t });
  }
  for (const [crewId, rules] of Object.entries(data.actionsDone)) {
    for (const [rule, t] of Object.entries(rules)) if (t >= since && t <= now) items.push({ kind: 'actionDone', crewId, rule, t });
  }
  return items.sort((a, b) => b.t - a.t);
}

/** The data as it was at `t`: what someone one signal delay away sees now. */
export function habitatAsOf(data: HabitatData, t: number): HabitatData {
  return {
    checkIns: Object.fromEntries(Object.entries(data.checkIns).map(([id, list]) => [id, list.filter((c) => c.t <= t)])),
    actionsDone: Object.fromEntries(
      Object.entries(data.actionsDone).map(([id, rules]) => [id, Object.fromEntries(Object.entries(rules).filter(([, at]) => at <= t))]),
    ),
  };
}
