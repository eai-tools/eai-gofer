---
feature: Context Continuity Overhaul
type: internal-api
created: 2026-02-15
---

# Internal API Contract: Context Continuity

## Boundary: Prompt Layer → Filesystem

The prompt-layer commands (/5_gofer_implement, /7_gofer_save, /8_gofer_resume)
communicate with the TypeScript runtime exclusively through filesystem
artifacts.

### Contract 1: Session Memory Writing (Bash Script)

**Script**: `.specify/scripts/bash/write-session-memory.sh`

**Usage** (from prompt-layer commands):

```bash
.specify/scripts/bash/write-session-memory.sh \
  --task-id "T003" \
  --feature-id "001-context-continuity-overhaul" \
  --type "decision" \
  --content "Used Jaccard similarity instead of embeddings for conflict detection"
```

**Arguments**:

| Argument     | Required | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| --task-id    | Yes      | Task identifier (e.g., T003)                |
| --feature-id | Yes      | Feature directory name                      |
| --type       | Yes      | One of: decision, gotcha, pattern, approach |
| --content    | Yes      | 1-3 sentence learning                       |
| --session-id | No       | Auto-detected from environment if omitted   |
| --files      | No       | Comma-separated list of affected files      |

**Output**: Appends JSON line to `.specify/logs/session-memory.jsonl`

**Error Handling**: Exits 0 on success, exits 0 on failure (fire-and-forget;
errors logged to stderr only)

### Contract 2: Failed Approach Writing (Bash Script)

**Script**: `.specify/scripts/bash/write-failed-approach.sh`

**Usage**:

```bash
.specify/scripts/bash/write-failed-approach.sh \
  --task-id "T005" \
  --feature-id "001-context-continuity-overhaul" \
  --approach "Tried using vector embeddings for similarity" \
  --reason "No embedding infrastructure available in project"
```

**Arguments**:

| Argument     | Required | Description                    |
| ------------ | -------- | ------------------------------ |
| --task-id    | Yes      | Task identifier                |
| --feature-id | Yes      | Feature directory name         |
| --approach   | Yes      | Description of what was tried  |
| --reason     | Yes      | Why it failed                  |
| --files      | No       | Comma-separated affected files |
| --session-id | No       | Auto-detected if omitted       |

**Output**: Appends JSON line to `.specify/logs/failed-approaches.jsonl`

**Error Handling**: Same as Contract 1 — always exits 0

### Contract 3: Periodic Checkpoint Writing (Bash Script)

**Script**: `.specify/scripts/bash/write-periodic-checkpoint.sh`

**Usage**:

```bash
.specify/scripts/bash/write-periodic-checkpoint.sh \
  --feature-id "001-context-continuity-overhaul" \
  --task-number 5 \
  --total-tasks 20 \
  --completed "T001,T002,T003,T004,T005" \
  --decisions "Used existing Jaccard pattern,Chose sync I/O for logging" \
  --files-modified "src/foo.ts,src/bar.ts"
```

**Output**: Creates `.specify/memory/checkpoints/periodic-{timestamp}.json`

### Contract 4: Session Memory Reading (Bash Script)

**Script**: `.specify/scripts/bash/read-session-memories.sh`

**Usage**:

```bash
.specify/scripts/bash/read-session-memories.sh \
  --feature-id "001-context-continuity-overhaul" \
  --limit 20
```

**Output**: Prints formatted session memories to stdout (for prompt consumption)

### Contract 5: Failed Approaches Reading (Bash Script)

**Script**: `.specify/scripts/bash/read-failed-approaches.sh`

**Usage**:

```bash
.specify/scripts/bash/read-failed-approaches.sh \
  --feature-id "001-context-continuity-overhaul" \
  --sessions 3
```

**Output**: Prints formatted failed approaches from last N sessions to stdout

## Boundary: TypeScript → JSONL Files

### Contract 6: MemoryConsolidator Conflict Detection

**Existing Method**: `consolidate(): Promise<ConsolidationResult>`

**Extended Behavior**:

Between Step 1 (duplicate detection) and Step 2 (stale detection), a new step
runs:

```typescript
// Step 1.5: Conflict detection
const conflicts = this.findConflicts(allMemories);
for (const conflict of conflicts) {
  // Archive older memory with supersededBy field
  await this.storage.update(conflict.older.id, {
    supersededBy: conflict.newer.id,
  });
  toArchive.push(conflict.older.id);
  conflictsResolved++;
}
```

**Extended Result**: `ConsolidationResult` adds:

```typescript
conflictsResolved: number;
```

### Contract 7: ObservationMasker Manifest Persistence

**New Methods** on `ObservationMasker`:

```typescript
/** Persist observation manifest to disk */
saveManifest(outputPath?: string): void;

/** Load and verify observation manifest from disk */
loadManifest(inputPath?: string): { restored: number; stale: number; missing: number };
```

**File Format**: `.specify/memory/observation-cache/manifest.jsonl`

Each line is an `ObservationManifestEntry` (see data-model.md).

### Contract 8: CheckpointValidator Enhanced Validation

**Extended Behavior**:

```typescript
// New constant
const MAX_TOKEN_BUDGET = 8000; // increased from 5000

// New validation: check for empty critical sections
validate(content: string): CheckpointValidationResult {
  // ... existing checks ...

  // New: warn if Key Decisions section is empty
  if (content.includes('## Key Decisions') && !hasContentAfterSection('Key Decisions')) {
    warnings.push('Key Decisions section is empty');
  }

  // New: warn if Next Steps section is empty
  if (content.includes('## Next Steps') && !hasContentAfterSection('Next Steps')) {
    warnings.push('Next Steps section is empty');
  }
}
```

## Boundary: Bash Script → check-context-health.sh

### Contract 9: Context Health Estimation Fix

**Modified Behavior**:

1. First check for `.specify/memory/context-health-state.json`
2. If exists and fresh (< 5 minutes old): use its `tokensUsed` and `tokensLimit`
3. If stale or missing: fall back to filesystem estimation
4. Filesystem estimation counts ONLY:
   - Current feature spec artifacts (spec.md, plan.md, tasks.md, research.md)
   - CLAUDE.md
   - AGENTS.md
   - NOT all source files from recent commits

**New JSON Output Field**:

```json
{
  "dataSource": "real" | "estimated",
  ...existing fields...
}
```
