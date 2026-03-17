---
feature: '027-multi-provider-cli-support'
created: '2026-03-16T19:30:00Z'
discoveredBy: Claude + douglaswross
status: complete
---

# Business Discovery: Multi-Provider CLI Support

## Problem Statement

**Pain Point**: Gofer currently only supports Claude CLI, limiting users who want to use alternative AI providers like Codex CLI. All Gofer features (pipeline stages, validation, autonomous mode) should work regardless of which CLI provider the user chooses.

**Current State**: Hard-coded dependency on Claude CLI throughout the codebase

**Impact**:
- Users locked into Claude CLI ecosystem
- Cannot leverage Codex CLI or other providers
- No migration path for teams with provider policies

## Target Users

### Primary Users
- **Persona**: Gofer extension users (developers)
- **Technical Level**: Intermediate to advanced developers using VSCode
- **Key Needs**:
  - Flexibility to choose AI provider based on cost, performance, or policy requirements
  - Seamless experience regardless of provider choice
  - Easy switching between providers without workflow disruption

## Value Proposition

**Primary Value**: Comprehensive provider abstraction with:
1. **Provider flexibility** - Switch providers without losing Gofer functionality
2. **Seamless migration path** - Migrate between providers without reconfiguring workflows
3. **Future-proof architecture** - Easy to add new providers (OpenAI, Gemini, etc.)

**Quantified Goal**: Support 2+ CLI providers (Claude, Codex) with zero feature parity gaps

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature parity | 100% | All Gofer commands work identically on Claude CLI and Codex CLI |
| Provider switching friction | <2 clicks | Users can change providers via VSCode settings dropdown |
| Code duplication | 0% | Provider-specific logic isolated in adapters, not scattered |
| Extensibility | <100 LOC | Adding a new provider requires <100 lines in a single adapter file |

## Competitive Analysis

**Status**: To be researched in `/1_gofer_research` phase

Research will include:
- Claude CLI API structure and command patterns
- Codex CLI API structure and command patterns
- API surface area comparison
- Compatibility challenges
- Migration patterns from similar tools (e.g., langchain provider abstraction)

## Discovery Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Problem Focus | All Gofer features must work regardless of provider | Ensures feature parity and prevents vendor lock-in |
| User Target | Gofer extension users (developers) | Primary audience who will benefit from provider choice |
| Value Metric | Comprehensive abstraction (flexibility + migration + extensibility) | Future-proofs Gofer for multi-provider ecosystem |
| Research Scope | Deep dive into Claude CLI + Codex CLI APIs | Need to understand differences to build proper abstraction layer |

## Next Steps

1. `/1_gofer_research` - Research Claude CLI and Codex CLI APIs, command structures, compatibility
2. `/2_gofer_specify` - Create specification with provider abstraction architecture
3. `/3_gofer_plan` - Design adapter pattern, provider registry, VSCode settings integration
4. Continue through pipeline to implementation and validation
