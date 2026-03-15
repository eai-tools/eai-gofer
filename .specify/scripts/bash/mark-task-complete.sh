#!/bin/bash
# Mark a task as complete in tasks.md
#
# Usage: mark-task-complete.sh <feature-dir> <task-id>
# Example: mark-task-complete.sh .specify/specs/025-ai-usage-tracking T001

set -euo pipefail

FEATURE_DIR="${1:-.}"
TASK_ID="${2:-}"

if [[ -z "$TASK_ID" ]]; then
  echo "ERROR: Task ID required"
  echo "Usage: $0 <feature-dir> <task-id>"
  echo "Example: $0 .specify/specs/025-ai-usage-tracking T001"
  exit 1
fi

TASKS_FILE="$FEATURE_DIR/tasks.md"

if [[ ! -f "$TASKS_FILE" ]]; then
  echo "ERROR: tasks.md not found at $TASKS_FILE"
  exit 1
fi

# Check if task exists
if ! grep -q "^- \[ \] $TASK_ID " "$TASKS_FILE"; then
  if grep -q "^- \[X\] $TASK_ID " "$TASKS_FILE"; then
    echo "✓ Task $TASK_ID already marked complete"
    exit 0
  else
    echo "ERROR: Task $TASK_ID not found in $TASKS_FILE"
    exit 1
  fi
fi

# Mark task complete
sed -i.backup "s/^- \[ \] $TASK_ID /- [X] $TASK_ID /" "$TASKS_FILE"
rm -f "$TASKS_FILE.backup"

# Update task count in frontmatter if present
COMPLETED=$(grep -c "^- \[X\]" "$TASKS_FILE" || echo "0")
INCOMPLETE=$(grep -c "^- \[ \]" "$TASKS_FILE" || echo "0")
TOTAL=$((COMPLETED + INCOMPLETE))

if grep -q "^tasksCompleted:" "$TASKS_FILE"; then
  sed -i.backup "s/^tasksCompleted:.*/tasksCompleted: $COMPLETED\/$TOTAL ($((COMPLETED * 100 / TOTAL))%)/" "$TASKS_FILE"
  rm -f "$TASKS_FILE.backup"
fi

echo "✓ Marked $TASK_ID as complete ($COMPLETED/$TOTAL tasks done)"
