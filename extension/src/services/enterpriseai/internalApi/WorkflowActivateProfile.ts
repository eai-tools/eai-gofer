import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { validateInternalApiPayload } from '../contracts/InternalApiSchemas';
import { type WorkflowProfile } from '../models/Workflow';

export type WorkflowActivationStage =
  | 'discovery'
  | 'research'
  | 'specification'
  | 'planning'
  | 'tasks'
  | 'implementation';

export interface WorkflowActivateProfileRequest {
  runId: string;
  workflowProfile: WorkflowProfile;
  stage: WorkflowActivationStage;
  requestedBy: string;
}

export interface WorkflowDefaultsApplied {
  enterpriseAiGuidance: boolean;
  marpRecommended: boolean;
  competitiveAnalysisDefault: boolean;
}

export interface WorkflowActivateProfileResponse {
  status: 'accepted';
  activeProfile: WorkflowProfile;
  defaultsApplied: WorkflowDefaultsApplied;
}

export interface WorkflowProfileActivatedEventPayload {
  eventId: string;
  runId: string;
  workflowProfile: WorkflowProfile;
  activatedAt: string;
}

export interface WorkflowActivateProfileEvent {
  contractId: 'EVT-001';
  eventName: 'workflow.profile.activated.v1';
  payload: WorkflowProfileActivatedEventPayload;
}

export interface WorkflowActivateProfileResult {
  contractId: 'IAP-001';
  operationName: 'workflow.activateProfile';
  response: WorkflowActivateProfileResponse;
  emittedEvent: WorkflowActivateProfileEvent;
}

export interface WorkflowActivateProfileOptions {
  eventId?: string;
  activatedAt?: string;
  eventPublisher?: (payload: WorkflowProfileActivatedEventPayload) => void;
}

function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

function buildEventId(prefix: string, isoTimestamp: string): string {
  return `${prefix}_${isoTimestamp.replace(/[-:.TZ]/g, '')}`;
}

function buildDefaultsApplied(workflowProfile: WorkflowProfile): WorkflowDefaultsApplied {
  if (workflowProfile === 'enterpriseai') {
    return {
      enterpriseAiGuidance: true,
      marpRecommended: true,
      competitiveAnalysisDefault: true,
    };
  }

  return {
    enterpriseAiGuidance: false,
    marpRecommended: false,
    competitiveAnalysisDefault: false,
  };
}

function assertValidInternalApiPayload(payload: WorkflowActivateProfileRequest): void {
  const validation = validateInternalApiPayload('IAP-001', payload);
  if (!validation.valid) {
    throw new Error(`IAP-001 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

function assertValidEventPayload(payload: WorkflowProfileActivatedEventPayload): void {
  const validation = validateEventPayload('EVT-001', payload);
  if (!validation.valid) {
    throw new Error(`EVT-001 payload validation failed: ${validation.errors.join(' ')}`);
  }
}

export function workflowActivateProfile(
  request: WorkflowActivateProfileRequest,
  options: WorkflowActivateProfileOptions = {}
): WorkflowActivateProfileResult {
  assertValidInternalApiPayload(request);

  const activatedAt = options.activatedAt ?? toIsoTimestamp();
  const eventPayload: WorkflowProfileActivatedEventPayload = {
    eventId: options.eventId ?? buildEventId('evt_001', activatedAt),
    runId: request.runId,
    workflowProfile: request.workflowProfile,
    activatedAt,
  };
  assertValidEventPayload(eventPayload);

  options.eventPublisher?.(eventPayload);

  return {
    contractId: 'IAP-001',
    operationName: 'workflow.activateProfile',
    response: {
      status: 'accepted',
      activeProfile: request.workflowProfile,
      defaultsApplied: buildDefaultsApplied(request.workflowProfile),
    },
    emittedEvent: {
      contractId: 'EVT-001',
      eventName: 'workflow.profile.activated.v1',
      payload: eventPayload,
    },
  };
}
