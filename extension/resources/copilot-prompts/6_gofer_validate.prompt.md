---
name: 6_gofer_validate
description: Validate implementation matches plan and passes all checks
agent: agent
tools: ['search/codebase', 'terminal', 'editFile']
argument-hint: The feature to validate (or continue from implementation)
---

# Gofer Validate

You are validating that the implementation matches the plan and all success
criteria are met. This is the **sixth and final stage** of the unified Gofer
pipeline.

## Prerequisites

This command expects in `.specify/specs/{feature}/`:

- `research.md` - Codebase analysis (from /1_gofer_research)
- `spec.md` - Feature specification (from /2_gofer_specify)
- `plan.md` - Implementation plan (from /3_gofer_plan)
- `tasks.md` - Task breakdown (from /4_gofer_tasks)
- Implemented code (from /5_gofer_implement)

---

## Outline

1. Load implementation context
2. Discover what was implemented
3. Validate against plan and spec
4. Run automated verification
5. Generate validation report
6. Output: validation-report.md

---

## Step 1: Load Context

1. **Run setup script**:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json
   ```

   Parse JSON for FEATURE_DIR

2. **Load all artifacts**:
   - spec.md (success criteria, acceptance criteria)
   - plan.md (architecture, file structure)
   - tasks.md (task completion status)
   - research.md (codebase patterns to follow)

---

## Step 2: Context Discovery

### Gather Evidence

1. **Analyze code changes** for the feature
2. **Find all test files** related to the feature
3. **Verify integration** with existing code

### Gather Git Evidence

```bash
# See what was changed
git diff --stat HEAD~[N] HEAD

# See detailed changes
git log --oneline HEAD~[N]..HEAD
```

---

## Step 3: Systematic Validation

### Task Completion Check

For each task in tasks.md:

1. Verify `- [X]` marked tasks are actually complete
2. Check file exists at specified path
3. Verify implementation matches task description

```
| Task | Status | File Exists | Implementation |
|------|--------|-------------|----------------|
| T001 | [X]    | ✓           | ✓ Matches      |
| T002 | [X]    | ✓           | ✓ Matches      |
```

### Spec Compliance Check

For each user story in spec.md:

1. List acceptance criteria
2. Check each criterion is satisfied
3. Note any gaps or deviations

```
| User Story | Acceptance Criteria | Status |
|------------|---------------------|--------|
| US1        | User can login      | ✓ PASS |
| US1        | Error on invalid    | ✓ PASS |
```

### Architecture Compliance Check

Verify against plan.md:

1. **File structure matches** planned structure
2. **Tech stack used** as specified
3. **Patterns followed** from research.md

---

## Step 4: Automated Verification

### Run Tests

```bash
npm test
```

Check:

- All tests pass
- Coverage meets minimum threshold (80%)
- No regressions in existing tests

### Run Linting

```bash
npm run lint
```

Check:

- No linting errors
- Code follows project conventions

### Build Verification

```bash
npm run build
```

Check:

- Build completes successfully
- No TypeScript errors

---

## Step 5: Generate Validation Report

Write to `{FEATURE_DIR}/validation-report.md`:

```markdown
---
feature: [Feature Name]
validated: [ISO timestamp]
validator: Copilot
status: [PASS|FAIL|PARTIAL]
---

# Validation Report: [Feature Name]

## Summary

| Check Category  | Result | Details          |
| --------------- | ------ | ---------------- |
| Tasks Complete  | ✓ PASS | 25/25 tasks      |
| Spec Compliance | ✓ PASS | All criteria met |
| Tests Pass      | ✓ PASS | 100% passing     |
| Coverage        | ✓ PASS | 85% coverage     |
| Lint Clean      | ✓ PASS | No errors        |
| Build Success   | ✓ PASS | Clean build      |

## Task Completion

All [N] tasks completed successfully.

## Spec Compliance

### User Story 1: [Title]

- [x] AC1: [Criterion] - PASS
- [x] AC2: [Criterion] - PASS

### User Story 2: [Title]

- [x] AC1: [Criterion] - PASS

## Success Criteria

| Criterion | Expected | Actual  | Status |
| --------- | -------- | ------- | ------ |
| [Metric]  | [Value]  | [Value] | PASS   |

## Test Results

- Total Tests: [N]
- Passed: [N]
- Failed: 0
- Coverage: [X]%

## Issues Found

[List any issues, or "No issues found"]

## Recommendations

[Any follow-up actions or improvements]

## Conclusion

**[PASS/FAIL]**: [Summary statement]
```

---

## Pipeline Complete

The Gofer pipeline is complete! The feature has been:

1. ✅ Researched (`research.md`)
2. ✅ Specified (`spec.md`)
3. ✅ Planned (`plan.md`)
4. ✅ Tasked (`tasks.md`)
5. ✅ Implemented (source code)
6. ✅ Validated (`validation-report.md`)

All artifacts are in `.specify/specs/{feature}/`.
