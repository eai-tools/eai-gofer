# Tasks: Simple Test Feature

**Spec ID**: 001-test-feature **Total Tasks**: 5 **Estimated Duration**: 10-15
minutes

## Overview

Simple test tasks for verifying autonomous execution.

---

## Tasks

### Setup

- [ ] T001 Create test-feature directory structure (src/, tests/)
- [ ] T002 Create package.json with test script

### Implementation

- [ ] T003 Write src/calculator.js with add() and multiply() functions
- [ ] T004 Write tests/calculator.test.js with 3 test cases

### Validation

- [ ] T005 Run tests with `npm test` and verify all pass

---

## Task Details

### T001: Create Directory Structure

**Description**: Create the basic directory structure for the test feature

**Commands**:

```bash
mkdir -p test-feature/src
mkdir -p test-feature/tests
```

**Success Criteria**: Directories exist

---

### T002: Create package.json

**Description**: Create package.json with test script

**File**: `test-feature/package.json`

**Content**:

```json
{
  "name": "test-feature",
  "version": "1.0.0",
  "scripts": {
    "test": "node tests/calculator.test.js"
  }
}
```

**Success Criteria**: package.json exists with test script

---

### T003: Implement Calculator

**Description**: Write simple calculator with two functions

**File**: `test-feature/src/calculator.js`

**Content**:

```javascript
function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  return a * b;
}

module.exports = { add, multiply };
```

**Success Criteria**: Calculator module exports add() and multiply()

---

### T004: Write Tests

**Description**: Write simple tests for calculator functions

**File**: `test-feature/tests/calculator.test.js`

**Content**:

```javascript
const { add, multiply } = require('../src/calculator');

let passed = 0;
let failed = 0;

// Test 1: add() should add two numbers
if (add(2, 3) === 5) {
  console.log('✓ Test 1 passed: add(2, 3) === 5');
  passed++;
} else {
  console.log('✗ Test 1 failed: add(2, 3) !== 5');
  failed++;
}

// Test 2: multiply() should multiply two numbers
if (multiply(4, 5) === 20) {
  console.log('✓ Test 2 passed: multiply(4, 5) === 20');
  passed++;
} else {
  console.log('✗ Test 2 failed: multiply(4, 5) !== 20');
  failed++;
}

// Test 3: add() should handle negative numbers
if (add(-5, 10) === 5) {
  console.log('✓ Test 3 passed: add(-5, 10) === 5');
  passed++;
} else {
  console.log('✗ Test 3 failed: add(-5, 10) !== 5');
  failed++;
}

// Summary
console.log(`\nTests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
```

**Success Criteria**: Test file exists with 3 test cases

---

### T005: Run Tests

**Description**: Execute tests and verify all pass

**Commands**:

```bash
cd test-feature
npm test
```

**Expected Output**:

```
✓ Test 1 passed: add(2, 3) === 5
✓ Test 2 passed: multiply(4, 5) === 20
✓ Test 3 passed: add(-5, 10) === 5

Tests: 3 passed, 0 failed
```

**Success Criteria**: All 3 tests pass, exit code 0

---

## Dependencies

- T001 (directory structure) must complete before T002
- T002 (package.json) must complete before T005
- T003 (calculator) must complete before T004
- T004 (tests) must complete before T005

## Notes

This is an intentionally simple specification designed to test autonomous
execution without external dependencies or complex setup.
