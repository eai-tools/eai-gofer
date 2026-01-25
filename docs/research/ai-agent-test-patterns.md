# AI Agent Interface Design Patterns for Test Execution

## Research Summary

This document provides comprehensive guidance on implementing structured
interfaces for AI agent test execution, focusing on JSON Schema patterns,
progress streaming, and error handling strategies. Research is based on the
Gofer codebase, industry best practices, and Claude MCP specifications.

---

## 1. Structured Output Formats: JSON Schema for Test Results

### 1.1 Recommended JSON Schema for Test Results

AI agents require strongly-typed, parseable test result formats. The following
schema is agent-friendly and provides comprehensive information without
ambiguity:

```typescript
/**
 * Unified Test Result Schema - AI Agent Friendly
 * Supports unit, integration, and e2e tests
 */
export interface TestResultSchema {
  // Identification & Metadata
  id: string; // UUID v4 for traceability
  taskId: string; // Reference to executing task
  sessionId: string; // Trace back to session
  timestamp: string; // ISO 8601 execution time
  duration: number; // Execution time in milliseconds

  // Test Identification
  testType: 'unit' | 'integration' | 'e2e' | 'contract' | 'performance';
  testFramework: string; // 'vitest', 'jest', 'mocha', etc.
  testFile: string; // Path to test file

  // Aggregated Results
  summary: {
    passed: boolean; // Overall pass/fail
    total: number; // Total tests run
    passed_count: number; // Tests passed
    failed_count: number; // Tests failed
    skipped_count: number; // Tests skipped
    pass_rate: number; // Percentage 0-100
  };

  // Individual Test Details
  tests: Array<{
    name: string; // Full test name
    status: 'passed' | 'failed' | 'skipped' | 'pending';
    duration: number; // ms
    errorMessage?: string; // Error if failed
    errorStack?: string; // Full stack trace
    assertions?: {
      // For assertion libraries
      passed: number;
      failed: number;
    };
    coverage?: {
      // Code coverage (if available)
      line: number;
      branch: number;
      function: number;
      statement: number;
    };
  }>;

  // Structured Error Information
  failures?: Array<{
    testName: string;
    errorType: string; // 'AssertionError', 'TimeoutError', etc.
    errorMessage: string;
    stackTrace: string;
    affectedFiles: string[];
    suggestion?: string; // AI-provided recovery suggestion
  }>;

  // Performance Metrics
  performance: {
    slowest_tests: Array<{
      name: string;
      duration: number;
    }>;
    total_duration: number;
    avg_test_duration: number;
  };

  // Environment Context
  environment: {
    nodeVersion: string;
    platform: string;
    workspaceRoot: string;
    testCommand: string;
  };

  // Agent Feedback Fields
  agentAnalysis?: {
    rootCause?: string; // AI's analysis of failure root cause
    recoverySteps?: string[]; // AI's recommended fixes
    confidence: number; // 0-1 confidence in recovery steps
  };
}
```

### 1.2 JSON Schema Definition (JSON Schema Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gofer.dev/schemas/test-result-v1.json",
  "title": "AI Agent Test Result Schema",
  "description": "Structured test output for AI agent consumption",

  "type": "object",
  "required": [
    "id",
    "taskId",
    "sessionId",
    "timestamp",
    "duration",
    "testType",
    "testFramework",
    "testFile",
    "summary"
  ],

  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      "description": "UUID v4 for result traceability"
    },
    "taskId": {
      "type": "string",
      "pattern": "^[A-Z]\\d{3}$|^#?\\d+$",
      "description": "Task identifier (T001 or #1 format)"
    },
    "sessionId": {
      "type": "string",
      "description": "Session identifier for traceability"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 execution timestamp"
    },
    "duration": {
      "type": "integer",
      "minimum": 0,
      "description": "Total execution duration in milliseconds"
    },
    "testType": {
      "type": "string",
      "enum": ["unit", "integration", "e2e", "contract", "performance"]
    },
    "testFramework": {
      "type": "string",
      "enum": ["vitest", "jest", "mocha", "playwright", "cypress"]
    },
    "testFile": {
      "type": "string",
      "description": "Relative path to test file"
    },
    "summary": {
      "type": "object",
      "required": ["passed", "total", "passed_count", "failed_count"],
      "properties": {
        "passed": { "type": "boolean" },
        "total": { "type": "integer", "minimum": 0 },
        "passed_count": { "type": "integer", "minimum": 0 },
        "failed_count": { "type": "integer", "minimum": 0 },
        "skipped_count": { "type": "integer", "minimum": 0 },
        "pass_rate": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    },
    "tests": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "status", "duration"],
        "properties": {
          "name": { "type": "string" },
          "status": {
            "type": "string",
            "enum": ["passed", "failed", "skipped", "pending"]
          },
          "duration": { "type": "integer", "minimum": 0 },
          "errorMessage": { "type": ["string", "null"] },
          "errorStack": { "type": ["string", "null"] }
        }
      }
    },
    "failures": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["testName", "errorType", "errorMessage", "stackTrace"],
        "properties": {
          "testName": { "type": "string" },
          "errorType": { "type": "string" },
          "errorMessage": { "type": "string" },
          "stackTrace": { "type": "string" },
          "affectedFiles": {
            "type": "array",
            "items": { "type": "string" }
          },
          "suggestion": { "type": ["string", "null"] }
        }
      }
    },
    "environment": {
      "type": "object",
      "properties": {
        "nodeVersion": { "type": "string" },
        "platform": { "type": "string" },
        "workspaceRoot": { "type": "string" },
        "testCommand": { "type": "string" }
      }
    }
  },
  "additionalProperties": false
}
```

### 1.3 Implementation Example (TypeScript + Validation)

```typescript
import Ajv, { ValidateFunction } from 'ajv';

// Compile schema once for performance
const ajv = new Ajv({
  allErrors: true,
  strictSchema: true,
  validateFormats: true,
  coerceTypes: false,
});

const testResultSchema = {
  /* JSON Schema above */
};
const validateTestResult: ValidateFunction = ajv.compile(testResultSchema);

// In test runner
async function formatTestResults(rawResults: any): Promise<TestResultSchema> {
  const formatted: TestResultSchema = {
    id: crypto.randomUUID(),
    taskId: process.env.TASK_ID || 'unknown',
    sessionId: process.env.SESSION_ID || 'unknown',
    timestamp: new Date().toISOString(),
    duration: rawResults.duration,
    testType: 'unit',
    testFramework: 'vitest',
    testFile: rawResults.file,
    summary: {
      passed: rawResults.numFailedTests === 0,
      total: rawResults.numTotalTests,
      passed_count: rawResults.numPassedTests,
      failed_count: rawResults.numFailedTests,
      skipped_count: rawResults.numPendingTests,
      pass_rate: (rawResults.numPassedTests / rawResults.numTotalTests) * 100,
    },
    tests: rawResults.testResults.map((t) => ({
      name: t.fullName,
      status: t.status,
      duration: t.duration,
      errorMessage: t.failureMessage || null,
      errorStack: t.failureStack || null,
    })),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      workspaceRoot: process.cwd(),
      testCommand: process.argv.join(' '),
    },
  };

  // Validate before returning
  const valid = validateTestResult(formatted);
  if (!valid) {
    console.error('Invalid test result schema:', validateTestResult.errors);
    throw new Error(
      `Test result validation failed: ${JSON.stringify(validateTestResult.errors)}`
    );
  }

  return formatted;
}
```

---

## 2. Progress Streaming Protocols for Real-Time Updates

### 2.1 Server-Sent Events (SSE) Approach

SSE is ideal for one-directional streaming from server to AI agent, with
automatic reconnection support.

```typescript
/**
 * Test Progress Update Event (SSE Compatible)
 */
export interface TestProgressEvent {
  type: 'test:start' | 'test:progress' | 'test:complete' | 'test:error';
  timestamp: string;
  taskId: string;
  sessionId: string;

  payload: {
    // For test:start
    totalTests?: number;
    testFile?: string;

    // For test:progress
    currentTest?: string;
    testsRun?: number;
    passed?: number;
    failed?: number;
    duration?: number;

    // For test:complete
    finalResult?: TestResultSchema;
    totalDuration?: number;

    // For test:error
    error?: string;
    errorType?: string;
    retryable?: boolean;
  };
}

/**
 * SSE Stream Manager for Test Execution
 */
export class TestProgressStreamManager {
  private eventEmitter: EventEmitter = new EventEmitter();

  /**
   * Start streaming test progress via HTTP SSE
   */
  async streamTestExecution(
    taskId: string,
    testCommand: string,
    res: Response
  ): Promise<void> {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const testStartEvent: TestProgressEvent = {
      type: 'test:start',
      timestamp: new Date().toISOString(),
      taskId,
      sessionId: generateSessionId(),
      payload: {
        testFile: testCommand,
        totalTests: 0, // Will be updated
      },
    };

    res.write(`event: test-progress\n`);
    res.write(`data: ${JSON.stringify(testStartEvent)}\n\n`);

    // Track progress
    let passed = 0,
      failed = 0;

    const progressHandler = (update: TestProgressEvent) => {
      res.write(`event: test-progress\n`);
      res.write(`id: ${Date.now()}\n`);
      res.write(`data: ${JSON.stringify(update)}\n\n`);
    };

    this.eventEmitter.on('progress', progressHandler);

    try {
      // Execute tests with progress tracking
      const result = await this.executeTestsWithProgress(
        taskId,
        testCommand,
        (progress) => {
          passed = progress.passed;
          failed = progress.failed;

          this.eventEmitter.emit('progress', {
            type: 'test:progress',
            timestamp: new Date().toISOString(),
            taskId,
            sessionId: testStartEvent.payload,
            payload: {
              currentTest: progress.currentTest,
              testsRun: progress.testsRun,
              passed,
              failed,
              duration: progress.elapsed,
            },
          });
        }
      );

      // Send completion event
      this.eventEmitter.emit('progress', {
        type: 'test:complete',
        timestamp: new Date().toISOString(),
        taskId,
        sessionId: testStartEvent.payload,
        payload: {
          finalResult: result,
          totalDuration: result.duration,
        },
      });
    } catch (error) {
      this.eventEmitter.emit('progress', {
        type: 'test:error',
        timestamp: new Date().toISOString(),
        taskId,
        sessionId: testStartEvent.payload,
        payload: {
          error: String(error),
          errorType: error.constructor.name,
          retryable: isRetryableError(error),
        },
      });
    } finally {
      this.eventEmitter.off('progress', progressHandler);
      res.end();
    }
  }

  /**
   * Execute tests with progress callbacks
   */
  private async executeTestsWithProgress(
    taskId: string,
    testCommand: string,
    onProgress: (progress: ProgressUpdate) => void
  ): Promise<TestResultSchema> {
    // Implementation would parse test runner output
    // and call onProgress() at regular intervals

    const startTime = Date.now();
    const testProcess = spawn('npm', ['test', '--', testCommand]);

    let testsRun = 0;
    let passed = 0;
    let failed = 0;

    testProcess.stdout.on('data', (data) => {
      const output = data.toString();

      // Parse progress indicators
      if (output.includes('PASS') || output.includes('✓')) {
        passed++;
        testsRun++;
      } else if (output.includes('FAIL') || output.includes('✗')) {
        failed++;
        testsRun++;
      }

      // Emit progress every 500ms or test completion
      onProgress({
        currentTest: extractCurrentTest(output),
        testsRun,
        passed,
        failed,
        elapsed: Date.now() - startTime,
      });
    });

    return new Promise((resolve, reject) => {
      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve(/* formatted result */);
        } else {
          reject(new Error(`Tests failed with code ${code}`));
        }
      });
    });
  }
}
```

### 2.2 WebSocket Approach (Bidirectional)

For real-time feedback and pause/resume capabilities:

```typescript
/**
 * WebSocket Protocol for Test Execution Control
 */
export interface TestExecutionMessage {
  // Client -> Server
  'execution:start': { taskId: string; testCommand: string };
  'execution:pause': { taskId: string };
  'execution:resume': { taskId: string };
  'execution:cancel': { taskId: string };

  // Server -> Client
  'progress:update': TestProgressEvent;
  'progress:complete': { result: TestResultSchema; duration: number };
  'progress:error': { error: string; retryable: boolean };
  'execution:paused': { taskId: string; state: ExecutionState };
}

export class TestExecutionWebSocketHandler {
  private activeSessions = new Map<string, ExecutionSession>();

  handleConnection(ws: WebSocket, taskId: string): void {
    const session: ExecutionSession = {
      taskId,
      status: 'idle',
      startTime: null,
      pausedAt: null,
      testProcess: null,
    };

    this.activeSessions.set(taskId, session);

    ws.on('message', async (data) => {
      const message = JSON.parse(data) as TestExecutionMessage;

      if ('execution:start' in message) {
        await this.startExecution(
          taskId,
          message['execution:start'].testCommand,
          ws
        );
      } else if ('execution:pause' in message) {
        this.pauseExecution(taskId);
      } else if ('execution:resume' in message) {
        this.resumeExecution(taskId);
      } else if ('execution:cancel' in message) {
        this.cancelExecution(taskId);
      }
    });

    ws.on('close', () => {
      this.activeSessions.delete(taskId);
    });
  }

  private async startExecution(
    taskId: string,
    testCommand: string,
    ws: WebSocket
  ): Promise<void> {
    const session = this.activeSessions.get(taskId);
    if (!session) return;

    session.status = 'running';
    session.startTime = Date.now();

    // Spawn test process
    const testProcess = spawn('npm', ['test', '--', testCommand]);
    session.testProcess = testProcess;

    testProcess.stdout.on('data', (data) => {
      const progress = this.parseProgress(data.toString());

      ws.send(
        JSON.stringify({
          type: 'progress:update',
          payload: progress,
        })
      );
    });

    testProcess.on('close', (code) => {
      const result = this.formatFinalResult(session, code === 0);
      ws.send(
        JSON.stringify({
          type: 'progress:complete',
          payload: {
            result,
            duration: Date.now() - session.startTime!,
          },
        })
      );

      session.status = 'completed';
    });
  }

  private pauseExecution(taskId: string): void {
    const session = this.activeSessions.get(taskId);
    if (!session || !session.testProcess) return;

    // SIGSTOP pauses the process
    session.testProcess.kill('SIGSTOP');
    session.status = 'paused';
    session.pausedAt = Date.now();
  }

  private resumeExecution(taskId: string): void {
    const session = this.activeSessions.get(taskId);
    if (!session || !session.testProcess) return;

    // SIGCONT resumes the process
    session.testProcess.kill('SIGCONT');
    session.status = 'running';
  }
}
```

### 2.3 Structured Progress Update Format

```typescript
/**
 * Standard Progress Update - Used by both SSE and WebSocket
 */
export interface ProgressUpdate {
  // Identification
  sessionId: string;
  taskId: string;
  timestamp: string;

  // Progress Metrics
  percentComplete: number; // 0-100
  tasksCompleted: number;
  tasksTotal: number;
  estimatedTimeRemaining: number | null; // milliseconds

  // Current Activity
  currentTask: string | null;
  currentAction: string; // "Initializing", "Running tests", etc.

  // Test Metrics
  testsRun: number;
  testsPassed: number;
  testsFailed: number;

  // Performance
  elapsedTime: number; // milliseconds
  tokensUsed: number; // For token budgeting
  contextSwitches: number;
}
```

---

## 3. Error Handling and Retry Strategies

### 3.1 3-Level Retry Strategy with Exponential Backoff

The Gofer implementation uses a sophisticated 3-level retry system:

```typescript
/**
 * 3-Level Retry Strategy for AI Agent Recovery
 *
 * Level 1: Send error message only (10s wait)
 * Level 2: Send error + affected file contents (30s wait)
 * Level 3: Send error + files + constitution rules (60s wait)
 *
 * After 3 failed attempts, escalate to user
 */
export interface RetryAttempt {
  attemptNumber: number; // 1, 2, 3
  timestamp: string; // ISO 8601
  strategy:
    | 'send_error_only'
    | 'send_error_with_file_context'
    | 'send_error_with_constitution';
  contextAdded: string[]; // Files or rules added
  result: 'success' | 'failed' | 'escalated';
  durationMs: number; // Time for this attempt
}

export class ErrorRecoveryWithRetry {
  // Fixed delays for predictable AI behavior
  private RETRY_DELAYS = {
    level1: 10000, // 10 seconds
    level2: 30000, // 30 seconds
    level3: 60000, // 60 seconds
  };

  /**
   * Execute 3-level retry strategy
   */
  async retryWithStrategy(
    error: ErrorInfo,
    retryCallback: (strategy: string, attempt: number) => Promise<boolean>
  ): Promise<ErrorInfo> {
    const strategies = [
      'send_error_only',
      'send_error_with_file_context',
      'send_error_with_constitution',
    ];

    const delays = [
      this.RETRY_DELAYS.level1,
      this.RETRY_DELAYS.level2,
      this.RETRY_DELAYS.level3,
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const attemptNumber = i + 1;

      // Wait before retry (except first attempt)
      if (i > 0) {
        await this.sleep(delays[i - 1]);
      }

      const startTime = Date.now();

      try {
        const success = await retryCallback(strategy, attemptNumber);

        const attempt: RetryAttempt = {
          attemptNumber,
          timestamp: new Date().toISOString(),
          strategy,
          contextAdded: this.getContextForStrategy(strategy, error),
          result: success ? 'success' : 'failed',
          durationMs: Date.now() - startTime,
        };

        error.retryAttempts.push(attempt);

        if (success) {
          error.recovered = true;
          return error;
        }
      } catch (err) {
        error.retryAttempts.push({
          attemptNumber,
          timestamp: new Date().toISOString(),
          strategy,
          contextAdded: this.getContextForStrategy(strategy, error),
          result: 'failed',
          durationMs: Date.now() - startTime,
        });
      }
    }

    // All retries failed - escalate
    error.recovered = false;
    return error;
  }

  private getContextForStrategy(strategy: string, error: ErrorInfo): string[] {
    switch (strategy) {
      case 'send_error_only':
        return [];
      case 'send_error_with_file_context':
        return error.affectedFiles;
      case 'send_error_with_constitution':
        return [...error.affectedFiles, 'constitution.md'];
      default:
        return [];
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 3.2 Exponential Backoff with Jitter

For more aggressive retry scenarios (network failures, rate limits):

```typescript
/**
 * Exponential Backoff with Jitter
 * Formula: delay = min(maxDelay, baseDelay * 2^attempt + random jitter)
 */
export class ExponentialBackoffRetry {
  private baseDelay = 100; // milliseconds
  private maxDelay = 30000; // 30 seconds max
  private jitterFactor = 0.1; // 10% jitter

  /**
   * Calculate retry delay for given attempt number
   */
  calculateDelay(attemptNumber: number): number {
    // 2^attempt * baseDelay
    let delay = this.baseDelay * Math.pow(2, attemptNumber);

    // Cap at max delay
    delay = Math.min(delay, this.maxDelay);

    // Add jitter: random value between delay * (1 - jitterFactor) and delay
    const jitter = delay * this.jitterFactor * Math.random();
    delay = delay + jitter;

    return Math.round(delay);
  }

  /**
   * Retry a function with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    onRetry?: (attempt: number, delay: number, error: Error) => void
  ): Promise<T> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        onRetry?.(attempt + 1, delay, error as Error);

        await this.sleep(delay);
      }
    }

    throw new Error('Retry failed after max attempts');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Usage Example
 */
const backoff = new ExponentialBackoffRetry();

await backoff.retryWithBackoff(
  async () => {
    // Try to run tests
    return await runTests();
  },
  3, // max attempts
  (attempt, delay, error) => {
    console.log(
      `Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`
    );
  }
);
```

### 3.3 Error Classification and Severity Levels

```typescript
/**
 * Error Type Classification for AI Agent Decision Making
 */
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
  errorId: string;
  taskId: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  detectedAt: string;
  detectionLatency: number; // <5s requirement
  errorMessage: string;
  stackTrace: string | null;
  affectedFiles: string[];
  retryAttempts: RetryAttempt[];
  recovered: boolean;
  escalated: boolean;
}

/**
 * Error Severity Matrix
 */
export const ERROR_SEVERITY_MATRIX: Record<ErrorType, ErrorSeverity> = {
  syntax_error: 'recoverable', // Usually simple fix
  type_error: 'recoverable', // Type information is available
  test_failure: 'recoverable', // Tests show what failed
  linting_error: 'recoverable', // Lint errors are fixable
  runtime_error: 'needs_context', // May need more context
  dependency_missing: 'fatal', // Can't proceed without dep
  authentication_failure: 'fatal', // User must provide credentials
};

/**
 * Error Detection Latency Requirement: <5 seconds
 * This ensures AI gets feedback quickly for short-running tests
 */
export class ErrorDetector {
  private patterns = {
    type_error: /error TS\d+:|Type .+ is not assignable/i,
    syntax_error: /SyntaxError:/i,
    test_failure: /FAIL\s+tests?\//i,
    linting_error: /error\s+.+@typescript-eslint/i,
    runtime_error: /Error:|Exception:|Cannot read property/i,
    dependency_missing: /Cannot find module|Module not found/i,
    authentication_failure: /Authentication failed|Unauthorized|401/i,
  };

  detectError(output: string, taskId: string): ErrorInfo | null {
    const startTime = Date.now();

    for (const [errorType, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(output)) {
        const detectionLatency = Date.now() - startTime;

        // Log if exceeds <5s requirement
        if (detectionLatency > 5000) {
          console.warn(
            `Error detection latency exceeded: ${detectionLatency}ms`
          );
        }

        return {
          errorId: `err-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          taskId,
          errorType: errorType as ErrorType,
          severity: ERROR_SEVERITY_MATRIX[errorType as ErrorType],
          detectedAt: new Date().toISOString(),
          detectionLatency,
          errorMessage: this.extractErrorMessage(output),
          stackTrace: this.extractStackTrace(output),
          affectedFiles: this.extractAffectedFiles(output),
          retryAttempts: [],
          recovered: false,
          escalated: false,
        };
      }
    }

    return null;
  }

  private extractErrorMessage(output: string): string {
    const match = output.match(/(?:Error|Exception|FAIL):\s*(.+)/i);
    return match ? match[0] : output.substring(0, 200);
  }

  private extractStackTrace(output: string): string | null {
    const matches = output.match(/\s+at\s+.+\(.+:\d+:\d+\)/g);
    return matches ? matches.join('\n') : null;
  }

  private extractAffectedFiles(output: string): string[] {
    const filePathRegex =
      /(?:^|\s)([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx))(?::|\s|$)/gm;
    const files: string[] = [];
    let match;

    while ((match = filePathRegex.exec(output)) !== null) {
      if (match[1] && !files.includes(match[1])) {
        files.push(match[1]);
      }
    }

    return files;
  }
}
```

---

## 4. AI Agent-Friendly API Design Patterns

### 4.1 MCP Tool Definition Pattern

The Model Context Protocol (MCP) provides a standard way to expose tools to AI
agents. For test execution:

```typescript
/**
 * MCP Tool: Run Tests with Progress Streaming
 *
 * This tool uses JSON Schema for input/output validation
 * and supports streaming progress via SSE or WebSocket
 */
import { Tool } from '@modelcontextprotocol/sdk/tool';

export const runTestsTool: Tool = {
  name: 'run_tests',
  description: 'Execute automated tests and stream progress updates',

  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Task ID (e.g., T001)',
        pattern: '^[A-Z]\\d{3}$',
      },
      testCommand: {
        type: 'string',
        description: 'Test command to run (e.g., npm test)',
        minLength: 1,
        maxLength: 500,
      },
      testType: {
        type: 'string',
        enum: ['unit', 'integration', 'e2e'],
        description: 'Type of tests to run',
      },
      timeout: {
        type: 'integer',
        description: 'Test timeout in milliseconds',
        minimum: 5000,
        maximum: 600000,
        default: 300000,
      },
      streaming: {
        type: 'boolean',
        description: 'Enable progress streaming via SSE',
        default: true,
      },
    },
    required: ['taskId', 'testCommand', 'testType'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      result: {
        type: 'object',
        $ref: 'https://gofer.dev/schemas/test-result-v1.json',
      },
      streamUrl: {
        type: 'string',
        description: 'SSE endpoint for progress updates (if streaming enabled)',
        format: 'uri',
      },
      status: {
        type: 'string',
        enum: ['queued', 'running', 'completed', 'failed'],
      },
    },
    required: ['result', 'status'],
  },

  execute: async (input: any) => {
    const { taskId, testCommand, testType, timeout, streaming } = input;

    // Validate inputs
    if (!validateTaskId(taskId)) {
      throw new Error(`Invalid task ID: ${taskId}`);
    }

    // Queue test execution
    const executionId = `exec-${taskId}-${Date.now()}`;

    const result = {
      status: 'queued',
      executionId,
      streamUrl: streaming
        ? `https://api.gofer.dev/tests/stream/${executionId}`
        : undefined,
    };

    // Execute asynchronously
    executeTestAsync(taskId, testCommand, testType, timeout);

    return result;
  },
};

/**
 * MCP Tool: Get Test Results
 *
 * Allows Claude to retrieve completed test results
 */
export const getTestResultsTool: Tool = {
  name: 'get_test_results',
  description: 'Retrieve results from a completed test execution',

  inputSchema: {
    type: 'object',
    properties: {
      executionId: {
        type: 'string',
        description: 'Test execution ID from run_tests tool',
      },
      taskId: {
        type: 'string',
        description: 'Task ID to query results for',
      },
    },
    anyOf: [{ required: ['executionId'] }, { required: ['taskId'] }],
  },

  outputSchema: {
    type: 'object',
    properties: {
      result: {
        $ref: 'https://gofer.dev/schemas/test-result-v1.json',
      },
      found: { type: 'boolean' },
      cached: { type: 'boolean' },
      cacheExpiry: { type: 'string', format: 'date-time' },
    },
  },

  execute: async (input: any) => {
    const { executionId, taskId } = input;

    if (!executionId && !taskId) {
      throw new Error('Either executionId or taskId required');
    }

    const result = await fetchTestResults(executionId || taskId);

    return {
      result,
      found: !!result,
      cached: result?.fromCache || false,
      cacheExpiry: result?.cacheExpiry,
    };
  },
};
```

### 4.2 Error Handling in MCP Tools

```typescript
/**
 * Standardized Error Response Format for MCP Tools
 */
export interface ToolError {
  code: string; // 'INVALID_INPUT', 'TIMEOUT', 'RESOURCE_EXHAUSTED', etc.
  message: string; // Human-readable error message
  details: {
    retryable: boolean; // Whether agent should retry
    retryAfter?: number; // Milliseconds to wait before retry
    contextProvided?: string[]; // Files or context provided for recovery
    suggestion?: string; // AI-friendly recovery suggestion
  };
}

/**
 * Error Handler for MCP Tool Execution
 */
export class MCPToolErrorHandler {
  handleToolError(error: unknown, context: any): ToolError {
    if (error instanceof TimeoutError) {
      return {
        code: 'TIMEOUT',
        message: `Test execution timed out after ${context.timeout}ms`,
        details: {
          retryable: true,
          retryAfter: context.timeout * 1.5,
          suggestion:
            'Consider increasing timeout or checking for infinite loops',
        },
      };
    }

    if (error instanceof ValidationError) {
      return {
        code: 'INVALID_INPUT',
        message: `Invalid input: ${error.message}`,
        details: {
          retryable: false,
          suggestion:
            'Check task ID format (must be T001-T999) and test command syntax',
        },
      };
    }

    if (error instanceof RateLimitError) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many test executions',
        details: {
          retryable: true,
          retryAfter: 60000, // 1 minute
          suggestion: 'Wait before retrying or batch multiple tests together',
        },
      };
    }

    // Generic error
    return {
      code: 'INTERNAL_ERROR',
      message: `Unexpected error: ${String(error)}`,
      details: {
        retryable: true,
        retryAfter: 5000,
        suggestion: 'Check logs and retry the operation',
      },
    };
  }
}
```

---

## 5. Implementation Checklist for Gofer

### Phase 1: JSON Schema Implementation

- [ ] Define comprehensive TestResultSchema matching JSON Schema Draft 2020-12
- [ ] Implement strict validation using ajv with allErrors and strictSchema
- [ ] Create schema test fixtures with example test results
- [ ] Document schema versioning strategy

### Phase 2: Progress Streaming

- [ ] Implement SSE endpoint for test progress
      (`/api/tests/stream/:executionId`)
- [ ] Create TestProgressEvent with all required fields
- [ ] Add retry logic with exponential backoff for dropped SSE connections
- [ ] Performance requirement: <50ms latency for progress updates

### Phase 3: Error Handling

- [ ] Implement ErrorDetector with <5s latency requirement
- [ ] Create 3-level retry strategy (error_only → file_context → constitution)
- [ ] Add retry delay configuration (10s, 30s, 60s)
- [ ] Implement error escalation to user after 3 failed retries

### Phase 4: MCP Tool Integration

- [ ] Define runTestsTool with proper JSON Schema
- [ ] Implement getTestResultsTool for result retrieval
- [ ] Add ToolError standardization
- [ ] Create tool test suite validating schema compliance

### Phase 5: Monitoring & Observability

- [ ] Add metrics for detection latency vs requirement
- [ ] Log all retry attempts with timestamps and strategies
- [ ] Create dashboard for test execution metrics
- [ ] Set up alerts for retry threshold exceedance

---

## 6. Performance Requirements Summary

| Requirement               | Target           | Validation              |
| ------------------------- | ---------------- | ----------------------- |
| Error Detection Latency   | <5s              | ErrorDetector tests     |
| Task Status Update        | <100ms           | ProgressReporter tests  |
| Session State Persistence | <200ms           | ProgressReporter tests  |
| Status Bar Update         | <50ms            | ProgressReporter tests  |
| Hint Loading              | <500ms           | ContextBuilder tests    |
| Progress Event Streaming  | <50ms            | SSE endpoint tests      |
| Retry Strategy Execution  | 10/30/60s delays | ErrorRecovery tests     |
| Test Result Validation    | <100ms           | Schema validation tests |

---

## 7. References & Related Files

**Gofer Implementation Examples:**

- `/extension/src/autonomous/ProgressReporter.ts` - Status bar and session
  persistence (100ms, 200ms, 50ms latencies)
- `/extension/src/autonomous/ErrorRecovery.ts` - 3-level retry strategy with
  exponential delays
- `/extension/src/autonomous/OutputMonitor.ts` - Error detection patterns (<5s
  requirement)
- `/extension/src/autonomous/AutonomousDriver.ts` - Progress callbacks and event
  emission
- `/language-server/src/mcp/toolHandler.ts` - MCP tool response schemas
- `/src/types/index.ts` - TestResult and ValidationResult interfaces

**Industry Standards:**

- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12
- Server-Sent Events (MDN):
  https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Model Context Protocol: https://modelcontextprotocol.io/
- Exponential Backoff RFC:
  https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

---

## 8. Conclusion

Designing test execution interfaces for AI agents requires:

1. **Structured Output**: Strict JSON Schema validation ensures agents can
   reliably parse results
2. **Real-time Progress**: SSE or WebSocket streaming keeps agents informed
   during long operations
3. **Intelligent Retry**: 3-level strategies with escalation prevent endless
   loops
4. **Clear Error Classification**: Severity levels guide retry vs. escalation
   decisions
5. **Performance Budgets**: <5s error detection, <50ms UI updates maintain
   responsiveness

The Gofer codebase already implements most of these patterns. Following this
research summary will ensure robust, agent-friendly test execution interfaces
that work seamlessly with Claude and other AI tools.
