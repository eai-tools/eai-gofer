---
id: 026-provider-api-usage
title: Provider API Usage Tracking - Data Model
status: draft
created: 2026-03-15
author: Claude
document_type: data-model
---

# Data Model: Provider API Usage Tracking (Feature 026)

## Executive Summary

This document defines the data structures for Feature 026 (Provider API Usage Tracking). The feature integrates Anthropic and OpenAI billing APIs to replace empty local JSONL data sources with real usage metrics.

**Key principle**: New API response types are **normalized into existing `UsageSummary` interface**, enabling transparent data source swap without UI changes. The adapter chain `UsageApiClient.getUsageSummary() → AIUsageMonitor.mapSummaryToUsageData() → AIUsageProvider` remains identical to current file-based flow.

---

## Entity Overview

| Entity | Purpose | Location | Created/Modified | Scope |
|--------|---------|----------|------------------|-------|
| `UsageApiClient` | HTTP client for provider APIs | `extension/src/autonomous/UsageApiClient.ts` | NEW | Feature 026 |
| `AdminApiKeyConfig` | Configuration wrapper for admin keys | Same file or inline | NEW | Feature 026 |
| `AnthropicUsageResponse` | Anthropic API response types | Same file or inline | NEW | Feature 026 |
| `OpenAiUsageResponse` | OpenAI API response types | Same file or inline | NEW | Feature 026 |
| `ProviderApiError` | Standardized error handling | Same file or inline | NEW | Feature 026 |
| `UsageSummary` (existing) | Unified summary format | `extension/src/council/UsageLogger.ts` | UNCHANGED | Feature 025 |
| `AIUsageData` (existing) | UI display contract | `extension/src/types/aiUsage.ts` | UNCHANGED | Feature 025 |

**Total new entities**: 5 | **Total modified entities**: 0 | **Total unchanged contracts**: 2

---

## 1. Entity Definitions with Field Tables

### 1.1 AdminApiKeyConfig

**Purpose**: Encapsulate admin API key retrieval from VSCode settings, following the `ProviderFactory.getApiKey()` pattern.

**Scope**: In-memory configuration object, no persistence beyond VSCode settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `anthropicAdminKey` | `string \| undefined` | No | Anthropic admin API key (starts with `sk-ant-admin...`) |
| `openaiAdminKey` | `string \| undefined` | No | OpenAI admin API key |

**Validation Rules**:
- Anthropic key: Must start with `sk-ant-admin` or be undefined
- OpenAI key: Must follow OpenAI admin key format or be undefined
- At least one key must be defined to enable billing data fetching
- Keys are retrieved on-demand from VSCode settings; no caching in this struct

**Usage Pattern**:
```typescript
const config = AdminApiKeyConfig.fromSettings(); // Reads VSCode config
if (config.anthropicAdminKey) {
  // Make Anthropic billing API call
}
```

---

### 1.2 AnthropicUsageResponse

**Purpose**: Type-safe wrapper for Anthropic billing API responses. Used internally by `UsageApiClient`; never exposed to consumers.

#### 1.2.1 UsageReport Response

Anthropic `GET /v1/organizations/usage_report/messages` endpoint response.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | `AnthropicUsageBucket[]` | Yes | Array of hourly/daily usage buckets |

#### 1.2.2 UsageBucket

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bucket` | `string` (ISO 8601) | Yes | Bucket timestamp (e.g., `"2026-03-15T10:00:00Z"`) |
| `input_tokens` | `number` | Yes | Input tokens consumed in bucket |
| `output_tokens` | `number` | Yes | Output tokens generated in bucket |
| `cache_creation_input_tokens` | `number` | No | Tokens used to create cache in this bucket |
| `cached_input_tokens` | `number` | No | Cached tokens read (no charge) in this bucket |
| `model` | `string` | No | Model name if grouped by model (e.g., `"claude-opus-4"`) |

**Notes**:
- When query includes `group_by[]=model`, response includes one bucket per model per time period
- When aggregating multiple buckets, sum all token types separately
- Cache tokens should NOT be added to input tokens; they are separate line items

#### 1.2.3 CostReport Response

Anthropic `GET /v1/organizations/cost_report` endpoint response.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | `AnthropicCostBucket[]` | Yes | Array of daily cost buckets |

#### 1.2.4 CostBucket

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bucket` | `string` (date) | Yes | Bucket date (e.g., `"2026-03-15"`) |
| `token_cost_usd_cents` | `number` | Yes | Total cost for bucket in USD cents |
| `model` | `string` | No | Model name if grouped by model |

**Cost Conversion**: Divide by 100 to get USD dollars: `token_cost_usd_cents / 100 = USD`

---

### 1.3 OpenAiUsageResponse

**Purpose**: Type-safe wrapper for OpenAI billing API responses.

#### 1.3.1 Completions Usage Response

OpenAI `GET /v1/organization/usage/completions` endpoint response.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | `OpenAiBucket[]` | Yes | Array of usage time periods |

#### 1.3.2 UsageBucket

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_time` | `number` (Unix seconds) | Yes | Bucket start (Unix timestamp in seconds) |
| `end_time` | `number` (Unix seconds) | Yes | Bucket end (Unix timestamp in seconds) |
| `results` | `OpenAiUsageResult[]` | Yes | Array of usage by model |

#### 1.3.3 UsageResult

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | `"usage_by_model"` | Yes | Result type marker |
| `model` | `string` | Yes | Model name (e.g., `"gpt-4"`) |
| `input_tokens` | `number` | Yes | Input tokens consumed |
| `output_tokens` | `number` | Yes | Output tokens generated |

#### 1.3.4 Costs Response

OpenAI `GET /v1/organization/costs` endpoint response.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | `OpenAiBucket[]` | Yes | Array of cost time periods |

#### 1.3.5 CostBucket

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_time` | `number` (Unix seconds) | Yes | Bucket start |
| `end_time` | `number` (Unix seconds) | Yes | Bucket end |
| `results` | `OpenAiCostResult[]` | Yes | Array of costs by model |

#### 1.3.6 CostResult

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `object` | `"cost_by_model"` | Yes | Result type marker |
| `model` | `string` | Yes | Model name |
| `amount` | `OpenAiCostAmount` | Yes | Cost structure |

#### 1.3.7 CostAmount

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | `number` | Yes | Numeric cost (already in USD) |
| `currency` | `"usd"` | Yes | Currency code |

---

### 1.4 ProviderApiError

**Purpose**: Structured error handling for provider API failures, enabling graceful degradation and user-actionable messaging.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `"anthropic" \| "openai"` | Yes | Provider that failed |
| `statusCode` | `number` | No | HTTP status (401, 403, 429, 500, etc.) |
| `message` | `string` | Yes | User-friendly error message |
| `timestamp` | `number` | Yes | When error occurred (Unix ms) |
| `isRetryable` | `boolean` | Yes | Whether to retry with backoff |
| `retryAttempt` | `number` | Yes | Current retry attempt (0 = initial) |

**Error Classification**:

| Status | Message | Retryable | Backoff |
|--------|---------|-----------|---------|
| 401/403 | "Authentication failed: Invalid or revoked admin key" | No | Stop polling |
| 429 | "Rate limited, retrying in Xs" | Yes | Exponential backoff (2s, 4s, 8s, max 60s) |
| 500/502/503 | "Service unavailable, retrying in Xs" | Yes | Exponential backoff |
| Network timeout | "Connection timeout, retrying in Xs" | Yes | Exponential backoff |
| Parse error | "Unexpected API response format" | No | Log details, show last known data |

---

### 1.5 UsageApiClient (Unified Type Definition)

**Purpose**: Abstraction layer that calls provider APIs and normalizes responses into `UsageSummary` shape, enabling transparent swap with file-based `UsageLogger`.

**Key Design**: `UsageApiClient` is a **drop-in replacement** for `UsageLogger` in terms of the interface contract (methods it must implement).

#### Interface Contract

```typescript
interface IUsageDataSource {
  getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>;
}
```

Both `UsageLogger` and `UsageApiClient` implement this interface.

#### Method: getUsageSummary()

**Signature**:
```typescript
async getUsageSummary(fromDate?: Date, toDate?: Date): Promise<UsageSummary>
```

**Behavior**:
1. Read admin API keys from VSCode settings via `AdminApiKeyConfig.fromSettings()`
2. For each configured provider (Anthropic, OpenAI):
   - Fetch usage data from provider billing API
   - Fetch cost data from provider cost API
   - Normalize into intermediate format
3. Aggregate all provider data into single `UsageSummary` object
4. On error: Return last known cached `UsageSummary` + log detailed error for debugging
5. If no providers configured: Return empty `UsageSummary` (zero usage)

**Return Type**: `UsageSummary` (from existing `UsageLogger.ts`)

---

## 2. TypeScript Interface Definitions

### 2.1 Configuration Types

```typescript
/**
 * Admin API key configuration
 * Follows ProviderFactory.getApiKey() pattern
 */
interface AdminApiKeyConfig {
  anthropicAdminKey?: string;
  openaiAdminKey?: string;
}

/**
 * Static factory for retrieving admin keys from VSCode settings
 */
namespace AdminApiKeyConfig {
  export function fromSettings(): AdminApiKeyConfig {
    const config = vscode.workspace.getConfiguration('gofer');
    return {
      anthropicAdminKey: config.get<string>('anthropicAdminApiKey'),
      openaiAdminKey: config.get<string>('openaiAdminApiKey'),
    };
  }

  export function validate(cfg: AdminApiKeyConfig): ValidationResult {
    const errors: string[] = [];

    if (cfg.anthropicAdminKey && !cfg.anthropicAdminKey.startsWith('sk-ant-admin')) {
      errors.push('Anthropic admin key must start with sk-ant-admin');
    }

    if (!cfg.anthropicAdminKey && !cfg.openaiAdminKey) {
      errors.push('At least one admin API key must be configured');
    }

    return { isValid: errors.length === 0, errors };
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### 2.2 Anthropic Response Types

```typescript
/**
 * Anthropic billing API response: GET /v1/organizations/usage_report/messages
 */
interface AnthropicUsageResponse {
  data: AnthropicUsageBucket[];
}

interface AnthropicUsageBucket {
  bucket: string; // ISO 8601 timestamp, e.g., "2026-03-15T10:00:00Z"
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cached_input_tokens?: number;
  model?: string; // Present if grouped by model
}

/**
 * Anthropic billing API response: GET /v1/organizations/cost_report
 */
interface AnthropicCostResponse {
  data: AnthropicCostBucket[];
}

interface AnthropicCostBucket {
  bucket: string; // Date string, e.g., "2026-03-15"
  token_cost_usd_cents: number;
  model?: string; // Present if grouped by model
}
```

### 2.3 OpenAI Response Types

```typescript
/**
 * OpenAI billing API response: GET /v1/organization/usage/completions
 */
interface OpenAiUsageResponse {
  data: OpenAiUsageBucket[];
}

interface OpenAiUsageBucket {
  start_time: number; // Unix timestamp in seconds
  end_time: number;   // Unix timestamp in seconds
  results: OpenAiUsageResult[];
}

interface OpenAiUsageResult {
  object: 'usage_by_model';
  model: string; // e.g., "gpt-4"
  input_tokens: number;
  output_tokens: number;
}

/**
 * OpenAI billing API response: GET /v1/organization/costs
 */
interface OpenAiCostResponse {
  data: OpenAiCostBucket[];
}

interface OpenAiCostBucket {
  start_time: number;
  end_time: number;
  results: OpenAiCostResult[];
}

interface OpenAiCostResult {
  object: 'cost_by_model';
  model: string;
  amount: OpenAiCostAmount;
}

interface OpenAiCostAmount {
  value: number; // Already in USD
  currency: 'usd';
}
```

### 2.4 Error Types

```typescript
/**
 * Structured provider API error
 */
interface ProviderApiError extends Error {
  provider: 'anthropic' | 'openai';
  statusCode?: number;
  message: string;
  timestamp: number;
  isRetryable: boolean;
  retryAttempt: number;
}

/**
 * Factory for creating ProviderApiError instances
 */
namespace ProviderApiError {
  export function fromHttpError(
    provider: 'anthropic' | 'openai',
    statusCode: number,
    responseBody: string
  ): ProviderApiError {
    const isRetryable = [429, 500, 502, 503].includes(statusCode);
    const message = mapStatusToMessage(statusCode);

    return {
      name: 'ProviderApiError',
      provider,
      statusCode,
      message,
      timestamp: Date.now(),
      isRetryable,
      retryAttempt: 0,
    };
  }
}
```

### 2.5 Polling Configuration Type

```typescript
/**
 * Configuration for API polling behavior
 * Read from VSCode settings: gofer.aiUsage.api.pollingInterval
 */
interface ApiPollingConfig {
  enabled: boolean;
  intervalMs: number;        // Default 60000 (60s), range 15000-300000
  maxRetries: number;        // Default 3
  backoffMultiplier: number; // Default 2 (exponential backoff)
  maxBackoffMs: number;      // Default 60000 (max 60s between retries)
  timeoutMs: number;         // Default 10000 (10s per request)
}
```

---

## 3. API Response Type Mappings

### 3.1 Anthropic Usage → UsageSummary

**Transformation Process**:

1. **Fetch**: Call `GET /v1/organizations/usage_report/messages` with:
   - `starting_at`: ISO 8601 timestamp for period start
   - `ending_at`: ISO 8601 timestamp for period end
   - `bucket_width`: `1h` (today) or `1d` (week)
   - `group_by[]=model`: Group by model for per-model breakdown

2. **Normalize**: Aggregate buckets by model:
   ```
   byProvider['anthropic'] = {
     tokens: sum(input + output + cache_tokens),
     costUsd: (from cost API),
     sessions: 1 (billing API doesn't track sessions)
   }
   ```

3. **Return**: `UsageSummary` with:
   - `totalInputTokens`: Sum of all input_tokens
   - `totalOutputTokens`: Sum of all output_tokens
   - `totalCostUsd`: From cost API (see next mapping)
   - `byProvider['anthropic']`: Per-model breakdown aggregated

**Cache Token Handling** (FR-025):
- `cache_creation_input_tokens` → track separately, add to total input for display
- `cached_input_tokens` → track separately, do NOT charge (no cost for cached reads)
- Anthropic cost API includes cache costs in token_cost_usd_cents

### 3.2 Anthropic Cost → UsageSummary.totalCostUsd

**Transformation**:

1. **Fetch**: Call `GET /v1/organizations/cost_report` with same date range
2. **Sum**: `sum(token_cost_usd_cents for all buckets) / 100 = USD`
3. **Assign**: `UsageSummary.totalCostUsd = (cents / 100)`
4. **Per-provider**: Assign to `byProvider['anthropic'].costUsd`

**Note**: Cost API only returns `bucket_width=1d` (daily buckets), even if usage API uses hourly. Propagate daily cost to usage buckets.

### 3.3 OpenAI Usage → UsageSummary

**Transformation Process**:

1. **Fetch**: Call `GET /v1/organization/usage/completions` with:
   - `start_time`: Unix timestamp (seconds)
   - `end_time`: Unix timestamp (seconds)
   - `bucket_width`: `1h` or `1d`
   - `group_by: ["model"]`: Array format (note: different from Anthropic)

2. **Normalize**: For each bucket, iterate `results`:
   ```
   byProvider['openai'] = {
     tokens: sum(input + output across models),
     costUsd: (from cost API),
     sessions: 1
   }
   ```

3. **Return**: `UsageSummary` with OpenAI totals aggregated

**Key Difference from Anthropic**: OpenAI doesn't report cache metrics in usage endpoint.

### 3.4 OpenAI Cost → UsageSummary.totalCostUsd

**Transformation**:

1. **Fetch**: Call `GET /v1/organization/costs` with same time range
2. **Sum**: `sum(amount.value for all buckets and models) = USD` (already in USD, no conversion)
3. **Assign**: `UsageSummary.totalCostUsd = (sum)`
4. **Per-provider**: Assign to `byProvider['openai'].costUsd`

**Currency Note**: OpenAI returns `amount.currency === "usd"`. If ever different, log warning and show raw value.

---

## 4. Entity Relationships & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Extension Activation / Config Change Event                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ AdminApiKeyConfig   │
                    │ .fromSettings()     │  (VSCode config API)
                    └─────────────────────┘
                              ↓
           ┌──────────────────┴──────────────────┐
           ↓                                     ↓
    ┌─────────────────┐            ┌─────────────────┐
    │ Anthropic APIs  │            │ OpenAI APIs     │
    │ (Usage + Cost)  │            │ (Usage + Cost)  │
    └─────────────────┘            └─────────────────┘
           ↓                                     ↓
    ┌──────────────────────┐      ┌──────────────────────┐
    │ AnthropicUsageResp   │      │ OpenAiUsageResponse  │
    │ AnthropicCostResp    │      │ OpenAiCostResponse   │
    └──────────────────────┘      └──────────────────────┘
           ↓                                     ↓
           └──────────────────┬──────────────────┘
                              ↓
            ┌─────────────────────────────────┐
            │ UsageApiClient                  │
            │ .getUsageSummary()              │
            │ (Normalize & Aggregate)         │
            └─────────────────────────────────┘
                              ↓
            ┌─────────────────────────────────┐
            │ UsageSummary (existing type)    │
            │ {                               │
            │   totalInputTokens              │
            │   totalOutputTokens             │
            │   totalCostUsd                  │
            │   byProvider: {                 │
            │     anthropic: {...}            │
            │     openai: {...}               │
            │   }                             │
            │   byStage: {...}                │
            │ }                               │
            └─────────────────────────────────┘
                              ↓
            ┌─────────────────────────────────┐
            │ AIUsageMonitor                  │
            │ .mapSummaryToUsageData()        │ (UNCHANGED)
            └─────────────────────────────────┘
                              ↓
            ┌─────────────────────────────────┐
            │ AIUsageData (UI contract)       │
            │ {                               │
            │   period: "today" | "week"      │
            │   totalCostUsd                  │
            │   totalTokens                   │
            │   providers: [...]              │
            │ }                               │
            └─────────────────────────────────┘
                              ↓
        ┌─────────────────────┴──────────────────────┐
        ↓                                            ↓
    ┌─────────────────┐                    ┌──────────────────┐
    │ AIUsageProvider │                    │ AIUsageStatusBar │
    │ (TreeView)      │                    │ (Status Bar)     │
    └─────────────────┘                    └──────────────────┘
```

### Data Flow Description

1. **Configuration Phase**: `AdminApiKeyConfig.fromSettings()` reads VSCode settings
2. **API Call Phase**: `UsageApiClient` makes parallel HTTP calls to provider APIs
3. **Normalization Phase**: API responses (provider-specific types) are transformed
4. **Aggregation Phase**: All provider data merged into single `UsageSummary` object
5. **Adapter Phase**: `AIUsageMonitor.mapSummaryToUsageData()` converts `UsageSummary` → `AIUsageData` (unchanged)
6. **Display Phase**: `AIUsageProvider` and `AIUsageStatusBar` consume `AIUsageData` via events (unchanged)

**Key Insight**: Steps 5-6 are identical to current file-based flow. Only steps 1-4 are new.

---

## 5. Cache and Error Recovery

### 5.1 Last-Known-Good Cache

```typescript
interface LastKnownGoodCache {
  anthropic?: {
    summary: UsageSummary;
    timestamp: number;
    error?: ProviderApiError;
  };
  openai?: {
    summary: UsageSummary;
    timestamp: number;
    error?: ProviderApiError;
  };
}
```

**Behavior**:
- On API success: Store response in cache with timestamp
- On API failure: Return cached response + error object to caller
- If no cached response available: Return empty summary + error
- Cache persists for entire extension session (no persistence to disk)

### 5.2 Exponential Backoff Strategy

```typescript
interface RetryState {
  attempt: number;
  nextRetryMs: number;
  totalFailures: number;
}

// Backoff calculation
function calculateBackoff(retryState: RetryState): number {
  const baseDelay = 2000; // 2 seconds
  const multiplier = 2;
  const maxDelay = 60000; // 60 seconds

  const delay = Math.min(
    baseDelay * Math.pow(multiplier, retryState.attempt),
    maxDelay
  );

  return delay + Math.random() * 1000; // Add jitter (±1s)
}

// Sequence: 2s, 4s, 8s, 16s, 32s, 60s, 60s, ...
```

---

## 6. Validation Rules & Constraints

### 6.1 Data Validation

| Field | Validation | Remediation |
|-------|-----------|-------------|
| Admin key format | Must match provider pattern | Return error + cached data |
| API response schema | Must match expected structure | Log detailed error, return cached data |
| Token counts | Must be non-negative integers | Clamp to 0 if negative |
| Costs | Must be non-negative floats | Clamp to 0.00 if negative |
| Timestamps | Must be valid ISO 8601 or Unix | Reject bucket with invalid timestamp |
| Date ranges | `fromDate < toDate` | Return empty summary if invalid |

### 6.2 API Call Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Max request size | ~2KB (query params) | Provider APIs accept simple GET requests |
| Request timeout | 10 seconds | Prevent hanging; detect network issues |
| Max concurrent calls | 4 (per provider) | Respect rate limits |
| Min polling interval | 15 seconds | Prevent excessive API calls |
| Max polling interval | 300 seconds (5 min) | Balance freshness vs. load |
| Max retry attempts | 3 | After 3 failures, stop polling per provider |
| Max backoff delay | 60 seconds | Don't wait >1 min between attempts |

### 6.3 Memory Constraints

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Cached responses per provider | 10MB | Store last 30 days of daily buckets (~300 entries) |
| Total UsageApiClient memory | 5MB | Sum of all caches + in-flight buffers |
| Active HTTP connections | 2 | Per provider (usage + cost), sequential requests |

---

## 7. Existing Interfaces (Unchanged Contracts)

### 7.1 UsageSummary (from UsageLogger.ts)

```typescript
export interface UsageSummary {
  totalSessions: number;
  councilSessions: number;
  singleSessions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgDurationMs: number;
  byProvider: Record<string, { tokens: number; costUsd: number; sessions: number }>;
  byStage: Record<string, { tokens: number; costUsd: number; sessions: number }>;
  fromDate: string;
  toDate: string;
}
```

**How `UsageApiClient` populates this**:
- `totalSessions`: 1 (API returns aggregate, not session count)
- `councilSessions`: 0 (API doesn't distinguish)
- `singleSessions`: 0 (API doesn't distinguish)
- `totalInputTokens`: Sum of input_tokens from all buckets
- `totalOutputTokens`: Sum of output_tokens from all buckets
- `totalCostUsd`: From cost API
- `avgDurationMs`: 0 (not available from API)
- `byProvider`: Keyed by provider ID (`"anthropic"`, `"openai"`)
- `byStage`: Empty (API doesn't track stages)
- `fromDate`, `toDate`: ISO strings of query range

### 7.2 AIUsageData (from aiUsage.ts)

```typescript
export interface AIUsageData {
  period: UsagePeriod;
  totalCostUsd: number;
  totalTokens: number;
  providers: ProviderUsage[];
  budgetLimitUsd?: number;
  budgetPercentUsed?: number;
  budgetStatus?: BudgetStatus;
  sessionId?: string;
}

export interface ProviderUsage {
  providerId: ProviderId | string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
```

**Untouched by this feature**: `AIUsageMonitor.mapSummaryToUsageData()` already maps `UsageSummary` → `AIUsageData` correctly. No changes needed.

---

## 8. Configuration Schema (package.json)

**New VSCode settings for Feature 026**:

```json
{
  "gofer.anthropicAdminApiKey": {
    "type": "string",
    "description": "Anthropic admin API key for billing data (starts with sk-ant-admin...)",
    "scope": "resource",
    "sensitive": true
  },
  "gofer.openaiAdminApiKey": {
    "type": "string",
    "description": "OpenAI admin API key for billing data",
    "scope": "resource",
    "sensitive": true
  },
  "gofer.aiUsage.api.pollingInterval": {
    "type": "number",
    "description": "API polling interval in milliseconds (default 60000, range 15000-300000)",
    "default": 60000,
    "minimum": 15000,
    "maximum": 300000,
    "scope": "resource"
  }
}
```

---

## 9. Implementation Checklist

### 9.1 Type Definitions (all in UsageApiClient.ts)

- [ ] `AdminApiKeyConfig` interface + `fromSettings()` factory
- [ ] `AnthropicUsageResponse` + `AnthropicUsageBucket` + `AnthropicCostResponse` + `AnthropicCostBucket`
- [ ] `OpenAiUsageResponse` + `OpenAiUsageBucket` + `OpenAiUsageResult`
- [ ] `OpenAiCostResponse` + `OpenAiCostBucket` + `OpenAiCostResult` + `OpenAiCostAmount`
- [ ] `ProviderApiError` interface + factory
- [ ] `LastKnownGoodCache` interface
- [ ] `RetryState` interface
- [ ] `ApiPollingConfig` interface

### 9.2 Core Implementation

- [ ] `UsageApiClient` class skeleton (extends EventEmitter, implements `IUsageDataSource`)
- [ ] `async getUsageSummary(fromDate?, toDate?)` method
- [ ] Anthropic API call orchestration (usage + cost in parallel)
- [ ] OpenAI API call orchestration (usage + cost in parallel)
- [ ] Response validation + error handling
- [ ] Aggregation logic (byProvider, byStage field population)
- [ ] Cache management + last-known-good fallback
- [ ] Exponential backoff retry logic
- [ ] Polling loop (separate from getUsageSummary for flexibility)

### 9.3 Integration

- [ ] Update `extension.ts` wiring (line 538-565) to use `UsageApiClient` instead of `UsageLogger`
- [ ] Add package.json settings for admin keys + polling interval
- [ ] NO changes to: `AIUsageMonitor`, `AIUsageProvider`, `AIUsageStatusBar`, `UsageSummary`, `AIUsageData`

---

## 10. Testing Data Shapes

### 10.1 Example: Anthropic Usage Bucket

```json
{
  "bucket": "2026-03-15T10:00:00Z",
  "input_tokens": 12500,
  "output_tokens": 3400,
  "cache_creation_input_tokens": 8000,
  "cached_input_tokens": 4500,
  "model": "claude-opus-4"
}
```

**Maps to UsageSummary**:
```typescript
{
  totalInputTokens: 12500,
  totalOutputTokens: 3400,
  byProvider['anthropic']: {
    tokens: 12500 + 3400,
    costUsd: (from cost API),
    sessions: 1
  }
}
```

### 10.2 Example: OpenAI Usage Result

```json
{
  "object": "usage_by_model",
  "model": "gpt-4",
  "input_tokens": 8500,
  "output_tokens": 2100
}
```

**Maps to UsageSummary**:
```typescript
{
  totalInputTokens: 8500,
  totalOutputTokens: 2100,
  byProvider['openai']: {
    tokens: 8500 + 2100,
    costUsd: 1.85,
    sessions: 1
  }
}
```

---

## 11. Error Scenarios

### 11.1 Invalid Admin Key

**Flow**:
1. User enters invalid key in VSCode settings (e.g., doesn't start with `sk-ant-admin`)
2. `UsageApiClient.getUsageSummary()` calls `AdminApiKeyConfig.validate()`
3. Validation fails with error message
4. Return cached summary (if available) + error
5. Log: "Invalid Anthropic admin key format"
6. UI: Show "Admin key required" message

### 11.2 Network Timeout

**Flow**:
1. HTTP request exceeds 10 second timeout
2. Catch timeout error → classify as retryable
3. Calculate backoff: 2s wait
4. Retry (attempt 2/3)
5. If all 3 attempts fail: Stop polling, show last cached data + "Unable to fetch" error
6. Log: "Anthropic API unreachable after 3 attempts"
7. UI: Show last known cost with timestamp

### 11.3 API Returns Unexpected Schema

**Flow**:
1. Parse JSON response
2. Type guard fails (missing expected fields)
3. Log detailed error: "Anthropic usage response missing 'data' field"
4. Return cached summary + error
5. UI: Show last known data with error banner

---

## 12. Summary

| Aspect | Count |
|--------|-------|
| **New Type Definitions** | 15 (interfaces + types) |
| **New Classes** | 1 (UsageApiClient) |
| **Modified Existing Classes** | 0 (no changes to AIUsageMonitor, AIUsageProvider, etc.) |
| **New Enum Types** | 0 |
| **New Configuration Settings** | 3 (2 admin keys + 1 polling interval) |
| **API Response Types Defined** | 12 (6 Anthropic + 6 OpenAI) |
| **Error Handling Types** | 2 (ProviderApiError + RetryState) |
| **Supporting Types** | 3 (AdminApiKeyConfig, LastKnownGoodCache, ApiPollingConfig) |

**Key Data Flow**:
- Provider APIs → API Response Types → UsageApiClient → UsageSummary (existing) → AIUsageMonitor.mapSummaryToUsageData() (unchanged) → AIUsageData → UI

**Principles**:
- ✅ Zero changes to existing UI contracts
- ✅ Transparent data source swap (file-based → API-based)
- ✅ Graceful degradation on errors
- ✅ In-memory only (no persistence beyond VSCode settings)
- ✅ Follows existing patterns (ProviderFactory API key retrieval, EventEmitter for updates)

