---
feature: 034-gofer-operating-layer
status: ready
created: 2026-05-28
---

# Data Model: Gofer Operating Layer

## SurfaceAdapterRecord

| Field | Description |
| --- | --- |
| `id` | Stable surface id: `claude`, `codex`, `copilot`, `gemini`, `vscode`, `terminal`. |
| `state` | `native`, `adapter-backed`, `instruction-backed`, `reference-only`, or `unsupported`. |
| `supportedAssets` | Files or behaviors Gofer can install or verify. |
| `unsupportedSurfaces` | Known platform limits or missing enforcement. |
| `installOrOnramp` | Command or documented path to activate the surface. |
| `verificationCommands` | Commands/tests proving support. |
| `riskNotes` | Human-readable drift or enforcement risks. |
| `owner` | Maintainer role responsible for the row. |
| `lastVerifiedAt` | ISO date. |

## InstallStateRecord

| Field | Description |
| --- | --- |
| `surfaceId` | Surface the install record applies to. |
| `managedPath` | Path Gofer installed or generated. |
| `sourcePath` | Canonical source or bundle path. |
| `checksum` | Content checksum at install time. |
| `version` | Gofer version that wrote the file. |
| `operation` | `copy`, `generate`, `symlink`, `manifest`, or `config-entry`. |
| `createdAt` | Install timestamp. |
| `lastCheckedAt` | Last doctor timestamp. |

## DiagnosticReport

| Field | Description |
| --- | --- |
| `goferVersion` | Root and extension/package versions. |
| `surfaces` | Per-surface install health. |
| `generatedSurfaceParity` | Whether generated surfaces match canonical sources. |
| `codexBudget` | Existing Codex doctor output preserved. |
| `eaiCapabilityHealth` | EAI public command/resource status when available. |
| `releaseReadiness` | Latest release gate status when available. |
| `warnings` | Actionable findings. |
| `recommendedActions` | Repair, regenerate, reinstall, or ask operator. |

## ReleaseGateReport

| Field | Description |
| --- | --- |
| `version` | Release version being checked. |
| `artifacts` | VSIX, plugin zip, staged public plugin, latest aliases. |
| `manifestParity` | Version and metadata consistency across plugin manifests. |
| `surfaceParity` | Generated assistant surface status. |
| `docsIntegrity` | Missing referenced docs or stale URLs. |
| `privacyBoundary` | Private path and private EAI detail checks. |
| `result` | `pass`, `fail`, or `blocked`. |

## EaiCapabilityEvidence

| Field | Description |
| --- | --- |
| `capabilityId` | Desired or discovered EAI capability. |
| `evidenceSource` | Public command, local reference, or operator note. |
| `status` | `accessible`, `purchasable`, `operator-assisted`, `unavailable`, `unknown`. |
| `checkedAt` | Timestamp. |
| `usedByArtifact` | Target artifact such as `service-fit-matrix.md`. |

## GoferEvent

| Field | Description |
| --- | --- |
| `eventId` | Stable unique id. |
| `type` | Stage, artifact, approval, capability, validation, release, install, or diagnostic event. |
| `featureId` | Optional spec feature id. |
| `surfaceId` | Optional assistant surface. |
| `payload` | Event-specific JSON payload. |
| `createdAt` | Timestamp. |

## DeliveryProfile

| Field | Description |
| --- | --- |
| `id` | `full`, `app-delivery`, `business-process`, `documentation-only`, `support-diagnostic`, `workshop-student`. |
| `includedStages` | Stages shown as primary for the profile. |
| `requiredArtifacts` | Artifacts expected for completion. |
| `hiddenAdvancedCapabilities` | Capabilities de-emphasized, not removed. |
| `onrampText` | Short user-facing explanation. |

