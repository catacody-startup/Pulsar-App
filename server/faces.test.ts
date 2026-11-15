import { describe, expect, it } from 'vitest';
import { FACE } from '../src/config/face';
import { bestMatch, distance, emptyState, hashToken, newSession, parseDescriptor, parseState, prune } from './faces';

const HOUR = 3_600_000;
/** A descriptor near `base` (a point on the 128-d sphere), moved by `offset` on one axis. */
const face = (base: number, offset = 0) => Array.from({ length: 128 }, (_, i) => (i === 0 ? base + offset : 0.05));

describe('faces', () => {
  it('accepts only 128 finite numbers', () => {
    expect(parseDescriptor(face(0))).toHaveLength(128);
    expect(parseDescriptor(face(0).slice(1))).toBeNull();
    expect(parseDescriptor([...face(0).slice(1), Number.NaN])).toBeNull();
    expect(parseDescriptor([...face(0).slice(1), '1'])).toBeNull();
    expect(parseDescriptor('nope')).toBeNull();
  });

  it('matches the closest enrolled face under the match distance, and no one else', () => {
    const faces = {
      lucia: { descriptors: [face(0)], enrolledAt: 0, lastUsed: 0 },
      kenji: { descriptors: [face(1)], enrolledAt: 0, lastUsed: 0 },
    };
    expect(distance(face(0), face(0, 0.3))).toBeCloseTo(0.3);
    expect(bestMatch(faces, face(0, 0.3))?.crewId).toBe('lucia');
    expect(bestMatch(faces, face(1, -0.2))?.crewId).toBe('kenji');
    expect(bestMatch(faces, face(0.5))).toBeNull(); // 0.5 from both: not close enough to either
    expect(bestMatch(faces, face(5))).toBeNull();
  });

  it('forgets faces unused for a while and expired sessions', () => {
    const now = 100 * HOUR;
    const { hash, session } = newSession('lucia', now - 13 * HOUR);
    const fresh = newSession('kenji', now);
    const state = {
      ...emptyState(),
      faces: {
        lucia: { descriptors: [face(0)], enrolledAt: 0, lastUsed: now - (FACE.enrollmentTtlHours + 1) * HOUR },
        kenji: { descriptors: [face(1)], enrolledAt: 0, lastUsed: now - HOUR },
      },
      sessions: { [hash]: session, [fresh.hash]: fresh.session },
    };
    const pruned = prune(state, now);
    expect(Object.keys(pruned.faces)).toEqual(['kenji']);
    expect(Object.keys(pruned.sessions)).toEqual([fresh.hash]);
  });

  it('keeps sessions by the hash of their token', () => {
    const { token, hash } = newSession('lucia', 0);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
  });

  it('reads old files (habitat data only) and drops malformed faces and sessions', () => {
    const old = parseState({ checkIns: {}, actionsDone: { lucia: { 'radiation.storm': 5 } } }, ['lucia']);
    expect(old.habitat.actionsDone).toEqual({ lucia: { 'radiation.storm': 5 } });
    expect(old.faces).toEqual({});
    const state = parseState(
      {
        habitat: {},
        faces: { lucia: { descriptors: [face(0), [1, 2]], enrolledAt: 1, lastUsed: 2 }, intruder: { descriptors: [face(0)] } },
        sessions: { a: { crewId: 'lucia', expires: 9 }, b: { crewId: 'nobody', expires: 9 } },
      },
      ['lucia'],
    );
    expect(state.faces.lucia!.descriptors).toHaveLength(1);
    expect(Object.keys(state.faces)).toEqual(['lucia']);
    expect(state.sessions).toEqual({ a: { crewId: 'lucia', expires: 9 } });
  });
});
