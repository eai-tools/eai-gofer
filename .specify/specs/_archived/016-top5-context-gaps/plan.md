---
feature: '016-top5-context-gaps'
spec: spec.md
research: ../010-gofer-memory-journey/context-management-rubric.md
status: ready
created: '2026-02-08'
---

# Implementation Plan: Top 5 Context Management Gaps

**Branch**: `016-top5-context-gaps` | **Spec**: spec.md **Rubric Source**:
`.specify/research/comprehensive-context-management-rubric.md`

## Summary

Close the 5 highest-impact gaps in the context management rubric by modifying 4
existing files and creating 2 new files. The work extends the existing
ObservationMasker with graduated decay, adds LLM-based semantic compression via
the council ProviderFactory, wraps ResearchChunker with a new summarizer,
introduces a ContextFolder for RLM-style fold/unfold operations, and enhances
the health monitor and hook script for progressive delegation.

## Technical Context

**Language/Version**: TypeScript 5.7.2, Node.js 20.x LTS **Primary
Dependencies**: `@anthropic-ai/sdk` (existing), `@google/generative-ai`
(existing), VSCode Extension API **Testing**: Vitest for unit tests **Target
Platform**: VSCode Extension + Language Server (LSP)

### Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                     Claude Code Session                           │
│                                                                   │
│  post-tool-use.mjs ──writes──▶ context-bridge.json               │
│       │ (US5: adds stdout delegation messages)                    │
│       ▼                                                           │
│  [stdout] ──push──▶ Claude Code context (delegation reminders)   │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ (VSCode FileSystemWatcher)
┌──────────────────────────────────────────────────────────────────┐
│                     Extension (VSCode)                             │
│                                                                   │
│  HookBridgeWatcher ──bridge-update──▶ ContextBuilder              │
│       │                                    │                      │
│       │                    ┌───────────────┼──────────────┐       │
│       │                    ▼               ▼              ▼       │
│       │            ObservationMasker  ResearchSummarizer  ContextFolder │
│       │            (US1: 3-tier)     (US3: hierarchy)  (US4: fold)│
│       │            (US2: LLM opt.)        │                 │     │
│       │                    │               │                 │     │
│       │                    ▼               ▼                 ▼     │
│       │             ProviderFactory   ResearchChunker   MCP Tools  │
│       │            (Haiku for US2,US3)  (existing)     (4 new)    │
│       │                                                           │
│       ▼                                                           │
│  ContextHealthMonitor ──recommendations──▶ MCP tool response     │
│  (US5: delegation directives at 50%/65%/80%)                      │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ (LSP Connection)
┌──────────────────────────────────────────────────────────────────┐
│                     Language Server                                │
│                                                                   │
│  toolHandler.ts ── gofer_context_peek/expand/search/fold (US4)   │
│                 ── gofer_get_context_health (US5: enhanced recs)  │
└──────────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component            | File                                                 | Integration Type                                |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| ObservationMasker    | `extension/src/autonomous/ObservationMasker.ts`      | Modify: 3-tier decay                            |
| ContextBuilder       | `extension/src/autonomous/ContextBuilder.ts`         | Modify: wire ResearchSummarizer + ContextFolder |
| ContextHealthMonitor | `extension/src/autonomous/ContextHealthMonitor.ts`   | Modify: delegation recommendations              |
| StageContextProfile  | `extension/src/autonomous/StageContextProfile.ts`    | Modify: add delegationPolicy                    |
| ResearchSummarizer   | `extension/src/autonomous/ResearchSummarizer.ts`     | **New file**                                    |
| ContextFolder        | `extension/src/autonomous/ContextFolder.ts`          | **New file**                                    |
| MCP toolHandler      | `language-server/src/mcp/toolHandler.ts`             | Modify: 4 new tools                             |
| MCP server           | `language-server/src/server.ts`                      | Modify: tool definitions + dispatch             |
| Hook script          | `extension/resources/hook-scripts/post-tool-use.mjs` | Modify: stdout delegation                       |
| CLAUDE.md            | `CLAUDE.md`                                          | Modify: delegation instructions                 |

### Key Dependencies

- Existing `ObservationMasker` (527 lines) — extends, does not replace
- Existing `ResearchChunker` (814 lines) — wraps, does not modify
- Existing `ProviderFactory` singleton — reuses for Haiku calls
- Existing `ContextHealthMonitor` event system — extends recommendations
- Existing `StageContextProfile` + YAML loader — extends interface

## Constitution Check

- [x] **Test-Driven Development**: Unit tests for every new component and
      modification
- [x] **No External Service Dependencies**: LLM calls always have non-LLM
      fallbacks
- [x] **Backward Compatibility**: Cache version migration, interface extension
      not replacement
- [x] **Security**: No new credential handling; reuses existing ProviderFactory
      API key retrieval

---

## Implementation Phases

### Phase 1: Graduated Observation Decay (US1)

**Goal**: Replace binary masking with 3-tier decay (`full` → `key-points` →
`masked`)

**Files Modified**:

- `extension/src/autonomous/ObservationMasker.ts`

**Files Created**:

- `tests/unit/autonomous/ObservationMasker-decay.test.ts`

#### 1.1 Data Model Changes

Replace `masked: boolean` with `decayTier: DecayTier` across the
`ObservationEntry` interface and all consumers.

**ObservationMasker.ts changes**:

```typescript
// New type (add near line 25)
export type DecayTier = 'full' | 'key-points' | 'masked';

// ObservationEntry (line 51-74) — replace masked field
interface ObservationEntry {
  // ... existing fields unchanged ...
  decayTier: DecayTier; // was: masked: boolean
  keyPointsContent?: string; // new: generated summary
  keyPointsAt?: number; // new: when key-points tier set
  maskedAt?: number; // unchanged
}

// ObservationMaskerConfig (line 35-46) — add fraction
interface ObservationMaskerConfig {
  // ... existing fields unchanged ...
  keyPointsAgeFraction: number; // default: 0.6
}

// MaskResult (line 79-88) — add per-tier stats
interface MaskResult {
  maskedContent: string;
  maskedCount: number; // fully masked count
  keyPointsCount: number; // new: key-points tier count
  tokensSaved: number;
  maskedObservations: ObservationEntry[];
}
```

**Consumer updates** (6 external files reference `observation.masked` or
`maskedCount`):

| File                                                 | Line(s)       | Change                                                                        |
| ---------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `extension/src/constitutionProvider.ts`              | 328           | Read `observationStats.masked` → rename to `observationStats.fullyMasked`     |
| `extension/src/extension.ts`                         | 974, 976      | Display `masked` count → show `keyPoints` + `masked` counts                   |
| `extension/src/autonomous/ContextUsageLogger.ts`     | 336           | Log `maskedObservations` → log `maskedObservations` + `keyPointsObservations` |
| `extension/src/ui/ContextHealthStatusBar.ts`         | 562, 567, 777 | Display masked count → show both tiers                                        |
| `extension/src/autonomous/telemetryIntegration.ts`   | 333-341       | Track `masked` → track `decayTier`                                            |
| `tests/unit/autonomous/ObservationMasker.test.ts`    | 104, 233      | Assert `masked` → assert `decayTier`                                          |
| `tests/unit/autonomous/telemetryIntegration.test.ts` | 159, 180, 197 | Update telemetry assertions                                                   |

#### 1.2 Three-Tier maskOldObservations()

Rewrite `maskOldObservations()` (line 284-328) to apply graduated thresholds:

```typescript
public maskOldObservations(currentTurn: number): MaskResult {
  const keyPointsAge = Math.floor(
    this.config.ageThresholdTurns * this.config.keyPointsAgeFraction
  );
  // ... iterate cache ...
  // age < keyPointsAge            → skip (stays 'full')
  // keyPointsAge <= age < ageThreshold → transition to 'key-points'
  // age >= ageThreshold           → transition to 'masked'
  // shouldPreserve() still exempts error observations
}
```

Key logic:

- Observations at `decayTier: 'full'` with `age >= keyPointsAge` transition to
  `key-points`
- Observations at `decayTier: 'key-points'` with `age >= ageThresholdTurns`
  transition to `masked`
- Observations at `decayTier: 'masked'` are skipped (already terminal)
- `shouldPreserve()` returns true → stays at `full` regardless of age

#### 1.3 Key-Points Extraction

New method `generateKeyPoints(observation: ObservationEntry): string`:

```typescript
private generateKeyPoints(observation: ObservationEntry): string {
  switch (observation.type) {
    case 'file_read':
      return this.extractFileKeyPoints(observation.originalContent, observation.metadata);
    case 'command_output':
      return this.extractCommandKeyPoints(observation.originalContent);
    case 'search_result':
      return this.extractSearchKeyPoints(observation.originalContent);
    case 'test_output':
      return this.extractTestKeyPoints(observation.originalContent);
    case 'api_response':
      return this.extractApiKeyPoints(observation.originalContent);
  }
}
```

Extraction strategies:

| Type             | Strategy                                                                                     | Target Tokens |
| ---------------- | -------------------------------------------------------------------------------------------- | :-----------: |
| `file_read`      | First 3 lines + regex match `(export\|class\|function\|interface)` signatures + last 2 lines |     ~200      |
| `command_output` | First 5 lines + last 5 lines + any lines matching `/error\|warning\|failed/i`                |     ~200      |
| `search_result`  | File path list + match count + first 3 matching lines                                        |     ~150      |
| `test_output`    | Summary line (X passed, Y failed) + failed test names + first error message                  |     ~150      |
| `api_response`   | Status/shape extraction: top-level keys, array lengths, first error                          |     ~100      |

Each extractor produces a formatted string with `[KEY POINTS from {type}]`
header.

#### 1.4 Updated generatePlaceholder()

Make tier-aware:

```typescript
public generatePlaceholder(observation: ObservationEntry): string {
  if (observation.decayTier === 'key-points') {
    // Return the key-points content inline (readable)
    return `<!-- observation ${observation.id} (${observation.type}, ~${observation.tokenEstimate} tokens) -->\n${observation.keyPointsContent}`;
  }
  // 'masked' tier: existing XML placeholder
  return `<observation_masked id="..." type="..." tokens="..." />`;
}
```

#### 1.5 Cache Migration

Bump `SerializedCache.version` from 1 to 2. In `loadCacheFromDisk()`:

```typescript
if (data.version === 1) {
  // Migrate: masked:true → decayTier:'masked', masked:false → decayTier:'full'
  data.observations = data.observations.map((obs) => ({
    ...obs,
    decayTier: obs.masked ? 'masked' : 'full',
  }));
  delete obs.masked; // remove old field
  data.version = 2;
}
```

#### 1.6 Updated getStats()

Report per-tier counts:

```typescript
// In getStats() (line 502)
interface ObservationStats {
  total: number;
  full: number;
  keyPoints: number;
  masked: number;
  tokensSaved: number;
}
```

**Verification**:

- [ ] All 5 extraction strategies produce ≤200 tokens from 1000-token inputs
- [ ] Cache v1 → v2 migration preserves all observation data
- [ ] Existing tests updated and passing
- [ ] New decay test file covers all tier transitions

---

### Phase 2: Progressive Context Delegation (US5)

**Goal**: Dynamically pressure Claude Code to use sub-agents as context fills

**Files Modified**:

- `extension/src/autonomous/ContextHealthMonitor.ts`
- `extension/src/autonomous/StageContextProfile.ts`
- `extension/resources/hook-scripts/post-tool-use.mjs`
- `CLAUDE.md`

**Files Created**:

- `tests/unit/autonomous/delegation-recommendations.test.ts`

#### 2.1 Enhanced Recommendations

Modify `generateRecommendations()` (line 322-395 of ContextHealthMonitor.ts) to
add delegation-specific directives. The method already receives
`utilizationPercent` and `stage`. Add three tiers:

```typescript
// After existing category-specific recommendations (line ~375)

// Channel 1: Delegation recommendations
const profile = this.currentProfile; // need to receive or look up
const policy = profile?.delegationPolicy ?? DEFAULT_DELEGATION_POLICY;

if (utilization >= policy.recommendThreshold) {
  recommendations.push(
    'Consider using sub-agents (Task tool with codebase-locator, ' +
      'codebase-analyzer, codebase-pattern-finder) for file exploration ' +
      'to preserve context window.'
  );
}

if (utilization >= policy.preferThreshold) {
  recommendations.push(
    'IMPORTANT: Delegate all codebase exploration to sub-agents. ' +
      'Use codebase-locator to find files, then only Read specific ' +
      'files returned by the locator.'
  );
}

if (utilization >= policy.requireThreshold) {
  recommendations.push(
    'CRITICAL: Context is nearly full. Use ONLY sub-agents for all ' +
      'file reading and searching. Summarize findings concisely. ' +
      'Consider running gofer_trigger_handoff if quality is degrading.'
  );
}
```

The `generateRecommendations()` method needs access to the current stage
profile's delegation policy. Two options:

- Pass the profile as a parameter (cleaner)
- Store a reference to the profile loader (more coupled)

**Decision**: Pass the delegation policy as an optional parameter to
`generateRecommendations()`. This keeps the method testable and the monitor
decoupled from the profile loader.

#### 2.2 StageContextProfile Extension

Add `delegationPolicy` to the interface (line 38-56 of StageContextProfile.ts):

```typescript
export interface DelegationPolicy {
  recommendThreshold: number; // utilization fraction (0-1)
  preferThreshold: number;
  requireThreshold: number;
}

export interface StageContextProfile {
  // ... existing fields ...
  delegationPolicy: DelegationPolicy;
}
```

Default policies per stage:

| Stage     | Recommend | Prefer | Require | Rationale                         |
| --------- | :-------: | :----: | :-----: | --------------------------------- |
| research  |   0.55    |  0.70  |  0.85   | Needs broader exploration         |
| specify   |   0.50    |  0.65  |  0.80   | Standard                          |
| plan      |   0.50    |  0.65  |  0.80   | Standard                          |
| tasks     |   0.50    |  0.65  |  0.80   | Standard                          |
| implement |   0.45    |  0.60  |  0.75   | Should be focused, delegate early |
| validate  |   0.50    |  0.65  |  0.80   | Standard                          |

Also update `StageContextProfileLoader` to parse `delegationPolicy` from YAML
overrides, with fallback to defaults.

#### 2.3 Hook Stdout Injection

Modify `post-tool-use.mjs` to produce stdout when utilization exceeds
thresholds. The script already computes `utilizationPercent` in the bridge
object (line ~150).

Add after the `writeBridge()` call (after line 167):

```javascript
// Progressive delegation messages via stdout
const util = bridge.context?.utilizationPercent;
if (util && util >= 65) {
  const level = util >= 80 ? 'CRITICAL' : 'WARNING';
  const msg =
    util >= 80
      ? `[Context: ${Math.round(util)}%] CRITICAL - Use ONLY sub-agents (Task tool) for file reading and searching. Direct Read/Grep/Glob will fill context further.`
      : `[Context: ${Math.round(util)}%] Prefer sub-agents (Task tool with codebase-locator) for codebase exploration to preserve context.`;
  process.stdout.write(msg + '\n');
}
```

**Important caveat**: Claude Code PostToolUse hooks may or may not inject stdout
back into context. This needs verification. If stdout is not injected, this
channel is informational only and the MCP tool recommendations (Channel 1)
become the primary delivery mechanism.

#### 2.4 CLAUDE.md Update

Add a new section after "Context Window Management":

```markdown
## Progressive Delegation

As context fills during implementation, Gofer progressively recommends
delegating exploration to sub-agents:

- **50% utilization**: Recommendations suggest using sub-agents
- **65% utilization**: Hook messages remind you to delegate
- **80% utilization**: Strong pressure to use ONLY sub-agents

**During /5_gofer_implement**: Call `gofer_get_context_health` every 10 tool
calls and follow the delegation recommendations in the response.

When context exceeds 65%, prefer the Task tool with these agents:

- `codebase-locator` for finding files
- `codebase-analyzer` for understanding code
- `codebase-pattern-finder` for finding examples

When context exceeds 80%, use ONLY sub-agents for all exploration.
```

#### 2.5 Pipeline Command Update

Update `.claude/commands/5_gofer_implement.md` to include a periodic health
check instruction:

```markdown
**Context Management**: Call `gofer_get_context_health` every 10 tool calls
during implementation. Follow delegation recommendations.
```

**Verification**:

- [ ] Recommendations at 50%, 65%, 80% contain delegation-specific text
- [ ] StageContextProfile YAML can override delegation thresholds
- [ ] Hook script outputs delegation message at 65%+ utilization
- [ ] CLAUDE.md contains progressive delegation section

---

### Phase 3: Recursive Research Summarization (US3)

**Goal**: Reduce research context by 70%+ in implement/validate stages via
hierarchical summarization

**Files Created**:

- `extension/src/autonomous/ResearchSummarizer.ts`
- `tests/unit/autonomous/ResearchSummarizer.test.ts`

**Files Modified**:

- `extension/src/autonomous/ContextBuilder.ts` (wire summarizer)

#### 3.1 ResearchSummarizer Class

```typescript
// extension/src/autonomous/ResearchSummarizer.ts

import { ResearchChunker, ScoredChunk } from './ResearchChunker';
import { LLMProvider } from '../council/providers/LLMProvider';
import { GoferStage } from './StageContextProfile';
import * as fs from 'fs';
import * as path from 'path';

interface SummaryCache {
  version: number; // 1
  researchMtime: number; // mtime of research.md when summaries generated
  chunkSummaries: Record<string, string>; // chunkId → summary text
  abstract?: string; // single-paragraph abstract
}

interface SummarizedResult {
  content: string;
  tokenEstimate: number;
  level: 'full' | 'summary' | 'abstract';
  chunksUsed: number;
}

export class ResearchSummarizer {
  constructor(
    private chunker: ResearchChunker,
    private workspaceRoot: string,
    private llmProvider?: LLMProvider
  ) {}

  async loadForStage(
    specId: string,
    taskDescription: string,
    stage: GoferStage,
    chunkLimit?: number
  ): Promise<SummarizedResult | undefined>;

  private async summarizeChunkWithLLM(chunk: ScoredChunk): Promise<string>;
  private summarizeChunkDeterministic(chunk: ScoredChunk): string;
  private async generateAbstractWithLLM(summaries: string[]): Promise<string>;
  private generateAbstractDeterministic(summaries: string[]): string;
  private getCachePath(specId: string): string;
  private async loadCache(specId: string): Promise<SummaryCache | null>;
  private async saveCache(specId: string, cache: SummaryCache): Promise<void>;
}
```

#### 3.2 Stage-Based Loading Logic

```typescript
async loadForStage(specId, taskDescription, stage, chunkLimit = 5) {
  const chunks = await this.chunker.loadChunksForTask(specId, taskDescription, chunkLimit);
  if (!chunks?.length) return undefined;

  switch (stage) {
    case 'research':
    case 'specify':
      // Full content — no summarization
      return this.formatFull(chunks);

    case 'plan':
    case 'tasks':
      // Per-chunk summaries (~150 tokens each)
      return this.formatSummaries(specId, chunks);

    case 'implement':
    case 'validate':
      // Single abstract (~100 tokens)
      return this.formatAbstract(specId, chunks);
  }
}
```

#### 3.3 Deterministic Summarization (No API Key Fallback)

For `summarizeChunkDeterministic()`:

1. Extract all markdown headings (lines starting with `#`)
2. Extract first sentence of each paragraph (text before first `.` or `\n\n`)
3. Extract code block signatures (first line of each ` ``` ` block)
4. Concatenate with `\n` separator, truncate to ~150 tokens (~600 chars)

For `generateAbstractDeterministic()`:

1. Take first sentence of each chunk summary
2. Join with "; "
3. Truncate to ~100 tokens (~400 chars)

#### 3.4 LLM Summarization (With API Key)

For `summarizeChunkWithLLM()`:

```typescript
const response = await this.llmProvider.query({
  prompt:
    `Summarize this research section in ≤150 tokens. Preserve:\n` +
    `- Key findings and decisions\n` +
    `- File paths and code references\n` +
    `- Specific numbers and metrics\n\n` +
    `Section "${chunk.sectionTitle}":\n${chunk.content}`,
  maxTokens: 200,
  temperature: 0,
});
return response.content;
```

For `generateAbstractWithLLM()`:

```typescript
const response = await this.llmProvider.query({
  prompt:
    `Create a single-paragraph abstract (≤100 tokens) of these research findings:\n\n` +
    summaries.map((s, i) => `${i + 1}. ${s}`).join('\n'),
  maxTokens: 128,
  temperature: 0,
});
return response.content;
```

Both wrap in try/catch and fall back to deterministic methods on failure.

#### 3.5 Caching

Summary cache stored at `{specDir}/research-summaries.json`:

```json
{
  "version": 1,
  "researchMtime": 1707350400000,
  "chunkSummaries": {
    "chunk-001-overview": "The system uses...",
    "chunk-003-architecture": "Architecture follows..."
  },
  "abstract": "This research covers..."
}
```

Invalidation: Compare `research.md` mtime with `cache.researchMtime`. If
different, regenerate all summaries.

#### 3.6 ContextBuilder Integration

Modify `ContextBuilder` constructor to accept an optional `ResearchSummarizer`
and modify `loadResearchChunks()` (line 958) to use it:

```typescript
// In constructor (line 242), add parameter:
constructor(
  // ... existing params ...
  private researchSummarizer?: ResearchSummarizer,
) {
  // If no summarizer provided but chunker exists, create one
  if (!researchSummarizer && this.researchChunker) {
    this.researchSummarizer = new ResearchSummarizer(
      this.researchChunker,
      workspaceRoot,
    );
  }
}

// In loadResearchChunks() (line 958):
private async loadResearchChunks(specId: string, taskDescription: string) {
  if (this.researchSummarizer) {
    return this.researchSummarizer.loadForStage(
      specId, taskDescription, this.currentStage, this.config.researchChunkLimit
    );
  }
  // Existing chunker path as fallback
  return this.loadResearchChunksDirect(specId, taskDescription);
}
```

**Verification**:

- [ ] Research/specify stages return full chunks (no regression)
- [ ] Plan/tasks stages return ~150-token summaries per chunk
- [ ] Implement/validate stages return single ~100-token abstract
- [ ] Cache invalidates when research.md changes
- [ ] Without API key, deterministic summaries are usable
- [ ] With API key, LLM summaries preserve key references

---

### Phase 4: Semantic Observation Compression (US2)

**Goal**: Enhance key-points extraction with optional LLM-based compression

**Files Modified**:

- `extension/src/autonomous/ObservationMasker.ts` (add LLM compression)
- `extension/src/extension.ts` (wire LLM provider to masker)

**Files Created**:

- `tests/unit/autonomous/semantic-compression.test.ts`

#### 4.1 LLM Provider Integration

Add an optional `LLMProvider` to `ObservationMasker`:

```typescript
// New config fields
interface ObservationMaskerConfig {
  // ... existing + Phase 1 fields ...
  enableSemanticCompression: boolean;    // default: true
  maxCompressionCallsPerMinute: number;  // default: 10
  maxCompressionTokensPerSession: number; // default: 50000
}

// New method on ObservationMasker
public setLLMProvider(provider: LLMProvider): void {
  this.llmProvider = provider;
}
```

#### 4.2 Enhanced Key-Points Generation

Modify the Phase 1 `generateKeyPoints()` to attempt LLM compression first:

```typescript
private async generateKeyPointsAsync(observation: ObservationEntry): Promise<string> {
  if (this.llmProvider && this.canCompress()) {
    try {
      const result = await this.compressWithLLM(observation);
      this.compressionTokensUsed += result.usage.inputTokens + result.usage.outputTokens;
      this.compressionCallsThisMinute++;
      return result.content;
    } catch (error) {
      // Fall back to deterministic
    }
  }
  return this.generateKeyPoints(observation);  // Phase 1 deterministic fallback
}
```

#### 4.3 Rate Limiting and Cost Control

```typescript
private canCompress(): boolean {
  // Rate limit: max N calls per minute
  if (this.compressionCallsThisMinute >= this.config.maxCompressionCallsPerMinute) {
    return false;
  }
  // Cost cap: max N tokens per session
  if (this.compressionTokensUsed >= this.config.maxCompressionTokensPerSession) {
    return false;
  }
  return true;
}
```

Reset `compressionCallsThisMinute` via a 60-second interval timer.

#### 4.4 LLM Compression Prompt

```typescript
private async compressWithLLM(observation: ObservationEntry): Promise<QueryResponse> {
  return this.llmProvider.query({
    prompt: `Summarize this ${observation.type} output in ≤200 tokens.\n` +
      `Preserve: file paths, line numbers, function/class names, error messages, key values.\n` +
      `Drop: formatting, whitespace, boilerplate.\n\n` +
      `Original (${observation.tokenEstimate} tokens):\n${observation.originalContent}`,
    maxTokens: 256,
    temperature: 0,
    systemPrompt: 'You compress tool outputs for context efficiency. Be terse.',
  });
}
```

#### 4.5 Wiring in extension.ts

In the initialization code (around line 1370 where ContextBuilder and
ObservationMasker are set up):

```typescript
// After ObservationMasker is created
const apiKey = vscode.workspace
  .getConfiguration('gofer')
  .get<string>('anthropicApiKey');
if (apiKey) {
  try {
    const factory = getProviderFactory();
    const haiku = factory.createProvider(
      'anthropic',
      'claude-3-5-haiku-20241022'
    );
    observationMasker.setLLMProvider(haiku);
  } catch (e) {
    // No LLM compression — deterministic fallback is fine
  }
}
```

#### 4.6 Async Masking

The current `maskOldObservations()` is synchronous. Adding LLM calls makes it
async. This requires updating the signature and all callers:

```typescript
// Change from:
public maskOldObservations(currentTurn: number): MaskResult
// To:
public async maskOldObservations(currentTurn: number): Promise<MaskResult>
```

The caller in `ContextBuilder.buildContext()` (line 606) already runs in an
async context, so adding `await` is straightforward.

**Important**: If LLM compression is slow, observations that need compression
are queued and compressed in the background. The first call returns
deterministic key-points immediately; subsequent calls find the LLM result
cached and upgrade.

**Verification**:

- [ ] With API key: observations get LLM-compressed key-points
- [ ] Without API key: deterministic extraction (Phase 1) works unchanged
- [ ] Rate limiting caps calls at 10/minute
- [ ] Cost cap stops compression after 50k tokens
- [ ] LLM failures fall back silently to deterministic
- [ ] Compression tokens logged to context-usage.jsonl

---

### Phase 5: RLM Context Folding Foundation (US4)

**Goal**: Build fold/unfold infrastructure + 4 MCP tools

**Files Created**:

- `extension/src/autonomous/ContextFolder.ts`
- `tests/unit/autonomous/ContextFolder.test.ts`

**Files Modified**:

- `language-server/src/mcp/toolHandler.ts` (4 new tool handlers)
- `language-server/src/server.ts` (4 new tool definitions + dispatch cases)
- `extension/src/autonomous/ContextBuilder.ts` (register sections with folder)
- `CLAUDE.md` (fold/unfold instructions)

#### 5.1 ContextFolder Class

```typescript
// extension/src/autonomous/ContextFolder.ts

export type FoldLevel = 'collapsed' | 'summary' | 'expanded';
export type SectionSource =
  | 'research'
  | 'memory'
  | 'observation'
  | 'code'
  | 'constitution';

export interface FoldedSection {
  id: string; // Unique section identifier
  title: string; // Section heading
  level: FoldLevel; // Current fold state
  collapsedView: string; // title + token count + first sentence (~20 tokens)
  summaryView: string; // key-points summary (~200 tokens)
  fullContent: string; // original content
  tokenEstimate: number; // of full content
  source: SectionSource;
}

export interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  matchLine: string; // matching line content
  lineNumber: number;
}

export interface ContextBudgetReport {
  expandedTokens: number; // tokens from expanded sections
  summaryTokens: number; // tokens from summary sections
  collapsedTokens: number; // tokens from collapsed sections
  totalSections: number;
  foldedCount: number; // sections at collapsed or summary level
  expandedCount: number;
}

export class ContextFolder {
  private sections: Map<string, FoldedSection> = new Map();

  registerSection(section: FoldedSection): void;
  removeSection(sectionId: string): void;
  clear(): void;

  peek(sectionId: string): string | null; // returns summaryView
  expand(sectionId: string, lineRange?: string): string | null; // returns full or range
  fold(sectionId: string): void; // sets level to 'summary'
  search(query: string, maxResults?: number): SearchResult[];

  getSection(sectionId: string): FoldedSection | null;
  getAllSections(): FoldedSection[];
  getBudgetReport(): ContextBudgetReport;

  // Render the current state as a string for context injection
  renderForContext(): string;
}
```

#### 5.2 Section Registration in ContextBuilder

After `mergeContextSections()` in `buildContext()` (around line 618), register
sections with the ContextFolder:

```typescript
// Register sections for fold/unfold
if (this.contextFolder) {
  this.contextFolder.clear();

  if (sections.research) {
    this.contextFolder.registerSection({
      id: 'research',
      title: 'Research Context',
      level: 'expanded', // default: expanded during initial build
      collapsedView: `Research Context (${this.estimateTokens(sections.research)} tokens)`,
      summaryView: this.generateSectionSummary(sections.research),
      fullContent: sections.research,
      tokenEstimate: this.estimateTokens(sections.research),
      source: 'research',
    });
  }
  // ... similar for memories, hints, observations, constitution
}
```

The `renderForContext()` method generates a table of contents showing all
sections with their fold state, enabling Claude Code to understand what's
available without loading everything.

#### 5.3 MCP Tool Definitions

Add to `server.ts` tools array (after existing tools, ~line 343):

```typescript
{
  name: 'gofer_context_peek',
  description: 'Show summary view of a context section without expanding it fully',
  parameters: {
    type: 'object',
    properties: {
      sectionId: { type: 'string', description: 'Section ID (e.g., "research", "memories")' },
    },
    required: ['sectionId'],
  },
},
{
  name: 'gofer_context_expand',
  description: 'Expand a folded context section to see full content',
  parameters: {
    type: 'object',
    properties: {
      sectionId: { type: 'string', description: 'Section ID to expand' },
      lines: { type: 'string', description: 'Optional line range (e.g., "1-50")' },
    },
    required: ['sectionId'],
  },
},
{
  name: 'gofer_context_search',
  description: 'Search across all context sections (folded and expanded) for a pattern',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Regex pattern to search for' },
      maxResults: { type: 'number', description: 'Max results (default 10)' },
    },
    required: ['query'],
  },
},
{
  name: 'gofer_context_fold',
  description: 'Fold an expanded context section back to summary view to save context',
  parameters: {
    type: 'object',
    properties: {
      sectionId: { type: 'string', description: 'Section ID to fold' },
    },
    required: ['sectionId'],
  },
},
```

#### 5.4 MCP Tool Handlers

In `toolHandler.ts`, add 4 methods to `MCPToolHandler`. These read/write a
shared state file at `.specify/memory/context-folder-state.json` (same pattern
as `context-health-state.json` and `observation-cache/index.json`):

```typescript
async contextPeek(params: { sectionId: string }): Promise<ContextPeekResponse>;
async contextExpand(params: { sectionId: string; lines?: string }): Promise<ContextExpandResponse>;
async contextSearch(params: { query: string; maxResults?: number }): Promise<ContextSearchResponse>;
async contextFold(params: { sectionId: string }): Promise<ContextFoldResponse>;
```

Each handler:

1. Reads `context-folder-state.json`
2. Finds the section
3. Returns the appropriate view (collapsed/summary/full)
4. For `expand` and `fold`: updates the state file so subsequent reads reflect
   the new level

#### 5.5 State Persistence

The ContextFolder writes state to `.specify/memory/context-folder-state.json`
after each mutation (expand/fold). Format:

```json
{
  "version": 1,
  "sections": [
    {
      "id": "research",
      "title": "Research Context",
      "level": "expanded",
      "tokenEstimate": 5000,
      "source": "research"
    }
  ],
  "lastUpdated": 1707350400000
}
```

Full content is NOT persisted to the state file (it's already on disk in
research.md, memories.jsonl, etc.). The state file only tracks fold levels and
metadata. The MCP tool handlers read the actual content from the original source
files when `expand` is called.

#### 5.6 CLAUDE.md Instructions

Add to CLAUDE.md:

```markdown
## Context Folding (RLM Foundation)

Gofer provides fold/unfold MCP tools for managing what's loaded in context:

- `gofer_context_peek` — View a summary of a section without loading it fully
- `gofer_context_expand` — Load full content of a section (or a line range)
- `gofer_context_search` — Search across all sections without expanding them
- `gofer_context_fold` — Fold a section back to summary to free context

Use these tools when context is filling up to selectively load only what you
need for the current task.
```

**Verification**:

- [ ] ContextFolder tracks sections with 3 fold levels
- [ ] `peek` returns summary without expanding
- [ ] `expand` returns full content (or line range)
- [ ] `search` finds matches across all sections regardless of fold state
- [ ] `fold` changes level to summary
- [ ] State persists to JSON file
- [ ] 4 MCP tools registered and dispatched correctly
- [ ] Unit tests cover all operations

---

## File Structure

```text
extension/src/autonomous/
├── ObservationMasker.ts          # Modified: 3-tier decay + LLM compression
├── ContextBuilder.ts             # Modified: wire ResearchSummarizer + ContextFolder
├── ContextHealthMonitor.ts       # Modified: delegation recommendations
├── ContextFolder.ts              # NEW: fold/unfold operations
├── ResearchSummarizer.ts         # NEW: hierarchical research summarization
├── StageContextProfile.ts        # Modified: delegationPolicy field
└── ResearchChunker.ts            # Unchanged (wrapped by ResearchSummarizer)

extension/resources/hook-scripts/
└── post-tool-use.mjs             # Modified: stdout delegation messages

language-server/src/
├── server.ts                     # Modified: 4 new tool definitions
└── mcp/toolHandler.ts            # Modified: 4 new tool handlers

tests/unit/autonomous/
├── ObservationMasker-decay.test.ts     # NEW: graduated decay tests
├── semantic-compression.test.ts         # NEW: LLM compression tests
├── ResearchSummarizer.test.ts           # NEW: summarization tests
├── ContextFolder.test.ts                # NEW: fold/unfold tests
└── delegation-recommendations.test.ts   # NEW: delegation tier tests

CLAUDE.md                          # Modified: delegation + folding instructions
```

## Risk Assessment

| Risk                                         | Impact | Mitigation                                                                   |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| LLM compression adds latency                 | Medium | Async compression with immediate deterministic fallback                      |
| Hook stdout not read by Claude Code          | Medium | Primary channel is MCP tool recommendations (pull); hook stdout is secondary |
| Cache migration breaks existing data         | High   | Version check + migration code + silent fallback to fresh cache              |
| Async maskOldObservations breaks callers     | Medium | Only one caller (ContextBuilder.buildContext) which is already async         |
| ProviderFactory unavailable in some contexts | Low    | All LLM features have non-LLM fallback paths                                 |

## Spec Traceability

### User Story Coverage

| Story                                   | Status  | Plan Phase(s) |
| --------------------------------------- | ------- | ------------- |
| US1: Graduated Observation Decay        | COVERED | Phase 1       |
| US2: Semantic Observation Compression   | COVERED | Phase 4       |
| US3: Recursive Research Summarization   | COVERED | Phase 3       |
| US4: MIT RLM Context Folding Foundation | COVERED | Phase 5       |
| US5: Progressive Context Delegation     | COVERED | Phase 2       |

### Acceptance Criteria Coverage

| US  | AC                          | Plan Component                       | Phase |
| --- | --------------------------- | ------------------------------------ | ----- |
| US1 | decayTier field             | 1.1 Data Model Changes               | 1     |
| US1 | 3-tier transitions          | 1.2 maskOldObservations()            | 1     |
| US1 | ~200 token key-points       | 1.3 Key-Points Extraction            | 1     |
| US1 | tier-aware placeholder      | 1.4 generatePlaceholder()            | 1     |
| US1 | cache v2 migration          | 1.5 Cache Migration                  | 1     |
| US1 | error preservation          | 1.2 shouldPreserve unchanged         | 1     |
| US1 | per-tier MaskResult         | 1.1 Data Model Changes               | 1     |
| US1 | inline key-points           | 1.4 generatePlaceholder()            | 1     |
| US1 | unit tests                  | ObservationMasker-decay.test.ts      | 1     |
| US2 | LLM compression             | 4.2 Enhanced Key-Points              | 4     |
| US2 | no-API-key fallback         | 4.2 Falls back to Phase 1            | 4     |
| US2 | graceful failure            | 4.2 try/catch → deterministic        | 4     |
| US2 | rate limiting               | 4.3 Rate Limiting                    | 4     |
| US2 | cost tracking               | 4.4 Logged to JSONL                  | 4     |
| US2 | preserve references         | 4.4 LLM prompt preserves them        | 4     |
| US2 | mock tests                  | semantic-compression.test.ts         | 4     |
| US3 | ResearchSummarizer class    | 3.1 Class definition                 | 3     |
| US3 | full for research/specify   | 3.2 Stage-based loading              | 3     |
| US3 | summaries for plan/tasks    | 3.2 + 3.4 LLM/deterministic          | 3     |
| US3 | abstract for implement      | 3.2 + 3.4 LLM/deterministic          | 3     |
| US3 | caching with invalidation   | 3.5 Summary cache                    | 3     |
| US3 | no-API-key fallback         | 3.3 Deterministic methods            | 3     |
| US3 | ContextBuilder wired        | 3.6 Integration                      | 3     |
| US3 | 70%+ reduction              | 3.2 Abstract ≤100 tokens             | 3     |
| US3 | unit tests                  | ResearchSummarizer.test.ts           | 3     |
| US4 | ContextFolder class         | 5.1 Class definition                 | 5     |
| US4 | 4 MCP tools                 | 5.3 + 5.4 Definitions + handlers     | 5     |
| US4 | section registration        | 5.2 ContextBuilder integration       | 5     |
| US4 | peek returns summary        | 5.4 contextPeek handler              | 5     |
| US4 | expand returns full         | 5.4 contextExpand handler            | 5     |
| US4 | search across sections      | 5.4 contextSearch handler            | 5     |
| US4 | fold to summary             | 5.4 contextFold handler              | 5     |
| US4 | budget tracking             | 5.1 getBudgetReport()                | 5     |
| US4 | CLAUDE.md updated           | 5.6 Instructions                     | 5     |
| US4 | unit tests                  | ContextFolder.test.ts                | 5     |
| US5 | delegation recommendations  | 2.1 Enhanced generateRecommendations | 2     |
| US5 | hook stdout                 | 2.3 post-tool-use.mjs                | 2     |
| US5 | delegationPolicy in profile | 2.2 StageContextProfile              | 2     |
| US5 | CLAUDE.md updated           | 2.4 Delegation section               | 2     |
| US5 | pipeline command update     | 2.5 /5_gofer_implement               | 2     |
| US5 | recommendation tests        | delegation-recommendations.test.ts   | 2     |
| US5 | hook integration test       | delegation-recommendations.test.ts   | 2     |

**Coverage**: 100% of user stories, 100% of acceptance criteria
