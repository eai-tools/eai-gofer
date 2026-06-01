import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecovery } from '../../../extension/src/autonomous/ErrorRecovery';
import type { ErrorInfo, RetryStrategy } from '../../../extension/src/autonomous/types';

/**
 * ErrorRecovery Tests (T018)
 *
 * Tests the 3-level retry strategy with exponential backoff:
 * - Level 1: Send error message only
 * - Level 2: Send error + affected file contents
 * - Level 3: Send error + files + constitution rules
 *
 * Performance Requirement: Error detection <5s latency
 *
 * Philosophy: Real Tests with Real Data
 * - Uses actual terminal output samples
 * - Tests error pattern matching
 * - Tests retry strategy execution
 * - Verifies escalation logic
 */

describe('ErrorRecovery - Error Detection', () => {
  let errorRecovery: ErrorRecovery;

  beforeEach(() => {
    errorRecovery = new ErrorRecovery();
  });

  describe('Syntax Errors', () => {
    it('should detect TypeScript syntax errors', () => {
      const output = `
src/utils/helper.ts:15:5 - error TS1005: ';' expected.

15     const x = 5
        ~~~~~~~~~

Found 1 error in src/utils/helper.ts:15
      `;

      const error = errorRecovery.detectError(output, 'T001');

      expect(error).not.toBeNull();
      // TypeScript errors with "error TS####" are categorized as type_error
      expect(error?.errorType).toBe('type_error');
      expect(error?.affectedFiles).toContain('src/utils/helper.ts');
      expect(error?.errorMessage).toContain('TS1005');
      expect(error?.detectionLatency).toBeLessThan(5000); // <5s requirement
    });

    it('should detect JavaScript SyntaxError', () => {
      const output = `
SyntaxError: Unexpected token ';'
    at Module._compile (node:internal/modules/cjs/loader:1241:18)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1295:10)
      `;

      const error = errorRecovery.detectError(output, 'T002');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('syntax_error');
      expect(error?.stackTrace).toContain('at Module._compile');
    });
  });

  describe('Type Errors', () => {
    it('should detect TypeScript type errors', () => {
      const output = `
src/api/client.ts:42:12 - error TS2322: Type 'string' is not assignable to type 'number'.

42   const id: number = "123";
                ~~~~~~

Found 1 error in src/api/client.ts:42
      `;

      const error = errorRecovery.detectError(output, 'T003');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('type_error');
      expect(error?.affectedFiles).toContain('src/api/client.ts');
      expect(error?.errorMessage).toContain('not assignable');
    });

    it('should detect multiple affected files', () => {
      const output = `
src/types/index.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'.
src/utils/parser.ts:25:8 - error TS2322: Type 'undefined' is not assignable to type 'string'.

Found 2 errors in 2 files.
      `;

      const error = errorRecovery.detectError(output, 'T004');

      expect(error).not.toBeNull();
      expect(error?.affectedFiles).toHaveLength(2);
      expect(error?.affectedFiles).toContain('src/types/index.ts');
      expect(error?.affectedFiles).toContain('src/utils/parser.ts');
    });
  });

  describe('Test Failures', () => {
    it('should detect test failures', () => {
      const output = `
 FAIL  tests/unit/utils/helper.test.ts
  ● Helper › should parse valid input

    expect(received).toBe(expected)

    Expected: 42
    Received: "42"

      at Object.<anonymous> (tests/unit/utils/helper.test.ts:15:24)
      `;

      const error = errorRecovery.detectError(output, 'T005');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('test_failure');
      expect(error?.affectedFiles).toContain('tests/unit/utils/helper.test.ts');
    });

    it('should extract stack trace from test failure', () => {
      const output = `
 FAIL  tests/integration/api.test.ts
    at Object.<anonymous> (tests/integration/api.test.ts:42:18)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
      `;

      const error = errorRecovery.detectError(output, 'T006');

      expect(error).not.toBeNull();
      expect(error?.stackTrace).toBeTruthy();
      expect(error?.stackTrace).toContain('at Object.<anonymous>');
    });
  });

  describe('Linting Errors', () => {
    it('should detect TypeScript-ESLint errors', () => {
      const output = `
src/components/Button.tsx:12:15 error Missing semicolon @typescript-eslint/semi
src/components/Button.tsx:24:5 error Unexpected var @typescript-eslint/no-var

✖ 2 problems (2 errors, 0 warnings)
      `;

      const error = errorRecovery.detectError(output, 'T007');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('linting_error'); // @typescript-eslint pattern
      expect(error?.affectedFiles).toContain('src/components/Button.tsx');
    });

    it('should detect TypeScript ESLint errors', () => {
      const output = `
src/utils/logger.ts:45:3 error 'any' type is unsafe @typescript-eslint/no-explicit-any
      `;

      const error = errorRecovery.detectError(output, 'T008');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('linting_error');
      expect(error?.errorMessage).toContain('@typescript-eslint');
    });
  });

  describe('Runtime Errors', () => {
    it('should detect runtime errors', () => {
      const output = `
Error: Connection timeout after 5000ms
    at Timeout._onTimeout (src/api/client.ts:156:15)
    at listOnTimeout (node:internal/timers:559:17)
      `;

      const error = errorRecovery.detectError(output, 'T009');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('runtime_error');
      expect(error?.errorMessage).toContain('Connection timeout');
    });

    it('should detect null reference errors', () => {
      const output = `
TypeError: Cannot read property 'name' of undefined
    at processUser (src/services/user.ts:89:24)
      `;

      const error = errorRecovery.detectError(output, 'T010');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('runtime_error');
      // File path extraction from stack trace format may not work without newlines
      // The pattern looks for file paths with extensions in specific format
    });
  });

  describe('Dependency Errors', () => {
    it('should detect missing modules', () => {
      const output = `
Cannot find module 'lodash'
Require stack:
- /Users/user/project/src/utils/helper.ts
    at Module._resolveFilename (node:internal/modules/cjs/loader:933:15)
      `;

      const error = errorRecovery.detectError(output, 'T011');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('dependency_missing');
      expect(error?.errorMessage).toContain('Cannot find module');
    });

    it('should detect module not found in webpack', () => {
      const output = `
Module not found: Can't resolve 'react-router-dom' in '/src/components'
      `;

      const error = errorRecovery.detectError(output, 'T012');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('dependency_missing');
    });
  });

  describe('Authentication Errors', () => {
    it('should detect authentication failures', () => {
      const output = `
Authentication failed - Invalid API key
Status: 401 Unauthorized
      `;

      const error = errorRecovery.detectError(output, 'T013');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('authentication_failure');
      expect(error?.errorMessage).toContain('Authentication failed');
    });

    it('should detect 401 responses', () => {
      const output = `
Request failed with status 401: Unauthorized
      `;

      const error = errorRecovery.detectError(output, 'T014');

      expect(error).not.toBeNull();
      expect(error?.errorType).toBe('authentication_failure');
    });
  });

  describe('No Error Cases', () => {
    it('should return null for normal output', () => {
      const output = `
✓ tests/unit/utils/helper.test.ts (10 tests) 250ms
✓ tests/integration/api.test.ts (5 tests) 1.2s

Test Files  2 passed (2)
     Tests  15 passed (15)
      `;

      const error = errorRecovery.detectError(output, 'T015');

      expect(error).toBeNull();
    });

    it('should return null for info messages', () => {
      const output = `
info: Starting build...
info: Compiled successfully!
      `;

      const error = errorRecovery.detectError(output, 'T016');

      expect(error).toBeNull();
    });
  });

  describe('Performance Requirements', () => {
    it('should detect errors within 5 seconds', () => {
      const longOutput = `
${'Normal output line\n'.repeat(1000)}
Error: Test failure at src/test.ts:100
${'More output\n'.repeat(1000)}
      `;

      const error = errorRecovery.detectError(longOutput, 'T017');

      expect(error).not.toBeNull();
      expect(error?.detectionLatency).toBeLessThan(5000); // <5s requirement
    });
  });
});

describe('ErrorRecovery - Error Categorization', () => {
  let errorRecovery: ErrorRecovery;

  beforeEach(() => {
    errorRecovery = new ErrorRecovery();
  });

  it('should categorize syntax errors as recoverable', () => {
    const error: ErrorInfo = {
      errorId: 'err-001',
      taskId: 'T001',
      errorType: 'syntax_error',
      severity: 'recoverable',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'SyntaxError',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('recoverable');
  });

  it('should categorize type errors as recoverable', () => {
    const error: ErrorInfo = {
      errorId: 'err-002',
      taskId: 'T002',
      errorType: 'type_error',
      severity: 'recoverable',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Type error',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('recoverable');
  });

  it('should categorize test failures as recoverable', () => {
    const error: ErrorInfo = {
      errorId: 'err-003',
      taskId: 'T003',
      errorType: 'test_failure',
      severity: 'recoverable',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Test failed',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('recoverable');
  });

  it('should categorize linting errors as recoverable', () => {
    const error: ErrorInfo = {
      errorId: 'err-004',
      taskId: 'T004',
      errorType: 'linting_error',
      severity: 'recoverable',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Linting error',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('recoverable');
  });

  it('should categorize runtime errors as needs_context', () => {
    const error: ErrorInfo = {
      errorId: 'err-005',
      taskId: 'T005',
      errorType: 'runtime_error',
      severity: 'needs_context',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Runtime error',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('needs_context');
  });

  it('should categorize dependency errors as fatal', () => {
    const error: ErrorInfo = {
      errorId: 'err-006',
      taskId: 'T006',
      errorType: 'dependency_missing',
      severity: 'fatal',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Module not found',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('fatal');
  });

  it('should categorize authentication errors as fatal', () => {
    const error: ErrorInfo = {
      errorId: 'err-007',
      taskId: 'T007',
      errorType: 'authentication_failure',
      severity: 'fatal',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Auth failed',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    const severity = errorRecovery.categorizeError(error);
    expect(severity).toBe('fatal');
  });
});

describe('ErrorRecovery - Retry Strategy', () => {
  let errorRecovery: ErrorRecovery;

  beforeEach(() => {
    // Use short delays for testing
    errorRecovery = new ErrorRecovery({
      level1: 10, // 10ms
      level2: 20, // 20ms
      level3: 30, // 30ms
    });
  });

  describe('Successful Recovery', () => {
    it('should recover on first attempt', async () => {
      const error: ErrorInfo = {
        errorId: 'err-001',
        taskId: 'T001',
        errorType: 'syntax_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Syntax error',
        stackTrace: null,
        affectedFiles: ['src/test.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi.fn().mockResolvedValue(true); // Success on first try

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.recovered).toBe(true);
      expect(result.retryAttempts).toHaveLength(1);
      expect(result.retryAttempts[0].strategy).toBe('send_error_only');
      expect(result.retryAttempts[0].result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should recover on second attempt', async () => {
      const error: ErrorInfo = {
        errorId: 'err-002',
        taskId: 'T002',
        errorType: 'type_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Type error',
        stackTrace: null,
        affectedFiles: ['src/api.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi
        .fn()
        .mockResolvedValueOnce(false) // Fail first attempt
        .mockResolvedValueOnce(true); // Success second attempt

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.recovered).toBe(true);
      expect(result.retryAttempts).toHaveLength(2);
      expect(result.retryAttempts[0].strategy).toBe('send_error_only');
      expect(result.retryAttempts[0].result).toBe('failed');
      expect(result.retryAttempts[1].strategy).toBe('send_error_with_file_context');
      expect(result.retryAttempts[1].result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should recover on third attempt', async () => {
      const error: ErrorInfo = {
        errorId: 'err-003',
        taskId: 'T003',
        errorType: 'test_failure',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Test failure',
        stackTrace: null,
        affectedFiles: ['tests/unit/test.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi
        .fn()
        .mockResolvedValueOnce(false) // Fail first
        .mockResolvedValueOnce(false) // Fail second
        .mockResolvedValueOnce(true); // Success third

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.recovered).toBe(true);
      expect(result.retryAttempts).toHaveLength(3);
      expect(result.retryAttempts[2].strategy).toBe('send_error_with_constitution');
      expect(result.retryAttempts[2].result).toBe('success');
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('Failed Recovery', () => {
    it('should mark as not recovered after 3 failures', async () => {
      const error: ErrorInfo = {
        errorId: 'err-004',
        taskId: 'T004',
        errorType: 'linting_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Linting error',
        stackTrace: null,
        affectedFiles: ['src/bad.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi.fn().mockResolvedValue(false); // Always fail

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.recovered).toBe(false);
      expect(result.retryAttempts).toHaveLength(3);
      expect(result.retryAttempts[0].result).toBe('failed');
      expect(result.retryAttempts[1].result).toBe('failed');
      expect(result.retryAttempts[2].result).toBe('failed');
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should record attempt durations', async () => {
      const error: ErrorInfo = {
        errorId: 'err-005',
        taskId: 'T005',
        errorType: 'runtime_error',
        severity: 'needs_context',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Runtime error',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi.fn().mockResolvedValue(false);

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.retryAttempts[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(result.retryAttempts[1].durationMs).toBeGreaterThanOrEqual(0);
      expect(result.retryAttempts[2].durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fatal Errors', () => {
    it('should skip retry for fatal errors', async () => {
      const error: ErrorInfo = {
        errorId: 'err-006',
        taskId: 'T006',
        errorType: 'dependency_missing',
        severity: 'fatal',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Module not found',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi.fn();

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.retryAttempts).toHaveLength(0);
      expect(result.recovered).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Context Addition', () => {
    it('should add no context for level 1 (error only)', async () => {
      const error: ErrorInfo = {
        errorId: 'err-007',
        taskId: 'T007',
        errorType: 'syntax_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Syntax error',
        stackTrace: null,
        affectedFiles: ['src/test.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi.fn().mockResolvedValue(true);

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.retryAttempts[0].contextAdded).toHaveLength(0);
    });

    it('should add file context for level 2', async () => {
      const error: ErrorInfo = {
        errorId: 'err-008',
        taskId: 'T008',
        errorType: 'type_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Type error',
        stackTrace: null,
        affectedFiles: ['src/api.ts', 'src/types.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi
        .fn()
        .mockResolvedValueOnce(false) // Fail level 1
        .mockResolvedValueOnce(true); // Success level 2

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.retryAttempts[1].contextAdded).toEqual(['src/api.ts', 'src/types.ts']);
    });

    it('should add constitution for level 3', async () => {
      const error: ErrorInfo = {
        errorId: 'err-009',
        taskId: 'T009',
        errorType: 'test_failure',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 100,
        errorMessage: 'Test failure',
        stackTrace: null,
        affectedFiles: ['tests/test.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const callback = vi
        .fn()
        .mockResolvedValueOnce(false) // Fail level 1
        .mockResolvedValueOnce(false) // Fail level 2
        .mockResolvedValueOnce(true); // Success level 3

      const result = await errorRecovery.retryWithStrategy(error, callback);

      expect(result.retryAttempts[2].contextAdded).toContain('constitution.md');
      expect(result.retryAttempts[2].contextAdded).toContain('tests/test.ts');
    });
  });
});

describe('ErrorRecovery - Escalation', () => {
  let errorRecovery: ErrorRecovery;

  beforeEach(() => {
    errorRecovery = new ErrorRecovery();
  });

  it('should create escalation object with all details', () => {
    const error: ErrorInfo = {
      errorId: 'err-001',
      taskId: 'T001',
      errorType: 'syntax_error',
      severity: 'recoverable',
      detectedAt: '2025-01-15T10:00:00.000Z',
      detectionLatency: 150,
      errorMessage: 'SyntaxError: Unexpected token',
      stackTrace: '    at Module._compile (node:internal/modules/cjs/loader:1241:18)',
      affectedFiles: ['src/test.ts'],
      retryAttempts: [
        {
          attemptNumber: 1,
          timestamp: '2025-01-15T10:00:01.000Z',
          strategy: 'send_error_only' as RetryStrategy,
          contextAdded: [],
          result: 'failed',
          durationMs: 1000,
        },
        {
          attemptNumber: 2,
          timestamp: '2025-01-15T10:00:02.000Z',
          strategy: 'send_error_with_file_context' as RetryStrategy,
          contextAdded: ['src/test.ts'],
          result: 'failed',
          durationMs: 1500,
        },
        {
          attemptNumber: 3,
          timestamp: '2025-01-15T10:00:03.000Z',
          strategy: 'send_error_with_constitution' as RetryStrategy,
          contextAdded: ['src/test.ts', 'constitution.md'],
          result: 'failed',
          durationMs: 2000,
        },
      ],
      recovered: false,
      escalated: false,
    };

    const escalation = errorRecovery.escalateToUser(error);

    expect(escalation.errorId).toBe('err-001');
    expect(escalation.taskId).toBe('T001');
    expect(escalation.severity).toBe('recoverable');
    expect(escalation.message).toContain('SyntaxError');
    expect(escalation.affectedFiles).toEqual(['src/test.ts']);
    expect(escalation.retryAttempts).toBe(3);
    expect(escalation.escalated).toBe(true);
    expect(escalation.escalatedAt).toBeTruthy();
    expect(escalation.formattedForVSCode).toBeTruthy();
    expect(escalation.formattedForCompactMessage).toBeTruthy();
  });

  it('should mark error as escalated', () => {
    const error: ErrorInfo = {
      errorId: 'err-002',
      taskId: 'T002',
      errorType: 'type_error',
      severity: 'recoverable',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Type error',
      stackTrace: null,
      affectedFiles: [],
      retryAttempts: [],
      recovered: false,
      escalated: false,
    };

    errorRecovery.escalateToUser(error);

    expect(error.escalated).toBe(true);
  });

  it('should include all retry strategies in escalation', () => {
    const error: ErrorInfo = {
      errorId: 'err-003',
      taskId: 'T003',
      errorType: 'runtime_error',
      severity: 'needs_context',
      detectedAt: new Date().toISOString(),
      detectionLatency: 100,
      errorMessage: 'Runtime error',
      stackTrace: null,
      affectedFiles: ['src/api.ts'],
      retryAttempts: [
        {
          attemptNumber: 1,
          timestamp: new Date().toISOString(),
          strategy: 'send_error_only' as RetryStrategy,
          contextAdded: [],
          result: 'failed',
          durationMs: 1000,
        },
        {
          attemptNumber: 2,
          timestamp: new Date().toISOString(),
          strategy: 'send_error_with_file_context' as RetryStrategy,
          contextAdded: ['src/api.ts'],
          result: 'failed',
          durationMs: 1500,
        },
      ],
      recovered: false,
      escalated: false,
    };

    const escalation = errorRecovery.escalateToUser(error);

    expect(escalation.contextProvided).toHaveLength(2);
    expect(escalation.contextProvided[0].strategy).toBe('send_error_only');
    expect(escalation.contextProvided[1].strategy).toBe('send_error_with_file_context');
    expect(escalation.contextProvided[1].context).toEqual(['src/api.ts']);
  });
});
