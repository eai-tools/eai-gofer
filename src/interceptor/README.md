# Claude Code Interceptor

This module provides different ways to intercept and communicate with Claude
Code.

## Method 1: File-based Communication (Default)

The simplest approach - Claude Code reads prompts from `.claude-input.txt` and
writes responses to `.claude-output.txt`.

### Setup

1. The orchestrator writes prompts to `.claude-input.txt`
2. You manually copy/paste from that file into Claude Code
3. You copy Claude Code's response to `.claude-output.txt`
4. The orchestrator picks up the response and processes it

**Note**: This requires manual copying for now. See Method 3 for automation.

## Method 2: WebSocket Communication

For real-time bidirectional communication, a WebSocket server runs that Claude
Code can connect to.

### Setup

1. Start the orchestrator with WebSocket enabled
2. Create a VSCode extension that hooks into Claude Code (see vscode-extension/)
3. The extension forwards messages between Claude Code and the orchestrator

## Method 3: VSCode Extension (Recommended for automation)

Create a VSCode extension that:

1. Monitors Claude Code's chat window
2. Automatically sends responses to the orchestrator
3. Can inject prompts into Claude Code programmatically

### Files needed:

- `vscode-extension/` - Contains the VSCode extension code
- See `vscode-extension/README.md` for setup instructions

## Quick Start (File-based)

For immediate use without VSCode extension:

1. Run the orchestrator:

   ```bash
   npm start
   ```

2. The orchestrator will write to `.claude-input.txt`

3. When you see a new prompt:
   - Copy it from `.claude-input.txt`
   - Paste into Claude Code
   - Copy Claude Code's response
   - Paste into `.claude-output.txt`
   - Save the file

4. The orchestrator will automatically process the response

## Future Enhancement: Full Automation

To fully automate, you'd need to:

1. Build a VSCode extension that accesses Claude Code's webview
2. Use the VSCode API to programmatically send messages
3. Monitor Claude Code's output stream

This is more complex but would eliminate manual copying.
