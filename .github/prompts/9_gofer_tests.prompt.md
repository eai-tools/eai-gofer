---
name: 9_gofer_tests
description: Define acceptance test cases using DSL approach before or during implementation
agent: agent
argument-hint: The feature to define tests for
---

# Gofer Tests

You are defining acceptance test cases for a feature using a Domain Specific
Language (DSL) approach. This command can be run **before implementation**
(test-first) or **during implementation** to define test coverage.

---

## When to Use This Command

- **Test-First Development**: Define tests before writing implementation
- **During Planning**: Add test definitions to plan.md
- **During Implementation**: Create test scaffolds alongside code
- **Before Validation**: Ensure comprehensive test coverage

---

## Core Principles (Agentic Testing Best Practices)

### 1. Comment-First Approach

Always start by writing test cases as structured comments before any
implementation. This forces clear thinking about expected behavior.

### 2. DSL at Every Layer

All test code - setup, actions, assertions - must be written as readable DSL
functions. No direct framework calls in test files.

### 3. Implicit Given-When-Then

Structure tests with blank lines separating setup, action, and assertion phases.
Never use the words "Given", "When", or "Then" explicitly.

### 4. Traceability to Requirements

Every test case must trace back to a user story or acceptance criterion from
spec.md.

### 5. Follow Existing Patterns

Study and follow existing test patterns, DSL conventions, and naming standards
in the codebase.

---

## Step 1: Load Feature Context

```bash
.specify/scripts/bash/check-prerequisites.sh --json
```

Parse JSON for FEATURE_DIR, then load:

- `spec.md` - User stories and acceptance criteria
- `plan.md` - Technical architecture
- `tasks.md` - Implementation tasks (if exists)

---

## Step 2: Research Existing Test Patterns

**CRITICAL**: Before writing any test cases, research existing patterns:

Find existing test files and patterns in this codebase:

- Test file locations and naming conventions
- DSL function patterns and naming conventions
- Test organization patterns (describe blocks, test grouping)
- Test framework being used (Jest, Vitest, Mocha, etc.)

---

## Step 3: Extract Test Requirements

### From User Stories

For each user story in spec.md, extract:

```markdown
| User Story | Priority | Acceptance Criteria       | Test Cases Needed |
| ---------- | -------- | ------------------------- | ----------------- |
| US1        | P1       | User can login with email | TC001, TC002      |
| US1        | P1       | Error on invalid creds    | TC003, TC004      |
```

### Coverage Requirements

Ensure tests cover:

1. **Happy Paths** - Standard successful flows
2. **Edge Cases** - Boundary conditions, unusual but valid inputs
3. **Error Scenarios** - Invalid inputs, service failures, timeouts
4. **Boundary Conditions** - Maximum/minimum values, empty states
5. **Authorization** - Permission-based access scenarios

---

## Step 4: Define Test Cases

### Test Case Structure

```javascript
// [Test Case ID]: [Test Case Name]
// Traces to: [US-X AC-Y]
//
// setupFunction
// anotherSetupFunction
//
// actionThatTriggersLogic
//
// expectationFunction
// anotherExpectationFunction
```

### Structure Rules

- **First line**: Test case ID and name
- **Second line**: Traceability to user story/acceptance criterion
- **Blank line**: Before setup
- **Setup phase**: Functions that arrange test state
- **Blank line**: Separates setup from action
- **Action phase**: Function(s) that trigger the behavior under test
- **Blank line**: Separates action from assertions
- **Assertion phase**: Functions that verify expected outcomes

---

## Step 5: Generate Test Document

Write to `{FEATURE_DIR}/quickstart.md` (integration scenarios) or directly to
test files following codebase conventions:

````markdown
# Test Cases: [Feature Name]

## Overview

| Category       | Count | Coverage |
| -------------- | ----- | -------- |
| Happy Path     | 5     | US1, US2 |
| Edge Cases     | 3     | US1      |
| Error Handling | 4     | US1, US2 |

## Test Case Definitions

### TC001: Successful Login with Valid Email

**Traces to**: US1 AC1

```javascript
// TC001: Successful Login with Valid Email
// Traces to: US1 AC1

aUserExists({ email: 'test@example.com', password: 'valid' });
theLoginPageIsDisplayed();

userLogsInWith({ email: 'test@example.com', password: 'valid' });

userIsRedirectedToDashboard();
userSessionIsActive();
```
````

### TC002: Login Fails with Invalid Password

**Traces to**: US1 AC2

```javascript
// TC002: Login Fails with Invalid Password
// Traces to: US1 AC2

aUserExists({ email: 'test@example.com', password: 'valid' });
theLoginPageIsDisplayed();

userLogsInWith({ email: 'test@example.com', password: 'wrong' });

errorMessageIsDisplayed('Invalid credentials');
userRemainsOnLoginPage();
```

```

```
