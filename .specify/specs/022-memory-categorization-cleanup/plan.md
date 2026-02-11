---
feature: Memory System Categorization Cleanup
spec: spec.md
research: research.md
status: ready
created: '2026-02-11'
---

# Implementation Plan: Memory System Categorization Cleanup

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest for unit tests
- **Build**: Webpack for bundling

### Architecture

This is a refactoring of existing sidebar panels and backend context management.
No new components are created — we are removing cross-boundary coupling and
fixing category assignments in existing code.

```text
Before:
  Memory Panel ──┐
    Memories     │── all displayed in Memory panel
    Observations │   (boundary violations)
    Checkpoints  │
    Decisions    │
    [Constitution btn]

  ContextBuilder ── constitution counted as memory budget
  MemoryLayerManager ── constitution wrapped as MemoryItem

After:
  Memory Panel
    Memories
    Decisions

  Specifications Panel
    [Constitution btn]  (moved here)

  ContextBuilder ── constitution has own budget key
  MemoryLayerManager ── constitution NOT loaded as memory
```

### Integration Points

| Component             | File                                             | Integration Type                  |
| --------------------- | ------------------------------------------------ | --------------------------------- |
| MemoryProvider        | `extension/src/memoryProvider.ts`                | Remove sections, update docstring |
| ContextBuilder        | `extension/src/autonomous/ContextBuilder.ts`     | Budget calculation                |
| MemoryLayerManager    | `extension/src/autonomous/MemoryLayerManager.ts` | Core memory loading               |
| ContextWindowProvider | `extension/src/contextWindowProvider.ts`         | Category label rename             |
| Config                | `extension/src/config.ts`                        | VIEWS constant                    |
| Package manifest      | `extension/package.json`                         | Menu entries                      |

### Key Dependencies

- Existing `MemoryManager` API (unchanged)
- `StageContextProfile` interface (unchanged — no new budget field)
- `ContextBridgeWriter` reads budget usage (updated key names)

---

## Implementation Phases

### Phase 1: Memory Panel Cleanup (FR1, FR2, FR3)

**Goal**: Remove non-memory concerns from the Memory panel

**Files modified**:

- `extension/src/memoryProvider.ts`
- `extension/package.json`

**Tasks**:

- [ ] **T001** [memoryProvider.ts] Update file docstring to reflect new
      2-section structure (Memories, Decisions)
- [ ] **T002** [memoryProvider.ts] In `getRootItems()`, remove the Observations
      section (lines 142-154) and Checkpoints section (lines 156-168). Keep only
      Memories and Decisions sections.
- [ ] **T003** [memoryProvider.ts] In `getSectionChildren()`, remove the
      `case 'observations'` and `case 'checkpoints'` branches
- [ ] **T004** [memoryProvider.ts] Remove the `getObservationInfo()` method
      (lines 282-311) and `countObservations()` method (lines 380-388)
- [ ] **T005** [memoryProvider.ts] Remove the `getCheckpointItems()` method
      (lines 316-350) and `listCheckpoints()` method (lines 390-400)
- [ ] **T006** [package.json] In `menus.view/title`, remove the
      `gofer.showConstitution` entry where `when: "view == goferMemory"` (lines
      320-323). Keep `gofer.refreshMemory` but update its group to `navigation`
      (no ordering suffix needed when it's the only button)

**Verification**:

- [ ] `getRootItems()` returns exactly 2 items
- [ ] No references to observations or checkpoints remain in memoryProvider
- [ ] Memory panel title bar shows only Refresh button

### Phase 2: Constitution Decoupling (FR4, FR5, FR6)

**Goal**: Make constitution independent from the memory system

**Files modified**:

- `extension/package.json`
- `extension/src/autonomous/ContextBuilder.ts`
- `extension/src/autonomous/MemoryLayerManager.ts`

**Tasks**:

- [ ] **T007** [package.json] In `menus.view/title`, add a new entry for
      `gofer.showConstitution` with `when: "view == goferProgress"` and
      `group: "navigation@3"` (after refreshSpecs and updateNow)
- [ ] **T008** [ContextBuilder.ts] In `calculateBudgetUsage()` (line 462-498),
      separate constitution from memory in the `usage` object. Change:

  ```typescript
  // Before:
  memory: this.estimateTokens(sections.memories || '') +
          this.estimateTokens(sections.constitution || ''),

  // After:
  memory: this.estimateTokens(sections.memories || ''),
  constitution: this.estimateTokens(sections.constitution || ''),
  ```

  Update the `total` calculation to include the new `constitution` key. Update
  the comment at line 441 from "memory: memories + constitution" to "memory:
  memories only".

- [ ] **T009** [ContextBuilder.ts] Add a budget check for the `constitution`
      category. Since constitution is small and fixed, check it against a
      reasonable fraction of the memory budget (e.g., 20% of memoryBudget).
      Alternatively, check against a fixed token limit.
- [ ] **T010** [MemoryLayerManager.ts] In `getCoreMemory()` (line 124-162),
      remove the constitution loading block (lines 127-142). Remove the
      `try { fs.readFileSync(constitutionPath...) }` block entirely.
      Constitution is already loaded by ContextBuilder directly.
- [ ] **T011** [MemoryLayerManager.ts] In `DEFAULT_CONFIG` (line 78-83), remove
      `'#constitution'` from `coreTags` and `'constitution'` from
      `coreCategories`. Update the docstring at line 5 to say "Core Memory:
      Always loaded (current task, key decisions)" — removing the "constitution"
      mention.

**Verification**:

- [ ] Specifications panel shows Constitution button
- [ ] Budget usage has separate `constitution` key
- [ ] `getCoreMemory()` does not return any item with `id: 'core:constitution'`
- [ ] Constitution loaded only once (via ContextBuilder line 640-644)

### Phase 3: Configuration & Labels (FR7, FR8)

**Goal**: Fix stale constants and misleading labels

**Files modified**:

- `extension/src/config.ts`
- `extension/src/contextWindowProvider.ts`

**Tasks**:

- [ ] **T012** [config.ts] Update the `VIEWS` constant (line 56-61):
  ```typescript
  export const VIEWS = {
    progress: 'goferProgress',
    contextWindow: 'goferContextWindow',
    memory: 'goferMemory',
    container: 'gofer',
  } as const;
  ```
  Remove `constitution: 'goferConstitution'` and add
  `contextWindow: 'goferContextWindow'`.
- [ ] **T013** [contextWindowProvider.ts] In `CONTEXT_CATEGORIES` (line 30),
      rename `'Memories/Hints'` to `'Memories & Hints'`. This is a minor label
      change that removes the slash ambiguity.

**Verification**:

- [ ] `VIEWS` constant has 4 keys: progress, contextWindow, memory, container
- [ ] Context Window panel shows "Memories & Hints" label

### Phase 4: Test Updates

**Goal**: Update tests to match new behavior

**Files modified**:

- `tests/unit/memoryProvider.test.ts`
- `tests/unit/autonomous/ContextBuilder.test.ts`
- `tests/unit/autonomous/MemoryLayerManager.test.ts`

**Tasks**:

- [ ] **T014** [memoryProvider.test.ts] Update root section count assertions
      from 4 to 2. Remove tests for Observations and Checkpoints sections.
      Update any tests that check `getSectionChildren('observations')` or
      `getSectionChildren('checkpoints')`.
- [ ] **T015** [ContextBuilder.test.ts] Update budget calculation tests to
      verify separate `constitution` and `memory` keys in the usage object. Add
      a test that verifies constitution tokens are NOT included in the `memory`
      usage.
- [ ] **T016** [MemoryLayerManager.test.ts] Update `getCoreMemory()` tests to
      verify that no `core:constitution` item is returned. Remove or update
      tests that assert constitution presence in core memory.

**Verification**:

- [ ] All unit tests pass
- [ ] `npm test` succeeds (except pre-existing failures in
      agent-stop-extraction.test.ts)

### Phase 5: Final Verification

**Goal**: Ensure no regressions

**Tasks**:

- [ ] **T017** Run full test suite: `npm test`
- [ ] **T018** Run linter: `npm run lint`
- [ ] **T019** Verify compile: `cd extension && npm run compile`
- [ ] **T020** Manual spot-check: Verify no other files reference the removed
      sections or stale VIEWS entries

---

## File Structure

```
extension/src/
├── memoryProvider.ts           # MODIFIED: Remove Observations, Checkpoints sections
├── contextWindowProvider.ts    # MODIFIED: Rename "Memories/Hints"
├── config.ts                   # MODIFIED: Fix VIEWS constant
├── constitutionProvider.ts     # UNCHANGED (kept alive, not registered)
├── autonomous/
│   ├── ContextBuilder.ts       # MODIFIED: Separate constitution budget
│   ├── MemoryLayerManager.ts   # MODIFIED: Remove constitution from core
│   └── StageContextProfile.ts  # UNCHANGED
└── extension.ts                # UNCHANGED (wiring stays the same)

extension/package.json          # MODIFIED: Move Constitution button

tests/unit/
├── memoryProvider.test.ts      # MODIFIED: Update section count assertions
├── autonomous/
│   ├── ContextBuilder.test.ts  # MODIFIED: Budget key tests
│   └── MemoryLayerManager.test.ts # MODIFIED: Remove constitution tests
```

## Risk Assessment

| Risk                                                      | Impact | Mitigation                                                                     |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| ContextBridgeWriter expects old budget keys               | Medium | Check what keys it writes; add `constitution` key support                      |
| StageContextProfile YAML has no constitution budget       | Low    | Don't add a new YAML field; carve constitution out within existing calculation |
| Removing observations from Memory panel hides useful info | Low    | Context Window already has Tool Outputs + Masked Observations categories       |
| Pre-existing test failures block verification             | Low    | Known issue — agent-stop-extraction.test.ts failures are pre-existing          |

## Notes

- `ConstitutionProvider` is intentionally kept alive (instantiated but not
  registered). Its refresh calls in extension.ts remain — they're harmless and
  preserve the API for future use.
- The `StageContextProfile` interface and YAML schema are NOT modified.
  Constitution budget is carved from within `calculateBudgetUsage()` without
  changing the profile structure.
- Memory JSONL format is NOT changed. Existing category strings (discovery,
  pattern, etc.) remain valid.

---

## Spec Traceability

### User Story Coverage

| Story                                         | Status  | Plan References                                                      |
| --------------------------------------------- | ------- | -------------------------------------------------------------------- |
| US1 (P1) Memory Panel Shows Only Memories     | COVERED | Phase 1 (T001-T006)                                                  |
| US2 (P1) Constitution Independent from Memory | COVERED | Phase 2 (T007-T011)                                                  |
| US3 (P2) Context Window Owns Context Concerns | COVERED | Phase 3 (T013) + Phase 1 (T002-T005 removes observation duplication) |
| US4 (P2) Config Constants Accurate            | COVERED | Phase 3 (T012)                                                       |

### Requirement Coverage

| Requirement                                      | Status  | Plan Reference           |
| ------------------------------------------------ | ------- | ------------------------ |
| FR1: Remove Observations                         | COVERED | Phase 1, T002-T004       |
| FR2: Remove Checkpoints                          | COVERED | Phase 1, T002-T003, T005 |
| FR3: Remove Constitution button from Memory      | COVERED | Phase 1, T006            |
| FR4: Move Constitution button to Specs           | COVERED | Phase 2, T007            |
| FR5: Separate constitution budget                | COVERED | Phase 2, T008-T009       |
| FR6: Remove constitution from MemoryLayerManager | COVERED | Phase 2, T010-T011       |
| FR7: Fix config.ts VIEWS                         | COVERED | Phase 3, T012            |
| FR8: Rename Context Window category              | COVERED | Phase 3, T013            |

Coverage: 100% of user stories, 100% of functional requirements
