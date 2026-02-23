# Quickstart: Engineer Review Gate

## Prerequisites

- Gofer pipeline set up in workspace (`.claude/agents/` and `.claude/commands/`
  directories exist)
- A feature with completed spec.md, plan.md, and tasks.md artifacts

## Testing the Feature

### Manual Testing

1. Create a feature with deliberately misaligned artifacts:
   - spec.md with 3 acceptance criteria
   - tasks.md covering only 2 of the 3 criteria
2. Run `/4_gofer_tasks` on the feature directory
3. Verify the engineer-review agent detects the missing task for the 3rd
   criterion (Red finding)
4. Verify the correction loop adds the missing task and re-runs the agent
5. Verify the agent passes on the second iteration

### Testing Edge Cases

1. **Missing plan.md**: Run with only spec.md and tasks.md — agent should skip
   plan alignment checks gracefully
2. **Empty tasks.md**: Run with no tasks — agent should report Red finding "No
   tasks found"
3. **Perfect alignment**: Run with fully aligned artifacts — agent should pass
   with no Red findings on first iteration
4. **3-iteration cap**: Create artifacts with complex misalignments — verify
   escalation after 3 failed iterations

## Key Files

| File                                                   | Purpose                                   |
| ------------------------------------------------------ | ----------------------------------------- |
| `.claude/agents/engineer-review.md`                    | Agent definition (read-only analysis)     |
| `.claude/commands/4_gofer_tasks.md`                    | Command that invokes the agent (Step 4.6) |
| `extension/resources/claude-agents/engineer-review.md` | Bundled copy for VSIX distribution        |

## Common Issues

### Agent Not Found

**Problem**: `subagent_type="engineer-review"` fails **Solution**: Ensure
`.claude/agents/engineer-review.md` exists in the workspace. Run Gofer sync from
Command Palette to copy bundled agents.

### Correction Loop Doesn't Converge

**Problem**: Agent keeps finding Red issues after 3 iterations **Solution**:
Review the escalation report at `{FEATURE_DIR}/engineer-review-escalation.md`.
The root cause is usually a fundamental mismatch between spec scope and task
scope that requires human judgment.
