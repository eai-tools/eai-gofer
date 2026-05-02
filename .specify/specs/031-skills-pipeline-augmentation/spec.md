---
id: "031-skills-pipeline-augmentation"
title: "Skills Pipeline Augmentation"
status: "ready"
created: "2026-04-30"
updated: "2026-05-02"
priority: "medium"
assignee: "engineer-agent"
---

# Feature Specification: Skills Pipeline Augmentation

## 1. Overview

### What

This feature delivers two tightly related improvements to the Gofer workflow platform:

1. **First-wave additive helper commands** — five new `gofer:*` helper commands
   (vocabulary, diagnose, tdd, spec-summary, zoom-out) that fill identified gaps in
   the existing pipeline without changing any numbered stages.

2. **Hardened `/6_gofer_validate` truthfulness** — mandatory evidence gates inside
   the existing `/6` stage so validation can only pass with real runtime, test-execution,
   integration, and deployment proof. No new `/6A.x` stages are introduced.

### Why

Gofer's recent validation failure revealed a structural weakness: the `/6` stage was
able to report a passing score without runtime integration proof, verified test results,
or deployment evidence. That undermines every upstream pipeline investment — research,
specification, planning, and implementation — because the terminal quality signal is
unreliable.

In parallel, a survey of `mattpocock/skills` found five helpers that address genuine
gaps in Gofer's current workflow surface. These are adapted conceptually from Matt
Pocock's work; none are mirrored verbatim. Gofer owns their behavior, artifact paths,
and cross-CLI emission.

Both tracks share the same root motivation: a trustworthy, complete pipeline that
Gofer maintainers and workflow designers can rely on from business discovery through
evidence-backed validation.

---

## 2. User Stories

### User Story 1 — Truthful Validation Gate (Priority: P1)

A Gofer workflow designer runs `/6_gofer_validate` after implementing a feature. They
need to trust that a PASS score means the feature is genuinely complete, wired, and
tested — not that the rubric scored from implied or fabricated evidence.

**Why this priority**: The recent failure showed that a false PASS directly misled
downstream decisions. This is the highest-risk gap in the current platform.

**Independent Test**: Run `/6_gofer_validate` against a feature implementation where
integration is incomplete. The stage must report a failing score and block with
actionable remediation notes rather than producing a PASS.

**Acceptance Criteria**:

- [ ] Given a feature with no runtime integration proof, when `/6` runs, then
      Category 5 (Integration Reality) scores 0 and the run fails.
- [ ] Given a feature with no executed test results attached, when `/6` runs, then
      Category 1 (Functional Correctness) scores 0 and the run fails.
- [ ] Given a feature whose acceptance criteria require a deployed or rendered
      target, when `/6` runs without deployment/render evidence, then the run fails
      with a clear reason.
- [ ] Given a feature that fully satisfies all evidence requirements, when `/6`
      runs, then a PASS is reported and `validation-report.md` is written with a
      populated evidence table.
- [ ] Given any rubric category, when evidence is absent or unverifiable, then that
      category must score exactly 0 — no partial or implied credit.

---

### User Story 2 — Cross-CLI Helper Commands (Priority: P1)

A Gofer maintainer or workflow designer invokes one of the five approved helper
commands (`gofer:vocabulary`, `gofer:diagnose`, `gofer:tdd`, `gofer:spec-summary`,
`gofer:zoom-out`) from whichever AI assistant they are using — Claude Code, GitHub
Copilot Chat, Codex, or Gemini. The command behaves consistently and produces
Gofer-owned artifacts regardless of the underlying AI provider.

**Why this priority**: Cross-CLI parity is a core Gofer commitment. Provider-specific
helpers that only work in one CLI erode the platform story and create maintenance debt.

**Independent Test**: Invoke `gofer:vocabulary` from a repository with an established
spec. The command must produce a `glossary.md` artifact in the correct spec directory
on any of the four supported CLI surfaces, without manual post-processing.

**Acceptance Criteria**:

- [ ] Given the Gofer command generator runs, when all five helper `.specify/commands/`
      definitions are present, then surfaces for Claude, Copilot, Codex, and Gemini
      are emitted without manual intervention.
- [ ] Given a user invokes `gofer:vocabulary`, when domain terminology has been used
      across spec and plan artifacts, then a `glossary.md` artifact is produced in
      `.specify/specs/{feature}/` with canonical term definitions.
- [ ] Given a user invokes `gofer:diagnose` on a reported bug or failing test, then
      the helper produces a structured reproduce-minimize-instrument-fix loop and
      outputs findings to a Gofer-owned artifact.
- [ ] Given a user invokes `gofer:tdd` during implementation, then the helper guides
      a red-green-refactor cycle aligned to the spec acceptance criteria, not a
      standalone test lifecycle.
- [ ] Given a user invokes `gofer:spec-summary`, then a business-friendly summary
      document is produced that communicates the feature's purpose and value without
      technical implementation detail.
- [ ] Given a user invokes `gofer:zoom-out`, then the helper produces a structured
      system-context expansion showing how the current feature connects to broader
      architectural boundaries.
- [ ] Given any helper command is invoked, then the numbered pipeline stage sequence
      (0 through 10) is unchanged and pipeline state is unaffected.

---

### User Story 3 — Evidence Table in Validation Report (Priority: P2)

A Gofer maintainer reviewing a completed validation wants a single artifact that
explains exactly what evidence was used to score each rubric category. They should
not have to reconstruct the evidence chain by reading multiple agent sub-reports.

**Why this priority**: This is a readability and audit improvement that builds on the
P1 truthfulness gates. It matters but can follow the core gate hardening.

**Independent Test**: After a passing `/6` run, open `validation-report.md`. An
evidence table must be present that maps every rubric category to at least one
artifact path or command-output reference as proof.

**Acceptance Criteria**:

- [ ] Given a `/6` run produces a PASS, when `validation-report.md` is written, then
      it contains a structured evidence table listing each rubric category, its score,
      and the proof artifact or command output that justified the score.
- [ ] Given a `/6` run produces a FAIL, when `validation-report.md` is written, then
      the evidence table shows which categories scored 0 and explains what proof was
      absent.
- [ ] Given an existing `validation-report.md` from before this feature lands, it
      remains readable and the new evidence table format does not break any existing
      tooling that parses the report.

---

### User Story 4 — Stage-Local Augmentation (Priority: P3)

A Gofer maintainer wants the TDD, diagnose, and vocabulary helpers to be optionally
invocable inside the relevant numbered stages (`/5_gofer_implement`, `/1_gofer_research`,
`/2_gofer_specify`) as well as standalone. This gives teams an integrated path in
addition to the explicit `gofer:*` invocations.

**Why this priority**: Standalone helpers are higher value and lower complexity.
Stage-local embedding is an enhancement once standalone parity is proven.

**Independent Test**: Trigger `/5_gofer_implement` with a flag or annotation that
requests tdd-assist mode. The stage must invoke the tdd helper behavior inline and
produce consistent output with the standalone `gofer:tdd` invocation.

**Acceptance Criteria**:

- [ ] Given a numbered stage that has an approved augmentation seam, when an optional
      stage-local helper is triggered, then its behavior is consistent with the
      standalone command invocation and produces the same artifact format.
- [ ] Given stage-local helper invocations are added, then no new numbered stages
      are created and no existing stage command files have their numbered identifiers
      changed.
- [ ] Given the command generator runs after stage-local augmentations are added,
      then surfaces for all four CLI environments are re-emitted without errors.

---

### Edge Cases

- If a helper command definition is valid in `.specify/commands/` but would push a
  generated surface past a platform limit such as the Codex skill-budget ceiling,
  the feature must report the surface as blocked rather than silently emitting a
  degraded helper.
- If a stage-local augmentation is available but its required input artifacts are
  missing, the numbered stage must continue normally and report the helper as not
  run rather than failing or altering stage order.
- If a helper invocation would overwrite an existing per-feature artifact, Gofer
  must preserve traceability by making the overwrite behavior explicit in the
  resulting artifact or command output.

---

## 3. Functional Requirements

### Command Surface Requirements

- **FR-001**: Gofer MUST provide a `gofer:vocabulary` helper command that extracts
  domain terminology from spec and plan artifacts and writes a canonical `glossary.md`
  to `.specify/specs/{feature}/`. (Adapted from: `mattpocock/ubiquitous-language` —
  concept adapted, Gofer owns artifact path and emission.)
- **FR-002**: Gofer MUST provide a `gofer:diagnose` helper command that runs a
  structured reproduce-minimize-instrument-fix investigation loop and outputs findings
  to a Gofer-owned artifact. (Adapted from: `mattpocock/diagnose` — discipline
  preserved, integrated into Gofer artifact model.)
- **FR-003**: Gofer MUST provide a `gofer:tdd` helper command that guides a
  red-green-refactor micro-loop aligned to spec acceptance criteria, operating within
  but not replacing the `/5_gofer_implement` and `/9_gofer_tests` stages. (Adapted
  from: `mattpocock/tdd` — fitted to Gofer task/test stages, not a standalone lifecycle.)
- **FR-004**: Gofer MUST provide a `gofer:spec-summary` helper command that produces
  a business-friendly summary of a feature's purpose, value, and acceptance criteria
  without exposing implementation detail. (Adapted from: `mattpocock/to-prd` —
  issue-tracker publish dependency removed, Gofer owns the artifact.)
- **FR-005**: Gofer MUST provide a `gofer:zoom-out` helper command that produces a
  structured system-context expansion connecting the current feature to broader
  architectural boundaries. (Adapted from: `mattpocock/zoom-out` — minimal adaptation,
  used as a `gofer:*` helper.)
- **FR-006**: All five helper commands MUST be defined as canonical `.md` files in
  `.specify/commands/` and MUST emit to Claude, Copilot, Codex, and Gemini surfaces
  via the existing `generate-commands.mjs` generator without manual post-processing.
- **FR-007**: Helper commands MUST NOT modify the sequence, numbering, or routing
  logic of Gofer pipeline stages 0 through 10.
- **FR-008**: Helper commands MUST be named in the `gofer:*` namespace, not as new
  numbered stages.

### Validation Truthfulness Requirements

- **FR-009**: `/6_gofer_validate` MUST require verifiable runtime integration proof
  before Category 5 (Integration Reality) can score any points.
- **FR-010**: `/6_gofer_validate` MUST require real, executed test-suite output before
  Category 1 (Functional Correctness) or Category 2 (Test Authenticity) can score
  any points.
- **FR-011**: `/6_gofer_validate` MUST require truthful Category 3 proof whenever the
  feature has a rendered or interactive UI surface. A feature is
  deployment/render in scope when any of the following are true:
  1. its acceptance criteria explicitly reference a rendered UI, live route, live API,
     deployed environment, or production-like target;
  2. its plan, contract pack, or quickstart identifies SharePoint, Azure, staging,
     production, or another named deployment target as part of acceptance;
  3. its plan declares a UI/rendered experience and at least one acceptance criterion
     depends on what a user sees or interacts with in that rendered experience.
  If `HAS_UI = true` and `DEPLOY_IN_SCOPE = false`, `/6` MUST require local render
  proof and record deployment as not in scope. If `HAS_UI = true` and
  `DEPLOY_IN_SCOPE = true`, `/6` MUST require rendered/live proof on the declared
  route or deployment target. If `HAS_UI = false`, `/6` MUST record Category 3 as
  not in scope and redistribute the points per the existing no-UI rule.
- **FR-012**: `/6_gofer_validate` MUST score exactly 0 for any rubric category where
  evidence is absent, unverifiable, fabricated, or implied.
- **FR-013**: `validation-report.md` MUST include a structured evidence table that
  maps every rubric category to its proof artifact path or executed command output.
- **FR-014**: The evidence table in `validation-report.md` MUST be present on both
  PASS and FAIL runs, with explicit absence notes for any category that scored 0.
- **FR-015**: No new `/6A.x` stages MUST be introduced. All truthfulness hardening
  MUST happen inside the existing `/6_gofer_validate` command definition.

### Source-of-Truth and Generation Requirements

- **FR-016**: `.specify/commands/` MUST remain the sole source of truth for all
  helper and stage command definitions. No provider-specific hand-maintained
  command surfaces are permitted for the new helpers.
- **FR-017**: Upstream `mattpocock/skills` concepts MUST be adapted to Gofer-owned
  behavior. No skill MUST be mirrored verbatim. Gofer owns every artifact path,
  naming convention, and behavioral contract.

---

## 4. Non-Functional Requirements

- **NFR-001 Cross-CLI Parity**: All five helper commands must behave equivalently
  across Claude Code CLI, GitHub Copilot Chat, Codex, and Gemini. Provider-specific
  mechanics are acceptable as internal implementation details; user-observable behavior
  and artifact outputs must be identical.
- **NFR-002 Generator Stability**: Changes to `.specify/commands/` must not break
  existing `generate-commands.mjs` output for the 15+ already-defined stages and
  helpers. The generator must continue to produce valid surfaces for all four CLI
  environments.
- **NFR-003 No Pipeline Regression**: The numbered pipeline stages (0 through 10)
  must continue to function identically before and after this feature lands.
  Existing pipeline-state.sh and PipelineStateManager.ts sequencing logic must stay
  intact. Targeted `CommandGenerator.ts` or routing changes are acceptable only when
  they preserve the same numbered-stage progression while restoring truthful
  cross-CLI behavior.
- **NFR-004 Validation Backward Compatibility**: Historical `validation-report.md`
  files written before this feature must remain parseable. The new evidence table is
  additive; it must not break existing report consumers.
- **NFR-005 Evidence Provenance**: Every piece of evidence cited in a validation
  report must be traceable to a specific artifact path or a specific command execution
  with verifiable output. Summaries or inferences from memory do not qualify.
- **NFR-006 Artifact Path Consistency**: All new Gofer-owned artifacts (glossary.md,
  diagnose output, tdd session notes, spec-summary.md) must be written to
  `.specify/specs/{feature}/` consistent with all existing Gofer artifact conventions.

---

## 5. Success Criteria

| ID | Criterion | Measurement | Target |
| --- | --- | --- | --- |
| SC-001 | All five helper commands defined in source of truth | Count of valid `.specify/commands/gofer_*.md` files for the new helpers | 5 of 5 present |
| SC-002 | All helper commands emit to all four CLI surfaces | Generator run produces surfaces with zero errors | 4/4 surfaces per helper |
| SC-003 | `/6` rejects Category 5 without integration proof | Run `/6` against a known-incomplete integration; score observed | Category 5 = 0, run FAILS |
| SC-004 | `/6` rejects Category 1/2 without real test output | Run `/6` without executing the test suite; score observed | Category 1 and/or 2 = 0, run FAILS |
| SC-005 | Evidence table present in every validation report | Inspect `validation-report.md` after a PASS and a FAIL run | Table present in both |
| SC-006 | Numbered pipeline stage sequence unchanged | Run full pipeline before and after; compare stage IDs and routing | Zero delta |
| SC-007 | No mirrored Matt Pocock skills — all adapted | Review of each helper command file confirms Gofer-owned behavior, paths, names | 5/5 helpers pass review |
| SC-008 | `gofer:vocabulary` produces `glossary.md` in spec dir | Invoke the helper and check artifact path | Artifact at `.specify/specs/{feature}/glossary.md` |
| SC-009 | False-PASS rate post-feature | Monitor validation runs where integration was later found incomplete | 0 false PASses observed in first 10 runs |

---

## 6. Assumptions

1. The existing `generate-commands.mjs` can accommodate new `gofer:*` helper command
   files without schema changes, based on the precedent set by `gofer_side.md`,
   `gofer_constitution.md`, and `gofer_hydrate.md`.
2. Matt Pocock's `ubiquitous-language` skill is deprecated upstream but the concept
   is sound; Gofer adopts the concept independently and owns its implementation going
   forward.
3. The four supported CLI surfaces (Claude Code CLI, GitHub Copilot Chat, Codex,
   Gemini) can all receive new helper command instructions through the existing
   generator output paths.
4. The current `/6_gofer_validate` command definition is the authoritative source for
   rubric scoring rules; hardening changes are made there only.
5. Deployment/render verification scope can be determined deterministically from
   spec acceptance criteria plus plan/contract/quickstart deployment signals.

---

## 7. Dependencies

| Dependency | Type | Risk | Notes |
| --- | --- | --- | --- |
| `.specify/scripts/node/generate-commands.mjs` | Internal | Low | Must accept new helper command files; precedents exist |
| `.specify/scripts/node/parse-stage-command.mjs` + schema | Internal | Low | Must validate new helper metadata without schema changes if possible |
| `extension/src/council/CommandGenerator.ts` | Internal | Medium | Numbered-stage progression must remain unchanged, but targeted surface-emission fixes may be required for helper parity and truthful validation |
| `extension/src/autonomous/PipelineStateManager.ts` | Internal | Low | Must not require changes for the same reason |
| `mattpocock/skills` (conceptual reference) | External | None | Read-only inspiration; no runtime dependency introduced |
| Gofer 030 cleanup (vscode-surface-truth) | Upstream feature | Medium | If 030 changes the generator schema, 031 helper command format must align |

---

## 8. Out of Scope

- Adding new numbered pipeline stages (0 through 10 sequence is frozen for this
  feature).
- Adding `/6A.x` lettered validation sub-stages. All truthfulness hardening is
  inside `/6` only.
- Mirroring any Matt Pocock skill verbatim. Gofer adapts concepts, not files.
- GitHub-native issue tracker integration (the `to-issues` skill). Tracked in the
  reuse scan as a conditional future extension.
- The `grill-me`, `write-a-skill`, `git-guardrails`, and `setup-pre-commit`
  candidates identified in the reuse scan. These are deferred.
- The `triage` and `grill-with-docs` candidates identified in the reuse scan.
  These remain deferred future augmentations, not part of the approved first wave.
- Changes to application runtime, tenant behavior, or deployment topology. This is
  a workflow/platform feature only.
- Changes to the VSCode extension UI. No visual interface changes are in scope.

---

## 9. Glossary

| Term | Definition |
| --- | --- |
| **Helper command** | A `gofer:*` namespaced command that augments the pipeline without being a numbered stage. Invocable standalone or from within a stage. |
| **Numbered stage** | One of the ten Gofer pipeline stages (0–10) with a fixed sequence, state persistence, and routing logic. Protected from renumbering. |
| **Cross-CLI parity** | The guarantee that a Gofer command behaves identically across Claude Code CLI, GitHub Copilot Chat, Codex, and Gemini. |
| **Evidence gate** | A hard check inside `/6_gofer_validate` that requires a specific artifact or command output before a rubric category can score any points. |
| **Evidence table** | A structured section in `validation-report.md` mapping each rubric category to its proof source. |
| **Source of truth** | `.specify/commands/` — the canonical location for all Gofer command and helper definitions. Generated surfaces derive from here. |
| **Conceptual adaptation** | A Gofer-owned implementation of an idea from an upstream skill, using Gofer naming conventions, artifact paths, and behavioral contracts. |
| **Integration proof** | Verifiable evidence that code paths, routes, or services are actually wired and reachable at runtime, not merely present in source files. |
| **Deployment/render verification** | Evidence that a feature behaves correctly in a deployed or rendered target environment, not just in local tests. |
| **Ubiquitous language** | Domain-specific terminology that is used consistently across all team communication, code, and documentation. |

---

## 10. Research Traceability

| Research Finding | Source | Spec Section |
| --- | --- | --- |
| Gofer already covers discovery, research, planning, tasking, impl, validation | research.md § Reuse-Before-Create Scan | §3 FR-007, §8 Out of Scope |
| Five highest-value augmentation gaps identified | research.md § Likely Augmentation Gaps, reuse-scan.md § Highest-Value Augmentations | §2 US-2, §3 FR-001–005 |
| `ubiquitous-language` upstream deprecated but concept sound | reuse-scan.md § Deprecated Skills | §2 US-2 AC-2, §6 Assumption 2 |
| Pattern 1: non-numbered `gofer:*` control helpers | research.md § Existing Patterns to Follow | §3 FR-006–008 |
| Pattern 3: pre/post pipeline sidecars (`0a`, `7a`) | research.md § Existing Patterns to Follow | §2 US-4, §3 FR-008 |
| `.specify/commands/` is sole source of truth | research.md § Integration Points, context-bundle.md § Protected Boundaries | §3 FR-016, §7 Dependencies |
| Recent `/6` failure: no runtime proof, no real tests, no deployment evidence | proposal-review.md § Why `/6` Must Be Fixed, context-bundle.md § Validation Truthfulness Requirement | §1 Overview Why, §2 US-1, §3 FR-009–015 |
| Fix must be inside `/6` — no extra `/6A.x` stages | proposal-review.md § User Feedback and Overrides | §3 FR-015, §8 Out of Scope |
| Cross-CLI parity requirement for standalone helpers | proposal-review.md § Key Decisions, reuse-scan.md § Cross-CLI rule | §2 US-2 AC-1, §3 FR-006, §4 NFR-001 |
| Matt Pocock skill-to-Gofer fit decision per skill | reuse-scan.md §§ Engineering/Productivity/Misc/Personal/Deprecated | §3 FR-001–005 (each cites adaptation note) |
| Generator seam: `generate-commands.mjs` emits all surfaces | research.md § Codebase Analysis, context-bundle.md § Relevant Code Paths | §7 Dependencies, §3 FR-016 |
| Honest rubric scoring and evidence-backed test trust required for categories 1, 2, 3, 5 | proposal-review.md § The required fix, research.md § Required Fixes Inside the Existing `/6` Stage | §3 FR-009–012, §5 SC-003, SC-004 |

---

## 11. AI-Augmented 4-Step Journey

**Not applicable.** This is non-application workflow and platform work. There is no
end-user four-step application journey. The feature delivers workflow command surfaces
and validation hardening for Gofer maintainers and workflow designers, not a
consumer-facing UI or API product.

---

## 12. EnterpriseAI Contract Pack Summary

> Adapted for a non-application workflow/platform feature. The contract pack focuses
> on behavioral guarantees, artifact contracts, and workflow boundaries rather than
> user-facing application flows.

### Actors

| Actor | Role |
| --- | --- |
| Gofer maintainer | Authors `.specify/commands/` definitions; runs the pipeline end-to-end |
| Workflow designer | Invokes helper commands and stages to deliver features |
| AI assistant (any of Claude, Copilot, Codex, Gemini) | Executes command instructions on behalf of maintainer/designer |
| `generate-commands.mjs` | Generates provider-specific surfaces from canonical command definitions |
| `/6_gofer_validate` stage | Evaluates implementation quality and writes `validation-report.md` |

### Key Artifacts and Contracts

| Artifact | Owner | Guarantee |
| --- | --- | --- |
| `.specify/commands/gofer_vocabulary.md` | Gofer core | Canonical cross-CLI definition for `gofer:vocabulary` |
| `.specify/commands/gofer_diagnose.md` | Gofer core | Canonical cross-CLI definition for `gofer:diagnose` |
| `.specify/commands/gofer_tdd.md` | Gofer core | Canonical cross-CLI definition for `gofer:tdd` |
| `.specify/commands/gofer_spec_summary.md` | Gofer core | Canonical cross-CLI definition for `gofer:spec-summary` |
| `.specify/commands/gofer_zoom_out.md` | Gofer core | Canonical cross-CLI definition for `gofer:zoom-out` |
| `.specify/specs/{feature}/glossary.md` | `gofer:vocabulary` | Domain glossary artifact produced per-feature |
| `.specify/specs/{feature}/validation-report.md` | `/6_gofer_validate` | Evidence table required; PASS only with full proof |
| `.specify/commands/6_gofer_validate.md` | Gofer core | Hardened; evidence gates mandatory; no `/6A.x` additions |

### Workflow Boundaries

- Helper commands are additive and optional. Invoking them has no side effects on
  numbered stage state or pipeline routing.
- `/6_gofer_validate` hardening is backward-compatible. Existing valid implementations
  that produced real test output and integration proof continue to PASS.
- All new command surfaces must pass through `generate-commands.mjs` without bypass.

### AI Assistance Contract

- AI assistants executing helper commands must produce outputs to the canonical
  artifact paths defined in the command file. They must not write to ad hoc or
  provider-specific paths.
- AI assistants executing `/6_gofer_validate` must not assign scores to rubric
  categories where they cannot point to a specific artifact path or executed output
  as evidence.

---

## 13. Integration Map

**Ordered chain**: Gofer workflow platform → `.specify/commands/` source of truth
→ `generate-commands.mjs` → Claude / Copilot / Codex / Gemini command surfaces →
per-feature helper artifacts and truthful `validation-report.md` evidence.

```
.specify/commands/ (source of truth)
        │
        ▼
generate-commands.mjs
        │
        ├─► Claude surfaces (.claude/commands/)
        ├─► Copilot surfaces (.github/copilot-instructions.md / skills)
        ├─► Codex surfaces (.agents/skills/)
        └─► Gemini surfaces (.gemini/commands/)

gofer:vocabulary / gofer:diagnose / gofer:tdd / gofer:spec-summary / gofer:zoom-out
        │
        └─► .specify/specs/{feature}/ (glossary.md, diagnose-report.md, etc.)

/5_gofer_implement (existing) ──[optional stage-local augmentation]──► gofer:tdd, gofer:diagnose
/1_gofer_research (existing)  ──[optional stage-local augmentation]──► gofer:vocabulary, gofer:zoom-out
/2_gofer_specify (existing)   ──[optional stage-local augmentation]──► gofer:vocabulary, gofer:spec-summary

/6_gofer_validate (hardened)
        │
        ├─► Evidence gate: Category 1/2 require executed test output
        ├─► Evidence gate: Category 5 requires runtime integration proof
        ├─► Evidence gate: Category 3/deployment requires render/deploy evidence when in scope
        └─► validation-report.md ── evidence table (all 11 categories)
```
