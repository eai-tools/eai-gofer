# Requirement Traceability: Consultative Business Discovery

Generated: 2026-01-25

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story                  | Priority | Plan Phase | Tasks           | Acceptance Criteria Status |
| --------------------------- | -------- | ---------- | --------------- | -------------------------- |
| US1 - Problem Discovery     | P1       | Phase 2    | T004-T007       | 4/4 covered                |
| US2 - User Segmentation     | P1       | Phase 2    | T008-T011       | 3/3 covered                |
| US3 - Value Proposition     | P1       | Phase 2, 4 | T012-T015       | 4/4 covered                |
| US4 - Competitive Landscape | P2       | Phase 2    | T016-T019       | 4/4 covered                |
| US5 - Adaptive Depth        | P2       | Phase 3    | T020-T023       | 4/4 covered                |
| US6 - Memory Persistence    | P2       | Phase 5, 6 | T024-T028       | 4/4 covered                |
| US7 - Skip Discovery        | P3       | Phase 1    | T003, T029-T031 | 3/3 covered                |

### Acceptance Criteria Detail

| ID      | Criterion                                                                         | Task(s)    | Phase   |
| ------- | --------------------------------------------------------------------------------- | ---------- | ------- |
| US1-AC1 | Given user selects "New Feature", AI asks "What problem are you trying to solve?" | T004       | Phase 2 |
| US1-AC2 | Given user provides problem, discovery.md created with Problem Statement          | T007       | Phase 2 |
| US1-AC3 | Given AI presents options, recommended option shown with reasoning                | T005       | Phase 2 |
| US1-AC4 | Given user responds "yes", AI accepts recommendation                              | T006       | Phase 2 |
| US2-AC1 | Given problem discovery complete, AI asks about primary users                     | T008       | Phase 3 |
| US2-AC2 | Given user selects persona, Target Users section populated                        | T010       | Phase 3 |
| US2-AC3 | Given custom users described, custom persona captured                             | T011       | Phase 3 |
| US3-AC1 | Given user segmentation complete, AI asks about value delivery                    | T012       | Phase 4 |
| US3-AC2 | Given value type selected, Value Proposition section populated                    | T015       | Phase 4 |
| US3-AC3 | Given value type, relevant success metrics suggested                              | T014       | Phase 4 |
| US3-AC4 | Given metrics captured, Success Metrics section has targets                       | T015       | Phase 4 |
| US4-AC1 | Given problem described, competitive research offered as optional                 | T016       | Phase 5 |
| US4-AC2 | Given user requests research, web search offered                                  | T016       | Phase 5 |
| US4-AC3 | Given user skips, "Competitive Analysis: Skipped" marked                          | T017       | Phase 5 |
| US4-AC4 | Given insights gathered, differentiation documented                               | T019       | Phase 5 |
| US5-AC1 | Given user responds with uncertainty, deeper questions offered                    | T020, T021 | Phase 6 |
| US5-AC2 | Given multiple user types, additional segmentation offered                        | T022       | Phase 6 |
| US5-AC3 | Given smooth discovery, proceed without extra depth                               | T023       | Phase 6 |
| US5-AC4 | Given adaptive depth triggers, context-appropriate questions asked                | T021       | Phase 6 |
| US6-AC1 | Given discovery complete, Memory entries created                                  | T024-T026  | Phase 7 |
| US6-AC2 | Given Memory entries exist, research loads via MemoryManager                      | T027       | Phase 7 |
| US6-AC3 | Given Memory entries exist, spec auto-populates from discovery                    | T028       | Phase 7 |
| US6-AC4 | Given Memory entries have tags, ContextBuilder uses for relevance                 | T024-T026  | Phase 7 |
| US7-AC1 | Given user starts orchestrator, "Skip Discovery" available                        | T003       | Phase 1 |
| US7-AC2 | Given user selects skip, standard routing proceeds                                | T030       | Phase 8 |
| US7-AC3 | Given user skips, no discovery.md exists                                          | T031       | Phase 8 |

### Plan Phase Coverage

| Phase             | Task Count | Coverage |
| ----------------- | ---------- | -------- |
| Phase 1: Setup    | 3          | 100%     |
| Phase 2: US1 (P1) | 4          | 100%     |
| Phase 3: US2 (P1) | 4          | 100%     |
| Phase 4: US3 (P1) | 4          | 100%     |
| Phase 5: US4 (P2) | 4          | 100%     |
| Phase 6: US5 (P2) | 4          | 100%     |
| Phase 7: US6 (P2) | 5          | 100%     |
| Phase 8: US7 (P3) | 3          | 100%     |
| Phase 9: Polish   | 5          | 100%     |

### Functional Requirement Coverage

| FR-ID  | Requirement                                                           | Task(s)                | Status  |
| ------ | --------------------------------------------------------------------- | ---------------------- | ------- |
| FR-001 | Present discovery questions using AskUserQuestion with options tables | T004, T008, T012, T016 | COVERED |
| FR-002 | Provide AI recommendations with reasoning                             | T005, T009, T014       | COVERED |
| FR-003 | Accept "yes"/"recommended" shortcuts                                  | T006                   | COVERED |
| FR-004 | Create discovery.md artifact in feature directory                     | T007, T010, T015, T018 | COVERED |
| FR-005 | Create Memory entries for key discovery findings                      | T024, T025, T026       | COVERED |
| FR-006 | Preserve backward compatibility - skip option                         | T003, T029-T031        | COVERED |
| FR-007 | Detect uncertainty signals and offer deeper exploration               | T020-T023              | COVERED |
| FR-008 | Sync updated orchestrator to extension/resources/                     | T032-T034              | COVERED |
| FR-009 | Auto-populate spec.md sections from discovery findings                | T028                   | COVERED |
| FR-010 | Pass discovery context to /1_gofer_research                           | T027                   | COVERED |

## Coverage Summary

- **Plan Phases**: 9/9 covered (100%)
- **User Stories**: 7/7 covered (100%)
- **Acceptance Criteria**: 26/26 covered (100%)
- **Functional Requirements**: 10/10 covered (100%)

**Status**: VALIDATION PASSED ✓

---

## Edge Case Coverage

| Edge Case                                    | Task(s) | Resolution                                          |
| -------------------------------------------- | ------- | --------------------------------------------------- |
| User abandons discovery mid-flow             | T035    | Save partial discovery.md with status: incomplete   |
| User re-runs discovery on existing feature   | T036    | Ask whether to merge or replace existing discovery  |
| Discovery.md exists but is outdated          | T036    | Offer to refresh discovery or proceed with existing |
| Web search fails during competitive research | T017    | Continue without competitive analysis, log failure  |
