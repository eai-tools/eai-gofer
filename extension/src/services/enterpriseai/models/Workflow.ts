export const WORKFLOW_PROFILES = ['standard', 'enterpriseai'] as const;

export type WorkflowProfile = (typeof WORKFLOW_PROFILES)[number];

export const PIPELINE_RUN_STATUSES = [
  'initialized',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
] as const;

export type PipelineRunStatus = (typeof PIPELINE_RUN_STATUSES)[number];

export const PIPELINE_STAGES = [
  'discovery',
  'research',
  'specification',
  'planning',
  'tasks',
  'implementation',
  'stakeholder_comms',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

const TERMINAL_PIPELINE_STATUSES: ReadonlySet<PipelineRunStatus> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

const MAJOR_MINOR_PATTERN = /^\d+\.\d+$/;

export interface WorkflowProfileConfig {
  configId: string;
  workflowProfile: WorkflowProfile;
  competitiveAnalysisEnabled: boolean;
  marpOutputEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface PipelineRun {
  runId: string;
  featureId: string;
  configId: string;
  workflowProfileSnapshot: WorkflowProfile;
  status: PipelineRunStatus;
  currentStage: PipelineStage;
  eaiCliVersionDetected?: string;
  eaiCliMajorMinorPin?: string;
  fallbackModeActive: boolean;
  startedAt: string;
  endedAt?: string;
  unavailableExternalReferenceCount?: number;
  localFallbackUsed?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function isWorkflowProfile(value: unknown): value is WorkflowProfile {
  return typeof value === 'string' && WORKFLOW_PROFILES.includes(value as WorkflowProfile);
}

export function isPipelineRunStatus(value: unknown): value is PipelineRunStatus {
  return typeof value === 'string' && PIPELINE_RUN_STATUSES.includes(value as PipelineRunStatus);
}

export function isPipelineStage(value: unknown): value is PipelineStage {
  return typeof value === 'string' && PIPELINE_STAGES.includes(value as PipelineStage);
}

export function validateWorkflowProfileConfig(config: WorkflowProfileConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.configId.trim()) {
    errors.push('configId is required.');
  }

  if (!isWorkflowProfile(config.workflowProfile)) {
    errors.push('workflowProfile must be standard or enterpriseai.');
  }

  if (!isIsoTimestamp(config.updatedAt)) {
    errors.push('updatedAt must be an ISO8601 timestamp.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validatePipelineRun(run: PipelineRun): ValidationResult {
  const errors: string[] = [];

  if (!run.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!run.featureId.trim()) {
    errors.push('featureId is required.');
  }

  if (!run.configId.trim()) {
    errors.push('configId is required.');
  }

  if (!isWorkflowProfile(run.workflowProfileSnapshot)) {
    errors.push('workflowProfileSnapshot must be standard or enterpriseai.');
  }

  if (!isPipelineRunStatus(run.status)) {
    errors.push('status is invalid.');
  }

  if (!isPipelineStage(run.currentStage)) {
    errors.push('currentStage is invalid.');
  }

  if (!isIsoTimestamp(run.startedAt)) {
    errors.push('startedAt must be an ISO8601 timestamp.');
  }

  if (run.endedAt && !isIsoTimestamp(run.endedAt)) {
    errors.push('endedAt must be an ISO8601 timestamp when provided.');
  }

  if (TERMINAL_PIPELINE_STATUSES.has(run.status) && !run.endedAt) {
    errors.push('endedAt is required for terminal run statuses.');
  }

  if (
    run.workflowProfileSnapshot === 'enterpriseai' &&
    (run.currentStage === 'planning' || run.currentStage === 'tasks') &&
    !run.eaiCliMajorMinorPin
  ) {
    errors.push('enterpriseai planning/tasks runs require eaiCliMajorMinorPin.');
  }

  if (run.eaiCliMajorMinorPin && !MAJOR_MINOR_PATTERN.test(run.eaiCliMajorMinorPin)) {
    errors.push('eaiCliMajorMinorPin must match major.minor format.');
  }

  if (run.fallbackModeActive) {
    if (!run.localFallbackUsed) {
      errors.push('fallbackModeActive requires localFallbackUsed=true.');
    }

    if (!run.unavailableExternalReferenceCount || run.unavailableExternalReferenceCount < 1) {
      errors.push('fallbackModeActive requires unavailableExternalReferenceCount >= 1.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
