---
feature: AI Token Cost Calculation Bug Fixes
iteration: 1
score: 50/100
generated: 2026-03-19T04:20:00Z
failed_categories:
  - Functional Correctness (0/20)
  - Integration Reality (0/10)
  - Architecture Compliance (0/10)
  - Code Hygiene (0/10)
---

# Remediation Report: AI Token Cost Calculation Bug Fixes

## Iteration 1 of 3

**Score**: 50/100 **Status**: FAIL — Remediation Required

This is the first remediation iteration. The implementation is 31% complete (9/29 tasks) with solid foundation work but missing integration layer and cleanup phases.

## Failed Categories

### Functional Correctness (0/20 points)

**Evidence**: 7 Red (blocking) findings from validation-correctness agent:
1. No invoice validation tests exist (T022-T024 not implemented)
2. Integration tests mock calculateCost() instead of using real implementation (ClaudeCodeUsageAdapter.test.ts:17-25)
3. Missing AIUsageAccuracy integration test (T010 not implemented)
4. Model propagation through stack not verified (T012-T016 incomplete - 0/5 tasks)
5. All adapter tests skipped with describe.skip (3 test files: ClaudeCodeUsageAdapter.test.ts:27, CodexUsageAdapter.test.ts:15, AIUsageAutoDiscovery.integration.test.ts:60)

**Required Actions**:

1. **Un-skip all tests** (CRITICAL - must do first):
   - Remove `describe.skip` from ClaudeCodeUsageAdapter.test.ts line 27
   - Remove `describe.skip` from CodexUsageAdapter.test.ts line 15
   - Remove `describe.skip` from AIUsageAutoDiscovery.integration.test.ts line 60
   - Run `npm test` to verify tests pass (they may need fixes)

2. **Create AIUsageAccuracy integration test** (T010):
   - File: `tests/integration/autonomous/AIUsageAccuracy.integration.test.ts`
   - Must use REAL calculateCost() (not mocked)
   - Verify Haiku 3.5: 100K input + 50K output = $0.0875 (not $0.45)
   - Verify Opus 4.6: 100K input + 50K output = $1.75
   - Verify model-specific rates applied (not provider-level rates)

3. **Remove mock from integration tests**:
   - File: ClaudeCodeUsageAdapter.test.ts lines 17-25
   - Remove: `vi.mock('../../../extension/src/config/pricing', ...)`
   - Import real calculateCost: `import { calculateCost } from '../../../extension/src/config/pricing'`
   - Tests should exercise actual pricing logic, not hardcoded mock values

4. **Invoice validation can be deferred** (P3 priority):
   - T022-T024 are P3 priority per plan
   - Focus on T010-T016 first (integration tests and propagation)
   - Invoice validation can be follow-up PR if needed

**Files to modify**:
- `tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts:27` — Remove describe.skip wrapper
- `tests/unit/autonomous/CodexUsageAdapter.test.ts:15` — Remove describe.skip wrapper
- `tests/integration/autonomous/AIUsageAutoDiscovery.integration.test.ts:60` — Remove describe.skip wrapper
- `tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts:17-25` — Remove vi.mock() for pricing module
- `tests/integration/autonomous/AIUsageAccuracy.integration.test.ts` — Create new integration test (T010)

### Integration Reality (0/10 points)

**Evidence**: 2 Red (blocking) contract violations from validation-integration agent:

1. **CostBudgetEnforcer.recordUsage() missing modelId parameter**:
   - Contract (internal-api.md:276-289) requires: `recordUsage(inputTokens, outputTokens, providerId?, modelId?)`
   - Implementation (CostBudgetEnforcer.ts:68) has: `recordUsage(inputTokens, outputTokens, providerId?)`
   - Impact: Model information cannot flow through budget tracking

2. **ContextUsageLogger.logLLMCall() missing modelId parameter**:
   - Contract (internal-api.md:422-432) requires: `logLLMCall(..., providerId, modelId?, metadata?)`
   - Implementation (ContextUsageLogger.ts:702) has: `logLLMCall(..., providerId?)`
   - Impact: Model information cannot be logged to council-usage.jsonl

**Required Actions**:

1. **Add modelId parameter to CostBudgetEnforcer.recordUsage()** (T012):
   ```typescript
   // File: extension/src/autonomous/CostBudgetEnforcer.ts:68
   // Change from:
   recordUsage(inputTokens: number, outputTokens: number, providerId?: string): CostSnapshot

   // To:
   recordUsage(inputTokens: number, outputTokens: number, providerId?: string, modelId?: string): CostSnapshot {
     // Line 72 - forward modelId to calculateCost:
     const newCost = calculateCost(inputTokens, outputTokens, providerId, modelId);
     // ... rest of implementation
   }
   ```

2. **Add modelId parameter to ContextUsageLogger.logLLMCall()** (T013):
   ```typescript
   // File: extension/src/autonomous/ContextUsageLogger.ts:702
   // Change from:
   async logLLMCall(sessionId: string, stage: string, inputTokens: number, outputTokens: number, providerId?: string): Promise<void>

   // To:
   async logLLMCall(sessionId: string, stage: string, inputTokens: number, outputTokens: number, providerId?: string, modelId?: string): Promise<void> {
     const estimatedCostUsd = calculateCost(inputTokens, outputTokens, providerId, modelId);
     // ... rest of implementation
   }
   ```

3. **Forward modelId through call chains** (T014-T015):
   - Update all call sites of recordUsage() to pass modelId
   - Update all call sites of logLLMCall() to pass modelId
   - Grep for: `recordUsage\(` and `logLLMCall\(` to find all call sites

4. **Create ModelPropagation integration test** (T016):
   - File: `tests/integration/autonomous/ModelPropagation.integration.test.ts`
   - Verify model field flows: adapter → recordUsage → logLLMCall → JSONL entry
   - Parse council-usage.jsonl and verify model field present

**Files to modify**:
- `extension/src/autonomous/CostBudgetEnforcer.ts:68-72` — Add modelId parameter, forward to calculateCost
- `extension/src/autonomous/ContextUsageLogger.ts:702-708` — Add modelId parameter
- All call sites of recordUsage() and logLLMCall() — Pass modelId parameter
- `tests/integration/autonomous/ModelPropagation.integration.test.ts` — Create new integration test (T016)

### Architecture Compliance (0/10 points)

**Evidence**: Phase 3-5 incomplete (20/29 tasks missing) per validation-standards agent:

- Phase 3 (Supporting): 0/5 tasks complete (T012-T016) — Model propagation
- Phase 4 (Cleanup): 0/5 tasks complete (T017-T021) — Remove duplicates
- Phase 5 (Verification): 0/7 tasks complete (T022-T028) — Invoice validation

File structure deviates from plan.md expectations:
- Plan specifies integration tests in Phase 2-3, but only unit tests exist
- Plan specifies duplicate removal in Phase 4, but duplicates remain in CostBudgetEnforcer.ts and UsageLogger.ts

**Required Actions**:

1. **Complete Phase 3 tasks** (T012-T016) — See "Integration Reality" section above

2. **Complete Phase 4 cleanup** (T017-T021):
   - T017: Remove duplicate COST_PER_1K_TOKENS from CostBudgetEnforcer.ts:16-20
   - T018: Remove duplicate COST_PER_1K_TOKENS from UsageLogger.ts:72-78
   - T019: Add import in CostBudgetEnforcer: `import { COST_PER_1K_TOKENS } from '../config/pricing'`
   - T020: Add import in UsageLogger: `import { COST_PER_1K_TOKENS } from '../config/pricing'`
   - T021: Verify all tests pass after consolidation: `npm test`

3. **Phase 5 can be deferred** (T022-T028):
   - Invoice validation is P3 priority
   - Focus on Phases 3-4 first to unblock integration tests
   - Can be follow-up PR if time-constrained

**Files to modify**:
- `extension/src/autonomous/CostBudgetEnforcer.ts:16-20` — Delete duplicate COST_PER_1K_TOKENS, add import
- `extension/src/council/UsageLogger.ts:72-78` — Delete duplicate COST_PER_1K_TOKENS, add import
- Verify no other files reference deleted duplicates

### Code Hygiene (0/10 points)

**Evidence**: DRY violations from validation-standards agent:

1. **Duplicate pricing tables** (Yellow severity, blocks Code Hygiene score):
   - CostBudgetEnforcer.ts:16-20 contains local COST_PER_1K_TOKENS
   - UsageLogger.ts:72-78 contains local COST_PER_1K_TOKENS
   - Both duplicate pricing.ts:23-27 (canonical source)
   - Impact: Maintenance burden — pricing updates require changes in 3 locations

2. **PRICING_LAST_UPDATED stale** (Yellow severity):
   - pricing.ts:75 shows '2026-03-15', should be '2026-03-19'
   - Impact: isPricingStale() reports incorrect freshness

**Required Actions**:

1. **Remove duplicate pricing tables** — Same as Architecture Compliance Phase 4 (T017-T020)

2. **Update PRICING_LAST_UPDATED** (T025):
   ```typescript
   // File: extension/src/config/pricing.ts:75
   // Change from:
   export const PRICING_LAST_UPDATED = new Date('2026-03-15').getTime();

   // To:
   export const PRICING_LAST_UPDATED = new Date('2026-03-19').getTime();
   ```

3. **Optional improvements** (Gray severity — can defer):
   - Replace console.warn with Logger.for('pricing').warn() at lines 117, 125, 133
   - Extract magic number: `const STALENESS_THRESHOLD_DAYS = 90` at line 88

**Files to modify**:
- `extension/src/config/pricing.ts:75` — Update timestamp to 2026-03-19
- Same files as Architecture Compliance section for duplicate removal

## Remediation Scope

The following pipeline stages should re-run focused on these areas:

- **Research**: Not needed — existing research is accurate
- **Plan**: Not needed — plan is correct, just incomplete implementation
- **Implement**: Focus on Phase 2-4 completion (T010-T021):
  - Phase 2 remaining: T010-T011 (integration tests, manual verification)
  - Phase 3 complete: T012-T016 (model propagation through stack)
  - Phase 4 complete: T017-T021 (duplicate cleanup, DRY consolidation)
- **Validate**: Re-run after fixes to verify 100/100 score

## Implementation Priority

**CRITICAL (must complete for next validation)**:
1. Un-skip all tests (5 minutes)
2. Fix contract violations — Add modelId parameters to CostBudgetEnforcer and ContextUsageLogger (T012-T013, 30 minutes)
3. Create AIUsageAccuracy integration test (T010, 45 minutes)
4. Remove pricing mock from ClaudeCodeUsageAdapter.test.ts (15 minutes)
5. Remove duplicate pricing tables (T017-T020, 30 minutes)
6. Update PRICING_LAST_UPDATED (T025, 2 minutes)

**HIGH (should complete for robust validation)**:
7. Forward modelId through all call chains (T014-T015, 30 minutes)
8. Create ModelPropagation integration test (T016, 45 minutes)
9. Verify all tests pass (T021, 10 minutes)

**MEDIUM (can defer to follow-up PR)**:
10. Manual verification with real logs (T011)
11. Invoice validation tests (T022-T024)
12. Formula verification and Bug #1 resolution (T024)

**Estimated remediation time**: ~3-4 hours for CRITICAL + HIGH items

## Previous Iterations

| Iteration | Score   | Failed Categories                                              | Date       |
| --------- | ------- | -------------------------------------------------------------- | ---------- |
| 1         | 50/100  | Functional Correctness, Integration Reality, Architecture Compliance, Code Hygiene | 2026-03-19 |

## Success Criteria for Iteration 2

To achieve 100/100 on next validation:

- [ ] All tests un-skipped and passing
- [ ] Integration tests use real calculateCost() (no mocks)
- [ ] AIUsageAccuracy integration test exists and passes (T010)
- [ ] ModelPropagation integration test exists and passes (T016)
- [ ] CostBudgetEnforcer.recordUsage() has modelId parameter (T012)
- [ ] ContextUsageLogger.logLLMCall() has modelId parameter (T013)
- [ ] All call sites forward modelId parameter (T014-T015)
- [ ] Duplicate pricing tables removed from CostBudgetEnforcer and UsageLogger (T017-T018)
- [ ] Imports added in CostBudgetEnforcer and UsageLogger (T019-T020)
- [ ] All tests pass after consolidation (T021)
- [ ] PRICING_LAST_UPDATED updated to 2026-03-19 (T025)

**Target completion**: Phase 2 (100%), Phase 3 (100%), Phase 4 (100%), Phase 5 (0% - deferred)
