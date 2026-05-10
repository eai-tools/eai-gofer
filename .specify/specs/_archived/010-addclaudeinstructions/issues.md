---
description: 'GitHub issues for Unknown Feature - ready to create in GitHub'
---

# GitHub Issues: Unknown Feature

**Generated from**: tasks.md **Feature ID**: unknown **Total Issues**: 43
**Generated**: 2026-03-05

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

## Issue #1: T001 - Create ProjectInfo interface with detected properties

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T001 - Create ProjectInfo
interface with detected properties

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that create
projectinfo interface with detected properties.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T002 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #2: T002 - Implement ProjectDetector.detect(workspacePath) static method

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T002 - Implement
ProjectDetector.detect(workspacePath) static method

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that implement
projectdetector.detect(workspacepath) static method.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T001, T003 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #3: T003 - Add language detection from manifest files (package.json, tsconfig.json, pyproject.toml, go.mod, Cargo.toml, pom.xml, build.gradle)

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T003 - Add language
detection from manifest files (package.json, tsconfig.json, pyproject.toml,
go.mod, Cargo.toml, pom.xml, build.gradle)

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that add language
detection from manifest files (package.json, tsconfig.json, pyproject.toml,
go.mod, cargo.toml, pom.xml, build.gradle).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T002, T004 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #4: T004 - Add test runner detection from config files (vitest.config._, jest.config._, pytest markers)

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T004 - Add test runner
detection from config files (vitest.config._, jest.config._, pytest markers)

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that add test
runner detection from config files (vitest.config._, jest.config._, pytest
markers).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T003, T005 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #5: T005 - Add linter/formatter detection (.eslintrc*, eslint.config.*, .prettierrc\*)

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T005 - Add linter/formatter
detection (.eslintrc*, eslint.config.*, .prettierrc\*)

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that add
linter/formatter detection (.eslintrc*, eslint.config.*, .prettierrc\*).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T004, T006 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #6: T006 - Add build/test/lint/format command detection from package.json scripts

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T006 - Add
build/test/lint/format command detection from package.json scripts

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that add
build/test/lint/format command detection from package.json scripts.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T005, T007 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #7: T007 - Add framework detection from dependencies (react, next, express, django, flask, gin, actix)

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T007 - Add framework
detection from dependencies (react, next, express, django, flask, gin, actix)

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that add framework
detection from dependencies (react, next, express, django, flask, gin, actix).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T006, T008 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #8: T008 - Add package manager detection (npm/yarn/pnpm from lock files, pip/poetry from Python markers)

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T008 - Add package manager
detection (npm/yarn/pnpm from lock files, pip/poetry from Python markers)

### Screen described (Mike)

Implementation at `extension/src/services/ProjectDetector.ts` that add package
manager detection (npm/yarn/pnpm from lock files, pip/poetry from python
markers).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/ProjectDetector.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T007, T009 **File Path**:
`extension/src/services/ProjectDetector.ts` **Estimated Effort**: M (4-8 hours)
**Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #9: T009 - Write unit tests for ProjectDetector covering 6 language scenarios + unknown project + edge cases

**Labels**: `enhancement`, `phase-1-setup-project-detection-engine`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T009 - Write unit tests for
ProjectDetector covering 6 language scenarios + unknown project + edge cases

### Screen described (Mike)

Implementation at `tests/unit/services/ProjectDetector.test.ts` that write unit
tests for projectdetector covering 6 language scenarios + unknown project + edge
cases.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 1: setup & project detection engine task that
provides foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 1: Setup & Project Detection Engine

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `tests/unit/services/ProjectDetector.test.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T008, T010 **File Path**:
`tests/unit/services/ProjectDetector.test.ts` **Estimated Effort**: S (2-4
hours) **Phase**: Phase 1: Setup & Project Detection Engine

---

## Issue #10: T010 - Create base AGENTS.md template with placeholder sections ({{commands}}, {{structure}}, {{codeStyle}}, {{testing}}, {{gitWorkflow}}, {{boundaries}}, {{principles}})

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T010 - Create base AGENTS.md
template with placeholder sections ({{commands}}, {{structure}}, {{codeStyle}},
{{testing}}, {{gitWorkflow}}, {{boundaries}}, {{principles}})

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/base/agents-base.md` that create base
agents.md template with placeholder sections ({{commands}}, {{structure}},
{{codestyle}}, {{testing}}, {{gitworkflow}}, {{boundaries}}, {{principles}}).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/base/agents-base.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T009, T011 **File Path**:
`extension/resources/instruction-templates/base/agents-base.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #11: T011 - Create base CLAUDE.md template with @AGENTS.md import, Gofer pipeline section, workflow section, context management section (target < 60 lines)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T011 - Create base CLAUDE.md
template with @AGENTS.md import, Gofer pipeline section, workflow section,
context management section (target < 60 lines)

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/base/claude-base.md` that create base
claude.md template with @agents.md import, gofer pipeline section, workflow
section, context management section (target < 60 lines).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/base/claude-base.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T010, T012 **File Path**:
`extension/resources/instruction-templates/base/claude-base.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #12: T012 - Create base copilot-instructions.md template with project overview, available commands, code quality section

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T012 - Create base
copilot-instructions.md template with project overview, available commands, code
quality section

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/base/copilot-base.md` that create
base copilot-instructions.md template with project overview, available commands,
code quality section.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/base/copilot-base.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T011, T013 **File Path**:
`extension/resources/instruction-templates/base/copilot-base.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #13: T013 - Create TypeScript language fragment (strict mode, ESM imports, type annotations)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T013 - Create TypeScript
language fragment (strict mode, ESM imports, type annotations)

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/languages/typescript.md` that create
typescript language fragment (strict mode, esm imports, type annotations).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/languages/typescript.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T012, T014 **File Path**:
`extension/resources/instruction-templates/languages/typescript.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #14: T014 - Create Python language fragment (type hints, docstrings, virtual envs)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T014 - Create Python
language fragment (type hints, docstrings, virtual envs)

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/languages/python.md` that create
python language fragment (type hints, docstrings, virtual envs).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/languages/python.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T013, T015 **File Path**:
`extension/resources/instruction-templates/languages/python.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #15: T015 - Create Go language fragment (error handling, naming, package structure)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T015 - Create Go language
fragment (error handling, naming, package structure)

### Screen described (Mike)

Implementation at `extension/resources/instruction-templates/languages/go.md`
that create go language fragment (error handling, naming, package structure).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/languages/go.md` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T014, T016 **File Path**:
`extension/resources/instruction-templates/languages/go.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #16: T016 - Create Rust language fragment (ownership, error handling, cargo conventions)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T016 - Create Rust language
fragment (ownership, error handling, cargo conventions)

### Screen described (Mike)

Implementation at `extension/resources/instruction-templates/languages/rust.md`
that create rust language fragment (ownership, error handling, cargo
conventions).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/languages/rust.md` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T015, T017 **File Path**:
`extension/resources/instruction-templates/languages/rust.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #17: T017 - Create Java language fragment (Maven/Gradle conventions, naming)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T017 - Create Java language
fragment (Maven/Gradle conventions, naming)

### Screen described (Mike)

Implementation at `extension/resources/instruction-templates/languages/java.md`
that create java language fragment (maven/gradle conventions, naming).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/languages/java.md` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T016, T018 **File Path**:
`extension/resources/instruction-templates/languages/java.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #18: T018 - Create generic language fragment (minimal safe defaults for unknown projects)

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T018 - Create generic
language fragment (minimal safe defaults for unknown projects)

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/languages/generic.md` that create
generic language fragment (minimal safe defaults for unknown projects).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/languages/generic.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T017, T019 **File Path**:
`extension/resources/instruction-templates/languages/generic.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #19: T019 - Create Gofer-specific fragment for CLAUDE.md with pipeline commands and available slash commands

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T019 - Create Gofer-specific
fragment for CLAUDE.md with pipeline commands and available slash commands

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/gofer/gofer-claude.md` that create
gofer-specific fragment for claude.md with pipeline commands and available slash
commands.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/gofer/gofer-claude.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T018, T020 **File Path**:
`extension/resources/instruction-templates/gofer/gofer-claude.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #20: T020 - Create Gofer-specific fragment for copilot-instructions.md with available prompts

**Labels**: `enhancement`, `phase-2-template-fragment-system`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T020 - Create Gofer-specific
fragment for copilot-instructions.md with available prompts

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/gofer/gofer-copilot.md` that create
gofer-specific fragment for copilot-instructions.md with available prompts.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/gofer/gofer-copilot.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T019, T021 **File Path**:
`extension/resources/instruction-templates/gofer/gofer-copilot.md` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #21: T021 - Create workflow principles fragment based on example.md content (plan mode, subagent strategy, self-improvement, verification, elegance, autonomous bug fixing, core principles)

**Labels**: `enhancement`, `phase-2-template-fragment-system` **Assignees**:
@MikeNowosadko **Title**: [Feature]: T021 - Create workflow principles fragment
based on example.md content (plan mode, subagent strategy, self-improvement,
verification, elegance, autonomous bug fixing, core principles)

### Screen described (Mike)

Implementation at
`extension/resources/instruction-templates/workflow/principles.md` that create
workflow principles fragment based on example.md content (plan mode, subagent
strategy, self-improvement, verification, elegance, autonomous bug fixing, core
principles).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 2: template fragment system task that provides
foundational infrastructure.

**Priority**: P1 (High) - Part of Phase 2: Template Fragment System

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `extension/resources/instruction-templates/workflow/principles.md` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T020, T022 **File Path**:
`extension/resources/instruction-templates/workflow/principles.md` **Estimated
Effort**: S (1-2 hours) **Phase**: Phase 2: Template Fragment System

---

## Issue #22: T022 - Create InstructionGenerator class with generateAgentsMd(projectInfo), generateClaudeMd(projectInfo), generateCopilotMd(projectInfo) methods

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T022 - Create
InstructionGenerator class with generateAgentsMd(projectInfo),
generateClaudeMd(projectInfo), generateCopilotMd(projectInfo) methods

### Screen described (Mike)

Implementation at `extension/src/services/InstructionGenerator.ts` that create
instructiongenerator class with generateagentsmd(projectinfo),
generateclaudemd(projectinfo), generatecopilotmd(projectinfo) methods.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/InstructionGenerator.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T021, T023 **File Path**:
`extension/src/services/InstructionGenerator.ts` **Estimated Effort**: M (4-8
hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction Generator & Core
Generation (P1) **User Story**: [US1]

---

## Issue #23: T023 - Implement template loading from extension/resources/instruction-templates/ using vscode.extensions.getExtension() path resolution

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us2`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T023 - Implement template
loading from extension/resources/instruction-templates/ using
vscode.extensions.getExtension() path resolution

### Screen described (Mike)

Implementation at `extension/src/services/InstructionGenerator.ts` that
implement template loading from extension/resources/instruction-templates/ using
vscode.extensions.getextension() path resolution.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/InstructionGenerator.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T022, T024 **File Path**:
`extension/src/services/InstructionGenerator.ts` **Estimated Effort**: M (4-8
hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction Generator & Core
Generation (P1) **User Story**: [US2]

---

## Issue #24: T024 - Implement language fragment selection based on projectInfo.language and {{placeholder}} substitution with detected values

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us2`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T024 - Implement language
fragment selection based on projectInfo.language and {{placeholder}}
substitution with detected values

### Screen described (Mike)

Implementation at `extension/src/services/InstructionGenerator.ts` that
implement language fragment selection based on projectinfo.language and
{{placeholder}} substitution with detected values.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US2].

**Priority**: P2 (Medium) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/services/InstructionGenerator.ts` is
      complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T023, T025 **File Path**:
`extension/src/services/InstructionGenerator.ts` **Estimated Effort**: M (4-8
hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction Generator & Core
Generation (P1) **User Story**: [US2]

---

## Issue #25: T025 - Implement workflow principles assembly

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T025 - Implement workflow
principles assembly

### Screen described (Mike)

Implementation at
`generateClaudeMd() mapping example.md sections to brief CLAUDE.md lines in extension/src/services/InstructionGenerator.ts`
that implement workflow principles assembly.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `generateClaudeMd() mapping example.md sections to brief CLAUDE.md lines in extension/src/services/InstructionGenerator.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T024, T026 **File Path**:
`generateClaudeMd() mapping example.md sections to brief CLAUDE.md lines in extension/src/services/InstructionGenerator.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 3: US1 + US2 + US3 -
Instruction Generator & Core Generation (P1) **User Story**: [US3]

---

## Issue #26: T026 - Implement core principles assembly

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us3`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T026 - Implement core
principles assembly

### Screen described (Mike)

Implementation at
`generateAgentsMd() (simplicity first, find root causes, minimal impact, verify before done) in extension/src/services/InstructionGenerator.ts`
that implement core principles assembly.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
delivering core functionality.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US3].

**Priority**: P3 (Low) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `generateAgentsMd() (simplicity first, find root causes, minimal impact, verify before done) in extension/src/services/InstructionGenerator.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T025, T027 **File Path**:
`generateAgentsMd() (simplicity first, find root causes, minimal impact, verify before done) in extension/src/services/InstructionGenerator.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 3: US1 + US2 + US3 -
Instruction Generator & Core Generation (P1) **User Story**: [US3]

---

## Issue #27: T027 - Add setupDefaultInstructions(): Promise<void> to IResourceOperations interface in extension/src/services/migration/UpgradeService.ts (after setupCopilotInstructions, line ~53)

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T027 - Add
setupDefaultInstructions(): Promise<void> to IResourceOperations interface in
extension/src/services/migration/UpgradeService.ts (after
setupCopilotInstructions, line ~53)

### Screen described (Mike)

This task involves: Add setupDefaultInstructions(): Promise<void> to
IResourceOperations interface in
extension/src/services/migration/UpgradeService.ts (after
setupCopilotInstructions, line ~53)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

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

**Related Tasks**: T026, T028 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1) **User Story**: [US1]

---

## Issue #28: T028 - Add setupDefaultInstructions() call

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T028 - Add
setupDefaultInstructions() call

### Screen described (Mike)

Implementation at
`UpgradeService.upgrade() after setupCopilotInstructions() step (line ~209) with progress reporting in extension/src/services/migration/UpgradeService.ts`
that add setupdefaultinstructions() call.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `UpgradeService.upgrade() after setupCopilotInstructions() step (line ~209) with progress reporting in extension/src/services/migration/UpgradeService.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T027, T029 **File Path**:
`UpgradeService.upgrade() after setupCopilotInstructions() step (line ~209) with progress reporting in extension/src/services/migration/UpgradeService.ts`
**Estimated Effort**: S (1-2 hours) **Phase**: Phase 3: US1 + US2 + US3 -
Instruction Generator & Core Generation (P1) **User Story**: [US1]

---

## Issue #29: T029 - Implement setupDefaultInstructions()

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T029 - Implement
setupDefaultInstructions()

### Screen described (Mike)

Implementation at
`ResourceSyncer: instantiate ProjectDetector + InstructionGenerator, check FileUtils.exists() for each file, use FileUtils.ensureDirectory() for .github/, write via FileUtils.writeTextFile() in extension/src/services/migration/ResourceSyncer.ts`
that implement setupdefaultinstructions().

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `ResourceSyncer: instantiate ProjectDetector + InstructionGenerator, check FileUtils.exists() for each file, use FileUtils.ensureDirectory() for .github/, write via FileUtils.writeTextFile() in extension/src/services/migration/ResourceSyncer.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T028, T030 **File Path**:
`ResourceSyncer: instantiate ProjectDetector + InstructionGenerator, check FileUtils.exists() for each file, use FileUtils.ensureDirectory() for .github/, write via FileUtils.writeTextFile() in extension/src/services/migration/ResourceSyncer.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 3: US1 + US2 + US3 -
Instruction Generator & Core Generation (P1) **User Story**: [US1]

---

## Issue #30: T030 - Add setupDefaultInstructions() call

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T030 - Add
setupDefaultInstructions() call

### Screen described (Mike)

Implementation at
`UpgradeService.updateGoferTemplates() (line ~320) in extension/src/services/migration/UpgradeService.ts`
that add setupdefaultinstructions() call.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `UpgradeService.updateGoferTemplates() (line ~320) in extension/src/services/migration/UpgradeService.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T029, T031 **File Path**:
`UpgradeService.updateGoferTemplates() (line ~320) in extension/src/services/migration/UpgradeService.ts`
**Estimated Effort**: S (1-2 hours) **Phase**: Phase 3: US1 + US2 + US3 -
Instruction Generator & Core Generation (P1) **User Story**: [US1]

---

## Issue #31: T031 - Write unit tests for InstructionGenerator: verify assembly for TypeScript, Python, Go projects + line count constraints + content partitioning

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T031 - Write unit
tests for InstructionGenerator: verify assembly for TypeScript, Python, Go
projects + line count constraints + content partitioning

### Screen described (Mike)

Implementation at `tests/unit/services/InstructionGenerator.test.ts` that write
unit tests for instructiongenerator: verify assembly for typescript, python, go
projects + line count constraints + content partitioning.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `tests/unit/services/InstructionGenerator.test.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T030, T032 **File Path**:
`tests/unit/services/InstructionGenerator.test.ts` **Estimated Effort**: S (2-4
hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction Generator & Core
Generation (P1) **User Story**: [US1]

---

## Issue #32: T032 - Write integration test: fresh workspace → upgrade → verify all 3 files created at correct locations

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T032 - Write
integration test: fresh workspace → upgrade → verify all 3 files created at
correct locations

### Screen described (Mike)

Implementation at `tests/integration/instruction-generation.test.ts` that write
integration test: fresh workspace → upgrade → verify all 3 files created at
correct locations.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `tests/integration/instruction-generation.test.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T031, T033 **File Path**:
`tests/integration/instruction-generation.test.ts` **Estimated Effort**: S (2-4
hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction Generator & Core
Generation (P1) **User Story**: [US1]

---

## Issue #33: T033 - Write integration test: workspace with existing CLAUDE.md → upgrade → verify CLAUDE.md untouched

**Labels**: `enhancement`,
`phase-3-us1-us2-us3-instruction-generator-core-generation-p1-`, `us1`,
`parallel` **Assignees**: @MikeNowosadko **Title**: [Feature]: T033 - Write
integration test: workspace with existing CLAUDE.md → upgrade → verify CLAUDE.md
untouched

### Screen described (Mike)

Implementation at `tests/integration/instruction-generation.test.ts` that write
integration test: workspace with existing claude.md → upgrade → verify claude.md
untouched.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 3: us1 + us2 + us3 - instruction generator & core
generation (p1) task that supports [US1].

**Priority**: P1 (High) - Part of Phase 3: US1 + US2 + US3 - Instruction
Generator & Core Generation (P1)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `tests/integration/instruction-generation.test.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Tests are written and pass successfully
- [ ] Test coverage meets project standards (>80%)

### Data needed (Mike)

N/A - Test or configuration task

### Integrations Needed (Team)

N/A - Test or configuration task

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T032, T034 **File Path**:
`tests/integration/instruction-generation.test.ts` **Estimated Effort**: S (2-4
hours) **Phase**: Phase 3: US1 + US2 + US3 - Instruction Generator & Core
Generation (P1) **User Story**: [US1]

---

## Issue #34: T034 - Add gofer.regenerateInstructions command contribution to extension/package.json contributes.commands array

**Labels**: `enhancement`, `phase-4-us4-regenerate-instructions-command-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T034 - Add
gofer.regenerateInstructions command contribution to extension/package.json
contributes.commands array

### Screen described (Mike)

This task involves: Add gofer.regenerateInstructions command contribution to
extension/package.json contributes.commands array

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 4: us4 - regenerate instructions command (p2) task
that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 4: US4 - Regenerate Instructions
Command (P2)

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
Effort**: M (4-8 hours) **Phase**: Phase 4: US4 - Regenerate Instructions
Command (P2) **User Story**: [US4]

---

## Issue #35: T035 - Register gofer.regenerateInstructions command

**Labels**: `enhancement`, `phase-4-us4-regenerate-instructions-command-p2-`,
`us4` **Assignees**: @MikeNowosadko **Title**: [Feature]: T035 - Register
gofer.regenerateInstructions command

### Screen described (Mike)

Implementation at
`CommandRegistry.registerAll() with ProjectDetector re-detection, existing file prompt (Overwrite/Skip/Backup & Replace), and summary notification in extension/src/services/CommandRegistry.ts`
that register gofer.regenerateinstructions command.

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 4: us4 - regenerate instructions command (p2) task
that supports [US4].

**Priority**: P2 (Medium) - Part of Phase 4: US4 - Regenerate Instructions
Command (P2)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in
      `CommandRegistry.registerAll() with ProjectDetector re-detection, existing file prompt (Overwrite/Skip/Backup & Replace), and summary notification in extension/src/services/CommandRegistry.ts`
      is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T034, T036 **File Path**:
`CommandRegistry.registerAll() with ProjectDetector re-detection, existing file prompt (Overwrite/Skip/Backup & Replace), and summary notification in extension/src/services/CommandRegistry.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 4: US4 - Regenerate
Instructions Command (P2) **User Story**: [US4]

---

## Issue #36: T036 - Add public setupDefaultInstructions() facade method to GoferMigrator (delegates to ResourceSyncer)

**Labels**: `enhancement`, `phase-5-us5-existing-installation-sync-p2-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T036 - Add public
setupDefaultInstructions() facade method to GoferMigrator (delegates to
ResourceSyncer)

### Screen described (Mike)

Implementation at `extension/src/goferMigrator.ts` that add public
setupdefaultinstructions() facade method to gofermigrator (delegates to
resourcesyncer).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
establishing necessary infrastructure.

**Impact**: This is a phase 5: us5 - existing installation sync (p2) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 5: US5 - Existing Installation Sync
(P2)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/goferMigrator.ts` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T035, T037 **File Path**: `extension/src/goferMigrator.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 5: US5 - Existing
Installation Sync (P2) **User Story**: [US5]

---

## Issue #37: T037 - Add AGENTS.md and CLAUDE.md to checkMissingResources() critical paths check (line ~371)

**Labels**: `enhancement`, `phase-5-us5-existing-installation-sync-p2-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T037 - Add AGENTS.md and
CLAUDE.md to checkMissingResources() critical paths check (line ~371)

### Screen described (Mike)

Implementation at `extension/src/goferMigrator.ts` that add agents.md and
claude.md to checkmissingresources() critical paths check (line ~371).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 5: us5 - existing installation sync (p2) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 5: US5 - Existing Installation Sync
(P2)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/goferMigrator.ts` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T036, T038 **File Path**: `extension/src/goferMigrator.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 5: US5 - Existing
Installation Sync (P2) **User Story**: [US5]

---

## Issue #38: T038 - Add instruction file sync to syncMissingResources() using same pattern as other resources (line ~458)

**Labels**: `enhancement`, `phase-5-us5-existing-installation-sync-p2-`, `us5`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T038 - Add instruction file
sync to syncMissingResources() using same pattern as other resources (line ~458)

### Screen described (Mike)

Implementation at `extension/src/goferMigrator.ts` that add instruction file
sync to syncmissingresources() using same pattern as other resources (line
~458).

**Type**: [Service/Utility/Configuration] **Purpose**: [What this code
accomplishes] **Dependencies**: [What it requires]

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 5: us5 - existing installation sync (p2) task that
supports [US5].

**Priority**: P2 (Medium) - Part of Phase 5: US5 - Existing Installation Sync
(P2)

### Fields required (Mike)

N/A - This is a backend/infrastructure task without UI fields

### Acceptance Criteria

- [ ] The implementation in `extension/src/goferMigrator.ts` is complete
- [ ] Code follows project conventions and passes linting
- [ ] All type definitions are correct with no `any` types
- [ ] Unit tests are written if applicable

### Data needed (Mike)

**Entities**: [List entities this implementation needs]

**Sources**: [APIs, databases, or services providing data]

**Refresh**: [Real-time/hourly/daily/on-demand]

[If no external data: "N/A - Uses only local/in-memory data"]

### Integrations Needed (Team)

[List external or internal systems this task must integrate with]

[If standalone: "N/A - No external integrations required"]

### Navigation (Mike)

**Access**: Used by [list calling code]

**Invocation**: [How this code is executed]

**Integration Points**: [Where this fits in the system]

### Blocks needed (Team)

**Dependencies**:

- [List any external libraries or internal modules needed]

### Definition of Ready

- [ ] Mock up screen signed off (Mike) [N/A - Backend/Infrastructure]
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

**Related Tasks**: T037, T039 **File Path**: `extension/src/goferMigrator.ts`
**Estimated Effort**: M (4-8 hours) **Phase**: Phase 5: US5 - Existing
Installation Sync (P2) **User Story**: [US5]

---

## Issue #39: T039 - Verify AGENTS.md contains no Claude-specific or Copilot-specific syntax (cross-tool compatibility check)

**Labels**: `enhancement`, `phase-6-polish-cross-cutting-concerns`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T039 - Verify AGENTS.md
contains no Claude-specific or Copilot-specific syntax (cross-tool compatibility
check)

### Screen described (Mike)

This task involves: Verify AGENTS.md contains no Claude-specific or
Copilot-specific syntax (cross-tool compatibility check)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 6: polish & cross-cutting concerns task that
provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Polish & Cross-Cutting Concerns

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

**Related Tasks**: T038, T040 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: Polish & Cross-Cutting Concerns

---

## Issue #40: T040 - Verify CLAUDE.md uses @AGENTS.md import correctly and stays under 60 lines for all language types

**Labels**: `enhancement`, `phase-6-polish-cross-cutting-concerns`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T040 - Verify CLAUDE.md uses
@AGENTS.md import correctly and stays under 60 lines for all language types

### Screen described (Mike)

This task involves: Verify CLAUDE.md uses @AGENTS.md import correctly and stays
under 60 lines for all language types

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 6: polish & cross-cutting concerns task that
provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Polish & Cross-Cutting Concerns

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
Effort**: M (4-8 hours) **Phase**: Phase 6: Polish & Cross-Cutting Concerns

---

## Issue #41: T041 - Verify all generated files use LF line endings on all platforms

**Labels**: `enhancement`, `phase-6-polish-cross-cutting-concerns`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T041 - Verify all generated
files use LF line endings on all platforms

### Screen described (Mike)

This task involves: Verify all generated files use LF line endings on all
platforms

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
advancing feature implementation.

**Impact**: This is a phase 6: polish & cross-cutting concerns task that
provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Polish & Cross-Cutting Concerns

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
Effort**: M (4-8 hours) **Phase**: Phase 6: Polish & Cross-Cutting Concerns

---

## Issue #42: T042 - Verify workflow principles fragment content matches example.md mapping (plan-first, subagent strategy, self-improvement, verification, elegance, autonomous bug fixing, core principles all present)

**Labels**: `enhancement`, `phase-6-polish-cross-cutting-concerns`, `parallel`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T042 - Verify workflow
principles fragment content matches example.md mapping (plan-first, subagent
strategy, self-improvement, verification, elegance, autonomous bug fixing, core
principles all present)

### Screen described (Mike)

This task involves: Verify workflow principles fragment content matches
example.md mapping (plan-first, subagent strategy, self-improvement,
verification, elegance, autonomous bug fixing, core principles all present)

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
improving reliability and user experience.

**Impact**: This is a phase 6: polish & cross-cutting concerns task that
provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Polish & Cross-Cutting Concerns

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
Effort**: S (1-2 hours) **Phase**: Phase 6: Polish & Cross-Cutting Concerns

---

## Issue #43: T043 - Run full test suite to confirm no regressions in existing upgrade/sync flows

**Labels**: `enhancement`, `phase-6-polish-cross-cutting-concerns`
**Assignees**: @MikeNowosadko **Title**: [Feature]: T043 - Run full test suite
to confirm no regressions in existing upgrade/sync flows

### Screen described (Mike)

This task involves: Run full test suite to confirm no regressions in existing
upgrade/sync flows

N/A - Configuration or infrastructure task

### Business Rationale

**Problem**: This task is part of implementing the "Unknown Feature" feature.

**Value**: Completing this task contributes to the overall feature goal by
ensuring code quality and preventing regressions.

**Impact**: This is a phase 6: polish & cross-cutting concerns task that
provides foundational infrastructure.

**Priority**: P3 (Low) - Part of Phase 6: Polish & Cross-Cutting Concerns

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

**Related Tasks**: T042 **File Path**: `Multiple files or TBD` **Estimated
Effort**: M (4-8 hours) **Phase**: Phase 6: Polish & Cross-Cutting Concerns

---

---

## Summary by Phase

### Phase 1: Setup & Project Detection Engine

- Issue #1 - #9: 9 issues

### Phase 2: Template Fragment System

- Issue #10 - #21: 12 issues

### Phase 3: US1 + US2 + US3 - Instruction Generator & Core Generation (P1)

- Issue #22 - #33: 12 issues

### Phase 4: US4 - Regenerate Instructions Command (P2)

- Issue #34 - #35: 2 issues

### Phase 5: US5 - Existing Installation Sync (P2)

- Issue #36 - #38: 3 issues

### Phase 6: Polish & Cross-Cutting Concerns

- Issue #39 - #43: 5 issues

---

## Notes

- **All issues**: Pre-filled with enterprise Requirements Ticket template
- **Mike-specific sections**: Review and update before creating issues
- **Assignees**: Adjust based on actual team assignments
- **Dependencies**: Link related issues using #issue-number after creation
- **Sync with tasks.md**: Close issues as tasks are checked off

---

## Quick Stats

- **Total Issues**: 43
- **Parallel Tasks**: 23
- **Story-specific**: 17
- **Infrastructure**: 26

---

**Next Steps**:

1. Review each issue for completeness
2. Update Mike-specific sections (Screen described, Fields, Data, Navigation)
3. Confirm assignees and effort estimates
4. Create issues in GitHub using your preferred method
5. Link issues back to this document and tasks.md
