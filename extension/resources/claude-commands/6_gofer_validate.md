---
description: Validate implementation matches plan and passes all checks
---

# Gofer Validate

You are validating that the implementation matches the plan and all success
criteria are met. This is the **sixth and final stage** of the unified Gofer
pipeline.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Prerequisites

This command expects in `.specify/specs/{feature}/`:

- `research.md` - Codebase analysis (from /1_gofer_research)
- `spec.md` - Feature specification (from /2_gofer_specify)
- `plan.md` - Implementation plan (from /3_gofer_plan)
- `tasks.md` - Task breakdown (from /4_gofer_tasks)
- Implemented code (from /5_gofer_implement)

---

## Outline

1. Context health check
2. Load implementation context
3. Discover what was implemented
4. Validate against plan and spec
5. Run automated verification
6. Generate validation report
7. Output: validation-report.md

---

## Step 0: Context Health Check

Before starting validation, assess context window health:

```bash
.specify/scripts/bash/check-context-health.sh
```

- If **< 50%**: Proceed normally
- If **50-70%**: Consider `/compact` - validation loads all artifacts
- If **> 70%**: Start new session with handoff summary

Validation reviews all artifacts and implementation - context may be high.

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

### 2.1 Spawn Parallel Validation Agents

Launch these agents in parallel using Task tool:

**Agent 1: Code Change Analyzer**

```
Task: subagent_type="codebase-analyzer"
Prompt: "Analyze the recent implementation changes for [FEATURE].
Compare: actual code vs planned architecture.
Check: patterns, structure, completeness."
```

**Agent 2: Test Coverage Checker**

```
Task: subagent_type="codebase-locator"
Prompt: "Find all test files for [FEATURE].
Identify: test coverage, missing tests, test patterns."
```

**Agent 3: Integration Verifier**

```
Task: subagent_type="codebase-pattern-finder"
Prompt: "Verify [FEATURE] integrates correctly with existing code.
Check: import paths, API contracts, dependencies."
```

### 2.2 Gather Git Evidence

```bash
# See what was changed
git diff --stat HEAD~[N] HEAD

# See detailed changes
git log --oneline HEAD~[N]..HEAD
```

---

## Step 3: Systematic Validation

### 3.1 Task Completion Check

For each task in tasks.md:

1. Verify `- [X]` marked tasks are actually complete
2. Check file exists at specified path
3. Verify implementation matches task description

```
| Task | Status | File Exists | Implementation |
|------|--------|-------------|----------------|
| T001 | [X]    | ✓           | ✓ Matches      |
| T002 | [X]    | ✓           | ✓ Matches      |
| T003 | [ ]    | -           | - Not done     |
```

### 3.2 Spec Compliance Check

For each user story in spec.md:

1. List acceptance criteria
2. Check each criterion is satisfied
3. Note any gaps or deviations

```
| User Story | Acceptance Criteria | Status |
|------------|---------------------|--------|
| US1        | User can login      | ✓ PASS |
| US1        | Error shown on fail | ✓ PASS |
| US2        | Data persists       | ⚠️ PARTIAL |
```

### 3.3 Architecture Compliance Check

From plan.md, verify:

1. File structure matches planned structure
2. Components in correct locations
3. Dependencies match tech stack
4. Patterns follow research.md findings

### 3.4 AI Slop Detection

Check for common AI-generated code quality issues:

#### Code Quality Patterns

- [ ] **No disabled tests**: Search for `it.skip`, `test.skip`, `@Ignore`,
      `@Disabled`
- [ ] **No skipped assertions**: Empty `expect()`, `assert True` without
      conditions
- [ ] **No TODO placeholders**: `// TODO: implement`, `pass # TODO`
- [ ] **No excessive duplication**: More than 5 similar code blocks

```bash
# Search for disabled tests
grep -rn "\.skip\|@Ignore\|@Disabled" --include="*.test.*" --include="*.spec.*"

# Search for TODO placeholders
grep -rn "TODO.*implement\|FIXME\|XXX" --include="*.ts" --include="*.js" --include="*.py"
```

#### Error Handling Patterns

- [ ] **No empty catch blocks**: `catch (e) {}` or `except: pass`
- [ ] **No generic error swallowing**: Catching all errors without logging
- [ ] **Proper error propagation**: Errors re-thrown or handled meaningfully

```bash
# Search for empty catch blocks
grep -rn "catch.*{[[:space:]]*}" --include="*.ts" --include="*.js"
```

#### Configuration Patterns

- [ ] **No hardcoded secrets**: API keys, passwords in code
- [ ] **No magic numbers**: Unexplained numeric literals
- [ ] **Config externalized**: Environment-specific values in config files

#### Code Style Patterns

- [ ] **Follows codebase conventions**: Matches patterns from research.md
- [ ] **No copy-paste artifacts**: Adapted to local patterns, not verbatim
- [ ] **Consistent naming**: Follows project naming conventions

#### Slop Detection Results

```
| Pattern | Found | Severity | Action Required |
|---------|-------|----------|-----------------|
| Disabled tests | 0 | - | None |
| TODO placeholders | 2 | Medium | Review and complete |
| Empty catch blocks | 0 | - | None |
| Hardcoded values | 1 | High | Externalize to config |
```

**If slop detected**:

1. Document specific issues in validation report
2. Mark validation as PARTIAL
3. Require remediation before marking complete
4. Re-run validation after fixes

---

## Step 4: Run Automated Verification

Execute verification commands:

### Build Check

```bash
npm run build  # or appropriate build command
```

### Test Check

```bash
npm test  # or appropriate test command
```

### Lint Check

```bash
npm run lint  # or appropriate lint command
```

### Type Check (if TypeScript)

```bash
npm run typecheck  # or tsc --noEmit
```

Document results:

```
| Check      | Command          | Result |
|------------|------------------|--------|
| Build      | npm run build    | ✓ PASS |
| Tests      | npm test         | ✓ PASS |
| Lint       | npm run lint     | ⚠️ 3 warnings |
| TypeCheck  | tsc --noEmit     | ✓ PASS |
```

---

## Step 5: Generate Validation Report

Write to `{FEATURE_DIR}/validation-report.md`:

```markdown
---
feature: [Feature Name]
validated: [ISO timestamp]
validator: Claude
status: [PASS/FAIL/PARTIAL]
---

# Validation Report: [Feature Name]

## Summary

| Category         | Status             |
| ---------------- | ------------------ |
| Task Completion  | ✓ 25/25 tasks      |
| Spec Compliance  | ✓ All criteria met |
| Architecture     | ✓ Matches plan     |
| Automated Checks | ⚠️ 3 lint warnings |

**Overall Status**: [PASS/FAIL/PARTIAL]

## Implementation Status

### Tasks Completed

✓ Phase 1: Setup - 4/4 tasks ✓ Phase 2: Foundational - 3/3 tasks ✓ Phase 3: User
Story 1 - 8/8 tasks ✓ Phase 4: User Story 2 - 6/6 tasks ✓ Phase 5: Polish - 4/4
tasks

### Files Created/Modified

| File                        | Status  | Notes                 |
| --------------------------- | ------- | --------------------- |
| src/models/user.ts          | Created | Matches data-model.md |
| src/services/userService.ts | Created | Implements US1        |
| src/routes/users.ts         | Created | Matches contracts/    |

## Automated Verification Results

### Build

✓ Build passes

### Tests

✓ 24/24 tests pass

- Coverage: 85%

### Linting

⚠️ 3 warnings (non-blocking)

- Line 45: unused variable
- Line 67: missing return type
- Line 89: prefer const

### Type Checking

✓ No type errors

## Code Review Findings

### Matches Plan

- [x] File structure matches plan.md
- [x] Tech stack as specified
- [x] Follows existing patterns from research.md

### Deviations from Plan

- [List any deviations with justification]

### Potential Issues

- [Any concerns discovered]

## Spec Compliance

### User Story 1: [Description]

- [x] Acceptance criterion 1
- [x] Acceptance criterion 2
- [x] Acceptance criterion 3

### User Story 2: [Description]

- [x] Acceptance criterion 1
- [x] Acceptance criterion 2

## Manual Testing Required

The following require manual verification:

1. **UI/UX**
   - [ ] Feature appears correctly
   - [ ] Error states display properly
   - [ ] Responsive on mobile

2. **Integration**
   - [ ] Works with existing features
   - [ ] Performance acceptable

## Recommendations

### Before Merge

- [ ] Fix 3 lint warnings
- [ ] Add test for edge case X

### Future Improvements

- Consider adding caching for performance
- Documentation could be expanded

## Next Steps

1. Run manual testing checklist above
2. Fix any blocking issues
3. Create PR for review
4. Merge and deploy
```

---

## Step 6: Report Completion

After validation complete:

```
════════════════════════════════════════════════════════════════
  ✓ VALIDATION COMPLETE: [Feature Name]
════════════════════════════════════════════════════════════════

  Status: [PASS/FAIL/PARTIAL]

  Summary:
  - Tasks: 25/25 completed ✓
  - Spec: All acceptance criteria met ✓
  - Build: Passes ✓
  - Tests: 24/24 pass ✓
  - Lint: 3 warnings (non-blocking)

  Report: {FEATURE_DIR}/validation-report.md

  Recommended actions:
  - [ ] Fix lint warnings
  - [ ] Run manual tests
  - [ ] Create pull request

════════════════════════════════════════════════════════════════
  FEATURE PIPELINE COMPLETE!

  All Gofer stages finished:
  1. /1_gofer_research ✓
  2. /2_gofer_specify ✓
  3. /3_gofer_plan ✓
  4. /4_gofer_tasks ✓
  5. /5_gofer_implement ✓
  6. /6_gofer_validate ✓

  The feature is ready for review and merge.
════════════════════════════════════════════════════════════════
```

---

## LLM Council Integration (Optional)

When council mode is enabled for `validate_plan` stage:

1. Multiple LLMs review the implementation independently
2. Each provider checks different aspects:
   - Code quality
   - Architecture compliance
   - Test coverage
   - Security considerations
3. Chairman synthesizes findings
4. Highlights consensus issues (high confidence)
5. Notes divergent assessments needing human judgment
6. Usage logged to `.specify/logs/council-usage.jsonl`

**Benefits**: Multiple reviewers catch different issues, similar to having
multiple code reviewers.

---

## Validation Checklist

Always verify:

- [ ] All tasks marked complete are actually done
- [ ] Automated tests pass
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Implementation matches specification
- [ ] Architecture matches plan
- [ ] Documentation updated if needed

---

## Step 7: Memory Update Check

After successful validation, assess whether learnings should be persisted.

### 7.1 Memory Update Decision Matrix

| Learning Type                | Update Location              | When to Update                            |
| ---------------------------- | ---------------------------- | ----------------------------------------- |
| **Project-wide patterns**    | `CLAUDE.md`                  | New conventions affecting all future work |
| **Architectural decisions**  | `.specify/memory/decisions/` | Significant design choices with rationale |
| **Feature-specific context** | `{FEATURE_DIR}/research.md`  | Discoveries relevant only to this feature |
| **Reusable code patterns**   | `CLAUDE.md` or constitution  | Patterns other features should follow     |
| **Bug workarounds**          | `.specify/memory/decisions/` | Issues that may recur                     |

### 7.2 CLAUDE.md Update Criteria

**DO update CLAUDE.md when**:

- Discovered a new coding convention used across the codebase
- Identified a critical dependency or integration pattern
- Found a gotcha that affects multiple features
- Established a new testing or build pattern

**DO NOT update CLAUDE.md when**:

- Learning is specific to one feature
- Information will become stale quickly
- Pattern is already documented elsewhere
- Change is experimental/temporary

### 7.3 Decision Record Format

For architectural decisions, create `.specify/memory/decisions/NNN-topic.md`:

```markdown
---
id: NNN
title: [Decision Title]
status: accepted
date: [ISO date]
feature: [Feature Name]
---

# [Decision Title]

## Context

[Why this decision was needed]

## Decision

[What was decided]

## Consequences

- [Positive consequence]
- [Negative consequence / trade-off]

## Alternatives Considered

1. [Alternative 1] - [Why rejected]
2. [Alternative 2] - [Why rejected]
```

### 7.4 Memory Update Checklist

Before completing validation, verify:

- [ ] Any project-wide patterns discovered → added to CLAUDE.md?
- [ ] Any significant decisions made → recorded in decisions/?
- [ ] Any gotchas or workarounds → documented for future reference?
- [ ] Feature-specific learnings → captured in research.md?

---

## Observability Logging

At stage completion, log metrics:

```bash
.specify/scripts/bash/log-stage.sh 6_validate --complete --tokens [N] --compactions [N]
```

This also logs quality metrics (test coverage, lint issues) to:
`.specify/logs/quality-metrics.jsonl`

---

## Key Rules

- Be thorough but practical - focus on what matters
- Run all automated checks - don't skip verification
- Document everything - both successes and issues
- Think critically - does implementation solve the problem?
- Consider maintenance - will this be maintainable?
- Update memory files when appropriate - preserve valuable learnings
- Log stage completion for observability tracking
