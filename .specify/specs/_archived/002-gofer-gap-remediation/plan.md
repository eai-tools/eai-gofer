---
feature: Gofer Engineering Gap Remediation
spec: spec.md
research: research.md
status: ready
created: '2026-02-28'
---

# Implementation Plan: Gofer Engineering Gap Remediation

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2 (extension), Bash (pipeline scripts)
- **Framework**: VSCode Extension API
- **Schema Validation**: AJV (existing dependency via `schemaValidator.ts`)
- **Testing**: Vitest (unit + regression), existing test infrastructure
- **Build**: Webpack (extension bundling)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PIPELINE ORCHESTRATION                     │
│                                                               │
│  .claude/commands/*.md  ──read/write──>  pipeline-state.json │
│         │                                      │              │
│         ├── pipeline-state.sh (init/update/read)              │
│         ├── validate-artifact.sh (content validation)         │
│         └── check-prerequisites.sh (extended)                 │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    OBSERVABILITY LAYER                        │
│                                                               │
│  RunLedger.ts ──writes──> gofer-run-ledger.jsonl             │
│       ↑                                                       │
│       ├── log-stage.sh (stage events)                        │
│       ├── ContextUsageLogger (health milestones)             │
│       ├── SlopReducer (fix events)                           │
│       └── ToolAuditLogger (scope checks)                     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    SAFETY LAYER                               │
│                                                               │
│  ScopeGuard ──instantiated in──> extension.ts                │
│       │                                                       │
│       ├── ToolAuditLogger ──writes──> tool-audit.jsonl       │
│       └── EventHandlers ──maps──> VSCode Diagnostics         │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    GOVERNANCE LAYER                           │
│                                                               │
│  CostBudgetEnforcer ──extends──> ContextBuilder budgets      │
│       │                                                       │
│       ├── ConfigManager (gofer.budgets.* settings)           │
│       └── ContextHealthStatusBar (budget display)            │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    QUALITY LAYER                              │
│                                                               │
│  tests/regression/golden-tasks/ ──validated by──>            │
│       validate-artifact.sh + Vitest                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component              | File                                             | Integration Type                                  |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Pipeline State         | `.specify/specs/{feature}/pipeline-state.json`   | New file, read by check-prerequisites.sh          |
| State Script           | `.specify/scripts/bash/pipeline-state.sh`        | New script, called by command files               |
| Validator Script       | `.specify/scripts/bash/validate-artifact.sh`     | New script, called by check-prerequisites.sh      |
| Artifact Schemas       | `extension/src/schemas/artifact-*.schema.json`   | New files, used by validate-artifact.sh           |
| RunLedger              | `extension/src/autonomous/RunLedger.ts`          | New class, consumed by existing loggers           |
| ToolAuditLogger        | `extension/src/autonomous/ToolAuditLogger.ts`    | New class, consumed by ScopeGuard                 |
| CostBudgetEnforcer     | `extension/src/autonomous/CostBudgetEnforcer.ts` | New class, extends ContextBuilder                 |
| ScopeGuard wiring      | `extension/src/extension.ts`                     | Modify: instantiate during initializeForWorkspace |
| ScopeGuard default     | `extension/src/autonomous/ScopeGuard.ts`         | Modify: default to 'warning', add blocking throw  |
| check-prerequisites.sh | `.specify/scripts/bash/check-prerequisites.sh`   | Modify: add state + content validation            |
| log-stage.sh           | `.specify/scripts/bash/log-stage.sh`             | Modify: emit to run ledger                        |
| ConfigManager          | `extension/src/config.ts`                        | Modify: add budget + scopeGuard settings          |
| package.json           | `extension/package.json`                         | Modify: add new configuration properties          |
| Command files          | `.claude/commands/1-6_*.md`                      | Modify: add Required Output Schema sections       |
| ContextHealthStatusBar | `extension/src/ui/ContextHealthStatusBar.ts`     | Modify: show budget status                        |

### Key Dependencies

- **AJV**: Existing in `schemaValidator.ts` — reuse the configured instance
- **crypto.randomUUID()**: Node.js 20.x built-in for runId generation
- **jq**: External CLI for bash JSON parsing (with Python3 fallback)
- **ContextUsageLogger pattern**: Template for RunLedger and ToolAuditLogger
- **ConfigManager 3-step pattern**: Template for new settings

---

## Constitution Check

- [x] **ES6 imports only**: All new TypeScript uses ES6 import syntax
- [x] **Explicit return types**: All new functions declare return types
- [x] **No `any` type**: All interfaces use proper types
- [x] **Test coverage**: Each new class gets a test file
- [x] **Async I/O**: All file writes use `fs.promises` (not sync)
- [x] **Error handling**: Graceful degradation for missing files

---

## Implementation Phases

### Phase 1: Foundation — Pipeline State Machine

**Goal**: Persistent pipeline state with runId, readable from both bash and
TypeScript

**Components**:

| File                                                 | Type | Description                                        |
| ---------------------------------------------------- | ---- | -------------------------------------------------- |
| `.specify/scripts/bash/pipeline-state.sh`            | New  | Bash script for init/read/update/status operations |
| `extension/src/schemas/pipeline-state.schema.json`   | New  | JSON Schema for pipeline-state.json validation     |
| `extension/src/autonomous/PipelineStateManager.ts`   | New  | TypeScript reader/writer for pipeline-state.json   |
| `tests/unit/autonomous/PipelineStateManager.test.ts` | New  | Unit tests                                         |
| `tests/unit/scripts/pipeline-state.test.ts`          | New  | Bash script output validation tests                |

**Tasks**:

- [ ] T001 [Setup] Create `pipeline-state.schema.json` with all fields from
      data-model
- [ ] T002 [Core] Create `pipeline-state.sh` with init/read/update/status
      commands, jq with Python3 fallback
- [ ] T003 [Core] Create `PipelineStateManager.ts` following ContextUsageLogger
      pattern (async read/write, lazy dir creation)
- [ ] T004 [Test] Create unit tests for PipelineStateManager (init creates valid
      JSON, update transitions, corrupt file fallback)
- [ ] T005 [Test] Create tests for pipeline-state.sh (verify JSON output matches
      schema)

**Verification**:

- [ ] `pipeline-state.sh init` creates valid JSON with UUID runId
- [ ] `pipeline-state.sh update --stage 3_plan` transitions correctly
- [ ] Corrupt pipeline-state.json falls back gracefully
- [ ] All tests pass

---

### Phase 2: Typed Artifact Schemas + Validation

**Goal**: JSON Schema definitions for artifacts + bash validation script +
command file schema sections

**Components**:

| File                                               | Type   | Description                                        |
| -------------------------------------------------- | ------ | -------------------------------------------------- |
| `extension/src/schemas/artifact-spec.schema.json`  | New    | JSON Schema for spec.md frontmatter                |
| `extension/src/schemas/artifact-plan.schema.json`  | New    | JSON Schema for plan.md frontmatter                |
| `extension/src/schemas/artifact-tasks.schema.json` | New    | JSON Schema for tasks.md frontmatter               |
| `.specify/scripts/bash/validate-artifact.sh`       | New    | Content validation script (frontmatter + sections) |
| `.specify/scripts/bash/check-prerequisites.sh`     | Modify | Call validate-artifact.sh, include pipeline state  |
| `.claude/commands/1_gofer_research.md`             | Modify | Add Required Output Schema section                 |
| `.claude/commands/2_gofer_specify.md`              | Modify | Add Required Output Schema section                 |
| `.claude/commands/3_gofer_plan.md`                 | Modify | Add Required Output Schema section                 |
| `.claude/commands/4_gofer_tasks.md`                | Modify | Add Required Output Schema section                 |
| `.claude/commands/5_gofer_implement.md`            | Modify | Add Required Output Schema section                 |
| `.claude/commands/6_gofer_validate.md`             | Modify | Add Required Output Schema section                 |
| `tests/unit/scripts/validate-artifact.test.ts`     | New    | Validation script tests                            |

**Tasks**:

- [ ] T006 [Core] Create `artifact-spec.schema.json` — required: id, title,
      status, created; section checks: User Scenarios, Requirements, Success
      Criteria
- [ ] T007 [Core] Create `artifact-plan.schema.json` — required: feature, spec,
      status, created; section checks: Implementation Phases, Tech Stack
- [ ] T008 [Core] Create `artifact-tasks.schema.json` — required: feature, plan,
      status, created; section checks: at least one `- [ ]` task line
- [ ] T009 [Core] Create `validate-artifact.sh` — parse YAML frontmatter,
      validate against schema, check required sections, --json output
- [ ] T010 [Integration] Extend `check-prerequisites.sh` to call
      `validate-artifact.sh` and include pipeline-state.json data in output
- [ ] T011 [Prompt] Add `## Required Output Schema` section to
      `.claude/commands/1_gofer_research.md` documenting research.md contract
- [ ] T012 [Prompt] Add `## Required Output Schema` section to
      `.claude/commands/2_gofer_specify.md` documenting spec.md contract
- [ ] T013 [Prompt] Add `## Required Output Schema` section to
      `.claude/commands/3_gofer_plan.md` documenting plan.md contract
- [ ] T014a [Prompt] Add `## Required Output Schema` section to
      `.claude/commands/4_gofer_tasks.md` documenting tasks.md contract
- [ ] T014b [Prompt] Add `## Required Output Schema` section to
      `.claude/commands/5_gofer_implement.md` documenting output conventions
- [ ] T014c [Prompt] Add `## Required Output Schema` section to
      `.claude/commands/6_gofer_validate.md` documenting validation-report.md
      contract
- [ ] T014d [Test] Create tests for validate-artifact.sh (valid spec passes,
      missing fields fails, missing sections fails, legacy spec warns)

**Verification**:

- [ ] Valid spec.md passes validation
- [ ] spec.md with missing frontmatter `id` field reports specific error
- [ ] spec.md with missing `## Requirements` section reports specific error
- [ ] Legacy spec without frontmatter produces warning not error
- [ ] check-prerequisites.sh --json output includes validation data

---

### Phase 3: Unified Run Ledger

**Goal**: Single JSONL log correlating all subsystem events under a shared runId

**Components**:

| File                                             | Type   | Description                                 |
| ------------------------------------------------ | ------ | ------------------------------------------- |
| `extension/src/autonomous/RunLedger.ts`          | New    | Unified JSONL logger with runId correlation |
| `.specify/scripts/bash/log-stage.sh`             | Modify | Emit ledger entries for stage events        |
| `.specify/scripts/bash/pipeline-state.sh`        | Modify | Pass runId to log-stage.sh                  |
| `extension/src/autonomous/ContextUsageLogger.ts` | Modify | Emit health milestone events to ledger      |
| `extension/src/autonomous/SlopReducer.ts`        | Modify | Emit fix events to ledger                   |
| `tests/unit/autonomous/RunLedger.test.ts`        | New    | Unit tests                                  |

**Tasks**:

- [ ] T015 [Core] Create `RunLedger.ts` following ContextUsageLogger pattern —
      typed interface, async append, readLog, filterByRunId, filterByEventType
- [ ] T016 [Integration] Modify `log-stage.sh` to additionally append to
      `gofer-run-ledger.jsonl` with runId from pipeline-state.json
- [ ] T017 [Integration] Add `emitToLedger()` method to ContextUsageLogger that
      emits milestone events (health status changes only, not 10s polls) to
      RunLedger
- [ ] T018 [Integration] Add `emitToLedger()` method to SlopReducer that emits
      fix events to RunLedger
- [ ] T019 [Test] Create unit tests for RunLedger (append, read, filter by
      runId, filter by eventType)
- [ ] T020 [Test] Test that log-stage.sh writes to both pipeline.jsonl and
      gofer-run-ledger.jsonl

**Verification**:

- [ ] RunLedger creates gofer-run-ledger.jsonl on first write
- [ ] All entries from a single run share the same runId
- [ ] filterByRunId returns only matching entries
- [ ] log-stage.sh writes to both log files
- [ ] Health milestone events (not 10s polls) appear in ledger

---

### Phase 4: ScopeGuard Activation + Tool Audit

**Goal**: Activate the dormant ScopeGuard, add tool audit logging, wire into
extension lifecycle

**Components**:

| File                                            | Type   | Description                                                                   |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `extension/src/autonomous/ToolAuditLogger.ts`   | New    | Tool invocation audit logger                                                  |
| `extension/src/autonomous/ScopeGuard.ts`        | Modify | Change default to warning, add ScopeViolationError, integrate ToolAuditLogger |
| `extension/src/extension.ts`                    | Modify | Instantiate ScopeGuard in initializeForWorkspace()                            |
| `extension/src/config.ts`                       | Modify | Add gofer.scopeGuard.mode setting                                             |
| `extension/package.json`                        | Modify | Add scopeGuard.mode configuration property                                    |
| `tests/unit/autonomous/ToolAuditLogger.test.ts` | New    | Unit tests                                                                    |
| `tests/unit/autonomous/ScopeGuard.test.ts`      | New    | Updated tests for new behavior                                                |

**Tasks**:

- [ ] T021 [Core] Create `ToolAuditLogger.ts` following ContextUsageLogger
      pattern — typed ToolAuditEntry, async append, optional RunLedger emission
- [ ] T022 [Core] Modify `ScopeGuard.ts`: change default from `'advisory'` to
      `'warning'`, add `ScopeViolationError` class, throw in blocking mode
- [ ] T023 [Core] Add `gofer.scopeGuard.mode` setting: CONFIG_KEYS entry,
      DEFAULTS entry, ConfigManager getter, package.json property
- [ ] T024 [Integration] Wire ScopeGuard instantiation in `extension.ts`
      `initializeForWorkspace()`: create instance, load from spec, set mode from
      config, pass to StateManager
- [ ] T025 [Integration] Wire ToolAuditLogger into ScopeGuard.check() — log
      every check invocation with outcome
- [ ] T026 [Test] Create unit tests for ToolAuditLogger (append, read, ledger
      emission)
- [ ] T027 [Test] Create unit tests for enhanced ScopeGuard (warning mode
      produces diagnostics, blocking mode throws, audit entries logged)

**Verification**:

- [ ] ScopeGuard instantiated on extension activation
- [ ] Accessing protected file produces VSCode Warning diagnostic
- [ ] Blocking mode throws ScopeViolationError
- [ ] tool-audit.jsonl entries created for every check
- [ ] Ledger receives scope_violation events

---

### Phase 5: Golden Task Regression Suite

**Goal**: Known-good feature specs validated on every test run

**Components**:

| File                                                         | Type | Description                                 |
| ------------------------------------------------------------ | ---- | ------------------------------------------- |
| `tests/regression/golden-tasks/`                             | New  | Directory of curated spec directories       |
| `tests/regression/golden-tasks/001-engineering-remediation/` | New  | First golden task (curated from real spec)  |
| `tests/regression/validate-golden-tasks.test.ts`             | New  | Vitest test that validates all golden tasks |
| `tests/regression/README.md`                                 | New  | Documentation for golden task curation      |

**Tasks**:

- [ ] T028 [Setup] Create `tests/regression/golden-tasks/` directory structure
- [ ] T029 [Core] Curate first golden task from
      `001-gofer-engineering-remediation` — copy spec.md, plan.md, tasks.md with
      minimal frontmatter
- [ ] T030 [Core] Create `validate-golden-tasks.test.ts` — iterate golden task
      dirs, run validate-artifact.sh on each artifact, assert all pass
- [ ] T031 [Core] Create at least 2 additional golden tasks (can be synthetic
      with valid structure)
- [ ] T032 [Docs] Create `tests/regression/README.md` documenting how to add
      golden tasks
- [ ] T033 [Test] Verify golden task tests run as part of `npm test`

**Verification**:

- [ ] `npm test` includes golden task regression tests
- [ ] All golden tasks pass validation
- [ ] Intentionally corrupted golden task causes test failure
- [ ] README explains the curation process

---

### Phase 6: Cost Budget Enforcement

**Goal**: Configurable cost/token limits with enforcement via ContextBuilder

**Components**:

| File                                               | Type   | Description                         |
| -------------------------------------------------- | ------ | ----------------------------------- |
| `extension/src/autonomous/CostBudgetEnforcer.ts`   | New    | Budget tracking and enforcement     |
| `extension/src/config.ts`                          | Modify | Add gofer.budgets.\* settings       |
| `extension/package.json`                           | Modify | Add budget configuration properties |
| `extension/src/ui/ContextHealthStatusBar.ts`       | Modify | Show budget status                  |
| `tests/unit/autonomous/CostBudgetEnforcer.test.ts` | New    | Unit tests                          |

**Tasks**:

- [ ] T034 [Core] Create `CostBudgetEnforcer.ts` — recordUsage(), canProceed(),
      getSnapshot(), reset(); uses council UsageLogger cost rates
- [ ] T035 [Core] Add budget settings to ConfigManager:
      `gofer.budgets.maxCostUsd` (default 10.0), `gofer.budgets.maxTokensPerRun`
      (default 500000), `gofer.budgets.enforcementMode` (default 'advisory')
- [ ] T036 [Integration] Wire CostBudgetEnforcer into ContextBuilder budget
      system — check budget on each context build
- [ ] T037 [Integration] Add budget display to ContextHealthStatusBar — show
      cost/token usage alongside context health
- [ ] T038 [Integration] Emit budget_warning and budget_exceeded events to
      RunLedger
- [ ] T039 [Test] Create unit tests for CostBudgetEnforcer
      (healthy/warning/exceeded states, enforcement modes, reset)

**Verification**:

- [ ] Budget defaults to $10 / 500K tokens
- [ ] Warning fires at 80% threshold
- [ ] Advisory mode logs warning
- [ ] Truncate mode reduces context
- [ ] Blocking mode prevents further work
- [ ] Status bar shows budget info

---

### Phase 7: Command File Updates + Polish

**Goal**: Update all command files with pipeline-state.sh calls and Required
Output Schema sections

**Tasks**:

- [ ] T040 [Prompt] Update `.claude/commands/0_business_scenario.md` to read
      pipeline-state.json for resume logic
- [ ] T041 [Prompt] Update `.claude/commands/1_gofer_research.md` to call
      `pipeline-state.sh update` on completion
- [ ] T042 [Prompt] Update `.claude/commands/2_gofer_specify.md` to call
      `pipeline-state.sh update` on completion
- [ ] T043 [Prompt] Update `.claude/commands/3_gofer_plan.md` to call
      `pipeline-state.sh update` on completion
- [ ] T044 [Prompt] Update `.claude/commands/4_gofer_tasks.md` to call
      `pipeline-state.sh update` on completion
- [ ] T045 [Prompt] Update `.claude/commands/5_gofer_implement.md` to call
      `pipeline-state.sh update` on completion
- [ ] T046 [Prompt] Update `.claude/commands/6_gofer_validate.md` to call
      `pipeline-state.sh update` on completion
- [ ] T047 [Polish] Verify all extension/resources/claude-commands/ and
      copilot-prompts/ mirrors are updated

**Verification**:

- [ ] Each command file calls pipeline-state.sh update on stage completion
- [ ] Orchestrator reads pipeline-state.json for resume
- [ ] All mirrors (extension resources, copilot prompts, github prompts) stay in
      sync

---

## File Structure

```
New Files:
  .specify/scripts/bash/pipeline-state.sh
  .specify/scripts/bash/validate-artifact.sh
  extension/src/schemas/pipeline-state.schema.json
  extension/src/schemas/artifact-spec.schema.json
  extension/src/schemas/artifact-plan.schema.json
  extension/src/schemas/artifact-tasks.schema.json
  extension/src/autonomous/PipelineStateManager.ts
  extension/src/autonomous/RunLedger.ts
  extension/src/autonomous/ToolAuditLogger.ts
  extension/src/autonomous/CostBudgetEnforcer.ts
  tests/unit/autonomous/PipelineStateManager.test.ts
  tests/unit/autonomous/RunLedger.test.ts
  tests/unit/autonomous/ToolAuditLogger.test.ts
  tests/unit/autonomous/CostBudgetEnforcer.test.ts
  tests/unit/scripts/pipeline-state.test.ts
  tests/unit/scripts/validate-artifact.test.ts
  tests/regression/golden-tasks/001-engineering-remediation/spec.md
  tests/regression/golden-tasks/001-engineering-remediation/plan.md
  tests/regression/golden-tasks/001-engineering-remediation/tasks.md
  tests/regression/validate-golden-tasks.test.ts
  tests/regression/README.md

Modified Files:
  .specify/scripts/bash/check-prerequisites.sh
  .specify/scripts/bash/log-stage.sh
  extension/src/autonomous/ScopeGuard.ts
  extension/src/autonomous/ContextUsageLogger.ts
  extension/src/autonomous/SlopReducer.ts
  extension/src/config.ts
  extension/src/extension.ts
  extension/src/ui/ContextHealthStatusBar.ts
  extension/package.json
  .claude/commands/0_business_scenario.md
  .claude/commands/1_gofer_research.md
  .claude/commands/2_gofer_specify.md
  .claude/commands/3_gofer_plan.md
  .claude/commands/4_gofer_tasks.md
  .claude/commands/5_gofer_implement.md
  .claude/commands/6_gofer_validate.md
```

## Risk Assessment

| Risk                                                 | Impact | Mitigation                                                                        |
| ---------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Extension activation breakage from ScopeGuard wiring | High   | Wire in initializeForWorkspace() (async), not activate() (sync). Test activation. |
| Command file prompt changes break LLM behavior       | Medium | Changes are additive (new sections only). Existing instruction text unchanged.    |
| jq not available on some developer machines          | Low    | Python3 fallback in pipeline-state.sh. Clear error message if neither available.  |
| Unified ledger grows too large                       | Low    | Milestone-only events (not 10s polls). File rotation is a future enhancement.     |
| Golden task curation is subjective                   | Low    | Start with real validated specs. Document selection criteria in README.           |
| Cost estimation inaccuracy                           | Low    | Advisory mode by default. Users opt-in to stricter enforcement.                   |

## Notes

- Phase 1 (Pipeline State) must complete before Phase 3 (Run Ledger) because the
  runId originates from pipeline-state.json
- Phase 2 (Schemas) must complete before Phase 5 (Golden Tasks) because golden
  tasks are validated against the schemas
- Phases 4 (ScopeGuard) and 6 (Cost Budget) are independent of each other and
  could be parallelized
- Phase 7 (Command Files) depends on Phase 1 (state script exists) and Phase 2
  (schemas defined) but can start as soon as those are done
- Total: 50 tasks across 7 phases (8 in tasks.md due to Setup/US1 split), ~20
  new files, ~17 modified files

---

## Spec Traceability

### User Story Coverage

| Story                              | Status  | Plan References                                                    |
| ---------------------------------- | ------- | ------------------------------------------------------------------ |
| US1 (P1) Pipeline State            | COVERED | Phase 1: T001-T005, PipelineStateManager, pipeline-state.sh        |
| US2 (P1) Typed Artifact Validation | COVERED | Phase 2: T006-T014, artifact schemas, validate-artifact.sh         |
| US3 (P2) Unified Run Ledger        | COVERED | Phase 3: T015-T020, RunLedger.ts, log-stage.sh modification        |
| US4 (P2) ScopeGuard + Audit        | COVERED | Phase 4: T021-T027, ToolAuditLogger, ScopeGuard mods, extension.ts |
| US5 (P3) Golden Tasks              | COVERED | Phase 5: T028-T033, golden-tasks/, validate-golden-tasks.test.ts   |
| US6 (P3) Cost Budget               | COVERED | Phase 6: T034-T039, CostBudgetEnforcer, config, status bar         |

### Requirement Coverage

| Requirement                             | Status  | Plan Reference                         |
| --------------------------------------- | ------- | -------------------------------------- |
| FR-001 Pipeline State Machine           | COVERED | Phase 1, T001-T005                     |
| FR-002 Artifact Schema Definitions      | COVERED | Phase 2, T006-T008                     |
| FR-003 Inter-Stage Content Validation   | COVERED | Phase 2, T009-T010                     |
| FR-004 Unified Run Ledger               | COVERED | Phase 3, T015-T020                     |
| FR-005 ScopeGuard Production Activation | COVERED | Phase 4, T024                          |
| FR-006 Tool Audit Logging               | COVERED | Phase 4, T021, T025                    |
| FR-007 Golden Task Regression Suite     | COVERED | Phase 5, T028-T033                     |
| FR-008 Cost Budget Configuration        | COVERED | Phase 6, T034-T035                     |
| FR-009 Command Output Schema Docs       | COVERED | Phase 2, T011-T013; Phase 7, T040-T047 |

### Acceptance Criteria Coverage

| AC                                          | Plan Task(s) | Component                               |
| ------------------------------------------- | ------------ | --------------------------------------- |
| AC-1.1 pipeline-state.json created/updated  | T002, T003   | pipeline-state.sh, PipelineStateManager |
| AC-1.2 orchestrator reads state             | T040         | 0_business_scenario.md                  |
| AC-1.3 pipeline-state.sh operations         | T002         | pipeline-state.sh                       |
| AC-1.4 command files call state update      | T041-T046    | .claude/commands/\*.md                  |
| AC-1.5 UUID runId                           | T002, T003   | pipeline-state.sh, PipelineStateManager |
| AC-1.6 check-prerequisites includes state   | T010         | check-prerequisites.sh                  |
| AC-2.1 JSON Schema files                    | T006-T008    | artifact-\*.schema.json                 |
| AC-2.2 validate-artifact.sh                 | T009         | validate-artifact.sh                    |
| AC-2.3 specific error messages              | T009         | validate-artifact.sh                    |
| AC-2.4 Required Output Schema sections      | T011-T013    | .claude/commands/\*.md                  |
| AC-2.5 check-prerequisites calls validation | T010         | check-prerequisites.sh                  |
| AC-2.6 additive validation                  | T006-T008    | Schema definitions                      |
| AC-3.1 RunLedger class                      | T015         | RunLedger.ts                            |
| AC-3.2 required entry fields                | T015         | RunLedger.ts interface                  |
| AC-3.3 runId from pipeline-state            | T016         | log-stage.sh                            |
| AC-3.4 existing loggers emit to ledger      | T017-T018    | ContextUsageLogger, SlopReducer         |
| AC-3.5 milestone events only                | T017         | ContextUsageLogger emitToLedger         |
| AC-3.6 log-stage.sh emits ledger            | T016         | log-stage.sh                            |
| AC-3.7 ledger filtering                     | T015         | RunLedger filterBy methods              |
| AC-4.1 ScopeGuard instantiated              | T024         | extension.ts                            |
| AC-4.2 default warning mode                 | T022         | ScopeGuard.ts                           |
| AC-4.3 configurable mode setting            | T023         | config.ts, package.json                 |
| AC-4.4 VSCode diagnostics                   | T024         | EventHandlers (existing)                |
| AC-4.5 ToolAuditLogger                      | T021, T025   | ToolAuditLogger.ts                      |
| AC-4.6 audit emits to ledger                | T021         | ToolAuditLogger RunLedger integration   |
| AC-4.7 blocking throws error                | T022         | ScopeGuard ScopeViolationError          |
| AC-5.1 golden-tasks directory               | T028         | tests/regression/golden-tasks/          |
| AC-5.2 validate-golden-tasks.test.ts        | T030         | Vitest test file                        |
| AC-5.3 curated from real specs              | T029         | 001-engineering-remediation             |
| AC-5.4 specific failure messages            | T030         | Test assertions                         |
| AC-5.5 runs in npm test                     | T033         | vitest.config.ts include                |
| AC-5.6 README                               | T032         | tests/regression/README.md              |
| AC-6.1 maxCostUsd setting                   | T035         | config.ts, package.json                 |
| AC-6.2 maxTokensPerRun setting              | T035         | config.ts, package.json                 |
| AC-6.3 enforcementMode setting              | T035         | config.ts, package.json                 |
| AC-6.4 ContextBuilder cost tracking         | T036         | CostBudgetEnforcer + ContextBuilder     |
| AC-6.5 warning at 80%                       | T034         | CostBudgetEnforcer                      |
| AC-6.6 enforcement at 100%                  | T034         | CostBudgetEnforcer                      |
| AC-6.7 status bar display                   | T037         | ContextHealthStatusBar                  |
| AC-6.8 budget events to ledger              | T038         | CostBudgetEnforcer → RunLedger          |

Coverage: **6/6 user stories (100%)**, **9/9 functional requirements (100%)**,
**40/40 acceptance criteria (100%)**
