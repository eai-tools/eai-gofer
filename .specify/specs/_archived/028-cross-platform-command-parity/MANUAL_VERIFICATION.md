# Feature 028: Manual Verification Checklist

Complete these manual verification tasks to validate cross-platform command
parity.

## Prerequisites

1. Install all three AI CLIs:

   ```bash
   # Claude Code CLI
   npm install -g @anthropic-ai/claude-code

   # GitHub Copilot Chat (VSCode extension)
   # Install from VSCode marketplace

   # OpenAI Codex CLI
   npm install -g @openai/codex-cli
   ```

2. Configure API keys in VSCode settings:
   - `gofer.anthropicApiKey` - Your Anthropic API key
   - `gofer.openaiApiKey` - Your OpenAI API key

3. Initialize Gofer repository:
   - Run: `Gofer: Initialize Repository` from Command Palette
   - Verify `.claude/commands/`, `.github/prompts/`, `.system/skills/` exist

---

## T094: Codex CLI Routing Verification

**Goal**: Verify setting `gofer.defaultCLI` to "codex" routes commands to Codex
skills

**Steps**:

1. Open VSCode Settings (`Cmd/Ctrl+,`)
2. Search for "gofer.defaultCLI"
3. Set value to **"codex"**
4. Reload VSCode window (`Developer: Reload Window`)
5. In Codex CLI, run: `:1_gofer_research Test feature`
6. Verify command executes from `.system/skills/1-gofer-research/SKILL.md`

**Verification**:

- [ ] Command routes to Codex skill (check terminal output)
- [ ] Skill file path shown in logs: `.system/skills/1-gofer-research/`
- [ ] No errors about missing Claude commands

**Expected Behavior**: Codex should execute the skill and show "Running skill:
1-gofer-research"

---

## T095: Copilot Chat Routing Verification

**Goal**: Verify setting `gofer.defaultCLI` to "copilot" routes commands to
Copilot prompts

**Steps**:

1. Open VSCode Settings
2. Set `gofer.defaultCLI` to **"copilot"**
3. Reload VSCode window
4. Open Copilot Chat panel
5. Run: `#1_gofer_research Test feature` or
   `@gofer /1_gofer_research Test feature`
6. Verify command executes from `.github/prompts/1_gofer_research.prompt.md`

**Verification**:

- [ ] Command routes to Copilot prompt
- [ ] Prompt file loaded: `.github/prompts/1_gofer_research.prompt.md`
- [ ] Copilot responds with research output

**Expected Behavior**: Copilot should execute the prompt and show research
results

---

## T096: Auto-Detection Verification

**Goal**: Verify "auto" setting detects which CLI is active

**Steps**:

1. Open VSCode Settings
2. Set `gofer.defaultCLI` to **"auto"**
3. Reload VSCode window
4. Test each CLI:
   - Claude Code: Run `/1_gofer_research` in Claude chat
   - Copilot: Run `#1_gofer_research` in Copilot chat
   - Codex: Run `:1_gofer_research` in Codex terminal
5. Verify each routes to correct platform

**Verification**:

- [ ] Claude Code routes to `.claude/commands/`
- [ ] Copilot Chat routes to `.github/prompts/`
- [ ] Codex CLI routes to `.system/skills/`
- [ ] No cross-platform routing errors

**Expected Behavior**: Auto-detection should choose the active CLI's command
directory

---

## T097: Auto-Chaining Pipeline Verification

**Goal**: Verify orchestrator command auto-chains through all 7 stages

**Steps**:

1. Set `gofer.defaultCLI` to **"claude"** (Claude has full auto-chain support)
2. Reload VSCode window
3. In Claude Code chat, run:
   ```
   /0_business_scenario Add simple user registration form
   ```
4. Watch pipeline execute automatically:
   - Stage 1: Research codebase
   - Stage 2: Create specification
   - Stage 3: Generate plan
   - Stage 4: Create tasks
   - Stage 5: Implement code
   - Stage 6: Validate implementation
   - Stage 7: Engineering review

**Verification**:

- [ ] All 7 stages execute without manual intervention
- [ ] Each stage completes and auto-invokes next stage
- [ ] Final output: validation-report.md and engineering-review-report.md
- [ ] Total pipeline time: <5 minutes for simple feature

**Expected Behavior**: Pipeline should auto-chain through all stages, creating
artifacts in `.specify/specs/{feature}/`

**Note**: For Copilot pre-2026, stages must be run manually. For Codex,
auto-chaining works via skill dependencies.

---

## T098: Parallel Agent Spawning Verification

**Goal**: Verify validation command spawns 6 agents in parallel

**Steps**:

1. Create a test feature with implementation:
   ```bash
   mkdir -p .specify/specs/test-validation/
   # Add spec.md, plan.md, tasks.md
   ```
2. Set `gofer.defaultCLI` to **"claude"**
3. Run validation: `/6_gofer_validate test-validation`
4. Monitor VSCode Output panel (select "Gofer" channel)
5. Check for parallel agent spawning

**Verification**:

- [ ] 6 validation agents spawn concurrently:
  - validation-correctness
  - validation-security
  - validation-performance
  - validation-test-quality
  - validation-integration
  - validation-standards
- [ ] Total validation time: <60 seconds
- [ ] All 6 agent reports generated in parallel

**Expected Behavior**: Output panel should show "Spawning 6 validation agents in
parallel..." and complete in <60s

**Log Check**:

```bash
# Check logs for parallel execution
grep -r "validation agent" .specify/logs/
```

---

## T099: Conversation History Preservation Verification

**Goal**: Verify conversation history preserved when switching providers

**Steps**:

1. Start in Claude Code CLI
2. Have a conversation (10+ messages):
   ```
   /1_gofer_research User authentication
   # Wait for response
   What security patterns did you find?
   # Continue conversation...
   ```
3. Switch to Codex CLI:
   - Open VSCode Settings
   - Set `gofer.defaultCLI` to **"codex"**
   - Reload VSCode window
4. In Codex, reference earlier conversation:
   ```
   :2_gofer_specify Use the security patterns we just discussed
   ```
5. Switch back to Claude:
   - Set `gofer.defaultCLI` to **"claude"**
   - Reload VSCode window
6. Verify full context preserved

**Verification**:

- [ ] Codex can reference Claude conversation ("the security patterns we
      discussed")
- [ ] Claude remembers full history after switch
- [ ] No credential leakage in preserved history (API keys redacted)
- [ ] Conversation context intact across Claude → Codex → Claude

**Expected Behavior**: Each CLI should have full context from previous provider

**Log Check**:

```bash
# Verify credential redaction
grep -r "REDACTED" .specify/logs/
```

---

## T100: MCP Initialization Skip Verification

**Goal**: Verify MCP initialization skipped for Codex (log message present)

**Steps**:

1. Set `gofer.defaultCLI` to **"codex"**
2. Reload VSCode window
3. Open Output panel (`Cmd/Ctrl+Shift+U`)
4. Select "Gofer" channel from dropdown
5. Look for MCP skip message

**Verification**:

- [ ] Log message: "Skipping MCP setup - Codex CLI does not support MCP servers"
- [ ] No MCP server initialization errors
- [ ] `.vscode/mcp.json` NOT created/updated for Codex
- [ ] Extension activates successfully without MCP

**Expected Behavior**: Gofer should log that MCP is skipped for Codex, but
continue initialization

**Log Location**: VSCode Output panel → "Gofer" channel

---

## T101: Settings UI Dropdown Verification

**Goal**: Verify Settings UI shows dropdown with descriptions

**Steps**:

1. Open VSCode Settings UI (`Cmd/Ctrl+,`)
2. Search for "gofer.defaultCLI"
3. Click the dropdown
4. Verify options and descriptions

**Verification**:

- [ ] Dropdown shows 4 options:
  - "Use Claude Code CLI for all Gofer commands"
  - "Use GitHub Copilot Chat for all Gofer commands"
  - "Use OpenAI Codex CLI for all Gofer commands"
  - "Auto-detect which CLI is installed and active"
- [ ] Default value is "Auto-detect"
- [ ] Markdown description visible below dropdown
- [ ] Description explains platform directories (.claude/, .github/, .system/)

**Expected Behavior**: Settings UI should show rich dropdown with helpful
descriptions

**Screenshot**: Take screenshot and attach to verification report

---

## T102: Capability Matrix Rendering Verification

**Goal**: Verify capability matrix in README renders correctly

**Steps**:

1. Open `README.md` in VSCode
2. Enable Markdown preview (`Cmd/Ctrl+K V`)
3. Scroll to "Platform Capabilities" section
4. Verify table rendering

**Verification**:

- [ ] Table has 11 feature rows:
  - All 16 Gofer commands
  - Auto-chaining pipeline
  - Command output artifacts
  - MCP server integration
  - Parallel agent spawning
  - Conversation preservation
  - Context health monitoring
  - Autonomous mode execution
  - Validation time
  - Auto-chain overhead
  - Context window
- [ ] Table has 3 platform columns: Claude Code, Copilot Chat, Codex CLI
- [ ] Emoji indicators render correctly: ✅ ⚠️ ✗
- [ ] Footnotes (1-5) link correctly
- [ ] Setup guide links work: [Claude](docs/setup-claude-code.md)

**Expected Behavior**: Markdown preview should show formatted table with emojis
and working links

**Visual Check**: Compare rendered table with expected layout in tasks.md

---

## Final Verification Checklist

After completing all manual tests:

- [ ] T094: Codex routing verified
- [ ] T095: Copilot routing verified
- [ ] T096: Auto-detection verified
- [ ] T097: Auto-chaining pipeline verified (7 stages)
- [ ] T098: Parallel agents verified (6 concurrent, <60s)
- [ ] T099: Conversation preservation verified (Claude↔Codex↔Claude)
- [ ] T100: MCP skip message verified
- [ ] T101: Settings UI dropdown verified
- [ ] T102: Capability matrix rendering verified

**Overall Status**: [ ] All manual verification tasks complete

---

## Reporting Issues

If any verification fails:

1. Document exact steps to reproduce
2. Capture screenshots/logs
3. Note VSCode version, platform, CLI versions
4. Create GitHub issue: https://github.com/eai-tools/eai-gofer/issues
5. Tag with `feature-028` and `verification-failure`

---

## Performance Targets (from spec.md)

- ✅ Auto-chain overhead: <5s per stage transition
- ✅ Validation time: <60s with parallel agents (vs 90-120s sequential)
- ✅ Platform detection: Cached (60s TTL)
- ✅ Skill loading: <500ms

All automated performance tests passed (7/7 in validation-parallel.test.ts).
