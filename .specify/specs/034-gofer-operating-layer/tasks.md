---
feature: 034-gofer-operating-layer
status: ready
created: 2026-05-28
---

# Tasks: Gofer Operating Layer

## Phase 0: Baseline And Guardrails

- [ ] T000 Capture current command/stage inventory and generated surface inventory.
- [ ] T001 Add a capability-retention test fixture that fails if numbered stages,
      helper commands, or generated public stage manifests disappear.
- [ ] T002 Add an audit-history entry before implementation begins.

## Phase 1: Surface Truth And Release Gates

- [ ] T101 Create source data for Gofer surface compliance.
- [ ] T102 Implement surface matrix renderer/checker.
- [ ] T103 Add generated or checked documentation for the matrix.
- [ ] T104 Add release gate script for versions, manifests, generated surfaces,
      docs integrity, private path leakage, and EAI public/private boundary.
- [ ] T105 Add preview-pack smoke script for VSIX and plugin bundle outputs.
- [ ] T106 Wire npm scripts for matrix, release gate, and preview smoke.
- [ ] T107 Add tests for missing evidence fields, stale docs references, version
      drift, private paths, and generated surface parity.
- [ ] T108 Run `npm run gofer:generate`, `npm run gofer:codex-doctor`, and the
      new Phase 1 checks.

## Phase 2: Install Lifecycle And Support Diagnostics

- [ ] T201 Define install-state schema and storage conventions.
- [ ] T202 Record Gofer-managed paths from package/resource sync operations where
      ownership is clear.
- [ ] T203 Implement `list-installed` report.
- [ ] T204 Implement multi-surface `doctor` report and preserve Codex doctor output.
- [ ] T205 Implement dry-run `repair`.
- [ ] T206 Implement dry-run `uninstall`.
- [ ] T207 Implement redacted support bundle.
- [ ] T208 Add tests proving doctor is read-only and repair/uninstall are scoped to
      Gofer-managed files.

## Phase 3: EAI Capability Health And Event Observability

- [ ] T301 Implement EAI CLI availability detection.
- [ ] T302 Implement EAI public command checks with graceful unavailable handling.
- [ ] T303 Add capability status classification.
- [ ] T304 Update research/specify/plan guidance to cite capability health in
      service-fit decisions.
- [ ] T305 Add event contract definitions and validation.
- [ ] T306 Add event emission/reporting utilities as additive observability.
- [ ] T307 Implement observability readiness check.
- [ ] T308 Add tests for EAI health degradation, classification, and event schema.

## Phase 4: Delivery Profiles, Catalog, And Learning

- [ ] T401 Define delivery profiles and profile metadata.
- [ ] T402 Implement Gofer catalog report for stages, helpers, templates, profiles,
      surfaces, and required artifacts.
- [ ] T403 Add profile-aware discovery wording without removing default behaviors.
- [ ] T404 Implement delivery-pattern extraction from completed specs.
- [ ] T405 Implement portfolio summary across `.specify/specs/*`.
- [ ] T406 Add redaction and privacy tests for learned delivery patterns.
- [ ] T407 Add tests proving profiles de-emphasize but do not remove capabilities.

## Final Validation

- [ ] T501 Run full focused validation for all new scripts and docs.
- [ ] T502 Run existing Gofer generation and Codex doctor checks.
- [ ] T503 Run root test suite or document any pre-existing unrelated failures.
- [ ] T504 Complete validation report and engineering review.

