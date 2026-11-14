import { useEffect, useMemo, useState } from 'react';
import { CURIOSITY_LANDING_MS, RAD_REPLAY } from '../config/radiation';
import { MISSION } from '../config/mission';
import sep2017 from '../data/donkiSep2017.json';
import { donkiDate, parseDonki, type DonkiResponses, type SpaceWeatherEvent } from '../logic/donki';
import { msAtMissionSolDate } from '../logic/marsTime';

const KINDS = ['CME', 'SEP', 'GST', 'IPS'] as const;
const LIVE_DAYS = 30;
const REFRESH_MS = 60 * 60_000;

export type SpaceWeather =
  | { mode: 'live'; status: 'loading' | 'ok' | 'error'; events: SpaceWeatherEvent[]; now: number }
  | { mode: 'replay'; status: 'ok'; events: SpaceWeatherEvent[]; now: number };

/** When the September 2017 particles reached Gale, by RAD (UTC ms). */
const REPLAY_ONSET_MS = msAtMissionSolDate(RAD_REPLAY.sep2017Onset, CURIOSITY_LANDING_MS, MISSION.site.eastLongitudeDeg);
const REPLAY_EVENTS = parseDonki(sep2017 as DonkiResponses);

/**
 * Space weather: live from DONKI through the Pulsar server (which adds the NASA
 * key), or, while the September 2017 event is replayed, DONKI's record of those
 * days with the clock set to the matching moment of 2017.
 */
export function useSpaceWeather(nowMs: number, replayStartMs: number | null): SpaceWeather {
  const [live, setLive] = useState<{ status: 'loading' | 'ok' | 'error'; events: SpaceWeatherEvent[] }>({
    status: 'loading',
    events: [],
  });
  const today = donkiDate(nowMs);
  const hour = Math.floor(nowMs / REFRESH_MS);

  useEffect(() => {
    if (replayStartMs !== null) return;
    const controller = new AbortController();
    const start = donkiDate(nowMs - LIVE_DAYS * 86_400_000);
    Promise.all(
      KINDS.map(async (kind) => {
        const res = await fetch(`/api/donki/${kind}?startDate=${start}&endDate=${today}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`DONKI ${kind}: HTTP ${res.status}`);
        const text = await res.text();
        return [kind, text.trim() ? JSON.parse(text) : []] as const;
      }),
    )
      .then((entries) => setLive({ status: 'ok', events: parseDonki(Object.fromEntries(entries) as DonkiResponses) }))
      .catch((err: unknown) => {
        if ((err as Error).name !== 'AbortError') setLive((prev) => ({ status: prev.events.length ? 'ok' : 'error', events: prev.events }));
      });
    return () => controller.abort();
    // Refetch once per hour (the server caches DONKI for an hour too).
  }, [replayStartMs, today, hour]);

  return useMemo<SpaceWeather>(() => {
    if (replayStartMs === null) return { mode: 'live', ...live, now: nowMs };
    const now = REPLAY_ONSET_MS + (nowMs - replayStartMs);
    return { mode: 'replay', status: 'ok', events: REPLAY_EVENTS.filter((e) => e.time <= now), now };
  }, [replayStartMs, live, nowMs]);
}
