import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { validateInternalApiPayload } from '../contracts/InternalApiSchemas';
import { consumeApprovalTokenForDecision } from './RequestArchitectureDecision';

export interface RecordArchitectureDecisionApprovalRequest {
  runId: string;
  approvalToken: string;
  decisionId: string;
  approved: boolean;
  approvedBy: string;
  comment?: string;
}

export type ArchitectureApprovalState = 'approved' | 'rejected';

export interface RecordArchitectureDecisionApprovalResponse {
  status: 'recorded';
  decisionId: string;
  approvalState: ArchitectureApprovalState;
  pipelineMayProceed: boolean;
}

export interface ArchitectureDecisionRecordedEventPayload {
  eventId: string;
  runId: string;
  decisionId: string;
  approvalState: ArchitectureApprovalState;
  approvedBy: string;
  recordedAt: string;
}

export interface RecordArchitectureDecisionApprovalEvent {
  contractId: 'EVT-003';
  eventName: 'governance.architecture-decision.recorded.v1';
  payload: ArchitectureDecisionRecordedEventPayload;
}

export interface RecordArchitectureDecisionApprovalResult {
  contractId: 'IAP-003';
  operationName: 'governance.recordArchitectureDecisionApproval';
  response: RecordArchitectureDecisionApprovalResponse;
  emittedEvent: RecordArchitectureDecisionApprovalEvent;
}

export interface RecordArchitectureDecisionApprovalOptions {
  eventId?: string;
  recordedAt?: string;
  eventPublisher?: (payload: ArchitectureDecisionRecordedEventPayload) => void;
}

function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

function buildEventId(prefix: string, isoTimestamp: string): string {
  return `${prefix}_${isoTimestamp.replace(/[-:.TZ]/g, '')}`;
}

function toApprovalState(approved: boolean): ArchitectureApprovalState {
  return approved ? 'approved' : 'rejected';
}

function assertValidInternalApiPayload(payload: RecordArchitectureDecisionApprovalRequest): void {
  const validation = validateInternalApiPayload('IAP-003', payload);
  if (!validation.valid) {
    throw new Error(`IAP-003 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function assertValidEventPayload(payload: ArchitectureDecisionRecordedEventPayload): void {
  const validation = validateEventPayload('EVT-003', payload);
  if (!validation.valid) {
    throw new Error(`EVT-003 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function assertValidApprovalToken(request: RecordArchitectureDecisionApprovalRequest): void {
  const isValidToken = consumeApprovalTokenForDecision(
    request.approvalToken,
    request.runId,
    request.decisionId
  );
  if (!isValidToken) {
    throw new Error(
      'GOV_APPROVAL_TOKEN_INVALID: approvalToken is invalid, reused, or not issued for the provided runId and decisionId.'
    );
  }
}

export function recordArchitectureDecisionApproval(
  request: RecordArchitectureDecisionApprovalRequest,
  options: RecordArchitectureDecisionApprovalOptions = {}
): RecordArchitectureDecisionApprovalResult {
  assertValidInternalApiPayload(request);
  assertValidApprovalToken(request);

  const recordedAt = options.recordedAt ?? toIsoTimestamp();
  const approvalState = toApprovalState(request.approved);
  const eventPayload: ArchitectureDecisionRecordedEventPayload = {
    eventId: options.eventId ?? buildEventId('evt_003', recordedAt),
    runId: request.runId,
    decisionId: request.decisionId,
    approvalState,
    approvedBy: request.approvedBy,
    recordedAt,
  };
  assertValidEventPayload(eventPayload);

  options.eventPublisher?.(eventPayload);

  return {
    contractId: 'IAP-003',
    operationName: 'governance.recordArchitectureDecisionApproval',
    response: {
      status: 'recorded',
      decisionId: request.decisionId,
      approvalState,
      pipelineMayProceed: request.approved,
    },
    emittedEvent: {
      contractId: 'EVT-003',
      eventName: 'governance.architecture-decision.recorded.v1',
      payload: eventPayload,
    },
  };
}
