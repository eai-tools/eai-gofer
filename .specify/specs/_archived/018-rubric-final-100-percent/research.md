---
date: 2026-02-10T07:35:00Z
researcher: Claude
feature: 'Context Management Rubric Final 100%'
status: complete
---

# Research: Context Management Rubric — Final Push to 100%

## Feature Summary

Close the remaining 89-point gap in the context management engineering rubric
(211/300 → 300/300). This is a brownfield update touching ~25 files across 10
categories, primarily wiring existing dead code, enabling disabled features, and
filling implementation gaps.

## Rubric Score Corrections

Research revealed the rubric overcounted some gaps:

| Item                 | Rubric Score | Actual Score | Reason                                                                                         |
| -------------------- | :----------: | :----------: | ---------------------------------------------------------------------------------------------- |
| C6 (symbol citation) |     0/5      |     3/5      | `verifyCodeSymbols()` exists and is wired; only logs warnings                                  |
| I3 (RLM REPL)        |     0/5      |     0/5      | 9 tools implemented in toolHandler.ts but not registered in server.ts                          |
| C10 (dual storage)   |     1/5      |     2/5      | Markdown files written for long memories (>500 chars), but raw content dump                    |
| I5 (compactor)       |     0/5      |     0/5      | Confirmed: `monitorAndCompactContext()` has zero callers; `summarizeTasks()` has real LLM code |

**Corrected baseline**: ~215/300. **Actual gap**: ~85 points.

## Gap Analysis by Category

### Category A: Real-Time Monitoring — 34/35 (97%) → 35/35

| Gap             | Current | Target | Fix                                                           | Effort |
| --------------- | :-----: | :----: | ------------------------------------------------------------- | :----: |
| A4 (status bar) |    4    |   5    | Add data-source indicator (real/estimated) to status bar text |  Tiny  |

### Category B: Observation Management — 30/40 (75%) → 40/40

| Gap                  | Current | Target | Fix                                                                            | Effort |
| -------------------- | :-----: | :----: | ------------------------------------------------------------------------------ | :----: |
| B1 (debounce)        |    4    |   5    | Flush cache in `deactivate()`, clear timer, trailing-edge debounce             | Small  |
| B3 (LLM triggers)    |    3    |   5    | Add warning-level trigger, observation-count trigger, stage-transition trigger | Medium |
| B6 (config patterns) |    3    |   5    | Runtime reload via `onDidChangeConfiguration`, YAML support                    | Small  |
| B7 (LRU)             |    4    |   5    | Already near-perfect; add eviction telemetry                                   |  Tiny  |

### Category C: Memory System — 34/50 (68%) → 48/50

| Gap                  | Current | Target | Fix                                                                       | Effort |
| -------------------- | :-----: | :----: | ------------------------------------------------------------------------- | :----: |
| C5 (file citation)   |    4    |   5    | Make async to avoid blocking; add relative path resolution                | Small  |
| C6 (symbol citation) |    3    |   5    | Add staleness warning prefix (like file citations); wire to consolidator  | Small  |
| C7 (consolidation)   |    3    |   5    | Add periodic timer (30 min); trigger on session-start event               | Medium |
| C9 (max limit)       |    4    |   5    | Add MAX_MEMORY_COUNT check in save(); auto-archive lowest priority        | Small  |
| C10 (dual storage)   |    2    |   5    | Rich markdown format with YAML frontmatter; truncate JSONL; add read-back | Medium |
| C6 function verify   |    0    |   5    | Already 3/5; add symbol staleness warnings                                | Small  |

### Category D: Research Management — 20/25 (80%) → 25/25

| Gap                  | Current | Target | Fix                                                             | Effort |
| -------------------- | :-----: | :----: | --------------------------------------------------------------- | :----: |
| D3 (summarization)   |    3    |   5    | Add deterministic fallback path; hierarchical multi-level       | Medium |
| D4 (research→memory) |    3    |   5    | Auto-trigger on all spec research completions; batch conversion | Small  |
| D5 (knowledge graph) |    4    |   5    | Add AST-aware import extraction; entity dedup                   | Small  |

### Category E: Session Management — 25/30 (83%) → 29/30

| Gap             | Current | Target | Fix                                                            | Effort |
| --------------- | :-----: | :----: | -------------------------------------------------------------- | :----: |
| E1 (save)       |    4    |   5    | Wire CheckpointValidator into save flow; add git state capture | Medium |
| E2 (resume)     |    3    |   5    | Programmatic `SessionResumeCommand` with state validation      | Medium |
| E5 (checkpoint) |    4    |   5    | Already wired; add more required fields validation             | Small  |

### Category F: Stage-Aware Context — 16/25 (64%) → 24/25

| Gap                    | Current | Target | Fix                                                              | Effort |
| ---------------------- | :-----: | :----: | ---------------------------------------------------------------- | :----: |
| F2 (stage detection)   |    3    |   5    | Configurable staleness; hook-bridge command detection            | Medium |
| F4 (stage checkpoints) |    2    |   5    | Listen to `stage-change` event; auto-save lightweight checkpoint | Medium |
| F5 (delegation)        |    2    |   5    | Wire SubAgentDispatcher enforcement; threshold-based blocking    | Medium |

### Category G: Sub-Agent Architecture — 10/15 (67%) → 15/15

| Gap                     | Current | Target | Fix                                                                   | Effort |
| ----------------------- | :-----: | :----: | --------------------------------------------------------------------- | :----: |
| G2 (result enforcement) |    4    |   5    | Token budget field on DelegationRecommendation; truncation function   | Small  |
| G3 (dynamic delegation) |    1    |   5    | Wire SubAgentDispatcher to ContextHealthMonitor; threshold escalation | Medium |

### Category H: Knowledge Graph — 14/20 (70%) → 19/20

| Gap               | Current | Target | Fix                                                                   | Effort |
| ----------------- | :-----: | :----: | --------------------------------------------------------------------- | :----: |
| H4 (Zettelkasten) |    2    |   5    | Bidirectional memory linking; back-reference on save; graph traversal | Medium |

### Category I: Advanced Engineering — 8/25 (32%) → 23/25

| Gap                    | Current | Target | Fix                                                                            | Effort |
| ---------------------- | :-----: | :----: | ------------------------------------------------------------------------------ | :----: |
| I1 (context folding)   |    3    |   5    | Create ContextFolder.ts; wire to ContextBuilder.mergeContextSections()         | Medium |
| I2 (parallel analysis) |    2    |   5    | Import+wire ParallelAnalysisFramework in extension.ts + ContextBuilder         | Small  |
| I3 (RLM REPL)          |    0    |   5    | Register 9 existing tools in server.ts (tools/list + tools/call)               | Small  |
| I4 (memory layers)     |    3    |   5    | Add `gofer.useLayeredMemory` VSCode setting; read in extension.ts              |  Tiny  |
| I5 (compactor)         |    0    |   5    | Wire `monitorAndCompactContext()` to critical health events; pass LLM provider | Medium |

### Category J: Process Quality — 20/35 (57%) → 33/35

| Gap                 | Current | Target | Fix                                                                       | Effort |
| ------------------- | :-----: | :----: | ------------------------------------------------------------------------- | :----: |
| J1 (scope guard)    |    4    |   5    | Add enforcement modes (advisory/warning/blocking); VSCode diagnostics     | Medium |
| J2 (slop detector)  |    2    |   5    | Add MCP tool; auto-trigger on task complete; add to package.json commands | Medium |
| J3 (feedback loops) |    2    |   5    | Post-task hook detecting task completion; auto-test trigger               | Medium |
| J4 (checkpoints)    |    3    |   5    | PreOperationCheckpoint with git stash; rollback command                   | Medium |
| J5 (observability)  |    3    |   5    | Populate existing empty fields; per-stage cost aggregation                | Medium |
| J6 (brownfield)     |    2    |   5    | Auto-detect brownfield; populate analysis template from agents            | Medium |

## Codebase Analysis

### Where to Implement

| Component                 | Location                                                | Gap(s)                             | Action                                                                |
| ------------------------- | ------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| CitationVerifier          | `extension/src/autonomous/CitationVerifier.ts`          | C5, C6                             | Add symbol staleness warnings, async search                           |
| ContextCompactor          | `extension/src/autonomous/ContextCompactor.ts`          | I5                                 | Wire to health events, pass LLM provider                              |
| ContextFolder (NEW)       | `extension/src/autonomous/ContextFolder.ts`             | I1                                 | Create class, wire to ContextBuilder                                  |
| ContextBuilder            | `extension/src/autonomous/ContextBuilder.ts`            | I1, I2, F4                         | Add ContextFolder + ParallelAnalysis setters                          |
| ContextUsageLogger        | `extension/src/autonomous/ContextUsageLogger.ts`        | J5                                 | Populate LLM token fields, add aggregation                            |
| MemoryManager             | `extension/src/autonomous/MemoryManager.ts`             | C7, C9, C10, H4                    | Periodic consolidation, max limit, rich markdown, bidirectional links |
| MemoryStorage             | `extension/src/autonomous/MemoryStorage.ts`             | C10                                | Add read-back from markdown notes                                     |
| ObservationMasker         | `extension/src/autonomous/ObservationMasker.ts`         | B3                                 | Add compression trigger methods                                       |
| ScopeGuard                | `extension/src/autonomous/ScopeGuard.ts`                | J1                                 | Add enforcement modes                                                 |
| SlopDetector              | `extension/src/autonomous/SlopDetector.ts`              | J2                                 | Add MCP tool exposure                                                 |
| SubAgentDispatcher        | `extension/src/autonomous/SubAgentDispatcher.ts`        | F5, G2, G3                         | Enforcement mode, token budgets                                       |
| ParallelAnalysisFramework | `extension/src/autonomous/ParallelAnalysisFramework.ts` | I2                                 | Wire into extension.ts + ContextBuilder                               |
| WorkspaceContextProvider  | `extension/src/autonomous/WorkspaceContextProvider.ts`  | F2                                 | Configurable staleness, hook-bridge detection                         |
| server.ts                 | `language-server/src/server.ts`                         | I3, J2                             | Register 9 REPL tools + slop detection tool                           |
| extension.ts              | `extension/src/extension.ts`                            | B1, B3, B6, I2, I4, I5, F4, G3, J2 | Central wiring hub                                                    |
| package.json              | `extension/package.json`                                | B6, I4, J1, J2                     | VSCode settings + commands                                            |

### Existing Patterns to Follow

#### Pattern 1: Setter + Wire Pattern (used by all ContextBuilder integrations)

```typescript
// In ContextBuilder.ts:
private myComponent?: MyComponent;
setMyComponent(component: MyComponent): void { this.myComponent = component; }

// In extension.ts:
const myComponent = new MyComponent(workspacePath);
sharedContextBuilder.setMyComponent(myComponent);
```

Used by: CitationVerifier, ScopeGuard, KnowledgeGraph, SubAgentDispatcher,
MemoryLayerManager, ObservationMasker.

#### Pattern 2: MCP Tool Registration (server.ts)

```typescript
// In tools/list array:
{ name: 'gofer_my_tool', description: '...', parameters: { type: 'object', properties: {...} } }

// In tools/call switch:
case 'gofer_my_tool': result = await mcpToolHandler.myTool(args); break;
```

Used by: all 11 existing registered tools.

#### Pattern 3: VSCode Setting + Runtime Read

```typescript
// In package.json contributes.configuration:
"gofer.mySetting": { "type": "boolean", "default": false, "description": "..." }

// In extension.ts:
const value = vscode.workspace.getConfiguration('gofer').get<boolean>('mySetting', false);
```

Used by: anthropicApiKey, autonomousMode, autoInitialize,
observationPreservePatterns.

#### Pattern 4: Event-Driven Wiring (extension.ts)

```typescript
contextHealthMonitor.on('critical', (status) => {
  /* react to health event */
});
sharedContextBuilder.on('stage-change', (event) => {
  /* react to stage change */
});
hookBridgeWatcher.on('bridge-update', (data) => {
  /* react to hook data */
});
```

Used by: AutoHandoffTrigger, SubAgentDispatcher, ObservationMasker LLM trigger.

### Integration Points

1. **extension.ts** (central hub): All new wiring goes here, following existing
   patterns around lines 1370-1560
2. **server.ts** (MCP registration): Tool definitions at lines 175-343, routing
   at lines 554-617
3. **ContextBuilder.buildContext()**: Section assembly at lines 500-810, merge
   at line 809
4. **package.json**: Settings at `contributes.configuration`, commands at
   `contributes.commands`
5. **post-tool-use.mjs**: Hook script for real-time Claude Code integration

## Technology Decisions

### Decision 1: ContextFolder Implementation

- **Choice**: New file `ContextFolder.ts` with fold-state-aware rendering
- **Rationale**: MCP tools already set fold state in `context-fold-state.json`.
  Need a reader that applies fold states before `mergeContextSections()`.
- **Alternative**: Modify `mergeContextSections()` directly — rejected because
  it would bloat an already complex method.

### Decision 2: ContextCompactor Wiring vs Deletion

- **Choice**: Wire it up (not delete)
- **Rationale**: 579 lines of working code with LLM summarization,
  backup/rollback. Deletion would be faster but wiring adds rubric value. The
  code has real `summarizeTasks()` with LLM fallback.
- **Alternative**: Delete and rely solely on handoffs — valid but doesn't
  improve rubric.

### Decision 3: RLM REPL Registration

- **Choice**: Register all 9 existing tools in server.ts
- **Rationale**: Zero new logic needed. All tools are fully implemented in
  toolHandler.ts. Just add definitions to tools/list and case statements to
  tools/call.

### Decision 4: Bidirectional Memory Links (H4)

- **Choice**: Back-reference on save + dedicated traversal method
- **Rationale**: Adding reverse links during `save()` keeps the graph
  consistent. A BFS traversal method enables Zettelkasten navigation.
- **Alternative**: Separate MemoryGraph adjacency list — over-engineered for
  current needs.

### Decision 5: ScopeGuard Enforcement

- **Choice**: Three-mode system (advisory/warning/blocking) with VSCode
  diagnostics
- **Rationale**: Gradual enforcement lets users choose strictness. Diagnostics
  integrate with VSCode's existing problem panel.

## Constraints & Considerations

- **Performance**: Symbol verification (`findSymbolInDirectory`) uses sync FS
  reads. Must make async for large codebases.
- **API key dependency**: LLM compression (B3), ContextCompactor (I5),
  ResearchSummarizer (D3) require Anthropic API key. Must have graceful
  fallbacks.
- **Extension host blocking**: All new periodic timers must use `setInterval`
  with reasonable intervals (>= 30s) and cleanup in `deactivate()`.
- **Backward compatibility**: C10 dual storage changes must handle existing
  memories without `notePath` field.
- **Test coverage**: 197 existing observation tests + 5 pre-existing failures in
  agent-stop-extraction.test.ts.

## Brownfield Analysis

### Protected Boundaries

- `ContextHealthMonitor.ts` — production-ready (34/35), minimal changes only
- `ClaudeSessionReader.ts` — privacy-guarded, do not expose new fields
- `MemoryStorage.ts` JSONL format — must maintain backward compatibility
- `post-tool-use.mjs` — hook script runs in Claude Code process, minimal changes

### Downstream Dependencies

- `ContextBuilder.buildContext()` is called by every Gofer pipeline stage
- `MemoryManager.save()` is called by ContinuousMemoryWriter,
  autonomousCommands, and MCP tools
- `server.ts` MCP routing affects all Claude Code tool calls

### Technical Debt to Avoid

- Do NOT add more dead code — every new class must be wired
- Do NOT add synchronous FS operations in extension host main thread
- Do NOT create memory leaks with uncleared timers/listeners

## Recommendations

1. **Prioritize wiring tasks first** — I3 (9 tools), I4 (1 setting), I2
   (import+wire) are the highest ROI at ~12 points for ~1 hour of work
2. **Group by file** — Many gaps touch extension.ts; batch all extension.ts
   changes together
3. **Create ContextFolder.ts early** — It's the only new file needed and enables
   I1
4. **Wire ContextCompactor last** — It's the riskiest change (could affect
   session stability)
5. **Run TypeScript compilation after each batch** — Pre-existing TS errors
   burned time in v1.3.0

## Open Questions

None — all gaps have clear implementation paths from the research.
