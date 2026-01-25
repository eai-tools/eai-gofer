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

    const searchTime = Date.now() - startTime;
    this.logger.info('Memory search completed', { count: results.length, searchTime });

    // Track memory search
    telemetry.trackMemorySearch(query, results.length, searchTime);

    return {
      memories: results,
      count: results.length,
      searchTime,
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
    const memories: Memory[] = [];

    if (scope === 'local' || scope === 'both') {
      memories.push(...(await this.loadLocal()));
    }

    if (scope === 'global' || scope === 'both') {
      memories.push(...(await this.loadGlobal()));
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

  // ============================================================================
  // Private Methods
  // ============================================================================

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
