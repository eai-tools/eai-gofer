import * as vscode from 'vscode';

export const WORKFLOW_PROFILES = ['standard', 'enterpriseai'] as const;

export type WorkflowProfile = (typeof WORKFLOW_PROFILES)[number];

export function isWorkflowProfile(value: unknown): value is WorkflowProfile {
  return typeof value === 'string' && WORKFLOW_PROFILES.includes(value as WorkflowProfile);
}

export function normalizeWorkflowProfile(value: unknown): WorkflowProfile {
  return value === 'enterpriseai' ? 'enterpriseai' : 'standard';
}

export function getWorkflowProfile(configuration?: vscode.WorkspaceConfiguration): WorkflowProfile {
  const goferConfig = configuration ?? vscode.workspace.getConfiguration('gofer');
  const configured = goferConfig.get<string>('workflowProfile', 'standard');
  return normalizeWorkflowProfile(configured);
}
