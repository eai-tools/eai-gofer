# Testing Guide for SpecGofer Releases

## Critical: Why Commands Fail After Installation

**The #1 issue**: VSCode extensions don't activate until you reload the window!

If you install a VSIX and immediately try to use commands, they will fail with:
```
Error: command 'specGofer.refreshSpecs' not found
```

**Solution**: Always reload VSCode after installing!

## Pre-Release Testing Workflow

### 1. Automated Pre-Flight Checks

Run the automated test script:

```bash
# Basic checks (structure, commands, versions)
./test-vsix.sh ./specgofer-X.X.X.vsix

# Full checks including activation testing
./test-vsix.sh ./specgofer-X.X.X.vsix --test-activation
```

**Basic checks**:
- ✅ VSIX structure is valid
- ✅ extension.js exists and is properly sized
- ✅ Critical commands are present in compiled code
- ✅ Version numbers match
- ✅ Main entry point is correct

**Activation testing** (--test-activation flag):
- ✅ Installs VSIX locally
- ✅ Checks extension host logs for activation errors
- ✅ Fails if extension crashes during activation
- ⚠️ Requires VSCode to be running

### 2. Manual Installation Test

**CRITICAL**: Follow these steps in order!

```bash
# 1. Install the VSIX
code --install-extension ./specgofer-X.X.X.vsix

# 2. RELOAD VSCode (THIS IS CRITICAL!)
# Open Command Palette (Cmd+Shift+P) → "Developer: Reload Window"
#  OR
# Quit and restart VSCode completely
```

### 3. Test Critical Commands

After reloading, test each command in order:

#### A. Test Command Palette Commands

Open Command Palette (Cmd+Shift+P) and try each:

1. **SpecGofer: Initialize**
   - Should create `.specify/` folder structure
   - Should not error

2. **SpecGofer: Check for Updates**
   - Should check GitHub Pages for updates
   - Should show current version

3. **SpecGofer: Refresh Specs**
   - Should refresh the specs tree view
   - Should not error

#### B. Test UI Commands

1. Open SpecGofer sidebar (Activity Bar icon)
2. Click "Refresh" icon (↻) in the title bar
3. Click "Update Now" button (if update available)

**Expected Results**:
- ✅ No "command not found" errors
- ✅ Commands execute (even if they show "no specs found")
- ✅ Update check works
- ✅ UI buttons trigger their commands

### 4. Test Update Flow (Most Critical!)

This is the MOST IMPORTANT test because if update fails, users are stuck:

1. Install an older version first:
   ```bash
   code --install-extension ./specgofer-3.0.3.vsix
   ```

2. Reload VSCode

3. Trigger update check:
   - Command Palette → "SpecGofer: Check for Updates"
   - OR wait 24 hours for automatic check
   - OR click "Update Now" in SpecGofer view

4. Verify update works:
   - Should download new VSIX
   - Should install automatically
   - Should prompt to reload
   - After reload, new version should be active

## Common Issues

###  "Command not found" errors

**Cause**: VSCode not reloaded after installation

**Fix**: Reload VSCode window or restart VSCode

### Extension doesn't show in sidebar

**Cause**: Extension failed to activate

**Fix**:
1. Check VSCode Developer Tools (Help → Toggle Developer Tools)
2. Look for errors in Console
3. Check extension host log: Command Palette → "Developer: Show Extension Host Log"

### Commands work in dev but not in VSIX

**Cause**: TypeScript not compiled before packaging

**Fix**: The release script now includes `npm run compile` step (fixed in 3.0.4)

## Integration with Release Script

The `release-auto.sh` script automatically:

1. ✅ Compile TypeScript (added in 3.0.4)
2. ✅ Build VSIX package
3. ✅ Run automated structure tests (`test-vsix.sh`)
4. ✅ Install VSIX locally and check activation logs (added in 3.0.5)
5. ✅ Fail release if extension crashes during activation
6. ⚠️  Only pushes to GitHub if all tests pass

**Pre-release activation testing** (automatic in release-auto.sh):
- Installs VSIX in local VSCode
- Waits for extension to activate
- Checks extension host logs for errors
- Blocks release if activation fails

## Release Checklist

Before running `./release-auto.sh`:

- [ ] All TypeScript code compiles without errors
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)

After building VSIX but before pushing:

- [ ] Run `./test-vsix.sh ./specgofer-X.X.X.vsix`
- [ ] Install VSIX locally
- [ ] **RELOAD VSCode**
- [ ] Test all critical commands
- [ ] Test update flow from previous version
- [ ] Check extension doesn't crash on startup

Only after all tests pass:

- [ ] Push to GitHub
- [ ] Create GitHub release
- [ ] Update GitHub Pages

## Emergency Rollback

If a release is broken:

1. DO NOT delete the broken release from GitHub
2. Create a new patch release fixing the issue
3. Users can manually downgrade:
   ```bash
   code --install-extension ./specgofer-GOOD-VERSION.vsix
   ```

## Future Improvements

- [ ] Add automated E2E tests with VSCode extension test runner
- [ ] Add smoke tests that verify command registration
- [ ] Add CI/CD pipeline to test before merge
- [ ] Add telemetry to track command usage failures
