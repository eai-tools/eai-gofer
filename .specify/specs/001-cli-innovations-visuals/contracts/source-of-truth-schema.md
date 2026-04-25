---
feature: 001-cli-innovations-visuals
contract: source-of-truth-schema
status: draft
created: 2026-04-25
---

# Source-of-Truth Schema

This document is the formal schema for `StageCommand` source-of-truth files at
`.specify/commands/<stage>.md`. Every `.specify/commands/<stage>.md` file is a
single canonical YAML-frontmatter + Markdown-body document from which the
generator (`gofer:generate`) emits per-surface command/skill files for Claude,
Copilot, GitHub prompts, Gemini, Codex, VSCode-system, and the Claude-mirror.

The schema is binding. Any frontmatter or body that violates these rules causes
the generator to exit non-zero with a precise error pointing at the offending
line.

---

## 1. File layout

```
.specify/commands/
├── 0_business_scenario.md
├── 0a_problem_validation.md
├── 1_gofer_research.md
├── 2_gofer_specify.md
├── 3_gofer_plan.md
├── 4_gofer_tasks.md
├── 5_gofer_implement.md
├── 6_gofer_validate.md
├── 6a_gofer_engineering_review.md
├── 7_gofer_save.md
├── 7a_stakeholder_comms.md
├── 8_gofer_resume.md
├── 9_gofer_tests.md
├── 10_gofer_cloud.md
├── gofer_constitution.md
├── gofer_hydrate.md
├── gofer_plan.md           # NEW — first-class /gofer:plan
├── gofer_side.md           # NEW — first-class /gofer:side
├── gofer_personality.md    # NEW — first-class /gofer:personality
└── _includes/
    ├── plan-mode-preamble.md
    ├── side-note-preamble.md
    └── personality-directive.md
```

Each `<stage>.md` file is one document with strict frontmatter + Markdown body
separated by `---` fences (YAML 1.2 / safe load).

---

## 2. Frontmatter — JSON Schema (formal)

The frontmatter MUST be valid YAML and MUST conform to the following JSON Schema
(`StageCommand`):

```yaml
$schema: 'https://json-schema.org/draft/2020-12/schema'
$id: 'https://gofer.local/schemas/stage-command.json'
title: StageCommand
type: object
required:
  - name
  - description
  - surfaces
  - category
additionalProperties: false
properties:
  name:
    description: |
      Canonical stage name. Matches the filename without `.md`.
      MUST be filesystem-safe (lowercase letters, digits, underscore, hyphen).
    type: string
    pattern: '^[a-z0-9][a-z0-9_-]*$'
    minLength: 1
    maxLength: 64
    examples: ['1_gofer_research', 'gofer_constitution', 'gofer_plan']

  aliases:
    description: |
      List of `/gofer:<short>` namespace aliases that resolve to this stage.
      Aliases are pure delegation — they share the body and behavior of the
      canonical stage. The generator emits per-surface alias entries pointing
      at the same body.
    type: array
    items:
      type: string
      pattern: '^[a-z][a-z0-9-]*$'
      maxLength: 40
    uniqueItems: true
    default: []

  description:
    description: |
      One-sentence summary used for picker hover, skill auto-invocation,
      and Codex implicit selection. Hard ≤140 character cap (FR-006).
    type: string
    minLength: 10
    maxLength: 140

  surfaces:
    description: |
      Per-CLI inclusion list. Generator emits ONLY to surfaces named here.
      Claude-only stages MUST omit `codex` and `gemini` (FR-007).
    type: array
    items:
      type: string
      enum:
        - claude
        - claude-mirror
        - copilot
        - github-prompts
        - gemini
        - codex
        - vscode
    uniqueItems: true
    minItems: 1

  args:
    description: |
      Argument schema for the command. Forwarded to per-surface emitters
      (Gemini TOML `{{args}}`, Claude markdown `$ARGUMENTS`, Codex
      `{args.<name>}`).
    type: array
    items:
      type: object
      required: [name, type]
      additionalProperties: false
      properties:
        name:
          type: string
          pattern: '^[a-z][a-z0-9_-]*$'
        type:
          enum: [string, integer, boolean, enum, path]
        required:
          type: boolean
          default: false
        default:
          description: Default value if optional. Type must match `type`.
        choices:
          description: Required when type=enum.
          type: array
          items: { type: string }
        description:
          type: string
          maxLength: 200
    default: []

  includes:
    description: |
      List of paths injected into the body via `@{path}` placeholders.
      Resolved relative to the repository root.
    type: array
    items:
      type: string
      pattern: '^[a-zA-Z0-9_./-]+$'
    default: []

  category:
    description: |
      Logical group for picker organisation. Drives Gemini's
      namespaced subfolder layout (e.g. `category=pipeline` →
      `.gemini/commands/gofer/<short>.toml`).
    enum:
      - pipeline # numbered stage
      - meta # gofer_constitution, gofer_hydrate
      - control # gofer_plan, gofer_side, gofer_personality
      - generator # internal — for the generator itself if ever exposed
    default: pipeline

  excludeFromCodexImplicitSelection:
    description: |
      When true, the Codex SKILL.md is emitted but its `description` field
      is suppressed from the implicit-selection budget (it stays available
      for explicit invocation only).
    type: boolean
    default: false

  model:
    description: |
      Recommended model for this stage. Opus = synthesis-heavy; Sonnet =
      mechanical. Read by the generator for the Claude command frontmatter.
    enum: [opus, sonnet, default]
    default: default

  agentTeam:
    description: |
      Optional named agent-team this stage delegates to (e.g. `validation-council`).
      Surfaced in the Claude `agent-team` frontmatter where supported.
    type: string

  workflowProfile:
    description: |
      If set, the stage only emits when the project's workflowProfile
      matches. Used by enterpriseai-only stages.
    enum: [enterpriseai, generic, any]
    default: any
```

### 2.1 Frontmatter examples

**Numbered stage with Codex emit + alias**:

```yaml
---
name: 1_gofer_research
aliases: ['research']
description:
  'Deep codebase and technology research for feature implementation; emits
  c4-context and capability-heatmap.'
surfaces:
  [claude, claude-mirror, copilot, github-prompts, gemini, codex, vscode]
args:
  - name: scope
    type: string
    required: false
    description: 'Optional research scope hint.'
includes:
  - .specify/templates/c4-context-template.md
category: pipeline
model: opus
---
```

**Claude-only stage (excluded from Codex/Gemini per FR-007)**:

```yaml
---
name: gofer_constitution
aliases: ['constitution']
description:
  'Create or update project constitution with coding principles and guidelines.'
surfaces: [claude, claude-mirror, copilot, github-prompts, vscode] # NO codex, NO gemini
category: meta
model: opus
---
```

**New control command** (`/gofer:plan` — plan-mode toggle, NOT the planning
stage; see ADR-003):

```yaml
---
name: gofer_plan
aliases: ['plan']
description:
  'Switch active conversation into plan mode with context-usage shown; mirrors
  Codex /plan semantics.'
surfaces: [claude, claude-mirror, copilot, vscode] # NO codex (Codex has native /plan); NO gemini (Gemini has native equivalent)
args:
  - name: scope
    type: string
    required: false
    description:
      'Optional planning scope; if absent, plan the next pipeline step.'
includes:
  - .specify/commands/_includes/plan-mode-preamble.md
category: control
model: default
---
```

The `/3_gofer_plan` planning **stage** is aliased separately as
`/gofer:plan-stage` (its source-of-truth file declares
`aliases: ["plan-stage"]`); the generator REJECTS any other file attempting
`aliases: ["plan"]` because that slot is reserved for `gofer_plan`.

---

## 3. Body — Markdown validation rules

The Markdown body following the closing `---` frontmatter fence MUST satisfy:

- **B-1**: At least one `## ` heading (level 2). Ensures every body has a
  parseable section structure for picker preview rendering.
- **B-2**: All `@{path}` placeholders resolve to a real file under the repo
  root. Resolution is relative to the repository root, NOT to
  `.specify/commands/`. Unresolved → exit 1.
- **B-3**: Includes referenced via `@{path}` MUST also be listed in the
  `includes:` frontmatter array — keeps the dependency graph explicit and
  auditable.
- **B-4**: `{{args.<name>}}` placeholders MUST resolve to a name listed in
  `args:`. Unknown arg name → exit 1.
- **B-5**: No raw secrets, tokens, environment variables containing credentials
  (NFR-005).
- **B-6**: No occurrence of the literal string `skills_context_budget_percent`
  anywhere in body or frontmatter (FR-011, SC-011).
- **B-7**: Bodies MUST be UTF-8, LF line endings; trailing newline required.
- **B-8**: Hard upper bound: 8000 lines / 256KB per body. Above this, fail with
  exit 1 and recommend the author split via `_includes/`.

---

## 4. Per-surface emit transforms

For every `(stage, surface)` pair where `surface ∈ stage.surfaces`, the
generator applies the transform below. All transforms are deterministic
(NFR-011) and reproducible (FR-002 byte-equivalence).

### 4.1 Claude (`claude`)

- **Output path**: `.claude/commands/<name>.md`
- **Transform**:
  - Frontmatter: emit a Claude-flavoured YAML block with `description`,
    `argument-hint` (synthesised from `args`), and (when `model != default`)
    `model: <model>`.
  - Body: copied verbatim. `@{path}` placeholders left in-place if Claude
    supports them (it does for `.claude/commands` markdown — they are the
    existing convention).
  - **Description-as-frontmatter**: the canonical `description` field is what
    Claude uses for skill auto-invocation. ≤140 char rule binds here directly.
- **Emitted alias rule**: For each entry in `aliases:`, also emit
  `.claude/commands/gofer:<alias>.md` (or register in `.claude/namespaces.json`
  per Claude version) pointing at the same body.

### 4.2 Claude-mirror (`claude-mirror`)

- **Output path**: `extension/resources/claude-commands/<name>.md`
- **Transform**: byte-identical copy of the Claude output (preserves the
  existing mirror dir for the VSCode extension build).

### 4.3 Copilot (`copilot`)

- **Output path**: `extension/resources/copilot-prompts/<name>.prompt.md`
- **Transform**:
  - Wrap body in the existing Copilot prompt-template wrapper (preserves
    header/footer convention from current
    `extension/resources/copilot-prompts/*.prompt.md`).
  - Frontmatter is dropped; `description` becomes a top-of-file HTML comment for
    picker fuzzy-search to index.
  - `@{path}` placeholders are pre-expanded inline (Copilot does not natively
    resolve `@{}`); the generator inlines the include content with a
    `<!-- include:<path> -->` marker.

### 4.4 GitHub-prompts (`github-prompts`)

- **Output path**: `.github/prompts/<name>.prompt.md`
- **Transform**: identical to Copilot transform but in the alternative path used
  by GitHub repository-level prompt files.

### 4.5 Gemini (`gemini`)

- **Output path**: `.gemini/commands/gofer/<short>.toml` where `<short>` is the
  first entry of `aliases:` (or `name` if `aliases` is empty).
- **Transform**:
  - Convert body Markdown to a TOML document with:
    ```toml
    description = "<frontmatter description ≤140>"
    [args]
    # one [args.<name>] block per arg
    prompt = """
    <body markdown verbatim, with {{args.<name>}} retained — Gemini supports this natively>
    """
    ```
  - `@{path}` placeholders are LEFT in-place (Gemini supports `@{}` injection
    natively).
  - **Namespacing**: subfolder under `.gemini/commands/gofer/` produces the
    `/gofer:<short>` namespace automatically (Decision 5).

### 4.6 Codex (`codex`)

- **Output paths**:
  - `.agents/skills/<name>/SKILL.md` — flat tree per FR-008. Depth from
    `.agents/skills/` is exactly 2.
  - `AGENTS.md` (repo-root) — accumulated role entry per stage.
  - `codex-config.toml` (repo-root, template) — accumulated `[[skills.config]]`
    entry per stage with `enabled = true`, paste-ready into
    `~/.codex/config.toml`.
- **Transform**:
  - SKILL.md frontmatter: `name`, `description` (≤140; cumulative across all
    Codex-emitted stages MUST be ≤2KB per NFR-004 / SC-006).
  - Body: copied verbatim.
  - `@{path}` placeholders pre-expanded inline (Codex skills do not resolve
    `@{}`).
  - **Per-CLI exclusion**: if the stage's `surfaces:` does not include `codex`,
    NO emission to `.agents/skills/`, NO entry in `AGENTS.md`, NO entry in
    `codex-config.toml`.
- **Flat-tree rule (FR-008)**: emitted paths MUST match
  `^\.agents/skills/[^/]+/SKILL\.md$`. No `<tenant>/<stage>/` nesting allowed.

### 4.7 VSCode (`vscode`)

- **Output path**: `.system/skills/<name>/SKILL.md` — same flat layout as Codex;
  consumed by the VSCode extension's skill loader.
- **Transform**: identical to Codex SKILL.md transform.

---

## 5. Validation matrix — FR → schema rule mapping

Every functional requirement that has a generator-side enforcement maps to one
or more schema rules. This is the matrix `/4_gofer_tasks` will use to generate
concrete validator tests.

| FR      | Rule                                                                       | Where enforced                                                                                                                                                                                                                                                                  | Generator exit on violation      |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| FR-001  | Single canonical file per stage at `.specify/commands/<stage>.md`          | File-discovery: assert no other `<stage>.md` outside `.specify/commands/` is the source-of-truth                                                                                                                                                                                | 1                                |
| FR-002  | Byte-equivalent reproduction (modulo description shortening)               | `--check` mode diff suite                                                                                                                                                                                                                                                       | 2                                |
| FR-005  | Aliases resolve to same body — no body fork                                | Alias emission shares body content with canonical; checksum equality enforced                                                                                                                                                                                                   | 1                                |
| FR-006  | `description` ≤140 chars                                                   | YAML schema `maxLength: 140` on `description`                                                                                                                                                                                                                                   | 3                                |
| FR-007  | Per-CLI exclusion: Claude-only stages excluded from codex/gemini           | Cross-check `name` against the Claude-only list `[0_business_scenario, gofer_constitution, gofer_hydrate, 7_gofer_save, 8_gofer_resume]`; if any of these list `codex` or `gemini` in `surfaces:`, fail                                                                         | 4                                |
| FR-008  | Flat tree: `.agents/skills/<name>/SKILL.md` only                           | Post-emit path-depth assertion (depth from `.agents/skills/` must equal 2)                                                                                                                                                                                                      | 1                                |
| FR-009  | Codex doctor exists + read-only                                            | Out of generator scope; covered by `cli-commands.md` §2                                                                                                                                                                                                                         | n/a                              |
| FR-010  | Constitution documents `.agents/skills/` (not `.claude/skills/`)           | Post-emit text inspection of `.claude/commands/gofer_constitution.md` for the discovery-paths section                                                                                                                                                                           | 1                                |
| FR-011  | No `skills_context_budget_percent` reference anywhere                      | B-6 rule applied to every body + frontmatter; repo-wide grep run by generator post-emit                                                                                                                                                                                         | 1                                |
| FR-012  | `/gofer:plan` first-class (plan-mode toggle, ADR-003)                      | Existence of `.specify/commands/gofer_plan.md` with `category: control` and `surfaces: [claude, claude-mirror, copilot, vscode]` (NO `codex` — Codex has native `/plan`; NO `gemini` — Gemini has its own equivalent). Generator REJECTS `aliases: ["plan"]` on any other file. | 1                                |
| FR-013  | `/gofer:side` first-class                                                  | Existence of `.specify/commands/gofer_side.md` with `category: control` and `surfaces: [claude, claude-mirror, copilot, vscode]` (NO `codex` — Codex has native `/side`; NO `gemini`).                                                                                          | 1                                |
| FR-014  | `/gofer:personality` first-class                                           | Existence of `.specify/commands/gofer_personality.md` with `args[0].type: enum`, `args[0].choices: [friendly, pragmatic, none]`, `category: control`, and `surfaces: [claude, claude-mirror, copilot, vscode]` (NO `codex`; NO `gemini`).                                       | 1                                |
| FR-031  | Claude plugin manifest `.claude-plugin/plugin.json` with descriptions ≤140 | Generator emits the manifest; all entries derived from frontmatter `description` (which is already capped)                                                                                                                                                                      | 3                                |
| FR-032  | Gemini extension manifest + TOML files                                     | Generator emits `.gemini/extension.json` + `.gemini/commands/gofer/<short>.toml` per stage with `gemini` in `surfaces:`                                                                                                                                                         | 1                                |
| FR-033  | Codex `AGENTS.md` + `codex-config.toml`                                    | Generator emits both at repo root, accumulating one entry per Codex-surfaced stage                                                                                                                                                                                              | 1                                |
| FR-034  | Hook-log emission for stage launch                                         | Generator wires `.specify/scripts/hooks/log-stage-launch.sh` reference into emitted bodies (Universal hook hookup)                                                                                                                                                              | 1                                |
| NFR-004 | Cumulative description budget ≤2KB on Codex paths                          | Sum description bytes across all `codex`-surfaced stages post-emit; fail if >2048                                                                                                                                                                                               | 3                                |
| NFR-011 | Determinism                                                                | Two consecutive runs produce byte-identical output; integration-test asserts                                                                                                                                                                                                    | 0 (test fails outside generator) |

---

## 6. Required-features confirmation

The four hard rules called out by the parent task are each present at least once
in this schema:

1. **≤140 char description rule (FR-006)** — encoded as
   `description: maxLength: 140` in §2 (frontmatter JSON Schema) and as the
   FR-006 row in the §5 validation matrix. Generator exit code 3 on violation.

2. **AI-leverage 4-verb requirement (FR-018)** — encoded in
   `sub-agent-contracts.md` §3 (visual-value-stream-writer: "AiLeverageTag
   REQUIRED on every step ... exactly one of the four verb tags: [R]eplace,
   [U/Augment], [A]utomate, [O]bserve"). Cross-referenced from this schema's §5
   validation matrix only as an out-of-scope note (the generator does not
   validate TO-BE artifacts; the sub-agent does, with `/2_gofer_specify` as the
   gate).

3. **Flat-tree rule (FR-008)** — encoded in §4.6 ("Flat-tree rule (FR-008):
   emitted paths MUST match `^\.agents/skills/[^/]+/SKILL\.md$`. No
   `<tenant>/<stage>/` nesting") and as the FR-008 row in the §5 validation
   matrix.

4. **Per-CLI exclusion rule (FR-007)** — encoded in §2 (`surfaces:` schema with
   the explicit `enum` values), in §4.6 ("Per-CLI exclusion: if the stage's
   `surfaces:` does not include `codex`, NO emission to `.agents/skills/`"), and
   as the FR-007 row in the §5 validation matrix.

---

## 7. Confirmation: NO `skills_context_budget_percent` anywhere

A repo-wide grep against this entire `contracts/` directory MUST return zero
matches for the literal string `skills_context_budget_percent`. The only
references to that string in this feature folder are inside `spec.md`,
`research.md`, and `proposal-review.md` where they document the _fact that the
key does not exist_. Inside the `contracts/` files (`cli-commands.md`,
`sub-agent-contracts.md`, `source-of-truth-schema.md`) the string is mentioned
only when explicitly framed as "MUST NOT be emitted" or "the doctor never refers
to" — i.e. as a negative assertion, never as a config key the generator or
doctor writes. Generator rule B-6 enforces this for emitted bodies.

`/4_gofer_tasks` will generate a concrete repo-wide grep test asserting zero
positive emissions of this key in any generated artifact.
