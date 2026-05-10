---
feature: 'Context Management Rubric: Final 27 Points to 300/300'
spec: spec.md
research: research.md
status: ready
created: 2026-02-10T15:00:00Z
---

# Implementation Plan: Final 27 Points to 300/300

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest (unit tests)
- **Build**: Webpack bundling, `npm run compile`
- **Existing Dependencies**: `typescript` package (for AST parsing in C6)

### Architecture

All changes are brownfield updates to existing autonomous module files in
`extension/src/autonomous/`. The architecture follows the established pattern:
each component is a standalone class with setter-based wiring in `extension.ts`.

```text
extension.ts (wiring hub)
  ├── ObservationMasker.ts      — B2, B5, B8 (per-type decay, error detection, metrics)
  ├── MemoryManager.ts          — C2, C4 (usage tracking, event sources)
  ├── MemoryStorage.ts          — C10 (auto-promotion)
  ├── ContextBuilder.ts         — C3, E4, F3 (TF-IDF, selective reseed, blocking budget)
  ├── CitationVerifier.ts       — C6 (AST symbol verification)
  ├── ResearchSummarizer.ts     — D4 (cross-chunk consolidation)
  ├── WorkspaceContextProvider   — F2, F4 (non-linear stage, artifact timestamps)
  ├── SubAgentDispatcher.ts     — F5, G3 (programmatic delegation, dispatch)
  ├── KnowledgeGraph.ts         — H2, H4 (weighted BFS, TF-IDF similarity)
  ├── ParallelAnalysisFramework — I2 (dispatch instructions)
  ├── ContextCompactor.ts       — I5 (content-aware fallback)
  ├── ScopeGuard.ts             — J6 (brownfield analysis)
  ├── SlopDetector.ts           — J2 (user surface)
  ├── CheckpointValidator.ts    — J7 (pipeline artifact validation)
  ├── toolHandler.ts            — I3, J3 (REPL compound, test runner)
  └── server.ts                 — I3, J3 (MCP tool registration)
```

### Integration Points

| Component                 | File                                                    | Lines | Changes               |
| ------------------------- | ------------------------------------------------------- | ----- | --------------------- |
| ObservationMasker         | `extension/src/autonomous/ObservationMasker.ts`         | 774   | B2, B5, B8            |
| MemoryManager             | `extension/src/autonomous/MemoryManager.ts`             | 1176  | C2, C4                |
| MemoryStorage             | `extension/src/autonomous/MemoryStorage.ts`             | 472   | C10                   |
| ContextBuilder            | `extension/src/autonomous/ContextBuilder.ts`            | 1381  | C3, E4, F3            |
| CitationVerifier          | `extension/src/autonomous/CitationVerifier.ts`          | 274   | C6                    |
| ResearchSummarizer        | `extension/src/autonomous/ResearchSummarizer.ts`        | 263   | D4                    |
| WorkspaceContextProvider  | `extension/src/autonomous/WorkspaceContextProvider.ts`  | 472   | F2, F4                |
| SubAgentDispatcher        | `extension/src/autonomous/SubAgentDispatcher.ts`        | 206   | F5, G3                |
| KnowledgeGraph            | `extension/src/autonomous/KnowledgeGraph.ts`            | 475   | H2, H4                |
| ParallelAnalysisFramework | `extension/src/autonomous/ParallelAnalysisFramework.ts` | 268   | I2                    |
| ContextCompactor          | `extension/src/autonomous/ContextCompactor.ts`          | 637   | I5                    |
| ScopeGuard                | `extension/src/autonomous/ScopeGuard.ts`                | 161   | J6                    |
| SlopDetector              | `extension/src/autonomous/SlopDetector.ts`              | 168   | J2                    |
| CheckpointValidator       | `extension/src/autonomous/CheckpointValidator.ts`       | 153   | J7                    |
| toolHandler               | `language-server/src/mcp/toolHandler.ts`                | 1771  | I3, J3                |
| server                    | `language-server/src/server.ts`                         | ~800  | I3, J3                |
| extension                 | `extension/src/extension.ts`                            | 2160  | E2, wiring            |
| TF-IDF Utility            | `extension/src/autonomous/TfIdfUtil.ts`                 | NEW   | C3, H4 shared utility |

### Key Dependencies

- `typescript` package — already installed, used for `ts.createSourceFile()` in
  C6
- `ResearchChunker.ts` (814 lines) — TF-IDF keyword extraction to be extracted
  to shared utility
- `ContinuousMemoryWriter.ts` (289 lines) — event source expansion for C4
- `StageContextProfile.ts` — stage profile definitions for B8/F2

## Implementation Phases

### Phase 1: Shared Utility — TF-IDF Extraction (Foundation)

**Goal**: Extract TF-IDF keyword logic into a shared utility used by C3 and H4.

**Tasks**:

- [ ] Create `TfIdfUtil.ts` with `extractKeywords()` and `computeSimilarity()`
      functions
- [ ] Extract TF-IDF logic from ResearchChunker's keyword extraction
- [ ] Add stopword list (100+ words), simple suffix stemming
- [ ] Add `computeDocumentSimilarity()` for corpus-wide similarity

**Verification**: `npm run compile` passes. Utility is importable.

### Phase 2: Observation Management (B2, B5, B8)

**Goal**: Per-type decay, content-aware error detection, stage window metrics.
(+3 points)

**Tasks**:

- [ ] B2: Add per-type decay config interface and defaults to ObservationMasker
- [ ] B2: Add YAML config loader for `.specify/memory/observation-config.yaml`
- [ ] B2: Update `maskOldObservations()` to use per-type thresholds
- [ ] B5: Add content-aware error classifier (`isActualError()`) with structural
      heuristics
- [ ] B5: Update `shouldPreserve()` to use content-aware classification
- [ ] B8: Add observation-age-at-expansion logging in `expandObservation()`
- [ ] B8: Add `validateObservationWindows()` method with per-stage metrics

**Verification**: `npm run compile` passes. Different observation types have
different decay rates.

### Phase 3: Memory System (C2, C3, C4, C6, C10)

**Goal**: Usage tracking, TF-IDF matching, more events, AST symbols,
auto-promotion. (+5 points)

**Tasks**:

- [ ] C2: Expand `recordUsage()` signature with optional `reason` and `source`
      params
- [ ] C2: Add `UsageReason` type:
      `'context_load' | 'user_recall' | 'search_match' | 'consolidation'`
- [ ] C2: Log usage reason to audit trail
- [ ] C3: Replace `extractKeywords()` in ContextBuilder with TfIdfUtil
- [ ] C3: Update memory coverage matching to use TF-IDF weighted scoring
- [ ] C4: Add 5+ event type handlers to ContinuousMemoryWriter (stage-change,
      compaction, reseed, scope-violation, slop-detected)
- [ ] C4: Add per-event-type rate limiting
- [ ] C6: Add `extractSymbolsWithAST()` using `ts.createSourceFile()` in
      CitationVerifier
- [ ] C6: Parse function, class, interface, type alias declarations
- [ ] C6: Replace regex symbol lookup with AST-based lookup
- [ ] C10: Add `autoPromoteToMarkdown()` in MemoryStorage
- [ ] C10: Auto-create `.specify/memory/memory-notes/{uuid}.md` for entries >500
      chars
- [ ] C10: Update JSONL entry with truncated content + `notePath`

**Verification**: `npm run compile` passes. `recordUsage(id)` still works
(backward compat).

### Phase 4: Context Builder Enhancements (C3 wiring, E4, F3)

**Goal**: Wire TF-IDF matching, selective reseed, blocking budget enforcement.
(+3 points)

**Tasks**:

- [ ] C3: Wire TfIdfUtil into ContextBuilder for memory coverage calculation
- [ ] E4: Add `selectiveReseed()` to ContextBuilder: preserve error, recent,
      current-turn observations
- [ ] E4: Add observation filter criteria (error-containing, expanded in last 3
      turns)
- [ ] F3: Add `budgetEnforcementMode` config:
      `'advisory' | 'truncate' | 'blocking'`
- [ ] F3: Add pre-check in `buildContext()` for blocking mode
- [ ] F3: Return structured error result when blocking mode prevents context
      build

**Verification**: `npm run compile` passes. Selective reseed preserves error
observations.

### Phase 5: Stage & Delegation (F2, F4, F5, G3)

**Goal**: Non-linear stage detection, artifact timestamps, programmatic
delegation. (+4 points)

**Tasks**:

- [ ] F2: Add `lastKnownStage` tracking to WorkspaceContextProvider
- [ ] F2: Add backward transition detection (compare detected vs last known)
- [ ] F2: Add `setStage()` manual override API
- [ ] F2: Add stage history logging
- [ ] F4: Add artifact modification time tracking (research.md, spec.md,
      tasks.md timestamps)
- [ ] F4: Detect stage re-entry from artifact mtimes
- [ ] F5: Add `shouldDelegate()` returning
      `{ delegate: boolean, reason: string, agentType: string }`
- [ ] F5: Wire into ContextBuilder as pre-check at blocking enforcement level
- [ ] G3: Add `dispatchIfRecommended()` formatting structured dispatch
      instructions
- [ ] G3: Add dispatch instruction injection with result collection markers

**Verification**: `npm run compile` passes. Backward stage transitions are
detected.

### Phase 6: Knowledge Graph & Research (H2, H4, D4)

**Goal**: Weighted BFS, TF-IDF similarity, cross-chunk consolidation. (+3
points)

**Tasks**:

- [ ] H2: Add `querySubgraphWeighted()` using priority queue sorted by
      cumulative edge weight
- [ ] H2: Preserve existing unweighted `querySubgraph()` for backward compat
- [ ] H4: Replace Jaccard-on-last-20 with TF-IDF similarity across all memories
- [ ] H4: Use shared TfIdfUtil for similarity computation
- [ ] D4: Add `consolidateFindings()` post-loop method to ResearchSummarizer
- [ ] D4: Merge overlapping findings, deduplicate entities, produce "Research
      Synthesis" memory

**Verification**: `npm run compile` passes. High-weight edges prioritized in
BFS.

### Phase 7: Advanced Context Engineering (I2, I3, I5)

**Goal**: Parallel dispatch, compound REPL, content-aware compaction. (+3
points)

**Tasks**:

- [ ] I2: Add `executeParallelQueries()` to ParallelAnalysisFramework
- [ ] I2: Format explicit sub-agent dispatch instructions with result collection
      points
- [ ] I3: Add `gofer_context_repl` MCP tool in toolHandler.ts accepting
      operation arrays
- [ ] I3: Register in server.ts tool list and call switch
- [ ] I3: Implement compound operations (fold-all-older-than-N, batch
      operations)
- [ ] I3: Increase history depth to 50
- [ ] I5: Enhance `generateFallbackSummary()` in ContextCompactor
- [ ] I5: Extract first line of task descriptions, preserve error messages
- [ ] I5: Include file modification summary in fallback

**Verification**: `npm run compile` passes. Compound REPL executes multiple
operations.

### Phase 8: Process Quality (J2, J3, J6, J7)

**Goal**: Slop surface, test runner, brownfield analysis, artifact validation.
(+4 points)

**Tasks**:

- [ ] J2: Surface slop detection results via VSCode notification (info message
      with count)
- [ ] J2: Add findings to VSCode diagnostics collection
- [ ] J2: Log scan history to JSONL
- [ ] J3: Implement `gofer_run_tests` MCP tool: detect framework, execute, parse
      results
- [ ] J3: Register in server.ts
- [ ] J3: Add auto-trigger on test-related task completion
- [ ] J6: Create `generateBrownfieldAnalysis()` in ScopeGuard
- [ ] J6: Produce structured markdown: dependency map, high-fan-in files,
      protected boundaries
- [ ] J6: Create `.specify/templates/brownfield-analysis.md` template
- [ ] J6: Wire into research pipeline
- [ ] J7: Add `validatePipelineArtifacts(specDir)` to CheckpointValidator
- [ ] J7: Check existence and section completeness of research.md, spec.md,
      plan.md, tasks.md
- [ ] J7: Return structured validation report

**Verification**: `npm run compile` passes. Slop results show as notification.

### Phase 9: Session & Extension Wiring (E2)

**Goal**: Auto-resume on activation. (+1 point)

**Tasks**:

- [ ] E2: Add recent checkpoint detection (<24h) in extension.ts activate()
- [ ] E2: Show notification with feature name, stage, "Resume" action button
- [ ] E2: On "Resume", invoke appropriate pipeline command

**Verification**: `npm run compile` passes. After interrupted session, resume
notification appears.

### Phase 10: Final Integration & Verification

**Goal**: Compile, test, update rubric.

**Tasks**:

- [ ] Run full `npm run compile` — zero errors
- [ ] Run `npm test` — zero new failures (5 pre-existing in
      agent-stop-extraction expected)
- [ ] Verify observation-tracking.test.ts source-level assertions still pass
- [ ] Update rubric at `.specify/research/context-management-rubric.md` to
      300/300

**Verification**: All compilation clean. All tests stable. Rubric at 300/300.

## File Structure

```text
extension/src/autonomous/
├── TfIdfUtil.ts              (NEW - shared TF-IDF utility for C3, H4)
├── ObservationMasker.ts      (MODIFIED - B2, B5, B8)
├── MemoryManager.ts          (MODIFIED - C2, C4)
├── MemoryStorage.ts          (MODIFIED - C10)
├── ContextBuilder.ts         (MODIFIED - C3, E4, F3)
├── CitationVerifier.ts       (MODIFIED - C6)
├── ContinuousMemoryWriter.ts (MODIFIED - C4)
├── ResearchSummarizer.ts     (MODIFIED - D4)
├── WorkspaceContextProvider.ts(MODIFIED - F2, F4)
├── SubAgentDispatcher.ts     (MODIFIED - F5, G3)
├── KnowledgeGraph.ts         (MODIFIED - H2, H4)
├── ParallelAnalysisFramework.ts (MODIFIED - I2)
├── ContextCompactor.ts       (MODIFIED - I5)
├── ScopeGuard.ts             (MODIFIED - J6)
├── SlopDetector.ts           (MODIFIED - J2)
├── CheckpointValidator.ts    (MODIFIED - J7)

language-server/src/mcp/
├── toolHandler.ts            (MODIFIED - I3, J3)
├── server.ts                 (MODIFIED - I3, J3)

extension/src/
├── extension.ts              (MODIFIED - E2, wiring)

.specify/templates/
├── brownfield-analysis.md    (NEW - J6 template)
```

## Risk Assessment

| Risk                                     | Impact | Mitigation                                          |
| ---------------------------------------- | ------ | --------------------------------------------------- |
| Source-level test assertions break       | Medium | Check observation-tracking.test.ts after each phase |
| extension.ts grows too large             | Low    | Extract E2 auto-resume to utility function          |
| TF-IDF extraction breaks ResearchChunker | Medium | Keep original code, add shared utility alongside    |
| AST parsing performance                  | Low    | ts.createSourceFile is fast for single files        |
| Backward compatibility breaks            | High   | All API changes use optional parameters only        |

## Protected Boundaries

- `ContextHealthMonitor.ts` — minimal changes only
- `ClaudeSessionReader.ts` — do not modify
- `post-tool-use.mjs` — minimal changes only

## Spec Traceability

### User Story Coverage

| Story    | Priority | Plan Phase(s) | Components                                                                        |
| -------- | -------- | ------------- | --------------------------------------------------------------------------------- |
| US1 (P1) | P1       | Phase 2       | ObservationMasker                                                                 |
| US2 (P1) | P1       | Phase 1, 3    | TfIdfUtil, MemoryManager, MemoryStorage, CitationVerifier, ContinuousMemoryWriter |
| US3 (P2) | P2       | Phase 6       | ResearchSummarizer                                                                |
| US4 (P1) | P1       | Phase 4, 9    | ContextBuilder, extension.ts                                                      |
| US5 (P2) | P2       | Phase 4, 5    | ContextBuilder, WorkspaceContextProvider                                          |
| US6 (P2) | P2       | Phase 5       | SubAgentDispatcher, ContextBuilder                                                |
| US7 (P3) | P3       | Phase 6       | KnowledgeGraph                                                                    |
| US8 (P2) | P2       | Phase 7       | ParallelAnalysisFramework, toolHandler, ContextCompactor                          |
| US9 (P1) | P1       | Phase 8       | SlopDetector, ScopeGuard, CheckpointValidator, toolHandler                        |

### Requirement Coverage

| Requirement                    | Status  | Plan Phase |
| ------------------------------ | ------- | ---------- |
| FR-01 (Per-Type Decay)         | COVERED | Phase 2    |
| FR-02 (Error Detection)        | COVERED | Phase 2    |
| FR-03 (Usage Tracking)         | COVERED | Phase 3    |
| FR-04 (TF-IDF Keywords)        | COVERED | Phase 1    |
| FR-05 (AST Symbols)            | COVERED | Phase 3    |
| FR-06 (Auto-Promotion)         | COVERED | Phase 3    |
| FR-07 (Research Consolidation) | COVERED | Phase 6    |
| FR-08 (Auto-Resume)            | COVERED | Phase 9    |
| FR-09 (Selective Reseed)       | COVERED | Phase 4    |
| FR-10 (Non-Linear Stage)       | COVERED | Phase 5    |
| FR-11 (Blocking Budget)        | COVERED | Phase 4    |
| FR-12 (Delegation Enforcement) | COVERED | Phase 5    |
| FR-13 (Weighted BFS)           | COVERED | Phase 6    |
| FR-14 (TF-IDF Similarity)      | COVERED | Phase 6    |
| FR-15 (Parallel Dispatch)      | COVERED | Phase 7    |
| FR-16 (Compound REPL)          | COVERED | Phase 7    |
| FR-17 (Compaction Fallback)    | COVERED | Phase 7    |
| FR-18 (Slop Surface)           | COVERED | Phase 8    |
| FR-19 (Test Runner)            | COVERED | Phase 8    |
| FR-20 (Brownfield Analysis)    | COVERED | Phase 8    |
| FR-21 (Artifact Validation)    | COVERED | Phase 8    |

Coverage: 100% of user stories (9/9), 100% of functional requirements (21/21)
