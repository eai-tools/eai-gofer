---
id: "030-vscode-surface-truth-cleanup"
title: "VS Code Surface Truth Cleanup"
status: "ready"
created: "2026-04-30T22:14:14.406+10:00"
updated: "2026-04-30"
priority: "medium"
assignee: "engineer-agent"
---

# Feature Specification: VS Code Surface Truth Cleanup

## Overview

The Gofer VS Code extension exposes commands, settings, and workflow guidance
across several surfaces: the extension manifest, runtime source files, generated
mirrors, and user-facing documentation. Over time these surfaces have drifted
apart. Users and maintainers can follow dead-end setup paths, rely on settings
that no longer exist, or invoke commands that are not supported — and nothing
currently prevents the drift from recurring.

This spec defines the outcome of a **truth-alignment cleanup**: a bounded,
non-destructive effort that treats the current VS Code manifest and runtime
wiring as the authoritative product contract, then removes or corrects every
stale claim in documentation, configuration helpers, and generated mirrors.
No new features are invented to rescue old documentation. No new dependencies
are added. Accuracy over breadth.

---

## User Stories

### US-001 — Maintainer: Trustworthy Command Surface (Priority: P1)

As a **Gofer maintainer**, I need every VS Code command described in any
documentation or generated mirror to correspond to an actually-contributed and
registered command, so that I can stop spending time answering questions about
commands that no longer exist or never worked as described.

**Why P1**: Command drift is the most visible trust problem. It affects every
new adopter, every support request, and every future contributor who copies
existing docs. Fixing this first recovers the most trust with the least risk.

**Independent Test**: Can be fully tested by comparing VS Code-facing
documentation against `extension/package.json` `contributes.commands` plus the
command registration source files.

**Acceptance Criteria**:

- [ ] Every command named in the active VS Code-facing documentation set maps to
      a supported command in the public command contract.
- [ ] Every supported command in the public command contract has corresponding
      live runtime registration.
- [ ] If a supported command ID is removed or renamed, every coupled menu,
      keybinding, view action, and tree action reference is updated in the same
      cleanup change.
- [ ] Commands that are internal-only (not contributed to the manifest) do not
      appear in user-facing documentation.
- [ ] Commands that were removed from the manifest are removed or corrected in
      all documentation surfaces.
- [ ] The existing manifest-to-runtime parity test
      (`tests/integration/command-registration.test.ts`) passes after cleanup.

---

### US-002 — Maintainer: Trustworthy Configuration Surface (Priority: P1)

As a **Gofer maintainer**, I need every setting described in configuration
documentation to correspond to a currently contributed configuration key in the
manifest, so that users are not directed to settings that do not exist or no
longer have any effect.

**Why P1**: Configuration drift is as damaging as command drift and harder for
users to diagnose. A user who configures a stale setting gets silent misbehavior.
Aligning the config helper defaults with the manifest removes this silent failure
mode.

**Independent Test**: Can be fully tested by comparing settings listed in
`docs/guides/configuration.md` and `extension/README.md` against
`extension/package.json` `contributes.configuration` and against the key/default
values used in `extension/src/config.ts`.

**Acceptance Criteria**:

- [ ] Every setting documented in `docs/guides/configuration.md` maps to a key
      in `extension/package.json` `contributes.configuration`.
- [ ] Every default value documented in any VS Code-facing material matches the
      default in the manifest or is removed.
- [ ] `extension/src/config.ts` does not expose or default settings keys that
      are absent from `extension/package.json` `contributes.configuration`.
- [ ] Stale setting names (e.g. `gofer.showWelcome`, `gofer.autoValidate`,
      `gofer.claudeTerminalName`, older `gofer.scopeGuard.mode` usage) are
      removed from documentation if not present in the current manifest.
- [ ] User-facing settings helper behavior aligns with the public settings
      contract, and any internal-only keys remain undocumented in user-facing
      material.

---

### US-003 — VS Code Extension User: No Dead-End Setup Paths (Priority: P2)

As a **VS Code extension user**, I need the README and setup documentation to
describe only workflow steps that are currently functional, so that I can
complete initial setup without hitting undocumented dead ends or confusing error
states.

**Why P2**: Real user trust depends on reliable first-run guidance. However,
this story is P2 rather than P1 because it is downstream of the command and
configuration cleanup — once the underlying surfaces are truthful, the docs
story becomes an editing pass rather than a structural repair.

**Independent Test**: Can be tested by reading the active VS Code-facing docs
(`extension/README.md`, `README.md`, `docs/API_KEY_SETUP.md`,
`docs/guides/configuration.md`, `docs/guides/session-management.md`, and
`docs/agentic-coding/AGENT_TOOLING_REFERENCE.md`) end-to-end and checking each
described workflow step against the current manifest and runtime behavior.

**Acceptance Criteria**:

- [ ] `extension/README.md` does not describe workflow steps that require
      commands or settings absent from the current manifest.
- [ ] Any WhatsApp, memory, or similar feature claims in `extension/README.md`
      are verified against the manifest or removed.
- [ ] Setup and onboarding sections describe only behavior implemented in the
      cleaned manifest and runtime for the release that implements this spec.
- [ ] Removed or unsupported workflow guidance is absent from the active
      documentation set, and each removal from active VS Code-facing guidance is
      captured in release or migration notes.

---

### US-004 — Contributor: Clean Baseline for Future Work (Priority: P2)

As a **Gofer contributor**, I need the codebase and docs to accurately reflect
what is currently supported, so that I do not accidentally copy stale claims
into new features or spec work.

**Why P2**: The root-cause analysis identified contributors copying stale
assumptions as a recurring rework driver. Fixing this reduces future drift, but
it is downstream of P1 surface corrections.

**Independent Test**: Can be tested by reading the cleaned docs and confirming
there are no references to legacy spec work or unsupported behavior that could
mislead a contributor starting fresh.

**Acceptance Criteria**:

- [ ] `.specify/specs/` contains no active (non-archived) legacy specs beyond
      the 030 cleanup spec itself.
- [ ] `extension/src/commands/specCommands.ts` references the correct bundled
      resource filename (underscore convention) rather than the legacy
      dot-named reference.
- [ ] Generated CLI mirrors and packaged extension mirror surfaces
      (`.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, and the
      relevant bundled copies under `extension/resources/`) do not advertise
      user-facing behavior outside the current authoritative contract.
- [ ] The generation and bundle-sync steps do not ship command descriptions for
      commands that have been removed from the manifest.

---

### US-005 — Release and Support Owner: Machine-Verifiable Surface Truth (Priority: P3)

As a **release or support owner**, I need the parity between documented behavior
and shipped behavior to be automatically checkable, so that surface drift is
caught before it reaches users rather than after.

**Why P3**: Automated regression resistance is the long-term durability win.
It is P3 because it depends on the P1/P2 cleanup being correct first — running
broken checks on a broken surface adds no value.

**Independent Test**: Can be tested by running the existing and any new
targeted parity tests against the cleaned surfaces and confirming all pass.

**Acceptance Criteria**:

- [ ] The existing `tests/integration/command-registration.test.ts` passes with
      no modifications to its declared command list after the cleanup.
- [ ] The existing `tests/integration/command-generation.test.ts` passes after
      any mirror regeneration.
- [ ] If a documentation/settings parity gap is found during cleanup that cannot
      be covered by existing tests, a small targeted check is added covering
      only that gap.
- [ ] No new test framework or external dependency is introduced; any new checks
      follow the existing manifest-read pattern.

---

### Edge Cases

- If a command is present in the manifest but has no visible UI contribution
  (no menu, keybinding, or palette entry), it should be treated as internal and
  not promoted in user-facing docs.
- If a setting key is read directly from workspace configuration in runtime code
  but is absent from `ConfigManager`, that constitutes undocumented behavior;
  it must either be added to the manifest or treated as internal.
- Archived specs under `.specify/specs/_archived/` must not be modified as part
  of this cleanup; they are historical reference only.
- The `ResourceSyncer` non-destructive sync pattern must be preserved; if any
  bundled resource filename is corrected (e.g. hydrate prompt naming), the sync
  must still back up and not delete existing user workspace files.

---

## Functional Requirements

### Command Surface Alignment

- **FR-001**: The public command contract MUST be the authoritative source for
  which commands are user-facing. Any command outside that contract MUST NOT
  appear in user-facing documentation as a supported command.

- **FR-002**: Every supported command in the public command contract MUST have a
  matching live runtime registration. If a supported command ID is removed or
  renamed, every dependent menu, keybinding, view action, and tree action
  reference MUST be updated in the same cleanup change.

- **FR-003**: The active VS Code-facing documentation set MUST NOT describe
  commands that are absent from the public command contract.

- **FR-004**: Any user-facing command wording drift across supported surfaces
  MUST be resolved in favor of the public command contract wording.

### Configuration Surface Alignment

- **FR-005**: Every user-facing setting key and default value described in the
  active configuration guidance MUST map to an entry in the public settings
  contract.

- **FR-006**: Any settings helper or wrapper used to expose supported settings
  MUST align with the public settings contract for key names and default values.

- **FR-007**: Any settings behavior that is internal-only and not part of the
  public settings contract MUST remain absent from user-facing material.

### Documentation Correctness

- **FR-008**: Workflow steps, onboarding instructions, and feature claims in
  VS Code-facing documentation MUST reflect only behavior that is implemented
  and supported in the current release. Unverifiable claims MUST be removed.

- **FR-009**: When a previously documented command, setting, or workflow is no
  longer supported, the active documentation set MUST be updated in the same
  cleanup change so that no unsupported guidance remains, and each removal from
  active VS Code-facing guidance MUST be captured in release or migration notes.

### Generated and Mirrored Surfaces

- **FR-010**: Generated CLI command surfaces (skills, prompts, mirror artifacts)
  MUST NOT advertise user-facing commands or behaviors that are outside the
  current authoritative contract.

- **FR-011**: If any canonical command description is updated or pruned during
  cleanup, the downstream generation flow MUST be re-run so that all mirror
  outputs reflect the current canonical state.

### Resource Naming Consistency

- **FR-012**: Any resource reference used by a user-invokable command MUST match
  the correctly named bundled resource. Known filename mismatches MUST be
  corrected.

### Parity Testing

- **FR-013**: After cleanup is complete, the manifest-to-runtime parity test
  (`tests/integration/command-registration.test.ts`) MUST pass without changes
  to its expected command list (i.e., the test must pass because the
  implementation is truthful, not because test expectations were lowered).

- **FR-014**: After any mirror regeneration, the command-generation test
  (`tests/integration/command-generation.test.ts`) MUST pass.

- **FR-015**: If a verifiable gap in documentation/settings parity is found that
  existing tests do not cover, a targeted parity check MUST be added following
  the pattern established in `tests/integration/command-registration.test.ts`,
  reading the manifest schema and comparing active documentation, configuration
  examples, or runtime/default consumers against it.

### Legacy Spec Handling

- **FR-016**: Any remaining active (non-archived) specs under
  `.specify/specs/` other than the 030 cleanup spec MUST be moved to
  `.specify/specs/_archived/`. Their content MUST NOT be altered; they are
  preserved for historical reference.

---

## Non-Functional Requirements

- **NFR-001 — No New Dependencies**: The cleanup MUST NOT introduce new external
  packages, tools, or runtime dependencies. All verification and generation work
  MUST use existing repo infrastructure.

- **NFR-002 — Extension Activation Safety**: Changes to `extension/package.json`
  MUST preserve a valid VS Code extension contribution format. The extension MUST
  activate without error after cleanup.

- **NFR-003 — Non-Destructive Sync**: Any change to bundled resources (e.g.
  correcting a resource filename) MUST preserve the non-destructive sync
  behavior of `extension/src/services/migration/ResourceSyncer.ts`. Existing
  user workspace files MUST NOT be deleted by a sync after cleanup.

- **NFR-004 — Internal Command Boundary**: Runtime-only internal commands MUST
  NOT be promoted into the public manifest or user-facing docs as a side-effect
  of this cleanup. The cleanup direction is reduction, not expansion.

- **NFR-005 — Brownfield Registration Safety**: Changes to command
  registrations MUST account for the split registration pattern across
  the extension activation, registry, and command-module layers. Removing or
  renaming a supported command without updating its coupled menu, keybinding,
  view action, and tree action references MUST be treated as a defect.

- **NFR-006 — Documentation Clarity**: After cleanup, active user-facing
  documentation MUST present one current supported path for each command,
  setting, or workflow it describes. Unsupported guidance MUST NOT be preserved
  for historical completeness inside active docs.

- **NFR-007 — Historical Integrity**: Archived specs under `_archived/` MUST
  remain unmodified. They are historical reference, not active planning
  material.

- **NFR-008 — Generator Complexity Ceiling**: The cleanup MUST NOT expand or
  refactor the command-generation pipeline (TypeScript and Node paths). If
  generator outputs need updating, re-run existing scripts; do not rewrite them.

- **NFR-009 — Regression Resistance**: Parity tests MUST pass after every
  change phase. A cleanup pass that introduces a new registration gap or
  undocumented command is itself a defect.

---

## Success Criteria

| ID | Criterion | Baseline | Target | Measurement |
|----|-----------|----------|--------|-------------|
| SC-001 | Command truthfulness | Unknown/drifted | 100% of documented commands map to a contributed and registered command | Compare docs command list against `contributes.commands` and runtime source |
| SC-002 | Configuration truthfulness | Unknown/drifted | 100% of documented settings map to a `contributes.configuration` entry | Compare docs settings list against manifest schema |
| SC-003 | Workflow claim removal | Unknown number of stale claims | 0 unsupported workflow or setup claims in VS Code-facing docs | Manual audit of the active VS Code-facing doc set (`extension/README.md`, `README.md`, `docs/API_KEY_SETUP.md`, `docs/guides/configuration.md`, `docs/guides/session-management.md`, `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md`) |
| SC-004 | Legacy spec retirement | ≥3 active legacy specs | 0 active non-cleanup specs at top level of `.specify/specs/` | Inspect directory listing |
| SC-005 | Config helper alignment | Keys/defaults diverge between `config.ts` and manifest | 0 user-facing config keys in `config.ts` that contradict or exceed manifest | Cross-reference `config.ts` keys against manifest schema |
| SC-006 | Resource naming consistency | `specCommands.ts` uses incorrect filename | 0 resource filename mismatches between code and bundled files | Code review of `specCommands.ts` against `resources/` directory |
| SC-007 | Parity test pass rate | Tests may have unexplored gaps | 100% pass on targeted `command-registration` and `command-generation` parity tests after cleanup | Targeted parity suite runs with no test expectation reductions; broader root/extension suite status is recorded separately in `audit-history.md` |
| SC-008 | New dependency count | 0 | 0 | Package manifest diff |
| SC-009 | Baseline stale-claim closure | Initial research identified stale claims across commands, settings, and workflows | 0 unresolved stale claims remain in the final audit of those baseline categories | Compare the research baseline audit categories against the final cleaned surfaces |

---

## Delivery Continuation Note

The approved proposal review for this feature authorizes direct continuation
through planning, task breakdown, implementation, and validation once this spec
is complete. No additional research approval gate remains for this cleanup
scope.

---

## Assumptions

| ID | Assumption | Source | Status |
|----|------------|--------|--------|
| A-001 | `extension/package.json` plus live runtime registration code are the closest available truth source for public VS Code behavior | proposal-review.md, research.md | Accepted by maintainer |
| A-002 | Users rely on `extension/README.md` and VS Code-facing documentation during setup and evaluation | problem-brief.md, discovery.md | Accepted by maintainer |
| A-003 | Most cleanup value can be captured by removal and correction rather than new capability work | proposal-review.md | Accepted by maintainer |
| A-004 | Archived legacy specs should no longer influence active product claims | reuse-scan.md, context-bundle.md | Accepted by maintainer |
| A-005 | The existing parity test pattern in `command-registration.test.ts` is the correct style for any new targeted checks | research.md Pattern 1 | Inferred from research |
| A-006 | Runtime-only internal commands are intentionally undocumented and should remain so | research.md Decision 1 | Locked from proposal |
| A-007 | The WhatsApp and memory command references in `extension/README.md` are not present in the current manifest and should be removed | research.md Related Code | Inferred from research; verify during implementation |
| A-008 | The approved cleanup path continues directly into planning, implementation, and validation without reopening the research gate | proposal-review.md User Feedback and Overrides | Accepted by maintainer |

---

## Dependencies

| ID | Dependency | Type | Risk |
|----|------------|------|------|
| D-001 | `extension/package.json` manifest is stable during cleanup | Internal | Low — no parallel feature work on manifest expected |
| D-002 | Existing parity tests (`command-registration.test.ts`, `command-generation.test.ts`) must be green at the start | Internal | Medium — verify baseline before cleanup |
| D-003 | `.specify/commands/` canonical sources must reflect current intent before mirror regeneration | Internal | Low — canonical sources are under maintainer control |
| D-004 | `ResourceSyncer` workspace sync behavior must be understood before any bundled filename change | Internal | Medium — non-destructive behavior must be verified |
| D-005 | `extension/src/progressProvider.ts` invokes `gofer.showTaskDetails`; that command must remain supported or the invocation must be updated as part of the cleanup | Internal | Medium — progress-view behavior can silently break if the command is removed or renamed |

---

## Out of Scope

- Inventing new commands, settings, or workflows to make old documentation true again
- Full refactor or unification of the TypeScript and Node command-generation pipelines
- New external documentation platforms, tooling vendors, or runtime dependencies
- Tenant-specific, cloud, or production deployment changes
- Changes to archived spec content under `.specify/specs/_archived/`
- Competitive positioning or marketing copy changes beyond removing stale claims
- Any EnterpriseAI application workflow delivery (this is non-application cleanup work)

---

## Glossary

| Term | Definition |
|------|------------|
| Manifest | `extension/package.json`; the file VS Code reads to determine contributed commands, settings, menus, views, and keybindings |
| Runtime wiring | The TypeScript source files (`extension.ts`, `CommandRegistry.ts`, command modules) that register contributed commands at activation time |
| Config helper layer | `extension/src/config.ts`; typed accessor wrappers around VS Code workspace configuration |
| Canonical command source | `.specify/commands/*.md` files; the intended authoring source from which generated CLI mirror artifacts are derived |
| Generated mirrors | Derived artifacts in `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, and packaged `extension/resources/` copies that propagate command metadata to AI CLI surfaces |
| Parity test | An integration test that verifies agreement between two surfaces (e.g. manifest contributions vs. runtime registrations) |
| Truth drift | The state where two or more surfaces describing the same behavior have diverged and can no longer be trusted as a consistent contract |
| Non-destructive sync | The `ResourceSyncer` behavior that backs up and replaces workspace resources without deleting user files |
| Internal command | A `vscode.commands.registerCommand` registration that is NOT declared in `extension/package.json` `contributes.commands` and is therefore not user-invokable from the Command Palette |
| Stale claim | Any documented statement about a command, setting, or workflow that cannot be verified against the current manifest and runtime |

---

## Research Traceability

| Research Finding / Decision / Constraint | Source Document | Spec Section(s) |
|------------------------------------------|-----------------|-----------------|
| VS Code manifest + runtime are the authoritative product contract | research.md Decision 1, proposal-review.md | FR-001, FR-002, A-001, NFR-005 |
| Cleanup strategy: correct/remove stale claims rather than invent features | research.md Decision 2, proposal-review.md | FR-008, FR-009, NFR-006, Out of Scope |
| No new dependencies | research.md Decision 3, proposal-review.md | NFR-001, FR-015, SC-008 |
| Integration Point 1: Manifest ↔ runtime command wiring | research.md Integration Points §1 | FR-001, FR-002, FR-013, US-001, IAP-030-01 |
| Integration Point 2: Manifest ↔ config helper layer | research.md Integration Points §2 | FR-005, FR-006, FR-007, US-002, IAP-030-03 |
| Integration Point 3: Canonical command docs ↔ generated mirrors | research.md Integration Points §3 | FR-010, FR-011, US-004, IAP-030-02 |
| Integration Point 4: Docs ↔ implementation contract | research.md Integration Points §4 | FR-003, FR-004, FR-008, US-003, IAP-030-01 |
| Constraint: manifest contract drives multiple UI surfaces | research.md Brownfield §Manifest contract | NFR-002, NFR-005 |
| Constraint: split registration across multiple files | research.md Brownfield §Split registration | NFR-005, FR-002 |
| Constraint: generator duplication (TS + Node paths) | research.md Brownfield §Generator duplication | NFR-008, FR-011 |
| Constraint: workspace sync must remain non-destructive | research.md Brownfield §Workspace sync | NFR-003, FR-012 |
| Extra caution: command IDs are string-coupled to menus, keybindings, views, and tree actions | research.md Brownfield §Areas Requiring Extra Caution | US-001, FR-002, NFR-005 |
| Drift signal: `extension/README.md` WhatsApp/memory commands | research.md Related Code | A-007, FR-003, US-003 |
| Drift signal: `docs/guides/configuration.md` stale settings | research.md Related Code | FR-005, US-002 |
| Drift signal: `config.ts` defaults diverge from manifest | research.md Related Code | FR-006, SC-005 |
| Drift signal: `specCommands.ts` hydrate resource naming mismatch | research.md Related Code | FR-012, SC-006 |
| Reuse decision: manifest as settings contract | reuse-scan.md | FR-005, A-001 |
| Reuse decision: non-destructive sync pattern | reuse-scan.md | NFR-003 |
| Reuse decision: existing parity test pattern | research.md Pattern 1, reuse-scan.md | FR-013, FR-015, US-005 |
| Legacy spec archival | reuse-scan.md, context-bundle.md | FR-016, SC-004, A-004 |
| Downstream dependency: `progressProvider.ts` invokes `gofer.showTaskDetails` | research.md Downstream Dependencies | D-005 |
| Stakeholder impact: 125–450 avoidable hours/year | problem-brief.md, business-analysis.md | Overview, SC-009 |
| Build custom (no external tooling needed) | market-analysis.md | NFR-001 |
| Problem root cause: governance/source-of-truth drift | problem-brief.md 5 Whys | Overview, Assumptions |
| Non-application classification | discovery.md, context-bundle.md | AI-Augmented Journey section |
| User override: continue through implementation and validation without pausing after research | proposal-review.md User Feedback and Overrides | Delivery Continuation Note, A-008 |

---

## AI-Augmented 4-Step Journey

**NOT APPLICABLE**

This feature is explicitly classified as **non-application work** (see
`discovery.md` Application Classification: "Non-application work"). It is a
repository cleanup and surface-alignment effort, not a user-facing AI
application workflow delivery. No Discover → Engage → Implement → Refine user
journey applies.

Any future feature that adds new end-user AI-assisted functionality to the Gofer
VS Code extension should define a full 4-step journey at that time.

---

## EnterpriseAI Contract Pack Summary

This spec is authored under the **EnterpriseAI profile** as required by the
Gofer pipeline, but the work it describes is repo-maintenance cleanup, not
application delivery. The contract pack therefore uses explicit `N/A` markers
for application-delivery-only sections and adapts the standard framework to the
maintenance context.

See `contract-pack.md` in this feature directory for the full contract pack with
reuse evidence, actor definitions, object types, internal contract IDs
(IAP-030-01 through IAP-030-04), and acceptance test cases.

---

## Explicit Integration Map

> **Profile adaptation notice**: The standard EnterpriseAI integration map
> describes a vertical product chain: user-facing surface → AI assistance
> contract → backend services → tenant/deployment target. This feature is
> non-application repo maintenance. The map below adapts the ordered chain
> concept truthfully to the maintenance context: maintenance surfaces → repo
> truth services → repo/distribution targets. Internal contract IDs follow the
> IAP-030-xx convention for plan-stage traceability.

| ID | Maintenance Surface (Input) | Repo Truth Services (Authority) | Repo / Distribution Target (Output) |
|----|----------------------------|---------------------------------|--------------------------------------|
| IAP-030-01 | `extension/README.md`, `README.md`, `docs/API_KEY_SETUP.md`, `docs/guides/configuration.md`, `docs/guides/session-management.md`, `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md` (user-facing doc claims) | `extension/package.json` `contributes.commands` + runtime registration source files | VS Code extension marketplace listing; installed extension command palette |
| IAP-030-02 | `.specify/commands/*.md` canonical command descriptions | Generation scripts (`scripts/generate-commands.ts`, `.specify/scripts/node/generate-commands.mjs`) plus packaged-resource sync via `scripts/sync-extension-resources.sh` | Generated CLI and packaged extension mirror surfaces in `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, and `extension/resources/` |
| IAP-030-03 | `extension/src/config.ts` helper defaults and key names | `extension/package.json` `contributes.configuration.properties` | VS Code Settings UI; runtime config reads in extension services |
| IAP-030-04 | `extension/src/commands/specCommands.ts` resource references | Bundled resource filesystem under `resources/` (underscore naming convention) | Loaded prompt/skill files at command invocation time in user workspaces |

**Chain invariant**: For every interface in this map, the authoritative
service column defines truth. The maintenance surface must be aligned downward
to the authority, not the other way around. Any mismatch found during
implementation is a defect, not a documentation style choice.
