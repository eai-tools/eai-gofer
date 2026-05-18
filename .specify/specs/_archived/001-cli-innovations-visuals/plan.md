---
feature: 001-cli-innovations-visuals
spec: spec.md
research: research.md
status: ready
created: 2026-04-25
workflowProfile: enterpriseai
eaiCliVersion: 'N/A — internal pipeline tooling, no eai runtime dependency'
phaseOrder: strict-1-2-3
architecture: A — template-and-sub-agent pipeline with source-of-truth generator
aiLeverageTaxonomy: ['Replace', 'Augment', 'Automate', 'Observe']
hardInvariants:
  - 'no-regression: every existing command, sub-agent, hook, template, script
    preserved at parity'
  - 'Codex skill-budget hygiene: ≤140-char descriptions, flat tree, per-CLI
    exclusion, doctor command, .agents/skills/ discovery, no
    skills_context_budget_percent key'
---

# Implementation Plan: CLI Innovations + Multi-Persona Visual Artifacts

**Branch**: `001-cli-innovations-visuals` | **Date**: 2026-04-25 | **Spec**:
[spec.md](./spec.md) | **Research**: [research.md](./research.md) | **Proposal
Review**: [proposal-review.md](./proposal-review.md)

**Input**: Approved Scenario C (combined dual-track, three-phase) with
Architecture A (template-and-sub-agent pipeline + source-of-truth generator).
Two hard invariants encoded throughout: (1) no-regression of the existing
pipeline; (2) Codex skill-budget hygiene.

---

## Summary

Deliver a three-phase uplift to Gofer that closes two coupled gaps. Work Phase 1
introduces a YAML-frontmatter + Markdown-body source-of-truth at
`.specify/commands/<stage>.md` plus a Node generator. Phase 1 itself is
sub-sequenced: **Tech 1.3a** emits ONLY today's six existing surfaces (Claude,
Claude-mirror, Copilot, GitHub-prompt, `.agents/skills/`, `.system/skills/`);
**Tech 1.5** is the byte-equivalence verification gate (modulo description
shortening AND per-CLI exclusion of the 5 Claude-only stages from
`.agents/skills/`, `.system/skills/`, `extension/resources/copilot-prompts/`,
`.github/prompts/`); **Tech 1.6** adds NEW Gemini TOML and NEW Codex
`AGENTS.md`/`codex-config.toml` surfaces (gated on 1.5); **Tech 1.7** ships
`/gofer:plan` (plan-mode toggle, distinct from the `/gofer:plan-stage` alias for
`/3_gofer_plan` per ADR-003), `/gofer:side`, `/gofer:personality`, and the
additive `/gofer:*` namespace alias mechanism (also gated on 1.5). The read-only
`gofer codex doctor` ships in **Tech 1.3b** and is independent of surface
emission. Work Phase 2 introduces the persona pack (Impact Canvas with the
4-verb AI-leverage Ring, C4 Context, C4 Container, AS-IS value-stream, TO-BE
value-stream with enforced 4-verb tagging, capability heatmap, bounded-context
map, ERD, risk heatmap, ROI `xychart-beta`) via seven new visual-writer
sub-agents wired into existing stage commands, with `impact-canvas.md` and
`value-stream-tobe.md` as hard gates between `/2_gofer_specify` and
`/3_gofer_plan`. Work Phase 3 packages Gofer as a Claude Code plugin, a Gemini
CLI extension, a Codex `AGENTS.md` + `codex-config.toml` bundle, and assembles
the stakeholder pack in `/7a_stakeholder_comms` with optional Marp deck and
optional `mmdc` PNG/SVG export.

The technical approach is a template-and-sub-agent pipeline (Architecture A) in
three layers: source-of-truth (one YAML+MD per stage), persona-pack (one
template + one sub-agent writer per visual), delivery (`/7a_stakeholder_comms`
assembler). Phase order is strict 1 → 2 → 3 — Work Phase 1 must complete
byte-equivalent reproduction (FR-002) before Work Phase 2 is permitted to start.

---

## Technical Context

**Language/Version**: Node.js ≥20 (for the source-of-truth generator and
`mermaid-export.mjs`, matching the precedent set by
`.specify/scripts/node/generate-issues.js`); TypeScript 5.x strict mode for any
extension code touched (`noImplicitAny: true`, `strictNullChecks: true`) per
Constitution Principle IV.

**Primary Dependencies**:

- **Existing (preserved per Invariant 1)**: VSCode Extension API, Webview API,
  Anthropic SDK, Playwright, Webpack, Vitest, fs/promises, the 37 existing
  sub-agents at `.claude/agents/`, all hooks under `.specify/scripts/hooks/`,
  all bash scripts under `.specify/scripts/bash/`, all eight existing templates
  under `extension/resources/templates/`.
- **New (this feature)**: `js-yaml` (or `yaml`) for YAML frontmatter parsing in
  the generator, Mermaid 10.x for all new diagrams (existing convention),
  `@mermaid-js/mermaid-cli` (`mmdc`) as an OPTIONAL devDependency for Phase 3
  PNG/SVG export, Marp CLI as an OPTIONAL devDependency for Phase 3 slide-deck
  rendering.

**Storage**: Filesystem-only (Markdown + YAML + TOML + JSON). No database, no
network state at runtime. Persona-pack artifacts live inside
`.specify/specs/<feature>/`. Source-of-truth files live at
`.specify/commands/<stage>.md`. Generator output is deterministic (NFR-011).

**Testing**: Vitest for unit and integration tests, including the
byte-equivalence regression suite over all 16 existing stages (the FR-002 gate).
Golden-file fixture tests for each visual writer. Integration test for
`gofer codex doctor` against a fixture `tests/fixtures/codex-skills-polluted/`
tree. End-to-end pipeline test in Phase 3 producing the full persona pack on a
sample feature.

**Target Platform**:

- **CLI surfaces (5)**: Claude Code, Gemini CLI, Codex CLI, GitHub Copilot
  CLI/Coding Agent, plus the VSCode extension marketplace.
- **Operating environments**: macOS, Linux, Windows (WSL) — same matrix as the
  existing Gofer pipeline.
- **Mermaid renderers**: VSCode preview (no extra extension required per
  NFR-008), Claude Artifacts, mermaid.live, GitHub Markdown render, optional
  `mmdc` headless-Chrome export.

**Project Type**: Single-monorepo VSCode-extension project with three co-located
packages (`extension/`, `language-server/`, `docs/`) plus `.specify/`-rooted
pipeline tooling. This feature does NOT add a new package; it is an additive
layer over `.specify/` and `extension/resources/`.

**Performance Goals**:

- **NFR-001**: source-of-truth generator full re-emit (16 stages × 5 surfaces)
  under 2 seconds on a developer laptop.
- **NFR-002**: Mermaid render of any single persona-pack artifact in VSCode
  preview under 5 seconds.
- **SC-007**: end-to-end generator runtime <2s.
- Constitution Principle VI: extension activation <500ms unchanged; tree view
  render <100ms unchanged.

**Constraints**:

- **NFR-003**: each persona-pack artifact ≤2,000 lines / ≤200KB to remain
  diff-friendly.
- **NFR-004**: cumulative description bytes for the canonical Gofer skill set on
  Codex paths ≤2KB.
- **NFR-005**: no secrets in templates or source-of-truth files.
- **NFR-006**: `mmdc` MUST run with default headless-Chrome sandbox; no
  `--no-sandbox`.
- **NFR-007**: every persona-pack artifact MUST be Markdown-first; rendering is
  a separate optional layer (cross-CLI parity).
- **NFR-008**: VSCode preview MUST render every persona-pack artifact without
  additional extensions beyond the Gofer extension itself.
- **NFR-009**: Phases 1 and 2 MUST function fully offline; runtime use of the
  Phase 3 published artifacts MUST work offline.
- **NFR-010**: when a beta Mermaid construct (`xychart-beta`, `quadrantChart`,
  C4) fails to render, fall back to tabular text; never block the pipeline.
- **NFR-011**: re-running the generator on unchanged source-of-truth files MUST
  produce byte-identical output (deterministic emit).

**Scale/Scope**:

- 16 existing stage commands × 5 emit-path copies (today's hand-synced fan-out)
  → 16 source-of-truth files × 1 generator + 8 emit surfaces (Claude, Copilot
  prompts, GitHub prompts, `.agents/skills/`, `.system/skills/`, NEW Gemini
  TOML, NEW Codex `AGENTS.md`, NEW `extension/resources/claude-commands/`
  mirror).
- 37 existing sub-agents preserved + 7 new visual-writer sub-agents.
- 8 existing templates preserved (3 upgraded) + 9 new persona-pack templates.
- 3 new CLI commands (`/gofer:plan`, `/gofer:side`, `/gofer:personality`) + the
  namespace alias mechanism for all 16 existing stages.

### Architecture (Three Layers)

| Layer                         | Purpose                                                                                    | Component                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Layer 1 — Source-of-truth** | Single canonical YAML+MD per stage drives every CLI surface                                | `.specify/commands/<stage>.md` + `.specify/scripts/node/generate-commands.mjs`                |
| **Layer 2 — Persona pack**    | One Markdown template + one sub-agent writer per visual artifact                           | `.specify/templates/visuals/*.md` + `.claude/agents/visual-*-writer.md`                       |
| **Layer 3 — Delivery**        | Compose persona-pack artifacts into one stakeholder pack + optional rendered images / deck | `/7a_stakeholder_comms` + `.specify/scripts/node/mermaid-export.mjs` (optional `mmdc`) + Marp |

### Generator Emit Targets

Layer 1 generator emits each source-of-truth file to up to eight surfaces.
Existing surfaces (preserved at parity by FR-002):

| Existing surface       | Path                                                    | Notes                        |
| ---------------------- | ------------------------------------------------------- | ---------------------------- |
| Claude commands        | `.claude/commands/<stage>.md`                           | byte-equivalent reproduction |
| Claude commands mirror | `extension/resources/claude-commands/<stage>.md`        | byte-equivalent reproduction |
| Copilot prompts        | `extension/resources/copilot-prompts/<stage>.prompt.md` | byte-equivalent reproduction |
| GitHub prompts         | `.github/prompts/<stage>.prompt.md`                     | byte-equivalent reproduction |
| Agents skills          | `.agents/skills/<stage>/SKILL.md`                       | flat depth ≤2 (FR-008)       |
| System skills          | `.system/skills/<stage>/SKILL.md`                       | flat depth ≤2                |

New surfaces (introduced by Phase 1):

| New surface        | Path                                                                                   | Notes                         |
| ------------------ | -------------------------------------------------------------------------------------- | ----------------------------- |
| Gemini TOML        | `.gemini/commands/gofer/<stage>.toml`                                                  | `{{args}}` + `@{path}` syntax |
| Codex skill bundle | `.agents/skills/<stage>/SKILL.md` (already listed) + `AGENTS.md` + `codex-config.toml` | flat tree, per-CLI exclusion  |

### Per-CLI Exclusion (FR-007)

Claude-only stages excluded from Codex and Gemini emit paths:
`0_business_scenario` (orchestrator), `gofer_constitution`, `gofer_hydrate`,
`7_gofer_save`, `8_gofer_resume`. The remaining 11 numbered/named stages emit to
all five CLI surfaces.

The 3 new control commands (`/gofer:plan` plan-mode toggle, `/gofer:side`,
`/gofer:personality`) emit ONLY to `[claude, claude-mirror, copilot, vscode]` —
they are explicitly **excluded from `codex` and `gemini`** because:

- Codex has native `/plan`, `/side`, and `/personality` commands; duplicating
  them on Codex paths would consume the 2% description budget (NFR-004) for no
  value.
- Gemini has its own equivalents and we do not want to bloat its command
  discovery surface either.

This exclusion is encoded in each control command's `surfaces:` frontmatter and
asserted by the FR-012/FR-013/FR-014 rows in
`contracts/source-of-truth-schema.md` §5.

### Integration Points (existing → updated stage command files)

| Stage                                                                                                                 | Source-of-truth file                                       | Sub-agent invocations (NEW additions in bold)                                                                                                                                                                           | Persona-pack artifacts emitted                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/0_business_scenario`                                                                                                | `.specify/commands/0_business_scenario.md`                 | (orchestrator — preserved)                                                                                                                                                                                              | none                                                                                                        |
| `/0a_problem_validation`                                                                                              | `.specify/commands/0a_problem_validation.md`               | business-problem-validator (existing); **visual-value-stream-writer (AS-IS)**; **visual-heatmap-writer (capability)**                                                                                                   | `value-stream-asis.md`, `capability-heatmap.md` (heatmap also re-emitted in `/1_gofer_research` per FR-021) |
| `/1_gofer_research`                                                                                                   | `.specify/commands/1_gofer_research.md`                    | research-\* (existing); **visual-c4-writer (Context)**; **visual-heatmap-writer (capability)**                                                                                                                          | `c4-context.md`, `capability-heatmap.md`                                                                    |
| `/2_gofer_specify`                                                                                                    | `.specify/commands/2_gofer_specify.md`                     | specify-\* (existing); **visual-canvas-writer (pass 1 — initial; risks heuristic from spec.md NFR/Out-of-Scope)**; **visual-value-stream-writer (TO-BE)**                                                               | `impact-canvas.md` (pass 1), `value-stream-tobe.md` (HARD GATE per FR-016, FR-018)                          |
| `/3_gofer_plan`                                                                                                       | `.specify/commands/3_gofer_plan.md`                        | plan-\* (existing); **visual-c4-writer (Container)**; **visual-bounded-context-writer**; **visual-erd-writer**                                                                                                          | `c4-container.md`, `bounded-context.md`, `data-model-erd.md`                                                |
| `/4_gofer_tasks`                                                                                                      | `.specify/commands/4_gofer_tasks.md`                       | tasks-\* (existing)                                                                                                                                                                                                     | persona-pack completeness check (warn)                                                                      |
| `/5_gofer_implement`                                                                                                  | `.specify/commands/5_gofer_implement.md`                   | implement-\* (existing)                                                                                                                                                                                                 | none                                                                                                        |
| `/6_gofer_validate`                                                                                                   | `.specify/commands/6_gofer_validate.md`                    | validation-\* (six existing); **visual-risk-writer**; **visual-canvas-writer (pass 2 — regenerates ONLY `topThreeRisks` from validation council)**; **business-metrics-analyzer (existing — upgraded to xychart-beta)** | `risk-heatmap.md`, `impact-canvas.md` (pass-2 risk regeneration), ROI `xychart-beta` in `business-metrics`  |
| `/6a_gofer_engineering_review`                                                                                        | `.specify/commands/6a_gofer_engineering_review.md`         | engineer-review (existing)                                                                                                                                                                                              | none                                                                                                        |
| `/7_gofer_save`                                                                                                       | `.specify/commands/7_gofer_save.md`                        | (existing) — Claude-only                                                                                                                                                                                                | none                                                                                                        |
| `/7a_stakeholder_comms`                                                                                               | `.specify/commands/7a_stakeholder_comms.md`                | comms-writer (existing) — **stakeholder-pack assembler upgrade**                                                                                                                                                        | `stakeholder-pack.md` (+ optional `mmdc`/Marp)                                                              |
| `/8_gofer_resume`                                                                                                     | `.specify/commands/8_gofer_resume.md`                      | (existing) — Claude-only                                                                                                                                                                                                | none                                                                                                        |
| `/9_gofer_tests`                                                                                                      | `.specify/commands/9_gofer_tests.md`                       | (existing)                                                                                                                                                                                                              | none                                                                                                        |
| `/10_gofer_cloud`                                                                                                     | `.specify/commands/10_gofer_cloud.md`                      | (existing)                                                                                                                                                                                                              | none                                                                                                        |
| `/gofer_constitution`                                                                                                 | `.specify/commands/gofer_constitution.md`                  | (existing) — Claude-only                                                                                                                                                                                                | none                                                                                                        |
| `/gofer_hydrate`                                                                                                      | `.specify/commands/gofer_hydrate.md`                       | (existing) — Claude-only                                                                                                                                                                                                | none                                                                                                        |
| **`/gofer:plan`** (NEW — plan-mode toggle, mirrors Codex `/plan`; **NOT** an alias for `/3_gofer_plan` — see ADR-003) | `.specify/commands/gofer_plan.md`                          | none                                                                                                                                                                                                                    | none                                                                                                        |
| **`/gofer:side`** (NEW)                                                                                               | `.specify/commands/gofer_side.md`                          | none                                                                                                                                                                                                                    | none                                                                                                        |
| **`/gofer:personality`** (NEW)                                                                                        | `.specify/commands/gofer_personality.md`                   | none                                                                                                                                                                                                                    | none                                                                                                        |
| **`/gofer:plan-stage`** (NEW alias only; resolves to `/3_gofer_plan` per ADR-003)                                     | (alias frontmatter on `.specify/commands/3_gofer_plan.md`) | (delegates to `/3_gofer_plan` body)                                                                                                                                                                                     | (same as `/3_gofer_plan`)                                                                                   |

All 37 existing sub-agents are preserved at parity (FR-004), as inventoried by
`ls .claude/agents/*.md` (37 files): assumption-tracker,
business-metrics-analyzer, business-problem-validator, codebase-analyzer,
codebase-locator, codebase-pattern-finder, comms-writer, engineer-review,
implement-bug-triangulator, implement-code-review-council, implement-doc-writer,
implement-error-hardener, implement-performance-explorer,
implement-test-diversifier, implement-variant-generator,
multi-perspective-judge, plan-api-comparator, plan-architecture-diverger,
plan-data-model-stress-tester, plan-migration-path-finder,
plan-refactor-rewrite-advisor, research-dependency-evaluator,
research-horizon-scanner, research-market-scanner,
research-perspective-multiplier, scope-creep-detector,
specify-ambiguity-detector, specify-journey-stress-tester,
tasks-cross-cutting-scanner, tasks-rollback-planner, validate-security-red-team,
validation-correctness, validation-integration, validation-performance,
validation-security, validation-standards, validation-test-quality. (Note:
spec.md and research.md text says "36 sub-agents" — that text predates the
addition of one agent. Tech Phase 1.5 inventory task confirms the canonical
count is 37; the FR-004 gate is "all existing agents preserved" regardless of
headcount, and the spec/research text will be reconciled during the post-1.5
documentation pass.)

### Key Dependencies

**Existing (preserved per Invariant 1)**:

- `.specify/scripts/bash/*.sh` — create-new-feature, log-stage,
  check-context-health, pipeline-state, save-checkpoint,
  sync-implementation-status, etc.
- `.specify/scripts/hooks/*.mjs` — three hooks are wired in
  `.claude/settings.json` (UserPromptSubmit, PostToolUse, Stop);
  `session-lifecycle.mjs` exists on disk but is invoked separately, NOT through
  `.claude/settings.json`. Tech Phase 1.5 includes a verification task
  confirming the wiring matches reality post-feature.
- `.claude/agents/*.md` — all existing visual sub-agents listed above.
- `.specify/templates/*.md` — existing templates preserved (a subset upgraded by
  FR-025, FR-028).
- `extension/resources/*` — all existing template, prompt, and command mirror
  files preserved (a subset upgraded).

**New (introduced by this feature)**:

- `js-yaml` (or `yaml`) — runtime npm dependency for the generator.
- `@mermaid-js/mermaid-cli` (`mmdc`) — OPTIONAL devDependency, Phase 3.
- Marp CLI — OPTIONAL devDependency, Phase 3.

---

## EnterpriseAI Profile Metadata

> Populated because `gofer.workflowProfile=enterpriseai`.

- **EAI CLI Version Pin**:
  `N/A — internal pipeline tooling, no eai runtime dependency.` This feature
  uplifts the Gofer pipeline itself; it is not a vertical-app deployment to an
  EAI service. The metadata block is retained per template requirement and to
  keep the EnterpriseAI Integration Map (below) traceable.
- **Vertical Template Reference**:
  `N/A — feature does not consume a vertical template`. The persona pack is the
  _output_ of the pipeline, which a downstream EAI student vertical will
  consume.
- **Deployment Repo Reference**: `N/A — deployment surface is the four CLIs
  - VSCode marketplace (Phase 3); no deployment-repo SHA pin applies`.

### EnterpriseAI Integration Map (IAP-001 → IAP-002 → IAP-003)

This feature implements a Vertical-App → EAI-Services → Deployment-Target chain
at the meta level. The bindings below carry through to `tasks.md` (generated in
`/4_gofer_tasks`) and are explicitly cross-referenced from each Tech Phase
below.

| Layer                 | Identity                                                                                                                                                                                            | Role                                                                                                                                                                                      | Contract ID | Bound to Tech Phase / Task                                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vertical App**      | Gofer persona pack: Impact Canvas, C4 Context, C4 Container, AS-IS value-stream, TO-BE value-stream with AI-leverage overlay, capability heatmap, bounded-context map, ERD, risk heatmap, ROI chart | Consumed by an EAI student vertical's design phase to translate a business problem into a design every persona can read                                                                   | **IAP-001** | Tech Phase 2.2 (template authoring), 2.3 (sub-agent writers), 2.4 (stage wiring), 2.6 (gate enforcement)                                                                                                                           |
| **EAI Services**      | The Gofer pipeline: source-of-truth generator + persona-pack visual writers + `/7a_stakeholder_comms` assembler                                                                                     | Production engine that takes a business scenario through research → specify → plan → tasks → implement → validate → comms while emitting persona-pack artifacts at each integration point | **IAP-002** | Tech Phase 1.1 (foundation), 1.2 (data layer), 1.3a (generator emit — existing surfaces only) + 1.3b (doctor), 1.5 (byte-equivalence gate), 1.6 (generator emit — new surfaces, gated on 1.5), 2.4 (stage wiring), 3.2 (assembler) |
| **Deployment Target** | Four-CLI surface (Claude Code plugin, Gemini CLI extension, Codex `AGENTS.md` + `codex-config.toml`, Copilot prompt files) + VSCode extension marketplace                                           | Distribution layer that meets each EAI student / staff member where they already work                                                                                                     | **IAP-003** | Tech Phase 1.3b (Codex doctor), 1.6 (new emit surfaces — gated on 1.5), 1.7 (new CLI commands — gated on 1.5), 3.1 (manifests), 3.3 (marketplace decision)                                                                         |

Contract chain: **IAP-001 → IAP-002 → IAP-003.** Every persona-pack artifact
(IAP-001) is produced by a sub-agent writer in the pipeline (IAP-002) and
rendered through the surface the consumer is using (IAP-003). The two hard
invariants apply across the chain: no-regression of any existing pipeline output
(IAP-002) and Codex skill-budget hygiene at the deployment target (IAP-003).

---

## Selected Implementation Approach

No `selected-option.md` exists for this feature; the 5-option spectrum is
generated by `/4_gofer_tasks` if and only if a base-journey emerges. For this
internal-tooling feature, the implementation is marked equivalent to **Standard
(Option 3)**: full features, moderate AI integration via the existing 37
sub-agents plus 7 new visual-writer sub-agents, no exotic dependencies, no
re-platform.

Why Option 3-equivalent and not lower or higher:

- **Lower (Option 1/2)** would defer either Phase 2 visuals or Phase 3 packaging
  — but proposal-review approved Scenario C explicitly to ship _both_ together
  with phased risk, and the persona-pack is the headline closing of the non-dev
  legibility complaint.
- **Higher (Option 4/5)** would correspond to Scenario D (marketplace-first
  re-platform with Opus coordinator agent teams as first-class) — explicitly
  treated as a North Star for a later quarter and out of scope here.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked at the close of Phase 1
(byte-equivalence gate) and before Phase 2 begins._

The Gofer constitution at `.specify/memory/constitution.md` defines eight core
principles. Each is enumerated below with this feature's alignment.

### Principle I — Test-Driven Development (NON-NEGOTIABLE)

- **Aligned**. Tech Phase 1.5 writes the byte-equivalence regression suite
  _before_ the source-of-truth files are migrated; tests must FAIL on the
  scaffold, then PASS once each migration is complete. Tech Phase 2.6
  golden-file fixtures are written before each visual-writer sub-agent's output
  template is finalised. Phase 3 end-to-end test is written before the assembler
  upgrade lands.
- Mitigation for risk: the gating diff suite (FR-002) is itself a TDD artifact —
  failing tests are the gate.

### Principle II — MCP-First Architecture

- **Aligned, no new MCP surface introduced**. This feature does not add new MCP
  tools; it uplifts the slash-command surface (orthogonal to MCP). The existing
  six MCP tools (`get_specs`, `get_next_task`, `execute_task`,
  `update_task_status`, `validate_code`, `run_tests`) are untouched.
- The new `gofer codex doctor` is intentionally a CLI subcommand, not an MCP
  tool — it is a read-only filesystem diagnostic with no AI-assistant surface.
  This does not violate Principle II because Principle II governs AI-assistant
  integration, not operator diagnostics.

### Principle III — Spec Kit Format Compliance

- **Aligned**. This very plan follows the spec-kit format. Source-of-truth files
  at `.specify/commands/<stage>.md` use YAML frontmatter with required keys
  (name, description, surfaces, args, includes) plus Markdown body — directly
  analogous to spec.md frontmatter conventions.

### Principle IV — Strict TypeScript & Code Quality

- **Aligned for any TypeScript edited**. The generator is implemented as Node.js
  ESM (`.mjs`) per the precedent of `.specify/scripts/node/generate-issues.js`.
  No new TypeScript code is required by this feature. Where existing TypeScript
  is touched (e.g., the VSCode extension's claude-commands mirror loader),
  strict mode and function/file size limits remain in force.

### Principle V — Security by Default

- **Aligned**. NFR-005 forbids secrets in templates / source-of-truth. NFR-006
  mandates `mmdc` runs with default Chrome sandbox enabled (no `--no-sandbox`).
  `gofer codex doctor` is read-only by FR-009; integration test asserts no
  writes to disk.

### Principle VI — Performance Requirements

- **Aligned**. NFR-001 (<2s generator) and NFR-002 (<5s Mermaid render) are
  explicit. Existing extension activation budget (<500ms) and tree view render
  budget (<100ms) are not regressed because this feature does not change
  extension activation paths.

### Principle VII — 80% Test Coverage Minimum

- **Aligned**. Tech Phase 1.5 and 2.6 add Vitest unit + integration tests for:
  generator emit byte-equivalence per stage; description budget (NFR-004);
  doctor command read-only behaviour and output format; each visual writer's
  golden-file output; gate enforcement at `/2_gofer_specify` and
  `/3_gofer_plan`. Coverage target ≥80% for all new generator code, new
  sub-agents, and the doctor command.

### Principle VIII — Minimal Necessary Changes

- **Apparent conflict — explicitly mitigated**. This feature touches a large
  number of files (16 stage commands × 5 surfaces, 9 new templates, 7 new
  sub-agents, 3 new commands, multiple manifests). Every individual touch is
  either:
  - **Generated**, not hand-edited (Layer 1 emits to all CLI surfaces from one
    source-of-truth — net hand-edited surface area is _reduced_);
  - **Additive** (new templates, new sub-agents, new commands, new manifests —
    does not modify existing files);
  - **Targeted upgrade** of an existing template specified by a single FR
    (FR-025 upgrades `business-metrics-template.md` and
    `spec-summary-template.md`; FR-028 upgrades
    `stakeholder-comms-template.md`).
- The byte-equivalence gate (FR-002) and the 100% no-regression spec coverage
  (SC-005, SC-008) are the verification that "minimal necessary" is enforced
  operationally even though the file count is large.

### Constitution Check Result

**PASS, with one explicit mitigation under Principle VIII** captured in the
Complexity Tracking table below. Re-check scheduled at the end of Tech Phase 1.5
(after byte-equivalence is proven) and at the end of Tech Phase 2.6 (after gate
enforcement is proven).

---

## Implementation Phases

> These are TECHNICAL phases inside the WORK PHASES (Work Phase 1 / 2 / 3) from
> the spec. Phase order is **strict 1 → 2 → 3** (Assumption 6). Work Phase 1
> must complete the byte-equivalence reproduction gate (FR-002, SC-008) before
> Work Phase 2 begins. Work Phase 2 must complete the persona-pack gate
> enforcement (FR-016, FR-018) before Work Phase 3 begins.

### Work Phase 1 — Source-of-truth + CLI parity + Codex hygiene

**Spec coverage**: FR-001 through FR-015, FR-034; NFR-001, NFR-004, NFR-005,
NFR-007, NFR-009, NFR-011; SC-003, SC-004, SC-005, SC-006, SC-007, SC-008,
SC-011, SC-012; User Stories US5, US6, US8.

**EnterpriseAI bindings**: IAP-002 (Tech 1.1, 1.2, 1.3a, 1.3b, 1.5, 1.6),
IAP-003 (Tech 1.3b, 1.6, 1.7).

**Gate to Work Phase 2**: byte-equivalent reproduction of all 16 stages on all 6
existing emit-path surfaces (FR-002, SC-008) verified by Tech Phase 1.5, AND
Tech Phase 1.6 new-surface emit completion.

#### Tech Phase 1.1 — Setup & Foundation

**Goal**: scaffold the source-of-truth directory, define the YAML schema, stub
the generator, wire npm scripts.

**Tasks**:

- [ ] Create directory `.specify/commands/` (root for source-of-truth files).
- [ ] Author `.specify/commands/README.md` documenting the YAML+MD format.
- [ ] Define the YAML frontmatter schema as a JSON Schema at
      `.specify/scripts/node/schemas/stage-command.schema.json` — required keys:
      `name`, `description` (≤140 chars), `surfaces` (subset of
      `["claude","copilot","gemini","codex","vscode"]`), `args` (array),
      `includes` (array of file refs).
- [ ] Scaffold `.specify/scripts/node/generate-commands.mjs` with: CLI entry,
      source-loader, schema validator, surface-emitter dispatch table,
      determinism check (re-emit + diff).
- [ ] Add `js-yaml` (or `yaml`) as a runtime dependency to the root
      `package.json`.
- [ ] Add npm scripts to root `package.json`: `generate:commands`,
      `generate:commands:check` (CI-mode that fails on diff), `codex:doctor`.
- [ ] Wire `generate:commands:check` into the existing CI workflow as a
      pre-commit / CI gate.

**Verification**:

- Generator runs end-to-end on an empty source tree and exits 0 with no
  emissions (smoke test).
- Schema validator rejects a fixture with description >140 chars (precondition
  for FR-006).
- npm scripts resolve and run on macOS, Linux, and Windows (WSL).

#### Tech Phase 1.2 — Data Layer (source-of-truth migration)

**Goal**: define the entity schema (StageCommand, SurfaceTarget, SkillManifest —
see `data-model.md`), migrate all 16 existing stages to YAML+MD source files,
and prove byte-equivalence of every emit path. **This is the hardest gate of
Phase 1.**

**Tasks**:

- [ ] Author `data-model.md` (companion to this plan) defining entities:
  - **StageCommand** — one source-of-truth file. Fields: name, description (≤140
    chars), surfaces (subset), args, includes, body.
  - **SurfaceTarget** — emit destination. Fields: cliId, basePath, fileNamingFn,
    descriptionTransformFn, exclusionList.
  - **SkillManifest** — Codex/`.agents/skills/` SKILL.md frontmatter contract.
    Fields: name, description, allowed_tools, runtime_hints.
- [ ] Migrate `0_business_scenario` to
      `.specify/commands/0_business_scenario.md`.
- [ ] Migrate `0a_problem_validation` to
      `.specify/commands/0a_problem_validation.md`.
- [ ] Migrate `1_gofer_research` through `10_gofer_cloud` (10 stages).
- [ ] Migrate `gofer_constitution` and `gofer_hydrate`.
- [ ] Migrate `6a_gofer_engineering_review`, `7_gofer_save`,
      `7a_stakeholder_comms`, `8_gofer_resume`, `9_gofer_tests`.
- [ ] For each migrated stage, run the generator and diff its emit against the
      live `.claude/commands/`, `extension/resources/copilot-prompts/`,
      `.github/prompts/`, `.agents/skills/`, `.system/skills/`,
      `extension/resources/claude-commands/` files. Iterate until diff is empty
      _modulo description shortening AND per-CLI exclusion of the 5 Claude-only
      stages from `.agents/skills/`, `.system/skills/`,
      `extension/resources/copilot-prompts/`, `.github/prompts/` outputs_.
      Excluded stages MUST be absent on excluded surfaces; non-excluded stages
      MUST be byte-equivalent to the pre-feature snapshot.

**Verification**:

- **Byte-equivalence diff suite passes for all 16 stages** (FR-002, SC-008).
- Cumulative description bytes for canonical Gofer skill set ≤2KB (NFR-004,
  SC-006).
- Determinism: re-running generator on unchanged source files produces
  byte-identical output (NFR-011).
- No `skills_context_budget_percent` reference anywhere (FR-011, SC-011).

#### Tech Phase 1.3a — Generator emit (existing surfaces only)

**Goal**: implement the surface-emitter dispatch for the SIX existing
emit-target surfaces ONLY — the surfaces that the byte-equivalence gate in Tech
Phase 1.5 verifies. New surfaces (Gemini TOML, Codex `AGENTS.md`,
`codex-config.toml`, the `.claude-plugin/plugin.json` stub) are deferred to Tech
Phase 1.6 — they MUST NOT be emitted before the Phase 1.5 gate is green on
`main`.

**Tasks**:

- [ ] Implement Claude emit (`.claude/commands/<stage>.md`) — preserves existing
      format byte-equivalent.
- [ ] Implement Copilot prompt emit
      (`extension/resources/copilot-prompts/<stage>.prompt.md`) —
      byte-equivalent.
- [ ] Implement GitHub prompts emit (`.github/prompts/<stage>.prompt.md`) —
      byte-equivalent.
- [ ] Implement `.agents/skills/<stage>/SKILL.md` emit — flat depth ≤2, per-CLI
      exclusion applied (FR-007, FR-008).
- [ ] Implement `.system/skills/<stage>/SKILL.md` emit — same.
- [ ] Implement `extension/resources/claude-commands/<stage>.md` mirror emit —
      byte-equivalent.

**Verification**:

- Each of the six existing surfaces emits to its on-disk path with no diff
  against the pre-feature snapshot, modulo description shortening AND per-CLI
  exclusion of the 5 Claude-only stages from `.agents/skills/`,
  `.system/skills/`, `extension/resources/copilot-prompts/`, `.github/prompts/`
  outputs.
- New surfaces (Gemini TOML, Codex `AGENTS.md`, `codex-config.toml`) are NOT yet
  emitted by the generator — the dispatch table treats those surface types as
  "deferred until 1.6".

#### Tech Phase 1.3b — Codex doctor (read-only diagnostic)

**Goal**: ship the read-only `gofer codex doctor` diagnostic. Independent of new
surface emission — operates on whatever skill tree exists on the user's machine.

**Tasks**:

- [ ] Implement `gofer codex doctor` as a Node CLI at
      `.specify/scripts/node/codex-doctor.mjs`, invokable via
      `npm run codex:doctor` and (for end users) via `npx gofer codex doctor`.
      Behaviour:
  - Read-only walk of `~/.codex/skills/` (FR-009).
  - Detect duplicate Gofer bundles (multiple SKILL.md trees with Gofer's
    canonical stage names).
  - Emit a paste-ready `[[skills.config]] path = "..." enabled = false` block
    for each duplicate path.
  - Print canonical Gofer skill set with descriptions and cumulative byte count.
  - **Never write to disk** — assertion enforced by integration test.
  - **Never emit `skills_context_budget_percent`** — repo-wide search asserts
    zero matches (FR-011).
- [ ] Update `.specify/memory/constitution.md` to document that Codex
      distribution targets `.agents/skills/` and `~/.codex/config.toml`
      overrides — NOT `.claude/skills/` (FR-010).
- [ ] Update `CLAUDE.md` to add a "Codex parity" section pointing at the doctor
      command and the `.agents/skills/` discovery path.

**Verification**:

- Integration test against a fixture polluted skill tree at
  `tests/fixtures/codex-skills-polluted/` verifies doctor command lists
  duplicates, emits valid TOML, and writes nothing.
- TOML output is parseable by `js-toml` / `@iarna/toml`.
- Constitution and CLAUDE.md text inspection confirms updated guidance (FR-010).
- Repo-wide search for `skills_context_budget_percent` returns zero matches
  (FR-011, SC-011).

#### Tech Phase 1.5 — Byte-equivalence verification gate

**Goal**: prove the existing-surface emit (1.3a) is byte-equivalent to
pre-feature output. This is the hardest gate of Work Phase 1. New surfaces (1.6)
and new CLI commands (1.7) MUST NOT execute until this gate is green on `main`.
Phase 2 also gates on this.

**Tasks**:

- [ ] Author Vitest suite
      `tests/integration/source-of-truth/byte-equivalence.spec.ts` — for each of
      the 16 stages, snapshot the pre-feature `.claude/commands/`,
      `extension/resources/copilot-prompts/`, `.github/prompts/`,
      `.agents/skills/`, `.system/skills/`,
      `extension/resources/claude-commands/` outputs; run generator; diff;
      assert empty _modulo description shortening AND per-CLI exclusion of the 5
      Claude-only stages from `.agents/skills/`, `.system/skills/`,
      `extension/resources/copilot-prompts/`, `.github/prompts/` outputs_
      (FR-002, SC-008). Comparison covers ONLY non-excluded stages on surfaces
      where the stage is included; excluded stages are asserted absent on
      excluded surfaces.
- [ ] Author Vitest suite for description byte budget — assert cumulative
      Codex-path SKILL description bytes ≤2KB (NFR-004, SC-006).
- [ ] Author integration test for `gofer codex doctor` against
      `tests/fixtures/codex-skills-polluted/` — assert read-only, asserts
      duplicate-listing correctness, asserts TOML snippet validity, asserts no
      `skills_context_budget_percent` (FR-009, FR-011, SC-003, SC-011).
- [ ] Author end-to-end test exercising every existing slash command on a
      fixture feature folder, comparing pre/post emit and pre/post stage outputs
      (FR-003, FR-004, SC-005).
- [ ] Run generator end-to-end and capture timing — assert <2s (NFR-001,
      SC-007).
- [ ] **Hook wiring inventory** — verify which hooks are wired in
      `.claude/settings.json` and update research.md / plan.md text to match
      reality. Today the file wires three hooks (UserPromptSubmit, PostToolUse,
      Stop); `session-lifecycle.mjs` is invoked separately, not through
      `.claude/settings.json`. The post-feature wiring MUST match this reality
      (or the file MUST be updated to add `session-lifecycle` if/when that
      becomes a goal).
- [ ] **Sub-agent inventory** — list `.claude/agents/*.md`, count, and confirm
      all existing agents are preserved (FR-004). The exact count is recorded in
      this plan's risk table.
- [ ] **Phase-1 gate**: all of the above MUST pass before any work on Tech Phase
      1.6 (new surfaces), Tech Phase 1.7 (new CLI commands), or Work Phase 2
      begins. Gate enforcement: CI workflow rejects PRs touching
      `.gemini/commands/`, `AGENTS.md`, `codex-config.toml`,
      `.specify/commands/gofer_plan.md`, `.specify/commands/gofer_side.md`,
      `.specify/commands/gofer_personality.md`, `.specify/templates/visuals/`,
      or `.claude/agents/visual-*-writer.md` until the byte-equivalence test is
      green on `main`.

**Verification**:

- Vitest suite green; coverage ≥80% on new generator + doctor code (Constitution
  VII).
- All 16 existing stages produce byte-equivalent output on the six existing
  surfaces (SC-008 = 100%) modulo description shortening AND per-CLI exclusion.
- Generator runtime <2s on developer laptop (SC-007).
- Doctor runs read-only on polluted fixture; produces valid TOML; emits no
  banned config keys.
- Hook wiring documentation in `research.md` and this plan now matches
  `.claude/settings.json` reality (three hooks wired in settings; any
  `session-lifecycle` invocation is documented as out-of-band).
- **Constitution re-check (post-Phase-1)**: re-evaluate Principle VIII — confirm
  net hand-edited surface area decreased (5-copy drift eliminated) even though
  file count rose; confirm all changes generated or additive.

#### Tech Phase 1.6 — Generator emit (new surfaces, gated on 1.5)

**Goal**: implement the surface-emitter dispatch for the THREE new surfaces —
Gemini TOML, Codex `AGENTS.md`/`codex-config.toml`, and the optional
`.claude-plugin/plugin.json` stub if needed for Phase 3 prep.

**MUST NOT execute until Tech Phase 1.5 byte-equivalence test is green on
`main`.** CI gate enforces this.

**Tasks**:

- [ ] **NEW**: implement Gemini TOML emit at
      `.gemini/commands/gofer/<stage>.toml` with `{{args}}` and `@{path}`
      injection syntax (FR-032).
- [ ] **NEW**: implement Codex meta-files: `AGENTS.md` at repo root and
      `codex-config.toml` template (FR-033). Per-CLI exclusion (FR-007) applied
      — Claude-only stages do not appear in either file.
- [ ] **NEW** (optional, Phase 3 prep): emit `.claude-plugin/plugin.json` stub
      if needed by `/4_gofer_tasks` planning for Phase 3.1.
- [ ] Re-run generator end-to-end; verify all NEW surfaces emit cleanly AND
      existing surfaces remain byte-equivalent (no regression introduced by the
      new emit paths).

**Verification**:

- Gemini TOML files exist at `.gemini/commands/gofer/<stage>.toml` for every
  stage with `gemini` in `surfaces:`. TOML parses with `js-toml` /
  `@iarna/toml`.
- Root `AGENTS.md` and `codex-config.toml` accumulate one entry per
  Codex-surfaced stage.
- Post-emit directory inspection: no Claude-only stage appears under
  `.agents/skills/` or `.gemini/commands/` (FR-007, SC-012).
- Re-running 1.5 byte-equivalence test still passes (no regression).

#### Tech Phase 1.7 — New CLI commands and `/gofer:*` namespace (gated on 1.5)

**Goal**: add the three new commands (`/gofer:plan`, `/gofer:side`,
`/gofer:personality`) and the namespace alias mechanism for all 16 existing
stages.

**MUST NOT execute until Tech Phase 1.5 byte-equivalence test is green on
`main`.** New commands cannot ship before existing commands are proven
byte-equivalent.

**Tasks**:

- [ ] Author `.specify/commands/gofer_plan.md` — plan-mode toggle with
      context-usage display, mirroring Codex `/plan` semantics (FR-012). This is
      the new top-level `/gofer:plan`. The `/3_gofer_plan` stage is aliased
      separately as `/gofer:plan-stage` (NOT `/gofer:plan`) to avoid the
      namespace collision — see ADR-003.
- [ ] Author `.specify/commands/gofer_side.md` — side-conversation invocation
      preserving main-thread state (FR-013).
- [ ] Author `.specify/commands/gofer_personality.md` —
      `friendly | pragmatic | none` voice switch (FR-014).
- [ ] Add the alias mechanism: each existing stage's source-of-truth YAML gets
      an `aliases: ["/gofer:<short>"]` key (e.g. `/3_gofer_plan` →
      `/gofer:plan-stage`). Generator emits both the canonical command name and
      the aliased namespaced form to surfaces that support aliasing (Claude
      command frontmatter, Gemini namespaced TOML subfolder, Copilot namespace
      prefix). FR-005.
- [ ] Author `.claude/namespaces.json` (NEW) — declares the `/gofer:*` namespace
      surface for the picker.
- [ ] Author the disambiguation ADR at
      `.specify/specs/001-cli-innovations-visuals/adr-003-gofer-plan-namespace.md`
      documenting the resolution: `/gofer:plan` is reserved for the plan-mode
      toggle (new command); the planning stage is aliased as
      `/gofer:plan-stage`.
- [ ] Add hook event `command_invocation_timing` to `.specify/scripts/hooks/`
      capturing time-from-prompt-to-stage-launch for every command invocation
      (FR-034) — emitted for both numbered and namespaced invocations so SC-004
      baseline can be measured.
- [ ] Surface queued-input awareness in the doctor command output and in
      CLAUDE.md guidance for users (FR-015 — Codex's queued-input UX is built
      into Codex itself; Gofer's responsibility is to ensure stages do not
      consume the queue silently).

**Verification**:

- Generator emits `/gofer:research`, `/gofer:specify`, `/gofer:plan-stage`,
  `/gofer:tasks`, `/gofer:implement`, `/gofer:validate`,
  `/gofer:engineering-review`, `/gofer:save`, `/gofer:stakeholder-comms`,
  `/gofer:resume`, `/gofer:tests`, `/gofer:cloud`, `/gofer:constitution`,
  `/gofer:hydrate`, `/gofer:problem-validation`, `/gofer:business-scenario` for
  the 16 existing stages PLUS the three new top-level `/gofer:plan` (plan-mode
  toggle), `/gofer:side`, and `/gofer:personality`.
- Manual smoke: `/gofer:research` and `/1_gofer_research` produce identical
  behaviour (FR-005).
- Hook log shows `command_invocation_timing` events for both numbered and
  namespaced invocations (FR-034, SC-004 baseline capture).

---

### Work Phase 2 — Persona pack visuals (gate on Work Phase 1 complete)

**Spec coverage**: FR-016 through FR-027, FR-035; NFR-002, NFR-003, NFR-008,
NFR-010; SC-001, SC-002, SC-009, SC-010; User Stories US1, US2, US3, US4.

**EnterpriseAI bindings**: IAP-001 (Tech 2.2, 2.3, 2.4, 2.6), IAP-002 (Tech
2.4).

**Gate to Work Phase 3**: persona-pack completeness check + hard-gate
enforcement at `/2_gofer_specify` (FR-016, FR-018, SC-001, SC-010).

#### Tech Phase 2.1 — Setup

**Goal**: prepare the visuals template directory, document the AI-leverage
taxonomy.

**Tasks**:

- [ ] Create directory `.specify/templates/visuals/` for persona-pack templates.
- [ ] Author `.specify/templates/visuals/AI-LEVERAGE-TAXONOMY.md` — the
      reference doc for the four-verb vocabulary (Replace / Augment / Automate /
      Observe), including the colour palette mapping (FR-018, Decision 6).
- [ ] Add a "novice guardrail" lint rule (FR-027) — every persona-pack artifact
      must open with a plain-language paragraph (**≥30 words AND ≤200 words**,
      the canonical bound used across plan/data-model/contracts) before any
      diagram.

**Verification**:

- Taxonomy doc reviewed and committed.
- Lint rule fires on a fixture template missing the plain-language preamble.

#### Tech Phase 2.2 — Templates (9 NEW persona-pack templates)

**Goal**: author the nine new templates that the visual-writer sub-agents will
consume.

**Tasks**:

- [ ] Author `.specify/templates/visuals/impact-canvas-template.md` — Mermaid
      `mindmap` of stakeholders + KPI tiles + AI-leverage Ring rendered as a
      Mermaid `pie` block (4-verb count summary aggregated from
      `value-stream-tobe.md` per FR-026; chart type is `pie`, NOT `xychart-beta`
      — see data-model.md §1.9 and sub-agent-contracts.md §1)
  - ROI band + primary persona + top-three risks (FR-016, US1).
- [ ] Author `.specify/templates/visuals/c4-context-template.md` — Mermaid
      `C4Context` with named external systems (FR-019, US3).
- [ ] Author `.specify/templates/visuals/c4-container-template.md` — Mermaid
      `C4Container` (FR-020, US3).
- [ ] Author `.specify/templates/visuals/value-stream-asis-template.md` —
      swim-lane Mermaid `flowchart LR` of current process (FR-017).
- [ ] Author `.specify/templates/visuals/value-stream-tobe-template.md` —
      swim-lane Mermaid `flowchart LR` with the **required 4-verb tagging
      schema** (every step gets exactly one of Replace / Augment / Automate /
      Observe, colour-coded). Reuses the `rect rgb()` highlight pattern from
      `extension/resources/templates/sequence-diagrams/option-spectrum.yaml`.
      (FR-018, FR-026, US1, US2, SC-010).
- [ ] Author `.specify/templates/visuals/capability-heatmap-template.md` —
      Mermaid `quadrantChart` + tabular complement listing capabilities touched
      / replaced / extended (FR-021, US4).
- [ ] Author `.specify/templates/visuals/bounded-context-template.md` — Mermaid
      `flowchart` of bounded contexts and their contracts (FR-022, US3, US4).
- [ ] Author `.specify/templates/visuals/data-model-erd-template.md` — Mermaid
      `erDiagram` (FR-023, US3).
- [ ] Author `.specify/templates/visuals/risk-heatmap-template.md` — Mermaid
      `quadrantChart` (likelihood × impact) + top-quadrant prose (FR-024, US4).
- [ ] Each template MUST include the plain-language preamble placeholder
      (FR-027).

**Verification**:

- Each template parses as Markdown and contains a valid Mermaid block.
- Mermaid blocks render under VSCode preview without additional extensions
  (NFR-008).
- Each template has the plain-language preamble placeholder (FR-027 lint rule
  passes).

#### Tech Phase 2.3 — Sub-agents (7 NEW visual-writer sub-agents)

**Goal**: author the seven sub-agents that consume Phase-2.2 templates and emit
persona-pack artifacts.

**Tasks**:

- [ ] Author `.claude/agents/visual-canvas-writer.md` — emits `impact-canvas.md`
      consuming the canvas template plus the parsed 4-verb counts from
      `value-stream-tobe.md` (FR-016, FR-026).
- [ ] Author `.claude/agents/visual-c4-writer.md` — emits `c4-context.md` in
      `/1_gofer_research` and `c4-container.md` in `/3_gofer_plan` (FR-019,
      FR-020).
- [ ] Author `.claude/agents/visual-value-stream-writer.md` — emits both
      `value-stream-asis.md` (in `/0a_problem_validation`) and
      `value-stream-tobe.md` (in `/2_gofer_specify`); enforces the 4-verb tag on
      every TO-BE step (FR-017, FR-018, SC-010).
- [ ] Author `.claude/agents/visual-heatmap-writer.md` — emits
      `capability-heatmap.md` (FR-021).
- [ ] Author `.claude/agents/visual-bounded-context-writer.md` — emits
      `bounded-context.md` (FR-022).
- [ ] Author `.claude/agents/visual-erd-writer.md` — emits `data-model-erd.md`
      (FR-023).
- [ ] Author `.claude/agents/visual-risk-writer.md` — emits `risk-heatmap.md`
      aggregating risks identified across the validation council (FR-024).

**Verification**:

- Each sub-agent file conforms to the existing `.claude/agents/` pattern
  (frontmatter + body).
- Each sub-agent's prompt instructs novice-guardrail preamble first (FR-027).
- The TO-BE writer's prompt explicitly enforces the four-verb tag schema with a
  parser-checkable format (SC-010).

#### Tech Phase 2.4 — Stage wiring (update existing stage commands)

**Goal**: update the existing source-of-truth stage commands to invoke the new
visual writers at the correct integration points. **All invocations sourced from
updated `.specify/commands/<stage>.md` — downstream surface files are emitted,
not hand-edited.**

**Tasks**:

- [ ] Update `.specify/commands/0a_problem_validation.md` to invoke
      `visual-value-stream-writer` (AS-IS) and `visual-heatmap-writer`
      (capability) (FR-017, FR-021).
- [ ] Update `.specify/commands/1_gofer_research.md` to invoke
      `visual-c4-writer` (Context) and `visual-heatmap-writer` (capability)
      (FR-019, FR-021).
- [ ] Update `.specify/commands/2_gofer_specify.md` to invoke
      `visual-canvas-writer` (**pass 1** — initial canvas; top-three risks
      heuristically pulled from `spec.md`'s NFR / Out-of-Scope sections) and
      `visual-value-stream-writer` (TO-BE), and add the **HARD GATE**:
      `/2_gofer_specify` cannot complete without `impact-canvas.md` AND
      `value-stream-tobe.md` present and parser-valid (FR-016, FR-018). See
      `contracts/sub-agent-contracts.md` §1 for the two-pass model.
- [ ] Update `.specify/commands/3_gofer_plan.md` to invoke `visual-c4-writer`
      (Container), `visual-bounded-context-writer`, `visual-erd-writer` (FR-020,
      FR-022, FR-023).
- [ ] Update `.specify/commands/4_gofer_tasks.md` to add the persona-pack
      completeness _warning_ (not gate) listing any missing artifacts (US3
      acceptance scenario 2).
- [ ] Update `.specify/commands/6_gofer_validate.md` to invoke
      `visual-risk-writer` (FR-024), then re-invoke `visual-canvas-writer` in
      **pass 2 — risk regeneration** mode (regenerates ONLY the `topThreeRisks`
      section of `impact-canvas.md` from the validation council's authoritative
      risk list; all other canvas sections preserved). Also invoke
      `business-metrics-analyzer` with the upgraded ROI `xychart-beta` template
      (FR-025). See `contracts/sub-agent-contracts.md` §1 (two-pass canvas
      model).
- [ ] Add the gate-enforcement script
      `.specify/scripts/bash/check-persona-pack.sh` — invoked at the close of
      `/2_gofer_specify` and at the start of `/3_gofer_plan`. Returns non-zero
      if the hard-gate artifacts are missing or the TO-BE 4-verb tagging fails.
- [ ] Re-run `npm run generate:commands` to emit the updated stage commands to
      all five existing CLI surfaces.

**Verification**:

- Stage commands re-emitted byte-equivalent on Phase-1 surfaces _plus_ new
  sub-agent invocations.
- Gate script exits non-zero on a fixture feature folder missing
  `impact-canvas.md` or with an untagged TO-BE step.
- Manual run on a sample feature folder produces all nine persona-pack
  artifacts.

#### Tech Phase 2.5 — Existing template upgrades

**Goal**: replace ASCII bars with real `xychart-beta` charts, and replace
text-only diagram references with real generated diagrams.

**Tasks**:

- [ ] Upgrade `extension/resources/templates/business-metrics-template.md` —
      replace the ASCII `[▓▓▓░░]` block at lines 31–34 with a Mermaid
      `xychart-beta` ROI/payback chart (FR-025).
- [ ] Upgrade `extension/resources/templates/spec-summary-template.md` — embed
      the Impact Canvas (or a slim embeddable summary thereof) in place of the
      prose-only one-pager. **Note**: the embedded canvas reflects pass-1 risk
      content at specify time and pass-2 regenerated risks after
      `/6_gofer_validate` runs (see Tech 2.4 wiring of pass-2
      `visual-canvas-writer` invocation in `/6_gofer_validate`).
- [ ] Upgrade `extension/resources/templates/stakeholder-comms-template.md` —
      replace the text-only diagram reference at lines 96–101 with an actual
      generated architecture diagram (driven by the persona-pack artifacts)
      (FR-028).

**Verification**:

- Diff confirms ASCII bars removed; `xychart-beta` block present (FR-025).
- spec-summary now embeds (or links inline) the Impact Canvas.
- stakeholder-comms template now contains a real Mermaid block, not just a text
  reference.
- All upgrades retain the plain-language preamble (FR-027 lint rule).

#### Tech Phase 2.6 — Verification & gate

**Goal**: prove every persona-pack artifact emits correctly, the hard gate
blocks `/3_gofer_plan` when artifacts are missing, and the 4-verb tagging is
enforced.

**Tasks**:

- [ ] Author golden-file Vitest tests for each of the seven visual writers —
      fixture input → expected Markdown output, with Mermaid blocks asserted to
      parse.
- [ ] Author parser test for the TO-BE 4-verb tagging — fixture input with a
      step missing a tag fails the gate; fixture with all steps tagged passes
      (SC-010).
- [ ] Author gate-enforcement integration test — `/2_gofer_specify` cannot
      complete without `impact-canvas.md` AND `value-stream-tobe.md` present
      (SC-001).
- [ ] Author cross-artifact consistency test — Impact Canvas AI-leverage Ring
      counts match the parsed counts from `value-stream-tobe.md` (FR-026).
- [ ] Author **two-pass canvas regeneration test** — pass 1 (initial via
      `/2_gofer_specify`) emits `impact-canvas.md` with risks pulled from
      `spec.md` NFR/Out-of-Scope; pass 2 (re-invoked from `/6_gofer_validate`)
      regenerates ONLY the `topThreeRisks` section using validation-council
      outputs; every other canvas section is byte-equivalent across the two
      passes.
- [ ] Author NFR-010 fallback test — fixture with an intentionally malformed
      `xychart-beta` block falls back to a tabular text representation; pipeline
      does not block.
- [ ] Author NFR-002 render-performance test — Mermaid render under 5s on
      representative artifact size.
- [ ] Author NFR-003 size test — every persona-pack artifact ≤2,000 lines /
      ≤200KB.
- [ ] Re-verify FR-035 — pipeline run with `competitiveAnalysisEnabled: false`
      still produces `market-analysis.md` and `business-analysis.md`.

**Verification**:

- All Vitest suites green; coverage ≥80% on visual writers.
- Hard-gate test confirms `/2_gofer_specify` cannot proceed without artifacts
  (SC-001).
- TO-BE tagging coverage 100% (SC-010).
- Persona-pack artifacts auto-generated count ≥4 of 6 on a sample feature
  (SC-002).
- **Constitution re-check (post-Phase-2)**: TDD gate satisfied (Principle I),
  test coverage ≥80% (Principle VII), no security regressions (Principle V).

---

### Work Phase 3 — Packaging (gate on Work Phase 2 complete)

**Spec coverage**: FR-028 through FR-033; NFR-006, NFR-007, NFR-009; SC-002
(closure of stakeholder distribution); User Story US7.

**EnterpriseAI bindings**: IAP-002 (Tech 3.2), IAP-003 (Tech 3.1, 3.3).

#### Tech Phase 3.1 — Plugin/extension manifests

**Goal**: ship a Claude Code plugin manifest, a Gemini CLI extension manifest,
and a Codex `AGENTS.md` + `codex-config.toml` bundle.

**Tasks**:

- [ ] Author `.claude-plugin/plugin.json` — Claude Code plugin manifest
      describing every emitted command (FR-031). Validate against the Claude
      plugin schema. All descriptions ≤140 chars (re-uses Phase-1
      source-of-truth descriptions).
- [ ] Author `extension/resources/claude-plugin-manifest.json` — bundled
      manifest for VSCode-extension-driven plugin install.
- [ ] Author `.gemini/extension.json` — Gemini CLI extension manifest describing
      the `.gemini/commands/gofer/` TOML tree (FR-032).
- [ ] Author root `AGENTS.md` — Codex CLI parity scaffold (FR-033).
- [ ] Author root `codex-config.toml` template — paste-in for
      `~/.codex/config.toml` containing `[[skills.config]]` entries pointing at
      the canonical `.agents/skills/` paths.
- [ ] Re-run generator end-to-end; verify all manifests emit cleanly.

**Verification**:

- Claude plugin manifest validates against the public schema.
- Gemini extension installs cleanly and `/gofer:research` resolves.
- Codex picks up Gofer commands without budget warning given a clean fixture
  environment (SC-003).
- All manifests re-deterministic on re-emit (NFR-011).

#### Tech Phase 3.2 — Stakeholder pack assembler

**Goal**: extend `/7a_stakeholder_comms` to compose all persona-pack artifacts
into a single `stakeholder-pack.md` with optional `mmdc` PNG/SVG export and
optional Marp deck.

**Tasks**:

- [ ] Update `.specify/commands/7a_stakeholder_comms.md` to invoke comms-writer
      (existing) plus the new assembler logic. Assembler walks the feature
      folder, collects persona-pack artifacts in deterministic order, and
      inlines them into `stakeholder-pack.md` (FR-028).
- [ ] Author `.specify/scripts/node/mermaid-export.mjs` — optional `mmdc`
      invocation for PNG/SVG export. MUST run with default Chrome sandbox
      (NFR-006). MUST fall back gracefully when `mmdc` is not installed
      (FR-029).
- [ ] Add Marp render step (already referenced in current
      `stakeholder-comms-template.md:67-118`) — optional deck render from
      `stakeholder-pack.md` (FR-030).
- [ ] Re-emit stage commands and templates.

**Verification**:

- `stakeholder-pack.md` references and inlines every persona-pack artifact in
  deterministic order (FR-028, US7).
- With `mmdc` installed: PNG/SVG outputs produced for each Mermaid block.
- Without `mmdc`: pipeline produces `stakeholder-pack.md` plus a single visible
  warning; does not block.
- Marp opt-in render produces a deck on success; does not block on failure.

#### Tech Phase 3.3 — Marketplace decision

**Goal**: resolve the two open questions captured in proposal-review.md.

**Tasks**:

- [ ] **Marketplace destination**: decide between
      `anthropics/claude-plugins-official` vs a community marketplace first.
      Document the decision as an ADR at
      `.specify/specs/001-cli-innovations-visuals/adr-001-marketplace.md`.
- [ ] **`mmdc` runtime**: decide between local opt-in dev dependency vs GitHub
      Action. Document as ADR at
      `.specify/specs/001-cli-innovations-visuals/adr-002-mermaid-export.md`.
- [ ] Update Phase 3 packaging tasks based on the ADR outcomes.

**Verification**:

- Both ADRs committed.
- No NEEDS CLARIFICATION remains.

#### Tech Phase 3.4 — End-to-end verification

**Goal**: prove the complete pipeline on a sample feature folder produces every
artifact and that the doctor command works end-to-end on a polluted skill tree.

**Tasks**:

- [ ] Run the full Gofer pipeline (`/0_business_scenario` →
      `/7a_stakeholder_comms`) on a sample feature folder; capture all
      persona-pack artifacts and the stakeholder pack.
- [ ] Run `gofer codex doctor` on a fixture polluted skill tree; verify output
      includes the disable snippet for duplicates and warns the user.
- [ ] Capture command-picker time-to-stage hook log and compare to pre-feature
      baseline; assert ≥50% reduction (SC-004).
- [ ] Run a non-developer reviewer acceptance test on the Impact Canvas: reader
      identifies all four AI-leverage verb counts, ROI band, primary persona,
      top-three risks within 60 seconds (SC-009).
- [ ] Confirm Phase-3 NFR-009 — runtime use of the published
      plugin/extension/skills works fully offline.

**Verification**:

- All persona-pack artifacts present on the sample feature folder.
- Doctor produces correct output on polluted fixture.
- SC-004 ≥50% reduction confirmed.
- SC-009 acceptance test passed.

---

## File Structure

> Tree of every NEW, MODIFIED, and PRESERVED file referenced by this plan.
> Grouped by Work Phase. Files marked **NEW** do not exist on `main` today.
> Files marked **MODIFIED** exist and are updated by this feature. Files with no
> marker are preserved as-is and called out for traceability of the
> no-regression invariant.

### Work Phase 1 — Source-of-truth, generator, doctor, namespace

```text
# Source-of-truth (NEW directory, 16 stages + 3 new commands)
.specify/commands/                                            NEW
├── README.md                                                 NEW
├── 0_business_scenario.md                                    NEW (migrated from .claude/commands/)
├── 0a_problem_validation.md                                  NEW (migrated)
├── 1_gofer_research.md                                       NEW (migrated)
├── 2_gofer_specify.md                                        NEW (migrated)
├── 3_gofer_plan.md                                           NEW (migrated)
├── 4_gofer_tasks.md                                          NEW (migrated)
├── 5_gofer_implement.md                                      NEW (migrated)
├── 6_gofer_validate.md                                       NEW (migrated)
├── 6a_gofer_engineering_review.md                            NEW (migrated)
├── 7_gofer_save.md                                           NEW (migrated)
├── 7a_stakeholder_comms.md                                   NEW (migrated)
├── 8_gofer_resume.md                                         NEW (migrated)
├── 9_gofer_tests.md                                          NEW (migrated)
├── 10_gofer_cloud.md                                         NEW (migrated)
├── gofer_constitution.md                                     NEW (migrated)
├── gofer_hydrate.md                                          NEW (migrated)
├── gofer_plan.md                                             NEW (FR-012; Tech 1.7 — top-level /gofer:plan plan-mode toggle. See ADR-003.)
├── gofer_side.md                                             NEW (FR-013; Tech 1.7)
└── gofer_personality.md                                      NEW (FR-014; Tech 1.7)

# Generator + doctor + schemas
.specify/scripts/node/
├── generate-commands.mjs                                     NEW
├── codex-doctor.mjs                                          NEW
└── schemas/
    └── stage-command.schema.json                             NEW

# Namespace + hooks + scripts
.claude/namespaces.json                                       NEW
.specify/scripts/hooks/command-invocation-timing.mjs          NEW (FR-034)
.specify/scripts/bash/check-persona-pack.sh                   NEW (Phase 2 helper, scaffolded in Phase 1)

# Updated meta
.specify/memory/constitution.md                               MODIFIED (FR-010 — document .agents/skills/ discovery)
CLAUDE.md                                                     MODIFIED (Codex parity guidance)
package.json                                                  MODIFIED (npm scripts + js-yaml dep)

# Generated emit targets — Tech Phase 1.3a, EXISTING surfaces, verified
# byte-equivalent at the Tech Phase 1.5 gate (modulo description shortening
# AND per-CLI exclusion of the 5 Claude-only stages on excluded surfaces).
.claude/commands/<stage>.md                                   GENERATED (16 stages, byte-equivalent)
extension/resources/claude-commands/<stage>.md                GENERATED (mirror)
extension/resources/copilot-prompts/<stage>.prompt.md         GENERATED
.github/prompts/<stage>.prompt.md                             GENERATED
.agents/skills/<stage>/SKILL.md                               GENERATED (flat depth ≤2, FR-008)
.system/skills/<stage>/SKILL.md                               GENERATED

# Generated emit targets — Tech Phase 1.6, NEW surfaces (gated on 1.5)
# MUST NOT execute until Tech Phase 1.5 byte-equivalence gate is green on `main`.
.gemini/commands/gofer/<stage>.toml                           GENERATED (FR-032; Tech 1.6)
AGENTS.md                                                     GENERATED (FR-033; Tech 1.6)
codex-config.toml                                             GENERATED (FR-033; Tech 1.6)
.claude-plugin/plugin.json                                    GENERATED (Phase 3 prep stub; Tech 1.6 optional, finalised in Tech 3.1)
# Note: source-of-truth authoring for `/gofer:plan` (top-level plan-mode
# toggle; FR-012), `/gofer:side` (FR-013), and `/gofer:personality`
# (FR-014) is Tech Phase 1.7 — see entries above under
# `.specify/commands/gofer_plan.md`, `.specify/commands/gofer_side.md`,
# `.specify/commands/gofer_personality.md`. Per ADR-003, the
# `/3_gofer_plan` stage is aliased as `/gofer:plan-stage` (NOT
# `/gofer:plan`) so the alias and the new toggle do not collide.

# Test fixtures + tests
tests/fixtures/codex-skills-polluted/                         NEW
tests/integration/source-of-truth/byte-equivalence.spec.ts    NEW
tests/integration/source-of-truth/codex-doctor.spec.ts        NEW
tests/integration/source-of-truth/description-budget.spec.ts  NEW (NFR-004)
tests/integration/source-of-truth/regression-existing-stages.spec.ts NEW (FR-003, FR-004)

# Preserved (no-regression invariant)
.claude/agents/*.md                                           PRESERVED (all 37 existing sub-agents per `ls .claude/agents/*.md`)
.specify/scripts/bash/*.sh                                    PRESERVED
.specify/scripts/hooks/*.mjs                                  PRESERVED
.claude/settings.json                                         PRESERVED
extension/resources/templates/*                               PRESERVED (3 upgraded in Phase 2.5)
```

### Work Phase 2 — Persona-pack visuals

```text
# NEW templates
.specify/templates/visuals/                                   NEW
├── AI-LEVERAGE-TAXONOMY.md                                   NEW (Decision 6)
├── impact-canvas-template.md                                 NEW (FR-016)
├── c4-context-template.md                                    NEW (FR-019)
├── c4-container-template.md                                  NEW (FR-020)
├── value-stream-asis-template.md                             NEW (FR-017)
├── value-stream-tobe-template.md                             NEW (FR-018)
├── capability-heatmap-template.md                            NEW (FR-021)
├── bounded-context-template.md                               NEW (FR-022)
├── data-model-erd-template.md                                NEW (FR-023)
└── risk-heatmap-template.md                                  NEW (FR-024)

# NEW sub-agents
.claude/agents/visual-canvas-writer.md                        NEW
.claude/agents/visual-c4-writer.md                            NEW
.claude/agents/visual-value-stream-writer.md                  NEW
.claude/agents/visual-heatmap-writer.md                       NEW
.claude/agents/visual-bounded-context-writer.md               NEW
.claude/agents/visual-erd-writer.md                           NEW
.claude/agents/visual-risk-writer.md                          NEW

# MODIFIED stage source-of-truth (wiring + gate)
.specify/commands/0a_problem_validation.md                    MODIFIED (FR-017, FR-021)
.specify/commands/1_gofer_research.md                         MODIFIED (FR-019, FR-021)
.specify/commands/2_gofer_specify.md                          MODIFIED (FR-016, FR-018, hard gate)
.specify/commands/3_gofer_plan.md                             MODIFIED (FR-020, FR-022, FR-023)
.specify/commands/4_gofer_tasks.md                            MODIFIED (persona-pack completeness warn)
.specify/commands/6_gofer_validate.md                         MODIFIED (FR-024, FR-025)

# MODIFIED existing templates (Phase 2.5 upgrades)
extension/resources/templates/business-metrics-template.md    MODIFIED (FR-025 — xychart-beta)
extension/resources/templates/spec-summary-template.md        MODIFIED (embed Impact Canvas)
extension/resources/templates/stakeholder-comms-template.md   MODIFIED (real generated diagrams)

# Tests
tests/integration/visuals/canvas-writer.spec.ts               NEW (golden-file)
tests/integration/visuals/c4-writer.spec.ts                   NEW
tests/integration/visuals/value-stream-writer.spec.ts         NEW (4-verb tagging)
tests/integration/visuals/heatmap-writer.spec.ts              NEW
tests/integration/visuals/bounded-context-writer.spec.ts      NEW
tests/integration/visuals/erd-writer.spec.ts                  NEW
tests/integration/visuals/risk-writer.spec.ts                 NEW
tests/integration/visuals/persona-pack-gate.spec.ts           NEW (SC-001, SC-010)
tests/integration/visuals/cross-artifact-consistency.spec.ts  NEW (FR-026)
tests/integration/visuals/mermaid-fallback.spec.ts            NEW (NFR-010)
```

### Work Phase 3 — Packaging

```text
# Manifests
.claude-plugin/plugin.json                                    NEW (FR-031)
extension/resources/claude-plugin-manifest.json               NEW
.gemini/extension.json                                        NEW (FR-032)

# Stakeholder pack assembler + optional render
.specify/scripts/node/mermaid-export.mjs                      NEW (FR-029, NFR-006)
.specify/commands/7a_stakeholder_comms.md                     MODIFIED (FR-028, FR-030)

# ADRs (Phase 3.3)
.specify/specs/001-cli-innovations-visuals/adr-001-marketplace.md         NEW
.specify/specs/001-cli-innovations-visuals/adr-002-mermaid-export.md      NEW
.specify/specs/001-cli-innovations-visuals/adr-003-gofer-plan-namespace.md NEW (Tech 1.7 — namespace collision resolution)

# Tests
tests/integration/packaging/claude-plugin-manifest.spec.ts    NEW
tests/integration/packaging/gemini-extension.spec.ts          NEW
tests/integration/packaging/codex-bundle.spec.ts              NEW
tests/integration/packaging/stakeholder-pack-assembler.spec.ts NEW (FR-028, US7)
tests/integration/packaging/end-to-end-pipeline.spec.ts       NEW (Tech Phase 3.4)
```

---

## Risk Assessment

| Risk                                                                                                                                                                                                                                         | Impact   | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Byte-equivalence drift** during source-of-truth migration — generator emits something subtly different from current `.claude/commands/<stage>.md` (e.g., trailing newline, YAML quoting, indentation). Could ship an invisible regression. | **HIGH** | Tech Phase 1.5 byte-equivalence test suite (FR-002, SC-008) is the gate. CI rejects PRs touching Phase-2 files until the diff suite is green on `main`. Pre-feature snapshot captured; iterate generator until diff is empty _modulo description shortening_.                                                                                                                                                                  |
| **Mermaid beta-feature regression** — `xychart-beta`, `quadrantChart`, C4 are beta and may break across Mermaid releases.                                                                                                                    | Med      | NFR-010 mandates tabular fallback. Tech Phase 2.6 Mermaid-fallback test (`mermaid-fallback.spec.ts`) asserts pipeline does not block when a beta construct fails to parse. Mermaid version pinned in package.json.                                                                                                                                                                                                             |
| **`mmdc` Chrome dependency** — `@mermaid-js/mermaid-cli` requires Chrome and may fail on minimal CI containers / Windows.                                                                                                                    | Med      | `mmdc` is OPTIONAL (FR-029); pipeline produces `stakeholder-pack.md` without rendered images on absence. ADR-002 in Tech Phase 3.3 decides between local dev dep and GitHub Action. NFR-006 enforces default Chrome sandbox (no `--no-sandbox`).                                                                                                                                                                               |
| **Description budget creep** — descriptions edge over 140 chars after a few stages migrate, blowing past the 2KB cumulative budget on Codex paths.                                                                                           | Med      | FR-006 enforces ≤140-char per-description at emit time (generator refuses to emit). NFR-004 / SC-006 enforce cumulative ≤2KB measured by `description-budget.spec.ts` in CI. Description shortening is an explicit modulo of FR-002.                                                                                                                                                                                           |
| **Codex breaking changes between versions** — Codex CLI's skill discovery / config schema may change after April 2026, breaking the doctor command or the `codex-config.toml` template.                                                      | Med      | Codex doctor is read-only — even a Codex-side schema break cannot corrupt user state. Doctor output references the config keys from the [official Codex config reference](https://developers.openai.com/codex/config-reference); no community-recommended keys (FR-011). Manifest schemas pinned in repo so a Codex update produces a clear test failure rather than silent breakage.                                          |
| **Cross-CLI surface drift** — generator gets out of sync with one CLI's evolving prompt/command format (e.g., Gemini changes TOML semantics, Copilot changes prompt frontmatter).                                                            | Med      | Source-of-truth + generator is the _anti-drift_ mechanism: a CLI-specific format change updates one emit function, not 16 hand-edited files. Each CLI emit target has a dedicated integration test.                                                                                                                                                                                                                            |
| **Hard-gate false positives** at `/2_gofer_specify` — gate logic mis-detects a valid Impact Canvas as missing/malformed and blocks the operator.                                                                                             | Low–Med  | Gate enforced by `check-persona-pack.sh` with a clear remediation prompt naming the exact missing artifact (Edge Case in spec). Tech Phase 2.6 gate-enforcement test (`persona-pack-gate.spec.ts`) covers happy path and three malformed-input cases.                                                                                                                                                                          |
| **`/gofer:plan` namespace collision** — proposal adds a top-level `/gofer:plan` (Codex /plan-mode) while `/3_gofer_plan` would naturally alias to `/gofer:plan` too.                                                                         | Resolved | **ADR-003** (`adr-003-gofer-plan-namespace.md`, authored in Tech Phase 1.7) records the single resolution: `/gofer:plan` is the new plan-mode toggle (FR-012) — it is NOT an alias for `/3_gofer_plan`. The planning stage's `aliases:` frontmatter entry is `plan-stage`, emitting as `/gofer:plan-stage`. Generator validates aliases are unique at emit time and refuses any other planning-stage alias on the `plan` slot. |
| **Sub-agent count documentation** — `.claude/agents/*.md` glob returns 37 (canonical count). spec.md and research.md text says "36" (predates one agent's addition).                                                                         | Low      | Plan now records 37 inline. Tech Phase 1.5 inventory task asserts the count programmatically and reconciles spec/research text in the post-1.5 documentation pass. The FR-004 gate is "all preserved" regardless of headcount.                                                                                                                                                                                                 |
| **Hand-edits leak into emitted files** — a contributor edits `.claude/commands/<stage>.md` directly instead of `.specify/commands/<stage>.md`.                                                                                               | Med      | Edge-case in spec: generator MUST refuse to overwrite without `--force-emit` and MUST log the divergence. Tech Phase 1.3a implements this guard for existing surfaces (and 1.6 for new surfaces). CI emit check would also catch the divergence.                                                                                                                                                                               |

**HIGH risk count: 1** (byte-equivalence drift) — fully mitigated by the gating
Vitest suite that is itself the Phase-1 → Phase-2 hand-off contract.

---

## Spec Traceability

### User Story Coverage

| Story   | Title                                                    | Plan Coverage                                                                                                                                                                                                                  | Status  |
| ------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| **US1** | Strategy consultant reads the spec on one page           | Tech 2.2 (impact-canvas-template), 2.3 (visual-canvas-writer, visual-value-stream-writer), 2.4 (`/2_gofer_specify` hard gate), 2.6 (cross-artifact consistency)                                                                | COVERED |
| **US2** | Business owner approves change without dev jargon        | Tech 2.1 (taxonomy + novice-guardrail lint), 2.2 (TO-BE template + plain-language preamble), 2.3 (visual-value-stream-writer), 2.6 (TO-BE 4-verb gate, SC-010)                                                                 | COVERED |
| **US3** | Developer implements with precise architectural context  | Tech 2.2 (c4-container, bounded-context, ERD templates), 2.3 (visual-c4-writer, visual-bounded-context-writer, visual-erd-writer), 2.4 (`/3_gofer_plan` wiring), 2.4 (`/4_gofer_tasks` completeness warning)                   | COVERED |
| **US4** | Enterprise architect maps capabilities and contexts      | Tech 2.2 (capability-heatmap, bounded-context, risk-heatmap templates), 2.3 (visual-heatmap-writer, visual-bounded-context-writer, visual-risk-writer), 2.4 (`/1_gofer_research`, `/3_gofer_plan`, `/6_gofer_validate` wiring) | COVERED |
| **US5** | Pipeline operator triggers stages without numbered names | Tech 1.6 (Gemini TOML, Codex AGENTS.md — gated on 1.5), 1.7 (`/gofer:*` namespace, `/gofer:plan`, `/gofer:side`, `/gofer:personality`, hook timing — gated on 1.5)                                                             | COVERED |
| **US6** | Codex user with too many skills recovers environment     | Tech 1.2 (description budget enforcement), 1.3a (per-CLI exclusion, flat tree on existing surfaces), 1.3b (`gofer codex doctor`, constitution update), 1.5 (doctor integration test on polluted fixture)                       | COVERED |
| **US7** | Stakeholder pack assembled for executive distribution    | Tech 3.1 (manifests), 3.2 (assembler + optional `mmdc` + Marp), 3.4 (end-to-end test)                                                                                                                                          | COVERED |
| **US8** | Operator queues follow-on work while a stage runs        | Tech 1.7 (queued-input awareness in CLAUDE.md guidance + hook contract; FR-015 noted as Codex-native UX, Gofer's role is non-interference)                                                                                     | COVERED |

**US coverage: 8/8 (100%).**

### Functional Requirement Coverage

| FR     | Title                                                                                                                                                                                                            | Plan Coverage                                                                                                                                                            | Status  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| FR-001 | Source-of-truth canonical files                                                                                                                                                                                  | Tech 1.1 (scaffold), 1.2 (migrate 16 stages)                                                                                                                             | COVERED |
| FR-002 | Byte-equivalent reproduction (modulo description shortening AND per-CLI exclusion of 5 Claude-only stages from `.agents/skills/`, `.system/skills/`, `extension/resources/copilot-prompts/`, `.github/prompts/`) | Tech 1.2 (iterate to empty diff on non-excluded stages), 1.3a (existing-surface emit), 1.5 (gate suite)                                                                  | COVERED |
| FR-003 | Existing slash commands work at parity                                                                                                                                                                           | Tech 1.5 (regression-existing-stages.spec.ts)                                                                                                                            | COVERED |
| FR-004 | All sub-agents/hooks/scripts/templates preserved                                                                                                                                                                 | Tech 1.5 (regression suite + inventory)                                                                                                                                  | COVERED |
| FR-005 | Additive `/gofer:*` namespace alias                                                                                                                                                                              | Tech 1.7 (alias mechanism, namespaces.json)                                                                                                                              | COVERED |
| FR-006 | Descriptions ≤140 chars                                                                                                                                                                                          | Tech 1.1 (schema validator), 1.5 (description-budget.spec.ts)                                                                                                            | COVERED |
| FR-007 | Per-CLI inclusion/exclusion                                                                                                                                                                                      | Tech 1.3a (existing-surface emitter exclusion), 1.6 (new-surface exclusion)                                                                                              | COVERED |
| FR-008 | Flat non-tenanted Codex tree                                                                                                                                                                                     | Tech 1.3a (`.agents/skills/` emit at depth ≤2 on existing surface)                                                                                                       | COVERED |
| FR-009 | `gofer codex doctor` read-only                                                                                                                                                                                   | Tech 1.3b (doctor implementation), 1.5 (read-only integration test)                                                                                                      | COVERED |
| FR-010 | Constitution documents `.agents/skills/` discovery                                                                                                                                                               | Tech 1.3b (constitution update task)                                                                                                                                     | COVERED |
| FR-011 | No `skills_context_budget_percent` reference                                                                                                                                                                     | Tech 1.3b + 1.5 (repo-wide search assertion)                                                                                                                             | COVERED |
| FR-012 | `/gofer:plan` plan-mode toggle (new top-level command)                                                                                                                                                           | Tech 1.7 (gofer_plan.md authoring; gated on 1.5)                                                                                                                         | COVERED |
| FR-013 | `/gofer:side` side-conversation                                                                                                                                                                                  | Tech 1.7 (gofer_side.md authoring; gated on 1.5)                                                                                                                         | COVERED |
| FR-014 | `/gofer:personality` voice switch                                                                                                                                                                                | Tech 1.7 (gofer_personality.md authoring; gated on 1.5)                                                                                                                  | COVERED |
| FR-015 | Queued-input awareness                                                                                                                                                                                           | Tech 1.7 (CLAUDE.md guidance + hook contract)                                                                                                                            | COVERED |
| FR-016 | Impact Canvas hard gate                                                                                                                                                                                          | Tech 2.2 (template), 2.3 (writer), 2.4 (wiring + gate), 2.6 (gate test)                                                                                                  | COVERED |
| FR-017 | AS-IS value stream                                                                                                                                                                                               | Tech 2.2 (template), 2.3 (writer), 2.4 (wiring)                                                                                                                          | COVERED |
| FR-018 | TO-BE 4-verb tagged value stream (hard gate)                                                                                                                                                                     | Tech 2.1 (taxonomy doc), 2.2 (template), 2.3 (writer), 2.4 (wiring + gate), 2.6 (tagging test, SC-010)                                                                   | COVERED |
| FR-019 | C4 Context                                                                                                                                                                                                       | Tech 2.2 (template), 2.3 (writer), 2.4 (`/1_gofer_research`)                                                                                                             | COVERED |
| FR-020 | C4 Container                                                                                                                                                                                                     | Tech 2.2 (template), 2.3 (writer), 2.4 (`/3_gofer_plan`)                                                                                                                 | COVERED |
| FR-021 | Capability heatmap                                                                                                                                                                                               | Tech 2.2 (template), 2.3 (writer), 2.4 (`/0a_problem_validation`, `/1_gofer_research`)                                                                                   | COVERED |
| FR-022 | Bounded-context map                                                                                                                                                                                              | Tech 2.2 (template), 2.3 (writer), 2.4 (`/3_gofer_plan`)                                                                                                                 | COVERED |
| FR-023 | ERD                                                                                                                                                                                                              | Tech 2.2 (template), 2.3 (writer), 2.4 (`/3_gofer_plan`)                                                                                                                 | COVERED |
| FR-024 | Risk heatmap                                                                                                                                                                                                     | Tech 2.2 (template), 2.3 (writer), 2.4 (`/6_gofer_validate` invokes `visual-risk-writer` THEN re-invokes `visual-canvas-writer` in pass-2 risk-regeneration mode)        | COVERED |
| FR-025 | ROI `xychart-beta` (replace ASCII)                                                                                                                                                                               | Tech 2.5 (business-metrics + spec-summary upgrades)                                                                                                                      | COVERED |
| FR-026 | Canvas AI-leverage Ring sourced from TO-BE (rendered as Mermaid `pie`)                                                                                                                                           | Tech 2.3 (canvas writer parses TO-BE; pass-1 + pass-2 model documented in sub-agent-contracts.md §1), 2.6 (cross-artifact consistency test + two-pass regeneration test) | COVERED |
| FR-027 | Plain-language preamble before any diagram (≥30 words AND ≤200 words — canonical bound)                                                                                                                          | Tech 2.1 (lint rule with word-count check), 2.2 (each template includes preamble within bounds), 2.3 (sub-agent prompts enforce per Universal-1)                         | COVERED |
| FR-028 | `/7a_stakeholder_comms` assembles stakeholder pack                                                                                                                                                               | Tech 3.2 (assembler)                                                                                                                                                     | COVERED |
| FR-029 | Optional `mmdc` PNG/SVG render                                                                                                                                                                                   | Tech 3.2 (mermaid-export.mjs, NFR-006 sandbox)                                                                                                                           | COVERED |
| FR-030 | Optional Marp deck                                                                                                                                                                                               | Tech 3.2 (Marp render step)                                                                                                                                              | COVERED |
| FR-031 | Claude Code plugin manifest                                                                                                                                                                                      | Tech 3.1 (.claude-plugin/plugin.json)                                                                                                                                    | COVERED |
| FR-032 | Gemini CLI extension manifest + TOML                                                                                                                                                                             | Tech 1.6 (TOML emit; gated on 1.5), 3.1 (.gemini/extension.json)                                                                                                         | COVERED |
| FR-033 | Codex AGENTS.md + codex-config.toml                                                                                                                                                                              | Tech 1.6 (emit; gated on 1.5), 3.1 (manifest scaffolding)                                                                                                                | COVERED |
| FR-034 | Hook event for time-from-prompt-to-stage-launch                                                                                                                                                                  | Tech 1.7 (command-invocation-timing.mjs; gated on 1.5)                                                                                                                   | COVERED |
| FR-035 | market-analysis + business-analysis always emitted                                                                                                                                                               | Tech 2.6 (FR-035 re-verify test)                                                                                                                                         | COVERED |

**FR coverage: 35/35 (100%).**

### Non-Functional Requirement Coverage

| NFR     | Title                                     | Plan Coverage                                                                          | Status  |
| ------- | ----------------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| NFR-001 | Generator <2s                             | Tech 1.5 (timing assertion, SC-007)                                                    | COVERED |
| NFR-002 | Mermaid render <5s                        | Tech 2.6 (render-performance test)                                                     | COVERED |
| NFR-003 | Persona-pack ≤2,000 lines / ≤200KB        | Tech 2.6 (size test)                                                                   | COVERED |
| NFR-004 | Cumulative description bytes ≤2KB         | Tech 1.2 + 1.5 (description-budget.spec.ts, SC-006)                                    | COVERED |
| NFR-005 | No secrets in templates                   | Tech 2.1 (lint rule) + Constitution Principle V                                        | COVERED |
| NFR-006 | `mmdc` default Chrome sandbox             | Tech 3.2 (no `--no-sandbox` flag, asserted in test)                                    | COVERED |
| NFR-007 | Markdown-first / four-CLI parity          | Tech 1.3a + 1.6 (all surfaces emit Markdown), Tech 2.2 (every template Markdown-first) | COVERED |
| NFR-008 | VSCode preview renders without extras     | Tech 2.6 (manual + automated render check)                                             | COVERED |
| NFR-009 | Phases 1–2 fully offline; runtime offline | Tech 1.1–2.6 (no network calls), Tech 3.4 (offline runtime check)                      | COVERED |
| NFR-010 | Beta-construct fallback to tabular        | Tech 2.6 (mermaid-fallback.spec.ts)                                                    | COVERED |
| NFR-011 | Determinism on re-emit                    | Tech 1.1 (determinism check), 1.5 (re-emit byte-identical)                             | COVERED |

**NFR coverage: 11/11 (100%).**

### Success Criteria Coverage

| SC     | Metric                                                      | Plan Coverage                                           | Status  |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------- | ------- |
| SC-001 | 100% features produce impact-canvas.md before /3_gofer_plan | Tech 2.4 (hard gate), 2.6 (gate test)                   | COVERED |
| SC-002 | ≥4 of 6 visuals auto-generated                              | Tech 2.4 (6+ writers wired), 3.4 (sample run)           | COVERED |
| SC-003 | Codex budget warning eliminated post-cleanup                | Tech 1.3b (doctor), 3.4 (end-to-end fixture)            | COVERED |
| SC-004 | ≥50% reduction in time-to-stage                             | Tech 1.7 (timing hook), 3.4 (baseline comparison)       | COVERED |
| SC-005 | 0 regressions in existing slash commands                    | Tech 1.5 (regression suite)                             | COVERED |
| SC-006 | Cumulative description bytes ≤2KB                           | Tech 1.5 (description-budget.spec.ts)                   | COVERED |
| SC-007 | Generator runtime <2s                                       | Tech 1.5 (timing assertion)                             | COVERED |
| SC-008 | 100% byte-equivalent reproduction                           | Tech 1.5 (byte-equivalence.spec.ts)                     | COVERED |
| SC-009 | Impact Canvas readable in 60s                               | Tech 3.4 (acceptance test with non-developer reviewer)  | COVERED |
| SC-010 | 100% TO-BE steps tagged with one verb                       | Tech 2.6 (4-verb tagging test)                          | COVERED |
| SC-011 | 0 `skills_context_budget_percent` references                | Tech 1.5 (repo-wide search assertion)                   | COVERED |
| SC-012 | 0 Claude-only stages in Codex/Gemini paths                  | Tech 1.3a + 1.6 (post-emit inspection), 1.5 (assertion) | COVERED |

**SC coverage: 12/12 (100%).**

---

## Complexity Tracking

| Violation                                                                                                                                                                                                    | Why Needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Principle VIII — Minimal Necessary Changes**: feature touches a large file count (16 stage commands × 8 emit surfaces, 9 new templates, 7 new sub-agents, 3 new commands, 3 new manifests, 12+ new tests). | The whole point of the source-of-truth generator is to _reduce_ hand-edited surface area: today 5+ copies of every command are hand-edited; after this feature 1 source-of-truth file per command is hand-edited and the rest are generated. Net hand-edit count drops, even though file count rises. The visual artifacts and packaging are explicit FRs (FR-016 through FR-033) that close the headline complaint of the feature; deferring them violates the spec, not Principle VIII. | (a) Defer Phase 2 — rejected by spec recommendation 1; (b) Defer Phase 3 packaging — rejected by FR-031/032/033 and the proposal-review approval; (c) Hand-sync new commands like the existing 16 — rejected because it compounds the very 5-copy drift the source-of-truth generator exists to eliminate. |

---

## Open Questions / Resolved Unknowns

All open questions from research.md and proposal-review.md are resolved in this
plan or scheduled for resolution by an explicit Tech-Phase task:

- **Source-of-truth format** → resolved (Assumption 5, plan Tech 1.1 schema):
  YAML frontmatter + Markdown body.
- **`/gofer:` rename vs alias** → resolved (FR-005, Tech 1.7): additive alias
  only, numbered stages retained.
- **Phase order** → resolved (Assumption 6): strict 1 → 2 → 3.
- **AI-leverage taxonomy prescriptive vs freeform** → resolved (Assumption 7,
  FR-018, FR-026): enforced 4 verbs.
- **Marketplace destination** → scheduled in Tech 3.3 (ADR-001).
- **`mmdc` local dev dep vs GitHub Action** → scheduled in Tech 3.3 (ADR-002).

**No NEEDS CLARIFICATION remaining.**

---

## Next Step

Run `/4_gofer_tasks` to generate `tasks.md` from this plan. Tasks must be
grouped by Work Phase (1 → 2 → 3) and within each Work Phase ordered by Tech
Phase (e.g., 1.1 → 1.2 → 1.3 → 1.4 → 1.5). The Work Phase 1 → 2 gate
(byte-equivalence) and Work Phase 2 → 3 gate (persona-pack hard gate) MUST be
reflected as explicit task-level dependencies.
