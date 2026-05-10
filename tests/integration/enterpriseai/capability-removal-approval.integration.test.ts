import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CheckpointValidator } from '../../../extension/src/autonomous/CheckpointValidator';
import { CapabilityRemovalApprovalGate } from '../../../extension/src/services/enterpriseai/governance/CapabilityRemovalApprovalGate';
import { type CapabilityRemovalApprovalRecord } from '../../../extension/src/services/enterpriseai/models/Propagation';
import { CapabilityRemovalApprovalStore } from '../../../extension/src/services/enterpriseai/persistence/CapabilityRemovalApprovalStore';

function createFixtureDir(prefix: string): string {
  return path.join(
    process.cwd(),
    'tests',
    'integration',
    'enterpriseai',
    `${prefix}-${process.pid}-${Date.now()}`
  );
}

describe('enterpriseai capability-removal approval gate (root integration)', () => {
  it('blocks release validation when required capability approvals are missing or rejected', async () => {
    const fixturesDir = createFixtureDir('fixtures-capability-removal-approval-blocking');
    fs.rmSync(fixturesDir, { recursive: true, force: true });

    const storePath = path.join(
      fixturesDir,
      '.specify',
      'memory',
      'capability-removal-approvals.jsonl'
    );
    const store = new CapabilityRemovalApprovalStore(storePath);
    const gate = new CapabilityRemovalApprovalGate(store);

    const approvedRecord: CapabilityRemovalApprovalRecord = {
      approvalRecordId: 'approval_approved',
      runId: 'run_029_approval',
      changeSetId: 'chg_approval_001',
      capabilityAffected: 'provider-routing-codex',
      decision: 'approved',
      approver: 'student@university.edu',
      decisionAt: '2026-04-09T00:30:00Z',
      changeSetSummary: 'Preserve codex routing while refactoring profile overlays.',
    };

    const rejectedRecord: CapabilityRemovalApprovalRecord = {
      approvalRecordId: 'approval_rejected',
      runId: 'run_029_approval',
      changeSetId: 'chg_approval_001',
      capabilityAffected: 'legacy-cli-detection',
      decision: 'rejected',
      approver: 'student@university.edu',
      decisionAt: '2026-04-09T00:31:00Z',
      changeSetSummary: 'Attempted removal of legacy CLI detection path.',
      decisionRationale: 'Capability must remain available for standard profile users.',
    };

    try {
      await store.save(approvedRecord);
      await store.save(rejectedRecord);

      const result = await gate.evaluate({
        runId: 'run_029_approval',
        changeSetId: 'chg_approval_001',
        capabilities: [
          'provider-routing-codex',
          'legacy-cli-detection',
          'provider-routing-copilot',
        ],
      });

      expect(result.allowed).toBe(false);
      expect(result.blockedCapabilities).toEqual([
        'legacy-cli-detection',
        'provider-routing-copilot',
      ]);

      await expect(
        gate.assertApproved({
          runId: 'run_029_approval',
          changeSetId: 'chg_approval_001',
          capabilities: [
            'provider-routing-codex',
            'legacy-cli-detection',
            'provider-routing-copilot',
          ],
        })
      ).rejects.toThrow(/VAL_REMOVAL_APPROVAL_MISSING/);

      const validator = new CheckpointValidator(undefined, gate);
      const releaseValidation = await validator.validateReleaseReadiness({
        specDir: path.join(
          process.cwd(),
          '.specify',
          'specs',
          '029-enterpriseai-student-vertical-builder'
        ),
        runId: 'run_029_approval',
        changeSetId: 'chg_approval_001',
        removedCapabilities: ['legacy-cli-detection', 'provider-routing-copilot'],
        requireRemovalApprovalLog: true,
      });

      expect(releaseValidation.valid).toBe(false);
      expect(
        releaseValidation.errors.some((error: string): boolean =>
          error.includes('VAL_REMOVAL_APPROVAL_MISSING')
        )
      ).toBe(true);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('passes release validation when each removed capability has approved persisted records', async () => {
    const fixturesDir = createFixtureDir('fixtures-capability-removal-approval-pass');
    fs.rmSync(fixturesDir, { recursive: true, force: true });

    const storePath = path.join(
      fixturesDir,
      '.specify',
      'memory',
      'capability-removal-approvals.jsonl'
    );
    const store = new CapabilityRemovalApprovalStore(storePath);
    const gate = new CapabilityRemovalApprovalGate(store);

    const records: CapabilityRemovalApprovalRecord[] = [
      {
        approvalRecordId: 'approval_001',
        runId: 'run_029_approval_ok',
        changeSetId: 'chg_approval_002',
        capabilityAffected: 'provider-routing-codex',
        decision: 'approved',
        approver: 'student@university.edu',
        decisionAt: '2026-04-09T00:35:00Z',
        changeSetSummary: 'Retain codex routing capability.',
      },
      {
        approvalRecordId: 'approval_002',
        runId: 'run_029_approval_ok',
        changeSetId: 'chg_approval_002',
        capabilityAffected: 'provider-routing-copilot',
        decision: 'approved',
        approver: 'student@university.edu',
        decisionAt: '2026-04-09T00:36:00Z',
        changeSetSummary: 'Retain copilot routing capability.',
      },
    ];

    try {
      for (const record of records) {
        await store.save(record);
      }

      const validator = new CheckpointValidator(undefined, gate);
      const releaseValidation = await validator.validateReleaseReadiness({
        specDir: path.join(
          process.cwd(),
          '.specify',
          'specs',
          '029-enterpriseai-student-vertical-builder'
        ),
        runId: 'run_029_approval_ok',
        changeSetId: 'chg_approval_002',
        removedCapabilities: ['provider-routing-codex', 'provider-routing-copilot'],
        requireRemovalApprovalLog: true,
      });

      expect(releaseValidation.gatePassed).toBe(true);
      expect(releaseValidation.blockedCapabilities).toEqual([]);
      expect(
        releaseValidation.errors.some((error: string) => error.includes('VAL_REMOVAL_APPROVAL'))
      ).toBe(false);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });
});
