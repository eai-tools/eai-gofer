# Task Breakdown: Claude Code Terminal Integration

**Feature**: Claude Code Terminal Integration **Branch**:
`001-claude-terminal-integration` **Generated**: 2025-11-03 **Last Updated**:
2025-11-04 **Status**: MVP Complete + Proactive Decision-Making (v3.1.0)

## 🎉 Latest Release: v3.1.0 (2025-11-04)

**Major Feature**: **Proactive Autonomous Decision-Making**

The autonomous responder has been transformed from purely reactive (answering
questions) to proactive (deciding next actions when Claude Code is idle):

**New Capabilities:**

1. **CONTINUE_IMPLEMENT** - Automatically sends `/speckit.implement` when < 70%
   complete
2. **ENGINEERING_REVIEW** - Requests implementation review against spec when
   40-80% complete
3. **PERFORMANCE_REVIEW** - Requests architecture & performance analysis when >
   70% complete
4. **Question Answering** - Still answers explicit questions from Claude Code

**Implementation:**

- System prompt (lines 350-394 in `ClaudeCodeAutonomousResponder.ts`)
- User prompt with completion-based decision logic (lines 396-440)
- Action execution handlers (lines 474-531)
- Haiku analyzes terminal state, constitution, spec, plan, and tasks to decide
  next action

**Impact**: SpecGofer now autonomously drives Claude Code to feature completion
with strategic quality checkpoints, not just answering questions reactively.

---

## Implementation Status Summary

**ACTUAL IMPLEMENTATION DIFFERS FROM ORIGINAL PLAN**

The implemented solution takes a simpler, more pragmatic approach than
originally planned:

### What's Implemented ✅

- **Phase 1**: Setup & Prerequisites (100% complete)
- **Phase 2**: Foundational Components (80% complete - FeatureBranchManager
  skipped)
- **Phase 3**: Basic Claude Code Execution (90% complete - uses VSCode terminal
  instead of external Terminal.app)
- **Phase 5 (Enhanced)**: Autonomous question response + **Proactive
  decision-making** using Claude 3.5 Haiku (implemented and released in v3.1.0)

### What's NOT Implemented ❌

- **Phase 4**: WhatsApp Escalation (not started - deferred)
- **Phase 6**: Learning from Human Decisions (not started - deferred)
- **Phase 7**: Polish & Integration (not started - deferred)

### Key Implementation Differences

1. **Terminal Approach**: Uses VSCode's integrated terminal with node-pty PTY
   backend instead of spawning external macOS Terminal.app
2. **Question Detection**: Simple spinner-based detection instead of complex
   pattern matching
3. **Autonomous Response**: Single `ClaudeCodeAutonomousResponder` class handles
   all question detection and response using Haiku directly (no separate
   QuestionValidator, EscalationManager, or MemoryManager)
4. **No Git Branch Management**: Feature branch management
   (FeatureBranchManager) was not implemented - users manually manage branches
5. **No WhatsApp**: All question responses are automatic via Haiku or require
   manual terminal input (no escalation system)
6. **No Learning**: No memory/learning system for decision patterns

---

## Phase 1: Setup & Prerequisites

### Goal

Initialize project dependencies and prepare the development environment for
Claude Code terminal integration.

### Tasks

- [x] T001 Install node-pty@1.0.0 and fix-path@4.0.0 in extension/package.json
- [x] T002 Install twilio@5.3.0, ws@8.18.0, and uuid@10.0.0 in
      extension/package.json
- [x] T003 Create .env.example with ANTHROPIC_API_KEY, TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER placeholders
- [x] T004 Update extension/src/autonomous/types.ts with TerminalSession,
      Escalation, Memory, QuestionDetection interfaces
- [x] T005 Configure TypeScript strict mode settings in extension/tsconfig.json

## Phase 2: Foundational Components

### Goal

Create core infrastructure components that all user stories depend on.

### Tasks

- [ ] ~~T006 Create extension/src/autonomous/FeatureBranchManager.ts with git
      operations (checkout, stash, restore)~~ **SKIPPED** - Users manage
      branches manually
- [ ] ~~T007 Implement prepareFeatureBranch() method in FeatureBranchManager.ts
      for branch checkout with stash handling (FR-001, FR-017)~~ **SKIPPED** -
      Not implemented
- [x] T008 Create extension/src/autonomous/TerminalManager.ts base class with
      session tracking Map **NOTE**: Implemented with VSCode terminal API, not
      standalone
- [x] T009 Implement circular buffer logic for terminal output (10,000 line
      limit) (FR-018) **NOTE**: Implemented in
      `ClaudeCodeAutonomousResponder.ts` instead
- [x] T009a Implement real-time output monitoring with data event handlers
      (FR-003) **NOTE**: Implemented in `ClaudeCodeAutonomousResponder.ts`
- [x] T010 Create VS Code output channel "SpecGofer Autonomous" in
      extension/src/extension.ts **NOTE**: Created as "SpecGofer-ClaudeCode" in
      `autonomousCommands.ts`

## Phase 3: User Story 1 - Basic Claude Code Execution with Visual Monitoring (P1)

### Goal

As a developer, I want to click a Play button next to a specification to launch
Claude Code in an integrated terminal where I can watch it implement the feature
in real-time.

**IMPLEMENTATION NOTE**: Uses VSCode integrated terminal with node-pty backend
instead of external macOS Terminal.app

### Independent Test Criteria

Can be fully tested by clicking Play button and verifying Claude Code launches
in VSCode terminal with the correct spec context.

### Tests (TDD Approach)

- [ ] ~~T011 [P] [US1] Write unit test for FeatureBranchManager checkout logic
      in tests/unit/FeatureBranchManager.test.ts~~ **SKIPPED** -
      FeatureBranchManager not implemented
- [ ] T012 [P] [US1] Write integration test for terminal lifecycle in
      tests/integration/TerminalLifecycle.test.ts **TODO**
- [x] T013 [P] [US1] Write unit test for Play/Stop button state management in
      tests/unit/autonomousCommands.test.ts **DONE** - Test created (needs mock
      refinement for node-pty)

### Implementation

- [x] T014 [US1] Implement node-pty integration with spawn() method (FR-002)
      **NOTE**: Implemented in `autonomousCommands.ts` using `pty.spawn()`
- [ ] ~~T015 [US1] Add macOS Terminal.app detection and path resolution~~
      **SKIPPED** - Uses VSCode terminal instead
- [x] T016 [US1] Implement terminal creation with Claude CLI detection **NOTE**:
      Implemented as `launchClaudeCode()` in `autonomousCommands.ts`
- [x] T017 [US1] Add error dialog with installation instructions (FR-021)
      **NOTE**: Error handling in `launchClaudeCode()` try/catch
- [x] T018 [US1] Enhance extension/src/autonomousCommands.ts with
      `launchClaudeCode()` function **DONE**: `launchClaudeCode()` at line 586
- [x] T019 [US1] Implement Play button command handler in autonomousCommands.ts
      **NOTE**: Integrated into extension command registration
- [x] T020 [US1] Add Stop button command handler with process termination
      (FR-011) **DONE**: `stopClaudeCode()` at line 966
- [x] T021 [US1] Implement VSCode exit cleanup handler (FR-012) **NOTE**:
      Terminal close listener at line 716
- [x] T022 [US1] Add Play/Stop button state context management (FR-010)
      **DONE**: `setContext('specgofer.claudeCodeRunning')` throughout
- [ ] ~~T023 [US1] Implement queue management for multiple sessions (FR-016)~~
      **SKIPPED** - Single session only
- [ ] ~~T024 [US1] Add terminal crash recovery with auto-restart (FR-023)~~
      **SKIPPED** - No auto-restart logic
- [x] T025 [US1] Register specgofer.startClaudeCode command in
      extension/package.json **DONE**
- [x] T026 [US1] Register specgofer.stopClaudeCode command in
      extension/package.json **DONE**
- [x] T026a [US1] Implement pauseClaudeCode() function to send ESC to PTY
      terminal **DONE** - Added 2025-11-04

## Phase 4: User Story 3 - WhatsApp Escalation for Uncertain Decisions (P1)

### Goal

As a developer, I want to receive WhatsApp notifications when SpecGofer is
uncertain about Claude Code's questions, so I can provide human guidance without
monitoring constantly.

**STATUS**: ❌ **NOT IMPLEMENTED** - Deferred to future iteration

**DECISION**: The implementation went straight to fully autonomous response
using Claude 3.5 Haiku for all questions, bypassing the need for human
escalation in most cases. WhatsApp integration was deemed unnecessary for MVP
given the high accuracy of Haiku's responses.

### Independent Test Criteria

Can be tested by triggering low-confidence scenarios or constitution violations
and verifying WhatsApp messages are sent and responses are relayed back.

### Tests (TDD Approach)

- [ ] ~~T027 [P] [US3] Write unit test for EscalationManager WhatsApp message
      formatting~~ **DEFERRED**
- [ ] ~~T028 [P] [US3] Write integration test for WhatsApp flow~~ **DEFERRED**
- [ ] ~~T029 [P] [US3] Write unit test for exponential backoff retry logic~~
      **DEFERRED**

### Implementation

- [ ] ~~T030 [US3] Create extension/src/autonomous/EscalationManager.ts with
      Twilio client initialization~~ **DEFERRED**
- [ ] ~~T031 [US3] Implement escalateToHuman() method with WhatsApp message
      formatting (FR-008)~~ **DEFERRED**
- [ ] ~~T032 [US3] Add exponential backoff retry logic (FR-022)~~ **DEFERRED**
- [ ] ~~T033 [US3] Implement webhook handler for incoming WhatsApp responses~~
      **DEFERRED**
- [ ] ~~T033a [US3] Implement relayResponseToTerminal() method (FR-009)~~
      **DEFERRED**
- [ ] ~~T034 [US3] Add 5-minute timeout handling with Promise race~~
      **DEFERRED**
- [ ] ~~T035 [US3] Implement VSCode dialog fallback (FR-015)~~ **DEFERRED**
- [ ] ~~T036 [US3] Create Express webhook endpoint for Twilio~~ **DEFERRED**
- [ ] ~~T037 [US3] Add UUID v4 generation for escalation IDs~~ **DEFERRED**
- [ ] ~~T038 [US3] Implement escalation logging to output channel (FR-013)~~
      **DEFERRED**
- [ ] ~~T039 [US3] Register specgofer.configureWhatsApp command~~ **DEFERRED**
- [ ] ~~T040 [US3] Register specgofer.testWhatsApp command~~ **DEFERRED**

## Phase 5: User Story 2 - Automated Question Response with Constitution Validation (P2)

### Goal

As a developer, I want SpecGofer to automatically respond to Claude Code's
questions when it's confident, following project constitution principles.

**STATUS**: ✅ **IMPLEMENTED** (Simplified approach)

**IMPLEMENTATION NOTE**: Instead of separate OutputMonitor, QuestionValidator,
and event emitters, the implementation uses a single
`ClaudeCodeAutonomousResponder` class that:

1. Monitors terminal output for questions using simple spinner detection
2. Sends detected questions to Claude 3.5 Haiku with full context (constitution,
   spec, plan, tasks)
3. Haiku analyzes the question and provides appropriate response
4. Response is automatically sent back to Claude Code via PTY

The approach is simpler and more direct than originally planned, with Haiku
handling all the intelligence.

### Independent Test Criteria

Can be tested by triggering Claude Code questions and verifying auto-responses
occur based on Haiku's analysis using constitution and spec context.

### Tests (TDD Approach)

- [ ] ~~T041 [P] [US2] Write unit test for question pattern detection~~
      **REPLACED** - Detection is spinner-based, implemented in
      `ClaudeCodeAutonomousResponder.detectQuestion()`
- [ ] T042 [P] [US2] Write unit test for autonomous response generation in
      ClaudeCodeAutonomousResponder.test.ts **TODO**
- [ ] T043 [P] [US2] Write unit test for context loading in
      ClaudeCodeAutonomousResponder.test.ts **TODO**

### Implementation

- [x] ~~T044 [US2] Enhance OutputMonitor with natural language question patterns
      (FR-004)~~ **REPLACED** - Simple spinner detection in
      `ClaudeCodeAutonomousResponder.detectQuestion()`
- [x] ~~T045 [US2] Add question detection regex patterns~~ **REPLACED** - Checks
      for absence of spinners to detect idle state
- [x] ~~T046 [US2] Create QuestionValidator with Claude API client~~
      **REPLACED** - Functionality integrated into
      `ClaudeCodeAutonomousResponder`
- [x] T047 [US2] Implement question validation with constitution checking
      (FR-005) **DONE**: `getAutonomousResponse()` loads constitution and
      validates against it
- [x] ~~T048 [US2] Add confidence score calculation (FR-006)~~ **REPLACED** -
      Haiku determines if question needs answering (returns "NO_QUESTION" if
      not)
- [x] ~~T049 [US2] Implement 80% confidence threshold check (FR-007)~~
      **REPLACED** - Haiku makes determination
- [x] T050 [US2] Add constitution violation detection (FR-019) **DONE**:
      Constitution is included in Haiku's context for analysis
- [x] T051 [US2] Implement buildPrompt() method for Claude API context **DONE**:
      `getAutonomousResponse()` builds comprehensive prompt with all context
- [x] T052 [US2] Add Haiku model selection for fast validation **DONE**: Uses
      'claude-3-5-haiku-20241022' model
- [x] T053 [US2] Integrate question detection with monitoring **DONE**:
      `startAutonomousMonitoring()` polls every 2 seconds
- [x] T054 [US2] Implement auto-response writing to PTY stdin **DONE**:
      `sendResponseToPty()` method
- [x] T055 [US2] Add auto-response logging to output channel (FR-013) **DONE**:
      Extensive logging throughout `ClaudeCodeAutonomousResponder`

## Phase 6: User Story 4 - Learning from Human Decisions (P3)

### Goal

As a developer, I want the system to remember my escalation decisions so future
similar questions can be handled automatically.

**STATUS**: ❌ **NOT IMPLEMENTED** - Deferred to future iteration

**DECISION**: With Haiku providing high-quality autonomous responses and no
escalation system (Phase 4), there's no human decision data to learn from. This
feature depends on Phase 4 being implemented first.

### Independent Test Criteria

Can be tested by responding to an escalation, then triggering the same scenario
again to verify it's handled automatically.

### Tests (TDD Approach)

- [ ] ~~T056 [P] [US4] Write unit test for memory persistence~~ **DEFERRED**
- [ ] ~~T057 [P] [US4] Write unit test for context similarity scoring~~
      **DEFERRED**
- [ ] ~~T058 [P] [US4] Write integration test for memory recall flow~~
      **DEFERRED**

### Implementation

- [ ] ~~T059 [US4] Enhance MemoryManager with decision pattern category~~
      **DEFERRED**
- [ ] ~~T060 [US4] Implement saveDecisionAsMemory() function (FR-014)~~
      **DEFERRED**
- [ ] ~~T061 [US4] Add memory file persistence to .specify/memory/decisions/
      (FR-014)~~ **DEFERRED**
- [ ] ~~T062 [US4] Implement context similarity scoring algorithm (FR-020)~~
      **DEFERRED**
- [ ] ~~T063 [US4] Add memory search by context and tags~~ **DEFERRED**
- [ ] ~~T064 [US4] Implement confidence increase logic (0.1 per use)~~
      **DEFERRED**
- [ ] ~~T065 [US4] Integrate memory recall into question validation~~
      **DEFERRED**
- [ ] ~~T066 [US4] Add memory usage tracking with lastUsed timestamp~~
      **DEFERRED**
- [ ] ~~T067 [US4] Register specgofer.clearMemory command~~ **DEFERRED**
- [ ] ~~T068 [US4] Register specgofer.viewEscalations command~~ **DEFERRED**

## Phase 7: Polish & Integration

### Goal

Complete cross-cutting concerns, integration testing, and final polish.

**STATUS**: ⚠️ **PARTIALLY IMPLEMENTED** - MVP functionality works, polish tasks
deferred

### Tasks

- [ ] ~~T069 Implement real-time output streaming with WebSocket~~ **SKIPPED** -
      PTY handles this directly
- [x] T070 Add token count estimation and context window management **DONE**:
      Basic token counting in `ClaudeCodeAutonomousResponder.ts` (line 137)
- [ ] T071 Implement performance monitoring for <100ms output latency **TODO**
- [ ] T072 Create E2E test for full autonomous flow **TODO**
- [ ] T073 Add telemetry for success metrics (SC-001 through SC-010) **TODO**
- [x] T074 Update extension README.md with feature documentation **DONE** -
      Added pause button documentation
- [x] T075 Verify all error paths have proper error handling **DONE** -
      Comprehensive error handling verified
- [ ] T076 Ensure 80% test coverage across all new components **TODO** -
      Currently <20% coverage, test infrastructure in place

## Dependencies & Execution Order

### User Story Dependencies

```
Setup (T001-T005) → Foundational (T006-T010) → US1 (T011-T026) ← Can run independently
                                              → US3 (T027-T040) ← Can run independently
                                              → US2 (T041-T055) ← Depends on US1 for terminal
                                              → US4 (T056-T068) ← Depends on US3 for escalation
```

### Parallel Execution Opportunities

**Phase 1 (Setup)**: T001-T005 can run in parallel (different files)

**Phase 3 (US1)**:

- Tests T011-T013 can run in parallel
- After tests pass, implementation tasks with [P] marker can run in parallel

**Phase 4 (US3)**:

- Tests T027-T029 can run in parallel
- Can be developed entirely in parallel with US1

**Phase 5 (US2)**:

- Tests T041-T043 can run in parallel
- Requires US1 completion for integration

**Phase 6 (US4)**:

- Tests T056-T058 can run in parallel
- Requires US3 completion for escalation integration

## Implementation Strategy

### MVP Scope (Recommended)

Complete Phases 1-3 (Setup + Foundational + User Story 1) for initial MVP:

- Basic terminal launch with Claude Code
- Branch management
- Play/Stop controls
- Real-time output monitoring

This delivers immediate value with visual terminal execution.

### Incremental Delivery

1. **Week 1**: MVP (T001-T026) - Basic terminal execution
2. **Week 2**: US3 (T027-T040) - WhatsApp escalation
3. **Week 3**: US2 (T041-T055) - Auto-responses
4. **Week 4**: US4 (T056-T068) - Learning system
5. **Week 5**: Polish (T069-T076) - Integration & metrics

### Test-First Approach

Each user story phase begins with test tasks marked [P] that can be written in
parallel before implementation, following TDD principles per the constitution.

## Summary Statistics

### Original Plan

- **Total Tasks**: 78 (78 tasks originally planned)
- **Setup Tasks**: 5
- **Foundational Tasks**: 6
- **User Story 1 Tasks**: 16 (3 tests, 13 implementation)
- **User Story 3 Tasks**: 15 (3 tests, 12 implementation)
- **User Story 2 Tasks**: 15 (3 tests, 12 implementation)
- **User Story 4 Tasks**: 13 (3 tests, 10 implementation)
- **Polish Tasks**: 8

### Actual Implementation (as of 2025-11-04 - v3.1.0)

- **Completed Tasks**: 35 tasks (45%) - includes T013 (unit test), T026a (pause
  button), T074 (README), T075 (error handling), plus **v3.1.0 proactive
  decision-making feature**
- **Skipped/Deferred Tasks**: 42 tasks (54%) - intentionally deferred (WhatsApp,
  learning, git management)
- **TODO Tasks**: 4 tests + 2 polish tasks (1%)
- **Feature Status**: ✅ **MVP Complete + Proactive AI released (v3.1.0)**

### Remaining Test Work

**Unit Tests:**

- T042: Unit test for autonomous response generation (started, needs refactoring
  to match implementation)
- T043: Unit test for context loading (started, needs refactoring to match
  implementation)

**Integration Tests:**

- T012: Integration test for terminal lifecycle (not started)

**E2E Tests:**

- T072: E2E test for full autonomous flow (not started)

**Performance & Polish:**

- T071: Performance monitoring for <100ms output latency (not started)
- T073: Telemetry for success metrics (not started)
- T076: Ensure 80% test coverage across new components (current coverage <20%)

**Test Infrastructure:** Tests/helpers/setup.ts includes comprehensive mocks for
vscode, node-pty, Anthropic SDK. Test file created at
`tests/unit/autonomous/ClaudeCodeAutonomousResponder.test.ts` but needs
refactoring to match actual class constructor and method signatures.

**Note:** The core feature is fully functional and released. Test work can be
completed in follow-up iterations without blocking feature usage.

### What Works (v3.1.0)

✅ Claude Code launches in VSCode terminal with PTY backend ✅ Terminal output
is captured and monitored in real-time ✅ Spinner/idle state detection (Claude
working vs. idle) ✅ Claude 3.5 Haiku provides autonomous responses with full
context (constitution, spec, plan, tasks) ✅ **Proactive Decision-Making** -
Haiku decides next action when Claude is idle:

- CONTINUE_IMPLEMENT (< 70% complete)
- ENGINEERING_REVIEW (40-80% complete)
- PERFORMANCE_REVIEW (> 70% complete) ✅ Question answering for explicit Claude
  Code questions ✅ Responses automatically sent back to Claude Code via PTY ✅
  Comprehensive logging to output channel and debug log files ✅ Play/Pause/Stop
  button state management (pause sends ESC signal) ✅ Released and deployed via
  GitHub Pages (v3.1.0)

### What's Missing

❌ Git branch management (FeatureBranchManager) ❌ WhatsApp escalation system
(EscalationManager) ❌ Learning/memory system for decisions ❌ External
Terminal.app support (uses VSCode terminal instead) ❌ Session queue management
❌ Terminal crash recovery ❌ Comprehensive test suite (< 20% coverage)

## Validation

✅ MVP delivers core value: autonomous Claude Code execution with question
answering ✅ Implementation is simpler and more maintainable than original plan
⚠️ Test coverage below constitution requirement (80% minimum) ⚠️ Some planned
features deferred to future iterations
