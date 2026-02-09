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

  /** Memory type for cognitive classification */
  type?: MemoryType;

  /** Structured source provenance */
  source?: MemorySource;

  /** Code citations with change detection */
  citations?: Citation[];

  /** Confidence level 0-100 */
  confidence?: number;

  /** Priority index (higher = surfaced first, incremented on use/update) */
  priorityIndex?: number;

  /** Whether cited files have changed since creation */
  stale?: boolean;

  /** ID of original memory if this is a semantic compaction */
  compactedFrom?: string;

  /** Agent that created this memory (for multi-agent provenance) */
  agentId?: string;

  /** T032: Path to companion markdown file for long memories (content > 500 chars) */
  notePath?: string;

  /** T033: Top 3 related memory IDs with similarity scores */
  relatedMemories?: Array<{ memoryId: string; similarity: number }>;
}

// ============================================================================
// Memory Types
// ============================================================================

/** Cognitive memory type classification */
export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'prospective' | 'decision';

/** Source provenance for a memory */
export interface MemorySource {
  specId?: string;
  taskId?: string;
  files?: string[];
  sessionId?: string;
  agentId?: string;
}

/** Code citation with change detection */
export interface Citation {
  file: string;
  line?: number;
  snippet?: string;
  hash?: string;
}

/**
 * Episodic memory — what happened during a session.
 * Records session outcomes, approaches tried, and temporal context.
 */
export interface EpisodicMemory extends Memory {
  type: 'episodic';
  /** Session outcome */
  sessionOutcome?: 'success' | 'partial' | 'failed' | 'abandoned';
  /** What approach was tried */
  approach?: string;
  /** Session duration in seconds */
  duration?: number;
  /** Number of turns the task took */
  turnsUsed?: number;
}

/**
 * Procedural memory — how to do things.
 * Patterns, templates, and step-by-step procedures that worked.
 */
export interface ProceduralMemory extends Memory {
  type: 'procedural';
  /** Step-by-step procedure */
  steps?: string[];
  /** Conditions when this pattern applies */
  applicableWhen?: string;
  /** File glob patterns this applies to */
  filePatterns?: string[];
}

/**
 * Prospective memory — what needs to happen next.
 * Deferred TODOs, follow-ups, technical debt items.
 */
export interface ProspectiveMemory extends Memory {
  type: 'prospective';
  /** When to surface this memory */
  triggerCondition?: string;
  /** Optional deadline (Unix ms) */
  deadline?: number;
  /** Whether this TODO has been completed */
  resolved?: boolean;
}

/** Union type of all typed memories */
export type TypedMemory = EpisodicMemory | ProceduralMemory | ProspectiveMemory | Memory;

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

  /** Filter by memory type */
  type?: MemoryType;

  /** Date range filter (Unix milliseconds) */
  dateRange?: {
    start: number;
    end: number;
  };

  /** Sort results by priority (default: false) */
  sortByPriority?: boolean;

  /** Include relevance scores in results (default: false) */
  includeRelevanceScores?: boolean;

  /** Task context for relevance scoring */
  taskContext?: string;

  /** Filter by agent ID (for multi-agent provenance) */
  agentId?: string;

  /** Exclude stale memories */
  excludeStale?: boolean;
}

/**
 * Memory with calculated scores for ranking.
 */
export interface ScoredMemory extends Memory {
  /** Calculated priority score (0-100) based on usage patterns */
  priorityScore: number;

  /** Relevance score against task context (0-100) */
  relevanceScore?: number;

  /** Combined score for ranking (priority * relevanceWeight + relevance) */
  combinedScore: number;
}

/**
 * Options for loading memories by priority.
 */
export interface LoadByPriorityOptions {
  /** Maximum number of memories to return */
  limit?: number;

  /** Include task context for relevance scoring */
  taskContext?: string;

  /** Weight for priority score (0-1, default 0.4) */
  priorityWeight?: number;

  /** Weight for relevance score (0-1, default 0.6) */
  relevanceWeight?: number;

  /** Minimum combined score threshold (0-100) */
  minScore?: number;

  /** Scope filter */
  scope?: 'local' | 'global' | 'both';
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

  /** Scored memories when sortByPriority or includeRelevanceScores is true */
  scoredMemories?: ScoredMemory[];
}

/**
 * Result of priority-based memory loading.
 */
export interface LoadByPriorityResult {
  /** Scored and ranked memories */
  memories: ScoredMemory[];

  /** Total memories considered */
  totalConsidered: number;

  /** Load execution time in milliseconds */
  loadTime: number;

  /** Whether results were filtered by minScore */
  filtered: boolean;
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
  suggestMemory(
    content: string,
    context: {
      category: string;
      tags: string[];
      learnedFrom: string;
    }
  ): Memory;

  /**
   * Load memories sorted by priority with optional relevance scoring.
   *
   * Priority is calculated from usage patterns (usedCount, lastUsed, created).
   * Relevance is calculated against optional task context.
   *
   * @param options - Loading options including limit, taskContext, weights
   * @returns Scored and ranked memories
   */
  loadByPriority(options?: LoadByPriorityOptions): Promise<LoadByPriorityResult>;

  /**
   * Calculate priority score for a memory (0-100).
   *
   * Factors:
   * - Usage frequency (usedCount): 40%
   * - Recency (lastUsed): 35%
   * - Age bonus (older memories that are still used): 25%
   *
   * @param memory - Memory to score
   * @returns Priority score 0-100
   */
  calculatePriorityScore(memory: Memory): number;

  /**
   * Calculate relevance score of memory against task context (0-100).
   *
   * Uses keyword matching and semantic similarity.
   *
   * @param memory - Memory to score
   * @param taskContext - Task description to match against
   * @returns Relevance score 0-100
   */
  calculateRelevanceScore(memory: Memory, taskContext: string): number;
}

// ============================================================================
// Journey Mapping Types (Spec 010 FR-013 through FR-020)
// ============================================================================

/** Actor type in a customer journey */
export type ActorType = 'user' | 'ai_agent' | 'system' | 'external_service';

/** Actor in a customer journey */
export interface JourneyActor {
  /** Unique actor identifier (e.g., "user", "auth-service") */
  id: string;
  /** Display name */
  name: string;
  /** Actor type classification */
  type: ActorType;
  /** Description of the actor's role */
  role: string;
}

/** A step in the customer journey */
export interface JourneyStep {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Actor performing this step */
  actorId: string;
  /** Description of the action */
  action: string;
  /** Expected outcome */
  outcome?: string;
  /** Notes or considerations */
  notes?: string;
}

/** A touchpoint in the journey (interaction point) */
export interface JourneyTouchpoint {
  /** Touchpoint identifier */
  id: string;
  /** Type of touchpoint */
  type: 'ui' | 'api' | 'notification' | 'document' | 'other';
  /** Description */
  description: string;
  /** Which actors interact at this touchpoint */
  actorIds: string[];
  /** Associated step numbers */
  stepNumbers: number[];
}

/**
 * Customer/user journey representation.
 *
 * @see FR-013 through FR-016
 */
export interface Journey {
  /** Journey identifier (kebab-case) */
  id: string;
  /** Journey name */
  name: string;
  /** Feature this journey belongs to */
  featureId: string;
  /** Brief description */
  description: string;
  /** Actors involved in the journey */
  actors: JourneyActor[];
  /** Steps in the journey (ordered) */
  steps: JourneyStep[];
  /** Touchpoints (interaction points) */
  touchpoints: JourneyTouchpoint[];
  /** Mermaid diagram (if generated) */
  mermaidDiagram?: string;
  /** Creation timestamp */
  created: number;
  /** Last modified timestamp */
  modified: number;
  /** Status of the journey */
  status: 'draft' | 'confirmed' | 'revised';
}

/** Industry type for variant generation */
export type Industry =
  | 'retail'
  | 'healthcare'
  | 'finance'
  | 'education'
  | 'hospitality'
  | 'logistics'
  | 'manufacturing'
  | 'legal'
  | 'real_estate'
  | 'entertainment';

/**
 * Industry-adapted journey variant.
 *
 * @see FR-017 through FR-020
 */
export interface JourneyVariant {
  /** Variant identifier */
  id: string;
  /** Reference to base journey */
  baseJourneyId: string;
  /** Industry this variant applies to */
  industry: Industry;
  /** Variant number within the industry */
  variantNumber: number;
  /** Adaptations made for this industry */
  adaptations: string[];
  /** Innovation insights from this industry */
  innovations: string[];
  /** Modified Mermaid diagram */
  mermaidDiagram?: string;
  /** Creation timestamp */
  created: number;
}

// ============================================================================
// Sequence Diagram Types (Spec 010 FR-021 through FR-025)
// ============================================================================

/** Option number for sequence diagram */
export type SequenceOptionNumber = 1 | 2 | 3 | 4 | 5;

/**
 * Implementation option with trade-off scores.
 *
 * @see FR-021 through FR-025
 */
export interface SequenceDiagramOption {
  /** Option number (1-5) */
  optionNumber: SequenceOptionNumber;
  /** Option name (e.g., "Minimal", "Efficient", "Standard", "Enhanced", "Innovative") */
  name: string;
  /** Feature this option belongs to */
  featureId: string;
  /** Mermaid sequence diagram */
  mermaidDiagram: string;
  /** Actors/systems in the diagram */
  actors: string[];
  /** Points where Gen AI could be integrated */
  genAiTouchpoints: string[];
  /** Efficiency score (0-100, higher = more efficient) */
  efficiencyScore: number;
  /** Complexity score (0-100, higher = more complex) */
  complexityScore: number;
  /** Innovation score (0-100, higher = more innovative) */
  innovationScore: number;
  /** Estimated effort (e.g., "1-2 days", "1 week") */
  estimatedEffort: string;
  /** Identified risks */
  risks: string[];
  /** Creation timestamp */
  created: number;
  /** Whether this option was selected */
  selected?: boolean;
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
