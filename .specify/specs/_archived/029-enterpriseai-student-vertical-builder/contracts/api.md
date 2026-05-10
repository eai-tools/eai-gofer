# API Contracts — EnterpriseAI Student Vertical Builder

## External REST/HTTP Surface Summary

This feature does **not** introduce public REST/HTTP endpoints.  
The scope is internal workflow-profile orchestration, artifact generation,
parity propagation, and event-driven coordination.

- External endpoint count: **0**
- Implemented through: `internal-api.md`, `events.md`

## EXT-001 — `external-api.none-required`

### Method + Path (or Operation Name)

`Operation: external-api.none-required`

### Description

Declares and records that EnterpriseAI Student Vertical Builder has no external
HTTP contract surface for this release.

### Request Schema Example

```json
{
  "featureId": "029-enterpriseai-student-vertical-builder",
  "requestedAt": "2026-04-09T00:00:00Z",
  "scope": "internal-gofer-pipeline-only",
  "publicConsumers": []
}
```

### Response Schema Example

```json
{
  "statusCode": 200,
  "decision": "no_external_api_endpoints",
  "externalEndpointCount": 0,
  "contracts": ["internal-api.md", "events.md"]
}
```

### Error Codes

| Code | Description                                                    |
| ---- | -------------------------------------------------------------- |
| N/A  | No runtime external API call is made for this decision record. |

### User Story and FR Mapping

- **User stories**: US-001, US-002, US-003, US-004, US-005, US-006, US-007
- **Functional requirements**: FR-001 through FR-010 (served by internal
  services and events)
