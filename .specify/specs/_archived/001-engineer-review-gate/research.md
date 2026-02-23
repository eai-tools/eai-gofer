---
date: 2026-02-23T12:30:00Z
researcher: Claude
feature: 'Engineer Review Gate'
status: complete
---

# Research: Engineer Review Gate

## Feature Summary

Create a new `engineer-review` agent that acts as a critical quality gate
between `/4_gofer_tasks` (task breakdown) and `/5_gofer_implement`
(implementation). The agent cross-references spec.md, plan.md, and tasks.md to
verify full alignment before any code is written. It runs in a correction loop
until all artifacts are 100% consistent.

## Codebase Analysis

### Where to Implement

| Component                | Location                                               | Purpose                                                                       |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Agent file               | `.claude/agents/engineer-review.md`                    | The specialist agent definition (read-only analysis)                          |
| Command integration      | `.claude/commands/4_gofer_tasks.md`                    | Insert engineer review invocation after task generation, before approval gate |
| Bundled agent (optional) | `extension/resources/claude-agents/engineer-review.md` | Copy for VSIX distribution                                                    |
| Migrator registration    | `extension/src/goferMigrator.ts`                       | Register agent for auto-deployment to new workspaces                          |

### Existing Patterns to Follow

#### Pattern 1: Validation Agent File Format

Found in: `.claude/agents/validation-correctness.md` (all 6 validation agents
follow this)

Every agent has:

```
---
name: validation-{type}
description: {one-line purpose}
tools: Read, Grep, Glob, LS
---

[Opening role paragraph]

## Core Responsibilities
## Analysis Strategy (### Step N: Title)
## Output Format (<2000 tokens)
## Blocking Criteria
## Important Guidelines
## LLM Council Mode
```

Why relevant: The engineer-review agent should follow this exact structure for
consistency.

#### Pattern 2: Agent Invocation via Task Tool

Found in: `.claude/commands/6_gofer_validate.md` lines 136-215

```
Task: subagent_type="validation-correctness"
Prompt: "Validate functional correctness for feature [FEATURE_NAME].
Feature directory: {FEATURE_DIR}
Spec: {FEATURE_DIR}/spec.md
..."
```

Why relevant: The engineer-review agent will be invoked the same way from
`/4_gofer_tasks`.

#### Pattern 3: Brownfield Restart Loop (Iterative Correction)

Found in: `.claude/commands/6_gofer_validate.md` lines 634-784

The validation stage has a loop that:

1. Runs validation → detects failures
2. Generates `remediation-report.md` with specific fixes
3. Re-routes to `/5_gofer_implement` for fixes
4. Re-runs validation (max 3 iterations)
5. Escalates to human on 3rd failure

Why relevant: The engineer-review needs a similar loop, but simpler — it fixes
artifacts (spec/plan/tasks markdown), not source code. The loop runs inline
within `/4_gofer_tasks` rather than across pipeline stages.

#### Pattern 4: Spec-to-Task Traceability

Found in: `.claude/commands/4_gofer_tasks.md` lines 264-400

The existing `/4_gofer_tasks` already has a traceability step (Step 4.5) that:

- Maps acceptance criteria → tasks (GAP-03)
- Maps plan phases → task phases (GAP-01)
- Maps data model entities → tasks (GAP-05)
- Generates `traceability.md`

Why relevant: The engineer-review agent should READ and VALIDATE this
traceability, not regenerate it. It should catch gaps the traceability step
missed.

#### Pattern 5: Severity Tiers (Red/Yellow/Gray)

Found in: All 6 validation agents

| Severity | Meaning       | Effect                                 |
| -------- | ------------- | -------------------------------------- |
| Red      | Blocking      | Prevents proceeding to implementation  |
| Yellow   | Must address  | Requires fixing but doesn't auto-block |
| Gray     | Informational | Noted but no action required           |

Why relevant: The engineer-review should use the same severity system.

### Integration Points

1. **`/4_gofer_tasks` command** — The engineer-review runs as a new step after
   task generation (Step 4.5 traceability) and before the approval gate (Step
   5). Insert between lines ~400 and ~420 of `4_gofer_tasks.md`.

2. **Artifact format parsing** — The agent must parse:
   - `spec.md` acceptance criteria: regex `- \[ \] AC(\d+)\.(\d+): (.+)`
   - `spec.md` user stories: regex `### US(\d+): (.+) \(P(\d+)\)`
   - `spec.md` functional requirements: regex `\*\*FR-(\d{3})\*\*: (.+)`
   - `plan.md` phases: regex `### Phase (\d+): (.+)`
   - `plan.md` integration points, file structure, risk assessment
   - `tasks.md` tasks: regex
     `- \[([ xX])\] T(\d{3})(?:\s+\[P\])?(?:\s+\[US(\d+)\])?\s+(.+)`
   - `tasks.md` phases: regex `## Phase (\d+): (.+)`
   - `traceability.md` coverage tables
   - `contracts/` directory if present
   - `data-model.md` if present

3. **Pipeline chaining** — Auto-chaining is prompt-based (not code-based). Each
   command ends with:

   ```
   If orchestrated by `/0_business_scenario`, the orchestrator will automatically
   invoke `/N+1_gofer_{next}` next.
   ```

   The engineer-review doesn't change this — it runs WITHIN `/4_gofer_tasks`,
   not as a separate pipeline stage.

4. **CLAUDE.md documentation** — The pipeline diagram and command tables in
   CLAUDE.md should be updated to mention the engineer review gate.

### Related Code

- `.claude/commands/4_gofer_tasks.md` — Where the agent is invoked
- `.claude/commands/6_gofer_validate.md` — Pattern for brownfield loop and agent
  spawning
- `.claude/agents/validation-correctness.md` — Closest agent pattern (spec
  compliance checking)
- `.claude/agents/validation-integration.md` — Contract validation pattern
- `extension/src/goferMigrator.ts:588` — `setupClaudeAgents()` for agent
  deployment
- `extension/resources/claude-agents/` — Bundled agent copies (only 3 research
  agents currently)

## Technology Decisions

### Decision 1: Single Agent vs Multiple Agents

- **Choice**: Single `engineer-review` agent
- **Rationale**: The review is a unified cross-referencing task. Splitting into
  sub-agents (spec-review, plan-review, task-review) would lose the
  cross-cutting alignment check which is the whole point.
- **Alternatives considered**: Multiple specialized review agents (rejected —
  the value is in cross-referencing ALL artifacts together)

### Decision 2: Integration Point

- **Choice**: Inline within `/4_gofer_tasks` after traceability generation,
  before approval gate
- **Rationale**: The review validates the artifacts that `/4_gofer_tasks`
  produces. Running it inside that command keeps the correction loop tight —
  fixes are applied immediately and the review re-runs within the same stage.
- **Alternatives considered**: Separate pipeline stage `/4.5_gofer_review`
  (rejected — adds pipeline complexity without benefit, and auto-chaining is
  prompt-based so adding a half-stage is awkward)

### Decision 3: Correction Loop Mechanics

- **Choice**: The `/4_gofer_tasks` command applies fixes to artifacts and
  re-runs the engineer-review agent, max 3 iterations
- **Rationale**: Follows the established brownfield restart loop pattern from
  `/6_gofer_validate`. The loop runs within the command, not across pipeline
  stages.
- **Alternatives considered**: Re-running the full pipeline from
  `/2_gofer_specify` (rejected — overkill; most issues are misalignments that
  can be fixed by adjusting tasks/plan/spec without re-researching)

### Decision 4: Agent Tone

- **Choice**: Extremely critical and precise — the agent assumes everything is
  wrong until proven correct
- **Rationale**: User specifically requested "extremely critical and precise."
  The agent should be adversarial, looking for gaps, inconsistencies, and
  missing coverage. This is a quality gate, not a rubber stamp.

## Constraints & Considerations

- **Agent output cap**: All agents must return <2000 tokens to avoid flooding
  the parent context
- **LLM Council Mode section**: Required for consistency with all 9 existing
  agents (per MEMORY.md learning)
- **Tools restriction**: Agent files can only specify `Read, Grep, Glob, LS` —
  no Edit or Write (agents are read-only)
- **Artifact fixes**: The engineer-review agent REPORTS findings; the
  `/4_gofer_tasks` command (the parent) APPLIES fixes based on the findings
- **Naming convention**: Agent filename should be `engineer-review.md` to match
  existing kebab-case convention (`validation-correctness.md`,
  `codebase-locator.md`)

## Recommendations

1. Create `engineer-review.md` agent following the validation agent template
   exactly
2. Add a new Step 4.6 in `4_gofer_tasks.md` that spawns the agent after
   traceability generation
3. Add a correction loop (max 3 iterations) that fixes artifacts and re-runs the
   agent
4. Update CLAUDE.md pipeline diagram to show the engineer review gate
5. The agent should check 5 specific alignment areas:
   - **Spec ↔ Tasks**: Every acceptance criterion has implementing tasks
   - **Plan ↔ Tasks**: Every plan phase has corresponding task phase with
     matching scope
   - **Contracts ↔ Tasks**: Every contract/API in plan.md has tasks to
     implement it
   - **Data Model ↔ Tasks**: Every entity has tasks covering all its fields
   - **Architecture ↔ Tasks**: The planned architecture (patterns, file
     structure) is reflected in tasks
