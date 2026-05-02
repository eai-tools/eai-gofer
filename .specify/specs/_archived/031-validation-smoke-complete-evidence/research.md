---
feature: smoke-complete-evidence
status: draft
---

# Research: Smoke Complete Evidence

This temporary feature exists only to prove that the hardened `/6_gofer_validate`
flow reports PASS only when a feature context points to real implementation,
real test execution, real integration proof, and persisted report artifacts.

- Classification: non-application smoke fixture
- UI surface: none
- Deployment target: none
- Real implementation referenced:
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
- Real proof sources referenced:
  - `tests/unit/scripts/helper-commands-cross-cli-parity.test.ts`
  - `tests/unit/scripts/validation-evidence-gates.test.ts`
  - `tests/unit/scripts/validation-report-compat.test.ts`
  - `tests/unit/scripts/extension-package-wiring.test.ts`
  - `tests/unit/scripts/hook-wiring.test.ts`
  - `tests/unit/release/release-verification.test.ts`
  - `tests/unit/extension/ResourceSyncer.workspace-sync.test.ts`
