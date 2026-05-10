import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CapabilityRemovalApprovalStore } from '../../../services/enterpriseai/persistence/CapabilityRemovalApprovalStore';
import { type CapabilityRemovalApprovalRecord } from '../../../services/enterpriseai/models/Propagation';

suite('enterpriseai capability removal approval persistence', () => {
  const fixturesDir = path.join(__dirname, 'fixtures-capability-approval-store');
  const storagePath = path.join(fixturesDir, 'capability-removal-approvals.jsonl');
  let store: CapabilityRemovalApprovalStore;

  setup(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
    store = new CapabilityRemovalApprovalStore(storagePath);
  });

  teardown(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  test('round-trips required CapabilityRemovalApprovalRecord fields', async () => {
    const record: CapabilityRemovalApprovalRecord = {
      approvalRecordId: 'approval_001',
      runId: 'run_001',
      changeSetId: 'chg_001',
      capabilityAffected: 'provider-routing-codex',
      decision: 'approved',
      approver: 'student@university.edu',
      decisionAt: new Date().toISOString(),
      changeSetSummary: 'Keep legacy provider routing compatibility intact.',
      decisionRationale: 'No capability removals allowed without explicit approval.',
    };

    await store.save(record);

    const saved = await store.find(record.changeSetId, record.capabilityAffected);
    assert.ok(saved);
    assert.strictEqual(saved?.approvalRecordId, record.approvalRecordId);
    assert.strictEqual(saved?.runId, record.runId);
    assert.strictEqual(saved?.approver, record.approver);
    assert.strictEqual(saved?.decision, record.decision);
    assert.strictEqual(saved?.changeSetSummary, record.changeSetSummary);

    const byRun = await store.listByRunId(record.runId);
    assert.strictEqual(byRun.length, 1);
  });
});
