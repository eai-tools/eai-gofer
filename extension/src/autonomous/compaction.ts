/**
 * Memory and Learning System - Compaction Contracts
 *
 * Defines interfaces for CompactionSummary and ContextCompactor.
 * These contracts specify the API for context window management and summarization.
 *
 * @see data-model.md for detailed entity schemas
 */

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Represents the result of a context compaction operation.
 */
export interface CompactionSummary {
  /** Unique identifier for the autonomous execution session */
  sessionId: string;

  /** Task IDs that were summarized (e.g., ["T001", "T015"]) */
  tasksCompacted: string[];

  /** Human-readable summary (max 2000 characters) */
  summaryText: string;

  /** Estimated tokens removed from context */
  tokensSaved: number;

  /** Compaction timestamp (Unix milliseconds) */
  compactedAt: number;

  /** Last N tasks kept in full detail */
  preservedTasks: string[];

  /** Compaction strategy used */
  strategy: CompactionStrategy;
}

/**
 * Strategy configuration for compaction.
 */
export interface CompactionStrategy {
  /** Number of recent tasks to preserve in full detail */
  preserveLastN: number;

  /** Number of tasks to summarize per batch */
  summarizeBatchSize: number;

  /** Template for summarization prompt */
  summaryPrompt: string;

  /** Whether to use fallback (cheaper) model for summarization */
  useFallbackModel: boolean;

  /** Target token reduction percentage (0-100) */
  targetReduction: number;
}

// ============================================================================
// Session State
// ============================================================================

/**
 * Represents an autonomous execution session.
 * (Minimal interface for compaction - full Session defined elsewhere)
 */
export interface Session {
  /** Session identifier */
  id: string;

  /** Spec being executed */
  specId: string;

  /** Current session status */
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

  /** Current task ID */
  currentTask: string | null;

  /** Completed task IDs */
  completedTasks: string[];

  /** Failed task IDs */
  failedTasks: string[];

  /** Full LLM context */
  context: string;

  /** History of compaction operations */
  compactionHistory: CompactionSummary[];

  /** Session start timestamp */
  startedAt: number;

  /** Last update timestamp */
  lastUpdatedAt: number;

  /** Completion timestamp (if completed) */
  completedAt?: number;
}

/**
 * Task information for compaction.
 * (Minimal interface - full Task defined elsewhere)
 */
export interface Task {
  /** Task identifier */
  id: string;

  /** Task description */
  description: string;

  /** Files modified by this task */
  affectedFiles?: string[];

  /** Task completion status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  /** Task completion timestamp */
  completedAt?: number;
}

// ============================================================================
// Context Analysis
// ============================================================================

/**
 * Result of analyzing context usage.
 */
export interface ContextAnalysis {
  /** Current context text */
  context: string;

  /** Estimated token count */
  estimatedTokens: number;

  /** Total context window size */
  contextWindowSize: number;

  /** Usage percentage (0-100) */
  usagePercentage: number;

  /** Whether compaction is recommended */
  shouldCompact: boolean;

  /** Reason compaction is/isn't recommended */
  reason: string;

  /** Breakdown of context by section */
  breakdown: ContextBreakdown;
}

/**
 * Breakdown of context by section.
 */
export interface ContextBreakdown {
  /** Tokens in system prompt */
  systemPrompt: number;

  /** Tokens in task descriptions */
  tasks: number;

  /** Tokens in completed work */
  completedWork: number;

  /** Tokens in error messages */
  errors: number;

  /** Tokens in memories */
  memories: number;

  /** Tokens in hints */
  hints: number;

  /** Other tokens */
  other: number;
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * ContextCompactor service interface.
 *
 * Provides context window monitoring and intelligent summarization.
 * Triggers automatically at threshold or can be invoked manually.
 */
export interface ContextCompactor {
  /**
   * Check if context should be compacted based on usage threshold.
   *
   * @param session - Current session state
   * @returns True if compaction should occur
   */
  shouldCompact(session: Session): Promise<boolean>;

  /**
   * Perform context compaction on a session.
   *
   * Summarizes older completed tasks while preserving recent work.
   * Updates session context and returns summary.
   *
   * @param session - Session to compact
   * @param strategy - Optional custom strategy (uses default if not provided)
   * @returns Compaction summary with details
   */
  compact(session: Session, strategy?: Partial<CompactionStrategy>): Promise<CompactionSummary>;

  /**
   * Estimate token usage for a context string.
   *
   * Uses characters/4 approximation for speed.
   *
   * @param context - Context text
   * @returns Estimated token count
   */
  estimateTokenUsage(context: string): number;

  /**
   * Analyze current context usage and provide recommendations.
   *
   * @param session - Current session
   * @returns Detailed analysis with breakdown
   */
  analyzeContext(session: Session): Promise<ContextAnalysis>;

  /**
   * Summarize completed tasks using LLM.
   *
   * @param tasks - Array of completed tasks to summarize
   * @param strategy - Compaction strategy
   * @returns Concise summary text
   */
  summarizeTasks(tasks: Task[], strategy: CompactionStrategy): Promise<string>;

  /**
   * Get default compaction strategy.
   *
   * @returns Default CompactionStrategy object
   */
  getDefaultStrategy(): CompactionStrategy;

  /**
   * Set compaction threshold (percentage of context window).
   *
   * @param threshold - Threshold percentage (50-95)
   */
  setThreshold(threshold: number): void;

  /**
   * Get current compaction threshold.
   *
   * @returns Threshold percentage
   */
  getThreshold(): number;

  /**
   * Preview what would be compacted without actually compacting.
   *
   * @param session - Session to preview
   * @returns Preview of compaction results
   */
  previewCompaction(session: Session): Promise<CompactionPreview>;

  /**
   * Rollback last compaction (if possible).
   *
   * Restores full context from backup.
   *
   * @param session - Session to rollback
   * @returns True if rollback successful
   */
  rollbackCompaction(session: Session): Promise<boolean>;
}

// ============================================================================
// Compaction Results
// ============================================================================

/**
 * Preview of compaction without actually executing.
 */
export interface CompactionPreview {
  /** Tasks that would be compacted */
  tasksToCompact: string[];

  /** Tasks that would be preserved */
  tasksToPreserve: string[];

  /** Estimated tokens before compaction */
  tokensBefore: number;

  /** Estimated tokens after compaction */
  tokensAfter: number;

  /** Estimated tokens saved */
  tokensSaved: number;

  /** Reduction percentage */
  reductionPercent: number;

  /** Preview of summary text */
  summaryPreview: string;
}

/**
 * Result of compaction operation with extended metrics.
 */
export interface CompactionResult {
  /** Compaction summary */
  summary: CompactionSummary;

  /** Updated session with new context */
  updatedSession: Session;

  /** Performance metrics */
  metrics: CompactionMetrics;

  /** Whether fallback strategy was used */
  usedFallback: boolean;
}

/**
 * Performance metrics for compaction.
 */
export interface CompactionMetrics {
  /** Compaction duration in milliseconds */
  duration: number;

  /** LLM API call count */
  apiCalls: number;

  /** Total LLM API latency */
  apiLatency: number;

  /** Tokens before compaction */
  tokensBefore: number;

  /** Tokens after compaction */
  tokensAfter: number;

  /** Actual reduction percentage */
  actualReduction: number;

  /** Cost estimate (if available) */
  estimatedCost?: number;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration options for ContextCompactor.
 */
export interface CompactorConfig {
  /** Context window size in tokens */
  contextWindowSize: number;

  /** Compaction trigger threshold (0-1, e.g., 0.80 for 80%) */
  threshold: number;

  /** Default compaction strategy */
  defaultStrategy: CompactionStrategy;

  /** Whether to auto-compact when threshold reached */
  autoCompact: boolean;

  /** Whether to backup context before compaction */
  enableBackup: boolean;

  /** Maximum number of backups to retain */
  maxBackups: number;
}

// ============================================================================
// Fallback Strategies
// ============================================================================

/**
 * Fallback strategy when compaction fails.
 */
export type FallbackStrategy =
  | 'truncate' // Remove oldest messages
  | 'summarize_all' // Summarize everything except current task
  | 'error' // Fail execution and notify user
  | 'continue'; // Continue without compaction (risky)

/**
 * Fallback configuration.
 */
export interface FallbackConfig {
  /** Primary fallback strategy */
  strategy: FallbackStrategy;

  /** Number of messages to preserve if truncating */
  preserveCount?: number;

  /** Whether to notify user of fallback */
  notifyUser: boolean;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by ContextCompactor.
 */
export interface ContextCompactorEvents {
  /** Emitted when compaction starts */
  onCompactionStart: (sessionId: string) => void;

  /** Emitted when compaction completes */
  onCompactionComplete: (result: CompactionResult) => void;

  /** Emitted when compaction fails */
  onCompactionFailed: (sessionId: string, error: Error) => void;

  /** Emitted when threshold is reached */
  onThresholdReached: (session: Session, analysis: ContextAnalysis) => void;

  /** Emitted when fallback strategy is used */
  onFallbackUsed: (sessionId: string, strategy: FallbackStrategy) => void;

  /** Emitted when context is analyzed */
  onContextAnalyzed: (analysis: ContextAnalysis) => void;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result for compaction summary.
 */
export interface CompactionValidation {
  /** Whether summary is valid */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];
}
