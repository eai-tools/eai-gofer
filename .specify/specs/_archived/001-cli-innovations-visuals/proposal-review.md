---
feature: 'CLI Innovations + Multi-Persona Visual Artifacts'
created: 2026-04-25T00:00:00Z
status: approved
recommendedScenario: 'C — Combined dual-track, phased'
recommendedArchitecture:
  'A — Template-and-sub-agent pipeline with source-of-truth generator'
selectedOption:
  'C with Architecture A; no-regression invariant + Codex skill-budget hygiene
  added'
approvedBy: 'Douglas Ross'
approvedAt: 2026-04-25T00:00:00Z
---

# Proposal Review: CLI Innovations + Multi-Persona Visual Artifacts

## What We Found

Two independent problems showed up in the same investigation:

1. **CLI UX gap (Part 1).** Claude Code, Gemini CLI, Codex CLI, and Copilot CLI
   have all shipped major slash-command UX in 2026 (Claude plugins + agent
   teams + skill auto-invocation, Gemini TOML commands with `{{args}}`/`@{}`,
   Codex `/plan`/`/side`/`/personality`/queued-input, Copilot picker +
   autopilot). Gofer has five parallel copies of 16 numbered stages kept in sync
   by hand, no picker, no namespace, no plugin manifest, no `/side`, no
   `/personality`, no queued input, and no Gemini/Codex first-class surface.
2. **Visual artifact gap (Part 2).** Gofer emits only three Mermaid sequence
   diagrams + one cloud topology + ASCII bars. There is no C4, no AS-IS/TO-BE
   value-stream, no executive one-pager with an image, no capability heatmap, no
   ERD, no bounded-context map, no risk/ROI charts, and the AI-leverage story
   lives only as coloured rectangles inside sequence diagrams. Consultants,
   execs, business owners, and enterprise architects cannot each read the spec
   on one page.

The two gaps are coupled: the new visuals need new commands to deliver them, and
the new commands need the source-of-truth generator to avoid compounding drift.

## Business Scenarios Considered

| Scenario                            | User Value                                                  | Delivery Trade-off                                    | Recommendation                                         |
| ----------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| A. CLI parity only                  | Dev-only UX win                                             | ~2 wks, no shift for non-devs                         | Absorb into C                                          |
| B. Visual-first only                | Big gain for consultants/execs/architects; CLI drift grows  | ~3 wks, isolated to templates                         | Absorb into C                                          |
| **C. Combined dual-track (phased)** | Addresses both problems; phases risk; first ships in ~2 wks | ~5–6 wks total, each phase ships independently        | **ADOPT**                                              |
| D. Marketplace-first re-platform    | Highest leverage long-term                                  | ~8–10 wks, requires retiring duplicated command trees | Treat as North Star — Phase 3 of C is the down-payment |

## Recommended Business Scenario

**Scenario C — Combined dual-track, three-phase rollout.**

- **Phase 1 (~2 wks)**: `/gofer:` namespace + picker parity, `/gofer:plan`,
  `/gofer:side`, `/gofer:personality`, source-of-truth command generator, Gemini
  TOML emitter, Codex `AGENTS.md` emitter, plugin-manifest stub.
- **Phase 2 (~3 wks)**: `impact-canvas.md` (executive one-pager with Mermaid
  mindmap + KPI tiles + AI-leverage ring), C4 Context (in `/1_gofer_research`),
  C4 Container (in `/3_gofer_plan`), AS-IS value-stream (in
  `/0a_problem_validation`), TO-BE value-stream with the **Replace / Augment /
  Automate / Observe** AI-leverage overlay (in `/2_gofer_specify` — hard gate),
  capability heatmap (in `/1_gofer_research`), bounded-context map (in
  `/3_gofer_plan`), ERD (in `/3_gofer_plan`), risk heatmap and ROI chart
  upgrades (in `/6_gofer_validate` and `spec-summary-template.md`).
- **Phase 3 (~1–2 wks)**: Claude plugin manifest →
  `anthropics/claude-plugins-official` submission; Gemini extension manifest;
  Codex subagent `config.toml`; Marp + optional `mmdc` stakeholder-pack
  assembler in `/7a_stakeholder_comms`.

## Technology Architecture Recommendation

### Recommended Architecture

**Template-and-sub-agent pipeline** with three layers:

1. **Source-of-truth layer** — one YAML+body per stage at `.specify/commands/*`;
   a Node generator emits Claude command Markdown, Copilot prompt Markdown,
   Gemini TOML, and Codex subagent config.
2. **Persona-pack layer** — one Markdown template per visual artifact with a
   dedicated sub-agent writer (`visual-canvas-writer`, `visual-c4-writer`,
   `visual-value-stream-writer`, `visual-heatmap-writer`,
   `visual-bounded-context-writer`, `visual-erd-writer`, `visual-risk-writer`).
   Stages invoke writers in parallel, matching the existing `.claude/agents/`
   pattern.
3. **Delivery layer** — `/7a_stakeholder_comms` assembles all artifacts into one
   `stakeholder-pack.md`, optionally renders PNG/SVG via `mmdc`, and (existing)
   a Marp deck.

### Architecture Options

| Option                                               | Why choose it                                                                     | Why not choose it now                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **A. Template-and-sub-agent pipeline (recommended)** | Matches existing Gofer patterns, Markdown-first, every CLI sees it, low new infra | Still requires the source-of-truth generator — medium effort       |
| B. MCP-server-first                                  | Free picker integration in Claude/Gemini; cleaner agent boundary                  | Needs a running MCP server, cuts Codex/Copilot off from parity     |
| C. Claude-plugin monolith                            | Easiest marketplace distribution                                                  | Ties Gofer to one CLI — defeats the multi-CLI goal                 |
| D. VSCode webview for rendering                      | Best in-editor diagram UX                                                         | Duplicates Claude Artifacts / mermaid.live; heavy for a small team |

## Key Decisions and Why

- **Diagram format = Mermaid text in Markdown**: diffable, token-efficient
  (~3–6× vs prose), renders in VSCode preview + Claude Artifacts +
  mermaid.live + GitHub. PlantUML/D2/Structurizr add toolchain weight without
  matching Mermaid's current multi-renderer reach.
- **Source-of-truth = one YAML+body per stage; generator emits to four CLIs**:
  kills the 5-copy drift (`.claude/commands/`,
  `extension/resources/claude-commands/`,
  `extension/resources/copilot-prompts/`, `.github/prompts/`, `.agents/skills/`,
  `.system/skills/`) and unblocks Gemini `{{args}}`/`@{}` and Codex subagent
  parity.
- **AI-leverage taxonomy = 4 verbs (Replace / Augment / Automate / Observe)**:
  plain-language, colour-codable, matches how Claude/OpenAI/Google each describe
  agent capability in their own 2026 docs.
- **Rendering strategy = Markdown-first in-repo + optional `mmdc` PNG/SVG at
  comms stage**: zero change for devs; opt-in export for exec decks; stays
  CLI-agnostic.
- **Packaging = Claude plugin + Gemini extension + Codex AGENTS.md + VSCode
  extension (all four)**: meets every user where they are; marketplace
  distribution is where the whole CLI ecosystem is heading.
- **`impact-canvas.md` + TO-BE value-stream with AI-leverage overlay are hard
  gates on `/2_gofer_specify` → `/3_gofer_plan`**: this is what closes the
  "non-dev personas can't read the spec" complaint.

## What Can Change Before Specification

- **Scope**: you can drop Phase 3 (marketplace publishing) if distribution is
  premature.
- **Scope**: you can keep numbered `/0`–`/10` commands only (no `/gofer:`
  namespace) if breaking muscle memory concerns outweigh picker UX.
- **Scope**: you can defer any visual artifact except `impact-canvas.md` +
  `value-stream-tobe.md` — those are the minimum that fixes the core complaint.
- **Architecture**: you can swap Option A for Option B (MCP-server-first) if the
  team wants cleaner boundaries and is willing to cut Codex/Copilot parity.
- **Taxonomy**: the 4-verb AI-leverage taxonomy
  (Replace/Augment/Automate/Observe) can be replaced with an alternative or left
  freeform.
- **Render target**: `mmdc` can be swapped for a GitHub Action if we don't want
  a Node + headless-Chrome dev dependency.

## Open Questions

- [x] **Source-of-truth format = YAML frontmatter + Markdown body** (one file
      per stage; YAML declares name, ≤140-char description, per-CLI surfaces,
      args, includes; body is the prompt). Confirmed 2026-04-25.
- [x] **Numbered `/0`–`/10` commands retained**; `/gofer:*` namespace is
      additive alias only (per no-regression invariant).
- [x] **Phase order = strict 1 → 2 → 3**, no reordering. Source-of-truth
      generator + Codex skill-budget hygiene MUST ship before any new visuals;
      visuals before packaging. Confirmed 2026-04-25.
- [x] **AI-leverage taxonomy = enforced 4-verb: Replace / Augment / Automate /
      Observe.** Every TO-BE value-stream step MUST be tagged. Colour-coded in
      flowcharts; Impact Canvas summarises counts per verb. Confirmed
      2026-04-25.
- [ ] Publish under `anthropics/claude-plugins-official` or a community
      marketplace first? (resolve in Phase 3)
- [ ] `mmdc` as local opt-in dev dep, or PNG export as a GitHub Action only?
      (resolve in Phase 3)

## User Feedback and Overrides

- **Approved 2026-04-25** — proceed with Scenario C (combined dual-track) +
  Architecture A (template-and-sub-agent with source-of-truth generator).
- **Added invariant 1 — no-regression**: every existing Gofer command,
  sub-agent, template, hook, script, slash-command name (`/0_business_scenario`,
  `/1_gofer_research`, `/2_gofer_specify`, `/3_gofer_plan`, `/4_gofer_tasks`,
  `/5_gofer_implement`, `/6_gofer_validate`, `/6a_gofer_engineering_review`,
  `/7_gofer_save`, `/7a_stakeholder_comms`, `/8_gofer_resume`, `/9_gofer_tests`,
  `/10_gofer_cloud`, `/0a_problem_validation`, `/gofer_constitution`,
  `/gofer_hydrate`) MUST keep working at parity. The new `/gofer:*` namespace is
  **additive** (aliases that route to the same skill bodies). All 36 sub-agents,
  hooks, templates, and scripts are preserved. The source-of-truth generator
  must reproduce the current `.claude/commands/`,
  `extension/resources/copilot-prompts/`, `.github/prompts/`, `.agents/skills/`,
  `.system/skills/` outputs byte-equivalent (modulo description shortening — see
  invariant 2) before any new commands are added.
- **Added invariant 2 — Codex skill-budget hygiene** (informed by the 2026-04-25
  incident, corroborated against OpenAI's official Codex docs):
  - **Verified facts** (per
    [Codex Agent Skills](https://developers.openai.com/codex/skills) and
    [Codex config reference](https://developers.openai.com/codex/config-reference)):
    - The "Exceeded skills context budget of 2%" warning string lives in the
      Codex binary itself.
    - Codex initially loads only skill **name + description** as metadata, then
      uses descriptions for implicit selection.
    - **There is NO official `skills_context_budget_percent` config key.** The
      previous community recommendation to bump it is invalid — do not write a
      guessed key.
    - The supported, official knob is per-skill enablement:
      `[[skills.config]] path = "/abs/path/SKILL.md" enabled = false` in
      `~/.codex/config.toml`.
    - Codex discovers skills under `.agents/skills/`, user/admin/system
      locations, plugins, and `~/.codex/config.toml` overrides — **not** under
      `.claude/skills/` (the earlier "Codex and Claude Code both read from
      `.claude/skills/`" claim is incorrect).
  - **Concrete state observed in this user's environment**: 181 SKILL.md files
    under `~/.codex/skills`, including 11 duplicated Gofer bundles each
    containing the same 16 stage skills.
  - **Generator requirements** (binding):
    1. Emit **one-sentence canonical descriptions** for each stage (≤140 chars).
       Current paragraph-length descriptions are the proximate cause of the 2%
       budget overrun even after dedup.
    2. Emit a **flat, non-tenanted** skill tree per CLI surface — no nested
       `<tenant>/<stage>/SKILL.md` paths.
    3. Provide **per-CLI inclusion/exclusion**: Claude-only stages
       (`0_business_scenario` orchestrator, `gofer_constitution`,
       `gofer_hydrate`, `7_gofer_save`, `8_gofer_resume`) are excluded from
       Codex/Gemini emission paths.
    4. Ship a one-shot **`gofer codex doctor`** command that scans
       `~/.codex/skills` for duplicate Gofer bundles, prints which paths exceed
       the budget, and emits the exact `[[skills.config]] enabled = false` block
       to paste into `~/.codex/config.toml` for the duplicates the user wants to
       keep on disk but disable. (No edit-on-behalf — read-only diagnostic +
       suggested config.)
    5. Document in `gofer_constitution` that Codex distribution uses
       `.agents/skills/` + plugins, _not_ `.claude/skills/`.
  - This codifies the Codex incident learnings as permanent build-time +
    operational constraints, not opt-in cleanup.

## Approval

- Status: approved
- Approved by: Douglas Ross
- Approved at: 2026-04-25
- Next action: run architecture Q&A one-by-one, record answers, then invoke
  `/2_gofer_specify`
