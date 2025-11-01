/**
 * Type definitions for the Autonomous Claude Code Driver
 */

// ============================================================================
// Session Management
// ============================================================================

export type SessionStatus =
  | 'initializing'
  | 'running'
  | 'waiting_user'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AutonomousSession {
  // Identity
  sessionId: string;
  specId: string;

  // Timestamps
  startedAt: string;
  pausedAt: string | null;
  resumedAt: string | null;
  completedAt: string | null;

  // Status
  status: SessionStatus;

  // Terminals
  terminals: TerminalState[];

  // Progress
  totalTasks: number;
  completedTasks: string[];
  currentTask: string | null;
  failedTasks: TaskFailure[];

  // Context management
  tokenCount: number;
  contextSwitches: number;

  // History
  events: SessionEvent[];
  errorHistory: ErrorEvent[];
  questionHistory: QuestionEvent[];

  // Configuration
  options: DriverOptions;
}

// ============================================================================
// Terminal Management
// ============================================================================

export type TerminalRole = 'engineer' | 'tester';

export interface TerminalState {
  // Identity
  terminalId: string;
  terminalName: string;
  role: TerminalRole;

  // Lifecycle
  createdAt: string;
  closedAt: string | null;

  // Status
  isAlive: boolean;
  pid: number | null;

  // Output capture
  outputBuffer: string[];
  tokenCount: number;

  // Current activity
  currentCommand: string | null;
  lastActivity: string;
}

// ============================================================================
// Task Management
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed';

export interface TaskUpdate {
  // Identity
  taskId: string;
  specId: string;

  // Status change
  previousStatus: TaskStatus;
  newStatus: TaskStatus;

  // Context
  terminalId: string;
  timestamp: string;
  duration: number | null;

  // Artifacts
  filesModified: string[];
  testsRun: TestResult[];
  errors: ErrorInfo[];
}

export interface TaskFailure {
  taskId: string;
  error: string;
  timestamp: string;
  recoveryAttempts: number;
}

export interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  errorMessage: string | null;
}

// ============================================================================
// Error Recovery
// ============================================================================

export type ErrorType =
  | 'syntax_error'
  | 'type_error'
  | 'test_failure'
  | 'linting_error'
  | 'runtime_error'
  | 'dependency_missing'
  | 'authentication_failure';

export type ErrorSeverity = 'recoverable' | 'needs_context' | 'fatal';

export interface ErrorInfo {
  // Identity
  errorId: string;
  taskId: string;

  // Classification
  errorType: ErrorType;
  severity: ErrorSeverity;

  // Detection
  detectedAt: string;
  detectionLatency: number;

  // Content
  errorMessage: string;
  stackTrace: string | null;
  affectedFiles: string[];

  // Recovery
  retryAttempts: RetryAttempt[];
  recovered: boolean;
  escalated: boolean;
}

export type RetryStrategy =
  | 'send_error_only'
  | 'send_error_with_file_context'
  | 'send_error_with_constitution';

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  strategy: RetryStrategy;
  contextAdded: string[];
  result: 'success' | 'failed' | 'escalated';
  durationMs: number;
}

export interface ErrorEscalation {
  errorId: string;
  taskId: string;
  severity: ErrorSeverity;
  message: string;
  affectedFiles: string[];
  retryAttempts: number;
  contextProvided: Array<{
    strategy: RetryStrategy;
    context: string[];
  }>;
  escalated: boolean;
  escalatedAt: string;
  formattedForVSCode: string;
  formattedForWhatsApp: string;
}

// ============================================================================
// Question Routing
// ============================================================================

export type NotificationChannel = 'vscode' | 'whatsapp' | 'email';
export type QuestionConfidence = 'high' | 'medium' | 'low';

export interface Question {
  // Identity
  questionId: string;
  taskId: string;
  sessionId: string;

  // Detection
  detectedAt: string;
  confidence: QuestionConfidence;
  patterns: string[];

  // Content
  questionText: string;
  options: string[];
  context: string;

  // Routing
  notificationChannel: NotificationChannel;
  sentAt: string | null;

  // Response
  userResponse: string | null;
  respondedAt: string | null;
  sentToClaudeAt: string | null;
  timeout: boolean;
}

// ============================================================================
// Progress Tracking
// ============================================================================

export interface ProgressUpdate {
  sessionId: string;
  timestamp: string;

  // Progress metrics
  tasksCompleted: number;
  tasksTotal: number;
  percentComplete: number;
  estimatedTimeRemaining: number | null;

  // Current activity
  currentTask: string | null;
  currentTerminal: string;
  currentAction: string;

  // Status indicators
  testsRun: number;
  testsPassed: number;
  testsFailed: number;

  // Performance
  elapsedTime: number;
  tokensUsed: number;
  contextSwitches: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DriverOptions {
  // Mode
  enableParallelTester: boolean;

  // Terminal visibility
  showTerminals: boolean;

  // Notification preferences
  notificationChannel: NotificationChannel;
  whatsappPhoneNumber: string | null;
  emailAddress: string | null;

  // Thresholds
  maxRetries: number;
  tokenWarningThreshold: number;
  tokenActionThreshold: number;
  questionTimeout: number;

  // Validation
  runFinalValidation: boolean;
  validateConstitution: boolean;
}

// ============================================================================
// Event Logging
// ============================================================================

export type SessionEventType =
  | 'session_started'
  | 'terminal_spawned'
  | 'command_sent'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'error_detected'
  | 'retry_attempted'
  | 'question_detected'
  | 'question_answered'
  | 'context_switch'
  | 'context_built'
  | 'user_paused'
  | 'user_resumed'
  | 'session_completed'
  | 'session_failed'
  | 'session_cancelled';

export interface SessionEvent {
  timestamp: string;
  type: SessionEventType;
  data: Record<string, unknown>;
}

export interface ErrorEvent extends SessionEvent {
  type: 'error_detected';
  data: {
    errorId: string;
    errorType: ErrorType;
    severity: ErrorSeverity;
    taskId: string;
  };
}

export interface QuestionEvent extends SessionEvent {
  type: 'question_detected';
  data: {
    questionId: string;
    confidence: QuestionConfidence;
    taskId: string;
  };
}

// ============================================================================
// Parsed Events (from OutputMonitor)
// ============================================================================

export type ParsedEventType =
  | 'task_update'
  | 'error_detected'
  | 'question_detected'
  | 'context_warning'
  | 'test_result';

export interface ParsedEvent {
  type: ParsedEventType;
  timestamp: string;
  data: unknown;
}

// ============================================================================
// Callbacks
// ============================================================================

export type ProgressCallback = (update: ProgressUpdate) => void;
export type QuestionCallback = (question: Question) => Promise<string>;
export type ErrorCallback = (error: DriverError) => void;
export type CompletionCallback = (report: CompletionReport) => void;

export interface DriverError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface CompletionReport {
  sessionId: string;
  specId: string;
  status: 'success' | 'failed' | 'cancelled';
  duration: number;
  tasksCompleted: number;
  tasksTotal: number;
  errors: number;
  retries: number;
  contextSwitches: number;
  summary: string;
}
