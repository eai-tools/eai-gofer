---
id: 026-provider-api-usage
title: Provider API Usage Tracking
status: draft
created: 2026-03-15
author: Claude
feature_branch: 026-provider-api-usage
---

# Feature Specification: Provider API Usage Tracking

**Feature Branch**: `026-provider-api-usage` **Created**: 2026-03-15 **Status**: Draft

## Overview

Replace the AIUsageMonitor data source from empty local JSONL files to real provider billing API calls, enabling the AI Token Usage panel to display actual subscription usage and costs from Anthropic and OpenAI. This transforms the existing UI from showing $0.00 placeholder data to real-time billing insights without changing any UI components.

**Core Value**: Developers gain visibility into actual AI API spending directly in VSCode, enabling cost monitoring and budget management without leaving their IDE.

**Scope Boundaries**:
- ✅ Anthropic billing API integration (usage + cost endpoints)
- ✅ OpenAI billing API integration (usage + cost endpoints)
- ✅ Admin API key configuration (separate from regular API keys)
- ✅ Graceful degradation (three-tier fallback strategy)
- ❌ Google/Gemini billing (no direct API available)
- ❌ Cost alerts or notifications
- ❌ Historical trend analysis beyond current UI

## User Scenarios & Testing

### User Story 1 - View Anthropic API Usage (Priority: P1)

As a developer using Anthropic's Claude API for council queries, I want to see my organization's token usage and costs in the AI Usage panel so that I can track spending without visiting the Anthropic Console.

**Why this priority**: Anthropic is the primary provider for Gofer's council feature. Real usage visibility is the core value proposition of this feature.

**Independent Test**: Can be fully tested by configuring only `gofer.anthropicAdminApiKey`, triggering a panel refresh, and verifying Anthropic usage data appears. Delivers standalone value even if OpenAI integration is incomplete.

**Acceptance Scenarios**:

1. **Given** I have configured `gofer.anthropicAdminApiKey` with a valid admin key starting with `sk-ant-admin...`, **When** I open the AI Usage panel, **Then** I see real token counts and costs for Anthropic API usage from the past 24 hours
2. **Given** The panel is showing Anthropic data, **When** I switch the period dropdown to "Week", **Then** I see aggregated usage for the past 7 days with daily bucket granularity
3. **Given** I have only configured a regular Anthropic API key (not admin), **When** I open the panel, **Then** I see a message "Admin API key required for billing data" with a link to settings
4. **Given** My admin API key is invalid or expired, **When** The monitor polls the API, **Then** I see an error message "Unable to fetch usage data: [error reason]" and the panel shows the last known good data

**Checkable Acceptance Criteria**:
- [ ] Panel displays input tokens, output tokens, cached tokens for Anthropic usage
- [ ] Panel displays total cost in USD for Anthropic usage
- [ ] Data refreshes automatically every 60 seconds when admin key is configured
- [ ] Error messages are actionable and guide users to fix configuration
- [ ] Panel falls back to showing "Configure admin API key" when not set

---

### User Story 2 - View OpenAI API Usage (Priority: P1)

As a developer using OpenAI's GPT models, I want to see my organization's token usage and costs in the AI Usage panel so that I can monitor spending alongside Anthropic usage.

**Why this priority**: OpenAI is a secondary provider but commonly used. Equal priority with Anthropic as both are independent slices of functionality.

**Independent Test**: Can be fully tested by configuring only `gofer.openaiAdminApiKey`, leaving Anthropic unconfigured, and verifying OpenAI usage appears independently.

**Acceptance Scenarios**:

1. **Given** I have configured `gofer.openaiAdminApiKey` with a valid admin key, **When** I open the AI Usage panel, **Then** I see real token counts and costs for OpenAI API usage from the past 24 hours
2. **Given** Both Anthropic and OpenAI admin keys are configured, **When** I view the panel, **Then** I see separate sections for each provider with their respective usage data
3. **Given** OpenAI API returns rate limit errors, **When** The monitor polls, **Then** It backs off exponentially and shows "Rate limited, retrying in [X]s" status

**Checkable Acceptance Criteria**:
- [ ] Panel displays input tokens, output tokens for OpenAI usage
- [ ] Panel displays total cost in USD for OpenAI usage
- [ ] Multiple providers can be shown simultaneously without interference
- [ ] Rate limiting is handled gracefully with exponential backoff
- [ ] OpenAI data refreshes independently of Anthropic data

---

### User Story 3 - Configure Admin API Keys (Priority: P2)

As a developer, I want to configure admin API keys separately from my regular API keys so that billing access is independent and I can grant billing visibility without sharing my development keys.

**Why this priority**: Required infrastructure for P1 stories but not directly visible to end users. Enabler rather than direct value.

**Independent Test**: Can test by setting `gofer.anthropicAdminApiKey` in settings.json, verifying it's read correctly, and confirming regular `gofer.anthropicApiKey` is unaffected.

**Acceptance Scenarios**:

1. **Given** I open VSCode settings, **When** I search for "gofer admin", **Then** I see separate settings for `gofer.anthropicAdminApiKey` and `gofer.openaiAdminApiKey`
2. **Given** I have set an admin API key in settings, **When** I change the key value, **Then** The usage monitor detects the change within 5 seconds and re-fetches data
3. **Given** I have admin keys stored in settings.json, **When** I share my workspace, **Then** The keys are marked as secrets and not visible in shared settings

**Checkable Acceptance Criteria**:
- [ ] Settings appear in VSCode settings UI under "Gofer > AI Usage"
- [ ] Settings have clear descriptions explaining admin key requirement
- [ ] Configuration changes trigger immediate re-fetch (no restart required)
- [ ] Admin keys are stored separately from regular API keys
- [ ] Settings validation detects invalid key formats (e.g., regular key in admin field)

---

### User Story 4 - Graceful Degradation (Priority: P2)

As a developer, I want the panel to gracefully handle missing configuration so that partial setup still provides value and I understand what's needed to get full data.

**Why this priority**: User experience polish that prevents confusion. Makes the feature accessible to users who only use one provider.

**Independent Test**: Test by configuring zero admin keys, then one, then both, verifying appropriate messaging at each stage.

**Acceptance Scenarios**:

1. **Given** No admin API keys are configured, **When** I open the panel, **Then** I see "Not configured" placeholders for both providers with actionable setup instructions
2. **Given** Only Anthropic admin key is configured, **When** I view the panel, **Then** Anthropic shows real data while OpenAI shows "Configure admin key to view usage"
3. **Given** I'm using Google Gemini as my council provider, **When** I view the panel, **Then** I see "Billing API not available for Google" with an explanation

**Checkable Acceptance Criteria**:
- [ ] Three-tier fallback works: Admin key → "Admin key needed" → "Not configured"
- [ ] Each provider degrades independently
- [ ] Google provider always shows "API not available" (no billing API exists)
- [ ] Status bar shows highest priority error across all providers
- [ ] Help links guide users to provider admin key documentation

---

### User Story 5 - Automatic Refresh (Priority: P3)

As a developer, I want usage data to refresh automatically so that I always see current data without manual intervention.

**Why this priority**: Nice-to-have that improves UX but not critical for MVP. Manual refresh would be acceptable.

**Independent Test**: Configure admin keys, wait 60 seconds, verify panel updates without user action.

**Acceptance Scenarios**:

1. **Given** The panel is open and admin keys configured, **When** 60 seconds elapse, **Then** Usage data refreshes automatically
2. **Given** I'm running expensive API operations, **When** I check the panel 2 minutes later, **Then** The new usage appears in the data (subject to provider API delay)
3. **Given** The extension has been idle for 10 minutes, **When** I return and view the panel, **Then** It immediately triggers a fresh API call before showing data

**Checkable Acceptance Criteria**:
- [ ] Default polling interval is 60 seconds for API calls
- [ ] Polling stops when panel is not visible (resource optimization)
- [ ] First view after idle period triggers immediate fetch
- [ ] Polling interval is configurable via `gofer.aiUsage.api.pollingInterval`
- [ ] Network failures don't stop polling (retry with backoff)

---

### Edge Cases

- **What happens when admin API key is revoked mid-session?** → Monitor detects 401/403 errors, stops polling, shows "Authentication failed" with actionable message
- **What happens when provider API is down?** → Monitor retries with exponential backoff (2s, 4s, 8s, max 60s), shows "Service unavailable" after 3 failures, keeps last known good data visible
- **What happens when usage data is delayed?** → Panel shows timestamp of last API update ("Data as of 10:45 AM") so users know it's not real-time
- **What happens when billing period rolls over?** → API returns empty buckets for new period, panel shows $0.00 with "(no usage yet today)" explanation
- **What happens when user switches providers mid-stream?** → Each provider's data is independent; switching active provider in council doesn't affect billing panel display
- **What happens when API returns unexpected response format?** → Monitor validates response schema, falls back to showing error + last known data, logs detailed error for debugging
- **What happens with multiple VSCode windows?** → Each window polls independently (stateless API calls), minor inefficiency acceptable
- **What happens when organization has no usage in the time period?** → Panel shows "No usage in this period" instead of errors

## Requirements

### Functional Requirements

- **FR-001**: System MUST call Anthropic's `GET /v1/organizations/usage_report/messages` API when `gofer.anthropicAdminApiKey` is configured to retrieve token usage data
- **FR-002**: System MUST call Anthropic's `GET /v1/organizations/cost_report` API to retrieve cost data in USD cents and convert to dollars
- **FR-003**: System MUST call OpenAI's `GET /v1/organization/usage/completions` API when `gofer.openaiAdminApiKey` is configured to retrieve token usage data
- **FR-004**: System MUST call OpenAI's `GET /v1/organization/costs` API to retrieve cost data in the provider's currency format
- **FR-005**: System MUST validate admin API key format before making API calls (Anthropic: starts with `sk-ant-admin`, OpenAI: admin key format)
- **FR-006**: System MUST use 1-hour bucket width (`1h`) for "Today" period queries to provider APIs
- **FR-007**: System MUST use 1-day bucket width (`1d`) for "Week" period queries to provider APIs
- **FR-008**: System MUST send ISO 8601 timestamps for Anthropic API queries (`starting_at`, `ending_at`)
- **FR-009**: System MUST send Unix timestamps (seconds) for OpenAI API queries (`start_time`, `end_time`)
- **FR-010**: System MUST group API responses by model using `group_by[]=model` (Anthropic) or `group_by: ["model"]` (OpenAI)
- **FR-011**: System MUST transform provider API responses into the existing `UsageSummary` interface shape to maintain compatibility with `AIUsageMonitor.mapSummaryToUsageData()`
- **FR-012**: System MUST include Anthropic API version header `anthropic-version: 2023-06-01` in all requests
- **FR-013**: System MUST include admin API key in `x-api-key` header for Anthropic requests
- **FR-014**: System MUST include admin API key in `Authorization: Bearer` header for OpenAI requests
- **FR-015**: System MUST poll provider APIs at configurable interval (default 60 seconds) when admin keys are configured
- **FR-016**: System MUST stop polling when no admin keys are configured to avoid unnecessary API calls
- **FR-017**: System MUST implement three-tier fallback per provider: (1) Admin key available → call API, (2) No admin key + regular key → show "Admin key required", (3) No keys → show "Not configured"
- **FR-018**: System MUST show "Billing API not available" for Google/Gemini provider (no API exists)
- **FR-019**: System MUST detect configuration changes for admin API keys within 5 seconds and trigger re-fetch
- **FR-020**: System MUST preserve existing `AIUsageProvider` and `AIUsageStatusBar` components without modification (contract stability)
- **FR-021**: System MUST use Node.js `https` module for API calls (no new npm dependencies)
- **FR-022**: System MUST retry failed API calls with exponential backoff (2s, 4s, 8s, max 60s between retries)
- **FR-023**: System MUST cache last successful API response and show it during temporary failures
- **FR-024**: System MUST log API errors with sufficient detail for debugging (endpoint, status code, error body) without exposing API keys
- **FR-025**: System MUST aggregate cache tokens separately: `cache_creation_input_tokens` and `cached_input_tokens` from Anthropic API

### Non-Functional Requirements

- **NFR-001**: Initial panel load MUST complete within 5 seconds (target: 2 seconds) after extension activation
- **NFR-002**: API polling MUST NOT block VSCode UI thread (all HTTP calls on async workers)
- **NFR-003**: Failed API calls MUST timeout after 10 seconds to prevent hanging
- **NFR-004**: Extension MUST NOT add new npm dependencies for HTTP client (use Node.js built-ins)
- **NFR-005**: Admin API keys MUST be stored in VSCode settings with secret storage support (masked in UI)
- **NFR-006**: Memory usage increase MUST be under 5MB for API client and cached responses
- **NFR-007**: Error messages MUST be actionable (guide user to fix, not just report failure)
- **NFR-008**: API response validation MUST fail gracefully (show last known data + error message)

### Key Entities

- **UsageApiClient**: HTTP client responsible for calling provider billing APIs (Anthropic usage, Anthropic cost, OpenAI usage, OpenAI cost). Implements same contract as current `UsageLogger` for transparent swap. Located in `extension/src/autonomous/UsageApiClient.ts`.
- **AdminApiKeyConfig**: Configuration wrapper for retrieving admin API keys from VSCode settings. Follows existing `ProviderFactory.getApiKey()` pattern. Returns `{ anthropicAdminKey?: string, openaiAdminKey?: string }`.
- **ProviderUsageResponse**: Normalized response format from provider APIs transformed into `UsageSummary` shape. Contains `{ provider, inputTokens, outputTokens, cacheCreationTokens, cachedTokens, totalCostUsd, period, buckets[] }`.
- **UsageSummary** (existing): Unchanged interface defined in `extension/src/types/aiUsage.ts`. Current contract: `{ providerId, totalTokens, totalCost, periodStart, periodEnd, models[] }`. New API client returns this exact shape.

## Success Criteria

### Measurable Outcomes

| ID | Metric | Target | Measurement Method |
|---|---|---|---|
| **SC-001** | Panel displays real Anthropic usage when admin key configured | 100% success rate | E2E test: configure admin key → verify non-zero usage appears |
| **SC-002** | Panel displays real OpenAI usage when admin key configured | 100% success rate | E2E test: configure admin key → verify non-zero usage appears |
| **SC-003** | Initial panel load time with admin keys configured | < 5 seconds (target: 2s) | Performance test: measure time from panel open to data render |
| **SC-004** | API polling interval configuration | Configurable 15-300s range | Unit test: set config value → verify polling interval matches |
| **SC-005** | Graceful handling of missing admin keys | Zero crashes or exceptions | Integration test: run with zero/partial/full key config |
| **SC-006** | API error recovery | Resume within 60s after transient failure | Integration test: simulate 503 error → verify retry succeeds |
| **SC-007** | No new npm dependencies added | 0 new dependencies | Verify `package.json` dependencies unchanged |
| **SC-008** | Existing UI components unchanged | Zero modifications to AIUsageProvider/StatusBar | Code review: verify no edits to UI files |
| **SC-009** | Configuration change detection latency | < 5 seconds | Integration test: change admin key → measure time to re-fetch |
| **SC-010** | Memory footprint increase | < 5MB | Memory profiler: compare before/after API client instantiation |

## Assumptions

1. **Admin API keys are obtainable**: Developers can access Anthropic/OpenAI admin consoles to generate admin API keys. If not, feature degrades gracefully with messaging.
2. **API endpoints are stable**: Anthropic and OpenAI billing API endpoints won't change without versioning or deprecation notices.
3. **Usage data has acceptable delay**: Users accept that API-sourced data has 5-10 minute delay (Anthropic) or near-real-time (OpenAI) latency.
4. **Workspace has network access**: Extension runs in environments where HTTPS requests to `api.anthropic.com` and `api.openai.com` are not blocked by firewalls/proxies.
5. **VSCode settings are persistent**: Admin API keys stored in settings.json persist across sessions.
6. **Single organization per provider**: Each admin API key maps to one organization. Multi-org scenarios are out of scope.
7. **USD currency for costs**: Both Anthropic and OpenAI return costs in USD (or convertible currency). Non-USD scenarios handled by showing raw currency value.

## Dependencies

### Internal Dependencies

| Component | Location | Dependency Type | Notes |
|---|---|---|---|
| AIUsageMonitor | `extension/src/autonomous/AIUsageMonitor.ts` | Modified | Replace `usageLogger` dependency with new `UsageApiClient` |
| ProviderFactory | `extension/src/council/providers/ProviderFactory.ts` | Pattern reuse | Copy `getApiKey()` pattern for admin keys |
| package.json | `extension/package.json` | Modified | Add `gofer.anthropicAdminApiKey` and `gofer.openaiAdminApiKey` settings |
| extension.ts | `extension/src/extension.ts:538-565` | Modified | Instantiate `UsageApiClient` instead of `UsageLogger` for AIUsageMonitor wiring |
| UsageSummary interface | `extension/src/types/aiUsage.ts` | Unchanged | New API client must return this exact shape |

### External Dependencies

| Provider | API Endpoint | Required Auth | Documentation |
|---|---|---|---|
| Anthropic Usage | `GET /v1/organizations/usage_report/messages` | Admin API key (`x-api-key`) | Anthropic Console > API Keys |
| Anthropic Cost | `GET /v1/organizations/cost_report` | Admin API key (`x-api-key`) | Anthropic Console > Billing |
| OpenAI Usage | `GET /v1/organization/usage/completions` | Admin API key (`Authorization: Bearer`) | OpenAI Platform > API Keys |
| OpenAI Cost | `GET /v1/organization/costs` | Admin API key (`Authorization: Bearer`) | OpenAI Platform > Usage |

### Configuration Dependencies

- **VSCode Settings API**: For reading/watching admin API key settings
- **Node.js https module**: For HTTP client (built-in, no install required)
- **Node.js crypto module**: For secure key validation (built-in)

## Out of Scope

The following capabilities are explicitly excluded from this feature:

1. **Google/Gemini Billing API Integration**: Google Cloud has no direct billing API for Vertex AI. Requires BigQuery export + Cloud project setup. Too complex for extension scope. Google usage shows "API not available" permanently.

2. **Local JSONL Tracking Removal**: Keep `council-usage.jsonl` and `UsageLogger` infrastructure intact. If CouncilOrchestrator writes usage logs in future, those can supplement API data. Removing JSONL breaks council logging.

3. **Historical Trend Analysis**: Current UI supports "Today", "Week", "Month" views. No new time ranges, charts, or analytics added. Use existing period dropdowns.

4. **Cost Alerts and Notifications**: No threshold-based alerts ("warn me if cost exceeds $X"). No VSCode notifications. Panel is passive display only.

5. **Multi-Organization Support**: Admin API key maps to single organization. No org-switching UI or multi-tenant views.

6. **Budget Management**: No budget setting, forecasting, or spend limits. Pure observability feature.

7. **Custom Time Ranges**: No date picker for arbitrary start/end dates. Use predefined "Today/Week/Month" periods from existing UI.

8. **Data Export**: No CSV/JSON export of usage data. View-only in panel.

9. **Real-Time Session Tracking**: Current session tracking (tokens used in active VSCode session) remains based on local logs, not API. API data is delayed by 5-10 minutes.

10. **Provider SDK Modifications**: No changes to `@anthropic-ai/sdk` or `openai` npm packages. API calls use raw HTTPS.

11. **Settings Migration**: No automatic migration of keys. Users manually configure admin keys in settings.

## Protected Boundaries

The following components MUST NOT be modified to maintain system stability:

### UI Components (Zero Changes)
- **AIUsageProvider** (`extension/src/ui/AIUsageProvider.ts`) — TreeView data provider, only consumes `AIUsageData` events
- **AIUsageStatusBar** (`extension/src/ui/AIUsageStatusBar.ts`) — Status bar item, only consumes `AIUsageData` events
- **AIUsageData interface** (`extension/src/types/aiUsage.ts`) — UI display contract must remain stable

### Council Infrastructure (Preserve Existing)
- **UsageLogger** (`extension/src/council/UsageLogger.ts`) — Keep unchanged, still needed for council logging to JSONL
- **CouncilOrchestrator** — May write to `council-usage.jsonl` in future, don't break that path
- **council-usage.jsonl file** — Keep as supplementary data source, don't delete

### Provider SDKs (No Direct Modification)
- **@anthropic-ai/sdk** npm package — Don't modify, don't call billing endpoints through SDK (not exposed)
- **openai** npm package — Don't modify, use raw HTTPS for billing APIs

### Configuration (Additive Only)
- **Existing API key settings** — Don't rename or remove `gofer.anthropicApiKey` or `gofer.openaiApiKey`
- **Existing aiUsage settings** — Don't change `gofer.aiUsage.pollingInterval` (file-based) behavior

### Extension Lifecycle (Minimal Impact)
- **DisposalService** — AIUsageMonitor disposal contract stays unchanged
- **Extension activation events** — No new activation events required
- **Workspace initialization** — AIUsageMonitor wiring stays in same location (extension.ts:538-565)

## Research Traceability

This specification is derived from the following research artifacts:

- **Research Document**: `/Users/douglaswross/Code/gofer/.specify/specs/026-provider-api-usage/research.md` (completed 2026-03-15)
- **Codebase Analysis**: AIUsageMonitor, ProviderFactory, AIUsageProvider, UsageLogger components analyzed for integration points
- **Technology Decisions**: Provider API support matrix, admin key strategy, polling interval, fallback strategy documented in research
- **API Documentation**: Anthropic Usage API, Anthropic Cost API, OpenAI Usage API, OpenAI Cost API endpoints validated
- **Pattern Identification**: ProviderFactory.getApiKey() pattern, AIUsageMonitor data source abstraction, polling-based monitoring infrastructure

### Key Research Findings Applied

1. **Data Source Swap Pattern**: Research identified `fetchUsageData() → mapSummaryToUsageData()` adapter chain enables transparent data source replacement without UI changes
2. **Admin Key Separation**: Research revealed both providers require separate admin API keys (Anthropic: `sk-ant-admin...`, OpenAI: admin scope), influencing configuration design
3. **Google API Gap**: Research confirmed no direct Google billing API exists (requires BigQuery), leading to explicit exclusion from scope
4. **Polling Interval**: Research recommended 60s default based on Anthropic rate limit guidance and inherent API data delay (5-10 min)
5. **Three-Tier Fallback**: Research identified need for graceful degradation when admin keys missing, informing FR-017 requirement
6. **Protected Boundaries**: Research confirmed UsageLogger still needed for council logging, preventing premature removal

### Research Coverage Assessment

- ✅ Provider API capabilities fully documented (Anthropic, OpenAI endpoints, auth, response formats)
- ✅ Integration points mapped (AIUsageMonitor, ProviderFactory, extension.ts wiring)
- ✅ Existing patterns identified (getApiKey, polling infrastructure, UsageSummary interface)
- ✅ Constraints documented (Google API unavailable, admin key requirement, API delay)
- ✅ Brownfield analysis complete (protected boundaries, downstream dependencies)
- ⚠️ Open question: "Current Session" tracking strategy (local vs API) — deferred to implementation
- ⚠️ Open question: Admin key validation on startup (adds latency) — deferred to implementation

---

## Appendix: API Response Examples

### Anthropic Usage Report Response

```json
{
  "data": [
    {
      "bucket": "2026-03-15T10:00:00Z",
      "input_tokens": 12500,
      "output_tokens": 3400,
      "cache_creation_input_tokens": 8000,
      "cached_input_tokens": 4500,
      "model": "claude-opus-4"
    }
  ]
}
```

### Anthropic Cost Report Response

```json
{
  "data": [
    {
      "bucket": "2026-03-15",
      "token_cost_usd_cents": 245,
      "model": "claude-opus-4"
    }
  ]
}
```

### OpenAI Usage Response

```json
{
  "data": [
    {
      "start_time": 1710496800,
      "end_time": 1710500400,
      "results": [
        {
          "object": "usage_by_model",
          "model": "gpt-4",
          "input_tokens": 8500,
          "output_tokens": 2100
        }
      ]
    }
  ]
}
```

### OpenAI Cost Response

```json
{
  "data": [
    {
      "start_time": 1710496800,
      "end_time": 1710500400,
      "results": [
        {
          "object": "cost_by_model",
          "model": "gpt-4",
          "amount": {
            "value": 1.85,
            "currency": "usd"
          }
        }
      ]
    }
  ]
}
```
