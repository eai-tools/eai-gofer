---
name: 4_gofer_tasks
description: Generate actionable task breakdown from implementation plan
agent: agent
argument-hint: The feature to break into tasks (or continue from plan)
---

# Gofer Tasks

You are generating an actionable, dependency-ordered task breakdown. This is the
**fourth stage** of the unified Gofer pipeline.

## Prerequisites

This command expects in `.specify/specs/{feature}/`:

- `research.md` - Codebase analysis (from /1_gofer_research)
- `spec.md` - Feature specification (from /2_gofer_specify)
- `plan.md` - Implementation plan (from /3_gofer_plan)

If missing, prompt user to run the prerequisite stage.

---

## Outline

1. Load plan and spec context
2. Extract task structure from all artifacts
3. Generate dependency-ordered tasks by user story
4. Create parallel execution opportunities
5. Output: `tasks.md`, `issues.md`

---

## Step 1: Load Context

1. **Run setup script**:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

   Parse JSON for FEATURE_DIR, AVAILABLE_DOCS

2. **Load design documents** from FEATURE_DIR:
   - **Required**: plan.md (tech stack, architecture, file structure)
   - **Required**: spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities)
   - **Optional**: contracts/ (API endpoints)

3. **Load tasks template**: `.specify/templates/tasks-template.md`

---

## Step 2: Extract Task Sources

### From Spec (User Stories)

Extract from spec.md:

- User stories with priorities (P1, P2, P3...)
- Acceptance criteria for each story

### From Plan (Architecture)

Extract from plan.md:

- Tech stack and libraries
- File structure and components
- Integration points
- Implementation phases

### From Data Model (if exists)

Extract entities, relationships, validation rules.

### From Contracts (if exists)

Extract API endpoints and schemas.

---

## Step 3: Generate Task Breakdown

### Task Organization Rules

Tasks MUST be organized by user story:

1. **Phase 1: Setup** - Project initialization, shared infrastructure
2. **Phase 2: Foundational** - Blocking prerequisites for all user stories
3. **Phase 3+: User Stories** - One phase per story in priority order
4. **Final Phase: Polish** - Cross-cutting concerns, documentation

### Task Format (REQUIRED)

Every task MUST follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Components**:

1. **Checkbox**: Always `- [ ]`
2. **Task ID**: Sequential (T001, T002...)
3. **[P] marker**: Only if parallelizable
4. **[Story] label**: [US1], [US2] etc. for user story phases only
5. **Description**: Clear action with exact file path

**Examples**:

- `- [ ] T001 Create project structure per implementation plan`
- `- [ ] T005 [P] Implement auth middleware in src/middleware/auth.ts`
- `- [ ] T012 [P] [US1] Create User model in src/models/user.ts`

---

## Step 4: Write Tasks Document

Write to `{FEATURE_DIR}/tasks.md`:

```markdown
---
feature: [Feature Name]
created: [ISO date]
author: Copilot
total_tasks: [N]
completed_tasks: 0
status: pending
---

# Tasks: [Feature Name]

## Overview

| Total | Completed | Remaining | Progress |
| ----- | --------- | --------- | -------- |
| [N]   | 0         | [N]       | 0%       |

## Phase 1: Setup

- [ ] T001 Initialize project structure per plan.md
- [ ] T002 Install dependencies listed in plan.md

## Phase 2: Foundation

- [ ] T003 Create shared types in src/types/[feature].ts
- [ ] T004 [P] Setup database migrations (if applicable)

## Phase 3: User Story 1 - [Story Title]

- [ ] T005 [P] [US1] Create [component] in [path]
- [ ] T006 [P] [US1] Implement [functionality] in [path]
- [ ] T007 [US1] Write tests for [component]

## Phase 4: User Story 2 - [Story Title]

- [ ] T008 [P] [US2] ...

## Final Phase: Polish

- [ ] T0XX Update documentation
- [ ] T0XX Final integration testing

## Protected Files

These files must NOT be modified:

- [path/to/file] (reason)

## Execution Notes

- Tasks marked [P] can run in parallel within their phase
- Complete all tasks in a phase before moving to next
- Run tests after each task completion
```

---

## Pipeline Continuation

After completing tasks.md, automatically proceed to `/5_gofer_implement` to
begin task execution.
