# Feature Specification: Engineer Review Gate

**Feature Branch**: `001-engineer-review-gate` **Created**: 2026-02-23
**Status**: Draft **Input**: User description: "Create an engineer-review agent
that acts as a critical quality gate between task generation and implementation,
cross-referencing spec.md, plan.md, and tasks.md to verify full alignment."

## Overview

The Engineer Review Gate adds a new `engineer-review` agent that acts as the
final quality checkpoint before any implementation begins. Running within
`/4_gofer_tasks` after task generation and traceability, it cross-references ALL
pipeline artifacts (spec.md, plan.md, tasks.md, traceability.md, contracts/,
data-model.md) to catch misalignments, gaps, and inconsistencies. The agent is
deliberately adversarial — it assumes everything is wrong until proven correct.
A correction loop (max 3 iterations) ensures artifacts are fixed and
re-validated until 100% consistent.

**Research Reference**: See `research.md` for codebase analysis and integration
points.

## User Stories

### US1: Cross-Artifact Alignment Validation (P1)

**As a** developer using the Gofer pipeline **I want** an automated review that
catches misalignments between spec, plan, and tasks before implementation starts
**So that** I don't waste implementation effort on tasks that don't match what
was specified or planned

**Why this priority**: This is the core value proposition — without
cross-artifact validation, misalignments silently propagate into implementation,
causing expensive rework.

**Independent Test**: Can be fully tested by creating a set of deliberately
misaligned artifacts (e.g., spec with 5 acceptance criteria but tasks covering
only 3) and verifying the agent detects all gaps.

**Acceptance Criteria**:

- [ ] AC1.1: The agent verifies every acceptance criterion in spec.md has at
      least one implementing task in tasks.md
- [ ] AC1.2: The agent verifies every plan.md phase has a corresponding task
      phase with matching scope
- [ ] AC1.3: The agent verifies every contract/API defined in plan.md or
      contracts/ has tasks to implement it
- [ ] AC1.4: The agent verifies every data model entity has tasks covering all
      its fields and relationships
- [ ] AC1.5: The agent verifies the planned architecture (file structure,
      patterns) is reflected in task descriptions
- [ ] AC1.6: The agent produces a structured report with Red/Yellow/Gray
      severity findings
- [ ] AC1.7: Any Red finding blocks progression to `/5_gofer_implement`

---

### US2: Iterative Correction Loop (P1)

**As a** developer using the Gofer pipeline **I want** artifact misalignments to
be automatically fixed and re-validated **So that** the pipeline self-corrects
without requiring manual intervention for common alignment issues

**Why this priority**: Without the correction loop, the agent would only report
problems without fixing them, requiring manual editing before re-running —
defeating the purpose of automation.

**Independent Test**: Can be tested by creating artifacts with a known gap
(e.g., missing task for an acceptance criterion), running the agent, applying
the fix, and verifying the agent passes on re-run.

**Acceptance Criteria**:

- [ ] AC2.1: When the engineer-review agent reports findings, the
      `/4_gofer_tasks` command applies fixes to affected artifacts (spec.md,
      plan.md, tasks.md)
- [ ] AC2.2: After fixes are applied, the engineer-review agent re-runs to
      validate the fixes
- [ ] AC2.3: The correction loop runs a maximum of 3 iterations
- [ ] AC2.4: If Red findings persist after 3 iterations, the pipeline halts and
      escalates to the user with a summary of remaining issues
- [ ] AC2.5: Each iteration's findings are logged so the user can see what was
      fixed

---

### US3: Integration with Existing Pipeline (P2)

**As a** developer using `/0_business_scenario` orchestration **I want** the
engineer review to run seamlessly within `/4_gofer_tasks` without disrupting the
auto-chaining pipeline **So that** the quality gate is transparent — it runs
automatically and only surfaces when problems can't be auto-fixed

**Why this priority**: The pipeline must remain smooth. Adding a quality gate
that requires manual intervention for every run would slow down the workflow.

**Independent Test**: Can be tested by running the full pipeline from
`/0_business_scenario` through to `/5_gofer_implement` and verifying the
engineer review ran (visible in output) without requiring manual steps.

**Acceptance Criteria**:

- [ ] AC3.1: The engineer-review agent runs as a new step within
      `/4_gofer_tasks` after traceability generation (Step 4.5) and before the
      approval gate (Step 5)
- [ ] AC3.2: The agent is invoked using the Task tool with
      `subagent_type="engineer-review"`, following the same pattern as
      validation agents in `/6_gofer_validate`
- [ ] AC3.3: Auto-chaining from `/4_gofer_tasks` to `/5_gofer_implement` is not
      disrupted when the review passes
- [ ] AC3.4: The agent file follows the standard agent format (YAML frontmatter,
      7 sections, <2000 token output cap)

---

### Edge Cases

- What happens when plan.md or contracts/ directory doesn't exist? The agent
  should gracefully skip those alignment checks and note which checks were
  skipped.
- What happens when tasks.md is empty or has no parseable tasks? The agent
  should report a Red finding: "No tasks found to validate."
- What happens when the correction loop fixes one issue but introduces another?
  The re-run catches the new issue; the 3-iteration cap prevents infinite loops.
- What happens when spec.md has no acceptance criteria? The agent should report
  a Yellow finding: "No acceptance criteria found — spec may be incomplete."

## Functional Requirements

### FR-001: Agent File Creation

The system MUST create an `engineer-review.md` agent file in `.claude/agents/`
following the exact structure of existing validation agents (YAML frontmatter
with name/description/tools, 7 standard sections including LLM Council Mode).

- **Validation**: Agent file exists and contains all 7 required sections
- **Integration**: Follows pattern from
  `.claude/agents/validation-correctness.md`

### FR-002: Five-Area Alignment Check

The agent MUST check alignment across 5 specific areas:

1. **Spec ↔ Tasks**: Every acceptance criterion has implementing tasks
2. **Plan ↔ Tasks**: Every plan phase has corresponding task phase with
   matching scope
3. **Contracts ↔ Tasks**: Every contract/API in plan.md has tasks to implement
   it
4. **Data Model ↔ Tasks**: Every entity has tasks covering all its fields
5. **Architecture ↔ Tasks**: Planned file structure and patterns are reflected
   in tasks

- **Validation**: Run agent against artifacts with known gaps in each area;
  verify all 5 areas are checked
- **Integration**: Uses artifact regex patterns from research.md
  (AC/US/FR/Phase/Task regexes)

### FR-003: Severity Classification

The agent MUST classify findings using the existing Red/Yellow/Gray severity
system:

- **Red**: Blocking — prevents progression to implementation (e.g., acceptance
  criterion with no implementing task)
- **Yellow**: Must address — requires fixing but doesn't auto-block (e.g., task
  description doesn't fully match plan scope)
- **Gray**: Informational — noted but no action required (e.g., task covers more
  than strictly required by spec)

- **Validation**: Agent output contains severity classification for every
  finding
- **Integration**: Same severity system used by all 6 validation agents

### FR-004: Structured Output Format

The agent MUST return a structured report in <2000 tokens containing:

- Summary counts (areas checked, findings by severity)
- Findings table (area, finding, severity, evidence)
- Blocking issues list
- Recommendations list

- **Validation**: Output is parseable and under 2000 tokens
- **Integration**: Matches output format pattern from validation agents

### FR-005: Correction Loop in /4_gofer_tasks

The `/4_gofer_tasks` command MUST be updated to:

1. Run the engineer-review agent after traceability generation
2. Parse the agent's findings
3. Apply fixes to affected artifacts (the command applies fixes, not the agent —
   agents are read-only)
4. Re-run the agent (max 3 iterations)
5. Halt with user escalation if Red findings persist after 3 iterations

- **Validation**: Run pipeline with deliberately misaligned artifacts; verify
  loop executes and fixes are applied
- **Integration**: Follows brownfield restart loop pattern from
  `/6_gofer_validate` lines 634-784

### FR-006: Agent Registration for Distribution

The agent MUST be registered for VSIX distribution:

- Bundled copy in `extension/resources/claude-agents/engineer-review.md`
- Registered in `goferMigrator.ts` `setupClaudeAgents()` for auto-deployment

- **Validation**: Agent file is copied to workspaces on extension activation
- **Integration**: Follows pattern from `extension/src/goferMigrator.ts:588`

### FR-007: Read-Only Agent Tools

The agent MUST only use `Read, Grep, Glob, LS` tools — no Edit or Write. The
agent reports findings; the parent command applies fixes.

- **Validation**: Agent YAML frontmatter specifies only read-only tools
- **Integration**: Consistent with all existing agents in `.claude/agents/`

### Key Entities

- **Engineer Review Report**: The structured output from the agent containing
  findings, severity classifications, and evidence references
- **Alignment Check**: A single verification of one area (e.g., Spec ↔ Tasks),
  producing zero or more findings
- **Correction Iteration**: One cycle of: run agent → parse findings → apply
  fixes → re-run agent

## Non-Functional Requirements

### Performance

- Agent analysis must complete in a single Task tool invocation (no multi-turn
  agents)
- Agent output must be <2000 tokens to avoid flooding the parent context

### Compatibility

- Must follow existing agent file format exactly (YAML frontmatter, 7 sections)
- Must integrate with `/4_gofer_tasks` without changing its interface with
  upstream/downstream commands
- Must work with the LLM Council mode when enabled

## Success Criteria

| Metric                       | Target                                         | Measurement                                                              |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Alignment gap detection rate | 100% of deliberately introduced gaps caught    | Create test artifacts with known gaps in each of the 5 alignment areas   |
| False positive rate          | <10% of findings are false positives           | Review agent output against 3 real pipeline runs                         |
| Correction loop convergence  | Issues resolved within 2 iterations on average | Track iteration counts across pipeline runs                              |
| Pipeline disruption          | Zero disruption to passing pipelines           | Run full pipeline on well-aligned artifacts; verify no unnecessary halts |
| Output token compliance      | <2000 tokens per report                        | Measure agent output length across runs                                  |

## Assumptions

- All pipeline artifacts (spec.md, plan.md, tasks.md) follow the established
  regex-parseable formats documented in research.md
- The agent has access to the full feature directory via the
  `Read, Grep, Glob, LS` tools
- The correction loop is prompt-based (the `/4_gofer_tasks` command orchestrates
  it), not code-based
- Agents are read-only — the agent reports findings, the parent command applies
  fixes
- The `<2000 token` output cap from existing agents is sufficient for the review
  report
- The 3-iteration cap on the correction loop is sufficient for most alignment
  issues

## Dependencies

- `.claude/commands/4_gofer_tasks.md` — Must be modified to add the engineer
  review step and correction loop
- `.claude/agents/validation-correctness.md` — Pattern template for the new
  agent file
- `extension/src/goferMigrator.ts` — Must be updated to register the new agent
  for distribution
- `extension/resources/claude-agents/` — Must contain a bundled copy of the
  agent
- Existing artifact format conventions (AC regex, US regex, FR regex, Phase
  regex, Task regex from research.md)

## Out of Scope

- Reviewing source code quality (that's `/6_gofer_validate`'s job)
- Modifying the pipeline stage boundaries (this runs WITHIN `/4_gofer_tasks`,
  not as a new stage)
- Replacing the existing traceability step (Step 4.5) — the engineer review
  VALIDATES traceability, not generates it
- Auto-fixing issues in source code — the agent only fixes alignment in markdown
  artifacts (spec/plan/tasks)
- Adding new pipeline commands or stage numbers

## Glossary

| Term                    | Definition                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Engineer Review         | A quality gate agent that cross-references pipeline artifacts for alignment                          |
| Alignment Check         | Verification that two or more artifacts are consistent (e.g., spec acceptance criteria map to tasks) |
| Correction Loop         | Iterative cycle of review → fix → re-review, max 3 iterations                                        |
| Red Finding             | A blocking issue that prevents progression to implementation                                         |
| Yellow Finding          | An issue that should be addressed but doesn't auto-block                                             |
| Gray Finding            | An informational note requiring no action                                                            |
| Brownfield Restart Loop | Existing pattern from `/6_gofer_validate` for iterative correction                                   |

## Research Traceability

| Research Finding                             | Spec Section              | Reference                   |
| -------------------------------------------- | ------------------------- | --------------------------- |
| Validation agent file format (7 sections)    | FR-001                    | Pattern 1 in research.md    |
| Agent invocation via Task tool               | AC3.2, FR-005             | Pattern 2 in research.md    |
| Brownfield restart loop (correction pattern) | US2, FR-005               | Pattern 3 in research.md    |
| Spec-to-task traceability step               | US1, AC3.1                | Pattern 4 in research.md    |
| Red/Yellow/Gray severity tiers               | FR-003                    | Pattern 5 in research.md    |
| Single agent decision                        | FR-001, FR-002            | Decision 1 in research.md   |
| Inline integration (within /4_gofer_tasks)   | AC3.1, Out of Scope       | Decision 2 in research.md   |
| Max 3 iteration loop                         | AC2.3, FR-005             | Decision 3 in research.md   |
| Adversarial tone                             | US1, FR-002               | Decision 4 in research.md   |
| Agent output cap (<2000 tokens)              | FR-004, Assumptions       | Constraints in research.md  |
| Read-only tools restriction                  | FR-007                    | Constraints in research.md  |
| LLM Council Mode section required            | FR-001, NFR Compatibility | MEMORY.md learning          |
| Kebab-case naming convention                 | FR-001                    | Constraints in research.md  |
| Agent registration in goferMigrator          | FR-006                    | Related Code in research.md |
| Bundled agent copy for VSIX                  | FR-006, Dependencies      | Related Code in research.md |
