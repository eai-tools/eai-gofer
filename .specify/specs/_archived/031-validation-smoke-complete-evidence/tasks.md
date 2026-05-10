---
feature: smoke-complete-evidence
status: draft
---

# Tasks: Smoke Complete Evidence

- [x] Keep scope limited to real 031 implementation files and tests already
  present in the repo.
- [x] Use the following implementation files as smoke-evidence inputs:
  - `.specify/commands/6_gofer_validate.md`
  - `.specify/commands/gofer_vocabulary.md`
  - `.specify/commands/gofer_diagnose.md`
  - `.specify/commands/gofer_tdd.md`
  - `.specify/commands/gofer_spec_summary.md`
  - `.specify/commands/gofer_zoom_out.md`
  - `.specify/scripts/node/canonical-descriptions.mjs`
  - `.specify/scripts/node/sync-extension-resources.mjs`
  - `release-auto.sh`
  - `extension/src/services/migration/ResourceSyncer.ts`
- [x] Use the following real tests as smoke-evidence inputs:
  - `tests/unit/scripts/helper-commands-cross-cli-parity.test.ts`
  - `tests/unit/scripts/validation-evidence-gates.test.ts`
  - `tests/unit/scripts/validation-report-compat.test.ts`
  - `tests/unit/scripts/extension-package-wiring.test.ts`
  - `tests/unit/scripts/hook-wiring.test.ts`
  - `tests/unit/release/release-verification.test.ts`
  - `tests/unit/extension/ResourceSyncer.workspace-sync.test.ts`
- [x] Require persisted `validation-report.md` and `blast-radius-report.md`
  with `/6` provenance fields before treating this smoke as complete.
