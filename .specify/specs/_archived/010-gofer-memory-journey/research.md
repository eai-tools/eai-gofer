---
date: '2026-01-19T11:30:00Z'
researcher: Claude
feature: Gofer Memory and Journey System
status: complete
---

# Research: Gofer Memory and Journey System

## Feature Summary

Enhance the Gofer pipeline with three interconnected capabilities:

1. **Agentic Memory System** - Continuous memory storage/retrieval as the agent
   works, storing memories in JSON/.md files accessible during every decision
2. **Interactive Customer Journey Mapping** - Confirm user/customer journeys
   interactively, then generate 10-50 industry variants for innovation discovery
3. **Multi-Option Sequence Diagrams** - Generate 5 implementation options
   spanning efficiency to innovation

## Codebase Analysis

### Where to Implement

| Component           | Location                                     | Purpose                                            |
| ------------------- | -------------------------------------------- | -------------------------------------------------- |
| Memory Storage      | `extension/src/autonomous/MemoryManager.ts`  | Existing memory CRUD - extend for agentic patterns |
| Memory Types        | `extension/src/autonomous/memory.ts`         | Memory interface definitions                       |
| Context Builder     | `extension/src/autonomous/ContextBuilder.ts` | Injects memories into agent context                |
| Business Scenario   | `.claude/commands/0_business_scenario.md`    | Entry point - add journey mapping                  |
| Research Command    | `.claude/commands/1_gofer_research.md`       | Add journey variant generation                     |
| Specify Command     | `.claude/commands/2_gofer_specify.md`        | Add sequence diagram options                       |
| Plan Command        | `.claude/commands/3_gofer_plan.md`           | Add multi-option architecture                      |
| Memory Storage Path | `.specify/memory/`                           | Constitution, config, decisions                    |
| Journey Artifacts   | `.specify/specs/{feature}/journeys/`         | New: journey variants storage                      |

### Existing Patterns to Follow

#### Pattern 1: Memory Entity Structure

Found in: `extension/src/autonomous/memory.ts`

```typescript
interface Memory {
  id: string; // UUID
  category: string; // e.g., "api_patterns", "preferences"
  tags: string[]; // For search
  scope: 'local' | 'global';
  content: string; // 1-10,000 characters
  created: number; // Unix ms
  lastUsed: number;
  usedCount: number;
  learnedFrom: string; // spec-id or "user_interaction"
}
```

Why relevant: This is the existing memory schema - extend it for agentic
memories with citations and verification.

#### Pattern 2: YAML Config with File Watching

Found in: `extension/src/council/ConfigLoader.ts`

```typescript
export class ConfigLoader {
  private cachedConfig: CouncilConfig | null = null;
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  async loadConfig(): Promise<CouncilConfig> {
    if (this.cachedConfig) return this.cachedConfig;
    const yamlContent = fs.readFileSync(configPath, 'utf-8');
    const parsed = parseYamlConfig(yamlContent);
    return validateConfig(parsed);
  }

  onConfigChange(callback: ConfigChangeCallback): vscode.Disposable;
}
```

Why relevant: Journey configuration should follow this pattern for live updates.

#### Pattern 3: JSONL Logging for Append-Only Data

Found in: `extension/src/council/UsageLogger.ts`

```typescript
async appendUsageLog(entry: UsageLogEntry): Promise<void> {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logPath, line, 'utf-8');
}
```

Why relevant: Memory operations should be logged in JSONL for observability.

#### Pattern 4: AskUserQuestion for Interactive Flows

Found in: `.claude/commands/0_business_scenario.md`

```markdown
Present these options using the AskUserQuestion tool:

| Option                 | Description                             |
| ---------------------- | --------------------------------------- |
| **A. New Feature**     | Build something new from scratch        |
| **B. Modify Existing** | Change or extend existing functionality |
```

Why relevant: Journey mapping will use this pattern for user confirmation.

#### Pattern 5: Session Handoff with YAML Frontmatter

Found in: `.specify/templates/session-handoff-template.md`

```markdown
---
feature: '[Feature Name]'
session: 1
created: '[ISO timestamp]'
stage: '[current stage]'
---

# Session Handoff: [Feature Name]

## Current State

### Pipeline Progress

| Stage | Status | Artifact |
```

Why relevant: Journey variants and sequence diagrams should use similar
structured markdown.

### Integration Points

1. **ContextBuilder.buildContext()** - Inject agentic memories before each agent
   decision
2. **MemoryManager.save()** - Add citation tracking and verification fields
3. **0_business_scenario.md** - Add journey confirmation step before routing
4. **1_gofer_research.md** - Add industry variant generation after research
5. **2_gofer_specify.md** - Add sequence diagram option generation
6. **3_gofer_plan.md** - Generate 5 architectural options with trade-offs

### Related Code

- `extension/src/autonomous/MemoryManager.ts:72-107` - Memory save with
  validation
- `extension/src/autonomous/MemoryManager.ts:115-163` - Memory search with
  filters
- `extension/src/autonomous/ContextBuilder.ts` - Context injection
- `extension/src/council/ConfigLoader.ts` - YAML config pattern
- `.specify/scripts/bash/save-checkpoint.sh` - Session state capture

## Technology Decisions

### Decision 1: Agentic Memory Storage Format

- **Choice**: Hybrid JSON + Markdown
  - `memories.json` - Structured data with citations
  - `memory-notes/{id}.md` - Human-readable summaries
- **Rationale**: GitHub Copilot uses citation-based verification. JSON enables
  programmatic access while markdown enables human review.
- **Alternatives considered**:
  - Pure JSON (less human-readable)
  - Pure Markdown (harder to query)
  - Vector database (overkill for local storage)

### Decision 2: Agentic Memory Schema Extension

- **Choice**: Extend existing Memory interface with:

  ```typescript
  interface AgenticMemory extends Memory {
    citations: Citation[]; // Code locations referenced
    verified: boolean; // Last verification status
    verifiedAt: number; // Timestamp of last verification
    confidence: 'high' | 'medium' | 'low';
    memoryType: 'pattern' | 'decision' | 'constraint' | 'preference';
    priorityIndex: number; // Increments on use/update (NOT on retrieval)
    decisionUseCount: number; // Times used in agent decisions
    updateCount: number; // Times content was modified
  }

  interface Citation {
    file: string;
    line: number;
    snippet: string;
    hash: string; // For change detection
  }
  ```

- **Rationale**:
  - Follows GitHub Copilot's just-in-time verification approach with citations
  - Priority index ensures frequently-used memories surface first
  - Separate counters for decisions vs updates enables analysis
  - No TTL - popularity-based retention instead of time-based
- **Alternatives considered**:
  - TTL-based expiration (doesn't capture value)
  - Zettelkasten-style linking (more complex)
  - Simple key-value (less structured)

### Decision 3: Memory Operation Hooks

- **Choice**: Hook into agent decisions at these points:
  1. **Before tool call** - Check relevant memories
  2. **After task completion** - Store learnings
  3. **On error recovery** - Store what failed and why
  4. **On user clarification** - Store preferences
- **Rationale**: Captures actionable knowledge without overwhelming storage
- **Alternatives considered**:
  - After every decision (too noisy)
  - Only manual triggers (misses patterns)

### Decision 4: Journey Variant Generation Approach

- **Choice**: Template-based generation with industry mapping and random count
  ```yaml
  journey_generation:
    variant_count: random(10, 50) # Random each time
    industries:
      - retail
      - healthcare
      - finance
      - education
      - hospitality
      - logistics
      - manufacturing
      - legal
      - real_estate
      - entertainment
    distribution: proportional # Spread across industries
  ```
- **Rationale**:
  - Random 10-50 count provides variety while staying reasonable
  - Structured industry list enables consistent cross-industry innovation
  - Proportional distribution ensures diverse perspectives
- **Alternatives considered**:
  - Fixed count (less variety)
  - Pure LLM generation (inconsistent)
  - Predefined database (not flexible)

### Decision 5: Sequence Diagram Options Structure

- **Choice**: Generate 5 options with defined spectrum and cost/complexity
  scores: | Option | Focus | Efficiency | Complexity | Innovation | Est. Effort
  | |--------|-------|------------|------------|------------|-------------| | 1.
  Minimal | Fastest implementation | 95% | Low | 10% | 1-2 days | | 2. Efficient
  | Optimal performance | 80% | Medium-Low | 30% | 3-5 days | | 3. Standard |
  Best practices | 60% | Medium | 50% | 1-2 weeks | | 4. Enhanced | Rich Gen AI
  support | 40% | Medium-High | 70% | 2-3 weeks | | 5. Innovative | Maximum
  augmentation | 20% | High | 95% | 3-4 weeks |

  Each option includes:
  - Mermaid sequence diagram
  - Actor/system inventory
  - Gen AI touchpoints highlighted
  - Estimated implementation effort
  - Risk assessment

- **Rationale**: Gives user clear choices with quantified trade-offs
- **Alternatives considered**:
  - 3 options (not enough range)
  - 7+ options (decision paralysis)
  - No estimates (harder to choose)

### Decision 6: Journey and Diagram Storage Format

- **Choice**: Mermaid-based sequence diagrams in markdown

  ````markdown
  # Journey Variant: Healthcare Appointment Scheduling

  ## Actors

  - Patient (User)
  - AI Scheduling Agent
  - Calendar System
  - Provider

  ## Sequence Diagram

  ```mermaid
  sequenceDiagram
    Patient->>AI Agent: Request appointment
    AI Agent->>Calendar: Check availability
    Calendar-->>AI Agent: Available slots
    AI Agent->>Patient: Suggest times
  ```
  ````

  ```

  ```

- **Rationale**: Mermaid renders in VS Code, GitHub, and documentation tools
- **Alternatives considered**:
  - PlantUML (less native support)
  - JSON schema (not visual)

## External Research: Agentic Memory Systems (2026)

### GitHub Copilot Approach

Source:
[GitHub Blog - Building an Agentic Memory System](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)

Key findings:

- **Repository-scoped**: Memories stay within repository boundaries
- **Just-in-time verification**: Validate citations before applying memories
- **Self-healing**: Agents discover contradictions and update incorrect memories
- **Results**: 7% improvement in PR merge rates, 2% increase in positive
  feedback

### Industry Memory Architecture Patterns

Sources:

- [AWS AgentCore Long-Term Memory](https://aws.amazon.com/blogs/machine-learning/building-smarter-ai-agents-agentcore-long-term-memory-deep-dive/)
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110)
- [LangChain Memory Concepts](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)

Key patterns:

1. **Two-layer architecture**: Working memory (short-term) + Persistent memory
   (long-term)
2. **Memory lifecycle**: generation → storage → retrieval → integration →
   updating → forgetting
3. **Zettelkasten method**: Interconnected knowledge networks with dynamic
   indexing
4. **Vector + graph hybrid**: Semantic search with relationship tracking

### AI Customer Journey Trends (2026)

Sources:

- [CX Trends 2026 - Orange Business](https://perspective.orange-business.com/en/cx-trends-for-2026-ai-first-service-intelligent-journeys-and-value-driven-orchestration/)
- [AI Agent Trends 2026 - Google Cloud](https://cloud.google.com/resources/content/ai-agent-trends-2026)
- [Customer Journey Automation 2026](https://www.roboticmarketer.com/how-ai-marketing-2026-will-transform-customer-journey-automation-and-retention/)

Key trends:

1. **Identity-driven journeys**: Every interaction driven by who the customer is
2. **Autonomous journey agents**: Managing thousands of individualized paths
3. **Cross-platform agent collaboration**: A2A protocols enabling multi-vendor
   agents
4. **Trust by design**: Clear consent, explainability, human escalation

## Constraints & Considerations

1. **Context Window Limits**: Memory injection must be selective to avoid
   context bloat
2. **Verification Overhead**: Citation checking adds latency - cache
   verification results
3. **Journey Generation Quality**: LLM variants need quality filters to avoid
   repetition
4. **Sequence Diagram Complexity**: 5 options should be meaningfully different,
   not just variations
5. **Backward Compatibility**: Existing MemoryManager API must remain stable
6. **File System Performance**: JSONL append vs JSON rewrite trade-off for
   memory storage

## Open Questions (Resolved)

1. **Memory expiration approach?**
   - **Answer**: No TTL. Use **priority index** instead.
   - Priority increments when memory is:
     - Used in AI agent decisions (+1)
     - Updated/modified (+1)
   - **Important**: Retrieving memories for context injection does NOT count as
     use (prevents update loops)
   - Higher priority memories surface first in agent context

2. **Journey variant count?**
   - **Answer**: Random number between 10-50 each time
   - Provides variety while staying within reasonable bounds

3. **Cost/complexity estimates in sequence diagrams?**
   - **Answer**: Yes, include if possible
   - Each option should show efficiency/complexity/innovation scores

4. **Memory sharing across features?**
   - **Answer**: Yes, memories shared project-wide
   - All features within `.specify/` can access shared memory pool

## Recommendations

1. **Start with memory hooks** - Add agentic memory storage to existing
   MemoryManager before touching commands
2. **Implement priority index system** - Increment on decision use (+1) and
   update (+1), NOT on retrieval
3. **Implement citation verification** - Follow GitHub Copilot's just-in-time
   pattern
4. **Use structured prompts for journey generation** - Template-based approach
   with random(10,50) count
5. **Generate sequence diagrams in Mermaid** - Native VS Code rendering, easy to
   edit
6. **Add memory observability** - JSONL logging for all memory operations
7. **Include cost/complexity estimates** - Each sequence diagram option shows
   effort, complexity, innovation scores
8. **Share memories project-wide** - Store in `.specify/memory/` accessible to
   all features
9. **Sort memories by priority index** - Highest priority memories injected into
   context first

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ENHANCED GOFER PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  AGENTIC MEMORY LAYER (runs throughout pipeline)                │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │    │
│  │  │ Store   │ │ Verify  │ │ Retrieve│ │ Update  │              │    │
│  │  │ Memory  │ │Citations│ │ Context │ │ /Forget │              │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  0. /0_business_scenario                                                │
│     ├── Confirm user/customer journey interactively                     │
│     ├── Identify actors (users, agents, systems)                        │
│     └── Store journey context as memory                                 │
│                           ↓                                              │
│  1. /1_gofer_research                                                   │
│     ├── Deep codebase exploration                                       │
│     ├── Generate 10-50 journey variants from similar industries         │
│     └── Store research findings as memories                             │
│                           ↓                                              │
│  2. /2_gofer_specify                                                    │
│     ├── Feature specification informed by research                      │
│     ├── Generate 5 sequence diagram options (efficiency→innovation)     │
│     └── User selects preferred approach                                 │
│                           ↓                                              │
│  3-6. [Existing pipeline continues with memory support]                 │
│                                                                          │
│  Artifacts:                                                              │
│  .specify/specs/{feature}/                                              │
│  ├── research.md                                                        │
│  ├── journeys/                     ← NEW                                │
│  │   ├── base-journey.md                                                │
│  │   ├── variants/                                                      │
│  │   │   ├── retail-001.md                                              │
│  │   │   ├── healthcare-001.md                                          │
│  │   │   └── ...                                                        │
│  │   └── selected-journey.md                                            │
│  ├── sequence-diagrams/            ← NEW                                │
│  │   ├── option-1-minimal.md                                            │
│  │   ├── option-2-efficient.md                                          │
│  │   ├── option-3-standard.md                                           │
│  │   ├── option-4-enhanced.md                                           │
│  │   ├── option-5-innovative.md                                         │
│  │   └── selected-option.md                                             │
│  ├── spec.md                                                            │
│  └── ...                                                                │
│                                                                          │
│  .specify/memory/                                                        │
│  ├── agentic-memories.json         ← NEW                                │
│  ├── memory-notes/                 ← NEW                                │
│  │   └── {uuid}.md                                                      │
│  └── memory-log.jsonl              ← NEW                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

✓ Research complete: `.specify/specs/010-gofer-memory-journey/research.md`

**Key findings:**

- Existing MemoryManager provides foundation - extend with citations and
  verification
- GitHub Copilot's just-in-time verification pattern is proven (7% PR
  improvement)
- Journey variants should use template-based generation with industry mapping
- 5 sequence diagram options should span minimal→innovative spectrum
- Use Mermaid for diagrams, JSONL for memory logging

**Ready for next stage: /2_gofer_specify**
