import * as assert from 'assert';
import { normalizeWorkflowProfile } from '../../config/workflowProfile';

suite('Workflow Profile EnterpriseAI', () => {
  test('returns enterpriseai when explicitly selected', () => {
    assert.strictEqual(normalizeWorkflowProfile('enterpriseai'), 'enterpriseai');
  });

  test('keeps standard as baseline profile', () => {
    assert.strictEqual(normalizeWorkflowProfile('standard'), 'standard');
  });
});
