import { describe, expect, it } from 'vitest';
import { CREW } from '../config/crew';
import { assessCrewMember } from './assess';
import { missionDose } from './missionDose';
import { signalDelay } from './planets';
import { buildReport } from './report';
import { createSimulator } from './simulator';

const NOW = Date.parse('2026-11-15T03:00:00Z');

describe('report for mission control', () => {
  const sims = CREW.map((crew) => createSimulator({ crew }));
  const crew = sims.map((sim) => assessCrewMember(sim, NOW));
  const sols = Object.fromEntries(sims.map((s) => [s.crew.id, s.recentSols(NOW, 8).slice(0, -1)]));

  it('has every crew member with their seven indicators and last sols', () => {
    const r = buildReport({ at: NOW, crew, sols, done: {}, dose: missionDose(NOW), delay: signalDelay(NOW) });
    expect(r.crew.map((c) => c.name)).toEqual(CREW.map((c) => c.name));
    for (const c of r.crew) {
      expect(c.indicators).toHaveLength(7);
      expect(c.sols).toHaveLength(7);
    }
    expect(r.subtitle).toContain('Gale Crater');
    expect(r.notes[0]).toContain('not for medical use');
    expect(r.fileName).toMatch(/^pulsar-report-sol\d+-\d{4}\.pdf$/);
    expect(r.habitat.find(([k]) => k === 'Signal to Earth')![1]).toContain('min');
  });

  it('says which alerts were marked as done, and the demo scenario', () => {
    const storm = { ...crew[0]!, alerts: [{ rule: 'radiation.storm' as const, indicator: 'radiation' as const, status: 'act' as const, action: { title: 'Take shelter', steps: [] } }] };
    const r = buildReport({
      at: NOW,
      crew: [storm],
      sols,
      done: { [storm.crew.id]: { 'radiation.storm': NOW - 60_000 } },
      dose: missionDose(NOW),
      delay: signalDelay(NOW),
      scenario: 'Solar storm (real data)',
    });
    expect(r.crew[0]!.alerts[0]!.done).toMatch(/^Done at \d\d:\d\d LMST$/);
    expect(r.notes.join(' ')).toContain('Solar storm');
  });
});

describe('report time', () => {
  it('a report sent on the hour reads on the hour', async () => {
    const { reportAt } = await import('./transmissions');
    const r = reportAt(NOW, 6, 137.4417);
    const sims = CREW.map((crew) => createSimulator({ crew }));
    const report = buildReport({
      at: r.sentAt,
      crew: sims.map((s) => assessCrewMember(s, r.sentAt)),
      sols: {},
      done: {},
      dose: missionDose(r.sentAt),
      delay: signalDelay(r.sentAt),
    });
    expect(report.subtitle).toContain(`${String(r.hour % 24).padStart(2, '0')}:00 LMST`);
  });
});
