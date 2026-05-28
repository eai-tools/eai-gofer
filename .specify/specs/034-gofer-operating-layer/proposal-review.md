---
feature: 034-gofer-operating-layer
status: ready-for-approval
created: 2026-05-28
---

# Proposal Review: Gofer Operating Layer

## Proposed Decision

Proceed with an additive Gofer operating layer inspired by ECC, with a hard
capability-retention gate.

## Options Considered

| Option | Description | Outcome |
| --- | --- | --- |
| Copy ECC broadly | Import generic ECC skills, commands, and installer posture | Rejected. Dilutes Gofer and risks EAI focus. |
| Add only docs | Document current Gofer surfaces without new checks | Rejected. Does not improve reliability or outcomes enough. |
| Add operating layer | Adapt ECC's install, compliance, release, diagnostic, and observability patterns around Gofer | Selected. Highest value with lowest product drift. |

## Approval Criteria

Implementation can begin when the user accepts:

- No current Gofer functionality may be removed.
- Current numbered stages remain intact.
- Existing generated surfaces remain supported.
- ECC-derived capabilities must be Gofer/EAI-specific.
- Each phase must include regression evidence before being treated as complete.

## Recommended Phasing

| Phase | Name | Primary Outcome |
| --- | --- | --- |
| Phase 1 | Surface Truth and Release Gates | Gofer can prove what each assistant surface supports and block unsafe releases. |
| Phase 2 | Install Lifecycle and Support Diagnostics | Gofer can inspect, repair, uninstall, and support installations across surfaces. |
| Phase 3 | EAI Capability Health and Event Observability | Gofer planning and validation are grounded in real EAI/platform evidence. |
| Phase 4 | Delivery Profiles and Learning | Gofer becomes easier to adopt by role/use case and improves from completed deliveries. |

