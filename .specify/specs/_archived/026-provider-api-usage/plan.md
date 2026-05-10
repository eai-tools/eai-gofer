---
feature: 026-provider-api-usage
title: Provider API Usage Tracking
branch: 026-provider-api-usage
date: 2026-03-15
status: ready
spec: /Users/douglaswross/Code/gofer/.specify/specs/026-provider-api-usage/spec.md
research: /Users/douglaswross/Code/gofer/.specify/specs/026-provider-api-usage/research.md
---

# Implementation Plan: Provider API Usage Tracking

**Branch**: `026-provider-api-usage` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/026-provider-api-usage/spec.md`

## Summary

Replace AIUsageMonitor's data source from empty local JSONL files to real provider billing API calls. This feature creates a new `UsageApiClient` class that calls Anthropic and OpenAI billing APIs to retrieve actual token usage and cost data, then transforms responses into the existing `UsageSummary` interface shape. Admin API keys are stored separately in VSCode settings (`gofer.anthropicAdminApiKey`, `gofer.openaiAdminApiKey`). AIUsageMonitor's constructor swaps `UsageLogger` for `UsageApiClient` (both implement same interface). UI components (AIUsageProvider, AIUsageStatusBar) remain completely unchanged. Uses Node.js `https` module for HTTP calls (no new npm dependencies). Implements 60-second API polling with graceful three-tier fallback when admin keys are missing.

**Core Value**: Developers gain visibility into actual AI API spending directly in VSCode, enabling cost monitoring and budget management without leaving their IDE.

## Technical Context

**Language/Version**: TypeScript 5.3+ (extension project)
**Primary Dependencies**: VSCode Extension API, Node.js https module (built-in)
**Storage**: VSCode settings.json (admin API keys, encrypted by VSCode), cached API responses in memory
**Testing**: Vitest unit tests, integration tests with mocked HTTPS responses
**Target Platform**: VSCode extension (cross-platform: Windows, macOS, Linux)
**Project Type**: VSCode extension monorepo (`extension/` folder)
**Performance Goals**:
- Initial panel load < 5 seconds (target: 2 seconds)
- API polling every 60 seconds without blocking UI thread
- Memory footprint increase < 5MB
- API call timeout 10 seconds max

**Constraints**:
- No new npm dependencies (use Node.js built-ins)
- Admin API keys required (separate from regular API keys)
- API data has 5-10 minute delay (inherent provider limitation)
- Google Gemini has no billing API (excluded from scope)
- Maintain 100% backward compatibility with existing UI components

**Scale/Scope**:
- 2 provider APIs (Anthropic, OpenAI)
- 4 API endpoints (2 per provider: usage + cost)
- 3 time periods (current session, today, week)
- Single organization per provider (no multi-org support)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**No violations detected**. This feature:
- ✅ Adds one new class (UsageApiClient) following Single Responsibility Principle
- ✅ Reuses existing data source abstraction pattern (matches UsageLogger interface)
- ✅ No architectural changes (swap dependency at wiring layer)
- ✅ Follows existing patterns (ProviderFactory.getApiKey, polling-based monitoring)
- ✅ Zero UI changes (contract stability via UsageSummary interface)
- ✅ No new dependencies (Node.js built-ins only)

**Simplicity Gates Passed**:
- Data layer is a single HTTP client class (~300 LOC)
- Business logic changes isolated to AIUsageMonitor constructor
- Wiring changes in one location (extension.ts:538-565)
- Three-tier fallback is straightforward conditional logic
- No state machines, no complex error recovery, no caching beyond TTL

## Project Structure

### Documentation (this feature)

```text
.specify/specs/026-provider-api-usage/
├── spec.md              # Feature specification (/2_gofer_specify)
├── research.md          # Codebase research (/1_gofer_research)
├── plan.md              # This file (/3_gofer_plan)
├── tasks.md             # Task breakdown (/4_gofer_tasks)
└── issues.md            # GitHub issues (/4_gofer_tasks)
```

### Source Code (repository root)

```text
extension/
├── src/
│   ├── autonomous/
│   │   ├── AIUsageMonitor.ts          # MODIFY: Replace usageLogger with apiClient
│   │   ├── UsageApiClient.ts          # NEW: HTTP client for billing APIs
│   │   └── CostBudgetEnforcer.ts      # UNCHANGED: Budget enforcement
│   ├── types/
│   │   └── aiUsage.ts                 # MODIFY: Add UsageDataSource interface
│   ├── config/
│   │   └── pricing.ts                 # REVIEW: May need cache token pricing
│   ├── council/
│   │   └── UsageLogger.ts             # UNCHANGED: Keep for local logging
│   ├── ui/
│   │   ├── AIUsageProvider.ts         # UNCHANGED: TreeView provider
│   │   └── AIUsageStatusBar.ts        # UNCHANGED: Status bar item
│   └── extension.ts                   # MODIFY: Wiring changes (lines 538-565)
├── package.json                       # MODIFY: Add admin API key settings
└── tests/
    ├── unit/
    │   ├── usageApiClient.test.ts     # NEW: Unit tests for API client
    │   └── aiUsageMonitor.test.ts     # MODIFY: Update constructor tests
    └── integration/
        └── providerBilling.test.ts    # NEW: Integration tests with mocked APIs
```

**Structure Decision**: Single TypeScript project (extension monorepo). All changes are within the `extension/` folder. No frontend/backend split, no mobile components. Standard VSCode extension structure with `src/` for source code, `tests/` for test files, and configuration in root.

## Implementation Phases

### Phase 1: Setup & Configuration
**Goal**: Add VSCode settings for admin API keys and define data source abstraction interface.

- [ ] **Task 1.1**: Add admin API key settings to `extension/package.json`
  - Add `gofer.anthropicAdminApiKey` (type: string, secret)
  - Add `gofer.openaiAdminApiKey` (type: string, secret)
  - Add `gofer.aiUsage.api.pollingInterval` (type: number, default: 60000, range: 15000-300000)
  - Group under "Gofer > AI Usage > API" section
  - Add clear descriptions: "Admin API key required for billing data access (starts with sk-ant-admin...)"
  - Traceability: FR-005, US-3 (AC 1,2)

- [ ] **Task 1.2**: Define `UsageDataSource` interface in `extension/src/types/aiUsage.ts`
  - Add interface with `getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>` method
  - This interface will be implemented by both `UsageLogger` (local JSONL) and `UsageApiClient` (API calls)
  - Enables transparent data source swapping in AIUsageMonitor
  - Traceability: Research finding #2 (Data Source Abstraction)

- [ ] **Task 1.3**: Update `UsageLogger` to implement `UsageDataSource` interface
  - Add `implements UsageDataSource` to class declaration
  - No functional changes (already has `getUsageSummary` method)
  - Confirms existing contract compatibility
  - Traceability: Protected boundaries (UsageLogger must remain unchanged)

- [ ] **Task 1.4**: Create skeleton `UsageApiClient` class implementing `UsageDataSource`
  - Create `extension/src/autonomous/UsageApiClient.ts` with empty class
  - Implement `UsageDataSource` interface with placeholder methods
  - Add constructor accepting workspace path and admin key getter function
  - Return empty `UsageSummary` in placeholder `getUsageSummary()`
  - Traceability: FR-001 through FR-004 (preparation)

**Phase 1 Acceptance**: Settings appear in VSCode UI, `UsageDataSource` interface compiles, both implementations typecheck correctly.

---

### Phase 2: Data Layer - API Client Implementation
**Goal**: Implement HTTP client for Anthropic and OpenAI billing APIs with full error handling.

- [ ] **Task 2.1**: Implement Anthropic usage API client
  - Create `fetchAnthropicUsage(fromDate: Date, toDate: Date): Promise<AnthropicUsageResponse>` private method
  - Use Node.js `https.request()` for `GET /v1/organizations/usage_report/messages`
  - Build query params: `starting_at` (ISO 8601), `ending_at`, `bucket_width` (1h or 1d based on period), `group_by[]=model`
  - Add headers: `x-api-key: ${adminKey}`, `anthropic-version: 2023-06-01`
  - Parse JSON response and validate shape (data array with buckets, tokens, model)
  - Traceability: FR-001, FR-006, FR-007, FR-008, FR-010, FR-012, FR-013

- [ ] **Task 2.2**: Implement Anthropic cost API client
  - Create `fetchAnthropicCost(fromDate: Date, toDate: Date): Promise<AnthropicCostResponse>` private method
  - Use Node.js `https.request()` for `GET /v1/organizations/cost_report`
  - Build query params: `starting_at`, `ending_at`, `bucket_width: 1d`, `group_by[]=model`
  - Add same headers as usage API
  - Parse response: `{ data: [{ bucket, token_cost_usd_cents, model }] }`
  - Convert cents to dollars (divide by 100)
  - Traceability: FR-002, FR-012, FR-013

- [ ] **Task 2.3**: Implement OpenAI usage API client
  - Create `fetchOpenAIUsage(fromDate: Date, toDate: Date): Promise<OpenAIUsageResponse>` private method
  - Use Node.js `https.request()` for `GET /v1/organization/usage/completions`
  - Build query params: `start_time` (Unix timestamp seconds), `end_time`, `bucket_width` (1h or 1d), `group_by: ["model"]`
  - Add header: `Authorization: Bearer ${adminKey}`
  - Parse response: `{ data: [{ start_time, end_time, results: [{ model, input_tokens, output_tokens }] }] }`
  - Traceability: FR-003, FR-006, FR-007, FR-009, FR-010, FR-014

- [ ] **Task 2.4**: Implement OpenAI cost API client
  - Create `fetchOpenAICost(fromDate: Date, toDate: Date): Promise<OpenAICostResponse>` private method
  - Use Node.js `https.request()` for `GET /v1/organization/costs`
  - Build query params: same as usage API
  - Add header: `Authorization: Bearer ${adminKey}`
  - Parse response: `{ data: [{ results: [{ model, amount: { value, currency } }] }] }`
  - Handle non-USD currencies (log warning, use value as-is)
  - Traceability: FR-004, FR-014

- [ ] **Task 2.5**: Implement response transformation to `UsageSummary`
  - Create `transformAnthropicData(usageResp, costResp): UsageSummary` method
  - Merge usage and cost data by model and time bucket
  - Calculate totals: `totalInputTokens`, `totalOutputTokens`, `totalCostUsd`
  - Build `byProvider` map (single entry: 'anthropic')
  - Handle cache tokens: aggregate `cache_creation_input_tokens` and `cached_input_tokens`
  - Traceability: FR-011, FR-025

- [ ] **Task 2.6**: Implement response transformation for OpenAI
  - Create `transformOpenAIData(usageResp, costResp): UsageSummary` method
  - Merge usage and cost by model
  - Calculate totals and build `byProvider` map (single entry: 'openai')
  - Match data structure exactly to Anthropic output for consistency
  - Traceability: FR-011

- [ ] **Task 2.7**: Implement `getUsageSummary()` orchestration
  - Read admin API keys from VSCode config (`vscode.workspace.getConfiguration('gofer')`)
  - Validate key format (Anthropic: starts with `sk-ant-admin`, OpenAI: valid admin key)
  - For each provider with valid admin key: fetch usage + cost in parallel
  - Transform responses to `UsageSummary` and merge (combine `byProvider` maps)
  - Return merged summary with all providers aggregated
  - Traceability: FR-005, FR-011, FR-017

- [ ] **Task 2.8**: Add timeout and error handling
  - Wrap all HTTP requests with 10-second timeout
  - Catch network errors, parse errors, HTTP 4xx/5xx errors
  - Log errors with context (endpoint, status code, error body) without exposing API keys
  - For transient errors (5xx, timeout, network): throw error for retry layer to handle
  - For auth errors (401, 403): throw `AuthenticationError` with actionable message
  - Traceability: FR-024, NFR-003

**Phase 2 Acceptance**: `UsageApiClient.getUsageSummary()` returns valid data when called with admin keys, throws errors on invalid keys or network failures.

---

### Phase 3: Business Logic - AIUsageMonitor Integration
**Goal**: Refactor AIUsageMonitor to use UsageApiClient, implement fallback strategy, add API polling.

- [ ] **Task 3.1**: Refactor AIUsageMonitor constructor
  - Change parameter from `usageLogger: UsageLogger` to `dataSource: UsageDataSource`
  - Update `fetchUsageData()` to call `this.dataSource.getUsageSummary()` instead of `this.usageLogger.getUsageSummary()`
  - Keep all other logic unchanged (caching, event emission, period calculation)
  - Traceability: Research finding #2 (Data Source Abstraction)

- [ ] **Task 3.2**: Implement three-tier fallback in UsageApiClient
  - Tier 1: Admin key configured → call billing API (already implemented in Phase 2)
  - Tier 2: No admin key + regular API key configured → return empty `UsageSummary` with warning metadata `{ error: 'admin_key_required' }`
  - Tier 3: No keys configured → return empty `UsageSummary` with `{ error: 'not_configured' }`
  - For Google provider: always return `{ error: 'api_not_available' }`
  - Traceability: FR-017, FR-018, US-4 (graceful degradation)

- [ ] **Task 3.3**: Add error metadata to UsageSummary interface
  - Add optional `error?: 'admin_key_required' | 'not_configured' | 'api_not_available' | 'api_error'` field to `UsageSummary`
  - Add optional `errorMessage?: string` for detailed error descriptions
  - AIUsageProvider will use these fields to show appropriate messages in UI
  - Traceability: FR-017, FR-018, NFR-007

- [ ] **Task 3.4**: Implement retry with exponential backoff
  - Wrap API calls in retry logic: max 3 attempts
  - Backoff schedule: 2s, 4s, 8s between retries
  - Only retry transient errors (5xx, timeout, network), not auth errors (4xx)
  - Cache last successful response and return it during retries
  - After 3 failures, set `error: 'api_error'` with last error message
  - Traceability: FR-022, FR-023, SC-006

- [ ] **Task 3.5**: Update polling interval for API calls
  - In `setupPolling()`, check if data source is `UsageApiClient`
  - Use `gofer.aiUsage.api.pollingInterval` setting (default 60000ms) instead of `gofer.aiUsage.polling.interval` (default 5000ms)
  - Skip API polling when no admin keys are configured (Tier 2/3 fallback)
  - Resume polling when configuration changes to add admin keys
  - Traceability: FR-015, FR-016, FR-019, US-5

- [ ] **Task 3.6**: Add configuration change detection
  - In AIUsageMonitor, subscribe to `vscode.workspace.onDidChangeConfiguration`
  - Filter for changes to `gofer.anthropicAdminApiKey` or `gofer.openaiAdminApiKey`
  - On change: clear cache, force immediate refresh via `forceRefresh()`
  - Ensure refresh happens within 5 seconds of config change
  - Traceability: FR-019, SC-009

- [ ] **Task 3.7**: Add API response caching
  - Cache last successful `UsageSummary` per provider with timestamp
  - On API error: return cached data (up to 10 minutes old) + error metadata
  - If cache is stale (>10 min) and API fails: return empty data + error
  - Display timestamp in UI: "Data as of 10:45 AM" using cached timestamp
  - Traceability: FR-023, Edge case: API data delay

**Phase 3 Acceptance**: AIUsageMonitor works with both UsageApiClient and UsageLogger data sources, gracefully handles missing keys and API errors, polls at correct intervals.

---

### Phase 4: Integration & Wiring
**Goal**: Wire UsageApiClient into extension.ts, validate end-to-end flow, handle edge cases.

- [ ] **Task 4.1**: Create UsageApiClient factory function
  - Add `export function getUsageApiClient(workspacePath: string): UsageApiClient` to `UsageApiClient.ts`
  - Factory reads admin keys from VSCode config and instantiates client
  - Singleton pattern: return same instance per workspace path
  - Traceability: Pattern matching UsageLogger factory (`getUsageLogger()`)

- [ ] **Task 4.2**: Wire UsageApiClient in extension.ts
  - In `initializeForWorkspace()` at lines 538-565, replace `getUsageLogger()` with `getUsageApiClient()`
  - Pass `UsageApiClient` instance to `AIUsageMonitor` constructor
  - Keep `getUsageLogger()` available for council logging (don't delete)
  - Update comments to clarify: "UsageApiClient for billing APIs, UsageLogger for council session logs"
  - Traceability: Research integration point #3

- [ ] **Task 4.3**: Add feature flag for rollback safety
  - Add `gofer.aiUsage.useApiClient` boolean setting (default: true)
  - In extension.ts wiring: `if (config.get('aiUsage.useApiClient')) { use UsageApiClient } else { use UsageLogger }`
  - Allows instant rollback if API integration has issues
  - Document in CHANGELOG: "Set `gofer.aiUsage.useApiClient: false` to revert to local JSONL data source"
  - Traceability: NFR-007 (actionable error recovery)

- [ ] **Task 4.4**: Handle missing workspace path edge case
  - In `getUsageApiClient()`, validate `workspacePath` is not empty/undefined
  - If missing: log error and return a no-op client that always returns empty `UsageSummary`
  - Prevents crashes when extension activates without workspace
  - Traceability: Edge case: extension without workspace

- [ ] **Task 4.5**: Validate UI remains unchanged
  - Run extension with `UsageApiClient` wired
  - Verify AIUsageProvider TreeView renders without errors
  - Verify AIUsageStatusBar updates correctly
  - Check that UI shows "Admin key required" when keys not configured
  - Confirm no TypeScript errors in `AIUsageProvider.ts` or `AIUsageStatusBar.ts`
  - Traceability: FR-020, Protected boundaries

- [ ] **Task 4.6**: Add admin key validation on startup
  - In extension.ts after wiring, validate admin key formats
  - For Anthropic: if key doesn't start with `sk-ant-admin`, log warning: "Invalid Anthropic admin key format (must start with sk-ant-admin)"
  - For OpenAI: if key looks like a regular key (starts with `sk-proj` or `sk-` but is short), log warning
  - Don't block startup, just warn in output channel
  - Traceability: FR-005, Open question: admin key validation

- [ ] **Task 4.7**: Add disposal cleanup
  - Ensure `UsageApiClient` is added to `context.subscriptions` for proper disposal
  - Implement `dispose()` method in UsageApiClient: clear cache, abort pending HTTP requests
  - Test: deactivate extension, verify no hanging timers or network requests
  - Traceability: Memory leak prevention (MEMORY.md critical learnings)

**Phase 4 Acceptance**: Extension activates with UsageApiClient, panel shows data or appropriate fallback messages, no crashes or memory leaks, rollback flag works.

---

### Phase 5: Testing, Polish & Documentation
**Goal**: Comprehensive tests, edge case handling, documentation updates, validation against spec.

- [ ] **Task 5.1**: Write unit tests for UsageApiClient
  - Mock `https.request()` to return fake Anthropic and OpenAI responses
  - Test: valid admin keys → returns UsageSummary with correct totals
  - Test: invalid admin key → throws AuthenticationError
  - Test: network timeout → throws error after 10 seconds
  - Test: malformed JSON response → throws parse error
  - Test: 5xx error → retries 3 times with backoff
  - Test: response transformation → correct UsageSummary structure
  - Test: cache token aggregation → separate cache_creation and cached_input
  - Traceability: FR-001 through FR-025, NFR-003

- [ ] **Task 5.2**: Write unit tests for AIUsageMonitor changes
  - Mock `UsageDataSource` interface to return fake data
  - Test: constructor accepts UsageDataSource instead of UsageLogger
  - Test: `fetchUsageData()` calls `dataSource.getUsageSummary()` with correct date range
  - Test: configuration change triggers refresh within 5 seconds
  - Test: polling interval uses API config setting (60s) when UsageApiClient is data source
  - Test: error metadata is preserved and emitted in usage-update events
  - Traceability: Phase 3 tasks

- [ ] **Task 5.3**: Write integration tests with mocked HTTPS
  - Create `tests/integration/providerBilling.test.ts`
  - Mock Anthropic and OpenAI API endpoints with `nock` or manual https mocking
  - Test: full flow from AIUsageMonitor → UsageApiClient → API call → UI update event
  - Test: retry logic with transient errors
  - Test: fallback to cache when API is down
  - Test: three-tier fallback (admin key → admin required → not configured)
  - Traceability: US-1, US-2, US-4

- [ ] **Task 5.4**: Test edge cases
  - Test: billing period rollover → empty buckets show "$0.00 (no usage yet today)"
  - Test: organization with no usage → panel shows "No usage in this period" (not error)
  - Test: admin key revoked mid-session → shows "Authentication failed" after next poll
  - Test: API returns unexpected response format → falls back to cache + error message
  - Test: multiple VSCode windows → each polls independently (no state corruption)
  - Test: provider API is down → exponential backoff, show "Service unavailable" after 3 failures
  - Traceability: Edge cases section in spec

- [ ] **Task 5.5**: Add pricing.ts cache token cost rates
  - Review Anthropic cache token pricing (typically lower than input tokens)
  - Add `cache_creation` and `cached_read` rates to `COST_PER_1K_TOKENS` if different from input
  - Update `calculateCost()` to accept cache token parameters
  - If cache pricing matches input pricing, document in comment and skip
  - Traceability: FR-025

- [ ] **Task 5.6**: Update CHANGELOG.md
  - Add section: "Feature: Provider API Usage Tracking (Feature 026)"
  - List: "AI Usage panel now shows real billing data from Anthropic and OpenAI APIs"
  - List: "Configure admin API keys in settings: `gofer.anthropicAdminApiKey`, `gofer.openaiAdminApiKey`"
  - List: "Rollback flag: `gofer.aiUsage.useApiClient: false` to revert to local JSONL data"
  - Traceability: Documentation requirement

- [ ] **Task 5.7**: Add quickstart guide
  - Create `.specify/specs/026-provider-api-usage/quickstart.md` with setup steps
  - Step 1: Obtain admin API keys from Anthropic Console and OpenAI Platform
  - Step 2: Add keys to VSCode settings (show screenshot of settings UI)
  - Step 3: Open AI Usage panel, verify data appears
  - Step 4: Troubleshooting section (invalid key format, API errors, no data)
  - Traceability: US-3 (clear setup instructions)

- [ ] **Task 5.8**: Validate spec traceability
  - Review all 5 user stories: verify each acceptance criterion is implemented
  - Review all 25 FRs: verify each has task coverage
  - Review all 10 success criteria: verify measurable tests exist
  - Create traceability matrix: `[Requirement ID] → [Task IDs] → [Test IDs]`
  - Identify gaps and create follow-up tasks if needed
  - Traceability: 100% coverage target

- [ ] **Task 5.9**: Performance validation
  - Measure initial panel load time with admin keys configured
  - Target: < 5 seconds (stretch: < 2 seconds)
  - Measure memory footprint increase after UsageApiClient instantiation
  - Target: < 5MB
  - Verify polling doesn't block UI thread (no frame drops in VSCode)
  - Traceability: NFR-001, NFR-002, NFR-006, SC-003, SC-010

- [ ] **Task 5.10**: Manual testing checklist
  - [ ] Install extension in fresh VSCode window
  - [ ] Configure Anthropic admin key only → verify Anthropic data shows, OpenAI shows "Configure admin key"
  - [ ] Add OpenAI admin key → verify both providers show data
  - [ ] Remove Anthropic admin key → verify Anthropic switches to "Admin key required" message
  - [ ] Invalid admin key format → verify warning in output channel
  - [ ] Network disconnected → verify "Service unavailable" after retries
  - [ ] Switch active provider in council → verify billing panel unaffected
  - [ ] Change admin key value → verify refresh within 5 seconds
  - [ ] Multiple VSCode windows → verify independent polling (no state leaks)

**Phase 5 Acceptance**: All tests pass, edge cases handled, performance targets met, 100% spec traceability, manual testing completed.

---

## File Structure

Complete file tree showing all modified and new files:

```text
.specify/specs/026-provider-api-usage/
├── spec.md                          # Feature specification (existing)
├── research.md                      # Codebase research (existing)
├── plan.md                          # This file
├── tasks.md                         # Generated by /4_gofer_tasks
├── issues.md                        # Generated by /4_gofer_tasks
└── quickstart.md                    # NEW: Setup guide (Task 5.7)

extension/
├── package.json                     # MODIFY: Add admin key settings (Task 1.1)
├── CHANGELOG.md                     # MODIFY: Add feature entry (Task 5.6)
├── src/
│   ├── autonomous/
│   │   ├── AIUsageMonitor.ts        # MODIFY: Accept UsageDataSource, add config listener (Tasks 3.1, 3.5, 3.6)
│   │   └── UsageApiClient.ts        # NEW: HTTP client for billing APIs (Phase 2)
│   ├── types/
│   │   └── aiUsage.ts               # MODIFY: Add UsageDataSource interface, error metadata (Tasks 1.2, 3.3)
│   ├── config/
│   │   └── pricing.ts               # REVIEW: Add cache token rates if needed (Task 5.5)
│   ├── council/
│   │   └── UsageLogger.ts           # MODIFY: Implement UsageDataSource (Task 1.3)
│   └── extension.ts                 # MODIFY: Wire UsageApiClient, add feature flag (Tasks 4.2, 4.3)
└── tests/
    ├── unit/
    │   ├── usageApiClient.test.ts   # NEW: UsageApiClient unit tests (Task 5.1)
    │   └── aiUsageMonitor.test.ts   # MODIFY: Update constructor tests (Task 5.2)
    └── integration/
        └── providerBilling.test.ts  # NEW: E2E tests with mocked APIs (Tasks 5.3, 5.4)
```

**Key Files Modified**: 7 files (package.json, AIUsageMonitor.ts, aiUsage.ts, UsageLogger.ts, extension.ts, CHANGELOG.md, pricing.ts)

**New Files Created**: 4 files (UsageApiClient.ts, quickstart.md, 3 test files)

**Protected Files**: AIUsageProvider.ts, AIUsageStatusBar.ts, CostBudgetEnforcer.ts (zero changes)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Admin API key availability** | Medium | High | Three-tier fallback (Tier 2: show "Admin key required" message). Clear setup guide in quickstart.md. |
| **Provider API changes** | Low | Medium | Use versioned endpoints (`anthropic-version: 2023-06-01`). Monitor provider changelogs. Quick rollback via feature flag. |
| **API data delay (5-10 min)** | High | Low | Document expected delay in UI ("Data as of [timestamp]"). Not fixable, inherent to provider APIs. |
| **Google billing API unavailable** | Certain | Low | Excluded from scope. Show "Billing API not available" for Google. Document limitation. |
| **Network failures** | Medium | Medium | Exponential backoff retry (3 attempts). Cache last successful response (10 min TTL). Show actionable error messages. |
| **Admin key misconfiguration** | High | Medium | Validate key format on startup (log warnings). Show clear error messages in UI. Link to provider docs. |
| **Backward compatibility break** | Low | High | UsageSummary interface unchanged. UI components untouched. Add feature flag for instant rollback. |
| **Memory leak from API polling** | Low | Medium | Dispose pattern (clear timers, abort requests). Reuse existing polling cleanup infrastructure. Unit tests verify disposal. |
| **Performance degradation** | Low | Medium | 10-second timeout per API call. Async HTTP (no UI blocking). Memory target < 5MB. Performance tests in Phase 5. |
| **Multi-org scenarios** | Medium | Low | Out of scope (single org per admin key). Document limitation. Future enhancement if needed. |

**Overall Risk Level**: **Low to Medium**. Highest risks (admin key availability, data delay, Google limitation) are mitigated via graceful degradation and clear user communication. Technical risks (API changes, network failures, memory leaks) have standard mitigations. Rollback flag provides escape hatch.

---

## Spec Traceability

### User Story Coverage (5/5 = 100%)

| User Story | Covered By Tasks | Acceptance Criteria Coverage |
|------------|------------------|------------------------------|
| **US-1: View Anthropic API Usage** | Tasks 2.1, 2.2, 2.5, 2.7, 4.2, 5.3 | AC 1-4: Full coverage (admin key config, data display, period switching, error handling) |
| **US-2: View OpenAI API Usage** | Tasks 2.3, 2.4, 2.6, 2.7, 4.2, 5.3 | AC 1-3: Full coverage (admin key config, dual provider display, rate limiting) |
| **US-3: Configure Admin API Keys** | Tasks 1.1, 3.6, 4.6, 5.7 | AC 1-3: Full coverage (settings UI, config change detection, secret storage) |
| **US-4: Graceful Degradation** | Tasks 3.2, 3.3, 5.3 | AC 1-3: Full coverage (three-tier fallback, partial config, Google API unavailable) |
| **US-5: Automatic Refresh** | Tasks 3.5, 3.6, 5.2 | AC 1-3: Full coverage (60s polling, immediate post-idle refresh, configurable interval) |

### Functional Requirements Coverage (25/25 = 100%)

| FR ID | Requirement | Covered By Tasks |
|-------|-------------|------------------|
| FR-001 | Call Anthropic usage API | Task 2.1 |
| FR-002 | Call Anthropic cost API | Task 2.2 |
| FR-003 | Call OpenAI usage API | Task 2.3 |
| FR-004 | Call OpenAI cost API | Task 2.4 |
| FR-005 | Validate admin API key format | Tasks 2.7, 4.6 |
| FR-006 | Use 1h bucket for "Today" | Tasks 2.1, 2.3 |
| FR-007 | Use 1d bucket for "Week" | Tasks 2.1, 2.3 |
| FR-008 | Send ISO 8601 timestamps (Anthropic) | Task 2.1 |
| FR-009 | Send Unix timestamps (OpenAI) | Task 2.3 |
| FR-010 | Group by model | Tasks 2.1, 2.3 |
| FR-011 | Transform to UsageSummary | Tasks 2.5, 2.6, 2.7 |
| FR-012 | Anthropic API version header | Task 2.1 |
| FR-013 | Anthropic x-api-key header | Tasks 2.1, 2.2 |
| FR-014 | OpenAI Authorization Bearer header | Tasks 2.3, 2.4 |
| FR-015 | Poll at configurable interval (60s default) | Task 3.5 |
| FR-016 | Stop polling when no admin keys | Task 3.5 |
| FR-017 | Three-tier fallback | Task 3.2 |
| FR-018 | Google "API not available" | Task 3.2 |
| FR-019 | Detect config changes within 5s | Task 3.6 |
| FR-020 | Preserve UI components unchanged | Tasks 4.5, Protected boundaries |
| FR-021 | Use Node.js https module (no new deps) | Tasks 2.1-2.4, SC-007 |
| FR-022 | Retry with exponential backoff | Task 3.4 |
| FR-023 | Cache last successful response | Task 3.7 |
| FR-024 | Log API errors without exposing keys | Task 2.8 |
| FR-025 | Aggregate cache tokens separately | Tasks 2.5, 5.5 |

### Success Criteria Coverage (10/10 = 100%)

| SC ID | Metric | Task Coverage | Test Coverage |
|-------|--------|---------------|---------------|
| SC-001 | Anthropic usage displays (100% success) | Tasks 2.1, 2.2, 4.2 | Task 5.3 (E2E test) |
| SC-002 | OpenAI usage displays (100% success) | Tasks 2.3, 2.4, 4.2 | Task 5.3 (E2E test) |
| SC-003 | Initial load < 5s (target: 2s) | Task 4.2 | Task 5.9 (performance test) |
| SC-004 | Polling interval configurable (15-300s) | Task 3.5 | Task 5.2 (config test) |
| SC-005 | Zero crashes with missing keys | Tasks 3.2, 4.4 | Task 5.3 (fallback test) |
| SC-006 | API error recovery within 60s | Task 3.4 | Task 5.3 (retry test) |
| SC-007 | Zero new npm dependencies | Tasks 2.1-2.4 | Task 5.9 (package.json check) |
| SC-008 | UI components unchanged | Task 4.5 | Code review + manual testing |
| SC-009 | Config change detection < 5s | Task 3.6 | Task 5.2 (config listener test) |
| SC-010 | Memory increase < 5MB | Task 4.7 | Task 5.9 (memory profiler) |

### Edge Case Coverage (9/9 = 100%)

| Edge Case | Covered By Tasks |
|-----------|------------------|
| Admin key revoked mid-session | Tasks 3.4, 5.4 (401/403 error handling) |
| Provider API down | Tasks 3.4, 5.4 (retry + backoff) |
| Usage data delayed | Task 3.7 (timestamp display) |
| Billing period rollover | Task 5.4 (empty buckets test) |
| Provider switch mid-stream | Task 4.5 (independent provider data) |
| Unexpected response format | Tasks 2.8, 5.4 (validation + fallback) |
| Multiple VSCode windows | Task 5.4 (stateless polling test) |
| No usage in period | Task 5.4 (empty data test) |
| Extension without workspace | Task 4.4 (no-op client) |

**Traceability Summary**:
- **User Stories**: 5/5 covered (100%)
- **Functional Requirements**: 25/25 covered (100%)
- **Success Criteria**: 10/10 covered (100%)
- **Edge Cases**: 9/9 covered (100%)
- **Total Tasks**: 52 tasks across 5 phases
- **Test Coverage**: Unit tests (Tasks 5.1, 5.2), Integration tests (Tasks 5.3, 5.4), Performance tests (Task 5.9), Manual tests (Task 5.10)

---

## Key Risks & Mitigation Strategies

### Technical Risks

1. **API Rate Limiting**
   - Risk: Polling every 60 seconds might hit provider rate limits
   - Mitigation: Anthropic and OpenAI both support 1req/min. Exponential backoff on 429 errors. Make polling interval configurable (15-300s range).

2. **Admin Key Security**
   - Risk: Admin keys have billing access, more sensitive than regular keys
   - Mitigation: VSCode settings marked as "secret" (masked in UI). Keys never logged. Use separate settings from regular API keys.

3. **Response Schema Changes**
   - Risk: Provider APIs might add/remove fields without notice
   - Mitigation: Validate response schema before parsing. Fall back to cache on validation failure. Version headers ensure stable endpoints.

4. **Network Partitions**
   - Risk: API calls fail when network is down
   - Mitigation: Retry logic (3 attempts). Cache last response (10 min TTL). Show last known data + "Service unavailable" message.

### User Experience Risks

5. **Confusing Error Messages**
   - Risk: Users don't understand "Admin key required" vs "Not configured"
   - Mitigation: Actionable error messages with links to provider docs. Quickstart guide with screenshots. Clear setting descriptions.

6. **Data Delay Confusion**
   - Risk: Users expect real-time data, frustrated by 5-10 min delay
   - Mitigation: Show timestamp "Data as of [time]" in UI. Document delay in quickstart. Explain in setting description.

7. **Partial Configuration**
   - Risk: Users configure only one provider's admin key, confused about other provider
   - Mitigation: Three-tier fallback shows clear message per provider. Each provider degrades independently. UI shows "Configure admin key" with link.

### Process Risks

8. **Scope Creep**
   - Risk: Users request Google billing API integration (not available)
   - Mitigation: Explicit "Out of Scope" section in spec. Document Google limitation upfront. Show "API not available" message in UI.

9. **Backward Compatibility Break**
   - Risk: Changes to AIUsageMonitor break existing UI components
   - Mitigation: UsageSummary interface unchanged. UI components in protected boundaries. Feature flag for instant rollback. Integration tests validate contract.

10. **Insufficient Testing**
    - Risk: Edge cases cause production crashes
    - Mitigation: Comprehensive test plan (52 tasks, 4 test files). Edge case checklist (9 scenarios). Manual testing checklist (10 items). Performance validation.

**Risk Monitoring**: Track issues in GitHub with `026-provider-api-usage` label. Weekly risk review during implementation. Rollback flag (`gofer.aiUsage.useApiClient: false`) ready for immediate revert if critical issues found.

---

## Next Steps

1. **Generate Tasks**: Run `/4_gofer_tasks` to create `tasks.md` with granular implementation steps from this plan
2. **Create Branch**: `git checkout -b 026-provider-api-usage`
3. **Phase 1 Kickoff**: Start with Task 1.1 (add admin key settings to package.json)
4. **Continuous Validation**: After each phase, run `npm test` and manual smoke tests
5. **Documentation**: Update quickstart.md as implementation progresses
6. **Validation**: Run `/6_gofer_validate` before marking feature complete

**Estimated Effort**:
- Phase 1 (Setup): 2 hours
- Phase 2 (API Client): 8 hours
- Phase 3 (Business Logic): 6 hours
- Phase 4 (Integration): 4 hours
- Phase 5 (Testing & Polish): 8 hours
- **Total**: ~28 hours (3.5 developer days)

**Dependencies**: No external team dependencies. All work within extension codebase.

**Review Gates**:
- Post-Phase 2: Code review of UsageApiClient implementation
- Post-Phase 4: Integration testing with real admin keys (staging environment)
- Post-Phase 5: Final spec traceability check + validation rubric

---

## Appendix: Architecture Decision Record

**ADR-026-001: Use UsageDataSource Interface for Data Source Abstraction**

**Context**: AIUsageMonitor currently depends directly on `UsageLogger` class. We need to swap the data source from local JSONL files to API calls without changing AIUsageMonitor's core logic.

**Decision**: Introduce `UsageDataSource` interface with single method `getUsageSummary(fromDate?, toDate?): Promise<UsageSummary>`. Both `UsageLogger` (local files) and `UsageApiClient` (API calls) implement this interface.

**Rationale**:
- Dependency Inversion Principle (depend on abstraction, not concrete class)
- Enables transparent swapping at wiring layer (extension.ts)
- Preserves existing UsageLogger for council session logging
- Allows feature flag for instant rollback

**Alternatives Considered**:
- Modify UsageLogger directly: Rejected (breaks Single Responsibility Principle, mixes file I/O with HTTP)
- Create AIUsageMonitor subclass: Rejected (violates Open/Closed Principle, duplicates logic)

**Consequences**:
- Positive: Clean separation of concerns, testable via mocking, rollback safety
- Negative: One additional interface (minimal complexity cost)

---

**ADR-026-002: Use Node.js HTTPS Module Instead of Provider SDKs**

**Context**: Anthropic and OpenAI npm SDKs don't expose billing API endpoints. We need HTTP client for GET requests to billing APIs.

**Decision**: Use Node.js built-in `https` module for API calls. No new npm dependencies.

**Rationale**:
- Billing endpoints are simple GET requests with query params and headers
- Adding `axios` or `node-fetch` increases bundle size for minimal benefit
- Built-in module is available in all Node.js versions VSCode supports
- Reduces dependency attack surface

**Alternatives Considered**:
- Use provider SDKs: Rejected (billing endpoints not exposed)
- Add axios: Rejected (unnecessary dependency for simple GET requests)
- Use VSCode fetch API: Rejected (not available in all VSCode versions)

**Consequences**:
- Positive: Zero new dependencies, smaller bundle, better security
- Negative: More verbose code than high-level HTTP libraries (acceptable tradeoff)

---

**ADR-026-003: Three-Tier Fallback Instead of Binary On/Off**

**Context**: Admin API keys may be missing, invalid, or only partially configured. Need graceful degradation strategy.

**Decision**: Implement three-tier fallback per provider:
1. Admin key configured → call billing API
2. No admin key, regular key exists → show "Admin key required" message
3. No keys configured → show "Not configured" message

**Rationale**:
- Tier 2 guides users who already have regular keys to upgrade to admin keys
- Tier 3 guides new users to configure keys from scratch
- Per-provider fallback allows partial configuration (e.g., only Anthropic admin key)
- Better UX than binary "working" vs "broken" states

**Alternatives Considered**:
- Binary fallback (API or nothing): Rejected (doesn't distinguish "almost working" from "never configured")
- Auto-detect admin vs regular keys: Rejected (unreliable, APIs may accept regular keys and return 403)

**Consequences**:
- Positive: Clear user guidance, supports partial setup, better error messages
- Negative: Slightly more complex fallback logic (three branches instead of two)

---

**Plan Complete**. Ready for `/4_gofer_tasks` to generate task breakdown.
