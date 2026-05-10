---
id: '017-context-rubric-100-percent'
title: 'Context Management Rubric — 100% Completion'
status: draft
created: '2026-02-09'
updated: '2026-02-09'
author: Claude
---

# Context Management Rubric — 100% Completion

## Overview

Gofer's context management system currently scores 155/300 (52%) against its own
research-backed rubric across 60 items in 10 categories. This feature closes
every gap to achieve 300/300 (100%). The work spans four tiers: fixing a
critical turn counter bug that disables observation masking, wiring 4 dead code
components into production, building missing features (three-tier decay, LLM
compression, knowledge graph population), and completing aspirational features
(RLM folding, MemGPT layers, parallel analysis).

**Research Reference**: See `research.md` for full codebase analysis and
integration points.

## User Stories

### US1: Fix Observation Masking Pipeline (P0 — Critical)

**As a** Gofer user running long coding sessions **I want** old tool outputs to
be automatically masked and compressed **So that** my context window stays clean
and Claude's accuracy doesn't degrade

**Acceptance Criteria**:

- [ ] Turn counter advances on every Claude Code API call (via hook bridge
      events)
- [ ] Observations older than the stage-specific window are automatically masked
- [ ] Three decay tiers: Full → Key-points summary → Masked placeholder
- [ ] Type-specific key-point extraction (file reads: signatures; commands: exit
      status; tests: pass/fail)
- [ ] Error-containing observations are never masked regardless of age
- [ ] Observation cache persisted to disk after every masking cycle
- [ ] MCP `gofer_expand_observation` tool retrieves masked observations from
      disk cache

### US2: Wire Dead Code Validators (P0 — Critical)

**As a** Gofer developer **I want** all built-but-unwired components to be
active in production **So that** memory citation verification, checkpoint
validation, scope protection, and slop detection work

**Acceptance Criteria**:

- [ ] CitationVerifier checks memory file-path citations before injection; warns
      if >50% stale
- [ ] CitationVerifier checks code symbol references; logs missing symbols
- [ ] CheckpointValidator validates handoff documents before save; warns on
      missing sections or token budget exceeded
- [ ] ScopeGuard monitors file accesses against spec.md "Protected Boundaries";
      logs violations
- [ ] SlopDetector registered as `gofer.checkForSlop` command; scans source for
      7+ quality patterns
- [ ] All components instantiated in `extension.ts` using existing component
      initialization pattern

### US3: Populate Knowledge Graph (P1 — High)

**As a** Gofer user **I want** the knowledge graph to automatically capture file
accesses, import relationships, patterns, and decisions **So that** context
building can surface related code entities and reduce research duplication

**Acceptance Criteria**:

- [ ] `recordFileAccess()` called from hook bridge when file_read tool detected
- [ ] `recordImport()` called when TypeScript/JavaScript import statements found
      in read files
- [ ] `recordPattern()` called when ContinuousMemoryWriter records pattern-type
      memories
- [ ] `recordDecision()` called when decisions are recorded
- [ ] Graph has >0 nodes after a typical coding session
- [ ] ContextBuilder.loadGraphContext() returns meaningful connected entities

### US4: Add LLM-Powered Features (P1 — High)

**As a** Gofer user with an Anthropic API key configured **I want** LLM-based
observation compression, research summarization, and context compaction **So
that** context usage is minimized while preserving semantic meaning

**Acceptance Criteria**:

- [ ] Observation compression uses Haiku to generate key-point summaries (rate
      limited to 10 calls/min)
- [ ] Research summarizer converts chunks to 1-2 sentence summaries stored as
      semantic memories
- [ ] Context compactor calls real LLM instead of fallback for task
      summarization
- [ ] All LLM features degrade gracefully to deterministic fallbacks when no API
      key is configured
- [ ] LLM usage logged to `.specify/logs/context-usage.jsonl` with token counts

### US5: Complete Memory System (P1 — High)

**As a** Gofer user building up knowledge over multiple sessions **I want**
memory citations verified, memories linked to related memories, and research
findings automatically captured **So that** the memory system stays accurate and
interconnected over time

**Acceptance Criteria**:

- [ ] Memory priority auto-increments via `useMemory(id)` API
- [ ] Keyword matching improved beyond substring (stemming or trigram overlap)
- [ ] Research-complete events trigger auto-conversion of findings to discovery
      memories
- [ ] Memories exceeding 500 chars create companion markdown files in
      `memory-notes/`
- [ ] Memory consolidation runs periodically with metrics logging
- [ ] Stale memories with >50% dead citations auto-demoted in priority
- [ ] `relatedMemories` field computed on save via enhanced Jaccard similarity

### US6: Complete Stage-Aware Context Management (P2 — Medium)

**As a** Gofer user progressing through pipeline stages **I want** reliable
stage detection, budget enforcement, and progressive delegation recommendations
**So that** context is optimally allocated for each workflow phase

**Acceptance Criteria**:

- [ ] Stage detection validates file content (not just existence) before
      transitioning
- [ ] Budget enforcement can truncate (not just warn) when categories exceed
      allocation
- [ ] Stage transitions auto-save checkpoints with transition metadata
- [ ] Progressive delegation emits `delegation-required` event when health
      exceeds threshold
- [ ] Delegation decisions logged to context usage JSONL

### US7: Build Advanced Context Engineering (P2 — Medium)

**As a** Gofer power user **I want** RLM-style context folding, MemGPT-style
memory layers, and parallel analysis capabilities **So that** I can work on
large codebases without context degradation

**Acceptance Criteria**:

- [ ] MCP folding tools operate on real observation content (not placeholder
      strings)
- [ ] Disk cache enables fold state recovery across sessions
- [ ] SubAgentDispatcher provides advisory delegation recommendations based on
      context health
- [ ] MemGPT three-layer API explicitly manages core/archival/recall memory
      tiers
- [ ] Context REPL provides peek, grep, expand, fold operations via MCP tools
- [ ] Parallel analysis framework can partition work across multiple agent
      invocations

### US8: Complete Process & Quality Controls (P2 — Medium)

**As a** Gofer user implementing features **I want** continuous feedback loops,
error recovery patterns, and brownfield analysis guidance **So that**
implementation quality is maintained throughout the pipeline

**Acceptance Criteria**:

- [ ] Test verification after each task completion (block on failure)
- [ ] Git checkpoint created before risky operations; auto-rollback on failure
- [ ] Error recovery patterns recorded as memories for future sessions
- [ ] Brownfield analysis template available in research stage
- [ ] Per-stage cost tracking and quality metrics in observability logs
- [ ] Planning approval gate validates tasks.md frontmatter status field
- [ ] Pipeline observability dashboard shows slop count, test pass rate

## Functional Requirements

### FR1: Turn Counter Advancement

The turn counter must advance by 1 on every Claude Code API interaction,
detected via the hook bridge `bridge-update` event. Each call to
`trackObservation()` must be followed by `incrementTurn()`.

- **Validation**: After 10 API calls, `getCurrentTurn()` returns 10
- **Integration**: `extension.ts` hook bridge handler (line ~1465)

### FR2: Three-Tier Observation Decay

Replace binary `masked: boolean` with
`DecayTier = 'full' | 'key-points' | 'masked'`. Add transition logic:

- `full` → `key-points` at `ageThresholdTurns * keyPointsAgeFraction` (default
  60%)
- `key-points` → `masked` at `ageThresholdTurns` (default 10 turns)

Add type-specific key-point extractors:

- **file_read**: First 3 lines (signature) + last 2 lines
- **command_output**: First 5 + last 5 lines
- **search_result**: File paths and match count
- **test_output**: Pass/fail summary

- **Validation**: Observation at turn 0 with threshold 10 transitions to
  key-points at turn 6, masked at turn 10
- **Integration**: `ObservationMasker.ts` — rewrite `maskOldObservations()`, add
  extractors

### FR3: Observation Disk Persistence

Call `saveCacheToDisk()` after masking operations and after observation
tracking. Ensure MCP `gofer_expand_observation` tool can read the persisted
cache.

- **Validation**: After masking, `.specify/memory/observation-cache/index.json`
  contains observation entries. MCP tool returns full content for a masked
  observation ID.
- **Integration**: `ContextBuilder.ts` after masking, `extension.ts` after
  tracking

### FR4: Dead Code Component Wiring

Instantiate and wire 4 components following the existing initialization pattern
in `extension.ts`:

| Component           | Instantiate                      | Wire To                                                                   |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| CitationVerifier    | `extension.ts:~1505`             | `ContextBuilder.buildContext()` before memory formatting                  |
| CheckpointValidator | `AutoHandoffTrigger` constructor | `generateHandoffDocument()` before return                                 |
| ScopeGuard          | `extension.ts:~1515`             | Hook bridge `bridge-update` handler + `ContextBuilder.trackObservation()` |
| SlopDetector        | `extension.ts:~1520`             | New `gofer.checkForSlop` command                                          |

- **Validation**: Each component logs initialization. CitationVerifier warns on
  stale citations. CheckpointValidator warns on invalid handoff. ScopeGuard logs
  file boundary violations. SlopDetector returns scan report.
- **Integration**: Follow existing setter pattern from `autonomousCommands.ts`

### FR5: Knowledge Graph Population

Wire 4 data producer paths into the existing KnowledgeGraph API:

1. **File access**: In hook bridge handler, call `recordFileAccess(filePath)`
   when `toolName` is Read/file_read
2. **Import analysis**: Parse `import` statements from file content, call
   `recordImport(source, target)`
3. **Pattern recording**: In ContinuousMemoryWriter, call `recordPattern()` when
   saving pattern-category memories
4. **Decision recording**: In ContinuousMemoryWriter, call `recordDecision()`
   when saving decision-category memories

- **Validation**: After reading 5 files, graph has ≥5 file nodes. After
  analyzing imports, graph has edges. `loadGraphContext()` returns non-empty
  context.
- **Integration**: `extension.ts` hook bridge handler,
  `ContinuousMemoryWriter.ts`

### FR6: LLM Integration for Compression/Summarization

Add optional LLM provider (Haiku) to three components:

1. **ObservationMasker**: Semantic compression at key-points → masked transition
   (optional, replaces deterministic extractors when API key available)
2. **ResearchSummarizer** (new): Summarize research chunks into 1-2 sentence
   memories
3. **ContextCompactor**: Replace `generateFallbackSummary()` with real Haiku API
   call

All must:

- Accept `anthropicApiKey` from VSCode settings (`gofer.anthropicApiKey`)
- Fall back to deterministic methods when no key configured
- Rate limit to 10 calls/minute per component
- Log usage to context-usage JSONL

- **Validation**: With API key: LLM summaries generated. Without API key:
  deterministic fallback used. Rate limit prevents >10 calls/min.
- **Integration**: `extension/src/council/` provides existing LLM API pattern

### FR7: Enhanced Memory System

1. **useMemory(id)** API: Auto-increment priority when memory is used in context
   building
2. **Improved matching**: Replace substring with trigram overlap or stemming for
   keyword coverage calculation
3. **Research→Memory**: Emit `research-complete` event; handler creates
   discovery memories from research chunks
4. **Dual storage**: Write `memory-notes/{uuid}.md` for memories >500 chars
5. **Related memories**: Compute `relatedMemories: string[]` on save via
   enhanced Jaccard with category weighting

- **Validation**: Priority increases after `useMemory()`. Trigram matching finds
  "authenticate" for query "auth". Research completion creates ≥1 memory. Long
  memories have markdown companion files.
- **Integration**: `MemoryManager.ts`, `ContextBuilder.ts`,
  `ContinuousMemoryWriter.ts`

### FR8: Stage-Aware Enhancements

1. **Validated stage detection**: Check file size >0 and required sections
   exist, not just file presence
2. **Budget cap mode**: When `enforceBudgetCaps: true`, truncate context
   sections exceeding stage budget
3. **Transition checkpoints**: On stage change, validate previous stage
   completion, auto-save checkpoint
4. **Delegation enforcement**: Emit `delegation-required` event when utilization
   exceeds `delegationPolicy.subAgentThreshold`

- **Validation**: Empty spec.md doesn't trigger "plan" stage. Over-budget
  section truncated. Stage transition generates checkpoint. Delegation event
  emitted at threshold.
- **Integration**: `WorkspaceContextProvider.ts`, `ContextBuilder.ts`,
  `StageContextProfile.ts`

### FR9: SubAgentDispatcher (Advisory)

Create advisory dispatcher that recommends delegation based on context health:

1. Monitor `ContextHealthMonitor` events
2. When utilization exceeds stage delegation threshold, emit advisory event
3. Log recommendation (which agent type, what task type) to context-usage JSONL
4. Provide `getRecommendation()` API for Claude Code prompts to query

**Constraint**: Extension cannot programmatically spawn agents — advisory only.

- **Validation**: At 75% utilization with 60% threshold, dispatcher recommends
  delegation. Recommendation logged.
- **Integration**: New file `SubAgentDispatcher.ts`, wired to
  ContextHealthMonitor

### FR10: RLM Context Folding & REPL

1. **Fix observation content**: Ensure hook bridge captures real tool response
   content, not placeholder strings
2. **Disk cache persistence**: `saveCacheToDisk()` called on schedule, loaded on
   startup
3. **Interactive MCP tools**: peek (summary), expand (full content), fold
   (collapse), grep (search within observations)
4. **Fold state recovery**: Persist fold levels to disk, restore on session
   resume

- **Validation**: MCP expand returns real file content. Fold state survives
  extension restart. Grep finds text within cached observations.
- **Integration**: `ObservationMasker.ts`, MCP tool handler in language-server

### FR11: MemGPT Three-Layer Architecture

Formalize the existing informal layers:

1. **Core**: Always-loaded context (constitution, stage profile, current task) —
   explicit `getCoreMemory()` API
2. **Archival**: Searchable on-disk storage (JSONL memories, research chunks) —
   explicit `searchArchival(query)` API
3. **Recall**: Recent observations and results — explicit
   `getRecallMemory(limit)` API
4. **Tier management**: When archival exceeds budget, demote lowest-priority
   memories. When core changes, re-index archival relevance.

- **Validation**: `getCoreMemory()` returns constitution + task.
  `searchArchival("auth")` returns relevant memories. `getRecallMemory(5)`
  returns 5 most recent observations.
- **Integration**: New API layer on top of existing `MemoryManager`,
  `ObservationMasker`, `ContextBuilder`

### FR12: Process & Quality Controls

1. **Feedback loops**: After each task, run tests. On failure, block next task.
   Record error pattern as memory.
2. **Error recovery**: Git stash before risky operations. On failure, pop stash.
   Log recovery.
3. **Brownfield template**: Create `.specify/templates/brownfield-analysis.md`
   with sections for constraints, tech debt, caution areas, dependencies.
4. **Observability**: Per-stage cost tracking (LLM tokens, time). Quality
   metrics (slop count per scan, test pass rate). Add to status bar dashboard.
5. **Planning gate**: Validate `tasks.md` frontmatter `status: approved` before
   `/5_gofer_implement` proceeds.

- **Validation**: Test failure blocks next task. Git stash created before risky
  ops. Brownfield template exists. Observability log includes cost + quality
  fields.
- **Integration**: `autonomousCommands.ts`, new `BrownfieldAnalyzer.ts`,
  `ContextUsageLogger.ts`

## Non-Functional Requirements

### Performance

- LLM calls (B3, D3, I5) must complete in <5 seconds or fall back to
  deterministic methods
- Observation masking cycle must complete in <100ms for up to 100 cached
  observations
- KnowledgeGraph queries must return in <50ms for graphs up to 5000 nodes
- Memory save (including related-memories computation) must complete in <200ms

### Reliability

- All LLM features must have deterministic fallbacks
- No feature may increase the existing 5 pre-existing test failures
- Component initialization failures must be non-fatal (warn and continue)

### Backward Compatibility

- `ObservationEntry` migration from `masked: boolean` to `DecayTier` must handle
  legacy cache files
- Existing JSONL memory format must remain valid (new fields are optional)
- `observationWindow` values in `context-profiles.yaml` must continue working

## Success Criteria

| Metric            | Target            | Measurement                            |
| ----------------- | ----------------- | -------------------------------------- |
| Rubric Category A | 35/35 (100%)      | Re-score after implementation          |
| Rubric Category B | 40/40 (100%)      | Re-score after implementation          |
| Rubric Category C | 50/50 (100%)      | Re-score after implementation          |
| Rubric Category D | 25/25 (100%)      | Re-score after implementation          |
| Rubric Category E | 30/30 (100%)      | Re-score after implementation          |
| Rubric Category F | 25/25 (100%)      | Re-score after implementation          |
| Rubric Category G | 15/15 (100%)      | Re-score after implementation          |
| Rubric Category H | 20/20 (100%)      | Re-score after implementation          |
| Rubric Category I | 25/25 (100%)      | Re-score after implementation          |
| Rubric Category J | 35/35 (100%)      | Re-score after implementation          |
| Overall Score     | 300/300 (100%)    | Sum of all categories                  |
| Test Suite        | No new failures   | `npm test` produces same failure count |
| TypeScript        | Clean compilation | `tsc --noEmit` passes                  |

## Assumptions

- Anthropic API key will be available via `gofer.anthropicApiKey` VSCode setting
  for LLM features
- Claude 3.5 Haiku remains available at current pricing for
  compression/summarization
- The extension cannot programmatically spawn Claude Code sub-agents (G3, I2 are
  advisory only)
- Existing `masked: boolean` observation cache files will be migrated on first
  load
- 5 pre-existing test failures in `agent-stop-extraction.test.ts` are acceptable
- The hook bridge `post-tool-use.mjs` is the primary data source for observation
  tracking

## Dependencies

- `@anthropic-ai/sdk` — Already in codebase, used by council module
- `extension/src/autonomous/ObservationMasker.ts` — Core file requiring
  three-tier decay rewrite
- `extension/src/autonomous/ContextBuilder.ts` — Central integration point
  (~2500 lines)
- `extension/src/extension.ts` — Component initialization and wiring (~1500
  lines)
- `extension/src/autonomous/KnowledgeGraph.ts` — Graph API (needs producers, not
  changes)
- `extension/src/autonomous/CitationVerifier.ts` — Ready to wire (194 lines)
- `extension/src/autonomous/CheckpointValidator.ts` — Ready to wire (67 lines)
- `extension/src/autonomous/ScopeGuard.ts` — Ready to wire (108 lines)
- `extension/src/autonomous/SlopDetector.ts` — Ready to wire (168 lines)
- `extension/src/autonomous/ContextCompactor.ts` — Needs LLM call wiring (555
  lines)

## Out of Scope

- Changing the VSCode extension API surface or extension manifest commands
  (except adding `gofer.checkForSlop`)
- Modifying the release process or version management
- Rewriting the language server MCP protocol (only extending existing tool
  handlers)
- Cloud infrastructure analysis (`/10_gofer_cloud`)
- Council module changes (LLM council is a separate feature)
- Changing the Gofer pipeline command structure (commands 0-6)

## Protected Boundaries

These files/systems must NOT be modified:

- `release-auto.sh` — Release automation
- `docs/releases.json` — Auto-updater manifest
- `.claude/commands/` — Pipeline command definitions
- `extension/package.json` — Extension manifest (except adding
  `gofer.checkForSlop` command)

## Glossary

| Term            | Definition                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Observation     | A tool output (file read, command, search, test) tracked by ObservationMasker                              |
| DecayTier       | One of three observation states: `full` (complete), `key-points` (summarized), `masked` (placeholder only) |
| Turn            | A single Claude Code API interaction, tracked by incrementing the turn counter                             |
| Bridge          | The hook-based communication channel between Claude Code and the VSCode extension                          |
| Core Memory     | Always-in-context data: constitution, stage profile, current task                                          |
| Archival Memory | Searchable on-disk storage: JSONL memories, research chunks                                                |
| Recall Memory   | Recent observations and tool outputs in the observation cache                                              |

## Research Traceability

| Research Finding                              | Spec Section   | Reference                     |
| --------------------------------------------- | -------------- | ----------------------------- |
| Turn counter bug in extension.ts:1465         | FR1            | B1 gap                        |
| Binary masking in ObservationMasker.ts:51-328 | FR2            | B2 gap                        |
| saveCacheToDisk() never called                | FR3            | B4 gap                        |
| 4 dead code components                        | FR4            | C5, C6, E5, J1, J2 gaps       |
| KnowledgeGraph zero producers                 | FR5            | H1-H3 gaps                    |
| LLM API pattern in council/                   | FR6            | B3, D3, I5 gaps               |
| Haiku for compression                         | FR6            | Tech Decision 1               |
| Enhanced Jaccard for similarity               | FR7            | Tech Decision 2               |
| In-place DecayTier migration                  | FR2            | Tech Decision 3               |
| Advisory-only SubAgentDispatcher              | FR9            | Tech Decision 4, Constraint 1 |
| API key required for LLM features             | FR6            | Constraint 2                  |
| Backward compat for ObservationEntry          | FR2            | Constraint 3                  |
| Pre-existing test failures                    | Non-Functional | Constraint 5                  |
| Hook bridge integration point                 | FR1, FR3, FR5  | Integration Point 1           |
| ContextBuilder.buildContext()                 | FR4, FR7, FR8  | Integration Point 2           |
| AutoHandoffTrigger.generateHandoffDocument()  | FR4            | Integration Point 3           |
| ContinuousMemoryWriter events                 | FR5, FR7       | Integration Point 4           |
| gofer.saveProgress command                    | FR8            | Integration Point 5           |
