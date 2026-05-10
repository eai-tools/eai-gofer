---
id: '020-multi-session-context-panel'
title: 'Multi-Session Context Panel'
status: draft
created: '2026-02-10T14:30:00Z'
updated: '2026-02-10T14:30:00Z'
author: Claude
---

# Multi-Session Context Panel

## Overview

When developers run multiple Claude Code CLI terminals in the same VSCode
workspace, Gofer currently monitors only the most recently active session — a
"last writer wins" model. This means users have no visibility into the context
health of their other concurrent sessions, leading to unexpected context
degradation and lost work.

This feature introduces independent context health tracking for up to 3
concurrent Claude Code sessions and redesigns the Gofer sidebar panel to provide
categorized visibility into both context composition and project memory.

**Target Users**: Developers using Claude Code CLI who run 2-3 parallel sessions
(power users). **Primary Value**: Quality improvement — reduce context-related
errors by giving users real-time visibility into each session's context
composition and health.

**Discovery Reference**: See `discovery.md` for full business context.
**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: View Context Health for All Active Sessions (P1)

**As a** developer running multiple Claude Code terminals **I want to** see the
context health of each active session in the Gofer sidebar **So that** I can
identify which sessions are approaching context limits before quality degrades

**Acceptance Criteria**:

- [ ] The Gofer sidebar shows a "Context Window" section listing up to 3 active
      Claude Code sessions
- [ ] Each session node displays: session identifier, model name, context
      utilization percentage, and a color-coded health indicator (green <50%,
      yellow 50-70%, red >70%)
- [ ] Session nodes update within 2 seconds of a hook trigger from any Claude
      Code terminal
- [ ] When no Claude Code sessions are active, the section shows a welcome/empty
      state message

### US2: Understand Context Composition Per Session (P1)

**As a** developer monitoring context health **I want to** expand a session node
to see what's consuming the context window **So that** I can make informed
decisions about when to save and start fresh

**Acceptance Criteria**:

- [ ] Each session node is expandable to reveal categorized token breakdown
- [ ] Categories shown: Spec Artifacts, Memories/Hints, System Files,
      Conversation History, Tool Outputs/Observations, Masked Observations
- [ ] Each category shows its token count (or estimated count, clearly labeled)
- [ ] Token counts sum to match the session's total context usage (within 5%
      tolerance)

### US3: Graceful Handling of 4th Terminal (P1)

**As a** developer who opens more than 3 Claude Code terminals **I want to** be
notified that only 3 sessions are tracked and understand which session was
dropped **So that** I'm not confused about why a terminal doesn't appear in the
panel

**Acceptance Criteria**:

- [ ] When a 4th Claude Code session starts, an informational notification
      appears: "Context tracking limited to 3 sessions. Oldest inactive session
      will stop being tracked."
- [ ] The oldest inactive session is removed from tracking
- [ ] The 3 most recently active sessions continue to be monitored
- [ ] The notification is non-blocking and dismissible

### US4: View Categorized Project Memory (P2)

**As a** developer reviewing project knowledge **I want to** see my Gofer
memories organized by category in the sidebar **So that** I can quickly find
relevant discoveries, patterns, decisions, and learnings

**Acceptance Criteria**:

- [ ] The Memory section shows memories grouped by category (Discovery,
      Patterns, Decisions, Learnings, Journeys, Architecture, Debug)
- [ ] Each category node shows the count of entries
- [ ] Expanding a category reveals individual memory entries with truncated
      content as the label
- [ ] Clicking a memory entry opens a detail view or navigates to the memory
      note file
- [ ] Constitution document is accessible from within the Memory section (as a
      special node or title bar action)

### US5: Redesigned Gofer Panel Layout (P1)

**As a** Gofer user **I want to** see the sidebar organized as Specifications |
Context Window | Memory **So that** the most important real-time information
(context health) is prominently visible alongside my specs and memory

**Acceptance Criteria**:

- [ ] The Gofer sidebar contains exactly 3 sections: Specifications, Context
      Window, Memory
- [ ] The Constitution section is removed as a standalone panel section
- [ ] Constitution remains accessible via the Command Palette and/or a Memory
      section title bar button
- [ ] Specifications section behavior is unchanged
- [ ] The refresh command works for each section independently

### US6: Session Lifecycle Visibility (P2)

**As a** developer working across sessions **I want to** see when sessions
become inactive or stale **So that** I know which terminals are still actively
connected to Claude Code

**Acceptance Criteria**:

- [ ] Active sessions show a distinct visual indicator (e.g., pulse icon)
- [ ] Sessions that become inactive (session ended or stale >5 minutes) are
      shown with a dimmed/grayed appearance
- [ ] Inactive sessions are removed from the tree after a 5-minute grace period
- [ ] The status bar shows a session count indicator (e.g., "[2/3]") alongside
      the existing context percentage

## Functional Requirements

### FR1: Per-Session Bridge File Writing

Each Claude Code session writes its own bridge file using a session-specific
filename, rather than all sessions sharing one file.

- **Validation**: When 2 sessions are active, 2 separate bridge files exist
  simultaneously
- **Integration**: Modifies the hook script
  (`.specify/scripts/hooks/post-tool-use.mjs`) — file-based communication
  between Claude Code hooks and the extension

### FR2: Multi-Session File Watching

The extension watches for multiple per-session bridge files and maintains a
registry of up to 3 active sessions.

- **Validation**: File changes in any per-session bridge file trigger the
  watcher within 2 seconds
- **Integration**: New watcher component that replaces or wraps the existing
  single-session HookBridgeWatcher

### FR3: Session Registry with Cap Enforcement

The extension maintains an ordered registry of tracked sessions, capped at 3.
When a 4th session appears, the oldest inactive session is evicted with a
notification.

- **Validation**: Creating a 4th session triggers eviction of the oldest
  inactive and fires a notification
- **Integration**: Cap enforcement happens in the extension, not the hook script
  (hooks have no cross-session awareness)

### FR4: Context Window Tree View

A new tree view section in the Gofer sidebar displays session nodes with
expandable category breakdowns.

- **Validation**: Tree shows correct session count, each expandable with 6
  category nodes showing token counts
- **Integration**: Registered as a TreeDataProvider following the existing
  pattern in `extension.ts:registerTreeViews()`

### FR5: Categorized Memory Tree View

The Memory section is redesigned to show actual memory entries from the JSONL
store grouped by category, replacing the current markdown file listing.

- **Validation**: Memory categories match entries from MemoryManager; clicking
  an entry opens its detail
- **Integration**: Reads from MemoryManager's JSONL storage and groups by
  `memory.category` field

### FR6: Status Bar Session Count

The existing context health status bar gains a session count indicator showing
how many sessions are currently tracked.

- **Validation**: Status bar shows `[N/3]` suffix reflecting actual tracked
  session count
- **Integration**: Minimal modification to existing ContextHealthStatusBar
  component

### FR7: Backward Compatibility with Legacy Bridge

The extension continues to read the old single `context-bridge.json` file if
present, treating it as a session until the hook script is updated.

- **Validation**: A workspace with the old single bridge file still shows
  context health correctly
- **Integration**: Migration handled by the existing goferMigrator hook
  deployment path

### FR8: Session Cleanup

Per-session bridge files are cleaned up when sessions end or become stale,
preventing orphaned files from accumulating.

- **Validation**: After a session ends and the grace period expires, its bridge
  file is deleted
- **Integration**: Cleanup logic in the multi-session watcher, triggered by
  staleness detection

## Non-Functional Requirements

### Performance

- Tree view refresh completes within 100ms for up to 3 sessions (bridge files
  are <1KB each)
- File watching uses VSCode's native FileSystemWatcher (no polling loops for
  bridge detection)
- Memory tree loading from JSONL completes within 500ms for up to 200 memory
  entries

### Reliability

- Atomic file writes (tmp + rename) for bridge files prevent corruption from
  concurrent hook executions
- Watcher gracefully handles mid-write reads (corrupted JSON silently ignored,
  retry on next change)
- Session eviction is deterministic: always evicts the oldest by `lastActivity`
  timestamp

### Compatibility

- Works with existing Claude Code CLI hook payload (no changes to Claude Code
  itself)
- Backward compatible with single `context-bridge.json` from older hook scripts
- TreeDataProvider implementations follow existing codebase patterns
  (EventEmitter, Disposable)

## Success Criteria

| Metric                             | Target                                       | Measurement                                             |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| Sessions tracked simultaneously    | Up to 3                                      | Count of active session nodes in tree view              |
| Context breakdown accuracy         | Within 5% of real usage                      | Compare tree category totals to bridge data totals      |
| Panel responsiveness               | <2 seconds from hook trigger to tree refresh | Time delta between bridge file write and tree update    |
| Memory categorization completeness | All memory categories represented            | Verify all non-empty categories appear in tree          |
| 4th session notification           | Always shown                                 | Integration test: open 4th session, verify notification |
| Backward compatibility             | Legacy bridge still works                    | Test with single context-bridge.json present            |

## Assumptions

- Claude Code CLI continues to provide `session_id` in hook payloads (confirmed
  in current codebase)
- Hook scripts deploy via `goferMigrator.ts` `installHooksConfig()`, so updates
  propagate on extension upgrade
- VSCode FileSystemWatcher supports glob patterns for watching multiple files in
  the same directory
- MemoryManager exposes a `.load()` method that returns all memories with
  category information
- Maximum 3 concurrent sessions covers the vast majority of real-world usage
  (power users rarely exceed this)
- Token breakdown categories are estimated by the extension (filesystem-based),
  not computed by the hook

## Dependencies

- `HookBridgeWatcher` (`extension/src/autonomous/HookBridgeWatcher.ts`) —
  wrapping/replacing for multi-session
- `WorkspaceContextProvider`
  (`extension/src/autonomous/WorkspaceContextProvider.ts`) — "focused session"
  concept for backward compat
- `ContextHealthStatusBar` (`extension/src/ui/ContextHealthStatusBar.ts`) —
  session count indicator addition
- `MemoryManager` (`extension/src/autonomous/MemoryManager.ts`) — data source
  for memory tree
- `goferMigrator` (`extension/src/goferMigrator.ts`) — deploys updated hook
  scripts
- `post-tool-use.mjs` hook script — foundation change to per-session bridge
  files
- VSCode TreeView API — `TreeDataProvider`, `EventEmitter`, `FileSystemWatcher`

## Out of Scope

- Tracking more than 3 sessions (hard cap at 3)
- Real-time token-by-token streaming of context usage (bridge updates happen per
  tool use)
- Per-session memory (memories remain shared across all sessions in the
  workspace)
- Terminal output capture or parsing (sessions are identified by bridge files,
  not terminal content)
- Changes to Claude Code CLI itself (only Gofer extension and hook scripts are
  modified)
- Cloud/remote session tracking (only local VSCode terminals)
- Automatic session management (e.g., auto-saving sessions approaching critical)

## Glossary

| Term           | Definition                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Bridge File    | JSON file written by Claude Code hooks containing session context data                          |
| Session        | A single Claude Code CLI instance running in a VSCode terminal                                  |
| Context Window | The total token capacity of a Claude model conversation                                         |
| Context Health | A status (healthy/warning/critical) based on context utilization percentage                     |
| Staleness      | When a session's bridge file hasn't been updated for >5 minutes                                 |
| Hook           | A Claude Code extension point that runs scripts on events (PostToolUse, UserPromptSubmit, Stop) |

## Research Traceability

| Research Finding                                               | Spec Section     | Reference                          |
| -------------------------------------------------------------- | ---------------- | ---------------------------------- |
| Integration: Hook Script → Per-Session Bridge Files            | FR1              | Per-session bridge file writing    |
| Integration: MultiSessionBridgeWatcher → ContextWindowProvider | FR2, FR4         | Multi-session watching + tree view |
| Integration: MultiSessionBridgeWatcher → Existing Components   | FR6, FR7         | Status bar + backward compat       |
| Integration: MemoryManager → MemoryTreeProvider                | FR5              | Categorized memory tree            |
| Integration: package.json View Registration                    | US5              | Panel layout redesign              |
| Integration: Backward Compatibility                            | FR7              | Legacy bridge support              |
| Constraint: Hook deployment                                    | Assumptions      | goferMigrator deploys hooks        |
| Constraint: Backward compatibility                             | FR7              | Legacy bridge handling             |
| Constraint: Session cleanup                                    | FR8              | Bridge file cleanup                |
| Constraint: File system performance                            | NFR Performance  | FileSystemWatcher, no polling      |
| Constraint: Memory tree refresh                                | FR5              | MemoryManager events               |
| Constraint: Token breakdown granularity                        | US2, Assumptions | Extension estimates categories     |
| Tech Decision: Per-session bridge files                        | FR1              | Avoids race conditions             |
| Tech Decision: Session cap in extension                        | FR3              | Hooks lack cross-session awareness |
| Tech Decision: Status bar shows active session                 | FR6              | Minimal refactoring                |
| Tech Decision: Memory from JSONL                               | FR5              | Real memories, not markdown files  |
| Tech Decision: Constitution under Memory                       | US5, US4         | 3-section panel layout             |
| Brownfield: Hook Architecture (file-based)                     | FR1, Assumptions | File-based communication           |
| Brownfield: Single Bridge File migration                       | FR7              | Backward compat                    |
| Brownfield: VSCode TreeView API refresh-based                  | FR4, NFR         | Explicit fire() calls              |
| Brownfield: Status Bar Space                                   | FR6              | Session count indicator only       |
