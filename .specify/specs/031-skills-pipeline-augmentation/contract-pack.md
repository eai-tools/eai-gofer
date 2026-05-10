---
id: 031-skills-pipeline-augmentation
artifact: contract-pack
title: Skills Pipeline Augmentation — Contract Pack
status: draft
created: 2026-04-30
updated: 2026-04-30
author: Claude
linked-spec: spec.md
linked-reuse-scan: reuse-scan.md
linked-proposal: proposal-review.md
---

# Contract Pack: Skills Pipeline Augmentation

> This contract pack is adapted for a **non-application workflow/platform feature**.
> There is no end-user application flow. Contracts cover platform behavior, artifact
> obligations, command surface guarantees, and workflow boundaries for Gofer maintainers
> and workflow designers across four AI CLI surfaces.

---

## 1. Actors

| Actor | Role | Authorization |
| --- | --- | --- |
| **Gofer maintainer** | Authors canonical command files in `.specify/commands/`; runs the generator; owns the pipeline definition | Full write access to `.specify/` and generated surfaces |
| **Workflow designer** | Invokes helper commands and numbered stages to deliver features; receives artifacts | Read/invoke access; no direct write to command source |
| **AI assistant** (Claude / Copilot / Codex / Gemini) | Executes command instructions on behalf of the requesting actor | Bounded by the command file it is executing; no side effects outside defined artifact paths |
| **`generate-commands.mjs`** | Automated generator that emits CLI surfaces from `.specify/commands/` source | Write access to generated surface directories only; never touches `.specify/commands/` |
| **`/6_gofer_validate` stage** | Evaluates implementation quality against rubric; writes `validation-report.md` | Read access to all spec artifacts; write access to `validation-report.md` and `blast-radius-report.md` |

---

## 2. Object Types and Artifacts

### 2.1 Command Definitions (Source of Truth)

| Artifact | Path | Contract |
| --- | --- | --- |
| `gofer_vocabulary.md` | `.specify/commands/gofer_vocabulary.md` | Defines `gofer:vocabulary` behavior, inputs, artifact output path. Adapted from `mattpocock/ubiquitous-language` — Gofer owns naming, path, and behavioral contract. |
| `gofer_diagnose.md` | `.specify/commands/gofer_diagnose.md` | Defines `gofer:diagnose` reproduce-minimize-instrument-fix loop. Adapted from `mattpocock/diagnose` — feedback-loop discipline preserved; integrated into Gofer artifact model. |
| `gofer_tdd.md` | `.specify/commands/gofer_tdd.md` | Defines `gofer:tdd` red-green-refactor micro-loop. Adapted from `mattpocock/tdd` — fitted to Gofer task/test stages, not a standalone lifecycle. |
| `gofer_spec_summary.md` | `.specify/commands/gofer_spec_summary.md` | Defines `gofer:spec-summary` business-summary generator. Adapted from `mattpocock/to-prd` — issue-tracker publish dependency removed; Gofer owns the artifact. |
| `gofer_zoom_out.md` | `.specify/commands/gofer_zoom_out.md` | Defines `gofer:zoom-out` system-context expansion. Adapted from `mattpocock/zoom-out` — minimal adaptation; used directly as a `gofer:*` helper. |
| `6_gofer_validate.md` | `.specify/commands/6_gofer_validate.md` | Hardened with mandatory evidence gates. No content is moved to new `/6A.x` files. |

> **Reuse-scan traceability**: All five helper commands correspond to the "Extend Gofer"
> decisions in `reuse-scan.md § Highest-Value Augmentations` (priorities 1–5).
> The three "Skip" and "Reuse Existing" decisions from reuse-scan.md are not represented
> here; they are excluded per `spec.md § 8 Out of Scope`.

### 2.2 Generated Surfaces (Derived — Do Not Hand-Edit)

| Surface | Generator Output Path | Trigger |
| --- | --- | --- |
| Claude command mirrors | `.claude/commands/` | `generate-commands.mjs` run |
| Claude extension mirrors | `extension/resources/claude-commands/` | `generate-commands.mjs` run |
| Copilot prompt surfaces | `.github/prompts/` | `generate-commands.mjs` run |
| Copilot extension mirrors | `extension/resources/copilot-prompts/` | `generate-commands.mjs` run |
| Codex skill surfaces | `.agents/skills/gofer/` | `generate-commands.mjs` run |
| System skill mirrors | `.system/skills/gofer/` | `generate-commands.mjs` run |
| Gemini command surfaces | `.gemini/commands/gofer/` | `generate-commands.mjs` run |

> **Cross-CLI parity guarantee**: All primary CLI surfaces and generated mirrors
> derive from the same canonical `.specify/commands/` definition. No
> surface-specific behavior is permitted in the helper command files.
> Provider-specific mechanics (tool availability, invocation syntax) are
> internal implementation details of the generator, not behavioral differences
> visible to the actor.

### 2.3 Feature Artifacts (Produced by Helpers)

| Artifact | Path | Produced By | Contract |
| --- | --- | --- | --- |
| `glossary.md` | `.specify/specs/{feature}/glossary.md` | `gofer:vocabulary` | Canonical domain term list extracted from spec and plan artifacts. One file per feature invocation. Must not be written to repo root or ad hoc paths. |
| `diagnose-report.md` | `.specify/specs/{feature}/diagnose-report.md` | `gofer:diagnose` | Structured reproduce-minimize-instrument-fix findings. Must include reproduction steps, minimization result, instrumentation output, and proposed fix. |
| `tdd-session.md` | `.specify/specs/{feature}/tdd-session.md` | `gofer:tdd` | Red-green-refactor cycle log aligned to spec acceptance criteria. |
| `spec-summary.md` | `.specify/specs/{feature}/spec-summary.md` | `gofer:spec-summary` | Business-friendly feature summary without implementation detail. Suitable for stakeholder communication. |
| `zoom-out-report.md` | `.specify/specs/{feature}/zoom-out-report.md` | `gofer:zoom-out` | System-context expansion showing architectural boundary connections for the current feature scope. |
| `validation-report.md` | `.specify/specs/{feature}/validation-report.md` | `/6_gofer_validate` | **Hardened**: must contain evidence table (see §6). Existing format is additive; table is new required section. |

---

## 3. Workflows

### 3.1 Helper Command Invocation Workflow

```
Actor invokes gofer:vocabulary (or any helper)
        │
        ▼
AI assistant reads .specify/commands/gofer_vocabulary.md
        │
        ▼
AI assistant executes defined behavior
        │  ─ reads spec.md, plan.md, or other artifacts as required by the command
        │  ─ applies Gofer-owned logic (not upstream skill logic verbatim)
        ▼
AI assistant writes output to canonical artifact path
(.specify/specs/{feature}/glossary.md)
        │
        ▼
Workflow designer reviews artifact
        │
        ▼
[Optional] Stage-local invocation:
numbered stage (/1, /2, /5) may invoke helper behavior inline
─ output format must be identical to standalone invocation
─ numbered stage sequence and IDs are unchanged
```

**Invariants:**

- Helper invocation has no side effects on pipeline state.
- Helper output paths are always relative to `.specify/specs/{feature}/`.
- Numbered stage files must not be renamed or renumbered as a result of
  adding stage-local augmentation seams.

### 3.2 Command Generation Workflow

```
Maintainer adds/modifies .specify/commands/gofer_*.md
        │
        ▼
Runs: npm run gofer:generate
        │
        ▼
generate-commands.mjs reads all .specify/commands/*.md
        │
        ├─► Emits Claude surfaces    (.claude/commands/)
        ├─► Emits Copilot surfaces   (.github/...)
        ├─► Emits Codex surfaces     (.agents/skills/gofer/)
        └─► Emits Gemini surfaces    (.gemini/commands/gofer/)
        │
        ▼
Maintainer runs: npm run gofer:codex-doctor  [validation / budget check]
        │
        ▼
Commit generated surfaces alongside source command files
```

**Invariants:**

- No surface file is hand-edited after generation.
- Generator must complete with zero errors before surfaces are committed.
- Codex skill-budget invariant (≤ 2048 bytes cumulative across new helpers)
  must be enforced by canonical description validation/tests, with
  `gofer:codex-doctor` used as the installed-surface smoke check.

### 3.3 Hardened Validation Workflow

```
/6_gofer_validate invoked
        │
        ▼
Step 1: Load artifacts (spec.md, plan.md, tasks.md, research.md)
        │
        ▼
Step 2: Spawn 6 Phase A rubric agents in parallel
        │
        ├─► Category 1 (Functional Correctness):
        │       Evidence gate: executed test output MUST be present
        │       Gate fails → score 0, run FAILS
        │
        ├─► Category 5 (Integration Reality):
        │       Evidence gate: runtime integration proof MUST be present
        │       (real import/service wiring verified, not inferred from source)
        │       Gate fails → score 0, run FAILS
        │
        └─► Category 3 / Deployment:
                Evidence gate: IF feature scope includes deployed/rendered target
                THEN deployment or render verification MUST be present
                Gate fails → score 0, run FAILS
        │
        ▼
Step 2.5 / Phase B: Blast-radius analysis (existing; unchanged structure)
        │
        ▼
Step 3: Automated checks (build, test, lint, typecheck)
        │
        ▼
Score all 11 rubric categories
─ Any category with absent or unverifiable evidence scores exactly 0
─ No partial credit, no implied credit
        │
        ▼
Write validation-report.md
─ MUST include evidence table (see §6)
─ Present on PASS and FAIL runs
        │
        ▼
PASS (110/110) or FAIL → brownfield restart loop
```

---

## 4. AI Assistance Contract

### 4.1 Helper Command Execution

| Obligation | Binding On | Detail |
| --- | --- | --- |
| Write outputs to canonical paths only | AI assistant | All helper output files must go to `.specify/specs/{feature}/`. No ad hoc or repo-root paths. |
| Use Gofer-owned behavior, not upstream skill text | AI assistant | Helper command files define Gofer's own instructions. The AI must follow those, not any cached version of a Matt Pocock skill. |
| Produce cross-CLI-identical outputs | AI assistant (all surfaces) | Output artifact content must be equivalent regardless of which CLI surface invoked the command. Provider-specific syntax differences are acceptable; behavioral differences are not. |
| Report cannot fabricate evidence | AI assistant executing `/6` | The assistant must not cite an artifact as evidence unless it can reference a specific file path or command output visible in the current session. |

### 4.2 Validation Scoring Contract

| Rubric Category | Evidence Required Before Any Points | Absent-Evidence Behavior |
| --- | --- | --- |
| 1 — Functional Correctness | Real, executed test-suite output showing passing/failing tests | Score = 0; run FAILS |
| 2 — Test Authenticity | Same executed test output as Category 1; mutation score if available | Score = 0; run FAILS |
| 3 — UI/E2E Verification | `HAS_UI = false` → N/A with redistribution; `HAS_UI = true` and `DEPLOY_IN_SCOPE = false` → local render proof; `HAS_UI = true` and `DEPLOY_IN_SCOPE = true` → render/deploy proof on the declared target | Score = 0 if the required proof is absent |
| 5 — Integration Reality | Runtime wiring verification: confirmed imports, live service calls, or integration-test execution against real dependencies | Score = 0; run FAILS |
| All others | Code analysis findings from specialist agents; no fabrication permitted | Score = 0 if evidence is absent, unverifiable, fabricated, or implied |

> **Honest-scoring rule**: If an agent cannot find evidence, it must report that
> clearly. The orchestrating `/6` stage must score the category 0 in response.
> "I believe this is likely correct" or "this appears to be wired" are not evidence.

---

## 5. Permissions and Boundaries

### What This Feature Is Permitted to Change

| Scope | Permitted Changes |
| --- | --- |
| `.specify/commands/` | Add five new `gofer_*.md` helper command files; modify `6_gofer_validate.md` to add evidence gates |
| `.specify/specs/{feature}/` (at runtime) | Write helper output artifacts; write hardened `validation-report.md` |
| Generated surfaces | Re-emit all four CLI surfaces after adding helpers to `.specify/commands/` |

### What This Feature Must NOT Change

| Scope | Restriction | Reason |
| --- | --- | --- |
| Numbered stage IDs (0–10) | Must not renumber or resequence | `PipelineStateManager.ts`, `pipeline-state.sh`, `CommandGenerator.ts` hardcode the sequence |
| `/6A.x` stage files | Must not create new lettered sub-stages | Approved decision in `proposal-review.md § User Feedback` |
| Hand-edited generated surfaces | Must not bypass `generate-commands.mjs` | Breaks source-of-truth guarantee |
| Upstream `mattpocock/skills` files | Must not mirror verbatim | Gofer owns all behavioral contracts; upstream is conceptual reference only |
| Application runtime / tenant behavior | Must not touch | This is a workflow/platform feature only |
| VSCode extension UI | Must not touch | Out of scope per `spec.md § 8` |

---

## 6. Evidence Table Contract (validation-report.md)

Every `validation-report.md` produced by `/6_gofer_validate` after this feature
lands MUST contain an evidence table in the following structure. This section is
appended to the existing report format; it does not replace existing sections.

```markdown
## Evidence Table

| Category | Score | Evidence Artifact / Command Output | Absent / Reason for 0 |
| --- | --- | --- | --- |
| 1 — Functional Correctness | [pts] | [path or "npm test output, run at HH:MM"] | [if 0: reason] |
| 2 — Test Authenticity | [pts] | [path or mutation score reference] | [if 0: reason] |
| 3 — UI/E2E Verification | [pts] | ["N/A — HAS_UI=false", "Render proof only — deployment target not in scope", or render/deploy artifact path] | [if 0: reason] |
| 4 — Security Posture | [pts] | [agent finding reference] | [if 0: reason] |
| 5 — Integration Reality | [pts] | [runtime wiring proof: file:line or test output] | [if 0: reason] |
| 6 — Error Path Coverage | [pts] | [agent finding reference] | [if 0: reason] |
| 7 — Architecture Compliance | [pts] | [agent finding reference] | [if 0: reason] |
| 8 — Performance Baseline | [pts] | [agent finding reference] | [if 0: reason] |
| 9 — Code Hygiene | [pts] | [agent finding reference] | [if 0: reason] |
| 10 — Specification Traceability | [pts] | [agent finding reference] | [if 0: reason] |
| 11 — Blast Radius Containment | [pts] | [blast-radius-report.md reference] | [if 0: reason] |
| **Total** | **[total]/110** | | |
```

Additional report preamble / row prose may carry provenance, scope-source, and
normalization detail; these do not require separate table columns as long as the
persisted report makes them derivable.

**Backward-compatibility guarantee**: The evidence table section is additive. Existing
`validation-report.md` consumers that parse other sections of the report are unaffected.

---

## 7. Command Surface and API Events

### 7.1 New Command Identifiers

| Command ID | Namespace | Source File | Surfaces |
| --- | --- | --- | --- |
| `gofer:vocabulary` | `gofer:*` helpers | `gofer_vocabulary.md` | Claude, Copilot, Codex, Gemini |
| `gofer:diagnose` | `gofer:*` helpers | `gofer_diagnose.md` | Claude, Copilot, Codex, Gemini |
| `gofer:tdd` | `gofer:*` helpers | `gofer_tdd.md` | Claude, Copilot, Codex, Gemini |
| `gofer:spec-summary` | `gofer:*` helpers | `gofer_spec_summary.md` | Claude, Copilot, Codex, Gemini |
| `gofer:zoom-out` | `gofer:*` helpers | `gofer_zoom_out.md` | Claude, Copilot, Codex, Gemini |

### 7.2 Modified Command Behavior

| Command ID | Change Type | What Changes |
| --- | --- | --- |
| `/6_gofer_validate` (Stage 6) | Behavioral hardening | Evidence gates for Categories 1, 2, 3, 5 added; evidence table required in `validation-report.md`. No structural change to phases A/B/C. |

### 7.3 Unchanged Command Identifiers

All numbered pipeline stages (0–10) and all existing `gofer:*` helpers not listed
above remain behaviorally unchanged. Their `.specify/commands/*.md` files must not
be modified except to add optional stage-local augmentation seams for
`gofer:vocabulary` and `gofer:zoom-out` in `/1_gofer_research`,
`gofer:vocabulary` and `gofer:spec-summary` in `/2_gofer_specify`, and
`gofer:tdd` plus `gofer:diagnose` in `/5_gofer_implement`.

---

## 8. Deployment and Runtime Assumptions

| Assumption | Basis | Risk |
| --- | --- | --- |
| `generate-commands.mjs` schema accepts new `gofer:*` helper files without modification | Precedent: `gofer_side.md`, `gofer_constitution.md`, `gofer_hydrate.md` all accepted | Low |
| Four CLI surfaces can receive new helper instructions via existing generator paths | Current generator emits to all four | Low |
| `PipelineStateManager.ts` and `pipeline-state.sh` require no changes | Helpers are not numbered stages; state machine is not touched | Low |
| 030-vscode-surface-truth-cleanup does not alter generator schema in a breaking way | Risk if 030 changes command metadata schema | Medium — align during planning |
| Codex skill budget (≤ 2048 bytes) is not exceeded by five new helpers | Must be verified by `gofer:codex-doctor` after adding command files | Medium — verify before commit |

---

## 9. Acceptance Tests

The following acceptance tests are derived directly from `spec.md § 2 User Stories`
and the evidence-gate requirements. They define done for this feature.

### AT-001: Validation Rejects Incomplete Integration (spec US-1)

**Given** a feature implementation where integration wiring is missing or unverifiable  
**When** `/6_gofer_validate` runs  
**Then** Category 5 (Integration Reality) scores 0, the total is < 110/110, and the
run reports FAIL with a reason citing absent integration proof.

**Linked requirement**: FR-009, FR-012

---

### AT-002: Validation Rejects Missing Test Execution (spec US-1)

**Given** a feature implementation where no test suite has been executed  
**When** `/6_gofer_validate` runs  
**Then** Category 1 (Functional Correctness) and Category 2 (Test Authenticity)
score 0, the run reports FAIL, and the evidence table shows "no executed test
output" as the reason for those categories.

**Linked requirement**: FR-010, FR-013

---

### AT-003: Evidence Table Present on PASS Run (spec US-3)

**Given** a feature implementation that satisfies all rubric categories with verifiable evidence  
**When** `/6_gofer_validate` runs and produces a PASS  
**Then** `validation-report.md` contains an evidence table with all 11 categories populated,
each with at least one artifact path or command output reference, and a total of 110/110.

**Linked requirement**: FR-013, FR-014

---

### AT-004: Evidence Table Present on FAIL Run (spec US-3)

**Given** a feature implementation that fails one or more rubric categories  
**When** `/6_gofer_validate` runs and produces a FAIL  
**Then** `validation-report.md` contains an evidence table showing which categories scored 0
and the specific reason (absent/unverifiable evidence) for each.

**Linked requirement**: FR-013, FR-014

---

### AT-005: Helper Commands Emit to All Four Surfaces (spec US-2)

**Given** all five new helper command `.md` files are present in `.specify/commands/`  
**When** `npm run gofer:generate` is executed  
**Then** surfaces for Claude, Copilot, Codex, and Gemini are produced without errors,
and `npm run gofer:codex-doctor` reports the skill budget is within the 2048-byte limit.

**Linked requirement**: FR-006, NFR-001, NFR-002

---

### AT-006: gofer:vocabulary Produces Canonical Artifact (spec US-2)

**Given** a feature with spec.md and plan.md containing domain terminology  
**When** `gofer:vocabulary` is invoked on any of the four CLI surfaces  
**Then** a `glossary.md` file is written to `.specify/specs/{feature}/glossary.md`
with canonical term definitions, and no file is written to any other path.

**Linked requirement**: FR-001, NFR-006

---

### AT-007: Pipeline Stage Sequence Unchanged (spec US-2, US-4)

**Given** the five helper commands are added and stage-local augmentation seams are
optionally added to `/1`, `/2`, `/5`  
**When** the full pipeline is run from `/0_business_scenario` to `/6_gofer_validate`  
**Then** the stage IDs, routing, and state transitions are identical to the pre-feature baseline.
`PipelineStateManager.ts` and `pipeline-state.sh` require no code changes.

**Linked requirement**: FR-007, FR-015, NFR-003

---

### AT-008: No Matt Pocock Skills Mirrored Verbatim (spec §3 FR-017)

**Given** each of the five helper command files is reviewed  
**When** compared against the corresponding `mattpocock/skills` source  
**Then** all five files use Gofer naming conventions, Gofer artifact paths, and Gofer-owned
behavioral instructions. None contain verbatim copied text from the upstream skill SKILL.md files.

**Linked requirement**: FR-017  
**Reuse-scan traceability**: `reuse-scan.md § Skills to Avoid Mirroring Directly` and
`§ Required Skill Viability Check` (all five adapted skills confirm "Required adaptation" column).

---

*End of contract pack.*
