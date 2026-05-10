---
feature: AI Token Usage Tracking Panel
spec: spec.md
research: research.md
status: ready
created: 2026-03-13
---

# Implementation Plan: AI Token Usage Tracking Panel

## Summary

Replace the CONTEXT WINDOW section in the Gofer sidebar with an AI TOKEN USAGE panel that provides real-time visibility into AI API costs and token usage across multiple providers (Anthropic, OpenAI, Google). The feature uses existing Gofer infrastructure (CostBudgetEnforcer, UsageLogger) with a TreeDataProvider architecture for <1 second update latency and within 1% cost accuracy.

**Key Innovation**: Hybrid update mechanism combining FileSystemWatcher (<500ms) for immediate updates with 1-hour background polling and manual refresh capability for on-demand updates.

## Technical Context

### Tech Stack

- **Language/Version**: TypeScript 5.x (strict mode)
- **Framework**: VSCode Extension API 1.85+
- **Testing**: Vitest (unit tests), VSCode Test Suite (integration)
- **Dependencies**:
  - vscode (^1.85.0) - TreeDataProvider, FileSystemWatcher, EventEmitter
  - Existing: CostBudgetEnforcer, UsageLogger, MultiSessionBridgeWatcher
- **Target Platform**: VSCode extension (cross-platform: macOS, Windows, Linux)
- **Performance Goals**: <1s update latency, <100ms tree rendering
- **Constraints**: Cannot modify Claude Code CLI (external process)
- **Scale/Scope**: 3 new files (~800 LOC total), extend 2 existing services

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   VSCode Sidebar (Gofer)                    │
├─────────────────────────────────────────────────────────────┤
│  AI TOKEN USAGE Panel (TreeView)                            │
│  │  [Refresh Button] - Manual refresh command               │
│  ├─ 🔹 Current Session ($2.45)                              │
│  │   ├─ Anthropic: $1.50 (50,000 tokens)                    │
│  │   ├─ OpenAI: $0.75 (15,000 tokens)                       │
│  │   └─ Google: $0.20 (80,000 tokens)                       │
│  ├─ 📅 Today ($5.67)                                        │
│  └─ 📆 This Week ($18.42)                                   │
│                                                              │
│  Status Bar: $(dollar) AI: $2.45                            │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ onDidChangeTreeData events
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              AIUsageProvider (TreeDataProvider)             │
│  - Subscribes to AIUsageMonitor events                      │
│  - Handles manual refresh command                           │
│  - Builds hierarchical tree items                           │
│  - Formats costs with icons and colors                      │
└─────────────────────────┬───────────────────────────────────┘
                           ▲
                           │ 'usage-update' events
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              AIUsageMonitor (EventEmitter)                  │
│  - Watches council-usage.jsonl (FileSystemWatcher)          │
│  - Polls every 1 hour (background updates)                  │
│  - Manual refresh method (on-demand updates)                │
│  - Aggregates usage by provider and time period             │
│  - Integrates CostBudgetEnforcer for costs                  │
└─────────────────────────┬───────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ UsageLogger    │ │ CostBudget   │ │ MultiSessionBridge   │
│ .getUsage      │ │ Enforcer     │ │ Watcher              │
│ Summary()      │ │ .getSnapshot │ │ (session detection)  │
└────────────────┘ └──────────────┘ └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  .specify/logs/council-usage.jsonl                          │
│  (written by UsageLogger after each LLM call)               │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component | File | Integration Type |
|-----------|------|------------------|
| **AIUsageProvider** | `extension/src/ui/AIUsageProvider.ts` (MODIFY) | TreeDataProvider registration in extension.ts |
| **AIUsageMonitor** | `extension/src/autonomous/AIUsageMonitor.ts` (NEW) | EventEmitter service, wired to provider |
| **AIUsageStatusBar** | `extension/src/ui/AIUsageStatusBar.ts` (NEW) | Status bar item, optional via config |
| **Package.json** | `extension/package.json:284-287` | REPLACE `goferContextWindow` view registration, add refresh command |
| **Extension.ts** | `extension/src/extension.ts:244-253` | REPLACE ContextWindowProvider with AIUsageProvider |
| **InitializationService** | `extension/src/services/InitializationService.ts:344-350` | Wire monitor to provider, status bar |
| **CommandRegistry** | Commands registration | ADD `gofer.refreshAIUsage` command handler |
| **CostBudgetEnforcer** | `extension/src/autonomous/CostBudgetEnforcer.ts` | REUSE - pricing data, budget thresholds |
| **UsageLogger** | `extension/src/council/UsageLogger.ts` | INTEGRATE - getUsageSummary() for historical data |
| **MultiSessionBridgeWatcher** | `extension/src/autonomous/MultiSessionBridgeWatcher.ts` | INTEGRATE - session detection for "Current Session" |
| **StateManager** | `extension/src/services/StateManager.ts` | EXTEND - add aiUsageProvider, aiUsageMonitor fields |

### Key Dependencies

**Existing Infrastructure (Reuse)**:
- `CostBudgetEnforcer` - Already calculates costs per provider with pricing data
- `UsageLogger` - Already logs to `.specify/logs/council-usage.jsonl` with provider breakdown
- `MultiSessionBridgeWatcher` - Already tracks active sessions via context-bridge.json
- `ContextHealthMonitor` - Pattern for EventEmitter + periodic polling
- `ContextHealthStatusBar` - Pattern for status bar with real-time updates
- `HookBridgeWatcher` - Pattern for FileSystemWatcher + event emission

**New Components (Build)**:
- `AIUsageProvider` - TreeDataProvider for panel display
- `AIUsageMonitor` - Service for aggregating usage data and emitting events
- `AIUsageStatusBar` - Optional status bar item showing current session cost

## Constitution Check

### ✅ Test-Driven Development (NON-NEGOTIABLE)
- **Compliance**: Tests written first for all new components
- **Coverage Plan**:
  - Unit tests for AIUsageMonitor aggregation logic
  - Unit tests for AIUsageProvider tree building
  - Integration tests for FileSystemWatcher triggering panel updates
  - Integration tests for polling fallback
- **Target**: 80%+ coverage (constitution requirement)

### ✅ Strict TypeScript & Code Quality
- **Compliance**: TypeScript strict mode, no `any` types
- **Complexity**:
  - AIUsageMonitor: ~250 LOC, complexity ≤10
  - AIUsageProvider: ~300 LOC, complexity ≤10
  - AIUsageStatusBar: ~150 LOC, complexity ≤10
- **All components under 500 LOC limit**

### ✅ Security by Default
- **Compliance**: No external API calls, no secrets, local file reads only
- **Input Validation**: File paths validated before reading usage logs
- **Rate Limiting**: Polling limited to 1-hour interval (no flood risk, optimized resource usage)

### ✅ Performance Requirements
- **Target**: <1s update latency (meets spec requirement)
- **Breakdown**:
  - FileSystemWatcher: ~200-500ms (file change → event → panel refresh)
  - Polling fallback: ≤3600s (1 hour)
  - Tree rendering: <100ms (constitution requirement for tree views)

### ✅ 80% Test Coverage Minimum
- **Plan**: 85%+ coverage target
  - AIUsageMonitor: 90% (critical path for cost calculations)
  - AIUsageProvider: 85% (tree building logic)
  - AIUsageStatusBar: 80% (display formatting)

### ✅ Minimal Necessary Changes
- **Scope**: Only modify files required for AI usage tracking
- **Protected**: Do NOT refactor CostBudgetEnforcer or UsageLogger beyond adding events
- **Focus**: Replace Context Window panel, add new components, wire dependencies

## Implementation Phases

### Phase 1: Setup & Foundation

**Goal**: Establish project structure, types, and configuration changes

**Tasks**:
- [ ] Create TypeScript interfaces for AI usage data structures
  - `AIUsageData` (total cost, provider breakdown, time period)
  - `ProviderUsage` (provider ID, tokens, cost)
  - `AIUsageMonitorEvents` (usage-update event type)
- [ ] Update `package.json` to replace Context Window view registration
  - Remove `goferContextWindow` view (line 284-287)
  - Add `goferAIUsage` view with icon `$(pulse)` and title "AI Token Usage"
- [ ] Add configuration schema for optional status bar
  - `gofer.aiUsage.statusBar.enabled` (boolean, default: true)
  - `gofer.aiUsage.statusBar.alignment` (left/right, default: left)
- [ ] Update `StateManager` to add new service fields
  - `aiUsageProvider?: AIUsageProvider`
  - `aiUsageMonitor?: AIUsageMonitor`
- [ ] Create test fixtures for usage data
  - Sample council-usage.jsonl entries (3 providers, multiple sessions)
  - Mock BridgeData for session detection

**Verification**:
- [ ] TypeScript compiles with new types (no errors)
- [ ] Configuration schema loads in VSCode settings UI
- [ ] Package.json validation passes (vsce package --check)

### Phase 2: Data Layer (AIUsageMonitor Service)

**Goal**: Implement service for aggregating usage data and emitting events

**Tasks**:
- [ ] Create `AIUsageMonitor` class extending EventEmitter
  - Constructor: Accept UsageLogger, CostBudgetEnforcer, MultiSessionBridgeWatcher
  - Event types: 'usage-update' with AIUsageData payload
- [ ] Implement `getUsageData()` method
  - Aggregate usage by time period (Current Session, Today, This Week)
  - Call `usageLogger.getUsageSummary()` with date filters
  - Map provider breakdown from UsageLogger format to AIUsageData
  - Calculate costs using CostBudgetEnforcer pricing
- [ ] Implement FileSystemWatcher for council-usage.jsonl
  - Watch `.specify/logs/council-usage.jsonl` (create RelativePattern)
  - On file change: Parse new entry → emit 'usage-update' event
  - Guard against duplicate watchers (memory leak prevention)
- [ ] Implement periodic polling (1-hour interval)
  - setInterval to call getUsageData() every 3600000ms (1 hour)
  - Background updates when FileSystemWatcher is inactive
  - Clear interval on dispose()
- [ ] Implement manual refresh method
  - `forceRefresh()` method for on-demand updates
  - Immediately calls getUsageData() and emits 'usage-update' event
  - Available regardless of automatic update settings
- [ ] Add session detection integration
  - Subscribe to MultiSessionBridgeWatcher 'bridge-update' events
  - Extract sessionId from BridgeData for "Current Session" filtering
  - Emit 'usage-update' when active session changes
- [ ] Implement dispose() for cleanup
  - Stop file watcher, clear polling interval
  - Unsubscribe from MultiSessionBridgeWatcher events

**Verification**:
- [ ] Unit tests: getUsageData() aggregates by time period correctly
- [ ] Unit tests: Cost calculations match CostBudgetEnforcer rates
- [ ] Unit tests: forceRefresh() triggers immediate update
- [ ] Integration test: File watcher emits event when council-usage.jsonl changes
- [ ] Integration test: Polling runs every 1 hour (3600s interval)
- [ ] Integration test: Manual refresh works independently of automatic updates
- [ ] Integration test: Dispose prevents memory leaks (no timers/watchers after dispose)

### Phase 3: UI Layer (AIUsageProvider TreeDataProvider)

**Goal**: Implement TreeDataProvider for hierarchical display in sidebar

**Tasks**:
- [ ] Create `AIUsageProvider` class implementing `vscode.TreeDataProvider<AIUsageItem>`
  - EventEmitter: `_onDidChangeTreeData` and `onDidChangeTreeData` property
  - Constructor: Accept AIUsageMonitor
  - Subscribe to monitor's 'usage-update' events → call refresh()
- [ ] Implement manual refresh command handler
  - Method `handleRefreshCommand()` calls monitor.forceRefresh()
  - Shows loading indicator during refresh
  - Handles errors gracefully
- [ ] Implement `getChildren(element?)` method
  - Root level: Return time period items (Current Session, Today, This Week)
  - Time period selected: Return provider items for that period
  - Provider selected: Return token breakdown items (input/output tokens)
- [ ] Implement `getTreeItem(element)` method
  - Format labels: "Current Session ($2.45)" for periods
  - Format labels: "Anthropic: $1.50 (50,000 tokens)" for providers
  - Add icons: `$(pulse)` for periods, provider-specific icons
  - Set collapsible state: expandable for periods/providers, none for token details
- [ ] Implement `refresh()` method
  - Fire `_onDidChangeTreeData.fire()` to trigger VSCode re-render
- [ ] Add budget progress display
  - Show budget status in Current Session item: "$2.45 / $10.00 (24%)"
  - Color-code using ThemeColor based on CostBudgetEnforcer status
    - Green: <80% of budget
    - Yellow: 80-100% of budget
    - Red: >100% of budget
- [ ] Format numbers for display
  - Costs: 2 decimal places ("$2.45")
  - Tokens: thousands separator ("50,000 tokens")

**Verification**:
- [ ] Unit tests: getChildren() returns correct hierarchy
- [ ] Unit tests: getTreeItem() formats labels and icons correctly
- [ ] Unit tests: Budget color-coding matches thresholds
- [ ] Unit tests: handleRefreshCommand() triggers monitor.forceRefresh()
- [ ] Integration test: Panel updates when monitor emits 'usage-update'
- [ ] Integration test: Refresh command completes within 1 second
- [ ] Manual test: Expand/collapse works in VSCode tree view
- [ ] Manual test: Refresh button works in panel toolbar

### Phase 4: Status Bar (Optional)

**Goal**: Add optional status bar item showing current session cost

**Tasks**:
- [ ] Create `AIUsageStatusBar` class implementing `vscode.Disposable`
  - Constructor: Accept ExtensionContext, AIUsageMonitor
  - Create status bar item with alignment Left, priority 99 (next to ContextHealthStatusBar at 100)
  - Set command to `gofer.showAIUsage` (opens panel or QuickPick)
- [ ] Implement `connect(monitor)` method
  - Subscribe to monitor's 'usage-update' events
  - Call `updateDisplay()` with latest usage data
  - Show/hide based on config: `gofer.aiUsage.statusBar.enabled`
- [ ] Implement `updateDisplay(data)` method
  - Text format: "$(dollar) AI: $2.45" (current session total)
  - Tooltip: "AI Usage: $2.45 / $10.00 (24%) - Click for details"
  - Color-code by budget status (green/yellow/red using ThemeColor)
- [ ] Register command `gofer.showAIUsage`
  - Option 1: Focus AI TOKEN USAGE panel (`vscode.commands.executeCommand('goferAIUsage.focus')`)
  - Option 2: Show QuickPick with provider breakdown (interactive)
  - Decision: Use QuickPick for richer interaction without panel switch
- [ ] Implement dispose() for cleanup
  - Dispose status bar item, unsubscribe from monitor events

**Verification**:
- [ ] Unit tests: updateDisplay() formats text and color correctly
- [ ] Unit tests: Config change (enabled/disabled) shows/hides status bar
- [ ] Integration test: Status bar updates within 1s of usage change
- [ ] Integration test: Clicking status bar opens QuickPick with provider breakdown
- [ ] Manual test: Status bar appears in VSCode status bar (left alignment)

### Phase 5: Extension Wiring & Integration

**Goal**: Wire all components together and replace Context Window panel

**Tasks**:
- [ ] Update `extension.ts` activation
  - REMOVE ContextWindowProvider registration (lines 244-253)
  - ADD AIUsageProvider registration:
    ```typescript
    const aiUsageMonitor = new AIUsageMonitor(usageLogger, costBudgetEnforcer, multiSessionWatcher);
    const aiUsageProvider = new AIUsageProvider(aiUsageMonitor);
    vscode.window.registerTreeDataProvider('goferAIUsage', aiUsageProvider);
    ```
  - ADD AIUsageStatusBar registration (if enabled):
    ```typescript
    const aiUsageStatusBar = new AIUsageStatusBar(context, aiUsageMonitor);
    aiUsageStatusBar.connect(aiUsageMonitor);
    ```
  - Store in StateManager: `state.aiUsageProvider = aiUsageProvider`
- [ ] Update `InitializationService.ts` wiring
  - Wire AIUsageMonitor to data sources during workspace initialization
  - Call `aiUsageMonitor.startMonitoring()` after initialization
  - Add to disposal list: `disposables.push(aiUsageMonitor, aiUsageStatusBar)`
- [ ] Add configuration change listener
  - Listen for changes to `gofer.aiUsage.statusBar.enabled`
  - Show/hide status bar dynamically
- [ ] Update disposal logic
  - Ensure all timers, watchers, and event subscriptions are cleaned up
  - Test with multiple workspace reinitializations (guard against memory leaks)

**Verification**:
- [ ] Integration test: Extension activates without errors
- [ ] Integration test: AI TOKEN USAGE panel appears in Gofer sidebar
- [ ] Integration test: Context Window panel is removed (not visible)
- [ ] Integration test: Panel displays usage data after activation
- [ ] Integration test: Reinitialization does not leak memory (timer count stable)
- [ ] Manual test: Open VSCode, verify panel is visible and populated

### Phase 6: Polish & Final Testing

**Goal**: Add final touches and comprehensive testing

**Tasks**:
- [ ] Add panel refresh command (MOVED FROM POLISH - NOW CORE REQUIREMENT)
  - Register `gofer.refreshAIUsage` command in package.json
  - Add command to package.json commands section
  - Button in panel view/title toolbar (icon: `$(sync)`)
  - Calls `aiUsageProvider.handleRefreshCommand()` → `aiUsageMonitor.forceRefresh()` → emits 'usage-update'
  - Command palette entry: "Gofer: Refresh AI Usage"
- [ ] Add error handling
  - Gracefully handle missing council-usage.jsonl file (show "No usage data yet")
  - Handle JSON parse errors (log warning, continue polling)
  - Handle missing session data (show "Session not detected")
- [ ] Add logging for observability
  - Log when file watcher starts/stops
  - Log when polling fallback activates
  - Log usage data updates (debug level)
- [ ] Performance optimization
  - Debounce file watcher events (multiple writes within 500ms)
  - Cache usage data to avoid re-parsing on every tree request
  - Lazy-load provider breakdown (only parse when expanded)
- [ ] Documentation
  - Add JSDoc comments to public methods
  - Update CHANGELOG.md with feature description
  - Add usage example to README.md (screenshot of panel)

**Verification**:
- [ ] All unit tests pass (85%+ coverage)
- [ ] All integration tests pass
- [ ] Manual testing: Create LLM calls, verify panel updates within 1s
- [ ] Manual testing: Test with missing log file (graceful degradation)
- [ ] Manual testing: Test refresh button works
- [ ] Performance test: Tree rendering <100ms with 50+ sessions
- [ ] Performance test: No memory leaks after 1 hour of monitoring

## File Structure

### Documentation (this feature)

```text
.specify/specs/025-ai-usage-tracking/
├── spec.md              # Feature specification (/2_gofer_specify)
├── research.md          # Codebase research (/1_gofer_research)
├── plan.md              # This file (/3_gofer_plan)
├── data-model.md        # Data structures (this phase)
├── contracts/           # Internal API contracts (this phase)
│   └── internal-api.md
├── quickstart.md        # Testing guide (this phase)
├── tasks.md             # Task breakdown (/4_gofer_tasks - next)
└── issues.md            # GitHub issues (/4_gofer_tasks - next)
```

### Source Code (repository root)

```text
extension/
├── src/
│   ├── autonomous/
│   │   ├── AIUsageMonitor.ts            # MODIFY - Change polling to 3600s, add forceRefresh()
│   │   ├── CostBudgetEnforcer.ts        # REUSE - pricing data integration
│   │   └── MultiSessionBridgeWatcher.ts # INTEGRATE - session detection
│   ├── council/
│   │   └── UsageLogger.ts               # INTEGRATE - read usage data
│   ├── ui/
│   │   ├── AIUsageProvider.ts           # MODIFY - Add manual refresh command handler
│   │   ├── AIUsageStatusBar.ts          # EXISTS - Optional status bar
│   │   └── ContextHealthStatusBar.ts    # REFERENCE - status bar pattern
│   ├── services/
│   │   ├── StateManager.ts              # EXTEND - add new service fields
│   │   └── InitializationService.ts     # EXTEND - wire new services
│   └── extension.ts                     # MODIFY - replace Context Window
├── package.json                          # MODIFY - view registration, refresh command, toolbar button
└── package.nls.json                      # OPTIONAL - localized strings

tests/
├── unit/
│   ├── aiUsageMonitor.test.ts           # NEW - monitor unit tests (includes forceRefresh tests)
│   ├── aiUsageProvider.test.ts          # NEW - provider unit tests (includes refresh command tests)
│   └── aiUsageStatusBar.test.ts         # NEW - status bar unit tests
└── integration/
    ├── aiUsagePanel.test.ts             # NEW - panel integration tests (includes manual refresh)
    └── aiUsageUpdates.test.ts           # NEW - real-time update tests (1-hour polling)
```

## Data Model

See `data-model.md` for detailed entity definitions.

**Summary**:
- `AIUsageData` - Aggregated usage by time period with provider breakdown
- `ProviderUsage` - Usage for a single provider (tokens, cost)
- `AIUsageItem` - Tree view item (label, icon, children)

## API Contracts

See `contracts/internal-api.md` for detailed API specifications.

**Summary**:
- AIUsageMonitor events: 'usage-update' with AIUsageData payload
- AIUsageProvider interface: TreeDataProvider methods (getChildren, getTreeItem)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **FileSystemWatcher fails on some platforms** | High - Real-time updates broken | 1-hour polling fallback + manual refresh ensures updates available |
| **Claude Code CLI doesn't write usage logs** | Critical - No data to display | Enhance ContextUsageLogger to track all LLM calls (Phase 3 extension) |
| **Token counts missing from CLI metadata** | Medium - Inaccurate cost estimates | Log warning when estimates used, defer token estimation to future |
| **Users rely on Context Window features** | Medium - Workflow disruption | Document replacement impact, consider config to restore (future) |
| **Memory leak from duplicate watchers** | High - Extension becomes unstable | Guard against duplicate timers/watchers, comprehensive disposal tests |
| **Panel replacement breaks existing workflows** | Medium - User complaints | User confirmation before replacement, migration guide in CHANGELOG |
| **Config migration from 5s to 3600s polling** | Low - Existing configs break | No user-facing config for polling interval, internal constant change only |
| **Users expect continuous updates** | Medium - Perception issue | Manual refresh + FileSystemWatcher provide immediate updates when needed |

## Spec Traceability

### User Story Coverage

| Story | Status | Plan References |
|-------|--------|----------------|
| US1: View Real-Time AI Costs (P1) | COVERED | Phase 2 (AIUsageMonitor), Phase 3 (AIUsageProvider), Phase 5 (Wiring) |
| US2: Monitor Usage Across Time Periods (P1) | COVERED | Phase 2 (Time period aggregation), Phase 3 (Hierarchical tree display) |
| US3: Stay Within Budget Limits (P2) | COVERED | Phase 3 (Budget progress display with color-coding) |
| US4: Quick Access to Session Costs (P2) | COVERED | Phase 4 (AIUsageStatusBar with QuickPick) |
| US5: Manual Panel Refresh (P1) | COVERED | Phase 2 (forceRefresh method), Phase 3 (refresh command handler), Phase 6 (toolbar button) |

### Requirement Coverage

| Requirement | Status | Plan Reference |
|------------|--------|---------------|
| FR1: Panel Registration and Display | COVERED | Phase 1 (package.json update), Phase 5 (extension.ts wiring) |
| FR2: Real-Time Cost Tracking | COVERED | Phase 2 (FileSystemWatcher + 1-hour polling + manual refresh) |
| FR3: Provider Breakdown Display | COVERED | Phase 3 (Tree hierarchy: periods → providers → tokens) |
| FR4: Time Period Aggregation | COVERED | Phase 2 (Current Session, Today, This Week) |
| FR5: Budget Integration | COVERED | Phase 3 (CostBudgetEnforcer integration, color-coding) |
| FR6: Status Bar Item (Optional) | COVERED | Phase 4 (AIUsageStatusBar with config toggle) |
| FR7: Cost Calculation Accuracy | COVERED | Phase 2 (Reuse CostBudgetEnforcer pricing data) |
| FR8: Panel Refresh and Updates | COVERED | Phase 2 (EventEmitter pattern, 1-hour polling), Phase 6 (Refresh command) |
| FR9: Manual Refresh Control | COVERED | Phase 2 (forceRefresh method), Phase 3 (command handler), Phase 6 (toolbar button, command palette) |

**Coverage**: 5/5 user stories (100%), 9/9 functional requirements (100%)

### Acceptance Criteria Mapping

| User Story | Acceptance Criterion | Plan Component | Implementation Approach |
|-----------|---------------------|----------------|------------------------|
| US1 | Panel displays current session total cost (<1s latency) | Phase 2: AIUsageMonitor | FileSystemWatcher (<500ms) + manual refresh (<1s) |
| US1 | Panel shows cost breakdown by provider | Phase 3: AIUsageProvider.getChildren() | Tree hierarchy: providers as children of time periods |
| US1 | Panel shows token counts (input/output) per provider | Phase 3: AIUsageProvider.getTreeItem() | Token breakdown as children of provider items |
| US1 | Panel updates automatically on new AI calls | Phase 2: FileSystemWatcher | Watch council-usage.jsonl, emit events on change |
| US1 | Cost calculations accurate within 1% | Phase 2: CostBudgetEnforcer integration | Reuse existing pricing data (validated rates) |
| US2 | Panel displays "Current Session" usage | Phase 2: MultiSessionBridgeWatcher integration | Filter usage by active sessionId from bridge-update events |
| US2 | Panel displays "Today" aggregated usage | Phase 2: UsageLogger.getUsageSummary() | Date filter: start of day (00:00) to now |
| US2 | Panel displays "This Week" aggregated usage | Phase 2: UsageLogger.getUsageSummary() | Date filter: start of week (Monday 00:00) to now |
| US2 | Each time period shows total cost and per-provider breakdown | Phase 3: Tree building logic | Hierarchical items: period (total) → providers (breakdown) |
| US2 | Time periods are expandable/collapsible | Phase 3: getTreeItem() collapsible state | TreeItemCollapsibleState.Collapsed for periods |
| US3 | Panel displays budget progress | Phase 3: Budget display logic | Format: "$2.45 / $10.00 (24%)" in Current Session item |
| US3 | Budget status is color-coded | Phase 3: ThemeColor assignment | Green (<80%), Yellow (80-100%), Red (>100%) |
| US3 | Budget integrates with CostBudgetEnforcer | Phase 2: getSnapshot() call | Read budget limits and current cost from enforcer |
| US3 | Budget warnings visible in panel | Phase 3: Item descriptions | Add warning icon and text for exceeded budgets |
| US4 | Status bar shows current session cost | Phase 4: AIUsageStatusBar.updateDisplay() | Text: "$(dollar) AI: $2.45" |
| US4 | Status bar updates in real-time (<1s) | Phase 4: subscribe to 'usage-update' events | Same event stream as panel (FileSystemWatcher) |
| US4 | Status bar is color-coded by budget status | Phase 4: ThemeColor assignment | Same color logic as panel (green/yellow/red) |
| US4 | Clicking status bar opens panel or QuickPick | Phase 4: gofer.showAIUsage command | QuickPick with provider breakdown |
| US4 | Status bar can be enabled/disabled | Phase 4: Config listener | gofer.aiUsage.statusBar.enabled setting |
| US5 | Panel toolbar includes refresh button/icon | Phase 6: package.json view/title | Button with $(sync) icon |
| US5 | Command palette includes refresh command | Phase 6: package.json commands | "Gofer: Refresh AI Usage" |
| US5 | Manual refresh updates within 1 second | Phase 2: forceRefresh() implementation | Immediate data reload and event emission |
| US5 | Refresh available when automatic updates disabled | Phase 2: forceRefresh() independent | Works regardless of watcher/polling state |
| US5 | Refresh button shows loading state | Phase 3: handleRefreshCommand() | Loading indicator during update |

**Coverage**: 24/24 acceptance criteria (100%)

## Notes

### Implementation Highlights

1. **Reuse over Rebuild**: This plan maximizes reuse of existing Gofer infrastructure (CostBudgetEnforcer, UsageLogger, MultiSessionBridgeWatcher) rather than building new cost tracking systems.

2. **Panel Replacement Impact**: Replacing Context Window removes token category breakdown functionality. Users who rely on seeing CLAUDE.md vs Auto Memory vs Conversation History token breakdowns will lose this visibility. Consider documenting this in CHANGELOG with migration guidance.

3. **Optimized Updates**: The hybrid approach uses FileSystemWatcher for immediate updates (<500ms), 1-hour background polling for resource efficiency, and manual refresh for on-demand updates. This reduces CPU/disk I/O from continuous 5s polling while maintaining responsiveness when needed.

4. **Constitution Compliance**: All components are under 500 LOC, use strict TypeScript, and follow existing patterns (TreeDataProvider, EventEmitter, status bar). Test coverage target is 85%+ (exceeds 80% minimum).

5. **Future Enhancements** (Out of Scope):
   - Live pricing API integration (currently uses static rates)
   - Token estimation fallback (if CLI doesn't provide counts)
   - Historical charts/graphs (WebView enhancement)
   - Cost alerts/notifications (proactive warnings)
   - Export to CSV (data portability)

### Pattern Compliance

This plan follows established Gofer patterns:

- **TreeDataProvider**: Matches ContextWindowProvider architecture (hierarchical display)
- **EventEmitter Service**: Matches ContextHealthMonitor pattern (event-driven updates)
- **FileSystemWatcher**: Matches HookBridgeWatcher pattern (real-time file monitoring)
- **Status Bar**: Matches ContextHealthStatusBar pattern (alignment, priority, color-coding)
- **Initialization Wiring**: Matches InitializationService component registration pattern
- **Disposal**: Matches DisposalService cleanup patterns (guard against memory leaks)

### Testing Strategy

- **Unit Tests**: Focus on data aggregation, cost calculations, tree building logic
- **Integration Tests**: Focus on file watching, event flow, panel updates, config changes
- **Manual Tests**: Focus on user experience (panel visibility, update latency, error states)
- **Performance Tests**: Focus on memory leaks, rendering speed, update frequency

### Open Questions (Resolved in Spec)

- ✅ **Panel replacement**: User confirmed REPLACE (not add alongside)
- ✅ **Time ranges**: Current Session + Today + This Week (3 levels)
- ✅ **Status bar**: Optional, enabled by default
- ✅ **External libraries**: No external dependencies (use Gofer infrastructure)

Ready for next stage: `/4_gofer_tasks` to generate task breakdown.
