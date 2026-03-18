# Codex CLI Skills Directory

This directory contains skill definitions for OpenAI's Codex CLI integration.

## Overview

Codex CLI discovers skills by scanning the `.system/skills/` directory at the
workspace root. Each skill must be in its own subdirectory with a `SKILL.md`
file containing YAML frontmatter.

## Skill Format

```markdown
---
name: skill-name
description: Brief description of what this skill does
arguments:
  - name: arg1
    description: Description of argument
    required: true
result_schema:
  type: object
  properties:
    output: string
---

# Skill Content

Detailed instructions for the skill...
```

## Discovery

Codex CLI automatically discovers skills by running:

```bash
codex skills list
```

All skills in this directory will be available as `$ $skill-name` in Codex CLI.

## Gofer Command Parity

This directory contains 16 Gofer pipeline commands ported from Claude CLI
(`.claude/commands/`) to enable full feature parity across AI platforms.

### Available Commands

1. `0_business_scenario` - Orchestrate unified Gofer pipeline
2. `0a_problem_validation` - Validate business problem
3. `1_gofer_research` - Deep codebase research
4. `2_gofer_specify` - Feature specification
5. `3_gofer_plan` - Technical implementation plan
6. `4_gofer_tasks` - Task breakdown
7. `5_gofer_implement` - Execute implementation
8. `6_gofer_validate` - Validation with engineering rubric
9. `6a_gofer_engineering_review` - Post-implementation review
10. `7_gofer_save` - Save session checkpoint
11. `7a_stakeholder_comms` - Stakeholder communications
12. `8_gofer_resume` - Resume from checkpoint
13. `9_gofer_tests` - Define test cases
14. `10_gofer_cloud` - Cloud infrastructure analysis
15. `gofer_constitution` - Project principles
16. `gofer_hydrate` - Reverse-engineer spec

## Auto-Generation

Skills in this directory are auto-generated from the Claude CLI reference
implementation using `scripts/generate-commands.ts`. Do NOT manually edit skill
files - regenerate them instead.

## Platform Detection

The extension automatically detects which platform is active and routes commands
appropriately. Users can override detection via VSCode settings:
`gofer.defaultCLI`.
