---
id: "025-ai-usage-tracking"
title: "AI Token Usage Tracking Panel"
status: "draft"
created: "2026-03-13T12:00:00Z"
updated: "2026-03-14"
priority: "medium"
assignee: "engineer-agent"
---

# AI Token Usage Tracking Panel

## Overview

The AI Token Usage Tracking Panel provides developers with real-time visibility into AI API costs and token usage across multiple providers (OpenAI, Anthropic, Google) directly within the VSCode Gofer sidebar. This feature replaces the existing CONTEXT WINDOW section with a comprehensive AI TOKEN USAGE panel that enables cost awareness and budget control during AI-assisted development sessions.

**Problem Addressed**: Developers using AI coding assistants lack visibility into their AI API costs across providers, making it difficult to manage budgets and understand spending patterns during development sessions.

**Target Users**: Developers using the Gofer extension for VSCode - intermediate to advanced developers familiar with AI coding assistants who need real-time cost awareness, multi-provider usage visibility, and budget management.

**Primary Value**: Cost awareness - Know exactly how much AI usage costs in real-time with <1 second update latency.

**Discovery Reference**: See `discovery.md` for full business context and problem validation.
**Research Reference**: See `research.md` for codebase analysis and integration points.

## User Stories

### US1: View Real-Time AI Costs (P1)

**As a** developer using AI coding assistants
**I want to** see real-time cost and token usage across all AI providers
**So that** I can stay aware of my AI spending and manage my budget during development sessions

**Acceptance Criteria**:
- [ ] Panel displays current session total cost in USD with <1 second update latency
- [ ] Panel shows cost breakdown by provider (Anthropic, OpenAI, Google)
- [ ] Panel shows token counts (input/output) for each provider
- [ ] Panel updates automatically when new AI API calls are made
- [ ] Cost calculations are accurate within 1% of actual provider bills

### US2: Monitor AI Usage Across Time Periods (P1)

**As a** developer tracking my AI spending
**I want to** view usage data across different time periods (current session, today, this week)
**So that** I can understand my usage patterns and identify cost trends

**Acceptance Criteria**:
- [ ] Panel displays "Current Session" usage with provider breakdown
- [ ] Panel displays "Today" aggregated usage across all sessions
- [ ] Panel displays "This Week" aggregated usage
- [ ] Each time period shows total cost and per-provider breakdown
- [ ] Time periods are expandable/collapsible to show provider details

### US3: Stay Within Budget Limits (P2)

**As a** developer with a budget for AI services
**I want to** see my current spending relative to my budget limit
**So that** I can avoid exceeding my budget and control costs proactively

**Acceptance Criteria**:
- [ ] Panel displays budget progress: "$2.45 / $10.00 (24%)"
- [ ] Budget status is color-coded (green: healthy, yellow: warning >80%, red: exceeded >100%)
- [ ] Budget integrates with existing CostBudgetEnforcer thresholds
- [ ] Budget warnings are visible in the panel interface

### US4: Quick Access to Session Costs (P2)

**As a** developer working in VSCode
**I want to** see current session cost in the status bar
**So that** I can monitor costs without opening the full panel

**Acceptance Criteria**:
- [ ] Optional status bar item shows: "$(dollar) AI: $2.45"
- [ ] Status bar updates in real-time (<1s latency)
- [ ] Status bar is color-coded based on budget status
- [ ] Clicking status bar opens the AI TOKEN USAGE panel or shows QuickPick breakdown
- [ ] Status bar can be enabled/disabled via configuration

## Functional Requirements

### FR1: Panel Registration and Display

**Description**: Replace the CONTEXT WINDOW panel with AI TOKEN USAGE panel in the Gofer sidebar.

**Details**:
- Panel appears in the Gofer sidebar container
- Panel icon: `$(pulse)` or `$(graph)`
- Panel title: "AI Token Usage"
- Replaces existing `goferContextWindow` view registration in package.json
- Uses TreeDataProvider architecture (VSCode native)

**Validation**: Panel is visible in Gofer sidebar and displays usage data when opened
**Integration**: `extension/package.json:284-287` (view registration), `extension/src/extension.ts:250-251` (provider registration)

### FR2: Real-Time Cost Tracking

**Description**: Track and display AI API costs across providers with <1 second update latency.

**Details**:
- Monitor `.specify/logs/council-usage.jsonl` for new usage entries
- Use FileSystemWatcher for immediate updates (<500ms latency)
- Fall back to 5-second polling if file watcher fails
- Calculate costs using existing pricing data from CostBudgetEnforcer
- Support providers: Anthropic, OpenAI, Google (extensible for future providers)

**Validation**: Panel updates within 1 second after AI API call is logged
**Integration**: `extension/src/council/UsageLogger.ts` (data source), `extension/src/autonomous/CostBudgetEnforcer.ts` (pricing data)

### FR3: Provider Breakdown Display

**Description**: Show cost and token usage breakdown by AI provider.

**Details**:
- Display per-provider costs: "Anthropic: $1.50 (50,000 tokens)"
- Show input/output token breakdown when expanded
- Use provider-specific icons (if available) or colored indicators
- Format costs with 2 decimal places: "$1.50"
- Format token counts with thousands separator: "50,000 tokens"

**Validation**: Provider breakdown matches UsageLogger.getUsageSummary() data
**Integration**: `extension/src/council/UsageLogger.ts:185-281` (provider aggregation)

### FR4: Time Period Aggregation

**Description**: Aggregate and display usage data across time periods.

**Details**:
- **Current Session**: Active session from MultiSessionBridgeWatcher
- **Today**: All sessions from start of day (00:00) to now
- **This Week**: All sessions from start of week (Monday 00:00) to now
- Each period displays: Total cost, provider breakdown (expandable), total tokens
- Use hierarchical TreeView structure: Period → Provider → Token Details

**Validation**: Time period aggregations match UsageLogger date filtering
**Integration**: `extension/src/autonomous/MultiSessionBridgeWatcher.ts` (session detection), `extension/src/council/UsageLogger.ts` (date filtering)

### FR5: Budget Integration

**Description**: Display budget progress and status using existing CostBudgetEnforcer.

**Details**:
- Show budget progress for current session: "$2.45 / $10.00 (24%)"
- Color-code based on CostBudgetEnforcer status:
  - Green (healthy): <80% of budget
  - Yellow (warning): 80-100% of budget
  - Red (exceeded): >100% of budget
- Use existing budget thresholds from configuration
- Display budget status in panel header or top-level item

**Validation**: Budget status matches CostBudgetEnforcer.getSnapshot()
**Integration**: `extension/src/autonomous/CostBudgetEnforcer.ts:95-105` (snapshot retrieval)

### FR6: Status Bar Item (Optional)

**Description**: Optional status bar item showing current session cost.

**Details**:
- Alignment: Left, Priority: 99 (next to ContextHealthStatusBar at 100)
- Text format: "$(dollar) AI: $2.45" or "$(graph) $2.45"
- Color-coded by budget status (green/yellow/red)
- Command on click: Show QuickPick with provider breakdown OR focus AI TOKEN USAGE panel
- Tooltip: "AI Usage: $2.45 / $10.00 (24%) - Click for details"
- Configuration: `gofer.aiUsage.statusBar.enabled` (default: true)

**Validation**: Status bar updates within 1s of usage changes, click opens panel or QuickPick
**Integration**: Follow `extension/src/ui/ContextHealthStatusBar.ts:123-185` pattern

### FR7: Cost Calculation Accuracy

**Description**: Calculate costs accurately within 1% of actual provider bills.

**Details**:
- Use existing pricing data from CostBudgetEnforcer/UsageLogger
- Rates (as of March 2026):
  - Anthropic: $3/M input, $15/M output
  - Google: $0.25/M input, $0.50/M output
  - OpenAI: $5/M input, $15/M output
- Consolidate pricing data into shared config (`config/pricing.ts`)
- Log warning if pricing data is >90 days old (needs review)
- Calculate: `cost = (inputTokens * inputRate + outputTokens * outputRate) / 1000`

**Validation**: Compare calculated costs against provider invoices for sample sessions
**Integration**: `extension/src/autonomous/CostBudgetEnforcer.ts:16-20`, `extension/src/council/UsageLogger.ts:70-74`

### FR8: Panel Refresh and Updates

**Description**: Automatic panel updates using event-driven architecture.

**Details**:
- AIUsageMonitor service emits 'usage-update' events
- AIUsageProvider subscribes to monitor events
- On event: Fire `onDidChangeTreeData` → VSCode re-renders TreeView
- Hybrid update mechanism:
  - Primary: FileSystemWatcher on council-usage.jsonl (<500ms)
  - Fallback: Periodic polling every 5s
- Guard against duplicate timers (memory leak prevention)

**Validation**: Panel refreshes within 1s when council-usage.jsonl is updated
**Integration**: Follow `extension/src/autonomous/ContextHealthMonitor.ts:560-584` (EventEmitter pattern), `extension/src/autonomous/HookBridgeWatcher.ts:76-150` (FileSystemWatcher pattern)

## Non-Functional Requirements

### Performance

- **Panel update latency**: <1 second from AI API call to panel display update
- **File watch latency**: <500ms from log file write to panel refresh event
- **Polling interval**: 5 seconds (fallback only when file watcher is inactive)
- **Tree rendering**: <100ms for typical session data (3 providers, 3 time periods)
- **Memory usage**: No memory leaks from timers/watchers (guard against duplicates)

### Security

- **Pricing data**: Stored in codebase, not fetched from external APIs (no API keys required)
- **Usage logs**: Read from local `.specify/logs/` directory (no network access)
- **Session correlation**: Use existing MultiSessionBridgeWatcher (no PII exposed)

### Compatibility

- **VSCode TreeDataProvider**: Use native VSCode TreeView (no WebView complexity)
- **Existing patterns**: Follow ContextWindowProvider architecture for consistency
- **Configuration**: Integrate with existing `gofer.*` configuration namespace
- **Extension lifecycle**: Proper disposal of watchers/timers on extension deactivate/reinitialize

### Maintainability

- **Pricing updates**: Quarterly review of provider pricing (update if rates change)
- **Provider extensibility**: Architecture supports adding new providers (e.g., Cohere, Replicate) without major refactoring
- **Consolidation**: Consolidate duplicate pricing data (CostBudgetEnforcer + UsageLogger) into shared config

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cost display latency** | <1 second | Time from AI API call logged to panel update rendered |
| **Provider coverage** | 3+ providers | Support Anthropic, OpenAI, Google at minimum |
| **Cost accuracy** | Within 1% | Compare calculated costs to actual provider invoices |
| **Update reliability** | >99% successful updates | File watch events trigger panel refresh without failures |
| **Memory stability** | No leaks | Extension can run for 24+ hours without timer/watcher accumulation |
| **User adoption** | 60%+ of Gofer users | Percentage of users who view AI Usage panel weekly (future telemetry) |

## Assumptions

1. **Log file availability**: UsageLogger writes to `.specify/logs/council-usage.jsonl` after each LLM call (validated in research)
2. **Session detection**: MultiSessionBridgeWatcher reliably tracks active sessions via `.specify/hooks/context-bridge.json`
3. **Token counts**: Claude Code CLI provides token counts in usage log entries (fallback: estimation if missing)
4. **Provider identification**: Usage log entries include provider ID (anthropic, openai, google)
5. **Pricing stability**: Provider pricing changes quarterly at most (historical observation)
6. **Panel replacement**: User confirms replacement of CONTEXT WINDOW panel (loses token category breakdown)
7. **FileSystemWatcher reliability**: VSCode FileSystemWatcher detects file changes with <500ms latency on supported platforms
8. **Time period precision**: Date/time filtering uses UTC timestamps from usage log entries

## Dependencies

### Internal Dependencies (Existing Gofer Components)

| Dependency | Location | Purpose |
|------------|----------|---------|
| **CostBudgetEnforcer** | `extension/src/autonomous/CostBudgetEnforcer.ts` | Reuse pricing data and budget thresholds |
| **UsageLogger** | `extension/src/council/UsageLogger.ts` | Read historical usage data, getUsageSummary() |
| **ContextUsageLogger** | `extension/src/autonomous/ContextUsageLogger.ts` | Extend to log all LLM calls (not just council) |
| **MultiSessionBridgeWatcher** | `extension/src/autonomous/MultiSessionBridgeWatcher.ts` | Detect active sessions for "Current Session" display |
| **StateManager** | `extension/src/services/StateManager.ts` | Store AIUsageProvider and AIUsageMonitor instances |
| **InitializationService** | `extension/src/services/InitializationService.ts` | Wire monitor to provider during workspace initialization |

### External Dependencies

None - Feature uses only existing Gofer infrastructure and VSCode APIs. No external npm packages required.

## Out of Scope

The following are explicitly NOT included in this feature:

1. **Live pricing API**: Fetching real-time pricing from provider APIs (future enhancement)
2. **Custom pricing**: User-configurable pricing rates (future enhancement)
3. **Historical charts**: Graphical visualization of cost trends over time (future enhancement)
4. **Cost alerts**: Proactive notifications when approaching budget limits (future enhancement)
5. **Provider-specific features**: Provider-specific pricing tiers, discounts, or enterprise agreements
6. **Non-Council tracking**: Tracking non-Council single-provider calls (defer to Phase 3 per research recommendations)
7. **Token estimation**: Estimating token counts when CLI doesn't provide them (defer to Phase 3)
8. **Export functionality**: Exporting usage data to CSV/Excel (future enhancement)
9. **Multi-workspace aggregation**: Aggregating costs across multiple VSCode workspaces
10. **CONTEXT WINDOW restoration**: Configuration to restore CONTEXT WINDOW panel after replacement

## Glossary

| Term | Definition |
|------|------------|
| **Provider** | AI service provider (Anthropic, OpenAI, Google) that provides LLM APIs |
| **Session** | A single Claude Code conversation session tracked by MultiSessionBridgeWatcher |
| **Token** | Unit of text processed by LLM (input tokens = prompt, output tokens = response) |
| **Cost** | Calculated USD cost based on token usage and provider pricing rates |
| **Time Period** | Aggregation window (Current Session, Today, This Week) for usage data |
| **Council Mode** | LLM Council feature using multiple providers for consensus (tracked by UsageLogger) |
| **TreeDataProvider** | VSCode API for hierarchical data display in sidebar panels |
| **FileSystemWatcher** | VSCode API for monitoring file changes in the workspace |
| **Budget** | Configurable spending limit tracked by CostBudgetEnforcer (default: $10.00) |
| **Usage Log** | JSONL file (`.specify/logs/council-usage.jsonl`) containing LLM usage records |

## Research Traceability

| Research Finding | Spec Section | Reference |
|------------------|--------------|-----------|
| CostBudgetEnforcer integration | Dependencies, FR5, FR7 | Internal Dependencies table, Budget Integration |
| UsageLogger.getUsageSummary() | Dependencies, FR3, FR4 | Provider Breakdown Display, Time Period Aggregation |
| TreeDataProvider pattern | FR1, NFR Compatibility | Panel Registration and Display |
| FileSystemWatcher for real-time | FR2, FR8, NFR Performance | Real-Time Cost Tracking, Panel Refresh |
| EventEmitter pattern | FR8 | Panel Refresh and Updates |
| Pricing data consolidation | FR7, NFR Maintainability | Cost Calculation Accuracy |
| MultiSessionBridgeWatcher integration | Dependencies, FR4 | Session detection for "Current Session" |
| Panel replacement constraint | Assumptions | Panel replacement confirmation required |
| <1s update latency requirement | Success Criteria, NFR Performance | From discovery metrics |
| 3+ provider support | Success Criteria, FR2 | From discovery provider coverage goal |
| 1% cost accuracy | Success Criteria, FR7 | From discovery cost accuracy target |
| Memory leak prevention | FR8, NFR Performance | Guard against duplicate timers |
| Hybrid update mechanism (watch + poll) | FR8, NFR Performance | File watch + 5s polling fallback |
| Status bar optional | FR6, US4 | Optional status bar item |
| Budget color-coding | FR5 | Green/yellow/red based on threshold |

## Implementation Notes

### Constraint: Claude Code CLI is External

The Gofer extension **cannot modify** Claude Code CLI to emit usage events. Instead:

- **Read existing logs**: Parse `.specify/logs/council-usage.jsonl` written by UsageLogger
- **Limitation**: Initially tracks only Council mode usage (multi-provider calls)
- **Future enhancement (Phase 3)**: Extend ContextUsageLogger to track all LLM calls with provider field

### Constraint: Panel Replacement Impact

Replacing CONTEXT WINDOW panel removes:
- Token category breakdown (CLAUDE.md, Auto Memory, Agents, Conversation History)
- System overhead visibility
- Spec artifacts tracking

**Mitigation**: Confirm with user before implementation. Alternative: Add AI Usage as NEW section alongside Context Window.

### Constraint: Token Count Availability

Token counts rely on Claude Code CLI response metadata:
- **If available**: Use actual token counts for accuracy
- **If missing**: Future enhancement (Phase 3) will add estimation using tokenizer libraries
- **Accuracy impact**: Estimates may differ by 5-10% from actual usage

### Architecture Alignment

This feature follows existing Gofer patterns:
- **TreeDataProvider**: Matches ContextWindowProvider, MemoryProvider architecture
- **EventEmitter service**: Matches ContextHealthMonitor pattern
- **FileSystemWatcher**: Matches HookBridgeWatcher pattern
- **Status bar**: Matches ContextHealthStatusBar pattern
- **Wiring**: Follows InitializationService component registration pattern
