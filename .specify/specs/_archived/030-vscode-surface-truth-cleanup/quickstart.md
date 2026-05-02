# Quickstart: 030-vscode-surface-truth-cleanup

> This is a repo-cleanup feature. Testing is an audit of command, setting, and
> documentation truthfulness plus the existing parity checks. There are no
> deployment steps for this feature.

## 1. Prerequisites

- Node.js 20.x
- npm
- VS Code 1.85+
- Local checkout of `eai-tools/gofer` with permission to run repo scripts

## 2. Setup Steps

```bash
# From the repository root
npm install
(cd extension && npm install)
(cd language-server && npm install)

# Optional baseline checks before editing
(cd extension && npm run compile)
npm run test:integration
```

1. Open the repository in VS Code.
2. Keep the contract surfaces side by side while testing:
   - `extension/package.json`
   - `extension/src/extension.ts`
   - `extension/src/services/CommandRegistry.ts`
    - `extension/src/config.ts`
    - `extension/README.md`
    - `README.md`
    - `docs/API_KEY_SETUP.md`
    - `docs/guides/configuration.md`
    - `docs/guides/session-management.md`
    - `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md`
3. If you update canonical command docs under `.specify/commands/`, plan to rerun
   `npm run gofer:generate` before the parity checks.

## 3. Manual Testing Scenarios

### Scenario 1: Public Command Truth Audit (AT-001, AT-002)

**Objective**: Confirm that every user-facing VS Code command described in active
docs maps to the current manifest and to live runtime registration.

**Steps**:

1. Review the command list in `extension/package.json` under
   `contributes.commands`.
2. Audit `extension/README.md`, `README.md`, `docs/API_KEY_SETUP.md`, and
   `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md` for every VS Code command
   name or command-palette instruction.
3. Verify each documented command exists in the manifest and is registered in
   `extension/src/extension.ts`, `extension/src/services/CommandRegistry.ts`, or
   the command modules.
4. Confirm removed or internal-only commands are not described as supported user
   commands.

**Expected result**: No active doc names a command that is absent from the
manifest, and every contributed command is still registered at runtime.

### Scenario 2: Settings Truth Audit (AT-003, AT-004)

**Objective**: Confirm documented settings and defaults match the public VS Code
settings contract.

**Steps**:

1. Review `docs/guides/configuration.md`, `docs/guides/session-management.md`,
   and configuration examples in `extension/README.md` and `README.md`.
2. Compare every documented key and default value with
    `extension/package.json` under `contributes.configuration.properties`.
3. Cross-check `extension/src/config.ts` plus direct runtime fallback reads to
   make sure helper keys/defaults do not drift from the manifest.
4. Verify unsupported or internal-only settings are removed from user-facing
   docs.

**Expected result**: Every documented setting/example maps to the manifest and
neither `config.ts` nor direct runtime fallbacks expose contradictory
user-facing defaults.

### Scenario 3: No Dead-End Setup Path Audit (AT-008)

**Objective**: Confirm the VS Code-facing setup guidance only describes current,
working paths.

**Steps**:

1. Read the setup and onboarding sections in `extension/README.md`, `README.md`,
   `docs/API_KEY_SETUP.md`, `docs/guides/configuration.md`,
   `docs/guides/session-management.md`, and
   `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md` end to end.
2. Follow each described VS Code workflow step locally.
3. Check any WhatsApp, memory, or similar feature claims against the current
   manifest and runtime implementation.
4. Verify unsupported setup instructions, stale settings, and dead-end command
   references have been removed.

**Expected result**: A new maintainer or evaluator can follow the active docs
without hitting unsupported commands, settings, or setup paths.

### Scenario 4: Generated Mirror Scope Audit (AT-005)

**Objective**: Confirm generated CLI mirrors stay within the cleaned canonical
surface.

**Steps**:

1. If `.specify/commands/*.md` changed, run `npm run gofer:generate` from the
   repo root.
2. Run `npm run generate-commands -- --verbose` to refresh the checked-in
   `.github/`, `.system/`, and `.agents/` mirrors from the current Claude bodies.
3. If bundled extension resources must pick up refreshed surfaces, run
   `./scripts/sync-extension-resources.sh` and review diffs under
   `extension/resources/`, especially `extension/resources/claude-agents/` and
   `extension/resources/gemini/`.
4. Review diffs under `.claude/`, `.github/`, `.gemini/`, `.agents/`, `.system/`,
   and the bundled copies under `extension/resources/`.
5. Verify regenerated mirrors do not advertise commands or behaviors outside the
   current manifest-backed contract.
6. Run the command-generation parity and packaged-resource parity checks from the
   automated section.

**Expected result**: Generated mirrors and packaged extension copies reflect the
cleaned canonical command content only, with no manual mirror-only edits
required.

### Scenario 5: Hydrate Resource Naming Audit (AT-006)

**Objective**: Confirm the hydrate flow points at the correctly named bundled
resource.

**Steps**:

1. Open `extension/src/commands/specCommands.ts`.
2. Verify the hydrate prompt path references the underscore-named bundled file.
3. Confirm the bundled file exists at
   `extension/resources/claude-commands/gofer_hydrate.md`.
4. Ensure no code path still references `gofer.hydrate.md`.

**Expected result**: The cleanup leaves a single, correct hydrate resource name
and removes the known dot/underscore mismatch.

### Scenario 6: Cleanup Safety Sweep (AT-007, AT-009, AT-010)

**Objective**: Confirm the cleanup leaves a clean active spec surface, adds no
new dependencies, and does not break extension activation.

**Steps**:

1. Run `ls .specify/specs` and verify only `_archived/` and
   `030-vscode-surface-truth-cleanup/` remain active at the top level.
2. Review diffs for `package.json`, `extension/package.json`, and the lockfiles
   to confirm no new external packages were introduced.
3. Run `cd extension && npm run compile`.
4. Open the repo in a VS Code extension host and verify Gofer activates without
   startup errors.
5. Open the Command Palette and confirm Gofer commands still appear.

**Expected result**: The active spec root is clean, dependency manifests stay
unchanged apart from cleanup edits, and the extension still compiles and
activates.

## 4. Automated Tests

Use the existing repo commands only:

```bash
# Regenerate mirrors if canonical command docs changed
npm run gofer:generate
npm run generate-commands -- --verbose
./scripts/sync-extension-resources.sh

# Focused parity checks for this cleanup
npm run test:integration -- tests/integration/command-registration.test.ts
npm run test:integration -- tests/integration/command-generation.test.ts
npx vitest run tests/unit/extension/Config.test.ts

# Extension build safety
(cd extension && npm run compile)

# Broader regression sweeps (record unrelated baseline failures separately)
npm run test:integration
npm test
```

## 5. Key Files

| File | Why it matters |
| --- | --- |
| `extension/package.json` | Authoritative public contract for contributed commands, menus, keybindings, and settings |
| `extension/src/extension.ts` | Global activation and command registration entry point |
| `extension/src/services/CommandRegistry.ts` | Main workspace command wiring surface |
| `extension/src/config.ts` | Typed settings helper that must stay aligned with manifest keys/defaults |
| `extension/src/commands/specCommands.ts` | Holds the hydrate prompt resource reference that must use the correct filename |
| `extension/README.md` | Highest-risk extension-facing command and setup documentation |
| `README.md` | Active top-level repo guidance that can repeat stale VS Code claims |
| `docs/API_KEY_SETUP.md` | Active API-key onboarding that must not name dead-end commands |
| `docs/guides/configuration.md` | User-facing settings reference to reconcile with the manifest |
| `docs/guides/session-management.md` | Active context-window settings guide that must keep defaults truthful |
| `docs/agentic-coding/AGENT_TOOLING_REFERENCE.md` | Active command/tooling reference that must use current IDs and tool names |
| `tests/integration/command-registration.test.ts` | Existing manifest-to-runtime parity guard |
| `tests/integration/command-generation.test.ts` | Existing canonical-to-mirror parity guard |
| `tests/unit/extension/Config.test.ts` | Reused config helper/constants unit suite that complements the manifest-backed integration checks and still contains some broader legacy assertions |

## 6. Common Issues

### Command registration parity fails

**Problem**: A command still exists in `extension/package.json` but the matching
runtime registration was renamed, removed, or moved.

**Fix**: Update the manifest, runtime registration, and any coupled menu,
keybinding, or tree-action references in the same change.

### Generated mirror test fails after docs cleanup

**Problem**: Canonical command content changed, but generated mirror artifacts
were not refreshed.

**Fix**: Rerun `npm run gofer:generate`, `npm run generate-commands -- --verbose`,
and `./scripts/sync-extension-resources.sh`, then recheck diffs under both repo
mirrors and `extension/resources/` instead of hand-editing generated outputs.

### Settings or defaults still drift

**Problem**: `docs/guides/configuration.md` or `extension/src/config.ts` still
mentions keys/defaults that do not match `extension/package.json`.

**Fix**: Treat `extension/package.json` as the authority for public settings and
remove or align any conflicting helper/doc entries.

### Hydrate prompt still cannot be found

**Problem**: `specCommands.ts` still points at `gofer.hydrate.md` or another
non-existent file.

**Fix**: Use the bundled underscore filename
`extension/resources/claude-commands/gofer_hydrate.md` consistently.

### Extension host reports activation errors

**Problem**: Cleanup changed command IDs or manifest references without updating
linked surfaces.

**Fix**: Recompile the extension, then recheck `extension/package.json`,
`extension/src/extension.ts`, and `extension/src/services/CommandRegistry.ts`
for mismatched command IDs.
