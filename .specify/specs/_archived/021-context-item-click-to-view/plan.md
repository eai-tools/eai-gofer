---
feature: Context Item Click-to-View
spec: spec.md
research: research.md
status: ready
created: '2026-02-11'
---

# Implementation Plan: Context Item Click-to-View

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest (unit tests)
- **Build**: Webpack bundling (existing)

### Architecture

```text
User clicks category item in Context Window tree
    │
    ▼
ContextWindowProvider (getCategoryItems)
    │ item.command = { command: 'gofer.showContextCategoryContent', arguments: [sessionId, categoryName] }
    │
    ▼
extension.ts (registerGlobalCommands)
    │ gofer.showContextCategoryContent handler
    │ lazy import → ContextContentPanel
    │
    ▼
ContextContentPanel.createOrShow(extensionUri, workspacePath)
    │ Singleton webview panel
    │ .showCategory(sessionId, categoryName, bridgeData)
    │
    ▼
Category-specific content resolution:
    ├─ Spec Artifacts    → reads .specify/specs/*/ files from disk
    ├─ Memories/Hints    → reads .specify/memory/*.jsonl
    ├─ System Files      → reads CLAUDE.md, AGENTS.md, constitution.md
    ├─ Conversation Hist → uses BridgeData token breakdown
    ├─ Tool Outputs      → reads .specify/hooks/observations/*.json
    └─ Masked Observ.    → reads older observation files
    │
    ▼
HTML rendering with VSCode CSS variables → panel.webview.html
```

### Integration Points

| Component             | File                                      | Integration Type                                            |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| ContextWindowProvider | `extension/src/contextWindowProvider.ts`  | Modify: add .command to category items, propagate sessionId |
| Extension commands    | `extension/src/extension.ts`              | Modify: add command in registerGlobalCommands()             |
| Package manifest      | `extension/package.json`                  | Modify: add command declaration                             |
| ContextContentPanel   | `extension/src/ui/ContextContentPanel.ts` | NEW: singleton webview panel                                |

### Key Dependencies

- `vscode.WebviewPanel` API for panel creation
- `fs.promises` for async file reading
- `BridgeData` interface from `HookBridgeWatcher.ts`
- `MultiSessionBridgeWatcher.getSessions()` for session data access

## Constitution Check

Constitution exists at `.specify/memory/constitution.md`. Alignment:

- [x] Follows existing patterns (MemoryPanel singleton, tree item .command)
- [x] Uses TypeScript strict types
- [x] HTML-escapes all content (security principle)
- [x] Registers commands globally (initialization ordering principle)

## Implementation Phases

### Phase 1: Package Manifest & Command Declaration

**Goal**: Declare the new command so VSCode knows about it

**Tasks**:

- [ ] T001: Add `gofer.showContextCategoryContent` to `extension/package.json`
      contributes.commands

**Verification**:

- [ ] Extension compiles without errors
- [ ] Command appears in package.json commands array

### Phase 2: Tree Item Click Wiring

**Goal**: Make category items clickable by adding .command property

**Tasks**:

- [ ] T002: Modify `getCategoryItems()` in `contextWindowProvider.ts` to pass
      `sessionId` parameter and set `.command` on each category item
- [ ] T003: Update `ContextWindowItem` if needed to ensure `sessionId` is
      available on category-level items

**Verification**:

- [ ] Category items in tree have `.command` set
- [ ] `sessionId` propagated from session parent to category children
- [ ] Existing tree rendering unchanged

### Phase 3: ContextContentPanel Core (Singleton Webview)

**Goal**: Create the webview panel that displays content

**Tasks**:

- [ ] T004: Create `extension/src/ui/ContextContentPanel.ts` with singleton
      `createOrShow()` pattern following MemoryPanel
- [ ] T005: Implement `showCategory(sessionId, categoryName, bridgeData)` method
      that updates panel content
- [ ] T006: Implement shared CSS styles using VSCode theme variables
- [ ] T007: Implement `escapeHtml()` utility and shared HTML shell (header,
      breadcrumb, styles)

**Verification**:

- [ ] Panel opens on first call, reuses on subsequent calls
- [ ] Panel title updates to reflect category name
- [ ] Panel disposes cleanly

### Phase 4: Category Content Renderers

**Goal**: Implement content resolution and HTML rendering for each of the 6
categories

**Tasks**:

- [ ] T008: [US2] Implement Spec Artifacts renderer — reads `.specify/specs/*/`
      directories, lists files with size and content preview (first ~500 chars
      of markdown rendered as text)
- [ ] T009: [US3] Implement Memories/Hints renderer — reads
      `.specify/memory/*.jsonl`, groups by category, renders each memory with
      content/tags/priority
- [ ] T010: [US4] Implement System Files renderer — reads CLAUDE.md, AGENTS.md,
      `.specify/memory/constitution.md` from disk, shows name/size/preview
- [ ] T011: [US6] Implement Conversation History renderer — uses BridgeData to
      show session metadata, token breakdown with visual bar, utilization %, and
      explanatory note
- [ ] T012: [US5] Implement Tool Outputs renderer — reads
      `.specify/hooks/observations/*.json`, sorts by timestamp desc, shows tool
      name/input/response with truncation indicator
- [ ] T013: [US7] Implement Masked Observations renderer — reads observation
      files older than 5 minutes, shows as faded/masked entries with tool name
      and timestamp

**Verification**:

- [ ] Each category renders appropriate formatted HTML
- [ ] Empty states show helpful messages
- [ ] Content is HTML-escaped
- [ ] File size limits respected (50KB cap with truncation)

### Phase 5: Command Registration & Wiring

**Goal**: Connect the click handler to the panel

**Tasks**:

- [ ] T014: Register `gofer.showContextCategoryContent` in
      `registerGlobalCommands()` in `extension.ts` with lazy import of
      ContextContentPanel
- [ ] T015: Pass `workspacePath` and `multiSessionWatcher` to the panel for
      session data access

**Verification**:

- [ ] Clicking any category item opens/updates the panel
- [ ] Panel shows correct content for the clicked category
- [ ] Works for multiple sessions (session-specific content is session-scoped)

### Phase 6: Unit Tests

**Goal**: Verify panel behavior and content rendering

**Tasks**:

- [ ] T016: Write unit tests for ContextContentPanel (singleton behavior,
      showCategory updates, dispose cleanup)
- [ ] T017: Write unit tests for each category renderer (content resolution,
      HTML escaping, empty states, file truncation)
- [ ] T018: Update existing contextWindowProvider tests to verify .command is
      set on category items

**Verification**:

- [ ] All tests pass
- [ ] Linting passes
- [ ] No regressions in existing tests

## File Structure

```text
extension/src/
  ui/
    ContextContentPanel.ts    ← NEW: Singleton webview panel
    MemoryPanel.ts            (existing, pattern reference)
  contextWindowProvider.ts    ← MODIFIED: add .command to category items
  extension.ts                ← MODIFIED: register new command
extension/package.json        ← MODIFIED: declare new command
tests/unit/
  contextContentPanel.test.ts ← NEW: unit tests
  contextWindowProvider.test.ts ← MODIFIED: test .command on items
```

## Risk Assessment

| Risk                                          | Impact | Mitigation                                                    |
| --------------------------------------------- | ------ | ------------------------------------------------------------- |
| Large observation files slow panel rendering  | Medium | Cap file reads at 50KB, show truncation indicator             |
| Missing files between tree render and click   | Low    | Graceful error handling with informative message              |
| Command not registered when tree item clicked | High   | Register in registerGlobalCommands() (learned from MEMORY.md) |
| HTML injection via file content               | High   | escapeHtml() on ALL content before rendering                  |

## Notes

- The panel does NOT depend on `enriched-context.json` — it reads directly from
  disk per category
- Conversation History shows a token summary only (full transcript is out of
  scope)
- Tool Outputs and Masked Observations share the same source directory but are
  distinguished by timestamp age (5-minute staleness threshold from
  HookBridgeWatcher)
- The `sessionId` must be propagated from session-level items to their category
  children in `getCategoryItems()`

## Spec Traceability

### User Story Coverage

| Story | Priority | Plan Phase(s)  | Components                                               |
| ----- | -------- | -------------- | -------------------------------------------------------- |
| US1   | P1       | Phase 2, 3, 5  | ContextWindowProvider, ContextContentPanel, extension.ts |
| US2   | P1       | Phase 4 (T008) | Spec Artifacts renderer                                  |
| US3   | P2       | Phase 4 (T009) | Memories/Hints renderer                                  |
| US4   | P2       | Phase 4 (T010) | System Files renderer                                    |
| US5   | P2       | Phase 4 (T012) | Tool Outputs renderer                                    |
| US6   | P3       | Phase 4 (T011) | Conversation History renderer                            |
| US7   | P3       | Phase 4 (T013) | Masked Observations renderer                             |

### Requirement Coverage

| Requirement | Status  | Plan Reference                                         |
| ----------- | ------- | ------------------------------------------------------ |
| FR-001      | COVERED | Phase 2, T002                                          |
| FR-002      | COVERED | Phase 3, T004                                          |
| FR-003      | COVERED | Phase 4, T008-T013                                     |
| FR-004      | COVERED | Phase 3, T005                                          |
| FR-005      | COVERED | Phase 3, T006                                          |
| FR-006      | COVERED | Phase 3, T007                                          |
| FR-007      | COVERED | Phase 5, T014                                          |
| FR-008      | COVERED | Phase 2, T002; Phase 5, T014                           |
| FR-009      | COVERED | Phase 4, T008-T013 (each renderer handles empty state) |

### Acceptance Criteria Mapping

| US  | AC    | Plan Component     | Approach                                            |
| --- | ----- | ------------------ | --------------------------------------------------- |
| US1 | AC1   | T002 + T004 + T014 | .command on item triggers panel open                |
| US1 | AC2   | T005               | panel.title updated in showCategory()               |
| US1 | AC3   | T006 + T008-T013   | HTML rendering with CSS variables                   |
| US1 | AC4   | T008-T013          | Dedicated renderer per category                     |
| US1 | AC5   | T004               | Singleton pattern — reveal existing panel           |
| US2 | AC1-3 | T008               | Spec Artifacts renderer reads dirs                  |
| US3 | AC1-3 | T009               | Memories renderer reads JSONL, groups by category   |
| US4 | AC1-3 | T010               | System Files renderer checks existence first        |
| US5 | AC1-4 | T012               | Tool Outputs renderer sorts by timestamp, truncates |
| US6 | AC1-4 | T011               | Conversation renderer uses BridgeData               |
| US7 | AC1-3 | T013               | Masked Observations renderer filters by age         |

Coverage: **100%** of user stories, **100%** of functional requirements,
**100%** of acceptance criteria
