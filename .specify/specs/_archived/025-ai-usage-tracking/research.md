---
date: 2026-03-13T12:00:00Z
researcher: Claude
feature: 'AI Usage Tracking'
status: complete
---

# Research: AI Usage Tracking

## Feature Summary

Replace the CONTEXT WINDOW section in the Gofer panel with an AI TOKEN USAGE section that displays real-time AI API costs and token usage across multiple providers (OpenAI, Anthropic, Google) directly within VSCode. This provides developers with cost awareness (<1s update latency) and budget control during AI-assisted development sessions.

**Key Requirements** (from discovery):
- Real-time cost tracking with <1 second update latency
- Support for 3+ AI providers (OpenAI, Anthropic, Google, etc.)
- Cost calculation accuracy within 1% of actual provider bills
- Replace existing CONTEXT WINDOW section in Gofer panel

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| **AI Usage Panel Provider** | `extension/src/aiUsageProvider.ts` (new) | TreeDataProvider for AI TOKEN USAGE section |
| **AI Usage Monitor** | `extension/src/autonomous/AIUsageMonitor.ts` (new) | Service tracking token usage across providers with event emission |
| **AI Usage Status Bar** | `extension/src/ui/AIUsageStatusBar.ts` (new) | Optional status bar item showing current session costs |
| **Package.json registration** | `extension/package.json:284-287` | Replace `goferContextWindow` view registration |
| **Extension wiring** | `extension/src/extension.ts:244-253` | Register new provider instead of ContextWindowProvider |
| **Initialization** | `extension/src/services/InitializationService.ts:344-350` | Wire monitor to provider with data sources |
| **Existing cost tracking** | `extension/src/autonomous/CostBudgetEnforcer.ts` | **REUSE** - Already tracks costs per provider |
| **Existing usage logging** | `extension/src/autonomous/ContextUsageLogger.ts` | **REUSE** - JSONL logging infrastructure |
| **Council usage data** | `extension/src/council/UsageLogger.ts` | **INTEGRATE** - Pull provider breakdown data |

### Existing Patterns to Follow

#### Pattern 1: Status Bar with Real-Time Updates

**Found in**: `extension/src/ui/ContextHealthStatusBar.ts:123-185`

```typescript
export class ContextHealthStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private currentStatus: ContextHealthStatus | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100 // High priority
    );
    this.statusBarItem.command = 'gofer.showContextHealth';
    this.statusBarItem.tooltip = 'Click to view context health details';
    context.subscriptions.push(this);
  }

  connect(monitor: ContextHealthMonitor): void {
    monitor.on('healthy', (status) => this.updateDisplay(status));
    monitor.on('warning', (status) => this.updateDisplay(status));
    monitor.on('critical', (status) => this.updateDisplay(status));

    const lastStatus = monitor.getLastStatus();
    if (lastStatus) this.updateDisplay(lastStatus);
  }

  private updateDisplay(status: ContextHealthStatus | null): void {
    this.statusBarItem.text = `$(check) Context: 54% (Opus)`;
    this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.foreground');
  }
}
```

**Why relevant**: This demonstrates the event-driven update pattern we should use for AI usage tracking. Monitor emits events → status bar updates display (<100ms latency).

#### Pattern 2: TreeDataProvider with Session-Based Data

**Found in**: `extension/src/contextWindowProvider.ts:57-231`

```typescript
export class ContextWindowProvider implements vscode.TreeDataProvider<ContextWindowItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ContextWindowItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private multiSessionWatcher: MultiSessionBridgeWatcher,
    private scanner: ClaudeCodeContextScanner
  ) {
    // Wire to session watcher for real-time updates
    multiSessionWatcher.on('bridge-update', () => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: ContextWindowItem): ContextWindowItem[] {
    if (!element) {
      // Root: return session items
      return this.getSessionItems();
    } else if (element.contextValue === 'session') {
      // Session selected: return category items
      return this.getCategoryItems(element.sessionId);
    }
  }

  private getCategoryItems(sessionId: string): ContextWindowItem[] {
    // Build category items from scanner data
    const categories = this.scanner.getCategories(sessionId);
    return categories.map(cat => ({
      label: `${cat.name}: ${cat.tokens.toLocaleString()} tokens`,
      contextValue: 'category',
      // ...
    }));
  }
}
```

**Why relevant**: This shows how to:
1. Wire TreeDataProvider to a data source (MultiSessionBridgeWatcher)
2. Emit `onDidChangeTreeData` events to trigger UI refresh
3. Build hierarchical items (sessions → categories)
4. Format data with icons and token counts

#### Pattern 3: Cost Tracking with Provider Breakdown

**Found in**: `extension/src/autonomous/CostBudgetEnforcer.ts:16-93`

```typescript
export const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.00025, output: 0.0005 },
  openai: { input: 0.005, output: 0.015 },
};

export class CostBudgetEnforcer {
  private currentCostUsd = 0;
  private currentTokens = 0;

  recordUsage(inputTokens: number, outputTokens: number, providerId?: string): CostSnapshot {
    const provider = providerId ?? 'anthropic';
    const rates = COST_PER_1K_TOKENS[provider];

    const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1000;
    this.currentCostUsd += cost;
    this.currentTokens += inputTokens + outputTokens;

    return this.getSnapshot();
  }

  getSnapshot(): CostSnapshot {
    const percentUsed = (this.currentCostUsd / this.config.maxCostUsd) * 100;
    return {
      currentCostUsd: this.currentCostUsd,
      currentTokens: this.currentTokens,
      percentUsed,
      status: percentUsed > 100 ? 'exceeded' : percentUsed > 80 ? 'warning' : 'healthy',
    };
  }
}
```

**Why relevant**: **REUSE THIS** - CostBudgetEnforcer already calculates costs per provider. We can:
1. Use existing `COST_PER_1K_TOKENS` pricing data
2. Call `recordUsage()` to track cumulative costs
3. Get `CostSnapshot` for display in the panel
4. Extend to track per-provider breakdowns

#### Pattern 4: Usage Logging with Provider Breakdown

**Found in**: `extension/src/council/UsageLogger.ts:70-171`

```typescript
const COST_PER_1K_TOKENS: Record<ProviderId, { input: number; output: number }> = {
  anthropic: { input: 0.003, output: 0.015 },
  google: { input: 0.00025, output: 0.0005 },
  openai: { input: 0.005, output: 0.015 },
};

export interface UsageLogEntry {
  timestamp: string;
  sessionId: string;
  stage: string;
  councilMode: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  providers: Record<string, { tokens: number; costUsd: number }>;
}

export class UsageLogger {
  async getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary> {
    // Reads .specify/logs/council-usage.jsonl
    // Aggregates by provider and stage
    return {
      totalCostUsd: 10.50,
      byProvider: {
        anthropic: { tokens: 50000, costUsd: 5.25, sessions: 10 },
        openai: { tokens: 30000, costUsd: 3.75, sessions: 5 },
        google: { tokens: 100000, costUsd: 1.50, sessions: 3 },
      },
      // ...
    };
  }
}
```

**Why relevant**: **INTEGRATE THIS** - UsageLogger already:
1. Logs usage to `.specify/logs/council-usage.jsonl`
2. Provides `getUsageSummary()` with provider breakdown
3. Tracks tokens and costs per provider
4. Has session-based aggregation

We can **read this data** to populate the AI TOKEN USAGE panel with historical data.

#### Pattern 5: Event-Driven Monitor with Polling

**Found in**: `extension/src/autonomous/ContextHealthMonitor.ts:560-584`

```typescript
export class ContextHealthMonitor extends EventEmitter<ContextHealthEvents> {
  private monitoringInterval: NodeJS.Timeout | null = null;

  startMonitoring(intervalMs?: number): void {
    if (this.monitoringInterval) {
      this.stopMonitoring(); // Guard against duplicate timers
    }

    this.monitoringInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs ?? 5000);
  }

  private async checkHealth(): Promise<void> {
    const status = await this.contextProvider();

    // Emit events on threshold crossing
    if (status.status !== this.lastStatus) {
      this.emit(status.status, status); // 'healthy' | 'warning' | 'critical'
      this.emit('status-change', this.lastStatus, status.status, status);
    }
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}
```

**Why relevant**: This demonstrates:
1. EventEmitter pattern for service-to-UI communication
2. Periodic polling with guard against duplicate timers (memory leak prevention)
3. Status change detection (emit only on transitions, not every check)
4. Proper cleanup on stop

#### Pattern 6: File System Watcher for Real-Time Updates

**Found in**: `extension/src/autonomous/HookBridgeWatcher.ts:76-150`

```typescript
export class HookBridgeWatcher extends EventEmitter<BridgeWatcherEvents> {
  start(): void {
    const pattern = new vscode.RelativePattern(
      this.workspacePath,
      '.specify/hooks/context-bridge.json'
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    this.watcher.onDidChange(() => this.onBridgeChange());
    this.watcher.onDidCreate(() => this.onBridgeChange());

    this.stalenessTimer = setInterval(() => this.checkStaleness(), 60000);
  }

  private onBridgeChange(): void {
    const data: BridgeData = JSON.parse(fs.readFileSync(this.bridgePath, 'utf-8'));
    this.emit('bridge-update', data); // Real-time event (<500ms)
  }
}
```

**Why relevant**: If we log usage to a file, we can watch it with FileSystemWatcher for real-time panel updates (<500ms latency).

### Integration Points

1. **CostBudgetEnforcer Integration** (`extension/src/autonomous/CostBudgetEnforcer.ts:68-93`)
   - Hook into `recordUsage()` calls to capture token counts per provider
   - Extend to track per-provider breakdown (currently only tracks total)
   - Emit events when usage is recorded for real-time updates

2. **UsageLogger Integration** (`extension/src/council/UsageLogger.ts:185-281`)
   - Read `.specify/logs/council-usage.jsonl` for historical session data
   - Use `getUsageSummary()` to aggregate costs by provider
   - Display provider breakdown in panel (Anthropic, OpenAI, Google)

3. **ContextUsageLogger Integration** (`extension/src/autonomous/ContextUsageLogger.ts:82-87`)
   - Reuse `llmInputTokens` and `llmOutputTokens` fields (T054)
   - Add provider tracking to existing log entries
   - Watch log file for real-time updates

4. **Extension Initialization** (`extension/src/extension.ts:244-253`)
   - Replace `ContextWindowProvider` registration with `AIUsageProvider`
   - Update package.json view registration (line 284-287)
   - Wire to CostBudgetEnforcer and UsageLogger data sources

5. **StateManager** (`extension/src/services/StateManager.ts`)
   - Add `aiUsageProvider?: AIUsageProvider` field
   - Add `aiUsageMonitor?: AIUsageMonitor` field
   - Wire during initialization

### Related Code

- `extension/package.json:284-287` - View registration for CONTEXT WINDOW (replace this)
- `extension/src/extension.ts:250-251` - ContextWindowProvider registration (replace this)
- `extension/src/services/InitializationService.ts:344-350` - Provider wiring pattern
- `extension/src/autonomous/CostBudgetEnforcer.ts:16-20` - **REUSE** pricing data
- `extension/src/council/UsageLogger.ts:70-74` - **REUSE** pricing data (same rates)
- `extension/src/autonomous/ContextUsageLogger.ts:82-87` - **EXTEND** with provider field

## Technology Decisions

### Decision 1: AI Usage Tracking Library

**Choice**: **Build custom integration** using existing Gofer cost tracking infrastructure

**Rationale**:
- Gofer already has robust cost tracking: `CostBudgetEnforcer`, `UsageLogger`, `ContextUsageLogger`
- Pricing data already defined (`COST_PER_1K_TOKENS` in two locations - can consolidate)
- JSONL logging infrastructure exists (`.specify/logs/council-usage.jsonl`)
- External libraries (ai-sdk-cost-calculator, llm-token-tracker) require:
  - Additional dependencies (Vercel AI SDK, npm packages)
  - Middleware integration into Claude Code CLI (not under Gofer control)
  - Potential accuracy issues if pricing data doesn't match actual bills

**Alternatives considered**:
1. **ai-sdk-cost-calculator** ([npm](https://www.npmjs.com/package/ai-sdk-cost-calculator))
   - Pros: Supports OpenAI, Anthropic, Google with built-in pricing
   - Cons: Requires Vercel AI SDK as peer dependency, designed for AI SDK middleware (not CLI integration)
   - Verdict: Overhead not justified when we already have cost tracking

2. **llm-token-tracker** ([GitHub](https://github.com/wn01011/llm-token-tracker))
   - Pros: Manual tracking API, supports OpenAI/Anthropic/Gemini
   - Cons: Requires manual `startTracking()`/`endTracking()` calls in CLI, session management complexity
   - Verdict: Manual tracking doesn't fit VSCode extension architecture

3. **tokentop** ([GitHub](https://github.com/tokentopapp/tokentop))
   - Pros: Real-time terminal monitoring, multi-provider support
   - Cons: CLI tool (not a library), not production-ready (as of March 2026)
   - Verdict: Not suitable for VSCode extension integration

4. **openusage** (user's initial suggestion)
   - Research finding: This is a **macOS menu bar app**, not an npm library
   - Verdict: Cannot be integrated into a VSCode extension

**Implementation Approach**:
- Extend `CostBudgetEnforcer` to track per-provider breakdown (currently only total)
- Read `UsageLogger.getUsageSummary()` for historical provider costs
- Create `AIUsageMonitor` service following `ContextHealthMonitor` pattern
- Emit events when usage changes for real-time panel updates

### Decision 2: Panel Architecture

**Choice**: **TreeDataProvider** with session-based hierarchy

**Rationale**:
- Matches existing Gofer panel patterns (ContextWindowProvider, MemoryProvider)
- Supports hierarchical display: Sessions → Providers → Token/Cost breakdown
- VSCode native TreeView integration (no WebView complexity)
- Event-driven refresh mechanism (`onDidChangeTreeData`)

**Structure**:
```
📊 AI TOKEN USAGE
  └── 🔹 Current Session ($2.45)
       ├── Anthropic: $1.50 (50,000 tokens)
       ├── OpenAI: $0.75 (15,000 tokens)
       └── Google: $0.20 (80,000 tokens)
  └── 📅 Today ($5.67)
       ├── Anthropic: $3.20
       ├── OpenAI: $1.80
       └── Google: $0.67
  └── 📆 This Week ($18.42)
       └── ...
```

**Alternatives considered**:
1. **WebView Panel** (like MemoryPanel)
   - Pros: Rich HTML/CSS/JS, charts/graphs possible
   - Cons: More complex, slower than TreeView, requires bidirectional messaging
   - Verdict: Overkill for simple token/cost display

2. **Status Bar Only** (like ContextHealthStatusBar)
   - Pros: Always visible, <100ms updates
   - Cons: Limited space, can't show provider breakdown
   - Verdict: Good complement to panel, but not sufficient alone

**Decision**: TreeView panel + optional status bar item for current session total

### Decision 3: Update Mechanism

**Choice**: **Hybrid** - File watcher (<500ms) + periodic polling (5s fallback)

**Rationale**:
- UsageLogger writes to `.specify/logs/council-usage.jsonl` after each LLM call
- FileSystemWatcher detects file changes → immediate panel refresh
- Periodic polling (5s) ensures updates even if file watch fails
- Matches ContextHealthMonitor pattern (line 560-584)

**Update latency target**: <1 second (meets discovery requirement)
- File watch: ~200-500ms (filesystem event → JSON parse → panel refresh)
- Polling fallback: Up to 5s

**Alternatives considered**:
1. **Polling only** (5s interval)
   - Cons: Misses <1s latency requirement

2. **Event-only** (no polling)
   - Cons: Fragile if file watcher fails

3. **WebSocket/IPC** from Claude Code CLI
   - Cons: Requires CLI modifications (out of scope)

### Decision 4: Cost Calculation Accuracy

**Choice**: Use **existing pricing data** with quarterly update cadence

**Rationale**:
- Gofer already has pricing data in two locations:
  - `CostBudgetEnforcer.ts:16-20`
  - `UsageLogger.ts:70-74`
- Both use identical rates (consolidate into shared config)
- Pricing rarely changes (quarterly at most)
- Discovery requirement: "within 1% of actual provider bills"
- Current rates are accurate as of March 2026

**Pricing Data** (consolidated):
```typescript
export const AI_PROVIDER_PRICING: Record<string, { input: number; output: number }> = {
  anthropic: { input: 0.003, output: 0.015 }, // $3/M input, $15/M output
  google: { input: 0.00025, output: 0.0005 }, // $0.25/M input, $0.50/M output
  openai: { input: 0.005, output: 0.015 },    // $5/M input, $15/M output
};
```

**Maintenance approach**:
- Quarterly pricing review (update if provider rates change)
- Log warning if pricing data is >90 days old
- Future: Fetch live pricing from provider APIs (enhancement)

**Alternatives considered**:
1. **Fetch live pricing** from provider APIs
   - Pros: Always accurate
   - Cons: API calls increase latency, rate limits, requires auth
   - Verdict: Defer to future enhancement

2. **User-configurable pricing**
   - Pros: Custom rates for enterprise agreements
   - Cons: Added complexity, most users won't customize
   - Verdict: Not needed for MVP

## Constraints & Considerations

### Constraint 1: Claude Code CLI is External

**Impact**: We cannot modify Claude Code CLI to emit usage events
**Mitigation**: Read existing log files (`.specify/logs/council-usage.jsonl`) written by UsageLogger
**Limitation**: Only tracks Council mode usage (multi-provider LLM calls), not single-provider calls

**Workaround**: Enhance ContextUsageLogger to track all LLM calls (not just council):
- Add provider field to `ContextUsageLogEntry` (line 82-87)
- Log single-provider calls in addition to council calls
- Watch both `council-usage.jsonl` and `context-usage.jsonl`

### Constraint 2: Token Counts from CLI

**Impact**: Token counts come from Claude Code CLI response metadata (not guaranteed)
**Mitigation**:
- If token counts missing, estimate using tokenizer libraries:
  - Anthropic: `@anthropic-ai/tokenizer` (GitHub official)
  - OpenAI: `tiktoken` (OpenAI official)
  - Google: Character-based estimation (Gemini doesn't expose tokenizer)
- Log warning when using estimates vs actual counts

**Accuracy impact**: Estimates may differ by 5-10% from actual usage

### Constraint 3: Panel Replacement vs Addition

**Decision**: REPLACE ContextWindowProvider entirely (per user request)

**Impact**:
- Lose token category breakdown (CLAUDE.md, Auto Memory, Agents, etc.)
- Lose conversation history categorization
- Users who rely on CONTEXT WINDOW will lose functionality

**Mitigation Options**:
1. **Keep both panels** (Context Window + AI Usage)
   - Pros: No feature loss
   - Cons: Cluttered sidebar, user said "replace"

2. **Add AI Usage section inside Context Window**
   - Pros: Best of both worlds
   - Cons: Doesn't match user request ("replace")

3. **Replace with option to restore** (configuration setting)
   - Pros: User control
   - Cons: Additional config complexity

**Recommendation**: Discuss with user before implementation - replacing may cause workflow disruption

### Constraint 4: Session Detection

**Challenge**: Correlate LLM usage with user sessions (when did session start/end?)

**Current State**:
- MultiSessionBridgeWatcher tracks sessions via `.specify/hooks/context-bridge.json`
- Session detection is reliable (lines checked in HookBridgeWatcher.ts)

**Approach**:
- Use `sessionId` from BridgeData to group usage
- Display "Current Session" (active session from MultiSessionBridgeWatcher)
- Display historical sessions aggregated by date

### Constraint 5: Cost vs Budget

**Existing**: CostBudgetEnforcer tracks budget thresholds ($10 default)

**Integration**:
- Show budget progress in panel: "$2.45 / $10.00 (24%)"
- Color-code based on budget status (green/yellow/red)
- Reuse existing threshold logic (80% warning, 100% exceeded)

## Open Questions

- [x] **Should we replace or augment Context Window section?**
  - **Answer**: User request is clear ("replace"), but should confirm before removing existing functionality

- [x] **Do we need to track non-Council LLM calls?**
  - **Answer**: Yes - enhance ContextUsageLogger to track all LLM calls with provider field

- [x] **Should we add a status bar item in addition to panel?**
  - **Answer**: Yes - optional status bar showing current session total (pattern from ContextHealthStatusBar)

- [ ] **What time ranges to display?** (Current session, Today, This Week, This Month?)
  - **Recommendation**: Current Session + Today + This Week (3 levels), expandable to show provider breakdown

- [ ] **Should we support custom pricing for enterprise users?**
  - **Recommendation**: No for MVP - use fixed pricing, add config in future enhancement

## Recommendations

### Implementation Priority

**Phase 1: Core Panel (MVP)**
1. Create `AIUsageProvider` TreeDataProvider
2. Extend `CostBudgetEnforcer` to track per-provider breakdown
3. Read `UsageLogger.getUsageSummary()` for historical data
4. Replace ContextWindowProvider registration in package.json
5. Wire to MultiSessionBridgeWatcher for session detection

**Phase 2: Real-Time Updates**
1. Create `AIUsageMonitor` service (EventEmitter pattern)
2. Watch `.specify/logs/council-usage.jsonl` with FileSystemWatcher
3. Emit events on file change → `AIUsageProvider.refresh()`
4. Add periodic polling (5s) as fallback

**Phase 3: Enhanced Tracking**
1. Enhance `ContextUsageLogger` to log all LLM calls (not just council)
2. Add provider field to `ContextUsageLogEntry`
3. Consolidate pricing data into shared config (`config/pricing.ts`)
4. Add token estimation fallback (tiktoken, @anthropic-ai/tokenizer)

**Phase 4: Status Bar (Optional)**
1. Create `AIUsageStatusBar` (pattern from ContextHealthStatusBar)
2. Display current session total: "$(dollar) AI: $2.45"
3. Click to open panel or show QuickPick breakdown
4. Color-code based on budget status

**Phase 5: Polish**
1. Add budget progress bars to panel items
2. Add hover tooltips with detailed breakdowns
3. Add refresh button to panel toolbar
4. Add context menu items (copy cost, export data)

### Architecture Recommendation

**Service Layer**:
```
AIUsageMonitor (EventEmitter)
  ├─ reads UsageLogger.getUsageSummary()
  ├─ watches council-usage.jsonl (FileSystemWatcher)
  ├─ polls every 5s (fallback)
  ├─ integrates CostBudgetEnforcer.getSnapshot()
  └─ emits 'usage-update' events
```

**UI Layer**:
```
AIUsageProvider (TreeDataProvider)
  ├─ subscribes to AIUsageMonitor events
  ├─ builds tree: Current Session → Providers
  ├─ formats costs with icons and colors
  └─ fires onDidChangeTreeData on updates

AIUsageStatusBar (optional)
  ├─ subscribes to AIUsageMonitor events
  ├─ displays current session total
  └─ color-coded by budget status
```

**Data Flow**:
```
LLM Call (Claude Code CLI)
  → UsageLogger.appendUsageLog()
  → council-usage.jsonl updated
  → FileSystemWatcher fires
  → AIUsageMonitor.onFileChange()
  → AIUsageMonitor.emit('usage-update')
  → AIUsageProvider.refresh()
  → VSCode TreeView re-renders (<500ms total)
```

### User Confirmation Needed

Before proceeding to specification, confirm:

1. **Panel Replacement**: OK to completely remove Context Window section? (Users who rely on token category breakdown will lose functionality)
   - Alternative: Add AI Usage as a NEW section, keep Context Window

2. **Time Ranges**: Which time periods to display?
   - Recommendation: Current Session, Today, This Week

3. **Status Bar**: Add status bar item showing current session cost?
   - Recommendation: Yes, optional (can be disabled in config)

## Research Sources

**Codebase Analysis**:
- Status bar patterns: `extension/src/ui/ContextHealthStatusBar.ts`
- TreeView patterns: `extension/src/contextWindowProvider.ts`
- Cost tracking: `extension/src/autonomous/CostBudgetEnforcer.ts`
- Usage logging: `extension/src/council/UsageLogger.ts`
- Event monitoring: `extension/src/autonomous/ContextHealthMonitor.ts`
- File watching: `extension/src/autonomous/HookBridgeWatcher.ts`

**External Research**:
- [ai-sdk-cost-calculator on npm](https://www.npmjs.com/package/ai-sdk-cost-calculator) - Vercel AI SDK cost tracking
- [llm-token-tracker on GitHub](https://github.com/wn01011/llm-token-tracker) - OpenAI/Claude token tracking with MCP
- [tokentop on GitHub](https://github.com/tokentopapp/tokentop) - CLI tool for AI cost monitoring
- [Better Claude Code Usage (better-ccusage)](https://www.npmjs.com/package/better-ccusage) - CLI tool for analyzing Claude Code usage
- [AI SDK Cost Calculator Documentation](https://ai-sdk.dev) - Vercel AI SDK documentation
- [Track cost and usage - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/cost-tracking) - Official Anthropic cost tracking guidance

**Verdict on External Libraries**: Build custom integration using existing Gofer infrastructure rather than adding external dependencies. External libraries are designed for middleware/SDK integration, not VSCode extension usage tracking from external CLI tools.
