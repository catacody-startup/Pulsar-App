/**
 * The habitat server's HTTP API.
 *
 *   GET /api/health                          → { ok, version }
 *   GET /api/habitat                         → { data, serverTime }
 *   GET /api/stream                          → server-sent events: `habitat` with { data, serverTime } on every change
 *   PUT /api/crew/<id>/check-ins/<localSol>  ← the four answers (and `t`, when it was answered)
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { HABITAT_SERVER } from '../src/config/habitat';
import { applyChange, parseAnswers, type Change, type HabitatData } from '../src/logic/habitat';
import { localSolDate, SOL_IN_EARTH_DAYS } from '../src/logic/marsTime';
import { createRateLimiter } from './rateLimit';
import type { Store } from './store';

export interface AppOptions {
  store: Store;
  crewIds: readonly string[];
  eastLongitudeDeg: number;
  version: string;
  now?: () => number;
  config?: typeof HABITAT_SERVER;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const SOL_MS = SOL_IN_EARTH_DAYS * 86_400_000;

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  if (Number(req.headers['content-length'] ?? 0) > maxBytes) {
    req.resume(); // discard the body
    return Promise.reject(new HttpError(413, 'Request too large'));
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) tooLarge = true;
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(new HttpError(413, 'Request too large'));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Body must be JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function createApp(options: AppOptions) {
  const { store, crewIds, eastLongitudeDeg, version, now = Date.now, config = HABITAT_SERVER } = options;
  let data: HabitatData = store.load();
  const clients = new Set<ServerResponse>();
  const allowWrite = createRateLimiter(config.writesPerMinute, 60_000, now);

  const snapshot = () => JSON.stringify({ data, serverTime: now() });
  const broadcast = () => {
    const message = `event: habitat\ndata: ${snapshot()}\n\n`;
    for (const c of clients) c.write(message);
  };
  const keepAlive = setInterval(() => {
    for (const c of clients) c.write(': keep-alive\n\n');
  }, config.keepAliveSeconds * 1000);
  keepAlive.unref();

  async function commit(change: Change) {
    const next = applyChange(data, change, config.keepSols);
    await store.save(next);
    data = next;
    broadcast();
  }

  function stream(req: IncomingMessage, res: ServerResponse) {
    if (clients.size >= config.maxStreamClients) throw new HttpError(503, 'Too many devices following the habitat');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      // Nginx: pass each event on right away.
      'X-Accel-Buffering': 'no',
    });
    res.write(`retry: 5000\nevent: habitat\ndata: ${snapshot()}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  }

  async function putCheckIn(req: IncomingMessage, res: ServerResponse, crewId: string, localSol: number) {
    if (!crewIds.includes(crewId)) throw new HttpError(404, 'Unknown crew member');
    const body = await readJson(req, config.maxBodyBytes);
    const answers = parseAnswers(body);
    if (!answers) throw new HttpError(400, 'Answers must be integers from 1 to 5: mood, stress, sleepQuality, isolation');
    const t0 = now();
    const today = Math.floor(localSolDate(t0, eastLongitudeDeg));
    if (localSol > today || localSol < today - config.acceptSolsBack) {
      throw new HttpError(422, `Check-ins are for sol ${today - config.acceptSolsBack} to ${today}`);
    }
    // When it was answered, as the device says, if it is believable; otherwise now.
    const claimed = (body as { t?: unknown }).t;
    const t =
      typeof claimed === 'number' && claimed <= t0 + 5 * 60_000 && claimed >= t0 - (config.acceptSolsBack + 1) * SOL_MS
        ? Math.round(claimed)
        : t0;
    const checkIn = { ...answers, localSol, t, simulated: false };
    await commit({ kind: 'checkIn', crewId, checkIn });
    send(res, 200, checkIn);
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const { pathname } = new URL(req.url ?? '/', 'http://habitat');
    const method = req.method ?? 'GET';
    try {
      if (pathname === '/api/health' && method === 'GET') return send(res, 200, { ok: true, version });
      if (pathname === '/api/habitat' && method === 'GET') return send(res, 200, { data, serverTime: now() });
      if (pathname === '/api/stream' && method === 'GET') return stream(req, res);
      const checkIn = /^\/api\/crew\/([a-z0-9-]+)\/check-ins\/(-?\d{1,7})$/.exec(pathname);
      if (checkIn) {
        if (method !== 'PUT') return send(res, 405, { error: 'Use PUT' }, { Allow: 'PUT' });
        const client = String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '?');
        if (!allowWrite(client)) throw new HttpError(429, 'Too many changes; try again in a minute');
        return await putCheckIn(req, res, checkIn[1]!, Number(checkIn[2]));
      }
      throw new HttpError(404, 'Not found');
    } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      console.error(e);
      return send(res, 500, { error: 'Habitat server error' });
    }
  }

  return {
    handle,
    /** Ends the live updates (on shutdown). */
    close() {
      clearInterval(keepAlive);
      for (const c of clients) c.end();
      clients.clear();
    },
  };
}
