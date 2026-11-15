import { useCallback, useEffect, useRef, useState } from 'react';
import { CREW, crewMember } from '../config/crew';
import { FACE } from '../config/face';
import { loadFaceApi, readFace, startCamera } from '../face/faceId';
import type { Session } from '../hooks/useSession';
import { t } from '../i18n/i18n';

interface Props {
  session: Session | null;
  onSignedIn: (session: Session) => void;
  onSignOut: () => void;
  onForgetFace: () => Promise<boolean>;
  onGoToPanel: (crewId: string) => void;
}

type Step =
  | { name: 'idle' }
  | { name: 'loading' }
  | { name: 'looking' }
  | { name: 'checking' }
  | { name: 'unknown' }
  | { name: 'enrolling'; crewId: string; taken: number }
  | { name: 'error'; message: string };

const firstName = (crewId: string) => crewMember(crewId)?.name.split(' ')[0] ?? crewId;

/** The server's message, translated from its template, or a generic one. */
function serverError(json: Record<string, unknown> | undefined): string {
  const key = json?.key ?? json?.error;
  if (typeof key !== 'string') return t('The habitat server did not answer. Try again.');
  const vars = json?.vars && typeof json.vars === 'object' ? (json.vars as Record<string, string>) : undefined;
  return t(key, vars);
}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

function asSession(json: Record<string, unknown>): Session {
  return { crewId: String(json.crewId), token: String(json.token), expires: Number(json.expires), demo: json.demo === true };
}

function cameraError(e: unknown): string {
  console.error('Face sign-in:', e);
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError') return t('The camera is blocked for this page. Allow it in the browser and try again.');
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return t('No camera found on this device.');
  if (!window.isSecureContext) return t('The camera only works over HTTPS.');
  return t('Could not start the camera or the face recognition. Try again, or use the demo sign-in below.');
}

/** Sign in with the face: recognize an enrolled crew member, or enroll a new face. */
export function SignInPage({ session, onSignedIn, onSignOut, onForgetFace, onGoToPanel }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stopCamera = useRef<(() => void) | null>(null);
  const [step, setStep] = useState<Step>({ name: 'idle' });
  const [message, setMessage] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const active = useRef(true);

  const refreshEnrolled = useCallback(() => {
    fetch('/api/face/enrolled')
      .then((r) => r.json())
      .then((j: { crewIds?: string[] }) => setEnrolled(j.crewIds ?? []))
      .catch(() => setEnrolled([]));
  }, []);

  useEffect(() => {
    active.current = true;
    refreshEnrolled();
    return () => {
      active.current = false;
      stopCamera.current?.();
    };
  }, [refreshEnrolled]);

  const finish = (json: Record<string, unknown>) => {
    stopCamera.current?.();
    stopCamera.current = null;
    const s = asSession(json);
    onSignedIn(s);
    onGoToPanel(s.crewId);
  };

  /** Waits for a clear face in the camera. */
  const nextFace = async () => {
    for (;;) {
      if (!active.current || !video.current) throw new Error('left');
      const face = await readFace(video.current);
      if (face) return face;
      await pause(300);
    }
  };

  const start = async () => {
    setMessage(null);
    setStep({ name: 'loading' });
    try {
      if (!video.current) return;
      stopCamera.current ??= await startCamera(video.current);
      await loadFaceApi();
      setStep({ name: 'looking' });
      const face = await nextFace();
      setStep({ name: 'checking' });
      const res = await post('/api/face/identify', { descriptor: face.descriptor });
      if (res.ok) return finish(res.json);
      if (res.status === 404) {
        refreshEnrolled();
        return setStep({ name: 'unknown' });
      }
      setStep({ name: 'error', message: serverError(res.json) });
    } catch (e) {
      if (!active.current) return;
      setStep({ name: 'error', message: cameraError(e) });
    }
  };

  const enroll = async (crewId: string) => {
    setMessage(null);
    try {
      const descriptors: number[][] = [];
      for (let i = 0; i < FACE.enrollSamples; i++) {
        setStep({ name: 'enrolling', crewId, taken: i });
        descriptors.push((await nextFace()).descriptor);
        await pause(500);
      }
      const res = await post('/api/face/enroll', { crewId, descriptors });
      if (res.ok) return finish(res.json);
      refreshEnrolled();
      setStep({ name: 'unknown' });
      setMessage(serverError(res.json));
    } catch (e) {
      if (!active.current) return;
      setStep({ name: 'error', message: cameraError(e) });
    }
  };

  const demoSignIn = async (crewId: string) => {
    setMessage(null);
    const res = await post('/api/session/demo', { crewId }).catch(() => null);
    if (res?.ok) return finish(res.json);
    setMessage(serverError(res?.json));
  };

  if (session) {
    const name = firstName(session.crewId);
    return (
      <section aria-labelledby="sign-in" className="mx-auto max-w-md space-y-4">
        <h2 id="sign-in" className="text-xl font-semibold">
          {t('Signed in as {name}', { name: crewMember(session.crewId)?.name ?? session.crewId })}
        </h2>
        <p className="text-sm text-slate-300">
          {session.demo ? t('Demo sign-in, without a face.') : t('Signed in with your face.')}{' '}
          {t('You can change your own check-in and actions; everyone sees everyone.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onGoToPanel(session.crewId)} className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white">
            {t('Go to {name}’s panel', { name })}
          </button>
          <button type="button" onClick={onSignOut} className="rounded-md border border-slate-600 px-4 py-1.5 text-sm text-slate-100 hover:bg-slate-800">
            {t('Sign out')}
          </button>
          {!session.demo && (
            <button
              type="button"
              onClick={async () => setMessage((await onForgetFace()) ? null : serverError(undefined))}
              className="rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              {t('Forget my face')}
            </button>
          )}
        </div>
        {message && <p className="text-sm text-watch">{message}</p>}
      </section>
    );
  }

  const free = CREW.filter((c) => !enrolled.includes(c.id));
  const status: Record<Step['name'], string> = {
    idle: t('The camera is off.'),
    loading: t('Loading face recognition (about 7 MB the first time)…'),
    looking: t('Look at the camera.'),
    checking: t('Checking with the habitat server…'),
    unknown: t('This face is not enrolled yet.'),
    enrolling:
      step.name === 'enrolling'
        ? t('Enrolling {name}: picture {n} of {total}. Move your head a little.', {
            name: firstName(step.crewId),
            n: step.taken + 1,
            total: FACE.enrollSamples,
          })
        : '',
    error: step.name === 'error' ? step.message : '',
  };
  const cameraOn = step.name !== 'idle' && step.name !== 'error';

  return (
    <section aria-labelledby="sign-in" className="mx-auto max-w-md space-y-4">
      <div>
        <h2 id="sign-in" className="text-xl font-semibold">
          {t('Sign in with your face')}
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          {t('Each crew member changes only their own check-in and actions. Reading is open: everyone sees everyone.')}
        </p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <video ref={video} muted playsInline className={`h-full w-full -scale-x-100 object-cover ${cameraOn ? '' : 'invisible'}`} />
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button type="button" onClick={start} className="rounded-md bg-sky-600 px-5 py-2 font-medium text-white hover:bg-sky-500">
              {step.name === 'error' ? t('Try again') : t('Start camera')}
            </button>
          </div>
        )}
        {(step.name === 'looking' || step.name === 'enrolling') && (
          <div className="pointer-events-none absolute inset-[12%] rounded-[45%] border-2 border-dashed border-sky-400/70" aria-hidden />
        )}
      </div>
      <p className={`text-sm ${step.name === 'error' ? 'text-watch' : 'text-slate-200'}`} role="status">
        {status[step.name]}
      </p>

      {step.name === 'unknown' && (
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-sm text-slate-200">{t('Who are you? Enrolling takes {n} pictures.', { n: FACE.enrollSamples })}</p>
          <div className="flex flex-wrap gap-2">
            {CREW.map((c) => {
              const taken = enrolled.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={taken}
                  onClick={() => enroll(c.id)}
                  className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('I’m {name}', { name: c.name.split(' ')[0] ?? c.name })}
                  {taken ? ` · ${t('taken')}` : ''}
                </button>
              );
            })}
          </div>
          {free.length === 0 && (
            <p className="text-xs text-slate-400">
              {t('Every crew member has a face enrolled; seats free up after {n} h without use.', { n: FACE.enrollmentTtlHours })}
            </p>
          )}
          <button type="button" onClick={start} className="text-sm text-sky-400 hover:text-sky-300">
            {t('Try recognizing again')}
          </button>
        </div>
      )}
      {message && <p className="text-sm text-watch">{message}</p>}

      <p className="text-[11px] text-slate-500">
        {t(
          'Your picture never leaves this device: Pulsar sends only {n} numbers that describe your face. The habitat server keeps them to recognize you and forgets them after {h} h without use, or when you ask. Face recognition: face-api.js.',
          { n: FACE.descriptorLength, h: FACE.enrollmentTtlHours },
        )}
      </p>

      {FACE.demoSignIn && (
        <div className="space-y-2 rounded-lg border border-dashed border-slate-700 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('Demo · no camera?')}</p>
          <p className="text-sm text-slate-300">{t('Sign in as a crew member without a face:')}</p>
          <div className="flex flex-wrap gap-2">
            {CREW.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => demoSignIn(c.id)}
                className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
              >
                {c.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
