---
title: Cross-Platform Command Parity - Quickstart Testing Guide
date: 2026-03-18
status: draft
---

# Quickstart Testing Guide: Cross-Platform Command Parity

This guide enables rapid end-to-end testing of Feature 028 (Cross-Platform
Command Parity) across all three AI platforms: Claude Code CLI, GitHub Copilot
Chat, and Codex CLI.

## Prerequisites

### System Requirements

- macOS, Linux (x86_64, arm64, arm, ia32), or Windows with WSL
- Node.js 18+ (verify: `node --version`)
- VSCode 1.80+ (verify: `code --version`)
- 2GB free disk space for CLI installations and test artifacts

### Prerequisites Checklist (5 items)

- [ ] VSCode 1.80 or later installed
- [ ] Node.js 18 or later installed
- [ ] npm 9 or later installed
- [ ] Git 2.40 or later installed
- [ ] Internet connection for CLI authentication

### Environment Variables (Optional)

```bash
# Set to skip CLI version checks (testing only)
export GOFER_SKIP_CLI_VERSION_CHECK=true

# Reduce log verbosity during tests
export GOFER_TEST_MODE=quiet
```

---

## CLI Installation Setup (Choose All 3 for Full Coverage)

### 1. Claude Code CLI (Required for Baseline Tests)

**Installation**:

```bash
# Install Claude Code CLI
npm install -g @anthropic/claude-code

# Authenticate
claude auth login

# Verify installation
claude --version
# Expected output: claude 2.x.x or higher
```

**Verification**:

```bash
# Test basic skill invocation
echo "test" | claude /0_business_scenario
```

**Troubleshooting**:

- `command not found: claude` → Add `~/.npm/bin` to PATH
- `Not authenticated` → Run `claude auth login` and paste authentication token
- Version too old (< 2.0) → Run `npm install -g @anthropic/claude-code@latest`

---

### 2. GitHub Copilot Chat (Copilot 2026+ Recommended)

**Installation**:

```bash
# Install GitHub CLI (prerequisite for Copilot CLI)
brew install gh  # macOS
# or: apt-get install gh  # Linux
# or: choco install gh  # Windows

# Install Copilot CLI
npm install -g @github/copilot-cli

# Authenticate
gh auth login

# Verify installation
copilot --version
# Expected output: copilot 2.0.0 or higher (2026 version)
```

**Verification**:

```bash
# Test Copilot with Gofer command
copilot prompt "Analyze this code: function test() { return 42; }"

# List available agents (2026+ feature)
copilot agents list
```

**Troubleshooting**:

- `command not found: copilot` → Run `npm install -g @github/copilot-cli@latest`
- `Not authenticated` → Run `gh auth login` and authorize GitHub
- Parallel agents not available → Check version with `copilot --version`; must
  be 2.0.0+
- `.github/prompts/` not recognized → Ensure working directory is Gofer repo
  root

---

### 3. Codex CLI (Required for Complete Platform Coverage)

**Installation**:

```bash
# Install Codex CLI
npm install -g @openai/codex-cli

# Authenticate with OpenAI API key
codex auth set-key

# Verify installation
codex --version
# Expected output: codex 1.x.x or higher
```

**Verification**:

```bash
# Test Codex skill discovery
codex skills list | grep gofer

# Load skills dynamically
codex reload

# Test single skill invocation
$ $0-business-scenario "test scenario"
```

**Troubleshooting**:

- `command not found: codex` → Run `npm install -g @openai/codex-cli@latest`
- `API key not found` → Run `codex auth set-key` with OpenAI API key
- Skills not appearing → Run `codex reload` or restart terminal
- Skill invocation fails → Check that `.system/skills/` directory exists in repo
  root
- Linux/Codespaces error "invalid ELF header" → Run `npm install` to verify
  node-pty-prebuilt-multiarch binary compatibility

---

## VSCode Extension Setup

### Install Gofer Extension

```bash
cd /path/to/gofer/repository

# Install dependencies
npm install
cd extension && npm install
cd ../language-server && npm install
cd ..

# Build extension (VSIX file)
./release-auto.sh patch "Development build for testing"
# Output: extension/eai-gofer-*.vsix
```

### Install Extension in VSCode

```bash
# Option A: Via Command Line
code --install-extension extension/eai-gofer-*.vsix --force

# Option B: Via VSCode UI
# 1. Open VSCode Extensions panel (Cmd+Shift+X)
# 2. Click "Install from VSIX..."
# 3. Select extension/eai-gofer-*.vsix
# 4. Click "Install"
```

### Verify Extension Activation

```bash
# Open VSCode
code .

# Check Output panel (VSCode menu: View > Output)
# Select "Gofer" from dropdown
# Expected: "Gofer extension activated successfully"

# Open Command Palette (Cmd+Shift+P)
# Type: gofer
# Expected: 18 Gofer commands listed
```

---

## Configure VSCode Settings

### Add Default CLI Setting

```json
// In .vscode/settings.json (repo root)
{
  "gofer.defaultCLI": "auto",
  "gofer.claudeCodeCommand": "claude",
  "gofer.codexCommand": "codex"
}
```

### Override per CLI (Optional)

```json
{
  "gofer.defaultCLI": "claude", // Switch to "copilot" or "codex" to change
  "gofer.enableAutoChaining": true,
  "gofer.validateParallelAgents": true
}
```

### Reload VSCode

```bash
# Reload extension without restarting VSCode
# Command Palette (Cmd+Shift+P) > "Developer: Reload Window"
```

---

## Manual Testing Scenarios

### Scenario 1: Codex Skill Discovery (Acceptance Criteria 028-US1)

**Objective**: Verify all 18 Gofer commands are discoverable in Codex CLI

**Setup**:

```bash
# Ensure Codex CLI is installed and authenticated
codex --version
codex reload  # Force skill discovery
```

**Test Steps**:

1. Open terminal
2. Run: `codex skills list`
3. Verify output includes all 18 Gofer skills:
   - `0-business-scenario`
   - `1-gofer-research`
   - `2-gofer-specify`
   - `3-gofer-plan`
   - `4-gofer-tasks`
   - `5-gofer-implement`
   - `6-gofer-validate`
   - `7-gofer-summarize`
   - Additional: `gofer-hydrate`, `gofer-remember`, etc.

4. Test skill invocation:

   ```bash
   $ $0-business-scenario "Build a user authentication system"
   ```

5. Verify output structure:
   - Skill executes without "not found" error
   - Output contains expected sections (research, business impact, next steps)
   - Command completes in <10 seconds

**Pass Criteria**:

- [ ] 18 skills listed in `codex skills list`
- [ ] Auto-complete suggests Gofer skills on `$ $gofer-` prefix
- [ ] Skill invocation succeeds with valid output
- [ ] Output structure matches spec (markdown with YAML frontmatter)

**Failure Modes**:

- "Skill not found" error → Run `codex reload` and verify `.system/skills/`
  directory exists
- Empty skill list → Check that skill files have valid SKILL.md format (YAML
  frontmatter + body)
- Partial list (< 18) → Verify all skill files created in
  `.system/skills/[name]/SKILL.md` format

---

### Scenario 2: Auto-Chaining Across Platforms (Acceptance Criteria 028-US2)

**Objective**: Verify all 7 pipeline stages execute automatically across all
platforms

**Test Setup**:

```bash
# Create test workspace
mkdir -p /tmp/eai-gofer-test-{claude,copilot,codex}
cd /tmp/eai-gofer-test-claude
```

#### Test 2A: Claude Code CLI Auto-Chain

**Steps**:

1. Start Claude CLI session:

   ```bash
   claude
   ```

2. Invoke orchestrator:

   ```
   /0_business_scenario "Build a real-time notification system"
   ```

3. Monitor output for auto-chaining:
   - Stage 0 (orchestrator) completes
   - Stage 1 (research) starts automatically
   - Stage 2 (specify) starts automatically (no user prompt)
   - Continue through Stage 7 (summarize)

4. Time the complete pipeline:
   - Measure time from `/0_business_scenario` invocation to final summary
   - Target: <120 seconds total

**Pass Criteria**:

- [ ] All 7 stages execute without user intervention
- [ ] Each stage transition occurs within 5 seconds of previous stage completion
- [ ] Output includes research.md, spec.md, plan.md, tasks.md, impl.md,
      validation-report.md
- [ ] No user prompts appear (e.g., "Ready for next stage?")
- [ ] Pipeline completes in <120 seconds

**Expected Output Files** (in working directory):

```
research.md           # Stage 1 output
spec.md              # Stage 2 output
plan.md              # Stage 3 output
tasks.md             # Stage 4 output (if implemented)
implementation.md    # Stage 5 output (if implemented)
validation-report.md # Stage 6 output
summary.md           # Stage 7 output (if implemented)
```

#### Test 2B: Copilot Chat Auto-Chain

**Steps**:

1. Open Copilot Chat:

   ```bash
   copilot chat
   ```

2. Invoke orchestrator:

   ```
   #0_business_scenario "Build a real-time notification system"
   ```

3. Monitor chat for:
   - Auto-chain instructions in Copilot response
   - Suggestions to run `#1_gofer_research` (or system auto-invokes)
   - Each stage progresses to next without manual prompting

4. Verify parallel agents in validation:
   - Stage 6 spawns 6 validation agents concurrently
   - Agents report findings in parallel
   - Validation completes in <60 seconds (vs 90s+ sequential)

**Pass Criteria**:

- [ ] Each stage transition occurs automatically or with clear next-step
      instruction
- [ ] Validation spawns 6 agents (verify in output: "Spawning validation agents:
      correctness, security, performance, test-quality, integration, standards")
- [ ] No manual intervention required between stages
- [ ] Parallel agents reduce validation time vs sequential baseline

#### Test 2C: Codex CLI Auto-Chain

**Steps**:

1. Start Codex CLI:

   ```bash
   codex
   ```

2. Invoke orchestrator:

   ```bash
   $ $0-business-scenario "Build a real-time notification system"
   ```

3. Monitor for auto-chain progression:
   - Codex executes skill and generates next-step instructions
   - Output suggests running `$ $1-gofer-research` (or auto-invokes)
   - Each stage progresses without user confirmation

**Pass Criteria**:

- [ ] Pipeline progresses through all 7 stages
- [ ] Each stage transition occurs within 5 seconds
- [ ] Output files generated in correct sequence
- [ ] No "user input required" prompts appear

---

### Scenario 3: Parallel Validation Agents (Acceptance Criteria 028-US3)

**Objective**: Verify 6 validation agents spawn concurrently in all platforms

**Setup**:

```bash
# Create sample feature for validation
mkdir -p /tmp/sample-feature
cd /tmp/sample-feature
cat > sample-file.ts << 'EOF'
export function calculateTotal(items: any[]): number {
  let total = 0;
  for (let item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
EOF
```

#### Test 3A: Claude Code CLI Parallel Validation

**Steps**:

1. Navigate to Gofer repo:

   ```bash
   cd /path/to/gofer
   ```

2. Invoke validation command:

   ```bash
   claude /6_gofer_validate "/tmp/sample-feature"
   ```

3. Monitor output for agent spawning:

   ```
   Spawning 6 validation agents in parallel:
   - Correctness Validator (checking logic correctness)
   - Security Validator (checking vulnerabilities)
   - Performance Validator (checking efficiency)
   - Test Quality Validator (checking test coverage)
   - Integration Validator (checking module integration)
   - Standards Validator (checking code standards)

   Waiting for agents to complete...
   ```

4. Measure execution time:
   - Start: Validation command invoked
   - End: All 6 agents complete and validation-report.md generated
   - Target: <60 seconds

5. Verify output:
   ```bash
   cat validation-report.md | head -30
   # Expected: 6 sections, one per agent + aggregated rubric score
   ```

**Pass Criteria**:

- [ ] 6 agents spawn concurrently (all appear in output immediately, not
      sequentially)
- [ ] Each agent completes within 30-50 seconds
- [ ] Total validation time <60 seconds (parallel) vs >90 seconds (sequential)
- [ ] validation-report.md contains 6 agent sections with rubric scores
- [ ] Rubric total = 100 points across all 6 agents

#### Test 3B: Copilot Chat Parallel Validation

**Steps**:

1. Open Copilot Chat
2. Run validation command:

   ```
   #6_gofer_validate "/tmp/sample-feature"
   ```

3. Monitor for parallel agent delegation:
   - Copilot message references "spawning 6 parallel agents"
   - Each agent section appears in response
   - Agents complete within 30-50 seconds each

4. Verify report structure:
   ```bash
   # Copy validation-report.md from Copilot Chat and verify:
   grep "^## Agent" validation-report.md | wc -l
   # Expected output: 6
   ```

**Pass Criteria**:

- [ ] Copilot spawns 6 agents using platform-specific delegation syntax
- [ ] Total validation time <60 seconds
- [ ] Report contains 6 agent sections with identical schema to Claude
- [ ] All rubric scores present and total 100

#### Test 3C: Codex CLI Parallel Validation

**Steps**:

1. Start Codex CLI and invoke validation:

   ```bash
   codex
   $ $6-gofer-validate "/tmp/sample-feature"
   ```

2. Verify parallel agent spawning:
   - Output shows 6 agents executing concurrently
   - Each agent completes within 30-50 seconds
   - Validation-report.md generated with 6 sections

**Pass Criteria**:

- [ ] 6 agents spawn in parallel (not sequential)
- [ ] Validation completes in <60 seconds
- [ ] Report structure matches Claude/Copilot

---

### Scenario 4: Conversation History Preservation (Acceptance Criteria 028-US4)

**Objective**: Verify conversation context persists when switching providers
mid-session

**Setup**:

```bash
# Create conversation tracking file
touch /tmp/conversation-log.txt
```

**Test Steps**:

1. **Start Claude CLI session** with context:

   ```bash
   claude
   ```

2. **Generate 10-message conversation**:

   ```
   # Message 1: Define authentication requirements
   /0_business_scenario "Build OAuth2 authentication for mobile app"

   # (Messages 2-9 auto-generated by pipeline stages)

   # Message 10: Custom question
   "What are the security implications of our token strategy?"
   ```

3. **Record message count**:

   ```bash
   # In Claude CLI, ask:
   "How many messages have we exchanged so far?"
   # Record answer: Should be 10
   ```

4. **Switch to Codex CLI** without losing context:

   ```bash
   exit  # Leave Claude session
   codex

   # Codex should load conversation history
   $ $gofer-research  # Codex references prior OAuth2 context
   ```

5. **Verify Codex can reference prior context**:

   ```bash
   "What did I say about token strategy in the previous message?"
   ```

6. **Record message count in Codex**:
   - Codex should report 10+ messages (original conversation + new Codex
     message)

7. **Switch back to Claude** and verify full history:

   ```bash
   exit  # Leave Codex
   claude

   "How many messages do we have including Codex interaction?"
   # Expected: 11+ (original 10 + Codex message)
   ```

**Pass Criteria**:

- [ ] Claude → Codex switch preserves message context (Codex can reference
      oauth2 requirements)
- [ ] Codex → Claude switch preserves full history (Claude shows 11+ message
      count)
- [ ] No "conversation cleared" or "context reset" messages appear
- [ ] Both CLIs show identical conversation content (allow format differences)
- [ ] User sees notification: "Switching to [provider] - conversation history
      preserved"

**Failure Modes**:

- "I don't have context about OAuth2" after switch → History preservation
  failed; check ProviderFactory.getConversationHistory()
- Message count drops after switch → History truncated; check normalization
  logic
- "Your API token expired" error → ProviderFactory needs to re-authenticate; run
  CLI auth commands

---

### Scenario 5: Default Provider Setting (Acceptance Criteria 028-US5)

**Objective**: Verify VSCode setting `gofer.defaultCLI` routes commands to
preferred platform

**Setup**:

```bash
# Open VSCode with Gofer repo
code /path/to/gofer

# Open VSCode Settings UI
# Command Palette (Cmd+Shift+P) > "Preferences: Open Settings (UI)"
```

**Test 5A: Auto-Detection Mode (Default)** **Steps**:

1. Verify setting value:

   ```json
   {
     "gofer.defaultCLI": "auto"
   }
   ```

2. Invoke Gofer command from VSCode:
   - Command Palette (Cmd+Shift+P)
   - Type: `Gofer: Run Business Scenario`
   - Enter scenario: "Build a feature"

3. Observe which CLI opens:
   - If Claude installed and authenticated: Opens Claude CLI
   - If Claude unavailable but Codex installed: Opens Codex CLI
   - If Codex unavailable but Copilot installed: Opens Copilot Chat

**Pass Criteria**:

- [ ] Command routes to highest-priority available CLI
- [ ] No configuration required (zero-config mode)
- [ ] Clear notification: "Using [CLI name] (auto-detected)"

**Test 5B: Explicit Codex Preference** **Steps**:

1. Change VSCode setting:

   ```json
   {
     "gofer.defaultCLI": "codex"
   }
   ```

2. Verify setting appears in UI:
   - Settings panel (Cmd+,)
   - Search: "gofer default"
   - Setting should show dropdown with four options: claude, copilot, codex,
     auto

3. Invoke command:
   - Command Palette > `Gofer: Run Business Scenario`
   - Enter scenario

4. Verify Codex is selected:
   - Codex CLI opens (not Claude, not Copilot)
   - Notification: "Using Codex CLI (user preference)"

**Pass Criteria**:

- [ ] Setting dropdown shows 4 options with descriptions
- [ ] Command routes to Codex regardless of auto-detection order
- [ ] No reload required after changing setting
- [ ] Confirmation notification displayed

**Test 5C: Unavailable Preference with Fallback** **Steps**:

1. Set preference:

   ```json
   {
     "gofer.defaultCLI": "copilot"
   }
   ```

2. (Temporarily) disable Copilot:
   - Stop Copilot CLI: `pkill -f copilot`

3. Invoke command:
   - Command Palette > Gofer command

4. Verify graceful fallback:
   - Error message: "Copilot CLI not found. Install from..."
   - Suggestion: "Use another provider? Click to switch to: Claude, Codex"
   - Clicking suggestion: Uses fallback provider

**Pass Criteria**:

- [ ] Clear error message with installation link
- [ ] Fallback suggestion provided (don't just fail)
- [ ] User can override preference without editing settings
- [ ] Error includes recovery steps

---

### Scenario 6: Command Availability Across Platforms (Acceptance Criteria 028-US6)

**Objective**: Verify all 18 Gofer commands accessible in all three platforms

**Codex Skill Availability**:

```bash
# List all Gofer skills in Codex
codex skills list | grep gofer | wc -l
# Expected output: 18

# Verify specific skills
codex skills list | grep -E "(research|specify|plan|tasks|implement|validate|summarize|hydrate|remember)"
```

**Copilot Prompt Availability**:

```bash
# List commands in VSCode Command Palette
# Cmd+Shift+P > "Gofer"
# Expected: 18 commands listed with descriptions

# Test prompt invocation
copilot chat "#0_business_scenario"
```

**Claude Command Availability** (Baseline):

```bash
# List commands in Claude
claude
# Expected: All 18 commands callable with / prefix
```

**Pass Criteria**:

- [ ] All 18 commands available in Codex skills list
- [ ] All 18 commands available in Copilot Chat (Cmd+Shift+P)
- [ ] All 18 commands available in Claude Code CLI
- [ ] Each command has description and correct syntax

**18 Commands Verification Checklist**:

- [ ] 0-business-scenario (orchestrator)
- [ ] 1-gofer-research
- [ ] 2-gofer-specify
- [ ] 3-gofer-plan
- [ ] 4-gofer-tasks
- [ ] 5-gofer-implement
- [ ] 6-gofer-validate
- [ ] 7-gofer-summarize (or equivalent)
- [ ] gofer-hydrate
- [ ] gofer-remember
- [ ] gofer-forget
- [ ] gofer-context
- [ ] gofer-config
- [ ] gofer-reset
- [ ] gofer-status
- [ ] gofer-update
- [ ] gofer-help
- [ ] gofer-version

---

## Automated Testing

### Test Execution

**Run full feature parity test suite**:

```bash
cd /path/to/gofer

# Run all cross-platform tests
npm test -- cross-platform-parity.test.ts

# Expected output:
# ✓ Command availability (18/18 commands in all platforms)
# ✓ Auto-chaining (7 stages execute sequentially)
# ✓ Parallel agents (6 agents spawn concurrently)
# ✓ Context preservation (history normalized across platforms)
# ✓ Output structure (research.md, spec.md schemas identical)
```

**Run platform-specific tests**:

```bash
# Claude Code CLI tests only
npm test -- cross-platform-parity.test.ts -t "claude"

# Codex CLI tests only
npm test -- cross-platform-parity.test.ts -t "codex"

# Copilot Chat tests only
npm test -- cross-platform-parity.test.ts -t "copilot"
```

**Run performance tests**:

```bash
# Measure parallel agent performance
npm test -- performance/validation-parallel.test.ts

# Expected output:
# Validation time (parallel): 45s ±10s
# Validation time (sequential baseline): 120s ±20s
# Speedup: 2.7x
# Parallel overhead: <5%
```

**Run unit tests for router and config**:

```bash
# Test CrossPlatformCommandRouter
npm test -- council/CrossPlatformCommandRouter.test.ts

# Test ConfigManager.getDefaultCLI()
npm test -- config.test.ts -t "getDefaultCLI"

# Test ProviderFactory with history preservation
npm test -- council/providers/ProviderFactory.test.ts -t "conversationHistory"
```

### Test Files Reference

| Test File                                               | Purpose                                     | Commands                                         |
| ------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| `tests/integration/cross-platform-parity.test.ts`       | End-to-end feature parity across platforms  | `npm test -- cross-platform-parity.test.ts`      |
| `tests/unit/council/CrossPlatformCommandRouter.test.ts` | Platform detection and routing logic        | `npm test -- CrossPlatformCommandRouter.test.ts` |
| `tests/unit/config.test.ts`                             | getDefaultCLI() getter                      | `npm test -- config.test.ts -t "default"`        |
| `tests/unit/council/providers/ProviderFactory.test.ts`  | Provider selection and history preservation | `npm test -- ProviderFactory.test.ts`            |
| `tests/performance/validation-parallel.test.ts`         | Parallel agent execution timing             | `npm test -- validation-parallel.test.ts`        |
| `tests/integration/auto-chaining.test.ts`               | 7-stage pipeline progression                | `npm test -- auto-chaining.test.ts`              |

### Interpreting Test Results

**Passing Output**:

```
PASS  tests/integration/cross-platform-parity.test.ts
  ✓ Platform detection: Claude Code CLI (45ms)
  ✓ Platform detection: Copilot Chat (38ms)
  ✓ Platform detection: Codex CLI (52ms)
  ✓ Command routing: Claude → .claude/commands/ (12ms)
  ✓ Command routing: Codex → .system/skills/ (14ms)
  ✓ Command routing: Copilot → .github/prompts/ (13ms)
  ✓ Auto-chaining: 7 stages in sequence (95s total)
  ✓ Parallel agents: 6 concurrent completion (48s)
  ✓ History preservation: Claude → Codex → Claude (42ms)
  ✓ Output structure: research.md schema consistent (8ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

**Failing Test Example**:

```
FAIL  tests/integration/cross-platform-parity.test.ts
  ✗ Command routing: Codex → .system/skills/ (15ms)
    Error: Expected 18 skills, found 12
    Expected .system/skills/0-business-scenario/SKILL.md
    Received: directory not found

    Diagnostics:
    - .system/skills/0-business-scenario: MISSING
    - .system/skills/1-gofer-research: OK
    - .system/skills/2-gofer-specify: OK
```

**Recovery Steps for Failing Tests**:

1. Check that all skill files exist: `ls -la .system/skills/*/SKILL.md | wc -l`
   (should be 18)
2. Verify YAML frontmatter:
   `head -3 .system/skills/0-business-scenario/SKILL.md`
3. Verify router implementation:
   `grep "detectPlatform" extension/src/council/CrossPlatformCommandRouter.ts`
4. Check VSCode settings file: `.vscode/settings.json` (must include
   `gofer.defaultCLI`)

---

## Key Files Reference

### Core Implementation Files

| File                                                  | Purpose                              | Testing Focus                                            |
| ----------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| `.system/skills/*/SKILL.md` (18 files)                | Codex CLI skill definitions          | Skill discovery, YAML format, auto-completion            |
| `.github/prompts/*.prompt.md` (18 files)              | Copilot Chat command definitions     | Auto-chain instructions, parallel agent syntax, metadata |
| `.claude/commands/*.md` (18 files)                    | Claude Code CLI commands (reference) | Baseline auto-chain behavior, agent spawning             |
| `extension/src/council/CrossPlatformCommandRouter.ts` | Platform detection and routing       | detectPlatform(), routeCommand(), fallback logic         |
| `extension/src/config.ts`                             | VSCode settings management           | getDefaultCLI() getter, CONFIG_KEYS entry                |
| `extension/package.json`                              | VSCode extension manifest            | gofer.defaultCLI setting with dropdown UI                |
| `extension/src/council/providers/ProviderFactory.ts`  | CLI provider selection               | getCLIProvider() respect defaultCLI setting              |
| `extension/src/autonomousCommands.ts`                 | Command execution pipeline           | Router wiring, context injection                         |
| `language-server/src/mcp/toolHandler.ts`              | Skill loading and discovery          | Multi-directory search (.claude/, .system/, .github/)    |
| `extension/src/mcpConfig.ts`                          | MCP server initialization            | Guard clauses for non-Claude providers                   |

### Validation Agent References

| Agent File                                  | Purpose                             | Validation Focus                                 |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `.claude/agents/validation-correctness.md`  | Functional correctness checks       | Logic, error handling, edge cases                |
| `.claude/agents/validation-security.md`     | Security vulnerability scanning     | Auth, data protection, compliance                |
| `.claude/agents/validation-performance.md`  | Performance and efficiency          | Latency, throughput, memory usage                |
| `.claude/agents/validation-test-quality.md` | Test coverage and authenticity      | Unit test quality, mock ratios, mutation testing |
| `.claude/agents/validation-integration.md`  | Integration and module interactions | Dependencies, API contracts, side effects        |
| `.claude/agents/validation-standards.md`    | Code style and standards compliance | Formatting, naming, patterns, consistency        |

### Configuration and Documentation

| File                                    | Purpose                                | Testing Impact                             |
| --------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `README.md`                             | Main documentation                     | Platform capability matrix, setup guides   |
| `docs/cross-platform-setup.md`          | Detailed setup guide for all platforms | Installation verification, troubleshooting |
| `docs/feature-028-capability-matrix.md` | Feature availability by platform       | Understanding which features work where    |
| `.vscode/settings.json`                 | VSCode workspace settings              | gofer.defaultCLI configuration             |
| `CLAUDE.md`                             | Codebase instructions                  | Release process, architecture patterns     |

---

## Common Issues & Troubleshooting

### Issue 1: Skill Not Found in Codex

**Symptom**:

```
$ $0-business-scenario "test"
Error: Skill '0-business-scenario' not found
```

**Root Causes & Fixes**:

1. **Skills not loaded on startup**
   - Fix: Run `codex reload` to force discovery
   - Verify: `codex skills list | grep gofer | wc -l` should show 18

2. **Missing .system/skills/ directory**
   - Fix: Verify directory exists: `ls -la .system/skills/`
   - Fix: Create if missing: `mkdir -p .system/skills`

3. **Skill file missing or malformed**
   - Fix: Check file exists: `ls .system/skills/0-business-scenario/SKILL.md`
   - Fix: Verify YAML frontmatter:
     ```bash
     head -5 .system/skills/0-business-scenario/SKILL.md
     # Expected: --- (3 lines) name and description
     ```

4. **Codex CLI outdated**
   - Fix: Update: `npm install -g @openai/codex-cli@latest`
   - Verify: `codex --version` should be 1.0+

---

### Issue 2: Auto-Chaining Breaks at Stage 3

**Symptom**:

```
# Stage 2 completes, then user sees:
"Specify stage complete. Ready for next stage?"
# Command waiting for user input instead of auto-invoking stage 3
```

**Root Causes & Fixes**:

1. **Auto-chain instructions missing from command file**
   - Fix: Verify `.claude/commands/2_gofer_specify.md` contains:
     ```markdown
     **AUTO-CHAIN (MANDATORY)**: You MUST immediately invoke the next pipeline
     stage by calling the Skill tool with skill="/3_gofer_plan"
     ```

2. **Platform-specific syntax incorrect**
   - For Claude: Check instruction uses `/3_gofer_plan` (slash prefix)
   - For Copilot: Check instruction uses `#3_gofer_plan` (hash prefix)
   - For Codex: Check instruction uses `$ $gofer-plan` (dollar syntax)
   - Fix: Update command file with correct syntax for your platform

3. **AI assistant ignoring instructions**
   - Cause: Instructions buried in output, not prominent
   - Fix: Move **AUTO-CHAIN** section to end of response
   - Fix: Use bold/italic formatting: `**MANDATORY**`

4. **Router not detecting correct platform**
   - Fix: Verify `gofer.defaultCLI` setting matches your platform
   - Fix: Check CrossPlatformCommandRouter logs (VSCode Output > Gofer)

---

### Issue 3: Conversation History Lost After Provider Switch

**Symptom**:

```
# In Claude:
"We discussed OAuth2 authentication earlier"

# Switch to Codex and ask:
"What authentication strategy did I mention?"
# Response: "I don't have prior context about this project"
```

**Root Causes & Fixes**:

1. **History preservation not implemented**
   - Fix: Verify `ProviderFactory.getConversationHistory()` called before switch
   - Fix: Verify `newProvider.setConversationHistory(history)` called after
     switch
   - Check: `extension/src/council/providers/ProviderFactory.ts:174` (Feature
     027 R1 remediation)

2. **History format incompatible**
   - Cause: Claude uses JSONL format, Codex uses JSON format
   - Fix: Ensure history normalization in ProviderFactory:
     ```typescript
     const normalizedHistory = convertToCommonFormat(claudeHistory);
     codexProvider.setConversationHistory(normalizedHistory);
     ```

3. **API keys not preserved across switch**
   - Cause: New provider can't authenticate to access history
   - Fix: Ensure both CLIs authenticated before switch
   - Fix: Verify API keys in: `~/.claude/config.json` and `~/.codex/config.json`

4. **MCP context lost (Claude → Codex)**
   - Cause: MCP servers only work in Claude
   - Fix: Expected behavior - show notification: "MCP context unavailable in
     Codex (MCP servers Claude-only)"
   - Fix: Non-MCP conversation content should still transfer

---

### Issue 4: Provider Detection Selects Wrong CLI

**Symptom**:

```
gofer.defaultCLI = "auto"
Command invoked → Opens Claude instead of Copilot (even though Copilot is running)
```

**Root Causes & Fixes**:

1. **Auto-detection precedence wrong**
   - Expected order: Claude > Codex > Copilot
   - Fix: Verify ProviderFactory.autoDetectCLI() checks in correct order
   - Check: `extension/src/council/providers/ProviderFactory.ts:287-309`

2. **Multiple CLIs installed, detection ambiguous**
   - Fix: Explicitly set preference: `gofer.defaultCLI` = "copilot"
   - Fix: Disable other CLIs or verify detection logic:
     `grep "autoDetectCLI" extension/src/council/providers/ProviderFactory.ts`

3. **Execution context not reliable**
   - Cause: Can't distinguish Copilot Chat from Codex CLI reliably
   - Fix: Use `gofer.defaultCLI` setting instead of relying on auto-detection
   - Fix: Check Detection Logic section in CrossPlatformCommandRouter

4. **VSCode extension host check failing**
   - Fix: Verify `vscode.env` is accessible: Check extension Output panel
   - Fix: Verify `.claude/` directory detection:
     `test -d .claude && echo "Found" || echo "Not found"`

---

### Issue 5: Parallel Validation Agents Don't Spawn

**Symptom**:

```
Running /6_gofer_validate...
# Single agent runs (sequential instead of parallel)
# Takes 120+ seconds instead of 45-60 seconds
```

**Root Causes & Fixes**:

1. **Agent spawn instructions missing**
   - Fix: Verify `.claude/commands/6_gofer_validate.md` contains:

     ```markdown
     Task: subagent_type="validation-correctness", model="sonnet" Task:
     subagent_type="validation-security", model="sonnet"

     # ... (6 total Task definitions)
     ```

2. **Task tool not recognized by platform**
   - For Copilot: Ensure parallel agent delegation syntax used (not Task tool)
   - For Codex: Ensure concurrent sub-prompt syntax used
   - Fix: Update command file with platform-specific agent syntax

3. **Agent files missing**
   - Fix: Verify 6 agent files exist:
     ```bash
     ls -la .claude/agents/validation-*.md | wc -l
     # Expected: 6
     ```

4. **AI assistant not spawning agents**
   - Cause: Instructions not clear enough
   - Fix: Make agent spawn mandatory: Use `**MUST spawn 6 agents**` (not
     optional)
   - Fix: Add examples showing exact syntax for platform

5. **Agents running sequentially despite instructions**
   - Cause: Platform doesn't support true parallelism
   - Workaround for Copilot 2026+: Use multi-agent delegation API
   - Workaround for Codex: Use concurrent subprocess invocations
   - Check: Copilot version ≥ 2.0 (`copilot --version`)

---

### Issue 6: Skill Invocation Syntax Wrong for Platform

**Symptom**:

```
# Expected for Codex: $ $0-business-scenario
# But trying: /0-business-scenario (Claude syntax)
# Error: "Command not found" or "invalid syntax"
```

**Fix by Platform**:

| Platform     | Correct Syntax           | Wrong Syntax             | Fix                                    |
| ------------ | ------------------------ | ------------------------ | -------------------------------------- |
| Claude Code  | `/0_business_scenario`   | `$0_business_scenario`   | Use slash (/) prefix                   |
| Copilot Chat | `#0_business_scenario`   | `/0_business_scenario`   | Use hash (#) prefix                    |
| Codex CLI    | `$ $0-business-scenario` | `$ /0-business-scenario` | Use dollar ($) prefix, hyphenate names |

**Route Verification**:

```bash
# Verify CrossPlatformCommandRouter detects platform correctly
# Enable debug logging in VSCode:
# 1. Command Palette > "Developer: Set Log Level"
# 2. Select "Debug"
# 3. VSCode Output > Gofer panel should show:
#    "Platform detection: Codex CLI (reason: .system/skills/ directory detected)"
```

---

### Issue 7: Default Provider Setting Not Taking Effect

**Symptom**:

```
gofer.defaultCLI = "codex" (in settings.json)
Command invoked → Still opens Claude instead
```

**Fixes**:

1. **Setting not saved**
   - Fix: Verify `.vscode/settings.json` contains:
     ```json
     {
       "gofer.defaultCLI": "codex"
     }
     ```

2. **VSCode cache not cleared**
   - Fix: Reload extension (Cmd+Shift+P > "Developer: Reload Window")
   - Fix: Close and reopen VSCode

3. **Setting name wrong**
   - Fix: Verify setting is `gofer.defaultCLI` (not `gofer.defaultProvider` or
     `gofer.cli`)
   - Fix: Check package.json for setting definition:
     ```bash
     grep -A5 "gofer.defaultCLI" extension/package.json
     ```

4. **ConfigManager.getDefaultCLI() not implemented**
   - Fix: Verify getter exists in `extension/src/config.ts`:
     ```bash
     grep "getDefaultCLI()" extension/src/config.ts
     ```

5. **ProviderFactory not checking setting**
   - Fix: Verify `getCLIProvider()` respects `getDefaultCLI()`:
     ```bash
     grep "getDefaultCLI()" extension/src/council/providers/ProviderFactory.ts
     ```

---

## Performance Baselines

### Expected Execution Times

| Scenario                                      | Target | Pass/Fail Threshold |
| --------------------------------------------- | ------ | ------------------- |
| Single command (e.g., `$0-business-scenario`) | <10s   | >15s = FAIL         |
| Full pipeline auto-chain (7 stages)           | <120s  | >150s = FAIL        |
| Parallel validation (6 agents concurrent)     | <60s   | >90s = FAIL         |
| Provider switch (history preservation)        | <5s    | >10s = FAIL         |
| Skill discovery on CLI startup                | <3s    | >5s = FAIL          |
| Command routing decision                      | <100ms | >500ms = FAIL       |

### Measuring Performance

**Auto-Chain Timing**:

```bash
# Measure end-to-end pipeline time
time claude /0_business_scenario "Build a feature"

# Expected output:
# real    2m15s  (135 seconds) → PASS (< 150s threshold)
```

**Parallel Validation Timing**:

```bash
# Compare parallel vs sequential
# Parallel (default):
time claude /6_gofer_validate /path/to/feature
# Expected: 45-60 seconds

# Sequential (disable parallel agents):
time claude /6_gofer_validate --sequential /path/to/feature
# Expected: 120-150 seconds

# Performance gain (speedup):
# 120 / 60 = 2x faster with parallel agents
```

**Provider Switch Latency**:

```bash
# Time provider detection + switch
# Enable verbose logging, measure "Switching to [provider]" log timestamp
```

---

## Validation Checklist

Use this checklist to track manual testing progress:

### Pre-Test Setup

- [ ] All 3 CLIs installed (Claude, Copilot, Codex)
- [ ] All 3 CLIs authenticated
- [ ] VSCode extension built and installed
- [ ] Gofer repo cloned locally
- [ ] Node.js 18+ installed
- [ ] Test environment prepared (test files, directories)

### Scenario Tests

- [ ] Scenario 1: Codex Skill Discovery (18 skills found)
- [ ] Scenario 2A: Claude Auto-Chain (7 stages, <120s)
- [ ] Scenario 2B: Copilot Auto-Chain (7 stages, <120s)
- [ ] Scenario 2C: Codex Auto-Chain (7 stages, <120s)
- [ ] Scenario 3A: Claude Parallel Agents (6 agents, <60s)
- [ ] Scenario 3B: Copilot Parallel Agents (6 agents, <60s)
- [ ] Scenario 3C: Codex Parallel Agents (6 agents, <60s)
- [ ] Scenario 4: History Preservation (Claude → Codex → Claude)
- [ ] Scenario 5A: Default Setting Auto-Mode
- [ ] Scenario 5B: Default Setting Explicit (Codex)
- [ ] Scenario 5C: Fallback when CLI Unavailable
- [ ] Scenario 6: All 18 Commands Available in All Platforms

### Automated Tests

- [ ] `npm test -- cross-platform-parity.test.ts` (all pass)
- [ ] `npm test -- performance/validation-parallel.test.ts` (all pass)
- [ ] `npm test -- council/CrossPlatformCommandRouter.test.ts` (all pass)
- [ ] `npm test -- config.test.ts -t "default"` (all pass)

### Bug Reproduction (if issues found)

- [ ] Issue 1: Skill Not Found (reproduced and fixed)
- [ ] Issue 2: Auto-Chain Breaks (reproduced and fixed)
- [ ] Issue 3: History Lost (reproduced and fixed)
- [ ] Issue 4: Wrong CLI Selected (reproduced and fixed)
- [ ] Issue 5: Parallel Agents Don't Spawn (reproduced and fixed)
- [ ] Issue 6: Syntax Wrong (reproduced and fixed)
- [ ] Issue 7: Setting Ignored (reproduced and fixed)

### Documentation Review

- [ ] README.md includes capability matrix
- [ ] Platform-specific setup guides exist (Claude, Copilot, Codex)
- [ ] Troubleshooting section complete
- [ ] All 18 commands documented

---

## Sign-Off

**Testing Complete**: Date \***\*\_\*\***

**Tester Name**: \***\*\*\*\*\***\_\***\*\*\*\*\***

**Scenarios Passed**: **\_** / 18

**Issues Found**: **\_** (Critical: **_ | Major: _** | Minor: \_\_\_)

**Notes**:

```
[Space for additional findings, edge cases, platform-specific notes]
```

**Recommendation**: ☐ Ready for Release | ☐ Needs Fixes | ☐ Blockers Found

---

## Next Steps After Testing

1. **If all tests pass**:
   - Mark feature as "Ready for Implementation"
   - Begin coding Codex skills and Copilot enhancements
   - Run release pipeline:
     `./release-auto.sh patch "Implement cross-platform parity"`

2. **If issues found**:
   - File GitHub issues with reproduction steps (use "Issue 1-7" template)
   - Assign to implementation team
   - Re-test after fixes
   - Run regression tests: `npm test`

3. **Post-Release**:
   - Monitor GitHub issues for 30 days (user reports)
   - Collect telemetry on `gofer.defaultCLI` setting usage
   - Gather feedback on cross-platform experience
   - Plan feature enhancements (future improvements)
