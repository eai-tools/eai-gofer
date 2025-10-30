---
id: 005
title: Autonomous Claude Code Driver
status: draft
created: 2025-10-30
updated: 2025-10-30
---

# Autonomous Claude Code Driver

## Overview

SpecGofer must autonomously drive Claude Code terminals to implement features end-to-end without manual intervention. The extension spawns, monitors, and manages Claude Code sessions, handles errors/timeouts, manages context window limits, and escalates questions to the user only when necessary.

## User Scenarios

### Primary User Flow

**As a** developer with a fully-specified feature branch
**I want** SpecGofer to autonomously implement the entire feature
**So that** I can focus on architecture/design while AI handles implementation

**Workflow:**

1. User creates feature spec with plan and tasks in `.specify/specs/###-feature/`
2. User clicks "▶️ Start Autonomous Implementation" button in SpecGofer sidebar
3. SpecGofer spawns Claude Code terminal and sends `/speckit.implement` command
4. SpecGofer continuously monitors Claude's output for:
   - Task progress (updates sidebar in real-time)
   - Errors/failures (attempts retry with context)
   - Questions needing user input (routes to WhatsApp/notification)
   - Context window warnings (spawns fresh terminal with summary)
   - Completion (runs final validation)
5. User receives notification only when:
   - Feature is 100% complete with tests passing
   - Architecture question needs decision (2-3 options provided)
   - Unrecoverable error after 3 retry attempts

### Engineer + Tester Parallel Execution

**As a** developer implementing complex features
**I want** SpecGofer to run engineer and tester agents in parallel
**So that** code is validated continuously during implementation

**Workflow:**

1. SpecGofer spawns two Claude Code terminals:
   - Terminal 1: Engineer (implements features per tasks.md)
   - Terminal 2: Tester (runs tests, validates acceptance criteria)
2. Engineer terminal executes implementation tasks
3. After each task completion, Tester terminal runs:
   - Unit tests for just-implemented code
   - Integration tests if dependencies complete
   - Constitution validation check
4. If tests fail, Tester reports to Engineer with specific failures
5. Engineer fixes issues in same context window
6. Process repeats until all tasks complete with passing tests

### Context Window Management

**As a** SpecGofer instance managing long-running features
**I want** to detect context window exhaustion and spawn fresh sessions
**So that** Claude Code doesn't hit token limits mid-implementation

**Detection Triggers:**

- Claude output contains "context window" or "token limit" warnings
- Claude starts repeating itself or forgetting earlier decisions
- Response time degrades significantly (>2min for simple tasks)
- Manual token counting exceeds 180K tokens

**Recovery Process:**

1. Pause current terminal
2. Generate context summary:
   - Completed tasks (marked ✅ in tasks.md)
   - Current task and status
   - Key architecture decisions made
   - Files created/modified with purpose
3. Spawn new Claude Code terminal
4. Send summary + remaining tasks as fresh prompt
5. Resume execution from current task

## Requirements

### Functional Requirements

#### FR-001: Terminal Lifecycle Management

SpecGofer MUST:

- Create Claude Code terminals via VSCode Terminal API
- Send commands to terminal using `terminal.sendText()`
- Capture terminal output using `window.onDidWriteTerminalData`
- Detect terminal closure/crashes and restart automatically
- Support multiple concurrent terminals (engineer + tester)
- Clean up terminals on feature completion or user cancellation

#### FR-002: Output Monitoring and Parsing

SpecGofer MUST:

- Stream terminal output to internal buffer (last 10,000 lines)
- Parse output for task progress indicators:
  - Task completion: `✅ Task #T###:`
  - Task start: `🔄 Task #T###:`
  - Task failure: `❌ Task #T###:`
  - Test results: `Tests: X/Y passed`
- Detect error patterns:
  - TypeScript compilation errors
  - Test failures with stack traces
  - Linting/formatting issues
  - Dependency/import errors
- Identify questions needing user input:
  - "Which approach should I use?"
  - "Option A: ... Option B: ..."
  - "I'm blocked on..."
  - "Should I..."

#### FR-003: Error Recovery

SpecGofer MUST:

- Detect errors within 5 seconds of occurrence
- Categorize errors:
  - **Recoverable**: Syntax errors, test failures, linting issues
  - **Needs Context**: Architecture decisions, missing info
  - **Fatal**: Dependency missing, authentication failure
- Retry recoverable errors:
  - Attempt #1: Send error output back to Claude with "Please fix"
  - Attempt #2: Send error + relevant file context
  - Attempt #3: Send error + constitution rules + similar working code
- Escalate after 3 failed attempts:
  - Collect error details, attempts made, current code state
  - Send to user via configured notification channel
  - Wait for user guidance before resuming

#### FR-004: Context Window Management

SpecGofer MUST:

- Estimate token count from terminal output (approximate: chars / 3.5)
- Track cumulative conversation size
- Warn at 160K tokens, act at 180K tokens
- Generate continuation summary containing:
  - Completed tasks (IDs + brief descriptions)
  - In-progress task with current status
  - Key decisions (from constitution validation checks)
  - File structure changes (new files, major refactors)
  - Next tasks in queue
- Spawn new terminal with summary as initial prompt
- Continue execution seamlessly (user-invisible)

#### FR-005: Question Routing

SpecGofer MUST:

- Detect when Claude asks architectural questions
- Extract question + options using regex patterns
- Validate question is genuine (not rhetorical or progress update)
- Route to configured escalation channel:
  - **WhatsApp**: Send via WhatsApp Business API
  - **VSCode Notification**: Show interactive prompt
  - **Email**: Send to configured address
- Wait for user response (timeout: 4 hours)
- Send response back to Claude Code terminal
- Resume execution

#### FR-006: Progress Tracking Integration

SpecGofer MUST:

- Update ProgressProvider in real-time as tasks complete
- Mark tasks in `tasks.md` with status:
  - `- [x]` for completed tasks
  - `- [ ]` for pending tasks
- Update spec status in YAML frontmatter:
  - `in_progress` when first task starts
  - `completed` when all tasks done + tests pass
- Show live metrics in status bar:
  - `SpecGofer: 12/45 tasks (26%) | 2h 15m elapsed`
- Log all activity to Output panel for debugging

#### FR-007: Parallel Agent Execution

SpecGofer MUST:

- Support running Engineer + Tester in separate terminals
- Coordinate task handoff:
  - Engineer completes task → notifies Tester
  - Tester validates → notifies Engineer (pass/fail)
  - Engineer fixes issues → loop until pass
- Prevent race conditions (file write conflicts)
- Aggregate output from both agents in unified log
- Show both agents' status in sidebar:
  ```
  📋 001-feature (IN PROGRESS)
     Engineer: Task #T012 (implementing auth service)
     Tester: Task #T011 (validating user model tests)
  ```

### Non-Functional Requirements

#### NFR-001: Performance

- Terminal creation: <500ms
- Output parsing: <50ms per chunk (real-time streaming)
- Error detection: <5s from occurrence
- Context switch: <10s (summary generation + new terminal spawn)
- Memory: <200MB for output buffers (10K lines × ~20KB avg)

#### NFR-002: Reliability

- Crash recovery: Automatically restart on terminal failure
- State persistence: Save progress every 30s to `.specify/state/progress.json`
- Graceful shutdown: Save state on VSCode close, resume on reopen
- Retry limits: Max 3 attempts before escalation (prevent infinite loops)

#### NFR-003: Observability

- Structured logging: JSON logs to `.specify/logs/autonomous-{date}.log`
- Output panel: Real-time activity stream in "SpecGofer Autonomous" channel
- Status bar: Live progress indicator with time elapsed
- Final report: Markdown summary at `.specify/reports/###-feature-report.md`

#### NFR-004: Security

- No secrets in terminal output buffers
- Sanitize output before sending to external notifications
- Require user confirmation before first autonomous run (terms acceptance)
- Rate limiting: Max 1 WhatsApp message per 5 minutes (prevent spam)

## Acceptance Criteria

### AC-001: Basic Autonomous Flow

✅ GIVEN a spec with tasks.md exists
✅ WHEN user clicks "▶️ Start Autonomous Implementation"
✅ THEN SpecGofer spawns Claude Code terminal
✅ AND sends `/speckit.implement` command
✅ AND sidebar shows "IN PROGRESS" status

### AC-002: Task Progress Tracking

✅ GIVEN Claude Code is executing tasks
✅ WHEN Claude completes a task (outputs `✅ Task #T005:`)
✅ THEN SpecGofer marks task complete in `tasks.md`
✅ AND updates sidebar tree view with ✅ icon
✅ AND increments progress counter in status bar

### AC-003: Error Detection and Retry

✅ GIVEN Claude encounters a TypeScript error
✅ WHEN error appears in terminal output
✅ THEN SpecGofer detects error within 5 seconds
✅ AND sends error back to Claude with "Please fix"
✅ AND retries up to 3 times
✅ AND escalates to user if still failing

### AC-004: Question Escalation

✅ GIVEN Claude asks "Option A or Option B?"
✅ WHEN question detected in output
✅ THEN SpecGofer extracts question + options
✅ AND sends WhatsApp notification (if configured)
✅ OR shows VSCode prompt (if no WhatsApp)
✅ AND waits for user response
✅ AND sends response back to Claude

### AC-005: Context Window Handling

✅ GIVEN Claude conversation reaches 180K tokens
✅ WHEN SpecGofer detects token limit approaching
✅ THEN SpecGofer generates context summary
✅ AND spawns new Claude Code terminal
✅ AND sends summary + remaining tasks
✅ AND Claude continues without data loss

### AC-006: Completion Validation

✅ GIVEN all tasks are marked complete
✅ WHEN SpecGofer detects `tasks.md` is 100% done
✅ THEN SpecGofer runs final validation:
✅ - `npm run lint` passes
✅ - `npm run test` passes
✅ - Constitution compliance check passes
✅ AND notifies user "Feature complete!"
✅ AND generates implementation report

### AC-007: Parallel Engineer + Tester

✅ GIVEN autonomous mode starts with tester enabled
✅ WHEN SpecGofer spawns terminals
✅ THEN two terminals are created (Engineer + Tester)
✅ AND Engineer executes implementation tasks
✅ AND Tester validates each completed task
✅ AND failures are sent back to Engineer
✅ AND both agents' status shows in sidebar

## Technical Design

### Architecture

```
extension/src/
├── autonomous/
│   ├── AutonomousDriver.ts          # Main orchestrator
│   ├── TerminalManager.ts           # Claude Code terminal lifecycle
│   ├── OutputMonitor.ts             # Stream parsing + pattern detection
│   ├── ErrorRecovery.ts             # Retry logic + escalation
│   ├── ContextManager.ts            # Token tracking + summary generation
│   ├── QuestionRouter.ts            # Detect + route questions to user
│   ├── ParallelCoordinator.ts       # Manage Engineer + Tester agents
│   └── ProgressReporter.ts          # Update UI + persist state
```

### Key Classes

#### AutonomousDriver

```typescript
class AutonomousDriver {
  async start(specId: string, options: DriverOptions): Promise<void>
  async stop(): Promise<void>
  async pause(): Promise<void>
  async resume(): Promise<void>

  // Hooks for monitoring
  onProgress(callback: (update: ProgressUpdate) => void): void
  onQuestion(callback: (q: Question) => Promise<string>): void
  onError(callback: (error: DriverError) => void): void
  onComplete(callback: (report: CompletionReport) => void): void
}
```

#### TerminalManager

```typescript
class TerminalManager {
  async createTerminal(name: string): Promise<vscode.Terminal>
  async sendCommand(terminalId: string, command: string): Promise<void>
  async captureOutput(terminalId: string): AsyncIterator<string>
  async closeTerminal(terminalId: string): Promise<void>

  // Health monitoring
  isAlive(terminalId: string): boolean
  restartTerminal(terminalId: string): Promise<void>
}
```

#### OutputMonitor

```typescript
class OutputMonitor {
  parseStream(output: string): ParsedEvent[]

  // Pattern matchers
  detectTaskCompletion(output: string): TaskUpdate | null
  detectError(output: string): ErrorInfo | null
  detectQuestion(output: string): Question | null
  detectContextWarning(output: string): boolean
}
```

### Integration Points

1. **ProgressProvider**: Call `updateTaskStatus()` when tasks complete
2. **SpecLoader**: Read `tasks.md` and `plan.md` for context
3. **WhatsAppClient**: Send notifications via `sendMessage()`
4. **Constitution Validator**: Run compliance checks after completion
5. **MCP Tools**: Claude Code uses existing tools during execution

## Dependencies

- **Internal**: ProgressProvider, SpecLoader, WhatsAppClient
- **VSCode API**: `window.createTerminal`, `window.onDidWriteTerminalData`
- **External**: None (uses existing infrastructure)

## Testing Strategy

### Unit Tests

- TerminalManager: Mock VSCode Terminal API
- OutputMonitor: Test regex patterns with sample outputs
- ErrorRecovery: Verify retry logic and escalation thresholds
- ContextManager: Validate token counting and summary generation

### Integration Tests

- Spawn real terminal, send command, capture output
- Test error detection → retry → escalation flow
- Verify parallel engineer + tester coordination
- Test context window rollover with real conversation

### E2E Tests

- Full autonomous run on sample spec (001-sample-feature)
- Simulate Claude errors and verify recovery
- Test question routing via mock WhatsApp
- Verify final validation and report generation

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Claude Code API changes | High | Low | Monitor VSCode API, add version checks |
| Terminal output parsing fails | High | Medium | Fallback to file-based (.claude-output.txt) |
| Context window estimation inaccurate | Medium | Medium | Use conservative thresholds (160K not 190K) |
| User never responds to question | Medium | Low | 4-hour timeout, then pause with notification |
| Infinite retry loop | Medium | Low | Hard limit: 3 retries then escalate |

## Open Questions

1. **Terminal UI**: Should we show Claude Code terminals or hide them?
   - **Recommendation**: Show by default, add setting to hide
   - **Rationale**: Transparency builds trust during early adoption

2. **Notification channel priority**: WhatsApp, VSCode, Email - which first?
   - **Recommendation**: User-configurable in settings, default to VSCode
   - **Rationale**: Not all users want WhatsApp integration

3. **Multi-spec execution**: Can users queue multiple features?
   - **Recommendation**: MVP = one at a time, V2 = queue support
   - **Rationale**: Context switching between specs is complex

4. **Manual intervention**: Can user interrupt and take over mid-execution?
   - **Recommendation**: Yes, "Pause" button that lets user type commands
   - **Rationale**: Essential safety valve for debugging

## Success Metrics

- **Automation Rate**: % of tasks completed without human intervention (target: >80%)
- **Error Recovery**: % of errors resolved via retry without escalation (target: >60%)
- **Context Efficiency**: Avg tasks completed per Claude Code session before rollover (target: >20)
- **Time to Completion**: Average time per task vs. manual implementation (target: 2-5x faster)
- **User Satisfaction**: Net Promoter Score from autonomous feature users (target: >50)
