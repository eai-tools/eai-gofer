---
id: '025-ai-usage-tracking-internal-api'
title: 'Internal API Contracts - AI Token Cost Calculation'
status: draft
created: '2026-03-19T18:00:00Z'
updated: '2026-03-19T18:00:00Z'
author: Claude
feature: '025-ai-usage-tracking'
type: contracts
priority: critical
---

# Internal API Contracts - AI Token Cost Calculation Bug Fixes

## Overview

This document defines the internal function signatures and data contracts for
the AI Token Cost Calculation Bug Fixes feature. These are **internal TypeScript
APIs** (function signatures, method parameters, type definitions), not REST/HTTP
endpoints.

**Scope**: This feature modifies internal function signatures to support
model-specific pricing. All changes maintain backward compatibility through
optional parameters.

**Key APIs Affected**:

1. `calculateCost()` - Core cost calculation function
2. `getPricingForModel()` - New pricing lookup helper
3. `CostBudgetEnforcer.recordUsage()` - Budget tracking method
4. `ContextUsageLogger.logLLMCall()` - Usage logging method

---

## API 1: calculateCost Function

### Function Signature

```typescript
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  providerId?: string,
  modelId?: string
): number;
```

### Description

Calculate total cost in USD for given token counts and model. Core cost
calculation function used throughout the codebase for determining LLM API costs.

### Parameters

| Parameter      | Type     | Required | Default       | Description                                                 |
| -------------- | -------- | -------- | ------------- | ----------------------------------------------------------- |
| `inputTokens`  | `number` | Yes      | -             | Number of input tokens consumed (must be >= 0)              |
| `outputTokens` | `number` | Yes      | -             | Number of output tokens generated (must be >= 0)            |
| `providerId`   | `string` | No       | `'anthropic'` | Provider identifier (e.g., 'anthropic', 'openai', 'google') |
| `modelId`      | `string` | No       | `undefined`   | Model identifier (e.g., 'claude-sonnet-4-5', 'gpt-4-turbo') |

### Returns

**Type**: `number`

**Description**: Total cost in USD (floating-point value)

**Example Values**:

- `0.30` - $0.30 cost for 100K input tokens at $3/M rate
- `0.025` - $0.025 cost for 50K input + 10K output Haiku 3.5 tokens
- `5.25` - $5.25 cost for 100K input + 50K output Opus 4.6 tokens

### Behavior

1. **With modelId**: Uses `getPricingForModel(modelId, providerId)` for accurate
   model-specific rates
2. **Without modelId**: Falls back to provider-level pricing from
   `COST_PER_1K_TOKENS[providerId]` (backward compatible)
3. **Neither provided**: Uses `DEFAULT_PROVIDER` fallback ('anthropic')

**Calculation Formula**:

```typescript
const rates = modelId
  ? getPricingForModel(modelId, providerId)
  : COST_PER_1K_TOKENS[providerId];

return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
```

### Error Handling

**No throws**: Function never throws exceptions. All error conditions handled
via fallback strategy.

**Fallback Chain**:

1. Unknown model → Provider default model
2. Unknown provider → System default provider ('anthropic')
3. Invalid token counts (negative) → Treated as 0 (implementation detail)

### Backward Compatibility

**Status**: ✅ 100% Backward Compatible

**Existing Call Sites**: 7+ locations across codebase use current signature
without `modelId` parameter. All continue to work without modification.

**Migration Path**: Optional parameter allows incremental adoption. High-impact
call sites (ClaudeCodeUsageAdapter, CodexUsageAdapter) updated first, others
migrate later.

### User Stories Served

- **US-001**: Accurate Cost Display for Model Used (P1) - Enables model-specific
  cost calculations
- **US-002**: Correct Provider/Model Detection (P1) - Accepts detected model
  parameter
- **US-003**: Model-Based Pricing Lookup (P1) - Core function implementing
  model-based pricing
- **FR-003**: Backward Compatible Cost Calculation API - Optional parameter
  design

### Example Usage

```typescript
// NEW: Model-specific calculation (accurate)
const cost1 = calculateCost(100000, 50000, 'anthropic', 'claude-haiku-3-5');
// Returns: $0.0875 (100K * $0.25/M + 50K * $1.25/M) / 1000

// NEW: Model with provider
const cost2 = calculateCost(100000, 50000, 'openai', 'gpt-3.5-turbo');
// Returns: $0.125 (100K * $0.50/M + 50K * $1.50/M) / 1000

// OLD: Provider-level fallback (backward compatible)
const cost3 = calculateCost(100000, 50000, 'anthropic');
// Returns: $0.45 (uses generic anthropic rate)

// OLD: Default provider (backward compatible)
const cost4 = calculateCost(100000, 50000);
// Returns: $0.45 (uses DEFAULT_PROVIDER 'anthropic')
```

---

## API 2: getPricingForModel Function

### Function Signature

```typescript
export function getPricingForModel(
  modelId: string,
  providerId: string = DEFAULT_PROVIDER
): PricingConfig;
```

### Description

Get pricing configuration for specific model with fallback strategy. Handles
model ID variations (dated suffixes) via prefix matching. Always returns valid
pricing config, never undefined/null.

### Parameters

| Parameter    | Type     | Required | Default       | Description                                                               |
| ------------ | -------- | -------- | ------------- | ------------------------------------------------------------------------- |
| `modelId`    | `string` | Yes      | -             | Full model identifier (e.g., "claude-sonnet-4-5-20250929", "gpt-4-turbo") |
| `providerId` | `string` | No       | `'anthropic'` | Provider ID for fallback (e.g., 'anthropic', 'openai', 'google')          |

### Returns

**Type**: `PricingConfig`

**Structure**:

```typescript
interface PricingConfig {
  input: number; // Cost per 1K input tokens in USD
  output: number; // Cost per 1K output tokens in USD
}
```

**Example Values**:

```typescript
{ input: 0.003, output: 0.015 }   // Sonnet 4.5: $3/M, $15/M
{ input: 0.00025, output: 0.00125 } // Haiku 3.5: $0.25/M, $1.25/M
{ input: 0.03, output: 0.06 }      // GPT-4: $30/M, $60/M
```

### Fallback Strategy

**Hierarchy** (tries in order until success):

1. **Exact Match**: `MODEL_PRICING[modelId]`
   - Example: `"claude-sonnet-4-5"` → Direct lookup succeeds

2. **Prefix Match**: Iterate `MODEL_PRICING` keys, match if
   `modelId.startsWith(key)` or `key.startsWith(modelId)`
   - Example: `"claude-sonnet-4-5-20250929"` → Matches `"claude-sonnet-4-5"`
     prefix
   - Example: `"claude-sonnet"` → Matches `"claude-sonnet-4-5"` key

3. **Provider Default**: `MODEL_PRICING[DEFAULT_MODELS[providerId]]`
   - Example: Unknown model + `"anthropic"` → Returns Sonnet 4.5 rates (mid-tier
     default)

4. **System Default**: `COST_PER_1K_TOKENS[DEFAULT_PROVIDER]`
   - Example: Unknown model + unknown provider → Returns generic anthropic rates

### Behavior

**Pattern Source**: Mirrors `ClaudeSessionReader.getModelContextLimit()`
algorithm (lines 425-439), proven pattern for handling model ID versioning.

**Logging**: Warns when fallback triggered (levels 3-4 in hierarchy):

```typescript
Logger.for('pricing').warn(
  `Unknown model "${modelId}", using default "${defaultModel}"`
);
```

**Never Fails**: Always returns valid `PricingConfig`, never
`undefined`/`null`/throws.

### Error Handling

**No throws**: Function never throws exceptions.

**Unknown Inputs**: Handled via fallback hierarchy (always returns valid
pricing).

**Logging**: Warnings logged for debugging but do not interrupt execution.

### User Stories Served

- **US-003**: Model-Based Pricing Lookup Architecture (P1) - Core lookup
  function
- **FR-002**: Model Pricing Lookup with Prefix Matching - Implements
  exact/prefix/fallback strategy
- **FR-008**: Unknown Model Fallback Strategy - Graceful handling of unknown
  models
- **NFR-005**: Future-Proofing - Prefix matching handles new model versions
  automatically

### Example Usage

```typescript
// Exact match
const pricing1 = getPricingForModel('claude-sonnet-4-5', 'anthropic');
// Returns: { input: 0.003, output: 0.015 }

// Prefix match (dated variant)
const pricing2 = getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic');
// Returns: { input: 0.003, output: 0.015 } (matches "claude-sonnet-4-5" prefix)

// Prefix match (shorthand)
const pricing3 = getPricingForModel('claude-sonnet', 'anthropic');
// Returns: { input: 0.003, output: 0.015 } (matches "claude-sonnet-4-5" key)

// Fallback to provider default
const pricing4 = getPricingForModel('unknown-future-model', 'anthropic');
// Returns: { input: 0.003, output: 0.015 } (Sonnet 4.5 is anthropic default)
// Logs: "Unknown model 'unknown-future-model', using default 'claude-sonnet-4-5'"

// Ultimate fallback
const pricing5 = getPricingForModel('typo-model', 'unknown-provider');
// Returns: { input: 0.003, output: 0.015 } (system default)
// Logs: "Unknown model and provider, using default provider pricing"
```

---

## API 3: CostBudgetEnforcer.recordUsage Method

### Method Signature

```typescript
class CostBudgetEnforcer {
  recordUsage(
    inputTokens: number,
    outputTokens: number,
    providerId?: string,
    modelId?: string
  ): CostSnapshot;
}
```

### Description

Record token usage and calculate cumulative session cost. Tracks spending
against budget limits, enforces thresholds, returns snapshot with budget status.

### Parameters

| Parameter      | Type     | Required | Default       | Description                                          |
| -------------- | -------- | -------- | ------------- | ---------------------------------------------------- |
| `inputTokens`  | `number` | Yes      | -             | Number of input tokens for this operation            |
| `outputTokens` | `number` | Yes      | -             | Number of output tokens for this operation           |
| `providerId`   | `string` | No       | `'anthropic'` | Provider identifier (forwarded to `calculateCost()`) |
| `modelId`      | `string` | No       | `undefined`   | Model identifier (forwarded to `calculateCost()`)    |

### Returns

**Type**: `CostSnapshot`

**Structure**:

```typescript
interface CostSnapshot {
  totalCost: number; // Cumulative session cost in USD
  budgetLimit: number; // Configured budget limit in USD
  percentUsed: number; // Percentage of budget consumed (0-100)
  budgetStatus: 'OK' | 'WARNING' | 'EXCEEDED';
  tokensConsumed: {
    input: number; // Total input tokens this session
    output: number; // Total output tokens this session
  };
}
```

**Example Values**:

```typescript
{
  totalCost: 5.25,
  budgetLimit: 10.00,
  percentUsed: 52.5,
  budgetStatus: 'OK',
  tokensConsumed: { input: 500000, output: 250000 }
}
```

### Behavior

**Implementation**:

```typescript
recordUsage(inputTokens, outputTokens, providerId?, modelId?): CostSnapshot {
  // Calculate cost using provided parameters
  const cost = calculateCost(inputTokens, outputTokens, providerId, modelId);

  // Update cumulative totals
  this.sessionCost += cost;
  this.sessionTokens.input += inputTokens;
  this.sessionTokens.output += outputTokens;

  // Determine budget status
  const percentUsed = (this.sessionCost / this.budgetLimit) * 100;
  const status = percentUsed >= 100 ? 'EXCEEDED'
               : percentUsed >= 80 ? 'WARNING'
               : 'OK';

  return {
    totalCost: this.sessionCost,
    budgetLimit: this.budgetLimit,
    percentUsed,
    budgetStatus: status,
    tokensConsumed: this.sessionTokens
  };
}
```

**State Management**: Maintains session-level cumulative totals (cost, input
tokens, output tokens).

**Parameter Forwarding**: Directly forwards `providerId` and `modelId` to
`calculateCost()` without modification.

### Backward Compatibility

**Status**: ✅ 100% Backward Compatible

**Existing Call Sites**: All existing calls without `modelId` parameter continue
to work using provider-level pricing fallback.

### User Stories Served

- **US-002**: Correct Provider/Model Detection (P1) - Accepts and forwards model
  parameter
- **FR-005**: Model Parameter Propagation - Part of call chain from adapters →
  budget enforcer → calculateCost

### Example Usage

```typescript
const enforcer = new CostBudgetEnforcer({ budgetLimit: 10.0 });

// NEW: Model-specific recording (accurate)
const snapshot1 = enforcer.recordUsage(
  100000,
  50000,
  'anthropic',
  'claude-haiku-3-5'
);
// Uses Haiku rates: $0.0875

// NEW: Different model, different cost
const snapshot2 = enforcer.recordUsage(
  100000,
  50000,
  'anthropic',
  'claude-opus-4-6'
);
// Uses Opus rates: $5.25
// snapshot2.totalCost = $5.3375 (cumulative)

// OLD: Provider-level fallback (backward compatible)
const snapshot3 = enforcer.recordUsage(100000, 50000, 'anthropic');
// Uses generic anthropic rate: $0.45
```

---

## API 4: ContextUsageLogger.logLLMCall Method

### Method Signature

```typescript
class ContextUsageLogger {
  logLLMCall(
    operation: string,
    inputTokens: number,
    outputTokens: number,
    providerId: string,
    modelId?: string,
    metadata?: Record<string, unknown>
  ): void;
}
```

### Description

Log LLM API call with token usage and model information. Writes structured log
entry to usage log file for tracking and analysis.

### Parameters

| Parameter      | Type                      | Required | Default     | Description                                                 |
| -------------- | ------------------------- | -------- | ----------- | ----------------------------------------------------------- |
| `operation`    | `string`                  | Yes      | -           | Operation name (e.g., 'query', 'completion', 'embedding')   |
| `inputTokens`  | `number`                  | Yes      | -           | Input tokens consumed                                       |
| `outputTokens` | `number`                  | Yes      | -           | Output tokens generated                                     |
| `providerId`   | `string`                  | Yes      | -           | Provider identifier (e.g., 'anthropic', 'openai')           |
| `modelId`      | `string`                  | No       | `undefined` | Model identifier (e.g., 'claude-sonnet-4-5', 'gpt-4-turbo') |
| `metadata`     | `Record<string, unknown>` | No       | `{}`        | Additional metadata to include in log entry                 |

### Returns

**Type**: `void`

**Side Effect**: Appends JSON line to usage log file
(`.specify/logs/council-usage.jsonl`)

### Behavior

**Log Entry Format**:

```typescript
{
  timestamp: string;           // ISO 8601 timestamp
  operation: string;           // Operation name
  providerId: string;          // Provider ID
  modelId?: string;            // Model ID (if provided)
  inputTokens: number;         // Input tokens
  outputTokens: number;        // Output tokens
  cost: number;                // Calculated cost in USD
  metadata?: Record<string, unknown>; // Optional metadata
}
```

**Cost Calculation**: Internally calls
`calculateCost(inputTokens, outputTokens, providerId, modelId)` to include cost
in log entry.

**File I/O**: Appends to JSONL file (one JSON object per line). Creates file if
not exists.

### Backward Compatibility

**Status**: ✅ 100% Backward Compatible

**Existing Call Sites**: Optional `modelId` parameter allows existing calls
without model to continue working.

### User Stories Served

- **US-002**: Correct Provider/Model Detection (P1) - Logs model information for
  tracking
- **FR-005**: Model Parameter Propagation - Final link in call chain (logs model
  ID)

### Example Usage

```typescript
const logger = new ContextUsageLogger();

// NEW: Log with model (accurate cost)
logger.logLLMCall('query', 100000, 50000, 'anthropic', 'claude-haiku-3-5', {
  sessionId: 'abc123',
});
// Writes: { timestamp, operation: 'query', providerId: 'anthropic',
//           modelId: 'claude-haiku-3-5', inputTokens: 100000, outputTokens: 50000,
//           cost: 0.0875, metadata: { sessionId: 'abc123' } }

// OLD: Log without model (backward compatible)
logger.logLLMCall('query', 100000, 50000, 'anthropic');
// Writes: { timestamp, operation: 'query', providerId: 'anthropic',
//           inputTokens: 100000, outputTokens: 50000, cost: 0.45 }
```

---

## Type Definitions

### Type 1: PricingConfig

```typescript
interface PricingConfig {
  input: number; // Cost per 1,000 tokens in USD
  output: number; // Cost per 1,000 tokens in USD
}
```

**Description**: Pricing rates for input and output tokens. Used by all pricing
functions.

**Unit**: Per 1,000 tokens (not per token or per million). Matches provider
documentation format.

**Example Values**:

- `{ input: 0.003, output: 0.015 }` - Sonnet 4.5: $3/M, $15/M
- `{ input: 0.00025, output: 0.00125 }` - Haiku 3.5: $0.25/M, $1.25/M
- `{ input: 0.03, output: 0.06 }` - GPT-4: $30/M, $60/M

**Used By**: `MODEL_PRICING` registry, `getPricingForModel()`, `calculateCost()`

### Type 2: ProviderId

```typescript
type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'claude-code'
  | 'codex-cli'
  | 'copilot';
```

**Description**: Supported AI provider identifiers. String literal union type
for type safety.

**Values**:

- `'anthropic'` - Anthropic Claude API
- `'openai'` - OpenAI GPT API
- `'google'` - Google Gemini API
- `'claude-code'` - Claude Code CLI tool (uses Anthropic)
- `'codex-cli'` - Codex CLI tool (uses OpenAI)
- `'copilot'` - GitHub Copilot (uses OpenAI)

**Used By**: All pricing functions, usage adapters, budget enforcer, usage
logger

**Default**: `'anthropic'` (defined as `DEFAULT_PROVIDER` constant)

---

## Error Codes & Handling

### Error Strategy

**No Error Codes**: This feature uses **fallback strategy** instead of error
codes. All functions return valid values via progressive fallback chain.

**Design Rationale**: Better to show approximate cost than crash or show $0.
Users can investigate warnings if costs seem wrong, but feature remains
functional.

### Warning Conditions

| Code                    | Description                                        | Mitigation                                    | Logged |
| ----------------------- | -------------------------------------------------- | --------------------------------------------- | ------ |
| `WARN_UNKNOWN_MODEL`    | Model ID not found in `MODEL_PRICING` registry     | Falls back to provider default model          | Yes    |
| `WARN_UNKNOWN_PROVIDER` | Provider ID not in `DEFAULT_MODELS` mapping        | Falls back to system default provider         | Yes    |
| `WARN_STALE_PRICING`    | Pricing data >90 days old (via `isPricingStale()`) | Returns existing pricing, UI should warn user | Yes    |

### Logging Examples

```typescript
// WARN_UNKNOWN_MODEL
Logger.for('pricing').warn(
  `Unknown model "claude-mega-5", using default "claude-sonnet-4-5"`
);

// WARN_UNKNOWN_PROVIDER
Logger.for('pricing').warn(
  `Unknown model "typo-model" and provider "unknown-provider", using default provider pricing`
);

// WARN_STALE_PRICING
if (isPricingStale()) {
  Logger.for('pricing').warn(
    `Pricing data is stale (last updated: ${PRICING_LAST_UPDATED}), costs may be inaccurate`
  );
}
```

---

## Backward Compatibility Matrix

| API                                | Change                             | Backward Compatible | Migration Required        |
| ---------------------------------- | ---------------------------------- | ------------------- | ------------------------- |
| `calculateCost()`                  | Added optional `modelId` parameter | ✅ Yes              | No - Optional parameter   |
| `getPricingForModel()`             | New function                       | ✅ N/A              | No - New API              |
| `CostBudgetEnforcer.recordUsage()` | Added optional `modelId` parameter | ✅ Yes              | No - Optional parameter   |
| `ContextUsageLogger.logLLMCall()`  | Added optional `modelId` parameter | ✅ Yes              | No - Optional parameter   |
| `PricingConfig` type               | No change                          | ✅ Yes              | No - Existing type        |
| `ProviderId` type                  | Extended with new values           | ✅ Yes              | No - Union type extension |

**Summary**: 100% backward compatible. All changes use optional parameters. 7+
existing call sites continue to work without modification.

---

## User Stories Coverage

### Coverage Matrix

| User Story                                       | APIs Used                                          | Coverage    |
| ------------------------------------------------ | -------------------------------------------------- | ----------- |
| **US-001**: Accurate Cost Display for Model Used | `calculateCost()`, `getPricingForModel()`          | ✅ Complete |
| **US-002**: Correct Provider/Model Detection     | `calculateCost()`, `recordUsage()`, `logLLMCall()` | ✅ Complete |
| **US-003**: Model-Based Pricing Lookup           | `getPricingForModel()`, `MODEL_PRICING` registry   | ✅ Complete |
| **US-004**: Consolidated Pricing Source          | `MODEL_PRICING` import, remove duplicates          | ✅ Complete |
| **US-005**: Formula Verification                 | `calculateCost()` formula                          | ✅ Complete |

**Total Coverage**: 5/5 user stories (100%)

---

## API Stability Guarantees

### Versioning

**Current Version**: 1.0.0 (initial implementation)

**Versioning Scheme**: Follows semantic versioning (MAJOR.MINOR.PATCH)

- **MAJOR**: Breaking changes to required parameters
- **MINOR**: New optional parameters, new functions
- **PATCH**: Bug fixes, no signature changes

**This Release**: MINOR version change (added optional parameters to existing
functions)

### Deprecation Policy

**No Deprecations**: No APIs are deprecated in this release.

**Provider-Level Pricing**: Old `COST_PER_1K_TOKENS` registry remains available
as fallback mechanism. Not deprecated, but superseded by model-based pricing.

**Future Deprecation**: If provider-level pricing is deprecated in future, will
follow deprecation timeline:

1. Mark as deprecated in TypeScript (`@deprecated` JSDoc tag)
2. Log warnings when used (1 major version)
3. Remove in subsequent major version (minimum 1 year notice)

---

## Implementation Notes

### Pattern Sources

**Prefix Matching Algorithm**: Based on
`ClaudeSessionReader.getModelContextLimit()` (lines 425-439). Proven pattern in
production for handling model ID versioning.

**Model Extraction**: Based on `ClaudeSessionReader.extractUsageFromEntry()`
(lines 393-411). Demonstrates safe extraction with type guards and fallback.

**Provider Detection**: Based on `ClaudeCodeUsageAdapter.detectProvider()`
(lines 119-141). Existing logic for identifying provider from log files.

### Integration Points

| Component        | File                        | Line    | Change                                         |
| ---------------- | --------------------------- | ------- | ---------------------------------------------- |
| Pricing Registry | `pricing.ts`                | 23-27   | Add `MODEL_PRICING` (60+ entries)              |
| Cost Calculator  | `pricing.ts`                | 58-65   | Update `calculateCost()` signature             |
| Pricing Lookup   | `pricing.ts`                | New     | Add `getPricingForModel()` function            |
| Claude Adapter   | `ClaudeCodeUsageAdapter.ts` | 198     | Change from `'anthropic'` to `provider, model` |
| Codex Adapter    | `CodexUsageAdapter.ts`      | 181     | Change from `'openai'` to `'openai', model`    |
| Budget Enforcer  | `CostBudgetEnforcer.ts`     | 68-72   | Add optional `modelId` parameter               |
| Usage Logger     | `UsageLogger.ts`            | Updated | Add optional `modelId` parameter               |

### Testing Requirements

**Unit Tests** (new):

- `getPricingForModel()` exact match
- `getPricingForModel()` prefix match
- `getPricingForModel()` fallback (unknown model)
- `calculateCost()` with and without `modelId` parameter
- Verify all fallback paths return valid pricing

**Integration Tests** (new):

- End-to-end cost calculation for each supported model
- Verify different costs for same token count with different models
- Regression tests for existing provider-based calls (backward compatibility)

**Manual Verification**:

- Compare calculated costs to actual provider invoices
- Verify 1% accuracy requirement from discovery.md

---

## Metrics & Success Criteria

### Function Count

**Total APIs Modified**: 4

- `calculateCost()` - Signature change
- `getPricingForModel()` - New function
- `CostBudgetEnforcer.recordUsage()` - Signature change
- `ContextUsageLogger.logLLMCall()` - Signature change

### Type Definitions

**Total Type Definitions**: 2

- `PricingConfig` - Existing, reused
- `ProviderId` - Existing, extended

### Coverage

**User Stories Served**: 5/5 (100%)

- US-001: Accurate Cost Display (P1)
- US-002: Provider/Model Detection (P1)
- US-003: Model-Based Pricing (P1)
- US-004: Consolidated Pricing (P2)
- US-005: Formula Verification (P3)

### Backward Compatibility

**Status**: 100%

- All changes use optional parameters
- 7+ existing call sites continue to work without modification
- All existing tests pass without changes

---

## Contract Validation Checklist

- [x] All function signatures documented with TypeScript types
- [x] All parameters documented with type, required/optional, default,
      description
- [x] All return types documented with structure and example values
- [x] All error handling documented (fallback strategy, no throws)
- [x] Backward compatibility analysis complete (100% compatible)
- [x] User stories coverage complete (5/5 stories)
- [x] Integration points identified with file/line references
- [x] Testing requirements specified (unit, integration, manual)
- [x] Metrics tracked (4 functions, 2 types, 100% coverage)
- [x] No REST/HTTP endpoints (internal TypeScript APIs only)
- [x] No event-based contracts (synchronous function calls only)

---

## Summary

**Contract Type**: Internal TypeScript Function APIs

**Endpoints**: 0 REST/HTTP endpoints (internal APIs only)

**Functions Modified**: 4

- `calculateCost()` - Added optional `modelId` parameter
- `getPricingForModel()` - New function
- `CostBudgetEnforcer.recordUsage()` - Added optional `modelId` parameter
- `ContextUsageLogger.logLLMCall()` - Added optional `modelId` parameter

**Type Definitions**: 2

- `PricingConfig` - Existing interface for pricing rates
- `ProviderId` - Existing type extended with new provider IDs

**User Stories Served**: 5/5 (100%)

**Backward Compatibility**: 100% (all optional parameters)

**Error Handling**: Fallback strategy (no error codes, no throws)

**Success Metrics**:

- Function count: 4 modified APIs
- Type count: 2 definitions
- Coverage: 100% of user stories
- Compatibility: 100% backward compatible
