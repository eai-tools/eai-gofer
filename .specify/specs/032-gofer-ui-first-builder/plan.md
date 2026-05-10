---
feature: 032-gofer-ui-first-builder
spec: .specify/specs/032-gofer-ui-first-builder/spec.md
research: .specify/specs/032-gofer-ui-first-builder/research.md
status: ready
created: 2026-05-10
---

# Implementation Plan: 032 — Gofer UI-First Builder

## Summary

Implement the feature as a canonical workflow-contract update:

1. patch shared numbered stages 0/1/2/3/4/5/6
2. patch the downstream templates those stages depend on
3. add new preview/approval/service-fit templates
4. regenerate all shipped mirrors
5. validate with focused generator/build/test evidence

## Technical Context

- **Language/Version**: Markdown stage definitions and templates; TypeScript
  test harness
- **Primary Dependencies**: generator, sync script, Vitest test suite, TypeScript build
- **Project Type**: non-app workflow/platform feature
- **Constraints**: preserve non-app parity, do not widen blast radius beyond
  workflow contract surfaces

## Files To Change

- `.specify/commands/0_business_scenario.md`
- `.specify/commands/1_gofer_research.md`
- `.specify/commands/2_gofer_specify.md`
- `.specify/commands/3_gofer_plan.md`
- `.specify/commands/4_gofer_tasks.md`
- `.specify/commands/5_gofer_implement.md`
- `.specify/commands/6_gofer_validate.md`
- `.specify/templates/context-bundle-template.md`
- `.specify/templates/contract-pack-template.md`
- `.specify/templates/plan-template.md`
- `.specify/templates/proposal-review-template.md`
- `.specify/templates/research-template.md`
- `.specify/templates/spec-template.md`
- `.specify/templates/tasks-template.md`
- `.specify/templates/ui-preview-brief-template.md`
- `.specify/templates/ui-review-log-template.md`
- `.specify/templates/ui-approval-template.md`
- `.specify/templates/service-fit-matrix-template.md`
- generated mirrors and focused tests

## Data Model

See `data-model.md`.

## Validation Plan

- Run `npm run gofer:generate`
- Run focused Vitest slice covering new guidance, byte-equivalence, generator
  regression, and existing deployment-ordering behavior
- Run `npm run build`

