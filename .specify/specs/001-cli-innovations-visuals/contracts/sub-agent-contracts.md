---
feature: 001-cli-innovations-visuals
contract: sub-agent-contracts
status: draft
created: 2026-04-25
---

# Visual-Writer Sub-Agent Contracts

This document defines the invocation contract for each NEW visual-writer
sub-agent introduced by this feature. There are **7 new sub-agents**, all under
`.claude/agents/`, each producing one (or in two cases two) persona-pack
artifacts.

The contract for each agent specifies:

- `subagent_type` (matches `Task` tool's `subagent_type` argument).
- Recommended model (Opus for design-sensitive synthesis; Sonnet for mechanical
  translation).
- Inputs (which files the agent MUST `Read` before writing).
- Output schema reference (subtype in `data-model.md` `VisualArtifact`).
- Mandatory output fields (e.g. `plainLanguagePreamble` per FR-027; AI-leverage
  tag per FR-018/FR-026).
- Mermaid block kinds expected.
- Failure modes & retry policy.
- Served user stories + FRs.
- One acceptance test prompt that `/4_gofer_tasks` can lift into a concrete
  test.

All seven agents share three universal contract clauses:

- **Universal-1 — Plain-language preamble required (FR-027)**: every artifact
  MUST open with at least one paragraph (≥30 words, ≤200 words) of
  plain-language explanation BEFORE the first Mermaid fence.
- **Universal-2 — Markdown-first (NFR-007, NFR-008)**: the agent writes Markdown
  only. It NEVER writes binary files. Rendering to PNG/SVG is the responsibility
  of the optional `mermaid-export.mjs` step.
- **Universal-3 — Tabular fallback hook (NFR-010)**: every Mermaid block MUST be
  followed by a `<!-- fallback-table -->` HTML comment immediately preceding a
  Markdown table that conveys the same data, so the renderer fallback (Edge Case
  "Mermaid renderer failure") has a stable insertion point.

---

## 1. visual-canvas-writer

### Identity

- **subagent_type**: `visual-canvas-writer`
- **File**: `.claude/agents/visual-canvas-writer.md`
- **Recommended model**: Opus (single-page synthesis across stakeholder map, KPI
  tiles, AI-leverage Ring, ROI band, primary persona, top-three risks; high
  stakes — this artifact is the executive-facing one-pager).
- **Invoked by**: TWO stages — **two-pass model** to handle risk chronology:
  1. **Pass 1 — `/2_gofer_specify` (initial)**: end-of-stage, after the spec
     body and `value-stream-tobe.md` are written. The AI-leverage Ring depends
     on TO-BE counts per FR-026. **Top-three risks** in pass 1 are heuristically
     pulled from `spec.md`'s NFR (Non-Functional Requirements) and Out-of-Scope
     sections — these are the initial risks knowable at specify time.
  2. **Pass 2 — `/6_gofer_validate` (regeneration)**: the canvas's
     `topThreeRisks` section is REGENERATED from the validation council's
     authoritative risk list (FR-024) after Phase C completes. All other canvas
     sections (stakeholder mindmap, AI-leverage Ring, KPI tiles, ROI band,
     primary persona) remain unchanged unless the spec or TO-BE has changed;
     only the risk section is replaced. The pass-2 invocation is wired in Tech
     Phase 2.4 (`/6_gofer_validate` stage command) and verified in Tech Phase
     2.6.

### Inputs (must Read)

- `.specify/specs/<feature>/spec.md` — for primary persona, ROI band. **Pass
  1**: top-three risks pulled heuristically from `spec.md`'s NFR + Out-of-Scope
  sections. **Pass 2**: top-three risks pulled from validation-council outputs
  (see below).
- `.specify/specs/<feature>/research.md` — for stakeholder taxonomy.
- `.specify/specs/<feature>/value-stream-tobe.md` — for AI-leverage verb counts
  (Replace/Augment/Automate/Observe). MUST exist; if absent, agent fails with
  `MISSING_PRECURSOR`.
- `.specify/templates/impact-canvas-template.md` — output skeleton.
- **Pass 2 only**: `.specify/specs/<feature>/risk-heatmap.md` and the
  validation-council outputs in `.specify/specs/<feature>/validation/` — these
  are the authoritative source for the regenerated `topThreeRisks` section.

### Output

- **Path**: `.specify/specs/<feature>/impact-canvas.md`
- **Schema**: `VisualArtifact.ImpactCanvas` (data-model.md).
- **Mermaid blocks**:
  1. One `mindmap` block — stakeholder map.
  2. One `pie` block — AI-leverage Ring (counts of
     Replace/Augment/Automate/Observe). MUST be `pie`, NOT `xychart-beta`.
     Rationale: a four-segment ring is the natural visual for the four-verb
     taxonomy and `pie` is a stable (non-beta) Mermaid construct.
  3. (Optional) one `xychart-beta` bar block for KPI tiles.
- **Mandatory fields**:
  - `plainLanguagePreamble` (Universal-1).
  - `stakeholderMindmap` — Mermaid mindmap with at least one named primary
    persona.
  - `aiLeverageRing` — counts MUST equal the parser-derived counts of
    `value-stream-tobe.md` (FR-026).
  - `kpiTiles` — at least 3, each `{name, value, unit}`.
  - `roiBand` — one of `{<6mo, 6-12mo, 12-24mo, >24mo}`.
  - `primaryPersona` — single named persona (string).
  - `topThreeRisks` — array length exactly 3.

### Failure modes & retry

- `MISSING_PRECURSOR`: `value-stream-tobe.md` not present → agent halts; gate
  logic in `/2_gofer_specify` blocks `/3_gofer_plan` and surfaces a remediation
  prompt.
- `LEVERAGE_MISMATCH`: counts in canvas do not match parser output of TO-BE
  flowchart → agent retries up to 2x re-reading TO-BE; on third failure
  escalates to user with the diff.
- `OVERSIZED_PAGE`: artifact exceeds 1 viewport at 1080p (heuristic: >120 lines
  or >12KB Markdown) → agent compresses preamble + drops optional KPI block;
  retries once.

### Serves

FR-016, FR-026, FR-027; SC-001, SC-009, SC-010; User Stories 1, 2.

### Acceptance test

Given a fixture feature folder where `value-stream-tobe.md` contains exactly 3
Replace, 2 Augment, 4 Automate, 1 Observe step, invoke `visual-canvas-writer`.
Assert `impact-canvas.md` is created with `aiLeverageRing` counts
`{replace: 3, augment: 2, automate: 4, observe: 1}` and an opening
plain-language paragraph ≥30 words.

---

## 2. visual-c4-writer

### Identity

- **subagent_type**: `visual-c4-writer`
- **File**: `.claude/agents/visual-c4-writer.md`
- **Recommended model**: Opus (architectural synthesis; both Context and
  Container views).
- **Invoked by**: TWO stages — `/1_gofer_research` (for `c4-context.md`) and
  `/3_gofer_plan` (for `c4-container.md`). The agent dispatches on stage
  context.

### Inputs (must Read)

- For `c4-context.md`:
  - `.specify/specs/<feature>/research.md`
  - `.specify/templates/c4-context-template.md`
- For `c4-container.md`:
  - `.specify/specs/<feature>/spec.md`
  - `.specify/specs/<feature>/plan.md` (in-progress at invocation time)
  - `.specify/specs/<feature>/c4-context.md` (must exist; consistency anchor)
  - `.specify/templates/c4-container-template.md`

### Outputs

- **Paths**: `.specify/specs/<feature>/c4-context.md` and
  `.specify/specs/<feature>/c4-container.md`.
- **Schema**: `VisualArtifact.C4Context` and `VisualArtifact.C4Container`.
- **Mermaid blocks**:
  - Context: one `C4Context` block with at least one `Person` and one `System`
    element, plus named external systems.
  - Container: one `C4Container` block with at least 2 containers and their
    relationships.
- **Mandatory fields**:
  - `plainLanguagePreamble` (Universal-1).
  - Context: `externalSystems` array, `primaryActor` string.
  - Container: `containers` array with each
    `{name, technology, responsibility}`; consistency check that every Container
    element references a System named in `c4-context.md`.

### Failure modes & retry

- `MISSING_CONTEXT_PRECURSOR` (Container only): `c4-context.md` not present →
  agent halts and emits a remediation prompt naming the missing file.
- `RENDER_BETA_FAIL`: C4 is a beta Mermaid construct — if `mmdc --check` (when
  available) reports a parse error, the agent emits the Mermaid block AND a
  tabular fallback (Universal-3) AND logs a warning to the hook log.
- `INCONSISTENCY`: Container references a System not in Context → agent retries
  once; on second failure escalates with the diff.

### Serves

FR-019, FR-020, FR-027; User Stories 3, 4.

### Acceptance test

Run `/1_gofer_research` to completion; assert `c4-context.md` exists with a
parseable Mermaid `C4Context` block containing at least one `Person(...)` and
one `System(...)` element. Then run `/3_gofer_plan`; assert `c4-container.md`
exists, every `Container(...)` element's parent system is named in
`c4-context.md`, and the file opens with a plain-language paragraph.

---

## 3. visual-value-stream-writer

### Identity

- **subagent_type**: `visual-value-stream-writer`
- **File**: `.claude/agents/visual-value-stream-writer.md`
- **Recommended model**: Opus (TO-BE requires AI-leverage tagging, which is the
  highest-value classification in the entire feature).
- **Invoked by**: TWO stages — `/0a_problem_validation` (for AS-IS) and
  `/2_gofer_specify` (for TO-BE).

### Inputs (must Read)

- For `value-stream-asis.md`:
  - `.specify/specs/<feature>/research.md`
  - `.specify/specs/<feature>/spec.md` (problem framing only)
  - `.specify/templates/value-stream-asis-template.md`
- For `value-stream-tobe.md`:
  - `.specify/specs/<feature>/value-stream-asis.md` (must exist)
  - `.specify/specs/<feature>/spec.md`
  - `.specify/templates/value-stream-tobe-template.md`
  - `extension/resources/templates/sequence-diagrams/option-spectrum.yaml` — for
    the `rect rgb()` highlight pattern reuse.

### Outputs

- **Paths**: `.specify/specs/<feature>/value-stream-asis.md` and
  `.specify/specs/<feature>/value-stream-tobe.md`.
- **Schema**: `VisualArtifact.ValueStreamAsIs` and
  `VisualArtifact.ValueStreamToBe`.
- **Mermaid blocks**:
  - AS-IS: one `flowchart LR` with swim-lane subgraphs (one per actor).
  - TO-BE: one `flowchart LR` with swim-lane subgraphs PLUS per-step AI-leverage
    tagging.

### Mandatory fields — TO-BE specific

- **AiLeverageTag REQUIRED on every step** (FR-018, FR-026):
  - Every node in the TO-BE flowchart MUST carry exactly one of the four verb
    tags: `[R]` Replace, `[U]` Augment, `[A]` Automate, `[O]` Observe.
  - Encoded as: node id suffix or node label prefix in the Mermaid source AND a
    fenced YAML block at the end of the file under heading
    `## AI-Leverage Tags`:
    ```yaml
    steps:
      - id: step-1
        label: 'Validate input'
        tag: Replace
      - id: step-2
        label: 'Approve order'
        tag: Augment
    ```
  - The parser used by `visual-canvas-writer` (FR-026) reads this YAML block,
    NOT the Mermaid source, so cross-artifact consistency is unambiguous.
- **Color coding**: each verb maps to a fixed colour via `rect rgb(...)`
  highlight (reused from `option-spectrum.yaml`):
  - Replace → `rgb(255, 99, 71)` (tomato)
  - Augment → `rgb(255, 215, 0)` (gold)
  - Automate → `rgb(60, 179, 113)` (medium sea green)
  - Observe → `rgb(100, 149, 237)` (cornflower blue)
- **Plain-language change paragraph**: TO-BE MUST include a "What's changed from
  AS-IS" paragraph immediately after the Universal-1 preamble (User Story 2
  Acceptance Scenario 2).

### Failure modes & retry

- `UNTAGGED_STEP`: any TO-BE step lacks an AI-leverage tag → agent halts; gate
  in `/2_gofer_specify` blocks `/3_gofer_plan` and prompts the user with the
  offending step IDs.
- `INVALID_TAG`: a tag is not one of the four verbs → agent halts with the
  offending value.
- `MISSING_ASIS`: AS-IS missing when TO-BE is invoked → agent halts.

### Serves

FR-017, FR-018, FR-026, FR-027; SC-010; User Stories 1, 2, 3.

### Acceptance test

Run `/0a_problem_validation` and `/2_gofer_specify` end-to-end. Parse
`value-stream-tobe.md`'s `## AI-Leverage Tags` YAML block. Assert (a) every step
in the Mermaid flowchart has a corresponding YAML entry, (b) every YAML entry's
`tag` is one of the four verbs, and (c) `value-stream-asis.md` exists with a
`flowchart LR` and at least one swim-lane subgraph.

---

## 4. visual-heatmap-writer

### Identity

- **subagent_type**: `visual-heatmap-writer`
- **File**: `.claude/agents/visual-heatmap-writer.md`
- **Recommended model**: Sonnet (deterministic mapping of capabilities onto the
  quadrant axes; lower-stakes synthesis).
- **Invoked by**: `/1_gofer_research`.

### Inputs (must Read)

- `.specify/specs/<feature>/research.md` — for capability inventory.
- `.specify/specs/<feature>/spec.md` — for which capabilities are
  touched/replaced/extended.
- `.specify/templates/capability-heatmap-template.md`.
- (Optional) `.specify/references/eai/capability-inventory.md` if present in the
  project.

### Output

- **Path**: `.specify/specs/<feature>/capability-heatmap.md`.
- **Schema**: `VisualArtifact.CapabilityHeatmap`.
- **Mermaid block**: one `quadrantChart` with the four-axis convention (x: AI
  Leverage Low→High; y: Business Impact Low→High).
- **Mandatory fields**:
  - `plainLanguagePreamble` (Universal-1).
  - `capabilities` — each
    `{name, status: "touched"|"replaced"|"extended", x: 0..1, y: 0..1}`.
  - `tabularComplement` — the `<!-- fallback-table -->` table (Universal-3)
    listing every capability and its status.

### Failure modes & retry

- `RENDER_BETA_FAIL`: `quadrantChart` is beta — emit Mermaid + tabular fallback
  (Universal-3); never block.
- `EMPTY_INVENTORY`: no capabilities resolvable from research.md → agent emits a
  single-row placeholder with `status: "to-be-identified"` AND a TODO note in
  the preamble.

### Serves

FR-021, FR-027, NFR-010; User Story 4.

### Acceptance test

Run `/1_gofer_research` against a fixture with a known capability inventory of 5
capabilities (2 touched, 1 replaced, 2 extended). Assert `capability-heatmap.md`
contains a `quadrantChart` with all 5 capabilities plotted and a fallback table
with 5 rows.

---

## 5. visual-bounded-context-writer

### Identity

- **subagent_type**: `visual-bounded-context-writer`
- **File**: `.claude/agents/visual-bounded-context-writer.md`
- **Recommended model**: Opus (DDD-style bounded-context identification requires
  non-trivial synthesis from spec + plan).
- **Invoked by**: `/3_gofer_plan`.

### Inputs (must Read)

- `.specify/specs/<feature>/spec.md`
- `.specify/specs/<feature>/plan.md` (in-progress at invocation time)
- `.specify/specs/<feature>/c4-container.md` (must exist; bounded contexts often
  align with containers)
- `.specify/templates/bounded-context-template.md`

### Output

- **Path**: `.specify/specs/<feature>/bounded-context.md`.
- **Schema**: `VisualArtifact.BoundedContext`.
- **Mermaid block**: one `flowchart` (TB or LR) with each bounded context as a
  subgraph, contracts as labelled edges between subgraphs.
- **Mandatory fields**:
  - `plainLanguagePreamble` (Universal-1).
  - `contexts` — array, each
    `{name, ownership, language, contractsExposed: [...], contractsConsumed: [...]}`.
  - Every context named in the Mermaid block MUST appear in the `contexts` array
    (cross-check enforced by parser).

### Failure modes & retry

- `MISSING_CONTAINER_PRECURSOR`: `c4-container.md` not present → agent halts.
- `UNNAMED_CONTEXT`: any subgraph in Mermaid lacks a name or has duplicate names
  → agent retries once.

### Serves

FR-022, FR-027; User Stories 3, 4.

### Acceptance test

Run `/3_gofer_plan` after `/1_gofer_research` (which populates `c4-container.md`
via visual-c4-writer). Assert `bounded-context.md` contains a `flowchart` with
at least 2 subgraphs and that every subgraph name is also listed in the
`contexts` YAML/Markdown array.

---

## 6. visual-erd-writer

### Identity

- **subagent_type**: `visual-erd-writer`
- **File**: `.claude/agents/visual-erd-writer.md`
- **Recommended model**: Sonnet (mechanical translation from data-model.md or
  plan.md to ERD; well-understood mapping).
- **Invoked by**: `/3_gofer_plan`.

### Inputs (must Read)

- `.specify/specs/<feature>/plan.md` (data-model section)
- `.specify/specs/<feature>/data-model.md` (if generated by plan stage;
  canonical input)
- `.specify/templates/data-model-erd-template.md`

### Output

- **Path**: `.specify/specs/<feature>/data-model-erd.md`.
- **Schema**: `VisualArtifact.DataModelErd`.
- **Mermaid block**: one `erDiagram`.
- **Mandatory fields**:
  - `plainLanguagePreamble` (Universal-1).
  - `entities` — each `{name, attributes: [{name, type, key?: "PK"|"FK"}]}`.
  - `relationships` — each `{from, to, cardinality, label}` matching Mermaid
    `erDiagram` syntax.

### Failure modes & retry

- `EMPTY_MODEL`: no entities discoverable → agent emits a single placeholder
  entity `Feature` and a TODO note.
- `MERMAID_PARSE_FAIL`: invalid `erDiagram` syntax → agent retries once with
  stricter formatting; on second failure emits tabular fallback (Universal-3)
  and warns.

### Serves

FR-023, FR-027; User Story 3.

### Acceptance test

Run `/3_gofer_plan` against a fixture with a known data-model.md containing 3
entities and 2 relationships. Assert `data-model-erd.md` has a Mermaid
`erDiagram` with all 3 entities + 2 relationships, and a fallback table listing
each entity's attributes.

---

## 7. visual-risk-writer

### Identity

- **subagent_type**: `visual-risk-writer`
- **File**: `.claude/agents/visual-risk-writer.md`
- **Recommended model**: Opus (cross-validation council synthesis; risk plotting
  requires nuanced likelihood × impact judgement).
- **Invoked by**: `/6_gofer_validate` after the validation council has produced
  its risk list.

### Inputs (must Read)

- `.specify/specs/<feature>/spec.md`
- `.specify/specs/<feature>/plan.md`
- Validation council outputs in `.specify/specs/<feature>/validation/` (six
  validators per existing pipeline pattern).
- `.specify/specs/<feature>/spec-summary.md` (in-progress at invocation time —
  risk-writer also populates the embedded ROI xychart-beta block here per
  FR-025).
- `.specify/templates/risk-heatmap-template.md`
- `extension/resources/templates/spec-summary-template.md` (for the embedded ROI
  chart contract).
- `extension/resources/templates/business-metrics-template.md` (replaces ASCII
  bars — FR-025).

### Outputs

- **Path 1**: `.specify/specs/<feature>/risk-heatmap.md`.
- **Path 2 (in-place edit)**: ROI `xychart-beta` block embedded into
  `.specify/specs/<feature>/spec-summary.md` and refreshed `business-metrics.md`
  (replaces the ASCII bar pattern at `business-metrics-template.md:31-34`).
- **Schema**: `VisualArtifact.RiskHeatmap` (for the standalone file) and
  `VisualArtifact.RoiChart` (for the embedded ROI block).
- **Mermaid blocks**:
  - Risk heatmap: one `quadrantChart` (x: Likelihood Low→High; y: Impact
    Low→High).
  - ROI chart: one `xychart-beta` (bar) showing payback projection over time.
- **Mandatory fields**:
  - `plainLanguagePreamble` (Universal-1) — required on the standalone risk file
    AND on the spec-summary section preceding the ROI chart.
  - `risks` — each
    `{id, title, likelihood: 0..1, impact: 0..1, source: "<validator-name>"}`.
  - `topQuadrantSummary` — prose summary of the high-likelihood × high-impact
    quadrant.
  - ROI: `paybackBand`, `bars` array `{period, value}`.

### Failure modes & retry

- `EMPTY_RISKS`: validation council produced no risks → agent emits an explicit
  "No risks identified by the validation council; document this as an
  assumption" entry and proceeds.
- `RENDER_BETA_FAIL` (both quadrantChart and xychart-beta are beta) → emit
  Mermaid + tabular fallback (Universal-3); never block.
- `ASCII_BAR_LEAK`: if any `[▓░]` ASCII pattern remains in `business-metrics.md`
  after agent run → agent retries the replacement once; on second failure emits
  a warning and surfaces the offending lines.

### Serves

FR-024, FR-025, FR-027, NFR-010; User Story 4.

### Acceptance test

Run `/6_gofer_validate` against a fixture where the validation council produces
5 risks. Assert (a) `risk-heatmap.md` contains a `quadrantChart` with 5 plotted
points and a top-quadrant prose summary, (b) `spec-summary.md` contains an
`xychart-beta` block with at least one bar series, (c)
`grep -c '▓\|░' business-metrics.md` returns 0 (ASCII bars removed per FR-025).

---

## 8. Summary

| #         | Sub-agent                       | Stage(s) invoked                             | Artifact(s)                                    | Recommended model |
| --------- | ------------------------------- | -------------------------------------------- | ---------------------------------------------- | ----------------- |
| 1         | `visual-canvas-writer`          | `/2_gofer_specify`                           | `impact-canvas.md`                             | Opus              |
| 2         | `visual-c4-writer`              | `/1_gofer_research`, `/3_gofer_plan`         | `c4-context.md`, `c4-container.md`             | Opus              |
| 3         | `visual-value-stream-writer`    | `/0a_problem_validation`, `/2_gofer_specify` | `value-stream-asis.md`, `value-stream-tobe.md` | Opus              |
| 4         | `visual-heatmap-writer`         | `/1_gofer_research`                          | `capability-heatmap.md`                        | Sonnet            |
| 5         | `visual-bounded-context-writer` | `/3_gofer_plan`                              | `bounded-context.md`                           | Opus              |
| 6         | `visual-erd-writer`             | `/3_gofer_plan`                              | `data-model-erd.md`                            | Sonnet            |
| 7         | `visual-risk-writer`            | `/6_gofer_validate`                          | `risk-heatmap.md` + ROI in `spec-summary.md`   | Opus              |
| **Total** | **7 sub-agents**                | —                                            | **9 standalone artifacts + 1 embedded chart**  | —                 |

All seven sub-agents enforce Universal-1 (plain-language preamble), Universal-2
(Markdown-first), and Universal-3 (tabular fallback hook). Sub-agent #3
additionally enforces the AI-leverage 4-verb tagging contract (FR-018, FR-026).
Sub-agent #1 reads the parser output of #3's TO-BE artifact to populate the
AI-leverage Ring (FR-026 — single source of truth across artifacts).
