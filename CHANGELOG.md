# Changelog

All notable changes to the Gofer VSCode extension will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Cross-Platform Command Parity** (feature 028): All 16 Gofer commands now available across Claude Code, GitHub Copilot Chat, and OpenAI Codex CLI
  - New `gofer.defaultCLI` setting to choose preferred AI platform (`claude`, `copilot`, `codex`, or `auto`)
  - Automatic command routing to `.claude/commands/`, `.github/prompts/`, or `.system/skills/` based on selected platform
  - Command generation script creates Codex skills and Copilot prompts from Claude command templates
  - Parallel agent spawning for validation stage (<60s vs 90-120s sequential)
  - Conversation history preservation when switching between providers
  - Comprehensive platform capabilities documentation with setup guides

**New Commands Available on All Platforms:**
- `/0_business_scenario` - Main orchestrator (full pipeline)
- `/0a_problem_validation` - Validate business problem
- `/1_gofer_research` - Codebase + technology research
- `/2_gofer_specify` - Create feature specification
- `/3_gofer_plan` - Generate implementation plan
- `/4_gofer_tasks` - Create task breakdown
- `/5_gofer_implement` - Execute tasks autonomously
- `/6_gofer_validate` - Validate with 6 parallel agents
- `/6a_gofer_engineering_review` - Post-implementation review
- `/7_gofer_save` - Save session checkpoint
- `/7a_stakeholder_comms` - Generate stakeholder communications
- `/8_gofer_resume` - Resume from checkpoint
- `/9_gofer_tests` - Define acceptance test cases
- `/10_gofer_cloud` - Cloud infrastructure analysis
- `/gofer_constitution` - Create project coding principles
- `/gofer_hydrate` - Reverse-engineer spec from code

**Platform-Specific Features:**
- MCP server integration: Claude Code only
- Parallel validation agents: Claude Code (Task tool), Codex CLI (terminal multiplexing), Copilot 2026+ (multi-agent delegation)
- Autonomous mode: Claude Code and Codex CLI only
- Auto-chaining pipeline: All platforms (manual in pre-2026 Copilot)

**Documentation:**
- [Setup Guide: Claude Code](docs/setup-claude-code.md) - Full feature support with MCP tools
- [Setup Guide: GitHub Copilot Chat](docs/setup-copilot-chat.md) - Core features + 2026+ enhancements
- [Setup Guide: OpenAI Codex CLI](docs/setup-codex-cli.md) - Full feature support via skill system
- Platform capabilities comparison matrix in README

### Fixed

- AI token cost calculation bug fixes (feature 025-ai-usage-tracking)
