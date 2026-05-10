---
id: '025-ai-usage-tracking-bug-fix-data-model'
title: 'AI Token Cost Calculation Bug Fixes - Data Model'
status: draft
created: '2026-03-19T18:00:00Z'
updated: '2026-03-19T18:00:00Z'
author: Claude
feature: '025-ai-usage-tracking'
type: data-model
priority: critical
---

# AI Token Cost Calculation Bug Fixes - Data Model

## Overview

This data model defines the configuration structures, types, and validation
rules for the AI token cost calculation bug fixes. This is a bug fix feature
that modifies existing pricing configuration and cost calculation, not a new
feature with database entities.

### Key Changes

- **MODEL_PRICING**: New registry with 60+ model-specific pricing entries
  (replaces provider-level COST_PER_1K_TOKENS)
- **DEFAULT_MODELS**: New mapping from provider to default model for fallback
- **PricingConfig**: Existing interface (unchanged)
- **ProviderId**: Existing type (unchanged)
- **UsageLogEntry**: Needs `model` field added

### Data Storage

- **No database involved**: In-memory configuration only
- **No migrations**: Code change only
- **Pricing updates**: Update MODEL_PRICING table, bump PRICING_LAST_UPDATED

---

## 1. Configuration Data Structures

### 1.1 MODEL_PRICING Registry

**Purpose**: Model-level pricing configuration with input/output rates per 1,000
tokens.

**Structure**: `Record<string, PricingConfig>`

**Location**: `extension/src/config/pricing.ts`

**Format**:

| Model ID             | Input Rate ($/1K) | Output Rate ($/1K) | Notes                         |
| -------------------- | ----------------- | ------------------ | ----------------------------- |
| **Anthropic Claude** |                   |                    |                               |
| claude-opus-4-6      | 0.005             | 0.025              | $5/M, $25/M (highest tier)    |
| claude-opus-4-5      | 0.005             | 0.025              | Previous Opus version         |
| claude-opus-4        | 0.005             | 0.025              | Generic Opus 4                |
| claude-sonnet-4-5    | 0.003             | 0.015              | $3/M, $15/M (DEFAULT)         |
| claude-sonnet-4      | 0.003             | 0.015              | Generic Sonnet 4              |
| claude-3.5-sonnet    | 0.003             | 0.015              | Legacy naming                 |
| claude-3-5-sonnet    | 0.003             | 0.015              | Alternative naming            |
| claude-haiku-4-5     | 0.001             | 0.005              | $1/M, $5/M                    |
| claude-haiku-3-5     | 0.00025           | 0.00125            | $0.25/M, $1.25/M (cheapest)   |
| claude-3-5-haiku     | 0.00025           | 0.00125            | Legacy naming                 |
| claude-3-haiku       | 0.00025           | 0.00125            | Claude 3 Haiku                |
| **OpenAI GPT**       |                   |                    |                               |
| gpt-4                | 0.03              | 0.06               | $30/M, $60/M (most expensive) |
| gpt-4-turbo          | 0.01              | 0.03               | $10/M, $30/M (Codex default)  |
| gpt-4o               | 0.005             | 0.015              | $5/M, $15/M (GPT-4 optimized) |
| gpt-3.5-turbo        | 0.0005            | 0.0015             | $0.50/M, $1.50/M (cheapest)   |
| gpt-3.5              | 0.0005            | 0.0015             | Generic GPT-3.5               |
| o1                   | 0.015             | 0.06               | $15/M, $60/M (reasoning)      |
| o1-mini              | 0.003             | 0.012              | $3/M, $12/M (reasoning lite)  |
| **Google Gemini**    |                   |                    |                               |
| gemini-1.5-pro       | 0.00125           | 0.005              | $1.25/M, $5/M                 |
| gemini-1.5-flash     | 0.000075          | 0.0003             | $0.075/M, $0.30/M (cheapest)  |
| gemini-pro           | 0.0005            | 0.0015             | $0.50/M, $1.50/M              |

**Total Entries**: 22+ model families, 60+ including dated variants (e.g.,
`claude-sonnet-4-5-20250929`)

**Rate Unit**: Per 1,000 tokens (to match formula:
`(tokens * rate_per_1k) / 1000`)

**Update Process**:

1. Update model pricing entries in MODEL_PRICING table
2. Update PRICING_LAST_UPDATED timestamp to current date
3. Document changes in commit message

### 1.2 DEFAULT_MODELS Mapping

**Purpose**: Fallback model selection when model detection fails.

**Structure**: `Record<ProviderId, string>`

**Location**: `extension/src/config/pricing.ts`

**Definition**:

| Provider ID | Default Model ID  | Rationale                         |
| ----------- | ----------------- | --------------------------------- |
| anthropic   | claude-sonnet-4-5 | Mid-tier (not cheapest/expensive) |
| openai      | gpt-4-turbo       | Common Codex default              |
| google      | gemini-1.5-flash  | Common Google AI default          |

**Fallback Strategy**: When model extraction fails, use
DEFAULT_MODELS[providerId] to get reasonable mid-tier pricing approximation.

### 1.3 PRICING_LAST_UPDATED Timestamp

**Purpose**: Track when pricing rates were last verified against provider
documentation.

**Type**: `string` (ISO 8601 date)

**Location**: `extension/src/config/pricing.ts`

**Usage**: Used by `isPricingStale()` to warn when data is >90 days old.

**Example**: `export const PRICING_LAST_UPDATED = '2026-03-19';`

---

## 2. Type Definitions

### 2.1 PricingConfig Interface (Existing)

**Purpose**: Defines input/output rate structure.

**Location**: `extension/src/config/pricing.ts`

**Definition**:

```typescript
interface PricingConfig {
  input: number; // Cost per 1,000 input tokens (USD)
  output: number; // Cost per 1,000 output tokens (USD)
}
```

**Examples**:

- Sonnet 4.5: `{ input: 0.003, output: 0.015 }` = $3/M input, $15/M output
- Haiku 3.5: `{ input: 0.00025, output: 0.00125 }` = $0.25/M input, $1.25/M
  output
- GPT-4: `{ input: 0.03, output: 0.06 }` = $30/M input, $60/M output

**Status**: Existing interface, no changes required.

### 2.2 ProviderId Type (Existing)

**Purpose**: Union type of supported AI provider identifiers.

**Location**: `extension/src/council/types.ts` or
`extension/src/config/pricing.ts`

**Definition**:

```typescript
type ProviderId = 'anthropic' | 'openai' | 'google';
```

**Usage**: Parameter type for `calculateCost()` and `getPricingForModel()`.

**Status**: Existing type, no changes required.

### 2.3 Model ID String Patterns

**Purpose**: Define valid model identifier formats for prefix matching.

**Pattern Format**: `{family}-{version}[-{date}]`

**Examples**:

- Exact: `"claude-sonnet-4-5"`
- Dated: `"claude-sonnet-4-5-20250929"`
- Short: `"gpt-4"`, `"o1"`
- Legacy: `"claude-3.5-sonnet"`, `"claude-3-5-sonnet"`

**Validation**: Optional (prefix matching handles variations automatically).

**Special Values**:

- `"unknown"`: Model extraction failed
- Empty string: Treated as unknown

### 2.4 ConversationUsage Interface (Existing, Reference Only)

**Purpose**: Token usage data from conversation logs (already has model field).

**Location**: `extension/src/autonomous/ClaudeSessionReader.ts`

**Definition** (simplified):

```typescript
interface ConversationUsage {
  inputTokens: number;
  outputTokens: number;
  model: string; // Already exists
  providerId?: string;
}
```

**Status**: Existing interface with `model` field already present. No changes
required.

### 2.5 UsageLogEntry Interface (Needs Model Field)

**Purpose**: Usage tracking log entry format for council-usage.jsonl.

**Location**: `extension/src/council/UsageLogger.ts`

**Current Definition**:

```typescript
interface UsageLogEntry {
  timestamp: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  // model: string;  // ← MISSING
}
```

**Required Change**: Add optional `model?: string` field.

**New Definition**:

```typescript
interface UsageLogEntry {
  timestamp: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model?: string; // ✅ ADDED - optional for backward compatibility
}
```

**Migration**: Optional field maintains backward compatibility with existing log
entries.

---

## 3. Validation Rules

### 3.1 Model ID Format Validation (Optional)

**Rule**: Model IDs should match pattern `{family}-{version}[-{date}]`

**Implementation**: Not enforced - prefix matching handles variations.

**Rationale**: Prefix matching is tolerant of format variations (e.g.,
`claude-3.5-sonnet` vs `claude-3-5-sonnet`).

**Fallback**: Unknown/malformed IDs use DEFAULT_MODELS mapping.

### 3.2 Rate Value Constraints

**Rules**:

1. **Non-negative**: `input >= 0` and `output >= 0`
2. **Non-zero**: Rates must be `> 0` for active models (zero indicates
   disabled/deprecated model)
3. **Reasonable upper bound**: `rate < 1.0` (no model costs $1 per 1K tokens =
   $1000/M)
4. **Precision**: Store as decimal (not scientific notation) for readability

**Examples**:

- ✅ Valid: `0.003`, `0.00025`, `0.03`
- ❌ Invalid: `-0.003` (negative), `0` (zero for active model), `1.5`
  (unreasonably high)

**Enforcement**: Code review only (no runtime validation).

### 3.3 Provider ID Validation

**Rule**: Provider ID must be in ProviderId union type.

**Valid Values**: `'anthropic'`, `'openai'`, `'google'`

**Enforcement**: TypeScript type checker enforces at compile time.

**Fallback**: Unknown provider uses `DEFAULT_PROVIDER = 'anthropic'`.

### 3.4 Pricing Staleness Validation

**Rule**: Pricing data >90 days old triggers warning, >180 days is critical.

**Implementation**: `isPricingStale()` function compares current date to
PRICING_LAST_UPDATED.

**Thresholds**:

- **Fresh**: 0-89 days
- **Warning**: 90-179 days (yellow indicator)
- **Critical**: 180+ days (red indicator, recommend immediate update)

**Action**: Log warning, optionally show UI indicator.

---

## 4. Data Relationships

### 4.1 Lookup Relationships

**MODEL_PRICING[modelId] → PricingConfig**

```
┌──────────────────────────┐
│ "claude-sonnet-4-5"      │ (Model ID key)
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ { input: 0.003,          │
│   output: 0.015 }        │ (PricingConfig value)
└──────────────────────────┘
```

**DEFAULT_MODELS[providerId] → modelId**

```
┌──────────────────────────┐
│ "anthropic"              │ (Provider ID key)
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ "claude-sonnet-4-5"      │ (Default model ID)
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ { input: 0.003,          │
│   output: 0.015 }        │ (Resolved PricingConfig)
└──────────────────────────┘
```

### 4.2 Model ID to Provider ID Mapping

**Anthropic Models**: Prefix `"claude-"`

- `"claude-opus-*"` → `providerId = "anthropic"`
- `"claude-sonnet-*"` → `providerId = "anthropic"`
- `"claude-haiku-*"` → `providerId = "anthropic"`

**OpenAI Models**: Prefix `"gpt-"` or `"o1"`

- `"gpt-4*"` → `providerId = "openai"`
- `"gpt-3.5*"` → `providerId = "openai"`
- `"o1*"` → `providerId = "openai"`

**Google Models**: Prefix `"gemini-"`

- `"gemini-*"` → `providerId = "google"`

**Alternative**: Explicit mapping if prefix detection insufficient.

### 4.3 Function Call Chain

```
ClaudeCodeUsageAdapter.parseConversationFile()
  ↓ calls
calculateCost(inputTokens, outputTokens, providerId, modelId)
  ↓ calls
getPricingForModel(modelId, providerId)
  ↓ returns
PricingConfig { input, output }
  ↓ used in
(inputTokens * rates.input + outputTokens * rates.output) / 1000
  ↓ returns
number (cost in USD)
```

---

## 5. State Transitions

### 5.1 Pricing Staleness State Machine

```
┌──────────────┐
│    FRESH     │  0-89 days since PRICING_LAST_UPDATED
│  (no warning)│
└──────────────┘
       ↓
       ↓ 90 days elapsed
       ↓
┌──────────────┐
│   WARNING    │  90-179 days old
│ (yellow icon)│  Log: "Pricing data is 90+ days old, consider updating"
└──────────────┘
       ↓
       ↓ 180 days elapsed
       ↓
┌──────────────┐
│   CRITICAL   │  180+ days old
│  (red icon)  │  Log: "Pricing data is 180+ days old, UPDATE IMMEDIATELY"
└──────────────┘
```

**Trigger**: `isPricingStale()` function checks staleness on pricing access.

**Reset**: Update PRICING_LAST_UPDATED to current date after verifying rates
against provider documentation.

### 5.2 Model Detection State Machine

```
┌──────────────┐
│  DETECTED    │  Model ID extracted from log entry
│              │  (e.g., "claude-sonnet-4-5-20250929")
└──────────────┘
       ↓
       ↓ Exact match failed
       ↓
┌──────────────┐
│   PREFIX     │  Prefix match found
│   MATCHED    │  (e.g., "claude-sonnet-4-5" matches prefix)
└──────────────┘
       ↓
       ↓ Prefix match failed
       ↓
┌──────────────┐
│   FALLBACK   │  Use DEFAULT_MODELS[providerId]
│              │  (e.g., "anthropic" → "claude-sonnet-4-5")
└──────────────┘
       ↓
       ↓ Provider unknown
       ↓
┌──────────────┐
│   UNKNOWN    │  Use DEFAULT_PROVIDER = 'anthropic'
│              │  Log warning, show approximate cost
└──────────────┘
       ↓
       ↓ Ultimate failure (should never happen)
       ↓
┌──────────────┐
│    ERROR     │  Crash or return $0 (NOT ALLOWED)
│   (BLOCKED)  │  System MUST always return valid pricing
└──────────────┘
```

**Guarantee**: System never crashes or returns $0 cost. Always provides
best-available pricing.

---

## 6. Configuration Considerations

### 6.1 No Database Involved

**Storage**: In-memory TypeScript constants in `pricing.ts`.

**Advantages**:

- Fast lookup (no I/O)
- Type-safe (compile-time validation)
- Version controlled (Git history)
- Deployable with code (no data migration)

**Disadvantages**:

- Requires code deploy to update pricing (acceptable - pricing changes
  infrequently)
- No dynamic pricing (acceptable - adds complexity, reduces reliability)

### 6.2 No Migrations Required

**Change Type**: Code change only (update pricing.ts constants).

**Migration Path**: Backward compatible (optional modelId parameter).

**Historical Data**: Existing logs remain unchanged (cannot retroactively fix
model field).

**Deployment**: Standard VSCode extension update (no database schema changes).

### 6.3 Pricing Update Process

**Steps**:

1. Check provider pricing documentation (Anthropic, OpenAI, Google)
2. Update MODEL_PRICING table in `pricing.ts`
3. Update PRICING_LAST_UPDATED to current date
4. Add test cases for new/updated models
5. Run all tests to verify backward compatibility
6. Deploy via standard release process (`./release-auto.sh`)

**Frequency**: As needed (typically quarterly or when providers announce pricing
changes).

**Notification**: UI warning via `isPricingStale()` after 90 days.

### 6.4 Configuration Source of Truth

**Canonical Source**: `extension/src/config/pricing.ts`

**Duplicates to Remove**:

1. `extension/src/autonomous/CostBudgetEnforcer.ts:16-20` - Remove
   COST_PER_1K_TOKENS duplicate
2. `extension/src/council/UsageLogger.ts:72-78` - Remove COST_PER_1K_TOKENS
   duplicate

**Migration**: All consumers import from `pricing.ts` (DRY principle).

**Validation**: Grep codebase for pricing literals (0.003, 0.015, etc.) to
ensure no hardcoded rates outside pricing.ts.

---

## 7. Data-to-UserStory Mapping

### 7.1 US-001: Accurate Cost Display for Model Used

**Data Dependencies**:

- MODEL_PRICING["claude-haiku-3-5"] = { input: 0.00025, output: 0.00125 }
- MODEL_PRICING["claude-haiku-4-5"] = { input: 0.001, output: 0.005 }
- Prefix matching: "claude-haiku-3-5-20241022" → "claude-haiku-3-5"

**Data Flow**:

1. Extract model ID: "claude-haiku-3-5-20241022"
2. Lookup MODEL_PRICING (prefix match)
3. Apply rates: $0.25/M input, $1.25/M output
4. Calculate cost: (100K × $0.25/M + 50K × $1.25/M) / 1000 = $0.0875

**Acceptance**: Cost within 1% of $0.0875 (actual Anthropic rate).

### 7.2 US-002: Correct Provider/Model Detection

**Data Dependencies**:

- ConversationUsage.model field (already exists)
- UsageLogEntry.model field (needs to be added)
- DEFAULT_MODELS mapping (fallback when detection fails)

**Data Flow**:

1. Detect provider: `detectProvider()` → 'claude-code'
2. Extract model: `entry.message?.model` → 'claude-opus-4-6'
3. Pass both to `calculateCost(inputTokens, outputTokens, provider, model)`
4. Log entry includes model field: `{ ..., model: 'claude-opus-4-6' }`

**Acceptance**: Model field populated in 95%+ of log entries.

### 7.3 US-003: Model-Based Pricing Lookup

**Data Dependencies**:

- MODEL_PRICING registry (60+ entries)
- DEFAULT_MODELS mapping (fallback)
- `getPricingForModel()` function (exact → prefix → fallback algorithm)

**Data Flow**:

1. Call `getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic')`
2. Try exact match: MODEL_PRICING['claude-sonnet-4-5-20250929'] → Not found
3. Try prefix match: 'claude-sonnet-4-5' → Found! Return { input: 0.003, output:
   0.015 }
4. Apply rates in calculateCost()

**Acceptance**: Prefix matching works for all dated model variants.

### 7.4 US-004: Consolidated Pricing Source

**Data Dependencies**:

- Single COST_PER_1K_TOKENS or MODEL_PRICING in pricing.ts
- Remove duplicates from CostBudgetEnforcer.ts and UsageLogger.ts
- Update imports: `import { MODEL_PRICING } from '../config/pricing'`

**Data Flow**:

1. Provider pricing changes (e.g., Anthropic updates Opus rates)
2. Update pricing.ts MODEL_PRICING table
3. All components automatically use new rates (single source of truth)

**Acceptance**: Only pricing.ts contains pricing literals.

### 7.5 US-005: Formula Verification

**Data Dependencies**:

- PricingConfig rates from MODEL_PRICING
- Token counts from conversation logs
- Actual provider invoices (for validation)

**Data Flow**:

1. Extract tokens: 100K input, 50K output (Sonnet 4.5)
2. Lookup rates: { input: 0.003, output: 0.015 }
3. Calculate cost: (100K × 0.003 + 50K × 0.015) / 1000 = $0.30
4. Compare to invoice: $0.30 actual
5. Error: |0.30 - 0.30| / 0.30 = 0% ✅

**Acceptance**: Error <1% for 10+ invoice comparisons.

---

## Summary Statistics

### Data Structure Count

**New Structures**: 2

1. MODEL_PRICING (Record<string, PricingConfig>) - 60+ entries
2. DEFAULT_MODELS (Record<ProviderId, string>) - 3 entries

**Modified Structures**: 1

1. UsageLogEntry (add optional `model?: string` field)

**Unchanged Structures**: 2

1. PricingConfig (interface)
2. ProviderId (type)

**Total**: 5 data structures

### Type Definition Count

**Total**: 4

1. **PricingConfig** (existing interface)
   - Fields: `input: number`, `output: number`

2. **ProviderId** (existing type)
   - Values: `'anthropic' | 'openai' | 'google'`

3. **Model ID patterns** (documentation)
   - Format: `{family}-{version}[-{date}]`
   - Examples: "claude-sonnet-4-5", "gpt-4-turbo"

4. **UsageLogEntry** (modified interface)
   - Add field: `model?: string` (optional)

### Validation Rule Count

**Total**: 4 validation rules

1. **Model ID format validation** (optional) - Prefix matching handles
   variations
2. **Rate value constraints** - Must be > 0, < 1.0 (per 1K tokens)
3. **Provider ID validation** - Must be in ProviderId union
4. **Pricing staleness validation** - Warn at 90 days, critical at 180 days

### Relationship Count

**Total**: 3 primary relationships

1. **MODEL_PRICING[modelId] → PricingConfig** - Direct lookup or prefix match
2. **DEFAULT_MODELS[providerId] → modelId** - Fallback mapping
3. **Model ID → Provider ID** - Via prefix detection or explicit mapping

### State Transition Count

**Total**: 2 state machines

1. **Pricing staleness**: fresh → warning (>90 days) → critical (>180 days)
2. **Model detection**: detected → prefix matched → fallback → unknown → error
   (blocked)

---

## Data Model Validation Checklist

- [x] All configuration structures defined with field tables
- [x] Type definitions include examples and constraints
- [x] Validation rules specify enforcement mechanisms
- [x] Data relationships documented with lookup chains
- [x] State transitions show valid state progressions
- [x] Configuration considerations address storage and updates
- [x] Data-to-UserStory mapping links data to requirements
- [x] Summary statistics provide counts for tracking
- [x] No implementation details (WHAT/WHY only, no HOW)
- [x] Model ID patterns documented with examples
- [x] Pricing update process documented
- [x] Fallback strategies defined for unknown models
- [x] Backward compatibility addressed (optional fields)
- [x] No database migrations (in-memory only)

---

## References

**Related Documents**:

- [Bug Fix Specification](./bug-fix-spec.md) - User stories, requirements,
  acceptance criteria
- [Bug Fix Research](./bug-fix-research.md) - Existing data patterns,
  integration points
- [Discovery Document](./discovery.md) - Original feature requirements (1%
  accuracy target)

**Code References**:

- `extension/src/config/pricing.ts` - Pricing configuration location
- `extension/src/autonomous/ClaudeSessionReader.ts:62-75` - MODEL_CONTEXT_LIMITS
  pattern (example for MODEL_PRICING)
- `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:198` - Current bug
  location (hardcoded provider)
- `extension/src/council/types.ts` - Type definitions location

**External References**:

- [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -
  Official pricing documentation
- [OpenAI Pricing](https://openai.com/pricing) - GPT model pricing
- [Google AI Pricing](https://ai.google.dev/pricing) - Gemini model pricing

---

## Document Metadata

**Generated**: 2026-03-19T18:00:00Z **Author**: Claude (Research & Specification
Agent) **Feature**: 025-ai-usage-tracking (Bug Fix) **Type**: Data Model
Document **Status**: Draft → Ready for Planning **Next Step**: Generate
bug-fix-plan.md using /3_gofer_plan

---
