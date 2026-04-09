import * as fs from 'fs/promises';
import * as path from 'path';
import { type WorkflowProfile } from '../models/Workflow';
import { validateSecretSafety } from '../validation/SecretSafetyValidator';

export interface GenerateEnterpriseAiDiscoveryRequest {
  runId: string;
  workflowProfile: WorkflowProfile;
  challengeSummary: string;
  targetPersona: string;
  expectedValue: string;
  outputPath: string;
}

export interface GenerateEnterpriseAiDiscoveryResponse {
  status: 'completed';
  discoveryPath: string;
  profile: WorkflowProfile;
}

export interface GenerateEnterpriseAiDiscoveryResult {
  operationName: 'discovery.generateEnterpriseAiDiscoveryArtifact';
  response: GenerateEnterpriseAiDiscoveryResponse;
}

export interface GenerateEnterpriseAiDiscoveryOptions {
  workspaceRoot?: string;
}

function normalizePathForOutput(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
}

function resolveWorkspacePath(
  workspaceRoot: string,
  filePath: string
): { absolutePath: string; reportPath: string } {
  const normalizedInput = filePath.trim().replace(/\\/g, '/');
  if (!normalizedInput) {
    throw new Error('DISCOVERY_OUTPUT_WRITE_FAILED: outputPath must be provided.');
  }
  if (path.isAbsolute(normalizedInput)) {
    throw new Error('DISCOVERY_OUTPUT_WRITE_FAILED: outputPath must be workspace-relative.');
  }

  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const absolutePath = path.resolve(resolvedWorkspaceRoot, normalizedInput);
  const relativeToWorkspace = path.relative(resolvedWorkspaceRoot, absolutePath);
  if (
    relativeToWorkspace.startsWith('..') ||
    relativeToWorkspace.includes(`..${path.sep}`) ||
    path.isAbsolute(relativeToWorkspace)
  ) {
    throw new Error(
      'DISCOVERY_OUTPUT_WRITE_FAILED: outputPath must resolve inside workspace root.'
    );
  }

  return {
    absolutePath,
    reportPath: normalizePathForOutput(path.relative(resolvedWorkspaceRoot, absolutePath)),
  };
}

function buildDiscoveryContent(request: GenerateEnterpriseAiDiscoveryRequest): string {
  return [
    '# Discovery',
    '',
    '## Problem Statement',
    request.challengeSummary.trim(),
    '',
    '## Persona',
    request.targetPersona.trim(),
    '',
    '## Value Proposition',
    request.expectedValue.trim(),
    '',
    '## EnterpriseAI-ready Direction',
    `Use the EnterpriseAI platform as the primary implementation path for ${request.targetPersona.trim()} to deliver ${request.expectedValue.trim()}.`,
    '',
  ].join('\n');
}

function assertDiscoveryInputs(request: GenerateEnterpriseAiDiscoveryRequest): void {
  if (!request.challengeSummary.trim()) {
    throw new Error('DISCOVERY_INPUT_MISSING: challengeSummary must be provided.');
  }
  if (!request.targetPersona.trim()) {
    throw new Error('DISCOVERY_INPUT_MISSING: targetPersona must be provided.');
  }
  if (!request.expectedValue.trim()) {
    throw new Error('DISCOVERY_INPUT_MISSING: expectedValue must be provided.');
  }
}

function assertSecretSafeDiscovery(content: string): void {
  const validation = validateSecretSafety(content);
  if (!validation.valid) {
    const details = validation.violations
      .map((violation): string => `${violation.ruleId}@line${violation.line}`)
      .join(', ');
    throw new Error(
      `DISCOVERY_OUTPUT_WRITE_FAILED: discovery artifact contains restricted secret patterns (${details}).`
    );
  }
}

export async function generateEnterpriseAiDiscoveryArtifact(
  request: GenerateEnterpriseAiDiscoveryRequest,
  options: GenerateEnterpriseAiDiscoveryOptions = {}
): Promise<GenerateEnterpriseAiDiscoveryResult> {
  assertDiscoveryInputs(request);

  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const resolvedOutputPath = resolveWorkspacePath(workspaceRoot, request.outputPath);
  const content = buildDiscoveryContent(request);
  assertSecretSafeDiscovery(content);

  await fs.mkdir(path.dirname(resolvedOutputPath.absolutePath), { recursive: true });
  await fs.writeFile(resolvedOutputPath.absolutePath, content, 'utf8');

  return {
    operationName: 'discovery.generateEnterpriseAiDiscoveryArtifact',
    response: {
      status: 'completed',
      discoveryPath: resolvedOutputPath.reportPath,
      profile: request.workflowProfile,
    },
  };
}
