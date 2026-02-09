# Quickstart: Observation Content Capture

## Prerequisites

- Node.js 20.x LTS
- VS Code with Gofer extension installed
- Claude Code CLI (version with PostToolUse `tool_input`/`tool_response` support)

## Setup

1. Install dependencies: `npm install`
2. Compile extension: `cd extension && npm run compile`

## Testing the Feature

### Manual Testing

1. Open a workspace with Gofer initialized (`.specify/` directory exists)
2. Start a Claude Code session (Play button or `claude` CLI)
3. Have Claude read a file (e.g., `Read extension/src/config.ts`)
4. Check `.specify/hooks/observations/` — should see a `{uuid}.json` file
   briefly (deleted after extension reads it)
5. Check the Gofer debug output in VS Code Output panel for:
   `[Gofer] Tool output observation tracking wired to bridge watcher`
6. Verify observation masking statistics show real token savings (click
   Context Health status bar item)

### Verifying Backward Compatibility

1. Temporarily edit `.claude/settings.json` to point PostToolUse hook at
   an older version of `post-tool-use.mjs` (without observation extraction)
2. Run a tool call — verify bridge is written normally, no errors
3. Restore the updated hook script

### Automated Tests

```bash
# Run all tests
npm test

# Run specific observation tests
npm test -- tests/unit/hooks/post-tool-use-observation.test.ts
npm test -- tests/unit/autonomous/observation-tracking.test.ts
npm test -- tests/unit/autonomous/HookBridgeWatcher.test.ts
```

## Key Files

| File | Purpose |
|------|---------|
| `extension/resources/hook-scripts/post-tool-use.mjs` | Hook script (bundled source) |
| `.specify/scripts/hooks/post-tool-use.mjs` | Hook script (active copy) |
| `extension/src/autonomous/HookBridgeWatcher.ts` | Bridge watcher + BridgeData interface |
| `extension/src/extension.ts:1396-1439` | Bridge-update handler |
| `extension/src/autonomous/ObservationMasker.ts` | Observation compression (unchanged) |

## Common Issues

### No observation files appearing

**Problem**: After a tool call, no files in `.specify/hooks/observations/`
**Solution**: Check if your Claude Code version includes `tool_input`/`tool_response`
in the PostToolUse hook payload. Check `.specify/hooks/hook-debug.log` for
diagnostic output.

### Observation files accumulating

**Problem**: Files in `.specify/hooks/observations/` are not being cleaned up
**Solution**: Verify the VS Code extension is running and the HookBridgeWatcher
is active. Files older than 30 minutes are cleaned on session start.

### Key-points extraction returns empty

**Problem**: `generateKeyPoints()` returns empty results even with real content
**Solution**: Check that the observation type mapping matches the content. A
file_read observation should contain TypeScript/code content, not JSON metadata.
