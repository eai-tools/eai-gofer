# Requirement Traceability: Multi-Session Context Panel

Generated: 2026-02-10T15:00:00Z

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story                                | Priority | Plan Phase    | Tasks                | Acceptance Criteria Status |
| ----------------------------------------- | -------- | ------------- | -------------------- | -------------------------- |
| US1: View context health for all sessions | P1       | Phase 2, 4, 6 | T007-T012, T022-T028 | 4/4 covered                |
| US2: Understand context composition       | P1       | Phase 4       | T024, T027, T052     | 4/4 covered                |
| US3: Graceful 4th terminal handling       | P1       | Phase 2, 6    | T009, T043           | 4/4 covered                |
| US4: Categorized project memory           | P2       | Phase 5       | T030-T037            | 5/5 covered                |
| US5: Redesigned panel layout              | P1       | Phase 3, 5    | T015-T020, T036      | 5/5 covered                |
| US6: Session lifecycle visibility         | P2       | Phase 2, 4    | T010, T026           | 4/4 covered                |

### Acceptance Criteria Detail

| ID      | Criterion                                                  | Task(s)           | Phase |
| ------- | ---------------------------------------------------------- | ----------------- | ----- |
| US1-AC1 | Sidebar shows "Context Window" with up to 3 sessions       | T015, T022, T023  | 3, 4  |
| US1-AC2 | Each session: ID, model, utilization %, color-coded health | T023              | 4     |
| US1-AC3 | Updates within 2 seconds of hook trigger                   | T028              | 4     |
| US1-AC4 | Empty state welcome message when no sessions               | T017, T025        | 3, 4  |
| US2-AC1 | Session expandable to categorized breakdown                | T024              | 4     |
| US2-AC2 | 6 categories shown                                         | T024              | 4     |
| US2-AC3 | Each category shows token count (est. labeled)             | T024, T027        | 4     |
| US2-AC4 | Counts sum within 5% of total                              | T027, T052        | 4, 7  |
| US3-AC1 | 4th session triggers info notification                     | T009, T043        | 2, 6  |
| US3-AC2 | Oldest inactive evicted                                    | T009              | 2     |
| US3-AC3 | 3 most recent continue monitored                           | T009              | 2     |
| US3-AC4 | Notification non-blocking and dismissible                  | T043              | 6     |
| US4-AC1 | Memory grouped by category                                 | T032              | 5     |
| US4-AC2 | Category nodes show count                                  | T033              | 5     |
| US4-AC3 | Expanding reveals truncated entries                        | T034              | 5     |
| US4-AC4 | Click opens detail/note file                               | T034              | 5     |
| US4-AC5 | Constitution accessible from Memory                        | T035, T036        | 5     |
| US5-AC1 | Sidebar: Specifications, Context Window, Memory            | T015              | 3     |
| US5-AC2 | Constitution removed as standalone section                 | T015, T018, T019  | 3     |
| US5-AC3 | Constitution accessible via Command Palette                | T019              | 3     |
| US5-AC4 | Specifications unchanged                                   | (no tasks needed) | -     |
| US5-AC5 | Refresh works per section                                  | T016, T020        | 3     |
| US6-AC1 | Active sessions: pulse icon                                | T026              | 4     |
| US6-AC2 | Inactive/stale: dimmed appearance                          | T026              | 4     |
| US6-AC3 | Inactive removed after 5-min grace                         | T010              | 2     |
| US6-AC4 | Status bar shows [N/3] count                               | T039, T040, T046  | 6     |

### Functional Requirement Coverage

| Requirement                        | Plan Phase | Task(s)          | Status  |
| ---------------------------------- | ---------- | ---------------- | ------- |
| FR1: Per-session bridge files      | Phase 1    | T002, T004, T005 | COVERED |
| FR2: Multi-session file watching   | Phase 2    | T007, T008, T012 | COVERED |
| FR3: Session registry with cap     | Phase 2, 6 | T009, T043, T049 | COVERED |
| FR4: Context Window tree view      | Phase 4    | T022-T028        | COVERED |
| FR5: Categorized memory tree       | Phase 5    | T031-T037        | COVERED |
| FR6: Status bar session count      | Phase 6    | T039, T040, T046 | COVERED |
| FR7: Backward compat legacy bridge | Phase 1, 2 | T003, T011, T050 | COVERED |
| FR8: Session cleanup               | Phase 2    | T010, T051       | COVERED |

### Plan Phase Coverage

| Phase                              | Task Count    | Coverage |
| ---------------------------------- | ------------- | -------- |
| Phase 1: Hook Script & Bridge      | 5 (T001-T005) | 100%     |
| Phase 2: MultiSessionBridgeWatcher | 9 (T006-T014) | 100%     |
| Phase 3: Panel Layout Redesign     | 6 (T015-T020) | 100%     |
| Phase 4: Context Window Tree View  | 9 (T021-T029) | 100%     |
| Phase 5: Memory Tree View Rewrite  | 9 (T030-T038) | 100%     |
| Phase 6: Status Bar & Wiring       | 9 (T039-T047) | 100%     |
| Phase 7: Integration Testing       | 8 (T048-T055) | 100%     |

### Data Model Coverage

| Entity          | Implementing Task(s)              | Status  |
| --------------- | --------------------------------- | ------- |
| SessionRecord   | T008 (registry), T023 (tree item) | COVERED |
| TokenBreakdown  | T024, T027                        | COVERED |
| MaskedInfo      | T024                              | COVERED |
| MemoryCategory  | T032, T033                        | COVERED |
| SessionRegistry | T008, T009                        | COVERED |

### API Contract Coverage

| Contract                            | Implementing Task(s) | Status  |
| ----------------------------------- | -------------------- | ------- |
| MultiSessionBridgeWatcher interface | T007, T008, T012     | COVERED |
| ContextWindowProvider interface     | T022-T028            | COVERED |
| MemoryProvider interface            | T031-T037            | COVERED |
| Hook Script per-session output      | T002, T003           | COVERED |
| Status Bar display format           | T039, T040           | COVERED |

## Coverage Summary

- Plan Phases: 7/7 covered (100%)
- User Stories: 6/6 covered (100%)
- Acceptance Criteria: 26/26 covered (100%)
- Functional Requirements: 8/8 covered (100%)
- Data Entities: 5/5 covered (100%)
- API Contracts: 5/5 covered (100%)

**Status**: VALIDATION PASSED
