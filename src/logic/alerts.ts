/**
 * "What do I do now?": an alert with a concrete action for every indicator
 * that is not ok, the most urgent first.
 */
import { ACTIONS, type Action, type AlertRuleId } from '../config/actions';
import { overallStatus, type IndicatorResult } from './indicators';
import type { IndicatorId } from './types';

export interface Alert {
  rule: AlertRuleId;
  indicator: IndicatorId;
  status: 'watch' | 'act';
  action: Action;
}

export function buildAlerts(results: readonly IndicatorResult[]): Alert[] {
  return overallStatus(results).flagged.map((r) => {
    const rule = r.rule as AlertRuleId;
    return { rule, indicator: r.id, status: r.status as 'watch' | 'act', action: ACTIONS[rule] };
  });
}
