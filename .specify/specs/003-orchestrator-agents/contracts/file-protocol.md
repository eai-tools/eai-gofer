# File-Based Communication Protocol

**Purpose**: Define file-based communication between Orchestrator and Claude Code for task execution and Q&A

**Protocol Version**: 1.0.0
**Communication Method**: File watching (Chokidar) + atomic writes
**Files**: `.claude-input.txt`, `.claude-output.txt`, `.claude-question.txt`

---

## Communication Files

### 1. `.claude-input.txt` (Orchestrator → Claude Code)

**Purpose**: Send task delivery prompts and retry feedback to Claude Code

**Location**: Repository root (`.claude-input.txt`)

**Format**: Plain text (Markdown-formatted prompts)

**Write Strategy**:
- Orchestrator writes atomically (write to temp, then rename)
- File cleared after Claude Code reads (or timeout after 5 minutes)
- Chokidar detects changes within 300ms (FR requirement)

**Example Content** (Task Delivery):
```markdown
## Task: T001 - Create User Authentication System

**Specification**: 003-orchestrator-agents

**Description**: Implement user login with JWT tokens following constitution security principles.

**Requirements**:
- Use bcrypt for password hashing
- JWT expiry <1 hour
- Input validation for email/password
- Rate limiting (100 req/min)

**Constitution Check**:
- ✅ Test-driven development required
- ✅ Strict TypeScript (no `any`)
- ✅ File size ≤500 lines
- ✅ 80%+ test coverage

**Dependencies**: None (first task)

**Deliverables**:
1. Implementation code
2. Unit tests
3. Integration tests

Please implement and respond when complete.
```

**Example Content** (Retry with Feedback):
```markdown
## Task: T001 - Create User Authentication System (Attempt 2/3)

**Previous Attempt Failed**: Tests failed with 5 errors

**Failed Tests**:
- test_login_with_invalid_email: AssertionError: Expected 401, got 500
- test_rate_limiting: AssertionError: Expected blocked after 100 requests, blocked after 50

**Engineer Agent Feedback**:
- Issue (CRITICAL): JWT expiry set to 24 hours, violates constitution (must be <1 hour)
- Issue (MAJOR): Email validation missing, allows SQL injection attack vectors
- Suggestion: Update JWT_EXPIRY constant to 3600 seconds
- Suggestion: Add email regex validation in AuthService.validateEmail()

**Please fix these issues and resubmit**.
```

---

### 2. `.claude-output.txt` (Claude Code → Orchestrator)

**Purpose**: Claude Code signals task completion and provides implementation summary

**Location**: Repository root (`.claude-output.txt`)

**Format**: Plain text (structured response)

**Write Strategy**:
- Claude Code writes when task complete
- Orchestrator reads and clears file immediately
- If file not updated within 5 minutes, orchestrator logs WARN and retries

**Example Content** (Success):
```markdown
## Task T001 Complete

**Status**: ✅ Implemented and tested

**Files Modified**:
- `src/auth/AuthService.ts` (new, 287 lines)
- `src/auth/JWTService.ts` (new, 145 lines)
- `tests/unit/auth/AuthService.test.ts` (new, 198 lines)
- `tests/integration/auth/login-flow.test.ts` (new, 87 lines)

**Test Results**:
- Unit tests: 45/45 passed
- Integration tests: 12/12 passed
- Coverage: 94% (line), 89% (branch)

**Constitution Compliance**:
- ✅ Strict TypeScript (no `any`)
- ✅ File sizes: AuthService (287), JWTService (145) - all under 500 lines
- ✅ Test coverage: 94% (exceeds 80% requirement)
- ✅ Security: bcrypt hashing, JWT expiry 3600s (<1 hour)

Ready for validation.
```

**Example Content** (Failure):
```markdown
## Task T001 - Unable to Complete

**Status**: ❌ Blocked

**Reason**: Missing dependency - bcrypt package not installed

**Question**: Should I install bcrypt via npm, or is there a preferred alternative for password hashing?

**Context**: Constitution requires password hashing (principle V), but bcrypt not in package.json.

Awaiting guidance.
```

---

### 3. `.claude-question.txt` (Claude Code → Orchestrator)

**Purpose**: Claude Code asks clarification questions about requirements

**Location**: Repository root (`.claude-question.txt`)

**Format**: Plain text (structured question)

**Write Strategy**:
- Claude Code writes when question arises
- Orchestrator reads, invokes Q&A Engine or escalates to human
- File cleared after answer provided via `.claude-input.txt`

**Example Content**:
```markdown
## Question about Task T003

**Context**: Implementing notification service

**Question**: The spec mentions "WhatsApp notifications" but doesn't specify authentication method. Should I use:
- A) WhatsApp Business API (requires paid account)
- B) whatsapp-web.js (requires QR scan)
- C) Something else?

**Impact**: Architecture choice affects setup requirements and operational complexity.

**Related Spec**: 003-orchestrator-agents, FR-009
```

---

## File Watching (Chokidar)

### Configuration

```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch(
  ['.claude-output.txt', '.claude-question.txt'],
  {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,  // Wait 300ms after last change
      pollInterval: 100          // Check every 100ms
    }
  }
);

watcher
  .on('change', (path) => {
    if (path === '.claude-output.txt') {
      handleClaudeCodeResponse();
    } else if (path === '.claude-question.txt') {
      handleClaudeCodeQuestion();
    }
  })
  .on('error', (error) => {
    logger.error({ event: 'file_watch_error', error: error.message });
  });
```

### Event Handling

**File Change Detection**:
- Chokidar fires `change` event when file modified
- Orchestrator reads file content immediately
- If file empty or malformed, log WARN and ignore

**Debouncing**:
- `awaitWriteFinish` ensures file write is complete before triggering event
- Prevents partial reads during multi-chunk writes
- 300ms stability threshold aligns with FR-002 requirement (<300ms detection)

**Duplicate Prevention**:
- Track last processed file mtime
- If mtime unchanged, skip processing (already handled)
- Clear file after processing to prevent re-triggering

---

## Message Flow Diagram

```
Orchestrator                    Claude Code
     │                               │
     │ 1. Write .claude-input.txt    │
     ├──────────────────────────────>│
     │                               │
     │                               │ 2. Read prompt
     │                               │ 3. Implement code
     │                               │ 4. Run tests
     │                               │
     │ 5. Write .claude-output.txt   │
     │<──────────────────────────────┤
     │                               │
     │ 6. Read response              │
     │ 7. Clear .claude-output.txt   │
     │                               │
     │ 8. Validate & test            │
     │                               │
     │ IF SUCCESS:                   │
     │   9. Mark task complete       │
     │   10. Next task               │
     │                               │
     │ IF FAILURE:                   │
     │   9. Write feedback to        │
     │      .claude-input.txt        │
     ├──────────────────────────────>│
     │   10. Retry (up to 3x)        │
```

**Q&A Flow**:
```
Claude Code                    Orchestrator                 Q&A Engine / Human
     │                               │                               │
     │ 1. Write .claude-question.txt │                               │
     ├──────────────────────────────>│                               │
     │                               │                               │
     │                               │ 2. Read question              │
     │                               │ 3. Invoke Q&A Engine          │
     │                               ├──────────────────────────────>│
     │                               │                               │
     │                               │ 4. Return answer + confidence │
     │                               │<──────────────────────────────┤
     │                               │                               │
     │                               │ IF confidence ≥80%:           │
     │                               │   5. Write answer to          │
     │                               │      .claude-input.txt        │
     │ 6. Read answer                │<──────────────────────────────┤
     │<──────────────────────────────┤                               │
     │                               │                               │
     │                               │ IF confidence <80%:           │
     │                               │   5. Escalate to human        │
     │                               │      (Notification)           │
     │                               │   6. Wait for human response  │
     │                               │   7. Write human answer       │
     │                               │      to .claude-input.txt     │
```

---

## Error Handling

### Timeout (No Response)

If Claude Code doesn't write `.claude-output.txt` within 5 minutes:
```typescript
async function waitForClaudeResponse(taskId: string, timeout: number = 300000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (fs.existsSync('.claude-output.txt')) {
      const content = await fs.readFile('.claude-output.txt', 'utf-8');
      await fs.unlink('.claude-output.txt'); // Clear file
      return content;
    }
    await sleep(1000); // Check every second
  }

  logger.warn({
    event: 'claude_response_timeout',
    taskId,
    timeout_ms: timeout
  });

  throw new Error('Claude Code did not respond within 5 minutes');
}
```

**Action**: Log WARN, mark task as failed, escalate to human with "Claude Code unresponsive" message

### Malformed Response

If `.claude-output.txt` contains unparseable content:
```typescript
function parseClaudeResponse(content: string): ClaudeResponse {
  try {
    // Extract status, files, test results from structured text
    const status = content.match(/\*\*Status\*\*: (.+)/)?.[1];
    if (!status) {
      throw new Error('Missing status field');
    }
    // ... parse other fields
  } catch (error) {
    logger.warn({
      event: 'claude_response_malformed',
      content_preview: content.substring(0, 200),
      error: error.message
    });
    throw new Error('Could not parse Claude Code response');
  }
}
```

**Action**: Log WARN, treat as task failure, retry with clearer instructions

### File System Errors

If `.claude-input.txt` write fails (permissions, disk full):
```typescript
async function sendToClaudeCode(prompt: string): Promise<void> {
  try {
    await fs.writeFile('.claude-input.txt', prompt, 'utf-8');
    logger.info({ event: 'prompt_sent', length: prompt.length });
  } catch (error) {
    logger.error({
      event: 'file_write_error',
      file: '.claude-input.txt',
      error: error.message
    });
    throw new Error('Cannot write prompt to file system');
  }
}
```

**Action**: Log ERROR, halt orchestrator, alert operator (critical infrastructure failure)

---

## Conflict Resolution

### Concurrent Modifications

If `.claude-output.txt` modified externally during processing:
- Orchestrator uses mtime tracking (per R2 in research.md)
- If mtime changed since last read, log WARNING
- Orchestrator's read takes precedence (last-read-wins)
- External modifications logged for operator review

### Stale Files

If orchestrator restarts and finds `.claude-*.txt` files from previous run:
```typescript
async function cleanupStaleFiles(): Promise<void> {
  const files = ['.claude-input.txt', '.claude-output.txt', '.claude-question.txt'];

  for (const file of files) {
    if (fs.existsSync(file)) {
      const age = Date.now() - fs.statSync(file).mtime.getTime();
      if (age > 300000) { // >5 minutes old
        logger.warn({
          event: 'stale_file_removed',
          file,
          age_minutes: Math.round(age / 60000)
        });
        await fs.unlink(file);
      }
    }
  }
}
```

**Action**: Remove files >5 minutes old on orchestrator startup, log WARN

---

## Performance Characteristics

| Metric | Target | Measured |
|--------|--------|----------|
| **File change detection** | <300ms | Chokidar: ~50-100ms typical |
| **File write latency** | <50ms | Node.js fs: ~10-20ms typical |
| **Read/parse latency** | <100ms | Parse: ~5-10ms typical |
| **End-to-end (write → detect → read)** | <500ms | Typical: ~100-150ms |

**Monitoring**: Log all file operations with timestamps to detect degradation

---

## Security Considerations

### Path Traversal Prevention

```typescript
import path from 'path';

function validateFilePath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const expected = path.resolve('.claude-input.txt');

  if (resolved !== expected) {
    throw new Error(`Invalid file path: ${filePath}`);
  }
}
```

### Content Sanitization

```typescript
function sanitizePrompt(prompt: string): string {
  // Remove ANSI escape codes that could mess with terminal
  return prompt.replace(/\x1b\[[0-9;]*m/g, '');
}
```

### File Permissions

- Communication files should be readable/writable only by orchestrator user
- Recommend: `chmod 600 .claude-*.txt` on creation
- Prevent other users from reading sensitive task details

---

## Test Strategy

### Unit Tests

Mock file system operations:
```typescript
import { vi } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises');

test('sendToClaudeCode writes prompt to file', async () => {
  await sendToClaudeCode('Test prompt');

  expect(fs.writeFile).toHaveBeenCalledWith(
    '.claude-input.txt',
    'Test prompt',
    'utf-8'
  );
});
```

### Integration Tests

Use real file system with temporary directory:
```typescript
import os from 'os';
import path from 'path';

test('file watching detects changes', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-'));
  process.chdir(tmpDir);

  const watcher = setupFileWatching();
  const changePromise = new Promise(resolve => {
    watcher.on('change', () => resolve(true));
  });

  await fs.writeFile('.claude-output.txt', 'Test response');

  const detected = await Promise.race([
    changePromise,
    sleep(1000).then(() => false)
  ]);

  expect(detected).toBe(true);
});
```

### E2E Tests

Simulate full orchestrator ↔ Claude Code communication:
```typescript
test('task execution with retries', async () => {
  // Start orchestrator
  const orchestrator = new AutonomousOrchestrator();
  orchestrator.start();

  // Simulate Claude Code responding with failure
  await sleep(500);
  await fs.writeFile('.claude-output.txt', 'Status: ❌ Tests failed');

  // Wait for retry prompt
  await waitForFile('.claude-input.txt', 'Attempt 2/3');

  // Simulate success on retry
  await fs.writeFile('.claude-output.txt', 'Status: ✅ Implemented and tested');

  // Verify task marked complete
  const task = await orchestrator.getTask('T001');
  expect(task.status).toBe('completed');
});
```

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-10-27
**Owner**: Orchestrator + ClaudeCodeInterceptor
