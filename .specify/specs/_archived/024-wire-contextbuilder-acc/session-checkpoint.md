---
feature: Wire ContextBuilder + Adaptive Context Compaction (ACC)
created: 2026-03-11T02:10:00Z
stage: 4_tasks
status: active
context_usage: 75%
last_commit: 7d8aa79
branch: main
---

# Session Checkpoint: Wire ContextBuilder + ACC

## Current State

### Pipeline Progress

| Stage | Status | Artifact |
|-------|--------|----------|
| 0_business_scenario | done | Routed as 024-wire-contextbuilder-acc |
| 1_gofer_research | done | research.md (15KB, comprehensive) |
| 2_gofer_specify | done | spec.md (6 user stories, 15 FRs, 7 success criteria) |
| 3_gofer_plan | done | plan.md (6 phases, 8 new test files, 1 new source file) |
| 4_gofer_tasks | done | tasks.md (44 tasks, 6 phases, 18 parallel) |
| 5_gofer_implement | pending | - |
| 6_gofer_validate | pending | - |

### Active Task

- **Current Task**: Tasks complete, awaiting approval for implementation
- **Next Step**: Approve tasks, then run `/5_gofer_implement`

## What Was Accomplished

### Research Phase (3 parallel agents + direct analysis)

1. **Analyzed OpenDev paper** (arXiv 2603.05344, 5,399 lines) - mapped 13 techniques against Gofer codebase
2. **Internet research** across 10 topics with 40+ sources (March 2026 state of the art)
3. **Deep codebase analysis** of all live vs dead context management code

### Key Finding: Root Cause

The entire ~3,700 LOC dead code problem traces to **ONE missing function call**:
```
setSharedContextBuilder() in autonomousCommands.ts:52 is NEVER CALLED
```

This makes dead: ContextBuilder (1,643 LOC), ObservationMasker (1,215 LOC), StageContextProfileLoader (373 LOC), MemoryLayerManager (335 LOC), SubAgentDispatcher (273 LOC), plus ContextFolder, KnowledgeGraph persistence, ContextBridgeWriter, ContinuousMemoryWriter.

### Proposed Architecture (from research.md)

**5-Stage ACC** (new ACCOrchestrator class):
| Stage | Threshold | Action | Component |
|-------|-----------|--------|-----------|
| 1 | 70% | Warning + delegation advisory | SubAgentDispatcher |
| 2 | 80% | Observation masking (3-tier decay) | ObservationMasker |
| 3 | 85% | Fast pruning (truncate low-priority) | ContextBuilder budget enforcement |
| 4 | 90% | Aggressive masking + section folding | ObservationMasker + ContextFolder |
| 5 | 99% | Full LLM compaction | ContextCompactor |

**Key design decisions**:
- Wire shared ContextBuilder AND keep AutonomousDriver's private instance (different lifecycles)
- ACCOrchestrator follows AutoHandoffTrigger.connect() pattern
- Add new events to ContextHealthMonitor for 80/85/90/99% thresholds
- Keep existing AutoHandoffTrigger behavior unchanged

## Code Changes

### Committed This Session

None - research phase only, no code changes.

### Uncommitted Changes

| File | Status | Description |
|------|--------|-------------|
| `.specify/specs/024-wire-contextbuilder-acc/research.md` | New | Comprehensive research document (15KB) |
| `docs/CodingAgents.md` | New | OpenDev paper (input document, 5,399 lines) |
| `docs/CodingAgents.pdf` | New | OpenDev paper PDF |

## Context for Resumption

### Key Decisions Made

1. **Feature scope**: Wire existing dead code + implement 5-stage ACC orchestrator (not a rewrite)
2. **Architecture**: Thin ACCOrchestrator delegates to existing components (ContextBuilder, ObservationMasker, ContextCompactor, SubAgentDispatcher)
3. **Event-driven**: ACC hooks into ContextHealthMonitor events, same pattern as AutoHandoffTrigger
4. **Dual instances**: Shared ContextBuilder (extension lifetime) + private AutonomousDriver instance (session lifetime)

### Industry Validation

- OpenDev paper: 5-stage ACC achieves ~54% peak context reduction
- Anthropic 2026 Trends: Multi-agent with dedicated context is validated pattern
- Morph/JetBrains: Verbatim compaction 50-70% compression at 98% accuracy
- Codified Context Infrastructure (arXiv 2602.20478): Hot/warm/cold tiers validated across 283 sessions

### Open Questions (for spec phase)

1. Should ACC stage 5 reuse ContextCompactor or be separate?
2. Should context-profiles.yaml be auto-created on first run?
3. Should ACC have its own enable/disable VSCode setting?

## Wiring Gap Inventory (for implementation)

| Location | What's Dead | Fix |
|----------|-------------|-----|
| `autonomousCommands.ts:52` | `setSharedContextBuilder()` never called | Call after ContextBuilder creation |
| `StateManager.ts:74` | `_sharedContextBuilder` never assigned | Assign in initializeForWorkspace() |
| `EventHandlers.ts:215` | Config reload guard early-returns | Will auto-fix when builder is set |
| `EventHandlers.ts:245` | Layered memory toggle early-returns | Will auto-fix when builder is set |
| `autonomousCommands.ts:939` | ContextBridgeWriter dead | Will auto-activate |
| `autonomousCommands.ts:1008` | Terminal observation tracking dead | Will auto-activate |
| `autonomousCommands.ts:1117` | KnowledgeGraph save dead | Will auto-activate |
| `DisposalService.ts:87` | ObservationMasker cache save dead | Will auto-activate |

### Zero tests exist for dead code modules - all new tests required.

## Resumption Instructions

### Quick Resume

```bash
cd /Users/douglaswross/Code/gofer
/8_gofer_resume
```

### Manual Resume Steps

1. Read `.specify/specs/024-wire-contextbuilder-acc/research.md`
2. Run `/2_gofer_specify` to create the feature specification
3. Pipeline auto-chains: specify -> plan -> tasks -> implement -> validate

### Context to Load First

1. `.specify/specs/024-wire-contextbuilder-acc/research.md` - Full research findings
2. `extension/src/autonomousCommands.ts:37-75` - The wiring gap
3. `extension/src/autonomous/ContextHealthMonitor.ts` - Event system to hook into

## Test Status

- [x] Build passes (no code changes yet)
- [x] Tests pass (no code changes yet)
- [x] Lint passes (no code changes yet)
