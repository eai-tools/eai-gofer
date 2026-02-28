---
feature: Multi-Perspective Sub-Agent Strategies
spec: spec.md
research: research.md
status: ready
created: '2026-02-28'
---

# Implementation Plan: Multi-Perspective Sub-Agent Strategies

## Technical Context

### Tech Stack

- **Primary**: Markdown (agent definitions, command files) — ~95% of
  deliverables
- **Secondary**: TypeScript (tasks.md file watcher) — 1 small change
- **Build**: No compilation needed for markdown files; TypeScript change
  requires `npm run compile`
- **Testing**: Manual validation of agent file format; automated test for file
  watcher

### Architecture

This feature is overwhelmingly **prompt-level** — 21 new markdown files in
`.claude/agents/`, modifications to 6 pipeline commands (each synced to 4
locations), and 2 governance file updates. The only TypeScript change is adding
a file watcher (~10 lines).

```
.claude/agents/
├── [10 existing agents]
├── multi-perspective-judge.md          ← FR2: Judge/Synthesis
├── research-perspective-multiplier.md  ← #6
├── research-dependency-evaluator.md    ← #9
├── research-horizon-scanner.md         ← #20
├── specify-ambiguity-detector.md       ← #10
├── specify-journey-stress-tester.md    ← #19
├── plan-architecture-diverger.md       ← #2
├── plan-api-comparator.md              ← #5
├── plan-refactor-rewrite-advisor.md    ← #7
├── plan-migration-path-finder.md       ← #12
├── plan-data-model-stress-tester.md    ← #16
├── tasks-cross-cutting-scanner.md      ← #14
├── tasks-rollback-planner.md           ← #18
├── validate-security-red-team.md       ← #13
├── implement-variant-generator.md      ← #1
├── implement-bug-triangulator.md       ← #3
├── implement-test-diversifier.md       ← #4
├── implement-error-hardener.md         ← #8
├── implement-performance-explorer.md   ← #11
├── implement-code-review-council.md    ← #15
└── implement-doc-writer.md             ← #17
```

### Integration Points

| Component                   | File                                              | Integration Type                                                   |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Tasks.md file watcher       | `extension/src/services/EventHandlers.ts:141-159` | New method alongside `registerSpecFileWatcher()`                   |
| Spec watcher pattern        | `extension/src/services/EventHandlers.ts:142-143` | Pattern to replicate for tasks.md                                  |
| FILE_PATTERNS.TASK_MARKDOWN | `extension/src/config.ts:111`                     | Existing pattern to reuse                                          |
| ProgressProvider.refresh()  | `extension/src/progressProvider.ts:256`           | Called by watcher on change                                        |
| Research command            | `.claude/commands/1_gofer_research.md` Step 2     | Add strategies #6, #9, #20                                         |
| Specify command             | `.claude/commands/2_gofer_specify.md`             | Add strategies #10, #19                                            |
| Plan command                | `.claude/commands/3_gofer_plan.md`                | Add strategies #2, #5, #7, #12, #16                                |
| Tasks command               | `.claude/commands/4_gofer_tasks.md`               | Add strategies #14, #18                                            |
| Implement command           | `.claude/commands/5_gofer_implement.md`           | Add strategies #1, #3, #4, #8, #11, #15, #17 + minimal change rule |
| Validate command            | `.claude/commands/6_gofer_validate.md`            | Add strategy #13                                                   |
| Constitution                | `.specify/memory/constitution.md`                 | Add Principle VIII                                                 |

### Key Dependencies

- Existing `.claude/agents/*.md` agent file format (template reference:
  `validation-correctness.md`)
- Existing `EventHandlerDependencies` interface for watcher registration
- Existing `progressProvider.refresh()` for triggering tree view update

## Constitution Check

- [x] Principle I (TDD): File watcher change has corresponding test
- [x] Principle IV (Strict TypeScript): Watcher code follows strict mode
- [x] Principle VI (Performance): Tree view render stays <100ms (debounced
      refresh)
- [x] New Principle VIII: Self-referential — this plan follows minimal changes

---

## Implementation Phases

### Phase 1: Foundation & Governance

**Goal**: Create the judge agent, add minimal-change enforcement, add tasks.md
file watcher

**Tasks**:

- [ ] T001 [Setup] Create `multi-perspective-judge.md` agent file in
      `.claude/agents/` — the convergence/synthesis agent used by all strategies
      (FR2)
- [ ] T002 [Governance] Add Principle VIII "Minimal Necessary Changes" to
      `.specify/memory/constitution.md` (FR4, AC4.2)
- [ ] T003 [Governance] Add "Minimal Changes Only" rule to
      `.claude/commands/5_gofer_implement.md` before the `### For Each Task`
      section (line ~253) (FR4, AC4.1, AC4.3, AC4.4)
- [ ] T004 [TypeScript] Add tasks.md file watcher to
      `extension/src/services/EventHandlers.ts` alongside existing spec.md
      watcher — use `FILE_PATTERNS.TASK_MARKDOWN` from `config.ts:111`, call
      `progressProvider.refresh()` on change (FR5, AC5.2)
- [ ] T005 [Test] Add unit test for tasks.md watcher in
      `tests/unit/services/EventHandlers.test.ts` (FR5)

**Verification**:

- [ ] Judge agent file has all 7 required sections
- [ ] Constitution has Principle VIII
- [ ] Implement command has minimal-change rule before task loop
- [ ] TypeScript compiles: `cd extension && npm run compile`
- [ ] Tests pass: `npm test`

### Phase 2: Research Stage (Strategies #6, #9, #20)

**Goal**: Create 3 research-stage agent files, retrofit model params on existing
research agents, integrate into pipeline

**Tasks**:

- [ ] T006 [Agent] Create `research-perspective-multiplier.md` — 5 perspectives:
      (1) existing codebase, (2) open-source projects, (3) latest docs, (4)
      anti-patterns, (5) emerging approaches. Model: haiku for search angles,
      sonnet for analysis angles. (FR1, #6)
- [ ] T007 [Agent] Create `research-dependency-evaluator.md` — 3 perspectives:
      (1) evaluate proposed library, (2) find alternatives, (3) prototype
      without library. Model: haiku. (FR1, #9)
- [ ] T008 [Agent] Create `research-horizon-scanner.md` — single agent searching
      web for emerging alternatives. Model: sonnet. (FR1, #20)
- [ ] T009 [Command] Retrofit model parameters on existing 3 research agent
      invocations in `1_gofer_research.md` — codebase-locator: haiku,
      codebase-analyzer: sonnet, codebase-pattern-finder: haiku (FR3, AC2.4)
- [ ] T010 [Command] Add optional multi-perspective research step to
      `1_gofer_research.md` after existing Step 2 — invoke #6, #9, #20
      strategies with judge synthesis (FR6, AC3.1)
- [ ] T011 [P] [Sync] Sync `1_gofer_research.md` changes to
      `.github/prompts/1_gofer_research.prompt.md`,
      `extension/resources/claude-commands/1_gofer_research.md`,
      `extension/resources/copilot-prompts/1_gofer_research.prompt.md` (AC3.7)

**Verification**:

- [ ] 3 new agent files have all 7 required sections
- [ ] Each agent specifies recommended model
- [ ] All 4 copies of `1_gofer_research` are identical
- [ ] Existing research agents have model parameters

### Phase 3: Specify Stage (Strategies #10, #19)

**Goal**: Create 2 specify-stage agent files, integrate into pipeline

**Tasks**:

- [ ] T012 [Agent] Create `specify-ambiguity-detector.md` — 3 agents
      independently interpret spec and write pseudocode; comparator finds
      divergences. Model: sonnet diverge, opus converge. (FR1, #10)
- [ ] T013 [Agent] Create `specify-journey-stress-tester.md` — 4 persona agents:
      power user, first-timer, accessibility-dependent, adversarial. Model:
      haiku diverge, sonnet converge. (FR1, #19)
- [ ] T014 [Command] Add multi-perspective specify step to `2_gofer_specify.md`
      before quality checklist — invoke #10, #19 strategies (FR6, AC3.2)
- [ ] T015 [P] [Sync] Sync `2_gofer_specify.md` changes to 3 other locations
      (AC3.7)

**Verification**:

- [ ] 2 new agent files have all 7 required sections
- [ ] All 4 copies of `2_gofer_specify` are identical

### Phase 4: Plan Stage (Strategies #2, #5, #7, #12, #16)

**Goal**: Create 5 plan-stage agent files, integrate into pipeline

**Tasks**:

- [ ] T016 [Agent] Create `plan-architecture-diverger.md` — 5 agents each using
      different architectural pattern (microservices, monolithic, event-sourced,
      CQRS, plugin-based). Model: sonnet diverge, opus converge. (FR1, #2)
- [ ] T017 [Agent] Create `plan-api-comparator.md` — 3-4 agents each designing
      API in different paradigm (REST, GraphQL, RPC, event-based). Model: sonnet
      diverge, opus converge. (FR1, #5)
- [ ] T018 [Agent] Create `plan-refactor-rewrite-advisor.md` — 2 agents: one
      plans minimal refactor, other plans clean rewrite. Model: sonnet diverge,
      opus converge. (FR1, #7)
- [ ] T019 [Agent] Create `plan-migration-path-finder.md` — 4 agents: big bang,
      strangler fig, feature-flagged, adapter/facade. Model: sonnet diverge,
      opus converge. (FR1, #12)
- [ ] T020 [Agent] Create `plan-data-model-stress-tester.md` — 4 agents: 10x
      scale, concurrent access, schema evolution, edge-case shapes. Model: haiku
      diverge, sonnet converge. (FR1, #16)
- [ ] T021 [Command] Add multi-perspective plan step to `3_gofer_plan.md` after
      initial architecture — invoke #2, #5, #7, #12, #16 strategies (FR6, AC3.3)
- [ ] T022 [P] [Sync] Sync `3_gofer_plan.md` changes to 3 other locations
      (AC3.7)

**Verification**:

- [ ] 5 new agent files have all 7 required sections
- [ ] All 4 copies of `3_gofer_plan` are identical

### Phase 5: Tasks Stage (Strategies #14, #18)

**Goal**: Create 2 tasks-stage agent files, add engineer-review invocation with
model param, integrate into pipeline

**Tasks**:

- [ ] T023 [Agent] Create `tasks-cross-cutting-scanner.md` — 5 agents scanning
      for: logging/observability, accessibility, i18n, backward compatibility,
      documentation. Model: haiku diverge, sonnet converge. (FR1, #14)
- [ ] T024 [Agent] Create `tasks-rollback-planner.md` — single agent planning
      rollback for each phase. Model: sonnet. (FR1, #18)
- [ ] T025 [Command] Add `Task: subagent_type="engineer-review"` invocation to
      `4_gofer_tasks.md` with `model: "sonnet"` — engineer-review agent exists
      but is NOT currently invoked via Task syntax in any command (FR3, AC2.4)
- [ ] T026 [Command] Add multi-perspective tasks step to `4_gofer_tasks.md`
      after task breakdown — invoke #14 (converge: sonnet), #18 strategies (FR6,
      AC3.4)
- [ ] T027 [P] [Sync] Sync `4_gofer_tasks.md` changes to 3 other locations
      (AC3.7)

**Verification**:

- [ ] 2 new agent files have all 7 required sections
- [ ] Engineer-review invocation added with model: sonnet
- [ ] All 4 copies of `4_gofer_tasks` are identical

### Phase 6: Implement Stage (Strategies #1, #3, #4, #8, #11, #15, #17)

**Goal**: Create 7 implement-stage agent files, integrate as per-task options

**Tasks**:

- [ ] T028 [Agent] Create `implement-variant-generator.md` — 3-5 agents each
      coding differently (functional, OOP, library-based, hand-rolled,
      event-driven). Model: sonnet diverge, opus converge. (FR1, #1)
- [ ] T029 [Agent] Create `implement-bug-triangulator.md` — 3 agents: backward
      from symptom, forward from inputs, search for similar bugs. Model: sonnet
      diverge, opus converge. (FR1, #3)
- [ ] T030 [Agent] Create `implement-test-diversifier.md` — 4 agents:
      happy-path, adversarial, property-based, real-world scenarios. Model:
      haiku/sonnet diverge, sonnet converge. (FR1, #4)
- [ ] T031 [Agent] Create `implement-error-hardener.md` — 2 agents: one injects
      failures at boundaries, one searches for real-world incident reports.
      Model: haiku diverge, sonnet converge. (FR1, #8)
- [ ] T032 [Agent] Create `implement-performance-explorer.md` — 3 agents:
      caching, lazy loading, parallel execution. Model: sonnet diverge, opus
      converge. (FR1, #11)
- [ ] T033 [Agent] Create `implement-code-review-council.md` — 3 agents:
      readability, correctness, performance. Model: sonnet diverge, opus
      converge. (FR1, #15)
- [ ] T034 [Agent] Create `implement-doc-writer.md` — 3 agents: end-user guide,
      developer API reference, ops/troubleshooting. Model: haiku diverge, sonnet
      converge. (FR1, #17)
- [ ] T035 [Command] Add multi-perspective implement options to
      `5_gofer_implement.md` — per-task invocation of #1, #3, #4, #8, #11, #15,
      #17 strategies with trigger conditions (FR6, AC3.5)
- [ ] T036 [P] [Sync] Sync `5_gofer_implement.md` changes to 3 other locations
      (AC3.7)

**Verification**:

- [ ] 7 new agent files have all 7 required sections
- [ ] All 4 copies of `5_gofer_implement` are identical
- [ ] Minimal change rule (from Phase 1) still present and undamaged

### Phase 7: Validate Stage (Strategy #13) + Existing Agent Retrofit

**Goal**: Create security red team agent, retrofit model params on 6 existing
validation agents, integrate into pipeline

**Tasks**:

- [ ] T037 [Agent] Create `validate-security-red-team.md` — 3 agents: OWASP Top
      10, business logic abuse, CVE search for specific libraries. Model: sonnet
      diverge, opus converge. (FR1, #13)
- [ ] T038 [Command] Retrofit model parameters on existing 6 validation agent
      invocations in `6_gofer_validate.md` — validation-correctness: sonnet,
      validation-security: sonnet, validation-performance: haiku,
      validation-test-quality: haiku, validation-integration: sonnet,
      validation-standards: sonnet (FR3, AC2.4)
- [ ] T039 [Command] Add security red team step to `6_gofer_validate.md`
      alongside existing validation — invoke #13 strategy (FR6, AC3.6)
- [ ] T040 [P] [Sync] Sync `6_gofer_validate.md` changes to 3 other locations
      (AC3.7)

**Verification**:

- [ ] 1 new agent file has all 7 required sections
- [ ] All 6 existing validation agents have model parameters
- [ ] All 4 copies of `6_gofer_validate` are identical
- [ ] Full pipeline test: run `npm test` to verify no regressions

### Phase 8: Auxiliary Command Model Retrofit

**Goal**: Retrofit model parameters on all remaining Task invocations in
auxiliary commands to achieve 100% coverage per AC2.1/FR3

**Tasks**:

- [ ] T041 [Command] Retrofit model parameters on 3 existing agent invocations
      in `gofer_hydrate.md` — codebase-analyzer: sonnet (line 53),
      codebase-locator: haiku (line 66), codebase-pattern-finder: haiku
      (line 79) (FR3, AC2.4)
- [ ] T042 [Command] Retrofit model parameters on 2 existing agent invocations
      in `gofer_constitution.md` — codebase-pattern-finder: haiku (line 96),
      codebase-analyzer: sonnet (line 403) (FR3, AC2.4)
- [ ] T043 [Command] Retrofit model parameter on 1 existing agent invocation in
      `9_gofer_tests.md` — codebase-pattern-finder: haiku (line 78) (FR3, AC2.4)
- [ ] T044 [P] [Sync] Sync `gofer_hydrate.md` changes to 3 other locations
      (AC3.7)
- [ ] T045 [P] [Sync] Sync `gofer_constitution.md` changes to 3 other locations
      (AC3.7)
- [ ] T046 [P] [Sync] Sync `9_gofer_tests.md` changes to 3 other locations
      (AC3.7)

**Verification**:

- [ ] All Task invocations in auxiliary commands have model parameters
- [ ] All 4 copies of each auxiliary command are identical
- [ ] `grep -rn 'subagent_type=' .claude/commands/*.md | grep -v model` returns
      no results

---

## Agent File Template

All 21 new agent files must follow this exact structure (from
`validation-correctness.md`):

```markdown
---
name: { agent-name }
description: { One-line description }
tools: { Comma-separated tool list }
---

You are a specialist agent focused on **{domain}**. Your job is to {primary
responsibility}.

## Core Responsibilities

1. **{Responsibility 1}**
   - {Detail}
   - {Detail}

2. **{Responsibility 2}**
   - {Detail}

## Analysis Strategy

### Step 1: {First step}

- {Instructions}

### Step 2: {Second step}

- {Instructions}

## Output Format

**IMPORTANT**: Return results in <2000 tokens. Focus on findings, not verbose
descriptions.

{Structured output template with tables/sections}

## Blocking Criteria

This agent blocks if:

- {Condition 1}
- {Condition 2}

## Important Guidelines

- {Guideline 1}
- {Guideline 2}
- **Recommended Model**: Diverge: {haiku|sonnet} — {rationale}. Converge:
  {sonnet|opus} — {rationale}.

## LLM Council Mode

When council mode is enabled for the parent workflow, this agent may execute
across multiple LLM providers simultaneously. In council mode:

- Your findings will be anonymized as "Member A", "Member B", etc.
- A Chairman LLM will synthesize your analysis with other providers' findings
- Different LLMs may identify different insights
- Your response may be peer-reviewed by other council members

Focus on thorough, evidence-based analysis regardless of council mode.
```

## Tasks.md File Watcher Design

The TypeScript change is minimal — add a `registerTasksFileWatcher()` method to
`EventHandlers.ts` alongside existing `registerSpecFileWatcher()`:

```typescript
private registerTasksFileWatcher(deps: EventHandlerDependencies): void {
  const tasksWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(deps.workspacePath, '.specify/specs/**/tasks.md')
  );

  tasksWatcher.onDidChange(() => {
    deps.progressProvider?.refresh();
  });

  tasksWatcher.onDidCreate(() => {
    deps.progressProvider?.refresh();
  });

  deps.context.subscriptions.push(tasksWatcher);
  this.logger.debug('EventHandlers', 'Tasks file watcher registered');
}
```

Call this method from the same initialization point where
`registerSpecFileWatcher()` is called. No changes to `ProgressProvider`,
`GoferParser`, or `config.ts` needed.

## Minimal Change Principle Text

For `5_gofer_implement.md`, add before the per-task loop:

```markdown
## Minimal Changes Only (NON-NEGOTIABLE)

Before EVERY file modification, verify:

1. **Is this file listed in the current task's scope?** If not, do not modify
   it.
2. **Is this change directly required by the task?** If not, do not make it.
3. **Am I refactoring surrounding code?** Stop — only touch what the task
   requires.
4. **Am I adding features not in scope?** Stop — implement exactly what's
   specified.
5. **Am I adding error handling for impossible scenarios?** Stop — trust
   internal code.
6. **Am I creating abstractions for one-time operations?** Stop — inline is
   fine.
7. **Am I adding documentation beyond what's needed?** Stop — no gold-plating.

Three similar lines of code is better than a premature abstraction. The right
amount of complexity is the minimum needed for the current task.
```

For `constitution.md`, add after Principle VII:

```markdown
### VIII. Minimal Necessary Changes (NON-NEGOTIABLE)

Every code change must be the minimum necessary to achieve the task:

- Only modify files directly required by the task
- Do not refactor surrounding code unless the task explicitly requires it
- Do not add features, error handling, or abstractions beyond what is specified
- Do not add documentation, comments, or type annotations to unchanged code
- Three similar lines of code is preferable to a premature abstraction
- Trust internal code and framework guarantees; only validate at system
  boundaries

**Rationale**: Scope creep is the biggest risk in AI-assisted development.
Minimal changes reduce review burden, minimize regression risk, and ensure each
commit is traceable to a specific requirement.
```

## File Structure

```
.claude/agents/
├── [10 existing agents — unchanged]
├── multi-perspective-judge.md          ← Phase 1
├── research-perspective-multiplier.md  ← Phase 2
├── research-dependency-evaluator.md    ← Phase 2
├── research-horizon-scanner.md         ← Phase 2
├── specify-ambiguity-detector.md       ← Phase 3
├── specify-journey-stress-tester.md    ← Phase 3
├── plan-architecture-diverger.md       ← Phase 4
├── plan-api-comparator.md              ← Phase 4
├── plan-refactor-rewrite-advisor.md    ← Phase 4
├── plan-migration-path-finder.md       ← Phase 4
├── plan-data-model-stress-tester.md    ← Phase 4
├── tasks-cross-cutting-scanner.md      ← Phase 5
├── tasks-rollback-planner.md           ← Phase 5
├── validate-security-red-team.md       ← Phase 7
├── implement-variant-generator.md      ← Phase 6
├── implement-bug-triangulator.md       ← Phase 6
├── implement-test-diversifier.md       ← Phase 6
├── implement-error-hardener.md         ← Phase 6
├── implement-performance-explorer.md   ← Phase 6
├── implement-code-review-council.md    ← Phase 6
└── implement-doc-writer.md             ← Phase 6

.claude/commands/                        ← Modified (+ 3 sync copies each)
├── 1_gofer_research.md                 ← Phase 2: model params + strategies #6,#9,#20
├── 2_gofer_specify.md                  ← Phase 3: strategies #10,#19
├── 3_gofer_plan.md                     ← Phase 4: strategies #2,#5,#7,#12,#16
├── 4_gofer_tasks.md                    ← Phase 5: strategies #14,#18 + model retrofit
├── 5_gofer_implement.md                ← Phase 1+6: minimal change rule + strategies
└── 6_gofer_validate.md                 ← Phase 7: strategy #13 + model retrofit

.specify/memory/constitution.md          ← Phase 1: Principle VIII

extension/src/services/EventHandlers.ts  ← Phase 1: tasks.md watcher
tests/unit/services/EventHandlers.test.ts ← Phase 1: watcher test
```

## Risk Assessment

| Risk                                               | Impact                                         | Mitigation                                                          |
| -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Command sync drift (4 locations out of sync)       | High — different agents see different commands | Use diff to verify all 4 copies match after each sync task          |
| Token budget exceeded (>2000 tokens per agent)     | Med — context window pressure                  | Enforce in agent Output Format section; judge has 4000 token budget |
| Model parameter not supported in user's plan       | Low — graceful degradation                     | Task tool falls back to default model if parameter is unsupported   |
| Existing tests break from command changes          | Low — commands are markdown, not code          | Only TypeScript change (watcher) has test risk; run `npm test`      |
| Context window exhaustion from multiple strategies | Med — multiple strategies = many agent results | See Context Budget section below                                    |

## Strategy Invocation Model

Strategies are **invoked by command logic based on trigger conditions**, not by
user selection. Each command section specifies when a strategy applies:

- **Always-on strategies**: Cross-cutting concern scanner (#14), rollback
  planner (#18) — lightweight, always add value
- **Triggered strategies**: Bug triangulator (#3) — only when a bug is
  encountered; dependency evaluator (#9) — only when new dependencies proposed
- **Context-gated strategies**: Skip ALL strategies when context health is
  Warning (>50%) or Critical (>70%)

The command text for each strategy includes a "When to invoke" condition. If the
condition is not met, the strategy is skipped silently.

## Context Budget for Multi-Strategy Invocation

Each strategy invocation adds 2,000-10,000 tokens of agent results to the parent
context (agent count x <2000 token budget). To prevent context exhaustion:

1. **Maximum 2 strategies per pipeline stage** in a single session
2. **Skip all strategies** when context health exceeds 50%
3. **Prioritize by tier**: Tier 1 strategies (#1-#4) run first; Tier 2+ only if
   context budget permits
4. Each command checks context health before invoking strategies:
   ```
   If context > 50%: Skip multi-perspective strategies, proceed with standard pipeline
   ```

---

## Spec Traceability

### User Story Coverage

| Story                                   | Status  | Plan References                                                          |
| --------------------------------------- | ------- | ------------------------------------------------------------------------ |
| US1 (P1) Diverge-Converge Framework     | COVERED | Phase 1 (T001 judge), Phases 2-7 (T006-T040 all 20 agents)               |
| US2 (P1) Cost-Optimized Model Selection | COVERED | Phases 2-8 (model params on all Task calls including auxiliary commands) |
| US3 (P1) Pipeline Stage Integration     | COVERED | Phases 2-7 (command integration + sync)                                  |
| US4 (P1) Minimal Change Enforcement     | COVERED | Phase 1 (T002 constitution, T003 implement command)                      |
| US5 (P2) Task Progress Visibility       | COVERED | Phase 1 (T004 watcher, T005 test)                                        |

### Requirement Coverage

| Requirement                             | Status  | Plan Reference                                                        |
| --------------------------------------- | ------- | --------------------------------------------------------------------- |
| FR1: Agent Definition Files (20)        | COVERED | T006-T008, T012-T013, T016-T020, T023-T024, T028-T034, T037           |
| FR2: Judge/Synthesis Agent              | COVERED | T001                                                                  |
| FR3: Model Selection on All Invocations | COVERED | T009, T025, T038, T041-T043 (retrofit) + all new strategy invocations |
| FR4: Minimal Change Principle           | COVERED | T002, T003                                                            |
| FR5: Tasks.md File Watcher              | COVERED | T004, T005                                                            |
| FR6: Pipeline Command Integration       | COVERED | T010-T011, T014-T015, T021-T022, T026-T027, T035-T036, T039-T040      |

### Acceptance Criteria Mapping

| AC                                    | Plan Task                                                   | Implementation Approach                                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| AC1.1 (20 agent files with format)    | T006-T008, T012-T013, T016-T020, T023-T024, T028-T034, T037 | Follow agent template from plan                                                                                                           |
| AC1.2 (judge agent exists)            | T001                                                        | Create multi-perspective-judge.md                                                                                                         |
| AC1.3 (model specified per agent)     | Each agent task                                             | "Recommended Model" section in every agent file                                                                                           |
| AC1.4 (<2000 token cap)               | Each agent task                                             | "Output Format" section enforces limit                                                                                                    |
| AC2.1 (model param on all Task calls) | T009, T025, T038, T041-T043 + all strategy invocations      | Add `model:` to every `Task:` line                                                                                                        |
| AC2.2 (diverge uses haiku/sonnet)     | All strategy tasks                                          | Per model assignment matrix in research                                                                                                   |
| AC2.3 (converge uses opus)            | All strategy commands                                       | Judge invocations specify `model: "opus"`                                                                                                 |
| AC2.4 (retrofit existing agents)      | T009, T025, T038, T041-T043                                 | Retrofit 15 existing Task calls (3 research + 6 validation + 3 hydrate + 2 constitution + 1 tests) + add 1 new engineer-review invocation |
| AC3.1-3.6 (stage integration)         | T010, T014, T021, T026, T035, T039                          | Command modifications                                                                                                                     |
| AC3.7 (sync to 4 locations)           | T011, T015, T022, T027, T036, T040, T044-T046               | Copy + diff verify                                                                                                                        |
| AC4.1 (implement command rule)        | T003                                                        | Add minimal-change section before task loop                                                                                               |
| AC4.2 (constitution principle)        | T002                                                        | Add Principle VIII                                                                                                                        |
| AC4.3 (per-modification check)        | T003                                                        | 7-point checklist in command                                                                                                              |
| AC4.4 (clear rule)                    | T002, T003                                                  | Explicit language per plan text                                                                                                           |
| AC5.1 (manual refresh works)          | Already verified                                            | No change needed                                                                                                                          |
| AC5.2 (auto-refresh on tasks.md)      | T004                                                        | File watcher on tasks.md                                                                                                                  |
| AC5.3 (implement updates checkboxes)  | Already verified                                            | No change needed                                                                                                                          |

Coverage: 100% of user stories, 100% of functional requirements, 100% of
acceptance criteria
