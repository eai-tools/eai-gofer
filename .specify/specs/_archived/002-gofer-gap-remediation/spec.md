---
id: '002-gofer-gap-remediation'
title: 'Gofer Engineering Gap Remediation'
status: 'draft'
created: '2026-02-28'
updated: '2026-03-01'
priority: 'high'
assignee: 'engineer-agent'
---

# Gofer Engineering Gap Remediation

## Overview

The Gofer pipeline orchestration is entirely prompt-driven with no persistent
state, no inter-stage content validation, no unified observability, and several
fully-implemented subsystems (ScopeGuard, telemetry) that are never activated.
This feature remediates 5 engineering gaps identified in the 2026 gap analysis,
anchored by a foundational pipeline state machine that provides the correlation
ID and persistence layer the other gaps depend on.

**Research Reference**: See `research.md` for codebase analysis, integration
points, and technology decisions.

**Target Users**: Gofer pipeline users (developers running the /0-/6 stage
pipeline) and Gofer extension maintainers.

**Primary Value**: Pipeline reliability (prevent chain loss on context
compression), observability (correlate events across subsystems), and safety
(activate dormant protection mechanisms).

---

## User Scenarios & Testing

### US1: Pipeline State Persistence (P1)

A developer runs `/0_business_scenario` to start a 6-stage pipeline. Midway
through `/3_gofer_plan`, Claude Code's context compresses. After compression,
the pipeline continues to `/4_gofer_tasks` without losing its place, because a
persistent `pipeline-state.json` file tracks which stages have completed and
which is current.

**Why this priority**: This is the foundation. The engineering review identified
the prompt-only auto-chain as the single most impactful fragility. Without this,
all other gaps lack a persistent identity (runId) to correlate against.

**Independent Test**: Run check-prerequisites.sh on a feature directory with
pipeline-state.json present — it should read and report current stage. Create a
pipeline-state.json manually, then run the orchestrator — it should resume from
the recorded stage.

**Acceptance Criteria**:

- [ ] AC-1.1: Each pipeline stage creates/updates `pipeline-state.json` in the
      feature directory with `currentStage`, `completedStages[]`, `runId`, and
      timestamps
- [ ] AC-1.2: The orchestrator (`/0_business_scenario`) reads
      `pipeline-state.json` to determine resume point, in addition to
      file-existence checks
- [ ] AC-1.3: A new `pipeline-state.sh` bash script provides `read`, `update`,
      and `init` operations for use by all stage scripts
- [ ] AC-1.4: Each stage's command file (`.claude/commands/1-6_*.md`) includes
      instructions to call `pipeline-state.sh update` on stage completion
- [ ] AC-1.5: `pipeline-state.json` includes a UUID `runId` that persists across
      the entire pipeline run
- [ ] AC-1.6: `check-prerequisites.sh` reads `pipeline-state.json` (when
      present) and includes `currentStage` and `runId` in its `--json` output

---

### US2: Typed Artifact Validation Between Stages (P1)

A developer completes `/2_gofer_specify` and the pipeline auto-chains to
`/3_gofer_plan`. Before `/3_gofer_plan` begins, a validation script checks that
`spec.md` has valid YAML frontmatter (required fields: `id`, `title`, `status`,
`created`), required sections (`## User Scenarios`, `## Requirements`,
`## Success Criteria`), and at least one acceptance criterion. If validation
fails, the developer sees a clear error message listing what's missing.

**Why this priority**: This is the #1 gap from the engineering review.
Currently, a zero-byte `plan.md` passes check-prerequisites.sh. Content
validation prevents garbage-in/garbage-out across stage boundaries.

**Independent Test**: Create a spec.md with missing required sections, run
validate-artifact.sh — it should report specific missing fields/sections. Create
a valid spec.md — it should pass.

**Acceptance Criteria**:

- [ ] AC-2.1: JSON Schema files exist for `spec.md`, `plan.md`, and `tasks.md`
      frontmatter (`extension/src/schemas/artifact-*.schema.json`)
- [ ] AC-2.2: A `validate-artifact.sh` bash script validates any artifact
      against its schema, checking both YAML frontmatter fields and required
      markdown sections
- [ ] AC-2.3: `validate-artifact.sh` reports errors with specific field names
      and expected values (not just "invalid")
- [ ] AC-2.4: Each pipeline stage's command file (`.claude/commands/*.md`)
      includes a `## Required Output Schema` section documenting the exact
      frontmatter fields and sections the LLM must produce
- [ ] AC-2.5: `check-prerequisites.sh` calls `validate-artifact.sh` for content
      validation in addition to file-existence checks
- [ ] AC-2.6: Validation is additive — specs with extra sections or fields
      beyond the schema still pass (no `additionalProperties: false` on markdown
      sections)

---

### US3: Unified Run Ledger with Correlation IDs (P2)

A Gofer maintainer investigating a pipeline failure opens
`.specify/logs/gofer-run-ledger.jsonl` and filters by `runId` to see a
chronological timeline of ALL events across the pipeline: stage transitions,
context health alerts, ScopeGuard violations, slop reductions, validation
findings, and cost metrics — all correlated under a single identifier.

**Why this priority**: The 8 existing JSONL files have no shared correlation ID.
Debugging requires manually cross-referencing timestamps. A unified ledger is
the #2 gap.

**Independent Test**: Run a pipeline stage, then read gofer-run-ledger.jsonl —
verify all event types from that stage share the same runId. Filter by runId and
verify chronological ordering.

**Acceptance Criteria**:

- [ ] AC-3.1: A `RunLedger` TypeScript class writes to
      `.specify/logs/gofer-run-ledger.jsonl` following the ContextUsageLogger
      pattern
- [ ] AC-3.2: Every ledger entry includes `runId`, `timestamp`, `eventType`,
      `stage`, and `feature` fields
- [ ] AC-3.3: The `runId` comes from `pipeline-state.json` (generated in US1)
- [ ] AC-3.4: Existing JSONL loggers (`log-stage.sh`, `ContextUsageLogger`,
      `SlopReducer`) emit milestone events to the ledger without modifying their
      existing log files
- [ ] AC-3.5: The ledger does NOT duplicate high-frequency events (e.g., 10s
      health_check polling). Only milestone events (stage start/complete, health
      status changes, violations, findings) are correlated
- [ ] AC-3.6: The `log-stage.sh` bash script emits ledger entries for stage
      start/complete/error events
- [ ] AC-3.7: Ledger entries can be filtered by `runId`, `eventType`, and
      `stage`

---

### US4: ScopeGuard Activation with Tool Audit Trail (P2)

A developer runs the autonomous pipeline on a feature. ScopeGuard is now active
in `warning` mode. When the agent modifies a file listed in
`## Protected Boundaries` of spec.md, a yellow diagnostic appears in VSCode's
Problems panel, and the violation is logged to `tool-audit.jsonl` with the agent
name, file path, and enforcement mode.

**Why this priority**: ScopeGuard is fully implemented but never instantiated.
This is a low-effort, high-safety fix. The audit trail provides visibility into
what agents actually do.

**Independent Test**: Create a spec.md with a Protected Boundaries section
listing a file. Instantiate ScopeGuard, load from spec, and check against that
file — it should record a violation and produce a diagnostic. Verify
tool-audit.jsonl contains the entry.

**Acceptance Criteria**:

- [ ] AC-4.1: ScopeGuard is instantiated during `initializeForWorkspace()` in
      extension.ts and loaded from the current spec's Protected Boundaries
      section
- [ ] AC-4.2: Default enforcement mode is `'warning'` (changed from
      `'advisory'`)
- [ ] AC-4.3: Enforcement mode is configurable via `gofer.scopeGuard.mode`
      VSCode setting (values: `advisory`, `warning`, `blocking`)
- [ ] AC-4.4: ScopeGuard violations produce VSCode diagnostics at the mapped
      severity (Information/Warning/Error per EventHandlers)
- [ ] AC-4.5: A `ToolAuditLogger` class logs all ScopeGuard check invocations to
      `.specify/logs/tool-audit.jsonl` with fields: `timestamp`, `runId`,
      `agent`, `filePath`, `protectedPattern`, `enforcement`, `outcome`
      (allowed/warned/blocked)
- [ ] AC-4.6: Tool audit entries are also emitted to the unified run ledger
      (US3)
- [ ] AC-4.7: In `blocking` mode, `ScopeGuard.check()` throws a
      `ScopeViolationError` instead of just returning the pattern

---

### US5: Golden Task Regression Suite (P3)

A maintainer changes `validate-artifact.sh` or a command file prompt. Running
`npm test` includes regression tests that re-validate 5 known-good feature spec
directories against the artifact schemas. If any golden task fails validation,
the test fails with a clear message identifying which artifact and which schema
field failed.

**Why this priority**: Without regression, pipeline changes can silently break
artifact quality. This is a "trust but verify" mechanism. Lower priority because
it depends on US2's schemas.

**Independent Test**: Run the golden task regression suite — all tasks should
pass. Intentionally break a golden task's frontmatter — the test should fail
with a specific error.

**Acceptance Criteria**:

- [ ] AC-5.1: A `tests/regression/golden-tasks/` directory contains at least 3
      curated feature spec directories with all essential artifacts (spec.md,
      plan.md, tasks.md)
- [ ] AC-5.2: A Vitest test file
      (`tests/regression/validate-golden-tasks.test.ts`) iterates over golden
      task directories and runs `validate-artifact.sh` on each artifact
- [ ] AC-5.3: Golden tasks are curated from real successful specs (starting with
      `001-gofer-engineering-remediation`)
- [ ] AC-5.4: Test failure messages identify the specific golden task, artifact,
      and validation error
- [ ] AC-5.5: Golden tasks run as part of `npm test` (included in
      vitest.config.ts `include` patterns)
- [ ] AC-5.6: A `tests/regression/README.md` documents how to add new golden
      tasks

---

### US6: Cost Budget Enforcement (P3)

A developer configures `gofer.budgets.maxCostUsd: 5.0` in VSCode settings.
During a pipeline run, the ContextBuilder tracks cumulative token usage and
estimated cost. When the pipeline approaches 80% of the budget, a warning
notification appears. If the budget is exceeded, the behavior depends on the
enforcement mode: `advisory` logs a warning, `truncate` reduces context
aggressively, `blocking` halts the pipeline with a budget-exceeded message.

**Why this priority**: Cost governance is a real gap but lower urgency since
Gofer is a development tool, not a production agent. Builds on the existing
ContextBuilder budget infrastructure.

**Independent Test**: Configure a $1.00 budget, simulate token usage exceeding
it — verify the configured enforcement behavior triggers.

**Acceptance Criteria**:

- [ ] AC-6.1: `gofer.budgets.maxCostUsd` setting with default of `10.0`
      (configurable via VSCode settings)
- [ ] AC-6.2: `gofer.budgets.maxTokensPerRun` setting with default of `500000`
      tokens
- [ ] AC-6.3: `gofer.budgets.enforcementMode` setting with values `advisory`
      (default), `truncate`, `blocking`
- [ ] AC-6.4: ContextBuilder tracks cumulative cost using the council
      UsageLogger's per-provider rate estimation
- [ ] AC-6.5: Warning notification at 80% of budget threshold
- [ ] AC-6.6: Enforcement action at 100% of budget (log warning / reduce context
      / halt pipeline depending on mode)
- [ ] AC-6.7: Budget status is visible in the context health status bar item
      (existing ContextHealthStatusBar)
- [ ] AC-6.8: Budget events are emitted to the unified run ledger (US3)

---

### Edge Cases

- What happens if `pipeline-state.json` is corrupted or has invalid JSON? →
  Treat as missing; fall back to file-existence-based resume. Log a warning.
- What happens if `validate-artifact.sh` runs on a spec from before schemas
  existed? → Validation is advisory during the transition period. Legacy specs
  without frontmatter get a "missing frontmatter" warning, not a hard failure.
- What happens if `jq` is not installed? → `pipeline-state.sh` checks for `jq`
  availability and falls back to `python3 -c "import json; ..."` or reports a
  clear error.
- What happens if the cost budget is exceeded during the validation stage? →
  Validation completes (it's read-only and low-cost). Budget enforcement
  primarily targets research and implementation stages.
- What happens if ScopeGuard in blocking mode prevents a needed file
  modification? → The developer can change the mode to `warning` via settings.
  The blocking mode is opt-in, not the default.

---

## Functional Requirements

### FR-001: Pipeline State Machine

System MUST maintain a `pipeline-state.json` file in each feature's spec
directory that tracks the pipeline run identity, current stage, and stage
completion history.

- **Validation**: Verify file is created on pipeline init, updated on each stage
  transition, and readable by both bash and TypeScript
- **Integration**: Extends `check-prerequisites.sh` and `log-stage.sh` in
  `.specify/scripts/bash/`

### FR-002: Artifact Schema Definitions

System MUST provide JSON Schema definitions for the YAML frontmatter of
`spec.md`, `plan.md`, and `tasks.md` artifacts.

- **Validation**: Run AJV validation against known-good and known-bad
  frontmatter samples
- **Integration**: Schemas stored in `extension/src/schemas/` alongside existing
  `config.schema.json`

### FR-003: Inter-Stage Content Validation

System MUST validate artifact content structure (required sections, non-empty
fields) in addition to YAML frontmatter before each stage transition.

- **Validation**: Run `validate-artifact.sh` on a spec missing required sections
  — verify clear error messages
- **Integration**: Extends `check-prerequisites.sh` flow; called by each stage's
  bash preamble

### FR-004: Unified Run Ledger

System MUST provide a single JSONL log file that correlates events from all
subsystems under a shared `runId`.

- **Validation**: Run a pipeline stage and verify all event types appear in the
  ledger with the same runId
- **Integration**: New `RunLedger.ts` class consumed by existing loggers;
  `log-stage.sh` writes bash-side entries

### FR-005: ScopeGuard Production Activation

System MUST instantiate ScopeGuard during extension workspace initialization and
load protected boundaries from the active spec.

- **Validation**: Activate extension with a spec containing Protected Boundaries
  — verify diagnostics appear for protected file access
- **Integration**: Wired in `extension.ts` `initializeForWorkspace()` ; existing
  EventHandlers diagnostic mapping

### FR-006: Tool Audit Logging

System MUST log all ScopeGuard check invocations to a dedicated audit JSONL file
and to the unified run ledger.

- **Validation**: Trigger a ScopeGuard check — verify entries in both
  `tool-audit.jsonl` and `gofer-run-ledger.jsonl`
- **Integration**: New `ToolAuditLogger.ts` following ContextUsageLogger pattern

### FR-007: Golden Task Regression Suite

System MUST include a set of known-good feature specs that are validated on
every test run to catch pipeline regressions.

- **Validation**: Run `npm test` — verify golden task tests execute and pass
- **Integration**: Vitest test in `tests/regression/`; reuses
  `validate-artifact.sh`

### FR-008: Cost Budget Configuration

System MUST allow users to configure maximum cost (USD) and token limits per
pipeline run via VSCode settings.

- **Validation**: Set budget to $1, simulate exceeding it — verify enforcement
  behavior
- **Integration**: ConfigManager settings pattern; ContextBuilder budget system
  extension

### FR-009: Command Output Schema Documentation

Each pipeline command file MUST include a `## Required Output Schema` section
that documents the exact frontmatter fields and markdown sections the LLM is
expected to produce.

- **Validation**: Read each command file — verify schema section exists and
  matches the corresponding JSON Schema
- **Integration**: `.claude/commands/1-6_*.md` prompt files

---

## Non-Functional Requirements

### Performance

- Pipeline state read/write operations complete in <50ms (JSON file I/O)
- Artifact validation completes in <500ms per artifact (regex-based section
  checking + AJV frontmatter validation)
- Unified ledger write operations are non-blocking (async append)
- Golden task regression suite completes in <10s for 5 golden tasks

### Security

- `pipeline-state.sh` sanitizes feature directory paths to prevent path
  traversal
- `validate-artifact.sh` does not execute any content from the artifact files
  (no eval)
- ScopeGuard blocking mode prevents unauthorized file modifications in protected
  boundaries
- Tool audit trail is append-only (no deletion API)

### Compatibility

- All bash scripts check for `jq` availability with a fallback to `python3 -c`
- Existing JSONL consumers are not broken — new fields are additive only
- Legacy specs without YAML frontmatter produce validation warnings, not errors
- Pipeline-state.json is optional — the pipeline still works via file-existence
  checks if the state file is missing

---

## Success Criteria

| Metric                       | Target                                                          | Measurement                                        |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Pipeline resume accuracy     | 100% correct stage detection when pipeline-state.json exists    | Test: corrupt context mid-pipeline, verify resume  |
| Artifact validation coverage | 100% of required frontmatter fields checked for spec/plan/tasks | Count fields in JSON Schema vs fields validated    |
| Ledger correlation           | 100% of milestone events from a single run share the same runId | Filter ledger by runId, verify completeness        |
| ScopeGuard activation        | Diagnostics visible in VSCode Problems panel                    | Manual: modify a protected file, verify diagnostic |
| Golden task regression       | 0 false negatives on known-good specs                           | Run test suite, verify all pass                    |
| Cost budget enforcement      | Warning fires at 80% threshold                                  | Configure $1 budget, generate >$0.80 in tokens     |

---

## Key Entities

- **PipelineState**: runId (UUID), featureId, currentStage, completedStages[],
  startedAt, updatedAt, runMetrics{}
- **ArtifactSchema**: schemaId, artifactType (spec/plan/tasks),
  requiredFrontmatter{}, requiredSections[], validationRules[]
- **RunLedgerEntry**: runId, timestamp, eventType, stage, feature, source
  (subsystem name), severity, data{}
- **ToolAuditEntry**: runId, timestamp, agent, filePath, protectedPattern,
  enforcement, outcome
- **GoldenTask**: taskId, featureDir, artifacts[], expectedValidationResult
- **CostBudget**: maxCostUsd, maxTokensPerRun, enforcementMode, currentCostUsd,
  currentTokens

---

## Assumptions

- `jq` is available on developer machines (standard on macOS and most Linux). A
  Python fallback is provided for environments without it.
- The existing `check-prerequisites.sh` and `log-stage.sh` scripts can be
  extended without breaking the 13 command files that call them.
- YAML frontmatter in markdown files follows the `---\n...\n---` convention
  already used by all existing Gofer artifacts.
- The engineering review's priority ordering (pipeline state → typed schemas →
  unified ledger → ScopeGuard → golden tasks → cost budgets) is the correct
  implementation sequence.
- Adding ~6 new TypeScript source files and ~4 new bash scripts is within the
  project's maintenance capacity.
- The existing 001-gofer-engineering-remediation spec directory is suitable as
  the first golden task (all artifacts present and validated).
- ContextBuilder's existing `budgetEnforcementMode` mechanism can be extended
  for cost limits without architectural changes.

---

## Dependencies

- **AJV library**: Already a dependency
  (`extension/src/autonomous/schemaValidator.ts` uses it). No new packages
  needed.
- **UUID generation**: `crypto.randomUUID()` available in Node.js 20.x LTS. No
  new packages needed.
- **jq**: External CLI tool for bash JSON parsing. Fallback to Python3 provided.
- **Existing scripts**: `check-prerequisites.sh`, `log-stage.sh`, `common.sh` —
  will be extended.
- **Existing classes**: `ContextUsageLogger` (pattern reference), `ScopeGuard`
  (activation), `ContextBuilder` (budget extension), `ConfigManager` (settings
  pattern).
- **Existing tests**: `tests/unit/autonomous/`, `tests/unit/parser/` — new tests
  follow same patterns.

---

## Out of Scope

- **Replacing existing JSONL files**: The 8 existing log files continue working
  unchanged. The unified ledger is additive.
- **OpenTelemetry integration**: Industry-standard tracing is too heavy for a
  dev tool. The ledger uses a simpler approach.
- **Telemetry system activation**: The 562-line dead telemetry system
  (`utils/telemetry.ts`) is NOT wired up as part of this feature.
- **GoferParser strictness changes**: The parser remains tolerant. Schema
  validation is a separate layer that runs before parsing.
- **CI/CD pipeline integration**: Golden tasks run locally via `npm test`. CI
  integration is a future enhancement.
- **Dashboard/UI for the run ledger**: No VSCode panel or web UI. The ledger is
  consumed via `grep`/`jq` on the JSONL file.
- **Real-time cost tracking via API**: Cost estimation uses static per-provider
  rates, not live API usage data.

---

## Protected Boundaries

- `extension/src/extension.ts` — Entry point; import ordering and synchronous
  registration are critical
- `extension/src/goferParser.ts` — Powers tree view; tolerance behavior must not
  change
- `extension/src/autonomous/ContextBuilder.ts` — Complex budget calculation;
  extend carefully
- `.claude/commands/0_business_scenario.md` — Master orchestrator; prompt
  changes affect all pipeline behavior

---

## Glossary

| Term            | Definition                                                                              |
| --------------- | --------------------------------------------------------------------------------------- |
| Pipeline state  | The JSON file tracking which stages have completed for a feature                        |
| runId           | UUID that uniquely identifies a single pipeline execution (research through validation) |
| Artifact schema | JSON Schema definition for the required structure of a pipeline output file             |
| Run ledger      | Unified JSONL log correlating events from all subsystems under a shared runId           |
| Golden task     | A known-good feature spec directory used for regression testing                         |
| ScopeGuard      | Mechanism that warns/blocks when agents modify files outside spec-defined boundaries    |
| Cost budget     | Configurable maximum token/dollar spend per pipeline run                                |

---

## Research Traceability

| Research Finding                                      | Spec Section         | Reference                        |
| ----------------------------------------------------- | -------------------- | -------------------------------- |
| Auto-chaining is 100% prompt-driven, no state machine | US1, FR-001          | Pipeline State Machine           |
| check-prerequisites.sh validates file existence only  | US2, FR-003          | Inter-Stage Content Validation   |
| 8 JSONL files with no shared correlation ID           | US3, FR-004          | Unified Run Ledger               |
| ScopeGuard: fully implemented, never instantiated     | US4, FR-005          | ScopeGuard Production Activation |
| context-usage.jsonl is 43MB (10s polling)             | AC-3.5               | Milestone-only ledger events     |
| GoferParser: all-optional interfaces                  | Out of Scope         | Parser tolerance unchanged       |
| Telemetry system: dead code                           | Out of Scope         | Not activated in this feature    |
| AJV already a dependency                              | Dependencies         | Reuse existing schemaValidator   |
| ContextBuilder has budgetEnforcementMode              | US6, FR-008          | Cost Budget extension            |
| Bash scripts use common.sh pattern                    | FR-001, FR-003       | Script extension pattern         |
| Existing test patterns (temp dir, mocked fs)          | US5, FR-007          | Golden task test patterns        |
| Extension.ts strict import ordering                   | Protected Boundaries | Careful ScopeGuard wiring        |
| ConfigManager 3-step settings pattern                 | US4 (AC-4.3), US6    | New VSCode settings              |
| Council UsageLogger cost estimation                   | AC-6.4               | Reuse rate estimation            |
