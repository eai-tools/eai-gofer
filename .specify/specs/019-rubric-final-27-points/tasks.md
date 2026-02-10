---
feature: "Context Management Rubric: Final 27 Points to 300/300"
spec: spec.md
plan: plan.md
status: complete
approvedBy: auto-chain
approvedAt: 2026-02-10T15:15:00Z
created: 2026-02-10T15:15:00Z
---

# Tasks: Final 27 Points to 300/300

## Overview

- **Total Tasks**: 65
- **Parallel Opportunities**: 18 tasks marked [P]
- **Phases**: 10 (TF-IDF Foundation through Final Verification)

## Dependencies

```mermaid
graph LR
    P1[Phase 1: TF-IDF] --> P3[Phase 3: Memory]
    P1 --> P4[Phase 4: ContextBuilder]
    P1 --> P6[Phase 6: KnowledgeGraph]
    P2[Phase 2: Observation] --> P10[Phase 10: Verify]
    P3 --> P4
    P4 --> P5[Phase 5: Stage/Delegation]
    P5 --> P9[Phase 9: Extension Wiring]
    P6 --> P10
    P7[Phase 7: Advanced Context] --> P10
    P8[Phase 8: Process Quality] --> P10
    P9 --> P10
```

## Protected Files

- `extension/src/autonomous/ContextHealthMonitor.ts` — minimal changes only
- `extension/src/autonomous/ClaudeSessionReader.ts` — do not modify
- `.specify/scripts/hooks/post-tool-use.mjs` — minimal changes only

## Phase 1: TF-IDF Shared Utility (Foundation)

**Goal**: Create shared TF-IDF utility for C3 and H4. Blocks Phases 3, 4, 6.

- [X] T001 Create `extension/src/autonomous/TfIdfUtil.ts` with TF-IDF keyword extraction
- [X] T002 Add stopword list (100+ common English words) to TfIdfUtil
- [X] T003 Add simple suffix stemming (ing, tion, ed, ly, er, est, s) to TfIdfUtil
- [X] T004 Add `extractKeywords(text, maxKeywords=15)` function using TF-IDF weighting
- [X] T005 Add `computeDocumentSimilarity(docA, docB)` returning 0-1 similarity score
- [X] T006 Add `computeCorpusSimilarity(query, corpus)` for ranked similarity across documents

**Verification**: `npm run compile` passes. TfIdfUtil exports all functions.

## Phase 2: Observation Management (B2, B5, B8)

**Goal**: Per-type decay, content-aware error detection, stage window metrics. (+3 rubric points)

- [X] T007 [P] Add `PerTypeDecayConfig` interface to ObservationMasker with per-type `ageThresholdTurns` and `keyPointsAgeFraction`
- [X] T008 Add default per-type decay rates: file_read=10, command_output=8, test_output=12, search=6 in ObservationMasker
- [X] T009 Add YAML config loader reading from `.specify/memory/observation-config.yaml` in ObservationMasker
- [X] T010 Update `maskOldObservations()` to use per-type thresholds based on observation type in ObservationMasker
- [X] T011 [P] Add `isActualError(content)` structural heuristic method in ObservationMasker
- [X] T012 Implement error classification: stack traces (`at ` prefix), `Error:` prefix, exit codes, test FAIL markers in ObservationMasker
- [X] T013 Update `shouldPreserve()` to use `isActualError()` instead of simple regex in ObservationMasker
- [X] T014 [P] Add observation-age-at-expansion metric logging in ObservationMasker `expandObservation()`
- [X] T015 Add `validateObservationWindows()` method comparing configured vs actual usage patterns in ObservationMasker

**Verification**: `npm run compile` passes. Per-type decay rates configurable.

## Phase 3: Memory System (C2, C4, C6, C10)

**Goal**: Usage tracking, event sources, AST symbols, auto-promotion. (+4 rubric points)

- [X] T016 Add `UsageReason` type to MemoryManager: `'context_load' | 'user_recall' | 'search_match' | 'consolidation'`
- [X] T017 Expand `recordUsage()` signature: `recordUsage(id, reason?, source?)` — backward compatible
- [X] T018 Log usage reason and source to audit JSONL in MemoryManager
- [X] T019 [P] Add 5 event type handlers to ContinuousMemoryWriter: `stage-change`, `compaction-complete`, `reseed`, `scope-violation`, `slop-detected`
- [X] T020 Add per-event-type rate limiting (max 1 per type per 5 minutes) to ContinuousMemoryWriter
- [X] T021 [P] Add `extractSymbolsWithAST(filePath)` using `ts.createSourceFile()` in CitationVerifier
- [X] T022 Parse function declarations, class declarations, interface declarations, type alias declarations in CitationVerifier
- [X] T023 Replace regex-based symbol lookup with AST-based extraction in CitationVerifier `verifySymbols()`
- [X] T024 [P] Add `autoPromoteToMarkdown(entry)` in MemoryStorage
- [X] T025 Create `.specify/memory/memory-notes/` directory on first promotion in MemoryStorage
- [X] T026 Auto-promote entries >500 chars: create markdown note, update JSONL with truncated content + `notePath` in MemoryStorage

**Verification**: `npm run compile` passes. `recordUsage(id)` still works. AST extracts symbols.

## Phase 4: ContextBuilder Enhancements (C3 wiring, E4, F3)

**Goal**: TF-IDF matching, selective reseed, blocking budget. (+3 rubric points)

- [X] T027 Import TfIdfUtil and replace `extractKeywords()` with TF-IDF-based extraction in ContextBuilder
- [X] T028 Update memory coverage matching to use TF-IDF weighted scoring in ContextBuilder
- [X] T029 Add `selectiveReseed()` method to ContextBuilder
- [X] T030 Implement reseed criteria: preserve error-containing, last-3-turns-expanded, current-turn observations in ContextBuilder
- [X] T031 Add `budgetEnforcementMode` config (`'advisory' | 'truncate' | 'blocking'`) to ContextBuilder
- [X] T032 Add pre-check in `buildContext()`: return structured error in blocking mode when over budget in ContextBuilder

**Verification**: `npm run compile` passes. Selective reseed keeps error traces.

## Phase 5: Stage Detection & Delegation (F2, F4, F5, G3)

**Goal**: Non-linear stage, artifact timestamps, programmatic delegation. (+4 rubric points)

- [X] T033 Add `lastKnownStage` field and backward transition detection to WorkspaceContextProvider
- [X] T034 Add `setStage()` manual override API to WorkspaceContextProvider
- [X] T035 Add stage history logging (last 20 transitions) to WorkspaceContextProvider
- [X] T036 [P] Add artifact modification time tracking (research.md, spec.md, tasks.md mtimes) to WorkspaceContextProvider
- [X] T037 Detect stage re-entry from artifact modification patterns in WorkspaceContextProvider
- [X] T038 Add `shouldDelegate()` returning `{ delegate: boolean, reason: string, agentType: string }` to SubAgentDispatcher
- [X] T039 Wire `shouldDelegate()` into ContextBuilder as blocking-level pre-check in SubAgentDispatcher
- [X] T040 Add `dispatchIfRecommended()` formatting structured dispatch instructions in SubAgentDispatcher
- [X] T041 Add dispatch instruction injection with result collection markers in SubAgentDispatcher

**Verification**: `npm run compile` passes. Backward stage transitions detected and logged.

## Phase 6: Knowledge Graph & Research (H2, H4, D4)

**Goal**: Weighted BFS, TF-IDF similarity, cross-chunk consolidation. (+3 rubric points)

- [X] T042 Add `querySubgraphWeighted()` with priority queue sorted by cumulative edge weight in KnowledgeGraph
- [X] T043 Implement array-based priority queue (sort on insert) for weighted BFS in KnowledgeGraph
- [X] T044 Preserve existing `querySubgraph()` for backward compatibility in KnowledgeGraph
- [X] T045 [P] Replace Jaccard-on-last-20 with TfIdfUtil corpus similarity for `relatedMemories` in KnowledgeGraph
- [X] T046 [P] Add `consolidateFindings()` post-loop method to ResearchSummarizer
- [X] T047 Merge overlapping findings, deduplicate entities, produce "Research Synthesis" memory in ResearchSummarizer

**Verification**: `npm run compile` passes. High-weight edges prioritized in BFS results.

## Phase 7: Advanced Context Engineering (I2, I3, I5)

**Goal**: Parallel dispatch, compound REPL, content-aware compaction. (+3 rubric points)

- [X] T048 [P] Add `executeParallelQueries()` to ParallelAnalysisFramework with explicit dispatch instructions
- [X] T049 Format dispatch instructions with structured result collection points in ParallelAnalysisFramework
- [X] T050 Add `gofer_context_repl` compound MCP tool definition in language-server/src/server.ts
- [X] T051 Add `contextRepl(args)` handler accepting operation arrays in toolHandler.ts
- [X] T052 Implement compound operations: fold-all-older-than-N, batch fold/expand in toolHandler.ts
- [X] T053 Increase REPL history depth to 50 in toolHandler.ts
- [X] T054 [P] Enhance `generateFallbackSummary()` in ContextCompactor: extract task description first lines
- [X] T055 Preserve error messages and include file modification summary in compaction fallback in ContextCompactor

**Verification**: `npm run compile` passes. Compound REPL accepts operation arrays.

## Phase 8: Process Quality (J2, J3, J6, J7)

**Goal**: Slop surface, test runner, brownfield analysis, artifact validation. (+4 rubric points)

- [X] T056 Surface slop detection results via VSCode information notification with issue count in extension.ts/SlopDetector
- [X] T057 [P] Add slop findings to VSCode diagnostics collection in extension.ts
- [X] T058 Log scan history to `.specify/logs/slop-scan.jsonl` in SlopDetector
- [X] T059 Implement `gofer_run_tests` MCP tool: detect test framework (vitest/jest/pytest) in toolHandler.ts
- [X] T060 Add test execution and structured result parsing in toolHandler.ts
- [X] T061 Register `gofer_run_tests` in language-server/src/server.ts tool list and call switch
- [X] T062 [P] Create `generateBrownfieldAnalysis()` in ScopeGuard producing structured markdown
- [X] T063 Create `.specify/templates/brownfield-analysis.md` template file
- [X] T064 Wire brownfield analysis into research pipeline in ScopeGuard
- [X] T065 Add `validatePipelineArtifacts(specDir)` to CheckpointValidator
- [X] T066 Check existence and section completeness of research.md, spec.md, plan.md, tasks.md in CheckpointValidator
- [X] T067 Return structured validation report with warnings and errors from CheckpointValidator

**Verification**: `npm run compile` passes. Slop results show as notification. Test runner detects framework.

## Phase 9: Session & Extension Wiring (E2)

**Goal**: Auto-resume on activation. (+1 rubric point)

- [X] T068 Add recent checkpoint detection (<24h) in extension.ts `activate()`
- [X] T069 Show notification with feature name, stage, and "Resume" action button in extension.ts
- [X] T070 On "Resume" click, invoke appropriate pipeline command in extension.ts

**Verification**: `npm run compile` passes. Resume notification appears on re-open.

## Phase 10: Final Integration & Verification

**Goal**: Compile, test, rubric update.

- [X] T071 Run full `npm run compile` — zero errors
- [X] T072 Run `npm test` — verify zero new failures (5 pre-existing expected)
- [X] T073 Verify observation-tracking.test.ts source-level assertions pass
- [X] T074 Update rubric at `.specify/research/context-management-rubric.md` to 300/300
- [X] T075 Mark all spec 019 acceptance criteria as complete

**Verification**: Clean compilation. Test suite stable. Rubric at 300/300.

## Parallel Execution Guide

Tasks marked [P] can run concurrently if they modify different files:

- T007, T011, T014 (independent ObservationMasker additions)
- T019, T021, T024 (ContinuousMemoryWriter, CitationVerifier, MemoryStorage — different files)
- T036 (WorkspaceContextProvider artifact tracking — independent of T033-T035)
- T045, T046 (KnowledgeGraph similarity + ResearchSummarizer — different files)
- T048, T054 (ParallelAnalysisFramework + ContextCompactor — different files)
- T057, T062 (extension.ts diagnostics + ScopeGuard brownfield — different files)

## Implementation Strategy

1. **Phase 1 first**: TF-IDF utility is a foundation blocking 3 other phases
2. **Phase 2 can run parallel with Phase 1**: ObservationMasker changes are independent
3. **Compile after each phase**: Catch TypeScript errors early
4. **Group by file**: Many tasks touch the same file — batch within each phase
5. **Phase 10 last**: Final verification after all code changes
6. **Check observation-tracking.test.ts frequently**: Source-level assertions break on string changes
