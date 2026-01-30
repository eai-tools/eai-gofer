---
date: 2025-12-20T10:30:00Z
researcher: Claude
topic: 'Agile E2E Iterative Development Enhancement for Gofer'
tags:
  [
    research,
    agile,
    e2e-testing,
    iterative-development,
    product-primitives,
    skateboard-methodology,
  ]
status: complete
---

# Research: Agile E2E Iterative Development Enhancement for Gofer

## Research Question

How can Gofer be enhanced to:

1. Write code in an agile manner, always building an e2e functional pilot
   (skateboard, bicycle, motorbike, car phases)
2. Build code and e2e tests that validate business/user functionality at every
   phase
3. Always use Claude Research-Plan-Implement framework with regular context
   refresh reminders
4. Integrate Product Primitives methodology for e2e-based development

## Summary

Gofer has a robust foundation with the Gofer workflow (`/speckit.*`) and RPI
framework (`/1_*` - `/8_*`), but lacks explicit iterative e2e development
phases. The current workflow generates complete specs upfront rather than
incrementally delivering value through skateboard → bicycle → motorbike → car
iterations. This research identifies specific enhancements to templates,
commands, and test infrastructure to enable mandatory e2e validation at each
iteration phase.

### Key Findings

1. **Gap: No Explicit Iteration Phases** - Current phases are Setup →
   Foundational → User Stories → Polish, but no "Skateboard MVP" validation
   checkpoint
2. **Gap: E2E Tests Defined Late** - Tests appear in Phase 6+ rather than
   driving development from Phase 0
3. **Gap: No Context Refresh Reminders** - Only `/6_resume_work` mentions
   context refresh; other commands lack this guidance
4. **Gap: No Product Primitives Integration** - Specs focus on features, not
   composable primitives
5. **Strength: Real Tests Infrastructure** - Excellent foundation with "Real
   Tests with Real Data" philosophy
6. **Strength: Constitution Validation** - TDD and 80% coverage already mandated

## Detailed Findings

### 1. Current Workflow Analysis

#### Gofer Workflow Flow

```
/speckit.specify → spec.md (all user stories upfront)
       ↓
/speckit.plan → plan.md, data-model.md, contracts/, research.md
       ↓
/speckit.tasks → tasks.md (all tasks, all phases)
       ↓
/speckit.implement → Execute all tasks phase-by-phase
       ↓
/speckit.analyze → Validate consistency
```

**Problem**: No checkpoint to validate "Skateboard works independently" before
generating Bicycle tasks.

#### RPI Workflow Flow

```
/1_research_codebase → thoughts/shared/research/NNN_topic.md
       ↓
/2_create_plan → thoughts/shared/plans/feature_name.md
       ↓
/4_implement_plan → Execute with checkmarks
       ↓
/3_validate_plan → Validation report
```

**Problem**: No explicit context refresh reminders between phases.

### 2. Proposed Skateboard → Car Iteration Model

#### Iteration 0: Skateboard (MVP Core)

- **Scope**: Single user story (P1), happy path only
- **E2E Test**: 1 test proving core workflow works
- **Exit Criteria**: User can complete one primary action end-to-end
- **Duration**: Week 1

#### Iteration 1: Scooter (Error Handling)

- **Scope**: + Error handling, + validation, + stop/cancel
- **E2E Tests**: 3 tests (happy path + error cases)
- **Exit Criteria**: System handles failures gracefully
- **Duration**: Week 1-2

#### Iteration 2: Bicycle (Integration)

- **Scope**: + User Story 2, + component integration
- **E2E Tests**: 7 tests (all primary workflows)
- **Exit Criteria**: Multiple features work together
- **Duration**: Week 2-3

#### Iteration 3: Motorbike (Polish)

- **Scope**: + User Story 3, + performance, + edge cases
- **E2E Tests**: 12 tests (comprehensive coverage)
- **Exit Criteria**: Production-quality features
- **Duration**: Week 3-4

#### Iteration 4: Car (Production)

- **Scope**: All user stories, cross-platform, full test suite
- **E2E Tests**: 15+ tests (complete coverage)
- **Exit Criteria**: Release-ready with 85%+ coverage
- **Duration**: Week 4+

### 3. Product Primitives Integration

Based on Alex Kurkin's Product Primitives methodology, Gofer should identify
composable primitives before features:

#### Proposed Gofer Primitives

1. **Spec** - Core unit of work definition
2. **Task** - Atomic implementation unit with dependencies
3. **Agent** - Autonomous executor (Engineer, Test, Orchestrator)
4. **Context** - Accumulated knowledge (research, decisions, memory)
5. **Validation** - Constitution compliance check
6. **Iteration** - Skateboard/Bicycle/Car phase checkpoint

#### Primitive Composition Examples

```
Spec + Task → Feature Plan
Task + Agent + Context → Autonomous Execution
Iteration + Validation + E2E Test → Phase Checkpoint
Context + Agent + Spec → Research-Informed Implementation
```

### 4. Context Refresh Enhancement Strategy

#### Current Context Refresh Locations

| Command              | Has Refresh?   | Enhancement Needed           |
| -------------------- | -------------- | ---------------------------- |
| /1_research_codebase | No             | Add Pre-Flight Check         |
| /2_create_plan       | Partial        | Add Mid-Phase Checkpoint     |
| /3_validate_plan     | No             | Add Pre-Validation Load      |
| /4_implement_plan    | No             | Add Inter-Phase Refresh      |
| /5_save_progress     | No             | Add Session Duration Check   |
| /6_resume_work       | Yes (only one) | Already has guidance         |
| /8_define_test_cases | No             | Add Pattern Research Refresh |

#### Proposed Context Refresh Protocol

```markdown
## Context Refresh Protocol

Before proceeding with this phase:

1. **Assess Current Context**: How many turns since last file read?
2. **Identify Critical Files**: Which files are essential for this work?
3. **Re-read Strategically**:
   - Re-read files you'll modify FULLY (no limit/offset)
   - Re-read plan sections relevant to current phase
   - Reference research documents by filename instead of re-reading
4. **Confirm Readiness**: Type 'ready' when context is fresh

**Session Duration Check**:

- > 30 min: Re-read core files
- > 1 hour: Consider session save/resume
- > 2 hours: Strongly recommend fresh session
```

### 5. Template Enhancements Required

#### spec-template.md Additions

```markdown
## E2E Development Strategy

### Iteration 0: Skateboard (Week 1)

**Goal**: [Single happy-path E2E proving core workflow] **Scope**: User Story 1
only **E2E Test**: tests/e2e/iteration/skateboard.test.ts **Exit Criteria**:
[Specific user action works end-to-end]

### Iteration 1: Scooter (Week 1-2)

**Goal**: [Error handling and validation] **Scope**: + Error cases, + Stop
button, + Validation **E2E Tests**: 3 tests **Exit Criteria**: [System handles
failures gracefully]

[Continue for Bicycle, Motorbike, Car...]

## Product Primitives

### Identified Primitives

- **[Primitive 1]**: [Description, composability]
- **[Primitive 2]**: [Description, composability]

### Primitive Composition

- [Primitive 1] + [Primitive 2] → [Feature/Capability]
```

#### tasks-template.md Additions

```markdown
## Iteration Phases

### Iteration 0: Skateboard

**Goal**: Prove core workflow with single E2E test **Independent Test**: npm run
test:e2e:skateboard passes

- [ ] T001 [E2E-I0] Write skateboard E2E test in
      tests/e2e/iteration/skateboard.test.ts
- [ ] T002 [E2E-I0] Implement MINIMUM code to pass skateboard test
- [ ] T003 [E2E-I0] Verify skateboard deployed and functional

**CHECKPOINT**: Skateboard E2E passes before proceeding to Scooter

### Iteration 1: Scooter

**Goal**: Add error handling E2E coverage **Independent Test**: npm run
test:e2e:scooter passes (3 tests) **Prerequisite**: Skateboard checkpoint
validated

- [ ] T004 [E2E-I1] Write error handling E2E test
- [ ] T005 [E2E-I1] Write cancel/stop E2E test
- [ ] T006 [E2E-I1] Implement error recovery to pass tests

**CHECKPOINT**: Scooter E2E passes, Skateboard still works (no regression)
```

#### plan-template.md Additions

```markdown
## Iteration Architecture

### Skateboard Architecture

**Minimal components for P1 user story only**:

- [Component 1]: [Minimal implementation]
- [Component 2]: [Minimal implementation]

**Excluded from Skateboard** (added in later iterations):

- [Feature X] → Bicycle
- [Feature Y] → Motorbike

### Progressive Enhancement Plan

| Iteration  | Components Added | E2E Tests |
| ---------- | ---------------- | --------- |
| Skateboard | Core only        | 1         |
| Scooter    | + Error handling | 3         |
| Bicycle    | + Integration    | 7         |
| Motorbike  | + Polish         | 12        |
| Car        | Complete         | 15+       |
```

### 6. Command Enhancements Required

#### /speckit.specify Enhancements

```markdown
## Iteration-First Specification

Before writing full spec, identify:

1. **Skateboard Scope** (Week 1):
   - What is the ONE user story that proves value?
   - What is the ONE E2E test that validates it?
   - What can be CUT from initial delivery?

2. **Primitive Analysis**:
   - What are the 5-8 core primitives?
   - How do primitives compose into features?
   - Which primitives are Skateboard-required?

3. **Progressive Delivery**:
   - Skateboard: [P1 story only]
   - Scooter: [+ error handling]
   - Bicycle: [+ P2 story]
   - Car: [+ remaining stories]
```

#### /speckit.implement Enhancements

```markdown
## Iteration Checkpoints

After each iteration, STOP and validate:

### Skateboard Checkpoint

- [ ] Skateboard E2E test passes: `npm run test:e2e:skateboard`
- [ ] Core workflow functional end-to-end
- [ ] No implementation beyond Skateboard scope
- [ ] Ready for user validation? (y/n)

If checkpoint fails: DO NOT proceed to Scooter If checkpoint passes: User
approves before continuing

### Scooter Checkpoint

- [ ] Skateboard still passes (no regression)
- [ ] Scooter E2E tests pass (3 total)
- [ ] Error handling functional
- [ ] Ready for user validation? (y/n)

[Continue for each iteration...]
```

#### Context Refresh Additions to All Commands

```markdown
## Pre-Flight Context Check

**IMPORTANT**: Before proceeding:

- [ ] Session duration < 1 hour? If no, consider `/5_save_progress`
- [ ] Key files read recently? If no, re-read with Read tool (no limit/offset)
- [ ] Plan context fresh? If no, re-read current phase section

Type 'context ready' when you have fresh context for this phase.
```

### 7. Test Infrastructure Enhancements

#### New Directory Structure

```
tests/
├── e2e/
│   ├── iteration/
│   │   ├── skateboard.test.ts    # Iteration 0
│   │   ├── scooter.test.ts       # Iteration 1
│   │   ├── bicycle.test.ts       # Iteration 2
│   │   ├── motorbike.test.ts     # Iteration 3
│   │   └── car.test.ts           # Iteration 4
│   ├── regression/
│   │   ├── skateboard-regression.test.ts
│   │   └── full-regression.test.ts
│   └── workflows/
│       └── [existing workflow tests]
├── integration/
│   └── [existing integration tests]
└── unit/
    └── [existing unit tests]
```

#### Iteration Test Helpers

```typescript
// tests/helpers/iteration-helpers.ts
export async function runIterationTests(
  iteration: 'skateboard' | 'scooter' | 'bicycle' | 'motorbike' | 'car'
): Promise<TestResult> {
  // Run tests for specified iteration
}

export async function validateIterationCheckpoint(
  iteration: string
): Promise<CheckpointResult> {
  // Validate checkpoint criteria
}

export async function checkRegressions(
  currentIteration: string
): Promise<RegressionResult> {
  // Ensure previous iterations still pass
}
```

#### CI/CD Enhancement

```yaml
# .github/workflows/iteration-gates.yml
iteration-gates:
  name: Iteration E2E Gates
  runs-on: ubuntu-latest
  strategy:
    matrix:
      iteration: [skateboard, scooter, bicycle, motorbike, car]
  steps:
    - name: Run ${{ matrix.iteration }} E2E Tests
      run: npm run test:e2e:${{ matrix.iteration }}

    - name: Check Regression (previous iterations)
      run: npm run test:e2e:regression:${{ matrix.iteration }}

    - name: Validate Checkpoint
      run: npm run validate:checkpoint:${{ matrix.iteration }}
```

## Code References

### Current Command Files

- `.claude/commands/speckit.specify.md:19-162` - Specification generation
- `.claude/commands/speckit.plan.md:15-80` - Planning workflow
- `.claude/commands/speckit.tasks.md:15-137` - Task generation with phase
  structure
- `.claude/commands/speckit.implement.md:15-129` - Implementation with
  checkpoints
- `.claude/commands/6_resume_work.md:227` - Only command with context refresh
  guidance

### Current Template Files

- `.specify/templates/spec-template.md` - Needs iteration sections
- `.specify/templates/plan-template.md` - Needs iteration architecture
- `.specify/templates/tasks-template.md:46-251` - Has phases but no iteration
  checkpoints

### Constitution Requirements

- `.specify/memory/constitution.md:47-57` - TDD requirement (NON-NEGOTIABLE)
- `.specify/memory/constitution.md:119-129` - 80% coverage minimum
- `.specify/memory/constitution.md:198-202` - Status progression

### Test Infrastructure

- `tests/README.md` - "Real Tests with Real Data" philosophy
- `tests/e2e/workflow.test.ts` - Business workflow testing pattern
- `tests/helpers/workspace.ts` - Workspace management utilities

## Architecture Insights

### Current Architecture Patterns

1. **Phase-Based Execution**: Tasks organized by phase (Setup → Core → Polish)
2. **Dependency Tracking**: Tasks reference dependencies via `deps: T001, T002`
3. **Checklist Validation**: All tasks use `- [ ]` format with completion
   tracking
4. **Constitution Enforcement**: Validation before implementation

### Proposed Iteration Architecture

1. **Iteration-Based Execution**: Add iteration layer above phases
2. **Checkpoint Validation**: Stop-and-validate between iterations
3. **Regression Testing**: Ensure previous iterations still pass
4. **Progressive Enhancement**: Each iteration adds without breaking

### Integration Points

| Existing Component  | Enhancement                                |
| ------------------- | ------------------------------------------ |
| speckit.specify     | Add iteration sections, primitive analysis |
| speckit.plan        | Add iteration architecture                 |
| speckit.tasks       | Add iteration phases with checkpoints      |
| speckit.implement   | Add iteration checkpoint validation        |
| RPI commands        | Add context refresh reminders              |
| Test infrastructure | Add iteration-specific test suites         |
| CI/CD               | Add iteration gates                        |

## Open Questions

1. **Iteration Scope Definition**: Who decides what goes in Skateboard vs
   Bicycle?
   - Suggestion: User Story P1 = Skateboard, P2 = Bicycle, P3+ = Car

2. **Checkpoint Approval**: Automated or user-approved?
   - Suggestion: Automated E2E pass + user approval prompt

3. **Regression Handling**: Roll back or fix forward?
   - Suggestion: Stop and alert, let user decide

4. **Product Primitives Discovery**: When to identify primitives?
   - Suggestion: During `/speckit.specify` before user stories

5. **Context Refresh Frequency**: How often to remind?
   - Suggestion: Every phase transition, every 30 minutes elapsed

## Recommendations

### Priority 1: High Impact, Moderate Effort

1. **Add iteration phases to tasks-template.md** with checkpoint markers
2. **Add context refresh reminders** to all RPI commands
3. **Create tests/e2e/iteration/ directory** with skateboard test

### Priority 2: Medium Impact, Moderate Effort

4. **Enhance /speckit.specify** with iteration sections and primitives
5. **Add iteration checkpoint validation** to /speckit.implement
6. **Create iteration-specific CI/CD gates**

### Priority 3: Lower Impact, Higher Effort

7. **Integrate Product Primitives** into spec template
8. **Build regression testing infrastructure**
9. **Add session duration tracking** to /5_save_progress

## Implementation Roadmap

### Week 1: Foundation

- [ ] Update tasks-template.md with iteration phases
- [ ] Add context refresh to /4_implement_plan and /2_create_plan
- [ ] Create tests/e2e/iteration/skateboard.test.ts template

### Week 2: Workflow Integration

- [ ] Enhance /speckit.specify with iteration sections
- [ ] Add checkpoint validation to /speckit.implement
- [ ] Update spec-template.md with E2E Development Strategy

### Week 3: Test Infrastructure

- [ ] Create iteration test helpers
- [ ] Add iteration-gates.yml to CI/CD
- [ ] Build regression test framework

### Week 4: Polish

- [ ] Add Product Primitives to spec template
- [ ] Create primitive composition examples
- [ ] Document iteration methodology
