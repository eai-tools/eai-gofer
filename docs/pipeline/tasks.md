# Tasks Stage

**Command**: `/4_gofer_tasks` **Input**: `plan.md`, `spec.md` **Output**:
`tasks.md`, `issues.md`

The tasks stage generates an actionable, dependency-ordered task breakdown from
the implementation plan. Each task is specific enough for an AI agent to execute
autonomously.

## What It Does

1. **Extracts tasks** from plan phases, spec user stories, and data models
2. **Orders by dependency** - setup before foundation, foundation before stories
3. **Identifies parallel opportunities** - tasks that can run concurrently
4. **Validates coverage** - every spec requirement has implementing tasks
5. **Runs engineer review** - cross-references spec, plan, and tasks for gaps
6. **Requests approval** before proceeding to implementation

## What You Get

The `tasks.md` file contains:

| Section          | Content                                           |
| ---------------- | ------------------------------------------------- |
| Overview         | Total count, parallel opportunities, story phases |
| Dependency Graph | Mermaid diagram showing phase ordering            |
| Phases           | Tasks organized by setup, stories, and polish     |
| Parallel Guide   | Which tasks can run concurrently                  |
| Protected Files  | Files that must NOT be modified                   |

## Task Format

Each task follows a specific format:

```text
- [ ] T001 [P] [US1] Create user model in src/models/user.ts
```

| Component   | Meaning                                    |
| ----------- | ------------------------------------------ |
| `- [ ]`     | Unchecked = pending, `- [X]` = completed   |
| `T001`      | Sequential task ID                         |
| `[P]`       | Can run in parallel with other `[P]` tasks |
| `[US1]`     | Implements User Story 1                    |
| Description | Clear action with file path                |

## Approval Gate

Tasks are presented for your review before implementation begins. You can:

- **Approve** (`lgtm`) - proceed to implementation
- **Modify** - request changes to the task breakdown
- **Stop** - halt the pipeline

This is your last chance to adjust scope before code is written.

## Engineer Review

An automated review checks alignment between spec, plan, and tasks:

| Finding Level | Meaning                          | Action                   |
| ------------- | -------------------------------- | ------------------------ |
| Red           | Missing coverage or misalignment | Must fix before approval |
| Yellow        | Recommendation for improvement   | Note for awareness       |
| Gray          | Minor observation                | Optional to address      |

## Example

```text
/4_gofer_tasks Break down the auth feature into tasks
```

This produces `tasks.md` with phased tasks for schema setup, middleware
creation, endpoint implementation, and testing.
