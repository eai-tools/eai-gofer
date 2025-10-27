# Implementation Plan: Autonomous Specification Execution System

**Branch**: `feature/003` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-orchestrator-agents/spec.md`

## Summary

Build an autonomous orchestrator system that reads GitHub Spec Kit specifications, manages task dependencies, coordinates Engineer and Test agents for validation, handles retry logic with exponential backoff, and escalates failures to humans via WhatsApp notifications. The system uses file-based communication with Claude Code, performs constitution-based code validation, runs automated tests (Playwright, Vitest), and emits structured JSON logs for operational monitoring.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Node.js 18+
**Primary Dependencies**:
- `@anthropic-ai/sdk` (Claude API for Engineer/Test agents and Q&A)
- `chokidar` (file system monitoring for Claude Code communication)
- `whatsapp-web.js` (notification delivery)
- `@playwright/test` (E2E test execution)
- `vitest` (unit test execution)

**Storage**: File-based (specifications in `.specify/specs/`, constitution in `.specify/memory/constitution.md`)
**Testing**: Vitest for unit tests, Playwright for E2E tests, integration tests for agent coordination
**Target Platform**: Linux/macOS servers, development workstations
**Project Type**: Single project (CLI orchestrator + agents)
**Performance Goals**:
- Startup <2s for <50 specs
- Task iteration <30s average
- File change detection <300ms
- Notification delivery <10s

**Constraints**:
- File-based communication only (no direct Claude Code API)
- Sequential task execution (no parallelization)
- Constitution loaded once at startup
- Maximum 3 retry attempts per task

**Scale/Scope**:
- Support up to 100 tasks per spec
- Support up to 50 specs per repository
- Warn but continue beyond limits

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Test-Driven Development ✅ PASS
- Implementation requires comprehensive test suite for all components
- Spec defines testable acceptance criteria for all user stories
- Plan includes test-first development approach

### Principle II: MCP-First Architecture ⚠️ PARTIAL
- **Current**: File-based communication (`.claude-input.txt`/`.claude-output.txt`)
- **Constitution Requirement**: MCP tools preferred
- **Status**: File-based is acceptable as "legacy" per constitution
- **Future**: Migrate to MCP tools when Claude Code MCP support is stable

### Principle III: Spec Kit Format Compliance ✅ PASS
- System designed to parse GitHub Spec Kit format
- Loads specs from `.specify/specs/` with YAML frontmatter
- Supports task dependencies and status tracking

### Principle IV: Strict TypeScript & Code Quality ✅ PASS
- TypeScript strict mode required
- No `any` types permitted
- File size limits: ≤500 lines per file
- Function complexity: ≤10 cyclomatic complexity

### Principle V: Security by Default ✅ PASS
- API keys in environment variables only
- Input validation for all spec parsing
- Path traversal prevention for file operations
- Rate limiting on Claude API calls

### Principle VI: Performance Requirements ✅ PASS
- Startup <2s aligns with constitution (<1s for Language Server)
- File monitoring <300ms exceeds constitution requirement
- Task iteration <30s reasonable for autonomous operation

### Principle VII: 80% Test Coverage Minimum ⚠️ REQUIRED
- **Current**: Test suite not yet implemented (per repository exploration)
- **Gate Status**: ❌ BLOCKING - Must implement tests before production use
- **Action Required**: Phase 1 must include comprehensive test creation

**Gate Decision**: PROCEED WITH CAUTION
- Core principles aligned (TDD, Spec Kit, TypeScript, Security, Performance)
- MCP-First partial compliance acceptable (legacy file-based allowed by constitution)
- **CRITICAL**: Test coverage must be implemented during Phase 1 (currently 0%)

## Project Structure

### Documentation (this feature)

```text
specs/003-orchestrator-agents/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (technology decisions)
├── data-model.md        # Phase 1 output (entities and state machines)
├── quickstart.md        # Phase 1 output (development setup)
├── contracts/           # Phase 1 output (API contracts)
│   ├── claude-api.md    # Engineer/Test agent API contracts
│   ├── file-protocol.md # File-based communication protocol
│   └── notification-api.md # WhatsApp notification contracts
├── checklists/          # Existing quality checklists
│   └── requirements.md  # Specification quality validation
├── spec.md              # Feature specification (existing)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts                    # Main CLI entry point
├── types.ts                    # Shared type definitions
├── orchestrator/
│   ├── Orchestrator.ts         # Base orchestrator (existing)
│   ├── AutonomousOrchestrator.ts # Enhanced autonomous version (existing)
│   ├── SpecLoader.ts           # GitHub Spec Kit parser (existing)
│   └── QAEngine.ts             # Spec-based Q&A (existing)
├── agents/
│   ├── EngineerAgent.ts        # Code validation agent (existing)
│   └── TestAgent.ts            # Test execution agent (existing)
├── interceptor/
│   ├── ClaudeCodeInterceptor.ts # File monitoring (existing)
│   └── README.md               # Integration guide (existing)
└── utils/
    ├── NotificationService.ts  # WhatsApp integration (existing)
    └── Logger.ts               # NEW: Structured JSON logging (Phase 1)

tests/
├── unit/
│   ├── orchestrator/
│   │   ├── SpecLoader.test.ts
│   │   ├── QAEngine.test.ts
│   │   └── TaskQueue.test.ts
│   ├── agents/
│   │   ├── EngineerAgent.test.ts
│   │   └── TestAgent.test.ts
│   └── utils/
│       ├── NotificationService.test.ts
│       └── Logger.test.ts
├── integration/
│   ├── orchestrator-agent-coordination.test.ts
│   ├── file-monitoring-flow.test.ts
│   └── notification-escalation.test.ts
└── e2e/
    ├── autonomous-execution.test.ts
    ├── retry-and-recovery.test.ts
    └── multi-task-workflow.test.ts
```

**Structure Decision**: Single project structure selected. This is an autonomous orchestrator with coordinated agents, all running in a single Node.js process. The existing implementation already follows this structure with clear separation of concerns: orchestration layer, agent layer, interceptor layer, and utilities. No frontend/backend split needed - this is a CLI tool with file-based integration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because | Constitutional Exception Status |
|-----------|------------|-------------------------------------|--------------------------------|
| File-based communication (MCP-First partial compliance with Principle II) | Claude Code file monitoring is the documented integration pattern for autonomous operation. Constitution states file-based is "legacy only" but permits this for backward compatibility. | Direct MCP integration requires Claude Code MCP server support, which is not yet stable for file-based autonomous workflows (as of 2025-10-27). MCP tools require stateless operation, but file-watching enables long-running task monitoring. | **✅ APPROVED EXCEPTION**: Principle II exception granted for feature 003. Migration to MCP tools (`specgofer_execute_task`, `specgofer_get_next_task`) required by Q2 2026 when Claude Code MCP reaches production stability. File-based remains supported as fallback. |
| Test coverage currently 0% (violates Principle VII) | Existing implementation was built iteratively without TDD during prototyping phase | **❌ BLOCKING VIOLATION**: This is a gate violation that MUST BE FIXED. Cannot be justified - constitution is non-negotiable on test coverage. | **🔴 NO EXCEPTION GRANTED**: Phase 8 tasks T076-T080 are BLOCKING for production deployment. All tests must pass with ≥80% coverage (line/branch/function/statement) before feature merge. CI coverage gate (T080) will enforce this requirement. |

## Phase 0: Outline & Research

### Research Tasks

Based on Technical Context analysis, the following areas require research and decision documentation:

#### R1: Structured Logging Strategy ✅ RESOLVED VIA CLARIFICATION
- **Decision**: JSON-formatted logs to stdout with log levels (INFO/WARN/ERROR)
- **Rationale**: Aligns with 12-factor app principles, enables log aggregation, supports operational monitoring
- **Libraries**: Winston or Pino for structured logging
- **Format**: `{"timestamp":"ISO-8601","level":"INFO","taskId":"T001","event":"task_started","context":{...}}`
- **Source**: Clarification session Q1

#### R2: File Conflict Resolution Strategy ✅ RESOLVED VIA CLARIFICATION
- **Decision**: Last-write-wins with WARNING log
- **Rationale**: Prevents orchestrator blocking, maintains autonomous operation, alerts operators to conflicts
- **Implementation**: Detect file mtime changes before write, log WARNING with diff details
- **Source**: Clarification session Q2 (aligned with constitution)

#### R3: Scale Limit Behavior ✅ RESOLVED VIA CLARIFICATION
- **Decision**: Warn but continue processing beyond limits
- **Rationale**: Autonomous system should degrade gracefully, not fail hard on scale limits
- **Implementation**: Log WARNING at startup if >100 tasks or >50 specs detected
- **Source**: Clarification session Q3

#### R4: Notification Delivery Fallback ✅ RESOLVED VIA CLARIFICATION
- **Decision**: Persist to `.specify/.notifications.log` file
- **Rationale**: Ensures critical alerts are never lost, provides audit trail, enables operator monitoring
- **Format**: JSON lines with timestamp, severity, content, delivery status
- **Source**: Clarification session Q4

#### R5: Retry Logic and Exponential Backoff
- **Research**: Best practices for retry patterns in autonomous systems
- **Questions**:
  - Optimal backoff intervals (spec says 10s, 30s, 2min - validate this progression)
  - Jitter strategies to prevent thundering herd
  - Exponential vs linear vs fibonacci backoff comparison
- **Output**: Algorithm selection with rationale

#### R6: Test Framework Integration Patterns
- **Research**: Best practices for orchestrating multiple test types (unit, integration, E2E)
- **Questions**:
  - Vitest + Playwright coordination strategies
  - Mocking Claude API responses for deterministic tests
  - Test data management for spec fixtures
  - Coverage reporting aggregation across test types
- **Output**: Test architecture diagram and tooling decisions

#### R7: WhatsApp Web.js Production Readiness
- **Research**: Stability, authentication persistence, error handling
- **Questions**:
  - Session persistence strategies (avoid repeated QR scans)
  - Reconnection handling for long-running processes
  - Rate limiting and message delivery guarantees
  - Alternative notification channels if WhatsApp fails
- **Output**: Production deployment guide with fallback strategies

#### R8: Claude API Rate Limiting and Cost Management
- **Research**: Anthropic API quotas, rate limits, cost per request
- **Questions**:
  - Token usage estimation for typical validation/Q&A requests
  - Rate limit handling (current spec has rate limiting in security considerations)
  - Cost projections for continuous autonomous operation
  - Request batching opportunities
- **Output**: Cost model and rate limiting implementation strategy

**Output**: ✅ research.md consolidating all findings (COMPLETE - see research.md)

## Phase 1: Design & Contracts

**Prerequisites:** research.md complete with all R1-R8 decisions documented

### Data Model Design

Extract entities from spec.md and define state machines:

**Primary Entities**:
1. **Specification** - Feature description with metadata and tasks
2. **Task** - Individual work item with dependencies and status
3. **ValidationResult** - Code quality assessment from Engineer Agent
4. **TestResult** - Test execution results from Test Agent
5. **Question** - Q&A interactions with Claude Code
6. **Answer** - Q&A responses with confidence scoring
7. **Notification** - Human escalation alerts
8. **LogEntry** - Structured operational logs (NEW)

**State Machines**:
- Task Status: `pending → in_progress → completed | failed`
- Notification Delivery: `queued → sending → delivered | failed → persisted`
- Orchestrator State: `starting → running → paused | stopped`

**Output**: ✅ data-model.md with entity diagrams and state transitions (COMPLETE - 8 entities, 4 state machines)

### API Contracts

Generate contracts from functional requirements:

#### Contract 1: Claude API Integration (Engineer & Test Agents)
- **File**: `contracts/claude-api.md`
- **Endpoints**: Anthropic Messages API
- **Request Format**: Validation prompts, Q&A prompts
- **Response Format**: Structured JSON with validation results
- **Error Handling**: Rate limits, timeouts, API errors

#### Contract 2: File-Based Communication Protocol
- **File**: `contracts/file-protocol.md`
- **Files**: `.claude-input.txt`, `.claude-output.txt`, `.claude-question.txt`
- **Message Format**: Delivery prompts, feedback prompts, questions
- **Change Detection**: Chokidar events, debouncing, duplicate prevention
- **Locking Strategy**: File mtime checks, write atomicity

#### Contract 3: Notification API
- **File**: `contracts/notification-api.md`
- **Service**: NotificationService (wraps WhatsAppClient internally)
- **Implementation**: WhatsApp Web.js library for message delivery
- **Message Types**: Task failures, escalations, questions
- **Delivery Guarantees**: At-least-once with fallback to .notifications.log
- **Authentication**: QR code flow, session persistence

#### Contract 4: Structured Logging API
- **File**: `contracts/logging-api.md` (NEW)
- **Format**: JSON lines to stdout
- **Log Levels**: INFO, WARN, ERROR
- **Required Fields**: timestamp, level, event, taskId, specId, context
- **Event Types**: task_started, task_completed, test_failed, notification_sent, etc.

**Output**: ✅ `contracts/` directory with 4 markdown files (COMPLETE - claude-api.md, file-protocol.md, notification-api.md, logging-api.md)

### Quickstart Guide

**File**: `quickstart.md`

**Contents**:
1. Prerequisites (Node.js 18+, API keys setup)
2. Installation (`npm install`)
3. Configuration (environment variables, WhatsApp authentication)
4. Running orchestrator (`npm run orchestrate`)
5. Monitoring logs (log format, filtering commands)
6. Development workflow (running tests, debugging agents)

**Output**: ✅ quickstart.md with step-by-step setup instructions (COMPLETE - 15-minute setup guide)

### Agent Context Update

**Action**: Run `.specify/scripts/bash/update-agent-context.sh claude`

**Purpose**: Update `.claude/` directory with technology context for AI assistants

**Technologies to Add**:
- TypeScript strict mode patterns
- Chokidar file watching
- Winston/Pino structured logging
- WhatsApp Web.js integration
- Anthropic Claude API usage
- Vitest + Playwright test coordination

**Output**: Updated agent context files (automatically handled by script)

## Constitution Re-Check (Post-Design)

### Phase 1 Design Compliance

✅ **Test-Driven Development**: Test suite architecture defined in Phase 1 design
✅ **MCP-First Architecture**: File-based approach documented with future MCP migration path
✅ **Spec Kit Format Compliance**: SpecLoader design follows GitHub Spec Kit parsing rules
✅ **Strict TypeScript**: All new code (Logger.ts) will follow strict mode
✅ **Security by Default**: API key management and input validation in contracts
✅ **Performance Requirements**: Design targets meet constitution benchmarks
⚠️ **80% Test Coverage**: Test architecture defined but implementation pending Phase 2

**Gate Decision**: ✅ APPROVED FOR PHASE 2 (Tasks)
- All design artifacts complete
- Contracts define clear boundaries
- Test architecture planned
- No constitutional violations introduced

**Next Command**: `/speckit.tasks` - Generate implementation tasks from this plan

---

**Plan Status**: ✅ COMPLETE (Phase 0 & Phase 1 & Phase 2 - tasks.md generated)
**Path**: `.specify/specs/003-orchestrator-agents/plan.md`
**Generated Artifacts**:
- ✅ plan.md (this file)
- ✅ research.md (COMPLETE: R1-R8 research decisions documented)
- ✅ data-model.md (COMPLETE: 8 entities, 4 state machines)
- ✅ contracts/ (COMPLETE: claude-api.md, file-protocol.md, notification-api.md, logging-api.md)
- ✅ quickstart.md (COMPLETE: 15-minute setup guide)
- ✅ tasks.md (COMPLETE: 95 tasks across 8 phases, generated by /speckit.tasks)
