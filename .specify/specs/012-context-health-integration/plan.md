---
spec: 012-context-health-integration
title: Context Health Integration Plan
status: draft
created: '2026-01-25'
phases: 5
---

# Implementation Plan: Context Health Integration

## Technical Context

### Current State

The context health components are fully implemented but not wired to the
extension:

| Component              | Lines | Status                              |
| ---------------------- | ----- | ----------------------------------- |
| ContextHealthMonitor   | 532   | Implemented, not instantiated       |
| AutoHandoffTrigger     | 626   | Implemented, not instantiated       |
| ContextHealthStatusBar | 633   | Implemented, not registered         |
| ContextUsageLogger     | 418   | Implemented, not activated          |
| MemoryManager          | 735   | Implemented, used in ContextBuilder |

The MCP tool `gofer_get_context_health` returns hardcoded values:

```typescript
const effectiveLimit = 120000;
const estimatedUsage = 50000; // Placeholder - will be calculated
```

### Component Interfaces

**ContextHealthMonitor:**

- Constructor: `new ContextHealthMonitor(config?: Partial<ContextHealthConfig>)`
- Events: `'healthy'`, `'warning'`, `'critical'`, `'handoff-recommended'`,
  `'status-change'`
- Methods: `startMonitoring()`, `stopMonitoring()`, `setContextProvider()`,
  `dispose()`

**ContextHealthStatusBar:**

- Constructor: `new ContextHealthStatusBar(context: vscode.ExtensionContext)`
- Methods: `connect(monitor)`, `show()`, `updateDisplay(status)`, `dispose()`

**AutoHandoffTrigger:**

- Constructor: `new AutoHandoffTrigger(config?: Partial<AutoHandoffConfig>)`
- Methods: `connect(monitor)`, `setUsageLogger(logger)`, `dispose()`

**ContextUsageLogger:**

- Constructor: `new ContextUsageLogger(workspaceRoot: string, config?)`
- Methods: `logHealthCheck()`, `logMaskingEvent()`, `logHandoff()`,
  `logSessionStart()`, `logSessionEnd()`

---

## Implementation Phases

### Phase 1: Extension Activation Wiring

**Goal:** Instantiate and connect all context health components on extension
activation.

**Files to Modify:**

- `extension/src/extension.ts`
- `extension/src/autonomous/index.ts`

**Changes:**

1. Add module-level variables (after line 33):

```typescript
let contextHealthMonitor: ContextHealthMonitor | undefined;
let contextUsageLogger: ContextUsageLogger | undefined;
let contextHealthStatusBar: ContextHealthStatusBar | undefined;
let autoHandoffTrigger: AutoHandoffTrigger | undefined;
```

2. Add imports:

```typescript
import { ContextHealthMonitor } from './autonomous/ContextHealthMonitor';
import { AutoHandoffTrigger } from './autonomous/AutoHandoffTrigger';
import { ContextHealthStatusBar } from './ui/ContextHealthStatusBar';
import { ContextUsageLogger } from './autonomous/ContextUsageLogger';
```

3. In `registerTreeViews()` (after line 116), create status bar:

```typescript
contextHealthStatusBar = new ContextHealthStatusBar(context);
```

4. In `initializeForWorkspace()` (around line 238), after workspace is
   confirmed:

```typescript
// Initialize context health monitoring
contextUsageLogger = new ContextUsageLogger(workspacePath);
contextHealthMonitor = new ContextHealthMonitor();
autoHandoffTrigger = new AutoHandoffTrigger();

// Wire components together
if (contextHealthStatusBar) {
  contextHealthStatusBar.connect(contextHealthMonitor);
  contextHealthStatusBar.show();
}
autoHandoffTrigger.connect(contextHealthMonitor);
autoHandoffTrigger.setUsageLogger(contextUsageLogger);

// Start monitoring (will use context provider when set)
contextHealthMonitor.startMonitoring();
```

5. In `deactivate()` (line 1094), add disposal:

```typescript
contextHealthMonitor?.dispose();
autoHandoffTrigger?.dispose();
contextHealthStatusBar?.dispose();
```

6. Update `extension/src/autonomous/index.ts` exports:

```typescript
export { ContextHealthMonitor } from './ContextHealthMonitor';
export type {
  ContextHealthStatus,
  ContextHealthConfig,
} from './ContextHealthMonitor';
export { AutoHandoffTrigger } from './AutoHandoffTrigger';
export { ContextUsageLogger } from './ContextUsageLogger';
```

**Acceptance:** US1 (Extension Activation), US2 (Status Bar Display), US3 (Auto
Handoff)

---

### Phase 2: JSONL Logging Activation

**Goal:** Start logging context health events to JSONL file.

**Files to Modify:**

- `extension/src/extension.ts`
- `extension/src/autonomous/ContextUsageLogger.ts`

**Changes:**

1. Connect logger to monitor events in `initializeForWorkspace()`:

```typescript
// Log health check events
contextHealthMonitor.on('healthy', (status) => {
  contextUsageLogger?.logHealthCheck({
    status,
    sessionId: currentSessionId,
    stage: currentStage,
  });
});
contextHealthMonitor.on('warning', (status) => {
  contextUsageLogger?.logHealthCheck({
    status,
    sessionId: currentSessionId,
    stage: currentStage,
  });
});
contextHealthMonitor.on('critical', (status) => {
  contextUsageLogger?.logHealthCheck({
    status,
    sessionId: currentSessionId,
    stage: currentStage,
  });
});
```

2. Log session start when autonomous commands begin:

```typescript
await contextUsageLogger?.logSessionStart(sessionId, stage);
```

3. Add memory event logging methods to `ContextUsageLogger.ts`:

```typescript
async logMemorySave(input: MemorySaveLogInput): Promise<void>
async logMemorySearch(input: MemorySearchLogInput): Promise<void>
async logMemoryLoad(input: MemoryLoadLogInput): Promise<void>
async logLoadingDecision(input: LoadingDecisionLogInput): Promise<void>
```

**New Types:**

```typescript
interface MemorySaveLogInput {
  sessionId: string;
  memoryId: string;
  category: string;
  scope: 'local' | 'global';
  tags?: string[];
}

interface MemorySearchLogInput {
  sessionId: string;
  query: string;
  resultCount: number;
  searchTimeMs: number;
}

interface MemoryLoadLogInput {
  sessionId: string;
  memoriesLoaded: number;
  coveragePercent: number;
}

interface LoadingDecisionLogInput {
  sessionId: string;
  source: 'memory' | 'research' | 'hints';
  decision: 'loaded' | 'skipped';
  reason: string;
  tokensUsed?: number;
}
```

**Acceptance:** US4 (JSONL Logging), US6 (Memory System Integration)

---

### Phase 3: MCP Tool Real Data

**Goal:** Replace placeholder values in `gofer_get_context_health` with real
data.

**Approach:** File-based state sharing between extension and language server.

**Files to Modify:**

- `language-server/src/mcp/toolHandler.ts`
- `extension/src/autonomous/ContextHealthMonitor.ts`

**New File:**

- `.specify/memory/context-health-state.json` (auto-generated)

**Changes:**

1. Add state persistence to `ContextHealthMonitor`:

```typescript
private stateFilePath: string;

private async persistState(status: ContextHealthStatus): Promise<void> {
  const state = {
    timestamp: Date.now(),
    status: status.status,
    utilizationPercent: status.utilizationPercent,
    tokensUsed: status.tokensUsed,
    tokensLimit: status.tokensLimit,
    breakdown: status.breakdown,
    recommendations: status.recommendations
  };
  const stateDir = path.dirname(this.stateFilePath);
  await fs.promises.mkdir(stateDir, { recursive: true });
  await fs.promises.writeFile(this.stateFilePath, JSON.stringify(state, null, 2));
}
```

2. Call `persistState()` on status changes:

```typescript
// In checkHealth() after analysis
await this.persistState(status);
```

3. Update `MCPToolHandler.getContextHealth()`:

```typescript
async getContextHealth(includeBreakdown: boolean = true): Promise<ContextHealthResponse> {
  // Try to read real state from extension
  const stateFile = path.join(this.workspaceRoot, '.specify/memory/context-health-state.json');
  try {
    const stateContent = await fs.promises.readFile(stateFile, 'utf-8');
    const state = JSON.parse(stateContent);

    // Check if state is fresh (within last 30 seconds)
    if (Date.now() - state.timestamp < 30000) {
      return {
        status: state.status,
        utilizationPercent: state.utilizationPercent,
        tokensUsed: state.tokensUsed,
        tokensLimit: state.tokensLimit,
        breakdown: includeBreakdown ? state.breakdown : undefined,
        recommendations: state.recommendations
      };
    }
  } catch (error) {
    // State file doesn't exist or is stale, fall back to file-based calculation
  }

  // Fallback: calculate from file sizes (similar to bash script)
  return this.calculateContextHealthFromFiles(includeBreakdown);
}
```

4. Add fallback calculation method:

```typescript
private async calculateContextHealthFromFiles(includeBreakdown: boolean): Promise<ContextHealthResponse> {
  // Similar logic to check-context-health.sh
  const breakdown = {
    specArtifacts: await this.estimateTokens(['spec.md', 'plan.md', 'tasks.md', 'research.md']),
    memories: await this.estimateTokens(['.specify/memory/**/*.md']),
    hints: await this.estimateTokens(['hints.md']),
    observations: 0, // Cannot calculate without runtime state
    systemFiles: await this.estimateTokens(['CLAUDE.md', 'AGENTS.md', 'constitution.md']),
    conversation: 0 // Cannot calculate without runtime state
  };

  const tokensUsed = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const tokensLimit = 120000;
  const utilizationPercent = (tokensUsed / tokensLimit) * 100;

  let status: 'healthy' | 'warning' | 'critical';
  if (utilizationPercent < 50) status = 'healthy';
  else if (utilizationPercent < 70) status = 'warning';
  else status = 'critical';

  return {
    status,
    utilizationPercent,
    tokensUsed,
    tokensLimit,
    breakdown: includeBreakdown ? breakdown : undefined,
    recommendations: this.getRecommendations(status)
  };
}
```

**Acceptance:** US5 (MCP Tool Integration)

---

### Phase 4: Memory Logging Integration

**Goal:** Log memory operations and loading decisions for effectiveness
analysis.

**Files to Modify:**

- `extension/src/autonomous/MemoryManager.ts`
- `extension/src/autonomous/ContextBuilder.ts`
- `extension/src/extension.ts`

**Changes:**

1. Add logger reference to `MemoryManager`:

```typescript
private usageLogger?: ContextUsageLogger;

setUsageLogger(logger: ContextUsageLogger): void {
  this.usageLogger = logger;
}
```

2. Log memory operations in `MemoryManager`:

```typescript
// In saveMemory()
await this.usageLogger?.logMemorySave({
  sessionId: this.currentSessionId,
  memoryId: memory.id,
  category: memory.category,
  scope: memory.scope,
  tags: memory.tags,
});

// In searchMemories()
await this.usageLogger?.logMemorySearch({
  sessionId: this.currentSessionId,
  query: searchQuery,
  resultCount: results.length,
  searchTimeMs: endTime - startTime,
});
```

3. Log loading decisions in `ContextBuilder`:

```typescript
// After memory loading
await this.usageLogger?.logLoadingDecision({
  sessionId,
  source: 'memory',
  decision: 'loaded',
  reason: `Loaded ${memories.length} memories with ${coveragePercent}% coverage`,
  tokensUsed: memoryTokens,
});

// When skipping research due to coverage
await this.usageLogger?.logLoadingDecision({
  sessionId,
  source: 'research',
  decision: 'skipped',
  reason: `Coverage ${coveragePercent}% exceeds threshold ${threshold}%`,
});
```

4. Wire logger to MemoryManager in `extension.ts`:

```typescript
if (memoryManager && contextUsageLogger) {
  memoryManager.setUsageLogger(contextUsageLogger);
}
```

**Acceptance:** US6 (Memory System Integration), US7 (Pipeline Memory Awareness)

---

### Phase 5: Testing and Verification

**Goal:** Verify integration works end-to-end.

**Test Scenarios:**

1. **Extension Activation Test:**
   - Activate extension with workspace
   - Verify status bar appears
   - Verify no errors in extension host logs

2. **Status Bar Update Test:**
   - Trigger context health change
   - Verify status bar color updates
   - Click status bar, verify dashboard opens

3. **JSONL Logging Test:**
   - Run autonomous command
   - Verify `.specify/logs/context-usage.jsonl` is created
   - Verify events are logged with correct format

4. **MCP Tool Test:**
   - Call `gofer_get_context_health` via MCP
   - Verify real values returned (not 50000 placeholder)
   - Verify breakdown matches file-based estimates

5. **Memory Logging Test:**
   - Save a memory via MemoryManager
   - Verify `memory_save` event logged
   - Search memories
   - Verify `memory_search` event logged with timing

6. **Handoff Notification Test:**
   - Simulate critical threshold (>70%)
   - Verify VSCode notification appears
   - Verify 5-minute cooldown works

**New Test Files:**

- `tests/integration/contextHealthIntegration.test.ts`
- `tests/integration/memoryLoggingIntegration.test.ts`

**Manual Verification:**

1. Open workspace with Gofer extension
2. Check status bar shows context health indicator
3. Run `/1_gofer_research` or similar
4. Verify status bar updates during execution
5. Check `.specify/logs/context-usage.jsonl` exists
6. Call MCP tool and verify real values

---

## Spec Traceability

| User Story                     | Phase      | Key Changes                          |
| ------------------------------ | ---------- | ------------------------------------ |
| US1: Extension Activation      | Phase 1    | extension.ts initialization          |
| US2: Status Bar Display        | Phase 1    | ContextHealthStatusBar wiring        |
| US3: Auto Handoff              | Phase 1    | AutoHandoffTrigger connection        |
| US4: JSONL Logging             | Phase 2    | Event logging to context-usage.jsonl |
| US5: MCP Tool Integration      | Phase 3    | Real data in getContextHealth()      |
| US6: Memory System Integration | Phase 2, 4 | Memory event logging                 |
| US7: Pipeline Memory Awareness | Phase 4    | Loading decision logging             |

---

## File Change Summary

| File                                                 | Phase   | Changes                                |
| ---------------------------------------------------- | ------- | -------------------------------------- |
| `extension/src/extension.ts`                         | 1, 2, 4 | Component initialization, event wiring |
| `extension/src/autonomous/index.ts`                  | 1       | Export new components                  |
| `extension/src/autonomous/ContextUsageLogger.ts`     | 2       | Add memory logging methods             |
| `extension/src/autonomous/ContextHealthMonitor.ts`   | 3       | Add state persistence                  |
| `extension/src/autonomous/MemoryManager.ts`          | 4       | Add logger integration                 |
| `extension/src/autonomous/ContextBuilder.ts`         | 4       | Log loading decisions                  |
| `language-server/src/mcp/toolHandler.ts`             | 3       | Read real state, add fallback          |
| `tests/integration/contextHealthIntegration.test.ts` | 5       | New integration tests                  |
| `tests/integration/memoryLoggingIntegration.test.ts` | 5       | New memory logging tests               |

---

## Risk Mitigations

| Risk                           | Mitigation                                   |
| ------------------------------ | -------------------------------------------- |
| Extension activation slowdown  | Async initialization, don't block activation |
| Log file growth                | Implement rotation (max 10MB) in logger      |
| State file race conditions     | Atomic writes with temp file + rename        |
| Monitor performance impact     | 5-second interval, not continuous            |
| LSP/extension process boundary | File-based state sharing (proven pattern)    |

---

## Success Metrics

| Metric               | Target                    | How to Verify             |
| -------------------- | ------------------------- | ------------------------- |
| Status bar visible   | 100% of activations       | Manual test on activation |
| JSONL logging active | Events within 5s          | Check log file timestamp  |
| MCP tool accuracy    | Within 10% of bash script | Compare outputs           |
| Memory events logged | All operations tracked    | Query log for event types |
| No regressions       | All 1333 tests pass       | npm test                  |

---

✓ Plan complete: `.specify/specs/012-context-health-integration/plan.md`

**Ready for**: `/4_gofer_tasks` to generate task breakdown
