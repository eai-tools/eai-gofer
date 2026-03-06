# Requirement Traceability: Default AI Instruction Files

Generated: 2026-03-06T14:00:00Z

## Spec -> Plan -> Tasks Mapping

### User Story Coverage

| User Story                       | Priority | Plan Phase    | Tasks                           | Acceptance Criteria Status |
| -------------------------------- | -------- | ------------- | ------------------------------- | -------------------------- |
| US1 (Initialize AI Instructions) | P1       | Phase 2, 3, 4 | T010-T012, T022-T033            | 6/6 covered                |
| US2 (Project-Aware Templates)    | P1       | Phase 1, 2, 3 | T001-T009, T013-T018, T023-T024 | 5/5 covered                |
| US3 (Workflow Principles)        | P1       | Phase 2, 3    | T019-T021, T025-T026            | 4/4 covered                |
| US4 (Regenerate Instructions)    | P2       | Phase 5       | T034-T035b                      | 4/4 covered                |
| US5 (Existing Installation Sync) | P2       | Phase 4       | T036-T038                       | 4/4 covered                |

### Acceptance Criteria Detail

| ID      | Criterion                                       | Task(s)                            | Phase      |
| ------- | ----------------------------------------------- | ---------------------------------- | ---------- |
| US1-AC1 | Three files at correct locations                | T029, T032                         | Phase 3    |
| US1-AC2 | AGENTS.md has detected commands/structure/style | T010, T024, T026                   | Phase 2, 3 |
| US1-AC3 | CLAUDE.md < 60 lines with @AGENTS.md            | T011, T025, T031                   | Phase 2, 3 |
| US1-AC4 | copilot-instructions.md has overview + commands | T012, T020, T026b                  | Phase 2, 3 |
| US1-AC5 | No overwrite of existing files                  | T029, T033                         | Phase 3    |
| US1-AC6 | No API key required                             | T002 (detection), T023 (templates) | Phase 1, 3 |
| US2-AC1 | Detect language from manifest files             | T003, T009                         | Phase 1    |
| US2-AC2 | Test runner in commands section                 | T004, T024                         | Phase 1, 3 |
| US2-AC3 | Build commands in commands section              | T006, T024                         | Phase 1, 3 |
| US2-AC4 | Lint/format tools referenced                    | T005, T024                         | Phase 1, 3 |
| US2-AC5 | Generic template for unknown projects           | T018, T009                         | Phase 1, 2 |
| US3-AC1 | CLAUDE.md workflow guidance                     | T025, T021                         | Phase 2, 3 |
| US3-AC2 | AGENTS.md core principles                       | T026, T010                         | Phase 2, 3 |
| US3-AC3 | Gofer commands in CLAUDE.md                     | T019, T025                         | Phase 2, 3 |
| US3-AC4 | Copilot references Gofer prompts                | T020, T026b                        | Phase 2, 3 |
| US4-AC1 | Regenerate command available                    | T034                               | Phase 4    |
| US4-AC2 | Prompt for existing files                       | T035                               | Phase 4    |
| US4-AC3 | Re-detect project characteristics               | T035, T035b                        | Phase 4    |
| US4-AC4 | Command in Command Palette                      | T034                               | Phase 4    |
| US5-AC1 | Missing files detected during sync              | T037                               | Phase 5    |
| US5-AC2 | User prompted to generate                       | T038                               | Phase 5    |
| US5-AC3 | Decline respected                               | T038                               | Phase 5    |
| US5-AC4 | Existing files never modified                   | T029, T038                         | Phase 3, 5 |

### Plan Phase Coverage

| Phase                                          | Task Count             | Coverage |
| ---------------------------------------------- | ---------------------- | -------- |
| Phase 1: Setup & Detection                     | 9 (T001-T009)          | 100%     |
| Phase 2: Template Fragments                    | 12 (T010-T021)         | 100%     |
| Phase 3: US1+US2+US3 (Generator + Integration) | 13 (T022-T033 + T026b) | 100%     |
| Phase 4: US4 (Regenerate Command)              | 3 (T034-T035b)         | 100%     |
| Phase 5: US5 (Existing Installation Sync)      | 3 (T036-T038)          | 100%     |
| Phase 6: Polish                                | 5 (T039-T043)          | 100%     |

### Functional Requirement Coverage

| Requirement                          | Task(s)                | Status  |
| ------------------------------------ | ---------------------- | ------- |
| FR1: Three-tier content architecture | T010, T011, T012       | COVERED |
| FR2: Project detection engine        | T001-T009              | COVERED |
| FR3: Template assembly system        | T013-T024              | COVERED |
| FR4: Safe file creation              | T029, T033             | COVERED |
| FR5: Upgrade service integration     | T027-T030              | COVERED |
| FR6: Regenerate instructions command | T034-T035b             | COVERED |
| FR7: Content partitioning            | T021, T025, T026, T042 | COVERED |

## Coverage Summary

- Plan Phases: 6/6 covered (100%)
- User Stories: 5/5 covered (100%)
- Acceptance Criteria: 23/23 covered (100%)
- Functional Requirements: 7/7 covered (100%)
- Data Entities: N/A (no data model)
- API Endpoints: N/A (no API contracts)

**Status**: VALIDATION PASSED
