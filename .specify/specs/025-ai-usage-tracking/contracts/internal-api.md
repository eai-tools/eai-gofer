# Internal API Contract: AI Token Usage Tracking Panel

## Overview

This document defines the internal APIs between components:
- **AIUsageMonitor** (service) ↔ **AIUsageProvider** (UI)
- **AIUsageMonitor** (service) ↔ **AIUsageStatusBar** (UI)
- **AIUsageMonitor** (service) ↔ Data sources (UsageLogger, CostBudgetEnforcer, etc.)

All APIs are TypeScript interfaces - no REST or RPC protocols involved.

## AIUsageMonitor Events API

### Event: 'usage-update'

**Description**: Emitted when AI usage data changes (new LLM call, session change, polling refresh)

**Event Payload**:
```typescript
interface UsageUpdateEvent {
  timestamp: number;          // Unix timestamp (ms) when event was emitted
  trigger: 'file-watch' | 'polling' | 'session-change' | 'manual';
  data: {
    current: AIUsageData;     // Current session usage
    today: AIUsageData;       // Today's total usage
    week: AIUsageData;        // This week's total usage
  };
}
```

**Contract**:
- Emitted within 1 second of usage change (file watch: <500ms, polling: ≤5s, manual: immediate)
- All three time periods (`current`, `today`, `week`) are always included
- `timestamp` is monotonically increasing (newer events have higher timestamps)
- If no usage data exists for a period, `totalCostUsd` and `totalTokens` are 0, `providers` is empty array
- `trigger` values:
  - 'file-watch': Emitted when council-usage.jsonl changes (FileSystemWatcher)
  - 'polling': Emitted by 5s polling timer (fallback)
  - 'session-change': Emitted when active session changes (MultiSessionBridgeWatcher)
  - 'manual': Emitted by user-triggered forceRefresh() (e.g., refresh button)

**Example**:
```typescript
monitor.on('usage-update', (event: UsageUpdateEvent) => {
  console.log(`Usage updated at ${new Date(event.timestamp)} via ${event.trigger}`);
  console.log(`Current session: $${event.data.current.totalCostUsd}`);
  console.log(`Today: $${event.data.today.totalCostUsd}`);
});
```

**Error Handling**:
- If UsageLogger.getUsageSummary() throws, event is still emitted with zero data
- If file watch fails, polling fallback continues to emit events every 5s

---

## AIUsageMonitor Public Methods

### Method: `startMonitoring()`

**Description**: Start watching for usage changes (file watcher + polling)

**Signature**:
```typescript
startMonitoring(): void
```

**Behavior**:
- Creates FileSystemWatcher on `.specify/logs/council-usage.jsonl`
- Starts polling timer (5s interval) as fallback
- Immediately emits initial 'usage-update' event with current data
- Subscribes to MultiSessionBridgeWatcher 'bridge-update' events

**Preconditions**:
- UsageLogger, CostBudgetEnforcer, MultiSessionBridgeWatcher must be initialized
- `.specify/logs/` directory must exist (created by UsageLogger)

**Postconditions**:
- File watcher is active
- Polling timer is running
- 'usage-update' events are emitted on changes

**Errors**:
- Throws if already monitoring (call `stopMonitoring()` first)

**Example**:
```typescript
const monitor = new AIUsageMonitor(usageLogger, costBudget, sessionWatcher);
monitor.startMonitoring();
// Events start flowing immediately
```

---

### Method: `stopMonitoring()`

**Description**: Stop watching for usage changes and clean up resources

**Signature**:
```typescript
stopMonitoring(): void
```

**Behavior**:
- Disposes FileSystemWatcher
- Clears polling timer
- Unsubscribes from MultiSessionBridgeWatcher events
- No more 'usage-update' events will be emitted

**Preconditions**:
- Must have called `startMonitoring()` first

**Postconditions**:
- All timers and watchers are disposed
- No memory leaks (verified by integration tests)

**Errors**:
- Silent no-op if not currently monitoring

**Example**:
```typescript
monitor.stopMonitoring();
// All resources cleaned up
```

---

### Method: `getUsageData(period)`

**Description**: Get usage data for a specific time period (synchronous, cached)

**Signature**:
```typescript
getUsageData(period: 'current' | 'today' | 'week'): AIUsageData
```

**Parameters**:
- `period`: Time period to retrieve data for

**Returns**:
- `AIUsageData` object for the specified period
- If cached (within 5s TTL), returns cached data
- If cache expired or missing, fetches fresh data and updates cache

**Errors**:
- Returns empty data (zero cost/tokens) if UsageLogger throws
- Logs warning if session ID cannot be determined (for 'current' period)

**Example**:
```typescript
const currentData = monitor.getUsageData('current');
console.log(`Current session: $${currentData.totalCostUsd}`);
```

---

### Method: `forceRefresh()`

**Description**: Force an immediate refresh of usage data (bypasses cache)

**Signature**:
```typescript
forceRefresh(): void
```

**Behavior**:
- Clears cached data
- Re-reads usage logs from UsageLogger
- Emits 'usage-update' event with fresh data

**Use Case**:
- User clicks "Refresh" button in panel toolbar
- Manual refresh after known usage change

**Example**:
```typescript
// User clicked refresh button
vscode.commands.registerCommand('gofer.refreshAIUsage', () => {
  monitor.forceRefresh();
});
```

---

## AIUsageProvider TreeDataProvider Contract

### Method: `getChildren(element?)`

**Description**: Get child items for a tree element (VSCode TreeDataProvider contract)

**Signature**:
```typescript
getChildren(element?: AIUsageItem): Thenable<AIUsageItem[]>
```

**Parameters**:
- `element`: Parent item (undefined for root level)

**Returns**:
- Promise resolving to array of child items
- Root level: Returns period items (Current Session, Today, This Week)
- Period selected: Returns provider items for that period
- Provider selected: Returns token breakdown items (Input Tokens, Output Tokens)

**Contract**:
- Must return within 100ms (constitution requirement for tree views)
- If `element` is undefined, return root items
- If no children exist, return empty array (not undefined)

**Example**:
```typescript
// VSCode calls this to render the tree
const rootItems = await provider.getChildren();
// Returns: [Current Session item, Today item, This Week item]

const sessionChildren = await provider.getChildren(rootItems[0]);
// Returns: [Anthropic item, OpenAI item, Google item]
```

---

### Method: `getTreeItem(element)`

**Description**: Convert AIUsageItem to VSCode TreeItem (VSCode TreeDataProvider contract)

**Signature**:
```typescript
getTreeItem(element: AIUsageItem): vscode.TreeItem
```

**Parameters**:
- `element`: Item to convert to TreeItem

**Returns**:
- `vscode.TreeItem` with label, description, icon, collapsible state

**Formatting Rules**:
- **Period items**:
  - Label: "Current Session" | "Today" | "This Week"
  - Description: `$${totalCostUsd.toFixed(2)}`
  - For 'current': Append budget: `$2.45 / $10.00 (24%)`
- **Provider items**:
  - Label: "Anthropic" | "OpenAI" | "Google"
  - Description: `$${costUsd.toFixed(2)} (${totalTokens.toLocaleString()} tokens)`
- **Token items**:
  - Label: "Input Tokens" | "Output Tokens"
  - Description: `${tokens.toLocaleString()} ($${cost.toFixed(2)})`

**Example**:
```typescript
const treeItem = provider.getTreeItem(element);
// Returns: TreeItem with formatted label, icon, description
```

---

### Method: `refresh()`

**Description**: Trigger tree view refresh (re-renders all visible items)

**Signature**:
```typescript
refresh(): void
```

**Behavior**:
- Fires `_onDidChangeTreeData` event
- VSCode calls `getChildren()` and `getTreeItem()` to re-render

**Called When**:
- AIUsageMonitor emits 'usage-update' event
- User clicks refresh button
- Configuration changes (e.g., status bar enabled/disabled)

**Example**:
```typescript
monitor.on('usage-update', () => {
  provider.refresh(); // Tree view re-renders
});
```

---

## AIUsageStatusBar API

### Method: `connect(monitor)`

**Description**: Connect status bar to AIUsageMonitor for event-driven updates

**Signature**:
```typescript
connect(monitor: AIUsageMonitor): void
```

**Parameters**:
- `monitor`: AIUsageMonitor instance to subscribe to

**Behavior**:
- Subscribes to monitor's 'usage-update' events
- Calls `updateDisplay()` on each event
- Shows/hides status bar based on `gofer.aiUsage.statusBar.enabled` config

**Example**:
```typescript
const statusBar = new AIUsageStatusBar(context, monitor);
statusBar.connect(monitor);
// Status bar now updates in real-time
```

---

### Method: `updateDisplay(data)`

**Description**: Update status bar text, color, and tooltip

**Signature**:
```typescript
updateDisplay(data: AIUsageData): void
```

**Parameters**:
- `data`: Current session usage data (from 'current' period)

**Behavior**:
- Sets text: `$(dollar) AI: $${data.totalCostUsd.toFixed(2)}`
- Sets tooltip: `AI Usage: $${current} / $${limit} (${percent}%) - Click for details`
- Sets color based on budget status:
  - Green (healthy): `new vscode.ThemeColor('statusBarItem.foreground')`
  - Yellow (warning): `new vscode.ThemeColor('statusBarItem.warningForeground')`
  - Red (exceeded): `new vscode.ThemeColor('statusBarItem.errorForeground')`

**Example**:
```typescript
monitor.on('usage-update', (event) => {
  statusBar.updateDisplay(event.data.current);
});
```

---

## Data Source Integration Contracts

### UsageLogger.getUsageSummary()

**Description**: Aggregate usage data by provider and date range

**Signature**:
```typescript
getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>
```

**Returns**:
```typescript
interface UsageSummary {
  totalCostUsd: number;
  totalTokens: number;
  byProvider: {
    [providerId: string]: {
      tokens: number;
      costUsd: number;
      sessions: number;
    };
  };
}
```

**Contract**:
- If `fromDate`/`toDate` are undefined, returns all-time data
- Reads `.specify/logs/council-usage.jsonl` (one JSON object per line)
- Filters entries by timestamp: `fromDate <= entry.timestamp < toDate`
- Aggregates tokens and costs by provider ID

**Used By**: AIUsageMonitor to fetch usage data for time periods

---

### CostBudgetEnforcer.getSnapshot()

**Description**: Get current session budget status

**Signature**:
```typescript
getSnapshot(): CostSnapshot
```

**Returns**:
```typescript
interface CostSnapshot {
  currentCostUsd: number;
  currentTokens: number;
  percentUsed: number;
  status: 'healthy' | 'warning' | 'exceeded';
}
```

**Contract**:
- `percentUsed` = (currentCostUsd / maxCostUsd) * 100
- `status`: 'healthy' (<80%), 'warning' (80-100%), 'exceeded' (>100%)

**Used By**: AIUsageMonitor to populate budget fields in 'current' period data

---

### MultiSessionBridgeWatcher.getBridgeData()

**Description**: Get current active session metadata

**Signature**:
```typescript
getBridgeData(): BridgeData | null
```

**Returns**:
```typescript
interface BridgeData {
  sessionId: string;
  timestamp: number;
  // ...other fields
}
```

**Contract**:
- Returns `null` if no active session detected
- Reads `.specify/hooks/context-bridge.json` (written by Claude Code CLI)

**Used By**: AIUsageMonitor to filter usage data for 'current' session

---

## Error Handling

### File System Errors

**Scenario**: `.specify/logs/council-usage.jsonl` does not exist or is not readable

**Handling**:
- AIUsageMonitor returns empty AIUsageData (zero cost/tokens, empty providers array)
- Panel displays: "No AI usage data yet"
- Status bar displays: "$(dollar) AI: $0.00"
- No error thrown - graceful degradation

### JSON Parse Errors

**Scenario**: council-usage.jsonl contains malformed JSON

**Handling**:
- AIUsageMonitor logs warning: "Failed to parse usage log entry: [error]"
- Skip malformed entry, continue parsing remaining entries
- Emit 'usage-update' event with partial data

### Session Detection Errors

**Scenario**: MultiSessionBridgeWatcher returns `null` (no active session)

**Handling**:
- AIUsageMonitor sets 'current' period data to all-time data (no session filtering)
- Panel displays: "Current Session: [total]" (not "Session not detected")
- Tooltip explains: "Session ID not detected - showing all-time usage"

### Budget Limit Not Set

**Scenario**: CostBudgetEnforcer has no budget limit configured

**Handling**:
- AIUsageMonitor omits budget fields from AIUsageData
- Panel displays cost without budget comparison: "Current Session: $2.45"
- Status bar displays cost only: "$(dollar) AI: $2.45" (no color-coding)

---

## Performance Requirements

| Operation | Requirement | Measured By |
|-----------|-------------|-------------|
| **getUsageData() (cached)** | <10ms | Unit test with timer |
| **getUsageData() (uncached)** | <200ms | Integration test reading real log file |
| **getChildren() (root)** | <50ms | Unit test with timer |
| **getChildren() (provider children)** | <20ms | Unit test with timer |
| **Event emission latency** | <500ms | Integration test: log write → event received |
| **Polling interval** | 5000ms ± 100ms | Integration test with timer |

---

## Versioning

**Version**: 1.0.0 (initial release)

**Breaking Changes**: None - this is a new feature with no existing contract

**Backward Compatibility**: Not applicable

**Deprecation Policy**: If AIUsageMonitor API changes in the future:
1. Mark old methods as `@deprecated` in JSDoc
2. Provide migration guide in CHANGELOG.md
3. Keep deprecated methods for at least 2 minor versions (e.g., 1.0 → 1.2)
4. Remove in next major version (e.g., 2.0)

---

## Testing Contract

All API contracts must be validated by tests:

- **Unit tests**: Verify method signatures, return types, error handling
- **Integration tests**: Verify event flow, file watching, polling
- **Contract tests**: Verify AIUsageMonitor <-> data sources integration

See `tasks.md` for detailed test breakdown.
