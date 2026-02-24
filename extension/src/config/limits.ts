/**
 * Limit Constants for Gofer Extension
 *
 * All limit values as counts or byte sizes
 */

export const LIMITS = {
  /** Maximum nodes in knowledge graph before eviction */
  MAX_KNOWLEDGE_GRAPH_NODES: 5000,

  /** Maximum edges in knowledge graph before eviction */
  MAX_KNOWLEDGE_GRAPH_EDGES: 20000,

  /** Maximum memories to store before eviction */
  MAX_MEMORY_COUNT: 200,

  /** Maximum cache entries (LRU eviction) */
  MAX_CACHE_SIZE: 100,

  /** Maximum token budget for memory storage (50k tokens) */
  MAX_TOKEN_BUDGET: 50000,

  /** Maximum token budget for checkpoint validation (8k tokens) */
  MAX_CHECKPOINT_TOKEN_BUDGET: 8000,

  /** Maximum tokens for a single research chunk before splitting (5k tokens) */
  MAX_RESEARCH_CHUNK_TOKENS: 5000,

  /** Maximum observation window (turns to keep) */
  MAX_OBSERVATION_WINDOW: 5,

  /** Maximum retry attempts */
  MAX_RETRIES: 10,

  /** Maximum file bytes to load in context panel (50 KB) */
  MAX_FILE_BYTES: 50 * 1024,

  /** Effective context token limit (120k tokens) */
  EFFECTIVE_CONTEXT_LIMIT: 120000,

  /** Observations token threshold for category warnings (10k tokens) */
  OBSERVATIONS_WARNING_THRESHOLD: 10000,

  /** Conversation token threshold for category warnings (30k tokens) */
  CONVERSATION_WARNING_THRESHOLD: 30000,

  /** Spec artifacts token threshold for warnings (20k tokens) */
  SPEC_ARTIFACTS_WARNING_THRESHOLD: 20000,

  /** Memories token threshold for warnings (15k tokens) */
  MEMORIES_WARNING_THRESHOLD: 15000,

  /** Tool schema tokens (constant overhead for Claude Code) */
  TOOL_SCHEMA_TOKENS: 11600,

  /** Days in a year (for date calculations) */
  DAYS_PER_YEAR: 365,

  /** Characters - Short preview length */
  PREVIEW_CHARS_SHORT: 200,

  /** Characters - Medium preview length */
  PREVIEW_CHARS_MEDIUM: 300,

  /** Characters - Default/standard preview length */
  PREVIEW_CHARS_DEFAULT: 500,

  /** Characters - Long preview length */
  PREVIEW_CHARS_LONG: 600,

  /** Characters - Extended preview length */
  PREVIEW_CHARS_EXTENDED: 800,
} as const;

/**
 * Limit type derived from LIMITS object
 */
export type Limit = (typeof LIMITS)[keyof typeof LIMITS];
