---
feature: 035-plugin-workspace-bootstrap
spec: .specify/specs/035-plugin-workspace-bootstrap/spec.md
status: complete
created: 2026-05-28
---

# Implementation Plan: Plugin Workspace Bootstrap

## Summary

Implement a plugin-side equivalent of Gofer repo bootstrap by combining:

1. portable workspace check/bootstrap scripts,
2. canonical helper commands,
3. generated host preflight injection,
4. Codex surface cleanup,
5. bundle/public-surface regeneration plus regression tests.

## Build Plan

### Phase 1: Portable Repo Bootstrap Core

- Add `.specify/scripts/node/workspace-bootstrap-lib.mjs`.
- Add `.specify/scripts/node/gofer-workspace-check.mjs`.
- Add `.specify/scripts/node/gofer-workspace-bootstrap.mjs`.
- Encode the sentinel set, host policy map, `.gitignore` entries, instruction
  generation, hook config, and optional mirror copy behavior.

### Phase 2: Canonical Helper Commands

- Add `.specify/commands/gofer_check_workspace.md`.
- Add `.specify/commands/gofer_bootstrap_workspace.md`.
- Keep them in the shared cross-CLI surface matrix.
- Treat them as `control` commands with repo-level report artifacts in
  `.specify/logs/`.

### Phase 3: Generated Surface Contract

- Update `.specify/scripts/node/generate-commands.mjs` to inject a workspace
  preflight section into stage/helper surfaces.
- Exclude `gofer:plan`, `gofer:side`, `gofer:personality`,
  `gofer:check-workspace`, and `gofer:bootstrap-workspace`.
- Pass a host-specific `--host` value to emitted Claude, Copilot, Codex-skill,
  and Gemini surfaces.

### Phase 4: Packaging And Codex UX

- Keep full stage skills available in the bundle for non-Codex hosts.
- Point Codex-facing manifests at `plugin-skills/eai-gofer/SKILL.md`.
- Regenerate plugin bundles and mirrored manifests.
- Update root `AGENTS.md` so the helper inventory stays truthful.

### Phase 5: Validation

- Add bootstrap script tests.
- Add emitted-surface host-preflight tests.
- Update helper parity and Codex doctor expectations.
- Keep canonical descriptions within budget.
- Re-run build, typecheck, lint, doctor, package generation, and the full test
  suite.

## Key Design Choices

- Repo-local mirrors are optional because the plugin already provides host
  command surfaces.
- Bootstrap writes repo-owned state, not VS Code UI state.
- Workspace check is repo-scoped, so its report artifact lives under
  `.specify/logs/`, not inside a feature folder.
