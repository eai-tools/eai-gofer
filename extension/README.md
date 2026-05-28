# Gofer VS Code Extension

**Business-friendly workflow in VS Code for taking repository work from a
business scenario to validated delivery.**

Gofer helps teams turn a repository into a practical delivery workspace inside
VS Code. It brings together Gofer views, manifest-backed commands, CLI routing
settings, and Claude Code terminal helpers so business, delivery, and
engineering work can stay aligned from business scenario through the core
pipeline to unified validation while artifacts remain under
`.specify/specs/{feature}/`.

EnterpriseAI-first vertical app delivery workflow guidance is the default. Set
`gofer.workflowProfile` to `standard` only when you explicitly want the baseline
workflow.

## What Gofer Helps With

- Start from the business scenario before implementation work begins.
- Keep research, specification, planning, tasks, implementation, and validation
  visible in the repository.
- Give teams one place in VS Code to follow progress without overstating what
  the extension can do.

## Quick Start

1. Open the Command Palette (`Cmd/Ctrl+Shift+P`) and run **Gofer: Initialize
   Repository**.
2. Optional: run **Gofer: Install Optional Developer Tools** to install or
   update supported CLIs.
3. Start with `#0_business_scenario` in Copilot Chat or `/0_business_scenario`
   in slash-command CLIs.
4. Continue through the core pipeline:
   `business scenario -> research -> specify -> plan -> tasks -> implement -> validate`.
   `/6_gofer_validate` is the terminal quality gate and includes the final
   engineering review loop.

## Sidebar Views

| View           | Purpose                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Specifications | Follow current specs, sections, and task state from the Gofer activity view |
| AI Token Usage | Review AI usage details when provider data or local logs are available      |
| Memory         | Browse saved project context and related memory actions                     |

## Common Commands

The Command Palette and `extension/package.json` are the authoritative command
surface. Common command groups:

| Area                 | Supported commands                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup                | `Gofer: Initialize Repository`, `Gofer: Install Optional Developer Tools`, `Gofer: Upgrade to Gofer Format`, `Gofer: Update Templates`, `Gofer: Check for Updates`, `Gofer: Update Now`                                                                                                                                                   |
| Specs and views      | `Gofer: Create New Specification`, `Gofer: Open Specification`, `Gofer: Execute All Pending Specs (Dependency Order)`, `Gofer: Show Progress Panel`, `Gofer: Show Constitution Panel`, `Gofer: Show AI Usage Details`, `Gofer: Refresh Specifications`, `Gofer: Refresh Constitution`, `Gofer: Refresh AI Usage`, `Gofer: Refresh Memory` |
| Claude Code terminal | `Gofer: Start Claude Code Terminal`, `Gofer: Pause Claude Code Terminal (Send ESC)`, `Gofer: Stop Claude Code Terminal`, `Gofer: Resume Claude Code Autonomous Monitoring`, `Gofer: Resume Session from Checkpoint`, `Gofer: Check for Slop (AI Code Quality)`                                                                            |
| Memory               | `Gofer: Remember`, `Gofer: Search Memory`, `Gofer: Forget Memory`, `Gofer: Clear Memory`, `Gofer: View Memories`, `Gofer: Query Memory Usage`, `Gofer: View Compaction History`                                                                                                                                                           |

## Claude Code Terminal Workflow

- Launch with **Gofer: Start Claude Code Terminal**.
- Pause, stop, or resume monitoring with the matching terminal commands.
- Control launch behavior with `gofer.claudeCodeMode` and
  `gofer.claudeCodeCommand`.
- Control terminal visibility with `gofer.autonomous.showTerminals`.

## Configuration

```json
{
  "gofer.workflowProfile": "enterpriseai",
  "gofer.markdownViewer": "preview",
  "gofer.preferredAI": "ask",
  "gofer.claudeCodeMode": "standard",
  "gofer.defaultCLI": "auto",
  "gofer.autonomous.showTerminals": true
}
```

For the full settings reference, see
[`docs/guides/configuration.md`](../docs/guides/configuration.md). The
authoritative command and settings contract lives in `extension/package.json`.

## Development

```bash
npm install
cd extension && npm run compile
npm test
npm run lint
```
