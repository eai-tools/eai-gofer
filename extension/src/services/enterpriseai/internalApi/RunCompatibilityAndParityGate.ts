import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { validateInternalApiPayload } from '../contracts/InternalApiSchemas';
import { CapabilityRemovalApprovalGate } from '../governance/CapabilityRemovalApprovalGate';

export interface RunCompatibilityAndParityGateRequest {
  runId: string;
  checks: readonly string[];
  requireZeroRegression: boolean;
  requireRemovalApprovalLog: boolean;
  changeSetId?: string;
  removedCapabilities?: readonly string[];
}

export type CompatibilityResult = 'passed' | 'failed';

export interface RunCompatibilityAndParityGateResponse {
  status: 'completed';
  parityResult: CompatibilityResult;
  regressionResult: CompatibilityResult;
  removedCapabilitiesDetected: number;
  gatePassed: boolean;
  checksRun: readonly string[];
}

export interface CompatibilityParityCompletedEventPayload {
  eventId: string;
  runId: string;
  parityResult: CompatibilityResult;
  regressionResult: CompatibilityResult;
  removedCapabilitiesDetected: number;
}

export interface RunCompatibilityAndParityGateEvent {
  contractId: 'EVT-010';
  eventName: 'validation.compatibility-parity.completed.v1';
  payload: CompatibilityParityCompletedEventPayload;
}

export interface RunCompatibilityAndParityGateResult {
  contractId: 'IAP-010';
  operationName: 'validation.runCompatibilityAndParityGate';
  response: RunCompatibilityAndParityGateResponse;
  emittedEvent: RunCompatibilityAndParityGateEvent;
}

export interface RunCompatibilityAndParityGateOptions {
  eventId?: string;
  completedAt?: string;
  parityResult?: CompatibilityResult;
  regressionResult?: CompatibilityResult;
  removedCapabilities?: readonly string[];
  changeSetId?: string;
  capabilityRemovalApprovalGate?: CapabilityRemovalApprovalGate;
  eventPublisher?: (payload: CompatibilityParityCompletedEventPayload) => void;
}

function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

function buildEventId(prefix: string, isoTimestamp: string): string {
  return `${prefix}_${isoTimestamp.replace(/[-:.TZ]/g, '')}`;
}

function normalizeUniqueNonEmpty(values: readonly string[]): readonly string[] {
  return Array.from(
    new Set(
      values
        .map((value: string): string => value.trim())
        .filter((value: string): boolean => value.length > 0)
    )
  );
}

function assertGateChecks(checks: readonly string[]): readonly string[] {
  const normalizedChecks = normalizeUniqueNonEmpty(checks);
  if (normalizedChecks.length < 1) {
    throw new Error(
      'VAL_REGRESSION_FAILED: at least one compatibility/parity check must be specified.'
    );
  }

  return normalizedChecks;
}

function assertValidInternalApiPayload(payload: RunCompatibilityAndParityGateRequest): void {
  const validation = validateInternalApiPayload('IAP-010', payload);
  if (!validation.valid) {
    throw new Error(`IAP-010 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function assertValidEventPayload(payload: CompatibilityParityCompletedEventPayload): void {
  const validation = validateEventPayload('EVT-010', payload);
  if (!validation.valid) {
    throw new Error(`EVT-010 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function assertZeroRegressionSatisfied(
  requireZeroRegression: boolean,
  parityResult: CompatibilityResult,
  regressionResult: CompatibilityResult
): void {
  if (!requireZeroRegression) {
    return;
  }

  if (parityResult === 'failed') {
    throw new Error('VAL_PARITY_FAILED: parity gate reported drift across platform mirrors.');
  }

  if (regressionResult === 'failed') {
    throw new Error('VAL_REGRESSION_FAILED: regression gate reported failing checks.');
  }
}

function resolveChangeSetId(
  request: RunCompatibilityAndParityGateRequest,
  options: RunCompatibilityAndParityGateOptions
): string {
  const fromOptions = options.changeSetId?.trim();
  if (fromOptions) {
    return fromOptions;
  }

  const fromRequest = request.changeSetId?.trim();
  if (fromRequest) {
    return fromRequest;
  }

  return `${request.runId}-compatibility`;
}

export async function runCompatibilityAndParityGate(
  request: RunCompatibilityAndParityGateRequest,
  options: RunCompatibilityAndParityGateOptions = {}
): Promise<RunCompatibilityAndParityGateResult> {
  assertValidInternalApiPayload(request);

  const checksRun = assertGateChecks(request.checks);
  const parityResult = options.parityResult ?? 'passed';
  const regressionResult = options.regressionResult ?? 'passed';
  const removedCapabilities = normalizeUniqueNonEmpty(
    options.removedCapabilities ?? request.removedCapabilities ?? []
  );

  assertZeroRegressionSatisfied(request.requireZeroRegression, parityResult, regressionResult);

  if (request.requireRemovalApprovalLog && removedCapabilities.length > 0) {
    const changeSetId = resolveChangeSetId(request, options);
    const gate = options.capabilityRemovalApprovalGate ?? new CapabilityRemovalApprovalGate();
    await gate.assertApproved({
      runId: request.runId,
      changeSetId,
      capabilities: removedCapabilities,
    });
  }

  const gatePassed = parityResult === 'passed' && regressionResult === 'passed';

  const response: RunCompatibilityAndParityGateResponse = {
    status: 'completed',
    parityResult,
    regressionResult,
    removedCapabilitiesDetected: removedCapabilities.length,
    gatePassed,
    checksRun,
  };

  const completedAt = options.completedAt ?? toIsoTimestamp();
  const eventPayload: CompatibilityParityCompletedEventPayload = {
    eventId: options.eventId ?? buildEventId('evt_010', completedAt),
    runId: request.runId,
    parityResult,
    regressionResult,
    removedCapabilitiesDetected: removedCapabilities.length,
  };
  assertValidEventPayload(eventPayload);

  options.eventPublisher?.(eventPayload);

  return {
    contractId: 'IAP-010',
    operationName: 'validation.runCompatibilityAndParityGate',
    response,
    emittedEvent: {
      contractId: 'EVT-010',
      eventName: 'validation.compatibility-parity.completed.v1',
      payload: eventPayload,
    },
  };
}
