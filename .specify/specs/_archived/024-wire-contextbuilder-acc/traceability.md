# Requirement Traceability: Wire ContextBuilder + ACC

Generated: 2026-03-11T04:00:00Z

## Spec -> Plan -> Tasks Mapping

### User Story Coverage

| User Story | Priority | Plan Phase | Tasks | Acceptance Criteria Status |
|------------|----------|------------|-------|---------------------------|
| US1: Observation Masking | P1 | Phase 1 (wiring), Phase 2 (tests) | T001-T004, T005, T010, T012-T018 | 5/5 covered |
| US2: Stage-Aware Budgets | P1 | Phase 1 (wiring), Phase 2 (tests) | T001-T002, T008-T009, T011, T019-T021 | 5/5 covered |
| US3: Progressive ACC | P2 | Phase 3 (events), Phase 4 (orchestrator) | T022-T036, T041 | 7/7 covered |
| US4: Delegation Advisory | P2 | Phase 5 (wiring) | T037, T039 | 5/5 covered |
| US5: Layered Memory | P3 | Phase 5 (wiring) | T038, T040 | 6/6 covered |
| US6: Runtime Config Reload | P3 | Phase 1 (auto-activates) | T001-T002, T007 | 4/4 covered |

### Acceptance Criteria Detail

| ID | Criterion | Task(s) | Phase |
|----|-----------|---------|-------|
| US1-AC1 | Observations older than threshold masked to placeholders | T013 | Phase 2 |
| US1-AC2 | Intermediate window shows key-points only | T013 | Phase 2 |
| US1-AC3 | Error messages never masked | T014 | Phase 2 |
| US1-AC4 | Per-type decay rates respected | T015 | Phase 2 |
| US1-AC5 | Cache persists to disk and restores | T016 | Phase 2 |
| US2-AC1 | Loads stage-specific profiles from YAML or defaults | T009, T019, T020 | Phase 2 |
| US2-AC2 | Research stage: 40% research, 20% memory, 10% code | T009 | Phase 2 |
| US2-AC3 | Implement stage: 10% research, 20% memory, 40% code | T009 | Phase 2 |
| US2-AC4 | Profiles validated (sum <= 1.0) | T021 | Phase 2 |
| US2-AC5 | Budget enforcement mode configurable | T011 | Phase 2 |
| US3-AC1 | Stage 1 (70%): delegation advisory | T028-T029, T032 | Phase 4 |
| US3-AC2 | Stage 2 (80%): observation masking | T029, T032 | Phase 4 |
| US3-AC3 | Stage 3 (85%): fast pruning | T029, T032 | Phase 4 |
| US3-AC4 | Stage 4 (90%): aggressive masking | T029, T032 | Phase 4 |
| US3-AC5 | Stage 5 (99%): LLM compaction | T029, T032 | Phase 4 |
| US3-AC6 | Cooldown prevents re-triggering | T030, T033 | Phase 4 |
| US3-AC7 | No interference with AutoHandoffTrigger | T006, T035, T041 | Phase 1, 4, 6 |
| US4-AC1 | 50% advisory: codebase-locator | T039 | Phase 5 |
| US4-AC2 | 60% warning: codebase-analyzer | T039 | Phase 5 |
| US4-AC3 | 70% blocking: require delegation | T039 | Phase 5 |
| US4-AC4 | Advisory as markdown section | T039 | Phase 5 |
| US4-AC5 | Result truncation per agent type | T039 | Phase 5 |
| US5-AC1 | Core layer: tagged memories always load | T040 | Phase 5 |
| US5-AC2 | Recall layer: recent, limited to 20 | T040 | Phase 5 |
| US5-AC3 | Archival layer: keyword search only | T040 | Phase 5 |
| US5-AC4 | Demotion runs when recall exceeds limit | T040 | Phase 5 |
| US5-AC5 | Togglable via gofer.useLayeredMemory | T038 | Phase 5 |
| US5-AC6 | Config changes at runtime | T007, T038 | Phase 1, 5 |
| US6-AC1 | observationPreservePatterns updates at runtime | T007 | Phase 1 |
| US6-AC2 | useLayeredMemory toggles at runtime | T007 | Phase 1 |
| US6-AC3 | No window reload required | T007 | Phase 1 |
| US6-AC4 | Invalid patterns logged, no crash | T007 | Phase 1 |

### Plan Phase Coverage

| Phase | Task Count | Coverage |
|-------|------------|----------|
| Phase 1: Foundation | 7 (T001-T007) | 100% |
| Phase 2: Unit Tests | 14 (T008-T021) | 100% |
| Phase 3: ACC Events | 6 (T022-T027) | 100% |
| Phase 4: ACC Orchestrator | 9 (T028-T036) | 100% |
| Phase 5: Dispatcher + Memory | 4 (T037-T040) | 100% |
| Phase 6: Integration | 4 (T041-T044) | 100% |

### Requirement Coverage

| Requirement | Task(s) | Phase |
|-------------|---------|-------|
| FR-001: Call setSharedContextBuilder() | T001 | Phase 1 |
| FR-002: Assign StateManager.sharedContextBuilder | T001 | Phase 1 |
| FR-003: Pass builder in EventHandlerDependencies | T001 (auto-activates) | Phase 1 |
| FR-004: Call AutoHandoffTrigger.setContextBuilder() | T003 | Phase 1 |
| FR-005: Dispose on reinitialize | T004 | Phase 1 |
| FR-006: Re-create on reinitialize | T004 | Phase 1 |
| FR-007: ACCOrchestrator with connect() | T028 | Phase 4 |
| FR-008: 5-stage graduated actions | T029 | Phase 4 |
| FR-009: Coexist with AutoHandoffTrigger | T006, T035, T041 | Phase 1, 4, 6 |
| FR-010: New ContextHealthMonitor events | T022-T024 | Phase 3 |
| FR-011: Wire SubAgentDispatcher | T037 | Phase 5 |
| FR-012: ObservationMasker cache flush | T001 (auto-activates) | Phase 1 |
| FR-013: Terminal observation tracking | T001 (auto-activates) | Phase 1 |
| FR-014: KnowledgeGraph save | T001 (auto-activates) | Phase 1 |
| FR-015: ContextBridgeWriter | T001 (auto-activates) | Phase 1 |

## Coverage Summary

- Plan Phases: 6/6 covered (100%)
- User Stories: 6/6 covered (100%)
- Acceptance Criteria: 32/32 covered (100%)
- Functional Requirements: 15/15 covered (100%)

**Status**: VALIDATION PASSED
