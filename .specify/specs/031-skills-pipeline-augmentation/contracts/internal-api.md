# Internal API Contract

## Summary

- Callable internal service/API endpoint count: **0**
- Planning-relevant internal contract surface count: **6**
- This feature has no networked internal service API. The useful contracts are
  workflow authority boundaries IAP-031-01 through IAP-031-06.

## Interface Summary

| ID | Surface | Source surface | Authority | Output / consumer |
| --- | --- | --- | --- | --- |
| IAP-031-01 | Helper command definitions | `.specify/commands/gofer_*.md` | Canonical helper command files in `.specify/commands/` | AI assistants executing standalone or approved stage-local helper flows |
| IAP-031-02 | Helper artifact output paths | Helper command invocations | Helper command files plus Gofer artifact conventions | Feature artifacts under `.specify/specs/{feature}/` |
| IAP-031-03 | Validation evidence gates | `/6_gofer_validate` Categories 1, 2, 3, and 5 | `.specify/commands/6_gofer_validate.md` | Rubric scoring, PASS/FAIL, and remediation output |
| IAP-031-04 | Cross-CLI surface generation | `.specify/commands/*.md` | `generate-commands.mjs`, parser/schema validation, and `gofer:codex-doctor` | Claude, Copilot, Codex, and Gemini generated surfaces |
| IAP-031-05 | Validation evidence table schema | `validation-report.md` | `/6_gofer_validate` Step 8 plus the feature contract pack | Maintainers, downstream parsers, and audit consumers |
| IAP-031-06 | Hardened validation scoring rules | `/6_gofer_validate` Step 7 | Existing Stage 6 rubric and brownfield restart loop | Trustworthy PASS/FAIL outcome without new `/6A.x` stages |

## IAP-031-01 — Helper Command Definitions

- Source surface: `.specify/commands/gofer_{vocabulary,diagnose,tdd,spec_summary,zoom_out}.md`
- Authority: canonical helper command definitions in `.specify/commands/`
- Output / consumer: standalone helper invocations on Claude, Copilot, Codex,
  and Gemini plus approved stage-local augmentation seams

### Helper Command Matrix

| Command | Canonical source | Required artifact | Approved in-scope stage-local seam |
| --- | --- | --- | --- |
| `gofer:vocabulary` | `.specify/commands/gofer_vocabulary.md` | `glossary.md` | `/1_gofer_research`, `/2_gofer_specify` |
| `gofer:diagnose` | `.specify/commands/gofer_diagnose.md` | `diagnose-report.md` | `/5_gofer_implement` |
| `gofer:tdd` | `.specify/commands/gofer_tdd.md` | `tdd-session.md` | `/5_gofer_implement` (does not replace `/9_gofer_tests`) |
| `gofer:spec-summary` | `.specify/commands/gofer_spec_summary.md` | `spec-summary.md` | `/2_gofer_specify` |
| `gofer:zoom-out` | `.specify/commands/gofer_zoom_out.md` | `zoom-out-report.md` | `/1_gofer_research` |

### Invariants

- Helper commands MUST stay in the `gofer:*` namespace and MUST NOT create,
  renumber, or reroute numbered stages.
- Helper commands MUST use Gofer-owned behavior, not upstream
  `mattpocock/skills` text verbatim. Gofer owns every artifact path, naming
  convention, and behavioral contract.
- Cross-CLI observable behavior MUST remain equivalent across Claude, Copilot,
  Codex, and Gemini.
- Approved stage-local invocations MUST preserve the standalone artifact shape
  and MUST NOT mutate pipeline state.

### Traceability

- User stories: US-2, US-4
- Requirements: FR-001 through FR-008, FR-016, FR-017
- Non-functional: NFR-001, NFR-002, NFR-003

## IAP-031-02 — Helper Artifact Output Paths

- Source surface: helper invocations and stage-local helper seams
- Authority: helper command definitions plus Gofer artifact conventions
- Output / consumer: per-feature artifacts written beneath
  `.specify/specs/{feature}/`

### Artifact Path Matrix

| Artifact | Producer | Canonical path | Minimum required shape |
| --- | --- | --- | --- |
| `glossary.md` | `gofer:vocabulary` | `.specify/specs/{feature}/glossary.md` | Canonical domain term list extracted from spec and plan artifacts |
| `diagnose-report.md` | `gofer:diagnose` | `.specify/specs/{feature}/diagnose-report.md` | Structured reproduce-minimize-instrument-fix investigation record |
| `tdd-session.md` | `gofer:tdd` | `.specify/specs/{feature}/tdd-session.md` | Red-green-refactor cycle log aligned to spec acceptance criteria |
| `spec-summary.md` | `gofer:spec-summary` | `.specify/specs/{feature}/spec-summary.md` | Business-friendly summary without implementation detail |
| `zoom-out-report.md` | `gofer:zoom-out` | `.specify/specs/{feature}/zoom-out-report.md` | Structured system-context expansion for the current feature |

### Invariants

- All helper output files MUST go to `.specify/specs/{feature}/`. No ad hoc or
  repo-root paths are permitted.
- If a helper invocation would overwrite an existing feature artifact, the
  overwrite behavior MUST be explicit in the resulting artifact or command
  output so traceability is preserved.
- Stage-local helper invocation MUST emit the same artifact format as standalone
  invocation.

### Traceability

- User stories: US-2, US-4
- Requirements: FR-001 through FR-005, FR-008
- Non-functional: NFR-001, NFR-006

## IAP-031-03 — Validation Evidence Gates

- Source surface: `/6_gofer_validate` evidence-gated scoring flow
- Authority: `.specify/commands/6_gofer_validate.md`
- Output / consumer: trustworthy rubric scoring for maintainers and workflow
  designers reviewing validation outcome

### Evidence Gate Matrix

| Category | Required evidence before any points | Failure behavior |
| --- | --- | --- |
| 1 — Functional Correctness | Real, executed test-suite output with verifiable pass/fail result | Score exactly 0; validation cannot truthfully PASS |
| 2 — Test Authenticity | Same executed test-suite output plus trustworthy test-quality evidence when available | Score exactly 0; validation cannot truthfully PASS |
| 3 — UI/E2E Verification | Render, deployment, or reachability proof when deployment/render is in scope or `HAS_UI = true` | Score exactly 0 when required evidence is missing; otherwise explicit not-in-scope or redistributed |
| 5 — Integration Reality | Runtime wiring proof such as route probes, service instantiation proof, import reachability, or integration tests against real dependencies | Score exactly 0; validation cannot truthfully PASS |

### Invariants

- Evidence MUST cite a specific artifact path, executed command output, or
  runtime probe visible in the validation session.
- Any absent, unverifiable, fabricated, or implied evidence MUST score exactly
  0.
- If deployment/render verification is not in scope, `/6_gofer_validate` MUST
  record that explicitly rather than inventing proof requirements.
- Honest scoring is mandatory: "likely correct" or "appears wired" are not
  evidence.

### Traceability

- User stories: US-1, US-3
- Requirements: FR-009 through FR-015
- Non-functional: NFR-004, NFR-005

## IAP-031-04 — Cross-CLI Surface Generation

- Source surface: `.specify/commands/*.md`
- Authority: `.specify/scripts/node/generate-commands.mjs`,
  `.specify/scripts/node/parse-stage-command.mjs`, and the command schema they
  enforce
- Output / consumer: regenerated helper and stage surfaces for all supported
  AI CLIs

### Generated Surface Targets

| Surface | Canonical generated path |
| --- | --- |
| Claude | `.claude/commands/` |
| Copilot | `.github/` skill surfaces |
| Codex | `.agents/skills/gofer/` |
| Gemini | `.gemini/commands/gofer/` |

### Invariants

- `.specify/commands/` remains the sole source of truth for helper and stage
  definitions.
- No provider-specific hand-maintained helper surfaces are permitted.
- Generated surfaces are refreshed by regeneration, never by hand-editing
  downstream copies.
- `npm run gofer:codex-doctor` MUST validate Codex skill-budget and parity
  invariants before the helper surfaces are committed.

### Traceability

- User stories: US-2, US-4
- Requirements: FR-006, FR-007, FR-008, FR-016
- Non-functional: NFR-001, NFR-002, NFR-003

## IAP-031-05 — Validation Evidence Table Schema

- Source surface: `{FEATURE_DIR}/validation-report.md`
- Authority: `/6_gofer_validate` Step 8 and `contract-pack.md` evidence-table
  requirements
- Output / consumer: a single audit-friendly report that shows why each rubric
  category received its score

### Required Table Contract

| Requirement | Contract |
| --- | --- |
| Section heading | `## Evidence Table` |
| Required columns | `Category` \| `Score` \| `Evidence Artifact / Command Output` \| `Absent / Reason for 0` |
| Required rows | All 11 rubric categories plus a `Total` row |
| Presence | Required on both PASS and FAIL runs |
| Compatibility | Additive to the existing report structure; existing consumers remain unaffected |

Additional report preamble / row prose may carry provenance, scope-source, and
normalization detail; these do not require separate evidence-table columns so
long as the persisted report makes them derivable.

### Required Category Set

1. Functional Correctness
2. Test Authenticity
3. UI/E2E Verification
4. Security Posture
5. Integration Reality
6. Error Path Coverage
7. Architecture Compliance
8. Performance Baseline
9. Code Hygiene
10. Specification Traceability
11. Blast Radius Containment

### Invariants

- Evidence references may point to artifact paths or exact command outputs, but
  they MUST be specific and verifiable.
- Every category that scores 0 MUST explain the absent or unverifiable evidence.
- The evidence table section is additive. Existing `validation-report.md`
  consumers that parse other sections of the report are unaffected.

### Traceability

- User stories: US-1, US-3
- Requirements: FR-013, FR-014
- Non-functional: NFR-004, NFR-005

## IAP-031-06 — Hardened Validation Scoring Rules

- Source surface: `/6_gofer_validate` rubric scoring and pass/fail determination
- Authority: Stage 6 scoring logic, blast-radius gate, and brownfield restart
  behavior
- Output / consumer: validation status that maintainers can trust as a release
  signal

### Rule Summary

| Rule | Contract |
| --- | --- |
| PASS threshold | Total score MUST be 110/110 |
| Zero-score behavior | Any category with absent or unverifiable evidence scores exactly 0 |
| No-UI handling | If `HAS_UI = false`, Category 3 is skipped and its points redistribute +5 to Category 1 and +5 to Category 2 |
| Phase sequencing | Phase C only runs after rubric PASS; hardening stays inside existing `/6_gofer_validate` |
| Failure outcome | Rubric FAIL triggers remediation and brownfield restart rather than a false PASS |

### Invariants

- No new `/6A.x` stages may be introduced for this feature.
- Honest scoring takes precedence over optimistic scoring or inferred credit.
- Validation cannot claim confidence from code that is present but not wired,
  executed, rendered, or otherwise proven.

### Traceability

- User stories: US-1, US-3
- Requirements: FR-009 through FR-015
- Non-functional: NFR-003, NFR-004, NFR-005
