/**
 * The habitat server's HTTP API. Reading is open to every device (everyone
 * sees everyone); changing a crew member's data needs that crew member's
 * sign-in (`Authorization: Bearer <token>`).
 *
 *   GET    /api/health                          → { ok, version }
 *   GET    /api/habitat                         → { data, serverTime }
 *   GET    /api/stream                          → server-sent events: `habitat` with { data, serverTime } on every change
 *   PUT    /api/crew/<id>/check-ins/<localSol>  ← the four answers (and `t`, when it was answered)
 *   PUT    /api/crew/<id>/actions-done/<rule>   ← { t }: the action of an alert is done
 *   DELETE /api/crew/<id>/actions-done/<rule>   → undo
 *
 *   GET    /api/face/enrolled                   → { crewIds }: who has a face enrolled
 *   POST   /api/face/identify                   ← { descriptor } → { crewId, token, expires } or 404
 *   POST   /api/face/enroll                     ← { crewId, descriptors } → { crewId, token, expires }
 *   DELETE /api/face                            → forget the signed-in crew member's face (and sign them out)
 *   GET    /api/session                         → { crewId, expires, demo }
 *   POST   /api/session/demo                    ← { crewId }: demo sign-in without a face, if enabled
 *   DELETE /api/session                         → sign out
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { FACE } from '../src/config/face';
import { HABITAT_SERVER } from '../src/config/habitat';
import { ACTION_RULES, applyChange, parseAnswers, type Change } from '../src/logic/habitat';
import { localSolDate, SOL_IN_EARTH_DAYS } from '../src/logic/marsTime';
import { bestMatch, hashToken, newSession, parseDescriptor, prune, type ServerState, type Session } from './faces';
import { createRateLimiter } from './rateLimit';
import type { Store } from './store';

export interface AppOptions {
  store: Store;
  crewIds: readonly string[];
  /** Names for messages ("already enrolled as …"). */
  crewNames?: Record<string, string>;
  eastLongitudeDeg: number;
  version: string;
  now?: () => number;
  config?: typeof HABITAT_SERVER;
  face?: typeof FACE;
}

/** An error for the device: `key` is an English template ({name}) the app can translate with `vars`. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly key: string,
    readonly vars?: Record<string, string>,
  ) {
    super(key.replace(/\{(\w+)\}/g, (m: string, k: string) => vars?.[k] ?? m));
  }
}

const SOL_MS = SOL_IN_EARTH_DAYS * 86_400_000;
/** Face requests carry descriptors (a few KB each). */
const FACE_BODY_BYTES = 16_384;

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

const field = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;

export function createApp(options: AppOptions) {
  const {
    store,
    crewIds,
    crewNames = {},
    eastLongitudeDeg,
    version,
    now = Date.now,
    config = HABITAT_SERVER,
    face = FACE,
  } = options;
  let state: ServerState = store.load();
  const clients = new Set<ServerResponse>();
  const allowWrite = createRateLimiter(config.writesPerMinute, 60_000, now);
  const allowFaceCheck = createRateLimiter(face.checksPerMinute, 60_000, now);

  const snapshot = () => JSON.stringify({ data: state.habitat, serverTime: now() });
  const broadcast = () => {
    const message = `event: habitat\ndata: ${snapshot()}\n\n`;
    for (const c of clients) c.write(message);
  };
  const keepAlive = setInterval(() => {
    for (const c of clients) c.write(': keep-alive\n\n');
  }, config.keepAliveSeconds * 1000);
  keepAlive.unref();

  async function save(next: ServerState) {
    await store.save(next);
    state = next;
  }

  async function commit(change: Change) {
    await save({ ...state, habitat: applyChange(state.habitat, change, config.keepSols) });
    broadcast();
  }

  const clientOf = (req: IncomingMessage) => String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '?');

  /** The session behind the request's token, or 401. */
  function sessionOf(req: IncomingMessage): { hash: string; session: Session } {
    const auth = req.headers.authorization ?? '';
    const token = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(auth)?.[1];
    const hash = token ? hashToken(token) : '';
    const session = state.sessions[hash];
    if (!session || session.expires <= now()) throw new HttpError(401, 'Sign in first');
    return { hash, session };
  }

  /** Only the crew member themselves can change their data. */
  function authorize(req: IncomingMessage, crewId: string) {
    const { session } = sessionOf(req);
    if (session.crewId !== crewId) throw new HttpError(403, 'Only that crew member can change their data');
  }

  async function signIn(res: ServerResponse, crewId: string, demo: boolean, next: ServerState) {
    const t = now();
    const { token, hash, session } = newSession(crewId, t, demo, face);
    await save({ ...next, sessions: { ...next.sessions, [hash]: session } });
    send(res, 200, { crewId, token, expires: session.expires, demo });
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

  /** When it happened, as the device says, if it is believable (a device that was offline); otherwise now. */
  function believableTime(body: unknown, t0: number): number {
    const claimed = field(body, 't');
    return typeof claimed === 'number' && claimed <= t0 + 5 * 60_000 && claimed >= t0 - (config.acceptSolsBack + 1) * SOL_MS
      ? Math.round(claimed)
      : t0;
  }

  async function putCheckIn(req: IncomingMessage, res: ServerResponse, crewId: string, localSol: number) {
    if (!crewIds.includes(crewId)) throw new HttpError(404, 'Unknown crew member');
    authorize(req, crewId);
    const body = await readJson(req, config.maxBodyBytes);
    const answers = parseAnswers(body);
    if (!answers) throw new HttpError(400, 'Answers must be integers from 1 to 5: mood, stress, sleepQuality, isolation');
    const t0 = now();
    const today = Math.floor(localSolDate(t0, eastLongitudeDeg));
    if (localSol > today || localSol < today - config.acceptSolsBack) {
      throw new HttpError(422, 'Check-ins are for sol {from} to {to}', { from: String(today - config.acceptSolsBack), to: String(today) });
    }
    const checkIn = { ...answers, localSol, t: believableTime(body, t0), simulated: false };
    await commit({ kind: 'checkIn', crewId, checkIn });
    send(res, 200, checkIn);
  }

  async function actionDone(req: IncomingMessage, res: ServerResponse, crewId: string, rule: string, done: boolean) {
    if (!crewIds.includes(crewId)) throw new HttpError(404, 'Unknown crew member');
    if (!ACTION_RULES.includes(rule)) throw new HttpError(404, 'Unknown alert');
    authorize(req, crewId);
    if (done) {
      const t = believableTime(await readJson(req, config.maxBodyBytes), now());
      await commit({ kind: 'actionDone', crewId, rule, t });
      return send(res, 200, { rule, t });
    }
    await commit({ kind: 'actionUndone', crewId, rule });
    return send(res, 200, { rule });
  }

  async function identify(req: IncomingMessage, res: ServerResponse) {
    const descriptor = parseDescriptor(field(await readJson(req, FACE_BODY_BYTES), 'descriptor'), face.descriptorLength);
    if (!descriptor) throw new HttpError(400, 'A descriptor is {n} numbers', { n: String(face.descriptorLength) });
    const current = prune(state, now(), face);
    const match = bestMatch(current.faces, descriptor, face);
    if (!match) throw new HttpError(404, 'Face not recognized');
    const enrolled = current.faces[match.crewId]!;
    await signIn(res, match.crewId, false, {
      ...current,
      faces: { ...current.faces, [match.crewId]: { ...enrolled, lastUsed: now() } },
    });
  }

  async function enroll(req: IncomingMessage, res: ServerResponse) {
    const body = await readJson(req, FACE_BODY_BYTES);
    const crewId = field(body, 'crewId');
    if (typeof crewId !== 'string' || !crewIds.includes(crewId)) throw new HttpError(404, 'Unknown crew member');
    const raw = field(body, 'descriptors');
    const descriptors = Array.isArray(raw) ? raw.map((d) => parseDescriptor(d, face.descriptorLength)) : [];
    if (descriptors.length === 0 || descriptors.length > 5 || descriptors.some((d) => d === null)) {
      throw new HttpError(400, 'Send 1 to 5 descriptors of {n} numbers', { n: String(face.descriptorLength) });
    }
    const faces = descriptors as number[][];
    const current = prune(state, now(), face);
    // A face already enrolled can be replaced only by its own crew member, signed in.
    if (current.faces[crewId]) {
      let mine = false;
      try {
        mine = sessionOf(req).session.crewId === crewId;
      } catch {
        mine = false;
      }
      if (!mine) throw new HttpError(409, '{name} already has a face enrolled', { name: crewNames[crewId] ?? crewId });
    }
    // One face, one crew member.
    for (const d of faces) {
      const other = bestMatch(current.faces, d, face);
      if (other && other.crewId !== crewId) {
        throw new HttpError(409, 'This face is already enrolled as {name}', { name: crewNames[other.crewId] ?? other.crewId });
      }
    }
    const t = now();
    await signIn(res, crewId, false, {
      ...current,
      faces: { ...current.faces, [crewId]: { descriptors: faces, enrolledAt: t, lastUsed: t } },
    });
  }

  async function forgetFace(req: IncomingMessage, res: ServerResponse) {
    const { session } = sessionOf(req);
    const { [session.crewId]: _, ...faces } = state.faces;
    const sessions = Object.fromEntries(Object.entries(state.sessions).filter(([, s]) => s.crewId !== session.crewId));
    await save({ ...state, faces, sessions });
    send(res, 200, { crewId: session.crewId });
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const { pathname } = new URL(req.url ?? '/', 'http://habitat');
    const method = req.method ?? 'GET';
    const route = `${method} ${pathname}`;
    try {
      switch (route) {
        case 'GET /api/health':
          return send(res, 200, { ok: true, version });
        case 'GET /api/habitat':
          return send(res, 200, { data: state.habitat, serverTime: now() });
        case 'GET /api/stream':
          return stream(req, res);
        case 'GET /api/face/enrolled':
          return send(res, 200, { crewIds: Object.keys(prune(state, now(), face).faces) });
        case 'POST /api/face/identify':
        case 'POST /api/face/enroll':
          if (!allowFaceCheck(clientOf(req))) throw new HttpError(429, 'Too many tries; wait a minute');
          return await (route === 'POST /api/face/identify' ? identify(req, res) : enroll(req, res));
        case 'DELETE /api/face':
          return await forgetFace(req, res);
        case 'GET /api/session': {
          const { session } = sessionOf(req);
          return send(res, 200, { crewId: session.crewId, expires: session.expires, demo: session.demo === true });
        }
        case 'POST /api/session/demo': {
          if (!face.demoSignIn) throw new HttpError(404, 'Not found');
          if (!allowFaceCheck(clientOf(req))) throw new HttpError(429, 'Too many tries; wait a minute');
          const crewId = field(await readJson(req, config.maxBodyBytes), 'crewId');
          if (typeof crewId !== 'string' || !crewIds.includes(crewId)) throw new HttpError(404, 'Unknown crew member');
          return await signIn(res, crewId, true, prune(state, now(), face));
        }
        case 'DELETE /api/session': {
          const { hash } = sessionOf(req);
          const { [hash]: _, ...sessions } = state.sessions;
          await save({ ...state, sessions });
          return send(res, 200, { ok: true });
        }
      }
      const checkIn = /^\/api\/crew\/([a-z0-9-]+)\/check-ins\/(-?\d{1,7})$/.exec(pathname);
      const done = /^\/api\/crew\/([a-z0-9-]+)\/actions-done\/([A-Za-z0-9.]{1,64})$/.exec(pathname);
      if (checkIn || done) {
        const allowed = checkIn ? ['PUT'] : ['PUT', 'DELETE'];
        if (!allowed.includes(method)) return send(res, 405, { error: `Use ${allowed.join(' or ')}` }, { Allow: allowed.join(', ') });
        if (!allowWrite(clientOf(req))) throw new HttpError(429, 'Too many changes; try again in a minute');
        if (checkIn) return await putCheckIn(req, res, checkIn[1]!, Number(checkIn[2]));
        return await actionDone(req, res, done![1]!, done![2]!, method === 'PUT');
      }
      throw new HttpError(404, 'Not found');
    } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof HttpError) return send(res, e.status, { error: e.message, key: e.key, ...(e.vars ? { vars: e.vars } : {}) });
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
