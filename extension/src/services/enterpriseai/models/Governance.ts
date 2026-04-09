export const EAI_REFERENCE_TYPES = [
  'eai_cli_docs',
  'vertical_template_docs',
  'deployment_repo_docs',
] as const;

export type EaiReferenceType = (typeof EAI_REFERENCE_TYPES)[number];

export const EAI_REFERENCE_AVAILABILITY_STATUSES = [
  'external_available',
  'external_unavailable',
  'local_only',
] as const;

export type EaiReferenceAvailabilityStatus = (typeof EAI_REFERENCE_AVAILABILITY_STATUSES)[number];

export const ARCHITECTURE_DECISION_STATUSES = [
  'draft',
  'presented',
  'awaiting_approval',
  'approved',
  'rejected',
  'revised',
] as const;

export type ArchitectureDecisionStatus = (typeof ARCHITECTURE_DECISION_STATUSES)[number];

export interface EaiReferenceSource {
  referenceId: string;
  referenceType: EaiReferenceType;
  localFallbackPath: string;
  externalSourceUrl?: string;
  availabilityStatus: EaiReferenceAvailabilityStatus;
  lastCheckedAt: string;
  versionTag?: string;
}

export interface ArchitectureDecision {
  decisionId: string;
  runId: string;
  sequenceNumber: number;
  decisionPrompt: string;
  optionsJson: readonly string[];
  status: ArchitectureDecisionStatus;
  selectedOption?: string;
  rationale?: string;
  presentedAt?: string;
  respondedAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function isEaiReferenceType(value: unknown): value is EaiReferenceType {
  return typeof value === 'string' && EAI_REFERENCE_TYPES.includes(value as EaiReferenceType);
}

export function isEaiReferenceAvailabilityStatus(
  value: unknown
): value is EaiReferenceAvailabilityStatus {
  return (
    typeof value === 'string' &&
    EAI_REFERENCE_AVAILABILITY_STATUSES.includes(value as EaiReferenceAvailabilityStatus)
  );
}

export function isArchitectureDecisionStatus(value: unknown): value is ArchitectureDecisionStatus {
  return (
    typeof value === 'string' &&
    ARCHITECTURE_DECISION_STATUSES.includes(value as ArchitectureDecisionStatus)
  );
}

export function validateEaiReferenceSource(source: EaiReferenceSource): ValidationResult {
  const errors: string[] = [];

  if (!source.referenceId.trim()) {
    errors.push('referenceId is required.');
  }

  if (!isEaiReferenceType(source.referenceType)) {
    errors.push('referenceType is invalid.');
  }

  if (!source.localFallbackPath.startsWith('.specify/references/eai/')) {
    errors.push('localFallbackPath must start with .specify/references/eai/.');
  }

  if (!isEaiReferenceAvailabilityStatus(source.availabilityStatus)) {
    errors.push('availabilityStatus is invalid.');
  }

  if (!isIsoTimestamp(source.lastCheckedAt)) {
    errors.push('lastCheckedAt must be an ISO8601 timestamp.');
  }

  if (source.availabilityStatus === 'external_available' && !source.externalSourceUrl) {
    errors.push('externalSourceUrl is required when availabilityStatus=external_available.');
  }

  if (
    source.externalSourceUrl &&
    !source.externalSourceUrl.startsWith('http://') &&
    !source.externalSourceUrl.startsWith('https://')
  ) {
    errors.push('externalSourceUrl must use http:// or https:// when provided.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateArchitectureDecision(decision: ArchitectureDecision): ValidationResult {
  const errors: string[] = [];

  if (!decision.decisionId.trim()) {
    errors.push('decisionId is required.');
  }

  if (!decision.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!Number.isInteger(decision.sequenceNumber) || decision.sequenceNumber < 1) {
    errors.push('sequenceNumber must be a positive integer.');
  }

  if (!decision.decisionPrompt.trim()) {
    errors.push('decisionPrompt is required.');
  }

  if (decision.optionsJson.length < 1) {
    errors.push('optionsJson must include at least one option.');
  }

  if (!isArchitectureDecisionStatus(decision.status)) {
    errors.push('status is invalid.');
  }

  if (decision.presentedAt && !isIsoTimestamp(decision.presentedAt)) {
    errors.push('presentedAt must be an ISO8601 timestamp when provided.');
  }

  if (decision.respondedAt && !isIsoTimestamp(decision.respondedAt)) {
    errors.push('respondedAt must be an ISO8601 timestamp when provided.');
  }

  if ((decision.status === 'approved' || decision.status === 'rejected') && !decision.respondedAt) {
    errors.push('respondedAt is required when status is approved or rejected.');
  }

  if (decision.status === 'approved' && !decision.selectedOption) {
    errors.push('selectedOption is required when status is approved.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateSingleAwaitingApproval(
  decisions: readonly ArchitectureDecision[]
): ValidationResult {
  const awaiting = decisions.filter((decision) => decision.status === 'awaiting_approval');

  if (awaiting.length <= 1) {
    return {
      valid: true,
      errors: [],
    };
  }

  return {
    valid: false,
    errors: ['Only one ArchitectureDecision may be awaiting_approval per run.'],
  };
}
