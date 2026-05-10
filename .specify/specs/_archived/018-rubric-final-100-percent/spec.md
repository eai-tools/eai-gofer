---
id: 018-rubric-final-100-percent
title: 'Context Management Rubric: Final Push to 100%'
status: draft
created: 2026-02-10T08:00:00Z
updated: 2026-02-10T08:00:00Z
author: Claude
---

# Context Management Rubric: Final Push to 100%

## Overview

Close the remaining ~85-point gap in the context management engineering rubric
(215/300 → 300/300). This is a brownfield update touching ~25 files across 10
rubric categories. The work is primarily wiring existing dead code, enabling
disabled features, adding missing event triggers, and filling implementation
gaps.

**Research Reference**: See `research.md` for codebase analysis, corrected
baselines, and integration points. **Rubric Source of Truth**:
`.specify/research/context-management-rubric.md`

## User Stories

### US1 - Wire Dead Code and Enable Disabled Features (Priority: P1)

Register 9 existing REPL tools in MCP server, enable MemoryLayerManager via
VSCode setting, wire ParallelAnalysisFramework into ContextBuilder, and wire
ContextCompactor to health events.

**Why this priority**: Highest ROI — these are fully implemented features that
just need registration/wiring. Estimated +20 points for minimal code changes.

**Independent Test**: After wiring, each tool/feature can be invoked via MCP or
triggered via health events. TypeScript compilation confirms no broken imports.

**Acceptance Scenarios**:

1. **Given** 9 REPL tools exist in toolHandler.ts, **When** Claude Code calls
   `tools/list`, **Then** all 9 tools appear in the response and are callable
   via `tools/call`
2. **Given** `gofer.useLayeredMemory` setting exists in package.json, **When**
   user enables it in VSCode settings, **Then** MemoryLayerManager is activated
   in extension.ts
3. **Given** ParallelAnalysisFramework exists, **When**
   ContextBuilder.buildContext() runs, **Then** parallel analysis
   recommendations appear in context output
4. **Given** ContextCompactor exists, **When** ContextHealthMonitor emits
   `critical`, **Then** monitorAndCompactContext() is called with LLM provider

---

### US2 - Create ContextFolder and Enhance Observation Management (Priority: P2)

Create ContextFolder.ts for section-level folding, add trailing-edge debounce
with deactivate flush, add additional LLM compression triggers, add configurable
observation patterns via VSCode settings, and add eviction telemetry.

**Why this priority**: Core context management improvements that affect every
pipeline stage. Estimated +15 points.

**Independent Test**: ContextFolder applies fold states from
context-fold-state.json. Debounce flushes on extension deactivate. LLM
compression triggers on warning-level events.

**Acceptance Scenarios**:

1. **Given** context-fold-state.json has sections marked collapsed, **When**
   buildContext() runs, **Then** collapsed sections render as one-line summaries
2. **Given** extension is deactivating, **When** deactivate() is called,
   **Then** observation cache is flushed to disk and timers are cleared
3. **Given** context reaches warning level, **When** ContextHealthMonitor emits
   warning, **Then** LLM compression is triggered (not just on critical)
4. **Given** `gofer.observationPreservePatterns` setting exists, **When** user
   adds patterns, **Then** ObservationMasker uses them at runtime without
   restart

---

### US3 - Enhance Memory System (Priority: P3)

Add periodic memory consolidation timer, MAX_MEMORY_COUNT enforcement, rich
markdown dual storage with YAML frontmatter, bidirectional memory linking
(Zettelkasten), and symbol citation staleness warnings.

**Why this priority**: Memory quality improvements that compound over time.
Estimated +18 points across C5, C6, C7, C9, C10, H4.

**Independent Test**: Memory consolidation runs on 30-min timer. Save() enforces
count limits. Markdown notes have structured frontmatter. Back-references are
maintained on save.

**Acceptance Scenarios**:

1. **Given** 30 minutes have elapsed, **When** consolidation timer fires,
   **Then** similar memories are grouped and summarized
2. **Given** memory count exceeds MAX_MEMORY_COUNT (200), **When** save() is
   called, **Then** lowest-priority memories are archived
3. **Given** a memory >500 chars is saved, **When** markdown note is written,
   **Then** note has YAML frontmatter with id, category, tags, created fields
4. **Given** memory A references memory B, **When** memory A is saved, **Then**
   memory B's back-references include memory A
5. **Given** a code symbol `MyClass` is cited, **When** symbol verification
   finds it was renamed, **Then** citation gets a `[STALE]` prefix warning

---

### US4 - Stage-Aware Context and Sub-Agent Improvements (Priority: P4)

Improve stage detection with configurable staleness and hook-bridge command
detection, add auto-checkpoint on stage transitions, wire SubAgentDispatcher
enforcement with threshold-based blocking, add token budgets to delegation
recommendations.

**Why this priority**: Cross-cutting improvements that affect pipeline flow.
Estimated +14 points across F2, F4, F5, G2, G3.

**Independent Test**: Stage detection uses hook-bridge data when available.
Stage changes trigger lightweight checkpoints. SubAgentDispatcher blocks
operations when context exceeds thresholds.

**Acceptance Scenarios**:

1. **Given** hook-bridge provides command data, **When** detectCurrentStage()
   runs, **Then** stage detection uses hook-bridge as primary source
2. **Given** ContextBuilder emits `stage-change`, **When** stage changes from
   research to plan, **Then** a lightweight checkpoint is auto-saved
3. **Given** context utilization exceeds 70%, **When** SubAgentDispatcher
   evaluates, **Then** it recommends blocking non-essential operations
4. **Given** a DelegationRecommendation is generated, **When** it specifies a
   token budget, **Then** sub-agent results exceeding the budget are truncated

---

### US5 - Research and Session Management (Priority: P5)

Add deterministic fallback for research summarization, auto-trigger
research-to-memory conversion, add AST-aware import extraction to knowledge
graph, wire CheckpointValidator into session save, and add programmatic session
resume.

**Why this priority**: Infrastructure improvements for pipeline reliability.
Estimated +10 points across D3, D4, D5, E1, E2, E5.

**Independent Test**: Research summarization works without API key. Research
completion triggers memory conversion. Session save validates checkpoints.

**Acceptance Scenarios**:

1. **Given** no API key is configured, **When** ResearchSummarizer processes a
   spec, **Then** deterministic fallback generates summaries from section
   headers
2. **Given** a spec's research.md is completed, **When** research-complete event
   fires, **Then** batch conversion creates discovery memories automatically
3. **Given** a session is being saved, **When** CheckpointValidator runs,
   **Then** git state (branch, status, stash) is captured in checkpoint
4. **Given** a session-handoff.md exists, **When** programmatic resume is
   invoked, **Then** state is validated and restored

---

### US6 - Process Quality Improvements (Priority: P6)

Add ScopeGuard enforcement modes with VSCode diagnostics, SlopDetector MCP tool
and auto-trigger, post-task feedback loops, pre-operation checkpoints with git
stash, observability field population, and brownfield auto-detection.

**Why this priority**: Quality guardrails that prevent regressions. Estimated
+18 points across J1-J6.

**Independent Test**: ScopeGuard shows diagnostics in VSCode Problems panel.
SlopDetector is callable as MCP tool. Feedback loops detect task completion.

**Acceptance Scenarios**:

1. **Given** ScopeGuard is in "warning" mode, **When** a file outside spec scope
   is modified, **Then** a warning diagnostic appears in VSCode Problems panel
2. **Given** SlopDetector is registered as MCP tool, **When** Claude Code calls
   `gofer_check_slop`, **Then** it returns slop patterns found in specified
   files
3. **Given** a task is marked complete in tasks.md, **When** post-task hook
   detects completion, **Then** relevant tests are auto-triggered
4. **Given** a risky operation is about to start, **When**
   PreOperationCheckpoint fires, **Then** git stash is created and rollback
   command is registered
5. **Given** context usage is logged, **When** per-stage aggregation runs,
   **Then** LLM token counts, input/output splits, and costs are populated

---

### US7 - Status Bar and Minor Polish (Priority: P7)

Add data-source indicator to status bar, add eviction telemetry to LRU cache.

**Why this priority**: Small polish items that complete remaining 1-point gaps.
Estimated +2 points.

**Independent Test**: Status bar shows "(real)" or "(est)" suffix. LRU eviction
events are logged.

**Acceptance Scenarios**:

1. **Given** context data comes from ClaudeSessionReader, **When** status bar
   updates, **Then** text shows "Context: N% (real)" or "Context: N% (est)"
2. **Given** observation cache exceeds max size, **When** LRU eviction runs,
   **Then** eviction count and reclaimed tokens are logged to
   context-usage.jsonl

---

### Edge Cases

- What happens when API key is missing for LLM-dependent features? Graceful
  fallback to deterministic alternatives.
- What happens when memory JSONL has entries without `notePath` field? Backward
  compatibility: read-back skips entries without notePath.
- What happens when context-fold-state.json doesn't exist? ContextFolder returns
  sections unmodified (passthrough).
- What happens when ContextCompactor is invoked mid-build? Debounce prevents
  concurrent execution; queue and retry.
- What happens when all 9 REPL tools are called without an active context? Tools
  return empty results with descriptive messages.

## Requirements

### Functional Requirements

- **FR-001**: System MUST register all 9 REPL tools in server.ts `tools/list`
  and `tools/call` handlers
- **FR-002**: System MUST add `gofer.useLayeredMemory` boolean setting to
  package.json with default `false`
- **FR-003**: System MUST wire ParallelAnalysisFramework into ContextBuilder via
  setter pattern
- **FR-004**: System MUST wire ContextCompactor to `critical` health events and
  pass LLM provider
- **FR-005**: System MUST create ContextFolder.ts that reads fold state and
  applies collapsed/summary/expanded rendering
- **FR-006**: System MUST change debounce to trailing-edge and call
  saveCacheToDisk() in deactivate()
- **FR-007**: System MUST trigger LLM compression on warning-level events (not
  just critical)
- **FR-008**: System MUST add `gofer.observationPreservePatterns` VSCode setting
  with runtime reload
- **FR-009**: System MUST add periodic memory consolidation (30-min timer) with
  deactivate cleanup
- **FR-010**: System MUST enforce MAX_MEMORY_COUNT (200) on save, archiving
  lowest priority
- **FR-011**: System MUST write markdown notes with YAML frontmatter (id,
  category, tags, created, priority)
- **FR-012**: System MUST add read-back from markdown notes in MemoryStorage
- **FR-013**: System MUST maintain bidirectional memory links on save
- **FR-014**: System MUST add symbol staleness warnings with `[STALE]` prefix
- **FR-015**: System MUST make CitationVerifier file search async
- **FR-016**: System MUST add configurable staleness threshold for stage
  detection
- **FR-017**: System MUST auto-checkpoint on stage-change events
- **FR-018**: System MUST wire SubAgentDispatcher enforcement with threshold
  blocking
- **FR-019**: System MUST add token budget field to DelegationRecommendation
- **FR-020**: System MUST add deterministic fallback to ResearchSummarizer
- **FR-021**: System MUST auto-trigger research-to-memory conversion on
  research-complete
- **FR-022**: System MUST add AST-aware import extraction to KnowledgeGraph
- **FR-023**: System MUST wire CheckpointValidator into session save flow
- **FR-024**: System MUST add ScopeGuard enforcement modes
  (advisory/warning/blocking)
- **FR-025**: System MUST register SlopDetector as MCP tool and add to
  package.json commands
- **FR-026**: System MUST add post-task feedback hook for auto-test triggering
- **FR-027**: System MUST add PreOperationCheckpoint with git stash and rollback
- **FR-028**: System MUST populate ContextUsageLogger LLM token fields and
  per-stage aggregation
- **FR-029**: System MUST add brownfield auto-detection from workspace analysis
- **FR-030**: System MUST add data-source indicator to status bar text
- **FR-031**: System MUST add LRU eviction telemetry logging
- **FR-032**: System MUST add programmatic SessionResumeCommand with state
  validation
- **FR-033**: System MUST add hook-bridge command detection for stage detection
  (F2)

### Key Entities

- **ContextFolder**: New class reading fold-state from JSON, applying to context
  sections before merge
- **DelegationRecommendation**: Extended with `tokenBudget` field and
  `truncateResult()` method
- **MemoryEntry**: Extended with `backReferences` field for bidirectional
  linking
- **PreOperationCheckpoint**: New entity capturing git stash, timestamp,
  operation description

## Non-Functional Requirements

### Performance

- All new periodic timers MUST use intervals >= 30s and cleanup in deactivate()
- CitationVerifier file search MUST be async (no blocking extension host)
- ContextFolder MUST process fold state in < 10ms for typical context sizes

### Backward Compatibility

- MemoryStorage MUST handle existing JSONL entries without `notePath` or
  `backReferences` fields
- Observation cache MUST migrate entries without `decayTier` (existing behavior
  preserved)
- All new VSCode settings MUST have sensible defaults that maintain current
  behavior

### Stability

- ContextCompactor invocation MUST NOT block buildContext() — run async with
  error isolation
- All LLM-dependent features MUST have deterministic fallbacks when API key is
  unavailable
- No new memory leaks — all timers, listeners, and watchers MUST be disposed in
  deactivate()

## Success Criteria

| Metric                 | Target                              | Measurement                                             |
| ---------------------- | ----------------------------------- | ------------------------------------------------------- |
| Rubric score           | 300/300 (100%)                      | Engineering review against context-management-rubric.md |
| Category completeness  | All 10 categories at or above 90%   | Per-category scoring                                    |
| Zero dead code         | Every new class wired to production | grep for unused imports                                 |
| TypeScript compilation | Zero new errors                     | `npm run compile` clean                                 |
| Test stability         | No new test failures                | Existing 197 tests still pass                           |
| Timer cleanup          | All timers cleared on deactivate    | Manual review of deactivate()                           |

## Assumptions

- Anthropic API key may not be available; all LLM features have deterministic
  fallbacks
- Extension host has sufficient resources for 30-min periodic timers
- Existing JSONL format will remain backward compatible
- The 5 pre-existing test failures in agent-stop-extraction.test.ts are
  unrelated

## Dependencies

- `extension/src/autonomous/ContextBuilder.ts` — central integration point
- `extension/src/extension.ts` — wiring hub for all new connections
- `language-server/src/server.ts` — MCP tool registration
- `extension/package.json` — VSCode settings and commands
- `extension/src/autonomous/ObservationMasker.ts` — decay and compression
- `extension/src/autonomous/MemoryManager.ts` — consolidation, limits, linking
- `extension/src/autonomous/SubAgentDispatcher.ts` — delegation enforcement

## Out of Scope

- New UI components beyond status bar indicator changes
- Cloud infrastructure analysis improvements
- Changes to ClaudeSessionReader privacy boundaries
- Changes to post-tool-use.mjs hook script (minimal changes only)
- New test files (existing test suite validates core functionality)
- Performance benchmarking infrastructure

## Protected Boundaries

- `ContextHealthMonitor.ts` — production-ready at 34/35, minimal changes only
- `ClaudeSessionReader.ts` — privacy-guarded, do not expose new fields
- `MemoryStorage.ts` JSONL format — must maintain backward compatibility
- `post-tool-use.mjs` — runs in Claude Code process, minimal changes only

## Research Traceability

| Research Finding                           | Spec Section    | Reference       |
| ------------------------------------------ | --------------- | --------------- |
| 9 REPL tools unregistered in server.ts     | FR-001, US1     | I3 gap          |
| MemoryLayerManager wired but disabled      | FR-002, US1     | I4 gap          |
| ParallelAnalysisFramework dead code        | FR-003, US1     | I2 gap          |
| ContextCompactor zero callers              | FR-004, US1     | I5 gap          |
| No section-level folding                   | FR-005, US2     | I1 gap          |
| Leading-edge debounce, no deactivate flush | FR-006, US2     | B1 gap          |
| LLM compression only on critical           | FR-007, US2     | B3 gap          |
| No runtime config reload                   | FR-008, US2     | B6 gap          |
| No periodic consolidation                  | FR-009, US3     | C7 gap          |
| No memory count limit                      | FR-010, US3     | C9 gap          |
| Raw markdown dump, no YAML frontmatter     | FR-011, US3     | C10 gap         |
| No read-back from markdown                 | FR-012, US3     | C10 gap         |
| Unidirectional memory links only           | FR-013, US3     | H4 gap          |
| Symbol citation lacks staleness            | FR-014, US3     | C6 gap          |
| Sync file search in CitationVerifier       | FR-015, US3     | C5 gap          |
| Hardcoded 30-min staleness                 | FR-016, US4     | F2 gap          |
| No stage-change checkpoints                | FR-017, US4     | F4 gap          |
| Advisory-only SubAgentDispatcher           | FR-018-019, US4 | F5, G2, G3 gaps |
| ResearchSummarizer needs API key           | FR-020, US5     | D3 gap          |
| Manual research-to-memory conversion       | FR-021, US5     | D4 gap          |
| No AST-aware import extraction             | FR-022, US5     | D5 gap          |
| CheckpointValidator not in save flow       | FR-023, US5     | E1 gap          |
| ScopeGuard advisory only                   | FR-024, US6     | J1 gap          |
| SlopDetector manual only                   | FR-025, US6     | J2 gap          |
| No post-task feedback hooks                | FR-026, US6     | J3 gap          |
| No pre-operation checkpoints               | FR-027, US6     | J4 gap          |
| Empty observability fields                 | FR-028, US6     | J5 gap          |
| No brownfield auto-detection               | FR-029, US6     | J6 gap          |
| No data-source in status bar               | FR-030, US7     | A4 gap          |
| No eviction telemetry                      | FR-031, US7     | B7 gap          |
| No programmatic session resume             | FR-032, US5     | E2 gap          |
| No hook-bridge stage detection             | FR-033, US4     | F2 gap          |
