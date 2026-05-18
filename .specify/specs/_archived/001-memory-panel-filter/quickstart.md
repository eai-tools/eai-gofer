# Quickstart Testing Guide: Memory Panel Usability Fix

**Feature Branch**: `001-memory-panel-filter` **Last Updated**: 2026-03-20
**Status**: Ready for Testing

---

## Prerequisites

Before running tests, ensure the following are installed and configured:

| Prerequisite   | Version | Installation                                    | Verification               |
| -------------- | ------- | ----------------------------------------------- | -------------------------- |
| **Node.js**    | 18+     | `brew install node` or visit https://nodejs.org | `node --version`           |
| **npm**        | 9+      | Included with Node.js                           | `npm --version`            |
| **TypeScript** | 5.0+    | `npm install -g typescript`                     | `tsc --version`            |
| **Vitest**     | Latest  | Included in project dependencies                | `npm test --version`       |
| **VSCode**     | 1.85+   | Latest from https://code.visualstudio.com       | Open VSCode → Help → About |
| **VSCode CLI** | Latest  | Included with VSCode install                    | `code --version`           |
| **git**        | 2.30+   | `brew install git` or via Xcode                 | `git --version`            |

**Total Prerequisites**: 8

---

## Setup Steps

### 1. Verify Feature Branch is Checked Out

```bash
cd /Users/douglaswross/Code/eai-gofer
git status
# Expected: On branch 001-memory-panel-filter
# Expected: Files modified in extension/src/
```

If not on the feature branch:

```bash
git checkout 001-memory-panel-filter
```

### 2. Install Project Dependencies

```bash
cd /Users/douglaswross/Code/eai-gofer
npm install
```

**Expected Output**: Successfully installs all dependencies, no errors

### 3. Compile TypeScript

```bash
cd extension && npm run compile
```

**Expected Output**:

```
$ tsc
# No output = success
# Any errors = compilation failed, fix TypeScript issues
```

### 4. Build the Extension

```bash
cd /Users/douglaswross/Code/eai-gofer
npm run build
```

**Expected Output**: Webpack build completes successfully

### 5. Verify Test Infrastructure

```bash
npm test -- --version
```

**Expected Output**: Vitest version displayed

### 6. Launch VSCode with Extension

```bash
cd extension
npm run start
```

This launches VSCode in debug mode with the extension loaded.

**Expected Output**: VSCode opens with "Extension Development Host" in title bar

---

## Manual Testing Section

### Test Scenario 1: View User Memories Only (Priority: P1)

**Acceptance Criteria**: When Memory Panel opens, only user-created memories are
displayed, system telemetry logs are hidden by default.

**Setup**:

1. Launch VSCode in debug mode: `cd extension && npm run start`
2. Open Command Palette: `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Run command: `Gofer: Remember`
4. Create 3 test memories with distinct categories:
   - **Memory 1**: Category="pattern", Content="Use debounce for rapid input
     handlers"
   - **Memory 2**: Category="decision", Content="Always validate user input
     before processing"
   - **Memory 3**: Category="gotcha", Content="VSCode extensions block main
     thread on execSync"

**Test Steps**:

1. Open Memory Panel: Command Palette → `Gofer: View Memories`
2. Verify panel displays exactly 3 memories (count in results: "3 memories")
3. Verify system telemetry logs are NOT visible (e.g., no `auto_decision`,
   `discovery` entries)
4. Verify you can see all 3 user memories without scrolling
5. Verify each memory displays: title, category, tags, timestamp, content
   snippet

**Expected Results**:

- ✅ Results count shows "3 memories" (not "3 of 500+ memories")
- ✅ No system categories visible in category filter dropdown
- ✅ No "#auto" tag visible in tag filter dropdown
- ✅ All 3 user memories visible and readable
- ✅ Empty state NOT shown (user memories exist)

**Failure Conditions**:

- ❌ Panel shows 500+ entries (filter not applied)
- ❌ System memories visible (category dropdown includes "auto_decision")
- ❌ Results count doesn't update

**Duration**: ~5 minutes

---

### Test Scenario 2: Category Filter Shows Only User Categories (Priority: P1)

**Acceptance Criteria**: Category dropdown excludes system-generated categories
when system memories are hidden.

**Setup**: Complete Test Scenario 1 first (3 user memories created)

**Test Steps**:

1. With Memory Panel open, click the "Category" dropdown filter
2. Verify visible categories in dropdown:
   - ✅ "pattern"
   - ✅ "decision"
   - ✅ "gotcha"
3. Verify system categories are NOT in dropdown:
   - ❌ "auto_decision" (should not appear)
   - ❌ "discovery" (should not appear)
4. Select "pattern" filter
5. Verify results show only the "pattern" memory

**Expected Results**:

- ✅ Dropdown contains exactly 3 categories (the user-created ones)
- ✅ Filtering by "pattern" shows 1 memory
- ✅ No system categories visible

**Failure Conditions**:

- ❌ Dropdown shows system categories
- ❌ Dropdown count doesn't match created memories

**Duration**: ~3 minutes

---

### Test Scenario 3: Tag Filter Shows Only User Tags (Priority: P1)

**Acceptance Criteria**: Tag dropdown excludes the "#auto" tag and only shows
user-applied tags.

**Setup**: Complete Test Scenario 1 first

**Test Steps**:

1. With Memory Panel open, click the "Tags" dropdown filter
2. Inspect visible tags (should vary based on tags you added to test memories)
3. Verify "#auto" tag is NOT in dropdown
4. If you tagged memories with user tags (e.g., "#critical", "#review"), verify
   those appear
5. Click on a user tag to filter by it
6. Verify results include only memories with that tag

**Expected Results**:

- ✅ "#auto" tag not visible in dropdown
- ✅ Only user-applied tags visible
- ✅ Filtering by user tag works correctly

**Failure Conditions**:

- ❌ "#auto" tag appears in dropdown
- ❌ Tag filtering doesn't work

**Duration**: ~3 minutes

---

### Test Scenario 4: Empty State Message for No User Memories (Priority: P1)

**Acceptance Criteria**: When no user memories exist, panel displays a helpful
empty state message.

**Setup**:

1. Fresh VSCode workspace (or delete memories.jsonl to start clean)
2. Open Memory Panel without creating any user memories

**Test Steps**:

1. Open Command Palette → `Gofer: View Memories`
2. Verify empty state message displays:
   - ✅ "No user memories yet"
   - ✅ Guidance text: "Create your first memory with 'Gofer: Remember' command"
   - ✅ Reference to toggle: "System memories are hidden - toggle 'Show system
     memories' to see them"
3. Verify no empty list or error message shows instead
4. Verify the "Show system memories" toggle is visible and unchecked

**Expected Results**:

- ✅ Clear, informative empty state displayed
- ✅ Guidance text helps user understand next action
- ✅ Toggle state visible and accessible

**Failure Conditions**:

- ❌ Blank panel or error message instead of empty state
- ❌ Missing guidance text

**Duration**: ~2 minutes

---

### Test Scenario 5: Keyword Search Respects Filter (Priority: P1)

**Acceptance Criteria**: Keyword search returns only user memories when system
memories are hidden.

**Setup**: Complete Test Scenario 1 first (3 user memories created)

**Test Steps**:

1. With Memory Panel open, enter search keyword: "debounce" (from Memory 1 in
   Scenario 1)
2. Verify search returns only the matching user memory
3. Enter search keyword: "budget_warning" (a common system telemetry keyword not
   in user memories)
4. Verify search returns zero results (no system memories included)
5. Verify results message shows: "0 memories" (not hidden system memories)

**Expected Results**:

- ✅ Keyword search for user content returns matching memories
- ✅ Keyword search for system-only content returns 0 results
- ✅ Search respects the system memory filter

**Failure Conditions**:

- ❌ System memories appear in search results
- ❌ Results count incorrect

**Duration**: ~3 minutes

---

### Test Scenario 6: Toggle "Show System Memories" (Priority: P2)

**Acceptance Criteria**: Clicking the "Show system memories" toggle displays
system telemetry logs.

**Setup**: Complete Test Scenario 1 first (3 user + 200+ system memories exist)

**Test Steps**:

1. With Memory Panel open and showing only 3 user memories, locate the "Show
   system memories" toggle (checkbox)
2. Verify toggle is currently unchecked
3. Click the toggle to check it
4. Observe panel refresh and results list update
5. Verify results count increases significantly (3 user + 200+ system)
6. Verify system categories now appear in dropdown: "auto_decision", "discovery"
7. Verify "#auto" tag now appears in tag dropdown
8. Verify system memories with "#auto" tag are displayed in results

**Expected Results**:

- ✅ Toggle appears in toolbar
- ✅ Clicking toggle refreshes panel
- ✅ Results count increases to include system memories
- ✅ System categories visible in dropdown
- ✅ "#auto" tag visible in tag dropdown
- ✅ System memories displayed

**Failure Conditions**:

- ❌ Toggle doesn't exist
- ❌ Clicking toggle has no effect
- ❌ Results count unchanged

**Duration**: ~4 minutes

---

### Test Scenario 7: Category Filter with System Memories Visible (Priority: P2)

**Acceptance Criteria**: Category dropdown shows both user and system categories
when toggle is enabled.

**Setup**: Complete Test Scenario 6 first (toggle enabled, system memories
visible)

**Test Steps**:

1. With "Show system memories" enabled and both user + system memories visible
2. Click the "Category" dropdown filter
3. Verify dropdown now includes system categories:
   - ✅ "auto_decision"
   - ✅ "discovery"
4. Verify user categories still visible:
   - ✅ "pattern", "decision", "gotcha"
5. Select "auto_decision" filter
6. Verify results show only system memories with that category
7. Verify metadata (timestamp, tags) visible

**Expected Results**:

- ✅ Dropdown shows both user and system categories
- ✅ Filtering by system category works
- ✅ System memories display with metadata

**Failure Conditions**:

- ❌ System categories not in dropdown
- ❌ Filtering by system category returns no results

**Duration**: ~3 minutes

---

### Test Scenario 8: Toggle Off Returns to User Memories Only (Priority: P2)

**Acceptance Criteria**: Unchecking the toggle hides system memories again.

**Setup**: Complete Test Scenario 6 first (toggle enabled, showing 200+
memories)

**Test Steps**:

1. With "Show system memories" enabled and system memories visible
2. Click the toggle to uncheck it
3. Observe panel refresh
4. Verify results count decreases back to 3 (user memories only)
5. Verify system categories disappear from category dropdown
6. Verify "#auto" tag disappears from tag dropdown
7. Verify only user memories visible in results

**Expected Results**:

- ✅ Toggle unchecks successfully
- ✅ Results count reverts to 3 memories
- ✅ System categories hidden in dropdown
- ✅ System memories hidden

**Failure Conditions**:

- ❌ Toggle doesn't uncheck
- ❌ Results count unchanged
- ❌ System memories still visible

**Duration**: ~2 minutes

---

### Test Scenario 9: Keyword Search with System Memories Visible (Priority: P2)

**Acceptance Criteria**: Keyword search includes system memories when toggle is
enabled.

**Setup**: Complete Test Scenario 6 first (toggle enabled)

**Test Steps**:

1. With "Show system memories" enabled, enter search keyword: "budget_warning"
2. Verify search returns system memory results (auto_decision logs with budget
   warnings)
3. Enter search keyword: "debounce" (user memory content)
4. Verify search returns the user memory
5. Enter search keyword that matches both: (requires knowledge of actual data,
   e.g., "decision")
6. Verify results include both user and system memories with that keyword

**Expected Results**:

- ✅ System telemetry keywords return results
- ✅ User memory keywords return results
- ✅ Search includes all memories when toggle enabled

**Failure Conditions**:

- ❌ System keywords return no results
- ❌ Search results inconsistent

**Duration**: ~3 minutes

---

### Test Scenario 10: Toggle State Persists Within Session (Priority: P3)

**Acceptance Criteria**: Closing and reopening Memory Panel preserves toggle
state.

**Setup**: Complete Test Scenario 6 first (toggle enabled)

**Test Steps**:

1. With "Show system memories" toggle CHECKED and system memories visible
2. Close Memory Panel (click X button)
3. Wait 2 seconds
4. Reopen Memory Panel: Command Palette → `Gofer: View Memories`
5. Verify toggle remains CHECKED
6. Verify system memories still visible (200+ count)
7. Close panel again
8. Toggle the checkbox to UNCHECK it and close
9. Reopen Memory Panel
10. Verify toggle remains UNCHECKED
11. Verify only user memories visible

**Expected Results**:

- ✅ Toggle state preserved when panel reopens
- ✅ Results match toggle state (closed and reopened)

**Failure Conditions**:

- ❌ Toggle resets to unchecked on panel reopen
- ❌ Results don't match toggle state

**Duration**: ~4 minutes

**Note**: This tests session-level persistence. Workspace-level persistence
(across VSCode restarts) is P3 and may require additional implementation.

---

## Automated Tests Section

### Running All Tests

```bash
cd /Users/douglaswross/Code/eai-gofer
npm test
```

**Expected Output**:

```
✓ MemoryStorage.query() - excludeSystemMemories: true filters out #auto tagged memories
✓ MemoryStorage.query() - excludeSystemMemories: false includes all memories
✓ MemoryPanel - toggle change updates search results
✓ MemoryPanel - category dropdown excludes system categories when toggle OFF
✓ MemoryPanel - tag dropdown excludes #auto when toggle OFF
✓ MemoryPanel - empty state appears when no user memories exist
✓ MemoryPanel - results count reflects filtered memories
# ... additional tests
PASS  all tests passed
```

### Running Specific Test Suite

```bash
# Test MemoryStorage.query() filter logic
npm test -- MemoryStorage.test.ts

# Test MemoryPanel UI behavior
npm test -- MemoryPanel.test.ts

# Test Memory integration
npm test -- autonomous/memory.test.ts
```

### Key Test Files

| Test File                                           | Coverage                                         |
| --------------------------------------------------- | ------------------------------------------------ |
| `tests/unit/autonomous/MemoryStorage.test.ts`       | Unit tests for query() filter logic              |
| `tests/unit/ui/MemoryPanel.test.ts`                 | UI component behavior (toggle, dropdown updates) |
| `tests/integration/MemoryPanel.integration.test.ts` | Integration tests (E2E panel behavior)           |
| `tests/unit/autonomous/memory.test.ts`              | MemoryQuery interface validation                 |

### Unit Tests: MemoryStorage.query()

Tests the `excludeSystemMemories` filter logic:

```bash
npm test -- MemoryStorage.test.ts
```

**Expected Test Cases**:

1. ✅ `excludeSystemMemories: true` filters out `#auto` tagged memories
2. ✅ `excludeSystemMemories: false` includes all memories
3. ✅ `excludeSystemMemories: undefined` includes all memories (backward compat)
4. ✅ Filter works correctly with 1000+ memories
5. ✅ Filter respects other query conditions (category, tags, scope)

**Expected Output**: All tests pass

---

### Integration Tests: MemoryPanel

Tests the UI behavior and toggle state:

```bash
npm test -- MemoryPanel.test.ts
```

**Expected Test Cases**:

1. ✅ Panel renders toggle control
2. ✅ Toggle change triggers webview message
3. ✅ Toggle change updates search results
4. ✅ Category dropdown excludes system categories when toggle OFF
5. ✅ Tag dropdown excludes `#auto` when toggle OFF
6. ✅ Empty state displays when no user memories and toggle OFF
7. ✅ Results count reflects filtered memories
8. ✅ Toggle state persists within session

**Expected Output**: All tests pass

---

### E2E Test Flow

For end-to-end testing with a real VSCode instance:

```bash
# Start VSCode in debug mode
cd extension && npm run start

# In another terminal, run E2E tests (if available)
npm run test:e2e
```

**Expected Flow**:

1. ✅ VSCode launches with extension loaded
2. ✅ Create user memory via "Gofer: Remember" command
3. ✅ Open Memory Panel
4. ✅ Verify user memory appears
5. ✅ Verify system memories hidden by default
6. ✅ Toggle "Show system memories" ON
7. ✅ Verify system memories now visible
8. ✅ Toggle OFF
9. ✅ Verify user memories only again

---

## Key Files Table

| File                                                 | Purpose                                | Testing Impact                                |
| ---------------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| `extension/src/ui/MemoryPanel.ts`                    | Main Memory Panel UI component         | Toggle control, empty state, filter behavior  |
| `extension/src/autonomous/MemoryStorage.ts`          | Storage layer with query() filtering   | `excludeSystemMemories` filter logic          |
| `extension/src/autonomous/memory.ts`                 | MemoryQuery interface definition       | Query parameter validation                    |
| `extension/src/autonomous/MemoryManager.ts`          | Manager for loading/searching memories | Parameter passing from UI to storage          |
| `extension/src/commands/memoryCommands.ts`           | User memory creation command           | Verifies user memories never have "#auto" tag |
| `extension/src/autonomous/ContinuousMemoryWriter.ts` | System memory creation                 | Verifies all system memories have "#auto" tag |
| `extension/src/memoryProvider.ts`                    | Memory tree view provider              | Category display and grouping patterns        |
| `tests/unit/autonomous/MemoryStorage.test.ts`        | Unit tests for filter logic            | Filter validation                             |
| `tests/unit/ui/MemoryPanel.test.ts`                  | UI component tests                     | Toggle, dropdown, empty state tests           |
| `tests/integration/MemoryPanel.integration.test.ts`  | Full panel integration tests           | E2E scenario validation                       |

---

## Common Issues Section

### Issue 1: Test Failures - `excludeSystemMemories is not defined`

**Symptom**: Test error:
`Property 'excludeSystemMemories' does not exist on type 'MemoryQuery'`

**Root Cause**: MemoryQuery interface not updated with new property

**Solution**:

1. Edit `extension/src/autonomous/memory.ts`
2. Find the MemoryQuery interface (lines 176-212)
3. Add property:
   ```typescript
   /** Exclude system-generated memories (tagged with #auto) */
   excludeSystemMemories?: boolean;
   ```
4. Save and recompile: `cd extension && npm run compile`
5. Rerun tests: `npm test`

---

### Issue 2: No System Memories Generated for Testing

**Symptom**: Test Scenario 6 fails because system memories don't exist

**Root Cause**: Extension not running long enough for autonomous subsystems to
generate telemetry

**Solution**:

1. Launch VSCode in debug mode: `cd extension && npm run start`
2. Wait 30-60 seconds for extension to initialize
3. Open a workspace or project folder
4. Let the extension run for 5+ minutes to accumulate system memories
5. Alternatively, manually edit `memories.jsonl` to add test system memories:
   ```json
   {
     "id": "test-auto-1",
     "category": "auto_decision",
     "tags": ["#auto"],
     "content": "Test system memory",
     "timestamp": "2026-03-20T00:00:00Z"
   }
   ```

---

### Issue 3: Toggle Control Not Visible in Panel

**Symptom**: "Show system memories" checkbox doesn't appear

**Root Cause**: HTML template not updated with toggle control

**Solution**:

1. Edit `extension/src/ui/MemoryPanel.ts`
2. Find the HTML template section (lines 466-608)
3. Locate the toolbar div with results info
4. Add checkbox before closing toolbar:
   ```html
   <label style="margin-left: auto;">
     <input type="checkbox" id="showSystemMemories" />
     Show system memories
   </label>
   ```
5. Save and recompile
6. Reload VSCode extension: `Cmd+R` or `Ctrl+Shift+F5`

---

### Issue 4: Category Dropdown Still Shows System Categories

**Symptom**: "auto_decision" and "discovery" categories visible even with toggle
OFF

**Root Cause**: Categories extracted before filter applied

**Solution**:

1. Edit `extension/src/ui/MemoryPanel.ts`
2. Find `getHtmlContent()` method (line ~175)
3. Add filtering before category extraction:

   ```typescript
   const allMemories = await this.memoryManager.load('both');

   // Filter out system memories by default
   const visibleMemories = allMemories.filter((m) => !m.tags.includes('#auto'));

   // Extract categories from filtered memories
   const categories = Array.from(
     new Set(visibleMemories.map((m) => m.category))
   ).sort();
   ```

4. Save and recompile

---

### Issue 5: Search Results Show System Memories When Toggle OFF

**Symptom**: Keyword search returns system memories even when filter should hide
them

**Root Cause**: MemoryStorage.query() not checking `excludeSystemMemories` flag

**Solution**:

1. Edit `extension/src/autonomous/MemoryStorage.ts`
2. Find `query()` method (line ~384)
3. Add filter after other filters:
   ```typescript
   // Exclude system memories if requested
   if (query.excludeSystemMemories) {
     results = results.filter((e) => !e.tags.includes('#auto'));
   }
   ```
4. Save and recompile

---

### Issue 6: Toggle State Doesn't Persist on Panel Reopen

**Symptom**: Closing and reopening Memory Panel resets toggle to unchecked

**Root Cause**: Toggle state not stored in panel instance variable

**Solution**:

1. Edit `extension/src/ui/MemoryPanel.ts`
2. Add instance variable:
   ```typescript
   private showSystemMemories: boolean = false;
   ```
3. In `handleMessage()` method, update when toggle changes:
   ```typescript
   case 'toggleSystemMemories':
     this.showSystemMemories = message.showSystemMemories;
     // Refresh panel
     break;
   ```
4. When rendering HTML, set checkbox checked state:
   ```html
   <input type="checkbox" id="showSystemMemories" ${this.showSystemMemories ? 'checked' : ''} />
   ```
5. Save and recompile

---

### Issue 7: TypeScript Compilation Errors

**Symptom**: `npm run compile` fails with type errors

**Root Cause**: Code changes introduced type violations

**Solution**:

1. Check error output: `npm run compile 2>&1 | tail -20`
2. Common errors:
   - **"Property does not exist"**: Add property to interface
   - **"Type mismatch"**: Check parameter types match interface
   - **"Cannot find module"**: Verify import paths
3. Fix errors in source files
4. Recompile: `cd extension && npm run compile`

---

### Issue 8: VSCode Extension Won't Load in Debug Mode

**Symptom**: "Extension Development Host" window doesn't open or closes
immediately

**Root Cause**: Compilation errors or missing dependencies

**Solution**:

1. Verify compilation succeeds: `cd extension && npm run compile`
2. Verify dependencies installed: `npm install`
3. Check for errors in VSCode Output panel: View → Output → choose "Extension
   Host"
4. If reflect-metadata error appears, verify it's imported first in
   `extension.ts`
5. Restart debug session: `Ctrl+Shift+D` → Stop and Start

---

### Issue 9: Memory Panel Shows "Connection Lost" Error

**Symptom**: Panel displays error message instead of memories

**Root Cause**: Webview communication broken or MemoryManager.load() failed

**Solution**:

1. Check VSCode console: View → Output → Extension Host
2. Look for error messages from MemoryManager
3. Verify memories.jsonl exists: `ls -la ~/.specify/memory/memories.jsonl`
4. If file missing, run "Gofer: Remember" command to create it
5. Check file permissions: `chmod 644 ~/.specify/memory/memories.jsonl`
6. Reload extension: `Cmd+R` or `Ctrl+Shift+F5`

---

### Issue 10: Cannot Delete Test Memories

**Symptom**: Test memories persist after testing, affecting subsequent tests

**Root Cause**: No built-in delete functionality in Memory Panel

**Solution**:

1. Manually clear memories:
   ```bash
   rm ~/.specify/memory/memories.jsonl
   ```
2. Reload extension to create empty file:
   ```bash
   Cmd+R (macOS) or Ctrl+Shift+F5 (Windows/Linux)
   ```
3. Alternatively, edit memories.jsonl directly:
   ```bash
   # Keep only non-auto memories
   grep -v '"tags":\["#auto"\]' ~/.specify/memory/memories.jsonl > temp.jsonl
   mv temp.jsonl ~/.specify/memory/memories.jsonl
   ```

---

## Testing Checklist

Use this checklist to track testing progress:

### Manual Testing

- [ ] Test Scenario 1: View User Memories Only
- [ ] Test Scenario 2: Category Filter Shows User Categories
- [ ] Test Scenario 3: Tag Filter Shows User Tags
- [ ] Test Scenario 4: Empty State Message
- [ ] Test Scenario 5: Keyword Search Respects Filter
- [ ] Test Scenario 6: Toggle "Show System Memories"
- [ ] Test Scenario 7: Category Filter with System Visible
- [ ] Test Scenario 8: Toggle Off Returns to User Memories
- [ ] Test Scenario 9: Keyword Search with System Visible
- [ ] Test Scenario 10: Toggle State Persists Within Session

### Automated Testing

- [ ] Run full test suite: `npm test`
- [ ] Run MemoryStorage unit tests
- [ ] Run MemoryPanel integration tests
- [ ] Verify all tests pass with no failures
- [ ] Check test coverage: `npm test -- --coverage`

### Verification

- [ ] No TypeScript compilation errors
- [ ] VSCode extension loads without errors
- [ ] No console errors in Extension Host output
- [ ] Memory Panel renders without crashes
- [ ] All user memories visible by default
- [ ] All system memories hidden by default
- [ ] Toggle control functional
- [ ] Filtering works correctly

---

## Quick Reference Commands

| Task                 | Command                               |
| -------------------- | ------------------------------------- |
| Install dependencies | `npm install`                         |
| Compile TypeScript   | `cd extension && npm run compile`     |
| Build extension      | `npm run build`                       |
| Run all tests        | `npm test`                            |
| Run specific test    | `npm test -- MemoryPanel.test.ts`     |
| Start VSCode debug   | `cd extension && npm run start`       |
| Format code          | `npm run format`                      |
| Lint code            | `npm run lint`                        |
| View test coverage   | `npm test -- --coverage`              |
| Clear test memories  | `rm ~/.specify/memory/memories.jsonl` |

---

## Success Criteria Summary

All tests pass when:

| Criterion                                    | Status |
| -------------------------------------------- | ------ |
| Default view shows only user memories        | ✅     |
| System memories hidden by default            | ✅     |
| Category dropdown excludes system categories | ✅     |
| Tag dropdown excludes "#auto" tag            | ✅     |
| Toggle control renders and functions         | ✅     |
| Toggle reveals system memories               | ✅     |
| Empty state displays when appropriate        | ✅     |
| Search respects filter state                 | ✅     |
| Toggle state persists within session         | ✅     |
| All unit tests pass                          | ✅     |
| All integration tests pass                   | ✅     |
| No TypeScript errors                         | ✅     |
| No runtime errors                            | ✅     |
| Backward compatibility maintained            | ✅     |

---

**Document Complete**: This quickstart provides comprehensive guidance for
testing the Memory Panel Usability Fix feature across manual scenarios,
automated tests, and common troubleshooting.

**Questions?** Refer to the test scenarios above or check the specification and
research documents for detailed requirements.
