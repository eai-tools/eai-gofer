# Claude Code CLI Setup Guide

Complete setup guide for using Gofer with Claude Code CLI.

## Prerequisites

- Node.js 18+ installed
- VSCode with Gofer extension installed
- Anthropic API key
  ([get one here](https://console.anthropic.com/settings/keys))

## Installation

### 1. Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify installation:

```bash
claude --version
```

### 2. Configure API Key

Set your Anthropic API key in VSCode settings:

1. Open Settings (`Cmd/Ctrl+,`)
2. Search for "gofer.anthropicApiKey"
3. Enter your API key

**Or** set via environment variable:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 3. Initialize Gofer Repository

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: **"Gofer: Initialize Repository"**
3. This creates `.claude/commands/` with 16 Gofer skills

## Usage

### Running Commands

In Claude Code chat, use slash commands:

```text
/0_business_scenario Add user authentication with OAuth2
```

This auto-chains through all pipeline stages:

```text
research → specify → plan → tasks → implement → validate → review
```

### Available Commands

All 16 Gofer commands are available:

| Command                        | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `/0_business_scenario`         | Main orchestrator (full pipeline)   |
| `/0a_problem_validation`       | Validate business problem           |
| `/1_gofer_research`            | Codebase + technology research      |
| `/2_gofer_specify`             | Create feature specification        |
| `/3_gofer_plan`                | Generate implementation plan        |
| `/4_gofer_tasks`               | Create task breakdown               |
| `/5_gofer_implement`           | Execute tasks autonomously          |
| `/6_gofer_validate`            | Validate with 6 parallel agents     |
| `/6a_gofer_engineering_review` | Post-implementation review          |
| `/7_gofer_save`                | Save session checkpoint             |
| `/7a_stakeholder_comms`        | Generate stakeholder communications |
| `/8_gofer_resume`              | Resume from checkpoint              |
| `/9_gofer_tests`               | Define acceptance test cases        |
| `/10_gofer_cloud`              | Cloud infrastructure analysis       |
| `/gofer_constitution`          | Create project coding principles    |
| `/gofer_hydrate`               | Reverse-engineer spec from code     |

### MCP Tools (Advanced)

Claude Code also supports MCP (Model Context Protocol) for direct tool calling:

**Automatic Setup**: Gofer creates `.vscode/mcp.json` automatically when you
initialize.

**Manual Setup** (if needed):

1. Ensure `.vscode/mcp.json` exists with Gofer server configuration
2. Reload VSCode: `Developer: Reload Window`
3. Claude can now call MCP tools directly:
   - `gofer_get_specs` - List all specs
   - `gofer_get_next_task` - Get next task
   - `gofer_execute_task` - Start task
   - `gofer_update_task_status` - Mark complete
   - `gofer_validate_code` - Check constitution
   - `gofer_run_tests` - Run Playwright tests

### Parallel Agent Spawning

Claude Code supports spawning multiple sub-agents in parallel:

```text
/6_gofer_validate my-feature
```

This spawns **6 validation agents concurrently** (completes in <60s):

1. validation-correctness
2. validation-security
3. validation-performance
4. validation-test-quality
5. validation-integration
6. validation-standards

### Context Preservation

Conversation history is automatically preserved when:

- Saving checkpoints with `/7_gofer_save`
- Resuming sessions with `/8_gofer_resume`
- Switching between Claude Code sessions

## Platform Capabilities

✅ **Full Feature Support**:

- All 16 slash commands
- Auto-chaining pipeline
- Parallel agent spawning (Task tool)
- MCP server integration
- Conversation history preservation
- Context health monitoring
- Autonomous mode execution

## Troubleshooting

### MCP Tools Not Available

**Issue**: Claude doesn't see Gofer MCP tools

**Solution**:

```bash
# 1. Check .vscode/mcp.json exists
ls .vscode/mcp.json

# 2. If missing, run initialization:
# Command Palette → "Gofer: Initialize Repository"

# 3. Reload VSCode
# Command Palette → "Developer: Reload Window"
```

### Commands Not Found

**Issue**: Slash commands not autocompleting

**Solution**:

```bash
# Check .claude/commands/ directory exists
ls -la .claude/commands/

# Should show 16 .md files (0_business_scenario.md through gofer_hydrate.md)

# If missing, re-initialize:
# Command Palette → "Gofer: Initialize Repository"
```

### API Key Errors

**Issue**: "Authentication failed: Invalid or missing API key"

**Solution**:

1. Verify API key is set in VSCode settings (`gofer.anthropicApiKey`)
2. Or set environment variable: `export ANTHROPIC_API_KEY="sk-ant-..."`
3. Reload VSCode

## Next Steps

- [Platform Comparison](../README.md#platform-capabilities) - Compare with
  Copilot/Codex
- [Quick Start Guide](../README.md#quick-start) - First feature walkthrough
- [Pipeline Documentation](../docs/pipeline/) - Detailed pipeline stage docs

## Advanced Configuration

### Custom Command Directory

If using a non-standard `.claude/` location:

```json
{
  "gofer.commandDirectory": "/custom/path/to/commands"
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

### MCP Server Port

If port 8765 is in use:

```json
{
  "gofer.mcpServerPort": 8766
}
```

## Support

- **Issues**: [GitHub Issues](https://github.com/eai-tools/gofer/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/eai-tools/gofer/discussions)
- **Documentation**: [Full Docs](../README.md)
