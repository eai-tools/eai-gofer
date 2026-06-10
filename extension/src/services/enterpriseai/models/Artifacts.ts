import { type PipelineStage, type WorkflowProfile } from './Workflow';

export const ARTIFACT_TYPES = [
  'discovery',
  'business-analysis',
  'market-analysis',
  'spec',
  'plan',
  'tasks',
  'implementation-summary',
  'release-notes',
  'demo-script',
  'marp-deck',
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_GENERATION_STATUSES = [
  'queued',
  'generating',
  'generated',
  'validated',
  'published',
  'failed',
] as const;

export type ArtifactGenerationStatus = (typeof ARTIFACT_GENERATION_STATUSES)[number];

export const TASK_TYPES = [
  'eai_app_template_scaffold',
  'eai_deploy',
  'deployment_convention',
  'validation',
  'generic',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_VALIDATION_STATUSES = ['not_checked', 'checked', 'failed'] as const;

export type TaskValidationStatus = (typeof TASK_VALIDATION_STATUSES)[number];

export const TASK_COMPLETION_STATUSES = ['pending', 'in_progress', 'completed'] as const;

export type TaskCompletionStatus = (typeof TASK_COMPLETION_STATUSES)[number];

const MAJOR_MINOR_PATTERN = /^\d+\.\d+$/;
const LEGACY_EAI_DEPLOY_TASK_TYPE = ['eai', 'cli', 'deploy'].join('_');

export interface ArtifactRecord {
  artifactId: string;
  runId: string;
  stage: PipelineStage;
  artifactType: ArtifactType;
  filePath: string;
  profileContext: WorkflowProfile;
  generationStatus: ArtifactGenerationStatus;
  eaiCliMajorMinorPin?: string;
  includesFallbackNotice: boolean;
  alternativeCount?: number;
  referencedInSpec?: boolean;
  referencedInPlan?: boolean;
  sourceReferenceIds: readonly string[];
  contentHash?: string;
  createdAt: string;
  marpOutputEnabled?: boolean;
  marpFrontmatterValid?: boolean;
}

export interface TaskItem {
  taskId: string;
  runId: string;
  artifactId: string;
  taskType: TaskType;
  orderIndex: number;
  title: string;
  commandSnippet?: string;
  dependsOnTaskId?: string;
  requiredFilesJson?: readonly string[];
  validationStatus: TaskValidationStatus;
  completionStatus?: TaskCompletionStatus;
  eaiCliMajorMinorPin?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function isArtifactType(value: unknown): value is ArtifactType {
  return typeof value === 'string' && ARTIFACT_TYPES.includes(value as ArtifactType);
}

export function isArtifactGenerationStatus(value: unknown): value is ArtifactGenerationStatus {
  return (
    typeof value === 'string' &&
    ARTIFACT_GENERATION_STATUSES.includes(value as ArtifactGenerationStatus)
  );
}

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' && normalizeTaskType(value) !== undefined;
}

function normalizeTaskType(value: unknown): TaskType | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  if (value === LEGACY_EAI_DEPLOY_TASK_TYPE) {
    return 'eai_deploy';
  }

  return TASK_TYPES.includes(value as TaskType) ? (value as TaskType) : undefined;
}

export function isTaskValidationStatus(value: unknown): value is TaskValidationStatus {
  return (
    typeof value === 'string' && TASK_VALIDATION_STATUSES.includes(value as TaskValidationStatus)
  );
}

export function validateArtifactRecord(artifact: ArtifactRecord): ValidationResult {
  const errors: string[] = [];

  if (!artifact.artifactId.trim()) {
    errors.push('artifactId is required.');
  }

  if (!artifact.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!isArtifactType(artifact.artifactType)) {
    errors.push('artifactType is invalid.');
  }

  if (!isArtifactGenerationStatus(artifact.generationStatus)) {
    errors.push('generationStatus is invalid.');
  }

  if (!artifact.filePath.startsWith('.specify/specs/')) {
    errors.push('filePath must be under .specify/specs/.');
  }

  if (!isIsoTimestamp(artifact.createdAt)) {
    errors.push('createdAt must be an ISO8601 timestamp.');
  }

  if (
    artifact.profileContext === 'enterpriseai' &&
    (artifact.artifactType === 'plan' || artifact.artifactType === 'tasks')
  ) {
    if (!artifact.eaiCliMajorMinorPin) {
      errors.push('enterpriseai plan/tasks artifacts require eaiCliMajorMinorPin.');
    } else if (!MAJOR_MINOR_PATTERN.test(artifact.eaiCliMajorMinorPin)) {
      errors.push('eaiCliMajorMinorPin must match major.minor format.');
    }
  }

  if (artifact.artifactType === 'market-analysis') {
    if (typeof artifact.alternativeCount !== 'number' || artifact.alternativeCount < 3) {
      errors.push('market-analysis artifacts require alternativeCount >= 3.');
    }

    if (artifact.referencedInSpec !== true) {
      errors.push('market-analysis artifacts require referencedInSpec=true.');
    }

    if (artifact.referencedInPlan !== true) {
      errors.push('market-analysis artifacts require referencedInPlan=true.');
    }
  }

  if (artifact.artifactType === 'marp-deck') {
    if (artifact.marpOutputEnabled === false) {
      errors.push('marp-deck artifacts require marpOutputEnabled=true.');
    }

    if (artifact.marpFrontmatterValid === false) {
      errors.push('marp-deck artifacts require valid Marp frontmatter.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateTaskItem(task: TaskItem): ValidationResult {
  const errors: string[] = [];

  if (!task.taskId.trim()) {
    errors.push('taskId is required.');
  }

  if (!task.runId.trim()) {
    errors.push('runId is required.');
  }

  if (!task.artifactId.trim()) {
    errors.push('artifactId is required.');
  }

  const taskType = normalizeTaskType(task.taskType);
  if (!taskType) {
    errors.push('taskType is invalid.');
  }

  if (!Number.isInteger(task.orderIndex) || task.orderIndex < 0) {
    errors.push('orderIndex must be a non-negative integer.');
  }

  if (!task.title.trim()) {
    errors.push('title is required.');
  }

  if (!isTaskValidationStatus(task.validationStatus)) {
    errors.push('validationStatus is invalid.');
  }

  if (taskType === 'eai_deploy') {
    if (!task.eaiCliMajorMinorPin) {
      errors.push('eai_deploy tasks require eaiCliMajorMinorPin.');
    } else if (!MAJOR_MINOR_PATTERN.test(task.eaiCliMajorMinorPin)) {
      errors.push('eaiCliMajorMinorPin on deploy tasks must match major.minor format.');
    }

    if (
      task.eaiCliMajorMinorPin &&
      task.commandSnippet &&
      !task.commandSnippet.includes(task.eaiCliMajorMinorPin)
    ) {
      errors.push('eai_deploy commandSnippet must reference eaiCliMajorMinorPin.');
    }

    if (task.completionStatus === 'completed' && task.validationStatus !== 'checked') {
      errors.push('deployment tasks cannot be completed unless validationStatus=checked.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEnterpriseAiTaskOrdering(tasks: readonly TaskItem[]): ValidationResult {
  const errors: string[] = [];

  const scaffoldTasks = tasks.filter(
    (task) => normalizeTaskType(task.taskType) === 'eai_app_template_scaffold'
  );
  const deployTasks = tasks.filter((task) => normalizeTaskType(task.taskType) === 'eai_deploy');

  if (scaffoldTasks.length < 1) {
    errors.push('At least one eai_app_template_scaffold task is required for enterpriseai runs.');
  }

  if (deployTasks.length < 1) {
    errors.push('At least one eai_deploy task is required for enterpriseai runs.');
  }

  if (scaffoldTasks.length > 0 && deployTasks.length > 0) {
    const firstScaffoldOrder = Math.min(...scaffoldTasks.map((task) => task.orderIndex));
    const firstDeployOrder = Math.min(...deployTasks.map((task) => task.orderIndex));

    if (firstDeployOrder <= firstScaffoldOrder) {
      errors.push('First eai_deploy task must occur after at least one scaffold task.');
    }
  }

  const taskIds = new Set(tasks.map((task) => task.taskId));
  for (const task of tasks) {
    if (task.dependsOnTaskId && !taskIds.has(task.dependsOnTaskId)) {
      errors.push(`Task ${task.taskId} depends on unknown task ${task.dependsOnTaskId}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
