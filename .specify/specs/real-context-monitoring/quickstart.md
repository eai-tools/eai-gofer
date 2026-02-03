# Quickstart: Real Context Window Monitoring

## Prerequisites

- VS Code with Gofer extension installed
- Claude Code CLI installed (`~/.claude/` directory exists)
- A workspace with `.specify/` directory (Gofer-initialized project)

## Setup

1. Open a Gofer project in VS Code
2. Start a Claude Code session in that project
3. The status bar should show "Context: N% (Model)" with real data

## Testing the Feature

### Manual Testing

1. Open the Gofer project in VS Code
2. Check the status bar — should show "Context: No session" if no Claude Code
   running
3. Open a Claude Code terminal in the same workspace
4. Send a few messages to Claude Code
5. Check the status bar — should update to "Context: N% (Opus)" within 15
   seconds
6. Click the status bar to see detailed breakdown (model, session age, token
   counts)
7. Close Claude Code terminal
8. Status bar should transition to "No session" within 30 seconds

### Automated Tests

```bash
# Unit tests for session reader
npm test -- tests/unit/autonomous/ClaudeSessionReader.test.ts

# Unit tests for memory writer
npm test -- tests/unit/autonomous/ContinuousMemoryWriter.test.ts

# Updated provider tests
npm test -- tests/unit/autonomous/WorkspaceContextProvider.test.ts

# Integration test
npm test -- tests/integration/real-context-monitoring.test.ts

# Full suite
npm test
```

## Key Files

| File                                                   | Purpose                                 |
| ------------------------------------------------------ | --------------------------------------- |
| `extension/src/autonomous/ClaudeSessionReader.ts`      | Reads Claude Code JSONL session logs    |
| `extension/src/autonomous/ContinuousMemoryWriter.ts`   | Auto-persists pipeline events to memory |
| `extension/src/autonomous/WorkspaceContextProvider.ts` | Provides real or estimated context data |
| `extension/src/ui/ContextHealthStatusBar.ts`           | Displays context health in status bar   |
| `extension/src/extension.ts`                           | Wires all components together           |

## Common Issues

### Status bar shows "No session"

**Problem**: Claude Code is running but status bar doesn't show real data.
**Solution**: Check that `~/.claude/projects/` contains a directory matching
your workspace path (encoded with dashes). The session JSONL file must have at
least one assistant message with usage data.

### Status bar shows stale data

**Problem**: Token count doesn't update after Claude Code activity.
**Solution**: Polling runs every 10 seconds. Wait 15 seconds and check again. If
still stale, the JSONL file may not be updating — verify Claude Code is actively
processing.
