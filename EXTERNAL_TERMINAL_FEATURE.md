# External Terminal Launch & Dynamic Play/Stop Button

## Overview

Implemented external macOS Terminal launch for autonomous execution with dynamic
play/stop button UI that switches based on execution state.

## Changes Made

### 1. External Terminal Launch

**File**: `extension/src/autonomousCommands.ts`

Added `launchExternalTerminal()` function that:

- Uses AppleScript via `osascript` to open macOS Terminal
- Navigates to workspace directory
- Executes `npm start` command
- Tracks external terminal state
- Sets VSCode context key for UI updates

```typescript
async function launchExternalTerminal(
  workspacePath: string,
  spec: any
): Promise<void> {
  const { spawn } = await import('child_process');
  const script = `tell application "Terminal"\n    activate\n    do script "cd '${workspacePath}' && npm start"\nend tell`;

  return new Promise((resolve, reject) => {
    const osascript = spawn('osascript', ['-e', script]);
    osascript.on('close', (code) => {
      if (code === 0) {
        externalTerminalProcess = { active: true, spec: spec.id };
        resolve();
      } else {
        reject(new Error(`AppleScript failed with code ${code}`));
      }
    });
  });
}
```

### 2. Context Key Management

**Context Key**: `specGoferAutonomousRunning`

Updated all execution control functions to manage this context key:

**Start Execution** (`startAutonomousExecution`):

- Sets context to `true` after launching external terminal
- Sets context to `false` on error

**Stop Execution** (`stopAutonomousExecution`):

- Offers "Mark as Stopped" button for external terminal
- Sets context to `false` when internal driver stops
- Sets context to `false` when user marks external terminal as stopped

**Force Reset** (`forceResetAutonomousState`):

- Sets context to `false` when user confirms reset

### 3. Dynamic Button UI

**File**: `extension/package.json`

Updated menu contributions with conditional `when` clauses:

```json
{
  "command": "specGofer.startAutonomous",
  "when": "viewItem == spec && !specGoferAutonomousRunning",
  "group": "inline@1"
},
{
  "command": "specGofer.stopAutonomous",
  "when": "viewItem == spec && specGoferAutonomousRunning",
  "group": "inline@1"
}
```

**Result**: Play button (▶️) shows when not running, Stop button (⏹️) shows when
running.

## User Experience

### Starting Autonomous Execution

1. User clicks **Play button** (▶️) on a spec in the tree view
2. External macOS Terminal window opens and activates
3. Terminal runs `npm start` in the workspace directory
4. Play button changes to **Stop button** (⏹️)
5. User can see Claude Code working in the Terminal window
6. User can directly kill the Terminal window (Cmd+W or Ctrl+C)

### Stopping Autonomous Execution

**Option 1: Close Terminal Directly**

- User closes the Terminal window or presses Ctrl+C
- User clicks Stop button in VSCode
- Prompted to "Mark as Stopped" to update UI state

**Option 2: Stop via VSCode**

- User clicks Stop button
- Prompted with instructions to close external Terminal
- Can click "Mark as Stopped" to clear UI state

**Option 3: Force Reset (if stuck)**

- User runs command: `SpecGofer: Force Reset Autonomous State`
- Clears internal state and UI context
- Useful when Terminal was closed unexpectedly

## Technical Details

### Context Key Usage

VSCode context keys enable conditional UI rendering:

```typescript
// Set running state
await vscode.commands.executeCommand(
  'setContext',
  'specGoferAutonomousRunning',
  true
);

// Clear running state
await vscode.commands.executeCommand(
  'setContext',
  'specGoferAutonomousRunning',
  false
);
```

The `when` clause in `package.json` controls button visibility:

- `!specGoferAutonomousRunning` - Show play button when NOT running
- `specGoferAutonomousRunning` - Show stop button when running

### Process Tracking

```typescript
interface ExternalTerminalProcess {
  active: boolean;
  spec: string;
}

let externalTerminalProcess: ExternalTerminalProcess | null = null;
```

Tracks which spec is running in external terminal, allowing:

- Prevention of multiple concurrent executions
- Proper state management
- UI context updates

### AppleScript Integration

Uses macOS `osascript` command to control Terminal:

```applescript
tell application "Terminal"
    activate
    do script "cd '/path/to/workspace' && npm start"
end tell
```

Benefits:

- Native macOS Terminal experience
- Independent window user can monitor
- Direct process control (Ctrl+C, Cmd+W)
- Better visibility than VSCode integrated terminal

## Files Modified

1. `extension/src/autonomousCommands.ts`
   - Added `launchExternalTerminal()` function
   - Updated `startAutonomousExecution()` to use external terminal
   - Updated `stopAutonomousExecution()` with "Mark as Stopped" option
   - Updated `forceResetAutonomousState()` to clear context
   - Added context key management throughout

2. `extension/package.json`
   - Added conditional `when` clauses to menu contributions
   - Enabled dynamic play/stop button switching

## Testing Steps

### Manual Testing Checklist

1. **Play Button Visibility**
   - [ ] Open VSCode with SpecGofer extension
   - [ ] Expand Specifications tree view
   - [ ] Verify Play button (▶️) visible on each spec
   - [ ] Verify Stop button NOT visible initially

2. **External Terminal Launch**
   - [ ] Click Play button on a spec
   - [ ] Verify macOS Terminal window opens and activates
   - [ ] Verify Terminal shows `npm start` running
   - [ ] Verify Terminal output shows autonomous execution logs

3. **Button State Change**
   - [ ] After clicking Play, verify button changes to Stop (⏹️)
   - [ ] Verify Play button no longer visible for that spec
   - [ ] Verify only one button visible at a time

4. **Stop Functionality**
   - [ ] Click Stop button while Terminal is running
   - [ ] Verify message about closing external Terminal
   - [ ] Click "Mark as Stopped" button
   - [ ] Verify button changes back to Play
   - [ ] Verify Terminal can still run (not killed by VSCode)

5. **Direct Terminal Close**
   - [ ] Click Play to start execution
   - [ ] Close Terminal window (Cmd+W) or Ctrl+C in Terminal
   - [ ] Click Stop button in VSCode
   - [ ] Click "Mark as Stopped" to sync UI state
   - [ ] Verify Play button returns

6. **Force Reset**
   - [ ] Start execution, close Terminal without marking stopped
   - [ ] Run command: `SpecGofer: Force Reset Autonomous State`
   - [ ] Verify state cleared and Play button returns

7. **Multiple Specs**
   - [ ] Verify Play button on multiple specs
   - [ ] Start execution on one spec
   - [ ] Verify only that spec shows Stop button
   - [ ] Verify other specs still show Play button
   - [ ] Stop execution
   - [ ] Verify all specs show Play button again

## Benefits

### User Benefits

- ✅ **Better Visibility**: Separate Terminal window easier to monitor
- ✅ **Direct Control**: Can kill Terminal directly (Cmd+W, Ctrl+C)
- ✅ **Clear Status**: UI shows whether autonomous mode is running
- ✅ **Intuitive**: Play when idle, Stop when running
- ✅ **Multi-tasking**: External Terminal doesn't block VSCode

### Developer Benefits

- ✅ **Separation of Concerns**: Terminal process independent of VSCode
- ✅ **State Management**: Context keys enable reactive UI
- ✅ **Error Recovery**: Force reset for stuck states
- ✅ **Native Experience**: Uses macOS Terminal (familiar to users)
- ✅ **Debugging**: External process easier to monitor/debug

## Future Enhancements

### Potential Improvements

1. **Terminal Process Monitoring**
   - Auto-detect when external Terminal closes
   - Auto-clear context key without "Mark as Stopped" prompt
   - Use polling or process ID tracking

2. **Multi-Terminal Support**
   - Allow multiple specs running in separate Terminals
   - Track multiple external processes
   - Show stop button for each active spec

3. **Terminal Output Capture**
   - Optionally capture Terminal output to VSCode output channel
   - Provide "View Output" command while Terminal is running
   - Enable searching Terminal logs from VSCode

4. **Cross-Platform Support**
   - Windows: Use `cmd.exe` or PowerShell
   - Linux: Use `gnome-terminal`, `konsole`, or `xterm`
   - Detect platform and use appropriate terminal

5. **Configuration Options**
   - Setting: Use external vs integrated terminal
   - Setting: Terminal application preference (Terminal, iTerm2, etc.)
   - Setting: Auto-clear context on Terminal close

## Known Limitations

1. **Manual State Sync**: User must click "Mark as Stopped" if Terminal closed
   directly
2. **macOS Only**: Currently only supports macOS Terminal
3. **No Output Capture**: VSCode doesn't receive Terminal output
4. **Single Execution**: Only one external Terminal tracked at a time
5. **No Process Monitoring**: Doesn't detect when Terminal closes automatically

## Conclusion

This feature significantly improves the autonomous execution UX by:

- Providing independent Terminal window for better visibility
- Offering intuitive play/stop button UI
- Enabling direct Terminal control
- Maintaining proper state management

The external Terminal approach gives users the flexibility to monitor Claude
Code's work in a separate window while keeping VSCode responsive and unblocked.

---

**Status**: ✅ Implemented and compiled successfully **Testing**: ⏳ Awaiting
manual testing **Platform**: macOS (Terminal.app) **Version**: 3.0.17
