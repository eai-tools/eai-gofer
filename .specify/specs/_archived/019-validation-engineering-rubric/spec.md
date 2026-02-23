---
id: '019-validation-engineering-rubric'
title: 'Validation Engineering Rubric'
status: draft
created: '2026-02-10'
updated: '2026-02-10'
author: Claude
---

# Validation Engineering Rubric

## Overview

The Gofer validation phase (`/6_gofer_validate`) is currently a ceremonial gate
that checks whether the build compiles, tests pass, and lint is clean. This
misses the core question: **does the code actually do what the spec says it
should do?**

Codebase analysis reveals 81 placeholder test assertions
(`expect(true).toBe(true)`), 17 skipped tests, 460 mock function calls, zero
real UI tests, and 15+ source files with no test coverage at all. The current
validation passes because the hard tests are skipped.

This feature replaces the validation phase with a **10-category engineering
quality rubric** scored out of 100 points, enforced by **6 specialist validation
agents**, with a **brownfield restart loop** that sends the feature back through
the pipeline when any category fails.

**Research Reference**: See `research.md` for full codebase analysis, industry
statistics, and technology decisions.

## User Stories

### US1: Rubric-Based Validation Scoring (P1)

**As a** developer running the Gofer pipeline **I want to** receive a numeric
quality score across 10 engineering categories **So that** I know exactly where
my implementation falls short, not just "pass/fail"

**Acceptance Criteria**:

- [ ] Validation produces a score out of 100 across 10 weighted categories
- [ ] Each category has explicit pass criteria documented in the command
- [ ] The validation report shows per-category scores with evidence
- [ ] A score of 100/100 is required to pass; any category scoring 0 triggers
      failure
- [ ] The rubric categories and weights are defined in the validate command

### US2: Specialist Agent Review (P1)

**As a** developer validating AI-generated code **I want to** have 6 specialist
agents each reviewing a different quality dimension **So that** correctness,
security, performance, test quality, integration, and standards are each
assessed with focused expertise

**Acceptance Criteria**:

- [ ] 6 new agent definition files exist in `.claude/agents/validation-*.md`
- [ ] Each agent has a clearly scoped review focus and blocking criteria
- [ ] All 6 agents run in parallel during validation
- [ ] A coordinator step consolidates agent findings into a unified report
- [ ] Agent findings are categorized by severity: Red (blocks), Yellow (must
      address), Gray (informational)

### US3: Brownfield Restart Loop (P1)

**As a** developer whose validation fails **I want to** automatically re-enter
the Gofer pipeline focused on the failed categories **So that** I can fix
specific failures without re-doing the entire feature from scratch

**Acceptance Criteria**:

- [ ] When validation scores < 100, a `remediation-report.md` is generated
- [ ] The remediation report lists failed categories, evidence, and specific
      fixes
- [ ] The validate command signals the orchestrator to restart as brownfield
- [ ] Remediation pipeline runs are scoped to failed areas only
- [ ] Maximum 3 remediation iterations before escalating to human review
- [ ] Each iteration's score is logged to `validation-findings.jsonl`

### US4: Test Authenticity Verification (P2)

**As a** developer **I want to** know whether my tests actually test real
behavior or just verify mocks **So that** I can trust my test suite as a safety
net, not theatre

**Acceptance Criteria**:

- [ ] Validation detects and reports `test.skip`, `it.skip`, `describe.skip`
      occurrences
- [ ] Validation detects `expect(true).toBe(true)` and similar placeholder
      assertions
- [ ] Validation measures mock ratio (vi.mock/vi.fn count vs real assertions)
- [ ] Validation checks if mutation testing tools are available and reports
      mutation score
- [ ] Tests that only assert mock calls without verifying behavior are flagged

### US5: AI Slop Semantic Detection (P2)

**As a** developer reviewing AI-generated code **I want to** catch
structural-but-wrong code patterns that pass syntax checks **So that** redundant
comments, over-engineered abstractions, silent failures, and copy-paste
artifacts are caught before merge

**Acceptance Criteria**:

- [ ] Validation checks for redundant comments that restate code
- [ ] Validation checks for unnecessary defensive checks in trusted paths
- [ ] Validation checks for over-engineered abstractions for one-time operations
- [ ] Validation checks for empty catch blocks and silent error swallowing
- [ ] Validation checks for TODO/FIXME placeholders left in code
- [ ] Findings are severity-tiered: Red, Yellow, Gray

### US6: Attribution-Based Feedback Logging (P3)

**As a** developer running the pipeline across multiple features **I want to**
have validation findings tracked over time **So that** recurring patterns can
inform constitution updates and prompt improvements

**Acceptance Criteria**:

- [ ] Every validation finding is logged to
      `.specify/logs/validation-findings.jsonl`
- [ ] Each finding has: id, category, severity, description, feature, timestamp
- [ ] Remediation outcomes are tracked (fixed, accepted, dismissed)
- [ ] The validate command references historical findings for repeat patterns

## Functional Requirements

### FR1: 10-Category Engineering Rubric

The validation command must assess code against these 10 categories:

| #   | Category                   | Points | Description                                                                                          |
| --- | -------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| 1   | Functional Correctness     | 15     | Every acceptance criterion in spec.md has a passing test exercising real code                        |
| 2   | Test Authenticity          | 15     | Zero skips, zero placeholders, zero mock-only assertions. Mutation score >= 60% if Stryker available |
| 3   | UI/E2E Verification        | 10     | If feature has UI: real rendering tests. If no UI: points redistributed to categories 1 and 2        |
| 4   | Security Posture           | 10     | Zero hardcoded secrets, no disabled security features, no client-side keys                           |
| 5   | Integration Reality        | 10     | Integration tests use real dependencies where possible. Contract tests validate boundaries           |
| 6   | Error Path Coverage        | 10     | Public functions tested for failure modes. No empty catch blocks                                     |
| 7   | Architecture Compliance    | 10     | File structure and patterns match plan.md and research.md                                            |
| 8   | Performance Baseline       | 5      | No synchronous I/O in async paths, no unbounded loops, no N+1 patterns                               |
| 9   | Code Hygiene               | 10     | Zero AI slop: no TODO placeholders, no redundant comments, no magic numbers                          |
| 10  | Specification Traceability | 5      | Every user story maps to tests, every test maps to code                                              |

**Point redistribution for no-UI features**: When a feature has no UI component,
the 10 points from UI/E2E Verification are redistributed: +5 to Functional
Correctness (total 20) and +5 to Test Authenticity (total 20).

- **Validation**: Verify the rubric produces a numeric score for each category
- **Integration**: Builds on existing validation report structure in
  `6_gofer_validate.md:270-393`

### FR2: 6 Specialist Validation Agents

Six new agent definition files in `.claude/agents/`:

| Agent File                   | Focus                                                              | Blocks Merge If                          |
| ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `validation-correctness.md`  | Logic errors, spec compliance, acceptance criteria                 | Any acceptance criterion unmet           |
| `validation-security.md`     | Data-flow analysis, secret scanning, auth bypass                   | Any high-severity security finding       |
| `validation-performance.md`  | I/O patterns, cyclomatic complexity, resource usage                | Cyclomatic complexity > 12 in new code   |
| `validation-test-quality.md` | Mutation score, mock ratio, placeholder detection                  | Mutation score < 60% or mock ratio > 30% |
| `validation-integration.md`  | Contract compliance, API boundaries, dependency validation         | Any contract violation                   |
| `validation-standards.md`    | Constitution compliance, naming conventions, architecture patterns | Deviation from documented patterns       |

Each agent:

- Is a markdown file following the pattern of existing
  `.claude/agents/codebase-*.md`
- Receives the feature context (spec, plan, tasks, research) via prompt
- Returns structured findings with severity tiers (Red/Yellow/Gray)
- Has access to Grep, Glob, Read, LS tools (standard for analysis agents)

- **Validation**: Each agent file exists and follows the established format
- **Integration**: Uses Claude Code's Task tool with `subagent_type` parameter,
  matching existing pattern at `6_gofer_validate.md:79-106`

### FR3: Brownfield Restart Loop

When validation scores < 100:

1. Generate `{FEATURE_DIR}/remediation-report.md` containing:
   - Failed categories with scores and evidence
   - Specific remediation actions for each failure
   - Iteration count (1st, 2nd, or 3rd attempt)
2. Output routing instruction for `/0_business_scenario`:
   ```
   REMEDIATION REQUIRED: [feature-name]
   Failed categories: [list]
   Iteration: [N] of 3
   Route: /1_gofer_research → focused on [failed areas]
   ```
3. If iteration 3 fails: generate `escalation-report.md` with full history

- **Validation**: Remediation report is generated on failure with actionable
  items
- **Integration**: Leverages existing orchestrator routing in
  `/0_business_scenario`

### FR4: Mutation Testing Gate

The validation command instructs Claude to:

1. Check if Stryker is installed (`npx stryker --version`)
2. If available: run `npx stryker run` and parse results
3. Report mutation score as part of Test Authenticity category
4. If Stryker not installed: report "mutation testing unavailable" with guidance
   to install
5. Target threshold: >= 60% mutation score

- **Validation**: Mutation score is checked and reported in validation report
- **Integration**: Runs as a bash command during automated verification step

### FR5: Mock Ratio Measurement

The validation command instructs Claude to:

1. Count `vi.mock()`, `vi.fn()`, `jest.mock()`, `jest.fn()` in test files
2. Count real assertions (`expect(...).toBe/toEqual/toContain/etc`)
3. Calculate mock ratio: mock calls / (mock calls + real assertions)
4. Flag tests that only assert mock calls without verifying behavior
5. Target threshold: <= 30% mock ratio

- **Validation**: Mock ratio is calculated and reported per-file and overall
- **Integration**: Uses Grep tool to count patterns in test files

### FR6: Semantic Slop Detection

The validation command instructs Claude to check for:

| Pattern                                   | Severity | Detection Method                |
| ----------------------------------------- | -------- | ------------------------------- |
| `expect(true).toBe(true)` and variants    | Red      | Grep for placeholder assertions |
| `test.skip` / `it.skip` / `describe.skip` | Red      | Grep for skip patterns          |
| `// TODO: implement` / `// FIXME`         | Yellow   | Grep for unresolved markers     |
| Empty catch blocks `catch (e) {}`         | Yellow   | Grep for empty handlers         |
| Redundant comments restating code         | Yellow   | Agent semantic analysis         |
| Over-engineered abstractions              | Gray     | Agent semantic analysis         |
| Magic numbers without constants           | Gray     | Agent pattern analysis          |

- **Validation**: Each slop pattern is checked and severity-categorized
- **Integration**: Extends existing slop detection at
  `6_gofer_validate.md:163-216`

### FR7: Validation Findings Log

Every finding is appended to `.specify/logs/validation-findings.jsonl`:

```json
{
  "finding_id": "F001",
  "timestamp": "2026-02-10T08:00:00Z",
  "feature": "019-validation-engineering-rubric",
  "category": "test_authenticity",
  "severity": "red",
  "description": "expect(true).toBe(true) in tests/e2e/autoCompaction.spec.ts",
  "file": "tests/e2e/autoCompaction.spec.ts",
  "line": 45,
  "resolution": null,
  "iteration": 1
}
```

- **Validation**: Findings are logged in JSONL format
- **Integration**: Consistent with existing logging patterns
  (`council-usage.jsonl`, `context-usage.jsonl`)

### FR8: Validation Report Enhancement

The existing validation report format is extended with:

1. Rubric score table (10 categories, points, evidence)
2. Specialist agent findings consolidated by severity
3. Remediation actions (if score < 100)
4. Historical comparison (if previous validation exists)
5. Overall PASS/FAIL/REMEDIATE status

- **Validation**: Report contains all required sections
- **Integration**: Extends existing report at `6_gofer_validate.md:270-393`

## Non-Functional Requirements

### Consistency

- All 4 copies of the validate command must stay in sync: `.claude/commands/`,
  `extension/resources/claude-commands/`,
  `extension/resources/copilot-prompts/`, `.github/prompts/`

### Performance

- All 6 specialist agents must run in parallel (not sequentially)
- Validation should complete within a single context window

### Extensibility

- Rubric categories should be clearly documented so future categories can be
  added without restructuring the entire command

### Architecture

- This feature creates **prompt files only** (markdown). No TypeScript code
  changes.
- Agent files follow existing `.claude/agents/` conventions
- No new npm dependencies are required

## Success Criteria

| Metric              | Target                                                     | Measurement                                                                      |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Rubric completeness | All 10 categories have pass criteria and detection methods | Manual review of command file                                                    |
| Agent coverage      | 6 specialist agents created with focused scope             | File count in `.claude/agents/validation-*.md`                                   |
| Brownfield loop     | Failed validation triggers remediation report and re-entry | Run validation against current codebase (will fail — confirming detection works) |
| Slop detection      | Detects the 81 known placeholder assertions                | Run validation against current test suite                                        |
| Mock ratio          | Reports the known over-mocking in current tests            | Run validation and check ratio output                                            |
| Mirror sync         | All 4 copies of validate command are identical             | Diff comparison                                                                  |

## Assumptions

- Claude Code's Task tool supports running 6 parallel agents (it currently
  runs 3)
- Stryker Mutator may not be installed; the rubric gracefully degrades
- VSCode API mocking is unavoidable for extension unit tests — the mock ratio
  accounts for this with a "justified mock" exclusion
- The validate command is a prompt (markdown), not executable code — all
  "checking" is done by instructing Claude what to analyze
- Existing placeholder tests will correctly fail the rubric — this is intended
  behavior, not a bug

## Dependencies

- Existing `.claude/agents/codebase-*.md` files (pattern to follow)
- Existing `.claude/commands/6_gofer_validate.md` (file to rewrite)
- Existing `.claude/commands/0_business_scenario.md` (orchestrator for restart
  loop)
- `.specify/logs/` directory (for validation-findings.jsonl)
- `extension/resources/claude-commands/` and other mirror locations

## Out of Scope

- **Modifying existing test files** — the rubric detects failures; fixing them
  is a separate feature
- **Installing Stryker or fast-check** — the rubric checks for them but doesn't
  install them
- **TypeScript code changes** — this feature is prompt-only
- **Configurable rubric weights** — weights are fixed in v1; configurability is
  a future enhancement
- **Real Playwright test implementation** — the rubric checks for UI tests but
  doesn't write them

## Glossary

| Term                 | Definition                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Rubric               | A scoring framework with weighted categories and explicit pass criteria                     |
| Mutation testing     | A technique that introduces small changes (mutants) to code and checks if tests detect them |
| Mock ratio           | The proportion of mock/stub calls to real assertions in test files                          |
| AI slop              | Code that is syntactically valid but semantically wrong — passes lint but fails logic       |
| Brownfield restart   | Re-entering the Gofer pipeline to fix specific validation failures                          |
| Remediation report   | A document listing what failed, why, and what to fix                                        |
| Attribution tracking | Logging validation findings over time to identify recurring patterns                        |

## Research Traceability

| Research Finding                              | Spec Section                | Reference                             |
| --------------------------------------------- | --------------------------- | ------------------------------------- |
| 81 placeholder assertions in test suite       | FR6 (Slop Detection), US4   | research.md: Current State Assessment |
| 460 vi.fn() calls, 17 skipped tests           | FR5 (Mock Ratio), US4       | research.md: Test Suite Audit         |
| Zero real Playwright UI tests                 | FR1 category 3 (UI/E2E)     | research.md: Test Suite Audit         |
| Prompt-only architecture constraint           | NFR: Architecture           | research.md: Constraints              |
| Agent tool availability (Read/Grep/Glob only) | FR2 (Agent Design)          | research.md: Constraints              |
| 4 mirror copies of validate command           | NFR: Consistency            | research.md: Constraints              |
| Existing 3-agent parallel spawn pattern       | FR2 integration point       | research.md: Pattern 1                |
| Existing validation report format             | FR8 integration point       | research.md: Pattern 3                |
| Orchestrator routing for brownfield           | FR3 integration point       | research.md: Pattern 4                |
| JSONL logging pattern                         | FR7 integration point       | research.md: Decision 4               |
| Stryker for mutation testing                  | FR4 tech decision           | research.md: Decision 2               |
| 6 specialist agents architecture              | FR2 tech decision           | research.md: Decision 1               |
| CodeRabbit: 1.7x more logic errors            | US1 motivation              | research.md: Industry Research        |
| MSR '26: 36% mock ratio for AI agents         | FR5 threshold justification | research.md: Industry Research        |
| Qodo: 60-70% mutation score target            | FR4 threshold justification | research.md: Industry Research        |
| Qodo: Specialist-agent review pattern         | FR2 architecture choice     | research.md: Industry Research        |
