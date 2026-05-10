---
date: '2026-02-09T16:00:00Z'
researcher: Claude
feature: 'Close all context management rubric gaps to 100%'
status: complete
---

# Research: Context Management Rubric — 100% Completion

## Feature Summary

Close all 60 rubric items across 10 categories from the current 155/300 (52%) to
300/300 (100%). This requires fixing critical bugs, wiring dead code into
production, building missing features, and completing partially-implemented
systems.

## Gap Analysis by Category

### Category A: Real-Time Monitoring (34/35 — 97%)

**Status**: Nearly complete. Only 1 point missing.

| Item           | Current | Target | Gap                                                              |
| -------------- | :-----: | :----: | ---------------------------------------------------------------- |
| A4. Status Bar |   4/5   |  5/5   | Add data-source indicator (real vs estimated) to status bar text |

**Fix**: In `ContextHealthStatusBar.ts`, append `(real)` or `(est)` to the
status bar text based on `ContextHealthStatus.dataSource`.

**Effort**: Trivial (1 line change)

---

### Category B: Observation Management (13/40 — 33%)

**Status**: Critical. Turn counter bug disables entire subsystem.

| Item                    | Current | Target | Gap                                                                                                                                                                                                 | Effort               |
| ----------------------- | :-----: | :----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| B1. Turn Counter        |   2/5   |  5/5   | Add `incrementTurn()` call in `extension.ts:1465` after `trackObservation()` in `bridge-update` handler                                                                                             | Small                |
| B2. Three-Tier Decay    |   0/5   |  5/5   | Replace `masked: boolean` with `DecayTier` enum. Add `keyPointsContent`, `keyPointsAt` fields. Rewrite `maskOldObservations()` with two transition points. Add 4 type-specific key-point extractors | Medium               |
| B3. LLM Compression     |   0/5   |  5/5   | Add optional LLM provider to ObservationMasker. Call Haiku API for semantic compression at key-points → masked transition. Rate limit 10 calls/min                                                  | Large                |
| B4. Fingerprint Persist |   1/5   |  5/5   | Call `saveCacheToDisk()` after masking and after observation tracking. Enable MCP expand tool                                                                                                       | Small                |
| B5. Error Preservation  |   3/5   |  5/5   | Expand default patterns (add `failure`, `critical`, `fatal`, `panic`, `unhandled`, `stack\s?trace`). B1 fix enables this                                                                            | Small                |
| B6. Config Patterns     |   2/5   |  5/5   | Add VSCode setting `gofer.observationPreservePatterns`. Add YAML config loader                                                                                                                      | Small                |
| B7. Cache Pruning       |   4/5   |  5/5   | Add cache size metrics to status bar. Add eviction event logging                                                                                                                                    | Trivial              |
| B8. Stage Windows       |   1/5   |  5/5   | B1 fix unlocks this automatically. Verify with integration test                                                                                                                                     | Zero (depends on B1) |

**Impact Chain**: B1 fix → unlocks B5, B6, B8. B2 → enables B3. B4 → enables MCP
tool.

---

### Category C: Memory System (29/50 — 58%)

**Status**: Core storage solid. Dead code validators need wiring.

| Item                          | Current | Target | Gap                                                                                                                    | Effort |
| ----------------------------- | :-----: | :----: | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| C1. JSONL Storage             |   5/5   |  5/5   | Complete                                                                                                               | —      |
| C2. Priority Scoring          |   4/5   |  5/5   | Add API-level enforcement: `useMemory(id)` method auto-increments priority                                             | Small  |
| C3. Memory-First Loading      |   4/5   |  5/5   | Improve keyword matching: use stemming or trigram overlap instead of substring                                         | Medium |
| C4. Auto-Save                 |   4/5   |  5/5   | Add research-complete event handler                                                                                    | Small  |
| C5. Citation Verify (Files)   |   0/5   |  5/5   | Instantiate CitationVerifier in extension.ts. Wire to ContextBuilder.buildContext() before memory injection (line 516) | Small  |
| C6. Citation Verify (Symbols) |   0/5   |  5/5   | Same wiring as C5. Call `verifyCodeSymbols()` alongside `verifyCitations()`                                            | Small  |
| C7. Consolidation             |   3/5   |  5/5   | Verify periodic trigger fires. Add consolidation metrics logging                                                       | Small  |
| C8. Tree View                 |   5/5   |  5/5   | Complete                                                                                                               | —      |
| C9. Stale Detection           |   3/5   |  5/5   | Wire CitationVerifier into consolidation cycle. Auto-demote memories with >50% stale citations                         | Medium |
| C10. Dual Storage             |   1/5   |  5/5   | Create `memory-notes/` directory. Write rich markdown for memories exceeding 500 chars                                 | Medium |

---

### Category D: Research Management (13/25 — 52%)

**Status**: Chunking excellent. Three major features missing.

| Item                    | Current | Target | Gap                                                                                                                                                              | Effort |
| ----------------------- | :-----: | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| D1. Research Chunking   |   5/5   |  5/5   | Complete                                                                                                                                                         | —      |
| D2. Priority Queue      |   5/5   |  5/5   | Complete                                                                                                                                                         | —      |
| D3. Research Summarizer |   0/5   |  5/5   | Create `ResearchSummarizer.ts`. Call Haiku to summarize each chunk into 1-2 sentences. Cache summaries. Store as semantic memories                               | Large  |
| D4. Research→Memory     |   2/5   |  5/5   | Add `recordResearchFindings()` to ContinuousMemoryWriter. Emit `research-complete` event from ContextBuilder. Auto-convert research chunks to discovery memories | Medium |
| D5. Research→Graph      |   1/5   |  5/5   | Create `ResearchGraphBuilder`. Parse research.md for entities (frameworks, patterns, libraries). Create graph nodes + edges to affected files                    | Medium |

---

### Category E: Session Management (21/30 — 70%)

**Status**: Auto-handoff excellent. Checkpoint validation dead.

| Item                      | Current | Target | Gap                                                                                                   | Effort  |
| ------------------------- | :-----: | :----: | ----------------------------------------------------------------------------------------------------- | ------- |
| E1. Session Save          |   4/5   |  5/5   | Add automatic stage-transition saves. Generate richer handoff with partial context state              | Small   |
| E2. Session Resume        |   3/5   |  5/5   | Restore observation cache from disk (requires B4). Programmatic resume from API                       | Medium  |
| E3. Auto-Handoff          |   5/5   |  5/5   | Complete                                                                                              | —       |
| E4. Context Reseed        |   4/5   |  5/5   | Add reseed metrics logging. Verify memory preservation during reseed                                  | Small   |
| E5. Checkpoint Validation |   0/5   |  5/5   | Instantiate CheckpointValidator. Wire into AutoHandoffTrigger.generateHandoffDocument() before return | Trivial |
| E6. Handoff Architecture  |   5/5   |  5/5   | Complete                                                                                              | —       |

---

### Category F: Stage-Aware Context (15/25 — 60%)

**Status**: Profiles work. Delegation is advisory only.

| Item                       | Current | Target | Gap                                                                                                         | Effort |
| -------------------------- | :-----: | :----: | ----------------------------------------------------------------------------------------------------------- | ------ |
| F1. Stage Profiles         |   5/5   |  5/5   | Complete                                                                                                    | —      |
| F2. Stage Detection        |   3/5   |  5/5   | Validate completion before transitioning (check file content, not just existence). Add file-size validation | Medium |
| F3. Budget Enforcement     |   4/5   |  5/5   | Add budget cap mode (truncate context sections exceeding budget) alongside warning mode                     | Medium |
| F4. Transition Checkpoints |   2/5   |  5/5   | Validate stage completion. Detect blockers. Auto-save checkpoint with transition metadata                   | Medium |
| F5. Progressive Delegation |   1/5   |  5/5   | Add enforcement in ContextBuilder: when health > threshold, emit `delegation-required` event. Log decisions | Medium |

---

### Category G: Sub-Agent Architecture (9/15 — 60%)

**Status**: Agents work. No dynamic routing.

| Item                   | Current | Target | Gap                                                                                                                   | Effort |
| ---------------------- | :-----: | :----: | --------------------------------------------------------------------------------------------------------------------- | ------ |
| G1. Specialized Agents |   5/5   |  5/5   | Complete                                                                                                              | —      |
| G2. Condensed Results  |   4/5   |  5/5   | Add enforcement: validate sub-agent return size < 2000 tokens. Summarize if over limit                                | Small  |
| G3. Dynamic Delegation |   0/5   |  5/5   | Create `SubAgentDispatcher`. Context-health-driven delegation decisions. Task decomposition rules. Result aggregation | Large  |

---

### Category H: Knowledge Graph (4/20 — 20%)

**Status**: Architecturally complete. Zero data producers.

| Item                  | Current | Target | Gap                                                                                                                                                                                                                        | Effort        |
| --------------------- | :-----: | :----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| H1. Entity Graph      |   1/5   |  5/5   | Wire data producers (see H3). Verify graph operations with real data                                                                                                                                                       | Depends on H3 |
| H2. BFS Queries       |   1/5   |  5/5   | Works once graph has data                                                                                                                                                                                                  | Depends on H3 |
| H3. Entity Population |   0/5   |  5/5   | 4 producer sites needed: (1) `recordFileAccess()` from hook bridge file reads; (2) `recordImport()` from import analysis; (3) `recordPattern()` from pattern discovery; (4) `recordDecision()` from ContinuousMemoryWriter | Medium        |
| H4. Zettelkasten      |   2/5   |  5/5   | Add `relatedMemories` field to Memory interface. Compute on save via Jaccard + category overlap. Add bidirectional linking                                                                                                 | Medium        |

---

### Category I: Advanced Engineering (4/25 — 16%)

**Status**: Mostly aspirational. Requires LLM integration.

| Item                  | Current | Target | Gap                                                                                                                                                  | Effort     |
| --------------------- | :-----: | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| I1. RLM Folding       |   1/5   |  5/5   | Fix observation content (real data, not placeholders). Fix disk cache. Add interactive fold levels to MCP tools. Fold state recovery across sessions | Large      |
| I2. Parallel Analysis |   1/5   |  5/5   | Create partition-map-reduce framework. Systematic codebase partitioning. Parallel agent dispatch. Result aggregation                                 | Large      |
| I3. Full RLM REPL     |   0/5   |  5/5   | Complete context REPL environment (peek, grep, expand, fold commands). Interactive navigation of context                                             | Very Large |
| I4. MemGPT Layers     |   2/5   |  5/5   | Explicit three-layer API. LLM-driven tier demotion. Semantic clustering. Feedback loop from completions                                              | Large      |
| I5. LLM Compaction    |   0/5   |  5/5   | Wire Anthropic Haiku API call into `ContextCompactor.summarizeTasks()`. Replace fallback with real LLM call. Add rate limiting                       | Medium     |

---

### Category J: Process & Quality (13/35 — 37%)

**Status**: Guards built but not wired. Missing templates.

| Item                     | Current | Target | Gap                                                                                                                          | Effort |
| ------------------------ | :-----: | :----: | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| J1. Scope Guard          |   0/5   |  5/5   | Instantiate ScopeGuard. Wire to hook bridge file reads + ContextBuilder.trackObservation(). Load boundaries from spec.md     | Small  |
| J2. Slop Detection       |   0/5   |  5/5   | Instantiate SlopDetector. Register `gofer.checkForSlop` command. Wire into validation stage                                  | Small  |
| J3. Feedback Loops       |   2/5   |  5/5   | Test after each task completion. Build verification between phases. Block on failures. Record patterns                       | Medium |
| J4. Error Recovery       |   2/5   |  5/5   | Git checkpoint before risky ops. Undo-and-retry pattern. Auto-rollback on test failure. Record recovery patterns as memories | Medium |
| J5. Observability        |   3/5   |  5/5   | Add per-stage cost tracking. Add quality metrics (slop count, test pass rate). Dashboard in status bar                       | Medium |
| J6. Brownfield Guidance  |   2/5   |  5/5   | Create brownfield analysis template. Document legacy constraints schema. Add to research stage                               | Small  |
| J7. Planning Enforcement |   4/5   |  5/5   | Add programmatic approval gate (status field validation in tasks.md frontmatter)                                             | Small  |

---

## Codebase Analysis

### Where to Implement

| Component                  | Location                                                     | Purpose                                     |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| Turn counter fix           | `extension/src/extension.ts:1465`                            | 1-line fix enabling all observation masking |
| Three-tier decay           | `extension/src/autonomous/ObservationMasker.ts:51-328`       | Replace binary masking with graduated decay |
| CitationVerifier wiring    | `extension/src/extension.ts:~1505` + `ContextBuilder.ts:516` | Wire dead code into production              |
| CheckpointValidator wiring | `extension/src/autonomous/AutoHandoffTrigger.ts:602`         | Validate handoff docs before save           |
| ScopeGuard wiring          | `extension/src/extension.ts:1449` + `ContextBuilder.ts:432`  | Monitor file access boundaries              |
| SlopDetector wiring        | `extension/src/extension.ts:~1520` + new command             | Register gofer.checkForSlop command         |
| KnowledgeGraph producers   | `extension/src/extension.ts:1403-1465`                       | Add recordFileAccess/recordImport calls     |
| ResearchSummarizer         | New: `extension/src/autonomous/ResearchSummarizer.ts`        | LLM-based research chunk summarization      |
| ResearchGraphBuilder       | New: `extension/src/autonomous/ResearchGraphBuilder.ts`      | Parse research entities into graph          |
| SubAgentDispatcher         | New: `extension/src/autonomous/SubAgentDispatcher.ts`        | Dynamic context-health-driven delegation    |
| ContextCompactor LLM       | `extension/src/autonomous/ContextCompactor.ts:228`           | Wire real LLM calls for summarization       |
| BrownfieldAnalyzer         | New: `extension/src/autonomous/BrownfieldAnalyzer.ts`        | Legacy code analysis template               |

### Existing Patterns to Follow

#### Pattern 1: Component Initialization in extension.ts

Found in: `extension/src/extension.ts:1356-1515`

```typescript
const component = new Component(workspacePath);
component
  .initialize()
  .then(() => {
    sharedContextBuilder.setComponent(component);
    console.log('[Gofer] Component initialized');
  })
  .catch((error) => {
    console.warn('[Gofer] Component init failed (non-fatal):', error);
  });
```

Why relevant: All dead code components follow this exact pattern.

#### Pattern 2: Event-Driven Wiring

Found in: `extension/src/extension.ts:1403-1465`

```typescript
hookBridgeWatcher.on('bridge-update', (data: BridgeData) => {
  // Process data, call components
});
```

Why relevant: KnowledgeGraph producers, ScopeGuard, and turn counter fix all
wire into this handler.

#### Pattern 3: Setter-Based Dependency Injection

Found in: `extension/src/autonomousCommands.ts:33-54`

```typescript
let sharedComponent: Component | undefined;
export function setSharedComponent(c: Component): void {
  sharedComponent = c;
}
```

Why relevant: New components (SubAgentDispatcher, etc.) follow this pattern for
cross-module access.

#### Pattern 4: LLM API Integration

Found in: `extension/src/council/` directory

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey });
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 256,
  messages: [{ role: 'user', content: prompt }],
});
```

Why relevant: B3 (LLM compression), D3 (research summarizer), I5 (context
compaction) all need LLM calls.

### Integration Points

1. **HookBridgeWatcher `bridge-update` event** (extension.ts:1403): Main
   integration point for turn counter, observation tracking, scope guard, and
   knowledge graph producers
2. **ContextBuilder.buildContext()** (ContextBuilder.ts:~480): Where
   CitationVerifier, memory loading, research chunking, and budget enforcement
   converge
3. **AutoHandoffTrigger.generateHandoffDocument()** (AutoHandoffTrigger.ts:518):
   Where CheckpointValidator hooks in
4. **ContinuousMemoryWriter event handlers** (ContinuousMemoryWriter.ts:~80):
   Where research-to-memory consolidation and knowledge graph decisions feed
5. **`gofer.saveProgress` command** (extension.ts:~1300): Where stage transition
   checkpoints and session save improvements integrate

### Related Code

- `extension/src/autonomous/ObservationMasker.ts` — Core masking system (959
  lines)
- `extension/src/autonomous/ContextBuilder.ts` — Central context assembly (~2500
  lines)
- `extension/src/autonomous/ContextHealthMonitor.ts` — Health tracking
- `extension/src/autonomous/AutoHandoffTrigger.ts` — Session save automation
- `extension/src/autonomous/KnowledgeGraph.ts` — Entity graph (376 lines)
- `extension/src/autonomous/MemoryConsolidator.ts` — Dedup and decay (303 lines)
- `extension/src/autonomous/ResearchChunker.ts` — Semantic chunking (814 lines)
- `extension/src/autonomous/ContextCompactor.ts` — LLM compaction stub (555
  lines)
- `extension/src/autonomous/ContinuousMemoryWriter.ts` — Auto-save (254 lines)
- `extension/src/autonomous/StageContextProfile.ts` — Stage budgets
- `extension/src/autonomous/CitationVerifier.ts` — Dead code (194 lines)
- `extension/src/autonomous/CheckpointValidator.ts` — Dead code (67 lines)
- `extension/src/autonomous/ScopeGuard.ts` — Dead code (108 lines)
- `extension/src/autonomous/SlopDetector.ts` — Dead code (168 lines)

## Technology Decisions

### Decision 1: LLM Provider for Compression/Summarization

- **Choice**: Claude 3.5 Haiku (claude-3-5-haiku-20241022)
- **Rationale**: Fast, cheap ($0.25/1M input, $1.25/1M output), sufficient
  quality for summarization. Already available via `@anthropic-ai/sdk` in the
  codebase
- **Alternatives**: Gemini Flash (requires separate SDK), local models (too
  complex)

### Decision 2: Semantic Similarity for H4 (Zettelkasten)

- **Choice**: Enhanced Jaccard with TF-IDF weighting
- **Rationale**: No API calls needed, fast, deterministic. Sufficient for memory
  linking where keyword overlap is the primary signal
- **Alternatives**: LLM embeddings (expensive, requires API calls for every
  memory save), word2vec (requires model download)

### Decision 3: Three-Tier Decay Implementation

- **Choice**: In-place field migration (`masked: boolean` →
  `decayTier: DecayTier`)
- **Rationale**: Cleanest approach, backwards-compatible via migration function
- **Alternatives**: Separate decay manager class (over-engineered),
  config-driven tiers (too flexible for the use case)

### Decision 4: SubAgentDispatcher Scope

- **Choice**: Advisory dispatcher (recommends delegation, doesn't enforce)
- **Rationale**: Claude Code controls sub-agent execution via Task tool —
  extension can only advise through context/prompts, not programmatically spawn
  agents
- **Alternatives**: Full execution framework (impossible — extension can't spawn
  Claude Code sub-processes)

## Constraints & Considerations

- **Extension can't spawn sub-agents**: The VSCode extension can recommend
  delegation but Claude Code controls actual sub-agent execution. G3 and I2 are
  bounded by this constraint.
- **LLM API keys required**: B3, D3, I5 require an Anthropic API key configured
  in `gofer.anthropicApiKey`. Must degrade gracefully when no key is available.
- **Backward compatibility**: ObservationEntry `masked: boolean` → `DecayTier`
  migration must handle existing cached observations.
- **Performance**: LLM calls add latency. B3 and D3 must be async and
  non-blocking, with deterministic fallbacks.
- **Test failures**: 5 pre-existing failures in `agent-stop-extraction.test.ts`
  (missing JSONL file). Must not increase failure count.

## Effort Estimation

| Tier                               | Items                                                                  |    Est. Points Gained     |
| ---------------------------------- | ---------------------------------------------------------------------- | :-----------------------: |
| **Quick wins** (< 1hr each)        | A4, B1, B4, B5, B7, E5, J7                                             |            +20            |
| **Small wiring** (1-3hr each)      | C2, C4, C5, C6, E1, E4, G2, J1, J2, J6                                 |            +30            |
| **Medium features** (3-8hr each)   | B2, B6, C3, C7, C9, D4, D5, E2, F2, F3, F4, F5, H3, H4, I5, J3, J4, J5 |            +54            |
| **Large features** (1-2 days each) | B3, C10, D3, G3, I1, I4                                                |            +30            |
| **Very large** (2+ days)           | I2, I3                                                                 |            +11            |
| **TOTAL**                          | 60 items                                                               | **+145 points** (155→300) |

## Recommendations

1. **Fix B1 first** — single line change that unlocks B5, B6, B8 (+8 points, 5
   minutes)
2. **Wire all dead code next** — C5, C6, E5, J1, J2 are trivial wiring (+15
   points, 3 hours)
3. **Implement three-tier decay** — B2 is the core context management innovation
   (+5 points, 1 day)
4. **Add KnowledgeGraph producers** — H3 unlocks H1, H2, D5 (+12 points, 4
   hours)
5. **LLM features last** — B3, D3, I5 require API integration and are
   highest-risk
6. **I3 (Full RLM REPL) is the stretch goal** — largest effort, most speculative
   value
