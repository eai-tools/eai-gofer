# Quick Start

Install Gofer, initialize a repository, and run the pipeline from your preferred
AI assistant.

## Install

1. Download the latest VSIX from [Releases](/gofer/releases.html ':ignore').
2. In VS Code, run **Extensions: Install from VSIX**.
3. Open your project folder.
4. Run **Gofer: Initialize Repository**.

Gofer creates the pipeline files, assistant command files, scripts, templates,
and instruction files in your repository.

## Run A Command

Use the command style for your assistant:

| Assistant      | Example                                               |
| -------------- | ----------------------------------------------------- |
| Claude Code    | `/0_business_scenario Add a user preferences page`    |
| GitHub Copilot | `#1_gofer_research Add a user preferences page`       |
| OpenAI Codex   | Ask Codex to use the `gofer/1_gofer_research` skill   |
| Gemini CLI     | `/gofer:1_gofer_research Add a user preferences page` |

Claude Code has the full orchestrator command. For Codex and Gemini, start at
`0a_problem_validation` or `1_gofer_research` and continue through the portable
pipeline stages.

## Outputs

Gofer stores artifacts in `.specify/specs/{feature}/`:

| Stage              | Output                              |
| ------------------ | ----------------------------------- |
| Problem validation | `problem-brief.md`                  |
| Research           | `research.md`, `proposal-review.md` |
| Specify            | `spec.md`                           |
| Plan               | `plan.md`, contracts, data model    |
| Tasks              | `tasks.md`                          |
| Implement          | Source changes                      |
| Validate           | `validation-report.md`              |
| Stakeholder comms  | `stakeholder-comms.md`              |

## Codex Note

Initialization now installs the official Codex repo-local path:

- Generates Codex skills into `.agents/skills/`.
- Emits the legacy `.system/skills/` mirror for older Gofer compatibility.
- Leaves `codex-config.toml` as an optional sample for `~/.codex/config.toml`
  path overrides when you need explicit per-skill enablement control.

Restart Codex after initialization or template updates so it rediscovers the
skills.

## Next

- [CLI Support](cli-support.md)
- [Pipeline](pipeline/README.md)
- [Configuration](guides/configuration.md)
