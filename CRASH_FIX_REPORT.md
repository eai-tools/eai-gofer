# VSCode Crash Investigation Report

**Date:** 2026-02-24 **Issue:** Multiple VSCode instances crashing
simultaneously **Root Cause:** Critical memory leaks in Gofer extension v1.12.2
**Status:** FIXED in pending v1.12.3

---

## Summary

The Gofer extension contained two critical memory leaks that caused resource
exhaustion when running multiple VSCode instances. These leaks accumulated with
every workspace change or extension reload, creating dozens of file watchers and
timers that eventually crashed all instances.

---

## Root Causes

### 1. Duplicate Workspace Event Listeners

**Location:** `extension/src/extension.ts` lines 155-157 and 167-169

**Problem:**

- The `onDidChangeWorkspaceFolders` event listener was registered **twice** in
  the `activate()` function
- These listeners were never properly disposed, so they accumulated on every
  extension reload
- Each listener triggered `reinitializeExtension()`, compounding the problem

**Code:**

```typescript
// First registration (line 155-157)
vscode.workspace.onDidChangeWorkspaceFolders(async () => {
  await reinitializeExtension(context);
});

// Second registration (line 167-169) - DUPLICATE!
vscode.workspace.onDidChangeWorkspaceFolders(async () => {
  await reinitializeExtension(context);
});
```

### 2. Missing Resource Cleanup on Reinitialization

**Location:** `extension/src/extension.ts` `reinitializeExtension()` function

**Problem:**

- When workspace folders changed, `reinitializeExtension()` created NEW
  instances of:
  - `HookBridgeWatcher` (with 60-second `setInterval` timer)
  - `MultiSessionBridgeWatcher` (with 60-second `setInterval` timer)
  - Multiple file watchers via `vscode.workspace.createFileSystemWatcher()`
  - Dozens of event listeners (via `.on()` calls)
- **WITHOUT disposing the old ones first**

**Impact:**

```
5 VSCode instances × 10 workspace changes each = 50 parallel watchers
Each watcher = 1 file watcher + 1 timer + 5-10 event listeners
Total: ~50 timers + ~250 event listeners + ~50 file watchers
Result: System resource exhaustion → VSCode crashes
```

---

## The Fix

### Changes Made to `extension/src/extension.ts`

#### 1. Single Workspace Listener with Proper Disposal

```typescript
// Listen for workspace changes to reinitialize (SINGLE listener, properly disposed)
context.subscriptions.push(
  vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    console.log('[Gofer] Workspace folders changed, reinitializing...');
    await reinitializeExtension(context);
  })
);
```

**Benefits:**

- Only ONE listener registered
- Automatically disposed when extension deactivates
- No accumulation on extension reload

#### 2. Comprehensive Resource Cleanup

```typescript
async function reinitializeExtension(context: vscode.ExtensionContext) {
  // Prevent concurrent reinitializations
  if (isReinitializing) {
    console.log('[Gofer] Reinitialization already in progress, skipping...');
    return;
  }

  isReinitializing = true;
  try {
    // CRITICAL: Dispose all watchers and timers BEFORE reinitializing
    console.log('[Gofer] Cleaning up before reinitialization...');

    // Dispose watchers and their timers
    if (multiSessionWatcher) {
      multiSessionWatcher.dispose();
      multiSessionWatcher = undefined;
    }
    if (hookBridgeWatcher) {
      hookBridgeWatcher.dispose();
      hookBridgeWatcher = undefined;
    }
    if (contextHealthMonitor) {
      contextHealthMonitor.dispose();
      contextHealthMonitor = undefined;
    }
    if (contextScanner) {
      contextScanner = undefined;
    }
    if (goferActivityStatusBar) {
      goferActivityStatusBar.dispose();
      goferActivityStatusBar = undefined;
    }

    // Clear timers
    if (consolidationTimerRef) {
      clearInterval(consolidationTimerRef);
      consolidationTimerRef = null;
    }
    if (cacheSaveTimerRef) {
      clearTimeout(cacheSaveTimerRef);
      cacheSaveTimerRef = null;
    }

    console.log('[Gofer] Cleanup complete');

    // ... rest of reinitialization
  } finally {
    isReinitializing = false;
  }
}
```

**Benefits:**

- All watchers disposed before creating new ones
- All timers cleared before creating new ones
- Guard flag prevents concurrent reinitializations
- Proper try-finally ensures flag is always reset

---

## Verification

### Before Fix

```bash
$ ps aux | grep "[C]ode Helper" | wc -l
18 processes

$ lsof | grep gofer | wc -l
~150+ file handles (accumulating)
```

### After Fix

```bash
$ npm run compile
✓ Compilation successful (4.9s)
✓ Only 1 pre-existing warning (unrelated)

Expected after deployment:
- Stable process count
- No accumulating file handles
- No VSCode crashes
```

---

## Deployment Instructions

### For Immediate Relief (Current Instances)

1. **Close all VSCode instances**
2. **Kill any orphaned processes:**
   ```bash
   pkill -f "Code Helper.*gofer"
   pkill -f "Code Helper.*Plugin"
   ```
3. **Clear extension cache:**
   ```bash
   rm -rf ~/Library/Application\ Support/Code/Cache/*
   rm -rf ~/Library/Application\ Support/Code/CachedExtensions/*
   ```

### For Permanent Fix

1. **Build new version:**

   ```bash
   cd /Users/douglaswross/Code/gofer
   ./release-auto.sh patch "Fix critical memory leaks causing VSCode crashes"
   ```

2. **Install updated extension:**
   - Extension will auto-update via GitHub Pages
   - Or manually install the new VSIX from `docs/releases/`

---

## Prevention

### Code Review Checklist

- [ ] All `onDidChange*` listeners are added to `context.subscriptions`
- [ ] All file watchers are disposed before creating new ones
- [ ] All `setInterval`/`setTimeout` timers are cleared before creating new ones
- [ ] All event listeners (`.on()`) are properly cleaned up
- [ ] Guard flags prevent concurrent operations

### Monitoring

Watch for these warning signs:

- Increasing "Code Helper" process count over time
- Increasing file handle count (`lsof | grep gofer | wc -l`)
- Memory usage growing over time
- Multiple console messages: "Reinitialization already in progress"

---

## Related Files

- `extension/src/extension.ts` (main changes)
- `extension/src/autonomous/HookBridgeWatcher.ts` (has dispose method)
- `extension/src/autonomous/MultiSessionBridgeWatcher.ts` (has dispose method)
- `.claude/memory/MEMORY.md` (updated with this learning)

---

## Conclusion

This was a classic **resource leak** pattern that's easy to miss in development
but catastrophic in production with multiple instances. The fix ensures proper
resource lifecycle management and prevents accumulation.

**Key Takeaway:** Always dispose old resources before creating new ones,
especially in reinitialize/reload scenarios.
