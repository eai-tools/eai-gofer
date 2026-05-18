---
feature: 030-vscode-surface-truth-cleanup
spec: /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/spec.md
research: /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/research.md
status: ready
created: 2026-04-30T23:16:13+10:00
---

# Implementation Plan: 030-vscode-surface-truth-cleanup

## Summary

This plan delivers the approved **manifest + runtime + docs + tests
truth-alignment** cleanup for the Gofer VS Code surface. Per
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/context-bundle.md`,
the work remains **non-application repo cleanup**. Per
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/reuse-scan.md`,
the implementation reuses existing manifest, runtime, generator, and parity-test
surfaces rather than introducing new features or a new docs pipeline. Per
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/market-analysis.md`,
the prevention strategy stays repo-owned and uses existing tooling only.

Planning baseline captured during this stage:

- `npx vitest run tests/integration/command-registration.test.ts tests/integration/command-generation.test.ts`
  passed (`36/36` tests).
- `npm run generate-commands -- --dry-run --verbose` completed successfully and
  reported a non-destructive sync from
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/` to
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/` with no
  pending updates.
- `eai` is **not installed locally**, so no version pin is available for this
  non-app cleanup.

## Reference Inputs

- **Context bundle**:
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/context-bundle.md`
  — confirms non-application classification, in-scope surfaces, and validation
  criteria.
- **Contract pack**:
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/contract-pack.md`
  — supplies actors, object types, IAP-030-01 through IAP-030-04, and acceptance
  tests AT-001 through AT-010.
- **Reuse scan**:
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/reuse-scan.md`
  — locks reuse/prune-first decisions.
- **Audit history**:
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/audit-history.md`
  — stable-finding registry seeded and updated by this plan.
- **Market analysis**:
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/market-analysis.md`
  — confirms build-custom/no-buy for drift prevention.

## Technical Context

**Language / Version**: TypeScript 5.x (`5.7.2` at
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/package.json`; `5.3.3` in
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json` and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/language-server/package.json`)
on Node.js ESM.

**Primary Dependencies**: VS Code Extension API, `webpack`,
`vscode-languageclient`, `vscode-languageserver`, `tsyringe`,
`reflect-metadata`, `gray-matter`, `yaml`, `vitest`, `@vscode/test-electron`,
and existing generator scripts at
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/generate-commands.ts`
and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/scripts/node/generate-commands.mjs`.

**Storage**: Filesystem-only repository surfaces
(`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/`,
generated mirror directories, and changelog files). No database or network
deployment state is introduced.

**Testing / Verification**: Root Vitest integration tests, extension
`compile-tests` / `compile`, and generator dry-run verification. The primary
public-contract guardrail is
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-registration.test.ts`
and the secondary repo-generated-surface consistency guard is
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-generation.test.ts`;
bundled outputs under
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-agents/`
and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-commands/`
and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/copilot-prompts/`,
and the bundled workspace-sync surface
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/gemini/`
still require direct diff review whenever generation or sync refresh writes
them.

**Target Platform**: VS Code `^1.85.0` with the bundled Gofer extension and
bundled language server on local developer workstations.

**Project Type**: Brownfield monorepo cleanup across:

- `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/` root orchestrator and
  generators
- `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/` VS Code
  extension runtime and packaged resources
- `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/language-server/` bundled
  LSP/MCP server

**Performance Goals**: Preserve constitution targets from
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/memory/constitution.md`
— extension activation `<500ms`, tree-view rendering `<100ms`, language-server
start `<1s` — by avoiding new activation work and generator complexity.

**Constraints**:

- No new dependencies.
- No feature resurrection to make stale docs true again.
- No rewrite of the TypeScript or Node command generators.
- Preserve split command registration across activation, registry, and command
  modules.
- Preserve non-destructive sync behavior in
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/migration/ResourceSyncer.ts`.
- Leave archived specs under
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/_archived/`
  untouched.
- No selected sequence diagram exists or is required.
- `eai` is unavailable locally.

**Scale / Scope**: Current public surface includes `46` contributed commands,
`54` contributed settings, multiple doc surfaces
(`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/API_KEY_SETUP.md`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/session-management.md`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/agentic-coding/AGENT_TOOLING_REFERENCE.md`),
bundled resources under
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-agents/`
and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-commands/`
and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/copilot-prompts/`,
and the bundled workspace-sync surface
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/gemini/`,
and generated command surfaces under
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.github/prompts/`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.gemini/`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/gofer/`,
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/`, and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/gofer/`.

## Architecture

### Selected Implementation Approach

Use a **static contract-alignment architecture**:

1. treat
   `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`
   plus live runtime registrations as the authoritative public contract
2. align runtime helpers and resource references to that contract
3. trim active documentation and canonical command text to the same contract
4. verify parity with existing tests and generator dry-run before closing
   findings

This follows the approved research direction in
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/research.md`
and the reuse-first rule in
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/reuse-scan.md`.

### Architecture Decisions

- **Authority flows downward**: documentation, config helpers, and mirrors
  follow manifest/runtime truth; they do not redefine it.
- **User-facing documentation requires meaningful, visible behavior**: a command
  is documentation-worthy only when it is manifest-contributed, discoverable
  through the command palette or another visible UI contribution, and backed by
  non-placeholder runtime behavior; manifest-contributed placeholders or hidden
  utilities are public-contract debt to fix or remove, not claims to advertise.
- **Incremental refactor over rewrite**: modify only the drifted
  runtime/config/docs surfaces; keep generator architecture intact.
- **Release-note capture is part of the cleanup**: removals from active guidance
  are recorded alongside the same change set.
- **Generated mirrors remain derived artifacts**: edit canonical command sources
  only when a proven truth drift requires it.
- **Generation split stays explicit**:
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/scripts/node/generate-commands.mjs`
  emits `.claude/commands/`, `extension/resources/claude-commands/`,
  `extension/resources/copilot-prompts/`, `.gemini/`, the shared flat
  `.github/prompts/` surface, and the scoped `.../skills/gofer/` trees;
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/sync-extension-resources.sh`
  refreshes packaged `extension/resources/**` copies such as
  `extension/resources/gemini/` from repo surfaces; and
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/generate-commands.ts`
  consumes `.claude/commands/` and refreshes the flat `.system/skills/`, shared
  `.github/prompts/`, and synced flat `.agents/skills/` outputs.
- **No app/runtime expansion**: no new API, datastore, or deployment subsystem
  is introduced.

### Diagram Description

No selected sequence diagram exists for this feature, and none is needed. Use
the following static architecture description in downstream tasking and review:

```text
Lane 1 — Authoring / Documentation Surfaces
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/API_KEY_SETUP.md
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/session-management.md
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/agentic-coding/AGENT_TOOLING_REFERENCE.md
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/commands/*.md

                │ align to
                ▼

Lane 2 — Authority Surfaces
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/extension.ts
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/CommandRegistry.ts
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/config.ts
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/commands/specCommands.ts
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/**

                │ distributes to
                ▼

Lane 3 — Runtime / Distribution Outputs
  VS Code Command Palette and Settings UI
  packaged extension bundle
  node-emitted surfaces:
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-commands/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/copilot-prompts/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.gemini/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/gofer/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/gofer/**
  shared flat prompt surface refreshed by both pipelines
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.github/prompts/**
  packaged resource sync output via scripts/sync-extension-resources.sh
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-agents/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/gemini/**
  TS-generated flat surfaces from .claude/commands/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/**
    /Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/**

Validation rail beneath all lanes
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-registration.test.ts
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-generation.test.ts
  /Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/unit/extension/Config.test.ts
```

## Integration Points

| Component                                           | File                                                                                                  | Integration Type                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Public command and settings contract                | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`                             | Manifest authority                                                |
| Global activation and direct runtime config reads   | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/extension.ts`                         | Runtime registration / brownfield coupling                        |
| Workspace command registration                      | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/CommandRegistry.ts`          | Runtime registration / command classification                     |
| Downstream tree-command consumer                    | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/progressProvider.ts`                  | Command-ID dependency (`gofer.showTaskDetails`)                   |
| Settings helper layer                               | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/config.ts`                            | Manifest-to-helper key/default alignment                          |
| Hydrate command resource binding                    | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/commands/specCommands.ts`             | Bundled resource filename binding                                 |
| Non-destructive workspace sync                      | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/migration/ResourceSyncer.ts` | Resource migration and sync safety                                |
| Canonical command authoring                         | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/commands/`                                 | Source-of-truth command content                                   |
| Root generator and `.system -> .agents` mirror sync | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/generate-commands.ts`                       | Generated surface propagation                                     |
| Canonical Node emitter                              | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/scripts/node/generate-commands.mjs`        | Cross-surface emission                                            |
| VS Code marketplace/readme surface                  | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md`                                | User-facing workflow and command documentation                    |
| Cross-platform repo documentation                   | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md`                                          | Top-level usage and support guidance                              |
| API key setup guide                                 | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/API_KEY_SETUP.md`                              | Active VS Code settings/setup guidance                            |
| Configuration guide                                 | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md`                       | User-facing settings documentation                                |
| Session management guide                            | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/session-management.md`                  | Active context-window settings documentation                      |
| Agent tooling reference                             | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/agentic-coding/AGENT_TOOLING_REFERENCE.md`     | Active command/tooling reference documentation                    |
| Manifest/runtime parity guard                       | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-registration.test.ts`     | Regression gate                                                   |
| Canonical/mirror parity guard                       | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-generation.test.ts`       | Regression gate                                                   |
| Config helper unit suite                            | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/unit/extension/Config.test.ts`                | Regression gate (reused broader config helper/constants coverage) |
| Release-note capture                                | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/CHANGELOG.md`                             | Removal/correction disclosure                                     |

## Key Dependencies

| Dependency                                        | Source                                                                                                                                                                                                                      | Why it matters to this plan                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| TypeScript 5.x toolchain                          | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/package.json`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/language-server/package.json` | All runtime and test changes are TypeScript and must preserve strict typing    |
| VS Code extension runtime                         | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`                                                                                                                                                   | Public command/settings contract and packaged extension behavior               |
| `vscode-languageclient` / `vscode-languageserver` | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/language-server/package.json`                                                                  | Existing extension/server boundary must remain untouched by this cleanup       |
| `webpack` and extension compile scripts           | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`                                                                                                                                                   | Compile verification for any TypeScript or manifest-adjacent changes           |
| Vitest integration suite                          | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/package.json`                                                                                                                                                             | Existing parity checks are the primary regression guard                        |
| `@vscode/test-electron`                           | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`                                                                                                                                                   | Existing extension test harness; no new test framework required                |
| Canonical command generators                      | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/generate-commands.ts`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/scripts/node/generate-commands.mjs`                                             | Mirrors must be regenerated only when canonical command text changes           |
| Resource sync contract                            | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/migration/ResourceSyncer.ts`                                                                                                                       | Resource-path fixes cannot become destructive workspace changes                |
| Contract pack acceptance tests                    | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/contract-pack.md`                                                                                                         | AT-001 through AT-010 define closure evidence                                  |
| Stable finding registry                           | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/audit-history.md`                                                                                                         | Validation depends on named findings, owners, cadence, and accepted exceptions |

## Constitution Check

| Constitution Principle               | Plan Response                                                                                                                                                                 | Status |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Test-Driven Development           | Phase 1 starts from existing parity guards and Phase 5 adds only the smallest missing docs/settings-truth assertion if a real gap is confirmed.                               | Pass   |
| II. MCP-First Architecture           | No MCP tool or protocol change is introduced; existing extension/server boundaries remain untouched.                                                                          | Pass   |
| III. Spec Kit Format Compliance      | This plan stays in `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/`, uses task-ready IDs, and maintains full traceability. | Pass   |
| IV. Strict TypeScript & Code Quality | TypeScript edits are limited to existing runtime/test files and must retain explicit typing and current repo patterns.                                                        | Pass   |
| V. Security by Default               | No new secrets, auth flows, or network surfaces are added; cleanup is limited to truthful repo-owned documentation and runtime alignment.                                     | Pass   |
| VI. Performance Requirements         | No additional activation watchers, background services, or generator complexity are planned; activation and sync behavior are preserved.                                      | Pass   |
| VII. 80% Test Coverage Minimum       | Existing parity suites remain required and any new assertion must be narrow, real, and covered by current tooling.                                                            | Pass   |
| VIII. Minimal Necessary Changes      | The plan explicitly avoids generator rewrites, feature resurrection, and unrelated refactors.                                                                                 | Pass   |

**Complexity Tracking**: No constitution exception is expected. If
implementation uncovers a need to alter generator architecture or public command
scope, stop and amend the plan before proceeding.

## AI-Augmented App Journey

**Not applicable.**
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/context-bundle.md`
and
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/spec.md`
both classify this work as **non-application repo cleanup**. There is no
user-facing AI journey to preserve. The operational flow is the maintainer
cleanup workflow described in
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/contract-pack.md`.

## EnterpriseAI Profile Metadata

| Metadata Item               | Truthful Plan Entry                                                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow profile            | `enterpriseai` with explicit **maintenance adaptation** for non-application repo cleanup                                                                                                                                                                                    |
| EAI CLI version pin         | **Unavailable — `eai` is not installed locally; no major.minor pin can be recorded for this cleanup**                                                                                                                                                                       |
| Vertical template reference | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/references/eai/vertical-template.md` (fallback reference only; no vertical app scaffold or deployment task is required)                                                                                          |
| Deployment repo reference   | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/references/eai/deployment-repo.md` (fallback reference only; no external deployment target is part of scope)                                                                                                     |
| Environment targets         | `dev = local repo workspace`; `staging = not applicable`; `prod = not applicable`                                                                                                                                                                                           |
| Deployment convention       | Version-controlled repo cleanup only; release-note capture goes to `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/CHANGELOG.md` and optionally `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/CHANGELOG.md` if repo-level guidance changes need summarising |
| Contract-pack handoff       | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/contract-pack.md` governs actors, object types, IAP links, and AT-001 through AT-010 mappings across Phases 1-5                                                           |
| Reuse-before-create log     | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/reuse-scan.md` remains the decision log for every reuse/prune decision                                                                                                    |
| Audit seed                  | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/audit-history.md` stores stable finding IDs, owners, cadence, and accepted exceptions                                                                                     |
| Competitive / market stance | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/market-analysis.md` confirms build-custom/no external tooling buy                                                                                                         |
| Sequence diagram status     | No selected sequence diagram exists; the static contract-alignment description above is the required architecture view                                                                                                                                                      |

## Integration Map Handoff

The spec’s maintenance-chain integration map remains the downstream tasking
spine. Each IAP link below is bound to future placeholder IDs that must be
carried into
`/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/tasks.md`.

| IAP ID     | Maintenance Surface → Authority → Output                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Bound Plan Work                                                                                                     | Future `tasks.md` Placeholders                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| IAP-030-01 | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/API_KEY_SETUP.md`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/session-management.md`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/agentic-coding/AGENT_TOOLING_REFERENCE.md` → `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json` + runtime registrations → VS Code command palette / extension guidance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Baseline contract audit, doc cleanup, final parity verification                                                     | `T030-102`, `T030-103`, `T030-301`, `T030-302`, `T030-303`, `T030-501`, `T030-502` |
| IAP-030-02 | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/commands/*.md` → `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/scripts/node/generate-commands.mjs` → node-emitted outputs under `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-commands/`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/copilot-prompts/`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.github/prompts/`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.gemini/`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/gofer/`, and `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/gofer/`; then `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/generate-commands.ts` consumes `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/` and refreshes flat outputs under the shared `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.github/prompts/`, `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/`, and synced `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/`, with packaged sync outputs reviewed under `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-agents/` and `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/gemini/` | Canonical command audit, split generation-path verification, bundled-output review, flat/scoped mirror verification | `T030-104`, `T030-401`, `T030-402`, `T030-403`, `T030-503`                         |
| IAP-030-03 | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/config.ts` helper defaults / key names → `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json` settings contract → VS Code Settings UI and runtime reads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Helper-default alignment, direct config-read audit, settings documentation cleanup, conditional parity extension    | `T030-102`, `T030-202`, `T030-203`, `T030-302`, `T030-501`                         |
| IAP-030-04 | `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/commands/specCommands.ts` resource references → bundled resources under `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/` → prompt file loaded during command invocation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Hydrate resource-path fix plus non-destructive sync verification                                                    | `T030-104`, `T030-201`, `T030-205`, `T030-502`                                     |

## Implementation Phases

### Phase 1 — Baseline Truth Audit

**Goal**: Freeze the authoritative contract, classify public versus internal
behavior, and update the stable-finding registry before changing runtime or
docs.

- [ ] `T030-101` Verify the active spec directories under
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/` contain
      only
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup`
      and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/_archived/`;
      ignore hidden OS files such as `.DS_Store`. If any remaining active
      non-archived spec directory other than the 030 cleanup spec is encountered
      during baseline verification, move it into `_archived/` unchanged and
      otherwise leave the already-archived baseline intact.
- [ ] `T030-102` Freeze
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`
      as the public command/settings baseline and export authoritative
      inventories for commands, settings, menus, keybindings, and views.
- [ ] `T030-103` Trace runtime registrations across
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/extension.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/CommandRegistry.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/commands/specCommands.ts`,
      and companion command/status-bar modules so public behavior is separated
      from internal-only behavior. Use visible UI contribution points (command
      palette, menus, keybindings, views, or tree actions) plus runtime behavior
      to classify what is truly user-facing.
- [ ] `T030-104` Build a cross-surface evidence matrix comparing manifest,
      runtime,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/commands/*.md`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/*.md`,
      and bundled resources using
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/research.md`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/context-bundle.md`,
      and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/contract-pack.md`,
      then map each confirmed drift item to `VS-TRUTH-001` through
      `VS-TRUTH-006`.
- [ ] `T030-105` Update
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/audit-history.md`
      with confirmed findings, owners, review cadence, and accepted exceptions
      (`EX-030-01` and `EX-030-02`) discovered during the baseline audit.

**Verification Criteria**

- `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/` has no
  active non-cleanup spec directory remaining.
- Every later edit can cite baseline evidence from `T030-102` through
  `T030-104`.
- Stable findings in
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/audit-history.md`
  are specific enough for validation to track.

### Phase 2 — Runtime, Config, and Resource Alignment

**Goal**: Correct proven code drift while preserving current public scope,
activation safety, and non-destructive sync behavior.

- [ ] `T030-201` Update
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/commands/specCommands.ts`
      to load the existing bundled resource `gofer_hydrate.md` instead of the
      incorrect non-matching filename reference.
- [ ] `T030-202` Align user-facing `CONFIG_KEYS` / `DEFAULTS` in
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/config.ts`
      with the manifest contract in
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`,
      starting with confirmed default drift such as `gofer.preferredAI` and any
      other proven mismatches.
- [ ] `T030-203` Audit direct `vscode.workspace.getConfiguration('gofer')` reads
      across `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/**`
      using repo-wide search, starting with
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/extension.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/CommandRegistry.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/autonomousCommands.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/autonomous/**`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/config/workflowProfile.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/mcpConfig.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/webviewHelpers.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/ui/AIUsageStatusBar.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/ui/GoferActivityStatusBar.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/ui/ContextHealthStatusBar.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/council/providers/ProviderFactory.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/council/providers/ProviderFactoryCliResolver.ts`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/EventHandlers.ts`,
      and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/InitializationService.ts`;
      correct only user-facing key/default mismatches proven by `T030-104`, and
      treat any additional direct consumer discovered during this audit by the
      same manifest-schema/runtime comparison rule.
- [ ] `T030-204` If `T030-103` finds a manifest-contributed command with missing
      or placeholder runtime behavior, repair the implementation or update the
      paired manifest, menu, keybinding, view action, and tree action references
      in the same change; include downstream callers such as
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/progressProvider.ts`
      when command IDs like `gofer.showTaskDetails` are involved, and do not add
      new public commands.
- [ ] `T030-205` Re-check
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/migration/ResourceSyncer.ts`
      only for hydrate/resource-rename impact and keep it unchanged unless a
      bounded update is required to preserve non-destructive sync.

**Verification Criteria**

- `cd /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension && npm run compile-tests && npm run compile`
  passes if any TypeScript or manifest-adjacent files changed.
- `npx vitest run tests/integration/command-registration.test.ts tests/integration/command-generation.test.ts`
  stays green after Phase 2 edits, with `command-generation` treated only as a
  secondary repo-generated-surface consistency rail.
- No new user-facing command, setting, or workflow is added solely to rescue
  stale documentation.

### Phase 3 — Documentation Truth Cleanup

**Goal**: Make every active VS Code-facing document describe only supported
commands, settings, and workflow guidance.

- [ ] `T030-301` Rewrite
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md` so
      every named command, setup path, documented setting default, and
      standalone feature claim (including WhatsApp, memory, or similar claims)
      maps to the cleaned manifest/runtime contract; remove unsupported
      command-palette actions, stale onboarding steps, and unsupported feature
      claims without removing still-supported behaviors.
- [ ] `T030-302` Update
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md`
      so every documented setting key, default, and enum value matches
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`;
      remove any stale or dead setting key that is no longer present in the
      manifest/runtime contract.
- [ ] `T030-303` Trim
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md` only where it
      overstates current VS Code extension workflows, command surfaces,
      documented setting defaults, or setup claims; preserve accurate
      cross-platform guidance that still matches runtime behavior.
- [ ] `T030-304` Record every removal or correction from active VS Code-facing
      guidance in
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/CHANGELOG.md`;
      add a concise note to
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/CHANGELOG.md` only if
      the repo-level README guidance changes need summarising at the root.
- [ ] `T030-305` Cross-check documentation changes against acceptance tests
      `AT-001`, `AT-003`, and `AT-008` from
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/contract-pack.md`
      and against the non-app scope in
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/context-bundle.md`.

**Verification Criteria**

- Manual review of
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/README.md`,
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/README.md`, and
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/docs/guides/configuration.md`
  finds zero unsupported commands, settings, or workflow steps.
- `npx vitest run tests/integration/command-registration.test.ts tests/integration/command-generation.test.ts`
  is rerun at the end of Phase 3 to preserve the per-phase parity-test cadence.
- Every documented setting maps to
  `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`
  `contributes.configuration.properties`.
- Removal/correction notes exist in the chosen changelog target(s), satisfying
  `FR-009`.

### Phase 4 — Canonical and Mirror Surface Alignment

**Goal**: Keep generated command surfaces truthful without refactoring the
generator stack.

- [ ] `T030-401` Audit
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/commands/*.md`
      as the authoring source and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/*.md`
      as the currently consumed TypeScript-generator input mirror for any VS
      Code-facing wording that exceeds the cleaned manifest/runtime contract;
      edit canonical command text only when `T030-104` proves drift and treat
      `.claude/commands/` changes as generated outputs, not a second
      hand-maintained truth surface.
- [ ] `T030-402` If `T030-401` proves canonical drift, or if repo-generated node
      outputs are stale against already-correct canonical text, run
      `npm run gofer:generate -- --dry-run` first, then run the real
      `npm run gofer:generate` only for the bounded canonical/refresh change
      set; directly review the resulting node-emitted changes in
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-commands/`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/copilot-prompts/`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.github/prompts/`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.gemini/`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/gofer/`,
      and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/gofer/`.
      When packaged extension resources must pick up refreshed repo surfaces,
      run `./scripts/sync-extension-resources.sh` and verify the expected diffs
      under
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/**`,
      especially
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/claude-agents/`
      and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/resources/gemini/`.
- [ ] `T030-403` After any `.claude/commands/` emission or refresh that should
      fan out through the secondary TypeScript pipeline, run
      `npm run generate-commands -- --dry-run --verbose` to verify the secondary
      TypeScript parity pipeline from
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.claude/commands/`
      remains bounded; if that pipeline must write updated flat outputs, verify
      the resulting change set across
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.github/prompts/`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.agents/skills/`, and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.system/skills/`; verify
      the resulting changes are expected and bounded, then rerun
      `npx vitest run tests/integration/command-generation.test.ts`.
- [ ] `T030-404` Keep
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/scripts/generate-commands.ts`
      and
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/scripts/node/generate-commands.mjs`
      unchanged unless a proven bug blocks truthful output in one of the
      existing pipelines; prefer no-op over generator refactor.
- [ ] `T030-405` Resolve any mirror-surface wording ambiguity discovered during
      `T030-403` by updating canonical command text or user-facing descriptions,
      not by introducing a second hand-maintained truth surface.

**Verification Criteria**

- `npm run gofer:generate -- --dry-run` and
  `npm run generate-commands -- --dry-run --verbose` both produce only expected
  output before and after any generation write; when repo mirror surfaces
  change, `./scripts/sync-extension-resources.sh` produces only expected
  packaged-resource diffs.
- `npx vitest run tests/integration/command-registration.test.ts tests/integration/command-generation.test.ts`
  passes after any Phase 4 change, with `command-registration` remaining the
  primary truth guard and `command-generation` providing only secondary
  repo-generated-surface consistency coverage alongside direct review of the
  node-emitted bundled/scoped outputs in `extension/resources/claude-commands/`,
  `extension/resources/copilot-prompts/`, `extension/resources/claude-agents/`,
  `extension/resources/gemini/`, `.gemini/`, `.agents/skills/gofer/`, and
  `.system/skills/gofer/`.
- Generator complexity remains unchanged; the cleanup uses existing scripts
  only.

### Phase 5 — Regression Guard and Task Handoff

**Goal**: Close the cleanup with machine-verifiable evidence and a task-ready
handoff for `/4_gofer_tasks`.

- [ ] `T030-501` Extend
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-registration.test.ts`
      with bounded manifest-backed documentation/settings-truth assertions only
      if Phases 1-3 expose a real uncovered parity gap, without changing the
      existing command-registration assertions; any added assertion must read
      the manifest schema and compare active documentation, configuration
      examples, or runtime/default consumers against it using the existing
      manifest-read pattern.
- [ ] `T030-502` Run final verification commands: `npm test`,
      `npx vitest run tests/integration/command-registration.test.ts tests/integration/command-generation.test.ts`,
      and
      `cd /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension && npm test`
      when manifest or extension runtime files changed so AT-009 verifies
      activation in a VS Code test host. Record pass/fail evidence for each, and
      explicitly classify any remaining unrelated repo-baseline failures in
      `audit-history.md` before closure.
- [ ] `T030-503` Re-run `npm run gofer:generate -- --dry-run` and
      `npm run generate-commands -- --dry-run --verbose` as the final
      mirror-drift gates and archive the expected output in task/validation
      notes.
- [ ] `T030-504` Finalize
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/audit-history.md`
      statuses, owners, review cadence, accepted exceptions, and closure
      evidence references.
- [ ] `T030-505` Carry the placeholder IDs from this plan into
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/tasks.md`
      and ensure `SC-001` through `SC-009` each have explicit verification
      evidence. Before handoff, explicitly inspect package manifests and any
      touched lockfiles against the phase-start baseline and record no-new-
      dependency evidence for `SC-008` / `AT-010` across
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/package.json`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/package.json`,
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/language-server/package.json`,
      and any touched lockfiles.
- [ ] `T030-506` If Phase 4 reveals an uncovered mirror-scope gap, extend
      `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/tests/integration/command-generation.test.ts`
      with a bounded recursive removed-surface guard across generated and
      packaged mirror trees so regenerated repo mirrors remain within contract
      without introducing new dependencies or a new test framework.

**Verification Criteria**

- Final targeted parity tests pass with no change to the existing declared
  command list expectations.
- Root `npm test` and
  `cd /Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension && npm test`
  results are recorded, and any remaining unrelated baseline failures are
  explicitly classified in `audit-history.md`.
- Any newly added documentation, settings, or mirror-scope truth guard is
  narrow, evidence-based, uses existing test infrastructure, and follows the
  existing manifest-read comparison pattern appropriate to the surface under
  test.
- Success criteria `SC-001` through `SC-009` have explicit closure evidence
  ready for validation.

## File Structure (Planned New / Modified Files)

```text
/Users/douglaswross/Code/eai/eai-tools/eai-gofer
├── .specify/
│   ├── commands/                               # conditional: edit only the specific canonical stage files proven to drift
│   └── specs/
│       └── 030-vscode-surface-truth-cleanup/
│           ├── audit-history.md               # updated stable findings / owners / cadence / exceptions
│           └── plan.md                        # this plan
├── CHANGELOG.md                               # optional if root README guidance changes require repo-level note
├── README.md                                  # likely doc cleanup target
├── docs/
│   ├── API_KEY_SETUP.md                       # active VS Code settings/setup guide
│   ├── agentic-coding/
│   │   └── AGENT_TOOLING_REFERENCE.md         # active command/tooling reference
│   └── guides/
│       ├── configuration.md                   # active settings guide
│       └── session-management.md              # active context-window settings guide
├── extension/
│   ├── CHANGELOG.md                           # primary release-note target for guidance removals/corrections
│   ├── README.md                              # likely doc cleanup target
│   ├── package.json                           # audit baseline; modify only if a public-contract defect is proven
│   ├── resources/
│   │   ├── claude-agents/**                   # conditional bundled sync surface to review after repo mirror refresh
│   │   ├── claude-commands/**                 # conditional bundled outputs to review after canonical regeneration
│   │   ├── copilot-prompts/**                 # conditional bundled outputs to review after canonical regeneration
│   │   └── gemini/**                          # conditional bundled workspace-sync surface to review after canonical regeneration
│   └── src/
│       ├── commands/
│       │   └── specCommands.ts                # confirmed hydrate resource-path fix
│       ├── autonomousCommands.ts              # conditional: only if direct public config reads drift
│       ├── autonomous/**                      # conditional: direct public config-read audit targets across autonomous helpers/responders
│       ├── config.ts                          # confirmed helper-default alignment target
│       ├── config/
│       │   └── workflowProfile.ts             # conditional: direct public config-read audit target
│       ├── council/
│       │   ├── CommandGenerator.ts            # review-only unless generator bug blocks truthful output
│       │   └── providers/
│       │       ├── ProviderFactory.ts         # conditional: direct public config-read audit target
│       │       └── ProviderFactoryCliResolver.ts # conditional: direct public config-read audit target
│       ├── extension.ts                       # conditional: only if direct public config/command reads drift
│       ├── mcpConfig.ts                       # conditional: direct public config-read audit target
│       ├── progressProvider.ts                # conditional: only if downstream command IDs change
│       ├── ui/
│       │   ├── AIUsageStatusBar.ts            # conditional: only if direct public config reads drift
│       │   ├── ContextHealthStatusBar.ts      # conditional: direct public config-read audit target
│       │   └── GoferActivityStatusBar.ts      # conditional: direct public config-read audit target
│       ├── webviewHelpers.ts                  # conditional: only if direct public config reads drift
│       └── services/
│           ├── CommandRegistry.ts             # conditional: only if public runtime registration drift is proven
│           ├── EventHandlers.ts               # conditional: only if direct public config reads drift
│           ├── InitializationService.ts       # conditional: only if direct public config reads drift
│           └── migration/
│               └── ResourceSyncer.ts          # review-only unless rename impact requires a bounded change
├── scripts/
│   └── sync-extension-resources.sh            # execution-only bundled-resource sync path after repo mirror refreshes
├── tests/
│   └── integration/
│       ├── command-generation.test.ts         # existing secondary mirror-regression guard
│       └── command-registration.test.ts       # existing / conditional docs/settings-truth guard
│   └── unit/
│       └── extension/
│           └── Config.test.ts                 # reused config helper/constants unit suite within validation rail
├── .claude/commands/**                        # conditional generated outputs
├── .github/prompts/**                         # conditional generated outputs
├── .gemini/**                                 # conditional generated outputs
├── .agents/skills/**                          # conditional flat generated outputs synced from .system/skills
├── .agents/skills/gofer/**                    # conditional scoped outputs from node generation
├── .system/skills/**                          # conditional flat generated Codex-skill outputs
└── .system/skills/gofer/**                    # conditional scoped outputs from node generation
```

## Risk Assessment

| Risk                                                                                                                                         | Impact | Mitigation                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public, internal, or placeholder commands get misclassified during cleanup, causing accidental expansion or breakage of user-facing scope.   | HIGH   | Complete `T030-102` and `T030-103` before editing docs or runtime, treat placeholder registrations as contract debt rather than doc-worthy support, and make docs follow manifest/runtime truth instead of promoting internal-only commands.                |
| Config helper drift persists because some user-facing settings are read directly from runtime code rather than only through `ConfigManager`. | HIGH   | Use `T030-203` to audit direct `vscode.workspace.getConfiguration('gofer')` reads and use `T030-501` only if a real uncovered parity gap remains.                                                                                                           |
| Resource-path correction for hydrate flow breaks packaged resources or workspace sync behavior.                                              | MEDIUM | Limit the fix to the consumer path first (`T030-201`) and keep `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/extension/src/services/migration/ResourceSyncer.ts` unchanged unless a bounded sync fix is proven necessary (`T030-205`).                  |
| Canonical command or mirror drift returns if canonical sources and generated outputs are edited inconsistently.                              | MEDIUM | Edit `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/commands/*.md` only when required, always use dry-run before generation, and re-run `tests/integration/command-generation.test.ts`.                                                         |
| Cleanup scope expands into generator redesign, new feature work, or unrelated documentation rewrites.                                        | HIGH   | Enforce the reuse-first and minimal-change decisions from `/Users/douglaswross/Code/eai/eai-tools/eai-gofer/.specify/specs/030-vscode-surface-truth-cleanup/reuse-scan.md` and stop for re-planning if generator or product-scope changes appear necessary. |

## Spec Traceability

### User Story Coverage

| User Story                                 | Coverage Status | Plan References                                                                                            |
| ------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------- |
| US-001 — Trustworthy Command Surface       | Covered         | `T030-102`, `T030-103`, `T030-204`, `T030-301`, `T030-303`, `T030-401`, `T030-402`, `T030-501`, `T030-502` |
| US-002 — Trustworthy Configuration Surface | Covered         | `T030-102`, `T030-202`, `T030-203`, `T030-301`, `T030-302`, `T030-303`, `T030-501`, `T030-502`             |
| US-003 — No Dead-End Setup Paths           | Covered         | `T030-301`, `T030-302`, `T030-303`, `T030-304`, `T030-305`                                                 |
| US-004 — Clean Baseline for Future Work    | Covered         | `T030-101`, `T030-104`, `T030-201`, `T030-401`, `T030-402`, `T030-403`                                     |
| US-005 — Machine-Verifiable Surface Truth  | Covered         | `T030-402`, `T030-403`, `T030-501`, `T030-502`, `T030-503`, `T030-505`, `T030-506`                         |

**User story coverage**: `5 / 5`.

### Functional Requirement Coverage

| Functional Requirement | Coverage Status | Plan References                                            |
| ---------------------- | --------------- | ---------------------------------------------------------- |
| FR-001                 | Covered         | `T030-102`, `T030-103`, `T030-301`, `T030-303`             |
| FR-002                 | Covered         | `T030-103`, `T030-204`, `T030-502`                         |
| FR-003                 | Covered         | `T030-301`, `T030-303`, `T030-305`                         |
| FR-004                 | Covered         | `T030-102`, `T030-301`, `T030-303`, `T030-401`, `T030-405` |
| FR-005                 | Covered         | `T030-102`, `T030-202`, `T030-302`                         |
| FR-006                 | Covered         | `T030-202`, `T030-203`, `T030-502`                         |
| FR-007                 | Covered         | `T030-103`, `T030-203`, `T030-302`                         |
| FR-008                 | Covered         | `T030-301`, `T030-302`, `T030-303`, `T030-305`             |
| FR-009                 | Covered         | `T030-304`, `T030-305`                                     |
| FR-010                 | Covered         | `T030-401`, `T030-403`, `T030-506`                         |
| FR-011                 | Covered         | `T030-402`, `T030-403`, `T030-503`                         |
| FR-012                 | Covered         | `T030-201`, `T030-205`, `T030-502`                         |
| FR-013                 | Covered         | `T030-502`                                                 |
| FR-014                 | Covered         | `T030-403`, `T030-502`                                     |
| FR-015                 | Covered         | `T030-501`, `T030-502`                                     |
| FR-016                 | Covered         | `T030-101`                                                 |

**Functional requirement coverage**: `16 / 16`.

### Acceptance Criteria Coverage

| User Story                                 | Acceptance-Criteria Closure Path                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 — Trustworthy Command Surface       | Command-to-doc mapping is closed by `T030-102`, `T030-103`, `T030-301`, and `T030-303`; explicit doc-to-manifest parity coverage is added by `T030-501` when the baseline audit proves an uncovered gap; runtime registration parity and coupled menu/keybinding/view/tree updates are closed by `T030-204` and `T030-502`; broader canonical/mirror cleanup is closed by `T030-401` and `T030-402`; internal-only commands staying undocumented is closed by `T030-103` and `T030-301`.       |
| US-002 — Trustworthy Configuration Surface | Documented setting keys/defaults across `extension/README.md`, `README.md`, and `docs/guides/configuration.md` are closed by `T030-102`, `T030-202`, `T030-301`, `T030-302`, and `T030-303`; explicit docs/settings parity coverage is added by `T030-501` when the baseline audit proves an uncovered gap; helper/runtime alignment is closed by `T030-203`; internal-only setting behavior staying undocumented is closed by `T030-103`, `T030-203`, `T030-301`, `T030-302`, and `T030-303`. |
| US-003 — No Dead-End Setup Paths           | README/setup-path cleanup is closed by `T030-301`, `T030-302`, and `T030-303`; removal notes are closed by `T030-304`; acceptance-test cross-check is closed by `T030-305`.                                                                                                                                                                                                                                                                                                                    |
| US-004 — Clean Baseline for Future Work    | Active-spec inventory is closed by `T030-101`; hydrate resource naming is closed by `T030-201`; generated surface truth is closed by `T030-401`, `T030-402`, and `T030-403`.                                                                                                                                                                                                                                                                                                                   |
| US-005 — Machine-Verifiable Surface Truth  | Existing parity tests and per-regeneration mirror checks are preserved by `T030-403` and `T030-502`; conditional docs/settings parity coverage is handled by `T030-501`; conditional recursive mirror-scope denylist coverage is handled by `T030-506`; final dry-run and sync drift gates are handled by `T030-402` and `T030-503`; success-criteria evidence handoff is handled by `T030-505`.                                                                                               |

### Contract Pack Acceptance Test Coverage

| Acceptance Test                                  | Coverage Path                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| AT-001 — Manifest command-to-documentation check | `T030-102`, `T030-301`, `T030-303`, `T030-305`, `T030-501`, `T030-502`                         |
| AT-002 — Runtime registration parity             | `T030-103`, `T030-204`, `T030-502`                                                             |
| AT-003 — Settings documentation truthfulness     | `T030-102`, `T030-202`, `T030-301`, `T030-302`, `T030-303`, `T030-305`, `T030-501`, `T030-502` |
| AT-004 — Config helper alignment                 | `T030-202`, `T030-203`, `T030-501`, `T030-502`                                                 |
| AT-005 — Generated mirror scope check            | `T030-401`, `T030-402`, `T030-403`, `T030-503`, `T030-506`                                     |
| AT-006 — Resource filename consistency           | `T030-201`, `T030-205`, `T030-502`                                                             |
| AT-007 — Legacy spec archival                    | `T030-101`, `T030-502`                                                                         |
| AT-008 — Stale workflow claim removal            | `T030-301`, `T030-303`, `T030-304`, `T030-305`                                                 |
| AT-009 — Extension activation safety             | `T030-502`                                                                                     |
| AT-010 — No new dependencies                     | `T030-505`                                                                                     |

### Success Criteria Coverage

| Success Criterion                     | Coverage Path                                                          |
| ------------------------------------- | ---------------------------------------------------------------------- |
| SC-001 — Command truthfulness         | `T030-102`, `T030-103`, `T030-301`, `T030-303`, `T030-502`             |
| SC-002 — Configuration truthfulness   | `T030-102`, `T030-202`, `T030-203`, `T030-302`, `T030-502`             |
| SC-003 — Workflow claim removal       | `T030-301`, `T030-303`, `T030-304`, `T030-305`                         |
| SC-004 — Legacy spec retirement       | `T030-101`, `T030-502`                                                 |
| SC-005 — Config helper alignment      | `T030-202`, `T030-203`, `T030-501`, `T030-502`                         |
| SC-006 — Resource naming consistency  | `T030-201`, `T030-205`, `T030-502`                                     |
| SC-007 — Parity test pass rate        | `T030-502`, `T030-503`                                                 |
| SC-008 — New dependency count         | `T030-505`                                                             |
| SC-009 — Baseline stale-claim closure | `T030-104`, `T030-301`, `T030-302`, `T030-303`, `T030-504`, `T030-505` |

### Audit-Finding and Exception Usage

| Audit Item     | Planned Usage                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `VS-TRUTH-001` | Baseline in `T030-104`; closed through `T030-301`, `T030-303`, `T030-304`, and `T030-305`.            |
| `VS-TRUTH-002` | Baseline in `T030-104`; closed through `T030-202`, `T030-203`, `T030-302`, and `T030-501`.            |
| `VS-TRUTH-003` | Baseline in `T030-104`; closed through `T030-401`, `T030-402`, `T030-403`, and `T030-503`.            |
| `VS-TRUTH-004` | Baseline and closure in `T030-101`; status finalized in `T030-504`.                                   |
| `VS-TRUTH-005` | Closed through `T030-201`, `T030-205`, and `T030-502`.                                                |
| `VS-TRUTH-006` | Closed through `T030-202`, `T030-203`, `T030-501`, and `T030-502`.                                    |
| `EX-030-01`    | Established in `T030-105`; carried through `T030-103`, `T030-301`, and `T030-504`.                    |
| `EX-030-02`    | Established in `T030-105`; enforced by the EnterpriseAI metadata section and finalized in `T030-504`. |
