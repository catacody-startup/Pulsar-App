import { SCENARIOS, type Scenario } from '../config/scenarios';
import { t } from '../i18n/i18n';

interface Props {
  scenario: Scenario;
  onChoose: (id: string) => void;
}

/** Demo control, outside the astronaut's interface: injects events into the simulation. */
export function DemoBar({ scenario, onChoose }: Props) {
  return (
    <div className="border-b border-dashed border-slate-700 bg-slate-900/50">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <label htmlFor="scenario" className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t('Demo · simulate')}
        </label>
        <select
          id="scenario"
          value={scenario.id}
          onChange={(e) => onChoose(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {t(s.label)}
            </option>
          ))}
        </select>
        <span className="text-slate-400">{t(scenario.description)}</span>
      </div>
    </div>
  );
}
