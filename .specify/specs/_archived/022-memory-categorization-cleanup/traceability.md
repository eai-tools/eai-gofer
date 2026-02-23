# Requirement Traceability: Memory System Categorization Cleanup

Generated: 2026-02-11

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story                                | Priority | Plan Phase  | Tasks           | Acceptance Criteria Status |
| ----------------------------------------- | -------- | ----------- | --------------- | -------------------------- |
| US1: Memory Panel Shows Only Memories     | P1       | Phase 1     | T001-T006       | 4/4 covered                |
| US2: Constitution Independent from Memory | P1       | Phase 2     | T007-T011       | 4/4 covered                |
| US3: Context Window Owns Context Concerns | P2       | Phase 1 + 3 | T002-T005, T013 | 2/2 covered                |
| US4: Configuration Constants Accurate     | P2       | Phase 3     | T012            | 3/3 covered                |

### Acceptance Criteria Detail

| ID      | Criterion                                                     | Task(s)           | Phase   |
| ------- | ------------------------------------------------------------- | ----------------- | ------- |
| US1-AC1 | Memory panel no longer shows Observations section             | T002, T003, T004  | Phase 1 |
| US1-AC2 | Memory panel no longer shows Checkpoints section              | T002, T003, T005  | Phase 1 |
| US1-AC3 | Memory panel shows only Memories and Decisions                | T002              | Phase 1 |
| US1-AC4 | Memory panel no longer has Constitution toolbar button        | T006              | Phase 1 |
| US2-AC1 | Constitution has own budget category in ContextBuilder        | T008, T009        | Phase 2 |
| US2-AC2 | MemoryLayerManager no longer wraps constitution as MemoryItem | T010              | Phase 2 |
| US2-AC3 | Constitution loaded exactly once in context assembly          | T010 (remove dup) | Phase 2 |
| US2-AC4 | config.ts VIEWS no longer references goferConstitution        | T012              | Phase 3 |
| US3-AC1 | Context Window "Memories/Hints" renamed                       | T013              | Phase 3 |
| US3-AC2 | Observation info no longer duplicated between panels          | T002-T005         | Phase 1 |
| US4-AC1 | VIEWS includes contextWindow                                  | T012              | Phase 3 |
| US4-AC2 | VIEWS removes stale constitution                              | T012              | Phase 3 |
| US4-AC3 | No other stale view references                                | T020              | Phase 5 |

### Functional Requirement Coverage

| Requirement                                           | Task(s)          | Phase   |
| ----------------------------------------------------- | ---------------- | ------- |
| FR1: Remove Observations from Memory panel            | T002, T003, T004 | Phase 1 |
| FR2: Remove Checkpoints from Memory panel             | T002, T003, T005 | Phase 1 |
| FR3: Remove Constitution button from Memory panel     | T006             | Phase 1 |
| FR4: Move Constitution button to Specifications panel | T007             | Phase 2 |
| FR5: Separate constitution from memory budget         | T008, T009       | Phase 2 |
| FR6: Remove constitution from MemoryLayerManager core | T010, T011       | Phase 2 |
| FR7: Fix config.ts VIEWS constant                     | T012             | Phase 3 |
| FR8: Rename Context Window category                   | T013             | Phase 3 |

### Plan Phase Coverage

| Phase                            | Task Count    | Coverage |
| -------------------------------- | ------------- | -------- |
| Phase 1: Memory Panel Cleanup    | 6 (T001-T006) | 100%     |
| Phase 2: Constitution Decoupling | 5 (T007-T011) | 100%     |
| Phase 3: Configuration & Labels  | 2 (T012-T013) | 100%     |
| Phase 4: Test Updates            | 3 (T014-T016) | 100%     |
| Phase 5: Final Verification      | 4 (T017-T020) | 100%     |

## Coverage Summary

- Plan Phases: 5/5 covered (100%)
- User Stories: 4/4 covered (100%)
- Acceptance Criteria: 13/13 covered (100%)
- Functional Requirements: 8/8 covered (100%)

**Status**: VALIDATION PASSED
