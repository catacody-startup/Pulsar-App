import { useCallback, useState } from 'react';
import { DEFAULT_SCENARIO_ID, SCENARIOS, type Scenario } from '../config/scenarios';

const PARAM = 'scenario';

function fromUrl(): string {
  const id = new URLSearchParams(window.location.search).get(PARAM);
  return SCENARIOS.some((s) => s.id === id) ? id! : DEFAULT_SCENARIO_ID;
}

/**
 * Demo scenario in play, kept in the URL (?scenario=solar-storm) so a demo can
 * be shared as a link. Its events are anchored at the moment it was chosen.
 */
export function useScenario(): { scenario: Scenario; anchorMs: number; choose: (id: string) => void } {
  const [state, setState] = useState(() => ({ id: fromUrl(), anchorMs: Date.now() }));
  const choose = useCallback((id: string) => {
    setState({ id, anchorMs: Date.now() });
    const url = new URL(window.location.href);
    if (id === DEFAULT_SCENARIO_ID) url.searchParams.delete(PARAM);
    else url.searchParams.set(PARAM, id);
    window.history.replaceState(null, '', url);
  }, []);
  const scenario = SCENARIOS.find((s) => s.id === state.id) ?? SCENARIOS[0]!;
  return { scenario, anchorMs: state.anchorMs, choose };
}
