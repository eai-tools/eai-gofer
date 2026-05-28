---
feature: 034-gofer-operating-layer
status: draft
created: 2026-05-28
---

# Event Contract: Gofer Operating Layer

## Event Types

| Event Type | Purpose |
| --- | --- |
| `gofer.stage.started.v1` | A numbered stage or helper began. |
| `gofer.stage.completed.v1` | A numbered stage or helper completed. |
| `gofer.artifact.created.v1` | A Gofer artifact was written or updated. |
| `gofer.approval.required.v1` | A proposal, UI, service-fit, or release approval is required. |
| `gofer.eai.capability.checked.v1` | An EAI capability/resource check completed. |
| `gofer.validation.finding.opened.v1` | Validation or engineering review opened a finding. |
| `gofer.validation.finding.resolved.v1` | A prior finding was resolved. |
| `gofer.release.gate.completed.v1` | Release gate completed with pass/fail/blocked result. |
| `gofer.install.checked.v1` | Install-state or surface diagnostic completed. |

## Common Payload Fields

```json
{
  "eventId": "string",
  "type": "gofer.stage.started.v1",
  "featureId": "optional-string",
  "surfaceId": "optional-string",
  "stage": "optional-string",
  "result": "optional-string",
  "artifactPath": "optional-string",
  "createdAt": "ISO-8601 timestamp"
}
```

## Compatibility Rule

Events are additive observability. They must not become required for existing
pipeline commands to run until tests prove compatibility across current Gofer
workflows.

