---
id: 001-memory-panel-filter
title: Memory Panel Usability Fix
status: draft
created: 2026-03-20
updated: 2026-03-20
author: Claude
feature_branch: 001-memory-panel-filter
---

# Feature Specification: Memory Panel Usability Fix

**Feature Branch**: `001-memory-panel-filter` **Created**: 2026-03-20
**Status**: Draft

## Overview

The Memory Panel feature provides users with a UI to view, search, and manage
their learned knowledge within the Gofer extension. Currently, the panel is
unusable because it displays all 533+ entries from the underlying storage
without distinction, flooding users with system telemetry logs (`auto_decision`,
`discovery`) that bury actual user-created knowledge.

This feature fixes the Memory Panel by filtering the display to show only
user-created memories by default, while preserving access to system telemetry
through an opt-in toggle. The fix leverages existing infrastructure (the `#auto`
tag that already distinguishes system from user memories) and requires only
UI-level changes, making it low-risk and backward compatible.

**Why this matters**: Users rely on the Memory Panel for knowledge management -
finding coding patterns, architectural decisions, and gotchas they've learned.
When flooded with 368 budget warnings and 151 research completion logs, the
panel becomes unusable for its intended purpose. This fix restores usability
immediately while maintaining access to system data for power users who need it.

## User Scenarios & Testing

### User Story 1 - View User Memories Only (Priority: P1)

As a developer using Gofer, I want to see only my explicitly saved learnings and
knowledge when I open the Memory Panel, so that I can quickly find the patterns,
decisions, and gotchas I've intentionally captured without scrolling through
hundreds of system logs.

**Why this priority**: This is the core usability fix. Without it, the Memory
Panel is unusable for its primary purpose of knowledge management. This single
change delivers immediate value to all users.

**Independent Test**: Can be fully tested by creating one user memory via
"Gofer: Remember" command, opening the Memory Panel, and verifying that (a) the
user memory appears and (b) system telemetry logs do not appear by default.

**Acceptance Scenarios**:

1. **Given** I have created 3 user memories via "Gofer: Remember" and the system
   has generated 200 auto_decision logs, **When** I open the Memory Panel with
   "Gofer: View Memories", **Then** I see only my 3 user memories in the results
   list
2. **Given** the Memory Panel is open with system memories hidden (default
   state), **When** I use the category filter dropdown, **Then** I see only
   user-created categories (e.g., "pattern", "decision") and NOT system
   categories ("auto_decision", "discovery")
3. **Given** the Memory Panel is open with system memories hidden, **When** I
   use the tag filter dropdown, **Then** I see only user-applied tags and NOT
   the "#auto" tag
4. **Given** I have zero user memories but 500 system logs exist, **When** I
   open the Memory Panel, **Then** I see an empty state message "No user
   memories yet" with guidance to create memories via "Gofer: Remember" command
5. **Given** I search for a keyword that matches both user and system memories,
   **When** system memories are hidden (default), **Then** search results
   include only user memories containing that keyword

---

### User Story 2 - Access System Telemetry (Priority: P2)

As a power user debugging Gofer's autonomous behavior, I want to toggle on "Show
system memories" to view system-generated telemetry (budget warnings, discovery
logs, scope violations), so that I can audit what the extension has learned and
decided automatically.

**Why this priority**: This ensures power users and developers aren't locked out
of system data. It's lower priority because most users don't need this access,
but it's critical for debugging and transparency.

**Independent Test**: Can be fully tested by enabling the "Show system memories"
toggle and verifying that system logs appear in the panel and are searchable.

**Acceptance Scenarios**:

1. **Given** the Memory Panel is open with system memories hidden (default),
   **When** I check the "Show system memories" toggle, **Then** the panel
   refreshes and displays both user memories AND system telemetry logs
2. **Given** system memories are now visible, **When** I use the category filter
   dropdown, **Then** I see both user categories ("pattern") and system
   categories ("auto_decision", "discovery")
3. **Given** system memories are visible, **When** I search for
   "budget_warning", **Then** results include system memories tagged with that
   keyword
4. **Given** system memories are visible and I filter by category
   "auto_decision", **When** I view the results, **Then** I see only
   auto_decision system logs with metadata (timestamp, tags, category)
5. **Given** system memories are visible, **When** I uncheck the "Show system
   memories" toggle, **Then** the panel refreshes and returns to showing only
   user memories

---

### User Story 3 - Persistent Filter Preference (Priority: P3)

As a developer who occasionally needs system telemetry access, I want my "Show
system memories" toggle state to persist across Memory Panel sessions, so that I
don't have to re-enable it every time I reopen the panel.

**Why this priority**: This is a quality-of-life improvement for users who
regularly work with system memories. It's lowest priority because the core
functionality works without persistence - users just have to toggle each
session.

**Independent Test**: Can be fully tested by enabling the toggle, closing the
panel, reopening it, and verifying the toggle state is preserved.

**Acceptance Scenarios**:

1. **Given** I have enabled "Show system memories" in the Memory Panel, **When**
   I close the panel and reopen it in the same VSCode session, **Then** the
   toggle remains checked and system memories are visible
2. **Given** I have disabled "Show system memories", **When** I close the panel
   and reopen it, **Then** the toggle remains unchecked and only user memories
   are visible
3. **Given** I close VSCode with "Show system memories" enabled, **When** I
   reopen VSCode and open the Memory Panel, **Then** the toggle state is
   restored to enabled (requires persisting to workspace state)

---

### Edge Cases

- **What happens when all memories are system-generated and no user memories
  exist?**
  - Display empty state: "No user memories yet. Create your first memory with
    'Gofer: Remember' command. System memories are hidden - toggle 'Show system
    memories' to see them."

- **What happens when a user memory is manually tagged with "#auto"?**
  - The memory will be filtered out when system memories are hidden. This is
    acceptable edge case behavior - users shouldn't manually add system tags.

- **How does the system handle searching with both user and system categories
  selected when system memories are hidden?**
  - System categories are not shown in the dropdown when system memories are
    hidden, so this scenario cannot occur in normal usage. If a search query is
    manually constructed with a system category, it would return zero results
    (expected behavior).

- **What happens when network or file system errors prevent loading memories?**
  - Existing error handling in MemoryManager.load() applies - panel shows error
    message. Filter state doesn't affect error handling.

- **How does the filter interact with global vs local scope filter?**
  - Scope filter and system memory filter are independent and both apply. User
    can filter to "local user memories" or "global system memories" by combining
    both controls.

## Requirements

### Functional Requirements

- **FR-001**: The Memory Panel MUST display only user-created memories by
  default when opened via "Gofer: View Memories" command
  - **Validation**: Count of displayed memories excludes all entries tagged with
    "#auto"
  - **Integration**: MemoryPanel.getHtmlContent() filters memories before
    rendering

- **FR-002**: The Memory Panel MUST provide a "Show system memories" toggle
  control visible in the panel toolbar
  - **Validation**: Toggle control is rendered and visible without requiring
    scroll
  - **Integration**: HTML template in MemoryPanel.ts includes checkbox input

- **FR-003**: Users MUST be able to toggle between "user memories only" and "all
  memories" modes by clicking the "Show system memories" checkbox
  - **Validation**: Toggle change triggers search refresh and updates displayed
    results
  - **Integration**: Webview message handler receives toggle state changes

- **FR-004**: The category filter dropdown MUST show only categories present in
  the currently visible memory set (respecting the system memory filter state)
  - **Validation**: When system memories hidden, dropdown excludes
    "auto_decision" and "discovery" categories
  - **Integration**: Category extraction happens after filter application in
    getHtmlContent()

- **FR-005**: The tag filter dropdown MUST show only tags present in the
  currently visible memory set (respecting the system memory filter state)
  - **Validation**: When system memories hidden, dropdown excludes "#auto" tag
  - **Integration**: Tag extraction happens after filter application in
    getHtmlContent()

- **FR-006**: Keyword searches MUST respect the system memory filter state,
  searching only within the visible memory set
  - **Validation**: Keyword "budget_warning" returns zero results when system
    memories hidden
  - **Integration**: MemoryManager.search() receives excludeSystemMemories flag
    in query

- **FR-007**: The Memory Panel MUST display an informative empty state when no
  user memories exist and system memories are hidden
  - **Validation**: Empty state shows guidance text: "No user memories yet" with
    instructions to use "Gofer: Remember" command
  - **Integration**: HTML rendering checks filtered result count and shows empty
    state div

- **FR-008**: The results count display MUST reflect only the currently visible
  memories (after applying all filters including system memory filter)
  - **Validation**: Results count shows "3 memories" when 3 user memories and
    500 system memories exist with system filter ON
  - **Integration**: Results count calculation uses filtered array length

- **FR-009**: The system memory filter MUST be implemented via tag-based
  exclusion using the existing "#auto" tag
  - **Validation**: Filter logic checks `memory.tags.includes('#auto')`
  - **Integration**: MemoryStorage.query() implements excludeSystemMemories
    parameter

- **FR-010**: The toggle state MUST persist within a single VSCode session
  (closing and reopening panel preserves toggle state)
  - **Validation**: Toggle checked, panel closed, panel reopened → toggle
    remains checked
  - **Integration**: Panel stores toggle state in instance variable, restored on
    subsequent renders

### Non-Functional Requirements

- **NFR-001**: Filtering MUST execute in-memory with no disk I/O beyond initial
  load (O(n) complexity where n = total memories)
  - **Rationale**: Performance requirement - no degradation from current load
    times
  - **Validation**: Profiling shows toggle change completes in <100ms for 1000
    memories

- **NFR-002**: The feature MUST NOT modify the underlying storage format or file
  structure of memories.jsonl
  - **Rationale**: Backward compatibility constraint - no migration required
  - **Validation**: Storage file format remains unchanged before/after feature
    deployment

- **NFR-003**: All new HTML elements MUST use existing escapeHtml() security
  function to prevent XSS attacks
  - **Rationale**: Security constraint from existing codebase patterns
  - **Validation**: Static analysis confirms no unescaped user input in HTML
    template

- **NFR-004**: The feature MUST work with existing MemoryQuery interface and
  MemoryStorage.query() implementation
  - **Rationale**: Integration constraint - leverage existing infrastructure
  - **Validation**: No breaking changes to MemoryQuery or MemoryStorage
    contracts

- **NFR-005**: The UI toggle control MUST follow VSCode webview UI conventions
  (checkbox with label, consistent styling)
  - **Rationale**: UX consistency with VSCode extension ecosystem
  - **Validation**: Visual review confirms checkbox matches VSCode theme and
    spacing

- **NFR-006**: The feature MUST be fully reversible without data loss (removing
  the toggle returns to current "show all" behavior)
  - **Rationale**: Rollback safety constraint
  - **Validation**: Feature flag or code removal restores original behavior with
    zero data corruption

### Key Entities

- **User Memory**: Knowledge entry explicitly created by user via "Gofer:
  Remember" command. Contains category, tags (never "#auto"), content,
  timestamp, scope (local/global). Used for knowledge management and pattern
  recognition.

- **System Memory**: Telemetry entry automatically generated by Gofer's
  autonomous subsystems. Always tagged with "#auto", categories include
  "auto_decision" and "discovery". Contains budget warnings, scope violations,
  research completion events. Used for debugging and audit trails.

- **Toggle State**: Boolean preference indicating whether system memories are
  visible in the panel. Stored in panel instance, persists within VSCode
  session. Defaults to false (system memories hidden).

- **Memory Filter Query**: Search parameters combining category, tags, keywords,
  scope, and excludeSystemMemories flag. Passed from UI through MemoryManager to
  MemoryStorage for filtering.

## Success Criteria

### Measurable Outcomes

| ID         | Criterion                                                                 | Target                                                                 | Measurement Method                                                                   |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **SC-001** | Users can find their saved memories without scrolling through system logs | 100% of user memories visible in first page when system filter enabled | Manual test: Create 3 user memories, verify all visible without pagination           |
| **SC-002** | Category dropdown shows only relevant categories based on filter state    | Zero system categories when filter enabled                             | Automated test: Assert dropdown options exclude "auto_decision", "discovery"         |
| **SC-003** | Empty state guides users when no user memories exist                      | Empty state message displays with actionable guidance                  | Manual test: Fresh workspace → open panel → verify empty state text                  |
| **SC-004** | Toggle state persists within VSCode session                               | Toggle state preserved across panel close/reopen                       | Automated integration test: Toggle ON → close panel → reopen → assert toggle checked |
| **SC-005** | Search performance remains unchanged                                      | Filter operation completes in <100ms for 1000 memories                 | Performance test: Profile toggle change with 1000 memory dataset                     |
| **SC-006** | Power users can access system telemetry                                   | All system memories visible when toggle enabled                        | Manual test: Enable toggle → verify auto_decision logs appear in results             |
| **SC-007** | Backward compatibility maintained                                         | Existing memories load and display correctly                           | Regression test: Load pre-existing memories.jsonl → verify no errors                 |

## Assumptions

1. **System memories are consistently tagged**: All system-generated memories
   contain the "#auto" tag (validated in research: ContinuousMemoryWriter
   line 272)
2. **User memories never have "#auto" tag**: User-created memories via "Gofer:
   Remember" command do not add the "#auto" tag (validated in research:
   memoryCommands.ts implementation)
3. **In-memory filtering is performant**: The existing in-memory index structure
   can handle tag-based filtering without noticeable latency (validated in
   research: MemoryStorage.query() already implements tag filtering)
4. **Single JSONL file remains acceptable**: Keeping all memories in one file is
   acceptable for MVP - storage separation can be considered for future
   optimization if needed
5. **Users understand "system memories" terminology**: The label "Show system
   memories" is sufficiently clear without additional tooltips (can be validated
   with user testing)
6. **Dropdown rebuild on toggle is acceptable UX**: Rebuilding category/tag
   dropdowns when toggling filter state provides better UX than showing disabled
   options (design decision from research)

## Dependencies

### Internal Dependencies

1. **MemoryPanel UI** (`extension/src/ui/MemoryPanel.ts`):
   - Must add toggle control to HTML template
   - Must filter memories before building dropdowns
   - Must handle toggle state change messages from webview

2. **MemoryQuery Interface** (`extension/src/autonomous/memory.ts:176-212`):
   - Must extend interface to include `excludeSystemMemories?: boolean` field
   - Already supports tag filtering (no implementation changes needed)

3. **MemoryStorage** (`extension/src/autonomous/MemoryStorage.ts:384-441`):
   - Must implement `excludeSystemMemories` filter logic in query() method
   - Leverages existing tag filtering pattern (research: line 403-406)

4. **MemoryManager** (`extension/src/autonomous/MemoryManager.ts:404-453`):
   - Must pass through `excludeSystemMemories` flag from search() to
     storage.query()
   - No logic changes needed, just parameter forwarding

### External Dependencies

None - this is a self-contained UI feature with no external API, library, or
service dependencies.

### Data Dependencies

1. **Existing "#auto" tag convention**: Feature relies on ContinuousMemoryWriter
   consistently adding "#auto" tag to all system memories
2. **memories.jsonl file format**: Feature assumes stable JSONL format with tags
   array field (existing contract)

## Out of Scope

The following items are explicitly excluded from this feature:

1. **Storage architecture changes**: Moving system memories to a separate file
   (e.g., telemetry.jsonl) - this is UI filtering only
2. **Workspace-level persistence**: Persisting toggle state across VSCode
   restarts (covered in P3 story but not required for MVP)
3. **Granular system memory filtering**: Ability to filter by specific system
   categories (e.g., show discoveries but hide auto_decisions) - toggle is
   all-or-nothing
4. **Retroactive tagging**: Adding "#auto" tag to old system memories that might
   lack it - assumes all system memories are correctly tagged
5. **UI redesign**: Changing the overall Memory Panel layout, styling, or
   information architecture beyond adding the toggle
6. **Search algorithm changes**: Modifying keyword search relevance, ranking, or
   fuzzy matching - only filtering is in scope
7. **Category/tag management**: Ability to rename, merge, or delete
   categories/tags - read-only filtering only
8. **Export/import functionality**: Exporting filtered memory sets to external
   formats
9. **Telemetry collection**: Tracking toggle usage analytics (mentioned in
   research considerations but not required for MVP)

## Glossary

| Term                  | Definition                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Memory Panel**      | VSCode webview panel that displays memories, accessed via "Gofer: View Memories" command                                     |
| **User Memory**       | Knowledge explicitly saved by the user via "Gofer: Remember" command, used for learning patterns and decisions               |
| **System Memory**     | Telemetry log automatically generated by Gofer's autonomous subsystems (budget warnings, discovery events, scope violations) |
| **#auto Tag**         | Special tag applied to all system-generated memories by ContinuousMemoryWriter to distinguish them from user memories        |
| **System Categories** | Category values used exclusively by system memories: "auto_decision", "discovery"                                            |
| **User Categories**   | Category values applied by users: "pattern", "decision", "gotcha", "learning", etc.                                          |
| **MemoryQuery**       | Interface defining search/filter parameters (category, tags, keywords, scope) passed to MemoryStorage                        |
| **MemoryStorage**     | Low-level in-memory index with query() method that filters and returns matching memories                                     |
| **Toggle State**      | Boolean indicating whether "Show system memories" checkbox is checked (true = show all, false = user only)                   |
| **Empty State**       | UI message displayed when filtered results are empty, provides guidance on next actions                                      |
| **JSONL**             | JSON Lines format - one JSON object per line, used for memories.jsonl storage file                                           |

## Research Traceability

This matrix maps each research finding to the corresponding specification
section, ensuring all research insights are addressed:

| Research Finding                                     | Source Location      | Spec Section(s)                 | How Addressed                                |
| ---------------------------------------------------- | -------------------- | ------------------------------- | -------------------------------------------- |
| **533+ system entries clutter UI**                   | research.md:12-20    | Overview, User Story 1          | Core problem statement, P1 priority fix      |
| **UI filtering vs storage separation decision**      | research.md:188-202  | Assumptions, NFR-002            | UI-level filtering chosen, storage unchanged |
| **#auto tag marks all system memories**              | research.md:222, 181 | FR-009, Assumptions             | Tag-based exclusion mechanism                |
| **MemoryStorage.query() supports tag filtering**     | research.md:89-112   | FR-009, Dependencies            | Leverages existing infrastructure            |
| **Category dropdown populated from loaded memories** | research.md:118-138  | FR-004, Integration Points      | Filter before dropdown build                 |
| **Tag dropdown populated from loaded memories**      | research.md:118-138  | FR-005, Integration Points      | Filter before dropdown build                 |
| **Default behavior: hide system memories**           | research.md:204-214  | User Story 1, FR-001            | Default filter state = hidden                |
| **Toggle UI pattern**                                | research.md:230-243  | FR-002, FR-003, NFR-005         | Checkbox in toolbar                          |
| **Empty state for no user memories**                 | research.md:270-273  | FR-007, Edge Cases              | Informative empty state message              |
| **Sequential filter chaining pattern**               | research.md:89-112   | FR-009, Dependencies            | MemoryStorage.query() pattern                |
| **Category display mapping pattern**                 | research.md:59-83    | FR-004                          | Group/filter pattern reuse                   |
| **System vs user distinction pattern**               | research.md:145-158  | FR-001, Glossary                | Separate handling precedent                  |
| **XSS prevention via escapeHtml()**                  | research.md:249      | NFR-003                         | Security constraint                          |
| **Backward compatibility requirement**               | research.md:247      | NFR-002, NFR-006, SC-007        | No storage changes                           |
| **Performance: in-memory filtering**                 | research.md:387-391  | NFR-001, SC-005                 | O(n) complexity acceptable                   |
| **MemoryPanel.getHtmlContent() integration**         | research.md:164-167  | Dependencies, FR-001            | Primary integration point                    |
| **MemoryPanel.handleMessage() integration**          | research.md:169-171  | Dependencies, FR-003            | Toggle state handler                         |
| **Webview HTML integration**                         | research.md:173-176  | Dependencies, FR-002            | Checkbox control                             |
| **Rollback strategy**                                | research.md:393-400  | NFR-006                         | Reversibility without data loss              |
| **Category dropdown exclusion**                      | research.md:255-258  | FR-004, User Story 1 Scenario 2 | System categories hidden                     |
| **Tag dropdown exclusion**                           | research.md:260-262  | FR-005, User Story 1 Scenario 3 | #auto tag hidden                             |
| **Search respects toggle state**                     | research.md:265-268  | FR-006, User Story 1 Scenario 5 | Filter applies to all queries                |
| **Telemetry consideration**                          | research.md:275-277  | Out of Scope                    | Deferred to future iteration                 |
| **No migration needed**                              | research.md:384      | Assumptions, NFR-002            | Pure UI change                               |
| **Testing strategy: unit tests**                     | research.md:365-368  | Success Criteria, Dependencies  | MemoryStorage.query() validation             |
| **Testing strategy: integration tests**              | research.md:370-374  | Success Criteria, User Stories  | Panel behavior validation                    |
| **Testing strategy: E2E tests**                      | research.md:376-382  | Success Criteria, User Stories  | End-to-end flow validation                   |

### Integration Points Coverage

All 3 integration points from research are addressed:

1. ✅ **MemoryPanel.getHtmlContent()** - Dependencies section, FR-001, FR-004,
   FR-005
2. ✅ **MemoryPanel.handleMessage()** - Dependencies section, FR-003
3. ✅ **MemoryPanel webview HTML** - Dependencies section, FR-002

### Constraints Coverage

All 4 constraints from research are addressed:

1. ✅ **Backward compatibility** - NFR-002, NFR-006, SC-007
2. ✅ **No storage changes** - NFR-002, Assumptions
3. ✅ **Performance** - NFR-001, SC-005
4. ✅ **XSS prevention** - NFR-003

---

**Specification Complete**: This document provides a complete,
technology-agnostic specification for the Memory Panel Usability Fix feature.
All research findings have been incorporated and mapped to specific sections.
The specification is ready for plan generation and implementation.
