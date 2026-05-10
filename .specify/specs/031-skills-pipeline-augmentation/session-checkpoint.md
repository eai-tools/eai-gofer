---
feature: Skills Pipeline Augmentation
created: 2026-05-02T04:00:22Z
stage: 6_validate
status: paused
context_usage: 2%
last_commit: 54a2ac1
branch: release-vscode-surface-truth
---

# Session Checkpoint: Skills Pipeline Augmentation

## Current State

### Pipeline Progress

| Stage | Status | Artifact |
| --- | --- | --- |
| 1_gofer_research | done | research.md, proposal-review.md, context-bundle.md, reuse-scan.md |
| 2_gofer_specify | done | spec.md |
| 3_gofer_plan | done | plan.md, data-model.md, contracts/ |
| 4_gofer_tasks | done | tasks.md |
| 5_gofer_implement | done | command sources, generator/runtime/install changes, mirror regeneration |
| 6_gofer_validate | done | validation-report.md, blast-radius-report.md, traceability.md |

### Active Task

- **Current Task**: `T039 complete` — feature tasks are fully complete; current
  follow-up is post-validation cleanup, commit planning, and release readiness
- **Primary Files Being Modified**:
  `extension/src/services/migration/UpgradeService.ts`,
  `extension/src/goferMigrator.ts`,
  `.specify/scripts/node/generate-commands.mjs`,
  `docs/cli-support.md`,
  `tests/integration/command-generation.test.ts`
- **What Was Happening**: the Codex install model was aligned to the current
  official repo-local `.agents/skills` behavior, default VS Code install/update
  flows stopped recreating legacy global Codex bundles, generated mirrors were
  re-synced, stale path assumptions in docs/tests were updated, and the full
  repo test suite was rerun successfully.

### Task Completion Status

- Completed: `39/39` tasks in `tasks.md`
- Current phase: post-validation handoff / save
- Next task: decide whether to land this as a clean commit/release candidate or
  split/reduce the current dirty worktree before release

## Code Changes

### Committed This Session

No new commit was created for this work during this save. Current branch head is
still:
`54a2ac1 docs: update .tech-docs/ [nightly-automated]`

### Uncommitted Changes

| File | Status | Description |
| --- | --- | --- |
| `extension/src/services/migration/UpgradeService.ts` | Modified | Removed automatic `~/.codex/skills` setup from normal update/upgrade flow |
| `extension/src/goferMigrator.ts` | Modified | Kept global Codex symlink logic as legacy-only helper; missing-resource sync no longer calls it |
| `.specify/scripts/node/generate-commands.mjs` and generator companions | Modified | Canonical Codex emission stays flat under `.agents/skills` with path-based config sample |
| `docs/cli-support.md`, `README.md`, `MULTI_CLI_SETUP.md`, `docs/quickstart.md`, `docs/setup-codex-cli.md` | Modified | Documentation updated to the repo-local Codex install model |
| `tests/integration/command-generation.test.ts`, `tests/integration/cross-platform-parity.test.ts`, `tests/integration/mcp-integration.test.ts` | Modified | Stale `.system/skills/gofer/...` expectations updated to canonical `.agents/skills/...` behavior |
| `.agents/skills/*`, `.system/skills/*`, `extension/resources/**`, `.claude/**`, `.github/prompts/**`, `.gemini/**` | Modified / New / Deleted | Regenerated mirrors and deleted legacy nested `gofer/` Codex trees |

Working tree summary at save time:

- Modified entries: `174`
- Deleted entries: `99`
- Untracked entries: `104`
- Total git-status entries: `377`

### Files NOT to Modify (Protected)

- `extension/src/autonomous/PipelineStateManager.ts`
- `extension/resources/bash-scripts/pipeline-state.sh`
- `.specify/commands/gofer_constitution.md`
- `.specify/commands/gofer_hydrate.md`
- Do not change the numbered Gofer pipeline sequence
- Do not hand-edit generated mirrors as the source of truth
- Do not add extra `/6A.x` stages

## Context for Resumption

### Key Decisions Made

1. **Codex canonical repo path is `.agents/skills/`**: Gofer should install and
   route Codex from that repo-local surface; `.system/skills/` remains a legacy
   compatibility mirror only.
2. **Default installs/updates must not create `~/.codex/skills` bundles**:
   official Codex repo scanning plus duplicate-name behavior means the global
   bundle path recreates the duplicate-command problem.
3. **Cross-CLI parity remains mandatory**: Claude, Copilot, Codex, and Gemini
   must continue to emit from the same canonical command set without breaking
   their existing surfaces.
4. **The feature is validated complete**: `validation-report.md` is `PASS
   110/110`, `traceability.md` covers `4/4` user stories and `18/18`
   acceptance criteria, and the current full test suite passed `247` files /
   `3335` tests.
5. **Release packaging still depends on canonical sync**: `extension/resources`
   must stay in sync with repo sources before a VSIX/release is cut.

### Blockers Encountered

- **No functional blocker remains** for feature 031 itself.
- **Operational blocker remains**: the repo is still a very large uncommitted
  change set, so the next step is a landing strategy, not more implementation.

### Gotchas Discovered

- Codex will surface duplicates when two skills share the same `name`; this is
  why multiple repo/global Gofer-visible copies caused the CLI picker noise.
- `extension/resources/` is part of the shipped VSIX surface, so changing only
  repo source files is not enough; sync/regeneration must be included.
- The active branch is still `release-vscode-surface-truth`; this feature work
  remains uncommitted in the current worktree.

### Open Questions

- [ ] Should this land as one commit or as a small sequence split between
      generator/runtime, docs, and regenerated mirrors?
- [ ] Should `setupCodexGlobalSymlink()` now be fully deprecated/removed, or
      kept as a manual legacy cleanup tool only?
- [ ] Do we want a dedicated cleanup/migration note for users who already have
      stale Gofer bundles under `~/.codex/skills`?

## Resumption Instructions

### Quick Resume

```bash
cd /Users/douglaswross/Code/eai/eai-tools/gofer
git checkout release-vscode-surface-truth
/8_gofer_resume
```

### Manual Resume Steps

1. Read this checkpoint file
2. Review `git status --short --branch` and `git diff --stat`
3. Inspect the install/runtime changes in `extension/src/services/migration/`
   and `extension/src/council/`
4. Decide commit/release strategy for the dirty worktree
5. If continuing toward release, rerun generation/sync/build/tests before
   invoking `./release-auto.sh ...`

### Context to Load First

1. `.specify/specs/031-skills-pipeline-augmentation/validation-report.md`
2. `.specify/specs/031-skills-pipeline-augmentation/traceability.md`
3. `extension/src/services/migration/UpgradeService.ts`
4. `extension/src/goferMigrator.ts`
5. `docs/cli-support.md`
6. `tests/integration/command-generation.test.ts`

## Test Status

- [x] Build passes: `npm run build`
- [x] Tests pass: `npm test` (`247` files / `3335` tests)
- [ ] Lint passes: not rerun after the latest install-model/doc/test updates in
      this session
- [x] Extension compile passes: `cd extension && npm run compile`
- [x] Context health: healthy (`2%`, estimated)

## Notes

- The feature itself is complete and validated; the remaining work is landing
  and release hygiene.
- The user explicitly asked to save status here after the Codex install-path
  alignment work, not because context pressure forced a save.
- Normal Gofer installs should now work on anyone's machine without depending on
  a user-specific Codex home-directory symlink.
