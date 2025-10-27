# Research & Technical Decisions

**Feature**: Autonomous Specification Execution System
**Date**: 2025-10-27
**Status**: Research Complete

## R1: Structured Logging Strategy

### Decision
Use **Winston** for structured JSON logging to stdout with log levels (INFO/WARN/ERROR).

### Rationale
- Winston is battle-tested with 10M+ weekly downloads
- Supports multiple transports (stdout, files, external services)
- Built-in JSON formatting with customizable fields
- Better TypeScript support than Pino
- Aligns with 12-factor app principles (logs as event streams)

### Implementation Details
```typescript
// Log format
{
  "timestamp": "2025-10-27T07:30:15.234Z",
  "level": "INFO",
  "event": "task_started",
  "taskId": "T001",
  "specId": "003-orchestrator-agents",
  "context": {
    "dependencies": ["T002"],
    "attempt": 1
  }
}
```

**Key Event Types**:
- `orchestrator_started`, `orchestrator_stopped`
- `spec_loaded`, `spec_parse_error`
- `task_started`, `task_completed`, `task_failed`
- `validation_started`, `validation_completed`
- `test_started`, `test_completed`, `test_failed`
- `notification_sent`, `notification_failed`
- `file_conflict_detected`, `scale_limit_exceeded`

### Alternatives Considered
- **Pino**: Faster but less flexible transports, harder to customize
- **Bunyan**: Older, less active maintenance
- **console.log with JSON.stringify**: No log levels, no filtering, no transports

### Configuration
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '.specify/.orchestrator.log',
      level: 'warn' // Persist warnings and errors
    })
  ]
});
```

---

## R2: File Conflict Resolution Strategy

### Decision
**Last-write-wins** with WARNING log containing file diff details.

### Rationale
- Maintains autonomous operation (no human intervention required)
- Orchestrator is source of truth for task status
- Conflicts are rare (specs typically modified between runs, not during)
- Operators alerted via structured logs for manual review if needed
- Aligns with constitution requirement (per clarification Q2)

### Implementation Details
```typescript
async function updateSpecFile(specPath: string, updates: TaskStatus[]): Promise<void> {
  const currentMtime = (await fs.stat(specPath)).mtime;
  const lastKnownMtime = specMtimeCache.get(specPath);

  if (lastKnownMtime && currentMtime > lastKnownMtime) {
    logger.warn({
      event: 'file_conflict_detected',
      specPath,
      message: 'Spec modified externally during task execution',
      action: 'overwriting_with_status_update',
      lastKnown: lastKnownMtime.toISOString(),
      current: currentMtime.toISOString()
    });
  }

  await fs.writeFile(specPath, updatedContent);
  specMtimeCache.set(specPath, (await fs.stat(specPath)).mtime);
}
```

### Alternatives Considered
- **Fail and escalate**: Blocks autonomous operation, increases human interruptions
- **File locking**: Prevents legitimate spec edits during long tasks
- **Three-way merge**: Complex, error-prone for structured markdown with YAML frontmatter

---

## R3: Scale Limit Behavior

### Decision
**Warn but continue** processing when limits exceeded (>100 tasks/spec or >50 specs/repo).

### Rationale
- Autonomous systems should degrade gracefully, not fail hard
- Operators can monitor WARNING logs and intervene if performance degrades
- Success criteria SC-006 guarantees performance up to limits, best-effort beyond
- Prevents false positives (legitimate large specs rejected unnecessarily)

### Implementation Details
```typescript
async function loadAllSpecs(): Promise<Spec[]> {
  const specs = await discoverSpecs('.specify/specs/');

  if (specs.length > 50) {
    logger.warn({
      event: 'scale_limit_exceeded',
      limit: 50,
      actual: specs.length,
      message: 'Repository has >50 specs, performance not guaranteed',
      recommendation: 'Monitor memory usage and task iteration times'
    });
  }

  for (const spec of specs) {
    if (spec.tasks.length > 100) {
      logger.warn({
        event: 'scale_limit_exceeded',
        specId: spec.id,
        limit: 100,
        actual: spec.tasks.length,
        message: 'Spec has >100 tasks, performance not guaranteed'
      });
    }
  }

  return specs; // Continue processing
}
```

### Alternatives Considered
- **Hard failure**: Breaks autonomous operation, requires manual intervention
- **Graceful degradation with feature disable**: Complex to implement, unclear which features to disable
- **Automatic batching**: Breaks spec atomicity, complicates dependency tracking

---

## R4: Notification Delivery Fallback

### Decision
Persist failed notifications to **`.specify/.notifications.log`** as JSON lines.

### Rationale
- Ensures critical alerts are never lost
- Provides audit trail for all escalations
- Operators can monitor file or set up external alerting (e.g., log aggregator triggers)
- Complements WhatsApp delivery (at-least-once guarantee)
- Low complexity, no additional dependencies

### Implementation Details
```typescript
async function sendNotification(notification: Notification): Promise<void> {
  try {
    await whatsappService.send(notification);
    logger.info({ event: 'notification_sent', notificationId: notification.id });
  } catch (error) {
    logger.error({
      event: 'notification_failed',
      notificationId: notification.id,
      error: error.message
    });

    // Fallback: persist to file
    await fs.appendFile(
      '.specify/.notifications.log',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity: notification.severity,
        message: notification.message,
        context: notification.context,
        deliveryStatus: 'failed',
        error: error.message
      }) + '\n'
    );
  }
}
```

**Log Format** (`.specify/.notifications.log`):
```json
{"timestamp":"2025-10-27T07:45:00.000Z","severity":"critical","message":"Task T003 failed 3 times","context":{"taskId":"T003","specId":"003-orchestrator-agents","lastError":"Tests failed: 5 assertions"},"deliveryStatus":"failed","error":"WhatsApp session expired"}
```

### Alternatives Considered
- **Block and retry indefinitely**: Stalls autonomous operation
- **Email fallback**: Requires additional configuration (SMTP), may not be monitored
- **Slack/Discord**: Same configuration complexity, not universally available
- **ERROR log only**: Notification content lost if logs rotated

---

## R5: Retry Logic and Exponential Backoff

### Decision
**Exponential backoff** with intervals: 10s, 30s, 2min (as specified in requirements FR-015).

### Rationale
- Spec already defines intervals, validated against best practices
- Exponential (3x multiplier) prevents overwhelming system during transient issues
- Short initial delay (10s) for quick recovery from intermittent failures
- Long final delay (2min) gives complex issues time to resolve before human escalation
- Industry standard pattern for distributed systems

### Implementation Details
```typescript
const RETRY_INTERVALS = [10000, 30000, 120000]; // 10s, 30s, 2min

async function retryTaskExecution(task: Task, attempt: number): Promise<void> {
  if (attempt >= 3) {
    await escalateToHuman(task);
    return;
  }

  const waitTime = RETRY_INTERVALS[attempt];
  logger.info({
    event: 'retry_scheduled',
    taskId: task.id,
    attempt: attempt + 1,
    waitTime,
    reason: 'Previous attempt failed'
  });

  await sleep(waitTime);
  await executeTask(task, attempt + 1);
}
```

### Jitter Strategy
Not implemented initially - jitter useful for preventing thundering herd in distributed systems, but orchestrator is single-process with sequential task execution.

### Alternatives Considered
- **Linear backoff (10s, 20s, 30s)**: Doesn't scale well for persistent issues
- **Fibonacci backoff (10s, 20s, 30s, 50s)**: More complex, no clear benefit for 3-retry limit
- **Fixed retry (10s, 10s, 10s)**: Wastes time on persistent issues, doesn't give system time to recover

---

## R6: Test Framework Integration Patterns

### Decision
**Vitest** for unit/integration tests, **Playwright** for E2E tests, with unified coverage reporting via `c8`.

### Rationale
- Vitest: Fast, native ESM support, TypeScript-first, compatible with Node.js test runner
- Playwright: Industry standard for autonomous testing, multi-browser, built-in screenshots/videos
- Both frameworks have excellent TypeScript support and mocking capabilities
- c8 (Istanbul coverage) works with both frameworks

### Test Architecture
```
tests/
├── unit/                           # Vitest (fast, isolated)
│   ├── orchestrator/
│   │   ├── SpecLoader.test.ts     # Mock filesystem
│   │   ├── QAEngine.test.ts       # Mock Claude API
│   │   └── TaskQueue.test.ts      # Pure logic, no I/O
│   ├── agents/
│   │   ├── EngineerAgent.test.ts  # Mock Claude API
│   │   └── TestAgent.test.ts      # Mock subprocess execution
│   └── utils/
│       ├── NotificationService.test.ts  # Mock WhatsApp
│       └── Logger.test.ts         # Verify log format
│
├── integration/                    # Vitest (real components)
│   ├── orchestrator-agent-coordination.test.ts
│   ├── file-monitoring-flow.test.ts
│   └── notification-escalation.test.ts
│
└── e2e/                            # Playwright (full workflows)
    ├── autonomous-execution.test.ts
    ├── retry-and-recovery.test.ts
    └── multi-task-workflow.test.ts
```

### Mocking Strategy

**Claude API Mocking**:
```typescript
import { vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify({ isValid: true, issues: [] }) }]
      })
    }
  }))
}));
```

**Test Data Fixtures**:
```typescript
// tests/fixtures/specs/test-spec-001.md
const testSpec: Spec = {
  id: 'test-001',
  title: 'Test Feature',
  tasks: [
    { id: 'T001', status: 'pending', deps: [] },
    { id: 'T002', status: 'pending', deps: ['T001'] }
  ]
};
```

### Coverage Reporting
```json
// package.json
{
  "scripts": {
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "c8 --reporter=html --reporter=text vitest run"
  }
}
```

**Coverage Targets** (per constitution):
- Line coverage: ≥80%
- Branch coverage: ≥80%
- Function coverage: ≥80%
- Critical paths (orchestration, agents): 100%

### Alternatives Considered
- **Jest**: Slower than Vitest, less native ESM support
- **Mocha/Chai**: Requires more setup, less TypeScript-friendly
- **Cypress**: UI-focused, not suitable for CLI orchestrator
- **Puppeteer**: Lower-level than Playwright, less automation features

---

## R7: WhatsApp Web.js Production Readiness

### Decision
Use **WhatsApp Web.js** with session persistence and graceful reconnection handling.

### Rationale
- Most mature Node.js WhatsApp library (8k+ GitHub stars)
- Session persistence prevents repeated QR scans
- Built-in reconnection logic
- Two-way messaging support (send notifications, receive responses)
- Well-documented authentication flow

### Session Persistence
```typescript
import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.specify/.whatsapp-session'
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  logger.info({ event: 'whatsapp_auth_required', message: 'Scan QR code' });
});

client.on('ready', () => {
  logger.info({ event: 'whatsapp_connected' });
});

client.on('disconnected', (reason) => {
  logger.warn({ event: 'whatsapp_disconnected', reason });
  setTimeout(() => client.initialize(), 5000); // Reconnect after 5s
});
```

### Rate Limiting
WhatsApp enforces rate limits to prevent spam:
- **Max 256 messages per day** to unknown contacts
- **Unlimited messages** to contacts who replied
- **Recommendation**: Limit notifications to critical events only (task failures, escalations)

### Fallback Strategy
If WhatsApp unavailable:
1. Log ERROR with notification details
2. Persist to `.specify/.notifications.log`
3. Continue orchestrator execution (don't block on notification failures)

### Production Deployment Considerations
- Run in headless mode (no GUI)
- Persist session to avoid daily QR scans
- Monitor `disconnected` events for service degradation
- Set up log monitoring for `.notifications.log` as backup alert channel

### Alternatives Considered
- **Twilio SMS**: Costs money, requires phone number registration, less rich messaging
- **Telegram Bot API**: Requires bot token, less ubiquitous than WhatsApp
- **Discord Webhooks**: Developer-focused, not universal
- **Email (Nodemailer)**: Often unmonitored, spam filters, requires SMTP config

---

## R8: Claude API Rate Limiting and Cost Management

### Decision
Implement **token-aware request throttling** with 60 req/min limit and cost tracking.

### Rationale
- Anthropic API limits: 50-100 req/min depending on tier (assumed mid-tier)
- Cost per request: ~$0.015 for validation (input: 2k tokens, output: 500 tokens with Claude Sonnet)
- Autonomous operation can make 100s of requests per day
- Need predictable costs and no API quota exhaustion

### Rate Limiting Implementation
```typescript
import pLimit from 'p-limit';

const claudeLimit = pLimit(60); // 60 concurrent requests max

export async function callClaudeAPI(prompt: string): Promise<string> {
  return claudeLimit(async () => {
    const startTime = Date.now();

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      });

      const tokens = response.usage.input_tokens + response.usage.output_tokens;
      const cost = (tokens / 1000) * 0.015; // ~$15 per million tokens

      logger.info({
        event: 'claude_api_call',
        duration: Date.now() - startTime,
        tokens,
        cost: cost.toFixed(4)
      });

      return response.content[0].text;
    } catch (error) {
      if (error.status === 429) {
        logger.warn({ event: 'claude_rate_limit', retryAfter: error.headers['retry-after'] });
        await sleep(parseInt(error.headers['retry-after']) * 1000);
        return callClaudeAPI(prompt); // Retry after cooldown
      }
      throw error;
    }
  });
}
```

### Cost Projections

**Typical Validation Request**:
- Input: 2000 tokens (task description + code + constitution)
- Output: 500 tokens (validation result)
- Cost per validation: $0.0375

**Typical Q&A Request**:
- Input: 1500 tokens (question + all specs)
- Output: 300 tokens (answer with confidence)
- Cost per Q&A: $0.027

**Daily Cost Estimate** (10 tasks, 3 retries average, 5 questions):
- Validations: 10 tasks × 3 attempts × $0.0375 = $1.13
- Q&A: 5 questions × $0.027 = $0.14
- **Total: ~$1.30/day** or **~$40/month**

### Token Optimization
- Cache constitution in memory (loaded once at startup)
- Limit code context to relevant files only (not entire codebase)
- Use shorter prompts for simple validations
- Implement response streaming for long-running requests (not currently needed)

### Alternatives Considered
- **Local models (Ollama)**: Lower quality, no guarantee of constitution compliance accuracy
- **OpenAI GPT-4**: Similar cost, less reliable for structured output
- **No rate limiting**: Risk of quota exhaustion mid-task, unpredictable costs

---

## Summary of Technical Decisions

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| **R1: Logging** | Winston with JSON stdout | Industry standard, flexible transports, TypeScript support |
| **R2: File Conflicts** | Last-write-wins + WARNING | Autonomous operation, orchestrator is source of truth |
| **R3: Scale Limits** | Warn and continue | Graceful degradation, no hard failures |
| **R4: Notification Fallback** | `.notifications.log` file | Never lose alerts, audit trail, simple monitoring |
| **R5: Retry Logic** | Exponential backoff (10s, 30s, 2min) | Industry standard, per spec requirements |
| **R6: Test Frameworks** | Vitest + Playwright + c8 | Fast, TypeScript-native, unified coverage |
| **R7: WhatsApp** | whatsapp-web.js with session persistence | Mature library, reconnection handling, rate limits understood |
| **R8: Claude API** | Token-aware throttling, cost tracking | Predictable costs (~$40/mo), quota management |

---

**Research Status**: ✅ COMPLETE
**Next Phase**: Phase 1 - Design (data-model.md, contracts/, quickstart.md)
