import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CheckpointValidator } from '../../../autonomous/CheckpointValidator';
import { CapabilityRemovalApprovalGate } from '../../../services/enterpriseai/governance/CapabilityRemovalApprovalGate';
import { type CapabilityRemovalApprovalRecord } from '../../../services/enterpriseai/models/Propagation';
import { CapabilityRemovalApprovalStore } from '../../../services/enterpriseai/persistence/CapabilityRemovalApprovalStore';

suite('enterpriseai capability-removal approval gate (extension integration)', () => {
  const fixturesDir = path.join(__dirname, 'fixtures-capability-removal-approval-gate');
  const storagePath = path.join(
    fixturesDir,
    '.specify',
    'memory',
    'capability-removal-approvals.jsonl'
  );
  let store: CapabilityRemovalApprovalStore;
  let gate: CapabilityRemovalApprovalGate;

  setup(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
    store = new CapabilityRemovalApprovalStore(storagePath);
    gate = new CapabilityRemovalApprovalGate(store);
  });

  teardown(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  test('requires explicit approved records for each capability before release gates pass', async () => {
    const approvedRecord: CapabilityRemovalApprovalRecord = {
      approvalRecordId: 'approval_ext_001',
      runId: 'run_ext_approval',
      changeSetId: 'chg_ext_approval',
      capabilityAffected: 'provider-routing-codex',
      decision: 'approved',
      approver: 'student@university.edu',
      decisionAt: '2026-04-09T00:40:00Z',
      changeSetSummary: 'Keep codex routing capability active.',
    };

    await store.save(approvedRecord);

    const evaluation = await gate.evaluate({
      runId: 'run_ext_approval',
      changeSetId: 'chg_ext_approval',
      capabilities: ['provider-routing-codex', 'provider-routing-copilot'],
    });

    assert.strictEqual(evaluation.allowed, false);
    assert.deepStrictEqual(evaluation.blockedCapabilities, ['provider-routing-copilot']);

    await assert.rejects(
      gate.assertApproved({
        runId: 'run_ext_approval',
        changeSetId: 'chg_ext_approval',
        capabilities: ['provider-routing-codex', 'provider-routing-copilot'],
      }),
      /VAL_REMOVAL_APPROVAL_MISSING/
    );
  });

  test('integrates with CheckpointValidator release-readiness gating flow', async () => {
    const approvalRecords: CapabilityRemovalApprovalRecord[] = [
      {
        approvalRecordId: 'approval_ext_010',
        runId: 'run_ext_release',
        changeSetId: 'chg_ext_release',
        capabilityAffected: 'provider-routing-codex',
        decision: 'approved',
        approver: 'student@university.edu',
        decisionAt: '2026-04-09T00:41:00Z',
        changeSetSummary: 'Preserve codex routing capability.',
      },
      {
        approvalRecordId: 'approval_ext_011',
        runId: 'run_ext_release',
        changeSetId: 'chg_ext_release',
        capabilityAffected: 'provider-routing-copilot',
        decision: 'approved',
        approver: 'student@university.edu',
        decisionAt: '2026-04-09T00:42:00Z',
        changeSetSummary: 'Preserve copilot routing capability.',
      },
    ];

    for (const record of approvalRecords) {
      await store.save(record);
    }

    const validator = new CheckpointValidator(undefined, gate);
    const result = await validator.validateReleaseReadiness({
      specDir: path.join(
        process.cwd(),
        '..',
        '.specify',
        'specs',
        '029-enterpriseai-student-vertical-builder'
      ),
      runId: 'run_ext_release',
      changeSetId: 'chg_ext_release',
      removedCapabilities: ['provider-routing-codex', 'provider-routing-copilot'],
      requireRemovalApprovalLog: true,
    });

    assert.strictEqual(result.gatePassed, true);
    assert.deepStrictEqual(result.blockedCapabilities, []);
    assert.strictEqual(
      result.errors.some((error: string): boolean =>
        error.includes('VAL_REMOVAL_APPROVAL_MISSING')
      ),
      false
    );
  });
});
