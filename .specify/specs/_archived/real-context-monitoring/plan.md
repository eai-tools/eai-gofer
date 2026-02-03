---
feature: Real Context Window Monitoring & Continuous Memory Updates
spec: spec.md
research: research.md
status: ready
created: '2026-01-29'
---

# Implementation Plan: Real Context Window Monitoring & Continuous Memory Updates

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest
- **Build**: Webpack

### Architecture

```
~/.claude/projects/{workspace}/          Extension Process
  ├── sessions-index.json          ┌─────────────────────────────────┐
  └── {session}.jsonl  ──────────► │ ClaudeSessionReader             │
                                   │   - findActiveSession()         │
                                   │   - tailReadUsage()             │
                                   │   - getModel()                  │
                                   └──────────┬──────────────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────────────────┐
                                   │ WorkspaceContextProvider         │
                                   │   - getContextAnalysis()         │
                                   │   (delegates to session reader   │
                                   │    or falls back to filesystem)  │
                                   └──────────┬──────────────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────────────────┐
                                   │ ContextHealthMonitor             │
                                   │   - checkHealth()                │
                                   │   - dynamic context limit        │
                                   │   - emits healthy/warning/crit   │
                                   └──┬────────────┬─────────────────┘
                                      │            │
                          ┌───────────┘            └──────────────┐
                          ▼                                       ▼
               ┌───────────────────┐              ┌──────────────────────┐
               │ ContextHealth     │              │ AutoHandoffTrigger   │
               │ StatusBar         │              │ ContextUsageLogger   │
               │ "Context: 54%    │              │ State Persistence    │
               │  (Opus)"         │              └──────────────────────┘
               └───────────────────┘

               ┌──────────────────────────────────┐
               │ ContinuousMemoryWriter            │
               │   - listens to ContextBuilder     │
               │   - listens to pipeline events    │
               │   - auto-saves to MemoryManager   │
               └──────────────────────────────────┘
```

### Integration Points

| Component                | File                                                   | Integration Type                       |
| ------------------------ | ------------------------------------------------------ | -------------------------------------- |
| WorkspaceContextProvider | `extension/src/autonomous/WorkspaceContextProvider.ts` | Modify — add session reader delegation |
| ContextHealthMonitor     | `extension/src/autonomous/ContextHealthMonitor.ts`     | Modify — dynamic context limit         |
| ContextHealthStatusBar   | `extension/src/ui/ContextHealthStatusBar.ts`           | Modify — real/no-session display modes |
| Extension wiring         | `extension/src/extension.ts`                           | Modify — wire ClaudeSessionReader      |
| MCP toolHandler          | `language-server/src/mcp/toolHandler.ts`               | Modify — read new state fields         |
| ContextBuilder           | `extension/src/autonomous/ContextBuilder.ts`           | Listen — events for memory writer      |

### Key Dependencies

- `ContextHealthMonitor` — existing event emitter, consumers must not break
- `MemoryManager` — existing persistence layer, used by ContinuousMemoryWriter
- `ContextBuilder` — existing event emitter, listened to by memory writer
- Node.js `fs` module — for JSONL tail-reading and session discovery
- `os.homedir()` — for cross-platform `~/.claude/` path resolution

## Implementation Phases

### Phase 1: ClaudeSessionReader (Foundation)

**Goal**: Create the core JSONL reader that can discover sessions and extract
real token data

**Tasks**:

- [ ] Create `ClaudeSessionReader` class with session discovery
- [ ] Implement workspace-to-project-directory path encoding
- [ ] Implement sessions-index.json parsing to find active session
- [ ] Implement JSONL tail-read (last ~10KB) for token extraction
- [ ] Extract model ID from last assistant message
- [ ] Create model-to-context-limit lookup table
- [ ] Add privacy guard — only read approved fields (type, timestamp, sessionId,
      message.usage, message.model)
- [ ] Write unit tests for all reader methods
- [ ] Write unit tests for path encoding
- [ ] Write unit tests for tail-read edge cases (empty file, no assistant
      messages, malformed JSON)

**Verification**:

- [ ] Reader correctly discovers session for current workspace
- [ ] Tail-read returns accurate token counts from last assistant message
- [ ] Model lookup returns correct context limits
- [ ] Privacy: no message content fields accessed (structural test)

### Phase 2: WorkspaceContextProvider Enhancement

**Goal**: Replace filesystem estimation with real session data, with graceful
fallback

**Tasks**:

- [ ] Add `ClaudeSessionReader` as optional dependency to
      `WorkspaceContextProvider`
- [ ] Add `setSessionReader()` method for wiring
- [ ] Modify `getContextAnalysis()` to try session reader first, fall back to
      filesystem
- [ ] Return `dataSource: 'real' | 'estimated' | 'none'` in analysis result
- [ ] Populate `conversation` field with actual token count (was hardcoded to 0)
- [ ] Add session metadata (model, sessionId, sessionAge) to analysis
- [ ] Update existing tests to cover both real and fallback paths
- [ ] Write new tests for session-reader integration

**Verification**:

- [ ] When session active: returns real token data with `dataSource: 'real'`
- [ ] When no session: returns `dataSource: 'none'` with neutral values
- [ ] Existing consumers (ContextHealthMonitor) continue to work unchanged

### Phase 3: Dynamic Context Limits

**Goal**: Make ContextHealthMonitor use model-appropriate context limits

**Tasks**:

- [ ] Add `setEffectiveContextLimit()` method to ContextHealthMonitor
- [ ] Modify WorkspaceContextProvider to pass model-based limit alongside
      analysis
- [ ] Add `updateContextLimit()` call in health check flow when model is known
- [ ] Ensure limit changes emit events so status bar updates
- [ ] Preserve backward compatibility — existing default (120k) remains when no
      model detected
- [ ] Update persisted state to include model and dataSource fields
- [ ] Update tests for dynamic limit behavior

**Verification**:

- [ ] Opus sessions use 200k limit
- [ ] Sonnet sessions use 200k limit
- [ ] Unknown models default to 200k
- [ ] Status bar percentages reflect correct limits
- [ ] Persisted state includes new fields

### Phase 4: Status Bar & Display Updates

**Goal**: Show meaningful context information based on real vs no-session states

**Tasks**:

- [ ] Add data source mode to status bar display logic
- [ ] Real mode: "Context: 54% (Opus)" with appropriate colors
- [ ] No-session mode: "Context: No session" in neutral/dim color
- [ ] Add model name to click-through detail panel
- [ ] Add session age and API call count to detail panel
- [ ] Add peak token usage to detail panel (track from session history)
- [ ] Update tests for new display modes

**Verification**:

- [ ] Status bar shows real percentage when session active
- [ ] Status bar shows "No session" when inactive
- [ ] Click-through shows model, session info, and history
- [ ] Colors match existing healthy/warning/critical scheme

### Phase 5: ContinuousMemoryWriter

**Goal**: Auto-persist pipeline decisions and progress to memory system

**Tasks**:

- [ ] Create `ContinuousMemoryWriter` class
- [ ] Listen to ContextBuilder `budget-warning` and `loading-decision` events
- [ ] Listen to pipeline stage transitions (detect from spec artifact changes)
- [ ] Listen to task completion events (tasks.md checkbox changes)
- [ ] Implement rate limiting (max 10 auto-saves per stage)
- [ ] Use structured categories: `pipeline_stage`, `task_completion`,
      `auto_decision`
- [ ] Tag memories with `#auto`, `#stage-{name}`, `#spec-{id}`
- [ ] Wire to MemoryManager in extension.ts
- [ ] Write unit tests for event handling and rate limiting
- [ ] Write integration test for end-to-end memory persistence

**Verification**:

- [ ] Stage transitions create memories
- [ ] Task completions create memories
- [ ] Rate limit prevents more than 10 saves per stage
- [ ] Memories are retrievable via MemoryManager.search()

### Phase 6: Extension Wiring & Integration

**Goal**: Wire all new components together in extension.ts

**Tasks**:

- [ ] Create ClaudeSessionReader instance in initializeContextHealthMonitoring()
- [ ] Pass reader to WorkspaceContextProvider
- [ ] Create ContinuousMemoryWriter and wire to ContextBuilder events
- [ ] Update polling interval: 10s when session active, 30s when not
- [ ] Remove duplicate startMonitoring() call (existing bug from Spec 013)
- [ ] Update MCP tool gofer_get_context_health to return new fields
- [ ] Ensure proper disposal of all new components
- [ ] Write integration test for full monitoring pipeline

**Verification**:

- [ ] Full pipeline works: JSONL → reader → provider → monitor → status bar
- [ ] MCP tool returns real data when session active
- [ ] All new components properly disposed on extension deactivation
- [ ] Full test suite passes with no regressions

## File Structure

```
extension/src/autonomous/
  ├── ClaudeSessionReader.ts        (NEW — JSONL reader, session discovery)
  ├── ContinuousMemoryWriter.ts     (NEW — auto-persist pipeline events)
  ├── WorkspaceContextProvider.ts    (MODIFY — session reader integration)
  ├── ContextHealthMonitor.ts       (MODIFY — dynamic limits)
  └── index.ts                      (MODIFY — new exports)

extension/src/ui/
  └── ContextHealthStatusBar.ts     (MODIFY — real/no-session modes)

extension/src/extension.ts          (MODIFY — wiring)

language-server/src/mcp/
  └── toolHandler.ts                (MODIFY — new state fields)

tests/unit/autonomous/
  ├── ClaudeSessionReader.test.ts   (NEW)
  ├── ContinuousMemoryWriter.test.ts (NEW)
  ├── WorkspaceContextProvider.test.ts (UPDATE)
  └── ContextHealthMonitor.test.ts  (UPDATE)

tests/unit/ui/
  └── ContextHealthStatusBar.test.ts (UPDATE)

tests/integration/
  └── real-context-monitoring.test.ts (NEW)
```

## Risk Assessment

| Risk                                             | Impact | Mitigation                                                                                                                   |
| ------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Claude Code changes JSONL format                 | High   | Only read stable fields (usage, type, model). Version-check sessions-index.json. Graceful fallback to filesystem estimation. |
| JSONL file grows very large                      | Medium | Tail-read only last ~10KB. Never read full file on poll cycle.                                                               |
| ~/.claude/ doesn't exist                         | Low    | Check existence first. Fall back to "No session" mode. No errors logged.                                                     |
| Race condition reading JSONL while Claude writes | Low    | JSONL is append-only. Partial last line handled by skipping malformed JSON.                                                  |
| Multiple VS Code windows same workspace          | Medium | Use most recent session from sessions-index. Lock files help disambiguate.                                                   |

## Notes

- The `conversation: 0` hardcode in WorkspaceContextProvider is the single
  biggest accuracy gap — real data fills this with actual token counts
- Privacy is a hard constraint: never access `message.content` from JSONL logs
- The existing `effectiveContextLimit: 120000` default was too conservative for
  Opus (200k window) — model-aware limits fix this
- ContinuousMemoryWriter is independent of context monitoring and can be wired
  even without Claude Code active

## Spec Traceability

### User Story Coverage

| Story                                    | Status  | Plan References                                                              |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| US1: Real Context Window Visibility (P1) | COVERED | Phase 1 (reader), Phase 2 (provider), Phase 4 (status bar), Phase 6 (wiring) |
| US2: Model-Aware Context Limits (P1)     | COVERED | Phase 1 (model lookup), Phase 3 (dynamic limits)                             |
| US3: Graceful Fallback (P2)              | COVERED | Phase 2 (fallback logic), Phase 4 (no-session mode)                          |
| US4: Continuous Memory Persistence (P2)  | COVERED | Phase 5 (ContinuousMemoryWriter)                                             |
| US5: Session History Insight (P3)        | COVERED | Phase 4 (detail panel enhancements)                                          |

### Requirement Coverage

| Requirement                     | Status  | Plan Reference                                   |
| ------------------------------- | ------- | ------------------------------------------------ |
| FR1: Session Log Reading        | COVERED | Phase 1 — ClaudeSessionReader                    |
| FR2: Session Discovery          | COVERED | Phase 1 — sessions-index parsing, path encoding  |
| FR3: Efficient File Reading     | COVERED | Phase 1 — tail-read implementation               |
| FR4: Model-Aware Context Limits | COVERED | Phase 1 (lookup table), Phase 3 (dynamic limits) |
| FR5: Polling Strategy           | COVERED | Phase 6 — adaptive polling intervals             |
| FR6: Status Bar Enhancement     | COVERED | Phase 4 — real/no-session display modes          |
| FR7: Continuous Memory Writer   | COVERED | Phase 5 — ContinuousMemoryWriter                 |
| FR8: Persisted State Format     | COVERED | Phase 3 (new fields), Phase 6 (MCP tool update)  |

Coverage: 100% of user stories (5/5), 100% of functional requirements (8/8)
