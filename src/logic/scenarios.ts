import type { Scenario } from '../config/scenarios';
import { localSolDate, msAtLocalSolDate } from './marsTime';
import { floorToMinute, MINUTE_MS, type Simulator } from './simulator';
import type { SimEvent } from './types';

/**
 * Turns a scenario's relative times into simulator events, anchored at the
 * moment it was chosen. `sim` only provides the Mars calendar and sol plans.
 */
export function resolveScenario(
  scenario: Scenario,
  anchorMs: number,
  sim: Pick<Simulator, 'localSolAt' | 'solPlan'>,
  eastLongitudeDeg: number,
): SimEvent[] {
  const anchor = floorToMinute(anchorMs);
  const today = sim.localSolAt(anchor);
  const hourNow = (localSolDate(anchor, eastLongitudeDeg) - today) * 24;
  return scenario.events.map((e) => {
    let start: number;
    if (e.lastNight) {
      // The last night that is over: today's if we're past the wake-up, otherwise the one before.
      const nightEndsOn = hourNow >= sim.solPlan(today).wakeHour ? today : today - 1;
      start = msAtLocalSolDate(nightEndsOn - 1 + 18 / 24, eastLongitudeDeg);
    } else if (e.solsAgo !== undefined) {
      start = msAtLocalSolDate(today - e.solsAgo, eastLongitudeDeg);
    } else {
      start = anchor - (e.startMinutesAgo ?? 0) * MINUTE_MS;
    }
    const event: SimEvent = { kind: e.kind, start: floorToMinute(start), durationMin: e.durationMin, intensity: e.intensity };
    if (e.crewId !== undefined) event.crewId = e.crewId;
    return event;
  });
}
