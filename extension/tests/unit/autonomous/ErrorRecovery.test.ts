/**
 * Unit tests for ErrorRecovery
 *
 * Tests the 3-level retry strategy with exponential backoff
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecovery } from '../../../src/autonomous/ErrorRecovery';
import type { ErrorInfo, RetryStrategy } from '../../../src/autonomous/types';

describe('ErrorRecovery', () => {
  let errorRecovery: ErrorRecovery;

  beforeEach(() => {
    // Use short delays for testing
    errorRecovery = new ErrorRecovery({
      level1: 10, // 10ms
      level2: 20, // 20ms
      level3: 30, // 30ms
    });
  });

  describe('T034-T035: detectError', () => {
    it('should detect syntax errors', () => {
      const output = `
        SyntaxError: Unexpected token } in JSON at position 42
            at JSON.parse (<anonymous>)
      `;

      const error = errorRecovery.detectError(output, 'T005');

      expect(error).toBeDefined();
      expect(error?.errorType).toBe('syntax_error');
      expect(error?.taskId).toBe('T005');
    });

    it('should detect type errors with file paths', () => {
      const output = `
        src/models/User.ts:42:5 - error TS2322: Type 'string' is not assignable to type 'number'.
        42     age: "invalid"
               ~~~
      `;

      const error = errorRecovery.detectError(output, 'T010');

      expect(error).toBeDefined();
      expect(error?.errorType).toBe('type_error');
      expect(error?.affectedFiles).toContain('src/models/User.ts');
    });

    it('should detect test failures', () => {
      const output = `
        FAIL tests/user.test.ts
        ● User › should validate email format
          expect(received).toBe(expected)
          Expected: true
          Received: false
      `;

      const error = errorRecovery.detectError(output, 'T015');

      expect(error).toBeDefined();
      expect(error?.errorType).toBe('test_failure');
      expect(error?.affectedFiles).toContain('tests/user.test.ts');
    });

    it('should detect errors within 5 second latency requirement', () => {
      const largeOutput = 'a'.repeat(10000) + '\nSyntaxError: Unexpected token\n';

      const startTime = Date.now();
      const error = errorRecovery.detectError(largeOutput, 'T020');
      const duration = Date.now() - startTime;

      expect(error).toBeDefined();
      expect(duration).toBeLessThan(5000); // 5 second requirement
      expect(error?.detectionLatency).toBeLessThan(5000);
    });

    it('should return null for non-error output', () => {
      const output = 'Everything is working perfectly!';
      const error = errorRecovery.detectError(output, 'T025');

      expect(error).toBeNull();
    });

    it('should track detection latency', () => {
      const output = 'Error: Connection refused';
      const error = errorRecovery.detectError(output, 'T030');

      expect(error).toBeDefined();
      expect(error?.detectionLatency).toBeGreaterThanOrEqual(0);
      expect(error?.detectionLatency).toBeLessThan(100); // Should be very fast
    });
  });

  describe('T036-T037: categorizeError', () => {
    it('should categorize syntax errors as recoverable', () => {
      const error: ErrorInfo = {
        errorId: 'err-001',
        taskId: 'T005',
        errorType: 'syntax_error',
        severity: 'recoverable', // Will be overwritten
        detectedAt: new Date().toISOString(),
        detectionLatency: 10,
        errorMessage: 'SyntaxError: Unexpected token',
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
        taskId: 'T010',
        errorType: 'type_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 15,
        errorMessage: 'Type string is not assignable to type number',
        stackTrace: null,
        affectedFiles: ['src/models/User.ts'],
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
        taskId: 'T015',
        errorType: 'test_failure',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 20,
        errorMessage: 'expect(received).toBe(expected)',
        stackTrace: null,
        affectedFiles: ['tests/user.test.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const severity = errorRecovery.categorizeError(error);

      expect(severity).toBe('recoverable');
    });

    it('should categorize runtime errors as needs_context', () => {
      const error: ErrorInfo = {
        errorId: 'err-004',
        taskId: 'T020',
        errorType: 'runtime_error',
        severity: 'needs_context',
        detectedAt: new Date().toISOString(),
        detectionLatency: 25,
        errorMessage: 'Cannot read property of undefined',
        stackTrace: 'at Object.<anonymous> (/app/index.js:42:5)',
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
        errorId: 'err-005',
        taskId: 'T025',
        errorType: 'dependency_missing',
        severity: 'fatal',
        detectedAt: new Date().toISOString(),
        detectionLatency: 30,
        errorMessage: 'Cannot find module "express"',
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
        errorId: 'err-006',
        taskId: 'T030',
        errorType: 'authentication_failure',
        severity: 'fatal',
        detectedAt: new Date().toISOString(),
        detectionLatency: 35,
        errorMessage: 'Authentication failed: 401 Unauthorized',
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

  describe('T038-T039: retryWithStrategy', () => {
    it('should implement 3-level retry strategy', async () => {
      const error: ErrorInfo = {
        errorId: 'err-007',
        taskId: 'T035',
        errorType: 'syntax_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 10,
        errorMessage: 'SyntaxError: Missing closing bracket',
        stackTrace: null,
        affectedFiles: ['src/app.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      // Mock the retry callback
      let callCount = 0;
      const retryCallback = vi.fn(async (strategy: RetryStrategy, attempt: number) => {
        callCount++;
        return false; // Simulate failure to test all 3 levels
      });

      const result = await errorRecovery.retryWithStrategy(error, retryCallback);

      // Should have tried all 3 levels
      expect(retryCallback).toHaveBeenCalledTimes(3);
      expect(retryCallback).toHaveBeenCalledWith('send_error_only', 1);
      expect(retryCallback).toHaveBeenCalledWith('send_error_with_file_context', 2);
      expect(retryCallback).toHaveBeenCalledWith('send_error_with_constitution', 3);

      // Result should indicate failure after all retries
      expect(result.recovered).toBe(false);
      expect(result.retryAttempts.length).toBe(3);
    });

    it('should stop retrying after first success', async () => {
      const error: ErrorInfo = {
        errorId: 'err-008',
        taskId: 'T040',
        errorType: 'type_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 15,
        errorMessage: 'Type mismatch',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const retryCallback = vi.fn(async (strategy: RetryStrategy, attempt: number) => {
        return attempt === 2; // Succeed on second attempt
      });

      const result = await errorRecovery.retryWithStrategy(error, retryCallback);

      // Should stop after second attempt
      expect(retryCallback).toHaveBeenCalledTimes(2);
      expect(result.recovered).toBe(true);
      expect(result.retryAttempts.length).toBe(2);
    });

    it('should use exponential backoff between retries', async () => {
      const error: ErrorInfo = {
        errorId: 'err-009',
        taskId: 'T045',
        errorType: 'test_failure',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 20,
        errorMessage: 'Test failed',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const timestamps: number[] = [];
      const retryCallback = vi.fn(async () => {
        timestamps.push(Date.now());
        return false;
      });

      await errorRecovery.retryWithStrategy(error, retryCallback);

      // Check time differences (with short test delays: 10ms, 20ms, 30ms)
      expect(timestamps.length).toBe(3);

      // First to second should have a delay
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];

      // Second delay should be longer than first (exponential)
      // With test delays: delay1 ≈ 10ms, delay2 ≈ 20ms
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay1).toBeGreaterThanOrEqual(8); // ~10ms with tolerance
      expect(delay2).toBeGreaterThanOrEqual(18); // ~20ms with tolerance
    });

    it('should track retry attempts with correct metadata', async () => {
      const error: ErrorInfo = {
        errorId: 'err-010',
        taskId: 'T050',
        errorType: 'linting_error',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 25,
        errorMessage: 'Unused variable',
        stackTrace: null,
        affectedFiles: ['src/utils.ts'],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const retryCallback = vi.fn(async () => false);

      const result = await errorRecovery.retryWithStrategy(error, retryCallback);

      // Check retry attempts metadata
      expect(result.retryAttempts.length).toBe(3);

      result.retryAttempts.forEach((attempt, index) => {
        expect(attempt.attemptNumber).toBe(index + 1);
        expect(attempt.timestamp).toBeDefined();
        expect(attempt.result).toBe('failed');
        expect(attempt.durationMs).toBeGreaterThanOrEqual(0); // Can be 0 if very fast
      });

      // Check strategies are correct
      expect(result.retryAttempts[0].strategy).toBe('send_error_only');
      expect(result.retryAttempts[1].strategy).toBe('send_error_with_file_context');
      expect(result.retryAttempts[2].strategy).toBe('send_error_with_constitution');
    });
  });

  describe('T040-T041: escalateToUser', () => {
    it('should create escalation with error details', () => {
      const error: ErrorInfo = {
        errorId: 'err-011',
        taskId: 'T055',
        errorType: 'runtime_error',
        severity: 'needs_context',
        detectedAt: new Date().toISOString(),
        detectionLatency: 30,
        errorMessage: 'Database connection failed',
        stackTrace: 'at Database.connect (/app/db.ts:25:5)',
        affectedFiles: ['src/db.ts'],
        retryAttempts: [
          {
            attemptNumber: 1,
            timestamp: new Date().toISOString(),
            strategy: 'send_error_only',
            contextAdded: [],
            result: 'failed',
            durationMs: 5000,
          },
          {
            attemptNumber: 2,
            timestamp: new Date().toISOString(),
            strategy: 'send_error_with_file_context',
            contextAdded: ['src/db.ts'],
            result: 'failed',
            durationMs: 8000,
          },
          {
            attemptNumber: 3,
            timestamp: new Date().toISOString(),
            strategy: 'send_error_with_constitution',
            contextAdded: ['constitution.md'],
            result: 'failed',
            durationMs: 10000,
          },
        ],
        recovered: false,
        escalated: false,
      };

      const escalation = errorRecovery.escalateToUser(error);

      expect(escalation).toBeDefined();
      expect(escalation.errorId).toBe('err-011');
      expect(escalation.message).toContain('Database connection failed');
      expect(escalation.retryAttempts).toBe(3);
      expect(escalation.severity).toBe('needs_context');
    });

    it('should include all retry context in escalation', () => {
      const error: ErrorInfo = {
        errorId: 'err-012',
        taskId: 'T060',
        errorType: 'test_failure',
        severity: 'recoverable',
        detectedAt: new Date().toISOString(),
        detectionLatency: 35,
        errorMessage: 'Integration test failed',
        stackTrace: null,
        affectedFiles: ['tests/integration/api.test.ts'],
        retryAttempts: [
          {
            attemptNumber: 1,
            timestamp: new Date().toISOString(),
            strategy: 'send_error_only',
            contextAdded: [],
            result: 'failed',
            durationMs: 3000,
          },
        ],
        recovered: false,
        escalated: false,
      };

      const escalation = errorRecovery.escalateToUser(error);

      expect(escalation.contextProvided).toBeDefined();
      expect(escalation.contextProvided.length).toBe(1);
      expect(escalation.affectedFiles).toEqual(['tests/integration/api.test.ts']);
    });

    it('should mark error as escalated after escalation', () => {
      const error: ErrorInfo = {
        errorId: 'err-013',
        taskId: 'T065',
        errorType: 'dependency_missing',
        severity: 'fatal',
        detectedAt: new Date().toISOString(),
        detectionLatency: 40,
        errorMessage: 'Module not found',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const escalation = errorRecovery.escalateToUser(error);

      expect(escalation.escalated).toBe(true);
      expect(error.escalated).toBe(true); // Original error should be marked
    });

    it('should format escalation for different notification channels', () => {
      const error: ErrorInfo = {
        errorId: 'err-014',
        taskId: 'T070',
        errorType: 'authentication_failure',
        severity: 'fatal',
        detectedAt: new Date().toISOString(),
        detectionLatency: 45,
        errorMessage: 'API authentication failed',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const escalation = errorRecovery.escalateToUser(error);

      // Should have formatted message for VSCode notification
      expect(escalation.formattedForVSCode).toBeDefined();
      expect(escalation.formattedForVSCode).toContain('API authentication failed');

      // Should have formatted message for WhatsApp
      expect(escalation.formattedForWhatsApp).toBeDefined();
      expect(escalation.formattedForWhatsApp.length).toBeLessThan(300); // WhatsApp limit
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle errors without stack traces', () => {
      const output = 'Error: Simple error message';
      const error = errorRecovery.detectError(output, 'T075');

      expect(error).toBeDefined();
      expect(error?.stackTrace).toBeNull();
    });

    it('should handle errors with multiple file paths', () => {
      const output = `
        Error: Multiple files affected
        - src/models/User.ts:42
        - src/services/auth.ts:15
        - tests/auth.test.ts:88
      `;

      const error = errorRecovery.detectError(output, 'T080');

      expect(error).toBeDefined();
      expect(error?.affectedFiles.length).toBeGreaterThan(1);
    });

    it('should not retry fatal errors', async () => {
      const error: ErrorInfo = {
        errorId: 'err-015',
        taskId: 'T085',
        errorType: 'authentication_failure',
        severity: 'fatal',
        detectedAt: new Date().toISOString(),
        detectionLatency: 50,
        errorMessage: 'Fatal auth error',
        stackTrace: null,
        affectedFiles: [],
        retryAttempts: [],
        recovered: false,
        escalated: false,
      };

      const retryCallback = vi.fn(async () => false);

      const result = await errorRecovery.retryWithStrategy(error, retryCallback);

      // Fatal errors should escalate immediately without retries
      expect(retryCallback).not.toHaveBeenCalled();
      expect(result.recovered).toBe(false);
      expect(result.retryAttempts.length).toBe(0);
    });
  });
});
