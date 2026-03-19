# OpenAI Codex CLI Setup Guide

Complete setup guide for using Gofer with OpenAI Codex CLI.

## Prerequisites

- Node.js 18+ installed
- VSCode with Gofer extension installed
- OpenAI API key with Codex access
  ([get one here](https://platform.openai.com/api-keys))

## Installation

### 1. Install Codex CLI

```bash
npm install -g @openai/codex-cli
```

Verify installation:

```bash
codex --version
```

### 2. Configure API Key

Set your OpenAI API key in VSCode settings:

1. Open Settings (`Cmd/Ctrl+,`)
2. Search for "gofer.openaiApiKey"
3. Enter your API key

**Or** set via environment variable:

```bash
export OPENAI_API_KEY="sk-proj-..."
```

### 3. Initialize Gofer Repository

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: **"Gofer: Initialize Repository"**
3. This creates `.system/skills/` with 16 Gofer skills

## Usage

### Running Commands

In Codex CLI, use colon commands:

```text
:0_business_scenario Add user authentication with OAuth2
```

**Or** invoke skills directly:

```text
codex run 0-business-scenario "Add user authentication"
```

### Available Commands

All 16 Gofer commands are available:

| Command                        | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `:0_business_scenario`         | Main orchestrator (full pipeline)   |
| `:0a_problem_validation`       | Validate business problem           |
| `:1_gofer_research`            | Codebase + technology research      |
| `:2_gofer_specify`             | Create feature specification        |
| `:3_gofer_plan`                | Generate implementation plan        |
| `:4_gofer_tasks`               | Create task breakdown               |
| `:5_gofer_implement`           | Execute tasks autonomously          |
| `:6_gofer_validate`            | Validate with 6 parallel skills     |
| `:6a_gofer_engineering_review` | Post-implementation review          |
| `:7_gofer_save`                | Save session checkpoint             |
| `:7a_stakeholder_comms`        | Generate stakeholder communications |
| `:8_gofer_resume`              | Resume from checkpoint              |
| `:9_gofer_tests`               | Define acceptance test cases        |
| `:10_gofer_cloud`              | Cloud infrastructure analysis       |
| `:gofer_constitution`          | Create project coding principles    |
| `:gofer_hydrate`               | Reverse-engineer spec from code     |

### Auto-Chaining Pipeline

Codex CLI supports auto-chaining through the orchestrator:

```text
:0_business_scenario Add user authentication
→ research → specify → plan → tasks → implement → validate → review
```

Each stage automatically invokes the next using the skill system.

### Parallel Skill Execution

Codex CLI supports running multiple skills in parallel:

```text
:6_gofer_validate my-feature
```

This spawns **6 validation skills concurrently**:

```bash
# Codex opens 6 terminal windows and runs:
codex run validation-correctness &
codex run validation-security &
codex run validation-performance &
codex run validation-test-quality &
codex run validation-integration &
codex run validation-standards &
wait
```

Completes in <60 seconds.

### Context Preservation

Conversation history is preserved when:

- Using `:7_gofer_save` to create checkpoints
- Using `:8_gofer_resume` to restore from checkpoints
- Staying within the same Codex session

## Platform Capabilities

✅ **Full Feature Support**:

- All 16 slash commands
- Auto-chaining pipeline
- Parallel skill spawning (via terminal multiplexing)
- Conversation history preservation
- Context health monitoring
- Autonomous mode execution

⚠️ **Limited Support**:

- MCP server integration: ❌ Not supported (Claude Code only)

## Skill Discovery

Codex automatically discovers skills in `.system/skills/` directory:

```bash
# List all available Gofer skills
codex skills list | grep gofer

# Output shows:
# 0-business-scenario      - Main orchestrator
# 1-gofer-research         - Codebase research
# 2-gofer-specify          - Create specification
# ... (16 total)
```

### Skill Structure

Each skill has a `SKILL.md` file:

```text
.system/skills/
├── 0-business-scenario/
│   └── SKILL.md
├── 1-gofer-research/
│   └── SKILL.md
├── 2-gofer-specify/
│   └── SKILL.md
... (16 total)
```

Codex reads `SKILL.md` to understand how to execute each skill.

## Troubleshooting

### Skills Not Found

**Issue**: `:command` not recognized

**Solution**:

```bash
# 1. Check .system/skills/ directory exists
ls -la .system/skills/

# Should show 16 subdirectories (0-business-scenario/ through gofer-hydrate/)

# 2. If missing, re-initialize:
# Command Palette → "Gofer: Initialize Repository"

# 3. Refresh skill cache:
codex skills refresh
```

### API Key Errors

**Issue**: "Authentication failed: Invalid or missing API key"

**Solution**:

1. Verify API key is set in VSCode settings (`gofer.openaiApiKey`)
2. Or set environment variable: `export OPENAI_API_KEY="sk-proj-..."`
3. Ensure your OpenAI account has Codex access enabled
4. Restart Codex CLI

### Quota Exceeded

**Issue**: "Quota exceeded: Your OpenAI account has insufficient quota"

**Solution**:

1. Check usage at [OpenAI Platform](https://platform.openai.com/usage)
2. Add credits to your OpenAI account
3. Upgrade to a paid plan if on free tier

### Parallel Skills Not Working

**Issue**: Skills run sequentially instead of in parallel

**Solution**:

Codex uses terminal multiplexing for parallel execution. Ensure:

1. Your terminal supports background jobs (`&` operator)
2. `wait` command is available (standard in bash/zsh)
3. Codex version supports parallel skills (v2.0+)

```bash
# Check Codex version
codex --version

# Should be v2.0 or higher for parallel skill support
```

## Next Steps

- [Platform Comparison](../README.md#platform-capabilities) - Compare with
  Claude/Copilot
- [Quick Start Guide](../README.md#quick-start) - First feature walkthrough
- [Pipeline Documentation](../docs/pipeline/) - Detailed pipeline stage docs

## Advanced Configuration

### Default CLI Selection

To prefer Codex when multiple CLIs are available:

```json
{
  "gofer.defaultCLI": "codex"
}
```

Options: `"claude"`, `"copilot"`, `"codex"`, `"auto"` (default)

### Custom Skills Directory

If using a non-standard `.system/skills/` location:

```json
{
  "gofer.skillsDirectory": "/custom/path/to/skills"
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

### Parallel Execution Concurrency

Control how many skills run concurrently:

```bash
# In .system/skills/6-gofer-validate/SKILL.md
# Set max_concurrent_skills:
max_concurrent_skills: 6  # Run all 6 at once (default)
max_concurrent_skills: 3  # Run 3 at a time (conservative)
```

## Autonomous Mode

Codex CLI supports fully autonomous feature implementation:

```bash
# Start autonomous mode
codex autonomous --spec .specify/specs/my-feature/spec.md

# Codex will:
# 1. Read the spec
# 2. Generate implementation plan
# 3. Execute all tasks autonomously
# 4. Run tests and validation
# 5. Notify you when complete
```

See [AUTONOMOUS_MODE.md](./AUTONOMOUS_MODE.md) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/eai-tools/gofer/issues)
- **Codex Help**:
  [OpenAI Codex Docs](https://platform.openai.com/docs/guides/codex)
- **Documentation**: [Full Docs](../README.md)
