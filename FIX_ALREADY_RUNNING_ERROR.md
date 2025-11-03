# Fix: "Autonomous execution is already running" Error

## Problem

When clicking the play button, you get:

```
Autonomous execution is already running. Stop current execution first?
```

But the process isn't actually running - the VSCode extension just has a stale
state in memory.

## Solution

### Option 1: Use Force Reset Command (NEW - Recommended)

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `SpecGofer: Force Reset Autonomous State`
3. Click "Reset" when prompted
4. Try clicking play again

### Option 2: Stop and Restart

1. Press `Cmd+Shift+P`
2. Type: `SpecGofer: Stop Autonomous Execution`
3. Wait for confirmation
4. Try clicking play again

### Option 3: Reload VS Code Window

1. Press `Cmd+Shift+P`
2. Type: `Developer: Reload Window`
3. Wait for VS Code to reload
4. Try clicking play again

## What Was Fixed

Added a new command `forceResetAutonomousState()` that clears the internal
driver state without trying to stop a process that may not exist.

### Code Changes

**File**: `extension/src/autonomousCommands.ts`

```typescript
/**
 * Force reset autonomous state (for when the driver is stuck)
 */
export async function forceResetAutonomousState(): Promise<void> {
  if (!activeDriver) {
    vscode.window.showInformationMessage(
      'No autonomous execution state to reset'
    );
    return;
  }

  const response = await vscode.window.showWarningMessage(
    'Force reset autonomous state? This will clear the driver without proper cleanup.',
    'Reset',
    'Cancel'
  );

  if (response === 'Reset') {
    activeDriver = null;
    vscode.window.showInformationMessage('🔄 Autonomous state reset');
    outputChannel?.appendLine(
      `[${new Date().toISOString()}] Force reset - state cleared`
    );
  }
}
```

**File**: `extension/src/extension.ts`

Registered the command:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'specGofer.forceResetAutonomous',
    async () => {
      const { forceResetAutonomousState } = await import(
        './autonomousCommands'
      );
      await forceResetAutonomousState();
    }
  )
);
```

## How to Use the Fixed Extension

1. **Reload the extension**:
   - The extension was just recompiled
   - Press `Cmd+Shift+P` → `Developer: Reload Window`

2. **If you still get the error**:
   - Press `Cmd+Shift+P`
   - Type: `SpecGofer: Force Reset`
   - Select the command
   - Click "Reset"

3. **Now try the play button**:
   - Should work without the error!

## Why This Happens

The VSCode extension keeps a singleton `activeDriver` variable in memory. If the
process crashes, stops unexpectedly, or encounters an error, this variable stays
set even though no actual process is running.

The force reset command simply clears this variable, allowing you to start a new
execution.

## Testing

After reloading VS Code, try:

1. Click play on any spec
2. If you get the error, use `Force Reset Autonomous State`
3. Click play again - should work!

## Need More Help?

If the error persists after force reset:

1. Check VS Code Developer Console: `Help` → `Toggle Developer Tools`
2. Look for errors in the Console tab
3. Check the SpecGofer output channel: `View` → `Output` → Select "SpecGofer"

---

**Status**: ✅ Fixed and compiled  
**Extension version**: 3.0.17  
**Build time**: Just now
