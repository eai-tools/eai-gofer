# Enterprise AI Gofer

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

## EnterpriseAI Public Platform Boundary

When the EnterpriseAI workflow profile is active, Gofer must distinguish public
builder knowledge from private platform implementation detail. Public artifacts
can reference EAI CLI commands, PublicAPI behavior, template conventions,
support documentation, and product-safe statuses such as `available`,
`operator_required`, `paid_upgrade_required`, `rate_limited`, `blocked`, and
`unsupported`. They must not describe private service topology, secret
locations, direct downstream credentials, or bypass paths around plan and AuthZ
controls.

Use public checks first:

```bash
eai whoami
eai doctor --check-updates
eai workflow readiness <workflow-key>
eai workflow status <workflow-key>
eai workflow request <workflow-key> --reason "Describe the app journey"
eai provision entra --rotate-secret
```

If the public API reports a missing capability, Gofer should capture whether it
is available now, purchasable, operator-assisted, or unavailable without new
platform work, then plan through the public contract rather than asking builders
to depend on private internals.

## Quick Start

1. Install or open the Gofer VS Code extension.
2. Run **Gofer: Initialize Repository** from the Command Palette.
3. Start with `/0_business_scenario ...` in slash-command CLIs or
   `#0_business_scenario ...` in Copilot Chat.
4. Continue through
   `research -> specify -> plan -> tasks -> implement -> validate`.

## Installation Options

Gofer ships in two complementary forms:

- **VS Code extension** — installs from the VS Code Marketplace and provides the
  UI, status views, updater, packaged resources, and language-server features.
- **Agent plugin** — installs into Claude Code, Codex, or GitHub Copilot CLI so
  the Gofer workflow can run in terminal/chat agents without the VS Code UI.

### VS Code Marketplace

Install **Gofer for EnterpriseAI Vertical App Delivery** from the VS Code
Marketplace, or install the release VSIX from GitHub Releases.

Release automation publishes the VSIX and agent plugin zip to the public GitHub
Pages release host at `https://eai-tools.github.io/eai-gofer/releases/` every
time and to the VS Code Marketplace when the release workflow has `VSCE_PAT`
configured. Releases from `v3.4.0` onward are kept available there for
unauthenticated downloads.

### Agent Plugin Distribution Modes

| Surface            | Marketplace / published mode                                                                                                                                                | Local release-test mode                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Claude Code        | `claude plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer --scope user` then `claude plugin install eai-gofer@eai-gofer --scope user` | Download the public zip, unzip to `~/plugins/eai-gofer`, then install `eai-gofer@eai-gofer`            |
| Codex              | Import `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer` in the Codex plugin UI, or download the public zip and keep the installed folder stable           | Keep the installed plugin folder at `~/plugins/eai-gofer` when using a downloaded bundle               |
| GitHub Copilot CLI | `copilot plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer` then `copilot plugin install eai-gofer@eai-gofer`                         | `copilot plugin marketplace add ~/plugins/eai-gofer` then `copilot plugin install eai-gofer@eai-gofer` |

### Claude Code Plugin

Register the public Gofer plugin marketplace from the public release host:

```bash
claude plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer --scope user
claude plugin install eai-gofer@eai-gofer --scope user
```

For local release testing or explicit version pinning, use the stable folder
flow. Replace `3.4.0` with any public release version from `3.4.0` onward:

```bash
curl -fsSL https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-3.4.0.zip \
  -o /tmp/eai-gofer-agent-plugin-3.4.0.zip

rm -rf ~/plugins/eai-gofer
unzip /tmp/eai-gofer-agent-plugin-3.4.0.zip -d ~/plugins

claude plugin marketplace add ~/plugins/eai-gofer --scope user
claude plugin install eai-gofer@eai-gofer --scope user
```

The local marketplace source is the unzipped folder, not the release zip.

### Codex Plugin

For Codex plugin installs, the public hosted bundle is:

```text
https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer
```

For downloaded installs, keep the stable folder path:

```text
~/plugins/eai-gofer/
```

Use this local marketplace entry so future updates only replace the folder
contents:

```json
{
  "name": "eai-gofer",
  "source": {
    "source": "local",
    "path": "./"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Coding"
}
```

### GitHub Copilot CLI Plugin

Install through the public release-hosted marketplace:

```bash
copilot plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer
copilot plugin install eai-gofer@eai-gofer
```

For local release testing, register the same unzipped folder as a local
marketplace, then install from that marketplace:

```bash
copilot plugin marketplace add ~/plugins/eai-gofer
copilot plugin install eai-gofer@eai-gofer
```

### Release Asset Update Flow

For every new Gofer release, use the canonical release script. It bumps
versions, regenerates command surfaces, packages the VSIX, packages the agent
plugin zip, updates the public release host, runs validation, and publishes the
release:

```bash
./release.sh patch "Fix validation findings"
```

`release-auto.sh` remains as a compatibility wrapper and forwards to
`release.sh`.

The published GitHub Release must include:

- `eai-gofer-<version>.vsix`
- `eai-gofer-agent-plugin-<version>.zip`
- `gofer-v<version>.tar.gz`

## Pipeline Stages

| Stage             | Command                | Main output                                |
| ----------------- | ---------------------- | ------------------------------------------ |
| Business scenario | `/0_business_scenario` | Full pipeline kickoff                      |
| Research          | `/1_gofer_research`    | `research.md`                              |
| Specify           | `/2_gofer_specify`     | `spec.md`                                  |
| Plan              | `/3_gofer_plan`        | `plan.md`, `data-model.md`, contracts      |
| Tasks             | `/4_gofer_tasks`       | `tasks.md`, `traceability.md`, `issues.md` |
| Implement         | `/5_gofer_implement`   | Code and doc changes                       |
| Validate          | `/6_gofer_validate`    | Validation artifacts                       |

## Assistant Surfaces

| Assistant      | Generated surface                                                | Command style                             |
| -------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| Claude Code    | `.claude/commands/`                                              | `/1_gofer_research ...`                   |
| GitHub Copilot | `.github/prompts/`                                               | `#1_gofer_research ...`                   |
| OpenAI Codex   | `.agents/skills/` (legacy `.system/skills/` mirror also emitted) | Ask Codex to use the relevant Gofer skill |
| Gemini CLI     | `.gemini/commands/gofer/`                                        | `/gofer:1_gofer_research ...`             |

The agent plugin packages the same command set into `commands/`, `agents/`, and
`skills/` so Claude Code, Codex, and Copilot CLI can discover Gofer from a
marketplace or local plugin folder.

## Repository Layout

| Path                 | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `extension/`         | VS Code extension package and packaged resources  |
| `language-server/`   | Language server and MCP-facing support            |
| `src/`               | Node-based orchestration and generation utilities |
| `docs/`              | User and developer documentation                  |
| `.specify/commands/` | Canonical Gofer command source                    |
| `.specify/specs/`    | Feature artifacts and generated deliverables      |

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
npm run gofer:package-plugin -- --version 3.4.0 --sync-repo
```

## Configuration and Docs

- `extension/README.md` — VS Code extension usage
- `docs/guides/configuration.md` — manifest-backed settings reference
- `extension/package.json` — authoritative VS Code command and settings contract
- `docs/cli-support.md` — CLI setup guidance for Claude, Copilot, Codex, and
  Gemini
