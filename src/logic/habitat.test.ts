import { describe, expect, it } from 'vitest';
import { applyChange, applyChanges, emptyHabitat, parseAnswers, parseHabitatData, type Change } from './habitat';

const answers = { mood: 4, stress: 2, sleepQuality: 4, isolation: 2 };
const checkIn = (localSol: number, mood = 4): Change => ({
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
      { checkIns: { lucia: [good, { ...good, mood: 9 }, 'junk'], intruder: [good] } },
      ['lucia', 'kenji'],
    );
    expect(data).toEqual({ checkIns: { lucia: [good] } });
    expect(parseHabitatData('nonsense', ['lucia'])).toEqual(emptyHabitat());
  });
});
