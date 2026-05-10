import {
  type ArchitectureDecision,
  validateArchitectureDecision,
  validateSingleAwaitingApproval,
} from '../models/Governance';

export type ArchitectureDecisionDiscussionSpeaker = 'assistant' | 'user';

export interface ArchitectureDecisionDiscussionEntry {
  decisionId: string;
  speaker: ArchitectureDecisionDiscussionSpeaker;
  message: string;
  discussedAt: string;
}

export interface ArchitectureDecisionPresentation {
  decision: ArchitectureDecision;
  discussionHistory: readonly ArchitectureDecisionDiscussionEntry[];
  explicitApprovalRequired: true;
  lockState: 'awaiting_explicit_decision';
}

export interface ArchitectureDecisionGateState {
  runId: string;
  currentDecisionId: string | null;
  pendingDecisionIds: readonly string[];
  canProceedToLockIn: boolean;
}

function ensureNonEmpty(value: string, label: string): void {
  if (!value.trim()) {
    throw new Error(`${label} is required.`);
  }
}

function cloneDecision(decision: ArchitectureDecision): ArchitectureDecision {
  return {
    ...decision,
    optionsJson: [...decision.optionsJson],
  };
}

function toIsoTimestamp(): string {
  return new Date().toISOString();
}

function canBePresented(status: ArchitectureDecision['status']): boolean {
  return status === 'draft' || status === 'presented' || status === 'revised';
}

export class ArchitectureDecisionGate {
  private readonly decisionsByRunId: Map<string, ArchitectureDecision[]> = new Map();
  private readonly discussionByDecisionId: Map<string, ArchitectureDecisionDiscussionEntry[]> =
    new Map();

  public initializeRun(runId: string, decisions: readonly ArchitectureDecision[]): void {
    ensureNonEmpty(runId, 'runId');
    this.validateRunDecisions(runId, decisions);

    const sorted = [...decisions]
      .map((decision) => cloneDecision(decision))
      .sort((left, right) => left.sequenceNumber - right.sequenceNumber);

    this.decisionsByRunId.set(runId, sorted);
  }

  public presentNextDecision(runId: string): ArchitectureDecisionPresentation | null {
    const decisions = this.getRunDecisions(runId);
    if (!decisions) {
      return null;
    }

    const awaiting = decisions.find((decision) => decision.status === 'awaiting_approval');
    if (awaiting) {
      return this.buildPresentation(awaiting);
    }

    const nextPending = decisions.find((decision) => decision.status !== 'approved');
    if (!nextPending) {
      return null;
    }

    if (nextPending.status === 'rejected') {
      throw new Error(
        `Decision ${nextPending.decisionId} is rejected and must be revised before lock-in can proceed.`
      );
    }

    if (!canBePresented(nextPending.status)) {
      throw new Error(
        `Decision ${nextPending.decisionId} cannot be presented from status ${nextPending.status}.`
      );
    }

    nextPending.status = 'awaiting_approval';
    nextPending.presentedAt = toIsoTimestamp();
    nextPending.respondedAt = undefined;
    nextPending.selectedOption = undefined;

    this.assertSingleAwaiting(decisions);
    return this.buildPresentation(nextPending);
  }

  public addDiscussion(
    runId: string,
    decisionId: string,
    speaker: ArchitectureDecisionDiscussionSpeaker,
    message: string
  ): ArchitectureDecisionDiscussionEntry {
    ensureNonEmpty(decisionId, 'decisionId');
    ensureNonEmpty(message, 'message');

    const decision = this.findDecisionOrThrow(runId, decisionId);
    if (decision.status !== 'awaiting_approval') {
      throw new Error(`Decision ${decisionId} must be awaiting approval to record discussion.`);
    }

    const entry: ArchitectureDecisionDiscussionEntry = {
      decisionId,
      speaker,
      message: message.trim(),
      discussedAt: toIsoTimestamp(),
    };

    const existing = this.discussionByDecisionId.get(decisionId) ?? [];
    existing.push(entry);
    this.discussionByDecisionId.set(decisionId, existing);

    return { ...entry };
  }

  public lockDecision(
    runId: string,
    decisionId: string,
    approved: boolean,
    selectedOption?: string,
    rationale?: string
  ): ArchitectureDecision {
    ensureNonEmpty(decisionId, 'decisionId');
    const decision = this.findDecisionOrThrow(runId, decisionId);

    if (decision.status !== 'awaiting_approval') {
      throw new Error(`Decision ${decisionId} is not awaiting explicit approval.`);
    }

    if (approved) {
      const chosenOption = selectedOption?.trim() ?? '';
      ensureNonEmpty(chosenOption, 'selectedOption');
      if (!decision.optionsJson.includes(chosenOption)) {
        throw new Error(`selectedOption must be one of the presented options for ${decisionId}.`);
      }
      decision.status = 'approved';
      decision.selectedOption = chosenOption;
    } else {
      decision.status = 'rejected';
      decision.selectedOption = undefined;
    }

    decision.rationale = rationale?.trim() ? rationale.trim() : undefined;
    decision.respondedAt = toIsoTimestamp();

    const validation = validateArchitectureDecision(decision);
    if (!validation.valid) {
      throw new Error(`Decision ${decisionId} is invalid: ${validation.errors.join('; ')}`);
    }

    const runDecisions = this.getRunDecisionsOrThrow(runId);
    this.assertSingleAwaiting(runDecisions);

    return cloneDecision(decision);
  }

  public getRunState(runId: string): ArchitectureDecisionGateState {
    const decisions = this.getRunDecisions(runId) ?? [];
    const pendingDecisionIds = decisions
      .filter((decision) => decision.status !== 'approved')
      .map((decision) => decision.decisionId);
    const currentDecision = decisions.find((decision) => decision.status === 'awaiting_approval');

    return {
      runId,
      currentDecisionId: currentDecision?.decisionId ?? null,
      pendingDecisionIds,
      canProceedToLockIn: pendingDecisionIds.length === 0,
    };
  }

  public listDecisions(runId: string): readonly ArchitectureDecision[] {
    const decisions = this.getRunDecisions(runId) ?? [];
    return decisions.map((decision) => cloneDecision(decision));
  }

  public getDiscussionLog(decisionId: string): readonly ArchitectureDecisionDiscussionEntry[] {
    const entries = this.discussionByDecisionId.get(decisionId) ?? [];
    return entries.map((entry) => ({ ...entry }));
  }

  private buildPresentation(decision: ArchitectureDecision): ArchitectureDecisionPresentation {
    return {
      decision: cloneDecision(decision),
      discussionHistory: this.getDiscussionLog(decision.decisionId),
      explicitApprovalRequired: true,
      lockState: 'awaiting_explicit_decision',
    };
  }

  private validateRunDecisions(runId: string, decisions: readonly ArchitectureDecision[]): void {
    const seenSequences = new Set<number>();

    for (const decision of decisions) {
      if (decision.runId !== runId) {
        throw new Error(`Decision ${decision.decisionId} does not belong to run ${runId}.`);
      }

      const validation = validateArchitectureDecision(decision);
      if (!validation.valid) {
        throw new Error(
          `Decision ${decision.decisionId} is invalid: ${validation.errors.join('; ')}`
        );
      }

      if (seenSequences.has(decision.sequenceNumber)) {
        throw new Error(`Duplicate sequenceNumber ${decision.sequenceNumber} for run ${runId}.`);
      }
      seenSequences.add(decision.sequenceNumber);
    }

    this.assertSingleAwaiting(decisions);
  }

  private assertSingleAwaiting(decisions: readonly ArchitectureDecision[]): void {
    const validation = validateSingleAwaitingApproval(decisions);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }
  }

  private getRunDecisions(runId: string): ArchitectureDecision[] | undefined {
    ensureNonEmpty(runId, 'runId');
    return this.decisionsByRunId.get(runId);
  }

  private getRunDecisionsOrThrow(runId: string): ArchitectureDecision[] {
    const decisions = this.getRunDecisions(runId);
    if (!decisions) {
      throw new Error(`No architecture decisions initialized for run ${runId}.`);
    }

    return decisions;
  }

  private findDecisionOrThrow(runId: string, decisionId: string): ArchitectureDecision {
    const decisions = this.getRunDecisionsOrThrow(runId);
    const decision = decisions.find((candidate) => candidate.decisionId === decisionId);

    if (!decision) {
      throw new Error(`Decision ${decisionId} was not found for run ${runId}.`);
    }

    return decision;
  }
}
