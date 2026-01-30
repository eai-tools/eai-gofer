---
date: 2025-12-30T12:00:00Z
researcher: Claude
topic: 'LLM Council Integration for Gofer and RPI Workflows'
tags: [research, llm-council, speckit, rpi, multi-llm, decision-making]
status: complete
---

# Research: LLM Council Integration for Gofer and RPI Workflows

## Research Question

How can the LLM Council pattern (from Karpathy's llm-council project) be
integrated into the most relevant stages of Gofer's Gofer and RPI workflows?

## Summary

The LLM Council pattern implements a **three-stage decision-making framework**:

1. **First Opinions** - Multiple LLMs independently answer a query
2. **Peer Review** - LLMs anonymously rank each other's responses
3. **Final Synthesis** - A "Chairman" LLM synthesizes all responses and reviews

This pattern maps excellently to several stages in both Gofer and RPI workflows
where **quality matters more than speed** and **multiple perspectives improve
outcomes**.

## The LLM Council Pattern

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 1: FIRST OPINIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Query ──┬──► LLM A ──► Response A                              │
│           ├──► LLM B ──► Response B                              │
│           └──► LLM C ──► Response C                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 2: PEER REVIEW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   LLM A reviews [B,C] anonymously ──► Rankings A                 │
│   LLM B reviews [A,C] anonymously ──► Rankings B                 │
│   LLM C reviews [A,B] anonymously ──► Rankings C                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STAGE 3: FINAL SYNTHESIS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Chairman LLM receives:                                          │
│   - All responses [A, B, C]                                       │
│   - All peer reviews [Rankings A, B, C]                           │
│   - Synthesizes into final comprehensive answer                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits

1. **Diverse perspectives** - Different models catch different issues
2. **Peer accountability** - Anonymous review removes model bias
3. **Quality synthesis** - Best ideas are combined, not averaged
4. **Reduced hallucination** - Consensus validates accuracy

## Integration Points Analysis

### Gofer Workflow Integration Points

| Stage          | Command              | Council Benefit                         | Priority |
| -------------- | -------------------- | --------------------------------------- | -------- |
| Specification  | `/speckit.specify`   | Multiple perspectives on requirements   | MEDIUM   |
| Planning       | `/speckit.plan`      | Architecture decisions, tech choices    | **HIGH** |
| Analysis       | `/speckit.analyze`   | Cross-checking consistency              | **HIGH** |
| Tasks          | `/speckit.tasks`     | Task decomposition validation           | MEDIUM   |
| Implementation | `/speckit.implement` | Not suitable (execution, not decisions) | LOW      |

### RPI Workflow Integration Points

| Stage          | Command                | Council Benefit            | Priority |
| -------------- | ---------------------- | -------------------------- | -------- |
| Research       | `/1_research_codebase` | Multiple search strategies | MEDIUM   |
| Planning       | `/2_create_plan`       | Design option evaluation   | **HIGH** |
| Validation     | `/3_validate_plan`     | Implementation review      | **HIGH** |
| Implementation | `/4_implement_plan`    | Not suitable (execution)   | LOW      |

## Recommended Integration Stages

### 1. Planning Phase (HIGHEST VALUE)

**Where:** `/speckit.plan` Phase 0.5 (Technology Research) and `/2_create_plan`
Step 2

**Why:** Architecture and technology decisions have the highest long-term
impact. Getting multiple LLM perspectives on:

- Technology stack choices
- Architectural patterns
- Trade-off analysis
- Risk assessment

**Implementation:**

```markdown
## Phase 0.5: Technology Research with LLM Council

### Step 1: First Opinions (Parallel)

Spawn 3 agents with DIFFERENT prompts:

Agent 1 (Conservative): "Recommend the most battle-tested, low-risk approach for
{feature}" Agent 2 (Innovative): "Recommend the most elegant, modern approach
for {feature}" Agent 3 (Pragmatic): "Recommend the fastest-to-implement approach
for {feature}"

### Step 2: Peer Review

Each agent receives anonymized outputs from others and:

- Identifies strengths of each approach
- Identifies weaknesses/risks of each approach
- Ranks approaches by suitability

### Step 3: Synthesis

Chairman agent receives all opinions + reviews:

- Creates unified recommendation
- Explains trade-offs considered
- Provides decision rationale
```

### 2. Analysis/Validation Phase (HIGH VALUE)

**Where:** `/speckit.analyze` and `/3_validate_plan`

**Why:** Quality gates benefit from multiple reviewers. Council can:

- Cross-check for missed requirements
- Identify inconsistencies
- Validate test coverage
- Catch edge cases

**Implementation:**

```markdown
## Analysis with LLM Council

### Step 1: First Opinions (Parallel)

Spawn 3 reviewers with DIFFERENT lenses:

Reviewer 1 (Requirements): "Check if all spec requirements are covered" Reviewer
2 (Architecture): "Check if plan follows sound patterns" Reviewer 3 (Testing):
"Check if success criteria are testable"

### Step 2: Peer Review

Each reviewer validates others' findings:

- Confirm or refute identified issues
- Add missed issues
- Prioritize by severity

### Step 3: Synthesis

Chairman creates unified report:

- Consolidated findings (deduplicated)
- Severity rankings (consensus-based)
- Prioritized action items
```

### 3. Research Phase (MEDIUM VALUE)

**Where:** `/1_research_codebase` parallel agents

**Why:** Multiple search strategies find more relevant code. Council can:

- Use different search patterns
- Cross-validate findings
- Synthesize comprehensive picture

**Current Implementation Already Uses This Pattern:** The existing
`codebase-locator`, `codebase-analyzer`, and `codebase-pattern-finder` agents
are essentially Stage 1 of the Council pattern. Enhancement would add:

- Peer review (agents validate each other's findings)
- Synthesis (unified research document)

## Detailed Design: Council-Enhanced Planning

### Modified `/speckit.plan` Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 0: CODEBASE EXPLORATION                 │
│                    (Existing parallel agents - unchanged)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 0.5: TECHNOLOGY COUNCIL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ FIRST OPINIONS (Parallel Task agents)                       │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Prompt template for each:                                    │ │
│  │ "Given this feature requirement and codebase context,        │ │
│  │  recommend a technology approach. Focus on: {lens}"          │ │
│  │                                                               │ │
│  │ Lens A: Stability (proven tech, maintainability)             │ │
│  │ Lens B: Innovation (modern patterns, developer experience)   │ │
│  │ Lens C: Speed (time-to-market, existing integrations)        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ PEER REVIEW (Parallel Task agents)                          │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Each agent receives anonymized proposals:                    │ │
│  │ "Review these 3 proposals. For each, identify:              │ │
│  │  - Top 2 strengths                                           │ │
│  │  - Top 2 risks/weaknesses                                    │ │
│  │  - Rank by overall suitability (1=best)"                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ SYNTHESIS (Single Task agent)                               │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ "Given these proposals and peer reviews, synthesize:         │ │
│  │  1. Recommended approach (may combine best elements)         │ │
│  │  2. Key trade-offs considered                                │ │
│  │  3. Risk mitigation strategies                               │ │
│  │  4. Decision rationale"                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: DESIGN & CONTRACTS                   │
│                    (Uses council's synthesized decision)         │
└─────────────────────────────────────────────────────────────────┘
```

### Modified `/speckit.analyze` Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYSIS COUNCIL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ FIRST OPINIONS (Parallel analyzers)                         │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Analyzer A: Requirements coverage (spec → tasks)             │ │
│  │ Analyzer B: Architecture consistency (plan → code)           │ │
│  │ Analyzer C: Constitution compliance (rules → artifacts)      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ PEER VALIDATION                                             │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Each analyzer validates others' findings:                    │ │
│  │ - Confirm/refute issues                                      │ │
│  │ - Add missed issues                                          │ │
│  │ - Suggest severity adjustments                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ SYNTHESIS                                                   │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Create unified analysis report with:                         │ │
│  │ - Deduplicated findings                                      │ │
│  │ - Consensus-based severity                                   │ │
│  │ - Prioritized action items                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Recommendations

### Option A: Council-Enabled Mode (User-Selectable)

Add a `--council` flag to relevant commands:

```bash
/speckit.plan --council    # Uses LLM Council for technology decisions
/speckit.analyze --council # Uses LLM Council for validation
/2_create_plan --council   # Uses LLM Council for design options
/3_validate_plan --council # Uses LLM Council for review
```

**Pros:** User controls when to use (time/cost trade-off) **Cons:** Users must
remember to enable

### Option B: Constitution-Configured

Add to `.specify/memory/constitution.md`:

```markdown
## Quality Gates

### LLM Council

- Planning decisions: COUNCIL REQUIRED
- Analysis validation: COUNCIL RECOMMENDED
- Research synthesis: COUNCIL OPTIONAL
```

**Pros:** Consistent enforcement, project-level decisions **Cons:** Less
flexibility per-command

### Option C: Automatic for Critical Decisions

Embed council logic in commands that make irreversible decisions:

- Technology stack selection → Always council
- Architecture patterns → Always council
- Analysis reports → Always council

**Pros:** Quality where it matters most **Cons:** Longer execution time for
planning phase

## Recommended Approach: Hybrid

1. **Constitution-configurable defaults**
2. **Command-line override flags**
3. **Smart defaults based on decision impact**

```markdown
# Constitution setting

quality.council: planning: required # /speckit.plan, /2_create_plan validation:
recommended # /speckit.analyze, /3_validate_plan research: optional #
/1_research_codebase

# Command override

/speckit.plan --no-council # Skip council even if required (user override)
/1_research_codebase --council # Use council even if optional
```

## Code References

- Existing parallel agents: `.claude/commands/speckit.plan.md:39-55`
- RPI research agents: `.claude/commands/1_research_codebase.md:30-35`
- Analysis command: `.claude/commands/speckit.analyze.md:72-113`
- Validation command: `.claude/commands/3_validate_plan.md:23-30`

## Integration Mapping

| LLM Council Stage | Gofer Equivalent             | RPI Equivalent              |
| ----------------- | ---------------------------- | --------------------------- |
| First Opinions    | Parallel Task agents         | Parallel codebase-\* agents |
| Peer Review       | NEW: Cross-validation agents | NEW: Finding validation     |
| Synthesis         | NEW: Chairman synthesis      | NEW: Research consolidation |

## CRITICAL CLARIFICATION: Multi-LLM Architecture

### Current State (INCORRECT for Council)

The existing parallel agents run on a **single LLM** (Claude). This is parallel
execution, NOT diverse perspectives:

```
Claude Code ──┬──► codebase-locator (Claude)     ─┐
              ├──► codebase-analyzer (Claude)     ├──► Same model,
              └──► codebase-pattern-finder (Claude)─┘   same biases
```

### Desired State (TRUE Council)

Each agent type should run across **MULTIPLE different LLMs** simultaneously:

```
┌─────────────────────────────────────────────────────────────────┐
│                  CLAUDE CODE (CHAIRMAN)                          │
│                  Receives original request                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ codebase-     │     │ codebase-     │     │ codebase-     │
│ locator       │     │ analyzer      │     │ pattern-finder│
├───────────────┤     ├───────────────┤     ├───────────────┤
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │  Sonnet   │ │     │ │  Sonnet   │ │     │ │  Sonnet   │ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │Gemini 3Pro│ │     │ │Gemini 3Pro│ │     │ │Gemini 3Pro│ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │   Grok    │ │     │ │   Grok    │ │     │ │   Grok    │ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLAUDE CODE (CHAIRMAN)                          │
│                  Synthesizes all 9 responses                     │
│                  (3 agents × 3 LLMs = 9 perspectives)            │
└─────────────────────────────────────────────────────────────────┘
```

### Why Multi-LLM Matters

| Single LLM                     | Multi-LLM Council                      |
| ------------------------------ | -------------------------------------- |
| Same training data biases      | Diverse training approaches            |
| Same failure modes             | Different failure modes (less overlap) |
| Parallel = faster, not smarter | Parallel = faster AND smarter          |
| 3 specialized views            | 9 specialized + diverse views          |

### Chairman Role

The **Chairman is always the LLM that received the original request**:

- User runs Claude Code → Claude is Chairman
- User runs via different interface → That LLM is Chairman
- Chairman does NOT participate in first opinions (avoids self-bias)
- Chairman synthesizes all council outputs into final answer

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MULTI-LLM COUNCIL FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. DISPATCH (Chairman)                                           │
│     ├── Parse request into agent tasks                           │
│     ├── For each agent task:                                      │
│     │   └── Send to ALL configured LLMs in parallel              │
│     └── Await all responses                                       │
│                                                                   │
│  2. COLLECT (Parallel, Multi-LLM)                                │
│     ├── codebase-locator × [Sonnet, Gemini, Grok]               │
│     ├── codebase-analyzer × [Sonnet, Gemini, Grok]              │
│     └── codebase-pattern-finder × [Sonnet, Gemini, Grok]        │
│                                                                   │
│  3. OPTIONAL: PEER REVIEW (Multi-LLM)                            │
│     ├── Each LLM reviews anonymized outputs from OTHER LLMs     │
│     └── Identifies agreements, conflicts, quality issues         │
│                                                                   │
│  4. SYNTHESIZE (Chairman only)                                    │
│     ├── Receives all first opinions (+ peer reviews if enabled) │
│     ├── Identifies consensus and conflicts                       │
│     ├── Weights by quality indicators                            │
│     └── Produces final synthesized answer                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Required Infrastructure

To implement true multi-LLM council:

1. **Multi-Provider API Gateway** (e.g., OpenRouter, LiteLLM)
   - Single interface to multiple LLM providers
   - Handles authentication per provider
   - Normalizes response formats

2. **Council Configuration**

   ```yaml
   # .specify/memory/council-config.yaml
   council:
     chairman: auto # Use requesting LLM
     members:
       - provider: anthropic
         model: claude-sonnet-4-20250514
       - provider: google
         model: gemini-2.5-pro
       - provider: xai
         model: grok-3
     parallel_agents:
       - codebase-locator
       - codebase-analyzer
       - codebase-pattern-finder
     peer_review: true # Enable stage 2
   ```

3. **MCP Server for Multi-LLM Dispatch**
   - Claude Code calls MCP tool: `council_dispatch`
   - MCP server fans out to all configured LLMs
   - Returns aggregated responses

### Cost/Benefit Analysis

| Metric                | Single LLM (Current) | Multi-LLM Council      |
| --------------------- | -------------------- | ---------------------- |
| API Calls             | 3                    | 9-12 (+ peer review)   |
| Latency               | max(3 parallel)      | max(9 parallel) ≈ same |
| Cost                  | 1×                   | 3-4×                   |
| Perspective Diversity | LOW                  | HIGH                   |
| Hallucination Risk    | Normal               | Reduced (consensus)    |
| Edge Case Coverage    | Normal               | Improved               |

## Next Steps

1. **Prototype in `/speckit.plan`** - Add council to Phase 0.5 technology
   research
2. **Test with real feature** - Use an actual feature spec to validate
3. **Measure quality improvement** - Compare council vs non-council outcomes
4. **Extend to `/speckit.analyze`** - Apply same pattern
5. **Document in CLAUDE.md** - Add council usage guidelines

## Open Questions

1. **Model diversity vs consistency** - Should council use same model or
   different models?
   - Same model: More consistent, easier to implement
   - Different models: More diverse perspectives, requires multi-provider setup

2. **Cost considerations** - Council multiplies API calls by 3-9x
   - First opinions: 3 calls
   - Peer review: 3 calls (each reviewing 2 others)
   - Synthesis: 1 call
   - Total: 7 calls vs 1 call

3. **When to skip council** - Some decisions don't need it
   - Trivial features (< 100 lines of code)
   - Well-established patterns in codebase
   - Time-critical hotfixes
