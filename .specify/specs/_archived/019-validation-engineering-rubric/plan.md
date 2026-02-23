---
feature: Validation Engineering Rubric
spec: spec.md
research: research.md
status: ready
created: '2026-02-10'
---

# Implementation Plan: Validation Engineering Rubric

## Technical Context

### Tech Stack

- **Language**: Markdown (prompt engineering — no TypeScript code)
- **Framework**: Claude Code agent/command system
- **Testing**: Manual validation by running `/6_gofer_validate` against codebase
- **Tools**: Task tool for parallel agent spawning, Grep/Glob/Read for analysis

### Architecture

This feature operates entirely within Claude Code's prompt layer:

```
.claude/
├── commands/
│   └── 6_gofer_validate.md          ← REWRITE (main deliverable)
└── agents/
    ├── codebase-analyzer.md          (existing — pattern to follow)
    ├── codebase-locator.md           (existing — pattern to follow)
    ├── codebase-pattern-finder.md    (existing — pattern to follow)
    ├── validation-correctness.md     ← NEW
    ├── validation-security.md        ← NEW
    ├── validation-performance.md     ← NEW
    ├── validation-test-quality.md    ← NEW
    ├── validation-integration.md     ← NEW
    └── validation-standards.md       ← NEW

Mirror copies (must stay in sync):
├── extension/resources/claude-commands/6_gofer_validate.md
├── extension/resources/copilot-prompts/6_gofer_validate.prompt.md
└── .github/prompts/6_gofer_validate.prompt.md
```

At runtime, the validate command:

1. Loads spec, plan, tasks, research from `.specify/specs/{feature}/`
2. Spawns 6 specialist agents in parallel via Task tool
3. Consolidates findings into a rubric scorecard
4. Generates validation-report.md with scores
5. If < 100: generates remediation-report.md and signals restart

### Integration Points

| Component       | File                                      | Integration Type                                            |
| --------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Orchestrator    | `.claude/commands/0_business_scenario.md` | Reads validation results; accepts brownfield restart signal |
| Implement       | `.claude/commands/5_gofer_implement.md`   | May be re-invoked during remediation                        |
| Existing agents | `.claude/agents/codebase-*.md`            | Pattern template for new agents                             |
| Logging         | `.specify/logs/`                          | Append validation findings JSONL                            |

### Key Dependencies

- Claude Code Task tool (spawns parallel agents)
- Existing `.claude/agents/` format conventions
- Existing validation report format in current `6_gofer_validate.md`

## Constitution Check

- [x] Prompt-only changes (no TypeScript code) — aligns with minimal footprint
      principle
- [x] Follows existing agent conventions — builds on established patterns
- [x] All copies stay in sync — maintains consistency across distribution
      channels

## Implementation Phases

### Phase 1: Create 6 Specialist Validation Agents

**Goal**: Create the agent definition files that the validate command will spawn

**Files to create** (6 files):

1. `.claude/agents/validation-correctness.md`
   - Focus: Logic errors, spec compliance, acceptance criteria verification
   - Tools: Read, Grep, Glob, LS
   - Input: spec.md acceptance criteria + implemented source files
   - Output: List of unmet criteria with evidence
   - Blocks if: Any acceptance criterion cannot be verified as met

2. `.claude/agents/validation-security.md`
   - Focus: Hardcoded secrets, disabled security features, auth bypass
   - Tools: Grep, Glob, Read, LS
   - Input: Source files from git diff + plan.md security requirements
   - Output: Security findings with severity (Red/Yellow/Gray)
   - Blocks if: Any Red-severity finding (secrets, disabled auth, client-side
     keys)

3. `.claude/agents/validation-performance.md`
   - Focus: Synchronous I/O in async paths, cyclomatic complexity, unbounded
     loops
   - Tools: Read, Grep, Glob, LS
   - Input: New/modified source files
   - Output: Performance findings with complexity scores
   - Blocks if: Cyclomatic complexity > 12 in new code, sync I/O in async paths

4. `.claude/agents/validation-test-quality.md`
   - Focus: Placeholder tests, skipped tests, mock ratio, mutation score
   - Tools: Grep, Glob, Read, LS
   - Input: Test files for the feature
   - Output: Test authenticity report with mock ratio and skip count
   - Blocks if: Any `expect(true).toBe(true)`, mock ratio > 30%, mutation score
     < 60%

5. `.claude/agents/validation-integration.md`
   - Focus: Contract compliance, API boundary validation, dependency
     verification
   - Tools: Read, Grep, Glob, LS
   - Input: Contract definitions + implementation files
   - Output: Contract compliance report
   - Blocks if: Any contract violation or missing integration test

6. `.claude/agents/validation-standards.md`
   - Focus: Constitution compliance, naming conventions, architecture patterns
   - Tools: Read, Grep, Glob, LS
   - Input: Constitution.md + research.md patterns + implementation files
   - Output: Standards compliance report with deviations
   - Blocks if: Deviation from documented patterns without justification

**Format**: Each agent file follows the established convention from
`codebase-analyzer.md` — a markdown document describing the agent's role, tools,
expected input, and output format.

**Verification**:

- [ ] All 6 files exist in `.claude/agents/`
- [ ] Each file follows the existing agent format
- [ ] Each agent has clear scope, input, output, and blocking criteria

### Phase 2: Rewrite 6_gofer_validate.md

**Goal**: Replace the current validate command with the rubric-based approach

**File to rewrite**: `.claude/commands/6_gofer_validate.md`

**Structure of the new command** (sections):

1. **Preamble** — Role description, prerequisites, outline
2. **Step 0: Context Health Check** — Same as current
3. **Step 1: Load Context** — Load all artifacts (spec, plan, tasks, research)
4. **Step 2: Spawn 6 Specialist Agents** — Parallel Task calls to all 6 agents
5. **Step 3: Run Automated Checks** — Build, test, lint, typecheck (keep from
   current)
6. **Step 4: Mutation Testing Gate** — Check for Stryker, run if available
7. **Step 5: Mock Ratio Analysis** — Count mocks vs assertions via Grep
8. **Step 6: Semantic Slop Detection** — Extended pattern matching + agent
   analysis
9. **Step 7: Score the Rubric** — Consolidate all findings into 10-category
   scorecard
10. **Step 8: Generate Validation Report** — Enhanced report with rubric scores
11. **Step 9: Determine Outcome** — PASS (100) or FAIL → remediation
12. **Step 10: Brownfield Restart** (if FAIL) — Generate remediation-report.md,
    signal orchestrator
13. **Step 11: Attribution Logging** — Log findings to validation-findings.jsonl
14. **Step 12: Memory Update Check** — Same as current

**Key changes from current command**:

| Current (570 lines)       | New                                           |
| ------------------------- | --------------------------------------------- |
| 3 generic agents          | 6 specialist agents with dedicated files      |
| Pass/Fail binary          | 100-point numeric rubric                      |
| grep-based slop detection | Severity-tiered semantic analysis             |
| No mock ratio check       | Mock ratio measurement with 30% threshold     |
| No mutation testing       | Stryker integration (optional)                |
| No restart loop           | Brownfield restart with remediation-report.md |
| No attribution tracking   | JSONL finding log                             |
| No point redistribution   | UI/E2E points redistribute when no UI         |

**Verification**:

- [ ] Command file is syntactically valid markdown
- [ ] All 10 rubric categories are defined with point values
- [ ] Agent spawning uses Task tool with correct subagent_type
- [ ] Brownfield restart generates remediation-report.md
- [ ] Attribution logging appends to validation-findings.jsonl

### Phase 3: Update Mirror Copies

**Goal**: Keep all 4 copies of the validate command in sync

**Files to update** (3 mirror copies):

1. `extension/resources/claude-commands/6_gofer_validate.md` — Direct copy
2. `extension/resources/copilot-prompts/6_gofer_validate.prompt.md` — Adapted
   for Copilot format
3. `.github/prompts/6_gofer_validate.prompt.md` — Adapted for GitHub Prompts
   format

**Process**:

- Copy the new `.claude/commands/6_gofer_validate.md` to each location
- For Copilot/GitHub Prompts versions: adjust frontmatter if needed (these
  formats may differ slightly)
- Verify all copies contain the same rubric, agents, and scoring logic

**Verification**:

- [ ] All 4 copies are updated
- [ ] Content diff between copies shows only format differences
- [ ] No stale references to old 3-agent approach remain

### Phase 4: Validation & Documentation

**Goal**: Verify the feature works and document it

**Tasks**:

1. **Self-test**: Run the new `/6_gofer_validate` against the current codebase
   - Expected: FAIL with score ~25/100 (confirming detection works)
   - Verify: Each rubric category produces a score
   - Verify: Remediation report is generated
   - Verify: Findings are logged to JSONL

2. **Update CLAUDE.md**: Add a note about the rubric-based validation in the
   Command Framework Overview section

3. **Update quickstart.md**: Create testing guide for this feature

**Verification**:

- [ ] Self-test produces expected failure with scores
- [ ] Remediation report contains actionable items
- [ ] CLAUDE.md references the new validation approach

## File Structure

```
.claude/
├── agents/
│   ├── validation-correctness.md      ← Phase 1
│   ├── validation-security.md         ← Phase 1
│   ├── validation-performance.md      ← Phase 1
│   ├── validation-test-quality.md     ← Phase 1
│   ├── validation-integration.md      ← Phase 1
│   └── validation-standards.md        ← Phase 1
└── commands/
    └── 6_gofer_validate.md            ← Phase 2 (rewrite)

extension/resources/
├── claude-commands/
│   └── 6_gofer_validate.md            ← Phase 3 (mirror)
└── copilot-prompts/
    └── 6_gofer_validate.prompt.md     ← Phase 3 (mirror)

.github/prompts/
└── 6_gofer_validate.prompt.md         ← Phase 3 (mirror)
```

## Risk Assessment

| Risk                                          | Impact | Mitigation                                                                                    |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| 6 parallel agents may exceed Task tool limits | Medium | Test with 6 parallel calls; fall back to 2 batches of 3 if needed                             |
| Rubric may be too strict for initial adoption | Low    | Scoring is advisory — developers see scores but pipeline restart is optional until stabilized |
| Stryker not installed in most projects        | Low    | Graceful degradation — reports "unavailable" and skips mutation score                         |
| Mock ratio threshold may need tuning          | Medium | Start at 30%, document how to adjust in quickstart.md                                         |
| Mirror copies may drift                       | Low    | Phase 3 explicitly syncs all copies; add a note in CLAUDE.md about keeping them in sync       |

## Notes

- This is a **prompt-only feature** — no TypeScript code changes, no npm
  dependencies
- The current codebase will intentionally FAIL the new rubric (~25/100). This
  confirms the rubric works.
- Fixing the test suite to pass the rubric is a separate, future feature
- Agent files are lightweight (~100-150 lines each) — focused prompts, not
  complex logic

## Spec Traceability

### User Story Coverage

| Story                        | Priority | Plan Phase(s)                                   | Components                                          |
| ---------------------------- | -------- | ----------------------------------------------- | --------------------------------------------------- |
| US1: Rubric-Based Scoring    | P1       | Phase 2 (Steps 7-8)                             | 6_gofer_validate.md rubric section                  |
| US2: Specialist Agent Review | P1       | Phase 1 + Phase 2 (Step 2)                      | 6 agent files + agent spawning in command           |
| US3: Brownfield Restart Loop | P1       | Phase 2 (Steps 9-10)                            | Remediation report generation + orchestrator signal |
| US4: Test Authenticity       | P2       | Phase 1 (test-quality agent) + Phase 2 (Step 5) | validation-test-quality.md + mock ratio analysis    |
| US5: AI Slop Detection       | P2       | Phase 1 (standards agent) + Phase 2 (Step 6)    | validation-standards.md + slop detection step       |
| US6: Attribution Logging     | P3       | Phase 2 (Step 11)                               | JSONL logging in validate command                   |

### Requirement Coverage

| Requirement                  | Status  | Plan Reference                          |
| ---------------------------- | ------- | --------------------------------------- |
| FR1: 10-Category Rubric      | COVERED | Phase 2, Step 7                         |
| FR2: 6 Specialist Agents     | COVERED | Phase 1 (all 6 files) + Phase 2, Step 2 |
| FR3: Brownfield Restart      | COVERED | Phase 2, Steps 9-10                     |
| FR4: Mutation Testing Gate   | COVERED | Phase 2, Step 4                         |
| FR5: Mock Ratio Measurement  | COVERED | Phase 2, Step 5                         |
| FR6: Semantic Slop Detection | COVERED | Phase 2, Step 6                         |
| FR7: Validation Findings Log | COVERED | Phase 2, Step 11                        |
| FR8: Report Enhancement      | COVERED | Phase 2, Step 8                         |

Coverage: 100% of user stories, 100% of functional requirements
