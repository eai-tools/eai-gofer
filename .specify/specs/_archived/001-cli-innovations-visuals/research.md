---
date: 2026-04-25T00:00:00Z
researcher: Claude
feature: 'CLI Innovations + Multi-Persona Visual Artifacts'
status: complete
competitiveAnalysisEnabled: true
workflowProfile: enterpriseai
---

# Research: CLI Innovations + Multi-Persona Visual Artifacts

## Feature Summary

Two-part uplift to Gofer. **Part 1** adopts slash-command and agent UX features
shipped by Claude Code, Gemini CLI, Codex CLI and Copilot CLI through April 2026
so Gofer feels native across every surface it runs on. **Part 2** introduces a
set of persona-shaped visual artifacts (C4, value-stream AS-IS/TO-BE with
AI-leverage overlay, capability heatmap, one-page Impact Canvas, ERD,
bounded-context map, ROI/risk charts) that Gofer does not produce today so that
strategy consultants, business stakeholders, developers and enterprise
architects can all read the _same_ spec on a single page.

Both parts are tightly coupled: new commands (e.g. `/gofer:poster`, `/side`,
`/plan`) are the delivery mechanism for the new visuals, and the visuals are the
thing that makes the pipeline output legible to non-developers.

## Structured Discovery Output

### Problem Statement

- **Problem**: Gofer's pipeline today produces developer-grade Markdown with
  only three Mermaid sequence diagrams (journey + option-spectrum) and one cloud
  topology. Strategy consultants, executives, business owners and enterprise
  architects cannot read the spec on one page and cannot see _where AI actually
  consolidates work_ in the process being designed. Simultaneously, Gofer's
  slash-command UX has fallen behind what users now expect from Claude Code,
  Gemini CLI, Codex CLI and Copilot CLI (plugin marketplaces,
  picker/autocomplete, `/plan`, `/side`, `/personality`, queued input, `@{}`
  file injection, `{{args}}` templating, agent teams).
- **Current State Friction**:
  - Non-developer personas either wait for the dev team to paraphrase the spec
    or bounce off. Stakeholder comms are prose only
    (`stakeholder-comms-template.md` only _references_ a diagram it never
    generates).
  - The AI-leverage story is hidden inside `option-spectrum.yaml` as
    `rect rgb()` notes inside sequence diagrams — it is not visible at the
    business-process level.
  - Commands drift between `.claude/commands/`,
    `extension/resources/copilot-prompts/`, `.github/prompts/`,
    `.agents/skills/` and `.system/skills/` (16 stages x 4 copies).
  - No plugin/extension packaging, no marketplace distribution, no command
    picker, no `/side` conversations, no `/personality`, no queued input during
    running stages.
- **Desired EnterpriseAI Outcome**: a single Gofer run produces (a) a command
  surface that feels first-class in all four CLIs and (b) a 6-artifact "persona
  pack" (Impact Canvas + C4 Context + AS-IS/TO-BE value stream with AI-leverage
  overlay + capability heatmap + ERD/bounded-context map + risk & ROI charts) so
  a CIO, a strategy consultant, a product owner and the implementing engineer
  can each pick up the same feature folder and act.

### Target Persona

- **Primary Persona**: Strategy-minded Engineering Leader / Enterprise Architect
  running the Gofer pipeline on behalf of a mixed audience.
- **Skill Level**: intermediate–advanced (CLI-literate, but responsible for
  communicating to non-CLI stakeholders).
- **Top Needs**:
  1. One-page visual that any exec can read in 60 seconds.
  2. An AI-leverage view that makes _"what work disappears / consolidates / gets
     automated"_ obvious.
  3. A command UX that does not require remembering 16 numbered stage names.
- **Constraints**: Must not break the current pipeline, must keep working
  offline in VSCode, must not hard-fail when a non-Claude CLI
  (Gemini/Codex/Copilot) is used, must remain Markdown-first (diffable) with
  rendering as a layer on top.

### Value Proposition

- **Primary Value**: Every Gofer feature folder becomes self-explanatory to four
  personas simultaneously, and the same folder works across four agent CLIs.
- **Measurable Goal**:
  - 100% of new features produce an `impact-canvas.md` with embedded Mermaid
    diagrams before `/2_gofer_specify` finishes.
  - ≥ 4 of the 6 proposed visuals are auto-generated per feature.
  - Command picker / namespaced commands (`/gofer:…`) reduce stage-lookup time
    (measured via hook log) by ≥ 50%.
  - Packaging: Gofer shipped as one Claude Code plugin + one Gemini extension +
    one Codex `AGENTS.md` bundle, with a shared source-of-truth.
- **EnterpriseAI-First Rationale**: Gofer's differentiator is _not_ that it
  writes code — every CLI does that — it is that it makes _the design of
  AI-enabled work_ legible across roles. Visuals + multi-CLI packaging is the
  thinnest wedge that makes that differentiator real.

## Business Scenario Analysis

### Scenario Options Considered

| Scenario                                                                                                                                                                                                                                                                                                                                              | User/Business Fit                                     | Delivery Trade-off                                                              | Recommendation                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **A. CLI parity only** — adopt picker, `/plan`, `/side`, `/personality`, queued input, `@{}` injection, `{{args}}`, plugin packaging. No new visuals.                                                                                                                                                                                                 | Fast dev-UX win; no shift for non-devs.               | ~2 weeks; low risk. Leaves the main complaint (non-dev legibility) unaddressed. | Defer as standalone — absorb into C.                    |
| **B. Visual-first uplift** — add Impact Canvas, C4, AS-IS/TO-BE value stream with AI-leverage overlay, capability heatmap, ERD, bounded-context map, risk/ROI charts. No CLI changes.                                                                                                                                                                 | Huge leap for consultants/execs/architects.           | ~3 weeks; isolated to templates + new sub-agents. CLI drift grows.              | Defer as standalone — absorb into C.                    |
| **C. Combined dual-track (phased)** — Phase 1: CLI picker + `/plan`/`/side`/`/personality` + TOML/`@{}` sugar + single-source-of-truth generator for commands. Phase 2: Impact Canvas + C4 + value-stream + AI-leverage overlay + capability heatmap + ERD + bounded-context + risk/ROI. Phase 3: Claude plugin + Gemini extension + Codex AGENTS.md. | Addresses _both_ complaints together and phases risk. | ~5–6 weeks total; each phase ships independently.                               | **ADOPT**                                               |
| **D. Re-platform as managed plugin/agent pack** — rebuild Gofer primarily as a marketplace-distributed Claude Code plugin with agent teams (Opus coordinator) + Gemini extension + Codex subagents, with visuals first-class.                                                                                                                         | Highest leverage long-term; best distribution story.  | ~8–10 weeks; requires retiring duplicated command trees. Bigger bet.            | Treat as North Star — Phase 3 of C is the down-payment. |

### Recommended Scenario

**Scenario C — Combined dual-track, three-phase rollout.** It resolves the two
highest-signal problems in parallel, ships the first useful artifact (Impact
Canvas + command picker) in ~2 weeks, and sets up Scenario D as a natural
continuation without committing to the re-platform cost upfront.

## Innovation Insights (from CLI Horizon Scan through 2026-04-25)

### Claude Code (Anthropic) — adopt

- **Skills with auto-invocation**: `.claude/skills/{name}/SKILL.md` files whose
  `description` field lets Claude invoke the skill automatically when the user's
  prompt matches intent. Gofer's 16 stages are all manually triggered today.
- **Plugin marketplaces**: `/plugin install`, `/plugin marketplace add`;
  official marketplace has 101 plugins as of March 2026. Gofer should be
  distributable this way.
- **Agent teams (v2.1.32+)**: Opus coordinates multiple sub-agents in parallel.
  Validation phase already spawns six sub-agents; a named "Chairman/Council"
  pattern would formalise this.
- **Hooks**: `PreToolUse` (can block), `PermissionRequest` (allow/deny
  in-dialog). Gofer has hooks in `settings.json` but none enforce stage gating.
- **Subagent knobs**: `disable-model-invocation: true` (manual-only),
  `context: fork` (run in an isolated context window).
- **Mermaid as a first-class output**: Claude Artifacts renders
  mermaid/svg/jsx/html/pdf; community MCP `veelenga/claude-mermaid` provides
  live-reload preview. Mermaid is ~3–6× more token-efficient than prose.
- **Native `SlashCommand` tool**: the model itself can invoke other slash
  commands — enables Gofer's pipeline to chain without ad-hoc "now invoke /next"
  prose.

### Gemini CLI (Google) — adopt

- **TOML custom slash commands** with `{{args}}`, `--named` args, and `@{path}`
  file-content injection; namespaced via subfolder
  (`<project>/.gemini/commands/gofer/spec.toml` → `/gofer:spec`). Gofer should
  emit a Gemini extension bundle from its source-of-truth templates.
- **Extensions** = MCP server config + `GEMINI.md` playbook + custom commands
  bundled as one unit (enterprise-ready packaging).
- **MCP prompts as slash commands**: any MCP server prompt is exposed as a
  Gemini slash command automatically.

### Codex CLI (OpenAI) — adopt

- **`/plan`** (Plan Mode) — switches active conversation into planning with
  context-usage shown before carrying forward. Gofer's `CLAUDE.md` already
  mandates "Plan Node Default"; `/plan` would make it a first-class command.
- **`/side`** — open a side conversation without derailing the main thread.
  Perfect for "quick clarifier with the business owner" mid-pipeline.
- **`/personality`** — `friendly | pragmatic | none` without rewriting prompts.
  Maps directly onto Gofer's audience shifts (business owner vs engineer).
- **`/review`, `/diff`, `/agent`**, **queued input during work** (slash +
  `!shell` while a job runs), **`/init`** for AGENTS.md scaffolding, subagent
  spawning via `config.toml`.

### Copilot CLI (GitHub) — adopt

- **Slash command picker** with fuzzy/suggestion on misspelled commands — Gofer
  has 16 numbered stages and no picker.
- **Autopilot mode** (Shift+Tab cycles plan → autopilot) — formalises "keep
  going until done" vs "plan first".
- **Aliases**: `/bug`, `/continue`, `/release-notes`, `/export`, `/reset`,
  `/clear`, `/compact`, `/yolo`, `/delegate`, `/mcp`.
- **`/delegate`** to remote PR agent — natural fit for `/7a_stakeholder_comms`
  to hand off to a comms agent.

### Horizon Scan — adjacent patterns

- **C4 model in Mermaid** (`C4Context`, `C4Container`, `C4Component`,
  `C4Dynamic`) — stable in mermaid.js since 2023, now widely supported in VSCode
  preview + mermaid.live.
- **Value-stream / BPMN in Mermaid `flowchart LR` with swim lanes** — the
  accepted lightweight substitute for heavyweight BPMN tools (same diffability
  as Mermaid).
- **Mermaid `quadrantChart`** — lightweight capability heatmap / risk matrix.
- **Mermaid `xychart-beta`** — bar/line charts for ROI payback, velocity,
  cost-per-feature.
- **Mermaid `mindmap`** — stakeholder maps, RACI, capability trees.

## Codebase Analysis

### What Gofer Emits Visually Today

| Where                                                                          | Diagram                                                                   | Persona served  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------- |
| `extension/resources/templates/journey/base-journey.md:60-70`                  | Mermaid `sequenceDiagram` of actors                                       | dev/architect   |
| `extension/resources/templates/sequence-diagrams/option-spectrum.yaml:154-178` | 5 Mermaid sequence diagrams (option 1–5) with `rect rgb()` AI touchpoints | dev             |
| `extension/resources/copilot-prompts/10_gofer_cloud.prompt.md:320-328`         | Mermaid `graph TB` cloud topology                                         | cloud architect |
| `extension/resources/templates/business-metrics-template.md:31-34`             | ASCII bar `[▓▓▓░░]` (not a real chart)                                    | portfolio       |
| `extension/resources/templates/spec-summary-template.md:7-87`                  | Prose one-pager — **no image**                                            | exec            |
| `extension/resources/templates/stakeholder-comms-template.md:96-101`           | Text reference only — **no image generated**                              | exec/change mgr |

**Net**: three real Mermaid diagrams, all technical, all sequence-flavoured. No
C4, no value-stream, no capability heatmap, no BPMN, no ERD, no ROI/risk charts,
no executive one-pager image, no AI-leverage overlay at the business-process
level.

### Command Surface Today

- `.claude/commands/` (16 canonical files) +
  `extension/resources/claude-commands/` mirror +
  `extension/resources/copilot-prompts/` + `.github/prompts/` +
  `.agents/skills/` + `.system/skills/` — **5 copies of each command**, kept in
  sync manually.
- 36 sub-agents at `.claude/agents/` (validation-_, plan-_, research-_,
  specify-_, tasks-_, implement-_, comms-writer, business-problem-validator,
  engineer-review, scope-creep-detector, assumption-tracker).
- Hooks at `.specify/scripts/hooks/`. Three hooks are wired in
  `.claude/settings.json` (UserPromptSubmit, PostToolUse, Stop);
  `session-lifecycle.mjs` exists on disk but is invoked separately, NOT through
  `.claude/settings.json`.
- Stage scripts at `.specify/scripts/bash/` (create-new-feature, log-stage,
  check-context-health, pipeline-state, save-checkpoint,
  sync-implementation-status, etc.).
- No picker, no TOML/Gemini parity, no plugin manifest, no Codex AGENTS.md
  generator, no single-source-of-truth.

### Where to Implement

| Component                          | Location                                                                                                                | Purpose                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-of-truth command generator  | `.specify/scripts/node/generate-commands.mjs` (new)                                                                     | Emit `.claude/commands/*.md`, `extension/resources/copilot-prompts/*.prompt.md`, `.gemini/commands/*.toml`, Codex `AGENTS.md` from one YAML/MD per stage |
| Impact Canvas template             | `.specify/templates/impact-canvas-template.md` (new)                                                                    | One-page executive artifact with Mermaid mindmap + KPI tiles + AI-leverage ring                                                                          |
| C4 context template                | `.specify/templates/c4-context-template.md` (new)                                                                       | Mermaid `C4Context` emitted in `/1_gofer_research`                                                                                                       |
| C4 container template              | `.specify/templates/c4-container-template.md` (new)                                                                     | Mermaid `C4Container` refined in `/3_gofer_plan`                                                                                                         |
| Value stream AS-IS                 | `.specify/templates/value-stream-asis-template.md` (new)                                                                | Swim-lane `flowchart LR` in `/0a_problem_validation`                                                                                                     |
| Value stream TO-BE with AI overlay | `.specify/templates/value-stream-tobe-template.md` (new)                                                                | Same flowchart with AI-touchpoint colour key in `/2_gofer_specify`                                                                                       |
| Capability heatmap                 | `.specify/templates/capability-heatmap-template.md` (new)                                                               | Mermaid `quadrantChart` + table                                                                                                                          |
| Bounded-context map                | `.specify/templates/bounded-context-template.md` (new)                                                                  | Mermaid `flowchart` of contexts + contracts in `/3_gofer_plan`                                                                                           |
| ERD                                | `.specify/templates/data-model-erd-template.md` (new)                                                                   | Mermaid `erDiagram` in `/3_gofer_plan`                                                                                                                   |
| Risk + ROI charts                  | upgrade `spec-summary-template.md`                                                                                      | replace prose with `quadrantChart` + `xychart-beta`                                                                                                      |
| Stakeholder/RACI                   | upgrade `stakeholder-comms-template.md:128-152`                                                                         | Mermaid `mindmap` + real generated architecture diagram                                                                                                  |
| Plugin manifest                    | `.claude-plugin/plugin.json` + `extension/resources/claude-plugin-manifest.json` (new)                                  | Publishable Claude Code plugin                                                                                                                           |
| Gemini extension                   | `.gemini/extension.json` (new)                                                                                          | Publishable Gemini CLI extension                                                                                                                         |
| Codex scaffold                     | `AGENTS.md` + `codex-config.toml` (new)                                                                                 | Codex CLI parity                                                                                                                                         |
| Command picker hint file           | `.claude/namespaces.json` (new)                                                                                         | Enables `/gofer:…` namespaced surface                                                                                                                    |
| New pipeline commands              | `.claude/commands/gofer_plan.md`, `gofer_side.md`, `gofer_personality.md`, `gofer_delegate.md`, `gofer_export.md` (new) | Codex/Copilot parity adapters                                                                                                                            |
| Mermaid export step                | `.specify/scripts/node/mermaid-export.mjs` (new)                                                                        | Optional PNG/SVG export via `mmdc` for decks                                                                                                             |

### Existing Patterns to Follow

- **Pattern: single-option Mermaid emitter** — see
  `extension/resources/templates/sequence-diagrams/option-spectrum.yaml:154-178`.
  Uses YAML config + template interpolation with highlight rects for AI
  touchpoints. The new value-stream + AI-leverage artifact should reuse this
  mechanism.
- **Pattern: sub-agent per concern** — six `validation-*` agents in
  `.claude/agents/`. New visual artifacts get one sub-agent each
  (`visual-canvas-writer`, `visual-c4-writer`, `visual-value-stream-writer`,
  `visual-heatmap-writer`) so they parallelise.
- **Pattern: stage scripts for boundaries** — see
  `.specify/scripts/bash/log-stage.sh`. Add `emit-visuals.sh` that runs at
  `/2_gofer_specify` completion.
- **Pattern: mirror files via explicit mirror dir** — `.claude/commands/` +
  `extension/resources/claude-commands/`. Replace with generator (see above).

### Integration Points

1. **`/0a_problem_validation`** → emit `value-stream-asis.md` +
   `capability-heatmap.md`.
2. **`/1_gofer_research`** → emit `c4-context.md`.
3. **`/2_gofer_specify`** → emit `impact-canvas.md` + `value-stream-tobe.md`
   with AI-leverage overlay (REQUIRED; gate to `/3_gofer_plan`).
4. **`/3_gofer_plan`** → emit `c4-container.md` + `bounded-context.md` +
   `data-model-erd.md`.
5. **`/6_gofer_validate`** → emit `risk-heatmap.md` + refresh `business-metrics`
   as real `xychart-beta`.
6. **`/7a_stakeholder_comms`** → compose the persona pack into a single
   `stakeholder-pack.md` and optionally render PNG/SVG via `mmdc`.

## Technology Decisions

### Decision 1: Diagram source format

- **Choice**: Mermaid text inside Markdown, no binary assets checked in.
- **Rationale**: diffable, token-efficient (3–6× vs prose), renders in VSCode
  preview + Claude Artifacts + mermaid.live + GitHub, already the convention in
  Gofer today.
- **Alternatives considered**: PlantUML (requires Java + server), D2 (narrower
  tooling), Structurizr DSL (powerful but extra toolchain), diagrams-as-code in
  Python/TS (heavy).

### Decision 2: Diagram rendering for stakeholders

- **Choice**: Markdown-first in-repo; optional `@mermaid-js/mermaid-cli`
  (`mmdc`) export in `/7a_stakeholder_comms` for PNG/SVG when producing decks.
- **Rationale**: zero change for devs; one opt-in step for exec packaging. Keeps
  cross-CLI parity (Codex/Gemini don't render inline either).
- **Alternatives considered**: Claude `mermaid-chart` MCP (claude-only),
  `veelenga/claude-mermaid` live preview (claude-only, dev convenience), Marp
  already referenced in `stakeholder-comms-template.md:67-118` for slide
  rendering.

### Decision 3: Command source-of-truth

- **Choice**: One YAML+Markdown per stage under `.specify/commands/<stage>.yaml`
  with body in `.specify/commands/<stage>.body.md`; generator emits Claude,
  Copilot, Gemini TOML, and Codex subagent configs.
- **Rationale**: eliminates the 5-copy drift, enables Gemini `{{args}}`/`@{}`,
  enables Claude Skill frontmatter auto-invocation, enables Codex `config.toml`
  subagent mapping in one pass.
- **Alternatives considered**: keep parallel copies (current — high drift),
  one-way pull from `.claude/` to others (ties to Claude), go CLI-agnostic via
  MCP prompts only (cuts off Copilot).

### Decision 4: Plugin/extension packaging

- **Choice**: Publish Gofer as (a) Claude Code plugin in
  `anthropics/claude-plugins-official`, (b) Gemini CLI extension, (c) Codex
  `AGENTS.md` + `codex-config.toml` template, (d) continue VSCode extension
  distribution.
- **Rationale**: meets each user where they are; marketplace distribution is
  where every other major CLI is heading.
- **Alternatives considered**: Claude-only distribution (cuts ~half the
  audience), VSCode-only distribution (misses terminal users who drive the
  biggest adoption signal).

### Decision 5: Picker / namespacing

- **Choice**: Namespace all stages under `gofer:` (`/gofer:research`,
  `/gofer:specify`, `/gofer:plan`, `/gofer:impact`, `/gofer:c4`, `/gofer:tobe`)
  and retain numbered aliases (`/0`, `/1`, `/2`) for power users.
- **Rationale**: mirrors Gemini's namespacing convention (`/git:commit`) and
  makes Copilot's picker useful (`/gofer:` → full list).
- **Alternatives considered**: keep numbered-only (opaque to newcomers), fully
  flat rename (breaks muscle memory).

### Decision 6: AI-leverage vocabulary

- **Choice**: Adopt a 4-verb taxonomy on every TO-BE step: **Replace** (AI
  removes the step), **Augment** (AI assists but human decides), **Automate**
  (AI runs it unattended), **Observe** (AI monitors/alerts). Colour-coded in
  value-stream flowchart; summarised in Impact Canvas "AI Leverage Ring".
- **Rationale**: plain-language, maps to the 4 colours most palettes already
  provide; matches what Claude/OpenAI/Google themselves use in their agent
  taxonomies.
- **Alternatives considered**: freeform prose (current — unscannable),
  ITIL-style process maturity (too heavy).

## Recommended Architecture Direction

### Recommended Architecture

A **template-and-sub-agent pipeline** in three layers:

1. **Source-of-truth layer**: one YAML+body per command stage at
   `.specify/commands/*` — drives all four CLI surfaces via a single generator.
2. **Persona-pack layer**: one template per visual artifact (Impact Canvas, C4,
   AS-IS/TO-BE value stream, capability heatmap, bounded context, ERD, risk/ROI)
   with a dedicated sub-agent writer. Stage commands invoke the writers in
   parallel.
3. **Delivery layer**: a `stakeholder-pack` assembler in `/7a_stakeholder_comms`
   that composes the artifacts into one page + optional Marp deck + optional
   `mmdc` PNG/SVG export.

### Architecture Options Considered

| Option                                                           | Why choose it                                                                                                                                     | Why not choose it now                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A. Template-and-sub-agent pipeline (recommended)**             | Leverages existing `.claude/agents/` + `.specify/templates/` patterns; minimal new infra; every artifact is a Markdown file so every CLI sees it. | Still requires the source-of-truth generator to unblock Gemini/Codex parity — medium effort.                |
| **B. MCP-server-first (every artifact exposed via MCP prompts)** | Makes Gemini/Claude picker pick up Gofer for free; cleaner agent boundary.                                                                        | Requires a running MCP server; breaks Codex/Copilot parity; pulls Gofer away from "just files in the repo". |
| **C. Claude plugin monolith**                                    | Easiest marketplace distribution.                                                                                                                 | Ties Gofer to Claude Code; defeats the multi-CLI goal.                                                      |
| **D. Standalone VSCode webview that renders visuals**            | Best diagram UX.                                                                                                                                  | Duplicates work with Claude Artifacts/mermaid.live; heavy for a small team.                                 |

## Innovation Insights

Top innovations to adopt from the CLI landscape:

| Source      | Innovation                                 | Application to Gofer                                                                        |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Codex CLI   | `/plan` with context-usage gating          | First-class `/gofer:plan` replaces implicit "plan node" convention in CLAUDE.md             |
| Codex CLI   | `/side` side conversations                 | Mid-pipeline clarifier with business owner without derailing main thread                    |
| Codex CLI   | `/personality` friendly/pragmatic/none     | `/gofer:personality` swaps voice between dev/exec/consultant audiences                      |
| Codex CLI   | Queued input during running stage          | Users can queue `/6_gofer_validate` + stakeholder questions while `/5_gofer_implement` runs |
| Gemini CLI  | TOML `{{args}}` + `@{path}` file injection | Stage templates drop the `cat file >> prompt` pattern                                       |
| Gemini CLI  | Namespaced subfolder commands              | `/gofer:research`, `/gofer:plan`, `/gofer:impact` picker listing                            |
| Gemini CLI  | Extensions packaging                       | Single "Gofer extension" installs commands + `GEMINI.md` + MCP config                       |
| Claude Code | Skill auto-invocation via description      | Gofer Skills surface automatically when user says "I need to spec a new feature"            |
| Claude Code | Plugin marketplace                         | Publish Gofer on `anthropics/claude-plugins-official` and `buildwithclaude.com`             |
| Claude Code | Agent teams + Opus coordinator             | Name the validation council "Chairman" agent explicitly                                     |
| Claude Code | Mermaid as first-class output              | All new visuals are Mermaid blocks, renderable in Artifacts + `mmdc`                        |
| Copilot CLI | Slash command picker with fuzzy            | `/gofer:` prefix drives the picker                                                          |
| Copilot CLI | Autopilot vs plan mode (Shift+Tab)         | Formalise "fully autonomous pipeline" vs "stepped pipeline" toggle                          |
| Copilot CLI | `/delegate`                                | `/gofer:delegate` hands `/7a_stakeholder_comms` to the remote comms agent                   |

## Constraints & Considerations

- **Mermaid ceiling**: `xychart-beta`, `quadrantChart`, C4, `mindmap` are all
  live but still marked beta in the mermaid release notes — fall back to tables
  if the render step fails.
- **Cross-CLI fidelity**: Copilot CLI doesn't render Mermaid inline; PNG/SVG
  export via `mmdc` is required for execs using Copilot.
- **Five-copy drift**: cannot introduce new commands without the source-of-truth
  generator or the drift will compound.
- **EnterpriseAI constraint**: `market-analysis.md` and `business-analysis.md`
  must still be produced even when competitive analysis is disabled (run-level
  flag).
- **Novice guardrail**: every new artifact must open with a plain-language
  paragraph before any diagram.
- **No-regression invariant**: every existing slash-command, sub-agent,
  template, hook, and script keeps working at parity. The new `/gofer:*`
  namespace is additive (alias) — no rename of
  `/0_business_scenario`–`/10_gofer_cloud`. The source-of-truth generator must
  reproduce current emit paths byte-equivalent (modulo description shortening)
  before adding new commands.
- **Codex skill-budget hygiene** (verified against
  [Codex skills docs](https://developers.openai.com/codex/skills) and
  [config reference](https://developers.openai.com/codex/config-reference)):
  - Codex preloads name + description and uses description for implicit
    selection. Over-budget = all descriptions dropped, implicit routing breaks.
  - **No `skills_context_budget_percent` key exists** in the Codex config — do
    not emit a guessed key. The official knob is
    `[[skills.config]] path = "…" enabled = false`.
  - Codex discovers from `.agents/skills/`, user/admin/system locations,
    plugins, and `~/.codex/config.toml` — **not** from `.claude/skills/`.
  - Observed in this environment: 181 SKILL.md files under `~/.codex/skills`
    with 11 duplicated Gofer bundles. The generator's emission targets must be
    flat (no `<tenant>/<stage>/` nesting) and descriptions must be ≤140 chars.

## Open Questions

- [ ] Should the source-of-truth format be YAML+Markdown, TOML, or
      Markdown-with-frontmatter? (Gemini prefers TOML, Claude prefers MD
      frontmatter.)
- [ ] Do we want `/gofer:` namespace to replace the numbered stages (`/0`–`/10`)
      or coexist as aliases?
- [ ] Publish under `anthropics/claude-plugins-official` or a separate community
      marketplace first?
- [ ] Is `mmdc` (requires Node + Chrome) acceptable as an opt-in dev dependency,
      or should the PNG export be a GitHub Action instead?
- [ ] How much of the AI-leverage taxonomy (Replace/Augment/Automate/Observe) do
      we _prescribe_ vs let LLMs freeform within?

## Recommendations

1. **Ship Scenario C in three phases**:
   - **Phase 1 (2 wks)**: command picker namespace `/gofer:*`, `/gofer:plan`,
     `/gofer:side`, `/gofer:personality`, source-of-truth command generator,
     Gemini TOML emitter, Codex AGENTS.md emitter.
   - **Phase 2 (3 wks)**: Impact Canvas + C4 Context + C4 Container +
     AS-IS/TO-BE value stream with AI-leverage 4-verb overlay + capability
     heatmap + bounded-context + ERD + risk/ROI chart upgrades.
   - **Phase 3 (1–2 wks)**: Claude plugin manifest, Gemini extension manifest,
     Marp/mmdc stakeholder-pack assembler, marketplace submission.
2. **Make `impact-canvas.md` a hard gate** on `/2_gofer_specify` →
   `/3_gofer_plan`.
3. **Require value-stream TO-BE with AI-leverage overlay** for every
   `workflowProfile=enterpriseai` run (already the default).
4. **Name the validation council explicitly** as an "Agent Team" with an Opus
   coordinator to match Claude Code v2.1.32+ parlance.
5. **Treat Scenario D (marketplace-first re-platform) as the North Star** for
   the quarter after Phase 3.
