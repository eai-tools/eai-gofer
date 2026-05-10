---
date: 2026-03-18T18:35:00Z
researcher: Claude
feature: 'Cross-Platform Command Parity'
status: complete
---

# Research: Cross-Platform Command Parity

## Feature Summary

Enable complete feature parity for all 18 Gofer commands (`/0_business_scenario`
through `/gofer_hydrate`) across three AI platforms: Claude Code CLI, GitHub
Copilot Chat, and Codex CLI. Currently only Claude Code CLI has full support via
`.claude/commands/*.md` skills with auto-chaining pipeline and parallel agent
spawning. This feature will create `.system/skills/` directory for Codex CLI and
enhance `.github/prompts/` for Copilot Chat to achieve identical functionality
across all platforms, including auto-chaining, parallel validation agents,
conversation history preservation, and default provider selection.

## Codebase Analysis

### Where to Implement

| Component                      | Location                                              | Purpose                                                         |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------- |
| Codex Skills (NEW)             | `.system/skills/*.skill.md` (18 files)                | Create Codex-compatible skill files with SKILL.md format        |
| Copilot Prompts (ENHANCE)      | `.github/prompts/*.prompt.md` (18 existing files)     | Enhance with simulated Task tool and auto-chain instructions    |
| Default Provider Setting (NEW) | `extension/package.json:441-700`                      | Add `gofer.defaultCLI` VSCode setting                           |
| ConfigManager Getter (NEW)     | `extension/src/config.ts:125-402`                     | Add `getDefaultCLI()` method                                    |
| Cross-Platform Router (NEW)    | `extension/src/council/CrossPlatformCommandRouter.ts` | Detect platform and route to appropriate command implementation |
| Feature Parity Tests (NEW)     | `tests/integration/cross-platform-parity.test.ts`     | Verify identical behavior across platforms                      |

### Existing Patterns to Follow

#### Pattern 1: Claude Code Skill Format

**Found in**: `.claude/commands/0_business_scenario.md:1-7`

```markdown
---
description: Triage business scenario and orchestrate the unified Gofer pipeline
---

# Gofer Orchestrator

You are the Gofer orchestrator. Your job is to understand the user's business
scenario and route them through the **unified Gofer pipeline**.
```

**Why relevant**: This is the reference implementation. All 18 commands follow
this minimal frontmatter pattern with `description` only. Body contains
instructions for the AI to follow.

#### Pattern 2: Auto-Chaining Instructions

**Found in**: `.claude/commands/1_gofer_research.md:335-340`

```markdown
**AUTO-CHAIN (MANDATORY)**: You MUST immediately invoke the next pipeline stage
by calling the Skill tool with skill="/2_gofer_specify". Do NOT ask the user for
confirmation. Do NOT output "Ready for next stage". Just invoke the skill NOW.
```

**Why relevant**: Every pipeline stage ends with auto-chain instructions. This
enables seamless flow through 7 stages without user intervention. Must be
replicated in Codex/Copilot versions.

#### Pattern 3: Parallel Agent Spawning

**Found in**: `.claude/commands/6_gofer_validate.md:135-200`

```markdown
## Step 2: Spawn 6 Specialist Validation Agents

**CRITICAL**: You **MUST** launch these agents using the Task tool. Do NOT
perform validation work inline in the main context.

### Agent 1: Correctness Validator

Task: subagent_type="validation-correctness", model="sonnet"

### Agent 2: Security Validator

Task: subagent_type="validation-security", model="sonnet"

### Agent 3: Performance Validator

Task: subagent_type="validation-performance", model="haiku"

### Agent 4: Test Quality Validator

Task: subagent_type="validation-test-quality", model="haiku"

### Agent 5: Integration Validator

Task: subagent_type="validation-integration", model="sonnet"

### Agent 6: Standards Validator

Task: subagent_type="validation-standards", model="haiku"
```

**Why relevant**: Validation stage spawns 6 agents in parallel for comprehensive
quality checks. This is a critical feature that must work identically across
platforms. GitHub Copilot Chat (2026) now supports parallel agents per web
research.

#### Pattern 4: Copilot Prompt Metadata

**Found in**: `.github/prompts/0_business_scenario.prompt.md:1-7`

```yaml
---
name: 0_business_scenario
description: Triage business scenario and orchestrate the unified Gofer pipeline
agent: agent
tools: ['search/codebase', 'terminal', 'editFile', 'runCommand']
argument-hint: Describe the business scenario or feature you want to build
---
```

**Why relevant**: Copilot Chat requires declarative metadata: `name`,
`description`, `agent` type, explicit `tools` list, `argument-hint`. Must
maintain this structure while adding auto-chain and Task tool simulation.

#### Pattern 5: Provider Factory Pattern

**Found in**: `extension/src/council/providers/ProviderFactory.ts:40-390`

```typescript
// Lines 287-309: Auto-detect available CLI
public async autoDetectCLI(): Promise<'claude' | 'codex' | null> {
  const { CLIHealthChecker } = await import('./cli/CLIHealthChecker');
  const config = vscode.workspace.getConfiguration('gofer');

  // Check Claude first (preferred)
  const claudeCommand = config.get<string>('claudeCodeCommand', 'claude');
  const claudeResult = await CLIHealthChecker.check('claude', claudeCommand);

  if (claudeResult.available && claudeResult.authenticated && claudeResult.compatible) {
    return 'claude';
  }

  // Check Codex second
  const codexCommand = config.get<string>('codexCommand', 'codex');
  const codexResult = await CLIHealthChecker.check('codex', codexCommand);

  if (codexResult.available && codexResult.authenticated && codexResult.compatible) {
    return 'codex';
  }

  return null;
}
```

**Why relevant**: This auto-detection pattern from Feature 027 should be
extended to include platform detection (Claude Code vs Copilot Chat vs Codex
CLI) for command routing.

#### Pattern 6: VSCode Settings with Enum

**Found in**: `extension/package.json:496-505`

```json
"gofer.cliProvider": {
  "type": "string",
  "enum": ["claude", "codex", "auto"],
  "enumDescriptions": [
    "Use Claude Code CLI",
    "Use Codex CLI",
    "Auto-detect installed CLI"
  ],
  "default": "auto",
  "description": "AI CLI provider for autonomous mode",
  "order": 50
}
```

**Why relevant**: Same pattern should be used for `gofer.defaultCLI` setting.
Dropdown UI, enum descriptions, default to "auto", order field for grouping.

### Integration Points

1. **VSCode Extension Entry Point** (`extension/src/extension.ts:115-230`)
   - Register new `gofer.defaultCLI` setting watcher
   - Initialize CrossPlatformCommandRouter on extension activation
   - Wire router to autonomous command handlers

2. **ConfigManager** (`extension/src/config.ts:125-402`)
   - Add `getDefaultCLI()` getter method
   - Add CONFIG_KEYS entry for `gofer.defaultCLI`
   - Add DEFAULTS entry with `'auto'` default

3. **ProviderFactory**
   (`extension/src/council/providers/ProviderFactory.ts:40-390`)
   - Extend `getCLIProvider()` to use `defaultCLI` setting
   - Update auto-detection to respect user preference
   - Preserve conversation history across provider switches (R1 from
     Feature 027)

4. **Autonomous Commands** (`extension/src/autonomousCommands.ts:968-1100`)
   - Wire CrossPlatformCommandRouter to command execution
   - Route skill invocations to appropriate platform directory
   - Maintain context injection for all platforms

5. **MCP Tool Handler** (`language-server/src/mcp/toolHandler.ts`)
   - Update skill loading logic to check multiple directories
   - Priority: `.claude/commands/` > `.system/skills/` > `.github/prompts/`
   - Return appropriate format based on detected platform

### Related Code

- `extension/src/council/providers/cli/CLIProviderAdapter.ts:53-300` - Base
  class for CLI execution
- `extension/src/council/providers/cli/CLIHealthChecker.ts:36-95` - Health
  checks and error messages
- `extension/src/council/providers/cli/ClaudeCodeCLIProvider.ts:20-100` - Claude
  CLI implementation
- `extension/src/council/providers/cli/CodexCLIProvider.ts:20-100` - Codex CLI
  implementation
- `.claude/agents/validation-*.md` - 6 validation agents that spawn in parallel
- `tests/unit/council/providers/cli/CLIProviderAdapter.test.ts:1-80` - Test
  patterns for CLI providers

## Technology Decisions

### Decision 1: Codex CLI Skill File Format

**Choice**: Use Codex `.system/skills/` directory structure with `SKILL.md`
files

**Rationale**:

- [OpenAI Codex Skills Documentation](https://developers.openai.com/codex/skills)
  specifies `.system/skills/` for auto-loaded skills
- [Codex CLI Skills Guide](https://github.com/openai/codex/blob/main/docs/skills.md)
  defines SKILL.md format with YAML frontmatter
- Format: `name` and `description` in frontmatter, instructions in body
- Directory structure: `.system/skills/skill-name/SKILL.md` (+ optional
  `scripts/`, `references/`, `assets/`)
- Skills invoked via `$skill-name` syntax (e.g., `$gofer-research`)
- Codex pre-loads metadata at startup for skill selection without loading full
  content

**Alternatives considered**:

- `.github/prompts/` format: Not recognized by Codex CLI
- Custom JSON format: Would require Codex CLI modification (not feasible)
- Inline prompts: No reusability, defeats purpose of skills

**Implementation Notes**:

- Each Gofer command becomes a skill directory:
  `.system/skills/0-business-scenario/SKILL.md`
- Frontmatter maps from Claude format:
  ```yaml
  ---
  name: 0-business-scenario
  description:
    Triage business scenario and orchestrate the unified Gofer pipeline
  ---
  ```
- Body reuses Claude command markdown with platform-specific adaptations
- No `scripts/` needed initially (pure instruction-based commands)

### Decision 2: GitHub Copilot Chat Parallel Agent Simulation

**Choice**: Enhance `.github/prompts/` with simulated Task tool and parallel
execution instructions

**Rationale**:

- [GitHub Copilot CLI Parallel Execution (2026)](https://winbuzzer.com/2026/01/16/github-copilot-cli-gains-specialized-agents-parallel-execution-and-smarter-context-management-xcxwbn/)
  confirms Copilot CLI now supports parallel agents
- [GitHub Copilot Coding Agent](https://github.blog/news-insights/product-news/github-copilot-meet-the-new-coding-agent/)
  introduces multi-agent orchestration
- Copilot can now run multiple agents simultaneously instead of sequentially
  (90s → 30s improvement cited)
- Custom agents supported via `.github/agents` configuration
- Prompts can delegate to specialized agents via MCP

**Alternatives considered**:

- Manual step-by-step workflow (current state): Poor UX, breaks feature parity
- Wait for native Task tool support: Unknown timeline, blocks feature completion
- External orchestration script: Added complexity, not integrated with AI
  context

**Implementation Strategy**:

1. Add "Parallel Agent Spawning Instructions" section to validation command:

   ```markdown
   ## For Copilot Chat Users

   Copilot CLI supports parallel agent execution. Spawn 6 agents concurrently:

   1. Open 6 parallel Copilot sessions (or use Copilot's multi-agent delegation)
   2. Assign each session a validation category
   3. Agents report findings to main session
   4. Synthesize results into validation-report.md
   ```

2. Leverage Copilot's native delegation features (`.github/agents` config)
3. Maintain backward compatibility with manual workflow for older Copilot
   versions

### Decision 3: Auto-Chaining Mechanism for Copilot/Codex

**Choice**: Embed explicit auto-chain instructions in each stage's command file

**Rationale**:

- Claude Code relies on AI following instructions to invoke next skill
- Same instruction-based pattern can work for Copilot and Codex
- No server-side enforcement needed
- Maintains consistency with existing Claude implementation

**Alternatives considered**:

- Server-side chain enforcement: Would require modifying VSCode extension,
  increases complexity
- User confirmation at each stage: Breaks feature parity, poor UX
- Separate orchestrator script: AI loses context between stages

**Implementation**:

```markdown
## AUTO-CHAIN (Cross-Platform)

**For Claude Code**: Invoke Skill tool with skill="/2_gofer_specify" **For
Copilot Chat**: Type `/2_gofer_specify` in next message **For Codex CLI**: Run
`$ $gofer-specify` or let Codex auto-select next skill
```

### Decision 4: Default Provider Selection

**Choice**: Add `gofer.defaultCLI` VSCode setting with dropdown UI

**Rationale**:

- Follows existing `gofer.cliProvider` pattern from Feature 027
- VSCode settings dropdown is most discoverable UI
- Integrates with existing ConfigManager and ProviderFactory
- Supports `'auto'` mode for backward compatibility
- Immediate effect without VSCode reload (proven in Feature 027)

**Alternatives considered**:

- Command Palette picker on first use: Good for one-time choice, but hidden for
  later changes
- First-run wizard: Complex to implement, modal UI interrupts workflow
- Prompt on each command: Annoying, breaks automation
- Environment variable: Less discoverable, not platform-agnostic

**Implementation**:

```json
"gofer.defaultCLI": {
  "type": "string",
  "enum": ["claude", "copilot", "codex", "auto"],
  "default": "auto",
  "description": "Default AI platform for Gofer commands"
}
```

Note: Add "copilot" option to distinguish GitHub Copilot Chat from Copilot CLI +
Codex

### Decision 5: Feature Parity Test Strategy

**Choice**: Integration tests that execute commands in all three platforms and
compare outputs

**Rationale**:

- User Story 2 Acceptance Criteria requires "identical behavior" verification
  (discovery.md:58)
- Must test auto-chaining, parallel agents, context preservation
- Integration tests can spawn actual CLI processes or mock them
- Compare output artifacts (research.md, spec.md, validation-report.md) for
  structural equivalence

**Alternatives considered**:

- Unit tests only: Don't verify end-to-end behavior
- Manual testing: Not repeatable, doesn't scale
- Smoke tests only: Insufficient for "identical" claim

**Test Categories**:

1. **Command Availability Tests**: Verify all 18 commands callable in each
   platform
2. **Auto-Chain Tests**: Verify `/0_business_scenario` progresses through 7
   stages automatically
3. **Parallel Agent Tests**: Verify `/6_gofer_validate` spawns 6 agents
   concurrently
4. **Context Preservation Tests**: Verify provider switching mid-session
   maintains conversation
5. **Output Structure Tests**: Verify research.md, spec.md, etc. have identical
   schemas

## Constraints & Considerations

### Constraint 1: Claude Code is Reference Implementation

**Impact**: All Codex and Copilot implementations must match Claude's behavior
exactly. Claude commands (`.claude/commands/`) are authoritative; any divergence
requires spec justification.

**Mitigation**: Use Claude commands as "source of truth" for documentation and
behavior. Generate Codex/Copilot versions programmatically where possible to
minimize drift.

### Constraint 2: Platform Detection Limitations

**Impact**: Hard to detect which platform is running:

- Claude Code CLI: Has native skill system
- Copilot Chat: Running in VSCode, uses .github/prompts/
- Codex CLI: Command-line tool, uses .system/skills/

**Mitigation**:

- Check execution context (terminal vs VSCode extension host)
- Inspect skill invocation syntax (`/skill` vs `$skill`)
- Read platform identifiers from MCP tool calls
- Fallback to user preference (`gofer.defaultCLI` setting)

### Constraint 3: Copilot Chat "Task Tool" Not Identical to Claude's

**Impact**: Copilot's parallel agent system works differently than Claude Code's
Task tool:

- Claude: `Task: subagent_type="X", model="Y"` tool invocation
- Copilot: Multi-agent delegation via `.github/agents` config
- API and invocation patterns differ

**Mitigation**: Abstract agent spawning behind platform-agnostic instructions.
Each platform file includes platform-specific spawn syntax.

### Constraint 4: Codex Skill Discovery Timing

**Impact**: Per [Codex Skills docs](https://developers.openai.com/codex/skills),
Codex pre-loads skill metadata at startup. Newly added skills may not be
discovered until restart.

**Mitigation**:

- Document in README: "After installing Gofer, restart Codex CLI to load skills"
- Provide `$skill-installer` command for dynamic installation (if supported)
- Warn users if skill not found: "Run `codex reload` or restart terminal"

### Constraint 5: Conversation History Format Differences

**Impact**: Claude CLI stores history in `~/.claude/history.jsonl` (JSONL
format), Codex uses `~/.codex/history.json` (JSON format). Formats differ.

**Mitigation**: ProviderFactory already abstracts this (Feature 027).
`conversationHistory` array is normalized in-memory. History preservation works
via adapter pattern, not direct file manipulation.

### Constraint 6: MCP Server Support

**Impact**: MCP servers only work with Claude Code CLI (per Feature 027).
Copilot Chat and Codex CLI don't support MCP servers.

**Mitigation**:

- Guard MCP initialization with provider check
  (`extension/src/mcpConfig.ts:26-34`)
- Show graceful degradation message: "MCP servers available in Claude Code CLI
  only"
- Don't block commands from working; just disable MCP-specific features
- Document capability matrix in README

## Open Questions

- [ ] **Copilot agent config**: Does `.github/agents` need to declare all 18
      Gofer commands as custom agents, or can prompts alone achieve
      auto-chaining?
- [ ] **Codex skill syntax**: Should skills use `$gofer-research` or
      `$gofer_research` (hyphen vs underscore in skill names)?
- [ ] **Test coverage**: Should feature parity tests mock CLI execution or spawn
      real processes?
- [ ] **Rollout strategy**: Should we phase delivery (Codex first, then Copilot
      enhancement) or ship all platforms simultaneously?
- [ ] **Backward compatibility**: Do we need to maintain existing
      `.github/prompts/` files for users on older Copilot versions without
      parallel agent support?

## Recommendations

1. **Use Claude Commands as Source of Truth**
   - Keep `.claude/commands/` as the reference implementation
   - Generate `.system/skills/` and `.github/prompts/` from Claude versions via
     script
   - Minimize manual maintenance of 54 total files (18 × 3 platforms)

2. **Start with Codex CLI Skills** (Lowest Risk)
   - `.system/skills/` is net-new directory (no existing users to break)
   - Simpler format than Copilot prompts (less metadata required)
   - Can test in isolation without affecting Claude or Copilot users

3. **Enhance Copilot Prompts Incrementally** (Medium Risk)
   - Existing `.github/prompts/` files work today for manual workflow
   - Add auto-chain and parallel agent instructions as additive enhancements
   - Test with Copilot CLI 2026+ versions that support parallel agents
   - Maintain backward compatibility notes for older versions

4. **Add Integration Test Suite First** (Risk Mitigation)
   - Write tests before implementing cross-platform commands
   - Establish "definition of done" for feature parity
   - Catch regressions early as we modify command files

5. **Create Command File Generator** (Maintainability)
   - Script to transform `.claude/commands/*.md` → `.system/skills/*/SKILL.md`
   - Same script for `.claude/commands/*.md` → `.github/prompts/*.prompt.md`
   - Reduces 54-file maintenance burden to single source
   - Generator can inject platform-specific sections (agent spawn syntax,
     auto-chain format)

6. **Document Capability Matrix in README** (User Clarity)
   - Table showing which features work in which platforms
   - Links to installation/setup guides for each platform
   - Troubleshooting section for "command not found" errors per platform

7. **Add VSCode Settings UI** (Discoverability)
   - `gofer.defaultCLI` dropdown with descriptions
   - Settings page shows detected CLI status (✓ Available, ✗ Not Found)
   - Link to CLI installation instructions from settings UI

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type    | Description                                                                 | Impact on Implementation                                          |
| ------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Platform Detection | No reliable runtime platform detection                                      | Must rely on config settings and skill invocation syntax patterns |
| CLI Command Syntax | Each platform uses different invocation: `/skill`, `$skill`, or prompt name | Need abstraction layer to normalize commands                      |
| History Formats    | Claude uses JSONL, Codex uses JSON                                          | Adapter pattern already handles this (Feature 027)                |
| MCP Support        | Only Claude Code supports MCP servers                                       | Guard MCP initialization with provider checks                     |
| Parallel Agents    | Different APIs: Claude Task tool vs Copilot delegation                      | Abstract behind platform-specific instructions                    |

### Technical Debt to Avoid

The following patterns are deprecated or problematic - do NOT use:

| Pattern                      | Found In                  | Why Avoid                                         | Use Instead                                    |
| ---------------------------- | ------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Hardcoded "claude" CLI path  | (anti-pattern, not found) | Breaks when user has custom CLI installation      | Use `ConfigManager.getClaudeCodeCommand()`     |
| Direct file reads of history | (anti-pattern, not used)  | Formats differ per platform, breaks encapsulation | Use `ProviderFactory.conversationHistory` API  |
| Inline skill spawning        | Early `.github/prompts/`  | Doesn't work with parallel agents                 | Use delegated agent spawning per platform docs |
| Single platform assumption   | (anti-pattern, not found) | Breaks cross-platform support                     | Check `gofer.defaultCLI` and route accordingly |

### Areas Requiring Extra Caution

- **Skill Discovery Timing**: Codex pre-loads skills at startup. If skills not
  found, instruct user to restart Codex CLI or run reload command.
- **Context Preservation**: When switching providers mid-session,
  `ProviderFactory` must call `getConversationHistory()` /
  `setConversationHistory()` (Feature 027, R1 remediation).
- **Auto-Chain Instructions**: Must be explicit and platform-specific. AI won't
  auto-chain without clear instructions in each stage's markdown.
- **Agent Spawn Syntax**: Task tool invocation differs per platform. Include
  examples in each command file showing platform-specific syntax.
- **MCP Guards**: Any code initializing MCP servers must check
  `cliProvider !== 'codex'` and `cliProvider !== 'copilot'` first.

### Integration Requirements

| Existing Service   | Integration Method              | Notes                                                            |
| ------------------ | ------------------------------- | ---------------------------------------------------------------- |
| ProviderFactory    | Extend `getCLIProvider()`       | Use new `gofer.defaultCLI` setting                               |
| ConfigManager      | Add `getDefaultCLI()` getter    | Strip `gofer.` prefix per convention                             |
| CLIHealthChecker   | No changes                      | Already detects Claude and Codex                                 |
| AutonomousCommands | Wire CrossPlatformCommandRouter | Route skill invocations to platform directory                    |
| MCP Tool Handler   | Update skill loading            | Check `.claude/commands/`, `.system/skills/`, `.github/prompts/` |

### Downstream Dependencies

Code that depends on areas we're modifying:

- `extension/src/autonomousCommands.ts:968-1100` - Expects skills from
  `.claude/commands/` only (will need router)
- `language-server/src/mcp/toolHandler.ts` - Expects single skill directory
  (will need multi-dir search)
- `extension/src/mcpConfig.ts:26-34` - Guards MCP init by provider (may need
  "copilot" check added)
- Any code calling `ConfigManager.getPreferredCLIProvider()` - Will need to
  respect new `defaultCLI` setting

## Web Research Sources

**Codex CLI Skills**:

- [OpenAI Codex Skills Documentation](https://developers.openai.com/codex/skills)
- [Codex Skills Guide on GitHub](https://github.com/openai/codex/blob/main/docs/skills.md)
- [Skills in OpenAI Codex (Blog)](https://blog.fsck.com/2025/12/19/codex-skills/)
- [Codex Skills Explained (Medium)](https://medium.com/@proflead/codex-skills-explained-the-complete-guide-to-automating-your-prompts-26dd5a89d580)
- [OpenAI Skills Catalog](https://github.com/openai/skills)

**GitHub Copilot Chat Parallel Agents**:

- [GitHub Copilot CLI Parallel Execution](https://winbuzzer.com/2026/01/16/github-copilot-cli-gains-specialized-agents-parallel-execution-and-smarter-context-management-xcxwbn/)
- [GitHub Copilot Coding Agent](https://github.blog/news-insights/product-news/github-copilot-meet-the-new-coding-agent/)
- [Agents Panel on GitHub](https://github.blog/news-insights/product-news/agents-panel-launch-copilot-coding-agent-tasks-anywhere-on-github/)
- [GitHub Copilot CLI Generally Available](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/)

**Cross-Platform Context**:

- [GitHub Copilot Instructions vs Prompts vs Agents](https://dev.to/pwd9000/github-copilot-instructions-vs-prompts-vs-custom-agents-vs-skills-vs-x-vs-why-339l)
- [Claude Skills in Codex CLI](https://www.robert-glaser.de/claude-skills-in-codex-cli/)
