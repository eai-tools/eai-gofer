# Requirement Traceability: Gofer Engineering Gap Remediation

Generated: 2026-02-28

## Spec → Plan → Tasks Mapping

### User Story Coverage

| User Story                      | Priority | Plan Phase             | Tasks                | Acceptance Criteria Status |
| ------------------------------- | -------- | ---------------------- | -------------------- | -------------------------- |
| US1: Pipeline State Persistence | P1       | Phase 1 (Foundation)   | T001-T005, T040-T046 | 6/6 covered                |
| US2: Typed Artifact Validation  | P1       | Phase 2 (Schemas)      | T006-T014d           | 6/6 covered                |
| US3: Unified Run Ledger         | P2       | Phase 3 (Ledger)       | T015-T020            | 7/7 covered                |
| US4: ScopeGuard + Tool Audit    | P2       | Phase 4 (ScopeGuard)   | T021-T027            | 7/7 covered                |
| US5: Golden Task Regression     | P3       | Phase 5 (Golden Tasks) | T028-T033            | 6/6 covered                |
| US6: Cost Budget Enforcement    | P3       | Phase 6 (Budget)       | T034-T039            | 8/8 covered                |

### Acceptance Criteria Detail

| ID     | Criterion                                  | Task(s)    | Phase   |
| ------ | ------------------------------------------ | ---------- | ------- |
| AC-1.1 | pipeline-state.json created/updated        | T002, T003 | Phase 2 |
| AC-1.2 | Orchestrator reads state for resume        | T040       | Phase 8 |
| AC-1.3 | pipeline-state.sh operations               | T002       | Phase 2 |
| AC-1.4 | Command files call state update            | T041-T046  | Phase 8 |
| AC-1.5 | UUID runId                                 | T002, T003 | Phase 2 |
| AC-1.6 | check-prerequisites includes state         | T010       | Phase 3 |
| AC-2.1 | JSON Schema files exist                    | T006-T008  | Phase 3 |
| AC-2.2 | validate-artifact.sh works                 | T009       | Phase 3 |
| AC-2.3 | Specific error messages                    | T009       | Phase 3 |
| AC-2.4 | Required Output Schema sections            | T011-T014c | Phase 3 |
| AC-2.5 | check-prerequisites calls validation       | T010       | Phase 3 |
| AC-2.6 | Additive validation                        | T006-T008  | Phase 3 |
| AC-3.1 | RunLedger class                            | T015       | Phase 4 |
| AC-3.2 | Required entry fields                      | T015       | Phase 4 |
| AC-3.3 | runId from pipeline-state                  | T016       | Phase 4 |
| AC-3.4 | Existing loggers emit to ledger            | T017-T018  | Phase 4 |
| AC-3.5 | Milestone events only                      | T017       | Phase 4 |
| AC-3.6 | log-stage.sh emits ledger                  | T016       | Phase 4 |
| AC-3.7 | Ledger filtering (runId, eventType, stage) | T015       | Phase 4 |
| AC-4.1 | ScopeGuard instantiated                    | T024       | Phase 5 |
| AC-4.2 | Default warning mode                       | T022       | Phase 5 |
| AC-4.3 | Configurable mode setting                  | T023       | Phase 5 |
| AC-4.4 | VSCode diagnostics                         | T024       | Phase 5 |
| AC-4.5 | ToolAuditLogger                            | T021, T025 | Phase 5 |
| AC-4.6 | Audit emits to ledger                      | T021       | Phase 5 |
| AC-4.7 | Blocking throws error                      | T022       | Phase 5 |
| AC-5.1 | golden-tasks directory                     | T028       | Phase 6 |
| AC-5.2 | validate-golden-tasks.test.ts              | T030       | Phase 6 |
| AC-5.3 | Curated from real specs                    | T029       | Phase 6 |
| AC-5.4 | Specific failure messages                  | T030       | Phase 6 |
| AC-5.5 | Runs in npm test                           | T033       | Phase 6 |
| AC-5.6 | README                                     | T032       | Phase 6 |
| AC-6.1 | maxCostUsd setting                         | T035       | Phase 7 |
| AC-6.2 | maxTokensPerRun setting                    | T035       | Phase 7 |
| AC-6.3 | enforcementMode setting                    | T035       | Phase 7 |
| AC-6.4 | ContextBuilder cost tracking               | T036       | Phase 7 |
| AC-6.5 | Warning at 80%                             | T034       | Phase 7 |
| AC-6.6 | Enforcement at 100%                        | T034       | Phase 7 |
| AC-6.7 | Status bar display                         | T037       | Phase 7 |
| AC-6.8 | Budget events to ledger                    | T038       | Phase 7 |

### Functional Requirement Coverage

| FR-ID  | Requirement                      | Task(s)               | Phase      |
| ------ | -------------------------------- | --------------------- | ---------- |
| FR-001 | Pipeline State Machine           | T001-T005             | Phase 1-2  |
| FR-002 | Artifact Schema Definitions      | T006-T008             | Phase 3    |
| FR-003 | Inter-Stage Content Validation   | T009-T010             | Phase 3    |
| FR-004 | Unified Run Ledger               | T015-T020             | Phase 4    |
| FR-005 | ScopeGuard Production Activation | T024                  | Phase 5    |
| FR-006 | Tool Audit Logging               | T021, T025            | Phase 5    |
| FR-007 | Golden Task Regression Suite     | T028-T033             | Phase 6    |
| FR-008 | Cost Budget Configuration        | T034-T035             | Phase 7    |
| FR-009 | Command Output Schema Docs       | T011-T014c, T040-T047 | Phase 3, 8 |

### Plan Phase Coverage

| Plan Phase                       | Task Count | Tasks Phase | Coverage |
| -------------------------------- | ---------- | ----------- | -------- |
| Phase 1: Pipeline State Machine  | 5          | Phase 1-2   | 100%     |
| Phase 2: Typed Artifact Schemas  | 12         | Phase 3     | 100%     |
| Phase 3: Unified Run Ledger      | 6          | Phase 4     | 100%     |
| Phase 4: ScopeGuard + Tool Audit | 7          | Phase 5     | 100%     |
| Phase 5: Golden Task Regression  | 6          | Phase 6     | 100%     |
| Phase 6: Cost Budget Enforcement | 6          | Phase 7     | 100%     |
| Phase 7: Command File Updates    | 8          | Phase 8     | 100%     |

### Data Model Entity Coverage

| Entity         | Implementing Task(s)                      | Fields Covered |
| -------------- | ----------------------------------------- | -------------- |
| PipelineState  | T001 (schema), T002-T003 (implementation) | Yes            |
| ArtifactSchema | T006-T008 (3 schema files)                | Yes            |
| RunLedgerEntry | T015 (RunLedger class)                    | Yes            |
| ToolAuditEntry | T021 (ToolAuditLogger class)              | Yes            |
| CostBudget     | T034-T035 (CostBudgetEnforcer + config)   | Yes            |

### API Contract Coverage

| Contract                          | Contract File             | Implementing Task(s) |
| --------------------------------- | ------------------------- | -------------------- |
| RunLedger API                     | contracts/internal-api.md | T015                 |
| ToolAuditLogger API               | contracts/internal-api.md | T021                 |
| CostBudgetEnforcer API            | contracts/internal-api.md | T034                 |
| ScopeGuard Enhancement            | contracts/internal-api.md | T022                 |
| pipeline-state.sh                 | contracts/internal-api.md | T002                 |
| validate-artifact.sh              | contracts/internal-api.md | T009                 |
| check-prerequisites.sh (extended) | contracts/internal-api.md | T010                 |

## Coverage Summary

- Plan Phases: **7/7** covered (100%)
- User Stories: **6/6** covered (100%)
- Acceptance Criteria: **40/40** covered (100%)
- Functional Requirements: **9/9** covered (100%)
- Data Entities: **5/5** covered (100%)
- API Contracts: **7/7** covered (100%)

**Status**: VALIDATION PASSED
