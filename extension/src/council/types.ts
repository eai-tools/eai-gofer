/**
 * LLM Council Integration - Type Definitions
 *
 * This module contains all TypeScript interfaces and types for the LLM Council
 * pattern, enabling multi-provider parallel execution with Chairman synthesis.
 *
 * @see .specify/specs/009-llm-council-integration/data-model.md
 */

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Status of an LLM provider's availability
 */
export type ProviderStatus = 'available' | 'unavailable' | 'rate_limited' | 'unknown';

/**
 * CLI provider identifiers
 */
export type CLIProviderId = 'claude-cli' | 'codex-cli';

/**
 * Supported provider identifiers
 */
export type ProviderId = 'anthropic' | 'google' | 'openai' | 'claude-cli' | 'codex-cli';

/**
 * Rate limiting configuration for a provider
 */
export interface RateLimitConfig {
  /** Max requests per minute */
  requestsPerMinute: number;
  /** Current request count in window */
  currentCount: number;
  /** ISO-8601 timestamp when window resets */
  windowResetAt?: string;
}

/**
 * Represents a configured AI provider with credentials and availability status.
 */
export interface LLMProviderInfo {
  /** Provider identifier (e.g., "anthropic", "google", "openai") */
  id: ProviderId;
  /** Human-readable name (e.g., "Anthropic Claude", "Google Gemini") */
  name: string;
  /** Whether provider is active for council use */
  enabled: boolean;
  /** Model identifier (e.g., "claude-opus-4-5", "gemini-3-flash") */
  model: string;
  /** Current availability state */
  status: ProviderStatus;
  /** ISO-8601 timestamp of last health check */
  lastChecked?: string;
  /** Most recent error if status is 'unavailable' */
  errorMessage?: string;
  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Per-provider settings within council configuration
 */
export interface ProviderConfig {
  /** References LLMProvider.id */
  providerId: ProviderId;
  /** Whether to use this provider */
  enabled: boolean;
  /** Model override (optional) */
  model?: string;
}

/**
 * Council mode for each workflow stage
 */
export type CouncilMode = 'council' | 'single';

/**
 * Per-stage council/single mode configuration
 */
export interface StageConfig {
  gofer_plan: CouncilMode;
  gofer_analyze: CouncilMode;
  research_codebase: CouncilMode;
  validate_plan: CouncilMode;
  implement: CouncilMode;
  [key: string]: CouncilMode; // Allow additional custom stages
}

/**
 * Per-project configuration controlling council behavior across workflow stages.
 */
export interface CouncilConfig {
  /** Global council enable/disable */
  enabled: boolean;
  /** Enable optional peer review stage */
  peerReview: boolean;
  /** Minimum providers for valid council (default: 2) */
  minQuorum: number;
  /** Per-provider timeout in ms (default: 30000) */
  timeout: number;
  /** Per-provider settings */
  providers: ProviderConfig[];
  /** Per-stage council/single mode */
  stages: StageConfig;
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * Agent types that can trigger council sessions
 */
export type AgentType = 'codebase-locator' | 'codebase-analyzer' | 'codebase-pattern-finder';

/**
 * Status of a council session
 */
export type SessionStatus = 'collecting' | 'reviewing' | 'synthesizing' | 'completed' | 'failed';

/**
 * Token and cost breakdown per provider
 */
export interface ProviderUsageBreakdown {
  tokens: number;
  costUsd: number;
}

/**
 * Usage metrics for cost and token tracking
 */
export interface UsageMetrics {
  totalTokensInput: number;
  totalTokensOutput: number;
  estimatedCostUsd: number;
  durationMs: number;
  providerBreakdown: Record<ProviderId, ProviderUsageBreakdown>;
}

/**
 * A council member's initial response to the agent prompt, before peer review.
 */
export interface FirstOpinion {
  /** References CouncilMember composite key */
  memberId: string;
  /** The actual response text */
  content: string;
  /** Parsed JSON if response is structured */
  structuredData?: unknown;
  /** Output tokens used */
  tokenCount: number;
  /** Self-reported confidence indicators */
  confidenceSignals?: string[];
  /** ISO-8601 timestamp */
  timestamp: string;
}

/**
 * Status of a council member's response collection
 */
export type MemberStatus = 'pending' | 'responded' | 'timeout' | 'error';

/**
 * A provider's participation in a specific council session.
 */
export interface CouncilMember {
  /** Parent CouncilSession.id */
  sessionId: string;
  /** Which provider (references LLMProvider.id) */
  providerId: ProviderId;
  /** Anonymous label for peer review (e.g., "Member A") */
  anonymousId: string;
  /** Response collection status */
  status: MemberStatus;
  /** Provider's initial response */
  firstOpinion?: FirstOpinion;
  /** ISO-8601 timestamp when request sent */
  requestedAt: string;
  /** ISO-8601 timestamp when response received */
  respondedAt?: string;
  /** Error details if failed */
  errorMessage?: string;
}

/**
 * A council member's evaluation and ranking of another member's first opinion.
 */
export interface PeerReview {
  /** Parent CouncilSession.id */
  sessionId: string;
  /** Who is reviewing (CouncilMember.anonymousId) */
  reviewerId: string;
  /** Whose opinion is being reviewed */
  revieweeId: string;
  /** Position in reviewer's ranking (1=best, N=worst) */
  rank: number;
  /** Brief explanation for the ranking */
  justification: string;
  /** Positive aspects noted */
  strengths: string[];
  /** Areas for improvement */
  weaknesses: string[];
  /** ISO-8601 timestamp */
  timestamp: string;
}

/**
 * How a conflict between council members was resolved
 */
export interface ConflictResolution {
  /** What members disagreed about */
  topic: string;
  /** Different viewpoints (anonymized) */
  positions: string[];
  /** Chairman's decision and rationale */
  resolution: string;
}

/**
 * Quality signals derived from peer reviews
 */
export interface QualitySignals {
  /** Average rank per member (anonymized) */
  averageRank: Record<string, number>;
  /** 0-100, how much members agreed */
  consensusScore: number;
  /** Whether peer review data was used */
  peerReviewIncluded: boolean;
}

/**
 * The Chairman's unified output combining insights from all council inputs.
 */
export interface Synthesis {
  /** Parent CouncilSession.id */
  sessionId: string;
  /** Which AI acted as chairman (typically requesting LLM) */
  chairmanId: string;
  /** Final synthesized response */
  content: string;
  /** Parsed JSON if response is structured */
  structuredData?: unknown;
  /** How disagreements were handled */
  conflictsResolved: ConflictResolution[];
  /** Areas of agreement across members */
  consensusPoints: string[];
  /** Derived from peer reviews */
  qualitySignals: QualitySignals;
  /** ISO-8601 timestamp */
  timestamp: string;
}

/**
 * A single execution of the council pattern for one agent task.
 */
export interface CouncilSession {
  /** Unique identifier (UUID) */
  id: string;
  /** Which agent triggered this session */
  agentType: AgentType;
  /** Workflow stage (e.g., "gofer_plan") */
  stage: string;
  /** Current state */
  status: SessionStatus;
  /** Original prompt sent to all providers */
  prompt: string;
  /** ISO-8601 timestamp */
  startedAt: string;
  /** ISO-8601 timestamp */
  completedAt?: string;
  /** Participating providers and their responses */
  members: CouncilMember[];
  /** Optional peer review results */
  peerReviews?: PeerReview[];
  /** Chairman's final output */
  synthesis?: Synthesis;
  /** Cost and token tracking */
  usageMetrics: UsageMetrics;
}

// =============================================================================
// Usage Logging Types
// =============================================================================

/**
 * Token breakdown per provider for usage logging
 */
export interface TokenBreakdown {
  input: number;
  output: number;
}

/**
 * Historical record of council usage for cost tracking and analysis.
 */
export interface UsageLog {
  /** Unique identifier */
  id: string;
  /** References CouncilSession.id */
  sessionId: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Workflow stage */
  stage: string;
  /** Provider IDs that participated */
  providersUsed: ProviderId[];
  /** Aggregated cost */
  totalCostUsd: number;
  /** Token breakdown per provider */
  tokenBreakdown: Record<ProviderId, TokenBreakdown>;
  /** true for council, false for single-provider */
  councilMode: boolean;
  /** Whether session completed successfully */
  success: boolean;
}

// =============================================================================
// API Types (for Provider Interface)
// =============================================================================

/**
 * Request parameters for querying a provider
 */
export interface QueryRequest {
  /** The prompt to send to the provider */
  prompt: string;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Temperature for response generation (0-1) */
  temperature: number;
  /** Optional system prompt */
  systemPrompt?: string;
}

/**
 * Usage information from a provider response
 */
export interface QueryUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Response from a provider query
 */
export interface QueryResponse {
  /** Response content */
  content: string;
  /** Token usage */
  usage: QueryUsage;
  /** Model used */
  model: string;
  /** Provider ID */
  providerId: ProviderId;
}

// =============================================================================
// Result Types (for Orchestrator)
// =============================================================================

/**
 * Summary of usage across sessions
 */
export interface UsageSummary {
  totalSessions: number;
  councilSessions: number;
  singleSessions: number;
  totalCostUsd: number;
  byProvider: Record<ProviderId, { requests: number; costUsd: number }>;
}

/**
 * Result from a council dispatch operation
 */
export interface CouncilResult {
  /** Whether council or single-provider mode was used */
  mode: CouncilMode;
  /** Final output (synthesized or single response) */
  synthesis: string;
  /** Full session details (council mode only) */
  session?: CouncilSession;
  /** Provider response (single mode only) */
  singleResponse?: QueryResponse;
  /** Usage metrics */
  usage: UsageMetrics;
  /** Peer reviews (council mode with peerReview enabled) */
  peerReviews?: PeerReview[];
}

/**
 * Anonymized opinion for peer review and synthesis
 */
export interface AnonymizedOpinion {
  /** "Member A", "Member B", etc. */
  anonymousId: string;
  /** Response content */
  content: string;
  /** For weighting purposes */
  tokenCount: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default council configuration when no file exists
 */
export const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  enabled: false,
  peerReview: false,
  minQuorum: 2,
  timeout: 30000,
  providers: [{ providerId: 'anthropic', enabled: true, model: 'claude-opus-4-5-20251101' }],
  stages: {
    gofer_plan: 'single',
    gofer_analyze: 'single',
    research_codebase: 'single',
    validate_plan: 'single',
    implement: 'single',
  },
};

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  currentCount: 0,
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<ProviderId, string> = {
  anthropic: 'Anthropic Claude',
  google: 'Google Gemini',
  openai: 'OpenAI GPT',
  'claude-cli': 'Claude Code CLI',
  'codex-cli': 'Codex CLI',
};

/**
 * Default models per provider
 */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-opus-4-5-20251101',
  google: 'gemini-3-flash-preview',
  openai: 'gpt-5.2',
  'claude-cli': 'claude-opus-4',
  'codex-cli': 'gpt-5',
};
