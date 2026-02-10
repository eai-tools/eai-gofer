---
feature: "Context Management Rubric: Final Push to 100%"
spec: spec.md
research: research.md
status: ready
created: 2026-02-10T08:15:00Z
---

# Implementation Plan: Context Management Rubric 100%

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **LSP**: vscode-languageclient/vscode-languageserver
- **Testing**: Vitest
- **Build**: Webpack

### Architecture

Brownfield update to existing Gofer extension. All changes follow established patterns:

1. **Setter + Wire Pattern**: New components get setters in ContextBuilder, wired in extension.ts
2. **MCP Tool Registration**: Tool definitions in server.ts tools/list, routing in tools/call switch
3. **VSCode Settings**: package.json contributes.configuration, read via getConfiguration()
4. **Event-Driven Wiring**: EventEmitter .on() listeners in extension.ts

### Integration Points

| Component | File | Integration Type |
|-----------|------|------------------|
| ContextBuilder | `extension/src/autonomous/ContextBuilder.ts` | Setter + Wire |
| extension.ts | `extension/src/extension.ts` | Central wiring hub (lines 1350-1760) |
| server.ts | `language-server/src/server.ts` | MCP registration (lines 175-343, 554-617) |
| package.json | `extension/package.json` | Settings (lines 393-646), Commands (lines 40-207) |

### Key Dependencies

- All existing autonomous/ classes are already compiled and imported
- LLM-dependent features require AutonomousLLMProvider (graceful fallback required)
- ContextHealthMonitor events drive reactive wiring

## Implementation Phases

### Phase 1: Quick Wins — Wiring and Registration (+20 pts, ~12 items)

**Goal**: Register dead code, enable disabled features, add missing settings.

**Tasks**:

- [ ] Register 9 REPL tools in server.ts tools/list array (after line 342)
- [ ] Add 9 REPL tool cases in server.ts tools/call switch (before line 616)
- [ ] Add `gofer.useLayeredMemory` boolean setting to package.json (after line 645)
- [ ] Read `gofer.useLayeredMemory` setting in extension.ts and pass to MemoryLayerManager
- [ ] Wire ParallelAnalysisFramework: add setter in ContextBuilder, instantiate in extension.ts
- [ ] Add ParallelAnalysisFramework section to buildContext() output
- [ ] Add data-source indicator "(real)" / "(est)" to ContextHealthStatusBar text
- [ ] Add LRU eviction telemetry: log eviction count + reclaimed tokens to ContextUsageLogger

**Verification**: `npm run compile` passes. MCP tools/list returns 20 tools. Status bar shows data source.

### Phase 2: Observation Management Improvements (+10 pts)

**Goal**: Complete observation masking, decay, and configuration.

**Tasks**:

- [ ] Change debounce from leading-edge to trailing-edge in extension.ts
- [ ] Add `saveCacheToDisk()` call in deactivate() function
- [ ] Clear debounce timer in deactivate()
- [ ] Add warning-level LLM compression trigger (not just critical)
- [ ] Add observation-count trigger: compress when >50 observations in cache
- [ ] Add `gofer.observationPreservePatterns` runtime reload via onDidChangeConfiguration
- [ ] Add YAML config support: read from `.specify/memory/observation-config.yaml`

**Verification**: Extension deactivate flushes cache. LLM compression fires on warning events.

### Phase 3: Memory System Enhancements (+18 pts)

**Goal**: Consolidation, limits, dual storage, bidirectional links, citation improvements.

**Tasks**:

- [ ] Add periodic consolidation timer (30 min) in MemoryManager
- [ ] Add consolidation trigger on session-start event
- [ ] Implement MAX_MEMORY_COUNT (200) check in save() with auto-archive
- [ ] Enhance markdown note format: YAML frontmatter with id, category, tags, created, priority
- [ ] Truncate JSONL entry for memories with markdown notes (store notePath reference)
- [ ] Add read-back from markdown notes in MemoryStorage
- [ ] Add backReferences field to memory entries
- [ ] Maintain bidirectional links on save: update referenced memory back-references
- [ ] Add BFS traversal method for Zettelkasten navigation
- [ ] Make CitationVerifier file search async (fs.promises)
- [ ] Add relative path resolution to file citations
- [ ] Add symbol staleness `[STALE]` prefix when symbol not found in current file
- [ ] Wire symbol staleness to consolidator: flag stale memories for re-verification
- [ ] Cleanup consolidation timer in deactivate()

**Verification**: Consolidation timer fires. save() enforces limits. Markdown notes have frontmatter.

### Phase 4: Stage-Aware Context and Sub-Agent (+14 pts)

**Goal**: Improve stage detection, add auto-checkpoints, enforce delegation.

**Tasks**:

- [ ] Add configurable staleness threshold to WorkspaceContextProvider (VSCode setting)
- [ ] Add hook-bridge command detection as primary stage detection source
- [ ] Listen to `stage-change` event in extension.ts for auto-checkpoint
- [ ] Save lightweight checkpoint on stage transition (task progress + stage name)
- [ ] Wire SubAgentDispatcher enforcement: threshold-based operation blocking
- [ ] Add `tokenBudget` field to DelegationRecommendation interface
- [ ] Add `truncateResult()` utility for sub-agent result truncation
- [ ] Wire SubAgentDispatcher to ContextHealthMonitor for dynamic threshold escalation

**Verification**: Stage detection uses hook-bridge data. Stage changes trigger checkpoints.

### Phase 5: Create ContextFolder (+2 pts)

**Goal**: Section-level folding for context output.

**Tasks**:

- [ ] Create `ContextFolder.ts` with fold-state-aware rendering
- [ ] Read fold state from `.specify/hooks/context-fold-state.json`
- [ ] Implement collapsed (one-line summary), summary (key points), expanded (full) rendering
- [ ] Add ContextFolder setter in ContextBuilder
- [ ] Wire ContextFolder in extension.ts
- [ ] Apply fold state in mergeContextSections() before final merge

**Verification**: Collapsed sections render as summaries. Missing fold-state file = passthrough.

### Phase 6: Research and Session Management (+10 pts)

**Goal**: Improve research pipeline and session continuity.

**Tasks**:

- [ ] Add deterministic fallback to ResearchSummarizer (section headers + first sentence)
- [ ] Add hierarchical summarization: chapter → section → paragraph
- [ ] Auto-trigger research-to-memory on research-complete event (batch conversion)
- [ ] Add AST-aware import extraction to KnowledgeGraph (regex-based TS import parsing)
- [ ] Add entity deduplication to KnowledgeGraph
- [ ] Wire CheckpointValidator into session save flow
- [ ] Add git state capture (branch, status, stash count) to checkpoints
- [ ] Add programmatic SessionResumeCommand with state validation
- [ ] Add required fields validation to CheckpointValidator

**Verification**: Summarization works without API key. research-complete triggers batch memories.

### Phase 7: Process Quality (+18 pts)

**Goal**: ScopeGuard enforcement, SlopDetector integration, feedback loops, checkpoints, observability.

**Tasks**:

- [ ] Add enforcement modes to ScopeGuard: advisory/warning/blocking
- [ ] Wire ScopeGuard to VSCode diagnostics collection
- [ ] Register SlopDetector as MCP tool `gofer_check_slop` in server.ts
- [ ] Add `gofer.checkForSlop` to package.json contributes.commands
- [ ] Add SlopDetector auto-trigger on task completion events
- [ ] Add post-task feedback hook: detect task checkbox changes in tasks.md
- [ ] Auto-trigger test runner when task involves test-related files
- [ ] Add PreOperationCheckpoint: git stash before risky operations
- [ ] Add rollback command to restore from PreOperationCheckpoint
- [ ] Populate ContextUsageLogger LLM token fields (input_tokens, output_tokens)
- [ ] Add per-stage cost aggregation to ContextUsageLogger
- [ ] Add brownfield auto-detection: scan for existing package.json, tsconfig, etc.
- [ ] Populate brownfield analysis template fields from workspace analysis

**Verification**: ScopeGuard shows diagnostics. SlopDetector callable as MCP tool. Feedback hooks fire.

### Phase 8: Wire ContextCompactor (+5 pts)

**Goal**: Connect the existing 579-line ContextCompactor to production events.

**Tasks**:

- [ ] Call `contextCompactor.setLLMProvider()` when Anthropic API key is available
- [ ] Wire `monitorAndCompactContext()` to critical health events
- [ ] Add debounce/cooldown to prevent rapid compaction cycles
- [ ] Add compaction telemetry logging
- [ ] Promote contextCompactor to module-level variable for deactivate() cleanup
- [ ] Add contextCompactor cleanup in deactivate()

**Verification**: Compaction triggers on critical events. Telemetry logged. Clean deactivate.

### Phase 9: Final Integration and deactivate() Cleanup

**Goal**: Ensure all new timers/listeners are cleaned up.

**Tasks**:

- [ ] Audit all new setInterval/setTimeout calls have cleanup in deactivate()
- [ ] Audit all new event listeners are removed in deactivate()
- [ ] Run full TypeScript compilation
- [ ] Run existing test suite
- [ ] Update consolidated rubric at `.specify/research/context-management-rubric.md`

**Verification**: `npm run compile` clean. `npm test` passes (minus pre-existing failures).

## File Structure

```
extension/src/autonomous/
├── ContextFolder.ts (NEW)
├── ContextBuilder.ts (modified - add setters, fold integration)
├── ContextCompactor.ts (unchanged - wire only)
├── CitationVerifier.ts (modified - async, staleness)
├── ContextUsageLogger.ts (modified - populate fields)
├── MemoryManager.ts (modified - consolidation, limits, links, markdown)
├── MemoryStorage.ts (modified - read-back)
├── ObservationMasker.ts (modified - triggers, config)
├── ParallelAnalysisFramework.ts (unchanged - wire only)
├── ScopeGuard.ts (modified - enforcement modes)
├── SlopDetector.ts (modified - MCP exposure)
├── SubAgentDispatcher.ts (modified - enforcement, token budget)
├── WorkspaceContextProvider.ts (modified - configurable staleness)
├── CheckpointValidator.ts (modified - save flow integration)
└── KnowledgeGraph.ts (modified - AST imports, dedup)
extension/src/
├── extension.ts (modified - central wiring, deactivate cleanup)
├── statusBar/ContextHealthStatusBar.ts (modified - data source indicator)
language-server/src/
├── server.ts (modified - 10+ new MCP tools)
├── mcp/toolHandler.ts (modified - slop detection handler)
extension/
├── package.json (modified - settings + commands)
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ContextCompactor affects session stability | High | Wire last (Phase 8), add cooldown, test thoroughly |
| Memory consolidation corrupts JSONL | Medium | Backup before consolidation, backward compat checks |
| Too many periodic timers slow extension | Medium | Minimum 30s intervals, cleanup in deactivate |
| MCP tool registration breaks existing tools | Medium | Add new tools after existing ones, test tools/list |
| TypeScript compilation errors cascade | Low | Compile after each phase |

## Protected Boundaries

- `ContextHealthMonitor.ts` — minimal changes only (34/35 score)
- `ClaudeSessionReader.ts` — do not expose new fields
- `MemoryStorage.ts` JSONL format — backward compatible changes only
- `post-tool-use.mjs` — minimal changes (runs in Claude Code process)

## Spec Traceability

### User Story Coverage

| Story | Status | Plan References |
|-------|--------|-----------------|
| US1 (P1) | COVERED | Phase 1 (wiring), Phase 8 (compactor) |
| US2 (P2) | COVERED | Phase 2 (observation), Phase 5 (folder) |
| US3 (P3) | COVERED | Phase 3 (memory system) |
| US4 (P4) | COVERED | Phase 4 (stage/sub-agent) |
| US5 (P5) | COVERED | Phase 6 (research/session) |
| US6 (P6) | COVERED | Phase 7 (process quality) |
| US7 (P7) | COVERED | Phase 1 (status bar, LRU telemetry) |

### Requirement Coverage

| Requirement | Status | Plan Phase |
|-------------|--------|------------|
| FR-001 to FR-004 | COVERED | Phase 1 |
| FR-005 to FR-008 | COVERED | Phase 2, 5 |
| FR-009 to FR-015 | COVERED | Phase 3 |
| FR-016 to FR-019 | COVERED | Phase 4 |
| FR-020 to FR-023, FR-032 | COVERED | Phase 6 |
| FR-024 to FR-029, FR-033 | COVERED | Phase 7 |
| FR-030 to FR-031 | COVERED | Phase 1 |

Coverage: 100% of user stories, 100% of functional requirements
