# Implementation Plan: LLM Council Integration

**Branch**: `009-llm-council-integration` | **Date**: 2025-12-30 | **Spec**:
[spec.md](./spec.md) **Input**: Feature specification from
`/specs/009-llm-council-integration/spec.md`

## Summary

Enable SpecGofer's parallel agent workflows to leverage multiple AI providers
(Anthropic, Google/Gemini, xAI/Grok, OpenAI) simultaneously, implementing the
"LLM Council" pattern. Each parallel agent (codebase-locator, analyzer,
pattern-finder) executes across all configured providers in parallel, with the
requesting LLM (e.g., Claude Code) acting as Chairman to synthesize diverse
perspectives into unified outputs.

## Technical Context

**Language/Version**: TypeScript 5.7.2, Node.js 20.x LTS **Primary
Dependencies**: `@anthropic-ai/sdk` (existing), `@google/generative-ai`,
`openai` (for xAI and OpenAI) **Storage**: File-based
(`.specify/memory/council-config.yaml`, `.specify/logs/council-usage.jsonl`)
**Testing**: Vitest for unit tests, mock SDKs for isolation **Target Platform**:
VSCode Extension (cross-platform) **Project Type**: VSCode Extension (existing
monorepo) **Performance Goals**: Council session < 2x single-provider latency
(parallel execution) **Constraints**: Per-provider timeout 30s, minimum quorum
of 2 providers **Scale/Scope**: 4 providers, 5 workflow stages, ~3 parallel
agents per session

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle               | Status | Notes                                             |
| ----------------------- | ------ | ------------------------------------------------- |
| Test-Driven Development | PASS   | Unit tests for all providers, mock SDKs           |
| MCP-First               | N/A    | No MCP changes required (VSCode settings storage) |
| Spec-Kit Compliance     | PASS   | Following full SpecKit workflow                   |
| Strict TypeScript       | PASS   | Interfaces defined in data-model.md               |
| Security                | PASS   | API keys in VSCode secure storage                 |
| Performance             | PASS   | Parallel execution, graceful degradation          |
| Test Coverage           | PASS   | 80%+ coverage target for new code                 |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/009-llm-council-integration/
├── spec.md                  # Feature specification
├── plan.md                  # This file
├── research.md              # Phase 0 codebase analysis + Phase 0.5 tech decisions
├── data-model.md            # 8 entities, 3 state machines
├── checklists/
│   └── requirements.md      # Spec quality validation (all passed)
├── contracts/
│   ├── llm-provider-api.md  # Provider interface contract
│   └── council-orchestrator-api.md  # Orchestrator contract
└── tasks.md                 # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
extension/src/
├── council/                      # NEW: Council module
│   ├── types.ts                  # CouncilConfig, FirstOpinion, etc.
│   ├── CouncilOrchestrator.ts    # Main orchestrator
│   ├── ResponseAggregator.ts     # Collects and anonymizes responses
│   ├── ConfigLoader.ts           # YAML config loading
│   └── providers/
│       ├── LLMProvider.ts        # Abstract interface
│       ├── AnthropicProvider.ts  # Uses existing @anthropic-ai/sdk
│       ├── GoogleProvider.ts     # Uses @google/generative-ai
│       ├── XAIProvider.ts        # Uses openai with custom baseURL
│       └── OpenAIProvider.ts     # Uses openai
├── config.ts                     # MODIFY: Add provider API key getters
└── extension.ts                  # MODIFY: Register council features

extension/package.json            # MODIFY: Add 3 new API key settings

.specify/memory/
└── council-config.yaml           # NEW: Per-project council configuration

.specify/logs/
└── council-usage.jsonl           # NEW: Usage tracking (append-only)

tests/unit/council/               # NEW: Council unit tests
├── CouncilOrchestrator.test.ts
├── ResponseAggregator.test.ts
├── providers/
│   ├── AnthropicProvider.test.ts
│   ├── GoogleProvider.test.ts
│   ├── XAIProvider.test.ts
│   └── OpenAIProvider.test.ts
└── ConfigLoader.test.ts
```

**Structure Decision**: Single extension module following existing patterns in
`extension/src/autonomous/`. New `council/` directory mirrors `autonomous/`
structure with providers as sub-module.

## Key Design Decisions

### 1. Provider SDK Approach

**Decision**: Direct SDKs with abstraction layer (Option D from research)
**Rationale**: No external gateway dependency, full control over rate limiting
and error handling, follows existing Anthropic SDK pattern.

### 2. Provider SDKs

| Provider  | SDK                     | Model                    | Notes                 |
| --------- | ----------------------- | ------------------------ | --------------------- |
| Anthropic | `@anthropic-ai/sdk`     | claude-sonnet-4-20250514 | Already installed     |
| Google    | `@google/generative-ai` | gemini-2.0-flash         | Official SDK          |
| xAI       | `openai`                | grok-3                   | OpenAI-compatible API |
| OpenAI    | `openai`                | gpt-4o                   | Official SDK          |

### 3. Configuration Storage

**Decision**: YAML in `.specify/memory/council-config.yaml` **Rationale**:
Per-project config, version controllable, same location as constitution.

### 4. API Key Storage

**Decision**: VSCode settings with secure storage **Settings**:
`specGofer.googleApiKey`, `specGofer.xaiApiKey`, `specGofer.openaiApiKey`

### 5. Chairman Role

**Decision**: Requesting LLM (Claude Code) acts as Chairman **Rationale**:
Natural flow, no extra API cost for synthesis, leverages existing context.

### 6. Error Handling

**Decision**: Graceful degradation with minimum quorum of 2 **Rationale**: Don't
fail on single provider failure, but require minimum diversity.

## Complexity Tracking

No constitution violations. Complexity justified by feature requirements:

| Component          | Complexity | Justification                  |
| ------------------ | ---------- | ------------------------------ |
| 4 Provider classes | Medium     | Required by spec (4 providers) |
| Parallel execution | Low        | Existing Promise.all pattern   |
| Peer review stage  | Medium     | Optional, adds quality signals |
| Usage logging      | Low        | Append-only JSONL              |

## Integration Points

### Phase 0.5 of /speckit.plan

- CouncilOrchestrator.dispatch() called for each parallel agent
- Chairman synthesis integrated into existing result aggregation

### /speckit.analyze

- Same pattern as Phase 0.5

### /1_research_codebase

- Same pattern for codebase-locator, codebase-analyzer, codebase-pattern-finder

### /3_validate_plan

- Same pattern for validation agents

## Risk Assessment

| Risk                 | Likelihood | Impact | Mitigation                               |
| -------------------- | ---------- | ------ | ---------------------------------------- |
| Provider rate limits | Medium     | Medium | Per-provider rate limiting with p-limit  |
| Cost overruns        | Medium     | Low    | Usage logging, user-visible estimates    |
| Latency increase     | Low        | Medium | Parallel execution, per-provider timeout |
| API changes          | Low        | Medium | Abstraction layer isolates changes       |

## Next Steps

1. **Phase 2**: Generate tasks.md via `/speckit.tasks`
2. **Implementation**: Execute tasks via `/speckit.implement`
3. **Testing**: Unit tests for all providers and orchestrator
4. **Documentation**: Update CLAUDE.md with council commands

---

**Plan Status**: ✅ COMPLETE (Phase 1) **Ready for**: `/speckit.tasks`
