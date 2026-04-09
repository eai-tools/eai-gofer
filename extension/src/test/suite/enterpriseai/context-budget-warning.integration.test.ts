import * as assert from 'assert';
import {
  ContextHealthMonitor,
  type ContextBudgetWarningNotice,
} from '../../../autonomous/ContextHealthMonitor';
import {
  evaluateStageConcisenessThreshold,
  getDefaultProfile,
} from '../../../autonomous/StageContextProfile';

suite('enterpriseai context-budget warning (extension integration)', () => {
  test('emits user-visible context-budget warning payload at critical threshold crossing', () => {
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

    assert.strictEqual(warnings.length, 1);
    assert.strictEqual(warnings[0].warning, true);
    assert.strictEqual(warnings[0].status.stage, 'implement');
    assert.ok(warnings[0].message.includes('Context budget warning'));
    assert.ok(warnings[0].message.toLowerCase().includes('concise'));

    monitor.dispose();
  });

  test('flags conciseness-threshold risk for constrained stage profiles', () => {
    const constrainedProfile = {
      ...getDefaultProfile('implement'),
      researchBudget: 0.35,
      memoryBudget: 0.3,
      codeBudget: 0.25,
      observationWindow: 10,
    };

    const constrainedResult = evaluateStageConcisenessThreshold(constrainedProfile, 0.15);
    assert.strictEqual(constrainedResult.warning, true);
    assert.ok((constrainedResult.message ?? '').includes('Conciseness threshold'));

    const defaultResult = evaluateStageConcisenessThreshold(getDefaultProfile('implement'), 0.15);
    assert.strictEqual(defaultResult.warning, false);
  });
});
