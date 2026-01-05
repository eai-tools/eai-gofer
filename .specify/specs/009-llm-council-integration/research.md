# Research: LLM Council Integration

**Date**: 2025-12-30 **Feature**: 009-llm-council-integration **Phase**: 0
(Codebase Analysis) + 0.5 (Technology Research)

## Codebase Analysis

### Existing Related Code

**Settings Infrastructure:**

- `extension/package.json:391-601` - VSCode settings definition pattern with
  `specGofer.anthropicApiKey`
- `extension/src/config.ts:64-72` - CONFIG_KEYS constants for type-safe access
- `extension/src/config.ts:97-189` - ConfigManager singleton pattern

**Anthropic SDK Integration:**

- `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts:37-46` - Anthropic
  client initialization
- `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts:601-614` - API call
  pattern with system/user prompts
- `src/utils/ClaudeClient.ts:47-134` - Rate-limited Claude client with p-limit
  (60 req/min)

**Parallel Agent Infrastructure:**

- `.claude/commands/speckit.plan.md:38-55` - Three parallel agents: locator,
  analyzer, pattern-finder
- `.claude/commands/1_research_codebase.md:30-41` - Parallel agent spawning and
  result aggregation
- `.claude/agents/codebase-*.md` - Agent definitions with tool permissions

**MCP Tools:**

- `language-server/src/mcp/toolHandler.ts` - 6 MCP tools: `specgofer_get_specs`,
  `get_next_task`, `execute_task`, `update_task_status`, `validate_code`,
  `run_tests`

**Existing Research:**

- `thoughts/shared/research/005_llm_council_integration.md` - Comprehensive LLM
  Council design document

### Patterns to Follow

**1. VSCode Settings Pattern:**

```json
// extension/package.json - Define setting
"specGofer.anthropicApiKey": {
  "type": "string",
  "default": "",
  "description": "Anthropic API Key...",
  "markdownDescription": "...[link]...",
  "order": 0
}
```

```typescript
// extension/src/config.ts - Read setting
const config = vscode.workspace.getConfiguration('specGofer');
const apiKey = config.get<string>('anthropicApiKey', '');
```

**2. Anthropic SDK Pattern:**

```typescript
// Initialize conditionally
import Anthropic from '@anthropic-ai/sdk';
if (apiKey) {
  this.anthropic = new Anthropic({ apiKey });
}

// Make API call
const response = await this.anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});
```

**3. Parallel Execution Pattern:**

```typescript
// Promise.all with error handling
const results = await Promise.all(
  items.map(async (item) => {
    try {
      return await processItem(item);
    } catch (_error) {
      return null; // Graceful failure
    }
  })
);
const validResults = results.filter((r): r is ResultType => r !== null);
```

**4. Progress Reporting Pattern:**

```typescript
await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: 'Council executing...',
    cancellable: false,
  },
  async (progress) => {
    progress.report({ message: `Provider 1/3`, increment: 33 });
    // ...
  }
);
```

### Reusable Components

| Component                       | Path                                                        | Reuse For                           |
| ------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `ConfigManager`                 | `extension/src/config.ts`                                   | Add new provider API key getters    |
| `ClaudeCodeAutonomousResponder` | `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts` | Extend with multi-provider dispatch |
| `Anthropic SDK`                 | `@anthropic-ai/sdk`                                         | Already installed, use for Claude   |
| `p-limit`                       | `src/utils/ClaudeClient.ts`                                 | Rate limiting for all providers     |
| `yaml`                          | `language-server/package.json`                              | Parse council-config.yaml           |

### Integration Points

**For Multi-Provider Dispatch:**

1. `extension/src/autonomous/ClaudeCodeAutonomousResponder.ts` - Add provider
   abstraction layer
2. `extension/src/config.ts` - Add Google, xAI, OpenAI API key getters
3. `extension/package.json` - Add provider settings

**For Chairman Synthesis:**

1. `.claude/commands/speckit.plan.md:57-79` - Modify synthesis step to include
   multi-LLM aggregation
2. `.claude/commands/1_research_codebase.md:36-41` - Same synthesis pattern to
   enhance

**For Council Configuration:**

1. `.specify/memory/` - Add `council-config.yaml` alongside `constitution.md`
2. `extension/src/autonomous/ContextBuilder.ts` - Load council config with other
   context

## Technology Research

### Decision 1: Multi-Provider SDK Approach

**Options Evaluated:**

| Option                       | Pros                               | Cons                             |
| ---------------------------- | ---------------------------------- | -------------------------------- |
| A. OpenRouter API Gateway    | Single API, 100+ models            | External dependency, cost markup |
| B. LiteLLM Proxy             | Self-hosted, open source           | Requires server setup            |
| C. Direct SDKs per Provider  | No external deps, full control     | More code, different APIs        |
| D. Hybrid: Abstraction Layer | Best of both, provider flexibility | Initial complexity               |

**Decision**: **Option D - Abstraction Layer with Direct SDKs**

**Rationale:**

- SpecGofer already uses `@anthropic-ai/sdk` directly
- Adding Google AI, xAI, and OpenAI SDKs follows same pattern
- Abstraction layer (`LLMProvider` interface) enables future extensibility
- No external gateway dependency or server setup required
- Full control over rate limiting, error handling, cost tracking

### Decision 2: Provider SDKs

| Provider  | SDK                            | Model            | Notes                          |
| --------- | ------------------------------ | ---------------- | ------------------------------ |
| Anthropic | `@anthropic-ai/sdk` (existing) | claude-sonnet-4  | Already integrated             |
| Google    | `@google/generative-ai`        | gemini-2.0-flash | Official SDK, well-maintained  |
| xAI       | `openai` (OpenAI-compatible)   | grok-3           | xAI uses OpenAI-compatible API |
| OpenAI    | `openai`                       | gpt-4o           | Official SDK                   |

### Decision 3: Configuration Storage

**Decision**: YAML file in `.specify/memory/council-config.yaml`

```yaml
council:
  enabled: true
  peer_review: false # Optional stage 2

  providers:
    anthropic:
      enabled: true
      model: claude-sonnet-4-20250514
    google:
      enabled: true
      model: gemini-2.0-flash
    xai:
      enabled: false # Disabled by default
      model: grok-3
    openai:
      enabled: false # Disabled by default
      model: gpt-4o

  stages:
    speckit_plan: council # Use council for planning
    speckit_analyze: council # Use council for analysis
    research_codebase: council # Use council for research
    validate_plan: council # Use council for validation
    implement: single # Single LLM for execution
```

**Rationale:**

- YAML already used in project (frontmatter, MCP config)
- Keeps settings separate from VSCode (per-project config)
- Easy to version control and share
- Constitution lives in same location

### Decision 4: API Key Storage

**Decision**: VSCode Settings with Secure Storage

New settings to add:

```json
"specGofer.googleApiKey": { "type": "string", "default": "" },
"specGofer.xaiApiKey": { "type": "string", "default": "" },
"specGofer.openaiApiKey": { "type": "string", "default": "" }
```

**Rationale:**

- Follows existing `specGofer.anthropicApiKey` pattern
- VSCode handles secure storage
- Environment variables as fallback (existing pattern in mcpConfig.ts)

### Decision 5: Chairman Role

**Decision**: Requesting LLM acts as Chairman (Claude Code in most cases)

**Implementation:**

- When user runs `/speckit.plan` in Claude Code, Claude is Chairman
- Chairman receives all council responses for synthesis
- Chairman is excluded from first opinions (no self-review)
- No separate API call for Chairman synthesis - uses existing context

**Rationale:**

- Natural flow - user's AI synthesizes results
- No extra API cost for synthesis
- Leverages existing context window
- Matches original llm-council concept

### Decision 6: Error Handling Strategy

**Decision**: Graceful Degradation with Minimum Quorum

```typescript
const MIN_QUORUM = 2; // Require at least 2 providers to succeed

const results = await Promise.allSettled(providers.map((p) => p.query(prompt)));
const successful = results.filter((r) => r.status === 'fulfilled');

if (successful.length < MIN_QUORUM) {
  // Fall back to single-provider mode
  return fallbackToSingleProvider(prompt);
}
```

**Rationale:**

- Don't fail entire workflow on single provider failure
- Require minimum diversity for council value
- Fall back gracefully to current behavior

## Architecture Decision

### Component Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        VSCode Extension                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   CouncilOrchestrator                        │ │
│  │  - loadConfig() → CouncilConfig                              │ │
│  │  - dispatch(prompt, agentType) → CouncilSession              │ │
│  │  - synthesize(session) → SynthesizedResult                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐              │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│  │ LLMProvider │     │ LLMProvider │     │ LLMProvider │        │
│  │ (Anthropic) │     │  (Google)   │     │   (xAI)     │        │
│  └─────────────┘     └─────────────┘     └─────────────┘        │
│         │                    │                    │              │
│         └────────────────────┼────────────────────┘              │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     ResponseAggregator                       │ │
│  │  - collectResponses(providers, prompt) → FirstOpinion[]     │ │
│  │  - anonymize(responses) → AnonymizedOpinion[]               │ │
│  │  - peerReview(opinions) → PeerReview[] (optional)           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
extension/src/
├── council/
│   ├── types.ts              # CouncilConfig, FirstOpinion, PeerReview types
│   ├── CouncilOrchestrator.ts # Main orchestrator
│   ├── ResponseAggregator.ts  # Collects and anonymizes responses
│   └── providers/
│       ├── LLMProvider.ts     # Abstract interface
│       ├── AnthropicProvider.ts
│       ├── GoogleProvider.ts
│       ├── XAIProvider.ts
│       └── OpenAIProvider.ts

.specify/memory/
└── council-config.yaml        # Per-project council configuration

extension/package.json         # + 3 new API key settings
```

## Open Questions (Resolved)

1. ~~Model diversity vs consistency~~ → **Direct SDKs with abstraction layer**
2. ~~Cost considerations~~ → **Quorum-based execution, usage logging**
3. ~~When to skip council~~ → **Per-stage config in council-config.yaml**

## Next Steps

1. **Phase 1**: Create `data-model.md` with entity definitions
2. **Phase 1**: Create contracts for LLMProvider interface
3. **Phase 1**: Update plan.md with technical context
4. **Phase 2**: Generate tasks.md (via `/speckit.tasks`)
