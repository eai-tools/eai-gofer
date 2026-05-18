# Quickstart: Gofer Engineering Gap Remediation

## Prerequisites

- Node.js 20.x LTS
- VSCode with Gofer extension installed (dev mode)
- npm dependencies installed (`npm install` from repo root)
- Vitest available (`npx vitest`)

## Setup

1. Clone and install:

   ```bash
   cd /Users/douglaswross/Code/eai-gofer
   npm install
   ```

2. Build extension:

   ```bash
   cd extension && npm run compile
   ```

3. Verify existing tests pass:
   ```bash
   npm test
   ```

## Testing the Feature

### Phase 1: Pipeline State Machine

```bash
# Test pipeline-state.sh
.specify/scripts/bash/pipeline-state.sh init --feature-dir .specify/specs/002-gofer-gap-remediation
.specify/scripts/bash/pipeline-state.sh read --json
.specify/scripts/bash/pipeline-state.sh update --stage 2_specify
.specify/scripts/bash/pipeline-state.sh status
# Expected: "2_specify"

# Run unit tests
npx vitest run tests/unit/pipeline-state.test.ts
```

### Phase 2: Artifact Schema Validation

```bash
# Test validate-artifact.sh
.specify/scripts/bash/validate-artifact.sh spec .specify/specs/002-gofer-gap-remediation/spec.md --json
# Expected: {"artifact":"spec","valid":true,...}

# Test with invalid artifact
echo "---\ntitle: missing fields\n---\n# Bad Spec" > /tmp/bad-spec.md
.specify/scripts/bash/validate-artifact.sh spec /tmp/bad-spec.md --json
# Expected: {"artifact":"spec","valid":false,"errors":["Missing required field: id",...]}

# Run unit tests
npx vitest run tests/unit/artifact-validation.test.ts
```

### Phase 3: Run Ledger

```bash
# Run unit tests for RunLedger
npx vitest run tests/unit/RunLedger.test.ts

# After a pipeline run, inspect the ledger
cat .specify/logs/gofer-run-ledger.jsonl | head -5
# Expected: JSONL entries with runId, eventType, stage, etc.

# Filter by event type
grep '"eventType":"stage_complete"' .specify/logs/gofer-run-ledger.jsonl
```

### Phase 4: ScopeGuard + Tool Audit

```bash
# Run unit tests
npx vitest run tests/unit/ScopeGuard.test.ts
npx vitest run tests/unit/ToolAuditLogger.test.ts

# Inspect tool audit trail after a pipeline run
cat .specify/logs/tool-audit.jsonl | head -5
```

### Phase 5: Golden Task Regression

```bash
# Run golden task regression suite
npx vitest run tests/regression/golden-tasks/

# Run full test suite including regression
npm test
```

### Phase 6: Cost Budget Enforcement

```bash
# Run unit tests
npx vitest run tests/unit/CostBudgetEnforcer.test.ts

# Configure budget in VSCode settings:
# gofer.costBudget.maxCostUsd: 10.0
# gofer.costBudget.maxTokensPerRun: 500000
# gofer.costBudget.enforcementMode: "advisory"
```

### Full Integration Test

```bash
# Run the complete pipeline on a test feature
# This exercises all 6 components together
npx vitest run tests/integration/pipeline-integration.test.ts
```

## Automated Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test files
npx vitest run tests/unit/RunLedger.test.ts
npx vitest run tests/unit/CostBudgetEnforcer.test.ts
npx vitest run tests/regression/golden-tasks/
```

## Key Files

| File                                             | Purpose                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `extension/src/autonomous/RunLedger.ts`          | Unified event ledger with correlation IDs       |
| `extension/src/autonomous/ToolAuditLogger.ts`    | ScopeGuard check audit trail                    |
| `extension/src/autonomous/CostBudgetEnforcer.ts` | Budget enforcement per pipeline run             |
| `extension/src/autonomous/ScopeGuard.ts`         | File scope enforcement (enhanced with blocking) |
| `extension/src/schemas/artifact-*.schema.json`   | JSON Schema for artifact validation             |
| `.specify/scripts/bash/pipeline-state.sh`        | Pipeline state machine CLI                      |
| `.specify/scripts/bash/validate-artifact.sh`     | Artifact content validation CLI                 |
| `tests/regression/golden-tasks/`                 | Golden task regression fixtures                 |

## Common Issues

### Issue 1: pipeline-state.json not found

**Problem**: Commands fail with "pipeline-state.json not found" **Solution**:
Run `pipeline-state.sh init --feature-dir <path>` before other commands

### Issue 2: Schema validation fails on existing specs

**Problem**: Existing spec files may not have all required frontmatter fields
**Solution**: Add missing fields (id, title, status, created) to the YAML
frontmatter

### Issue 3: Budget exceeded mid-pipeline

**Problem**: CostBudgetEnforcer stops the pipeline **Solution**: Increase
`gofer.costBudget.maxCostUsd` in settings, or set `enforcementMode: "advisory"`
to get warnings instead of blocks

### Issue 4: ScopeGuard blocks file writes

**Problem**: In blocking mode, ScopeGuard throws `ScopeViolationError`
**Solution**: Update `## Protected Boundaries` in spec.md to include the file
pattern, or set enforcement to `warning` mode
