---
id: 034-gofer-operating-layer
title: Gofer Operating Layer
status: ready
created: 2026-05-28
priority: high
classification: non-application platform tooling
---

# Feature Specification: Gofer Operating Layer

## Overview

Add an ECC-inspired operating layer to EAI Gofer without removing or weakening any
current Gofer capability. The feature improves installation, surface truth,
release readiness, diagnostics, EAI capability grounding, observability, delivery
profiles, and learning from completed work.

## Non-Negotiable Invariant

Gofer must remain backward compatible with all current numbered stages, helper
commands, generated assistant surfaces, VS Code extension resource flows, public
bundle outputs, and EAI workflow artifacts.

Any implementation task that removes or weakens an existing capability must fail
review unless the user gives explicit approval.

## User Stories

### US1: Maintainer Verifies Surface Truth

As a Gofer maintainer, I need a generated compliance matrix showing which
assistant surfaces are native, adapter-backed, instruction-backed, or unsupported
so that public claims match real behavior.

### US2: Maintainer Blocks Unsafe Releases

As a Gofer maintainer, I need a release approval gate that checks the VSIX,
agent plugin zip, public release URLs, manifests, generated surfaces, docs, and
private-path leakage before publishing.

### US3: User Diagnoses Install Problems

As a Gofer user, I need one doctor command that explains what is installed,
what is stale, what is duplicated, what is over budget, and what can be repaired.

### US4: Delivery Team Grounds Plans In EAI Reality

As an EAI delivery engineer, I need Gofer to record current public EAI capability
evidence before selecting service-fit directions.

### US5: Operator Reviews Workflow State

As a delivery lead, I need Gofer events and support bundles that show current
stage, blocked approvals, validation findings, install state, and release state.

### US6: Different Audiences Start Smaller

As a student, business analyst, or delivery engineer, I need Gofer profiles that
present the right workflow depth without hiding advanced capabilities.

## Functional Requirements

### Phase 1: Surface Truth and Release Gates

- FR-001: Add a source-backed Gofer surface compliance matrix.
- FR-002: Validate every matrix row has state, supported assets, unsupported
  surfaces, install/onramp, verification command, risk notes, owner, and
  verification date.
- FR-003: Add a Gofer release approval gate that checks generated surface parity,
  public package artifacts, manifest consistency, private path leakage, and EAI
  public/private boundary compliance.
- FR-004: Add a preview/smoke check for the public plugin bundle and VSIX release
  path.
- FR-005: Fail the gate if docs reference missing files, release URLs are missing,
  or package manifests disagree on version.

### Phase 2: Install Lifecycle and Support Diagnostics

- FR-006: Add install-state records for Gofer-managed surface files and package
  resources.
- FR-007: Add `gofer list-installed`, `gofer doctor`, `gofer repair`, and
  `gofer uninstall --dry-run` behavior through Node scripts or equivalent npm
  scripts.
- FR-008: Keep repair and uninstall scoped to Gofer-managed files only.
- FR-009: Generalize the existing Codex doctor into a multi-surface report while
  preserving the current Codex-specific behavior.
- FR-010: Add a redacted support bundle command/report.

### Phase 3: EAI Capability Health and Event Observability

- FR-011: Add an EAI capability health check that records `eai whoami`,
  `eai doctor --check-updates`, workflow readiness/status, block catalog, and
  resource schema availability when those commands exist.
- FR-012: Record capability status as accessible, purchasable, operator-assisted,
  unavailable, or unknown.
- FR-013: Feed EAI capability evidence into `service-fit-matrix.md` and planning
  guidance without requiring app-only artifacts for non-app work.
- FR-014: Define Gofer event contracts for stage started/completed, artifact
  created, approval required, capability checked, validation finding opened,
  validation finding resolved, and release gate result.
- FR-015: Add observability readiness checks for current stage, generated surface
  parity, diagnostic availability, support bundle availability, and release gate
  availability.

### Phase 4: Delivery Profiles and Learning

- FR-016: Add Gofer delivery profiles such as `full`, `app-delivery`,
  `business-process`, `documentation-only`, `support-diagnostic`, and
  `workshop/student`.
- FR-017: Add a Gofer catalog command/report for stages, helpers, templates,
  generated surfaces, profiles, and required artifacts.
- FR-018: Add delivery-pattern memory that captures approved journeys,
  service-fit decisions, validation findings, and reusable documentation patterns
  from completed specs.
- FR-019: Add portfolio summary reporting across `.specify/specs/*` for blocked
  approvals, validation status, service-fit gaps, and business value artifacts.
- FR-020: Ensure profiles reduce onboarding complexity without disabling advanced
  capabilities unless explicitly requested.

## Non-Functional Requirements

- NFR-001: All additions must be additive by default.
- NFR-002: All mutating lifecycle commands must support `--dry-run`.
- NFR-003: All reports must support machine-readable JSON where practical.
- NFR-004: Diagnostic/support output must redact secrets and private tokens.
- NFR-005: Release gates must run offline where possible and degrade clearly when
  network checks are unavailable.
- NFR-006: No private EAI implementation detail may be required for public Gofer
  users.

## Out Of Scope

- Copying ECC's generic skill catalog.
- Replacing Gofer's numbered pipeline.
- Removing any current assistant surface.
- Building a remote marketplace in this feature.
- Rewriting the VS Code extension.

