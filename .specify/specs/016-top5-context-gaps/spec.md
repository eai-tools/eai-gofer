---
id: "016-top5-context-gaps"
title: "Top 5 Context Management Gaps"
status: "draft"
created: "2026-02-08"
priority: "P0"
rubric-source: ".specify/research/comprehensive-context-management-rubric.md"
target-score-improvement: "+25 points (178 → 203 of 300)"
---

# Feature Specification: Top 5 Context Management Gaps

## Overview

Close the 5 highest-impact gaps identified in the Comprehensive Context
Management Rubric (all currently scored 0/5, gap of 5 points each = 25 points
total). These represent the largest remaining opportunities to improve Gofer's
context window management from 59% to ~68%.

## Gap Summary

| # | Rubric Item | Current | Target | Impact |
|---|-------------|:-------:|:------:|--------|
| 1 | B2. Graduated observation decay | 0/5 | 4/5 | 40-60% context reduction with quality preservation |
| 2 | B3. Semantic observation compression | 0/5 | 3/5 | 60-70% reduction while preserving meaning |
| 3 | D3. Recursive research summarization | 0/5 | 3/5 | 70% reduction at abstract level |
| 4 | I1. MIT RLM recursive context folding | 0/5 | 2/5 | Foundation for 10x capacity improvement |
| 5 | F5/G3. Progressive context delegation | 0/5 | 3/5 | Maintains quality as context fills |

**Realistic targets**: Full 5/5 is unrealistic for items that require LLM calls
(latency, cost, API key availability) or paradigm shifts (RLM). We target
functional implementations with graceful fallbacks.

---

## US1 — Graduated Observation Decay (B2: 0/5 → 4/5)

**Problem**: The ObservationMasker has only two states: full content or XML
placeholder. Observations jump from ~1000 tokens to ~20 tokens instantly,
losing all intermediate context. Research shows a 3-tier system preserves
40-60% more useful information.

**Solution**: Add a 3-tier decay system: `full` → `key-points` → `masked`.

### Decay Tiers

| Tier | Age Range | Content | Token Estimate |
|------|-----------|---------|:---:|
| `full` | 0 to `keyPointsAge` turns | Complete original content | 100% |
| `key-points` | `keyPointsAge` to `maskedAge` turns | Extracted summary (~200 tokens) | ~20% |
| `masked` | > `maskedAge` turns | Current XML placeholder | ~2% |

### Key Points Extraction (Non-LLM)

For the `key-points` tier, extract salient information deterministically:

- **file_read**: First 3 lines + function/class signatures + last 2 lines
- **command_output**: Exit status + first 5 lines + last 5 lines
- **search_result**: File paths + match count + first 3 matches
- **test_output**: Pass/fail summary + failed test names + error messages
- **api_response**: Status code + response shape (key names) + first error

This avoids LLM calls while preserving actionable context. Target: ~200 tokens
per key-points summary from a ~1000 token observation.

### Data Model Changes

```typescript
// ObservationEntry.masked: boolean → decayTier
export type DecayTier = 'full' | 'key-points' | 'masked';

interface ObservationEntry {
  // ... existing fields ...
  decayTier: DecayTier;              // replaces `masked: boolean`
  keyPointsContent?: string;         // generated on tier transition
  maskedAt?: number;                 // when fully masked
  keyPointsAt?: number;              // when key-points generated
}

// Config additions
interface ObservationMaskerConfig {
  // ... existing fields ...
  keyPointsAgeFraction: number;      // default 0.6 (60% of observationWindow)
  // ageThresholdTurns remains the full-mask threshold
}
```

### Stage Integration

The existing `StageContextProfile.observationWindow` sets the full-mask
threshold. The key-points threshold is derived as a fraction:

| Stage | observationWindow | keyPointsAge (60%) | maskedAge |
|-------|:-:|:-:|:-:|
| Research | 15 | 9 | 15 |
| Specify | 12 | 7 | 12 |
| Plan | 12 | 7 | 12 |
| Tasks | 10 | 6 | 10 |
| Implement | 10 | 6 | 10 |
| Validate | 12 | 7 | 12 |

### Backward Compatibility

- Cache version bumps from 1 to 2
- Migration: existing `masked: true` → `decayTier: 'masked'`,
  `masked: false` → `decayTier: 'full'`
- `expandObservation()` still returns full `originalContent` regardless of tier

### Acceptance Criteria

- [ ] `ObservationEntry` uses `decayTier` field instead of `masked` boolean
- [ ] `maskOldObservations()` produces 3-tier transitions based on age
- [ ] Key-points extraction generates ~200 token summaries per observation type
- [ ] `generatePlaceholder()` returns key-points content for `key-points` tier
- [ ] Cache serialization version bumped with migration from v1
- [ ] Error observations preserved at `full` tier (existing `shouldPreserve`)
- [ ] `MaskResult` reports per-tier counts and token savings
- [ ] Context output includes key-points inline (readable, not just IDs)
- [ ] Unit tests for all 5 observation types' key-points extraction

---

## US2 — Semantic Observation Compression (B3: 0/5 → 3/5)

**Problem**: The key-points extraction in US1 is deterministic but limited.
An LLM can produce significantly better summaries that preserve semantic
meaning, achieving 60-70% reduction.

**Solution**: Add optional LLM-based compression as an enhancement to
the key-points tier when an Anthropic API key is available.

### Architecture

```
Observation ages past keyPointsAge
    │
    ├── API key available? ──Yes──→ Call Haiku for semantic summary
    │                                  │
    │                                  ├── Success → Use LLM summary as keyPointsContent
    │                                  └── Failure → Fall back to deterministic extraction (US1)
    │
    └── No API key ──────────────→ Use deterministic extraction (US1)
```

### LLM Integration

Use the existing council `ProviderFactory` to create an Anthropic Haiku provider:

```typescript
const factory = getProviderFactory();
const haiku = factory.createProvider('anthropic', 'claude-3-5-haiku-20241022');
const response = await haiku.query({
  prompt: `Summarize this ${observation.type} output in ≤200 tokens, preserving:
    - File paths and line numbers
    - Function/class names
    - Error messages and stack traces
    - Key data values and counts
    Original:\n${observation.originalContent}`,
  maxTokens: 256,
  temperature: 0,
});
```

### Cost Control

- **Batch compression**: Queue observations that cross the keyPointsAge threshold
  and compress in a single batch call (up to 5 observations per batch)
- **Rate limit**: Max 10 LLM calls per minute for compression
- **Cost cap**: Track tokens spent on compression per session; stop after 50k
  input tokens (~$0.05 with Haiku)
- **Opt-in**: Only activate when `gofer.anthropicApiKey` is configured
- **Fallback**: Always fall back to US1 deterministic extraction on any failure

### Config

```typescript
interface ObservationMaskerConfig {
  // ... existing + US1 fields ...
  enableSemanticCompression: boolean;  // default: true (if API key available)
  maxCompressionCallsPerMinute: number; // default: 10
  maxCompressionTokensPerSession: number; // default: 50000
}
```

### Acceptance Criteria

- [ ] When API key is available, observations get LLM-compressed key-points
- [ ] When API key is missing, falls back to deterministic extraction (US1)
- [ ] LLM failures fall back gracefully (no user-visible errors)
- [ ] Rate limiting prevents excessive API calls
- [ ] Cost tracking logs compression token usage to context-usage.jsonl
- [ ] Compression quality: LLM summaries preserve file paths and error messages
- [ ] Unit tests mock the LLM provider and verify fallback behavior

---

## US3 — Recursive Research Summarization (D3: 0/5 → 3/5)

**Problem**: ResearchChunker loads top-N chunks at full content length. For
large research documents (10k+ tokens), even 5 chunks can consume 5,000+ tokens.
Hierarchical summarization would reduce this to ~1,500 tokens while preserving
key findings.

**Solution**: Add a 2-level summarization system on top of the existing
ResearchChunker.

### Summarization Levels

| Level | Content | Tokens | When Used |
|-------|---------|:------:|-----------|
| **Full** | Original chunk content | 100% | Research stage (needs details) |
| **Summary** | Per-chunk LLM summary (~150 tokens) | ~15% | Implement stage (needs gist) |
| **Abstract** | Single-paragraph overview of all chunks | ~3% | Late implement + validate |

### Architecture

```
ResearchChunker.loadChunksForTask(specId, task, limit)
    │
    │  (existing: returns ScoredChunk[] with full content)
    │
    ▼
ResearchSummarizer.summarizeForStage(chunks, stage)
    │
    ├── stage = 'research' or 'specify' → return chunks as-is (full)
    ├── stage = 'plan' or 'tasks'       → return per-chunk summaries
    └── stage = 'implement' or 'validate' → return single abstract
```

### Per-Chunk Summary Generation

- **With API key**: Call Haiku to summarize each chunk into ~150 tokens
- **Without API key**: Extract first sentence of each paragraph + all headings
  + code block signatures (deterministic fallback)
- **Caching**: Summaries cached in `{specDir}/research-summaries.json`
  alongside the existing `research-index.json`. Invalidated when research.md
  changes (same mtime check as the index).

### Abstract Generation

- **With API key**: Send all per-chunk summaries (total ~750 tokens for 5 chunks)
  to Haiku with prompt: "Create a single-paragraph abstract of these research
  findings in ≤100 tokens."
- **Without API key**: Concatenate first sentence of each chunk summary

### New Component

```typescript
// extension/src/autonomous/ResearchSummarizer.ts
export class ResearchSummarizer {
  constructor(
    private chunker: ResearchChunker,
    private llmProvider?: LLMProvider,
  ) {}

  async loadForStage(
    specId: string,
    task: string,
    stage: string,
    chunkLimit?: number,
  ): Promise<{ content: string; tokenEstimate: number; level: string }>;

  async summarizeChunk(chunk: ScoredChunk): Promise<string>;
  async generateAbstract(summaries: string[]): Promise<string>;
}
```

### Integration Point

`ContextBuilder.loadResearchChunks()` (line 958) currently calls
`ResearchChunker.loadChunksForTask()` directly. Change it to call
`ResearchSummarizer.loadForStage()` which wraps the chunker and applies
stage-appropriate summarization.

### Acceptance Criteria

- [ ] New `ResearchSummarizer` class wraps `ResearchChunker`
- [ ] Research/Specify stages load full chunk content (no change)
- [ ] Plan/Tasks stages load per-chunk summaries (~150 tokens each)
- [ ] Implement/Validate stages load a single abstract (~100 tokens)
- [ ] Summaries cached to `research-summaries.json` with mtime invalidation
- [ ] Without API key, deterministic fallback produces usable summaries
- [ ] ContextBuilder uses ResearchSummarizer instead of direct chunker calls
- [ ] Token savings: 70%+ reduction in research context for implement stage
- [ ] Unit tests for both LLM and deterministic summarization paths

---

## US4 — MIT RLM Recursive Context Folding Foundation (I1: 0/5 → 2/5)

**Problem**: The MIT RLM (Recursive Language Model) paradigm treats context as
an external variable with REPL-style operations (peek, grep, expand, summarize),
enabling 10x capacity. This is aspirational but we can build the foundation.

**Solution**: Implement a `ContextFolder` that provides fold/unfold operations
on context sections, exposing them as MCP tools for Claude Code to use.

### Context Folder Concept

Instead of loading full documents into context, load a **folded summary** that
can be unfolded on demand. This extends the observation masking concept to ALL
context sections (research, memories, code files).

### Fold Levels

| Level | Shows | Tokens |
|-------|-------|:------:|
| **Collapsed** | Section title + token count + first sentence | ~20 tokens |
| **Summary** | Key-points summary (from US1/US2 pattern) | ~200 tokens |
| **Expanded** | Full content | 100% |

### MCP Tools

```yaml
# New MCP tools for Claude Code
gofer_context_peek:
  description: "Show folded view of a context section (title + summary)"
  params: { sectionId: string }

gofer_context_expand:
  description: "Expand a folded section to full content"
  params: { sectionId: string, lines?: string }

gofer_context_search:
  description: "Search across all context sections (folded and expanded)"
  params: { query: string, maxResults?: number }

gofer_context_fold:
  description: "Fold an expanded section back to summary"
  params: { sectionId: string }
```

### Architecture

```typescript
// extension/src/autonomous/ContextFolder.ts
export interface FoldedSection {
  id: string;
  title: string;
  level: 'collapsed' | 'summary' | 'expanded';
  collapsedView: string;    // title + token count
  summaryView: string;      // key-points summary
  fullContent: string;      // original content
  tokenEstimate: number;
  source: 'research' | 'memory' | 'observation' | 'code';
}

export class ContextFolder {
  private sections: Map<string, FoldedSection>;

  registerSection(section: FoldedSection): void;
  peek(sectionId: string): string;
  expand(sectionId: string, lineRange?: string): string;
  fold(sectionId: string): void;
  search(query: string): SearchResult[];
  getContextBudget(): { loaded: number; available: number; foldedCount: number };
}
```

### Integration

1. `ContextBuilder.buildContext()` registers all loaded sections with the
   `ContextFolder`
2. Sections start at `collapsed` level in context (just titles + token counts)
3. Claude Code uses `gofer_context_peek` to read summaries and
   `gofer_context_expand` to load full content when needed
4. `gofer_context_search` enables grep across folded sections without expanding

### Scope Limitation (Foundation Only)

This US builds the **infrastructure** — the `ContextFolder` class, the 4 MCP
tools, and the ContextBuilder integration. It does NOT:
- Automatically fold/unfold based on heuristics
- Implement the full RLM REPL environment
- Do recursive multi-level folding

These are future enhancements once the foundation is validated.

### Acceptance Criteria

- [ ] `ContextFolder` class with fold/unfold/search operations
- [ ] 4 new MCP tools registered in toolHandler.ts
- [ ] ContextBuilder registers loaded sections with ContextFolder
- [ ] `gofer_context_peek` returns collapsed or summary view
- [ ] `gofer_context_expand` returns full content (or line range)
- [ ] `gofer_context_search` searches across all sections (regex)
- [ ] `gofer_context_fold` folds expanded section back to summary
- [ ] Budget tracking: ContextFolder reports loaded vs. available tokens
- [ ] CLAUDE.md updated with instructions to use fold/unfold tools
- [ ] Unit tests for all ContextFolder operations

---

## US5 — Progressive Context Delegation (F5/G3: 0/5 → 3/5)

**Problem**: Sub-agents exist but are always-available/always-optional. As
context fills, Claude Code should increasingly delegate to sub-agents to
preserve its main context window, but nothing drives this behavior today.

**Solution**: A 3-channel delegation system that progressively pressures
Claude Code to use sub-agents as context utilization increases.

### Delegation Tiers

| Utilization | Tier | Behavior |
|:-:|---|---|
| < 50% | **Normal** | Sub-agents available, not specifically recommended |
| 50-65% | **Recommend** | Health tool recommendations suggest sub-agents |
| 65-80% | **Prefer** | Hook stdout injects delegation reminders per tool call |
| > 80% | **Require** | Strong instructions + auto-reseed if delegation not used |

### Channel 1: Health Recommendations (Pull)

Enhance `ContextHealthMonitor.generateRecommendations()` to include delegation
directives based on utilization:

```typescript
// At 50%+
recommendations.push(
  'Consider using sub-agents (Task tool with codebase-locator, ' +
  'codebase-analyzer, codebase-pattern-finder) for file exploration ' +
  'to preserve context window.'
);

// At 65%+
recommendations.push(
  'IMPORTANT: Delegate all codebase exploration to sub-agents. ' +
  'Use codebase-locator to find files, then only Read specific ' +
  'files returned by the locator.'
);

// At 80%+
recommendations.push(
  'CRITICAL: Context is nearly full. Use ONLY sub-agents for all ' +
  'file reading and searching. Summarize findings concisely. ' +
  'Consider running gofer_trigger_handoff if quality is degrading.'
);
```

The `gofer_get_context_health` MCP tool already returns these recommendations.
Pipeline commands (`/5_gofer_implement`) should instruct Claude Code to call
this tool periodically (every 5-10 tool calls).

### Channel 2: Hook Stdout Injection (Push)

Modify `post-tool-use.mjs` to output delegation reminders to stdout when
context pressure is high. Claude Code hooks that produce stdout have that
output appended to the conversation.

```javascript
// In post-tool-use.mjs, after writing bridge file:
if (utilizationPercent >= 65) {
  console.log(
    `[Context: ${utilizationPercent}%] Prefer sub-agents for exploration.`
  );
}
if (utilizationPercent >= 80) {
  console.log(
    `[Context: ${utilizationPercent}%] CRITICAL - delegate to sub-agents.`
  );
}
```

### Channel 3: StageContextProfile Delegation Policy

Add delegation configuration to stage profiles:

```typescript
interface StageContextProfile {
  // ... existing fields ...
  delegationPolicy: {
    recommendThreshold: number;  // default: 0.50
    preferThreshold: number;     // default: 0.65
    requireThreshold: number;    // default: 0.80
  };
}
```

This allows different stages to have different delegation pressure. For
example, the `research` stage might have higher thresholds (it needs to
explore broadly), while `implement` has lower thresholds (it should be
focused on specific files).

### CLAUDE.md Update

Add a section to CLAUDE.md instructing Claude Code to:

1. Call `gofer_get_context_health` every 10 tool calls during implementation
2. Follow delegation recommendations in the response
3. When context exceeds 65%, prefer `Task` tool sub-agents over direct
   Read/Grep/Glob calls
4. When context exceeds 80%, use ONLY sub-agents for exploration

### Acceptance Criteria

- [ ] `generateRecommendations()` includes delegation directives at 3 tiers
- [ ] `post-tool-use.mjs` outputs delegation reminders at 65%+ and 80%+
- [ ] `StageContextProfile` includes `delegationPolicy` with per-stage thresholds
- [ ] CLAUDE.md updated with progressive delegation instructions
- [ ] Pipeline commands (`/5_gofer_implement`) instruct periodic health checks
- [ ] Unit tests for recommendation generation at each utilization tier
- [ ] Integration test: hook stdout contains delegation message at threshold

---

## Protected Boundaries

- Do NOT modify `ClaudeSessionReader.ts` privacy guards
- Do NOT change the `MemoryStorage` JSONL format
- Do NOT break existing observation masking (US1 extends, not replaces)
- Do NOT make LLM calls mandatory (always provide non-LLM fallback)
- Do NOT modify the hook bridge JSON schema (extend only)
- Do NOT block context injection on LLM failures

## Dependencies

| US | Depends On | Reason |
|----|-----------|--------|
| US2 | US1 | Semantic compression enhances the key-points tier from US1 |
| US3 | None | Independent — wraps existing ResearchChunker |
| US4 | US1 (partial) | Fold/unfold pattern uses key-points concept from US1 |
| US5 | None | Independent — works with existing health monitoring |

**Recommended implementation order**: US1 → US5 → US3 → US2 → US4

## Estimated Impact

| Metric | Before | After | Improvement |
|--------|:------:|:-----:|:-----------:|
| Rubric score (300 max) | 178 | ~203 | +25 points |
| Rubric % | 59% | ~68% | +9% |
| Category B (Observation) | 60% | ~80% | +20% |
| Category D (Research) | 52% | ~68% | +16% |
| Category F (Stage-Aware) | 56% | ~68% | +12% |
| Category I (Advanced) | 16% | ~24% | +8% |
| Avg context savings (implement stage) | ~30% | ~55% | +25% |
