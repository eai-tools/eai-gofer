/**
 * Memory and Learning System - Memory Contracts
 *
 * Defines interfaces for Memory entity and MemoryManager service.
 * These contracts specify the API for persistent memory storage across sessions.
 *
 * @see data-model.md for detailed entity schemas
 */

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Represents a single learned piece of information that persists across sessions.
 *
 * Memories can be scoped locally (project-specific) or globally (user-wide).
 * They include metadata for search, categorization, and usage tracking.
 */
export interface Memory {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Category for grouping related memories (e.g., "api_patterns", "preferences") */
  category: string;

  /** Array of tags for categorization (each starts with #) */
  tags: string[];

  /** Scope determines visibility: local=project-specific, global=user-wide */
  scope: 'local' | 'global';

  /** User-provided content (1-10,000 characters) */
  content: string;

  /** Creation timestamp (Unix milliseconds) */
  created: number;

  /** Last usage timestamp (Unix milliseconds) */
  lastUsed: number;

  /** Count of times this memory has been loaded */
  usedCount: number;

  /** Source: spec-id (e.g., "005-auth") or "user_interaction" */
  learnedFrom: string;
}

/**
 * Storage format for persisted memories.
 * Includes version for schema migrations.
 */
export interface StoredMemories {
  /** Schema version for migrations */
  version: number;

  /** Array of memory objects */
  memories: Memory[];
}

// ============================================================================
// Query Interfaces
// ============================================================================

/**
 * Query parameters for searching memories.
 * All fields are optional; empty query returns all memories.
 */
export interface MemoryQuery {
  /** Keyword search (case-insensitive, matches content + category) */
  keywords?: string;

  /** Exact category match */
  category?: string;

  /** Array of tags to filter by (OR logic: match any tag) */
  tags?: string[];

  /** Scope filter: local, global, or both */
  scope?: 'local' | 'global' | 'both';

  /** Date range filter (Unix milliseconds) */
  dateRange?: {
    start: number;
    end: number;
  };
}

/**
 * Result of a memory search operation.
 */
export interface MemorySearchResult {
  /** Matching memories */
  memories: Memory[];

  /** Total count of matches */
  count: number;

  /** Search execution time in milliseconds */
  searchTime: number;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Result of validating a Memory object.
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Array of error messages (empty if valid) */
  errors: string[];
}

// ============================================================================
// Service Interface
// ============================================================================

/**
 * MemoryManager service interface.
 *
 * Provides CRUD operations and search functionality for memories.
 * Handles persistence to both local files and VSCode globalState.
 */
export interface MemoryManager {
  /**
   * Save a new memory.
   *
   * @param memory - Memory data (id and created timestamp will be generated)
   * @returns The created Memory with generated id and timestamps
   * @throws Error if validation fails or storage fails
   */
  save(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory>;

  /**
   * Search for memories matching query criteria.
   *
   * @param query - Search parameters (all optional)
   * @returns Search result with matching memories and metadata
   */
  search(query: MemoryQuery): Promise<MemorySearchResult>;

  /**
   * Delete a memory by ID.
   *
   * @param id - UUID of memory to delete
   * @throws Error if memory not found
   */
  forget(id: string): Promise<void>;

  /**
   * Clear memories by scope.
   *
   * @param scope - Which memories to clear: local, global, or all
   * @returns Count of memories deleted
   */
  clear(scope: 'local' | 'global' | 'all'): Promise<number>;

  /**
   * Load all memories for a given scope.
   *
   * @param scope - Which memories to load (defaults to 'both')
   * @returns Array of Memory objects
   */
  load(scope?: 'local' | 'global' | 'both'): Promise<Memory[]>;

  /**
   * Update usage statistics for a memory.
   * Increments usedCount and updates lastUsed timestamp.
   *
   * @param id - UUID of memory to update
   */
  recordUsage(id: string): Promise<void>;

  /**
   * Validate a Memory object against schema rules.
   *
   * @param memory - Memory to validate
   * @returns Validation result with errors if any
   */
  validate(memory: Partial<Memory>): ValidationResult;

  /**
   * Suggest saving a memory based on pattern detection.
   * Called when user explains the same concept multiple times.
   *
   * @param content - Proposed memory content
   * @param context - Context about why suggestion is made
   * @returns Suggested Memory object (not yet saved)
   */
  suggestMemory(content: string, context: {
    category: string;
    tags: string[];
    learnedFrom: string;
  }): Memory;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by MemoryManager.
 * Can be subscribed to for UI updates or logging.
 */
export interface MemoryEvents {
  /** Emitted when a new memory is created */
  onMemoryCreated: (memory: Memory) => void;

  /** Emitted when a memory is deleted */
  onMemoryDeleted: (id: string) => void;

  /** Emitted when a memory is used */
  onMemoryUsed: (id: string, usedCount: number) => void;

  /** Emitted when memories are cleared */
  onMemoriesCleared: (scope: string, count: number) => void;
}
