# Quickstart: 031-skills-pipeline-augmentation

> This feature adds five `gofer:*` helper commands and hardens
> `/6_gofer_validate` so PASS only happens with real, traceable proof. Test the
> helper surfaces first, then the per-helper artifacts, then the `/6` fail/pass
> gates.

## 1. Prerequisites

- Node.js 20.x
- npm
- git
- Local checkout of `eai-tools/gofer` with permission to run repo scripts
- VS Code 1.85+ (recommended for extension/resource smoke checks)
- Shell tools on `PATH`: `rg`, `grep`, and `curl`

## 2. Setup Steps

```bash
# From the repository root
npm install
(cd extension && npm install)
(cd language-server && npm install)

# Refresh generated surfaces after changing canonical command docs
npm run gofer:generate
npm run generate-commands -- --verbose
node .specify/scripts/node/sync-extension-resources.mjs

# Optional build sanity check before manual validation
npm run build:all
```

1. Work from a throwaway branch so you can stage both FAIL and PASS cases for
   `/6_gofer_validate`.
2. Keep these files open while testing:
   - `.specify/commands/6_gofer_validate.md`
   - `.specify/scripts/node/generate-commands.mjs`
   - `extension/src/council/CommandGenerator.ts`
   - `extension/src/council/CrossPlatformCommandRouter.ts`
3. Prepare three local states for fast validation reruns:
   - a happy path where all five helper commands emit correctly
   - a fail case where test collection/execution does not complete cleanly
   - a fail case where a helper command is orphaned, unreachable, or not emitted
     to every surface

## 3. Manual Testing Scenarios

### Scenario 1: Cross-CLI helper emission without stage drift (US-2, FR-006–008, FR-016–017, SC-001/002/006/007)

**Objective**: Confirm the five helper commands are canonical
`.specify/commands/` definitions, emit to all supported surfaces, and do not
alter the numbered 0–10 pipeline.

**Steps**:

1. Verify the new canonical helper files exist:
   - `.specify/commands/gofer_vocabulary.md`
   - `.specify/commands/gofer_diagnose.md`
   - `.specify/commands/gofer_tdd.md`
   - `.specify/commands/gofer_spec_summary.md`
   - `.specify/commands/gofer_zoom_out.md`
2. Run `npm run gofer:generate`, `npm run generate-commands -- --verbose`, and
   `node .specify/scripts/node/sync-extension-resources.mjs`.
3. Inspect `.claude/commands/`, `extension/resources/claude-commands/`,
   `.github/prompts/`, `extension/resources/copilot-prompts/`,
   `.agents/skills/gofer/`, `.system/skills/gofer/`, and
   `.gemini/commands/gofer/` to confirm each helper appears on every surface.
4. Confirm no new numbered stage or `/6A.x` sub-stage was introduced and that
   stage-order files such as `PipelineStateManager.ts` and `pipeline-state.sh`
   remain unchanged.

**Expected result**: All five helpers emit to all four CLI surfaces, and the
numbered pipeline remains 0 through 10 with no routing drift.

### Scenario 2: `gofer:vocabulary` writes `glossary.md` to the feature directory (US-2, FR-001, SC-008)

**Objective**: Confirm vocabulary extraction produces the required Gofer-owned
artifact at the canonical path.

**Steps**:

1. Invoke `gofer:vocabulary` for feature `031-skills-pipeline-augmentation` on
   at least one primary surface and one mirrored surface.
2. Open `.specify/specs/031-skills-pipeline-augmentation/glossary.md`.
3. Spot-check that terms come from the feature artifacts, especially concepts
   such as helper command, evidence gate, cross-CLI parity, and integration
   reality.
4. Verify the helper did not write to a provider-specific or ad hoc location.

**Expected result**: `glossary.md` is created under the feature directory and
contains normalized, feature-specific terminology.

### Scenario 3: `gofer:diagnose` produces a structured investigation artifact (US-2, FR-002)

**Objective**: Confirm the diagnose helper follows the intended reproduce →
minimize → instrument → fix loop and points to real Gofer files.

**Steps**:

1. Start from a deliberate defect, such as a helper command that exists
   canonically but is not emitted or routed everywhere.
2. Invoke `gofer:diagnose` against the defect.
3. Review the generated feature artifact (for example `diagnose-report.md` if
   that is the chosen canonical name).
4. Confirm the output names concrete files and seams such as
   `.specify/commands/`, `generate-commands.mjs`, or
   `CrossPlatformCommandRouter.ts` instead of generic advice.

**Expected result**: The helper produces a Gofer-owned diagnosis artifact in the
feature directory with a concrete reproduce/minimize/instrument/fix loop.

### Scenario 4: `gofer:tdd` stays tied to spec acceptance criteria (US-2, FR-003)

**Objective**: Confirm the TDD helper drives a red → green → refactor loop for
this feature instead of inventing a separate workflow.

**Steps**:

1. Pick one acceptance target, such as:
   - `gofer:vocabulary` produces `glossary.md`, or
   - `/6_gofer_validate` scores Category 5 as 0 when integration proof is
     missing.
2. Invoke `gofer:tdd`.
3. Verify the output walks through failing test intent first, then
   implementation guidance, then cleanup/refactor notes.
4. Confirm the helper references the feature acceptance criteria and stays
   additive to `/5_gofer_implement` and `/9_gofer_tests`.

**Expected result**: The TDD helper produces criterion-linked red/green/refactor
guidance without replacing the numbered pipeline stages.

### Scenario 5: `gofer:spec-summary` produces a business-friendly artifact (US-2, FR-004)

**Objective**: Confirm the summary helper explains value and scope without
leaking implementation detail.

**Steps**:

1. Invoke `gofer:spec-summary` for feature 031.
2. Open the summary artifact in
   `.specify/specs/031-skills-pipeline-augmentation/` (for example
   `spec-summary.md`).
3. Verify it clearly explains:
   - the five new helper commands,
   - why `/6_gofer_validate` truthfulness is being tightened, and
   - what success looks like for maintainers and workflow designers.
4. Confirm the output stays business-facing rather than turning into a plan or
   code diff.

**Expected result**: A concise business summary artifact is written inside the
feature directory and accurately describes the feature without
implementation-heavy detail.

### Scenario 6: `gofer:zoom-out` maps the broader command architecture (US-2, FR-005)

**Objective**: Confirm the zoom-out helper explains how feature 031 fits into
the larger Gofer command system.

**Steps**:

1. Invoke `gofer:zoom-out`.
2. Review the generated system-context artifact in the feature directory.
3. Confirm it shows the expected chain from `.specify/commands/` to
   `generate-commands.mjs` to the four CLI surfaces to per-feature artifacts and
   `validation-report.md`.
4. Verify it calls out the protected boundary that helper commands are additive
   and must not renumber the pipeline.

**Expected result**: The helper produces a broader architectural context
artifact that correctly explains the source-of-truth and emission model.

### Scenario 7: Missing executed test output forces `/6_gofer_validate` to FAIL (US-1, FR-010, FR-012, SC-004)

**Objective**: Confirm `/6` does not award Functional Correctness or Test
Authenticity points when tests do not actually execute.

**Steps**:

1. Use a scratch state where the relevant test suite cannot import, collect, or
   execute cleanly.
2. Run `/6_gofer_validate`.
3. Open `.specify/specs/031-skills-pipeline-augmentation/validation-report.md`.
4. Inspect the automated check table and the rubric rows for Categories 1 and 2.

**Expected result**: The report shows the real executed test command and
failure, Category 1 and/or 2 score 0, and the overall validation result is FAIL
with no implied credit.

### Scenario 8: Missing integration proof forces FAIL, and PASS only returns with evidence (US-1, US-3, FR-009, FR-013–015, SC-003/005)

**Objective**: Confirm `/6` treats orphaned or unreachable helper work as
blocking and writes an honest evidence table on both FAIL and PASS runs.

**Steps**:

1. Use a scratch state where one helper exists in `.specify/commands/` but is
   not emitted everywhere or is otherwise unreachable from the generated
   surfaces.
2. Run `/6_gofer_validate` and inspect `validation-report.md`.
3. Verify Category 5 (Integration Reality) scores 0 and that the evidence table
   names the missing proof rather than implying a pass.
4. Fix the integration gap, regenerate the command surfaces, and rerun
   `/6_gofer_validate`.
5. On the rerun, confirm the evidence table cites real artifacts/commands for
   the successful score and that Category 3 is marked not in scope or
   redistributed for this non-UI feature.

**Expected result**: The first run FAILS with Category 5 = 0 and explicit
missing-proof notes; the second run only PASSes once the emitted surfaces and
evidence table are fully backed by real artifacts.

## 4. Automated Test Commands

Use the existing repo commands only:

```bash
# Canonical command regeneration and mirror refresh
npm run gofer:generate
npm run generate-commands -- --verbose
node .specify/scripts/node/sync-extension-resources.mjs
npm run gofer:codex-doctor

# Focused command-surface/parity checks
npm run test:integration -- tests/integration/command-generation.test.ts
npm run test:integration -- tests/integration/cross-platform-parity.test.ts
# Read-only regression check for legacy flat-path parity; do not modify this file in 031

# Focused unit checks around generation and routing
npx vitest run \
  tests/unit/council/CommandGenerator.test.ts \
  tests/unit/council/CrossPlatformCommandRouter.test.ts \
  tests/unit/scripts/emitter-integration.test.ts

# Workspace build safety
npm run build:all

# Broader regression sweep
npm test
```

## 5. Key Files

| File                                                                   | Why it matters                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.specify/commands/gofer_vocabulary.md`                                | Canonical helper definition for `gofer:vocabulary`                                     |
| `.specify/commands/gofer_diagnose.md`                                  | Canonical helper definition for `gofer:diagnose`                                       |
| `.specify/commands/gofer_tdd.md`                                       | Canonical helper definition for `gofer:tdd`                                            |
| `.specify/commands/gofer_spec_summary.md`                              | Canonical helper definition for `gofer:spec-summary`                                   |
| `.specify/commands/gofer_zoom_out.md`                                  | Canonical helper definition for `gofer:zoom-out`                                       |
| `.specify/commands/6_gofer_validate.md`                                | Source of truth for the runtime evidence gates and the `validation-report.md` contract |
| `.specify/scripts/node/generate-commands.mjs`                          | Emits Claude, Copilot, Codex, and Gemini surfaces from canonical markdown              |
| `.specify/scripts/node/parse-stage-command.mjs`                        | Parses and validates helper command metadata before emission                           |
| `extension/src/council/CommandGenerator.ts`                            | Handles cross-platform content/syntax transformation for generated surfaces            |
| `extension/src/council/CrossPlatformCommandRouter.ts`                  | Resolves the generated helper commands for each platform                               |
| `extension/src/autonomous/PipelineStateManager.ts`                     | Guardrail that the numbered pipeline sequence does not change                          |
| `extension/resources/bash-scripts/pipeline-state.sh`                   | Shell-backed pipeline sequence reference that must stay free of new numbered stages    |
| `tests/integration/command-generation.test.ts`                         | Existing integration check for command generation and mirrored surfaces                |
| `tests/integration/cross-platform-parity.test.ts`                      | Existing parity check that command files exist and route across platforms              |
| `tests/unit/council/CommandGenerator.test.ts`                          | Unit coverage for command naming, syntax conversion, and generated metadata            |
| `.specify/specs/031-skills-pipeline-augmentation/glossary.md`          | Expected per-feature artifact from `gofer:vocabulary`                                  |
| `.specify/specs/031-skills-pipeline-augmentation/validation-report.md` | Required proof artifact for `/6_gofer_validate` FAIL/PASS review                       |

## 6. Common Issues

### Helper shows up on Claude but not on mirrored surfaces

**Problem**: The canonical helper exists, but generated Copilot, Codex, Gemini,
or bundled extension copies were not refreshed.

**Fix**: Treat `.specify/commands/` as the only source of truth, then rerun
`npm run gofer:generate`, `npm run generate-commands -- --verbose`, and
`node .specify/scripts/node/sync-extension-resources.mjs`.

### Helper artifact lands in the wrong directory

**Problem**: A helper writes to an ad hoc or provider-specific location instead
of `.specify/specs/{feature}/`.

**Fix**: Update the helper definition so the artifact path is Gofer-owned and
feature-local, then rerun the helper and recheck the output path.

### Parity tests still expect the pre-031 command set

**Problem**: Command-count assertions or fixture lists still assume the older
set of helper commands.

**Fix**: Update the helper-surface and budget tests that own the command-count
expectations (`control-commands-surfaces.test.ts`,
`description-budget.test.ts`, `canonical-descriptions.test.ts`,
`canonical-set-cumulative-budget.test.ts`, and the dedicated helper parity
suite), then regenerate the mirrored surfaces in the same change. Do **not**
edit `tests/integration/cross-platform-parity.test.ts` for this feature.

### `/6` still awards implied credit without proof

**Problem**: `validation-report.md` summarizes a PASS even though the test
command, integration probe, or artifact-backed evidence is missing.

**Fix**: Force Categories 1, 2, and 5 to score 0 when evidence is absent or
unverifiable, and make the evidence table name the missing proof explicitly.

### Category 3 is treated as required for this feature

**Problem**: `/6` asks for render/deployment proof even though feature 031 is a
command/pipeline feature with no UI or deployed target in scope.

**Fix**: Mark UI/deployment verification as not in scope or redistributed for
this feature; only require render/deploy proof when the spec or quickstart makes
it part of acceptance.
