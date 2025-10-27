# Quickstart Guide: Autonomous Orchestrator

**Feature**: 003 - Autonomous Specification Execution System
**Audience**: Developers setting up the orchestrator for the first time
**Time to Complete**: ~15 minutes

---

## Prerequisites

### Required

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: For repository management
- **Operating System**: Linux or macOS (Windows via WSL)

### API Keys & Accounts

- **Anthropic API Key**: [Get one here](https://console.anthropic.com/settings/keys)
- **WhatsApp**: Mobile device with WhatsApp installed (for notifications)

### Verify Prerequisites

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
git --version   # Any recent version
```

---

## Step 1: Installation

### Clone Repository

```bash
git clone https://github.com/your-org/spec-driven-dev-system.git
cd spec-driven-dev-system
```

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install extension dependencies (if developing extension)
cd extension && npm install && cd ..

# Install language server dependencies (if developing LSP)
cd language-server && npm install && cd ..
```

### Verify Installation

```bash
# Check that orchestrator builds successfully
npm run compile

# Verify test infrastructure
npm test -- --run
```

---

## Step 2: Configuration

### Environment Variables

Create `.env` file in repository root:

```bash
# Required: Anthropic API key for Engineer Agent and Q&A Engine
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: WhatsApp notifications (leave empty to use file fallback only)
WHATSAPP_NOTIFY_NUMBER=12345678901  # Your phone number (no + or spaces)

# Optional: Logging
LOG_LEVEL=info  # Options: info, warn, error
```

**Get Anthropic API Key**:
1. Visit https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy key and paste into `.env`

**WhatsApp Number Format**:
- Include country code (e.g., 1 for USA, 44 for UK)
- Remove all spaces, dashes, and plus signs
- Example: USA +1 (234) 567-8901 → 12345678901

### Verify Configuration

```bash
# Test API key validity
npm run test:config

# Expected output:
# ✓ ANTHROPIC_API_KEY is set and valid
# ✓ WhatsApp configuration detected (or: WhatsApp disabled, using file fallback)
# ✓ Log directory writable
```

---

## Step 3: WhatsApp Setup (Optional)

**Skip this step** if you prefer file-based notifications (`.specify/.notifications.log`)

### First-Time Authentication

1. Start orchestrator with WhatsApp enabled:
   ```bash
   npm run orchestrate
   ```

2. Scan QR code displayed in terminal:
   ```
   ┌─────────────────────────────────┐
   │  █▀▀▀▀▀█ ▀█  ▀▀▄█▄█ █▀▀▀▀▀█  │
   │  █ ███ █ ▄▀█▄▀▄█▀▀█ █ ███ █  │
   │  █ ▀▀▀ █ ▄█ ▀▀█▄ █▄ █ ▀▀▀ █  │
   │  ... (QR code) ...            │
   └─────────────────────────────────┘
   Open WhatsApp on your phone → Settings → Linked Devices → Link Device
   Scan this QR code
   ```

3. Wait for confirmation:
   ```
   ✓ WhatsApp connected and ready
   ```

4. Stop orchestrator (Ctrl+C)

### Session Persistence

After first authentication:
- Session saved to `.specify/.whatsapp-session/`
- No QR scan needed on subsequent runs
- Session lasts ~weeks (re-scan if expired)

### Test Notification

```bash
npm run test:notification

# Expected:
# ✓ Notification sent via WhatsApp
# Check your phone for test message
```

---

## Step 4: Verify Setup

### Run Health Check

```bash
npm run health-check

# Expected output:
# ✓ Node.js version: 18.17.0
# ✓ Dependencies installed
# ✓ .specify/ directory exists
# ✓ Constitution found
# ✓ Anthropic API key valid
# ✓ WhatsApp connected (or: File fallback enabled)
# ✓ Log directory writable
# ✓ Test infrastructure ready
```

### Load Test Specs

```bash
# Verify orchestrator can load specs
npm run test:load-specs

# Expected:
# ✓ Loaded 3 specification(s)
#   - 001-example-feature (5 tasks)
#   - 002-another-feature (3 tasks)
#   - 003-orchestrator-agents (15 tasks)
# ✓ Task queue built with 23 total tasks
# ✓ No circular dependencies detected
```

---

## Step 5: Run Orchestrator

### Start Autonomous Execution

```bash
npm run orchestrate

# Or with custom options:
npm run orchestrate -- --spec 003-orchestrator-agents  # Process specific spec only
npm run orchestrate -- --dry-run                        # Show task queue without executing
```

### Monitor Logs

**Real-time stdout** (all events):
```bash
npm run orchestrate | jq -C '.'  # Pretty-print JSON logs
```

**Error log file** (WARN/ERROR only):
```bash
tail -f .specify/.orchestrator.log | jq -C '.'
```

**Notification fallback** (if WhatsApp fails):
```bash
tail -f .specify/.notifications.log | jq -C '.'
```

### Stop Orchestrator

Press `Ctrl+C` for graceful shutdown:
```
^C Received SIGINT, shutting down gracefully...
✓ Orchestrator stopped
✓ WhatsApp disconnected
✓ File watchers closed
```

---

## Step 6: Verify First Task Execution

### Create Test Specification

```bash
# Create a simple test spec
cat > .specify/specs/test-001-hello-world/spec.md <<EOF
---
id: test-001-hello-world
title: Hello World Test
status: draft
created: $(date -Iseconds)
updated: $(date -Iseconds)
priority: low
---

# Hello World Test

## User Scenarios & Testing

### User Story 1 - Simple Hello World (Priority: P1)

As a developer, I want a function that returns "Hello, World!" so I can verify the orchestrator works.

**Acceptance Scenarios**:
1. **Given** the function is called, **When** executed, **Then** it returns "Hello, World!"

## Requirements

- **FR-001**: System MUST provide a helloWorld() function that returns "Hello, World!"

## Success Criteria

- **SC-001**: Function returns exact string "Hello, World!" when called
EOF

# Create tasks file
cat > .specify/specs/test-001-hello-world/tasks.md <<EOF
# Tasks: Hello World Test

- [ ] #T001 Implement helloWorld() function (deps: none)
EOF
```

### Start Orchestrator

```bash
npm run orchestrate
```

### Monitor Progress

Watch for these log events:
1. `spec_loaded`: "test-001-hello-world"
2. `task_started`: "T001"
3. `file_change_detected`: ".claude-output.txt"
4. `validation_started`
5. `test_started`
6. `task_completed`

### Verify Results

```bash
# Check task status
cat .specify/specs/test-001-hello-world/tasks.md

# Expected:
# - [x] #T001 Implement helloWorld() function (deps: none)
```

---

## Common Issues & Solutions

### Issue: API Key Invalid

**Symptom**:
```
ERROR: claude_api_error
Status: 401 Unauthorized
```

**Solution**:
1. Verify API key in `.env` file
2. Check key hasn't expired at https://console.anthropic.com
3. Ensure no extra spaces in key value

### Issue: WhatsApp QR Code Not Displayed

**Symptom**: Orchestrator starts but no QR code shown

**Solution**:
1. Ensure terminal supports UTF-8: `export LANG=en_US.UTF-8`
2. Run in interactive terminal (not background process)
3. Check `WHATSAPP_NOTIFY_NUMBER` is set in `.env`

### Issue: File Watching Not Working

**Symptom**: `.claude-output.txt` changes not detected

**Solution**:
1. Verify Chokidar installed: `npm list chokidar`
2. Check file permissions: `ls -la .claude-*.txt`
3. Ensure not running on network filesystem (NFS/SMB have latency)

### Issue: Rate Limiting

**Symptom**:
```
WARN: claude_rate_limit
retry_after: 60
```

**Solution**:
- Wait 60 seconds (automatic retry)
- Reduce concurrent tasks if persistent
- Check API tier at Anthropic console

### Issue: Test Coverage <80%

**Symptom**:
```
WARN: constitution_violation
principle: test-coverage
actual: 65%
```

**Solution**:
- Engineer Agent will reject implementation
- Orchestrator retries with feedback
- Human review needed if 3 retries fail

---

## Next Steps

### Development Workflow

1. **Create Specification**: Add new spec to `.specify/specs/{id}/`
2. **Define Tasks**: Create `tasks.md` with dependencies
3. **Start Orchestrator**: `npm run orchestrate`
4. **Monitor Progress**: Watch logs for task completion
5. **Review Results**: Check spec files for status updates

### Running Tests

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires Playwright)
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Debugging

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run orchestrate

# Run single spec
npm run orchestrate -- --spec 003-orchestrator-agents

# Dry run (show task queue without executing)
npm run orchestrate -- --dry-run
```

### Production Deployment

See [deployment-guide.md](./deployment-guide.md) for:
- Running as systemd service
- Log aggregation setup
- Monitoring and alerting
- Scaling considerations

---

## Architecture Overview

```
.specify/
├── specs/
│   └── {id}/
│       ├── spec.md          # GitHub Spec Kit format
│       ├── tasks.md         # Task breakdown
│       ├── plan.md          # This planning document
│       └── contracts/       # API contracts
├── memory/
│   └── constitution.md      # Quality standards
└── .orchestrator.log        # Error/warning logs

Repository Root:
├── .claude-input.txt        # Orchestrator → Claude Code
├── .claude-output.txt       # Claude Code → Orchestrator
├── .claude-question.txt     # Claude Code → Q&A Engine
└── .specify/
    └── .notifications.log   # Notification fallback
```

**Data Flow**:
1. Orchestrator loads specs from `.specify/specs/`
2. Writes task prompt to `.claude-input.txt`
3. Claude Code reads prompt, implements, writes `.claude-output.txt`
4. Orchestrator validates with Engineer Agent (Claude API)
5. Test Agent runs Playwright/Vitest tests
6. If success: mark task complete, move to next
7. If failure: retry with feedback (up to 3x)
8. If 3 failures: escalate via WhatsApp notification

---

## Resources

- **Specification Template**: `.specify/templates/spec-template.md`
- **Task Template**: `.specify/templates/tasks-template.md`
- **Constitution**: `.specify/memory/constitution.md`
- **API Contracts**: `.specify/specs/003-orchestrator-agents/contracts/`
- **Data Model**: `.specify/specs/003-orchestrator-agents/data-model.md`

## Support

- **GitHub Issues**: https://github.com/your-org/spec-driven-dev-system/issues
- **Documentation**: https://docs.yourproject.com
- **Slack**: #autonomous-orchestrator channel

---

**Quickstart Version**: 1.0.0
**Last Updated**: 2025-10-27
**Maintainer**: Development Team
