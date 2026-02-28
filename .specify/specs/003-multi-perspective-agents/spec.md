---
id: 003-multi-perspective-agents
title: Multi-Perspective Sub-Agent Strategies
status: draft
created: '2026-02-28'
updated: '2026-02-28'
author: Claude
depends_on: []
---

# Multi-Perspective Sub-Agent Strategies

## Overview

The Gofer pipeline currently uses a single-perspective approach at most stages —
one agent researches, one agent plans, one agent implements. This feature
introduces 20 "diverge then converge" strategies across all 6 pipeline stages,
where multiple agents independently tackle the same problem from different
angles, and a judge/synthesis step selects the best approach or combines
insights.

This mirrors how the best engineering teams work: multiple perspectives before
committing to one path. The pattern is already proven in the codebase — the
validation stage spawns 6 parallel agents and the LLM Council module dispatches
to multiple LLM providers simultaneously.

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: Diverge-Converge Agent Framework (P1)

**As a** developer using the Gofer pipeline **I want to** have multiple agents
independently explore different approaches to the same problem **So that** the
final solution benefits from diverse perspectives rather than a single viewpoint

**Acceptance Criteria**:

- [ ] AC1.1: Each of the 20 strategies has a dedicated agent definition file in
      `.claude/agents/` following the established format (YAML frontmatter, Core
      Responsibilities, Analysis Strategy, Output Format, Blocking Criteria,
      Important Guidelines, LLM Council Mode)
- [ ] AC1.2: A `multi-perspective-judge.md` agent exists for the
      convergence/synthesis step
- [ ] AC1.3: Each agent file specifies the recommended model (haiku/sonnet/opus)
      in its Important Guidelines section
- [ ] AC1.4: All agent responses are capped at <2000 tokens to preserve parent
      orchestrator context

### US2: Cost-Optimized Model Selection (P1)

**As a** developer managing AI costs **I want to** each sub-agent to use the
most cost-effective model for its task complexity **So that** I get quality
results without paying Opus prices for simple search/pattern-matching work

**Acceptance Criteria**:

- [ ] AC2.1: Every Task tool invocation in pipeline commands specifies an
      explicit `model` parameter (haiku, sonnet, or opus)
- [ ] AC2.2: Diverge-phase agents use haiku (for search/pattern tasks) or sonnet
      (for reasoning tasks)
- [ ] AC2.3: Converge-phase (judge) invocations use opus for critical judgment
      tasks; sonnet is acceptable for simpler convergence (e.g., merging test
      suites, combining doc perspectives)
- [ ] AC2.4: Existing agents in `/1_gofer_research`, `/6_gofer_validate`,
      `/gofer_hydrate`, `/gofer_constitution`, and `/9_gofer_tests` are
      retrofitted with appropriate model parameters

### US3: Pipeline Stage Integration (P1)

**As a** developer running the Gofer pipeline **I want to** the
multi-perspective strategies to be integrated into existing pipeline commands
**So that** I don't need to learn new commands — the strategies enhance the
stages I already use

**Acceptance Criteria**:

- [ ] AC3.1: Stage 1 (Research) command integrates strategies #6, #9, #20
      alongside existing 3 agents
- [ ] AC3.2: Stage 2 (Specify) command integrates strategies #10, #19
- [ ] AC3.3: Stage 3 (Plan) command integrates strategies #2, #5, #7, #12, #16
- [ ] AC3.4: Stage 4 (Tasks) command integrates strategies #14, #18 alongside
      existing engineer-review
- [ ] AC3.5: Stage 5 (Implement) command integrates strategies #1, #3, #4, #8,
      #11, #15, #17 as per-task options
- [ ] AC3.6: Stage 6 (Validate) command integrates strategy #13 enhancing
      existing security validation
- [ ] AC3.7: All command changes are synced to all 4 locations
      (`.claude/commands/`, `.github/prompts/`,
      `extension/resources/claude-commands/`,
      `extension/resources/copilot-prompts/`)

### US4: Minimal Change Enforcement (P1)

**As a** developer concerned about scope creep in AI-generated code **I want
to** the pipeline to proactively enforce minimal-change principles during
implementation **So that** only the changes necessary to achieve the task are
made — no over-engineering, no gold-plating

**Acceptance Criteria**:

- [ ] AC4.1: `5_gofer_implement.md` contains an explicit "Minimal Changes Only"
      rule that applies to every file modification
- [ ] AC4.2: `constitution.md` contains a new principle enforcing minimal
      changes
- [ ] AC4.3: The implement command instructs agents to check each modification
      against the principle before writing
- [ ] AC4.4: The rule is clear: only changes directly required by the current
      task, no refactoring of surrounding code, no adding features not in scope,
      no documentation beyond what's needed

### US5: Task Progress Visibility (P2)

**As a** developer monitoring pipeline progress **I want to** see accurate task
completion percentages in the Specification list after refreshing **So that** I
know how far along implementation has progressed

**Acceptance Criteria**:

- [ ] AC5.1: Manual refresh of the Specification list correctly displays updated
      completion percentages when tasks.md checkboxes have changed
- [ ] AC5.2: A file watcher on `tasks.md` triggers automatic tree view refresh
      when checkboxes are updated
- [ ] AC5.3: The implement command (`5_gofer_implement.md`) explicitly updates
      `- [ ]` to `- [X]` after each task completes (verified — already exists)

## Functional Requirements

### FR1: Agent Definition Files (20 Strategies)

Create 20 agent definition files in `.claude/agents/`, one per strategy,
following the established agent file format. Each file defines:

- The diverge-phase role and perspective
- Tools needed (restricted to minimum required)
- Output format (<2000 tokens)
- Blocking criteria specific to the strategy
- Recommended model for cost optimization

**Strategies by pipeline stage:**

| #   | Strategy                         | Agent File Name                      | Stage | Diverge Count |
| --- | -------------------------------- | ------------------------------------ | ----- | ------------- |
| 1   | Implementation Variant Generator | `implement-variant-generator.md`     | 5     | 3-5 agents    |
| 2   | Solution Architecture Diverger   | `plan-architecture-diverger.md`      | 3     | 5 agents      |
| 3   | Bug Root-Cause Triangulator      | `implement-bug-triangulator.md`      | 5     | 3 agents      |
| 4   | Test Strategy Diversifier        | `implement-test-diversifier.md`      | 5/9   | 4 agents      |
| 5   | API Design Comparator            | `plan-api-comparator.md`             | 3     | 3-4 agents    |
| 6   | Research Perspective Multiplier  | `research-perspective-multiplier.md` | 1     | 5 agents      |
| 7   | Refactor vs Rewrite Advisor      | `plan-refactor-rewrite-advisor.md`   | 3     | 2 agents      |
| 8   | Error Handling Hardener          | `implement-error-hardener.md`        | 5     | 2 agents      |
| 9   | Dependency Evaluator             | `research-dependency-evaluator.md`   | 1/3   | 3 agents      |
| 10  | Spec Ambiguity Detector          | `specify-ambiguity-detector.md`      | 2     | 3 agents      |
| 11  | Performance Approach Explorer    | `implement-performance-explorer.md`  | 5     | 3 agents      |
| 12  | Migration Path Finder            | `plan-migration-path-finder.md`      | 3     | 4 agents      |
| 13  | Security Red Team                | `validate-security-red-team.md`      | 6     | 3 agents      |
| 14  | Cross-Cutting Concern Scanner    | `tasks-cross-cutting-scanner.md`     | 4     | 5 agents      |
| 15  | Code Review Council              | `implement-code-review-council.md`   | 5     | 3 agents      |
| 16  | Data Model Stress Tester         | `plan-data-model-stress-tester.md`   | 3     | 4 agents      |
| 17  | Documentation Perspective Writer | `implement-doc-writer.md`            | 5     | 3 agents      |
| 18  | Rollback Strategy Planner        | `tasks-rollback-planner.md`          | 4     | 1 agent       |
| 19  | User Journey Stress Tester       | `specify-journey-stress-tester.md`   | 2     | 4 agents      |
| 20  | Technology Horizon Scanner       | `research-horizon-scanner.md`        | 1     | 1 agent       |

- **Validation**: Each agent file passes format validation (YAML frontmatter,
  all 7 required sections present)
- **Integration**: Agent names match `subagent_type` values used in pipeline
  commands

### FR2: Judge/Synthesis Agent

Create `multi-perspective-judge.md` agent that:

- Receives multiple diverge-phase outputs
- Identifies areas of agreement and conflict
- Selects the best approach or synthesizes a hybrid
- Returns a structured verdict with rationale

The judge agent is parameterized per invocation — the pipeline command tells it
what type of judgment to make (architecture selection, code comparison, test
suite merge, etc.).

- **Validation**: Judge can process 3-5 agent outputs and return a verdict in
  <2000 tokens
- **Integration**: Used by all strategies that have a convergence step

### FR3: Model Selection on All Task Invocations

Every `Task` tool call in pipeline commands must include an explicit `model`
parameter:

| Task Type                                         | Model  | Rationale                                 |
| ------------------------------------------------- | ------ | ----------------------------------------- |
| Search/scan tasks (locator, scanners)             | haiku  | Fast, cheap, search-optimized             |
| Analysis/reasoning tasks (analyzer, comparators)  | sonnet | Balance of capability and cost            |
| Judgment/synthesis tasks (judge, final decisions) | opus   | Highest capability for critical decisions |

This applies to:

- All 20 new strategy invocations
- Existing 3 research agents in `1_gofer_research.md` (retrofit)
- Existing 6 validation agents in `6_gofer_validate.md` (retrofit)
- Existing 3 agents in `gofer_hydrate.md` (retrofit)
- Existing 2 agents in `gofer_constitution.md` (retrofit)
- Existing 1 agent in `9_gofer_tests.md` (retrofit)

Note: `engineer-review` is defined as an agent file but is NOT currently invoked
via `Task: subagent_type=` syntax in any command. It will be added as a new
invocation in `4_gofer_tasks.md` (T025) with model parameter from the start.

- **Validation**: No Task tool call in any command file lacks a `model`
  parameter
- **Integration**: `model` parameter already supported by Task tool — no
  TypeScript changes

### FR4: Minimal Change Principle

Add proactive minimal-change enforcement to the implementation pipeline:

1. **In `5_gofer_implement.md`**: Add a "Minimal Changes Only" rule before the
   per-task loop that instructs:
   - Only modify files listed in the task scope
   - Only make changes directly required by the task
   - Do not refactor surrounding code
   - Do not add features, documentation, or tests beyond what's specified
   - Do not add error handling for scenarios that cannot occur
   - Do not create abstractions for one-time operations

2. **In `constitution.md`**: Add a new Principle VIII: "Minimal Necessary
   Changes" that codifies the rule project-wide

- **Validation**: Both files contain the minimal-change language
- **Integration**: Extends existing scope boundary mechanism in
  `5_gofer_implement.md`

### FR5: Tasks.md File Watcher

Add a file system watcher for `tasks.md` alongside the existing `spec.md`
watcher so the Specification list auto-refreshes when task checkboxes change.

- **Validation**: Changing a checkbox in tasks.md triggers tree view refresh
  within 2 seconds
- **Integration**: `EventHandlers.ts:142` — add second watcher using existing
  `FILE_PATTERNS.TASK_MARKDOWN` pattern from `config.ts:111`

### FR6: Pipeline Command Integration

Modify each pipeline command to optionally invoke relevant strategies:

**Stage 1 (`1_gofer_research.md`)**: Add optional step after existing 3 agents
to run:

- #6 Research Perspective Multiplier (5 additional angles)
- #9 Dependency Evaluator (when new dependencies proposed)
- #20 Technology Horizon Scanner (web search for emerging alternatives)

**Stage 2 (`2_gofer_specify.md`)**: Add step before quality checklist to run:

- #10 Spec Ambiguity Detector (3 agents interpret spec independently)
- #19 User Journey Stress Tester (4 persona agents walk through journeys)

**Stage 3 (`3_gofer_plan.md`)**: Add step after initial architecture to run:

- #2 Solution Architecture Diverger (5 architectural patterns)
- #5 API Design Comparator (for each API in the plan)
- #7 Refactor vs Rewrite Advisor (for each major code change)
- #12 Migration Path Finder (when changing existing code)
- #16 Data Model Stress Tester (for data models in the plan)

**Stage 4 (`4_gofer_tasks.md`)**: Add step after task breakdown to run:

- #14 Cross-Cutting Concern Scanner (5 concern dimensions)
- #18 Rollback Strategy Planner (for each implementation phase)

**Stage 5 (`5_gofer_implement.md`)**: Add per-task options to run:

- #1 Implementation Variant Generator (3 variants per complex task)
- #3 Bug Root-Cause Triangulator (when a bug is encountered)
- #4 Test Strategy Diversifier (4 testing perspectives)
- #8 Error Handling Hardener (after implementation, before marking complete)
- #11 Performance Approach Explorer (for performance-sensitive code)
- #15 Code Review Council (after each task, 3 review lenses)
- #17 Documentation Perspective Writer (3 audience perspectives)

**Stage 6 (`6_gofer_validate.md`)**: Add alongside existing validation:

- #13 Security Red Team (3 attack angles, enhancing existing security agent)

Each strategy section in the command file includes:

- When to invoke (trigger condition)
- How many agents to spawn
- What model to use for diverge/converge
- How to synthesize results

- **Validation**: Each modified command correctly dispatches agents and
  synthesizes results
- **Integration**: All changes synced to 4 locations per command

## Non-Functional Requirements

### Performance

- Sub-agent responses must complete within 60 seconds each
- Parallel agent dispatch must not block the pipeline (async)
- Token budget: <2000 tokens per agent response, <4000 tokens for judge
  synthesis

### Cost Efficiency

- Diverge phase must use the cheapest viable model per task type
- Total cost of a strategy invocation must be predictable (agent count x model
  cost)
- Strategies should be skippable if the user wants to optimize for speed/cost

### Compatibility

- All agent files follow existing `.claude/agents/` format exactly
- All command changes are backward-compatible (strategies are additive, not
  replacing existing behavior)
- Manual refresh of Specification list works without any changes (already
  functional)

## Success Criteria

| Metric                   | Target                            | Measurement                                                        |
| ------------------------ | --------------------------------- | ------------------------------------------------------------------ |
| Agent files created      | 21 (20 strategies + 1 judge)      | Count files in `.claude/agents/` matching new names                |
| Model parameter coverage | 100% of Task tool calls           | Grep for Task calls without `model` parameter = 0                  |
| Command sync             | 4 copies of each modified command | File diff across all 4 locations shows identical content           |
| Minimal change principle | Present in 2 files                | `5_gofer_implement.md` and `constitution.md` both contain the rule |
| Tasks.md watcher         | Auto-refresh works                | Checkbox change in tasks.md triggers tree view update              |

## Assumptions

- The Task tool's `model` parameter works as documented (haiku, sonnet, opus
  values accepted)
- All 4 command locations (`.claude/commands/`, `.github/prompts/`,
  `extension/resources/claude-commands/`,
  `extension/resources/copilot-prompts/`) must remain in sync
- The existing <2000 token budget per agent response is sufficient for all 20
  strategies
- Haiku is capable enough for search/scan tasks; Sonnet is capable enough for
  analysis tasks; Opus is needed only for synthesis/judgment

## Dependencies

- Existing agent infrastructure (`.claude/agents/*.md` format)
- Existing pipeline commands (`.claude/commands/0-6_*.md`)
- Task tool with `model` parameter support (Claude Code infrastructure)
- `EventHandlers.ts` file watcher registration pattern
- `GoferParser.parseTasks()` checkbox parsing (already functional)
- `ProgressProvider` Harvey ball display (already functional)

## Out of Scope

- Runtime TypeScript changes to the council module (existing council
  infrastructure is not modified)
- New standalone pipeline commands (strategies integrate into existing commands)
- Automatic strategy selection based on feature complexity (strategies are
  explicitly invoked by the command logic)
- Changes to the LLM Council provider system (Anthropic/Google/OpenAI APIs)
- UI changes to the tree view display format (Harvey balls and percentages
  already work)

## Protected Boundaries

The following files must NOT be modified except as explicitly required:

- `extension/src/council/**/*.ts` — Council module is not part of this feature
- `extension/src/progressProvider.ts` — Only modified if tasks.md watcher
  requires it (should not — watcher is in EventHandlers.ts)
- `extension/src/goferParser.ts` — Task parsing already works correctly
- `extension/src/autonomous/**/*.ts` — Autonomous mode is not part of this
  feature

## Glossary

| Term           | Definition                                                                         |
| -------------- | ---------------------------------------------------------------------------------- |
| Diverge phase  | Spawning multiple agents with different perspectives on the same problem           |
| Converge phase | A judge/synthesis step that combines or selects from diverge results               |
| Strategy       | One of the 20 multi-perspective patterns, each targeting a specific pipeline stage |
| Harvey ball    | Unicode circle icons (○◔◑◕●) showing completion percentage in the tree view        |
| Token budget   | The <2000 token limit on each sub-agent's response                                 |

## Research Traceability

| Research Finding                                   | Spec Section | Reference                           |
| -------------------------------------------------- | ------------ | ----------------------------------- |
| 10 existing agents follow YAML+markdown format     | FR1          | Agent file format requirement       |
| Task tool supports `model` parameter (unused)      | FR3, US2     | Model selection requirement         |
| File watcher only watches spec.md, not tasks.md    | FR5, US5     | Tasks.md watcher requirement        |
| Commands quadruplicated across 4 locations         | FR6, AC3.7   | Sync requirement                    |
| `5_gofer_implement.md:261` updates checkboxes      | AC5.3        | Already functional                  |
| No minimal-change enforcement in pipeline          | FR4, US4     | New principle requirement           |
| Harvey ball + % display already works              | US5          | No change needed for manual refresh |
| Constitution lacks scope control principle         | FR4          | New Principle VIII                  |
| `config.ts:111` has TASK_MARKDOWN pattern (unused) | FR5          | Reuse for watcher                   |
| Existing agents use <2000 token budget             | FR1, FR2     | Token budget constraint             |
