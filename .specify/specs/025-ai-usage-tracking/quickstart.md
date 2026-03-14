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

#### Test 6: Refresh Button

1. Open panel
2. Click refresh button in panel toolbar (icon: refresh)
3. **Expected**: Panel re-renders with latest data
4. **Verify**: Monitor logged "Force refresh triggered"

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

### Issue 3: Panel Does Not Update in Real-Time

**Problem**: Panel does not update after making AI API calls

**Diagnosis**:
1. Check if file watcher is active:
   ```bash
   # Look for log: "[AIUsageMonitor] FileSystemWatcher started"
   ```
2. Check if polling is working:
   ```bash
   # Look for log: "[AIUsageMonitor] Polling refresh triggered"
   ```

**Solution**:
- If file watcher failed: Polling (5s) should continue as fallback
- If both failed: Check extension logs for errors
- Manual refresh: Click refresh button in panel toolbar

### Issue 4: Status Bar Not Visible

**Problem**: Status bar item does not appear

**Diagnosis**:
1. Check configuration:
   ```json
   {
     "gofer.aiUsage.statusBar.enabled": true
   }
   ```
2. Check if cost is > 0 (status bar hides when cost is $0.00)

**Solution**:
- Enable in settings if disabled
- Generate usage data if cost is zero

### Issue 5: Incorrect Cost Calculations

**Problem**: Costs do not match actual provider bills

**Diagnosis**:
1. Check pricing data in code:
   ```typescript
   // extension/src/autonomous/CostBudgetEnforcer.ts
   export const COST_PER_1K_TOKENS = {
     anthropic: { input: 0.003, output: 0.015 },
     openai: { input: 0.005, output: 0.015 },
     google: { input: 0.00025, output: 0.0005 },
   };
   ```
2. Compare against current provider rates (as of March 2026)

**Solution**:
- If rates changed: Update pricing constants
- If rates are outdated (>90 days): Warning should be logged

### Issue 6: Memory Leak After Extended Use

**Problem**: VSCode becomes slow after Gofer runs for hours

**Diagnosis**:
1. Check timer count:
   ```javascript
   // In Developer Tools Console
   console.log(process._getActiveHandles().length);
   ```
2. Check watcher count (should be stable)

**Solution**:
- Reload window: `Cmd+Shift+P` → "Reload Window"
- Report bug if timers accumulate (should be fixed in code)

## Troubleshooting Commands

```bash
# Check extension logs
# VSCode Developer Tools > Console > Filter: "[Gofer]"

# Check usage log content
cat .specify/logs/council-usage.jsonl | jq

# Check session metadata
cat .specify/hooks/context-bridge.json | jq

# Force refresh panel (from VSCode Command Palette)
# Cmd+Shift+P > "Gofer: Refresh AI Usage"

# Reset all usage data (start fresh)
rm .specify/logs/council-usage.jsonl
rm .specify/hooks/context-bridge.json
# Restart extension
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
