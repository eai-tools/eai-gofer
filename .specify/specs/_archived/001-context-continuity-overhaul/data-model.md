---
feature: Context Continuity Overhaul
spec: spec.md
created: 2026-02-15
---

# Data Model: Context Continuity Overhaul

## Entities

### SessionMemoryEntry

A single learning extracted after task completion during /5_gofer_implement.
Stored in `.specify/logs/session-memory.jsonl`.

| Field         | Type              | Required | Description                                 |
| ------------- | ----------------- | -------- | ------------------------------------------- |
| timestamp     | string (ISO-8601) | Yes      | When the memory was captured                |
| taskId        | string            | Yes      | Task identifier (e.g., "T003")              |
| featureId     | string            | Yes      | Feature branch/directory name               |
| memoryType    | enum              | Yes      | One of: decision, gotcha, pattern, approach |
| content       | string            | Yes      | 1-3 sentence learning (under 200 tokens)    |
| sessionId     | string            | Yes      | Claude Code session identifier              |
| filesAffected | string[]          | No       | Files relevant to this learning             |

**Validation Rules**:

- content must be under 800 characters (~200 tokens)
- memoryType must be one of the 4 defined types
- timestamp must be valid ISO-8601

### FailedApproachEntry

A record of an implementation approach that was tried and failed. Stored in
`.specify/logs/failed-approaches.jsonl`.

| Field         | Type              | Required | Description                       |
| ------------- | ----------------- | -------- | --------------------------------- |
| timestamp     | string (ISO-8601) | Yes      | When the failure was logged       |
| taskId        | string            | Yes      | Task identifier                   |
| featureId     | string            | Yes      | Feature branch/directory name     |
| approach      | string            | Yes      | Description of what was attempted |
| failureReason | string            | Yes      | Why it failed                     |
| filesAffected | string[]          | No       | Files that were involved          |
| sessionId     | string            | Yes      | Claude Code session identifier    |

**Validation Rules**:

- approach and failureReason combined must be under 1600 characters
- At least one of approach or failureReason must be non-empty

### ObservationManifestEntry

A cached observation with verification hash for cross-session persistence.
Stored in `.specify/memory/observation-cache/manifest.jsonl`.

| Field         | Type                 | Required | Description                              |
| ------------- | -------------------- | -------- | ---------------------------------------- |
| filePath      | string               | Yes      | Absolute or workspace-relative file path |
| contentHash   | string (SHA-256 hex) | Yes      | Full SHA-256 hash of file content        |
| summary       | string               | No       | Brief observation summary                |
| tokenEstimate | number               | Yes      | Estimated tokens of observation          |
| turnNumber    | number               | Yes      | Turn when observation was created        |
| timestamp     | number (Unix ms)     | Yes      | When observation was captured            |
| type          | ObservationType      | Yes      | file_read, command_output, etc.          |

**Validation Rules**:

- contentHash must be 64 hex characters (full SHA-256)
- filePath must not contain path traversal (`..`)

### PeriodicCheckpoint

Lightweight progress snapshot created every N tasks during implementation.
Stored in `.specify/memory/checkpoints/periodic-{timestamp}.json`.

| Field          | Type              | Required | Description                          |
| -------------- | ----------------- | -------- | ------------------------------------ |
| timestamp      | string (ISO-8601) | Yes      | When checkpoint was created          |
| featureId      | string            | Yes      | Feature identifier                   |
| taskNumber     | number            | Yes      | Current task index (1-based)         |
| totalTasks     | number            | Yes      | Total tasks in tasks.md              |
| tasksCompleted | string[]          | Yes      | List of completed task IDs           |
| keyDecisions   | string[]          | No       | Decisions made since last checkpoint |
| filesModified  | string[]          | No       | Files changed since last checkpoint  |
| sessionId      | string            | Yes      | Claude Code session identifier       |

### StageResumeProfile

Configuration defining which artifacts to load per pipeline stage. Defined
inline in /8_gofer_resume.md (not a separate file).

| Field       | Type       | Required | Description                             |
| ----------- | ---------- | -------- | --------------------------------------- |
| stage       | GoferStage | Yes      | Pipeline stage identifier               |
| fullLoad    | string[]   | Yes      | Artifacts to read completely            |
| summaryOnly | string[]   | No       | Artifacts to mention but not read fully |
| skip        | string[]   | No       | Artifacts to skip entirely              |

**Defined Profiles** (from spec Stage Loading Matrix):

| Stage     | fullLoad               | summaryOnly          | skip              |
| --------- | ---------------------- | -------------------- | ----------------- |
| research  | CLAUDE.md              | -                    | spec, plan, tasks |
| specify   | research.md, CLAUDE.md | -                    | plan, tasks       |
| plan      | spec.md, research.md   | -                    | tasks             |
| tasks     | plan.md, spec.md       | research.md          | -                 |
| implement | tasks.md, plan.md      | spec.md, research.md | -                 |
| validate  | tasks.md, spec.md      | plan.md              | research.md       |

## State Transitions

### Memory Lifecycle (Extended)

```
Created → Active → [Conflict Detected] → Superseded (archived)
                 → [Duplicate Detected] → Merged (archived)
                 → [Stale Detected] → Flagged
                 → [Low Use + Old] → Compacted
                 → [Very Old] → Priority Decayed
```

### Session Continuity Flow

```
Implementation Session
  → Task Complete → SessionMemoryEntry written
  → Task Failed → FailedApproachEntry written
  → Every 5 Tasks → PeriodicCheckpoint written
  → Context Critical → Full Handoff saved

New Session (Resume)
  → Detect Stage → Load StageResumeProfile
  → Load SessionMemoryEntries (current feature)
  → Load FailedApproachEntries (last 3 sessions)
  → Load ObservationManifest → Verify hashes
  → Continue implementation
```
