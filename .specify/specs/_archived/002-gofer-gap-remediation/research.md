---
date: '2026-02-28T14:00:00Z'
researcher: Claude
feature: 'Gofer Engineering Gap Remediation'
status: complete
---

# Research: Gofer Engineering Gap Remediation

## Feature Summary

Implement 5 engineering gaps identified in the 2026 gap analysis, plus a
foundational pipeline state machine (`pipeline-state.json`) to prevent
auto-chain loss during context compression. The gaps are:

1. **Pipeline-state.json** (Foundation) — Persistent state machine for pipeline
   orchestration
2. **Typed artifact schemas + inter-stage validation** (Gap #1) — JSON Schema
   for each artifact type, content validation between stages
3. **Unified run ledger with correlation IDs** (Gap #2) — Single
   `gofer-run-ledger.jsonl` correlating all 8+ subsystem logs
4. **ScopeGuard blocking mode + tool audit trail** (Gap #3) — Default to warning
   mode, add invocation logging
5. **Golden task regression suite** (Gap #4) — 5-10 known-good features for
   automated re-validation
6. **Cost budget enforcement** (Gap #5) — Max tokens/dollars per pipeline run

## Codebase Analysis

### Where to Implement

| Component                   | Location                                         | Purpose                                                |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Pipeline State Machine      | `.specify/specs/{feature}/pipeline-state.json`   | Track current stage, completed stages, runId           |
| State Machine Reader/Writer | `.specify/scripts/bash/pipeline-state.sh`        | Read/update state from bash commands                   |
| Artifact JSON Schemas       | `extension/src/schemas/artifact-*.schema.json`   | JSON Schema for spec.md, tasks.md, plan.md frontmatter |
| Artifact Validator Script   | `.specify/scripts/bash/validate-artifact.sh`     | Content-level validation between stages                |
| Schema Section in Commands  | `.claude/commands/*.md`                          | `## Required Output Schema` sections                   |
| Unified Run Ledger          | `extension/src/autonomous/RunLedger.ts`          | Correlates events across all subsystems                |
| Run Ledger JSONL            | `.specify/logs/gofer-run-ledger.jsonl`           | Unified log file                                       |
| ScopeGuard Enhancement      | `extension/src/autonomous/ScopeGuard.ts`         | Change default, add audit logging                      |
| Tool Audit Logger           | `extension/src/autonomous/ToolAuditLogger.ts`    | Log tool invocations per agent                         |
| Golden Task Suite           | `tests/regression/golden-tasks/`                 | Known-good feature specs                               |
| Regression Runner           | `tests/regression/validate-golden-tasks.ts`      | Vitest suite for golden task re-validation             |
| Cost Budget Config          | `extension/package.json` → `gofer.budgets.*`     | Budget settings                                        |
| Cost Budget Enforcer        | `extension/src/autonomous/CostBudgetEnforcer.ts` | Runtime budget tracking and enforcement                |

### Existing Patterns to Follow

#### Pattern 1: JSONL Logger (ContextUsageLogger)

Found in: `extension/src/autonomous/ContextUsageLogger.ts:25-84`

The canonical JSONL logging pattern:

- Typed interface for log entries (`ContextUsageLogEntry`)
- Typed DTOs for inputs (`HealthCheckLogInput`)
- `async log(entry)` with
  `fs.promises.appendFile(path, JSON.stringify(entry) + '\n')`
- Lazy directory creation with `ensureDirectory()` guard
- `readLog(limit?)` for reading, `filterByEventType()` for querying
- Constructor takes `workspaceRoot: string`, builds path as
  `path.join(root, '.specify', 'logs', 'name.jsonl')`

Why relevant: RunLedger and ToolAuditLogger should follow this exact pattern.

#### Pattern 2: JSON Schema Validation (schemaValidator.ts)

Found in: `extension/src/autonomous/schemaValidator.ts`

Uses AJV with strict settings:

```typescript
const ajv = new Ajv({ allErrors: true, strictSchema: true, validateFormats: true });
export const validateOrThrow = (validator, data, typeName) => { ... }
```

Why relevant: Artifact schema validation should reuse this AJV instance and
follow the `validateOrThrow` pattern.

#### Pattern 3: ConfigManager Settings (config.ts)

Found in: `extension/src/config.ts:113-263`

Three-step pattern for new settings:

1. Add property in `extension/package.json` under
   `contributes.configuration.properties`
2. Add constant in `CONFIG_KEYS` and default in `DEFAULTS`
3. Add typed getter in `ConfigManager` class using
   `this.config.get<T>(key.replace('gofer.', ''), default)`

Why relevant: Cost budget settings and ScopeGuard mode configuration follow this
pattern.

#### Pattern 4: Bash Script with Common Functions (check-prerequisites.sh)

Found in: `.specify/scripts/bash/check-prerequisites.sh` + `common.sh`

Pattern: Source `common.sh`, use `get_feature_paths` for directory resolution,
support `--json` output mode.

Why relevant: `pipeline-state.sh` and `validate-artifact.sh` should follow this
exact script structure.

#### Pattern 5: Validation Agent Definition

Found in: `.claude/agents/validation-*.md` (6 files)

All agents share:

- YAML frontmatter with `name`, `description`, `tools`
- Restricted tools: `Read, Grep, Glob, LS` only
- Structured output: `<2000 tokens`, table-based findings
- Severity levels: red (blocking), yellow (must-fix), gray (informational)
- `## LLM Council Mode` section

Why relevant: No new agents needed, but existing agents may need updated
schemas.

### Integration Points

1. **Auto-chaining instructions in `.claude/commands/*.md`**
   - Each command file (1-6) contains prompt-driven chaining: "the orchestrator
     will automatically invoke /N_gofer_next"
   - Pipeline-state.json must be read/written by each stage's bash scripts
   - `check-prerequisites.sh` must be extended to validate content, not just
     file existence

2. **JSONL subsystem loggers** (8 existing files)
   - `context-usage.jsonl` — 43MB, actively written by ContextUsageLogger (10s
     polling)
   - `validation-findings.jsonl` — Written by `/6_gofer_validate` command
   - `pipeline.jsonl` — Written by `log-stage.sh` bash script
   - `quality-metrics.jsonl` — Written by `log-stage.sh` (shows zeros — lint
     command is unreliable in script context)
   - `slop-reduction.jsonl` — Written by SlopReducer TypeScript class
   - `slop-scan.jsonl` — Written by SlopDetector
   - `failed-approaches.jsonl` — Written by `write-failed-approach.sh`
   - `session-memory.jsonl` — Written by `write-session-memory.sh`
   - **Missing**: `council-usage.jsonl` (UsageLogger exists but no file on disk
     — council never used)
   - **None have a shared runId or correlation ID**

3. **ScopeGuard** (`extension/src/autonomous/ScopeGuard.ts`)
   - Complete implementation with `advisory | warning | blocking` modes
   - **Never instantiated in production** — `new ScopeGuard()` is never called
     in `extension.ts`
   - EventHandlers maps modes to VSCode diagnostic severities
   - StateManager holds optional `_scopeGuard` but nothing sets it

4. **GoferParser** (`extension/src/goferParser.ts`)
   - All-optional interfaces: `Spec`, `Task`, `TechnicalPlan`, `YAMLFrontmatter`
   - Never throws on missing/malformed content — silently degrades
   - Tests exist in `tests/unit/parser/` (GoferParser, TaskParser,
     SpecValidator)

5. **Test infrastructure**
   - Vitest with 85% coverage thresholds
   - 17,156 lines across `tests/unit/autonomous/` alone
   - Temp directory pattern for JSONL tests (real fs, not mocked)
   - Global setup mocks vscode, Logger, node-pty

### Related Code

- `extension/src/goferParser.ts:18-69` — Spec, Task, TechnicalPlan,
  YAMLFrontmatter interfaces
- `extension/src/autonomous/ContextUsageLogger.ts:25-84` — Canonical JSONL
  logger pattern
- `extension/src/autonomous/ScopeGuard.ts:22-108` — ScopeEnforcementMode,
  check(), loadFromSpec()
- `extension/src/autonomous/schemaValidator.ts` — AJV instance,
  validateOrThrow()
- `extension/src/autonomous/ContextHealthMonitor.ts:84-88` — Threshold config
  (warning=0.5, critical=0.7)
- `extension/src/council/UsageLogger.ts:17-38` — UsageLogEntry with cost
  estimation
- `extension/src/autonomous/ErrorRecovery.ts:147-233` — Three-level retry
  strategy
- `extension/src/autonomous/ContextBuilder.ts:71-91` — Budget enforcement modes
- `.specify/scripts/bash/check-prerequisites.sh` — File existence validation
  only
- `.specify/scripts/bash/log-stage.sh` — Pipeline JSONL logging

## Technology Decisions

### Decision 1: Pipeline State File Format

- **Choice**: JSON file (`pipeline-state.json`) in the feature spec directory
- **Rationale**: JSON is deterministic, parseable from both bash (jq) and
  TypeScript. Living in the feature directory keeps it co-located with
  artifacts. The orchestrator's `0_business_scenario.md` already uses
  file-existence checks — adding a state file is a natural extension.
- **Alternatives considered**:
  - SQLite database — too heavy for a file-based orchestrator
  - YAML — harder to parse from bash without yq
  - Environment variables — lost on context compression

### Decision 2: Schema Enforcement Approach

- **Choice**: JSON Schema files + bash validation script
  (`validate-artifact.sh`) + `## Required Output Schema` sections in command
  files
- **Rationale**: Matches Gofer's architecture as a Claude Code orchestrator. The
  LLM sees the schema in the command prompt and produces compliant output. The
  bash script validates after the fact. This is the "belt and suspenders"
  approach the engineering review recommended.
- **Alternatives considered**:
  - Pydantic-style runtime validation — wrong architecture (Gofer isn't a Python
    agent framework)
  - TypeScript-only validation — would miss bash-script-produced artifacts
  - YAML Schema — less tooling support than JSON Schema

### Decision 3: Unified Ledger Strategy

- **Choice**: New `RunLedger` class that wraps a single `gofer-run-ledger.jsonl`
  with a `runId` correlation ID, plus retrofit existing loggers to emit events
  to the ledger
- **Rationale**: A centralized ledger with correlation IDs is the #2 gap. Rather
  than replacing 8 existing JSONL files (high risk), add a new unified file and
  have existing loggers additionally emit to it. Existing files continue working
  unchanged.
- **Alternatives considered**:
  - Replace all 8 JSONL files with one — too disruptive, breaks existing
    consumers
  - OpenTelemetry integration — too heavy for a dev tool; the semantic
    conventions are useful as a schema reference though

### Decision 4: ScopeGuard Activation

- **Choice**: Instantiate ScopeGuard in `extension.ts` during
  `initializeForWorkspace()`, default to `'warning'` mode, make mode
  configurable via `gofer.scopeGuard.mode` setting
- **Rationale**: The ScopeGuard is fully implemented but never instantiated. The
  fix is trivial: create the instance, load from spec, wire into the existing
  EventHandlers diagnostic integration. Changing default from `advisory` to
  `warning` gives visibility without breaking anything.
- **Alternatives considered**:
  - Default to `blocking` — too aggressive for first activation; users may have
    valid reasons to touch protected files
  - Keep advisory — no user visibility (console.warn only)

### Decision 5: Golden Task Format

- **Choice**: Directory of known-good feature specs
  (`tests/regression/golden-tasks/`) with a Vitest test that runs
  `validate-artifact.sh` on each
- **Rationale**: Leverages existing Vitest infrastructure and the new
  `validate-artifact.sh` script. Golden tasks are just copies of successful spec
  directories stripped to their essential artifacts. Regression means "do our
  tools still produce valid output?"
- **Alternatives considered**:
  - Full pipeline re-execution — too slow and expensive for CI
  - Snapshot testing — too brittle for markdown content

### Decision 6: Cost Budget Enforcement

- **Choice**: Extend `ContextBuilder.ts` budget system with dollar/token limits
  configurable via `gofer.budgets.*` settings, enforced via the existing
  `budgetEnforcementMode` mechanism
- **Rationale**: `ContextBuilder` already has
  `budgetEnforcementMode: 'advisory' | 'truncate' | 'blocking'` and per-category
  budget calculation. Adding a cost ceiling builds on this foundation. Council's
  `UsageLogger` already estimates costs per provider.
- **Alternatives considered**:
  - Separate cost tracking service — unnecessary duplication
  - Hard kill on budget exceed — too aggressive; use 'truncate' mode as default

## Constraints & Considerations

- **Bash + TypeScript dual stack**: Pipeline orchestration uses bash scripts
  (.specify/scripts/bash/), while the extension runs TypeScript. Both must
  read/write pipeline-state.json and validate artifacts. Use `jq` in bash,
  native JSON in TypeScript.
- **context-usage.jsonl is 43MB**: The unified ledger must not duplicate all
  health_check events (10s polling). Only aggregate/milestone events should be
  correlated.
- **quality-metrics.jsonl shows zeros**: The `lint_issues` metric runs
  `npm run lint` during `log-stage.sh`, which is unreliable when called from
  inside Claude Code. This should be documented as a known limitation.
- **ScopeGuard never instantiated**: Must wire into extension.ts carefully to
  avoid breaking the activation sequence (see MEMORY.md: reflect-metadata must
  be first import, commands must be registered synchronously).
- **No breaking changes to existing JSONL consumers**: The ContextContentPanel
  reads memories.jsonl, the AutoHandoffTrigger reads failed-approaches.jsonl —
  these must continue working.
- **Golden tasks need real spec content**: Must curate from existing successful
  specs (001-gofer-engineering-remediation has all artifacts).

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type             | Description                             | Impact on Implementation                    |
| --------------------------- | --------------------------------------- | ------------------------------------------- |
| Node.js                     | Requires 20.x LTS                       | Full ES2022+ API availability               |
| Dependencies                | 30+ runtime, 25+ dev                    | Must reuse existing AJV, path patterns      |
| Module System               | CommonJS (webpack bundled)              | Import patterns must use ES6 imports        |
| Existing JSONL schema       | 8 different schemas, no correlation IDs | Must add runId without breaking consumers   |
| Prompt-driven orchestration | No programmatic state machine           | pipeline-state.json is the only persistence |

### Technical Debt to Avoid

| Pattern                       | Found In                    | Why Avoid                   | Use Instead                      |
| ----------------------------- | --------------------------- | --------------------------- | -------------------------------- |
| `appendFileSync`              | council/UsageLogger.ts      | Blocks event loop           | `fs.promises.appendFile`         |
| `sessionId: 'unknown'`        | context-usage.jsonl entries | No correlation possible     | Auto-generated runId             |
| `console.warn` for violations | ScopeGuard.ts:100           | Not visible to users        | VSCode diagnostics + JSONL audit |
| Empty quality metrics         | quality-metrics.jsonl       | lint command fails silently | Skip or fix lint detection       |

### Areas Requiring Extra Caution

- **`extension/src/extension.ts`**: Entry point with strict import ordering
  (reflect-metadata first), synchronous command registration requirements
- **`.claude/commands/*.md`**: Prompt files — changes affect LLM behavior; must
  maintain backward-compatible formatting
- **`extension/src/autonomous/ContextBuilder.ts`**: Complex budget calculation;
  budget enforcement mode changes affect all stages
- **`extension/src/goferParser.ts`**: Powers tree view; making it stricter could
  break existing specs that rely on tolerance

### Downstream Dependencies

Code that depends on areas we're modifying:

- `extension/src/progressProvider.ts` — Consumes GoferParser output for tree
  view
- `extension/src/ui/ContextContentPanel.ts` — Reads memories.jsonl, hints.jsonl
- `extension/src/autonomous/AutoHandoffTrigger.ts` — Reads
  failed-approaches.jsonl, session-memory.jsonl
- `extension/src/services/EventHandlers.ts` — Maps ScopeGuard enforcement to
  diagnostics
- All `.claude/commands/*.md` — Consume check-prerequisites.sh output

## Open Questions

- [ ] Should pipeline-state.json be committed to git (part of the spec) or
      gitignored (ephemeral state)?
- [ ] For the unified run ledger, should we add a `runId` field to ALL existing
      JSONL loggers, or only emit to the new ledger file?
- [ ] Should the golden task suite run in CI (requires spec directory fixtures
      in the repo)?
- [ ] What dollar amount should be the default cost budget ceiling per pipeline
      run?

## Recommendations

1. **Start with pipeline-state.json** — This is the foundation that all other
   gaps build on. The runId it generates becomes the correlation ID for the
   unified ledger.
2. **Implement the validate-artifact.sh script early** — It's needed by both the
   typed schema gap AND the golden task regression suite. Build once, use twice.
3. **Wire ScopeGuard before adding audit logging** — The instance must exist
   before we can log its invocations. This is a quick fix (instantiate in
   extension.ts, load from spec).
4. **Add `## Required Output Schema` to command files last** — This is a prompt
   change that should be informed by the JSON Schema definitions created
   earlier.
5. **Use the 001-gofer-engineering-remediation spec as the first golden task** —
   It has all artifacts (research, spec, plan, tasks, validation report) and
   passed validation.
