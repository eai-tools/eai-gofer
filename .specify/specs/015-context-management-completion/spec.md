---
id: "015-context-management-completion"
title: "Context Management Completion & Tree View Enhancement"
status: "ready"
created: "2026-02-08"
priority: "P0"
---

# Feature Specification: Context Management Completion

## Overview

Complete all gaps identified in the Context Management Rubric scorecard to bring
Gofer's context window management from 66% to 90%+. Additionally, enhance the
Constitution and Memory tree views to show context window breakdown and memory
categorization.

## Scope

### Gap Fixes (from Rubric)

1. **B1: Wire Observation Masking** — Feed Claude Code tool outputs into ObservationMasker via hook bridge
2. **C3: Register gofer.saveProgress** — Wire the Auto-Handoff "Save" button to a working command
3. **A5: Filter Noisy JSONL Logging** — Only log real session data, not filesystem estimates
4. **D4: Citation Verification** — Validate memory citations before injection
5. **C1/C2: Checkpoint Validation** — Add YAML schema validation to session checkpoints

### New Features

6. **Constitution Tree View: Context Breakdown** — Show real-time context window categories in the Constitution panel
7. **Memory Tree View: Categorized Memories** — Group memories by category with counts in the Memory panel

## User Stories

### US1 — Observation Masking Auto-Feed (B1: 2/5 → 5/5)

The hook bridge already receives tool use events. Wire the bridge-update event
to track observations in the ObservationMasker.

**Acceptance Criteria**:
- When Claude Code calls a tool, the tool name and output size are tracked as an observation
- Observations older than the stage's age threshold are masked automatically
- gofer_expand_observation MCP tool retrieves the original content
- Context reduction is measurable (target: 30%+ reduction in tool output tokens)

### US2 — Register gofer.saveProgress Command (C3: 3/5 → 5/5)

The AutoHandoffTrigger's "Save & Continue Later" button calls `gofer.saveProgress`
which doesn't exist. Register it.

**Acceptance Criteria**:
- Command is registered in registerGlobalCommands()
- Clicking "Save & Continue Later" in the critical notification creates a session checkpoint
- The command generates a session-handoff.md with context snapshot
- User sees confirmation message after save completes

### US3 — Filter Noisy JSONL Logging (A5: 3/5 → 5/5)

Stop logging filesystem-estimated health checks every 10 seconds.

**Acceptance Criteria**:
- Only log when dataSource === 'real' (real session data)
- OR log estimated data at max once per 5 minutes (not every 10 seconds)
- JSONL file size growth reduced by 90%+ during idle periods

### US4 — Constitution Tree View: Context Breakdown

Show the current context window composition in the Constitution panel as a
hierarchical tree:

```
Constitution
├── Article I: Core Principles
│   ├── Section 1: Test-Driven Development
│   └── ...
├── ── Context Window ──  (separator)
├── $(pulse) Context Health: 54% (Opus)
│   ├── Conversation: 85,000 tokens
│   ├── Spec Artifacts: 15,000 tokens
│   ├── Memories: 8,000 tokens
│   ├── System Files: 5,000 tokens
│   ├── Hints: 3,000 tokens
│   └── Observations: 2,000 tokens (12 masked)
└── $(info) Stage: Implement (budget: 40% code)
```

**Acceptance Criteria**:
- Context breakdown appears as tree items below constitution articles
- Updates in real-time when hook bridge fires
- Shows "--" when no Claude session active
- Clicking items shows QuickPick with details

### US5 — Memory Tree View: Categorized Memories

Group memories by category in the Memory panel:

```
Memory
├── discovery (3)
│   ├── Problem: Users need better context...
│   ├── Primary users: Developers...
│   └── Value: Time savings...
├── decision (5)
│   ├── Use JSONL storage backend
│   └── ...
├── pattern (2)
│   └── ...
├── observation (8)
│   └── ...
└── uncategorized (1)
    └── ...
```

**Acceptance Criteria**:
- Memories grouped by category with count in parentheses
- Each memory shows truncated content as label
- Clicking a memory shows full content in webview
- Empty categories are hidden
- Refresh updates the categorization

### US6 — Citation Verification (D4: 0/5 → 3/5)

Before injecting a memory into context, verify that any file paths or function
names it references still exist.

**Acceptance Criteria**:
- Extract file paths and function references from memory content
- Check if referenced files exist on disk
- If >50% of citations are stale, mark memory as needs-review
- Log stale citations for user awareness
- Don't block injection — just add a warning prefix

## Protected Boundaries

- Do NOT modify the hook scripts (.specify/scripts/hooks/) — they work correctly
- Do NOT change the MemoryStorage JSONL format
- Do NOT modify ClaudeSessionReader privacy guards
