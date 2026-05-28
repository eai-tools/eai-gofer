# EAI Gofer Agent Plugin

Version: 3.4.3

This package is the portable Claude, Gemini, Codex, and Copilot workflow layer for public Gofer. It is released beside the VS Code extension, but it does not replace the VSIX UI, status views, updater, or language-server features.

## Public Sources

Use the public GitHub repository as the install source for Claude Code, Codex, Copilot CLI, and Gemini CLI:

```text
https://github.com/eai-tools/eai-gofer
```

Use the public release host for downloadable artifacts:

```text
https://eai-tools.github.io/eai-gofer/releases
```

That host publishes:

- Latest VS Code extension: `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-latest.vsix`
- Latest agent bundle zip: `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-latest.zip`
- This release VS Code extension: `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-3.4.3.vsix`
- This release agent bundle zip: `https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-3.4.3.zip`
- Shared public bundle directory: `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer`
- Gemini extension manifest alias: `https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/gemini-extension.json`

## Distribution Modes

| Surface | Public install / update path | Stable local path |
| ------- | ---------------------------- | ----------------- |
| Claude Code | `claude plugin marketplace add https://github.com/eai-tools/eai-gofer --scope user --sparse .claude-plugin --sparse plugins/eai-gofer` then `claude plugin install eai-gofer@eai-gofer --scope user` | Unzip to `~/plugins/eai-gofer`, then `claude plugin marketplace add ~/plugins/eai-gofer --scope user` |
| Codex | `codex plugin marketplace add https://github.com/eai-tools/eai-gofer --sparse .agents/plugins --sparse plugins/eai-gofer` then `codex plugin add eai-gofer@eai-gofer` | Unzip to `~/plugins/eai-gofer`, then `codex plugin marketplace add ~/plugins/eai-gofer` |
| GitHub Copilot CLI | `copilot plugin marketplace add https://github.com/eai-tools/eai-gofer` then `copilot plugin install eai-gofer@eai-gofer` | Unzip to `~/plugins/eai-gofer`, then `copilot plugin marketplace add ~/plugins/eai-gofer` |
| Gemini CLI | `gemini extensions install https://github.com/eai-tools/eai-gofer` | Unzip to `~/plugins/eai-gofer`, then `gemini extensions install ~/plugins/eai-gofer` |

## Download And Replace The Local Bundle Folder

Keep the downloaded bundle path stable:

```text
~/plugins/eai-gofer
```

Download the public release asset, remove the old folder, unzip the package into `~/plugins`.

```bash
curl -fsSL https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-latest.zip -o /tmp/eai-gofer-agent-plugin-latest.zip

rm -rf ~/plugins/eai-gofer
unzip /tmp/eai-gofer-agent-plugin-latest.zip -d ~/plugins
```

## Claude Code

Recommended public install:

```bash
claude plugin marketplace add https://github.com/eai-tools/eai-gofer --scope user --sparse .claude-plugin --sparse plugins/eai-gofer
claude plugin install eai-gofer@eai-gofer --scope user
```

Downloaded bundle install:

```bash
claude plugin marketplace add ~/plugins/eai-gofer --scope user
claude plugin install eai-gofer@eai-gofer --scope user
```

## Codex

Recommended public install:

```bash
codex plugin marketplace add https://github.com/eai-tools/eai-gofer --sparse .agents/plugins --sparse plugins/eai-gofer
codex plugin add eai-gofer@eai-gofer
```

Downloaded bundle install:

```bash
codex plugin marketplace add ~/plugins/eai-gofer
codex plugin add eai-gofer@eai-gofer
```

## Copilot CLI

Recommended public install:

```bash
copilot plugin marketplace add https://github.com/eai-tools/eai-gofer
copilot plugin install eai-gofer@eai-gofer
```

Downloaded bundle install:

```bash
copilot plugin marketplace add ~/plugins/eai-gofer
copilot plugin install eai-gofer@eai-gofer
```

## Gemini CLI

Recommended public install:

```bash
gemini extensions install https://github.com/eai-tools/eai-gofer
```

Downloaded bundle install:

```bash
gemini extensions install ~/plugins/eai-gofer
```
