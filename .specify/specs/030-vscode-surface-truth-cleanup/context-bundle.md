---
feature: '030-vscode-surface-truth-cleanup'
created: '2026-04-30T19:40:36.174+10:00'
status: draft
---

# Context Bundle: VS Code Surface Truth Cleanup

## Selected Scenario

- **Workflow Profile**: EnterpriseAI
- **Scenario**: Modify Existing
- **Application Classification**: Non-application work

## Compact Feature Context

This effort exists to make the VS Code extension surface truthful again.
Commands, settings, documentation, and generated mirrors should describe only
behavior that is implemented, wired, and intentionally supported in the current
repo.

## Cleanup Objective

Archive the remaining active specs, then audit and clean the VS Code-facing
surface so stale commands, stale configuration, and stale documentation claims
are removed or corrected.

## In Scope

- VS Code-facing documentation and marketplace/readme content
- Command palette command descriptions and related docs
- User-facing configuration/settings documentation and related wiring
- Gofer workflow claims that appear in VS Code surfaces but are no longer true
- Generator-emitted or mirrored content that amplifies stale VS Code claims

## Out of Scope

- New end-user workflow invention
- New platform integrations added only to preserve old claims
- Unrelated product roadmap expansion

## Application / Platform Assumptions

- This is repo-local cleanup, not tenant-specific application delivery
- No new deployment target is required for this stage
- No four-step AI journey applies because this is non-application work
- Existing repo artifacts remain the source of truth unless proven stale

## Affected Surfaces To Audit

- `extension/package.json`
- `extension/src/extension.ts`
- `extension/src/services/CommandRegistry.ts`
- `extension/src/config.ts`
- `extension/src/commands/specCommands.ts`
- `extension/src/services/migration/ResourceSyncer.ts`
- `.specify/commands/`
- Generated command/prompt/skill surfaces derived from canonical commands
- `extension/README.md`, `README.md`, and `docs/guides/configuration.md`

## What The Next Agent Needs

### Strongest Current Truth Sources

1. **Manifest contract**: `extension/package.json`
2. **Runtime behavior**:
   `extension/src/extension.ts`,
   `extension/src/services/CommandRegistry.ts`,
   `extension/src/commands/*`
3. **Workspace mirror sync**:
   `extension/src/services/migration/ResourceSyncer.ts`
4. **Canonical command authoring**: `.specify/commands/*.md`

### Known Drift Signals

- `extension/README.md` documents commands and settings that do not line up with
  the current manifest
- `docs/guides/configuration.md` still lists settings and option values that
  need verification against the manifest
- `extension/src/config.ts` contains keys/defaults that diverge from
  `extension/package.json`
- `extension/src/commands/specCommands.ts` uses a hydrate prompt filename that
  does not match the bundled underscore naming convention

## Validation Criteria

1. Archived work is preserved under `.specify/specs/_archived/`.
2. One active cleanup spec owns the remediation scope.
3. Commands described in VS Code-facing docs map to contributed and supported
   behavior.
4. Settings described in docs map to contributed settings and real usage.
5. Unsupported or unverifiable claims are removed rather than restated.
