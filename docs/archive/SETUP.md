# Complete Setup Guide - Spec-Driven Development System

This guide will walk you through setting up the fully automated spec-driven development system from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **VSCode** 1.85.0 or higher ([Download](https://code.visualstudio.com/))
- **Anthropic API Key** ([Get one here](https://console.anthropic.com))
- **Git** installed
- **npm** (comes with Node.js)

Optional (for SMS notifications):
- **Twilio Account** ([Sign up](https://www.twilio.com/try-twilio))

## Part 1: Install the Orchestrator

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd spec-driven-dev-system
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `@anthropic-ai/sdk` - Claude AI integration
- `chokidar` - File system monitoring
- `twilio` - SMS notifications
- `playwright` - Test automation
- And other dependencies

### Step 3: Build the Project

```bash
npm run build
```

This compiles the TypeScript source code in `src/` to JavaScript in `dist/`.

### Step 4: Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional: SMS notifications
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1234567890

# Paths (defaults are usually fine)
SPEC_DIR=.specify
WORKSPACE_DIR=/Users/yourname/your-project
```

**Getting your Anthropic API key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to "API Keys"
4. Create a new key
5. Copy and paste into `.env`

### Step 5: Test the Orchestrator

Test that the orchestrator can start:

```bash
npm run dev
```

You should see:

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Spec-Driven Development Orchestrator                   ║
║   Powered by Claude Code                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📁 Spec directory: .specify
📁 Workspace: /path/to/workspace
🤖 Using Claude Sonnet 4.5
📱 SMS notifications: Disabled (simulation mode)
🚀 Starting Spec-Driven Development Orchestrator...
```

Press `Ctrl+C` to stop it for now.

---

## Part 2: Install the VSCode Extension

The VSCode extension is what makes everything fully automated!

### Step 1: Navigate to Extension Directory

```bash
cd extension
```

### Step 2: Install Extension Dependencies

```bash
npm install
```

This installs:
- VSCode extension APIs
- TypeScript compiler
- Webpack for bundling
- And other dev dependencies

### Step 3: Compile the Extension

```bash
npm run compile
```

You should see webpack compile the extension successfully:

```
asset extension.js 863 KiB [emitted] (name: main)
webpack 5.x compiled successfully
```

### Step 4: Install in VSCode

You have two options:

#### Option A: Development Mode (Recommended for Testing)

1. Open the `spec-driven-dev-system` folder in VSCode
2. Press `F5` (or Run → Start Debugging)
3. A new "Extension Development Host" window will open
4. The extension is now active in that window

#### Option B: Package and Install (For Regular Use)

```bash
# Install the VSCode Extension CLI tool
npm install -g @vscode/vsce

# Package the extension
npx @vscode/vsce package

# This creates: spec-driven-orchestrator-0.1.0.vsix
```

Then install it:
1. Open VSCode
2. Go to Extensions (`Cmd+Shift+X` or `Ctrl+Shift+X`)
3. Click the `...` menu at the top
4. Select "Install from VSIX..."
5. Choose `spec-driven-orchestrator-0.1.0.vsix`

---

## Part 3: Create Your First Spec

Let's create a simple example to test the system.

### Step 1: Create a Test Project

```bash
cd ..  # Back to spec-driven-dev-system root
mkdir example-project
cd example-project
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
```

### Step 2: Create the .specify Folder

```bash
mkdir .specify
```

### Step 3: Create Your First Spec

Create `.specify/hello-world.json`:

```json
{
  "id": "hello-001",
  "title": "Hello World Feature",
  "description": "Create a simple hello world application",
  "tasks": [
    {
      "id": "task-001",
      "description": "Create index.html with hello world message",
      "dependencies": [],
      "status": "pending",
      "deliveryPrompt": "Create a simple index.html file with a heading that says 'Hello World' and a paragraph explaining this is a test of the spec-driven development system."
    }
  ],
  "acceptanceCriteria": [
    {
      "id": "ac-001",
      "description": "Page displays hello world",
      "testType": "playwright",
      "testPath": "tests/hello.spec.ts"
    }
  ],
  "qaRules": [
    {
      "question": "what should the page say",
      "answer": "Hello World with an explanation paragraph",
      "confidence": "high"
    }
  ]
}
```

### Step 4: Create the Test

Create `tests/hello.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('page displays hello world', async ({ page }) => {
  await page.goto('file://' + __dirname + '/../index.html');

  await expect(page.locator('h1')).toContainText('Hello World');
  await expect(page.locator('p')).toContainText('spec-driven development');
});
```

### Step 5: Configure Playwright

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: true,
  },
});
```

---

## Part 4: Run the Automated System

### Step 1: Open Project in VSCode

1. Open VSCode
2. File → Open Folder
3. Select your `example-project` folder
4. Make sure you can see the `.specify/` folder in the Explorer

### Step 2: Verify Extension is Active

Look for:
- "Spec Orchestrator" panel in the Explorer sidebar
- If you don't see it, the extension might not be activated
- Check that `.specify/` folder exists

### Step 3: Start the Orchestrator

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type: `Spec Orchestrator: Start`
3. Press Enter

You'll be prompted for your Anthropic API key if not already configured.

### Step 4: Watch It Work!

The system will now:

1. **Orchestrator starts** - Look in "Spec Orchestrator" output channel
2. **Task detected** - Reads the "Create index.html" task
3. **Prompt written** - Writes to `.claude-input.txt`
4. **Extension detects** - File monitor sees the change
5. **Claude called** - Extension calls Anthropic API
6. **File created** - Claude creates `index.html`
7. **Response written** - Extension writes to `.claude-output.txt`
8. **Tests run** - Orchestrator runs Playwright tests
9. **Validation** - Engineer agent reviews the code
10. **Success!** - Task marked complete

Check the "Spec Orchestrator" tree view to see real-time progress!

---

## Part 5: Monitoring and Debugging

### View Orchestrator Logs

1. Open Output panel (`Cmd+Shift+U` or `Ctrl+Shift+U`)
2. Select "Spec Orchestrator" from dropdown
3. See detailed logs of everything happening

### View Extension Logs

For extension debugging:
1. Help → Toggle Developer Tools
2. Go to "Console" tab
3. See extension logs and errors

### Check File Communication

The system creates these files in your workspace:
- `.claude-input.txt` - Tasks sent to Claude
- `.claude-output.txt` - Claude's responses
- `.claude-history.json` - Full conversation history
- `.claude-question.txt` - Questions from Claude

You can open these files to see what's happening!

### Progress Tree View

The "Spec Orchestrator" panel shows:
- 📋 All specs
- ✅ Completed tasks (green checkmark)
- 🔄 In-progress tasks (spinning icon)
- 🧪 Testing tasks (beaker icon)
- ❌ Failed tasks (red X)
- ⚪ Pending tasks (circle outline)

Click on any item to see details.

---

## Part 6: Advanced Configuration

### Auto-Start on Workspace Open

In VSCode settings (`Cmd+,` or `Ctrl+,`):

1. Search for "Spec Orchestrator"
2. Enable "Auto Start"
3. The orchestrator will now start automatically when you open a workspace with `.specify/`

### Configure SMS Notifications

1. Sign up for [Twilio](https://www.twilio.com/try-twilio)
2. Get your Account SID, Auth Token, and phone number
3. Add to `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1234567890
```

You'll now receive SMS when:
- Claude has a question the spec can't answer
- A task fails after 3 attempts
- Manual intervention is needed

### Adjust Model Settings

Edit `extension/src/claudeCodeBridge.ts`:

```typescript
const response = await this.anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',  // Change model here
  max_tokens: 8096,                     // Adjust max response length
  messages: this.conversationHistory,
  system: this.getSystemPrompt(),
});
```

Available models:
- `claude-sonnet-4-20250514` - Most capable, best for complex tasks
- `claude-sonnet-3-5-20241022` - Faster, good for simple tasks
- `claude-opus-4-20250514` - Most powerful, slower

---

## Part 7: Creating Real Specs

### Spec Best Practices

**1. Break Down Features into Small Tasks**

❌ Bad:
```json
{
  "tasks": [
    {
      "description": "Build entire authentication system"
    }
  ]
}
```

✅ Good:
```json
{
  "tasks": [
    { "description": "Create login UI form" },
    { "description": "Implement login API endpoint" },
    { "description": "Add session management" },
    { "description": "Create logout functionality" }
  ]
}
```

**2. Use Clear, Specific Delivery Prompts**

❌ Bad:
```json
{
  "deliveryPrompt": "Make a button"
}
```

✅ Good:
```json
{
  "deliveryPrompt": "Create a primary action button component with:\n- Blue background (#0066CC)\n- White text\n- Rounded corners (8px)\n- Hover state (darker blue)\n- Disabled state (gray)\n- Loading state with spinner"
}
```

**3. Define Dependencies**

```json
{
  "tasks": [
    {
      "id": "task-001",
      "description": "Create database schema",
      "dependencies": []
    },
    {
      "id": "task-002",
      "description": "Create API endpoints",
      "dependencies": ["task-001"]  // Waits for database
    },
    {
      "id": "task-003",
      "description": "Create UI",
      "dependencies": ["task-002"]  // Waits for API
    }
  ]
}
```

**4. Write Comprehensive Tests**

Your acceptance criteria should cover:
- Happy path (successful scenarios)
- Error cases (what happens when things go wrong)
- Edge cases (boundary conditions)
- User interactions (clicks, form submissions)

**5. Add QA Rules for Common Questions**

```json
{
  "qaRules": [
    {
      "question": "what color should the button be",
      "answer": "Primary blue (#0066CC)",
      "confidence": "high"
    },
    {
      "question": "where should errors display",
      "answer": "Show error toast notifications in top-right corner",
      "confidence": "high"
    }
  ]
}
```

### Example: Full Featured Spec

See `.specify/example-spec.json` for a comprehensive example including:
- Multiple tasks with dependencies
- Detailed acceptance criteria
- QA rules
- Error handling

---

## Troubleshooting

### Extension Won't Start

**Problem**: "Spec Orchestrator" doesn't appear in sidebar

**Solutions**:
1. Ensure `.specify/` folder exists in workspace root
2. Reload window: `Cmd+Shift+P` → "Developer: Reload Window"
3. Check extension is installed: Extensions → Search "Spec Orchestrator"
4. Try opening workspace again

### API Key Issues

**Problem**: "API key is required" error

**Solutions**:
1. Check `.env` file has `ANTHROPIC_API_KEY=sk-ant-...`
2. Or set in VSCode settings: `Spec Orchestrator: Anthropic Api Key`
3. Or export environment variable: `export ANTHROPIC_API_KEY=sk-ant-...`

### Orchestrator Process Crashes

**Problem**: Process exits immediately after starting

**Solutions**:
1. Check "Spec Orchestrator" output channel for errors
2. Verify `.env` file exists and has API key
3. Run `npm run build` to rebuild
4. Check Node.js version: `node --version` (should be 18+)

### Tests Not Running

**Problem**: Tasks complete but tests don't run

**Solutions**:
1. Ensure Playwright is installed: `npx playwright install`
2. Check test paths in spec match actual file locations
3. Verify `playwright.config.ts` exists
4. Run tests manually: `npx playwright test`

### File Monitor Not Working

**Problem**: Tasks aren't being processed automatically

**Solutions**:
1. Check `.claude-input.txt` exists
2. Verify file permissions (should be readable/writable)
3. Look for errors in Extension Host output
4. Restart orchestrator: Stop → Start

### Conversation Too Long

**Problem**: API errors about context length

**Solutions**:
1. Delete `.claude-history.json` to reset conversation
2. Restart orchestrator
3. Consider breaking spec into smaller specs

---

## Next Steps

Now that your system is running:

1. **Create real specs** for your actual projects
2. **Write comprehensive tests** for quality assurance
3. **Monitor progress** through the VSCode panel
4. **Review generated code** to learn Claude's patterns
5. **Iterate on specs** based on results

Remember: **The better your spec, the better the implementation!**

## Getting Help

- Check the main [README.md](README.md) for feature documentation
- See [extension/README.md](extension/README.md) for extension details
- Review example specs in `.specify/`
- Check issues on GitHub

## What's Next?

Potential enhancements:
- [ ] Multi-spec parallel execution
- [ ] Web UI for spec management
- [ ] GitHub integration for auto-PR creation
- [ ] Test coverage reporting
- [ ] Code review dashboards
- [ ] Metrics and analytics

Happy automated coding! 🚀
