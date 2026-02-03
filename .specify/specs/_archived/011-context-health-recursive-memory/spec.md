---
id: 011-context-health-recursive-memory
title: Context Health and Recursive Memory Enhancement
status: draft
created: '2026-01-25'
updated: '2026-01-25'
author: Claude
priority: high
depends_on:
  - 010-gofer-memory-journey
---

# Context Health and Recursive Memory Enhancement

## Overview

Enhance Gofer's context window management and memory systems to maintain
high-quality agent performance throughout the entire development lifecycle. This
specification builds on the existing memory system (spec 010) while adding:

1. **Automatic context health monitoring** with proactive interventions
2. **Observation masking** to reduce context usage without losing information
3. **Research document optimization** with chunking and priority loading
4. **Memory consolidation** to convert research into verified memories
5. **Stage-aware context profiles** for optimal resource allocation
6. **MIT RLM-inspired recursive context folding** (advanced)

**Critical Constraint**: All enhancements MUST preserve existing functionality.
No features may be removed or degraded.

**Research Reference**: See `research.md` for codebase analysis, MIT RLM
findings, and industry context management approaches.

---

## The 20 Options

Based on MIT Recursive Language Models research and industry best practices,
here are 20 unique approaches for managing context throughout the Gofer
pipeline:

### Category A: Observation Management

#### Option 1: Observation Masking Layer (Recommended - Phase 1)

**Concept**: Replace tool outputs older than N turns with minimal placeholders
while preserving the full action/reasoning history.

**How it works**:

```
Turn 1: Read file.ts → [Full 500 lines shown]
Turn 5: Read file.ts → <observation_masked file="file.ts" lines="500" />
```

**Application to Gofer stages**:

- **Research**: Mask file reads after initial analysis
- **Implement**: Mask test outputs after verification
- **Validate**: Mask diff outputs after review

**Expected impact**: 50% context reduction, neutral/positive performance
**Complexity**: Low | **Risk**: Low | **Effort**: 1-2 days

---

#### Option 2: Graduated Observation Decay

**Concept**: Three-tier observation retention based on age:

| Age                | Retention Level | Example                                |
| ------------------ | --------------- | -------------------------------------- |
| Recent (0-3 turns) | Full detail     | Complete file contents                 |
| Mid (4-10 turns)   | Key points      | File structure, key functions          |
| Old (11+ turns)    | Status only     | "Read file.ts (500 lines, TypeScript)" |

**Application to Gofer stages**:

- **Plan**: Keep architecture details longer, decay implementation specifics
- **Tasks**: Keep task context longer, decay research details
- **Validate**: Keep test results longer, decay interim outputs

**Expected impact**: 40-60% context reduction **Complexity**: Low-Medium |
**Risk**: Low | **Effort**: 2-3 days

---

#### Option 3: Semantic Observation Compression

**Concept**: Use a fast LLM (Haiku) to compress each observation to essential
facts, caching compressed versions for potential re-injection.

**How it works**:

```typescript
// Before: 500 lines of code
const compressed = await haiku.compress(observation, {
  preserveTypes: true,
  preserveExports: true,
  preserveComments: false,
});
// After: "TypeScript file with UserService class, 3 public methods (create, update, delete), uses Repository pattern"
```

**Application to Gofer stages**:

- **Research**: Compress codebase exploration results
- **Specify**: Compress requirement discussions
- **Implement**: Compress test output details

**Expected impact**: 60-70% context reduction **Complexity**: Medium | **Risk**:
Medium (summarization quality) | **Effort**: 3-5 days

---

#### Option 4: Observation Fingerprinting

**Concept**: Hash and store full observations externally (file or memory),
keeping only fingerprint + summary in context. Agent can request expansion on
demand.

**How it works**:

```
Context: <fingerprint id="abc123" summary="UserService implementation" expand="gofer_expand_observation" />

Agent: "I need to see the UserService implementation again"
Tool: gofer_expand_observation(id="abc123")
Result: [Full observation restored to context]
```

**Application to Gofer stages**:

- All stages: Any observation can be fingerprinted and recalled
- Particularly useful for large file reads and command outputs

**Expected impact**: 70% context reduction **Complexity**: Medium | **Risk**:
Low | **Effort**: 3-5 days

---

#### Option 5: Smart Observation Retention (ML-Based)

**Concept**: Train/use a classifier to predict which observations will be needed
later based on task type, file patterns, and usage history.

**How it works**:

- Analyze historical agent sessions to identify retention patterns
- Score each observation for predicted future relevance
- Retain high-value, mask low-value

**Application to Gofer stages**:

- Learn that test files are often re-read during implement
- Learn that spec.md is referenced throughout pipeline
- Learn that intermediate debug outputs rarely needed again

**Expected impact**: 50% reduction with better quality retention **Complexity**:
High | **Risk**: Medium | **Effort**: 1-2 weeks

---

### Category B: Research Document Management

#### Option 6: Research Chunking with Index (Recommended - Phase 2)

**Concept**: Split research.md into semantic chunks with an index. Load index
first, chunks on-demand based on agent queries.

**How it works**:

```markdown
# Research Index (always loaded)

- [chunk-1] MIT RLM Overview (2.1k tokens)
- [chunk-2] Observation Masking Research (1.8k tokens)
- [chunk-3] Sub-Agent Architecture (1.5k tokens)
- [chunk-4] Memory Systems (2.3k tokens) ...

Agent: "What did MIT research say about recursive approaches?" System: [Loads
chunk-1 into context]
```

**Application to Gofer stages**:

- **Research**: Full access to all chunks
- **Specify**: Index + user story chunks
- **Implement**: Index + implementation pattern chunks

**Expected impact**: 60% research context reduction **Complexity**: Medium |
**Risk**: Low | **Effort**: 3-5 days

---

#### Option 7: Research Priority Queue

**Concept**: Score research sections by relevance to current task, load top-N
sections, lazy-load others if agent requests.

**How it works**:

```typescript
const relevantSections = await scoreResearchRelevance(currentTask, researchDoc);
// Scores: [MIT RLM: 0.9, Observation Masking: 0.8, Memory: 0.6, ...]
// Load top 3, provide summaries of rest
```

**Application to Gofer stages**:

- **Plan**: Prioritize architecture research
- **Implement**: Prioritize code pattern research
- **Validate**: Prioritize testing research

**Expected impact**: Variable reduction based on task specificity
**Complexity**: Medium | **Risk**: Low | **Effort**: 3-5 days

---

#### Option 8: Recursive Research Summarization

**Concept**: Create hierarchical summaries at multiple abstraction levels. Load
appropriate level based on context budget.

**How it works**:

```
Level 1 (Full): 10,000 tokens - Complete research document
Level 2 (Detailed): 3,000 tokens - Key findings with examples
Level 3 (Abstract): 800 tokens - Main conclusions and recommendations
Level 4 (One-liner): 100 tokens - "MIT RLM enables 10x context; use observation masking"
```

**Application to Gofer stages**:

- **Research**: Level 1-2 (need full detail)
- **Specify**: Level 2-3 (need conclusions)
- **Implement**: Level 3-4 (need recommendations only)

**Expected impact**: 70% reduction at abstract level **Complexity**: Medium |
**Risk**: Medium (information loss) | **Effort**: 1 week

---

#### Option 9: Research Memory Consolidation

**Concept**: Periodically merge research findings into the memory system (spec
010). Memories are smaller, citation-verified, and priority-indexed. Retire
source documents after consolidation.

**How it works**:

```typescript
// After research phase completes:
await consolidateResearchToMemory(researchDoc, {
  extractPatterns: true,
  extractDecisions: true,
  extractConstraints: true,
  verifyCitations: true,
});
// Creates multiple AgenticMemory entries
// Original research.md marked as "consolidated"
```

**Application to Gofer stages**:

- Run consolidation after /1_gofer_research completes
- Subsequent stages use memories instead of raw research
- Research still available if agent needs to drill down

**Expected impact**: 80% reduction after consolidation **Complexity**:
Medium-High | **Risk**: Medium | **Effort**: 1-2 weeks

---

#### Option 10: Research Knowledge Graph

**Concept**: Extract entities and relationships from research into a queryable
knowledge graph. Agent queries graph for relevant facts on-demand.

**How it works**:

```
Graph nodes: [MIT RLM] --enables--> [10x context capacity]
                       --uses--> [recursive folding]
             [Observation Masking] --achieves--> [50% cost reduction]
                                   --from--> [JetBrains Research]

Agent: "How can we reduce context usage?"
Query: MATCH (n)-[:achieves]->(outcome) WHERE outcome.type = 'context_reduction'
Result: Observation Masking achieves 50% cost reduction
```

**Application to Gofer stages**:

- Build graph during research phase
- Query graph in all subsequent phases
- Enables semantic traversal of knowledge

**Expected impact**: 90% reduction with semantic access **Complexity**: High |
**Risk**: High (extraction quality) | **Effort**: 2-4 weeks

---

### Category C: Stage-Aware Context Management

#### Option 11: Stage-Specific Context Profiles (Recommended - Phase 1)

**Concept**: Each Gofer stage has a defined context "budget profile" that
determines what gets loaded and retained.

**Profiles**:

| Stage     | Research Budget | Memory Budget | Code Budget | Observation Window |
| --------- | --------------- | ------------- | ----------- | ------------------ |
| Research  | 40%             | 10%           | 30%         | 20 turns           |
| Specify   | 30%             | 20%           | 20%         | 15 turns           |
| Plan      | 25%             | 25%           | 30%         | 15 turns           |
| Tasks     | 15%             | 20%           | 20%         | 10 turns           |
| Implement | 10%             | 25%           | 50%         | 15 turns           |
| Validate  | 15%             | 20%           | 40%         | 20 turns           |

**Application to Gofer stages**:

- Automatically adjust loading at stage transitions
- Warn if budget exceeded, suggest masking

**Expected impact**: Better utilization per stage **Complexity**: Low |
**Risk**: Low | **Effort**: 1-2 days

---

#### Option 12: Automatic Stage Checkpoints

**Concept**: Save a context snapshot at each stage transition. Enable rollback
to any stage with full context restored.

**How it works**:

```
/1_gofer_research completes → Save checkpoint: research-complete.checkpoint
/2_gofer_specify completes → Save checkpoint: specify-complete.checkpoint
...

Agent: "I need to revisit the research findings"
System: Restores research-complete.checkpoint context
```

**Application to Gofer stages**:

- Checkpoint after each stage completion
- Store in `.specify/specs/{feature}/checkpoints/`
- Include context state, memories accessed, decisions made

**Expected impact**: Cleaner context per stage, easy rollback **Complexity**:
Medium | **Risk**: Low | **Effort**: 3-5 days

---

#### Option 13: Context Health-Triggered Handoffs (Recommended - Phase 2)

**Concept**: Monitor context usage during stage execution. Automatically trigger
`/7_gofer_save` when threshold reached, resume in fresh context.

**How it works**:

```typescript
// During any Gofer stage execution:
const contextHealth = await checkContextHealth();
if (contextHealth.utilizationPercent > 70) {
  await triggerAutoHandoff({
    currentStage: 'implement',
    currentTask: 'T005',
    reason: 'context_threshold_exceeded',
  });
  // Creates session-handoff.md
  // Prompts user: "Context at 72%. Saved progress. Continue in fresh context?"
}
```

**Application to Gofer stages**:

- Monitor continuously during implement (longest stage)
- Save task progress, file modifications, blockers
- Resume seamlessly with handoff document

**Expected impact**: Prevents degradation, maintains quality **Complexity**:
Medium | **Risk**: Low | **Effort**: 3-5 days

---

#### Option 14: Progressive Context Delegation

**Concept**: As context fills, progressively delegate more work to sub-agents.
Main agent becomes orchestrator while sub-agents do the detailed work.

**How it works**:

```
Context at 30%: Main agent does everything
Context at 50%: Delegate file analysis to sub-agents
Context at 70%: Delegate code generation to sub-agents
Context at 85%: Main agent only orchestrates, all work in sub-agents
```

**Application to Gofer stages**:

- **Implement**: Delegate individual task execution to sub-agents
- **Validate**: Delegate test running and analysis to sub-agents
- Main agent maintains overall progress and decisions

**Expected impact**: Maintains quality at high utilization **Complexity**:
Medium-High | **Risk**: Medium | **Effort**: 1-2 weeks

---

### Category D: Memory System Enhancements

#### Option 15: Memory-First Context Loading (Recommended - Phase 1)

**Concept**: Load memories before research documents. Memories are smaller,
verified, and priority-indexed. Research loaded only for gaps.

**How it works**:

```typescript
// At stage start:
const relevantMemories = await loadMemoriesByPriority(currentTask);
// Inject highest-priority memories first
const contextUsed = injectMemories(relevantMemories);

// Only if memories don't cover the need:
if (agent.needsMoreContext('research')) {
  const researchChunks = await loadResearchChunks(query);
  injectResearchChunks(researchChunks);
}
```

**Application to Gofer stages**:

- All stages start with memory injection
- Research becomes supplementary, not primary
- Builds on spec 010 memory system

**Expected impact**: 40% reduction with better relevance **Complexity**: Low |
**Risk**: Low | **Effort**: 1-2 days

---

#### Option 16: Active Memory Consolidation

**Concept**: After each task completion, actively consolidate learnings into
memory. Verify citations, update priority index, prune low-priority memories
periodically.

**How it works**:

```typescript
// After task completion:
await consolidateTaskLearnings({
  task: 'T005',
  learnings: extractedLearnings,
  verifyCitations: true,
  incrementPriority: true,
});

// Periodic maintenance:
await pruneMemories({
  maxMemories: 500,
  keepPriority: 'top80percent',
  archivePruned: true,
});
```

**Application to Gofer stages**:

- Consolidate after each task in implement stage
- Consolidate decisions after plan stage
- Consolidate test learnings after validate stage

**Expected impact**: Growing knowledge, stable context size **Complexity**:
Medium | **Risk**: Low | **Effort**: 1 week

---

#### Option 17: Memory-Backed Research

**Concept**: During research phase, immediately convert findings to memory
entries rather than storing raw research. Subsequent stages use only memories.

**How it works**:

```typescript
// During /1_gofer_research:
for (const finding of researchFindings) {
  await createMemoryFromFinding({
    content: finding.summary,
    citations: finding.sources,
    memoryType: finding.type, // 'pattern' | 'decision' | 'constraint'
    confidence: finding.confidence,
  });
}
// No research.md created - all knowledge in memories
```

**Application to Gofer stages**:

- Research creates memories directly
- Specify, Plan, etc. use memories
- No large research document to load

**Expected impact**: 60% reduction in later stages **Complexity**: Medium |
**Risk**: Low | **Effort**: 1 week

---

### Category E: MIT RLM-Inspired Approaches

#### Option 18: Recursive Context Folding (RLM-Lite)

**Concept**: Implement MIT RLM principles in a simplified form. Store full
context as external variable, main agent receives query + summary only, can
"peek", "grep", or "expand" sections on demand.

**How it works**:

```typescript
// Full context stored externally:
const contextVar = storeExternalContext(fullResearchDoc);

// Agent receives:
"Context available: research.md (15,000 tokens)
Available operations: peek(start, length), grep(pattern), expand(section)"

// Agent interaction:
Agent: peek(0, 500) // See first 500 tokens
Agent: grep("MIT RLM") // Find relevant sections
Agent: expand("observation-masking") // Load specific section
```

**Application to Gofer stages**:

- Research: Full context available but not loaded
- Implement: Code context external, loaded on demand
- Validate: Test results external, queried as needed

**Expected impact**: 10x+ context capacity **Complexity**: High | **Risk**:
Medium | **Effort**: 2-4 weeks

---

#### Option 19: Parallel Recursive Analysis

**Concept**: Implement RLM's partition+map strategy. Split large context into
chunks, spawn parallel sub-agents for each chunk, synthesize results in main
context.

**How it works**:

```typescript
// Large codebase analysis:
const chunks = partitionCodebase(codebase, (chunkSize = 50000));

// Parallel analysis:
const results = await Promise.all(
  chunks.map((chunk) =>
    spawnSubAgent({
      context: chunk,
      query: 'Find authentication patterns',
      returnFormat: 'summary',
    })
  )
);

// Synthesis:
const synthesis = await synthesizeResults(results);
// Main agent receives only synthesis (2,000 tokens)
```

**Application to Gofer stages**:

- **Research**: Analyze entire codebase in parallel
- **Validate**: Run validation checks in parallel across files
- **Implement**: Analyze dependencies in parallel

**Expected impact**: Handle unlimited context **Complexity**: High | **Risk**:
Medium | **Effort**: 2-4 weeks

---

#### Option 20: Full RLM Integration

**Concept**: Implement complete RLMEnv-style REPL interface where context is a
Python variable with full code operations. Long-term: train with RL for optimal
context-folding strategies.

**How it works**:

```python
# Agent operates in REPL environment:
>>> context = load_context("research.md")
>>> len(context)
15000
>>> matches = grep(context, r"MIT.*RLM")
>>> expanded = expand_matches(matches, window=500)
>>> summary = summarize(expanded)
>>> FINAL(summary)
```

**Application to Gofer stages**:

- All stages operate in REPL mode
- Agent writes code to manage its own context
- Future: RL training for optimal strategies

**Expected impact**: Order of magnitude improvement (10x+) **Complexity**: Very
High | **Risk**: High (novel approach) | **Effort**: 1-2 months

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (Week 1-2)

**Preserve existing, add low-risk enhancements**

1. **Option 1: Observation Masking** - Immediate 50% reduction
2. **Option 11: Stage Profiles** - Better context utilization
3. **Option 15: Memory-First Loading** - Leverage existing memory system

**Validation**: All existing tests pass, context usage reduced by 40-50%

### Phase 2: Research Enhancement (Week 3-4)

**Improve research document handling**

4. **Option 6: Research Chunking** - Reduce research document burden
5. **Option 13: Health Triggers** - Automatic handoffs at threshold
6. **Option 16: Active Consolidation** - Convert research to memories

**Validation**: Research-heavy workflows remain accurate, memory system grows

### Phase 3: Advanced (Future)

**MIT RLM-inspired improvements**

7. **Option 18: RLM-Lite** - Recursive context folding
8. **Option 19: Parallel Recursive** - Unlimited context handling

**Validation**: Can process 10x larger contexts without degradation

---

## User Stories

### US1: Automatic Context Health Monitoring (P1)

As a developer using Gofer, I want automatic context health monitoring so that
I'm warned before context degradation affects output quality.

**Acceptance Criteria**:

- [ ] Context usage displayed in status bar during Gofer stages
- [ ] Warning at 50% threshold, alert at 70%
- [ ] Automatic handoff trigger at configurable threshold
- [ ] Health metrics logged to `.specify/logs/context-health.jsonl`

### US2: Observation Masking (P1)

As a developer, I want older tool outputs automatically masked so that context
is preserved for current work without losing access to historical information.

**Acceptance Criteria**:

- [ ] Observations older than N turns replaced with placeholders
- [ ] Placeholders include file path, size, and timestamp
- [ ] Full observations recoverable via `gofer_expand_observation` tool
- [ ] 50% reduction in context usage for typical sessions

### US3: Research Document Optimization (P2)

As a developer, I want research documents loaded efficiently so that only
relevant sections consume context.

**Acceptance Criteria**:

- [ ] Research split into semantic chunks with index
- [ ] Index always loaded, chunks on-demand
- [ ] Relevance scoring prioritizes chunks by current task
- [ ] 60% reduction in research context usage

### US4: Memory-First Loading (P1)

As a developer, I want memories loaded before research documents so that
verified, prioritized knowledge takes precedence.

**Acceptance Criteria**:

- [ ] Stage startup loads relevant memories first
- [ ] Research chunks loaded only if memories insufficient
- [ ] Memory priority determines loading order
- [ ] Builds on spec 010 memory system

### US5: Stage-Aware Context Profiles (P2)

As a developer, I want each Gofer stage to optimize context allocation so that
resources are used efficiently for each stage's needs.

**Acceptance Criteria**:

- [ ] Each stage has defined budget profile
- [ ] Automatic adjustment at stage transitions
- [ ] Profiles configurable in `.specify/memory/context-profiles.yaml`
- [ ] Warning when stage exceeds its budget

### US6: RLM-Lite Context Folding (P3 - Future)

As a developer, I want to process extremely large contexts so that Gofer can
handle enterprise-scale codebases.

**Acceptance Criteria**:

- [ ] Context stored as external variable
- [ ] Peek, grep, expand operations available
- [ ] 10x effective context capacity
- [ ] No degradation in output quality

---

## Non-Functional Requirements

### Performance

- Observation masking must complete in <10ms per observation
- Context health check must complete in <50ms
- Memory loading must complete in <200ms for 500 memories
- Research chunk loading must complete in <100ms per chunk

### Observability

- All context operations logged to JSONL
- Context metrics available via status command
- Health history viewable in dashboard

### Compatibility

- MUST preserve all existing Gofer functionality
- MUST work with existing memory system (spec 010)
- MUST integrate with existing session save/resume
- MUST not break Claude Code compatibility

### Reliability

- Observation recovery must have 100% success rate
- Memory consolidation must be idempotent
- Stage checkpoints must be restorable

---

## Success Metrics

| Metric                                 | Current     | Target     | Measurement                 |
| -------------------------------------- | ----------- | ---------- | --------------------------- |
| Context utilization at task completion | ~85%        | <60%       | Average across sessions     |
| Context-related degradation incidents  | Unknown     | <5%        | Manual quality review       |
| Research document context usage        | 100% loaded | 40% loaded | Token counting              |
| Memory-first coverage                  | 0%          | 80%        | Sessions using memory-first |
| Automatic handoff success rate         | N/A         | >95%       | Handoff completion tracking |

---

## Dependencies

### From Spec 010 (Memory System)

- `AgenticMemory` interface with citations and priority
- `MemoryManager` with save/search/forget operations
- `.specify/memory/` storage location
- JSONL logging pattern

### Existing Gofer Components

- `/7_gofer_save` and `/8_gofer_resume` commands
- `.specify/scripts/bash/check-context-health.sh`
- Sub-agent architecture in `.claude/agents/`
- Stage transition logic in commands

### New Components Required

- `ObservationMasker` class for masking/recovery
- `ResearchChunker` class for splitting/indexing
- `ContextHealthMonitor` class for tracking
- `StageContextProfile` configuration
- MCP tools: `gofer_expand_observation`, `gofer_load_chunk`

---

## Out of Scope

- Full RLMEnv REPL implementation (Option 20) - future work
- RL training for context optimization - requires infrastructure
- Vector database for research - hybrid JSON/MD sufficient
- Cross-project memory sharing - project-scoped only
- Real-time collaborative context - single-user sessions

---

## Glossary

| Term                 | Definition                                                    |
| -------------------- | ------------------------------------------------------------- |
| Context Degradation  | Performance decline as context window fills                   |
| Observation Masking  | Replacing tool outputs with minimal placeholders              |
| RLM                  | Recursive Language Model - MIT approach to context management |
| Context Folding      | Treating context as external data rather than prompt          |
| Memory Consolidation | Converting raw findings into verified memory entries          |
| Stage Profile        | Budget allocation for context resources per Gofer stage       |
| Health Trigger       | Automatic action when context threshold exceeded              |

---

## Research Traceability

| Research Finding                  | Options Applied        | Source              |
| --------------------------------- | ---------------------- | ------------------- |
| MIT RLM 10x context               | Options 18, 19, 20     | MIT CSAIL           |
| Observation masking 50% reduction | Options 1, 2, 3, 4, 5  | JetBrains           |
| Sub-agent 28% improvement         | Options 14, 19         | MASAI               |
| Session handoff > compaction      | Options 12, 13         | Amp/Sourcegraph     |
| Memory-first reduces loading      | Options 15, 16, 17     | MemGPT/Letta        |
| Stage-specific budgets            | Options 11, 12, 13, 14 | Context Engineering |
| 50-60% effective context          | All options            | Industry research   |
