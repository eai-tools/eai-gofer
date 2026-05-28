---
name: eai-gofer
description: "Run the public Gofer spec-driven delivery workflow in Claude, Gemini, Codex, or Copilot."
---

# EAI Gofer

Version: 3.4.5

Use this skill when the user asks to run, install, update, or understand Gofer without the VS Code extension UI.

## Pipeline Skills

- `0_business_scenario` - Define the business problem and scenario for Gofer to analyse and solve.
- `0a_problem_validation` - Validate the business problem using 5 Whys root-cause analysis and stakeholder mapping.
- `1_gofer_research` - Research codebase, CLI integrations, and technology landscape for the target feature.
- `2_gofer_specify` - Generate a feature specification from research findings and approved proposal review.
- `3_gofer_plan` - Create a detailed technical implementation plan with architecture, data model, and contracts.
- `4_gofer_tasks` - Break down the implementation plan into dependency-ordered, parallelisable tasks.
- `5_gofer_implement` - Execute all tasks from tasks.md phase by phase with feedback loops and engineering review.
- `6_gofer_validate` - Validate implemented work with evidence-backed scoring, blast-radius analysis, and engineering review.
- `6a_gofer_engineering_review` - Run a targeted engineering review on a specific component or concern.
- `7_gofer_save` - Save session state and create a handoff checkpoint for resumption in a new context.
- `7a_stakeholder_comms` - Generate stakeholder-facing communications: release notes, demo scripts, and change briefs.
- `8_gofer_resume` - Resume a previous Gofer session from a saved checkpoint file.
- `9_gofer_tests` - Generate comprehensive test suites from four testing perspectives for a target component.
- `10_gofer_cloud` - Deploy and configure the Gofer cloud integration for remote pipeline execution.
- `gofer:bootstrap-workspace` - Create or update the repo-owned Gofer scaffold for the current workspace.
- `gofer:check-workspace` - Check whether this repo is initialized for Gofer and explain any missing or stale scaffold.
- `gofer_constitution` - Create or update project constitution with coding principles and guidelines.
- `gofer:diagnose` - Run a reproduce-minimize-instrument-fix loop for bugs and failing tests.
- `gofer_hydrate` - Reverse-engineer specification from existing code (Hydration).
- `gofer:personality` - Set the assistant personality for this Gofer session: friendly, pragmatic, or none (default).
- `gofer:plan` - Toggle plan mode in the active CLI session for the next user prompt; non-pipeline control command.
- `gofer:side` - Open a side conversation in the active CLI without disturbing the main pipeline state; resumable.
- `gofer:spec-summary` - Generate a business-friendly summary of feature value and scope.
- `gofer:tdd` - Guide a red-green-refactor loop tied to spec acceptance criteria.
- `gofer:vocabulary` - Extract domain terminology into a canonical feature glossary.
- `gofer:zoom-out` - Show how the current feature connects to broader system boundaries.

## Stable Local Install Path

Install or update this plugin by replacing the stable local folder:

```text
~/plugins/eai-gofer
```

The public hosted plugin bundle is available at:

```text
https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer
```

Gemini CLI users can also copy the bundled `.gemini/` directory into a repository root to activate the same command set there.
