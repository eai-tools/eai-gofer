---
feature: Multi-Provider CLI Support
iteration: 7
created: 2026-03-17T19:45:00Z
status: planning
---

# Remediation Plan: Iteration 7 - Systematic Integration Fix

## Executive Summary

**Current State**: 35/100 (5 categories failing)
**Target State**: 100/100 (all categories passing)
**Approach**: Fix integration chains from bottom-up, verify with real tests at each step

## Problem Analysis

The escalation report identified a **"theatrical testing"** pattern where code exists but isn't wired together. Root causes:

1. **Contract-Code Divergence**: Interfaces defined but not implemented
2. **Theatrical Tests**: Tests exist but only verify mocks, not real behavior
3. **Broken Integration Chains**: Components isolated, not connected end-to-end

## Fix Strategy: 3-Phase Approach

### Phase 1: Contract Implementation (Foundation)
Fix the broken contracts that block all integration:
- ConfigManager missing methods
- Event infrastructure missing
- Type mismatches at boundaries

**Estimated Time**: 2-3 hours

### Phase 2: Integration Wiring (Connection)
Connect the implemented contracts into working integration chains:
- Register config watcher properly
- Wire health check on activation
- Connect AutonomousDriver to CLI providers

**Estimated Time**: 3-4 hours

### Phase 3: Real Test Verification (Validation)
Write real integration/E2E tests that exercise actual code paths:
- Integration test: Config change → Provider switch
- Integration test: Health check on activation
- E2E test: Pipeline stage with both CLIs

**Estimated Time**: 4-6 hours

**Total Estimated Time**: 9-13 hours

## Detailed Fix Plan

### Fix 1: Implement Missing ConfigManager Methods (30 min)

**Category**: Integration Reality (blocks 10 pts)
**Contract**: `internal-api.md:544-553`
**File**: `extension/src/config.ts`

**Issue**: Methods `getPreferredCLIProvider()` and `getCodexCommand()` missing

**Implementation**:
```typescript
// Add to ConfigManager class
public getPreferredCLIProvider(): 'claude' | 'codex' | 'auto' {
  return this.config.get<'claude' | 'codex' | 'auto'>(
    CONFIG_KEYS.cliProvider.replace('gofer.', ''),
    DEFAULTS.cliProvider
  );
}

public getCodexCommand(): string {
  return this.config.get<string>(
    CONFIG_KEYS.codexCommand.replace('gofer.', ''),
    DEFAULTS.codexCommand
  );
}
```

**Verification**: Unit test that config.getPreferredCLIProvider() returns correct value

**Dependencies**: None
**Blocks**: Fix 2 (config watcher needs this)

---

### Fix 2: Register Config Watcher Properly (45 min)

**Category**: Functional Correctness (blocks 20 pts)
**Contract**: `events.md:53-56`
**File**: `extension/src/extension.ts`

**Issue**: Config watcher exists but ConfigManager can't retrieve settings

**Implementation**:
1. Update config watcher to use ConfigManager methods:
```typescript
context.subscriptions.push(
  vscode.workspace.onDidChangeConfiguration(async (e) => {
    if (
      e.affectsConfiguration('gofer.cliProvider') ||
      e.affectsConfiguration('gofer.claudeCodeCommand') ||
      e.affectsConfiguration('gofer.codexCommand')
    ) {
      const config = ConfigManager.getInstance();
      const newProvider = config.getPreferredCLIProvider();

      logger?.info('Extension', `CLI provider changed to: ${newProvider}`);

      // Preserve conversation history before reinit
      const { getProviderFactory } = await import('./council/providers/ProviderFactory');
      const factory = getProviderFactory();
      // History preservation already implemented in ProviderFactory.createCLIProvider()

      await reinitializeExtension(context);
      vscode.window.showInformationMessage(
        `Gofer: CLI provider changed to ${newProvider}. Extension reloaded.`
      );
    }
  })
);
```

**Verification**: Integration test that changes setting and verifies new provider used

**Dependencies**: Fix 1 (needs ConfigManager methods)
**Blocks**: None

---

### Fix 3: Call Health Check on Activation (30 min)

**Category**: Functional Correctness (blocks 20 pts)
**Contract**: `internal-api.md:621-695`
**File**: `extension/src/extension.ts` (initializeForWorkspace)

**Issue**: CLIHealthChecker exists but never called on activation

**Implementation**:
```typescript
// In initializeForWorkspace(), after memoryManager initialization
const config = ConfigManager.getInstance();
const preference = config.getPreferredCLIProvider();

if (preference !== 'auto') {
  // Proactive health check for selected provider
  const { CLIHealthChecker } = await import('./council/providers/cli/CLIHealthChecker');
  const command = preference === 'claude'
    ? config.getClaudeCodeCommand()
    : config.getCodexCommand();

  const healthResult = await CLIHealthChecker.check(preference, command);

  if (!healthResult.available || !healthResult.authenticated) {
    vscode.window.showWarningMessage(
      `${preference} CLI: ${healthResult.errorMessage || 'Not available'}. ` +
      `${healthResult.installInstructions || healthResult.authInstructions || ''}`
    );
  }
}
```

**Verification**: Integration test that starts extension and verifies health check ran

**Dependencies**: Fix 1 (needs ConfigManager methods)
**Blocks**: None

---

### Fix 4: Wire AutonomousDriver Provider Integration (1 hour)

**Category**: Functional Correctness (blocks 20 pts)
**Contract**: `plan.md:363`
**File**: `extension/src/autonomousCommands.ts`

**Issue**: AutonomousDriver constructor has provider parameter but it's never passed

**Implementation**:
```typescript
// In extension/src/autonomousCommands.ts, where AutonomousDriver is created
let provider: LLMProvider | undefined;
try {
  const { getProviderFactory } = await import('./council/providers/ProviderFactory');
  const factory = getProviderFactory();
  provider = await factory.getCLIProvider();
} catch (error) {
  // Show error with clickable documentation link
  const errorMsg = error instanceof Error ? error.message : String(error);
  vscode.window
    .showErrorMessage(
      `CLI Provider not available: ${errorMsg}`,
      'View Installation Docs',
      'Continue Without CLI'
    )
    .then((selection) => {
      if (selection === 'View Installation Docs') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/anthropics/claude-code#installation')
        );
      }
    });
  provider = undefined;
}

// Pass provider to AutonomousDriver constructor
const driver = new AutonomousDriver(
  workspacePath,
  progressProvider,
  memoryManager,
  options,
  provider // NOW ACTUALLY PASSED
);
```

**Verification**: Integration test that creates AutonomousDriver and verifies provider set

**Dependencies**: None
**Blocks**: Fix 7 (E2E autonomous test needs this)

---

### Fix 5: Unskip Critical Test (15 min)

**Category**: Test Authenticity (blocks 20 pts)
**File**: `extension/tests/unit/council/providers/cli/CLIProviderAdapter.test.ts`

**Issue**: Line 185 has `it.skip('should throw ProviderError if CLI command not found')`

**Implementation**:
```typescript
// Replace it.skip with proper test using vi.mock
import { vi } from 'vitest';

// At top of file, before describe block
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    execFile: vi.fn()
  };
});

// In test
it('should throw ProviderError if CLI command not found', async () => {
  const { execFile } = await import('child_process');
  vi.mocked(execFile).mockImplementation((cmd, args, options, callback: any) => {
    const error: any = new Error('ENOENT');
    error.code = 'ENOENT';
    callback(error, '', '');
  });

  const adapter = new TestCLIProviderAdapter('nonexistent-cli', 'test-model');

  await expect(adapter.query({ prompt: 'test' }))
    .rejects.toThrow(ProviderError);

  await expect(adapter.query({ prompt: 'test' }))
    .rejects.toThrow('CLI command not found');
});
```

**Verification**: Test passes without skip

**Dependencies**: None
**Blocks**: None

---

### Fix 6: Write Real Integration Test for Provider Switching (2 hours)

**Category**: Integration Reality (blocks 10 pts), Specification Traceability (blocks 5 pts)
**File**: `extension/tests/integration/council/CLIProviderSwitching.integration.test.ts`

**Issue**: Existing test only verifies mocks, not real provider switching

**Implementation**:
```typescript
describe('Real Provider Switching Integration', () => {
  it('should switch providers when config changes', async () => {
    // Setup: Start with Claude CLI
    const config = vscode.workspace.getConfiguration('gofer');
    await config.update('cliProvider', 'claude', vscode.ConfigurationTarget.Global);

    // Get factory and create provider
    const factory = getProviderFactory();
    const claudeProvider = await factory.getCLIProvider();

    expect(claudeProvider.id).toBe('claude-cli');
    expect(claudeProvider.name).toBe('Claude Code CLI');

    // Add conversation history to Claude provider
    if (typeof (claudeProvider as any).setConversationHistory === 'function') {
      (claudeProvider as any).setConversationHistory([
        { role: 'user', content: 'Test message' }
      ]);
    }

    // Action: Switch to Codex CLI
    await config.update('cliProvider', 'codex', vscode.ConfigurationTarget.Global);

    // Get new provider (factory should create Codex instance)
    const codexProvider = await factory.getCLIProvider();

    // Verify: Provider switched
    expect(codexProvider.id).toBe('codex-cli');
    expect(codexProvider.name).toBe('Codex CLI');

    // Verify: History preserved
    if (typeof (codexProvider as any).getConversationHistory === 'function') {
      const history = (codexProvider as any).getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Test message');
    }
  });

  it('should call health check on extension activation', async () => {
    // This test verifies Fix 3
    const { CLIHealthChecker } = await import('../../../src/council/providers/cli/CLIHealthChecker');
    const checkSpy = vi.spyOn(CLIHealthChecker, 'check');

    // Simulate extension activation
    await vscode.commands.executeCommand('gofer.initialize');

    // Verify health check was called
    expect(checkSpy).toHaveBeenCalled();
  });
});
```

**Verification**: Test passes and exercises real ProviderFactory code

**Dependencies**: Fixes 1-4 (needs all integration wiring complete)
**Blocks**: None

---

### Fix 7: Write E2E Test for Pipeline Parity (3-4 hours)

**Category**: Functional Correctness (blocks 20 pts), Specification Traceability (blocks 5 pts)
**File**: `extension/tests/e2e/PipelineProviderParity.e2e.test.ts` (new file)

**Issue**: No E2E test verifying Claude CLI and Codex CLI produce comparable outputs

**Implementation**:
```typescript
describe('Pipeline Provider Parity E2E Tests', () => {
  it('should produce similar research outputs with both CLIs', async () => {
    const testFeature = 'test-provider-parity-research';

    // Setup: Configure Claude CLI
    await vscode.workspace.getConfiguration('gofer')
      .update('cliProvider', 'claude', vscode.ConfigurationTarget.Global);

    // Run: /1_gofer_research with Claude CLI
    await vscode.commands.executeCommand('gofer.runResearch', testFeature);

    // Wait for completion
    await waitForFileExists(`.specify/specs/${testFeature}/research.md`);

    // Read Claude output
    const claudeResearch = await fs.promises.readFile(
      `.specify/specs/${testFeature}/research.md`,
      'utf-8'
    );

    // Parse structure (sections, headings, code blocks)
    const claudeStructure = parseMarkdownStructure(claudeResearch);

    // Cleanup: Remove Claude research
    await fs.promises.rm(`.specify/specs/${testFeature}`, { recursive: true });

    // Setup: Switch to Codex CLI
    await vscode.workspace.getConfiguration('gofer')
      .update('cliProvider', 'codex', vscode.ConfigurationTarget.Global);

    // Run: /1_gofer_research with Codex CLI
    await vscode.commands.executeCommand('gofer.runResearch', testFeature);

    // Wait for completion
    await waitForFileExists(`.specify/specs/${testFeature}/research.md`);

    // Read Codex output
    const codexResearch = await fs.promises.readFile(
      `.specify/specs/${testFeature}/research.md`,
      'utf-8'
    );

    // Parse structure
    const codexStructure = parseMarkdownStructure(codexResearch);

    // Verify: Same structural elements (sections, not exact content)
    expect(codexStructure.sections).toEqual(claudeStructure.sections);
    expect(codexStructure.headingCount).toBeCloseTo(claudeStructure.headingCount, -1); // Within 10%
    expect(codexStructure.hasCodeBlocks).toBe(claudeStructure.hasCodeBlocks);

    // Cleanup
    await fs.promises.rm(`.specify/specs/${testFeature}`, { recursive: true });
  });
});

function parseMarkdownStructure(markdown: string) {
  const sections = markdown.match(/^## .+$/gm) || [];
  const headingCount = (markdown.match(/^#{1,6} /gm) || []).length;
  const hasCodeBlocks = markdown.includes('```');

  return {
    sections: sections.map(s => s.replace(/^## /, '')),
    headingCount,
    hasCodeBlocks
  };
}
```

**Verification**: Test passes and proves parity between providers

**Dependencies**: Fix 4 (needs AutonomousDriver wired), Fixes 1-3 (needs config chain working)
**Blocks**: None

---

## Implementation Order (Critical Path)

```
Fix 1 (ConfigManager methods)
  ↓
Fix 2 (Config watcher) + Fix 3 (Health check)
  ↓
Fix 4 (AutonomousDriver wiring)
  ↓
Fix 5 (Unskip test) [parallel with above]
  ↓
Fix 6 (Integration test)
  ↓
Fix 7 (E2E test)
```

## Success Criteria

After all fixes:
- **Category 1 (Functional Correctness)**: 20/20 — All 8 Red blockers resolved
- **Category 2 (Test Authenticity)**: 20/20 — Skipped test fixed
- **Category 5 (Integration Reality)**: 10/10 — Contracts implemented, real integration tests
- **Category 7 (Architecture Compliance)**: 10/10 — Integration/E2E tests per plan.md
- **Category 10 (Spec Traceability)**: 5/5 — E2E test proves parity claims

**Target Score**: 100/100

## Risk Mitigation

**Risk 1**: E2E test might fail if actual CLIs not installed
- **Mitigation**: Mock CLI spawning in E2E test OR mark test as "requires-cli" and skip in CI

**Risk 2**: Integration chain more complex than expected
- **Mitigation**: Test each fix incrementally before moving to next

**Risk 3**: Time estimate too low
- **Mitigation**: If hitting 10 hours, pause and reassess. May need to descope E2E test to just autonomous mode (skip full pipeline test)

## Next Steps

1. Start with Fix 1 (ConfigManager) - foundation for everything
2. Verify with unit test after each fix
3. Compile and run lint after each fix
4. If any fix blocks, document why and adjust plan
