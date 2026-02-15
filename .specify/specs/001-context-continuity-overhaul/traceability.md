# Requirement Traceability: Context Continuity Overhaul

Generated: 2026-02-15

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story                | Priority | Plan Phase                | Tasks                                          | Acceptance Criteria Status |
| ------------------------- | -------- | ------------------------- | ---------------------------------------------- | -------------------------- |
| US1: Incremental Memory   | P1       | Phase 1, Phase 2          | T001, T004, T007, T012                         | 6/6 covered                |
| US2: Stage-Aware Resume   | P1       | Phase 3                   | T010, T011                                     | 5/5 covered                |
| US3: Failed Approaches    | P2       | Phase 1, Phase 2, Phase 3 | T002, T005, T008, T013                         | 6/6 covered                |
| US4: Health Estimation    | P2       | Phase 6                   | T025, T026, T027, T028                         | 4/4 covered                |
| US5: Periodic Saves       | P3       | Phase 1, Phase 2, Phase 3 | T003, T009, T014                               | 5/5 covered                |
| US6: Observation Manifest | P3       | Phase 5                   | T021, T022, T023, T024                         | 5/5 covered                |
| US7: Memory Conflicts     | P3       | Phase 4                   | T015, T016, T017, T018, T019, T020             | 5/5 covered                |
| US8: Handoff Quality      | P4       | Phase 6, Phase 7          | T029, T030, T031, T032, T033, T034, T035, T036 | 5/5 covered                |

### Acceptance Criteria Detail

| ID    | Criterion                                     | Task(s)    | Phase      |
| ----- | --------------------------------------------- | ---------- | ---------- |
| AC1.1 | Session-memory appended after task completion | T001, T007 | Phase 1, 2 |
| AC1.2 | Entry contains required fields                | T001       | Phase 1    |
| AC1.3 | Prompt instructs agent to write learning      | T007       | Phase 2    |
| AC1.4 | Bash script callable from prompt layer        | T001       | Phase 1    |
| AC1.5 | Logging failure non-blocking                  | T001       | Phase 1    |
| AC1.6 | Resume loads session memories                 | T004, T012 | Phase 1, 3 |
| AC2.1 | Stage detection from checkpoint/artifacts     | T010       | Phase 3    |
| AC2.2 | Stage-specific artifact loading               | T011       | Phase 3    |
| AC2.3 | Non-loaded artifacts mentioned not read       | T011       | Phase 3    |
| AC2.4 | Session memories loaded on resume             | T012       | Phase 3    |
| AC2.5 | Failed approaches loaded on resume            | T013       | Phase 3    |
| AC3.1 | Prompt instructs agent to log failures        | T008       | Phase 2    |
| AC3.2 | Entry contains required fields                | T002       | Phase 1    |
| AC3.3 | Synchronous fire-and-forget writes            | T002       | Phase 1    |
| AC3.4 | Resume reads last 3 sessions                  | T005, T013 | Phase 1, 3 |
| AC3.5 | Displayed as "Approaches Already Tried"       | T013       | Phase 3    |
| AC3.6 | Log created lazily                            | T002       | Phase 1    |
| AC4.1 | Hook-bridge data prioritized when fresh       | T025       | Phase 6    |
| AC4.2 | Fallback counts only spec artifacts           | T026       | Phase 6    |
| AC4.3 | dataSource field in output                    | T027       | Phase 6    |
| AC4.4 | Fallback under 200%                           | T026       | Phase 6    |
| AC5.1 | Checkpoint every 5 tasks                      | T009       | Phase 2    |
| AC5.2 | Checkpoint saves required data                | T003       | Phase 1    |
| AC5.3 | Checkpoints saved to correct path             | T003       | Phase 1    |
| AC5.4 | Non-blocking checkpoint writes                | T003       | Phase 1    |
| AC5.5 | Resume can use periodic checkpoint            | T014       | Phase 3    |
| AC6.1 | Manifest persisted on save                    | T022       | Phase 5    |
| AC6.2 | Entry contains required fields                | T024       | Phase 5    |
| AC6.3 | 2-tier hash verification                      | T023       | Phase 5    |
| AC6.4 | Valid observations restored                   | T023       | Phase 5    |
| AC6.5 | Stale observations discarded                  | T023       | Phase 5    |
| AC7.1 | Conflict detection with Jaccard ≥0.5 + tags   | T017       | Phase 4    |
| AC7.2 | Newer memory supersedes older                 | T018       | Phase 4    |
| AC7.3 | Superseded memory archived                    | T018       | Phase 4    |
| AC7.4 | Runs in existing consolidation cycle          | T018       | Phase 4    |
| AC7.5 | Conflict resolution logged                    | T020       | Phase 4    |
| AC8.1 | Token budget increased to 8000                | T030       | Phase 6    |
| AC8.2 | Handoff includes Failed Approaches            | T032, T035 | Phase 7    |
| AC8.3 | Handoff includes Session Memories             | T033, T035 | Phase 7    |
| AC8.4 | Warns on empty Key Decisions/Next Steps       | T031       | Phase 6    |
| AC8.5 | Unified handoff format                        | T035       | Phase 7    |

### Plan Phase Coverage

| Phase                         | Task Count | Coverage |
| ----------------------------- | ---------- | -------- |
| Phase 1: Bash Scripts         | 6          | 100%     |
| Phase 2: /5_gofer_implement   | 3          | 100%     |
| Phase 3: /8_gofer_resume      | 5          | 100%     |
| Phase 4: MemoryConsolidator   | 6          | 100%     |
| Phase 5: ObservationMasker    | 4          | 100%     |
| Phase 6: Health & Checkpoints | 7          | 100%     |
| Phase 7: Handoff Quality      | 5          | 100%     |
| Phase 8: Polish               | 6          | 100%     |

### Data Model Coverage

| Entity                   | Implementing Task(s) | Fields Covered?        |
| ------------------------ | -------------------- | ---------------------- |
| SessionMemoryEntry       | T001                 | Yes                    |
| FailedApproachEntry      | T002                 | Yes                    |
| ObservationManifestEntry | T024                 | Yes                    |
| PeriodicCheckpoint       | T003                 | Yes                    |
| StageResumeProfile       | T011                 | Yes (inline in prompt) |

### Internal API Contract Coverage

| Contract                                    | Implementing Task(s)   |
| ------------------------------------------- | ---------------------- |
| Contract 1: Session Memory Writing          | T001                   |
| Contract 2: Failed Approach Writing         | T002                   |
| Contract 3: Periodic Checkpoint Writing     | T003                   |
| Contract 4: Session Memory Reading          | T004                   |
| Contract 5: Failed Approaches Reading       | T005                   |
| Contract 6: Conflict Detection Extension    | T016, T017, T018, T019 |
| Contract 7: Observation Manifest Methods    | T022, T023             |
| Contract 8: CheckpointValidator Enhancement | T030, T031             |
| Contract 9: Context Health Fix              | T025, T026, T027       |

## Coverage Summary

- Plan Phases: 8/8 covered (100%)
- User Stories: 8/8 covered (100%)
- Acceptance Criteria: 41/41 covered (100%)
- Data Entities: 5/5 covered (100%)
- Internal API Contracts: 9/9 covered (100%)

**Status**: VALIDATION PASSED
