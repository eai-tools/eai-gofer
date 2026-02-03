# Agentic Testing Patterns

**Enterprise AI Pty Ltd - Test Execution Design for AI Agents**

*Last Updated: January 2026*

---

## Executive Summary

This document provides comprehensive guidance on designing test execution
interfaces for AI agents, including JSON Schema patterns for structured outputs,
progress streaming protocols, and sophisticated error handling strategies.

---

## 1. Structured Output Formats

### Why JSON Schema Matters

AI agents require **strongly-typed, parseable** test result formats. Ambiguous
outputs lead to parsing failures and wasted tokens re-requesting information.

### Recommended Test Result Schema

```typescript
/**
 * Unified Test Result Schema - AI Agent Friendly
 */
export interface TestResultSchema {
  // Identification & Metadata
  id: string;                    // UUID v4 for traceability
  taskId: string;                // Reference to executing task
  sessionId: string;             // Trace back to session
  timestamp: string;             // ISO 8601 execution time
  duration: number;              // Execution time in milliseconds

  // Test Identification
  testType: 'unit' | 'integration' | 'e2e' | 'contract' | 'performance';
  testFramework: string;         // 'vitest', 'jest', 'playwright', etc.
  testFile: string;              // Path to test file

  // Aggregated Results
  summary: {
    passed: boolean;             // Overall pass/fail
    total: number;               // Total tests run
    passed_count: number;        // Tests passed
    failed_count: number;        // Tests failed
    skipped_count: number;       // Tests skipped
    pass_rate: number;           // Percentage 0-100
  };

  // Individual Test Details
  tests: Array<{
    name: string;                // Full test name
    status: 'passed' | 'failed' | 'skipped' | 'pending';
    duration: number;            // ms
    errorMessage?: string;       // Error if failed
    errorStack?: string;         // Full stack trace
  }>;

  // Structured Error Information
  failures?: Array<{
    testName: string;
    errorType: string;           // 'AssertionError', 'TimeoutError', etc.
    errorMessage: string;
    stackTrace: string;
    affectedFiles: string[];
    suggestion?: string;         // AI-provided recovery suggestion
  }>;

  // Environment Context
  environment: {
    nodeVersion: string;
    platform: string;
    workspaceRoot: string;
    testCommand: string;
  };
}
```

### JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://specgofer.dev/schemas/test-result-v1.json",
  "title": "AI Agent Test Result Schema",
  "type": "object",
  "required": ["id", "taskId", "timestamp", "testType", "summary"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    "taskId": {
      "type": "string",
      "pattern": "^[A-Z]\\d{3}$"
    },
    "summary": {
      "type": "object",
      "required": ["passed", "total", "passed_count", "failed_count"],
      "properties": {
        "passed": { "type": "boolean" },
        "total": { "type": "integer", "minimum": 0 },
        "passed_count": { "type": "integer", "minimum": 0 },
        "failed_count": { "type": "integer", "minimum": 0 },
        "pass_rate": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    }
  }
}
```

---

## 2. Progress Streaming Protocols

### Server-Sent Events (SSE) - Recommended

SSE is ideal for one-directional streaming from server to AI agent with
automatic reconnection support.

```typescript
/**
 * Test Progress Event - SSE Compatible
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

    // For test:error
    error?: string;
    errorType?: string;
    retryable?: boolean;
  };
}
```

### SSE Endpoint Implementation

```typescript
// Set SSE headers
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
});

// Send event
res.write(`event: test-progress\n`);
res.write(`id: ${Date.now()}\n`);
res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
```

### WebSocket for Bidirectional Control

Use WebSocket when pause/resume capabilities are needed:

```typescript
export interface TestExecutionMessage {
  // Client -> Server
  'execution:start': { taskId: string; testCommand: string };
  'execution:pause': { taskId: string };
  'execution:resume': { taskId: string };
  'execution:cancel': { taskId: string };

  // Server -> Client
  'progress:update': TestProgressEvent;
  'progress:complete': { result: TestResultSchema };
  'progress:error': { error: string; retryable: boolean };
}
```

---

## 3. Error Handling Strategies

### 3-Level Retry Strategy

SpecGofer uses a sophisticated 3-level retry system with increasing context:

```text
Level 1 (10s wait): Send error message only
Level 2 (30s wait): Send error + affected file contents
Level 3 (60s wait): Send error + files + constitution rules

After 3 failures: Escalate to human
```

### Implementation

```typescript
export class ErrorRecoveryWithRetry {
  private RETRY_DELAYS = {
    level1: 10000,  // 10 seconds
    level2: 30000,  // 30 seconds
    level3: 60000,  // 60 seconds
  };

  async retryWithStrategy(
    error: ErrorInfo,
    retryCallback: (strategy: string, attempt: number) => Promise<boolean>
  ): Promise<ErrorInfo> {
    const strategies = [
      'send_error_only',
      'send_error_with_file_context',
      'send_error_with_constitution',
    ];

    for (let i = 0; i < strategies.length; i++) {
      if (i > 0) {
        await this.sleep(this.RETRY_DELAYS[`level${i}` as keyof typeof this.RETRY_DELAYS]);
      }

      const success = await retryCallback(strategies[i], i + 1);
      if (success) {
        error.recovered = true;
        return error;
      }
    }

    error.escalated = true;
    return error;
  }
}
```

### Error Classification Matrix

| Error Type             | Severity       | Retry Strategy       |
| ---------------------- | -------------- | -------------------- |
| syntax_error           | Recoverable    | Auto-fix, 3 retries  |
| type_error             | Recoverable    | Add types, 3 retries |
| test_failure           | Recoverable    | Analyze & fix        |
| linting_error          | Recoverable    | Auto-fix             |
| runtime_error          | Needs context  | Add file context     |
| dependency_missing     | Fatal          | Escalate immediately |
| authentication_failure | Fatal          | Escalate immediately |

### Error Detection Patterns

```typescript
private patterns = {
  type_error: /error TS\d+:|Type .+ is not assignable/i,
  syntax_error: /SyntaxError:/i,
  test_failure: /FAIL\s+tests?\//i,
  linting_error: /error\s+.+@typescript-eslint/i,
  runtime_error: /Error:|Exception:|Cannot read property/i,
  dependency_missing: /Cannot find module|Module not found/i,
  authentication_failure: /Authentication failed|Unauthorized|401/i,
};
```

---

## 4. Exponential Backoff with Jitter

For network failures and rate limits, use exponential backoff:

```typescript
/**
 * Formula: delay = min(maxDelay, baseDelay * 2^attempt + random jitter)
 */
export class ExponentialBackoffRetry {
  private baseDelay = 100;       // milliseconds
  private maxDelay = 30000;      // 30 seconds max
  private jitterFactor = 0.1;    // 10% jitter

  calculateDelay(attemptNumber: number): number {
    let delay = this.baseDelay * Math.pow(2, attemptNumber);
    delay = Math.min(delay, this.maxDelay);
    const jitter = delay * this.jitterFactor * Math.random();
    return Math.round(delay + jitter);
  }
}
```

---

## 5. Real Tests Philosophy

### Core Principles

SpecGofer follows a strict **"Real Tests with Real Data"** philosophy:

#### What We Do

1. **Use Real File System Operations**
   - Create actual files and directories
   - Use `fs/promises` for real I/O
   - Clean up test artifacts after each test

2. **Use Real Component Interactions**
   - Test actual parsing logic, not mocked returns
   - Verify real error handling paths
   - Validate actual output formats

3. **Use Temporary Workspaces**
   - Isolated test workspaces in system temp
   - Each test gets fresh workspace
   - Automatic cleanup

#### What We Don't Do

1. **No Mocking Frameworks**
   - No `vi.mock()`, `jest.mock()`, `sinon`
   - No artificial success/failure scenarios

2. **No Fake Data**
   - No hardcoded return values
   - Tests exercise real code paths

---

## 6. Test Categories and Running

### Unit Tests

Fast, isolated tests for pure business logic:

```bash
npm run test:unit
```

### Integration Tests

Component interaction with real dependencies:

```bash
# With API keys for LLM tests
ANTHROPIC_API_KEY=sk-xxx npm run test:integration
```

### E2E Tests

Full user workflow with real VSCode:

```bash
npm run test:e2e
```

### Coverage Requirements

| Metric     | Target | Notes                    |
| ---------- | ------ | ------------------------ |
| Lines      | 80%    | Constitution requirement |
| Functions  | 80%    | All public APIs          |
| Branches   | 80%    | Error paths included     |
| Statements | 80%    | No dead code             |

---

## 7. Performance Requirements

| Requirement               | Target   | Validation              |
| ------------------------- | -------- | ----------------------- |
| Error Detection Latency   | < 5s     | ErrorDetector tests     |
| Task Status Update        | < 100ms  | ProgressReporter tests  |
| Session State Persistence | < 200ms  | ProgressReporter tests  |
| Progress Event Streaming  | < 50ms   | SSE endpoint tests      |
| Test Result Validation    | < 100ms  | Schema validation tests |

---

## 8. MCP Tool for Test Execution

### Tool Definition

```typescript
export const runTestsTool = {
  name: 'run_tests',
  description: 'Execute automated tests and stream progress',

  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        pattern: '^[A-Z]\\d{3}$',
      },
      testCommand: {
        type: 'string',
        minLength: 1,
      },
      testType: {
        type: 'string',
        enum: ['unit', 'integration', 'e2e'],
      },
      timeout: {
        type: 'integer',
        minimum: 5000,
        maximum: 600000,
        default: 300000,
      },
    },
    required: ['taskId', 'testCommand', 'testType'],
  },
};
```

### Error Response Format

```typescript
export interface ToolError {
  code: string;           // 'TIMEOUT', 'INVALID_INPUT', etc.
  message: string;        // Human-readable
  details: {
    retryable: boolean;
    retryAfter?: number;  // Milliseconds
    suggestion?: string;  // Recovery hint for AI
  };
}
```

---

## 9. Implementation Checklist

### Phase 1: JSON Schema

- [ ] Define TestResultSchema with JSON Schema Draft 2020-12
- [ ] Implement validation with ajv (strictSchema: true)
- [ ] Create test fixtures with example results

### Phase 2: Progress Streaming

- [ ] SSE endpoint for test progress
- [ ] < 50ms latency for progress updates
- [ ] Retry logic for dropped connections

### Phase 3: Error Handling

- [ ] ErrorDetector with < 5s latency
- [ ] 3-level retry strategy
- [ ] User escalation after 3 failures

### Phase 4: Monitoring

- [ ] Log all retry attempts
- [ ] Track detection latency vs requirement
- [ ] Alert on threshold exceedance

---

## References

- [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md) - Core principles
- [AGENT_TOOLING_REFERENCE.md](AGENT_TOOLING_REFERENCE.md) - MCP tool patterns
- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12
- Model Context Protocol: https://modelcontextprotocol.io/

---

**© 2026 Enterprise AI Pty Ltd. All rights reserved.**
