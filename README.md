# Gofer

Gofer is a spec-driven workflow for repositories. It helps teams move work from
an initial business scenario through research, specification, planning, tasks,
implementation, and validation while keeping the working artifacts in
`.specify/`.

It combines a VS Code extension, generated CLI command surfaces, and repo-local
artifacts so the end-to-end flow stays visible and easier to review across
business, delivery, and engineering conversations.

Gofer supports Claude Code, GitHub Copilot, Codex, and Gemini command surfaces.
Gofer defaults to an EnterpriseAI-first workflow profile while preserving the
standard workflow as an explicit opt-out. Set `gofer.workflowProfile` to
`standard` only when you explicitly want the baseline workflow.

## Quick Start

1. Install or open the Gofer VS Code extension.
2. Run **Gofer: Initialize Repository** from the Command Palette.
3. Start with `/0_business_scenario ...` in slash-command CLIs or
   `#0_business_scenario ...` in Copilot Chat.
4. Continue through `research -> specify -> plan -> tasks -> implement ->
   validate`.

## Pipeline Stages

| Stage | Command | Main output |
| ----- | ------- | ----------- |
| Business scenario | `/0_business_scenario` | Full pipeline kickoff |
| Research | `/1_gofer_research` | `research.md` |
| Specify | `/2_gofer_specify` | `spec.md` |
| Plan | `/3_gofer_plan` | `plan.md`, `data-model.md`, contracts |
| Tasks | `/4_gofer_tasks` | `tasks.md`, `traceability.md`, `issues.md` |
| Implement | `/5_gofer_implement` | Code and doc changes |
| Validate | `/6_gofer_validate` | Validation artifacts |

## Assistant Surfaces

| Assistant | Generated surface | Command style |
| --------- | ----------------- | ------------- |
| Claude Code | `.claude/commands/` | `/1_gofer_research ...` |
| GitHub Copilot | `.github/prompts/` | `#1_gofer_research ...` |
| OpenAI Codex | `.agents/skills/` and `.system/skills/` | Ask Codex to use the relevant Gofer skill |
| Gemini CLI | `.gemini/commands/gofer/` | `/gofer:1_gofer_research ...` |

## Repository Layout

| Path | Purpose |
| ---- | ------- |
| `extension/` | VS Code extension package and packaged resources |
| `language-server/` | Language server and MCP-facing support |
| `src/` | Node-based orchestration and generation utilities |
| `docs/` | User and developer documentation |
| `.specify/commands/` | Canonical Gofer command source |
| `.specify/specs/` | Feature artifacts and generated deliverables |

## Configuration

```json
{
  "gofer.workflowProfile": "enterpriseai",
  "gofer.autoInitialize": false,
  "gofer.preferredAI": "ask"
}
```

## Development

```bash
npm install
cd extension && npm run compile
npm test
npm run lint
npm run typecheck
npm run gofer:generate
```

## Configuration and Docs

- `extension/README.md` — VS Code extension usage
- `docs/guides/configuration.md` — manifest-backed settings reference
- `extension/package.json` — authoritative VS Code command and settings contract
- `docs/cli-support.md` — CLI setup guidance for Claude, Copilot, Codex, and Gemini
