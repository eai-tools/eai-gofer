---
feature: '020-multi-session-context-panel'
created: '2026-02-10T14:00:00Z'
discoveredBy: Claude + Douglas
status: complete
---

# Business Discovery: Multi-Session Context Panel

## Problem Statement

**Pain Point**: When running multiple Claude Code CLI terminals in the same
VSCode workspace, Gofer only monitors whichever session last wrote to the shared
bridge file. Users have no visibility into the context health of each individual
session.

**Current State**: Single shared `context-bridge.json` file — "last writer wins"
model. Status bar shows one session at a time.

**Impact**: Users running 2-3 parallel Claude Code sessions (common workflow)
cannot see which sessions are approaching context limits, leading to unexpected
context degradation.

## Target Users

### Primary Users

- **Persona**: Developers using Claude Code CLI (power users running multiple
  terminals)
- **Technical Level**: Advanced — comfortable with AI-assisted development
  workflows
- **Key Needs**: At-a-glance visibility into context health across all active
  sessions

## Value Proposition

**Primary Value**: Quality improvement — reduce context-related errors by giving
users real-time visibility into each session's context composition and health.

**Quantified Goal**: Users can always see context state for all active sessions
without switching terminals.

## Success Metrics

| Metric                          | Target                                   | Measurement                                |
| ------------------------------- | ---------------------------------------- | ------------------------------------------ |
| Sessions tracked simultaneously | Up to 3                                  | Count of active session nodes in tree view |
| Context breakdown accuracy      | Matches actual usage within 5%           | Compare tree totals to bridge data         |
| Panel responsiveness            | Updates within 2 seconds of hook trigger | Time from bridge write to tree refresh     |

## Feature Scope

### Gofer Panel Redesign

Current panel sections: Specifications, Constitution, Memory

New panel sections:

1. **Specifications** — unchanged
2. **Context Window** — NEW: up to 3 Claude Code sessions, each with categorized
   context breakdown
3. **Memory** — redesigned with categorized tree structure

### Context Window Tree Structure

```
Context Window
├── Terminal 1: "claude (session abc123)" — 54% [green]
│   ├── Spec Artifacts — 12,340 tokens
│   ├── Memories/Hints — 8,200 tokens
│   ├── System Files — 4,100 tokens (CLAUDE.md, AGENTS.md, constitution)
│   ├── Conversation History — 22,500 tokens
│   ├── Tool Outputs/Observations — 15,800 tokens
│   └── Masked Observations — 3 masked (saved ~4,200 tokens)
├── Terminal 2: "claude (session def456)" — 71% [yellow]
│   ├── ...
│   └── ...
└── Terminal 3: "claude (session ghi789)" — 23% [green]
    ├── ...
    └── ...
```

### Memory Tree Structure

```
Memory
├── Discovery — 4 entries
│   ├── "Problem: context tracking limited to single session"
│   └── ...
├── Patterns — 7 entries
│   ├── "Hook bridge file architecture"
│   └── ...
├── Decisions — 3 entries
├── Learnings — 12 entries
└── Journeys — 2 entries
```

### Context Breakdown Categories (Full)

| Category                  | Description                                 | Source                   |
| ------------------------- | ------------------------------------------- | ------------------------ |
| Spec Artifacts            | spec.md, plan.md, tasks.md content loaded   | WorkspaceContextProvider |
| Memories/Hints            | Memory entries and hint files               | ContextBuilder           |
| System Files              | CLAUDE.md, AGENTS.md, constitution.md       | ContextBuilder           |
| Conversation History      | User/assistant message turns                | Bridge data              |
| Tool Outputs/Observations | Recent tool call results                    | ObservationMasker        |
| Masked Observations       | Count of masked observations + tokens saved | ObservationMasker        |

### 4th Terminal Behavior

When a 4th Claude Code terminal opens:

- Show info notification: "Context tracking limited to 3 sessions. Oldest
  inactive session will stop being tracked."
- Drop the oldest inactive session from tracking
- Continue monitoring the 3 most recently active sessions

## Discovery Decisions

| Decision              | Choice                          | Rationale                                                                                        |
| --------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Context categories    | Full Breakdown                  | Users want granular visibility into what's consuming context                                     |
| Memory grouping       | By Category                     | Natural grouping that matches how memories are created                                           |
| 4th terminal handling | Info Message                    | Transparent to user, graceful degradation                                                        |
| Panel structure       | Specs / Context Window / Memory | Replaces Constitution with Context Window; Constitution moves under Memory or remains accessible |
