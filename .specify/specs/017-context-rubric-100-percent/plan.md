---
feature: 'Context Management Rubric — 100% Completion'
spec: spec.md
research: research.md
status: ready
created: '2026-02-09'
---

# Implementation Plan: Context Management Rubric — 100% Completion

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **LLM SDK**: `@anthropic-ai/sdk` (existing dependency)
- **Testing**: Vitest
- **Build**: Webpack

### Architecture

All changes occur within the existing autonomous context management subsystem. The architecture has 5 integration layers:

```
┌─ Hook Layer ──────────────────────────────────────────────┐
│  post-tool-use.mjs → context-bridge.json → HookBridge    │
│  (Turn counter fix, observation content, graph producers) │
└───────────────────────────┬───────────────────────────────┘
                            │ bridge-update events
┌─ Observation Layer ───────▼───────────────────────────────┐
│  ObservationMasker (three-tier decay, disk persistence)   │
│  ScopeGuard (boundary checking)                           │
└───────────────────────────┬───────────────────────────────┘
                            │ observations + masking results
┌─ Context Layer ───────────▼───────────────────────────────┐
│  ContextBuilder (memory-first, budget caps, graph ctx)    │
│  CitationVerifier (pre-injection validation)              │
│  StageContextProfile (validated transitions, delegation)  │
└───────────────────────────┬───────────────────────────────┘
                            │ context health events
┌─ Memory Layer ────────────▼───────────────────────────────┐
│  MemoryManager (useMemory, trigram matching, dual storage) │
│  KnowledgeGraph (file/import/pattern/decision producers)  │
│  ContinuousMemoryWriter (research→memory, graph hooks)    │
│  MemoryConsolidator (related memories, stale detection)   │
└───────────────────────────┬───────────────────────────────┘
                            │ health status + recommendations
┌─ Session Layer ───────────▼───────────────────────────────┐
│  AutoHandoffTrigger + CheckpointValidator                 │
│  SubAgentDispatcher (advisory)                            │
│  ContextCompactor (LLM summarization)                     │
│  ResearchSummarizer (new), BrownfieldAnalyzer (new)       │
│  SlopDetector (command registration)                      │
└───────────────────────────────────────────────────────────┘
```

### Integration Points

| Component | File | Integration Type |
|-----------|------|-----------------|
| Hook bridge handler | `extension/src/extension.ts:1403-1465` | Event handler — turn counter, graph producers, scope guard |
| ContextBuilder.buildContext() | `extension/src/autonomous/ContextBuilder.ts:~480` | Method — citation verify, budget caps, delegation |
| AutoHandoffTrigger | `extension/src/autonomous/AutoHandoffTrigger.ts:518` | Method — checkpoint validation |
| ContinuousMemoryWriter | `extension/src/autonomous/ContinuousMemoryWriter.ts:~80` | Event handler — research→memory, graph hooks |
| Component init block | `extension/src/extension.ts:1356-1515` | Instantiation — all 4 dead code components |

### Key Dependencies

- Existing `ObservationMasker` API (cache, mask, expand methods)
- Existing `KnowledgeGraph` API (addNode, addEdge, recordFileAccess, etc.)
- Existing `ContextHealthMonitor` events (healthy, warning, critical)
- `@anthropic-ai/sdk` for Haiku LLM calls
- VSCode setting `gofer.anthropicApiKey` for LLM features

---

## Implementation Phases

### Phase 1: Critical Bug Fix + Quick Wins (FR1, FR3, FR4 partial, A4)

**Goal**: Fix the turn counter bug that disables all observation masking, persist observation cache to disk, and add status bar data-source indicator. This single phase unlocks B1, B4, B5, B7, B8, E5, and A4.

**Rubric items**: A4 (+1), B1 (+3), B4 (+4), B5 (+2), B7 (+1), B8 (+4), E5 (+5) = **+20 points**

**Tasks**:

- [ ] **T001** [Fix] Add `sharedContextBuilder.incrementTurn()` after `trackObservation()` in hook bridge `bridge-update` handler (`extension.ts:~1465`)
- [ ] **T002** [Fix] Call `this.observationMasker.saveCacheToDisk()` after `maskOldObservations()` in `ContextBuilder.buildContext()` (async, fire-and-forget)
- [ ] **T003** [Fix] Call `saveCacheToDisk()` after `trackObservation()` in hook bridge handler (debounced, max once per 5s)
- [ ] **T004** [Fix] Expand default `preservePatterns` in `ObservationMasker.ts` to include `failure`, `critical`, `fatal`, `panic`, `unhandled`, `stack\s?trace`
- [ ] **T005** [Fix] Add cache size and eviction count to `MaskResult` return type; log eviction events via `ContextUsageLogger`
- [ ] **T006** [Wire] Instantiate `CheckpointValidator` in `AutoHandoffTrigger` constructor. Call `validate()` in `generateHandoffDocument()` before return; log warnings
- [ ] **T007** [Fix] Append data-source indicator `(real)`/`(est)` to status bar text in `ContextHealthStatusBar.ts`
- [ ] **T008** [Test] Add unit tests: turn counter advances on bridge-update; observations mask after exceeding stage window; cache persisted to disk; checkpoint validation warns on missing sections

**Verification**:
- [ ] Turn counter increments on each bridge-update event
- [ ] Observations older than stage window are masked
- [ ] `.specify/memory/observation-cache/index.json` written after masking
- [ ] Status bar shows `(real)` or `(est)` suffix
- [ ] `npm test` — no new failures

---

### Phase 2: Wire Dead Code Components (FR4, FR5 partial)

**Goal**: Instantiate CitationVerifier, ScopeGuard, SlopDetector in extension.ts and wire them to their integration points.

**Rubric items**: C5 (+5), C6 (+5), J1 (+5), J2 (+5) = **+20 points**

**Tasks**:

- [ ] **T009** [Wire] Instantiate `CitationVerifier(workspacePath)` in `extension.ts` component init block (~line 1505)
- [ ] **T010** [Wire] Add `setCitationVerifier()` setter to `ContextBuilder`. In `buildContext()` after memory loading (line ~516), call `verifyCitations()` on formatted memories; prepend staleness warning if `needsReview`
- [ ] **T011** [Wire] Call `verifyCodeSymbols()` alongside `verifyCitations()`; log missing symbols via `console.warn()`
- [ ] **T012** [Wire] Instantiate `ScopeGuard(workspacePath)` in `extension.ts`. In hook bridge handler, after extracting `toolInput.file_path`, call `scopeGuard.check(filePath)`; log violations
- [ ] **T013** [Wire] Pass `ScopeGuard` to `ContextBuilder` via setter. In `trackObservation()`, call `scopeGuard.check(metadata.filePath)` when filePath is available
- [ ] **T014** [Wire] Instantiate `SlopDetector()` in `extension.ts`. Register `gofer.checkForSlop` command that scans `extension/src/` and shows output channel with results
- [ ] **T015** [Wire] In hook bridge handler, after extracting `toolInput.file_path` for Read tools, call `knowledgeGraph.recordFileAccess(filePath)` (first KnowledgeGraph producer)
- [ ] **T016** [Test] Add unit tests: CitationVerifier warns on non-existent paths; ScopeGuard detects boundary violations; SlopDetector finds disabled tests; graph has file nodes after reads

**Verification**:
- [ ] CitationVerifier logs warnings for stale file citations in memories
- [ ] ScopeGuard logs when protected boundary files are accessed
- [ ] `gofer.checkForSlop` command produces scan report in output channel
- [ ] KnowledgeGraph has file nodes after file read observations
- [ ] `npm test` — no new failures

---

### Phase 3: Three-Tier Observation Decay (FR2)

**Goal**: Replace binary masking with graduated three-tier decay. This is the core context management innovation.

**Rubric items**: B2 (+5), B3 partial foundation (+2), B6 (+3) = **+10 points**

**Tasks**:

- [ ] **T017** [Model] Add `DecayTier` type (`'full' | 'key-points' | 'masked'`) to `ObservationMasker.ts`. Add `keyPointsContent?: string`, `keyPointsAt?: number` fields to `ObservationEntry`. Add migration function for legacy `masked: boolean` entries
- [ ] **T018** [Core] Add `keyPointsAgeFraction: number` (default 0.6) to `ObservationMaskerConfig`
- [ ] **T019** [Core] Rewrite `maskOldObservations()`: two transition points — `full→key-points` at `ageThreshold * fraction`, `key-points→masked` at `ageThreshold`
- [ ] **T020** [Core] Implement `generateKeyPoints(observation)` dispatcher method with 4 type-specific extractors:
  - `extractFileKeyPoints()`: First 3 lines + last 2 lines
  - `extractCommandKeyPoints()`: First 5 + last 5 lines
  - `extractSearchKeyPoints()`: File paths + match count
  - `extractTestKeyPoints()`: Pass/fail summary
- [ ] **T021** [Core] Update `MaskResult` to include `keyPointsCount` and per-tier stats
- [ ] **T022** [Config] Add VSCode setting `gofer.observationPreservePatterns` (string array). Load in `ContextBuilder` constructor and pass to `ObservationMasker` config as RegExp array
- [ ] **T023** [Compat] Add `loadCacheFromDisk()` migration: convert legacy `masked: boolean` entries to `decayTier: 'masked'` on load
- [ ] **T024** [UI] Update status bar and context health to show per-tier observation counts (full/key-points/masked)
- [ ] **T025** [Test] Unit tests: decay transitions at correct turn thresholds; key-point extractors produce expected summaries; legacy migration works; preserve patterns from VSCode setting applied

**Verification**:
- [ ] Observation at turn 0, threshold 10: transitions to key-points at turn 6, masked at turn 10
- [ ] File read key-points show first 3 + last 2 lines
- [ ] Legacy cache files load without errors (migration)
- [ ] Custom preserve patterns from VSCode settings are applied
- [ ] `npm test` — no new failures

---

### Phase 4: Knowledge Graph & Memory Enhancements (FR5, FR7, FR8 partial)

**Goal**: Populate the knowledge graph from data flows, enhance memory system with improved matching and related memories, and improve stage detection.

**Rubric items**: H1 (+4), H2 (+4), H3 (+5), H4 (+3), C2 (+1), C3 (+1), C4 (+1), C7 (+2), C9 (+2), C10 (+4), F2 (+2), J7 (+1) = **+30 points**

**Tasks**:

- [ ] **T026** [Graph] In hook bridge handler, parse `import`/`from` statements from file_read observation content. Call `knowledgeGraph.recordImport(currentFile, importedFile)` for each resolved import
- [ ] **T027** [Graph] In `ContinuousMemoryWriter`, when saving a memory with `category === 'pattern'`, call `knowledgeGraph.recordPattern(memory.content, memory.tags)` passing related file paths from tags
- [ ] **T028** [Graph] In `ContinuousMemoryWriter`, when saving a memory with `category === 'decision'`, call `knowledgeGraph.recordDecision(memory.content, memory.tags)`
- [ ] **T029** [Memory] Add `useMemory(id: string)` method to `MemoryManager` that increments `usedCount` and updates `lastUsedAt`. Call from `ContextBuilder.buildContext()` after loading memories
- [ ] **T030** [Memory] Replace substring keyword matching in `ContextBuilder.calculateMemoryCoverage()` with trigram overlap: generate 3-character sequences from both query and keyword, compute Jaccard similarity on trigram sets
- [ ] **T031** [Memory] Add `research-complete` event to `ContextBuilder`. In `ContinuousMemoryWriter`, listen for event and create discovery memories from research chunk titles + summaries
- [ ] **T032** [Memory] Implement dual storage: in `MemoryManager.save()`, when `content.length > 500`, write companion file to `.specify/memory/memory-notes/{uuid}.md`. Store `notePath` in memory entry
- [ ] **T033** [Memory] Add `relatedMemories` computation: on `MemoryManager.save()`, compute enhanced Jaccard (keyword overlap + category weight) against top 20 recent memories. Store top 3 related IDs
- [ ] **T034** [Memory] In `MemoryConsolidator`, wire CitationVerifier: during consolidation cycle, check citations of each memory. If >50% stale, reduce priority by 2. Add consolidation metrics logging
- [ ] **T035** [Stage] In `WorkspaceContextProvider.detectCurrentStage()`, validate file content (size > 100 bytes, contains expected heading) not just existence. Return null if file exists but is empty/invalid
- [ ] **T036** [Stage] In `/5_gofer_implement` entry point, validate `tasks.md` frontmatter has `status: approved` or `status: ready` before proceeding
- [ ] **T037** [Test] Unit tests: graph has import edges after file reads; `useMemory` increments priority; trigram matching finds "auth" in "authenticate"; research-complete creates memories; related memories computed; stage detection rejects empty files

**Verification**:
- [ ] KnowledgeGraph has file + import nodes after coding session
- [ ] `loadGraphContext()` returns connected entities for affected files
- [ ] Memory priority increments when used in context building
- [ ] Trigram matching produces better coverage than substring
- [ ] Empty spec.md doesn't trigger "plan" stage
- [ ] `npm test` — no new failures

---

### Phase 5: LLM Integration (FR6)

**Goal**: Wire real LLM (Haiku) calls into observation compression, research summarization, and context compaction. All features degrade to deterministic fallbacks without API key.

**Rubric items**: B3 (+5), D3 (+5), D4 (+3), I5 (+5) = **+18 points**

**Tasks**:

- [ ] **T038** [Infra] Create shared `LLMProvider` utility in `extension/src/autonomous/LLMProvider.ts`: wraps `@anthropic-ai/sdk`, reads `gofer.anthropicApiKey` from VSCode settings, provides `summarize(prompt, maxTokens)` method, rate limits to 10 calls/min, logs usage to context-usage JSONL
- [ ] **T039** [Compress] Add optional `llmProvider` to `ObservationMasker`. In `generateKeyPoints()`, when LLM provider available, call `summarize()` with observation content instead of deterministic extractors. Fall back to extractors on error or missing key
- [ ] **T040** [Research] Create `extension/src/autonomous/ResearchSummarizer.ts`: accepts `ResearchChunker` + `LLMProvider` + `MemoryManager`. Method `summarizeSpec(specId)`: iterates research chunks, calls `summarize()` for each, saves as discovery memory with tags `#research-{specId}`, `#chunk-{chunkId}`. Cache summaries to avoid re-summarization
- [ ] **T041** [Research] Wire `ResearchSummarizer` to `ContextBuilder` `research-complete` event as higher-priority handler (before deterministic D4 handler). Skip chunks already summarized (check cache)
- [ ] **T042** [Compact] In `ContextCompactor.summarizeTasks()`, replace `generateFallbackSummary()` with `llmProvider.summarize()` call using existing prompt template. Keep fallback on error
- [ ] **T043** [Compact] Wire `LLMProvider` into `ContextCompactor` constructor via `extension.ts` initialization block
- [ ] **T044** [Test] Unit tests: LLM provider rate limits correctly; observation compression uses LLM when key present, falls back when absent; research summarizer creates memories; compactor calls LLM; all JSONL usage logged

**Verification**:
- [ ] With API key: Observation key-points are LLM-generated summaries
- [ ] Without API key: Deterministic extractors used (no errors)
- [ ] Research summarizer creates discovery memories from chunks
- [ ] Context compactor produces LLM summaries instead of fallback text
- [ ] Usage logged with `dataSource: 'llm'` and token counts
- [ ] Rate limit prevents >10 calls/min per component
- [ ] `npm test` — no new failures

---

### Phase 6: Stage Management, Delegation & Session (FR8, FR9, FR12 partial)

**Goal**: Complete stage-aware context management with budget caps, transition checkpoints, progressive delegation, and process quality controls.

**Rubric items**: F3 (+1), F4 (+3), F5 (+4), G2 (+1), E1 (+1), E2 (+2), E4 (+1), J3 (+3), J4 (+3), J5 (+2), J6 (+3) = **+24 points**

**Tasks**:

- [ ] **T045** [Budget] In `ContextBuilder.buildContext()`, add `enforceBudgetCaps` config option. When true, truncate context sections exceeding stage budget allocation (truncate from end, preserve first N tokens)
- [ ] **T046** [Transition] In `ContextBuilder.setCurrentStage()`, when stage changes: (1) validate previous stage completion via `WorkspaceContextProvider`, (2) auto-save checkpoint by executing `gofer.saveProgress`, (3) log transition with metadata to context-usage JSONL
- [ ] **T047** [Delegate] Create `extension/src/autonomous/SubAgentDispatcher.ts`: listen to `ContextHealthMonitor` events. When utilization exceeds `delegationPolicy.subAgentThreshold`, emit `delegation-required` event with recommended agent type and task category. Provide `getRecommendation()` API. Log to JSONL
- [ ] **T048** [Delegate] Wire `SubAgentDispatcher` in `extension.ts` initialization. Subscribe to health monitor events
- [ ] **T049** [Session] Enhance session save: include observation cache summary (count per tier, total tokens), knowledge graph stats, memory count in handoff document
- [ ] **T050** [Session] Enhance session resume: on startup, call `loadCacheFromDisk()` to restore observation cache. Verify loaded entries have valid content
- [ ] **T051** [Reseed] Add reseed metrics to `ContextUsageLogger`: log observation count cleared, memories preserved, reseed timestamp
- [ ] **T052** [Condensed] In agent prompt templates, add instruction: "Return results in <2000 tokens. Summarize if longer." Add token count validation to agent result handling
- [ ] **T053** [Quality] Create `.specify/templates/brownfield-analysis.md` with sections: Constraints, Tech Debt, Caution Areas, Integration Requirements, Downstream Dependencies, Checklist
- [ ] **T054** [Quality] Add per-stage cost tracking to `ContextUsageLogger`: LLM token counts, stage duration, quality metrics (slop count from last scan). Add `cost` and `quality` fields to health_check log entries
- [ ] **T055** [Quality] In `autonomousCommands.ts`, after task completion: if test command available, run tests and record result. On failure, block next task and record error pattern as memory
- [ ] **T056** [Quality] Before risky file modifications (detected via tool type), create git stash. On error, pop stash. Log recovery pattern
- [ ] **T057** [Test] Unit tests: budget truncation works; stage transition saves checkpoint; delegation emits event at threshold; brownfield template exists; cost tracking logged

**Verification**:
- [ ] Over-budget context sections truncated when `enforceBudgetCaps: true`
- [ ] Stage transition generates checkpoint file
- [ ] SubAgentDispatcher recommends delegation at threshold
- [ ] Brownfield template file exists at `.specify/templates/brownfield-analysis.md`
- [ ] Cost/quality fields appear in context-usage JSONL entries
- [ ] `npm test` — no new failures

---

### Phase 7: Advanced Context Engineering (FR10, FR11)

**Goal**: Complete RLM context folding, MemGPT three-layer architecture, and parallel analysis framework. These are the most aspirational features.

**Rubric items**: I1 (+4), I2 (+4), I3 (+5), I4 (+3), G3 (+5), D5 (+4) = **+25 points**

**Tasks**:

- [ ] **T058** [Content] In `post-tool-use.mjs`, ensure `tool_response` content (not just tool name) is written to per-observation files. Verify `extension.ts` reads real content from `.specify/hooks/observations/{uuid}.json`
- [ ] **T059** [Fold] Add fold level tracking to `ObservationMasker`: each observation has `foldLevel: 'collapsed' | 'summary' | 'expanded'` (separate from decay tier). Add `setFoldLevel(id, level)` method
- [ ] **T060** [MCP] Enhance MCP tool handler in `language-server/src/mcp/toolHandler.ts`: implement `gofer_expand_observation` reading from disk cache. Add `gofer_peek_observation` (returns summary), `gofer_fold_observation` (sets fold level), `gofer_grep_observations` (searches within cached content)
- [ ] **T061** [Fold] Persist fold state alongside observation cache. On startup, restore fold levels from disk
- [ ] **T062** [MemGPT] Create `extension/src/autonomous/MemoryLayerManager.ts` with explicit three-layer API:
  - `getCoreMemory()`: Returns constitution + stage profile + current task context
  - `searchArchival(query)`: Searches JSONL memories + research chunks by relevance
  - `getRecallMemory(limit)`: Returns N most recent observations
  - `demoteMemories()`: When archival exceeds budget, reduce priority of lowest-use memories
- [ ] **T063** [MemGPT] Wire `MemoryLayerManager` into `ContextBuilder` as alternative to direct memory/observation access. Use layer manager for `buildContext()` when `useLayeredMemory: true`
- [ ] **T064** [Research→Graph] Create `extension/src/autonomous/ResearchGraphBuilder.ts`: parse research.md for entity names (headers, bold terms, code references). Create graph nodes with `type: 'pattern'` or `type: 'decision'`. Link to mentioned files via edges
- [ ] **T065** [Research→Graph] Wire `ResearchGraphBuilder` to `research-complete` event. Run after `ResearchSummarizer` (Phase 5)
- [ ] **T066** [Parallel] Create `extension/src/autonomous/ParallelAnalysisFramework.ts`: defines partition strategy (by directory depth), agent dispatch model (locator/analyzer/pattern-finder), and result aggregation (merge findings, deduplicate). Advisory — provides partitioning recommendations for Claude Code Task tool usage
- [ ] **T067** [REPL] Create context REPL MCP tools: `gofer_context_peek(section)` shows section summary, `gofer_context_grep(pattern)` searches all context sections, `gofer_context_fold(section)` collapses a section, `gofer_context_expand(section)` expands it
- [ ] **T068** [Test] Unit tests: fold levels persist across restart; MCP tools return real content; layer manager returns core/archival/recall; research graph has entities; parallel framework produces partition recommendations; REPL tools find content

**Verification**:
- [ ] MCP `gofer_expand_observation` returns real file content (not placeholder)
- [ ] Fold state survives extension restart
- [ ] `getCoreMemory()` returns constitution + task
- [ ] `searchArchival("auth")` returns relevant memories
- [ ] Research entities appear in knowledge graph
- [ ] Parallel framework recommends partitioning for large codebases
- [ ] Context REPL grep finds text within context sections
- [ ] `npm test` — no new failures

---

## File Structure

```
extension/src/autonomous/
├── ObservationMasker.ts          ← Modified (three-tier decay, fold levels, persistence)
├── ContextBuilder.ts             ← Modified (citation verify, budget caps, delegation, layers)
├── ContextHealthMonitor.ts       ← Minor (delegation event forwarding)
├── AutoHandoffTrigger.ts         ← Modified (checkpoint validation)
├── KnowledgeGraph.ts             ← Unchanged (API already exists)
├── ContinuousMemoryWriter.ts     ← Modified (graph hooks, research→memory)
├── MemoryConsolidator.ts         ← Modified (citation-based stale detection)
├── ResearchChunker.ts            ← Unchanged
├── ContextCompactor.ts           ← Modified (LLM call wiring)
├── StageContextProfile.ts        ← Minor (delegation policy enforcement)
├── WorkspaceContextProvider.ts   ← Modified (validated stage detection)
├── CitationVerifier.ts           ← Unchanged (ready to wire)
├── CheckpointValidator.ts        ← Unchanged (ready to wire)
├── ScopeGuard.ts                 ← Unchanged (ready to wire)
├── SlopDetector.ts               ← Unchanged (ready to wire)
├── LLMProvider.ts                ← NEW (shared LLM utility)
├── ResearchSummarizer.ts         ← NEW (LLM research summarization)
├── ResearchGraphBuilder.ts       ← NEW (research entities → graph)
├── SubAgentDispatcher.ts         ← NEW (advisory delegation)
├── MemoryLayerManager.ts         ← NEW (MemGPT three-layer API)
├── ParallelAnalysisFramework.ts  ← NEW (partition-map-reduce advisory)
├── ContextUsageLogger.ts         ← Modified (cost/quality fields)
└── BrownfieldAnalyzer.ts         ← NEW (analysis template loader)

extension/src/
├── extension.ts                  ← Modified (component init, wiring)
├── autonomousCommands.ts         ← Modified (feedback loops, setters)
└── ui/
    └── ContextHealthStatusBar.ts ← Modified (data source indicator, tier counts)

extension/resources/hook-scripts/
└── post-tool-use.mjs            ← Modified (real observation content)

language-server/src/mcp/
└── toolHandler.ts               ← Modified (expand, peek, fold, grep, REPL tools)

.specify/templates/
└── brownfield-analysis.md       ← NEW

tests/unit/autonomous/
├── ObservationMasker.test.ts    ← Modified (three-tier, fold, persistence)
├── ContextBuilder.test.ts       ← Modified (citation, budget, delegation)
├── KnowledgeGraph.test.ts       ← NEW/Modified (producer tests)
├── LLMProvider.test.ts          ← NEW
├── ResearchSummarizer.test.ts   ← NEW
├── SubAgentDispatcher.test.ts   ← NEW
├── MemoryLayerManager.test.ts   ← NEW
└── observation-tracking.test.ts ← Modified (turn counter, decay)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Three-tier decay breaks existing masking consumers | High | Migration function for legacy `masked: boolean`. Phased rollout with feature flag |
| LLM API calls add latency to context building | Medium | Async fire-and-forget. Deterministic fallbacks. Rate limiting. <5s timeout |
| KnowledgeGraph memory growth with many file reads | Low | Existing LRU eviction at 5000 nodes handles this |
| Import analysis regex misparses complex imports | Low | Conservative regex (standard ES6 imports only). Skip dynamic imports |
| Turn counter fix causes excessive masking | Medium | Stage-specific observation windows already tuned. Monitor and adjust thresholds |
| Pre-existing test failures mask new failures | Medium | Track exact failure count before/after each phase |

## Notes

- Phases are strictly ordered: each phase depends on prior phases completing
- Phase 1 is the highest-ROI: +20 points from 8 tasks, most are 1-5 line changes
- Phase 5 (LLM) is the highest-risk: requires API integration with graceful degradation
- Phase 7 (Advanced) is the most speculative: advisory-only features due to extension limitations
- All new files follow existing patterns (component init, setter injection, event-driven wiring)
- Protected boundaries (release-auto.sh, docs/releases.json, .claude/commands/) are never touched

---

## Spec Traceability

### User Story Coverage

| Story | Priority | Plan Phase(s) | Key Tasks |
|-------|----------|---------------|-----------|
| US1: Observation Masking | P0 | Phase 1, 3 | T001-T008, T017-T025 |
| US2: Wire Dead Code | P0 | Phase 1, 2 | T006, T009-T016 |
| US3: Knowledge Graph | P1 | Phase 2, 4, 7 | T015, T026-T028, T064-T065 |
| US4: LLM Features | P1 | Phase 5 | T038-T044 |
| US5: Memory System | P1 | Phase 4 | T029-T034 |
| US6: Stage-Aware | P2 | Phase 4, 6 | T035-T036, T045-T048 |
| US7: Advanced Engineering | P2 | Phase 7 | T058-T067 |
| US8: Process & Quality | P2 | Phase 2, 6 | T014, T053-T057 |

### Requirement Coverage

| Requirement | Plan Phase | Key Tasks |
|------------|-----------|-----------|
| FR1: Turn Counter | Phase 1 | T001 |
| FR2: Three-Tier Decay | Phase 3 | T017-T025 |
| FR3: Disk Persistence | Phase 1 | T002-T003 |
| FR4: Dead Code Wiring | Phase 1-2 | T006, T009-T016 |
| FR5: Knowledge Graph | Phase 2, 4, 7 | T015, T026-T028, T064-T065 |
| FR6: LLM Integration | Phase 5 | T038-T044 |
| FR7: Memory System | Phase 4 | T029-T034 |
| FR8: Stage-Aware | Phase 4, 6 | T035-T036, T045-T046 |
| FR9: SubAgentDispatcher | Phase 6 | T047-T048 |
| FR10: RLM Folding | Phase 7 | T058-T061, T067 |
| FR11: MemGPT Layers | Phase 7 | T062-T063 |
| FR12: Process & Quality | Phase 6 | T053-T057 |

### Points Progression

| After Phase | Cumulative Points | Score | Percentage |
|-------------|:-----------------:|:-----:|:----------:|
| Baseline | 155 | 155/300 | 52% |
| Phase 1 | +20 | 175/300 | 58% |
| Phase 2 | +20 | 195/300 | 65% |
| Phase 3 | +10 | 205/300 | 68% |
| Phase 4 | +30 | 235/300 | 78% |
| Phase 5 | +18 | 253/300 | 84% |
| Phase 6 | +24 | 277/300 | 92% |
| Phase 7 | +25 | **302/300** | **100%+** |

> Note: Phase 7 total exceeds 300 due to conservative scoring — some items may score higher than estimated when fully implemented.

Coverage: **100% of user stories**, **100% of functional requirements**
