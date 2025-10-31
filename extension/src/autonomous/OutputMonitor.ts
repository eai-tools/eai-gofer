/**
 * Output Monitor
 *
 * Parses terminal output stream to detect:
 * - Task progress (start, completion, failure)
 * - Errors (syntax, type, test failures, etc.)
 * - Questions needing user input
 * - Context window warnings
 */

import type { TaskUpdate, ErrorInfo, Question, ParsedEvent, TaskStatus, ErrorType } from './types';

export class OutputMonitor {
  // Task markers
  private readonly TASK_PATTERNS = {
    completed: /✅\s*Task\s*#(T\d{3}):?\s*(.+)/i,
    in_progress: /🔄\s*Task\s*#(T\d{3}):?\s*(.+)/i,
    failed: /❌\s*Task\s*#(T\d{3}):?\s*(.+)/i,
  };

  // Error patterns
  private readonly ERROR_PATTERNS = {
    type_error: /error TS\d+:/i,
    syntax_error: /SyntaxError:/i,
    test_failure: /FAIL\s+tests?\//i,
    linting_error: /error\s+.+@typescript-eslint/i,
    runtime_error: /Error:|Exception:|at\s+\w+/i,
    dependency_missing: /Cannot find module|Module not found/i,
    authentication_failure: /Authentication failed|Unauthorized|401/i,
  };

  // Question patterns (in priority order)
  private readonly QUESTION_PATTERNS = [
    { pattern: /Option\s+[A-Z]:/gi, confidence: 'high' as const },
    { pattern: /Which\s+(approach|method|pattern)/i, confidence: 'high' as const },
    { pattern: /Should\s+I\s+(use|implement|create)/i, confidence: 'medium' as const },
    { pattern: /I'm\s+blocked\s+on/i, confidence: 'high' as const },
    { pattern: /\?$/m, confidence: 'low' as const },
  ];

  // Context warning patterns
  private readonly CONTEXT_PATTERNS = [
    /context\s+window/i,
    /token\s+limit/i,
    /context.*(?:full|exhausted|approaching)/i,
    /my\s+context.*(?:nearly|almost)\s+full/i,
  ];

  /**
   * Detect task completion/start/failure from output
   */
  detectTaskCompletion(output: string): TaskUpdate | null {
    for (const [status, pattern] of Object.entries(this.TASK_PATTERNS)) {
      const match = output.match(pattern);
      if (match) {
        return {
          taskId: match[1],
          specId: '', // Will be set by caller
          previousStatus: 'pending' as TaskStatus,
          newStatus: status as TaskStatus,
          terminalId: '', // Will be set by caller
          timestamp: new Date().toISOString(),
          duration: null,
          filesModified: [],
          testsRun: [],
          errors: [],
        };
      }
    }

    return null;
  }

  /**
   * Detect errors in output
   */
  detectError(output: string): ErrorInfo | null {
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

        // Extract error message (first line with "Error:" or similar)
        const errorMessageRegex = /(?:Error|Exception|FAIL):\s*(.+)/i;
        const messageMatch = output.match(errorMessageRegex);
        const errorMessage = messageMatch ? messageMatch[0] : output.substring(0, 200);

        return {
          errorId: '', // Will be set by caller (UUID)
          taskId: '', // Will be set by caller
          errorType: errorType as ErrorType,
          severity: this.categorizeSeverity(errorType as ErrorType),
          detectedAt: new Date().toISOString(),
          detectionLatency: 0, // Will be set by caller
          errorMessage,
          stackTrace,
          affectedFiles,
          retryAttempts: [],
          recovered: false,
          escalated: false,
        };
      }
    }

    return null;
  }

  /**
   * Detect questions needing user input
   */
  detectQuestion(output: string): Question | null {
    const matchedPatterns: string[] = [];
    let highestConfidence: 'high' | 'medium' | 'low' = 'low';

    // Check all patterns
    for (const { pattern, confidence } of this.QUESTION_PATTERNS) {
      if (pattern.test(output)) {
        matchedPatterns.push(pattern.source);
        if (confidence === 'high' || (confidence === 'medium' && highestConfidence === 'low')) {
          highestConfidence = confidence;
        }
      }
    }

    // Must have at least one pattern match
    if (matchedPatterns.length === 0) {
      return null;
    }

    // Extract options (Option A:, Option B:, etc.)
    const optionsRegex = /Option\s+([A-Z]):\s*([^\n]+)/gi;
    const options: string[] = [];
    let optionMatch;
    while ((optionMatch = optionsRegex.exec(output)) !== null) {
      options.push(`Option ${optionMatch[1]}: ${optionMatch[2].trim()}`);
    }

    // Extract question text (look for lines ending with ?)
    const questionRegex = /^.*\?$/gm;
    const questionMatches = output.match(questionRegex);
    const questionText =
      questionMatches && questionMatches.length > 0
        ? questionMatches[questionMatches.length - 1]
        : output.substring(0, 200);

    return {
      questionId: '', // Will be set by caller (UUID)
      taskId: '', // Will be set by caller
      sessionId: '', // Will be set by caller
      detectedAt: new Date().toISOString(),
      confidence: highestConfidence,
      patterns: matchedPatterns,
      questionText: questionText.trim(),
      options,
      context: output,
      notificationChannel: 'vscode', // Default, can be overridden
      sentAt: null,
      userResponse: null,
      respondedAt: null,
      sentToClaudeAt: null,
      timeout: false,
    };
  }

  /**
   * Detect context window warnings
   */
  detectContextWarning(output: string): boolean {
    return this.CONTEXT_PATTERNS.some((pattern) => pattern.test(output));
  }

  /**
   * Parse entire output stream and return all detected events
   */
  parseStream(output: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];

    // Split output by lines and check each line for task updates
    const lines = output.split('\n');
    for (const line of lines) {
      const taskUpdate = this.detectTaskCompletion(line);
      if (taskUpdate) {
        events.push({
          type: 'task_update',
          timestamp: new Date().toISOString(),
          data: taskUpdate,
        });
      }
    }

    // Check for errors (full output, as errors span multiple lines)
    const error = this.detectError(output);
    if (error) {
      events.push({
        type: 'error_detected',
        timestamp: new Date().toISOString(),
        data: error,
      });
    }

    // Check for questions (full output, as questions span multiple lines)
    const question = this.detectQuestion(output);
    if (question) {
      events.push({
        type: 'question_detected',
        timestamp: new Date().toISOString(),
        data: question,
      });
    }

    // Check for context warnings
    if (this.detectContextWarning(output)) {
      events.push({
        type: 'context_warning',
        timestamp: new Date().toISOString(),
        data: { message: 'Context window limit approaching' },
      });
    }

    return events;
  }

  /**
   * Categorize error severity for retry strategy
   */
  private categorizeSeverity(errorType: ErrorType): 'recoverable' | 'needs_context' | 'fatal' {
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
}
