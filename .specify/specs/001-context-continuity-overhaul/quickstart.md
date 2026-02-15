# Quickstart: Context Continuity Overhaul

## Prerequisites

- Node.js 20.x LTS
- Vitest (installed via npm)
- Bash shell (macOS/Linux)

## Setup

1. Ensure the feature branch is checked out:

   ```bash
   git checkout 001-context-continuity-overhaul
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Testing the Feature

### Manual Testing

#### Test Session Memory Extraction

1. Start an implementation session with `/5_gofer_implement`
2. Complete 3 tasks
3. Check that entries exist:
   ```bash
   cat .specify/logs/session-memory.jsonl
   ```
4. Verify each entry has: timestamp, taskId, featureId, memoryType, content,
   sessionId

#### Test Failed Approach Logging

1. During implementation, encounter a failing approach
2. The agent should call `write-failed-approach.sh`
3. Check that entries exist:
   ```bash
   cat .specify/logs/failed-approaches.jsonl
   ```

#### Test Stage-Aware Resume

1. Run `/7_gofer_save` during implementation stage
2. Start a new session
3. Run `/8_gofer_resume`
4. Verify that tasks.md and plan.md are loaded but full research.md is not
5. Verify failed approaches are displayed as warnings

#### Test Context Health Estimation

1. Run the health check:
   ```bash
   .specify/scripts/bash/check-context-health.sh --json
   ```
2. Verify `dataSource` field is present
3. Verify utilization is reasonable (not 17,000%+)

### Automated Tests

```bash
# MemoryConsolidator conflict detection tests
npx vitest run tests/unit/autonomous/MemoryConsolidator.test.ts

# ObservationMasker manifest tests
npx vitest run tests/unit/autonomous/ObservationMasker.test.ts

# CheckpointValidator tests
npx vitest run tests/unit/autonomous/CheckpointValidator.test.ts

# All tests
npm test
```

## Key Files

| File                                              | Purpose                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `.specify/scripts/bash/write-session-memory.sh`   | Prompt → JSONL bridge for session memories            |
| `.specify/scripts/bash/write-failed-approach.sh`  | Prompt → JSONL bridge for failed approaches           |
| `.specify/scripts/bash/read-session-memories.sh`  | JSONL → prompt reader for resume                      |
| `.specify/scripts/bash/read-failed-approaches.sh` | JSONL → prompt reader for resume                      |
| `.claude/commands/5_gofer_implement.md`           | Modified: memory extraction + failed approach logging |
| `.claude/commands/8_gofer_resume.md`              | Modified: stage-aware loading                         |
| `extension/src/autonomous/MemoryConsolidator.ts`  | Extended: conflict detection                          |
| `extension/src/autonomous/ObservationMasker.ts`   | Extended: manifest persistence                        |

## Common Issues

### Issue 1: Bash scripts not executable

**Problem**: Permission denied when running bash scripts **Solution**:
`chmod +x .specify/scripts/bash/write-*.sh .specify/scripts/bash/read-*.sh`

### Issue 2: Session memory not appearing

**Problem**: No entries in session-memory.jsonl after task completion
**Solution**: Check that the agent is calling the bash script after marking
`- [X]` in tasks.md. The script creates the logs directory lazily.

### Issue 3: Context health still showing high percentage

**Problem**: check-context-health.sh still reports very high utilization
**Solution**: Ensure `context-health-state.json` exists and is fresh. If it's
stale (>5 min), the script falls back to filesystem estimation which should now
exclude source files.
