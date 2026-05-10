# Research: Context Continuity Overhaul

## Executive Summary

Deep analysis of Gofer's context management system reveals a **46/100 score** on
a 10-category rubric measuring context continuity effectiveness. The core
problem is a **two-layer disconnect**: the TypeScript runtime layer
(ContextBuilder, ObservationMasker, StageContextProfile) serves only internal
AutonomousDriver LLM calls, while the prompt layer (/7_gofer_save,
/8_gofer_resume) controls the developer's Claude Code session via markdown
templates. These two worlds interact through filesystem artifacts but are
otherwise decoupled.

Comparison with mem0.ai architecture (93% context reduction, 66.9% accuracy)
reveals key gaps: Gofer extracts memories only at crisis-time (context
critical), while mem0 extracts incrementally every turn. Mem0's incremental
approach achieves 26% better accuracy than batch approaches.

## Current Architecture Analysis

### Two-Layer System

| Layer              | Components                                                            | Controls                                 | Limitation                                      |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| TypeScript Runtime | ContextBuilder, ObservationMasker, StageContextProfile, MemoryManager | Internal AutonomousDriver LLM calls only | Does NOT control Claude Code developer sessions |
| Prompt Layer       | /7_gofer_save, /8_gofer_resume, /5_gofer_implement                    | Claude Code developer sessions           | No access to TypeScript APIs; filesystem-only   |

### Current Score: 46/100

| Category                    | Score | Issue                                              |
| --------------------------- | ----- | -------------------------------------------------- |
| Memory Extraction Timing    | 2/10  | Crisis-only, not incremental                       |
| Session Resume Quality      | 3/10  | Not stage-aware; loads same artifacts regardless   |
| Failed Approach Tracking    | 0/10  | No mechanism exists                                |
| Context Health Estimation   | 4/10  | Bash script over-counts by 200x+                   |
| Memory Conflict Detection   | 3/10  | Jaccard dedup exists but no ADD/UPDATE/DELETE/NOOP |
| Observation Persistence     | 2/10  | Cache lost on session restart                      |
| Checkpoint Frequency        | 2/10  | Only at crisis or manual /7_gofer_save             |
| Handoff Document Quality    | 5/10  | Template exists but static format                  |
| Stage-Aware Context Loading | 5/10  | Profiles exist but resume ignores them             |
| Cross-Session Continuity    | 3/10  | Task checkboxes persist; learnings lost            |

## Key Files Identified

### Core Context Management (50+ files)

| File                                                   | Lines | Role                                         |
| ------------------------------------------------------ | ----- | -------------------------------------------- |
| `extension/src/autonomous/AutoHandoffTrigger.ts`       | 748   | Automated save trigger on critical context   |
| `extension/src/autonomous/ContextBuilder.ts`           | 1380  | Context assembly engine with 14-step build   |
| `extension/src/autonomous/ContextHealthMonitor.ts`     | 585   | Health monitoring with 3-tier status         |
| `extension/src/autonomous/MemoryManager.ts`            | 1086  | Memory lifecycle with priority loading       |
| `extension/src/autonomous/MemoryStorage.ts`            | 425   | Append-only JSONL persistence                |
| `extension/src/autonomous/MemoryConsolidator.ts`       | 281   | Dedup via Jaccard similarity (0.8 threshold) |
| `extension/src/autonomous/ObservationMasker.ts`        | 836   | 3-tier observation decay system              |
| `extension/src/autonomous/StageContextProfile.ts`      | 230   | Per-stage budget allocation                  |
| `extension/src/autonomous/CheckpointValidator.ts`      | 185   | YAML checkpoint validation                   |
| `extension/src/autonomous/ContextUsageLogger.ts`       | 627   | JSONL event logging (gold standard)          |
| `extension/src/autonomous/ContextCompactor.ts`         | 577   | Context window compaction                    |
| `extension/src/autonomous/WorkspaceContextProvider.ts` | 536   | Real token data from hook bridge             |
| `.claude/commands/5_gofer_implement.md`                | 324   | Task execution loop (prompt-level)           |
| `.claude/commands/7_gofer_save.md`                     | 232   | Session save template                        |
| `.claude/commands/8_gofer_resume.md`                   | 270   | Session resume template                      |
| `.specify/scripts/bash/check-context-health.sh`        | 337   | Filesystem-based health estimation           |

### Wiring Hub

- `extension/src/extension.ts` (2216 lines) —
  `initializeContextHealthMonitoring()` at line 369, ContextBuilder at line 1506
- `extension/src/autonomousCommands.ts` (1310 lines) — `sharedContextBuilder`
  singleton

## Critical Data Flows

### 1. AutoHandoffTrigger Event Chain

```
ContextHealthMonitor.checkHealth()
  → contextProvider.getContextAnalysis()
  → analyzeContext() → determineStatus()
  → emit('critical') or emit('handoff-recommended')

AutoHandoffTrigger receives:
  → handleCriticalStatus(status)
  → if dataSource !== 'real': RETURN (KEY GATE - line 209)
  → autoReduceSlop() → slopReducer.reduceWorkspace()
  → sendCompactToTerminal() → writes "/compact\r" to pty
  → showHandoffNotification() with 4 buttons
```

The `dataSource !== 'real'` gate prevents filesystem estimates from triggering
automatic actions. Only hook-bridge data triggers notifications.

### 2. ContextBuilder.buildContext() (14 Steps)

1. Budget blocking check
2. Constitution (sync fs.readFileSync)
3. Research chunks (if enableChunkedResearch)
4. Memories - layered path (if useLayeredMemory)
5. Memories - priority path (loadByPriority, limit=10)
6. Format & verify memories (group by cognitive type)
7. Coverage check (TF-IDF keywords → trigram Jaccard ≥0.3)
8. Hints/research lazy loading (if coverage < 30%, else SKIP)
9. Knowledge graph (BFS depth 1, max 5 files)
10. Task context
11. Observation masking (mask old, save cache)
12. Delegation advisory (sub-agents)
13. Budget enforcement (warn/truncate/block)
14. Merge sections (constitution → research → hints → memories → task →
    observations)

### 3. /5_gofer_implement Task Loop

```
Parse tasks.md for - [ ] (pending) and - [X] (complete)
For each task:
  1. Read description
  2. Scope-check against protected files
  3. Load context (data-model, contracts, research)
  4. Implement per plan.md
  5. Follow codebase patterns
  6. Run feedback loop (lint/test/typecheck)
  7. Mark complete: - [ ] → - [X] in tasks.md  ← HOOK POINT
  8. Report progress
Every 5 tasks: context health check
After each phase: full test/build/lint
```

**Critical gap**: Step 7 is the natural hook for incremental memory extraction
but currently has NO memory API integration.

### 4. check-context-health.sh Estimation Bug

The script counts ALL spec artifacts + ALL source files changed in last 10 git
commits on disk, divided by 120k token limit. In active development this
produces 17,000%+ utilization estimates. Real hook-bridge data shows ~75% (from
`context-health-state.json`).

## Mem0.ai Comparison

| Aspect             | Gofer Current                 | Mem0.ai                            | Gap                        |
| ------------------ | ----------------------------- | ---------------------------------- | -------------------------- |
| Extraction timing  | Crisis-only (batch)           | Every message pair (incremental)   | Mem0 26% more accurate     |
| Operations         | Append-only + dedup           | ADD/UPDATE/DELETE/NOOP per memory  | Gofer lacks UPDATE/NOOP    |
| Conflict detection | Jaccard ≥0.8 keyword overlap  | Fact-level contradiction detection | Gofer word-level only      |
| Storage            | JSONL (single tier)           | Vector + graph (dual tier)         | Acceptable for Gofer scope |
| Context reduction  | ~40% via memory-first loading | 93% with 66.9% accuracy            | Different measurement      |

## Reusable Patterns Found

### Pattern 1: JSONL Logging (3 Variants)

**1A. SlopReducer.logFix** — Sync fire-and-forget (best for
failed-approaches.jsonl)

```typescript
private logFix(entry: FixLogEntry): void {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch { /* Non-fatal */ }
}
```

**1B. ContextUsageLogger** — Full async with convenience methods (best for
session-memory.jsonl)

- Constructor with DEFAULT_CONFIG merge
- Lazy `ensureDirectory()` with `initialized` flag
- Core `log()` + typed convenience methods per event
- `readLog()` with filtering for replay

**1C. Council UsageLogger** — Singleton with aggregation (reference pattern)

### Pattern 2: SHA-256 Hash Verification (2-Tier)

From MemoryConsolidator.checkCitationStaleness:

1. Fast check: `stat.mtimeMs > memory.created` (mtime)
2. Accurate check: SHA-256 hash comparison (if mtime passes)

### Pattern 3: Task Completion Hook Point

Step 7 of /5_gofer_implement task loop: after `- [ ]` → `- [X]`

### Pattern 4: Stage-Aware Configuration

StageContextProfile with GoferStage type, DEFAULT_PROFILES record, YAML config,
and profile loader.

### Pattern 5: Jaccard Similarity for Conflict Detection

MemoryConsolidator.calculateKeywordOverlap: word tokenization → Set
intersection/union → threshold ≥0.8

### Pattern 6: Session Handoff Template

YAML frontmatter (feature, session, stage, contextUsage) + structured sections
(Work Completed, Key Decisions, Context to Preserve, Resume Instructions)

## Improvement Plan (Prioritized)

### HIGH Impact (H1-H3) — Score +25 points

**H1: Incremental Memory Extraction During Implementation**

- Hook into /5_gofer_implement step 7 (task completion)
- Extract learnings per task: what worked, key decisions, gotchas
- Follow ContextUsageLogger async pattern for session-memory.jsonl
- Target: Memory Extraction Timing 2→8, Cross-Session Continuity 3→7

**H2: Stage-Aware Resume Loading**

- Modify /8_gofer_resume to detect current pipeline stage
- Load different artifact subsets per stage (e.g., implement loads
  plan+tasks+research, validate loads spec+tasks+test-results)
- Use StageContextProfile pattern for resume profiles
- Target: Session Resume Quality 3→8, Stage-Aware Loading 5→8

**H3: Failed Approaches Registry**

- New failed-approaches.jsonl following SlopReducer.logFix pattern
- Log: taskId, approach description, failure reason, files affected
- /8_gofer_resume loads recent failures to prevent re-attempts
- Target: Failed Approach Tracking 0→7

### MEDIUM Impact (M1-M4) — Score +15 points

**M1: Observation Manifest Persistence**

- Persist ObservationMasker cache entries with file hashes
- On resume, verify hashes (2-tier: mtime then SHA-256)
- Reload valid cached observations to reduce re-reading
- Target: Observation Persistence 2→6

**M2: Fix Context Health Estimation**

- Replace filesystem counting with hook-bridge real data
- Fallback: count only current feature's spec artifacts + CLAUDE.md
- Remove "all source files from last 10 commits" overcounting
- Target: Context Health Estimation 4→8

**M3: Memory Conflict Detection**

- Extend MemoryConsolidator with UPDATE operation (not just dedup)
- When new memory contradicts existing: update content, increment version
- Add tag-based intersection check alongside Jaccard keyword overlap
- Target: Memory Conflict Detection 3→6

**M4: Pre-Crisis Periodic Saves**

- Add checkpoint every N tasks (default 5) during implementation
- Lightweight: save tasks.md progress + key decisions to checkpoint JSON
- AutoHandoffTrigger triggers at 50% (not just 70%)
- Target: Checkpoint Frequency 2→6

### LOW Impact (L1-L4) — Score +6 points

**L1: Bridge TypeScript Layer to Prompt Layer**

- ContextBridgeWriter already writes JSON for Claude Code sessions
- Extend to include stage-relevant memories and observation summaries
- Target: Cross-Session Continuity +1

**L2: Increase Checkpoint Token Budget**

- Current 5,000 token budget in CheckpointValidator
- Increase to 8,000 to include key decisions and failed approaches
- Target: Handoff Document Quality +1

**L3: Checkpoint Quality Validation**

- Validate handoff documents have non-empty key sections
- Warn if "Key Decisions" or "Next Steps" are missing
- Target: Handoff Document Quality +1

**L4: Unified Handoff Format**

- Standardize session-checkpoint.md and session-handoff-template.md
- Single format used by both /7_gofer_save and AutoHandoffTrigger
- Target: Handoff Document Quality +1

## Projected Score After Implementation

| Category                    | Current    | After H | After M | After L | Final  |
| --------------------------- | ---------- | ------- | ------- | ------- | ------ |
| Memory Extraction Timing    | 2          | 8       | 8       | 8       | 8      |
| Session Resume Quality      | 3          | 8       | 8       | 8       | 8      |
| Failed Approach Tracking    | 0          | 7       | 7       | 7       | 7      |
| Context Health Estimation   | 4          | 4       | 8       | 8       | 8      |
| Memory Conflict Detection   | 3          | 3       | 6       | 6       | 6      |
| Observation Persistence     | 2          | 2       | 6       | 6       | 6      |
| Checkpoint Frequency        | 2          | 2       | 6       | 6       | 6      |
| Handoff Document Quality    | 5          | 5       | 5       | 8       | 8      |
| Stage-Aware Context Loading | 5          | 8       | 8       | 8       | 8      |
| Cross-Session Continuity    | 3          | 7       | 7       | 8       | 8      |
| **TOTAL**                   | **29/100** | **54**  | **69**  | **75**  | **75** |

## Technology Decisions

| Decision                 | Choice                             | Rationale                                                         |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------- |
| Memory log format        | JSONL append-only                  | Matches 4 existing JSONL loggers in codebase                      |
| Failed approaches log    | Sync fire-and-forget               | Follows SlopReducer.logFix pattern; inline during task execution  |
| Session memory logger    | Async with convenience methods     | Follows ContextUsageLogger gold standard                          |
| Conflict detection       | Keyword overlap + tag intersection | No embedding dependencies; extends existing MemoryConsolidator    |
| Observation verification | 2-tier: mtime + SHA-256            | Follows MemoryConsolidator.checkCitationStaleness pattern         |
| Stage-aware resume       | Prompt-level modification          | Modifies /8_gofer_resume.md directly; no TypeScript bridge needed |
| Checkpoint format        | JSON + markdown hybrid             | Matches existing checkpoint files in .specify/memory/checkpoints/ |

## Constraints and Risks

1. **Prompt-only modifications**: /5_gofer_implement and /8_gofer_resume are
   markdown prompt files, not TypeScript. Changes must work through filesystem
   artifacts or bash scripts.
2. **No embedding infrastructure**: Conflict detection must use keyword-based
   approaches (Jaccard), not vector similarity.
3. **Backward compatibility**: Existing memories.jsonl format must remain
   readable; new fields are additive.
4. **Performance**: Incremental memory extraction adds I/O per task completion;
   use async fire-and-forget to avoid blocking.
5. **Context budget**: New logging should not consume significant context
   itself; log entries stay under 200 tokens each.
