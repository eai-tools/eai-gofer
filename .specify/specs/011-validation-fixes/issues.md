---
description: 'GitHub issues for Unknown Feature - ready to create in GitHub'
---

# GitHub Issues: Unknown Feature

**Generated from**: tasks.md **Feature ID**: unknown **Total Issues**: 18
**Generated**: 2026-03-06

This file contains GitHub-ready issue definitions for each task in tasks.md.
Each issue follows the Requirements Ticket template from
enterpriseaigroup/Issues2025.

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

**Option 3: GitHub API** Use the GitHub REST API with automation scripts.

---

## Issue #1: T001 - Add `private instructionPromptDeclined = false` instance variable to `GoferMigrator` class in `extension/src/goferMigrator.ts` (line 34 area, alongside other private fields)

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T001 - Add
`private instructionPromptDeclined = false` instance variable to `GoferMigrator`
class in `extension/src/goferMigrator.ts` (line 34 area, alongside other private
fields)

### Screen described (Mike)

This task involves: Add `private instructionPromptDeclined = false` instance
variable to `GoferMigrator` class in `extension/src/goferMigrator.ts` (line 34
area, alongside other private fields)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T002 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #2: T002 - Modify `syncMissingResources()` in `extension/src/goferMigrator.ts` at line 472-475 to: (1) check `this.instructionPromptDeclined` first -- if true, skip silently; (2) show `vscode.window.showInformationMessage()` with "Yes"/"No" options; (3) if "Yes", proceed with `this.resourceSyncer.setupDefaultInstructions()`; (4) if "No", set `this.instructionPromptDeclined = true` and skip; (5) if dismissed (undefined), skip this invocation but do NOT set the decline flag

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T002 - Modify
`syncMissingResources()` in `extension/src/goferMigrator.ts` at line 472-475 to:
(1) check `this.instructionPromptDeclined` first -- if true, skip silently; (2)
show `vscode.window.showInformationMessage()` with "Yes"/"No" options; (3) if
"Yes", proceed with `this.resourceSyncer.setupDefaultInstructions()`; (4) if
"No", set `this.instructionPromptDeclined = true` and skip; (5) if dismissed
(undefined), skip this invocation but do NOT set the decline flag

### Screen described (Mike)

This task involves: Modify `syncMissingResources()` in
`extension/src/goferMigrator.ts` at line 472-475 to: (1) check
`this.instructionPromptDeclined` first -- if true, skip silently; (2) show
`vscode.window.showInformationMessage()` with "Yes"/"No" options; (3) if "Yes",
proceed with `this.resourceSyncer.setupDefaultInstructions()`; (4) if "No", set
`this.instructionPromptDeclined = true` and skip; (5) if dismissed (undefined),
skip this invocation but do NOT set the decline flag

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T001, T003 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #3: T003 - Write unit test: prompt is shown when AI instructions are missing, in `tests/unit/extension/GoferMigrator.test.ts`

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T003 - Write unit test:
prompt is shown when AI instructions are missing, in
`tests/unit/extension/GoferMigrator.test.ts`

### Screen described (Mike)

This task involves: Write unit test: prompt is shown when AI instructions are
missing, in `tests/unit/extension/GoferMigrator.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T002, T004 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #4: T004 - Write unit test: files are generated when user selects "Yes", in `tests/unit/extension/GoferMigrator.test.ts`

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T004 - Write unit
test: files are generated when user selects "Yes", in
`tests/unit/extension/GoferMigrator.test.ts`

### Screen described (Mike)

This task involves: Write unit test: files are generated when user selects
"Yes", in `tests/unit/extension/GoferMigrator.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T003, T005 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #5: T005 - Write unit test: files are NOT generated when user selects "No", in `tests/unit/extension/GoferMigrator.test.ts`

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T005 - Write unit
test: files are NOT generated when user selects "No", in
`tests/unit/extension/GoferMigrator.test.ts`

### Screen described (Mike)

This task involves: Write unit test: files are NOT generated when user selects
"No", in `tests/unit/extension/GoferMigrator.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T004, T006 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #6: T006 - Write unit test: no prompt shown on second call after decline (session persistence), in `tests/unit/extension/GoferMigrator.test.ts`

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T006 - Write unit
test: no prompt shown on second call after decline (session persistence), in
`tests/unit/extension/GoferMigrator.test.ts`

### Screen described (Mike)

This task involves: Write unit test: no prompt shown on second call after
decline (session persistence), in `tests/unit/extension/GoferMigrator.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T005, T007 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #7: T007 - Write unit test: dismissed prompt (undefined response) does not set decline flag -- prompt reappears on next call, in `tests/unit/extension/GoferMigrator.test.ts`

**Labels**: `enhancement`, `phase-1-user-consent-prompt-us1-p1-red-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T007 - Write unit
test: dismissed prompt (undefined response) does not set decline flag -- prompt
reappears on next call, in `tests/unit/extension/GoferMigrator.test.ts`

### Screen described (Mike)

This task involves: Write unit test: dismissed prompt (undefined response) does
not set decline flag -- prompt reappears on next call, in
`tests/unit/extension/GoferMigrator.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: user consent prompt (us1 - p1, red) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 1: User Consent Prompt (US1 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T006, T008 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 1: User Consent Prompt (US1 - P1, RED)
**User Story**: [US1]

---

## Issue #8: T008 - Add `{ file: 'setup.py', language: 'python' }` and `{ file: 'requirements.txt', language: 'python' }` to the `checks` array in `detectLanguage()` at line 69 of `extension/src/services/ProjectDetector.ts` (after `pyproject.toml`, before `go.mod`)

**Labels**: `enhancement`, `phase-2-python-detection-us3-p2-yellow-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T008 - Add
`{ file: 'setup.py', language: 'python' }` and
`{ file: 'requirements.txt', language: 'python' }` to the `checks` array in
`detectLanguage()` at line 69 of `extension/src/services/ProjectDetector.ts`
(after `pyproject.toml`, before `go.mod`)

### Screen described (Mike)

This task involves: Add `{ file: 'setup.py', language: 'python' }` and
`{ file: 'requirements.txt', language: 'python' }` to the `checks` array in
`detectLanguage()` at line 69 of `extension/src/services/ProjectDetector.ts`
(after `pyproject.toml`, before `go.mod`)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 2: python detection (us3 - p2, yellow) task that
supports [US3].

**Priority**: P1 (High) - Part of Phase 2: Python Detection (US3 - P2, YELLOW)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T007, T009 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Python Detection (US3 - P2, YELLOW)
**User Story**: [US3]

---

## Issue #9: T009 - Write unit test: workspace with only `setup.py` detects as "python", in `tests/unit/services/ProjectDetector.test.ts`

**Labels**: `enhancement`, `phase-2-python-detection-us3-p2-yellow-`, `us3`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T009 - Write unit
test: workspace with only `setup.py` detects as "python", in
`tests/unit/services/ProjectDetector.test.ts`

### Screen described (Mike)

This task involves: Write unit test: workspace with only `setup.py` detects as
"python", in `tests/unit/services/ProjectDetector.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: python detection (us3 - p2, yellow) task that
supports [US3].

**Priority**: P1 (High) - Part of Phase 2: Python Detection (US3 - P2, YELLOW)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T008, T010 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Python Detection (US3 - P2, YELLOW)
**User Story**: [US3]

---

## Issue #10: T010 - Write unit test: workspace with only `requirements.txt` detects as "python", in `tests/unit/services/ProjectDetector.test.ts`

**Labels**: `enhancement`, `phase-2-python-detection-us3-p2-yellow-`, `us3`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T010 - Write unit
test: workspace with only `requirements.txt` detects as "python", in
`tests/unit/services/ProjectDetector.test.ts`

### Screen described (Mike)

This task involves: Write unit test: workspace with only `requirements.txt`
detects as "python", in `tests/unit/services/ProjectDetector.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: python detection (us3 - p2, yellow) task that
supports [US3].

**Priority**: P1 (High) - Part of Phase 2: Python Detection (US3 - P2, YELLOW)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T009, T011 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Python Detection (US3 - P2, YELLOW)
**User Story**: [US3]

---

## Issue #11: T011 - Write unit test: workspace with `pyproject.toml` AND `setup.py` detects via `pyproject.toml` (priority order preserved), in `tests/unit/services/ProjectDetector.test.ts`

**Labels**: `enhancement`, `phase-2-python-detection-us3-p2-yellow-`, `us3`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T011 - Write unit
test: workspace with `pyproject.toml` AND `setup.py` detects via
`pyproject.toml` (priority order preserved), in
`tests/unit/services/ProjectDetector.test.ts`

### Screen described (Mike)

This task involves: Write unit test: workspace with `pyproject.toml` AND
`setup.py` detects via `pyproject.toml` (priority order preserved), in
`tests/unit/services/ProjectDetector.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: python detection (us3 - p2, yellow) task that
supports [US3].

**Priority**: P1 (High) - Part of Phase 2: Python Detection (US3 - P2, YELLOW)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T010, T012 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Python Detection (US3 - P2, YELLOW)
**User Story**: [US3]

---

## Issue #12: T012 - Write unit test: workspace with `tsconfig.json` AND `requirements.txt` detects as "typescript" (higher priority wins), in `tests/unit/services/ProjectDetector.test.ts`

**Labels**: `enhancement`, `phase-2-python-detection-us3-p2-yellow-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T012 - Write unit test:
workspace with `tsconfig.json` AND `requirements.txt` detects as "typescript"
(higher priority wins), in `tests/unit/services/ProjectDetector.test.ts`

### Screen described (Mike)

This task involves: Write unit test: workspace with `tsconfig.json` AND
`requirements.txt` detects as "typescript" (higher priority wins), in
`tests/unit/services/ProjectDetector.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: python detection (us3 - p2, yellow) task that
supports [US3].

**Priority**: P1 (High) - Part of Phase 2: Python Detection (US3 - P2, YELLOW)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T011, T013 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Python Detection (US3 - P2, YELLOW)
**User Story**: [US3]

---

## Issue #13: T013 - Create `tests/integration/instruction-generation.test.ts` with test structure: (1) Setup temp workspace with `package.json` only (JavaScript project); (2) Run `ProjectDetector.detect()` and `InstructionGenerator.generateClaudeMd()` -- verify content references "JavaScript"; (3) Write `tsconfig.json` to workspace; (4) Re-run `ProjectDetector.detect()` and `InstructionGenerator.generateClaudeMd()` -- verify content now references "TypeScript"; (5) Cleanup temp workspace

**Labels**: `enhancement`,
`phase-3-integration-test-for-regeneration-re-detection-us2-p1-red-`, `us2`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T013 - Create
`tests/integration/instruction-generation.test.ts` with test structure: (1)
Setup temp workspace with `package.json` only (JavaScript project); (2) Run
`ProjectDetector.detect()` and `InstructionGenerator.generateClaudeMd()` --
verify content references "JavaScript"; (3) Write `tsconfig.json` to workspace;
(4) Re-run `ProjectDetector.detect()` and
`InstructionGenerator.generateClaudeMd()` -- verify content now references
"TypeScript"; (5) Cleanup temp workspace

### Screen described (Mike)

This task involves: Create `tests/integration/instruction-generation.test.ts`
with test structure: (1) Setup temp workspace with `package.json` only
(JavaScript project); (2) Run `ProjectDetector.detect()` and
`InstructionGenerator.generateClaudeMd()` -- verify content references
"JavaScript"; (3) Write `tsconfig.json` to workspace; (4) Re-run
`ProjectDetector.detect()` and `InstructionGenerator.generateClaudeMd()` --
verify content now references "TypeScript"; (5) Cleanup temp workspace

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: integration test for regeneration re-detection
(us2 - p1, red) task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: Integration Test for Regeneration
Re-Detection (US2 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T012, T014 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: Integration Test for Regeneration
Re-Detection (US2 - P1, RED) **User Story**: [US2]

---

## Issue #14: T014 - Verify the integration test uses real `FileUtils` (unmocked fs) since this is an integration test operating on actual temp directories, following existing patterns from `tests/integration/command-registration.test.ts`

**Labels**: `enhancement`,
`phase-3-integration-test-for-regeneration-re-detection-us2-p1-red-`, `us2`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T014 - Verify the
integration test uses real `FileUtils` (unmocked fs) since this is an
integration test operating on actual temp directories, following existing
patterns from `tests/integration/command-registration.test.ts`

### Screen described (Mike)

This task involves: Verify the integration test uses real `FileUtils` (unmocked
fs) since this is an integration test operating on actual temp directories,
following existing patterns from
`tests/integration/command-registration.test.ts`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: integration test for regeneration re-detection
(us2 - p1, red) task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: Integration Test for Regeneration
Re-Detection (US2 - P1, RED)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T013, T015 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: Integration Test for Regeneration
Re-Detection (US2 - P1, RED) **User Story**: [US2]

---

## Issue #15: T015 - Update test description in `tests/unit/services/InstructionGenerator.test.ts` line 169: change "under 60 lines" to "under 80 lines" (assertion at line 174 already uses `toBeLessThan(80)` -- no assertion change needed)

**Labels**: `enhancement`, `phase-4-documentation-fixes-us4-us5-us6-`, `us4`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T015 - Update
test description in `tests/unit/services/InstructionGenerator.test.ts` line 169:
change "under 60 lines" to "under 80 lines" (assertion at line 174 already uses
`toBeLessThan(80)` -- no assertion change needed)

### Screen described (Mike)

This task involves: Update test description in
`tests/unit/services/InstructionGenerator.test.ts` line 169: change "under 60
lines" to "under 80 lines" (assertion at line 174 already uses
`toBeLessThan(80)` -- no assertion change needed)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: documentation fixes (us4, us5, us6) task that
supports [US4].

**Priority**: P2 (Medium) - Part of Phase 4: Documentation Fixes (US4, US5, US6)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T014, T016 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: Documentation Fixes (US4, US5, US6)
**User Story**: [US4]

---

## Issue #16: T016 - Update `.specify/specs/010-addclaudeinstructions/spec.md` line 283: change `< 60 lines` to `< 80 lines` in the Success Criteria table; and line 348: change `CLAUDE.md < 60 lines optimal` to `CLAUDE.md < 80 lines optimal` in the Research Traceability table

**Labels**: `enhancement`, `phase-4-documentation-fixes-us4-us5-us6-`, `us4`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T016 - Update
`.specify/specs/010-addclaudeinstructions/spec.md` line 283: change `< 60 lines`
to `< 80 lines` in the Success Criteria table; and line 348: change
`CLAUDE.md < 60 lines optimal` to `CLAUDE.md < 80 lines optimal` in the Research
Traceability table

### Screen described (Mike)

This task involves: Update `.specify/specs/010-addclaudeinstructions/spec.md`
line 283: change `< 60 lines` to `< 80 lines` in the Success Criteria table; and
line 348: change `CLAUDE.md < 60 lines optimal` to
`CLAUDE.md < 80 lines optimal` in the Research Traceability table

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 4: documentation fixes (us4, us5, us6) task that
supports [US4].

**Priority**: P2 (Medium) - Part of Phase 4: Documentation Fixes (US4, US5, US6)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T015, T017 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: Documentation Fixes (US4, US5, US6)
**User Story**: [US4]

---

## Issue #17: T017 - Update `.specify/specs/010-addclaudeinstructions/spec.md` lines 106-107: change "overwrite, merge (append new sections), or skip" to "overwrite, skip, or backup & replace"

**Labels**: `enhancement`, `phase-4-documentation-fixes-us4-us5-us6-`, `us5`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T017 - Update
`.specify/specs/010-addclaudeinstructions/spec.md` lines 106-107: change
"overwrite, merge (append new sections), or skip" to "overwrite, skip, or backup
& replace"

### Screen described (Mike)

This task involves: Update `.specify/specs/010-addclaudeinstructions/spec.md`
lines 106-107: change "overwrite, merge (append new sections), or skip" to
"overwrite, skip, or backup & replace"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 4: documentation fixes (us4, us5, us6) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 4: Documentation Fixes (US4, US5, US6)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T016, T018 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: Documentation Fixes (US4, US5, US6)
**User Story**: [US5]

---

## Issue #18: T018 - Update `~/.claude/projects/-Users-douglaswross-Code-gofer/memory/MEMORY.md` section "DEPRECATED: Pipeline auto-chaining via Skill invocation (replaced by sub-agent architecture)" to: (1) Change the section title to remove "DEPRECATED" since Skill-based chaining is the current active pattern; (2) Clarify that Skill-based AUTO-CHAIN is the current implementation; (3) Note that sub-agent dispatch is planned for a future feature (012-subagent-migration); (4) Reference ADR-011-003 for the deferral decision

**Labels**: `enhancement`, `phase-4-documentation-fixes-us4-us5-us6-`, `us6`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T018 - Update
`~/.claude/projects/-Users-douglaswross-Code-gofer/memory/MEMORY.md` section
"DEPRECATED: Pipeline auto-chaining via Skill invocation (replaced by sub-agent
architecture)" to: (1) Change the section title to remove "DEPRECATED" since
Skill-based chaining is the current active pattern; (2) Clarify that Skill-based
AUTO-CHAIN is the current implementation; (3) Note that sub-agent dispatch is
planned for a future feature (012-subagent-migration); (4) Reference ADR-011-003
for the deferral decision

### Screen described (Mike)

This task involves: Update
`~/.claude/projects/-Users-douglaswross-Code-gofer/memory/MEMORY.md` section
"DEPRECATED: Pipeline auto-chaining via Skill invocation (replaced by sub-agent
architecture)" to: (1) Change the section title to remove "DEPRECATED" since
Skill-based chaining is the current active pattern; (2) Clarify that Skill-based
AUTO-CHAIN is the current implementation; (3) Note that sub-agent dispatch is
planned for a future feature (012-subagent-migration); (4) Reference ADR-011-003
for the deferral decision

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 4: documentation fixes (us4, us5, us6) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 4: Documentation Fixes (US4, US5, US6)

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
- [ ] Identify if we can re-use components, if not identify design and tech
      approach and validate (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed (for sub-issues)
- [ ] Tests pass: All related tests execute successfully
- [ ] Code reviewed: Peer review completed

**Related Tasks**: T017 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: Documentation Fixes (US4, US5, US6)
**User Story**: [US6]

---

---

## Summary by Phase

### Phase 1: User Consent Prompt (US1 - P1, RED)

- Issue #1 - #7: 7 issues

### Phase 2: Python Detection (US3 - P2, YELLOW)

- Issue #8 - #12: 5 issues

### Phase 3: Integration Test for Regeneration Re-Detection (US2 - P1, RED)

- Issue #13 - #14: 2 issues

### Phase 4: Documentation Fixes (US4, US5, US6)

- Issue #15 - #18: 4 issues

---

## Notes

- **All issues**: Pre-filled with enterprise Requirements Ticket template
- **Mike-specific sections**: Review and update before creating issues
- **Assignees**: Adjust based on actual team assignments
- **Dependencies**: Link related issues using #issue-number after creation
- **Sync with tasks.md**: Close issues as tasks are checked off

---

## Quick Stats

- **Total Issues**: 18
- **Parallel Tasks**: 10
- **Story-specific**: 18
- **Infrastructure**: 0

---

**Next Steps**:

1. Review each issue for completeness
2. Update Mike-specific sections (Screen described, Fields, Data, Navigation)
3. Confirm assignees and effort estimates
4. Create issues in GitHub using your preferred method
5. Link issues back to this document and tasks.md
