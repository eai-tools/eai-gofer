---
date: 2026-04-30T23:15:23Z
researcher: Copilot
feature: 'Skills Pipeline Augmentation'
status: complete
competitiveAnalysisEnabled: false
applicationClassification: non-application
---

# Research: Skills Pipeline Augmentation

## Feature Summary

Assess `mattpocock/skills` against Gofer's current pipeline and identify which
skills would add real value as **optional augmentations** without changing
Gofer's numbered stages.

## Structured Discovery Output

### Problem Statement

- **Problem**: Gofer already covers a large amount of the software-delivery
  lifecycle, so adding external skills blindly would create duplication,
  confusion, or pipeline drift.
- **Current State Friction**: There is no single augmentation map showing which
  external skills are already covered by Gofer, which are partially covered, and
  which would be genuinely additive.
- **Desired EnterpriseAI Outcome**: A stable, additive extension strategy that
  preserves the current Gofer pipeline while allowing targeted helper skills to
  improve research, planning, implementation, and validation.

### Target Persona

- **Primary Persona**: Gofer maintainer / workflow designer
- **Skill Level**: Intermediate to advanced
- **Top Needs**: Avoid duplicated capabilities, preserve numbered-stage
  stability, and identify the highest-leverage augmentations first
- **Constraints**: Do not change pipeline numbering; keep
  `.specify/commands/` as the source of truth; preserve generated cross-surface
  mirrors

### Value Proposition

- **Primary Value**: Faster evolution of Gofer through targeted helper skills
  instead of broad pipeline rewrites
- **Measurable Goal**: Produce a stage-by-stage additive/duplicate assessment
  for the 22 skills in `mattpocock/skills`
- **EnterpriseAI-First Rationale**: Gofer already uses optional councils,
  helpers, and sidecar artifacts; the same pattern can add focused capability
  without destabilizing the main delivery workflow

## Context Bundle Summary

- **Application Classification**: Non-application workflow research
- **Relevant Specs**:
  - `.specify/specs/030-vscode-surface-truth-cleanup/`
  - `.specify/specs/031-skills-pipeline-augmentation/`
- **Relevant Code Paths**:
  - `.specify/commands/*.md`
  - `.specify/scripts/node/generate-commands.mjs`
  - `.specify/scripts/node/parse-stage-command.mjs`
  - `extension/src/council/CommandGenerator.ts`
  - `extension/src/autonomous/PipelineStateManager.ts`
  - `extension/resources/bash-scripts/pipeline-state.sh`
- **External Sources Reviewed**:
  - `mattpocock/skills/README.md`
  - `mattpocock/skills/skills/**/SKILL.md`
- **Tenant and Deployment Assumptions**: This work affects repository workflow
  design and generated CLI surfaces only; it does not change application
  runtime, tenant behavior, or deployment topology
- **Validation Criteria**:
  - No renumbering of Gofer pipeline stages
  - No duplication of capabilities already present in Gofer
  - New capabilities should fit as helper/control skills or stage-local optional
    sub-agents
  - Standalone adopted helpers must work across Claude, Copilot, Codex, and
    Gemini
  - Generated surfaces must continue to derive from `.specify/commands/`

## Reuse-Before-Create Scan

| Candidate capability | Existing evidence | Decision | Rationale | Owner |
| --- | --- | --- | --- | --- |
| Pipeline routing and discovery | `0_business_scenario`, `0a_problem_validation` | Reuse | Already strong; do not duplicate with a new triage stage | Gofer core |
| Codebase exploration and pattern finding | `1_gofer_research` | Reuse | Already first-class in Gofer | Gofer core |
| Spec, plan, task generation | `2_gofer_specify`, `3_gofer_plan`, `4_gofer_tasks` | Reuse | Already explicit numbered stages | Gofer core |
| Standalone domain-language glossary | No dedicated artifact or helper | Extend | Good augmentation gap; see `ubiquitous-language` fit | Gofer core |
| Standalone debugging loop | Partial coverage in `5_gofer_implement` only | Extend | Useful outside full implementation loops | Gofer core |
| Tight TDD micro-loop | Partial coverage in `9_gofer_tests` and `5_gofer_implement` | Extend | Worth a focused helper instead of a new stage | Gofer core |
| Business-friendly PRD / summary output | `proposal-review.md` exists; `spec-summary.md` is inconsistent | Extend | Useful addition without altering stage order | Gofer core |
| GitHub issue export | `issues.md` exists in `4_gofer_tasks` | Extend only if needed | Only valuable if native issue tracker integration is desired | Gofer core |

## Business Scenario Analysis

### Scenario Options Considered

| Scenario | User/Business Fit | Delivery Trade-off | Recommendation |
| --- | --- | --- | --- |
| Focused additive pack | Highest fit; adds only genuinely missing helpers | Smallest implementation surface; fastest payoff | Adopt |
| Broad workflow pack | Adds more choice for maintainers | Higher overlap risk and more review work | Selectively adopt |
| Full mirror of all 22 skills | Maximum external parity | High duplication, more maintenance, weaker coherence | Defer |

### Recommended Scenario

Adopt a **focused additive pack** first: port only the skills that fill real
Gofer gaps and fit existing augmentation seams. The strongest first-wave
candidates are:

1. `ubiquitous-language` (as a Gofer-owned vocabulary helper)
2. `diagnose`
3. `tdd`
4. `to-prd` or an equivalent business-summary writer
5. `zoom-out`

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
| --- | --- | --- |
| Canonical command definitions | `.specify/commands/` | Source of truth for Gofer commands and helpers |
| Command generator | `.specify/scripts/node/generate-commands.mjs` | Emits Claude/Copilot/Codex/Gemini mirrors |
| Command parsing/schema | `.specify/scripts/node/parse-stage-command.mjs`, `.specify/scripts/node/schemas/stage-command.schema.json` | Enforces command metadata contract |
| Runtime command sequencing | `extension/src/council/CommandGenerator.ts` | Contains hardcoded next-command sequence |
| Persisted pipeline state | `extension/src/autonomous/PipelineStateManager.ts`, `extension/resources/bash-scripts/pipeline-state.sh` | Tracks stage order; poor target for renumbering |
| Cross-platform routing | `extension/src/council/CrossPlatformCommandRouter.ts` | Resolves command surfaces at runtime |

### Existing Patterns to Follow

#### Pattern 1: Non-numbered control augmentation

Found in: `.specify/commands/gofer_side.md`

Why relevant: Gofer already supports namespaced helper commands that do not
change numbered stages. This is the cleanest pattern for standalone helpers such
as `gofer:diagnose` or `gofer:zoom-out`.

#### Pattern 2: Optional cross-cutting analysis within a numbered stage

Found in: `.specify/commands/4_gofer_tasks.md` and
`.specify/commands/6_gofer_validate.md`

Why relevant: Gofer already bolts specialist analyses into numbered stages using
parallel sub-agents and judge synthesis. This is the right fit for `tdd`,
`diagnose`, vocabulary extraction, or issue export augmentations.

#### Pattern 3: Pre/post pipeline sidecars

Found in:

- `.specify/commands/0a_problem_validation.md`
- `.specify/commands/7a_stakeholder_comms.md`

Why relevant: Gofer already adds business-side artifacts before and after the
core numbered flow. A `to-prd`-style or summary skill belongs here more than in
the numbered backbone.

### Integration Points

1. **Canonical command seam**: add helper/control/utility commands in
   `.specify/commands/`
2. **Stage-local augmentation seam**: add optional specialist sub-agent blocks
   inside existing numbered stage definitions
3. **Mirror emission seam**: rely on the existing generators instead of adding
   hand-maintained surfaces
4. **Protected boundary**: do not insert new numbered stages into the hardcoded
   pipeline-state and next-command logic
5. **Cross-CLI portability boundary**: do not adopt provider-specific helper
   commands unless Gofer wraps them in a cross-surface abstraction

### Related Code

- `.specify/commands/0_business_scenario.md` - orchestrator and discovery
- `.specify/commands/1_gofer_research.md` - research orchestration and approval
- `.specify/commands/4_gofer_tasks.md` - cross-cutting scan pattern
- `.specify/commands/5_gofer_implement.md` - optional implementation helpers
- `.specify/commands/6_gofer_validate.md` - rubric + blast-radius + review loop
- `scripts/codex-skill-generator.js` - hardcoded pipeline sequence to avoid
  touching for this work

## Current Gofer Coverage vs Additive Gaps

### Already Covered Well

- Business discovery, routing, and scenario classification
- Problem validation, build-vs-buy, and market analysis
- Codebase exploration, pattern finding, and reuse scanning
- Specification, planning, data modeling, and task breakdown
- Implementation review, code review, test diversification, and performance
  exploration
- Validation, security, blast-radius analysis, and engineering review
- Save/resume, stakeholder comms, constitution, and code hydration

### Likely Augmentation Gaps

1. **Dedicated vocabulary / ubiquitous language artifact**
2. **Standalone diagnose loop for bugs and incidents**
3. **Tighter TDD helper distinct from test-case generation**
4. **Business-friendly PRD / summary writer**
5. **Standalone zoom-out system comprehension helper**
6. **Optional deeper grilling/interview mode when requirements are unclear**
7. **Issue tracker export if GitHub-native issues are desired**

## Why `/6_gofer_validate` Failed Recently

The recent failure was **not** mainly a missing-skill problem. It was a
**truthfulness gap inside the existing `/6_gofer_validate` design**.

### Observed failure mode

- validation reported a passing score even though integration was incomplete
- files, routes, and services existed in code but were not fully wired into the
  running application
- test results were treated as stronger evidence than was actually executed
- UI/deployment state was not verified against the real serving target

### Structural cause in the current `/6` design

The current `/6_gofer_validate` command is strong at **code inspection,
specialist review, rubric scoring, and static/diff-based reasoning**, but it is
still weaker than it should be at **runtime proof**:

1. **Agent-heavy validation before runtime proof**
   - Much of the stage reasons from files, contracts, tests, and diffs before
     proving that the feature is actually wired and reachable.
2. **Automated checks are too generic**
   - Step 3 runs build/test/lint/typecheck, but does not yet force:
     - route reachability checks
     - service instantiation/wiring checks
     - import/orphan verification as a hard gate
     - deployment/render proof for UI features when deployment is in scope
3. **UI verification is under-specified**
   - Category 3 checks for rendering tests, but not whether the changed UI is
     actually deployed when deployment is part of the acceptance criteria.
4. **Integration reality is under-specified**
   - Category 5 checks contracts and integration coverage, but not whether every
     new route/service/file is truly used by the running app.
5. **Evidence provenance is too loose**
   - The current report shape does not force a raw proof artifact for each pass
     claim, so confidence can drift above what was actually proven.

## Required Fixes Inside the Existing `/6` Stage

The correct fix is **not** to add `/6A.1`, `/6A.2`, etc. The correct fix is to
add **mandatory gates and scoring rules inside the existing `/6_gofer_validate`
flow**.

### 1. Mandatory Integration Proof Gate

Add a required validation substep inside `/6` before scoring:

- for every new file: verify it is imported, referenced, or invoked somewhere
  real
- for every new route: perform an HTTP request or equivalent runtime probe
- for every new service or middleware: verify it is instantiated and connected
  to the execution/request pipeline
- treat orphaned or unreachable feature code as blocking, not informational

**Best fit in current `/6` design**:

- extend **Step 2.5 Pre-Flight Change Surface Discovery**
- tighten **Category 5: Integration Reality**
- upgrade orphaned feature code from informational to blocking when it is
  supposed to power delivered behavior

### 2. Mandatory Real Test Execution Gate

Step 3 already includes `npm test`, but it needs stronger truthfulness rules:

- always report the **actual executed command**
- always report the **real pass/fail count**
- if test collection/import/bootstrap fails, validation fails immediately
- never allow inherited, estimated, or assumed test results

**Scoring implication**:

- **Category 1 (Functional Correctness)** = 0 if tests fail to import, collect,
  or execute
- **Category 2 (Test Authenticity)** cannot pass if the suite did not run
  cleanly enough to establish trustworthy evidence

### 3. Mandatory Deployment / Render Verification When In Scope

For user-visible UI or deployed-service changes, `/6` must verify the feature in
the real serving context whenever that context is part of the acceptance
criteria:

- UI: built and rendered proof
- route/API: live reachable proof
- SharePoint/Azure/staging/prod target: deployment proof when acceptance depends
  on that target

**Allowed evidence**:

- screenshots
- curl/HTTP transcripts
- headless browser assertions
- deployment logs
- environment-specific smoke checks

If the required environment is unavailable, validation must say **blocked /
unverified**, not **passed**.

**Scoring implication**:

- **Category 3 (UI/E2E)** = 0 if a user-visible feature is claimed complete but
  required render/deployment proof is missing

### 4. No Fabricated or Implied Evidence

`/6` should explicitly forbid pass claims without executed proof:

- no claiming tests passed if they were not run in this validation session
- no claiming contract compliance without runtime boundary proof when runtime
  behavior is the real risk
- no claiming security/integration confidence for code that is not wired into
  the real execution path

### 5. Honest Rubric Scoring Changes

The rubric should be tightened as follows:

- **Category 1: Functional Correctness**
  - 0 if tests fail to import, collect, or execute
- **Category 3: UI/E2E Verification**
  - 0 if UI is claimed complete but real render/deployment proof is missing
- **Category 5: Integration Reality**
  - 0 if routes do not respond, services are orphaned, middleware is unwired, or
    files are not actually used

### 6. Evidence Table in `validation-report.md`

Add a mandatory evidence section such as:

| Claim | Proof type | Command / probe | Result | Artifact |
| --- | --- | --- | --- | --- |
| Route responds | HTTP | `curl ...` | 200 OK | `artifacts/route-check.txt` |
| UI renders | Headless/browser | `playwright ...` | PASS | screenshot path |
| Tests run | Test runner | `npm test` | real pass/fail count | raw output path |

If the evidence row is missing, the claim should not score full points.

## Candidate Skill Portability Check

These candidate skills were checked against their actual `SKILL.md` content, not
just the repo README.

### Skills that port cleanly

- **`ubiquitous-language`**
  - portable as a Gofer-owned helper
  - needs adaptation from root `UBIQUITOUS_LANGUAGE.md` to feature-scoped or
    Gofer-scoped artifact output
- **`diagnose`**
  - portable and high-value
  - strong match for incident debugging and integration failures
  - especially useful because it insists on a real runtime feedback loop
- **`tdd`**
  - portable with minor adaptation
  - strong fit inside `5_gofer_implement` and `9_gofer_tests`
- **`zoom-out`**
  - very portable
  - good lightweight `gofer:*` helper for system comprehension
- **`grill-me`**
  - portable
  - good optional deep-discovery mode for unclear requirements

### Skills that need adaptation before they really work

- **`to-prd`**
  - useful conceptually, but upstream assumes an issue tracker and
    `/setup-matt-pocock-skills`
  - for Gofer, it should likely become `proposal-review.md`, `spec-summary.md`,
    or another artifact-first output instead of a tracker-first skill
- **`to-issues`**
  - only really “works” if Gofer commits to native issue-tracker integration

### Skills that do *not* fix the `/6` truthfulness gap by themselves

- `ubiquitous-language`
- `zoom-out`
- `grill-me`
- `to-prd`

They are still useful, but the validation failure requires **internal `/6`
hardening**, not just helper-skill adoption.

## Recommended Stage-by-Stage Augmentation Map

| External skill | Best Gofer stage(s) | Fit | Recommendation |
| --- | --- | --- | --- |
| `ubiquitous-language` | `0_business_scenario`, `0a_problem_validation`, `1_gofer_research`, `2_gofer_specify` | Additive | Port as a Gofer-owned vocabulary helper and artifact |
| `grill-me` | `0_business_scenario`, `1_gofer_research` | Partial gap | Add as an optional deeper interview mode |
| `to-prd` | `0a_problem_validation`, `1_gofer_research`, `2_gofer_specify` | Additive | Port as PRD/spec-summary/business-brief output |
| `zoom-out` | `1_gofer_research` or `gofer:*` control helper | Additive | Good standalone comprehension helper |
| `triage` | `0_business_scenario`, bug routes before `5_gofer_implement` | Partial gap | Useful if Gofer wants explicit backlog / intake state machines |
| `grill-with-docs` | `1_gofer_research`, `2_gofer_specify`, `3_gofer_plan` | Partial gap | Useful for terminology and ADR pressure-testing |
| `to-issues` | `4_gofer_tasks` | Mostly covered | Only add if issue tracker export matters |
| `tdd` | `5_gofer_implement`, `9_gofer_tests` | Additive | Strong candidate as a red-green micro-loop helper |
| `diagnose` | `5_gofer_implement` or a non-numbered helper | Additive | Strong candidate for bug and perf work |
| `improve-codebase-architecture` | `3_gofer_plan`, `6_gofer_validate` | Mostly covered | Low priority; Gofer already does much of this |
| `caveman` | `gofer:personality` | Low-value augmentation | Could be folded into personality, not worth a new stage |
| `git-guardrails-claude-code` | `gofer_constitution` / utility setup | Conditional | Useful as safety tooling, not a core pipeline augmentation |
| `setup-pre-commit` | `gofer_constitution` / project setup | Conditional | Useful for repo hygiene, not pipeline shape |

The remaining Matt skills are either repo-specific, personal, deprecated, or
low-leverage for Gofer's core pipeline.

## Technology Decisions

### Decision 1: Preserve numbered pipeline stages

- **Choice**: Keep the existing numbered stage model unchanged
- **Rationale**: Stage order is hardcoded in runtime/state helpers and changing
  it would create unnecessary blast radius
- **Alternatives considered**: Insert new numbered stages into the backbone

### Decision 2: Use `.specify/commands/` as the only command source of truth

- **Choice**: Add any new helper/control/utility commands there
- **Rationale**: Existing generators already emit the required mirrors
- **Alternatives considered**: Hand-maintain `.github/prompts`, `.agents/skills`,
  `.system/skills`, or extension resources directly

### Decision 3: Port only additive skills

- **Choice**: Cherry-pick only skills that fill real Gofer gaps
- **Rationale**: Gofer already covers most generic engineering workflows
- **Alternatives considered**: Full 22-skill mirror

### Decision 4: Treat vocabulary as active even if deprecated upstream

- **Choice**: Consider a Gofer-owned vocabulary helper as first-wave candidate
- **Rationale**: The capability is still valuable even if the upstream skill is
  deprecated
- **Alternatives considered**: Ignore it because the original repo deprecated it

### Decision 5: Require cross-CLI parity for standalone helpers

- **Choice**: Any standalone adopted helper must emit across Claude, Copilot,
  Codex, and Gemini
- **Rationale**: Gofer is intentionally cross-CLI and already generates command
  surfaces from one canonical source
- **Alternatives considered**: Provider-specific standalone helpers

### Decision 6: Fix `/6` truthfulness inside the existing stage

- **Choice**: Strengthen `/6_gofer_validate` with runtime proof gates instead of
  creating extra `/6` sub-stages
- **Rationale**: The failure came from insufficient evidence requirements, not
  from missing stage numbering
- **Alternatives considered**: Add new `/6A.x` stages

## Recommended Architecture Direction

### Recommended Architecture

Use a **hybrid augmentation model**:

1. Add a small number of non-numbered `gofer:*` helper commands for standalone
   workflows
2. Add optional specialist sub-agent sections inside existing numbered stages
3. Keep numbered pipeline/state logic unchanged
4. Continue emitting all surfaces from `.specify/commands/`
5. Keep provider-specific upstream mechanics internal unless the user-facing
   helper remains cross-CLI
6. Harden `/6_gofer_validate` internally with truthful runtime evidence gates

### Architecture Options Considered

| Option | Why choose it | Why not choose it now |
| --- | --- | --- |
| Full mirror of Matt's catalog | Maximizes parity with upstream skills | Too much overlap and maintenance burden |
| Stage-local augmentation only | Lowest blast radius | Misses value from reusable standalone helpers |
| Hybrid helper + stage-local model | Best balance of reuse and stability | Slightly more design work up front |

## Constraints & Considerations

- Hardcoded sequence/state files make renumbering a poor fit
- Generated surface parity must remain intact
- Cross-CLI parity is a hard requirement for standalone helper commands
- `/6_gofer_validate` must return blocked/unverified rather than passed when the
  required runtime/deployment evidence is unavailable
- Several Matt skills are deprecated, personal, or repo-setup specific
- `to-issues` is only worth porting if Gofer wants native issue tracker output
- Some safety/setup skills are better treated as utility commands than pipeline
  augmentations

## Open Questions

- [ ] Which first-wave pack matters most: vocabulary + diagnose + tdd, or PRD +
      issues + zoom-out?
- [ ] Should Gofer export native GitHub issues, or remain file/artifact-first?
- [ ] Should deprecated upstream ideas that still add value be reintroduced
      under Gofer ownership?

## Recommendations

1. Start with **vocabulary / ubiquitous-language** as a Gofer-owned helper.
2. Add **diagnose** as either a non-numbered helper or a stage-5 optional path.
3. Add **tdd** inside `5_gofer_implement` and `9_gofer_tests`.
4. Add **to-prd** or equivalent **spec-summary** generation around research and
   specification.
5. Add **zoom-out** as a standalone comprehension helper.
6. Treat **to-issues** as optional and only pursue it if issue tracker
   integration is a product goal.
7. Before adopting more helper skills, harden `/6_gofer_validate` so it requires
   real integration, test-execution, deployment, and evidence provenance.
8. Do **not** mirror personal, deprecated, or repo-specific setup skills by
   default.
