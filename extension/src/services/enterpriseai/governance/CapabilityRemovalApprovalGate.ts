import { type CapabilityRemovalApprovalRecord } from '../models/Propagation';
import { CapabilityRemovalApprovalStore } from '../persistence/CapabilityRemovalApprovalStore';

export interface CapabilityRemovalApprovalGateInput {
  runId?: string;
  changeSetId: string;
  capabilities: readonly string[];
}

export type CapabilityRemovalApprovalStatus = 'approved' | 'missing' | 'rejected' | 'run_mismatch';

export interface CapabilityRemovalApprovalEvaluation {
  capability: string;
  changeSetId: string;
  status: CapabilityRemovalApprovalStatus;
  record?: CapabilityRemovalApprovalRecord;
  reason: string;
}

export interface CapabilityRemovalApprovalGateResult {
  allowed: boolean;
  evaluations: readonly CapabilityRemovalApprovalEvaluation[];
  blockedCapabilities: readonly string[];
}

function normalizeCapabilities(capabilities: readonly string[]): readonly string[] {
  return Array.from(
    new Set(
      capabilities
        .map((capability: string): string => capability.trim())
        .filter((capability: string): boolean => capability.length > 0)
    )
  );
}

function describeEvaluation(evaluation: CapabilityRemovalApprovalEvaluation): string {
  return `${evaluation.capability}: ${evaluation.reason}`;
}

export class CapabilityRemovalApprovalGate {
  constructor(
    private readonly store: CapabilityRemovalApprovalStore = new CapabilityRemovalApprovalStore()
  ) {}

  public async evaluate(
    input: CapabilityRemovalApprovalGateInput
  ): Promise<CapabilityRemovalApprovalGateResult> {
    const capabilities = normalizeCapabilities(input.capabilities);

    if (capabilities.length < 1) {
      return {
        allowed: true,
        evaluations: [],
        blockedCapabilities: [],
      };
    }

    const recordsByCapability = await this.loadRecordsByCapability(input.changeSetId);
    const evaluations = capabilities.map(
      (capability: string): CapabilityRemovalApprovalEvaluation =>
        this.evaluateCapabilityWithRecord(
          input,
          capability,
          recordsByCapability.get(capability) ?? null
        )
    );

    const blockedCapabilities = evaluations
      .filter(
        (evaluation: CapabilityRemovalApprovalEvaluation): boolean =>
          evaluation.status !== 'approved'
      )
      .map((evaluation: CapabilityRemovalApprovalEvaluation): string => evaluation.capability);

    return {
      allowed: blockedCapabilities.length === 0,
      evaluations,
      blockedCapabilities,
    };
  }

  public async assertApproved(
    input: CapabilityRemovalApprovalGateInput
  ): Promise<CapabilityRemovalApprovalGateResult> {
    const result = await this.evaluate(input);

    if (!result.allowed) {
      const reasons = result.evaluations
        .filter(
          (evaluation: CapabilityRemovalApprovalEvaluation): boolean =>
            evaluation.status !== 'approved'
        )
        .map((evaluation: CapabilityRemovalApprovalEvaluation): string =>
          describeEvaluation(evaluation)
        )
        .join('; ');

      throw new Error(`VAL_REMOVAL_APPROVAL_MISSING: ${reasons}`);
    }

    return result;
  }

  public async hasApprovedRecord(
    changeSetId: string,
    capability: string,
    runId?: string
  ): Promise<boolean> {
    const recordsByCapability = await this.loadRecordsByCapability(changeSetId);
    const evaluation = this.evaluateCapabilityWithRecord(
      {
        runId,
        changeSetId,
        capabilities: [capability],
      },
      capability,
      recordsByCapability.get(capability) ?? null
    );

    return evaluation.status === 'approved';
  }

  private async loadRecordsByCapability(
    changeSetId: string
  ): Promise<ReadonlyMap<string, CapabilityRemovalApprovalRecord>> {
    const records = await this.store.listByChangeSetId(changeSetId);
    const recordsByCapability = new Map<string, CapabilityRemovalApprovalRecord>();
    for (const record of records) {
      if (!recordsByCapability.has(record.capabilityAffected)) {
        recordsByCapability.set(record.capabilityAffected, record);
      }
    }
    return recordsByCapability;
  }

  private evaluateCapabilityWithRecord(
    input: CapabilityRemovalApprovalGateInput,
    capability: string,
    record: CapabilityRemovalApprovalRecord | null
  ): CapabilityRemovalApprovalEvaluation {
    if (!record) {
      return {
        capability,
        changeSetId: input.changeSetId,
        status: 'missing',
        reason: `approval record not found for changeSetId=${input.changeSetId}`,
      };
    }

    if (input.runId && record.runId !== input.runId) {
      return {
        capability,
        changeSetId: input.changeSetId,
        status: 'run_mismatch',
        record,
        reason: `record runId (${record.runId}) does not match expected runId (${input.runId})`,
      };
    }

    if (record.decision !== 'approved') {
      return {
        capability,
        changeSetId: input.changeSetId,
        status: 'rejected',
        record,
        reason: `explicit decision is ${record.decision}`,
      };
    }

    return {
      capability,
      changeSetId: input.changeSetId,
      status: 'approved',
      record,
      reason: `approved by ${record.approver} at ${record.decisionAt}`,
    };
  }
}
