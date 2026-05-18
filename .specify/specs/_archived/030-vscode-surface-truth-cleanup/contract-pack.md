---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
updated: '2026-04-30T22:14:14.406+10:00'
status: complete
profile: EnterpriseAI (maintenance adaptation)
---

# Contract Pack: VS Code Surface Truth Cleanup

> **Profile adaptation notice**: The standard EnterpriseAI contract pack is
> designed for application delivery. This feature is classified as
> **non-application repo maintenance work** (`discovery.md`: Application
> Classification = "Non-application work"). All application-delivery-only
> sections are explicitly marked **N/A** with a reason rather than being left
> empty or omitted. Sections that apply to repo maintenance are adapted
> truthfully. Internal contract IDs (IAP-030-01 through IAP-030-04) are provided
> for plan-stage traceability.

---

## Actors

| Actor                     | Type                      | Scope                                                                                                                                                                                                           | Responsibility                                                                            |
| ------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Gofer maintainer          | Human — internal          | Repository                                                                                                                                                                                                      | Audits runtime truth; performs cleanup edits; approves removals; runs parity tests        |
| VS Code extension user    | Human — external          | VS Code workspace                                                                                                                                                                                               | Consumes commands, settings, and documentation; primary beneficiary of truthful surface   |
| New adopter / evaluator   | Human — external          | VS Code marketplace                                                                                                                                                                                             | First-run experience; most affected by stale setup guidance                               |
| Contributor               | Human — internal/external | Repository                                                                                                                                                                                                      | Copies existing docs and code patterns; at risk of propagating stale claims into new work |
| Release and support owner | Human — internal          | Repository                                                                                                                                                                                                      | Needs machine-verifiable surface truth to prevent drift recurrence                        |
| Extension runtime         | System                    | `extension/src/`                                                                                                                                                                                                | Authoritative source of implemented command and settings behavior                         |
| VS Code manifest          | System                    | `extension/package.json`                                                                                                                                                                                        | Authoritative public contract for contributed commands, settings, menus, and views        |
| Command generator         | System                    | `.specify/scripts/`, `scripts/generate-commands.ts`                                                                                                                                                             | Propagates canonical command descriptions to CLI mirror surfaces                          |
| Generated mirror surfaces | System                    | `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, `extension/resources/claude-agents/`, `extension/resources/claude-commands/`, `extension/resources/copilot-prompts/`, `extension/resources/gemini/` | Downstream consumers of canonical command metadata; must not exceed manifest scope        |
| Workspace syncer          | System                    | `extension/src/services/migration/ResourceSyncer.ts`                                                                                                                                                            | Non-destructively copies bundled resources into user workspaces                           |

---

## Object Types

| Object                        | Role                                                                                                                                                                                                                                                          | Authority Source                                                    | Reuse Decision                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Command contribution          | A user-invokable VS Code command declared in the manifest and registered at runtime                                                                                                                                                                           | `extension/package.json` `contributes.commands`                     | **Reuse** — manifest is the truth surface (reuse-scan.md)               |
| Command registration          | A `vscode.commands.registerCommand` call that wires a contributed command to an implementation                                                                                                                                                                | `extension/src/extension.ts`, `CommandRegistry.ts`, command modules | **Reuse / Extend** — existing wiring is baseline (reuse-scan.md)        |
| Configuration contribution    | A documented setting backed by a manifest property and a runtime read                                                                                                                                                                                         | `extension/package.json` `contributes.configuration`                | **Reuse** — manifest is the settings schema (reuse-scan.md)             |
| Config helper binding         | A typed accessor in `config.ts` that wraps a manifest setting                                                                                                                                                                                                 | `extension/src/config.ts`                                           | **Extend carefully** — has key/default drift (reuse-scan.md)            |
| Canonical command description | A Markdown file in `.specify/commands/` that is the authoring source for generated CLI surfaces                                                                                                                                                               | `.specify/commands/*.md`                                            | **Reuse** — best authoring source (reuse-scan.md)                       |
| Generated mirror artifact     | A derived file in `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, or a packaged copy under `extension/resources/claude-agents/`, `extension/resources/claude-commands/`, `extension/resources/copilot-prompts/`, or `extension/resources/gemini/` | Command generator or sync-script output                             | **Reuse then regenerate** — must not be hand-maintained (reuse-scan.md) |
| Documentation claim           | Any README, marketplace, or in-repo statement about supported commands, settings, or workflows                                                                                                                                                                | `extension/README.md`, `README.md`, `docs/`                         | **Reuse only verified content; trim aggressively** (reuse-scan.md)      |
| Bundled resource file         | A file under `extension/resources/` deployed into user workspaces                                                                                                                                                                                             | `extension/resources/`                                              | **Reuse** — naming must be consistent                                   |
| Legacy spec artifact          | Archived planning material under `.specify/specs/_archived/`                                                                                                                                                                                                  | `.specify/specs/_archived/`                                         | **Archive only** — historical reference, not active scope               |
| Parity test                   | An integration test that compares two truth surfaces (e.g. manifest vs. runtime)                                                                                                                                                                              | `tests/integration/`                                                | **Reuse / Extend** — extend only for verified gaps (reuse-scan.md)      |

---

## Workflows and Journeys

### External View: VS Code User Workflow

The user-facing workflow is the setup and usage experience mediated by VS Code
documentation and the command palette. This is what the cleanup makes truthful.

```
[User reads extension/README.md or docs/guides/configuration.md]
  → Follows setup or command guidance
  → Invokes a command from the VS Code Command Palette
  → Configures a setting in VS Code Settings UI
  → Observes behavior matching the documented description
```

**Post-cleanup invariant**: Every step in this chain must be backed by a
manifest contribution AND a runtime registration. Steps that are not will be
removed from the documentation.

### Internal View: Maintainer Cleanup Workflow

```
[Maintainer reads manifest + runtime source]
  → Identifies contributed commands and settings (truth baseline)
  → Audits documentation surfaces against the baseline
  → Removes or corrects stale claims
  → Aligns config.ts keys/defaults with manifest
  → Corrects resource filename references in code
  → Runs parity tests to verify alignment
  → Archives remaining legacy specs
  → Re-runs generation scripts if canonical sources changed
  → Verifies generated mirrors do not exceed manifest scope
```

### App Journey: N/A

**NOT APPLICABLE** — This feature is classified as non-application repo
maintenance work. No AI-assisted user journey (Discover → Engage → Implement →
Refine) applies. See `discovery.md` Application Classification. Any future
feature delivering new end-user AI workflow functionality to the extension must
define an app journey at that time.

---

## AI Assistance Contract

**NOT APPLICABLE** — This feature does not deliver a new AI-assisted user
experience. The cleanup effort itself is executed by a maintainer (possibly with
Copilot assistance), but there is no user-facing AI assistance contract to
define here.

If future feature work on the extension defines AI-assisted commands (e.g. an
AI-powered command suggestion surface), that feature should define its own AI
assistance contract at specification time.

---

## Permissions and Tenant Boundaries

| Boundary                  | Definition                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                     | This repository only (`/Users/douglaswross/Code/eai/eai-tools/eai-gofer`)                                                                 |
| Tenant model              | N/A — this is a single-repo cleanup, not a multi-tenant application                                                                       |
| Cloud boundary            | N/A — no cloud or production deployment is part of this work                                                                              |
| Access controls           | Standard repository contributor permissions (read/write to source files)                                                                  |
| Archived spec protection  | `.specify/specs/_archived/` content MUST NOT be modified; it is read-only historical reference                                            |
| Internal command boundary | Commands registered in runtime code but not declared in the manifest are internal and MUST NOT be promoted into user-facing documentation |
| Workspace user protection | `ResourceSyncer` sync operations MUST NOT delete user workspace files; non-destructive backup behavior must be preserved                  |

---

## APIs and Events

> **Adaptation note**: The standard EnterpriseAI "APIs and Events" section
> describes REST/GraphQL endpoints, webhooks, and event contracts for an
> application service. This feature has no such interfaces. The relevant "APIs"
> are VS Code extension contribution points and test contract interfaces.

### VS Code Extension Contribution Points (Public Contract)

| Contribution Point | Manifest Key                           | Contract Rule                                                    |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| Commands           | `contributes.commands[]`               | Defines user-invokable commands; only these should be documented |
| Configuration      | `contributes.configuration.properties` | Defines supported settings; only these should be documented      |
| Menus              | `contributes.menus`                    | Menu entries must reference only contributed commands            |
| Keybindings        | `contributes.keybindings`              | Keybindings must reference only contributed commands             |
| Views              | `contributes.views`                    | View contributions must reference implemented view providers     |

### Internal Contract IDs (Plan-Stage Traceability)

| ID         | Interface                       | From                                                         | To                                                                                                                            | Notes                                                              |
| ---------- | ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| IAP-030-01 | Command and doc truth alignment | `extension/README.md`, `README.md`, `docs/`                  | `extension/package.json` `contributes.commands` + runtime registrations                                                       | Core cleanup surface — see FR-001 through FR-004                   |
| IAP-030-02 | Canonical-to-mirror generation  | `.specify/commands/*.md`                                     | Generated repo and packaged mirrors in `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`, and `extension/resources/` | Mirror outputs must not exceed manifest scope — see FR-010, FR-011 |
| IAP-030-03 | Config helper alignment         | `extension/src/config.ts` defaults and keys                  | `extension/package.json` `contributes.configuration`                                                                          | Key/default drift must be resolved — see FR-005 through FR-007     |
| IAP-030-04 | Resource naming consistency     | `extension/src/commands/specCommands.ts` resource references | `extension/resources/` bundled files (underscore convention)                                                                  | Hydrate filename mismatch must be corrected — see FR-012           |

### Events (Internal)

| Event                | Trigger                                               | Consumer                              | Notes                                                                                                                                     |
| -------------------- | ----------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Extension activation | VS Code workspace open                                | `extension.ts` activation handler     | Must complete without error after cleanup                                                                                                 |
| Command registration | Extension activation                                  | `CommandRegistry.ts`, command modules | All manifest contributions must be registered                                                                                             |
| Workspace sync       | Migration check on activation                         | `ResourceSyncer.ts`                   | Must remain non-destructive after any resource rename                                                                                     |
| Parity test run      | Targeted parity suite + recorded broader suite status | CI / maintainer                       | Targeted parity checks must pass after each cleanup phase; broader suite failures must be classified in `audit-history.md` before closure |

---

## Deployment and Runtime

> **Adaptation note**: Standard deployment section covers staging, production,
> and tenant provisioning. This cleanup has no external deployment. The relevant
> runtime considerations are extension packaging and workspace sync.

| Concern                | Detail                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment target      | VS Code Extension (local install, marketplace publish — no change to packaging process)                                                                               |
| Runtime environment    | VS Code host process; extension activates in workspace context                                                                                                        |
| Release mechanism      | Existing `./release-auto.sh` script — MUST be used for any version bump                                                                                               |
| Packaging              | `vsce` — existing process unchanged                                                                                                                                   |
| Workspace side effects | `ResourceSyncer` may copy updated bundled resources to user workspaces on next activation; must remain non-destructive                                                |
| CI gate                | Targeted parity and generator drift gates must pass as part of the build; broader root/extension suite results must be recorded and classified before cleanup closure |
| Rollback               | No special rollback required; changes are text edits to source, docs, and test files under version control                                                            |

---

## Acceptance Tests

These acceptance tests are the machine-verifiable form of the User Story
acceptance criteria. They map directly to spec FRs and can be executed by a
maintainer or CI runner.

| AT ID  | Test Description                        | Passes When                                                                                                                                                                                                                                                                                                                               | Maps To                        |
| ------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| AT-001 | Manifest command-to-documentation check | Every command listed in any VS Code-facing documentation has a matching entry in `extension/package.json` `contributes.commands`                                                                                                                                                                                                          | FR-001, FR-003, US-001         |
| AT-002 | Runtime registration parity             | `tests/integration/command-registration.test.ts` passes without lowering expected command counts                                                                                                                                                                                                                                          | FR-002, FR-013, US-001, US-005 |
| AT-003 | Settings documentation truthfulness     | Every setting name and default listed in active VS Code settings guidance (`docs/guides/configuration.md`, `docs/guides/session-management.md`, `extension/README.md`, and `README.md` configuration examples) has a matching key in `extension/package.json` `contributes.configuration.properties`                                      | FR-005, US-002                 |
| AT-004 | Config helper alignment                 | `extension/src/config.ts` and direct runtime fallback defaults contain no user-facing key values that contradict the manifest default values                                                                                                                                                                                              | FR-006, FR-007, US-002         |
| AT-005 | Generated mirror scope check            | `tests/integration/command-generation.test.ts` passes for repo-regenerated mirrors and packaged `extension/resources/claude-agents/`, `extension/resources/claude-commands/`, `extension/resources/copilot-prompts/`, and `extension/resources/gemini/` copies, including recursive `.gemini` scope and removed-surface denylist coverage | FR-010, FR-014, US-004         |
| AT-006 | Resource filename consistency           | `extension/src/commands/specCommands.ts` references the correct underscore-named bundled file; no `gofer.hydrate.md` vs `gofer_hydrate.md` mismatch                                                                                                                                                                                       | FR-012, US-004                 |
| AT-007 | Legacy spec archival                    | `ls .specify/specs/` shows only `_archived/` and `030-vscode-surface-truth-cleanup/`                                                                                                                                                                                                                                                      | FR-016, US-004                 |
| AT-008 | Stale workflow claim removal            | Manual audit of the active VS Code-facing doc set produces zero references to commands, settings, or workflow steps not present in the current manifest/runtime contract                                                                                                                                                                  | FR-008, US-003                 |
| AT-009 | Extension activation safety             | Extension activates in a test VS Code host without errors after all cleanup changes                                                                                                                                                                                                                                                       | NFR-002                        |
| AT-010 | No new dependencies                     | `git diff` on `package.json`, `extension/package.json`, and lockfiles shows no new external packages                                                                                                                                                                                                                                      | NFR-001, SC-008                |

---

## Reuse Evidence References

Each object type and workflow interface is traceable to the reuse-scan.md
decisions. No create-new decision lacking evidence is present in this spec.

| Object / Interface              | Reuse-Scan Decision                    | Evidence                                                                                                                                | Create-New Risk Flag                                     |
| ------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Command contribution (manifest) | Reuse                                  | `extension/package.json` — VS Code consumes directly                                                                                    | None                                                     |
| Runtime command wiring          | Reuse / Extend                         | `extension/src/extension.ts`, `CommandRegistry.ts` — existing registration baseline                                                     | None                                                     |
| Config helper layer             | Extend carefully                       | `extension/src/config.ts` — partial mirror with drift                                                                                   | Drift must be resolved, not expanded                     |
| Canonical command descriptions  | Reuse                                  | `.specify/commands/*.md` — intended authoring source                                                                                    | None                                                     |
| Generated mirror artifacts      | Reuse then regenerate                  | Existing generation and sync scripts produce these outputs                                                                              | None — regeneration only                                 |
| Non-destructive workspace sync  | Reuse                                  | `ResourceSyncer.ts` — existing safe pattern                                                                                             | None                                                     |
| Documentation content           | Reuse only verified; trim aggressively | `extension/README.md`, `README.md`, `docs/` — highest-risk stale surface                                                                | None — removal direction                                 |
| Regression tests                | Reuse / Extend                         | `tests/integration/command-registration.test.ts`, `tests/integration/command-generation.test.ts`, `tests/unit/extension/Config.test.ts` | Extend only if verified gap found; no new test framework |
| Legacy spec artifacts           | Archive only                           | `.specify/specs/_archived/` — historical reference                                                                                      | None — no new spec created for old work                  |
