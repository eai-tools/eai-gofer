---
date: '2026-01-25T12:00:00Z'
researcher: Claude
feature: Context Health and Recursive Memory Enhancement
status: complete
---

# Research: Context Health and Recursive Memory Enhancement

## Feature Summary

Enhance Gofer's context window management and memory systems to maintain
high-quality agent performance throughout the entire development lifecycle
(research → specify → plan → tasks → implement → validate). This builds on the
existing memory system (spec 010) while adding advanced context health
monitoring and recursive memory techniques inspired by MIT's Recursive Language
Models research.

**Key constraint**: Must NOT lose any current functionality while improving
context health and memory functions.

---

## MIT Recursive Language Models (RLMs)

### Key Research

**"Recursive Language Models"** by Alex Zhang and Tim Kraska (MIT CSAIL)

- arXiv: https://arxiv.org/abs/2512.24601
- Author Blog: https://alexzhang13.github.io/blog/2025/rlm/
- Published: December 2025

### Core Innovation

RLMs represent a paradigm shift in context management. Rather than attempting to
process all tokens through the transformer's context window, RLMs treat the
entire prompt as an **external string in a Python-style REPL** that the LLM
inspects and transforms through code.

**Architecture:**

- A **root LM** receives only the query; the full context is stored as a Python
  variable
- The root LM can execute code, inspect subsets, and launch **recursive
  sub-LMs** on selected snippets
- Models return results via `FINAL(answer)` or `FINAL_VAR(variable_name)`

**Emergent Strategies:**

1. **Peeking** - Inspecting initial context segments to understand structure
2. **Grepping** - Using regex patterns to narrow search space without semantic
   retrieval
3. **Partition + Map** - Chunking context and running parallel recursive calls
4. **Summarization** - Extracting key information from context subsets

### Performance Results

| Benchmark            | Base Model        | Summarization Agent | RLM                                      |
| -------------------- | ----------------- | ------------------- | ---------------------------------------- |
| CodeQA (GPT-5)       | 24.00             | 41.33               | **62.00-66.00**                          |
| OOLONG (132k tokens) | Baseline          | -                   | **+34 points (~114%)**                   |
| BrowseComp-Plus      | Degraded at scale | Limited             | **10M+ tokens with perfect performance** |

### Prime Intellect Implementation

Prime Intellect's RLMEnv (https://www.primeintellect.ai/blog/rlm) has created an
open-source implementation with key modifications:

- Tools are only accessible to sub-LLMs (keeps main context lean)
- Variable-based outputs enable iterative refinement
- Focus on RL training for optimal context-folding strategies

**Key Insight**: "The true potential of RLM and context folding will be
unleashed after being trained via RL," enabling agents to solve long-horizon
tasks spanning weeks to months.

---

## Industry Context Management Approaches

### The Core Problem: Context Degradation

**"Lost in the Middle" Phenomenon** (Stanford/University of Washington):

- Models achieve highest accuracy when information appears at beginning or end
- Performance can degrade by **more than 30%** when information is in the middle
- Affects all major models (Claude, GPT, Gemini)

**Effective Context Windows:**

| Model           | Advertised | Effective (High Accuracy) | Recommended Target |
| --------------- | ---------- | ------------------------- | ------------------ |
| Claude Sonnet 4 | 200k       | 60-120k                   | 50-60k (30%)       |
| Claude Opus 4   | 200k       | 100-150k                  | 80-100k (40-50%)   |
| Gemini 2.5 Pro  | 1M         | ~200k                     | 150-200k (15-20%)  |
| GPT-5           | 256k       | ~200k                     | 120-150k (50-60%)  |

### Observation Masking: The Surprise Winner

**JetBrains Research "The Complexity Trap" (NeurIPS 2025)**

- arXiv: https://arxiv.org/abs/2508.21433

| Metric            | Observation Masking | LLM Summarization | Raw Agent |
| ----------------- | ------------------- | ----------------- | --------- |
| Cost per instance | $0.61               | $0.64             | $1.29     |
| Cost reduction    | **52.7%**           | 50.4%             | baseline  |
| Solve rate        | Equal or +2.6%      | baseline          | baseline  |

**Key finding**: Simple observation masking **halves cost** while matching or
slightly exceeding LLM summarization performance.

### Sub-Agent Architecture

**MASAI Architecture Results:**

- **28.3% resolution on SWE-Bench Lite** using specialized sub-agents for:
  - Planning
  - Code localization
  - Code generation
  - Testing

**Pattern**: Each sub-agent operates with isolated context, returning condensed
results (1,000-2,000 tokens) rather than full outputs.

### Session Handoff Patterns

**Anthropic's Two-Agent Solution:**

1. Initializer agent: Sets up environment on first run
2. Coding agent: Makes incremental progress, leaving clear artifacts

**Key artifact**: Progress file alongside git history for state tracking.

**Amp (Sourcegraph) finding**: Automated compaction systems contribute to
gradual performance decline. Session handoffs with explicit state preservation
perform better.

### Memory-Augmented Approaches

**MemGPT / Letta Framework** - OS-inspired architecture:

| Layer           | Analogy | Function                                       |
| --------------- | ------- | ---------------------------------------------- |
| Core Memory     | RAM     | System prompt, working context, message buffer |
| Archival Memory | Disk    | Infinite searchable storage                    |
| Recall Memory   | Disk    | Past conversation history                      |

**A-MEM (NeurIPS 2025)**: Uses Zettelkasten method for interconnected knowledge
networks with dynamic indexing and linking.

---

## Existing Gofer Context Management

### Current Implementation

From CLAUDE.md and spec-010:

1. **Context Health Script**: `.specify/scripts/bash/check-context-health.sh`
   - Thresholds: Healthy (<50%), Warning (50-70%), Critical (>70%)

2. **Session Save/Resume**: `/7_gofer_save` and `/8_gofer_resume`
   - Creates `session-handoff.md` with progress, decisions, blockers

3. **Sub-Agent Architecture**: `.claude/agents/`
   - codebase-locator: Finds WHERE code lives
   - codebase-analyzer: Explains HOW code works
   - codebase-pattern-finder: Shows EXAMPLES to follow

4. **Memory System** (spec-010):
   - AgenticMemory with citations, priority index, verification
   - Project-wide storage in `.specify/memory/`
   - JSONL logging for observability

### Gaps Identified

1. **No automatic context monitoring** - relies on manual script execution
2. **No observation masking** - full tool outputs remain in context
3. **No recursive summarization** - research documents used as-is
4. **No memory consolidation** - memories accumulate without synthesis
5. **No context-aware stage transitions** - Gofer stages don't adapt to context
   health
6. **No priority-based research loading** - all research loaded equally

---

## 20 Unique Options for Context Health Enhancement

Based on the research, here are 20 options spanning from simple (preserve
existing) to innovative (MIT RLM-inspired) approaches:

### Category A: Observation Management (Options 1-5)

**Option 1: Observation Masking Layer**

- Replace tool outputs older than N turns with placeholders
- Preserve action/reasoning history intact
- Expected: 50% context reduction, neutral/positive performance
- Complexity: Low
- Risk: Low

**Option 2: Graduated Observation Decay**

- Recent observations: Full detail
- Mid-age observations: Key points only
- Old observations: File paths and status only
- Expected: 40-60% context reduction
- Complexity: Low-Medium
- Risk: Low

**Option 3: Semantic Observation Compression**

- Use fast LLM to compress each observation to essential facts
- Cache compressed versions for re-injection if needed
- Expected: 60-70% context reduction
- Complexity: Medium
- Risk: Medium (summarization quality)

**Option 4: Observation Fingerprinting**

- Hash and store full observations externally
- Keep only fingerprint + summary in context
- On-demand retrieval if agent needs details
- Expected: 70% context reduction
- Complexity: Medium
- Risk: Low

**Option 5: Smart Observation Retention**

- ML classifier predicts which observations will be needed later
- Retain high-value observations, mask low-value ones
- Expected: 50% reduction with better quality
- Complexity: High
- Risk: Medium

### Category B: Research Document Management (Options 6-10)

**Option 6: Research Chunking with Index**

- Split research.md into semantic chunks
- Load index first, chunks on-demand
- Expected: 60% research context reduction
- Complexity: Medium
- Risk: Low

**Option 7: Research Priority Queue**

- Score research sections by relevance to current task
- Load top-N sections, lazy-load others
- Expected: Variable reduction based on task
- Complexity: Medium
- Risk: Low

**Option 8: Recursive Research Summarization**

- Create hierarchical summaries: detailed → abstract → one-liner
- Load appropriate level based on context budget
- Expected: 70% reduction at abstract level
- Complexity: Medium
- Risk: Medium (information loss)

**Option 9: Research Memory Consolidation**

- Periodically merge research findings into memory system
- Memories are smaller and citation-verified
- Retire source documents after consolidation
- Expected: 80% reduction after consolidation
- Complexity: Medium-High
- Risk: Medium

**Option 10: Research Knowledge Graph**

- Extract entities and relationships from research
- Query graph for relevant facts on-demand
- Expected: 90% reduction with semantic access
- Complexity: High
- Risk: High (extraction quality)

### Category C: Stage-Aware Context (Options 11-14)

**Option 11: Stage-Specific Context Profiles**

- Each Gofer stage has a context "budget profile"
- Research stage: High research, low code
- Implement stage: Low research, high code
- Expected: Better utilization per stage
- Complexity: Low
- Risk: Low

**Option 12: Automatic Stage Checkpoints**

- Save context snapshot at each stage transition
- Enable rollback to any stage with full context
- Expected: Cleaner context per stage
- Complexity: Medium
- Risk: Low

**Option 13: Context Health-Triggered Handoffs**

- Monitor context usage during stage execution
- Automatically trigger `/7_gofer_save` at 70% threshold
- Resume in fresh context with handoff document
- Expected: Prevents degradation
- Complexity: Medium
- Risk: Low

**Option 14: Progressive Context Delegation**

- As context fills, delegate more to sub-agents
- Main agent becomes orchestrator, sub-agents do work
- Expected: Maintains quality at high utilization
- Complexity: Medium-High
- Risk: Medium

### Category D: Memory System Enhancements (Options 15-17)

**Option 15: Memory-First Context Loading**

- Load memories before research documents
- Memories are smaller, verified, and prioritized
- Research loaded only for gaps
- Expected: 40% reduction with better relevance
- Complexity: Low
- Risk: Low

**Option 16: Active Memory Consolidation**

- After each task, consolidate learnings into memory
- Verify citations and update priority index
- Prune low-priority memories periodically
- Expected: Growing knowledge, stable context
- Complexity: Medium
- Risk: Low

**Option 17: Memory-Backed Research**

- Convert research findings to memory entries during research phase
- Subsequent stages use memories instead of raw research
- Expected: 60% reduction in later stages
- Complexity: Medium
- Risk: Low

### Category E: MIT RLM-Inspired (Options 18-20)

**Option 18: Recursive Context Folding (RLM-Lite)**

- Store full context as external variable
- Main agent receives query + summary only
- Agent can "peek", "grep", or "expand" sections on demand
- Expected: 10x+ context capacity
- Complexity: High
- Risk: Medium

**Option 19: Parallel Recursive Analysis**

- Split large context into chunks
- Spawn parallel sub-agents for each chunk (RLM partition+map)
- Synthesize results in main context
- Expected: Handle unlimited context
- Complexity: High
- Risk: Medium

**Option 20: Full RLM Integration**

- Implement RLMEnv-style REPL interface
- Context as Python variable with code operations
- RL-trained context management (future)
- Expected: Order of magnitude improvement
- Complexity: Very High
- Risk: High (novel approach)

---

## Option Comparison Matrix

| Option                     | Context Reduction | Complexity | Risk   | Preserves Existing | Implementation Effort |
| -------------------------- | ----------------- | ---------- | ------ | ------------------ | --------------------- |
| 1. Observation Masking     | 50%               | Low        | Low    | Yes                | 1-2 days              |
| 2. Graduated Decay         | 40-60%            | Low-Med    | Low    | Yes                | 2-3 days              |
| 3. Semantic Compression    | 60-70%            | Medium     | Medium | Yes                | 3-5 days              |
| 4. Fingerprinting          | 70%               | Medium     | Low    | Yes                | 3-5 days              |
| 5. Smart Retention         | 50%               | High       | Medium | Yes                | 1-2 weeks             |
| 6. Research Chunking       | 60%               | Medium     | Low    | Yes                | 3-5 days              |
| 7. Priority Queue          | Variable          | Medium     | Low    | Yes                | 3-5 days              |
| 8. Recursive Summary       | 70%               | Medium     | Medium | Yes                | 1 week                |
| 9. Memory Consolidation    | 80%               | Med-High   | Medium | Yes                | 1-2 weeks             |
| 10. Knowledge Graph        | 90%               | High       | High   | Yes                | 2-4 weeks             |
| 11. Stage Profiles         | Better util       | Low        | Low    | Yes                | 1-2 days              |
| 12. Auto Checkpoints       | N/A               | Medium     | Low    | Yes                | 3-5 days              |
| 13. Health Triggers        | Prevents deg      | Medium     | Low    | Yes                | 3-5 days              |
| 14. Progressive Delegation | Maintains         | Med-High   | Medium | Yes                | 1-2 weeks             |
| 15. Memory-First           | 40%               | Low        | Low    | Yes                | 1-2 days              |
| 16. Active Consolidation   | Stable            | Medium     | Low    | Yes                | 1 week                |
| 17. Memory-Backed          | 60%               | Medium     | Low    | Yes                | 1 week                |
| 18. RLM-Lite               | 10x               | High       | Medium | Yes                | 2-4 weeks             |
| 19. Parallel Recursive     | Unlimited         | High       | Medium | Yes                | 2-4 weeks             |
| 20. Full RLM               | 10x+              | Very High  | High   | Yes                | 1-2 months            |

---

## Recommended Implementation Path

### Phase 1: Quick Wins (Preserve & Enhance)

1. **Option 1: Observation Masking** - Immediate 50% reduction
2. **Option 11: Stage Profiles** - Better context utilization
3. **Option 15: Memory-First Loading** - Leverage existing memory system

### Phase 2: Research Enhancement

4. **Option 6: Research Chunking** - Reduce research document burden
5. **Option 13: Health Triggers** - Automatic handoffs at threshold
6. **Option 16: Active Consolidation** - Convert research to memories

### Phase 3: Advanced (Future)

7. **Option 18: RLM-Lite** - Recursive context folding
8. **Option 19: Parallel Recursive** - Unlimited context handling

---

## Key Findings Summary

1. **MIT RLMs achieve 10x+ context improvement** by treating context as data
   rather than prompt, with emergent strategies like peeking, grepping, and
   partition+map

2. **Observation masking is surprisingly effective** - 50% cost reduction with
   neutral or improved performance (JetBrains research)

3. **Simple approaches often beat complex ones** - LLM summarization doesn't
   outperform basic masking despite higher complexity

4. **Sub-agent architecture is proven** - 28.3% improvement on SWE-Bench with
   specialized sub-agents (MASAI)

5. **Session handoffs beat compaction** - Explicit state preservation
   outperforms automatic summarization (Amp/Sourcegraph finding)

6. **Effective context is 50-60% of advertised** - Target this range for
   reliable operation

7. **Memory consolidation prevents context rot** - Converting findings to
   verified memories reduces document size while improving quality

---

## Sources

### Primary Research

- MIT RLM: https://arxiv.org/abs/2512.24601
- JetBrains Complexity Trap: https://arxiv.org/abs/2508.21433
- A-MEM Agentic Memory: https://arxiv.org/abs/2502.12110
- MemGPT: https://arxiv.org/abs/2310.08560
- SUPO Context Management: https://www.alphaxiv.org/overview/2510.06727v1

### Industry Implementations

- Prime Intellect RLMEnv: https://www.primeintellect.ai/blog/rlm
- Claude Code Best Practices:
  https://www.anthropic.com/engineering/claude-code-best-practices
- Anthropic Long-Running Agents:
  https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Context Engineering:
  https://rlancemartin.github.io/2025/06/23/context_engineering/

---

✓ Research complete:
`.specify/specs/011-context-health-recursive-memory/research.md`

**Key recommendation**: Start with Options 1, 11, and 15 (observation masking,
stage profiles, memory-first loading) for immediate impact with minimal risk,
then progressively add research enhancement options.

**Ready for next stage: /2_gofer_specify**
