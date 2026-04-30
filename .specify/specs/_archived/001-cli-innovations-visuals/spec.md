---
id: 001-cli-innovations-visuals
title: 'CLI Innovations + Multi-Persona Visual Artifacts'
status: draft
created: 2026-04-25
updated: 2026-04-25
author: Claude
workflowProfile: enterpriseai
---

# Feature Specification: CLI Innovations + Multi-Persona Visual Artifacts

**Feature Branch**: `001-cli-innovations-visuals` **Created**: 2026-04-25
**Status**: Draft **Input**: Approved Scenario C (combined dual-track,
three-phase) with Architecture A (template-and-sub-agent pipeline +
source-of-truth generator). Two hard invariants: (1) no-regression of existing
pipeline; (2) Codex skill-budget hygiene.

---

## Overview

Gofer ships a pipeline that produces high-quality, developer-grade Markdown
specifications, but two parallel gaps have emerged through the first quarter of
2026:

1. **CLI UX gap.** Claude Code, Gemini CLI, Codex CLI, and Copilot CLI have all
   shipped major slash-command innovations (plugin marketplaces, agent teams,
   skill auto-invocation, TOML commands with `{{args}}`/`@{path}` injection,
   namespaced subfolder commands, `/plan`/`/side`/`/personality`, queued input,
   command pickers, autopilot vs plan mode, `/delegate`). Gofer maintains five
   hand-synchronised copies of 16 numbered stages, has no picker, no namespace,
   no plugin manifest, and no first-class Gemini or Codex surface.
2. **Visual-artifact gap.** Gofer's output is prose plus three Mermaid sequence
   diagrams plus one cloud topology plus ASCII bar charts. There is no executive
   one-pager, no C4 model, no AS-IS/TO-BE value-stream, no AI-leverage overlay
   at the business-process level, no capability heatmap, no bounded-context map,
   no ERD, no risk heatmap, and no ROI chart. Strategy consultants, business
   owners, developers and enterprise architects cannot each read the same spec
   on a single page.

These two gaps are coupled: new visuals need new commands to deliver them, and
new commands need a single source-of-truth generator to avoid compounding the
existing five-copy drift.

This feature delivers a three-phase uplift. **Phase 1** introduces a
YAML-frontmatter + Markdown-body source-of-truth generator at
`.specify/commands/<stage>.md` that emits to all four CLI surfaces with
byte-equivalent reproduction of today's outputs (modulo description shortening),
adds the additive `/gofer:*` namespace alongside the existing numbered stages,
ships `/gofer:plan` / `/gofer:side` / `/gofer:personality`, and lands Codex
skill-budget hygiene including the `gofer codex doctor` read-only diagnostic.
**Phase 2** introduces the persona pack (Impact Canvas with AI-leverage Ring, C4
Context, C4 Container, AS-IS value-stream, TO-BE value-stream with enforced
four-verb AI-leverage tagging, capability heatmap, bounded-context map, ERD,
risk heatmap, ROI xychart) via dedicated visual-writer sub-agents, with
`impact-canvas.md` and `value-stream-tobe.md` as hard gates between
`/2_gofer_specify` and `/3_gofer_plan`. **Phase 3** packages Gofer as a Claude
Code plugin, a Gemini CLI extension, and a Codex `AGENTS.md` + `config.toml`
bundle, and adds the Marp/mmdc stakeholder-pack assembler in
`/7a_stakeholder_comms`.

The two-personas-served goal is enforced: every feature folder must, by the end
of `/2_gofer_specify`, be readable in 60 seconds by both a non-developer (Impact
Canvas + TO-BE value-stream tells the AI-leverage story in plain language) and a
developer/architect (C4 Context, bounded-context map, ERD, capability heatmap),
with parity across all four CLI surfaces.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Strategy consultant reads the spec on one page (Priority: P1)

A strategy consultant joins a working session mid-pipeline and needs to
understand, in under five minutes, what work AI is replacing, augmenting,
automating, or observing in the proposed solution, and what the projected ROI
is.

**Why this priority**: This is the headline gap that produced the feature.
Without a one-page artifact, non-developer personas either wait for the dev team
to paraphrase the spec or bounce off entirely, and the AI-leverage story stays
buried inside option-spectrum sequence diagrams.

**Independent Test**: Run `/0_business_scenario` through to `/2_gofer_specify`
for any new feature. Open the resulting `impact-canvas.md` and verify that
within 60 seconds an executive reader can identify the four AI-leverage verb
counts (Replace / Augment / Automate / Observe), the projected ROI payback band,
the top three risks, and the named primary persona.

**Acceptance Scenarios**:

1. **Given** a feature folder produced by `/2_gofer_specify`, **When** the
   consultant opens `impact-canvas.md`, **Then** the file contains a Mermaid
   mindmap of stakeholders, an AI-leverage Ring summarising counts of
   Replace/Augment/Automate/Observe steps, an ROI band, a named primary persona,
   and a top-three risk list — all visible without scrolling past one screen on
   a 1080p display.
2. **Given** the same folder, **When** the consultant opens
   `value-stream-tobe.md`, **Then** every step is colour-tagged with exactly one
   of the four AI-leverage verbs and is preceded by a plain-language paragraph
   explaining the change from AS-IS.

---

### User Story 2 — Business owner approves the change without dev jargon (Priority: P1)

A business owner needs to sign off on a proposed change in language they
understand. They cannot read sequence diagrams or class structures.

**Why this priority**: The pipeline already produces strong technical material;
the missing piece is the business-level translation. This story closes the
"non-dev legibility" complaint.

**Independent Test**: A reviewer with no software-engineering background reads
`impact-canvas.md` and `value-stream-tobe.md` and produces a verbal summary of
the change. Acceptance is a summary that correctly names the affected work steps
and which verbs apply.

**Acceptance Scenarios**:

1. **Given** an Impact Canvas, **When** a non-developer reviewer reads it,
   **Then** they can identify the affected business capability, the work steps
   changing, and the AI-leverage stance for each step using only plain language.
2. **Given** a TO-BE value stream, **When** the reviewer compares it to the
   AS-IS value stream from `/0a_problem_validation`, **Then** the difference
   highlights are obvious through colour coding without requiring diagram
   literacy.

---

### User Story 3 — Developer implements with precise architectural context (Priority: P1)

A developer picking up the implementation needs the existing technical depth
(sequence diagrams, plan, contracts) plus the new C4 Container view, ERD, and
bounded-context map to understand integration points before writing code.

**Why this priority**: The new visuals must not displace what developers already
rely on. They must add architectural precision in the language already familiar
to engineers.

**Independent Test**: Verify that `/3_gofer_plan` produces `c4-container.md`,
`bounded-context.md`, and `data-model-erd.md` alongside the existing `plan.md`,
and that running the pipeline without these files would fail the persona-pack
completeness check.

**Acceptance Scenarios**:

1. **Given** `/3_gofer_plan` has completed, **When** the developer inspects the
   feature folder, **Then** `c4-container.md`, `bounded-context.md`, and
   `data-model-erd.md` exist with valid Mermaid blocks renderable in VSCode
   preview.
2. **Given** any of those three files is missing, **When** `/4_gofer_tasks`
   runs, **Then** the pipeline raises a persona-pack completeness warning naming
   the missing artifact(s).

---

### User Story 4 — Enterprise architect maps capabilities and bounded contexts (Priority: P1)

An enterprise architect needs to position the feature inside the existing
capability model, identify bounded-context seams, and assess risk.

**Why this priority**: The architect persona is one of the four the feature is
explicitly designed to serve, and capability heatmaps + bounded-context maps +
risk heatmaps are the canonical artifacts for this audience.

**Independent Test**: Confirm that `/1_gofer_research` produces
`capability-heatmap.md`, `/3_gofer_plan` produces `bounded-context.md`, and
`/6_gofer_validate` produces `risk-heatmap.md`, each containing the appropriate
Mermaid construct (`quadrantChart` for heatmaps, `flowchart` for bounded
contexts) plus a plain-language preamble.

**Acceptance Scenarios**:

1. **Given** `/1_gofer_research` has completed, **When** the architect opens
   `capability-heatmap.md`, **Then** the feature is plotted on a `quadrantChart`
   against the existing capability inventory and the file lists which
   capabilities are touched, replaced, or extended.
2. **Given** `/6_gofer_validate` has completed, **When** the architect opens
   `risk-heatmap.md`, **Then** every risk identified across the validation
   council is plotted on a Mermaid `quadrantChart` (likelihood × impact) and the
   top quadrant is summarised in prose.

---

### User Story 5 — Pipeline operator triggers stages without remembering numbered names (Priority: P1)

The pipeline operator runs Gofer dozens of times per week and currently must
remember the numeric ordering of 16 stages. They want a picker-driven,
namespaced, fuzzy-searchable command surface that works identically in Claude
Code, Gemini CLI, Codex CLI, and Copilot CLI.

**Why this priority**: This is the headline CLI-UX gap. Without a picker and
namespace, the friction of stage lookup compounds every run, and the four CLIs
each behave differently.

**Independent Test**: From any of the four CLIs, type `/gofer:` and verify a
picker (or completion) presents every stage by short canonical name with a
one-sentence description ≤140 chars. Time-to-stage from the picker is recorded
by the existing hook log and compared to the baseline numbered-only flow.

**Acceptance Scenarios**:

1. **Given** Phase 1 has shipped, **When** the operator types `/gofer:` in any
   of the four CLIs, **Then** the namespaced commands appear with ≤140-char
   descriptions and selecting one routes to the same skill body as the
   corresponding numbered stage.
2. **Given** the operator types a misspelled command, **When** the CLI offers
   fuzzy suggestions, **Then** Gofer commands appear in the suggestions in
   Copilot and Gemini.
3. **Given** the operator runs `/gofer:plan` mid-conversation, **When** the
   command activates, **Then** the active conversation switches into plan mode
   with context-usage shown, mirroring Codex `/plan` semantics.
4. **Given** the operator uses `/gofer:side` for a quick clarifier, **When**
   they return to the main thread, **Then** the main thread context is
   preserved.
5. **Given** the operator runs `/gofer:personality friendly` ahead of a
   stakeholder demo, **When** subsequent stages produce stakeholder content,
   **Then** the voice shifts to plain-language without the operator rewriting
   prompts.

---

### User Story 6 — Codex user with too many skills recovers a working environment (Priority: P1)

A Codex CLI user installs Gofer and immediately sees the warning _"Exceeded
skills context budget of 2%"_ because their `~/.codex/skills` directory contains
181 SKILL.md files including 11 duplicated Gofer bundles. They need a one-shot,
read-only diagnostic that tells them exactly which paths are over budget and
gives them the official `[[skills.config]] enabled = false` block to paste into
`~/.codex/config.toml`. This is derived directly from the 2026-04-25 incident.

**Why this priority**: When the budget is exceeded, Codex drops _all_ skill
descriptions and implicit selection breaks for every skill the user has
installed — not just Gofer. A poisoned environment makes the CLI unusable until
cleaned up. This story is the operational closing of the Codex hygiene
invariant.

**Independent Test**: Pre-populate `~/.codex/skills` with 11 duplicated Gofer
bundles. Run `gofer codex doctor`. Verify the command (a) is read-only, (b)
lists every duplicate path, (c) reports the canonical Gofer skill set as
≤140-char descriptions and ≤2KB cumulative description bytes, (d) emits a
paste-ready `[[skills.config]] enabled = false` block for the duplicates, and
(e) does not reference any non-existent config key such as
`skills_context_budget_percent`.

**Acceptance Scenarios**:

1. **Given** a Codex environment with duplicated Gofer bundles, **When** the
   user runs `gofer codex doctor`, **Then** the command lists every duplicate
   path, prints the canonical Gofer skill set, and emits a `[[skills.config]]`
   snippet — without modifying any file.
2. **Given** the user pastes the snippet into `~/.codex/config.toml`, **When**
   they restart Codex, **Then** the budget warning is gone and implicit skill
   selection works again.
3. **Given** the canonical Gofer skill set is freshly emitted by the
   source-of-truth generator, **When** the descriptions are concatenated,
   **Then** the cumulative byte count is ≤2KB.
4. **Given** the generator emits Codex paths, **When** Claude-only stages
   (`0_business_scenario` orchestrator, `gofer_constitution`, `gofer_hydrate`,
   `7_gofer_save`, `8_gofer_resume`) are encountered, **Then** they are excluded
   from Codex emission.
5. **Given** the generator emits skill files for Codex, **When** the directory
   tree is inspected, **Then** the layout is flat under
   `.agents/skills/<stage>/SKILL.md` with no `<tenant>/<stage>/` nesting.

---

### User Story 7 — Stakeholder pack assembled for executive distribution (Priority: P2)

After validation, the operator wants to hand executives a single self-contained
artifact (one Markdown file plus optional rendered images and an optional Marp
deck) that combines the Impact Canvas, value-stream TO-BE, capability heatmap,
ROI chart and risk heatmap.

**Why this priority**: Phase 3 packaging closes the loop on stakeholder
distribution; the underlying artifacts (Phase 2) deliver value without it, but
the comms experience is incomplete.

**Independent Test**: Run `/7a_stakeholder_comms` after `/6_gofer_validate`.
Verify that `stakeholder-pack.md` is produced, and that with the optional render
flag enabled, PNG/SVG renders are produced for each Mermaid block.

**Acceptance Scenarios**:

1. **Given** the persona-pack files exist, **When** `/7a_stakeholder_comms`
   runs, **Then** `stakeholder-pack.md` is assembled containing references to
   and inline copies of every persona-pack artifact in a deterministic order.
2. **Given** the operator opts into rendering, **When** the optional `mmdc` step
   runs, **Then** PNG/SVG outputs are produced for each Mermaid block; failure
   of the renderer falls back gracefully to Markdown-only output.

---

### User Story 8 — Pipeline operator queues follow-on work while a stage runs (Priority: P3)

The operator types follow-up commands (`/6_gofer_validate`, stakeholder
questions) while `/5_gofer_implement` is still running. They want the queued
input to be visibly captured and replayed when the running stage completes.

**Why this priority**: Codex shipped queued input in 2026; matching this UX
reduces idle time per pipeline run. It is a Phase 1 quality-of-life improvement,
not a gating capability.

**Independent Test**: Start `/5_gofer_implement`, queue `/6_gofer_validate`
while it runs, verify the queue is acknowledged in the CLI, and verify
`/6_gofer_validate` runs to completion immediately after `/5_gofer_implement`
finishes.

**Acceptance Scenarios**:

1. **Given** `/5_gofer_implement` is running, **When** the operator queues a
   follow-up command, **Then** the CLI surfaces a visible queue indicator and
   the queued command runs immediately on completion of the current stage.

---

### Edge Cases

- **Mermaid renderer failure**: when `mmdc` or a beta Mermaid construct
  (`xychart-beta`, `quadrantChart`, C4) fails to render, the system MUST fall
  back to the Markdown source plus a tabular text representation, never blocking
  the pipeline.
- **Persona-pack completeness gate**: when `impact-canvas.md` or
  `value-stream-tobe.md` is missing or malformed at the end of
  `/2_gofer_specify`, the gate to `/3_gofer_plan` MUST block and surface a
  remediation prompt naming the missing artifact.
- **Source-of-truth divergence**: when a hand-edit is detected on an emitted
  target (`.claude/commands/`, `extension/resources/copilot-prompts/`,
  `.github/prompts/`, `.agents/skills/`, `.system/skills/`) but not on the
  canonical `.specify/commands/<stage>.md`, the generator MUST refuse to
  overwrite without an explicit `--force-emit` and MUST log the divergence.
- **Codex over-budget on first install**: when `gofer codex doctor` detects a
  freshly installed Gofer alongside duplicated bundles already on disk, it MUST
  report both classes (canonical + duplicates) separately and emit the disable
  snippet only for the duplicates.
- **Description-length overrun**: if a stage description exceeds 140 characters,
  the generator MUST refuse to emit and MUST point the author at the offending
  line in `.specify/commands/<stage>.md`.
- **Per-CLI exclusion violation**: if a Claude-only stage (e.g.,
  `gofer_constitution`) is incorrectly tagged for Codex/Gemini surfaces in its
  YAML frontmatter, the generator MUST refuse to emit and MUST point the author
  at the YAML.
- **Queued-input loss**: when the running stage crashes, queued items MUST be
  preserved and replayed on resume rather than silently dropped.
- **mmdc absent**: when the optional renderer is not installed, the pipeline
  MUST continue and produce `stakeholder-pack.md` without rendered images, with
  a single visible warning.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Source-of-truth and CLI parity (Phase 1)

- **FR-001 (P1)**: System MUST maintain a canonical, single-source-of-truth
  definition for every stage at `.specify/commands/<stage>.md` consisting of
  YAML frontmatter (name, description ≤140 chars, surfaces, args, includes) plus
  a Markdown body. _Validation_: every existing stage has exactly one canonical
  file; no other location holds an authoritative copy. _Integration_: Replaces
  hand-sync across `.claude/commands/`, `extension/resources/copilot-prompts/`,
  `.github/prompts/`, `.agents/skills/`, `.system/skills/`.

- **FR-002 (P1)**: System MUST emit byte-equivalent reproductions of the current
  `.claude/commands/`, `extension/resources/copilot-prompts/`,
  `.github/prompts/`, `.agents/skills/`, `.system/skills/` outputs from the
  canonical source-of-truth files (modulo description shortening required by
  FR-006), before any new commands are added. _Validation_: a regression diff
  suite compares pre-feature emit against post-feature emit on every existing
  stage and reports zero substantive differences other than description length.
  _Integration_: enforces invariant 1 (no-regression).

- **FR-003 (P1)**: Every existing slash command (`/0_business_scenario`,
  `/0a_problem_validation`, `/1_gofer_research`, `/2_gofer_specify`,
  `/3_gofer_plan`, `/4_gofer_tasks`, `/5_gofer_implement`, `/6_gofer_validate`,
  `/6a_gofer_engineering_review`, `/7_gofer_save`, `/7a_stakeholder_comms`,
  `/8_gofer_resume`, `/9_gofer_tests`, `/10_gofer_cloud`, `/gofer_constitution`,
  `/gofer_hydrate`) MUST keep working at parity after the feature ships.
  _Validation_: each command is exercised end-to-end against a fixture feature
  folder before and after the feature; outputs match. _Integration_: enforces
  invariant 1.

- **FR-004 (P1)**: All 37 existing sub-agents at `.claude/agents/*.md`
  (filesystem ground truth verified 2026-04-25), all hooks (the three wired in
  `.claude/settings.json` plus `session-lifecycle.mjs` invoked separately), all
  stage scripts at `.specify/scripts/bash/`, and all existing templates MUST
  continue to function unchanged. _Validation_: hook-log fixture replay shows no
  missing invocations; sub-agent invocations from existing stages still resolve;
  `ls .claude/agents/*.md | wc -l` = 37. _Integration_: enforces invariant 1.

- **FR-005 (P1)**: System MUST add an additive `/gofer:*` namespace alias
  surface that routes to the same skill bodies as the existing numbered stages,
  without renaming or removing any existing command. _Validation_: invoking
  `/gofer:research` and `/1_gofer_research` produces identical behaviour.
  _Integration_: matches Gemini's namespacing convention; powers Copilot's
  picker.

- **FR-006 (P1)**: Every emitted command/skill description MUST be ≤140
  characters. _Validation_: lint step in the generator rejects emit when any
  description exceeds 140 chars. _Integration_: enforces invariant 2 (Codex
  skill-budget hygiene).

- **FR-007 (P1)**: System MUST provide per-CLI inclusion/exclusion in YAML
  frontmatter and MUST exclude Claude-only stages (`0_business_scenario`
  orchestrator, `gofer_constitution`, `gofer_hydrate`, `7_gofer_save`,
  `8_gofer_resume`) from ALL non-Claude emit paths: `.agents/skills/` (Codex),
  `.gemini/commands/` (Gemini), `extension/resources/copilot-prompts/`
  (Copilot), `.github/prompts/` (GitHub-prompts), and `.system/skills/`
  (VSCode). Rationale: those surfaces consume picker / skill-budget / discovery
  space for stages that have no value off-Claude. _Validation_: post-emit
  inspection of all five paths shows no entries for excluded stages.
  _Integration_: enforces invariant 2.

- **FR-008 (P1)**: System MUST emit Codex skill files into a flat, non-tenanted
  tree (e.g., `.agents/skills/<stage>/SKILL.md`) — no `<tenant>/<stage>/`
  nesting. _Validation_: directory walk after emit shows depth ≤2 from
  `.agents/skills/`. _Integration_: enforces invariant 2; matches Codex's
  documented discovery paths.

- **FR-009 (P1)**: System MUST ship a read-only `gofer codex doctor` command
  that scans `~/.codex/skills`, lists duplicate Gofer bundles, prints which
  paths exceed the 2% budget, emits a paste-ready
  `[[skills.config]] enabled = false` block for `~/.codex/config.toml`, and
  never modifies any file on disk. _Validation_: integration test against a
  fixture `~/.codex/skills` directory; assert no writes; assert TOML snippet is
  valid. _Integration_: closes the 2026-04-25 Codex incident.

- **FR-010 (P1)**: System MUST document, in `gofer_constitution`, that Codex
  distribution targets `.agents/skills/` and plugins (and `~/.codex/config.toml`
  overrides) — not `.claude/skills/`. _Validation_: text inspection of the
  constitution file. _Integration_: enforces invariant 2.

- **FR-011 (P1)**: System MUST NOT emit any reference to a
  `skills_context_budget_percent` key, since no such official Codex config key
  exists. _Validation_: repo-wide search returns zero matches. _Integration_:
  enforces invariant 2.

- **FR-012 (P1)**: System MUST add `/gofer:plan` as a first-class command that
  switches the active conversation into plan mode with current context-usage
  displayed before carrying forward, mirroring Codex `/plan` semantics.
  _Validation_: invoking the command in a Claude-Code session shifts behaviour
  to plan mode. _Integration_: formalises the "Plan Node Default" rule in
  `CLAUDE.md`.

- **FR-013 (P1)**: System MUST add `/gofer:side` as a side-conversation command
  that allows the operator to ask a clarifier without disturbing the main thread
  context. _Validation_: returning from the side conversation preserves prior
  main-thread state. _Integration_: matches Codex `/side`.

- **FR-014 (P1)**: System MUST add `/gofer:personality` accepting
  `friendly | pragmatic | none` and adjusting downstream stage voice without
  rewriting prompts. _Validation_: stakeholder content produced after
  `/gofer:personality friendly` differs in tone from after
  `/gofer:personality pragmatic`. _Integration_: matches Codex `/personality`;
  supports business-vs-engineer audience shifts.

- **FR-015 (P2)**: System MUST surface queued-input awareness so users can queue
  follow-on commands while a stage runs and have the queue visibly acknowledged
  and replayed at completion. _Validation_: integration test queues
  `/6_gofer_validate` during a running `/5_gofer_implement`; the queued command
  runs on completion. _Integration_: matches Codex queued-input UX.

#### Visual artifacts and persona pack (Phase 2)

- **FR-016 (P1)**: System MUST produce `impact-canvas.md` for every feature
  folder before `/3_gofer_plan` runs, containing a Mermaid mindmap of
  stakeholders, an AI-leverage Ring (rendered as a Mermaid `pie` block)
  summarising counts of Replace/Augment/Automate/Observe, KPI tiles, ROI band,
  primary persona, and top-three risks — preceded by a plain-language paragraph
  (≥30 and ≤200 words). The canvas is generated in two passes: pass 1 in
  `/2_gofer_specify` with risks heuristically sourced from spec NFR +
  Out-of-Scope sections; pass 2 in `/6_gofer_validate` regenerates ONLY the
  `topThreeRisks` field using validation council output. _Validation_: file
  exists and parses; gate logic blocks `/3_gofer_plan` if absent; pie counts
  equal parser output. _Integration_: invoked at end of `/2_gofer_specify` via
  the `visual-canvas-writer` sub-agent (pass 1) and again at end of
  `/6_gofer_validate` (pass 2, risks-only).

- **FR-017 (P1)**: System MUST produce `value-stream-asis.md` during
  `/0a_problem_validation` containing a swim-lane Mermaid `flowchart LR` of the
  current process. _Validation_: file exists and parses; preceded by
  plain-language paragraph. _Integration_: `visual-value-stream-writer`
  sub-agent.

- **FR-018 (P1)**: System MUST produce `value-stream-tobe.md` during
  `/2_gofer_specify` containing a swim-lane Mermaid `flowchart LR` where every
  step is tagged with exactly one AI-leverage verb (Replace / Augment / Automate
  / Observe), colour-coded, and preceded by a plain-language paragraph.
  _Validation_: parser asserts every step has exactly one of the four verbs;
  gate logic blocks `/3_gofer_plan` if absent or untagged. _Integration_:
  `visual-value-stream-writer` sub-agent; reuses the highlight-rect pattern from
  `option-spectrum.yaml`.

- **FR-019 (P1)**: System MUST produce `c4-context.md` during
  `/1_gofer_research` containing a Mermaid `C4Context` block plus plain-language
  preamble. _Validation_: file exists, parses, includes named external systems.
  _Integration_: `visual-c4-writer` sub-agent.

- **FR-020 (P1)**: System MUST produce `c4-container.md` during `/3_gofer_plan`
  containing a Mermaid `C4Container` block plus plain-language preamble.
  _Validation_: file exists, parses. _Integration_: `visual-c4-writer`
  sub-agent.

- **FR-021 (P1)**: System MUST produce `capability-heatmap.md` during
  `/1_gofer_research` containing a Mermaid `quadrantChart` of capability impact
  plus a tabular complement. _Validation_: file exists; parses; lists which
  capabilities are touched, replaced, or extended. _Integration_:
  `visual-heatmap-writer` sub-agent.

- **FR-022 (P1)**: System MUST produce `bounded-context.md` during
  `/3_gofer_plan` containing a Mermaid `flowchart` of bounded contexts and their
  contracts plus plain-language preamble. _Validation_: file exists, parses,
  names every context. _Integration_: `visual-bounded-context-writer` sub-agent.

- **FR-023 (P1)**: System MUST produce `data-model-erd.md` during
  `/3_gofer_plan` containing a Mermaid `erDiagram` block plus plain-language
  preamble. _Validation_: file exists, parses. _Integration_:
  `visual-erd-writer` sub-agent.

- **FR-024 (P1)**: System MUST produce `risk-heatmap.md` during
  `/6_gofer_validate` containing a Mermaid `quadrantChart` (likelihood × impact)
  plotting every risk identified by the validation council, plus a top-quadrant
  prose summary. _Validation_: file exists, parses. _Integration_:
  `visual-risk-writer` sub-agent.

- **FR-025 (P1)**: System MUST upgrade `spec-summary-template.md` and
  `business-metrics-template.md` to emit a real Mermaid `xychart-beta`
  ROI/payback chart in place of ASCII bars, during `/6_gofer_validate`.
  _Validation_: rendered chart present; ASCII bars removed. _Integration_:
  replaces `business-metrics-template.md:31-34` ASCII pattern.

- **FR-026 (P1)**: The Impact Canvas AI-leverage Ring MUST aggregate the
  Replace/Augment/Automate/Observe counts directly from `value-stream-tobe.md`,
  never freeform-restated. _Validation_: counts in canvas match parser output of
  TO-BE flowchart. _Integration_: enforces single-source for AI-leverage
  taxonomy across artifacts.

- **FR-027 (P1)**: Every persona-pack artifact MUST open with a plain-language
  paragraph (≥30 and ≤200 words) before any diagram, to satisfy the
  novice-guardrail constraint. _Validation_: lint step on each artifact asserts
  word count is within the bound. _Integration_: applies to FR-016 through
  FR-025.

#### Stakeholder packaging (Phase 3)

- **FR-028 (P2)**: System MUST add `/7a_stakeholder_comms` assembly that
  composes every persona-pack artifact into a single `stakeholder-pack.md` in
  deterministic order. _Validation_: file exists, references and inlines all
  expected artifacts. _Integration_: existing `/7a_stakeholder_comms` upgraded;
  `stakeholder-comms-template.md:128-152` replaced with real generated diagrams.

- **FR-029 (P3)**: System MUST OPTIONALLY render Mermaid blocks to PNG/SVG via
  `mmdc` when the operator opts in, with graceful fallback to Markdown-only when
  the renderer is unavailable. _Validation_: integration test with renderer
  present produces images; without renderer produces a single warning.
  _Integration_: opt-in in `/7a_stakeholder_comms`.

- **FR-030 (P3)**: System MUST OPTIONALLY render a Marp slide deck from
  `stakeholder-pack.md`. _Validation_: when invoked, deck is produced; failure
  does not block the pipeline. _Integration_: existing Marp reference in
  `stakeholder-comms-template.md:67-118`.

- **FR-031 (P3)**: System MUST emit a Claude Code plugin manifest
  (`.claude-plugin/plugin.json`) describing every stage as plugin commands, with
  descriptions ≤140 chars. _Validation_: manifest validates against the Claude
  plugin schema. _Integration_: enables marketplace distribution per Decision 4.

- **FR-032 (P3)**: System MUST emit a Gemini CLI extension manifest
  (`.gemini/extension.json`) plus TOML command files under
  `.gemini/commands/gofer/<stage>.toml` using `{{args}}` and `@{path}`
  injection. _Validation_: extension installs cleanly into Gemini CLI;
  `/gofer:research` resolves. _Integration_: enables Gemini parity per
  Decision 4.

- **FR-033 (P3)**: System MUST emit a Codex `AGENTS.md` and `codex-config.toml`
  template suitable for paste-in to `~/.codex/config.toml`, alongside
  `.agents/skills/` flat tree per FR-008. _Validation_: Codex picks up Gofer
  commands without budget warning given a clean fixture environment.
  _Integration_: enables Codex parity per Decision 4.

#### Cross-cutting

- **FR-034 (P1)**: System MUST log a hook event capturing
  time-from-prompt-to-stage-launch for every command invocation, so
  command-picker time-to-stage can be measured against baseline. _Validation_:
  hook log contains the new event for both numbered and namespaced invocations.
  _Integration_: extends existing `.specify/scripts/hooks/` infrastructure.

- **FR-035 (P1)**: System MUST preserve the constraint that `market-analysis.md`
  and `business-analysis.md` are produced even when competitive analysis is
  disabled. _Validation_: pipeline run with `competitiveAnalysisEnabled: false`
  still yields both files. _Integration_: existing Gofer constraint.

### Key Entities _(include if feature involves data)_

- **Source-of-truth file** — A single canonical YAML-frontmatter + Markdown-body
  file per stage at `.specify/commands/<stage>.md`. YAML declares: `name`,
  `description` (≤140 chars), `surfaces` (subset of `claude`, `claude-mirror`,
  `copilot`, `gemini`, `codex`, `vscode`, `github-prompts`), `args`, `includes`.
  (`claude-mirror` = `extension/resources/claude-commands/`; `vscode` =
  `.system/skills/`; `github-prompts` = `.github/prompts/`.) Body is the prompt
  content.
- **Persona-pack artifact** — A Markdown file containing exactly one Mermaid
  block plus a plain-language preamble, written by exactly one visual-writer
  sub-agent, located inside the feature folder.
- **AI-leverage tag** — One of four enforced verbs (Replace / Augment / Automate
  / Observe) attached to every step of `value-stream-tobe.md`.
- **Persona pack** — The set of artifacts: `impact-canvas.md`,
  `value-stream-asis.md`, `value-stream-tobe.md`, `c4-context.md`,
  `c4-container.md`, `capability-heatmap.md`, `bounded-context.md`,
  `data-model-erd.md`, `risk-heatmap.md`, plus the upgraded ROI chart inside
  `spec-summary-template.md`.
- **Stakeholder pack** — Composite artifact `stakeholder-pack.md` produced in
  `/7a_stakeholder_comms`, with optional Marp deck and optional `mmdc` PNG/SVG
  renders.
- **`/gofer:*` namespace** — Additive alias surface that routes to existing
  numbered-stage skill bodies.

---

## Non-Functional Requirements

- **NFR-001 — Generator performance**: source-of-truth generator MUST complete a
  full re-emit (all stages × all surfaces) in under 2 seconds on a developer
  laptop.
- **NFR-002 — Mermaid render performance**: Mermaid rendering for any single
  persona-pack artifact in VSCode preview MUST complete in under 5 seconds for a
  chart of typical size.
- **NFR-003 — Persona-pack file size**: each persona-pack artifact SHOULD be
  ≤2,000 lines and ≤200KB to remain diff-friendly.
- **NFR-004 — Cumulative description budget**: cumulative description bytes for
  the canonical Gofer skill set (post-exclusion of Claude-only stages from Codex
  paths) MUST be ≤2KB.
- **NFR-005 — Security: no secrets in templates**: persona-pack templates and
  source-of-truth files MUST NOT embed credentials, tokens, or
  environment-specific secrets.
- **NFR-006 — Security: mmdc Chrome sandbox**: when `mmdc` is invoked, it MUST
  run with the default headless-Chrome sandbox enabled; no `--no-sandbox` flag.
- **NFR-007 — Compatibility: four-CLI parity**: every persona-pack artifact MUST
  be Markdown-first so all four CLIs (Claude Code, Gemini CLI, Codex CLI,
  Copilot CLI) can read it; rendering is a separate optional layer.
- **NFR-008 — Compatibility: VSCode bundled**: VSCode preview MUST render every
  persona-pack artifact without additional extensions beyond the Gofer extension
  itself.
- **NFR-009 — Offline operation**: Phase 1 and Phase 2 MUST function fully
  offline. Phase 3 marketplace publication may require network; runtime usage of
  the published plugin/extension/skills MUST work offline.
- **NFR-010 — Beta-construct fallback**: when a beta Mermaid construct
  (`xychart-beta`, `quadrantChart`, C4) fails to render, the system MUST fall
  back to a tabular text representation rather than block the pipeline.
- **NFR-011 — Determinism**: re-running the generator on unchanged
  source-of-truth files MUST produce byte-identical output.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

| ID         | Metric                                                                                             | Target                                                                                                                         | Source                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **SC-001** | Percentage of new features that produce `impact-canvas.md` before `/3_gofer_plan` runs             | 100%                                                                                                                           | Gate logic in `/2_gofer_specify`                                                                                                      |
| **SC-002** | Number of the persona-pack visual artifacts auto-generated per feature                             | ≥4 of 6 (canvas, C4 Context, value-stream TO-BE, capability heatmap, bounded-context, ERD/risk)                                | Persona-pack completeness check                                                                                                       |
| **SC-003** | Codex skill-budget warning eliminated in the user's environment after `gofer codex doctor` cleanup | Zero occurrences of "Exceeded skills context budget of 2%" warning post-cleanup                                                | Codex CLI session logs                                                                                                                |
| **SC-004** | Command-picker time-to-stage reduction vs baseline numbered-only flow                              | ≥50% reduction                                                                                                                 | Hook log captured per FR-034, compared to pre-feature baseline                                                                        |
| **SC-005** | Regressions in existing slash commands                                                             | 0                                                                                                                              | Pre/post regression suite over all 16 stages                                                                                          |
| **SC-006** | Cumulative SKILL description bytes for canonical Gofer set on Codex paths                          | ≤2KB                                                                                                                           | Generator emit-time measurement                                                                                                       |
| **SC-007** | Source-of-truth generator end-to-end runtime                                                       | <2 seconds                                                                                                                     | Generator self-instrumented timing                                                                                                    |
| **SC-008** | Byte-equivalent reproduction of pre-feature emit paths (modulo description shortening)             | 100% of stages                                                                                                                 | Diff suite over `.claude/commands/`, `extension/resources/copilot-prompts/`, `.github/prompts/`, `.agents/skills/`, `.system/skills/` |
| **SC-009** | Stakeholder reading time for Impact Canvas                                                         | ≤60 seconds for non-developer readers to identify all four AI-leverage verb counts, ROI band, primary persona, top-three risks | Acceptance test with non-developer reviewers                                                                                          |
| **SC-010** | TO-BE value-stream tagging completeness                                                            | 100% of TO-BE steps tagged with exactly one of Replace/Augment/Automate/Observe                                                | Parser-enforced gate in `/2_gofer_specify`                                                                                            |
| **SC-011** | Number of `skills_context_budget_percent` references emitted by the generator                      | 0                                                                                                                              | Repo-wide search                                                                                                                      |
| **SC-012** | Number of Claude-only stages leaking into Codex/Gemini emit paths                                  | 0                                                                                                                              | Post-emit directory inspection                                                                                                        |

---

## Assumptions

1. The four target CLIs (Claude Code, Gemini CLI, Codex CLI, Copilot CLI) retain
   their April 2026 documented behaviour for plugin/extension manifests, TOML
   command syntax, slash-command discovery, and skill loading.
2. Mermaid `xychart-beta`, `quadrantChart`, C4
   (`C4Context`/`C4Container`/`C4Component`/`C4Dynamic`), and `mindmap`
   constructs remain stable enough in the targeted Mermaid release line for
   diff-friendly Markdown emission, with a tabular fallback when any single
   chart fails to render (per NFR-010).
3. **Hard invariant 1 — no-regression**: every existing slash command, all 37
   sub-agents (filesystem ground truth), all hooks (3 wired in
   `.claude/settings.json` + `session-lifecycle.mjs` invoked separately), all
   stage scripts, and all templates listed in Dependencies continue to function
   unchanged. The new `/gofer:*` namespace is additive (alias only). The
   source-of-truth generator reproduces existing emit paths byte-equivalent
   (modulo description shortening AND per-CLI exclusion of the 5 Claude-only
   stages from all non-Claude surfaces) before any new commands are added.
4. **Hard invariant 2 — Codex skill-budget hygiene**: Codex preloads
   name+description into a 2% context budget and drops all descriptions when
   over budget. There is no official `skills_context_budget_percent` key. The
   supported knob is `[[skills.config]] path = "..." enabled = false` in
   `~/.codex/config.toml`. Codex discovers `.agents/skills/`, user/admin/system
   locations, plugins, and `~/.codex/config.toml` overrides — not
   `.claude/skills/`. The generator emits ≤140-char descriptions, a flat
   non-tenanted tree, per-CLI exclusion (Claude-only stages excluded from
   Codex/Gemini), ships `gofer codex doctor`, and the constitution documents the
   discovery paths.
5. **Locked decision — source-of-truth format**: YAML frontmatter + Markdown
   body, one file per stage at `.specify/commands/<stage>.md`. YAML declares
   name, description (≤140 chars), surfaces, args, includes.
6. **Locked decision — phase order**: strict 1 → 2 → 3 with no reordering. Phase
   1 = source-of-truth generator + Codex hygiene + `/gofer:*` namespace +
   `/gofer:plan` / `/gofer:side` / `/gofer:personality`. Phase 2 = visual
   artifacts. Phase 3 = packaging.
7. **Locked decision — AI-leverage taxonomy**: enforced 4 verbs (Replace /
   Augment / Automate / Observe). Every TO-BE value-stream step tagged. Impact
   Canvas summarises counts per verb.
8. **Locked decision — architecture**: template-and-sub-agent pipeline with a
   source-of-truth layer, a persona-pack layer (one sub-agent writer per
   artifact: visual-canvas-writer, visual-c4-writer, visual-value-stream-writer,
   visual-heatmap-writer, visual-bounded-context-writer, visual-erd-writer,
   visual-risk-writer), and a delivery layer (`/7a_stakeholder_comms`
   assembler).
9. **Mermaid ceiling**: beta constructs may break; tabular fallback is the
   contract.
10. **Cross-CLI fidelity**: Copilot CLI does not render Mermaid inline; PNG/SVG
    export via `mmdc` is required for execs reading on Copilot.
11. **EnterpriseAI flag**: `market-analysis.md` and `business-analysis.md` are
    produced even when competitive analysis is disabled.
12. **Novice guardrail**: every new artifact opens with a plain-language
    paragraph before any diagram.
13. **Five-copy drift baseline**: today's emit targets are `.claude/commands/`,
    `extension/resources/copilot-prompts/`, `.github/prompts/`,
    `.agents/skills/`, `.system/skills/` (plus
    `extension/resources/claude-commands/` mirror); the generator must replace
    hand-sync without breaking any of these targets.
14. **VSCode extension**: continues to ship via the existing extension build;
    persona-pack artifacts render in VSCode Mermaid preview without additional
    extensions.

---

## Dependencies

### Existing Gofer integration points (must be preserved per Invariant 1)

- **16 stage commands** with five emit-path copies each:
  `.claude/commands/<stage>.md`,
  `extension/resources/copilot-prompts/<stage>.prompt.md`,
  `.github/prompts/<stage>.prompt.md`, `.agents/skills/<stage>/SKILL.md`,
  `.system/skills/<stage>/SKILL.md`, plus the
  `extension/resources/claude-commands/` mirror.
- **37 sub-agents** at `.claude/agents/*.md` (filesystem ground truth) including
  the validation-_ family, validate-security-red-team, plan-_, research-_,
  specify-_, tasks-_, implement-_, comms-writer, business-problem-validator,
  engineer-review, scope-creep-detector, assumption-tracker,
  multi-perspective-judge, codebase-analyzer/locator/pattern-finder,
  business-metrics-analyzer.
- **Hooks** at `.specify/scripts/hooks/` wired via `.claude/settings.json`
  (UserPromptSubmit, PostToolUse, Stop, session-lifecycle).
- **Stage scripts** at `.specify/scripts/bash/` (create-new-feature, log-stage,
  check-context-health, pipeline-state, save-checkpoint,
  sync-implementation-status, etc.).
- **Existing templates**:
  `extension/resources/templates/journey/base-journey.md`,
  `extension/resources/templates/sequence-diagrams/option-spectrum.yaml`,
  `extension/resources/templates/business-metrics-template.md`,
  `extension/resources/templates/spec-summary-template.md`,
  `extension/resources/templates/stakeholder-comms-template.md`,
  `extension/resources/templates/assumptions-template.md`,
  `extension/resources/templates/brownfield-analysis.md`,
  `extension/resources/templates/problem-brief-template.md`.

### New components introduced by this feature

- **Source-of-truth generator** at
  `.specify/scripts/node/generate-commands.mjs`.
- **Persona-pack templates** at `.specify/templates/impact-canvas-template.md`,
  `.specify/templates/c4-context-template.md`,
  `.specify/templates/c4-container-template.md`,
  `.specify/templates/value-stream-asis-template.md`,
  `.specify/templates/value-stream-tobe-template.md`,
  `.specify/templates/capability-heatmap-template.md`,
  `.specify/templates/bounded-context-template.md`,
  `.specify/templates/data-model-erd-template.md`,
  `.specify/templates/risk-heatmap-template.md`.
- **Visual-writer sub-agents**: `visual-canvas-writer`, `visual-c4-writer`,
  `visual-value-stream-writer`, `visual-heatmap-writer`,
  `visual-bounded-context-writer`, `visual-erd-writer`, `visual-risk-writer`.
- **`gofer codex doctor`** read-only diagnostic.
- **Optional Mermaid export**: `.specify/scripts/node/mermaid-export.mjs`
  invoking `mmdc`.
- **Plugin/extension manifests**: `.claude-plugin/plugin.json`,
  `.gemini/extension.json`, `.gemini/commands/gofer/<stage>.toml`, `AGENTS.md`,
  `codex-config.toml`.
- **Namespace hint**: `.claude/namespaces.json`.

### External tooling and references

- **Mermaid** (Markdown-first; rendering via VSCode preview, Claude Artifacts,
  mermaid.live, GitHub).
- **`@mermaid-js/mermaid-cli` (`mmdc`)** — optional PNG/SVG export at
  `/7a_stakeholder_comms`.
- **Marp** — optional slide-deck rendering (already referenced in
  `stakeholder-comms-template.md:67-118`).
- **EnterpriseAI references** at `.specify/references/eai/...` for the
  workflowProfile=enterpriseai integration map.

---

## Out of Scope

- **Architecture options B (MCP-server-first), C (Claude-plugin monolith), D
  (standalone VSCode webview renderer)** from the proposal review. Architecture
  A (template-and-sub-agent + source-of-truth generator) is the locked
  direction.
- **Full re-platform to Scenario D (marketplace-first)** is a separate North
  Star quarter, not in this feature.
- **Marketplace destination question** — `anthropics/claude-plugins-official` vs
  community-first marketplace is deferred to Phase 3 execution; recorded as an
  open question to resolve at packaging time.
- **mmdc rendering target question** — whether `mmdc` is a local opt-in dev
  dependency or a GitHub Action is deferred to Phase 3 execution; recorded as an
  open question to resolve at packaging time.
- **ArchiMate, PlantUML, Structurizr DSL, D2** as alternative diagram formats —
  Mermaid is the locked choice (Decision 1).
- **Renaming or removing any existing numbered slash command** — the `/gofer:*`
  namespace is purely additive (Invariant 1).
- **AI-leverage taxonomies other than Replace/Augment/Automate/Observe** — the
  four-verb set is locked (Decision 6 / proposal-review confirmation).
- **Auto-modifying `~/.codex/config.toml` on the user's behalf** —
  `gofer codex doctor` is strictly read-only (FR-009).
- **Editing skill files outside `.specify/commands/<stage>.md`** — every
  authored change flows through the source-of-truth file; downstream copies are
  emitted, never hand-edited.

---

## EnterpriseAI Integration Map _(workflowProfile=enterpriseai — REQUIRED)_

This feature implements a Vertical-App → EAI-Services → Deployment-Target chain
at the meta level: the new Gofer persona pack is itself the vertical app
consumed by an EAI student vertical's design phase, the Gofer pipeline is the
EAI service, and the four-CLI surface plus the VSCode extension marketplace is
the deployment target.

| Layer                 | Identity                                                                                                                                                         | Role                                                                                                                                                                                      | Contract ID |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Vertical App**      | Gofer persona pack (Impact Canvas, C4, value-stream AS-IS/TO-BE with AI-leverage overlay, capability heatmap, bounded-context map, ERD, risk heatmap, ROI chart) | Consumed by an EAI student vertical's design phase to translate a business problem into a design every persona can read                                                                   | **IAP-001** |
| **EAI Services**      | The Gofer pipeline: source-of-truth generator + persona-pack visual writers + `/7a_stakeholder_comms` stakeholder-pack assembler                                 | Production engine that takes a business scenario through research → specify → plan → tasks → implement → validate → comms while emitting persona-pack artifacts at each integration point | **IAP-002** |
| **Deployment Target** | Four-CLI surface (Claude Code plugin, Gemini CLI extension, Codex AGENTS.md/`config.toml`, Copilot prompt files) plus the VSCode extension marketplace           | Distribution layer that meets each EAI student / staff member where they already work                                                                                                     | **IAP-003** |

Contract chain: **IAP-001 → IAP-002 → IAP-003.** Every persona-pack artifact
(IAP-001) is produced by a sub-agent writer in the pipeline (IAP-002) and
rendered through the surface the consumer is using (IAP-003). The two hard
invariants apply across the chain: no-regression of any existing pipeline output
(IAP-002) and Codex skill-budget hygiene at the deployment target (IAP-003).

---

## Glossary

- **Source-of-truth file** — Single canonical YAML-frontmatter + Markdown-body
  file per stage at `.specify/commands/<stage>.md`. Sole authoritative source
  from which all four CLI surfaces are emitted.
- **Persona pack** — The set of nine persona-pack artifacts produced across the
  pipeline (Impact Canvas, value-stream AS-IS, value-stream TO-BE, C4 Context,
  C4 Container, capability heatmap, bounded-context map, ERD, risk heatmap) plus
  the upgraded ROI chart in spec summary.
- **Impact Canvas** — One-page executive artifact (`impact-canvas.md`) with
  stakeholder mindmap, AI-leverage Ring, KPI tiles, ROI band, primary persona,
  and top-three risks. Hard gate before `/3_gofer_plan`.
- **AI-leverage taxonomy** — Enforced four-verb vocabulary applied to every
  TO-BE value-stream step: **Replace** (AI removes the step), **Augment** (AI
  assists, human decides), **Automate** (AI runs unattended), **Observe** (AI
  monitors/alerts). Colour-coded; counted on Impact Canvas.
- **C4 Context / Container / Component** — Layered architecture views per the C4
  model. Context renders external systems and actors; Container renders
  deployable units; Component renders internal modules. This feature emits
  Context (in `/1_gofer_research`) and Container (in `/3_gofer_plan`).
- **Value-stream AS-IS** — Swim-lane Mermaid `flowchart LR` of the current
  process, emitted in `/0a_problem_validation`.
- **Value-stream TO-BE** — Swim-lane Mermaid `flowchart LR` of the proposed
  process with every step tagged with one of the four AI-leverage verbs, emitted
  in `/2_gofer_specify`. Hard gate before `/3_gofer_plan`.
- **Capability heatmap** — Mermaid `quadrantChart` of capability impact plus a
  tabular complement, emitted in `/1_gofer_research`.
- **Bounded-context map** — Mermaid `flowchart` of bounded contexts and their
  contracts, emitted in `/3_gofer_plan`.
- **ERD** — Mermaid `erDiagram` of the proposed data model, emitted in
  `/3_gofer_plan`.
- **Stakeholder pack** — Composite `stakeholder-pack.md` produced in
  `/7a_stakeholder_comms`, with optional Marp deck and optional `mmdc` PNG/SVG
  renders.
- **`/gofer:*` namespace** — Additive alias surface (`/gofer:research`,
  `/gofer:specify`, `/gofer:plan`, etc.) routing to existing numbered-stage
  skill bodies. No rename of existing commands.
- **`gofer codex doctor`** — Read-only diagnostic that scans `~/.codex/skills`,
  lists duplicate Gofer bundles, prints over-budget paths, and emits a
  paste-ready `[[skills.config]] enabled = false` block for
  `~/.codex/config.toml`. Never modifies disk.

---

## Research Traceability

| Research finding / decision / constraint (research.md)                                                                       | Spec section addressing it                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Problem statement — non-dev personas can't read the spec on one page                                                         | Overview; User Story 1, 2; FR-016, FR-018, FR-027                                                                              |
| Problem statement — AI-leverage hidden inside option-spectrum                                                                | FR-018, FR-026; Glossary "AI-leverage taxonomy"                                                                                |
| Problem statement — five-copy command drift                                                                                  | FR-001, FR-002; Assumption 13; Dependencies                                                                                    |
| Problem statement — no plugin/extension/picker/`/side`/`/personality`/queued input                                           | User Story 5, 8; FR-005, FR-012, FR-013, FR-014, FR-015, FR-031, FR-032, FR-033                                                |
| Target persona — strategy-minded engineering leader                                                                          | User Story 1, 2, 3, 4                                                                                                          |
| Value proposition: 100% feature folders ship `impact-canvas.md`                                                              | SC-001                                                                                                                         |
| Value proposition: ≥4 of 6 visuals auto-generated                                                                            | SC-002                                                                                                                         |
| Value proposition: command picker reduces stage-lookup time ≥50%                                                             | SC-004; FR-034                                                                                                                 |
| Value proposition: shipped as Claude plugin + Gemini extension + Codex AGENTS.md                                             | FR-031, FR-032, FR-033                                                                                                         |
| Scenario A (CLI parity only) — absorbed into C                                                                               | Out of Scope                                                                                                                   |
| Scenario B (visual-first only) — absorbed into C                                                                             | Out of Scope                                                                                                                   |
| Scenario C — adopted                                                                                                         | Overview; phase split across FRs                                                                                               |
| Scenario D — North Star, deferred                                                                                            | Out of Scope                                                                                                                   |
| Decision 1: Mermaid in Markdown                                                                                              | NFR-007, NFR-008; FR-016 through FR-025; Out of Scope (PlantUML/D2/Structurizr)                                                |
| Decision 2: Markdown-first + optional mmdc                                                                                   | FR-029; NFR-010                                                                                                                |
| Decision 3: source-of-truth = YAML+Markdown                                                                                  | FR-001; Assumption 5                                                                                                           |
| Decision 4: four-CLI packaging                                                                                               | FR-031, FR-032, FR-033; NFR-007                                                                                                |
| Decision 5: `/gofer:*` namespace + numbered alias retained                                                                   | FR-005; Assumption 3; Out of Scope (rename)                                                                                    |
| Decision 6: 4-verb AI-leverage taxonomy                                                                                      | FR-018, FR-026; Assumption 7; Glossary                                                                                         |
| Architecture A (template-and-sub-agent + source-of-truth)                                                                    | Assumption 8; FR-001 through FR-009; FR-016 through FR-025                                                                     |
| Architecture B/C/D rejected                                                                                                  | Out of Scope                                                                                                                   |
| Innovation: Codex `/plan`                                                                                                    | FR-012                                                                                                                         |
| Innovation: Codex `/side`                                                                                                    | FR-013                                                                                                                         |
| Innovation: Codex `/personality`                                                                                             | FR-014                                                                                                                         |
| Innovation: Codex queued input                                                                                               | FR-015; User Story 8                                                                                                           |
| Innovation: Gemini TOML `{{args}}` + `@{path}`                                                                               | FR-032                                                                                                                         |
| Innovation: Gemini namespaced subfolder commands                                                                             | FR-005, FR-032                                                                                                                 |
| Innovation: Gemini extensions packaging                                                                                      | FR-032                                                                                                                         |
| Innovation: Claude skill auto-invocation                                                                                     | FR-001, FR-006, FR-031                                                                                                         |
| Innovation: Claude plugin marketplace                                                                                        | FR-031; Out of Scope (marketplace destination)                                                                                 |
| Innovation: Claude agent teams + Opus coordinator                                                                            | FR-004 (preserves existing 37 sub-agents); persona-pack writers parallelise per Architecture A                                 |
| Innovation: Mermaid as first-class output                                                                                    | FR-016 through FR-025                                                                                                          |
| Innovation: Copilot picker + fuzzy                                                                                           | User Story 5; FR-005                                                                                                           |
| Innovation: Copilot autopilot vs plan                                                                                        | FR-012                                                                                                                         |
| Innovation: Copilot `/delegate`                                                                                              | Out of Scope (deferred); referenced in research only                                                                           |
| Codebase analysis: today's three diagrams + ASCII bars                                                                       | FR-025 (replaces ASCII bars); preserved by Invariant 1                                                                         |
| Codebase analysis: `option-spectrum.yaml` highlight pattern reused                                                           | FR-018 (TO-BE colour-coding); Dependencies                                                                                     |
| Codebase analysis: `stakeholder-comms-template.md` references diagram never generated                                        | FR-028 (real generated diagrams replace text references)                                                                       |
| Integration point: `/0a_problem_validation` → `value-stream-asis` + `capability-heatmap`                                     | FR-017, FR-021 (heatmap surfaces in `/1_gofer_research` per "where to implement" placement; AS-IS in `/0a_problem_validation`) |
| Integration point: `/1_gofer_research` → `c4-context`                                                                        | FR-019                                                                                                                         |
| Integration point: `/2_gofer_specify` → `impact-canvas` + `value-stream-tobe` (REQUIRED gate)                                | FR-016, FR-018; SC-001, SC-010                                                                                                 |
| Integration point: `/3_gofer_plan` → `c4-container` + `bounded-context` + `data-model-erd`                                   | FR-020, FR-022, FR-023                                                                                                         |
| Integration point: `/6_gofer_validate` → `risk-heatmap` + ROI `xychart-beta`                                                 | FR-024, FR-025                                                                                                                 |
| Integration point: `/7a_stakeholder_comms` → stakeholder-pack                                                                | FR-028, FR-029, FR-030                                                                                                         |
| Constraint: Mermaid ceiling — beta constructs may fail                                                                       | NFR-010; Edge Cases                                                                                                            |
| Constraint: Cross-CLI fidelity — Copilot doesn't render inline                                                               | NFR-007; FR-029                                                                                                                |
| Constraint: Five-copy drift                                                                                                  | FR-001, FR-002; Assumption 13                                                                                                  |
| Constraint: EnterpriseAI flag — market/business analysis always emitted                                                      | FR-035; Assumption 11                                                                                                          |
| Constraint: novice guardrail — plain-language paragraph first                                                                | FR-027; Assumption 12                                                                                                          |
| Constraint: no-regression invariant                                                                                          | Assumption 3; FR-002, FR-003, FR-004; SC-005, SC-008                                                                           |
| Constraint: Codex skill-budget hygiene (≤140 chars, flat tree, exclusion, doctor, `.agents/skills/` doc, no fake config key) | Assumption 4; FR-006, FR-007, FR-008, FR-009, FR-010, FR-011; SC-003, SC-006, SC-011, SC-012; User Story 6                     |
| Open question: source-of-truth format                                                                                        | Resolved — Assumption 5                                                                                                        |
| Open question: `/gofer:` rename vs alias                                                                                     | Resolved — Assumption 3, FR-005                                                                                                |
| Open question: marketplace destination                                                                                       | Out of Scope (deferred to Phase 3)                                                                                             |
| Open question: mmdc dev dep vs GitHub Action                                                                                 | Out of Scope (deferred to Phase 3)                                                                                             |
| Open question: AI-leverage prescribe vs freeform                                                                             | Resolved — Assumption 7, FR-018, FR-026                                                                                        |
| Recommendation: Phase 1 / 2 / 3 split                                                                                        | Overview; FRs grouped by phase                                                                                                 |
| Recommendation: `impact-canvas.md` + TO-BE value-stream as hard gates                                                        | FR-016, FR-018; SC-001, SC-010                                                                                                 |
| Recommendation: validation council named as agent team                                                                       | Preserved by Invariant 1; not renamed in this feature                                                                          |
| Recommendation: Scenario D as North Star                                                                                     | Out of Scope                                                                                                                   |
