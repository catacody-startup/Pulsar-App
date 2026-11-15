import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FACE } from '../src/config/face';
import { HABITAT_SERVER } from '../src/config/habitat';
import { localSolDate } from '../src/logic/marsTime';
import { createApp } from './app';
import { createFileStore, createMemoryStore, type Store } from './store';

const LON = 137.4417;
const NOW = Date.parse('2026-11-14T22:40:00Z');
const TODAY = Math.floor(localSolDate(NOW, LON));
const answers = { mood: 4, stress: 2, sleepQuality: 4, isolation: 2 };

let server: Server | undefined;
let app: ReturnType<typeof createApp> | undefined;

let clock = NOW;

async function start(store: Store = createMemoryStore(), config = HABITAT_SERVER, face = FACE) {
  clock = NOW;
  app = createApp({
    store,
    crewIds: ['lucia', 'kenji'],
    crewNames: { lucia: 'Lucía Ferreira', kenji: 'Kenji Watanabe' },
    eastLongitudeDeg: LON,
    version: 'test',
    now: () => clock,
    config,
    face,
  });
  server = createServer((req, res) => void app!.handle(req, res));
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  app?.close();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(null)));
  server = undefined;
});

const json = async (res: Response): Promise<any> => res.json();

/** Tokens of demo sign-ins, per crew member, for the current server. */
let tokens: Record<string, string> = {};

async function tokenFor(base: string, crewId: string): Promise<string> {
  if (!tokens[crewId]) {
    const res = await fetch(`${base}/api/session/demo`, { method: 'POST', body: JSON.stringify({ crewId }) });
    tokens[crewId] = (await json(res)).token;
  }
  return tokens[crewId]!;
}

const request = (base: string, method: string, path: string, body?: unknown, token?: string) =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

/** A change made by the crew member of the path, signed in. */
async function put(base: string, path: string, body: unknown) {
  const crewId = /\/api\/crew\/([a-z0-9-]+)\//.exec(path)?.[1] ?? '';
  return request(base, 'PUT', path, body, crewId ? await tokenFor(base, crewId).catch(() => '') : undefined);
}

afterEach(() => {
  tokens = {};
});

describe('habitat server', () => {
  it('answers health checks with its version', async () => {
    const base = await start();
    expect(await json(await fetch(`${base}/api/health`))).toEqual({ ok: true, version: 'test' });
  });

  it('keeps a check-in and gives it back to every device', async () => {
    const store = createMemoryStore();
    const base = await start(store);
    const res = await put(base, `/api/crew/lucia/check-ins/${TODAY}`, { ...answers, t: NOW - 60_000 });
    expect(res.status).toBe(200);
    const saved = { ...answers, localSol: TODAY, t: NOW - 60_000, simulated: false };
    expect(await res.json()).toEqual(saved);
    const { data, serverTime } = await json(await fetch(`${base}/api/habitat`));
    expect(data.checkIns.lucia).toEqual([saved]);
    expect(serverTime).toBe(NOW);
    expect(store.saved.habitat.checkIns.lucia).toEqual([saved]);
  });

  it('rejects bad answers, unknown crew members and sols out of range', async () => {
    const base = await start();
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY}`, { ...answers, mood: 7 })).status).toBe(400);
    expect((await put(base, `/api/crew/nobody/check-ins/${TODAY}`, answers)).status).toBe(404);
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY + 1}`, answers)).status).toBe(422);
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY - 1}`, answers)).status).toBe(200);
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY - 2}`, answers)).status).toBe(422);
    expect((await fetch(`${base}/api/crew/lucia/check-ins/${TODAY}`)).status).toBe(405);
    expect((await fetch(`${base}/api/elsewhere`)).status).toBe(404);
  });

  it('uses its own clock when the device’s time is not believable', async () => {
    const base = await start();
    const res = await put(base, `/api/crew/lucia/check-ins/${TODAY}`, { ...answers, t: NOW + 3_600_000 });
    expect((await json(res)).t).toBe(NOW);
  });

  it('refuses large bodies and too many changes', async () => {
    const base = await start(createMemoryStore(), { ...HABITAT_SERVER, writesPerMinute: 2 });
    await tokenFor(base, 'lucia');
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY}`, { ...answers, pad: 'x'.repeat(5000) })).status).toBe(413);
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY}`, answers)).status).toBe(200);
    expect((await put(base, `/api/crew/lucia/check-ins/${TODAY}`, answers)).status).toBe(429);
  });

  it('streams the data on connect and on every change', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/stream`);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const nextEvent = async () => {
      let text = '';
      while (!text.includes('\n\n')) text += decoder.decode((await reader.read()).value);
      return JSON.parse(/data: (.*)/.exec(text)![1]!);
    };
    expect((await nextEvent()).data).toEqual({ checkIns: {}, actionsDone: {} });
    await tokenFor(base, 'kenji');
    await put(base, `/api/crew/kenji/check-ins/${TODAY}`, answers);
    expect((await nextEvent()).data.checkIns.kenji).toHaveLength(1);
    await reader.cancel();
  });

  it('keeps the actions marked as done, and their undo', async () => {
    const base = await start();
    expect((await put(base, '/api/crew/lucia/actions-done/radiation.storm', { t: NOW - 1000 })).status).toBe(200);
    expect((await json(await fetch(`${base}/api/habitat`))).data.actionsDone).toEqual({ lucia: { 'radiation.storm': NOW - 1000 } });
    expect((await put(base, '/api/crew/lucia/actions-done/heartRate.normal', {})).status).toBe(404);
    expect((await put(base, '/api/crew/nobody/actions-done/radiation.storm', {})).status).toBe(404);
    expect((await request(base, 'DELETE', '/api/crew/lucia/actions-done/radiation.storm', undefined, await tokenFor(base, 'lucia'))).status).toBe(200);
    expect((await json(await fetch(`${base}/api/habitat`))).data.actionsDone).toEqual({ lucia: {} });
  });

  it('survives a restart: the data is in the file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pulsar-')), 'habitat.json');
    const base = await start(createFileStore(file, ['lucia', 'kenji']));
    await put(base, `/api/crew/lucia/check-ins/${TODAY}`, answers);
    expect(JSON.parse(readFileSync(file, 'utf8')).habitat.checkIns.lucia).toHaveLength(1);
    expect(createFileStore(file, ['lucia', 'kenji']).load().habitat.checkIns.lucia).toHaveLength(1);
  });
});

/** A descriptor near `base` on one axis (the face-api model gives 128 numbers). */
const face = (base: number) => Array.from({ length: 128 }, (_, i) => (i === 0 ? base : 0.05));

describe('signing in with the face', () => {
  it('only the crew member, signed in, changes their own data', async () => {
    const base = await start();
    const path = `/api/crew/lucia/check-ins/${TODAY}`;
    expect((await request(base, 'PUT', path, answers)).status).toBe(401);
    expect((await request(base, 'PUT', path, answers, 'not-a-real-token-at-all-xxxx')).status).toBe(401);
    expect((await request(base, 'PUT', path, answers, await tokenFor(base, 'kenji'))).status).toBe(403);
    expect((await request(base, 'PUT', path, answers, await tokenFor(base, 'lucia'))).status).toBe(200);
  });

  it('enrolls a face, recognizes it later and signs in', async () => {
    const store = createMemoryStore();
    const base = await start(store);
    const enrolled = await request(base, 'POST', '/api/face/enroll', { crewId: 'lucia', descriptors: [face(0), face(0.1)] });
    expect(enrolled.status).toBe(200);
    expect((await json(enrolled)).crewId).toBe('lucia');
    expect(await json(await fetch(`${base}/api/face/enrolled`))).toEqual({ crewIds: ['lucia'] });

    const known = await request(base, 'POST', '/api/face/identify', { descriptor: face(0.2) });
    const session = await json(known);
    expect(session.crewId).toBe('lucia');
    expect((await json(await request(base, 'GET', '/api/session', undefined, session.token))).crewId).toBe('lucia');
    expect((await request(base, 'POST', '/api/face/identify', { descriptor: face(3) })).status).toBe(404);

    // Faces and sessions stay on the server: not in the data every device gets.
    expect(JSON.stringify(await json(await fetch(`${base}/api/habitat`)))).not.toContain('descriptors');
    expect(JSON.stringify(store.saved.sessions)).not.toContain(session.token);
  });

  it('does not let someone else take an enrolled crew member or hold two seats', async () => {
    const base = await start();
    await request(base, 'POST', '/api/face/enroll', { crewId: 'lucia', descriptors: [face(0)] });
    expect((await request(base, 'POST', '/api/face/enroll', { crewId: 'lucia', descriptors: [face(3)] })).status).toBe(409);
    const twice = await request(base, 'POST', '/api/face/enroll', { crewId: 'kenji', descriptors: [face(0.1)] });
    expect(twice.status).toBe(409);
    expect((await json(twice)).error).toContain('Lucía Ferreira');
    expect((await request(base, 'POST', '/api/face/enroll', { crewId: 'kenji', descriptors: [face(3)] })).status).toBe(200);
  });

  it('forgets a face on request, and after a while without use', async () => {
    const base = await start();
    const { token } = await json(await request(base, 'POST', '/api/face/enroll', { crewId: 'lucia', descriptors: [face(0)] }));
    expect((await request(base, 'DELETE', '/api/face', undefined, token)).status).toBe(200);
    expect(await json(await fetch(`${base}/api/face/enrolled`))).toEqual({ crewIds: [] });
    expect((await request(base, 'GET', '/api/session', undefined, token)).status).toBe(401);

    await request(base, 'POST', '/api/face/enroll', { crewId: 'kenji', descriptors: [face(3)] });
    clock += (FACE.enrollmentTtlHours + 0.1) * 3_600_000;
    expect(await json(await fetch(`${base}/api/face/enrolled`))).toEqual({ crewIds: [] });
  });

  it('signs out, and sign-ins expire', async () => {
    const base = await start();
    const token = await tokenFor(base, 'lucia');
    expect((await request(base, 'DELETE', '/api/session', undefined, token)).status).toBe(200);
    expect((await request(base, 'GET', '/api/session', undefined, token)).status).toBe(401);
    tokens = {};
    const again = await tokenFor(base, 'lucia');
    clock += (FACE.sessionHours + 0.1) * 3_600_000;
    expect((await request(base, 'GET', '/api/session', undefined, again)).status).toBe(401);
  });

  it('turns the demo sign-in off when the config says so', async () => {
    const base = await start(createMemoryStore(), HABITAT_SERVER, { ...FACE, demoSignIn: false });
    expect((await request(base, 'POST', '/api/session/demo', { crewId: 'lucia' })).status).toBe(404);
  });
});
