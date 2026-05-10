# Multi-Agent Architecture

**Enterprise AI Pty Ltd - Sub-Agents and LLM Council Patterns**

_Last Updated: January 2026_

---

## Executive Summary

This document describes advanced patterns for multi-agent AI systems, including
sub-agent architecture for context management and the LLM Council pattern for
multi-provider consensus. These techniques significantly improve output quality
and solve context window limitations.

---

## 1. Sub-Agent Architecture

### The Problem

As context windows fill with tool outputs, conversation history, and code, LLM
accuracy degrades. A single agent trying to do everything accumulates context
faster than it can productively use it.

### The Solution: Specialized Sub-Agents

Use specialized sub-agents with **clean context windows** that return condensed
results:

```text
Main Agent (orchestrator, large context)
  ├── Locator Agent (small, focused) → Returns file paths only
  ├── Analyzer Agent (small, focused) → Returns summaries only
  └── Pattern Agent (small, focused) → Returns examples only
```

Each sub-agent:

- Starts with a **fresh context window**
- Has a **single focused responsibility**
- Returns **condensed results** (1,000-2,000 tokens)
- Doesn't carry forward conversation history

### Benefits

1. **Context Efficiency**: Sub-agents don't pollute main context with tool
   outputs
2. **Parallel Execution**: Multiple sub-agents can run simultaneously
3. **Specialization**: Each agent is optimized for its task
4. **Cost Reduction**: Smaller contexts = cheaper API calls

---

## 2. Recommended Sub-Agents

### Codebase Locator

**Purpose**: Find WHERE code lives without reading it

**Tools**: Grep, Glob, LS (file listing)

**Output Format**:

```markdown
## Located: [Search Query]

### Files Found

- `src/auth/UserService.ts` - User authentication logic
- `src/auth/TokenManager.ts` - JWT token handling
- `src/api/authRoutes.ts` - Auth API endpoints

### Related Directories

- `src/auth/` - All authentication code
- `tests/auth/` - Auth test files
```

### Codebase Analyzer

**Purpose**: Explain HOW code works by reading and tracing

**Tools**: Read, Grep, Glob, LS

**Output Format**:

```markdown
## Analysis: [Component Name]

### Overview

High-level description of component's role.

### Core Logic Flow

1. Request enters at `handler.ts:12`
2. Validation in `validator.ts:34`
3. Business logic in `service.ts:56`
4. Data persisted via `repository.ts:78`

### Key Functions

- `processData()` (service.ts:56) - Transforms input
- `validateInput()` (validator.ts:34) - Validates data

### Dependencies

- External: axios, lodash
- Internal: config, logger
```

### Pattern Finder

**Purpose**: Show EXAMPLES to follow from existing code

**Tools**: Grep, Glob, Read, LS

**Output Format**:

````markdown
## Pattern: [Pattern Name]

### Example 1: UserService.ts

Location: src/services/UserService.ts:45-78

```typescript
export class UserService {
  async create(data: UserInput): Promise<User> {
    // validation
    // business logic
    // persistence
  }
}
```
````

### Example 2: ProductService.ts

[Similar pattern in different context]

### Pattern Summary

- Always validate input first
- Use repository for persistence
- Return typed promises

````

---

## 3. Orchestrating Sub-Agents

### Dispatch Pattern

```typescript
async function research(query: string): Promise<ResearchResult> {
  // Launch sub-agents in parallel
  const [locations, analysis, patterns] = await Promise.all([
    locatorAgent.find(query),      // Fresh context
    analyzerAgent.analyze(query),  // Fresh context
    patternAgent.findPatterns(query), // Fresh context
  ]);

  // Main agent receives condensed results (~3-6k tokens total)
  return {
    locations,    // ~1-2k tokens
    analysis,     // ~1-2k tokens
    patterns,     // ~1-2k tokens
  };
}
````

### Context Preservation

Sub-agent results are **not** added to main context verbatim. Instead:

1. Sub-agent runs with fresh context
2. Sub-agent returns structured summary
3. Summary is stored in memory file (not context)
4. Main agent references memory file as needed

---

## 4. LLM Council Pattern

### Overview

The LLM Council pattern implements **multi-provider consensus** through:

1. **First Opinions** - Multiple LLMs independently answer
2. **Peer Review** (optional) - LLMs anonymously rank each other
3. **Final Synthesis** - Chairman LLM combines best insights

### Visual Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 1: FIRST OPINIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Query ──┬──► Claude (Anthropic) ──► Response A                 │
│           ├──► Gemini (Google)    ──► Response B                 │
│           └──► GPT (OpenAI)       ──► Response C                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               STAGE 2: PEER REVIEW (Optional)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Claude reviews [B,C] anonymously ──► Rankings A                │
│   Gemini reviews [A,C] anonymously ──► Rankings B                │
│   GPT reviews [A,B] anonymously    ──► Rankings C                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STAGE 3: FINAL SYNTHESIS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Chairman (Claude) receives:                                     │
│   - All responses [A, B, C]                                       │
│   - All peer reviews [Rankings A, B, C]                           │
│   - Synthesizes comprehensive final answer                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits

1. **Diverse perspectives** - Different models catch different issues
2. **Peer accountability** - Anonymous review removes model bias
3. **Quality synthesis** - Best ideas combined, not averaged
4. **Reduced hallucination** - Consensus validates accuracy

---

## 5. When to Use Council Mode

### High Value (Enable Council)

| Stage      | Why Council Helps                          |
| ---------- | ------------------------------------------ |
| Research   | Multiple search strategies find more       |
| Planning   | Architecture decisions benefit from debate |
| Validation | Multiple reviewers catch more issues       |

### Low Value (Skip Council)

| Stage          | Why Not                          |
| -------------- | -------------------------------- |
| Implementation | Execution doesn't need debate    |
| Task breakdown | Structured task, less subjective |
| Simple queries | Overhead not worth it            |

---

## 6. Council Configuration

### Configuration File

Create `.specify/memory/council-config.yaml`:

```yaml
# Enable/disable council mode globally
enabled: true

# Minimum providers required (quorum)
quorum: 2

# Timeout per request in milliseconds
timeout: 30000

# Enable optional peer review stage
peerReview: false

# Stages where council mode is active
stages:
  gofer_research: true
  gofer_plan: true
  gofer_validate: true

# Provider configuration
providers:
  - providerId: anthropic
    enabled: true
    weight: 1.0
  - providerId: google
    enabled: true
    weight: 1.0
  - providerId: openai
    enabled: true
    weight: 1.0
```

### API Keys

Configure in VSCode Settings:

- `gofer.anthropicApiKey` - Anthropic (Claude)
- `gofer.googleApiKey` - Google (Gemini)
- `gofer.openaiApiKey` - OpenAI

---

## 7. Council Implementation

### Dispatch Phase

```typescript
async function dispatchToCouncil(query: string): Promise<Response[]> {
  const enabledProviders = config.providers.filter((p) => p.enabled);

  const responses = await Promise.allSettled(
    enabledProviders.map((provider) =>
      callProvider(provider.providerId, query, config.timeout)
    )
  );

  // Require quorum
  const successful = responses.filter((r) => r.status === 'fulfilled');
  if (successful.length < config.quorum) {
    throw new Error(`Quorum not met: ${successful.length}/${config.quorum}`);
  }

  return successful.map((r) => r.value);
}
```

### Anonymization

```typescript
function anonymizeResponses(responses: Response[]): AnonymizedResponse[] {
  const labels = ['Member A', 'Member B', 'Member C', 'Member D'];

  // Shuffle to prevent order bias
  const shuffled = [...responses].sort(() => Math.random() - 0.5);

  return shuffled.map((response, index) => ({
    label: labels[index],
    content: response.content,
    // Provider identity hidden
  }));
}
```

### Synthesis

```typescript
async function synthesize(
  query: string,
  anonymizedResponses: AnonymizedResponse[],
  peerReviews?: PeerReview[]
): Promise<string> {
  const synthesisPrompt = `
You are the Chairman synthesizing responses from multiple AI council members.

## Original Query
${query}

## Council Responses
${anonymizedResponses.map((r) => `### ${r.label}\n${r.content}`).join('\n\n')}

${peerReviews ? `## Peer Reviews\n${formatPeerReviews(peerReviews)}` : ''}

## Your Task
Synthesize the best insights from all responses into a comprehensive answer.
Identify areas of consensus and note any important disagreements.
`;

  return await callChairman(synthesisPrompt);
}
```

---

## 8. Cost Visibility

Council mode increases token usage proportionally. Track usage:

```json
{
  "timestamp": "2026-01-17T10:30:00Z",
  "query": "How should we structure the auth module?",
  "stage": "gofer_plan",
  "providers": {
    "anthropic": { "inputTokens": 1200, "outputTokens": 800 },
    "google": { "inputTokens": 1200, "outputTokens": 750 },
    "openai": { "inputTokens": 1200, "outputTokens": 820 }
  },
  "totalTokens": 5970,
  "estimatedCost": "$0.08",
  "duration": 12500
}
```

Log to `.specify/logs/council-usage.jsonl` for analysis.

---

## 9. Best Practices

### Sub-Agents

1. **Keep sub-agents focused** - One task per agent
2. **Limit output size** - 1-2k tokens max
3. **Use structured output** - Markdown with headers
4. **Don't share context** - Each agent starts fresh
5. **Parallelize when possible** - Reduce wall-clock time

### Council Mode

1. **Use for decisions, not execution** - Council adds value for subjective work
2. **Set appropriate quorum** - 2 providers minimum for redundancy
3. **Monitor costs** - Council multiplies API usage
4. **Disable peer review initially** - Adds latency and cost
5. **Log everything** - Debug consensus issues

---

## 10. Integration with Gofer Pipeline

### Research Stage

```text
/1_gofer_research
    │
    ├── Locator Agent ──► File locations
    ├── Analyzer Agent ──► Implementation analysis
    └── Pattern Agent ──► Code examples
    │
    ▼
research.md (condensed from all three)
```

### Planning Stage (with Council)

```text
/3_gofer_plan
    │
    ├── Claude ──► Architecture A
    ├── Gemini ──► Architecture B
    └── GPT ──► Architecture C
    │
    ▼
Chairman synthesis ──► plan.md
```

---

## References

- [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md) - Core principles
- [AGENT_TOOLING_REFERENCE.md](AGENT_TOOLING_REFERENCE.md) - MCP tools
- Karpathy's LLM Council: https://github.com/karpathy/llm-council
- Model Context Protocol: https://modelcontextprotocol.io/

---

**© 2026 Enterprise AI Pty Ltd. All rights reserved.**
