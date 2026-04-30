---
feature: 001-cli-innovations-visuals
contract: cli-commands
status: draft
created: 2026-04-25
---

# CLI Command Contracts

This document defines the contract surface for every NEW or MODIFIED CLI command
introduced by this feature. Each contract is testable: `/4_gofer_tasks` will
generate one or more concrete acceptance tests per contract.

There are no REST APIs in this feature. The "API surface" here consists of:

1. **Generator CLI** (`gofer:generate`) — reproduces all CLI surfaces from the
   source-of-truth.
2. **Codex doctor** (`gofer codex doctor`) — read-only environment diagnostic.
3. **New first-class slash commands** — `/gofer:plan`, `/gofer:side`,
   `/gofer:personality`.
4. **Additive `/gofer:<short>` aliases** — one per existing numbered/named
   stage.

All command contracts define: invocation, args, side-effects, file outputs,
exit/error semantics, served user stories + FRs, and at least one acceptance
test prompt.

---

## 1. Generator CLI

### 1.1 `gofer:generate`

- **Invocation**:
  `npm run gofer:generate [-- --check] [-- --surfaces <list>] [-- --force-emit]`
  → resolves to `node .specify/scripts/node/generate-commands.mjs [args]`.
- **Description**: Read every canonical stage at `.specify/commands/<stage>.md`
  and emit per-surface command/skill files (Claude command, Copilot prompt,
  GitHub prompt, Gemini TOML, Codex `.agents/skills/<stage>/SKILL.md`, mirrored
  `.system/skills/<stage>/SKILL.md`, and the
  `extension/resources/claude-commands/` mirror).
- **Args**: | Arg | Type | Default | Effect | |---|---|---|---| | `--check` |
  flag | false | Dry-run. Compare what _would_ be emitted against what currently
  exists on disk. Exit non-zero on any drift. No writes. | | `--surfaces <list>`
  | comma-separated string | all | Restrict emission to a subset of
  `{claude,copilot,gemini,codex,vscode,github-prompts,claude-mirror}`. Unknown
  surface name → exit 4. | | `--force-emit` | flag | false | Allow overwriting
  an emitted target whose source-of-truth file is older than the on-disk emit
  (i.e. when a hand-edit has been detected per Edge Case "Source-of-truth
  divergence"). Without this flag, the generator refuses and logs the
  divergence. | | `--stage <name>` | string | all | Restrict emission to a
  single stage canonical name (e.g. `1_gofer_research`). |
- **Inputs**:
  - `.specify/commands/*.md` — every canonical source-of-truth file.
  - `.specify/commands/_includes/*.md` — referenced via `@{path}` injection in
    command bodies.
- **Outputs** (per `data-model.md` SurfaceTarget):
  - `claude` → `.claude/commands/<stage>.md`
  - `claude-mirror` → `extension/resources/claude-commands/<stage>.md`
  - `copilot` → `extension/resources/copilot-prompts/<stage>.prompt.md`
  - `github-prompts` → `.github/prompts/<stage>.prompt.md`
  - `gemini` → `.gemini/commands/gofer/<short>.toml`
  - `codex` → `.agents/skills/<stage>/SKILL.md` (flat; FR-008)
  - `vscode` → `.system/skills/<stage>/SKILL.md`
- **Side-effects**: Writes (or, with `--check`, would-write-but-doesn't) the
  files above. Never modifies `~/.codex/...` or any user home file.
  Always-deterministic ordering (alphabetical by stage canonical name,
  alphabetical by surface) so re-runs are byte-identical (NFR-011).
- **Exit codes**: | Code | Meaning | |---|---| | 0 | Success — emit complete, or
  `--check` found no drift. | | 1 | Schema violation in a
  `.specify/commands/<stage>.md` file (frontmatter shape, missing required
  field, malformed YAML). | | 2 | Byte-equivalence drift detected in `--check`
  mode (post-feature emit differs from on-disk emit beyond the
  description-shortening allowance). | | 3 | Description over the 140-char
  budget (FR-006). The offending file path + line is printed to stderr. | | 4 |
  Invalid `--surfaces` argument or per-CLI exclusion violation (FR-007 —
  Claude-only stage tagged for Codex/Gemini). | | 5 | Source-of-truth divergence
  detected without `--force-emit`. |
- **Serves**: FR-001, FR-002, FR-005, FR-006, FR-007, FR-008, FR-031, FR-032,
  FR-033; SC-005, SC-006, SC-007, SC-008, SC-011, SC-012; User Stories 5, 6.
- **Acceptance tests**:
  1. **No-regression baseline**: `npm run gofer:generate -- --check` exits 0
     immediately after the migration (canonical files in place, all targets
     emitted from them) — there must be zero drift relative to the
     byte-equivalent reproduction guarantee.
  2. **Description over budget**: Set one stage's `description` to 200 chars;
     `npm run gofer:generate` exits 3 and prints the file path + char count.
  3. **Per-CLI exclusion violation**: Add `surfaces: [codex]` to
     `.specify/commands/gofer_constitution.md`; generator exits 4 and prints
     "Claude-only stage tagged for Codex" with the YAML line number.
  4. **Codex flat tree**: After a successful emit,
     `find .agents/skills -type f -name SKILL.md | awk -F'/' '{print NF}' | sort -u`
     returns only `4` (i.e. `.agents/skills/<stage>/SKILL.md`, depth 2 below
     `.agents/skills/`).
  5. **Determinism**: Two consecutive `gofer:generate` runs produce
     byte-identical files (NFR-011).
  6. **Performance**: A full re-emit completes in <2s on a developer laptop
     (NFR-001, SC-007).

---

## 2. Codex Doctor

### 2.1 `gofer codex doctor`

- **Invocation**:
  `npm run gofer:codex-doctor [-- --root <path>] [-- --format json|markdown]` →
  `node .specify/scripts/node/codex-doctor.mjs [args]`.
- **Description**: Scan `~/.codex/skills` (or `--root`) for installed Gofer
  bundles, count duplicates, compute the cumulative description-byte total
  against the canonical Gofer skill set, and emit a paste-ready
  `[[skills.config]] enabled = false` block for the duplicate paths the user can
  disable.
- **Read-only**: MUST NOT modify any file. MUST NOT touch
  `~/.codex/config.toml`. MUST NOT delete or rename any directory under
  `~/.codex/skills`. Verified by integration test fixture asserting `mtime` of
  every file under `--root` is unchanged post-run.
- **Args**: | Arg | Type | Default | Effect | |---|---|---|---| |
  `--root <path>` | string | `~/.codex/skills` | Override the scan root. Used in
  tests to point at a fixture. | | `--format json\|markdown` | enum | `markdown`
  | Output format. JSON conforms to `CodexDoctorReport` schema; Markdown is
  human-readable rendering of the same data. |
- **Inputs**:
  - Directory tree at `--root`.
  - The canonical Gofer skill set (read from `.specify/commands/*.md` via the
    same parser the generator uses) for ≤140-char description verification and
    cumulative-byte calculation.
- **Outputs** (`CodexDoctorReport` shape, see data-model.md):
  - `canonicalSkills`: array of `{name, description, descriptionBytes}` for each
    canonical Gofer stage that emits to Codex.
  - `cumulativeDescriptionBytes`: integer; MUST be ≤2048 for a healthy report
    (NFR-004, SC-006).
  - `duplicateBundles`: array of `{path, stageName, sha256, isCanonical}` —
    every duplicated Gofer bundle detected on disk.
  - `overBudgetPaths`: array of paths whose descriptions push the user over the
    2% budget.
  - `disableSnippet`: a TOML string of the form
    `[[skills.config]] path = "..." enabled = false` for each duplicate;
    pasteable into `~/.codex/config.toml`.
  - `noFakeKeyAssertion`: literal true; emitted to confirm the doctor never
    refers to `skills_context_budget_percent`.
- **Side-effects**: Writes to stdout only. Never to disk. Never to network.
- **Exit codes**: | Code | Meaning | |---|---| | 0 | Healthy — no duplicates,
  descriptions ≤140 chars each, cumulative ≤2KB. | | 1 | Description over budget
  (one or more canonical descriptions ≥140 chars OR cumulative >2KB). | | 2 |
  Duplicates detected (`duplicateBundles.length > 0`). | | 3 | Both 1 and 2
  (returned as 2 for shell-friendliness; details are in the report). | | 4 |
  Scan root not found / not readable. |
- **Serves**: FR-009, FR-011; SC-003, SC-006, SC-011; User Story 6.
- **Acceptance tests**:
  1. **Read-only**: Pre-populate fixture `~/.codex/skills` with 11 duplicated
     Gofer bundles. Run `gofer codex doctor --root <fixture>`. Assert no file
     under the fixture has its `mtime` modified post-run.
  2. **Duplicates listed**: Same fixture; assert
     `duplicateBundles.length === 11` and every entry has a non-empty `path`.
  3. **TOML snippet validity**: Parse the `disableSnippet` with a TOML parser;
     assert it is valid TOML, contains `[[skills.config]]`, and every entry sets
     `enabled = false`.
  4. **No fake key**: Run
     `gofer codex doctor --root <fixture> --format json | grep -c skills_context_budget_percent`
     returns `0` (FR-011, SC-011).
  5. **Cumulative budget**: Provide a canonical Gofer skill set whose summed
     description bytes equal 2048; the doctor reports healthy. Add one byte; the
     doctor exits 1.

---

## 3. New First-Class Slash Commands

These are new commands. Their `surfaces:` list is restricted to
`[claude, claude-mirror, copilot, vscode]` — they are deliberately **excluded
from `codex` and `gemini`** because Codex has native `/plan`, `/side`, and
`/personality` commands (duplicating them would consume the 2% description
budget per NFR-004) and Gemini has its own equivalents. The generator emits them
from `.specify/commands/<name>.md` like every other stage, applying the per-CLI
exclusion automatically.

### 3.1 `/gofer:plan [scope]`

- **Invocation**: User types `/gofer:plan` or `/gofer:plan <scope>` in Claude
  Code, the VSCode extension, or any Copilot prompt surface (NOT Codex — use
  Codex's native `/plan`; NOT Gemini — use its native equivalent).
- **Description**: Switch the active conversation into plan mode with current
  context-usage shown before carrying forward. Mirrors Codex `/plan` semantics.
  **`/gofer:plan` is exclusively the plan-mode toggle — it is NOT an alias for
  the `/3_gofer_plan` planning stage.** Per ADR-003
  (`adr-003-gofer-plan-namespace.md`), the `/3_gofer_plan` stage is aliased
  separately as `/gofer:plan-stage`.
- **Args**:
  - `scope` (optional, freeform string): the planning target. If omitted, enter
    plan mode for the next pipeline step in the current feature folder; if
    supplied, enter plan mode for the supplied scope. (To run the planning
    _stage_ explicitly, use `/3_gofer_plan` or `/gofer:plan-stage`.)
- **Expected stdout**:
  - First line: `[plan-mode] context-usage: <pct>%`
  - Subsequent: a numbered, checkable plan written to `tasks/todo.md` (per
    CLAUDE.md "Plan First").
- **File outputs**:
  - `tasks/todo.md` (created or appended) with the new plan checklist.
  - Hook-log entry: `time-from-prompt-to-stage-launch` (FR-034) is recorded.
- **Side-effects**: Sets a session flag (`.specify/state/plan-mode`) consumed by
  the `Stop` hook to avoid auto-progressing past a planning step.
- **Exit/error semantics**: Conversational command; non-error path writes the
  plan and exits to user. If the active feature folder cannot be inferred and
  `scope` is omitted, the command prompts the user to either pass a scope or run
  `/0_business_scenario` first.
- **Serves**: FR-012; User Story 5 (Acceptance Scenario 3).
- **Acceptance test**: Open a Claude Code session, run `/gofer:plan`
  mid-conversation, assert (a) context-usage line appears, (b) `tasks/todo.md`
  contains a new checklist block, (c) the hook log shows the
  `time-from-prompt-to-stage-launch` event.

### 3.2 `/gofer:side [topic]`

- **Invocation**: `/gofer:side` or `/gofer:side <topic>` — emitted to
  `surfaces: [claude, claude-mirror, copilot, vscode]` only (NOT Codex — Codex
  has native `/side`; NOT Gemini).
- **Description**: Open a side conversation/note thread without derailing the
  main Gofer pipeline conversation. Mirrors Codex `/side`. The side note
  persists to the feature folder so the operator can return to it later.
- **Args**:
  - `topic` (optional, freeform): a short label for the side note. If omitted,
    `untitled` is used.
- **Persistence**: Each side conversation is written to
  `.specify/specs/<feature>/side-notes/<ISO8601-timestamp>-<slug>.md`. The file
  MUST contain frontmatter `{topic, opened_at, closed_at, parentStage}` and a
  Markdown body of the side exchange.
- **Reentry**: Subsequent `/gofer:side --resume <slug>` (or interactive picker
  selection) re-opens the same file; the main thread context is preserved
  untouched.
- **Side-effects**:
  - Creates `.specify/specs/<feature>/side-notes/` directory if absent.
  - Writes a hook-log entry `side-conversation-opened` and
    `side-conversation-closed`.
- **Exit/error semantics**: If no active feature folder is detected, the command
  writes to `.specify/side-notes/<timestamp>.md` (repo-level) instead and warns
  the user.
- **Serves**: FR-013; User Story 5 (Acceptance Scenario 4).
- **Acceptance test**: Start a feature folder, run
  `/gofer:side "stakeholder clarifier"`, exchange a few turns, then return to
  the main thread. Assert (a) the side note file exists with the expected
  frontmatter, (b) the main-thread context (last user prompt before
  `/gofer:side`) is unchanged, (c) reentry via `--resume` reads the same file.

### 3.3 `/gofer:personality <friendly|pragmatic|none>`

- **Invocation**: `/gofer:personality friendly` | `/gofer:personality pragmatic`
  | `/gofer:personality none` — emitted to
  `surfaces: [claude, claude-mirror, copilot, vscode]` only (NOT Codex; NOT
  Gemini).
- **Description**: Switch the downstream voice for stakeholder-facing artifacts.
  Sets a lookup hint at `.specify/state/personality` that the `UserPromptSubmit`
  hook reads on every subsequent prompt and prepends a short voice directive to
  the system prompt.
- **Args**:
  - One of the three enum values. Anything else → exit error with usage.
- **Expected stdout**: `personality: <value>` confirmation line.
- **File outputs**: Writes a single-line file `.specify/state/personality`
  containing the chosen value. No other side-effects.
- **Side-effects**: Hook reads this file to influence subsequent stage prompts.
  Reset by writing `none` or deleting the file.
- **Exit/error semantics**: Invalid argument → non-zero exit with usage.
- **Serves**: FR-014; User Story 5 (Acceptance Scenario 5).
- **Acceptance test**: Run `/gofer:personality friendly`, then
  `/7a_stakeholder_comms` against a fixture feature folder; assert the resulting
  `stakeholder-pack.md` opening paragraph contains plain-language friendly tone
  (test asserts presence of warmth markers vs the `pragmatic` baseline).

---

## 4. Additive `/gofer:<short>` Aliases

For every existing command, the generator emits an additive alias under the
`gofer:` namespace that delegates to the same skill body. **Aliases share body
and behavior — pure delegation. No body duplication.** The alias resolution
happens via `.claude/namespaces.json` (Claude),
`.gemini/commands/gofer/<short>.toml` (Gemini), and per-surface alias entries in
the source-of-truth frontmatter (`aliases:` field — see
`source-of-truth-schema.md`).

| Existing command               | `/gofer:<short>` alias                    | Maps to canonical stage       |
| ------------------------------ | ----------------------------------------- | ----------------------------- |
| `/0_business_scenario`         | `/gofer:problem` (alt: `/gofer:business`) | `0_business_scenario`         |
| `/0a_problem_validation`       | `/gofer:validate-problem`                 | `0a_problem_validation`       |
| `/1_gofer_research`            | `/gofer:research`                         | `1_gofer_research`            |
| `/2_gofer_specify`             | `/gofer:specify`                          | `2_gofer_specify`             |
| `/3_gofer_plan`                | `/gofer:plan-stage` _(see note)_          | `3_gofer_plan`                |
| `/4_gofer_tasks`               | `/gofer:tasks`                            | `4_gofer_tasks`               |
| `/5_gofer_implement`           | `/gofer:implement`                        | `5_gofer_implement`           |
| `/6_gofer_validate`            | `/gofer:validate`                         | `6_gofer_validate`            |
| `/6a_gofer_engineering_review` | `/gofer:engineering-review`               | `6a_gofer_engineering_review` |
| `/7_gofer_save`                | `/gofer:save`                             | `7_gofer_save`                |
| `/7a_stakeholder_comms`        | `/gofer:comms`                            | `7a_stakeholder_comms`        |
| `/8_gofer_resume`              | `/gofer:resume`                           | `8_gofer_resume`              |
| `/9_gofer_tests`               | `/gofer:tests`                            | `9_gofer_tests`               |
| `/10_gofer_cloud`              | `/gofer:cloud`                            | `10_gofer_cloud`              |
| `/gofer_constitution`          | `/gofer:constitution`                     | `gofer_constitution`          |
| `/gofer_hydrate`               | `/gofer:hydrate`                          | `gofer_hydrate`               |

**Note on `/gofer:plan` vs `/gofer:plan-stage` (ADR-003)**: To avoid collision
and dual-semantics overload, the namespace is split:

- `/gofer:plan` is reserved exclusively for the new plan-mode toggle (§3.1).
  Mirrors Codex `/plan`. Authored in `.specify/commands/gofer_plan.md` with
  `aliases: ["plan"]`.
- `/gofer:plan-stage` is the additive alias for the `/3_gofer_plan` planning
  stage. Authored via `aliases: ["plan-stage"]` in
  `.specify/commands/3_gofer_plan.md`. (`aliases: ["plan"]` is **forbidden** on
  this file; the generator validates uniqueness at emit time.)

This split keeps each command surface single-purpose and removes the
merged-semantics body branch entirely.

### 4.1 Alias contract (applies to every row above)

- **Invocation**: User types `/gofer:<short>` in any supported CLI surface.
- **Description**: Delegates verbatim to the canonical stage body. No additional
  logic, no body fork. Routing happens at the CLI surface level (Claude
  namespaces.json, Gemini subfolder convention, Copilot picker fuzzy-match) —
  the generator emits per-surface alias entries that point to the same
  source-of-truth body.
- **Args**: Identical to the canonical stage. `{{args}}` is forwarded unchanged.
- **Side-effects**: Identical to the canonical stage.
- **File outputs**: Identical to the canonical stage.
- **Exit/error semantics**: Identical to the canonical stage.
- **Serves**: FR-005; User Story 5 (Acceptance Scenario 1, 2).
- **Acceptance test**: For every row in the table, assert `/gofer:<short>` and
  `/<canonical>` produce byte-identical pipeline state changes against a fixture
  feature folder (compare `.specify/specs/<feature>/` directory hash
  before/after each invocation).

---

## 5. Cross-Cutting Hook Contract

All commands above (existing + new + aliases) MUST emit a
`time-from-prompt-to-stage-launch` event into the existing hook log per FR-034.
The event MUST distinguish numbered invocations from `/gofer:*` namespaced
invocations so SC-004 (≥50% time-to-stage reduction) can be measured.

- **Hook event schema**:
  `{event: "stage-launch", invocation: "<raw-input>", canonicalStage: "<name>", aliasUsed: <boolean>, msFromPromptToLaunch: <integer>, ts: <ISO8601>}`.
- **Wired in**: `.specify/scripts/hooks/log-stage-launch.sh` (extends existing
  `log-stage.sh`).
- **Acceptance test**: Run `/gofer:research` and `/1_gofer_research` against a
  fixture; assert two events landed in the hook log, one with `aliasUsed: true`
  and one with `aliasUsed: false`, both with the same `canonicalStage`.

---

## 6. Summary

| Category                              | Count                                                  |
| ------------------------------------- | ------------------------------------------------------ |
| Generator CLI commands                | 1 (`gofer:generate`)                                   |
| Diagnostic CLI commands               | 1 (`gofer codex doctor`)                               |
| New first-class slash commands        | 3 (`/gofer:plan`, `/gofer:side`, `/gofer:personality`) |
| Additive `/gofer:<short>` aliases     | 16 (one per existing stage)                            |
| **Total documented command surfaces** | **21**                                                 |

All 21 command surfaces have explicit acceptance tests above. `/4_gofer_tasks`
will translate each into one or more concrete test entries.
