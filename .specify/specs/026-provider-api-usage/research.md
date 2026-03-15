---
date: 2026-03-15T06:00:00Z
researcher: Claude
feature: '026-provider-api-usage'
status: complete
---

# Research: Provider API Usage Tracking

## Feature Summary

Replace the current AIUsageMonitor data source (empty local JSONL file) with real provider billing API calls to Anthropic and OpenAI, so the AI Token Usage panel shows actual subscription usage data instead of $0.

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| UsageApiClient (NEW) | `extension/src/autonomous/UsageApiClient.ts` | HTTP client calling provider billing APIs |
| AIUsageMonitor | `extension/src/autonomous/AIUsageMonitor.ts` | Replace UsageLogger dep with UsageApiClient |
| Extension wiring | `extension/src/extension.ts:538-565` | Instantiate API client instead of UsageLogger |
| Package.json config | `extension/package.json` | Add admin API key settings |

### Components That Stay Unchanged

| Component | Location | Why |
|-----------|----------|-----|
| AIUsageProvider | `extension/src/ui/AIUsageProvider.ts` | Only consumes AIUsageData via events |
| AIUsageStatusBar | `extension/src/ui/AIUsageStatusBar.ts` | Only consumes AIUsageData via events |
| aiUsage.ts types | `extension/src/types/aiUsage.ts` | Stable UI display contract |
| pricing.ts | `extension/src/config/pricing.ts` | Fallback if API doesn't return costs |

### Existing Patterns to Follow

#### Pattern 1: ProviderFactory API Key Retrieval

Found in: `extension/src/council/providers/ProviderFactory.ts:41-54`

```typescript
getApiKey(providerId: ProviderId): string | undefined {
  const config = vscode.workspace.getConfiguration('gofer');
  switch (providerId) {
    case 'anthropic': return config.get<string>('anthropicApiKey');
    case 'openai': return config.get<string>('openaiApiKey');
  }
}
```

Why relevant: New admin API keys should follow this exact pattern.

#### Pattern 2: AIUsageMonitor Data Source Abstraction

Found in: `extension/src/autonomous/AIUsageMonitor.ts:164-195`

The `fetchUsageData()` → `mapSummaryToUsageData()` adapter chain means we only need to swap the data source — the transformation layer and all consumers remain unchanged.

#### Pattern 3: Polling-based Monitoring

Found in: `extension/src/autonomous/AIUsageMonitor.ts:302-314`

The existing polling infrastructure (configurable interval, guard flags) can be reused for API polling.

### Integration Points

1. **ProviderFactory**: Reuse `getApiKey()` pattern for admin keys
2. **AIUsageMonitor constructor**: Replace `usageLogger: UsageLogger` with new interface
3. **Extension.ts wiring**: Lines 538-565, swap instantiation
4. **UsageSummary interface**: Keep identical — new client returns same shape

## Technology Decisions

### Decision 1: Provider API Support

| Provider | API Available? | Endpoint | Auth Required |
|----------|---------------|----------|---------------|
| **Anthropic** | Yes | `GET /v1/organizations/usage_report/messages` | Admin API key (`sk-ant-admin...`) |
| **Anthropic Cost** | Yes | `GET /v1/organizations/cost_report` | Admin API key |
| **OpenAI** | Yes | `GET /v1/organization/usage/completions` | Admin API key or key with `api.usage.read` scope |
| **OpenAI Cost** | Yes | `GET /v1/organization/costs` | Admin API key |
| **Google/Gemini** | **No** | None (requires BigQuery export) | N/A |

**Choice**: Support Anthropic and OpenAI billing APIs. Skip Google — no direct API exists. Google usage can be estimated from local council-usage.jsonl if it gets written, or shown as "N/A".

**Rationale**: The two providers with billing APIs cover the primary use case. Google's BigQuery approach requires Cloud project setup, service accounts, and OAuth — far too complex for a VSCode extension.

### Decision 2: Admin API Keys vs Regular Keys

**Problem**: Both Anthropic and OpenAI require **Admin API keys** for billing data. Regular API keys don't have billing access.

- Anthropic admin keys start with `sk-ant-admin...`
- OpenAI admin keys are separate from regular API keys

**Choice**: Add separate configuration settings for admin API keys:
- `gofer.anthropicAdminApiKey` — for billing API access
- `gofer.openaiAdminApiKey` — for billing API access

**Rationale**: Users may have regular API keys for council queries but not admin access. Keeping them separate allows partial functionality — if only one admin key is configured, show that provider's data. If none configured, fall back to local JSONL data.

### Decision 3: Polling Interval

**Choice**: Default 60 seconds for API polling (vs current 5s file polling).

**Rationale**:
- Anthropic recommends polling once per minute for sustained use
- API data has 5-10 minute delay anyway
- Reduces API call overhead
- Configurable via `gofer.aiUsage.api.pollingInterval`

### Decision 4: Data Granularity

**Choice**: Use `1h` bucket width for "Today" period, `1d` for "Week" period.

**Rationale**:
- Anthropic supports `1m`, `1h`, `1d` buckets
- OpenAI supports same granularity
- Hourly gives good visibility for current day
- Daily is sufficient for weekly view

### Decision 5: Fallback Strategy

**Choice**: Three-tier fallback:
1. **Admin API key available** → Call provider billing API (real data)
2. **No admin key, regular key available** → Show "Admin key needed" message
3. **No key at all** → Show "Not configured"

For Google: Always fall back to local council-usage.jsonl or show "API not available"

### Decision 6: HTTP Client

**Choice**: Use Node.js `https` module directly (no new dependencies).

**Rationale**: Both APIs are simple GET requests with query params and API key headers. The existing provider SDKs (Anthropic, OpenAI npm packages) don't expose billing endpoints. No dependency needed.

## API Details

### Anthropic Usage API

```
GET https://api.anthropic.com/v1/organizations/usage_report/messages
Headers:
  anthropic-version: 2023-06-01
  x-api-key: sk-ant-admin...
Query params:
  starting_at: ISO 8601 timestamp
  ending_at: ISO 8601 timestamp
  bucket_width: 1h | 1d
  group_by[]: model

Response: { data: [{ bucket, input_tokens, output_tokens, cache_creation_input_tokens, cached_input_tokens }] }
```

### Anthropic Cost API

```
GET https://api.anthropic.com/v1/organizations/cost_report
Headers: same
Query params:
  starting_at, ending_at
  bucket_width: 1d (only)
  group_by[]: model

Response: { data: [{ bucket, token_cost_usd_cents }] }
```

### OpenAI Usage API

```
GET https://api.openai.com/v1/organization/usage/completions
Headers:
  Authorization: Bearer sk-admin...
Query params:
  start_time: Unix timestamp (seconds)
  end_time: Unix timestamp (seconds)
  bucket_width: 1h | 1d
  group_by: ["model"]

Response: { data: [{ start_time, end_time, results: [{ input_tokens, output_tokens }] }] }
```

### OpenAI Cost API

```
GET https://api.openai.com/v1/organization/costs
Headers: same
Query params:
  start_time, end_time, bucket_width, group_by

Response: { data: [{ results: [{ amount: { value, currency } }] }] }
```

## Constraints & Considerations

- **Admin API keys are separate from regular keys**: Users need to obtain admin keys specifically for billing access. This is a setup friction point.
- **Data delay**: Anthropic ~5 min, OpenAI near-real-time. "Current Session" tracking from APIs will always lag.
- **No Google billing API**: Google usage will show as unavailable or estimated from local logs.
- **Rate limits**: Both providers support once-per-minute polling.
- **Existing council-usage.jsonl**: Keep as supplementary data source. If CouncilOrchestrator ever writes to it, that data can augment API data.

## Brownfield Analysis

### Components Being Modified

| Component | Risk | Mitigation |
|-----------|------|------------|
| AIUsageMonitor | Medium - swapping data source | Keep `UsageSummary` interface identical |
| package.json | Low - adding settings | No existing settings changed |
| extension.ts | Low - wiring change | Same injection pattern |

### Downstream Dependencies

- `AIUsageProvider` subscribes to `AIUsageMonitor` events → unchanged
- `AIUsageStatusBar` subscribes to `AIUsageMonitor` events → unchanged
- `DisposalService` disposes `AIUsageMonitor` → unchanged

### Protected Boundaries

- `UsageLogger` (council/UsageLogger.ts) — keep unchanged, still needed for council logging
- Provider SDKs — not modified
- Existing API key settings — not modified (new admin keys are additive)

## Open Questions

- [ ] Should "Current Session" use local tracking (immediate) + API data (delayed), or just API?
- [ ] Should we validate admin API keys on extension startup (adds latency)?

## Recommendations

1. **Create `UsageApiClient` class** that implements the same `getUsageSummary()` contract as `UsageLogger`, making the swap transparent to `AIUsageMonitor`.
2. **Add separate admin API key settings** — don't repurpose existing keys.
3. **Start with Anthropic + OpenAI only** — skip Google until they add a billing API.
4. **Use 60s polling** for API calls (vs 5s for file watching).
5. **Graceful degradation** — show whatever data is available, even if only one provider has an admin key configured.
