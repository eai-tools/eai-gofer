---
date: 2025-12-30T04:00:00Z
researcher: Claude
topic: 'SpecKit vs RPI Research Capabilities Comparison and Enhancement'
tags: [research, speckit, rpi, parallel-agents, codebase-exploration]
status: complete
---

# Research: SpecKit vs RPI Research Capabilities

## Research Question

Does the SpecKit framework do as much research and as good research as the RPI
version? What is different and how can we improve the SpecKit path for research?

## Summary

**Finding**: SpecKit's research was significantly weaker than RPI's.

- **RPI**: Uses 3 specialized parallel agents (locator, analyzer,
  pattern-finder) for systematic codebase exploration with file:line references
- **SpecKit (before)**: Simple task dispatch only for "unknowns" - no systematic
  codebase exploration
- **SpecKit (after)**: Now enhanced with the same parallel agent approach as RPI

**Enhancement Applied**: Added "Phase 0: Codebase Exploration" to
`/speckit.plan` that uses the same 3 parallel agents as RPI's
`/1_research_codebase`.

## Detailed Findings

### RPI Research (`/1_research_codebase`)

**Strengths**:

1. Spawns 3 specialized parallel agents:
   - `codebase-locator`: Finds WHERE code lives (Grep, Glob, LS)
   - `codebase-analyzer`: Explains HOW code works (Read, Grep, Glob, LS)
   - `codebase-pattern-finder`: Shows EXAMPLES to follow (Grep, Glob, Read, LS)

2. Produces structured research document saved to `thoughts/shared/research/`

3. Focus areas:
   - File locations and organization
   - Implementation details and data flow
   - Patterns, conventions, reusable components
   - Entry points, dependencies, error handling
   - Security and performance considerations

### SpecKit Research (Before Enhancement)

**Weaknesses**:

1. Simple task dispatching (not parallel agents)
2. Limited scope - only researched NEEDS CLARIFICATION items
3. Output was simpler - just Decision/Rationale/Alternatives
4. No systematic codebase exploration
5. No file:line references
6. No pattern finding

### Comparison Table

| Capability             | RPI                     | SpecKit (Before)   | SpecKit (After)         |
| ---------------------- | ----------------------- | ------------------ | ----------------------- |
| Parallel agents        | 3                       | 0                  | 3                       |
| File location          | codebase-locator        | None               | codebase-locator        |
| Code analysis          | codebase-analyzer       | None               | codebase-analyzer       |
| Pattern finding        | codebase-pattern-finder | None               | codebase-pattern-finder |
| Systematic exploration | Full codebase           | Only "unknowns"    | Full codebase           |
| File:line references   | Yes                     | No                 | Yes                     |
| Saved artifacts        | Structured doc          | Simple research.md | Structured research.md  |

## Code References

### RPI Command

- `.claude/commands/1_research_codebase.md:30-34` - Parallel agent spawning
- `.claude/commands/1_research_codebase.md:43-89` - Research document format

### RPI Agents

- `.claude/agents/codebase-locator.md` - File location specialist
- `.claude/agents/codebase-analyzer.md` - Code analysis specialist
- `.claude/agents/codebase-pattern-finder.md` - Pattern finding specialist

### SpecKit Command (Enhanced)

- `.claude/commands/speckit.plan.md:32-78` - New Phase 0: Codebase Exploration
- `.claude/commands/speckit.plan.md:80-101` - Phase 0.5: Technology Research
- `.claude/commands/speckit.plan.md:127-133` - New key rules

## Architecture Insights

### Why Parallel Agents Matter

1. **Speed**: 3 agents running concurrently vs sequential exploration
2. **Specialization**: Each agent focuses on one type of analysis
3. **Coverage**: Systematic exploration catches more relevant code
4. **Quality**: File:line references make findings actionable

### The Gap in SpecKit

SpecKit's original design assumed:

- The spec.md fully defines what to build
- Research is only needed for "unknowns"
- The codebase doesn't need systematic exploration

This was flawed because:

- New features should follow existing patterns
- Reusable components exist but aren't discovered
- Integration points need to be understood
- Brownfields projects have established conventions

### The Enhancement

Added to `/speckit.plan`:

```
Phase 0: Codebase Exploration (PARALLEL AGENTS)
├── Agent 1: codebase-locator (find related files)
├── Agent 2: codebase-analyzer (understand how they work)
└── Agent 3: codebase-pattern-finder (extract patterns to follow)

Phase 0.5: Technology Research (original behavior)
├── Research unknowns
└── Find best practices
```

## Open Questions

1. **Should SpecKit save research to `thoughts/shared/research/` like RPI?**
   - Currently saves to feature's `research.md`
   - Could cross-reference with shared research

2. **Should there be a standalone `/speckit.research` command?**
   - Separate from planning
   - For exploratory research before specifying

3. **Should the agents be configurable per project?**
   - Some projects may need domain-specific agents
   - Could extend agent definitions

---

## Enhancement Summary

**Files Modified**:

- `.claude/commands/speckit.plan.md` - Added Phase 0 codebase exploration with
  parallel agents

**Before**: SpecKit research was reactive and shallow **After**: SpecKit
research matches RPI's depth with parallel agent exploration
