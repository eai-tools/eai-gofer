---
date: '2026-05-10T09:31:57Z'
researcher: Codex
feature: '032-gofer-ui-first-builder'
status: complete
codebase_type: 'brownfield'
---

# Research: 032-gofer-ui-first-builder

## Feature Summary

Update Gofer's canonical workflow contracts so app-delivery runs become
UI-first and tenant-aware, while non-app runs keep the same shared numbered
stages without app-only gates.

## Application Classification

- **Mode**: non-app workflow/platform feature
- **Shared numbered stages preserved**: yes
- **Why this classification applies**: the implementation surface is Gofer's
  workflow command system, not a tenant-facing product runtime

## Codebase Analysis

### Where To Implement

| Component | Location | Purpose |
| --------- | -------- | ------- |
| Canonical stage definitions | `.specify/commands/0_business_scenario.md`, `.specify/commands/1_gofer_research.md`, `.specify/commands/2_gofer_specify.md`, `.specify/commands/3_gofer_plan.md`, `.specify/commands/4_gofer_tasks.md`, `.specify/commands/5_gofer_implement.md`, `.specify/commands/6_gofer_validate.md` | shipped workflow contract |
| Artifact templates | `.specify/templates/*.md` | downstream artifact shape |
| Generated mirrors | `.claude/commands/`, `.github/prompts/`, `.agents/skills/`, `.system/skills/`, `.gemini/`, `extension/resources/` | shipped cross-surface copies |
| Feature validation | `tests/integration/enterpriseai/*.test.ts`, `tests/unit/scripts/*.test.ts` | guard command/mirror parity |

### Integration Points

1. **Command generation**: `npm run gofer:generate` regenerates all shipped
   surfaces and syncs extension resources.
2. **Byte-equivalence**: `tests/unit/scripts/byte-equivalence.test.ts` ensures
   canonical stage bodies and goldens stay identical.
3. **Generator dry-run regression**:
   `tests/unit/scripts/generator-regression.test.ts` checks the generator and
   stage inventory.
4. **EnterpriseAI deployment ordering**:
   `tests/integration/enterpriseai/deployment-guidance-ordering.integration.test.ts`
   guards the existing scaffold/validate/deploy contract that must remain
   intact.

## Technology Decisions

### Decision 1: Implementation layer

- **Choice**: change the canonical markdown command sources and templates
- **Rationale**: this is the real behavior surface Gofer ships across CLIs
- **Alternatives considered**: TypeScript runtime changes were not necessary for
  the requested workflow contract

### Decision 2: Compatibility model

- **Choice**: keep the same numbered stages and add conditional app-delivery
  behavior
- **Rationale**: directly satisfies the user's non-regression requirement
- **Alternatives considered**: a separate app-only pipeline was rejected

### Decision 3: Validation shape

- **Choice**: focused generator/build/test validation
- **Rationale**: matches the feature-owned surface and avoids conflating
  unrelated working-tree issues
- **Alternatives considered**: full-suite green was not reliable in this dirty
  working tree because unrelated tests reference missing docs/specs

## UI-First App Delivery Research _(application delivery only)_

### Preview Strategy

- **Smallest useful MVP to show first**: a Vertical Template-constrained slice
  that proves layout, core screens, and the main workflow
- **Vertical Template constraints**: use installed template blocks first; treat
  create-new UI concepts as explicit exceptions
- **Branding inputs**: make logos, styling, and corporate copy tone explicit
  inputs rather than implicit polish
- **Preview validation expectation**: screenshot, local render proof, or
  Playwright-style self-review before stakeholder presentation

### Service-Fit Discovery Inputs

- **Capability discovery sources**: `eai --describe`, `eai whoami`, `eai tenant
  select`, `eai resources schema`, `eai verify calls --format json`
- **What must be decided after UI approval**: which platform services are
  accessible now, purchasable, or blocked
- **Non-app note**: not applicable to this feature run, but required guidance
  for future app-delivery runs

## Constraints & Considerations

- The feature must not remove or degrade non-app shared-stage behavior.
- Updated canonical bodies require regenerated mirrors and golden fixture sync.
- New templates must also be mirrored into `extension/resources/templates/`.

## Recommendations

1. Treat this as a workflow-contract feature, not a runtime refactor.
2. Add app-delivery preview/service-fit artifacts and guidance, but keep them
   conditional on classification.
3. Lock the change with a feature-specific integration test plus existing
   generator/byte-equivalence gates.

