---
date: 2026-02-10T14:30:00Z
researcher: Claude
feature: 'Rubric Final 27 Points to 300/300'
status: complete
---

# Research: Rubric Final 27 Points to 300/300

## Feature Summary

Close all remaining 27 points in the context management engineering rubric (273/300 → 300/300). This involves upgrading 24 items from 4/5 → 5/5 and 1 item from 3/5 → 5/5 across 10 categories (B, C, D, E, F, G, H, I, J).

## Codebase Analysis

### Where to Implement

| Component | Location | Changes Needed |
|-----------|----------|----------------|
| ObservationMasker | `extension/src/autonomous/ObservationMasker.ts` (~774 lines) | B2: Configurable decay rates, B5: Semantic error detection, B8: Stage-tuned windows |
| MemoryManager | `extension/src/autonomous/MemoryManager.ts` (~1048 lines) | C2: Usage reason API, C4: More event sources |
| MemoryStorage | `extension/src/autonomous/MemoryStorage.ts` (~392 lines) | C10: Auto-promotion to markdown |
| ContextBuilder | `extension/src/autonomous/ContextBuilder.ts` (~1381 lines) | C3: Better keyword matching, E4: Selective reseed, F3: Blocking enforcement |
| CitationVerifier | `extension/src/autonomous/CitationVerifier.ts` (~274 lines) | C6: TypeScript-aware symbol lookup |
| ResearchSummarizer | `extension/src/autonomous/ResearchSummarizer.ts` (~263 lines) | D4: Cross-chunk consolidation |
| WorkspaceContextProvider | `extension/src/autonomous/WorkspaceContextProvider.ts` (~472 lines) | F2: Non-linear transitions, F4: Subtle stage detection |
| SubAgentDispatcher | `extension/src/autonomous/SubAgentDispatcher.ts` (~206 lines) | F5: Programmatic interception, G3: Auto-routing |
| KnowledgeGraph | `extension/src/autonomous/KnowledgeGraph.ts` (~475 lines) | H2: Weighted BFS, H4: Semantic similarity |
| ParallelAnalysisFramework | `extension/src/autonomous/ParallelAnalysisFramework.ts` (~268 lines) | I2: Actual parallelization dispatch |
| ContextCompactor | `extension/src/autonomous/ContextCompactor.ts` (~637 lines) | I5: Better deterministic fallback |
| ScopeGuard | `extension/src/autonomous/ScopeGuard.ts` (~161 lines) | J6: Brownfield template + workflow |
| SlopDetector | `extension/src/autonomous/SlopDetector.ts` (~168 lines) | J2: Robust detection + user surface |
| CheckpointValidator | `extension/src/autonomous/CheckpointValidator.ts` (~153 lines) | J7: Pipeline artifact validation |
| toolHandler.ts | `language-server/src/mcp/toolHandler.ts` (~1771 lines) | I3: REPL session mode |
| extension.ts | `extension/src/extension.ts` (~2160 lines) | E2: Auto-resume, J3: Test-runner |

### Existing Patterns to Follow

#### Pattern 1: Configuration-Driven Defaults

Found in: `ObservationMasker.ts:141-148`

```typescript
const DEFAULT_CONFIG: ObservationMaskerConfig = {
  ageThresholdTurns: 10,
  keyPointsAgeFraction: 0.6,
  preserveErrorMessages: true,
  preservePatterns: [/error/i, /exception/i, ...],
  maxCacheSize: 100,
};
```

Why relevant: Multiple items need configurable defaults (B2 decay rates, B8 stage windows). Follow this pattern: hardcoded defaults → config object → setter method → YAML/setting override.

#### Pattern 2: Setter + Wire Pattern

Found in: `ContextBuilder.ts` setter methods and `extension.ts` wiring

```typescript
// In component:
setContextFolder(folder: { applyToSections(...): ... }): void { this.contextFolder = folder; }

// In extension.ts:
contextBuilder.setContextFolder(contextFolder);
```

Why relevant: Many items need new capabilities wired to existing components. Follow the established duck-typed setter pattern.

#### Pattern 3: Event-Driven Monitoring

Found in: `ContextHealthMonitor.ts` EventEmitter pattern

```typescript
this.emit('budget-warning', { category, tokensUsed, budgetLimit, percentOver, stage });
```

Why relevant: F3 (blocking enforcement) and J2/J3 (auto-trigger improvements) need event-driven patterns.

#### Pattern 4: MCP Tool Registration

Found in: `server.ts:265-470` (tool list) and `server.ts:724-800` (tool call switch)

```typescript
// Registration:
{ name: 'gofer_context_peek', description: '...', inputSchema: { ... } }
// Handler:
case 'gofer_context_peek': return mcpToolHandler.contextPeek(args);
```

Why relevant: I3 (REPL session) needs new MCP tool registration following this exact pattern.

### Integration Points

1. **extension.ts activate()**: Auto-resume logic (E2) must run early in activation, before other initialization
2. **ContextBuilder.buildContext()**: Budget blocking (F3) needs a pre-check before building context
3. **SubAgentDispatcher.updateUtilization()**: F5/G3 need interception at the recommendation check point
4. **MemoryManager.recordUsage()**: C2 needs expanded API signature
5. **ObservationMasker.maskOldObservations()**: B2/B5/B8 need configurable per-type decay
6. **ResearchSummarizer.summarizeSpec()**: D4 needs a post-loop consolidation step
7. **ScopeGuard**: J6 needs `generateBrownfieldAnalysis()` called from research pipeline
8. **CheckpointValidator**: J7 needs `validatePipelineArtifacts()` new method

### Related Code

- `extension/src/autonomous/memory.ts:61` — Memory interface with `priorityIndex` field
- `extension/src/autonomous/MemoryConsolidator.ts:143-186` — Priority decay logic
- `extension/src/autonomous/StageContextProfile.ts:30-60` — Stage profile definitions
- `extension/src/autonomous/ContinuousMemoryWriter.ts:45-80` — Event sources for memory writing
- `extension/src/autonomous/compaction.ts:1-456` — Lower-level compaction utilities
- `extension/src/autonomous/ResearchChunker.ts:1-814` — Chunk splitting infrastructure

## Detailed Gap Analysis per Item

### B2. Three-Tier Decay Tuning (4→5)
**Current**: Hardcoded `keyPointsAgeFraction: 0.6`, `ageThresholdTurns: 10`. All observation types share same schedule.
**Fix**: Add per-type decay rates config, calibration logging to track "re-expansion rate" (how often masked observations get expanded), configurable via `.specify/memory/observation-config.yaml`.

### B5. Semantic Error Detection (4→5)
**Current**: Binary `shouldPreserve()` checks regex patterns `/error/i, /exception/i`, etc. An observation with the word "error" in a documentation paragraph is preserved forever.
**Fix**: Add content-aware error classification: check if the observation *is* an error trace (stack trace detection, exit code patterns, test failure output) vs merely *mentions* errors.

### B8. Stage Observation Windows (4→5)
**Current**: Stage profiles define `observationWindow` per stage but no validation that these are optimal.
**Fix**: Add per-stage window tuning validation by logging "observation age at expansion" metrics. Add `validateObservationWindows()` that compares configured windows vs actual usage patterns.

### C2. Priority Scoring Enforcement (4→5)
**Current**: `recordUsage(id)` takes only an ID. `priorityIndex` is disconnected from `calculatePriorityScore()`.
**Fix**: Add `recordUsage(id, reason, source)` with `UsageReason` type. Connect `priorityIndex` to scoring. Log usage source for audit.

### C3. Semantic Memory Coverage (4→5)
**Current**: `extractKeywords()` extracts only 5 words with a 24-word stopword list. Trigram Jaccard at 0.3 threshold.
**Fix**: Increase keyword limit, unify the two divergent keyword extractors, add TF-IDF weighting from ResearchChunker (which already has it). Add stemming via simple suffix rules.

### C4. Continuous Memory Writing Events (4→5)
**Current**: ContinuousMemoryWriter captures `budget-warning` and `loading-decision` events.
**Fix**: Add event sources: `stage-change`, `compaction-complete`, `reseed`, `scope-violation`, `slop-detected`. Configurable rate limiting per event type.

### C6. AST-Level Symbol Lookup (4→5)
**Current**: Regex-based grep for function/class names in source files.
**Fix**: Use TypeScript Compiler API (`ts.createSourceFile`) for reliable symbol extraction. Parse declarations (function, class, interface, type) from source files. Cross-reference against cited symbols in memories.

### C10. Auto-Promotion to Markdown (4→5)
**Current**: Markdown notes created manually. JSONL stores `notePath` reference.
**Fix**: Add `autoPromoteToMarkdown()` in MemoryStorage: when a memory entry's `content` exceeds a threshold (e.g., 500 chars), automatically create a markdown note and replace JSONL content with truncated summary + `notePath`.

### D4. Cross-Chunk Consolidated Findings (4→5)
**Current**: Each research chunk summarized independently in `summarizeSpec()`.
**Fix**: Add `consolidateFindings()` method: after per-chunk summaries, collect all summaries, extract key entities/patterns, merge overlapping findings, produce a single "Research Synthesis" memory.

### E2. Auto-Resume on Activation (4→5)
**Current**: `gofer.resumeSession` is a manual command that shows info message only.
**Fix**: In `activate()`, check for recent checkpoints (< 24h old). If found, show notification "Previous session detected: [stage] on [feature]. Resume?" with action buttons. On "Resume", invoke the appropriate pipeline stage.

### E4. Selective Reseed (4→5)
**Current**: `reseedContext()` calls `clearCache()` which destroys all observations.
**Fix**: Add `selectiveReseed()`: preserve error-containing observations, recently-expanded observations, and current-turn observations. Promote high-value observations to memory before clearing.

### F2. Non-Linear Stage Detection (4→5)
**Current**: Artifact heuristic always picks most-advanced artifact. Cannot detect backward transitions.
**Fix**: Add `lastKnownStage` tracking. Compare detected stage vs last known: if regression detected, log it and respect the newer stage. Add explicit `setStage()` API for manual override. Track stage history.

### F3. Blocking Budget Enforcement (4→5)
**Current**: `enforceBudgetCaps: false` by default. Even when enabled, only truncates content.
**Fix**: Enable `enforceBudgetCaps` by default. Add severity levels to budget warnings. Add `budgetEnforcementMode` ('advisory'|'truncate'|'blocking') config. In 'blocking' mode, `buildContext()` throws if total exceeds limit.

### F4. Subtle Stage Change Detection (4→5)
**Current**: Stage detection via string keyword matching on commands.
**Fix**: Add artifact-modification-time tracking: when research.md is modified more recently than tasks.md during implement stage, infer research re-entry. Add file-watcher for spec artifacts.

### F5. Programmatic Delegation Interception (4→5)
**Current**: Enforcement is a text label ("REQUIRED") in markdown output.
**Fix**: Add `shouldDelegate()` method that returns `{ delegate: boolean, reason: string }`. Wire into `ContextBuilder.buildContext()` as a pre-check. When `enforcement === 'blocking'` and utilization is above threshold, inject a prominent warning section.

### G3. Automatic Sub-Agent Routing (4→5)
**Current**: SubAgentDispatcher recommends but doesn't dispatch.
**Fix**: Add `dispatchIfRecommended()` method that checks current recommendation and dispatches to appropriate sub-agent via formatted context injection. Track whether recommendations were followed via callback.

### H2. Weighted BFS Traversal (4→5)
**Current**: `querySubgraph()` uses unweighted FIFO BFS. Edge weights exist but are unused.
**Fix**: Replace FIFO queue with priority queue sorted by cumulative edge weight. Add `querySubgraphWeighted()` that returns results ranked by relevance score.

### H4. Semantic Similarity Links (4→5)
**Current**: `relatedMemories` computed via Jaccard on word tokens, last 20 only.
**Fix**: Add TF-IDF-based similarity scoring using the existing ResearchChunker's TF-IDF infrastructure. Expand search to all memories (not just last 20). Add bidirectional similarity threshold.

### I2. Actual Parallelization (4→5)
**Current**: ParallelAnalysisFramework generates advisory recommendations only.
**Fix**: Add `executeParallelQueries()` that takes recommendations and formats them as explicit sub-agent dispatch instructions in the context output with structured result collection points.

### I3. REPL Session Mode (4→5)
**Current**: Individual stateless MCP tool endpoints.
**Fix**: Add `gofer_context_repl` compound MCP tool that accepts multiple operations in sequence. Add "compound operations" like "fold all observations older than N turns". Increase history depth to 50.

### I5. Deterministic Compaction Fallback (4→5)
**Current**: `generateFallbackSummary()` only produces task counts and IDs.
**Fix**: Add content-aware fallback: extract first line of each task description, preserve error messages, include file modification summary. Parse actual context sections for reduction.

### J2. Robust Task Completion Detection (4→5)
**Current**: Detects checkbox changes in tasks.md via file-watch, logs results to console only.
**Fix**: Surface scan results via VSCode notification with summary. Add diagnostics entries for slop findings. Track scan history in JSONL.

### J3. Robust Test-Runner Heuristic (4→5)
**Current**: Test runner is a stub (`'Test runner not yet implemented'`).
**Fix**: Implement `gofer_run_tests` MCP tool: detect test framework (vitest/jest/pytest), run tests, parse results. Wire auto-trigger on test-related task completion (detect "test" in task description).

### J6. Brownfield Analysis Template + Workflow (3→5)
**Current**: `detectBrownfield()` returns boolean, is never called.
**Fix**: Create `generateBrownfieldAnalysis()` that produces structured markdown: dependency map, high-fan-in files, test coverage gaps, suggested protected boundaries. Wire into research pipeline. Create `.specify/templates/brownfield-analysis.md` template.

### J7. Programmatic Artifact Validation (4→5)
**Current**: `validateRequiredFields()` only checks checkpoint YAML fields.
**Fix**: Add `validatePipelineArtifacts(specDir)`: check existence and completeness of research.md, spec.md, plan.md, tasks.md. Validate section presence (user stories in spec, phases in tasks). Return structured validation report.

## Technology Decisions

### Decision 1: TypeScript Compiler API for C6

- **Choice**: Use `typescript` package's `ts.createSourceFile()` for symbol extraction
- **Rationale**: Already a dependency of the project. Non-blocking AST parsing without full program creation. Much more reliable than regex for function/class name extraction.
- **Alternatives**: Tree-sitter (additional dependency), regex patterns (current approach, insufficient)

### Decision 2: TF-IDF from ResearchChunker for C3/H4

- **Choice**: Reuse existing TF-IDF infrastructure from ResearchChunker.ts
- **Rationale**: ResearchChunker already has `extractKeywords()` with TF-IDF scoring (814 lines). Extracting the TF-IDF logic into a shared utility avoids duplication.
- **Alternatives**: Embedding API (requires LLM, defeats deterministic requirement), new library (unnecessary)

### Decision 3: Priority Queue for H2

- **Choice**: Simple array-based priority queue (sort on insert)
- **Rationale**: Graph is capped at 5000 nodes. A simple sorted array is sufficient for this scale. No need for a heap implementation.
- **Alternatives**: Binary heap (over-engineered for 5000 nodes), external library (unnecessary dependency)

## Constraints & Considerations

- **Protected files**: `ContextHealthMonitor.ts` — minimal changes only. `ClaudeSessionReader.ts` — do not modify. `post-tool-use.mjs` — minimal changes only.
- **Backward compatibility**: All API changes must be backward-compatible (new optional parameters, not breaking changes). `recordUsage(id)` must still work without reason/source.
- **No new npm dependencies**: All changes use existing libraries (TypeScript compiler API, existing TF-IDF code).
- **Test stability**: 5 pre-existing failures in `agent-stop-extraction.test.ts` are expected. All other tests must pass.
- **File size**: `extension.ts` is already 2160 lines. Minimize additions; prefer extracting to utility files.

## Brownfield Analysis

### Areas Requiring Extra Caution

- **extension.ts**: Already 2160 lines. Every phase adds more wiring. Consider extracting initialization sections to separate files.
- **MemoryManager.ts**: 1048 lines with complex state. Priority scoring changes must not break existing memory retrieval.
- **ContextBuilder.ts**: 1381 lines, central to context generation. Budget enforcement changes affect every context build.
- **ObservationMasker.ts**: 774 lines with cache persistence. Decay changes must be backward-compatible with existing cache format.

### Downstream Dependencies

- Tests in `tests/unit/autonomous/observation-tracking.test.ts` (1298 lines) — source-level assertions on file content
- Tests in `tests/unit/autonomous/ContextBuilder.test.ts` (1208 lines)
- Tests in `tests/unit/autonomous/MemoryManager.test.ts` (1095 lines)

## Open Questions

None — all requirements are clearly specified in the rubric's "What Would Close It" column.

## Recommendations

1. **Group by file**: Many items touch the same file. Batch changes to minimize re-reads.
2. **Start with config/API items**: B2, B5, B8, C2, C4 are config/API additions with low risk.
3. **C6 (AST) and D4 (consolidation) are medium risk**: New functionality, but well-scoped.
4. **J6 (brownfield template) is highest effort**: New template + new method + new wiring.
5. **E2 (auto-resume) is highest visibility**: Users will notice this immediately.
6. **Compile after each file batch**: Catch TypeScript errors early.
7. **Run observation-tracking tests frequently**: They contain source-level assertions that break on string changes.
