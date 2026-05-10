---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
workflowProfile: enterpriseai
status: ready
---

# EnterpriseAI Contract Pack: 032-gofer-ui-first-builder

## Actors

| Actor | Role | Decision / Permission |
| ----- | ---- | --------------------- |
| Gofer maintainer | edits shipped workflow contract | can update canonical stage docs, templates, tests |
| Workflow designer | consumes the new guidance | relies on shared-stage parity |
| Future app-delivery operator | uses preview/approval/service-fit flow | must follow app-only gates when classification=app |

## Object Types

| Object Type | Reuse Decision | Owner | Data Notes |
| ----------- | -------------- | ----- | ---------- |
| `ui-preview-brief.md` | Create feature-local artifact | workflow maintainer | markdown only |
| `ui-review-log.md` | Create feature-local artifact | workflow maintainer | markdown only |
| `ui-approval.md` | Create feature-local artifact | workflow maintainer | markdown only |
| `service-fit-matrix.md` | Create feature-local artifact | workflow maintainer | markdown only |

## Workflows And Journeys

| Flow Type | Name | Trigger | Outcome |
| --------- | ---- | ------- | ------- |
| Internal orchestration | shared-stage dual-mode routing | business-scenario classification | app-only gates added conditionally |
| Internal orchestration | mirror regeneration | canonical source changes | shipped surfaces updated consistently |

## UI Preview And Approval

For this feature run, this section defines future app-delivery behavior rather
than an output of the current non-app run.

| Artifact | Purpose | Required For Completion |
| -------- | ------- | ----------------------- |
| `ui-preview-brief.md` | define first MVP preview scope and constraints | yes for future app runs |
| `ui-review-log.md` | record preview evidence and iteration history | yes for future app runs |
| `ui-approval.md` | record explicit UI approval | yes for future app runs |

## EnterpriseAI Service Fit

| Capability | Evidence Source | Status | Selected Direction |
| ---------- | --------------- | ------ | ------------------ |
| app-delivery capability discovery | `eai --describe`, `eai whoami`, `eai tenant select`, `eai resources schema`, `eai verify calls --format json` | defined | use as future app-delivery gate inputs |

## Permissions And Tenant Boundaries

| Boundary | Rule | Evidence |
| -------- | ---- | -------- |
| Non-app parity | app-only artifacts are not required when classification=non-app | updated command guidance |
| App-delivery gate | preview approval and service-fit are required when classification=app | updated command guidance |

## APIs And Events

| Surface | Contract | Tests |
| ------- | -------- | ----- |
| Canonical stage definitions | `.specify/commands/*.md` | byte-equivalence + integration guidance tests |
| Mirror generation | `npm run gofer:generate` | generator regression |
| Build sanity | `npm run build` | compile passes |

## Deployment And Runtime

| Area | Assumption | Validation |
| ---- | ---------- | ---------- |
| Environment | local repo workflow change | focused tests + build |
| Observability | validation report + audit history | feature package |
| Rollback | revert canonical files and regenerate mirrors | contained blast radius |

## Acceptance Tests

| Perspective | Test | Owner |
| ----------- | ---- | ----- |
| Business | shared-stage compatibility is explicit | workflow maintainer |
| Architecture | app-delivery guidance exists across stages 0/1/2/3/4/5/6 | workflow maintainer |
| Operations | generator and build still pass | workflow maintainer |

