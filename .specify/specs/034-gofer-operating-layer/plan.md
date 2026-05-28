---
feature: 034-gofer-operating-layer
spec: .specify/specs/034-gofer-operating-layer/spec.md
status: ready
created: 2026-05-28
---

# Implementation Plan: Gofer Operating Layer

## Summary

Deliver ECC-derived operating reliability around Gofer while preserving every
current Gofer capability. The work is additive, phased, and evidence-gated.

## Phase 1: Surface Truth and Release Gates

### Goals

- Make public assistant-surface claims test-backed.
- Block unsafe or incomplete public releases.
- Catch docs and manifest drift before publication.

### Build

1. Add `data/gofer-surface-compliance.json` or equivalent source data.
2. Add `scripts/gofer-surface-matrix.mjs` to render/check the matrix.
3. Add `docs/architecture/gofer-surface-compliance.md` generated from source data.
4. Add `scripts/gofer-release-gate.mjs`.
5. Add `scripts/gofer-preview-pack-smoke.mjs`.
6. Wire npm scripts, for example:
   - `gofer:surface-matrix`
   - `gofer:release-gate`
   - `gofer:preview-pack-smoke`
7. Add tests for matrix completeness, manifest parity, missing docs references,
   private path leakage, and generated surface parity.

### Acceptance Evidence

- Surface matrix check passes.
- Release gate fails on seeded missing docs/private path/version drift fixtures.
- Current package/plugin generation still passes.
- Existing `gofer:generate` and `gofer:codex-doctor` still pass.

## Phase 2: Install Lifecycle and Support Diagnostics

### Goals

- Let Gofer users inspect, diagnose, repair, and uninstall Gofer-managed surface
  files without touching unrelated files.
- Preserve and generalize current Codex doctor behavior.

### Build

1. Add an install-state schema and storage path.
2. Record managed files during plugin/resource sync where Gofer owns the output.
3. Add `scripts/gofer-list-installed.mjs`.
4. Add `scripts/gofer-doctor.mjs` that composes:
   - install-state health
   - generated surface parity
   - Codex doctor output
   - extension/package versions
   - release gate status when available
5. Add `scripts/gofer-repair.mjs` with dry-run first.
6. Add `scripts/gofer-uninstall.mjs` with dry-run first.
7. Add `scripts/gofer-support-bundle.mjs` with redaction.

### Acceptance Evidence

- Doctor is read-only.
- Repair/uninstall dry-run never lists unmanaged files.
- Codex doctor tests remain green.
- Install-state round trip tests pass.
- Support bundle redacts secrets and private tokens.

## Phase 3: EAI Capability Health and Event Observability

### Goals

- Ground Gofer planning and service-fit decisions in current public EAI evidence.
- Make workflow state observable across CLI, VS Code, and future cloud execution.

### Build

1. Add `scripts/gofer-eai-health.mjs`.
2. Detect whether `eai` CLI is available.
3. Run public checks when available:
   - `eai whoami`
   - `eai doctor --check-updates`
   - `eai workflow readiness`
   - `eai workflow status`
   - `eai blocks list`
   - `eai resources schema`
4. Classify capability status as accessible, purchasable, operator-assisted,
   unavailable, or unknown.
5. Add guidance to `1_gofer_research`, `2_gofer_specify`, and `3_gofer_plan`
   to cite the health report in service-fit decisions.
6. Add event contract utilities and read-only event log/reporting.
7. Add `gofer:observability-ready` check.

### Acceptance Evidence

- EAI health works when `eai` exists and degrades clearly when it does not.
- Service-fit guidance references evidence rather than assumptions.
- Event contract validation tests pass.
- Observability readiness check passes.

## Phase 4: Delivery Profiles and Learning

### Goals

- Make Gofer easier to adopt for different roles without removing advanced power.
- Reuse lessons from completed EAI deliveries.
- Give operators a portfolio view across specs.

### Build

1. Add delivery profile definitions:
   - `full`
   - `app-delivery`
   - `business-process`
   - `documentation-only`
   - `support-diagnostic`
   - `workshop-student`
2. Add `scripts/gofer-catalog.mjs` for stages, helpers, templates, profiles,
   surfaces, and required artifacts.
3. Add profile-aware discovery wording while preserving existing default behavior.
4. Add delivery-pattern extraction from completed specs:
   - approved journeys
   - service-fit decisions
   - validation findings
   - stakeholder document patterns
5. Add portfolio summary reporting across `.specify/specs/*`.

### Acceptance Evidence

- Profiles alter onboarding emphasis only; they do not remove capabilities.
- Catalog catches stale/missing docs and generated surface mismatch.
- Portfolio report works across existing specs.
- Delivery memory excludes secrets/private customer data.

## Capability Retention Gate

Before each phase is considered complete:

1. Compare generated command lists before and after.
2. Confirm all numbered stages still exist.
3. Confirm current helper commands still exist.
4. Confirm public plugin manifests still package the same or greater Gofer stage set.
5. Run existing focused tests plus new phase tests.
6. Record results in `audit-history.md`.

## Recommended Implementation Order

1. Phase 1 first, because it creates the truth and release gates that protect all
   later work.
2. Phase 2 second, because install diagnostics reduce support risk once releases
   get stronger.
3. Phase 3 third, because EAI capability health improves business outcomes once
   the operating surface is stable.
4. Phase 4 fourth, because profiles and learning should sit on proven diagnostics,
   gates, and event contracts.

