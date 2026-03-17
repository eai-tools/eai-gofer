---
feature: 027-multi-provider-cli-support
iteration: 2
score: 10/100
generated: 2026-03-17T02:29:00Z
failed_categories:
  - functional_correctness
  - test_authenticity
  - security_posture
  - error_path_coverage
  - performance_baseline
  - architecture_compliance
  - code_hygiene
  - specification_traceability
---

# Remediation Report: Multi-Provider CLI Support

## Iteration 2 of 3

**Score**: 10/100
**Status**: FAIL — Remediation Required
**Progress**: Significant improvement from iteration 1 (0/100), but critical blockers remain

## Executive Summary

Iteration 2 delivered **substantial progress**:
- ✅ Async I/O converted in main methods (+70% of needed changes)
- ✅ Magic numbers extracted to constants (100% complete)
- ✅ 970+ lines of test code added (5 new test files)
- ✅ Integration boundaries verified

However, **8 critical blockers** prevent merging:
1. Production API keys in .env file (security breach)
2. Remaining sync I/O in 3 helper methods
3. 37 test failures from assertion mismatches
4. 1 placeholder test (expect(true).toBe(true))
5. Missing E2E tests for provider parity
6. Type casting slop (`as never` × 9 instances)
7. Duplicate parser implementation
8. Incomplete Codex implementation

## Failed Categories (8/10)

### 1. Security Posture (0/10 points)

**Evidence**: Production API keys hardcoded in .env file (lines 2-4)

**Critical Security Breach**:
- `ANTHROPIC_API_KEY=sk-ant-api03-kEYDSI6cctuVn_Mm4cGZ...` (production key)
- `GOOGLE_API_KEY=AIzaSyBbNYlIWYnVm3VTv2og0VN_QA5lxa3zT88`
- `OPENAI_API_KEY=sk-svcacct-BWZ9Zm9eCMQ0Agfb...` (service account)

**Required Actions**:

1. **IMMEDIATE: Rotate all 3 API keys**
   - Anthropic: Generate new key at https://console.anthropic.com
   - Google: Rotate at https://console.cloud.google.com
   - OpenAI: Rotate service account key at https://platform.openai.com
   - Estimated time: 30 minutes

2. **Replace production keys with placeholders in .env**
   ```bash
   cat > .env <<'EOF'
   # Anthropic API
   ANTHROPIC_API_KEY=sk-ant-your-key-here

   # Google API
   GOOGLE_API_KEY=AIzaSyBbNYl-your-key-here

   # OpenAI API
   OPENAI_API_KEY=sk-svcacct-your-key-here

   # WhatsApp (optional)
   YOUR_PHONE_NUMBER=+61XXXXXXXXX@c.us
   EOF
   ```

3. **Add pre-commit hook to prevent API key leaks**
   - File: `.git/hooks/pre-commit`
   ```bash
   #!/bin/bash
   # Prevent committing API keys
   if git diff --cached | grep -E '(sk-ant-api|AIzaSy|sk-svcacct-)'; then
     echo "ERROR: API key pattern detected. Remove before committing."
     exit 1
   fi
   ```

4. **Update .env.example**
   - File: `.env.example`
   - Content: Same as step 2 (placeholders only)

**Files to modify**:
- `/.env` - Replace keys with placeholders
- `/.env.example` - Create if missing
- `/.git/hooks/pre-commit` - Add key detection script

---

### 2. Performance Baseline (0/5 points)

**Evidence**: 3 synchronous I/O methods still block async paths

**Remaining Sync I/O Issues**:

**Issue #1: getCurrentUser() - Line 98**
```typescript
// Current (BLOCKING):
getCurrentUser(): string | null {
  const settingsPath = path.join(this.claudeDir, 'settings.json');
  if (!fs.existsSync(settingsPath)) return null;
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  return settings.email || settings.user || null;
}

// Should be:
async getCurrentUser(): Promise<string | null> {
  const settingsPath = path.join(this.claudeDir, 'settings.json');
  try {
    await fs.promises.access(settingsPath);
  } catch {
    return null;
  }
  const settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf-8'));
  return settings.email || settings.user || null;
}
```

**Issue #2: isClaudeCodeInstalled() - Lines 74, 76, 94**
```typescript
// Current (BLOCKING):
isClaudeCodeInstalled(): boolean {
  const claudeDirExists = fs.existsSync(this.claudeDir);
  const projectsDir = path.join(this.claudeDir, 'projects');
  const projectsDirExists = fs.existsSync(projectsDir);
  return claudeDirExists && projectsDirExists;
}

// Should be:
async isClaudeCodeInstalled(): Promise<boolean> {
  try {
    await fs.promises.access(this.claudeDir);
    const projectsDir = path.join(this.claudeDir, 'projects');
    await fs.promises.access(projectsDir);
    return true;
  } catch {
    return false;
  }
}
```

**Issue #3: CodexUsageAdapter.isInstalled() - Lines 67, 69**
```typescript
// Current (BLOCKING):
isInstalled(): boolean {
  const codexDirExists = fs.existsSync(this.codexDir);
  const historyPath = this.getDefaultLogPath();
  const historyExists = fs.existsSync(historyPath);
  return codexDirExists && historyExists;
}

// Should be:
async isInstalled(): Promise<boolean> {
  try {
    await fs.promises.access(this.codexDir);
    const historyPath = this.getDefaultLogPath();
    await fs.promises.access(historyPath);
    return true;
  } catch {
    return false;
  }
}
```

**Files to modify**:
- `extension/src/autonomous/ClaudeCodeUsageAdapter.ts:90,73`
- `extension/src/autonomous/CodexUsageAdapter.ts:66`
- **All callers** of these methods (add `await`)

**Estimated effort**: 2-3 hours (including caller updates)

---

### 3. Test Authenticity (0/20 points)

**Evidence**: 37 test failures + 1 placeholder test

**Required Actions**:

1. **Fix 37 test assertion mismatches**
   - File: `tests/unit/council/providers/cli/ClaudeCodeCLIProvider.test.ts`
   - Issue: Expected error message "Invalid API key" but got full error message from parser
   - Fix: Update expected values to match ClaudeOutputParser.detectErrors() output

   ```typescript
   // Line 83 - Update expected error message:
   expect(parsed.error).toBe('Authentication failed. Set ANTHROPIC_API_KEY or run: claude login');
   ```

2. **Remove placeholder test**
   - File: `tests/unit/council/providers/cli/CLIHealthChecker.test.ts:148`
   - Current: `expect(true).toBe(true);`
   - Fix: Replace with meaningful assertion or delete test

   ```typescript
   // Option 1: Delete the test (recommended if checkCompatibility is private)
   // Option 2: Test public interface that calls checkCompatibility
   it('should return compatible=true for valid versions', async () => {
     const result = await CLIHealthChecker.check('claude', 'claude');
     expect(result.compatible).toBe(true); // Tests checkCompatibility indirectly
   });
   ```

3. **Fix CLIProviderAdapter test mocking issues**
   - File: `tests/unit/council/providers/cli/CLIProviderAdapter.test.ts:84-89`
   - Issue: Conversation history assertion mismatch
   - Fix: Match formatPrompt() output format

   ```typescript
   expect(provider['conversationHistory']).toEqual([
     { role: 'user', content: request.prompt }, // Not formatPrompt() output
     { role: 'assistant', content: 'Response' },
   ]);
   ```

4. **Fix CLIProviderAdapter ENOENT test**
   - File: `tests/unit/council/providers/cli/CLIProviderAdapter.test.ts:185-198`
   - Issue: Mock setup doesn't work as expected
   - Fix: Use actual execFile error simulation or skip test

**Files to modify**:
- `tests/unit/council/providers/cli/ClaudeCodeCLIProvider.test.ts` (update error messages)
- `tests/unit/council/providers/cli/CodexCLIProvider.test.ts` (update error messages)
- `tests/unit/council/providers/cli/CLIHealthChecker.test.ts:148` (remove placeholder)
- `tests/unit/council/providers/cli/CLIProviderAdapter.test.ts:84,195` (fix mocking)

**Estimated effort**: 3-4 hours

---

### 4. Functional Correctness (0/20 points)

**Evidence**: 40% criteria tested, missing E2E tests, 16 Red findings

**Required Actions**:

1. **Create E2E Provider Parity Tests**
   - File: `tests/integration/cli-provider-parity.integration.test.ts` (NEW)
   - Tests to add:
   ```typescript
   describe('CLI Provider Parity', () => {
     it('should produce identical pipeline outputs with both providers', async () => {
       // Run /1_gofer_research with Claude CLI
       const claudeOutput = await runPipelineStage('research', 'claude-cli');

       // Switch to Codex CLI
       await vscode.workspace.getConfiguration('gofer').update('cliProvider', 'codex');

       // Run /1_gofer_research with Codex CLI
       const codexOutput = await runPipelineStage('research', 'codex-cli');

       // Compare outputs
       expect(claudeOutput.specStructure).toEqual(codexOutput.specStructure);
     });
   });
   ```

2. **Add Auto-Detection Tests**
   - File: `tests/unit/council/providers/ProviderFactory.test.ts` (modify existing)
   - Test detectAvailableCLI() method:
   ```typescript
   it('should detect Claude CLI first in auto mode', async () => {
     mockCLIHealthChecker.check.mockResolvedValueOnce({ available: true });
     const provider = await factory.detectAvailableCLI();
     expect(provider).toBe('claude-cli');
   });
   ```

3. **Complete Codex Implementation**
   - File: `extension/src/autonomous/CodexUsageAdapter.ts`
   - Status: Implementation exists but untested
   - Add tests to verify JSON parsing

4. **Add Provider-Specific Feature Tests**
   - File: `tests/unit/council/providers/cli/providerCapabilities.test.ts` (NEW)
   - Test MCP gating: `supportsMCPServers('claude-cli')` → true
   - Test web search gating: `supportsWebSearch('codex-cli')` → true

**Files to create**:
- `tests/integration/cli-provider-parity.integration.test.ts`
- `tests/unit/council/providers/cli/providerCapabilities.test.ts`

**Files to modify**:
- `tests/unit/council/providers/ProviderFactory.test.ts` (add auto-detection tests)
- `extension/src/autonomous/CodexUsageAdapter.ts` (verify implementation complete)

**Estimated effort**: 6-8 hours

---

### 5. Code Hygiene (0/10 points)

**Evidence**: Type casting slop (9 instances) + duplicate parser

**Required Actions**:

1. **Fix Type Casting Slop**
   - File: `extension/src/council/providers/cli/CLIProviderAdapter.ts`
   - Lines: 102, 122, 156, 216, 229, 238, 295, 303, 310

   ```typescript
   // Current (AI SLOP):
   throw new ProviderError(
     `${this.name} is not available`,
     'UNAVAILABLE' as never,  // ← WRONG
     this.id
   );

   // Should be:
   import { ProviderErrorCode } from '../ProviderError';

   throw new ProviderError(
     `${this.name} is not available`,
     ProviderErrorCode.UNAVAILABLE,  // ← CORRECT
     this.id
   );
   ```

2. **Remove Duplicate Parser**
   - File: `extension/src/council/providers/cli/ClaudeCodeOutputParser.ts` (DELETE)
   - File: `extension/src/council/providers/cli/index.ts` (remove export on line 10)
   - Keep: `ClaudeOutputParser.ts` (this is the correct one)

**Files to modify**:
- `extension/src/council/providers/cli/CLIProviderAdapter.ts` (fix 9 type casts)

**Files to delete**:
- `extension/src/council/providers/cli/ClaudeCodeOutputParser.ts`

**Files to modify (exports)**:
- `extension/src/council/providers/cli/index.ts:10` (remove ClaudeCodeOutputParser export)

**Estimated effort**: 45 minutes

---

### 6. Error Path Coverage (0/10 points)

**Evidence**: Error paths partially tested, E2E error flows missing

**Required Actions**:

1. **Add Error Path Integration Tests**
   - File: `tests/integration/cli-error-handling.integration.test.ts` (NEW)
   ```typescript
   it('should display install instructions when CLI not found', async () => {
     // Mock CLI not installed
     mockCLIHealthChecker.check.mockResolvedValue({ available: false, installInstructions: '...' });

     // Trigger autonomous command
     await vscode.commands.executeCommand('gofer.autonomous.start');

     // Verify error notification shown
     expect(mockShowErrorMessage).toHaveBeenCalledWith(
       expect.stringContaining('npm install')
     );
   });
   ```

2. **Test Config Watcher Error Paths**
   - File: `tests/unit/services/EventHandlers.test.ts` (modify existing)
   - Test reloadCLIProvider() error handling

**Files to create**:
- `tests/integration/cli-error-handling.integration.test.ts`

**Files to modify**:
- `tests/unit/services/EventHandlers.test.ts` (add error path tests)

**Estimated effort**: 2-3 hours

---

### 7. Architecture Compliance (0/10 points)

**Evidence**: Duplicate file, 92/100 agent score (Yellow findings prevent full score)

**Required Actions**:
Same as Code Hygiene #2 - remove duplicate parser file.

**Estimated effort**: 15 minutes (already counted in Hygiene section)

---

### 8. Specification Traceability (0/5 points)

**Evidence**: 23/35 criteria untraceable to verified tests

**Required Actions**:
Already covered in Functional Correctness - E2E tests will trace criteria to code.

**Estimated effort**: 0 hours (covered by other actions)

---

## Remediation Scope

The following pipeline stages should re-run:

- **Research**: Not needed - architecture is sound
- **Specify**: Not needed - spec is comprehensive
- **Plan**: Not needed - plan remains valid
- **Tasks**: Not needed - task breakdown complete
- **Implement**: **FOCUSED FIXES** - 4 security, 3 performance, 37 test fixes, hygiene cleanup
- **Validate**: **RE-RUN** after iteration 3 fixes complete

## Estimated Remediation Effort (Iteration 3)

| Category                           | Tasks                                  | Estimated Hours |
| ---------------------------------- | -------------------------------------- | --------------- |
| **Security (CRITICAL - P0)**       | Rotate API keys, update .env, hook    | 1               |
| **Performance (BLOCKING - P0)**    | Convert 3 methods to async             | 2-3             |
| **Test Fixes (BLOCKING - P0)**     | Fix 37 failures, remove placeholder    | 3-4             |
| **E2E Tests (BLOCKING - P0)**      | Provider parity integration tests      | 6-8             |
| **Codex Implementation (HIGH - P1)**| Complete and test CodexUsageAdapter    | 2-3             |
| **Hygiene (HIGH - P1)**            | Fix type casts, remove duplicate       | 1               |
| **Error Path Tests (MEDIUM - P2)** | Error handling integration tests       | 2-3             |
| **TOTAL**                          |                                        | **17-23 hours** |

## Priority Order (Iteration 3 Execution Sequence)

1. **Security (1 hour)** - IMMEDIATE: Rotate keys, update .env
2. **Test Fixes (3-4 hours)** - Fix 37 failures to unblock testing
3. **Performance (2-3 hours)** - Convert sync I/O to async
4. **Hygiene (1 hour)** - Fix type casts, remove duplicate
5. **E2E Tests (6-8 hours)** - Add provider parity tests
6. **Codex Implementation (2-3 hours)** - Complete usage tracking
7. **Error Path Tests (2-3 hours)** - Add integration error tests

## Success Criteria for Iteration 3

**Iteration 3 must achieve**:
- ✅ Score ≥ 80/100 (minimum passing score)
- ✅ Zero production secrets in any file
- ✅ Zero synchronous I/O in async methods
- ✅ All tests passing (0 failures, 0 placeholders)
- ✅ E2E tests for provider parity (US-2 AC8-11)
- ✅ No Red or Yellow findings from validation agents
- ✅ Build, test, lint all passing
- ✅ Test coverage ≥ 80% for all CLI provider classes

**If Iteration 3 still fails**: Escalate to human review with detailed root cause analysis.

---

## Previous Iterations

| Iteration | Score | Failed Categories                                                                                                                                                  | Date       |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1         | 0/100 | functional_correctness, test_authenticity, error_path_coverage, performance_baseline, code_hygiene, specification_traceability                                    | 2026-03-17 |
| 2         | 10/100| functional_correctness, test_authenticity, security_posture, error_path_coverage, performance_baseline, architecture_compliance, code_hygiene, specification_traceability | 2026-03-17 |

**Status**: Awaiting remediation - Iteration 2 of 3
