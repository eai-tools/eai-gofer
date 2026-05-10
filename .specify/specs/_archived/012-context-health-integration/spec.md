---
feature: 012-context-health-integration
title: Wire Context Health Components to Extension and Pipeline
status: ready
created: '2026-01-25'
priority: high
effort: small
type: integration
---

# Spec: Context Health Integration

## Problem Statement

Spec 011 implemented comprehensive context health management components:

- ContextHealthMonitor (532 lines)
- AutoHandoffTrigger (626 lines)
- ContextHealthStatusBar (633 lines)
- ContextUsageLogger (418 lines)
- ObservationMasker (526 lines)

**However, none of these components are wired to the extension activation.**

The MCP tool `gofer_get_context_health` returns hardcoded placeholder values
instead of real metrics. The pipeline commands use a bash script instead of the
TypeScript monitor. No JSONL logging is occurring.

This spec addresses the integration gap to make these features operational.

---

## Goals

1. **Activate context health monitoring** when the extension starts
2. **Show real-time health status** in VSCode status bar
3. **Enable automatic handoff triggers** at critical thresholds
4. **Start JSONL logging** for effectiveness analysis
5. **Connect MCP tools** to real monitors (not placeholders)

## Non-Goals

- New feature development (components already exist)
- Changing thresholds or algorithms
- UI redesign

---

## Memory System Integration

The memory system (MemoryManager, memory-first loading) also needs integration
verification.

### Current State

| Component            | Implemented                  | Wired                            |
| -------------------- | ---------------------------- | -------------------------------- |
| MemoryManager        | ✓ 735 lines                  | Partial - used in ContextBuilder |
| Memory-first loading | ✓ In ContextBuilder          | Not exposed to pipeline          |
| Memory telemetry     | ✓ In telemetryIntegration.ts | Working via VSCode telemetry     |
| Memory JSONL logging | Specified in spec 010        | NOT implemented                  |

### Memory Integration Tasks

1. **Verify MemoryManager initialization** in extension activation
2. **Expose memory operations** via MCP tools (if not already)
3. **Add memory JSONL logging** alongside context health logging
4. **Connect memory loading decisions** to usage logger

---

## User Stories

### US1: Extension Activation

**As a** developer using Gofer **I want** context health monitoring to start
automatically **So that** I get proactive warnings about context degradation

**Acceptance Criteria**:

- [ ] ContextHealthMonitor is created on extension activation
- [ ] Monitor starts with default config (5s interval, 50%/70% thresholds)
- [ ] Monitor can be stopped on extension deactivation

### US2: Status Bar Display

**As a** developer using Gofer **I want** to see context health in the VSCode
status bar **So that** I can monitor utilization at a glance

**Acceptance Criteria**:

- [ ] ContextHealthStatusBar is registered on activation
- [ ] Status bar shows color-coded health (green/yellow/red)
- [ ] Clicking status bar shows detailed breakdown
- [ ] Status updates in real-time as context changes

### US3: Automatic Handoff Notification

**As a** developer using Gofer **I want** to be notified when context reaches
critical levels **So that** I can save progress before accuracy degrades

**Acceptance Criteria**:

- [ ] AutoHandoffTrigger connects to ContextHealthMonitor events
- [ ] VSCode notification shown at critical threshold (70%)
- [ ] Notification offers "Save Now" action
- [ ] 5-minute cooldown prevents notification spam

### US4: JSONL Logging

**As a** developer analyzing Gofer effectiveness **I want** context health
events logged to JSONL **So that** I can review and improve the system

**Acceptance Criteria**:

- [ ] ContextUsageLogger writes to `.specify/logs/context-usage.jsonl`
- [ ] Logs include: health_check, masking, stage_transition, handoff events
- [ ] Session start/end logged
- [ ] Log rotation or size limits prevent unbounded growth

### US5: MCP Tool Integration

**As an** AI assistant using Gofer tools **I want** `gofer_get_context_health`
to return real values **So that** I can make informed decisions about context
management

**Acceptance Criteria**:

- [ ] MCP tool returns actual token counts (not hardcoded 50000)
- [ ] MCP tool returns real breakdown by category
- [ ] MCP tool returns current recommendations

### US6: Memory System Integration

**As a** developer using Gofer **I want** memory operations logged and tracked
**So that** I can analyze memory-first loading effectiveness

**Acceptance Criteria**:

- [ ] MemoryManager is properly initialized on extension activation
- [ ] Memory loading decisions logged to JSONL (memories loaded, coverage %,
      research fallback)
- [ ] Memory operations tracked: save, search, load, forget
- [ ] Memory hit rate calculable from logs

### US7: Pipeline Memory Awareness

**As an** AI assistant running the Gofer pipeline **I want** the pipeline to use
memory-first loading **So that** context is optimized with verified memories
before research

**Acceptance Criteria**:

- [ ] Pipeline commands can access MemoryManager via MCP or context
- [ ] Memory coverage reported in context health breakdown
- [ ] Loading decisions visible in logs (skipped research due to coverage)

---

## Technical Approach

### Component Wiring

```
extension.ts (activation)
    │
    ├── Creates ContextHealthMonitor
    │       │
    │       ├── Emits: 'healthy', 'warning', 'critical', 'status-change'
    │       │
    │       └── Connected to:
    │               ├── AutoHandoffTrigger (listens for 'critical')
    │               ├── ContextUsageLogger (logs all events)
    │               └── ContextHealthStatusBar (updates display)
    │
    └── Registers ContextHealthStatusBar with VSCode
```

### Extension Activation Changes

**File**: `extension/src/extension.ts`

```typescript
// New imports
import { ContextHealthMonitor } from './autonomous/ContextHealthMonitor';
import { AutoHandoffTrigger } from './autonomous/AutoHandoffTrigger';
import { ContextHealthStatusBar } from './ui/ContextHealthStatusBar';
import { ContextUsageLogger } from './autonomous/ContextUsageLogger';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing activation code ...

  // Initialize context health monitoring
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    const healthMonitor = new ContextHealthMonitor(workspaceRoot);
    const usageLogger = new ContextUsageLogger(workspaceRoot);
    const statusBar = new ContextHealthStatusBar();
    const handoffTrigger = new AutoHandoffTrigger(healthMonitor, workspaceRoot);

    // Connect logger to monitor events
    healthMonitor.on('healthy', (status) => usageLogger.logHealthCheck(status));
    healthMonitor.on('warning', (status) => usageLogger.logHealthCheck(status));
    healthMonitor.on('critical', (status) =>
      usageLogger.logHealthCheck(status)
    );

    // Connect status bar to monitor
    healthMonitor.on('status-change', (from, to, status) => {
      statusBar.update(status);
    });

    // Start monitoring
    healthMonitor.startMonitoring();

    // Register for cleanup
    context.subscriptions.push(
      { dispose: () => healthMonitor.stopMonitoring() },
      statusBar
    );
  }
}
```

### MCP Tool Fix

**File**: `language-server/src/mcp/toolHandler.ts`

The `getContextHealth()` method currently returns placeholders. It needs to:

1. Read actual context from conversation (if available)
2. Or estimate from loaded files/artifacts
3. Return real breakdown values

**Option A**: Pass monitor instance from extension to language server via LSP
**Option B**: Estimate from file system (similar to bash script) **Option C**:
Store last known values in shared state file

Recommend **Option B** for simplicity - mirror the bash script logic in
TypeScript.

### Export Updates

**File**: `extension/src/autonomous/index.ts`

Add exports for new components:

```typescript
export { ContextHealthMonitor } from './ContextHealthMonitor';
export { AutoHandoffTrigger } from './AutoHandoffTrigger';
export { ContextUsageLogger } from './ContextUsageLogger';
export type {
  ContextHealthStatus,
  ContextHealthConfig,
} from './ContextHealthMonitor';
```

---

## Files to Modify

| File                                             | Changes                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `extension/src/extension.ts`                     | Add initialization code for monitors AND memory |
| `extension/src/autonomous/index.ts`              | Export new components                           |
| `language-server/src/mcp/toolHandler.ts`         | Replace placeholder with real implementation    |
| `language-server/src/server.ts`                  | Possibly pass workspace context                 |
| `extension/src/autonomous/ContextUsageLogger.ts` | Add memory event logging methods                |
| `extension/src/autonomous/ContextBuilder.ts`     | Emit loading decision events                    |

## Files to Verify (Already Implemented)

| File                                               | Status                         |
| -------------------------------------------------- | ------------------------------ |
| `extension/src/autonomous/ContextHealthMonitor.ts` | Ready                          |
| `extension/src/autonomous/AutoHandoffTrigger.ts`   | Ready                          |
| `extension/src/autonomous/ContextUsageLogger.ts`   | Ready (needs memory methods)   |
| `extension/src/ui/ContextHealthStatusBar.ts`       | Ready                          |
| `extension/src/autonomous/MemoryManager.ts`        | Ready                          |
| `extension/src/autonomous/ContextBuilder.ts`       | Ready (has memory-first logic) |

---

## Testing Strategy

### Unit Tests (Existing)

The components already have unit tests:

- `tests/unit/autonomous/ContextHealthMonitor.test.ts`
- `tests/unit/autonomous/AutoHandoffTrigger.test.ts`
- `tests/unit/autonomous/ContextUsageLogger.test.ts`
- `tests/unit/ui/ContextHealthStatusBar.test.ts`

### Integration Tests (New)

1. **Extension activation test**: Verify components initialize
2. **Event flow test**: Monitor → Logger → JSONL file
3. **Status bar test**: Updates reflect monitor state
4. **MCP tool test**: Returns real values after integration

### Manual Testing

1. Open workspace with Gofer extension
2. Verify status bar appears with health indicator
3. Load large files to increase context
4. Verify status bar color changes
5. Check `.specify/logs/context-usage.jsonl` is created
6. Call `gofer_get_context_health` MCP tool - verify real values

---

## Success Metrics

| Metric                   | Target                                   |
| ------------------------ | ---------------------------------------- |
| Status bar visible       | 100% of activations                      |
| JSONL logging active     | Events written within 5s of activation   |
| MCP tool accuracy        | Returns values within 10% of bash script |
| Memory events logged     | All save/search/load operations tracked  |
| Loading decisions logged | Coverage %, research fallback visible    |
| No regressions           | All 1333 existing tests pass             |

---

## Memory Logging Specification

### Event Types to Add

```typescript
// Add to ContextUsageLogger.ts
eventType:
  | 'health_check'
  | 'masking'
  | 'stage_transition'
  | 'handoff'
  | 'session_start'
  | 'session_end'
  | 'memory_save'      // NEW
  | 'memory_search'    // NEW
  | 'memory_load'      // NEW
  | 'loading_decision' // NEW
```

### Memory Event Schema

```typescript
interface MemoryLogEntry extends BaseLogEntry {
  eventType: 'memory_save' | 'memory_search' | 'memory_load';
  memoryId?: string;
  category?: string;
  scope?: 'local' | 'global';
  tags?: string[];
  resultCount?: number; // For search
  searchTime?: number; // ms
}

interface LoadingDecisionEntry extends BaseLogEntry {
  eventType: 'loading_decision';
  source: 'memory' | 'research' | 'hints';
  decision: 'loaded' | 'skipped';
  reason: string;
  memoriesLoaded?: number;
  coveragePercent?: number;
  researchFallback?: boolean;
  tokensUsed?: number;
}
```

### Example Log Output

```jsonl
{"timestamp":"2026-01-25T15:00:00Z","sessionId":"abc","eventType":"memory_load","memoriesLoaded":5,"coveragePercent":45}
{"timestamp":"2026-01-25T15:00:01Z","sessionId":"abc","eventType":"loading_decision","source":"research","decision":"skipped","reason":"Coverage 45% exceeds threshold 30%"}
{"timestamp":"2026-01-25T15:01:00Z","sessionId":"abc","eventType":"memory_save","memoryId":"mem-123","category":"decision","scope":"local"}
```

### Analysis Queries

With this logging, we can answer:

1. **Memory hit rate**:
   `loading_decision where source=research AND decision=skipped` / total
2. **Average coverage**: Mean of `coveragePercent` across sessions
3. **Memory growth**: Count of `memory_save` events over time
4. **Search performance**: Average `searchTime` for `memory_search` events

---

## Risks and Mitigations

| Risk                             | Mitigation                        |
| -------------------------------- | --------------------------------- |
| Performance impact of monitoring | Use 5s interval (not continuous)  |
| Log file growth                  | Implement rotation (max 10MB)     |
| Extension activation slowdown    | Async initialization, don't block |
| LSP/extension communication      | Use file-based state if needed    |

---

## Effort Estimate

| Task                                     | Effort       |
| ---------------------------------------- | ------------ |
| Wire extension.ts (context health)       | 2-3 hours    |
| Wire extension.ts (memory integration)   | 1-2 hours    |
| Fix MCP placeholder                      | 2-3 hours    |
| Add memory logging to ContextUsageLogger | 1-2 hours    |
| Connect ContextBuilder loading events    | 1 hour       |
| Update exports                           | 30 minutes   |
| Integration tests                        | 3-4 hours    |
| Manual testing                           | 1-2 hours    |
| **Total**                                | **2-3 days** |

---

## Dependencies

- Spec 011 (Context Health and Recursive Memory) - **COMPLETE**
- All component implementations exist and are tested

---

## Open Questions

None - this is straightforward integration work.

---

✓ Spec complete: `.specify/specs/012-context-health-integration/spec.md`

**Ready for**: `/3_gofer_plan` or direct implementation (scope is small enough)
