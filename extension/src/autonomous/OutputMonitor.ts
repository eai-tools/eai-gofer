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

  // Question patterns (in priority order) - FR-004
  private readonly QUESTION_PATTERNS = [
    { pattern: /Option\s+[A-Z]:/gi, confidence: 'high' as const },
    {
      pattern: /Which\s+(approach|method|pattern|option|library|framework)/i,
      confidence: 'high' as const,
    },
    { pattern: /Would\s+you\s+like\s+(me\s+)?to/i, confidence: 'high' as const },
    { pattern: /Would\s+you\s+prefer/i, confidence: 'high' as const },
    {
      pattern: /Should\s+I\s+(use|implement|create|add|update|modify|delete)/i,
      confidence: 'medium' as const,
    },
    { pattern: /Do\s+you\s+want\s+(me\s+)?to/i, confidence: 'high' as const },
    { pattern: /Can\s+I\s+(proceed|continue)\s+with/i, confidence: 'medium' as const },
    { pattern: /I'm\s+(not\s+sure|uncertain)\s+(how|whether|if)/i, confidence: 'high' as const },
    { pattern: /I'm\s+blocked\s+on/i, confidence: 'high' as const },
    { pattern: /I\s+need\s+(your\s+)?guidance\s+on/i, confidence: 'high' as const },
    { pattern: /Please\s+clarify/i, confidence: 'high' as const },
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
    // Filter out false positives BEFORE pattern matching

    // Skip if this looks like an echoed user response (starts with ">")
    if (output.trim().startsWith('>')) {
      return null;
    }

    // Skip if this contains our own auto-response signature phrases
    const autoResponseSignatures = [
      /Yes, proceed\./i,
      /No, do not proceed/i,
      /The question is a simple/i,
      /about making an edit to a file/i,
    ];
    if (autoResponseSignatures.some((sig) => sig.test(output))) {
      return null;
    }

    // Skip if this is a "User rejected" or "User approved" message
    if (/User (rejected|approved)/i.test(output)) {
      return null;
    }

    // Skip if this is a "Thank you" response (Claude Code acknowledging our answer)
    if (/^⏺?\s*Thank you/i.test(output)) {
      return null;
    }

    // Skip code sections - these often contain question marks but aren't actual questions

    // 1. Code blocks (markdown fenced code with ```)
    if (/```[\s\S]*```/.test(output) || /^```/m.test(output)) {
      return null;
    }

    // 2. Inline code (contains backticks)
    if (/`[^`]+`/.test(output)) {
      return null;
    }

    // 3. Tool use blocks (Claude Code's function calls)
    if (/<(function_calls|invoke|parameter)/.test(output)) {
      return null;
    }

    // 4. Code-like patterns - lines that look like code
    const codePatterns = [
      /^\s{4,}/, // Indented code (4+ spaces)
      /^\t/, // Tab-indented code
      /^(function|const|let|var|class|interface|type|export|import)\s+/m, // JS/TS keywords
      /^(def|class|import|from)\s+/m, // Python keywords
      /[a-zA-Z_]\w*\s*\([^)]*\)\s*[{:=>]/, // Function definitions/calls
      /^\s*\/\//, // Single-line comments
      /^\s*\/\*/, // Multi-line comments start
      /^\s*\*/, // Comment continuation
      /=>\s*{/, // Arrow functions
      /\w+\.\w+\([^)]*\)/, // Method calls (foo.bar())
    ];
    if (codePatterns.some((pattern) => pattern.test(output))) {
      return null;
    }

    // 5. File write operations (Write/Edit/Read tool results)
    if (/^(Write|Edit|Read|Glob|Grep|Bash)\(/m.test(output)) {
      return null;
    }

    // 6. Lines containing common code symbols (but not in natural language)
    const codeSymbolDensity = (output.match(/[{}[\]();=><]/g) || []).length;
    const outputLength = output.length;
    if (outputLength > 0 && codeSymbolDensity / outputLength > 0.15) {
      // More than 15% code symbols - probably code, not a question
      return null;
    }

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

  /**
   * T071: Performance monitoring for output detection latency
   *
   * Tracks processing time for parseStream() to ensure <100ms latency.
   * Success Criteria: SC-007 (<100ms output latency P99)
   */
  private latencyMetrics: Array<{ timestamp: number; latency: number }> = [];
  private readonly MAX_LATENCY_SAMPLES = 1000; // Keep last 1000 samples
  private readonly TARGET_LATENCY_MS = 100; // P99 target

  /**
   * Parse stream with latency tracking
   *
   * Wrapper around parseStream() that measures performance.
   *
   * @param output - Output string to parse
   * @returns Parsed events and latency metrics
   */
  parseStreamWithMetrics(output: string): {
    events: ParsedEvent[];
    latencyMs: number;
    meetsTarget: boolean;
  } {
    const startTime = performance.now();
    const events = this.parseStream(output);
    const endTime = performance.now();
    const latencyMs = endTime - startTime;

    // Record latency
    this.latencyMetrics.push({
      timestamp: Date.now(),
      latency: latencyMs,
    });

    // Keep only recent samples
    if (this.latencyMetrics.length > this.MAX_LATENCY_SAMPLES) {
      this.latencyMetrics.shift();
    }

    return {
      events,
      latencyMs,
      meetsTarget: latencyMs < this.TARGET_LATENCY_MS,
    };
  }

  /**
   * Get performance statistics
   *
   * @returns Latency statistics including P50, P95, P99
   */
  getPerformanceStats(): {
    sampleCount: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    targetMet: boolean;
  } {
    if (this.latencyMetrics.length === 0) {
      return {
        sampleCount: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        targetMet: true,
      };
    }

    // Sort latencies
    const sortedLatencies = this.latencyMetrics.map((m) => m.latency).sort((a, b) => a - b);

    // Calculate percentiles
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    const p50 = sortedLatencies[p50Index];
    const p95 = sortedLatencies[p95Index];
    const p99 = sortedLatencies[p99Index];

    // Calculate average
    const sum = sortedLatencies.reduce((acc, val) => acc + val, 0);
    const avg = sum / sortedLatencies.length;

    return {
      sampleCount: this.latencyMetrics.length,
      avgLatencyMs: Number(avg.toFixed(2)),
      p50LatencyMs: Number(p50.toFixed(2)),
      p95LatencyMs: Number(p95.toFixed(2)),
      p99LatencyMs: Number(p99.toFixed(2)),
      targetMet: p99 < this.TARGET_LATENCY_MS,
    };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.latencyMetrics = [];
  }

  /**
   * Check if performance targets are being met
   *
   * @returns True if P99 latency is under 100ms
   */
  isPerformanceTargetMet(): boolean {
    const stats = this.getPerformanceStats();
    return stats.targetMet;
  }
}
