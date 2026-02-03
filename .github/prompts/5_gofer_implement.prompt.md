---
name: 5_gofer_implement
description: Execute tasks from tasks.md to implement the feature
agent: agent
argument-hint: The feature to implement (or continue from tasks)
---

# Gofer Implement

You are executing the implementation plan by processing all tasks from tasks.md.
This is the **fifth stage** of the unified Gofer pipeline.

## Prerequisites

This command expects in `.specify/specs/{feature}/`:

- `research.md` - Codebase analysis (from /1_gofer_research)
- `spec.md` - Feature specification (from /2_gofer_specify)
- `plan.md` - Implementation plan (from /3_gofer_plan)
- `tasks.md` - Task breakdown (from /4_gofer_tasks)

If missing, prompt user to run the prerequisite stage.

---

## Outline

1. Load implementation context
2. Load scope boundaries
3. Verify project setup
4. Execute tasks phase by phase (with feedback loops)
5. Track progress and handle errors
6. Output: Implemented feature code

---

## Step 1: Load Context

1. **Run setup script**:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```

   Parse JSON for FEATURE_DIR and task list

2. **Load implementation documents**:
   - **Required**: tasks.md (task list and execution plan)
   - **Required**: plan.md (tech stack, architecture, file structure)
   - **Required**: spec.md (scope boundaries and protected files)
   - **Optional**: data-model.md (entities and relationships)
   - **Optional**: contracts/ (API specifications)

---

## Step 2: Load Scope Boundaries

Extract protected boundaries from spec.md and tasks.md:

1. **Read "Protected Boundaries" section from spec.md**
2. **Read "Protected Files" section from tasks.md**
3. **Build exclusion list**

Display to confirm:

```
⚠️  SCOPE BOUNDARIES LOADED
The following files/patterns are PROTECTED and must NOT be modified:
- [list files]

If you need to modify these, STOP and ask for approval.
```

---

## Step 3: Execute Tasks

### Task Execution Loop

For each phase in tasks.md:

1. **Read current phase tasks**
2. **For each task**:
   - Parse task ID, description, file path
   - Implement the code change
   - Run relevant tests
   - Mark task complete: `- [X]`
   - Update progress in tasks.md header

### Execution Rules

1. **Complete phases sequentially**
2. **Within a phase, [P] tasks can run in parallel**
3. **Run tests after each task**
4. **On failure**: Fix and retry up to 3 times
5. **On persistent failure**: Stop and report

### Progress Tracking

After each task, update tasks.md:

```markdown
## Overview

| Total | Completed | Remaining | Progress |
| ----- | --------- | --------- | -------- |
| 25    | 12        | 13        | 48%      |
```

---

## Step 4: Quality Checks

### After Each Task

1. **Syntax Check**: Does the code compile?
2. **Test Run**: Do tests pass?
3. **Lint Check**: Does code follow conventions?

### After Each Phase

1. **Integration Test**: Does everything work together?
2. **Review Changes**: Summarize what was implemented

---

## Step 5: Handling Errors

### Test Failures

1. Read error message carefully
2. Identify root cause
3. Fix the issue
4. Re-run tests
5. If still failing after 3 attempts, stop and report

### Build Failures

1. Check syntax errors
2. Verify imports and dependencies
3. Fix compilation issues
4. Rebuild and continue

---

## Step 6: Completion

When all tasks are complete:

1. **Update tasks.md** with 100% progress
2. **Run full test suite**
3. **Generate summary of changes**
4. **Proceed to `/6_gofer_validate`**

---

## Pipeline Continuation

After completing all tasks, automatically proceed to `/6_gofer_validate` to
verify the implementation matches the plan and spec.
