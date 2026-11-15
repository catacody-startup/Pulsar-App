import { ACTIONS, type AlertRuleId } from '../config/actions';
import { crewMember } from '../config/crew';
import type { FeedItem } from '../logic/habitat';
import { doneClock } from './WhatNow';

/** What the crew did in the app lately: check-ins and actions marked as done. */
export function CrewFeed({ items }: { items: FeedItem[] }) {
  return (
    <section aria-labelledby="crew-feed" className="space-y-2">
      <h2 id="crew-feed" className="text-xs font-medium uppercase tracking-widest text-slate-400">
        Latest from the crew
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing yet this sol: check-ins and actions marked as done show up here.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/60">
          {items.map((item) => {
            const name = crewMember(item.crewId)?.name.split(' ')[0] ?? item.crewId;
            const what =
              item.kind === 'checkIn'
                ? 'did the daily check-in'
                : `marked done: ${ACTIONS[item.rule as AlertRuleId]?.title.toLowerCase() ?? item.rule}`;
            return (
              <li key={`${item.kind}-${item.crewId}-${'rule' in item ? item.rule : ''}-${item.t}`} className="flex gap-3 px-4 py-2 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-slate-500">{doneClock(item.t)}</span>
                <span className="text-slate-200">
                  <span className="font-medium">{name}</span> {what}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
