---
feature: 035-plugin-workspace-bootstrap
stage: validate-complete
tasksCompleted: 12/12 (100%)
GeneratedAt: 2026-05-28T14:08:00+10:00
---

# Tasks: Plugin Workspace Bootstrap

## Phase 1: Research And Contract

- [x] T001 Compare plugin-install behavior with `gofer.initialize` and
      `syncMissingResources`.
- [x] T002 Define the exact sentinel set and host-specific repo file policy.
- [x] T003 Decide that repo-local assistant mirrors stay optional behind an
      explicit flag.

## Phase 2: Implementation

- [x] T101 Add the portable workspace bootstrap library.
- [x] T102 Add `gofer-workspace-check.mjs` and `gofer-workspace-bootstrap.mjs`.
- [x] T103 Add canonical `gofer:check-workspace` and `gofer:bootstrap-workspace`
      helper commands.
- [x] T104 Inject host-specific workspace preflight into generated stage/helper
      surfaces while excluding pure session controls.
- [x] T105 Clean up Codex-facing manifests to use the umbrella skill surface and
      reduce duplicate picker entries.
- [x] T106 Regenerate command surfaces, extension resources, and packaged plugin
      bundles.

## Phase 3: Validation

- [x] T201 Add tests for workspace bootstrap success, preservation behavior, and
      generated host-specific preflight text.
- [x] T202 Restore category/contract parity for the new helpers and update root
      `AGENTS.md`.
- [x] T203 Re-run `npm run gofer:generate`,
      `npm run gofer:package-plugin -- --sync-repo`, `npm run build`,
      `npm run typecheck`, `npm run lint`, `npm run gofer:codex-doctor`, and
      full `npm test`.

## Completion Note

- [x] Feature implemented and validated on 2026-05-28 with `255` test files and
      `3419` tests passing.
