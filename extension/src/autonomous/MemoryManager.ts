/**
 * Memory and Learning System - MemoryManager Implementation
 *
 * Provides CRUD operations and search functionality for persistent memories.
 * Handles storage to both local files (.specify/memory/local.json) and VSCode globalState.
 *
 * @see contracts/memory.ts for interface definitions
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  type Memory,
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
  private readonly logger: Logger;
  private usageLogger?: ContextUsageLogger;

  /**
   * Creates a new MemoryManager instance.
   *
   * @param context - VSCode extension context
   * @param workspaceRoot - Workspace root directory (for local memories)
   */
  constructor(context: vscode.ExtensionContext, workspaceRoot: string) {
    this.context = context;
    this.localMemoryPath = path.join(workspaceRoot, '.specify', 'memory', 'local.json');
    this.logger = Logger.for('MemoryManager');
    this.logger.debug('MemoryManager initialized', {
      workspaceRoot,
      localMemoryPath: this.localMemoryPath,
    });
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

    // Generate ID and timestamps
    const newMemory: Memory = {
      id: uuidv4(),
      created: Date.now(),
      ...memory,
    };

    // Validate the complete memory
    const validation = this.validate(newMemory);
    if (!validation.valid) {
      this.logger.error('Memory validation failed', undefined, { errors: validation.errors });
      telemetry.trackMemoryValidationError(validation.errors);
      throw new Error(`Memory validation failed: ${validation.errors.join(', ')}`);
    }

    // Save to appropriate storage based on scope
    if (newMemory.scope === 'local') {
      await this.saveLocal(newMemory);
    } else {
      await this.saveGlobal(newMemory);
    }

    this.logger.info('Memory saved successfully', {
      id: newMemory.id,
      category: newMemory.category,
      scope: newMemory.scope,
    });

    // Track memory creation
    telemetry.trackMemorySaved(newMemory);

    // Log to context usage logger (Spec 012)
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

    // Load memories from requested scope
    const scope = query.scope || 'both';
    const memories = await this.load(scope);

    // Apply filters
    let results = memories;

    // Keyword filter (case-insensitive, matches content + category)
    if (query.keywords) {
      const keywords = query.keywords.toLowerCase();
      results = results.filter(
        (m) =>
          m.content.toLowerCase().includes(keywords) || m.category.toLowerCase().includes(keywords)
      );
    }

    // Category filter (exact match)
    if (query.category) {
      results = results.filter((m) => m.category === query.category);
    }

    // Tags filter (OR logic: match any tag)
    if (query.tags && query.tags.length > 0) {
      results = results.filter((m) => query.tags!.some((tag) => m.tags.includes(tag)));
    }

    // Date range filter
    if (query.dateRange) {
      results = results.filter(
        (m) => m.created >= query.dateRange!.start && m.created <= query.dateRange!.end
      );
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

    // Try local memories first
    const localMemories = await this.loadLocal();
    const localIndex = localMemories.findIndex((m) => m.id === id);

    if (localIndex !== -1) {
      localMemories.splice(localIndex, 1);
      await this.saveLocalBatch(localMemories);
      this.logger.info('Memory deleted from local storage', { id });
      telemetry.trackMemoryForgotten(id, 'local');
      return;
    }

    // Try global memories
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
      const localMemories = await this.loadLocal();
      count += localMemories.length;
      await this.saveLocalBatch([]);
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
      memories.push(...(await this.loadLocal()));
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
   * Update usage statistics for a memory.
   * Increments usedCount and updates lastUsed timestamp.
   *
   * @param id - UUID of memory to update
   */
  async recordUsage(id: string): Promise<void> {
    // Try local memories first
    const localMemories = await this.loadLocal();
    const localMemory = localMemories.find((m) => m.id === id);

    if (localMemory) {
      localMemory.usedCount++;
      localMemory.lastUsed = Date.now();
      await this.saveLocalBatch(localMemories);
      return;
    }

    // Try global memories
    const globalMemories = await this.loadGlobal();
    const globalMemory = globalMemories.find((m) => m.id === id);

    if (globalMemory) {
      globalMemory.usedCount++;
      globalMemory.lastUsed = Date.now();
      await this.saveGlobalBatch(globalMemories);
      return;
    }

    throw new Error(`Memory not found: ${id}`);
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
}
