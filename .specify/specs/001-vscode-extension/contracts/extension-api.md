# Extension API Contract

**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-22

## Overview

This document defines the VSCode Extension API contracts for SpecGofer, including activation events, commands, tree providers, and extension lifecycle.

## Activation

### Activation Events

```json
{
  "activationEvents": [
    "onStartupFinished",
    "workspaceContains:.specify"
  ]
}
```

**Contract**:

- Extension MUST activate on VSCode startup if `.specify/` folder exists
- Extension MUST activate within 500ms of event trigger
- Extension MUST handle activation failure gracefully (show error notification)

### Activation Sequence

```typescript
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 1. Check for .specify/ folder
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    return; // No workspace, don't activate
  }
  
  const specifyPath = path.join(workspacePath, '.specify');
  const hasSpecify = fs.existsSync(specifyPath);
  
  // 2. Register commands (always, even without .specify/)
  context.subscriptions.push(
    vscode.commands.registerCommand('specgofer.init', initRepository),
    vscode.commands.registerCommand('specgofer.refresh', refreshViews),
    vscode.commands.registerCommand('specgofer.migrate', migrateSpecs),
    vscode.commands.registerCommand('specgofer.checkUpdates', checkForUpdates)
  );
  
  // 3. Initialize providers if .specify/ exists
  if (hasSpecify) {
    const progressProvider = new ProgressProvider(workspacePath);
    const constitutionProvider = new ConstitutionProvider(workspacePath);
    
    vscode.window.createTreeView('specgofer.progress', { treeDataProvider: progressProvider });
    vscode.window.createTreeView('specgofer.constitution', { treeDataProvider: constitutionProvider });
    
    // 4. Start Language Server
    const lspClient = new LSPClient(context, workspacePath);
    await lspClient.start();
    
    // 5. Create MCP config
    const mcpConfig = new MCPConfigManager(workspacePath);
    await mcpConfig.ensureConfig();
    
    // 6. Setup file watchers
    setupFileWatchers(context, progressProvider);
  }
  
  // 7. Check for updates (async, non-blocking)
  checkForUpdatesInBackground(context);
}
```

## Commands

### specgofer.init

Initialize `.specify/` structure in current workspace.

**Command ID**: `specgofer.init`
**Title**: "SpecGofer: Initialize Repository"
**When**: Always available

**Input**: None

**Output**: Creates `.specify/` folder structure with latest templates

**Side Effects**:

- Creates `.specify/memory/constitution.md`
- Creates `.specify/specs/` directory (note: specs always at .specify/specs/, not root)
- Creates `.specify/templates/` directory
- Creates `.specify/scripts/` directory
- Creates `.specify/README.md`
- Downloads latest Spec Kit templates from GitHub:
  - Fetches `spec-kit-template-claude-sh-vxxx.zip`
  - Fetches `spec-kit-template-copilot-sh-vxxx.zip`
  - Extracts to `.specify/templates/` and `.specify/scripts/`
- Shows progress indicator during template download
- Shows success notification
- Triggers extension activation (if not already activated)

**Error Handling**:

- If `.specify/` already exists: Show info message "Already initialized"
- If filesystem error: Show error notification with details
- If template download fails: Use bundled fallback templates, show warning
- If network timeout: Continue with bundled templates, suggest manual retry

### specgofer.refresh

Refresh all tree views by reloading specs from disk.

**Command ID**: `specgofer.refresh`
**Title**: "SpecGofer: Refresh Views"
**Icon**: `$(refresh)`
**When**: `specgofer.hasSpecify`

**Input**: None

**Output**: Reloads specs from `.specify/specs/` and refreshes tree views

**Side Effects**:

- Clears spec cache
- Re-parses all `.md` files in `.specify/specs/` (not root level)
- Fires `onDidChangeTreeData` event for all providers
- Shows progress indicator during reload

### specgofer.migrate

Migrate legacy JSON specs to GitHub Spec Kit format.

**Command ID**: `specgofer.migrate`
**Title**: "SpecGofer: Upgrade to Spec Kit Format"
**When**: `specgofer.hasLegacySpecs`

**Input**: User confirmation dialog

**Output**: Migration report

**Side Effects**:

- Backs up original files to `.specify/_backup/specs-{timestamp}/`
- Converts all `*.json` specs to `.md` format
- Updates file watchers to new paths
- Shows migration report in output channel
- Prompts to refresh views

**Error Handling**:

- Atomic operation (rollback on failure)
- Detailed error messages for each failed file
- Option to retry or skip failed files

### specgofer.checkUpdates

Manually check for extension updates from GitHub.

**Command ID**: `specgofer.checkUpdates`
**Title**: "SpecGofer: Check for Updates"
**When**: Always available

**Input**: None

**Output**: Update notification or "Already up to date" message

**Side Effects**:

- Fetches latest release from GitHub API
- Compares with current version
- Shows notification if update available
- Updates last check time in state

### specgofer.updateTemplates

Update spec kit templates to latest version.

**Command ID**: `specgofer.updateTemplates`
**Title**: "SpecGofer: Update Templates"
**Category**: "SpecGofer"

**Input**: None

**Output**: Success/failure notification

**Preconditions**:

- Internet connection available
- GitHub API accessible

**Side Effects**:

- Downloads latest templates from GitHub releases
- Extracts to `.specify/templates/` folder
- Updates version metadata
- Shows progress notification during download
- Refreshes tree view if templates updated

**Error Conditions**:

- Network failure: Shows retry notification
- GitHub API rate limit: Shows wait time
- Invalid template format: Shows format error
- Disk space insufficient: Shows cleanup suggestion

### specgofer.openSpec

Open spec file in editor (internal command).

**Command ID**: `specgofer.openSpec`
**Title**: (Hidden)
**When**: (Internal only)

**Input**: `filePath: string`

**Output**: Opens file in editor

**Side Effects**:

- Opens document in active editor group
- Scrolls to top of file

## Tree View Providers

### SpecGofer Progress

**View ID**: `specgofer.progress`
**Title**: "SpecGofer"
**Location**: Activity Bar (custom icon)

**Contract**:

```typescript
interface TreeDataProvider<T> {
  onDidChangeTreeData: Event<T | undefined>;
  getTreeItem(element: T): TreeItem | Thenable<TreeItem>;
  getChildren(element?: T): ProviderResult<T[]>;
  getParent?(element: T): ProviderResult<T>;
}
```

**Hierarchy**:

```
Root
├── Spec 1 (collapsible)
│   ├── Task T001 (with checkbox)
│   ├── Task T002 (with checkbox)
│   └── Task T003 (with checkbox)
├── Spec 2 (collapsible)
│   └── ...
```

**Tree Item Properties**:

- **Label**: Spec title or task description
- **Description**: Status (draft, in_progress, completed)
- **Icon**: ThemeIcon based on status
- **Tooltip**: Full details (ID, dependencies, dates)
- **Command**: `specgofer.openSpec` on click
- **Context Value**: "spec" or "task" (for context menus)
- **Checkbox**: Tasks only, synced with `[x]` in file

**Refresh Triggers**:

- File change in `.specify/specs/**/*.md` (debounced 300ms)
- Manual refresh command
- Git branch change
- Migration complete

### Constitution

**View ID**: `specgofer.constitution`
**Title**: "Constitution"
**Location**: Explorer sidebar (below SpecGofer Progress)

**Hierarchy**:

```
Root
├── I. Test-Driven Development
├── II. MCP-First Architecture
├── III. Spec Kit Format Compliance
├── IV. Strict TypeScript & Code Quality
├── V. Security by Default
├── VI. Performance Requirements
└── VII. 80% Test Coverage Minimum
```

**Tree Item Properties**:

- **Label**: Article title (with roman numeral)
- **Description**: None
- **Icon**: `$(law)` ThemeIcon
- **Tooltip**: First 200 chars of article content
- **Command**: Opens constitution.md at article section
- **Collapsible**: None (flat list)

## Extension Context

### Contributed Views

```json
{
  "views": {
    "specgofer-activitybar": [
      {
        "id": "specgofer.progress",
        "name": "SpecGofer"
      },
      {
        "id": "specgofer.constitution",
        "name": "Constitution"
      }
    ]
  },
  "viewsContainers": {
    "activitybar": [
      {
        "id": "specgofer-activitybar",
        "title": "SpecGofer",
        "icon": "resources/icon.svg"
      }
    ]
  }
}
```

### When Clauses

```json
{
  "when": "specgofer.hasSpecify",
  "description": "True when .specify/ folder exists"
}
```

```json
{
  "when": "specgofer.hasLegacySpecs",
  "description": "True when legacy JSON specs detected"
}
```

## Lifecycle Hooks

### onDidChangeWorkspaceFolders

**Contract**: Re-check for `.specify/` folder, reinitialize if found

```typescript
vscode.workspace.onDidChangeWorkspaceFolders((e) => {
  for (const folder of e.added) {
    checkAndInitialize(folder.uri.fsPath);
  }
  for (const folder of e.removed) {
    cleanup(folder.uri.fsPath);
  }
});
```

### deactivate

**Contract**: Clean up resources, stop Language Server

```typescript
export async function deactivate(): Promise<void> {
  // Stop LSP client
  await lspClient.stop();
  
  // Dispose file watchers
  fileWatchers.forEach(w => w.dispose());
  
  // Clear caches
  specCache.clear();
}
```

## Performance Contracts

- **Activation**: <500ms from event to UI visible
- **Tree View Render**: <100ms for 100 specs
- **Refresh**: <200ms for 100 specs
- **File Watch Response**: <300ms debounced
- **Command Execution**: <50ms (except migrate)

## Error Handling

### Error Notification Pattern

```typescript
try {
  await riskyOperation();
} catch (error) {
  const message = error instanceof SpecKitError ? error.message : 'Unknown error';
  vscode.window.showErrorMessage(`SpecGofer: ${message}`, 'View Logs').then(selection => {
    if (selection === 'View Logs') {
      outputChannel.show();
    }
  });
}
```

### Output Channel

**Channel Name**: "SpecGofer"
**Log Levels**: INFO, WARN, ERROR
**Format**: `[TIMESTAMP] [LEVEL] Message`

## Testing Contracts

### Unit Tests

- Mock `vscode` module with `@types/vscode` stubs
- Test data transformations (spec parsing, tree item creation)
- Test error handling paths

### Integration Tests

- Use `@vscode/test-electron` for real VSCode instance
- Test activation sequence
- Test command execution
- Test tree view updates

## Summary

All extension API contracts defined. Developers can implement components independently following these specifications.
