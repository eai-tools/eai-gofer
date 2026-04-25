# Final Regression Checklist (T184)

Hard Invariant 1 (no-regression) closing checklist. Run only after every Phase 3
task has merged to `main`.

## Pre-flight

- [ ] Confirm working tree is clean and on `main`
- [ ] `git pull origin main`
- [ ] `npm install` (root + extension)

## Gate replay

- [ ] Run T053 — byte-equivalence gate
      (`npx vitest run tests/unit/scripts/byte-equivalence.test.ts`)
- [ ] Run T054 — alias uniqueness
      (`npx vitest run tests/unit/scripts/alias-uniqueness.test.ts`)
- [ ] Run T055 — description budget
      (`npx vitest run tests/unit/scripts/description-budget.test.ts`)
- [ ] Run T056 — surface exclusion
      (`npx vitest run tests/unit/scripts/surface-exclusion.test.ts`)
- [ ] Run T057 — agent count (filesystem ground truth = 37)
- [ ] Run T058–T061 — generator regression suite
      (`npx vitest run tests/unit/scripts/generator-regression.test.ts`)

## Pipeline parity

- [ ] Verify every existing /0 … /10 stage produces identical output (modulo
      description shortening per FR-006) against a pinned reference feature
      folder generated on the previous `main` tag.
- [ ] Confirm per-CLI exclusion of the 5 Claude-only stages
      (`0_business_scenario`, `gofer_constitution`, `gofer_hydrate`,
      `7_gofer_save`, `8_gofer_resume`) under `.agents/skills/`,
      `.gemini/commands/`, `extension/resources/copilot-prompts/`,
      `.github/prompts/`, `.system/skills/`.

## Codex skill-budget hygiene

- [ ] Run `npm run gofer:codex-doctor` against `~/.codex/skills/` — assert no
      over-budget warning.
- [ ] Repo-wide grep for `skills_context_budget_percent` returns zero matches
      (`tests/unit/scripts/final-no-fake-config-key.test.ts`).

## Tagging

- [ ] After all checks green, tag the head of `main` as
      `phase-1.5-gate-passed-final` and push the tag.
