---
id: 019-rubric-final-27-points
title: 'Context Management Rubric: Final 27 Points to 300/300'
status: complete
created: 2026-02-10T14:45:00Z
updated: 2026-02-10T14:45:00Z
author: Claude
---

# Context Management Rubric: Final 27 Points to 300/300

## Overview

Close all remaining gaps in the context management engineering rubric, upgrading the score from 273/300 (91%) to 300/300 (100%). This involves 24 items upgraded from 4/5 → 5/5 and 1 item from 3/5 → 5/5, across 10 categories spanning observation management, memory systems, research pipelines, session management, stage-aware context, sub-agent architecture, knowledge graphs, advanced context engineering, and process quality.

**Research Reference**: See `research.md` for detailed codebase analysis and gap assessment per item.

## User Stories

### US1: Production-Ready Observation Management (P1)

**As a** Gofer extension user
**I want** observation decay, error preservation, and stage windows to be fully tuned and configurable
**So that** context management adapts optimally to different workflow stages

**Acceptance Criteria**:
- [X] B2: Decay rates configurable per observation type (file_read, command_output, test_output, search) via YAML config
- [X] B5: Error detection distinguishes actual error traces from mentions of error-handling code
- [X] B8: Stage observation windows validated with logged metrics (observation age at expansion)

### US2: Complete Memory System (P1)

**As a** Gofer extension user
**I want** the memory system to enforce priority discipline, auto-promote large entries, and verify symbols via AST
**So that** memory quality and relevance continuously improve

**Acceptance Criteria**:
- [X] C2: `recordUsage()` accepts reason and source parameters; usage types logged for audit
- [X] C3: Memory coverage matching uses TF-IDF weighting with unified keyword extractor
- [X] C4: ContinuousMemoryWriter captures 5+ additional event types (stage-change, compaction, reseed, scope-violation, slop-detected)
- [X] C6: CitationVerifier uses TypeScript Compiler API for function/class symbol extraction
- [X] C10: Memories exceeding 500 characters auto-promoted to markdown notes

### US3: Research Pipeline Completion (P2)

**As a** Gofer extension user
**I want** research summaries to consolidate findings across chunks
**So that** research-to-memory conversion produces unified insights, not isolated chunk summaries

**Acceptance Criteria**:
- [X] D4: Post-summarization consolidation pass merges overlapping findings and produces a "Research Synthesis" memory

### US4: Session Continuity (P1)

**As a** Gofer extension user
**I want** sessions to auto-resume on activation and context reseeds to preserve high-value observations
**So that** no progress or critical context is lost between sessions

**Acceptance Criteria**:
- [X] E2: On activation, detect recent checkpoints (<24h) and offer "Resume previous session?" notification
- [X] E4: Selective reseed preserves error-containing and recently-expanded observations

### US5: Stage-Aware Intelligence (P2)

**As a** Gofer extension user
**I want** stage detection to handle non-linear workflows and budget enforcement to offer blocking mode
**So that** context management correctly adapts even when users jump between pipeline stages

**Acceptance Criteria**:
- [X] F2: Stage detection tracks last-known stage and detects backward transitions
- [X] F3: Budget enforcement supports 'blocking' mode that prevents context builds exceeding limits
- [X] F4: Artifact modification times used to detect subtle stage re-entries

### US6: Dynamic Sub-Agent Management (P2)

**As a** Gofer extension user
**I want** sub-agent delegation to be programmatically enforced and results automatically truncated
**So that** context stays lean without manual intervention

**Acceptance Criteria**:
- [X] F5: `shouldDelegate()` method returns actionable recommendation; prominent warning injected at blocking level
- [X] G3: `dispatchIfRecommended()` formats dispatch instructions with result collection points

### US7: Knowledge Graph Intelligence (P3)

**As a** Gofer extension user
**I want** graph traversals to use edge weights and memory links to use semantic similarity
**So that** knowledge navigation returns the most relevant results first

**Acceptance Criteria**:
- [X] H2: BFS uses priority queue sorted by cumulative edge weight; results ranked by relevance
- [X] H4: Related memories computed via TF-IDF similarity across full corpus (not just last 20)

### US8: Advanced Context Engineering (P2)

**As a** Gofer extension user
**I want** parallel analysis to dispatch actual queries, REPL to support compound operations, and compaction to work without an API key
**So that** advanced context features are fully functional regardless of configuration

**Acceptance Criteria**:
- [X] I2: ParallelAnalysisFramework formats explicit sub-agent dispatch instructions
- [X] I3: Compound MCP tool supports multi-operation sequences; history depth increased to 50
- [X] I5: Deterministic compaction fallback preserves task descriptions, error messages, and file summaries

### US9: Process Quality Excellence (P1)

**As a** Gofer extension user
**I want** slop detection to surface results, test runner to execute automatically, brownfield analysis to generate templates, and artifact validation to check pipeline completeness
**So that** quality gates are comprehensive and actionable

**Acceptance Criteria**:
- [X] J2: Slop detection results shown via VSCode notification and diagnostics entries
- [X] J3: Test runner detects framework and executes tests; auto-triggered on test-related task completion
- [X] J6: `generateBrownfieldAnalysis()` produces structured markdown with dependency map, protected boundaries
- [X] J7: `validatePipelineArtifacts()` checks existence and completeness of research.md, spec.md, plan.md, tasks.md

## Functional Requirements

### FR-01: Per-Type Observation Decay Configuration

Observation decay rates configurable per observation type. Default rates provided. Override via `.specify/memory/observation-config.yaml` with per-type `ageThresholdTurns` and `keyPointsAgeFraction`.

- **Validation**: Config YAML with per-type rates loads correctly; different types decay at different speeds
- **Integration**: ObservationMasker.ts config system (existing setter pattern)

### FR-02: Content-Aware Error Detection

Error preservation distinguishes actual error output (stack traces, exit codes, test failures) from documentation mentioning errors. Uses structural heuristics: line starts with `at `, contains `Error:` prefix, exit code patterns, test FAIL markers.

- **Validation**: Documentation file mentioning "error handling" is NOT preserved; stack trace IS preserved
- **Integration**: ObservationMasker.ts `shouldPreserve()` method

### FR-03: Usage Reason Tracking

`recordUsage()` API expanded with optional `reason` and `source` parameters. Backward compatible. Usage reasons: `'context_load' | 'user_recall' | 'search_match' | 'consolidation'`.

- **Validation**: Existing `recordUsage(id)` calls still work; new calls log source
- **Integration**: MemoryManager.ts, all callers in extension.ts and ContextBuilder.ts

### FR-04: Unified TF-IDF Keyword Extraction

Single keyword extraction utility shared between ContextBuilder and MemoryManager. Uses TF-IDF weighting from existing ResearchChunker infrastructure. Extracts up to 15 keywords with proper stopword filtering.

- **Validation**: Coverage matching returns better results for long task descriptions
- **Integration**: New shared utility consumed by ContextBuilder.ts and MemoryManager.ts

### FR-05: TypeScript AST Symbol Verification

CitationVerifier uses `ts.createSourceFile()` to parse TypeScript files and extract declared symbols (functions, classes, interfaces, types). Cross-references against cited symbols in memories.

- **Validation**: Correctly identifies exported function names from .ts files without full project compilation
- **Integration**: CitationVerifier.ts, typescript package (existing dependency)

### FR-06: Auto-Promotion to Markdown

MemoryStorage automatically promotes memories exceeding a character threshold to markdown note files. JSONL entry updated with truncated content + `notePath` reference.

- **Validation**: Memory with >500 chars auto-creates `.specify/memory/memory-notes/{uuid}.md`
- **Integration**: MemoryStorage.ts save path

### FR-07: Cross-Chunk Research Consolidation

After per-chunk summarization, a consolidation step merges overlapping findings, deduplicates entities, and produces a single "Research Synthesis" discovery memory.

- **Validation**: Multiple chunks about the same topic produce one consolidated finding
- **Integration**: ResearchSummarizer.ts post-loop step

### FR-08: Auto-Resume on Activation

Extension activation checks for recent checkpoints (<24h). If found, displays notification with feature name, stage, and "Resume" action button. Clicking "Resume" invokes the appropriate pipeline command.

- **Validation**: After interrupted session, re-opening VSCode shows resume notification
- **Integration**: extension.ts activate() early initialization

### FR-09: Selective Context Reseed

`reseedContext()` preserves: (1) error-containing observations, (2) observations expanded in the last 3 turns, (3) observations from the current turn. Other observations cleared.

- **Validation**: After reseed, error traces remain in context while stale file reads are cleared
- **Integration**: ContextBuilder.ts reseedContext(), ObservationMasker filter API

### FR-10: Non-Linear Stage Detection

Stage detection tracks `lastKnownStage` and detects backward transitions by comparing detected stage vs. stored stage. Explicit `setStage()` API for manual override. Stage history logged.

- **Validation**: Editing research.md during implement stage correctly detects research re-entry
- **Integration**: WorkspaceContextProvider.ts

### FR-11: Blocking Budget Enforcement

Budget enforcement mode configurable: `'advisory' | 'truncate' | 'blocking'`. Default: `'truncate'`. In blocking mode, `buildContext()` returns an error result (not throws) when total exceeds configured limit.

- **Validation**: With blocking mode enabled, over-budget context build returns error with reason
- **Integration**: ContextBuilder.ts buildContext() pre-check

### FR-12: Programmatic Delegation Enforcement

`shouldDelegate()` returns structured recommendation. At blocking enforcement level, injects prominent "DELEGATION REQUIRED" section. `dispatchIfRecommended()` formats structured dispatch instructions.

- **Validation**: At 70%+ utilization, context includes explicit dispatch instructions
- **Integration**: SubAgentDispatcher.ts, ContextBuilder.ts

### FR-13: Weighted BFS Graph Traversal

`querySubgraphWeighted()` uses priority queue sorted by cumulative edge weight. Returns results ranked by relevance score. Existing unweighted `querySubgraph()` preserved for backward compatibility.

- **Validation**: Nodes connected by high-weight edges appear first in results
- **Integration**: KnowledgeGraph.ts

### FR-14: TF-IDF Memory Similarity

Related memories computed via TF-IDF similarity across all memories (not just last 20). Uses shared TF-IDF utility from FR-04.

- **Validation**: Old but highly relevant memories appear in related results
- **Integration**: MemoryManager.ts, shared TF-IDF utility

### FR-15: Parallel Analysis Dispatch

ParallelAnalysisFramework generates explicit sub-agent dispatch instructions with structured result collection markers.

- **Validation**: Context output includes actionable "dispatch this query to agent X" instructions
- **Integration**: ParallelAnalysisFramework.ts, ContextBuilder.ts

### FR-16: Compound REPL Operations

New `gofer_context_repl` MCP tool accepts array of operations to execute in sequence. Compound operations like "fold all observations older than N turns". History depth increased to 50.

- **Validation**: Single MCP call executes 3 fold operations; history shows all 3
- **Integration**: language-server toolHandler.ts, server.ts

### FR-17: Content-Aware Compaction Fallback

Deterministic fallback extracts first line of each task description, preserves error messages, includes file modification summary. Parses context sections for intelligent reduction.

- **Validation**: Without API key, compaction summary includes task descriptions and error context
- **Integration**: ContextCompactor.ts generateFallbackSummary()

### FR-18: Slop Detection User Surface

Auto-trigger results shown via VSCode information notification with issue count. Findings added to VSCode diagnostics collection. Scan history logged to JSONL.

- **Validation**: After task completion, user sees "Slop scan: 3 issues found" notification
- **Integration**: extension.ts bridge-update handler, SlopDetector.ts

### FR-19: Test Runner Implementation

`gofer_run_tests` MCP tool detects test framework (vitest/jest/pytest), executes tests, parses results into structured output. Auto-trigger on test-related task completion.

- **Validation**: MCP tool call returns structured test results (pass/fail counts, failures)
- **Integration**: language-server toolHandler.ts

### FR-20: Brownfield Analysis Template

`generateBrownfieldAnalysis()` produces structured markdown: dependency count, high-fan-in files, source file structure, test directory coverage, suggested protected boundaries. Template at `.specify/templates/brownfield-analysis.md`. Wired into research pipeline.

- **Validation**: Running analysis on Gofer codebase generates meaningful brownfield report
- **Integration**: ScopeGuard.ts, research pipeline wiring

### FR-21: Pipeline Artifact Validation

`validatePipelineArtifacts(specDir)` checks existence and completeness of pipeline artifacts. Validates: research.md has headings, spec.md has user stories, plan.md has phases, tasks.md has checkbox tasks. Returns structured validation report.

- **Validation**: Missing spec.md returns validation error; incomplete tasks.md returns warning
- **Integration**: CheckpointValidator.ts

## Non-Functional Requirements

### Performance

- TypeScript AST parsing (FR-05) must complete in <200ms per file for files under 2000 lines
- TF-IDF computation (FR-04) must handle 500 memories in <100ms
- All changes must not increase `npm run compile` time by more than 10%

### Compatibility

- All API changes backward compatible (new optional parameters only)
- Existing test suite must continue to pass (excluding 5 pre-existing failures in agent-stop-extraction)
- No new npm dependencies added

### Maintainability

- extension.ts additions minimized; prefer extracting to utility files
- Source-level test assertions in observation-tracking.test.ts updated to match changes

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rubric score | 300/300 (100%) | Rubric re-assessment after implementation |
| Test stability | 0 new failures | `npm test` before/after comparison |
| Compilation | 0 errors | `npm run compile` success |
| Category minimum | 100% (5/5 per item) | All 60 rubric items at 5/5 |
| Dead code | 0 lines | grep verification of all module callers |

## Assumptions

- TypeScript compiler API (`ts.createSourceFile`) is available as existing dependency
- ResearchChunker's TF-IDF infrastructure can be extracted into a shared utility
- Per-type decay rates can be backward-compatible with existing observation cache format
- Priority queue for graph traversal doesn't need a heap (graph capped at 5000 nodes)
- Test framework detection can rely on config file existence (vitest.config, jest.config, pytest.ini)

## Dependencies

- `ObservationMasker.ts` — core observation management (B2, B5, B8)
- `MemoryManager.ts` + `MemoryStorage.ts` — memory system (C2, C4, C10)
- `ContextBuilder.ts` — context generation (C3, E4, F3)
- `CitationVerifier.ts` — citation system (C6)
- `ResearchSummarizer.ts` — research pipeline (D4)
- `WorkspaceContextProvider.ts` — stage detection (F2, F4)
- `SubAgentDispatcher.ts` — delegation (F5, G3)
- `KnowledgeGraph.ts` — graph queries (H2, H4)
- `ParallelAnalysisFramework.ts` — parallelization (I2)
- `ContextCompactor.ts` — compaction (I5)
- `ScopeGuard.ts` — brownfield (J6)
- `SlopDetector.ts` — quality (J2)
- `CheckpointValidator.ts` — validation (J7)
- `toolHandler.ts` + `server.ts` — MCP tools (I3, J3)
- `extension.ts` — wiring hub (E2, event sources)

## Protected Boundaries

- `ContextHealthMonitor.ts` — minimal changes only
- `ClaudeSessionReader.ts` — do not modify
- `post-tool-use.mjs` — minimal changes only

## Out of Scope

- Embedding-based semantic matching (would require external API/model)
- Full language server protocol integration for AST (using lightweight `createSourceFile` instead)
- Production deployment metrics (focus is on code completeness, not production validation)
- UI changes beyond notifications (no new webviews, panels, or tree views)

## Research Traceability

| Research Finding | Spec Section | Reference |
|-----------------|--------------|-----------|
| Per-type decay rates needed | FR-01 | B2 gap |
| Binary error preservation | FR-02 | B5 gap |
| Stage window metrics | US1/B8 | B8 gap |
| recordUsage lacks reason | FR-03 | C2 gap |
| 5-keyword limit in extractKeywords | FR-04 | C3 gap |
| ContinuousMemoryWriter limited events | US2/C4 | C4 gap |
| Regex-based symbol lookup | FR-05 | C6 gap |
| No auto-promotion | FR-06 | C10 gap |
| Per-chunk isolated summaries | FR-07 | D4 gap |
| Manual resume only | FR-08 | E2 gap |
| clearCache destroys all | FR-09 | E4 gap |
| No backward transition detection | FR-10 | F2 gap |
| enforceBudgetCaps false by default | FR-11 | F3 gap |
| Keyword-only stage matching | FR-10/F4 | F4 gap |
| Text label enforcement only | FR-12 | F5 gap |
| Advisory recommendations only | FR-12/G3 | G3 gap |
| Unweighted FIFO BFS | FR-13 | H2 gap |
| Jaccard on last 20 | FR-14 | H4 gap |
| Advisory parallelization only | FR-15 | I2 gap |
| Stateless MCP endpoints | FR-16 | I3 gap |
| Lossy task count fallback | FR-17 | I5 gap |
| Console-only slop results | FR-18 | J2 gap |
| Test runner stub | FR-19 | J3 gap |
| detectBrownfield never called | FR-20 | J6 gap |
| Checkpoint fields only | FR-21 | J7 gap |
| TypeScript AST decision | FR-05 | Tech Decision 1 |
| TF-IDF reuse decision | FR-04, FR-14 | Tech Decision 2 |
| Array-based priority queue | FR-13 | Tech Decision 3 |
| Protected files constraint | Protected Boundaries | Constraint |
| Backward compat constraint | NFR/Compatibility | Constraint |
| No new dependencies | NFR/Compatibility | Constraint |
| Test stability constraint | Success Criteria | Constraint |
