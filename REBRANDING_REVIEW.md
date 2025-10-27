# SpecKit to SpecGofer Rebranding - Engineer's Review

## Issue Identified
**Error**: "No view is registered with id: specGoferProgress"

**Root Cause**: Context key mismatch between package.json and extension.ts

## Changes Made

### 1. Configuration Settings (✅ VERIFIED)
**Files**: `extension/package.json`, `extension/src/config.ts`, `extension/src/webviewHelpers.ts`

| Old | New | Status |
|-----|-----|--------|
| `specKit.anthropicApiKey` | `specGofer.anthropicApiKey` | ✅ Consistent |
| `specKit.autoInitialize` | `specGofer.autoInitialize` | ✅ Consistent |
| `specKit.preferredAI` | `specGofer.preferredAI` | ✅ Consistent |
| `specKit.markdownViewer` | `specGofer.markdownViewer` | ✅ Consistent |
| `specKit.autoValidate` | `specGofer.autoValidate` | ✅ Consistent |
| `specKit.showWelcome` | `specGofer.showWelcome` | ✅ Consistent |
| `specKit.claudeTerminalName` | `specGofer.claudeTerminalName` | ✅ Consistent |

**Verification**:
```typescript
// config.ts (Lines 63-70)
export const CONFIG_KEYS = {
  anthropicApiKey: 'specGofer.anthropicApiKey',
  autoInitialize: 'specGofer.autoInitialize',
  preferredAi: 'specGofer.preferredAI',
  // ... all using specGofer prefix
}

// webviewHelpers.ts (Line 8)
const config = vscode.workspace.getConfiguration('specGofer'); // ✅ FIXED
```

### 2. View IDs (✅ VERIFIED)
**Files**: `extension/package.json`, `extension/src/extension.ts`, `extension/src/config.ts`

| Component | Old ID | New ID | Package.json | extension.ts | config.ts |
|-----------|--------|--------|--------------|--------------|-----------|
| Progress Tree | `specKitProgress` | `specGoferProgress` | ✅ | ✅ | ✅ |
| Constitution Tree | `specKitConstitution` | `specGoferConstitution` | ✅ | ✅ | ✅ |
| Memory Tree | `specKitMemory` | `specGoferMemory` | ✅ | ✅ | ✅ |
| Container | `spec-kit` | `spec-kit` | ✅ | ✅ | ✅ |

**Verification**:
```typescript
// extension.ts (Lines 230, 237, 244)
vscode.window.registerTreeDataProvider('specGoferProgress', progressProvider)
vscode.window.registerTreeDataProvider('specGoferConstitution', constitutionProvider)
vscode.window.registerTreeDataProvider('specGoferMemory', memoryProvider)
```

```json
// package.json
"views": {
  "spec-kit": [
    { "id": "specGoferProgress", "name": "Specifications" },
    { "id": "specGoferConstitution", "name": "Constitution" },
    { "id": "specGoferMemory", "name": "Memory" }
  ]
}
```

### 3. Context Keys (✅ FIXED)
**Files**: `extension/package.json`, `extension/src/extension.ts`

| Context Key | Package.json | extension.ts Before | extension.ts After |
|-------------|--------------|---------------------|-------------------|
| `specGoferInitialized` | ✅ Used in when clauses | ❌ Set as `specKitActive` | ✅ Set as `specGoferInitialized` |

**The Critical Fix** (Line 261):
```typescript
// BEFORE (WRONG):
vscode.commands.executeCommand('setContext', 'specKitActive', true);

// AFTER (FIXED):
vscode.commands.executeCommand('setContext', 'specGoferInitialized', true);
```

### 4. Commands (✅ VERIFIED)
**Files**: `extension/package.json`, `extension/src/config.ts`, `extension/src/extension.ts`

All 21 commands updated from `specKit.*` to `specGofer.*`:
- `specGofer.initialize`
- `specGofer.upgrade`
- `specGofer.refreshSpecs`
- `specGofer.refreshConstitution`
- `specGofer.showProgress`
- `specGofer.showConstitution`
- And 15 more...

**Verification**: All command registrations in extension.ts match package.json definitions.

### 5. LSP Methods (✅ VERIFIED)
**Files**: `language-server/src/server.ts`, `extension/src/lspClient.ts`

| Method | Old | New | server.ts | lspClient.ts |
|--------|-----|-----|-----------|--------------|
| Get Specs | `specKit/getSpecs` | `specGofer/getSpecs` | ✅ | ✅ |
| Execute Task | `specKit/executeTask` | `specGofer/executeTask` | ✅ | ✅ |
| Update Status | `specKit/updateTaskStatus` | `specGofer/updateTaskStatus` | ✅ | ✅ |
| Task Progress | `specKit/taskProgress` | `specGofer/taskProgress` | ✅ | ✅ |
| Security Violation | `specKit/securityViolation` | `specGofer/securityViolation` | ✅ | ✅ |

### 6. Mark Sharp Integration (✅ FIXED)
**File**: `extension/src/webviewHelpers.ts`

**Issue**: Command name was incorrect
```typescript
// BEFORE (WRONG):
await vscode.commands.executeCommand('markSharp.switchEditorMode');

// AFTER (FIXED):
await vscode.commands.executeCommand('mark-sharp.switch-editor-mode');
```

## What Was NOT Changed (Intentional)

### 1. Slash Command Names
**Files**: `extension/resources/claude-commands/*.md`

Slash commands remain as `/speckit.*`:
- `/speckit.specify`
- `/speckit.plan`
- `/speckit.clarify`
- `/speckit.implement`
- etc.

**Reason**: These are user-facing command names in the Claude Code interface. Changing them would break existing workflows.

### 2. Class and File Names
- `SpecKitParser` class
- `SpecKitMigrator` class
- `specKitParser.ts` file
- `specKitMigrator.ts` file

**Reason**: Internal implementation details. Changing would require updating imports across test files and risk breaking functionality.

### 3. GitHub Spec Kit References
- `.specify/` folder structure
- References to "GitHub Spec Kit" format in documentation

**Reason**: This refers to the specification format standard, not the extension name.

## Verification Checklist

- [x] All view IDs match between package.json and tree view registrations
- [x] Context key `specGoferInitialized` set correctly in extension.ts
- [x] Context key `specGoferInitialized` used in package.json when clauses
- [x] Configuration namespace changed to `specGofer` throughout
- [x] All commands use `specGofer.*` prefix
- [x] LSP methods updated to `specGofer/*` in both client and server
- [x] Mark Sharp command syntax fixed
- [x] Extension compiles without errors
- [x] Language server compiles without errors
- [x] No remaining `specKit.` references in settings access code
- [x] View focus commands use correct IDs

## Build Status

✅ **Language Server**: Compiled successfully (TypeScript)
✅ **Extension**: Compiled successfully (Webpack with expected warning)

## Testing Recommendations

1. **View Registration Test**:
   - Install extension
   - Open a workspace
   - Verify "SpecGofer - Enterprise AI" appears in activity bar
   - Verify three tree views appear: Specifications, Constitution, Memory

2. **Settings Test**:
   - Open VSCode Settings (`Cmd+,`)
   - Search for `specGofer.markdownViewer`
   - Verify setting appears and can be changed
   - Change to "mark-sharp" and verify it works

3. **Context Key Test**:
   - Install extension
   - Verify no errors about "specGoferProgress" not being registered
   - Check that menus appear/disappear based on initialization status

4. **Mark Sharp Test**:
   - Set `specGofer.markdownViewer` to "mark-sharp"
   - Click on a markdown file in tree view
   - Verify Mark Sharp opens (not error message)

## Files Modified

### Core Extension
- `extension/package.json` - View IDs, commands, configuration
- `extension/src/config.ts` - Constants for commands, views, config keys
- `extension/src/extension.ts` - Context key fix, view registrations
- `extension/src/webviewHelpers.ts` - Settings access, Mark Sharp command
- `extension/src/lspClient.ts` - LSP method calls
- `extension/src/mcpConfig.ts` - Settings access
- `extension/src/memoryProvider.ts` - Command references
- `extension/src/constitutionProvider.ts` - Command references
- `extension/src/progressProvider.ts` - Command references

### Language Server
- `language-server/src/server.ts` - LSP method registrations
- `language-server/src/mcp/toolHandler.ts` - Notification methods
- `language-server/src/__tests__/*.test.ts` - Test method names

### Tests
- `extension/src/test/suite/e2e.test.ts` - Command calls

## Summary

**Status**: ✅ All critical issues identified and fixed

**Key Fix**: Changed context key from `specKitActive` to `specGoferInitialized` to match package.json when clauses.

**Consistency**: All view IDs, commands, configuration keys, and LSP methods now consistently use `specGofer` naming.

**Build Status**: Both extension and language server compile successfully.

**Next Step**: Test in VSCode to verify views register correctly and settings work as expected.
