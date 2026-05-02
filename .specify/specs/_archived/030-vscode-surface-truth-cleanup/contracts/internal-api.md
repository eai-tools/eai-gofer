# Internal API Contract

## Summary

- Callable internal service/API endpoint count: **0**
- Planning-relevant internal interface count: **4**
- This feature has no networked internal service API. The useful internal
  contracts are authority boundaries IAP-030-01 through IAP-030-04.

## Interface Summary

| ID         | Surface                         | Source surface                                                     | Authority                                                                        | Output / consumer                                                                |
| ---------- | ------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| IAP-030-01 | Command and doc truth alignment | `extension/README.md`, `README.md`, `docs/API_KEY_SETUP.md`, `docs/guides/configuration.md`, `docs/guides/session-management.md`, `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md` | `extension/package.json` `contributes.commands` plus live runtime registrations  | User-facing command claims consumed by extension users, maintainers, and support |
| IAP-030-02 | Canonical-to-mirror generation  | `.specify/commands/*.md`                                           | `scripts/generate-commands.ts`, `.specify/scripts/node/generate-commands.mjs`, and `scripts/sync-extension-resources.sh` | Generated repo and packaged mirrors in `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, and `extension/resources/` |
| IAP-030-03 | Config helper alignment         | `extension/src/config.ts` keys and defaults                        | `extension/package.json` `contributes.configuration.properties`                  | VS Code Settings UI and runtime config consumers                                 |
| IAP-030-04 | Resource naming consistency     | `extension/src/commands/specCommands.ts` resource references       | Bundled files under `extension/resources/`                                       | Prompt/resource loading for user-invokable command flows                         |

## IAP-030-01 — Command and Doc Truth Alignment

- Source surface: `extension/README.md`, `README.md`,
  `docs/API_KEY_SETUP.md`, `docs/guides/configuration.md`,
  `docs/guides/session-management.md`, and
  `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md`
- Authority: `extension/package.json` `contributes.commands` plus runtime
  registrations in extension command files
- Output / consumer: truthful user-facing command wording and availability for
  extension users, maintainers, and release/support owners
- Invariants:
  - A documented user-facing command must be both contributed and registered.
  - A removed or renamed public command must update coupled menu, keybinding,
    view, and tree-action references in the same change.
  - Internal-only commands remain outside user-facing documentation.
- Traceability: US-001, US-003; FR-001, FR-002, FR-003, FR-004, FR-013; NFR-004,
  NFR-005, NFR-006

## IAP-030-02 — Canonical-to-Mirror Generation

- Source surface: `.specify/commands/*.md`
- Authority: `scripts/generate-commands.ts`,
  `.specify/scripts/node/generate-commands.mjs`, and
  `scripts/sync-extension-resources.sh`
- Output / consumer: generated repo and packaged mirror artifacts in `.claude/`,
  `.github/`, `.gemini/`, `.agents/`, `.system/`, and `extension/resources/`
  consumed by downstream CLI surfaces, packaged extension resources, and
  contributors
- Invariants:
  - Canonical command descriptions are authored once, then regenerated outward.
  - Generated mirrors must not advertise behavior outside the current
    authoritative contract.
  - Mirror truth is maintained by regeneration, not by hand-editing downstream
    copies.
  - Packaged `extension/resources/` mirror copies are refreshed through the
    existing sync path rather than hand-editing bundled files.
- Traceability: US-004, US-005; FR-010, FR-011, FR-014; NFR-008

## IAP-030-03 — Config Helper Alignment

- Source surface: `extension/src/config.ts` helper keys and defaults
- Authority: `extension/package.json` `contributes.configuration.properties`
- Output / consumer: user-facing settings guidance, VS Code Settings UI, and
  runtime configuration reads
- Invariants:
  - User-facing keys and defaults in helpers must match the manifest or be
    removed from the public surface.
  - Internal-only configuration behavior stays undocumented in user-facing
    material.
  - The manifest remains the public settings contract.
- Traceability: US-002; FR-005, FR-006, FR-007

## IAP-030-04 — Resource Naming Consistency

- Source surface: `extension/src/commands/specCommands.ts` bundled-resource
  references
- Authority: bundled files under `extension/resources/` using the shipped naming
  convention
- Output / consumer: prompt/resource resolution for command execution in user
  workspaces
- Invariants:
  - A user-invokable command must reference the actual bundled filename.
  - Resource naming fixes must preserve non-destructive workspace sync behavior.
- Traceability: US-004; FR-012; NFR-003
