# Context Management Rubric & Engineering Scorecard

**Date**: 2026-02-09 **Methodology**: All context management strategies from the
repo's research documents (172 ideas from 33 documents) consolidated into 60
rubric items across 10 categories. Each scored via engineering deep dive on
production source code — verifying imports, callers, wiring, and runtime
behavior.

**Key correction vs prior rubric (2026-02-08)**: The prior rubric contained
several errors where it described code files and features that don't exist on
disk, or described wiring that was never created. This version corrects those
with verified findings.

**Scoring Scale**: 0-5

| Score | Meaning                                            |
| :---: | -------------------------------------------------- |
| **0** | Not implemented — research/aspiration only         |
| **1** | Stub or placeholder code exists                    |
| **2** | Code exists but not connected or functional        |
| **3** | Implemented and connected, significant gaps remain |
| **4** | Fully functional with minor gaps                   |
| **5** | Production-ready, battle-tested, complete          |

---

## Category A: Real-Time Context Monitoring

### A1. Context Health Monitor with Threshold Events — 5/5

`ContextHealthMonitor.ts` (647 lines). Periodic health checks with configurable
thresholds. Events: `healthy`, `warning`, `critical`, `status-change`,
`handoff-recommended`. Recommendation engine generates context-specific
suggestions. State persisted to `.specify/memory/context-health-state.json`.
Live state shows real data: `{"status":"critical","utilizationPercent":72.14}`.

### A2. Real Token Usage from Claude Code Sessions — 5/5

`ClaudeSessionReader.ts` (452 lines). Reads actual API-reported token counts
from JSONL session logs. Formula:
`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. Privacy
guard via `APPROVED_FIELDS`. Model-aware limits. Staleness check rejects
sessions >5 min inactive.

### A3. Hook-Based Event Bridge — 5/5

`HookBridgeWatcher.ts` (167 lines) watches `.specify/hooks/context-bridge.json`
via FileSystemWatcher. Bridge written by `post-tool-use.mjs` on every Claude
Code tool call. Events: `bridge-update`, `session-start`, `session-end`,
`session-stale`. On session-start, polling slows to 60s. On stale (5 min),
polling restores to 10s.

### A4. Status Bar Visualization — 4/5

Two status bar items: `ContextHealthStatusBar.ts` (color-coded "Context: N%")
and `GoferActivityStatusBar.ts` ("Gofer Memory: Active/Idle"). Click handlers
open QuickPick with session details. Minor gap: initialization wiring bug in
v1.1.10 (fixed v1.1.11).

### A5. JSONL Usage Logging with Throttle — 5/5

`ContextUsageLogger.ts` writes to `.specify/logs/context-usage.jsonl`. Estimated
data throttled to once per 5 min. Always logs on real data and status
transitions.

### A6. Model-Aware Context Limits — 5/5

`MODEL_CONTEXT_LIMITS` maps model IDs to 200k. `ContextHealthMonitor` uses
`effectiveContextLimit` (default 120k = 60% of 200k) with dynamic updates from
session data.

### A7. Real vs. Estimated Data Source Differentiation — 5/5

`ContextHealthStatus.dataSource` = `'real' | 'estimated'`. `AutoHandoffTrigger`
filters on `dataSource === 'real'` — estimated data never triggers handoff.
Logger throttles estimated. Status bar shows source.

**Category A Total: 34/35 (97%)**

---

## Category B: Observation & Tool Output Management

### B1. Binary Observation Masking (Mask/Unmask) — 3/5

`ObservationMasker.ts` (959 lines). Tracks observations with UUID, SHA-256 hash,
turn number, token estimate. Age-based masking generates
`<observation_masked />` placeholders. Content recoverable via
`expandObservation()` in-memory.

**What works now (improved from prior rubric)**:

- `post-tool-use.mjs` extracts real tool_result content from transcript JSONL
  via `extractLastToolResult()`
- Writes to `.specify/hooks/tool-output.txt` (8KB max, truncated)
- Extension reads tool-output.txt and passes real content to
  `trackObservation()` instead of placeholder
- Dedup via `lastTrackedToolTimestamp` prevents re-reading

**Remaining gaps**:

1. **Turn counter never advances on main path**: The bridge-update handler calls
   `trackObservation()` but never calls `incrementTurn()`. All observations get
   the same turn number and never age out past the masking threshold.
2. **MCP expand tool broken**: `gofer_expand_observation` reads from
   `.specify/memory/observation-cache/index.json`, but `saveCacheToDisk()` is
   never called from production code. Observation data is in-memory only
   (extension process); language server process cannot access it. Always returns
   "Observation cache not found."
3. **Efficient I/O**: `tailRead()` now uses positioned `openSync`/`readSync`
   (20KB allocation for 10MB+ transcripts).

### B2. Graduated Observation Decay (Three-Tier) — 0/5

**Research claim**: Three retention tiers — Full (recent), Key points
(intermediate), Masked (oldest).

**Engineering finding**: `DecayTier` type does NOT exist anywhere in
`ObservationMasker.ts` or any production source code. It appears only in
spec/plan documents (`.specify/specs/016-top5-context-gaps/plan.md`). The
`maskOldObservations()` method (lines 284-328) uses a simple binary age
threshold — observations are either full or masked. There is no key-points tier,
no type-specific key-point extractors, and no intermediate decay state.

**Prior rubric error**: The 2026-02-08 rubric scored this 2/5 claiming
"genuinely implements three tiers as a `DecayTier` type:
`'full' | 'key-points' | 'masked'`." This is incorrect. Binary masking only.

### B3. Semantic Observation Compression (LLM-Based) — 1/5

**Research claim**: Use fast LLM (Haiku) to compress old observations into
summaries.

**Engineering finding**: Since the three-tier `DecayTier` system doesn't exist
(B2), the LLM compression pipeline as described in the prior rubric (compress at
key-points tier transition) doesn't have a trigger point. The
`ObservationMasker` does have LLM provider setter infrastructure but no
functioning compression pipeline. The prior rubric's claim of "rate limiting: 10
calls/minute, 50,000 tokens/session" could not be independently verified as tied
to a working code path.

### B4. Observation Fingerprinting (Hash + External Storage) — 2/5

SHA-256 hashing exists in `ObservationMasker` (lines 178-180).
`saveCacheToDisk()` method writes to
`.specify/memory/observation-cache/index.json`. Companion `loadCacheFromDisk()`
exists. Both work in tests. **Neither is called from production code.**

### B5. Preserve Error Messages Always — 4/5

`preserveErrorMessages` config (default: true). `shouldPreserve()` checks
patterns: `/error/i`, `/exception/i`, `/failed/i`. Matching observations never
masked regardless of age. Also preserves `type === 'error'`.

### B6. Configurable Preserve Patterns — 3/5

`preservePatterns` field in config (array of RegExp). Three defaults. Works via
constructor options. No user-facing config surface (no VSCode setting, no YAML
config).

### B7. Cache Pruning / LRU Eviction — 5/5

LRU eviction when cache exceeds `maxCacheSize` (100). Evicts oldest 10% based on
`lastAccessTime`. Eviction is logged.

### B8. Stage-Specific Observation Windows — 2/5

`StageContextProfile` has `observationWindow` per stage (Research=15,
Implement=10, etc.). Wired to `ContextBuilder` which passes it to
`maskOldObservations()`. **However**: since the turn counter doesn't advance on
the hook-bridge path (B1 gap #1), the observation window has no practical effect
— observations never reach the age threshold regardless of window size.

**Category B Total: 20/40 (50%)**

---

## Category C: Memory System

### C1. JSONL Storage with In-Memory Index — 5/5

`MemoryStorage.ts` (449 lines). Append-only JSONL at
`.specify/memory/memories.jsonl`. Auto-migration from legacy `local.json`.
Updates append new version. Deletes use tombstones. Compaction rewrites file.

### C2. Memory Priority Scoring — 4/5

Usage frequency (40%), recency (35%), age bonus (25%). Logarithmic scale.
`incrementUsedCount()` and `updateMemory()` handle priority changes. No
API-level enforcement preventing accidental retrieval-based increments.

### C3. Memory-First Context Loading — 4/5

`ContextBuilder.buildContext()` loads memories by priority,
`calculateMemoryCoverage()` extracts keywords, loads research chunks only for
uncovered topics. Keyword overlap is simplistic (substring matching).

### C4. Continuous Memory Writing (Auto-Save) — 4/5

`ContinuousMemoryWriter.ts` (254 lines). Listens to ContextBuilder events:
`budget-warning`, `loading-decision`. Rate-limited to 10 auto-saves per stage.
Wired at `extension.ts:1393`.

### C5. Citation Verification — File Paths — 0/5

**Prior rubric error**: Scored 4/5 claiming "Wired into
`ContextBuilder.buildContext()` before memory injection."

**Engineering finding**: `CitationVerifier.ts` (194 lines) exists but is
**completely isolated dead code**:

- NOT exported from `index.ts`
- NOT imported by any other TypeScript file
- NOT imported by ContextBuilder
- No test files reference it
- Zero production callers

The `ContextBuilder` constructor does not accept a `CitationVerifier` parameter.
The code would work if wired, but it isn't.

### C6. Citation Verification — Function/Class Names — 0/5

Not implemented. Only file path patterns exist in CitationVerifier, and even
that is dead code (C5).

### C7. Memory Consolidation — 3/5

`MemoryConsolidator.ts` (303 lines). Dedup (80% Jaccard), stale citation
checking, content compaction, priority decay, archival. Triggered on Claude Code
terminal close (`autonomousCommands.ts`). No periodic or manual trigger.

### C8. Memory Categorization with Tree View — 5/5

`MemoryProvider.ts` (380 lines). Groups by category with icons. Sorted by
priority/recency. Click opens detail QuickPick.

### C9. Stale Memory Detection & Archival — 3/5

`MemoryConsolidator` handles stale detection. Priority decay for >30 day unused.
`MemoryStorage.archive()` preserves. No periodic trigger. Max memory limit not
enforced.

### C10. Dual Storage (JSONL + Markdown Notes) — 1/5

JSONL storage exists. No `memory-notes/` directory or per-memory markdown files.

**Category C Total: 29/50 (58%)**

---

## Category D: Research Document Management

### D1. Research Chunking with Semantic Index — 5/5

`ResearchChunker.ts` (814 lines). Markdown parsing by heading level. TF-IDF
keyword extraction. Index saved to `research-index.json`. Chunk merging below
100 tokens. Relevance scoring. Default top-5 chunks. Verified ~60% reduction.

### D2. Research Priority Queue / Relevance Scoring — 5/5

`ResearchChunker.loadChunksForTask()` scores chunks against task description.
Keyword overlap with position weighting and title bonuses. Returns sorted top-N.

### D3. Recursive Research Summarization — 0/5

**Prior rubric error**: Scored 3/5 claiming "ResearchSummarizer.ts (399 lines)
is wired into ContextBuilder."

**Engineering finding**: `ResearchSummarizer.ts` **does not exist** on disk. A
glob search returns zero results. `ContextBuilder` does not import, reference,
or use any `ResearchSummarizer`. It uses `ResearchChunker` directly. The file
was described in spec documents (`.specify/specs/016-top5-context-gaps/plan.md`)
as a planned component but was never created.

### D4. Research to Memory Conversion — 1/5

No automatic research-to-memory conversion pipeline. Memory-first loading (C3)
provides indirect benefit by reducing research loading when memories cover
topics.

### D5. Research Knowledge Graph (Entity Extraction) — 1/5

`KnowledgeGraph.ts` (376 lines) exists with entity types, relationships, BFS
queries, LRU eviction, disk persistence. **Zero data producers** — all
`record*()` methods (recordFileAccess, recordPattern, recordDecision,
recordImport) have zero production callers. Graph is always empty.
`knowledge-graph.json` never created on disk.
`ContextBuilder.loadGraphContext()` always returns undefined.

**Category D Total: 12/25 (48%)**

---

## Category E: Session Management & Continuity

### E1. Session Save / Checkpoint — 3/5

`/7_gofer_save.md` (347 lines) is a Claude command prompt. Creates
`session-checkpoint.md` with YAML frontmatter. Targets <5,000 token handoffs.
Prompt-driven, not programmatic.

### E2. Session Resume / Restore — 3/5

`/8_gofer_resume.md` (404 lines) discovers checkpoints, loads artifacts,
validates git state. Same prompt-driven approach.

### E3. Auto-Handoff Triggering — 5/5

`AutoHandoffTrigger.ts` (693 lines). Listens for `critical` events. Filters on
`dataSource === 'real'`. Notification with 4 buttons: Save, Reseed, Dismiss,
Remind. 5-minute cooldown. Handoff document generation.

### E4. Context Reseed — 3/5

`ContextBuilder.reseedContext()` clears observation cache, resets turn counter,
rebuilds from memory store. Wired to AutoHandoffTrigger "Reseed Context" button.
Limited practical effect since observation cache contained placeholders (now has
real content post-B1 fix, but turn counter issue remains).

### E5. YAML Schema Validation for Checkpoints — 0/5

`CheckpointValidator.ts` (67 lines) exists with YAML frontmatter validation,
required field checks, and token budget enforcement. But it is **completely
isolated dead code** — not exported from `index.ts`, not imported by any file,
no tests, zero callers. `/7_gofer_save` never validates its output.

### E6. Handoff Beats Compaction Design — 5/5

Architecture correctly chose handoffs over compaction. `/7_gofer_save` +
`/8_gofer_resume` are the primary continuity mechanism. `ContextCompactor.ts`
exists but is dead code (correct decision to not use it).

**Category E Total: 19/30 (63%)**

---

## Category F: Stage-Aware Context Management

### F1. Stage-Specific Context Profiles — 5/5

`StageContextProfile.ts` (258 lines) + `StageContextProfileLoader.ts` (373
lines). 6 stage profiles with budget allocations. YAML config at
`.specify/memory/context-profiles.yaml` with hardcoded defaults. Validation
ensures budgets sum to 100%.

### F2. Automatic Stage Detection — 3/5

`WorkspaceContextProvider.detectCurrentStage()` uses filesystem heuristics —
most recently modified artifact. Falls back to 'implement'. Brittle for
non-linear workflows.

### F3. Budget Enforcement with Warnings — 5/5

`ContextBuilder.calculateBudgetUsage()` computes per-category usage vs stage
profile budgets. Emits `budget-warning` events. `ContinuousMemoryWriter`
captures warnings.

### F4. Stage Transition Checkpoints — 1/5

Not automatically triggered. Manual `/7_gofer_save` exists but no
stage-transition-specific checkpoint mechanism.

### F5. Progressive Context Delegation — 0/5

**Prior rubric error**: Scored 1/5 claiming "Data structures and
recommendation-generation code exist."

**Engineering finding**: `DelegationPolicy` type **does not exist** anywhere in
production source code. A grep across all TypeScript files in `extension/src/`
returns zero matches. The `StageContextProfile` interface has no
`delegationPolicy` field. `ContextHealthMonitor` has no delegation logic.
`WorkspaceContextProvider.getContextAnalysis()` does not include delegation
information. The concept exists only in spec documents.

**Category F Total: 14/25 (56%)**

---

## Category G: Sub-Agent Architecture

### G1. Specialized Sub-Agents — 5/5

Three agents in `.claude/agents/`: `codebase-locator`, `codebase-analyzer`,
`codebase-pattern-finder`. Run as Claude Code Task sub-processes with isolated
context.

### G2. Condensed Result Return — 4/5

Agent definitions include instructions to return condensed results. Pattern
followed in practice but not enforced by code.

### G3. Progressive Delegation (Dynamic Escalation) — 0/5

Not implemented. Sub-agent usage is static. No dynamic routing based on context
health.

**Category G Total: 9/15 (60%)**

---

## Category H: Knowledge Graph & Semantic Understanding

### H1. Entity Relationship Graph — 4/5

`KnowledgeGraph.ts` (376 lines). Directed graph via graphlib. Node types: file,
class, function, pattern, decision. Edge types: calls, imports, extends,
implements, uses_pattern, decided_by, modified_in. LRU eviction at 5000 nodes.
Disk persistence.

### H2. BFS Subgraph Queries — 5/5

`getSubgraph()` — BFS from start node with configurable depth. Returns Set of
connected nodes. Integrated (but returns empty due to H3).

### H3. Entity Population Hooks — 0/5

Convenience methods exist: `recordFileAccess()`, `recordPattern()`,
`recordDecision()`, `recordImport()`. **Zero production callers.** Called only
in tests. Graph is always empty. `save()` short-circuits when `dirty === false`
(always false since no data is added). Also: bridge schema mismatch between
`ContextBridgeWriter` (uses `sections.code`) and MCP tool handler (reads
`sections.graphContext`).

### H4. Zettelkasten / A-MEM Interconnected Knowledge — 1/5

Knowledge graph has entity relationships but no memory-to-memory links. Memories
are flat JSONL entries with tags, no graph interconnections.

**Category H Total: 10/20 (50%)**

---

## Category I: Advanced Context Engineering

### I1. RLM-Inspired Context Folding — 0/5

**Prior rubric error**: Scored 1/5 claiming "ContextFolder.ts (282 lines)
implements three fold levels" and "Four MCP tools registered."

**Engineering finding**: `ContextFolder.ts` **does not exist** on disk. A glob
search returns zero results. The four MCP tools (`contextPeek`, `contextExpand`,
`contextSearch`, `contextFold`) also **do not exist** — a grep returns zero
matches. `ContextBuilder.mergeContextSections()` does simple string
concatenation with no folding concept. The feature was specified but never
implemented.

### I2. Parallel Recursive Analysis — 1/5

Sub-agents can be launched in parallel (G1). `/1_gofer_research` does launch
multiple agents concurrently. No systematic partition-map-reduce framework.

### I3. Full RLM REPL Environment — 0/5

Not implemented. Marked as aspirational in specs.

### I4. MemGPT/Letta Three-Layer Architecture — 2/5

Informal analogues exist: Core (constitution.md), Archival (JSONL memories +
research chunks), Recall (observation cache). No explicit MemGPT-style
LLM-driven memory management.

### I5. Context Compaction via LLM Summarization — 1/5

`ContextCompactor.ts` (554 lines). Is instantiated in `AutonomousDriver` (line
94). Has threshold detection, backup/rollback. But `summarizeTasks()` returns a
fallback summary (LLM stubbed at line 230). `monitorAndCompactContext()` has
zero callers. Instantiated but functionally dead.

**Category I Total: 4/25 (16%)**

---

## Category J: Process & Quality

### J1. Scope Control & Drift Prevention — 1/5

`ScopeGuard.ts` (108 lines) exists with spec boundary parsing and file
modification checking. But it is **completely isolated dead code** — not
exported from `index.ts`, not imported anywhere, no tests. Specs mention scope
sections but nothing enforces them programmatically.

### J2. AI Slop Detection — 1/5

`SlopDetector.ts` (168 lines) exists with pattern detection for `it.skip`, empty
catches, `as any`, `console.log`, `debugger`, `@ts-ignore`, TODOs. Functionally
complete code. But **completely isolated dead code** — not exported, not
imported, no tests, zero callers. Validation stage is compile+test only.

### J3. Continuous Feedback Loops — 2/5

`/5_gofer_implement` instructions include "verify after each phase" but no
enforcement. `/6_gofer_validate` runs at the end. No per-task test execution
enforcement.

### J4. Error Recovery & Checkpoints — 2/5

`ContextCompactor.ts` has backup/rollback (dead code). Git provides implicit
checkpoints. No explicit checkpoint-before-risky-operation enforcement.

### J5. Pipeline Observability & Decision Logging — 3/5

`ContextUsageLogger` logs health checks to JSONL. `ContinuousMemoryWriter`
captures some decisions. Council usage logged. No per-stage cost tracking or
quality metrics.

### J6. Brownfield-Specific Guidance — 2/5

Research stage explores codebase. `codebase-pattern-finder` identifies patterns.
No structured brownfield analysis template.

### J7. Planning Mode Enforcement / Approval Gates — 4/5

`/4_gofer_tasks` has approval gate. `tasks.md` uses YAML frontmatter with status
field. Prompt-driven enforcement (effective in practice).

**Category J Total: 15/35 (43%)**

---

## Grand Summary

### Scores by Category

| Category                              | Items  |   Max   |  Score  |    %    |
| ------------------------------------- | :----: | :-----: | :-----: | :-----: |
| **A. Real-Time Context Monitoring**   |   7    |   35    | **34**  | **97%** |
| **E. Session Management**             |   6    |   30    | **19**  | **63%** |
| **G. Sub-Agent Architecture**         |   3    |   15    |  **9**  | **60%** |
| **C. Memory System**                  |   10   |   50    | **29**  | **58%** |
| **F. Stage-Aware Context Management** |   5    |   25    | **14**  | **56%** |
| **B. Observation & Tool Output Mgmt** |   8    |   40    | **20**  | **50%** |
| **H. Knowledge Graph & Semantics**    |   4    |   20    | **10**  | **50%** |
| **D. Research Document Management**   |   5    |   25    | **12**  | **48%** |
| **J. Process & Quality**              |   7    |   35    | **15**  | **43%** |
| **I. Advanced Context Engineering**   |   5    |   25    |  **4**  | **16%** |
| **OVERALL**                           | **60** | **300** | **166** | **55%** |

### Tier Analysis

**Tier 1: Production Excellence (80%+)**

| Category                | Score | Assessment                                                  |
| ----------------------- | :---: | ----------------------------------------------------------- |
| A. Real-Time Monitoring |  97%  | Best-in-class. Real data, event-driven, properly throttled. |

**Tier 2: Solid Foundation (55-79%)**

| Category                  | Score | Assessment                                                   |
| ------------------------- | :---: | ------------------------------------------------------------ |
| E. Session Management     |  63%  | Auto-handoff is excellent. Save/resume are prompt-driven.    |
| G. Sub-Agent Architecture |  60%  | Agents work well. No dynamic delegation.                     |
| C. Memory System          |  58%  | Storage/retrieval solid. Citation verification is dead code. |
| F. Stage-Aware Context    |  56%  | Profiles work. Delegation not implemented.                   |

**Tier 3: Partial / Broken (40-54%)**

| Category                  | Score | Assessment                                                                |
| ------------------------- | :---: | ------------------------------------------------------------------------- |
| B. Observation Management |  50%  | Real content now captured but turn counter broken; decay not implemented. |
| H. Knowledge Graph        |  50%  | Infrastructure complete. Zero data producers — graph always empty.        |
| D. Research Management    |  48%  | Chunking/relevance excellent. Summarizer doesn't exist. Graph empty.      |
| J. Process & Quality      |  43%  | Approval gates work. ScopeGuard & SlopDetector are dead code.             |

**Tier 4: Scaffolding / Not Implemented (<40%)**

| Category                | Score | Assessment                                           |
| ----------------------- | :---: | ---------------------------------------------------- |
| I. Advanced Engineering |  16%  | ContextFolder doesn't exist. Compactor is dead code. |

---

### Corrections vs Prior Rubric (2026-02-08)

The prior rubric scored **180/300 (60%)**. This rubric scores **166/300 (55%)**.
The 14-point drop comes from correcting errors where the prior rubric described
code that doesn't exist:

| Item                       | Prior Score | Corrected Score |  Delta  | Issue                                                                               |
| -------------------------- | :---------: | :-------------: | :-----: | ----------------------------------------------------------------------------------- |
| C5. Citation Verification  |     4/5     |       0/5       | **-4**  | CitationVerifier.ts exists but is dead code — not imported, not wired, zero callers |
| D3. Research Summarization |     3/5     |       0/5       | **-3**  | ResearchSummarizer.ts does not exist on disk                                        |
| B2. Graduated Decay        |     2/5     |       0/5       | **-2**  | DecayTier type doesn't exist in source code                                         |
| B8. Stage-Specific Windows |     4/5     |       2/5       | **-2**  | Config exists but turn counter never advances                                       |
| I1. Context Folding        |     1/5     |       0/5       | **-1**  | ContextFolder.ts does not exist on disk; MCP tools don't exist                      |
| F5. Progressive Delegation |     1/5     |       0/5       | **-1**  | DelegationPolicy type doesn't exist in source code                                  |
| B3. Semantic Compression   |     2/5     |       1/5       | **-1**  | Three-tier pipeline doesn't exist; LLM wiring unverified                            |
| J1. Scope Control          |     2/5     |       1/5       | **-1**  | ScopeGuard is dead code                                                             |
| B1. Observation Masking    |     2/5     |       3/5       | **+1**  | Real content now captured via tool-output.txt                                       |
| **Net change**             |             |                 | **-14** |                                                                                     |

### Dead Code Inventory

Six production source files are completely isolated — not exported, not
imported, no tests, zero callers:

| File                     | Lines | What It Does                 | Why It's Dead                            |
| ------------------------ | :---: | ---------------------------- | ---------------------------------------- |
| `ScopeGuard.ts`          |  108  | Spec boundary enforcement    | Never wired                              |
| `SlopDetector.ts`        |  168  | AI slop pattern detection    | Never wired                              |
| `CheckpointValidator.ts` |  67   | Handoff document validation  | Never wired                              |
| `CitationVerifier.ts`    |  194  | Memory citation freshness    | Never wired                              |
| `ContextCompactor.ts`    |  554  | LLM-based context compaction | Instantiated but key method never called |
| `KnowledgeGraph.ts`      |  376  | Entity-relationship graph    | Wired but zero data producers            |

**Total dead code: 1,467 lines** across 6 files. Additionally,
`ResearchSummarizer.ts` and `ContextFolder.ts` are referenced in the prior
rubric but never existed.

---

### Top 10 Highest-Impact Improvements

| #   | Item                                   | Score | Gap | Impact                                                                                                          | Fix Complexity |
| --- | -------------------------------------- | :---: | :-: | --------------------------------------------------------------------------------------------------------------- | :------------: |
| 1   | **B1. Turn counter advancement**       |  3/5  |  2  | Without incrementTurn() on the bridge-update path, no observations ever age out. One line fix.                  |    **Low**     |
| 2   | **B1. Observation disk persistence**   |  3/5  |  2  | Call saveCacheToDisk() periodically so MCP expand tool works. Cross-process architecture requires disk file.    |    **Low**     |
| 3   | **B2. Graduated decay implementation** |  0/5  |  5  | Three-tier decay (full→key-points→masked) was designed but never coded. Would preserve semantic content longer. |   **Medium**   |
| 4   | **H3. Knowledge graph population**     |  0/5  |  5  | Wire file reads, imports, and patterns from bridge-update events to `recordFileAccess()` etc.                   |   **Medium**   |
| 5   | **C5. Wire CitationVerifier**          |  0/5  |  5  | Import and instantiate in ContextBuilder. Code exists, just needs wiring.                                       |    **Low**     |
| 6   | **D3. Create ResearchSummarizer**      |  0/5  |  5  | Stage-appropriate summarization (full for research, summary for implement). Planned but never created.          |   **Medium**   |
| 7   | **J2. Wire SlopDetector**              |  1/5  |  4  | Import and call from /6_gofer_validate or AutonomousDriver. Code exists.                                        |    **Low**     |
| 8   | **J1. Wire ScopeGuard**                |  1/5  |  4  | Import and call during implementation to check protected boundaries.                                            |    **Low**     |
| 9   | **E5. Wire CheckpointValidator**       |  0/5  |  5  | Call from /7_gofer_save before writing handoff document.                                                        |    **Low**     |
| 10  | **F5. Implement DelegationPolicy**     |  0/5  |  5  | Create type, add to StageContextProfile, wire to ContextHealthMonitor recommendations.                          |   **Medium**   |

### The "One-Line Fix" Opportunities

Items that would unlock significant value with minimal code changes:

1. **Add `sharedContextBuilder.incrementTurn()` to bridge-update handler** —
   Unlocks B1 masking, B8 stage-specific windows, and makes error preservation
   (B5) meaningful
2. **Call `saveCacheToDisk()` after `trackObservation()`** — Unlocks MCP expand
   tool for all Claude Code users
3. **Import + instantiate CitationVerifier in ContextBuilder** — Unlocks C5
   stale memory warnings
4. **Import + call SlopDetector in validation** — Unlocks J2 AI slop detection
5. **Import + call ScopeGuard in implementation** — Unlocks J1 scope enforcement

### What Gofer Does Exceptionally Well

1. **Real-time monitoring stack** (A1-A7, 97%) is best-in-class. Real token
   data, event-driven hooks, proper throttling, real vs estimated
   differentiation.
2. **Research chunking** (D1-D2) achieves ~60% reduction with semantic scoring.
3. **Auto-handoff trigger** (E3) — detecting critical context and offering
   save/reseed with proper filtering.
4. **Memory storage** (C1) — well-designed JSONL with in-memory index,
   tombstones, compaction.
5. **Architecture chose correctly**: handoffs over compaction (E6), stage
   profiles (F1), sub-agents (G1).

### What Gofer Claims But Doesn't Deliver

1. **Observation management** (B1-B4): Real content is now captured, but the
   turn counter doesn't advance so nothing ever gets masked. The three-tier
   graduated decay was designed but never coded. The MCP expand tool can't
   access in-memory data.
2. **Knowledge graph** (H1-H4): Full infrastructure with zero data producers.
   The graph is always empty.
3. **Six dead-code files** (1,467 lines): ScopeGuard, SlopDetector,
   CheckpointValidator, CitationVerifier, ContextCompactor, KnowledgeGraph.
   Complete implementations that are never wired into production.
4. **Two phantom files**: ResearchSummarizer.ts and ContextFolder.ts were
   described in prior analysis but never existed on disk.
5. **Progressive delegation** (F5/G3): The DelegationPolicy type doesn't exist
   in source code despite being described in specs.
