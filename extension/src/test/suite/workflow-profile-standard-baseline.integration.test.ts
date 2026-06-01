import * as assert from 'assert';
import {
  WORKFLOW_PROFILES,
  isWorkflowProfile,
  normalizeWorkflowProfile,
} from '../../config/workflowProfile';

suite('Workflow Profile Defaults', () => {
  test('defaults unknown values to standard', () => {
    assert.strictEqual(normalizeWorkflowProfile(undefined), 'standard');
    assert.strictEqual(normalizeWorkflowProfile('invalid'), 'standard');
  });

  test('recognizes valid workflow profile values', () => {
    assert.strictEqual(isWorkflowProfile('standard'), true);
    assert.strictEqual(isWorkflowProfile('enterpriseai'), true);
    assert.strictEqual(isWorkflowProfile('unknown'), false);
  });

  test('exposes both supported workflow profiles', () => {
    assert.deepStrictEqual(WORKFLOW_PROFILES, ['standard', 'enterpriseai']);
  });
});
