# Spec-Driven Development System

An intelligent orchestrator that automates spec-driven development using Claude AI, Playwright testing, and multi-agent validation - **fully automated via VSCode extension**.

## Overview

This system **completely automates** the development workflow with **zero manual intervention** required:

1. **Spec Definition** - Define features in `.specify/` folder with tasks and acceptance criteria
2. **Task Orchestration** - Breaks down specs into tasks and manages dependencies
3. **Automated Delivery** - VSCode extension automatically sends tasks to Claude AI
4. **Implementation** - Claude implements features autonomously
5. **Automated Testing** - Playwright tests run automatically after each implementation
6. **Autonomous Validation** - Engineer agent reviews code and requests fixes
7. **Self-Healing** - System automatically iterates on failures until success
8. **Smart Escalation** - Only involves you via SMS when truly stuck

**You write the spec, the system builds it. You only intervene when needed.**

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      VSCode Extension                              │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐      │
│  │ File Monitor │→ │ Claude Bridge  │→ │Progress Panel   │      │
│  │ Watches      │  │ Calls Claude   │  │Shows Status     │      │
│  │.claude-input │  │API Directly    │  │Real-time Updates│      │
│  └──────────────┘  └────────────────┘  └─────────────────┘      │
│         ↑                  ↓                                      │
│  .claude-input.txt  .claude-output.txt                           │
└───────────────────────────────────────────────────────────────────┘
         ↑                  ↓
┌────────┴──────────────────┴───────────────────────────────────────┐
│                     Orchestrator Process                           │
│  - Reads .specify/ specs                                          │
│  - Manages task dependencies                                      │
│  - Coordinates all agents                                         │
│  - Handles spec-based Q&A                                         │
└───────────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│     Test     │   │   Engineer   │   │Notification  │
│    Agent     │   │    Agent     │   │  Service     │
│              │   │              │   │              │
│  Playwright  │   │  Validation  │   │  SMS Alerts  │
│   Testing    │   │  & Review    │   │  (Twilio)    │
└──────────────┘   └──────────────┘   └──────────────┘
```

**Key Innovation**: The VSCode extension eliminates all manual work by directly integrating Claude AI with the orchestrator through automated file monitoring.

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd spec-driven-dev-system
npm install
npm run build
```

### 2. Install VSCode Extension

```bash
cd extension
npm install
npm run compile
```

Then in VSCode:
- Press `F5` to launch Extension Development Host, OR
- Package and install: `npx @vscode/vsce package` then install the `.vsix` file

### 3. Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:
```env
ANTHROPIC_API_KEY=your_api_key_here

# Optional: SMS notifications for escalation
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
YOUR_PHONE_NUMBER=+1234567890

# Paths (defaults are usually fine)
SPEC_DIR=.specify
WORKSPACE_DIR=/path/to/your/project
```

**Note**: The VSCode extension will also prompt you for the API key on first run if not configured.

### 3. Create Your Specification

Create a spec file in `.specify/your-feature.json`:

```json
{
  "id": "feature-001",
  "title": "User Authentication",
  "description": "Implement user login and registration",
  "tasks": [
    {
      "id": "task-001",
      "description": "Create login UI",
      "dependencies": [],
      "status": "pending",
      "deliveryPrompt": "Create a login form with email/password fields"
    }
  ],
  "acceptanceCriteria": [
    {
      "id": "ac-001",
      "description": "User can log in successfully",
      "testType": "playwright",
      "testPath": "tests/login.spec.ts"
    }
  ],
  "qaRules": [
    {
      "question": "what should happen after login",
      "answer": "Redirect to dashboard",
      "confidence": "high"
    }
  ]
}
```

### 4. Start the Automated System

In VSCode:
1. Open your project workspace (with `.specify/` folder)
2. Open Command Palette (`Cmd/Ctrl+Shift+P`)
3. Run: **"Spec Orchestrator: Start"**

**That's it!** The system now runs fully autonomously:
1. Orchestrator reads your spec and identifies the first task
2. Writes the delivery prompt to `.claude-input.txt`
3. **Extension automatically** detects the change
4. **Extension automatically** sends prompt to Claude AI via API
5. **Claude AI implements** the feature autonomously
6. **Extension automatically** writes response to `.claude-output.txt`
7. **Orchestrator automatically** runs Playwright tests
8. **Engineer Agent automatically** validates the implementation
9. If tests fail, fix requests are **automatically** sent back to Claude
10. **Repeat until success** or escalate to you via SMS after 3 failures

**You just watch it work!** Check the "Spec Orchestrator" panel in VSCode Explorer to see real-time progress.

## Features

### Spec-Based Q&A

The system can answer questions based on your specifications:

```bash
npm start question "what happens after successful login"
```

If the answer isn't in the spec with high confidence, you'll receive an SMS asking for clarification.

### Automatic Test Validation

Every task implementation is validated with Playwright tests. Tests must pass before moving to the next task.

### Engineer Agent Review

The Engineer Agent analyzes test failures and provides specific fix suggestions to Claude Code.

### Task Dependency Management

Tasks are executed in order based on their dependencies:

```json
{
  "tasks": [
    {
      "id": "task-001",
      "dependencies": []
    },
    {
      "id": "task-002",
      "dependencies": ["task-001"]  // Waits for task-001
    }
  ]
}
```

### SMS Notifications

Get notified when:
- A question can't be answered from specs
- A task fails after 3 attempts
- Manual intervention is needed

## File Structure

```
spec-driven-dev-system/
├── .specify/                 # Your specifications
│   ├── spec-schema.json     # JSON schema for specs
│   └── example-spec.json    # Example specification
├── src/
│   ├── orchestrator/        # Main orchestration logic
│   │   ├── Orchestrator.ts  # Main orchestrator
│   │   ├── SpecLoader.ts    # Loads and manages specs
│   │   └── QAEngine.ts      # Answers questions from specs
│   ├── agents/              # Specialized agents
│   │   ├── TestAgent.ts     # Runs Playwright tests
│   │   └── EngineerAgent.ts # Validates implementations
│   ├── interceptor/         # Claude Code integration
│   │   └── ClaudeCodeInterceptor.ts
│   ├── utils/
│   │   └── NotificationService.ts
│   └── index.ts             # Entry point
├── tests/                   # Your Playwright tests
└── package.json
```

## Workflow Example

### Starting State

`.specify/feature-001.json`:
```json
{
  "tasks": [
    {
      "id": "task-001",
      "status": "pending",
      "deliveryPrompt": "Create a login form"
    }
  ]
}
```

### Step 1: Orchestrator Sends Task

`.claude-input.txt`:
```
Create a login form with email and password fields, a submit button,
and proper form validation. Style it according to our design system.
```

### Step 2: You Copy to Claude Code

Paste the prompt into this window.

### Step 3: Claude Code Responds

Claude Code creates the login form. You copy the response to `.claude-output.txt`.

### Step 4: Automated Testing

Orchestrator runs:
```bash
npx playwright test tests/login.spec.ts
```

### Step 5a: Tests Pass ✅

Task marked as completed, moves to next task.

### Step 5b: Tests Fail ❌

Engineer Agent analyzes failures and writes to `.claude-input.txt`:

```
The implementation has issues:

Failed tests:
- Login form validation test

Issues found:
- Email validation is not working
- Password field is missing type="password"

Suggestions:
- Add email format validation
- Change password input type to "password"

Please fix these issues.
```

### Step 6: Iteration

You paste the fix request into Claude Code, and the cycle continues until tests pass.

## Advanced Usage

### Custom Test Runners

Extend `TestAgent` to support other test frameworks:

```typescript
class CustomTestAgent extends TestAgent {
  async runJestTests() {
    // Your Jest implementation
  }
}
```

### Multiple Specs

The orchestrator processes specs in order. Add multiple spec files to `.specify/`:

```
.specify/
├── auth.json
├── dashboard.json
└── profile.json
```

### WebSocket Integration

For automated communication (requires VSCode extension):

```typescript
const interceptor = new ClaudeCodeInterceptor();
await interceptor.start(workspaceDir, 3000);  // WebSocket on port 3000
```

## How Automation Works

### VSCode Extension Architecture

The extension provides **complete automation** through three key components:

**1. File Monitor** (`extension/src/fileMonitor.ts`)
- Uses `chokidar` to watch `.claude-input.txt` in real-time
- Debounces rapid changes (500ms stabilization)
- Prevents duplicate processing
- Handles errors gracefully

**2. Claude Code Bridge** (`extension/src/claudeCodeBridge.ts`)
- Directly calls Anthropic API using `@anthropic-ai/sdk`
- Maintains full conversation history for context
- Uses Claude Sonnet 4 model optimized for coding
- Provides system prompt with workspace context
- Auto-saves conversation to `.claude-history.json`

**3. Progress Provider** (`extension/src/progressProvider.ts`)
- Real-time tree view showing all specs and tasks
- Visual status indicators (pending, in_progress, testing, completed, failed)
- Click to focus on specific tasks
- Auto-refreshes when specs change

### Workflow in Action

```
[Orchestrator writes task] → .claude-input.txt
         ↓
[Extension detects change] → File Monitor triggers
         ↓
[Claude Bridge processes] → Calls Anthropic API
         ↓
[Claude AI implements] → Creates/edits files
         ↓
[Extension writes response] → .claude-output.txt
         ↓
[Orchestrator reads response] → Runs Playwright tests
         ↓
[Tests pass?] → Yes: Next task | No: Fix request
```

**Zero human intervention required** unless:
- Claude asks a question the spec can't answer (answered by QA Engine or escalated via SMS)
- Tests fail 3+ times (SMS notification sent)
- Manual approval needed (configurable)

## Troubleshooting

### Tests keep failing

Check:
1. Are your test paths correct in the spec?
2. Are Playwright tests properly configured?
3. Check `.claude-output.txt` - did you paste the full response?

### Questions not being answered

Check:
1. Are your `qaRules` in the spec?
2. Is the question phrasing similar to the spec's `question` field?
3. Check console for confidence level

### SMS not sending

Check:
1. Twilio credentials in `.env`
2. Phone numbers include country code (+1)
3. Console shows SMS simulation messages

## Contributing

This is a starting framework. Extend it with:

- More sophisticated test runners
- Integration with CI/CD
- Web UI for spec management
- Real-time collaboration features
- Database for spec versioning

## License

MIT
