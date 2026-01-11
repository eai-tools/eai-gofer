# Gap Implementation Roadmap

**Date**: January 2026 **Purpose**: Map the 10 identified gaps to specific
implementation locations in the SpecGofer codebase

---

## Overview

This document provides a detailed implementation guide for addressing the 10
gaps identified in the
[SpecGofer Gap Analysis](./specgofer-gap-analysis-jan-2026.md). Each gap is
mapped to:

- **Files to modify** (existing commands, scripts, templates)
- **Files to create** (new scripts, templates)
- **Specific sections** to add or update
- **Priority** (High/Medium/Lower)

---

## Gap 1: Context Window Management (HIGH PRIORITY)

### Problem

No proactive context monitoring between stages. No warnings before context
overflow.

### Implementation Locations

#### New Script: `check-context-health.sh`

**Create**: `.specify/scripts/bash/check-context-health.sh`

```bash
#!/usr/bin/env bash
# Estimates context window usage and warns at thresholds
#
# Usage: ./check-context-health.sh [--json] [--threshold N]
#
# Features:
# - Counts tokens in spec.md, plan.md, tasks.md, contracts/
# - Estimates source file context (recently modified)
# - Warns at 50% threshold
# - Recommends compaction at 70%
```

#### Commands to Update

| File                     | Section to Add                                               |
| ------------------------ | ------------------------------------------------------------ |
| `0_business_scenario.md` | Add context health check in Step 1 before Quick Context Scan |
| `1_gofer_research.md`    | Add "Context Health Check" section after Step 1              |
| `2_gofer_specify.md`     | Add context check before loading context                     |
| `3_gofer_plan.md`        | Add context check at start of Phase 0.5                      |
| `4_gofer_tasks.md`       | Add context check before task generation                     |
| `5_gofer_implement.md`   | Add context check before each phase                          |
| `6_gofer_validate.md`    | Add context check before validation                          |

#### Sample Section to Add

```markdown
## Context Health Check

Before starting this stage:

1. Check context usage: `/stats` or run `check-context-health.sh`
2. If > 50%, consider `/compact` or start new session
3. Document key decisions to `session-handoff.md` before compaction
```

---

## Gap 2: Session Handoff & Continuity (MEDIUM PRIORITY)

### Problem

No explicit session handoff guidance when context gets full.

### Implementation Locations

#### New Template: `session-handoff-template.md`

**Create**: `.specify/templates/session-handoff-template.md`

```markdown
---
feature: [Feature Name]
session: [N]
created: [ISO timestamp]
context_usage: [N%]
---

# Session Handoff: [Feature Name]

## Completed

- [What was done]

## Current State

- Stage: [current stage]
- Files modified: [list]
- Tests passing: [yes/no]

## Next Steps

- [What remains]

## Key Decisions Made

- [Decision 1]: [Rationale]

## Context to Preserve

- [Critical context that must carry forward]
```

#### Commands to Update

| File                   | Section to Add                               |
| ---------------------- | -------------------------------------------- |
| `5_gofer_implement.md` | Add "Session Boundary Guidance" after Step 6 |
| `6_resume_work.md`     | Reference session-handoff.md in Step 1       |
| `5_save_progress.md`   | Generate handoff summary automatically       |

#### New Script: `save-checkpoint.sh`

**Create**: `.specify/scripts/bash/save-checkpoint.sh`

```bash
#!/usr/bin/env bash
# Creates checkpoint with git state and task progress
# Outputs: {FEATURE_DIR}/session-handoff.md
```

---

## Gap 3: Scope Control & Drift Prevention (HIGH PRIORITY)

### Problem

No explicit "must NOT change" boundaries or enforcement during implementation.

### Implementation Locations

#### Templates to Update

**`spec-template.md`** - Add after "Out of Scope" section:

```markdown
## Protected Boundaries (Must NOT Modify)

The following MUST NOT be modified during implementation:

### Files

- [file/pattern]: [reason]

### Patterns

- [pattern to preserve]: [reason]

### Behavior

- [behavior that must not change]: [reason]

**If crossing boundaries is required**:

1. STOP execution
2. Document the need in this section
3. Get explicit user approval
```

**`tasks-template.md`** - Add at top:

```markdown
## Protected Files (Scope Boundaries)

These files are explicitly OUT OF SCOPE per spec.md:

- [ ] [File 1] - Read from spec.md Out of Scope
- [ ] [File 2]

**Before modifying ANY file**: Check against this list.
```

#### Commands to Update

| File                   | Section to Add                                 |
| ---------------------- | ---------------------------------------------- |
| `2_gofer_specify.md`   | Add "Protected Boundaries" section generation  |
| `5_gofer_implement.md` | Add "Scope Enforcement Check" before each task |

#### Scope Enforcement Check (for `5_gofer_implement.md`)

```markdown
## Scope Enforcement

Before EACH file modification:

1. Check if file is in planned scope (tasks.md file paths)
2. Check if file is in "Protected Boundaries" list (spec.md)
3. If crossing boundary → STOP and ask user for approval
```

---

## Gap 4: AI Slop Detection & Prevention (MEDIUM PRIORITY)

### Problem

No systematic detection of AI slop patterns (disabled tests, duplicated code,
generic handlers).

### Implementation Locations

#### Templates to Update

**`checklist-template.md`** - Add new section:

```markdown
## AI Output Quality Checks

- [ ] No disabled tests (`it.skip`, `test.skip`, `@Ignore`)
- [ ] No skipped assertions (empty `expect()`, `assert True`)
- [ ] No TODO comments deferring real implementation
- [ ] No excessive code duplication (> 5 similar blocks)
- [ ] No generic error handling that swallows errors (`catch {}`)
- [ ] No hardcoded values that should be configuration
- [ ] No copy-paste without adaptation to local patterns
```

#### Commands to Update

| File                  | Section to Add                         |
| --------------------- | -------------------------------------- |
| `6_gofer_validate.md` | Add "AI Slop Detection" in Step 3      |
| `speckit.analyze.md`  | Add slop detection to Detection Passes |

#### AI Slop Detection (for `6_gofer_validate.md`)

```markdown
## AI Slop Detection

Check for common AI slop patterns:

### Code Quality

- [ ] No disabled tests or skipped assertions
- [ ] No TODO comments deferring implementation
- [ ] No excessive duplication (> 5 similar blocks)

### Error Handling

- [ ] No empty catch blocks
- [ ] No generic error swallowing

### Configuration

- [ ] No hardcoded values that should be config
- [ ] No magic numbers without constants

### Patterns

- [ ] Code follows existing codebase patterns (from research.md)
- [ ] No copy-paste without adaptation

If slop detected:

1. Document specific issues
2. Require remediation before marking complete
```

---

## Gap 5: Memory Update Management (MEDIUM PRIORITY)

### Problem

No guidance on when to update CLAUDE.md vs feature-specific files. No memory
decay.

### Implementation Locations

#### New File: `.specify/memory/decisions/README.md`

**Create**: `.specify/memory/decisions/README.md`

```markdown
# Decision Log

This directory stores permanent decisions extracted from feature work.

## When to Add a Decision

- New project-wide pattern established
- New constraint discovered
- Universal tool/command added

## Format

Files named: `YYYYMMDD_decision_topic.md`

## Cleanup

Quarterly review: Archive superseded decisions
```

#### Commands to Update

| File                     | Section to Add                   |
| ------------------------ | -------------------------------- |
| `6_gofer_validate.md`    | Add "Memory Update Check" at end |
| `0_business_scenario.md` | Add note about CLAUDE.md scope   |

#### Memory Update Check (for `6_gofer_validate.md`)

```markdown
## Memory Management

After feature completion, review:

### Extract to CLAUDE.md (Universal)

- [ ] New project-wide patterns established?
- [ ] New tools/commands added?
- [ ] Universal constraints discovered?

### Keep in Feature Directory (Specific)

- Feature-specific decisions → stay in spec.md
- Temporary workarounds → document and delete later
- Debugging notes → don't persist

### Cleanup

- [ ] Archive temporary files from feature directory
- [ ] Remove obsolete decisions from CLAUDE.md
```

---

## Gap 6: Error Recovery & Checkpoints (HIGH PRIORITY)

### Problem

No systematic checkpoint system beyond git. No undo-and-retry guidance.

### Implementation Locations

#### Commands to Update

**`5_gofer_implement.md`** - Add checkpoint strategy:

````markdown
## Checkpoint Strategy

Create checkpoints (git commit) at:

- [ ] Before starting each phase
- [ ] After completing each user story
- [ ] Before any "risky" operation

### Risky Operations

- Modifying database schemas
- Changing authentication/authorization
- Modifying core infrastructure
- Large refactoring (> 5 files)

### Checkpoint Command

```bash
git add -A && git commit -m "WIP: [phase] - checkpoint before [operation]"
```
````

## If Something Goes Wrong

1. **STOP immediately** - don't make more changes
2. **Assess damage**: `git status && git diff`
3. **Rollback options**:
   - Single file: `git checkout HEAD -- <file>`
   - All changes: `git reset --hard HEAD`
   - To checkpoint: `git reset --hard <commit>`
4. **Document** what went wrong
5. **Retry** with modified approach

````

---

## Gap 7: Feedback Loops (HIGH PRIORITY)

### Problem
No continuous test/lint/build verification during implementation.

### Implementation Locations

#### New Script: `verify-task.sh`
**Create**: `.specify/scripts/bash/verify-task.sh`

```bash
#!/usr/bin/env bash
# Verifies task completion with automated checks
#
# Usage: ./verify-task.sh [--json] <task_id>
#
# Runs:
# - File existence checks
# - Related tests
# - Lint on modified files
# - Type check (if TypeScript)
````

#### Commands to Update

**`5_gofer_implement.md`** - Add feedback loop section:

````markdown
## Feedback Loop Requirements

### After EACH Task

1. Run relevant tests: `npm test -- --grep "[task pattern]"`
2. If tests fail → fix BEFORE next task
3. Run linter: `npm run lint -- [modified files]`
4. Run type check: `npm run typecheck`

### After EACH Phase

1. Run full test suite: `npm test`
2. Run build: `npm run build`
3. Document any failures
4. **DO NOT proceed if build is broken**

### Verification Script

```bash
.specify/scripts/bash/verify-task.sh T001
```
````

````

---

## Gap 8: Observability & Monitoring (LOWER PRIORITY)

### Problem
No systematic logging of token usage, decisions, or quality metrics outside council mode.

### Implementation Locations

#### Extend: `common.sh`
**Modify**: `.specify/scripts/bash/common.sh`

Add logging functions:
```bash
LOG_DIR="${REPO_ROOT:-.}/.specify/logs"

log_event() {
    local level="$1"
    local message="$2"
    local context="${3:-}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    mkdir -p "$LOG_DIR"
    echo '{"timestamp":"'"$timestamp"'","level":"'"$level"'","message":"'"$message"'","context":"'"$context"'"}' >> "$LOG_DIR/pipeline.jsonl"
}
````

#### Commands to Update

| File                  | Section to Add                          |
| --------------------- | --------------------------------------- |
| `6_gofer_validate.md` | Add observability logging at completion |
| All Gofer commands    | Add stage start/end logging             |

#### Pipeline Log Format

```json
{
  "timestamp": "2026-01-11T10:30:00Z",
  "feature": "feature-001",
  "stage": "5_implement",
  "tokensUsed": 45000,
  "compactionEvents": 1,
  "errorsEncountered": [],
  "duration": "PT45M"
}
```

---

## Gap 9: Brownfield-Specific Guidance (LOWER PRIORITY)

### Problem

No explicit guidance for legacy constraints and tech debt documentation.

### Implementation Locations

#### Templates to Update

**`spec-template.md`** - Add brownfield section:

```markdown
## Brownfield Analysis

### Legacy Constraints

- [ ] Framework limitations: [describe]
- [ ] Database schema constraints: [describe]
- [ ] API compatibility requirements: [describe]
- [ ] Performance requirements: [describe]

### Technical Debt to Avoid

- [ ] Known issues to NOT aggravate: [list]
- [ ] Deprecated patterns to NOT follow: [list]
- [ ] Areas needing extra caution: [list]

### Integration Requirements

- [ ] Existing services to integrate: [list]
- [ ] Authentication/authorization patterns: [describe]
- [ ] Error handling conventions: [describe]
```

#### Commands to Update

| File                  | Section to Add                             |
| --------------------- | ------------------------------------------ |
| `1_gofer_research.md` | Add "Brownfield Analysis" to agent prompts |
| `2_gofer_specify.md`  | Add brownfield section generation          |

---

## Gap 10: Planning Mode Enforcement (MEDIUM PRIORITY)

### Problem

No explicit approval gate between plan and implement stages.

### Implementation Locations

#### Templates to Update

**`tasks-template.md`** - Add frontmatter:

```yaml
---
feature: [Feature Name]
status: draft | review | approved | implementing | complete
approvedBy: [user | auto]
approvedAt: [ISO timestamp]
---
```

#### Commands to Update

**`4_gofer_tasks.md`** - Add approval gate:

```markdown
## Approval Gate

Before proceeding to implementation:

### Artifact Review

- [ ] spec.md reviewed and approved
- [ ] plan.md reviewed and approved
- [ ] tasks.md reviewed and approved

### User Confirmation

Present to user:
```

Ready to implement [Feature Name]?

Artifacts to review:

- spec.md: [summary]
- plan.md: [summary]
- tasks.md: [N] tasks in [N] phases

Proceed to implementation? (yes/no)

````

### On Approval
Update tasks.md frontmatter:
```yaml
status: approved
approvedBy: user
approvedAt: [timestamp]
````

```

---

## Implementation Order

Based on priority and dependencies:

### Phase 1: High Priority (Implement First)
1. **Gap 3: Scope Control** - Add boundaries to templates and enforce in implement
2. **Gap 7: Feedback Loops** - Create verify-task.sh, add loop requirements
3. **Gap 6: Checkpoints** - Add checkpoint strategy to implement stage
4. **Gap 1: Context Management** - Create check-context-health.sh

### Phase 2: Medium Priority
5. **Gap 2: Session Handoff** - Create template and save-checkpoint.sh
6. **Gap 4: AI Slop Detection** - Add checklists to validate stage
7. **Gap 10: Approval Gates** - Add frontmatter and gates
8. **Gap 5: Memory Management** - Add memory update guidance

### Phase 3: Lower Priority
9. **Gap 8: Observability** - Add logging infrastructure
10. **Gap 9: Brownfield Guidance** - Add brownfield sections

---

## Files Summary

### New Files to Create
| File | Gap |
|------|-----|
| `.specify/scripts/bash/check-context-health.sh` | Gap 1 |
| `.specify/scripts/bash/verify-task.sh` | Gap 7 |
| `.specify/scripts/bash/save-checkpoint.sh` | Gap 2 |
| `.specify/templates/session-handoff-template.md` | Gap 2 |
| `.specify/memory/decisions/README.md` | Gap 5 |

### Existing Files to Modify
| File | Gaps Addressed |
|------|----------------|
| `.claude/commands/0_business_scenario.md` | 1, 5 |
| `.claude/commands/1_gofer_research.md` | 1, 9 |
| `.claude/commands/2_gofer_specify.md` | 1, 3, 9 |
| `.claude/commands/3_gofer_plan.md` | 1 |
| `.claude/commands/4_gofer_tasks.md` | 1, 3, 10 |
| `.claude/commands/5_gofer_implement.md` | 1, 2, 3, 6, 7 |
| `.claude/commands/6_gofer_validate.md` | 1, 4, 5, 8 |
| `.specify/templates/spec-template.md` | 3, 9 |
| `.specify/templates/tasks-template.md` | 3, 10 |
| `.specify/templates/checklist-template.md` | 4 |
| `.specify/scripts/bash/common.sh` | 8 |

---

## Next Steps

1. Create feature spec for "gap-improvements" using this roadmap
2. Generate tasks from this implementation guide
3. Implement in priority order (Phase 1 first)
4. Validate each gap improvement works as expected
5. Update CLAUDE.md with new best practices once validated
```
