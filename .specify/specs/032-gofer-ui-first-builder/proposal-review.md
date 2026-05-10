---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
status: approved
recommendedScenario: 'shared-stages-dual-mode'
recommendedArchitecture: 'canonical-command-contract-update'
selectedOption: 'update canonical command and template sources, then regenerate mirrors'
approvedBy: 'user'
approvedAt: '2026-05-10T09:31:57Z'
---

# Proposal Review: 032-gofer-ui-first-builder

## What We Found

The requested feature lives in Gofer's canonical command and template sources.
The correct implementation path is to add app-delivery-only preview/approval
and service-fit gates inside the shared numbered stages, then regenerate all
shipped command surfaces and lock the behavior with targeted tests.

## Pipeline Mode Decision

- **Classification**: non-app workflow/platform change
- **Shared numbered stages preserved**: yes
- **App-delivery-only gates**: preview, approval, branding, service fit

## Recommended Business Scenario

Proceed as a compatibility-first workflow upgrade: app-delivery runs gain the
new UI-first behavior, while non-app runs keep the same shared-stage behavior.

## Technology Architecture Recommendation

### Recommended Architecture

Use canonical `.specify/commands/*.md` files plus `.specify/templates/*.md` as
the source of truth, then regenerate and sync all mirrors.

## Key Decisions And Why

- **Shared stages, not split pipelines**: protects existing Gofer functionality.
- **Vertical Template first**: keeps preview generation aligned to `eai-cli`
  installed scaffolds.
- **Focused validation**: proves the feature-owned surface directly.

## Approval

- Status: approved
- Next action: specification, planning, implementation, and validation complete

