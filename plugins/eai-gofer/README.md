# EAI Gofer Agent Plugin

Version: 3.4.3

This package is the portable Claude, Codex, and Copilot workflow layer for public Gofer. It is released beside the VS Code extension, but it does not replace the VSIX UI, status views, updater, or language-server features.

## Public Release Host

All public release artifacts ship under:

```text
https://eai-tools.github.io/eai-gofer/releases
```

That host publishes:

- VS Code extension: `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-3.4.3.vsix`
- Agent plugin zip: `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-3.4.3.zip`
- Stable public plugin bundle: `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer`

## Distribution Modes

| Surface | Public install / update path | Stable local folder path |
| ------- | ---------------------------- | ------------------------ |
| Claude Code | `claude plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer --scope user` then `claude plugin install eai-gofer@eai-gofer --scope user` | `~/plugins/eai-gofer` |
| Codex | Import the public plugin bundle URL `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer` in the Codex plugin UI, or download the zip below and keep the installed folder path stable | `~/plugins/eai-gofer` |
| GitHub Copilot CLI | `copilot plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer` then `copilot plugin install eai-gofer@eai-gofer` | `~/plugins/eai-gofer` |

## Download And Replace The Local Folder

Keep the local install path stable:

```text
~/plugins/eai-gofer
```

Download the public release asset, remove the old folder, unzip the package into `~/plugins`, then reload Codex, Claude Code, or Copilot CLI.

```bash
curl -fsSL https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-3.4.3.zip -o /tmp/eai-gofer-agent-plugin-3.4.3.zip

rm -rf ~/plugins/eai-gofer
unzip /tmp/eai-gofer-agent-plugin-3.4.3.zip -d ~/plugins
```

## Claude Code

```bash
claude plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer --scope user
claude plugin install eai-gofer@eai-gofer --scope user
```

## Codex

Use the public plugin bundle URL in the Codex plugin import / marketplace UI:

```text
https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer
```

If you prefer a downloaded folder install, replace `~/plugins/eai-gofer` from the zip above and keep the Codex plugin entry pointed at that stable folder.

## Copilot CLI

Register the public bundle as a marketplace or use the same downloaded local folder:

```bash
copilot plugin marketplace add https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer
copilot plugin install eai-gofer@eai-gofer
```
