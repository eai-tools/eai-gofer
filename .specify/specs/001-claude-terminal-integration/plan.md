# Implementation Plan: Claude Code Terminal Integration

**Branch**: `001-claude-terminal-integration` | **Date**: 2025-11-03 | **Spec**:
[spec.md](spec.md) **Input**: Feature specification from
`/specs/001-claude-terminal-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate Claude Code CLI with SpecGofer's terminal system for autonomous
feature implementation with human-in-the-loop monitoring. The system will launch
Claude Code in an external terminal where developers can watch execution in
real-time, automatically respond to questions when confident (>80%), and
escalate uncertain decisions to WhatsApp for human guidance. This enables
autonomous execution while maintaining transparency and human oversight.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20.x LTS **Primary
Dependencies**:

- `node-pty@1.0.0` - Pseudo-terminal for I/O control (compatible with Node.js
  20.x LTS)
- `@anthropic-ai/sdk` - Claude API client (already in project)
- `twilio@5.3.0` - WhatsApp messaging (Business API with webhook support)
- VSCode Extension API 1.95+ **Storage**: File-based (.specify/memory/ for
  decisions, local buffer for terminal output) **Testing**: Vitest for unit
  tests, Playwright for E2E (existing infrastructure) **Target Platform**: macOS
  Terminal.app (external terminal display) **Project Type**: single (VSCode
  extension with terminal integration) **Performance Goals**:
- Terminal spawn <500ms
- Question detection <100ms
- Claude API validation <1s (using Haiku model)
- WhatsApp escalation delivery <10s **Constraints**:
- Terminal output buffer: 10,000 lines max (circular)
- Context window management for Claude API
- WhatsApp response timeout: 5 minutes
- Sequential session execution (one at a time) **Scale/Scope**:
- Single developer per instance
- Multiple specs supported (queued)
- 2+ hour session support

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-Driven Development ✅

- **Compliance**: Will write tests for all new components (QuestionValidator,
  EscalationManager, PTY integration)
- **Test Categories**: Unit tests for parsing logic, integration tests for
  terminal I/O, E2E tests for full flow

### II. MCP-First Architecture ⚠️

- **Partial Compliance**: Feature enhances terminal integration but doesn't
  expose new MCP tools
- **Justification**: This is an orchestration enhancement, not a new MCP tool.
  Future iterations could expose terminal status via MCP

### III. Spec Kit Format Compliance ✅

- **Compliance**: Specification follows GitHub Spec Kit format with YAML
  frontmatter, structured sections, and proper task tracking

### IV. Strict TypeScript & Code Quality ✅

- **Compliance**: All new code will be TypeScript with strict mode, proper
  typing (no `any`), and adherence to size limits

### V. Security by Default ✅

- **Compliance**: WhatsApp credentials in environment variables, input
  validation for terminal commands, secure escalation IDs

### VI. Performance Requirements ✅

- **Compliance**: Terminal spawn <500ms, question detection <100ms, all within
  constitution thresholds

### VII. 80% Test Coverage Minimum ✅

- **Compliance**: Will achieve >80% coverage for new components, critical paths
  (escalation, terminal lifecycle) at 100%

**GATE RESULT**: ✅ PASS - Minor note on MCP architecture (justified as
orchestration feature)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
extension/
├── src/
│   ├── autonomous/
│   │   ├── TerminalManager.ts       # Enhanced with PTY integration
│   │   ├── OutputMonitor.ts         # Enhanced for natural language questions
│   │   ├── QuestionValidator.ts     # NEW: Claude API validation
│   │   ├── EscalationManager.ts     # NEW: WhatsApp integration
│   │   ├── FeatureBranchManager.ts  # NEW: Git branch operations
│   │   ├── types.ts                 # Terminal state types
│   │   ├── webhookServer.ts         # NEW: Express server for Twilio webhooks
│   │   ├── outputStreamer.ts        # NEW: WebSocket streaming for real-time output
│   │   └── telemetry.ts             # NEW: Success metrics collection
│   ├── autonomousCommands.ts        # Enhanced with new flow
│   └── extension.ts                 # Extension entry point

tests/
├── unit/
│   ├── QuestionValidator.test.ts
│   ├── EscalationManager.test.ts
│   └── FeatureBranchManager.test.ts
├── integration/
│   ├── TerminalLifecycle.test.ts
│   ├── ClaudeCodeIntegration.test.ts
│   └── WhatsAppFlow.test.ts
└── e2e/
    └── FullAutonomousFlow.spec.ts
```

**Structure Decision**: Single project structure within the existing VSCode
extension. All new components will be added to the `extension/src/autonomous/`
directory to maintain separation of concerns. The existing infrastructure
(AutonomousDriver, OutputMonitor, MemoryManager) will be extended rather than
replaced.

## Post-Design Constitution Re-Check

_Re-evaluated after Phase 1 design completion_

### I. Test-Driven Development ✅

- **Maintained**: Test structure defined for all new components
- **Coverage Plan**: Unit tests for validators, integration for terminal
  lifecycle, E2E for full flow

### II. MCP-First Architecture ⚠️

- **Maintained Justification**: Feature remains orchestration-focused, not an
  MCP tool
- **Future Consideration**: Could expose `specgofer_terminal_status` MCP tool in
  v2

### III. Spec Kit Format Compliance ✅

- **Maintained**: All artifacts follow GitHub Spec Kit conventions

### IV. Strict TypeScript & Code Quality ✅

- **Maintained**: All interfaces use strict typing, no `any` types
- **File Sizes**: Largest component (EscalationManager) estimated ~250 lines

### V. Security by Default ✅

- **Enhanced**: UUID v4 for all identifiers, sanitized WhatsApp messages
- **Credentials**: All sensitive data in environment variables

### VI. Performance Requirements ✅

- **Validated**: All operations within constitution thresholds
- **Optimizations**: Circular buffer, indexed memory search

### VII. 80% Test Coverage Minimum ✅

- **Plan Confirmed**: Test files defined for >80% coverage target

**POST-DESIGN GATE RESULT**: ✅ PASS - Design adheres to constitution principles

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
