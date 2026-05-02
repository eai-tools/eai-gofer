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

## Codex Install Model

Gofer initialization and template updates install Codex skills into the
repository-local `.agents/skills/` tree that Codex scans automatically.

The installer:

- Generates Codex skills into `.agents/skills/`.
- Emits the legacy `.system/skills/` mirror for older Gofer compatibility only.
- Ships `codex-config.toml` as a sample of path-based `[[skills.config]]`
  overrides for `~/.codex/config.toml` when a team explicitly wants per-skill
  enablement control.
- Does not create global `~/.codex/skills/` bundles during normal installs or
  template updates.

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
3. Make sure you launched Codex from inside the repository so it can scan
   `.agents/skills/`.
4. If you intentionally use `~/.codex/config.toml`, check that it does not
   disable the repository skill folders.
5. If you are cleaning up an older install that copied Gofer into
   `~/.codex/skills/`, run `npm run gofer:codex-doctor -- --root ~/.codex/skills`.

If Gemini does not show commands, confirm `.gemini/extension.json` and
`.gemini/commands/gofer/` exist in the repository.
