---
date: 2026-03-19T21:45:00Z
researcher: Claude Sonnet 4.5
feature: '029-memory-system-v2'
status: complete
---

# Research: Memory System v2 - Agent Memory Architecture

## Feature Summary

Design and implement a comprehensive memory system that serves all Gofer agents
(main pipeline, validation sub-agents, multi-perspective sub-agents) with
measurable quality improvements. Target: 10-15% higher validation scores, <50k
context token usage by pipeline stage 5, and <5% repeated mistake rate.

---

## Executive Summary

### Current State Analysis

**Gofer already implements a sophisticated memory system** with ~3,700 LOC of
context management infrastructure:

- **MemoryManager** - JSONL-backed storage with in-memory indexing
- **ContextBuilder** - Stage-aware context assembly with progressive loading
- **MemoryLayerManager** - Three-tier MemGPT-inspired architecture
  (core/recall/archival)
- **SubAgentDispatcher** - Utilization-triggered delegation recommendations
- **ACCOrchestrator** - 5-stage adaptive context compaction (70-99% thresholds)

**Critical Finding**: The current auto-chain architecture accumulates 100-150k
tokens by pipeline stage 5 because each stage invokes the next in the same
Claude Code session. Context grows ~20-30k per stage from cumulative spec
artifacts.

### Competitive Landscape

**OpenViking** (ByteDance's context database) achieves 91-96% token reduction
through:

- **L0/L1/L2 tiered loading** - Abstract (100 tokens) → Overview (2k) → Detail
  (unlimited)
- **Filesystem paradigm** - `viking://` URIs with hierarchical organization
- **Automatic memory extraction** - LLM extracts 6 memory types at session end
- **Directory recursive retrieval** - Find folder first, then fragment
  (preserves context structure)

**Letta/MemGPT, LangChain, Mem0** converge on:

- Three-tier memory (transient → short-term → long-term semantic)
- Graph-based entity relationships for multi-hop reasoning
- Adaptive importance weighting for selective forgetting
- Hybrid vector + knowledge graph retrieval

### Key Gap Identified

**Sub-agent memory handoff is ad-hoc**: Validation agents receive file paths
only and load artifacts directly. No pre-built context injection, no shared
memory access during execution, no structured completion reports fed back to
memory.

---

## 1. Codebase Analysis - Where to Implement

### Core Memory Infrastructure (Existing)

| Component              | Location                                         | Purpose                              | Lines  |
| ---------------------- | ------------------------------------------------ | ------------------------------------ | ------ |
| **MemoryManager**      | `extension/src/autonomous/MemoryManager.ts`      | Primary CRUD + search                | 1,100+ |
| **MemoryStorage**      | `extension/src/autonomous/MemoryStorage.ts`      | JSONL backend with hash IDs          | 400+   |
| **MemoryLayerManager** | `extension/src/autonomous/MemoryLayerManager.ts` | 3-tier access (core/recall/archival) | 94     |
| **ContextBuilder**     | `extension/src/autonomous/ContextBuilder.ts`     | Stage-aware context assembly         | 1,663  |
| **ContextUsageLogger** | `extension/src/autonomous/ContextUsageLogger.ts` | JSONL event logging                  | 700+   |
| **SubAgentDispatcher** | `extension/src/autonomous/SubAgentDispatcher.ts` | Delegation recommendations           | 273    |
| **ACCOrchestrator**    | `extension/src/autonomous/ACCOrchestrator.ts`    | 5-stage compaction                   | 150+   |

### Memory Storage Locations

| Storage         | Path                                    | Format            | Scope                        |
| --------------- | --------------------------------------- | ----------------- | ---------------------------- |
| Local memories  | `.specify/memory/memories.jsonl`        | JSONL append-only | Per workspace                |
| Long memories   | `.specify/memory/memory-notes/{id}.md`  | Markdown + YAML   | Content >500 chars           |
| Archive         | `.specify/memory/archive.jsonl`         | JSONL             | Low-priority (>200 total)    |
| Global memories | VSCode `globalState`                    | Binary            | Cross-workspace              |
| Constitution    | `.specify/memory/constitution.md`       | Markdown          | Project principles           |
| Checkpoints     | `.specify/memory/checkpoints/`          | JSON              | Stage transitions (100+)     |
| Context bridge  | `.specify/memory/enriched-context.json` | JSON              | Extension ↔ Language Server |
| Knowledge graph | `.specify/memory/knowledge-graph.json`  | JSON              | Entity relationships         |

### Sub-Agent Dispatch Patterns (Current)

**Validation Agents** (`.claude/commands/6_gofer_validate.md:136-150`):

```markdown
# Spawn 6 agents in parallel via Task tool

- validation-correctness (Sonnet)
- validation-test-quality (Haiku)
- validation-security (Haiku)
- validation-performance (Haiku)
- validation-integration (Haiku)
- validation-standards (Haiku)

Each receives:

- feature_dir: path to .specify/specs/{feature}/
- spec_path, plan_path, tasks_path
- NO pre-built context from ContextBuilder
```

**Research Agents** (`.claude/commands/1_gofer_research.md:96-129`):

```markdown
# Spawn 3 agents in parallel (MANDATORY)

- codebase-locator (Haiku)
- codebase-analyzer (Sonnet)
- codebase-pattern-finder (Haiku)

# Optional multi-perspective (lines 133-199)

- research-perspective-multiplier (5 Haiku + 1 Sonnet judge)
- research-dependency-evaluator (3 Haiku + 1 Sonnet judge)
- research-horizon-scanner (1 Sonnet)
```

**Key Insight**: Sub-agents run in **isolated 200k contexts**. They don't share
the main context's ContextBuilder-assembled memory. They load files directly via
Read/Grep/Glob tools.

---

## 2. Integration Points - Memory Access Patterns

### Memory-First Loading (ContextBuilder Pattern)

**Location**: `extension/src/autonomous/ContextBuilder.ts:816-875`

**Algorithm**:

```
1. Extract task keywords via TF-IDF
2. Load memories by priority (limit 10)
3. Calculate coverage: matched keywords / total keywords
4. IF coverage < 30%:
     Load research docs and hints
   ELSE:
     Skip research (memories cover task)
5. Record loading decision for observability
```

**Coverage Calculation** (lines 1151-1206):

- Trigram similarity (threshold 0.3) for fuzzy keyword matching
- Memory tags + category + content keywords extracted via TF-IDF
- Coverage % = (covered keywords / total keywords) \* 100

**Benefits**:

- ~60% context reduction when memories adequately cover task
- Explicit tracking of why research was loaded/skipped
- Adaptive to memory quality

### Priority-Weighted Memory Scoring

**Location**: `extension/src/autonomous/MemoryManager.ts:913-938`

**Formula**:

```
Priority = (usageScore * 0.4) + (recencyScore * 0.35) + (ageBonus * 0.25)

Where:
  usageScore = min(100, log10(usedCount + 1) * 50)
  recencyScore = max(0, 100 - (daysSinceLastUsed / 30) * 100)
  ageBonus = min(100, (daysOld / 90) * 100 * min(1, usedCount / 5))
```

**Key Properties**:

- Logarithmic usage scaling prevents recency bias
- 30-day decay window for recency
- Age bonus rewards "evergreen" memories (old but frequently used)

### Related Memory Linking (Zettelkasten)

**Location**: `extension/src/autonomous/MemoryManager.ts:274-316`

**Pattern**:

- Compute keyword overlap (Jaccard similarity) at save time
- Store top 3 related memories with similarity scores
- Maintain bidirectional back-references
- BFS traversal up to depth 3 via `traverseRelated()` (lines 130-159)

**Use Case**: Multi-hop queries when agents need context synthesis (e.g., "find
all memories about authentication that relate to sessions")

### Context Bridge for Cross-Process IPC

**Location**: `extension/src/autonomous/ContextBridgeWriter.ts:61`

**Flow**:

```
Extension (ContextBuilder)
  ↓ writes
enriched-context.json (atomic temp file + rename)
  ↓ reads
Language Server (MCP tool handler)
  ↓ returns in tool response
Claude Code
```

**Freshness**: 60-second staleness check
(`.specify/scripts/bash/check-context-health.sh`)

**Sections**:

- Constitution
- Hints
- Memories (formatted by cognitive type)
- Research chunks
- Code entities (from KnowledgeGraph)

---

## 3. Existing Patterns to Follow

### Pattern 1: Three-Tier Memory Architecture (MemGPT-Inspired)

**Found In**: `extension/src/autonomous/MemoryLayerManager.ts:68-88`

**Implementation**:

```typescript
interface MemoryLayerConfig {
  recallLimit: number; // Max 20 memories
  recallWindowMs: number; // 1 hour default
  coreTags: string[]; // Always loaded
  coreCategories: string[]; // Always loaded
}

DEFAULT_CONFIG = {
  recallLimit: 20,
  recallWindowMs: 60 * 60 * 1000,
  coreTags: ['#task-context', '#key-decision', '#core'],
  coreCategories: ['task_context', 'decisions'],
};
```

**Usage in ContextBuilder** (lines 889-906):

```typescript
if (this.useLayeredMemory && this.memoryLayerManager) {
  const layeredContent = await this.memoryLayerManager.formatAsContextSection(
    task.description
  );
  sections.memories = layeredContent;
}
```

**Why Relevant**: Bounds context usage while preserving critical context. Core
memories always load (<2k tokens), recall window gates on recency, archival
searched on demand.

---

### Pattern 2: Progressive Delegation (SubAgentDispatcher)

**Found In**: `extension/src/autonomous/SubAgentDispatcher.ts:54-89`

**Thresholds**:

```typescript
const DELEGATION_MAP = [
  {
    minUtilization: 0.5,
    agentType: 'codebase-locator',
    enforcement: 'advisory',
    tokenBudget: 2000,
  },
  {
    minUtilization: 0.6,
    agentType: 'codebase-analyzer',
    enforcement: 'warning',
    tokenBudget: 1500,
  },
  {
    minUtilization: 0.7,
    agentType: 'codebase-pattern-finder',
    enforcement: 'blocking',
    tokenBudget: 1000,
  },
];
```

**Result Truncation** (lines 190-201):

```typescript
truncateResult(result: string, maxTokens?: number): string {
  const budget = maxTokens ?? this.currentRecommendation?.tokenBudget ?? 2000;
  const maxChars = budget * 4; // ~4 chars per token

  const headSize = Math.floor(maxChars * 0.7);  // Keep 70% from start
  const tailSize = Math.floor(maxChars * 0.2);  // Keep 20% from end

  return `${head}\n\n[...truncated ${truncatedChars} chars...]...\n\n${tail}`;
}
```

**Why Relevant**: Graduated enforcement (advisory → warning → blocking) prevents
all-or-nothing delegation. Token-budgeted results prevent sub-agent output from
exploding main context.

---

### Pattern 3: Observable Context Loading

**Found In**: `extension/src/autonomous/ContextBuilder.ts:724-788`

**Loading Decisions Tracked**:

```typescript
interface LoadingDecision {
  source: 'memory' | 'research' | 'hints' | 'knowledge-graph' | 'observations';
  decision: 'loaded' | 'skipped' | 'blocked';
  reason: string;
  tokens?: number;
}

// Emitted as events and logged to context-usage.jsonl
this.emit('loading-decision', decision);
```

**Example Log Entry**:

```json
{
  "eventType": "loading_decision",
  "source": "research",
  "decision": "skipped",
  "reason": "Coverage 85.3% meets threshold 30%",
  "timestamp": "2026-03-19T21:45:00Z"
}
```

**Why Relevant**: Makes memory retrieval observable. Enables debugging "why
didn't the agent see this context?" and tuning retrieval thresholds.

---

### Pattern 4: Observation Masking with Three-Tier Decay

**Found In**: `extension/src/autonomous/ObservationMasker.ts:25-108`

**Decay Tiers**:

```typescript
type DecayTier = 'full' | 'key-points' | 'masked';

// At 60% of age threshold: full → key-points (summarized)
// At 100% of age threshold: key-points → masked (1-line placeholder)
```

**Cache Preservation**:

- Original observations kept in cache even when masked
- Cache stored in `.specify/memory/observation-cache/`
- User can expand via `gofer_expand_observation [id]`

**Per-Type Decay Overrides**:

```typescript
perTypeDecay?: {
  error_logs: { ageThresholdTurns: 20 },  // Errors stay longer
  test_output: { ageThresholdTurns: 5 },   // Tests decay faster
}
```

**Why Relevant**: Balances context efficiency with recoverability. Old
observations don't bloat context, but can be retrieved if needed.

---

### Pattern 5: Stage-Aware Budget Profiles

**Found In**: `extension/src/autonomous/StageContextProfile.ts`
(DEFAULT_PROFILES)

**Budget Allocation**:

```typescript
const PROFILES = {
  research: {
    researchBudget: 0.4, // 40% for research docs
    memoryBudget: 0.2, // 20% for memories
    codeBudget: 0.1, // 10% for code
    observationWindow: 15, // Keep 15 turns of observations
  },
  implement: {
    researchBudget: 0.15, // Low research, high code
    memoryBudget: 0.2,
    codeBudget: 0.3,
    observationWindow: 10,
  },
  validate: {
    researchBudget: 0.2,
    memoryBudget: 0.15,
    codeBudget: 0.25,
    observationWindow: 8, // Aggressive masking
  },
};
```

**Why Relevant**: Different stages need different context mixes. Research loads
specs heavily, implement loads code, validate balances both. Observation windows
tighten as stages progress to free tokens.

---

### Pattern 6: Checkpoint Validation (Warnings-Only)

**Found In**: `extension/src/autonomous/CheckpointValidator.ts:19-110`

**Validation Strategy**:

```typescript
validate(content: string): CheckpointValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check required YAML frontmatter fields
  const REQUIRED_FIELDS = ['session_id', 'timestamp', 'stage', 'status'];
  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter.includes(`${field}:`)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check token budget (non-fatal)
  const estimatedTokens = Math.ceil(content.length / 4);
  if (estimatedTokens > 8000) {
    warnings.push(`Checkpoint is ${estimatedTokens} tokens (budget: 8000)`);
  }

  return { valid: errors.length === 0, warnings, errors };
}
```

**Key Property**: Validation **never blocks saves**. Warnings are logged but
checkpoint is persisted regardless. Prevents data loss.

**Why Relevant**: Apply same pattern to memory validation - warn on quality
issues, but always persist.

---

## 4. Technology Decisions

### Decision 1: Tiered Context Loading (L0/L1/L2)

**Choice**: Implement OpenViking-inspired three-tier loading for memories and
spec artifacts

**Rationale**:

- **Proven results**: OpenViking achieves 91-96% token reduction
- **Gofer already has JSONL + markdown dual storage** - extend with
  abstract/overview layers
- **Aligns with existing MemoryLayerManager** - L0=core, L1=recall, L2=archival
  mapping
- **Backward compatible**: Add layers incrementally without breaking existing
  memory files

**Implementation Approach**:

```typescript
interface ContextLayer {
  abstract: string; // L0: ~100 tokens (one-sentence summary)
  overview: string; // L1: ~2k tokens (key points, navigation)
  detail: () => string; // L2: lazy-loaded full content
}

class LayeredMemory extends Memory {
  layers: ContextLayer;

  getAbstract(): string {
    return this.layers.abstract;
  }
  getOverview(): string {
    return this.layers.overview;
  }
  getDetail(): string {
    return this.layers.detail();
  }
}
```

**Alternatives Considered**:

- **Full OpenViking integration**: Rejected due to Python dependency + embedding
  model setup complexity
- **Status quo (no layers)**: Rejected - doesn't solve 100-150k token bloat
  problem
- **Binary load/skip only**: Rejected - loses middle ground between "nothing"
  and "everything"

---

### Decision 2: Filesystem Paradigm with URI Abstraction

**Choice**: Adopt `gofer://` URI scheme as abstraction layer over current file
system

**Rationale**:

- **OpenViking's `viking://` URIs are elegant** - deterministic paths + semantic
  search
- **Gofer already has hierarchical `.specify/` structure** - natural mapping to
  scopes
- **Enables progressive migration**: Add URIs as accessors, keep file backend
- **Sub-agents benefit**: Uniform memory access via `gofer://` instead of
  hardcoded paths

**URI Design**:

```typescript
interface GoferURI {
  scheme: 'gofer';
  scope: 'specs' | 'user' | 'agent' | 'session' | 'memory';
  path: string;
}

// Examples:
// gofer://specs/029-memory-system-v2/research.md
// gofer://memory/core/task-context.md
// gofer://agent/patterns/validation-best-practices.md
// gofer://session/current/checkpoint.md
```

**Scope Mapping**: | Scope | Current Path | Purpose |
|-------|--------------|---------| | `specs` | `.specify/specs/{feature}/` |
Feature specifications | | `memory` | `.specify/memory/` | Project-wide memories
| | `user` | `~/.claude/projects/.../memory/` | User preferences | | `agent` |
`.specify/memory/agent/` | Learned patterns | | `session` |
`.specify/specs/{feature}/session-*` | Active session state |

**Alternatives Considered**:

- **Keep raw file paths**: Rejected - harder for sub-agents to discover memory
- **Full filesystem rewrite**: Rejected - too disruptive, breaks existing
  workflows
- **HTTP API**: Rejected - overkill for local-first extension

---

### Decision 3: Automatic Memory Extraction from Pipeline Runs

**Choice**: Extract lessons, patterns, and decisions from pipeline executions
automatically

**Rationale**:

- **OpenViking's session.commit() pattern** extracts 6 memory types at session
  end
- **Current manual updates to `tasks/lessons.md`** are lossy and skipped under
  time pressure
- **Validation failures are gold mines** - recurring issues should become
  persistent memories
- **LLM can extract salient facts** - pattern matching for common issues

**Extraction Pipeline**:

```typescript
class PipelineSession {
  stage: string;
  validationResults: ValidationReport[];
  engineeringReviewFindings: Finding[];
  corrections: Array<{ issue: string; fix: string }>;

  async commit(): Promise<{ memoriesExtracted: number }> {
    // 1. Extract patterns from validation failures
    const patterns = this.extractValidationPatterns();

    // 2. Extract lessons from engineering review
    const lessons = this.extractEngineeringLessons();

    // 3. Extract decisions from plan/spec
    const decisions = this.extractDecisions();

    // 4. Save to memory with appropriate categories
    await Promise.all([
      ...patterns.map((p) =>
        memoryManager.save({
          category: 'validation_pattern',
          type: 'procedural',
          content: p.content,
          tags: ['#validation', `#${p.category}`],
        })
      ),
      ...lessons.map((l) =>
        memoryManager.save({
          category: 'lesson',
          type: 'episodic',
          content: l.content,
          tags: ['#lesson', `#stage-${this.stage}`],
        })
      ),
    ]);

    return { memoriesExtracted: patterns.length + lessons.length };
  }
}
```

**Extraction Triggers**:

- After `/6_gofer_validate` completes → extract validation patterns
- After `/6a_gofer_engineering_review` completes → extract lessons
- After `/5_gofer_implement` completes → extract implementation patterns
- User correction events → extract preference memories

**Alternatives Considered**:

- **Manual extraction only**: Current state, rejected - too lossy
- **Full LLM analysis of every turn**: Rejected - too expensive (API calls)
- **Rule-based extraction**: Considered but insufficient - misses nuances

---

### Decision 4: Hybrid Directory + Semantic Search

**Choice**: Implement OpenViking's directory recursive retrieval pattern

**Rationale**:

- **Preserves hierarchy**: Find folder first, then fragment (not flat
  similarity)
- **Combines strengths**: Deterministic paths (fast, reliable) + semantic search
  (flexible)
- **Gofer has natural hierarchy**: `.specify/specs/{feature}/` already organized
  by feature
- **Enables scoped search**: "Find authentication patterns in feature 027" =
  search within `gofer://specs/027-*/`

**Algorithm** (adapted from OpenViking):

```typescript
class HybridRetriever {
  async find(query: string, scope?: GoferURI): Promise<MemoryResult[]> {
    // 1. Intent analysis - extract search conditions
    const conditions = this.analyzeIntent(query);

    // 2. Initial positioning - find high-score directory
    const topDir = await this.vectorSearch(conditions, scope);

    // 3. Refined exploration within directory
    const results = await this.searchWithinDirectory(topDir, query);

    // 4. Recursive drill-down into subdirectories
    if (topDir.hasSubdirectories) {
      const childResults = await Promise.all(
        topDir.children.map((child) => this.recursiveSearch(child, query))
      );
      results.push(...childResults.flat());
    }

    // 5. Aggregate and rank results
    return this.aggregateResults(results);
  }
}
```

**Benefits**:

- Observable retrieval trajectory (log directory path traversed)
- Preserves context structure (folder metadata included)
- Fast path for known locations: `read(gofer://memory/core/task-context.md)`

**Alternatives Considered**:

- **Pure vector search**: Rejected - loses hierarchical context
- **Pure path-based**: Rejected - requires knowing exact path beforehand
- **Full-text search only**: Rejected - no semantic understanding

---

### Decision 5: Sub-Agent Memory Access via Shared ContextBuilder

**Choice**: Pass pre-built context sections to sub-agents instead of file paths
only

**Rationale**:

- **Current pattern**: Validation agents receive `feature_dir` path, load files
  via Read tool
- **Problem**: No access to MemoryManager, no prioritized memory loading, no
  shared learnings
- **Solution**: ContextBuilder generates targeted context sections for each
  sub-agent type

**Sub-Agent Context Injection**:

```typescript
class SubAgentContextFactory {
  buildValidationContext(
    category: 'correctness' | 'security' | 'performance' | ...,
    featureDir: string
  ): string {
    // Load L0/L1 layers only (not full L2 details)
    const specAbstract = this.contextBuilder.loadLayer(
      `${featureDir}/spec.md`,
      'L1'
    );

    // Load memories relevant to this validation category
    const memories = this.memoryManager.loadByPriority({
      taskContext: `Validate ${category} for feature`,
      limit: 5,
      scope: 'local',
    });

    // Load past validation patterns for this category
    const patterns = this.memoryManager.search({
      category: 'validation_pattern',
      tags: [`#${category}`],
      limit: 3,
    });

    return this.formatContext({ specAbstract, memories, patterns });
  }
}
```

**Dispatch Pattern**:

```markdown
## Validation Agent Prompt

You are validating {{category}} for feature {{feature-name}}.

### Spec Overview (L1)

{{spec-abstract}}

### Relevant Memories

{{prioritized-memories}}

### Past Validation Patterns

{{category-specific-patterns}}

### Your Task

Evaluate the implementation against the spec for {{category}} concerns.
```

**Token Budget**: 5k-10k tokens per sub-agent (vs. 0 currently)

**Alternatives Considered**:

- **Status quo (file paths only)**: Rejected - agents rediscover patterns each
  time
- **Full context handoff**: Rejected - would pass 50k+ tokens to each agent
- **Embedding-based context**: Considered for future - requires vector DB setup

---

### Decision 6: Memory Consolidation as Background Task

**Choice**: Run consolidation async at 30-minute intervals (existing timer
pattern)

**Rationale**:

- **MemoryManager already has timer** (`MemoryManager.ts:96-114`)
- **Non-blocking**: Uses `setInterval` with async consolidation
- **Proven pattern**: Deduplication, archival, stale detection work well
- **Add extraction**: Extend consolidation to run LLM-based memory extraction

**Enhanced Consolidation**:

```typescript
class MemoryManager {
  private consolidationTimer?: NodeJS.Timer;

  startConsolidationTimer(): void {
    this.consolidationTimer = setInterval(
      async () => {
        try {
          // Existing: dedupe, compact, archive
          await this.consolidator.consolidate();

          // NEW: Extract memories from recent pipeline runs
          await this.extractFromPipelineRuns();

          // NEW: Update importance weights based on usage
          await this.updateImportanceScores();
        } catch (err) {
          this.logger.error('Consolidation failed (non-fatal)', err);
        }
      },
      30 * 60 * 1000
    ); // 30 minutes
  }
}
```

**Extraction Sources**:

- `.specify/logs/pipeline.jsonl` - Stage completion events
- `.specify/logs/context-usage.jsonl` - Memory access patterns
- `.specify/specs/{feature}/validation-report.md` - Validation findings
- `.specify/specs/{feature}/engineering-review-report.md` - Review findings

**Alternatives Considered**:

- **On-demand only**: Rejected - requires user discipline
- **After every stage**: Rejected - adds latency to pipeline
- **Real-time extraction**: Rejected - too expensive (LLM calls)

---

## 5. Constraints & Considerations

### Technical Constraints

1. **TypeScript ecosystem**: Solutions must be TypeScript-native (no Python
   bridges)
2. **VSCode extension architecture**: Cross-process IPC via files (extension
   host ↔ language server)
3. **Git-friendly storage**: JSONL/Markdown preferred over binary formats
4. **No external dependencies**: Avoid embedding models, vector DBs unless
   absolutely necessary
5. **Backward compatibility**: Existing memory files must continue to work

### Performance Constraints

1. **In-memory index scales to ~1000 memories**: Beyond that, need database or
   pagination
2. **JSONL rebuild at startup**: O(n) cost proportional to memory count
3. **Context bridge staleness**: 60-second window before data considered stale
4. **LLM consolidation is expensive**: Budget ~$0.001-0.01 per extraction

### Privacy Constraints

1. **No message content logging**: ClaudeSessionReader only accesses metadata
   (usage stats)
2. **Local-first**: Memories stored locally, not synced to cloud
3. **Global vs. local scope**: Users should control what's shared across
   workspaces

### User Experience Constraints

1. **Non-blocking validation**: Warnings only, never block saves
2. **Observable decisions**: Users should understand why memory was
   loaded/skipped
3. **Recoverability**: Masked observations can be expanded if needed
4. **Clear attribution**: Memories should indicate which agent created them

---

## 6. Context Token Usage - Problem Quantification

### Measured Data (from `context-usage.jsonl` and `pipeline.jsonl`)

**Feature 001-gofer-engineering-remediation**: | Stage | Tokens | Growth | % of
200k | |-------|--------|--------|-----------| | 1_research | 44,576 | baseline
| 22.3% | | 2_specify | 64,086 | +19,510 (+43.7%) | 32.0% | | 3_plan | 86,316 |
+22,230 (+34.7%) | 43.2% | | 4_tasks | 104,656 | +18,340 (+21.2%) | 52.3% | |
**5_implement (projected)** | **~125k-145k** | **+20k-40k** | **62-72%** | |
**6_validate (projected)** | **~150k-170k** | **+25k-40k** | **75-85%** |

**Growth Rate**: ~20-30k tokens per stage after research

**Primary Bloat Source**: Cumulative spec artifacts loaded into every subsequent
stage

- research.md (~20k-40k)
- spec.md (~10k-25k)
- plan.md (~15k-30k)
- tasks.md (~10k-20k)
- **Total spec files**: 55k-115k tokens

**System Overhead** (constant):

- CLAUDE.md, constitution.md, hints: ~13k tokens

**Council Usage Spikes** (from `council-usage.jsonl`):

- Individual Tool Use calls: 68k-122k tokens each
- Validation with 6 parallel agents: potentially 180k+ combined

### Root Cause: Auto-Chain Architecture

**Current Pattern** (`.claude/commands/1_gofer_research.md:336`):

```markdown
**AUTO-CHAIN (MANDATORY)**: You MUST immediately invoke the next pipeline stage
by calling the Skill tool with skill="/2_gofer_specify".
```

This keeps everything in a **single Claude Code session**, causing cumulative
context growth. Each stage inherits the full conversation history of all
previous stages.

### Planned Solution: Sub-Agent Dispatch

From MEMORY.md note:

> **Planned improvement**: Sub-agent dispatch architecture (feature
> 012-subagent-migration) would have `/0_business_scenario` dispatch each stage
> as a Task sub-agent with fresh 200k context, returning structured Completion
> Reports (~2k tokens).

**Token Budget Comparison**: | Architecture | Context by Stage 6 | Savings |
|--------------|-------------------|---------| | Current (auto-chain) |
150k-170k | baseline | | Sub-agent dispatch | ~12k (6 stages × 2k reports) |
**92% reduction** |

---

## 7. Sub-Agent Memory Updates and Reads (Priority Analysis)

### Current State: No Shared Memory Access During Execution

**Validation agents** (`.claude/commands/6_gofer_validate.md`):

- Receive: `feature_dir`, `spec_path`, `plan_path`, `tasks_path`
- Access method: Direct file reads via Read/Grep/Glob tools
- Memory access: **NONE** - agents cannot query MemoryManager
- Result format: Structured markdown report (<2000 tokens)

**Research agents** (`.claude/commands/1_gofer_research.md`):

- Receive: Feature description, codebase root
- Access method: Direct file/code exploration
- Memory access: **NONE** - agents start from zero knowledge
- Result format: Research findings, patterns, integration points

**Problem**: Agents rediscover the same patterns every time. No learning across
features.

### Priority 1: Read-Only Memory Access During Sub-Agent Execution

**Rationale**: Sub-agents should access past learnings to avoid rediscovery

**Implementation**: Inject prioritized memories into sub-agent prompt

**Example - Validation Agent Context**:

```markdown
## Past Validation Patterns (from memory)

### Security Validation Patterns

**Pattern**: SQL injection via string concatenation

- Found in: Features 023, 024, 027
- Detection: Grep for `"SELECT.*" + var` or `${var}` in SQL
- Citation: extension/src/db/queries.ts:45

**Pattern**: Missing input sanitization

- Found in: Features 019, 023
- Detection: Check if user input flows to sensitive sinks without validation
- Citation: extension/src/api/handlers.ts:89

[... 3-5 most relevant patterns ...]

## Your Task

Validate security for feature 029-memory-system-v2. Use the patterns above to
guide your analysis.
```

**Token Budget**: 5k-10k tokens (5-10 patterns × ~500 tokens each)

**Benefits**:

- Agents start with context, not from zero
- Consistent validation criteria across features
- Measurable quality improvement (fewer missed issues)

**Priority Level**: **HIGH** - directly impacts measurable quality improvement
goal

---

### Priority 2: Write-Back Memory Updates After Sub-Agent Completion

**Rationale**: Sub-agents discover new patterns that should be persisted

**Implementation**: Extract memories from sub-agent results

**Example - After Validation**:

```typescript
class ValidationOrchestrator {
  async processValidationResults(results: ValidationReport[]): Promise<void> {
    // Extract new patterns from findings
    for (const report of results) {
      for (const finding of report.findings) {
        if (finding.severity === 'red' && finding.pattern) {
          await this.memoryManager.save({
            category: 'validation_pattern',
            type: 'procedural',
            content: finding.pattern,
            tags: ['#validation', `#${report.category}`, '#red'],
            citations: finding.affectedFiles.map((f) => ({
              file: f.path,
              line: f.line,
            })),
            agentId: report.agentId,
          });
        }
      }
    }
  }
}
```

**Write-Back Triggers**: | Event | Memory Type | Category |
|-------|-------------|----------| | Validation Red finding | Procedural |
`validation_pattern` | | Engineering Review Yellow | Episodic | `lesson` | |
Research pattern found | Semantic | `codebase_pattern` | | User correction |
Prospective | `user_preference` |

**Priority Level**: **HIGH** - enables learning across features, reduces
repeated mistakes

---

### Priority 3: Real-Time Memory Updates During Long-Running Tasks

**Rationale**: Implementation stage can run for hours; intermediate learnings
should be saved

**Implementation**: Incremental memory commits during task execution

**Example - During Implementation**:

```typescript
class ImplementationAgent {
  async executeTask(task: Task): Promise<TaskResult> {
    // Execute task
    const result = await this.implementTask(task);

    // If task revealed a pattern, save immediately
    if (result.patternDiscovered) {
      await this.memoryManager.save({
        category: 'implementation_pattern',
        type: 'procedural',
        content: result.pattern,
        tags: ['#implement', `#${task.phase}`],
        scope: 'local',
      });
    }

    return result;
  }
}
```

**Use Cases**:

- Discovery of reusable utilities during implementation
- Error patterns encountered and fixed
- Performance optimizations that worked well

**Priority Level**: **MEDIUM** - nice-to-have for long sessions, not critical
for short features

---

### Priority 4: Transient vs. Durable Memory Separation

**Rationale**: Don't persist loop variables and intermediate state

**Implementation**: Separate APIs for transient and durable memory

**Example**:

```typescript
interface MemoryManager {
  // Durable: persisted to JSONL, survives sessions
  save(memory: Memory): Promise<string>;
  load(scope: 'local' | 'global'): Promise<Memory[]>;

  // Transient: in-memory only, cleared at session end
  setTransient(key: string, value: unknown): void;
  getTransient(key: string): unknown | undefined;
  clearTransient(): void;
}

// Usage in sub-agent
class ValidationAgent {
  async validate() {
    // Transient: loop iteration state
    memoryManager.setTransient('currentFile', 'path/to/file.ts');

    // Durable: discovered pattern
    await memoryManager.save({
      category: 'validation_pattern',
      content: 'Missing null check before array access',
    });
  }
}
```

**Priority Level**: **MEDIUM** - prevents memory bloat over time, but not urgent

---

### Priority 5: Memory Locking for Concurrent Sub-Agents

**Rationale**: Validation spawns 6 agents in parallel; prevent write conflicts

**Implementation**: Optimistic locking with last-writer-wins

**Example**:

```typescript
class MemoryStorage {
  async save(memory: Memory): Promise<string> {
    const id = this.generateId(memory);

    // Append-only JSONL = naturally concurrent
    // Last write wins (existing pattern)
    await this.appendToJsonl(memory);

    // Update in-memory index (mutex protected)
    await this.updateIndex(id, memory);

    return id;
  }
}
```

**Current State**: Already implemented via append-only JSONL + in-memory index

**Priority Level**: **LOW** - already handled by existing architecture

---

### Priority Matrix

| Feature                      | Impact on Goals     | Implementation Cost          | Priority |
| ---------------------------- | ------------------- | ---------------------------- | -------- |
| Read-only memory injection   | High (quality ↑)    | Low (extend ContextBuilder)  | **P0**   |
| Write-back after completion  | High (learning ↑)   | Medium (extraction logic)    | **P0**   |
| Tiered loading (L0/L1/L2)    | High (context ↓)    | High (new abstraction)       | **P1**   |
| Real-time updates            | Medium (UX)         | Medium (incremental commits) | **P2**   |
| Transient/durable separation | Medium (bloat ↓)    | Low (API extension)          | **P2**   |
| Concurrent locking           | Low (already works) | None                         | **P3**   |

---

## 8. OpenViking Integration Opportunities

### Adoptable Patterns (No Full Integration Needed)

1. **L0/L1/L2 tiered loading** - Extend existing JSONL + markdown dual storage
2. **`gofer://` URI scheme** - Abstraction layer over current file paths
3. **Directory recursive retrieval** - Hybrid path + semantic search
4. **Automatic memory extraction** - Session commit pattern
5. **Observable retrieval trajectories** - Log directory traversal decisions

### Full Integration Analysis

**If we adopted OpenViking as external dependency**:

**Pros**:

- Battle-tested code (production at ByteDance)
- 91-96% token reduction proven
- Multimodal support (images, video, audio)
- Python SDK + HTTP server available

**Cons**:

- Requires Python bridge (adds complexity)
- Embedding model setup (VOYAGE_API_KEY or local model)
- Learning curve for filesystem paradigm
- Less control over storage format

**Recommendation**: **Adopt patterns, not full integration**. Gofer's TypeScript
ecosystem and git-friendly JSONL storage are strengths worth preserving.
Implement OpenViking's best ideas (tiered loading, URIs, recursive retrieval) in
TypeScript.

---

## 9. Open Questions

### Question 1: LLM Provider for Memory Extraction

**Context**: Automatic extraction requires LLM calls. Should we use Claude API
directly or support multiple providers?

**Options**:

- A: Claude API only (simplest, already used in council mode)
- B: Multi-provider (Anthropic, OpenAI, local models) via LLM Council
- C: Rule-based extraction only (no LLM)

**Recommendation**: **Start with Option A**, add B later if needed. Claude Haiku
is cost-effective for extraction (~$0.001 per consolidation run).

---

### Question 2: Memory Visibility in UI

**Context**: Developers should understand what memories are being used

**Options**:

- A: Extend existing Memory panel to show "memories used in last context build"
- B: Add badge/icon in status bar when memories are loaded
- C: Log to output channel only
- D: Inline annotations in Claude Code chat (e.g., "Used 3 memories about
  validation")

**Recommendation**: **Option A + D**. Memory panel update is low-cost, inline
annotations improve transparency.

---

### Question 3: Memory Sharing Across Features

**Context**: Should memories from feature 023 be accessible when working on
feature 029?

**Options**:

- A: Global memory pool (all features share)
- B: Feature-scoped memories (isolated)
- C: Hybrid (core/recall global, archival feature-scoped)

**Recommendation**: **Option C**. Core memories (patterns, lessons) should be
global. Feature-specific decisions (e.g., "use JWT for auth in feature 023")
should be feature-scoped.

---

### Question 4: Embedding Model for Semantic Search

**Context**: Hybrid retrieval requires semantic similarity. Do we need vector
embeddings?

**Options**:

- A: No embeddings - use TF-IDF keyword matching only (existing)
- B: Cloud embeddings (Voyage AI, OpenAI) via API
- C: Local embeddings (transformers.js in Node.js)
- D: VSCode's built-in search API

**Recommendation**: **Start with Option A**, evaluate B later. Current TF-IDF +
trigram similarity works reasonably well. Add embeddings only if measurable
quality gap emerges.

---

### Question 5: Memory Expiration Policy

**Context**: Should old memories auto-delete or just decay in priority?

**Options**:

- A: Never delete (archive low-priority only)
- B: Delete after 90 days of non-use
- C: User-configured retention policy
- D: LLM-scored importance for deletion decisions

**Recommendation**: **Option A** (current behavior). Archive keeps memories
recoverable. Add B later if storage becomes a problem.

---

## 10. Recommendations

### Immediate (v1 - MVP)

1. **Add L0/L1 layers to existing memories** - Extend JSONL schema with
   `abstract` and `overview` fields
2. **Implement `gofer://` URI abstraction** - Accessor layer over current file
   paths
3. **Inject prioritized memories into sub-agent prompts** - 5-10 relevant
   memories per agent (P0)
4. **Extract memories from validation reports** - Auto-save new patterns after
   `/6_gofer_validate` (P0)
5. **Observable memory loading** - Extend context-usage.jsonl with memory access
   events

**Estimated Effort**: 2-3 weeks (incremental changes to existing infrastructure)

**Expected Impact**:

- 5-10% improvement in validation scores (agents learn from past patterns)
- 30-40% context reduction via tiered loading
- Zero repeated validation issues across features

---

### Near-Term (v2 - Enhanced)

6. **Directory recursive retrieval** - Hybrid path + keyword search for memory
   access
7. **Stage-specific memory profiles** - Different memory budgets for
   research/implement/validate
8. **Real-time memory updates during implementation** - Incremental pattern
   saves
9. **Memory panel UI enhancements** - Show "memories used in last build"
10. **Automatic consolidation via LLM** - Extract semantic patterns from
    pipeline runs

**Estimated Effort**: 4-6 weeks (new abstractions, LLM integration)

**Expected Impact**:

- 10-15% validation score improvement (full learning loop)
- 50%+ context reduction (sub-agent dispatch + tiered loading)
- Measurable reduction in engineering review issues

---

### Long-Term (v3 - Advanced)

11. **Knowledge graph for entity relationships** - Neo4j or lightweight
    alternative
12. **Temporal queries** - "Memories about authentication in last 30 days"
13. **Multi-provider memory extraction** - LLM Council for consolidation
14. **Adaptive importance weighting** - Learn which memories matter via task
    outcomes
15. **Sub-agent dispatch architecture** - Migrate auto-chain to fresh-context
    sub-agents

**Estimated Effort**: 8-12 weeks (architectural changes)

**Expected Impact**:

- 15%+ validation score improvement (graph reasoning + importance learning)
- 70%+ context reduction (sub-agent dispatch)
- Near-zero repeated mistakes (<5% rate)

---

## 11. Technology Research Summary

### MemGPT/Letta Pattern

**Key Takeaway**: Three-tier architecture (core/recall/archival) with
agent-controlled memory updates

**Applicable to Gofer**: Already implemented in MemoryLayerManager. Extend with
automatic promotion/demotion logic.

---

### LangChain Memory Types

**Key Takeaway**: Multiple memory strategies (buffer, window, summary, knowledge
graph) for different use cases

**Applicable to Gofer**: Adopt ConversationSummaryBufferMemory pattern for
observation masking (recent full + older summarized).

---

### Mem0 Graph Memory

**Key Takeaway**: Entity relationships enable multi-hop reasoning. Consolidation
pipeline (session → user → context layers).

**Applicable to Gofer**: Add knowledge graph layer for entity relationships
(e.g., "AuthService depends on SessionManager").

---

### OpenViking Filesystem Paradigm

**Key Takeaway**: `viking://` URIs + L0/L1/L2 tiered loading achieve 91-96%
token reduction

**Applicable to Gofer**: Adopt URI abstraction + tiered layers. Keep TypeScript
implementation, no Python bridge.

---

### Anthropic Extended Context Best Practices

**Key Takeaway**: Place docs at top of prompt, query at bottom. Use prompt
caching for static content. Enable server-side compaction for infinite
conversations.

**Applicable to Gofer**: Apply to ContextBuilder section ordering. Explore
prompt caching for constitution + memories.

---

## 12. Related Code

**Memory Management**:

- `extension/src/autonomous/MemoryManager.ts:223-938` - Core CRUD, search,
  priority scoring
- `extension/src/autonomous/MemoryStorage.ts:61-62,166-272` - JSONL backend,
  dual storage
- `extension/src/autonomous/MemoryLayerManager.ts:68-88` - Three-tier access
- `extension/src/autonomous/MemoryConsolidator.ts:76` - Dedup, compact, archive

**Context Management**:

- `extension/src/autonomous/ContextBuilder.ts:721-1663` - Stage-aware context
  assembly
- `extension/src/autonomous/StageContextProfileLoader.ts:66` - Budget profiles
- `extension/src/autonomous/ObservationMasker.ts:25-150` - Three-tier decay
- `extension/src/autonomous/ContextUsageLogger.ts:214-700` - JSONL logging

**Sub-Agent Dispatch**:

- `extension/src/autonomous/SubAgentDispatcher.ts:54-273` - Delegation
  recommendations
- `extension/src/autonomous/ACCOrchestrator.ts:35-150` - 5-stage compaction
- `.claude/commands/6_gofer_validate.md:136-150` - Validation agent spawn
- `.claude/commands/1_gofer_research.md:96-199` - Research agent spawn

**Token Tracking**:

- `extension/src/autonomous/ContextHealthMonitor.ts:179-656` - Health monitoring
- `extension/src/autonomous/ClaudeSessionReader.ts:83-361` - Session JSONL
  parsing
- `extension/src/autonomous/WorkspaceContextProvider.ts:46-417` - Token
  estimation
- `.specify/logs/context-usage.jsonl` - Event log
- `.specify/logs/pipeline.jsonl` - Stage completion log

---

## Conclusion

Gofer already has a **solid foundation** for memory management with
MemoryManager, ContextBuilder, and MemoryLayerManager (~3,700 LOC). The primary
gaps are:

1. **Sub-agent memory isolation** - Agents don't access shared learnings
2. **Context bloat from auto-chaining** - 100-150k tokens by stage 5
3. **Manual memory updates** - No automatic pattern extraction
4. **Flat retrieval** - No hierarchy-preserving search

**Recommended approach**: Adopt OpenViking's tiered loading (L0/L1/L2) and URI
abstraction patterns in TypeScript. Extend existing infrastructure incrementally
rather than rewriting. Prioritize sub-agent memory injection (P0) and automatic
extraction (P0) for measurable quality improvements.

**Expected outcomes** (v2 implementation):

- ✅ Validation scores: 95-100/100 (target met via pattern learning)
- ✅ Context usage: <50k tokens by stage 5 (target met via tiered loading +
  sub-agent dispatch)
- ✅ Repeated mistakes: <5% (target met via automatic extraction + write-back)
- ✅ Engineering review issues: 0-5 per feature (target met via learned
  patterns)
