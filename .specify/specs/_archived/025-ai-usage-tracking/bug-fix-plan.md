---
feature: '025-ai-usage-tracking-bug-fix'
spec: 'bug-fix-spec.md'
research: 'bug-fix-research.md'
status: ready
created: '2026-03-19T00:00:00Z'
---

# Implementation Plan: AI Token Cost Calculation Bug Fixes

**Branch**: `025-ai-usage-tracking-bug-fix` | **Date**: 2026-03-19 | **Spec**:
[bug-fix-spec.md](./bug-fix-spec.md)

## Summary

Fix three critical bugs in AI token usage cost calculation that violate the
feature's core requirement of "Cost accuracy within 1% of actual provider
bills". Current implementation produces cost errors ranging from 40% to 1100%,
making the feature fundamentally inaccurate for budget tracking. This plan
addresses: (1) Hardcoded provider strings ignoring detected provider/model data,
(2) Provider-based pricing when models within same provider vary 60x in cost
(Haiku $0.25/M vs Opus $15/M), and (3) Formula verification with real invoice
data.

The solution implements a model-based pricing architecture following the proven
MODEL_CONTEXT_LIMITS pattern from ClaudeSessionReader.ts, with prefix matching
for versioned model IDs, backward-compatible API changes, and consolidation of
duplicate pricing tables across the codebase.

## Technical Context

**Tech Stack**:

- Language: TypeScript (strict mode)
- Framework: VSCode Extension API
- Runtime: Node.js 18+
- Testing: Vitest (unit/integration), manual invoice validation
- Build: Webpack 5

**Architecture Overview**:

The pricing system flows through these components:

```
JSONL Log → UsageAdapter → calculateCost() → CostBudgetEnforcer → ContextUsageLogger → UI Display
              ↓                    ↓
         Extracts model      Looks up pricing
         from log file       from registry
```

**Current Flow (Broken)**:

1. ClaudeCodeUsageAdapter extracts provider + model from log (WORKS)
2. Adapter calls calculateCost() with hardcoded 'anthropic' string (BUG #2)
3. calculateCost() looks up provider-level pricing only (BUG #3)
4. All models charged same rate regardless of actual model used

**Fixed Flow**:

1. ClaudeCodeUsageAdapter extracts provider + model from log
2. Adapter passes BOTH provider AND model to calculateCost()
3. calculateCost() uses getPricingForModel(modelId, providerId) for accurate
   rates
4. Each model charged correct rate (Opus $5/M, Sonnet $3/M, Haiku $0.25/M)

**Integration Points**:

| Component            | File                                                     | Integration Type       | Change Required                      |
| -------------------- | -------------------------------------------------------- | ---------------------- | ------------------------------------ |
| **Pricing Registry** | `extension/src/config/pricing.ts:23-27`                  | Central configuration  | Add MODEL_PRICING table (60+ models) |
| **Cost Calculator**  | `extension/src/config/pricing.ts:58-65`                  | Core calculation logic | Add optional modelId parameter       |
| **Pricing Lookup**   | `extension/src/config/pricing.ts` (new)                  | Model pricing resolver | Add getPricingForModel() helper      |
| **Claude Adapter**   | `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:198` | High-impact call site  | Pass provider + model variables      |
| **Codex Adapter**    | `extension/src/autonomous/CodexUsageAdapter.ts:181`      | High-impact call site  | Add model extraction, pass model     |
| **Budget Enforcer**  | `extension/src/autonomous/CostBudgetEnforcer.ts:68-72`   | Cost tracking          | Add optional modelId parameter       |
| **Context Logger**   | `extension/src/autonomous/ContextUsageLogger.ts`         | Usage logging          | Forward modelId to tracking          |
| **Usage Logger**     | `extension/src/council/UsageLogger.ts:72-78`             | Aggregate logging      | Remove duplicate pricing, import     |
| **Budget Duplicate** | `extension/src/autonomous/CostBudgetEnforcer.ts:16-20`   | Duplicate pricing      | Remove duplicate, import             |

**Key Dependencies**:

- **Existing Patterns**: MODEL_CONTEXT_LIMITS (ClaudeSessionReader.ts:62-75) -
  proven prefix matching pattern for versioned model IDs
- **Model Detection**: ClaudeCodeUsageAdapter.detectProvider() (line 119-141)
  already extracts provider correctly
- **Model Extraction**: line 200 already extracts model ID but result is unused
- **Type Definitions**: PricingConfig interface from types/aiUsage.ts
- **Logging**: Logger.for() pattern for warnings on fallback scenarios

## Constitution Check

**Principle I - Test-Driven Development**: ✅ COMPLIANT

- Phase 1 requires unit tests for getPricingForModel() BEFORE implementation
- Phase 2 requires integration tests for model-based costs BEFORE adapter
  changes
- All tests must FAIL first, then implementation makes them pass

**Principle II - MCP-First Architecture**: ✅ N/A

- Bug fix is internal cost calculation logic, no MCP tools involved

**Principle III - Spec Kit Format Compliance**: ✅ COMPLIANT

- Spec follows GitHub Spec Kit format with YAML frontmatter
- User stories have checkable acceptance criteria
- All requirements mapped to plan components

**Principle IV - Strict TypeScript & Code Quality**: ✅ COMPLIANT

- Optional parameters maintain type safety (modelId?: string)
- No any types - PricingConfig interface is fully typed
- Changes localized to small functions (<100 lines each)
- Cyclomatic complexity <10 (simple lookup logic)

**Principle V - Security by Default**: ✅ COMPLIANT

- Pricing data is hardcoded constants (no injection risk)
- Model IDs from logs are strings only (no code execution)
- Fallback logic prevents crashes on malformed input

**Principle VI - Performance Requirements**: ✅ COMPLIANT

- Lookup table access is O(1) exact match or O(n) prefix match (n=60 models,
  <1ms)
- No network calls, no file I/O - pure computation
- Maintains <1s UI update latency requirement from discovery.md

**Principle VII - 80% Test Coverage Minimum**: ✅ COMPLIANT

- Unit tests for getPricingForModel() (exact, prefix, fallback paths)
- Unit tests for calculateCost() (with/without modelId parameter)
- Integration tests for adapter → calculateCost → cost accuracy
- Manual validation tests against real invoices

**Principle VIII - Minimal Necessary Changes**: ✅ COMPLIANT

- Only modifies files listed in integration points table
- No refactoring of surrounding adapter logic
- No new features beyond fixing the three bugs
- Preserves backward compatibility with optional parameters

**Summary**: APPROVED - All constitution principles satisfied.

## Implementation Phases

### Phase 1: Foundation (Non-Breaking)

**Goal**: Create model-based pricing infrastructure without breaking existing
code.

**Tasks**:

- [ ] Create MODEL_PRICING table in pricing.ts with 60+ model entries
  - Anthropic models: Opus 4.6/4.5 ($5/$25/M), Sonnet 4.5/4 ($3/$15/M), Haiku
    4.5 ($1/$5/M), Haiku 3.5 ($0.25/$1.25/M)
  - OpenAI models: GPT-4 ($30/$60/M), GPT-4-turbo ($10/$30/M), GPT-4o
    ($5/$15/M), GPT-3.5-turbo ($0.50/$1.50/M), o1 ($15/$60/M), o1-mini
    ($3/$12/M)
  - Google models: Gemini 1.5 Pro ($1.25/$5/M), Gemini 1.5 Flash
    ($0.075/$0.30/M), Gemini Pro ($0.50/$1.50/M)
  - Include dated variants with prefix keys (e.g., claude-sonnet-4-5 matches
    claude-sonnet-4-5-20250929)

- [ ] Add DEFAULT_MODELS mapping in pricing.ts
  - anthropic → 'claude-sonnet-4-5' (mid-tier default)
  - openai → 'gpt-4-turbo' (common Codex default)
  - google → 'gemini-1.5-flash' (common Google default)

- [ ] Add getPricingForModel(modelId: string, providerId: string) helper
      function
  - Try exact match: MODEL_PRICING[modelId]
  - Try prefix match: Iterate MODEL_PRICING keys, match if
    modelId.startsWith(key) or key.startsWith(modelId)
  - Fallback to DEFAULT_MODELS[providerId] if no match
  - Ultimate fallback to COST_PER_1K_TOKENS[providerId] for backward
    compatibility
  - Log warnings when fallback is used

- [ ] Update calculateCost() signature: Add optional modelId parameter
  - Old: `calculateCost(inputTokens, outputTokens, providerId?)`
  - New: `calculateCost(inputTokens, outputTokens, providerId?, modelId?)`
  - Implementation: If modelId provided, use getPricingForModel(modelId,
    providerId), else use old COST_PER_1K_TOKENS[providerId]

- [ ] Write unit tests for getPricingForModel() (tests MUST fail before
      implementation)
  - Test exact match: `getPricingForModel('claude-sonnet-4-5', 'anthropic')`
    returns {input: 0.003, output: 0.015}
  - Test prefix match:
    `getPricingForModel('claude-sonnet-4-5-20250929', 'anthropic')` returns
    Sonnet rates
  - Test fallback to provider default:
    `getPricingForModel('unknown-model', 'anthropic')` returns Sonnet rates
  - Test ultimate fallback: `getPricingForModel('unknown', 'unknown')` returns
    DEFAULT_PROVIDER rates

- [ ] Write unit tests for calculateCost() backward compatibility (tests MUST
      fail before implementation)
  - Test without modelId parameter: `calculateCost(100000, 50000, 'anthropic')`
    uses COST_PER_1K_TOKENS
  - Test with modelId parameter:
    `calculateCost(100000, 50000, 'anthropic', 'claude-haiku-3-5')` uses
    MODEL_PRICING
  - Verify costs differ: Haiku calculation should be ~12x cheaper than
    provider-level calculation

**Verification**: All existing tests pass (backward compatibility maintained).
New tests verify model-based pricing works correctly.

---

### Phase 2: High-Impact Call Sites

**Goal**: Fix hardcoded providers in highest-impact adapters (Claude Code and
Codex CLI users).

**Tasks**:

- [ ] Update ClaudeCodeUsageAdapter.ts:198 to pass provider and model variables
  - Replace:
    `calculateCost(inputTokens + cacheCreationTokens, outputTokens, 'anthropic')`
  - With:
    `calculateCost(inputTokens + cacheCreationTokens, outputTokens, provider, model)`
  - Variables already available: provider (line 174), model (line 200)
  - No new detection logic needed - just wire existing variables

- [ ] Add model extraction to CodexUsageAdapter.ts (parseHistoryEntry method)
  - Extract model from Codex history.json:
    `entry.model || entry.request?.model || 'gpt-4-turbo'`
  - Store in local variable before calculateCost() call

- [ ] Update CodexUsageAdapter.ts:181 to pass model parameter
  - Replace: `calculateCost(inputTokens, outputTokens, 'openai')`
  - With: `calculateCost(inputTokens, outputTokens, 'openai', model)`

- [ ] Write integration tests for model-based costs (tests MUST fail before
      implementation)
  - Test Opus vs Sonnet vs Haiku costs for same token count (should differ by
    20x)
  - Test GPT-4 vs GPT-3.5 costs for same token count (should differ by 60x)
  - Verify 100K input + 50K output Haiku 3.5 = $0.0875 (not $0.45 as current
    code)
  - Verify 100K input + 50K output Opus 4.6 = $5.25 (not $0.45 as current code)

- [ ] Manual verification with real conversation logs
  - Parse actual Claude Code logs with known models
  - Calculate costs using new logic
  - Compare to cost calculations in existing council-usage.jsonl
  - Document error reduction (from 1100% to <1%)

**Verification**: Cost calculations accurate within 1% for all models tested.
Integration tests pass. Real log parsing produces expected costs matching
provider documentation.

---

### Phase 3: Supporting Components

**Goal**: Propagate model parameter through cost tracking stack.

**Tasks**:

- [ ] Update CostBudgetEnforcer.recordUsage() signature
  - Add optional modelId parameter:
    `recordUsage(inputTokens, outputTokens, providerId?, modelId?)`
  - Forward modelId to calculateCost() call at line 72

- [ ] Update ContextUsageLogger.logLLMCall() to accept and forward modelId
  - Add modelId parameter to method signature
  - Include modelId in log entry data

- [ ] Add model field to UsageLogEntry interface (types/aiUsage.ts or similar)
  - Add `model?: string` field to interface
  - Update parsers to handle optional model field

- [ ] Update all recordUsage() call sites to pass model when available
  - Search codebase for recordUsage() calls
  - Pass model parameter where source data includes model ID
  - Use undefined/omit parameter where model not available (backward compatible)

- [ ] Write integration tests for model propagation (tests MUST fail before
      implementation)
  - Verify model flows from adapter → recordUsage() → calculateCost() → log
    entry
  - Verify council-usage.jsonl entries include model field
  - Verify budget tracking uses model-specific rates

**Verification**: Budget tracking shows accurate per-model costs. Usage logs
include model field. End-to-end flow from log file to UI uses correct rates.

---

### Phase 4: Cleanup & Consolidation

**Goal**: Remove duplicate pricing tables and improve maintainability (DRY
principle).

**Tasks**:

- [ ] Remove duplicate COST_PER_1K_TOKENS from CostBudgetEnforcer.ts:16-20
  - Delete local constant definition
  - Add import: `import { COST_PER_1K_TOKENS } from '../config/pricing'` (for
    backward compatibility fallback)

- [ ] Remove duplicate COST_PER_1K_TOKENS from UsageLogger.ts:72-78
  - Delete local constant definition
  - Add import:
    `import { MODEL_PRICING, getPricingForModel } from '../config/pricing'`

- [ ] Update imports to use pricing.ts as single source
  - Search for any remaining hardcoded pricing literals (0.003, 0.015, etc.)
  - Replace with imports from pricing.ts

- [ ] Verify no drift between pricing sources
  - Grep codebase for pricing rate literals outside pricing.ts
  - Confirm single source of truth established

- [ ] Run all tests to verify no regressions
  - All existing tests must pass
  - No behavior changes from consolidation

**Verification**: Single pricing source confirmed via grep. All tests pass. No
hardcoded pricing rates outside pricing.ts. DRY principle satisfied.

---

### Phase 5: Formula Verification & Documentation

**Goal**: Verify mathematical correctness and update documentation.

**Tasks**:

- [ ] Compare calculated costs to actual Anthropic invoices
  - Collect 5+ real conversation logs with known token counts
  - Calculate costs using new model-based pricing
  - Compare to actual Anthropic invoice line items for same conversations
  - Measure error percentage: `abs(calculated - actual) / actual`
  - Accept if error < 1% (discovery.md:32 requirement)

- [ ] Compare calculated costs to actual OpenAI invoices (if Codex logs
      available)
  - Repeat process with Codex CLI conversation logs
  - Verify GPT-4, GPT-4-turbo, GPT-3.5 costs match invoices
  - Measure error < 1%

- [ ] Verify formula is mathematically correct
  - Current formula:
    `(inputTokens * rates.input + outputTokens * rates.output) / 1000`
  - Test with real numbers: 100K input at $3/M = (100000 \* 0.003) / 1000 =
    $0.30
  - Algebraic equivalent: `(inputTokens / 1000) * rates.input` = (100000
    / 1000) \* 0.003 = $0.30
  - Conclusion: Formulas are equivalent (Bug #1 is inconclusive/non-issue)

- [ ] Update PRICING_LAST_UPDATED timestamp to '2026-03-19'
  - Change date in pricing.ts:33 from 2026-03-15 to 2026-03-19
  - Document in comment that pricing rates verified against provider docs

- [ ] Document model pricing sources in code comments
  - Add comments to MODEL_PRICING table with source URLs
  - Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
  - OpenAI: https://openai.com/pricing
  - Google: https://ai.google.dev/pricing

- [ ] Add migration notes to CHANGELOG
  - Document breaking changes: None (backward compatible)
  - Document new features: Model-based pricing, getPricingForModel() helper
  - Document fixes: Hardcoded provider strings, provider-level pricing
  - Document migration: Existing code continues to work, gradually update call
    sites

- [ ] Update feature validation report
      (.specify/specs/025-ai-usage-tracking/validation-report.md if exists)
  - Document cost accuracy improvement: 1100% error → <1% error
  - Document bug fixes completed
  - Update success metrics: Cost accuracy within 1% achieved

**Verification**: Mean cost error <1% vs actual invoices. No individual
conversation >5% error. Formula confirmed correct. Documentation complete with
sources and migration guidance.

---

## File Structure

```
extension/src/
├── config/
│   └── pricing.ts                    [MODIFIED] Add MODEL_PRICING table (60+ entries)
│                                                Add DEFAULT_MODELS mapping
│                                                Add getPricingForModel() helper
│                                                Update calculateCost() signature (+modelId param)
│                                                Update PRICING_LAST_UPDATED to 2026-03-19
│
├── autonomous/
│   ├── ClaudeCodeUsageAdapter.ts     [MODIFIED] Line 198: Pass provider + model variables
│   │                                             (not hardcoded 'anthropic')
│   │
│   ├── CodexUsageAdapter.ts          [MODIFIED] Add model extraction from history.json
│   │                                             Line 181: Pass model parameter
│   │                                             (not just hardcoded 'openai')
│   │
│   ├── CostBudgetEnforcer.ts         [MODIFIED] Line 68-93: Add optional modelId parameter to recordUsage()
│   │                                             Line 72: Forward modelId to calculateCost()
│   │                                             Line 16-20: Remove duplicate COST_PER_1K_TOKENS
│   │                                             Add import from pricing.ts
│   │
│   └── ContextUsageLogger.ts         [MODIFIED] Add modelId parameter to logLLMCall()
│                                                 Pass modelId to cost tracking
│
├── council/
│   └── UsageLogger.ts                [MODIFIED] Line 72-78: Remove duplicate COST_PER_1K_TOKENS
│                                                 Add import from pricing.ts
│                                                 Use MODEL_PRICING + getPricingForModel()
│
├── ui/
│   └── AIUsageProvider.ts            [NO CHANGE] Formula already correct (Bug #1 non-issue)
│                                                 May display model breakdown in future
│
└── types/
    └── aiUsage.ts                    [MODIFIED] Add optional model field to UsageLogEntry interface
                                                 (if not already present)
```

**Total Files Modified**: 7 files **New Functions Added**: 2
(getPricingForModel, DEFAULT_MODELS constant) **Lines Changed**: ~150 total
(mostly additive - new MODEL_PRICING table)

---

## Risk Assessment

| Risk                                              | Impact   | Likelihood | Mitigation                                                                                                                                                                                                        |
| ------------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Breaking existing code with signature changes** | HIGH     | LOW        | Use optional parameters (modelId?: string). All existing call sites continue to work without modification. Existing tests pass. TypeScript compiler enforces correct usage.                                       |
| **Pricing table outdated (rates change)**         | MEDIUM   | MEDIUM     | Add PRICING_LAST_UPDATED timestamp (already exists). isPricingStale() warns after 90 days (already implemented). Document pricing sources in comments for easy updates.                                           |
| **Model detection fails**                         | MEDIUM   | LOW        | Fallback hierarchy: exact → prefix → DEFAULT_MODELS → COST_PER_1K_TOKENS. Log warnings when fallback used. Never crash or show $0 cost. Mid-tier defaults (Sonnet, GPT-4-turbo) provide reasonable approximation. |
| **Prefix matching incorrect**                     | LOW      | VERY LOW   | Use proven pattern from ClaudeSessionReader.getModelContextLimit() (15+ models in production). Test thoroughly with dated variants. Log warnings on fallback for debugging.                                       |
| **Historical data inaccurate**                    | LOW      | CERTAIN    | Accept limitation - cannot retroactively fix logs without model field. Document in release notes. Focus on forward accuracy. Consider UI indicator for pre-fix vs post-fix data.                                  |
| **Floating-point precision errors**               | VERY LOW | VERY LOW   | Formulas are algebraically equivalent (associative property). Real invoice comparison in Phase 5 will catch any practical issues. Error margin <0.01% acceptable.                                                 |

**Overall Risk**: LOW - Backward compatibility maintained, proven patterns used,
comprehensive fallback logic, extensive testing plan.

---

## Spec Traceability

### User Story Coverage

| Story ID   | Title                                                | Status     | Plan References                                                                                                                                                        |
| ---------- | ---------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **US-001** | Accurate Cost Display for Model Used                 | ✅ COVERED | Phase 1: MODEL_PRICING table<br>Phase 2: ClaudeCodeUsageAdapter fix<br>Phase 5: Invoice verification<br>SC-001, SC-002 (cost accuracy metrics)                         |
| **US-002** | Correct Provider/Model Detection in Cost Calculation | ✅ COVERED | Phase 2: ClaudeCodeUsageAdapter.ts:198 fix (pass provider variable)<br>Phase 2: CodexUsageAdapter.ts:181 fix (add model extraction)<br>FR-004 (detection requirements) |
| **US-003** | Model-Based Pricing Lookup Architecture              | ✅ COVERED | Phase 1: MODEL_PRICING registry (60+ models)<br>Phase 1: getPricingForModel() helper<br>Phase 1: calculateCost() signature update<br>FR-001, FR-002, FR-003            |
| **US-004** | Consolidated Pricing Source                          | ✅ COVERED | Phase 4: Remove duplicates from CostBudgetEnforcer.ts<br>Phase 4: Remove duplicates from UsageLogger.ts<br>Phase 4: Single source verification<br>FR-006, NFR-004      |
| **US-005** | Formula Verification with Real Data                  | ✅ COVERED | Phase 5: Compare to Anthropic invoices<br>Phase 5: Compare to OpenAI invoices<br>Phase 5: Mathematical verification<br>FR-007, SC-010                                  |

**Coverage**: 5/5 user stories (100%)

---

### Functional Requirements Coverage

| FR-ID      | Requirement                                             | Status     | Plan Reference                                                                                                                       |
| ---------- | ------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **FR-001** | Model-Specific Pricing Registry                         | ✅ COVERED | Phase 1: Create MODEL_PRICING table with 60+ models (Anthropic, OpenAI, Google). Replaces provider-level COST_PER_1K_TOKENS.         |
| **FR-002** | Model Pricing Lookup with Prefix Matching               | ✅ COVERED | Phase 1: Add getPricingForModel(modelId, providerId) with exact → prefix → fallback logic. Mirrors ClaudeSessionReader pattern.      |
| **FR-003** | Backward Compatible Cost Calculation API                | ✅ COVERED | Phase 1: Update calculateCost() signature to accept optional modelId parameter. Maintains compatibility with 7+ existing call sites. |
| **FR-004** | Provider and Model Detection in Usage Adapters          | ✅ COVERED | Phase 2: ClaudeCodeUsageAdapter passes provider + model variables (line 198). CodexUsageAdapter adds model extraction (line 181).    |
| **FR-005** | Model Parameter Propagation Through Cost Tracking Stack | ✅ COVERED | Phase 3: CostBudgetEnforcer.recordUsage() accepts modelId. ContextUsageLogger forwards modelId. UsageLogEntry interface updated.     |
| **FR-006** | Consolidated Pricing Source (DRY Principle)             | ✅ COVERED | Phase 4: Remove duplicates from CostBudgetEnforcer.ts:16-20 and UsageLogger.ts:72-78. All components import from pricing.ts.         |
| **FR-007** | Formula Verification Against Real Provider Invoices     | ✅ COVERED | Phase 5: Compare calculated costs to actual Anthropic/OpenAI invoices (5+ conversations each). Accept if error <1%.                  |
| **FR-008** | Unknown Model Fallback Strategy                         | ✅ COVERED | Phase 1: getPricingForModel() fallback hierarchy. DEFAULT_MODELS mapping. Never crash or return $0. Log warnings.                    |

**Coverage**: 8/8 functional requirements (100%)

---

### Acceptance Criteria Coverage

**Total Acceptance Criteria**: 32 across 5 user stories

**Coverage Status**:

**User Story 1 (5 ACs)**: ✅ All covered

- AC1: Haiku-specific rates → Phase 1 MODEL_PRICING, Phase 2 adapter fix
- AC2: Haiku 4.5 rates → Phase 1 MODEL_PRICING
- AC3: Cost calculation accuracy → Phase 2 integration tests, Phase 5
  verification
- AC4: 1% accuracy for all models → Phase 5 invoice comparison (SC-001 to
  SC-010)
- AC5: Prefix matching for dated variants → Phase 1 getPricingForModel()

**User Story 2 (7 ACs)**: ✅ All covered

- AC1: ClaudeCodeUsageAdapter passes provider → Phase 2, line 198 fix
- AC2: ClaudeCodeUsageAdapter passes model → Phase 2, line 198 fix
- AC3: CodexUsageAdapter extracts model → Phase 2, CodexUsageAdapter changes
- AC4: CodexUsageAdapter passes model → Phase 2, line 181 fix
- AC5: Provider detection flows through → Phase 2 integration tests
- AC6: Model extraction flows through → Phase 3 propagation tests
- AC7: Fallback to DEFAULT_MODELS → Phase 1 getPricingForModel() implementation

**User Story 3 (8 ACs)**: ✅ All covered

- AC1: 60+ models in MODEL_PRICING → Phase 1 task 1
- AC2: All Claude models included → Phase 1 task 1
- AC3: OpenAI models included → Phase 1 task 1
- AC4: Google models included → Phase 1 task 1
- AC5: getPricingForModel() supports all strategies → Phase 1 task 3
- AC6: Prefix matching follows ClaudeSessionReader → Phase 1 implementation
  notes
- AC7: calculateCost() signature updated → Phase 1 task 4
- AC8: Backward compatibility maintained → Phase 1 verification, NFR-003

**User Story 4 (7 ACs)**: ✅ All covered

- AC1: Single pricing registry → Phase 4 consolidation goal
- AC2: Remove duplicate from CostBudgetEnforcer → Phase 4 task 1
- AC3: Remove duplicate from UsageLogger → Phase 4 task 2
- AC4: CostBudgetEnforcer imports from pricing.ts → Phase 4 task 1
- AC5: UsageLogger imports from pricing.ts → Phase 4 task 2
- AC6: All tests pass after consolidation → Phase 4 verification
- AC7: PRICING_LAST_UPDATED updated → Phase 5 task 4

**User Story 5 (5 ACs)**: ✅ All covered

- AC1: Verify against Anthropic invoices → Phase 5 task 1
- AC2: Verify against OpenAI invoices → Phase 5 task 2
- AC3: Error < 0.01% or > 1% → Phase 5 task 3
- AC4: Confirm formula or fix inversion → Phase 5 task 3
- AC5: Documentation clarifies rate units → Phase 5 task 5

**Coverage**: 32/32 acceptance criteria (100%)

---

## Key Architecture Decisions

### Decision 1: Model-Based Pricing with Prefix Matching

**Chosen Approach**: MODEL_PRICING table with 60+ model entries, prefix matching
for versioned IDs (e.g., "claude-sonnet-4-5" matches
"claude-sonnet-4-5-20250929").

**Rationale**:

- 60x price variation within single provider (Haiku $0.25/M vs Opus $15/M)
- Current provider-level pricing produces 40-1100% cost errors
- Discovery requirement: "Cost accuracy within 1% of actual provider bills"
- Multi-CLI reality: Codex can use ANY OpenAI model (user configurable)
- Proven pattern: ClaudeSessionReader.getModelContextLimit() uses same approach
  for 15+ models

**Alternatives Rejected**:

- Provider-level "average" rates: Violates 1% accuracy requirement, 600-1200%
  error margin
- Dynamic API pricing lookup: Too slow (<1s latency requirement), no provider
  APIs exist
- User-configurable rates: Maintenance burden, error-prone, will drift

---

### Decision 2: Backward Compatible Optional Parameters

**Chosen Approach**: Add optional `modelId?: string` parameter to
calculateCost(), maintain existing signature for compatibility.

**Rationale**:

- 7+ call sites across codebase use current signature
- All existing tests expect current behavior
- Optional parameter allows gradual migration (high-impact first, low-impact
  later)
- TypeScript enforces correct usage at compile time
- Idiomatic TypeScript pattern

**Alternatives Rejected**:

- Breaking change with required model: Risky, all 7+ call sites break
  immediately, blocks incremental rollout
- Separate function calculateCostByModel(): Code duplication, confusing API
  (which to use when?)
- Function overloading: Not idiomatic in TypeScript, more complex, runtime
  behavior unclear

---

### Decision 3: Fallback Hierarchy for Unknown Models

**Chosen Approach**: Exact match → Prefix match → DEFAULT_MODELS[provider] →
COST_PER_1K_TOKENS[provider] → COST_PER_1K_TOKENS[DEFAULT_PROVIDER]

**Rationale**:

- Handles 95%+ of models via exact/prefix match
- Unknown models fall back to mid-tier defaults (Sonnet, GPT-4-turbo) -
  reasonable approximation
- Never crashes or shows $0 cost
- Logs warnings for debugging when fallback used
- Better to show approximate cost than crash

**Alternatives Rejected**:

- Crash on unknown model: Breaks feature entirely for new models, poor user
  experience
- Return $0 on unknown: Misleading, users think usage is free
- Require user to configure unknown models: Maintenance burden, error-prone

---

### Decision 4: Consolidate to Single Pricing Source

**Chosen Approach**: Single MODEL_PRICING registry in pricing.ts, all consumers
import from there. Remove duplicates in CostBudgetEnforcer.ts and
UsageLogger.ts.

**Rationale**:

- DRY principle (Don't Repeat Yourself)
- Found 3 duplicate copies already showing drift (UsageLogger has extra entries)
- Single update point when providers change pricing
- Consistency across all components

**Alternatives Rejected**:

- Keep duplicates for "independence": Maintenance nightmare, already drifting,
  no architectural benefit
- Config file (YAML/JSON): Over-engineering for simple constants, adds I/O
  complexity, loses type safety

---

### Decision 5: Formula Verification via Invoice Comparison

**Chosen Approach**: Compare calculated costs to actual provider invoices for
10+ real conversations. Accept if error <1%.

**Rationale**:

- Mathematical analysis shows formulas are equivalent (associative property)
- Practical testing required to rule out floating-point precision issues
- Discovery requirement: 1% accuracy vs actual bills
- Invoice data is ground truth

**Alternatives Rejected**:

- Skip verification (assume math correct): Risky, user reported Bug #1, need
  empirical confirmation
- Synthetic test data only: Won't catch edge cases in real usage patterns
- Compare to provider docs only: Need actual billing to validate end-to-end
  accuracy

---

## High-Priority Risks

**NONE** - No risks flagged as HIGH in final assessment.

**Highest Risk (MEDIUM/LOW)**: Breaking existing code with signature changes

- Mitigated by optional parameters (modelId?: string)
- All existing call sites continue to work unchanged
- TypeScript compiler enforces correct usage
- Comprehensive test coverage ensures backward compatibility

---

## Summary Statistics

**Implementation Phases**: 5 phases

- Phase 1 (Foundation): 6 tasks
- Phase 2 (High-Impact): 5 tasks
- Phase 3 (Supporting): 5 tasks
- Phase 4 (Cleanup): 5 tasks
- Phase 5 (Verification): 7 tasks
- **Total Tasks**: 28 tasks

**Coverage Metrics**:

- User Stories: 5/5 (100%)
- Functional Requirements: 8/8 (100%)
- Acceptance Criteria: 32/32 (100%)
- Integration Points: 9/9 (100%)
- Research Constraints: 6/6 (100%)

**Files Modified**: 7 files **New Functions**: 2 (getPricingForModel,
DEFAULT_MODELS constant) **Test Requirements**: Unit tests (4 groups),
Integration tests (2 groups), Manual verification (invoice comparison)

**Key Principles**:

- ✅ Test-Driven Development (tests written before implementation, must fail
  first)
- ✅ Backward Compatibility (optional parameters maintain existing API)
- ✅ DRY Principle (single pricing source)
- ✅ Proven Patterns (ClaudeSessionReader MODEL_CONTEXT_LIMITS approach)
- ✅ Performance Maintained (<1ms lookup, <1s UI update)
- ✅ Security (no injection risks, fallback prevents crashes)

**Success Criteria**: Cost accuracy improves from 40-1100% error to <1% error
for all models. Budget tracking becomes reliable for multi-model, multi-provider
usage.
