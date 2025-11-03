# Research Findings: Claude Code Terminal Integration

**Date**: 2025-11-03 **Feature**: 001-claude-terminal-integration

## Technical Clarifications Resolved

### 1. node-pty Version Compatibility

**Decision**: Use node-pty v1.0.0 (stable) **Rationale**:

- Confirmed compatibility with Node.js 20.x LTS
- VSCode 1.90+ uses Node.js 20.9.0, matching our target environment
- Stable release with active maintenance

**Alternatives Considered**:

- node-pty beta versions: Rejected due to stability concerns
- child_process.spawn: Lacks pseudoterminal features needed for interactive
  Claude sessions
- VSCode Terminal API: Proposed API only, not available in stable

**macOS-Specific Considerations**:

- PATH environment fix required using `fix-path` module
- Must handle login vs interactive shell differences
- Requires full Xcode installation for compilation

### 2. Twilio WhatsApp Integration

**Decision**: Start with Twilio for MVP, plan migration to simpler alternative
**Rationale**:

- Twilio provides full-featured WhatsApp Business API
- Well-documented webhook integration
- Can migrate to WasenderAPI ($6/month) or Telnyx for cost savings

**Setup Requirements**:

- WhatsApp Business Account registration
- Webhook endpoint for message reception
- 24-hour customer service window compliance
- Pre-approved templates for business-initiated messages

**Alternatives Considered**:

- WasenderAPI: Simpler, cheaper ($6/month) - recommended for v2
- Telnyx: Better pricing than Twilio
- Direct WhatsApp Business API: Too complex for MVP

### 3. Claude Code CLI Availability

**Decision**: Use native binary installation via curl **Rationale**:

- Self-contained executable, no Node.js dependency
- Automatic background updates
- Best macOS integration

**Installation Method**:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Alternatives Considered**:

- Homebrew (`brew install --cask claude-code`): Good alternative
- NPM package: Requires Node.js 18+, permission issues
- Desktop app bundling: Not available - CLI is separate

### 4. Terminal Output Capture

**Decision**: node-pty with WebSocket streaming **Rationale**:

- Full pseudoterminal support for interactive commands
- Real-time bidirectional communication
- Maintains terminal state for long sessions

**Architecture**:

1. Backend: node-pty pseudoterminal
2. Communication: WebSocket for real-time streaming
3. Display: External Terminal.app via spawn process
4. Capture: Event listeners on stdout/stderr

**Alternatives Considered**:

- VSCode Terminal API: Not stable, proposed only
- child_process.exec: Closes after first output, unsuitable
- File-based logging: Too slow for real-time interaction

## Implementation Recommendations

### Phase 1: Core Terminal Integration

1. Install node-pty v1.0.0 with fix-path module
2. Implement FeatureBranchManager for git operations
3. Create PTY spawn wrapper for Claude Code CLI
4. Set up output capture with circular buffer

### Phase 2: Question Detection & Validation

1. Enhance OutputMonitor with natural language patterns
2. Implement QuestionValidator with Claude API (Haiku model)
3. Add confidence scoring for auto-response decisions
4. Create constitution compliance checker

### Phase 3: WhatsApp Escalation

1. Set up Twilio account with WhatsApp Business
2. Implement EscalationManager with webhook handler
3. Add 5-minute timeout for human responses
4. Create fallback to VSCode dialog

### Phase 4: Learning & Memory

1. Save human decisions to .specify/memory/
2. Implement context-aware pattern matching
3. Add similarity scoring for learned patterns
4. Create memory recall for future sessions

## Risk Mitigations

| Risk                     | Mitigation                                    |
| ------------------------ | --------------------------------------------- |
| node-pty thread safety   | Single-threaded execution only                |
| PATH issues on macOS     | Use fix-path module                           |
| WhatsApp complexity      | Start with Twilio, plan WasenderAPI migration |
| Claude CLI not found     | Check multiple installation methods           |
| Terminal output overflow | 10,000 line circular buffer                   |
| WebSocket disconnection  | Automatic reconnection with backoff           |

## Performance Targets

- Terminal spawn: <500ms ✓ (node-pty typical: 200-300ms)
- Question detection: <100ms ✓ (regex parsing: ~10ms)
- Claude validation: <1s ✓ (Haiku model: 500-800ms)
- WhatsApp delivery: <10s ✓ (Twilio: 2-5s typical)

## Dependencies to Add

```json
{
  "dependencies": {
    "node-pty": "^1.0.0",
    "fix-path": "^4.0.0",
    "twilio": "^5.3.0",
    "ws": "^8.18.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/node-pty": "^1.0.0",
    "@types/ws": "^8.5.0"
  }
}
```

## Next Steps

All technical clarifications have been resolved. Ready to proceed to Phase 1:
Design & Contracts.
