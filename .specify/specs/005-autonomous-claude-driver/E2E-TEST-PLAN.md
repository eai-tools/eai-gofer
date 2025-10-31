# End-to-End Test Plan: Autonomous Claude Code Driver

**Feature**: #005 Autonomous Claude Code Driver **Test Level**: E2E / Manual
**Version**: 1.0 **Last Updated**: 2025-10-31

---

## Overview

This document describes end-to-end test scenarios for the Autonomous Claude Code
Driver feature. These tests verify the complete user flow from clicking the ▶️
button to successful autonomous implementation.

**Test Environment**:

- VSCode with SpecGofer extension installed
- Claude Code extension installed and configured
- Workspace with `.specify/` structure initialized
- Sample spec: `001-test-feature` (5 simple tasks)

**Prerequisites**:

- ✅ 158 unit tests passing (all autonomous modules)
- ✅ 11 integration tests passing (terminal lifecycle, output parsing)
- ✅ VSCode integration complete (commands, settings, UI)

---

## Test Scenarios

### T069/T070: Full Autonomous Run - Happy Path ✅

**Objective**: Verify complete autonomous execution from start to finish

**Setup**:

1. Open workspace in VSCode
2. Ensure `001-test-feature` spec exists in `.specify/specs/`
3. Ensure Claude Code is available

**Test Steps**:

1. Open SpecGofer Progress panel
2. Locate `001-test-feature` spec in tree view
3. Click ▶️ (Start Autonomous Implementation) button next to spec
4. Observe progress in:
   - VSCode notification
   - Output Channel: "SpecGofer Autonomous"
   - Status bar (bottom right)
   - Terminal output (if `showTerminals` = true)

**Expected Results**:

- ✅ Progress notification appears: "SpecGofer: Starting Simple Test Feature..."
- ✅ Output channel shows session start:
  ```
  [2025-10-31T19:00:00Z] Starting autonomous execution for spec: 001-test-feature
  [2025-10-31T19:00:00Z] Total tasks: 5
  [2025-10-31T19:00:00Z] Log file: .specify/logs/autonomous-2025-10-31.log
  ```
- ✅ Status bar updates: `▶️ SpecGofer: 0/5 (0%) | Initializing`
- ✅ Terminal spawns: "SpecGofer: Engineer"
- ✅ Tasks execute in order:
  - T001: Create directory structure
  - T002: Create package.json
  - T003: Write calculator.js
  - T004: Write tests
  - T005: Run tests
- ✅ Progress updates after each task:
  ```
  [2025-10-31T19:01:23Z] Progress: 1/5 (20%) - Working on T002
  [2025-10-31T19:02:45Z] Progress: 2/5 (40%) - Working on T003
  ```
- ✅ Completion notification: "✅ Autonomous execution success: 5/5 tasks
  completed"
- ✅ Final summary in output channel:

  ```
  ================================================================================
  [2025-10-31T19:05:00Z] EXECUTION COMPLETE
  Status: SUCCESS
  Duration: 300s
  Tasks: 5/5
  Errors: 0
  Retries: 0
  Context Switches: 0

  Summary: Successfully implemented all 5 tasks
  ================================================================================
  ```

- ✅ All tasks marked complete in tree view (● icons)
- ✅ Session saved to `.specify/state/sessions/{sessionId}.json`
- ✅ JSON logs written to `.specify/logs/autonomous-2025-10-31.log`

**Success Criteria**:

- All 5 tasks complete successfully
- No errors or retries needed
- Execution time < 5 minutes
- Output files created correctly:
  - `test-feature/src/calculator.js`
  - `test-feature/tests/calculator.test.js`
  - `test-feature/package.json`
- Tests run and pass

---

### T071: Error Recovery - Retry and Escalation ⚠️

**Objective**: Verify 3-level retry strategy with exponential backoff

**Setup**:

1. Create modified spec `001-test-feature-error` with intentional syntax error
   in T003
2. Modify calculator.js template to have syntax error:
   ```javascript
   function add(a, b) {
     return a + b  // Missing semicolon AND closing brace
   ```

**Test Steps**:

1. Click ▶️ to start autonomous execution on error spec
2. Wait for error detection (should be < 5 seconds)
3. Observe retry attempts:
   - Level 1: Send error only (wait 10s)
   - Level 2: Send error + file context (wait 30s)
   - Level 3: Send error + constitution (wait 60s)
4. After 3 failed retries, check for user escalation

**Expected Results**:

- ✅ Error detected within 5 seconds:
  ```
  [2025-10-31T19:01:30Z] ERROR [syntax_error]: SyntaxError: Unexpected token
  ```
- ✅ Retry attempt 1 (10s wait):
  ```
  [2025-10-31T19:01:40Z] Retry 1/3: send_error_only
  ```
- ✅ Retry attempt 2 (30s wait):
  ```
  [2025-10-31T19:02:10Z] Retry 2/3: send_error_with_file_context
  Context: calculator.js
  ```
- ✅ Retry attempt 3 (60s wait):
  ```
  [2025-10-31T19:03:10Z] Retry 3/3: send_error_with_constitution
  Context: calculator.js, constitution.md
  ```
- ✅ User escalation after 3 failures:
  ```
  [2025-10-31T19:04:10Z] Escalating to user: 3 retry attempts failed
  ```
- ✅ VSCode notification with error details:

  ```
  ⚠️ SpecGofer needs your help

  Task: T003 - Write calculator.js
  Error: SyntaxError - Missing closing brace
  Affected Files: src/calculator.js

  [View Logs] [Pause] [Stop]
  ```

- ✅ Execution pauses, waiting for user action

**Success Criteria**:

- Error detected < 5 seconds
- Exactly 3 retry attempts with correct delays (10s, 30s, 60s)
- Escalation message formatted correctly
- User can view logs and decide next action

---

### T072: Pause and Resume - State Persistence 🔄

**Objective**: Verify pause/resume functionality with state preservation

**Test Steps**:

1. Start autonomous execution on `001-test-feature`
2. Wait until 2 tasks complete (40% progress)
3. Click context menu → "Pause Autonomous Execution"
4. Verify execution pauses
5. Wait 30 seconds
6. Click context menu → "Resume Autonomous Execution"
7. Verify execution continues from where it left off

**Expected Results**:

- ✅ Pause within 500ms:
  ```
  [2025-10-31T19:02:00Z] Execution paused
  ```
- ✅ Status bar shows: `⏸️ SpecGofer: 2/5 (40%) | Paused`
- ✅ VSCode notification: "⏸️ Autonomous execution paused"
- ✅ Session state saved with:
  - `status: "paused"`
  - `pausedAt: "2025-10-31T19:02:00Z"`
  - `completedTasks: ["T001", "T002"]`
  - `currentTask: "T003"`
- ✅ Resume notification: "▶️ Autonomous execution resumed"
- ✅ Execution continues from T003 (not restart from T001)
- ✅ Session state updated:
  - `status: "running"`
  - `resumedAt: "2025-10-31T19:02:30Z"`
- ✅ Progress continues: 3/5, 4/5, 5/5
- ✅ Completion message shows total time including pause

**Success Criteria**:

- Pause response < 500ms
- State persisted correctly
- Resume continues from exact task
- No duplicate task execution
- Total execution time includes pause duration

---

### T073: VSCode Restart - Auto-Resume 🔃

**Objective**: Verify session persistence across VSCode restarts

**Test Steps**:

1. Start autonomous execution on `001-test-feature`
2. Wait until 2 tasks complete (40% progress)
3. Pause execution
4. Close VSCode completely
5. Reopen VSCode
6. Check for auto-resume prompt

**Expected Results**:

- ✅ On VSCode restart, SpecGofer detects paused session:
  ```
  Found paused session: 001-test-feature (2/5 tasks completed)
  ```
- ✅ VSCode notification:

  ```
  🔄 Resume previous autonomous session?

  Spec: Simple Test Feature
  Progress: 2/5 tasks (40%)
  Paused: 5 minutes ago

  [Resume] [Discard] [View Details]
  ```

- ✅ If user clicks "Resume":
  - Session loads from `.specify/state/sessions/{sessionId}.json`
  - Terminal recreates with same name
  - Execution continues from T003
  - Progress indicator shows correct state
- ✅ If user clicks "Discard":
  - Session file deleted
  - No auto-resume on next restart
- ✅ If user clicks "View Details":
  - Webview shows session details:
    - Session ID
    - Start time
    - Completed tasks with timestamps
    - Current task
    - Error history (if any)

**Success Criteria**:

- Session detected on restart
- User prompted with clear options
- Resume works correctly
- All state restored (progress, current task, history)
- Terminal recreates successfully

---

## Test Data

### Sample Session State (JSON)

```json
{
  "sessionId": "session-1730406000-abc123",
  "specId": "001-test-feature",
  "startedAt": "2025-10-31T19:00:00Z",
  "pausedAt": "2025-10-31T19:02:00Z",
  "resumedAt": null,
  "completedAt": null,
  "status": "paused",
  "terminals": [
    {
      "terminalId": "term-123",
      "terminalName": "SpecGofer: Engineer",
      "role": "engineer",
      "createdAt": "2025-10-31T19:00:01Z",
      "closedAt": null,
      "isAlive": true,
      "pid": 12345,
      "outputBuffer": [],
      "tokenCount": 5000,
      "currentCommand": null,
      "lastActivity": "2025-10-31T19:02:00Z"
    }
  ],
  "totalTasks": 5,
  "completedTasks": ["T001", "T002"],
  "currentTask": "T003",
  "failedTasks": [],
  "tokenCount": 5000,
  "contextSwitches": 0,
  "events": [
    {
      "timestamp": "2025-10-31T19:00:00Z",
      "type": "session_started",
      "data": { "specId": "001-test-feature", "totalTasks": 5 }
    },
    {
      "timestamp": "2025-10-31T19:00:30Z",
      "type": "task_completed",
      "data": { "taskId": "T001" }
    },
    {
      "timestamp": "2025-10-31T19:01:30Z",
      "type": "task_completed",
      "data": { "taskId": "T002" }
    },
    {
      "timestamp": "2025-10-31T19:02:00Z",
      "type": "user_paused",
      "data": { "currentTask": "T003" }
    }
  ],
  "errorHistory": [],
  "questionHistory": [],
  "options": {
    "enableParallelTester": false,
    "showTerminals": true,
    "notificationChannel": "vscode",
    "whatsappPhoneNumber": null,
    "emailAddress": null,
    "maxRetries": 3,
    "tokenWarningThreshold": 150000,
    "tokenActionThreshold": 180000,
    "questionTimeout": 300000,
    "runFinalValidation": true,
    "validateConstitution": true
  }
}
```

---

## Test Execution Checklist

### Pre-Test Setup

- [ ] SpecGofer extension installed (v2.0.6+)
- [ ] Claude Code extension installed
- [ ] Workspace initialized with `.specify/` structure
- [ ] Sample spec `001-test-feature` created
- [ ] All unit tests passing (158/158)
- [ ] Extension compiled successfully

### Test Execution

- [ ] **T069/T070**: Full autonomous run → Success ✅
- [ ] **T071**: Error retry → Escalation after 3 attempts ⚠️
- [ ] **T072**: Pause/Resume → State preserved 🔄
- [ ] **T073**: VSCode restart → Auto-resume 🔃

### Post-Test Validation

- [ ] All test artifacts created correctly
- [ ] Session files saved to `.specify/state/sessions/`
- [ ] JSON logs written to `.specify/logs/`
- [ ] No memory leaks or resource issues
- [ ] Output channel shows complete logs
- [ ] Status bar updates correctly
- [ ] Tree view reflects task status

---

## Known Limitations

1. **E2E Test Automation**: These tests require manual execution because:
   - VSCode extension testing requires Playwright setup
   - Claude Code integration needs real API access
   - File system operations need real workspace
   - User interaction scenarios (pause/resume) are manual

2. **Timing Variability**: Actual execution times depend on:
   - Claude API response time
   - Network latency
   - System resources
   - Task complexity

3. **Error Scenarios**: Intentional errors for testing must be:
   - Realistic (syntax errors, missing files)
   - Recoverable (not system crashes)
   - Documented in test spec

---

## Success Metrics

### Quantitative

- ✅ 158 unit tests passing
- ✅ 11 integration tests passing
- ✅ 100% of T069-T073 scenarios executable
- ⏱️ Average execution time < 5 minutes per spec
- 🎯 0 unhandled exceptions during execution
- 💾 100% session state persistence accuracy

### Qualitative

- ✅ User can start execution with one click
- ✅ Progress is visible in real-time
- ✅ Errors are handled gracefully
- ✅ User escalation is clear and actionable
- ✅ Pause/resume works seamlessly
- ✅ Logs provide complete audit trail

---

## Future E2E Automation

To fully automate these tests, we would need:

1. **VSCode Extension Test Framework**:

   ```typescript
   import { runTests } from '@vscode/test-electron';
   ```

2. **Playwright Integration**:

   ```typescript
   import { test, expect } from '@playwright/test';
   ```

3. **Mock Claude Code API**:
   - Simulated terminal output
   - Controlled error scenarios
   - Predictable response times

4. **Dedicated Test Workspace**:
   - Isolated test environment
   - Ephemeral state (clean between runs)
   - Test fixtures and snapshots

This is out of scope for the current MVP but recommended for future iterations.

---

## Test Report Template

```markdown
# E2E Test Report: Autonomous Claude Code Driver

**Date**: YYYY-MM-DD **Tester**: Name **Version**: 2.0.6 **Environment**:
macOS/Windows/Linux

## Test Results

| Scenario             | Status  | Duration | Notes                      |
| -------------------- | ------- | -------- | -------------------------- |
| T069/T070: Full Run  | ✅ PASS | 4m 32s   | All tasks completed        |
| T071: Error Recovery | ✅ PASS | 2m 15s   | 3 retries, then escalation |
| T072: Pause/Resume   | ✅ PASS | 5m 10s   | State preserved            |
| T073: VSCode Restart | ✅ PASS | 1m 05s   | Auto-resume worked         |

## Issues Found

- None

## Recommendations

- None

## Attachments

- Session logs: `autonomous-YYYY-MM-DD.log`
- Screenshots: `screenshots/`
```

---

**Last Updated**: 2025-10-31 **Next Review**: After first production deployment
