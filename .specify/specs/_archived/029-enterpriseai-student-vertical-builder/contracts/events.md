# Event Contracts — EnterpriseAI Student Vertical Builder

## Scope

These contracts define asynchronous domain/integration events emitted by
internal Gofer services for EnterpriseAI workflow orchestration.

Event contract count: **12**

## EVT-001 — `workflow.profile.activated.v1`

### Method + Path (or Operation Name)

`Event: workflow.profile.activated.v1`

### Description

Published after a workflow profile is activated for a pipeline run.

### Request Schema Example

```json
{
  "eventId": "evt_001",
  "runId": "run_029_0001",
  "workflowProfile": "enterpriseai",
  "activatedAt": "2026-04-09T00:02:00Z"
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "research-orchestrator",
  "processedAt": "2026-04-09T00:02:01Z"
}
```

### Error Codes

| Code               | Description                         |
| ------------------ | ----------------------------------- |
| EVT_PUBLISH_FAILED | Event bus publish failed.           |
| EVT_SCHEMA_INVALID | Event payload did not match schema. |

### User Story and FR Mapping

- **User stories**: US-001, US-002
- **Functional requirements**: FR-001

## EVT-002 — `governance.architecture-decision.requested.v1`

### Method + Path (or Operation Name)

`Event: governance.architecture-decision.requested.v1`

### Description

Emitted when one architecture decision is presented and approval is required.

### Request Schema Example

```json
{
  "eventId": "evt_002",
  "runId": "run_029_0001",
  "decisionId": "arch-dec-03",
  "title": "Select deployment strategy",
  "options": ["feature-flagged", "strangler", "big-bang"],
  "requiresExplicitApproval": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "approval-ui-adapter",
  "approvalState": "awaiting_user"
}
```

### Error Codes

| Code                          | Description                        |
| ----------------------------- | ---------------------------------- |
| EVT_DECISION_SEQUENCE_ERROR   | Decision emitted out of sequence.  |
| EVT_APPROVAL_GATE_UNAVAILABLE | Approval consumer was unavailable. |

### User Story and FR Mapping

- **User stories**: US-001, US-002
- **Functional requirements**: FR-005

## EVT-003 — `governance.architecture-decision.recorded.v1`

### Method + Path (or Operation Name)

`Event: governance.architecture-decision.recorded.v1`

### Description

Emitted after explicit approval or rejection is recorded for a single
architecture decision.

### Request Schema Example

```json
{
  "eventId": "evt_003",
  "runId": "run_029_0001",
  "decisionId": "arch-dec-03",
  "approvalState": "approved",
  "approvedBy": "student@university.edu",
  "recordedAt": "2026-04-09T00:04:00Z"
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "pipeline-orchestrator",
  "pipelineMayProceed": true
}
```

### Error Codes

| Code                          | Description                            |
| ----------------------------- | -------------------------------------- |
| EVT_APPROVAL_LOG_WRITE_FAILED | Approval audit log persistence failed. |
| EVT_APPROVAL_STATE_INVALID    | Approval state is invalid.             |

### User Story and FR Mapping

- **User stories**: US-001, US-002, US-007
- **Functional requirements**: FR-005, FR-008

## EVT-004 — `references.eai-fallback.used.v1`

### Method + Path (or Operation Name)

`Event: references.eai-fallback.used.v1`

### Description

Emitted when external EnterpriseAI references are unavailable and local fallback
references are used.

### Request Schema Example

```json
{
  "eventId": "evt_004",
  "runId": "run_029_0001",
  "fallbackPath": ".specify/references/eai/",
  "unavailableExternalReferences": ["eai-cli-docs", "deployment-repo-docs"],
  "userNoticeRequired": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "user-notification-service",
  "noticeQueued": true
}
```

### Error Codes

| Code                           | Description                                |
| ------------------------------ | ------------------------------------------ |
| EVT_FALLBACK_REFERENCE_MISSING | Required local fallback files are missing. |
| EVT_NOTICE_DISPATCH_FAILED     | User notice could not be dispatched.       |

### User Story and FR Mapping

- **User stories**: US-004
- **Functional requirements**: FR-010

## EVT-005 — `artifacts.research.generated.v1`

### Method + Path (or Operation Name)

`Event: artifacts.research.generated.v1`

### Description

Emitted when business and optional market/competitive analysis artifacts are
generated.

### Request Schema Example

```json
{
  "eventId": "evt_005",
  "runId": "run_029_0001",
  "workflowProfile": "enterpriseai",
  "businessAnalysisPath": "business-analysis.md",
  "marketAnalysisPath": "market-analysis.md",
  "competitiveAnalysisEnabled": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "spec-stage-input-resolver",
  "downstreamReady": true
}
```

### Error Codes

| Code                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| EVT_RESEARCH_ARTIFACT_MISSING | Generated artifact path is missing/invalid.  |
| EVT_RESEARCH_SCHEMA_INVALID   | Artifact metadata payload failed validation. |

### User Story and FR Mapping

- **User stories**: US-001, US-005
- **Functional requirements**: FR-003

## EVT-006 — `artifacts.plan.tasks.generated.v1`

### Method + Path (or Operation Name)

`Event: artifacts.plan.tasks.generated.v1`

### Description

Emitted when plan/tasks include EAI CLI version pinning, Vertical Template
steps, and deployment conventions.

### Request Schema Example

```json
{
  "eventId": "evt_006",
  "runId": "run_029_0001",
  "planPath": "plan.md",
  "tasksPath": "tasks.md",
  "eaiCliMajorMinor": "2.7",
  "deploymentConventionsIncluded": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "implementation-stage",
  "deploymentGuidanceReady": true
}
```

### Error Codes

| Code                             | Description                                 |
| -------------------------------- | ------------------------------------------- |
| EVT_PLAN_TASKS_INCOMPLETE        | Required EAI plan/task fields are missing.  |
| EVT_EAI_VERSION_CONTRACT_MISSING | `eai-cli` major.minor metadata not present. |

### User Story and FR Mapping

- **User stories**: US-002, US-004
- **Functional requirements**: FR-002, FR-007

## EVT-007 — `artifacts.stakeholder-comms.generated.v1`

### Method + Path (or Operation Name)

`Event: artifacts.stakeholder-comms.generated.v1`

### Description

Emitted when stakeholder artifacts are produced, including optional Marp deck
output.

### Request Schema Example

```json
{
  "eventId": "evt_007",
  "runId": "run_029_0001",
  "releaseNotesPath": "release-notes.md",
  "demoScriptPath": "demo-script.md",
  "marpDeckPath": "presentation.marp.md",
  "marpEnabled": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "artifact-indexer",
  "artifactIndexUpdated": true
}
```

### Error Codes

| Code                       | Description                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| EVT_COMMS_ARTIFACT_MISSING | Expected comms artifact file is missing.                                      |
| EVT_MARP_VALIDATION_FAILED | Generated Marp deck failed validation checks.                                 |
| EVT_COMMS_CONSUMER_FAILED  | Event consumer failed while processing generated stakeholder comms artifacts. |

### User Story and FR Mapping

- **User stories**: US-003
- **Functional requirements**: FR-004

## EVT-008 — `artifacts.mirror-propagation.completed.v1`

### Method + Path (or Operation Name)

`Event: artifacts.mirror-propagation.completed.v1`

### Description

Emitted after canonical command updates are propagated to all mirrors and sync
completes.

### Request Schema Example

```json
{
  "eventId": "evt_008",
  "changeSetId": "chg_2026_04_09_01",
  "mirrors": ["copilot", "codex", "gemini"],
  "filesChanged": 18,
  "runtimeSyncCompleted": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "parity-validator",
  "parityValidationTriggered": true
}
```

### Error Codes

| Code                    | Description                             |
| ----------------------- | --------------------------------------- |
| EVT_MIRROR_SYNC_FAILED  | One or more mirrors failed to update.   |
| EVT_RUNTIME_SYNC_FAILED | Runtime resource sync did not complete. |

### User Story and FR Mapping

- **User stories**: US-006
- **Functional requirements**: FR-006

## EVT-009 — `positioning.enterpriseai-updated.v1`

### Method + Path (or Operation Name)

`Event: positioning.enterpriseai-updated.v1`

### Description

Emitted when extension metadata/docs are updated to lead with EnterpriseAI
positioning while preserving multi-platform support language.

### Request Schema Example

```json
{
  "eventId": "evt_009",
  "releaseId": "1.28.0-enterpriseai",
  "updatedSurfaces": [
    "extension/package.json",
    "extension/README.md",
    "README.md"
  ],
  "multiPlatformSupportRetained": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "release-qa-checker",
  "positioningChecksQueued": true
}
```

### Error Codes

| Code                              | Description                             |
| --------------------------------- | --------------------------------------- |
| EVT_POSITIONING_VALIDATION_FAILED | Messaging policy checks failed.         |
| EVT_POSITIONING_SURFACE_MISSING   | Expected docs/metadata surface missing. |

### User Story and FR Mapping

- **User stories**: US-001, US-002
- **Functional requirements**: FR-009

## EVT-010 — `validation.compatibility-parity.completed.v1`

### Method + Path (or Operation Name)

`Event: validation.compatibility-parity.completed.v1`

### Description

Emitted when parity and regression validation gates complete for an
EnterpriseAI-profile change set.

### Request Schema Example

```json
{
  "eventId": "evt_010",
  "runId": "run_029_0001",
  "parityResult": "passed",
  "regressionResult": "passed",
  "removedCapabilitiesDetected": 0
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "release-gate",
  "releaseAllowed": true
}
```

### Error Codes

| Code                  | Description                 |
| --------------------- | --------------------------- |
| EVT_PARITY_FAILED     | Mirror parity tests failed. |
| EVT_REGRESSION_FAILED | Regression tests failed.    |

### User Story and FR Mapping

- **User stories**: US-006, US-007
- **Functional requirements**: FR-006, FR-008

## EVT-011 — `governance.capability-removal.approval-required.v1`

### Method + Path (or Operation Name)

`Event: governance.capability-removal.approval-required.v1`

### Description

Emitted when a proposed change may remove/disable an existing capability and
explicit one-by-one approval is mandatory.

### Request Schema Example

```json
{
  "eventId": "evt_011",
  "changeSetId": "chg_2026_04_09_01",
  "affectedCapability": "provider-routing-codex",
  "requiresExplicitApproval": true,
  "blocking": true
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "approval-audit-service",
  "changeBlockedUntilApproval": true
}
```

### Error Codes

| Code                           | Description                                   |
| ------------------------------ | --------------------------------------------- |
| EVT_APPROVAL_EVENT_NOT_ACKED   | Approval-required event was not acknowledged. |
| EVT_APPROVAL_AUDIT_UNAVAILABLE | Approval audit service unavailable.           |

### User Story and FR Mapping

- **User stories**: US-007
- **Functional requirements**: FR-008

## EVT-012 — `deployment.readiness.validated.v1`

### Method + Path (or Operation Name)

`Event: deployment.readiness.validated.v1`

### Description

Emitted after implementation-stage deployment readiness validation finishes,
reporting pass/fail and any missing required files before deployment task
completion is allowed.

### Request Schema Example

```json
{
  "eventId": "evt_012",
  "runId": "run_029_0001",
  "deploymentTaskId": "task_deploy_01",
  "readinessPassed": false,
  "missingFiles": ["manifest.yml", "config.json"],
  "validatedAt": "2026-04-09T00:25:00Z"
}
```

### Response Schema Example

```json
{
  "acknowledged": true,
  "consumer": "deployment-gate-controller",
  "deploymentTaskCompletionAllowed": false
}
```

### Error Codes

| Code                                    | Description                                           |
| --------------------------------------- | ----------------------------------------------------- |
| EVT_DEPLOYMENT_READINESS_SCHEMA_INVALID | Deployment readiness event payload failed validation. |
| EVT_DEPLOYMENT_GATE_NOTIFICATION_FAILED | Deployment gate consumer could not be notified.       |

### User Story and FR Mapping

- **User stories**: US-004, US-007
- **Functional requirements**: FR-007, FR-008
