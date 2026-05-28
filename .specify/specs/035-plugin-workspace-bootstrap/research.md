---
feature: 035-plugin-workspace-bootstrap
status: complete
created: 2026-05-28
goferCommit: d090cd1
---

# Research: Plugin Workspace Bootstrap

## Summary

Gofer's plugin bundles already ship the canonical command, skill, template, and
script assets needed for non-VSCode clients. What is missing is a repo-owned
bootstrap flow that turns those bundled assets into the same `.specify/`
workspace scaffold the VS Code extension expects.

The recommended contract is:

1. Add plugin-side `gofer:check-workspace`.
2. Add plugin-side `gofer:bootstrap-workspace`.
3. Run a silent preflight before stage/helper commands.
4. Prompt only when the repo is missing or stale.
5. Keep repo-local assistant mirrors optional, not default.

## Source Evidence

### VS Code Initialization Behavior

- `extension/src/extension.ts` registers `gofer.initialize` and runs
  `upgrade({ skipConfirmation: true })`, `syncMissingResources()`, and workspace
  reinitialization.
- `extension/src/goferMigrator.ts` shows fresh initialize creates the core
  scaffold, canonical command mirrors, scripts, templates, and VS Code settings.
- `extension/src/goferMigrator.ts` also defines a lighter
  `checkMissingResources()` plus `syncMissingResources()` repair path.
- `extension/src/services/migration/ResourceSyncer.ts` owns the repo instruction
  files, `.gitignore` updates, and Claude hook wiring.

### Plugin-Bundle Reality

- `plugins/eai-gofer/` already contains `.specify/commands`,
  `.specify/templates`, `.specify/scripts/{bash,node,hooks,powershell}`, and the
  host-facing plugin metadata.
- The bundle therefore has enough information to bootstrap a repo without the VS
  Code extension present.
- Codex picker duplication came from exposing both command-style entries and the
  full stage skill tree to the same picker.

## Decisions

### Decision 1: Preflight Every Stage/Helper Command

- **Choice**: inject a workspace preflight into generated Claude, Copilot,
  Codex-skill, and Gemini stage/helper surfaces.
- **Why**: users should not have to remember to initialize first.
- **Constraint**: pure session controls (`gofer:plan`, `gofer:side`,
  `gofer:personality`) stay ungated.

### Decision 2: Separate Check From Bootstrap

- **Choice**: implement `gofer:check-workspace` and `gofer:bootstrap-workspace`
  as distinct helper commands plus portable Node scripts.
- **Why**: read-only diagnosis and mutating repair need different guarantees.

### Decision 3: Use Host-Specific Repo Policies

- **Claude**: require `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`
- **Codex**: require `AGENTS.md`
- **Copilot**: require `.github/copilot-instructions.md`
- **Gemini**: core scaffold only

### Decision 4: Mirrors Are Optional

- **Choice**: default bootstrap creates the core `.specify/` scaffold and
  repo-owned host files only.
- **Why**: non-VSCode plugin installs already provide host command surfaces.
  Repo-local mirrors would recreate the noisy duplicate surfaces the user saw in
  Codex.

## Sentinel Set

The fast preflight should treat the workspace as missing if any of these are
absent:

- `.specify/.gofer-version`
- `.specify/commands/0_business_scenario.md`
- `.specify/templates/spec-template.md`
- `.specify/scripts/bash/create-new-feature.sh`
- `.specify/scripts/node/parse-stage-command.mjs`
- `.specify/scripts/hooks/post-tool-use.mjs`
- `.specify/scripts/powershell/install-optional-tools.ps1`
- `.specify/specs/`
- `.specify/memory/`

## Risks And Mitigations

| Risk                                                               | Mitigation                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Helper addition breaks existing stage/control classification tests | Classify both new helpers as `control` commands and extend helper-parity fixtures.                     |
| Codex budget blows past the 2048-byte skill-description limit      | Keep Codex plugin on the umbrella skill surface and shorten canonical budget descriptions.             |
| Generated surfaces drift from the new preflight contract           | Inject host-specific preflight text from the generator and add regression tests against emitted files. |
| Root `AGENTS.md` drifts from the command inventory again           | Update the repo-root AGENTS stage inventory alongside the new helpers.                                 |
