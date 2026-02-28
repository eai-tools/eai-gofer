---
date: '2026-02-28T14:00:00Z'
researcher: Claude
feature: '003-multi-perspective-agents'
status: complete
---

# Research: Multi-Perspective Sub-Agent Strategies

## Feature Summary

Implement 20 multi-perspective sub-agent strategies across all 6 Gofer pipeline stages. The core pattern is **"diverge first, then converge"** — spawn multiple agents that each take a genuinely different approach, then use a judge/synthesis agent to pick the best or combine the best parts. Additionally:

- Each sub-agent must specify the optimal model (haiku/sonnet/opus) based on task complexity
- Each strategy gets a dedicated agent definition file (`.claude/agents/`) and integration into existing pipeline commands
- The pipeline must enforce minimal-change principles (only changes necessary, no scope creep)
- Task progress must update in the Specification list on manual refresh (already functional — see findings)

## Codebase Analysis

### Current Agent Infrastructure

The Gofer pipeline already implements diverge-then-converge at two levels:

| Layer | Location | Pattern | Example |
|-------|----------|---------|---------|
| **Claude Code sub-agents** | `.claude/agents/*.md` + `.claude/commands/*.md` | Task tool with `subagent_type` | 3 research agents, 6 validation agents |
| **LLM Council module** | `extension/src/council/` | `Promise.allSettled` across LLM providers | Anthropic + Google + OpenAI in parallel |

**Existing agents (10 total):**

| Agent | File | Tools | Role |
|-------|------|-------|------|
| `codebase-locator` | `.claude/agents/codebase-locator.md` | Grep, Glob, LS | Find WHERE code lives |
| `codebase-analyzer` | `.claude/agents/codebase-analyzer.md` | Read, Grep, Glob, LS | Explain HOW code works |
| `codebase-pattern-finder` | `.claude/agents/codebase-pattern-finder.md` | Grep, Glob, Read, LS | Find EXAMPLES to follow |
| `validation-correctness` | `.claude/agents/validation-correctness.md` | Read, Grep, Glob, LS | Spec compliance |
| `validation-security` | `.claude/agents/validation-security.md` | Read, Grep, Glob, LS | Security analysis |
| `validation-performance` | `.claude/agents/validation-performance.md` | Read, Grep, Glob, LS | Performance analysis |
| `validation-test-quality` | `.claude/agents/validation-test-quality.md` | Read, Grep, Glob, LS | Test quality |
| `validation-integration` | `.claude/agents/validation-integration.md` | Read, Grep, Glob, LS | Integration contracts |
| `validation-standards` | `.claude/agents/validation-standards.md` | Read, Grep, Glob, LS | Constitution/patterns |
| `engineer-review` | `.claude/agents/engineer-review.md` | Read, Grep, Glob, LS | Spec/plan/task alignment |

### Agent Definition File Structure

Every agent follows this template (from `validation-correctness.md`):

```yaml
---
name: agent-name
description: One-line description
tools: Read, Grep, Glob, LS
---
```

Followed by sections:
1. Role description paragraph
2. `## Core Responsibilities` — 2-4 focused areas
3. `## Analysis Strategy` — numbered steps
4. `## Output Format` — structured template, **<2000 tokens**
5. `## Blocking Criteria` — what causes failure
6. `## Important Guidelines` — domain-specific rules
7. `## LLM Council Mode` — required section per project convention

### Where to Implement

| Component | Location | Purpose |
|-----------|----------|---------|
| Agent definitions (20 new) | `.claude/agents/` | Define each strategy's sub-agent role |
| Judge agent (1 new) | `.claude/agents/multi-perspective-judge.md` | Converge/synthesis step |
| Pipeline integration | `.claude/commands/1-6_gofer_*.md` | Invoke strategies at appropriate stages |
| Copilot mirrors | `.github/prompts/` | Must stay in sync with `.claude/commands/` |
| Bundled resources | `extension/resources/claude-commands/` | Must stay in sync |
| Bundled Copilot | `extension/resources/copilot-prompts/` | Must stay in sync |

**Important: Commands are quadruplicated** — `.claude/commands/`, `.github/prompts/`, `extension/resources/claude-commands/`, and `extension/resources/copilot-prompts/`. All 4 locations must be kept in sync.

### Current Sub-Agent Invocation Pattern

All 15 existing Task tool calls follow this exact syntax (from pipeline commands):

```
Task: subagent_type="agent-name"
Prompt: "Parameterized instructions (<2000 tokens)."
```

**No model parameter is currently used.** The Task tool supports an optional `model` parameter (`"haiku"`, `"sonnet"`, `"opus"`) but no existing command uses it. This is the key gap for the cost-optimization requirement.

### Pipeline Stage Integration Points

| Stage | Command File | Current Agents | New Strategy Integration |
|-------|-------------|----------------|--------------------------|
| 1. Research | `1_gofer_research.md` (Step 2) | 3 agents (locator, analyzer, pattern-finder) | #6, #9, #20 — add alongside existing 3 |
| 2. Specify | `2_gofer_specify.md` | None | #10, #19 — new diverge-converge step |
| 3. Plan | `3_gofer_plan.md` | None | #2, #5, #7, #12, #16 — new diverge-converge step |
| 4. Tasks | `4_gofer_tasks.md` | 1 agent (engineer-review) | #14, #18 — add alongside review |
| 5. Implement | `5_gofer_implement.md` | None | #1, #3, #4, #8, #11, #15, #17 — per-task invocation |
| 6. Validate | `6_gofer_validate.md` (Step 2) | 6 agents (validation-*) | #13 — enhance existing security validation |

### Existing Patterns to Follow

#### Pattern 1: Parallel Agent Dispatch

Found in: `.claude/commands/6_gofer_validate.md:134-214`

```markdown
## Step 2: Spawn 6 Specialist Validation Agents

Launch all 6 agents **in parallel** using the Task tool.

Task: subagent_type="validation-correctness"
Prompt: "Validate functional correctness for feature [FEATURE_NAME].
Feature directory: {FEATURE_DIR}
...
Return findings in your standard report format (<2000 tokens)."

**Run all 6 agents in parallel.** Collect all results before proceeding.
```

Why relevant: This is the exact pattern for the diverge phase. Each new strategy will follow this same dispatch model.

#### Pattern 2: Binary Scoring Convergence

Found in: `.claude/commands/6_gofer_validate.md:385-451`

```markdown
## Step 7: Score the 10-Category Rubric
**Category 1: Functional Correctness** ({15 or 20 if no UI} pts)
- Input: validation-correctness agent report + automated test results
- Score 0 if: Any Red finding from correctness agent
```

Why relevant: The parent orchestrator acts as the judge. No separate judge agent — the command itself synthesizes. This is simpler than a dedicated judge agent for most strategies.

#### Pattern 3: Council Synthesis with Anonymization

Found in: `extension/src/council/CouncilOrchestrator.ts:106-181`

The Council module implements a full diverge-converge pipeline:
1. `collectResponses()` — parallel dispatch via `Promise.allSettled`
2. `anonymize()` — assign Member A, B, C, D labels
3. `collectPeerReviews()` — optional second diverge-converge cycle
4. `buildSynthesisFromResponses()` — Chairman prompt construction

Why relevant: The Council's synthesis prompt template at `extension/src/council/synthesis.ts:56-122` can inform the judge agent's approach to conflict resolution.

#### Pattern 4: Token Budget Constraint

All existing agents are capped at `<2000 tokens` per response. This keeps sub-agent results compact for the parent orchestrator's context window. With 20 strategies potentially spawning 3-5 agents each, this budget is even more critical.

### Integration Points

1. **Task tool `model` parameter**: Already supported but unused. Adding `model: "haiku"` or `model: "sonnet"` to Task invocations is a zero-code change at the TypeScript level — it's purely a prompt-level change in command files.

2. **File watcher gap**: The current file watcher at `extension/src/services/EventHandlers.ts:142` watches `.specify/specs/**/spec.md` but **NOT** `tasks.md`. When implementation updates checkboxes, the tree view won't auto-refresh. However, manual refresh via `gofer.refreshSpecs` command correctly re-reads tasks.md and updates percentages.

3. **Harvey ball display**: Already implemented in `progressProvider.ts:22-26`. Shows ○◔◑◕● icons and numeric percentage. Manual refresh triggers `_doLoadSpecs()` → `GoferParser.parseTasks()` → updated Harvey balls.

4. **Checkpoint counting**: `CheckpointValidator.ts:216-222` counts checkboxes via regex for progress reporting.

### Related Code

- `extension/src/progressProvider.ts:22-26` — Per-spec completion % calculation
- `extension/src/progressProvider.ts:127-161` — Harvey ball icon mapping
- `extension/src/progressProvider.ts:256` — `refresh()` method with debounce
- `extension/src/progressProvider.ts:376` — `_doLoadSpecs()` reads filesystem
- `extension/src/progressProvider.ts:736-738` — `updateTaskStatus()` triggers refresh
- `extension/src/goferParser.ts:347-478` — `parseTasks()` with 4 checkbox formats
- `extension/src/services/EventHandlers.ts:142-143` — spec.md watcher (no tasks.md watcher)
- `extension/src/config.ts:111` — `TASK_MARKDOWN` pattern exists but unused for watching
- `.claude/commands/5_gofer_implement.md:261` — "Mark task complete: Change `- [ ]` to `- [X]`"

## Technology Decisions

### Decision 1: Model Selection per Strategy

- **Choice**: Specify `model` parameter in Task tool calls within command files
- **Rationale**: The Task tool already supports `model: "haiku" | "sonnet" | "opus"`. No TypeScript changes needed — purely prompt-level.
- **Alternatives considered**: Runtime model selection in TypeScript (rejected — over-engineering for prompt-based orchestration)

#### Model Assignment Matrix

| # | Strategy | Diverge Model | Converge Model | Rationale |
|---|----------|--------------|----------------|-----------|
| 1 | Implementation Variant Generator | **sonnet** | **opus** | Code generation needs reasoning; final judgment needs deep analysis |
| 2 | Solution Architecture Diverger | **sonnet** | **opus** | Architecture needs deep reasoning |
| 3 | Bug Root-Cause Triangulator | **sonnet** | **opus** | Debugging requires reasoning chains |
| 4 | Test Strategy Diversifier | **haiku** (happy/adversarial), **sonnet** (property-based) | **sonnet** | Simple test gen is fast; merge is straightforward |
| 5 | API Design Comparator | **sonnet** | **opus** | API design needs understanding of patterns |
| 6 | Research Perspective Multiplier | **haiku** (search-heavy), **sonnet** (analysis-heavy) | **sonnet** | Mixed: some angles are search, others analysis |
| 7 | Refactor vs Rewrite Advisor | **sonnet** | **opus** | Both sides need code analysis; judge needs cost/benefit |
| 8 | Error Handling Hardener | **haiku** (injection search) | **sonnet** | Boundary search is simple; synthesis needs analysis |
| 9 | Dependency Evaluator | **haiku** (search + comparison) | **sonnet** | Library lookup is search-heavy |
| 10 | Spec Ambiguity Detector | **sonnet** | **opus** | Interpreting specs requires reasoning |
| 11 | Performance Approach Explorer | **sonnet** | **opus** | Optimization strategies need reasoning |
| 12 | Migration Path Finder | **sonnet** | **opus** | Migration planning needs deep analysis |
| 13 | Security Red Team | **sonnet** | **opus** | Security analysis requires reasoning |
| 14 | Cross-Cutting Concern Scanner | **haiku** | **sonnet** | Pattern scanning is search-heavy |
| 15 | Code Review Council | **sonnet** | **opus** | Code review needs reasoning |
| 16 | Data Model Stress Tester | **haiku** (scenario gen) | **sonnet** | Scenario enumeration is simpler than synthesis |
| 17 | Documentation Perspective Writer | **haiku** | **sonnet** | Doc generation is template-driven |
| 18 | Rollback Strategy Planner | **sonnet** | N/A (single agent) | Planning needs analysis; no convergence needed |
| 19 | User Journey Stress Tester | **haiku** (persona walks) | **sonnet** | Persona simulation is simpler |
| 20 | Technology Horizon Scanner | **sonnet** | N/A (single agent) | Web search + analysis; no convergence needed |

**Cost model**: Haiku is ~10x cheaper than Opus, Sonnet is ~5x cheaper than Opus. Using Haiku/Sonnet for diverge (3-5 parallel agents) and Opus only for the final convergence step makes strategies like #1 economically viable.

### Decision 2: One Agent File Per Strategy

- **Choice**: Create 20 agent files + 1 judge agent, each strategy gets a single agent file
- **Rationale**: The perspectives within a strategy are dynamic (vary by feature/task). The command file constructs perspective-specific prompts. This matches how validation works — one `validation-correctness.md` file but the prompt is customized per feature.
- **Alternatives considered**: Multiple agent files per strategy (e.g., `implement-variant-functional.md`, `implement-variant-oop.md`) — rejected as too rigid and brittle.

### Decision 3: Integrate Into Existing Commands (Not New Standalone Commands)

- **Choice**: Modify existing pipeline commands (1-6) to optionally invoke strategies at the right points
- **Rationale**: The 20 strategies map cleanly to existing stages. Creating 20 standalone commands would fragment the pipeline. Each strategy is invoked when it adds value, controlled by the command logic.
- **Alternatives considered**: 20 standalone `/diverge_*` commands — rejected as over-engineering.

### Decision 4: Minimal Change Enforcement

- **Choice**: Add a "Minimal Changes Only" principle to `5_gofer_implement.md` and `constitution.md`
- **Rationale**: Currently, over-engineering is only detected post-hoc by `validation-standards` agent during `/6_gofer_validate`. Proactive enforcement during implementation prevents wasted effort. The implement command already has scope boundaries (lines 110-132) — this extends the concept.
- **Alternatives considered**: Only in AGENTS.md (rejected — not loaded by pipeline agents), only in validation (rejected — too late to catch scope creep).

### Decision 5: Task Progress Display on Manual Refresh

- **Choice**: No TypeScript changes needed — the existing system already works correctly
- **Rationale**: The flow is: (1) `/5_gofer_implement` updates `- [ ]` to `- [X]` in tasks.md, (2) user clicks refresh in sidebar, (3) `GoferParser.parseTasks()` re-reads from filesystem, (4) Harvey balls and % update. This is already functional.
- **Gap identified**: No auto-refresh on tasks.md changes (file watcher only watches spec.md). Adding a tasks.md watcher would be an enhancement but is not required for the user's stated requirement ("manual refresh").

## Constraints & Considerations

- **Token budget**: Each sub-agent must return <2000 tokens. With strategies spawning 3-5 agents, the parent orchestrator needs to hold 6,000-10,000 tokens of agent results per strategy invocation.
- **Context window pressure**: Running multiple strategies in sequence within one session consumes significant context. The pipeline's observation masking and context compaction help, but strategies should be invoked selectively.
- **Command quadruplication**: Every change to `.claude/commands/` must be mirrored to `.github/prompts/`, `extension/resources/claude-commands/`, and `extension/resources/copilot-prompts/`. The `ResourceSyncer` handles some of this.
- **Model availability**: The `model` parameter on Task tool depends on the user's Claude Code subscription/plan. Haiku and Sonnet should always be available; Opus may require specific plan tiers.

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type | Description | Impact on Implementation |
|-----------------|-------------|--------------------------|
| Agent file format | YAML frontmatter + markdown sections | All 20 new agents must follow exact same structure |
| Token budget | <2000 tokens per agent response | Limits what each diverge agent can return |
| Command sync | 4 copies of each command file | Every command change is 4x the work |
| Pipeline ordering | Numbered commands (0-10) | New strategies integrate into existing numbered commands, not new numbers |

### Technical Debt to Avoid

| Pattern | Found In | Why Avoid | Use Instead |
|---------|----------|-----------|-------------|
| Standalone commands per strategy | N/A | Fragments pipeline | Integrate into existing commands |
| Multiple agent files per perspective | N/A | Too rigid, perspectives vary by feature | Single agent file + parameterized prompts |
| TypeScript model selection logic | N/A | Over-engineering for prompt-based orchestration | `model` parameter in Task tool calls |

### Downstream Dependencies

- `progressProvider.ts` — Reads tasks.md for percentage display (already works)
- `GoferParser.parseTasks()` — Parses checkbox formats (already supports required formats)
- All 6 existing pipeline commands — Will have new optional steps added
- `ResourceSyncer` — Must sync new agent files to bundled resources

## Open Questions

- [ ] Should strategies be opt-in (user selects which to run) or always-on when pipeline detects they'd add value?
- [ ] Should the tasks.md file watcher be added for auto-refresh, or is manual refresh sufficient?
- [ ] For the Implementation Variant Generator (#1), what's the maximum number of variants to generate per task? (Recommended: 3 for cost/time balance)

## Recommendations

1. **Start with Tier 1 strategies** (#1, #2, #3, #4) as they have highest impact. Tier 2-4 can follow in later iterations.
2. **Use the `model` parameter** on all Task tool calls — even retrofitting existing agents in `/1_gofer_research` and `/6_gofer_validate` to use haiku/sonnet where appropriate for cost savings.
3. **Add tasks.md file watcher** alongside existing spec.md watcher for improved UX (auto-refresh when checkboxes change during implementation).
4. **Add "Minimal Changes Only" principle** to both `5_gofer_implement.md` and `constitution.md` for proactive enforcement.
5. **Create all 20 agent files immediately** even for lower-priority strategies — they're cheap (markdown only) and having them ready enables future pipeline integration.
