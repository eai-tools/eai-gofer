# Data Model & State Machines

**Feature**: LLM Council Integration **Date**: 2025-12-30 **Phase**: 1 - Design

## Primary Entities

### 1. LLMProvider

Represents a configured AI provider with credentials and availability status.

**Attributes**:

```typescript
interface LLMProvider {
  id: string; // Provider identifier (e.g., "anthropic", "google", "xai", "openai")
  name: string; // Human-readable name (e.g., "Anthropic Claude", "Google Gemini")
  enabled: boolean; // Whether provider is active for council use
  model: string; // Model identifier (e.g., "claude-sonnet-4", "gemini-2.0-flash")
  status: ProviderStatus; // Current availability state
  lastChecked?: string; // ISO-8601 timestamp of last health check
  errorMessage?: string; // Most recent error if status is 'unavailable'
  rateLimit: RateLimitConfig; // Rate limiting configuration
}

type ProviderStatus = 'available' | 'unavailable' | 'rate_limited' | 'unknown';

interface RateLimitConfig {
  requestsPerMinute: number; // Max requests per minute
  currentCount: number; // Current request count in window
  windowResetAt?: string; // ISO-8601 timestamp when window resets
}
```

**Relationships**:

- Participates in many **CouncilSession**s (N:N via CouncilMember)
- Has many **ProviderResponse**s (1:N)

**Validation Rules**:

- `id` must be unique and one of: 'anthropic', 'google', 'xai', 'openai'
- `model` must be valid for the provider
- `enabled` requires valid API key in VSCode settings
- `rateLimit.requestsPerMinute` must be positive integer

**Source**: VSCode settings (`specGofer.*ApiKey`) +
`.specify/memory/council-config.yaml`

---

### 2. CouncilConfig

Per-project configuration controlling council behavior across workflow stages.

**Attributes**:

```typescript
interface CouncilConfig {
  enabled: boolean; // Global council enable/disable
  peerReview: boolean; // Enable optional peer review stage
  minQuorum: number; // Minimum providers for valid council (default: 2)
  timeout: number; // Per-provider timeout in ms (default: 30000)
  providers: ProviderConfig[]; // Per-provider settings
  stages: StageConfig; // Per-stage council/single mode
}

interface ProviderConfig {
  providerId: string; // References LLMProvider.id
  enabled: boolean; // Whether to use this provider
  model: string; // Model override (optional)
}

interface StageConfig {
  speckit_plan: 'council' | 'single';
  speckit_analyze: 'council' | 'single';
  research_codebase: 'council' | 'single';
  validate_plan: 'council' | 'single';
  implement: 'council' | 'single';
}
```

**Relationships**:

- References many **LLMProvider**s via `providers` array (1:N)
- Determines behavior of many **CouncilSession**s (1:N)

**Validation Rules**:

- `minQuorum` must be 2-4 (at least 2 for diversity, max 4 providers)
- `timeout` must be 5000-120000 ms
- `stages` keys must match known workflow stages
- If `peerReview: true`, requires at least 3 enabled providers

**Source**: `.specify/memory/council-config.yaml`

---

### 3. CouncilSession

A single execution of the council pattern for one agent task.

**Attributes**:

```typescript
interface CouncilSession {
  id: string; // Unique identifier (UUID)
  agentType: AgentType; // Which agent triggered this session
  stage: string; // Workflow stage (e.g., "speckit_plan")
  status: SessionStatus; // Current state
  prompt: string; // Original prompt sent to all providers
  startedAt: string; // ISO-8601 timestamp
  completedAt?: string; // ISO-8601 timestamp
  members: CouncilMember[]; // Participating providers and their responses
  peerReviews?: PeerReview[]; // Optional peer review results
  synthesis?: Synthesis; // Chairman's final output
  usageMetrics: UsageMetrics; // Cost and token tracking
}

type AgentType =
  | 'codebase-locator'
  | 'codebase-analyzer'
  | 'codebase-pattern-finder';
type SessionStatus =
  | 'collecting'
  | 'reviewing'
  | 'synthesizing'
  | 'completed'
  | 'failed';

interface UsageMetrics {
  totalTokensInput: number;
  totalTokensOutput: number;
  estimatedCostUsd: number;
  durationMs: number;
  providerBreakdown: Record<string, { tokens: number; costUsd: number }>;
}
```

**Relationships**:

- Contains many **CouncilMember**s (1:N)
- Has many optional **PeerReview**s (1:N)
- Has one optional **Synthesis** (1:1)

**Validation Rules**:

- `members.length` must meet `CouncilConfig.minQuorum` for valid session
- `status` transitions must follow state machine (see below)
- `synthesis` required when `status === 'completed'`
- `completedAt` must be > `startedAt`

**Source**: In-memory during execution, logged to stdout

---

### 4. CouncilMember

A provider's participation in a specific council session.

**Attributes**:

```typescript
interface CouncilMember {
  sessionId: string; // Parent CouncilSession.id
  providerId: string; // Which provider (references LLMProvider.id)
  anonymousId: string; // Anonymous label for peer review (e.g., "Member A")
  status: MemberStatus; // Response collection status
  firstOpinion?: FirstOpinion; // Provider's initial response
  requestedAt: string; // ISO-8601 timestamp when request sent
  respondedAt?: string; // ISO-8601 timestamp when response received
  errorMessage?: string; // Error details if failed
}

type MemberStatus = 'pending' | 'responded' | 'timeout' | 'error';
```

**Relationships**:

- Belongs to one **CouncilSession** (N:1)
- References one **LLMProvider** (N:1)
- Has one optional **FirstOpinion** (1:1)
- Receives many **PeerReview**s from other members (1:N as reviewee)
- Gives many **PeerReview**s to other members (1:N as reviewer)

**Validation Rules**:

- `anonymousId` must be unique within session (A, B, C, D)
- `status === 'responded'` requires non-null `firstOpinion`
- `timeout` status set after `CouncilConfig.timeout` ms elapsed

**Source**: In-memory during execution

---

### 5. FirstOpinion

A council member's initial response to the agent prompt, before peer review.

**Attributes**:

```typescript
interface FirstOpinion {
  memberId: string; // References CouncilMember composite key
  content: string; // The actual response text
  structuredData?: unknown; // Parsed JSON if response is structured
  tokenCount: number; // Output tokens used
  confidenceSignals?: string[]; // Self-reported confidence indicators
  timestamp: string; // ISO-8601 timestamp
}
```

**Relationships**:

- Belongs to one **CouncilMember** (1:1)
- Referenced by many **PeerReview**s (1:N as reviewed opinion)

**Validation Rules**:

- `content` must not be empty
- `tokenCount` must be positive
- `structuredData` must be valid JSON if present

**Source**: API response from provider

---

### 6. PeerReview

A council member's evaluation and ranking of another member's first opinion.

**Attributes**:

```typescript
interface PeerReview {
  sessionId: string; // Parent CouncilSession.id
  reviewerId: string; // Who is reviewing (CouncilMember.anonymousId)
  revieweeId: string; // Whose opinion is being reviewed
  rank: number; // Position in reviewer's ranking (1=best, N=worst)
  justification: string; // Brief explanation for the ranking
  strengths: string[]; // Positive aspects noted
  weaknesses: string[]; // Areas for improvement
  timestamp: string; // ISO-8601 timestamp
}
```

**Relationships**:

- Belongs to one **CouncilSession** (N:1)
- Given by one **CouncilMember** (reviewer) (N:1)
- Reviews one **FirstOpinion** (N:1)

**Validation Rules**:

- `reviewerId !== revieweeId` (no self-review)
- `rank` must be 1 to (N-1) where N is member count
- `justification` must be non-empty
- Each reviewer must rank all other members exactly once

**Source**: API response from provider during peer review stage

---

### 7. Synthesis

The Chairman's unified output combining insights from all council inputs.

**Attributes**:

```typescript
interface Synthesis {
  sessionId: string; // Parent CouncilSession.id
  chairmanId: string; // Which AI acted as chairman (typically requesting LLM)
  content: string; // Final synthesized response
  structuredData?: unknown; // Parsed JSON if response is structured
  conflictsResolved: ConflictResolution[]; // How disagreements were handled
  consensusPoints: string[]; // Areas of agreement across members
  qualitySignals: QualitySignals; // Derived from peer reviews
  timestamp: string; // ISO-8601 timestamp
}

interface ConflictResolution {
  topic: string; // What members disagreed about
  positions: string[]; // Different viewpoints (anonymized)
  resolution: string; // Chairman's decision and rationale
}

interface QualitySignals {
  averageRank: Record<string, number>; // Average rank per member (anonymized)
  consensusScore: number; // 0-100, how much members agreed
  peerReviewIncluded: boolean; // Whether peer review data was used
}
```

**Relationships**:

- Belongs to one **CouncilSession** (1:1)
- References all **FirstOpinion**s and **PeerReview**s in session

**Validation Rules**:

- `content` must not be empty
- `consensusScore` must be 0-100
- `conflictsResolved` required when members disagreed

**Source**: Generated by Chairman (requesting LLM) at end of council process

---

### 8. UsageLog

Historical record of council usage for cost tracking and analysis.

**Attributes**:

```typescript
interface UsageLog {
  id: string; // Unique identifier
  sessionId: string; // References CouncilSession.id
  timestamp: string; // ISO-8601 timestamp
  stage: string; // Workflow stage
  providersUsed: string[]; // Provider IDs that participated
  totalCostUsd: number; // Aggregated cost
  tokenBreakdown: Record<string, { input: number; output: number }>;
  councilMode: boolean; // true for council, false for single-provider
  success: boolean; // Whether session completed successfully
}
```

**Relationships**:

- References one **CouncilSession** (N:1)
- References many **LLMProvider**s (N:N)

**Validation Rules**:

- `totalCostUsd` must be non-negative
- `providersUsed.length` must match `tokenBreakdown` keys

**Source**: `.specify/logs/council-usage.jsonl` (append-only)

---

## State Machines

### CouncilSession Status State Machine

```
┌────────────┐
│ collecting │ Initial state (sending prompts to all providers)
└─────┬──────┘
      │ All members responded OR minQuorum met with timeouts
      ▼
┌────────────┐
│ reviewing  │ (Optional) Peer review stage
└─────┬──────┘
      │ Peer reviews complete OR peerReview disabled
      ▼
┌──────────────┐
│ synthesizing │ Chairman combining responses
└─────┬────────┘
      │ Synthesis complete
      ▼
┌───────────┐
│ completed │ Terminal state (success)
└───────────┘

Alternative path (failure):
Any state ──[all providers fail OR quorum not met]──► ┌────────┐
                                                      │ failed │ Terminal
                                                      └────────┘
```

**Transition Rules**:

- `collecting → reviewing`: When peer review enabled AND enough members
  responded
- `collecting → synthesizing`: When peer review disabled AND enough members
  responded
- `collecting → failed`: When fewer than `minQuorum` providers respond
  successfully
- `reviewing → synthesizing`: When all peer reviews collected
- `reviewing → failed`: Critical error during peer review
- `synthesizing → completed`: When Chairman produces synthesis
- `synthesizing → failed`: Chairman synthesis fails

---

### CouncilMember Status State Machine

```
┌─────────┐
│ pending │ Initial state (request sent, awaiting response)
└────┬────┘
     │
     ├──[response received]──► ┌───────────┐
     │                         │ responded │ Terminal (success)
     │                         └───────────┘
     │
     ├──[timeout elapsed]────► ┌─────────┐
     │                         │ timeout │ Terminal (partial failure)
     │                         └─────────┘
     │
     └──[API error]──────────► ┌───────┐
                               │ error │ Terminal (failure)
                               └───────┘
```

**Transition Rules**:

- `pending → responded`: When provider returns valid response
- `pending → timeout`: When `CouncilConfig.timeout` ms elapsed without response
- `pending → error`: When provider returns error (4xx/5xx) or network failure
- No transitions from terminal states

---

### LLMProvider Status State Machine

```
┌─────────┐
│ unknown │ Initial state (not yet validated)
└────┬────┘
     │ Health check succeeds
     ▼
┌───────────┐      API error (auth/config)
│ available │◄─────────────────────────────┐
└─────┬─────┘                              │
      │                                    │
      │ Rate limit hit                     │ Rate limit window expires
      ▼                                    │
┌──────────────┐                           │
│ rate_limited │───────────────────────────┘
└──────┬───────┘
       │ Auth error or repeated failures
       ▼
┌─────────────┐
│ unavailable │ (requires config fix to recover)
└─────────────┘
```

**Transition Rules**:

- `unknown → available`: When API key validated successfully
- `unknown → unavailable`: When API key invalid or missing
- `available → rate_limited`: When provider returns 429
- `rate_limited → available`: When rate limit window expires
- `available → unavailable`: When auth fails (401) or repeated errors
- `unavailable → available`: When user fixes config and re-validates

---

## Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                            Workflow Stage                                      │
│  (e.g., /speckit.plan Phase 0.5, /1_research_codebase)                        │
└────────────────────────────────┬──────────────────────────────────────────────┘
                                 │
                                 │ Spawn parallel agents
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         CouncilOrchestrator                                    │
│  - loadConfig() → CouncilConfig                                               │
│  - getEnabledProviders() → LLMProvider[]                                      │
│  - dispatch(prompt, agentType) → CouncilSession                               │
└────────────────────────────────┬──────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ AnthropicProvider│    │ GoogleProvider  │    │   XAIProvider   │
│                 │    │                 │    │                 │
│ query(prompt)   │    │ query(prompt)   │    │ query(prompt)   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                       │                       │
         │ FirstOpinion         │ FirstOpinion         │ FirstOpinion
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                          ResponseAggregator                                    │
│  - collectResponses(providers, prompt) → FirstOpinion[]                       │
│  - anonymize(responses) → AnonymizedOpinion[]                                 │
│  - validateQuorum(responses) → boolean                                        │
└────────────────────────────────┬──────────────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼ (if peerReview enabled)             ▼ (if peerReview disabled)
┌─────────────────────────────┐                     │
│      Peer Review Stage      │                     │
│                             │                     │
│ Each provider reviews other │                     │
│ providers' anonymized       │                     │
│ responses                   │                     │
│                             │                     │
│ Output: PeerReview[]        │                     │
└──────────────┬──────────────┘                     │
               │                                    │
               └──────────────────┬─────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         Chairman Synthesis                                     │
│  (Requesting LLM - e.g., Claude Code)                                         │
│                                                                                │
│  Input: AnonymizedOpinion[] + PeerReview[] (optional)                         │
│  Output: Synthesis                                                             │
│                                                                                │
│  - Combine best insights                                                       │
│  - Note and resolve conflicts                                                  │
│  - Include peer ranking signals                                                │
└────────────────────────────────┬──────────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           Final Output                                         │
│  - Same format as single-provider output (backward compatible)                │
│  - Logged to UsageLog for cost tracking                                       │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Persistence

| Entity             | Storage Location                                        | Format     | Mutability                           |
| ------------------ | ------------------------------------------------------- | ---------- | ------------------------------------ |
| **LLMProvider**    | VSCode settings + `.specify/memory/council-config.yaml` | JSON/YAML  | Updated via settings UI or file edit |
| **CouncilConfig**  | `.specify/memory/council-config.yaml`                   | YAML       | Updated manually by user             |
| **CouncilSession** | In-memory during execution                              | N/A        | Ephemeral                            |
| **CouncilMember**  | In-memory during execution                              | N/A        | Ephemeral                            |
| **FirstOpinion**   | In-memory during execution                              | N/A        | Ephemeral                            |
| **PeerReview**     | In-memory during execution                              | N/A        | Ephemeral                            |
| **Synthesis**      | In-memory → stdout logs                                 | JSON       | Ephemeral (logged for debugging)     |
| **UsageLog**       | `.specify/logs/council-usage.jsonl`                     | JSON lines | Append-only                          |

**Write Strategy**:

- Council config uses file-based persistence (YAML)
- API keys stored in VSCode secure storage
- Session data ephemeral (only usage logs persisted)
- Usage logs append-only for audit trail

**Concurrency**:

- Parallel requests to multiple providers via Promise.all
- Rate limiting per provider (p-limit library)
- No cross-session concurrency concerns (single session at a time)

---

## Data Model Summary

**8 Core Entities**:

1. LLMProvider (semi-persistent)
2. CouncilConfig (persistent, file-based)
3. CouncilSession (ephemeral)
4. CouncilMember (ephemeral)
5. FirstOpinion (ephemeral)
6. PeerReview (ephemeral)
7. Synthesis (ephemeral, logged)
8. UsageLog (persistent, append-only)

**3 State Machines**:

1. CouncilSession Status (collecting → reviewing → synthesizing →
   completed/failed)
2. CouncilMember Status (pending → responded/timeout/error)
3. LLMProvider Status (unknown → available ⇄ rate_limited → unavailable)

**Key Relationships**:

- LLMProvider N:N CouncilSession (via CouncilMember)
- CouncilSession 1:N CouncilMember
- CouncilMember 1:1 FirstOpinion
- CouncilSession 1:N PeerReview
- CouncilSession 1:1 Synthesis
- CouncilSession 1:1 UsageLog

---

**Data Model Status**: ✅ COMPLETE **Next Artifact**: contracts/ (API contracts
for LLMProvider interface)
