---
feature: '029-memory-system-v2'
created: '2026-03-19T21:30:00Z'
discoveredBy: Claude + User
status: complete
---

# Business Discovery: Memory System v2

## Problem Statement

**Pain Points** (ALL four identified as critical):

1. **Context Window Inefficiency**: Agents aren't using the 200k context window
   effectively. Too much noise, not enough signal. Sub-agents start with poor
   context.
2. **Knowledge Loss Across Sessions**: Important learnings from one feature
   don't carry over to the next. We keep rediscovering the same patterns.
3. **Memory Fragmentation**: Memory is scattered across MEMORY.md,
   constitution.md, session checkpoints, and spec artifacts. No unified view.
4. **Poor Sub-Agent Memory Handoff**: When dispatching sub-agents (validation,
   research, etc.), they don't get the right context and produce lower-quality
   results.

**Current State**:

- Memory stored in: `~/.claude/projects/.../memory/MEMORY.md`,
  `.specify/memory/constitution.md`, session checkpoints, spec artifacts
- No unified memory API or context builder integration
- Sub-agents receive ad-hoc context (if any)
- Context bloat reaches ~100-150k tokens by stage 5 of pipeline
- ContextBuilder exists (~3,700 LOC) but memory integration unclear

**Impact**:

- Sub-optimal agent performance
- Repeated mistakes across features
- Inefficient context usage
- Lower quality validation results
- Poor cross-session knowledge transfer

## Target Users

### Primary Users (ALL selected)

1. **Main Pipeline Agents**
   - **Personas**: 7 core Gofer stages (research, specify, plan, tasks,
     implement, validate, engineering-review)
   - **Technical Level**: Highly capable LLM agents (Sonnet 4.5/Opus 4.6)
   - **Key Needs**: Consistent context across stages, access to past learnings,
     domain knowledge from previous features

2. **Validation Sub-Agents**
   - **Personas**: 6 parallel validation agents (correctness, standards,
     security, performance, integration, test-quality)
   - **Technical Level**: Specialized evaluation agents
   - **Key Needs**: Targeted context relevant to validation domain, past
     validation findings, project standards

3. **Multi-Perspective Sub-Agents**
   - **Personas**: Divergent analysis agents (architecture-diverger,
     refactor-rewrite-advisor, bug-triangulator, etc.)
   - **Technical Level**: Problem-solving specialists
   - **Key Needs**: Problem-specific context, past architectural decisions,
     domain patterns

4. **Future Sessions / Developers**
   - **Personas**: Human developers, future Claude sessions
   - **Technical Level**: Mixed (developers, AI agents)
   - **Key Needs**: Understand past decisions, query memory, audit trail,
     pattern discovery

## Value Proposition

**Primary Value**: Measurable Quality Improvement

- Sub-agents score 10-15% higher on validation rubrics
- Pipeline stages make fewer mistakes
- Engineering review finds fewer issues
- Reduced rework and iteration cycles

**Secondary Values**:

- Context efficiency (reduce bloat from 150k to <50k tokens)
- Knowledge persistence (zero repeated mistakes)
- Developer experience (queryable decision history)

## Success Metrics

| Metric                     | Current Baseline | Target          | Measurement                                  |
| -------------------------- | ---------------- | --------------- | -------------------------------------------- |
| Validation Rubric Scores   | 85-95/100        | 95-100/100      | Average score across 6 validation categories |
| Engineering Review Issues  | 5-15 per feature | 0-5 per feature | Count of Yellow/Red findings                 |
| Context Token Usage        | 100-150k         | <50k            | Token count at stage 5 of pipeline           |
| Repeated Mistake Rate      | ~20%             | <5%             | % of issues flagged in previous features     |
| Sub-Agent Context Accuracy | Unknown          | >90%            | % of relevant context included in dispatch   |

## Competitive Analysis

**Status**: To be researched in Stage 1

**Research Targets**:

1. **OpenViking** (https://github.com/volcengine/OpenViking) - How do they
   handle memory management for agents?
2. **MemGPT / letta.ai** - Long-term memory for LLM agents
3. **LangChain Memory** - Memory patterns and implementations
4. **Anthropic Extended Context** - Best practices for 200k context windows

## Discovery Decisions

| Decision             | Choice                                  | Rationale                                                           |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Problem Focus        | All 4 problems (efficiency, loss, frag, | These are interconnected - solving one requires addressing all      |
|                      | handoff)                                |                                                                     |
| User Target          | All 4 user types (pipeline, validation, | Memory system must serve entire agent ecosystem                     |
|                      | multi-perspective, future sessions)     |                                                                     |
| Value Metric         | Measurable Quality Improvement          | Tangible improvement in validation scores and engineering review    |
| Competitive Research | OpenViking + 3 others                   | Learn from established memory patterns in agent systems             |
| Implementation Scope | Full Pipeline (research → eng review)   | This is a foundational capability requiring complete implementation |

## Research Requirements

1. **Gofer Current State**:
   - Analyze existing memory architecture (MEMORY.md, constitution.md,
     checkpoints)
   - Map how ContextBuilder (~3,700 LOC) currently works
   - Document current sub-agent dispatch patterns
   - Measure current context token usage across pipeline stages

2. **OpenViking Analysis**:
   - Study their memory management approach
   - Identify patterns applicable to Gofer
   - Document gaps and improvement opportunities

3. **Memory System Design Patterns**:
   - MemGPT/letta.ai patterns
   - LangChain memory implementations
   - Anthropic extended context best practices

4. **Evaluation Framework**:
   - Create rubric for memory system quality
   - Define scoring methodology
   - Baseline current Gofer implementation
   - Score proposed improvements

## Next Steps

Route to `/1_gofer_research` to begin deep analysis of:

- Gofer's current memory architecture
- OpenViking's approach
- Memory system design patterns
- Evaluation rubric creation
