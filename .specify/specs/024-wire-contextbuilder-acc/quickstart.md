# Quickstart: Wire ContextBuilder + ACC

## Prerequisites

- Node.js 18+
- VSCode Extension development environment
- `npm install` in `extension/` directory

## Setup

1. `cd extension && npm run compile` - Verify build passes
2. `npm test` - Verify all existing tests pass

## Testing the Feature

### Manual Testing

1. **Wiring verification**: Launch extension in debug mode. Open a workspace with `.specify/` directory. Check Output panel for "Shared ContextBuilder initialized" log message.
2. **Observation masking**: Start an autonomous session with 10+ tool invocations. Check that older observations show key-points or masked placeholders in context.
3. **ACC stages**: Monitor context utilization in status bar. As it increases past 70%, verify delegation advisory appears. Past 80%, verify observation masking accelerates.

### Automated Tests

```bash
cd extension && npm test -- --reporter=verbose
```

Key test files:
- `src/autonomous/__tests__/ACCOrchestrator.test.ts` - Stage transitions
- `src/autonomous/__tests__/ContextBuilder.test.ts` - Context building
- `src/autonomous/__tests__/ObservationMasker.test.ts` - Three-tier decay
- `src/autonomous/__tests__/acc-integration.test.ts` - End-to-end

## Key Files

| File | Purpose |
|------|---------|
| `extension/src/extension.ts` | Wiring point (initializeForWorkspace) |
| `extension/src/autonomous/ACCOrchestrator.ts` | New 5-stage orchestrator |
| `extension/src/autonomous/ContextBuilder.ts` | Context assembly (existing, now live) |
| `extension/src/autonomous/ObservationMasker.ts` | Three-tier decay (existing, now live) |
| `extension/src/autonomous/ContextHealthMonitor.ts` | Event system (extended with ACC events) |

## Common Issues

### Issue 1: "Shared ContextBuilder initialized" not appearing

**Problem**: ContextBuilder not created during initialization
**Solution**: Verify MemoryManager is created first. Check that workspace folder exists and is detected.

### Issue 2: Observation masking not working

**Problem**: ObservationMasker not receiving observations
**Solution**: Verify `sharedContextBuilder` is set in `autonomousCommands.ts` (check `getSharedContextBuilder()` returns non-null).

### Issue 3: ACC stages not firing

**Problem**: ContextHealthMonitor not emitting ACC events
**Solution**: Check `dataSource === 'real'` - events only fire for real session data, not filesystem estimates.
