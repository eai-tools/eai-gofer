import { describe, expect, it } from 'vitest';
import {
  ContextHealthMonitor,
  type ContextBudgetWarningNotice,
} from '../../../extension/src/autonomous/ContextHealthMonitor';
import {
  evaluateStageConcisenessThreshold,
  getDefaultProfile,
} from '../../../extension/src/autonomous/StageContextProfile';

describe('enterpriseai context-budget warning (root integration)', () => {
  it('emits a context-budget warning when utilization crosses the critical threshold', () => {
    const monitor = new ContextHealthMonitor({ autoHandoffEnabled: false });
    const warnings: ContextBudgetWarningNotice[] = [];

    monitor.on('context-budget-warning', (warning: ContextBudgetWarningNotice): void => {
      warnings.push(warning);
    });

    monitor.analyzeContext({
      breakdown: { conversation: 60000 },
      stage: 'implement',
      dataSource: 'real',
    });

    monitor.analyzeContext({
      breakdown: { conversation: 90000 },
      stage: 'implement',
      dataSource: 'real',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].warning).toBe(true);
    expect(warnings[0].status.stage).toBe('implement');
    expect(warnings[0].message.toLowerCase()).toContain('concise');

    monitor.dispose();
  });

  it('flags conciseness-threshold risk when stage conversation budget is too low', () => {
    const constrainedProfile = {
      ...getDefaultProfile('implement'),
      researchBudget: 0.35,
      memoryBudget: 0.3,
      codeBudget: 0.25,
      observationWindow: 10,
    };

    const constrainedResult = evaluateStageConcisenessThreshold(constrainedProfile, 0.15);
    expect(constrainedResult.warning).toBe(true);
    expect(constrainedResult.message).toContain('Conciseness threshold');

    const defaultResult = evaluateStageConcisenessThreshold(getDefaultProfile('implement'), 0.15);
    expect(defaultResult.warning).toBe(false);
  });
});
