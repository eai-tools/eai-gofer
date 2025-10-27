# Notification API Contract

**Purpose**: Define WhatsApp notification delivery for human escalation and fallback logging

**Service**: WhatsApp Web.js v1.23.0+
**Fallback**: `.specify/.notifications.log` (JSON lines)
**Delivery Guarantee**: At-least-once (via fallback)

---

## WhatsApp Integration

### Library Configuration

```typescript
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.specify/.whatsapp-session',  // Persist session
    clientId: 'orchestrator'
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  logger.info({ event: 'whatsapp_qr_required', message: 'Scan QR code to authenticate' });
});

client.on('ready', () => {
  logger.info({ event: 'whatsapp_ready', message: 'WhatsApp connected and ready' });
});

client.on('disconnected', (reason) => {
  logger.warn({ event: 'whatsapp_disconnected', reason });
  setTimeout(() => client.initialize(), 5000); // Reconnect after 5 seconds
});

client.on('auth_failure', (message) => {
  logger.error({ event: 'whatsapp_auth_failure', message });
  // Session invalid - will need new QR scan
});

await client.initialize();
```

### Authentication Flow

1. **First Run**: Display QR code in terminal
   ```
   ┌─────────────────────────────────┐
   │  █▀▀▀▀▀█ ▀█  ▀▀▄█▄█ █▀▀▀▀▀█  │
   │  █ ███ █ ▄▀█▄▀▄█▀▀█ █ ███ █  │
   │  █ ▀▀▀ █ ▄█ ▀▀█▄ █▄ █ ▀▀▀ █  │
   │  ... (QR code) ...            │
   └─────────────────────────────────┘
   Scan this QR code with WhatsApp mobile app
   ```

2. **Session Persistence**: After scan, session saved to `.specify/.whatsapp-session/`
3. **Subsequent Runs**: Auto-authenticate from saved session (no QR needed)
4. **Session Expiry**: If session expires, display new QR code

**Production Recommendation**: Complete QR authentication during setup, not first orchestrator run

---

## Notification Types

### 1. Task Failure (Critical)

**Trigger**: Task fails 3 consecutive times (FR-008)

**Message Format**:
```
🚨 Task Failed: T003 - Notification Service

Spec: 003-orchestrator-agents
Attempts: 3/3

Last Error:
Tests failed: 5 assertions
- test_whatsapp_send: TypeError: client.sendMessage is not a function
- test_notification_retry: Timeout after 30s

Engineer Agent Feedback:
- CRITICAL: WhatsApp client not initialized before sending
- MAJOR: Missing error handling for network failures

Action Required: Review implementation and resolve issues

View spec: .specify/specs/003-orchestrator-agents/spec.md
Task details: .specify/specs/003-orchestrator-agents/tasks.md#T003
```

**Severity**: Critical
**Recipient**: Configured via `WHATSAPP_NOTIFY_NUMBER` environment variable

---

### 2. Question Escalation (Warning)

**Trigger**: Q&A Engine confidence <80% (FR-012)

**Message Format**:
```
❓ Question Needs Human Input

Task: T005 - Performance Optimization
Spec: 003-orchestrator-agents

Question:
Should I use in-memory caching or Redis for spec caching?

Context:
Constitution principle VI requires API <500ms p95. Current spec loading is 1200ms for 100+ specs. Caching needed but approach unclear from requirements.

Q&A Engine Analysis:
- Confidence: 45%
- Partial answer: "Performance targets defined but caching strategy not specified"
- Suggested sources: constitution.md, spec.md

Reply with your answer or "continue" to proceed without caching.
```

**Severity**: Warning
**Interactive**: Awaits human response

---

### 3. Critical Error (Critical)

**Trigger**: Orchestrator encounters unrecoverable error

**Message Format**:
```
⛔ Orchestrator Critical Error

Error: Cannot read .specify/specs/ directory
Type: ENOENT (Directory not found)

Orchestrator Status: PAUSED
Tasks Affected: All pending tasks

Possible Causes:
- .specify/ directory deleted or moved
- File system permissions changed
- Disk full or corrupted

Action Required: Investigate file system and restart orchestrator

Logs: .specify/.orchestrator.log
```

**Severity**: Critical
**Action**: Orchestrator pauses until resolved

---

## Delivery Methods

### Primary: WhatsApp Message

```typescript
async function sendNotification(notification: Notification): Promise<void> {
  const recipientNumber = process.env.WHATSAPP_NOTIFY_NUMBER;
  if (!recipientNumber) {
    throw new Error('WHATSAPP_NOTIFY_NUMBER not configured');
  }

  const chatId = `${recipientNumber}@c.us`;  // WhatsApp chat ID format

  try {
    await client.sendMessage(chatId, notification.message);

    logger.info({
      event: 'notification_sent',
      notificationId: notification.id,
      severity: notification.severity,
      method: 'whatsapp'
    });

    notification.deliveryStatus = 'delivered';
    notification.deliveryMethod = 'whatsapp';

  } catch (error) {
    logger.error({
      event: 'notification_failed',
      notificationId: notification.id,
      error: error.message
    });

    notification.deliveryStatus = 'failed';
    notification.deliveryError = error.message;

    // Fallback to file
    await writeNotificationLog(notification);
  }
}
```

### Fallback: File Logging

**File**: `.specify/.notifications.log`
**Format**: JSON lines (one notification per line)

**Example Entry**:
```json
{"timestamp":"2025-10-27T07:45:00.000Z","severity":"critical","notificationId":"notif_123","message":"🚨 Task Failed: T003","context":{"taskId":"T003","specId":"003-orchestrator-agents","attemptCount":3,"lastError":"Tests failed"},"deliveryStatus":"failed","deliveryMethod":"file-fallback","deliveryError":"WhatsApp session expired"}
```

**Append Logic**:
```typescript
async function writeNotificationLog(notification: Notification): Promise<void> {
  const logPath = '.specify/.notifications.log';

  const logEntry = {
    timestamp: new Date().toISOString(),
    severity: notification.severity,
    notificationId: notification.id,
    message: notification.message,
    context: notification.context,
    deliveryStatus: 'persisted',
    deliveryMethod: 'file-fallback',
    deliveryError: notification.deliveryError
  };

  await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');

  logger.warn({
    event: 'notification_fallback',
    notificationId: notification.id,
    message: 'Notification persisted to file log'
  });

  notification.deliveryStatus = 'persisted';
  notification.deliveryMethod = 'file-fallback';
}
```

**Monitoring**: Operators should monitor `.notifications.log` file (e.g., via log aggregator or cron job)

---

## Interactive Notifications

### Awaiting Human Response

For question escalations, orchestrator waits for human reply:

**Message**:
```
❓ Question: Should I use Redis or in-memory caching?

Reply with:
A) Redis (distributed, persistent)
B) In-memory (simple, fast)
C) [Your custom answer]
```

**Response Handling**:
```typescript
async function waitForHumanResponse(question: Question, timeout: number = 3600000): Promise<string> {
  return new Promise((resolve, reject) => {
    // Listen for incoming WhatsApp messages
    const messageHandler = (message: any) => {
      if (message.from === `${process.env.WHATSAPP_NOTIFY_NUMBER}@c.us`) {
        const response = message.body.trim();

        logger.info({
          event: 'human_response_received',
          questionId: question.id,
          response
        });

        client.off('message', messageHandler);
        clearTimeout(timeoutHandle);
        resolve(response);
      }
    };

    client.on('message', messageHandler);

    // Timeout if no response
    const timeoutHandle = setTimeout(() => {
      client.off('message', messageHandler);
      reject(new Error('Human response timeout after 1 hour'));
    }, timeout);
  });
}
```

**Timeout Behavior**: If no response after 1 hour, mark task as `failed` and continue with next task

---

## Rate Limiting

WhatsApp enforces rate limits to prevent spam:

| Limit | Threshold | Action |
|-------|-----------|--------|
| Unknown contacts | 256 messages/day | Only send critical notifications |
| Known contacts (replied) | Unlimited | Safe for frequent use |
| Message frequency | Gradual increase | Start slow, increase if not blocked |

**Implementation**:
```typescript
const messageCounts = new Map<string, number>();

async function checkRateLimit(recipientNumber: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `${recipientNumber}:${today}`;

  const count = messageCounts.get(key) || 0;

  if (count >= 256) {
    logger.warn({
      event: 'whatsapp_rate_limit',
      recipient: recipientNumber,
      count
    });
    throw new Error('WhatsApp rate limit exceeded for today');
  }

  messageCounts.set(key, count + 1);
}
```

**Recommendation**: Limit notifications to:
- Task failures (3 per task max = 30 per day for 10 tasks)
- Question escalations (5-10 per day typical)
- Critical errors (rare, <5 per day)

Total: ~50 messages/day (well under 256 limit)

---

## Error Handling

### WhatsApp Disconnection

```typescript
client.on('disconnected', async (reason) => {
  logger.warn({ event: 'whatsapp_disconnected', reason });

  // Update orchestrator state
  orchestratorState.whatsappConnected = false;

  // Attempt reconnection
  try {
    await client.initialize();
    orchestratorState.whatsappConnected = true;
    logger.info({ event: 'whatsapp_reconnected' });
  } catch (error) {
    logger.error({ event: 'whatsapp_reconnect_failed', error: error.message });
    // All future notifications will use file fallback until reconnected
  }
});
```

### Session Expiry

If session expires (requires new QR scan):
1. Log ERROR: "WhatsApp session expired"
2. Display QR code in terminal (if TTY available)
3. All notifications use file fallback until re-authenticated
4. Send critical alert via `.notifications.log`

### Invalid Recipient Number

```typescript
function validateRecipientNumber(number: string): void {
  // WhatsApp format: country code + number (no + or -)
  if (!/^\d{10,15}$/.test(number)) {
    throw new Error(`Invalid WhatsApp number format: ${number}. Expected: 12345678901 (10-15 digits)`);
  }
}
```

**Validation**: Check on orchestrator startup, fail fast if invalid

---

## Configuration

### Environment Variables

```bash
# Required
WHATSAPP_NOTIFY_NUMBER=12345678901  # Recipient phone number (no + or -)

# Optional
WHATSAPP_SESSION_PATH=.specify/.whatsapp-session  # Session storage (default)
WHATSAPP_TIMEOUT=30000  # Message send timeout in ms (default: 30s)
WHATSAPP_ENABLED=true  # Disable for testing (use file fallback only)
```

### Startup Validation

```typescript
async function validateWhatsAppConfig(): Promise<void> {
  const recipientNumber = process.env.WHATSAPP_NOTIFY_NUMBER;

  if (!recipientNumber) {
    logger.warn({
      event: 'whatsapp_disabled',
      reason: 'WHATSAPP_NOTIFY_NUMBER not configured'
    });
    return; // Graceful degradation - use file fallback only
  }

  validateRecipientNumber(recipientNumber);

  logger.info({
    event: 'whatsapp_enabled',
    recipient: recipientNumber.replace(/\d(?=\d{4})/g, '*')  // Mask number for logs
  });
}
```

---

## Monitoring & Observability

### Metrics

Track notification delivery success rate:

```typescript
const notificationMetrics = {
  sent: 0,
  delivered: 0,
  failed: 0,
  fallback: 0
};

function recordNotification(status: 'delivered' | 'failed' | 'fallback'): void {
  notificationMetrics.sent++;
  notificationMetrics[status]++;

  logger.info({
    event: 'notification_metrics',
    ...notificationMetrics,
    delivery_rate: (notificationMetrics.delivered / notificationMetrics.sent * 100).toFixed(2)
  });
}
```

### Health Check

Periodically verify WhatsApp connection:

```typescript
setInterval(async () => {
  const state = await client.getState();

  logger.info({
    event: 'whatsapp_health_check',
    state,  // 'CONNECTED', 'DISCONNECTED', etc.
    connected: state === 'CONNECTED'
  });

  if (state !== 'CONNECTED') {
    logger.warn({ event: 'whatsapp_unhealthy', state });
  }
}, 60000); // Every minute
```

---

## Test Strategy

### Unit Tests (Mock WhatsApp Client)

```typescript
import { vi } from 'vitest';

vi.mock('whatsapp-web.js', () => ({
  Client: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg_123' }),
    on: vi.fn()
  })),
  LocalAuth: vi.fn()
}));

test('sendNotification delivers via WhatsApp', async () => {
  const notification = {
    id: 'notif_123',
    message: 'Test notification',
    severity: 'warning'
  };

  await sendNotification(notification);

  expect(client.sendMessage).toHaveBeenCalledWith(
    '12345678901@c.us',
    'Test notification'
  );
});
```

### Integration Tests (File Fallback Only)

Disable WhatsApp for CI tests, verify file fallback:

```typescript
test('notification fallback to file log', async () => {
  process.env.WHATSAPP_ENABLED = 'false';

  const notification = {
    id: 'notif_456',
    message: 'Critical error',
    severity: 'critical'
  };

  await sendNotification(notification);

  const logContent = await fs.readFile('.specify/.notifications.log', 'utf-8');
  const lastLine = logContent.trim().split('\n').pop();
  const parsed = JSON.parse(lastLine);

  expect(parsed.notificationId).toBe('notif_456');
  expect(parsed.deliveryMethod).toBe('file-fallback');
});
```

### Manual Testing (Real WhatsApp)

For E2E validation with real WhatsApp:
1. Set `WHATSAPP_NOTIFY_NUMBER` to test number
2. Start orchestrator, scan QR code
3. Trigger task failure or question escalation
4. Verify message received on mobile device
5. Test interactive response handling

---

## Production Deployment

### Setup Checklist

- [ ] Install whatsapp-web.js: `npm install whatsapp-web.js qrcode-terminal`
- [ ] Set `WHATSAPP_NOTIFY_NUMBER` environment variable
- [ ] Run orchestrator in terminal with TTY (for QR code display)
- [ ] Scan QR code with WhatsApp mobile app
- [ ] Verify session persisted to `.specify/.whatsapp-session/`
- [ ] Test notification delivery with dummy alert
- [ ] Configure log monitoring for `.notifications.log` fallback
- [ ] Document WhatsApp account used (for team handoff)

### Operational Considerations

- **Session Maintenance**: WhatsApp sessions last ~weeks, but may expire if mobile device offline
- **QR Re-authentication**: Keep orchestrator terminal accessible for re-scanning if needed
- **Monitoring**: Set up alerts if `.notifications.log` receives entries (indicates WhatsApp failure)
- **Backup Channel**: Consider SMS or email as secondary fallback (not in MVP scope)

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-10-27
**Owner**: NotificationService
