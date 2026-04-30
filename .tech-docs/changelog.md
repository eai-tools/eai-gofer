---
generated: "2026-04-30T17:58:10Z"
source_commit: "64d169eba2a63002e0dcce3f4685790f6ddf7f88"
---

# Changelog

## Recent Changes Summary

This changelog documents significant changes to the Gofer architecture, features, and APIs since the previous documentation update.

**Focus Areas:**

- Architectural changes
- New MCP tools or endpoints
- Breaking changes
- Security updates
- Performance improvements

---

## v3.1.0 (2026-04-30) - Current Release

**Release Commits:**
- `64d169eba2a63002e0dcce3f4685790f6ddf7f88` - Documentation update (nightly automated)
- `7665d4ca1791ffbf77b0e90768b8fba478011792` - Documentation update (nightly automated)
- `c215b3f03a916f2db463f5ff27223dbf94ceea46` - Command artifact sync
- `7989fbd` - Release tag

### Features

**Added:**

- **Command Artifact Sync** - Synchronized generated command artifacts across all CLI surfaces
  - Files: `.claude/commands/`, `.github/prompts/`, `.agents/skills/`, `.gemini/commands/`
  - Ensures consistency across Claude, Copilot, Codex, and Gemini
  - Automated via `npm run gofer:generate`

**Changed:**

- **Version Scheme** - Major version bump to 3.x for multi-platform support milestone
  - v1.x → v2.x: Cross-platform command parity
  - v2.x → v3.x: CLI innovations and visual artifacts
  - Breaking: None (additive changes only)

### Documentation

**Updated:**

- **Technical Documentation** - Refreshed all `.tech-docs/` files with current commit references
  - Updated frontmatter with correct source commit and timestamp
  - Verified all file counts and metrics (246 extension TS files, 4 active specs)
  - No architectural or functional changes

---

## v3.0.1 (2026-04-29)

### Bug Fixes

**Fixed:**

- **Installation Resources** - Repaired Codex and Gemini resource files
  - Issue: Missing or corrupted resource files during installation
  - Impact: Codex CLI and Gemini CLI users unable to use generated commands
  - Files: `.agents/skills/*/`, `.gemini/commands/gofer/`

---

## v3.0.0 (2026-04-28) - Major Release

### Features

**Added: CLI Innovations + Multi-Persona Visual Artifacts**

**Source-of-Truth Generator:**

- Single canonical file per stage at `.specify/commands/<stage>.md`
- Emits to 8 CLI surfaces automatically:
  - `.claude/commands/` - Claude Code
  - `.claude/commands/mirror/` - Claude mirror commands
  - `.github/prompts/` - GitHub Copilot Chat
  - `package.json` - VSCode command contributions
  - `.agents/skills/` - OpenAI Codex CLI
  - `.gemini/commands/gofer/` - Gemini CLI
  - `.github/prompts/` - GitHub Prompts
  - `.system/skills/` - System skills
- Script: `.specify/scripts/node/generate-commands.mjs`
- Command: `npm run gofer:generate`

**Visual Artifacts:**

- 10 persona-pack visual templates:
  - Impact Canvas (business stakeholders)
  - C4 Context/Container diagrams (architects)
  - AS-IS/TO-BE Value Streams (process analysts)
  - Capability Heatmap (product managers)
  - Bounded-Context Map (domain modelers)
  - Data-Model ERD (data engineers)
  - Risk Heatmap (security/compliance)
  - ROI Projection (finance/executives)
- 7 visual-writer sub-agents:
  - `visual-canvas-writer`
  - `visual-c4-writer`
  - `visual-bounded-context-writer`
  - `visual-erd-writer`
  - `visual-heatmap-writer`
  - `visual-risk-writer`
  - `visual-value-stream-writer`
- Two-pass canvas:
  - Pass 1 in `/2_gofer_specify` (heuristic risks)
  - Pass 2 in `/6_gofer_validate` (refined risks)

**Namespace Aliases:**

- `/gofer:*` namespace for all 16 pipeline stages
- 3 new control commands:
  - `/gofer:plan` - Plan-mode toggle
  - `/gofer:side` - Side-channel conversation
  - `/gofer:personality` - Tone preset

**Diagnostics:**

- `npm run gofer:codex-doctor` - Read-only Codex skill-budget diagnostic
- Detects redundant skill bundles
- Suggests cleanup actions

**Plugin Manifests:**

- `.claude-plugin/plugin.json` - Claude Code plugin metadata
- `.gemini/extension.json` - Gemini CLI extension metadata
- `codex-config.toml` - Codex skill configuration scaffold
- Root `AGENTS.md` - Multi-agent system documentation

**Documentation:**

- ADR-003: `/gofer:plan` namespace split
- ADR-004: Plugin marketplace destination
- ADR-005: `mmdc` vs GitHub Action rendering target
- Constitution updated for `.agents/skills/` as Codex discovery target
- `.specify/memory/lessons.md` - Codex skill-budget incident lessons (2026-04-25)

**Fixed:**

- Codex skill-budget incident: 176 redundant skill bundles disabled

---

## v2.0.11 (2026-04-27)

### Bug Fixes

**Fixed:**

- **GitHub Copilot Compatibility** - Fixed command routing for Copilot Chat
  - Issue: Commands not recognized in Copilot Chat
  - Impact: Copilot users unable to use Gofer pipeline
  - Solution: Corrected prompt file format in `.github/prompts/`

---

## v2.0.10 (2026-04-26)

### Bug Fixes

**Fixed:**

- **GitHub Copilot Command Registration** - Pre-release fixes for Copilot integration
  - Issue: Commands not appearing in Copilot autocomplete
  - Impact: User experience degradation
  - Solution: Updated command metadata format

---

## v2.0.0 - v2.0.9 (2026-04-20 to 2026-04-25)

### Features

**Added: Cross-Platform Command Parity (Feature 028)**

- All 16 Gofer commands now available across:
  - Claude Code CLI
  - GitHub Copilot Chat
  - OpenAI Codex CLI
  - Gemini CLI
- New `gofer.defaultCLI` setting: `claude`, `copilot`, `codex`, `gemini`, or `auto`
- Automatic command routing to appropriate CLI surface
- Command generation script creates Codex skills and Copilot prompts from Claude templates
- Parallel agent spawning for validation stage (<60s vs 90-120s sequential)
- Conversation history preservation when switching providers
- Comprehensive platform capabilities documentation

**16 Commands Available:**

1. `/0_business_scenario` - Main orchestrator (full pipeline)
2. `/0a_problem_validation` - Validate business problem
3. `/1_gofer_research` - Codebase + technology research
4. `/2_gofer_specify` - Create feature specification
5. `/3_gofer_plan` - Generate implementation plan
6. `/4_gofer_tasks` - Create task breakdown
7. `/5_gofer_implement` - Execute tasks autonomously
8. `/6_gofer_validate` - Validate with 6 parallel agents
9. `/6a_gofer_engineering_review` - Post-implementation review
10. `/7_gofer_save` - Save session checkpoint
11. `/7a_stakeholder_comms` - Generate stakeholder communications
12. `/8_gofer_resume` - Resume from checkpoint
13. `/9_gofer_tests` - Define acceptance test cases
14. `/10_gofer_cloud` - Cloud infrastructure analysis
15. `/gofer_constitution` - Create project coding principles
16. `/gofer_hydrate` - Reverse-engineer spec from code

**Platform-Specific Features:**

| Feature                   | Claude | Copilot | Codex | Gemini |
| ------------------------- | ------ | ------- | ----- | ------ |
| Portable pipeline stages  | ✅     | ✅      | ✅    | ✅     |
| Full orchestrator command | ✅     | ✅      | ✗     | ✗      |
| Save/resume commands      | ✅     | ✅      | ✗     | ✗      |
| MCP server integration    | ✅     | ✗       | ✗     | ✗      |
| Generated artifacts       | ✅     | ✅      | ✅    | ✅     |

**Documentation:**

- [Setup Guide: Claude Code](docs/setup-claude-code.md)
- [Setup Guide: GitHub Copilot Chat](docs/setup-copilot-chat.md)
- [Setup Guide: OpenAI Codex CLI](docs/setup-codex-cli.md)
- [Setup Guide: Gemini CLI](docs/cli-support.md)
- Platform capabilities comparison matrix

**Fixed:**

- AI token cost calculation bugs (feature 025)

---

## v1.19.0 - v1.19.2 (2026-04-15 to 2026-04-18)

### Features

**Added: Memory Panel Filter (Feature 001)**

- Filter system telemetry from user memories
- New toggle control to show/hide system-generated memories
- Category and tag dropdowns filter based on toggle state
- Default view excludes `#auto` tagged memories (533 system entries → 0 visible)
- Search results respect filter state
- UI-level filtering preserves all data without storage migration
- 100% test coverage with 0% mock ratio
  - 11 feature tests: 4 unit, 3 integration, 4 UI

**Impact:**

- Memory panel usability significantly improved
- Users see only relevant, human-authored memories by default
- System can still show auto-generated content when needed

---

## v1.17.1 (2026-03-11) - Previous Documentation Baseline

**Release Commit:** `29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c`

### Documentation

**Added:**

- **What's New Page** - Per-release summary documentation
  - Location: `docs/whats-new/`
  - Purpose: User-facing release notes

### Bug Fixes

**Fixed:**

- **ACCOrchestrator Memory Leak** - Reinitialize memory leak fixed
  - File: `extension/src/autonomous/ACCOrchestrator.ts`
  - Issue: Memory not released on reinitialize
  - Impact: Extension performance degradation over time
  - Solution: Proper disposal of event listeners and timers
  - Test: Strengthened test assertions to catch memory leaks

---

## Breaking Changes Summary

### v3.x Series

**No Breaking Changes** - All changes are additive

- New CLI surfaces added without removing existing ones
- Visual artifacts are optional enhancements
- Command generation is opt-in via `npm run gofer:generate`

### v2.x Series

**No Breaking Changes** - Backward compatible

- Multi-platform support added via new command files
- Existing Claude Code workflows unchanged
- MCP tools remain identical

### v1.9.x → v1.10.x (Historical)

**Breaking Changes:**

- **Spec Format** - Legacy JSON specs no longer supported
  - Migration: Run `Gofer: Upgrade to Gofer Format`
  - Automatic conversion preserves all data

---

## API Changes

### MCP Tools

**No Changes** - MCP tool signatures remain stable since v1.11.0

All 6 tools unchanged:

- `gofer_get_specs`
- `gofer_get_next_task`
- `gofer_execute_task`
- `gofer_update_task_status`
- `gofer_validate_code`
- `gofer_run_tests`

### Extension Commands

**v3.0.0 - No New Commands**

- All command additions are CLI surface expansions
- VSCode extension commands unchanged

**v2.0.0 - No New Commands**

- Command routing logic added
- New setting: `gofer.defaultCLI`

---

## Performance Improvements

### v3.0.0

- **Parallel Validation** - 6 validation agents run concurrently
  - <60s validation vs 90-120s sequential
  - 40-50% time reduction
- **Command Generation** - Single source-of-truth approach
  - Eliminates manual sync across 8 CLI surfaces
  - Automated via `npm run gofer:generate`

### v2.0.0

- **Multi-Platform Support** - Command routing optimized
  - O(1) lookup for CLI detection
  - Cached command file paths

---

## Security Updates

**No security-specific updates in v1.17.1 → v3.1.0 range**

Existing security features remain active:

- Scope Guard (v1.15.5)
- Cost Budget Enforcer (v1.15.3)
- Tool Audit Logger (v1.15.2)

---

## Known Issues

### v3.1.0

**Issue:** Mermaid export (`npm run gofer:mermaid-export`) requires manual `mmdc` installation

- **Workaround:** `npm install -g @mermaid-js/mermaid-cli`
- **Status:** Optional feature, documented in ADR-005

**Issue:** Codex skill-budget can accumulate redundant bundles

- **Workaround:** Run `npm run gofer:codex-doctor` to diagnose
- **Status:** Documented in `.specify/memory/lessons.md`

### v3.0.0

**Issue:** Gemini CLI command files may require manual path updates

- **Impact:** Minor (affects only Gemini CLI users)
- **Status:** Fix planned for v3.2.0

---

## Upcoming Changes (v3.2.0)

**Planned Features:**

- VSCode Marketplace publication
- Enhanced visual artifact templates
- Multi-workspace support improvements
- Spec templates library expansion
- Integration with Azure DevOps

**Tentative Release:** Q2 2026
