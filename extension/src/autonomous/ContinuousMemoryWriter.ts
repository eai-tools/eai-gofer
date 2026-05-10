/**
 * ContinuousMemoryWriter
 *
 * Automatically persists pipeline decisions and progress to the memory system.
 * Listens to ContextBuilder events (budget-warning, loading-decision) and
 * records stage transitions and task completions as memories.
 *
 * Rate limited to max 10 auto-saves per pipeline stage to prevent noise.
 *
 * Spec 014 Phase 5 (T030-T037)
 */

import type { EventEmitter } from 'events';

/** Interface for the MemoryManager save method */
interface MemoryManagerLike {
  save(memory: {
    category: string;
    tags: string[];
    scope: 'local' | 'global';
    content: string;
    lastUsed: number;
    usedCount: number;
    learnedFrom: string;
  }): Promise<unknown>;
}

/** Rate limit per stage */
const MAX_SAVES_PER_STAGE = 10;

/** T027/T028: Interface for KnowledgeGraph record methods */
interface KnowledgeGraphLike {
  recordPattern(patternName: string, files: string[]): void;
  recordDecision(decisionName: string, files: string[]): void;
}

export class ContinuousMemoryWriter {
  private memoryManager: MemoryManagerLike;
  private stageSaveCounts: Map<string, number> = new Map();
  private currentStage: string = 'unknown';
  private connectedBuilder: EventEmitter | null = null;
  private knowledgeGraph: KnowledgeGraphLike | null = null;

  constructor(memoryManager: MemoryManagerLike) {
    this.memoryManager = memoryManager;
  }

  /** T027/T028: Wire KnowledgeGraph for pattern/decision recording */
  setKnowledgeGraph(graph: KnowledgeGraphLike): void {
    this.knowledgeGraph = graph;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ContextBuilder Connection (T031)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Connects to a ContextBuilder instance and listens to its events.
   * Listens to `budget-warning` and `loading-decision` events.
   *
   * @param builder - EventEmitter (ContextBuilder instance)
   */
  connectToContextBuilder(builder: EventEmitter): void {
    this.connectedBuilder = builder;

    builder.on(
      'budget-warning',
      (event: {
        category: string;
        tokensUsed: number;
        budgetLimit: number;
        percentOver: number;
        stage: string;
      }) => {
        this.recordAutoDecision(
          `Budget warning: ${event.category} at ${event.tokensUsed} tokens (limit: ${event.budgetLimit}, ${event.percentOver.toFixed(0)}% over)`,
          event.stage || this.currentStage,
          'budget_warning'
        );
      }
    );

    builder.on(
      'loading-decision',
      (event: { source: string; decision: string; reason: string; tokens?: number }) => {
        const tokenInfo = event.tokens ? ` (${event.tokens} tokens)` : '';
        this.recordAutoDecision(
          `Loading decision: ${event.source} ${event.decision} — ${event.reason}${tokenInfo}`,
          this.currentStage,
          'loading_decision'
        );
      }
    );

    // T031: Listen for research-complete events and create discovery memories
    builder.on(
      'research-complete',
      (event: { specId: string; hintsLoaded: boolean; memoryCoverage: number }) => {
        this.saveMemory({
          category: 'discovery',
          content: `Research complete for spec ${event.specId}. Memory coverage: ${event.memoryCoverage.toFixed(1)}%. Hints loaded: ${event.hintsLoaded}`,
          tags: ['#auto', '#discovery', `#spec-${event.specId}`],
          specId: event.specId,
        });
      }
    );

    // 019 C4: Additional event sources for continuous memory writing
    builder.on('stage-change', (event: { from: string; to: string; specId?: string }) => {
      this.recordEventWithRateLimit('stage-change', () => {
        this.recordAutoDecision(
          `Stage transition: ${event.from} → ${event.to}`,
          event.to,
          'stage_change'
        );
      });
    });

    builder.on('compaction-complete', (event: { tokensBefore: number; tokensAfter: number; method: string }) => {
      this.recordEventWithRateLimit('compaction-complete', () => {
        this.recordAutoDecision(
          `Compaction complete: ${event.tokensBefore} → ${event.tokensAfter} tokens (${event.method})`,
          this.currentStage,
          'compaction'
        );
      });
    });

    builder.on('reseed', (event: { preservedCount: number; clearedCount: number }) => {
      this.recordEventWithRateLimit('reseed', () => {
        this.recordAutoDecision(
          `Context reseed: preserved ${event.preservedCount}, cleared ${event.clearedCount} observations`,
          this.currentStage,
          'reseed'
        );
      });
    });

    builder.on('scope-violation', (event: { file: string; reason: string }) => {
      this.recordEventWithRateLimit('scope-violation', () => {
        this.saveMemory({
          category: 'auto_decision',
          content: `Scope violation: ${event.file} — ${event.reason}`,
          tags: ['#auto', '#scope-violation'],
          specId: 'system',
        });
      });
    });

    builder.on('slop-detected', (event: { count: number; specId?: string }) => {
      this.recordEventWithRateLimit('slop-detected', () => {
        this.saveMemory({
          category: 'auto_decision',
          content: `Slop detected: ${event.count} issues found`,
          tags: ['#auto', '#slop-detection'],
          specId: event.specId || 'system',
        });
      });
    });
  }

  /**
   * 019 C4: Per-event-type rate limiting (max 1 per type per 5 minutes).
   */
  private eventRateLimits: Map<string, number> = new Map();
  private static readonly EVENT_RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

  private recordEventWithRateLimit(eventType: string, action: () => void): void {
    const lastFired = this.eventRateLimits.get(eventType) || 0;
    if (Date.now() - lastFired < ContinuousMemoryWriter.EVENT_RATE_LIMIT_MS) {
      return; // Rate-limited
    }
    this.eventRateLimits.set(eventType, Date.now());
    action();
  }

  /**
   * Disconnects from the ContextBuilder.
   */
  disconnectFromContextBuilder(): void {
    if (this.connectedBuilder) {
      this.connectedBuilder.removeAllListeners('budget-warning');
      this.connectedBuilder.removeAllListeners('loading-decision');
      this.connectedBuilder.removeAllListeners('research-complete');
      this.connectedBuilder.removeAllListeners('stage-change');
      this.connectedBuilder.removeAllListeners('compaction-complete');
      this.connectedBuilder.removeAllListeners('reseed');
      this.connectedBuilder.removeAllListeners('scope-violation');
      this.connectedBuilder.removeAllListeners('slop-detected');
      this.connectedBuilder = null;
    }
    this.eventRateLimits.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Stage Transitions (T032)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Records a pipeline stage transition as a memory.
   *
   * @param fromStage - Previous stage name
   * @param toStage - New stage name
   * @param specId - The spec being worked on
   */
  async recordStageTransition(fromStage: string, toStage: string, specId: string): Promise<void> {
    this.currentStage = toStage;

    if (this.isRateLimited(toStage)) {
      return;
    }

    // Increment count before async save to prevent race conditions
    // when multiple events fire synchronously
    this.incrementSaveCount(toStage);

    await this.saveMemory({
      category: 'pipeline_stage',
      content: `Stage transition: ${fromStage} → ${toStage} for spec ${specId}`,
      tags: ['#auto', `#stage-${toStage}`, `#spec-${specId}`],
      specId,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Completions (T033)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Records a task completion as a memory.
   *
   * @param taskId - Task identifier (e.g., "T001")
   * @param specId - The spec being worked on
   * @param description - Description of what was completed
   */
  async recordTaskCompletion(taskId: string, specId: string, description: string): Promise<void> {
    if (this.isRateLimited(this.currentStage)) {
      return;
    }

    this.incrementSaveCount(this.currentStage);

    await this.saveMemory({
      category: 'task_completion',
      content: `Task ${taskId} completed: ${description}`,
      tags: ['#auto', `#stage-${this.currentStage}`, `#spec-${specId}`, `#task-${taskId}`],
      specId,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto Decisions (from ContextBuilder events)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Records an automatic decision from ContextBuilder events.
   */
  private async recordAutoDecision(
    content: string,
    stage: string,
    subCategory: string
  ): Promise<void> {
    if (this.isRateLimited(stage)) {
      return;
    }

    this.incrementSaveCount(stage);

    await this.saveMemory({
      category: 'auto_decision',
      content: `[${subCategory}] ${content}`,
      tags: ['#auto', `#stage-${stage}`, `#${subCategory}`],
      specId: 'system',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rate Limiting (T034)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Checks if the current stage has hit its rate limit.
   *
   * @param stage - Stage name to check
   * @returns true if rate limited
   */
  private isRateLimited(stage: string): boolean {
    const count = this.stageSaveCounts.get(stage) || 0;
    return count >= MAX_SAVES_PER_STAGE;
  }

  /**
   * Increments the save count for a stage.
   */
  private incrementSaveCount(stage: string): void {
    const count = this.stageSaveCounts.get(stage) || 0;
    this.stageSaveCounts.set(stage, count + 1);
  }

  /**
   * Returns the current save count for a stage (for testing).
   */
  getSaveCount(stage: string): number {
    return this.stageSaveCounts.get(stage) || 0;
  }

  /**
   * Resets rate limit counters (e.g., when starting a new pipeline run).
   */
  resetRateLimits(): void {
    this.stageSaveCounts.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Memory Persistence (T035)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Saves a memory with standard auto-save metadata.
   * All auto-saved memories are tagged with #auto and stage/spec tags.
   */
  private async saveMemory(opts: {
    category: string;
    content: string;
    tags: string[];
    specId: string;
  }): Promise<void> {
    try {
      await this.memoryManager.save({
        category: opts.category,
        tags: opts.tags,
        scope: 'local',
        content: opts.content,
        lastUsed: Date.now(),
        usedCount: 0,
        learnedFrom: opts.specId,
      });

      // T027: Record patterns in KnowledgeGraph
      if (this.knowledgeGraph && opts.category === 'pattern') {
        this.knowledgeGraph.recordPattern(opts.content.slice(0, 100), []);
      }

      // T028: Record decisions in KnowledgeGraph
      if (this.knowledgeGraph && (opts.category === 'decision' || opts.category === 'auto_decision')) {
        this.knowledgeGraph.recordDecision(opts.content.slice(0, 100), []);
      }
    } catch {
      // Silently ignore save failures — memory persistence is best-effort
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Disposal
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Disconnects from builders and clears state.
   */
  dispose(): void {
    this.disconnectFromContextBuilder();
    this.stageSaveCounts.clear();
  }
}
