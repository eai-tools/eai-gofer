---
feature: Engineer Review Gate
spec: spec.md
research: research.md
status: ready
created: 2026-02-23
---

# Implementation Plan: Engineer Review Gate

## Summary

Create a new `engineer-review` agent that cross-references spec.md, plan.md,
tasks.md, and related artifacts to verify full alignment before implementation
begins. The agent runs within `/4_gofer_tasks` as a new step after traceability
generation, with a correction loop (max 3 iterations) that fixes misalignments
and re-validates. This is a prompt-only feature — all deliverables are markdown
files.

## Technical Context

### Tech Stack

- **Language**: Markdown (agent prompt files and command files)
- **Framework**: Claude Code agent system (`.claude/agents/` and
  `.claude/commands/`)
- **Storage**: File-based (agent markdown files)
- **Testing**: Manual pipeline runs with deliberately misaligned artifacts;
  validation via `/6_gofer_validate`
- **Target Platform**: Claude Code CLI and VSCode extension (via Gofer migrator)

### Architecture

```text
/4_gofer_tasks (command orchestrator)
    │
    ├── Step 4.5: Traceability generation (existing)
    │
    ├── Step 4.6: Engineer Review Gate (NEW)    ◄── INSERT HERE
    │   │
    │   ├── Spawn engineer-review agent via Task tool
    │   │   └── Agent reads: spec.md, plan.md, tasks.md,
    │   │       traceability.md, contracts/, data-model.md
    │   │
    │   ├── Parse findings (Red/Yellow/Gray)
    │   │
    │   ├── If Red findings exist:
    │   │   ├── Apply fixes to affected artifacts
    │   │   ├── Re-run agent (max 3 iterations)
    │   │   └── If still failing after 3: escalate to user
    │   │
    │   └── If no Red findings: proceed
    │
    ├── Step 5: Generate GitHub Issues (existing, renumbered)
    │
    └── Step 6: Approval Gate (existing, renumbered)
```

### Integration Points

| Component               | File                                                   | Integration Type                                                                        |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Engineer review agent   | `.claude/agents/engineer-review.md`                    | New agent file (read-only analysis)                                                     |
| Task generation command | `.claude/commands/4_gofer_tasks.md`                    | Insert new Step 4.6 with correction loop                                                |
| Bundled agent copy      | `extension/resources/claude-agents/engineer-review.md` | Identical copy for VSIX distribution                                                    |
| Migrator (auto-deploy)  | `extension/src/goferMigrator.ts`                       | No code change needed — migrator copies all `.md` files from `resources/claude-agents/` |
| Pipeline documentation  | `CLAUDE.md`                                            | Update pipeline diagram to mention engineer review gate                                 |

### Key Dependencies

- `.claude/agents/validation-correctness.md` — Template pattern for agent file
  structure
- `.claude/commands/6_gofer_validate.md` — Pattern for brownfield restart loop
  and agent spawning
- `.claude/commands/4_gofer_tasks.md` — Target file for inserting the new step

## Constitution Check

- [x] **Principle I (TDD)**: N/A — prompt-only feature, no executable code.
      Testing is via pipeline runs.
- [x] **Principle III (Spec Kit Format)**: Agent file follows established YAML
      frontmatter + 7-section format.
- [x] **Principle IV (TypeScript Quality)**: N/A — no TypeScript changes for
      agent/command files. Migrator already copies all `.md` files.
- [x] **Principle VII (80% Coverage)**: N/A — no executable code to cover.

## Implementation Phases

### Phase 1: Create Engineer Review Agent File

**Goal**: Create the agent markdown file with all 7 required sections

**Deliverables**:

- `.claude/agents/engineer-review.md` — The agent definition

**Agent Structure** (follows Pattern 1 from research.md):

```
---
name: engineer-review
description: Cross-references spec, plan, and tasks to verify alignment before implementation
tools: Read, Grep, Glob, LS
---

[Opening paragraph: adversarial reviewer role]

## Core Responsibilities
  1. Spec ↔ Tasks alignment (acceptance criteria coverage)
  2. Plan ↔ Tasks alignment (phase scope matching)
  3. Contracts ↔ Tasks alignment (API endpoint coverage)
  4. Data Model ↔ Tasks alignment (entity field coverage)
  5. Architecture ↔ Tasks alignment (file structure, patterns)

## Analysis Strategy
  ### Step 1: Load All Artifacts
  ### Step 2: Spec ↔ Tasks Check
  ### Step 3: Plan ↔ Tasks Check
  ### Step 4: Contracts & Data Model Check
  ### Step 5: Architecture Check
  ### Step 6: Generate Findings

## Output Format (<2000 tokens)
  Structured report with:
  - Summary counts
  - Findings table (area, finding, severity, evidence)
  - Blocking issues (Red)
  - Recommendations (Yellow/Gray)

## Blocking Criteria
  - Any acceptance criterion with no implementing task = Red
  - Any plan phase with no corresponding task phase = Red
  - No parseable tasks found = Red
  - Contract endpoint with no implementing task = Red

## Important Guidelines
  - Be adversarial: assume everything is wrong until proven correct
  - Cite specific file paths and line numbers for evidence
  - Gracefully skip checks when artifacts don't exist (e.g., no contracts/)
  - Validate traceability.md but don't regenerate it

## LLM Council Mode
  [Standard council mode paragraph]
```

**Verification**:

- Agent file has YAML frontmatter with name, description, tools
- Agent file has all 7 sections
- Tools are read-only (Read, Grep, Glob, LS)
- Output format specifies <2000 token cap

### Phase 2: Integrate into /4_gofer_tasks Command

**Goal**: Add Step 4.6 (Engineer Review Gate) and correction loop to the task
generation command

**Deliverables**:

- Updated `.claude/commands/4_gofer_tasks.md` — New Step 4.6 inserted between
  existing Steps 4.5 and 5

**Integration Design**:

Insert a new `## Step 4.6: Engineer Review Gate` section between the
traceability step (Step 4.5, ending at line ~404) and the GitHub issues step
(currently Step 5, starting at line ~408). Renumber existing Steps 5 and 6 to
Steps 5.5 and 6.

The new step includes:

1. **Agent Invocation** (follows Pattern 2 from research.md):

   ```
   Task: subagent_type="engineer-review"
   Prompt: "Review alignment for feature [FEATURE_NAME].
   Feature directory: {FEATURE_DIR}
   Spec: {FEATURE_DIR}/spec.md
   Plan: {FEATURE_DIR}/plan.md
   Tasks: {FEATURE_DIR}/tasks.md
   Traceability: {FEATURE_DIR}/traceability.md
   ..."
   ```

2. **Finding Parser**:
   - Parse the agent's structured output
   - Extract Red, Yellow, Gray findings
   - If no Red findings: log results and proceed

3. **Correction Loop** (follows Pattern 3 from research.md):

   ```
   ITERATION = 1
   MAX_ITERATIONS = 3

   WHILE Red findings exist AND ITERATION <= MAX_ITERATIONS:
     1. For each Red finding, apply fix to affected artifact:
        - Missing task for AC → add task to tasks.md
        - Phase scope mismatch → update task descriptions
        - Missing contract task → add task to tasks.md
        - Missing data model task → add task to tasks.md
     2. Re-run traceability generation (Step 4.5)
     3. Re-run engineer-review agent
     4. ITERATION += 1

   IF Red findings still exist after 3 iterations:
     Generate escalation report
     HALT pipeline with user notification
   ```

4. **Escalation** (follows Pattern 3 escalation from `/6_gofer_validate`):
   ```
   Write {FEATURE_DIR}/engineer-review-escalation.md
   Display: "After 3 correction attempts, alignment issues remain.
             Human review required before implementation can begin."
   ```

**Verification**:

- New step appears between traceability and approval gate
- Agent is spawned using Task tool with correct subagent_type
- Correction loop runs max 3 iterations
- Escalation triggers on 3rd failure
- Existing steps renumbered correctly

### Phase 3: Bundle Agent for VSIX Distribution

**Goal**: Ensure the agent is distributed with the extension and auto-deployed
to workspaces

**Deliverables**:

- `extension/resources/claude-agents/engineer-review.md` — Identical copy of the
  agent file

**Implementation**:

Copy `.claude/agents/engineer-review.md` to
`extension/resources/claude-agents/engineer-review.md`. The existing
`setupClaudeAgents()` method in `goferMigrator.ts` already copies all `.md`
files from the bundled directory — no code change needed.

**Verification**:

- File exists in `extension/resources/claude-agents/`
- Content is identical to `.claude/agents/engineer-review.md`
- Migrator's `setupClaudeAgents()` would copy it (confirmed: copies all `.md`
  files)

### Phase 4: Update Pipeline Documentation

**Goal**: Update CLAUDE.md to reflect the engineer review gate in the pipeline
diagram

**Deliverables**:

- Updated `CLAUDE.md` — Pipeline diagram and command table mention engineer
  review

**Changes**:

1. Update the pipeline ASCII diagram to show the engineer review gate:

   ```
   │  4. /4_gofer_tasks       → tasks.md, issues.md                  │
   │     Dependency-ordered task breakdown + engineer review gate     │
   ```

2. Add note in the `/4_gofer_tasks` description mentioning the engineer review
   gate runs as the last quality check before implementation.

**Verification**:

- Pipeline diagram mentions engineer review gate
- No disruption to existing documentation structure

## File Structure

```text
# New files
.claude/agents/engineer-review.md                         # Agent definition
extension/resources/claude-agents/engineer-review.md      # Bundled copy for VSIX

# Modified files
.claude/commands/4_gofer_tasks.md                         # Add Step 4.6 + correction loop
CLAUDE.md                                                  # Update pipeline diagram
```

## Risk Assessment

| Risk                                                    | Impact | Mitigation                                                                                          |
| ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Agent output exceeds 2000 token cap                     | Med    | Output format section explicitly caps at <2000 tokens; use concise table format                     |
| Correction loop creates infinite fix/break cycle        | High   | Hard cap at 3 iterations; escalation to human on 3rd failure                                        |
| Agent produces false positives                          | Med    | Agent guidelines emphasize evidence-based findings with file:line citations                         |
| Renumbering steps in 4_gofer_tasks.md breaks references | Low    | Only internal step references within the command file; no external dependencies on step numbers     |
| Agent tries to modify files (violating read-only)       | Low    | YAML frontmatter restricts tools to Read, Grep, Glob, LS; agent guidelines reinforce read-only role |

## Notes

- This is a **prompt-only feature** — no TypeScript, no tests, no data model, no
  API contracts
- The migrator already handles agent deployment generically (copies all `.md`
  from bundled dir) — no `goferMigrator.ts` code changes needed
- Step numbering in `/4_gofer_tasks.md`: keep existing step numbers and add 4.6
  as a sub-step to avoid cascading renumber
- The correction loop fixes markdown artifacts only (spec.md, plan.md, tasks.md)
  — never source code

## Spec Traceability

### User Story Coverage

| Story                               | Status  | Plan References                                                            |
| ----------------------------------- | ------- | -------------------------------------------------------------------------- |
| US1 (P1): Cross-Artifact Alignment  | COVERED | Phase 1 (agent file, 5-area alignment checks), Phase 2 (integration)       |
| US2 (P1): Iterative Correction Loop | COVERED | Phase 2 (correction loop in /4_gofer_tasks)                                |
| US3 (P2): Pipeline Integration      | COVERED | Phase 2 (step insertion), Phase 3 (bundled agent), Phase 4 (documentation) |

### Requirement Coverage

| Requirement                       | Status  | Plan Reference                               |
| --------------------------------- | ------- | -------------------------------------------- |
| FR-001: Agent File Creation       | COVERED | Phase 1                                      |
| FR-002: Five-Area Alignment Check | COVERED | Phase 1 (Core Responsibilities section)      |
| FR-003: Severity Classification   | COVERED | Phase 1 (Output Format + Blocking Criteria)  |
| FR-004: Structured Output Format  | COVERED | Phase 1 (Output Format section)              |
| FR-005: Correction Loop           | COVERED | Phase 2 (correction loop design)             |
| FR-006: Agent Registration        | COVERED | Phase 3 (bundled copy; migrator auto-copies) |
| FR-007: Read-Only Tools           | COVERED | Phase 1 (YAML frontmatter tools restriction) |

### Acceptance Criteria Coverage

| Criterion                             | Plan Component                       | How Addressed                                  |
| ------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| AC1.1: Spec ↔ Tasks (AC coverage)    | Phase 1: Analysis Strategy Step 2    | Agent checks every AC maps to task             |
| AC1.2: Plan ↔ Tasks (phase matching) | Phase 1: Analysis Strategy Step 3    | Agent checks every phase has tasks             |
| AC1.3: Contracts ↔ Tasks             | Phase 1: Analysis Strategy Step 4    | Agent checks contract endpoints                |
| AC1.4: Data Model ↔ Tasks            | Phase 1: Analysis Strategy Step 4    | Agent checks entity coverage                   |
| AC1.5: Architecture ↔ Tasks          | Phase 1: Analysis Strategy Step 5    | Agent checks file structure                    |
| AC1.6: Red/Yellow/Gray report         | Phase 1: Output Format section       | Structured findings table                      |
| AC1.7: Red blocks progression         | Phase 2: Correction loop logic       | Red findings trigger loop                      |
| AC2.1: Command applies fixes          | Phase 2: Correction loop fix step    | Parent command fixes artifacts                 |
| AC2.2: Re-run after fixes             | Phase 2: Loop re-runs agent          | Agent re-invoked each iteration                |
| AC2.3: Max 3 iterations               | Phase 2: MAX_ITERATIONS = 3          | Hard cap in loop                               |
| AC2.4: Escalation after 3 failures    | Phase 2: Escalation section          | Generates escalation report                    |
| AC2.5: Iteration findings logged      | Phase 2: Loop outputs each iteration | Each iteration's report visible                |
| AC3.1: Runs after traceability        | Phase 2: Step 4.6 placement          | Inserted between 4.5 and 5                     |
| AC3.2: Task tool invocation           | Phase 2: Agent invocation pattern    | Uses subagent_type="engineer-review"           |
| AC3.3: No pipeline disruption         | Phase 2 + Phase 4                    | Runs within /4_gofer_tasks; chaining preserved |
| AC3.4: Standard agent format          | Phase 1: 7-section structure         | Follows validation-correctness.md pattern      |

Coverage: 3/3 user stories, 7/7 functional requirements, 15/15 acceptance
criteria
