---
id: '032-gofer-ui-first-builder'
title: 'Gofer UI-First Builder'
status: ready
created: '2026-05-10'
updated: '2026-05-10'
author: Codex
---

# Feature Specification: Gofer UI-First Builder

## Overview

This feature upgrades Gofer's shared numbered stages so app-delivery runs
converge on UI and EnterpriseAI service fit earlier, while non-app runs keep
their current shared-stage behavior without app-only gates.

## User Stories

### User Story 1 — Dual-Mode Shared Pipeline (Priority: P1)

As a Gofer maintainer, I want app-delivery and non-app work to stay inside the
same numbered stages so that Gofer gains the new UI-first behavior without
losing its existing non-app functionality.

**Acceptance Criteria**:

- [x] Shared-stage app vs non-app behavior is explicit in `/0_business_scenario`.
- [x] Non-app work is not forced through preview, branding, approval, or
      service-fit gates.

### User Story 2 — UI-First App Delivery Contract (Priority: P1)

As a workflow designer, I want future app-delivery runs to collect a preview
brief, constrain previews to the Vertical Template, self-review previews before
presentation, iterate to approval, and only then lock platform services.

**Acceptance Criteria**:

- [x] Research/spec/plan/tasks/implement/validate guidance references preview,
      approval, and service-fit artifacts.
- [x] Vertical Template reuse and optional branding inputs are explicit.
- [x] Preview self-review evidence is explicit before stakeholder presentation.

### User Story 3 — Shipped Surface And Template Parity (Priority: P2)

As a Gofer maintainer, I want all generated command surfaces and templates to
stay in sync so the new workflow ships consistently across CLIs.

**Acceptance Criteria**:

- [x] Generated mirrors were regenerated successfully.
- [x] New preview/approval/service-fit templates exist in canonical and mirrored
      template folders.
- [x] Focused command-generation and byte-equivalence validation passes.

## Functional Requirements

- **FR-001**: `/0_business_scenario` MUST define a shared numbered-stage
  contract for app-delivery and non-app work.
- **FR-002**: App-delivery guidance MUST default to a UI-first flow:
  brief -> preview -> approval -> service fit.
- **FR-003**: App-delivery preview guidance MUST constrain first-pass UI work to
  Vertical Template blocks before create-new UI concepts are introduced.
- **FR-004**: App-delivery guidance MUST allow client branding/logo inputs.
- **FR-005**: App-delivery guidance MUST require screenshot, local render proof,
  or Playwright-style self-review before preview presentation.
- **FR-006**: App-delivery guidance MUST require explicit UI approval before
  downstream plan/tasks are treated as complete.
- **FR-007**: App-delivery guidance MUST require a post-approval service-fit
  gate using `eai-cli` and platform evidence.
- **FR-008**: Non-app work MUST explicitly skip app-only artifacts and gates.
- **FR-009**: Canonical templates MUST exist for preview brief, review log,
  approval, and service-fit artifacts.
- **FR-010**: Generated mirrors and golden stage bodies MUST remain synchronized.

## Non-Functional Requirements

- **NFR-001**: Compatibility-first; do not regress existing non-app workflows.
- **NFR-002**: Minimal blast radius; keep changes inside canonical workflow
  docs, templates, generated mirrors, and related tests.
- **NFR-003**: Cross-surface parity; Claude, Copilot, Codex, Gemini, and
  extension resources must reflect the same canonical guidance.

## Success Criteria

| Metric | Target |
| ------ | ------ |
| Shared-stage compatibility | explicit and tested |
| App-delivery guidance coverage | present across stages 0/1/2/3/4/5/6 |
| Mirror/template parity | pass |
| Focused validation | pass |

## Out Of Scope

- Runtime implementation of an actual preview renderer inside Gofer
- New platform object types or backend APIs
- Cleanup of unrelated failing or dirty working-tree areas

