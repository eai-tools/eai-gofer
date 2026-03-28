/**
 * Memory and Learning System - MemoryManager Implementation
 *
 * Provides CRUD operations and search functionality for persistent memories.
 * Local memories use JSONL append-only storage via MemoryStorage backend.
 * Global memories use VSCode globalState.
 *
 * @see contracts/memory.ts for interface definitions
 * @see MemoryStorage.ts for JSONL backend
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  type Memory,
  type MemoryType,
  type StoredMemories,
  type MemoryQuery,
  type MemorySearchResult,
  type ValidationResult,
  type MemoryManager as IMemoryManager,
  type ScoredMemory,
  type LoadByPriorityOptions,
  type LoadByPriorityResult,
} from './memory';
import {
  isValidUUID,
  isValidTimestamp,
  isValidLength,
  isValidTag,
  isValidCategory,
  ValidationError,
} from './validation';
import { validateMemory, validateStoredMemories, formatValidationErrors } from './schemaValidator';
import { Logger } from '../utils/logger';
import { telemetry } from './telemetryIntegration';
import type { ContextUsageLogger } from './ContextUsageLogger';
import { MemoryStorage } from './MemoryStorage';
import { MemoryConsolidator, type ConsolidationResult } from './MemoryConsolidator';
import { GoferURIResolver, parseGoferURI } from './memory/GoferURI';

/**
 * Current schema version for StoredMemories.
 */
const SCHEMA_VERSION = 1;

/**
 * MemoryManager implementation.
 *
 * Manages persistent memories across sessions with local and global scopes.
 */
export class MemoryManager implements IMemoryManager {
  private readonly context: vscode.ExtensionContext;
  private readonly localMemoryPath: string;
  private readonly workspaceRoot: string;
  private readonly logger: Logger;
  private usageLogger?: ContextUsageLogger;

  /** JSONL-based storage backend (replaces local.json full-rewrite) */
  private readonly storage: MemoryStorage;
  /** Memory lifecycle consolidator */
  private readonly consolidator: MemoryConsolidator;
  /** Whether JSONL storage has been initialized */
  private storageInitialized = false;

  /**
   * Creates a new MemoryManager instance.
   *
   * @param context - VSCode extension context
   * @param workspaceRoot - Workspace root directory (for local memories)
   */
  // 018: Consolidation timer and memory limits
  private consolidationTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly MAX_MEMORY_COUNT = 200;
  private static readonly CONSOLIDATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(context: vscode.ExtensionContext, workspaceRoot: string) {
    this.context = context;
    this.workspaceRoot = workspaceRoot;
    this.localMemoryPath = path.join(workspaceRoot, '.specify', 'memory', 'local.json');
    this.storage = new MemoryStorage(workspaceRoot);
    this.consolidator = new MemoryConsolidator(this.storage, workspaceRoot);
    this.logger = Logger.for('MemoryManager');
    this.logger.debug('MemoryManager initialized', {
      workspaceRoot,
      localMemoryPath: this.localMemoryPath,
    });
  }

  /**
   * 018 T025: Start periodic consolidation timer (30 min).
   * Returns the timer reference for cleanup in deactivate().
   */
  startConsolidationTimer(): ReturnType<typeof setInterval> {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
    }
    this.consolidationTimer = setInterval(async () => {
      try {
        const result = await this.consolidate();
        this.logger.info('Periodic consolidation completed', {
          merged: result.merged,
          archived: result.archived,
          decayed: result.decayed,
        });
        // T084: Extract patterns from recent pipeline runs
        const extracted = await this.consolidator.extractFromPipelineRuns();
        if (extracted > 0) {
          this.logger.info('Extracted pipeline patterns during consolidation', { extracted });
        }
      } catch (err) {
        // Non-fatal: consolidation is best-effort, will retry next cycle (NFR-018)
        this.logger.error(
          'Consolidation cycle failed, will retry next interval',
          err instanceof Error ? err : undefined,
          { error: err instanceof Error ? err.message : String(err) }
        );
      }
    }, MemoryManager.CONSOLIDATION_INTERVAL_MS);
    this.logger.info('Consolidation timer started (30 min interval)');
    return this.consolidationTimer;
  }

  /**
   * 018: Stop consolidation timer.
   */
  stopConsolidationTimer(): void {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = null;
    }
  }

  /**
   * 018 T034: BFS traversal from a memory through related links (Zettelkasten navigation).
   * Returns memories reachable within maxDepth hops.
   */
  async traverseRelated(startId: string, maxDepth: number = 3): Promise<Memory[]> {
    await this.ensureStorageReady();
    const visited = new Set<string>();
    const result: Memory[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const memory = this.storage.get(id);
      if (!memory) continue;
      if (id !== startId) result.push(memory);

      // Follow forward links (relatedMemories)
      for (const link of memory.relatedMemories || []) {
        if (!visited.has(link.memoryId)) {
          queue.push({ id: link.memoryId, depth: depth + 1 });
        }
      }
      // Follow back-references
      for (const backRef of (memory as Memory & { backReferences?: string[] }).backReferences ||
        []) {
        if (!visited.has(backRef)) {
          queue.push({ id: backRef, depth: depth + 1 });
        }
      }
    }
    return result;
  }

  /**
   * Initialize the JSONL storage backend.
   * Migrates from legacy local.json if needed.
   * T022: Also migrates pre-layered memories to layered format (schemaVersion 2).
   * Call this once after construction.
   */
  async initializeStorage(): Promise<void> {
    if (this.storageInitialized) {
      return;
    }
    try {
      await this.storage.initialize();
      this.storageInitialized = true;
      this.logger.info('JSONL storage initialized', {
        memoryCount: this.storage.count(),
      });
      // T022: Migrate pre-layered memories to schemaVersion 2
      await this.migrateToLayered();
    } catch (error) {
      this.logger.error(
        'Failed to initialize JSONL storage, falling back to legacy',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * T022: Migrate memories that lack ContextLayer fields to schemaVersion 2.
   *
   * Uses simple truncation (not LLM) for abstract/overview generation to avoid
   * blocking the extension startup on API calls.  Memories with existing layers
   * are left untouched.  The migration is idempotent.
   */
  async migrateToLayered(): Promise<number> {
    const all = this.storage.getAll('local');
    let migrated = 0;
    for (const memory of all) {
      if (!memory.layers) {
        const abstract = memory.content.slice(0, 100) + (memory.content.length > 100 ? '...' : '');
        const overview =
          memory.content.slice(0, 2000) + (memory.content.length > 2000 ? '...' : '');
        await this.storage.update(memory.id, {
          layers: {
            abstract,
            overview,
            detail: async (): Promise<string> => memory.content,
          },
        });
        migrated++;
      }
    }
    if (migrated > 0) {
      this.logger.info('Migrated memories to layered format', { count: migrated });
    }
    return migrated;
  }

  /**
   * Run memory consolidation (dedup, compact, stale detection, decay, archive).
   * Call at session end or periodically.
   */
  async consolidate(): Promise<ConsolidationResult> {
    await this.ensureStorageReady();
    return this.consolidator.consolidate();
  }

  /**
   * Get the underlying MemoryStorage for direct access (e.g., from hooks).
   */
  getStorage(): MemoryStorage {
    return this.storage;
  }

  /** Ensure JSONL storage is ready before operations */
  private async ensureStorageReady(): Promise<void> {
    if (!this.storageInitialized) {
      await this.initializeStorage();
    }
  }

  /**
   * Set the usage logger for context health tracking (Spec 012).
   *
   * @param logger - ContextUsageLogger instance
   */
  setUsageLogger(logger: ContextUsageLogger): void {
    this.usageLogger = logger;
  }

  /**
   * Save a new memory.
   *
   * @param memory - Memory data (id and created timestamp will be generated)
   * @returns The created Memory with generated id and timestamps
   * @throws Error if validation fails or storage fails
   */
  async save(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
    this.logger.debug('Saving new memory', { category: memory.category, scope: memory.scope });

    // For local scope: use JSONL storage backend
    if (memory.scope === 'local') {
      await this.ensureStorageReady();

      // Validate content fields before saving (skip id validation - JSONL generates hash IDs)
      const contentValidation = this.validateContent(memory);
      if (!contentValidation.valid) {
        this.logger.error('Memory validation failed', undefined, {
          errors: contentValidation.errors,
        });
        telemetry.trackMemoryValidationError(contentValidation.errors);
        throw new Error(`Memory validation failed: ${contentValidation.errors.join(', ')}`);
      }

      // Delegate to JSONL storage (generates hash-based ID)
      const newMemory = await this.storage.append(memory);

      // T032/018: Dual storage with rich markdown + YAML frontmatter for long memories
      if (newMemory.content.length > 500) {
        const notesDir = path.join(this.workspaceRoot, '.specify', 'memory', 'memory-notes');
        const notePath = path.join(notesDir, `${newMemory.id}.md`);
        try {
          await fsPromises.mkdir(notesDir, { recursive: true });
          // 018 T029: Rich markdown format with YAML frontmatter
          const frontmatter = [
            '---',
            `id: ${newMemory.id}`,
            `category: ${newMemory.category}`,
            `tags: [${(newMemory.tags || []).map((t: string) => `"${t}"`).join(', ')}]`,
            `created: ${new Date(newMemory.created).toISOString()}`,
            `priority: ${newMemory.priorityIndex ?? 0}`,
            `learnedFrom: ${newMemory.learnedFrom || 'unknown'}`,
            '---',
            '',
          ].join('\n');
          await fsPromises.writeFile(notePath, frontmatter + newMemory.content, 'utf-8');
          // 018 T030: Store notePath and truncate JSONL content for long memories
          const truncatedContent = newMemory.content.slice(0, 200) + '... [see markdown note]';
          await this.storage.update(newMemory.id, {
            notePath: `memory-notes/${newMemory.id}.md`,
            content: truncatedContent,
          });
          newMemory.notePath = `memory-notes/${newMemory.id}.md`;
        } catch {
          // Non-fatal: dual storage is best-effort
        }
      }

      // T033: Compute related memories via keyword overlap
      try {
        const allMemories = this.storage.getAll('local');
        if (allMemories.length > 1) {
          const recent = allMemories.slice(-20);
          const contentWords = new Set(
            newMemory.content
              .toLowerCase()
              .split(/\W+/)
              .filter((w: string) => w.length >= 3)
          );
          const scored = recent
            .filter((m) => m.id !== newMemory.id)
            .map((m) => {
              const mWords = new Set(
                m.content
                  .toLowerCase()
                  .split(/\W+/)
                  .filter((w: string) => w.length >= 3)
              );
              let intersection = 0;
              for (const w of contentWords) {
                if (mWords.has(w)) {
                  intersection++;
                }
              }
              const union = contentWords.size + mWords.size - intersection;
              let similarity = union === 0 ? 0 : intersection / union;
              // Category bonus
              if (m.category === newMemory.category) {
                similarity += 0.1;
              }
              return { memoryId: m.id, similarity };
            })
            .filter((s) => s.similarity > 0.05)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
          if (scored.length > 0) {
            await this.storage.update(newMemory.id, { relatedMemories: scored });
            newMemory.relatedMemories = scored;

            // 018 T033: Maintain bidirectional back-references
            for (const link of scored) {
              const targetMemory = this.storage.get(link.memoryId);
              if (targetMemory) {
                const backRefs: string[] =
                  (targetMemory as Memory & { backReferences?: string[] }).backReferences || [];
                if (!backRefs.includes(newMemory.id)) {
                  backRefs.push(newMemory.id);
                  await this.storage.update(link.memoryId, {
                    backReferences: backRefs,
                  } as Partial<Memory>);
                }
              }
            }
          }
        }
      } catch {
        // Non-fatal
      }

      this.logger.info('Memory saved to JSONL', {
        id: newMemory.id,
        category: newMemory.category,
        type: newMemory.type,
      });

      telemetry.trackMemorySaved(newMemory);

      if (this.usageLogger) {
        const estimatedTokens = Math.ceil(newMemory.content.length / 4);
        this.usageLogger.logMemorySave({
          memoryId: newMemory.id,
          category: newMemory.category,
          tokenEstimate: estimatedTokens,
          scope: newMemory.scope,
        });
      }

      // 018 T027/T028: Enforce MAX_MEMORY_COUNT — auto-archive lowest priority
      try {
        const count = this.storage.count();
        if (count > MemoryManager.MAX_MEMORY_COUNT) {
          const excess = count - MemoryManager.MAX_MEMORY_COUNT;
          const allLocal = this.storage.getAll('local');
          // Sort by priority (lowest first), then by lastUsed (oldest first)
          const sortedForArchive = allLocal.sort(
            (a, b) => (a.priorityIndex ?? 0) - (b.priorityIndex ?? 0) || a.lastUsed - b.lastUsed
          );
          const toArchive = sortedForArchive.slice(0, excess).map((m) => m.id);
          if (toArchive.length > 0) {
            await this.storage.archive(toArchive);
            this.logger.info('Auto-archived low-priority memories', {
              archived: toArchive.length,
              remaining: this.storage.count(),
            });
          }
        }
      } catch {
        // Non-fatal: archiving is best-effort
      }

      return newMemory;
    }

    // For global scope: keep using VSCode globalState
    const newMemory: Memory = {
      id: uuidv4(),
      created: Date.now(),
      ...memory,
    };

    const validation = this.validate(newMemory);
    if (!validation.valid) {
      this.logger.error('Memory validation failed', undefined, { errors: validation.errors });
      telemetry.trackMemoryValidationError(validation.errors);
      throw new Error(`Memory validation failed: ${validation.errors.join(', ')}`);
    }

    await this.saveGlobal(newMemory);

    this.logger.info('Memory saved to globalState', {
      id: newMemory.id,
      category: newMemory.category,
    });

    telemetry.trackMemorySaved(newMemory);

    if (this.usageLogger) {
      const estimatedTokens = Math.ceil(newMemory.content.length / 4);
      this.usageLogger.logMemorySave({
        memoryId: newMemory.id,
        category: newMemory.category,
        tokenEstimate: estimatedTokens,
        scope: newMemory.scope,
      });
    }

    return newMemory;
  }

  /**
   * Search for memories matching query criteria.
   *
   * @param query - Search parameters (all optional)
   * @returns Search result with matching memories and metadata
   */
  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    this.logger.debug('Searching memories', { query });
    const startTime = Date.now();

    const scope = query.scope || 'both';

    // Use JSONL storage index for local memories (fast in-memory query)
    let results: Memory[] = [];
    if (scope === 'local' || scope === 'both') {
      await this.ensureStorageReady();
      results.push(...this.storage.query(query));
    }
    if (scope === 'global' || scope === 'both') {
      // Global memories: load and filter in-memory (legacy path)
      let globalMemories = await this.loadGlobal();
      if (query.excludeSystemMemories) {
        globalMemories = globalMemories.filter(
          (m) => Array.isArray(m.tags) && !m.tags.includes('#auto')
        );
      }
      if (query.keywords) {
        const keywords = query.keywords.toLowerCase();
        globalMemories = globalMemories.filter(
          (m) =>
            m.content.toLowerCase().includes(keywords) ||
            m.category.toLowerCase().includes(keywords)
        );
      }
      if (query.category) {
        globalMemories = globalMemories.filter((m) => m.category === query.category);
      }
      if (query.tags && query.tags.length > 0) {
        globalMemories = globalMemories.filter((m) =>
          query.tags!.some((tag) => m.tags.includes(tag))
        );
      }
      if (query.type) {
        globalMemories = globalMemories.filter((m) => m.type === query.type);
      }
      if (query.dateRange) {
        globalMemories = globalMemories.filter(
          (m) => m.created >= query.dateRange!.start && m.created <= query.dateRange!.end
        );
      }
      if (query.excludeStale) {
        globalMemories = globalMemories.filter((m) => !m.stale);
      }
      results.push(...globalMemories);
    }

    // Calculate scores and sort by priority if requested
    let scoredMemories: ScoredMemory[] | undefined;
    if (query.sortByPriority || query.includeRelevanceScores) {
      scoredMemories = results.map((m) => {
        const priorityScore = this.calculatePriorityScore(m);
        const relevanceScore = query.taskContext
          ? this.calculateRelevanceScore(m, query.taskContext)
          : undefined;
        const combinedScore =
          relevanceScore !== undefined ? priorityScore * 0.4 + relevanceScore * 0.6 : priorityScore;

        return {
          ...m,
          priorityScore,
          relevanceScore,
          combinedScore,
        };
      });

      // Sort by combined score descending
      scoredMemories.sort((a, b) => b.combinedScore - a.combinedScore);

      // Update results to match sorted order
      results = scoredMemories.map((sm) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { priorityScore, relevanceScore, combinedScore, ...memory } = sm;
        return memory;
      });
    }

    const searchTime = Date.now() - startTime;
    this.logger.info('Memory search completed', { count: results.length, searchTime });

    // Track memory search
    telemetry.trackMemorySearch(query, results.length, searchTime);

    // Log to context usage logger (Spec 012)
    if (this.usageLogger) {
      const totalTokens = results.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
      this.usageLogger.logMemorySearch({
        queryKeywords: query.keywords,
        queryCategory: query.category,
        resultCount: results.length,
        totalTokensReturned: totalTokens,
        searchTimeMs: searchTime,
      });
    }

    return {
      memories: results,
      count: results.length,
      searchTime,
      scoredMemories,
    };
  }

  /**
   * Delete a memory by ID.
   *
   * @param id - UUID of memory to delete
   * @throws Error if memory not found
   */
  async forget(id: string): Promise<void> {
    this.logger.debug('Forgetting memory', { id });

    // Try JSONL storage first (local memories)
    await this.ensureStorageReady();
    const removed = await this.storage.remove(id);
    if (removed) {
      this.logger.info('Memory deleted from JSONL storage', { id });
      telemetry.trackMemoryForgotten(id, 'local');
      return;
    }

    // Try global memories (VSCode globalState)
    const globalMemories = await this.loadGlobal();
    const globalIndex = globalMemories.findIndex((m) => m.id === id);

    if (globalIndex !== -1) {
      globalMemories.splice(globalIndex, 1);
      await this.saveGlobalBatch(globalMemories);
      this.logger.info('Memory deleted from global storage', { id });
      telemetry.trackMemoryForgotten(id, 'global');
      return;
    }

    this.logger.warn('Memory not found', undefined, new Error(`Memory not found: ${id}`));
    throw new Error(`Memory not found: ${id}`);
  }

  /**
   * Clear memories by scope.
   *
   * @param scope - Which memories to clear: local, global, or all
   * @returns Count of memories deleted
   */
  async clear(scope: 'local' | 'global' | 'all'): Promise<number> {
    let count = 0;

    if (scope === 'local' || scope === 'all') {
      await this.ensureStorageReady();
      const allLocal = this.storage.getAll('local');
      for (const mem of allLocal) {
        await this.storage.remove(mem.id);
      }
      count += allLocal.length;
    }

    if (scope === 'global' || scope === 'all') {
      const globalMemories = await this.loadGlobal();
      count += globalMemories.length;
      await this.saveGlobalBatch([]);
    }

    return count;
  }

  /**
   * Load all memories for a given scope.
   *
   * @param scope - Which memories to load (defaults to 'both')
   * @returns Array of Memory objects
   */
  async load(scope: 'local' | 'global' | 'both' = 'both'): Promise<Memory[]> {
    const startTime = Date.now();
    const memories: Memory[] = [];

    if (scope === 'local' || scope === 'both') {
      await this.ensureStorageReady();
      memories.push(...this.storage.getAll('local'));
    }

    if (scope === 'global' || scope === 'both') {
      memories.push(...(await this.loadGlobal()));
    }

    // Log to context usage logger (Spec 012)
    if (this.usageLogger) {
      const loadTimeMs = Date.now() - startTime;
      const totalTokens = memories.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
      this.usageLogger.logMemoryLoad({
        scope,
        memoriesLoaded: memories.length,
        totalTokensLoaded: totalTokens,
        loadTimeMs,
      });
    }

    return memories;
  }

  /**
   * 019 C2: Usage reason types for audit logging.
   */
  static readonly UsageReasons = [
    'context_load',
    'user_recall',
    'search_match',
    'consolidation',
  ] as const;

  /**
   * Update usage statistics for a memory.
   * Increments usedCount and updates lastUsed timestamp.
   *
   * 019 C2: Expanded with optional reason and source for audit logging.
   *
   * @param id - UUID of memory to update
   * @param reason - Why the memory was used (optional, backward compatible)
   * @param source - Where the usage originated (optional)
   */
  async recordUsage(
    id: string,
    reason?: (typeof MemoryManager.UsageReasons)[number],
    source?: string
  ): Promise<void> {
    // Try JSONL storage first (local memories)
    await this.ensureStorageReady();
    const localMemory = this.storage.get(id);

    if (localMemory) {
      await this.storage.update(id, {
        usedCount: (localMemory.usedCount ?? 0) + 1,
        lastUsed: Date.now(),
      });

      // 019 C2: Log usage with reason and source for audit
      if (reason) {
        this.logUsageAudit(id, reason, source);
      }
      return;
    }

    // Try global memories (VSCode globalState)
    const globalMemories = await this.loadGlobal();
    const globalMemory = globalMemories.find((m) => m.id === id);

    if (globalMemory) {
      globalMemory.usedCount++;
      globalMemory.lastUsed = Date.now();
      await this.saveGlobalBatch(globalMemories);
      if (reason) {
        this.logUsageAudit(id, reason, source);
      }
      return;
    }

    throw new Error(`Memory not found: ${id}`);
  }

  /**
   * 019 C2: Log memory usage to audit JSONL file.
   */
  private logUsageAudit(id: string, reason: string, source?: string): void {
    try {
      const logDir = path.join(this.workspaceRoot, '.specify', 'logs');
      const logPath = path.join(logDir, 'memory-usage-audit.jsonl');
      const entry = {
        timestamp: new Date().toISOString(),
        memoryId: id,
        reason,
        source: source || 'unknown',
      };
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    } catch {
      // Best-effort audit logging
    }
  }

  /**
   * Validate a Memory object against schema rules.
   *
   * @param memory - Memory to validate
   * @returns Validation result with errors if any
   */
  validate(memory: Partial<Memory>): ValidationResult {
    const errors: string[] = [];

    // ID validation
    if (memory.id && !isValidUUID(memory.id)) {
      errors.push('Invalid UUID format for id');
    }

    // Category validation
    if (memory.category === undefined) {
      errors.push('Category is required');
    } else {
      if (!isValidLength(memory.category, 1, 100)) {
        errors.push('Category must be 1-100 characters');
      }
      if (memory.category && !isValidCategory(memory.category)) {
        errors.push('Invalid category format (must be alphanumeric with - or _)');
      }
    }

    // Tags validation
    if (memory.tags) {
      if (!Array.isArray(memory.tags)) {
        errors.push('Tags must be an array');
      } else {
        if (memory.tags.length > 20) {
          errors.push('Maximum 20 tags allowed');
        }
        for (const tag of memory.tags) {
          if (!isValidTag(tag)) {
            errors.push(
              `Invalid tag format: ${tag} (must start with # and contain only alphanumeric, -, _)`
            );
          }
        }
      }
    }

    // Scope validation
    if (memory.scope && memory.scope !== 'local' && memory.scope !== 'global') {
      errors.push('Scope must be "local" or "global"');
    }

    // Content validation
    if (memory.content === undefined) {
      errors.push('Content is required');
    } else if (!isValidLength(memory.content, 1, 10000)) {
      errors.push('Content must be 1-10,000 characters');
    }

    // Timestamp validation
    if (memory.created && !isValidTimestamp(memory.created)) {
      errors.push('Invalid created timestamp');
    }
    if (memory.lastUsed && !isValidTimestamp(memory.lastUsed)) {
      errors.push('Invalid lastUsed timestamp');
    }

    // UsedCount validation
    if (memory.usedCount !== undefined && memory.usedCount < 0) {
      errors.push('UsedCount must be >= 0');
    }

    // LearnedFrom validation
    if (memory.learnedFrom) {
      if (!isValidLength(memory.learnedFrom, 1, 200)) {
        errors.push('LearnedFrom must be 1-200 characters');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate content fields of a memory (without id validation).
   * Used for pre-save validation when the storage backend will generate the ID.
   */
  private validateContent(memory: Omit<Memory, 'id' | 'created'>): ValidationResult {
    const errors: string[] = [];

    if (memory.category === undefined) {
      errors.push('Category is required');
    } else {
      if (!isValidLength(memory.category, 1, 100)) {
        errors.push('Category must be 1-100 characters');
      }
      if (memory.category && !isValidCategory(memory.category)) {
        errors.push('Invalid category format (must be alphanumeric with - or _)');
      }
    }

    if (memory.tags) {
      if (!Array.isArray(memory.tags)) {
        errors.push('Tags must be an array');
      } else {
        if (memory.tags.length > 20) {
          errors.push('Maximum 20 tags allowed');
        }
        for (const tag of memory.tags) {
          if (!isValidTag(tag)) {
            errors.push(`Invalid tag format: ${tag}`);
          }
        }
      }
    }

    if (memory.scope && memory.scope !== 'local' && memory.scope !== 'global') {
      errors.push('Scope must be "local" or "global"');
    }

    if (memory.content === undefined) {
      errors.push('Content is required');
    } else if (!isValidLength(memory.content, 1, 10000)) {
      errors.push('Content must be 1-10,000 characters');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Suggest saving a memory based on pattern detection.
   * Called when user explains the same concept multiple times.
   *
   * @param content - Proposed memory content
   * @param context - Context about why suggestion is made
   * @returns Suggested Memory object (not yet saved)
   */
  suggestMemory(
    content: string,
    context: {
      category: string;
      tags: string[];
      learnedFrom: string;
    }
  ): Memory {
    return {
      id: uuidv4(),
      category: context.category,
      tags: context.tags,
      scope: 'local', // Default to local scope for suggestions
      content,
      created: Date.now(),
      lastUsed: Date.now(),
      usedCount: 0,
      learnedFrom: context.learnedFrom,
    };
  }

  /**
   * Load memories sorted by priority with optional relevance scoring.
   *
   * Priority is calculated from usage patterns (usedCount, lastUsed, created).
   * Relevance is calculated against optional task context.
   *
   * @param options - Loading options including limit, taskContext, weights
   * @returns Scored and ranked memories
   */
  async loadByPriority(options: LoadByPriorityOptions = {}): Promise<LoadByPriorityResult> {
    const startTime = Date.now();
    const {
      limit = 10,
      taskContext,
      priorityWeight = 0.4,
      relevanceWeight = 0.6,
      minScore = 0,
      scope = 'both',
    } = options;

    this.logger.debug('Loading memories by priority', { limit, hasTaskContext: !!taskContext });

    // Load all memories from requested scope
    const memories = await this.load(scope);
    const totalConsidered = memories.length;

    // Calculate scores for each memory
    let scoredMemories: ScoredMemory[] = memories.map((m) => {
      const priorityScore = this.calculatePriorityScore(m);
      const relevanceScore = taskContext ? this.calculateRelevanceScore(m, taskContext) : 0;

      // Combined score with configurable weights
      const combinedScore = taskContext
        ? priorityScore * priorityWeight + relevanceScore * relevanceWeight
        : priorityScore;

      return {
        ...m,
        priorityScore,
        relevanceScore: taskContext ? relevanceScore : undefined,
        combinedScore,
      };
    });

    // Sort by combined score descending
    scoredMemories.sort((a, b) => b.combinedScore - a.combinedScore);

    // Filter by minimum score if specified
    const filtered = minScore > 0;
    if (filtered) {
      scoredMemories = scoredMemories.filter((m) => m.combinedScore >= minScore);
    }

    // Apply limit
    scoredMemories = scoredMemories.slice(0, limit);

    const loadTime = Date.now() - startTime;
    this.logger.info('Loaded memories by priority', {
      returned: scoredMemories.length,
      totalConsidered,
      loadTime,
    });

    return {
      memories: scoredMemories,
      totalConsidered,
      loadTime,
      filtered,
    };
  }

  /**
   * Calculate priority score for a memory (0-100).
   *
   * Factors:
   * - Usage frequency (usedCount): 40% - more uses = higher priority
   * - Recency (lastUsed): 35% - recently used = higher priority
   * - Age bonus (older memories that are still used): 25%
   *
   * @param memory - Memory to score
   * @returns Priority score 0-100
   */
  calculatePriorityScore(memory: Memory): number {
    const now = Date.now();

    // Usage frequency score (0-100)
    // Uses logarithmic scale: usedCount of 10 = ~60, 50 = ~85, 100 = ~100
    const usageScore = Math.min(100, Math.log10(memory.usedCount + 1) * 50);

    // Recency score (0-100)
    // Full score if used within last day, decays over 30 days
    const daysSinceLastUsed = (now - memory.lastUsed) / (24 * 60 * 60 * 1000);
    const recencyScore = Math.max(0, 100 - (daysSinceLastUsed / 30) * 100);

    // Age bonus score (0-100)
    // Older memories that are still actively used get a bonus
    // Full bonus at 90+ days old with usage, scaled by usedCount
    const daysOld = (now - memory.created) / (24 * 60 * 60 * 1000);
    const ageBonus =
      memory.usedCount > 0
        ? Math.min(100, (daysOld / 90) * 100 * Math.min(1, memory.usedCount / 5))
        : 0;

    // Combined weighted score
    const score = usageScore * 0.4 + recencyScore * 0.35 + ageBonus * 0.25;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Calculate relevance score of memory against task context (0-100).
   *
   * Uses keyword matching with TF-IDF-like weighting.
   *
   * @param memory - Memory to score
   * @param taskContext - Task description to match against
   * @returns Relevance score 0-100
   */
  calculateRelevanceScore(memory: Memory, taskContext: string): number {
    if (!taskContext || taskContext.trim().length === 0) {
      return 0;
    }

    // Extract keywords from task context (stopwords removed)
    const taskKeywords = this.extractKeywords(taskContext);
    if (taskKeywords.length === 0) {
      return 0;
    }

    // Combine memory content, category, and tags for matching
    const memoryText =
      `${memory.content} ${memory.category} ${memory.tags.join(' ')}`.toLowerCase();
    const memoryKeywords = this.extractKeywords(memoryText);

    // Calculate keyword overlap
    let matchCount = 0;
    let weightedMatchScore = 0;

    for (const taskKeyword of taskKeywords) {
      if (memoryKeywords.includes(taskKeyword)) {
        matchCount++;
        // Longer keywords are more significant
        weightedMatchScore += Math.min(1, taskKeyword.length / 6);
      } else {
        // Partial match bonus (prefix matching)
        const partialMatch = memoryKeywords.find(
          (mk) => mk.startsWith(taskKeyword) || taskKeyword.startsWith(mk)
        );
        if (partialMatch) {
          matchCount += 0.5;
          weightedMatchScore += 0.3;
        }
      }
    }

    // Calculate base score from match ratio
    const matchRatio = matchCount / taskKeywords.length;
    const baseScore = matchRatio * 70; // Max 70 from keyword matching

    // Bonus for weighted matches
    const weightBonus = Math.min(30, weightedMatchScore * 10);

    // Category match bonus
    const categoryBonus = taskContext.toLowerCase().includes(memory.category.toLowerCase())
      ? 10
      : 0;

    const score = baseScore + weightBonus + categoryBonus;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Extract keywords from text for relevance scoring.
   *
   * Removes stopwords, normalizes case, and filters short words.
   *
   * @param text - Text to extract keywords from
   * @returns Array of lowercase keywords
   */
  private extractKeywords(text: string): string[] {
    const stopwords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'be',
      'been',
      'are',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'i',
      'we',
      'you',
      'they',
      'he',
      'she',
      'them',
      'their',
      'our',
      'your',
      'my',
      'me',
      'us',
      'him',
      'her',
      'who',
      'what',
      'which',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'not',
      'only',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'also',
      'now',
      'here',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s#-]/g, ' ') // Keep alphanumeric, spaces, #, -
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index); // Deduplicate
  }

  /**
   * Load local memories from file.
   *
   * @returns Array of local Memory objects
   */
  private async loadLocal(): Promise<Memory[]> {
    try {
      if (!fs.existsSync(this.localMemoryPath)) {
        return [];
      }

      const data = fs.readFileSync(this.localMemoryPath, 'utf-8');
      const stored: StoredMemories = JSON.parse(data);

      // Validate schema
      if (!validateStoredMemories(stored)) {
        const errors = formatValidationErrors(validateStoredMemories.errors);
        throw new Error(`Invalid local memory file: ${errors}`);
      }

      return stored.memories;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Load global memories from VSCode globalState.
   *
   * @returns Array of global Memory objects
   */
  private async loadGlobal(): Promise<Memory[]> {
    const stored = this.context.globalState.get<StoredMemories>('gofer.memories');

    if (!stored) {
      return [];
    }

    // Validate schema
    if (!validateStoredMemories(stored)) {
      const errors = formatValidationErrors(validateStoredMemories.errors);
      throw new Error(`Invalid global memory data: ${errors}`);
    }

    return stored.memories;
  }

  /**
   * Save a single local memory.
   *
   * @param memory - Memory to save
   */
  private async saveLocal(memory: Memory): Promise<void> {
    const memories = await this.loadLocal();
    memories.push(memory);
    await this.saveLocalBatch(memories);
  }

  /**
   * Save a single global memory.
   *
   * @param memory - Memory to save
   */
  private async saveGlobal(memory: Memory): Promise<void> {
    const memories = await this.loadGlobal();
    memories.push(memory);
    await this.saveGlobalBatch(memories);
  }

  /**
   * Save batch of local memories to file.
   *
   * @param memories - Array of memories to save
   */
  private async saveLocalBatch(memories: Memory[]): Promise<void> {
    const stored: StoredMemories = {
      version: SCHEMA_VERSION,
      memories,
    };

    // Ensure directory exists
    const dir = path.dirname(this.localMemoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.localMemoryPath, JSON.stringify(stored, null, 2));
  }

  /**
   * Save batch of global memories to VSCode globalState.
   *
   * @param memories - Array of memories to save
   */
  private async saveGlobalBatch(memories: Memory[]): Promise<void> {
    const stored: StoredMemories = {
      version: SCHEMA_VERSION,
      memories,
    };

    await this.context.globalState.update('gofer.memories', stored);
  }

  /**
   * Load memories by gofer:// URI with optional layer selection.
   * T019: URI-based memory loading with scope mapping.
   * T020: Layer selection logic (L0/L1/L2).
   *
   * @param uriString - gofer:// URI (e.g., gofer://memory/core/task-context.md)
   * @param layer - Which layer to load (default: 'overview')
   * @returns Array of memories matching the URI scope
   */
  async loadByURI(
    uriString: string,
    layer: 'abstract' | 'overview' | 'detail' = 'overview'
  ): Promise<Memory[]> {
    const parsed = parseGoferURI(uriString);

    let memories: Memory[];

    switch (parsed.scope) {
      case 'memory': {
        await this.ensureStorageReady();
        memories = this.storage.getAll('local');
        break;
      }
      case 'specs':
        return [];
      case 'session': {
        await this.ensureStorageReady();
        const all = this.storage.getAll('local');
        memories = all.filter((m) => m.learnedFrom === parsed.path);
        break;
      }
      case 'user': {
        memories = await this.loadGlobal();
        break;
      }
      case 'agent':
        return [];
      default:
        return [];
    }

    switch (layer) {
      case 'abstract':
        return memories.filter((m) => m.layers?.abstract !== undefined);
      case 'overview':
        return memories.filter(
          (m) => m.layers?.overview !== undefined || m.layers?.abstract !== undefined
        );
      case 'detail':
        return memories;
    }
  }

  /**
   * T100 (US-P3-02): Save a memory immediately (foreground write).
   * For #real-time tagged memories that must persist before continuing.
   */
  async saveImmediate(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
    await this.ensureStorageReady();
    return this.storage.append(memory);
  }

  /** T104: In-memory transient state store (not persisted to disk) */
  private readonly transientStore = new Map<string, unknown>();

  /** T103: Store transient (non-persistent) session state */
  setTransient(key: string, value: unknown): void {
    this.transientStore.set(key, value);
  }

  /** T103: Retrieve transient session state */
  getTransient(key: string): unknown {
    return this.transientStore.get(key);
  }

  /** T103: Clear transient state (key = specific key, undefined = clear all) */
  clearTransient(key?: string): void {
    if (key !== undefined) {
      this.transientStore.delete(key);
    } else {
      this.transientStore.clear();
    }
  }
}
