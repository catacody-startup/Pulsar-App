/**
 * The habitat's periodic health reports to Earth: when each one is sent
 * (fixed local times) and when it arrives (one signal delay later).
 */
import { localSolDate, msAtLocalSolDate } from './marsTime';
import { signalDelay } from './planets';

export interface Transmission {
  /** When the habitat sends it, ms. */
  sentAt: number;
  /** When mission control receives it, ms. */
  arrivesAt: number;
  /** Local sol and Mars hour of sending. */
  localSol: number;
  hour: number;
}

function transmission(sentAt: number, eastLongitudeDeg: number): Transmission {
  const lsd = localSolDate(sentAt, eastLongitudeDeg);
  const localSol = Math.floor(lsd + 1e-9);
  return {
    sentAt,
    arrivesAt: sentAt + signalDelay(sentAt).oneWaySeconds * 1000,
    localSol,
    hour: Math.round((lsd - localSol) * 24),
  };
}

/** The report sent at or before `ms` (`steps` = 0), and the ones before (1, 2…) or after (−1, −2…). */
export function reportAt(ms: number, everyMarsHours: number, eastLongitudeDeg: number, steps = 0): Transmission {
  const slot = Math.floor((localSolDate(ms, eastLongitudeDeg) * 24) / everyMarsHours + 1e-9) - steps;
  return transmission(Math.round(msAtLocalSolDate((slot * everyMarsHours) / 24, eastLongitudeDeg)), eastLongitudeDeg);
}

export interface ReportSchedule {
  /** Received by mission control, newest first. */
  received: Transmission[];
  /** Sent by the habitat, still on its way. */
  inTransit?: Transmission;
  /** The next one the habitat will send. */
  next: Transmission;
}

export function reportSchedule(now: number, everyMarsHours: number, eastLongitudeDeg: number, count: number): ReportSchedule {
  const last = reportAt(now, everyMarsHours, eastLongitudeDeg);
  const next = reportAt(now, everyMarsHours, eastLongitudeDeg, -1);
  const inTransit = last.arrivesAt > now ? last : undefined;
  const received: Transmission[] = [];
  for (let k = inTransit ? 1 : 0; received.length < count; k++) received.push(reportAt(now, everyMarsHours, eastLongitudeDeg, k));
  return { received, ...(inTransit ? { inTransit } : {}), next };
}
