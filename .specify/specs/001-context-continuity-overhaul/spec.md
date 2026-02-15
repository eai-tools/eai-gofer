---
id: 001-context-continuity-overhaul
title: Context Continuity Overhaul
status: draft
created: 2026-02-15
updated: 2026-02-15
author: Claude
---

# Context Continuity Overhaul

## Overview

Gofer's context management system currently scores 46/100 on a 10-category
continuity rubric. The core problem is that learnings from implementation
sessions are lost when context windows are exhausted. Developers repeat failed
approaches, resume at the wrong abstraction level, and lose task-specific
decisions across session boundaries.

This feature overhauls context continuity through 11 targeted improvements
across 3 priority tiers, raising the continuity score to 75/100. The
improvements focus on extracting knowledge incrementally during work (not just
at crisis points), loading the right context for each pipeline stage on resume,
and preventing repeated failures through a failed approaches registry.

**Research Reference**: See `research.md` for codebase analysis, data flow
traces, and reusable pattern catalog.

## User Stories

### US1: Incremental Memory Extraction During Implementation (P1)

As a developer using the Gofer pipeline, I want key decisions, gotchas, and
learnings to be captured automatically after each task completes, so that this
knowledge survives across session boundaries without requiring manual
/7_gofer_save.

**Why this priority**: Currently, memories are only extracted at crisis time
(context critical) or manual save. Research shows incremental extraction
achieves 26% better accuracy than batch approaches. This is the single
highest-impact improvement.

**Independent Test**: Implement a feature using /5_gofer_implement, let 3+ tasks
complete, then start a new session and verify that task-specific learnings
appear in the memory store.

**Acceptance Criteria**:

- [ ] AC1.1: After each task is marked complete in tasks.md, the system appends
      a session-memory entry to `.specify/logs/session-memory.jsonl`
- [ ] AC1.2: Each session-memory entry contains: timestamp, taskId, featureId,
      memoryType (decision/gotcha/pattern/approach), content (under 200 tokens),
      and sessionId
- [ ] AC1.3: The /5_gofer_implement prompt instructs the agent to write a 1-3
      sentence learning after marking each task `- [X]`
- [ ] AC1.4: Memory entries are written using a bash script callable from the
      prompt layer (no TypeScript API dependency)
- [ ] AC1.5: If session-memory logging fails, task completion is not blocked
      (fire-and-forget)
- [ ] AC1.6: /8_gofer_resume loads recent session-memory entries relevant to the
      current feature

---

### US2: Stage-Aware Resume Loading (P1)

As a developer resuming work on a feature, I want the /8_gofer_resume command to
load only the artifacts relevant to my current pipeline stage, so that context
is used efficiently and I have the right information to continue working.

**Why this priority**: Currently /8_gofer_resume loads the same artifacts
regardless of pipeline stage. A validation session doesn't need the full
research.md; an implementation session doesn't need the full spec.md.
Stage-aware loading prevents wasting 20-40% of context on irrelevant artifacts.

**Independent Test**: Save a session during implementation (stage=implement),
start a new session, run /8_gofer_resume, and verify that tasks.md and plan.md
are loaded but full research.md is not.

**Acceptance Criteria**:

- [ ] AC2.1: /8_gofer_resume detects the current pipeline stage from the session
      checkpoint or artifact presence
- [ ] AC2.2: For each stage, a defined subset of artifacts is loaded (see Stage
      Loading Matrix below)
- [ ] AC2.3: Artifacts not in the stage's loading set are mentioned but not read
      in full
- [ ] AC2.4: Session-memory entries from previous sessions are loaded for the
      current feature
- [ ] AC2.5: Failed approaches from the failed-approaches log are loaded and
      presented as warnings

### Stage Loading Matrix

| Stage     | Full Load              | Summary Only         | Skip              |
| --------- | ---------------------- | -------------------- | ----------------- |
| research  | CLAUDE.md              | -                    | spec, plan, tasks |
| specify   | research.md, CLAUDE.md | -                    | plan, tasks       |
| plan      | spec.md, research.md   | -                    | tasks             |
| tasks     | plan.md, spec.md       | research.md          | -                 |
| implement | tasks.md, plan.md      | spec.md, research.md | -                 |
| validate  | tasks.md, spec.md      | plan.md              | research.md       |

---

### US3: Failed Approaches Registry (P2)

As a developer, I want failed implementation approaches to be recorded and
surfaced on resume, so that I don't waste time repeating approaches that already
proved unsuccessful.

**Why this priority**: Currently there is zero mechanism for tracking what was
tried and failed. Developers across sessions frequently re-attempt the same
dead-end approach, sometimes multiple times.

**Independent Test**: During implementation, encounter a failing approach, log
it, start a new session, resume, and verify the failed approach is displayed as
a warning.

**Acceptance Criteria**:

- [ ] AC3.1: A /5_gofer_implement instruction tells the agent to log failed
      approaches to `.specify/logs/failed-approaches.jsonl`
- [ ] AC3.2: Each entry contains: timestamp, taskId, approach description,
      failure reason, files affected, sessionId
- [ ] AC3.3: The log uses synchronous fire-and-forget writes (non-blocking)
- [ ] AC3.4: /8_gofer_resume reads the failed-approaches log and displays
      entries from the last 3 sessions
- [ ] AC3.5: Failed approaches are presented as "Approaches Already Tried"
      warnings before the agent begins work
- [ ] AC3.6: The log file is created lazily (only when the first failure is
      logged)

---

### US4: Accurate Context Health Estimation (P2)

As a developer, I want context health estimates to reflect actual context window
usage rather than filesystem artifact sizes, so that health warnings are
meaningful and actionable.

**Why this priority**: The current bash script reports 17,000%+ utilization by
counting all source files changed in 10 commits. This produces false alarms that
developers learn to ignore, undermining the entire health monitoring system.

**Independent Test**: Run the context health check and verify the utilization
percentage is within 20% of the real hook-bridge data (or under 200% if no real
data available).

**Acceptance Criteria**:

- [ ] AC4.1: The context health script prioritizes hook-bridge real data from
      `context-health-state.json` when available and fresh (under 5 minutes old)
- [ ] AC4.2: When no real data is available, the fallback estimation counts
      only: current feature spec artifacts + CLAUDE.md + AGENTS.md (not all
      source files from recent commits)
- [ ] AC4.3: The script reports the data source used (real vs estimated) in both
      text and JSON output
- [ ] AC4.4: Fallback estimates produce utilization under 200% for typical
      projects (not 17,000%+)

---

### US5: Pre-Crisis Periodic Saves (P3)

As a developer using the implementation pipeline, I want lightweight checkpoints
saved automatically every N tasks, so that progress is preserved before context
reaches critical levels.

**Why this priority**: Currently, checkpoints only happen at crisis time (70%
context) or manual /7_gofer_save. Periodic saves at lower frequencies capture
progress incrementally.

**Independent Test**: Run /5_gofer_implement with 10 tasks, verify that
checkpoint files are created after tasks 5 and 10.

**Acceptance Criteria**:

- [ ] AC5.1: /5_gofer_implement creates a lightweight checkpoint every 5 tasks
      (configurable)
- [ ] AC5.2: Each checkpoint saves: tasks.md progress, key decisions made since
      last checkpoint, files modified, current task number
- [ ] AC5.3: Checkpoints are saved to `.specify/memory/checkpoints/` as JSON
      files
- [ ] AC5.4: Checkpoint creation does not block task execution (fire-and-forget
      file write)
- [ ] AC5.5: /8_gofer_resume can restore from the most recent checkpoint if no
      full session-checkpoint.md exists

---

### US6: Observation Manifest Persistence (P3)

As a developer resuming a session, I want previously cached observation data
(file reads, command outputs) to be available if the underlying files haven't
changed, so that the agent doesn't waste context re-reading unchanged files.

**Why this priority**: The ObservationMasker cache is lost on every session
restart. Files that haven't changed since the last session could be loaded from
cache, saving significant context.

**Independent Test**: Run a session that reads several files, save/resume, and
verify that observations for unchanged files are restored from cache.

**Acceptance Criteria**:

- [ ] AC6.1: When a session is saved, the observation manifest is persisted to
      `.specify/memory/observation-cache/manifest.jsonl`
- [ ] AC6.2: Each manifest entry contains: file path, content hash (SHA-256),
      observation summary, turn number, timestamp
- [ ] AC6.3: On resume, the manifest is loaded and file hashes are verified
      using 2-tier checking (mtime first, then SHA-256)
- [ ] AC6.4: Observations with valid hashes are restored to the cache without
      re-reading the files
- [ ] AC6.5: Observations with stale hashes are discarded and the files are
      re-read normally

---

### US7: Memory Conflict Detection (P3)

As a developer, I want the memory system to detect when a new memory contradicts
an existing one and update rather than duplicate, so that the memory store stays
accurate and non-contradictory.

**Why this priority**: Currently, MemoryConsolidator only detects duplicates
(Jaccard ≥0.8). It cannot detect contradictions (e.g., "use approach A" vs
"approach A doesn't work"). This leads to conflicting memories that degrade
context quality.

**Independent Test**: Save two memories about the same topic with contradictory
content, run consolidation, and verify the older one is updated or superseded.

**Acceptance Criteria**:

- [ ] AC7.1: MemoryConsolidator detects potential conflicts using keyword
      overlap (Jaccard ≥0.5) combined with tag intersection
- [ ] AC7.2: When a conflict is detected, the newer memory supersedes the older
      one (UPDATE operation)
- [ ] AC7.3: The superseded memory is archived with a `supersededBy` field
      pointing to the new memory ID
- [ ] AC7.4: Conflict detection runs during the regular consolidation cycle
      (existing 30-minute timer)
- [ ] AC7.5: A consolidation log entry records each conflict resolution with
      both memory IDs and the resolution action

---

### US8: Handoff Document Quality Improvements (P4)

As a developer saving a session, I want handoff documents to include failed
approaches, key decisions, and be validated for completeness, so that the next
session has everything needed to continue effectively.

**Why this priority**: Current handoff documents use a static template.
Increasing the token budget and validating content ensures handoffs capture the
information that matters most.

**Independent Test**: Run /7_gofer_save and verify the handoff document includes
Key Decisions, Next Steps, and any failed approaches, and that empty critical
sections trigger a warning.

**Acceptance Criteria**:

- [ ] AC8.1: The checkpoint token budget is increased from 5,000 to 8,000 tokens
- [ ] AC8.2: Handoff documents include a "Failed Approaches" section populated
      from failed-approaches.jsonl
- [ ] AC8.3: Handoff documents include a "Session Memories" section with
      top-priority learnings from session-memory.jsonl
- [ ] AC8.4: CheckpointValidator warns if "Key Decisions" or "Next Steps"
      sections are empty
- [ ] AC8.5: A single unified handoff format is used by both /7_gofer_save and
      AutoHandoffTrigger.generateHandoffDocument()

---

### Edge Cases

- What happens when session-memory.jsonl or failed-approaches.jsonl doesn't
  exist on resume? System skips gracefully.
- What happens when the checkpoint directory doesn't exist? Created lazily on
  first write.
- What happens when observation manifest has entries for deleted files? Entries
  are silently discarded.
- What happens when MemoryConsolidator finds a conflict but the older memory has
  higher priority? The newer memory still wins (recency over priority for
  conflicting facts).
- What happens when context-health-state.json is stale (>5 minutes)? Falls back
  to filesystem estimation.
- What happens when two sessions write to session-memory.jsonl simultaneously?
  JSONL append-only format handles concurrent appends safely on POSIX.

## Requirements

### Functional Requirements

- **FR-001**: System MUST append session-memory entries to JSONL after each task
  completion in /5_gofer_implement
- **FR-002**: System MUST detect the current pipeline stage during
  /8_gofer_resume and load stage-appropriate artifacts
- **FR-003**: System MUST log failed approaches to JSONL during implementation
  and surface them on resume
- **FR-004**: System MUST use hook-bridge real data for context health
  estimation when available; filesystem estimation as fallback
- **FR-005**: System MUST create periodic checkpoints every N tasks during
  implementation
- **FR-006**: System MUST persist and restore observation manifests across
  sessions with hash verification
- **FR-007**: System MUST detect contradictory memories during consolidation and
  supersede the older entry
- **FR-008**: System MUST validate handoff document completeness before saving
- **FR-009**: All new JSONL files MUST follow existing codebase conventions
  (lazy directory creation, fire-and-forget error handling)
- **FR-010**: All prompt-layer changes MUST work through filesystem artifacts
  only (no TypeScript API dependency from prompt commands)
- **FR-011**: System MUST provide a bash script for session-memory writing
  callable from prompt-level commands

### Key Entities

- **SessionMemoryEntry**: A single learning extracted after task completion.
  Contains taskId, featureId, memoryType, content, sessionId, timestamp
- **FailedApproachEntry**: A record of an approach that failed. Contains taskId,
  approach, failureReason, filesAffected, sessionId, timestamp
- **ObservationManifestEntry**: A cached observation with verification hash.
  Contains filePath, contentHash, summary, turnNumber, timestamp
- **StageResumeProfile**: Configuration defining which artifacts to load per
  pipeline stage. Contains stage, fullLoad list, summaryOnly list, skip list
- **PeriodicCheckpoint**: Lightweight progress snapshot. Contains taskNumber,
  tasksCompleted, keyDecisions, filesModified, timestamp

## Non-Functional Requirements

### Performance

- Session-memory and failed-approach writes complete in under 50ms
  (fire-and-forget)
- Observation manifest hash verification processes files at >100 files/second
  using mtime-first optimization
- Periodic checkpoint writes do not block task execution
- Context health estimation completes in under 2 seconds

### Compatibility

- All new JSONL files follow the append-only convention used by 4 existing
  loggers
- Memory conflict detection extends the existing MemoryConsolidator class (no
  new classes for dedup)
- Prompt-level changes to /5_gofer_implement, /7_gofer_save, /8_gofer_resume are
  backward compatible
- Existing memories.jsonl format remains readable; new fields are additive only

### Data Integrity

- JSONL append operations are atomic on POSIX (single appendFileSync for
  payloads under 4KB)
- Observation hashes use SHA-256 for integrity verification
- Memory conflict resolution preserves both versions (original archived, not
  deleted)

## Success Criteria

| Metric                                            | Target                         | Measurement                                                           |
| ------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Context continuity rubric score                   | 75/100 (from 46/100)           | 10-category rubric re-evaluation after implementation                 |
| Session-memory entries per implementation session | 5+ entries per 10-task session | Count entries in session-memory.jsonl                                 |
| Failed approach repeat rate                       | 0 repeats per session          | Count re-attempted failed approaches in session logs                  |
| Context health estimation accuracy                | Within 20% of real usage       | Compare script output to hook-bridge data                             |
| Resume context efficiency                         | 30% less wasted context        | Measure irrelevant tokens loaded during stage-aware resume vs current |
| Observation cache hit rate                        | 50%+ on unchanged files        | Count restored vs re-read observations after resume                   |

## Assumptions

- Prompt-level commands (/5_gofer_implement, /8_gofer_resume) can only interact
  with the system through filesystem artifacts and bash scripts
- No embedding infrastructure is available; conflict detection uses
  keyword-based approaches
- Existing memories.jsonl backward compatibility is required
- The 200-token limit per memory entry is sufficient for capturing task
  learnings
- POSIX atomic append guarantees hold for JSONL payloads under 4KB
- The existing MemoryConsolidator 30-minute consolidation cycle is frequent
  enough for conflict detection

## Dependencies

- `extension/src/autonomous/MemoryConsolidator.ts` — Extended with UPDATE
  operation and conflict detection
- `extension/src/autonomous/CheckpointValidator.ts` — Token budget increase
- `extension/src/autonomous/ObservationMasker.ts` — Manifest persistence methods
- `extension/src/autonomous/AutoHandoffTrigger.ts` — Unified handoff format
- `.claude/commands/5_gofer_implement.md` — Prompt additions for memory
  extraction, failed approach logging, periodic checkpoints
- `.claude/commands/7_gofer_save.md` — Unified handoff format with failed
  approaches and session memories
- `.claude/commands/8_gofer_resume.md` — Stage-aware loading and failed approach
  display
- `.specify/scripts/bash/check-context-health.sh` — Estimation accuracy fix
- `.specify/scripts/bash/` — New bash script for session-memory writing

## Out of Scope

- Vector embeddings for memory similarity (uses keyword-based Jaccard instead)
- Real-time TypeScript-to-prompt-layer bridging (uses filesystem artifacts)
- Automatic memory extraction by the TypeScript runtime during Claude Code
  sessions
- UI changes to the context window panel
- Changes to the ContextBuilder 14-step build pipeline
- Changes to the AutonomousDriver or its context building
- LLM Council integration with memory system

## Glossary

| Term                 | Definition                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Session memory       | A learning extracted from implementing a task, persisted across sessions                 |
| Failed approach      | An implementation strategy that was attempted and failed, logged to prevent repetition   |
| Stage-aware resume   | Loading only the artifacts relevant to the current pipeline stage during /8_gofer_resume |
| Observation manifest | A persistent cache of file observation data with content hashes for verification         |
| Periodic checkpoint  | A lightweight progress snapshot created every N tasks during implementation              |
| Memory conflict      | Two memories about the same topic with contradictory content                             |
| Fire-and-forget      | An I/O operation that does not block on completion and silently swallows errors          |
| Hook bridge          | The TypeScript mechanism that provides real context usage data from Claude Code sessions |

## Research Traceability

| Research Finding                            | Spec Section                | Reference                                     |
| ------------------------------------------- | --------------------------- | --------------------------------------------- |
| Two-layer disconnect (TypeScript vs prompt) | FR-010, FR-011, Assumptions | research.md: "Two-Layer System"               |
| Crisis-only memory extraction               | US1, FR-001                 | research.md: "Memory Extraction Timing 2/10"  |
| /8_gofer_resume not stage-aware             | US2, FR-002                 | research.md: "Session Resume Quality 3/10"    |
| No failed approach tracking                 | US3, FR-003                 | research.md: "Failed Approach Tracking 0/10"  |
| check-context-health.sh 17,000%+ bug        | US4, FR-004                 | research.md: "Estimation Bug"                 |
| Observation cache lost on restart           | US6, FR-006                 | research.md: "Observation Persistence 2/10"   |
| Jaccard dedup but no UPDATE                 | US7, FR-007                 | research.md: "Memory Conflict Detection 3/10" |
| JSONL logging pattern (3 variants)          | FR-009, Compatibility       | research.md: "Pattern 1"                      |
| SHA-256 hash verification (2-tier)          | AC6.3, Data Integrity       | research.md: "Pattern 2"                      |
| Task completion hook point (step 7)         | AC1.3, FR-001               | research.md: "Pattern 3"                      |
| StageContextProfile pattern                 | US2, FR-002                 | research.md: "Pattern 4"                      |
| No embedding infrastructure                 | Assumptions, Out of Scope   | research.md: "Constraints"                    |
| Backward compatibility required             | Compatibility               | research.md: "Constraints"                    |
| Performance: fire-and-forget I/O            | Performance NFR             | research.md: "Constraints"                    |
| 200-token memory entry limit                | Assumptions                 | research.md: "Constraints"                    |
| JSONL append-only format                    | FR-009, Data Integrity      | research.md: "Technology Decisions"           |
| Prompt-level modification approach          | FR-010                      | research.md: "Technology Decisions"           |
