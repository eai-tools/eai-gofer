---
feature: 011-context-health-recursive-memory
spec: spec.md
plan: plan.md
tasks: tasks.md
status: validated
created: '2026-01-25'
---

# Traceability Matrix: Context Health and Recursive Memory Enhancement

## Overview

This document validates coverage between specification requirements,
implementation plan phases, and task breakdown to ensure complete and traceable
implementation.

---

## User Story → Plan → Task Coverage

### US1: Automatic Context Health Monitoring (P1)

**Spec Acceptance Criteria**: | # | Criterion | Plan Phase | Tasks | Status |
|---|-----------|------------|-------|--------| | 1 | Context usage displayed in
status bar | Phase 2.3 | T025-T029 | ✅ Covered | | 2 | Warning at 50%, alert at
70% | Phase 2.1 | T018, T019 | ✅ Covered | | 3 | Automatic handoff at threshold
| Phase 2.4 | T030-T033 | ✅ Covered | | 4 | Health metrics logged to JSONL |
Phase 2.2 | T021-T024 | ✅ Covered |

**Coverage**: 4/4 criteria (100%)

---

### US2: Observation Masking (P1)

**Spec Acceptance Criteria**: | # | Criterion | Plan Phase | Tasks | Status |
|---|-----------|------------|-------|--------| | 1 | Observations older than N
turns masked | Phase 1.1 | T004, T005 | ✅ Covered | | 2 | Placeholders include
path, size, timestamp | Phase 1.1 | T005 | ✅ Covered | | 3 | Full observations
recoverable via MCP tool | Phase 1.2 | T008-T010 | ✅ Covered | | 4 | 50%
reduction in context usage | Phase 1.3 | T012-T014 | ✅ Covered |

**Coverage**: 4/4 criteria (100%)

---

### US3: Research Document Optimization (P2)

**Spec Acceptance Criteria**: | # | Criterion | Plan Phase | Tasks | Status |
|---|-----------|------------|-------|--------| | 1 | Research split into
semantic chunks | Phase 5.1 | T051-T052 | ✅ Covered | | 2 | Index always
loaded, chunks on-demand | Phase 5.3 | T059-T061 | ✅ Covered | | 3 | Relevance
scoring prioritizes chunks | Phase 5.3 | T060 | ✅ Covered | | 4 | 60% reduction
in research context | Phase 5.3 | T062 | ✅ Covered |

**Coverage**: 4/4 criteria (100%)

---

### US4: Memory-First Loading (P1)

**Spec Acceptance Criteria**: | # | Criterion | Plan Phase | Tasks | Status |
|---|-----------|------------|-------|--------| | 1 | Stage startup loads
relevant memories first | Phase 4.2 | T047 | ✅ Covered | | 2 | Research chunks
loaded if memories insufficient | Phase 4.2 | T048-T049 | ✅ Covered | | 3 |
Memory priority determines loading order | Phase 4.1 | T043-T044 | ✅ Covered |
| 4 | Builds on spec 010 memory system | Phase 4.1 | T043 | ✅ Covered |

**Coverage**: 4/4 criteria (100%)

---

### US5: Stage-Aware Context Profiles (P2)

**Spec Acceptance Criteria**: | # | Criterion | Plan Phase | Tasks | Status |
|---|-----------|------------|-------|--------| | 1 | Each stage has defined
budget profile | Phase 3.1 | T034-T036 | ✅ Covered | | 2 | Automatic adjustment
at stage transitions | Phase 3.2 | T041 | ✅ Covered | | 3 | Profiles
configurable in YAML | Phase 3.1 | T034 | ✅ Covered | | 4 | Warning when stage
exceeds budget | Phase 3.2 | T040 | ✅ Covered |

**Coverage**: 4/4 criteria (100%)

---

### US6: RLM-Lite Context Folding (P3 - Future)

**Spec Acceptance Criteria**: | # | Criterion | Plan Phase | Tasks | Status |
|---|-----------|------------|-------|--------| | 1 | Context stored as external
variable | - | - | ⏸️ Deferred | | 2 | Peek, grep, expand operations | - | - |
⏸️ Deferred | | 3 | 10x effective context capacity | - | - | ⏸️ Deferred | | 4 |
No degradation in output quality | - | - | ⏸️ Deferred |

**Coverage**: 0/4 criteria (Intentionally deferred per plan.md)

---

## Non-Functional Requirements → Tasks

### Performance Requirements

| Requirement                   | Spec NFR    | Tasks | Verification     |
| ----------------------------- | ----------- | ----- | ---------------- |
| Observation masking <10ms     | Performance | T076  | Benchmark test   |
| Context health check <50ms    | Performance | T077  | Benchmark test   |
| Memory loading <200ms         | Performance | T078  | Benchmark test   |
| Research chunk loading <100ms | Performance | T062  | Integration test |

**Coverage**: 4/4 (100%)

---

### Observability Requirements

| Requirement                            | Spec NFR      | Tasks     | Verification |
| -------------------------------------- | ------------- | --------- | ------------ |
| All context operations logged to JSONL | Observability | T021-T024 | Unit tests   |
| Context metrics available via command  | Observability | T026-T027 | UI tests     |
| Health history viewable in dashboard   | Observability | T068-T070 | UI tests     |

**Coverage**: 3/3 (100%)

---

### Compatibility Requirements

| Requirement                               | Spec NFR      | Tasks                  | Verification      |
| ----------------------------------------- | ------------- | ---------------------- | ----------------- |
| Preserve all existing Gofer functionality | Compatibility | T014, T042, T050, T062 | Integration tests |
| Work with existing memory system          | Compatibility | T043-T046              | Unit tests        |
| Integrate with session save/resume        | Compatibility | T032                   | E2E tests         |
| Claude Code compatibility                 | Compatibility | T072                   | E2E tests         |

**Coverage**: 4/4 (100%)

---

### Reliability Requirements

| Requirement                       | Spec NFR    | Tasks     | Verification      |
| --------------------------------- | ----------- | --------- | ----------------- |
| Observation recovery 100% success | Reliability | T009-T010 | Integration tests |
| Memory consolidation idempotent   | Reliability | T046      | Unit tests        |
| Stage checkpoints restorable      | Reliability | T074      | E2E tests         |

**Coverage**: 3/3 (100%)

---

## Plan Phase → Task Mapping

### Phase 1: Foundation - Observation Masking

| Plan Section                        | Tasks     | Count  |
| ----------------------------------- | --------- | ------ |
| 1.1 Create ObservationMasker Module | T001-T006 | 6      |
| 1.1 Unit Tests                      | T007      | 1      |
| 1.2 Create MCP Tool                 | T008-T010 | 3      |
| 1.3 Integrate with ContextBuilder   | T011-T014 | 4      |
| **Phase 1 Total**                   |           | **14** |

---

### Phase 2: Context Health Monitoring

| Plan Section                      | Tasks     | Count  |
| --------------------------------- | --------- | ------ |
| 2.1 Create ContextHealthMonitor   | T015-T020 | 6      |
| 2.2 Create Context Usage Logger   | T021-T024 | 4      |
| 2.3 VSCode Status Bar Integration | T025-T029 | 5      |
| 2.4 Auto-Handoff Trigger          | T030-T033 | 4      |
| **Phase 2 Total**                 |           | **19** |

---

### Phase 3: Stage-Aware Context Profiles

| Plan Section                           | Tasks     | Count |
| -------------------------------------- | --------- | ----- |
| 3.1 Create Stage Profile Configuration | T034-T037 | 4     |
| 3.2 Integrate with ContextBuilder      | T038-T042 | 5     |
| **Phase 3 Total**                      |           | **9** |

---

### Phase 4: Memory-First Loading

| Plan Section                      | Tasks     | Count |
| --------------------------------- | --------- | ----- |
| 4.1 Enhance MemoryManager         | T043-T046 | 4     |
| 4.2 Update ContextBuilder Loading | T047-T050 | 4     |
| **Phase 4 Total**                 |           | **8** |

---

### Phase 5: Research Document Chunking

| Plan Section                      | Tasks     | Count  |
| --------------------------------- | --------- | ------ |
| 5.1 Create ResearchChunker Module | T051-T055 | 5      |
| 5.2 Create MCP Tools              | T056-T058 | 3      |
| 5.3 Integrate with ContextBuilder | T059-T062 | 4      |
| **Phase 5 Total**                 |           | **12** |

---

### Phase 6: Telemetry and Observability

| Plan Section                    | Tasks     | Count |
| ------------------------------- | --------- | ----- |
| 6.1 Extend TelemetryIntegration | T063-T067 | 5     |
| 6.2 Dashboard Integration       | T068-T071 | 4     |
| **Phase 6 Total**               |           | **9** |

---

### Phase 7: Integration Testing and Polish

| Plan Section               | Tasks     | Count  |
| -------------------------- | --------- | ------ |
| 7.1 End-to-End Testing     | T072-T075 | 4      |
| 7.2 Performance Validation | T076-T079 | 4      |
| 7.3 Documentation          | T080-T082 | 3      |
| **Phase 7 Total**          |           | **11** |

---

## Summary Statistics

### Overall Coverage

| Category             | Covered | Total | Percentage |
| -------------------- | ------- | ----- | ---------- |
| User Stories (P1-P2) | 5       | 5     | 100%       |
| Acceptance Criteria  | 20      | 20    | 100%       |
| Performance NFRs     | 4       | 4     | 100%       |
| Observability NFRs   | 3       | 3     | 100%       |
| Compatibility NFRs   | 4       | 4     | 100%       |
| Reliability NFRs     | 3       | 3     | 100%       |

### Task Distribution

| Phase     | Tasks  | Percentage |
| --------- | ------ | ---------- |
| Phase 1   | 14     | 17%        |
| Phase 2   | 19     | 23%        |
| Phase 3   | 9      | 11%        |
| Phase 4   | 8      | 10%        |
| Phase 5   | 12     | 15%        |
| Phase 6   | 9      | 11%        |
| Phase 7   | 11     | 13%        |
| **Total** | **82** | **100%**   |

### Test Coverage Tasks

| Test Type            | Tasks                                    | Count  |
| -------------------- | ---------------------------------------- | ------ |
| Unit Tests           | T007, T020, T024, T037, T046, T055, T067 | 7      |
| Integration Tests    | T010, T014, T042, T050, T058, T062       | 6      |
| UI Tests             | T029, T071                               | 2      |
| E2E Tests            | T033, T072-T075                          | 5      |
| Performance Tests    | T076-T079                                | 4      |
| **Total Test Tasks** |                                          | **24** |

**Test Task Ratio**: 24/82 = 29% (Exceeds 20% guideline)

---

## Gaps and Risks

### Intentional Gaps

| Gap                        | Reason                              | Resolution                |
| -------------------------- | ----------------------------------- | ------------------------- |
| US6 (RLM-Lite) not covered | Deferred to future work per plan.md | Track as separate feature |

### Potential Risks

| Risk                            | Mitigation                      | Monitoring Tasks       |
| ------------------------------- | ------------------------------- | ---------------------- |
| Performance regression          | Benchmark validation            | T076-T079              |
| Breaking existing functionality | Integration tests               | T014, T042, T050, T062 |
| Information loss from masking   | Expansion tool, preserve errors | T008-T010, T005        |

---

## Validation Checklist

Before implementation:

- [x] All P1-P2 user stories have complete task coverage
- [x] All acceptance criteria mapped to specific tasks
- [x] All NFRs have verification tasks
- [x] Test tasks represent ≥20% of total (29%)
- [x] Dependencies clearly identified in tasks.md
- [x] Parallel execution opportunities documented
- [x] Risks have mitigation tasks

After each phase:

- [ ] Phase 1: Observation masking functional, 50% reduction verified
- [ ] Phase 2: Health monitoring active, auto-handoff working
- [ ] Phase 3: Stage profiles load and switch correctly
- [ ] Phase 4: Memory-first loading reduces context 40%
- [ ] Phase 5: Research chunking reduces context 60%
- [ ] Phase 6: Telemetry and dashboard complete
- [ ] Phase 7: All E2E tests pass, docs updated
