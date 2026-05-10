import {
  type ArtifactRecord,
  type ArtifactType,
  validateArtifactRecord,
} from '../models/Artifacts';
import { WORKFLOW_PROFILES, type WorkflowProfile } from '../models/Workflow';

export interface SchemaValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
}

export interface BusinessAnalysisArtifactPayload {
  runId: string;
  workflowProfile: WorkflowProfile;
  businessProblemStatement: string;
  targetPersona: string;
  valueProposition: string;
  generatedAt: string;
}

export interface MarketAnalysisArtifactPayload {
  runId: string;
  workflowProfile: WorkflowProfile;
  alternativeCount: number;
  alternatives: readonly string[];
  referencedInSpec: boolean;
  referencedInPlan: boolean;
  generatedAt: string;
}

export interface MarpDeckArtifactPayload {
  runId: string;
  workflowProfile: WorkflowProfile;
  frontmatter: {
    marp: boolean;
    title: string;
    theme?: string;
  };
  sections: readonly string[];
  generatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isWorkflowProfile(value: unknown): value is WorkflowProfile {
  return typeof value === 'string' && WORKFLOW_PROFILES.includes(value as WorkflowProfile);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function validateBusinessAnalysisArtifact(
  payload: unknown
): SchemaValidationResult<BusinessAnalysisArtifactPayload> {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { valid: false, errors: ['Payload must be an object.'] };
  }

  if (typeof payload.runId !== 'string' || !payload.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!isWorkflowProfile(payload.workflowProfile)) {
    errors.push('workflowProfile must be standard or enterpriseai.');
  }

  if (
    typeof payload.businessProblemStatement !== 'string' ||
    !payload.businessProblemStatement.trim()
  ) {
    errors.push('businessProblemStatement is required.');
  }

  if (typeof payload.targetPersona !== 'string' || !payload.targetPersona.trim()) {
    errors.push('targetPersona is required.');
  }

  if (typeof payload.valueProposition !== 'string' || !payload.valueProposition.trim()) {
    errors.push('valueProposition is required.');
  }

  if (typeof payload.generatedAt !== 'string' || !isIsoTimestamp(payload.generatedAt)) {
    errors.push('generatedAt must be an ISO8601 timestamp.');
  }

  const value: BusinessAnalysisArtifactPayload | undefined =
    errors.length === 0
      ? {
          runId: payload.runId as string,
          workflowProfile: payload.workflowProfile as WorkflowProfile,
          businessProblemStatement: payload.businessProblemStatement as string,
          targetPersona: payload.targetPersona as string,
          valueProposition: payload.valueProposition as string,
          generatedAt: payload.generatedAt as string,
        }
      : undefined;

  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

export function validateMarketAnalysisArtifact(
  payload: unknown
): SchemaValidationResult<MarketAnalysisArtifactPayload> {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { valid: false, errors: ['Payload must be an object.'] };
  }

  if (typeof payload.runId !== 'string' || !payload.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!isWorkflowProfile(payload.workflowProfile)) {
    errors.push('workflowProfile must be standard or enterpriseai.');
  }

  if (typeof payload.alternativeCount !== 'number' || payload.alternativeCount < 3) {
    errors.push('alternativeCount must be >= 3.');
  }

  if (!isStringArray(payload.alternatives) || payload.alternatives.length < 3) {
    errors.push('alternatives must contain at least 3 entries.');
  }

  if (payload.referencedInSpec !== true) {
    errors.push('referencedInSpec must be true.');
  }

  if (payload.referencedInPlan !== true) {
    errors.push('referencedInPlan must be true.');
  }

  if (typeof payload.generatedAt !== 'string' || !isIsoTimestamp(payload.generatedAt)) {
    errors.push('generatedAt must be an ISO8601 timestamp.');
  }

  const value: MarketAnalysisArtifactPayload | undefined =
    errors.length === 0
      ? {
          runId: payload.runId as string,
          workflowProfile: payload.workflowProfile as WorkflowProfile,
          alternativeCount: payload.alternativeCount as number,
          alternatives: payload.alternatives as readonly string[],
          referencedInSpec: payload.referencedInSpec as boolean,
          referencedInPlan: payload.referencedInPlan as boolean,
          generatedAt: payload.generatedAt as string,
        }
      : undefined;

  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

export function validateMarpDeckArtifact(
  payload: unknown
): SchemaValidationResult<MarpDeckArtifactPayload> {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { valid: false, errors: ['Payload must be an object.'] };
  }

  if (typeof payload.runId !== 'string' || !payload.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!isWorkflowProfile(payload.workflowProfile)) {
    errors.push('workflowProfile must be standard or enterpriseai.');
  }

  if (!isRecord(payload.frontmatter)) {
    errors.push('frontmatter is required.');
  } else {
    if (payload.frontmatter.marp !== true) {
      errors.push('frontmatter.marp must be true.');
    }

    if (typeof payload.frontmatter.title !== 'string' || !payload.frontmatter.title.trim()) {
      errors.push('frontmatter.title is required.');
    }
  }

  if (!isStringArray(payload.sections) || payload.sections.length < 1) {
    errors.push('sections must contain at least one entry.');
  }

  if (typeof payload.generatedAt !== 'string' || !isIsoTimestamp(payload.generatedAt)) {
    errors.push('generatedAt must be an ISO8601 timestamp.');
  }

  const value: MarpDeckArtifactPayload | undefined =
    errors.length === 0
      ? {
          runId: payload.runId as string,
          workflowProfile: payload.workflowProfile as WorkflowProfile,
          frontmatter: payload.frontmatter as MarpDeckArtifactPayload['frontmatter'],
          sections: payload.sections as readonly string[],
          generatedAt: payload.generatedAt as string,
        }
      : undefined;

  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

export function validateArtifactRecordBySchema(
  artifact: ArtifactRecord
): SchemaValidationResult<ArtifactRecord> {
  const result = validateArtifactRecord(artifact);
  return {
    valid: result.valid,
    errors: result.errors,
    value: result.valid ? artifact : undefined,
  };
}

export function validateRunCompletionGates(
  artifacts: readonly ArtifactRecord[]
): SchemaValidationResult<readonly ArtifactRecord[]> {
  const errors: string[] = [];

  const marketAnalysisArtifacts = artifacts.filter(
    (artifact) => artifact.artifactType === ('market-analysis' as ArtifactType)
  );

  for (const artifact of marketAnalysisArtifacts) {
    if (artifact.referencedInSpec !== true || artifact.referencedInPlan !== true) {
      errors.push(
        `Run completion gate failed for ${artifact.artifactId}: market-analysis must set referencedInSpec=true and referencedInPlan=true.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? artifacts : undefined,
  };
}
