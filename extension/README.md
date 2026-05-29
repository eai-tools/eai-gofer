# Gofer VS Code Extension

Gofer brings the spec-driven workflow into VS Code. It keeps repository work
visible from business scenario through validation, mirrors the repo-owned
`.specify/` scaffold, and packages the resources needed by the Gofer pipeline.

## What It Does

- initializes the repo-owned Gofer scaffold
- surfaces specs, memory, and progress inside VS Code
- helps launch and monitor supported AI CLI workflows
- keeps the VS Code surface aligned with the portable
  Claude/Codex/Copilot/Gemini bundle

## Quick Start

1. Open the Command Palette and run **Gofer: Initialize Repository**.
2. Optional: run **Gofer: Install Optional Developer Tools**.
3. Start with `/0_business_scenario` in slash-command CLIs or
   `#0_business_scenario` in Copilot Chat.
4. Progress through the core pipeline:
   `business scenario -> research -> specify -> plan -> tasks -> implement -> validate`.

## Common Commands

- `Gofer: Initialize Repository`
- `Gofer: Install Optional Developer Tools`
- `Gofer: Upgrade to Gofer Format`
- `Gofer: Show Progress Panel`
- `Gofer: Check for Updates`
- `Gofer: Update Now`

The authoritative command and settings contract lives in
[`extension/package.json`](/Users/eai-douglasross/Code/eai/eai-tools/gofer/extension/package.json).

## Configuration

```json
{
  "gofer.markdownViewer": "preview",
  "gofer.preferredAI": "ask",
  "gofer.claudeCodeMode": "standard",
  "gofer.defaultCLI": "auto",
  "gofer.autonomous.showTerminals": true
}
```

For the broader project documentation, see:

- [README.md](/Users/eai-douglasross/Code/eai/eai-tools/gofer/README.md)
- [Technical Docs Overview](/Users/eai-douglasross/Code/eai/eai-tools/gofer/.tech-docs/overview.md)
- [Configuration Reference](/Users/eai-douglasross/Code/eai/eai-tools/gofer/.tech-docs/configuration.md)
