# Data Model: Autonomous Claude Code Driver

## Overview

This document defines the data structures used by the Autonomous Claude Code
Driver for state management, event tracking, and inter-module communication.

## Core Entities

### AutonomousSession

**Purpose**: Represents a single autonomous implementation session

**Lifecycle**: Created on "Start Autonomous" → Persisted every 30s → Archived on
completion

**Storage**: `.specify/state/sessions/{sessionId}.json`

```typescript
interface AutonomousSession {
  // Identity
  sessionId: string; // UUID v4
  specId: string; // e.g., "001-user-authentication"

  // Timestamps
  startedAt: string; // ISO 8601
  pausedAt: string | null;
  resumedAt: string | null;
  completedAt: string | null;

  // Status
  status: SessionStatus;

  // Terminals
  terminals: TerminalState[];

  // Progress
  totalTasks: number;
  completedTasks: string[]; // Task IDs: ["T001", "T002"]
  currentTask: string | null; // Task ID: "T003"
  failedTasks: TaskFailure[];

  // Context management
  tokenCount: number;
  contextSwitches: number;

  // History (for debugging)
  events: SessionEvent[];
  errorHistory: ErrorEvent[];
  questionHistory: QuestionEvent[];

  // Configuration
  options: DriverOptions;
}

type SessionStatus =
  | 'initializing' // Spawning terminals, loading tasks
  | 'running' // Claude is executing tasks
  | 'waiting_user' // Waiting for user response to question
  | 'paused' // User manually paused
  | 'completed' // All tasks done, tests pass
  | 'failed' // Fatal error, cannot proceed
  | 'cancelled'; // User cancelled execution
```

### TerminalState

**Purpose**: Tracks state of a single Claude Code terminal

```typescript
interface TerminalState {
  // Identity
  terminalId: string; // VSCode terminal ID
  terminalName: string; // "SpecGofer: Engineer" | "SpecGofer: Tester"
  role: TerminalRole;

  // Lifecycle
  createdAt: string;
  closedAt: string | null;

  // Status
  isAlive: boolean;
  pid: number | null;

  // Output capture
  outputBuffer: string[]; // Last 10,000 lines (circular)
  tokenCount: number; // Estimated from output length

  // Current activity
  currentCommand: string | null; // Last command sent
  lastActivity: string; // ISO 8601 of last output
}

type TerminalRole = 'engineer' | 'tester';
```

### TaskUpdate

**Purpose**: Represents a task status change event

```typescript
interface TaskUpdate {
  // Identity
  taskId: string; // "T001"
  specId: string;

  // Status change
  previousStatus: TaskStatus;
  newStatus: TaskStatus;

  // Context
  terminalId: string; // Which terminal executed it
  timestamp: string;
  duration: number | null; // Milliseconds (if completed)

  // Artifacts
  filesModified: string[];
  testsRun: TestResult[];
  errors: ErrorInfo[];
}

type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'failed';
```

### ErrorInfo

**Purpose**: Represents a detected error during execution

```typescript
interface ErrorInfo {
  // Identity
  errorId: string; // UUID
  taskId: string;

  // Classification
  errorType: ErrorType;
  severity: 'recoverable' | 'needs_context' | 'fatal';

  // Detection
  detectedAt: string;
  detectionLatency: number; // ms from occurrence to detection

  // Content
  errorMessage: string;
  stackTrace: string | null;
  affectedFiles: string[];

  // Recovery attempts
  retryAttempts: RetryAttempt[];
  recovered: boolean;
  escalated: boolean;
}

type ErrorType =
  | 'syntax_error'
  | 'type_error'
  | 'test_failure'
  | 'linting_error'
  | 'runtime_error'
  | 'dependency_missing'
  | 'authentication_failure';
```

### RetryAttempt

**Purpose**: Tracks a single retry attempt after an error

```typescript
interface RetryAttempt {
  attemptNumber: number; // 1, 2, or 3
  timestamp: string;
  strategy: RetryStrategy;
  contextAdded: string[]; // What additional context was provided
  result: 'success' | 'failed' | 'escalated';
  durationMs: number;
}

type RetryStrategy =
  | 'send_error_only' // Attempt 1: Just show the error
  | 'send_error_with_file_context' // Attempt 2: + file contents
  | 'send_error_with_constitution'; // Attempt 3: + constitution rules
```

### Question

**Purpose**: Represents a question Claude asked that needs user input

```typescript
interface Question {
  // Identity
  questionId: string; // UUID
  taskId: string;
  sessionId: string;

  // Detection
  detectedAt: string;
  confidence: 'high' | 'medium' | 'low';
  patterns: string[]; // Which regex patterns matched

  // Content
  questionText: string; // Full extracted question
  options: string[]; // ["Option A: ...", "Option B: ..."]
  context: string; // Surrounding terminal output

  // Routing
  notificationChannel: NotificationChannel;
  sentAt: string | null;

  // Response
  userResponse: string | null;
  respondedAt: string | null;
  sentToClaudeAt: string | null;
  timeout: boolean; // Did we hit 4hr timeout?
}

type NotificationChannel = 'vscode' | 'whatsapp' | 'email';
```

### ProgressUpdate

**Purpose**: UI update event for real-time progress display

```typescript
interface ProgressUpdate {
  sessionId: string;
  timestamp: string;

  // Progress metrics
  tasksCompleted: number;
  tasksTotal: number;
  percentComplete: number;
  estimatedTimeRemaining: number | null; // ms

  // Current activity
  currentTask: string | null;
  currentTerminal: string;
  currentAction: string; // "Implementing auth service..."

  // Status indicators
  testsRun: number;
  testsPassed: number;
  testsFailed: number;

  // Performance
  elapsedTime: number; // ms
  tokensUsed: number;
  contextSwitches: number;
}
```

### DriverOptions

**Purpose**: Configuration options for autonomous execution

```typescript
interface DriverOptions {
  // Mode
  enableParallelTester: boolean; // Run Engineer + Tester in parallel?

  // Terminal visibility
  showTerminals: boolean; // Show or hide Claude terminals?

  // Notification preferences
  notificationChannel: NotificationChannel;
  whatsappPhoneNumber: string | null;
  emailAddress: string | null;

  // Thresholds
  maxRetries: number; // Default: 3
  tokenWarningThreshold: number; // Default: 160000
  tokenActionThreshold: number; // Default: 180000
  questionTimeout: number; // Default: 14400000 (4 hours)

  // Validation
  runFinalValidation: boolean; // Run lint/test after completion?
  validateConstitution: boolean; // Check constitution compliance?
}
```

## Session Event Log

All session events are stored in `events[]` array for audit trail:

```typescript
interface SessionEvent {
  timestamp: string;
  type: SessionEventType;
  data: Record<string, unknown>;
}

type SessionEventType =
  | 'session_started'
  | 'terminal_spawned'
  | 'command_sent'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'error_detected'
  | 'retry_attempted'
  | 'question_detected'
  | 'question_answered'
  | 'context_switch'
  | 'user_paused'
  | 'user_resumed'
  | 'session_completed'
  | 'session_failed'
  | 'session_cancelled';
```

## State Persistence

### File Structure

```
.specify/state/
├── sessions/
│   ├── {sessionId}.json          # Active session state
│   └── {sessionId}.json.bak      # Backup (written before update)
├── progress.json                 # Current progress (for UI)
└── logs/
    └── autonomous-{date}.log     # Structured JSON logs
```

### Persistence Strategy

**Auto-save**:

- Every 30 seconds (if state changed)
- On task completion
- On error detection
- On question detection
- On user pause/resume

**Atomic writes**:

```typescript
async function saveSession(session: AutonomousSession): Promise<void> {
  const sessionPath = `.specify/state/sessions/${session.sessionId}.json`;
  const backupPath = `${sessionPath}.bak`;

  // 1. Write to backup file
  await fs.writeFile(backupPath, JSON.stringify(session, null, 2));

  // 2. Atomic rename (overwrites existing)
  await fs.rename(backupPath, sessionPath);
}
```

### Session Resume

On VSCode restart:

```typescript
async function resumeSession(
  sessionId: string
): Promise<AutonomousSession | null> {
  const sessionPath = `.specify/state/sessions/${sessionId}.json`;

  if (!(await fs.exists(sessionPath))) {
    return null;
  }

  const session = JSON.parse(await fs.readFile(sessionPath, 'utf-8'));

  // Validate session can be resumed
  if (session.status === 'completed' || session.status === 'cancelled') {
    return null; // Already finished
  }

  // Check if terminals are still alive
  for (const terminal of session.terminals) {
    if (!isTerminalAlive(terminal.terminalId)) {
      terminal.isAlive = false;
      terminal.closedAt = new Date().toISOString();
    }
  }

  return session;
}
```

## Data Validation

All data structures include runtime validation using Zod:

```typescript
import { z } from 'zod';

const AutonomousSessionSchema = z.object({
  sessionId: z.string().uuid(),
  specId: z.string().regex(/^\d{3}-/),
  startedAt: z.string().datetime(),
  status: z.enum([
    'initializing',
    'running',
    'waiting_user',
    'paused',
    'completed',
    'failed',
    'cancelled',
  ]),
  terminals: z.array(TerminalStateSchema),
  totalTasks: z.number().int().min(0),
  completedTasks: z.array(z.string()),
  // ... rest of schema
});

// Usage
function loadSession(data: unknown): AutonomousSession {
  return AutonomousSessionSchema.parse(data); // Throws if invalid
}
```

## Memory Management

**Circular Buffer for Terminal Output**:

```typescript
class CircularBuffer {
  private buffer: string[] = [];
  private maxSize: number = 10000; // lines

  push(line: string): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift(); // Remove oldest
    }
    this.buffer.push(line);
  }

  getRecent(count: number): string[] {
    return this.buffer.slice(-count);
  }
}
```

**Event History Pruning**:

- Keep last 1000 events per session
- Archive completed sessions after 30 days
- Prune old logs older than 90 days

## Database Schema (Future)

Currently file-based, but if we move to SQLite:

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  spec_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  data JSON NOT NULL
);

CREATE INDEX idx_sessions_spec ON sessions(spec_id);
CREATE INDEX idx_sessions_status ON sessions(status);

CREATE TABLE events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSON,
  FOREIGN KEY(session_id) REFERENCES sessions(session_id)
);

CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_type ON events(type);
```

## Relationships

```
AutonomousSession (1) ──┬─> (N) TerminalState
                        │
                        ├─> (N) TaskUpdate
                        │
                        ├─> (N) ErrorInfo ──> (N) RetryAttempt
                        │
                        ├─> (N) Question
                        │
                        └─> (N) SessionEvent
```

## State Transitions

```
Session Status Flow:
initializing → running → [waiting_user | paused] → running → completed
                  ↓                                     ↓
                failed                              cancelled

Task Status Flow:
pending → in_progress → testing → completed
             ↓              ↓
           failed        failed
```

## Example Session State

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "specId": "005-autonomous-claude-driver",
  "startedAt": "2025-10-31T09:00:00.000Z",
  "status": "running",
  "terminals": [
    {
      "terminalId": "vscode-term-123",
      "terminalName": "SpecGofer: Engineer",
      "role": "engineer",
      "createdAt": "2025-10-31T09:00:01.000Z",
      "isAlive": true,
      "pid": 12345,
      "tokenCount": 45000,
      "currentCommand": "/speckit.implement"
    }
  ],
  "totalTasks": 23,
  "completedTasks": ["T001", "T002", "T003"],
  "currentTask": "T004",
  "tokenCount": 45000,
  "contextSwitches": 0,
  "events": [
    {
      "timestamp": "2025-10-31T09:00:00.000Z",
      "type": "session_started",
      "data": { "specId": "005-autonomous-claude-driver" }
    },
    {
      "timestamp": "2025-10-31T09:00:01.000Z",
      "type": "terminal_spawned",
      "data": { "terminalId": "vscode-term-123", "role": "engineer" }
    },
    {
      "timestamp": "2025-10-31T09:00:05.000Z",
      "type": "task_started",
      "data": { "taskId": "T001" }
    },
    {
      "timestamp": "2025-10-31T09:02:15.000Z",
      "type": "task_completed",
      "data": { "taskId": "T001", "duration": 130000 }
    }
  ],
  "options": {
    "enableParallelTester": false,
    "showTerminals": true,
    "notificationChannel": "vscode",
    "maxRetries": 3,
    "tokenWarningThreshold": 160000,
    "tokenActionThreshold": 180000
  }
}
```
