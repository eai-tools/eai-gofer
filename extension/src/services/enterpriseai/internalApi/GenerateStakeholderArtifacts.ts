import * as fs from 'fs/promises';
import * as path from 'path';
import { validateEventPayload } from '../contracts/EventPayloadSchemas';
import { validateInternalApiPayload } from '../contracts/InternalApiSchemas';
import { type WorkflowProfile } from '../models/Workflow';
import { validateSecretSafety } from '../validation/SecretSafetyValidator';

export interface StakeholderCommsInputArtifacts {
  discovery: string;
  spec: string;
  plan: string;
  implementationSummary: string;
}

export interface GenerateStakeholderArtifactsRequest {
  runId: string;
  workflowProfile: WorkflowProfile;
  enableMarpDeck: boolean;
  inputArtifacts: StakeholderCommsInputArtifacts;
  releaseNotesPath?: string;
  demoScriptPath?: string;
  marpDeckPath?: string;
}

export interface GenerateStakeholderArtifactsResponse {
  status: 'completed';
  releaseNotesPath: string;
  demoScriptPath: string;
  marpDeckPath: string;
  marpEnabled: boolean;
  marpDeckGenerated: boolean;
  marpRecommendedByDefault: boolean;
}

export interface StakeholderCommsGeneratedEventPayload {
  eventId: string;
  runId: string;
  releaseNotesPath: string;
  demoScriptPath: string;
  marpDeckPath: string;
  marpEnabled: boolean;
}

export interface GenerateStakeholderArtifactsEvent {
  contractId: 'EVT-007';
  eventName: 'artifacts.stakeholder-comms.generated.v1';
  payload: StakeholderCommsGeneratedEventPayload;
}

export interface GenerateStakeholderArtifactsResult {
  contractId: 'IAP-007';
  operationName: 'comms.generateStakeholderArtifacts';
  response: GenerateStakeholderArtifactsResponse;
  emittedEvent: GenerateStakeholderArtifactsEvent;
}

export interface GenerateStakeholderArtifactsOptions {
  eventId?: string;
  generatedAt?: string;
  workspaceRoot?: string;
  eventPublisher?: (payload: StakeholderCommsGeneratedEventPayload) => void;
}

interface ResolvedWorkspacePath {
  absolutePath: string;
  reportPath: string;
}

interface LoadedInputArtifacts {
  discovery: string;
  spec: string;
  plan: string;
  implementationSummary: string;
}

interface StakeholderSections {
  problemStatement: string;
  solutionOverview: string;
  architectureReference: string;
  demoSummary: string;
  successMetrics: string;
}

const REQUIRED_SECTION_TITLES: readonly string[] = [
  'Problem Statement',
  'EnterpriseAI Solution Overview',
  'Architecture Diagram Reference',
  'Demo Script Summary',
  'Success Metrics',
];

function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

function buildEventId(prefix: string, isoTimestamp: string): string {
  return `${prefix}_${isoTimestamp.replace(/[-:.TZ]/g, '')}`;
}

function normalizePathForOutput(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
}

function isPathOverrideProvided(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveMarpEnabled(workflowProfile: WorkflowProfile, enableMarpDeck: boolean): boolean {
  return workflowProfile === 'enterpriseai' && enableMarpDeck;
}

function isMarpRecommendedByDefault(workflowProfile: WorkflowProfile): boolean {
  return workflowProfile === 'enterpriseai';
}

function isWithinWorkspace(resolvedWorkspaceRoot: string, absolutePath: string): boolean {
  const relativePath = path.relative(resolvedWorkspaceRoot, absolutePath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function resolveWorkspacePath(
  workspaceRoot: string,
  filePath: string,
  label: string
): ResolvedWorkspacePath {
  const trimmedPath = filePath.trim();
  if (!trimmedPath) {
    throw new Error(`COMMS_INPUT_ARTIFACT_MISSING: ${label} path must be provided.`);
  }

  const normalizedInput = trimmedPath.replace(/\\/g, '/');
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const absolutePath = path.isAbsolute(normalizedInput)
    ? path.resolve(normalizedInput)
    : path.resolve(resolvedWorkspaceRoot, normalizedInput);

  if (!isWithinWorkspace(resolvedWorkspaceRoot, absolutePath)) {
    throw new Error(
      `COMMS_INPUT_ARTIFACT_MISSING: ${label} path must resolve within workspace root (${normalizedInput}).`
    );
  }

  const relativePath = normalizePathForOutput(path.relative(resolvedWorkspaceRoot, absolutePath));
  return {
    absolutePath,
    reportPath: relativePath,
  };
}

function isNodeErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function isMappedCommsError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }

  return /^(COMMS_INPUT_ARTIFACT_MISSING|COMMS_MARP_TEMPLATE_INVALID|COMMS_OUTPUT_WRITE_FAILED):/.test(
    error.message
  );
}

async function readInputArtifact(pathInfo: ResolvedWorkspacePath, label: string): Promise<string> {
  try {
    const content = await fs.readFile(pathInfo.absolutePath, 'utf8');
    if (!content.trim()) {
      throw new Error(
        `COMMS_INPUT_ARTIFACT_MISSING: ${label} artifact is empty at ${normalizePathForOutput(pathInfo.reportPath)}.`
      );
    }
    return content;
  } catch (error) {
    if (
      isNodeErrorWithCode(error) &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EACCES')
    ) {
      throw new Error(
        `COMMS_INPUT_ARTIFACT_MISSING: ${label} artifact not readable at ${normalizePathForOutput(pathInfo.reportPath)}.`
      );
    }

    if (isMappedCommsError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      throw new Error(
        `COMMS_INPUT_ARTIFACT_MISSING: failed to read ${label} artifact (${error.message}).`
      );
    }
    throw new Error(`COMMS_INPUT_ARTIFACT_MISSING: failed to read ${label} artifact.`);
  }
}

function extractSummary(content: string, label: string): string {
  const summaryLines = content
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0 && !line.startsWith('#'))
    .slice(0, 3);

  if (summaryLines.length < 1) {
    throw new Error(
      `COMMS_INPUT_ARTIFACT_MISSING: ${label} artifact must include summary-ready content.`
    );
  }

  return summaryLines.join(' ');
}

function buildStakeholderSections(inputArtifacts: LoadedInputArtifacts): StakeholderSections {
  const problemStatement = extractSummary(inputArtifacts.discovery, 'discovery');
  const solutionOverview = extractSummary(inputArtifacts.spec, 'spec');
  const architectureReference = extractSummary(inputArtifacts.plan, 'plan');
  const demoSummary = extractSummary(inputArtifacts.implementationSummary, 'implementationSummary');

  return {
    problemStatement,
    solutionOverview,
    architectureReference,
    demoSummary,
    successMetrics:
      'Deployment readiness gate passes (manifest/config), parity checks pass, and stakeholder demo completes within 5 minutes.',
  };
}

function buildReleaseNotesContent(
  runId: string,
  generatedAt: string,
  sections: StakeholderSections
): string {
  return [
    '# Release Notes',
    '',
    `- Run ID: ${runId}`,
    `- Generated At: ${generatedAt}`,
    '',
    '## Problem Statement',
    sections.problemStatement,
    '',
    '## EnterpriseAI Solution Overview',
    sections.solutionOverview,
    '',
    '## Architecture Diagram Reference',
    sections.architectureReference,
    '',
    '## Demo Script Summary',
    sections.demoSummary,
    '',
    '## Success Metrics',
    sections.successMetrics,
    '',
  ].join('\n');
}

function buildDemoScriptContent(runId: string, sections: StakeholderSections): string {
  return [
    '# Demo Script (5-minute walkthrough)',
    '',
    `Run ID: ${runId}`,
    '',
    '1. **Problem Statement**',
    `   - ${sections.problemStatement}`,
    '2. **EnterpriseAI Solution Overview**',
    `   - ${sections.solutionOverview}`,
    '3. **Architecture Diagram Reference**',
    `   - ${sections.architectureReference}`,
    '4. **Demo Script Summary**',
    `   - ${sections.demoSummary}`,
    '5. **Success Metrics**',
    `   - ${sections.successMetrics}`,
    '',
  ].join('\n');
}

function buildMarpDeckContent(runId: string, sections: StakeholderSections): string {
  return [
    '---',
    'marp: true',
    'theme: default',
    'paginate: true',
    '---',
    '',
    '# EnterpriseAI Stakeholder Readout',
    '',
    `Run ID: ${runId}`,
    '',
    '## Problem Statement',
    sections.problemStatement,
    '',
    '## EnterpriseAI Solution Overview',
    sections.solutionOverview,
    '',
    '## Architecture Diagram Reference',
    sections.architectureReference,
    '',
    '## Demo Script Summary',
    sections.demoSummary,
    '',
    '## Success Metrics',
    sections.successMetrics,
    '',
  ].join('\n');
}

function assertStakeholderContent(content: string, artifactName: string): void {
  for (const sectionTitle of REQUIRED_SECTION_TITLES) {
    if (!content.includes(sectionTitle)) {
      throw new Error(
        `COMMS_MARP_TEMPLATE_INVALID: ${artifactName} is missing required section "${sectionTitle}".`
      );
    }
  }

  const secretValidation = validateSecretSafety(content);
  if (!secretValidation.valid) {
    const details = secretValidation.violations
      .map((violation): string => `${violation.ruleId}@line${violation.line}`)
      .join(', ');
    throw new Error(
      `COMMS_MARP_TEMPLATE_INVALID: ${artifactName} contains restricted secret patterns (${details}).`
    );
  }
}

async function writeArtifact(pathInfo: ResolvedWorkspacePath, content: string): Promise<void> {
  try {
    await fs.mkdir(path.dirname(pathInfo.absolutePath), { recursive: true });
    await fs.writeFile(pathInfo.absolutePath, content, 'utf8');
  } catch (error) {
    throw new Error(
      `COMMS_OUTPUT_WRITE_FAILED: failed to write artifact ${pathInfo.reportPath}. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function deriveArtifactPath(specPath: string, artifactName: string): string {
  const specDir = path.posix.dirname(specPath.replace(/\\/g, '/'));
  return normalizePathForOutput(path.posix.join(specDir, artifactName));
}

function mapInternalApiValidationErrorCode(validationErrors: readonly string[]): string {
  const inputArtifactError = validationErrors.some((error: string): boolean =>
    /(inputArtifacts|discovery|spec|plan|implementationSummary)/i.test(error)
  );
  if (inputArtifactError) {
    return 'COMMS_INPUT_ARTIFACT_MISSING';
  }
  return 'COMMS_MARP_TEMPLATE_INVALID';
}

function assertValidInternalApiPayload(payload: GenerateStakeholderArtifactsRequest): void {
  const validation = validateInternalApiPayload('IAP-007', payload);
  if (!validation.valid) {
    const code = mapInternalApiValidationErrorCode(validation.errors);
    throw new Error(`${code}: ${validation.errors.join(' ')}`);
  }
}

function assertValidEventPayload(payload: StakeholderCommsGeneratedEventPayload): void {
  const validation = validateEventPayload('EVT-007', payload);
  if (!validation.valid) {
    const hasArtifactPathError = validation.errors.some((error: string): boolean =>
      /(releaseNotesPath|demoScriptPath|marpDeckPath)/.test(error)
    );
    if (hasArtifactPathError) {
      throw new Error(`EVT_COMMS_ARTIFACT_MISSING: ${validation.errors.join(' ')}`);
    }
    throw new Error(`EVT_MARP_VALIDATION_FAILED: ${validation.errors.join(' ')}`);
  }
}

export async function generateStakeholderArtifacts(
  request: GenerateStakeholderArtifactsRequest,
  options: GenerateStakeholderArtifactsOptions = {}
): Promise<GenerateStakeholderArtifactsResult> {
  assertValidInternalApiPayload(request);

  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const resolvedInputPaths = {
    discovery: resolveWorkspacePath(workspaceRoot, request.inputArtifacts.discovery, 'discovery'),
    spec: resolveWorkspacePath(workspaceRoot, request.inputArtifacts.spec, 'spec'),
    plan: resolveWorkspacePath(workspaceRoot, request.inputArtifacts.plan, 'plan'),
    implementationSummary: resolveWorkspacePath(
      workspaceRoot,
      request.inputArtifacts.implementationSummary,
      'implementationSummary'
    ),
  };

  const loadedInputArtifacts: LoadedInputArtifacts = {
    discovery: await readInputArtifact(resolvedInputPaths.discovery, 'discovery'),
    spec: await readInputArtifact(resolvedInputPaths.spec, 'spec'),
    plan: await readInputArtifact(resolvedInputPaths.plan, 'plan'),
    implementationSummary: await readInputArtifact(
      resolvedInputPaths.implementationSummary,
      'implementationSummary'
    ),
  };

  const defaultReleaseNotesPath = deriveArtifactPath(
    resolvedInputPaths.spec.reportPath,
    'release-notes.md'
  );
  const defaultDemoScriptPath = deriveArtifactPath(
    resolvedInputPaths.spec.reportPath,
    'demo-script.md'
  );
  const defaultMarpDeckPath = deriveArtifactPath(
    resolvedInputPaths.spec.reportPath,
    'presentation.marp.md'
  );

  const releaseNotesPath = isPathOverrideProvided(request.releaseNotesPath)
    ? request.releaseNotesPath
    : defaultReleaseNotesPath;
  const demoScriptPath = isPathOverrideProvided(request.demoScriptPath)
    ? request.demoScriptPath
    : defaultDemoScriptPath;
  const marpDeckPath = isPathOverrideProvided(request.marpDeckPath)
    ? request.marpDeckPath
    : defaultMarpDeckPath;

  const resolvedReleaseNotesPath = resolveWorkspacePath(
    workspaceRoot,
    releaseNotesPath,
    'releaseNotesPath'
  );
  const resolvedDemoScriptPath = resolveWorkspacePath(
    workspaceRoot,
    demoScriptPath,
    'demoScriptPath'
  );
  const resolvedMarpDeckPath = resolveWorkspacePath(workspaceRoot, marpDeckPath, 'marpDeckPath');

  const marpEnabled = resolveMarpEnabled(request.workflowProfile, request.enableMarpDeck);
  const generatedAt = options.generatedAt ?? toIsoTimestamp();
  const sections = buildStakeholderSections(loadedInputArtifacts);

  const releaseNotesContent = buildReleaseNotesContent(request.runId, generatedAt, sections);
  const demoScriptContent = buildDemoScriptContent(request.runId, sections);
  const marpDeckContent = buildMarpDeckContent(request.runId, sections);

  assertStakeholderContent(releaseNotesContent, 'release-notes.md');
  assertStakeholderContent(demoScriptContent, 'demo-script.md');
  assertStakeholderContent(marpDeckContent, 'presentation.marp.md');

  await writeArtifact(resolvedReleaseNotesPath, releaseNotesContent);
  await writeArtifact(resolvedDemoScriptPath, demoScriptContent);
  if (marpEnabled) {
    await writeArtifact(resolvedMarpDeckPath, marpDeckContent);
  }

  const response: GenerateStakeholderArtifactsResponse = {
    status: 'completed',
    releaseNotesPath: resolvedReleaseNotesPath.reportPath,
    demoScriptPath: resolvedDemoScriptPath.reportPath,
    marpDeckPath: resolvedMarpDeckPath.reportPath,
    marpEnabled,
    marpDeckGenerated: marpEnabled,
    marpRecommendedByDefault: isMarpRecommendedByDefault(request.workflowProfile),
  };

  const eventPayload: StakeholderCommsGeneratedEventPayload = {
    eventId: options.eventId ?? buildEventId('evt_007', generatedAt),
    runId: request.runId,
    releaseNotesPath: response.releaseNotesPath,
    demoScriptPath: response.demoScriptPath,
    marpDeckPath: response.marpDeckPath,
    marpEnabled,
  };
  assertValidEventPayload(eventPayload);

  options.eventPublisher?.(eventPayload);

  return {
    contractId: 'IAP-007',
    operationName: 'comms.generateStakeholderArtifacts',
    response,
    emittedEvent: {
      contractId: 'EVT-007',
      eventName: 'artifacts.stakeholder-comms.generated.v1',
      payload: eventPayload,
    },
  };
}
