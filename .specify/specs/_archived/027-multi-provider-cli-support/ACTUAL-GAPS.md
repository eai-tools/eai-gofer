---
created: 2026-03-17T20:00:00Z
status: analysis-complete
---

# Actual Gaps Analysis - Feature 027

## Discovery: Code Exists, Tests Missing

After reviewing the actual code (not just agent reports), here's what I found:

### ✅ Already Implemented (Agents Were Wrong)

| Feature                                 | Location                                                  | Status    |
| --------------------------------------- | --------------------------------------------------------- | --------- |
| ConfigManager.getPreferredCLIProvider() | config.ts:360                                             | ✅ EXISTS |
| ConfigManager.getCodexCommand()         | config.ts:370                                             | ✅ EXISTS |
| Config watcher watching all 3 settings  | extension.ts:208-222                                      | ✅ EXISTS |
| Conversation history preservation       | ProviderFactory.ts:257-275, CLIProviderAdapter.ts:344-362 | ✅ EXISTS |

### ❌ Actually Missing

| Gap                                          | Type | Impact                                                     |
| -------------------------------------------- | ---- | ---------------------------------------------------------- |
| 1. Integration test for config watcher       | Test | Can't prove config changes trigger provider switch         |
| 2. Integration test for history preservation | Test | Can't prove history survives provider switch               |
| 3. E2E test for pipeline parity              | Test | Can't prove Claude/Codex produce comparable outputs        |
| 4. Health check call on activation           | Code | CLIHealthChecker never invoked in initializeForWorkspace() |
| 5. Unskipped test in CLIProviderAdapter      | Test | Line 185 still has it.skip()                               |

## Root Cause

**Validation agents made FALSE POSITIVE findings** by:

- Checking for method existence in isolation without seeing they were already
  added in iteration 5
- Not running the actual integration chains to see if they work
- Reporting "missing" when code exists but isn't tested

**Real Problem**:

- Implementation is 90% complete
- Test coverage is 40% complete
- Gap = Missing integration/E2E tests, NOT missing implementation

## Revised Fix Plan (2-4 hours)

### Fix A: Call Health Check on Activation (30 min)

**File**: `extension/src/extension.ts` - initializeForWorkspace() **What**: Add
health check call after workspace initialization

### Fix B: Unskip Critical Test (15 min)

**File**: `tests/unit/council/providers/cli/CLIProviderAdapter.test.ts:185`
**What**: Remove it.skip() and implement proper mock

### Fix C: Write Integration Test for Config Switching (1 hour)

**File**: `tests/integration/council/CLIProviderSwitching.integration.test.ts`
**What**: Add test that actually changes VSCode config and verifies provider
switches

### Fix D: Write Integration Test for History Preservation (45 min)

**File**: Same as Fix C **What**: Add test that verifies conversation history
survives provider switch

### Fix E: Write E2E Test for Pipeline Parity (2 hours - OPTIONAL)

**File**: `tests/e2e/PipelineProviderParity.e2e.test.ts` (new) **What**: Run
`/1_gofer_research` with both CLIs, compare structure

## Recommendation

**Implement Fixes A-D (required)**: 2.5 hours **Skip Fix E initially**: E2E test
is complex and may require actual CLIs installed

**Result**: Score will jump from 35/100 to ~80-85/100

- Functional Correctness: 20/20 (Fix A)
- Test Authenticity: 20/20 (Fix B)
- Integration Reality: 10/10 (Fixes C, D)
- Architecture Compliance: 10/10 (tests match plan)
- Spec Traceability: 0/5 still (needs Fix E for full credit)

**Total with A-D**: 85/100 **Total with A-E**: 100/100

Human can decide if 85/100 is acceptable to merge or if they want the full E2E
test.
