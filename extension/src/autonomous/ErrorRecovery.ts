/**
 * Error Recovery Module
 *
 * Implements 3-level retry strategy with exponential backoff:
 * - Level 1: Send error message only
 * - Level 2: Send error + affected file contents
 * - Level 3: Send error + files + constitution rules
 *
 * After 3 failed attempts, escalates to user.
 *
 * Integrates with MemoryHookManager to store error recovery patterns.
 */

import type {
  ErrorInfo,
  RetryAttempt,
  RetryStrategy,
  ErrorType,
  ErrorSeverity,
  ErrorEscalation,
} from './types';
import type { MemoryHookManager, ErrorRecoveryContext } from './MemoryHookManager';

export class ErrorRecovery {
  // Retry delays in milliseconds (exponential backoff)
  private RETRY_DELAYS = {
    level1: 10000, // 10 seconds
    level2: 30000, // 30 seconds
    level3: 60000, // 60 seconds
  };

  /** Optional memory hook manager for storing error recovery patterns */
  private memoryHookManager?: MemoryHookManager;

  /**
   * Constructor with optional retry delays (for testing)
   */
  constructor(retryDelays?: { level1: number; level2: number; level3: number }) {
    if (retryDelays) {
      this.RETRY_DELAYS = retryDelays;
    }
  }

  /**
   * Set the memory hook manager for error recovery pattern storage.
   */
  setMemoryHookManager(manager: MemoryHookManager): void {
    this.memoryHookManager = manager;
  }

  // Error patterns for detection
  private readonly ERROR_PATTERNS = {
    syntax_error: /SyntaxError:/i,
    type_error: /error TS\d+:|Type .+ is not assignable/i,
    test_failure: /FAIL\s+tests?\//i,
    linting_error: /error\s+.+@typescript-eslint/i,
    runtime_error: /Error:|Exception:|Cannot read property/i,
    dependency_missing: /Cannot find module|Module not found/i,
    authentication_failure: /Authentication failed|Unauthorized|401/i,
  };

  /**
   * Detect error from terminal output
   * Requirement: <5s latency
   */
  detectError(output: string, taskId: string): ErrorInfo | null {
    const startTime = Date.now();

    // Check each error type
    for (const [errorType, pattern] of Object.entries(this.ERROR_PATTERNS)) {
      if (pattern.test(output)) {
        // Extract file paths
        const filePathRegex =
          /(?:^|\s)([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|test\.ts|spec\.ts))(?::|\s|$)/gm;
        const affectedFiles: string[] = [];
        let fileMatch;
        while ((fileMatch = filePathRegex.exec(output)) !== null) {
          if (fileMatch[1] && !affectedFiles.includes(fileMatch[1])) {
            affectedFiles.push(fileMatch[1]);
          }
        }

        // Extract stack trace
        const stackTraceRegex = /\s+at\s+.+\(.+:\d+:\d+\)/g;
        const stackTraceMatches = output.match(stackTraceRegex);
        const stackTrace = stackTraceMatches ? stackTraceMatches.join('\n') : null;

        // Extract error message (first line with error indicator)
        const errorMessageRegex = /(?:Error|Exception|FAIL):\s*(.+)/i;
        const messageMatch = output.match(errorMessageRegex);
        const errorMessage = messageMatch ? messageMatch[0] : output.substring(0, 200);

        const detectionLatency = Date.now() - startTime;

        const errorInfo: ErrorInfo = {
          errorId: this.generateErrorId(),
          taskId,
          errorType: errorType as ErrorType,
          severity: this.getSeverityForType(errorType as ErrorType),
          detectedAt: new Date().toISOString(),
          detectionLatency,
          errorMessage,
          stackTrace,
          affectedFiles,
          retryAttempts: [],
          recovered: false,
          escalated: false,
        };

        return errorInfo;
      }
    }

    return null;
  }

  /**
   * Categorize error severity for retry strategy
   */
  categorizeError(error: ErrorInfo): ErrorSeverity {
    switch (error.errorType) {
      case 'syntax_error':
      case 'type_error':
      case 'test_failure':
      case 'linting_error':
        return 'recoverable';

      case 'runtime_error':
        return 'needs_context';

      case 'dependency_missing':
      case 'authentication_failure':
        return 'fatal';

      default:
        return 'needs_context';
    }
  }

  /**
   * Execute 3-level retry strategy with exponential backoff
   *
   * @param error - The error to retry
   * @param retryCallback - Function to call for each retry attempt
   * @returns Updated error info with retry attempts
   */
  async retryWithStrategy(
    error: ErrorInfo,
    retryCallback: (strategy: RetryStrategy, attempt: number) => Promise<boolean>
  ): Promise<ErrorInfo> {
    const severity = this.categorizeError(error);

    // Fatal errors skip retry and escalate immediately
    if (severity === 'fatal') {
      return error;
    }

    const strategies: RetryStrategy[] = [
      'send_error_only',
      'send_error_with_file_context',
      'send_error_with_constitution',
    ];

    const delays = [this.RETRY_DELAYS.level1, this.RETRY_DELAYS.level2, this.RETRY_DELAYS.level3];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const attemptNumber = i + 1;

      // Wait before retry (except first attempt)
      if (i > 0) {
        await this.sleep(delays[i]);
      }

      const attemptStartTime = Date.now();

      try {
        const success = await retryCallback(strategy, attemptNumber);

        const attempt: RetryAttempt = {
          attemptNumber,
          timestamp: new Date().toISOString(),
          strategy,
          contextAdded: this.getContextForStrategy(strategy, error),
          result: success ? 'success' : 'failed',
          durationMs: Date.now() - attemptStartTime,
        };

        error.retryAttempts.push(attempt);

        if (success) {
          error.recovered = true;

          // Store error recovery pattern as memory (FR-011)
          if (this.memoryHookManager) {
            const recoveryContext: ErrorRecoveryContext = {
              errorType: error.errorType,
              errorMessage: error.errorMessage,
              stackTrace: error.stackTrace ?? undefined,
              recoverySteps: error.retryAttempts.map(
                (a) => `Attempt ${a.attemptNumber}: ${a.strategy} - ${a.result}`
              ),
              whatWorked: `Strategy "${strategy}" resolved the error`,
              affectedFiles: error.affectedFiles,
            };
            // Fire and forget - don't block on memory save
            this.memoryHookManager.onErrorRecovery(recoveryContext).catch((err) => {
              console.warn(
                '[Gofer] Memory save for error recovery failed:',
                err instanceof Error ? err.message : err
              );
            });
          }

          return error;
        }
    } catch (_err) {
        const attempt: RetryAttempt = {
          attemptNumber,
          timestamp: new Date().toISOString(),
          strategy,
          contextAdded: this.getContextForStrategy(strategy, error),
          result: 'failed',
          durationMs: Date.now() - attemptStartTime,
        };

        error.retryAttempts.push(attempt);
      }
    }

    // All retries failed
    error.recovered = false;
    return error;
  }

  /**
   * Escalate error to user after retry failures
   */
  escalateToUser(error: ErrorInfo): ErrorEscalation {
    error.escalated = true;

    const escalation: ErrorEscalation = {
      errorId: error.errorId,
      taskId: error.taskId,
      severity: error.severity,
      message: error.errorMessage,
      affectedFiles: error.affectedFiles,
      retryAttempts: error.retryAttempts.length,
      contextProvided: error.retryAttempts.map((attempt) => ({
        strategy: attempt.strategy,
        context: attempt.contextAdded,
      })),
      escalated: true,
      escalatedAt: new Date().toISOString(),
      formattedForVSCode: this.formatForVSCode(error),
      formattedForWhatsApp: this.formatForWhatsApp(error),
    };

    return escalation;
  }

  /**
   * Get context to add for each retry strategy
   */
  private getContextForStrategy(strategy: RetryStrategy, error: ErrorInfo): string[] {
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

  /**
   * Format error for VSCode notification
   */
  private formatForVSCode(error: ErrorInfo): string {
    let message = `❌ Task ${error.taskId} Failed\n\n`;
    message += `Error: ${error.errorMessage}\n\n`;

    if (error.affectedFiles.length > 0) {
      message += `Affected files:\n${error.affectedFiles.map((f) => `  • ${f}`).join('\n')}\n\n`;
    }

    message += `Retry attempts: ${error.retryAttempts.length}\n`;

    if (error.stackTrace) {
      message += `\nStack trace:\n${error.stackTrace}`;
    }

    return message;
  }

  /**
   * Format error for WhatsApp (300 char limit)
   */
  private formatForWhatsApp(error: ErrorInfo): string {
    let message = `❌ Task ${error.taskId} failed after ${error.retryAttempts.length} retries.\n`;
    message += `Error: ${error.errorMessage.substring(0, 150)}`;

    if (message.length > 300) {
      message = message.substring(0, 297) + '...';
    }

    return message;
  }

  /**
   * Get default severity for error type
   */
  private getSeverityForType(errorType: ErrorType): ErrorSeverity {
    switch (errorType) {
      case 'syntax_error':
      case 'type_error':
      case 'test_failure':
      case 'linting_error':
        return 'recoverable';

      case 'runtime_error':
        return 'needs_context';

      case 'dependency_missing':
      case 'authentication_failure':
        return 'fatal';

      default:
        return 'needs_context';
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
