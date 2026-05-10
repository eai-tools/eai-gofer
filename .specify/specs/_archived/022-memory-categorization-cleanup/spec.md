---
id: 022-memory-categorization-cleanup
title: Memory System Categorization Cleanup
status: draft
created: '2026-02-11'
updated: '2026-02-11'
author: Claude
---

# Memory System Categorization Cleanup

## Overview

The Gofer extension's sidebar panels have blurred boundaries. The Memory panel
displays items that belong to other systems (observations, constitution access),
the context budget system treats constitution as memory, and the layered memory
system wraps constitution as a fake memory entry causing double-loading. This
creates naming confusion for developers maintaining the code and a confusing UX
for end users.

**Target Users**: Developers maintaining the Gofer codebase and end users of the
VSCode extension. **Primary Value**: Each panel and system has a distinct,
non-overlapping identity in both code and UI.

**Discovery Reference**: See `discovery.md` for full business context.
**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: Memory Panel Shows Only Memories (P1)

**As a** Gofer extension user **I want** the Memory panel to show only learned
knowledge (memories, decisions) **So that** I have a clear mental model of what
"Memory" means

**Acceptance Criteria**:

- [ ] The Memory panel no longer shows an "Observations" section
- [ ] The Memory panel no longer shows a "Checkpoints" section
- [ ] The Memory panel shows only: Memories (by category) and Decisions (ADRs)
- [ ] The Memory panel no longer has a "Show Constitution" toolbar button

### US2: Constitution Is Independent from Memory (P1)

**As a** developer maintaining the Gofer codebase **I want** constitution to
have its own identity separate from the memory system **So that** I can reason
about each system independently without confusion

**Acceptance Criteria**:

- [ ] Constitution has its own budget category in `ContextBuilder` (not lumped
      with memories)
- [ ] `MemoryLayerManager` no longer wraps constitution as a `MemoryItem`
- [ ] Constitution is loaded exactly once in context assembly (no
      double-loading)
- [ ] The `config.ts` VIEWS constant no longer references the removed
      `goferConstitution` view

### US3: Context Window Owns Context-Related Concerns (P2)

**As a** Gofer extension user **I want** the Context Window panel to be the
single source of truth for context health information **So that** I know where
to look for observation counts, token budgets, and session status

**Acceptance Criteria**:

- [ ] The Context Window panel's "Memories/Hints" category is renamed to
      accurately reflect what it shows
- [ ] Observation information is no longer duplicated between Memory and Context
      Window panels

### US4: Configuration Constants Are Accurate (P2)

**As a** developer maintaining the Gofer codebase **I want** the `config.ts`
constants to accurately reflect the current state of registered views **So
that** I can trust the codebase as documentation

**Acceptance Criteria**:

- [ ] `config.ts` VIEWS constant includes `contextWindow: 'goferContextWindow'`
- [ ] `config.ts` VIEWS constant removes the stale
      `constitution: 'goferConstitution'` entry
- [ ] No other stale view references exist in configuration

## Functional Requirements

### FR1: Remove Observations Section from Memory Panel

Remove the "Observations" root section from `memoryProvider.ts`. This section
displays tool output counts from `observations.jsonl` and the observation cache
— these are context management concerns owned by the Context Window system.

- **Validation**: Memory panel `getChildren()` returns 2 root sections
  (Memories, Decisions) instead of 4
- **Integration**: `memoryProvider.ts:142-153` (section creation),
  `memoryProvider.ts:280-302` (getObservationInfo), `memoryProvider.ts:380-385`
  (countObservations)

### FR2: Remove Checkpoints Section from Memory Panel

Remove the "Checkpoints" root section from `memoryProvider.ts`. Checkpoints are
session management artifacts, not learned knowledge. They remain accessible via
the Specifications panel and `/8_gofer_resume`.

- **Validation**: Checkpoints no longer appear in Memory panel tree
- **Integration**: `memoryProvider.ts` checkpoint-related methods

### FR3: Remove Constitution Toolbar Button from Memory Panel

Remove the "Show Constitution" navigation button from the Memory panel's title
bar. Constitution remains accessible via Command Palette
(`gofer.showConstitution`).

- **Validation**: The Memory panel title bar shows only the "Refresh Memory"
  button
- **Integration**: `extension/package.json:320-322` (menu entry with
  `when: "view == goferMemory"`)

### FR4: Move Constitution Button to Specifications Panel

Add the "Show Constitution" navigation button to the Specifications panel title
bar, where project-level configuration belongs alongside specs, plans, and
tasks.

- **Validation**: The Specifications panel title bar shows "Show Constitution"
  as a navigation button
- **Integration**: `extension/package.json` menus section,
  `when: "view == goferProgress"`

### FR5: Separate Constitution from Memory Budget

In `ContextBuilder.calculateBudgetUsage()`, give constitution its own budget key
instead of combining it with memory tokens.

- **Validation**: Budget usage object has separate `constitution` and `memory`
  keys; constitution tokens no longer compete with memory allocation
- **Integration**: `ContextBuilder.ts:464-467`, `StageContextProfile.ts`,
  `ContextBridgeWriter.ts`

### FR6: Remove Constitution from MemoryLayerManager Core

Remove the `core:constitution` memory item from
`MemoryLayerManager.getCoreMemory()`. Constitution is loaded by `ContextBuilder`
as its own section; it should not also be loaded as a fake memory item.

- **Validation**: `getCoreMemory()` does not return any item with
  `id: 'core:constitution'`; constitution is loaded once (via `ContextBuilder`)
  not twice
- **Integration**: `MemoryLayerManager.ts:127-142`,
  `MemoryLayerManager.ts:81-82` (coreTags/coreCategories)

### FR7: Fix config.ts VIEWS Constant

Update the `VIEWS` constant to accurately reflect registered views: add
`contextWindow: 'goferContextWindow'`, remove stale
`constitution: 'goferConstitution'`.

- **Validation**: VIEWS constant matches exactly the views registered in
  `package.json` plus the container
- **Integration**: `config.ts:56-61`, any file importing `VIEWS`

### FR8: Rename Context Window "Memories/Hints" Category

Rename the "Memories/Hints" category in the Context Window panel to "Memories &
Hints" or a more descriptive label that doesn't imply the Context Window panel
manages memories.

- **Validation**: The category label accurately describes the estimated token
  slice without creating a false ownership impression
- **Integration**: `contextWindowProvider.ts:28-35` (CONTEXT_CATEGORIES
  constant)

## Non-Functional Requirements

### Backward Compatibility

- Existing `memories.jsonl` entries must continue to load without migration.
  Category strings stored in JSONL are not changed.
- The `MemoryType` union type
  (`'episodic' | 'semantic' | 'procedural' | 'prospective' | 'decision'`) must
  not change — these are cognitive types, not UI categories.
- The constitution file path (`.specify/memory/constitution.md`) must not change
  — many systems read this directly.

### Test Coverage

- All modified providers must have updated unit tests reflecting new section
  counts and labels
- `ContextBuilder` budget tests must verify the new separate `constitution`
  budget key
- `MemoryLayerManager` tests must verify constitution is no longer returned as a
  core memory item

### Code Quality

- No new cross-panel dependencies introduced
- Changes follow existing tree view provider patterns documented in research
- Command naming follows existing `gofer.verbNoun` convention

## Success Criteria

| Metric                | Target                                                   | Measurement                                        |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Memory panel sections | Exactly 2 root sections (Memories, Decisions)            | Unit test assertion                                |
| Constitution loading  | Loaded exactly once in context assembly                  | Code review of ContextBuilder + MemoryLayerManager |
| Budget separation     | Constitution has its own budget key separate from memory | Unit test on calculateBudgetUsage()                |
| Config accuracy       | VIEWS constant matches registered views                  | Automated comparison                               |
| No regressions        | All existing tests pass (except pre-existing failures)   | Test suite run                                     |

## Assumptions

- The `.specify/memory/` folder path is NOT being changed (out of scope per
  discovery)
- Observation data remains accessible via the Context Window panel (it already
  has "Tool Outputs" and "Masked Observations" categories)
- Checkpoints remain accessible via `/8_gofer_resume` and the Specifications
  panel
- Constitution remains accessible via Command Palette and the new Specifications
  panel button
- The 7 memory categories (Discovery, Patterns, Decisions, Learnings, Journeys,
  Architecture, Debug) are kept as-is — they are reasonable groupings for
  learned knowledge
- `ConstitutionProvider` is kept alive (instantiated but not registered as a
  sidebar panel) since its `getArticles()`/`getArticle()` API may be used for
  future features

## Dependencies

- `extension/src/memoryProvider.ts` — Primary modification target (remove
  sections, remove toolbar wiring)
- `extension/src/autonomous/ContextBuilder.ts` — Budget calculation changes
- `extension/src/autonomous/MemoryLayerManager.ts` — Remove
  constitution-as-memory
- `extension/src/contextWindowProvider.ts` — Category rename
- `extension/src/config.ts` — VIEWS constant fix
- `extension/package.json` — Menu configuration changes
- `extension/src/extension.ts` — May need refresh call adjustments
- `tests/unit/memoryProvider.test.ts` — Test updates for new section count
- `tests/unit/autonomous/ContextBuilder.test.ts` — Budget test updates
- `tests/unit/autonomous/MemoryLayerManager.test.ts` — Remove constitution tests

## Out of Scope

- Renaming the `.specify/memory/` folder (pipeline infrastructure, not extension
  concern)
- Changing memory category names (Discovery, Patterns, etc. are fine as-is)
- Changing `MemoryType` cognitive types (episodic, semantic, etc.)
- Adding new sidebar panels
- Changing the constitution file format
- Removing `ConstitutionProvider` class entirely (keep for potential future use)

## Glossary

| Term           | Definition                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Memory         | Learned knowledge persisted in `memories.jsonl` — things the system discovered, patterns it found, decisions made |
| Constitution   | Static project coding standards document at `.specify/memory/constitution.md` — not learned, manually authored    |
| Observation    | A captured tool output (file read, command output, test result) managed by `ObservationMasker`                    |
| Checkpoint     | A session save point created by `/7_gofer_save` for later resumption                                              |
| Context Window | The active LLM context showing token usage breakdown across categories                                            |
| Budget         | Token allocation per content type (memories, constitution, code, research) within a pipeline stage                |

## Research Traceability

| Research Finding                         | Spec Section                                           | Reference                        |
| ---------------------------------------- | ------------------------------------------------------ | -------------------------------- |
| Problem 1: Observations in Memory panel  | FR1                                                    | research.md "Problem 1"          |
| Problem 2: Constitution button on Memory | FR3, FR4                                               | research.md "Problem 2"          |
| Problem 3: Constitution in memory budget | FR5                                                    | research.md "Problem 3"          |
| Problem 4: Constitution as MemoryItem    | FR6                                                    | research.md "Problem 4"          |
| Problem 5: Double-loading constitution   | FR6                                                    | research.md "Problem 5"          |
| Problem 6: Stale VIEWS constant          | FR7                                                    | research.md "Problem 6"          |
| Constraint: Backward compatibility       | NFR: Backward Compatibility                            | research.md "Constraints"        |
| Constraint: ContextBuilder coupling      | FR5 integration notes                                  | research.md "Constraints"        |
| Constraint: Test coverage exists         | NFR: Test Coverage                                     | research.md "Constraints"        |
| Decision 1: Keep "Memory" name           | Assumptions                                            | research.md "Decision 1"         |
| Decision 2: Move Observations            | FR1                                                    | research.md "Decision 2"         |
| Decision 3: Separate constitution budget | FR5                                                    | research.md "Decision 3"         |
| Decision 4: Stop constitution-as-memory  | FR6                                                    | research.md "Decision 4"         |
| Decision 5: Move Constitution button     | FR3, FR4                                               | research.md "Decision 5"         |
| Integration: extension.ts wiring         | Dependencies                                           | research.md "Integration Points" |
| Integration: ContextBuilder convergence  | FR5, FR6                                               | research.md "Integration Points" |
| Integration: webviewHelpers              | Dependencies                                           | research.md "Integration Points" |
| Open Q: Checkpoints section              | FR2 (resolved: remove)                                 | research.md "Open Questions"     |
| Open Q: VIEWS constant approach          | FR7 (resolved: add contextWindow, remove constitution) | research.md "Open Questions"     |
| Open Q: ConstitutionProvider removal     | Assumptions (resolved: keep alive)                     | research.md "Open Questions"     |
