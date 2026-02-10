---
feature: "Multi-Session Context Panel"
spec: spec.md
research: research.md
status: ready
created: "2026-02-10T14:45:00Z"
---

# Implementation Plan: Multi-Session Context Panel

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest for unit tests
- **Build**: Webpack for bundling
- **Runtime**: Node.js 20.x LTS

### Architecture

```
Hook Script (post-tool-use.mjs)
  │ writes per-session bridge files
  ▼
.specify/hooks/context-bridge-{sessionId}.json  (up to 3 files)
  │
  ▼
MultiSessionBridgeWatcher (NEW)
  │ FileSystemWatcher on hooks/ directory
  │ maintains Map<sessionId, BridgeData> (max 3)
  │ emits: session-update, session-added, session-removed, session-limit-reached
  │
  ├──▶ ContextWindowProvider (NEW TreeDataProvider)
  │     3-level tree: sessions → categories → token counts
  │
  ├──▶ ContextHealthStatusBar (MODIFIED)
  │     shows focused session + [N/3] count
  │
  ├──▶ WorkspaceContextProvider (MODIFIED)
  │     focused session concept for backward compat
  │
  ├──▶ AutoHandoffTrigger (unchanged, uses focused session)
  │
  └──▶ GoferActivityStatusBar (unchanged, uses focused session)

MemoryManager.load()
  │
  ▼
MemoryProvider (REWRITTEN TreeDataProvider)
  Constitution node + categories → memory entries
```

### Integration Points

| Component | File | Integration Type |
|-----------|------|------------------|
| HookBridgeWatcher | `extension/src/autonomous/HookBridgeWatcher.ts` | Wrapped by MultiSessionBridgeWatcher |
| WorkspaceContextProvider | `extension/src/autonomous/WorkspaceContextProvider.ts` | Modified: accepts MultiSessionBridgeWatcher |
| ContextHealthStatusBar | `extension/src/ui/ContextHealthStatusBar.ts` | Modified: adds [N/3] count |
| GoferActivityStatusBar | `extension/src/ui/GoferActivityStatusBar.ts` | Unchanged (uses legacy events) |
| AutoHandoffTrigger | `extension/src/autonomous/AutoHandoffTrigger.ts` | Unchanged (uses legacy events) |
| MemoryManager | `extension/src/autonomous/MemoryManager.ts` | Data source for new MemoryProvider |
| post-tool-use.mjs | `.specify/scripts/hooks/post-tool-use.mjs` | Modified: per-session bridge files |
| extension.ts | `extension/src/extension.ts` | Modified: wiring and registration |
| package.json | `extension/package.json` | Modified: view IDs and menus |

### Key Dependencies

- Existing `BridgeData` interface (no changes)
- Existing `Memory` interface (no changes)
- Existing `MemoryManager.load()` method
- VSCode `TreeDataProvider`, `FileSystemWatcher`, `EventEmitter`

## Constitution Check

- [x] Test-Driven Development: Tests written before implementation for each component
- [x] Separation of Concerns: MultiSessionBridgeWatcher is a new class, not modifying existing
- [x] Backward Compatibility: Legacy API preserved, dual-write bridge files during migration

---

## Implementation Phases

### Phase 1: Hook Script & Bridge Foundation

**Goal**: Change hook script to write per-session bridge files. This is the foundation all other phases depend on.

**Files Modified**:
- `.specify/scripts/hooks/post-tool-use.mjs`
- `extension/resources/hook-scripts/post-tool-use.mjs`

**Tasks**:

- [ ] T001 [Setup] Write unit tests for per-session bridge file naming (`context-bridge-{sessionId}.json`)
- [ ] T002 [FR1] Modify `writeBridge()` in `post-tool-use.mjs` to write per-session file
- [ ] T003 [FR7] Add dual-write: also write legacy `context-bridge.json` for backward compat
- [ ] T004 [Setup] Copy updated hook script to `extension/resources/hook-scripts/`
- [ ] T005 [FR1] Write integration test: two sessions produce two separate bridge files

**Verification**:
- [ ] Hook script writes `context-bridge-{sessionId}.json` with correct BridgeData
- [ ] Legacy `context-bridge.json` also written (backward compat)
- [ ] Tests pass

### Phase 2: MultiSessionBridgeWatcher

**Goal**: New watcher class that tracks up to 3 sessions from per-session bridge files.

**Files Created**:
- `extension/src/autonomous/MultiSessionBridgeWatcher.ts`
- `tests/unit/autonomous/MultiSessionBridgeWatcher.test.ts`

**Tasks**:

- [ ] T006 [Setup] Write unit test suite for MultiSessionBridgeWatcher (session add/update/remove/evict/stale)
- [ ] T007 [FR2] Implement MultiSessionBridgeWatcher: FileSystemWatcher on `.specify/hooks/context-bridge-*.json` glob
- [ ] T008 [FR2] Implement session registry: `Map<sessionId, BridgeData>` with `getFocusedSession()`
- [ ] T009 [FR3] Implement 3-session cap: evict oldest inactive on 4th, emit `session-limit-reached`
- [ ] T010 [FR8] Implement session cleanup: detect staleness (>5 min), emit `session-removed`, delete bridge file after grace period
- [ ] T011 [FR7] Add legacy bridge support: also watch `context-bridge.json` and treat as a session
- [ ] T012 [FR2] Implement legacy event forwarding: emit `bridge-update`, `session-start`, `session-end`, `session-stale` for focused session (backward compat for existing consumers)
- [ ] T013 [Setup] Run tests, verify all pass

**Verification**:
- [ ] All unit tests pass (session lifecycle, cap enforcement, staleness, legacy compat)
- [ ] Event signatures match contracts/internal-api.md

### Phase 3: Panel Layout Redesign

**Goal**: Change Gofer sidebar from Specs|Constitution|Memory to Specs|Context Window|Memory.

**Files Modified**:
- `extension/package.json`
- `extension/src/extension.ts`

**Files Affected (references to remove)**:
- `extension/src/constitutionProvider.ts` (no longer registered as view)

**Tasks**:

- [ ] T014 [US5] Replace `goferConstitution` view with `goferContextWindow` in `package.json` views section
- [ ] T015 [US5] Update view title menus in `package.json`: add refresh command for `goferContextWindow`, remove `goferConstitution` menu entries
- [ ] T016 [US5] Add `viewsWelcome` entry for `goferContextWindow`: "No active Claude Code sessions. Start Claude Code to see context health."
- [ ] T017 [US5] Update `registerTreeViews()` in `extension.ts`: replace ConstitutionProvider with ContextWindowProvider
- [ ] T018 [US5] Ensure Constitution remains accessible via Command Palette (`gofer.showConstitution` command still registered)
- [ ] T019 [US5] Remove `goferConstitution` tree data provider registration (but keep ConstitutionProvider file for command palette use)

**Verification**:
- [ ] Gofer sidebar shows 3 sections: Specifications, Context Window, Memory
- [ ] Constitution command still works from Command Palette
- [ ] Extension compiles without errors

### Phase 4: Context Window Tree View

**Goal**: Implement the ContextWindowProvider showing sessions with categorized breakdowns.

**Files Created**:
- `extension/src/contextWindowProvider.ts`
- `tests/unit/contextWindowProvider.test.ts`

**Tasks**:

- [ ] T020 [Setup] Write unit tests for ContextWindowProvider (empty state, 1 session, 3 sessions, categories)
- [ ] T021 [FR4] Implement `ContextWindowItem` TreeItem subclass with `kind` discriminator (session/category/info/empty)
- [ ] T022 [US1] Implement session-level tree items: label = "Session {shortId} ({model})", description = "{utilization}%", color-coded icon
- [ ] T023 [US2] Implement category-level tree items: 6 categories (Spec Artifacts, Memories/Hints, System Files, Conversation History, Tool Outputs, Masked Observations)
- [ ] T024 [US1] Implement empty state: return empty array to trigger viewsWelcome
- [ ] T025 [US6] Implement session lifecycle icons: pulse (active), clock (stale), circle-slash (inactive)
- [ ] T026 [FR4] Wire ContextWindowProvider to MultiSessionBridgeWatcher: subscribe to events, call `refresh()` on updates
- [ ] T027 [US2] Implement token breakdown estimation: use WorkspaceContextProvider filesystem estimation shared across sessions
- [ ] T028 [Setup] Run tests, verify all pass

**Verification**:
- [ ] Tree shows correct sessions with health colors
- [ ] Expanding a session shows 6 category nodes with token counts
- [ ] Empty state shows welcome message
- [ ] Stale sessions show dimmed icon

### Phase 5: Memory Tree View Rewrite

**Goal**: Rewrite MemoryProvider to show categorized memories from JSONL instead of markdown files.

**Files Modified**:
- `extension/src/memoryProvider.ts`
- `tests/unit/memoryProvider.test.ts` (or new test file)

**Tasks**:

- [ ] T029 [Setup] Write unit tests for new MemoryProvider (empty state, categories, entries, constitution node)
- [ ] T030 [US4] Implement `MemoryTreeItem` subclass with `kind` discriminator (category/memory/constitution/info)
- [ ] T031 [US4] Implement category grouping: load from `MemoryManager.load()`, group by `memory.category`, sort categories alphabetically
- [ ] T032 [US4] Implement category display: display name mapping, count badge, category-specific icons
- [ ] T033 [US4] Implement memory entry items: truncated content label (60 chars), relative time description, click to open note file
- [ ] T034 [US4] Add Constitution node at top of tree: opens `constitution.md` on click
- [ ] T035 [US5] Add "Show Constitution" button in Memory view title bar (package.json menu entry)
- [ ] T036 [Setup] Run tests, verify all pass

**Verification**:
- [ ] Memory tree shows Constitution node + categories with counts
- [ ] Expanding a category shows individual memory entries
- [ ] Clicking an entry opens the memory note or shows content
- [ ] Empty categories are hidden or shown with 0 count

### Phase 6: Status Bar & Wiring

**Goal**: Add session count to status bar and wire all components together in extension.ts.

**Files Modified**:
- `extension/src/ui/ContextHealthStatusBar.ts`
- `extension/src/autonomous/WorkspaceContextProvider.ts`
- `extension/src/extension.ts`

**Tasks**:

- [ ] T037 [FR6] Add session count display to ContextHealthStatusBar: append `[N/3]` to status text
- [ ] T038 [FR6] ContextHealthStatusBar accepts session count from MultiSessionBridgeWatcher
- [ ] T039 [Setup] Modify `WorkspaceContextProvider.setHookBridgeWatcher()` to accept MultiSessionBridgeWatcher (uses legacy API)
- [ ] T040 [Setup] Update `initializeContextHealthMonitoring()` in extension.ts: create MultiSessionBridgeWatcher instead of HookBridgeWatcher
- [ ] T041 [FR3] Wire `session-limit-reached` event to `vscode.window.showInformationMessage()` notification
- [ ] T042 [Setup] Connect ContextWindowProvider to MultiSessionBridgeWatcher in `registerTreeViews()` or `initializeContextHealthMonitoring()`
- [ ] T043 [US4] Connect MemoryProvider to MemoryManager instance (pass via `setMemoryManager()`)
- [ ] T044 [Setup] Run full test suite, verify all pass

**Verification**:
- [ ] Status bar shows `[N/3]` suffix
- [ ] 4th terminal triggers info notification
- [ ] All existing functionality continues working (backward compat)
- [ ] All tests pass

### Phase 7: Integration Testing & Polish

**Goal**: End-to-end integration testing, edge cases, and cleanup.

**Files Created/Modified**:
- `tests/integration/multi-session-context.test.ts`
- `tests/unit/ui/ContextHealthStatusBar.test.ts` (update)

**Tasks**:

- [ ] T045 [Setup] Write integration test: create 3 per-session bridge files, verify tree shows all 3 sessions
- [ ] T046 [FR3] Write integration test: create 4th bridge file, verify eviction notification and correct session tracking
- [ ] T047 [FR7] Write integration test: legacy `context-bridge.json` appears as session in tree
- [ ] T048 [FR8] Write integration test: stale session removed after grace period, bridge file cleaned up
- [ ] T049 [US2] Verify token breakdown categories sum within 5% of total
- [ ] T050 [Setup] Update existing ContextHealthStatusBar tests for [N/3] format
- [ ] T051 [Setup] Run full test suite including integration tests
- [ ] T052 [Setup] Run linter (`npm run lint`), fix any issues

**Verification**:
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Linting clean
- [ ] No regressions in existing functionality

## File Structure

```
extension/
├── src/
│   ├── autonomous/
│   │   ├── MultiSessionBridgeWatcher.ts       # NEW: Multi-session bridge file watcher
│   │   ├── HookBridgeWatcher.ts               # UNCHANGED (wrapped by MultiSession)
│   │   ├── WorkspaceContextProvider.ts         # MODIFIED: accepts MultiSessionBridgeWatcher
│   │   └── ...
│   ├── ui/
│   │   └── ContextHealthStatusBar.ts          # MODIFIED: [N/3] session count
│   ├── contextWindowProvider.ts               # NEW: Context Window tree view
│   ├── memoryProvider.ts                      # REWRITTEN: categorized memory tree
│   ├── extension.ts                           # MODIFIED: wiring
│   └── ...
├── package.json                               # MODIFIED: view IDs and menus
└── resources/
    └── hook-scripts/
        └── post-tool-use.mjs                  # MODIFIED: per-session bridge files
.specify/
└── scripts/
    └── hooks/
        └── post-tool-use.mjs                  # MODIFIED: per-session bridge files
tests/
├── unit/
│   ├── autonomous/
│   │   └── MultiSessionBridgeWatcher.test.ts  # NEW
│   ├── contextWindowProvider.test.ts          # NEW
│   └── memoryProvider.test.ts                 # NEW or UPDATED
└── integration/
    └── multi-session-context.test.ts          # NEW
```

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing consumers break when HookBridgeWatcher is replaced | High | MultiSessionBridgeWatcher exposes legacy API; existing consumers unchanged |
| Race condition: two hooks write same bridge file | Medium | Per-session files eliminate this — each session writes its own file |
| FileSystemWatcher glob not supported | Low | VSCode RelativePattern with glob is well-documented and tested |
| Memory tree slow with 200+ entries | Low | MemoryManager.load() is async; tree renders incrementally |
| Hook script upgrade not deployed | Medium | Dual-write ensures old extension still works; goferMigrator pushes new hooks |

## Notes

- `ConstitutionProvider` file is NOT deleted — it's still used by the `gofer.showConstitution` command. Only its tree view registration is removed.
- The `MultiSessionBridgeWatcher` is designed as a drop-in replacement that also supports legacy single-session consumers via event forwarding.
- Token breakdown is always an estimate (filesystem-based). The tree clearly labels estimates with "~" prefix and "(est.)" suffix.
- Bridge file naming uses the full sessionId (not truncated) to avoid collisions. The tree view shows a truncated 8-char prefix for display.

---

## Spec Traceability

### User Story Coverage

| Story | Priority | Plan Phase(s) | Components |
|-------|----------|---------------|------------|
| US1: View context health for all sessions | P1 | Phase 2, 4, 6 | MultiSessionBridgeWatcher, ContextWindowProvider, StatusBar |
| US2: Understand context composition | P1 | Phase 4 | ContextWindowProvider (category nodes) |
| US3: Graceful 4th terminal handling | P1 | Phase 2, 6 | MultiSessionBridgeWatcher (cap), extension.ts (notification) |
| US4: Categorized project memory | P2 | Phase 5 | MemoryProvider (rewritten) |
| US5: Redesigned panel layout | P1 | Phase 3 | package.json, extension.ts |
| US6: Session lifecycle visibility | P2 | Phase 2, 4 | MultiSessionBridgeWatcher (staleness), ContextWindowProvider (icons) |

### Requirement Coverage

| Requirement | Plan Phase | Components |
|------------|------------|------------|
| FR1: Per-session bridge files | Phase 1 | post-tool-use.mjs |
| FR2: Multi-session file watching | Phase 2 | MultiSessionBridgeWatcher |
| FR3: Session registry with cap | Phase 2, 6 | MultiSessionBridgeWatcher, notification wiring |
| FR4: Context Window tree view | Phase 4 | ContextWindowProvider |
| FR5: Categorized memory tree | Phase 5 | MemoryProvider |
| FR6: Status bar session count | Phase 6 | ContextHealthStatusBar |
| FR7: Backward compat legacy bridge | Phase 1, 2 | Hook dual-write, MultiSessionBridgeWatcher legacy watch |
| FR8: Session cleanup | Phase 2 | MultiSessionBridgeWatcher staleness/cleanup |

**Coverage: 6/6 user stories, 8/8 functional requirements**
