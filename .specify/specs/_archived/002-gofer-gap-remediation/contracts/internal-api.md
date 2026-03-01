---
feature: Gofer Engineering Gap Remediation
type: internal-api
status: ready
created: '2026-02-28'
---

# Internal API Contracts: Gofer Engineering Gap Remediation

This feature has no REST APIs. All contracts are internal TypeScript interfaces
and bash script I/O specifications.

## TypeScript Contracts

### RunLedger API

```typescript
// extension/src/autonomous/RunLedger.ts

export interface RunLedgerEntry {
  runId: string;
  timestamp: string;
  eventType: RunLedgerEventType;
  stage: string;
  feature: string;
  source: string;
  severity: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export type RunLedgerEventType =
  | 'stage_start'
  | 'stage_complete'
  | 'stage_error'
  | 'health_warning'
  | 'health_critical'
  | 'scope_violation'
  | 'slop_fix'
  | 'validation_finding'
  | 'budget_warning'
  | 'budget_exceeded';

export class RunLedger {
  constructor(workspaceRoot: string);

  /** Append an event to the ledger. Non-blocking async write. */
  async log(entry: RunLedgerEntry): Promise<void>;

  /** Read all entries, optionally filtered. */
  async readLog(limit?: number): Promise<RunLedgerEntry[]>;

  /** Filter by runId for timeline view. */
  async filterByRunId(runId: string): Promise<RunLedgerEntry[]>;

  /** Filter by event type. */
  async filterByEventType(
    eventType: RunLedgerEventType
  ): Promise<RunLedgerEntry[]>;

  /** Filter by pipeline stage. */
  async filterByStage(stage: string): Promise<RunLedgerEntry[]>;

  /** Get log file path. */
  getLogPath(): string;
}
```

### ToolAuditLogger API

```typescript
// extension/src/autonomous/ToolAuditLogger.ts

export interface ToolAuditEntry {
  timestamp: string;
  runId: string;
  agent: string;
  filePath: string;
  protectedPattern: string | null;
  enforcement: ScopeEnforcementMode;
  outcome: 'allowed' | 'warned' | 'blocked';
}

export class ToolAuditLogger {
  constructor(workspaceRoot: string, runLedger?: RunLedger);

  /** Log a ScopeGuard check result. Also emits to RunLedger if provided. */
  async logCheck(entry: ToolAuditEntry): Promise<void>;

  /** Read audit entries. */
  async readLog(limit?: number): Promise<ToolAuditEntry[]>;

  getLogPath(): string;
}
```

### CostBudgetEnforcer API

```typescript
// extension/src/autonomous/CostBudgetEnforcer.ts

export interface CostBudgetConfig {
  maxCostUsd: number; // Default: 10.0
  maxTokensPerRun: number; // Default: 500000
  enforcementMode: 'advisory' | 'truncate' | 'blocking';
  warningThreshold: number; // Default: 0.8
}

export interface CostSnapshot {
  currentCostUsd: number;
  currentTokens: number;
  percentUsed: number;
  status: 'healthy' | 'warning' | 'exceeded';
}

export class CostBudgetEnforcer {
  constructor(config: CostBudgetConfig, runLedger?: RunLedger);

  /** Record token usage. Returns enforcement action if threshold crossed. */
  recordUsage(
    inputTokens: number,
    outputTokens: number,
    providerId?: string
  ): CostSnapshot;

  /** Check if budget allows more work. */
  canProceed(): boolean;

  /** Get current budget status. */
  getSnapshot(): CostSnapshot;

  /** Reset for new run. */
  reset(): void;
}
```

### ScopeGuard Enhancement

```typescript
// extension/src/autonomous/ScopeGuard.ts (modifications)

export class ScopeViolationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly protectedPattern: string,
    public readonly enforcement: ScopeEnforcementMode
  );
}

// New methods:
/** Wire audit logger to record every check() invocation. */
setToolAuditLogger(logger: ToolAuditLogger): void;

/** Set the agent name for audit entries. */
setAgentName(name: string): void;

// Enhanced check() behavior:
// - advisory: console.warn + return pattern (existing)
// - warning: VSCode diagnostic + return pattern (existing diagnostic mapping)
// - blocking: throw ScopeViolationError (NEW)
// All modes: log to ToolAuditLogger with outcome (allowed/warned/blocked)
```

## Bash Script Contracts

### pipeline-state.sh

```bash
# Usage: pipeline-state.sh <command> [options]
#
# Commands:
#   init     Create new pipeline-state.json with fresh runId
#   read     Read current state (JSON output)
#   update   Update current stage and add to completedStages
#   status   Get current stage name only
#
# Options:
#   --feature-dir DIR   Feature directory (default: auto-detect from branch)
#   --stage STAGE       Stage name (required for update)
#   --json              JSON output format
#
# Examples:
#   pipeline-state.sh init --feature-dir .specify/specs/002-...
#   pipeline-state.sh update --stage 3_plan
#   pipeline-state.sh read --json
#   pipeline-state.sh status

# Output (init):
# {"runId":"uuid","featureId":"002-...","currentStage":"1_research","completedStages":[],"startedAt":"ISO","updatedAt":"ISO","status":"initialized"}

# Output (read):
# Full pipeline-state.json contents

# Output (update):
# Updated pipeline-state.json contents (currentStage changed, previous added to completedStages)

# Output (status):
# 3_plan
```

### validate-artifact.sh

```bash
# Usage: validate-artifact.sh <artifact-type> <file-path> [options]
#
# Artifact Types:
#   spec     Validate spec.md (frontmatter + required sections)
#   plan     Validate plan.md (frontmatter + required sections)
#   tasks    Validate tasks.md (frontmatter + task format)
#
# Options:
#   --json           JSON output format
#   --strict         Treat warnings as errors
#   --schema-dir DIR Directory containing JSON schemas (default: extension/src/schemas/)
#
# Exit Codes:
#   0  All validations passed
#   1  Validation errors found
#   2  File not found or unreadable
#
# Output (JSON):
# {"artifact":"spec","file":"/path/spec.md","valid":true,"errors":[],"warnings":["Missing optional field: author"]}
# {"artifact":"spec","file":"/path/spec.md","valid":false,"errors":["Missing required field: id","Missing section: ## Requirements"],"warnings":[]}
```

### check-prerequisites.sh (Extended)

```bash
# New behavior when pipeline-state.json exists:
# - Includes "currentStage" and "runId" in --json output
# - Calls validate-artifact.sh for content validation of required artifacts
#
# Extended JSON output:
# {
#   "FEATURE_DIR": "/path/to/feature",
#   "AVAILABLE_DOCS": ["research.md", "plan.md"],
#   "currentStage": "3_plan",       // NEW: from pipeline-state.json
#   "runId": "uuid-here",           // NEW: from pipeline-state.json
#   "validationErrors": []           // NEW: from validate-artifact.sh
# }
```
