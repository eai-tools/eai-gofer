# Internal Event Contract

## Summary

- External event/webhook/message contract count: **0**
- Internal lifecycle event count: **4**
- This feature introduces no event bus or persisted event schema. The events
  below are the truthful internal lifecycle checkpoints planning needs.

## Event Summary

| ID         | Event                | Trigger                                      | Producer                                                                                            | Consumer                                                 |
| ---------- | -------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| EVT-030-01 | Extension activation | VS Code activates the extension              | `extension/src/extension.ts`                                                                        | Startup services, registration flow, migration/sync flow |
| EVT-030-02 | Command registration | Activation registers public commands         | `extension.ts`, `CommandRegistry.ts`, and command modules                                           | Command palette, menus, views, and parity checks         |
| EVT-030-03 | Workspace sync       | Install/upgrade/migration resource sync runs | `extension/src/services/migration/ResourceSyncer.ts`                                                | Workspace resources and generated mirror files           |
| EVT-030-04 | Parity test run      | Maintainer or CI runs verification           | `tests/integration/command-registration.test.ts` and `tests/integration/command-generation.test.ts` | Maintainers, release/support owner, CI gate              |

## EVT-030-01 — Extension Activation

- Trigger: VS Code opens a workspace and activates the extension
- Producer: `extension/src/extension.ts` `activate(...)`
- Consumer: command registration, startup services, and migration/sync setup
- Invariants:
  - Cleanup must not break extension activation.
  - Manifest/runtime truth fixes must still leave a valid extension startup
    path.
- Traceability: US-001, US-002, US-003; NFR-002, NFR-005

## EVT-030-02 — Command Registration

- Trigger: extension activation reaches command registration paths
- Producer: `extension.ts`, registry code, and command modules
- Consumer: user-invokable command surfaces and command-parity validation
- Invariants:
  - Every public manifest command has live runtime registration.
  - Public command changes update coupled UI references in the same change.
  - Internal-only commands are not promoted into user-facing documentation.
- Traceability: US-001, US-005; FR-001, FR-002, FR-013; NFR-004, NFR-005

## EVT-030-03 — Workspace Sync

- Trigger: Gofer install, upgrade, or migration sync executes
- Producer: `extension/src/services/migration/ResourceSyncer.ts`
- Consumer: workspace copies of bundled resources and mirror surfaces
- Invariants:
  - Sync remains non-destructive.
  - Corrected bundled-resource names still resolve after sync.
  - Regenerated mirror content must not exceed the authoritative contract.
- Traceability: US-004; FR-011, FR-012; NFR-003, NFR-008

## EVT-030-04 — Parity Test Run

- Trigger: maintainer or CI runs repository verification after cleanup
- Producer: existing parity tests in `tests/integration/`
- Consumer: release/support owner, maintainers, and CI decisions
- Invariants:
  - `command-registration.test.ts` passes without lowering command expectations.
  - `command-generation.test.ts` passes after mirror regeneration.
  - Add only a small targeted documentation/settings parity check if a real uncovered gap is found.
- Traceability: US-005; FR-013, FR-014, FR-015; NFR-001, NFR-009
