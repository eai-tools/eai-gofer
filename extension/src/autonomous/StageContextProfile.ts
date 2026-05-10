/**
 * StageContextProfile - Stage-Specific Context Budget Allocation
 *
 * Defines context budget allocation for each Gofer pipeline stage.
 * Different stages have different priorities for research, memories,
 * and code context.
 *
 * @see .specify/specs/011-context-health-recursive-memory/data-model.md
 * @see .specify/memory/context-profiles.yaml
 */

/**
 * Gofer pipeline stages.
 */
export type GoferStage =
  | 'research' // /1_gofer_research
  | 'specify' // /2_gofer_specify
  | 'plan' // /3_gofer_plan
  | 'tasks' // /4_gofer_tasks
  | 'implement' // /5_gofer_implement
  | 'validate'; // /6_gofer_validate

/**
 * All valid Gofer stages as an array for validation.
 */
export const GOFER_STAGES: GoferStage[] = [
  'research',
  'specify',
  'plan',
  'tasks',
  'implement',
  'validate',
];

/**
 * Context budget allocation for a specific stage.
 */
export interface StageContextProfile {
  /** Gofer pipeline stage */
  stage: GoferStage;

  /** Human-readable description of this profile */
  description?: string;

  /** Fraction of context budget for research documents (0-1) */
  researchBudget: number;

  /** Fraction of context budget for memories (0-1) */
  memoryBudget: number;

  /** Fraction of context budget for code (0-1) */
  codeBudget: number;

  /** Number of turns to keep observations before masking (1-50) */
  observationWindow: number;
}

/**
 * Configuration file format for context profiles.
 */
export interface StageContextProfileConfig {
  /** Config file version for migrations */
  version: string;

  /** Default stage to use when not specified */
  default: GoferStage;

  /** Map of stage name to profile configuration */
  profiles: Record<string, StageContextProfileYaml>;
}

/**
 * YAML format for a single stage profile.
 */
export interface StageContextProfileYaml {
  stage: string;
  description?: string;
  researchBudget: number;
  memoryBudget: number;
  codeBudget: number;
  observationWindow: number;
}

/**
 * Validation result for a stage profile.
 */
export interface ProfileValidationResult {
  /** Whether the profile is valid */
  valid: boolean;

  /** List of validation errors */
  errors: string[];

  /** List of validation warnings */
  warnings: string[];
}

/**
 * Budget allocation summary for a profile.
 */
export interface BudgetSummary {
  /** Total allocated budget (should be <= 1.0) */
  totalAllocated: number;

  /** Remaining budget for conversation */
  conversationBudget: number;

  /** Individual budget allocations */
  allocations: {
    research: number;
    memory: number;
    code: number;
  };
}

export interface StageConcisenessWarningResult {
  warning: boolean;
  conversationBudget: number;
  minimumConversationBudget: number;
  message?: string;
}

export interface ContextBudgetWarning {
  warning: boolean;
  stage?: string;
  utilizationRatio: number;
  criticalThresholdRatio: number;
  message: string;
}

const DEFAULT_MINIMUM_CONVERSATION_BUDGET = 0.15;

/**
 * Validates a GoferStage string.
 *
 * @param stage - Stage string to validate
 * @returns True if valid GoferStage
 */
export function isValidGoferStage(stage: string): stage is GoferStage {
  return GOFER_STAGES.includes(stage as GoferStage);
}

/**
 * Validates a stage context profile.
 *
 * @param profile - Profile to validate
 * @returns Validation result with errors and warnings
 */
export function validateProfile(profile: StageContextProfile): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate stage
  if (!isValidGoferStage(profile.stage)) {
    errors.push(`Invalid stage: ${profile.stage}. Must be one of: ${GOFER_STAGES.join(', ')}`);
  }

  // Validate budget fractions are 0-1
  if (profile.researchBudget < 0 || profile.researchBudget > 1) {
    errors.push(`researchBudget must be 0-1, got ${profile.researchBudget}`);
  }
  if (profile.memoryBudget < 0 || profile.memoryBudget > 1) {
    errors.push(`memoryBudget must be 0-1, got ${profile.memoryBudget}`);
  }
  if (profile.codeBudget < 0 || profile.codeBudget > 1) {
    errors.push(`codeBudget must be 0-1, got ${profile.codeBudget}`);
  }

  // Validate budget sum
  const totalBudget = profile.researchBudget + profile.memoryBudget + profile.codeBudget;
  if (totalBudget > 1.0) {
    errors.push(`Budget sum exceeds 1.0: ${totalBudget.toFixed(2)}`);
  }
  if (totalBudget > 0.85) {
    warnings.push(
      `Budget sum is high (${totalBudget.toFixed(2)}), leaving little room for conversation`
    );
  }

  // Validate observation window
  if (!Number.isInteger(profile.observationWindow)) {
    errors.push(`observationWindow must be an integer, got ${profile.observationWindow}`);
  } else if (profile.observationWindow < 1 || profile.observationWindow > 50) {
    errors.push(`observationWindow must be 1-50, got ${profile.observationWindow}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculates budget summary for a profile.
 *
 * @param profile - Stage context profile
 * @returns Budget allocation summary
 */
export function calculateBudgetSummary(profile: StageContextProfile): BudgetSummary {
  const totalAllocated = profile.researchBudget + profile.memoryBudget + profile.codeBudget;
  return {
    totalAllocated,
    conversationBudget: Math.max(0, 1.0 - totalAllocated),
    allocations: {
      research: profile.researchBudget,
      memory: profile.memoryBudget,
      code: profile.codeBudget,
    },
  };
}

export function evaluateStageConcisenessThreshold(
  profile: StageContextProfile,
  minimumConversationBudget: number = DEFAULT_MINIMUM_CONVERSATION_BUDGET
): StageConcisenessWarningResult {
  const summary = calculateBudgetSummary(profile);
  const warning = summary.conversationBudget < minimumConversationBudget;
  const message = warning
    ? `Conciseness threshold reached for ${profile.stage}: conversation budget ${summary.conversationBudget.toFixed(
        2
      )} is below ${minimumConversationBudget.toFixed(2)}.`
    : undefined;

  return {
    warning,
    conversationBudget: summary.conversationBudget,
    minimumConversationBudget,
    message,
  };
}

export function buildContextBudgetWarning(
  stage: string | undefined,
  utilizationPercent: number,
  criticalThresholdRatio: number
): ContextBudgetWarning {
  const normalizedThreshold =
    criticalThresholdRatio > 0 && criticalThresholdRatio <= 1 ? criticalThresholdRatio : 0.7;
  const utilizationRatio = Math.max(0, utilizationPercent / 100);
  const warning = utilizationRatio >= normalizedThreshold;
  const stageLabel = stage ?? 'current stage';
  const message = warning
    ? `Context budget warning: ${stageLabel} reached ${utilizationPercent.toFixed(1)}% (critical ${(
        normalizedThreshold * 100
      ).toFixed(0)}%). Keep stage outputs concise and deterministic.`
    : `Context budget healthy for ${stageLabel}: ${utilizationPercent.toFixed(1)}% used.`;

  return {
    warning,
    stage,
    utilizationRatio,
    criticalThresholdRatio: normalizedThreshold,
    message,
  };
}

/**
 * Default profiles for each stage when no config file exists.
 */
export const DEFAULT_PROFILES: Record<GoferStage, StageContextProfile> = {
  research: {
    stage: 'research',
    description: 'Research phase prioritizes broad codebase exploration',
    researchBudget: 0.15,
    memoryBudget: 0.2,
    codeBudget: 0.4,
    observationWindow: 15,
  },
  specify: {
    stage: 'specify',
    description: 'Specification phase balances research and requirements',
    researchBudget: 0.3,
    memoryBudget: 0.2,
    codeBudget: 0.2,
    observationWindow: 12,
  },
  plan: {
    stage: 'plan',
    description: 'Planning phase emphasizes architecture and contracts',
    researchBudget: 0.25,
    memoryBudget: 0.25,
    codeBudget: 0.25,
    observationWindow: 10,
  },
  tasks: {
    stage: 'tasks',
    description: 'Task generation needs plan and spec context',
    researchBudget: 0.2,
    memoryBudget: 0.15,
    codeBudget: 0.3,
    observationWindow: 8,
  },
  implement: {
    stage: 'implement',
    description: 'Implementation maximizes code context for accuracy',
    researchBudget: 0.1,
    memoryBudget: 0.15,
    codeBudget: 0.45,
    observationWindow: 10,
  },
  validate: {
    stage: 'validate',
    description: 'Validation compares implementation against spec',
    researchBudget: 0.2,
    memoryBudget: 0.15,
    codeBudget: 0.35,
    observationWindow: 12,
  },
};

/**
 * Gets the default profile for a stage.
 *
 * @param stage - Gofer stage
 * @returns Default profile for the stage
 */
export function getDefaultProfile(stage: GoferStage): StageContextProfile {
  return DEFAULT_PROFILES[stage];
}
