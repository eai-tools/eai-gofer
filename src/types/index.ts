/**
 * Shared Type Definitions for Autonomous Specification Execution System
 *
 * Based on data-model.md from feature 003-orchestrator-agents
 * @see .specify/specs/003-orchestrator-agents/data-model.md
 */

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Specification - Complete feature with tasks, acceptance criteria, and metadata
 */
export interface Specification {
  id: string;
  title: string;
  status: SpecStatus;
  created: string;
  updated: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: string;
  tasks: Task[];
  acceptanceCriteria: AcceptanceCriterion[];
  qaRules?: QARule[];
}

export type SpecStatus = 'draft' | 'in_progress' | 'completed' | 'failed';

export interface AcceptanceCriterion {
  id: string;
  description: string;
  status: 'pending' | 'passed' | 'failed';
}

export interface QARule {
  pattern: string;
  answer: string;
  confidence: number;
}

/**
 * Task - Individual work item with dependencies and status tracking
 */
export interface Task {
  id: string;
  specId: string;
  description: string;
  status: TaskStatus;
  deliveryPrompt?: string;
  dependencies: string[];
  attemptCount: number;
  lastError?: string;
  startedAt?: string;
  completedAt?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * ValidationResult - Code quality assessment from Engineer Agent
 */
export interface ValidationResult {
  id: string;
  taskId: string;
  timestamp: string;
  isValid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
  constitutionChecks: Record<string, boolean>;
}

export interface ValidationIssue {
  category: 'functional' | 'security' | 'performance' | 'quality' | 'constitution';
  severity: 'blocker' | 'critical' | 'major' | 'minor';
  description: string;
  location?: string;
}

/**
 * TestResult - Output from running automated tests
 */
export interface TestResult {
  id: string;
  taskId: string;
  timestamp: string;
  testType: 'unit' | 'integration' | 'e2e';
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  failures: TestFailure[];
  coverage?: CoverageReport;
}

export interface TestFailure {
  testName: string;
  error: string;
  stackTrace?: string;
  screenshot?: string;
}

export interface CoverageReport {
  line: number;
  branch: number;
  function: number;
  statement: number;
}

/**
 * Question - Inquiry from AI assistant needing clarification
 */
export interface Question {
  id: string;
  taskId?: string;
  specId: string;
  timestamp: string;
  question: string;
  context: string;
  answeredBy?: 'qa-engine' | 'human';
  answerId?: string;
}

/**
 * Answer - Response to a question with confidence scoring
 */
export interface Answer {
  id: string;
  questionId: string;
  timestamp: string;
  answer: string;
  confidence: number;
  sources: string[];
  method: 'qa-engine' | 'human';
}

/**
 * Notification - Alert sent to humans when orchestrator needs intervention
 */
export interface Notification {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  context: NotificationContext;
  deliveryStatus: 'queued' | 'sending' | 'delivered' | 'failed' | 'persisted';
  deliveryMethod: 'whatsapp' | 'file-fallback';
  deliveryError?: string;
  respondedAt?: string;
  response?: string;
}

export interface NotificationContext {
  taskId?: string;
  specId: string;
  reason: 'task-failed' | 'question-escalated' | 'critical-error';
  details: Record<string, unknown>;
}

/**
 * LogEntry - Structured operational log entry
 */
export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;
  taskId?: string;
  specId?: string;
  context: Record<string, unknown>;
}

// ============================================================================
// Configuration & Options
// ============================================================================

export interface OrchestratorConfig {
  specsDir: string;
  constitutionPath: string;
  logPath: string;
  notificationLogPath: string;
  maxRetries: number;
  retryIntervals: number[];
  scaleLimits: {
    maxSpecs: number;
    maxTasksPerSpec: number;
  };
  whatsapp?: {
    sessionPath: string;
    phoneNumber?: string;
  };
  claude: {
    apiKey: string;
    model: string;
    maxTokens: number;
    rateLimit: number;
  };
}

export interface SpecLoaderOptions {
  specsDir: string;
  cacheEnabled: boolean;
  validateOnLoad: boolean;
}

export interface TaskQueueOptions {
  detectCircular: boolean;
  validateDependencies: boolean;
  warnOnScaleLimit: boolean;
}

// ============================================================================
// Event Types (for structured logging)
// ============================================================================

export type EventType =
  | 'orchestrator_started'
  | 'orchestrator_stopped'
  | 'spec_loaded'
  | 'spec_parse_error'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'validation_started'
  | 'validation_completed'
  | 'test_started'
  | 'test_completed'
  | 'test_failed'
  | 'notification_sent'
  | 'notification_failed'
  | 'file_conflict_detected'
  | 'scale_limit_exceeded'
  | 'retry_scheduled'
  | 'claude_api_call'
  | 'claude_rate_limit'
  | 'whatsapp_auth_required'
  | 'whatsapp_connected'
  | 'whatsapp_disconnected';
