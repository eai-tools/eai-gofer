---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
discoveredBy: Codex + Douglas
status: complete
applicationClassification: non-application
workflowProfile: enterpriseai
---

# Business Discovery: 032-gofer-ui-first-builder

## Problem Statement

**Pain Point**: Gofer does not yet make early UI convergence a first-class app
delivery gate, and it does not explicitly protect non-app workflows from being
dragged through app-only steps.

**Current State**: The shared numbered stages already carry EnterpriseAI app vs
non-app concepts, but they do not yet require a UI-first preview brief, a
preview self-review loop, a stakeholder approval artifact, or a tenant-aware
service-fit gate.

**Impact**: App-delivery outputs can start too unconstrained, arrive visually
weak, and make service decisions too early. A naive fix could also regress
Gofer's existing non-app capabilities.

## Target Users

### Primary Users

- **Persona**: Gofer maintainers and workflow designers
- **Technical Level**: Advanced
- **Key Needs**: strong shipped workflow contracts, cross-surface parity, and
  preservation of existing non-app behavior while expanding app-delivery mode

## Value Proposition

**Primary Value**: Make app-delivery runs converge on UI and platform fit
earlier, without splitting Gofer into separate products or regressing the
non-app pipeline.

## Success Metrics

| Metric | Target | Measurement |
| ------ | ------ | ----------- |
| Shared-stage parity | explicit | canonical command guidance + tests |
| App-delivery guidance coverage | explicit | canonical stages 0/1/2/3/4/5/6 |
| Template readiness | explicit | canonical + mirrored templates exist |
| Feature validation | pass | generator/build/focused tests |

## Application Classification

| Field | Decision |
| ----- | -------- |
| Classification | Non-application work |
| Reason | This feature modifies Gofer's workflow platform itself, even though one of its primary outcomes is a stronger app-delivery branch |
| Four-step AI journey required | No |

## Discovery Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Delivery model | Shared numbered stages with dual-mode behavior | preserves non-app functionality |
| App-delivery behavior | UI-first preview, approval, and service-fit gates | directly addresses the user's requested sequencing |
| UI constraint | Vertical Template first | keeps preview generation aligned to installed app scaffolds |
| Validation | generator/build/focused workflow tests | matches the real implementation surface |

