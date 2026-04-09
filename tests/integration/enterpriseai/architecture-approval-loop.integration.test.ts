import { describe, expect, it } from 'vitest';
import { ArchitectureDecisionGate } from '../../../extension/src/services/enterpriseai/governance/ArchitectureDecisionGate';
import { type ArchitectureDecision } from '../../../extension/src/services/enterpriseai/models/Governance';
import { recordArchitectureDecisionApproval } from '../../../extension/src/services/enterpriseai/internalApi/RecordArchitectureDecisionApproval';
import { requestArchitectureDecision } from '../../../extension/src/services/enterpriseai/internalApi/RequestArchitectureDecision';

describe('enterpriseai architecture approval loop (root integration)', () => {
  it('enforces one-by-one decision approval flow and records EVT-003 approvals before advancing', () => {
    const runId = 'run_029_arch_approval';
    const gate = new ArchitectureDecisionGate();

    const decisions: readonly ArchitectureDecision[] = [
      {
        decisionId: 'arch-dec-01',
        runId,
        sequenceNumber: 1,
        decisionPrompt: 'Choose deployment strategy',
        optionsJson: ['feature-flagged', 'strangler', 'big-bang'],
        status: 'draft',
      },
      {
        decisionId: 'arch-dec-02',
        runId,
        sequenceNumber: 2,
        decisionPrompt: 'Choose rollout guardrail',
        optionsJson: ['canary', 'blue-green'],
        status: 'draft',
      },
    ];

    gate.initializeRun(runId, decisions);

    const firstPresentation = gate.presentNextDecision(runId);
    expect(firstPresentation?.decision.decisionId).toBe('arch-dec-01');
    expect(firstPresentation?.decision.status).toBe('awaiting_approval');

    const requestResult = requestArchitectureDecision({
      runId,
      decisionId: 'arch-dec-01',
      title: 'Choose deployment strategy',
      options: ['feature-flagged', 'strangler', 'big-bang'],
      requiresExplicitApproval: true,
    });

    expect(requestResult.response.status).toBe('pending_approval');
    expect(requestResult.emittedEvent.contractId).toBe('EVT-002');

    const approvalResult = recordArchitectureDecisionApproval({
      runId,
      approvalToken: requestResult.response.approvalToken,
      decisionId: 'arch-dec-01',
      approved: true,
      approvedBy: 'student@university.edu',
      comment: 'Use feature-flagged rollout for controlled adoption.',
    });

    expect(approvalResult.response.approvalState).toBe('approved');
    expect(approvalResult.response.pipelineMayProceed).toBe(true);
    expect(approvalResult.emittedEvent.contractId).toBe('EVT-003');

    const locked = gate.lockDecision(
      runId,
      'arch-dec-01',
      true,
      'feature-flagged',
      'Roll out safely with feature flags.'
    );
    expect(locked.status).toBe('approved');
    expect(locked.selectedOption).toBe('feature-flagged');

    const secondPresentation = gate.presentNextDecision(runId);
    expect(secondPresentation?.decision.decisionId).toBe('arch-dec-02');
    expect(secondPresentation?.decision.status).toBe('awaiting_approval');

    const runState = gate.getRunState(runId);
    expect(runState.currentDecisionId).toBe('arch-dec-02');
    expect(runState.canProceedToLockIn).toBe(false);
  });

  it('rejects approvals when approval tokens are invalid for the run/decision pair', () => {
    expect(() =>
      recordArchitectureDecisionApproval({
        runId: 'run_029_arch_approval',
        approvalToken: 'appr_deadbeef_deadbeef',
        decisionId: 'arch-dec-01',
        approved: true,
        approvedBy: 'student@university.edu',
      })
    ).toThrow(/GOV_APPROVAL_TOKEN_INVALID/);
  });

  it('rejects replayed tokens and valid-format tokens bound to a different run or decision', () => {
    const decisionRequest = requestArchitectureDecision({
      runId: 'run_029_arch_approval_security',
      decisionId: 'arch-dec-sec-01',
      title: 'Choose governance path',
      options: ['strict', 'balanced'],
      requiresExplicitApproval: true,
    });

    const approvalToken = decisionRequest.response.approvalToken;

    expect(() =>
      recordArchitectureDecisionApproval({
        runId: 'run_029_arch_approval_security',
        approvalToken,
        decisionId: 'arch-dec-sec-01',
        approved: true,
        approvedBy: 'student@university.edu',
      })
    ).not.toThrow();

    expect(() =>
      recordArchitectureDecisionApproval({
        runId: 'run_029_arch_approval_security',
        approvalToken,
        decisionId: 'arch-dec-sec-01',
        approved: true,
        approvedBy: 'student@university.edu',
      })
    ).toThrow(/GOV_APPROVAL_TOKEN_INVALID/);

    const boundDecision = requestArchitectureDecision({
      runId: 'run_029_arch_approval_security',
      decisionId: 'arch-dec-sec-02',
      title: 'Choose review strategy',
      options: ['incremental'],
      requiresExplicitApproval: true,
    });

    expect(() =>
      recordArchitectureDecisionApproval({
        runId: 'run_029_arch_approval_security_other',
        approvalToken: boundDecision.response.approvalToken,
        decisionId: 'arch-dec-sec-02',
        approved: true,
        approvedBy: 'student@university.edu',
      })
    ).toThrow(/GOV_APPROVAL_TOKEN_INVALID/);

    expect(() =>
      recordArchitectureDecisionApproval({
        runId: 'run_029_arch_approval_security',
        approvalToken: boundDecision.response.approvalToken,
        decisionId: 'arch-dec-sec-03',
        approved: true,
        approvedBy: 'student@university.edu',
      })
    ).toThrow(/GOV_APPROVAL_TOKEN_INVALID/);
  });
});
