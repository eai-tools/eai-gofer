# GitHub Copilot Chat Setup Guide

Complete setup guide for using Gofer with GitHub Copilot Chat.

## Prerequisites

- VSCode with Gofer extension installed
- GitHub Copilot subscription
  ([subscribe here](https://github.com/features/copilot))
- GitHub Copilot Chat extension installed

## Installation

### 1. Install GitHub Copilot

If not already installed:

1. Open VSCode Extensions (`Cmd/Ctrl+Shift+X`)
2. Search for "GitHub Copilot"
3. Install **GitHub Copilot** and **GitHub Copilot Chat**
4. Sign in with your GitHub account

### 2. Initialize Gofer Repository

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: **"Gofer: Initialize Repository"**
3. This creates `.github/prompts/` with 16 Gofer prompt files

## Usage

### Running Commands

In Copilot Chat panel, use hash commands:

```text
#0_business_scenario Add user authentication with OAuth2
```

**Or** use the `@gofer` agent with slash commands:

```text
@gofer /0_business_scenario Add user authentication with OAuth2
```

### Available Commands

All 16 Gofer commands are available:

| Command                        | Purpose                              |
| ------------------------------ | ------------------------------------ |
| `#0_business_scenario`         | Main orchestrator (full pipeline)    |
| `#0a_problem_validation`       | Validate business problem            |
| `#1_gofer_research`            | Codebase + technology research       |
| `#2_gofer_specify`             | Create feature specification         |
| `#3_gofer_plan`                | Generate implementation plan         |
| `#4_gofer_tasks`               | Create task breakdown                |
| `#5_gofer_implement`           | Execute tasks autonomously           |
| `#6_gofer_validate`            | Validate with manual multi-agent run |
| `#6a_gofer_engineering_review` | Post-implementation review           |
| `#7_gofer_save`                | Save session checkpoint              |
| `#7a_stakeholder_comms`        | Generate stakeholder communications  |
| `#8_gofer_resume`              | Resume from checkpoint               |
| `#9_gofer_tests`               | Define acceptance test cases         |
| `#10_gofer_cloud`              | Cloud infrastructure analysis        |
| `#gofer_constitution`          | Create project coding principles     |
| `#gofer_hydrate`               | Reverse-engineer spec from code      |

### Auto-Chaining Pipeline

**GitHub Copilot 2026+ supports auto-chaining**:

When you run the orchestrator command, it automatically chains through stages:

```text
#0_business_scenario Add user authentication
→ research → specify → plan → tasks → implement → validate → review
```

**For older Copilot versions**, auto-chaining is manual:

```text
#1_gofer_research Add user authentication
# Wait for completion, then:
#2_gofer_specify
# Wait for completion, then:
#3_gofer_plan
# ... continue through stages manually
```

See [legacy-workflow.md](./legacy-workflow.md) for detailed manual workflow.

### Parallel Agent Spawning

**GitHub Copilot 2026+ supports parallel agents**:

```text
#6_gofer_validate my-feature
```

Spawns 6 validation agents concurrently (completes in <60s).

**For older Copilot versions**, run agents sequentially:

```text
# Run each validation category one at a time:
#validation-correctness
#validation-security
#validation-performance
#validation-test-quality
#validation-integration
#validation-standards
```

This takes ~90-120 seconds total. See
[legacy-workflow.md](./legacy-workflow.md).

### Context Preservation

Conversation history is preserved when:

- Using `/7_gofer_save` to create checkpoints
- Using `/8_gofer_resume` to restore from checkpoints
- Staying within the same Copilot Chat session

**Note**: Switching to a new Copilot Chat window starts a fresh context.

## Platform Capabilities

⚠️ **Partial Feature Support** (2026+ improves significantly):

| Feature                   | 2026+ | Pre-2026 | Notes                                  |
| ------------------------- | ----- | -------- | -------------------------------------- |
| All 16 commands           | ✅    | ✅       | Available via `.github/prompts/`       |
| Auto-chaining pipeline    | ✅    | ⚠️       | Manual in pre-2026 versions            |
| Parallel agent spawning   | ✅    | ⚠️       | Sequential in pre-2026 versions        |
| MCP server integration    | ✗     | ✗        | Not supported (Claude Code only)       |
| Conversation preservation | ✅    | ✅       | Within same session                    |
| Context health monitoring | ✅    | ✅       | Built into Gofer extension             |
| Autonomous mode           | ✗     | ✗        | Not supported (Claude Code/Codex only) |

## Troubleshooting

### Commands Not Autocompleting

**Issue**: Hash commands (#...) not showing in autocomplete

**Solution**:

```bash
# 1. Check .github/prompts/ directory exists
ls -la .github/prompts/

# Should show 16 .prompt.md files

# 2. If missing, re-initialize:
# Command Palette → "Gofer: Initialize Repository"

# 3. Reload VSCode
# Command Palette → "Developer: Reload Window"
```

### Copilot Not Responding

**Issue**: Copilot doesn't execute the command

**Solution**:

1. Verify GitHub Copilot Chat extension is installed and active
2. Check subscription status: GitHub Settings → Copilot
3. Try using `@gofer /command` format instead of `#command`
4. Restart VSCode

### Auto-Chaining Not Working

**Issue**: Commands don't auto-chain to next stage

**Solution**:

**If using 2026+ Copilot**: Should auto-chain. Report as bug.

**If using pre-2026 Copilot**: Auto-chaining not supported. Use manual workflow:

1. Run stage command (e.g., `#1_gofer_research`)
2. Wait for completion
3. Manually run next stage (`#2_gofer_specify`)
4. Repeat for each stage

See [legacy-workflow.md](./legacy-workflow.md) for full manual workflow.

## Next Steps

- [Platform Comparison](../README.md#platform-capabilities) - Compare with
  Claude/Codex
- [Quick Start Guide](../README.md#quick-start) - First feature walkthrough
- [Legacy Workflow](./legacy-workflow.md) - Manual chaining for pre-2026 Copilot

## Advanced Configuration

### Default CLI Selection

To prefer Copilot when multiple CLIs are available:

```json
{
  "gofer.defaultCLI": "copilot"
}
```

Options: `"claude"`, `"copilot"`, `"codex"`, `"auto"` (default)

### Custom Prompt Directory

If using a non-standard `.github/prompts/` location:

```json
{
  "gofer.promptDirectory": "/custom/path/to/prompts"
}
```

### Context Health Thresholds

Configure when to prompt for session save:

```yaml
# .specify/memory/context-profiles.yaml
implement:
  researchBudget: 0.15
  memoryBudget: 0.25
  codeBudget: 0.40
  observationWindow: 5
```

## GitHub Copilot 2026+ Features

If you have access to GitHub Copilot 2026 or later:

### Multi-Agent Delegation

Copilot can spawn multiple agents in parallel:

```text
#6_gofer_validate my-feature
```

This launches 6 validation perspectives concurrently.

### Auto-Chaining

Full pipeline runs without manual intervention:

```text
#0_business_scenario Add user authentication
```

Automatically executes: research → specify → plan → tasks → implement → validate
→ review

### Enhanced Context

Improved context window management keeps full conversation history across longer
sessions.

## Support

- **Issues**: [GitHub Issues](https://github.com/eai-tools/gofer/issues)
- **Copilot Help**: [GitHub Copilot Docs](https://docs.github.com/en/copilot)
- **Documentation**: [Full Docs](../README.md)
