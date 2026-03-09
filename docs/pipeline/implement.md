# Implement Stage

**Command**: `/5_gofer_implement` **Input**: `tasks.md`, `plan.md`, `spec.md`
**Output**: Source code

The implement stage executes tasks from `tasks.md` phase by phase, writing
actual code according to the plan's architecture. It's the stage where
specifications become working software.

## What It Does

1. **Loads scope boundaries** - identifies protected files that must not be
   modified
2. **Executes tasks in order** - respects phase dependencies
3. **Runs parallel tasks** concurrently when marked with `[P]`
4. **Verifies after each task** - runs linting, type checks, and tests
5. **Creates checkpoints** - commits at phase boundaries for safe rollback
6. **Tracks progress** - marks each task `[X]` in `tasks.md` as completed

## How It Works

### Execution Order

```text
Phase 1: Setup          (sequential - must complete first)
Phase 2: Foundational   (sequential - shared components)
Phase 3: User Story P1  (parallel where marked)
Phase 4: User Story P2  (parallel where marked)
Phase N: Polish         (final cleanup)
```

### Feedback Loop

After every task, the implementation stage runs verification:

1. **Lint** modified files
2. **Type check** (TypeScript projects)
3. **Run tests** related to the modified component

If any check fails, the task is fixed before proceeding.

### Scope Enforcement

Before modifying any file, the stage checks:

- Is the file listed in the task scope?
- Is it in the protected files list?
- Does the change align with the plan architecture?

If a scope violation is detected, implementation stops and asks for approval.

## Context Management

Implementation is the longest-running stage and can consume significant context.
Gofer monitors context health and:

- At **50% context usage**: Starts using sub-agents for exploration
- At **70% context usage**: Recommends saving progress with `/7_gofer_save`

You can resume with `/8_gofer_resume` in a fresh session without losing
progress.

## Minimal Changes Principle

The implementation stage follows a strict "minimal changes" rule:

- Only modify files listed in the task
- Only add code required by the current task
- No refactoring of surrounding code
- No gold-plating (extra comments, type annotations on unchanged code)
- No features beyond what's specified

## Example

```text
/5_gofer_implement Execute the auth feature tasks
```

This reads `tasks.md`, executes each task in order, writes the code, runs
verification, and marks tasks complete.
