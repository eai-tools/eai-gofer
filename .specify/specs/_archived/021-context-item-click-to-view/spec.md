---
id: 021-context-item-click-to-view
title: Context Item Click-to-View
status: draft
created: '2026-02-11'
updated: '2026-02-11'
author: Claude
---

# Context Item Click-to-View

## Overview

The Context Window panel in the Gofer sidebar displays 6 categories of context
data (Spec Artifacts, Memories/Hints, System Files, Conversation History, Tool
Outputs, Masked Observations) with estimated token counts. Currently these items
are display-only — users see token numbers but cannot inspect the actual content
behind them.

This feature makes every category item clickable, opening a rich webview panel
that shows the formatted content of that category. Users gain visibility into
what is consuming their context window, enabling informed decisions about
context management.

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Scenarios & Testing

### US1: Click Category to View Content (P1)

As a developer using Claude Code, I want to click on any context category in the
sidebar to see what content it contains, so that I can understand what is
consuming my context window.

**Why this priority**: This is the core feature — without clickable items, there
is no feature at all.

**Independent Test**: Click any category item (e.g., "Spec Artifacts") under an
active session in the Context Window panel. A webview panel opens showing the
formatted content for that category.

**Acceptance Criteria**:

- [ ] AC1: Clicking a category item opens a webview panel displaying the content
      for that category
- [ ] AC2: The panel title reflects the category name and session identity
- [ ] AC3: Content is displayed as formatted HTML (not raw JSON or token counts)
- [ ] AC4: All 6 categories produce meaningful, readable content in the panel
- [ ] AC5: If the panel is already open, clicking a different category updates
      the content in the same panel (no tab proliferation)

---

### US2: View Spec Artifacts Content (P1)

As a developer, I want to see what spec artifacts are loaded in the context
window, so I can verify the right specifications are being used.

**Why this priority**: Spec artifacts are the most actionable category — knowing
which spec files are loaded helps users verify Claude is working with the
correct context.

**Independent Test**: Click "Spec Artifacts" and verify spec files from
`.specify/specs/` are listed with file names, sizes, and content previews.

**Acceptance Criteria**:

- [ ] AC1: Panel lists all spec directories under `.specify/specs/` with their
      files
- [ ] AC2: Each spec file shows: file name, file size, and a content preview
      (first ~500 chars)
- [ ] AC3: Markdown content is rendered as formatted text, not raw markdown

---

### US3: View Memories/Hints Content (P2)

As a developer, I want to see what memories and hints are loaded, so I can
understand what learned context Claude has access to.

**Why this priority**: Memories directly influence Claude's behavior — seeing
them helps users understand and debug AI responses.

**Independent Test**: Click "Memories/Hints" and verify memory entries are
listed with content, categories, and tags.

**Acceptance Criteria**:

- [ ] AC1: Panel displays memory entries grouped by category
- [ ] AC2: Each memory shows its content, category, tags, and priority
- [ ] AC3: If no memories exist, shows a helpful empty state message

---

### US4: View System Files Content (P2)

As a developer, I want to see what system files (CLAUDE.md, AGENTS.md,
constitution) are loaded in context, so I can verify my project instructions are
being picked up.

**Why this priority**: System files define behavior rules — users need to verify
they're loaded correctly.

**Independent Test**: Click "System Files" and verify CLAUDE.md, AGENTS.md, and
constitution.md are listed with content previews.

**Acceptance Criteria**:

- [ ] AC1: Panel lists known system files (CLAUDE.md, AGENTS.md,
      constitution.md) that exist on disk
- [ ] AC2: Each file shows its name, size, and a content preview
- [ ] AC3: Files that don't exist on disk are not shown (no error for missing
      files)

---

### US5: View Tool Outputs Content (P2)

As a developer, I want to see recent tool outputs captured during the session,
so I can review what tools Claude has been using and their results.

**Why this priority**: Tool outputs are the second-largest context consumer
(~22%) and session-specific.

**Independent Test**: Click "Tool Outputs" and verify recent observation files
are displayed with tool name, input summary, and formatted response.

**Acceptance Criteria**:

- [ ] AC1: Panel shows recent observation files from
      `.specify/hooks/observations/`
- [ ] AC2: Each observation shows: tool name, timestamp, input summary, and
      response preview
- [ ] AC3: Observations are sorted by timestamp (most recent first)
- [ ] AC4: Long responses are truncated with a "truncated" indicator

---

### US6: View Conversation History Summary (P3)

As a developer, I want to see a summary of the conversation history context
usage, so I can understand the largest context consumer.

**Why this priority**: Conversation history is ~40% of context but cannot be
fully displayed (too large, privacy-sensitive). A summary is valuable.

**Independent Test**: Click "Conversation History" and verify a token breakdown
summary is shown with session metadata.

**Acceptance Criteria**:

- [ ] AC1: Panel shows session metadata (model, session ID, display name)
- [ ] AC2: Panel shows token breakdown (input, cache read, cache creation,
      output)
- [ ] AC3: Panel shows utilization percentage and visual indicator
- [ ] AC4: Panel explains that full conversation content is not available for
      inspection

---

### US7: View Masked Observations (P3)

As a developer, I want to see which observations have been masked, so I can
understand what context has been compressed.

**Why this priority**: Masked observations are the smallest category (~5%) but
show the observation masking system's activity.

**Independent Test**: Click "Masked Observations" and verify older/masked
observation entries are displayed.

**Acceptance Criteria**:

- [ ] AC1: Panel shows observation files that are older than the masking
      threshold
- [ ] AC2: Each entry shows original tool name, timestamp, and truncated content
- [ ] AC3: If no masked observations exist, shows explanatory empty state

---

### Edge Cases

- What happens when no sessions are active? Category items are not shown
  (existing behavior; viewsWelcome message displayed)
- What happens when clicked category has no content (e.g., no spec files)? Panel
  shows a helpful empty state with explanation
- What happens when observation files are very large? Content is truncated (hook
  already caps at 10KB)
- What happens when files are deleted between click and panel render? Graceful
  error handling, show "file not found" message
- What happens when user clicks rapidly between categories? Panel updates to
  latest click (singleton pattern handles this)

## Requirements

### Functional Requirements

- **FR-001**: System MUST add click handlers to all 6 context category tree
  items
- **FR-002**: System MUST open a singleton webview panel when a category item is
  clicked
- **FR-003**: System MUST display formatted HTML content appropriate to the
  clicked category
- **FR-004**: System MUST update the existing panel content (not create new
  panels) on subsequent clicks
- **FR-005**: System MUST use VSCode theme CSS variables for dark/light theme
  compatibility
- **FR-006**: System MUST HTML-escape all file content to prevent XSS in the
  webview
- **FR-007**: System MUST register the click command in
  `registerGlobalCommands()` (not async registration) so it is available
  immediately when tree items render
- **FR-008**: System MUST pass both `sessionId` and `categoryName` to the
  command handler for context-aware content loading
- **FR-009**: System MUST handle missing files and empty directories gracefully
  with informative empty states

### Key Entities

- **ContextContentPanel**: Singleton webview panel that displays category
  content. Follows MemoryPanel pattern.
- **CategoryContentRenderer**: Logic for resolving and formatting content per
  category type (6 renderers).
- **Observation**: JSON file in `.specify/hooks/observations/` containing tool
  name, input, and response data.

## Non-Functional Requirements

### Performance

- Panel HTML generation should complete within 500ms for any category
- File reads should be bounded (no reading files larger than 50KB; truncate with
  indicator)

### Security

- All content displayed in webview MUST be HTML-escaped to prevent injection
- Webview MUST NOT have access to Node.js APIs (enableScripts: true but
  sandboxed)

### Compatibility

- Must work with existing ContextWindowProvider tree structure without breaking
  the tree view
- Must coexist with existing MemoryPanel without conflicts
- Must follow the established command registration pattern (global commands for
  tree items)

## Success Criteria

| Metric                     | Target       | Measurement                                             |
| -------------------------- | ------------ | ------------------------------------------------------- |
| All 6 categories clickable | 100%         | Each category opens panel with relevant content         |
| Panel responds to click    | <500ms       | Time from click to content display                      |
| Theme compatibility        | Both themes  | Panel renders correctly in dark and light VSCode themes |
| No tab proliferation       | Single panel | Clicking different categories reuses the same panel     |
| Empty states               | All covered  | Every category handles missing/empty data gracefully    |

## Assumptions

- Bridge data (session metadata) is available when category items are visible in
  the tree
- Spec files, memory files, and system files are in their expected workspace
  locations
- Observation files follow the existing JSON format written by
  `post-tool-use.mjs`
- The EnrichedContextBridge file (`enriched-context.json`) may not exist — the
  feature does not depend on it
- Session-scoped content (Tool Outputs, Conversation History) uses the sessionId
  from the parent tree item; workspace-global content (Specs, Memories, System
  Files) is the same regardless of session

## Dependencies

- `extension/src/contextWindowProvider.ts` — ContextWindowProvider and
  ContextWindowItem classes
- `extension/src/ui/MemoryPanel.ts` — Singleton webview pattern to follow
- `extension/src/autonomous/MultiSessionBridgeWatcher.ts` — Session data access
  via getSessions()
- `extension/src/autonomous/HookBridgeWatcher.ts` — BridgeData interface
- `extension/src/extension.ts` — registerGlobalCommands() for command
  registration
- `extension/package.json` — Command declaration in contributes.commands
- `.specify/hooks/observations/` — Observation files written by post-tool-use
  hook

## Out of Scope

- Editing or modifying context content from the panel
- Full conversation transcript display (too large, privacy concerns)
- Real-time auto-refresh of panel content on bridge data changes
- Context compression or masking controls from the panel
- Session-level click handler (only category-level clicks are in scope)
- Changes to the hook script or bridge data format

## Glossary

| Term            | Definition                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| Context Window  | The sidebar panel showing Claude Code session context health                |
| Category Item   | A tree node representing one of the 6 context types (Spec Artifacts, etc.)  |
| Bridge Data     | JSON metadata written by the hook script with token counts and session info |
| Observation     | A captured tool output stored as a JSON file by the post-tool-use hook      |
| Singleton Panel | A webview panel where only one instance exists; subsequent opens reuse it   |

## Research Traceability

| Research Finding                                               | Spec Section         | Reference                                               |
| -------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| Integration Point: contextWindowProvider.ts getCategoryItems() | FR-001, FR-008       | Add .command to category items                          |
| Integration Point: extension.ts registerGlobalCommands()       | FR-007               | Command must be global per MEMORY.md learning           |
| Integration Point: package.json contributes.commands           | Dependencies         | Declare new command                                     |
| Integration Point: MultiSessionBridgeWatcher.getSessions()     | FR-008               | Session data for content resolution                     |
| Constraint: Bridge data has only metadata                      | Assumptions          | Cannot use bridge for content; read from disk           |
| Constraint: EnrichedContextBridge may not exist                | Assumptions          | Do not depend on enriched-context.json                  |
| Constraint: Session-scoped vs workspace-global                 | Assumptions          | Only Tool Outputs and Conversation are session-specific |
| Constraint: HTML escaping required                             | FR-006, Security NFR | Prevent XSS in webview                                  |
| Constraint: Observation file accumulation                      | US5 AC4, Edge Cases  | Show only recent; respect 10KB cap                      |
| Tech Decision: Singleton panel                                 | FR-002, FR-004       | Follow MemoryPanel pattern                              |
| Tech Decision: Read from disk per category                     | US2-US7              | Direct file reads, not bridge data                      |
| Tech Decision: Conversation summary only                       | US6                  | Token breakdown, not full transcript                    |
| Pattern: Tree item .command property                           | FR-001               | memoryProvider.ts pattern                               |
| Pattern: Lazy import in command handler                        | FR-007               | extension.ts pattern                                    |
| Pattern: VSCode CSS variables                                  | FR-005               | MemoryPanel.ts/webviewHelpers.ts pattern                |
