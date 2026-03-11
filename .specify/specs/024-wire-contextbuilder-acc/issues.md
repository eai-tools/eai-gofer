---
description: "GitHub issues for Unknown Feature - ready to create in GitHub"
---

# GitHub Issues: Unknown Feature

**Generated from**: tasks.md
**Feature ID**: unknown
**Total Issues**: 44
**Generated**: 2026-03-11

This file contains GitHub-ready issue definitions for each task in tasks.md. Each issue follows the Requirements Ticket template from enterpriseaigroup/Issues2025.

---

## How to Use This File

### Creating Issues in GitHub

**Option 1: GitHub CLI (Recommended)**
```bash
# Parse this file and create issues programmatically
# See: .specify/scripts/node/create-github-issues.js
node .specify/scripts/node/create-github-issues.js unknown
```

**Option 2: Manual Creation**
1. Copy each issue section below
2. Create new issue in GitHub
3. Paste the content, adjusting as needed

**Option 3: GitHub API**
Use the GitHub REST API with automation scripts.

---

## Issue #1: T001 - [US2] Create shared ContextBuilder instance in `initializeForWorkspace()` after MemoryManager creation in `extension/src/extension.ts` — construct with `workspacePath`, `memoryManager`, `hintLoader`; call `setSharedContextBuilder()`; assign `state.sharedContextBuilder`

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us1`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T001 - [US2] Create shared ContextBuilder instance in `initializeForWorkspace()` after MemoryManager creation in `extension/src/extension.ts` — construct with `workspacePath`, `memoryManager`, `hintLoader`; call `setSharedContextBuilder()`; assign `state.sharedContextBuilder`

### Screen described (Mike)

This task involves: [US2] Create shared ContextBuilder instance in `initializeForWorkspace()` after MemoryManager creation in `extension/src/extension.ts` — construct with `workspacePath`, `memoryManager`, `hintLoader`; call `setSharedContextBuilder()`; assign `state.sharedContextBuilder`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T002
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US1]

---

## Issue #2: T002 - [US2] Wire optional dependencies to shared ContextBuilder in `extension/src/extension.ts` — call `setUsageLogger()`, `setScopeGuard()`, `setCostBudgetEnforcer()` after respective components are created

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us1`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T002 - [US2] Wire optional dependencies to shared ContextBuilder in `extension/src/extension.ts` — call `setUsageLogger()`, `setScopeGuard()`, `setCostBudgetEnforcer()` after respective components are created

### Screen described (Mike)

This task involves: [US2] Wire optional dependencies to shared ContextBuilder in `extension/src/extension.ts` — call `setUsageLogger()`, `setScopeGuard()`, `setCostBudgetEnforcer()` after respective components are created

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T001, T003
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US1]

---

## Issue #3: T003 - Wire AutoHandoffTrigger to shared ContextBuilder in `extension/src/extension.ts` — call `autoHandoffTrigger.setContextBuilder(state.sharedContextBuilder)` after ContextBuilder creation

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us1`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T003 - Wire AutoHandoffTrigger to shared ContextBuilder in `extension/src/extension.ts` — call `autoHandoffTrigger.setContextBuilder(state.sharedContextBuilder)` after ContextBuilder creation

### Screen described (Mike)

This task involves: Wire AutoHandoffTrigger to shared ContextBuilder in `extension/src/extension.ts` — call `autoHandoffTrigger.setContextBuilder(state.sharedContextBuilder)` after ContextBuilder creation

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by advancing feature implementation.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T002, T004
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US1]

---

## Issue #4: T004 - [US2] Verify reinitialize cleanup in `extension/src/extension.ts` — confirm `reinitializeExtension()` disposes old builder (line 295), then `initializeForWorkspace()` re-creates it; add integration test

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us1`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T004 - [US2] Verify reinitialize cleanup in `extension/src/extension.ts` — confirm `reinitializeExtension()` disposes old builder (line 295), then `initializeForWorkspace()` re-creates it; add integration test

### Screen described (Mike)

This task involves: [US2] Verify reinitialize cleanup in `extension/src/extension.ts` — confirm `reinitializeExtension()` disposes old builder (line 295), then `initializeForWorkspace()` re-creates it; add integration test

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T003, T005
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US1]

---

## Issue #5: T005 - Write wiring integration test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify `state.sharedContextBuilder` is non-null after mock `initializeForWorkspace()`, verify `getSharedContextBuilder()` returns the instance

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T005 - Write wiring integration test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify `state.sharedContextBuilder` is non-null after mock `initializeForWorkspace()`, verify `getSharedContextBuilder()` returns the instance

### Screen described (Mike)

This task involves: Write wiring integration test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify `state.sharedContextBuilder` is non-null after mock `initializeForWorkspace()`, verify `getSharedContextBuilder()` returns the instance

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T004, T006
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US1]

---

## Issue #6: T006 - Write AutoHandoffTrigger regression test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify auto-save at 65% and critical at 70% still fire correctly with ContextBuilder wired

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T006 - Write AutoHandoffTrigger regression test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify auto-save at 65% and critical at 70% still fire correctly with ContextBuilder wired

### Screen described (Mike)

This task involves: Write AutoHandoffTrigger regression test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify auto-save at 65% and critical at 70% still fire correctly with ContextBuilder wired

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T005, T007
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US1]

---

## Issue #7: T007 - Write EventHandlers config reload test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify `reloadObservationPatterns()` and `reloadLayeredMemorySetting()` no longer early-return when `sharedContextBuilder` is set

**Labels**: `enhancement`, `phase-1-wire-shared-contextbuilder-foundation-`, `us6`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T007 - Write EventHandlers config reload test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify `reloadObservationPatterns()` and `reloadLayeredMemorySetting()` no longer early-return when `sharedContextBuilder` is set

### Screen described (Mike)

This task involves: Write EventHandlers config reload test in `extension/src/autonomous/__tests__/contextbuilder-wiring.test.ts` — verify `reloadObservationPatterns()` and `reloadLayeredMemorySetting()` no longer early-return when `sharedContextBuilder` is set

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: wire shared contextbuilder (foundation) task that supports [US6].

**Priority**: P1 (High) - Part of Phase 1: Wire Shared ContextBuilder (Foundation)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T006, T008
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Wire Shared ContextBuilder (Foundation)
**User Story**: [US6]

---

## Issue #8: T008 - Test `buildContext()` with mock MemoryManager in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — provide known memories and hints, verify context sections are populated

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us2`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T008 - Test `buildContext()` with mock MemoryManager in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — provide known memories and hints, verify context sections are populated

### Screen described (Mike)

This task involves: Test `buildContext()` with mock MemoryManager in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — provide known memories and hints, verify context sections are populated

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US2].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T007, T009
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US2]

---

## Issue #9: T009 - Test `setCurrentStage()` loads correct profile in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — switch to research stage, verify 40% research / 20% memory / 10% code allocation

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us2`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T009 - Test `setCurrentStage()` loads correct profile in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — switch to research stage, verify 40% research / 20% memory / 10% code allocation

### Screen described (Mike)

This task involves: Test `setCurrentStage()` loads correct profile in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — switch to research stage, verify 40% research / 20% memory / 10% code allocation

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US2].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T008, T010
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US2]

---

## Issue #10: T010 - Test `trackObservation()` records and returns ID in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — track a file_read observation, verify UUID returned, verify retrievable

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T010 - Test `trackObservation()` records and returns ID in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — track a file_read observation, verify UUID returned, verify retrievable

### Screen described (Mike)

This task involves: Test `trackObservation()` records and returns ID in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — track a file_read observation, verify UUID returned, verify retrievable

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T009, T011
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #11: T011 - Test budget enforcement in truncate mode in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — set `enforceBudgetCaps: true` with `budgetEnforcementMode: 'truncate'`, verify sections are trimmed to budget

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us2`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T011 - Test budget enforcement in truncate mode in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — set `enforceBudgetCaps: true` with `budgetEnforcementMode: 'truncate'`, verify sections are trimmed to budget

### Screen described (Mike)

This task involves: Test budget enforcement in truncate mode in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — set `enforceBudgetCaps: true` with `budgetEnforcementMode: 'truncate'`, verify sections are trimmed to budget

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US2].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T010, T012
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US2]

---

## Issue #12: T012 - Test empty memories produce valid context in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — mock MemoryManager returning empty, verify `buildContext()` succeeds with zero-token memory section

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T012 - Test empty memories produce valid context in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — mock MemoryManager returning empty, verify `buildContext()` succeeds with zero-token memory section

### Screen described (Mike)

This task involves: Test empty memories produce valid context in `extension/src/autonomous/__tests__/ContextBuilder.test.ts` — mock MemoryManager returning empty, verify `buildContext()` succeeds with zero-token memory section

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T011, T013
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #13: T013 - Test three-tier decay in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track 15 observations, advance 12 turns via `maskOldObservations()`, verify tier distribution (full / key-points / masked)

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T013 - Test three-tier decay in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track 15 observations, advance 12 turns via `maskOldObservations()`, verify tier distribution (full / key-points / masked)

### Screen described (Mike)

This task involves: Test three-tier decay in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track 15 observations, advance 12 turns via `maskOldObservations()`, verify tier distribution (full / key-points / masked)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T012, T014
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #14: T014 - Test error preservation in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track observation containing stack trace, advance past age threshold, verify it remains in full tier

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T014 - Test error preservation in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track observation containing stack trace, advance past age threshold, verify it remains in full tier

### Screen described (Mike)

This task involves: Test error preservation in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track observation containing stack trace, advance past age threshold, verify it remains in full tier

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T013, T015
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #15: T015 - Test per-type decay rates in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track test_output (threshold 12) and search_result (threshold 6), advance 8 turns, verify search masked but test still in key-points

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T015 - Test per-type decay rates in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track test_output (threshold 12) and search_result (threshold 6), advance 8 turns, verify search masked but test still in key-points

### Screen described (Mike)

This task involves: Test per-type decay rates in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track test_output (threshold 12) and search_result (threshold 6), advance 8 turns, verify search masked but test still in key-points

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T014, T016
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #16: T016 - Test cache persistence round-trip in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — call `saveCacheToDisk()`, clear cache, call `loadCacheFromDisk()`, verify observations restored

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T016 - Test cache persistence round-trip in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — call `saveCacheToDisk()`, clear cache, call `loadCacheFromDisk()`, verify observations restored

### Screen described (Mike)

This task involves: Test cache persistence round-trip in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — call `saveCacheToDisk()`, clear cache, call `loadCacheFromDisk()`, verify observations restored

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T015, T017
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #17: T017 - Test LRU eviction in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track 101 observations (maxCacheSize=100), verify oldest evicted

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T017 - Test LRU eviction in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track 101 observations (maxCacheSize=100), verify oldest evicted

### Screen described (Mike)

This task involves: Test LRU eviction in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — track 101 observations (maxCacheSize=100), verify oldest evicted

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T016, T018
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #18: T018 - Test cache corruption handling in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — write invalid JSON to cache file, call `loadCacheFromDisk()`, verify cache cleared and no crash

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us1`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T018 - Test cache corruption handling in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — write invalid JSON to cache file, call `loadCacheFromDisk()`, verify cache cleared and no crash

### Screen described (Mike)

This task involves: Test cache corruption handling in `extension/src/autonomous/__tests__/ObservationMasker.test.ts` — write invalid JSON to cache file, call `loadCacheFromDisk()`, verify cache cleared and no crash

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US1].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T017, T019
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US1]

---

## Issue #19: T019 - Test YAML loading in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide valid YAML file, verify profiles loaded correctly with expected budgets

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us2`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T019 - Test YAML loading in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide valid YAML file, verify profiles loaded correctly with expected budgets

### Screen described (Mike)

This task involves: Test YAML loading in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide valid YAML file, verify profiles loaded correctly with expected budgets

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US2].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T018, T020
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US2]

---

## Issue #20: T020 - Test fallback to defaults in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide no YAML file, verify hardcoded defaults returned for all stages

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us2`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T020 - Test fallback to defaults in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide no YAML file, verify hardcoded defaults returned for all stages

### Screen described (Mike)

This task involves: Test fallback to defaults in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide no YAML file, verify hardcoded defaults returned for all stages

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US2].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T019, T021
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US2]

---

## Issue #21: T021 - Test validation in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide YAML with budgets summing > 1.0, verify validation error and fallback to defaults

**Labels**: `enhancement`, `phase-2-contextbuilder-observationmasker-unit-tests`, `us2`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T021 - Test validation in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide YAML with budgets summing > 1.0, verify validation error and fallback to defaults

### Screen described (Mike)

This task involves: Test validation in `extension/src/autonomous/__tests__/StageContextProfileLoader.test.ts` — provide YAML with budgets summing > 1.0, verify validation error and fallback to defaults

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: contextbuilder + observationmasker unit tests task that supports [US2].

**Priority**: P1 (High) - Part of Phase 2: ContextBuilder + ObservationMasker Unit Tests

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T020, T022
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 2: ContextBuilder + ObservationMasker Unit Tests
**User Story**: [US2]

---

## Issue #22: T022 - Add ACC event types to `ContextHealthEvents` interface in `extension/src/autonomous/ContextHealthMonitor.ts` — add `'acc-observation-masking'` (80%), `'acc-fast-pruning'` (85%), `'acc-aggressive-masking'` (90%), `'acc-full-compaction'` (99%)

**Labels**: `enhancement`, `phase-3-extend-contexthealthmonitor-with-acc-events`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T022 - Add ACC event types to `ContextHealthEvents` interface in `extension/src/autonomous/ContextHealthMonitor.ts` — add `'acc-observation-masking'` (80%), `'acc-fast-pruning'` (85%), `'acc-aggressive-masking'` (90%), `'acc-full-compaction'` (99%)

### Screen described (Mike)

This task involves: Add ACC event types to `ContextHealthEvents` interface in `extension/src/autonomous/ContextHealthMonitor.ts` — add `'acc-observation-masking'` (80%), `'acc-fast-pruning'` (85%), `'acc-aggressive-masking'` (90%), `'acc-full-compaction'` (99%)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by advancing feature implementation.

**Impact**: This is a phase 3: extend contexthealthmonitor with acc events task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: Extend ContextHealthMonitor with ACC Events

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T021, T023
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 3: Extend ContextHealthMonitor with ACC Events
**User Story**: [US3]

---

## Issue #23: T023 - Add ACC threshold config to `ContextHealthConfig` interface in `extension/src/autonomous/ContextHealthMonitor.ts` — add `accObservationMaskingThreshold`, `accFastPruningThreshold`, `accAggressiveMaskingThreshold`, `accFullCompactionThreshold` with defaults

**Labels**: `enhancement`, `phase-3-extend-contexthealthmonitor-with-acc-events`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T023 - Add ACC threshold config to `ContextHealthConfig` interface in `extension/src/autonomous/ContextHealthMonitor.ts` — add `accObservationMaskingThreshold`, `accFastPruningThreshold`, `accAggressiveMaskingThreshold`, `accFullCompactionThreshold` with defaults

### Screen described (Mike)

This task involves: Add ACC threshold config to `ContextHealthConfig` interface in `extension/src/autonomous/ContextHealthMonitor.ts` — add `accObservationMaskingThreshold`, `accFastPruningThreshold`, `accAggressiveMaskingThreshold`, `accFullCompactionThreshold` with defaults

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by advancing feature implementation.

**Impact**: This is a phase 3: extend contexthealthmonitor with acc events task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: Extend ContextHealthMonitor with ACC Events

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T022, T024
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 3: Extend ContextHealthMonitor with ACC Events
**User Story**: [US3]

---

## Issue #24: T024 - Add threshold crossing detection in `emitStatusEvents()` in `extension/src/autonomous/ContextHealthMonitor.ts` — follow existing pattern: `utilizationRatio >= threshold && previousRatio < threshold && dataSource === 'real'`; emit AFTER auto-save/critical events

**Labels**: `enhancement`, `phase-3-extend-contexthealthmonitor-with-acc-events`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T024 - Add threshold crossing detection in `emitStatusEvents()` in `extension/src/autonomous/ContextHealthMonitor.ts` — follow existing pattern: `utilizationRatio >= threshold && previousRatio < threshold && dataSource === 'real'`; emit AFTER auto-save/critical events

### Screen described (Mike)

This task involves: Add threshold crossing detection in `emitStatusEvents()` in `extension/src/autonomous/ContextHealthMonitor.ts` — follow existing pattern: `utilizationRatio >= threshold && previousRatio < threshold && dataSource === 'real'`; emit AFTER auto-save/critical events

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by advancing feature implementation.

**Impact**: This is a phase 3: extend contexthealthmonitor with acc events task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: Extend ContextHealthMonitor with ACC Events

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T023, T025
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 3: Extend ContextHealthMonitor with ACC Events
**User Story**: [US3]

---

## Issue #25: T025 - Test ACC threshold crossing events in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — simulate utilization ramp, verify each ACC event fires once at correct threshold

**Labels**: `enhancement`, `phase-3-extend-contexthealthmonitor-with-acc-events`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T025 - Test ACC threshold crossing events in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — simulate utilization ramp, verify each ACC event fires once at correct threshold

### Screen described (Mike)

This task involves: Test ACC threshold crossing events in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — simulate utilization ramp, verify each ACC event fires once at correct threshold

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: extend contexthealthmonitor with acc events task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: Extend ContextHealthMonitor with ACC Events

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T024, T026
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 3: Extend ContextHealthMonitor with ACC Events
**User Story**: [US3]

---

## Issue #26: T026 - Test existing events unaffected in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — verify auto-save at 65% and critical at 70% still fire correctly with ACC events added

**Labels**: `enhancement`, `phase-3-extend-contexthealthmonitor-with-acc-events`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T026 - Test existing events unaffected in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — verify auto-save at 65% and critical at 70% still fire correctly with ACC events added

### Screen described (Mike)

This task involves: Test existing events unaffected in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — verify auto-save at 65% and critical at 70% still fire correctly with ACC events added

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: extend contexthealthmonitor with acc events task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: Extend ContextHealthMonitor with ACC Events

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T025, T027
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 3: Extend ContextHealthMonitor with ACC Events
**User Story**: [US3]

---

## Issue #27: T027 - Test event ordering in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — verify auto-save fires before critical, critical before ACC events, ACC events in threshold order

**Labels**: `enhancement`, `phase-3-extend-contexthealthmonitor-with-acc-events`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T027 - Test event ordering in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — verify auto-save fires before critical, critical before ACC events, ACC events in threshold order

### Screen described (Mike)

This task involves: Test event ordering in `extension/src/autonomous/__tests__/ContextHealthMonitor.acc-events.test.ts` — verify auto-save fires before critical, critical before ACC events, ACC events in threshold order

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: extend contexthealthmonitor with acc events task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: Extend ContextHealthMonitor with ACC Events

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T026, T028
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 3: Extend ContextHealthMonitor with ACC Events
**User Story**: [US3]

---

## Issue #28: T028 - Create ACCOrchestrator class in `extension/src/autonomous/ACCOrchestrator.ts` — implement `connect(monitor)` following AutoHandoffTrigger pattern; constructor takes shared ContextBuilder, ObservationMasker, SubAgentDispatcher, ContextCompactor; implement `dispose()` cleaning up listeners

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T028 - Create ACCOrchestrator class in `extension/src/autonomous/ACCOrchestrator.ts` — implement `connect(monitor)` following AutoHandoffTrigger pattern; constructor takes shared ContextBuilder, ObservationMasker, SubAgentDispatcher, ContextCompactor; implement `dispose()` cleaning up listeners

### Screen described (Mike)

This task involves: Create ACCOrchestrator class in `extension/src/autonomous/ACCOrchestrator.ts` — implement `connect(monitor)` following AutoHandoffTrigger pattern; constructor takes shared ContextBuilder, ObservationMasker, SubAgentDispatcher, ContextCompactor; implement `dispose()` cleaning up listeners

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T027, T029
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #29: T029 - Implement stage handlers in `extension/src/autonomous/ACCOrchestrator.ts` — Stage 1 (70%/critical): log + delegation advisory; Stage 2 (80%): `maskOldObservations()` with reduced thresholds; Stage 3 (85%): budget enforcement truncate mode; Stage 4 (90%): force all to masked tier; Stage 5 (99%): `ContextCompactor.compact()` with aggressive strategy

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T029 - Implement stage handlers in `extension/src/autonomous/ACCOrchestrator.ts` — Stage 1 (70%/critical): log + delegation advisory; Stage 2 (80%): `maskOldObservations()` with reduced thresholds; Stage 3 (85%): budget enforcement truncate mode; Stage 4 (90%): force all to masked tier; Stage 5 (99%): `ContextCompactor.compact()` with aggressive strategy

### Screen described (Mike)

This task involves: Implement stage handlers in `extension/src/autonomous/ACCOrchestrator.ts` — Stage 1 (70%/critical): log + delegation advisory; Stage 2 (80%): `maskOldObservations()` with reduced thresholds; Stage 3 (85%): budget enforcement truncate mode; Stage 4 (90%): force all to masked tier; Stage 5 (99%): `ContextCompactor.compact()` with aggressive strategy

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T028, T030
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #30: T030 - Implement cooldown logic in `extension/src/autonomous/ACCOrchestrator.ts` — minimum 30s between same-stage actions; higher stages supersede lower; all stages non-fatal (try/catch with warning log)

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T030 - Implement cooldown logic in `extension/src/autonomous/ACCOrchestrator.ts` — minimum 30s between same-stage actions; higher stages supersede lower; all stages non-fatal (try/catch with warning log)

### Screen described (Mike)

This task involves: Implement cooldown logic in `extension/src/autonomous/ACCOrchestrator.ts` — minimum 30s between same-stage actions; higher stages supersede lower; all stages non-fatal (try/catch with warning log)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T029, T031
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #31: T031 - Wire ACCOrchestrator in `initializeForWorkspace()` in `extension/src/extension.ts` — create after ContextHealthMonitor and ContextBuilder, call `connect(monitor)`, store in state for disposal

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T031 - Wire ACCOrchestrator in `initializeForWorkspace()` in `extension/src/extension.ts` — create after ContextHealthMonitor and ContextBuilder, call `connect(monitor)`, store in state for disposal

### Screen described (Mike)

This task involves: Wire ACCOrchestrator in `initializeForWorkspace()` in `extension/src/extension.ts` — create after ContextHealthMonitor and ContextBuilder, call `connect(monitor)`, store in state for disposal

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T030, T032
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #32: T032 - Test each stage fires at correct threshold in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — mock monitor, emit events at 70/80/85/90/99%, verify corresponding handler called

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T032 - Test each stage fires at correct threshold in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — mock monitor, emit events at 70/80/85/90/99%, verify corresponding handler called

### Screen described (Mike)

This task involves: Test each stage fires at correct threshold in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — mock monitor, emit events at 70/80/85/90/99%, verify corresponding handler called

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T031, T033
**File Path**: `Multiple files or TBD`
**Estimated Effort**: L (1-2 days)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #33: T033 - Test cooldown prevents rapid re-triggering in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — emit same event twice within 30s, verify handler called only once

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T033 - Test cooldown prevents rapid re-triggering in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — emit same event twice within 30s, verify handler called only once

### Screen described (Mike)

This task involves: Test cooldown prevents rapid re-triggering in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — emit same event twice within 30s, verify handler called only once

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T032, T034
**File Path**: `Multiple files or TBD`
**Estimated Effort**: L (1-2 days)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #34: T034 - Test higher stages supersede lower in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — emit stage 4 (90%) while stage 2 (80%) cooldown active, verify stage 4 executes

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T034 - Test higher stages supersede lower in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — emit stage 4 (90%) while stage 2 (80%) cooldown active, verify stage 4 executes

### Screen described (Mike)

This task involves: Test higher stages supersede lower in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — emit stage 4 (90%) while stage 2 (80%) cooldown active, verify stage 4 executes

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T033, T035
**File Path**: `Multiple files or TBD`
**Estimated Effort**: L (1-2 days)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #35: T035 - Test all stages non-fatal in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — make each component throw, verify error logged but no exception propagated

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T035 - Test all stages non-fatal in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — make each component throw, verify error logged but no exception propagated

### Screen described (Mike)

This task involves: Test all stages non-fatal in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — make each component throw, verify error logged but no exception propagated

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T034, T036
**File Path**: `Multiple files or TBD`
**Estimated Effort**: L (1-2 days)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #36: T036 - Test dispose cleans up listeners in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — call `dispose()`, verify no events received after disposal

**Labels**: `enhancement`, `phase-4-implement-accorchestrator`, `us3`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T036 - Test dispose cleans up listeners in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — call `dispose()`, verify no events received after disposal

### Screen described (Mike)

This task involves: Test dispose cleans up listeners in `extension/src/autonomous/__tests__/ACCOrchestrator.test.ts` — call `dispose()`, verify no events received after disposal

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: implement accorchestrator task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 4: Implement ACCOrchestrator

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T035, T037
**File Path**: `Multiple files or TBD`
**Estimated Effort**: L (1-2 days)
**Phase**: Phase 4: Implement ACCOrchestrator
**User Story**: [US3]

---

## Issue #37: T037 - Wire SubAgentDispatcher in `initializeForWorkspace()` in `extension/src/extension.ts` — create instance, call `contextBuilder.setSubAgentDispatcher()`, wire to ContextHealthMonitor events for `updateUtilization()` calls

**Labels**: `enhancement`, `phase-5-wire-subagentdispatcher-memorylayermanager`, `us4`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T037 - Wire SubAgentDispatcher in `initializeForWorkspace()` in `extension/src/extension.ts` — create instance, call `contextBuilder.setSubAgentDispatcher()`, wire to ContextHealthMonitor events for `updateUtilization()` calls

### Screen described (Mike)

This task involves: Wire SubAgentDispatcher in `initializeForWorkspace()` in `extension/src/extension.ts` — create instance, call `contextBuilder.setSubAgentDispatcher()`, wire to ContextHealthMonitor events for `updateUtilization()` calls

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 5: wire subagentdispatcher + memorylayermanager task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: Wire SubAgentDispatcher + MemoryLayerManager

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T036, T038
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 5: Wire SubAgentDispatcher + MemoryLayerManager
**User Story**: [US4]

---

## Issue #38: T038 - Wire MemoryLayerManager in `initializeForWorkspace()` in `extension/src/extension.ts` — create instance, call `setMemoryManager()`, wire to ContextBuilder via `setMemoryLayerManager(manager, false)` (disabled by default)

**Labels**: `enhancement`, `phase-5-wire-subagentdispatcher-memorylayermanager`, `us5`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T038 - Wire MemoryLayerManager in `initializeForWorkspace()` in `extension/src/extension.ts` — create instance, call `setMemoryManager()`, wire to ContextBuilder via `setMemoryLayerManager(manager, false)` (disabled by default)

### Screen described (Mike)

This task involves: Wire MemoryLayerManager in `initializeForWorkspace()` in `extension/src/extension.ts` — create instance, call `setMemoryManager()`, wire to ContextBuilder via `setMemoryLayerManager(manager, false)` (disabled by default)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by delivering core functionality.

**Impact**: This is a phase 5: wire subagentdispatcher + memorylayermanager task that supports [US5].

**Priority**: P2 (Medium) - Part of Phase 5: Wire SubAgentDispatcher + MemoryLayerManager

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T037, T039
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 5: Wire SubAgentDispatcher + MemoryLayerManager
**User Story**: [US5]

---

## Issue #39: T039 - Test SubAgentDispatcher in `extension/src/autonomous/__tests__/SubAgentDispatcher.test.ts` — test delegation recommendations at 50/60/70% utilization, test `formatAsContextSection()` markdown output, test result truncation per agent type (2000/1500/1000 tokens)

**Labels**: `enhancement`, `phase-5-wire-subagentdispatcher-memorylayermanager`, `us4`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T039 - Test SubAgentDispatcher in `extension/src/autonomous/__tests__/SubAgentDispatcher.test.ts` — test delegation recommendations at 50/60/70% utilization, test `formatAsContextSection()` markdown output, test result truncation per agent type (2000/1500/1000 tokens)

### Screen described (Mike)

This task involves: Test SubAgentDispatcher in `extension/src/autonomous/__tests__/SubAgentDispatcher.test.ts` — test delegation recommendations at 50/60/70% utilization, test `formatAsContextSection()` markdown output, test result truncation per agent type (2000/1500/1000 tokens)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 5: wire subagentdispatcher + memorylayermanager task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: Wire SubAgentDispatcher + MemoryLayerManager

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T038, T040
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 5: Wire SubAgentDispatcher + MemoryLayerManager
**User Story**: [US4]

---

## Issue #40: T040 - Test MemoryLayerManager in `extension/src/autonomous/__tests__/MemoryLayerManager.test.ts` — test core/recall/archival layer separation with tagged memories, test recall window filtering (1hr), test priority-based demotion when recall exceeds limit, test `formatAsContextSection()` output

**Labels**: `enhancement`, `phase-5-wire-subagentdispatcher-memorylayermanager`, `us5`, `parallel`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T040 - Test MemoryLayerManager in `extension/src/autonomous/__tests__/MemoryLayerManager.test.ts` — test core/recall/archival layer separation with tagged memories, test recall window filtering (1hr), test priority-based demotion when recall exceeds limit, test `formatAsContextSection()` output

### Screen described (Mike)

This task involves: Test MemoryLayerManager in `extension/src/autonomous/__tests__/MemoryLayerManager.test.ts` — test core/recall/archival layer separation with tagged memories, test recall window filtering (1hr), test priority-based demotion when recall exceeds limit, test `formatAsContextSection()` output

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 5: wire subagentdispatcher + memorylayermanager task that supports [US5].

**Priority**: P2 (Medium) - Part of Phase 5: Wire SubAgentDispatcher + MemoryLayerManager

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T039, T041
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 5: Wire SubAgentDispatcher + MemoryLayerManager
**User Story**: [US5]

---

## Issue #41: T041 - Write ACC integration test in `extension/src/autonomous/__tests__/acc-integration.test.ts` — test full utilization ramp (0→100%), verify each ACC stage fires and delegates correctly; test ACCOrchestrator + AutoHandoffTrigger coexistence; test observation tracking → masking → cache persistence lifecycle

**Labels**: `enhancement`, `phase-6-integration-testing-polish`, `us3`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T041 - Write ACC integration test in `extension/src/autonomous/__tests__/acc-integration.test.ts` — test full utilization ramp (0→100%), verify each ACC stage fires and delegates correctly; test ACCOrchestrator + AutoHandoffTrigger coexistence; test observation tracking → masking → cache persistence lifecycle

### Screen described (Mike)

This task involves: Write ACC integration test in `extension/src/autonomous/__tests__/acc-integration.test.ts` — test full utilization ramp (0→100%), verify each ACC stage fires and delegates correctly; test ACCOrchestrator + AutoHandoffTrigger coexistence; test observation tracking → masking → cache persistence lifecycle

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: integration testing & polish task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 6: Integration Testing & Polish

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T040, T042
**File Path**: `Multiple files or TBD`
**Estimated Effort**: L (1-2 days)
**Phase**: Phase 6: Integration Testing & Polish
**User Story**: [US3]

---

## Issue #42: T042 - Verify build passes — run `cd extension && npm run compile`

**Labels**: `enhancement`, `phase-6-integration-testing-polish`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T042 - Verify build passes — run `cd extension && npm run compile`

### Screen described (Mike)

This task involves: Verify build passes — run `cd extension && npm run compile`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by advancing feature implementation.

**Impact**: This is a phase 6: integration testing & polish task that provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Integration Testing & Polish

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T041, T043
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 6: Integration Testing & Polish


---

## Issue #43: T043 - Verify all tests pass — run `cd extension && npm test`

**Labels**: `enhancement`, `phase-6-integration-testing-polish`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T043 - Verify all tests pass — run `cd extension && npm test`

### Screen described (Mike)

This task involves: Verify all tests pass — run `cd extension && npm test`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: integration testing & polish task that provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Integration Testing & Polish

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T042, T044
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 6: Integration Testing & Polish


---

## Issue #44: T044 - Verify lint passes — run `cd extension && npm run lint && npm run format`

**Labels**: `enhancement`, `phase-6-integration-testing-polish`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: T044 - Verify lint passes — run `cd extension && npm run lint && npm run format`

### Screen described (Mike)

This task involves: Verify lint passes — run `cd extension && npm run lint && npm run format`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by advancing feature implementation.

**Impact**: This is a phase 6: integration testing & polish task that provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Integration Testing & Polish

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `specified files` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

N/A - Configuration or setup task

### Blocks needed (Team)

N/A - High-level setup task

### Definition of Ready

- [ ] Mock up screen signed off (Mike) 
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components, if not identify design and tech approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T043
**File Path**: `Multiple files or TBD`
**Estimated Effort**: M (4-8 hours)
**Phase**: Phase 6: Integration Testing & Polish


---


---

## Summary by Phase

### Phase 1: Wire Shared ContextBuilder (Foundation)
- Issue #1 - #7: 7 issues

### Phase 2: ContextBuilder + ObservationMasker Unit Tests
- Issue #8 - #21: 14 issues

### Phase 3: Extend ContextHealthMonitor with ACC Events
- Issue #22 - #27: 6 issues

### Phase 4: Implement ACCOrchestrator
- Issue #28 - #36: 9 issues

### Phase 5: Wire SubAgentDispatcher + MemoryLayerManager
- Issue #37 - #40: 4 issues

### Phase 6: Integration Testing & Polish
- Issue #41 - #44: 4 issues



---

## Notes

- **All issues**: Pre-filled with enterprise Requirements Ticket template
- **Mike-specific sections**: Review and update before creating issues
- **Assignees**: Adjust based on actual team assignments
- **Dependencies**: Link related issues using #issue-number after creation
- **Sync with tasks.md**: Close issues as tasks are checked off

---

## Quick Stats

- **Total Issues**: 44
- **Parallel Tasks**: 27
- **Story-specific**: 41
- **Infrastructure**: 3

---

**Next Steps**:
1. Review each issue for completeness
2. Update Mike-specific sections (Screen described, Fields, Data, Navigation)
3. Confirm assignees and effort estimates
4. Create issues in GitHub using your preferred method
5. Link issues back to this document and tasks.md
