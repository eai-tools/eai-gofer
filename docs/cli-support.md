# CLI Support

Gofer emits assistant-specific files from the same command set so teams can use
Claude Code, GitHub Copilot, OpenAI Codex, and Gemini CLI without maintaining
separate workflows.

## Command Surfaces

| Assistant      | Files                           | Invocation                       |
| -------------- | ------------------------------- | -------------------------------- |
| Claude Code    | `.claude/commands/*.md`         | `/1_gofer_research ...`          |
| GitHub Copilot | `.github/prompts/*.prompt.md`   | `#1_gofer_research ...`          |
| OpenAI Codex   | `.agents/skills/**/SKILL.md`    | Ask Codex to use the Gofer skill |
| Gemini CLI     | `.gemini/commands/gofer/*.toml` | `/gofer:1_gofer_research ...`    |

## Availability

| Command                       | Claude | Copilot | Codex | Gemini |
| ----------------------------- | ------ | ------- | ----- | ------ |
| `0_business_scenario`         | Yes    | Yes     | Yes   | Yes    |
| `0a_problem_validation`       | Yes    | Yes     | Yes   | Yes    |
| `1_gofer_research`            | Yes    | Yes     | Yes   | Yes    |
| `2_gofer_specify`             | Yes    | Yes     | Yes   | Yes    |
| `3_gofer_plan`                | Yes    | Yes     | Yes   | Yes    |
| `4_gofer_tasks`               | Yes    | Yes     | Yes   | Yes    |
| `5_gofer_implement`           | Yes    | Yes     | Yes   | Yes    |
| `6_gofer_validate`            | Yes    | Yes     | Yes   | Yes    |
| `6a_gofer_engineering_review` | Yes    | Yes     | Yes   | Yes    |
| `7_gofer_save`                | Yes    | Yes     | Yes   | Yes    |
| `7a_stakeholder_comms`        | Yes    | Yes     | Yes   | Yes    |
| `8_gofer_resume`              | Yes    | Yes     | Yes   | Yes    |
| `9_gofer_tests`               | Yes    | Yes     | Yes   | Yes    |
| `10_gofer_cloud`              | Yes    | Yes     | Yes   | Yes    |
| `gofer_constitution`          | Yes    | Yes     | Yes   | Yes    |
| `gofer_hydrate`               | Yes    | Yes     | Yes   | Yes    |
| `gofer:personality`           | Yes    | Yes     | Yes   | Yes    |
| `gofer:plan`                  | Yes    | Yes     | Yes   | Yes    |
| `gofer:side`                  | Yes    | Yes     | Yes   | Yes    |

All generated Gofer stages and helper commands are emitted for Claude, Copilot,
Codex, and Gemini. The generators no longer apply a CLI-specific "Claude-only"
exclusion list.

## Codex Install Repair

Gofer initialization and template updates now check Codex access even when the
rest of the repository already looks complete.

The installer:

- Generates Codex skills and mirrors them into `.agents/skills/`.
- Creates a global symlink under `~/.codex/skills/`.
- Avoids replacing another project if a symlink name is already taken.
- Repairs stale `enabled = false` entries in `~/.codex/config.toml` only when
  those entries point at the current Gofer install.

Restart Codex after running **Gofer: Initialize Repository** or **Gofer: Update
Templates**.

## Gemini

Gemini uses the repository extension manifest:

```text
.gemini/extension.json
.gemini/commands/gofer/<stage>.toml
```

The Gemini command set matches the Codex, Claude, and Copilot command set.

## Troubleshooting

If Codex does not show Gofer skills:

1. Run **Gofer: Update Templates** in VS Code.
2. Restart Codex.
3. Check that `~/.codex/skills/` has a symlink for the project.
4. Check that `~/.codex/config.toml` does not still disable that symlink's
   `SKILL.md` paths.

If Gemini does not show commands, confirm `.gemini/extension.json` and
`.gemini/commands/gofer/` exist in the repository.
