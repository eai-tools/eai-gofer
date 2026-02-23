# Quickstart: Multi-Session Context Panel

## Prerequisites

- Node.js 20.x LTS
- VSCode with Gofer extension source code
- `npm install` completed at repo root

## Setup

1. Install dependencies: `npm install`
2. Compile extension: `cd extension && npm run compile`

## Testing the Feature

### Manual Testing

1. Open the Gofer workspace in VSCode
2. Open the Gofer sidebar (click Gofer icon in activity bar)
3. Verify 3 sections: Specifications, Context Window, Memory

**Context Window (no sessions)**: 4. Context Window shows "No active Claude Code
sessions" welcome message

**Context Window (1 session)**: 5. Open a terminal, run `claude` 6. Interact
with Claude Code (any tool use triggers a hook) 7. Context Window shows 1
session node with utilization % 8. Expand session to see 6 category nodes

**Context Window (multiple sessions)**: 9. Open 2 more terminals, run `claude`
in each 10. Interact with each session 11. Verify Context Window shows up to 3
sessions 12. Verify status bar shows `[N/3]` suffix

**4th terminal**: 13. Open a 4th terminal with `claude` 14. Verify notification
appears about session limit 15. Verify oldest inactive session is evicted

**Memory tree**: 16. Expand Memory section 17. Verify Constitution node at
top 18. Verify category groupings (Discovery, Patterns, etc.) 19. Click a memory
entry to view detail

### Automated Tests

```bash
# Run all unit tests
npm test

# Run specific test files
npx vitest tests/unit/autonomous/MultiSessionBridgeWatcher.test.ts
npx vitest tests/unit/contextWindowProvider.test.ts
npx vitest tests/unit/memoryProvider.test.ts

# Run integration tests
npx vitest tests/integration/multi-session-context.test.ts

# Run linting
npm run lint
```

## Key Files

| File                                                    | Purpose                           |
| ------------------------------------------------------- | --------------------------------- |
| `extension/src/autonomous/MultiSessionBridgeWatcher.ts` | Multi-session bridge file watcher |
| `extension/src/contextWindowProvider.ts`                | Context Window tree view          |
| `extension/src/memoryProvider.ts`                       | Categorized memory tree view      |
| `extension/src/extension.ts`                            | Component wiring                  |
| `extension/package.json`                                | View registration                 |
| `.specify/scripts/hooks/post-tool-use.mjs`              | Per-session bridge file hook      |

## Common Issues

### Issue 1: Context Window shows no sessions

**Problem**: No session nodes appear even though Claude Code is running.
**Solution**: Check that hook scripts are installed. Run `gofer.initialize` from
Command Palette, which triggers hook reinstallation via goferMigrator.

### Issue 2: Memory tree is empty

**Problem**: Memory section shows "No memories found". **Solution**: Memories
are stored in `.specify/memory/memories.jsonl`. If the file doesn't exist, no
memories have been created yet. Run a Gofer pipeline stage to generate memories.

### Issue 3: Status bar doesn't show [N/3]

**Problem**: Status bar shows old format without session count. **Solution**:
Ensure MultiSessionBridgeWatcher is properly wired in extension.ts. Check
console for initialization errors.
