---
feature: 028-cross-platform-command-parity
contract-type: settings-api
created: 2026-03-18
updated: 2026-03-18
status: draft
---

# Settings API Contracts: Cross-Platform Command Parity

This document defines the VSCode settings integration contracts for
Cross-Platform Command Parity, including the `gofer.defaultCLI` setting and
related configuration APIs.

## Contract Overview

| Contract                          | Type           | User Stories Served | Purpose                            |
| --------------------------------- | -------------- | ------------------- | ---------------------------------- |
| **gofer.defaultCLI Setting**      | VSCode Setting | US-5                | Default AI platform selection      |
| **ConfigManager.getDefaultCLI()** | Method         | US-5                | Type-safe settings access          |
| **Settings Change Handler**       | Event Handler  | US-5                | Immediate effect on setting change |
| **Platform Status Provider**      | UI Component   | US-5, US-7          | Display platform availability      |

---

## 1. gofer.defaultCLI Setting

**Description**: VSCode setting for selecting default AI platform for Gofer
commands.

**Location**: `extension/package.json` (contributes.configuration)

**Serves**:

- FR-006 (Default provider setting)
- FR-007 (Provider factory integration)
- US-5 (Default provider selection)

### Setting Schema

```json
{
  "gofer.defaultCLI": {
    "type": "string",
    "enum": ["claude", "copilot", "codex", "auto"],
    "enumDescriptions": [
      "Always use Claude Code CLI (requires .claude/commands/ directory)",
      "Always use GitHub Copilot Chat (requires .github/prompts/ directory and Copilot extension)",
      "Always use Codex CLI (requires .system/skills/ directory and Codex CLI installation)",
      "Auto-detect based on available platforms (checks Claude first, then Codex, then Copilot)"
    ],
    "default": "auto",
    "markdownDescription": "Default AI platform for Gofer commands. Commands will route to this platform automatically. Change takes effect immediately without reloading VSCode.",
    "order": 27,
    "scope": "window"
  }
}
```

### Setting Validation

**Valid Values**:

- `"claude"` - Always use Claude Code CLI
- `"copilot"` - Always use GitHub Copilot Chat
- `"codex"` - Always use Codex CLI
- `"auto"` - Auto-detect (default)

**Validation Rules**:

```typescript
function validateDefaultCLI(
  value: unknown
): value is 'claude' | 'copilot' | 'codex' | 'auto' {
  return (
    typeof value === 'string' &&
    ['claude', 'copilot', 'codex', 'auto'].includes(value)
  );
}
```

**Error Handling**:

- If invalid value provided, fall back to `"auto"`
- Log warning: "Invalid gofer.defaultCLI value: {value}. Using 'auto'."
- Show notification: "Invalid CLI platform setting. Reset to 'auto'."

### Setting Behavior

**When value is "auto"**:

- CrossPlatformCommandRouter runs platform detection
- Detection priority: Claude > Codex > Copilot
- Falls back to Claude if all detection fails (backward compatibility)

**When value is explicit ("claude" | "copilot" | "codex")**:

- Router uses specified platform without detection
- If platform unavailable, show error with installation instructions
- Do NOT fall back to another platform (respect user preference)

**Example**:

```typescript
const config = vscode.workspace.getConfiguration('gofer');
const defaultCLI = config.get<'claude' | 'copilot' | 'codex' | 'auto'>(
  'defaultCLI',
  'auto'
);

if (defaultCLI !== 'auto') {
  // Use explicit preference
  return createRouterForPlatform(defaultCLI);
} else {
  // Run auto-detection
  return await detectAndCreateRouter();
}
```

**Serves**:

- US-5: Acceptance scenario 1 (settings dropdown)
- US-5: Acceptance scenario 2 (commands route to selected platform)
- US-5: Acceptance scenario 3 (auto-detect priority)

---

## 2. ConfigManager.getDefaultCLI() Method

**Description**: Type-safe getter for `gofer.defaultCLI` setting.

**Location**: `extension/src/config.ts` (extends ConfigManager)

**Serves**:

- FR-006 (Default provider setting)
- US-5 (Default provider selection)

### Method Signature

```typescript
/**
 * Get default AI CLI platform
 * Returns user preference for AI platform, or 'auto' for automatic detection
 *
 * @returns 'claude' | 'copilot' | 'codex' | 'auto' - User-selected platform
 */
public getDefaultCLI(): 'claude' | 'copilot' | 'codex' | 'auto';
```

### Implementation

```typescript
public getDefaultCLI(): 'claude' | 'copilot' | 'codex' | 'auto' {
  const value = this.config.get<string>(
    'defaultCLI',  // Strip 'gofer.' prefix per convention
    DEFAULTS.defaultCLI
  );

  // Validate value
  if (!['claude', 'copilot', 'codex', 'auto'].includes(value)) {
    this.logger.warn(`Invalid defaultCLI value: ${value}. Using 'auto'.`);
    return 'auto';
  }

  return value as 'claude' | 'copilot' | 'codex' | 'auto';
}
```

### Return Value

**Type**: `'claude' | 'copilot' | 'codex' | 'auto'`

**Guarantees**:

- Always returns valid enum value
- Never returns undefined or null
- Defaults to `'auto'` if setting missing or invalid
- No exceptions thrown

**Example Usage**:

```typescript
const configManager = ConfigManager.getInstance();
const platform = configManager.getDefaultCLI();

switch (platform) {
  case 'claude':
    // Use Claude Code CLI
    break;
  case 'copilot':
    // Use Copilot Chat
    break;
  case 'codex':
    // Use Codex CLI
    break;
  case 'auto':
    // Run auto-detection
    break;
}
```

**Serves**:

- FR-006: Type-safe settings access
- Internal API contract: CrossPlatformCommandRouter depends on this method

---

## 3. Settings Change Handler

**Description**: Event handler that reacts to `gofer.defaultCLI` changes and
re-routes commands immediately.

**Location**: `extension/src/extension.ts` (extension activation)

**Serves**:

- FR-007 (Provider factory integration)
- US-5 (Immediate effect without reload)

### Event Subscription

```typescript
/**
 * Register settings change handler during extension activation
 */
function registerSettingsWatcher(context: vscode.ExtensionContext) {
  // Subscribe to configuration changes
  const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
    // Check if gofer.defaultCLI changed
    if (event.affectsConfiguration('gofer.defaultCLI')) {
      handleDefaultCLIChange();
    }
  });

  // Add to subscriptions for cleanup
  context.subscriptions.push(disposable);
}
```

### Change Handler

```typescript
/**
 * Handle gofer.defaultCLI setting change
 * Reinitializes CrossPlatformCommandRouter with new platform
 */
async function handleDefaultCLIChange(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const newPlatform = configManager.getDefaultCLI();

  // Log change
  logger.info(`defaultCLI changed to: ${newPlatform}`);

  // Recreate router with new platform
  const router = await CrossPlatformCommandRouter.create(newPlatform);

  // Update router instance in DI container
  container.register('CrossPlatformCommandRouter', { useValue: router });

  // Show notification
  const platformName = configManager.getCLIDisplayName(
    newPlatform === 'auto' ? 'claude' : newPlatform
  );
  vscode.window.showInformationMessage(
    `Gofer commands now route to: ${newPlatform === 'auto' ? 'Auto-detect' : platformName}`
  );
}
```

### Behavior Contract

**Requirements**:

- Change detection latency: <100ms
- Router reinitialization: <500ms
- User notification: Shown immediately
- No VSCode reload required
- Active command sessions not interrupted

**Example Flow**:

1. User changes `gofer.defaultCLI` from `"auto"` to `"codex"` in settings
2. `onDidChangeConfiguration` event fires within 100ms
3. `handleDefaultCLIChange()` executes
4. New router created for Codex platform
5. User sees notification: "Gofer commands now route to: Codex CLI"
6. Next command invocation uses Codex automatically

**Serves**:

- US-5: Acceptance scenario 2 (commands route to selected platform)
- NFR-007: Zero configuration default (auto works immediately)

---

## 4. Platform Status Provider

**Description**: UI component displaying platform availability and status in
VSCode settings.

**Location**: `extension/src/ui/PlatformStatusProvider.ts`

**Serves**:

- US-7 (Capability matrix documentation)
- US-5 (Default provider selection discoverability)

### Status Provider Interface

```typescript
/**
 * Provider for platform availability status
 * Displays which platforms are installed and ready
 */
export class PlatformStatusProvider {
  /**
   * Get status for all platforms
   * Checks CLI installation, directory existence, and configuration
   *
   * @returns Promise<PlatformStatus[]> - Status array for all platforms
   */
  async getStatus(): Promise<PlatformStatus[]>;

  /**
   * Get status for specific platform
   *
   * @param platform - Platform to check
   * @returns Promise<PlatformStatus> - Status object
   */
  async getPlatformStatus(
    platform: 'claude' | 'copilot' | 'codex'
  ): Promise<PlatformStatus>;

  /**
   * Refresh status (re-check all platforms)
   *
   * @returns Promise<void>
   */
  async refresh(): Promise<void>;
}
```

### Status Data Structure

```typescript
/**
 * Platform availability status
 */
export interface PlatformStatus {
  platform: 'claude' | 'copilot' | 'codex';
  displayName: string;
  available: boolean;
  reason: string; // Why available or not available
  checks: {
    directoryExists: boolean;
    cliInstalled: boolean;
    extensionActive: boolean; // For Copilot only
  };
  installationInstructions?: string;
}
```

### Status Examples

**Claude Code CLI (Available)**:

```typescript
{
  platform: 'claude',
  displayName: 'Claude Code CLI',
  available: true,
  reason: 'Claude commands directory exists (.claude/commands/)',
  checks: {
    directoryExists: true,
    cliInstalled: true,
    extensionActive: false  // N/A for Claude
  }
}
```

**Codex CLI (Not Available)**:

```typescript
{
  platform: 'codex',
  displayName: 'Codex CLI',
  available: false,
  reason: 'Codex skills directory not found (.system/skills/)',
  checks: {
    directoryExists: false,
    cliInstalled: false,
    extensionActive: false
  },
  installationInstructions: 'Install Codex CLI: npm install -g @openai/codex-cli\nRun: gofer scaffold --platform codex'
}
```

**GitHub Copilot Chat (Partially Available)**:

```typescript
{
  platform: 'copilot',
  displayName: 'GitHub Copilot Chat',
  available: true,
  reason: 'Copilot prompts directory exists (.github/prompts/), but extension not active',
  checks: {
    directoryExists: true,
    cliInstalled: false,  // N/A for Copilot
    extensionActive: false
  },
  installationInstructions: 'Install GitHub Copilot extension from VSCode marketplace'
}
```

### UI Integration

**Settings Page Display**:

```markdown
## Gofer: Default AI Platform

**Current Selection**: Auto-detect

**Platform Status**:

- ✓ **Claude Code CLI**: Ready (.claude/commands/ exists)
- ✗ **Codex CLI**: Not installed ([Install Codex](command:gofer.installCodex))
- ⚠ **GitHub Copilot Chat**: Prompts exist, but extension not active
  ([Activate](command:workbench.extensions.search?%22GitHub%20Copilot%22))

[Refresh Status](command:gofer.refreshPlatformStatus)
```

**Implementation**:

```typescript
// Register settings webview provider
const provider = new PlatformStatusProvider();
const webviewProvider = new SettingsWebviewProvider(provider);

vscode.window.registerWebviewViewProvider(
  'gofer.platformStatus',
  webviewProvider
);
```

**Serves**:

- US-7: Capability matrix (shows which platforms work)
- US-5: Settings UI discoverability

---

## 5. Configuration Change Propagation

**Description**: Ensure configuration changes propagate to all dependent
components.

**Serves**:

- FR-007 (Provider factory integration)
- NFR-007 (Zero configuration default)

### Dependency Chain

```
VSCode Settings
  └─> ConfigManager.getDefaultCLI()
      └─> CrossPlatformCommandRouter.detectPlatform()
          └─> Command Execution
```

### Change Propagation Flow

```typescript
/**
 * Configuration change propagation sequence:
 *
 * 1. User changes gofer.defaultCLI in settings
 * 2. VSCode fires workspace.onDidChangeConfiguration event
 * 3. Extension handler checks event.affectsConfiguration('gofer.defaultCLI')
 * 4. Handler calls ConfigManager.getDefaultCLI() to read new value
 * 5. Handler recreates CrossPlatformCommandRouter with new platform
 * 6. Handler updates DI container registration
 * 7. Handler shows user notification
 * 8. Next command invocation uses new router automatically
 */
async function propagateConfigChange(
  event: vscode.ConfigurationChangeEvent
): Promise<void> {
  // 1. Check if relevant setting changed
  if (!event.affectsConfiguration('gofer.defaultCLI')) {
    return;
  }

  // 2. Read new value
  const configManager = ConfigManager.getInstance();
  const newPlatform = configManager.getDefaultCLI();

  // 3. Log change
  logger.info(`Configuration changed: gofer.defaultCLI = ${newPlatform}`);

  // 4. Recreate router
  const router = await CrossPlatformCommandRouter.create(newPlatform);

  // 5. Update dependencies
  updateDependencies(router);

  // 6. Notify user
  notifyUser(newPlatform);
}
```

**Latency Contract**:

- Event detection: <100ms
- Router recreation: <500ms
- Notification display: <1000ms
- Total latency: <2 seconds from setting change to active

**Serves**:

- NFR-007: Zero configuration (auto works immediately)
- US-5: Setting takes effect immediately

---

## 6. Setting Migration

**Description**: Handle migration from deprecated settings or first-time
installation.

**Serves**:

- NFR-007 (Zero configuration default)

### Migration Rules

**First-Time Installation**:

- Default value: `"auto"`
- No migration needed
- Works immediately without configuration

**Migrating from Feature 027** (multi-provider-cli-support):

- Previous setting: `gofer.cliProvider` (values: "claude" | "codex" | "auto")
- New setting: `gofer.defaultCLI` (values: "claude" | "copilot" | "codex" |
  "auto")
- Migration: Copy `cliProvider` value to `defaultCLI`, delete old setting

```typescript
async function migrateSettings(): Promise<void> {
  const config = vscode.workspace.getConfiguration('gofer');
  const oldValue = config.get<string>('cliProvider');
  const newValue = config.get<string>('defaultCLI');

  // If new setting not configured but old setting exists
  if (!newValue && oldValue) {
    // Copy old value to new setting
    await config.update(
      'defaultCLI',
      oldValue,
      vscode.ConfigurationTarget.Global
    );

    // Remove old setting
    await config.update(
      'cliProvider',
      undefined,
      vscode.ConfigurationTarget.Global
    );

    logger.info(`Migrated cliProvider (${oldValue}) to defaultCLI`);
  }
}
```

**Serves**:

- NFR-007: Backward compatibility with Feature 027

---

## Contract Summary

### Total Contracts: 4

| #   | Contract                      | Type           | Purpose                       |
| --- | ----------------------------- | -------------- | ----------------------------- |
| 1   | gofer.defaultCLI Setting      | VSCode Setting | Default AI platform selection |
| 2   | ConfigManager.getDefaultCLI() | Method         | Type-safe settings access     |
| 3   | Settings Change Handler       | Event Handler  | Immediate effect on change    |
| 4   | Platform Status Provider      | UI Component   | Display availability status   |

### User Stories Served

| Contract                      | US-5 | US-7 |
| ----------------------------- | ---- | ---- |
| gofer.defaultCLI Setting      | ✓    |      |
| ConfigManager.getDefaultCLI() | ✓    |      |
| Settings Change Handler       | ✓    |      |
| Platform Status Provider      | ✓    | ✓    |

**Legend**:

- US-5: Default Provider Selection
- US-7: Capability Matrix Documentation

### Functional Requirements Served

**Settings**: FR-006 (default provider setting)

**Integration**: FR-007 (provider factory integration)

**Usability**: NFR-007 (zero configuration default)

---

## Testing Contracts

### Unit Test: ConfigManager.getDefaultCLI()

```typescript
describe('ConfigManager.getDefaultCLI()', () => {
  it('should return default value when setting not configured', () => {
    const config = new ConfigManager();
    expect(config.getDefaultCLI()).toBe('auto');
  });

  it('should return configured value', () => {
    mockWorkspaceConfig('defaultCLI', 'codex');
    const config = new ConfigManager();
    expect(config.getDefaultCLI()).toBe('codex');
  });

  it('should fall back to auto on invalid value', () => {
    mockWorkspaceConfig('defaultCLI', 'invalid');
    const config = new ConfigManager();
    expect(config.getDefaultCLI()).toBe('auto');
  });
});
```

### Integration Test: Settings Change Handler

```typescript
describe('Settings Change Handler', () => {
  it('should reinitialize router on setting change', async () => {
    // Start with auto
    const initialPlatform = configManager.getDefaultCLI();
    expect(initialPlatform).toBe('auto');

    // Change to codex
    await vscode.workspace
      .getConfiguration('gofer')
      .update('defaultCLI', 'codex', vscode.ConfigurationTarget.Global);

    // Wait for change to propagate
    await waitForEvent('router-reinitialized', 2000);

    // Verify new value active
    const newPlatform = configManager.getDefaultCLI();
    expect(newPlatform).toBe('codex');

    // Verify next command uses codex
    const result = await invokeCommand('0_business_scenario');
    expect(result.metadata.platform).toBe('codex');
  });
});
```

### Integration Test: Platform Status Provider

```typescript
describe('Platform Status Provider', () => {
  it('should detect all platform statuses', async () => {
    const provider = new PlatformStatusProvider();
    const statuses = await provider.getStatus();

    expect(statuses).toHaveLength(3);
    expect(statuses[0].platform).toBe('claude');
    expect(statuses[1].platform).toBe('copilot');
    expect(statuses[2].platform).toBe('codex');

    // Check structure
    statuses.forEach((status) => {
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('reason');
      expect(status).toHaveProperty('checks');
    });
  });
});
```

**Serves**:

- US-5: Settings dropdown acceptance criteria
- US-7: Capability matrix acceptance criteria

---

## Implementation Notes

1. **Setting Validation**: Always validate `gofer.defaultCLI` value before use.
   Fall back to 'auto' on invalid input.

2. **Change Detection**: Use `event.affectsConfiguration()` for efficient change
   detection. Don't read settings unnecessarily.

3. **Router Reinitialization**: Creating a new router is cheap (<500ms). Don't
   optimize prematurely.

4. **User Notifications**: Show notification only when user explicitly changes
   setting, not on automatic migration.

5. **Platform Status**: Cache status for 5 seconds to avoid repeated filesystem
   checks.

6. **Migration**: Run migration check once on extension activation, not on every
   command.
