# Quick Start: Claude Code Terminal Integration

## Prerequisites

1. **Install Claude Code CLI**:

   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   ```

2. **Set up environment variables** in `.env`:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```

3. **Install dependencies**:
   ```bash
   cd extension
   npm install node-pty@1.0.0 fix-path@4.0.0 twilio@5.3.0 ws@8.18.0 uuid@10.0.0
   ```

## Configuration

### 1. Configure WhatsApp (Optional)

Open VSCode Command Palette (`Cmd+Shift+P`) and run:

```
SpecGofer: Configure WhatsApp Escalation
```

Enter your WhatsApp number in E.164 format (e.g., +1234567890).

### 2. Adjust Settings

Open VSCode Settings and search for "specgofer.claudeCode":

- **Auto Response**: Enable/disable automatic responses (default: true)
- **Confidence Threshold**: Minimum confidence for auto-response (default: 0.8)
- **Escalation Timeout**: WhatsApp response timeout in seconds (default: 300)
- **Buffer Size**: Terminal output buffer lines (default: 10000)

## Basic Usage

### Starting Claude Code

1. Open a specification in the SpecGofer tree view
2. Click the **Play** button (▶️) next to the spec
3. Watch Claude Code execute in the external Terminal window

The system will:

- Checkout the feature branch automatically
- Launch Claude Code with the spec context
- Monitor output in real-time
- Auto-respond to questions when confident

### Stopping Execution

- Click the **Stop** button (⏹️) in the tree view, OR
- Close the Terminal window, OR
- Close VSCode (automatic cleanup)

### Monitoring Output

View Claude Code activity in the VSCode Output panel:

1. Open Output panel (`View → Output`)
2. Select "SpecGofer Autonomous" from dropdown
3. See questions, responses, and escalations

## Question Handling

### Automatic Responses

When Claude Code asks questions like:

- "Would you like me to create this file?"
- "Should I proceed with this implementation?"

SpecGofer will:

1. Analyze the question using Claude API
2. Check against project constitution
3. Auto-respond if confidence > 80%
4. Log the decision in the output panel

### Human Escalation

For uncertain or constitution-violating questions:

1. **WhatsApp** (if configured):
   - You'll receive a message with the question
   - Reply with your guidance
   - Response is sent to Claude Code

2. **VSCode Dialog** (fallback):
   - A dialog appears in VSCode
   - Choose from suggested responses
   - Or provide custom guidance

## Learning System

The system learns from your escalation responses:

- Patterns are saved to `.specify/memory/decisions/`
- Similar future questions use learned patterns
- Confidence increases with successful applications
- Clear memories with: `SpecGofer: Clear Decision Memory`

## Troubleshooting

### Claude Code CLI Not Found

```bash
# Verify installation
which claude

# If missing, reinstall:
curl -fsSL https://claude.ai/install.sh | bash
```

### Terminal Doesn't Open

1. Check macOS Terminal.app permissions
2. Verify node-pty installation:
   ```bash
   npm ls node-pty
   ```
3. Check logs in Output panel

### WhatsApp Not Receiving Messages

1. Verify Twilio credentials in `.env`
2. Test connection: `SpecGofer: Test WhatsApp Connection`
3. Check webhook URL is publicly accessible
4. Verify phone number format (+country code)

### Auto-Response Not Working

1. Check confidence threshold in settings
2. Verify ANTHROPIC_API_KEY is set
3. Review constitution violations in output
4. Check Claude API rate limits

## Advanced Features

### Queue Management

Multiple specs are automatically queued:

- View queue status in tree view
- Sessions run sequentially (one at a time)
- Queue position shown in tooltip

### Memory Management

View and manage learned patterns:

```bash
# List all memories
ls .specify/memory/decisions/

# Clear spec-specific memories
rm .specify/memory/decisions/*-specId-*.json
```

### Custom Constitution Rules

Add project-specific rules to `.specify/memory/constitution.md`:

```markdown
### Project-Specific Rules

- Always use TypeScript strict mode
- Never commit .env files
- Prefer composition over inheritance
```

## Example Session

```bash
# 1. User clicks Play on "001-feature" spec
✓ Checked out branch: feature/001-feature
✓ Launched Claude Code terminal

# 2. Claude Code output
> Implementing task T001: Setup API endpoints
> Would you like me to create src/api/endpoints.ts?

# 3. Auto-response (confidence: 0.92)
✅ [AUTO] Responded: "yes"

# 4. Claude Code continues
> Created src/api/endpoints.ts
> Should I add authentication middleware?

# 5. Escalation (constitution violation)
⚠️ [ESCALATE] Sending to WhatsApp...
👤 [HUMAN] Response received: "yes, use JWT with refresh tokens"

# 6. Memory saved
✓ Learned pattern for future authentication decisions
```

## Best Practices

1. **Start with small specs** to train the system
2. **Review auto-responses** in the output panel
3. **Respond quickly** to WhatsApp escalations (5-minute timeout)
4. **Clear memories** if patterns become outdated
5. **Adjust confidence threshold** based on your comfort level
6. **Keep constitution updated** with project principles

## Support

- View logs: `View → Output → SpecGofer Autonomous`
- Report issues: GitHub Issues
- Check escalation history: `SpecGofer: View Escalation History`
- Debug mode: Set `SPECGOFER_DEBUG=true` in environment
