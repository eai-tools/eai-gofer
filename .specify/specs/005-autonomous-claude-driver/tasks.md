# Task Breakdown: Autonomous Claude Code Driver

**Feature ID**: 005 **Feature Name**: Autonomous Claude Code Driver **Status**:
Ready for Implementation **Estimated Duration**: 20-23 days

## Overview

This task list implements the Autonomous Claude Code Driver that enables
SpecGofer to autonomously drive Claude Code terminals, monitor execution, handle
errors, manage context windows, and escalate questions to users.

**Approach**: Test-Driven Development (TDD) - Tests written before
implementation

## User Stories (from spec.md)

### US1: Primary User Flow - Basic Autonomous Execution

**Priority**: P1 (MVP) **Goal**: User clicks button → SpecGofer spawns terminal
→ Monitors execution → Reports completion **Independent Test**: Complete
autonomous run on sample 5-task spec with no errors

### US2: Engineer + Tester Parallel Execution

**Priority**: P2 **Goal**: Run two terminals in parallel with task handoff
coordination **Independent Test**: Parallel execution with intentional test
failure → Engineer fixes → Success

### US3: Context Window Management

**Priority**: P2 **Goal**: Detect token limits and spawn fresh terminal with
context summary **Independent Test**: Force context limit → Verify seamless
continuation in new terminal

---

## Phase 1: Setup & Project Initialization

**Goal**: Initialize project structure, dependencies, and testing infrastructure

- [x] T001 Create autonomous/ module directory structure in extension/src/
- [x] T002 Add TypeScript types for all data models in
      extension/src/autonomous/types.ts
- [x] T003 Install chokidar dependency for file watching (already in
      package.json)
- [x] T004 Create test fixtures directory tests/fixtures/autonomous/
- [x] T005 [P] Create sample terminal outputs for testing in
      tests/fixtures/autonomous/sample-outputs/
- [x] T006 [P] Setup Vitest test configuration for autonomous module in
      vitest.config.ts
- [x] T007 Create .specify/state/ directory structure for session persistence
- [x] T008 [P] Add autonomous settings schema to extension/package.json

---

## Phase 2: Foundational - Core Infrastructure

**Goal**: Build terminal management and output monitoring (blocks all user
stories)

### Terminal Management

- [x] T009 Write unit tests for TerminalManager.createTerminal() in
      tests/unit/autonomous/TerminalManager.test.ts
- [x] T010 Implement TerminalManager.createTerminal() in
      extension/src/autonomous/TerminalManager.ts
- [x] T011 Write unit tests for TerminalManager.sendCommand()
- [x] T012 Implement TerminalManager.sendCommand() with command queueing
- [x] T013 Write unit tests for TerminalManager.captureOutput() stream
- [x] T014 Implement TerminalManager.captureOutput() using
      vscode.window.onDidWriteTerminalData
- [x] T015 [P] Write unit tests for TerminalManager.closeTerminal()
- [x] T016 [P] Implement TerminalManager.closeTerminal() with cleanup
- [x] T017 Write unit tests for TerminalManager.isAlive() health check
- [x] T018 Implement TerminalManager.isAlive() with PID validation
- [x] T019 Write unit tests for TerminalManager.restartTerminal() recovery
- [x] T020 Implement TerminalManager.restartTerminal() with state restoration

### Output Monitoring & Parsing

- [x] T021 Write unit tests for OutputMonitor.parseStream() in
      tests/unit/autonomous/OutputMonitor.test.ts
- [x] T022 Implement OutputMonitor.parseStream() with circular buffer
- [x] T023 Write unit tests for OutputMonitor.detectTaskCompletion() with sample
      outputs
- [x] T024 Implement OutputMonitor.detectTaskCompletion() regex patterns
- [x] T025 Write unit tests for OutputMonitor.detectError() with various error
      types
- [x] T026 Implement OutputMonitor.detectError() with error classification
- [x] T027 Write unit tests for OutputMonitor.detectQuestion() with confidence
      scoring
- [x] T028 Implement OutputMonitor.detectQuestion() with pattern matching
- [x] T029 [P] Write unit tests for OutputMonitor.detectContextWarning()
- [x] T030 [P] Implement OutputMonitor.detectContextWarning() for token limit
      detection

### Integration Tests - Core Infrastructure

- [x] T031 Integration test: Spawn terminal → Send command → Capture output
- [x] T032 Integration test: Terminal crash → Auto-restart → Resume capture
- [x] T033 Integration test: Parse real Claude output → Detect all event types

---

## Phase 3: User Story 1 - Basic Autonomous Execution (MVP)

**Goal**: Complete end-to-end autonomous execution with error recovery
**Independent Test**: Run on sample spec with 5 tasks, verify all complete with
UI updates

### Error Recovery Module [US1]

- [x] T034 [US1] Write unit tests for ErrorRecovery.detectError() in
      tests/unit/autonomous/ErrorRecovery.test.ts
- [x] T035 [US1] Implement ErrorRecovery.detectError() within 5s latency
      requirement
- [x] T036 [US1] Write unit tests for ErrorRecovery.categorizeError()
- [x] T037 [US1] Implement ErrorRecovery.categorizeError()
      (recoverable/needs_context/fatal)
- [x] T038 [US1] Write unit tests for ErrorRecovery.retryWithStrategy() 3-level
      retry
- [x] T039 [US1] Implement ErrorRecovery.retryWithStrategy() with exponential
      backoff
- [x] T040 [P] [US1] Write unit tests for ErrorRecovery.escalateToUser()
- [x] T041 [P] [US1] Implement ErrorRecovery.escalateToUser() with notification
      routing

### Progress Tracking & State Persistence [US1]

- [x] T042 [US1] Write unit tests for ProgressReporter.updateTaskStatus() in
      tests/unit/autonomous/ProgressReporter.test.ts
- [x] T043 [US1] Implement ProgressReporter.updateTaskStatus() calling
      ProgressProvider
- [x] T044 [US1] Write unit tests for ProgressReporter.updateTasksFile()
      checkbox marking
- [x] T045 [US1] Implement ProgressReporter.updateTasksFile() atomic write
- [x] T046 [US1] Write unit tests for ProgressReporter.saveSession() state
      persistence
- [x] T047 [US1] Implement ProgressReporter.saveSession() with atomic writes
- [x] T048 [P] [US1] Write unit tests for ProgressReporter.resumeSession() from
      disk
- [x] T049 [P] [US1] Implement ProgressReporter.resumeSession() with validation
- [x] T050 [US1] Write unit tests for ProgressReporter.updateStatusBar()
- [x] T051 [US1] Implement ProgressReporter.updateStatusBar() with live metrics

### Main Orchestrator [US1]

- [x] T052 [US1] Write unit tests for AutonomousDriver.start() in
      tests/unit/autonomous/AutonomousDriver.test.ts
- [x] T053 [US1] Implement AutonomousDriver.start() orchestrating all modules
- [x] T054 [US1] Write unit tests for AutonomousDriver.stop() graceful shutdown
- [x] T055 [US1] Implement AutonomousDriver.stop() with cleanup
- [x] T056 [P] [US1] Write unit tests for AutonomousDriver.pause() mid-execution
- [x] T057 [P] [US1] Implement AutonomousDriver.pause() with state save
- [x] T058 [P] [US1] Write unit tests for AutonomousDriver.resume() from pause
- [x] T059 [P] [US1] Implement AutonomousDriver.resume() with state load
- [x] T060 [US1] Write unit tests for AutonomousDriver event hooks (onProgress,
      onError, onComplete)
- [x] T061 [US1] Implement AutonomousDriver event hook system

### VSCode Integration [US1]

- [x] T062 [US1] Add "▶️ Start Autonomous Implementation" button to
      ProgressProvider tree items
- [x] T063 [US1] Register specGofer.startAutonomous command in
      extension/src/extension.ts
- [x] T064 [US1] Implement specGofer.startAutonomous command handler
- [x] T065 [P] [US1] Add specGofer.autonomous.showTerminals setting to
      package.json
- [x] T066 [P] [US1] Add specGofer.autonomous.notificationChannel setting to
      package.json
- [x] T067 [US1] Create "SpecGofer Autonomous" output channel for logging
- [x] T068 [US1] Implement structured JSON logging to
      .specify/logs/autonomous-{date}.log

### Integration & E2E Tests [US1]

- [x] T069 [US1] Create sample spec 001-test-feature with 5 simple tasks
- [x] T070 [US1] E2E test: Full autonomous run on 001-test-feature → All tasks
      complete
- [x] T071 [US1] E2E test: Syntax error → Retry 3 times → Escalate to user
- [x] T072 [US1] E2E test: User pause → Resume → Continue from same task
- [x] T073 [US1] E2E test: VSCode restart → Auto-resume session

---

## Phase 4: User Story 2 - Parallel Engineer + Tester Execution

**Goal**: Run two terminals with task handoff coordination **Independent Test**:
Parallel run with intentional test failure → Fix → Success

### Parallel Coordinator Module [US2]

- [ ] T074 [US2] Write unit tests for ParallelCoordinator.spawnAgents() in
      tests/unit/autonomous/ParallelCoordinator.test.ts
- [ ] T075 [US2] Implement ParallelCoordinator.spawnAgents() (Engineer + Tester
      terminals)
- [ ] T076 [US2] Write unit tests for ParallelCoordinator.coordinateHandoff()
- [ ] T077 [US2] Implement ParallelCoordinator.coordinateHandoff() via file
      watching
- [ ] T078 [US2] Write unit tests for ParallelCoordinator.detectRaceCondition()
- [ ] T079 [US2] Implement ParallelCoordinator.detectRaceCondition() file lock
      checking
- [ ] T080 [P] [US2] Write unit tests for ParallelCoordinator.aggregateLogs()
- [ ] T081 [P] [US2] Implement ParallelCoordinator.aggregateLogs() from both
      terminals
- [ ] T082 [US2] Write unit tests for ParallelCoordinator.showDualStatus()
- [ ] T083 [US2] Implement ParallelCoordinator.showDualStatus() in sidebar

### Integration Tests [US2]

- [ ] T084 [US2] Integration test: Spawn Engineer + Tester → Verify both alive
- [ ] T085 [US2] Integration test: Engineer completes task → Tester receives
      notification
- [ ] T086 [US2] Integration test: Tester fails test → Engineer receives
      feedback
- [ ] T087 [US2] E2E test: Full parallel run with intentional test failure →
      Auto-fix → Success

### VSCode Integration [US2]

- [ ] T088 [P] [US2] Add specGofer.autonomous.enableParallelTester setting to
      package.json
- [ ] T089 [P] [US2] Update AutonomousDriver.start() to check parallel setting
- [ ] T090 [US2] Update sidebar to show dual agent status when parallel enabled

---

## Phase 5: User Story 3 - Context Window Management

**Goal**: Detect token limits and spawn fresh terminal seamlessly **Independent
Test**: Force 180K token limit → Verify new terminal with summary

### Context Manager Module [US3]

- [ ] T091 [US3] Write unit tests for ContextManager.estimateTokens() in
      tests/unit/autonomous/ContextManager.test.ts
- [ ] T092 [US3] Implement ContextManager.estimateTokens() using chars / 3.5
- [ ] T093 [US3] Write unit tests for ContextManager.trackConversation()
- [ ] T094 [US3] Implement ContextManager.trackConversation() cumulative
      counting
- [ ] T095 [US3] Write unit tests for ContextManager.shouldSwitchContext()
      threshold checks
- [ ] T096 [US3] Implement ContextManager.shouldSwitchContext() (160K warn, 180K
      act)
- [ ] T097 [US3] Write unit tests for ContextManager.generateSummary()
- [ ] T098 [US3] Implement ContextManager.generateSummary() with completed
      tasks + decisions
- [ ] T099 [P] [US3] Write unit tests for ContextManager.spawnFreshTerminal()
- [ ] T100 [P] [US3] Implement ContextManager.spawnFreshTerminal() with summary
      prompt

### Integration Tests [US3]

- [ ] T101 [US3] Integration test: Simulate 180K tokens → Trigger context switch
- [ ] T102 [US3] Integration test: Verify summary contains all key info
- [ ] T103 [US3] E2E test: Force context limit → New terminal → Seamless
      continuation

---

## Phase 6: Question Routing & Notifications

**Goal**: Detect questions and route to user via configured channel
**Independent Test**: Question detected → WhatsApp/VSCode notification →
Response → Resume

### Question Router Module

- [ ] T104 Write unit tests for QuestionRouter.detectQuestion() in
      tests/unit/autonomous/QuestionRouter.test.ts
- [ ] T105 Implement QuestionRouter.detectQuestion() with regex patterns
- [ ] T106 Write unit tests for QuestionRouter.scoreConfidence()
- [ ] T107 Implement QuestionRouter.scoreConfidence() (high/medium/low)
- [ ] T108 Write unit tests for QuestionRouter.extractOptions()
- [ ] T109 Implement QuestionRouter.extractOptions() parsing
- [ ] T110 [P] Write unit tests for QuestionRouter.routeToChannel()
- [ ] T111 [P] Implement QuestionRouter.routeToChannel() (VSCode/WhatsApp/Email)
- [ ] T112 Write unit tests for QuestionRouter.waitForResponse() with 4hr
      timeout
- [ ] T113 Implement QuestionRouter.waitForResponse() async waiting
- [ ] T114 [P] Write unit tests for QuestionRouter.sendToTerminal()
- [ ] T115 [P] Implement QuestionRouter.sendToTerminal() response injection

### Integration Tests

- [ ] T116 Integration test: Question detected → VSCode notification shown
- [ ] T117 Integration test: User responds → Answer sent to terminal
- [ ] T118 Integration test: 4hr timeout → Auto-pause session
- [ ] T119 E2E test: Question → WhatsApp notification (mock) → Response → Resume

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Final validation, documentation, and production readiness

### Performance Optimization

- [ ] T120 [P] Profile TerminalManager.captureOutput() → Optimize to <50ms per
      chunk
- [ ] T121 [P] Profile ErrorRecovery.detectError() → Optimize to <5s latency
- [ ] T122 [P] Memory profiling → Verify <200MB for 10K line buffer
- [ ] T123 Benchmark token counting accuracy → Compare chars/3.5 vs actual

### Security & Validation

- [ ] T124 Audit all logging → Ensure no secrets in output
- [ ] T125 Implement output sanitization before external notifications
- [ ] T126 [P] Add user confirmation dialog before first autonomous run
- [ ] T127 [P] Implement rate limiting for WhatsApp (1 msg / 5 min)

### Documentation

- [ ] T128 [P] Update extension/README.md with autonomous mode section
- [ ] T129 [P] Add architecture diagram to docs/ folder
- [ ] T130 [P] Create troubleshooting guide for common errors
- [ ] T131 [P] Update CHANGELOG.md with new features

### Final Integration Tests

- [ ] T132 E2E test: Complete run on medium spec (20 tasks) → Success
- [ ] T133 E2E test: Test on Windows platform → Verify compatibility
- [ ] T134 E2E test: Test on macOS platform → Verify compatibility
- [ ] T135 E2E test: Test on Linux platform → Verify compatibility

### Code Quality

- [ ] T136 Run ESLint → Fix all warnings
- [ ] T137 Verify TypeScript strict mode compliance → No `any` types
- [ ] T138 Run test coverage report → Verify >80% coverage
- [ ] T139 Constitution compliance check → Validate against all 7 principles
- [ ] T140 Final code review → Address feedback

---

## Dependencies

### Story Completion Order

```
Setup (Phase 1)
  ↓
Foundational (Phase 2)
  ↓
US1: Basic Autonomous ← MVP (MUST COMPLETE FIRST)
  ↓
US2: Parallel Execution (depends on US1)
US3: Context Management (depends on US1)
  ↓
Question Routing (depends on US1)
  ↓
Polish & Cross-Cutting
```

### Task Dependencies (Key Blocking Tasks)

- T009-T033 (Foundational): Block all user story tasks
- T052-T061 (AutonomousDriver): Block US2, US3
- T074-T083 (ParallelCoordinator): Only needed for US2
- T091-T100 (ContextManager): Only needed for US3
- T104-T115 (QuestionRouter): Can be built in parallel with US2/US3

---

## Parallel Execution Opportunities

### Phase 2 (Foundational)

```
T015-T016 (closeTerminal) [P] || T017-T018 (isAlive) [P]
T029-T030 (detectContextWarning) [P] || T025-T026 (detectError)
```

### Phase 3 (US1)

```
T040-T041 (escalateToUser) [P] || T048-T049 (resumeSession) [P]
T056-T059 (pause/resume) [P] || T065-T066 (settings) [P]
```

### Phase 4 (US2)

```
T080-T081 (aggregateLogs) [P] || T082-T083 (showDualStatus)
T088-T089 (settings) [P] || T090 (sidebar update)
```

### Phase 5 (US3)

```
T099-T100 (spawnFreshTerminal) [P] || T095-T096 (shouldSwitchContext)
```

### Phase 7 (Polish)

```
All documentation tasks [P] (T128-T131)
All platform tests [P] (T133-T135)
```

---

## Implementation Strategy

### MVP Scope (US1 Only)

**Minimum Viable Product** = Phase 1 + Phase 2 + Phase 3 (Tasks T001-T073)

This delivers:

- ✅ Button to start autonomous execution
- ✅ Terminal spawning and monitoring
- ✅ Error detection and 3-retry recovery
- ✅ Progress tracking in sidebar
- ✅ Session persistence and resume
- ✅ E2E validation on sample spec

**Estimated Time**: 10-12 days

### Incremental Delivery

1. **Week 1**: T001-T033 (Setup + Foundational)
2. **Week 2**: T034-T068 (US1 Core Implementation)
3. **Week 3**: T069-T073 (US1 E2E Testing) + T074-T090 (US2 Parallel)
4. **Week 4**: T091-T119 (US3 Context + Question Routing) + T120-T140 (Polish)

### Success Criteria

**Before Phase 3 Completion (MVP)**:

- ✅ All unit tests pass (80%+ coverage)
- ✅ E2E test on 5-task spec succeeds
- ✅ UI button functional
- ✅ Session resumes after restart

**Before Final Release**:

- ✅ All 7 acceptance criteria from spec.md pass
- ✅ Parallel mode tested
- ✅ Context switching tested
- ✅ Cross-platform validated (Windows/macOS/Linux)
- ✅ Performance meets NFR-001 (<500ms operations)

---

## Task Summary

- **Total Tasks**: 140
- **Setup Phase**: 8 tasks
- **Foundational Phase**: 25 tasks (T009-T033)
- **US1 (MVP)**: 41 tasks (T034-T073)
- **US2 (Parallel)**: 17 tasks (T074-T090)
- **US3 (Context)**: 13 tasks (T091-T103)
- **Question Routing**: 16 tasks (T104-T119)
- **Polish**: 21 tasks (T120-T140)

**Parallel Opportunities**: 32 tasks marked [P] can run concurrently

---

## Format Validation

✅ All 140 tasks follow checklist format:
`- [ ] [TaskID] [P?] [Story?] Description with file path` ✅ All user story
tasks labeled [US1], [US2], [US3] ✅ All parallelizable tasks marked [P] ✅ File
paths specified where applicable ✅ Dependencies clearly documented

---

**Ready for Implementation**: Run `/speckit.implement` or click "▶️ Start
Autonomous Implementation" (once built!)
