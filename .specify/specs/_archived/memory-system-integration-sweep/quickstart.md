# Quickstart: Memory System Integration Sweep

## Prerequisites

- Node.js 20.x LTS
- VSCode with Gofer extension source
- `npm install` completed in root, extension/, and language-server/

## Setup

1. Ensure existing tests pass:

```bash
npm test
```

2. Verify Spec 012 wiring is in place:

```bash
grep -n "initializeContextHealthMonitoring" extension/src/extension.ts
grep -n "ContextHealthMonitor" extension/src/extension.ts
```

## Testing the Feature

### Manual Testing

1. **MCP Tool Registration** (Phase 1):
   - Open VSCode with Gofer extension
   - Use MCP client to call `gofer_get_context_health` — should return response
   - Call `gofer_expand_observation` with an invalid ID — should return error
     (not crash)

2. **Status Bar** (Phase 2):
   - Open a Gofer workspace
   - Check bottom status bar for context health indicator
   - Should show green/yellow/red (not empty)

3. **MCP Enrichment** (Phase 3):
   - Create a memory via Command Palette > "Gofer: Remember"
   - Call `gofer_execute_task` for a spec with tasks
   - Response should include `memories` field

4. **Claude Code Launch** (Phase 4):
   - Click Play button on a spec
   - Check `.specify/memory/enriched-context.json` exists
   - Verify timestamp is recent

5. **Research Index** (Phase 5):
   - Modify any `.specify/specs/*/research.md` file
   - Check `research.index.json` appears in the same directory

### Automated Tests

```bash
# Run all tests
npm test

# Run integration tests only
npm test -- tests/integration/memory-integration-sweep.test.ts

# Run new unit tests
npm test -- tests/unit/autonomous/WorkspaceContextProvider.test.ts
npm test -- tests/unit/autonomous/ContextBridgeWriter.test.ts
```

## Key Files

| File                                                   | Purpose                                      |
| ------------------------------------------------------ | -------------------------------------------- |
| `extension/src/autonomous/WorkspaceContextProvider.ts` | Token estimation for health monitor          |
| `extension/src/autonomous/ContextBridgeWriter.ts`      | Writes enriched context to bridge file       |
| `language-server/src/server.ts`                        | MCP tool registration (5 new tools)          |
| `language-server/src/mcp/toolHandler.ts`               | Reads bridge file for enriched responses     |
| `extension/src/extension.ts`                           | Provider wiring, research watcher, singleton |
| `extension/src/autonomousCommands.ts`                  | Context injection, observation hooks         |

## Common Issues

### Status bar shows no data

**Problem**: ContextHealthMonitor has no context provider **Solution**: Verify
WorkspaceContextProvider is wired in `initializeContextHealthMonitoring()`.
Check for errors in Output > Gofer.

### MCP tool returns error for new tools

**Problem**: Tool not registered in server.ts **Solution**: Verify tool
definition in onInitialize AND switch case in tools/call.

### enriched-context.json not created

**Problem**: ContextBridgeWriter not connected **Solution**: Check
`setSharedContextBuilder()` called in extension.ts. Check Output > Gofer for
errors during context build.
