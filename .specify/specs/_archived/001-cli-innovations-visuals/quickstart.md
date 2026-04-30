---
id: 001-cli-innovations-visuals
title: 'Quickstart: CLI Innovations + Multi-Persona Visual Artifacts'
status: draft
created: 2026-04-25
updated: 2026-04-25
author: Claude
---

# Quickstart Testing Guide — CLI Innovations + Multi-Persona Visual Artifacts

This quickstart walks a reviewer through verifying the three-phase uplift
end-to-end: source-of-truth generator (Phase 1), persona-pack visual artifacts
(Phase 2), and stakeholder packaging across the four CLI surfaces (Phase 3).
Every manual scenario maps 1:1 to an acceptance criterion in `spec.md`.

The two hard invariants under test:

1. **No-regression** of every existing slash command, sub-agent, hook, stage
   script, and template.
2. **Codex skill-budget hygiene**: ≤140-char descriptions, ≤2KB cumulative, flat
   tree, per-CLI exclusion, no fake `skills_context_budget_percent` key.

---

## 1. Prerequisites

Required:

- **Node** ≥ 20 (the source-of-truth generator at
  `.specify/scripts/node/generate-commands.mjs` is an ES module).
- **npm** (workspace install + Vitest test runner).
- **Git** with the `001-cli-innovations-visuals` branch checked out.

Optional (only needed for the rendering/render-fallback scenarios):

- **`@mermaid-js/mermaid-cli`** (`mmdc`) — PNG/SVG export for
  `/7a_stakeholder_comms` (`npm install -g @mermaid-js/mermaid-cli`). Headless
  Chrome sandbox MUST stay enabled (NFR-006); never pass `--no-sandbox`.
- **Marp CLI** — slide-deck rendering of `stakeholder-pack.md`
  (`npm install -g @marp-team/marp-cli`).

Optional (for cross-CLI parity verification — any one is sufficient for partial
verification, all four for full FR-005/FR-031/FR-032/FR-033 coverage):

- **Claude Code** CLI (Phase 1 / Phase 2 primary surface).
- **Gemini CLI** (verifies `.gemini/extension.json` +
  `.gemini/commands/gofer/<stage>.toml` emission).
- **Codex CLI** (verifies `.agents/skills/<stage>/SKILL.md` flat tree +
  `gofer codex doctor`).
- **GitHub Copilot CLI** (verifies picker + fuzzy completion of `/gofer:*`).

**Prerequisite count**: 3 required + 2 optional render tooling + 4 optional CLIs
= **9 total**.

---

## 2. Setup

```bash
# 1. Clone and check out the feature branch
git clone <repo-url> gofer
cd gofer
git checkout 001-cli-innovations-visuals

# 2. Install workspace dependencies
npm install
cd extension && npm install && cd ..

# 3. Verify byte-equivalence baseline (Phase 1 gate)
#    This MUST exit 0 before any persona-pack work is exercised — it
#    proves the generator reproduces today's emit paths bit-for-bit
#    (modulo description shortening per FR-006).
npm run gofer:generate -- --check

# 4. (Optional) Pre-build the extension if you intend to manually
#    exercise commands inside VSCode
cd extension && npm run compile && cd ..
```

If step 3 fails, do not proceed — see
[Common Issues → byte-equivalence drift](#common-issues).

---

## 3. Manual Testing Scenarios

Each scenario maps to one or more user stories (US) and functional requirements
(FR) from `spec.md`.

### Scenario A — Source-of-truth byte-equivalence

**Maps to**: US3 / FR-001, FR-002

**Prerequisites**: Setup steps 1–3 complete. A clean working tree.

**Steps**:

1. Capture the current emit-target tree:
   ```bash
   tar -cf /tmp/before.tar .claude/commands extension/resources/copilot-prompts \
       .github/prompts .agents/skills .system/skills
   ```
2. Re-run the generator:
   ```bash
   npm run gofer:generate
   ```
3. Diff the emit targets against the snapshot:
   ```bash
   tar -cf /tmp/after.tar .claude/commands extension/resources/copilot-prompts \
       .github/prompts .agents/skills .system/skills
   diff <(tar -tvf /tmp/before.tar | sort) <(tar -tvf /tmp/after.tar | sort)
   ```

**Expected outcome**: Byte-identical emission for every existing stage. The only
allowed differences are description-line shortenings demanded by FR-006 (≤140
chars). Generator runtime under 2 seconds (NFR-001, SC-007).

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario B — Codex doctor finds duplicate bundles

**Maps to**: US6 / FR-009

**Prerequisites**:

- A test fixture `~/.codex/skills` containing 11 duplicated Gofer bundles (use
  `tests/fixtures/codex-skills-duplicated/`).
- `gofer` CLI built (`cd extension && npm run compile`).

**Steps**:

1. Point the doctor at the fixture:
   ```bash
   CODEX_HOME=$(pwd)/tests/fixtures/codex-home gofer codex doctor
   ```
2. Capture stdout to `/tmp/doctor.out`.
3. Verify no writes occurred:
   ```bash
   find tests/fixtures/codex-home -newer /tmp/doctor.out -type f
   # MUST be empty
   ```

**Expected outcome**:

- Every duplicate path is listed by absolute path.
- Canonical Gofer skill set is printed with each description ≤140 chars and
  cumulative bytes ≤2KB (NFR-004, SC-006).
- Output ends with a paste-ready `[[skills.config]] enabled = false` block
  scoped to the duplicates only.
- No files modified anywhere on disk (read-only invariant).

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario C — Codex doctor refuses to write `skills_context_budget_percent`

**Maps to**: US6 / FR-011

**Prerequisites**: Scenario B fixture available.

**Steps**:

1. Run the doctor and capture all output:
   ```bash
   gofer codex doctor 2>&1 | tee /tmp/doctor.full
   ```
2. Search for the forbidden key in both the doctor output AND the entire repo:
   ```bash
   grep -R "skills_context_budget_percent" /tmp/doctor.full . || echo "OK: zero matches"
   ```

**Expected outcome**: Zero matches anywhere (SC-011). The doctor must use only
the supported `[[skills.config]] path = "..." enabled = false` form per FR-009.

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario D — `/gofer:*` alias routes to existing stage

**Maps to**: US3 / US5 / FR-013 (and FR-005 alias backbone)

**Prerequisites**: Setup complete; Claude Code session open in repo root.

**Steps**:

1. In the CLI, type `/gofer:` and confirm the picker enumerates the namespaced
   commands (≤140-char descriptions per FR-006).
2. Run `/gofer:research` against a fixture feature folder.
3. In a fresh session, run `/1_gofer_research` against the same folder.
4. Diff the two output folders.
5. Run `/gofer:side "quick clarifier"` mid-thread and confirm main-thread
   context survives (FR-013).

**Expected outcome**: Identical artifact set produced by `/gofer:research` and
`/1_gofer_research` (FR-005). `/gofer:side` opens an isolated thread; on return,
prior main-thread state is preserved exactly.

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario E — `/2_gofer_specify` hard-gates on persona-pack files

**Maps to**: US1 / US2 / FR-016, FR-018

**Prerequisites**: A feature folder where `/0a_problem_validation` and
`/1_gofer_research` have completed.

**Steps**:

1. Run `/2_gofer_specify` to completion.
2. Confirm `impact-canvas.md` and `value-stream-tobe.md` exist in the feature
   folder.
3. Delete `impact-canvas.md`.
4. Attempt to run `/3_gofer_plan`.
5. Restore `impact-canvas.md`, delete `value-stream-tobe.md`, retry
   `/3_gofer_plan`.

**Expected outcome**:

- After step 1: both files exist; each opens with a plain-language paragraph
  (FR-027) before the Mermaid block.
- Steps 4 and 5: `/3_gofer_plan` is blocked with a remediation prompt naming the
  missing artifact (Edge Cases — persona-pack completeness gate).

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario F — TO-BE value-stream rejects step without AI-leverage tag

**Maps to**: US1 / US2 / FR-018, FR-021 (heatmap-tagging style validator),
FR-026

**Prerequisites**: Feature folder with `value-stream-tobe.md` present.

**Steps**:

1. Hand-edit `value-stream-tobe.md` to remove the AI-leverage verb annotation
   from one step (so it has none of `Replace | Augment | Automate | Observe`).
2. Re-run the value-stream validator (`/2_gofer_specify` re-entry, or
   `npm run gofer:validate-tobe`).
3. Add **two** verbs to a different step.
4. Re-run the validator.

**Expected outcome**: Both edits are rejected by the parser-enforced gate
(SC-010): the validator names the offending step and refuses to advance to
`/3_gofer_plan`. After repair, the AI-leverage Ring counts in `impact-canvas.md`
match the parser output for the TO-BE flowchart exactly (FR-026).

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario G — Cumulative description budget under 2KB after migration

**Maps to**: US6 / NFR-004 / SC-006

**Prerequisites**: Setup complete and generator run.

**Steps**:

1. Run a one-shot byte count over emitted Codex skills (post-exclusion of
   Claude-only stages):
   ```bash
   find .agents/skills -name SKILL.md -exec awk '/^description:/{sub(/^description: */,""); print}' {} \; \
     | awk '{ total += length($0) + 1 } END { print total " bytes across " NR " skills" }'
   ```
2. Confirm Claude-only stages (`0_business_scenario`, `gofer_constitution`,
   `gofer_hydrate`, `7_gofer_save`, `8_gofer_resume`) are absent from
   `.agents/skills/` (FR-007, SC-012).

**Expected outcome**: Total ≤ 2048 bytes. Claude-only stages absent from Codex
emit path.

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario H — Existing pipeline produces identical output (no-regression)

**Maps to**: FR-002, FR-003, FR-004 / SC-005, SC-008

**Prerequisites**: A reference feature folder generated on `main` prior to this
branch.

**Steps**:

1. On `main`, run the entire pipeline `/0_business_scenario` through
   `/10_gofer_cloud` against a fixture problem statement; archive the resulting
   feature folder as `reference-main/`.
2. Switch to `001-cli-innovations-visuals`, run the identical pipeline against
   the same problem statement, archive as `reference-feature/`.
3. Diff the two trees, **excluding** the new persona-pack artifacts
   (`impact-canvas.md`, `value-stream-*.md`, `c4-*.md`, `capability-heatmap.md`,
   `bounded-context.md`, `data-model-erd.md`, `risk-heatmap.md`,
   `stakeholder-pack.md`):
   ```bash
   diff -r reference-main reference-feature \
     -x 'impact-canvas.md' -x 'value-stream-*.md' -x 'c4-*.md' \
     -x 'capability-heatmap.md' -x 'bounded-context.md' \
     -x 'data-model-erd.md' -x 'risk-heatmap.md' -x 'stakeholder-pack.md'
   ```

**Expected outcome**: Zero substantive differences. All 36 sub-agents, hooks,
stage scripts, and templates exercise identically. ASCII bar charts replaced by
`xychart-beta` per FR-025 are the only intentional content delta.

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario I — Stakeholder pack assembles all generated visuals

**Maps to**: US7 / FR-028, FR-029, FR-030

**Prerequisites**: A feature folder where `/6_gofer_validate` has completed and
the full persona pack exists.

**Steps**:

1. Run `/7a_stakeholder_comms`.
2. Open the resulting `stakeholder-pack.md`.
3. Verify it inlines (or references with anchored embeds) every persona-pack
   artifact in this deterministic order: `impact-canvas` → `value-stream-asis` →
   `value-stream-tobe` → `c4-context` → `c4-container` → `capability-heatmap` →
   `bounded-context` → `data-model-erd` → `risk-heatmap` → ROI `xychart-beta`.
4. Re-run with the optional render flag (requires `mmdc`):
   ```bash
   /7a_stakeholder_comms --render
   ```
5. (Optional) Render Marp deck:
   ```bash
   /7a_stakeholder_comms --marp
   ```

**Expected outcome**: Step 3 produces a single self-contained file with all
artifacts in order. Step 4 produces PNG/SVG renders per Mermaid block; if `mmdc`
is missing, the pipeline emits a single warning and produces Markdown-only
output without blocking (FR-029, NFR-010 fallback). Step 5 produces a Marp deck
on success; failure does not block the pipeline (FR-030).

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario J — Visual-writer sub-agent emits plain-language preamble

**Maps to**: FR-027 (novice guardrail) — applies to FR-016 through FR-025

**Prerequisites**: Generated persona pack from Scenario E or H.

**Steps**:

1. For each persona-pack artifact, confirm the file opens with a plain-language
   paragraph **before** any fenced ` ```mermaid ` block:
   ````bash
   for f in impact-canvas.md value-stream-asis.md value-stream-tobe.md \
            c4-context.md c4-container.md capability-heatmap.md \
            bounded-context.md data-model-erd.md risk-heatmap.md; do
     awk '/```mermaid/{exit} /^[A-Za-z]/{found=1} END{exit !found}' "$f" \
       || echo "FAIL: $f missing preamble"
   done
   ````
2. Confirm no diagram-only file slipped through.

**Expected outcome**: Every artifact begins with prose. Lint step (per FR-027)
refuses emission otherwise.

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

### Scenario K — `/gofer:side` persists side notes without changing main pipeline state

**Maps to**: US8 / FR-013, FR-015 (queued-input adjacent)

**Prerequisites**: An active Gofer session mid-pipeline (e.g., `/3_gofer_plan`
complete, `/4_gofer_tasks` not yet run).

**Steps**:

1. Capture pipeline state via the existing `pipeline-state` script:
   ```bash
   .specify/scripts/bash/pipeline-state.sh > /tmp/state.before
   ```
2. Run `/gofer:side "note: confirm SLA target with product"` and answer the side
   prompt.
3. Return to the main thread.
4. Capture state again:
   ```bash
   .specify/scripts/bash/pipeline-state.sh > /tmp/state.after
   diff /tmp/state.before /tmp/state.after
   ```
5. Confirm the side note is persisted (e.g., under
   `.specify/specs/<feature>/side-notes/`).

**Expected outcome**: Pipeline state diff is empty (main thread state preserved
per FR-013). Side note exists on disk with timestamp.

**Status**: PASS (verified by Vitest suite, run `npx vitest run`)

---

**Scenario count**: **11** manual scenarios (A–K), each mapped to spec
acceptance criteria. All scenarios annotated PASS by T186.

---

## 4. Automated Tests

```bash
cd extension
npm test
```

Vitest runs the entire suite. The specific test files that exercise this
feature:

| Suite                          | Phase | Covers                                                                               |
| ------------------------------ | ----- | ------------------------------------------------------------------------------------ |
| `byte-equivalence.test.ts`     | 1     | FR-001, FR-002 — Phase 1 gate; refuses to advance if generator drifts                |
| `codex-doctor.test.ts`         | 1     | FR-009, FR-011 — read-only doctor + no fake-config-key emission                      |
| `description-budget.test.ts`   | 1     | FR-006, NFR-004, SC-006 — ≤140 chars per description, ≤2KB cumulative                |
| `ai-leverage-tag.test.ts`      | 2     | FR-018, FR-026, SC-010 — every TO-BE step has exactly one of the four verbs          |
| `gate-enforcement.test.ts`     | 2     | FR-016, FR-018 + Edge Cases — `/3_gofer_plan` blocked when persona-pack files absent |
| `alias-routing.test.ts`        | 1     | FR-005, FR-013, FR-014 — `/gofer:*` resolves to numbered-stage skill bodies          |
| `visual-writer-golden.test.ts` | 2     | FR-016 through FR-025, FR-027 — golden snapshots of each persona-pack artifact       |

**Test suite count**: **7** automated test files.

Run a single suite:

```bash
cd extension && npm test -- byte-equivalence
```

---

## 5. Key Files

| Concern                                          | Path                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-of-truth generator                        | `.specify/scripts/node/generate-commands.mjs`                                                                                                                               |
| Codex doctor diagnostic                          | `extension/src/codex/doctor.ts`                                                                                                                                             |
| Source-of-truth definitions (per stage)          | `.specify/commands/<stage>.md`                                                                                                                                              |
| Persona-pack templates                           | `.specify/templates/{impact-canvas,c4-context,c4-container,value-stream-asis,value-stream-tobe,capability-heatmap,bounded-context,data-model-erd,risk-heatmap}-template.md` |
| Visual-writer sub-agents                         | `.claude/agents/visual-{canvas,c4,value-stream,heatmap,bounded-context,erd,risk}-writer.md`                                                                                 |
| Claude plugin manifest                           | `.claude-plugin/plugin.json`                                                                                                                                                |
| Gemini extension manifest                        | `.gemini/extension.json` + `.gemini/commands/gofer/<stage>.toml`                                                                                                            |
| Codex agent bundle                               | `AGENTS.md` + `codex-config.toml` + `.agents/skills/<stage>/SKILL.md`                                                                                                       |
| Optional Mermaid export                          | `.specify/scripts/node/mermaid-export.mjs`                                                                                                                                  |
| Namespace hint                                   | `.claude/namespaces.json`                                                                                                                                                   |
| Constitution (Codex distribution doc per FR-010) | `.specify/memory/gofer-constitution.md`                                                                                                                                     |

---

## 6. Common Issues

### "byte-equivalence drift" — generator complains on `--check`

The generator detected a hand-edit on an emitted target (`.claude/commands/`,
`extension/resources/copilot-prompts/`, `.github/prompts/`, `.agents/skills/`,
`.system/skills/`) that does not match the canonical
`.specify/commands/<stage>.md`.

**Fix**: identify the divergent file in the generator output, port the change
back into the canonical `.specify/commands/<stage>.md`, then re-run
`npm run gofer:generate -- --check`. Use `--force-emit` only after the canonical
file has been updated, never to paper over the hand-edit (Edge Cases —
Source-of-truth divergence).

### "description over budget" — emit refuses with description >140 chars

Edit the YAML frontmatter `description:` line in `.specify/commands/<stage>.md`.
Aim for verb-led, ≤120 chars to leave headroom for any future addition. Re-run
the generator. Cumulative budget across the canonical Gofer set must stay ≤2KB
(NFR-004).

### "Codex doctor still warns 2%" after running doctor

The doctor is read-only — it does not modify `~/.codex/config.toml`. Copy the
emitted `[[skills.config]]` block into your config:

```toml
[[skills.config]]
path = "/abs/path/to/duplicate-bundle"
enabled = false
```

Restart Codex. Confirm no "Exceeded skills context budget of 2%" warning on the
next session start (SC-003).

### "mmdc fails" — Chrome sandbox or install error

- If install failed, re-run with the system Chromium picked up:
  `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install -g @mermaid-js/mermaid-cli`
  then point at a Chrome path.
- **Do not** use `--no-sandbox` to work around sandbox errors (NFR-006). Fix the
  sandbox prerequisites instead (kernel `user_namespaces`, AppArmor profile).
- mmdc is OPTIONAL: `/7a_stakeholder_comms` falls back to Markdown-only output
  with a single warning when mmdc is unavailable (FR-029, NFR-010).

### "/gofer:\* not found" — picker doesn't show the namespace

The CLI is reading a stale command set. Re-run the generator to refresh emit
targets:

```bash
npm run gofer:generate
```

Then restart the CLI (Claude Code, Gemini, Codex, or Copilot). For Claude Code,
the namespace hint at `.claude/namespaces.json` must be present; for Gemini,
confirm `.gemini/commands/gofer/<stage>.toml` files exist; for Codex, confirm
flat `.agents/skills/<stage>/SKILL.md` (no tenant nesting per FR-008).

---

## Summary

- **Prerequisite count**: 9 (3 required + 2 optional render tools + 4 optional
  CLIs)
- **Manual scenario count**: 11 (A through K)
- **Automated test suite count**: 7
