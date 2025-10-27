# Implementation Tasks: Autonomous Specification Execution System

**Feature**: 003-orchestrator-agents
**Date**: 2025-10-27
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Project Setup (6 tasks)

**Purpose**: Initialize project structure, dependencies, and configuration files

- [X] T001 Initialize package.json with dependencies in src/orchestrator/ (@anthropic-ai/sdk@0.67.0+, chokidar@3.5.0+, whatsapp-web.js@1.23.0+, winston@3.11.0+)
- [X] T002 Configure TypeScript with strict mode in tsconfig.json (noImplicitAny: true, strictNullChecks: true, target: ES2022, module: NodeNext)
- [X] T003 Configure Vitest in vitest.config.ts (coverage provider: c8, thresholds: 80% all metrics, test match: **/*.test.ts)
- [X] T004 Configure Playwright in playwright.config.ts (baseURL from env, timeout: 30s, retries: 2, screenshot on failure)
- [X] T005 Create src/types/ directory with shared TypeScript interfaces (Task, Spec, ValidationResult, NotificationMessage per data-model.md)
- [X] T006 Create .specify/.orchestrator.log and .specify/.notifications.log placeholder files with .gitignore entries

---

## Phase 2: Foundational Infrastructure (10 tasks)

**Purpose**: Build blocking prerequisites needed by all user stories (logging, Claude API, file utilities)

- [X] T007 [P] Unit test for Winston logger configuration in tests/unit/utils/Logger.test.ts (verify JSON format, log levels, file rotation)
- [X] T008 Implement Winston logger in src/utils/Logger.ts with structured logging (event types, context, timestamps per logging-api.md)
- [X] T009 [P] Unit test for Claude API rate limiting in tests/unit/utils/ClaudeClient.test.ts (mock @anthropic-ai/sdk, verify p-limit with 60 req/min)
- [X] T010 Implement Claude API client in src/utils/ClaudeClient.ts with rate limiting, cost tracking, retry on 429 (per claude-api.md)
- [X] T011 [P] Unit test for file system utilities in tests/unit/utils/FileUtils.test.ts (mock fs/promises, test atomic writes, mtime tracking)
- [X] T011a [P] Unit test for file conflict detection in tests/unit/utils/FileUtils.test.ts (simulate mtime change between read and write, verify WARNING log with conflict details per FR-017)
- [X] T012 Implement atomic file write utilities in src/utils/FileUtils.ts (write to temp, then rename; track mtime per file-protocol.md)
- [X] T013 [P] Unit test for WhatsApp client initialization in tests/unit/utils/WhatsAppClient.test.ts (mock whatsapp-web.js, verify session persistence)
- [X] T014 Implement WhatsApp client wrapper in src/utils/WhatsAppClient.ts with LocalAuth, reconnection handling (per notification-api.md)
- [X] T015 [P] Integration test for logger + file rotation in tests/integration/logging-flow.test.ts (real files in temp dir, verify rotation at 10MB)
- [X] T016 [P] Integration test for Claude API with sandbox key in tests/integration/claude-api-flow.test.ts (real API call, verify response parsing)
- [X] T016a [P] Performance test for Chokidar file change detection in tests/integration/file-change-performance.test.ts (write file, measure time until watcher callback, verify <300ms per SC-006)
- [X] T016b [P] Performance test for orchestrator startup time in tests/integration/orchestrator-startup-performance.test.ts (50 test spec fixtures, measure loadAllSpecs() + buildQueue() time, verify <2s per SC-010)

---

## Phase 3: User Story 1 - Autonomous Task Execution (P1) (15 tasks)

**Purpose**: System automatically reads specifications and executes tasks without human intervention

### Tests First (TDD)

- [X] T017 [P] [US1] Unit test for SpecLoader.loadAllSpecs() in tests/unit/orchestrator/SpecLoader.test.ts (mock fs operations, verify GitHub Spec Kit parsing)
- [X] T017a [P] [US1] Unit test for scale limit warnings in tests/unit/orchestrator/SpecLoader.test.ts (mock 51 specs and 101 tasks, verify WARNING logs per FR-018)
- [X] T018 [P] [US1] Unit test for SpecLoader.parseSpec() in tests/unit/orchestrator/SpecLoader.test.ts (test YAML frontmatter + markdown, error handling)
- [X] T019 [P] [US1] Unit test for TaskQueue.buildQueue() in tests/unit/orchestrator/TaskQueue.test.ts (test dependency resolution, topological sort)
- [X] T020 [P] [US1] Integration test for spec loading pipeline in tests/integration/spec-loading-flow.test.ts (real .specify/specs/ directory with fixtures)
- [X] T021 [P] [US1] E2E test for autonomous task execution in tests/e2e/autonomous-execution.test.ts (Playwright: start orchestrator, verify task completion)

### Implementation

- [X] T022 [US1] Implement SpecLoader.loadAllSpecs() in src/orchestrator/SpecLoader.ts with spec discovery, caching, scale limit warnings (>50 specs)
- [X] T023 [US1] Implement SpecLoader.parseSpec() in src/orchestrator/SpecLoader.ts using gray-matter for YAML parsing, task extraction
- [X] T024 [US1] Implement SpecLoader.updateTaskStatus() in src/orchestrator/SpecLoader.ts with atomic writes, mtime conflict detection (per R2 research)
- [X] T025 [US1] Implement TaskQueue class in src/orchestrator/TaskQueue.ts with buildQueue() for dependency resolution (topological sort, circular detection)
- [X] T026 [US1] Implement TaskQueue.getNextTask() in src/orchestrator/TaskQueue.ts (check dependencies, filter by status: pending, warn if >100 tasks)
- [X] T027 [US1] Implement AutonomousOrchestrator class in src/orchestrator/AutonomousOrchestrator.ts with start(), stop(), main execution loop
- [X] T028 [US1] Implement AutonomousOrchestrator.executeTask() in src/orchestrator/AutonomousOrchestrator.ts (delegate to agents, handle status updates)
- [X] T029 [US1] Implement Chokidar file watching in src/interceptor/ClaudeCodeInterceptor.ts (watch .claude-output.txt, .claude-question.txt with 300ms debounce)
- [X] T030 [US1] Implement ClaudeCodeInterceptor.sendPrompt() in src/interceptor/ClaudeCodeInterceptor.ts (write .claude-input.txt atomically, log event)
- [X] T031 [US1] Implement ClaudeCodeInterceptor.waitForResponse() in src/interceptor/ClaudeCodeInterceptor.ts (5min timeout, parse structured response, clear file)

---

## Phase 4: User Story 2 - Self-Healing with Constitution Validation (P1) (18 tasks)

**Purpose**: System validates code against constitution and retries failed tasks automatically

### Tests First (TDD)

- [X] T032 [P] [US2] Unit test for EngineerAgent.validate() in tests/unit/agents/EngineerAgent.test.ts (mock Claude API, verify constitution check structure)
- [X] T033 [P] [US2] Unit test for EngineerAgent parsing validation response in tests/unit/agents/EngineerAgent.test.ts (test isValid, issues array, suggestions)
- [X] T034 [P] [US2] Unit test for TestAgent.runTests() in tests/unit/agents/TestAgent.test.ts (mock Playwright execution, verify test result parsing)
- [X] T035 [P] [US2] Unit test for retry logic with exponential backoff in tests/unit/orchestrator/RetryHandler.test.ts (verify 10s, 30s, 2min intervals per R5)
- [X] T036 [P] [US2] Integration test for Engineer Agent + Claude API in tests/integration/engineer-agent-validation.test.ts (real API, verify constitution compliance)
- [X] T037 [P] [US2] E2E test for self-healing workflow in tests/e2e/retry-and-recovery.test.ts (Playwright: simulate task failure, verify 3 retries, escalation)

### Implementation

- [X] T038 [US2] Load constitution.md in src/orchestrator/AutonomousOrchestrator.ts (read once at startup, cache in memory for Claude prompts)
- [X] T039 [US2] Implement EngineerAgent class in src/agents/EngineerAgent.ts with validate() method (call Claude API with task + code + constitution)
- [X] T040 [US2] Implement EngineerAgent.buildValidationPrompt() in src/agents/EngineerAgent.ts (format per claude-api.md: task description, implementation, constitution)
- [X] T041 [US2] Implement EngineerAgent.parseValidationResponse() in src/agents/EngineerAgent.ts (parse JSON: isValid, issues, suggestions, constitutionChecks)
- [X] T042 [US2] Implement TestAgent class in src/agents/TestAgent.ts with runTests() method (execute Playwright via subprocess, parse JSON results)
- [X] T043 [US2] Implement TestAgent.parseTestResults() in src/agents/TestAgent.ts (extract pass/fail counts, failed test names, error messages)
- [X] T044 [US2] Implement RetryHandler class in src/orchestrator/RetryHandler.ts with exponential backoff (intervals: 10s, 30s, 2min per FR-015)
- [X] T045 [US2] Implement RetryHandler.shouldRetry() in src/orchestrator/RetryHandler.ts (check attemptCount < 3, log retry_scheduled event)
- [X] T046 [US2] Implement RetryHandler.escalateToHuman() in src/orchestrator/RetryHandler.ts (log ERROR, send notification, mark task failed)
- [X] T047 [US2] Integrate validation into AutonomousOrchestrator.executeTask() in src/orchestrator/AutonomousOrchestrator.ts (call EngineerAgent after code written)
- [X] T048 [US2] Integrate testing into AutonomousOrchestrator.executeTask() in src/orchestrator/AutonomousOrchestrator.ts (call TestAgent, retry on failure)
- [X] T049 [US2] Implement feedback loop in ClaudeCodeInterceptor.sendRetryPrompt() in src/interceptor/ClaudeCodeInterceptor.ts (format retry message with validation issues + test failures)

---

## Phase 5: User Story 3 - Q&A Engine (P2) (10 tasks)

**Purpose**: System answers questions using specifications without human intervention

### Tests First (TDD)

- [X] T050 [P] [US3] Unit test for QAEngine.answerQuestion() in tests/unit/orchestrator/QAEngine.test.ts (mock Claude API, verify confidence scoring)
- [X] T051 [P] [US3] Unit test for QAEngine.buildContext() in tests/unit/orchestrator/QAEngine.test.ts (verify spec content aggregation, limit to relevant specs)
- [X] T052 [P] [US3] Unit test for confidence thresholds in tests/unit/orchestrator/QAEngine.test.ts (≥80% auto-respond, <60% escalate)
- [X] T053 [P] [US3] Integration test for Q&A workflow in tests/integration/qa-engine-flow.test.ts (real specs, Claude API, verify answer sources)

### Implementation

- [X] T054 [US3] Implement QAEngine class in src/orchestrator/QAEngine.ts with answerQuestion() method (call Claude API with question + all specs)
- [X] T055 [US3] Implement QAEngine.buildContext() in src/orchestrator/QAEngine.ts (aggregate spec content, task context, limit token count to ~1500)
- [X] T056 [US3] Implement QAEngine.buildQAPrompt() in src/orchestrator/QAEngine.ts (format per claude-api.md: question, context, specs, JSON response schema)
- [X] T057 [US3] Implement QAEngine.parseAnswer() in src/orchestrator/QAEngine.ts (parse JSON: answer, confidence, sources; validate confidence 0-100)
- [X] T058 [US3] Implement confidence-based routing in QAEngine.answerQuestion() in src/orchestrator/QAEngine.ts (≥80% auto-respond, 60-79% warn, <60% escalate per contract)
- [X] T059 [US3] Integrate Q&A into ClaudeCodeInterceptor in src/interceptor/ClaudeCodeInterceptor.ts (detect .claude-question.txt, invoke QAEngine, write answer to .claude-input.txt)

---

## Phase 6: User Story 4 - WhatsApp Notifications (P2) (10 tasks)

**Purpose**: System sends critical alerts via WhatsApp with fallback to log file

### Tests First (TDD)

- [X] T060 [P] [US4] Unit test for NotificationService.send() in tests/unit/utils/NotificationService.test.ts (mock whatsapp-web.js, verify message formatting)
- [X] T061 [P] [US4] Unit test for fallback to .notifications.log in tests/unit/utils/NotificationService.test.ts (simulate WhatsApp failure, verify file append)
- [X] T062 [P] [US4] Unit test for rate limiting in tests/unit/utils/NotificationService.test.ts (verify max 256/day to unknown contacts per R7 research)
- [X] T063 [P] [US4] Integration test for WhatsApp delivery in tests/integration/notification-flow.test.ts (sandbox WhatsApp account, verify message received)

### Implementation

- [X] T064 [US4] Implement NotificationService class in src/utils/NotificationService.ts with send() method (use WhatsAppClient, format per notification-api.md)
- [X] T065 [US4] Implement NotificationService.formatMessage() in src/utils/NotificationService.ts (severity prefix, task ID, context, max 1000 chars)
- [X] T066 [US4] Implement NotificationService.sendWhatsApp() in src/utils/NotificationService.ts (call WhatsAppClient, handle errors, log notification_sent event)
- [X] T067 [US4] Implement fallback to .notifications.log in src/utils/NotificationService.ts (append JSON line on WhatsApp failure per R4 research)
- [X] T068 [US4] Integrate notifications into RetryHandler.escalateToHuman() in src/orchestrator/RetryHandler.ts (send critical notification with task failure details)
- [X] T069 [US4] Integrate notifications into QAEngine in src/orchestrator/QAEngine.ts (send notification when confidence <60%, include question + context)

---

## Phase 7: User Story 5 - Dependency Management (P3) (6 tasks)

**Purpose**: System handles complex task dependencies and blocks correctly

### Tests First (TDD)

- [X] T070 [P] [US5] Unit test for circular dependency detection in tests/unit/orchestrator/DependencyResolver.test.ts (create circular graph, verify error thrown)
- [X] T071 [P] [US5] Unit test for topological sort in tests/unit/orchestrator/DependencyResolver.test.ts (various DAGs, verify correct ordering)
- [X] T072 [P] [US5] E2E test for multi-dependency workflow in tests/e2e/multi-task-workflow.test.ts (Playwright: spec with 5+ tasks, complex dependencies, verify execution order)

### Implementation

- [X] T073 [US5] Implement DependencyResolver class in src/orchestrator/DependencyResolver.ts with detectCircular() method (DFS-based cycle detection)
- [X] T074 [US5] Implement DependencyResolver.topologicalSort() in src/orchestrator/DependencyResolver.ts (Kahn's algorithm, return sorted task IDs)
- [X] T075 [US5] Integrate DependencyResolver into TaskQueue.buildQueue() in src/orchestrator/TaskQueue.ts (validate dependencies, throw on circular, sort tasks)

---

## Phase 8: Production Readiness & Polish (14 tasks)

**Purpose**: Finalize testing, documentation, error handling, and deployment preparation

### Testing & Coverage

- [X] T076 [P] Create test fixtures in tests/fixtures/ (test-spec-001.md, test-spec-002.md with various task configurations)
- [X] T077 [P] Add mocks for all external services in tests/mocks/ (MockClaudeAPI.ts, MockWhatsAppClient.ts, MockFileSystem.ts)
- [X] T078 [P] Run full test suite with coverage report (vitest run --coverage, verify ≥80% for ALL metrics: line/branch/function/statement coverage per Constitution Principle VII)
- [X] T079 [P] Fix coverage gaps (identify uncovered branches in coverage report, add targeted tests to reach 80%+ all metrics)
- [X] T080 [P] Add CI coverage gate enforcement (configure vitest coverage thresholds in vitest.config.ts, add GitHub Actions workflow to block PR merge if coverage <80%)

### Error Handling & Resilience

- [X] T081 [P] Add try/catch to all async operations in src/orchestrator/ and src/agents/ (wrap Claude API calls, file I/O, subprocess execution)
- [X] T082 [P] Add input validation to all public methods (check null/undefined, validate task IDs, verify file paths per security section in file-protocol.md)
- [X] T083 [P] Implement graceful shutdown in src/orchestrator/AutonomousOrchestrator.ts (handle SIGINT/SIGTERM, close WhatsApp client, flush logs)
- [X] T084 [P] Add startup validation in src/orchestrator/AutonomousOrchestrator.ts (check ANTHROPIC_API_KEY exists, test Claude API connection, verify .specify/specs/ exists)

### Documentation & Operations

- [X] T085 Create README.md in src/orchestrator/ (usage instructions, environment variables, architecture diagram)
- [X] T086 Create TROUBLESHOOTING.md in src/orchestrator/ (common errors, log analysis guide, WhatsApp QR scan issues)
- [X] T087 Document all public APIs with JSDoc comments (classes, methods, parameters, return types, examples)
- [X] T088 Create example .env file in src/orchestrator/.env.example (ANTHROPIC_API_KEY, WHATSAPP_PHONE_NUMBER, LOG_LEVEL, etc.)

### Performance & Monitoring

- [X] T089 Add performance logging in src/utils/Logger.ts (log Claude API duration, file operation times, task execution times)
- [X] T090 Add startup script in package.json (scripts: { "start": "node dist/orchestrator/AutonomousOrchestrator.js", "dev": "tsx watch src/orchestrator/AutonomousOrchestrator.ts" })

---

## Task Statistics

**Total Tasks**: 95
**By Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 13 tasks (includes performance tests for SC-006, SC-010 and file conflict test for FR-017)
- Phase 3 (US1 - P1): 16 tasks (6 tests + 10 impl, includes scale limit test for FR-018)
- Phase 4 (US2 - P1): 18 tasks (6 tests + 12 impl)
- Phase 5 (US3 - P2): 10 tasks (4 tests + 6 impl)
- Phase 6 (US4 - P2): 10 tasks (4 tests + 6 impl)
- Phase 7 (US5 - P3): 6 tasks (3 tests + 3 impl)
- Phase 8 (Polish): 15 tasks (includes CI coverage gate)

**Priority Breakdown**:
- `[P]` Critical (TDD tests, constitution compliance, CI gates): 43 tasks (45%)
- `[US1]` User Story 1 (P1): 16 tasks
- `[US2]` User Story 2 (P1): 18 tasks
- `[US3]` User Story 3 (P2): 10 tasks
- `[US4]` User Story 4 (P2): 10 tasks
- `[US5]` User Story 5 (P3): 6 tasks
- General (no marker): 35 tasks

**Test Coverage**: 43 test tasks ensuring 80%+ coverage per Constitution Principle VII (includes CI gate enforcement and performance validation)

---

## Critical Path

**Blocking Dependencies** (must complete before parallel work):
1. Phase 1 (Setup) → Phase 2 (Foundational) → All user stories can begin
2. Within each user story: Tests first, then implementation (TDD)

**Recommended Execution Order**:
1. Phase 1: Setup (T001-T006) - 1 day
2. Phase 2: Foundational (T007-T016) - 2 days
3. Phase 3: US1 - Autonomous Execution (T017-T031) - 3 days
4. Phase 4: US2 - Self-Healing (T032-T049) - 3 days
5. Phase 5: US3 - Q&A Engine (T050-T059) - 2 days
6. Phase 6: US4 - Notifications (T060-T069) - 2 days
7. Phase 7: US5 - Dependencies (T070-T075) - 1 day
8. Phase 8: Polish (T076-T089) - 2 days

**Total Estimated Time**: 16 days (assumes 1 developer, 6-hour productive days)

---

## Success Criteria Mapping

**SC-001** (95% success rate): Validated by T037 (E2E retry test), T078 (full test suite)
**SC-002** (<30s task time): Validated by T088 (performance logging)
**SC-003** (100 tasks/spec, 50 specs): Validated by T022 (scale limit warnings)
**SC-004** (24/7 operation): Validated by T082 (graceful shutdown), T083 (startup validation)
**SC-005** (3 retries max): Validated by T037 (E2E retry test), implemented in T044-T045
**SC-006** (<300ms file change): Validated by T029 (Chokidar 300ms debounce)
**SC-007** (80% test coverage): Enforced by T078-T079 (coverage report + gap fixing)

---

**Generated**: 2025-10-27
**Template Version**: 2.0.0 (GitHub Spec Kit format)
**Constitution Compliance**: All tasks follow TDD (Principle I), strict TypeScript (Principle IV), 80%+ coverage (Principle VII)
