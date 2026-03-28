# Multi-Provider CLI Support

Gofer supports multiple AI CLI providers — **Claude Code CLI** and **OpenAI
Codex CLI** — through a unified provider abstraction. All Gofer pipeline stages,
autonomous mode, and validation agents work identically across both providers.

---

## Installing a CLI Provider

### Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

Set your API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or in VSCode Settings: search for `gofer.anthropicApiKey`.

### OpenAI Codex CLI

```bash
npm install -g @openai/codex-cli
```

Verify:

```bash
codex --version
```

Set your API key:

```bash
export OPENAI_API_KEY="sk-proj-..."
```

Or in VSCode Settings: search for `gofer.openaiApiKey`.

---

## Selecting a Provider

Open VSCode Settings (`Cmd/Ctrl+,`) and search for **`gofer.cliProvider`**.

| Value    | Description                                       |
| -------- | ------------------------------------------------- |
| `auto`   | Auto-detect: uses Claude if installed, else Codex |
| `claude` | Always use Claude Code CLI                        |
| `codex`  | Always use OpenAI Codex CLI                       |

The default is `auto`. Provider changes take effect **immediately** — no VSCode
reload required.

---

## Provider Comparison

| Feature                  | Claude Code CLI           | OpenAI Codex CLI        |
| ------------------------ | ------------------------- | ----------------------- |
| Gofer pipeline stages    | ✅ Full support           | ✅ Full support         |
| Autonomous mode          | ✅ Full support           | ✅ Full support         |
| LLM Council              | ✅ Full support           | ✅ Full support         |
| Validation agents        | ✅ Full support           | ✅ Full support         |
| MCP server integration   | ✅ Yes                    | ❌ Not supported        |
| Web search               | ❌ Not supported          | ✅ Yes                  |
| Usage logs               | `~/.claude/history.jsonl` | `~/.codex/history.json` |
| Minimum version required | 1.0.0                     | 2.0.0                   |
| Model family             | Claude (Anthropic)        | GPT (OpenAI)            |
| Cost                     | Anthropic pricing         | OpenAI pricing          |

### Capability Notes

- **MCP servers**: Claude CLI natively supports MCP server integration for tool
  calling. Switching to Codex will skip MCP features gracefully, with a
  notification.
- **Web search**: Codex CLI includes built-in web search. Switching to Claude
  for web search shows a notification.
- **Conversation history**: Both providers maintain full conversation context
  across pipeline stages.

---

## Auto-Detection

When `gofer.cliProvider` is set to `auto`, Gofer checks for installed CLIs in
order:

1. **Claude Code CLI** — detected by running `claude --version`
2. **OpenAI Codex CLI** — detected by running `codex --version`

The first available CLI is used. If neither is found, Gofer shows an error with
installation instructions for both.

Auto-detection runs during extension activation and completes in under 2
seconds.

---

## Troubleshooting

### Provider not found

**Symptom**: Error notification — _"[CLI] not found. Install with: ..."_

**Cause**: The selected CLI is not installed or not on `PATH`.

**Fix**:

1. Install the CLI (see [Installing a CLI Provider](#installing-a-cli-provider)
   above).
2. Verify the command works in your terminal (`claude --version` or
   `codex --version`).
3. If using a non-standard install path, set a custom command in VSCode
   Settings:
   - `gofer.claudeCodeCommand` — path to `claude` binary
   - `gofer.codexCommand` — path to `codex` binary

---

### Authentication failure

**Symptom**: Error notification — _"[CLI] found but not authenticated."_

**Cause**: The CLI is installed but the API key is missing or invalid.

**Claude fix**:

```bash
# Option 1 — environment variable
export ANTHROPIC_API_KEY="sk-ant-..."

# Option 2 — interactive login
claude login
```

**Codex fix**:

```bash
# Option 1 — environment variable
export OPENAI_API_KEY="sk-proj-..."

# Option 2 — interactive login
codex login
```

---

### Provider version incompatible

**Symptom**: Warning — _"Claude CLI version X.Y.Z is below minimum 1.0.0. Please
upgrade."_

**Fix**:

```bash
# Upgrade Claude Code CLI
npm install -g @anthropic-ai/claude-code@latest

# Upgrade Codex CLI
npm install -g @openai/codex-cli@latest
```

---

### Switching provider has no effect

**Symptom**: After changing `gofer.cliProvider` in settings, the old provider is
still used.

**Fix**: The provider change should apply immediately. Check:

1. The setting was saved (VSCode Settings auto-saves).
2. No error notification appeared (which would indicate the new provider failed
   health check).
3. Try running any Gofer command to re-trigger provider initialization.

---

### MCP features not working after switching to Codex

**Symptom**: MCP server integration silently inactive after switching from
Claude to Codex.

**Cause**: MCP server support is a Claude-specific capability.

**Fix**: Switch `gofer.cliProvider` back to `claude` (or `auto`, which will
prefer Claude if installed).

---

## Related Documentation

- [Claude Code CLI Setup](./setup-claude-code.md)
- [OpenAI Codex CLI Setup](./setup-codex-cli.md)
- [CLI Comparison (Feb 2026)](./cli-comparison-feb-2026.md)
