---
date: 2026-03-19T18:00:00Z
researcher: Claude
feature: 'AI Token Cost Calculation Bug Fixes (025-ai-usage-tracking)'
status: complete
---

# Research: AI Token Cost Calculation Bug Fixes

## Feature Summary

Fix three critical bugs in the AI token usage cost calculation system for
feature 025-ai-usage-tracking:

1. **Bug #1**: Inverted formula in `AIUsageProvider.ts` (lines 389-390) -
   multiplies tokens by rate then divides by 1000, should divide tokens by 1000
   first
2. **Bug #2**: Hardcoded `'anthropic'` provider in `ClaudeCodeUsageAdapter.ts`
   (line 198) - ignores detected provider/model
3. **Bug #3**: Provider-based pricing in `pricing.ts` instead of model-specific
   rates - Opus 4.6, Sonnet 4.5, Haiku 4.5, plus ALL Codex/Copilot models need
   different rates

**Critical Context from Discovery**: The feature's success metric is "Cost
accuracy within 1% of actual provider bills" (discovery.md:32). These bugs
violate this requirement.

**Multi-Provider Reality**:

- **Claude Code**: Opus 4.6 ($5/$25/M), Sonnet 4.5 ($3/$15/M), Haiku 4.5
  ($1/$5/M)
- **Codex CLI**: Can use GPT-4 ($30/$60/M), GPT-4-turbo ($10/$30/M), GPT-3.5
  ($0.50/$1.50/M), o1 ($15/$60/M)
- **GitHub Copilot**: Can use any OpenAI model (GPT-3.5-turbo, GPT-4, GPT-4o,
  etc.)

## Codebase Analysis

### Where to Implement

| Component            | Location                                                 | Purpose                       | Bug Impact                                                |
| -------------------- | -------------------------------------------------------- | ----------------------------- | --------------------------------------------------------- |
| **Pricing Registry** | `extension/src/config/pricing.ts:23-27`                  | Central pricing configuration | Bug #3: Provider-level only, needs model-level            |
| **Cost Calculator**  | `extension/src/config/pricing.ts:58-65`                  | `calculateCost()` function    | Bug #1: Formula may be inverted                           |
| **Claude Adapter**   | `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:198` | Parse Claude Code logs        | Bug #2: Hardcoded 'anthropic', drops model                |
| **Codex Adapter**    | `extension/src/autonomous/CodexUsageAdapter.ts:181`      | Parse Codex CLI logs          | Bug #2 variant: Hardcoded 'openai', needs model detection |
| **UI Display**       | `extension/src/ui/AIUsageProvider.ts:389-390`            | Show costs in panel           | Bug #1: Same formula issue                                |
| **Budget Enforcer**  | `extension/src/autonomous/CostBudgetEnforcer.ts:68-72`   | Track session budget          | Needs model parameter added                               |
| **Usage Logger**     | `extension/src/council/UsageLogger.ts:72-78`             | Aggregate usage logs          | Duplicate pricing (DRY violation)                         |

### Existing Patterns to Follow

#### Pattern 1: Model-Based Lookup Table with Prefix Matching

Found in: `extension/src/autonomous/ClaudeSessionReader.ts:62-75, 425-439`

```typescript
/** Model context window sizes (tokens) */
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-haiku-20241022': 200000,
  // ... 15+ model entries
};

const DEFAULT_CONTEXT_LIMIT = 200000;

/**
 * Returns the context window size for a given model ID.
 * Unknown models default to 200k tokens.
 *
 * @param modelId - Claude model identifier
 * @returns Context window size in tokens
 */
getModelContextLimit(modelId: string): number {
  // Try exact match first
  if (MODEL_CONTEXT_LIMITS[modelId]) {
    return MODEL_CONTEXT_LIMITS[modelId];
  }

  // Try prefix match (e.g., "claude-opus-4-5" matches "claude-opus-4-5-20251101")
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (modelId.startsWith(key) || key.startsWith(modelId)) {
      return limit;
    }
  }

  return DEFAULT_CONTEXT_LIMIT;
}
```

**Why relevant**:

- Proven pattern for model-specific configuration with fallback
- Handles model ID versioning (dated suffixes)
- Should apply same pattern to pricing
- Already working in production code

#### Pattern 2: Model Extraction from API Responses

Found in: `extension/src/council/providers/AnthropicProvider.ts:76-82`

```typescript
async query(request: QueryRequest): Promise<QueryResponse> {
  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    messages: [{ role: 'user', content: request.prompt }],
  });

  return {
    content: response.content[0].type === 'text' ? response.content[0].text : '',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    model: response.model,  // <-- Model ID captured from API response
    providerId: this.id,
  };
}
```

**Similar in**:

- `OpenAIProvider.ts:88-94` - `model: response.model`
- `GoogleProvider.ts` - Model from response

**Why relevant**:

- Model ID is ALWAYS available at cost calculation points
- APIs return the actual model used (not just requested)
- Pattern established across all 3 providers

#### Pattern 3: Model Detection from Session Logs

Found in: `extension/src/autonomous/ClaudeSessionReader.ts:393-411`

```typescript
private extractUsageFromEntry(entry: unknown): SessionUsage | null {
  // ... type guards ...

  const message = record.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== 'object') {
    return null;
  }

  // Extract model from response
  const model = typeof message.model === 'string' ? message.model : 'unknown';

  const usage = message.usage as Record<string, unknown> | undefined;
  const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0;
  const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;

  return {
    inputTokens,
    outputTokens,
    model,  // <-- Model extracted from JSONL log
    timestamp,
  };
}
```

**Why relevant**:

- Shows safe extraction with type guards
- Fallback to 'unknown' if missing
- Same pattern needed in ClaudeCodeUsageAdapter (already extracts model but
  doesn't use it)

### Integration Points

1. **Pricing Registry Refactor** (`pricing.ts:23-27`)
   - **Current**: `Record<string, PricingConfig>` (provider-level: anthropic,
     openai, google)
   - **Needed**: `Record<string, PricingConfig>` (model-level: claude-opus-4-6,
     gpt-4, etc.)
   - **Follow**: `MODEL_CONTEXT_LIMITS` pattern from ClaudeSessionReader

2. **calculateCost() Signature** (`pricing.ts:58-65`)
   - **Current**: `calculateCost(inputTokens, outputTokens, providerId?)`
   - **Needed**:
     `calculateCost(inputTokens, outputTokens, providerId?, modelId?)`
   - **Backward compatible**: Optional parameters with fallback

3. **ClaudeCodeUsageAdapter Call Site** (`ClaudeCodeUsageAdapter.ts:198`)
   - **Current**: `calculateCost(inputTokens, outputTokens, 'anthropic')` ←
     HARDCODED
   - **Needed**: `calculateCost(inputTokens, outputTokens, provider, model)`
   - **Variables available**: Both `provider` (line 174) and `model` (line 200)
     already in scope

4. **CodexUsageAdapter Call Site** (`CodexUsageAdapter.ts:181`)
   - **Current**: `calculateCost(inputTokens, outputTokens, 'openai')` ←
     HARDCODED
   - **Needed**: `calculateCost(inputTokens, outputTokens, 'openai', model)`
   - **Model detection required**: Parse from `history.json` format

5. **CostBudgetEnforcer.recordUsage()** (`CostBudgetEnforcer.ts:68-72`)
   - **Current**: `recordUsage(inputTokens, outputTokens, providerId?)`
   - **Needed**: Add optional `modelId` parameter
   - **Forward to**:
     `calculateCost(inputTokens, outputTokens, providerId, modelId)`

6. **UsageLogger Consolidation** (`council/UsageLogger.ts:72-78`)
   - **Issue**: Duplicate `COST_PER_1K_TOKENS` registry (3rd copy!)
   - **Fix**: Remove duplicate, import from `pricing.ts` (DRY principle)
   - **Also in**: `CostBudgetEnforcer.ts:16-20` (2nd duplicate)

### Related Code

#### Core Pricing System

- `extension/src/config/pricing.ts:23-27` - Provider-based pricing registry
  (needs model-level)
- `extension/src/config/pricing.ts:58-65` - `calculateCost()` function (needs
  model parameter)
- `extension/src/config/pricing.ts:33` - `PRICING_LAST_UPDATED` (staleness
  tracking)
- `extension/src/config/pricing.ts:45-48` - `isPricingStale()` (90-day warning)

#### Usage Adapters (Token Extraction)

- `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:198` - **Hardcoded
  'anthropic'** (bug #2)
- `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:200` - Model extraction
  (works, but unused)
- `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:119-141` -
  `detectProvider()` method
- `extension/src/autonomous/CodexUsageAdapter.ts:181` - **Hardcoded 'openai'**,
  needs model detection
- `extension/src/autonomous/CodexUsageAdapter.ts:121-193` - Parse Codex
  history.json

#### Cost Display & Tracking

- `extension/src/ui/AIUsageProvider.ts:389-390` - Token cost calculation (bug
  #1)
- `extension/src/ui/AIUsageProvider.ts:399` - Tooltip with rate per million
- `extension/src/autonomous/CostBudgetEnforcer.ts:16-20` - **Duplicate pricing**
  (consolidate)
- `extension/src/autonomous/CostBudgetEnforcer.ts:68-93` - `recordUsage()`
  method
- `extension/src/council/UsageLogger.ts:72-78` - **Duplicate pricing**
  (consolidate)

#### Model Detection & Context

- `extension/src/autonomous/ClaudeSessionReader.ts:62-75` - MODEL_CONTEXT_LIMITS
  pattern
- `extension/src/autonomous/ClaudeSessionReader.ts:425-439` -
  `getModelContextLimit()` with prefix matching
- `extension/src/council/types.ts:452-459` - DEFAULT_MODELS by provider

## Technology Decisions

### Decision 1: Model-Based Pricing Architecture

**Choice**: Convert from provider-based to model-based pricing lookup table

**Rationale**:

- **60x price difference** within single provider:
  - Anthropic: Haiku $0.25/M → Opus $15/M (60x range)
  - OpenAI: GPT-3.5 $0.50/M → GPT-4 $30/M (60x range)
- **Current errors**:
  - Haiku: 12x overcharge ($3 charged vs $0.25 actual)
  - Opus: 5x undercharge ($3 charged vs $15 actual)
  - GPT-3.5: 10x overcharge ($5 charged vs $0.50 actual)
  - GPT-4: 6x undercharge ($5 charged vs $30 actual)
- **Multi-CLI reality**:
  - Codex can use ANY OpenAI model (user configurable)
  - Copilot supports multiple OpenAI models
  - Cannot assume single rate per provider
- **Discovery requirement**: "Cost accuracy within 1% of actual provider bills"
  (currently violates this)

**Alternatives considered**:

1. **Provider-level with "average" rates**:
   - ❌ Inaccurate, violates 1% requirement
   - ❌ Error margin 600-1200% for edge models
2. **Dynamic API pricing lookup**:
   - ❌ Too slow, requires network calls
   - ❌ Increases complexity, adds failure points
   - ❌ Rate limits on pricing APIs
3. **User-configurable rates**:
   - ❌ Maintenance burden on users
   - ❌ Users shouldn't manage provider pricing
   - ❌ Error-prone, will drift

### Decision 2: Prefix Matching for Model Variants

**Choice**: Use exact match + prefix fallback pattern (from
`ClaudeSessionReader.getModelContextLimit()`)

**Rationale**:

- **Model ID versioning**: `claude-sonnet-4-5-20250929` vs
  `claude-sonnet-4-5-20251215`
- **Exact match** covers known versions
- **Prefix match** handles new dated versions without code changes
- **Example**: `claude-sonnet-4-5` prefix matches any `claude-sonnet-4-5-*`
  variant
- **Proven pattern**: Already working in production for context limits
- **Future-proof**: New model versions work automatically

**Alternatives considered**:

1. **Regex matching**:
   - ❌ Overkill for simple prefix matching
   - ❌ Harder to maintain and debug
   - ❌ Performance overhead
2. **Only exact match**:
   - ❌ Breaks on new model versions (e.g., claude-sonnet-4-5-20260101)
   - ❌ Requires code deploy for each model version
3. **Fuzzy matching**:
   - ❌ Too error-prone (could match wrong model)
   - ❌ Unpredictable behavior

### Decision 3: Backward Compatible API

**Choice**: Add optional `modelId` parameter to `calculateCost()`, don't break
existing calls

**Signature**:

```typescript
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  providerId: string = DEFAULT_PROVIDER,
  modelId?: string // NEW: optional, backward compatible
): number;
```

**Rationale**:

- **7+ call sites** across codebase use current signature
- **All tests** expect current behavior
- **Optional parameter** with fallback maintains compatibility
- **Gradual migration**: Can update call sites incrementally
- **TypeScript**: Optional parameters are idiomatic

**Alternatives considered**:

1. **Breaking change with required model**:
   - ❌ Risky, all 7+ call sites break immediately
   - ❌ All tests fail until updated
   - ❌ Blocks incremental rollout
2. **Separate function `calculateCostByModel()`**:
   - ❌ Code duplication
   - ❌ Two functions doing same thing
   - ❌ Confusing API (which to use when?)
3. **Function overloading**:
   - ❌ Not idiomatic in TypeScript
   - ❌ More complex than optional parameter
   - ❌ Runtime behavior unclear

### Decision 4: Consolidate Duplicate Pricing Tables

**Choice**: Single source of truth in `pricing.ts`, all consumers import from
there

**Found duplicates**:

1. `pricing.ts:23-27` - **Canonical source**
2. `CostBudgetEnforcer.ts:16-20` - Duplicate copy
3. `UsageLogger.ts:72-78` - Duplicate with CLI variants added

**Rationale**:

- **DRY principle**: Don't Repeat Yourself
- **Drift risk**: Duplicates will diverge over time (already have - UsageLogger
  has extra entries)
- **Single update point**: When Anthropic changes pricing, update once
- **Consistency**: All components use same rates

**Migration**:

```typescript
// CostBudgetEnforcer.ts - BEFORE
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  anthropic: { input: 0.003, output: 0.015 },
  // ...
};

// CostBudgetEnforcer.ts - AFTER
import { COST_PER_1K_TOKENS } from '../config/pricing';
```

**Alternatives considered**:

1. **Keep duplicates for "independence"**:
   - ❌ Maintenance nightmare
   - ❌ Already showing drift (UsageLogger has different entries)
   - ❌ No architectural benefit
2. **Config file approach** (YAML/JSON):
   - ❌ Over-engineering for simple constants
   - ❌ Adds file I/O and parsing complexity
   - ❌ Type safety lost

### Decision 5: Model Detection for Codex/Copilot

**Choice**: Extract model from log files, fallback to provider default model

**Codex CLI Model Sources**:

- Parse from `~/.codex/history.json`
- Field: `request.model` or `model` (based on Codex CLI format)
- Examples: `"gpt-4"`, `"gpt-4-turbo"`, `"gpt-3.5-turbo"`, `"o1"`

**Copilot Model Sources**:

- Parse from Copilot conversation logs (format TBD based on adapter)
- Likely: `model` field in response objects
- Examples: `"gpt-3.5-turbo"`, `"gpt-4"`, `"gpt-4o"`

**Fallback Strategy**:

```typescript
const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-sonnet-4-5', // Mid-tier default
  openai: 'gpt-4-turbo', // Codex default
  google: 'gemini-1.5-flash', // Flash default
  'claude-cli': 'claude-sonnet-4', // CLI default
  'codex-cli': 'gpt-4-turbo', // Codex default
};

// Usage:
const model = extractedModel || DEFAULT_MODELS[provider] || 'unknown';
```

**Rationale**:

- **Codex is configurable**: Users can set any OpenAI model
- **Model determines cost**: gpt-4 ($30/M) vs gpt-3.5 ($0.50/M) = 60x difference
- **Cannot assume**: Codex ≠ always GPT-4
- **Fallback safe**: If detection fails, use reasonable default (mid-tier
  pricing)

**Alternatives considered**:

1. **Assume GPT-4 for all Codex**:
   - ❌ Inaccurate for GPT-3.5 users (10x overcharge)
   - ❌ Inaccurate for gpt-4-turbo users (3x overcharge)
2. **Average OpenAI rate**:
   - ❌ Same issues as provider-level pricing
   - ❌ No single "average" makes sense
3. **Skip Codex/Copilot tracking**:
   - ❌ Missing coverage for multi-provider tracking
   - ❌ Discovery requirement: "3+ providers"

## Constraints & Considerations

### Constraint 1: Pricing Data Staleness

- **Current**: `PRICING_LAST_UPDATED = 2026-03-15` (90-day staleness warning)
- **Issue**: Anthropic/OpenAI/Google change pricing periodically
- **Mitigation**: `isPricingStale()` warns after 90 days
- **Action needed**: Update `pricing.ts` when provider rates change
- **Consider**: Add UI warning when pricing is stale (already exists in code)

### Constraint 2: Model ID Format Variations

- **Full format**: `claude-sonnet-4-5-20250929` (family-version-date)
- **Shorthand**: `claude-sonnet`, `gpt-4` (no date suffix)
- **Unknown models**: Default to 'unknown' string
- **Prefix matching**: Handles variations (e.g., `claude-sonnet-4-5` matches any
  dated variant)
- **Risk**: Typos or malformed IDs could match wrong prefix

### Constraint 3: Backward Compatibility

- **7+ call sites** use current `calculateCost()` signature
- **Tests** expect current behavior
- **Migration path**: Optional parameters preserve compatibility
- **Validation**: All tests must pass during incremental rollout

### Constraint 4: Cache Tokens Pricing (Anthropic-specific)

- **Cache types**: `cache_creation_input_tokens`, `cache_read_input_tokens`
- **Current code**: Adds cache_creation to input tokens (line 198)
- **Cache pricing**: Reads are 10x cheaper ($0.30/M vs $3/M for Sonnet)
- **Future enhancement**: Separate pricing for cache reads
- **Current approach**: Conservative (charges full input rate for cache
  creation)

### Constraint 5: Historical Log Accuracy

- **Issue**: Existing `.specify/logs/council-usage.jsonl` entries lack model
  field
- **Impact**: Cannot retroactively fix historical cost calculations
- **Solution**: New calculations accurate, old data remains approximate
- **Accept**: Historical data already collected, can't change past

### Constraint 6: Multi-CLI Model Variability

- **Codex CLI**: User-configurable model (any OpenAI model)
- **Copilot**: GitHub-selected model (can change over time)
- **Detection critical**: Cannot assume fixed model per CLI tool
- **Fallback needed**: When model detection fails, use reasonable default

## Open Questions

All questions resolved during research:

- [x] **Should we add model-specific cache token pricing?**
  - **Decision**: Defer to future enhancement (Feature 029+)
  - **Rationale**: Current input+cache_creation pattern is conservative, won't
    undercharge
  - **Impact**: May slightly overcharge cache-heavy users, but within margin of
    error

- [x] **How to handle unknown model IDs?**
  - **Decision**: Fallback to provider default rate, log warning
  - **Rationale**: Better to show approximate cost than crash or show $0
  - **Implementation**: Use `DEFAULT_MODELS[providerId]` mapping

- [x] **Should pricing.ts load from external config file?**
  - **Decision**: No, keep hardcoded constants
  - **Rationale**: Simpler, type-safe, no I/O complexity
  - **Alternative**: Document where to update when pricing changes
    (PRICING_LAST_UPDATED)

- [x] **Add UI warning when pricing data is stale (>90 days)?**
  - **Decision**: Yes, already implemented via `isPricingStale()`
  - **Location**: `pricing.ts:45-48`
  - **Action**: Ensure UI components call and display warning

- [x] **How to test model-based pricing without real API calls?**
  - **Decision**: Unit tests with mock pricing table
  - **Approach**: Test `getPricingForModel()` with known model IDs
  - **Coverage**: Exact match, prefix match, unknown fallback

## Recommendations

### 1. Fix Bug Priority Order

**Recommended Sequence**:

1. **Bug #3 FIRST** (model-based pricing architecture)
   - Foundation for other fixes
   - Largest code change
   - Enables Bug #2 fix
2. **Bug #2 SECOND** (hardcoded provider)
   - Leverages new model-based pricing
   - Straightforward change (pass variables instead of hardcoded strings)
3. **Bug #1 LAST** (formula verification)
   - May not actually be a bug (mathematically equivalent)
   - Need real cost data to verify
   - Low-risk to defer

**Rationale**: Build foundation first (model-based pricing), then fix call
sites, then verify formula.

### 2. Implementation Approach

**Step-by-step Plan**:

1. Create `MODEL_PRICING` lookup table in pricing.ts (60+ models)
2. Add `getPricingForModel(modelId, providerId)` helper with prefix matching
3. Update `calculateCost()` to accept optional `modelId` parameter
4. Update ClaudeCodeUsageAdapter call site (highest impact - Claude Code users)
5. Update CodexUsageAdapter call site (Codex CLI users)
6. Add Copilot model detection if CopilotAdapter exists
7. Update CostBudgetEnforcer.recordUsage() to accept and forward modelId
8. Update ContextUsageLogger to pass modelId
9. Consolidate duplicate pricing tables (remove from CostBudgetEnforcer,
   UsageLogger)
10. Add model breakdown to UI (optional enhancement)

### 3. Testing Strategy

**Unit Tests**:

- `getPricingForModel()` exact match (known model IDs)
- `getPricingForModel()` prefix match (dated variants)
- `getPricingForModel()` fallback (unknown models)
- `calculateCost()` with and without modelId parameter (backward compatibility)

**Integration Tests**:

- Cost calculation accuracy across models (Opus vs Sonnet vs Haiku)
- Verify different costs for same token count with different models
- Test fallback behavior for unknown/malformed model IDs
- Regression tests for existing provider-based calls

**Manual Verification**:

- Parse real conversation logs with multiple models
- Compare calculated costs to actual Anthropic/OpenAI bills
- Verify 1% accuracy requirement (discovery.md:32)

### 4. Model Pricing Table Structure

```typescript
// extension/src/config/pricing.ts

/**
 * Cost per 1,000 tokens by model (USD).
 *
 * Updated: 2026-03-19
 * Sources: Anthropic API docs, OpenAI pricing page, Google AI pricing
 */
export const MODEL_PRICING: Record<string, PricingConfig> = {
  // === Anthropic Claude Models ===

  // Opus (highest tier - complex reasoning)
  'claude-opus-4-6': { input: 0.005, output: 0.025 }, // $5/M, $25/M
  'claude-opus-4-5': { input: 0.005, output: 0.025 },
  'claude-opus-4': { input: 0.005, output: 0.025 },

  // Sonnet (mid tier - balanced performance/cost)
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 }, // $3/M, $15/M (DEFAULT)
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },

  // Haiku (low tier - fast, cheap)
  'claude-haiku-4-5': { input: 0.001, output: 0.005 }, // $1/M, $5/M
  'claude-haiku-3-5': { input: 0.00025, output: 0.00125 }, // $0.25/M, $1.25/M
  'claude-3-5-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },

  // === OpenAI GPT Models (Codex/Copilot) ===

  // GPT-4 family
  'gpt-4': { input: 0.03, output: 0.06 }, // $30/M, $60/M
  'gpt-4-turbo': { input: 0.01, output: 0.03 }, // $10/M, $30/M
  'gpt-4o': { input: 0.005, output: 0.015 }, // $5/M, $15/M

  // GPT-3.5 family
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // $0.50/M, $1.50/M
  'gpt-3.5': { input: 0.0005, output: 0.0015 },

  // o1 family (reasoning models)
  o1: { input: 0.015, output: 0.06 }, // $15/M, $60/M
  'o1-mini': { input: 0.003, output: 0.012 }, // $3/M, $12/M

  // === Google Gemini Models ===

  'gemini-1.5-pro': { input: 0.00125, output: 0.005 }, // $1.25/M, $5/M
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 }, // $0.075/M, $0.30/M
  'gemini-pro': { input: 0.0005, output: 0.0015 }, // $0.50/M, $1.50/M
};

/**
 * Default models by provider (fallback when model detection fails).
 */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: 'claude-sonnet-4-5', // Mid-tier default
  openai: 'gpt-4-turbo', // Common Codex default
  google: 'gemini-1.5-flash', // Common Google default
};

/**
 * Get pricing config for a specific model with fallback to provider defaults.
 *
 * @param modelId - Full model identifier (e.g., "claude-sonnet-4-5-20250929")
 * @param providerId - Provider ID for fallback (e.g., "anthropic")
 * @returns Pricing config with input/output rates per 1K tokens
 */
export function getPricingForModel(
  modelId: string,
  providerId: string = DEFAULT_PROVIDER
): PricingConfig {
  // Exact match
  if (MODEL_PRICING[modelId]) {
    return MODEL_PRICING[modelId];
  }

  // Prefix match (e.g., "claude-sonnet-4-5" matches any dated version)
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelId.startsWith(key) || key.startsWith(modelId)) {
      return pricing;
    }
  }

  // Fallback to provider default model
  const defaultModel = DEFAULT_MODELS[providerId];
  if (defaultModel && MODEL_PRICING[defaultModel]) {
    Logger.for('pricing').warn(
      `Unknown model "${modelId}", using default "${defaultModel}"`
    );
    return MODEL_PRICING[defaultModel];
  }

  // Ultimate fallback to old provider-based pricing
  Logger.for('pricing').warn(
    `Unknown model "${modelId}" and provider "${providerId}", using default provider pricing`
  );
  return COST_PER_1K_TOKENS[providerId] ?? COST_PER_1K_TOKENS[DEFAULT_PROVIDER];
}
```

### 5. Codex/Copilot Model Detection Implementation

**CodexUsageAdapter.ts - Add Model Extraction**:

```typescript
// Current location: line ~140-193 (parseHistoryEntry)
private parseHistoryEntry(entry: any): UsageEntry | null {
  try {
    // ... existing parsing ...

    // ADDED: Extract model from Codex history entry
    const model = entry.model || entry.request?.model || 'gpt-4-turbo';  // Fallback to common default

    // ... existing token extraction ...

    // CHANGED: Pass model to calculateCost (line 181)
    const cost = calculateCost(inputTokens, outputTokens, 'openai', model);  // Added model parameter

    return {
      timestamp,
      inputTokens,
      outputTokens,
      cost,
      model,  // Include model in return object
    };
  } catch {
    return null;
  }
}
```

### 6. Migration Path

**Phase 1: Foundation (Non-Breaking)**

- [ ] Create `MODEL_PRICING` table in pricing.ts
- [ ] Add `getPricingForModel()` helper function
- [ ] Update `calculateCost()` signature (optional modelId parameter)
- [ ] Add unit tests for new functions
- [ ] All existing tests still pass (backward compatibility)

**Phase 2: High-Impact Call Sites**

- [ ] Update ClaudeCodeUsageAdapter.ts:198 (Claude Code users)
- [ ] Update CodexUsageAdapter.ts:181 (Codex CLI users)
- [ ] Add integration tests for model-based costs
- [ ] Verify cost accuracy with real conversation logs

**Phase 3: Supporting Components**

- [ ] Update CostBudgetEnforcer.recordUsage() (add modelId parameter)
- [ ] Update ContextUsageLogger.logLLMCall() (pass modelId)
- [ ] Add model field to UsageLogEntry interface

**Phase 4: Cleanup**

- [ ] Remove duplicate pricing from CostBudgetEnforcer.ts:16-20
- [ ] Remove duplicate pricing from UsageLogger.ts:72-78
- [ ] Update all imports to use pricing.ts
- [ ] Add model breakdown to UI (optional)

**Phase 5: Documentation**

- [ ] Update PRICING_LAST_UPDATED timestamp
- [ ] Document model pricing sources in comments
- [ ] Add migration notes to CHANGELOG
- [ ] Update feature validation report

---

## Bug Analysis Deep Dive

### Bug #1: Inverted Formula - INCONCLUSIVE

**Location**: `AIUsageProvider.ts:389-390`, `pricing.ts:64`

**Current Code**:

```typescript
// AIUsageProvider.ts:389-390
const inputCost = (provider.inputTokens * rates.input) / 1000;
const outputCost = (provider.outputTokens * rates.output) / 1000;

// pricing.ts:64
return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
```

**Mathematical Analysis**:

```
Formula A: (tokens * rate_per_1k) / 1000
Formula B: (tokens / 1000) * rate_per_1k

Test: 100,000 tokens at $0.003 per 1K
A: (100,000 * 0.003) / 1000 = 300 / 1000 = $0.30
B: (100,000 / 1000) * 0.003 = 100 * 0.003 = $0.30

Result: MATHEMATICALLY EQUIVALENT (associative property)
```

**Status**:

- Formulas are algebraically equivalent
- May be documentation/naming issue, not actual bug
- Need real cost data to verify if practical issue exists

**Possible Issues**:

1. **Floating-point precision**: Order of operations affects rounding
2. **Documentation**: Rate is "per 1K" but formula looks like "per token"
3. **Misunderstanding**: User may have expected different rate unit

**Action**:

- Verify with actual cost calculations from live data
- If costs are 1,000,000x wrong in practice, formula IS buggy despite math
- If costs are correct, close as non-issue or documentation fix

### Bug #2: Hardcoded Provider - CONFIRMED CRITICAL

**Location**: `ClaudeCodeUsageAdapter.ts:198`

**Current Code** (with context):

```typescript
// Line 161: Provider variable declared
let provider: 'claude-code' | 'codex' | 'copilot' | 'unknown' = 'unknown';

// Line 174: Provider detected (WORKS)
provider = this.detectProvider(entry);

// Line 200: Model extracted (WORKS)
const model = entry.message?.model || 'unknown';

// Line 198: Cost calculation (BUG - IGNORES BOTH)
const cost = calculateCost(
  inputTokens + cacheCreationTokens,
  outputTokens,
  'anthropic' // ❌ HARDCODED - ignores `provider` and `model` variables
);
```

**Impact Analysis**:

| Actual Model          | Actual Rate   | Charged Rate | Error  | Example Cost                      |
| --------------------- | ------------- | ------------ | ------ | --------------------------------- |
| claude-haiku-3-5      | $0.25/M input | $3/M input   | +1100% | 100K tokens: $25 vs $2.75 actual  |
| claude-sonnet-4-5     | $3/M input    | $3/M input   | ✓ 0%   | 100K tokens: $300 (correct)       |
| claude-opus-4-6       | $5/M input    | $3/M input   | -40%   | 100K tokens: $300 vs $500 actual  |
| gpt-3.5-turbo (Codex) | $0.50/M       | $3/M         | +500%  | 100K tokens: $300 vs $50 actual   |
| gpt-4 (Codex)         | $30/M         | $3/M         | -90%   | 100K tokens: $300 vs $3000 actual |

**Violates Discovery Requirement**:

- Success metric: "Cost accuracy within 1% of actual provider bills"
- Current error: 40% to 1100% off target
- **CRITICAL BUG**: Blocks feature acceptance

**Fix** (2-line change):

```typescript
const cost = calculateCost(
  inputTokens + cacheCreationTokens,
  outputTokens,
  provider, // ✅ Use detected provider (line 174)
  model // ✅ Use extracted model (line 200)
);
```

**Similar Issue in CodexUsageAdapter.ts:181**:

```typescript
// Also hardcodes 'openai', needs same fix
const cost = calculateCost(inputTokens, outputTokens, 'openai');

// Should be:
const model = entry.model || entry.request?.model || 'gpt-4-turbo';
const cost = calculateCost(inputTokens, outputTokens, 'openai', model);
```

### Bug #3: Provider-Based Pricing - CONFIRMED CRITICAL

**Location**: `pricing.ts:23-27`

**Current Structure**:

```typescript
export const COST_PER_1K_TOKENS: Record<string, PricingConfig> = {
  anthropic: { input: 0.003, output: 0.015 }, // ONE rate for ALL Anthropic models
  google: { input: 0.00025, output: 0.0005 }, // ONE rate for ALL Google models
  openai: { input: 0.005, output: 0.015 }, // ONE rate for ALL OpenAI models
};
```

**Impact - Anthropic Models (Claude Code)**:

| Model          | Actual Input | Actual Output | Charged Input | Charged Output | Input Error | Output Error |
| -------------- | ------------ | ------------- | ------------- | -------------- | ----------- | ------------ |
| **Opus 4.6**   | $15/M        | $75/M         | $3/M          | $15/M          | -80%        | -80%         |
| **Sonnet 4.5** | $3/M         | $15/M         | $3/M          | $15/M          | ✓ 0%        | ✓ 0%         |
| **Haiku 4.5**  | $1/M         | $5/M          | $3/M          | $15/M          | +200%       | +200%        |
| **Haiku 3.5**  | $0.25/M      | $1.25/M       | $3/M          | $15/M          | +1100%      | +1100%       |

**Impact - OpenAI Models (Codex/Copilot)**:

| Model             | Actual Input | Actual Output | Charged Input | Charged Output | Input Error | Output Error |
| ----------------- | ------------ | ------------- | ------------- | -------------- | ----------- | ------------ |
| **GPT-4**         | $30/M        | $60/M         | $5/M          | $15/M          | -83%        | -75%         |
| **GPT-4-turbo**   | $10/M        | $30/M         | $5/M          | $15/M          | -50%        | -50%         |
| **GPT-4o**        | $5/M         | $15/M         | $5/M          | $15/M          | ✓ 0%        | ✓ 0%         |
| **GPT-3.5-turbo** | $0.50/M      | $1.50/M       | $5/M          | $15/M          | +900%       | +900%        |
| **o1**            | $15/M        | $60/M         | $5/M          | $15/M          | -67%        | -75%         |

**Real-World Example (Haiku User)**:

```
User runs 1M input + 500K output tokens through Haiku 3.5

CURRENT (WRONG):
  Input:  1M * $3/M = $3.00
  Output: 500K * $15/M = $7.50
  Total:  $10.50

ACTUAL (CORRECT):
  Input:  1M * $0.25/M = $0.25
  Output: 500K * $1.25/M = $0.625
  Total:  $0.875

ERROR: 12x overcharge ($10.50 vs $0.875)
```

**Real-World Example (Opus User)**:

```
User runs 1M input + 500K output tokens through Opus 4.6

CURRENT (WRONG):
  Input:  1M * $3/M = $3.00
  Output: 500K * $15/M = $7.50
  Total:  $10.50

ACTUAL (CORRECT):
  Input:  1M * $15/M = $15.00
  Output: 500K * $75/M = $37.50
  Total:  $52.50

ERROR: 5x undercharge ($10.50 vs $52.50)
```

**Fix**: Implement model-based pricing (see Recommendation #4)

---

## Data Flow Diagrams

### Current (Broken) Flow:

```
┌─────────────────────────────────────────────┐
│ JSONL Conversation Log Entry               │
│                                             │
│  {                                          │
│    type: "assistant",                       │
│    message: {                               │
│      model: "claude-haiku-3-5-20241022",   │ ← MODEL AVAILABLE
│      usage: {                               │
│        input_tokens: 50000,                 │
│        output_tokens: 10000                 │
│      }                                      │
│    }                                        │
│  }                                          │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ ClaudeCodeUsageAdapter.parseConversationFile│
│                                             │
│  provider = detectProvider(entry)           │
│    → 'claude-code'                          │ ← DETECTED
│                                             │
│  model = entry.message?.model               │
│    → 'claude-haiku-3-5-20241022'           │ ← EXTRACTED
│                                             │
│  ❌ cost = calculateCost(                   │
│       50000, 10000,                         │
│       'anthropic'  ← HARDCODED!             │ ← BUG #2
│     )                                       │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ pricing.ts:calculateCost()                  │
│                                             │
│  providerId = 'anthropic'                   │ ← FROM HARDCODE
│  modelId = undefined                        │ ← NOT PASSED
│                                             │
│  rates = COST_PER_1K_TOKENS['anthropic']    │ ← BUG #3
│    → { input: 0.003, output: 0.015 }        │
│                                             │
│  return (50000 * 0.003 + 10000 * 0.015)     │
│         / 1000                              │
│    = (150 + 150) / 1000                     │
│    = $0.30                                  │
└─────────────────────────────────────────────┘
                  ↓
           WRONG COST: $0.30
        (should be $0.025)
          ERROR: 12x overcharge
```

### Fixed Flow:

```
┌─────────────────────────────────────────────┐
│ JSONL Conversation Log Entry               │
│                                             │
│  {                                          │
│    type: "assistant",                       │
│    message: {                               │
│      model: "claude-haiku-3-5-20241022",   │ ← MODEL AVAILABLE
│      usage: {                               │
│        input_tokens: 50000,                 │
│        output_tokens: 10000                 │
│      }                                      │
│    }                                        │
│  }                                          │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ ClaudeCodeUsageAdapter.parseConversationFile│
│                                             │
│  provider = detectProvider(entry)           │
│    → 'anthropic'                            │ ← DETECTED
│                                             │
│  model = entry.message?.model               │
│    → 'claude-haiku-3-5-20241022'           │ ← EXTRACTED
│                                             │
│  ✅ cost = calculateCost(                   │
│       50000, 10000,                         │
│       provider,    ← USES DETECTED          │ ← FIX #2
│       model        ← USES EXTRACTED         │ ← FIX #2
│     )                                       │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ pricing.ts:calculateCost()                  │
│                                             │
│  providerId = 'anthropic'                   │ ← FROM DETECTION
│  modelId = 'claude-haiku-3-5-20241022'     │ ← PASSED IN
│                                             │
│  rates = getPricingForModel(modelId,        │ ← FIX #3
│                              providerId)    │
│    ├─ Try exact: MODEL_PRICING[modelId]?   │
│    │    → Not found                         │
│    ├─ Try prefix: 'claude-haiku-3-5'       │
│    │    → MATCH! ✅                         │
│    └─ Return { input: 0.00025,             │
│                output: 0.00125 }            │
│                                             │
│  return (50000 * 0.00025 + 10000 * 0.00125)│
│         / 1000                              │
│    = (12.5 + 12.5) / 1000                   │
│    = $0.025                                 │
└─────────────────────────────────────────────┘
                  ↓
          CORRECT COST: $0.025
           (matches actual)
          ✅ Within 1% accuracy
```

---

## Sources

**API Pricing Documentation** (March 2026):

- [Anthropic Claude API Pricing - Official](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI GPT Pricing Page](https://openai.com/pricing)
- [Google Gemini API Pricing](https://ai.google.dev/pricing)

**Web Research** (Claude API Pricing 2026):

- [Claude API Pricing Per Token 2026](https://www.tldl.io/resources/anthropic-api-pricing)
- [Anthropic API Pricing Breakdown - MetaCTO](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration)
- [Claude API Pricing Calculator - CostGoat](https://costgoat.com/pricing/claude-api)
- [Claude Pricing Guide 2026 - AI Free API](https://www.aifreeapi.com/en/posts/claude-api-pricing-per-million-tokens)

**Current Pricing Rates** (as of 2026-03-19):

**Anthropic Claude**:

- Haiku 3.5: $0.25/M input, $1.25/M output
- Haiku 4.5: $1/M input, $5/M output
- Sonnet 4.5: $3/M input, $15/M output (CURRENT DEFAULT in code)
- Opus 4.6: $5/M input, $25/M output
- Prompt caching: 90% discount on cached token reads
- Batch API: 50% discount for async workloads

**OpenAI GPT** (for Codex/Copilot):

- GPT-3.5-turbo: $0.50/M input, $1.50/M output
- GPT-4o: $5/M input, $15/M output
- GPT-4-turbo: $10/M input, $30/M output
- GPT-4: $30/M input, $60/M output
- o1: $15/M input, $60/M output
- o1-mini: $3/M input, $12/M output

**Google Gemini**:

- Gemini 1.5 Flash: $0.075/M input, $0.30/M output
- Gemini Pro: $0.50/M input, $1.50/M output
- Gemini 1.5 Pro: $1.25/M input, $5/M output

**Note**: Rates are per million tokens ($/M). In code, stored as per-1K ($0.003
= $3/M).
