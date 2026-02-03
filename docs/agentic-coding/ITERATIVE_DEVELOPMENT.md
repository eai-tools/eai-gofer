# Iterative Development for AI Agents

**Enterprise AI Pty Ltd - Skateboard Methodology and E2E-First Development**

_Last Updated: January 2026_

---

## Executive Summary

This document describes the iterative development methodology for AI-driven
coding, including the "Skateboard → Car" progression, E2E-first testing, and
Product Primitives integration. These approaches ensure working software at
every stage.

---

## 1. The Skateboard → Car Methodology

### The Problem with Traditional Development

Traditional development often results in:

- **Big Bang releases** - Nothing works until everything is done
- **Late integration** - Components developed in isolation don't fit
- **Deferred testing** - Tests written after implementation
- **Scope creep** - Features added without validation

### The Skateboard Approach

Deliver a **working product at every iteration**, even if minimal:

```text
Iteration 0: Skateboard  │  Iteration 1: Scooter
       ○                 │         ○
       │                 │        /│\
      ═╩═                │       ═╩═╩═
                         │
Iteration 2: Bicycle     │  Iteration 3: Motorbike
       ○                 │         ○
      /│\                │        /│\
     ═╩═╩═               │      ═╩═══╩═
       ▲                 │         ▲
                         │         ║
                         │
Iteration 4: Car         │
    ┌───┐                │
    │ ○ │                │
   ═╩═══╩═               │
```

**Key Insight**: Each iteration is a **complete, working product**, not a
partial feature.

---

## 2. Iteration Definitions

### Iteration 0: Skateboard (MVP Core)

**Goal**: Single user story, happy path only

- **Scope**: P1 user story only
- **E2E Test**: 1 test proving core workflow
- **Exit Criteria**: User can complete ONE primary action end-to-end
- **Duration**: Week 1
- **Code Volume**: Minimal (300-500 lines)

**Example**: For an auth system, skateboard = user can log in with
email/password.

### Iteration 1: Scooter (Error Handling)

**Goal**: Make the skateboard resilient

- **Scope**: + Error handling, + validation, + cancel/stop
- **E2E Tests**: 3 tests (happy path + 2 error cases)
- **Exit Criteria**: System handles failures gracefully
- **Duration**: Week 1-2
- **Code Volume**: +200-300 lines

**Example**: + Invalid credentials error, + Network failure handling.

### Iteration 2: Bicycle (Integration)

**Goal**: Add second user story and integrate

- **Scope**: + User Story 2, + component integration
- **E2E Tests**: 7 tests (all primary workflows)
- **Exit Criteria**: Multiple features work together
- **Duration**: Week 2-3
- **Code Volume**: +500-800 lines

**Example**: + User registration, + Password reset.

### Iteration 3: Motorbike (Polish)

**Goal**: Production-quality features

- **Scope**: + User Story 3, + performance, + edge cases
- **E2E Tests**: 12 tests (comprehensive coverage)
- **Exit Criteria**: Production-quality implementation
- **Duration**: Week 3-4
- **Code Volume**: +300-500 lines

**Example**: + OAuth providers, + Rate limiting, + Session management.

### Iteration 4: Car (Full Feature)

**Goal**: Complete, release-ready feature

- **Scope**: All user stories, cross-platform, full test suite
- **E2E Tests**: 15+ tests (complete coverage)
- **Exit Criteria**: Release-ready with 85%+ coverage
- **Duration**: Week 4+
- **Code Volume**: Full implementation

**Example**: Complete auth system with all flows, admin features, audit logging.

---

## 3. E2E-First Development

### The Principle

**Write the E2E test BEFORE any implementation.**

```text
Traditional:
  Code → Unit Tests → Integration Tests → E2E Tests (if time permits)

E2E-First:
  E2E Test → Implementation → Unit Tests → Integration Tests
```

### Why E2E First?

1. **Validates user value** - Test proves the feature works for users
2. **Drives design** - API and UX emerge from test requirements
3. **Catches integration early** - Components must work together from day 1
4. **Prevents gold-plating** - Stop when test passes

### E2E Test Structure by Iteration

```typescript
// Iteration 0: Skateboard
describe('Skateboard: Core Login', () => {
  test('user can log in with valid credentials', async () => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
});

// Iteration 1: Scooter
describe('Scooter: Error Handling', () => {
  test('shows error for invalid credentials', async () => {
    /* ... */
  });
  test('handles network failure gracefully', async () => {
    /* ... */
  });
  test('user can cancel login attempt', async () => {
    /* ... */
  });
});

// Iteration 2: Bicycle
describe('Bicycle: User Registration', () => {
  test('new user can register', async () => {
    /* ... */
  });
  test('user can reset password', async () => {
    /* ... */
  });
  // ... more tests
});
```

### Test Organization

```text
tests/e2e/
├── iteration/
│   ├── 0-skateboard.test.ts    # Core happy path
│   ├── 1-scooter.test.ts       # Error handling
│   ├── 2-bicycle.test.ts       # Integration
│   ├── 3-motorbike.test.ts     # Polish
│   └── 4-car.test.ts           # Complete feature
├── regression/                  # All passing tests
└── smoke/                       # Quick sanity checks
```

---

## 4. Product Primitives

### What Are Primitives?

Primitives are the **composable building blocks** of your system. Identify them
BEFORE designing features.

### Recommended Primitives for Gofer

| Primitive  | Description                       | Composability              |
| ---------- | --------------------------------- | -------------------------- |
| Spec       | Core unit of work definition      | Spec + Task → Feature Plan |
| Task       | Atomic implementation unit        | Task + Agent → Execution   |
| Agent      | Autonomous executor               | Agent + Context → Work     |
| Context    | Accumulated knowledge             | Context + Spec → Research  |
| Validation | Constitution compliance check     | Validation + Code → Review |
| Iteration  | Skateboard/Bicycle/Car checkpoint | Iteration + Test → Gate    |

### Primitive Composition

```text
Spec + Task → Feature Plan
Task + Agent + Context → Autonomous Execution
Iteration + Validation + E2E Test → Phase Checkpoint
Context + Agent + Spec → Research-Informed Implementation
```

### Benefits

1. **Reusability** - Primitives combine in many ways
2. **Testability** - Test primitives independently
3. **Clarity** - Clear boundaries and responsibilities
4. **Flexibility** - New features = new compositions

---

## 5. Iteration Checkpoints

### Gate Criteria

Each iteration must pass a checkpoint before proceeding:

#### Skateboard Checkpoint

- [ ] Single E2E test passes
- [ ] Core user action works end-to-end
- [ ] Code compiles without errors
- [ ] Constitution compliance verified

#### Scooter Checkpoint

- [ ] 3 E2E tests pass
- [ ] Error scenarios handled
- [ ] No regression in skateboard test
- [ ] Code coverage > 50%

#### Bicycle Checkpoint

- [ ] 7 E2E tests pass
- [ ] Multiple features integrated
- [ ] All skateboard + scooter tests still pass
- [ ] Code coverage > 70%

#### Motorbike Checkpoint

- [ ] 12 E2E tests pass
- [ ] Performance targets met
- [ ] Edge cases handled
- [ ] Code coverage > 80%

#### Car Checkpoint

- [ ] 15+ E2E tests pass
- [ ] All acceptance criteria met
- [ ] Documentation complete
- [ ] Code coverage > 85%
- [ ] Security review passed

---

## 6. Context Refresh During Iterations

### The Problem

Long sessions cause context degradation. Refresh at iteration boundaries.

### Refresh Protocol

Before starting each iteration:

1. **Assess Context**: How much context used? (Check status)
2. **Save Progress**: Create session handoff if > 60% context
3. **Start Fresh**: New session for new iteration
4. **Load Context**: Read iteration goals, not full history

### Refresh Timing

| Point                | Action                           |
| -------------------- | -------------------------------- |
| > 30 min in session  | Re-read core files               |
| > 1 hour in session  | Consider session save            |
| > 2 hours in session | Strongly recommend fresh session |
| Iteration boundary   | Always save and refresh          |

---

## 7. Template Enhancements

### spec-template.md

```markdown
## Iterative Development Strategy

### Iteration 0: Skateboard

**Goal**: [Single happy-path E2E proving core workflow] **Scope**: User Story 1
only **E2E Test**: `tests/e2e/iteration/0-skateboard.test.ts` **Exit Criteria**:
[Specific user action works end-to-end]

### Iteration 1: Scooter

**Goal**: [Error handling and resilience] **Scope**: + Error cases, +
Validation, + Cancel **E2E Tests**: 3 tests **Exit Criteria**: [System handles
failures gracefully]

### Iteration 2: Bicycle

[Continue for remaining iterations...]

## Product Primitives

### Identified Primitives

- **Primitive 1**: [Description, role]
- **Primitive 2**: [Description, role]

### Compositions

- Primitive 1 + Primitive 2 → [Capability]
```

### tasks-template.md

```markdown
## Iteration 0: Skateboard

**Goal**: Prove core workflow with single E2E test **Validation**:
`npm run test:e2e:skateboard` passes

- [ ] T001 [E2E-I0] Write skateboard E2E test
- [ ] T002 [E2E-I0] Implement minimum code to pass test
- [ ] T003 [E2E-I0] Verify end-to-end workflow

**CHECKPOINT**: Skateboard E2E passes before proceeding

---

## Iteration 1: Scooter

**Goal**: Add error handling **Prerequisite**: Skateboard checkpoint validated
**Validation**: `npm run test:e2e:scooter` passes (3 tests)

- [ ] T004 [E2E-I1] Write error handling E2E test
- [ ] T005 [E2E-I1] Write cancel/stop E2E test
- [ ] T006 [E2E-I1] Implement error recovery

**CHECKPOINT**: Scooter passes, Skateboard still works
```

---

## 8. Agent Instructions for Iterations

### When Starting

```text
Before implementing, identify:
1. What is the current iteration? (Skateboard/Scooter/Bicycle/Motorbike/Car)
2. What is the E2E test for this iteration?
3. What is the minimum code to pass that test?
```

### When Coding

```text
For each iteration:
1. Write the E2E test FIRST
2. Run the test (it will fail)
3. Implement minimum code to pass
4. Run test again (should pass)
5. Verify previous iteration tests still pass
6. Only then move to next task
```

### When Completing

```text
Before marking iteration complete:
1. All iteration E2E tests pass
2. All previous iteration tests pass (no regression)
3. Code coverage meets iteration target
4. Constitution compliance verified
```

---

## 9. Benefits Summary

| Benefit           | How It's Achieved                   |
| ----------------- | ----------------------------------- |
| Working software  | E2E test passes at every iteration  |
| Early integration | Tests require full stack from start |
| Clear progress    | Checkpoints validate readiness      |
| Reduced risk      | Small increments, quick feedback    |
| Scope control     | Test defines "done", nothing extra  |
| Maintainability   | Primitives enable reuse             |

---

## References

- [AGENTIC_CODING_PRINCIPLES.md](AGENTIC_CODING_PRINCIPLES.md) - Core principles
- [AGENTIC_TESTING_PATTERNS.md](AGENTIC_TESTING_PATTERNS.md) - Test patterns
- Product Primitives: Alex Kurkin's methodology
- Lean Startup: Build-Measure-Learn

---

**© 2026 Enterprise AI Pty Ltd. All rights reserved.**
