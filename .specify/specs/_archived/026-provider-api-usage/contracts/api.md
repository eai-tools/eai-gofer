# API Contracts: Provider Billing APIs

**Feature**: 026-Provider API Usage Tracking
**Created**: 2026-03-15
**Document Purpose**: Define request/response contracts for external provider billing APIs consumed by the extension

---

## Contract Overview

This document specifies the exact format, headers, query parameters, and error handling for the four external provider billing APIs that the extension calls to populate the AI Usage panel. These contracts are binding agreements between Gofer and the provider APIs.

| # | Endpoint | Provider | Purpose | Spec Requirement |
|---|----------|----------|---------|-------------------|
| 1 | `GET /v1/organizations/usage_report/messages` | Anthropic | Retrieve token usage by model | FR-001 |
| 2 | `GET /v1/organizations/cost_report` | Anthropic | Retrieve cost data in USD cents | FR-002 |
| 3 | `GET /v1/organization/usage/completions` | OpenAI | Retrieve token usage by model | FR-003 |
| 4 | `GET /v1/organization/costs` | OpenAI | Retrieve cost data by model | FR-004 |

---

## Endpoint 1: Anthropic Usage Report

**Requirement IDs**: FR-001, FR-008, FR-010, FR-012, FR-013, FR-025

### Purpose
Retrieve token usage (input, output, cached, cache_creation) for an organization, grouped by model, with hourly or daily bucket granularity.

### Request

**Method**: `GET`

**Base URL**: `https://api.anthropic.com`

**Path**: `/v1/organizations/usage_report/messages`

**Headers**:
```
Authorization: (Not used for Anthropic billing)
x-api-key: {admin_api_key}
anthropic-version: 2023-06-01
User-Agent: gofer-extension/<version>
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Format | Example | Notes |
|-----------|------|----------|--------|---------|-------|
| `starting_at` | string | Yes | ISO 8601 | `2026-03-15T00:00:00Z` | Start of time window (must be UTC) |
| `ending_at` | string | Yes | ISO 8601 | `2026-03-15T23:59:59Z` | End of time window (must be UTC) |
| `bucket_width` | string | No | Enum: `1h`, `1d` | `1h` | Granularity. Default: `1d`. Use `1h` for "Today", `1d` for "Week"/"Month" (FR-006, FR-007) |
| `group_by[]` | string | Yes | Array | `group_by[]=model` | Always request grouping by model (FR-010) |

**Example Request**:
```bash
GET /v1/organizations/usage_report/messages?starting_at=2026-03-15T00:00:00Z&ending_at=2026-03-15T23:59:59Z&bucket_width=1h&group_by[]=model HTTP/1.1
Host: api.anthropic.com
x-api-key: sk-ant-admin-xxxxx
anthropic-version: 2023-06-01
User-Agent: gofer-extension/1.20.0
```

### Response

**Status Code**: `200 OK`

**Content-Type**: `application/json`

**Schema**:
```typescript
interface AnthropicUsageReportResponse {
  data: AnthropicUsageBucket[];
}

interface AnthropicUsageBucket {
  bucket: string;                           // ISO 8601 timestamp of bucket start
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;     // Tokens used to create cache
  cached_input_tokens: number;              // Tokens retrieved from cache
  model: string;                            // Model identifier (e.g., "claude-opus-4")
}
```

**Example Response (1-hour granularity)**:
```json
{
  "data": [
    {
      "bucket": "2026-03-15T00:00:00Z",
      "input_tokens": 12500,
      "output_tokens": 3400,
      "cache_creation_input_tokens": 8000,
      "cached_input_tokens": 4500,
      "model": "claude-opus-4"
    },
    {
      "bucket": "2026-03-15T01:00:00Z",
      "input_tokens": 9800,
      "output_tokens": 2100,
      "cache_creation_input_tokens": 3200,
      "cached_input_tokens": 2800,
      "model": "claude-opus-4"
    },
    {
      "bucket": "2026-03-15T00:00:00Z",
      "input_tokens": 4500,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 0,
      "cached_input_tokens": 0,
      "model": "claude-3-5-sonnet"
    }
  ]
}
```

**Example Response (empty period)**:
```json
{
  "data": []
}
```

### Error Handling

**401 Unauthorized**
- **Trigger**: Invalid, expired, or revoked admin API key
- **Response Format**:
```json
{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "Invalid API key"
  }
}
```
- **Handling**: Stop polling, show "Authentication failed: Check admin API key in settings"
- **Requirement**: FR-024 (detailed logging without exposing key)

**403 Forbidden**
- **Trigger**: Admin key lacks billing scope (e.g., regular key used instead of admin key)
- **Response Format**:
```json
{
  "type": "error",
  "error": {
    "type": "permission_error",
    "message": "This key does not have access to billing APIs"
  }
}
```
- **Handling**: Show "Billing access denied: Use admin API key (sk-ant-admin-...)"

**400 Bad Request**
- **Trigger**: Invalid query parameters (e.g., malformed timestamp)
- **Response Format**:
```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid starting_at format"
  }
}
```
- **Handling**: Log error, retry with corrected parameters

**429 Too Many Requests**
- **Trigger**: Rate limit exceeded
- **Response Headers**: `Retry-After: 60` (seconds)
- **Handling**: Implement exponential backoff: 2s, 4s, 8s, max 60s (FR-022)

**503 Service Unavailable**
- **Trigger**: Anthropic API temporary outage
- **Response Format**:
```json
{
  "type": "error",
  "error": {
    "type": "api_error",
    "message": "Service temporarily unavailable"
  }
}
```
- **Handling**: Retry with backoff, show cached data if available (FR-023)

**504 Gateway Timeout**
- **Trigger**: Request took longer than provider timeout
- **Handling**: Treat as transient, retry with backoff

**Network Timeout**
- **Timeout**: 10 seconds (NFR-003)
- **Handling**: Treat as transient error, implement exponential backoff

---

## Endpoint 2: Anthropic Cost Report

**Requirement IDs**: FR-002, FR-008, FR-010, FR-012, FR-013

### Purpose
Retrieve cost data (in USD cents) for an organization, grouped by model, with daily bucket granularity.

### Request

**Method**: `GET`

**Base URL**: `https://api.anthropic.com`

**Path**: `/v1/organizations/cost_report`

**Headers**:
```
x-api-key: {admin_api_key}
anthropic-version: 2023-06-01
User-Agent: gofer-extension/<version>
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Format | Example | Notes |
|-----------|------|----------|--------|---------|-------|
| `starting_at` | string | Yes | ISO 8601 date (YYYY-MM-DD) | `2026-03-15` | Start date for cost window |
| `ending_at` | string | Yes | ISO 8601 date (YYYY-MM-DD) | `2026-03-21` | End date for cost window |
| `group_by[]` | string | Yes | Array | `group_by[]=model` | Always request grouping by model (FR-010) |

**Notes**:
- Cost Report API uses **date-only format** (not full timestamps like Usage Report)
- Bucket width is always 1 day
- Query for "Today": `starting_at=2026-03-15&ending_at=2026-03-15`
- Query for "Week": `starting_at=2026-03-15&ending_at=2026-03-21`

**Example Request**:
```bash
GET /v1/organizations/cost_report?starting_at=2026-03-15&ending_at=2026-03-15&group_by[]=model HTTP/1.1
Host: api.anthropic.com
x-api-key: sk-ant-admin-xxxxx
anthropic-version: 2023-06-01
User-Agent: gofer-extension/1.20.0
```

### Response

**Status Code**: `200 OK`

**Content-Type**: `application/json`

**Schema**:
```typescript
interface AnthropicCostReportResponse {
  data: AnthropicCostBucket[];
}

interface AnthropicCostBucket {
  bucket: string;                 // ISO 8601 date (YYYY-MM-DD)
  token_cost_usd_cents: number;  // Total cost in USD cents (must divide by 100 for dollars)
  model: string;                  // Model identifier
}
```

**Example Response**:
```json
{
  "data": [
    {
      "bucket": "2026-03-15",
      "token_cost_usd_cents": 24500,
      "model": "claude-opus-4"
    },
    {
      "bucket": "2026-03-15",
      "token_cost_usd_cents": 8300,
      "model": "claude-3-5-sonnet"
    }
  ]
}
```

**Conversion Formula**: `cost_usd = token_cost_usd_cents / 100`
- Example: `24500` cents = `$245.00` (FR-002)

### Error Handling

**Same as Endpoint 1** (Anthropic Usage Report). Anthropic returns consistent error formats across billing APIs.

---

## Endpoint 3: OpenAI Usage API

**Requirement IDs**: FR-003, FR-009, FR-010, FR-014

### Purpose
Retrieve token usage (input, output) for an organization grouped by model, with customizable time windows.

### Request

**Method**: `GET`

**Base URL**: `https://api.openai.com`

**Path**: `/v1/organization/usage/completions`

**Headers**:
```
Authorization: Bearer {admin_api_key}
User-Agent: gofer-extension/<version>
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Format | Example | Notes |
|-----------|------|----------|--------|---------|-------|
| `start_time` | integer | Yes | Unix timestamp (seconds) | `1710547200` | Window start (must be UTC epoch seconds) |
| `end_time` | integer | Yes | Unix timestamp (seconds) | `1710633599` | Window end (must be UTC epoch seconds) |
| `group_by` | string | Yes | Comma-separated or JSON | `["model"]` | Group results by model |
| `limit` | integer | No | 1-100 | `100` | Max results per page. Default: 100 |

**Notes**:
- OpenAI uses **Unix timestamps in seconds** (not ISO 8601 like Anthropic) (FR-009)
- To query "Today": Calculate `start_time` = today 00:00:00 UTC, `end_time` = today 23:59:59 UTC, convert both to Unix seconds
- Example for 2026-03-15:
  - `start_time = 1710547200` (2026-03-15T00:00:00Z)
  - `end_time = 1710633599` (2026-03-15T23:59:59Z)

**Example Request**:
```bash
GET /v1/organization/usage/completions?start_time=1710547200&end_time=1710633599&group_by=["model"] HTTP/1.1
Host: api.openai.com
Authorization: Bearer sk-org-xxxxx
User-Agent: gofer-extension/1.20.0
```

### Response

**Status Code**: `200 OK`

**Content-Type**: `application/json`

**Schema**:
```typescript
interface OpenAIUsageResponse {
  data: OpenAIUsagePeriod[];
}

interface OpenAIUsagePeriod {
  object: "usage_data";
  start_time: number;           // Unix timestamp (seconds)
  end_time: number;              // Unix timestamp (seconds)
  results: OpenAIUsageByModel[];
}

interface OpenAIUsageByModel {
  object: "usage_by_model";
  model: string;                 // Model identifier (e.g., "gpt-4")
  input_tokens: number;
  output_tokens: number;
}
```

**Example Response**:
```json
{
  "data": [
    {
      "object": "usage_data",
      "start_time": 1710547200,
      "end_time": 1710633599,
      "results": [
        {
          "object": "usage_by_model",
          "model": "gpt-4",
          "input_tokens": 8500,
          "output_tokens": 2100
        },
        {
          "object": "usage_by_model",
          "model": "gpt-3.5-turbo",
          "input_tokens": 3200,
          "output_tokens": 850
        }
      ]
    }
  ]
}
```

**Example Response (empty period)**:
```json
{
  "data": []
}
```

### Error Handling

**401 Unauthorized**
- **Trigger**: Invalid, expired, or revoked admin API key
- **Response Format**:
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Incorrect API key provided. You can find your API key at https://platform.openai.com/account/api-keys."
  }
}
```
- **Handling**: Stop polling, show "Authentication failed: Check admin API key in settings"

**403 Forbidden**
- **Trigger**: Admin key lacks billing scope
- **Response Format**:
```json
{
  "error": {
    "type": "permission_error",
    "message": "You do not have permission to access this resource"
  }
}
```
- **Handling**: Show "Billing access denied: Use organization admin API key"

**400 Bad Request**
- **Trigger**: Invalid parameters (e.g., start_time > end_time)
- **Response Format**:
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid start_time parameter"
  }
}
```
- **Handling**: Log error, retry with corrected parameters

**429 Too Many Requests**
- **Trigger**: Rate limit exceeded
- **Response Headers**: `Retry-After: 60` or `X-RateLimit-Reset-Requests`
- **Handling**: Implement exponential backoff: 2s, 4s, 8s, max 60s (FR-022)

**500 Internal Server Error**
- **Trigger**: OpenAI API internal error
- **Handling**: Retry with backoff, show cached data if available

**503 Service Unavailable**
- **Trigger**: OpenAI API temporary outage
- **Handling**: Retry with backoff, show cached data if available

**Network Timeout**
- **Timeout**: 10 seconds (NFR-003)
- **Handling**: Treat as transient error, implement exponential backoff

---

## Endpoint 4: OpenAI Cost API

**Requirement IDs**: FR-004, FR-009, FR-010, FR-014

### Purpose
Retrieve cost data (by model, in USD) for an organization with customizable time windows.

### Request

**Method**: `GET`

**Base URL**: `https://api.openai.com`

**Path**: `/v1/organization/costs`

**Headers**:
```
Authorization: Bearer {admin_api_key}
User-Agent: gofer-extension/<version>
Content-Type: application/json
```

**Query Parameters**:

| Parameter | Type | Required | Format | Example | Notes |
|-----------|------|----------|--------|---------|-------|
| `start_time` | integer | Yes | Unix timestamp (seconds) | `1710547200` | Window start |
| `end_time` | integer | Yes | Unix timestamp (seconds) | `1710633599` | Window end |
| `group_by` | string | Yes | Comma-separated or JSON | `["model"]` | Group results by model |
| `limit` | integer | No | 1-100 | `100` | Max results per page. Default: 100 |

**Example Request**:
```bash
GET /v1/organization/costs?start_time=1710547200&end_time=1710633599&group_by=["model"] HTTP/1.1
Host: api.openai.com
Authorization: Bearer sk-org-xxxxx
User-Agent: gofer-extension/1.20.0
```

### Response

**Status Code**: `200 OK`

**Content-Type**: `application/json`

**Schema**:
```typescript
interface OpenAICostResponse {
  data: OpenAICostPeriod[];
}

interface OpenAICostPeriod {
  object: "cost_data";
  start_time: number;            // Unix timestamp (seconds)
  end_time: number;               // Unix timestamp (seconds)
  results: OpenAICostByModel[];
}

interface OpenAICostByModel {
  object: "cost_by_model";
  model: string;                  // Model identifier
  amount: {
    value: number;                // Cost value (decimal)
    currency: string;              // Currency code (typically "usd")
  };
}
```

**Example Response**:
```json
{
  "data": [
    {
      "object": "cost_data",
      "start_time": 1710547200,
      "end_time": 1710633599,
      "results": [
        {
          "object": "cost_by_model",
          "model": "gpt-4",
          "amount": {
            "value": 12.85,
            "currency": "usd"
          }
        },
        {
          "object": "cost_by_model",
          "model": "gpt-3.5-turbo",
          "amount": {
            "value": 0.45,
            "currency": "usd"
          }
        }
      ]
    }
  ]
}
```

**Example Response (empty period)**:
```json
{
  "data": []
}
```

### Error Handling

**Same as OpenAI Usage API (Endpoint 3)**. OpenAI returns consistent error formats across usage and cost endpoints.

---

## Cross-Cutting Concerns

### Authentication

**Anthropic**: Header-based authentication
```
x-api-key: {admin_api_key}
```
- Admin key format: Starts with `sk-ant-admin-`
- Validation: Must match regex `/^sk-ant-admin-[a-zA-Z0-9]+$/` (FR-005)

**OpenAI**: Bearer token authentication
```
Authorization: Bearer {admin_api_key}
```
- Admin key format: Starts with `sk-org-`
- Validation: Must match regex `/^sk-org-[a-zA-Z0-9]+$/` (FR-005)

### Request Headers (Both Providers)

**Required**:
- `User-Agent: gofer-extension/<version>` — For provider telemetry and debugging
- `Content-Type: application/json` — Standard HTTP convention

**Provider-Specific**:
- **Anthropic**: `anthropic-version: 2023-06-01` (FR-012) — Required for Anthropic API versioning
- **OpenAI**: No version header required

### Response Caching

**Cache Semantics** (FR-023):
- Store successful responses in memory (in-process)
- Use cached response if API call fails temporarily
- Show "Data as of [timestamp]" in UI when displaying cached data
- Clear cache on authentication failure (401/403)
- Retain cache across transient failures (429, 503, 504, timeout)

**Cache TTL**: No explicit TTL required. Cache persists until next successful fetch.

### Retry Strategy

**Exponential Backoff** (FR-022):
- Initial delay: 2 seconds
- Backoff multiplier: 2x
- Sequence: 2s, 4s, 8s, 16s, 32s, 60s (max)
- Max attempts: Unlimited (retry until 401/403 or user intervention)
- Jitter: Add random ±10% to prevent thundering herd

**Transient Errors** (retry):
- 429 Too Many Requests
- 500 Internal Server Error
- 503 Service Unavailable
- 504 Gateway Timeout
- Network timeout (> 10 seconds)
- Connection refused / Network unreachable

**Permanent Errors** (do not retry, stop polling):
- 401 Unauthorized
- 403 Forbidden
- 400 Bad Request (only if parameter error)

### Timeout Behavior

**Connection Timeout**: 5 seconds (initiate connection)

**Read Timeout**: 10 seconds total (NFR-003)

**Total Request Timeout**: 10 seconds from request initiation to response completion

### Logging Requirements

**Error Logging** (FR-024):
- Log endpoint, HTTP method, status code, error message
- Log request parameters (sanitize API keys)
- Log response body (truncate to first 500 chars for large errors)
- Never log full API key values
- Use structured logging: `{ timestamp, level, component, endpoint, statusCode, errorType, errorMessage }`

**Example Log Entry**:
```
timestamp: 2026-03-15T10:30:45.123Z
level: ERROR
component: UsageApiClient
endpoint: /v1/organizations/usage_report/messages
method: GET
statusCode: 429
errorType: RateLimitError
errorMessage: Too Many Requests
retryAfter: 60
nextRetryAt: 2026-03-15T10:31:45.123Z
```

### Data Transformation Pipeline

**Contract Compliance** (FR-011):
- All provider responses are transformed into `UsageSummary` interface shape
- Transformation must preserve data integrity (no rounding before USD conversion)
- Aggregation: Sum tokens and costs across models
- Bucket aggregation: Group responses by time period

**Example Transformation (Anthropic)**:
```typescript
// Input: Anthropic Usage Report response
{
  "data": [
    { "bucket": "2026-03-15T00:00:00Z", "input_tokens": 12500, "model": "claude-opus-4" },
    { "bucket": "2026-03-15T01:00:00Z", "input_tokens": 9800, "model": "claude-opus-4" }
  ]
}

// Transformed to UsageSummary:
{
  "providerId": "anthropic",
  "totalTokens": 22300,  // 12500 + 9800
  "totalCost": 245.00,   // From cost report
  "periodStart": "2026-03-15T00:00:00Z",
  "periodEnd": "2026-03-15T23:59:59Z",
  "models": [
    { "name": "claude-opus-4", "inputTokens": 22300, "outputTokens": 0 }
  ]
}
```

---

## Configuration & Settings Integration

### Settings Keys

**Anthropic Admin Key**:
- Key: `gofer.anthropicAdminApiKey`
- Type: String
- Storage: VSCode secret storage
- Description: "Admin API key for Anthropic billing API (starts with sk-ant-admin-)"
- Scope: User (not workspace)

**OpenAI Admin Key**:
- Key: `gofer.openaiAdminApiKey`
- Type: String
- Storage: VSCode secret storage
- Description: "Admin API key for OpenAI billing API (starts with sk-org-)"
- Scope: User (not workspace)

**Polling Interval** (existing, reused):
- Key: `gofer.aiUsage.api.pollingInterval`
- Type: Number (milliseconds)
- Default: `60000` (60 seconds)
- Range: `15000` - `300000` (15s - 5m)
- Notes: Configurable per FR-142

### Configuration Change Detection

**Watch Strategy** (FR-019):
- Use VSCode `workspace.onDidChangeConfiguration()` event
- Debounce detection to 1 second
- Trigger immediate API fetch on config change
- Latency target: < 5 seconds from user change to panel update

---

## Endpoint Summary Table

| Endpoint | Provider | Auth | Method | Path | Query Params | Response Type | Cache |
|----------|----------|------|--------|------|--------------|---------------|-------|
| 1 | Anthropic | `x-api-key` | GET | `/v1/organizations/usage_report/messages` | `starting_at`, `ending_at`, `bucket_width`, `group_by[]` | `{ data: [] }` | Yes |
| 2 | Anthropic | `x-api-key` | GET | `/v1/organizations/cost_report` | `starting_at`, `ending_at`, `group_by[]` | `{ data: [] }` | Yes |
| 3 | OpenAI | `Authorization: Bearer` | GET | `/v1/organization/usage/completions` | `start_time`, `end_time`, `group_by`, `limit` | `{ data: [] }` | Yes |
| 4 | OpenAI | `Authorization: Bearer` | GET | `/v1/organization/costs` | `start_time`, `end_time`, `group_by`, `limit` | `{ data: [] }` | Yes |

---

## Requirement Traceability

| Requirement ID | Endpoint(s) | Contract Element | Status |
|----------------|-------------|------------------|--------|
| FR-001 | 1 | Usage report request/response | ✓ Specified |
| FR-002 | 2 | Cost report request/response | ✓ Specified |
| FR-003 | 3 | OpenAI usage request/response | ✓ Specified |
| FR-004 | 4 | OpenAI cost request/response | ✓ Specified |
| FR-005 | 1-4 | Key format validation regex | ✓ Specified |
| FR-006 | 1, 2 | Bucket width `1h` for "Today" | ✓ Specified |
| FR-007 | 1, 2 | Bucket width `1d` for "Week"/"Month" | ✓ Specified |
| FR-008 | 1, 2 | ISO 8601 timestamps for Anthropic | ✓ Specified |
| FR-009 | 3, 4 | Unix timestamps (seconds) for OpenAI | ✓ Specified |
| FR-010 | 1-4 | Group by model parameter | ✓ Specified |
| FR-012 | 1, 2 | Anthropic version header | ✓ Specified |
| FR-013 | 1, 2 | x-api-key header | ✓ Specified |
| FR-014 | 3, 4 | Bearer token header | ✓ Specified |
| FR-022 | 1-4 | Exponential backoff retry | ✓ Specified |
| FR-023 | 1-4 | Response caching | ✓ Specified |
| FR-024 | 1-4 | Sanitized error logging | ✓ Specified |
| FR-025 | 1 | Cache token aggregation | ✓ Specified |
| NFR-003 | 1-4 | 10-second timeout | ✓ Specified |

---

## Notes for Implementation

1. **Time Window Calculation**:
   - "Today": Start = today 00:00:00 UTC, End = today 23:59:59 UTC
   - "Week": Start = Monday 00:00:00 UTC, End = Sunday 23:59:59 UTC
   - Adjust based on user's timezone preference (if supported by UI)

2. **Model Name Normalization**:
   - Anthropic models: `claude-opus-4`, `claude-3-5-sonnet`
   - OpenAI models: `gpt-4`, `gpt-3.5-turbo`
   - Store as-is from API; UI handles display formatting

3. **Cost Aggregation**:
   - Anthropic: Sum `token_cost_usd_cents` across all models, divide by 100
   - OpenAI: Sum `amount.value` across all models (already in dollars)
   - Convert both to USD for display

4. **Empty Data Handling**:
   - Empty `data` array = period with no usage
   - Display: "No usage in this period"
   - Do NOT treat as error

5. **Concurrent Polling**:
   - Each provider polled independently
   - Stagger requests by 0-5 seconds to avoid thundering herd
   - Allow parallel requests (no global lock required)

---

## Document History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-03-15 | Design Phase | Initial contract specification |

