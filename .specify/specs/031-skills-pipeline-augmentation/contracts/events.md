# Internal Event Contract

## Summary

- External event/webhook/message contract count: **0**
- Internal lifecycle event count: **4**
- This feature introduces workflow-lifecycle checkpoints for helper invocation,
  command generation, evidence-gate evaluation, and validation-report emission.

## Event Summary

| ID | Event | Trigger | Producer | Consumer |
| --- | --- | --- | --- | --- |
| EVT-031-01 | Helper command invocation | Actor invokes a `gofer:*` helper or an approved stage-local seam | AI assistant executing the canonical helper definition | Feature artifact output plus workflow designer review |
| EVT-031-02 | Command generation run | Maintainer runs `npm run gofer:generate` | `generate-commands.mjs` and parser/schema validation | Claude, Copilot, Codex, and Gemini generated surfaces |
| EVT-031-03 | Evidence gate evaluation | `/6_gofer_validate` reaches gated rubric scoring for Categories 1, 2, 3, and 5 | Validation orchestrator, specialist agents, and automated checks | Rubric score calculator and brownfield restart decision |
| EVT-031-04 | Validation report emission | `/6_gofer_validate` completes with PASS or FAIL | Validation orchestrator | `validation-report.md`, blast-radius consumers, and audit reviewers |

## EVT-031-01 — Helper Command Invocation

- Trigger: a maintainer or workflow designer invokes `gofer:vocabulary`,
  `gofer:diagnose`, `gofer:tdd`, `gofer:spec-summary`, `gofer:zoom-out`, or an
  approved stage-local helper seam
- Producer: AI assistant executing the canonical helper definition from
  `.specify/commands/`
- Consumer: per-feature artifact output under `.specify/specs/{feature}/` and
  workflow-designer review
- Invariants:
  - Helper invocation has no side effects on pipeline state.
  - Numbered stage sequence and IDs are unchanged.
  - Stage-local invocation, when approved, preserves the standalone artifact
    format.
- Traceability: US-2, US-4; FR-001 through FR-008, FR-016, FR-017; NFR-001,
  NFR-003, NFR-006

## EVT-031-02 — Command Generation Run

- Trigger: maintainer updates canonical command files and runs
  `npm run gofer:generate`
- Producer: `.specify/scripts/node/generate-commands.mjs` plus command parsing
  and schema validation
- Consumer: generated helper surfaces in `.claude/`, `.github/`,
  `.agents/skills/gofer/`, and `.gemini/commands/gofer/`
- Invariants:
  - Canonical command descriptions are authored once, then regenerated outward.
  - Generated surfaces must not advertise behavior outside the authoritative
    contract.
  - Generated surfaces are not hand-edited after regeneration.
  - `npm run gofer:codex-doctor` verifies the Codex skill-budget ceiling and
    parity diagnostics before commit.
- Traceability: US-2, US-4; FR-006, FR-007, FR-008, FR-016; NFR-001, NFR-002,
  NFR-003

## EVT-031-03 — Evidence Gate Evaluation

- Trigger: `/6_gofer_validate` evaluates evidence-backed scoring for Categories
  1, 2, 3, and 5
- Producer: validation orchestrator, specialist validation agents, and
  automated runtime/test checks
- Consumer: rubric score calculation, fail-fast decision, and remediation loop
- Invariants:
  - Any category with absent or unverifiable evidence scores exactly 0.
  - No partial credit or implied credit is allowed.
  - Deployment/render evidence is required only when the feature puts
    deployment/render behavior in scope; otherwise `/6` records that explicitly.
  - Evidence failures block a truthful PASS and feed the restart/remediation
    path.
- Traceability: US-1, US-3; FR-009 through FR-015; NFR-004, NFR-005

## EVT-031-04 — Validation Report Emission

- Trigger: `/6_gofer_validate` finishes scoring and writes the validation output
- Producer: validation orchestrator
- Consumer: `validation-report.md`, `blast-radius-report.md`, and audit-history
  readers
- Invariants:
  - `validation-report.md` is written on both PASS and FAIL runs.
  - The evidence table is always present and includes explicit absence reasons
    for every 0-score category.
  - The evidence table is additive so existing report consumers remain
    compatible.
- Traceability: US-1, US-3; FR-013, FR-014, FR-015; NFR-004, NFR-005
