---
feature: 034-gofer-operating-layer
status: complete
created: 2026-05-28
---

# Reuse Scan: Gofer Operating Layer

## Existing Gofer Capabilities To Preserve

| Capability | Existing Surface | Decision |
| --- | --- | --- |
| Numbered Gofer pipeline | `.specify/commands/0_business_scenario.md` through `10_gofer_cloud.md` | Preserve unchanged. |
| Cross-surface generation | `.specify/scripts/node/generate-commands.mjs` | Extend with validators, do not replace. |
| Public plugin packaging | `.specify/scripts/node/package-agent-plugin.mjs` and `scripts/publish-public-release-assets.mjs` | Extend with release gates. |
| Codex diagnostic | `.specify/scripts/node/codex-doctor.mjs` | Reuse as first adapter-specific doctor; generalize to multi-surface doctor. |
| VS Code resource sync | `extension/src/services/migration/ResourceSyncer.ts` | Preserve and use as install-state evidence source where possible. |
| EAI-first workflow artifacts | `context-bundle.md`, `contract-pack.md`, `reuse-scan.md`, `service-fit-matrix.md`, `audit-history.md` | Preserve as core Gofer value. |
| Validation truthfulness | Spec `031-skills-pipeline-augmentation` | Treat as dependency; do not duplicate. |

## ECC Capabilities To Adapt

| ECC Pattern | Gofer Adaptation | Decision |
| --- | --- | --- |
| Harness adapter compliance matrix | Gofer surface compliance matrix for Claude, Codex, Copilot, Gemini, VS Code, terminal fallback | Create. |
| `list-installed`, `doctor`, `repair`, `uninstall` | Gofer install-state lifecycle with dry-run and JSON modes | Create additively. |
| `preview-pack:smoke` and `release:approval-gate` | Gofer release gate covering VSIX, plugin zip, public URLs, manifests, generated surfaces, EAI boundary | Create. |
| Observability readiness | Gofer observability/support bundle readiness check | Create. |
| Selective install catalog | Gofer delivery profiles and surface catalog, not generic language/framework packs | Create later phase. |

## New Capability Boundaries

| Boundary | Rule |
| --- | --- |
| No capability removal | Any change that removes, disables, renames, or hides a current Gofer command/surface requires explicit approval and regression evidence. |
| Additive first | New doctor, release, catalog, install-state, and event capabilities must sit beside existing scripts until proven. |
| EAI focus | ECC-derived mechanisms must be framed around EAI delivery, not general-purpose agent optimization. |
| Public/private boundary | Public release gates must detect private absolute paths and private EAI implementation detail before packaging. |

