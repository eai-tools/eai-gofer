# Requirement Traceability: Gofer Engineering Remediation

**Generated**: 2026-02-24T11:15:00Z **Status**: VALIDATION PASSED ✓

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story                                          | Priority | Plan Phase | Tasks                | Acceptance Criteria Status |
| --------------------------------------------------- | -------- | ---------- | -------------------- | -------------------------- |
| US1: Code Maintainability - Eliminate God Objects   | P1       | Phase 3-4  | T020-T025, T026-T030 | 12/12 covered              |
| US2: Dependency Management - Eliminate Global State | P1       | Phase 1, 3 | T009-T010, T025      | 5/5 covered                |
| US3: Code Quality - Replace Magic Numbers           | P0       | Phase 0    | T003-T008            | 7/7 covered                |
| US4: Observability - Replace Silent Error Handlers  | P1       | Phase 1    | T011-T014            | 4/4 covered                |
| US5: Performance - Implement Proper Cache Eviction  | P1       | Phase 2    | T015-T019            | 6/6 covered                |
| US6: Testing - Fix Pre-Existing Test Failures       | P0       | Phase 0    | T001-T002            | 3/3 covered                |
| US7: Documentation - Add ADRs                       | P2       | Phase 5    | T031-T038            | 8/8 covered                |
| US8: Security - Add Input Validation                | P2       | Phase 5    | T039-T042            | 4/4 covered                |

**Total**: 8/8 user stories covered (100%)

### Acceptance Criteria Detail

#### US1: Code Maintainability - Eliminate God Objects

| Criterion                                                          | Task(s)    | Phase                       |
| ------------------------------------------------------------------ | ---------- | --------------------------- |
| extension.ts reduced to <600 LOC                                   | T024       | Phase 3                     |
| Command registration extracted to CommandRegistry (<600 LOC)       | T020       | Phase 3                     |
| Event handlers extracted to EventHandlers (<600 LOC)               | T021       | Phase 3                     |
| Initialization logic extracted to InitializationService (<600 LOC) | T022       | Phase 3                     |
| Cleanup logic extracted to DisposalService (<400 LOC)              | T023       | Phase 3                     |
| goferMigrator.ts reduced to <600 LOC                               | T030       | Phase 4                     |
| Version detection extracted to VersionDetector (<500 LOC)          | T026       | Phase 4                     |
| Upgrade logic extracted to UpgradeService (<600 LOC)               | T027       | Phase 4                     |
| Resource sync extracted to ResourceSyncer (<500 LOC)               | T028       | Phase 4                     |
| Path migration extracted to PathMigrator (<400 LOC)                | T029       | Phase 4                     |
| All existing tests pass without modification                       | All phases | Verified at each checkpoint |
| No user-facing behavior changes                                    | All phases | E2E tests validate          |

#### US2: Dependency Management - Eliminate Global State

| Criterion                                                  | Task(s)              | Phase     |
| ---------------------------------------------------------- | -------------------- | --------- |
| TSyringe installed and configured                          | T009                 | Phase 1   |
| DI container created in extension/src/di/container.ts      | T010                 | Phase 1   |
| All 15+ global variables converted to injectable services  | T025                 | Phase 3   |
| Extension activation registers services in container       | T024                 | Phase 3   |
| All modules receive dependencies via constructor injection | T020-T023, T026-T029 | Phase 3-4 |

#### US3: Code Quality - Replace Magic Numbers

| Criterion                                                 | Task(s)   | Phase   |
| --------------------------------------------------------- | --------- | ------- |
| config/timeouts.ts created with all timeout constants     | T004      | Phase 0 |
| config/thresholds.ts created with all threshold constants | T005      | Phase 0 |
| config/limits.ts created with all limit constants         | T006      | Phase 0 |
| config/intervals.ts created with all interval constants   | T007      | Phase 0 |
| All 40+ magic numbers replaced with named constants       | T008      | Phase 0 |
| Constants include JSDoc comments explaining purpose       | T004-T007 | Phase 0 |
| No behavior changes (values identical)                    | T008      | Phase 0 |

#### US4: Observability - Replace Silent Error Handlers

| Criterion                                                                  | Task(s)   | Phase   |
| -------------------------------------------------------------------------- | --------- | ------- |
| Logger service created in extension/src/services/Logger.ts                 | T011      | Phase 1 |
| Logger injectable via DI container                                         | T012      | Phase 1 |
| All 47 `.catch(() => {})` replaced with `.catch(err => logger.error(...))` | T013-T014 | Phase 1 |
| Error logs include context (operation, module, relevant state)             | T013-T014 | Phase 1 |

#### US5: Performance - Implement Proper Cache Eviction

| Criterion                                                           | Task(s)    | Phase   |
| ------------------------------------------------------------------- | ---------- | ------- |
| ObservationMasker.expansionMetrics uses LRU cache (100-entry limit) | T015       | Phase 2 |
| MemoryStorage implements token-based budget (max 50k tokens)        | T016       | Phase 2 |
| MemoryStorage stops duplicating content in indexMemory()            | T017       | Phase 2 |
| HookBridgeWatcher.start() clears old interval before creating new   | T018       | Phase 2 |
| All caches follow SpecCache pattern (LRU + TTL + disposal)          | T019       | Phase 2 |
| Cache metrics tracked (hits, misses, evictions)                     | T015, T019 | Phase 2 |

#### US6: Testing - Fix Pre-Existing Test Failures

| Criterion                                                          | Task(s) | Phase   |
| ------------------------------------------------------------------ | ------- | ------- |
| agent-stop-extraction.test.ts failures investigated                | T001    | Phase 0 |
| Missing JSONL file dependency added or tests skipped appropriately | T002    | Phase 0 |
| All 5 failing tests now pass or properly skipped                   | T002    | Phase 0 |

#### US7: Documentation - Add Architecture Decision Records

| Criterion                                                   | Task(s) | Phase   |
| ----------------------------------------------------------- | ------- | ------- |
| ADR-001: Dependency injection framework choice (TSyringe)   | T031    | Phase 5 |
| ADR-002: Module extraction strategy (phased with facades)   | T032    | Phase 5 |
| ADR-003: Error handling approach (Logger service)           | T033    | Phase 5 |
| ADR-004: Cache eviction strategy (LRU + TTL + token budget) | T034    | Phase 5 |
| ADR-005: Constants management (hierarchical by domain)      | T035    | Phase 5 |
| Architecture diagram: Extension activation flow             | T036    | Phase 5 |
| Architecture diagram: DI container structure                | T037    | Phase 5 |
| Architecture diagram: Module dependencies                   | T038    | Phase 5 |

#### US8: Security - Add Input Validation

| Criterion                                                            | Task(s) | Phase   |
| -------------------------------------------------------------------- | ------- | ------- |
| JSON schema validation for all configuration files                   | T039    | Phase 5 |
| File path sanitization in all file operations                        | T040    | Phase 5 |
| Command input validation for special characters                      | T041    | Phase 5 |
| Rate limiting on expensive operations (context building, generation) | T042    | Phase 5 |

### Plan Phase Coverage

| Plan Phase                                        | Task Count | Task IDs  | Coverage |
| ------------------------------------------------- | ---------- | --------- | -------- |
| Phase 0: Foundation & Test Stabilization (P0)     | 8          | T001-T008 | 100%     |
| Phase 1: Dependency Injection Infrastructure (P1) | 6          | T009-T014 | 100%     |
| Phase 2: Cache Remediation (P1)                   | 5          | T015-T019 | 100%     |
| Phase 3: Extension.ts Refactoring (P1)            | 6          | T020-T025 | 100%     |
| Phase 4: GoferMigrator.ts Refactoring (P1)        | 5          | T026-T030 | 100%     |
| Phase 5: Documentation & Security (P2)            | 11         | T031-T042 | 100%     |

**Total**: 6/6 plan phases covered (100%), 41 tasks total

### Plan Task Item Coverage

#### Phase 0 Items

| Plan Item                                  | Implementing Task(s) | Status  |
| ------------------------------------------ | -------------------- | ------- |
| T001: Investigate and fix 5 test failures  | T001-T002            | COVERED |
| T002: Create constants directory structure | T003                 | COVERED |
| T003: Extract timeout constants            | T004                 | COVERED |
| T004: Extract threshold constants          | T005                 | COVERED |
| T005: Extract limit constants              | T006                 | COVERED |
| T006: Extract interval constants           | T007                 | COVERED |
| T007: Replace all magic numbers            | T008                 | COVERED |

#### Phase 1 Items

| Plan Item                                        | Implementing Task(s) | Status  |
| ------------------------------------------------ | -------------------- | ------- |
| T008: Install and configure TSyringe             | T009                 | COVERED |
| T009: Create DI container                        | T010                 | COVERED |
| T010: Create Logger service                      | T011                 | COVERED |
| T011: Register Logger in DI container            | T012                 | COVERED |
| T012: Replace first 10 silent error handlers     | T013                 | COVERED |
| T013: Replace remaining 37 silent error handlers | T014                 | COVERED |

#### Phase 2 Items

| Plan Item                                          | Implementing Task(s) | Status  |
| -------------------------------------------------- | -------------------- | ------- |
| T014: Fix ObservationMasker unbounded array growth | T015                 | COVERED |
| T015: Add token budget to MemoryStorage            | T016                 | COVERED |
| T016: Remove content duplication in MemoryStorage  | T017                 | COVERED |
| T017: Fix HookBridgeWatcher timer leak             | T018                 | COVERED |
| T018: Standardize all caches on LRU + TTL pattern  | T019                 | COVERED |

#### Phase 3 Items

| Plan Item                                       | Implementing Task(s) | Status  |
| ----------------------------------------------- | -------------------- | ------- |
| T019: Create CommandRegistry service            | T020                 | COVERED |
| T020: Create EventHandlers service              | T021                 | COVERED |
| T021: Create InitializationService              | T022                 | COVERED |
| T022: Create DisposalService                    | T023                 | COVERED |
| T023: Refactor extension.ts to use new services | T024                 | COVERED |
| T024: Convert 15+ global variables to services  | T025                 | COVERED |

#### Phase 4 Items

| Plan Item                                           | Implementing Task(s) | Status  |
| --------------------------------------------------- | -------------------- | ------- |
| T025: Create VersionDetector service                | T026                 | COVERED |
| T026: Create UpgradeService                         | T027                 | COVERED |
| T027: Create ResourceSyncer service                 | T028                 | COVERED |
| T028: Create PathMigrator service                   | T029                 | COVERED |
| T029: Refactor goferMigrator.ts to use new services | T030                 | COVERED |

#### Phase 5 Items

| Plan Item                                 | Implementing Task(s) | Status  |
| ----------------------------------------- | -------------------- | ------- |
| T030-T034: Create 5 ADRs                  | T031-T035            | COVERED |
| T035-T037: Create 3 architecture diagrams | T036-T038            | COVERED |
| T038: Add JSON schema validation          | T039                 | COVERED |
| T039: Add file path sanitization          | T040                 | COVERED |
| T040: Add command input validation        | T041                 | COVERED |
| T041: Add rate limiting                   | T042                 | COVERED |

### Functional Requirement Coverage

| FR-ID  | Requirement                         | Task(s)         | Phase      | Status                       |
| ------ | ----------------------------------- | --------------- | ---------- | ---------------------------- |
| FR-001 | Preserve all existing functionality | All tasks       | All phases | COVERED (E2E tests validate) |
| FR-002 | Reduce extension.ts to <600 LOC     | T024            | Phase 3    | COVERED                      |
| FR-003 | Reduce goferMigrator.ts to <600 LOC | T030            | Phase 4    | COVERED                      |
| FR-004 | Replace 40+ magic numbers           | T003-T008       | Phase 0    | COVERED                      |
| FR-005 | Replace 47 silent error handlers    | T011-T014       | Phase 1    | COVERED                      |
| FR-006 | Implement DI container              | T009-T012, T025 | Phase 1, 3 | COVERED                      |
| FR-007 | Implement bounded caches            | T015-T019       | Phase 2    | COVERED                      |
| FR-008 | Fix 5 pre-existing test failures    | T001-T002       | Phase 0    | COVERED                      |
| FR-009 | Create 5+ ADRs                      | T031-T035       | Phase 5    | COVERED                      |
| FR-010 | Validate configuration and inputs   | T039-T042       | Phase 5    | COVERED                      |
| FR-011 | Maintain activation time <2s        | All phases      | Monitored  | COVERED                      |
| FR-012 | Maintain memory footprint <200MB    | T015-T019       | Phase 2    | COVERED                      |

**Total**: 12/12 functional requirements covered (100%)

## Data Model Coverage

N/A - This is internal refactoring, no new data entities introduced. Existing
entities (Memory, Observation, CacheEntry, CacheStats) preserved and documented
in data-model.md.

## API Contract Coverage

N/A - This is internal refactoring, no new APIs introduced. Existing VSCode
commands and MCP tools preserved. Internal service interfaces documented in code
comments.

## File Structure Alignment

All task file paths align with plan.md file structure:

| Task      | File Path                                           | In Plan Structure? |
| --------- | --------------------------------------------------- | ------------------ |
| T003-T007 | extension/src/config/\*.ts                          | Yes                |
| T010      | extension/src/di/container.ts                       | Yes                |
| T011      | extension/src/services/Logger.ts                    | Yes                |
| T015      | extension/src/autonomous/ObservationMasker.ts       | Yes (modified)     |
| T016-T017 | extension/src/autonomous/MemoryStorage.ts           | Yes (modified)     |
| T018      | extension/src/autonomous/HookBridgeWatcher.ts       | Yes (modified)     |
| T020      | extension/src/services/CommandRegistry.ts           | Yes                |
| T021      | extension/src/services/EventHandlers.ts             | Yes                |
| T022      | extension/src/services/InitializationService.ts     | Yes                |
| T023      | extension/src/services/DisposalService.ts           | Yes                |
| T026      | extension/src/services/migration/VersionDetector.ts | Yes                |
| T027      | extension/src/services/migration/UpgradeService.ts  | Yes                |
| T028      | extension/src/services/migration/ResourceSyncer.ts  | Yes                |
| T029      | extension/src/services/migration/PathMigrator.ts    | Yes                |
| T031-T035 | .specify/memory/decisions/\*.md                     | Yes                |
| T036-T038 | .specify/memory/diagrams/\*.mmd                     | Yes                |
| T039      | extension/src/schemas/config.schema.json            | Yes                |
| T040      | extension/src/utils/pathSanitizer.ts                | Yes                |
| T042      | extension/src/utils/rateLimiter.ts                  | Yes                |

**Total**: 41/41 tasks have valid file paths (100% alignment)

## Coverage Summary

- **Plan Phases**: 6/6 covered (100%)
- **Plan Task Items**: 41/41 covered (100%)
- **User Stories**: 8/8 covered (100%)
- **Acceptance Criteria**: 49/49 covered (100%)
- **Functional Requirements**: 12/12 covered (100%)
- **Data Entities**: N/A (preserving existing entities)
- **API Endpoints**: N/A (preserving existing APIs)
- **File Structure Alignment**: 41/41 tasks (100%)

## Validation Result

**STATUS**: ✓ VALIDATION PASSED

All requirements from spec.md are traced to plan.md phases and implemented by
tasks.md. Coverage is complete across all dimensions:

- Every user story has implementing tasks
- Every acceptance criterion is addressed
- Every functional requirement is covered
- Every plan phase has tasks
- Every plan task item is implemented
- All file paths align with plan structure

## Quality Metrics

- **Task Granularity**: Appropriate - each task is specific, actionable, has
  clear file path
- **Dependency Ordering**: Correct - phases respect dependencies, parallel
  opportunities identified
- **Independent Testability**: Achieved - each user story is independently
  deliverable
- **Traceability Depth**: Complete - 3-level traceability (spec → plan → tasks)
- **Protected Files**: Documented - preserving existing configuration and tests

## Readiness Assessment

**Ready for Implementation**: YES

- All prerequisites met (research, spec, plan complete)
- All user stories covered by tasks
- All acceptance criteria addressed
- Dependencies clearly defined
- Parallel opportunities identified (25 tasks parallelizable)
- Verification checkpoints defined
- Constitution compliance verified

**Next Step**: Proceed to approval gate, then `/5_gofer_implement`
