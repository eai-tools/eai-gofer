---
feature: Context Continuity Overhaul
spec: spec.md
research: research.md
status: ready
created: 2026-02-15
---

# Implementation Plan: Context Continuity Overhaul

## Summary

Overhaul Gofer's context management from 46/100 to 75/100 by: (1) adding
incremental memory extraction and failed approach logging to the
/5_gofer_implement prompt, (2) making /8_gofer_resume stage-aware, (3) fixing
the context health estimation script, (4) extending MemoryConsolidator with
conflict detection, (5) adding observation manifest persistence to
ObservationMasker, and (6) improving handoff document quality.

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2 (extension code), Bash (prompt-layer scripts)
- **Framework**: VSCode Extension API
- **Storage**: JSONL append-only files (filesystem)
- **Testing**: Vitest (unit tests)

### Architecture

This feature operates across two layers:

```
Prompt Layer (markdown commands — Claude Code interprets these)
  /5_gofer_implement.md  →  writes to JSONL via bash scripts
  /7_gofer_save.md       →  reads JSONL, includes in handoff
  /8_gofer_resume.md     →  reads JSONL, loads stage-aware artifacts

Bash Bridge (scripts callable from prompt layer)
  write-session-memory.sh      →  appends to session-memory.jsonl
  write-failed-approach.sh     →  appends to failed-approaches.jsonl
  write-periodic-checkpoint.sh →  writes to checkpoints/
  read-session-memories.sh     →  reads and formats for prompt
  read-failed-approaches.sh    →  reads and formats for prompt

TypeScript Runtime (extension host — AutonomousDriver context)
  MemoryConsolidator.ts   →  conflict detection + UPDATE operation
  ObservationMasker.ts    →  manifest save/load with hash verification
  CheckpointValidator.ts  →  token budget increase + section validation
  AutoHandoffTrigger.ts   →  unified handoff format
```

### Integration Points

| Component                  | File                                                 | Integration Type        |
| -------------------------- | ---------------------------------------------------- | ----------------------- |
| Task completion hook       | `.claude/commands/5_gofer_implement.md`              | Prompt modification     |
| Stage detection            | `.claude/commands/8_gofer_resume.md`                 | Prompt modification     |
| Handoff enrichment         | `.claude/commands/7_gofer_save.md`                   | Prompt modification     |
| Memory conflict detection  | `extension/src/autonomous/MemoryConsolidator.ts`     | TypeScript extension    |
| Observation persistence    | `extension/src/autonomous/ObservationMasker.ts`      | TypeScript extension    |
| Checkpoint validation      | `extension/src/autonomous/CheckpointValidator.ts`    | TypeScript modification |
| Handoff generation         | `extension/src/autonomous/AutoHandoffTrigger.ts`     | TypeScript modification |
| Health estimation          | `.specify/scripts/bash/check-context-health.sh`      | Bash modification       |
| Session memory bridge      | `.specify/scripts/bash/write-session-memory.sh`      | New bash script         |
| Failed approach bridge     | `.specify/scripts/bash/write-failed-approach.sh`     | New bash script         |
| Periodic checkpoint bridge | `.specify/scripts/bash/write-periodic-checkpoint.sh` | New bash script         |
| Memory reader              | `.specify/scripts/bash/read-session-memories.sh`     | New bash script         |
| Approach reader            | `.specify/scripts/bash/read-failed-approaches.sh`    | New bash script         |

### Key Dependencies

- Existing `MemoryConsolidator` class (extends with conflict detection)
- Existing `ObservationMasker` class (adds manifest methods)
- Existing `CheckpointValidator` class (constant change + new checks)
- Existing bash scripts in `.specify/scripts/bash/` (pattern to follow)
- Existing JSONL logging convention (4 loggers as reference)

## Constitution Check

- [x] Test-Driven Development: Tests written for MemoryConsolidator conflict
      detection and ObservationMasker manifest methods
- [x] Single Responsibility: Each bash script handles one operation; TypeScript
      extensions are minimal additions to existing classes
- [x] Consistent Patterns: All JSONL files follow existing append-only
      convention; bash scripts follow existing script patterns

## Implementation Phases

### Phase 1: Bash Script Infrastructure

**Goal**: Create the bash scripts that bridge prompt-layer commands to JSONL
files.

**Tasks**:

- [ ] Create `write-session-memory.sh` — accepts arguments, appends JSON line to
      `session-memory.jsonl`
- [ ] Create `write-failed-approach.sh` — accepts arguments, appends JSON line
      to `failed-approaches.jsonl`
- [ ] Create `write-periodic-checkpoint.sh` — accepts arguments, writes
      checkpoint JSON file
- [ ] Create `read-session-memories.sh` — reads and formats session memories for
      prompt consumption
- [ ] Create `read-failed-approaches.sh` — reads and formats failed approaches
      for prompt consumption
- [ ] Copy all new scripts to `extension/resources/bash-scripts/` (bundled
      distribution)

**Verification**:

- [ ] Each script runs without errors
- [ ] Scripts create JSONL entries with correct field structure
- [ ] Scripts handle missing directories gracefully (lazy creation)
- [ ] Scripts always exit 0 (fire-and-forget)

### Phase 2: Prompt Layer — /5_gofer_implement Modifications

**Goal**: Add incremental memory extraction, failed approach logging, and
periodic checkpoints to the implementation loop.

**Tasks**:

- [ ] Add session-memory extraction instruction after step 7 (task completion
      mark)
- [ ] Add failed approach logging instruction in the feedback loop error
      handling
- [ ] Add periodic checkpoint instruction every 5 tasks
- [ ] Add instructions for the agent to call the bash scripts with appropriate
      arguments

**Files Modified**:

- `.claude/commands/5_gofer_implement.md`

**Verification**:

- [ ] Prompt instructions are clear and unambiguous
- [ ] Bash script paths are correct
- [ ] Memory extraction is after task marking, not before
- [ ] Periodic checkpoint fires at correct intervals

### Phase 3: Prompt Layer — /8_gofer_resume Modifications

**Goal**: Make resume stage-aware and load session memories + failed approaches.

**Tasks**:

- [ ] Add stage detection logic (check session checkpoint or artifact presence)
- [ ] Implement Stage Loading Matrix from spec
- [ ] Add session-memory loading via `read-session-memories.sh`
- [ ] Add failed-approaches loading via `read-failed-approaches.sh`
- [ ] Add "Approaches Already Tried" warning display
- [ ] Load most recent periodic checkpoint if no full session-checkpoint.md
      exists

**Files Modified**:

- `.claude/commands/8_gofer_resume.md`

**Verification**:

- [ ] Stage detection works for all 6 stages
- [ ] Correct artifacts loaded per stage
- [ ] Failed approaches displayed as warnings
- [ ] Session memories loaded for current feature

### Phase 4: TypeScript — MemoryConsolidator Conflict Detection

**Goal**: Extend MemoryConsolidator with UPDATE operation for contradictory
memories.

**Tasks**:

- [ ] Write tests for conflict detection (Jaccard ≥0.5 + tag intersection)
- [ ] Add `CONFLICT_OVERLAP_THRESHOLD = 0.5` constant
- [ ] Add `findConflicts()` method — detects memories with medium overlap
      (0.5-0.8) and shared tags
- [ ] Add conflict resolution in `consolidate()` between step 1 and step 2
- [ ] Add `supersededBy` field to storage update
- [ ] Add `conflictsResolved` to `ConsolidationResult`
- [ ] Write consolidation log entry for each conflict resolution

**Files Modified**:

- `extension/src/autonomous/MemoryConsolidator.ts`
- `tests/unit/autonomous/MemoryConsolidator.test.ts`

**Verification**:

- [ ] Tests pass for conflict detection with known contradictory memories
- [ ] Older memory is archived with supersededBy field
- [ ] ConsolidationResult includes conflictsResolved count
- [ ] Existing duplicate detection (≥0.8) still works correctly

### Phase 5: TypeScript — Observation Manifest Persistence

**Goal**: Add save/load methods to ObservationMasker for cross-session cache
persistence.

**Tasks**:

- [ ] Write tests for manifest save and load
- [ ] Add `saveManifest(outputPath?)` method — serializes cache entries to JSONL
      with SHA-256 hashes
- [ ] Add `loadManifest(inputPath?)` method — reads manifest, verifies hashes
      (mtime first, SHA-256 second)
- [ ] Handle stale entries (hash mismatch → discard)
- [ ] Handle missing files (file deleted → discard)
- [ ] Return restored/stale/missing counts

**Files Modified**:

- `extension/src/autonomous/ObservationMasker.ts`
- `tests/unit/autonomous/ObservationMasker.test.ts`

**Verification**:

- [ ] Manifest saves all cached observations with correct hashes
- [ ] Manifest loads and verifies using 2-tier checking
- [ ] Stale observations are discarded
- [ ] Missing files don't cause errors

### Phase 6: TypeScript — Context Health & Handoff Quality

**Goal**: Fix the context health estimation script and improve handoff document
validation.

**Tasks**:

- [ ] Fix `check-context-health.sh`: prioritize `context-health-state.json` real
      data
- [ ] Fix `check-context-health.sh`: remove source file overcounting from
      fallback
- [ ] Add `dataSource` field to JSON output
- [ ] Write tests for CheckpointValidator token budget increase (5000 → 8000)
- [ ] Update `MAX_TOKEN_BUDGET` constant to 8000
- [ ] Add validation for empty "Key Decisions" and "Next Steps" sections
- [ ] Copy updated `check-context-health.sh` to
      `extension/resources/bash-scripts/`

**Files Modified**:

- `.specify/scripts/bash/check-context-health.sh`
- `extension/resources/bash-scripts/check-context-health.sh`
- `extension/src/autonomous/CheckpointValidator.ts`
- `tests/unit/autonomous/CheckpointValidator.test.ts` (if exists, otherwise
  create)

**Verification**:

- [ ] Health estimation uses real data when available
- [ ] Fallback estimation produces reasonable numbers (< 200%)
- [ ] CheckpointValidator warns at 8000 tokens
- [ ] Empty section detection works correctly
- [ ] All tests pass

### Phase 7: Prompt Layer — /7_gofer_save Modifications

**Goal**: Enrich handoff documents with failed approaches, session memories, and
unified format.

**Tasks**:

- [ ] Add "Failed Approaches" section populated from `read-failed-approaches.sh`
- [ ] Add "Session Memories" section populated from `read-session-memories.sh`
- [ ] Update token budget guidance to 8,000 tokens
- [ ] Align handoff format between /7_gofer_save and AutoHandoffTrigger

**Files Modified**:

- `.claude/commands/7_gofer_save.md`
- `extension/src/autonomous/AutoHandoffTrigger.ts` (handoff format alignment)

**Verification**:

- [ ] Handoff documents include Failed Approaches section
- [ ] Handoff documents include Session Memories section
- [ ] Format matches between manual and auto-triggered handoffs

## File Structure

### New Files

```text
.specify/scripts/bash/
├── write-session-memory.sh        # Prompt → JSONL bridge
├── write-failed-approach.sh       # Prompt → JSONL bridge
├── write-periodic-checkpoint.sh   # Prompt → checkpoint bridge
├── read-session-memories.sh       # JSONL → prompt reader
└── read-failed-approaches.sh      # JSONL → prompt reader

extension/resources/bash-scripts/
├── write-session-memory.sh        # Bundled copy
├── write-failed-approach.sh       # Bundled copy
├── write-periodic-checkpoint.sh   # Bundled copy
├── read-session-memories.sh       # Bundled copy
└── read-failed-approaches.sh      # Bundled copy
```

### Modified Files

```text
.claude/commands/
├── 5_gofer_implement.md           # Memory extraction + failed approach + checkpoint
├── 7_gofer_save.md                # Enriched handoff format
└── 8_gofer_resume.md              # Stage-aware loading

.specify/scripts/bash/
└── check-context-health.sh        # Estimation fix

extension/src/autonomous/
├── MemoryConsolidator.ts          # Conflict detection
├── ObservationMasker.ts           # Manifest persistence
├── CheckpointValidator.ts         # Token budget + section validation
└── AutoHandoffTrigger.ts          # Unified handoff format

extension/resources/bash-scripts/
└── check-context-health.sh        # Bundled copy

tests/unit/autonomous/
├── MemoryConsolidator.test.ts     # Conflict detection tests
└── ObservationMasker.test.ts      # Manifest persistence tests
```

### Runtime Data Files (Created During Use)

```text
.specify/logs/
├── session-memory.jsonl           # Incremental learnings
└── failed-approaches.jsonl        # Failed approach registry

.specify/memory/
├── checkpoints/
│   └── periodic-{timestamp}.json  # Periodic checkpoints
└── observation-cache/
    └── manifest.jsonl             # Observation manifest
```

## Risk Assessment

| Risk                                                    | Impact | Mitigation                                                                                   |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Prompt modifications change agent behavior unexpectedly | Medium | Test with real implementation sessions; keep instructions minimal and clear                  |
| JSONL files grow unbounded                              | Low    | Existing compaction patterns apply; periodic checkpoint files are small                      |
| Bash scripts not found on some platforms                | Low    | Scripts bundled in extension/resources/; use `#!/usr/bin/env bash` shebang                   |
| Conflict detection false positives (0.5 threshold)      | Medium | Only resolve conflicts for memories with shared tags AND medium overlap; log all resolutions |
| Observation manifest hashes cause slow startup          | Low    | mtime-first optimization; skip SHA-256 when mtime confirms freshness                         |

## Notes

- All prompt-layer changes are markdown modifications only — no TypeScript
  runtime dependency from prompt commands
- Bash scripts must always exit 0 even on failure (fire-and-forget pattern)
- MemoryConsolidator conflict detection distinguishes from duplicate detection
  by using a lower threshold (0.5 vs 0.8) AND requiring tag intersection
- The observation manifest is separate from the existing
  `observation-cache/index.json` — manifest is for cross-session persistence,
  index.json is for intra-session cache

## Spec Traceability

### User Story Coverage

| Story                     | Priority | Plan Phase(s)             | Components                                                          |
| ------------------------- | -------- | ------------------------- | ------------------------------------------------------------------- |
| US1: Incremental Memory   | P1       | Phase 1, Phase 2          | write-session-memory.sh, /5_gofer_implement.md                      |
| US2: Stage-Aware Resume   | P1       | Phase 3                   | /8_gofer_resume.md                                                  |
| US3: Failed Approaches    | P2       | Phase 1, Phase 2, Phase 3 | write-failed-approach.sh, /5_gofer_implement.md, /8_gofer_resume.md |
| US4: Health Estimation    | P2       | Phase 6                   | check-context-health.sh                                             |
| US5: Periodic Saves       | P3       | Phase 1, Phase 2          | write-periodic-checkpoint.sh, /5_gofer_implement.md                 |
| US6: Observation Manifest | P3       | Phase 5                   | ObservationMasker.ts                                                |
| US7: Memory Conflicts     | P3       | Phase 4                   | MemoryConsolidator.ts                                               |
| US8: Handoff Quality      | P4       | Phase 6, Phase 7          | CheckpointValidator.ts, /7_gofer_save.md, AutoHandoffTrigger.ts     |

### Requirement Coverage

| Requirement                                 | Status  | Plan Reference                                        |
| ------------------------------------------- | ------- | ----------------------------------------------------- |
| FR-001: Session memory on task completion   | COVERED | Phase 1 (script), Phase 2 (prompt)                    |
| FR-002: Stage detection on resume           | COVERED | Phase 3                                               |
| FR-003: Failed approach logging + surfacing | COVERED | Phase 1 (scripts), Phase 2 (prompt), Phase 3 (resume) |
| FR-004: Hook-bridge health data priority    | COVERED | Phase 6                                               |
| FR-005: Periodic checkpoints every N tasks  | COVERED | Phase 1 (script), Phase 2 (prompt)                    |
| FR-006: Observation manifest persistence    | COVERED | Phase 5                                               |
| FR-007: Memory conflict detection + UPDATE  | COVERED | Phase 4                                               |
| FR-008: Handoff completeness validation     | COVERED | Phase 6                                               |
| FR-009: JSONL convention compliance         | COVERED | Phase 1 (all scripts follow convention)               |
| FR-010: Prompt-only filesystem interaction  | COVERED | Phase 1 (bash bridge), Phase 2-3 (prompt only)        |
| FR-011: Bash script for session memory      | COVERED | Phase 1                                               |

Coverage: 100% of user stories (8/8), 100% of functional requirements (11/11)
