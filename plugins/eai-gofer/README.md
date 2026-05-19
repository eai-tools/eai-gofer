# EAI Gofer Agent Plugin

Version: 3.4.0

This package is the portable Claude, Codex, and Copilot workflow layer for
public Gofer. It is released beside the VS Code extension, but it does not
replace the VSIX UI, status views, updater, or language-server features.

## Distribution Modes

| Surface            | Marketplace / published mode                                                                                                                                          | Local release-test mode                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Claude Code        | `claude plugin marketplace add eai-tools/gofer --scope user` then `claude plugin install eai-gofer@eai-gofer --scope user`                                            | Unzip this release to `~/plugins/eai-gofer`, then install `eai-gofer@eai-gofer-local`                        |
| Codex              | Public marketplace publishing is prepared by `.codex-plugin/plugin.json`; local/import is the supported test path until external marketplace publication is available | Add `~/plugins/eai-gofer` through Codex local marketplace/import and keep the stable path unchanged          |
| GitHub Copilot CLI | `copilot plugin marketplace add eai-tools/gofer` then `copilot plugin install eai-gofer@eai-gofer`                                                                    | `copilot plugin marketplace add ~/plugins/eai-gofer` then `copilot plugin install eai-gofer@eai-gofer-local` |

## Install Or Update Locally

Keep the local install path stable:

```text
~/plugins/eai-gofer
```

Download this release asset, remove the old folder, unzip the package into
`~/plugins`, then reload Codex, Claude Code, or Copilot CLI.

```bash
gh release download v3.4.0 \
  --repo eai-tools/gofer \
  --pattern "eai-gofer-agent-plugin-3.4.0.zip" \
  --dir /tmp/eai-gofer-plugin

rm -rf ~/plugins/eai-gofer
unzip /tmp/eai-gofer-plugin/eai-gofer-agent-plugin-3.4.0.zip -d ~/plugins
```

## Claude Code

```bash
claude plugin marketplace add ~/plugins/eai-gofer --scope user
claude plugin install eai-gofer@eai-gofer-local --scope user
```

## Codex Local Marketplace Entry

```json
{
  "name": "eai-gofer",
  "source": {
    "source": "local",
    "path": "./plugins/eai-gofer"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Coding"
}
```

## Copilot CLI

Register the unzipped folder as a local marketplace, then install from that
marketplace:

```bash
copilot plugin marketplace add ~/plugins/eai-gofer
copilot plugin install eai-gofer@eai-gofer-local
```
