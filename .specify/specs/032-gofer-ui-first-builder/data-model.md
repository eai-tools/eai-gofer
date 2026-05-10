---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
status: ready
---

# Data Model: 032-gofer-ui-first-builder

## Entities

| Entity | Purpose |
| ------ | ------- |
| `PipelineMode` | records whether a run is app-delivery or non-app |
| `UiPreviewBrief` | future app-delivery artifact for first MVP preview scope |
| `UiReviewLog` | future app-delivery artifact for preview evidence and iteration history |
| `UiApproval` | future app-delivery artifact for explicit approval |
| `ServiceFitRecord` | future app-delivery artifact for accessible vs purchasable vs unavailable capability decisions |

## Relationships

- `PipelineMode` controls whether `UiPreviewBrief`, `UiReviewLog`,
  `UiApproval`, and `ServiceFitRecord` are required.
- Non-app runs do not require app-only entities.

