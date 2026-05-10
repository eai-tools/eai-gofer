/**
 * Autonomous Driver - Main Orchestrator
 *
 * Coordinates all autonomous modules:
 * - TerminalManager: Spawns and manages Claude Code terminals
 * - OutputMonitor: Parses terminal output for events
 * - ErrorRecovery: Handles errors with 3-level retry
 * - ProgressReporter: Updates UI and persists state
 *
 * Responsibilities:
 * - Session lifecycle (start, stop, pause, resume)
 * - Task execution orchestration
 * - Event emission (onProgress, onError, onComplete)
 * - State persistence and recovery
 */

import * as vscode from 'vscode';
import { TerminalManager } from './TerminalManager';
import { OutputMonitor } from './OutputMonitor';
import { ErrorRecovery } from './ErrorRecovery';
import { ProgressReporter } from './ProgressReporter';
import { MemoryManager } from './MemoryManager';
import { HintLoader } from './HintLoader';
import { ContextBuilder } from './ContextBuilder';
import { ContextCompactor } from './ContextCompactor';
import type { Memory } from './memory';
import type { CompactionSummary } from './compaction';
import type {
  AutonomousSession,
  DriverOptions,
  ProgressUpdate,
  ProgressCallback,
  ErrorCallback,
  CompletionCallback,
  DriverError,
  SessionEvent,
  TerminalState,
  TerminalRole,
} from './types';
import type { LLMProvider } from '../council/providers/LLMProvider';

interface ProgressProviderLike {
  getSpec(specId: string): SessionSpecLike | undefined;
  updateTaskStatus(
    specId: string,
    taskId: string,
    status: import('./types').TaskStatus
  ): Promise<void>;
  refresh(): void;
}

interface SessionSpecLike {
  tasks: unknown[];
}

export class AutonomousDriver {
  private workspacePath: string;
  private progressProvider: ProgressProviderLike;
  private options: DriverOptions;
  private provider?: LLMProvider; // R7: Fixed type from 'any' to 'LLMProvider' for type safety
  // NOTE: Provider parameter available for future autonomous→CLI integration
  // Currently autonomous mode uses pty-based execution, provider would enable direct API calls

  // Module instances
  private terminalManager: TerminalManager;
  private outputMonitor: OutputMonitor;
  private errorRecovery: ErrorRecovery;
  private progressReporter: ProgressReporter;
  private memoryManager: MemoryManager;
  private hintLoader: HintLoader;
  private contextBuilder: ContextBuilder;
  private contextCompactor: ContextCompactor; // T145: Add ContextCompactor instance

  // Session state
  private currentSession: AutonomousSession | null = null;

  // Loaded memories for current session
  private sessionMemories: Memory[] = [];

  // Pattern detection for auto-suggest (T048)
  private patternTracker: Map<string, number> = new Map(); // concept -> occurrence count
  private suggestedPatterns: Set<string> = new Set(); // Track already suggested patterns

  // Event callbacks
  private progressCallbacks: ProgressCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private completionCallbacks: CompletionCallback[] = [];

  constructor(
    workspacePath: string,
    progressProvider: ProgressProviderLike,
    memoryManager: MemoryManager,
    options: DriverOptions,
    provider?: LLMProvider // R7: Typed as LLMProvider (optional for backward compatibility)
  ) {
    this.workspacePath = workspacePath;
    this.progressProvider = progressProvider;
    this.memoryManager = memoryManager;
    this.options = options;
    this.provider = provider;

    // Initialize modules
    this.terminalManager = new TerminalManager();
    this.outputMonitor = new OutputMonitor();
    this.errorRecovery = new ErrorRecovery();
    this.progressReporter = new ProgressReporter(workspacePath, progressProvider);
    this.hintLoader = new HintLoader(workspacePath);
    this.contextBuilder = new ContextBuilder(workspacePath, memoryManager, this.hintLoader);

    // T156: Read threshold from VSCode settings and initialize ContextCompactor
    const config = vscode.workspace.getConfiguration('gofer.autonomous');
    const threshold = config.get<number>('compactionThreshold', 80) / 100; // Convert percentage to decimal
    this.contextCompactor = new ContextCompactor(workspacePath, {
      threshold,
      autoCompact: true,
      enableBackup: true,
    });

    // Setup file watcher for hint changes
    this.hintLoader.setupFileWatcher();
  }

  /**
   * Start autonomous execution for a spec
   */
  async start(specId: string): Promise<AutonomousSession> {
    // Verify not already running
    if (this.currentSession && this.currentSession.status === 'running') {
      throw new Error('Driver already running. Stop current session first.');
    }

    // Load spec
    const spec = this.progressProvider.getSpec(specId);
    if (!spec) {
      throw new Error(`Spec not found: ${specId}`);
    }

    // Create new session
    try {
      this.currentSession = await this.createSession(specId, spec);

      // T044: Load memories at session start
      await this.loadSessionMemories();

      // Reset pattern tracking for new session
      this.resetPatternTracking();

      // Spawn engineer terminal
      const engineerTerminal = await this.spawnTerminal('engineer');
      this.currentSession.terminals.push(engineerTerminal);

      // Spawn tester terminal if parallel mode enabled
      if (this.options.enableParallelTester) {
        const testerTerminal = await this.spawnTerminal('tester');
        this.currentSession.terminals.push(testerTerminal);
      }

      // Record session start event
      this.recordEvent('session_started', {
        specId,
        totalTasks: this.currentSession.totalTasks,
        memoriesLoaded: this.sessionMemories.length,
      });

      // Save initial session state
      await this.progressReporter.saveSession(this.currentSession);

      // Emit initial progress
      this.emitProgress();

      return this.currentSession;
    } catch (error) {
      // Cleanup on error
      this.currentSession = null;
      this.sessionMemories = [];
      throw error;
    }
  }

  /**
   * Stop autonomous execution
   */
  async stop(): Promise<void> {
    if (!this.currentSession) {
      return; // Already stopped
    }

    try {
      // Close all terminals
      for (const terminal of this.currentSession.terminals) {
        if (terminal.isAlive) {
          await this.terminalManager.closeTerminal(terminal.terminalId);
          terminal.isAlive = false;
          terminal.closedAt = new Date().toISOString();
        }
      }

      // Update session status
      this.currentSession.status = 'cancelled';
      this.recordEvent('session_cancelled', {});

      // Save final state
      await this.progressReporter.saveSession(this.currentSession);

      // Clear session and memories
      this.currentSession = null;
      this.sessionMemories = [];
    } catch (error) {
      // Ensure session is cleared even if cleanup fails
      this.currentSession = null;
      this.sessionMemories = [];
      throw error;
    }
  }

  /**
   * Pause autonomous execution
   */
  async pause(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to pause');
    }

    if (this.currentSession.status === 'paused') {
      throw new Error('Session already paused');
    }

    // Update status
    this.currentSession.status = 'paused';
    this.currentSession.pausedAt = new Date().toISOString();

    // Record event
    this.recordEvent('user_paused', {
      currentTask: this.currentSession.currentTask,
    });

    // Save state
    await this.progressReporter.saveSession(this.currentSession);
  }

  /**
   * Resume paused execution
   */
  async resume(): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No paused session to resume');
    }

    if (this.currentSession.status !== 'paused') {
      throw new Error('Session is not paused');
    }

    // Update status
    this.currentSession.status = 'running';
    this.currentSession.resumedAt = new Date().toISOString();

    // Record event
    this.recordEvent('user_resumed', {
      currentTask: this.currentSession.currentTask,
    });

    // Save state
    await this.progressReporter.saveSession(this.currentSession);

    // Emit progress
    this.emitProgress();
  }

  /**
   * Get current session
   */
  getSession(): AutonomousSession | null {
    return this.currentSession;
  }

  /**
   * Register progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Register error callback
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Register completion callback
   */
  onComplete(callback: CompletionCallback): void {
    this.completionCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Create new session instance
   */
  private async createSession(specId: string, spec: SessionSpecLike): Promise<AutonomousSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      sessionId,
      specId,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      resumedAt: null,
      completedAt: null,
      status: 'running',
      terminals: [],
      totalTasks: spec.tasks.length,
      completedTasks: [],
      currentTask: null,
      failedTasks: [],
      tokenCount: 0,
      contextSwitches: 0,
      compactionHistory: [], // Initialize empty compaction history
      events: [],
      errorHistory: [],
      questionHistory: [],
      options: this.options,
    };
  }

  /**
   * Spawn terminal for given role
   */
  private async spawnTerminal(role: TerminalRole): Promise<TerminalState> {
    const terminalName = `Gofer: ${role === 'engineer' ? 'Engineer' : 'Tester'}`;
    const terminal = await this.terminalManager.createTerminal(terminalName);

    const terminalState: TerminalState = {
      terminalId: terminal.terminalId,
      terminalName: terminal.terminalName,
      role,
      createdAt: new Date().toISOString(),
      closedAt: null,
      isAlive: terminal.isAlive,
      pid: terminal.pid,
      outputBuffer: [],
      tokenCount: 0,
      currentCommand: null,
      lastActivity: new Date().toISOString(),
    };

    return terminalState;
  }

  /**
   * Record session event
   */
  private recordEvent(type: SessionEvent['type'], data: Record<string, unknown>): void {
    if (!this.currentSession) {
      return;
    }

    const event: SessionEvent = {
      timestamp: new Date().toISOString(),
      type,
      data,
    };

    this.currentSession.events.push(event);
  }

  /**
   * Emit progress update to registered callbacks
   */
  private emitProgress(): void {
    if (!this.currentSession) {
      return;
    }

    const progressUpdate: ProgressUpdate = {
      sessionId: this.currentSession.sessionId,
      timestamp: new Date().toISOString(),
      tasksCompleted: this.currentSession.completedTasks.length,
      tasksTotal: this.currentSession.totalTasks,
      percentComplete: Math.round(
        (this.currentSession.completedTasks.length / this.currentSession.totalTasks) * 100
      ),
      estimatedTimeRemaining: null, // TODO: Calculate based on average task time
      currentTask: this.currentSession.currentTask,
      currentTerminal: this.currentSession.terminals.find((t) => t.isAlive)?.terminalId || '',
      currentAction: this.getActionDescription(),
      testsRun: 0, // TODO: Track from test results
      testsPassed: 0,
      testsFailed: 0,
      elapsedTime: this.getElapsedTime(),
      tokensUsed: this.currentSession.tokenCount,
      contextSwitches: this.currentSession.contextSwitches,
    };

    // Call all registered callbacks with error handling
    for (const callback of this.progressCallbacks) {
      try {
        callback(progressUpdate);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  /**
   * Get current action description
   */
  private getActionDescription(): string {
    if (!this.currentSession) {
      return 'Idle';
    }

    if (this.currentSession.status === 'paused') {
      return 'Paused';
    }

    if (this.currentSession.currentTask) {
      return `Working on ${this.currentSession.currentTask}`;
    }

    return 'Initializing';
  }

  /**
   * Get elapsed time in milliseconds
   */
  private getElapsedTime(): number {
    if (!this.currentSession) {
      return 0;
    }

    const startTime = new Date(this.currentSession.startedAt).getTime();
    const now = Date.now();
    return now - startTime;
  }

  /**
   * Emit error to registered callbacks
   */
  private emitError(error: DriverError): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    }
  }

  // ============================================================================
  // Memory Integration (T044-T046)
  // ============================================================================

  /**
   * Load memories at session start.
   * Loads both local (project) and global memories.
   *
   * @private
   */
  private async loadSessionMemories(): Promise<void> {
    try {
      // Load all memories (both local and global)
      this.sessionMemories = await this.memoryManager.load('both');

      // Log memory count for debugging
    } catch (error) {
      console.error('[AutonomousDriver] Failed to load memories:', error);
      // Don't fail the session if memory loading fails
      this.sessionMemories = [];
    }
  }

  /**
   * Get memories formatted for LLM context injection.
   * Returns markdown-formatted string with all memories categorized.
   *
   * T045: Inject loaded memories into LLM context before each task execution
   *
   * @returns Formatted memory context string
   */
  getMemoryContext(): string {
    if (this.sessionMemories.length === 0) {
      return '';
    }

    // Group memories by category
    const categorized = new Map<string, Memory[]>();
    for (const memory of this.sessionMemories) {
      const existing = categorized.get(memory.category) || [];
      existing.push(memory);
      categorized.set(memory.category, existing);
    }

    // Build formatted context
    let context = '# Project Memories\n\n';
    context += `You have access to ${this.sessionMemories.length} memories from previous interactions:\n\n`;

    for (const [category, memories] of categorized.entries()) {
      context += `## ${category}\n\n`;
      for (const memory of memories) {
        context += `- **${memory.tags.join(', ')}**: ${memory.content}\n`;
        context += `  _Scope: ${memory.scope}, Used: ${memory.usedCount} times_\n\n`;
      }
    }

    context +=
      '\nPlease consider these memories when making decisions and following coding standards.\n\n';

    return context;
  }

  /**
   * Record usage of a memory during task execution.
   * Updates lastUsed timestamp and increments usedCount.
   *
   * T046: Call recordUsage() for each memory used during execution
   *
   * @param memoryId - UUID of the memory that was used
   */
  async recordMemoryUsage(memoryId: string): Promise<void> {
    try {
      await this.memoryManager.recordUsage(memoryId);
    } catch (error) {
      console.error(`[AutonomousDriver] Failed to record memory usage:`, error);
      // Don't fail the task if usage recording fails
    }
  }

  // ============================================================================
  // Context Building with Hints (T068-T071)
  // ============================================================================

  /**
   * Build complete context for a task, including hints and memories.
   *
   * T070: Inject merged hints into LLM context via ContextBuilder
   * T071: Add hint loading performance monitoring (<500ms requirement)
   *
   * @param task - Task information
   * @returns Full context string for LLM
   */
  async buildTaskContext(task: {
    taskId: string;
    specId: string;
    description: string;
    affectedFiles?: string[];
    declaredHints?: string[];
    customContext?: string;
  }): Promise<{ context: string; loadTime: number; hintsLoadTime: number }> {
    const startTime = Date.now();

    try {
      // Use ContextBuilder to merge all context sources
      const builtContext = await this.contextBuilder.buildContext(task);

      const totalLoadTime = Date.now() - startTime;

      // T071: Log performance metrics
      console.log(
        `[AutonomousDriver] Context built in ${totalLoadTime}ms ` +
          `(hints: ${builtContext.hintsLoadTime}ms, ` +
          `memories: ${builtContext.memoriesLoadTime}ms)`
      );

      // T071: Warn if hints loading exceeds 500ms requirement
      if (builtContext.hintsLoadTime > 500) {
        console.warn(
          `[AutonomousDriver] Hint loading exceeded 500ms requirement: ${builtContext.hintsLoadTime}ms`
        );
      }

      // Record event with performance metrics
      this.recordEvent('context_built', {
        taskId: task.taskId,
        totalLoadTime,
        hintsLoadTime: builtContext.hintsLoadTime,
        memoriesLoadTime: builtContext.memoriesLoadTime,
        hintsCount: builtContext.sections.hints ? 1 : 0,
        memoriesCount: this.sessionMemories.length,
      });

      return {
        context: builtContext.fullContext,
        loadTime: totalLoadTime,
        hintsLoadTime: builtContext.hintsLoadTime,
      };
    } catch (error) {
      console.error('[AutonomousDriver] Failed to build task context:', error);

      // Fallback to memory-only context
      return {
        context: this.getMemoryContext(),
        loadTime: Date.now() - startTime,
        hintsLoadTime: 0,
      };
    }
  }

  /**
   * Get hint loading performance metrics for monitoring.
   *
   * @returns Object with hint loading statistics
   */
  getHintPerformanceMetrics(): {
    lastLoadTime: number;
    averageLoadTime: number;
    maxLoadTime: number;
  } {
    // This would track metrics across multiple loads
    // For now, return placeholder values
    return {
      lastLoadTime: 0,
      averageLoadTime: 0,
      maxLoadTime: 0,
    };
  }

  /**
   * Get memories filtered by tags (for task-specific context).
   *
   * @param tags - Tags to filter by
   * @returns Memories matching any of the provided tags
   */
  getMemoriesByTags(tags: string[]): Memory[] {
    return this.sessionMemories.filter((memory) => tags.some((tag) => memory.tags.includes(tag)));
  }

  /**
   * Get memories filtered by category.
   *
   * @param category - Category to filter by
   * @returns Memories in the specified category
   */
  getMemoriesByCategory(category: string): Memory[] {
    return this.sessionMemories.filter((memory) => memory.category === category);
  }

  // ============================================================================
  // Pattern Detection & Auto-Suggest (T048-T049)
  // ============================================================================

  /**
   * Track repeated concept/explanation for pattern detection.
   * Call this when the LLM provides an explanation or makes a decision.
   *
   * T048: Add pattern detection logic - track repeated explanations
   *
   * @param concept - The concept being explained (e.g., "use_vitest_for_testing")
   * @param content - The actual explanation/guideline text
   * @param category - Category for the potential memory
   * @param tags - Tags for the potential memory
   */
  async trackPattern(
    concept: string,
    content: string,
    category: string,
    tags: string[]
  ): Promise<void> {
    // Increment occurrence count
    const currentCount = this.patternTracker.get(concept) || 0;
    const newCount = currentCount + 1;
    this.patternTracker.set(concept, newCount);

    // T049: Show notification after 3 occurrences (if not already suggested)
    if (newCount >= 3 && !this.suggestedPatterns.has(concept)) {
      await this.suggestMemoryToUser(concept, content, category, tags);
    }
  }

  /**
   * Suggest saving a memory to the user via VSCode notification.
   *
   * T049: Show VSCode notification with "Would you like me to remember this?"
   *
   * @param concept - Unique identifier for the pattern
   * @param content - Memory content
   * @param category - Memory category
   * @param tags - Memory tags
   * @private
   */
  private async suggestMemoryToUser(
    concept: string,
    content: string,
    category: string,
    tags: string[]
  ): Promise<void> {
    // Mark as suggested to avoid duplicate notifications
    this.suggestedPatterns.add(concept);

    // Create suggested memory object
    const suggestedMemory = this.memoryManager.suggestMemory(content, {
      category,
      tags,
      learnedFrom: 'pattern_detection',
    });

    // Show notification with preview
    const preview = content.length > 100 ? content.substring(0, 97) + '...' : content;
    const response = await vscode.window.showInformationMessage(
      `I've noticed a repeated pattern. Would you like me to remember this?\n\n"${preview}"`,
      { modal: false },
      'Yes, remember this',
      'No',
      'View details'
    );

    if (response === 'Yes, remember this') {
      try {
        // Save the memory
        await this.memoryManager.save({
          category: suggestedMemory.category,
          tags: suggestedMemory.tags,
          scope: suggestedMemory.scope,
          content: suggestedMemory.content,
          lastUsed: suggestedMemory.lastUsed,
          usedCount: suggestedMemory.usedCount,
          learnedFrom: suggestedMemory.learnedFrom,
        });

        vscode.window.showInformationMessage(
          '✓ Memory saved! I will remember this for future sessions.'
        );

        // Reload session memories to include the new one
        await this.loadSessionMemories();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to save memory: ${(error as Error).message}`);
        console.error('[AutonomousDriver] Failed to save suggested memory:', error);
      }
    } else if (response === 'View details') {
      // Show webview with full details
      const panel = vscode.window.createWebviewPanel(
        'memorySuggestion',
        'Memory Suggestion',
        vscode.ViewColumn.One,
        {}
      );

      panel.webview.html = this.getMemorySuggestionHtml(suggestedMemory);
    }
  }

  /**
   * Generate HTML for memory suggestion details webview.
   *
   * @param memory - Suggested memory to display
   * @returns HTML string
   * @private
   */
  private getMemorySuggestionHtml(memory: Memory): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memory Suggestion</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1 {
            font-size: 20px;
            margin-bottom: 20px;
        }
        .field {
            margin-bottom: 16px;
        }
        .label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .value {
            font-size: 14px;
            line-height: 1.6;
            padding: 10px;
            background-color: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 3px;
        }
        .tag {
            display: inline-block;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 3px;
            margin-right: 4px;
            font-size: 12px;
        }
        .info-box {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <h1>💡 Suggested Memory</h1>

    <div class="field">
        <div class="label">Content</div>
        <div class="value">${this.escapeHtml(memory.content)}</div>
    </div>

    <div class="field">
        <div class="label">Category</div>
        <div class="value">${this.escapeHtml(memory.category)}</div>
    </div>

    <div class="field">
        <div class="label">Tags</div>
        <div class="value">
            ${memory.tags.map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>
    </div>

    <div class="field">
        <div class="label">Scope</div>
        <div class="value">${memory.scope === 'local' ? 'Local (this project)' : 'Global (all projects)'}</div>
    </div>

    <div class="info-box">
        <strong>Why this suggestion?</strong><br>
        This pattern was detected ${this.patternTracker.get(memory.content) || 3} times during autonomous execution.
        Saving it as a memory will help me remember this preference for future sessions.
    </div>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters for display.
   *
   * @param text - Text to escape
   * @returns Escaped HTML
   * @private
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Reset pattern tracking (e.g., when starting a new session).
   */
  private resetPatternTracking(): void {
    this.patternTracker.clear();
    this.suggestedPatterns.clear();
  }

  // ============================================================================
  // Context Compaction Integration (T145-T149)
  // ============================================================================

  /**
   * Monitor context usage and trigger compaction if needed.
   * Should be called after each task completion.
   *
   * T146: Add context monitoring in AutonomousDriver main execution loop
   * T147: Trigger compact() when threshold reached
   * T148: Update session context with compacted result
   * T149: Store CompactionSummary in session.compactionHistory
   *
   * @param currentContext - The current context string being used
   */
  async monitorAndCompactContext(currentContext: string): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      // Convert session to format expected by ContextCompactor
      const session = {
        id: this.currentSession.sessionId,
        specId: this.currentSession.specId,
        status: this.currentSession.status,
        currentTask: this.currentSession.currentTask,
        completedTasks: this.currentSession.completedTasks,
        failedTasks: this.currentSession.failedTasks.map((f) => f.taskId),
        context: currentContext,
        compactionHistory: this.currentSession.compactionHistory,
        startedAt: new Date(this.currentSession.startedAt).getTime(),
        lastUpdatedAt: Date.now(),
        completedAt: this.currentSession.completedAt
          ? new Date(this.currentSession.completedAt).getTime()
          : undefined,
      };

      // T146: Check if compaction is needed
      const shouldCompact = await this.contextCompactor.shouldCompact(session);

      if (shouldCompact) {
        // T147: Trigger compaction
        const summary = await this.contextCompactor.compact(session);

        // T149: Store CompactionSummary in session history
        this.currentSession.compactionHistory.push(summary);

        // T148: Update token count estimate
        this.currentSession.tokenCount = this.contextCompactor.estimateTokenUsage(session.context);

        // Save updated session
        await this.progressReporter.saveSession(this.currentSession);

        // T150-T151: Show notification to user
        await this.showCompactionNotification(summary);

        console.log(
          `[AutonomousDriver] Context compacted: ${summary.tasksCompacted.length} tasks summarized, ` +
            `${summary.tokensSaved} tokens saved`
        );
      }
    } catch (error) {
      console.error('[AutonomousDriver] Error during context compaction:', error);
      // Don't fail the session if compaction fails
      // T160: Show warning notification when fallback is used
      if (error instanceof Error && error.message.includes('fallback')) {
        vscode.window.showWarningMessage(
          'Context compaction used fallback strategy due to summarization error. Some context may be truncated.'
        );
      }
    }
  }

  /**
   * Show notification when context is compacted.
   *
   * T150: Show notification when compaction occurs
   * T151: Add "View Summary" button to notification
   *
   * @param summary - Compaction summary to display
   */
  private async showCompactionNotification(summary: CompactionSummary): Promise<void> {
    const tasksCount = summary.tasksCompacted.length;
    const tokensSaved = summary.tokensSaved;

    const action = await vscode.window.showInformationMessage(
      `Context compacted: ${tasksCount} tasks summarized, ~${tokensSaved} tokens saved`,
      'View Summary',
      'Dismiss'
    );

    if (action === 'View Summary') {
      // T152: Show CompactionSummaryPanel (will be implemented)
      await this.showCompactionSummary(summary);
    }
  }

  /**
   * Show compaction summary in a webview panel.
   *
   * T152: Create CompactionSummaryPanel webview
   *
   * @param summary - Compaction summary to display
   */
  private async showCompactionSummary(summary: CompactionSummary): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'compactionSummary',
      'Context Compaction Summary',
      vscode.ViewColumn.Two,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.getCompactionSummaryHtml(summary);
  }

  /**
   * Show full compaction history for the current session.
   *
   * T153: Add command "Gofer: View Compaction History"
   */
  async showCompactionHistory(): Promise<void> {
    if (!this.currentSession) {
      vscode.window.showInformationMessage('No active session');
      return;
    }

    if (this.currentSession.compactionHistory.length === 0) {
      vscode.window.showInformationMessage('No compaction has occurred yet in this session');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'compactionHistory',
      'Context Compaction History',
      vscode.ViewColumn.Two,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.getCompactionHistoryHtml(this.currentSession.compactionHistory);
  }

  /**
   * Generate HTML for full compaction history.
   *
   * @param history - Array of compaction summaries
   * @returns HTML string
   */
  private getCompactionHistoryHtml(history: CompactionSummary[]): string {
    const totalTokensSaved = history.reduce((sum, s) => sum + s.tokensSaved, 0);
    const totalTasksCompacted = history.reduce((sum, s) => sum + s.tasksCompacted.length, 0);

    const summariesHtml = history
      .map(
        (summary, index) => `
      <div class="summary-item">
        <div class="summary-header">
          <h3>Compaction #${index + 1}</h3>
          <span class="timestamp">${new Date(summary.compactedAt).toLocaleString()}</span>
        </div>
        <div class="summary-stats">
          <span class="stat-pill">📦 ${summary.tasksCompacted.length} tasks</span>
          <span class="stat-pill">💾 ${summary.tokensSaved.toLocaleString()} tokens saved</span>
          <span class="stat-pill">📌 ${summary.preservedTasks.length} preserved</span>
        </div>
        <div class="summary-text">${this.escapeHtml(summary.summaryText)}</div>
      </div>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Context Compaction History</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .overall-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-box {
            flex: 1;
            padding: 15px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 5px;
            border-left: 4px solid var(--vscode-textLink-activeForeground);
        }
        .stat-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin-top: 5px;
        }
        .summary-item {
            margin-bottom: 25px;
            padding: 20px;
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
        }
        .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .summary-header h3 {
            margin: 0;
            color: var(--vscode-textPreformat-foreground);
        }
        .timestamp {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .summary-stats {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .stat-pill {
            display: inline-block;
            padding: 4px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 12px;
        }
        .summary-text {
            padding: 15px;
            background-color: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 3px;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }
    </style>
</head>
<body>
    <h1>📚 Context Compaction History</h1>

    <div class="overall-stats">
        <div class="stat-box">
            <div class="stat-label">Total Compactions</div>
            <div class="stat-value">${history.length}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Total Tasks Compacted</div>
            <div class="stat-value">${totalTasksCompacted}</div>
        </div>
        <div class="stat-box">
            <div class="stat-label">Total Tokens Saved</div>
            <div class="stat-value">${totalTokensSaved.toLocaleString()}</div>
        </div>
    </div>

    <h2>Compaction Events</h2>
    ${summariesHtml}
</body>
</html>`;
  }

  /**
   * Generate HTML for compaction summary webview.
   *
   * @param summary - Compaction summary
   * @returns HTML string
   */
  private getCompactionSummaryHtml(summary: CompactionSummary): string {
    const date = new Date(summary.compactedAt).toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Context Compaction Summary</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .stat {
            display: inline-block;
            margin: 10px 20px 10px 0;
            padding: 10px 15px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 5px;
            border-left: 4px solid var(--vscode-textLink-activeForeground);
        }
        .stat-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .section {
            margin-top: 30px;
        }
        .section h2 {
            color: var(--vscode-textPreformat-foreground);
            font-size: 18px;
            margin-bottom: 10px;
        }
        .summary-text {
            padding: 15px;
            background-color: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 3px;
            white-space: pre-wrap;
            font-family: var(--vscode-editor-font-family);
        }
        .task-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        .task-chip {
            display: inline-block;
            padding: 4px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 12px;
            font-family: monospace;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <h1>📦 Context Compaction Summary</h1>

    <div class="stats">
        <div class="stat">
            <div class="stat-label">Tasks Compacted</div>
            <div class="stat-value">${summary.tasksCompacted.length}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Tokens Saved</div>
            <div class="stat-value">${summary.tokensSaved.toLocaleString()}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Tasks Preserved</div>
            <div class="stat-value">${summary.preservedTasks.length}</div>
        </div>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <div class="summary-text">${this.escapeHtml(summary.summaryText)}</div>
    </div>

    <div class="section">
        <h2>Compacted Tasks</h2>
        <div class="task-list">
            ${summary.tasksCompacted.map((taskId) => `<span class="task-chip">${this.escapeHtml(taskId)}</span>`).join('')}
        </div>
    </div>

    <div class="section">
        <h2>Preserved Tasks (Recent Work)</h2>
        <div class="task-list">
            ${summary.preservedTasks.map((taskId) => `<span class="task-chip">${this.escapeHtml(taskId)}</span>`).join('')}
        </div>
    </div>

    <div class="info">
        <strong>ℹ️ What is context compaction?</strong><br>
        When the context window reaches ${Math.round(this.contextCompactor.getThreshold())}% capacity,
        Gofer automatically summarizes completed tasks to free up space for new work.
        The last ${summary.preservedTasks.length} tasks are kept in full detail.
        <br><br>
        <strong>Compacted at:</strong> ${date}
    </div>
</body>
</html>`;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.progressReporter.dispose();
    this.sessionMemories = [];
    this.resetPatternTracking();
  }
}
