---
id: '027-quickstart'
title: Multi-Provider CLI Support - Quickstart Testing Guide
created: 2026-03-16
version: 1.0
---

# Quickstart Testing Guide: Multi-Provider CLI Support

**Feature**: Enable Gofer to work seamlessly with multiple AI CLI providers (Claude Code CLI and Codex CLI) with zero feature parity gaps. Users can switch providers via VSCode settings dropdown, and all Gofer features work identically regardless of provider choice.

**Testing Timeline**: ~2-3 hours for full manual test suite. Automated tests run in <10 minutes.

---

## Prerequisites

Before testing Multi-Provider CLI Support, ensure the following are installed and configured:

### Required

- **VSCode**: Version 1.84.0+ (current version recommended)
- **Node.js**: Version 18.0.0+ (for npm CLI installation)
- **npm**: Version 9.0.0+ (for package installation)

### Claude Code CLI (Recommended for most tests)

- **Installation**:
  ```bash
  npm install -g @anthropic/claude-code
  # Verify installation:
  claude --version
  ```
- **Authentication**:
  - Set `ANTHROPIC_API_KEY` environment variable, OR
  - Run `claude login` to create local session
  - Verify: `claude --version` shows version number (authentication works)

### Codex CLI (Optional, required for provider switching tests)

- **Installation**:
  ```bash
  npm install -g @openai/codex-cli
  # Verify installation:
  codex --version
  ```
- **Authentication**:
  - Set `OPENAI_API_KEY` environment variable, OR
  - Run `codex login` to create local ChatGPT session
  - Verify: `codex --version` shows version number

### VSCode Extension Setup

1. **Clone Gofer Repository**:
   ```bash
   git clone https://github.com/anthropics/gofer.git
   cd gofer
   npm install
   ```

2. **Build Extension**:
   ```bash
   cd extension
   npm install
   npm run compile
   ```

3. **Load Extension in VSCode**:
   - Open VSCode
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Run: `Extensions: Install from VSIX`
   - Select the compiled extension VSIX file
   - OR: Click "Run Extension" in VSCode Debug view (F5)

4. **Verify Extension Installation**:
   - Open VSCode settings: `Ctrl+,`
   - Search: "Gofer"
   - Confirm settings panel appears

---

## Setup Steps

### Step 1: Enable Feature in Settings

1. Open VSCode Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
2. Search: `gofer.cliProvider`
3. Verify dropdown shows three options:
   - `Auto-detect` (default)
   - `Claude Code CLI`
   - `Codex CLI`

**Expected Result**: Dropdown visible with all three options. Default is "Auto-detect".

### Step 2: Verify Auto-Detection on Startup

1. **With Claude CLI only installed**:
   - Open VSCode extension output: `View > Output > Gofer`
   - Look for: `✓ Auto-detected: Claude Code CLI available`
   - No user action required

2. **With Both CLIs installed**:
   - Auto-detection prefers Claude CLI (tested first)
   - Output shows: `✓ Auto-detected: Claude Code CLI available (Codex also available)`

3. **With Neither CLI installed**:
   - Output shows: `✗ No AI CLI found. Install Claude Code or Codex.`
   - VSCode notification appears with installation links

**Expected Result**: Provider auto-detected and logged. Notification only appears if no CLI found.

### Step 3: Manually Select Provider

1. Open VSCode Settings: `Ctrl+,`
2. Navigate to: **Extensions > Gofer > CLI Provider**
3. Click dropdown
4. Select **Claude Code CLI** or **Codex CLI**
5. Confirm notification appears: "Provider changed to: Claude Code CLI. No reload required."

**Expected Result**: Selection persists (survives VSCode reload). No VSCode restart needed.

### Step 4: Verify Provider Status in Settings UI

1. Open VSCode Settings: `Ctrl+,`
2. Search: `gofer.cliProvider`
3. Look for status indicator next to selected provider:
   - ✓ Available (green checkmark) = CLI installed and authenticated
   - ✗ Not Found (red X) = CLI not installed or authentication failed

**Expected Result**: Status indicator reflects actual CLI availability (green if installed, red if missing).

---

## Manual Testing Section

### Test Scenario 1: Provider Selection (User Story 1)

**Objective**: Verify VSCode settings dropdown appears and selections persist.

**Acceptance Criteria**:
- [ ] Dropdown appears in VSCode settings under "Gofer > CLI Provider"
- [ ] Dropdown offers three options: Claude Code CLI, Codex CLI, Auto-detect
- [ ] Default setting is "Auto-detect"
- [ ] Setting persists across VSCode restarts
- [ ] Changing setting displays confirmation notification

**Test Steps**:

1. **Verify dropdown visibility**:
   - Open Settings: `Ctrl+,`
   - Search: `gofer.cliProvider`
   - **Expected**: Dropdown visible with 3 options

2. **Check default value**:
   - Value should be: "auto-detect"
   - **Expected**: No manual configuration required on first use

3. **Test persistence across restarts**:
   - Select: "Claude Code CLI"
   - Confirm notification: "Provider changed to Claude Code CLI"
   - Close and reopen VSCode
   - Go to Settings > Gofer > CLI Provider
   - **Expected**: Setting still shows "Claude Code CLI"

4. **Test notification on change**:
   - Change setting to "Codex CLI"
   - **Expected**: VSCode notification appears: "Provider changed to Codex CLI. No reload required."
   - Dismiss notification
   - Change setting back to "Auto-detect"
   - **Expected**: Another notification appears

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 2: Auto-Detection (User Story 3)

**Objective**: Verify auto-detection identifies available CLIs correctly.

**Acceptance Criteria**:
- [ ] Auto-detect checks for Claude CLI first, then Codex CLI
- [ ] If neither CLI found, error message lists both with installation commands
- [ ] Health check runs on extension activation
- [ ] Clear error messages include version check output

**Test Steps**:

1. **With Claude CLI only**:
   - Uninstall Codex: `npm uninstall -g @openai/codex-cli`
   - Set setting to: "Auto-detect"
   - Check output: `View > Output > Gofer`
   - **Expected**: `✓ Auto-detected: Claude Code CLI`

2. **With Codex CLI only**:
   - Uninstall Claude: `npm uninstall -g @anthropic/claude-code`
   - Install Codex: `npm install -g @openai/codex-cli`
   - Reload VSCode
   - Check output
   - **Expected**: `✓ Auto-detected: Codex CLI`

3. **With no CLI installed**:
   - Uninstall both CLIs
   - Reload VSCode
   - Check output and notifications
   - **Expected**: Error notification: "No AI CLI found. Install Claude Code (`npm install -g @anthropic/claude-code`) or Codex (`npm install -g @openai/codex-cli`)"

4. **Version check on health check**:
   - Reinstall Claude: `npm install -g @anthropic/claude-code`
   - Watch output during activation
   - **Expected**: `✓ Claude Code CLI v1.x.x available`

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 3: Provider Switching (User Story 2)

**Objective**: Verify seamless switching between providers without workflow disruption.

**Prerequisites**:
- Both Claude Code CLI and Codex CLI installed
- Both CLIs authenticated (ANTHROPIC_API_KEY and OPENAI_API_KEY set)

**Acceptance Criteria**:
- [ ] Switching providers requires exactly 1 click (dropdown change)
- [ ] Pipeline stages work identically on both providers
- [ ] Autonomous mode works identically on both providers
- [ ] No manual configuration required after switching
- [ ] Context and conversation history maintained across switches

**Test Steps**:

1. **Run pipeline stage with Claude CLI**:
   - Set provider to: "Claude Code CLI"
   - Open command palette: `Ctrl+Shift+P`
   - Run: `Gofer: Start Research (/1_gofer_research)`
   - Provide feature prompt: "multi-provider support system"
   - Wait for completion (~5-10 minutes)
   - Note output format and structure

2. **Switch to Codex CLI and run same stage**:
   - Go to Settings: `Ctrl+,`
   - Search: `gofer.cliProvider`
   - Change to: "Codex CLI"
   - Confirm notification appears
   - Run same command again: `Gofer: Start Research`
   - Provide same prompt
   - **Expected**: Same output structure as Claude version (both produce spec.md)

3. **Compare outputs**:
   - Both stages produce valid markdown spec files
   - Both include same sections (Overview, User Stories, Acceptance Criteria, etc.)
   - Quality and depth similar across providers
   - No errors unique to either provider

4. **Test context persistence**:
   - In Claude mode: Run research stage
   - Switch to Codex mid-session
   - Run another pipeline command
   - **Expected**: No errors, context carries forward

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 4: Feature Parity - Pipeline Stages (User Story 2)

**Objective**: Verify all 7 pipeline stages work identically on both providers.

**Prerequisites**:
- Both CLIs installed and authenticated
- Test feature selected and ready

**Acceptance Criteria**:
- [ ] `/0_business_scenario` returns same business case on both CLIs
- [ ] `/1_gofer_research` produces identical research structure
- [ ] `/2_gofer_specify` produces identical specification format
- [ ] `/3_gofer_plan` produces identical plan structure
- [ ] `/4_gofer_tasks` produces identical task breakdown
- [ ] `/5_gofer_implement` executes identical implementation
- [ ] `/6_gofer_validate` produces identical validation scoring

**Test Steps** (Choose one pipeline stage, or all for comprehensive test):

1. **Research Stage (`/1_gofer_research`)**:
   - Set provider: "Claude Code CLI"
   - Run: `Gofer: Start Research`
   - Provide prompt: "test feature X"
   - Wait for completion
   - Save output to file: `claude-research.md`

2. **Switch provider and repeat**:
   - Set provider: "Codex CLI"
   - Run: `Gofer: Start Research` again
   - Save output to file: `codex-research.md`

3. **Compare outputs**:
   - Both files valid markdown
   - Both include same sections (Technology Decisions, Constraints, Open Questions)
   - Both include proper markdown formatting
   - Quality comparable
   - No provider-specific errors

4. **Specification Stage (`/2_gofer_specify`)**:
   - Repeat same pattern with: `Gofer: Start Specification`
   - Compare `claude-spec.md` vs `codex-spec.md`

5. **Validation Stage (`/6_gofer_validate`)**:
   - Repeat pattern with: `Gofer: Start Validation`
   - Both should produce 100-point rubric scoring
   - Both include same validation categories

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 5: Autonomous Mode (User Story 2)

**Objective**: Verify autonomous mode works with both providers.

**Prerequisites**:
- Both CLIs installed
- Simple test task available (e.g., write a short function)

**Acceptance Criteria**:
- [ ] Autonomous mode executes with Claude CLI
- [ ] Autonomous mode executes with Codex CLI
- [ ] No errors specific to either provider
- [ ] Both produce working code

**Test Steps**:

1. **Enable autonomous mode with Claude**:
   - Set provider: "Claude Code CLI"
   - Open command palette: `Ctrl+Shift+P`
   - Run: `Gofer: Start Autonomous Mode`
   - Provide task: "Create a TypeScript function that validates email addresses"
   - Wait for completion (~5-10 minutes)
   - Verify code is generated and valid

2. **Switch to Codex and run same task**:
   - Set provider: "Codex CLI"
   - Confirm notification
   - Run: `Gofer: Start Autonomous Mode`
   - Provide same task
   - **Expected**: Code generated, valid, no provider-specific errors

3. **Validate both outputs**:
   - Both produced working code
   - Both include file creation and modification
   - Both include explanatory comments
   - Quality comparable

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 6: Error Handling - Missing CLI (User Story 3)

**Objective**: Verify clear error messages when selected CLI is not installed.

**Acceptance Criteria**:
- [ ] Error includes installation command
- [ ] Error includes clickable link to docs
- [ ] Setting change takes effect without reload
- [ ] Can recover by installing CLI or switching provider

**Test Steps**:

1. **Select unavailable provider**:
   - Uninstall Codex: `npm uninstall -g @openai/codex-cli`
   - Set provider: "Codex CLI"
   - Run command: `Gofer: Start Research`

2. **Capture error**:
   - **Expected**: Error notification: "Codex CLI not found. Install with: `npm install -g @openai/codex-cli` or switch provider in settings"
   - Error includes installation command
   - Error suggests fallback action

3. **Test recovery**:
   - Option A: Install missing CLI: `npm install -g @openai/codex-cli`
   - Option B: Switch provider via settings
   - Run command again
   - **Expected**: Command succeeds

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 7: Error Handling - Authentication Failure (User Story 3)

**Objective**: Verify clear error messages when provider authentication fails.

**Acceptance Criteria**:
- [ ] Error message includes authentication steps
- [ ] Error suggests fix: set API key or run login command
- [ ] Error is provider-specific and actionable

**Test Steps**:

1. **Unset authentication**:
   - Unset `ANTHROPIC_API_KEY`: `unset ANTHROPIC_API_KEY`
   - Unset any cached credentials if applicable
   - Set provider: "Claude Code CLI"

2. **Trigger command**:
   - Run: `Gofer: Start Research`
   - Provide prompt

3. **Capture error**:
   - **Expected**: Error: "Claude CLI found but not authenticated. Set ANTHROPIC_API_KEY or run `claude login`"
   - Error is clear and actionable
   - Error includes authentication method

4. **Test recovery**:
   - Set API key: `export ANTHROPIC_API_KEY=your-key`
   - Run command again
   - **Expected**: Command succeeds

**Result**: ✓ PASS / ✗ FAIL

---

### Test Scenario 8: Provider-Specific Features - MCP Servers (User Story 4)

**Objective**: Verify MCP servers only work with Claude CLI.

**Acceptance Criteria**:
- [ ] MCP servers activate when Claude CLI selected
- [ ] MCP servers gracefully fail when Codex selected
- [ ] Error message explains provider limitation

**Test Steps** (if using MCP servers in workflow):

1. **With Claude CLI**:
   - Set provider: "Claude Code CLI"
   - Run workflow using MCP servers
   - **Expected**: MCP servers work correctly

2. **With Codex CLI**:
   - Set provider: "Codex CLI"
   - Run same workflow
   - **Expected**: Error or graceful degradation: "MCP servers require Claude CLI. Switch provider or use alternative approach"

**Result**: ✓ PASS / ✗ FAIL (or N/A if not using MCP)

---

### Test Scenario 9: Provider-Specific Features - Web Search (User Story 4)

**Objective**: Verify web search only works with Codex CLI.

**Acceptance Criteria**:
- [ ] Web search works when Codex CLI selected
- [ ] Web search unavailable when Claude CLI selected
- [ ] Clear notification about provider limitation

**Test Steps** (if using web search in workflow):

1. **With Codex CLI**:
   - Set provider: "Codex CLI"
   - Run workflow using web search
   - **Expected**: Web search works

2. **With Claude CLI**:
   - Set provider: "Claude Code CLI"
   - Run same workflow
   - **Expected**: Notification: "Web search not available with Claude CLI. Switch to Codex or use alternative approach"

**Result**: ✓ PASS / ✗ FAIL (or N/A if not using web search)

---

### Test Scenario 10: Usage Tracking Across Providers (User Story 5)

**Objective**: Verify token usage tracked separately for each provider.

**Acceptance Criteria**:
- [ ] AI Usage panel shows provider name alongside token counts
- [ ] Token usage tracked separately per provider
- [ ] Usage logs parsed correctly from both CLIs
- [ ] Export includes provider breakdown

**Test Steps**:

1. **Run commands with Claude CLI**:
   - Set provider: "Claude Code CLI"
   - Run: `Gofer: Start Research`
   - Run: `Gofer: Start Specification`
   - Note token usage

2. **Switch to Codex and run more commands**:
   - Set provider: "Codex CLI"
   - Run: `Gofer: Start Research`
   - Note token usage

3. **Check AI Usage panel**:
   - Open: `View > AI Usage` (or similar panel)
   - **Expected**: Shows separate rows:
     - "Claude Code CLI: 150K tokens"
     - "Codex CLI: 80K tokens"
   - Provider name appears alongside counts
   - Totals are correct

4. **Export usage report**:
   - Click: "Export Usage Data"
   - **Expected**: CSV includes "Provider" column with "Claude Code CLI" and "Codex CLI" entries

**Result**: ✓ PASS / ✗ FAIL

---

## Automated Tests Section

### Unit Tests

**Purpose**: Test individual provider adapters and components in isolation.

**Test Command**:
```bash
cd /path/to/gofer
npm test -- --testPathPattern="provider|cli" --coverage
```

**Test Files to Run**:
- `tests/unit/providers/ClaudeCodeCLIProvider.test.ts`
- `tests/unit/providers/CodexCLIProvider.test.ts`
- `tests/unit/providers/CLIProviderAdapter.test.ts`
- `tests/unit/config/ConfigManager.test.ts` (CLI provider settings)
- `tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts`

**Expected Coverage**:
- [ ] Provider interface implementation: 100%
- [ ] Auto-detection logic: 100%
- [ ] Error handling: 100%
- [ ] Configuration management: 100%
- [ ] Usage log parsing: 100%

**Success Criteria**: All unit tests pass with ≥95% code coverage.

---

### Integration Tests

**Purpose**: Test provider switching, fallback behavior, and multi-stage workflows.

**Test Command**:
```bash
cd /path/to/gofer
npm test -- --testPathPattern="integration.*provider|integration.*cli" --coverage
```

**Test Files to Run**:
- `tests/integration/autonomous/AIUsageAutoDiscovery.integration.test.ts`
- `tests/integration/providers/ProviderSwitching.integration.test.ts`
- `tests/integration/providers/ProviderFailover.integration.test.ts`
- `tests/integration/autonomous/AutonomousMode.integration.test.ts`

**Test Scenarios**:
- [ ] Switch provider via settings and trigger command
- [ ] Auto-detection finds correct CLI
- [ ] Error handling for missing CLI
- [ ] Authentication failure graceful degradation
- [ ] Usage tracking for both providers
- [ ] Pipeline stage execution with both providers

**Success Criteria**: All integration tests pass. No provider-specific errors.

---

### E2E Tests (Manual)

**Purpose**: Test full pipeline execution with both providers.

**Setup**:
```bash
cd /path/to/gofer/extension
npm run compile  # Build extension
# Launch VSCode debug session with extension (F5)
```

**Test Sequence 1: Full Pipeline with Claude**:

1. Set provider: "Claude Code CLI"
2. Run: `/0_business_scenario` with test feature prompt
3. Let it chain through all 7 stages automatically
4. Verify all outputs valid and complete

**Expected Result**: All 7 stages complete successfully. No errors. Output files created.

**Test Sequence 2: Full Pipeline with Codex**:

1. Set provider: "Codex CLI"
2. Run: `/0_business_scenario` with DIFFERENT test feature prompt
3. Let it chain through all 7 stages
4. Verify all outputs valid and complete

**Expected Result**: All 7 stages complete successfully. No errors. Output files created.

**Test Sequence 3: Provider Switching Mid-Pipeline**:

1. Set provider: "Claude Code CLI"
2. Run: `/0_business_scenario` - let it run through stage 2
3. Set provider: "Codex CLI"
4. Let pipeline continue (stage 3 onward with Codex)
5. Verify final outputs valid

**Expected Result**: Pipeline continues without errors. Final outputs include contributions from both providers.

---

### Performance Tests

**Purpose**: Verify provider switching doesn't introduce significant latency.

**Test Command**:
```bash
cd /path/to/gofer
npm test -- --testPathPattern="performance|benchmark" --coverage
```

**Success Criteria**:
- [ ] Provider switching completes in <500ms
- [ ] Auto-detection completes in <2 seconds
- [ ] CLI queries complete within 2x API latency
- [ ] No memory leaks on repeated provider switches

---

### Backward Compatibility Tests

**Purpose**: Verify existing Gofer workflows still work with default "Auto-detect" setting.

**Test Command**:
```bash
cd /path/to/gofer
npm test -- --testPathPattern="backward.*compat" --coverage
```

**Test Strategy**:
1. Run all existing integration tests with default settings (Auto-detect)
2. Verify 100% pass rate
3. Verify no warnings about deprecated APIs

**Success Criteria**: All existing tests pass without modification. Zero breaking changes.

---

## Key Files Table

| File | Purpose | Testing Focus |
|------|---------|----------------|
| `extension/package.json` | VSCode settings schema | Dropdown appears, default value correct |
| `extension/src/config.ts` | Configuration getters | `getPreferredCLIProvider()`, `getCodexCommand()` |
| `extension/src/council/providers/LLMProvider.ts` | Provider interface | Implemented correctly by CLI adapters |
| `extension/src/council/providers/ProviderFactory.ts` | Provider creation | `createCLIProvider()` method works |
| `extension/src/providers/cli/CLIProviderAdapter.ts` | Base CLI adapter (NEW) | Health checks, error handling, interface compliance |
| `extension/src/providers/cli/ClaudeCodeCLIProvider.ts` | Claude CLI implementation (NEW) | CLI spawning, output parsing, authentication |
| `extension/src/providers/cli/CodexCLIProvider.ts` | Codex CLI implementation (NEW) | CLI spawning, output parsing, authentication |
| `extension/src/claudeCodeBridge.ts` | Bridge to CLI | Uses `LLMProvider` interface, not SDK |
| `extension/src/autonomous/AutonomousDriver.ts` | Autonomous orchestration | Accepts `LLMProvider` via DI |
| `extension/src/autonomous/TerminalManager.ts` | Terminal spawning | Reused for CLI process management |
| `extension/src/autonomous/ClaudeCodeUsageAdapter.ts` | Usage log parsing | Claude and Codex log parsing |
| `tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts` | Usage adapter tests | Token count parsing for both CLIs |
| `tests/integration/autonomous/AIUsageAutoDiscovery.integration.test.ts` | Auto-discovery tests | Provider detection and fallback |

---

## Common Issues and Solutions

### Issue 1: CLI Not Found Despite Installation

**Symptom**: Error message "Claude Code CLI not found" even after `npm install -g @anthropic/claude-code`

**Diagnosis**:
1. Verify CLI installed: `which claude` or `which codex`
2. Check PATH includes npm global directory: `npm config get prefix`
3. Verify installation: `claude --version` or `codex --version`

**Solutions**:
1. **Reinstall CLI**:
   ```bash
   npm uninstall -g @anthropic/claude-code
   npm install -g @anthropic/claude-code
   ```

2. **Check npm global path**:
   ```bash
   # On macOS/Linux:
   echo $PATH
   # Should include: /usr/local/bin or similar

   # If not, add npm global directory to PATH in ~/.bashrc or ~/.zshrc:
   export PATH="$(npm config get prefix)/bin:$PATH"
   ```

3. **Use absolute path in settings**:
   - Set `gofer.claudeCodeCommand` to full path: `/usr/local/bin/claude`
   - Set `gofer.codexCommand` to full path: `/usr/local/bin/codex`

4. **Verify installation location**:
   ```bash
   # Find where CLI was installed:
   find /usr/local -name "claude" 2>/dev/null
   find /usr -name "codex" 2>/dev/null
   ```

---

### Issue 2: Authentication Failures

**Symptom**: Error "Claude CLI found but not authenticated" or similar

**Claude CLI Authentication**:

1. **Check API key**:
   ```bash
   echo $ANTHROPIC_API_KEY
   # Should output a non-empty string
   ```

2. **Set API key**:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   # Or in VSCode settings:
   # Set gofer.anthropicApiKey to your key
   ```

3. **Use login method**:
   ```bash
   claude login
   # Follow prompts to authenticate
   ```

4. **Verify configuration file**:
   ```bash
   cat ~/.claude/config.json
   # Should include valid API key or session token
   ```

**Codex CLI Authentication**:

1. **Check OpenAI API key**:
   ```bash
   echo $OPENAI_API_KEY
   ```

2. **Set API key**:
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Use login method**:
   ```bash
   codex login
   # Follow prompts to authenticate with ChatGPT account
   ```

4. **Verify configuration**:
   ```bash
   cat ~/.codex/config.json
   ```

---

### Issue 3: Provider Setting Change Doesn't Take Effect

**Symptom**: Changed provider via settings, but old provider still used

**Diagnosis**:
1. Check VSCode output for setting change detection
2. Verify setting was saved (VSCode shows modified indicator)

**Solutions**:

1. **Save settings explicitly**:
   - Edit settings.json directly: `Ctrl+Shift+P` > "Preferences: Open Settings (JSON)"
   - Save file: `Ctrl+S`

2. **Reload VSCode**:
   - Press `Ctrl+K Ctrl+R` (reload window)
   - Or close and reopen VSCode

3. **Check setting scope**:
   - Is setting in User or Workspace scope?
   - Workspace settings override User settings
   - Check both: Settings (User) and `.vscode/settings.json` (Workspace)

4. **Verify setting name**:
   - Setting should be: `gofer.cliProvider`
   - Value should be: "claude", "codex", or "auto"
   - Check spelling exactly

---

### Issue 4: Auto-Detection Always Picks Same Provider

**Symptom**: Both CLIs installed, but auto-detection always picks Claude (or always Codex)

**Root Cause**: Auto-detection is working correctly (prefers Claude if both available)

**If you want to use Codex**: Explicitly set `gofer.cliProvider` to "Codex CLI" in settings

**If auto-detection not working**:
1. Check both CLIs available: `claude --version && codex --version`
2. Check output: `View > Output > Gofer`
3. Should show: "✓ Auto-detected: Claude Code CLI (Codex also available)"

---

### Issue 5: Parsing Errors or CLI Output Not Recognized

**Symptom**: Error "Failed to parse CLI response" or garbled output

**Diagnosis**:
1. Run CLI directly and check output format:
   ```bash
   claude --version
   codex --version
   ```

2. Check CLI version compatibility:
   ```bash
   # Expected versions:
   # Claude: v1.0.0 or higher
   # Codex: v2.0.0 or higher
   ```

**Solutions**:

1. **Upgrade CLI**:
   ```bash
   npm install -g @anthropic/claude-code@latest
   npm install -g @openai/codex-cli@latest
   ```

2. **Check output format**:
   - Claude CLI outputs markdown with `---` separators
   - Codex CLI outputs JSON or TUI format
   - If format unexpected, may need parser update

3. **Enable debug logging**:
   - Set VSCode log level to "Debug"
   - Check output: `View > Output > Gofer`
   - Look for parser errors

4. **Report issue**:
   - Include CLI version: `claude --version`
   - Include VSCode output from parsing error
   - Include example CLI output that failed to parse

---

### Issue 6: Usage Tracking Shows No Tokens

**Symptom**: AI Usage panel empty or shows 0 tokens after running commands

**Diagnosis**:
1. Check usage log files exist:
   ```bash
   # Claude logs:
   cat ~/.claude/history.jsonl
   # Should show JSON lines with token counts

   # Codex logs:
   cat ~/.codex/history.json
   # Should show JSON with history array
   ```

2. Verify commands actually ran (output produced)

3. Check log format matches expected format

**Solutions**:

1. **For Claude logs**:
   - Ensure `~/.claude/history.jsonl` is writable
   - Verify JSONL format is valid: Each line = valid JSON
   - Check token counts in log: `grep "token" ~/.claude/history.jsonl`

2. **For Codex logs**:
   - Ensure `~/.codex/history.json` is writable
   - Verify JSON format is valid: `jq . ~/.codex/history.json`
   - Check history array exists: `jq '.history | length' ~/.codex/history.json`

3. **Refresh usage panel**:
   - Close and reopen usage panel
   - Or run: `Gofer: Refresh AI Usage`

4. **Check file permissions**:
   ```bash
   ls -la ~/.claude/
   ls -la ~/.codex/
   # Should be readable and writable
   ```

---

### Issue 7: Pipeline Chains Don't Complete with New Provider

**Symptom**: Started pipeline with Claude, switched to Codex, pipeline failed

**Root Cause**: Possible incompatibility or uninitialized state

**Solutions**:

1. **Restart extension**:
   - Press `Ctrl+Shift+P` > "Developer: Reload Window"
   - Change provider setting
   - Re-run pipeline

2. **Clear conversation history**:
   - Close all Gofer-related terminals
   - Delete temporary conversation files if any
   - Re-run pipeline fresh

3. **Check provider health**:
   - Run: `Gofer: Check Provider Status`
   - Should show: "✓ Provider available and authenticated"
   - If fails, check Issue #2 (Authentication)

4. **Verify both CLIs work independently**:
   ```bash
   # Test Claude directly:
   claude --prompt "hello"

   # Test Codex directly:
   codex "hello"
   ```

---

### Issue 8: VSCode Memory/Performance Issues

**Symptom**: VSCode becomes slow or unresponsive after multiple provider switches

**Root Cause**: Possible resource leak from terminal processes

**Solutions**:

1. **Kill lingering processes**:
   ```bash
   # Kill any orphaned Claude processes:
   pkill -f "claude"

   # Kill any orphaned Codex processes:
   pkill -f "codex"
   ```

2. **Disable automatic provider switching**:
   - Set provider explicitly (don't use auto-detect)
   - Reduces repeated detection checks

3. **Increase VSCode memory limit**:
   - Edit VSCode launch args
   - Add: `--max-old-space-size=4096`

4. **Check extension output for errors**:
   - `View > Output > Gofer`
   - Look for repeated error messages
   - Report any patterns

---

### Issue 9: Different Output Between Providers

**Symptom**: Claude and Codex produce different markdown structure or quality

**Expected Behavior**: Outputs may differ in wording/examples, but structure should be identical

**What's Expected**:
- Both produce valid markdown files
- Both include same sections (Overview, Requirements, etc.)
- Both use same heading levels and formatting
- Quality comparable (both high-quality responses)

**What's NOT Expected**:
- Different file structure (one has sections other lacks)
- Different markdown formatting (inconsistent heading levels)
- Provider-specific errors only on one CLI

**If outputs different**:

1. **Verify both CLIs authenticated**:
   - Run direct CLI commands and check work
   - Confirm both have API/key access

2. **Check for provider-specific features**:
   - Codex may use web search (differs from Claude)
   - Claude may use MCP servers (unavailable for Codex)
   - These are expected differences

3. **Verify same input prompt used**:
   - Compare exact prompts given to each provider
   - Ensure same context and parameters

4. **Report quality differences**:
   - If one provider produces consistently lower quality
   - Provide example inputs and outputs
   - Could be provider limitation or configuration issue

---

## Test Coverage Checklist

Use this checklist to track completion of all test scenarios:

### Manual Tests
- [ ] Scenario 1: Provider Selection
- [ ] Scenario 2: Auto-Detection
- [ ] Scenario 3: Provider Switching
- [ ] Scenario 4: Feature Parity (Pipeline)
- [ ] Scenario 5: Autonomous Mode
- [ ] Scenario 6: Error Handling (Missing CLI)
- [ ] Scenario 7: Error Handling (Auth Failure)
- [ ] Scenario 8: Provider-Specific Features (MCP)
- [ ] Scenario 9: Provider-Specific Features (Web Search)
- [ ] Scenario 10: Usage Tracking

### Automated Tests
- [ ] Unit Tests: All passing
- [ ] Integration Tests: All passing
- [ ] E2E Tests: Full pipeline success
- [ ] Performance Tests: <500ms switching, <2s auto-detect
- [ ] Backward Compatibility: Existing tests pass

### Settings & Configuration
- [ ] Dropdown visible in VSCode Settings
- [ ] Default value is "Auto-detect"
- [ ] Setting persists across restarts
- [ ] Provider status indicator shows correctly

### Error Cases
- [ ] Missing Claude CLI: Error message clear
- [ ] Missing Codex CLI: Error message clear
- [ ] Neither CLI installed: Both install commands shown
- [ ] Authentication failure: Clear instructions provided
- [ ] CLI version incompatible: Helpful upgrade message

### Documentation
- [ ] Quickstart guide complete
- [ ] Common issues documented
- [ ] Test commands working
- [ ] File table accurate

---

## Sign-Off

**Testing Completed By**: ________________
**Date**: ________________
**Overall Result**: ✓ PASS / ✗ FAIL

**Pass Criteria**:
- All 10 manual test scenarios pass
- All automated tests pass (unit, integration, E2E, perf)
- All 5 configuration tests pass
- All 4 error cases handled correctly
- Feature parity verified on both providers

**Failed Scenarios** (if any):
```
[Document any failures here]
```

**Notes**:
```
[Any additional observations or issues encountered]
```

---

**Feature Ready for Release**: YES / NO
**Known Limitations**:
- [List any limitations or workarounds]

