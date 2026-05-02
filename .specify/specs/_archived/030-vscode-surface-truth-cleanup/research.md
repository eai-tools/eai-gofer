---
date: 2026-04-30T22:14:14.406+10:00
researcher: Copilot
feature: '030-vscode-surface-truth-cleanup'
status: complete
competitiveAnalysisEnabled: true
---

# Research: 030-vscode-surface-truth-cleanup

## Feature Summary

This work audits the Gofer VS Code extension surface and removes or corrects
claims that no longer match the current implementation. The target is a smaller,
truthful command/configuration/documentation surface that reflects what the
extension and its generated mirrors actually support today.

## Structured Discovery Output

### Problem Statement

- **Problem**: VS Code-facing Gofer commands, settings, and workflow guidance no
  longer reliably match current behavior.
- **Current State Friction**: Maintainers and users can follow dead-end setup
  paths, rely on stale settings, or repeat old workflow claims from duplicated
  docs and mirrored command surfaces.
- **Desired EnterpriseAI Outcome**: A repo-owned, evidence-based cleanup that
  keeps Gofer's VS Code surface truthful without inventing new features to
  rescue stale documentation.

### Target Persona

- **Primary Persona**: Gofer maintainer and VS Code extension user
- **Skill Level**: Mixed; maintainers are technical, users may be novice to
  intermediate
- **Top Needs**: Trustworthy commands, accurate settings guidance, clear
  workflow messaging
- **Constraints**: The repo already has multiple truth surfaces, archived specs
  must remain historical only, and the cleanup should favor removal/correction
  over new capability work

### Value Proposition

- **Primary Value**: Restore trust in the VS Code extension surface
- **Measurable Goal**: Ensure documented commands/settings/workflows map to
  currently supported behavior or are removed
- **EnterpriseAI-First Rationale**: EnterpriseAI is the default profile, but
  this effort is non-application repo cleanup; accuracy of the extension surface
  is a prerequisite for any credible EnterpriseAI workflow story

## Context Bundle Summary

- **Relevant Specs**:
  - `.specify/specs/030-vscode-surface-truth-cleanup/`
  - `.specify/specs/_archived/001-cli-innovations-visuals/`
  - `.specify/specs/_archived/029-enterpriseai-student-vertical-builder/`
- **Relevant Code Paths**:
  - `extension/package.json` - VS Code commands, menus, views, and settings
  - `extension/src/extension.ts` - activation and global command registration
  - `extension/src/services/CommandRegistry.ts` - workspace command wiring
  - `extension/src/config.ts` - partial config mirror and defaults
  - `extension/src/commands/specCommands.ts` - spec execution and hydrate prompt
    wiring
  - `extension/src/services/migration/ResourceSyncer.ts` - workspace mirror sync
  - `scripts/generate-commands.ts` and
    `.specify/scripts/node/generate-commands.mjs` - command/mirror generation
  - `extension/README.md`, `README.md`, `docs/guides/configuration.md` -
    highest-risk truth surfaces
  - `tests/integration/command-registration.test.ts` and
    `tests/integration/command-generation.test.ts` - existing parity tests
- **EnterpriseAI Object Types**: No new EnterpriseAI object type is needed; the
  relevant repo objects are the manifest contract, runtime command wiring,
  generated mirrors, and user-facing docs
- **Tenant and Deployment Assumptions**: Repo-local cleanup only; no tenant or
  production deployment change required; workspace sync continues to populate
  `.claude/`, `.github/`, `.gemini/`, `.system/`, and `.agents/` mirrors
- **Validation Criteria**:
  - documented commands match contributed and supported commands
  - documented settings match contributed settings and actual usage
  - stale workflow/setup claims are removed from VS Code-facing docs
  - archived specs stay archived and are not treated as active scope

## Reuse-Before-Create Scan

| Candidate | Existing Evidence | Decision | Rationale | Owner |
| --------- | ----------------- | -------- | --------- | ----- |
| VS Code command contract | `extension/package.json` | Reuse | VS Code consumes this manifest directly; docs must follow it | Extension |
| Runtime command wiring | `extension/src/extension.ts`, `extension/src/services/CommandRegistry.ts`, `extension/src/commands/*` | Reuse / Extend | Existing wiring is the runtime baseline; cleanup should reconcile and prune, not replace | Extension |
| Settings contract | `extension/package.json` | Reuse | Manifest is the authoritative settings schema | Extension |
| Settings helpers | `extension/src/config.ts` | Extend | Partial mirror exists, but defaults and keys have drifted; align or trim it | Extension |
| Command-generation source | `.specify/commands/*.md` | Reuse | Intended canonical authoring source for generated command surfaces | Gofer pipeline |
| Workspace mirror sync | `extension/src/services/migration/ResourceSyncer.ts` | Reuse | Existing non-destructive sync behavior should remain the migration pattern | Extension |
| Docs and marketplace copy | `extension/README.md`, `README.md`, `docs/` | Extend / Trim | Reuse only verified content and remove stale claims aggressively | Docs |
| New validation system | None | Defer new creation | Existing tests already cover command parity; add small targeted checks only if needed | Shared |

## Business Scenario Analysis

### Scenario Options Considered

| Scenario | User/Business Fit | Delivery Trade-off | Recommendation |
| -------- | ----------------- | ------------------ | -------------- |
| Docs-only cleanup | Fastest visible improvement | Leaves manifest/runtime/config drift unresolved and allows stale claims to return | Defer |
| Truth-alignment cleanup across manifest, runtime, docs, and tests | Best fit for the root cause | Slightly broader change set, but addresses the real drift lifecycle | Adopt |
| Generator-first refactor of all command surfaces | Could simplify long-term maintenance | Too risky and too large for the current cleanup goal | Defer |

### Recommended Scenario

Proceed with a **truth-alignment cleanup** that treats the VS Code manifest and
runtime wiring as the current product contract, then trims documentation and
generated mirrors to match. Add only the smallest necessary parity hardening if
research shows an existing gap that would otherwise reintroduce drift.

## Codebase Analysis

### Where to Implement

| Component | Location | Purpose |
| --------- | -------- | ------- |
| Command and settings contract | `extension/package.json` | Declares user-facing commands, views, menus, keybindings, and configuration |
| Activation and global command wiring | `extension/src/extension.ts` | Registers early commands and initializes extension services |
| Workspace command wiring | `extension/src/services/CommandRegistry.ts` | Registers most workspace-bound commands and migration actions |
| Config helper layer | `extension/src/config.ts` | Mirrors some settings and defaults for runtime consumption |
| Hydrate-spec command | `extension/src/commands/specCommands.ts` | Demonstrates naming drift between registered behavior and packaged resources |
| Workspace mirror sync | `extension/src/services/migration/ResourceSyncer.ts` | Copies bundled resources into workspace surfaces |
| User-facing docs | `extension/README.md`, `README.md`, `docs/guides/configuration.md` | Highest-risk documentation surfaces |
| Existing parity tests | `tests/integration/command-registration.test.ts`, `tests/integration/command-generation.test.ts` | Existing evidence checks for surface truth |

### Existing Patterns to Follow

#### Pattern 1: Manifest-to-runtime parity tests

Found in: `tests/integration/command-registration.test.ts`

```typescript
const declaredCommands = packageJson.contributes.commands.map((cmd) => cmd.command);
for (const command of declaredCommands) {
  const registrationPattern = new RegExp(
    `vscode\\.commands\\.registerCommand\\s*\\(\\s*['"]${command.replace('.', '\\.')}['"]`
  );
  if (!registrationPattern.test(allCommandSources)) missingCommands.push(command);
}
```

Why relevant: the repo already tests command declaration vs registration. The
cleanup should reuse this style and extend it where settings or docs need the
same truth check.

#### Pattern 2: Non-destructive migration and sync

Found in:
`extension/src/services/migration/ResourceSyncer.ts`,
`extension/src/services/migration/PathMigrator.ts`

```typescript
// Migration safety: audit deprecated prompts but do not delete user files.
await this.cleanupOldCopilotPrompts(promptsDir, false);
```

Why relevant: if any packaged mirrors or workspace resources are updated, the
existing repo pattern is to back up, sync, and avoid destructive cleanup.

#### Pattern 3: Typed config access over raw strings

Found in: `extension/src/config.ts`

```typescript
public getDefaultCLI(): 'claude' | 'copilot' | 'codex' | 'gemini' | 'auto' {
  return this.config.get<'claude' | 'copilot' | 'codex' | 'gemini' | 'auto'>(
    'defaultCLI',
    DEFAULTS.defaultCLI
  );
}
```

Why relevant: user-facing settings should be described once in the manifest and,
where needed, exposed through typed helpers rather than duplicated defaults that
can drift.

### Integration Points

1. **Manifest ↔ runtime command wiring**: `extension/package.json` must match
   registrations in `extension/src/extension.ts`,
   `extension/src/services/CommandRegistry.ts`, and command modules.
2. **Manifest ↔ config helper layer**: `extension/package.json` settings must
   match keys/defaults used in `extension/src/config.ts` and direct consumers.
3. **Canonical command docs ↔ generated mirrors**: `.specify/commands/` and
   generation scripts drive bundled mirrors that later land in workspace CLI
   surfaces.
4. **Docs ↔ implementation contract**: `extension/README.md`, `README.md`, and
   `docs/guides/configuration.md` must be trimmed to the actual manifest/runtime
   surface.

### Related Code

- `extension/README.md` - documents WhatsApp and memory commands not clearly
  present in the contributed command list
- `docs/guides/configuration.md` - still lists settings such as
  `gofer.showWelcome`, `gofer.autoValidate`, and `gofer.claudeTerminalName`,
  and older `gofer.scopeGuard.mode` guidance
- `extension/src/config.ts` - contains defaults like `preferredAi: 'claude'` and
  `yoloSlopReductionEnabled: true` that differ from the manifest
- `extension/src/commands/specCommands.ts` - tries to load
  `resources/claude-commands/gofer.hydrate.md`, which does not match the
  underscore-named bundled file convention

## Technology Decisions

### Decision 1: Source of truth for user-facing VS Code behavior

- **Choice**: Use `extension/package.json` plus live registration code as the
  authoritative current contract
- **Rationale**: This is the surface VS Code consumes; user-facing docs should
  follow the shipped contract rather than historical narratives
- **Alternatives considered**: Trust docs first; trust config helpers first

### Decision 2: Cleanup strategy

- **Choice**: Correct or remove stale claims instead of building features to make
  old docs true again
- **Rationale**: The problem brief identified trust drift, not missing product
  ambition; truthfulness is the faster and safer fix
- **Alternatives considered**: Re-implement old features purely to preserve docs

### Decision 3: Dependency strategy

- **Choice**: Avoid new dependencies
- **Rationale**: Existing tests, manifests, and generators are sufficient for
  this cleanup
- **Alternatives considered**: Add external docs tooling before fixing core
  drift

## Recommended Architecture Direction

### Recommended Architecture

Use a **manifest-and-runtime truth alignment** pass:

1. verify what the extension actually contributes and registers
2. trim or fix runtime/config mismatches
3. remove or correct stale documentation and generated claims
4. keep or extend parity checks so the cleaned surface stays honest

### Architecture Options Considered

| Option | Why choose it | Why not choose it now |
| ------ | ------------- | --------------------- |
| Docs-only cleanup | Fastest path to shorter docs | Does not solve the root-cause drift between manifest/runtime/docs |
| Manifest + runtime + docs + tests cleanup | Solves the real trust problem with bounded changes | Slightly broader scope |
| Full generator architecture refactor | Could reduce future duplication further | Too large for the current remediation |

## Constraints & Considerations

- `extension/package.json` is large and drives commands, views, menus, and
  configuration; changes here can affect multiple UI surfaces.
- Command registration is intentionally split across several files and depends on
  activation order.
- Some runtime commands may be internal and should remain undocumented rather
  than being promoted into the public command list.
- Workspace mirror sync is designed to be non-destructive.
- Docs currently duplicate the same claims in several places; shorter, clearer
  docs are safer than trying to keep every long-form explanation in sync.

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact on Implementation |
| --------------- | ----------- | ------------------------ |
| Manifest contract | VS Code uses `extension/package.json` directly | Command/settings cleanup must preserve valid extension contributions |
| Split registration | Commands are registered in `extension.ts`, `CommandRegistry`, and command/UI modules | Cleanup must trace all registration points before removing claims |
| Generator duplication | The repo has both TypeScript and Node command-generation paths | Avoid expanding generator complexity during this cleanup |
| Workspace sync | `ResourceSyncer` copies bundled resources into user workspaces | Mirror cleanup should preserve non-destructive sync behavior |

### Technical Debt to Avoid

| Pattern | Found In | Why Avoid | Use Instead |
| ------- | -------- | --------- | ---------- |
| Hand-maintained docs that invent settings | `extension/README.md`, `docs/guides/configuration.md` | They drift from the manifest quickly | Treat the manifest as the settings contract |
| Duplicated defaults across helper and manifest | `extension/src/config.ts` | Creates contradictory runtime guidance | Align helper defaults with manifest or remove the helper key |
| Second canonical source for generated commands | `.claude/commands/` plus `.specify/commands/` | Makes truth ownership unclear | Reuse existing canonical surfaces; do not add more |

### Areas Requiring Extra Caution

- **Command IDs**: Menu items, keybindings, and tree views are string-coupled to
  command identifiers.
- **Hydrate prompt resource naming**: `gofer.hydrate.md` vs `gofer_hydrate.md`
  suggests existing naming drift that could break user-visible flows.
- **Settings cleanup**: Some settings may still be read directly from workspace
  configuration even if they are not mirrored in `ConfigManager`.

### Integration Requirements

| Existing Service | Integration Method | Notes |
| ---------------- | ------------------ | ----- |
| VS Code extension manifest | JSON contribution contract | Must stay valid and user-facing |
| Extension runtime | TypeScript registration and config reads | Source of behavior truth |
| Command generators | Scripted artifact generation | Should reflect canonical command content, not override runtime truth |
| Documentation set | Markdown | Must be pruned to match the supported contract |

### Downstream Dependencies

- `tests/integration/command-registration.test.ts` - expects contributed
  commands to be registered in known source files
- `tests/integration/command-generation.test.ts` - expects generated surfaces to
  stay in sync
- `extension/src/progressProvider.ts` - invokes `gofer.showTaskDetails`
- onboarding and migration flows in `extension/src/extension.ts` and
  `extension/src/services/migration/*` depend on current command and resource
  layouts

## Visuals

- `visuals/c4-context.md`
- `visuals/capability-heatmap.md`

## Open Questions

- [ ] None blocking. The default path is to favor truthfulness over feature
      preservation and keep internal-only commands undocumented unless the
      implementation requires otherwise.

## Recommendations

1. Implement the cleanup as a manifest/runtime/docs/test alignment pass.
2. Prefer removing or correcting stale claims over resurrecting old features.
3. Reuse existing parity-test patterns and add only the smallest missing checks.

