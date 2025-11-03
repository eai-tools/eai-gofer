# Task Breakdown: Claude Code Terminal Integration

**Feature**: Claude Code Terminal Integration **Branch**:
`001-claude-terminal-integration` **Generated**: 2025-11-03

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

- [x] T006 Create extension/src/autonomous/FeatureBranchManager.ts with git
      operations (checkout, stash, restore)
- [x] T007 Implement prepareFeatureBranch() method in FeatureBranchManager.ts
      for branch checkout with stash handling (FR-001, FR-017)
- [x] T008 Create extension/src/autonomous/TerminalManager.ts base class with
      session tracking Map
- [x] T009 Implement circular buffer logic for terminal output in
      TerminalManager.ts (10,000 line limit) (FR-018)
- [x] T009a Implement real-time output monitoring with data event handlers in
      TerminalManager.ts (FR-003)
- [x] T010 Create VS Code output channel "SpecGofer Autonomous" in
      extension/src/extension.ts

## Phase 3: User Story 1 - Basic Claude Code Execution with Visual Monitoring (P1)

### Goal

As a developer, I want to click a Play button next to a specification to launch
Claude Code in an external terminal where I can watch it implement the feature
in real-time.

### Independent Test Criteria

Can be fully tested by clicking Play button and verifying Claude Code launches
in external Terminal with the correct spec context and feature branch checked
out.

### Tests (TDD Approach)

- [ ] T011 [P] [US1] Write unit test for FeatureBranchManager checkout logic in
      tests/unit/FeatureBranchManager.test.ts
- [ ] T012 [P] [US1] Write integration test for terminal lifecycle in
      tests/integration/TerminalLifecycle.test.ts
- [ ] T013 [P] [US1] Write unit test for Play/Stop button state management in
      tests/unit/autonomousCommands.test.ts

### Implementation

- [x] T014 [US1] Implement node-pty integration in TerminalManager.ts with
      spawn() method (FR-002)
- [x] T015 [US1] Add macOS Terminal.app detection and path resolution in
      TerminalManager.ts
- [x] T016 [US1] Implement createTerminal() method with Claude CLI detection in
      TerminalManager.ts
- [x] T017 [US1] Add error dialog with installation instructions (FR-021) in
      TerminalManager.ts
- [x] T018 [US1] Enhance extension/src/autonomousCommands.ts with
      launchClaudeCodeTerminal() function
- [x] T019 [US1] Implement Play button command handler in autonomousCommands.ts
- [x] T020 [US1] Add Stop button command handler with process termination in
      autonomousCommands.ts (FR-011)
- [x] T021 [US1] Implement VSCode exit cleanup handler in extension.ts (FR-012)
- [x] T022 [US1] Add Play/Stop button state context management in
      autonomousCommands.ts (FR-010)
- [x] T023 [US1] Implement queue management for multiple sessions in
      TerminalManager.ts (FR-016)
- [x] T024 [US1] Add terminal crash recovery with auto-restart in
      TerminalManager.ts (FR-023)
- [x] T025 [US1] Register specgofer.startClaudeCode command in
      extension/package.json
- [x] T026 [US1] Register specgofer.stopClaudeCode command in
      extension/package.json

## Phase 4: User Story 3 - WhatsApp Escalation for Uncertain Decisions (P1)

### Goal

As a developer, I want to receive WhatsApp notifications when SpecGofer is
uncertain about Claude Code's questions, so I can provide human guidance without
monitoring constantly.

### Independent Test Criteria

Can be tested by triggering low-confidence scenarios or constitution violations
and verifying WhatsApp messages are sent and responses are relayed back.

### Tests (TDD Approach)

- [ ] T027 [P] [US3] Write unit test for EscalationManager WhatsApp message
      formatting in tests/unit/EscalationManager.test.ts
- [ ] T028 [P] [US3] Write integration test for WhatsApp flow in
      tests/integration/WhatsAppFlow.test.ts
- [ ] T029 [P] [US3] Write unit test for exponential backoff retry logic in
      tests/unit/EscalationManager.test.ts

### Implementation

- [ ] T030 [US3] Create extension/src/autonomous/EscalationManager.ts with
      Twilio client initialization
- [ ] T031 [US3] Implement escalateToHuman() method with WhatsApp message
      formatting in EscalationManager.ts (FR-008)
- [ ] T032 [US3] Add exponential backoff retry logic (FR-022) in
      EscalationManager.ts
- [ ] T033 [US3] Implement webhook handler for incoming WhatsApp responses in
      EscalationManager.ts
- [ ] T033a [US3] Implement relayResponseToTerminal() method to send human
      WhatsApp responses back to Claude Code (FR-009)
- [ ] T034 [US3] Add 5-minute timeout handling with Promise race in
      EscalationManager.ts
- [ ] T035 [US3] Implement VSCode dialog fallback (FR-015) in
      EscalationManager.ts
- [ ] T036 [US3] Create Express webhook endpoint for Twilio in
      extension/src/webhookServer.ts
- [ ] T037 [US3] Add UUID v4 generation for escalation IDs in
      EscalationManager.ts
- [ ] T038 [US3] Implement escalation logging to output channel (FR-013) in
      EscalationManager.ts
- [ ] T039 [US3] Register specgofer.configureWhatsApp command in
      extension/package.json
- [ ] T040 [US3] Register specgofer.testWhatsApp command in
      extension/package.json

## Phase 5: User Story 2 - Automated Question Response with Constitution Validation (P2)

### Goal

As a developer, I want SpecGofer to automatically respond to Claude Code's
questions when it's confident, following project constitution principles.

### Independent Test Criteria

Can be tested by triggering Claude Code questions and verifying auto-responses
occur when confidence is above 80% and align with constitution.

### Tests (TDD Approach)

- [ ] T041 [P] [US2] Write unit test for question pattern detection in
      tests/unit/OutputMonitor.test.ts
- [ ] T042 [P] [US2] Write unit test for confidence calculation in
      tests/unit/QuestionValidator.test.ts
- [ ] T043 [P] [US2] Write unit test for constitution validation in
      tests/unit/QuestionValidator.test.ts

### Implementation

- [ ] T044 [US2] Enhance extension/src/autonomous/OutputMonitor.ts with natural
      language question patterns (FR-004)
- [ ] T045 [US2] Add question detection regex patterns for "Would you like...",
      "Should I..." in OutputMonitor.ts (FR-004)
- [ ] T046 [US2] Create extension/src/autonomous/QuestionValidator.ts with
      Claude API client
- [ ] T047 [US2] Implement validateQuestion() method with constitution checking
      in QuestionValidator.ts (FR-005)
- [ ] T048 [US2] Add confidence score calculation (FR-006) in
      QuestionValidator.ts
- [ ] T049 [US2] Implement 80% confidence threshold check (FR-007) in
      QuestionValidator.ts
- [ ] T050 [US2] Add constitution violation detection (FR-019) in
      QuestionValidator.ts
- [ ] T051 [US2] Implement buildPrompt() method for Claude API context in
      QuestionValidator.ts
- [ ] T052 [US2] Add Haiku model selection for fast validation in
      QuestionValidator.ts
- [ ] T053 [US2] Integrate QuestionValidator with OutputMonitor event emitter in
      autonomousCommands.ts
- [ ] T054 [US2] Implement auto-response writing to PTY stdin in
      autonomousCommands.ts
- [ ] T055 [US2] Add auto-response logging to output channel (FR-013) in
      autonomousCommands.ts

## Phase 6: User Story 4 - Learning from Human Decisions (P3)

### Goal

As a developer, I want the system to remember my escalation decisions so future
similar questions can be handled automatically.

### Independent Test Criteria

Can be tested by responding to an escalation, then triggering the same scenario
again to verify it's handled automatically.

### Tests (TDD Approach)

- [ ] T056 [P] [US4] Write unit test for memory persistence in
      tests/unit/MemoryManager.test.ts
- [ ] T057 [P] [US4] Write unit test for context similarity scoring in
      tests/unit/MemoryManager.test.ts
- [ ] T058 [P] [US4] Write integration test for memory recall flow in
      tests/integration/MemoryRecall.test.ts

### Implementation

- [ ] T059 [US4] Enhance extension/src/autonomous/MemoryManager.ts with decision
      pattern category
- [ ] T060 [US4] Implement saveDecisionAsMemory() function in MemoryManager.ts
      (FR-014)
- [ ] T061 [US4] Add memory file persistence to .specify/memory/decisions/ in
      MemoryManager.ts (FR-014)
- [ ] T062 [US4] Implement context similarity scoring algorithm (FR-020) in
      MemoryManager.ts
- [ ] T063 [US4] Add memory search by context and tags in MemoryManager.ts
- [ ] T064 [US4] Implement confidence increase logic (0.1 per use) in
      MemoryManager.ts
- [ ] T065 [US4] Integrate memory recall into
      QuestionValidator.validateQuestion() method
- [ ] T066 [US4] Add memory usage tracking with lastUsed timestamp in
      MemoryManager.ts
- [ ] T067 [US4] Register specgofer.clearMemory command in
      extension/package.json
- [ ] T068 [US4] Register specgofer.viewEscalations command in
      extension/package.json

## Phase 7: Polish & Integration

### Goal

Complete cross-cutting concerns, integration testing, and final polish.

### Tasks

- [ ] T069 Implement real-time output streaming with WebSocket in
      extension/src/autonomous/outputStreamer.ts
- [ ] T070 Add token count estimation and context window management in
      TerminalManager.ts
- [ ] T071 Implement performance monitoring for <100ms output latency in
      OutputMonitor.ts
- [ ] T072 Create E2E test for full autonomous flow in
      tests/e2e/FullAutonomousFlow.spec.ts
- [ ] T073 Add telemetry for success metrics (SC-001 through SC-010) in
      extension/src/telemetry.ts
- [ ] T074 Update extension README.md with feature documentation
- [ ] T075 Verify all error paths have proper error handling and user feedback
- [ ] T076 Ensure 80% test coverage across all new components

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

- **Total Tasks**: 78
- **Setup Tasks**: 5
- **Foundational Tasks**: 6
- **User Story 1 Tasks**: 16 (3 tests, 13 implementation)
- **User Story 3 Tasks**: 15 (3 tests, 12 implementation)
- **User Story 2 Tasks**: 15 (3 tests, 12 implementation)
- **User Story 4 Tasks**: 13 (3 tests, 10 implementation)
- **Polish Tasks**: 8
- **Parallel Opportunities**: 28 tasks marked with [P]

## Validation

✅ All tasks follow required checklist format:
`- [ ] T### [P] [US#] Description with file path` ✅ Each user story is
independently testable ✅ Dependencies clearly defined ✅ MVP delivers value
immediately
