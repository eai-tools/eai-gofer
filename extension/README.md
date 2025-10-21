# SpecGofer - VSCode Extension

**Enterprise AI Pty Ltd**

Spec-driven development for AI assistants. SpecGofer exposes 6 MCP tools that enable Claude Code and GitHub Copilot to autonomously implement features from GitHub Spec Kit specifications.

---

**© 2025 Enterprise AI Pty Ltd. All rights reserved.**

## Features

### MCP Tools for AI Assistants

SpecGofer provides 6 Model Context Protocol (MCP) tools that AI assistants can invoke:

- **`specgofer_get_specs`** - Get all specifications and tasks
- **`specgofer_get_next_task`** - Get next task based on dependencies
- **`specgofer_execute_task`** - Mark task in-progress, get full context
- **`specgofer_update_task_status`** - Update task completion status
- **`specgofer_validate_code`** - Validate code against project constitution
- **`specgofer_run_tests`** - Run Playwright tests for acceptance criteria

### GitHub Spec Kit Integration

- **Markdown-based specs** with YAML frontmatter
- **Automatic migration** from legacy JSON format
- **Branch-aware** spec management
- **Task dependencies** and parallel execution support

### Visual Progress Tracking

- **Sidebar panel** showing all specs and tasks
- **Real-time status** updates (pending, in-progress, testing, completed)
- **Constitution view** for project principles
- **Click to focus** on specific specs

### Auto-Updates

- **Automatic update checks** from GitHub releases
- **One-click installation** of new versions
- **Changelog integration** in release notes

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│               VSCode with MCP Support                    │
│                    (VSCode 1.102+)                       │
│                                                          │
│  ┌──────────────┐         ┌────────────────────────┐   │
│  │ Claude Code  │───MCP──→│ SpecGofer Extension     │   │
│  │ or Copilot   │         │ (Language Server)       │   │
│  └──────────────┘         └────────────────────────┘   │
│                                     │                   │
│                                     ↓                   │
│                           Reads/writes:                 │
│                           - .specify/specs/             │
│                           - .specify/constitution/      │
│                           - Playwright tests            │
└─────────────────────────────────────────────────────────┘

AI calls MCP tools → Implements code → Runs tests → Updates status
```

## Installation

### From GitHub Releases (Recommended)

```bash
# Download latest release
gh release download --repo eai-tools/specgofer --pattern "*.vsix"

# Install
code --install-extension specgofer-*.vsix

# Reload VSCode
```

### From Source

```bash
cd extension
npm install
npm run compile
npx @vscode/vsce package
code --install-extension specgofer-*.vsix
```

## Quick Start

### 1. Initialize SpecGofer

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: **"SpecGofer: Initialize Repository"**

This creates the `.specify/` folder structure and auto-configures MCP in `.vscode/mcp.json`.

### 2. Create a Specification

Create `.specify/specs/my-feature/spec.md`:

```markdown
---
feature: my-feature
status: draft
created: 2025-10-21
---

# My Feature

Feature description

## Functional Requirements

1. **FR-001**: First requirement
2. **FR-002**: Second requirement

## Success Criteria

- Acceptance criterion 1
- Acceptance criterion 2
```

### 3. Let AI Implement

In Claude Code or GitHub Copilot:

```
@specgofer please implement the next task
```

AI will:
1. Call `specgofer_get_next_task`
2. Implement the feature
3. Call `specgofer_run_tests`
4. Call `specgofer_update_task_status`
5. Move to next task

## Commands

| Command | Description |
|---------|-------------|
| `SpecGofer: Initialize Repository` | Create .specify folder structure |
| `SpecGofer: Upgrade to Spec Kit Format` | Migrate legacy JSON specs |
| `SpecGofer: Show Progress Panel` | Open specifications sidebar |
| `SpecGofer: Refresh Specifications` | Reload specs from disk |
| `SpecGofer: Refresh Constitution` | Reload project principles |
| `SpecGofer: Update Now` | Check for and install updates |
| `SpecGofer: Show Constitution Panel` | View project principles |

## Configuration

Configure in VSCode Settings (`Cmd/Ctrl+,`):

```json
{
  "specKit.autoInitialize": false,
  "specKit.preferredAI": "ask",
  "specKit.autoValidate": true,
  "specKit.showWelcome": true
}
```

### Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `specKit.autoInitialize` | Auto-offer initialization on first use | `false` |
| `specKit.preferredAI` | Preferred AI (claude, copilot, ask) | `"ask"` |
| `specKit.autoValidate` | Auto-validate against constitution | `true` |
| `specKit.showWelcome` | Show welcome message | `true` |

## MCP Configuration

SpecGofer automatically creates `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "specgofer": {
        "command": "node",
        "args": ["<extension-path>/language-server/dist/server.js"],
        "description": "SpecGofer - Spec-driven development orchestrator"
      }
    }
  }
}
```

**Reload VSCode** after initialization to activate MCP tools.

## Project Structure

```
extension/
├── src/
│   ├── extension.ts            # Main entry point
│   ├── lspClient.ts            # Language Server Protocol client
│   ├── mcpConfig.ts            # MCP configuration helper
│   ├── progressProvider.ts    # Specifications tree view
│   ├── constitutionProvider.ts # Constitution tree view
│   ├── specKitMigrator.ts     # Legacy JSON migration
│   ├── branchSpecManager.ts   # Git branch awareness
│   └── autoUpdater.ts         # Automatic updates
├── language-server/            # LSP server with MCP tools
│   └── dist/
│       └── server.js
└── package.json               # Extension manifest
```

## Spec Structure

```
.specify/
├── specs/
│   ├── feature-001/
│   │   └── spec.md           # Markdown with YAML frontmatter
│   └── feature-002/
│       └── spec.md
└── constitution/
    ├── principles.md         # Code quality principles
    └── architecture.md       # Architecture decisions
```

## Example Workflow

1. **Create spec** - Write `auth-001/spec.md` with 3 functional requirements
2. **Ask AI** - In Claude Code: `@specgofer implement all tasks from auth-001`
3. **AI autonomously:**
   - Gets FR-001 via `specgofer_get_next_task`
   - Implements code
   - Runs tests via `specgofer_run_tests`
   - Marks complete via `specgofer_update_task_status`
   - Moves to FR-002, then FR-003
4. **Review** - All tasks complete ✅, merge the PR!

## Troubleshooting

### MCP Tools Not Available

**Check:** `.vscode/mcp.json` exists

```bash
ls .vscode/mcp.json
```

**Fix:** Run `SpecGofer: Initialize Repository` then reload VSCode

### Language Server Not Starting

**Check:** VSCode Output panel → "SpecGofer Language Server"

**Fix:**
- Ensure node_modules installed: `cd extension && npm install`
- Rebuild: `npm run compile`
- Check VSCode version (1.85.0+)

### Specs Not Showing

**Check:** Spec file format

```bash
# Must have YAML frontmatter
head -10 .specify/specs/*/spec.md
```

**Fix:**
- Ensure `---` frontmatter delimiters
- File must be named `spec.md`
- Run `SpecGofer: Refresh Specifications`

### Extension Won't Activate

**Fix:**
- Check `.specify/` folder exists
- View "Extension Host" logs in Output panel
- Run `Developer: Reload Window`

## Development

### Running in Dev Mode

```bash
cd extension
npm install
npm run watch
```

Press `F5` to launch Extension Development Host.

### Building for Production

```bash
npm run package
```

Creates production-ready VSIX package.

### Testing MCP Tools

With Claude Code installed:

```
@specgofer specgofer_get_specs
```

Expected response:

```json
{
  "success": true,
  "count": 1,
  "specs": [...]
}
```

## Architecture

### Language Server Protocol (LSP)

SpecGofer runs a Language Server that:
- Parses GitHub Spec Kit Markdown files
- Manages spec and task state
- Exposes MCP tools via experimental capabilities
- Provides real-time updates to VSCode UI

### Model Context Protocol (MCP)

MCP tools allow AI assistants to:
- **Read** specifications and tasks
- **Execute** tasks with full context
- **Update** task status
- **Validate** code against constitution
- **Run** acceptance tests

### Branch Awareness

SpecGofer detects Git branch and shows branch-specific specs:

```
.specify/
├── specs/              # Main branch
└── branches/
    └── feature/auth/   # Branch-specific
        └── specs/
```

## Security

- API keys managed by VSCode/AI extensions
- No credentials stored by SpecGofer
- MCP tools validate input for path traversal
- Constitution validation is optional

## Support

- **Documentation:** <https://github.com/eai-tools/specgofer>
- **Issues:** <https://github.com/eai-tools/specgofer/issues>
- **Discussions:** <https://github.com/eai-tools/specgofer/discussions>

## License

MIT © 2025 Enterprise AI Pty Ltd
