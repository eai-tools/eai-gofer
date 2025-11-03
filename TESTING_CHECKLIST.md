# Claude Code Terminal Integration - Testing Checklist

**Feature**: 001-claude-terminal-integration **Date**: November 3, 2025

## ✅ Pre-Test Setup

- [x] Claude Code CLI installed:
      `/Users/douglaswross/.nvm/versions/node/v20.19.5/bin/claude`
- [x] Test spec available:
      `.specify/specs/001-claude-terminal-integration/spec.md`
- [x] Extension compiled successfully (0 errors)
- [ ] **TODO**: Anthropic API key configured in VSCode Settings

## 🧪 Test Cases

### Test 1: Launch Claude Code Terminal

**Command**: `SpecGofer: Start Claude Code Terminal`

**Steps**:

1. Open VSCode Command Palette (`Cmd+Shift+P`)
2. Type: `SpecGofer: Start Claude Code Terminal`
3. Select spec: `001-claude-terminal-integration`

**Expected Results**:

- [ ] Output channel opens automatically
- [ ] See: `[TerminalManager] Creating terminal session`
- [ ] See: `[QuestionValidator] Anthropic client initialized`
- [ ] See: `[TerminalManager] Terminal launched with PID: <number>`
- [ ] Claude Code starts executing
- [ ] Real-time output appears

**Actual Results**: **\*\***\_**\*\***

---

### Test 2: Output Monitoring

**Location**: View → Output → Select "SpecGofer"

**Expected Results**:

- [ ] `[Claude Output]` lines appear in real-time
- [ ] Output updates with <100ms latency
- [ ] No lag or freezing
- [ ] Output buffer shows recent lines

**Actual Results**: **\*\***\_**\*\***

---

### Test 3: Question Detection (If Applicable)

**Trigger**: Wait for Claude Code to ask a question

**Expected Questions**:

- "Which approach should I use?"
- "Would you like me to..."
- "Should I implement..."

**Expected Results**:

- [ ] See: `[OutputMonitor] Question detected`
- [ ] See: `[QuestionValidator] Validating question...`
- [ ] See one of:
  - `[QuestionValidator] Auto-responding (confidence: XX%)` OR
  - `[EscalationManager] Escalating to human`

**Actual Results**: **\*\***\_**\*\***

---

### Test 4: Stop Claude Code Terminal

**Command**: `SpecGofer: Stop Claude Code Terminal`

**Steps**:

1. Open Command Palette (`Cmd+Shift+P`)
2. Type: `SpecGofer: Stop Claude Code Terminal`

**Expected Results**:

- [ ] See: `[TerminalManager] Stopping terminal session`
- [ ] Terminal process exits cleanly
- [ ] No error messages
- [ ] No zombie processes

**Actual Results**: **\*\***\_**\*\***

**Verify no zombies**:

```bash
ps aux | grep claude
# Should show no orphaned processes
```

---

### Test 5: All Commands Available

**Location**: Command Palette (`Cmd+Shift+P`)

**Type "SpecGofer" and verify these commands exist**:

- [ ] `SpecGofer: Start Claude Code Terminal`
- [ ] `SpecGofer: Stop Claude Code Terminal`
- [ ] `SpecGofer: Configure WhatsApp Integration`
- [ ] `SpecGofer: Test WhatsApp Connection`
- [ ] `SpecGofer: Clear Memory Database`
- [ ] `SpecGofer: View Pending Escalations`

**Actual Results**: **\*\***\_**\*\***

---

## 🔍 Optional Advanced Tests

### Test 6: WhatsApp Integration (If Configured)

**Command**: `SpecGofer: Test WhatsApp Connection`

**Prerequisites**:

- Twilio account configured
- Environment variables set

**Expected Results**:

- [ ] WhatsApp message sent to phone
- [ ] See: `[WhatsApp] Test message sent successfully`

---

### Test 7: Memory Learning (If Questions Detected)

**Trigger**: Answer a question manually

**Expected Results**:

- [ ] Memory saved to `.specify/memory/decisions/`
- [ ] See: `[MemoryManager] Saved decision pattern`
- [ ] Next similar question uses cached response

---

### Test 8: Context Window Management

**Trigger**: Long-running Claude Code session

**Check**:

```bash
# View context status
# Should see token count and utilization in output
```

**Expected Results**:

- [ ] Token count estimation shown
- [ ] Warning at 80% utilization
- [ ] Buffer trimmed automatically if needed

---

## 📊 Performance Metrics

### Latency Targets

- [ ] Terminal launch: <5 seconds
- [ ] Output monitoring: <100ms P99
- [ ] Question detection: <1 second
- [ ] Auto-response: <10 seconds

### Verify in Output:

Look for performance stats in the SpecGofer output panel.

---

## 🐛 Known Issues to Watch For

1. **PATH issues on macOS**: Should be fixed with `fix-path` package
2. **API key not found**: Check VSCode settings first, then env var
3. **Terminal not launching**: Check Claude Code CLI is installed globally
4. **WhatsApp not working**: Optional - skip if not configured

---

## ✅ Test Summary

**Date Tested**: **\*\***\_\_\_**\*\*** **Tester**: **\*\***\_\_\_**\*\***
**Version**: 3.0.17

**Pass Rate**: **_ / _** tests passed

**Critical Issues Found**: **\*\***\_\_\_**\*\***

**Non-Critical Issues**: **\*\***\_\_\_**\*\***

**Overall Status**:

- [ ] ✅ PASS - Ready for release
- [ ] ⚠️ PASS with minor issues
- [ ] ❌ FAIL - Major issues found

---

## 📝 Notes

Add any observations, bugs, or suggestions here:

---

---

---
