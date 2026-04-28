<div class="hero-section">
  <h1>Gofer</h1>
  <p>Spec-driven delivery for AI coding assistants across Claude Code, GitHub Copilot, OpenAI Codex, and Gemini CLI.</p>
  <div class="hero-buttons">
    <a href="#/quickstart" class="hero-btn hero-btn-primary">Get Started</a>
    <a href="#/cli-support" class="hero-btn hero-btn-secondary">CLI Support</a>
  </div>
</div>

## What Gofer Installs

Gofer adds a Markdown-first delivery pipeline to your repository. The same
source material is emitted for each assistant surface:

| Assistant      | Installed files                                        | How you use it                              |
| -------------- | ------------------------------------------------------ | ------------------------------------------- |
| Claude Code    | `.claude/commands/`                                    | Slash commands, full automation, MCP, hooks |
| GitHub Copilot | `.github/prompts/`                                     | Prompt files and Copilot Chat commands      |
| OpenAI Codex   | `.agents/skills/` plus global `~/.codex/skills/` link  | Codex skills with stale config repair       |
| Gemini CLI     | `.gemini/commands/gofer/` and `.gemini/extension.json` | Gemini extension commands                   |

## Core Pipeline

```text
0a_problem_validation -> 1_gofer_research -> 2_gofer_specify
-> 3_gofer_plan -> 4_gofer_tasks -> 5_gofer_implement
-> 6_gofer_validate -> 7a_stakeholder_comms
```

Claude Code also carries the Claude-specific orchestration, save/resume, and
hydration commands. Codex and Gemini intentionally receive the portable pipeline
commands so their skill lists stay small and reliable.

## Start Here

1. Install the VSIX from the [Releases page](/gofer/releases.html ':ignore').
2. Run **Gofer: Initialize Repository** in VS Code.
3. Pick your assistant and run a Gofer command.

See [Quick Start](quickstart.md) for the shortest setup path, or
[CLI Support](cli-support.md) for the exact command names and install behavior
for each assistant.

<div class="release-card" id="latestRelease">
  <h3>Latest Release</h3>
  <p>Loading...</p>
</div>

_Enterprise AI Pty Ltd. All rights reserved._
