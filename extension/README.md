# SpecGofer - VSCode Extension

**Enterprise AI Pty Ltd**

This VSCode extension provides automated integration between the Spec-Driven Development System and Claude Code, eliminating manual copy/paste workflows.

---

**© 2025 Enterprise AI Pty Ltd. All rights reserved.**

## Features

- **Automated Claude Code Integration** - Automatically sends tasks to Claude and captures responses
- **Real-time Progress Tracking** - Visual tree view showing spec and task progress
- **File Monitoring** - Watches `.claude-input.txt` and processes prompts automatically
- **Conversation History** - Maintains context across multiple tasks
- **SMS Escalation** - Notifies you when manual intervention is needed
- **Zero Manual Intervention** - Fully automated development workflow

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ File Monitor │  │ Claude Bridge│  │Progress Panel│     │
│  │              │  │              │  │              │     │
│  │ Watches      │→ │ Calls Claude │→ │ Shows Status │     │
│  │ .claude-     │  │ API          │  │              │     │
│  │ input.txt    │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                                │
│  .claude-output.txt   Response                             │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator Process                      │
│                                                              │
│  Reads output → Runs tests → Validates → Next task          │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

1. **Node.js** 18+ installed
2. **VSCode** 1.85.0 or higher
3. **Anthropic API Key** - Get one from [console.anthropic.com](https://console.anthropic.com)

### Step 1: Build the Extension

```bash
cd extension
npm install
npm run compile
```

### Step 2: Install in VSCode

**Option A: Development Mode**
1. Open VSCode
2. Press `F5` to open Extension Development Host
3. The extension will activate automatically when it detects a `.specify/` folder

**Option B: Package and Install**
```bash
npm install -g @vscode/vsce
vsce package
code --install-extension spec-driven-orchestrator-0.1.0.vsix
```

### Step 3: Configure API Key (Optional)

**Note**: SpecGofer uses the Anthropic API key from your VSCode environment. If you have Claude Code or GitHub Copilot configured with Claude, SpecGofer will use that authentication.

If you need to configure a separate API key:
1. Open Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "SpecGofer"
3. Enter your API key in `SpecGofer: Anthropic Api Key`

## Usage

### Starting SpecGofer

1. Open a workspace that contains a `.specify/` folder
2. Run command: `SpecGofer: Start` (Cmd/Ctrl+Shift+P)
3. The extension will:
   - Start the orchestrator process
   - Begin monitoring `.claude-input.txt`
   - Show progress panel in the Explorer sidebar

### Viewing Progress

- **Progress Panel**: Click "SpecGofer" in the Explorer sidebar
- **Status Bar**: Shows "SpecGofer Running" indicator at the bottom
- **Output Channel**: View detailed logs in "SpecGofer" output channel

### Stopping SpecGofer

Run command: `SpecGofer: Stop`

## Extension Commands

| Command | Description |
|---------|-------------|
| `SpecGofer: Start` | Start the automated orchestrator |
| `SpecGofer: Stop` | Stop the orchestrator |
| `SpecGofer: Show Progress Panel` | Open the progress tree view |
| `SpecGofer: Refresh Specs` | Reload specifications from disk |
| `SpecGofer: Check for Updates` | Manually check for extension updates |

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `specGofer.specDir` | Directory containing spec files | `.specify` |
| `specGofer.autoStart` | Auto-start on workspace open | `false` |
| `specGofer.anthropicApiKey` | Your Anthropic API key (optional) | `""` |

## Project Structure

```
extension/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── claudeCodeBridge.ts       # Claude API integration
│   ├── fileMonitor.ts            # File watching and automation
│   ├── progressProvider.ts       # Tree view provider
│   └── orchestratorProcess.ts    # Manages orchestrator subprocess
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
└── webpack.config.js              # Build configuration
```

## How the Automation Works

### 1. File Monitoring

The extension watches `.claude-input.txt` using `chokidar`:
- Detects when orchestrator writes a new task
- Ignores empty or unchanged content
- Waits for file write to stabilize (500ms)

### 2. Claude Code Bridge

When a new prompt is detected:
1. Reads prompt from `.claude-input.txt`
2. Maintains conversation history for context
3. Calls Claude API with full context
4. Writes response to `.claude-output.txt`
5. Saves conversation history to `.claude-history.json`

### 3. Orchestrator Integration

The orchestrator process:
1. Watches `.claude-output.txt` for responses
2. Runs Playwright tests automatically
3. Validates implementation with Engineer Agent
4. Writes fix requests back to `.claude-input.txt` if needed
5. Moves to next task on success

### 4. Progress Tracking

The tree view shows:
- All specs with completion status
- Individual tasks with status icons:
  - ⚪ Pending
  - 🔄 In Progress
  - 🧪 Testing
  - ✅ Completed
  - ❌ Failed
- Attempt count and dependency info

## Example Workflow

1. **You create a spec** in `.specify/login-feature.json`
2. **Start orchestrator** via command palette
3. **Extension activates** and starts monitoring
4. **Orchestrator writes task** to `.claude-input.txt`
5. **Extension detects change** and calls Claude API
6. **Claude implements feature** (creates files, writes code)
7. **Extension writes response** to `.claude-output.txt`
8. **Orchestrator runs tests** automatically
9. **Tests pass** → Move to next task
10. **Tests fail** → Engineer Agent analyzes → Fix request to `.claude-input.txt`
11. **Repeat** until all tasks complete

**You only intervene when:**
- Claude asks a question the spec can't answer
- Tests fail 3+ times
- Manual approval is needed

## Troubleshooting

### Extension Won't Activate

**Problem**: Extension doesn't activate when opening workspace

**Solution**:
- Ensure `.specify/` folder exists in workspace root
- Check VSCode Output channel "Extension Host" for errors
- Reload window: `Developer: Reload Window`

### API Key Issues

**Problem**: "API key is required" error

**Solution**:
- Set `ANTHROPIC_API_KEY` environment variable, OR
- Configure in VSCode settings, OR
- Enter when prompted on first start

### Orchestrator Process Fails

**Problem**: Orchestrator process exits immediately

**Solution**:
- Check "SpecGofer" output channel for errors
- Ensure `npm install` was run in project root
- Verify `.env` file has correct API key (if using standalone mode)
- Build orchestrator: `npm run build`

### File Monitor Not Working

**Problem**: Tasks not being processed automatically

**Solution**:
- Check if `.claude-input.txt` exists
- Verify file permissions (readable/writable)
- Check extension output for file watcher errors
- Restart orchestrator: Stop → Start

### Conversation History Too Long

**Problem**: Claude API errors about context length

**Solution**:
- Delete `.claude-history.json` to reset conversation
- Extension will start fresh conversation

## Development

### Running Extension in Dev Mode

```bash
cd extension
npm install
npm run watch  # Watch mode for development
```

Press `F5` in VSCode to launch Extension Development Host.

### Debugging

1. Set breakpoints in `src/*.ts` files
2. Press `F5` to start debugging
3. Debug console shows extension logs
4. Use `console.log()` for debugging (appears in "Extension Host" output)

### Building for Production

```bash
npm run package
```

This creates a minified `dist/extension.js` ready for distribution.

## Architecture Details

### Claude Code Bridge

The `ClaudeCodeBridge` maintains conversation context across tasks:
- Uses Anthropic SDK for API calls
- Stores message history in memory and on disk
- Provides system prompt with workspace context
- Handles questions and clarifications

### File Monitor

The `FileMonitor` uses `chokidar` for reliable file watching:
- Debounces rapid file changes (500ms stabilization)
- Prevents duplicate processing
- Handles errors gracefully
- Provides user feedback via notifications

### Progress Provider

The `ProgressProvider` implements `TreeDataProvider`:
- Reads specs from `.specify/` folder
- Updates when specs change
- Shows hierarchical spec → task structure
- Provides visual progress indicators

### Orchestrator Process

The `OrchestratorProcess` manages the Node.js subprocess:
- Spawns orchestrator with correct environment
- Captures stdout/stderr to output channel
- Handles graceful shutdown
- Provides restart capability

## Security Notes

- API keys are stored in VSCode global settings
- Never commit `.env` or `.claude-history.json`
- Conversation history may contain sensitive code
- Use `.gitignore` to exclude sensitive files

## Future Enhancements

Potential improvements:
- [ ] WebSocket mode for lower latency
- [ ] Multi-spec parallel execution
- [ ] Web UI for spec management
- [ ] GitHub integration for PR creation
- [ ] Test result visualization
- [ ] Code diff view before tests
- [ ] Rollback on test failure
- [ ] Metrics and analytics

## Support

For issues, questions, or contributions:
- GitHub Issues: [your-repo-url]
- Documentation: [your-docs-url]

## License

MIT
