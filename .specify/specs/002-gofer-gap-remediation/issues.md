---
description: 'GitHub issues for Unknown Feature - ready to create in GitHub'
---

# GitHub Issues: Unknown Feature

**Generated from**: tasks.md **Feature ID**: unknown **Total Issues**: 46
**Generated**: 2026-02-28

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

## Issue #1: T001 - Create `extension/src/schemas/pipeline-state.schema.json` with all fields from data-model.md: runId (UUID v4), featureId, featureDir, currentStage (enum of 6 values), completedStages[], startedAt (ISO-8601), updatedAt (ISO-8601), status (enum: initialized/in_progress/completed/error), runMetrics (optional)

**Labels**: `enhancement`, `phase-1-setup-shared-infrastructure-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T001 - Create
`extension/src/schemas/pipeline-state.schema.json` with all fields from
data-model.md: runId (UUID v4), featureId, featureDir, currentStage (enum of 6
values), completedStages[], startedAt (ISO-8601), updatedAt (ISO-8601), status
(enum: initialized/in_progress/completed/error), runMetrics (optional)

### Screen described (Mike)

This task involves: Create `extension/src/schemas/pipeline-state.schema.json`
with all fields from data-model.md: runId (UUID v4), featureId, featureDir,
currentStage (enum of 6 values), completedStages[], startedAt (ISO-8601),
updatedAt (ISO-8601), status (enum: initialized/in_progress/completed/error),
runMetrics (optional)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 1: setup (shared infrastructure) task that supports
[US1].

**Priority**: P1 (High) - Part of Phase 1: Setup (Shared Infrastructure)

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
Effort**: M (4-8 hours) **Phase**: Phase 1: Setup (Shared Infrastructure) **User
Story**: [US1]

---

## Issue #2: T002 - Create `.specify/scripts/bash/pipeline-state.sh` — bash script with `init`, `read`, `update`, `status` commands. Uses `jq` with Python3 fallback. `init` generates UUID runId via `uuidgen || python3 -c 'import uuid; print(uuid.uuid4())'`. Validates stage names against enum. Includes `--feature-dir DIR` and `--json` options per contracts/internal-api.md

**Labels**: `enhancement`, `phase-2-us1-pipeline-state-machine-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T002 - Create
`.specify/scripts/bash/pipeline-state.sh` — bash script with `init`, `read`,
`update`, `status` commands. Uses `jq` with Python3 fallback. `init` generates
UUID runId via `uuidgen || python3 -c 'import uuid; print(uuid.uuid4())'`.
Validates stage names against enum. Includes `--feature-dir DIR` and `--json`
options per contracts/internal-api.md

### Screen described (Mike)

This task involves: Create `.specify/scripts/bash/pipeline-state.sh` — bash
script with `init`, `read`, `update`, `status` commands. Uses `jq` with Python3
fallback. `init` generates UUID runId via
`uuidgen || python3 -c 'import uuid; print(uuid.uuid4())'`. Validates stage
names against enum. Includes `--feature-dir DIR` and `--json` options per
contracts/internal-api.md

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: us1 — pipeline state machine (p1) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 2: US1 — Pipeline State Machine (P1)

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
Effort**: M (4-8 hours) **Phase**: Phase 2: US1 — Pipeline State Machine (P1)
**User Story**: [US1]

---

## Issue #3: T003 - Create `extension/src/autonomous/PipelineStateManager.ts` following ContextUsageLogger pattern — typed PipelineState interface, `async init(workspaceRoot, featureId)`, `async readState()`, `async updateStage(stage)`, `getRunId()`, lazy directory creation via `fs.promises.mkdir({recursive: true})`, graceful fallback on corrupt JSON

**Labels**: `enhancement`, `phase-2-us1-pipeline-state-machine-p1-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T003 - Create
`extension/src/autonomous/PipelineStateManager.ts` following ContextUsageLogger
pattern — typed PipelineState interface, `async init(workspaceRoot, featureId)`,
`async readState()`, `async updateStage(stage)`, `getRunId()`, lazy directory
creation via `fs.promises.mkdir({recursive: true})`, graceful fallback on
corrupt JSON

### Screen described (Mike)

This task involves: Create `extension/src/autonomous/PipelineStateManager.ts`
following ContextUsageLogger pattern — typed PipelineState interface,
`async init(workspaceRoot, featureId)`, `async readState()`,
`async updateStage(stage)`, `getRunId()`, lazy directory creation via
`fs.promises.mkdir({recursive: true})`, graceful fallback on corrupt JSON

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: us1 — pipeline state machine (p1) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 2: US1 — Pipeline State Machine (P1)

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
Effort**: M (4-8 hours) **Phase**: Phase 2: US1 — Pipeline State Machine (P1)
**User Story**: [US1]

---

## Issue #4: T004 - Create `tests/unit/autonomous/PipelineStateManager.test.ts` — test init creates valid JSON with UUID runId, update transitions currentStage and appends to completedStages, corrupt file falls back to re-init, read returns typed PipelineState, concurrent writes don't corrupt

**Labels**: `enhancement`, `phase-2-us1-pipeline-state-machine-p1-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T004 - Create
`tests/unit/autonomous/PipelineStateManager.test.ts` — test init creates valid
JSON with UUID runId, update transitions currentStage and appends to
completedStages, corrupt file falls back to re-init, read returns typed
PipelineState, concurrent writes don't corrupt

### Screen described (Mike)

This task involves: Create `tests/unit/autonomous/PipelineStateManager.test.ts`
— test init creates valid JSON with UUID runId, update transitions currentStage
and appends to completedStages, corrupt file falls back to re-init, read returns
typed PipelineState, concurrent writes don't corrupt

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: us1 — pipeline state machine (p1) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 2: US1 — Pipeline State Machine (P1)

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
Effort**: M (4-8 hours) **Phase**: Phase 2: US1 — Pipeline State Machine (P1)
**User Story**: [US1]

---

## Issue #5: T005 - Create `tests/unit/scripts/pipeline-state.test.ts` — Vitest test that shells out to `pipeline-state.sh init`, verifies JSON output matches schema, tests `update --stage`, tests `status` returns stage name, tests invalid stage name rejection

**Labels**: `enhancement`, `phase-2-us1-pipeline-state-machine-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T005 - Create
`tests/unit/scripts/pipeline-state.test.ts` — Vitest test that shells out to
`pipeline-state.sh init`, verifies JSON output matches schema, tests
`update --stage`, tests `status` returns stage name, tests invalid stage name
rejection

### Screen described (Mike)

This task involves: Create `tests/unit/scripts/pipeline-state.test.ts` — Vitest
test that shells out to `pipeline-state.sh init`, verifies JSON output matches
schema, tests `update --stage`, tests `status` returns stage name, tests invalid
stage name rejection

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: us1 — pipeline state machine (p1) task that
supports [US1].

**Priority**: P1 (High) - Part of Phase 2: US1 — Pipeline State Machine (P1)

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
Effort**: M (4-8 hours) **Phase**: Phase 2: US1 — Pipeline State Machine (P1)
**User Story**: [US1]

---

## Issue #6: T006 - Create `extension/src/schemas/artifact-spec.schema.json` — required: id (string), title (string), status (enum: draft/ready/approved), created (string, date format); optional: updated, author, priority, assignee, dependencies. No `additionalProperties: false` to allow extensibility

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T006 -
Create `extension/src/schemas/artifact-spec.schema.json` — required: id
(string), title (string), status (enum: draft/ready/approved), created (string,
date format); optional: updated, author, priority, assignee, dependencies. No
`additionalProperties: false` to allow extensibility

### Screen described (Mike)

This task involves: Create `extension/src/schemas/artifact-spec.schema.json` —
required: id (string), title (string), status (enum: draft/ready/approved),
created (string, date format); optional: updated, author, priority, assignee,
dependencies. No `additionalProperties: false` to allow extensibility

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T005, T007 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #7: T007 - Create `extension/src/schemas/artifact-plan.schema.json` — required: feature (string), spec (string), status (enum: draft/ready/approved), created (string); optional: research, updated. No `additionalProperties: false`

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T007 -
Create `extension/src/schemas/artifact-plan.schema.json` — required: feature
(string), spec (string), status (enum: draft/ready/approved), created (string);
optional: research, updated. No `additionalProperties: false`

### Screen described (Mike)

This task involves: Create `extension/src/schemas/artifact-plan.schema.json` —
required: feature (string), spec (string), status (enum: draft/ready/approved),
created (string); optional: research, updated. No `additionalProperties: false`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T006, T008 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #8: T008 - Create `extension/src/schemas/artifact-tasks.schema.json` — required: feature (string), plan (string), status (enum: draft/review/approved/ready), created (string); optional: updated, totalTasks, completedTasks, approvedBy, approvedAt. No `additionalProperties: false`

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T008 -
Create `extension/src/schemas/artifact-tasks.schema.json` — required: feature
(string), plan (string), status (enum: draft/review/approved/ready), created
(string); optional: updated, totalTasks, completedTasks, approvedBy, approvedAt.
No `additionalProperties: false`

### Screen described (Mike)

This task involves: Create `extension/src/schemas/artifact-tasks.schema.json` —
required: feature (string), plan (string), status (enum:
draft/review/approved/ready), created (string); optional: updated, totalTasks,
completedTasks, approvedBy, approvedAt. No `additionalProperties: false`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #9: T009 - Create `.specify/scripts/bash/validate-artifact.sh` — accepts `<artifact-type> <file-path> [--json] [--strict]`. Parses YAML frontmatter between `---` markers with `sed`. Validates frontmatter fields against schema (report specific missing/invalid fields). Checks required markdown sections per artifact type (spec: `## User Scenarios` OR `## User Stories`, `## Functional Requirements` OR `## Requirements`, `## Success Criteria`; plan: `## Implementation Phases` OR `## Phases`, `## Tech Stack` OR `## Technical Context`; tasks: at least one `- [ ]` task line). Exit code 0 on pass, 1 on validation error, 2 on file not found. Legacy specs without frontmatter produce warning not error

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2` **Assignees**: @MikeNowosadko **Title**: [Feature]: T009 - Create
`.specify/scripts/bash/validate-artifact.sh` — accepts
`<artifact-type> <file-path> [--json] [--strict]`. Parses YAML frontmatter
between `---` markers with `sed`. Validates frontmatter fields against schema
(report specific missing/invalid fields). Checks required markdown sections per
artifact type (spec: `## User Scenarios` OR `## User Stories`,
`## Functional Requirements` OR `## Requirements`, `## Success Criteria`; plan:
`## Implementation Phases` OR `## Phases`, `## Tech Stack` OR
`## Technical Context`; tasks: at least one `- [ ]` task line). Exit code 0 on
pass, 1 on validation error, 2 on file not found. Legacy specs without
frontmatter produce warning not error

### Screen described (Mike)

This task involves: Create `.specify/scripts/bash/validate-artifact.sh` —
accepts `<artifact-type> <file-path> [--json] [--strict]`. Parses YAML
frontmatter between `---` markers with `sed`. Validates frontmatter fields
against schema (report specific missing/invalid fields). Checks required
markdown sections per artifact type (spec: `## User Scenarios` OR
`## User Stories`, `## Functional Requirements` OR `## Requirements`,
`## Success Criteria`; plan: `## Implementation Phases` OR `## Phases`,
`## Tech Stack` OR `## Technical Context`; tasks: at least one `- [ ]` task
line). Exit code 0 on pass, 1 on validation error, 2 on file not found. Legacy
specs without frontmatter produce warning not error

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T008, T010 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #10: T010 - Modify `.specify/scripts/bash/check-prerequisites.sh` — after existing file-existence checks, call `validate-artifact.sh` for each found artifact. Include validation results in `--json` output as `validationErrors[]` array. When `pipeline-state.json` exists, include `currentStage` and `runId` in JSON output. Non-blocking: validation warnings don't prevent pipeline continuation

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2` **Assignees**: @MikeNowosadko **Title**: [Feature]: T010 - Modify
`.specify/scripts/bash/check-prerequisites.sh` — after existing file-existence
checks, call `validate-artifact.sh` for each found artifact. Include validation
results in `--json` output as `validationErrors[]` array. When
`pipeline-state.json` exists, include `currentStage` and `runId` in JSON output.
Non-blocking: validation warnings don't prevent pipeline continuation

### Screen described (Mike)

This task involves: Modify `.specify/scripts/bash/check-prerequisites.sh` —
after existing file-existence checks, call `validate-artifact.sh` for each found
artifact. Include validation results in `--json` output as `validationErrors[]`
array. When `pipeline-state.json` exists, include `currentStage` and `runId` in
JSON output. Non-blocking: validation warnings don't prevent pipeline
continuation

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T009, T011 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #11: T011 - Add `## Required Output Schema` section to `.claude/commands/1_gofer_research.md` — document required research.md frontmatter (date, researcher, feature, status) and required sections (Feature Summary, Codebase Analysis, Technology Decisions)

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T011 - Add
`## Required Output Schema` section to `.claude/commands/1_gofer_research.md` —
document required research.md frontmatter (date, researcher, feature, status)
and required sections (Feature Summary, Codebase Analysis, Technology Decisions)

### Screen described (Mike)

This task involves: Add `## Required Output Schema` section to
`.claude/commands/1_gofer_research.md` — document required research.md
frontmatter (date, researcher, feature, status) and required sections (Feature
Summary, Codebase Analysis, Technology Decisions)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T010, T012 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #12: T012 - Add `## Required Output Schema` section to `.claude/commands/2_gofer_specify.md` — document required spec.md frontmatter (id, title, status, created) and required sections (User Stories/Scenarios, Functional Requirements, Success Criteria) that the LLM must produce

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T012 - Add
`## Required Output Schema` section to `.claude/commands/2_gofer_specify.md` —
document required spec.md frontmatter (id, title, status, created) and required
sections (User Stories/Scenarios, Functional Requirements, Success Criteria)
that the LLM must produce

### Screen described (Mike)

This task involves: Add `## Required Output Schema` section to
`.claude/commands/2_gofer_specify.md` — document required spec.md frontmatter
(id, title, status, created) and required sections (User Stories/Scenarios,
Functional Requirements, Success Criteria) that the LLM must produce

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T011, T013 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #13: T013 - Add `## Required Output Schema` section to `.claude/commands/3_gofer_plan.md` — document required plan.md frontmatter (feature, spec, status, created) and required sections (Technical Context, Implementation Phases)

**Labels**: `enhancement`, `phase-3-us2-typed-artifact-schemas-validation-p1-`,
`us2`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T013 - Add
`## Required Output Schema` section to `.claude/commands/3_gofer_plan.md` —
document required plan.md frontmatter (feature, spec, status, created) and
required sections (Technical Context, Implementation Phases)

### Screen described (Mike)

This task involves: Add `## Required Output Schema` section to
`.claude/commands/3_gofer_plan.md` — document required plan.md frontmatter
(feature, spec, status, created) and required sections (Technical Context,
Implementation Phases)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us2 — typed artifact schemas + validation (p1)
task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US2 — Typed Artifact Schemas +
Validation (P1)

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

**Related Tasks**: T012, T014 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US2 — Typed Artifact Schemas +
Validation (P1) **User Story**: [US2]

---

## Issue #14: T015 - Create `extension/src/autonomous/RunLedger.ts` — typed `RunLedgerEntry` interface (runId, timestamp, eventType, stage, feature, source, severity, data?), `RunLedgerEventType` union type, class with `constructor(workspaceRoot)`, `async log(entry)` (non-blocking append to `.specify/logs/gofer-run-ledger.jsonl`), `async readLog(limit?)`, `async filterByRunId(runId)`, `async filterByEventType(eventType)`, `getLogPath()`. Follow ContextUsageLogger pattern: lazy dir creation, `fs.promises.appendFile`, JSON.stringify per line

**Labels**: `enhancement`, `phase-4-us3-unified-run-ledger-p2-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T015 - Create
`extension/src/autonomous/RunLedger.ts` — typed `RunLedgerEntry` interface
(runId, timestamp, eventType, stage, feature, source, severity, data?),
`RunLedgerEventType` union type, class with `constructor(workspaceRoot)`,
`async log(entry)` (non-blocking append to
`.specify/logs/gofer-run-ledger.jsonl`), `async readLog(limit?)`,
`async filterByRunId(runId)`, `async filterByEventType(eventType)`,
`getLogPath()`. Follow ContextUsageLogger pattern: lazy dir creation,
`fs.promises.appendFile`, JSON.stringify per line

### Screen described (Mike)

This task involves: Create `extension/src/autonomous/RunLedger.ts` — typed
`RunLedgerEntry` interface (runId, timestamp, eventType, stage, feature, source,
severity, data?), `RunLedgerEventType` union type, class with
`constructor(workspaceRoot)`, `async log(entry)` (non-blocking append to
`.specify/logs/gofer-run-ledger.jsonl`), `async readLog(limit?)`,
`async filterByRunId(runId)`, `async filterByEventType(eventType)`,
`getLogPath()`. Follow ContextUsageLogger pattern: lazy dir creation,
`fs.promises.appendFile`, JSON.stringify per line

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 4: us3 — unified run ledger (p2) task that supports
[US3].

**Priority**: P3 (Low) - Part of Phase 4: US3 — Unified Run Ledger (P2)

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

**Related Tasks**: T014, T016 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: US3 — Unified Run Ledger (P2) **User
Story**: [US3]

---

## Issue #15: T016 - Modify `.specify/scripts/bash/log-stage.sh` — in addition to existing `pipeline.jsonl` write, append a JSONL entry to `gofer-run-ledger.jsonl` with `runId` read from `pipeline-state.json` (if available). Entry format matches RunLedgerEntry: `{"runId":"...", "timestamp":"...", "eventType":"stage_start|stage_complete|stage_error", "stage":"...", "feature":"...", "source":"log-stage", "severity":"info|error"}`

**Labels**: `enhancement`, `phase-4-us3-unified-run-ledger-p2-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T016 - Modify
`.specify/scripts/bash/log-stage.sh` — in addition to existing `pipeline.jsonl`
write, append a JSONL entry to `gofer-run-ledger.jsonl` with `runId` read from
`pipeline-state.json` (if available). Entry format matches RunLedgerEntry:
`{"runId":"...", "timestamp":"...", "eventType":"stage_start|stage_complete|stage_error", "stage":"...", "feature":"...", "source":"log-stage", "severity":"info|error"}`

### Screen described (Mike)

This task involves: Modify `.specify/scripts/bash/log-stage.sh` — in addition to
existing `pipeline.jsonl` write, append a JSONL entry to
`gofer-run-ledger.jsonl` with `runId` read from `pipeline-state.json` (if
available). Entry format matches RunLedgerEntry:
`{"runId":"...", "timestamp":"...", "eventType":"stage_start|stage_complete|stage_error", "stage":"...", "feature":"...", "source":"log-stage", "severity":"info|error"}`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 4: us3 — unified run ledger (p2) task that supports
[US3].

**Priority**: P3 (Low) - Part of Phase 4: US3 — Unified Run Ledger (P2)

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
Effort**: M (4-8 hours) **Phase**: Phase 4: US3 — Unified Run Ledger (P2) **User
Story**: [US3]

---

## Issue #16: T017 - Modify `extension/src/autonomous/ContextUsageLogger.ts` — add `setRunLedger(ledger: RunLedger)` method. Add `private emitMilestone()` that emits to RunLedger on health status transitions (healthy→warning, warning→critical) only, NOT on every 10s poll. Event types: `health_warning`, `health_critical`

**Labels**: `enhancement`, `phase-4-us3-unified-run-ledger-p2-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T017 - Modify
`extension/src/autonomous/ContextUsageLogger.ts` — add
`setRunLedger(ledger: RunLedger)` method. Add `private emitMilestone()` that
emits to RunLedger on health status transitions (healthy→warning,
warning→critical) only, NOT on every 10s poll. Event types: `health_warning`,
`health_critical`

### Screen described (Mike)

This task involves: Modify `extension/src/autonomous/ContextUsageLogger.ts` —
add `setRunLedger(ledger: RunLedger)` method. Add `private emitMilestone()` that
emits to RunLedger on health status transitions (healthy→warning,
warning→critical) only, NOT on every 10s poll. Event types: `health_warning`,
`health_critical`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 4: us3 — unified run ledger (p2) task that supports
[US3].

**Priority**: P3 (Low) - Part of Phase 4: US3 — Unified Run Ledger (P2)

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
Effort**: M (4-8 hours) **Phase**: Phase 4: US3 — Unified Run Ledger (P2) **User
Story**: [US3]

---

## Issue #17: T018 - Modify `extension/src/autonomous/SlopReducer.ts` — add `setRunLedger(ledger: RunLedger)` method. After each successful fix, emit a `slop_fix` event to RunLedger with data: `{pattern, filePath, fixDescription}`

**Labels**: `enhancement`, `phase-4-us3-unified-run-ledger-p2-`, `us3`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T018 - Modify
`extension/src/autonomous/SlopReducer.ts` — add
`setRunLedger(ledger: RunLedger)` method. After each successful fix, emit a
`slop_fix` event to RunLedger with data: `{pattern, filePath, fixDescription}`

### Screen described (Mike)

This task involves: Modify `extension/src/autonomous/SlopReducer.ts` — add
`setRunLedger(ledger: RunLedger)` method. After each successful fix, emit a
`slop_fix` event to RunLedger with data: `{pattern, filePath, fixDescription}`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
improving reliability and user experience.

**Impact**: This is a phase 4: us3 — unified run ledger (p2) task that supports
[US3].

**Priority**: P3 (Low) - Part of Phase 4: US3 — Unified Run Ledger (P2)

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

**Related Tasks**: T017, T019 **File Path**: `Multiple files or TBD` **Estimated
Effort**: S (1-2 hours) **Phase**: Phase 4: US3 — Unified Run Ledger (P2) **User
Story**: [US3]

---

## Issue #18: T019 - Create `tests/unit/autonomous/RunLedger.test.ts` — test: log creates file on first write, entries are valid JSON per line, readLog returns all entries, filterByRunId returns only matching, filterByEventType returns only matching, concurrent writes don't corrupt, readLog with limit returns correct count

**Labels**: `enhancement`, `phase-4-us3-unified-run-ledger-p2-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T019 - Create
`tests/unit/autonomous/RunLedger.test.ts` — test: log creates file on first
write, entries are valid JSON per line, readLog returns all entries,
filterByRunId returns only matching, filterByEventType returns only matching,
concurrent writes don't corrupt, readLog with limit returns correct count

### Screen described (Mike)

This task involves: Create `tests/unit/autonomous/RunLedger.test.ts` — test: log
creates file on first write, entries are valid JSON per line, readLog returns
all entries, filterByRunId returns only matching, filterByEventType returns only
matching, concurrent writes don't corrupt, readLog with limit returns correct
count

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: us3 — unified run ledger (p2) task that supports
[US3].

**Priority**: P3 (Low) - Part of Phase 4: US3 — Unified Run Ledger (P2)

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

**Related Tasks**: T018, T020 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: US3 — Unified Run Ledger (P2) **User
Story**: [US3]

---

## Issue #19: T020 - Create `tests/unit/scripts/log-stage-ledger.test.ts` — test: after `log-stage.sh 3_plan --complete`, both `pipeline.jsonl` and `gofer-run-ledger.jsonl` contain entries, ledger entry has runId from pipeline-state.json

**Labels**: `enhancement`, `phase-4-us3-unified-run-ledger-p2-`, `us3`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T020 - Create
`tests/unit/scripts/log-stage-ledger.test.ts` — test: after
`log-stage.sh 3_plan --complete`, both `pipeline.jsonl` and
`gofer-run-ledger.jsonl` contain entries, ledger entry has runId from
pipeline-state.json

### Screen described (Mike)

This task involves: Create `tests/unit/scripts/log-stage-ledger.test.ts` — test:
after `log-stage.sh 3_plan --complete`, both `pipeline.jsonl` and
`gofer-run-ledger.jsonl` contain entries, ledger entry has runId from
pipeline-state.json

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 4: us3 — unified run ledger (p2) task that supports
[US3].

**Priority**: P3 (Low) - Part of Phase 4: US3 — Unified Run Ledger (P2)

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

**Related Tasks**: T019, T021 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 4: US3 — Unified Run Ledger (P2) **User
Story**: [US3]

---

## Issue #20: T021 - Create `extension/src/autonomous/ToolAuditLogger.ts` — typed `ToolAuditEntry` interface (timestamp, runId, agent, filePath, protectedPattern, enforcement, outcome), class with `constructor(workspaceRoot, runLedger?)`, `async logCheck(entry)` (append to `.specify/logs/tool-audit.jsonl`), `async readLog(limit?)`, `getLogPath()`. If RunLedger provided, also emit `scope_violation` event to ledger on warned/blocked outcomes

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T021 - Create
`extension/src/autonomous/ToolAuditLogger.ts` — typed `ToolAuditEntry` interface
(timestamp, runId, agent, filePath, protectedPattern, enforcement, outcome),
class with `constructor(workspaceRoot, runLedger?)`, `async logCheck(entry)`
(append to `.specify/logs/tool-audit.jsonl`), `async readLog(limit?)`,
`getLogPath()`. If RunLedger provided, also emit `scope_violation` event to
ledger on warned/blocked outcomes

### Screen described (Mike)

This task involves: Create `extension/src/autonomous/ToolAuditLogger.ts` — typed
`ToolAuditEntry` interface (timestamp, runId, agent, filePath, protectedPattern,
enforcement, outcome), class with `constructor(workspaceRoot, runLedger?)`,
`async logCheck(entry)` (append to `.specify/logs/tool-audit.jsonl`),
`async readLog(limit?)`, `getLogPath()`. If RunLedger provided, also emit
`scope_violation` event to ledger on warned/blocked outcomes

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T020, T022 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #21: T022 - Modify `extension/src/autonomous/ScopeGuard.ts` — change default enforcement from `'advisory'` to `'warning'` (line 29). Add `export class ScopeViolationError extends Error` with fields: `filePath`, `protectedPattern`, `enforcement`. In `check()` method: if mode is `blocking` and pattern matches, throw `ScopeViolationError` instead of returning pattern. Add `setToolAuditLogger(logger: ToolAuditLogger)` method. Call audit logger in `check()` for every invocation (outcome: allowed/warned/blocked)

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T022 - Modify
`extension/src/autonomous/ScopeGuard.ts` — change default enforcement from
`'advisory'` to `'warning'` (line 29). Add
`export class ScopeViolationError extends Error` with fields: `filePath`,
`protectedPattern`, `enforcement`. In `check()` method: if mode is `blocking`
and pattern matches, throw `ScopeViolationError` instead of returning pattern.
Add `setToolAuditLogger(logger: ToolAuditLogger)` method. Call audit logger in
`check()` for every invocation (outcome: allowed/warned/blocked)

### Screen described (Mike)

This task involves: Modify `extension/src/autonomous/ScopeGuard.ts` — change
default enforcement from `'advisory'` to `'warning'` (line 29). Add
`export class ScopeViolationError extends Error` with fields: `filePath`,
`protectedPattern`, `enforcement`. In `check()` method: if mode is `blocking`
and pattern matches, throw `ScopeViolationError` instead of returning pattern.
Add `setToolAuditLogger(logger: ToolAuditLogger)` method. Call audit logger in
`check()` for every invocation (outcome: allowed/warned/blocked)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T021, T023 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #22: T023 - Add `gofer.scopeGuard.mode` setting — follow ConfigManager 3-step pattern: (1) add to `CONFIG_KEYS` in `extension/src/config.ts`, (2) add default `'warning'` to `DEFAULTS`, (3) add `getScopeGuardMode(): ScopeEnforcementMode` getter. Add property to `extension/package.json` `contributes.configuration.properties` with enum: `advisory`, `warning`, `blocking`

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T023 - Add
`gofer.scopeGuard.mode` setting — follow ConfigManager 3-step pattern: (1) add
to `CONFIG_KEYS` in `extension/src/config.ts`, (2) add default `'warning'` to
`DEFAULTS`, (3) add `getScopeGuardMode(): ScopeEnforcementMode` getter. Add
property to `extension/package.json` `contributes.configuration.properties` with
enum: `advisory`, `warning`, `blocking`

### Screen described (Mike)

This task involves: Add `gofer.scopeGuard.mode` setting — follow ConfigManager
3-step pattern: (1) add to `CONFIG_KEYS` in `extension/src/config.ts`, (2) add
default `'warning'` to `DEFAULTS`, (3) add
`getScopeGuardMode(): ScopeEnforcementMode` getter. Add property to
`extension/package.json` `contributes.configuration.properties` with enum:
`advisory`, `warning`, `blocking`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T022, T024 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #23: T024 - Modify `extension/src/extension.ts` `initializeForWorkspace()` — after workspace detection, instantiate ScopeGuard, call `loadFromSpec()` with current spec path (if spec exists), set mode from ConfigManager `getScopeGuardMode()`, create ToolAuditLogger and wire to ScopeGuard. Wire into StateManager if available. IMPORTANT: do this in the async `initializeForWorkspace()`, NOT in synchronous `activate()`

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T024 - Modify
`extension/src/extension.ts` `initializeForWorkspace()` — after workspace
detection, instantiate ScopeGuard, call `loadFromSpec()` with current spec path
(if spec exists), set mode from ConfigManager `getScopeGuardMode()`, create
ToolAuditLogger and wire to ScopeGuard. Wire into StateManager if available.
IMPORTANT: do this in the async `initializeForWorkspace()`, NOT in synchronous
`activate()`

### Screen described (Mike)

This task involves: Modify `extension/src/extension.ts`
`initializeForWorkspace()` — after workspace detection, instantiate ScopeGuard,
call `loadFromSpec()` with current spec path (if spec exists), set mode from
ConfigManager `getScopeGuardMode()`, create ToolAuditLogger and wire to
ScopeGuard. Wire into StateManager if available. IMPORTANT: do this in the async
`initializeForWorkspace()`, NOT in synchronous `activate()`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T023, T025 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #24: T025 - Wire ToolAuditLogger into ScopeGuard — in `ScopeGuard.check()`, after determining match/no-match, call `this.auditLogger?.logCheck({timestamp, runId, agent, filePath, protectedPattern, enforcement, outcome})`. Agent name comes from a new `setAgentName(name)` method or constructor parameter

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T025 -
Wire ToolAuditLogger into ScopeGuard — in `ScopeGuard.check()`, after
determining match/no-match, call
`this.auditLogger?.logCheck({timestamp, runId, agent, filePath, protectedPattern, enforcement, outcome})`.
Agent name comes from a new `setAgentName(name)` method or constructor parameter

### Screen described (Mike)

This task involves: Wire ToolAuditLogger into ScopeGuard — in
`ScopeGuard.check()`, after determining match/no-match, call
`this.auditLogger?.logCheck({timestamp, runId, agent, filePath, protectedPattern, enforcement, outcome})`.
Agent name comes from a new `setAgentName(name)` method or constructor parameter

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T024, T026 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #25: T026 - Create `tests/unit/autonomous/ToolAuditLogger.test.ts` — test: logCheck appends to JSONL file, readLog returns entries, RunLedger receives scope_violation on warned outcome, allowed outcome not emitted to ledger, entries have all required fields

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T026 -
Create `tests/unit/autonomous/ToolAuditLogger.test.ts` — test: logCheck appends
to JSONL file, readLog returns entries, RunLedger receives scope_violation on
warned outcome, allowed outcome not emitted to ledger, entries have all required
fields

### Screen described (Mike)

This task involves: Create `tests/unit/autonomous/ToolAuditLogger.test.ts` —
test: logCheck appends to JSONL file, readLog returns entries, RunLedger
receives scope_violation on warned outcome, allowed outcome not emitted to
ledger, entries have all required fields

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T025, T027 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #26: T027 - Create `tests/unit/autonomous/ScopeGuard.test.ts` — test: warning mode returns pattern and produces diagnostic-mappable result, blocking mode throws ScopeViolationError, advisory mode logs to console.warn only, audit entries created for every check, mode change via setter works

**Labels**: `enhancement`, `phase-5-us4-scopeguard-activation-tool-audit-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T027 - Create
`tests/unit/autonomous/ScopeGuard.test.ts` — test: warning mode returns pattern
and produces diagnostic-mappable result, blocking mode throws
ScopeViolationError, advisory mode logs to console.warn only, audit entries
created for every check, mode change via setter works

### Screen described (Mike)

This task involves: Create `tests/unit/autonomous/ScopeGuard.test.ts` — test:
warning mode returns pattern and produces diagnostic-mappable result, blocking
mode throws ScopeViolationError, advisory mode logs to console.warn only, audit
entries created for every check, mode change via setter works

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 5: us4 — scopeguard activation + tool audit (p2)
task that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2)

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

**Related Tasks**: T026, T028 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 5: US4 — ScopeGuard Activation + Tool
Audit (P2) **User Story**: [US4]

---

## Issue #27: T028 - Create `tests/regression/golden-tasks/` directory structure and `tests/regression/golden-tasks/001-engineering-remediation/` subdirectory

**Labels**: `enhancement`, `phase-6-us5-golden-task-regression-suite-p3-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T028 - Create
`tests/regression/golden-tasks/` directory structure and
`tests/regression/golden-tasks/001-engineering-remediation/` subdirectory

### Screen described (Mike)

This task involves: Create `tests/regression/golden-tasks/` directory structure
and `tests/regression/golden-tasks/001-engineering-remediation/` subdirectory

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: us5 — golden task regression suite (p3) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 6: US5 — Golden Task Regression Suite
(P3)

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

**Related Tasks**: T027, T029 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: US5 — Golden Task Regression Suite
(P3) **User Story**: [US5]

---

## Issue #28: T029 - Curate first golden task from `.specify/specs/001-gofer-engineering-remediation/` — copy spec.md, plan.md, tasks.md with minimal valid frontmatter. Ensure all required fields present per artifact schemas. Strip large content sections to keep fixtures small

**Labels**: `enhancement`, `phase-6-us5-golden-task-regression-suite-p3-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T029 - Curate first golden
task from `.specify/specs/001-gofer-engineering-remediation/` — copy spec.md,
plan.md, tasks.md with minimal valid frontmatter. Ensure all required fields
present per artifact schemas. Strip large content sections to keep fixtures
small

### Screen described (Mike)

This task involves: Curate first golden task from
`.specify/specs/001-gofer-engineering-remediation/` — copy spec.md, plan.md,
tasks.md with minimal valid frontmatter. Ensure all required fields present per
artifact schemas. Strip large content sections to keep fixtures small

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
improving reliability and user experience.

**Impact**: This is a phase 6: us5 — golden task regression suite (p3) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 6: US5 — Golden Task Regression Suite
(P3)

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

**Related Tasks**: T028, T030 **File Path**: `Multiple files or TBD` **Estimated
Effort**: S (1-2 hours) **Phase**: Phase 6: US5 — Golden Task Regression Suite
(P3) **User Story**: [US5]

---

## Issue #29: T030 - Create `tests/regression/validate-golden-tasks.test.ts` — uses `fs.readdirSync` to iterate golden task dirs, for each dir runs `validate-artifact.sh` (via `child_process.execFile`) on spec.md/plan.md/tasks.md if they exist, asserts exit code 0, on failure reports specific golden task name + artifact + validation error from stderr/stdout

**Labels**: `enhancement`, `phase-6-us5-golden-task-regression-suite-p3-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T030 - Create
`tests/regression/validate-golden-tasks.test.ts` — uses `fs.readdirSync` to
iterate golden task dirs, for each dir runs `validate-artifact.sh` (via
`child_process.execFile`) on spec.md/plan.md/tasks.md if they exist, asserts
exit code 0, on failure reports specific golden task name + artifact +
validation error from stderr/stdout

### Screen described (Mike)

This task involves: Create `tests/regression/validate-golden-tasks.test.ts` —
uses `fs.readdirSync` to iterate golden task dirs, for each dir runs
`validate-artifact.sh` (via `child_process.execFile`) on
spec.md/plan.md/tasks.md if they exist, asserts exit code 0, on failure reports
specific golden task name + artifact + validation error from stderr/stdout

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: us5 — golden task regression suite (p3) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 6: US5 — Golden Task Regression Suite
(P3)

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

**Related Tasks**: T029, T031 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: US5 — Golden Task Regression Suite
(P3) **User Story**: [US5]

---

## Issue #30: T031 - Create at least 2 additional golden tasks — can be synthetic with valid structure (e.g., `002-sample-feature/spec.md` with minimal but valid frontmatter and required sections, `003-minimal-spec/spec.md` with just the required minimum). Must pass `validate-artifact.sh`

**Labels**: `enhancement`, `phase-6-us5-golden-task-regression-suite-p3-`,
`us5`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T031 -
Create at least 2 additional golden tasks — can be synthetic with valid
structure (e.g., `002-sample-feature/spec.md` with minimal but valid frontmatter
and required sections, `003-minimal-spec/spec.md` with just the required
minimum). Must pass `validate-artifact.sh`

### Screen described (Mike)

This task involves: Create at least 2 additional golden tasks — can be synthetic
with valid structure (e.g., `002-sample-feature/spec.md` with minimal but valid
frontmatter and required sections, `003-minimal-spec/spec.md` with just the
required minimum). Must pass `validate-artifact.sh`

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 6: us5 — golden task regression suite (p3) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 6: US5 — Golden Task Regression Suite
(P3)

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

**Related Tasks**: T030, T032 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: US5 — Golden Task Regression Suite
(P3) **User Story**: [US5]

---

## Issue #31: T032 - Create `tests/regression/README.md` — document: what golden tasks are, how to add one (copy spec dir, verify with `validate-artifact.sh`, commit), minimum required artifacts, naming convention (NNN-description/), curation criteria (must pass all validation, should represent real usage patterns)

**Labels**: `enhancement`, `phase-6-us5-golden-task-regression-suite-p3-`,
`us5`, `parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T032 -
Create `tests/regression/README.md` — document: what golden tasks are, how to
add one (copy spec dir, verify with `validate-artifact.sh`, commit), minimum
required artifacts, naming convention (NNN-description/), curation criteria
(must pass all validation, should represent real usage patterns)

### Screen described (Mike)

This task involves: Create `tests/regression/README.md` — document: what golden
tasks are, how to add one (copy spec dir, verify with `validate-artifact.sh`,
commit), minimum required artifacts, naming convention (NNN-description/),
curation criteria (must pass all validation, should represent real usage
patterns)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: us5 — golden task regression suite (p3) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 6: US5 — Golden Task Regression Suite
(P3)

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

**Related Tasks**: T031, T033 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: US5 — Golden Task Regression Suite
(P3) **User Story**: [US5]

---

## Issue #32: T033 - Verify golden task tests run as part of `npm test` — check `vitest.config.ts` `include` patterns cover `tests/regression/**/*.test.ts`. If not, add the pattern. Run `npm test` and verify golden task tests appear in output

**Labels**: `enhancement`, `phase-6-us5-golden-task-regression-suite-p3-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T033 - Verify golden task
tests run as part of `npm test` — check `vitest.config.ts` `include` patterns
cover `tests/regression/**/*.test.ts`. If not, add the pattern. Run `npm test`
and verify golden task tests appear in output

### Screen described (Mike)

This task involves: Verify golden task tests run as part of `npm test` — check
`vitest.config.ts` `include` patterns cover `tests/regression/**/*.test.ts`. If
not, add the pattern. Run `npm test` and verify golden task tests appear in
output

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: us5 — golden task regression suite (p3) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 6: US5 — Golden Task Regression Suite
(P3)

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

**Related Tasks**: T032, T034 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: US5 — Golden Task Regression Suite
(P3) **User Story**: [US5]

---

## Issue #33: T034 - Create `extension/src/autonomous/CostBudgetEnforcer.ts` — typed `CostBudgetConfig` interface (maxCostUsd default 10.0, maxTokensPerRun default 500000, enforcementMode, warningThreshold default 0.8), `CostSnapshot` interface (currentCostUsd, currentTokens, percentUsed, status), class with `constructor(config, runLedger?)`, `recordUsage(inputTokens, outputTokens, providerId?)` returns CostSnapshot and emits budget_warning/budget_exceeded to ledger when thresholds crossed, `canProceed()` returns boolean, `getSnapshot()`, `reset()`. Cost estimation: use static rates per provider (Claude ~$15/MTok input, ~$75/MTok output for Opus; scale down for Sonnet/Haiku)

**Labels**: `enhancement`, `phase-7-us6-cost-budget-enforcement-p3-`, `us6`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T034 - Create
`extension/src/autonomous/CostBudgetEnforcer.ts` — typed `CostBudgetConfig`
interface (maxCostUsd default 10.0, maxTokensPerRun default 500000,
enforcementMode, warningThreshold default 0.8), `CostSnapshot` interface
(currentCostUsd, currentTokens, percentUsed, status), class with
`constructor(config, runLedger?)`,
`recordUsage(inputTokens, outputTokens, providerId?)` returns CostSnapshot and
emits budget_warning/budget_exceeded to ledger when thresholds crossed,
`canProceed()` returns boolean, `getSnapshot()`, `reset()`. Cost estimation: use
static rates per provider (Claude ~$15/MTok input, ~$75/MTok output for Opus;
scale down for Sonnet/Haiku)

### Screen described (Mike)

This task involves: Create `extension/src/autonomous/CostBudgetEnforcer.ts` —
typed `CostBudgetConfig` interface (maxCostUsd default 10.0, maxTokensPerRun
default 500000, enforcementMode, warningThreshold default 0.8), `CostSnapshot`
interface (currentCostUsd, currentTokens, percentUsed, status), class with
`constructor(config, runLedger?)`,
`recordUsage(inputTokens, outputTokens, providerId?)` returns CostSnapshot and
emits budget_warning/budget_exceeded to ledger when thresholds crossed,
`canProceed()` returns boolean, `getSnapshot()`, `reset()`. Cost estimation: use
static rates per provider (Claude ~$15/MTok input, ~$75/MTok output for Opus;
scale down for Sonnet/Haiku)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 7: us6 — cost budget enforcement (p3) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 7: US6 — Cost Budget Enforcement (P3)

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

**Related Tasks**: T033, T035 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 7: US6 — Cost Budget Enforcement (P3)
**User Story**: [US6]

---

## Issue #34: T035 - Add budget settings to ConfigManager — follow 3-step pattern: (1) `CONFIG_KEYS` entries for `gofer.budgets.maxCostUsd`, `gofer.budgets.maxTokensPerRun`, `gofer.budgets.enforcementMode`; (2) `DEFAULTS` entries with 10.0, 500000, 'advisory'; (3) typed getters `getBudgetMaxCostUsd(): number`, `getBudgetMaxTokensPerRun(): number`, `getBudgetEnforcementMode(): string`. Add properties to `extension/package.json` contributes.configuration

**Labels**: `enhancement`, `phase-7-us6-cost-budget-enforcement-p3-`, `us6`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T035 - Add budget settings
to ConfigManager — follow 3-step pattern: (1) `CONFIG_KEYS` entries for
`gofer.budgets.maxCostUsd`, `gofer.budgets.maxTokensPerRun`,
`gofer.budgets.enforcementMode`; (2) `DEFAULTS` entries with 10.0, 500000,
'advisory'; (3) typed getters `getBudgetMaxCostUsd(): number`,
`getBudgetMaxTokensPerRun(): number`, `getBudgetEnforcementMode(): string`. Add
properties to `extension/package.json` contributes.configuration

### Screen described (Mike)

This task involves: Add budget settings to ConfigManager — follow 3-step
pattern: (1) `CONFIG_KEYS` entries for `gofer.budgets.maxCostUsd`,
`gofer.budgets.maxTokensPerRun`, `gofer.budgets.enforcementMode`; (2) `DEFAULTS`
entries with 10.0, 500000, 'advisory'; (3) typed getters
`getBudgetMaxCostUsd(): number`, `getBudgetMaxTokensPerRun(): number`,
`getBudgetEnforcementMode(): string`. Add properties to `extension/package.json`
contributes.configuration

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 7: us6 — cost budget enforcement (p3) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 7: US6 — Cost Budget Enforcement (P3)

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

**Related Tasks**: T034, T036 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 7: US6 — Cost Budget Enforcement (P3)
**User Story**: [US6]

---

## Issue #35: T036 - Wire CostBudgetEnforcer into ContextBuilder — in `extension/src/autonomous/ContextBuilder.ts`, check budget on each context build. If `canProceed()` is false: advisory mode logs warning, truncate mode reduces context aggressively (lower budgets), blocking mode returns error result. Create enforcer in `initializeForWorkspace()` with config from ConfigManager

**Labels**: `enhancement`, `phase-7-us6-cost-budget-enforcement-p3-`, `us6`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T036 - Wire
CostBudgetEnforcer into ContextBuilder — in
`extension/src/autonomous/ContextBuilder.ts`, check budget on each context
build. If `canProceed()` is false: advisory mode logs warning, truncate mode
reduces context aggressively (lower budgets), blocking mode returns error
result. Create enforcer in `initializeForWorkspace()` with config from
ConfigManager

### Screen described (Mike)

This task involves: Wire CostBudgetEnforcer into ContextBuilder — in
`extension/src/autonomous/ContextBuilder.ts`, check budget on each context
build. If `canProceed()` is false: advisory mode logs warning, truncate mode
reduces context aggressively (lower budgets), blocking mode returns error
result. Create enforcer in `initializeForWorkspace()` with config from
ConfigManager

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 7: us6 — cost budget enforcement (p3) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 7: US6 — Cost Budget Enforcement (P3)

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

**Related Tasks**: T035, T037 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 7: US6 — Cost Budget Enforcement (P3)
**User Story**: [US6]

---

## Issue #36: T037 - Modify `extension/src/ui/ContextHealthStatusBar.ts` — extend tooltip or status text to show budget info: "Budget: $X.XX / $Y.YY (Z%)" alongside existing context health. Show budget warning icon when status is 'warning' or 'exceeded'

**Labels**: `enhancement`, `phase-7-us6-cost-budget-enforcement-p3-`, `us6`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T037 - Modify
`extension/src/ui/ContextHealthStatusBar.ts` — extend tooltip or status text to
show budget info: "Budget: $X.XX / $Y.YY (Z%)" alongside existing context
health. Show budget warning icon when status is 'warning' or 'exceeded'

### Screen described (Mike)

This task involves: Modify `extension/src/ui/ContextHealthStatusBar.ts` — extend
tooltip or status text to show budget info: "Budget: $X.XX / $Y.YY (Z%)"
alongside existing context health. Show budget warning icon when status is
'warning' or 'exceeded'

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 7: us6 — cost budget enforcement (p3) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 7: US6 — Cost Budget Enforcement (P3)

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

**Related Tasks**: T036, T038 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 7: US6 — Cost Budget Enforcement (P3)
**User Story**: [US6]

---

## Issue #37: T038 - Wire budget events to RunLedger — in CostBudgetEnforcer.recordUsage(), when status transitions to 'warning', emit `budget_warning` event to RunLedger. When status transitions to 'exceeded', emit `budget_exceeded` event. Include `{currentCostUsd, maxCostUsd, percentUsed}` in event data

**Labels**: `enhancement`, `phase-7-us6-cost-budget-enforcement-p3-`, `us6`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T038 - Wire
budget events to RunLedger — in CostBudgetEnforcer.recordUsage(), when status
transitions to 'warning', emit `budget_warning` event to RunLedger. When status
transitions to 'exceeded', emit `budget_exceeded` event. Include
`{currentCostUsd, maxCostUsd, percentUsed}` in event data

### Screen described (Mike)

This task involves: Wire budget events to RunLedger — in
CostBudgetEnforcer.recordUsage(), when status transitions to 'warning', emit
`budget_warning` event to RunLedger. When status transitions to 'exceeded', emit
`budget_exceeded` event. Include `{currentCostUsd, maxCostUsd, percentUsed}` in
event data

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 7: us6 — cost budget enforcement (p3) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 7: US6 — Cost Budget Enforcement (P3)

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

**Related Tasks**: T037, T039 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 7: US6 — Cost Budget Enforcement (P3)
**User Story**: [US6]

---

## Issue #38: T039 - Create `tests/unit/autonomous/CostBudgetEnforcer.test.ts` — test: initial state is 'healthy', recordUsage accumulates correctly, warning at 80% threshold, exceeded at 100%, canProceed false when exceeded in blocking mode, canProceed true when exceeded in advisory mode, reset clears state, ledger receives budget events, getSnapshot returns current state

**Labels**: `enhancement`, `phase-7-us6-cost-budget-enforcement-p3-`, `us6`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T039 - Create
`tests/unit/autonomous/CostBudgetEnforcer.test.ts` — test: initial state is
'healthy', recordUsage accumulates correctly, warning at 80% threshold, exceeded
at 100%, canProceed false when exceeded in blocking mode, canProceed true when
exceeded in advisory mode, reset clears state, ledger receives budget events,
getSnapshot returns current state

### Screen described (Mike)

This task involves: Create `tests/unit/autonomous/CostBudgetEnforcer.test.ts` —
test: initial state is 'healthy', recordUsage accumulates correctly, warning at
80% threshold, exceeded at 100%, canProceed false when exceeded in blocking
mode, canProceed true when exceeded in advisory mode, reset clears state, ledger
receives budget events, getSnapshot returns current state

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 7: us6 — cost budget enforcement (p3) task that
supports [US6].

**Priority**: P2 (Medium) - Part of Phase 7: US6 — Cost Budget Enforcement (P3)

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

**Related Tasks**: T038, T040 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 7: US6 — Cost Budget Enforcement (P3)
**User Story**: [US6]

---

## Issue #39: T040 - Modify `.claude/commands/0_business_scenario.md` — add instruction to read `pipeline-state.json` for resume logic: "Before file-existence checks, read pipeline-state.json with `pipeline-state.sh read --json`. If it exists and status is 'in_progress', resume from `currentStage`. This takes priority over file-existence heuristics."

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T040 - Modify
`.claude/commands/0_business_scenario.md` — add instruction to read
`pipeline-state.json` for resume logic: "Before file-existence checks, read
pipeline-state.json with `pipeline-state.sh read --json`. If it exists and
status is 'in_progress', resume from `currentStage`. This takes priority over
file-existence heuristics."

### Screen described (Mike)

This task involves: Modify `.claude/commands/0_business_scenario.md` — add
instruction to read `pipeline-state.json` for resume logic: "Before
file-existence checks, read pipeline-state.json with
`pipeline-state.sh read --json`. If it exists and status is 'in_progress',
resume from `currentStage`. This takes priority over file-existence heuristics."

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that supports
[US1].

**Priority**: P1 (High) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T039, T041 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates **User
Story**: [US1]

---

## Issue #40: T041 - Modify `.claude/commands/1_gofer_research.md` — add instruction at stage completion: "Run `pipeline-state.sh update --stage 1_research` to record stage completion in pipeline-state.json"

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T041 - Modify
`.claude/commands/1_gofer_research.md` — add instruction at stage completion:
"Run `pipeline-state.sh update --stage 1_research` to record stage completion in
pipeline-state.json"

### Screen described (Mike)

This task involves: Modify `.claude/commands/1_gofer_research.md` — add
instruction at stage completion: "Run
`pipeline-state.sh update --stage 1_research` to record stage completion in
pipeline-state.json"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T040, T042 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

## Issue #41: T042 - Modify `.claude/commands/2_gofer_specify.md` — add instruction at stage completion: "Run `pipeline-state.sh update --stage 2_specify`"

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T042 - Modify
`.claude/commands/2_gofer_specify.md` — add instruction at stage completion:
"Run `pipeline-state.sh update --stage 2_specify`"

### Screen described (Mike)

This task involves: Modify `.claude/commands/2_gofer_specify.md` — add
instruction at stage completion: "Run
`pipeline-state.sh update --stage 2_specify`"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T041, T043 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

## Issue #42: T043 - Modify `.claude/commands/3_gofer_plan.md` — add instruction at stage completion: "Run `pipeline-state.sh update --stage 3_plan`"

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T043 - Modify
`.claude/commands/3_gofer_plan.md` — add instruction at stage completion: "Run
`pipeline-state.sh update --stage 3_plan`"

### Screen described (Mike)

This task involves: Modify `.claude/commands/3_gofer_plan.md` — add instruction
at stage completion: "Run `pipeline-state.sh update --stage 3_plan`"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T042, T044 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

## Issue #43: T044 - Modify `.claude/commands/4_gofer_tasks.md` — add instruction at stage completion: "Run `pipeline-state.sh update --stage 4_tasks`"

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T044 - Modify
`.claude/commands/4_gofer_tasks.md` — add instruction at stage completion: "Run
`pipeline-state.sh update --stage 4_tasks`"

### Screen described (Mike)

This task involves: Modify `.claude/commands/4_gofer_tasks.md` — add instruction
at stage completion: "Run `pipeline-state.sh update --stage 4_tasks`"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T043, T045 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

## Issue #44: T045 - Modify `.claude/commands/5_gofer_implement.md` — add instruction at stage completion: "Run `pipeline-state.sh update --stage 5_implement`"

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T045 - Modify
`.claude/commands/5_gofer_implement.md` — add instruction at stage completion:
"Run `pipeline-state.sh update --stage 5_implement`"

### Screen described (Mike)

This task involves: Modify `.claude/commands/5_gofer_implement.md` — add
instruction at stage completion: "Run
`pipeline-state.sh update --stage 5_implement`"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T044, T046 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

## Issue #45: T046 - Modify `.claude/commands/6_gofer_validate.md` — add instruction at stage completion: "Run `pipeline-state.sh update --stage 6_validate`"

**Labels**: `enhancement`, `phase-8-polish-command-file-updates`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T046 - Modify
`.claude/commands/6_gofer_validate.md` — add instruction at stage completion:
"Run `pipeline-state.sh update --stage 6_validate`"

### Screen described (Mike)

This task involves: Modify `.claude/commands/6_gofer_validate.md` — add
instruction at stage completion: "Run
`pipeline-state.sh update --stage 6_validate`"

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T045 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

## Issue #46: T047 - Verify all `extension/resources/claude-commands/` and `extension/resources/copilot-prompts/` mirrors are updated to match modified `.claude/commands/` files. If mirrors exist, copy updated files. If mirrors don't exist for these paths, skip.

**Labels**: `enhancement`, `phase-8-polish-command-file-updates` **Assignees**:
@MikeNowosadko **Title**: [Feature]: T047 - Verify all
`extension/resources/claude-commands/` and
`extension/resources/copilot-prompts/` mirrors are updated to match modified
`.claude/commands/` files. If mirrors exist, copy updated files. If mirrors
don't exist for these paths, skip.

### Screen described (Mike)

This task involves: Verify all `extension/resources/claude-commands/` and
`extension/resources/copilot-prompts/` mirrors are updated to match modified
`.claude/commands/` files. If mirrors exist, copy updated files. If mirrors
don't exist for these paths, skip.

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 8: polish & command file updates task that provides
foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 8: Polish & Command File Updates

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

**Related Tasks**: T046 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 8: Polish & Command File Updates

---

---

## Summary by Phase

### Phase 1: Setup (Shared Infrastructure)

- Issue #1 - #1: 1 issues

### Phase 2: US1 — Pipeline State Machine (P1)

- Issue #2 - #5: 4 issues

### Phase 3: US2 — Typed Artifact Schemas + Validation (P1)

- Issue #6 - #13: 8 issues

### Phase 4: US3 — Unified Run Ledger (P2)

- Issue #14 - #19: 6 issues

### Phase 5: US4 — ScopeGuard Activation + Tool Audit (P2)

- Issue #20 - #26: 7 issues

### Phase 6: US5 — Golden Task Regression Suite (P3)

- Issue #27 - #32: 6 issues

### Phase 7: US6 — Cost Budget Enforcement (P3)

- Issue #33 - #38: 6 issues

### Phase 8: Polish & Command File Updates

- Issue #39 - #46: 8 issues

---

## Notes

- **All issues**: Pre-filled with enterprise Requirements Ticket template
- **Mike-specific sections**: Review and update before creating issues
- **Assignees**: Adjust based on actual team assignments
- **Dependencies**: Link related issues using #issue-number after creation
- **Sync with tasks.md**: Close issues as tasks are checked off

---

## Quick Stats

- **Total Issues**: 46
- **Parallel Tasks**: 21
- **Story-specific**: 39
- **Infrastructure**: 7

---

**Next Steps**:

1. Review each issue for completeness
2. Update Mike-specific sections (Screen described, Fields, Data, Navigation)
3. Confirm assignees and effort estimates
4. Create issues in GitHub using your preferred method
5. Link issues back to this document and tasks.md
