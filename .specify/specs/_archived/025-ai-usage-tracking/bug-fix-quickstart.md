---
id: '025-ai-usage-tracking-bug-fix-quickstart'
title: 'AI Token Cost Calculation Bug Fixes - Quickstart Testing Guide'
status: active
created: '2026-03-19T18:00:00Z'
updated: '2026-03-19T18:00:00Z'
author: Claude
feature: '025-ai-usage-tracking'
type: testing-guide
---

# AI Token Cost Calculation Bug Fixes - Quickstart Testing Guide

This guide provides step-by-step instructions for testing the AI token cost
calculation bug fixes (Feature 025). It covers prerequisites, setup, manual
testing scenarios, automated tests, and common troubleshooting issues.

## Quick Reference

| Metric                | Value                                       |
| --------------------- | ------------------------------------------- |
| Prerequisites         | 5 items                                     |
| Setup steps           | 4 commands                                  |
| Manual test scenarios | 5 major scenarios (20+ acceptance criteria) |
| Automated test suites | 5+ test files                               |
| Common issues covered | 4 troubleshooting sections                  |

---

## Part 1: Prerequisites

Before starting testing, ensure your environment is properly configured:

### Prerequisite 1: Node.js 18+

**Check**: Open terminal and run:

```bash
node --version
```

**Expected**: Output `v18.x.x` or higher

**If missing**: Install from https://nodejs.org/ (LTS recommended)

---

### Prerequisite 2: VSCode 1.80+

**Check**: Open VSCode and view version:

```
VSCode → Code → About Visual Studio Code
```

**Expected**: Version 1.80.0 or higher

**If missing**: Update via VSCode's Check for Updates feature

---

### Prerequisite 3: Git Repository Cloned

**Check**: Verify repository exists locally:

```bash
cd /Users/douglaswross/Code/gofer
git status
```

**Expected**: No errors, shows main branch and git status

**If missing**: Clone repository:

```bash
git clone https://github.com/your-org/gofer.git
cd gofer
```

---

### Prerequisite 4: Dependencies Installed

**Check**: Run from repository root:

```bash
cd /Users/douglaswross/Code/gofer/extension
npm ls | head -20
```

**Expected**: Shows installed packages (no errors)

**If missing**: Install dependencies (see Setup step 1 below)

---

### Prerequisite 5: Vitest Configured

**Check**: Verify test framework is available:

```bash
cd /Users/douglaswross/Code/gofer/extension
npm test -- --version
```

**Expected**: Shows Vitest version (v0.x.x or higher)

**If missing**: Test framework installed automatically with `npm install`

---

## Part 2: Setup Steps

Run these steps once before testing:

### Setup Step 1: Install Dependencies

From repository root:

```bash
cd /Users/douglaswross/Code/gofer/extension
npm install
```

**Expected output**: Shows `added X packages` and completes without errors

**Troubleshooting**: If build fails, run:

```bash
npm ci  # Use lock file instead of package.json
```

---

### Setup Step 2: Compile TypeScript

```bash
npm run compile
```

**Expected output**: Shows `✓ compiled successfully` or similar completion
message

**Files checked**: Verifies `src/` directory compiles to `out/` (or `dist/`)

---

### Setup Step 3: Run All Tests

```bash
npm test
```

**Expected output**:

- Shows test summary: `X passed, X failed`
- All existing tests pass (baseline for bug fixes)
- Takes ~30-60 seconds

**Save output**: Note the test summary for comparison after implementing fixes

---

### Setup Step 4: Optional - Load Extension in Development Host

To test UI changes manually:

```bash
# From VSCode extension root
cd /Users/douglaswross/Code/gofer/extension
```

Then in VSCode:

1. Open Run menu: `Cmd+Shift+D`
2. Click "Run Extension" (or press F5)
3. New VSCode window opens with extension loaded
4. Close window when done testing

---

## Part 3: Manual Testing Scenarios

Each scenario verifies one or more acceptance criteria from the spec. Run
scenarios in any order.

### Scenario 1: Model-Specific Cost Display (US-001, AC-001 to AC-004)

**What it tests**: Different models show different costs for same token count

**Prerequisites**:

- Extension loaded (F5 in VSCode)
- Project with conversation logs in `~/.claude/projects/{project}/`

**Test Steps**:

1. Open VSCode Extension
2. Open Gofer sidebar (default: left panel)
3. Navigate to "AI TOKEN USAGE" panel
4. View "Model Cost Breakdown" section

5. **Verify Haiku Costs** (AC-001):
   - Look for any logs with `claude-haiku-*` model
   - Expected cost rate: ~$0.25/M input, $1.25/M output
   - For 100K input tokens: should show ~$2.50 (not $3.00)

6. **Verify Sonnet Costs** (AC-002):
   - Look for logs with `claude-sonnet-*` model
   - Expected cost rate: ~$3/M input, $15/M output
   - For 100K input tokens: should show ~$3.00

7. **Verify Opus Costs** (AC-003):
   - Look for logs with `claude-opus-*` model
   - Expected cost rate: ~$5/M input, $25/M output
   - For 100K input tokens: should show ~$5.00

8. **Verify Accuracy** (AC-004):
   - Take one model (e.g., Sonnet with 100K input tokens)
   - Calculate expected cost: `(100000 / 1000) * 0.003 = $0.30`
   - Compare to displayed cost
   - Expected: Within 1% (±$0.003)

**Pass Criteria**: All four Haiku/Sonnet/Opus costs visible and within expected
ranges

**Example Output**:

```
AI Token Usage
├─ Haiku 4.5: $2.50 (100K input)     ✅
├─ Sonnet 4.5: $3.00 (100K input)    ✅
├─ Opus 4.6: $5.00 (100K input)      ✅
└─ Accuracy: ±0.5% from actual       ✅
```

---

### Scenario 2: Provider Detection (US-002, AC-001 to AC-003)

**What it tests**: Different providers use correct pricing rates

**Prerequisites**:

- Access to multiple CLI tools' log files:
  - Claude Code: `~/.claude/projects/{project}/`
  - Codex CLI: `~/.codex/history.json` (if available)

**Test Steps**:

1. **For Claude Code logs** (AC-001):
   - Open Gofer AI TOKEN USAGE panel
   - Select log file with Claude Code provider
   - Verify costs use Anthropic rates (Haiku $0.25/M, Sonnet $3/M, Opus $5/M)
   - Do NOT see OpenAI rates (GPT-4 $30/M, GPT-3.5 $0.50/M)

2. **For Codex/Copilot logs** (AC-002):
   - If available, open Codex history logs
   - Verify costs use OpenAI rates
   - Example: GPT-3.5-turbo should show $0.50/M (not $3/M like Sonnet)
   - Do NOT see Anthropic rates

3. **Verify Provider Variable Flow** (AC-003):
   - Open browser console (F12) in VSCode
   - Check logs for:
     `[INFO] Cost calculation for provider: "anthropic", model: "claude-sonnet-4-5"`
   - Verify provider is not hardcoded as single value

**Pass Criteria**: Each provider's logs show provider-specific rates

**Example Output**:

```
Claude Code logs:   Anthropic rates ✅
Codex logs:         OpenAI rates ✅
Provider detected:  Not hardcoded ✅
```

---

### Scenario 3: Model Prefix Matching (US-003, AC-005)

**What it tests**: Dated model IDs (e.g., claude-sonnet-4-5-20260115) match base
model

**Prerequisites**:

- Conversation log with dated model ID
- Can create test log or use existing

**Test Steps**:

1. **Create Test Log Entry** (if needed):
   - Create file: `test-conversation.jsonl`
   - Add entry with dated model ID:

   ```json
   {
     "type": "assistant",
     "message": {
       "model": "claude-sonnet-4-5-20260115",
       "usage": {
         "input_tokens": 100000,
         "output_tokens": 50000
       }
     }
   }
   ```

2. **Parse and Calculate Cost**:
   - Run adapter on test file
   - Check console output

3. **Verify Prefix Match** (AC-005):
   - Expected: System recognizes `claude-sonnet-4-5-20260115`
   - Matches prefix: `claude-sonnet-4-5`
   - Uses Sonnet rates: $0.003/M input
   - Calculated cost:
     `(100000 * 0.003 + 50000 * 0.015) / 1000 = $0.30 + $0.75 = $1.05`

4. **Verify No Code Changes Needed**:
   - No modification to pricing.ts required
   - New model variant works automatically

**Pass Criteria**: Dated model ID automatically matches and calculates correct
cost

**Expected Output**:

```
Model: claude-sonnet-4-5-20260115
Prefix match: claude-sonnet-4-5 ✅
Cost: $1.05 (correct) ✅
No code changes needed ✅
```

---

### Scenario 4: Unknown Model Fallback (US-003, AC-006 to AC-008)

**What it tests**: Unknown or malformed model IDs don't crash system

**Prerequisites**:

- Conversation log with unknown model ID
- Can create test log

**Test Steps**:

1. **Create Test Log with Unknown Model**:

   ```json
   {
     "type": "assistant",
     "message": {
       "model": "claude-experimental-xyz-9999",
       "usage": {
         "input_tokens": 100000,
         "output_tokens": 50000
       }
     }
   }
   ```

2. **Parse and Calculate Cost** (AC-006):
   - Run adapter on test file
   - Verify: No crash, no undefined values
   - Expected: System uses fallback pricing

3. **Check Fallback Strategy** (AC-007):
   - Should fall back to: `DEFAULT_MODELS['anthropic'] = 'claude-sonnet-4-5'`
   - Use Sonnet rates: $0.003/M input, $0.015/M output
   - Calculated cost:
     `(100000 * 0.003 + 50000 * 0.015) / 1000 = $0.30 + $0.75 = $1.05`

4. **Verify Warning Message** (AC-008):
   - Check console logs for warning:
     `"Unknown model 'claude-experimental-xyz-9999', using default"`
   - Warning should include actual vs fallback model name

5. **Verify No Crash, No $0 Cost**:
   - System does not crash (AC-006)
   - Cost is not $0 (does not undercharge)
   - Cost is not undefined

**Pass Criteria**: Unknown model handled gracefully with warning and fallback
cost

**Expected Output**:

```
Unknown model: claude-experimental-xyz-9999
⚠️  Warning logged: "Unknown model..., using default"
Fallback model: claude-sonnet-4-5 ✅
Calculated cost: $1.05 (reasonable fallback) ✅
No crash ✅
```

---

### Scenario 5: Backward Compatibility (FR-003, AC-001)

**What it tests**: Existing code continues to work without changes

**Prerequisites**:

- All tests passing from Setup Step 3
- Test files present in `extension/tests/`

**Test Steps**:

1. **Run Full Test Suite**:

   ```bash
   cd /Users/douglaswross/Code/gofer/extension
   npm test
   ```

2. **Verify Test Results** (AC-001):
   - All tests pass (100% pass rate)
   - No new failures introduced
   - No test modifications needed
   - Expected: Same number of passing tests as baseline

3. **Check Specific Test Files**:
   - Unit tests: `tests/unit/config/pricing.test.ts`
   - Adapter tests: `tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts`
   - Budget tests: `tests/unit/autonomous/CostBudgetEnforcer.test.ts`

4. **Verify Old Call Sites Work**:
   - `calculateCost(inputTokens, outputTokens)` — no providerId, no modelId
   - `calculateCost(inputTokens, outputTokens, 'anthropic')` — providerId only
   - Both should work without modification

**Pass Criteria**: All existing tests pass, no regressions

**Expected Output**:

```
Test Summary:
✓ 42 passed
✗ 0 failed
⏭️  0 skipped

Backward compatibility: ✅
No test modifications needed: ✅
```

---

## Part 4: Automated Tests

Run these commands to verify implementation automatically:

### Test Suite 1: Run All Tests

```bash
cd /Users/douglaswross/Code/gofer/extension
npm test
```

**What it tests**: All unit and integration tests

**Expected**: `X passed, 0 failed`

**Duration**: ~30-60 seconds

---

### Test Suite 2: Pricing Module Tests Only

```bash
npm test -- pricing.test.ts
```

**What it tests**:

- `MODEL_PRICING` table contains 60+ models
- `getPricingForModel()` exact match
- `getPricingForModel()` prefix matching
- `getPricingForModel()` fallback behavior
- `calculateCost()` with optional modelId

**Expected tests**:

- ✓ Exact match: claude-sonnet-4-5 returns correct rates
- ✓ Prefix match: claude-sonnet-4-5-20250929 matches claude-sonnet-4-5
- ✓ Unknown fallback: unknown-model returns provider default
- ✓ Backward compatibility: calculateCost without modelId still works

**Files involved**:

- `extension/tests/unit/config/pricing.test.ts` (NEW)

---

### Test Suite 3: ClaudeCodeUsageAdapter Tests

```bash
npm test -- ClaudeCodeUsageAdapter.test.ts
```

**What it tests**:

- Model detection from conversation logs
- Model parameter passed to calculateCost()
- Provider variable used (not hardcoded 'anthropic')
- Cost accuracy across Haiku/Sonnet/Opus models

**Expected tests**:

- ✓ Haiku 3.5 conversation: model="claude-haiku-3-5", cost=$0.025
- ✓ Opus 4.6 conversation: model="claude-opus-4-6", cost=$5.00
- ✓ Sonnet 4.5 conversation: model="claude-sonnet-4-5", cost=$3.00

**Files involved**:

- `extension/tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts` (UPDATED)

---

### Test Suite 4: CostBudgetEnforcer Tests

```bash
npm test -- CostBudgetEnforcer.test.ts
```

**What it tests**:

- `recordUsage()` accepts optional modelId parameter
- Model parameter forwarded to calculateCost()
- Backward compatibility (existing calls without modelId work)
- Budget tracking with model-specific costs

**Expected tests**:

- ✓ recordUsage with modelId parameter
- ✓ recordUsage without modelId (backward compat)
- ✓ Model parameter flows to cost calculation

**Files involved**:

- `extension/tests/unit/autonomous/CostBudgetEnforcer.test.ts` (UPDATED)

---

### Test Suite 5: Integration Test - Cost Accuracy

```bash
npm test -- AIUsageAccuracy.integration.test.ts
```

**What it tests**: End-to-end cost calculation accuracy

**Expected tests**:

- ✓ Haiku 100K input tokens costs $2.50 (not $3.00)
- ✓ Opus 100K input tokens costs $5.00 (not $3.00)
- ✓ GPT-3.5 100K input tokens costs $0.50 (not $5.00)
- ✓ GPT-4 100K input tokens costs $30.00 (not $5.00)
- ✓ All costs within 1% of actual provider rates

**Files involved**:

- `extension/tests/integration/autonomous/AIUsageAccuracy.integration.test.ts`
  (NEW)

---

### Optional: Run Tests in Watch Mode

For development, run tests in watch mode to auto-rerun on file changes:

```bash
npm test -- --watch
```

**Features**:

- Tests re-run automatically when files change
- Press `q` to quit
- Press `w` to show options

**Useful for**: Iterative development and debugging

---

### Optional: Generate Coverage Report

```bash
npm test -- --coverage
```

**Generates**: Coverage report showing test coverage by file

**Expected**: Coverage >85% for pricing.ts and adapters

**Output file**: `coverage/index.html` (open in browser for visual report)

---

## Part 5: Key Files Reference Table

| File                                                                         | Purpose                                                | Status  | Change Type |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ | ------- | ----------- |
| `extension/src/config/pricing.ts`                                            | MODEL_PRICING table, getPricingForModel, calculateCost | UPDATED | Enhancement |
| `extension/src/autonomous/ClaudeCodeUsageAdapter.ts`                         | Fixed hardcoded 'anthropic', pass model                | UPDATED | Bug fix     |
| `extension/src/autonomous/CodexUsageAdapter.ts`                              | Add model detection, pass model                        | UPDATED | Enhancement |
| `extension/src/autonomous/CostBudgetEnforcer.ts`                             | Accept modelId parameter, remove duplicate pricing     | UPDATED | Enhancement |
| `extension/src/council/UsageLogger.ts`                                       | Remove duplicate pricing, import from pricing.ts       | UPDATED | Cleanup     |
| `extension/tests/unit/config/pricing.test.ts`                                | New unit tests for pricing functions                   | NEW     | Test        |
| `extension/tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts`             | Updated model detection tests                          | UPDATED | Test        |
| `extension/tests/unit/autonomous/CodexUsageAdapter.test.ts`                  | Updated model extraction tests                         | UPDATED | Test        |
| `extension/tests/unit/autonomous/CostBudgetEnforcer.test.ts`                 | Updated budget tracking tests                          | UPDATED | Test        |
| `extension/tests/integration/autonomous/AIUsageAccuracy.integration.test.ts` | End-to-end cost accuracy tests                         | NEW     | Test        |

---

## Part 6: Common Issues and Troubleshooting

### Issue 1: Tests Fail with "Cannot find module 'pricing'"

**Symptom**:

```
Error: Cannot find module '../config/pricing'
  at Module._load (internal/modules/commonjs/loader.js:...)
```

**Root Cause**: Import path incorrect after consolidation, or pricing.ts doesn't
export expected symbols

**Solution**:

1. Check pricing.ts exports:

   ```bash
   grep -n "export" /Users/douglaswross/Code/gofer/extension/src/config/pricing.ts | head -10
   ```

2. Verify imports in test files match exports:

   ```typescript
   // CORRECT
   import {
     MODEL_PRICING,
     getPricingForModel,
     calculateCost,
   } from '../config/pricing';

   // WRONG
   import { COST_PER_1K_TOKENS } from '../config/pricing'; // OLD export name
   ```

3. Update imports if needed:
   ```bash
   cd /Users/douglaswross/Code/gofer/extension
   npm test  # Re-run after fixes
   ```

---

### Issue 2: Cost Calculations Still Using Old Rates

**Symptom**: Tests show costs are still based on old provider-level rates
instead of model-specific rates

**Example**:

```
Expected: Haiku cost = $0.025 (correct rate)
Actual:   Haiku cost = $0.30 (old Sonnet rate)
```

**Root Cause**: Duplicate pricing tables not removed, or old table is being used

**Solution**:

1. Verify duplicate pricing is removed:

   ```bash
   grep -n "COST_PER_1K_TOKENS.*=.*{" \
     /Users/douglaswross/Code/gofer/extension/src/autonomous/CostBudgetEnforcer.ts \
     /Users/douglaswross/Code/gofer/extension/src/council/UsageLogger.ts
   ```

   Should return no results (only pricing.ts should have it)

2. Verify imports updated:

   ```bash
   grep -n "import.*pricing" \
     /Users/douglaswross/Code/gofer/extension/src/autonomous/CostBudgetEnforcer.ts \
     /Users/douglaswross/Code/gofer/extension/src/council/UsageLogger.ts
   ```

   Should show: `import { COST_PER_1K_TOKENS } from '../config/pricing'`

3. If duplicates remain, remove them manually and re-run tests

---

### Issue 3: Unknown Model Causes Crash or Undefined Cost

**Symptom**:

```
Error: Cannot read property 'input' of undefined
Cost: undefined
System crashes when processing unknown model
```

**Root Cause**: Fallback strategy not implemented correctly, or fallback returns
undefined

**Solution**:

1. Check getPricingForModel() implementation:

   ```bash
   grep -A 30 "function getPricingForModel" \
     /Users/douglaswross/Code/gofer/extension/src/config/pricing.ts
   ```

2. Verify all 4 fallback levels are present:

   ```typescript
   export function getPricingForModel(
     modelId: string,
     providerId: string
   ): PricingConfig {
     // Level 1: Exact match
     if (MODEL_PRICING[modelId]) return MODEL_PRICING[modelId];

     // Level 2: Prefix match
     for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
       if (modelId.startsWith(key) || key.startsWith(modelId)) {
         return pricing;
       }
     }

     // Level 3: Provider default
     const defaultModel = DEFAULT_MODELS[providerId];
     if (defaultModel && MODEL_PRICING[defaultModel]) {
       return MODEL_PRICING[defaultModel];
     }

     // Level 4: Ultimate fallback (required!)
     return (
       COST_PER_1K_TOKENS[providerId] ?? COST_PER_1K_TOKENS[DEFAULT_PROVIDER]
     );
   }
   ```

3. If any level is missing, add it and re-run tests

---

### Issue 4: Cost Formula Still "Inverted"

**Symptom**: Formula looks like `(tokens * rate) / 1000` but I expected
`(tokens / 1000) * rate`

**Clarification**: These formulas are mathematically equivalent and produce
identical results

**Proof**:

```
Formula A: (100000 * 0.003) / 1000 = 300 / 1000 = $0.30
Formula B: (100000 / 1000) * 0.003 = 100 * 0.003 = $0.30

Both correct! (associative property of multiplication)
```

**Solution**:

1. Run invoice comparison test to verify actual accuracy:

   ```bash
   npm test -- AIUsageAccuracy.integration.test.ts
   ```

2. Compare calculated costs to actual Anthropic/OpenAI invoices:
   - If error < 1%: Formula is correct
   - If error > 1%: Formula needs fixing

3. If invoice comparison passes but you still suspect issue, verify rate units:
   - Rates stored as per-1K tokens (0.003 = $3 per 1M)
   - Not per-token (0.000003 = $3 per 1M)

---

## Part 7: Verification Checklist

Use this checklist to confirm all fixes are working:

### Acceptance Criteria Verification

**Scenario 1 - Model Costs**:

- [ ] Haiku costs ~$0.25/M input (not $3/M)
- [ ] Sonnet costs ~$3/M input (correct)
- [ ] Opus costs ~$5/M input (not $3/M)
- [ ] All within 1% of provider rates

**Scenario 2 - Provider Detection**:

- [ ] Claude Code logs use Anthropic rates
- [ ] Codex logs use OpenAI rates
- [ ] Provider variable not hardcoded
- [ ] Model variable passed to calculations

**Scenario 3 - Prefix Matching**:

- [ ] Dated model IDs (e.g., -20260115 suffix) work
- [ ] No code changes needed for new versions
- [ ] Correct rates applied to dated variants

**Scenario 4 - Unknown Model Fallback**:

- [ ] Unknown models don't crash system
- [ ] Warning message logged
- [ ] Reasonable fallback cost shown
- [ ] Cost is not $0, not undefined

**Scenario 5 - Backward Compatibility**:

- [ ] All existing tests pass (100%)
- [ ] No test modifications needed
- [ ] Old call sites work without changes

### Implementation Verification

**Code Quality**:

- [ ] No duplicate pricing tables remain in codebase
- [ ] All imports from pricing.ts are correct
- [ ] PRICING_LAST_UPDATED updated to 2026-03-19
- [ ] Model-specific rates match provider documentation

**Test Coverage**:

- [ ] Unit tests: pricing.test.ts (exact, prefix, fallback)
- [ ] Unit tests: adapter tests (model detection)
- [ ] Unit tests: budget enforcer tests (model parameter)
- [ ] Integration tests: end-to-end accuracy
- [ ] All tests passing (no regressions)

**Feature Completeness**:

- [ ] 60+ models in MODEL_PRICING table
- [ ] All Claude models: Opus, Sonnet, Haiku (3-5)
- [ ] All OpenAI models: GPT-4, GPT-3.5, o1
- [ ] All Google models: Gemini 1.5 Pro, Flash, Pro
- [ ] DEFAULT_MODELS mapping for fallback

---

## Part 8: Test Execution Summary Example

Here's what a successful test run looks like:

```bash
$ cd /Users/douglaswross/Code/gofer/extension && npm test

> @gofer/extension@1.22.0 test
> vitest run

 ✓ tests/unit/config/pricing.test.ts (12 tests) 456ms
   ✓ MODEL_PRICING contains 60+ models
   ✓ getPricingForModel exact match
   ✓ getPricingForModel prefix match
   ✓ getPricingForModel unknown fallback
   ✓ calculateCost with modelId parameter
   ✓ calculateCost backward compatibility
   ... (6 more tests)

 ✓ tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts (8 tests) 234ms
   ✓ Haiku model detection and cost
   ✓ Sonnet model detection and cost
   ✓ Opus model detection and cost
   ... (5 more tests)

 ✓ tests/unit/autonomous/CostBudgetEnforcer.test.ts (5 tests) 123ms
   ✓ recordUsage with modelId parameter
   ✓ recordUsage backward compatibility
   ... (3 more tests)

 ✓ tests/integration/autonomous/AIUsageAccuracy.integration.test.ts (8 tests) 567ms
   ✓ Haiku cost accuracy (1% tolerance)
   ✓ Sonnet cost accuracy (1% tolerance)
   ✓ Opus cost accuracy (1% tolerance)
   ✓ GPT-3.5 cost accuracy (1% tolerance)
   ✓ GPT-4 cost accuracy (1% tolerance)
   ... (3 more tests)

 ✓ tests/unit/autonomous/CodexUsageAdapter.test.ts (4 tests) 189ms
   ✓ GPT-4 model extraction
   ✓ GPT-3.5 model extraction
   ... (2 more tests)

 ✓ tests/unit/autonomous/CostBudgetEnforcer.test.ts (6 tests) 145ms
 ... (other existing tests)

═══════════════════════════════════════════════════════════════════════════════
Test Files  10 passed (10)
     Tests  42 passed (42)
  Start at  14:32:05
  Duration  2.71s
═══════════════════════════════════════════════════════════════════════════════

✅ All tests passed! Backward compatibility maintained.
```

---

## Part 9: Manual Testing Checklist Example

Here's a sample checklist you can use when manually testing:

### Test Session: March 19, 2026

**Tester Name**: ******\_\_\_\_****** **Date**: ******\_\_\_\_****** **Test
Environment**: VSCode 1.87.0, Node 20.10.0

#### Scenario 1: Model Costs

- [ ] Haiku shows $0.025 for 100K input (not $0.30)
  - Timestamp: **\_\_**
  - Actual observed: **\_\_**
  - Status: ✅ / ❌

- [ ] Sonnet shows $0.30 for 100K input
  - Timestamp: **\_\_**
  - Actual observed: **\_\_**
  - Status: ✅ / ❌

- [ ] Opus shows $0.50 for 100K input (not $0.30)
  - Timestamp: **\_\_**
  - Actual observed: **\_\_**
  - Status: ✅ / ❌

#### Scenario 2: Provider Detection

- [ ] Claude Code → Anthropic rates
  - Status: ✅ / ❌
- [ ] Codex → OpenAI rates
  - Status: ✅ / ❌

#### Scenario 3: Prefix Matching

- [ ] Model "claude-sonnet-4-5-20260115" matches correctly
  - Status: ✅ / ❌

#### Scenario 4: Unknown Model

- [ ] System doesn't crash on unknown model
  - Status: ✅ / ❌
- [ ] Warning logged
  - Status: ✅ / ❌
- [ ] Fallback cost shown
  - Status: ✅ / ❌

#### Scenario 5: Backward Compatibility

- [ ] All tests pass: `npm test`
  - Pass count: **\_\_**
  - Status: ✅ / ❌

**Overall Result**: PASS / FAIL

**Notes**: ******************************\_\_\_\_******************************

---

## Summary

| Item                         | Count |
| ---------------------------- | ----- |
| Prerequisites                | 5     |
| Setup Steps                  | 4     |
| Manual Scenarios             | 5     |
| Test Suites                  | 5+    |
| Acceptance Criteria Verified | 32+   |
| Common Issues Covered        | 4     |

**Estimated Testing Time**:

- Setup: 5-10 minutes
- Manual testing: 15-20 minutes
- Automated tests: 2-3 minutes
- **Total: 25-35 minutes**

This guide provides everything needed to thoroughly test the AI token cost
calculation bug fixes. For questions or issues, refer to the bug-fix-spec.md and
bug-fix-research.md documents in the same directory.
