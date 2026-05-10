---
feature: 031-skills-pipeline-augmentation
spec: .specify/specs/031-skills-pipeline-augmentation/spec.md
research: .specify/specs/031-skills-pipeline-augmentation/research.md
status: ready
created: 2026-05-01
---

# Implementation Plan: 031 — Skills Pipeline Augmentation

**Branch**: `031-skills-pipeline-augmentation`
**Date**: 2026-05-01
**Spec**: `.specify/specs/031-skills-pipeline-augmentation/spec.md`
**Input**: Specification, research, contract-pack, reuse-scan, context-bundle in
`.specify/specs/031-skills-pipeline-augmentation/`

---

## Summary

This plan delivers two tightly coupled improvements to the Gofer workflow
platform:

1. **Five new cross-CLI helper commands** (`gofer:vocabulary`, `gofer:diagnose`,
   `gofer:tdd`, `gofer:spec-summary`, `gofer:zoom-out`) — each authored as a
   canonical `.specify/commands/gofer_*.md` file and emitted to all four CLI
   surfaces (Claude, Copilot, Codex, Gemini) via the existing
   `generate-commands.mjs` generator. No numbered pipeline stages are added or
   changed.

2. **Hardened `/6_gofer_validate` truthfulness** — mandatory evidence gates for
   Categories 1, 2, 3, and 5 plus a required evidence table in every
   `validation-report.md`. Deterministic FR-011 deployment/render scope
   detection is added to Step 1 (Load Context). All hardening is inside
   `.specify/commands/6_gofer_validate.md` only; no `/6A.x` sub-stages are
   created.

---

## Technical Context

**Language/Version**: Markdown (`.specify/commands/*.md` command definitions);
Node.js ≥ 20 (`.specify/scripts/node/generate-commands.mjs` and related `.mjs`
scripts); TypeScript 5.7.2 strict mode (test suite only — no new TypeScript
source files are introduced by this feature).

**Primary Dependencies**:
- `.specify/scripts/node/generate-commands.mjs` — surface emitter; accepts new
  `gofer_*.md` files without schema changes (confirmed by `gofer_side.md`,
  `gofer_constitution.md`, `gofer_hydrate.md` precedents).
- `.specify/scripts/node/canonical-descriptions.mjs` — Codex budget registry;
  must receive 5 new entries and pass `validateDescriptions()` (≤ 2048 cumulative
  bytes).
- `.specify/scripts/node/parse-stage-command.mjs` — YAML frontmatter parser;
  new helper files follow the same schema as existing control commands.

**Storage**: Filesystem only. All artifacts are Markdown files in
`.specify/commands/`, `.specify/specs/{feature}/`, and generated surface
directories.

**Testing**: Vitest (existing test harness, `npm test` at repo root). New tests
follow the patterns established in:
- `tests/unit/scripts/control-commands-surfaces.test.ts`
- `tests/unit/codex/canonical-set-cumulative-budget.test.ts`
- `tests/integration/cross-platform-parity.test.ts`
- `tests/unit/codex/codex-doctor.test.ts`

**Target Platform**: Multi-surface CLI tool (Claude Code CLI, GitHub Copilot
Chat, Codex, Gemini). No application runtime; no VSCode extension UI.

**Project Type**: Non-application workflow/platform feature. No application
journey applies.

**Performance Goals**: Generator run (`npm run gofer:generate`) must complete
without errors. `npm run gofer:codex-doctor` must report ≤ 2048 cumulative bytes
after adding 5 new entries.

**Constraints**:
- Numbered pipeline stages 0–10 must remain unchanged (IDs, files, routing).
- No new `/6A.x` sub-stages.
- No verbatim mirroring of `mattpocock/skills` content.
- `PipelineStateManager.ts` and `pipeline-state.sh` must preserve the existing
  numbered-stage sequence. `CommandGenerator.ts`, routing, and parity tests may
  receive targeted cross-CLI fixes so long as the 0–10 stage order stays
  unchanged.
- Codex skill-budget hard ceiling: ≤ 2048 cumulative UTF-8 bytes in
  `canonical-descriptions.mjs`.

**Scale/Scope**: 5 new helper command definition files + 4 modified numbered
stage files (`/1`, `/2`, `/5`, `/6`) + 1 updated generator registry + targeted
manifest/test updates in existing suites.

---

## Architecture / Implementation Approach

### Track A — Five New Helper Commands

Each helper follows the **Pattern 1: non-numbered control augmentation**
established by `.specify/commands/gofer_side.md`:

- File naming: `gofer_<slug>.md` (underscore, not hyphen — matches existing
  `gofer_side.md`, `gofer_constitution.md`).
- YAML frontmatter must include:
  - `name: gofer:<slug>` (colon-namespaced, not a numbered prefix)
  - `category: control`
  - `surfaces:` listing all nine surface keys identical to `gofer_side.md`:
    `claude`, `claude-mirror`, `copilot`, `vscode`, `codex`, `gemini`,
    `github-prompts`, `agents-skills`, `system-skills`
  - `description:` ≤ 140 characters (Codex budget per-description cap)
- Behavioral body: Gofer-owned instructions. Conceptual source (Matt Pocock
  `ubiquitous-language`, `diagnose`, `tdd`, `to-prd`, `zoom-out`) is used for
  design inspiration only; no verbatim text is copied.
- Artifact output paths are always `{FEATURE_DIR}/` (i.e.,
  `.specify/specs/{feature}/`) — never repo root or ad hoc paths.

After each helper file is authored, `generate-commands.mjs` propagates it to
all four CLI surface directories automatically. The Codex path additionally
requires a matching entry in `canonical-descriptions.mjs`.

Actual emitted helper skill files live at:

- `.agents/skills/gofer/<name>/SKILL.md`
- `.system/skills/gofer/<name>/SKILL.md`

The legacy flat aliases under `.agents/skills/<name>/` and
`.system/skills/<name>/` are an existing compatibility layer and are **not**
expanded by this feature. Helper parity tests must assert the real generated
paths from `generate-commands.mjs`, not the legacy flat aliases.

#### Stage-Local Augmentation Seams (P3)

Optional inline hints are added to three numbered stage files as lightweight
augmentation seams. These are additive callout blocks only — they do not change
stage IDs, routing, or artifact contracts:

| Stage file | Helper seam added | Invocation mode |
| --- | --- | --- |
| `.specify/commands/1_gofer_research.md` | `gofer:vocabulary` + `gofer:zoom-out` hints | Optional; requires `research.md`; graceful skip when absent |
| `.specify/commands/2_gofer_specify.md` | `gofer:vocabulary` + `gofer:spec-summary` hints | Optional; requires `spec.md`; graceful skip when absent |
| `.specify/commands/5_gofer_implement.md` | `gofer:tdd` + `gofer:diagnose` hints | Optional; graceful skip when artifacts absent |

The seam blocks are enclosed in a clearly marked "Optional Helper" section so
they cannot be confused with required steps. These changes are strictly additive
and do not alter existing behavior.

### Track B — Hardened `/6_gofer_validate`

All changes are inside `.specify/commands/6_gofer_validate.md`. The three-phase
(A/B/C) structure, the 11-category rubric table, and the numbered steps are
preserved. The following additions are made:

#### FR-011: Deterministic Deployment/Render Scope Detection

Added to **Step 1: Load Context**, immediately after `HAS_UI` detection, as a
new subsection: **Deployment/Render Scope Detection**.

The detection algorithm evaluates `spec.md` acceptance criteria, `plan.md`
architecture/tech-stack, `contract-pack.md`, and `quickstart.md` (when present)
for three named signals:

```
DEPLOY_SIGNAL_1: spec acceptance criteria contain any of:
  "rendered", "live route", "live API", "deployed", "production",
  "staging", "SharePoint", "Azure", "smoke", "E2E", "browser"

DEPLOY_SIGNAL_2: plan.md, contract-pack.md, or quickstart.md names a
  deployment target:
  SharePoint, Azure, staging, production, Vercel, Netlify, Docker,
  Kubernetes, or any named server/environment in the acceptance chain

DEPLOY_SIGNAL_3: plan.md declares a UI/rendered experience AND
  at least one spec acceptance criterion references user-visible
  behavior ("sees", "displays", "shows", "renders", "navigates to")

DEPLOY_IN_SCOPE = DEPLOY_SIGNAL_1 OR DEPLOY_SIGNAL_2 OR DEPLOY_SIGNAL_3
```

This determination is made once during Step 1 and stored as `DEPLOY_IN_SCOPE =
true | false`. For workflow-only features (like 031 itself),
`DEPLOY_IN_SCOPE = false` is expected. Category 3 only redistributes when
`HAS_UI = false`; if a feature still has a rendered UI while
`DEPLOY_IN_SCOPE = false`, local render proof is required.

#### Evidence Gates (FR-009, FR-010, FR-012)

Added as a new **Step 2.2: Evidence Gate Pre-Check** block immediately after the
"Spawn 6 Specialist Validation Agents" header and before their results are
evaluated. This pre-check runs in the main context (not a sub-agent):

```
GATE-1 (Integration Proof — Category 5):
  Require: runtime wiring artifact OR integration-test execution output
  present in the current session context by final scoring time.
  If absent during Step 2.2, record GATE-1 as pending and re-check it after
  Step 3 automated checks complete.
  Still absent after Step 3 → Category 5 score = 0; mark GATE_FAIL = true

GATE-2 (Test Execution — Categories 1 and 2):
  Require: real, executed npm test output with pass/fail count
  already present or produced by Step 3 automated checks before final scoring.
  If absent during Step 2.2, record GATE-2 as pending and re-check it after
  Step 3 automated checks complete.
  Still absent after Step 3 → Categories 1 and 2 score = 0; mark GATE_FAIL = true

GATE-3 (Deployment/Render — Category 3):
  IF HAS_UI = false:
    Record "N/A — HAS_UI=false" in evidence table.
    Record a matching not-in-scope reason in `Absent / Reason for 0`.
    Apply existing no-UI point redistribution.
  IF HAS_UI = true AND DEPLOY_IN_SCOPE = false:
    Require: local render proof (screenshot, component render assertion,
    headless browser assertion, or local smoke-check output) present by final
    scoring time.
    If absent during Step 2.2, record GATE-3 as pending and re-check before
    final PASS/FAIL synthesis.
    Still absent → Category 3 score = 0; mark GATE_FAIL = true
    If present, record "Render proof only — deployment target not in scope" in
    the evidence table and do not redistribute Category 3 points.
  IF HAS_UI = true AND DEPLOY_IN_SCOPE = true:
    Require: screenshot, curl/HTTP transcript, deployment log,
    headless browser assertion, or smoke-check output present by final scoring
    time.
    If absent during Step 2.2, record GATE-3 as pending and re-check before
    final PASS/FAIL synthesis.
    Still absent → Category 3 score = 0; mark GATE_FAIL = true

If any GATE_FAIL = true:
  - Any agent that would have scored the gated category is still run
    (for remediation notes) but its score is overridden to 0.
  - Report FAIL immediately after all agents complete.
  - Do not promote to PASS regardless of other scores.
```

#### Honest Scoring Rules (FR-012)

Added as an explicit rubric note below the scoring rules table:

> **Honest-scoring rule**: If an agent cannot find evidence, it MUST report
> that clearly using the phrase "EVIDENCE ABSENT:". The orchestrating `/6`
> stage MUST score that category 0. Phrases like "likely correct", "appears
> wired", or "should be passing" are NOT evidence and MUST NOT contribute to
> any score.

#### Evidence Table (FR-013, FR-014)

Added as a required section in **Step 8: Generate Validation Report**.
The evidence table is appended to the existing `validation-report.md` format
after the rubric summary. Structure matches `contract-pack.md § 6`.

---

## Constitution Check

**Gate: Must pass before Phase 1. Re-checked after Phase 3.**

| Principle | Check | Status |
| --- | --- | --- |
| I. Test-Driven Development | Tests authored in Phase 5 before Phase 6 smoke-run; acceptance tests (AT-001 through AT-008) drive Phase 3 and Phase 4 authoring | PASS |
| II. MCP-First Architecture | No new MCP tools; feature is workflow-only. N/A for this feature. | N/A |
| III. Spec Kit Format Compliance | All new `.specify/commands/` files follow the existing command schema (`name`, `description`, `title`, `category`, `surfaces`). `plan.md` and `audit-history.md` remain feature-scoped Spec Kit artifacts. | PASS |
| IV. Strict TypeScript & Code Quality | No new TypeScript production code. New test files follow `unknown`-over-`any` rule; explicit return types; no `require()`. | PASS |
| V. Security by Default | No auth, secrets, or input validation involved. N/A. | N/A |
| VI. Performance Requirements | Generator runtime is not user-interactive. Budget check via `gofer:codex-doctor` is the only perf gate. | PASS |
| VII. 80% Test Coverage | All new acceptance tests (AT-001–AT-008) are covered by plan tests in Phase 5. No uncovered FRs. | PASS |
| VIII. Minimal Necessary Changes | The feature stays focused on canonical command docs, generator/runtime parity glue, repo-root manifests, installer/resource-sync wiring, and targeted tests/fixtures. `PipelineStateManager.ts` and `pipeline-state.sh` remain untouched; `CommandGenerator.ts`, router, and parity coverage are allowed only where needed to preserve truthful cross-CLI behavior. | PASS |

**Complexity Tracking**: No constitution violations. No TypeScript production
code changes. No abstractions introduced.

---

## Implementation Phases

### Phase 1 — Helper Command Definitions (Track A, Part 1)

Author the five canonical command files in `.specify/commands/`. Each file is
independent; all five can be drafted in parallel.

**Overwrite policy (applies to T1.1–T1.5)**: if the helper's feature-scoped
artifact already exists, overwrite it in place and prepend
`<!-- regenerated at HH:MM -->` so regeneration is explicit and traceable.

#### Tasks

- [ ] **T1.1** Create `.specify/commands/gofer_vocabulary.md`
  - Frontmatter: `name: gofer:vocabulary`, `title: "Gofer Vocabulary"`,
    `category: control`, all 9 surfaces, description ≤ 140 chars.
  - Body: Gofer-owned instructions. Extract domain terminology from
  `.specify/specs/{feature}/spec.md` and `.specify/specs/{feature}/plan.md`.
  Write canonical term definitions to `.specify/specs/{feature}/glossary.md`.
  Require the generated artifact to record `GeneratedAt`, `SourceCommandId`,
  `SourceInputs`, and `OverwriteNoticeWhenApplicable` (when the file is being
  replaced).
  If the file already exists, overwrite with a `<!-- regenerated at HH:MM -->`
  header so traceability is preserved (AC for edge case in spec §2).
    Do NOT write to repo root. Do NOT use any `mattpocock/ubiquitous-language`
    verbatim text.
  - Verify: run a real parse call such as
    `node --input-type=module -e "import { parseStageCommand } from './.specify/scripts/node/parse-stage-command.mjs'; await parseStageCommand('.specify/commands/gofer_vocabulary.md')"`
    and confirm frontmatter `title`, `surfaces`, and `description` all validate.

- [ ] **T1.2** Create `.specify/commands/gofer_diagnose.md`
  - Frontmatter: `name: gofer:diagnose`, `title: "Gofer Diagnose"`,
    `category: control`, all 9 surfaces.
  - Body: Reproduce-minimize-instrument-fix loop. Write findings to
  `.specify/specs/{feature}/diagnose-report.md`. Requires reproduction steps,
  minimization result, instrumentation output, and proposed fix.
  Require the generated artifact to record `GeneratedAt`, `SourceCommandId`,
  `SourceInputs`, and `OverwriteNoticeWhenApplicable` (when the file is being
  replaced).
  Must not mirror `mattpocock/diagnose` verbatim; preserve the real
  feedback-loop discipline in Gofer terms.
    If `diagnose-report.md` already exists, overwrite it using the shared
    regeneration header policy above.
  - Verify: same real `parseStageCommand()` invocation pattern + frontmatter
    checks as T1.1.

- [ ] **T1.3** Create `.specify/commands/gofer_tdd.md`
  - Frontmatter: `name: gofer:tdd`, `title: "Gofer TDD"`, `category: control`,
    all 9 surfaces.
  - Body: Red-green-refactor micro-loop. Operates within `/5_gofer_implement`
  and `/9_gofer_tests` task scope; does NOT replace those numbered stages.
  Write cycle log to `.specify/specs/{feature}/tdd-session.md`. Aligned to
  spec acceptance criteria, not a standalone lifecycle.
  Require the generated artifact to record `GeneratedAt`, `SourceCommandId`,
  `SourceInputs`, and `OverwriteNoticeWhenApplicable` (when the file is being
  replaced).
  If `tdd-session.md` already exists, overwrite it using the shared
  regeneration header policy above.
  - Verify: same real `parseStageCommand()` invocation pattern + frontmatter
    checks as T1.1.

- [ ] **T1.4** Create `.specify/commands/gofer_spec_summary.md`
  - Frontmatter: `name: gofer:spec-summary`, `title: "Gofer Spec Summary"`,
    `category: control`, all 9 surfaces.
  - Body: Business-friendly summary of feature purpose, value, and acceptance
  criteria without implementation detail. Write to
  `.specify/specs/{feature}/spec-summary.md`. Remove all issue-tracker
  publish dependency from any Matt Pocock `to-prd` inspiration — Gofer owns
  the artifact.
  Require the generated artifact to record `GeneratedAt`, `SourceCommandId`,
  `SourceInputs`, and `OverwriteNoticeWhenApplicable` (when the file is being
  replaced).
  If `spec-summary.md` already exists, overwrite it using the shared
  regeneration header policy above.
  - Verify: same real `parseStageCommand()` invocation pattern + frontmatter
    checks as T1.1.

- [ ] **T1.5** Create `.specify/commands/gofer_zoom_out.md`
  - Frontmatter: `name: gofer:zoom-out`, `title: "Gofer Zoom Out"`,
    `category: control`, all 9 surfaces.
  - Body: System-context expansion. Show how the current feature connects to
  broader architectural boundaries. Write to
  `.specify/specs/{feature}/zoom-out-report.md`. Minimal adaptation from
  `zoom-out` concept.
  Require the generated artifact to record `GeneratedAt`, `SourceCommandId`,
  `SourceInputs`, and `OverwriteNoticeWhenApplicable` (when the file is being
  replaced).
  If `zoom-out-report.md` already exists, overwrite it using the shared
  regeneration header policy above.
  - Verify: same real `parseStageCommand()` invocation pattern + frontmatter
    checks as T1.1.

#### Verification Criteria (Phase 1)

```bash
# Parse all five new files through the schema validator
for f in gofer_vocabulary gofer_diagnose gofer_tdd gofer_spec_summary gofer_zoom_out; do
  node --input-type=module -e "import { parseStageCommand } from './.specify/scripts/node/parse-stage-command.mjs'; await parseStageCommand('./.specify/commands/' + process.argv[1] + '.md')" "$f" && echo "PASS: $f"
done

# Confirm no verbatim Matt Pocock text is present (manual review gate)
# Check that name field follows gofer:<slug> pattern
grep -h "^name:" .specify/commands/gofer_vocabulary.md \
  .specify/commands/gofer_diagnose.md \
  .specify/commands/gofer_tdd.md \
  .specify/commands/gofer_spec_summary.md \
  .specify/commands/gofer_zoom_out.md
```

---

### Phase 2 — Generator Wiring and Cross-CLI Emission

Register the five new helpers in `canonical-descriptions.mjs`, verify the Codex
budget, run the generator, and confirm all four CLI surfaces are emitted.

#### Tasks

- [ ] **T2.1** Update `.specify/scripts/node/canonical-descriptions.mjs` and
  `.specify/scripts/node/codex-doctor.mjs`:
  Add five new helper entries to `CANONICAL_DESCRIPTIONS`, revise the existing
  `6_gofer_validate` description to truthful 110-point evidence-backed wording,
  and update `.specify/scripts/node/codex-doctor.mjs` so its canonical skill
  inventory recognizes the same five helpers (reassessing the bundle-threshold
  heuristic if needed). Each description must be ≤ 140 chars. Cumulative byte
  total must remain ≤ 2048 bytes after addition. Suggested helper entries
  (confirm bytes before committing):

  ```javascript
  'gofer:vocabulary':
    'Extract domain terminology into a canonical feature glossary.',
  'gofer:diagnose':
    'Run a reproduce-minimize-instrument-fix loop for bugs and failing tests.',
  'gofer:tdd':
    'Guide a red-green-refactor loop tied to spec acceptance criteria.',
  'gofer:spec-summary':
    'Generate a business-friendly summary of feature value and scope.',
  'gofer:zoom-out':
    'Show how the current feature connects to broader system boundaries.',
  ```

  After updating both files, call `validateDescriptions()` in a quick node
  check:
  ```bash
   node -e "import('.specify/scripts/node/canonical-descriptions.mjs')
     .then(m => console.log(m.validateDescriptions()))"
   ```
  Then run the stricter wire-format budget check used by the Codex cumulative
  budget test:
  ```bash
  node -e "import('.specify/scripts/node/canonical-descriptions.mjs').then(m => {
    let total = 0;
    for (const [key, value] of Object.entries(m.CANONICAL_DESCRIPTIONS)) {
      total += Buffer.byteLength(`${key}: ${value}\n`, 'utf8');
    }
    console.log(`wire-format bytes: ${total} / 2048`);
    if (total > 2048) process.exit(1);
  })"
  ```
  If this check fails or the total exceeds 2048 bytes, treat Codex helper
  emission as **blocked**. Do not accept partially emitted helper surfaces;
  shorten descriptions first, then rerun generation.

- [ ] **T2.2** Run the generator in dry-run mode first:
  ```bash
  npm run gofer:generate -- --dry-run
  ```
  Confirm the dry-run output lists:
  - the helper names in the `[dry-run] Stages:` line
  - the selected surface set in the `[dry-run] Would emit to surfaces:` line,
    including `claude`, `claude-mirror`, `copilot`, `github-prompts`,
    `agents-skills`, `system-skills`, `gemini`, `agents-md`, and
    `codex-config`
  - zero validation errors before any file is written. The generator
    dry-run lists all emitter surfaces, not only the user-facing CLI surfaces.

- [ ] **T2.3** Run the generator for real:
  ```bash
  npm run gofer:generate
  ```
  Verify the following output paths are written (non-exhaustive; confirm
  against `generate-commands.mjs` emitter routing):
  - `.claude/commands/gofer:vocabulary.md` (and 4 other helpers)
  - `extension/resources/claude-commands/gofer:vocabulary.md`
  - `.github/prompts/gofer:vocabulary.prompt.md`
  - `extension/resources/copilot-prompts/gofer:vocabulary.prompt.md`
  - `.agents/skills/gofer/gofer:vocabulary/SKILL.md`
  - `.system/skills/gofer/gofer:vocabulary/SKILL.md`
  - `.gemini/commands/gofer/gofer:vocabulary.md`
  - `.gemini/commands/gofer/gofer:vocabulary.toml`
  - `.gemini/commands/gofer/manifest.json`
  - `.gemini/extension.json`

- [ ] **T2.4** Run the Codex doctor as an installed-surface smoke check:
  ```bash
  npm run gofer:codex-doctor
  ```
  Expect exit 0 when local Codex skills are present. If the workstation does
  not have a readable `~/.codex/skills` root, record that limitation and rely
  on the Phase 2 wire-format check plus the Phase 5 source-tree budget tests as
  the authoritative gate. Treat this as a supplementary installed-surface
  verification. If either gate reports a budget regression (> 2048 bytes), the
  helper release is blocked and partially emitted helper surfaces are not
  accepted. Log any reported byte total for the audit trail.

#### Verification Criteria (Phase 2)

```bash
npm run gofer:generate -- --dry-run
npm run gofer:generate && npm run gofer:codex-doctor
# Dry-run lists the five helpers and selected surfaces. Real run emits the helper
# files to all generated surface directories. Byte total printed and ≤ 2048.
```

---

### Phase 3 — /6 Validate Hardening (Track B)

Modify `.specify/commands/6_gofer_validate.md` with the three evidence gates,
deterministic FR-011 deployment/render detection, honest-scoring rule, and
evidence table requirement. No new phases or `/6A.x` stages are added; the only
allowed structural change is the inline `Step 2.2` insertion inside existing
Phase A.

#### Tasks

- [ ] **T3.1** Add **Deployment/Render Scope Detection** subsection to Step 1
  (Load Context), immediately after the `HAS_UI` detection block (after line
  containing `HAS_UI = false → apply point redistribution`).

  Content to add (verbatim block):

  ```markdown
  **Deployment/Render Scope Detection** (FR-011):

  Scan `spec.md`, `plan.md`, `contract-pack.md`, and `quickstart.md` (when
  present) for the following signals:

  - DEPLOY_SIGNAL_1: any acceptance criterion contains the keywords:
    `rendered`, `live route`, `live API`, `deployed`, `production`, `staging`,
    `SharePoint`, `Azure`, `smoke`, `E2E`, `browser`
  - DEPLOY_SIGNAL_2: `plan.md`, `contract-pack.md`, or `quickstart.md` names a deployment target:
    SharePoint, Azure, staging, production, Vercel, Netlify, Docker, Kubernetes,
    or any server/environment referenced in the acceptance chain
  - DEPLOY_SIGNAL_3: `plan.md` declares a UI/rendered experience AND at least
    one acceptance criterion uses: `sees`, `displays`, `shows`, `renders`,
    `navigates to`

  Set `DEPLOY_IN_SCOPE = true` if ANY signal is present.
  Set `DEPLOY_IN_SCOPE = false` if NO signal is present.
  Record the determination in the validation report preamble.

  Example for workflow-only features: `DEPLOY_IN_SCOPE = false` —
  Category 3 redistributes only when `HAS_UI = false`; otherwise a local render
  artifact is still required.
  ```

- [ ] **T3.2** Add **Step 2.2: Evidence Gate Pre-Check** block as a new step
  heading between the "Run all 6 core agents in parallel" instruction and the
  "Collect all results before proceeding" instruction in Phase A. This step runs
  in the main context after Step 2 agents have been _launched_ but _before_
  scoring. Content to add per the Architecture section above (GATE-1, GATE-2,
  GATE-3 logic with GATE_FAIL semantics). Also update the existing Step 7
  Category 3 scoring text so it references `DEPLOY_IN_SCOPE` / `GATE-3` instead
  of relying on `HAS_UI` alone.

- [ ] **T3.3** Add **Honest-Scoring Rule** paragraph to the Scoring Rules
  subsection (the section that currently ends with "Anything less = FAIL"):

  > **Honest-scoring rule (FR-012)**: If an agent reports "EVIDENCE ABSENT:",
  > the orchestrating stage MUST score that category 0 regardless of other
  > findings. Phrases like "likely correct", "appears wired", or "should be
  > passing" are NOT evidence and MUST NOT contribute to any score. Any rubric
  > category where evidence is absent, unverifiable, fabricated, or implied
  > scores exactly 0 — no partial credit.

- [ ] **T3.4** Add **Evidence Table** requirement to Step 8 (Generate Validation
  Report). Append the following instruction after the existing
  report-writing block:

  ```markdown
  **Required: Evidence Table** (FR-013, FR-014)

  Append an evidence table to `validation-report.md` on EVERY run (PASS and FAIL).
  Start the section with the exact heading `## Evidence Table`.
  Use the exact structure from `contract-pack.md § 6`:

  | Category | Score | Evidence Artifact / Command Output | Absent / Reason for 0 |
  | --- | --- | --- | --- |
  | 1 — Functional Correctness | [pts] | [path or "npm test output, run at HH:MM"] | [if 0: reason] |
  | 2 — Test Authenticity | [pts] | [path or mutation score] | [if 0: reason] |
| 3 — UI/E2E Verification | [pts] | ["N/A — HAS_UI=false", "Render proof only — deployment target not in scope", or render/deploy artifact] | [if 0: reason] |
  | 4 — Security Posture | [pts] | [agent finding reference] | [if 0: reason] |
  | 5 — Integration Reality | [pts] | [runtime wiring proof: file:line or test output] | [if 0: reason] |
  | 6 — Error Path Coverage | [pts] | [agent finding reference] | [if 0: reason] |
  | 7 — Architecture Compliance | [pts] | [agent finding reference] | [if 0: reason] |
  | 8 — Performance Baseline | [pts] | [agent finding reference] | [if 0: reason] |
  | 9 — Code Hygiene | [pts] | [agent finding reference] | [if 0: reason] |
  | 10 — Specification Traceability | [pts] | [agent finding reference] | [if 0: reason] |
  | 11 — Blast Radius Containment | [pts] | [blast-radius-report.md reference] | [if 0: reason] |
  | **Total** | **[total]/110** | | |

  Each `Evidence Artifact / Command Output` cell MUST contain at least one of:
  - A file path visible in the current session
  - An executed command and its real output (with timestamp)
  - A sub-agent finding citation (agent name + finding ID)

  This evidence-table section is additive: it must be appended after the existing
  report sections and must not remove or rewrite legacy `validation-report.md`
  content.

  An empty evidence cell or a cell containing only inferences/assumptions
  MUST cause that category to score 0.
  `validation-report.md` must record `/6` provenance fields sufficient to trace
  the run: `GeneratedAt`, `SourceCommandId`, `SourceInputs`, and
  `OverwriteNoticeWhenApplicable` when the report is rewritten.
  Category 11's evidence cell MUST cite `blast-radius-report.md`.
  When Category 3 is not in scope, the report preamble or row text MUST make
  redistribution explicit enough that normalization/effective contribution
  remains derivable from the persisted report.
  ```

- [ ] **T3.5** Verify the file change is additive except for the minimal wording
  correction required to align any stale Phase B / Step 3 order summary with the
  actual step headings and pending-gate semantics. The existing phase structure,
  rubric table, and scoring rules must still be intact, with `Step 2.2` as the
  only additive numbered-step insertion. Confirm via diff that no unrelated
  pre-existing lines were removed, only new content appended/inserted plus that
  targeted outline clarification. Also update
  `tests/unit/autonomous/WorkspaceContextProvider.test.ts` so the existing
  `validation-report.md` consumer is exercised with a legacy pre-evidence-table
  report body and still detects the `validate` stage without requiring
  `## Evidence Table`. Add `tests/unit/scripts/validation-report-compat.test.ts`
  to exercise a legacy pre-evidence-table report sample and a post-feature
  sample, confirming the legacy sections remain readable when
  `## Evidence Table` is appended. Update any stale `/6` metadata/frontmatter
  wording in `.specify/commands/6_gofer_validate.md` so it no longer describes
  validation as "six quality dimensions" or a "100-point rubric".

#### Verification Criteria (Phase 3)

```bash
# Confirm step structure preserved (existing step headings must all be present)
grep "^## Step\|^# Phase" .specify/commands/6_gofer_validate.md

# Confirm new sections are present
grep "DEPLOY_IN_SCOPE\|GATE-1\|GATE-2\|GATE-3\|Evidence Gate\|Honest-scoring rule\|Evidence Table" \
  .specify/commands/6_gofer_validate.md

# Confirm no /6A.x files created
ls .specify/commands/ | grep "6[aA]" | grep -v "6a_gofer_engineering_review"
# Expected output: empty (the pre-existing 6a file is intentionally filtered out)
```

---

### Phase 4 — Stage-Local Augmentation Seams (US-4, P3)

Add selector-driven optional helper seams to three existing numbered stage
files. These are purely additive blocks: they define provider-neutral
activation selectors and inline helper behavior, but they do not change stage
numbering, routing, or persisted pipeline state.

#### Tasks

- [ ] **T4.1** Add `gofer:vocabulary` and `gofer:zoom-out` selector-driven seam
  guidance to
  `.specify/commands/1_gofer_research.md`.
  Location: end of the stage body, in a new fenced section:
  ```markdown
  ---
  ## Optional Helpers: Vocabulary Extraction and Zoom-Out
  If the operator explicitly requests the `vocabulary` selector after
  `research.md` exists, run `gofer:vocabulary` inline and write
  `.specify/specs/{feature}/glossary.md` using the same artifact contract as
  the standalone helper.
  If the operator explicitly requests the `zoom-out` selector after
  `research.md` exists, run `gofer:zoom-out` inline and write
  `.specify/specs/{feature}/zoom-out-report.md` using the same artifact
  contract as the standalone helper.
  If `research.md` is missing, continue the stage normally and report that the
  helper was not run.
  These selectors are optional and do not change stage progress, routing, or
  pipeline state.
  ---
  ```

- [ ] **T4.2** Add `gofer:vocabulary` and `gofer:spec-summary` selector-driven
  seam guidance to
  `.specify/commands/2_gofer_specify.md`.
  Same fenced section format at end of body. Vocabulary extraction is
  particularly useful after spec.md is stabilized; `gofer:spec-summary` is the
  optional business-facing summary seam for the same stage.
  ```markdown
  ---
  ## Optional Helpers: Vocabulary Extraction and Spec Summary
  - If the operator explicitly requests the `vocabulary` selector after
    `spec.md` is stabilized, run `gofer:vocabulary` inline and write
    `.specify/specs/{feature}/glossary.md` using the same artifact contract as
    the standalone helper.
  - If the operator explicitly requests the `spec-summary` selector after
    `spec.md` is stabilized, run `gofer:spec-summary` inline and write
    `.specify/specs/{feature}/spec-summary.md` using the same artifact contract
    as the standalone helper.
  - If `spec.md` is missing, continue the stage normally and report that the
    helper was not run.
  - These selectors are optional and do not change stage progress, routing, or
    pipeline state.
  ---
  ```

- [ ] **T4.3** Add `gofer:tdd` and `gofer:diagnose` selector-driven seam
  guidance to
  `.specify/commands/5_gofer_implement.md`.
  ```markdown
  ---
  ## Optional Helpers: TDD and Diagnose
  - If the operator explicitly requests `tdd-assist` and both `spec.md` and
    `tasks.md` are present, run `gofer:tdd` inline and write
    `.specify/specs/{feature}/tdd-session.md` using the same artifact contract
    as the standalone helper.
  - If the operator explicitly requests `diagnose` and `spec.md` is present, run
    `gofer:diagnose` inline; bug context, failing output, or equivalent failure
    evidence may supplement the investigation. Write
    `.specify/specs/{feature}/diagnose-report.md` using the same artifact
    contract as the standalone helper.
  - If the required inputs are missing, continue the stage normally and report
    that the helper was not run.
  - These selectors are optional and do not change stage progress, routing, or
    pipeline state.
  ---
  ```

- [ ] **T4.4** Re-run the generator to emit updated stage surfaces:
  ```bash
  npm run gofer:generate
  ```
  Stage-local seams must not break existing surface emission.

#### Verification Criteria (Phase 4)

```bash
# Confirm seam sections, selector tokens, and helper names are present
grep -E "gofer:vocabulary|gofer:zoom-out|vocabulary|zoom-out" \
  .specify/commands/1_gofer_research.md \
&& grep -E "gofer:vocabulary|gofer:spec-summary|vocabulary|spec-summary" \
  .specify/commands/2_gofer_specify.md \
&& grep -E "gofer:tdd|gofer:diagnose|tdd-assist|diagnose" \
  .specify/commands/5_gofer_implement.md

# Confirm stage IDs and numbered filenames are untouched
ls .specify/commands/ | grep "^[0-9]" | sort
# Must be identical to pre-feature baseline:
# 0_business_scenario.md, 0a_problem_validation.md, 1_gofer_research.md,
# 2_gofer_specify.md, 3_gofer_plan.md, 4_gofer_tasks.md, 5_gofer_implement.md,
# 6_gofer_validate.md, 6a_gofer_engineering_review.md, 7_gofer_save.md,
# 7a_stakeholder_comms.md, 8_gofer_resume.md, 9_gofer_tests.md, 10_gofer_cloud.md

# Confirm no changes to protected runtime files
git diff --name-only | grep -E "PipelineStateManager|pipeline-state\.sh|CommandGenerator\.ts|CrossPlatformCommandRouter\.ts"
# Must return empty
```

---

### Phase 5 — Test Suite

Add new test assertions to existing test files and create focused new test
files for the acceptance tests defined in `contract-pack.md § 9`. All tests
follow existing Vitest patterns.

**Protected boundary**: leave `tests/integration/cross-platform-parity.test.ts`
unchanged in this feature. That suite currently exercises legacy flat
`.system/skills/<command>/SKILL.md` routing. Helper parity for this feature is
proven in a dedicated helper test against the real generator outputs under
`.agents/skills/gofer/` and `.system/skills/gofer/`.

#### Tasks

- [ ] **T5.1** Update `tests/unit/scripts/control-commands-surfaces.test.ts`:
  Add the five new helpers to the `CONTROL_COMMANDS` array:
  ```typescript
  const CONTROL_COMMANDS = [
    'gofer_plan.md',
    'gofer_side.md',
    'gofer_personality.md',
    // 031 additions:
    'gofer_vocabulary.md',
    'gofer_diagnose.md',
    'gofer_tdd.md',
    'gofer_spec_summary.md',
    'gofer_zoom_out.md',
  ];
  ```
  The existing surface-set check (`EXPECTED_SURFACES`) must pass for all five.
  Also update the human-readable assertion label from
  `all three control-command files exist on disk` to
  `all control-command files exist on disk`; make no behavioral changes beyond
  the expanded helper list and label refresh.

- [ ] **T5.2** Update `tests/unit/scripts/description-budget.test.ts`:
  Extend `EXPECTED_STAGES` with the five new helper names and update the hard
  count assertions from `16` to `21`:
  ```typescript
  'gofer:vocabulary',
  'gofer:diagnose',
  'gofer:tdd',
  'gofer:spec-summary',
  'gofer:zoom-out',
  ```
  Update:
  - `contains exactly 16 stage descriptions` → `contains exactly 21 stage descriptions`
  - `contains all 16 expected stage names` → `contains all 21 expected stage names`
  Keep the existing per-description and cumulative-byte assertions unchanged.

- [ ] **T5.3** Update `tests/unit/scripts/canonical-descriptions.test.ts`:
  - Import `beforeAll` from `vitest` (the file already calls it via Vitest
    globals, but the import should be explicit once this file is touched).
  - Extend `expectedStages` with the five new helper names.
  - Update:
    - `has exactly 16 stage descriptions` → `has exactly 21 stage descriptions`
    - `validateDescriptions() returns correct count ...` expected `16` → `21`

- [ ] **T5.4** Update `tests/unit/codex/canonical-set-cumulative-budget.test.ts`:
  Update the `canonical set has 16 descriptions` assertion to `21`:
  ```typescript
  it('canonical set has 21 descriptions', () => {
    expect(Object.keys(CANONICAL_DESCRIPTIONS)).toHaveLength(21);
  });
  ```
  The existing `≤ 2048 bytes` wire-format assertion remains authoritative — keep
  the budget logic unchanged, but ensure the new helper descriptions are short
  enough for it to pass and mirror the same check in Phase 2 before running the
  full suite.

- [ ] **T5.5** Create
  `tests/unit/scripts/helper-commands-cross-cli-parity.test.ts`:
  Tests AT-005, AT-006, and AT-008 (acceptance test coverage for US-2,
  cross-CLI parity, artifact path correctness, no verbatim mirroring).

  Assertions:
  - all five helper source files exist in `.specify/commands/`
  - each helper frontmatter exposes the full 9-surface set, `category=control`,
    `name=gofer:*`, a non-empty `title`, and `description.length <= 140`
  - after `npm run gofer:generate`, emitted helper files exist at the **actual**
    generator output paths:
    - `.claude/commands/<name>.md`
    - `extension/resources/claude-commands/<name>.md`
    - `.github/prompts/<name>.prompt.md`
    - `extension/resources/copilot-prompts/<name>.prompt.md`
    - `.agents/skills/gofer/<name>/SKILL.md`
    - `.system/skills/gofer/<name>/SKILL.md`
    - `.gemini/commands/gofer/<name>.md`
    - `.gemini/commands/gofer/<name>.toml`
  - each helper body contains its exact artifact contract path and filename:
    `glossary.md`, `diagnose-report.md`, `tdd-session.md`, `spec-summary.md`,
    `zoom-out-report.md` under `.specify/specs/{feature}/`
  - each helper body contains explicit overwrite/regeneration language so
    re-invocation is traceable (`overwrite` / `regenerated`)
  - normalize the emitted provider surfaces and assert the user-observable
    helper contract is equivalent across Claude, Copilot, Codex, and Gemini:
    same helper identifier, same artifact path, same overwrite/provenance
    instructions, and same selector tokens where the source command defines a seam
  - stage-local seam blocks in `/1`, `/2`, and `/5` reference the same helper
    names, artifact filenames, and explicit same-contract language as the
    standalone command definitions
  - stage-local seam blocks include the exact provider-neutral activation
    selectors `vocabulary`, `zoom-out`, `spec-summary`, `tdd-assist`, and
    `diagnose`
  - stage-local seam blocks explicitly state the stage continues normally when
    required inputs are missing
  - each helper body requires generated artifacts to record the minimum
    provenance schema: `GeneratedAt`, `SourceCommandId`, `SourceInputs`, and
    `OverwriteNoticeWhenApplicable`
  - helper bodies do not contain forbidden upstream tokens:
    `setup-matt-pocock-skills`, `/setup-matt-pocock-skills`,
    `UBIQUITOUS_LANGUAGE.md`
  - document in the test file that this automated token scan is intentionally
    narrow and that T6.7 manual review is the authoritative FR-017 gate
  - numbered stage file set remains unchanged and the only lettered stage file
    is the existing `6a_gofer_engineering_review.md`

- [ ] **T5.6** Create
  `tests/unit/scripts/validation-evidence-gates.test.ts`:
  Tests AT-001, AT-002, AT-003, AT-004 (validation truthfulness gates).
  These are specification-level contract tests: they verify the
  `6_gofer_validate.md` command file contains the required gate language,
  rather than attempting to execute a full `/6` run (which requires a full
  pipeline context).

  Assertions:
  - `GATE-1` integration proof block exists, names Category 5, and sets
    `GATE_FAIL`, `final scoring time`, and the Step 3 re-check language
  - `GATE-2` test execution block exists, names Categories 1 and 2, and
    requires real executed `npm test` output already present or produced by
    Step 3 automated checks before final scoring
  - `GATE-3` deployment/render block exists, includes the `HAS_UI = false`,
    `HAS_UI = true AND DEPLOY_IN_SCOPE = false`, and
    `HAS_UI = true AND DEPLOY_IN_SCOPE = true` branches, names Category 3, and
    sets `GATE_FAIL` with a pre-synthesis re-check
  - the `HAS_UI = false` branch records `N/A — HAS_UI=false` and preserves the
    no-UI redistribution path plus an explicit not-in-scope reason
  - the `HAS_UI = true AND DEPLOY_IN_SCOPE = false` branch records
    `Render proof only — deployment target not in scope` and makes local render
    proof mandatory
  - deployment/render scope detection includes `DEPLOY_SIGNAL_1`,
    `DEPLOY_SIGNAL_2`, `DEPLOY_SIGNAL_3`, and `DEPLOY_IN_SCOPE`
  - evidence table is required on **EVERY run (PASS and FAIL)** and includes
    the exact heading `## Evidence Table`, `Evidence Artifact / Command Output`,
    `Absent / Reason for 0`, and the `Total` row after the 11 rubric categories
  - the evidence-table instructions explicitly state the section is appended /
    additive and does not rewrite prior `validation-report.md` content
  - validation-report instructions include `/6` provenance fields:
    `GeneratedAt`, `SourceCommandId`, `SourceInputs`, and
    `OverwriteNoticeWhenApplicable`
  - the `HAS_UI = true AND DEPLOY_IN_SCOPE = false` path makes render-only
    scoring explicit enough to derive normalization/effective contribution from
    the persisted report
  - PASS-path language states a fully evidenced run writes `validation-report.md`
    with a populated evidence table and does not grant PASS when gated evidence
    is absent
  - honest-scoring rule includes `EVIDENCE ABSENT` and `exactly 0`
  - no new `/6A.x` headings or sub-stage definitions are introduced

- [ ] **T5.7** Update `tests/unit/scripts/byte-equivalence.test.ts`:
  Add the five new helper filenames to the `CONTROL_COMMAND_FILES` exclusion
  set so the suite continues to treat control commands as golden-fixture
  exemptions:
  ```typescript
  'gofer_vocabulary.md',
  'gofer_diagnose.md',
  'gofer_tdd.md',
  'gofer_spec_summary.md',
  'gofer_zoom_out.md',
  ```
  Keep the fixture-count expectation aligned with the exclusion behavior; no new
  golden fixtures are required for these helpers.

- [ ] **T5.8** Update `tests/unit/scripts/stage-manifest.test.ts`:
  Extend `EXPECTED_CONTROL_COMMANDS` with the five new helpers and update the
  derived control/total command counts from `3/19` to `8/24` so the manifest
  assertions match the live `.specify/commands/` directory after Phase 1.

- [ ] **T5.9** Update `tests/unit/scripts/generator-regression.test.ts`:
  Extend `EXPECTED_CONTROL_COMMANDS` with the five new helper slugs and update
  the derived total command count from `19` to `24`. Refresh the test comment so
  it reflects `16` numbered/lettered pipeline stages plus `8` control commands.

- [ ] **T5.10** Update source-of-truth and manifest inventory tests:
  - `tests/unit/scripts/alias-uniqueness.test.ts`
  - `tests/unit/scripts/e2e-pipeline-smoke.test.ts`
  - `tests/unit/scripts/numbered-vs-namespaced-parity.test.ts`
  - `tests/unit/scripts/surface-exclusion.test.ts`
  - `tests/unit/cli/picker-fuzzy.test.ts`
  - `tests/unit/scripts/claude-plugin-manifest-valid.test.ts`
  - `tests/unit/scripts/agents-md-shape.test.ts`
  - `.claude-plugin/plugin.json`
  - `AGENTS.md`

  Adjust hardcoded source-of-truth / generated-command totals from `19` to `24`
  and refresh the human-readable labels so they reference `16`
  numbered/lettered pipeline/utility commands plus `8` control commands.
  `AGENTS.md` at repo root and `.claude-plugin/plugin.json` are hand-maintained,
  non-authoritative manifests for current tests; `.specify/commands/*.md`
  remains the sole source of truth. Keep `e2e-pipeline-smoke.test.ts` and
  `numbered-vs-namespaced-parity.test.ts` as the automated pipeline-sequence
  guards for AT-007 / SC-006. Use the real identifier conventions for each
  hand-maintained file:
  - `AGENTS.md` headings use namespaced helper identifiers such as
    `gofer:vocabulary`
  - `.claude-plugin/plugin.json` command names use namespaced identifiers such
    as `gofer:vocabulary`
  - `codex-config.toml` entries use `gofer/gofer:*` identifiers such as
    `gofer/gofer:vocabulary`
  Also update the stale `/6` copy in both `AGENTS.md` and
  `.claude-plugin/plugin.json`: replace the outdated "100-point rubric" /
  "six quality dimensions" wording with the current truthful 110-point
  evidence-backed contract language.

- [ ] **T5.11** Update Codex/Gemini inventory tests, Codex doctor coverage, and
  the repo-root Codex manifest:
  - `tests/unit/codex/e2e-codex-clean-environment.test.ts` — update
    `validateDescriptions().count` from `16` to `21`
  - `tests/unit/codex/codex-only-emit.test.ts` — update the allowed helper/control
    command set and emitted-count expectations for the five new helpers
  - `tests/unit/codex/codex-doctor.test.ts` — update canonical-skill fixture
    inventory and expected skill-file totals to the 21-skill helper-inclusive set
  - `tests/unit/codex/e2e-codex-doctor-smoke.test.ts` — update duplicate-bundle
    smoke fixtures to the same 21-skill helper-inclusive set
  - `tests/unit/scripts/gemini-extension-manifest-valid.test.ts` — update
    generated `.toml` count from `19` to `24`
  - `tests/unit/scripts/e2e-gemini-extension.test.ts` — update generated `.toml`
    count from `19` to `24`
  - `tests/unit/codex/codex-config-toml-shape.test.ts` — update
    `[[skills.config]]` block count from `19` to `24`
  - `codex-config.toml` — refresh/sync the committed repo-root downstream copy so
    it contains the five new helper `[[skills.config]]` blocks and matches the
    generated
    `.specify/outputs/codex-config-fragment.toml`

- [ ] **T5.12** Refresh byte-equivalence golden fixtures for the four modified
  numbered stage files after Phases 3 and 4 finalize:
  - `tests/fixtures/golden/claude-commands/1_gofer_research.md`
  - `tests/fixtures/golden/claude-commands/2_gofer_specify.md`
  - `tests/fixtures/golden/claude-commands/5_gofer_implement.md`
  - `tests/fixtures/golden/claude-commands/6_gofer_validate.md`

  Use the same parsed-body shape that `byte-equivalence.test.ts` compares
  against, so the golden fixtures reflect the updated command bodies without
  frontmatter drift.

#### Verification Criteria (Phase 5)

```bash
npm test
# All new/updated suites pass:
# control-commands-surfaces, description-budget, canonical-descriptions,
# canonical-set-cumulative-budget, byte-equivalence, stage-manifest,
# generator-regression, alias-uniqueness, e2e-pipeline-smoke,
# claude-plugin-manifest-valid, agents-md-shape,
# e2e-codex-clean-environment, gemini-extension-manifest-valid,
# e2e-gemini-extension, codex-config-toml-shape,
# helper-commands-cross-cli-parity, validation-evidence-gates.
```

---

### Phase 6 — Integration Smoke Run and Final Verification

Full end-to-end verification that the feature delivers everything in the spec.

#### Tasks

- [ ] **T6.1** Run the full test suite:
  ```bash
  npm test
  ```
  All tests must pass. Capture real pass/fail counts (required by the
  validation truthfulness standard this feature introduces).

- [ ] **T6.2** Run the generator and Codex doctor as a final smoke check:
  ```bash
  npm run gofer:generate -- --dry-run
  npm run gofer:generate && npm run gofer:codex-doctor
  ```
  Expect a clean generator run. Expect `gofer:codex-doctor` to exit 0 when the
  local Codex skill root is available; otherwise record that the doctor could
  not scan the installed skill root and rely on the Phase 2/5 source-tree
  budget checks as authoritative. Log:
  - the dry-run surface list
  - the dry-run stage list containing all five helpers
  - the final Codex byte total from `gofer:codex-doctor`.

- [ ] **T6.3** Create
  `.specify/specs/031-skills-pipeline-augmentation/audit-history.md` with the
  initial truthfulness rollout entries:
  - `VAL-TRUTH-001` — missing executed test output forces Categories 1 and 2 to 0
  - `VAL-TRUTH-002` — missing runtime integration proof forces Category 5 to 0
  - `VAL-TRUTH-003` — `DEPLOY_IN_SCOPE = true` with no render/deploy proof
    forces Category 3 to 0
  - `VAL-TRUTH-004` — Codex description budget regression (> 2048 bytes) blocks
    release

  Each entry must include owner, expiry/review cadence, linked task/test, and
  the remediation expectation for the next validation run.

- [ ] **T6.4** Execute and record three smoke checks in `audit-history.md`:
  1. an actual missing-evidence `/6_gofer_validate` run that proves Category 5 = 0
     and Categories 1/2 = 0 with FAIL when runtime integration proof and
     executed test output are absent
  2. a deploy-in-scope run (signals present, render/deployment artifact absent)
     that proves Category 3 = 0 with FAIL
  3. a complete-evidence run that proves `/6_gofer_validate` can only return
     PASS once `validation-report.md` contains a populated evidence table with
     real proof for every scored category (or an explicit not-in-scope record
     for Category 3), Category 11 cites `blast-radius-report.md`, both
     `validation-report.md` and `blast-radius-report.md` are persisted, and the
     validation report includes `/6` provenance fields. Confirm
     `blast-radius-report.md` includes `changed surfaces`, `risk vectors`,
     `containment summary`, and the same provenance fields

  Because `/6_gofer_validate` is a command-definition artifact, these are
  operator/manual smoke checks backed by saved excerpts, but each smoke item
  still requires an actual `/6_gofer_validate` invocation against a prepared
  feature context.
  For smoke check #2, use a synthetic scratch feature or another feature
  directory whose `spec.md` contains deploy-scope signals, since feature 031
  itself is workflow-only and defaults to `DEPLOY_IN_SCOPE = false`.

- [ ] **T6.5** Verify all acceptance tests from `contract-pack.md § 9` are
  covered:

  | AT ID | Coverage | Test File |
  | --- | --- | --- |
  | AT-001 | Contractual gate presence for GATE-1 and live smoke excerpt | `validation-evidence-gates.test.ts` + T6.4 |
  | AT-002 | Contractual gate presence for GATE-2 and live smoke excerpt | `validation-evidence-gates.test.ts` + T6.4 |
  | AT-003 | Evidence table section presence on PASS and FAIL runs | `validation-evidence-gates.test.ts` + T6.4 |
  | AT-004 | Evidence table on FAIL runs | `validation-evidence-gates.test.ts` + T6.4 |
  | AT-005 | Generator emits all 4 surfaces per helper | `helper-commands-cross-cli-parity.test.ts` + T6.2 smoke |
  | AT-006 | Exact artifact path in command body | `helper-commands-cross-cli-parity.test.ts` |
  | AT-007 | Stage sequence unchanged | `e2e-pipeline-smoke.test.ts` + `numbered-vs-namespaced-parity.test.ts` + T6.1 + T6.7 |
  | AT-008 | No verbatim Matt Pocock text | `helper-commands-cross-cli-parity.test.ts` + T6.7 manual review |

  US-4 AC-1 parity is additionally covered by the seam-to-standalone artifact
  assertions in `helper-commands-cross-cli-parity.test.ts` plus the manual
  stage-local seam spot-check in T6.7.

- [ ] **T6.6** Verify protected files are untouched:
  ```bash
  git diff --name-only | grep -E \
    "PipelineStateManager\.ts|pipeline-state\.sh|CommandGenerator\.ts|CrossPlatformCommandRouter\.ts|cross-platform-parity\.test\.ts"
  # Must return empty output
  ```

- [ ] **T6.7** Manual spot-check helper bodies and artifact behavior:
  1. Review all five helper definitions to confirm the body text is Gofer-owned
     and not a verbatim copy of upstream Matt Pocock skill content.
  2. Invoke `gofer:vocabulary` standalone and confirm
     `.specify/specs/{feature}/glossary.md` is written with the expected term,
     definition, and source-artifact structure.
  3. Invoke `gofer:zoom-out` standalone and confirm
     `.specify/specs/{feature}/zoom-out-report.md` is written with the expected
     `current boundary`, `upstream/downstream`, and `cross-cutting impact`
     sections.
  4. Invoke `gofer:spec-summary` standalone and confirm
     `.specify/specs/{feature}/spec-summary.md` is written with the expected
     `what`, `why`, `acceptance criteria`, and `out of scope` sections.
  5. Invoke `gofer:tdd` standalone and confirm
     `.specify/specs/{feature}/tdd-session.md` is written with the expected
     `acceptance criteria linkage`, `red`, `green`, and `refactor` sections.
  6. Invoke `gofer:diagnose` standalone with failing-output context and confirm
     `.specify/specs/{feature}/diagnose-report.md` is written with the expected
     `reproduce`, `minimize`, `instrument`, and `fix` sections.
  7. Invoke `/1_gofer_research` with the `vocabulary` and `zoom-out` selectors
      on a scratch feature that already has `research.md`. Confirm the inline
      `glossary.md` and `zoom-out-report.md` outputs match the standalone helper
      contracts.
  8. Invoke `/2_gofer_specify` with the `vocabulary` and `spec-summary`
      selectors on a scratch feature that already has `spec.md`. Confirm the
      inline `glossary.md` and `spec-summary.md` outputs match the standalone
      helper contracts.
  9. Follow the approved `gofer:tdd` seam from `/5_gofer_implement` and confirm
      the resulting artifact shape matches the standalone helper contract for
      `tdd-session.md`.
  10. Invoke `/5_gofer_implement` with the `diagnose` selector, `spec.md`, and
      failing-output context. Confirm the inline `diagnose-report.md` output
      matches the standalone helper contract.
  11. Run a scratch feature through the numbered pipeline from
      `/0_business_scenario` to `/6_gofer_validate` once with no selector and
      once with the `tdd-assist` seam enabled. Confirm stage IDs, routing, and
      persisted pipeline state match the pre-feature baseline and that the only
      additive behavior is helper artifact production.

#### Verification Criteria (Phase 6)

```bash
npm test
# Real output: "X passed, 0 failed" (X ≥ pre-feature count + new tests)
npm run gofer:generate -- --dry-run
# Dry-run lists selected surfaces and all five helper names.
npm run gofer:generate && npm run gofer:codex-doctor
# Zero errors. Budget ≤ 2048 bytes.
git diff --name-only | grep -E "PipelineStateManager|pipeline-state\.sh|CommandGenerator|CrossPlatformCommandRouter|cross-platform-parity\.test"
# Empty output
# audit-history.md contains VAL-TRUTH-001 through VAL-TRUTH-004 plus three
# smoke-check excerpts (two FAIL paths and one PASS path).
```

---

## File Structure

### New Files

```text
.specify/commands/
├── gofer_vocabulary.md       # NEW — gofer:vocabulary helper command definition
├── gofer_diagnose.md         # NEW — gofer:diagnose helper command definition
├── gofer_tdd.md              # NEW — gofer:tdd helper command definition
├── gofer_spec_summary.md     # NEW — gofer:spec-summary helper command definition
└── gofer_zoom_out.md         # NEW — gofer:zoom-out helper command definition

.specify/specs/031-skills-pipeline-augmentation/
└── audit-history.md          # NEW — rollout monitoring seed for /6 truthfulness

tests/unit/scripts/
├── extension-package-wiring.test.ts               # NEW — release/resource mirror wiring contract
├── helper-commands-cross-cli-parity.test.ts   # NEW — AT-005, AT-006, AT-008
├── sync-extension-resources.test.ts            # NEW — non-ENOENT access errors rethrow from sync helper
├── validation-evidence-gates.test.ts          # NEW — AT-001, AT-002, AT-003, AT-004
└── validation-report-compat.test.ts           # NEW — legacy report compatibility regression
```

### Modified Files

```text
.specify/commands/
└── 6_gofer_validate.md         # MODIFIED — evidence gates, FR-011 detection,
                                 #             honest-scoring rule, evidence table

.specify/commands/1_gofer_research.md   # MODIFIED — selector-driven gofer:vocabulary + gofer:zoom-out seams
.specify/commands/2_gofer_specify.md    # MODIFIED — selector-driven gofer:vocabulary + gofer:spec-summary seams
.specify/commands/5_gofer_implement.md  # MODIFIED — selector-driven gofer:tdd + gofer:diagnose seams

.specify/scripts/node/canonical-descriptions.mjs  # MODIFIED — 5 new entries added (16 → 21)
.specify/scripts/node/codex-doctor.mjs           # MODIFIED — canonical skill inventory updated for helpers
.specify/scripts/node/sync-extension-resources.mjs  # MODIFIED — resource sync now rethrows non-ENOENT access errors

release-auto.sh                 # MODIFIED — release packaging uses the Node sync path and preserves ordering contracts
extension/src/services/migration/ResourceSyncer.ts  # MODIFIED — managed workspace writes remain symlink-safe during resource sync

AGENTS.md                      # MODIFIED — repo-root command manifest gains 5 helper entries
.claude-plugin/plugin.json     # MODIFIED — repo-root Claude manifest gains 5 helper entries
codex-config.toml              # MODIFIED — repo-root Codex manifest gains 5 helper entries

tests/unit/autonomous/WorkspaceContextProvider.test.ts  # MODIFIED — legacy validation-report consumer coverage
tests/unit/cli/picker-fuzzy.test.ts                     # MODIFIED — helper-aware picker universe
tests/unit/codex/codex-doctor.test.ts                  # MODIFIED — helper-inclusive doctor fixture coverage
tests/unit/codex/e2e-codex-doctor-smoke.test.ts        # MODIFIED — helper-inclusive doctor smoke fixture
tests/unit/codex/e2e-codex-clean-environment.test.ts   # MODIFIED — helper-aware description count
tests/unit/codex/codex-only-emit.test.ts               # MODIFIED — helper-inclusive emitted command set
tests/unit/scripts/byte-equivalence.test.ts            # MODIFIED — updated golden-body expectations
tests/unit/scripts/stage-manifest.test.ts              # MODIFIED — stage body/metadata expectations
tests/unit/scripts/control-commands-surfaces.test.ts  # MODIFIED — 5 new entries in CONTROL_COMMANDS
tests/unit/scripts/description-budget.test.ts         # MODIFIED — expected set/count 16 → 21
tests/unit/scripts/canonical-descriptions.test.ts     # MODIFIED — count/import/expected set 16 → 21
tests/unit/scripts/hook-wiring.test.ts                # MODIFIED — generated hook/resource wiring follows canonical sync path
tests/unit/codex/canonical-set-cumulative-budget.test.ts  # MODIFIED — count 16 → 21
tests/unit/scripts/generator-regression.test.ts        # MODIFIED — helper-inclusive command totals
tests/unit/scripts/alias-uniqueness.test.ts            # MODIFIED — helper-inclusive alias set
tests/unit/scripts/e2e-pipeline-smoke.test.ts          # MODIFIED — helper-aware pipeline inventory
tests/unit/scripts/numbered-vs-namespaced-parity.test.ts  # MODIFIED — helper parity counts
tests/unit/scripts/surface-exclusion.test.ts           # MODIFIED — helper surface matrix
tests/unit/scripts/vsix-packaging.test.ts              # MODIFIED — VSIX includes updated command/resource payloads
tests/unit/scripts/claude-plugin-manifest-valid.test.ts  # MODIFIED — helper-inclusive manifest validation
tests/unit/scripts/agents-md-shape.test.ts             # MODIFIED — helper-inclusive AGENTS manifest validation
tests/unit/scripts/gemini-extension-manifest-valid.test.ts  # MODIFIED — Gemini manifest totals
tests/unit/scripts/e2e-gemini-extension.test.ts        # MODIFIED — Gemini extension generation totals
tests/unit/codex/codex-config-toml-shape.test.ts       # MODIFIED — helper-inclusive Codex config shape
tests/unit/release/release-verification.test.ts        # MODIFIED — release order must use Node resource sync
tests/unit/extension/ResourceSyncer.workspace-sync.test.ts  # MODIFIED — workspace sync rejects symlinked managed writes
tests/integration/command-generation.test.ts           # MODIFIED — generated command surfaces remain integration-real
tests/fixtures/golden/claude-commands/1_gofer_research.md  # MODIFIED — seam-aware golden body
tests/fixtures/golden/claude-commands/2_gofer_specify.md   # MODIFIED — seam-aware golden body
tests/fixtures/golden/claude-commands/5_gofer_implement.md # MODIFIED — seam-aware golden body
tests/fixtures/golden/claude-commands/6_gofer_validate.md  # MODIFIED — truthful validation golden body
```

### Generated Files (Do Not Hand-Edit)

The following are written by `npm run gofer:generate`. Do not modify directly:

```text
.claude/commands/gofer:vocabulary.md
.claude/commands/gofer:diagnose.md
.claude/commands/gofer:tdd.md
.claude/commands/gofer:spec-summary.md
.claude/commands/gofer:zoom-out.md
extension/resources/claude-commands/gofer:vocabulary.md   (and 4 others)
.github/prompts/gofer:vocabulary.prompt.md  (and 4 others)
extension/resources/copilot-prompts/gofer:vocabulary.prompt.md  (and 4 others)
.agents/skills/gofer/gofer:vocabulary/SKILL.md  (and 4 others)
.system/skills/gofer/gofer:vocabulary/SKILL.md  (and 4 others)
.gemini/commands/gofer/gofer:vocabulary.md  (and 4 others)
.gemini/commands/gofer/gofer:vocabulary.toml  (and 4 others)
.gemini/commands/gofer/manifest.json
.gemini/extension.json
.agents/AGENTS.md
.specify/outputs/codex-config-fragment.toml
```

### Protected Files (No Changes)

| File | Protection Reason |
| --- | --- |
| `extension/src/autonomous/PipelineStateManager.ts` | Hardcodes `VALID_STAGES` array; helpers are not stages |
| `extension/resources/bash-scripts/pipeline-state.sh` | Hardcodes `VALID_STAGES` bash array; same reason |
| `extension/src/council/CommandGenerator.ts` | High-risk runtime surface emitter; targeted fixes are allowed, but numbered-stage sequencing must remain unchanged |
| `extension/src/council/CrossPlatformCommandRouter.ts` | High-risk runtime routing layer; targeted fixes are allowed to preserve nested Codex + Gemini helper parity |
| `tests/integration/cross-platform-parity.test.ts` | High-signal regression suite; update only when needed to reflect real emitted helper/runtime paths |
| Any `.specify/commands/0_*.md` through `10_*.md` (except seam additions) | Pipeline stage sequence frozen |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| **Codex skill budget exceeded** — 5 new entries push cumulative bytes > 2048 | Medium | High — Codex surface silently breaks | T2.1 calculates bytes before commit; T5.2–T5.4 assert ≤ 2048; `gofer:codex-doctor` gates T6.2 |
| **Generator schema rejects new frontmatter** — parse-stage-command.mjs fails on helper files | Low | High — generator fails entirely, no surfaces emitted | Established precedent (`gofer_side.md`). T1.1–T1.5 verify parse; T2.2 dry-run before live run |
| **030-vscode-surface-truth-cleanup schema changes break 031** — Feature 030 modifies the command schema | Medium | High — helper files fail parsing | Monitor 030 branch. If 030 lands first, align helper frontmatter to new schema before Phase 1 |
| **Stage-local seams alter numbered stage behavior** — seam blocks accidentally modify step flow | Low | Medium — breaks existing pipeline users | T4.4 verifies stage file integrity; seams are fenced optional blocks only |
| **FR-011 detection produces false positives** — workflow-only features wrongly flagged as deploy-in-scope | Low | Medium — validate run blocks unnecessarily | Keyword set is conservative; `DEPLOY_IN_SCOPE = false` is the default path and `HAS_UI = false` still redistributes cleanly |
| **Evidence gates break valid PASS runs** — legitimate implementations blocked by overly strict gates | Low | High — developer trust erosion | Gates only require evidence present in the current session context; T6.4 records the first negative smoke results |
| **Matt Pocock verbatim content introduced** — AT-008 fails | Low | Low-Medium — IP/quality concern | T5.5 scans for forbidden strings; Phase 1 authors are briefed on FR-017 |
| **Legacy flat vs nested Codex skill paths** — helper parity tests accidentally assert `.system/skills/<name>/SKILL.md` instead of emitted `.system/skills/gofer/<name>/SKILL.md` | Medium | Medium — CI fails for the wrong reason | T5.5 asserts actual generator paths; `cross-platform-parity.test.ts` remains untouched in this feature |

---

## Spec Traceability

### User Story Coverage

| User Story | Priority | Covered By | Phases |
| --- | --- | --- | --- |
| US-1 — Truthful Validation Gate | P1 | FR-009–FR-012 + T3.1–T3.5 + T5.6 + T6.4 | 3, 5, 6 |
| US-2 — Cross-CLI Helper Commands | P1 | FR-001–FR-008 + T1.1–T1.5 + T2.1–T2.4 + T5.1–T5.5 + T6.2/T6.7 | 1, 2, 5, 6 |
| US-3 — Evidence Table in Validation Report | P2 | FR-013–FR-014 + T3.4 + T5.6 + T6.4 | 3, 5, 6 |
| US-4 — Stage-Local Augmentation | P3 | FR-007–FR-008 + T4.1–T4.4 + T5.5 | 4, 5, 6 |

**Coverage: 4/4 user stories** (100%).

### Functional Requirement Coverage

| FR | Requirement Summary | Covered By | Phase |
| --- | --- | --- | --- |
| FR-001 | `gofer:vocabulary` helper → `glossary.md` | T1.1, T4.1–T4.2, T5.5 AT-006, T6.7 | 1, 4, 5, 6 |
| FR-002 | `gofer:diagnose` helper → `diagnose-report.md` | T1.2, T4.3, T5.5 | 1, 4, 5 |
| FR-003 | `gofer:tdd` helper (within /5 and /9) | T1.3, T4.3, T5.5 | 1, 4, 5 |
| FR-004 | `gofer:spec-summary` helper → `spec-summary.md` | T1.4, T4.2, T5.5 | 1, 4, 5 |
| FR-005 | `gofer:zoom-out` helper → `zoom-out-report.md` | T1.5, T4.1, T5.5 | 1, 4, 5 |
| FR-006 | All 5 helpers emit to Claude/Copilot/Codex/Gemini via generator | T2.1–T2.4, T5.1–T5.5, T6.2 | 2, 5, 6 |
| FR-007 | Helpers must not modify pipeline stage sequence | T4.1–T4.4, T5.5 AT-007, T6.6 | 4, 5, 6 |
| FR-008 | Helpers named in `gofer:*` namespace, not numbered | T1.1–T1.5, T5.5 | 1, 5 |
| FR-009 | `/6` requires runtime integration proof for Category 5 | T3.2 (GATE-1), T5.6, T6.4 | 3, 5, 6 |
| FR-010 | `/6` requires real test execution output for Categories 1 and 2 | T3.2 (GATE-2), T5.6, T6.4 | 3, 5, 6 |
| FR-011 | Deterministic deployment/render scope detection and enforcement | T3.1, T3.2 (GATE-3), T5.6, T6.4 | 3, 5, 6 |
| FR-012 | Zero score for absent/unverifiable evidence | T3.2, T3.3, T5.6, T6.4 | 3, 5, 6 |
| FR-013 | Evidence table in `validation-report.md` | T3.4, T5.6 | 3, 5 |
| FR-014 | Evidence table present on both PASS and FAIL | T3.4, T5.6, T6.4 | 3, 5, 6 |
| FR-015 | No new `/6A.x` stages created | T3.5, T5.6, T6.6 | 3, 5, 6 |
| FR-016 | `.specify/commands/` remains sole source of truth | T2.1–T2.4, T5.5, T6.6 | 2, 5, 6 |
| FR-017 | No verbatim Matt Pocock skill mirroring | T1.1–T1.5, T5.5 AT-008 | 1, 5 |

**Coverage: 17/17 FRs** (100%).

### Non-Functional Requirement Coverage

| NFR | Summary | Covered By |
| --- | --- | --- |
| NFR-001 Cross-CLI Parity | Identical behavior across all 4 surfaces | T2.1–T2.4, T5.1–T5.5, T6.2 |
| NFR-002 Generator Stability | Existing 15+ commands unaffected | T2.2 dry-run; T5.2–T5.4 canonical-description tests; full `npm test` in T6.1 |
| NFR-003 No Pipeline Regression | Stages 0–10 unchanged; state files untouched | T4.4, T5.5 AT-007, T6.6 |
| NFR-004 Validation Backward Compatibility | Evidence table is additive | T3.4 (additive append); T3.5 diff check |
| NFR-005 Evidence Provenance | Session-visible artifacts only | T3.2 (gate language), T5.6, T6.4 |
| NFR-006 Artifact Path Consistency | All outputs to `.specify/specs/{feature}/` | T1.1–T1.5, T5.5 AT-006, T6.7 |

### Success Criteria Coverage

| SC | Criterion | Covered By |
| --- | --- | --- |
| SC-001 | 5 helper files present in `.specify/commands/` | T1.1–T1.5, T5.5 |
| SC-002 | 4/4 surfaces emitted per helper | T2.1–T2.4, T5.5, T6.2 |
| SC-003 | `/6` rejects Category 5 without integration proof | T3.2 GATE-1, T5.6, T6.4 |
| SC-004 | `/6` rejects Categories 1/2 without test output | T3.2 GATE-2, T5.6, T6.4 |
| SC-005 | Evidence table in every validation report | T3.4, T5.6, T6.4 |
| SC-006 | Stage sequence unchanged | T4.4, T5.5 AT-007, T6.6 |
| SC-007 | No mirrored Matt Pocock skills | T5.5 AT-008 |
| SC-008 | `gofer:vocabulary` produces `glossary.md` in spec dir | T1.1, T5.5 AT-006, T6.7 |
| SC-009 | 0 false PASses in first 10 runs | T6.3 audit-history seed + T6.4 smoke logs + rollout monitoring |

---

## EnterpriseAI Metadata / Handoff

> **Adapted for non-application workflow/platform feature.** There is no
> application runtime, tenant model, deployment topology, or end-user UI.
> The EnterpriseAI handoff focuses on platform behavioral guarantees and
> maintainer workflow boundaries.

### Profile Metadata

- **EAI CLI Version Pin**: `N/A` — `eai-cli` is not installed in the current
  workspace and this feature has no EAI runtime or deployment tasks.
- **Vertical Template Reference**: `N/A` — workflow/platform feature, not an
  app vertical delivery.
- **Deployment Repo Reference**: `N/A` — no deployment target is changed.
- **Primary Handoff Inputs**:
  - `.specify/specs/031-skills-pipeline-augmentation/contract-pack.md`
  - `.specify/specs/031-skills-pipeline-augmentation/context-bundle.md`
  - `.specify/specs/031-skills-pipeline-augmentation/reuse-scan.md`
  - `.specify/specs/031-skills-pipeline-augmentation/audit-history.md`
- **AI-Augmented App Journey**: Not applicable. This feature changes command
  surfaces and validation instructions only.

### Feature Classification

| Field | Value |
| --- | --- |
| Feature type | Workflow platform augmentation |
| Application classification | Non-application |
| AI journey required | No |
| Deployment target | None (workflow/platform only) |
| DEPLOY_IN_SCOPE for this feature's own /6 run | `false` (`HAS_UI = false`, so Category 3 remains N/A) |

### Maintainer Handoff Checklist

- [ ] Five helper command files authored and reviewed for Gofer-owned behavior
      (no verbatim Matt Pocock content).
- [ ] `canonical-descriptions.mjs` updated; `gofer:codex-doctor` passes.
- [ ] Generator run succeeds with zero errors; all four surfaces emitted.
- [ ] `6_gofer_validate.md` change reviewed: three evidence gates present,
      FR-011 detection block present, evidence table section present.
- [ ] Stage-local seams in `/1`, `/2`, `/5` are additive only; no behavior change.
- [ ] `audit-history.md` created with `VAL-TRUTH-001` through `VAL-TRUTH-004`
      and the first smoke-check excerpts.
- [ ] All acceptance tests (AT-001 through AT-008) pass in `npm test`.
- [ ] Protected sequencing files untouched (`PipelineStateManager.ts`,
      `pipeline-state.sh`); any `CommandGenerator.ts`,
      `CrossPlatformCommandRouter.ts`, or cross-platform parity changes are
      narrowly scoped to truthful cross-CLI behavior.
- [ ] Release follow-up only: `CHANGELOG.md` updated via the normal release flow
      if this feature ships in a versioned release.

### Integration Map

```text
.specify/commands/ (source of truth)
        │
        ├── gofer_vocabulary.md    ─┐
        ├── gofer_diagnose.md       │
        ├── gofer_tdd.md            ├─► npm run gofer:generate
        ├── gofer_spec_summary.md   │
        ├── gofer_zoom_out.md      ─┘
        │
        ├── 6_gofer_validate.md (hardened — evidence gates, FR-011, evidence table)
        │
        ▼
generate-commands.mjs + canonical-descriptions.mjs
        │
        ├─► .claude/commands/ + extension/resources/claude-commands/
        ├─► .github/prompts/ + extension/resources/copilot-prompts/
        ├─► .agents/skills/gofer/ + .system/skills/gofer/   (skill surfaces)
        └─► .gemini/commands/gofer/                         (Gemini surface)

AI assistant (any surface) invokes gofer:vocabulary
        │
        ▼
Reads .specify/commands/gofer_vocabulary.md
        │
        ▼
Writes .specify/specs/{feature}/glossary.md
(no pipeline state change)
```

### Stage-Local Optional Helper Map

| Numbered stage | Optional helper seams | Output contract |
| --- | --- | --- |
| `/1_gofer_research` | `gofer:vocabulary`, `gofer:zoom-out` | `glossary.md`, `zoom-out-report.md` |
| `/2_gofer_specify` | `gofer:vocabulary`, `gofer:spec-summary` | `glossary.md`, `spec-summary.md` |
| `/5_gofer_implement` | `gofer:tdd`, `gofer:diagnose` | `tdd-session.md`, `diagnose-report.md` |

---

## Audit-History Seed / Rollout Notes for /6 Truthfulness Changes

### Seed Entries for `audit-history.md`

| Finding ID | Scenario | Owner | Review cadence | Exit / expiry condition |
| --- | --- | --- | --- | --- |
| `VAL-TRUTH-001` | Missing executed test output forces Categories 1/2 = 0 | Gofer maintainers | Review every `/6` run until 10 clean runs | Close after 10 consecutive clean runs with evidence table populated |
| `VAL-TRUTH-002` | Missing runtime integration proof forces Category 5 = 0 | Gofer maintainers | Review every `/6` run until 10 clean runs | Close after 10 consecutive clean runs with verified integration evidence |
| `VAL-TRUTH-003` | `DEPLOY_IN_SCOPE = true` without render/deploy proof forces Category 3 = 0 | Gofer maintainers | Review any deploy-scoped feature immediately | Close after first 3 deploy-scoped clean runs |
| `VAL-TRUTH-004` | Codex description budget regression (> 2048 bytes) blocks helper emission | Gofer maintainers | Review on every generator change | Close when budget remains green across 3 consecutive helper additions |

### Why This Change Is Backward-Compatible

The evidence gates introduced in Track B are structured as **gates that fail
when evidence is absent in the current session**, not as gates that fail on
historical reports. Specifically:

- **Existing valid implementations** that were tested with real `npm test` runs
  and had real integration verification already present in session context will
  continue to PASS — the gates simply formalize what was previously implicit.
- **Historical `validation-report.md` files** written before this feature are
  not re-evaluated. The evidence table is an additive section; existing parsers
  that read other sections of the report are unaffected (NFR-004).
- The honest-scoring rule (FR-012) documents existing behavior more strictly:
  the rubric already scored 0 for Red findings; the rule makes absence of
  evidence an explicit Red trigger.

### Rollout Sequence

1. **Phase 3 merges first** (`6_gofer_validate.md` hardening). From this point,
   all new `/6` runs produce evidence tables and apply evidence gates.
2. **Phase 1 + 2 merge together** (helpers + generator wiring). The five helpers
   become available on all four surfaces simultaneously.
3. **Phase 4** (stage-local seams) merges after helper parity is green; seams are
   additive and have no behavioral dependency on phases 1–3.
4. **Phase 6** seeds `audit-history.md` and records the first negative smoke
   excerpts before rollout is called complete.
5. Tests (Phase 5) must pass before any phase merges.

`tasks.md` implementation order must follow the same rollout intent: complete
the `/6` hardening phases before helper-command rollout, even though the helper
phase is numbered earlier in the dependency graph.
Phase 2 foundational registry/budget work (`T2.1` / `T003`) is required
pre-hardening groundwork. It may land before the `/6` command-body changes
because it is non-user-facing shared metadata/budget prep, but it does not
count as helper rollout and does not relax the `/6`-first rollout rule for
behavioral changes.

### First-Run Behavior After Hardening

On the first `/6` run after this feature lands:

- If `HAS_UI = false`: Category 3 redistributes normally and no Category 3 gate
  blocks the run.
- If `HAS_UI = true` and `DEPLOY_IN_SCOPE = false`: deployment artifacts stay out
  of scope, but local render proof is still required before Category 3 can pass.
- If the runner provides real `npm test` output and real integration wiring
  proof in session context: all gates pass; evidence table is populated and
  shows evidence for each category.
- If a gate fires (evidence absent): the report shows exactly which category
  scored 0 and the reason, enabling targeted remediation before re-running.

### Monitoring

Track SC-009 (0 false PASses in first 10 validation runs) by reviewing the
evidence table in each `validation-report.md` and the seed findings in
`audit-history.md`. A false PASS would be visible as a Category 5 PASS with an
empty or inference-only "Evidence Artifact" cell — the honest-scoring rule
prevents this structurally, but spot-checks confirm the guarantee holds.
