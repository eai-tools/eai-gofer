import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { validateInternalApiPayload } from '../contracts/InternalApiSchemas';

export interface RequestArchitectureDecisionRequest {
  runId: string;
  decisionId: string;
  title: string;
  options: readonly string[];
  requiresExplicitApproval: boolean;
}

export interface RequestArchitectureDecisionResponse {
  status: 'pending_approval';
  approvalToken: string;
  presentedDecisionCount: number;
  nextAction: 'await_user_approval';
}

export interface ArchitectureDecisionRequestedEventPayload {
  eventId: string;
  runId: string;
  decisionId: string;
  title: string;
  options: readonly string[];
  requiresExplicitApproval: boolean;
}

export interface RequestArchitectureDecisionEvent {
  contractId: 'EVT-002';
  eventName: 'governance.architecture-decision.requested.v1';
  payload: ArchitectureDecisionRequestedEventPayload;
}

export interface RequestArchitectureDecisionResult {
  contractId: 'IAP-002';
  operationName: 'governance.requestArchitectureDecision';
  response: RequestArchitectureDecisionResponse;
  emittedEvent: RequestArchitectureDecisionEvent;
}

export interface RequestArchitectureDecisionOptions {
  eventId?: string;
  requestedAt?: string;
  approvalToken?: string;
  presentedDecisionCount?: number;
  eventPublisher?: (payload: ArchitectureDecisionRequestedEventPayload) => void;
}

const APPROVAL_TOKEN_PREFIX = 'appr';
const APPROVAL_TOKEN_NONCE_LENGTH = 32;
const APPROVAL_TOKEN_SIGNATURE_LENGTH = 32;
const APPROVAL_TOKEN_SECRET = randomBytes(32);
const issuedApprovalTokens = new Set<string>();

function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

function buildEventId(prefix: string, isoTimestamp: string): string {
  return `${prefix}_${isoTimestamp.replace(/[-:.TZ]/g, '')}`;
}

function buildApprovalTokenSignature(runId: string, decisionId: string, nonce: string): string {
  return createHmac('sha256', APPROVAL_TOKEN_SECRET)
    .update(`${runId}:${decisionId}:${nonce}`)
    .digest('hex')
    .slice(0, APPROVAL_TOKEN_SIGNATURE_LENGTH);
}

function buildApprovalToken(runId: string, decisionId: string): string {
  const nonce = randomBytes(APPROVAL_TOKEN_NONCE_LENGTH / 2).toString('hex');
  const signature = buildApprovalTokenSignature(runId, decisionId, nonce);
  return `${APPROVAL_TOKEN_PREFIX}_${nonce}_${signature}`;
}

function buildApprovalTokenKey(approvalToken: string, runId: string, decisionId: string): string {
  return `${runId}:${decisionId}:${approvalToken}`;
}

function parseApprovalToken(approvalToken: string): { nonce: string; signature: string } | null {
  const tokenMatch = approvalToken.match(
    new RegExp(
      `^${APPROVAL_TOKEN_PREFIX}_([a-f0-9]{${APPROVAL_TOKEN_NONCE_LENGTH}})_([a-f0-9]{${APPROVAL_TOKEN_SIGNATURE_LENGTH}})$`
    )
  );
  if (!tokenMatch) {
    return null;
  }

  return {
    nonce: tokenMatch[1],
    signature: tokenMatch[2],
  };
}

export function validateApprovalTokenForDecision(
  approvalToken: string,
  runId: string,
  decisionId: string
): boolean {
  const parsedToken = parseApprovalToken(approvalToken);
  if (!parsedToken) {
    return false;
  }

  const expectedSignature = buildApprovalTokenSignature(runId, decisionId, parsedToken.nonce);
  const receivedSignature = parsedToken.signature;
  if (expectedSignature.length !== receivedSignature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature));
}

export function registerApprovalTokenForDecision(
  approvalToken: string,
  runId: string,
  decisionId: string
): void {
  issuedApprovalTokens.add(buildApprovalTokenKey(approvalToken, runId, decisionId));
}

export function consumeApprovalTokenForDecision(
  approvalToken: string,
  runId: string,
  decisionId: string
): boolean {
  if (!validateApprovalTokenForDecision(approvalToken, runId, decisionId)) {
    return false;
  }

  const tokenKey = buildApprovalTokenKey(approvalToken, runId, decisionId);
  if (!issuedApprovalTokens.has(tokenKey)) {
    return false;
  }

  issuedApprovalTokens.delete(tokenKey);
  return true;
}

function assertDecisionOptions(options: readonly string[]): void {
  if (options.length < 1) {
    throw new Error('IAP-002 payload validation failed: options must include at least one choice.');
  }

  const hasInvalidOption = options.some((entry) => !entry.trim());
  if (hasInvalidOption) {
    throw new Error('IAP-002 payload validation failed: options must contain non-empty strings.');
  }
}

function assertValidInternalApiPayload(payload: RequestArchitectureDecisionRequest): void {
  const validation = validateInternalApiPayload('IAP-002', payload);
  if (!validation.valid) {
    throw new Error(`IAP-002 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function assertValidEventPayload(payload: ArchitectureDecisionRequestedEventPayload): void {
  const validation = validateEventPayload('EVT-002', payload);
  if (!validation.valid) {
    throw new Error(`EVT-002 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function getPresentedDecisionCount(value: number | undefined): number {
  if (typeof value !== 'number') {
    return 1;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('presentedDecisionCount must be a positive integer.');
  }

  return value;
}

export function requestArchitectureDecision(
  request: RequestArchitectureDecisionRequest,
  options: RequestArchitectureDecisionOptions = {}
): RequestArchitectureDecisionResult {
  assertValidInternalApiPayload(request);
  assertDecisionOptions(request.options);

  const requestedAt = options.requestedAt ?? toIsoTimestamp();
  const eventPayload: ArchitectureDecisionRequestedEventPayload = {
    eventId: options.eventId ?? buildEventId('evt_002', requestedAt),
    runId: request.runId,
    decisionId: request.decisionId,
    title: request.title,
    options: [...request.options],
    requiresExplicitApproval: request.requiresExplicitApproval,
  };
  assertValidEventPayload(eventPayload);

  const approvalToken =
    options.approvalToken ?? buildApprovalToken(request.runId, request.decisionId);
  if (!validateApprovalTokenForDecision(approvalToken, request.runId, request.decisionId)) {
    throw new Error(
      'GOV_APPROVAL_TOKEN_INVALID: approvalToken must be cryptographically signed for the runId and decisionId.'
    );
  }
  registerApprovalTokenForDecision(approvalToken, request.runId, request.decisionId);
  const presentedDecisionCount = getPresentedDecisionCount(options.presentedDecisionCount);

  options.eventPublisher?.(eventPayload);

  return {
    contractId: 'IAP-002',
    operationName: 'governance.requestArchitectureDecision',
    response: {
      status: 'pending_approval',
      approvalToken,
      presentedDecisionCount,
      nextAction: 'await_user_approval',
    },
    emittedEvent: {
      contractId: 'EVT-002',
      eventName: 'governance.architecture-decision.requested.v1',
      payload: eventPayload,
    },
  };
}
