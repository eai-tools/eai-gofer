---
id: '001-gofer-engineering-remediation'
title: 'Gofer Engineering Remediation'
status: 'draft'
created: '2026-02-24T10:50:00Z'
updated: '2026-03-01'
priority: 'medium'
assignee: 'engineer-agent'
---

# Gofer Engineering Remediation

## Overview

This comprehensive engineering remediation addresses technical debt across 8
quality categories identified in ENGINEERING_REVIEW.md. The goal is to improve
code maintainability, performance, and reliability while preserving ALL existing
functionality.

**Critical Constraint**: Any working functionality should not be lost. This is a
quality improvement initiative, not a feature rewrite.

**Research Reference**: See `research.md` for detailed codebase analysis and
integration points.

**Current State**: Overall grade B+ (85/100) across 8 categories **Target
State**: Grade A (95+/100) across all categories

## User Stories

### US1: Code Maintainability - Eliminate God Objects (P1)

**As a** developer maintaining Gofer **I want** extension.ts and
goferMigrator.ts refactored into smaller, focused modules **So that** I can
understand, test, and modify code without risk of breaking unrelated
functionality

**Why this priority**: These 2 files (2469 LOC and 2499 LOC) contain 10+
responsibilities each. Any change risks breaking multiple features. This is the
highest risk to long-term maintainability.

**Independent Test**: Can be fully tested by verifying all existing commands,
hooks, and migrations continue to work after refactoring. Delivers independent
value through reduced cognitive load and improved testability.

**Acceptance Criteria**:

- [ ] extension.ts reduced to <600 LOC (orchestrator only)
- [ ] Command registration extracted to CommandRegistry module (<600 LOC)
- [ ] Event handlers extracted to EventHandlers module (<600 LOC)
- [ ] Initialization logic extracted to InitializationService (<600 LOC)
- [ ] Cleanup logic extracted to DisposalService (<400 LOC)
- [ ] goferMigrator.ts reduced to <600 LOC (orchestrator only)
- [ ] Version detection extracted to VersionDetector module (<500 LOC)
- [ ] Upgrade logic extracted to UpgradeService (<600 LOC)
- [ ] Resource sync extracted to ResourceSyncer (<500 LOC)
- [ ] Path migration extracted to PathMigrator (<400 LOC)
- [ ] All existing tests pass without modification
- [ ] No user-facing behavior changes

---

### US2: Dependency Management - Eliminate Global State (P1)

**As a** developer writing new features **I want** global state replaced with
dependency injection **So that** I can test modules in isolation and avoid
hidden dependencies

**Why this priority**: 15+ module-level globals create tight coupling and make
testing difficult. Any async operation can mutate shared state unexpectedly,
leading to race conditions.

**Independent Test**: Can be fully tested by verifying all services are
injectable and tests can run with mock dependencies. Delivers independent value
through improved testability and reduced coupling.

**Acceptance Criteria**:

- [ ] TSyringe installed and configured
- [ ] DI container created in extension/src/di/container.ts
- [ ] All 15+ global variables converted to injectable services
- [ ] Extension activation registers services in container
- [ ] All modules receive dependencies via constructor injection
- [ ] No module directly accesses another module's state
- [ ] Existing initialization flow preserved (backward compatible)
- [ ] Unit tests can inject mock dependencies

---

### US3: Code Quality - Replace Magic Numbers (P0)

**As a** developer configuring system behavior **I want** all 40+ magic numbers
replaced with named constants **So that** I can understand what values mean and
change them safely

**Why this priority**: Quick win with high value. Magic numbers (10000ms,
0.7, 200) scattered throughout code make it impossible to understand intent or
adjust behavior consistently.

**Independent Test**: Can be fully tested by verifying all timeouts, thresholds,
and limits work identically after extraction. Delivers independent value through
improved code readability.

**Acceptance Criteria**:

- [ ] config/timeouts.ts created with all timeout constants
- [ ] config/thresholds.ts created with all threshold constants
- [ ] config/limits.ts created with all limit constants
- [ ] config/intervals.ts created with all interval constants
- [ ] All 40+ magic numbers replaced with named constants
- [ ] Constants include JSDoc comments explaining purpose
- [ ] No behavior changes (values identical)
- [ ] Extension compiles and runs without errors

---

### US4: Observability - Replace Silent Error Handlers (P1)

**As a** developer debugging production issues **I want** all 47 silent error
handlers replaced with proper logging **So that** I can diagnose failures
instead of seeing silent failures

**Why this priority**: Silent `.catch(() => {})` handlers hide errors that could
indicate serious problems. Production issues become impossible to diagnose.

**Independent Test**: Can be fully tested by triggering error conditions and
verifying logs contain useful context. Delivers independent value through
improved debuggability.

**Acceptance Criteria**:

- [ ] Logger service created in extension/src/services/Logger.ts
- [ ] Logger injectable via DI container
- [ ] All 47 `.catch(() => {})` replaced with `.catch(err => logger.error(...))`
- [ ] Error logs include context (operation, module, relevant state)
- [ ] Existing error recovery behavior preserved
- [ ] Log messages follow consistent format
- [ ] No unhandled promise rejections introduced

---

### US5: Performance - Implement Proper Cache Eviction (P1)

**As a** user running Gofer for extended sessions **I want** caches to have
bounded memory usage **So that** memory doesn't grow unbounded and crash my
VSCode instance

**Why this priority**: Unbounded memory growth in ObservationMasker and
MemoryStorage already contributed to crashes. This prevents memory exhaustion.

**Independent Test**: Can be fully tested by running extended sessions and
verifying memory stays bounded. Delivers independent value through improved
stability.

**Acceptance Criteria**:

- [ ] ObservationMasker.expansionMetrics uses LRU cache with 100-entry limit
- [ ] MemoryStorage implements token-based budget (max 50k tokens)
- [ ] MemoryStorage stops duplicating content in indexMemory()
- [ ] HookBridgeWatcher.start() clears old interval before creating new one
- [ ] All caches follow SpecCache pattern (LRU + TTL + disposal)
- [ ] Cache metrics tracked (hits, misses, evictions)
- [ ] Memory usage stays under 200MB in normal operation
- [ ] No cache-related functionality lost

---

### US6: Testing - Fix Pre-Existing Test Failures (P0)

**As a** developer running CI/CD pipeline **I want** all 5 pre-existing test
failures fixed **So that** I can rely on tests to catch regressions

**Why this priority**: Test failures block releases and hide real regressions.
This must be fixed before any other remediation work.

**Independent Test**: Can be fully tested by running test suite and seeing all
tests pass. Delivers independent value through unblocked release pipeline.

**Acceptance Criteria**:

- [ ] agent-stop-extraction.test.ts failures investigated
- [ ] Missing JSONL file dependency added or tests skipped appropriately
- [ ] All 5 failing tests now pass or properly skipped
- [ ] Test fixtures properly managed
- [ ] npm test runs without failures
- [ ] CI/CD pipeline unblocked

---

### US7: Documentation - Add Architecture Decision Records (P2)

**As a** developer onboarding to Gofer **I want** key architectural decisions
documented **So that** I understand why systems are designed the way they are

**Why this priority**: Lower priority than code changes, but critical for
long-term maintainability. ADRs prevent repeating past mistakes.

**Independent Test**: Can be fully tested by reviewing ADRs for completeness and
clarity. Delivers independent value through improved team knowledge.

**Acceptance Criteria**:

- [ ] ADR-001: Dependency injection framework choice (TSyringe)
- [ ] ADR-002: Module extraction strategy (phased with facades)
- [ ] ADR-003: Error handling approach (Result<T,E> pattern)
- [ ] ADR-004: Cache eviction strategy (LRU + TTL + token budget)
- [ ] ADR-005: Constants management (hierarchical by domain)
- [ ] Architecture diagram: Extension activation flow
- [ ] Architecture diagram: DI container structure
- [ ] Architecture diagram: Module dependencies

---

### US8: Security - Add Input Validation (P2)

**As a** user providing configuration and file paths **I want** inputs validated
before use **So that** I don't accidentally break Gofer with invalid data

**Why this priority**: Security and robustness improvement. Not urgent as no
known exploits, but important for production quality.

**Independent Test**: Can be fully tested by providing invalid inputs and
verifying graceful error handling. Delivers independent value through improved
robustness.

**Acceptance Criteria**:

- [ ] JSON schema validation for all configuration files
- [ ] File path sanitization in all file operations
- [ ] Command input validation for special characters
- [ ] Rate limiting on expensive operations (context building, code generation)
- [ ] Graceful error messages for invalid inputs
- [ ] No breaking changes to valid input formats
- [ ] Configuration validation runs on extension activation

---

### Edge Cases

- **Concurrent reinitialization**: System must prevent multiple simultaneous
  reinitializations (already handled by isReinitializing guard)
- **Resource disposal during operation**: If dispose() called while operation in
  progress, must gracefully cancel and clean up
- **Cache eviction during access**: If entry evicted while being read, must
  handle gracefully (return miss, not error)
- **Missing DI dependency**: If service not registered, must fail fast with
  clear error message
- **Constants conflict**: If constant name collides across files, must use
  namespacing (TIMEOUTS._, LIMITS._)
- **Test fixture cleanup**: Tests must not leave behind temporary files or state
- **Malformed configuration**: Invalid config should log warning and use
  defaults, not crash
- **Memory pressure**: If approaching memory limits, caches should aggressively
  evict before hitting hard limits

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST preserve all existing functionality during refactoring
  (backward compatibility)
  - **Validation**: All existing E2E tests pass without modification
  - **Integration**: Facade pattern keeps public APIs stable during internal
    refactoring

- **FR-002**: System MUST reduce extension.ts to <600 LOC
  - **Validation**: Line count check via automated script
  - **Integration**: Extract CommandRegistry, EventHandlers,
    InitializationService, DisposalService

- **FR-003**: System MUST reduce goferMigrator.ts to <600 LOC
  - **Validation**: Line count check via automated script
  - **Integration**: Extract VersionDetector, UpgradeService, ResourceSyncer,
    PathMigrator

- **FR-004**: System MUST replace all 40+ magic numbers with named constants
  - **Validation**: Regex search for numeric literals (excluding 0, 1, -1)
  - **Integration**: Create config/timeouts.ts, config/thresholds.ts,
    config/limits.ts, config/intervals.ts

- **FR-005**: System MUST replace all 47 silent error handlers with proper
  logging
  - **Validation**: Grep for `.catch(() => {})` returns no matches
  - **Integration**: Logger service with DI, consistent error context format

- **FR-006**: System MUST implement DI container for all services
  - **Validation**: No module-level global state variables (except DI container
    itself)
  - **Integration**: TSyringe container in extension/src/di/container.ts

- **FR-007**: System MUST implement bounded caches with LRU + TTL
  - **Validation**: Memory profiling shows stable memory usage over 8-hour
    session
  - **Integration**: Apply SpecCache pattern to ObservationMasker and
    MemoryStorage

- **FR-008**: System MUST fix all 5 pre-existing test failures
  - **Validation**: `npm test` exits with code 0
  - **Integration**: Add test fixtures or skip obsolete tests appropriately

- **FR-009**: System MUST create ADRs for key architectural decisions
  - **Validation**: 5 ADRs documented in .specify/memory/decisions/
  - **Integration**: ADRs follow standard template (Context, Decision,
    Consequences)

- **FR-010**: System MUST validate configuration and file path inputs
  - **Validation**: Invalid inputs produce clear error messages, not crashes
  - **Integration**: JSON schema validation library, path sanitization helpers

- **FR-011**: System MUST maintain extension activation time <2 seconds
  - **Validation**: Measure cold start time via extension host profiling
  - **Integration**: DI container registration is synchronous, lazy service
    initialization

- **FR-012**: System MUST maintain memory footprint <200MB under normal
  operation
  - **Validation**: Memory profiling with typical workload (5 specs, 10
    commands)
  - **Integration**: Bounded caches prevent unbounded growth

### Key Entities _(include if feature involves data)_

- **ServiceContainer**: DI container managing service lifecycle and dependency
  resolution
- **Logger**: Centralized logging service for consistent error reporting
- **ConfigurationConstants**: Hierarchical constants (Timeouts, Thresholds,
  Limits, Intervals)
- **CacheMetrics**: Statistics for cache performance (hits, misses, evictions,
  size)
- **ArchitectureDecisionRecord**: Structured documentation of design decisions

## Success Criteria _(mandatory)_

### Measurable Outcomes

| Metric                              | Current | Target           | Measurement                 |
| ----------------------------------- | ------- | ---------------- | --------------------------- |
| Architecture & Design Score         | 7/10    | 9+/10            | Validation rubric           |
| Code Quality Score                  | 7/10    | 9+/10            | Validation rubric           |
| Performance Score                   | 7/10    | 9+/10            | Validation rubric           |
| Testing Score                       | 7/10    | 9+/10            | Validation rubric           |
| Error Handling Score                | 7/10    | 9+/10            | Validation rubric           |
| Documentation Score                 | 7.5/10  | 9+/10            | Validation rubric           |
| Security Score                      | 7.5/10  | 9+/10            | Validation rubric           |
| Feature Delivery Score              | 8.5/10  | 9+/10            | Validation rubric           |
| Overall Score                       | 85/100  | 95+/100          | Validation rubric           |
| extension.ts LOC                    | 2469    | <600             | wc -l                       |
| goferMigrator.ts LOC                | 2499    | <600             | wc -l                       |
| Magic numbers                       | 40+     | 0                | Regex search                |
| Silent error handlers               | 47      | 0                | Grep for `.catch(() => {})` |
| Global variables                    | 15+     | 1 (DI container) | Code audit                  |
| Test failures                       | 5       | 0                | npm test                    |
| Extension activation time           | <2s     | <2s              | Extension host profiling    |
| Memory footprint (8hr session)      | ~250MB  | <200MB           | Memory profiling            |
| ADRs documented                     | 0       | 5+               | File count                  |
| Cache implementations with eviction | 1       | 3                | Code audit                  |

## Assumptions

1. **Backward compatibility required**: All existing configuration, commands,
   and behaviors must continue to work
2. **No user-facing changes**: Users should not notice any behavioral
   differences (only performance/stability improvements)
3. **Incremental delivery**: Changes can be delivered in phases (P0 → P1 → P2)
   without breaking builds
4. **Test coverage maintained**: Existing test coverage must be maintained or
   improved during refactoring
5. **VSCode Extension API stability**: VSCode extension host APIs remain stable
   during remediation
6. **Node.js 20.x LTS**: Runtime environment remains on Node.js 20.x LTS
7. **TypeScript 5.7.2**: TypeScript version remains on 5.7.2 or compatible minor
   versions
8. **No external service dependencies**: All changes are internal to the
   extension, no new cloud services required
9. **Development team bandwidth**: Remediation can proceed in parallel with
   critical bug fixes
10. **Code review process**: All changes go through validation rubric before
    merge

## Dependencies

### Internal Dependencies (from research.md)

- **Extension activation flow**: `extension.ts:activate()` must integrate all
  new modules
- **Configuration system**: ConfigManager must support new constants structure
- **Test framework**: Vitest and Playwright must support refactored module
  structure
- **Disposal system**: All new services must implement dispose() for proper
  cleanup
- **SpecCache pattern**: Existing LRU + TTL cache pattern to be replicated

### External Dependencies

- **TSyringe**: Microsoft's DI container for TypeScript (~40KB, MIT license)
- **JSON Schema validator**: For configuration validation (e.g., ajv ~200KB, MIT
  license)

### Blocked By

- None - research phase complete, all integration points identified

### Blocks

- Future features requiring new services (will benefit from DI architecture)
- Future performance optimizations (will benefit from proper caching)

## Out of Scope

1. **New features**: This is pure refactoring/quality improvement, no new
   user-facing features
2. **UI changes**: No changes to VSCode UI, tree views, status bars, or webviews
3. **Breaking changes**: No changes that require users to modify configuration
   or workflows
4. **Algorithm changes**: Core algorithms (context building, observation
   masking) remain unchanged
5. **Protocol changes**: No changes to file formats, APIs, or inter-process
   communication
6. **Performance optimization beyond caching**: Focus is on correctness and
   maintainability, not aggressive optimization
7. **Complete test rewrite**: Existing tests preserved, only minimal changes for
   compatibility
8. **Documentation for end users**: Focus is on developer documentation (ADRs),
   not user-facing docs

## Research Traceability

| Research Finding                             | Spec Section        | Reference                |
| -------------------------------------------- | ------------------- | ------------------------ |
| God objects (extension.ts, goferMigrator.ts) | US1, FR-002, FR-003 | User Story 1             |
| 15+ global variables                         | US2, FR-006         | User Story 2             |
| 40+ magic numbers                            | US3, FR-004         | User Story 3             |
| 47 silent error handlers                     | US4, FR-005         | User Story 4             |
| Unbounded cache growth                       | US5, FR-007         | User Story 5             |
| 5 pre-existing test failures                 | US6, FR-008         | User Story 6             |
| Missing ADRs                                 | US7, FR-009         | User Story 7             |
| Missing input validation                     | US8, FR-010         | User Story 8             |
| Extension activation constraint              | FR-011              | Integration point 1      |
| DI container requirement                     | FR-006              | Integration point 2      |
| ConfigManager compatibility                  | FR-004              | Integration point 3      |
| Testing framework                            | FR-008              | Integration point 4      |
| VSCode Extension API limits                  | Assumptions         | Technical constraint 1   |
| Node.js 20.x compatibility                   | Assumptions         | Technical constraint 2   |
| TypeScript 5.7.2                             | Assumptions         | Technical constraint 3   |
| Test coverage requirement                    | Assumptions         | Technical constraint 4   |
| 2-second activation constraint               | FR-011              | Performance constraint 1 |
| 200MB memory constraint                      | FR-012              | Performance constraint 2 |
| Token budget enforcement                     | FR-007              | Performance constraint 3 |
| Incremental delivery                         | Assumptions         | Process constraint 1     |
| Independent testability                      | Assumptions         | Process constraint 2     |
| Validation rubric target                     | Success Criteria    | Process constraint 3     |
| TSyringe DI choice                           | Dependencies        | Technology decision 1    |
| Phased extraction strategy                   | US1                 | Technology decision 2    |
| Hierarchical constants                       | US3, FR-004         | Technology decision 3    |
| Result<T,E> error pattern                    | US4                 | Technology decision 4    |
| LRU + TTL + Token Budget caching             | US5, FR-007         | Technology decision 5    |
| SpecCache pattern                            | FR-007              | Existing pattern 1       |
| Token-based budget                           | FR-007              | Existing pattern 2       |
| Resource disposal pattern                    | FR-006              | Existing pattern 3       |

## Glossary

| Term                  | Definition                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| God Object            | Anti-pattern where a single class/file has too many responsibilities (>10) and excessive lines of code (>2000 LOC) |
| DI Container          | Dependency Injection container that manages service lifecycle and resolves dependencies                            |
| Silent Error Handler  | `.catch(() => {})` that swallows errors without logging or recovery                                                |
| Magic Number          | Hardcoded numeric literal without explanation (e.g., `if (x > 0.7)` instead of `if (x > CRITICAL_THRESHOLD)`)      |
| LRU Cache             | Least Recently Used cache that evicts oldest entries when full                                                     |
| TTL                   | Time To Live - maximum age before cache entry expires                                                              |
| Token Budget          | Maximum number of tokens (approximate words) allowed in memory/cache                                               |
| ADR                   | Architecture Decision Record - structured documentation of design decisions                                        |
| Facade Pattern        | Wrapper that preserves existing API while delegating to refactored internals                                       |
| Bounded Cache         | Cache with maximum size limit that evicts entries to stay within bounds                                            |
| Cyclomatic Complexity | Measure of code complexity based on number of decision points                                                      |
| Module-Level Global   | Variable declared at file scope, accessible from anywhere in the file                                              |
