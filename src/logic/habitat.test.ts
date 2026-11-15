import { describe, expect, it } from 'vitest';
import {
  applyChange,
  applyChanges,
  crewFeed,
  currentActionsDone,
  emptyHabitat,
  habitatAsOf,
  parseAnswers,
  parseHabitatData,
  type Change,
} from './habitat';

const answers = { mood: 4, stress: 2, sleepQuality: 4, isolation: 2 };
const checkIn = (localSol: number, mood = 4): Extract<Change, { kind: 'checkIn' }> => ({
  kind: 'checkIn',
  crewId: 'lucia',
  checkIn: { ...answers, mood, localSol, t: localSol * 1000, simulated: false },
});

describe('habitat data', () => {
  it('accepts only four integer answers from 1 to 5', () => {
    expect(parseAnswers(answers)).toEqual(answers);
    expect(parseAnswers({ ...answers, extra: 'ignored' })).toEqual(answers);
    expect(parseAnswers({ ...answers, mood: 6 })).toBeNull();
    expect(parseAnswers({ ...answers, mood: 2.5 })).toBeNull();
    expect(parseAnswers({ ...answers, stress: '2' })).toBeNull();
    expect(parseAnswers({ mood: 4 })).toBeNull();
    expect(parseAnswers(null)).toBeNull();
  });

  it('keeps one check-in per sol, the newest, and only the last sols', () => {
    let data = applyChanges(emptyHabitat(), [checkIn(10), checkIn(12), checkIn(11)], 30);
    expect(data.checkIns.lucia!.map((c) => c.localSol)).toEqual([10, 11, 12]);
    data = applyChange(data, checkIn(12, 1), 30);
    expect(data.checkIns.lucia!.find((c) => c.localSol === 12)!.mood).toBe(1);
    expect(data.checkIns.lucia).toHaveLength(3);
    data = applyChange(data, checkIn(40), 30);
    expect(data.checkIns.lucia!.map((c) => c.localSol)).toEqual([11, 12, 40]);
  });

  it('does not change the data it is given', () => {
    const before = applyChange(emptyHabitat(), checkIn(10), 30);
    const copy = structuredClone(before);
    applyChange(before, checkIn(10, 2), 30);
    expect(before).toEqual(copy);
  });

  it('drops anything malformed or of an unknown crew member when reading', () => {
    const good = checkIn(10).checkIn;
    const data = parseHabitatData(
      { checkIns: { lucia: [good, { ...good, mood: 9 }, 'junk'], intruder: [good] }, actionsDone: { lucia: { 'not.a.rule': 5 } } },
      ['lucia', 'kenji'],
    );
    expect(data).toEqual({ checkIns: { lucia: [good] }, actionsDone: {} });
    expect(parseHabitatData('nonsense', ['lucia'])).toEqual(emptyHabitat());
  });
});

describe('actions marked as done', () => {
  const HOUR = 3_600_000;
  const now = 100 * HOUR;
  const done = (rule: string, t: number): Change => ({ kind: 'actionDone', crewId: 'lucia', rule, t });

  it('keeps the latest time per alert, and can be undone', () => {
    let data = applyChanges(emptyHabitat(), [done('radiation.storm', now - HOUR), done('radiation.storm', now)], 30);
    expect(data.actionsDone.lucia).toEqual({ 'radiation.storm': now });
    data = applyChange(data, { kind: 'actionUndone', crewId: 'lucia', rule: 'radiation.storm' }, 30);
    expect(data.actionsDone.lucia).toEqual({});
  });

  it('counts for 12 hours', () => {
    const data = applyChanges(emptyHabitat(), [done('radiation.storm', now - 2 * HOUR), done('sleep.short', now - 13 * HOUR)], 30);
    expect(currentActionsDone(data, 'lucia', now)).toEqual({ 'radiation.storm': now - 2 * HOUR });
    expect(currentActionsDone(data, 'kenji', now)).toEqual({});
  });

  it('reads only known alerts', () => {
    const data = parseHabitatData({ actionsDone: { lucia: { 'radiation.storm': now, 'heartRate.normal': now, junk: now } } }, ['lucia']);
    expect(data.actionsDone).toEqual({ lucia: { 'radiation.storm': now } });
  });

  it('lists what the crew did, newest first', () => {
    const data = applyChanges(emptyHabitat(), [checkIn(10), done('radiation.storm', 20_000)], 30);
    expect(crewFeed(data, 0, 30_000)).toEqual([
      { kind: 'actionDone', crewId: 'lucia', rule: 'radiation.storm', t: 20_000 },
      { kind: 'checkIn', crewId: 'lucia', t: 10_000 },
    ]);
    expect(crewFeed(data, 15_000, 30_000)).toHaveLength(1);
  });
});

describe('seen from Earth', () => {
  it('shows only what had happened one signal delay ago', () => {
    const data = applyChanges(
      emptyHabitat(),
      [checkIn(10), checkIn(11), { kind: 'actionDone', crewId: 'lucia', rule: 'radiation.storm', t: 10_500 }],
      30,
    );
    const seen = habitatAsOf(data, 10_600);
    expect(seen.checkIns.lucia!.map((c) => c.localSol)).toEqual([10]);
    expect(seen.actionsDone.lucia).toEqual({ 'radiation.storm': 10_500 });
    expect(habitatAsOf(data, 10_000).actionsDone.lucia).toEqual({});
  });
});
