---
feature: 026-provider-api-usage
spec: /Users/douglaswross/Code/eai-gofer/.specify/specs/026-provider-api-usage/spec.md
plan: /Users/douglaswross/Code/eai-gofer/.specify/specs/026-provider-api-usage/plan.md
status: implemented
implementedAt: 2026-03-15T18:59:44Z
implementedBy: Douglas Ross, Claude Sonnet 4.5
gitCommit: 72736b30a4dd348e3bd0db7b3f379affc5cc1965
tasksCompleted: 43/48 (89.6%)
created: 2026-03-15
total_tasks: 48
estimated_hours: 28
---

# Task Breakdown: Provider API Usage Tracking (Feature 026)

**Branch**: `026-provider-api-usage` | **Status**: Ready for implementation

## Overview

**Total Tasks**: 48 tasks across 6 phases **Parallel Opportunities**: 14 tasks
can run concurrently (marked with PARALLEL groups) **Critical Path**: Phase 1 →
Phase 2 (API Client) → Phase 3 (Integration) → Phase 4 (Wiring) → Phase 5 (Auto
Refresh) → Phase 6 (Testing)

**Coverage Summary**:

- User Stories: 5/5 (100% - US-1 through US-5)
- Functional Requirements: 25/25 (100% - FR-001 through FR-025)
- Success Criteria: 10/10 (100% - SC-001 through SC-010)
- Edge Cases: 9/9 (100%)

---

## Phase 1: Setup & Configuration (4 tasks, ~2 hours)

**Goal**: Add VSCode settings for admin API keys and define data source
abstraction interface.

**Dependencies**: None (can start immediately)

### Configuration Settings

- [x] **T001** [P2] [US-3] Add admin API key settings to
      `/Users/douglaswross/Code/eai-gofer/extension/package.json`
  - Add `gofer.anthropicAdminApiKey` setting (type: string, scope: resource,
    sensitive: true)
  - Add `gofer.openaiAdminApiKey` setting (type: string, scope: resource,
    sensitive: true)
  - Add `gofer.aiUsage.api.pollingInterval` setting (type: number, default:
    60000, min: 15000, max: 300000)
  - Group under "Gofer > AI Usage > API" configuration section
  - Add descriptions: "Admin API key for billing data access (Anthropic: starts
    with sk-ant-admin...)"
  - Traceability: FR-005, US-3 (AC 1,2), SC-004

### Type System Foundation

- [x] **T002** [P2] [US-3] Define `UsageDataSource` interface in
      `/Users/douglaswross/Code/eai-gofer/extension/src/types/aiUsage.ts`
  - Add interface with single method:
    `getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>`
  - Add JSDoc comment explaining purpose: "Abstraction for usage data sources
    (file-based or API-based)"
  - This enables transparent data source swapping in AIUsageMonitor
  - Traceability: Research finding #2 (Data Source Abstraction), ADR-026-001

- [x] **T003** [P3] Update UsageLogger to implement UsageDataSource interface in
      `/Users/douglaswross/Code/eai-gofer/extension/src/council/UsageLogger.ts`
  - Add `implements UsageDataSource` to class declaration
  - Verify `getUsageSummary()` method signature matches interface (no functional
    changes needed)
  - Add import for `UsageDataSource` from types/aiUsage
  - Confirms existing contract compatibility for backward compatibility
  - Traceability: Protected boundaries (UsageLogger must remain functional)

- [x] **T004** [P2] Create skeleton `UsageApiClient` class in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create new file with class declaration:
    `export class UsageApiClient implements UsageDataSource`
  - Add constructor accepting workspace path and admin key getter function
  - Implement placeholder `getUsageSummary()` returning empty `UsageSummary`
    object
  - Add imports: `UsageDataSource`, `UsageSummary` from types
  - Add TODO comments for Phase 2 implementation
  - Traceability: FR-001 through FR-004 (preparation)

**Phase 1 Acceptance**: Settings visible in VSCode UI, `UsageDataSource`
interface compiles, both `UsageLogger` and `UsageApiClient` implement interface
correctly.

---

## Phase 2: Foundational - API Client Implementation (12 tasks, ~8 hours)

**Goal**: Implement HTTP client for Anthropic and OpenAI billing APIs with full
error handling.

**Dependencies**: Phase 1 (T004 skeleton class must exist)

**PARALLEL GROUP A**: Anthropic API methods (T005, T006) can run concurrently
**PARALLEL GROUP B**: OpenAI API methods (T007, T008) can run concurrently
**PARALLEL GROUP C**: Transformation methods (T009, T010) can run concurrently

### Anthropic API Client (PARALLEL GROUP A)

- [x] **T005** [P1] [US-1] Implement Anthropic usage API client in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `fetchAnthropicUsage(fromDate: Date, toDate: Date): Promise<AnthropicUsageResponse>`
  - Use Node.js `https.request()` for
    `GET https://api.anthropic.com/v1/organizations/usage_report/messages`
  - Build query params: `starting_at` (ISO 8601), `ending_at`, `bucket_width`
    (1h for today, 1d for week), `group_by[]=model`
  - Add headers: `x-api-key: ${adminKey}`, `anthropic-version: 2023-06-01`,
    `User-Agent: gofer-extension/<version>`
  - Parse JSON response and validate schema (data array with buckets, tokens,
    model fields)
  - Add TypeScript interface definitions: `AnthropicUsageResponse`,
    `AnthropicUsageBucket`
  - Traceability: FR-001, FR-006, FR-007, FR-008, FR-010, FR-012, FR-013

- [x] **T006** [P1] [US-1] Implement Anthropic cost API client in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `fetchAnthropicCost(fromDate: Date, toDate: Date): Promise<AnthropicCostResponse>`
  - Use Node.js `https.request()` for
    `GET https://api.anthropic.com/v1/organizations/cost_report`
  - Build query params: `starting_at`, `ending_at`, `bucket_width: 1d`,
    `group_by[]=model`
  - Add same headers as T005 (x-api-key, anthropic-version, User-Agent)
  - Parse response: `{ data: [{ bucket, token_cost_usd_cents, model }] }`
  - Convert USD cents to dollars: `costUsd = token_cost_usd_cents / 100`
  - Add TypeScript interfaces: `AnthropicCostResponse`, `AnthropicCostBucket`
  - Traceability: FR-002, FR-012, FR-013

### OpenAI API Client (PARALLEL GROUP B)

- [x] **T007** [P1] [US-2] Implement OpenAI usage API client in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `fetchOpenAIUsage(fromDate: Date, toDate: Date): Promise<OpenAIUsageResponse>`
  - Use Node.js `https.request()` for
    `GET https://api.openai.com/v1/organization/usage/completions`
  - Build query params: `start_time` (Unix seconds), `end_time`, `bucket_width`
    (1h or 1d), `group_by: ["model"]`
  - Add header: `Authorization: Bearer ${adminKey}`,
    `User-Agent: gofer-extension/<version>`
  - Parse response:
    `{ data: [{ start_time, end_time, results: [{ model, input_tokens, output_tokens }] }] }`
  - Add TypeScript interfaces: `OpenAIUsageResponse`, `OpenAIUsageBucket`,
    `OpenAIUsageResult`
  - Traceability: FR-003, FR-006, FR-007, FR-009, FR-010, FR-014

- [x] **T008** [P1] [US-2] Implement OpenAI cost API client in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `fetchOpenAICost(fromDate: Date, toDate: Date): Promise<OpenAICostResponse>`
  - Use Node.js `https.request()` for
    `GET https://api.openai.com/v1/organization/costs`
  - Build query params: same as T007 (start_time, end_time, bucket_width,
    group_by)
  - Add header: `Authorization: Bearer ${adminKey}`, `User-Agent`
  - Parse response:
    `{ data: [{ results: [{ model, amount: { value, currency } }] }] }`
  - Handle non-USD currencies: log warning if `currency !== "usd"`, use value
    as-is
  - Add TypeScript interfaces: `OpenAICostResponse`, `OpenAICostBucket`,
    `OpenAICostResult`, `OpenAICostAmount`
  - Traceability: FR-004, FR-014

### Response Transformation (PARALLEL GROUP C)

- [x] **T009** [P1] [US-1] Implement Anthropic response transformation in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `transformAnthropicData(usageResp: AnthropicUsageResponse, costResp: AnthropicCostResponse): Partial<UsageSummary>`
  - Merge usage and cost data by model and time bucket
  - Calculate totals: `totalInputTokens`, `totalOutputTokens`, `totalCostUsd`
  - Build `byProvider` map with single entry:
    `{ anthropic: { tokens, costUsd, sessions: 1 } }`
  - Handle cache tokens separately: aggregate `cache_creation_input_tokens` and
    `cached_input_tokens` (FR-025)
  - Sum all buckets to get period totals
  - Set `fromDate` and `toDate` from query parameters
  - Traceability: FR-011, FR-025

- [x] **T010** [P1] [US-2] Implement OpenAI response transformation in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `transformOpenAIData(usageResp: OpenAIUsageResponse, costResp: OpenAICostResponse): Partial<UsageSummary>`
  - Merge usage and cost data by model across all buckets
  - Calculate totals: `totalInputTokens`, `totalOutputTokens`, `totalCostUsd`
  - Build `byProvider` map with single entry:
    `{ openai: { tokens, costUsd, sessions: 1 } }`
  - Match data structure exactly to Anthropic output for consistency
  - Handle empty `results` arrays gracefully (no usage = zero totals)
  - Traceability: FR-011

### Orchestration & Error Handling

- [x] **T011** [P1] [US-1,US-2] Implement `getUsageSummary()` orchestration in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Read admin API keys from VSCode config:
    `vscode.workspace.getConfiguration('gofer')`
  - Validate key formats: Anthropic starts with `sk-ant-admin`, OpenAI follows
    admin key pattern (FR-005)
  - For each provider with valid admin key: fetch usage + cost in parallel using
    `Promise.all()`
  - Transform responses to partial `UsageSummary` objects using T009/T010
    methods
  - Merge all provider summaries: combine `byProvider` maps, sum totals
  - Return complete `UsageSummary` with all providers aggregated
  - Set default values for fields not available from API: `totalSessions: 1`,
    `councilSessions: 0`, `avgDurationMs: 0`, `byStage: {}`
  - Traceability: FR-005, FR-011, FR-017

- [x] **T012** [P1] Add timeout and error handling to all HTTP requests in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Wrap all `https.request()` calls with 10-second timeout (NFR-003)
  - Catch network errors, parse errors, HTTP 4xx/5xx status codes
  - Log errors with context (endpoint, method, status code, error message)
    without exposing API keys (FR-024)
  - For transient errors (5xx, timeout, network): throw error with
    `isRetryable: true` flag
  - For auth errors (401, 403): throw `AuthenticationError` with actionable
    message and `isRetryable: false`
  - For parse errors: throw `ValidationError` with schema details
  - Add error type definitions: `ProviderApiError` interface with fields
    (provider, statusCode, message, timestamp, isRetryable)
  - Traceability: FR-024, NFR-003

- [x] **T013** [P2] [US-4] Add error metadata fields to UsageSummary interface
      in `/Users/douglaswross/Code/eai-gofer/extension/src/types/aiUsage.ts`
  - Add optional field:
    `error?: 'admin_key_required' | 'not_configured' | 'api_not_available' | 'api_error'`
  - Add optional field: `errorMessage?: string` for detailed descriptions
  - Add optional field: `lastUpdated?: number` (Unix timestamp) for cache
    timestamp display
  - AIUsageProvider will use these fields to show appropriate error messages in
    UI
  - Maintain backward compatibility: all error fields are optional
  - Traceability: FR-017, FR-018, NFR-007

- [x] **T014** [P1] Implement retry logic with exponential backoff in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create private method:
    `retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts: number): Promise<T>`
  - Backoff schedule: 2s, 4s, 8s between retries (max 3 attempts) (FR-022)
  - Only retry transient errors (5xx, timeout, network), not auth errors (4xx)
  - Add jitter: ±10% random variance to prevent thundering herd
  - Log each retry attempt with attempt number and next retry delay
  - After max failures, throw last error with all attempt details
  - Traceability: FR-022, SC-006

- [x] **T015** [P1] [US-4] Implement last-known-good cache in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Add private field:
    `cache: Map<string, { summary: UsageSummary; timestamp: number }>`
  - On successful API call: store response in cache keyed by provider ID
  - On API failure: return cached response if available (up to 10 minutes old) +
    set error metadata
  - If cache is stale (>10 min) and API fails: return empty summary + error
    metadata
  - Add cache entry timestamp to `UsageSummary.lastUpdated` field
  - Clear provider cache entry on auth errors (401/403)
  - Traceability: FR-023, Edge case: API data delay

- [x] **T016** [P2] Add date/time utility helpers in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create helper: `toISO8601(date: Date): string` for Anthropic timestamps
    (FR-008)
  - Create helper: `toUnixSeconds(date: Date): number` for OpenAI timestamps
    (FR-009)
  - Create helper: `getBucketWidth(period: 'today' | 'week'): '1h' | '1d'`
    (FR-006, FR-007)
  - Create helper:
    `calculatePeriodDates(period: string): { fromDate: Date; toDate: Date }`
  - Add unit tests for date conversion edge cases (timezone handling, daylight
    saving)
  - Traceability: FR-006, FR-007, FR-008, FR-009

**Phase 2 Acceptance**: `UsageApiClient.getUsageSummary()` returns valid
`UsageSummary` when called with admin keys, throws typed errors on invalid keys
or network failures, caches responses correctly.

---

## Phase 3: Business Logic - AIUsageMonitor Integration (7 tasks, ~6 hours)

**Goal**: Refactor AIUsageMonitor to use UsageApiClient, implement fallback
strategy, add config change detection.

**Dependencies**: Phase 2 (UsageApiClient must be fully implemented)

### Core Integration

- [x] **T017** [P1] [US-1,US-2] Refactor AIUsageMonitor constructor in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/AIUsageMonitor.ts`
  - Change constructor parameter from `usageLogger: UsageLogger` to
    `dataSource: UsageDataSource`
  - Update private field: `private dataSource: UsageDataSource` (rename from
    `usageLogger`)
  - Update `fetchUsageData()` method: call `this.dataSource.getUsageSummary()`
    instead of `this.usageLogger.getUsageSummary()`
  - Update all references to `usageLogger` → `dataSource` throughout the class
  - Keep all other logic unchanged (caching, event emission, period calculation)
  - Add import for `UsageDataSource` interface
  - Traceability: Research finding #2 (Data Source Abstraction), ADR-026-001

### Graceful Degradation

- [x] **T018** [P2] [US-4] Implement three-tier fallback in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - In `getUsageSummary()`, check admin key availability before API calls
  - Tier 1: Admin key configured → call billing API (already implemented in
    Phase 2)
  - Tier 2: No admin key + regular API key exists → return empty `UsageSummary`
    with `error: 'admin_key_required'`,
    `errorMessage: 'Configure admin API key in settings to view billing data'`
  - Tier 3: No keys configured → return empty `UsageSummary` with
    `error: 'not_configured'`, `errorMessage: 'Configure API keys in settings'`
  - For Google provider: always return `error: 'api_not_available'`,
    `errorMessage: 'Google billing API not available'`
  - Each provider degrades independently (partial config supported)
  - Traceability: FR-017, FR-018, US-4 (graceful degradation)

- [x] **T019** [P2] [US-4] Update AIUsageProvider to display error metadata in
      `/Users/douglaswross/Code/eai-gofer/extension/src/ui/AIUsageProvider.ts`
  - Check `UsageSummary.error` field when rendering tree items
  - If `error === 'admin_key_required'`: show TreeItem with label "Admin API key
    required" + description from `errorMessage`
  - If `error === 'not_configured'`: show TreeItem with label "Not configured" +
    link to settings
  - If `error === 'api_not_available'`: show TreeItem with label "Billing API
    not available"
  - If `error === 'api_error'`: show TreeItem with last known data + error
    banner
  - Add command links: "Open Settings" → `workbench.action.openSettings`
  - Traceability: FR-017, FR-018, NFR-007

### Configuration & Polling

- [x] **T020** [P1] [US-5] Update polling interval for API calls in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/AIUsageMonitor.ts`
  - In `setupPolling()` method, detect data source type:
    `if (this.dataSource instanceof UsageApiClient)`
  - If API client: use `gofer.aiUsage.api.pollingInterval` setting (default
    60000ms) instead of file polling interval
  - If not API client (UsageLogger): continue using existing
    `gofer.aiUsage.polling.interval` (default 5000ms)
  - Skip polling entirely if no admin keys configured (check via callback to
    UsageApiClient)
  - Resume polling when configuration changes to add admin keys
  - Traceability: FR-015, FR-016, FR-019, US-5

- [x] **T021** [P1] [US-5] Add configuration change detection in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/AIUsageMonitor.ts`
  - Subscribe to `vscode.workspace.onDidChangeConfiguration` in constructor
  - Filter for changes to `gofer.anthropicAdminApiKey` or
    `gofer.openaiAdminApiKey` settings
  - On change detected: clear cache, call `forceRefresh()` method
  - Ensure refresh happens within 5 seconds of config change (SC-009)
  - Debounce rapid config changes (wait 1 second after last change before
    refreshing)
  - Add config listener to disposables for proper cleanup
  - Traceability: FR-019, SC-009

- [x] **T022** [P3] Add visibility-based polling optimization in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/AIUsageMonitor.ts`
  - Track panel visibility state (when AIUsageProvider tree view is visible)
  - If panel not visible for >10 minutes: pause polling, mark as "idle"
  - On panel visible event: resume polling immediately if idle
  - Use `vscode.window.onDidChangeWindowState` to detect visibility
  - Reduces unnecessary API calls when user not viewing panel
  - Traceability: US-5 (AC 3), NFR-002

- [x] **T023** [P2] Add response validation in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Create validation function:
    `validateUsageSummary(summary: UsageSummary): boolean`
  - Check required fields are present: `totalInputTokens`, `totalOutputTokens`,
    `totalCostUsd`
  - Validate data types: tokens are non-negative integers, costs are
    non-negative floats
  - Validate date ranges: `fromDate < toDate`
  - On validation failure: log detailed error, return cached summary if
    available
  - Prevents corrupt API responses from breaking UI
  - Traceability: NFR-008

**Phase 3 Acceptance**: AIUsageMonitor works with both `UsageApiClient` and
`UsageLogger` data sources, gracefully handles missing keys and API errors,
polls at correct intervals, detects config changes within 5 seconds.

---

## Phase 4: Integration & Wiring (7 tasks, ~4 hours)

**Goal**: Wire UsageApiClient into extension.ts, validate end-to-end flow,
handle edge cases.

**Dependencies**: Phase 3 (AIUsageMonitor refactor must be complete)

### Extension Wiring

- [x] **T024** [P1] [US-1,US-2] Create UsageApiClient factory function in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Add export:
    `export function getUsageApiClient(workspacePath: string): UsageApiClient`
  - Factory reads admin keys from VSCode config and instantiates client
  - Singleton pattern: store instance in module-level Map keyed by workspace
    path, return same instance per workspace
  - Add disposal method: `disposeAll(): void` to clear all singletons
  - Follow existing pattern from `getUsageLogger()` factory in UsageLogger.ts
  - Traceability: Pattern matching existing ProviderFactory patterns

- [x] **T025** [P1] [US-1,US-2] Wire UsageApiClient in extension.ts at lines
      538-565 in `/Users/douglaswross/Code/eai-gofer/extension/src/extension.ts`
  - Import `getUsageApiClient` function
  - In `initializeForWorkspace()`, replace `getUsageLogger(workspacePath)` call
    with `getUsageApiClient(workspacePath)`
  - Pass `UsageApiClient` instance to `AIUsageMonitor` constructor
  - Keep `getUsageLogger()` available for council logging (do NOT delete)
  - Update comments to clarify roles: "UsageApiClient for billing APIs,
    UsageLogger for council session logs"
  - Traceability: Research integration point #3

- [x] **T026** [P2] Add feature flag for rollback safety in
      `/Users/douglaswross/Code/eai-gofer/extension/package.json` and
      `/Users/douglaswross/Code/eai-gofer/extension/src/extension.ts`
  - Add setting: `gofer.aiUsage.useApiClient` (type: boolean, default: true,
    description: "Use billing API client for usage data (set to false to revert
    to local JSONL)")
  - In extension.ts wiring: check flag before instantiation
  - If `config.get('aiUsage.useApiClient') === true`: use `UsageApiClient`
  - If `config.get('aiUsage.useApiClient') === false`: use `UsageLogger`
    (fallback to file-based)
  - Allows instant rollback if API integration has issues in production
  - Document in CHANGELOG: "Set `gofer.aiUsage.useApiClient: false` to revert to
    local JSONL data source"
  - Traceability: NFR-007 (actionable error recovery)

### Edge Cases & Validation

- [x] **T027** [P2] Handle missing workspace path edge case in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - In `getUsageApiClient()` factory, validate `workspacePath` is not
    empty/undefined
  - If missing: log error "Cannot initialize UsageApiClient without workspace
    path"
  - Return no-op client instance that always returns empty `UsageSummary` with
    `error: 'not_configured'`
  - Prevents crashes when extension activates without workspace (rare but
    possible)
  - Traceability: Edge case: extension without workspace

- [x] **T028** [P2] [US-3] Add admin key validation on startup in
      `/Users/douglaswross/Code/eai-gofer/extension/src/extension.ts`
  - After wiring UsageApiClient (T025), read admin keys from config
  - For Anthropic: if key exists but doesn't start with `sk-ant-admin`, log
    warning: "Invalid Anthropic admin key format (must start with sk-ant-admin)"
  - For OpenAI: if key exists but format looks incorrect, log warning with
    format requirements
  - Don't block startup, just warn in output channel
  - Add link to documentation in warning message
  - Traceability: FR-005, Open question: admin key validation

- [x] **T029** [P1] Add disposal cleanup in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Implement `dispose()` method in UsageApiClient class
  - Clear cache: `this.cache.clear()`
  - Abort pending HTTP requests (store request handles in private field)
  - Clear any active timers (polling, retry timers)
  - Mark instance as disposed to prevent further API calls
  - In factory `disposeAll()`: call `dispose()` on all singleton instances,
    clear Map
  - Traceability: Memory leak prevention (MEMORY.md critical learnings)

- [x] **T030** [P1] Register UsageApiClient for disposal in
      `/Users/douglaswross/Code/eai-gofer/extension/src/extension.ts`
  - Ensure UsageApiClient instance is added to `context.subscriptions` array
  - Wrap factory result in Disposable:
    `context.subscriptions.push({ dispose: () => disposeAll() })`
  - Test deactivation: call `deactivate()` and verify no hanging timers or
    network requests
  - Verify via process inspection: `lsof` (macOS/Linux) or `netstat` (Windows)
  - Traceability: Memory leak prevention, NFR-006

**Phase 4 Acceptance**: Extension activates with UsageApiClient, panel shows
data or appropriate fallback messages, no crashes or memory leaks, rollback flag
works, disposal cleanup verified.

---

## Phase 5: Auto Refresh & Polish (6 tasks, ~3 hours)

**Goal**: Finalize auto-refresh behavior, visibility optimization, and
production readiness.

**Dependencies**: Phase 4 (full integration must be working)

### Auto Refresh Features

- [x] **T031** [P3] [US-5] Implement idle detection and immediate refresh in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/AIUsageMonitor.ts`
  - Track last API call timestamp in private field
  - When panel becomes visible after idle (>10 min since last call): trigger
    immediate `forceRefresh()`
  - Don't wait for next polling interval, fetch immediately
  - Log: "Panel visible after idle, triggering immediate refresh"
  - Traceability: US-5 (AC 3)

- [x] **T032** [P3] [US-5] Add panel visibility tracking in
      `/Users/douglaswross/Code/eai-gofer/extension/src/ui/AIUsageProvider.ts`
  - Subscribe to tree view `onDidChangeVisibility` event
  - Emit custom event: `panel-visibility-changed` with `{ visible: boolean }`
    payload
  - AIUsageMonitor listens to this event and adjusts polling accordingly
  - Visibility state persists across VSCode window focus changes
  - Traceability: US-5 (AC 2 - polling stops when not visible)

- [x] **T033** [P2] Add network connectivity detection in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Before API calls, check if `https` module can resolve DNS for
    api.anthropic.com and api.openai.com
  - If DNS resolution fails: skip API call, return cached data +
    `error: 'network_unavailable'`
  - Log: "Network connectivity check failed, using cached data"
  - Prevents timeout delays when network is down
  - Traceability: NFR-003 (timeout optimization)

### Production Polish

- [x] **T034** [P2] Add cache token cost rates to pricing.ts (conditional) in
      `/Users/douglaswross/Code/eai-gofer/extension/src/config/pricing.ts`
  - Review Anthropic cache token pricing documentation
  - If cache token rates differ from input token rates: add separate entries to
    `COST_PER_1K_TOKENS`
  - Add fields: `cache_creation` and `cached_read` rates per model
  - If cache pricing matches input pricing: document in comment "Cache tokens
    billed at input token rate" and skip separate entries
  - Update `calculateCost()` function to accept cache token parameters if needed
  - Traceability: FR-025

- [x] **T035** [P2] Add telemetry for API usage patterns in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Log successful API calls: provider, endpoint, duration, response size
  - Log API failures: provider, endpoint, error type, retry count
  - Track cache hit rate: successful cache returns vs API calls
  - Aggregate metrics: calls per hour, average latency, error rate
  - Use structured logging format for future analysis
  - Do NOT log API keys or sensitive data
  - Traceability: NFR-007 (actionable insights)

- [x] **T036** [P3] Add rate limit handling headers in
      `/Users/douglaswross/Code/eai-gofer/extension/src/autonomous/UsageApiClient.ts`
  - Parse response headers from both providers: `Retry-After`,
    `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - If rate limit headers present: log current usage rate and reset time
  - Adjust next polling interval dynamically based on rate limit headroom
  - If `X-RateLimit-Remaining < 5`: increase polling interval to 2x current
  - Resume normal interval when rate limit resets
  - Traceability: FR-022 (smart backoff)

**Phase 5 Acceptance**: Auto-refresh works immediately after idle period,
visibility optimization reduces unnecessary calls, network detection prevents
timeouts, production telemetry in place.

---

## Phase 6: Testing & Documentation (12 tasks, ~8 hours)

**Goal**: Comprehensive tests, edge case handling, documentation updates,
validation against spec.

**Dependencies**: Phase 5 (all features must be implemented)

**PARALLEL GROUP D**: Unit tests (T037, T038) can run concurrently **PARALLEL
GROUP E**: Integration tests (T039, T040) can run concurrently

### Unit Tests (PARALLEL GROUP D)

- [x] **T037** [P1] Write unit tests for UsageApiClient in
      `/Users/douglaswross/Code/eai-gofer/tests/unit/autonomous/UsageApiClient.test.ts`
  - Mock `https.request()` to return fake Anthropic and OpenAI responses
  - Test: valid admin keys → returns UsageSummary with correct totals
  - Test: invalid admin key format → throws validation error before API call
  - Test: network timeout → throws error after 10 seconds (NFR-003)
  - Test: malformed JSON response → throws parse error
  - Test: 5xx error → retries 3 times with exponential backoff (FR-022)
  - Test: 401/403 error → does NOT retry, throws AuthenticationError
  - Test: response transformation → correct UsageSummary structure (FR-011)
  - Test: cache token aggregation → separate `cache_creation` and `cached_input`
    (FR-025)
  - Test: empty API response → returns empty UsageSummary (not error)
  - Traceability: FR-001 through FR-025, NFR-003

- [x] **T038** [P1] Write unit tests for AIUsageMonitor changes in
      `/Users/douglaswross/Code/eai-gofer/tests/unit/autonomous/AIUsageMonitor.test.ts`
  - Mock `UsageDataSource` interface to return fake data
  - Test: constructor accepts UsageDataSource instead of UsageLogger
  - Test: `fetchUsageData()` calls `dataSource.getUsageSummary()` with correct
    date range
  - Test: configuration change triggers refresh within 5 seconds (SC-009)
  - Test: polling interval uses API config setting (60s) when UsageApiClient is
    data source
  - Test: polling interval uses file config setting (5s) when UsageLogger is
    data source
  - Test: error metadata is preserved in UsageSummary and emitted in
    `usage-update` events
  - Test: panel visibility change stops/resumes polling
  - Traceability: Phase 3 tasks (T017-T023)

### Integration Tests (PARALLEL GROUP E)

- [x] **T039** [P1] Write integration tests with mocked HTTPS in
      `/Users/douglaswross/Code/eai-gofer/tests/integration/providerBilling.test.ts`
  - Mock Anthropic and OpenAI API endpoints using Node.js `http.createServer()`
    or nock library
  - Test: full flow from AIUsageMonitor → UsageApiClient → API call → UI update
    event
  - Test: retry logic with transient errors (503 → 503 → 200)
  - Test: fallback to cache when API is down (return cached data + error
    metadata)
  - Test: three-tier fallback (admin key → admin required → not configured)
  - Test: dual provider configuration (both Anthropic and OpenAI admin keys)
  - Test: partial configuration (only Anthropic admin key, OpenAI shows
    "configure" message)
  - Test: Google provider always shows "API not available"
  - Traceability: US-1, US-2, US-4

- [x] **T040** [P2] Write edge case integration tests in
      `/Users/douglaswross/Code/eai-gofer/tests/integration/providerBilling.test.ts`
  - Test: billing period rollover → empty buckets show "$0.00 (no usage yet
    today)"
  - Test: organization with no usage → panel shows "No usage in this period"
    (not error)
  - Test: admin key revoked mid-session → 401 error, stop polling, show
    "Authentication failed"
  - Test: API returns unexpected response format → validation fails, show cached
    data + error
  - Test: multiple VSCode windows → each polls independently (stateless API
    calls)
  - Test: provider API is down → exponential backoff (2s, 4s, 8s), show "Service
    unavailable" after 3 failures
  - Test: date range edge cases (DST transitions, leap seconds, timezone
    boundaries)
  - Traceability: Edge cases section in spec

### Manual Testing & Documentation

- [x] **T041** [P3] Manual testing checklist execution
  - [ ] Install extension in fresh VSCode window
  - [ ] Configure Anthropic admin key only → verify Anthropic data shows, OpenAI
        shows "Configure admin key"
  - [ ] Add OpenAI admin key → verify both providers show data
  - [ ] Remove Anthropic admin key → verify Anthropic switches to "Admin key
        required" message
  - [ ] Invalid admin key format → verify warning in output channel
  - [ ] Network disconnected → verify "Service unavailable" after retries
  - [ ] Switch active provider in council → verify billing panel unaffected
        (independent data sources)
  - [ ] Change admin key value → verify refresh within 5 seconds
  - [ ] Multiple VSCode windows → verify independent polling (no state leaks)
  - [ ] Rollback flag test: set `gofer.aiUsage.useApiClient: false` → verify
        panel switches to JSONL data
  - Traceability: Manual testing checklist from plan.md

- [x] **T042** [P2] Update CHANGELOG.md in
      `/Users/douglaswross/Code/eai-gofer/extension/CHANGELOG.md`
  - Add section: "## [1.X.0] - Feature: Provider API Usage Tracking (Feature
    026)"
  - List: "AI Usage panel now shows real billing data from Anthropic and OpenAI
    APIs"
  - List: "Configure admin API keys in settings: `gofer.anthropicAdminApiKey`,
    `gofer.openaiAdminApiKey`"
  - List: "Configurable API polling interval (default 60s):
    `gofer.aiUsage.api.pollingInterval`"
  - List: "Graceful degradation when admin keys not configured"
  - List: "Rollback flag: `gofer.aiUsage.useApiClient: false` to revert to local
    JSONL data"
  - Add "Breaking Changes" section: None (backward compatible)
  - Traceability: Documentation requirement

- [x] **T043** [P2] Create quickstart guide in
      `/Users/douglaswross/Code/eai-gofer/.specify/specs/026-provider-api-usage/quickstart.md`
  - Step 1: Obtain admin API keys from Anthropic Console (Console > API Keys >
    Create Admin Key)
  - Step 2: Obtain admin API keys from OpenAI Platform (Platform > API Keys >
    Create with billing scope)
  - Step 3: Add keys to VSCode settings (Settings > Gofer > AI Usage > Admin API
    Keys)
  - Step 4: Open AI Usage panel (View > Open View > Gofer: AI Token Usage)
  - Step 5: Verify data appears within 60 seconds
  - Troubleshooting section: Invalid key format, API errors, no data, rate
    limiting
  - Screenshots: Settings UI, AI Usage panel with real data
  - Traceability: US-3 (clear setup instructions)

- [x] **T044** [P1] Validate spec traceability matrix
  - Review all 5 user stories: verify each acceptance criterion has task
    coverage
  - Review all 25 FRs: verify each has implementation task + test task
  - Review all 10 success criteria: verify measurable tests exist (unit or
    integration)
  - Create traceability CSV:
    `[Requirement ID] | [Task IDs] | [Test IDs] | [Status]`
  - Identify gaps and create follow-up tasks if needed
  - Target: 100% traceability coverage
  - Traceability: Quality gate for feature completion

### Performance & Validation

- [x] **T045** [P1] Performance validation tests in
      `/Users/douglaswross/Code/eai-gofer/tests/integration/providerBilling.test.ts`
  - Test: initial panel load time with admin keys configured (measure from panel
    open to data render)
  - Target: < 5 seconds (stretch: < 2 seconds) (SC-003)
  - Test: memory footprint increase after UsageApiClient instantiation (measure
    heap size before/after)
  - Target: < 5MB increase (SC-010)
  - Test: API polling doesn't block UI thread (verify no frame drops during
    polling cycle)
  - Test: disposal cleanup (verify no hanging timers after `dispose()` call)
  - Use Node.js performance hooks and memory profiler
  - Traceability: NFR-001, NFR-002, NFR-006, SC-003, SC-010

- [x] **T046** [P2] Add response schema validation tests in
      `/Users/douglaswross/Code/eai-gofer/tests/unit/autonomous/UsageApiClient.test.ts`
  - Test: Anthropic usage response missing `data` field → throws validation
    error
  - Test: Anthropic usage bucket missing `input_tokens` field → throws
    validation error
  - Test: OpenAI cost response with non-USD currency → logs warning, uses value
    as-is
  - Test: Negative token counts in response → clamped to 0
  - Test: Invalid ISO 8601 timestamp → rejects bucket
  - Test: Invalid Unix timestamp → rejects bucket
  - Traceability: NFR-008

- [x] **T047** [P2] Add settings validation tests in
      `/Users/douglaswross/Code/eai-gofer/tests/unit/extension/Config.test.ts`
  - Test: `gofer.aiUsage.api.pollingInterval` out of range → clamped to min/max
    (15000-300000)
  - Test: `gofer.anthropicAdminApiKey` with invalid format → validation warning
    logged
  - Test: `gofer.aiUsage.useApiClient` toggle → switches data source correctly
  - Test: config change detection debounce → only triggers one refresh for rapid
    changes
  - Traceability: FR-019, SC-004

- [x] **T048** [P2] Add end-to-end smoke test in
      `/Users/douglaswross/Code/eai-gofer/tests/e2e/usagePanel.test.ts`
  - Test: activate extension → wire UsageApiClient → open AI Usage panel →
    verify panel renders
  - Test: configure admin keys → verify API calls made within 60 seconds
  - Test: API returns data → verify panel updates with provider breakdown
  - Test: remove admin keys → verify panel switches to fallback messages
  - Use VSCode extension testing framework (vscode-test)
  - Traceability: SC-001, SC-002, SC-008

**Phase 6 Acceptance**: All tests pass (unit, integration, e2e), edge cases
handled, performance targets met, 100% spec traceability, documentation
complete, manual testing passed.

---

## Protected Files - DO NOT MODIFY

The following files MUST NOT be changed to maintain system stability:

### UI Components (Zero Changes Required)

- `/Users/douglaswross/Code/eai-gofer/extension/src/ui/AIUsageProvider.ts` —
  TreeView data provider (only modify for error display in T019)
- `/Users/douglaswross/Code/eai-gofer/extension/src/ui/AIUsageStatusBar.ts` —
  Status bar item (no changes)

### Council Infrastructure (Preserve Existing)

- `/Users/douglaswross/Code/eai-gofer/extension/src/council/UsageLogger.ts` —
  Keep unchanged except T003 (add interface)
- `/Users/douglaswross/Code/eai-gofer/extension/src/council/CouncilOrchestrator.ts`
  — No changes
- `/Users/douglaswross/Code/eai-gofer/council-usage.jsonl` — Keep as
  supplementary data source

### Provider SDKs (No Direct Modification)

- `node_modules/@anthropic-ai/sdk/**` — Don't modify package
- `node_modules/openai/**` — Don't modify package

### Configuration (Additive Only)

- Existing API key settings (`gofer.anthropicApiKey`, `gofer.openaiApiKey`) —
  Don't rename or remove
- Existing polling settings (`gofer.aiUsage.pollingInterval`) — Don't change
  behavior for file-based polling

---

## Parallel Execution Guide

### Parallel Opportunities (14 tasks can run concurrently in groups)

**PARALLEL GROUP A** (Phase 2): T005, T006 (Anthropic API methods)

- Both methods are independent
- Can be implemented by different developers
- Merge coordination: shared TypeScript interfaces

**PARALLEL GROUP B** (Phase 2): T007, T008 (OpenAI API methods)

- Both methods are independent
- Can be implemented by different developers
- Merge coordination: shared TypeScript interfaces

**PARALLEL GROUP C** (Phase 2): T009, T010 (Transformation methods)

- Both transformations are independent
- Can be implemented after PARALLEL GROUP A/B complete
- Merge coordination: ensure consistent `UsageSummary` shape

**PARALLEL GROUP D** (Phase 6): T037, T038 (Unit tests)

- Both test suites are independent
- Can be implemented by different developers
- Merge coordination: shared test fixtures

**PARALLEL GROUP E** (Phase 6): T039, T040 (Integration tests)

- Both test suites use same mock infrastructure
- Can be implemented in parallel with careful merge
- Merge coordination: shared mock server setup

### Critical Path (Sequential Dependencies)

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Within phases:

- Phase 1: All tasks sequential (T001 → T002 → T003 → T004)
- Phase 2: T005/T006 parallel, T007/T008 parallel, T009/T010 parallel, then
  T011-T016 sequential
- Phase 3: All tasks sequential (T017 → T018 → T019 → T020 → T021 → T022 → T023)
- Phase 4: All tasks sequential (T024 → T025 → T026 → T027 → T028 → T029 → T030)
- Phase 5: All tasks sequential (T031 → T032 → T033 → T034 → T035 → T036)
- Phase 6: T037/T038 parallel, T039/T040 parallel, then T041-T048 sequential

### Estimated Time Savings with Parallelization

- Sequential execution: 28 hours
- Parallel execution (with 2 developers): ~22 hours (21% reduction)
- Parallel execution (with 3 developers): ~19 hours (32% reduction)

---

## Task Summary by Phase

| Phase                 | Tasks  | Hours  | Parallel Opportunities     | Key Deliverables                            |
| --------------------- | ------ | ------ | -------------------------- | ------------------------------------------- |
| Phase 1: Setup        | 4      | 2      | None                       | Settings, interfaces, skeleton class        |
| Phase 2: API Client   | 12     | 8      | 6 tasks (PARALLEL A, B, C) | UsageApiClient fully functional             |
| Phase 3: Integration  | 7      | 6      | None                       | AIUsageMonitor refactored, fallback working |
| Phase 4: Wiring       | 7      | 4      | None                       | Extension.ts wired, e2e flow validated      |
| Phase 5: Auto Refresh | 6      | 3      | None                       | Polling optimized, production ready         |
| Phase 6: Testing      | 12     | 8      | 4 tasks (PARALLEL D, E)    | Tests pass, docs complete                   |
| **Total**             | **48** | **28** | **14 tasks**               | **Feature complete, validated**             |

---

## Coverage Summary

### User Stories Coverage

| User Story                         | Acceptance Criteria | Task Coverage                                  | Status    |
| ---------------------------------- | ------------------- | ---------------------------------------------- | --------- |
| **US-1: View Anthropic API Usage** | 4 criteria          | T005, T006, T009, T011, T017, T025, T037, T039 | ✓ Covered |
| **US-2: View OpenAI API Usage**    | 3 criteria          | T007, T008, T010, T011, T017, T025, T037, T039 | ✓ Covered |
| **US-3: Configure Admin API Keys** | 3 criteria          | T001, T021, T028, T043                         | ✓ Covered |
| **US-4: Graceful Degradation**     | 3 criteria          | T013, T018, T019, T039, T040                   | ✓ Covered |
| **US-5: Automatic Refresh**        | 3 criteria          | T020, T021, T031, T032, T038                   | ✓ Covered |

### Functional Requirements Coverage

| FR Range         | Description             | Task Coverage                | Status    |
| ---------------- | ----------------------- | ---------------------------- | --------- |
| FR-001 to FR-004 | Provider API calls      | T005, T006, T007, T008       | ✓ Covered |
| FR-005           | Key validation          | T011, T028                   | ✓ Covered |
| FR-006 to FR-010 | Query parameters        | T005, T006, T007, T008, T016 | ✓ Covered |
| FR-011           | Response transformation | T009, T010, T011, T037       | ✓ Covered |
| FR-012 to FR-014 | API headers             | T005, T006, T007, T008       | ✓ Covered |
| FR-015 to FR-019 | Polling & config        | T020, T021, T031, T032       | ✓ Covered |
| FR-020           | UI preservation         | T019, T038, T041             | ✓ Covered |
| FR-021           | No new dependencies     | All tasks (no npm install)   | ✓ Covered |
| FR-022 to FR-024 | Error handling          | T012, T014, T015, T037       | ✓ Covered |
| FR-025           | Cache tokens            | T009, T037                   | ✓ Covered |

### Success Criteria Coverage

| SC ID  | Metric                   | Task Coverage    | Test Coverage             |
| ------ | ------------------------ | ---------------- | ------------------------- |
| SC-001 | Anthropic usage displays | T005, T006, T025 | T037, T039                |
| SC-002 | OpenAI usage displays    | T007, T008, T025 | T037, T039                |
| SC-003 | Load time < 5s           | T011, T025       | T045                      |
| SC-004 | Polling configurable     | T001, T020       | T038, T047                |
| SC-005 | Zero crashes             | T018, T027       | T039, T040                |
| SC-006 | Error recovery           | T014, T015       | T037, T039                |
| SC-007 | No new deps              | All tasks        | T045 (package.json check) |
| SC-008 | UI unchanged             | T019, T041       | T038, T048                |
| SC-009 | Config change < 5s       | T021             | T038, T047                |
| SC-010 | Memory < 5MB             | T029, T030       | T045                      |

### Edge Case Coverage

| Edge Case                     | Task Coverage    | Status    |
| ----------------------------- | ---------------- | --------- |
| Admin key revoked mid-session | T012, T040       | ✓ Covered |
| Provider API down             | T014, T040       | ✓ Covered |
| Usage data delayed            | T015, T040       | ✓ Covered |
| Billing period rollover       | T040             | ✓ Covered |
| Provider switch mid-stream    | T041             | ✓ Covered |
| Unexpected response format    | T023, T040, T046 | ✓ Covered |
| Multiple VSCode windows       | T040, T041       | ✓ Covered |
| No usage in period            | T040             | ✓ Covered |
| Extension without workspace   | T027             | ✓ Covered |

---

## Implementation Notes

### Before Starting

1. Create feature branch: `git checkout -b 026-provider-api-usage`
2. Review all specification documents (spec.md, plan.md, data-model.md,
   contracts/api.md, research.md)
3. Set up test environment with mock API responses
4. Obtain test admin API keys from Anthropic and OpenAI (staging accounts
   recommended)

### During Implementation

1. Follow task order strictly (dependencies matter)
2. Run `npm test` after each task completion
3. Update task checkboxes in this file as you complete tasks
4. Add traceability comments in code: `// FR-001: Anthropic usage API call`
5. Commit after each phase completion with message: "feat(026): Phase X
   complete - [description]"

### Testing Strategy

1. Unit tests first (TDD approach for Phase 2 API client)
2. Integration tests after Phase 4 wiring complete
3. Manual testing checklist (T041) before final validation
4. Performance tests (T045) as final gate before PR

### Quality Gates

- Post-Phase 2: Code review of UsageApiClient implementation
- Post-Phase 4: Integration testing with real admin keys (staging environment)
- Post-Phase 5: Performance validation (load time, memory, polling overhead)
- Post-Phase 6: Final spec traceability check + validation rubric
  (/6_gofer_validate)

### Rollback Plan

If critical issues found after deployment:

1. Set `gofer.aiUsage.useApiClient: false` in extension settings
2. Extension falls back to file-based UsageLogger
3. Users can continue using AI Usage panel with local data
4. Fix issues in patch release, re-enable via config

---

## Validation Checklist (Before Marking Feature Complete)

- [ ] All 48 tasks completed and checked off
- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] Manual testing checklist (T041) completed
- [ ] Performance targets met (SC-003, SC-010)
- [ ] Spec traceability matrix at 100%
- [ ] CHANGELOG.md updated
- [ ] Quickstart guide created
- [ ] Code review completed (2 approvals)
- [ ] No new npm dependencies added (SC-007)
- [ ] UI components unchanged (SC-008)
- [ ] Rollback flag tested and working
- [ ] Memory leak tests passed (no hanging timers/requests)
- [ ] Documentation reviewed for clarity
- [ ] Feature branch merged to main
- [ ] Release notes drafted

---

**End of Task Breakdown**

Generated: 2026-03-15 | Feature: 026-provider-api-usage | Status: Ready for
/5_gofer_implement
