---
spec: 012-context-health-integration
title: Context Health Integration Quick Start
---

# Quick Start: Context Health Integration

## What This Feature Does

Wires the existing context health monitoring components into the extension so
they actually work:

- **Status Bar**: Shows real-time context utilization (green/yellow/red)
- **Auto Handoff**: Notifies you when context is critical (>70%)
- **JSONL Logging**: Records events for analysis
- **MCP Tool**: Returns real values instead of placeholders
- **Memory Logging**: Tracks memory operations for effectiveness analysis

## Key Integration Points

### 1. Extension Activation (`extension.ts`)

```typescript
// Components are instantiated on activation
contextHealthMonitor = new ContextHealthMonitor();
contextUsageLogger = new ContextUsageLogger(workspacePath);
contextHealthStatusBar = new ContextHealthStatusBar(context);
autoHandoffTrigger = new AutoHandoffTrigger();

// Wired together
contextHealthStatusBar.connect(contextHealthMonitor);
autoHandoffTrigger.connect(contextHealthMonitor);
autoHandoffTrigger.setUsageLogger(contextUsageLogger);
```

### 2. MCP Tool (`toolHandler.ts`)

```typescript
// Reads real state from extension
const stateFile = '.specify/memory/context-health-state.json';
const state = JSON.parse(await fs.readFile(stateFile));
return {
  status: state.status,
  utilizationPercent: state.utilizationPercent,
  tokensUsed: state.tokensUsed,
  breakdown: state.breakdown,
};
```

### 3. Memory Logging

```typescript
// Operations logged to context-usage.jsonl
await logger.logMemorySave({ memoryId, category, scope });
await logger.logMemorySearch({ query, resultCount, searchTimeMs });
await logger.logLoadingDecision({
  source: 'memory',
  decision: 'loaded',
  coveragePercent,
});
```

## Testing After Implementation

1. **Activate Extension** → Status bar should appear
2. **Run Autonomous Command** → Check `.specify/logs/context-usage.jsonl`
3. **Call MCP Tool** → Verify real values (not 50000 placeholder)
4. **Simulate High Usage** → Notification should appear at 70%

## File Locations

| File                                        | Purpose             |
| ------------------------------------------- | ------------------- |
| `.specify/logs/context-usage.jsonl`         | Event log           |
| `.specify/memory/context-health-state.json` | State for MCP tool  |
| `.specify/memory/context-profiles.yaml`     | Stage budget config |
