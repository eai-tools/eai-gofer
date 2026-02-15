---
description:
  Resume work from saved session checkpoint with full context restoration
---

# Gofer Resume

You are resuming previously saved work by restoring full context and continuing
implementation. This is an **auxiliary command** that restores state from
`/7_gofer_save`.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

---

## When to Use This Command

- Returning to a previously paused feature
- Starting a new session on existing work
- Switching back to a saved task
- Recovering from an interrupted session
- After context window compaction

---

## Step 1: Discover Saved State

### 1.1 Check for Session Checkpoints

```bash
# Find all session checkpoints
find .specify/specs -name "session-checkpoint.md" -type f 2>/dev/null

# List features with their status
for dir in .specify/specs/*/; do
  if [ -f "$dir/session-checkpoint.md" ]; then
    echo "PAUSED: $dir"
  elif [ -f "$dir/tasks.md" ]; then
    echo "IN_PROGRESS: $dir"
  fi
done
```

### 1.2 Present Options to User

If multiple sessions found:

```markdown
## Saved Sessions Found

| Feature     | Stage       | Last Saved       | Tasks Done |
| ----------- | ----------- | ---------------- | ---------- |
| [feature-1] | 5_implement | 2026-01-13 14:30 | 12/25      |
| [feature-2] | 3_plan      | 2026-01-12 09:15 | 0/0        |

Which feature would you like to resume?
```

Use AskUserQuestion tool if needed.

### 1.3 If No Checkpoint Found

Check for features with uncompleted tasks:

```bash
# Find tasks.md files with unchecked items
grep -l "\- \[ \]" .specify/specs/*/tasks.md 2>/dev/null
```

If found, offer to resume from tasks.md directly.

---

## Step 2: Detect Current Stage

### 2.1 Stage Detection

Determine the current pipeline stage using these rules (in priority order):

1. **From session checkpoint**: If `session-checkpoint.md` exists, read the
   `stage` field from YAML frontmatter.
2. **From artifact presence**: Infer stage from which artifacts exist:
   - `tasks.md` with unchecked items → `implement`
   - `tasks.md` fully checked → `validate`
   - `plan.md` exists, no `tasks.md` → `plan` (needs `/4_gofer_tasks`)
   - `spec.md` exists, no `plan.md` → `specify` (needs `/3_gofer_plan`)
   - `research.md` exists, no `spec.md` → `research` (needs `/2_gofer_specify`)
   - Nothing → `research` (needs `/1_gofer_research`)
3. **From periodic checkpoint**: If no `session-checkpoint.md` exists, check for
   the most recent `periodic-*.json` in `.specify/memory/checkpoints/` and use
   its `tasksCompleted` list to determine resume point.

### 2.2 Stage Loading Matrix

Load artifacts based on the detected stage. This prevents loading unnecessary
context that wastes the context window:

| Stage     | Full Load              | Summary Only         | Skip              |
| --------- | ---------------------- | -------------------- | ----------------- |
| research  | CLAUDE.md              | -                    | spec, plan, tasks |
| specify   | research.md, CLAUDE.md | -                    | plan, tasks       |
| plan      | spec.md, research.md   | -                    | tasks             |
| tasks     | plan.md, spec.md       | research.md          | -                 |
| implement | tasks.md, plan.md      | spec.md, research.md | -                 |
| validate  | tasks.md, spec.md      | plan.md              | research.md       |

**Full Load**: Read the entire file into context. **Summary Only**: Mention the
file exists and note key sections, but do NOT read the full content. Only read
specific sections if needed during work. **Skip**: Do not load at all.

## Step 3: Load Session Context

Once feature and stage are identified, load context per the Stage Loading
Matrix:

### 3.1 Session Checkpoint (Primary)

```bash
Read: {FEATURE_DIR}/session-checkpoint.md
```

Extract from YAML frontmatter:

- `stage`: Which pipeline stage was active
- `last_commit`: Where code was at save time
- `context_usage`: How much context was used

### 3.2 Load Session Memories

Load learnings from previous sessions for this feature:

```bash
.specify/scripts/bash/read-session-memories.sh \
  --feature-id "[FEATURE_DIR_NAME]" \
  --limit 20
```

Display the output to restore institutional knowledge from prior sessions.

### 3.3 Load Failed Approaches

Load failed approaches from the last 3 sessions to avoid repeating mistakes:

```bash
.specify/scripts/bash/read-failed-approaches.sh \
  --feature-id "[FEATURE_DIR_NAME]" \
  --sessions 3
```

Display the output as **"Approaches Already Tried"** warnings before resuming
work. These approaches should NOT be retried without a fundamentally different
strategy.

### 3.4 Periodic Checkpoint Fallback

If no `session-checkpoint.md` exists, check for the most recent periodic
checkpoint:

```bash
ls -t .specify/memory/checkpoints/periodic-*.json 2>/dev/null | head -1
```

If found, read the checkpoint JSON and use its `tasksCompleted` array to
determine which tasks are already done. Cross-reference with `tasks.md` to find
the next incomplete task.

### 3.5 Feature Artifacts (Per Stage Loading Matrix)

Load artifacts according to the matrix in Step 2.2:

```bash
# Full Load artifacts for the detected stage
Read: {FEATURE_DIR}/[full-load artifacts per matrix]

# Summary Only artifacts — mention but do not fully read
# "spec.md exists (12 user stories, 11 FRs) — will load sections as needed"
```

### 3.6 Git State

```bash
# Verify we're on the right branch
git branch --show-current

# Check for changes since checkpoint
git log --oneline [last_commit]..HEAD

# Check for uncommitted changes
git status
```

---

## Step 4: Validate Resumption State

### 3.1 Check Code State

```bash
# Verify build still works
npm run build 2>&1 | tail -20

# Check if tests pass
npm test 2>&1 | tail -20
```

### 3.2 Check for Conflicts

If codebase changed since checkpoint:

1. **Review changes** to files we were modifying
2. **Check for conflicts** with our work
3. **Update plan** if architecture evolved
4. **Warn user** of any impacts

```markdown
## Changes Since Last Session

- **New commits**: [list commits since checkpoint]
- **Modified files**: [files that affect our work]
- **Potential conflicts**: [any issues detected]
```

### 3.3 Restore Working State

```bash
# Apply any stashed changes (if mentioned in checkpoint)
git stash list
git stash pop stash@{n}  # if applicable
```

---

## Step 5: Rebuild Mental Model

Create a context summary for the conversation:

```markdown
## Resuming: [Feature Name]

### Where We Left Off

- **Stage**: [Pipeline stage from checkpoint]
- **Current Task**: [Task ID] - [Description]
- **File**: `path/to/file.ts:line`
- **What was happening**: [From checkpoint notes]

### Key Context

From checkpoint:

- [Key decision 1]
- [Key decision 2]
- [Gotcha to remember]

### Protected Files (Do Not Modify)

- [List from checkpoint]

### Immediate Next Steps

1. [Continue task X at line Y]
2. [Then task Z]
3. [Phase completion verification]
```

---

## Step 6: Restore Todo List

Load the task state into TodoWrite:

```
Based on tasks.md and checkpoint:
- Mark completed tasks
- Set current task as in_progress
- Queue remaining tasks as pending
```

---

## Step 7: Signal Ready to Continue

```markdown
================================================================ CONTEXT
RESTORED: [Feature Name]
================================================================

Resuming from: [checkpoint timestamp] Branch: [branch name] Stage: [pipeline
stage]

Progress:

- Tasks completed: [X]/[Total]
- Current phase: [Phase name]
- Current task: [Task ID] - [Description]

Files to focus on:

- [Current file from checkpoint]
- [Next file in task list]

Code Status:

- Build: [passing/failing]
- Tests: [passing/failing/skipped]
- Changes since save: [N commits]

Ready to continue with: /5_gofer_implement

Or I can pick up exactly where we left off...

================================================================
```

---

## Step 8: Continue Implementation

Based on checkpoint state, either:

### Option A: Auto-Continue

If user says "continue" or similar:

1. Load the current task details
2. Open the file at the saved location
3. Continue implementing from that point
4. Follow normal `/5_gofer_implement` flow

### Option B: Manual Navigation

If user wants to review first:

1. Show task list with current position
2. Let user choose where to start
3. Proceed with their selection

---

## Resume Patterns

### Pattern 1: Quick Resume (Same Day)

```
/8_gofer_resume

> Continue the user management feature from this morning

# Claude:
1. Finds most recent checkpoint
2. Loads task context
3. Continues from exact stopping point
```

### Pattern 2: Full Context Restore (Days Later)

```
/8_gofer_resume .specify/specs/auth-feature/

# Claude:
1. Reads full checkpoint
2. Reviews git history since then
3. Checks for conflicts
4. Rebuilds complete context
5. Presents summary before continuing
```

### Pattern 3: Recovery Mode (No Checkpoint)

```
/8_gofer_resume

# Claude:
1. No checkpoint found
2. Finds features with incomplete tasks
3. Presents options to user
4. Resumes from tasks.md state
```

---

## Error Handling

### Checkpoint Not Found

```markdown
No session checkpoint found.

I found these features with incomplete tasks:

- `.specify/specs/feature-a/` - 5/20 tasks done
- `.specify/specs/feature-b/` - 15/30 tasks done

Which would you like to continue?
```

### Git State Mismatch

```markdown
Warning: Code has changed since checkpoint.

- Checkpoint commit: [hash]
- Current HEAD: [hash]
- Changes: [N commits]

Files we were working on have been modified:

- `src/service.ts` - [changed by commit X]

Options:

1. Review changes and continue
2. Reset to checkpoint state
3. Start fresh with current code
```

### Build Broken

```markdown
Warning: Build is currently failing.

Error:
```

[build error output]

```

This may have been caused by:
1. Changes since checkpoint
2. Missing dependencies
3. Incomplete work at save time

Would you like me to:
1. Try to fix the build issues first
2. Continue anyway and fix as we go
3. Roll back to last working state
```

---

## Observability Logging

```bash
.specify/scripts/bash/log-stage.sh 8_resume --complete --tokens [N] --compactions [N]
```

---

## Integration

This command works with:

- `/7_gofer_save` - Paired save command
- `/5_gofer_implement` - Continues implementation
- `/0_business_scenario` - Can route to resume
- All other Gofer commands - Can be invoked after resume

---

## Best Practices

### Before Resuming

- Always check git state first
- Verify build/tests pass
- Review any changes since checkpoint

### After Resuming

- Verify context is complete
- Run a quick validation
- Update checkpoint if state changed

### For Long-Running Features

- Save checkpoints frequently
- Include mental model notes
- Document non-obvious decisions
