---
feature: 034-gofer-operating-layer
status: draft
created: 2026-05-28
---

# CLI Command Contract: Gofer Operating Layer

## Command Family

Commands may be implemented as npm scripts first, then exposed through a Gofer CLI
wrapper later if one exists.

| Command | Required Behavior |
| --- | --- |
| `gofer surface-matrix --check --format json` | Validate surface compliance data and fail on missing evidence fields. |
| `gofer release-gate --version <version> --format json` | Validate release artifacts, manifests, docs, privacy boundary, and generated surface parity. |
| `gofer preview-pack-smoke --format json` | Smoke-check public plugin bundle and VSIX packaging path. |
| `gofer list-installed --format json` | List Gofer-managed surface installs from install-state. |
| `gofer doctor --surface all --format json` | Produce multi-surface diagnostic report, including existing Codex doctor behavior. |
| `gofer repair --surface <id> --dry-run` | Plan repair operations for Gofer-managed files only. |
| `gofer uninstall --surface <id> --dry-run` | Plan removals for Gofer-managed files only. |
| `gofer support-bundle --redact --format json` | Emit redacted support evidence without secrets. |
| `gofer eai-health --format json` | Check public EAI command/resource availability where possible. |
| `gofer catalog --format json` | List stages, helpers, templates, profiles, surfaces, and required artifacts. |

## Safety Requirements

- All mutating commands must support `--dry-run`.
- `doctor`, `list-installed`, `surface-matrix`, `release-gate`, `preview-pack-smoke`,
  `eai-health`, and `catalog` must be read-only.
- `repair` and `uninstall` must refuse to touch paths not present in Gofer
  install-state unless the user explicitly opts into a manual action outside this
  feature.
- JSON output must be deterministic enough for tests.

