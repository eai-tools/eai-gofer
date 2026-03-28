# Quickstart: AI Token Usage Tracking Panel

## Prerequisites

- VSCode 1.85 or higher
- Gofer extension installed
- Active workspace with `.specify/` directory
- Claude Code CLI configured and running

## Setup

### 1. Enable the Feature

The AI Token Usage panel is enabled by default and replaces the Context Window panel. To configure:

```json
// .vscode/settings.json
{
  "gofer.aiUsage.statusBar.enabled": true,  // Show status bar item (default: true)
  "gofer.aiUsage.statusBar.alignment": "left"  // Status bar alignment (default: left)
}
```

### 2. Generate Usage Data

To see the panel in action, you need AI usage data:

```bash
# Run any Claude Code CLI command that makes LLM calls
# For example, use the Council mode to generate multi-provider usage
cd your-workspace
# Make some AI API calls via Claude Code CLI
# Usage will be logged to .specify/logs/council-usage.jsonl
```

Alternatively, create test data manually:

```bash
# Create logs directory
mkdir -p .specify/logs

# Add sample usage log entry
cat >> .specify/logs/council-usage.jsonl << 'EOF'
{"timestamp":"2026-03-13T14:30:00Z","sessionId":"session-001","stage":"research","councilMode":true,"inputTokens":30000,"outputTokens":20000,"estimatedCostUsd":0.39,"providers":{"anthropic":{"tokens":50000,"costUsd":0.39}}}
{"timestamp":"2026-03-13T14:35:00Z","sessionId":"session-001","stage":"specify","councilMode":true,"inputTokens":25000,"outputTokens":15000,"estimatedCostUsd":0.28,"providers":{"openai":{"tokens":40000,"costUsd":0.28}}}
EOF
```

### 3. Open the Panel

1. Open the **Gofer** sidebar in VSCode (icon: lightning bolt)
2. Look for the **AI TOKEN USAGE** section
3. The panel should display:
   - 🔹 Current Session (with cost and provider breakdown)
   - 📅 Today (aggregated daily usage)
   - 📆 This Week (aggregated weekly usage)

## Testing the Feature

### Manual Testing

#### Test 1: View Current Session Usage

1. Open Gofer sidebar
2. Expand **Current Session** item
3. **Expected**: See provider breakdown (Anthropic, OpenAI, Google)
4. Expand a provider
5. **Expected**: See token breakdown (Input Tokens, Output Tokens with costs)

#### Test 2: Real-Time Updates

1. Open Gofer sidebar with AI TOKEN USAGE panel visible
2. Make an AI API call via Claude Code CLI (e.g., run a research command)
3. **Expected**: Panel updates within 1 second showing new cost
4. **Verify**: File watch triggered (not polling) by checking update latency (<500ms)

#### Test 3: Budget Display

1. Set a budget limit in VSCode settings:
   ```json
   {
     "gofer.costBudget.maxCostUsd": 10.00
   }
   ```
2. View Current Session item
3. **Expected**: See budget progress: "$2.45 / $10.00 (24%)"
4. Make enough AI calls to exceed 80% of budget
5. **Expected**: Current Session item turns yellow (warning state)
6. Exceed 100% of budget
7. **Expected**: Current Session item turns red (exceeded state)

#### Test 4: Status Bar Item

1. Check bottom-left status bar in VSCode
2. **Expected**: See "$(dollar) AI: $2.45" (current session cost)
3. Click the status bar item
4. **Expected**: QuickPick opens showing provider breakdown
5. Disable status bar in settings:
   ```json
   {
     "gofer.aiUsage.statusBar.enabled": false
   }
   ```
6. **Expected**: Status bar item disappears

#### Test 5: Time Period Aggregation

1. Generate usage data across multiple days:
   ```bash
   # Add entries from yesterday
   cat >> .specify/logs/council-usage.jsonl << 'EOF'
   {"timestamp":"2026-03-12T10:00:00Z","sessionId":"session-002","stage":"plan","councilMode":true,"inputTokens":15000,"outputTokens":10000,"estimatedCostUsd":0.20,"providers":{"google":{"tokens":25000,"costUsd":0.20}}}
   EOF
   ```
2. Expand **Today** item
3. **Expected**: See only today's usage (not yesterday's)
4. Expand **This Week** item
5. **Expected**: See aggregated usage including yesterday

#### Test 6: Manual Refresh Button (US5)

1. Open Gofer sidebar with AI TOKEN USAGE panel visible
2. Locate the refresh button in the panel toolbar (icon: `$(sync)`)
3. Click the refresh button
4. **Expected**:
   - Loading indicator appears briefly
   - Panel re-renders with latest data
   - Refresh completes within 1 second
5. **Verify**: Check logs for "Force refresh triggered"
6. Close the panel and reopen it
7. **Expected**: Panel displays cached data (no automatic refresh)
8. Click refresh button again
9. **Expected**: Panel updates immediately with fresh data

#### Test 6b: Manual Refresh Command (US5)

1. Open VSCode Command Palette: `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Gofer: Refresh AI Usage"
3. **Expected**: Command appears in palette
4. Press Enter to execute
5. **Expected**:
   - Loading state appears in panel
   - Panel updates within 1 second
   - No error messages in output or console
6. Test that command works even when:
   - Automatic file watcher is disabled
   - Polling is disabled
   - No new usage data has been logged
7. **Expected**: Refresh always works regardless of automatic update settings

#### Test 7: Error Handling

1. Delete council-usage.jsonl:
   ```bash
   rm .specify/logs/council-usage.jsonl
   ```
2. **Expected**: Panel displays "No AI usage data yet"
3. Restore file with malformed JSON:
   ```bash
   echo "{ invalid json }" > .specify/logs/council-usage.jsonl
   ```
4. **Expected**: Panel shows partial data (skips malformed entry)
5. **Verify**: Warning logged: "Failed to parse usage log entry"

### Automated Tests

#### Core Panel Tests

Run the full test suite:

```bash
cd extension
npm test -- aiUsage
```

This runs:
- Unit tests for AIUsageMonitor (`tests/unit/aiUsageMonitor.test.ts`)
- Unit tests for AIUsageProvider (`tests/unit/aiUsageProvider.test.ts`)
- Unit tests for AIUsageStatusBar (`tests/unit/aiUsageStatusBar.test.ts`)
- Integration tests for panel updates (`tests/integration/aiUsagePanel.test.ts`)
- Integration tests for real-time updates (`tests/integration/aiUsageUpdates.test.ts`)

#### Polling Configuration Tests (US5)

Test the polling interval configuration and refresh behavior:

```bash
# Run polling tests specifically
npm test -- aiUsageMonitor.test.ts --testNamePattern="polling"
```

**Test scenarios**:

1. **Default polling interval** (3600 seconds = 1 hour)
   ```bash
   npm test -- aiUsageMonitor.test.ts --testNamePattern="polling.*default.*3600"
   ```
   - Verify polling interval is 3600s (not 5s)
   - Confirm polling timer starts on monitor initialization
   - Verify timer is cleared on monitor disposal

2. **Manual refresh triggers immediate update**
   ```bash
   npm test -- aiUsageMonitor.test.ts --testNamePattern="refresh.*manual.*immediate"
   ```
   - Verify `refreshUsage()` loads data immediately
   - Verify it doesn't wait for next polling interval
   - Confirm works even when polling is disabled

3. **FileSystemWatcher takes precedence**
   ```bash
   npm test -- aiUsageMonitor.test.ts --testNamePattern="watcher.*precedence"
   ```
   - Verify FileSystemWatcher events trigger immediate updates
   - Confirm polling fallback is used only if watcher fails
   - Verify hybrid mechanism (watcher + polling fallback)

4. **Manual refresh command execution**
   ```bash
   npm test -- tests/unit/commands.test.ts --testNamePattern="refreshAIUsage"
   ```
   - Test command registration in package.json
   - Verify command calls `AIUsageMonitor.refreshUsage()`
   - Confirm command appears in command palette
   - Test that command works from toolbar button

5. **No memory leaks from polling**
   ```bash
   npm test -- aiUsagePanel.test.ts --testNamePattern="memory.*leak.*polling"
   ```
   - Verify polling timer is cleared on dispose
   - Confirm no timer accumulation after multiple reinitializations
   - Check that watcher cleanup prevents handle leaks

**Expected output**:
```
✓ AIUsageMonitor: aggregates usage by time period
✓ AIUsageMonitor: emits usage-update events on file change
✓ AIUsageMonitor: falls back to polling when file watch fails
✓ AIUsageProvider: builds correct tree hierarchy
✓ AIUsageProvider: formats labels and icons correctly
✓ AIUsageStatusBar: updates display on usage change
✓ Integration: panel updates within 1s of log file change
✓ Integration: no memory leaks after dispose

PASS  tests/unit/aiUsageMonitor.test.ts
PASS  tests/unit/aiUsageProvider.test.ts
PASS  tests/unit/aiUsageStatusBar.test.ts
PASS  tests/integration/aiUsagePanel.test.ts
PASS  tests/integration/aiUsageUpdates.test.ts

Test Suites: 5 passed, 5 total
Tests:       42 passed, 42 total
Coverage:    87.5% (exceeds 80% minimum)
```

### Performance Testing

#### Test Update Latency

```bash
# Run latency test
npm test -- aiUsageUpdates.test.ts --testNamePattern="measures update latency"
```

**Expected**:
- File watch latency: <500ms (p95)
- Polling latency: ≤5000ms
- Tree rendering: <100ms

#### Test Memory Leaks

```bash
# Run memory leak test (runs for 5 minutes with repeated reinitializations)
npm test -- aiUsagePanel.test.ts --testNamePattern="no memory leaks"
```

**Expected**:
- Timer count stable (no accumulation)
- Watcher count stable (no accumulation)
- Memory usage stable (<10MB increase over 5 minutes)

## Key Files

| File | Purpose |
|------|---------|
| `extension/src/aiUsageProvider.ts` | TreeDataProvider for panel display |
| `extension/src/autonomous/AIUsageMonitor.ts` | Service for usage aggregation and events |
| `extension/src/ui/AIUsageStatusBar.ts` | Optional status bar item |
| `extension/package.json` | View registration (line ~284-290) |
| `extension/src/extension.ts` | Extension activation and wiring |
| `.specify/logs/council-usage.jsonl` | Usage log file (data source) |
| `.specify/hooks/context-bridge.json` | Session metadata (for "Current Session") |

## Common Issues

### Issue 1: Panel Not Visible

**Problem**: AI TOKEN USAGE section does not appear in Gofer sidebar

**Solution**:
1. Check extension is activated:
   ```bash
   # Open VSCode Developer Tools (Help > Toggle Developer Tools)
   # Look for: "[Gofer] Extension activated"
   ```
2. Verify package.json registration:
   ```json
   {
     "contributes": {
       "views": {
         "gofer": [
           {
             "id": "goferAIUsage",
             "name": "AI Token Usage"
           }
         ]
       }
     }
   }
   ```
3. Restart VSCode: `Cmd+Shift+P` → "Reload Window"

### Issue 2: Panel Shows "No AI usage data yet"

**Problem**: Panel is visible but shows no data

**Diagnosis**:
1. Check if usage log exists:
   ```bash
   ls -la .specify/logs/council-usage.jsonl
   ```
2. Check if log has content:
   ```bash
   cat .specify/logs/council-usage.jsonl
   ```
3. Check if log is valid JSON:
   ```bash
   cat .specify/logs/council-usage.jsonl | jq
   ```

**Solution**:
- If missing: Make AI API calls to generate usage data
- If empty: Same as above
- If invalid JSON: Fix JSON format or delete file and regenerate

### Issue 3: Panel Does Not Update Automatically (Polling/Watcher)

**Problem**: Panel does not update after making AI API calls; relies on manual refresh

**Diagnosis**:
1. Check if file watcher is active:
   ```bash
   # Developer Tools Console (Help > Toggle Developer Tools)
   # Look for log: "[AIUsageMonitor] FileSystemWatcher started"
   ```
2. Check if polling is active:
   ```bash
   # Look for log: "[AIUsageMonitor] Polling started (interval: 3600s)"
   ```
3. Check for watcher errors:
   ```bash
   # Look for logs: "[AIUsageMonitor] FileSystemWatcher error:" or "Watcher failed to start"
   ```

**Solution**:
- If file watcher failed: Automatic polling (every 1 hour) is fallback
- If you need more frequent updates while watcher is down:
  - Use manual refresh button in panel toolbar
  - Use "Gofer: Refresh AI Usage" command from palette
- If both file watcher AND polling failed: Check extension logs for errors (likely file system permission issue)
- Note: Polling interval changed from 5s to 3600s (1 hour) in v1.25.0 for resource efficiency

#### Workaround: Increase Polling Frequency (temporary)

If file watcher is unavailable and you need updates more frequently than hourly:

1. Create test configuration:
   ```json
   {
     "gofer.aiUsage.pollingIntervalSeconds": 60
   }
   ```
   This increases polling to every 60 seconds instead of 3600 seconds (1 hour)

2. Use manual refresh button for immediate updates:
   - Click refresh button in AI TOKEN USAGE panel toolbar
   - Or run "Gofer: Refresh AI Usage" command

### Issue 4: Refresh Button Not Appearing in Panel (US5)

**Problem**: Refresh button (sync icon) does not appear in AI TOKEN USAGE panel toolbar

**Diagnosis**:
1. Check if panel is visible:
   - Open Gofer sidebar (lightning bolt icon)
   - Locate "AI Token Usage" section
   - Hover over panel title to see toolbar

2. Verify toolbar button contribution in package.json:
   ```bash
   grep -A 5 "goferAIUsage" extension/package.json | grep -A 3 "toolbar"
   ```
   Should show:
   ```json
   {
     "command": "gofer.refreshAIUsage",
     "group": "navigation",
     "when": "view == goferAIUsage"
   }
   ```

**Solution**:
- If toolbar button is missing: Check that `extension/package.json` includes the toolbar contribution
- If button is hidden: Verify that `gofer.refreshAIUsage` command is registered (not a packaging issue)
- Restart VSCode: `Cmd+Shift+P` → "Reload Window" to re-register contributions
- Alternative: Use command palette instead:
  - `Cmd+Shift+P` → "Gofer: Refresh AI Usage"

**Note**: Refresh button was added in feature US5 (v1.25.0+). If you're on an older version, upgrade the extension.

### Issue 5: Manual Refresh Not Working or Too Slow (US5)

**Problem**: Clicking refresh button or running "Gofer: Refresh AI Usage" command does not update panel, or takes >1 second

**Diagnosis**:
1. Check if refresh command is registered:
   ```bash
   # Developer Tools Console
   # Try running: vscode.commands.executeCommand('gofer.refreshAIUsage')
   ```
   Should complete without errors

2. Check if usage log file exists and is readable:
   ```bash
   ls -lh .specify/logs/council-usage.jsonl
   ```

3. Check for file access errors in logs:
   ```bash
   # Developer Tools > Console > Filter: "[AIUsageMonitor]"
   # Look for: "Error reading usage log" or permission errors
   ```

4. Measure refresh latency:
   ```bash
   # Add timestamp before refresh, check panel update time
   # Target: <1 second from click to panel update
   ```

**Solution**:
- If command not registered: Reload window (`Cmd+Shift+P` → "Reload Window")
- If file access denied: Check file permissions
  ```bash
  chmod 644 .specify/logs/council-usage.jsonl
  ```
- If refresh is slow (>1s):
  - Check if council-usage.jsonl is large (>10MB can slow parsing)
  - Check CPU/disk usage in VSCode (system resource contention)
  - Try manual refresh again (first refresh after startup may be slower)

**Performance baseline**:
- Target: <1 second from user action to panel update
- File read + JSON parse + tree render should complete in <500ms
- If consistently >1s, check for file system issues or large log files

### Issue 6: Panel Shows Stale Data (Not Updating from Polling)

**Problem**: Panel shows old cost data even after waiting for 1 hour; manual refresh shows new data

**Diagnosis**:
1. Verify polling is active:
   ```bash
   # Check extension output for periodic "Polling refresh triggered" logs
   # Polling should fire every 3600 seconds (1 hour)
   ```

2. Check if polling timer is accumulating:
   ```javascript
   // In Developer Tools Console
   console.log(process._getActiveHandles().length);
   ```
   Should stay stable (not growing with each poll)

3. Verify usage log has new entries:
   ```bash
   tail -f .specify/logs/council-usage.jsonl
   # Make an AI API call, check if new line appears
   ```

**Solution**:
- This is expected behavior: Polling updates hourly, not in real-time
- For real-time updates:
  - FileSystemWatcher monitors log file and triggers immediate updates
  - If watcher fails, polling is fallback (~1 hour latency)
- For immediate data: Click refresh button or use "Gofer: Refresh AI Usage" command
- Check if FileSystemWatcher is active (check logs for "FileSystemWatcher started")

**Note**: Polling interval was changed from 5s to 3600s (1 hour) in v1.25.0 to reduce CPU/disk overhead. Use manual refresh for immediate updates.

### Issue 7: Memory Leak After Extended Use

**Problem**: VSCode becomes slow after Gofer runs for hours; polling timer accumulates

**Diagnosis**:
1. Check timer count:
   ```javascript
   // In Developer Tools Console
   console.log(process._getActiveHandles().length);
   ```
   Should stay stable. If growing: memory leak likely

2. Check polling timer cleanup:
   ```bash
   # Look for logs showing: "[AIUsageMonitor] Polling stopped"
   # Should appear when monitor is disposed or panel is closed
   ```

3. Check watcher cleanup:
   ```bash
   # Verify FileSystemWatcher is disposed on reinitialize
   # Look for: "[AIUsageMonitor] FileSystemWatcher disposed"
   ```

**Solution**:
- Reload window: `Cmd+Shift+P` → "Reload Window"
- Check that `AIUsageMonitor.dispose()` is called:
  - On extension deactivation
  - On `reinitializeExtension()` (clears old monitor before creating new one)
  - On panel close

- If timers accumulate (memory leak): Report bug with these details:
  - Number of active handles before and after panel close
  - How many times you've opened/closed the panel
  - VSCode uptime

**Prevention**: Extension should properly dispose polling timer and FileSystemWatcher (checked in tests: "no memory leaks after dispose")

## Troubleshooting Commands

### General Diagnostics

```bash
# Check extension logs
# VSCode Developer Tools > Console > Filter: "[Gofer]"

# Check usage log content
cat .specify/logs/council-usage.jsonl | jq

# Check session metadata
cat .specify/hooks/context-bridge.json | jq

# Reset all usage data (start fresh)
rm .specify/logs/council-usage.jsonl
rm .specify/hooks/context-bridge.json
# Restart extension
```

### Refresh & Polling Diagnostics (US5)

```bash
# Force refresh panel (from VSCode Command Palette)
Cmd+Shift+P > "Gofer: Refresh AI Usage"

# Check if refresh command is available
Cmd+Shift+P > type "refresh" (should show "Gofer: Refresh AI Usage")

# Monitor polling activity
# Developer Tools > Console
# Look for: "[AIUsageMonitor] Polling refresh triggered" (every 3600s)

# Monitor FileSystemWatcher activity
# Look for: "[AIUsageMonitor] FileSystemWatcher detected change"
# Should appear immediately when council-usage.jsonl is modified

# Test refresh latency (manual)
# 1. Note current time
# 2. Click refresh button in panel
# 3. Measure time until panel updates
# Should be <1 second

# Verify polling interval (should be 3600s in v1.25.0+)
# Search logs for: "Polling started (interval: 3600"
# Previous versions used: "interval: 5" (5 seconds)

# Check if timer is accumulating (memory leak)
# Run in Developer Tools Console:
console.log('Active handles:', process._getActiveHandles().length);
// First check: note the number
// Wait 5 minutes
// Second check: number should be same (not growing)
```

### Polling Configuration (if needed for testing)

```bash
# Temporarily increase polling frequency for development/testing
# (default is 3600s = 1 hour)
# Add to .vscode/settings.json:
{
  "gofer.aiUsage.pollingIntervalSeconds": 60  // Test with 60s instead of 3600s
}

# Verify configuration is loaded
# Developer Tools Console: vscode.workspace.getConfiguration('gofer')
```

## Next Steps

After verifying the panel works:

1. **Customize settings**: Adjust status bar alignment, enable/disable features
2. **Set budget limits**: Configure `gofer.costBudget.maxCostUsd` to match your budget
3. **Monitor usage**: Use panel regularly to track AI spending during development
4. **Report issues**: If you encounter bugs, check `.specify/logs/` for error logs

## Development Workflow

For developers working on this feature:

```bash
# 1. Install dependencies
cd extension
npm install

# 2. Compile TypeScript
npm run compile

# 3. Run tests
npm test

# 4. Watch mode (auto-compile on changes)
npm run watch

# 5. Debug in VSCode
# Press F5 to launch Extension Development Host
# Open test workspace with .specify/ directory
# Verify panel appears and updates

# 6. Package extension (for testing in production)
npm run package
# Installs as gofer-X.Y.Z.vsix
```

## Reference

- **Spec**: `.specify/specs/025-ai-usage-tracking/spec.md`
- **Plan**: `.specify/specs/025-ai-usage-tracking/plan.md`
- **Data Model**: `.specify/specs/025-ai-usage-tracking/data-model.md`
- **API Contracts**: `.specify/specs/025-ai-usage-tracking/contracts/internal-api.md`
