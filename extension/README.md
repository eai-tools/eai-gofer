# SpecGofer VSCode Extension

**Transform any repository into a spec-driven development workspace with AI-powered automation.**

SpecGofer is a VSCode extension that provides seamless integration with the spec-driven development system, enabling developers to manage specifications, track progress, and leverage AI assistance through Claude Code integration.

---

**© 2025 Enterprise AI Pty Ltd. All rights reserved.**

## 🚀 Features

### Core Functionality

- **Auto-Detection**: Automatically activates when `.specify/` folder is detected
- **Visual Progress Tracking**: Tree view panels showing specs and tasks with status indicators
- **Constitution Management**: Display and navigate project principles and guidelines
- **Language Server Integration**: Provides MCP tools for Claude Code AI assistance

### Smart Templates

- **GitHub Integration**: Downloads latest Spec Kit templates from GitHub releases
- **Repository Initialization**: One-click setup of `.specify/` structure
- **Template Updates**: Automatic checking and updating of Spec Kit templates

### Advanced Features

- **Legacy Migration**: Converts old JSON specs to modern GitHub Spec Kit format
- **Branch-Specific Specs**: Automatically reloads specs when switching Git branches
- **Real-time Updates**: File watching with automatic refresh of tree views

### MCP Tools for AI Assistants

SpecGofer provides 6 Model Context Protocol (MCP) tools that AI assistants can invoke:

- **`specgofer_get_specs`** - Get all specifications and tasks
- **`specgofer_get_next_task`** - Get next task based on dependencies
- **`specgofer_execute_task`** - Mark task in-progress, get full context
- **`specgofer_update_task_status`** - Update task completion status
- **`specgofer_validate_code`** - Validate code against project constitution
- **`specgofer_run_tests`** - Run Playwright tests for acceptance criteria

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "SpecGofer"
4. Click "Install"

### Manual Installation

1. Download the latest `.vsix` file from [releases](https://github.com/eai-tools/specgofer/releases)
2. Open VS Code
3. Run command: `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix` file

### Development Installation

```bash
git clone https://github.com/eai-tools/specgofer.git
cd specgofer/extension
npm install
npm run compile
# Open VS Code and press F5 to launch Extension Development Host
```

## 🎯 Quick Start

### Initialize a New Repository

1. Open any workspace in VS Code
2. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
3. Run: `SpecGofer: Initialize Repository`
4. The extension will create `.specify/` structure and download latest templates

### Using with Existing Specs

1. Open a workspace containing a `.specify/` folder
2. The extension automatically activates
3. View specs in the "SpecGofer Progress" panel
4. View constitution in the "Constitution" panel

### Claude Code Integration

The extension automatically configures Claude Code integration:

1. Ensure you have VS Code 1.102+ with MCP support
2. The extension creates `.vscode/mcp.json` automatically
3. Claude Code can now access MCP tools for spec management

## 📋 Commands

| Command | Keyboard Shortcut | Description |
|---------|------------------|-------------|
| `SpecGofer: Initialize Repository` | `Ctrl+Shift+Alt+I` | Create `.specify/` structure with templates |
| `SpecGofer: Refresh Progress` | `Ctrl+Shift+Alt+R` | Manually refresh spec and task views |
| `SpecGofer: Upgrade to Spec Kit Format` | - | Convert legacy JSON specs to Spec Kit format |
| `SpecGofer: Update Templates` | - | Download latest Spec Kit templates |
| `SpecGofer: Show Progress Panel` | `Ctrl+Shift+Alt+P` | Open the progress tracking panel |
| `SpecGofer: Check for Updates` | - | Check for extension and template updates |

## How It Works

## 📊 Progress Panel

The progress panel shows:

- **Specifications**: All specs in `.specify/specs/`
- **Tasks**: Nested under each spec with dependency tracking
- **Status Icons**:
  - ✅ Completed tasks
  - 🔄 In-progress tasks
  - ⏸️ Pending tasks
  - ❌ Failed tasks

Click any spec or task to open the corresponding file.

## 📜 Constitution Panel

Displays project principles from `.specify/memory/constitution.md`:

- **Articles**: Main principle categories
- **Sections**: Detailed guidelines under each article
- **Navigation**: Click to jump to specific constitution sections

## ⚙️ Configuration

Configure the extension through VS Code settings:

```json
{
  "specgofer.autoRefresh": true,
  "specgofer.showNotifications": true,
  "specgofer.telemetryEnabled": false,
  "specgofer.templateSource": "github",
  "specgofer.updateCheckInterval": 86400000,
  "specgofer.branchSpecificSpecs": true
}
```

### Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `specgofer.autoRefresh` | `true` | Auto-refresh panels on file changes |
| `specgofer.showNotifications` | `true` | Show update and status notifications |
| `specgofer.telemetryEnabled` | `false` | Enable anonymous usage analytics |
| `specgofer.templateSource` | `"github"` | Template source: "github" or "bundled" |
| `specgofer.updateCheckInterval` | `86400000` | Update check interval in milliseconds |
| `specgofer.branchSpecificSpecs` | `true` | Reload specs when switching branches |

## 🔧 Troubleshooting

### Common Issues

#### Extension not activating

- Ensure `.specify/` folder exists in workspace root
- Check VS Code version (requires 1.85.0+)
- Restart VS Code after installation

#### Progress panel empty

- Verify specs exist in `.specify/specs/`
- Check spec files use valid GitHub Spec Kit format
- Run "SpecGofer: Refresh Progress" command

#### Language Server not starting

- Check Output panel → "SpecGofer Language Server"
- Ensure Node.js 18+ is installed
- Try restarting VS Code

#### MCP tools not available in Claude Code

- Verify VS Code 1.102+ for native MCP support
- Check `.vscode/mcp.json` was created
- Restart Claude Code after installation

#### Template download fails

- Check internet connection
- Verify GitHub API rate limits
- Extension falls back to bundled templates

### Getting Help

1. **Check Logs**: View Output panel → "SpecGofer" channel
2. **Report Issues**: [GitHub Issues](https://github.com/eai-tools/specgofer/issues)
3. **Documentation**: [Full Documentation](https://github.com/eai-tools/specgofer/tree/main/docs)

## 🏗️ Architecture

The extension works through a dual-protocol approach:

```text
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

### Development

#### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

#### Architecture

- **Extension**: TypeScript VSCode extension
- **Language Server**: Dual LSP+MCP server for Claude integration
- **MCP Tools**: 6 tools for spec management automation

#### Building

```bash
cd extension
npm install
npm run compile
npm run test
npx @vscode/vsce package
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [GitHub Spec Kit](https://github.com/github/spec-kit) format
- Inspired by spec-driven development principles
- Powered by Claude AI through MCP integration

---

**Enterprise AI Pty Ltd** - Transforming development with AI-powered specifications.

## System Architecture

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

```text
.specify/
├── specs/              # Main branch specs
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
