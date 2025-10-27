# Structured Logging API Contract

**Purpose**: Define structured JSON logging for operational monitoring and debugging

**Library**: Winston v3.11.0+
**Output**: stdout (all levels) + `.specify/.orchestrator.log` (WARN/ERROR only)
**Format**: JSON lines (one log entry per line)

---

## Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **INFO** | Normal operational events | Task started, spec loaded, validation passed |
| **WARN** | Recoverable issues, degraded state | File conflict detected, scale limit exceeded, retry scheduled |
| **ERROR** | Errors requiring attention | API failures, file system errors, critical configuration missing |

**No DEBUG/TRACE levels**: Keep production logs focused on operational events

---

## Log Entry Format

### Standard Schema

```typescript
interface LogEntry {
  timestamp: string;             // ISO-8601 format
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;                 // Event type (see Event Taxonomy below)
  message?: string;              // Optional human-readable summary
  taskId?: string;               // Optional: related task ID
  specId?: string;               // Optional: related spec ID
  context: Record<string, any>;  // Event-specific structured data
}
```

### Example Entries

**INFO - Task Started**:
```json
{
  "timestamp": "2025-10-27T07:30:15.234Z",
  "level": "INFO",
  "event": "task_started",
  "message": "Starting task T001 with 0 dependencies",
  "taskId": "T001",
  "specId": "003-orchestrator-agents",
  "context": {
    "description": "Create User Authentication System",
    "dependencies": [],
    "attempt": 1
  }
}
```

**WARN - File Conflict**:
```json
{
  "timestamp": "2025-10-27T07:35:42.567Z",
  "level": "WARN",
  "event": "file_conflict_detected",
  "message": "Spec modified externally during task execution",
  "specId": "003-orchestrator-agents",
  "context": {
    "specPath": ".specify/specs/003-orchestrator-agents/spec.md",
    "action": "overwriting_with_status_update",
    "lastKnown": "2025-10-27T07:30:00.000Z",
    "current": "2025-10-27T07:35:00.000Z"
  }
}
```

**ERROR - API Failure**:
```json
{
  "timestamp": "2025-10-27T07:40:18.890Z",
  "level": "ERROR",
  "event": "claude_api_error",
  "message": "Claude API request failed with status 429",
  "taskId": "T003",
  "context": {
    "agent": "engineer",
    "status": 429,
    "error_type": "rate_limit_error",
    "retry_after": 60
  }
}
```

---

## Event Taxonomy

### Orchestrator Events

| Event | Level | Description |
|-------|-------|-------------|
| `orchestrator_started` | INFO | Orchestrator process initialized |
| `orchestrator_stopped` | INFO | Graceful shutdown completed |
| `orchestrator_paused` | ERROR | Critical error, orchestrator paused |
| `spec_loaded` | INFO | Specification parsed and loaded |
| `spec_parse_error` | ERROR | Failed to parse spec file |
| `task_queue_built` | INFO | Task queue with dependencies resolved |
| `circular_dependency_detected` | ERROR | Task graph has circular dependencies |
| `scale_limit_exceeded` | WARN | Repository exceeds performance limits |

### Task Events

| Event | Level | Description |
|-------|-------|-------------|
| `task_started` | INFO | Task execution began |
| `task_completed` | INFO | Task completed successfully |
| `task_failed` | ERROR | Task failed after max retries |
| `retry_scheduled` | WARN | Task will retry after backoff |
| `status_updated` | INFO | Task status changed in spec file |

### Validation Events

| Event | Level | Description |
|-------|-------|-------------|
| `validation_started` | INFO | Engineer Agent validation initiated |
| `validation_completed` | INFO | Validation passed |
| `validation_failed` | WARN | Validation found issues |
| `constitution_violation` | WARN | Code violates constitution principle |

### Test Events

| Event | Level | Description |
|-------|-------|-------------|
| `test_started` | INFO | Test execution initiated |
| `test_completed` | INFO | All tests passed |
| `test_failed` | WARN | One or more tests failed |
| `test_timeout` | ERROR | Test execution exceeded timeout |
| `coverage_reported` | INFO | Test coverage metrics |

### File Monitoring Events

| Event | Level | Description |
|-------|-------|-------------|
| `file_change_detected` | INFO | Chokidar detected file modification |
| `file_watch_error` | ERROR | File watching system error |
| `file_conflict_detected` | WARN | Spec modified during execution |
| `stale_file_removed` | WARN | Old communication file cleaned up |

### Notification Events

| Event | Level | Description |
|-------|-------|-------------|
| `notification_sent` | INFO | WhatsApp notification delivered |
| `notification_failed` | ERROR | WhatsApp delivery failed |
| `notification_fallback` | WARN | Notification persisted to file log |
| `whatsapp_qr_required` | INFO | QR code displayed for authentication |
| `whatsapp_connected` | INFO | WhatsApp client ready |
| `whatsapp_disconnected` | WARN | WhatsApp client lost connection |

### API Events

| Event | Level | Description |
|-------|-------|-------------|
| `claude_api_request` | INFO | API request sent |
| `claude_api_response` | INFO | API response received |
| `claude_api_error` | ERROR | API request failed |
| `claude_rate_limit` | WARN | API rate limit hit |

### Q&A Events

| Event | Level | Description |
|-------|-------|-------------|
| `question_received` | INFO | Question from Claude Code |
| `answer_provided` | INFO | Q&A Engine answered question |
| `question_escalated` | WARN | Low confidence, escalated to human |
| `human_response_received` | INFO | Human answered escalated question |

---

## Winston Configuration

### Setup

```typescript
import winston from 'winston';
import path from 'path';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'orchestrator',
    version: require('../package.json').version
  },
  transports: [
    // All logs to stdout (JSON)
    new winston.transports.Console({
      format: winston.format.json()
    }),

    // WARN/ERROR logs to file (for persistence)
    new winston.transports.File({
      filename: '.specify/.orchestrator.log',
      level: 'warn',
      maxsize: 10485760,  // 10MB
      maxFiles: 5,        // Rotate up to 5 files
      tailable: true
    })
  ]
});
```

### Usage

```typescript
// INFO - Simple event
logger.info({
  event: 'task_started',
  taskId: 'T001',
  specId: '003-orchestrator-agents'
});

// INFO - With context
logger.info({
  event: 'validation_completed',
  taskId: 'T002',
  context: {
    isValid: true,
    issues: [],
    duration_ms: 1450
  }
});

// WARN - With message
logger.warn({
  event: 'file_conflict_detected',
  message: 'Spec modified externally during task execution',
  specId: '003-orchestrator-agents',
  context: {
    specPath: '.specify/specs/003-orchestrator-agents/spec.md',
    action: 'overwriting_with_status_update'
  }
});

// ERROR - With error object
try {
  await executeTask(task);
} catch (error) {
  logger.error({
    event: 'task_execution_error',
    taskId: task.id,
    message: error.message,
    context: {
      stack: error.stack,
      code: error.code
    }
  });
}
```

---

## Log Aggregation

### Stdout (All Levels)

**Use Case**: Real-time monitoring, log aggregation services (Datadog, CloudWatch, etc.)

**Access**:
```bash
# Run orchestrator with log output
npm run orchestrate | tee orchestrator-output.log

# Filter by level
npm run orchestrate | grep '"level":"ERROR"'

# Filter by event
npm run orchestrate | grep '"event":"task_failed"'

# Pretty-print for debugging (requires jq)
npm run orchestrate | jq -C '.'
```

### File (WARN/ERROR Only)

**Use Case**: Persistent error tracking, operator review

**Location**: `.specify/.orchestrator.log`

**Rotation**: Automatic (10MB per file, max 5 files = 50MB total)

**Access**:
```bash
# View latest errors
tail -f .specify/.orchestrator.log | jq -C '.'

# Count errors by event type
cat .specify/.orchestrator.log | jq -r '.event' | sort | uniq -c

# Find all errors for specific task
cat .specify/.orchestrator.log | jq 'select(.taskId == "T003")'
```

---

## Performance Considerations

### Logging Overhead

- **JSON serialization**: ~0.1-0.5ms per log entry
- **Stdout write**: ~1-5ms (buffered by Node.js)
- **File write**: ~1-10ms (async, doesn't block)

**Total overhead**: <10ms per log entry (negligible for task execution times)

### Log Volume

**Typical Task Execution** (1 task, 3 retries):
- task_started: 3 entries
- validation_started/completed: 6 entries
- test_started/completed: 6 entries
- file_change_detected: 6 entries
- retry_scheduled: 2 entries
- task_completed/failed: 1 entry
- **Total**: ~24 log entries per task

**Daily Volume** (10 tasks, 3 retries average):
- Task events: 240 entries
- Validation events: 60 entries
- Test events: 60 entries
- Notification events: 10 entries
- Orchestrator events: 5 entries
- **Total**: ~375 entries/day ≈ 0.2MB/day (at 500 bytes/entry)

**Annual Volume**: ~70MB/year (well within disk space constraints)

---

## Log Analysis Examples

### Find Tasks with Failures

```bash
cat .specify/.orchestrator.log | jq 'select(.event == "task_failed")'
```

### Track Task Execution Duration

```bash
# Extract task_started and task_completed events
cat orchestrator-output.log | \
  jq 'select(.event == "task_started" or .event == "task_completed") | {event, taskId, timestamp}' | \
  # Group by task and calculate duration
  awk '{print}' # (further processing needed)
```

### Monitor API Costs

```bash
# Sum Claude API costs
cat orchestrator-output.log | \
  jq 'select(.event == "claude_api_response") | .context.cost_usd' | \
  awk '{sum += $1} END {print "Total cost: $" sum}'
```

### Identify Rate Limiting

```bash
cat .specify/.orchestrator.log | \
  jq 'select(.event == "claude_rate_limit") | {timestamp, context}'
```

---

## Error Correlation

### Trace Task Lifecycle

```bash
# Follow a specific task through logs
cat orchestrator-output.log | jq 'select(.taskId == "T001")'
```

**Example Output**:
```json
{"timestamp":"...","level":"INFO","event":"task_started","taskId":"T001",...}
{"timestamp":"...","level":"INFO","event":"validation_started","taskId":"T001",...}
{"timestamp":"...","level":"WARN","event":"validation_failed","taskId":"T001",...}
{"timestamp":"...","level":"WARN","event":"retry_scheduled","taskId":"T001",...}
{"timestamp":"...","level":"INFO","event":"task_started","taskId":"T001",...}
{"timestamp":"...","level":"INFO","event":"task_completed","taskId":"T001",...}
```

### Debug Spec Loading Issues

```bash
cat .specify/.orchestrator.log | \
  jq 'select(.event == "spec_parse_error" or .event == "spec_loaded")'
```

---

## Alerting Integration

### External Log Aggregators

**Datadog Example**:
```bash
# Forward logs to Datadog
npm run orchestrate | datadog-agent logs

# Create monitor for task_failed events
# Alert when count(task_failed) > 5 in 1 hour
```

**CloudWatch Example**:
```bash
# Stream logs to CloudWatch
npm run orchestrate | aws logs put-log-events --log-group /orchestrator --log-stream production
```

### Local Monitoring

**Simple Shell Alert**:
```bash
#!/bin/bash
# Monitor for ERROR events and send email
tail -f .specify/.orchestrator.log | while read line; do
  if echo "$line" | jq -e '.level == "ERROR"' > /dev/null; then
    echo "$line" | mail -s "Orchestrator Error" ops@example.com
  fi
done
```

---

## Security & Privacy

### Sensitive Data Redaction

**API Keys**:
```typescript
function sanitizeLog(entry: any): any {
  if (entry.context?.apiKey) {
    entry.context.apiKey = '[REDACTED]';
  }
  if (entry.context?.token) {
    entry.context.token = '[REDACTED]';
  }
  return entry;
}

// Apply sanitization to all logs
logger.format = winston.format.combine(
  winston.format.timestamp(),
  winston.format((info) => sanitizeLog(info))(),
  winston.format.json()
);
```

**Phone Numbers**:
```typescript
// Mask phone number (show last 4 digits only)
function maskPhoneNumber(number: string): string {
  return number.replace(/\d(?=\d{4})/g, '*');
}

logger.info({
  event: 'whatsapp_connected',
  recipient: maskPhoneNumber(process.env.WHATSAPP_NOTIFY_NUMBER)
});
```

---

## Test Strategy

### Unit Tests

```typescript
import { vi } from 'vitest';
import winston from 'winston';

test('logger emits structured JSON', () => {
  const mockTransport = {
    log: vi.fn()
  };

  const testLogger = winston.createLogger({
    transports: [mockTransport]
  });

  testLogger.info({
    event: 'test_event',
    taskId: 'T001'
  });

  expect(mockTransport.log).toHaveBeenCalledWith(
    expect.objectContaining({
      level: 'info',
      event: 'test_event',
      taskId: 'T001'
    }),
    expect.any(Function)
  );
});
```

### Integration Tests

```typescript
test('logs persisted to file for WARN/ERROR', async () => {
  const logPath = '.specify/.orchestrator.log';

  logger.warn({ event: 'test_warning', message: 'Test warning message' });
  await sleep(100); // Allow async file write

  const logContent = await fs.readFile(logPath, 'utf-8');
  const lastLine = logContent.trim().split('\n').pop();
  const parsed = JSON.parse(lastLine);

  expect(parsed.event).toBe('test_warning');
  expect(parsed.level).toBe('warn');
});
```

---

## Production Checklist

- [ ] Set `LOG_LEVEL=info` in production (avoid verbose debug logs)
- [ ] Configure log rotation (10MB per file, 5 files max)
- [ ] Set up log aggregation (Datadog, CloudWatch, etc.) for stdout
- [ ] Monitor `.specify/.orchestrator.log` for ERROR events
- [ ] Create alerts for critical events (orchestrator_paused, API errors)
- [ ] Document log access procedures for operations team
- [ ] Verify log redaction for sensitive data (API keys, tokens)

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-10-27
**Owner**: Logger utility (src/utils/Logger.ts)
