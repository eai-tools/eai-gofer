---
feature: smoke-complete-evidence
status: draft
---

# Plan: Smoke Complete Evidence

## Architecture

- Tech stack: Markdown feature pack referencing existing TypeScript, shell, and
  generated-command assets in the repo
- UI surface: none
- Deployment target: none
- Validation expectation: `HAS_UI = false` and `DEPLOY_IN_SCOPE = false`
- Real implementation proof:
  - helper command sources and generator metadata live under
    `.specify/commands/` and `.specify/scripts/node/`
  - packaged resource sync uses
    `node .specify/scripts/node/sync-extension-resources.mjs`
  - managed workspace writes are symlink-protected in
    `extension/src/services/migration/ResourceSyncer.ts`
- Real test proof:
  - `tests/unit/scripts/helper-commands-cross-cli-parity.test.ts`
  - `tests/unit/scripts/validation-evidence-gates.test.ts`
  - `tests/unit/scripts/validation-report-compat.test.ts`
  - `tests/unit/scripts/extension-package-wiring.test.ts`
  - `tests/unit/scripts/hook-wiring.test.ts`
  - `tests/unit/release/release-verification.test.ts`
  - `tests/unit/extension/ResourceSyncer.workspace-sync.test.ts`

## Validation Intent

This smoke feature should PASS only if `/6_gofer_validate` can point to real
repo execution and persisted artifacts for:

1. helper-command parity and Codex budget proof
2. honest evidence-gate and report-contract proof
3. real release/resource-sync integration proof
4. contained blast radius with persisted `blast-radius-report.md`
5. explicit Category 3 not-in-scope handling for a no-UI feature
