import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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

async function start(store: Store = createMemoryStore(), config = HABITAT_SERVER) {
  app = createApp({ store, crewIds: ['lucia', 'kenji'], eastLongitudeDeg: LON, version: 'test', now: () => NOW, config });
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

const put = (base: string, path: string, body: unknown) =>
  fetch(base + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

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
    expect(store.saved.checkIns.lucia).toEqual([saved]);
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
    expect((await fetch(`${base}/api/crew/lucia/actions-done/radiation.storm`, { method: 'DELETE' })).status).toBe(200);
    expect((await json(await fetch(`${base}/api/habitat`))).data.actionsDone).toEqual({ lucia: {} });
  });

  it('survives a restart: the data is in the file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'pulsar-')), 'habitat.json');
    const base = await start(createFileStore(file, ['lucia', 'kenji']));
    await put(base, `/api/crew/lucia/check-ins/${TODAY}`, answers);
    expect(JSON.parse(readFileSync(file, 'utf8')).checkIns.lucia).toHaveLength(1);
    expect(createFileStore(file, ['lucia', 'kenji']).load().checkIns.lucia).toHaveLength(1);
  });
});
