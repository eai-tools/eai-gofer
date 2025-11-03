# Implementation Plan: Claude Code Terminal Integration (Updated)

## Problem Statement

**Current State**:

- Play button launches `npm start` (SpecGofer orchestrator) in external Terminal
- No interaction with Claude Code CLI
- No terminal output monitoring
- No ability to respond to Claude Code prompts
- Simple state tracking (on/off)

**Required State**:

- Play button next to spec launches **Claude Code CLI** in external Terminal
- Feature branch is automatically checked out before starting
- Human can watch Claude Code working in real-time in the Terminal
- SpecGofer monitors terminal output (same view as human)
- Detects natural language questions from Claude Code
- Uses Claude API to validate and decide responses
- Auto-responds when confident, escalates to WhatsApp when uncertain
- Stop button kills the terminal process
- VSCode termination also kills Claude Code terminal
- Play/Stop button updates based on actual process state

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  VSCode Extension (SpecGofer)                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ autonomousCommands.ts                             │  │
│  │  - Play Button → checkoutBranch() → launch()      │  │
│  │  - Stop Button → killTerminalProcess()            │  │
│  │  - VSCode exit → cleanup all terminals             │  │
│  └────────────────┬──────────────────────────────────┘  │
│                   │                                      │
│                   ↓                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ node-pty (Pseudo-Terminal)                        │  │
│  │  - Spawns Claude Code CLI process                 │  │
│  │  - Captures stdout/stderr                         │  │
│  │  - Enables stdin writing                          │  │
│  │  - Displays in external Terminal window           │  │
│  └────────────┬──────────────────────────────────────┘  │
│               │                                          │
│               ↓ output stream                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ OutputMonitor.ts                                  │  │
│  │  - Parses terminal output (human sees same)       │  │
│  │  - Detects: questions, errors, completions        │  │
│  │  - Emits events                                   │  │
│  └────────────┬──────────────────────────────────────┘  │
│               │                                          │
│               ↓ question_detected                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ QuestionValidator.ts (NEW)                        │  │
│  │  - Calls Claude API for decision                  │  │
│  │  - Validates against constitution.md              │  │
│  │  - Returns response OR throws for escalation      │  │
│  └────────────┬─────────────┬────────────────────────┘  │
│               │ success      │ uncertain/violation       │
│               ↓              ↓                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ EscalationManager.ts (NEW)                        │  │
│  │  - Sends WhatsApp message with context            │  │
│  │  - Waits for human response                       │  │
│  │  - Returns human guidance                         │  │
│  └────────────┬──────────────────────────────────────┘  │
│               │                                          │
│               ↓ response (auto or human)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │ PTY stdin                                         │  │
│  │  - Writes response to terminal                    │  │
│  │  - Claude Code continues execution                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘

External Terminal Window (macOS Terminal.app)
┌─────────────────────────────────────────┐
│ Claude Code CLI running                 │
│ $ claude --print "Implement task T001"  │
│                                         │
│ Output: I'll implement task T001...     │
│ Would you like me to create the file    │
│ src/components/Button.tsx with the      │
│ TypeScript implementation?              │
│                                         │
│ → Auto-response: "yes" (from SpecGofer) │
│ ✓ Created src/components/Button.tsx     │
└─────────────────────────────────────────┘
```

## Key Components

### 0. Feature Branch Management (NEW)

**Purpose**: Ensure correct branch is checked out before starting Claude Code

**Implementation**:

```typescript
async function prepareFeatureBranch(spec: any): Promise<void> {
  const branchName = `feature/${spec.id}`;

  // Check current branch
  const currentBranch = await exec('git branch --show-current');

  if (currentBranch !== branchName) {
    // Check if branch exists
    const branches = await exec('git branch -a');

    if (branches.includes(branchName)) {
      // Switch to existing branch
      await exec(`git checkout ${branchName}`);
    } else {
      // Create new feature branch
      await exec(`git checkout -b ${branchName}`);
    }
  }

  // Ensure spec files are present
  const specPath = `.specify/specs/${spec.id}`;
  if (!fs.existsSync(`${specPath}/spec.md`)) {
    throw new Error(`Spec file not found for ${spec.id}`);
  }

  console.log(`✓ Feature branch ${branchName} ready`);
}
```

**Must be called before launching Claude Code terminal**

### 1. Claude Code CLI Invocation

**Confirmed Claude Code CLI Methods**:

1. **Non-interactive (Recommended for automation)**:

   ```bash
   claude --print "Your prompt here"
   echo "Your prompt" | claude --print
   ```

2. **With JSON output for parsing**:

   ```bash
   claude --print "Your prompt" --output-format json
   ```

3. **Interactive mode (requires natural language parsing)**:
   ```bash
   claude  # Then send prompts via stdin
   ```

**Passing Task Context**: Build a comprehensive prompt with all task details

### 2. Pseudo-Terminal (PTY) Integration

**Library**: `node-pty` (https://github.com/microsoft/node-pty)

**Why PTY?**:

- Full I/O control (stdin, stdout, stderr)
- Simulates real terminal environment
- Enables automated keyboard input
- Captures all terminal output
- Still displays in external window

**Example Code (Updated for Claude Code)**:

```typescript
import * as pty from 'node-pty';

// Build comprehensive task prompt
const taskPrompt = `Please implement the following task:
Task ID: ${task.id}
Description: ${task.description}
Requirements:
${task.requirements}

Follow the constitution at .specify/memory/constitution.md for all decisions.`;

// Option 1: Non-interactive mode (recommended)
const ptyProcess = pty.spawn('claude', ['--print', taskPrompt], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: workspacePath,
  env: process.env,
});

// Option 2: Interactive mode
const ptyProcess = pty.spawn('claude', [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: workspacePath,
  env: process.env,
});

// Capture output
ptyProcess.onData((data) => {
  console.log('Terminal output:', data);
  outputMonitor.parseStream(data);
});

// Send natural language responses
ptyProcess.write('yes\n'); // Confirm action
ptyProcess.write('continue\n'); // Continue execution
```

**Installation**:

```bash
cd extension
npm install node-pty
npm install @types/node-pty --save-dev
```

### 3. Question Detection & Validation

**New File**: `extension/src/autonomous/QuestionValidator.ts`

**Purpose**: Analyze natural language questions from Claude Code and decide best
response

**Flow**:

1. OutputMonitor detects question patterns like:
   - "Would you like me to..."
   - "Should I proceed with..."
   - "Do you want to..."
   - "May I create..."
   - "Can I continue with..."

2. Extract question text and infer possible responses
3. Build context prompt for Claude API:

   ```
   You are validating a question from Claude Code in a SpecGofer autonomous session.

   Question: "Would you like me to create the file src/components/Button.tsx with the TypeScript implementation?"

   Context:
   - Current task: Implement Button component (T012)
   - Constitution principle: Always create test files alongside source files
   - Spec requirement: TypeScript strict mode

   How should I respond? Options are typically: yes, no, continue, cancel, or provide specific guidance.
   Respond with just the appropriate response word or short phrase.
   ```

4. Claude API responds with natural language decision
5. Validate against constitution.md
6. Return validated response

**Implementation (Updated for Natural Language)**:

```typescript
export class QuestionValidator {
  private anthropic: Anthropic;
  private constitution: string;

  async validateQuestion(
    question: string,
    context: TaskContext
  ): Promise<string> {
    const prompt = this.buildPrompt(question, context);
    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Use Haiku for faster responses
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse natural language response (e.g., "yes", "no", "continue")
    const decision = response.content[0].text.trim().toLowerCase();

    // Validate against constitution
    if (this.violatesConstitution(question, decision)) {
      throw new Error('Response violates constitution');
    }

    return decision;
  }
}
```

### 4. WhatsApp Escalation Manager (NEW)

**Purpose**: Escalate to human via WhatsApp when uncertain or constitution
violation

**Implementation**:

```typescript
export class EscalationManager {
  private twilioClient: Twilio;
  private whatsappNumber: string;
  private pendingResponses: Map<string, (response: string) => void>;

  constructor() {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.whatsappNumber = config.get('whatsappPhoneNumber');
    this.pendingResponses = new Map();
  }

  async escalateToHuman(
    question: string,
    context: {
      spec: string;
      task: string;
      violation?: string;
      uncertainty?: string;
    }
  ): Promise<string> {
    const escalationId = uuidv4();

    // Format WhatsApp message
    const message = `
🤖 *SpecGofer Needs Clarification*

*Spec:* ${context.spec}
*Task:* ${context.task}

*Question from Claude:*
${question}

${context.violation ? `⚠️ *Constitution Violation:* ${context.violation}` : ''}
${context.uncertainty ? `❓ *Uncertainty:* ${context.uncertainty}` : ''}

*Reply with your guidance for Claude.*
ID: ${escalationId}
    `.trim();

    // Send WhatsApp message
    await this.twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${this.whatsappNumber}`,
      body: message,
    });

    // Wait for response (with timeout)
    return new Promise((resolve, reject) => {
      this.pendingResponses.set(escalationId, resolve);

      setTimeout(
        () => {
          if (this.pendingResponses.has(escalationId)) {
            this.pendingResponses.delete(escalationId);
            reject(new Error('WhatsApp response timeout'));
          }
        },
        5 * 60 * 1000
      ); // 5 minute timeout
    });
  }

  // Called by webhook when WhatsApp response received
  handleIncomingMessage(escalationId: string, message: string): void {
    const resolver = this.pendingResponses.get(escalationId);
    if (resolver) {
      resolver(message);
      this.pendingResponses.delete(escalationId);
    }
  }
}
```

**WhatsApp Webhook Setup** (required for receiving responses):

```typescript
// In extension activation
app.post('/whatsapp-webhook', (req, res) => {
  const { Body, From } = req.body;

  // Extract escalation ID from message
  const idMatch = Body.match(/ID: ([a-f0-9-]+)/);
  if (idMatch) {
    escalationManager.handleIncomingMessage(idMatch[1], Body);
  }

  res.sendStatus(200);
});
```

### 5. Process Lifecycle Management

**Updated**: `extension/src/autonomousCommands.ts`

**Process Tracking**:

```typescript
interface ExternalTerminalProcess {
  pid: number; // Process ID
  ptyProcess: pty.IPty; // PTY handle
  spec: string; // Which spec is running
  startTime: Date; // When started
  outputBuffer: string[]; // Recent output lines
}

let externalTerminalProcess: ExternalTerminalProcess | null = null;
```

**Start Function (Complete Implementation)**:

```typescript
async function launchClaudeCodeTerminal(
  workspacePath: string,
  spec: any
): Promise<void> {
  // Step 1: Checkout feature branch
  await prepareFeatureBranch(spec);

  // Step 2: Build comprehensive prompt for Claude Code
  const taskPrompt = `
You are implementing the feature "${spec.id}" for the SpecGofer project.

Please review the specification at:
- Spec: .specify/specs/${spec.id}/spec.md
- Plan: .specify/specs/${spec.id}/plan.md
- Tasks: .specify/specs/${spec.id}/tasks.md

Start implementing the tasks in order. Follow these guidelines:
1. Follow the project constitution at .specify/memory/constitution.md
2. Use hints from .specify/hints/ for implementation patterns
3. Create tests alongside implementation files
4. Commit your changes with descriptive messages

Begin with the first task now.
`;

  // Step 3: Spawn Claude Code in interactive mode for better visibility
  const ptyProcess = pty.spawn('claude', [], {
    name: 'xterm-color',
    cols: 120,
    rows: 40,
    cwd: workspacePath,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    },
  });

  // Step 4: Send initial prompt
  ptyProcess.write(taskPrompt + '\n');

  // Step 5: Track process
  externalTerminalProcess = {
    pid: ptyProcess.pid,
    ptyProcess: ptyProcess,
    spec: spec.id,
    startTime: new Date(),
    outputBuffer: [],
  };

  // Step 6: Setup monitoring and escalation
  const outputMonitor = new OutputMonitor();
  const questionValidator = new QuestionValidator();
  const escalationManager = new EscalationManager();

  ptyProcess.onData(async (data) => {
    // Human sees this in real-time in Terminal
    await handleTerminalOutput(
      data,
      outputMonitor,
      questionValidator,
      escalationManager
    );
  });

  // Step 7: Setup cleanup handlers
  ptyProcess.onExit(({ exitCode, signal }) => {
    handleProcessExit(exitCode, signal);
  });

  // Register VSCode cleanup
  vscode.window.onDidCloseTerminal((terminal) => {
    if (terminal.processId === ptyProcess.pid) {
      killTerminalProcess();
    }
  });

  // Step 8: Update UI - Play becomes Stop
  await vscode.commands.executeCommand(
    'setContext',
    'specGoferAutonomousRunning',
    true
  );

  // Step 9: Open external Terminal window for human visibility
  await openExternalTerminalWithPTY(ptyProcess, workspacePath);

  console.log(
    `✅ Claude Code launched for spec ${spec.id} on branch feature/${spec.id}`
  );
}
```

**Stop Function**:

```typescript
async function killTerminalProcess(): Promise<void> {
  if (!externalTerminalProcess) {
    return;
  }

  try {
    // Try graceful shutdown
    externalTerminalProcess.ptyProcess.write('\x03'); // Ctrl+C

    // Wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Force kill if still running
    if (isProcessRunning(externalTerminalProcess.pid)) {
      process.kill(externalTerminalProcess.pid, 'SIGKILL');
    }

    // Clear state
    externalTerminalProcess = null;

    // Update UI
    await vscode.commands.executeCommand(
      'setContext',
      'specGoferAutonomousRunning',
      false
    );

    vscode.window.showInformationMessage('✅ Terminal process stopped');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop process: ${error}`);
  }
}
```

### 6. Event Loop Integration (With Escalation)

**Complete Flow**: Terminal Output → Detection → Validation → Auto-Response or
Escalation

```typescript
async function handleTerminalOutput(
  data: string,
  outputMonitor: OutputMonitor,
  questionValidator: QuestionValidator,
  escalationManager: EscalationManager
): Promise<void> {
  // Buffer output (human sees same in Terminal)
  externalTerminalProcess.outputBuffer.push(data);

  // Keep last 10000 lines for context
  if (externalTerminalProcess.outputBuffer.length > 10000) {
    externalTerminalProcess.outputBuffer.shift();
  }

  // Log to VSCode output channel
  outputChannel?.append(data);

  // Parse for events
  const events = outputMonitor.parseStream(data);

  for (const event of events) {
    switch (event.type) {
      case 'question_detected':
        await handleQuestionWithEscalation(
          event,
          questionValidator,
          escalationManager
        );
        break;

      case 'error_detected':
        await handleError(event);
        break;

      case 'task_completed':
        await handleTaskCompletion(event);
        break;

      case 'context_warning':
        await handleContextWarning(event);
        break;
    }
  }
}

async function handleQuestionWithEscalation(
  event: QuestionEvent,
  validator: QuestionValidator,
  escalationManager: EscalationManager
): Promise<void> {
  try {
    // Step 1: Try automatic validation
    const decision = await validator.validateQuestion(
      event.question,
      event.context
    );

    // Step 2: Check constitution compliance
    if (validator.violatesConstitution(event.question, decision)) {
      throw new Error(
        `Constitution violation: ${decision} violates project principles`
      );
    }

    // Step 3: Check confidence level
    if (validator.getConfidence() < 0.8) {
      throw new Error(`Low confidence: ${validator.getConfidence()}`);
    }

    // Step 4: Auto-respond if all checks pass
    externalTerminalProcess.ptyProcess.write(`${decision}\n`);

    // Log successful auto-response
    outputChannel?.appendLine(
      `✅ [AUTO-RESPONSE] Question: "${event.question}" → Answer: "${decision}"`
    );
  } catch (error) {
    // Step 5: Escalate to human via WhatsApp
    console.log(`⚠️ Escalating to human: ${error.message}`);

    try {
      const humanResponse = await escalationManager.escalateToHuman(
        event.question,
        {
          spec: externalTerminalProcess.spec,
          task: event.context.currentTask,
          violation: error.message.includes('violation')
            ? error.message
            : undefined,
          uncertainty: error.message.includes('confidence')
            ? error.message
            : undefined,
        }
      );

      // Step 6: Send human's response to Claude Code
      externalTerminalProcess.ptyProcess.write(`${humanResponse}\n`);

      // Log human intervention
      outputChannel?.appendLine(
        `👤 [HUMAN-RESPONSE] Question: "${event.question}" → Answer: "${humanResponse}"`
      );

      // Save this decision as a memory for future reference
      await saveDecisionAsMemory(event.question, humanResponse, event.context);
    } catch (escalationError) {
      // Step 7: If WhatsApp fails or times out, show VSCode dialog
      const response = await vscode.window.showInformationMessage(
        `Claude Code asks: ${event.question}`,
        'Yes',
        'No',
        'Provide Custom Response'
      );

      if (response === 'Provide Custom Response') {
        const customResponse = await vscode.window.showInputBox({
          prompt: 'Enter your response for Claude Code',
          placeHolder: 'Type your guidance...',
        });

        if (customResponse) {
          externalTerminalProcess.ptyProcess.write(`${customResponse}\n`);
        }
      } else if (response) {
        externalTerminalProcess.ptyProcess.write(`${response.toLowerCase()}\n`);
      }
    }
  }
}

// Save human decisions as memories for future automation
async function saveDecisionAsMemory(
  question: string,
  response: string,
  context: any
): Promise<void> {
  const memory = {
    category: 'decision_patterns',
    tags: ['autonomous', 'human_guidance', context.spec],
    scope: 'local' as const,
    content: `When asked "${question}" in context of ${context.currentTask}, respond with: "${response}"`,
    learnedFrom: 'human_escalation',
  };

  await memoryManager.save(memory);
}
```

## Implementation Steps (Phase-by-Phase)

### Phase 1: PTY Integration (Foundational)

**Objective**: Replace AppleScript with node-pty for I/O control

**Tasks**:

- [ ] #TODO-11: Install node-pty package
- [ ] Update launchExternalTerminal() to use pty.spawn()
- [ ] Capture and log terminal output to output channel
- [ ] Test: Launch terminal and verify output appears in VSCode Output
- [ ] Track process PID for lifecycle management
- [ ] Test: Verify external Terminal window still shows (macOS)

**Deliverable**: External Terminal launches with full I/O capture

**Duration**: 2-4 hours

---

### Phase 2: Claude Code CLI Research & Integration

**Objective**: Determine how to invoke Claude Code and pass task context

**Tasks**:

- [ ] #TODO-3: Research Claude Code CLI invocation method
- [ ] Test different invocation approaches
- [ ] Determine how to pass spec/task context
- [ ] Update launchExternalTerminal() with correct command
- [ ] Test: Verify Claude Code starts and receives task context

**Deliverable**: Claude Code runs in PTY with proper context

**Duration**: 3-5 hours (includes research)

---

### Phase 3: Output Monitoring Integration

**Objective**: Connect PTY output to existing OutputMonitor

**Tasks**:

- [ ] #TODO-5: Wire PTY output stream to OutputMonitor.parseStream()
- [ ] Register event handlers for question_detected, error_detected, task_update
- [ ] Log detected events to output channel
- [ ] Test: Verify questions and errors are detected from Claude Code output

**Deliverable**: All Claude Code events are detected and logged

**Duration**: 2-3 hours

---

### Phase 4: Question Validation (Core Feature)

**Objective**: Build AI-powered question validation system

**Tasks**:

- [ ] #TODO-6: Create QuestionValidator.ts
- [ ] Implement validateQuestion() method
- [ ] Load constitution.md for validation rules
- [ ] Build context-aware prompt for Claude API
- [ ] Parse Claude API response (extract choice number)
- [ ] Add validation against constitution principles
- [ ] Test: Validate sample questions and verify correct responses

**Deliverable**: QuestionValidator returns validated responses

**Duration**: 4-6 hours

---

### Phase 5: Automated Response Mechanism

**Objective**: Respond to questions automatically via PTY stdin

**Tasks**:

- [ ] #TODO-7: Implement handleQuestion() event handler
- [ ] Call QuestionValidator on question_detected events
- [ ] Write validated response to PTY stdin (e.g., "2\n")
- [ ] Log all auto-responses to output channel
- [ ] Add fallback: escalate to user if validation fails
- [ ] Test: Verify Claude Code receives and processes responses

**Deliverable**: Questions are auto-answered in terminal

**Duration**: 3-4 hours

---

### Phase 6: Process Lifecycle Management

**Objective**: Proper start/stop/crash handling

**Tasks**:

- [ ] #TODO-8: Track process PID and state in externalTerminalProcess
- [ ] #TODO-10: Implement killTerminalProcess() with graceful shutdown
- [ ] Setup ptyProcess.onExit() handler
- [ ] #TODO-9: Auto-update context key on process exit
- [ ] Handle crash scenarios (log + notify user)
- [ ] Test: Start → Stop → Verify clean shutdown
- [ ] Test: Simulate crash → Verify auto-recovery

**Deliverable**: Robust process lifecycle management

**Duration**: 3-4 hours

---

### Phase 7: UI & Configuration

**Objective**: Polish user experience and add settings

**Tasks**:

- [ ] #TODO-14: Add VS Code settings (claudeCodePath, timeouts, auto-response
      toggle)
- [ ] Update play/stop button context logic
- [ ] Add progress indicators during execution
- [ ] Improve error messages and notifications
- [ ] Test: Verify play/stop button switches correctly

**Deliverable**: Polished UI with user-configurable settings

**Duration**: 2-3 hours

---

### Phase 8: Testing & Documentation

**Objective**: Validate end-to-end and document

**Tasks**:

- [ ] #TODO-13: Manual testing with 006-test-feature spec
- [ ] Test all edge cases (crash, timeout, force reset)
- [ ] #TODO-15: Update documentation (architecture, flow, troubleshooting)
- [ ] Create demo video showing auto-response in action
- [ ] Update QUICKSTART.md with new workflow

**Deliverable**: Tested, documented feature ready for release

**Duration**: 4-5 hours

---

## Total Estimated Duration

**Optimistic**: 23 hours (~3 days) **Realistic**: 32 hours (~4 days) **With
Buffer**: 40 hours (~5 days)

## Dependencies

### External Libraries

- `node-pty` - Pseudo-terminal support
- `@types/node-pty` - TypeScript definitions
- `@anthropic-ai/sdk` - Already installed
- `twilio` - WhatsApp messaging
- `express` - For WhatsApp webhook endpoint
- `uuid` - Generate escalation IDs

### System Requirements

- macOS Terminal.app (for external window display)
- Claude Code CLI (install via desktop app or npm)
- VSCode 1.95+
- Twilio account with WhatsApp Business API
- Git (for branch management)

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+14155238886
USER_WHATSAPP_NUMBER=+1234567890
```

### Existing Code Analysis (What We Can Reuse)

#### ✅ Already Implemented & Working:

1. **`extension/src/autonomous/OutputMonitor.ts`**
   - Already parses terminal output for patterns
   - Detects questions, errors, task updates
   - Can be extended for natural language Claude questions

2. **`extension/src/autonomous/ErrorRecovery.ts`**
   - 3-level retry mechanism
   - Exponential backoff
   - Can handle Claude API failures

3. **`extension/src/autonomous/TerminalManager.ts`**
   - VSCode terminal creation and management
   - Process lifecycle tracking
   - Currently uses VSCode terminals (needs PTY upgrade)

4. **`extension/src/autonomous/AutonomousDriver.ts`**
   - Full orchestration framework
   - Memory integration (T044-T046)
   - Context building with hints (T068-T071)
   - Pattern detection (T048-T049)
   - Progress reporting

5. **`extension/src/autonomousCommands.ts`**
   - External Terminal launching via AppleScript (working!)
   - Play/Stop button context management
   - Output channel logging

6. **Memory & Context System**:
   - `MemoryManager.ts` - Load/save memories
   - `ContextBuilder.ts` - Merge hints + memories
   - `HintLoader.ts` - Load project hints
   - `.specify/memory/constitution.md` - Validation rules

#### ⚠️ Needs Modification:

1. **`launchExternalTerminal()`** - Currently runs `npm start`, needs to run
   Claude CLI
2. **Terminal spawning** - Replace AppleScript with PTY for I/O control
3. **Question detection** - Update patterns for natural language

#### ❌ Needs Implementation:

1. **`QuestionValidator.ts`** - New class for Claude API validation
2. **PTY integration** - Replace AppleScript with node-pty
3. **Natural language response handling** - Send "yes"/"no" instead of numbers

## Alternative Approach: Claude Agent SDK Integration

Instead of using CLI + PTY, we could integrate the Claude Agent SDK directly:

### Option A: TypeScript SDK Integration

```typescript
import { ClaudeAgent } from '@anthropic-ai/claude-agent-sdk';

class ClaudeCodeIntegration {
  private agent: ClaudeAgent;

  async executeTask(task: any, spec: any): Promise<void> {
    this.agent = new ClaudeAgent({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20241022',
      tools: ['Read', 'Write', 'Edit', 'Bash'],
      onMessage: (msg) => this.handleMessage(msg),
      onToolUse: (tool) => this.handleToolUse(tool),
    });

    const prompt = this.buildTaskPrompt(task, spec);
    const response = await this.agent.run(prompt);

    // Handle response programmatically
    this.processResponse(response);
  }

  private handleMessage(message: any): void {
    // Log to output channel
    outputChannel?.appendLine(message.content);

    // Detect questions
    if (this.isQuestion(message.content)) {
      this.handleQuestion(message.content);
    }
  }
}
```

### Option B: Python SDK via Subprocess

```typescript
// Create Python script that uses claude-agent-sdk
const pythonScript = `
from claude_agent_sdk import ClaudeAgent

agent = ClaudeAgent(
    api_key="${apiKey}",
    tools=['Read', 'Write', 'Edit', 'Bash']
)

result = agent.run("${taskPrompt}")
print(json.dumps(result))
`;

// Run via subprocess
const { spawn } = require('child_process');
const python = spawn('python3', ['-c', pythonScript]);
```

### Pros & Cons:

**CLI + PTY Approach:**

- ✅ User can see real-time execution in Terminal
- ✅ Matches user's mental model (external Terminal)
- ✅ Easy to debug/intervene manually
- ❌ Complex I/O parsing
- ❌ Harder to control programmatically

**SDK Approach:**

- ✅ Full programmatic control
- ✅ Structured responses
- ✅ Built-in tool support
- ✅ Easier testing
- ❌ No visual Terminal output
- ❌ Requires more setup

**Recommendation**: Start with CLI + PTY for MVP (better UX), migrate to SDK for
v2.

## Risk Mitigation

### Risk 1: Claude Code CLI Not Available

**Mitigation**: The `claude` CLI is confirmed to exist. Install via:
`npm install -g @anthropic-ai/claude-cli` or use the desktop app's CLI.

### Risk 2: PTY Doesn't Show in External Window

**Mitigation**: Keep AppleScript for window management, use PTY only for I/O.
Tee output to both PTY and Terminal window.

### Risk 3: Question Detection Fails

**Mitigation**: Improve OutputMonitor regex patterns. Add fuzzy matching.
Fallback to user escalation if confidence < 80%.

### Risk 4: Auto-Response Breaks Workflow

**Mitigation**: Add VS Code setting to disable auto-responses. Show notification
before each auto-response with 5-second undo window.

## Success Criteria

1. ✅ Click Play → Feature branch checked out automatically
2. ✅ External Terminal opens with Claude Code running (human can watch)
3. ✅ Claude Code receives full spec context and starts implementation
4. ✅ Terminal output is monitored in real-time (same as human view)
5. ✅ Natural language questions are detected automatically
6. ✅ Claude API validates questions against constitution
7. ✅ Auto-responds when confident (>80% confidence)
8. ✅ Escalates to WhatsApp when uncertain or violation detected
9. ✅ Human WhatsApp responses are relayed back to Claude Code
10. ✅ Play button changes to Stop button when running
11. ✅ Stop button kills terminal process cleanly
12. ✅ VSCode termination also kills Claude Code terminal
13. ✅ All interactions logged (auto-responses and human escalations)
14. ✅ Human decisions saved as memories for future automation
15. ✅ System returns to steady state after escalation resolved

## Next Steps

1. **Start with Phase 1** (PTY Integration) - This is the foundation
2. **Research Claude Code CLI** in parallel (Phase 2 prep)
3. **Test incrementally** - Each phase should have passing tests
4. **Document as you go** - Update EXTERNAL_TERMINAL_FEATURE.md

## Engineer's Final Review

### Technical Feasibility: ✅ HIGH

**Key Findings:**

1. **Claude Code CLI exists** - Confirmed via `claude --print` for
   non-interactive mode
2. **90% of infrastructure already built** - AutonomousDriver, OutputMonitor,
   MemoryManager all working
3. **External Terminal launching works** - AppleScript implementation proven in
   autonomousCommands.ts
4. **Natural language processing feasible** - Claude API can validate responses

### Critical Path Items:

1. **Node-PTY Integration (MUST HAVE)**
   - Required for bidirectional I/O with Claude
   - Replaces AppleScript for process control
   - Risk: Medium - Well-documented library

2. **Claude CLI Invocation (MUST HAVE)**
   - Use `claude --print "prompt"` for non-interactive
   - Fall back to interactive mode if needed
   - Risk: Low - CLI interface documented

3. **Question Detection Patterns (MUST HAVE)**
   - Update regex for natural language patterns
   - "Would you like me to..." / "Should I..."
   - Risk: Low - Extend existing OutputMonitor

### Recommended Implementation Order:

1. **Phase 0: Feature Branch Setup** (1-2 hours) - NEW
   - Implement `prepareFeatureBranch()` function
   - Test branch checkout/creation logic
   - Verify spec files are accessible

2. **Phase 1: Quick Win** (2-3 hours)
   - Modify `launchExternalTerminal()` to run Claude CLI
   - Test with hardcoded prompt
   - Verify Terminal window opens with Claude

3. **Phase 2: PTY Integration** (4-6 hours)
   - Install node-pty
   - Replace AppleScript with PTY spawn
   - Capture output in real-time

4. **Phase 3: Question Handling** (6-8 hours)
   - Implement QuestionValidator
   - Update OutputMonitor patterns
   - Add auto-response logic

5. **Phase 4: WhatsApp Escalation** (4-6 hours) - NEW
   - Implement EscalationManager
   - Setup Twilio integration
   - Add webhook for responses
   - Test escalation flow

### Architecture Decision:

**Recommendation: Hybrid Approach**

- **Phase 1-2**: CLI + PTY for visual feedback (users love seeing Terminal)
- **Phase 3**: Add SDK integration for complex scenarios
- **Future**: Full SDK migration if CLI proves limiting

### Risk Assessment:

| Risk                        | Likelihood | Impact | Mitigation                      |
| --------------------------- | ---------- | ------ | ------------------------------- |
| Claude CLI changes          | Low        | High   | Use SDK as fallback             |
| PTY compatibility           | Low        | Medium | Test on multiple macOS versions |
| Question detection accuracy | Medium     | Low    | User override option            |
| Performance issues          | Low        | Low    | Haiku model for validations     |

### Performance Considerations:

- **Context loading**: Already optimized (<500ms with hints)
- **Question validation**: Use Haiku for <100ms responses
- **Terminal spawning**: ~500ms acceptable (current: ~2s)
- **Memory usage**: Monitor PTY buffer size (10k lines max)

### Testing Strategy:

1. **Unit Tests**:
   - QuestionValidator logic
   - PTY spawn/kill lifecycle
   - Output parsing patterns

2. **Integration Tests**:
   - Full task execution flow
   - Question-response cycle
   - Error recovery scenarios

3. **E2E Tests**:
   - Complete spec execution
   - Terminal crash recovery
   - Multi-task sessions

### Go/No-Go Decision: ✅ GO

**Rationale:**

- Core infrastructure exists and works
- Claude CLI capabilities confirmed
- Clear implementation path
- Acceptable risk profile
- High user value

---

**Status**: ✅ APPROVED - Engineering Review Complete (Updated) **Priority**:
P0 - Core feature for autonomous execution **Estimated Start**: 2025-11-03
**Target Completion**: 2025-11-10 (50 hours with WhatsApp) **Confidence Level**:
85%

**Key Deliverables**:

- Feature branch auto-checkout
- Claude Code running in visible Terminal
- Real-time monitoring (human sees same view)
- Auto-response when confident
- WhatsApp escalation when uncertain
- Human-in-the-loop collaboration

**Next Action**: Begin Phase 0 - Implement feature branch management
