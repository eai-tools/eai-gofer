# AI Usage Panel Fix Summary

## Problem

The AI Usage Panel was showing $0.00 despite council-usage.jsonl containing $16.69 in usage data.

## Root Cause

The issue was that if `initializeForWorkspace()` failed at ANY point before the AI Usage Monitor section, the monitor would never be created and `setMonitor()` would never be called on AIUsageProvider. Without a monitor, the provider returns empty data (showing as $0).

## Data Flow (Normal Operation)

```
1. council-usage.jsonl (17 entries, $16.69 total)
   ↓
2. UsageLogger.getUsageSummary() reads file
   ↓
3. AIUsageMonitor.fetchUsageData() calls UsageLogger
   ↓
4. AIUsageMonitor.mapSummaryToUsageData() converts to AIUsageData
   ↓
5. AIUsageMonitor emits 'usage-update' event
   ↓
6. AIUsageProvider receives event and stores in latestData
   ↓
7. AIUsageProvider.getChildren() creates tree items
   ↓
8. TreeView displays: "Current Session $16.69"
```

## Files Modified

### 1. extension/src/extension.ts

**Line 543-648**: Wrapped AIUsageMonitor initialization in try-catch block

- **Before**: Any failure in earlier initialization steps would prevent AIUsageMonitor from being created
- **After**: AIUsageMonitor initialization is isolated and will succeed even if other components fail
- **Added**: Error message to user if initialization fails
- **Added**: Detailed logging to track initialization progress

```typescript
try {
  // Create UsageLogger data source
  // Create AIUsageMonitor
  // Wire to AIUsageProvider via setMonitor()
  // Start monitoring
  logger?.info('Extension', 'AIUsageMonitor wired and started successfully');
} catch (error) {
  logger?.error('Extension', err, {
    message: '[AIUsage] CRITICAL: Failed to initialize AIUsageMonitor',
  });
  vscode.window.showErrorMessage(
    `Gofer: AI Usage Panel initialization failed. Check Output > Gofer for details.`
  );
}
```

### 2. extension/src/ui/AIUsageProvider.ts

**Line 204-234**: Added comprehensive logging to getPeriodItems()

- **Added**: Log when getPeriodItems() is called with current state
- **Added**: CRITICAL error log if monitor is not set
- **Added**: Log when fetching from monitor
- **Added**: Log data received from monitor
- **Added**: Log final items being created

**Line 95-108**: Added logging to setMonitor()

- **Added**: Log when monitor is connected
- **Added**: Log when usage-update events are received with full details

```typescript
this.logger.info('[setMonitor.onUpdate] Received usage-update event:', {
  trigger: event.trigger,
  periodCount: event.periods.length,
  totalCosts: event.periods.map(p => `${p.period}: $${p.totalCostUsd.toFixed(2)}`),
});
```

### 3. extension/src/autonomous/UsageAdapterFactory.ts

**Line 125**: Fixed TypeScript compilation error

- **Before**: `config.get<'claude' | 'codex' | 'auto'>('cliProvider', 'auto')`
- **After**: `config.get('cliProvider', 'auto') as 'claude' | 'codex' | 'auto'`
- **Reason**: TypeScript can't infer type on dynamically required vscode module

## Testing

### Manual Test (Integration)

```bash
cd /Users/douglaswross/Code/gofer
node test-ai-usage-flow.cjs
```

**Result**:
```
✓ SUCCESS: Data flow is working correctly
  Panel should show: $16.69
```

This test verifies:
1. UsageLogger correctly reads council-usage.jsonl
2. mapSummaryToUsageData correctly converts the summary
3. Final output matches expected cost

### How to Verify in VSCode

1. **Reload Window**: Press F1 → "Developer: Reload Window"
2. **Check Logs**: View → Output → Select "Gofer" from dropdown
3. **Look for Success**: Should see:
   ```
   [AIUsage] useApiClient = false (false = UsageLogger, true = UsageApiClient)
   [AIUsage] setMonitor() called on AIUsageProvider
   AIUsageMonitor wired and started successfully
   ```
4. **Check Panel**: Sidebar → Gofer → AI Usage should show:
   ```
   Current Session: $16.69
   Today: $X.XX
   This Week: $X.XX
   ```

### If Panel Still Shows $0

Check the logs for:

1. **Monitor not set**:
   ```
   [getPeriodItems] CRITICAL: No monitor set! Extension initialization may have failed.
   ```
   → Check for "Workspace initialization failed" earlier in logs

2. **Monitor initialization failed**:
   ```
   [AIUsage] CRITICAL: Failed to initialize AIUsageMonitor
   ```
   → Check the error details in the log

3. **Monitor set but no data**:
   ```
   [setMonitor.onUpdate] Received usage-update event: { totalCosts: [...] }
   [getPeriodItems] Creating items from data: { totalCosts: [...] }
   ```
   → If these show $0.00, the data source (UsageLogger) is returning empty summaries

## Configuration

Ensure `.vscode/settings.json` has:

```json
{
  "gofer.aiUsage.useApiClient": false
}
```

- `false` = Use UsageLogger (reads council-usage.jsonl) ← DEFAULT
- `true` = Use UsageApiClient (calls provider billing APIs)

## Data Source

The panel reads from:
```
/Users/douglaswross/Code/gofer/.specify/logs/council-usage.jsonl
```

Current state:
- **17 entries**
- **Total cost**: $16.69
- **Date range**: 2026-03-09 to 2026-03-16

## Next Steps

If the panel still shows $0 after these changes:

1. Check the Gofer output logs for the new logging messages
2. Verify council-usage.jsonl exists and has data (confirmed)
3. Check if initializeForWorkspace() is completing successfully
4. Verify setMonitor() is being called on AIUsageProvider
5. Check if usage-update events are being received

The comprehensive logging added will show exactly where the flow breaks down.
