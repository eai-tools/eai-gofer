# Internal Service Contracts — EnterpriseAI Student Vertical Builder

## Scope

These contracts define internal operations between Gofer workflow components.  
They are non-public service contracts (operation-based, not external REST
endpoints).

Internal operation count: **11**

## IAP-001 — `workflow.activateProfile`

### Method + Path (or Operation Name)

`Operation: workflow.activateProfile`

### Description

Activates `gofer.workflowProfile` (`standard` or `enterpriseai`) and applies
profile-specific defaults.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "workflowProfile": "enterpriseai",
  "stage": "discovery",
  "requestedBy": "student@university.edu"
}
```

### Response Schema Example

```json
{
  "status": "accepted",
  "activeProfile": "enterpriseai",
  "defaultsApplied": {
    "enterpriseAiGuidance": true,
    "marpRecommended": true,
    "competitiveAnalysisDefault": true
  }
}
```

### Error Codes

| Code                          | Description                                            |
| ----------------------------- | ------------------------------------------------------ |
| WF_PROFILE_INVALID            | `workflowProfile` is not `standard` or `enterpriseai`. |
| WF_PROFILE_CONFIG_MISSING     | Profile configuration cannot be resolved.              |
| WF_PROFILE_ACTIVATION_BLOCKED | Policy gate prevented activation.                      |

### User Story and FR Mapping

- **User stories**: US-001, US-002, US-007
- **Functional requirements**: FR-001, FR-008

## IAP-002 — `governance.requestArchitectureDecision`

### Method + Path (or Operation Name)

`Operation: governance.requestArchitectureDecision`

### Description

Presents exactly one architecture decision at a time and moves run state to
approval-waiting.

### Request Schema Example

```json
{
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
  "status": "pending_approval",
  "approvalToken": "appr_tok_7b2e",
  "presentedDecisionCount": 1,
  "nextAction": "await_user_approval"
}
```

### Error Codes

| Code                        | Description                                    |
| --------------------------- | ---------------------------------------------- |
| GOV_DECISION_NOT_FOUND      | Referenced decision definition does not exist. |
| GOV_DECISION_SEQUENCE_ERROR | A prior decision is still unresolved.          |
| GOV_APPROVAL_DISABLED       | Approval loop was incorrectly bypassed.        |

### User Story and FR Mapping

- **User stories**: US-001, US-002
- **Functional requirements**: FR-005

## IAP-003 — `governance.recordArchitectureDecisionApproval`

### Method + Path (or Operation Name)

`Operation: governance.recordArchitectureDecisionApproval`

### Description

Records explicit user approval/rejection for one architecture decision and
updates progression state.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "approvalToken": "appr_tok_7b2e",
  "decisionId": "arch-dec-03",
  "approved": true,
  "approvedBy": "student@university.edu",
  "comment": "Use feature-flagged rollout."
}
```

### Response Schema Example

```json
{
  "status": "recorded",
  "decisionId": "arch-dec-03",
  "approvalState": "approved",
  "pipelineMayProceed": true
}
```

### Error Codes

| Code                            | Description                                  |
| ------------------------------- | -------------------------------------------- |
| GOV_APPROVAL_TOKEN_INVALID      | Approval token is invalid or expired.        |
| GOV_APPROVAL_ALREADY_RECORDED   | Decision already has a final approval state. |
| GOV_APPROVAL_AUDIT_WRITE_FAILED | Approval log could not be persisted.         |

### User Story and FR Mapping

- **User stories**: US-001, US-002, US-007
- **Functional requirements**: FR-005, FR-008

## IAP-004 — `references.resolveEnterpriseAiReferences`

### Method + Path (or Operation Name)

`Operation: references.resolveEnterpriseAiReferences`

### Description

Resolves EAI guidance sources, preferring approved external docs and falling
back to `.specify/references/eai/` when unavailable.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "referenceTypes": ["eai-cli", "vertical-template", "deployment-repo"],
  "externalReferencesEnabled": true,
  "fallbackPath": ".specify/references/eai/"
}
```

### Response Schema Example

```json
{
  "status": "resolved",
  "resolvedReferences": [
    {
      "type": "eai-cli",
      "source": "local-fallback",
      "path": ".specify/references/eai/eai-cli.md"
    }
  ],
  "unavailableExternalReferences": ["deployment-repo"],
  "userNoticeRequired": true
}
```

### Error Codes

| Code                        | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| REF_EXTERNAL_UNAVAILABLE    | External reference could not be retrieved.              |
| REF_FALLBACK_NOT_FOUND      | Local fallback reference is missing.                    |
| REF_ALL_SOURCES_UNAVAILABLE | Neither external nor fallback references are available. |

### User Story and FR Mapping

- **User stories**: US-002, US-004
- **Functional requirements**: FR-002, FR-007, FR-010

## IAP-005 — `research.generateBusinessAndMarketArtifacts`

### Method + Path (or Operation Name)

`Operation: research.generateBusinessAndMarketArtifacts`

### Description

Generates business analysis and optional competitive/market analysis artifacts
for EnterpriseAI profile runs, enforcing minimum alternative coverage and
downstream traceability fields.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "workflowProfile": "enterpriseai",
  "includeCompetitiveAnalysis": true,
  "minimumAlternativeCount": 3,
  "requireSpecAndPlanReferences": true,
  "discoveryArtifactPath": ".specify/specs/029-enterpriseai-student-vertical-builder/discovery.md"
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "businessAnalysisPath": ".specify/specs/029-enterpriseai-student-vertical-builder/business-analysis.md",
  "marketAnalysisPath": ".specify/specs/029-enterpriseai-student-vertical-builder/market-analysis.md",
  "competitiveAnalysisEnabled": true,
  "marketAnalysisSummary": {
    "alternativeCount": 3,
    "referencedInSpec": true,
    "referencedInPlan": true
  }
}
```

### Error Codes

| Code                                               | Description                                      |
| -------------------------------------------------- | ------------------------------------------------ |
| RESEARCH_INPUT_MISSING                             | Required discovery/spec context is missing.      |
| RESEARCH_MARKET_ANALYSIS_FAILED                    | Competitive analysis generation failed.          |
| RESEARCH_MARKET_ANALYSIS_INSUFFICIENT_ALTERNATIVES | `market-analysis` has fewer than 3 alternatives. |
| RESEARCH_ARTIFACT_WRITE_FAILED                     | Output artifact could not be written.            |

### User Story and FR Mapping

- **User stories**: US-001, US-002, US-005
- **Functional requirements**: FR-003

## IAP-006 — `planning.generateEnterpriseAiPlanAndTasks`

### Method + Path (or Operation Name)

`Operation: planning.generateEnterpriseAiPlanAndTasks`

### Description

Generates EAI-specific planning/task structures, including EAI CLI version
pinning and deployment convention guidance.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "workflowProfile": "enterpriseai",
  "specPath": ".specify/specs/029-enterpriseai-student-vertical-builder/spec.md",
  "resolvedReferences": {
    "eaiCli": ".specify/references/eai/eai-cli.md",
    "verticalTemplate": ".specify/references/eai/vertical-template.md",
    "deploymentRepo": ".specify/references/eai/deployment-repo.md"
  },
  "installedEaiCliVersion": "2.7.4"
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "planPath": ".specify/specs/029-enterpriseai-student-vertical-builder/plan.md",
  "tasksPath": ".specify/specs/029-enterpriseai-student-vertical-builder/tasks.md",
  "recordedEaiCliMajorMinor": "2.7",
  "deploymentConventionsIncluded": true
}
```

### Error Codes

| Code                             | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| PLAN_EAI_CLI_VERSION_UNAVAILABLE | Installed `eai-cli` version could not be read. |
| PLAN_DEPLOYMENT_GUIDANCE_MISSING | Deployment conventions source is missing.      |
| PLAN_ARTIFACT_GENERATION_FAILED  | Plan/tasks generation failed.                  |

### User Story and FR Mapping

- **User stories**: US-002, US-004
- **Functional requirements**: FR-002, FR-007, FR-010

## IAP-007 — `comms.generateStakeholderArtifacts`

### Method + Path (or Operation Name)

`Operation: comms.generateStakeholderArtifacts`

### Description

Generates stakeholder communication outputs (release notes, demo script,
optional Marp deck) using pipeline artifacts.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "workflowProfile": "enterpriseai",
  "enableMarpDeck": true,
  "inputArtifacts": {
    "discovery": "discovery.md",
    "spec": "spec.md",
    "plan": "plan.md",
    "implementationSummary": "implementation-summary.md"
  }
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "releaseNotesPath": "release-notes.md",
  "demoScriptPath": "demo-script.md",
  "marpDeckPath": "presentation.marp.md",
  "marpDeckGenerated": true
}
```

### Error Codes

| Code                         | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| COMMS_INPUT_ARTIFACT_MISSING | Required upstream artifact is missing.            |
| COMMS_MARP_TEMPLATE_INVALID  | Marp template/frontmatter is invalid.             |
| COMMS_OUTPUT_WRITE_FAILED    | One or more comms artifacts could not be written. |

### User Story and FR Mapping

- **User stories**: US-003
- **Functional requirements**: FR-004

## IAP-008 — `artifacts.propagateCanonicalMirrors`

### Method + Path (or Operation Name)

`Operation: artifacts.propagateCanonicalMirrors`

### Description

Propagates canonical command updates to Copilot/Codex/Gemini mirrors via
generation + sync workflows.

### Request Schema Example

```json
{
  "changeSetId": "chg_2026_04_09_01",
  "canonicalSources": [".claude/commands/0_business_scenario.md"],
  "targetMirrors": [
    ".github/prompts",
    ".system/skills",
    ".agents/skills",
    "extension/resources"
  ],
  "runParityValidation": true
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "mirrorsUpdated": 4,
  "filesChanged": 18,
  "parityValidation": "passed"
}
```

### Error Codes

| Code                          | Description                            |
| ----------------------------- | -------------------------------------- |
| PROP_CANONICAL_SOURCE_MISSING | Canonical source file is missing.      |
| PROP_MIRROR_WRITE_FAILED      | Target mirror could not be updated.    |
| PROP_PARITY_VALIDATION_FAILED | Post-propagation parity checks failed. |

### User Story and FR Mapping

- **User stories**: US-006, US-007
- **Functional requirements**: FR-006, FR-008

## IAP-009 — `positioning.updateExtensionMessaging`

### Method + Path (or Operation Name)

`Operation: positioning.updateExtensionMessaging`

### Description

Updates extension-facing product surfaces to lead with EnterpriseAI vertical app
delivery while preserving multi-platform references.

### Request Schema Example

```json
{
  "releaseId": "1.28.0-enterpriseai",
  "surfaces": ["extension/package.json", "extension/README.md", "README.md"],
  "primaryMessage": "EnterpriseAI vertical app delivery",
  "preserveMultiPlatformSection": true
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "updatedSurfaces": 3,
  "enterpriseAiPrimaryMessaging": true,
  "multiPlatformSupportRetained": true
}
```

### Error Codes

| Code                    | Description                                         |
| ----------------------- | --------------------------------------------------- |
| POS_SURFACE_NOT_FOUND   | One or more target docs/metadata files are missing. |
| POS_VALIDATION_FAILED   | Messaging constraints failed validation.            |
| POS_UPDATE_WRITE_FAILED | Updated positioning content could not be saved.     |

### User Story and FR Mapping

- **User stories**: US-001, US-002, US-007
- **Functional requirements**: FR-009, FR-008

## IAP-010 — `validation.runCompatibilityAndParityGate`

### Method + Path (or Operation Name)

`Operation: validation.runCompatibilityAndParityGate`

### Description

Runs parity and regression validation gates to ensure no capability loss and no
cross-platform drift.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "checks": ["parity", "unit", "integration", "cross-platform-routing"],
  "requireZeroRegression": true,
  "requireRemovalApprovalLog": true
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "parityResult": "passed",
  "regressionResult": "passed",
  "removedCapabilitiesDetected": 0,
  "gatePassed": true
}
```

### Error Codes

| Code                         | Description                                            |
| ---------------------------- | ------------------------------------------------------ |
| VAL_PARITY_FAILED            | Platform mirror parity check failed.                   |
| VAL_REGRESSION_FAILED        | Regression suite reported failures.                    |
| VAL_REMOVAL_APPROVAL_MISSING | Capability removal/change lacks explicit approval log. |

### User Story and FR Mapping

- **User stories**: US-006, US-007
- **Functional requirements**: FR-006, FR-008

## IAP-011 — `implementation.validateDeploymentReadiness`

### Method + Path (or Operation Name)

`Operation: implementation.validateDeploymentReadiness`

### Description

Validates deployment-required files (manifest/config and related artifacts)
before deployment tasks can be marked complete in the implementation stage.

### Request Schema Example

```json
{
  "runId": "run_029_0001",
  "stage": "implementation",
  "deploymentTaskId": "task_deploy_01",
  "requiredFiles": ["manifest.yml", "config.json", ".env.example"],
  "blockCompletionOnFailure": true
}
```

### Response Schema Example

```json
{
  "status": "completed",
  "readinessPassed": false,
  "missingFiles": ["manifest.yml"],
  "validatedAt": "2026-04-09T00:25:00Z",
  "deploymentTaskCompletionAllowed": false
}
```

### Error Codes

| Code                                   | Description                                               |
| -------------------------------------- | --------------------------------------------------------- |
| IMPL_DEPLOYMENT_REQUIRED_FILES_MISSING | One or more deployment-required files are missing.        |
| IMPL_DEPLOYMENT_GATE_BLOCKED           | Deployment task completion was blocked by readiness gate. |
| IMPL_DEPLOYMENT_VALIDATION_FAILED      | Deployment readiness validation could not complete.       |

### User Story and FR Mapping

- **User stories**: US-004, US-007
- **Functional requirements**: FR-007, FR-008
