---
feature: 027-multi-provider-cli-support
contract-type: events
created: 2026-03-16
updated: 2026-03-16
status: draft
---

# Event Contracts: Multi-Provider CLI Support

This document specifies event-based contracts for Multi-Provider CLI Support,
defining VSCode configuration change events, provider state change events, and
coordination mechanisms for runtime provider switching.

## Event Overview

| Event                                | Type         | Trigger         | User Stories Served | Purpose                                     |
| ------------------------------------ | ------------ | --------------- | ------------------- | ------------------------------------------- |
| **onDidChangeConfiguration**         | VSCode Event | Settings change | US-1, US-2          | Detect provider selection changes           |
| **onCLIProviderChanged**             | Custom Event | Provider switch | US-2                | Notify components of active provider change |
| **onCLIProviderAvailabilityChanged** | Custom Event | Health check    | US-3                | Track provider availability status          |
| **onCLIProcessError**                | Custom Event | CLI failure     | US-3                | Handle CLI process errors gracefully        |
| **onProviderSwitchCompleted**        | Custom Event | Switch done     | US-2                | Confirm provider switch succeeded           |
| **onUsageDataUpdated**               | Custom Event | Usage tracked   | US-5                | Notify usage panel of new data              |

---

## 1. VSCode Configuration Change Events

### Event: onDidChangeConfiguration

**Description**: VSCode built-in event fired when workspace settings change.
Used to detect changes to `gofer.cliProvider` setting and trigger provider
reinitialization.

**Event Source**: `vscode.workspace.onDidChangeConfiguration`

**Serves**:

- FR-004 (Immediate provider switching without reload)
- US-2 (Transparent provider switching - no manual reconfiguration)

### Event Listener Registration

**Location**: `extension/src/extension.ts` (in `initializeForWorkspace()`)

```typescript
/**
 * Listen for CLI provider setting changes and reinitialize provider
 */
function registerCLIProviderConfigWatcher(
  context: vscode.ExtensionContext
): void {
  const disposable = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      // Only react to CLI provider setting changes
      if (event.affectsConfiguration('gofer.cliProvider')) {
        await handleCLIProviderChange();
      }

      // Also watch for CLI command changes
      if (
        event.affectsConfiguration('gofer.claudeCodeCommand') ||
        event.affectsConfiguration('gofer.codexCommand')
      ) {
        await handleCLIProviderChange();
      }
    }
  );

  context.subscriptions.push(disposable);
}
```

### Event Handler

```typescript
/**
 * Handle CLI provider configuration change
 * Reinitializes provider factory and emits onCLIProviderChanged event
 */
async function handleCLIProviderChange(): Promise<void> {
  try {
    // 1. Refresh ConfigManager to pick up new setting
    const config = ConfigManager.getInstance();
    config.refresh();

    // 2. Get new provider preference
    const newProvider = config.getPreferredCLIProvider();

    // 3. Create new provider instance
    const factory = getProviderFactory();
    const provider = await factory.createCLIProvider(newProvider);

    // 4. Update active provider in global state
    updateActiveCLIProvider(provider);

    // 5. Emit custom event for downstream components
    cliProviderEventEmitter.fire({
      eventType: 'provider-changed',
      providerId: provider.id,
      providerName: provider.name,
      timestamp: new Date().toISOString(),
    });

    // 6. Show confirmation notification
    vscode.window.showInformationMessage(
      `CLI provider switched to ${provider.name}`,
      'Dismiss'
    );
  } catch (error) {
    // Handle provider initialization failure
    vscode.window
      .showErrorMessage(
        `Failed to switch CLI provider: ${error instanceof Error ? error.message : String(error)}`,
        'View Settings'
      )
      .then((selection) => {
        if (selection === 'View Settings') {
          vscode.commands.executeCommand(
            'workbench.action.openSettings',
            'gofer.cliProvider'
          );
        }
      });
  }
}
```

### Event Payload

```typescript
/**
 * Configuration change event payload (VSCode built-in)
 */
interface ConfigurationChangeEvent {
  /**
   * Check if a configuration setting was affected
   * @param section - Setting key (e.g., 'gofer.cliProvider')
   */
  affectsConfiguration(
    section: string,
    scope?: vscode.ConfigurationScope
  ): boolean;
}
```

### Behavior

| Condition                        | Action                 | Notification                                        |
| -------------------------------- | ---------------------- | --------------------------------------------------- |
| Valid provider selected          | Switch to new provider | ✓ "CLI provider switched to {name}"                 |
| Invalid provider (not installed) | Keep current provider  | ✗ "Failed to switch: {error}"                       |
| Auto-detect → specific provider  | Detect and switch      | ✓ "CLI provider switched to {detected}"             |
| No provider available            | Revert to previous     | ✗ "No CLI provider found. Install Claude or Codex." |

**Serves**:

- FR-004: Provider changes apply immediately
- NFR-001: Provider switching completes in <500ms

---

## 2. Custom Event: onCLIProviderChanged

**Description**: Custom event emitted when active CLI provider changes, allowing
downstream components (AutonomousDriver, ClaudeCodeBridge, UsageLogger) to
update their dependencies.

**Event Type**: `vscode.EventEmitter<CLIProviderChangedEvent>`

**Location**: `extension/src/providers/cli/CLIProviderEvents.ts`

**Serves**:

- FR-004 (Immediate switching)
- FR-005 (History maintenance during switch)
- US-2 (Transparent switching)

### Event Definition

```typescript
/**
 * Event emitted when active CLI provider changes
 */
export interface CLIProviderChangedEvent {
  /** Event type discriminator */
  eventType: 'provider-changed';

  /** New provider ID */
  providerId: ProviderId;

  /** New provider display name */
  providerName: string;

  /** Previous provider ID (if any) */
  previousProviderId?: ProviderId;

  /** ISO-8601 timestamp of change */
  timestamp: string;

  /** Optional context about the change */
  reason?: 'user-setting' | 'auto-detection' | 'fallback';
}

/**
 * Event emitter for CLI provider events
 */
export const cliProviderEventEmitter =
  new vscode.EventEmitter<CLIProviderChangedEvent>();

/**
 * Event listener registration
 */
export const onCLIProviderChanged = cliProviderEventEmitter.event;
```

### Event Emission

```typescript
/**
 * Emit provider changed event
 * Called by handleCLIProviderChange() after successful switch
 */
function emitProviderChanged(
  newProvider: LLMProvider,
  oldProvider?: LLMProvider,
  reason?: 'user-setting' | 'auto-detection' | 'fallback'
): void {
  cliProviderEventEmitter.fire({
    eventType: 'provider-changed',
    providerId: newProvider.id,
    providerName: newProvider.name,
    previousProviderId: oldProvider?.id,
    timestamp: new Date().toISOString(),
    reason,
  });
}
```

### Event Listeners

#### AutonomousDriver Listener

**Location**: `extension/src/autonomous/AutonomousDriver.ts`

```typescript
/**
 * Listen for provider changes and update internal provider reference
 */
export class AutonomousDriver {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;

    // Listen for provider changes
    onCLIProviderChanged((event) => {
      this.handleProviderChange(event);
    });
  }

  private async handleProviderChange(
    event: CLIProviderChangedEvent
  ): Promise<void> {
    // Get new provider instance from factory
    const factory = getProviderFactory();
    const newProvider = factory.getProvider(event.providerId);

    // Update provider reference
    this.provider = newProvider;

    // Log the change
    console.log(`AutonomousDriver: Switched to ${event.providerName}`);
  }
}
```

#### ClaudeCodeBridge Listener

**Location**: `extension/src/claudeCodeBridge.ts`

```typescript
/**
 * Listen for provider changes and update bridge provider
 */
export class ClaudeCodeBridge {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;

    // Listen for provider changes
    onCLIProviderChanged((event) => {
      this.handleProviderChange(event);
    });
  }

  private async handleProviderChange(
    event: CLIProviderChangedEvent
  ): Promise<void> {
    // Get new provider instance
    const factory = getProviderFactory();
    this.provider = factory.getProvider(event.providerId);

    // Preserve conversation history (provider-agnostic)
    // No action needed - history is already stored in bridge
  }
}
```

#### UsageLogger Listener

**Location**: `extension/src/autonomous/UsageLogger.ts`

```typescript
/**
 * Listen for provider changes and switch usage adapter
 */
export class UsageLogger {
  private currentAdapter: CLIUsageAdapter;

  constructor() {
    // Initialize with current provider's adapter
    this.currentAdapter = this.getAdapterForProvider(this.getCurrentProvider());

    // Listen for provider changes
    onCLIProviderChanged((event) => {
      this.handleProviderChange(event);
    });
  }

  private handleProviderChange(event: CLIProviderChangedEvent): void {
    // Switch to new adapter
    this.currentAdapter = this.getAdapterForProvider(event.providerId);

    // Emit usage data update event to refresh UI
    usageDataEventEmitter.fire({
      eventType: 'provider-switched',
      providerId: event.providerId,
      timestamp: event.timestamp,
    });
  }

  private getAdapterForProvider(providerId: ProviderId): CLIUsageAdapter {
    if (providerId === 'claude-cli') {
      return new ClaudeCodeUsageAdapter();
    } else if (providerId === 'codex-cli') {
      return new CodexUsageAdapter();
    }
    // Fallback for API providers
    throw new Error(`No CLI usage adapter for provider: ${providerId}`);
  }
}
```

**Serves**:

- FR-005: Maintain history during provider switch
- US-2: Transparent switching without disruption

---

## 3. Custom Event: onCLIProviderAvailabilityChanged

**Description**: Event emitted when CLI provider availability status changes
(e.g., CLI becomes unavailable, authentication expires, version incompatibility
detected).

**Event Type**: `vscode.EventEmitter<CLIProviderAvailabilityChangedEvent>`

**Serves**:

- FR-011 (Installation error handling)
- FR-012 (Authentication error handling)
- US-3 (Auto-detection and helpful errors)

### Event Definition

```typescript
/**
 * Event emitted when CLI provider availability changes
 */
export interface CLIProviderAvailabilityChangedEvent {
  /** Event type discriminator */
  eventType: 'availability-changed';

  /** Provider ID */
  providerId: ProviderId;

  /** New availability status */
  status: ProviderStatus;

  /** ISO-8601 timestamp */
  timestamp: string;

  /** Error message if unavailable */
  errorMessage?: string;

  /** Installation instructions if not installed */
  installInstructions?: string;

  /** Authentication instructions if auth failed */
  authInstructions?: string;
}

/**
 * Event emitter for availability changes
 */
export const availabilityEventEmitter =
  new vscode.EventEmitter<CLIProviderAvailabilityChangedEvent>();

/**
 * Event listener registration
 */
export const onCLIProviderAvailabilityChanged = availabilityEventEmitter.event;
```

### Event Emission

**Trigger**: Health check results in `CLIHealthChecker.check()`

```typescript
/**
 * Emit availability changed event
 * Called after health check detects status change
 */
function emitAvailabilityChanged(
  providerId: ProviderId,
  healthResult: CLIHealthResult
): void {
  const status: ProviderStatus =
    healthResult.available && healthResult.authenticated
      ? 'available'
      : 'unavailable';

  availabilityEventEmitter.fire({
    eventType: 'availability-changed',
    providerId,
    status,
    timestamp: new Date().toISOString(),
    errorMessage: healthResult.errorMessage,
    installInstructions: healthResult.installInstructions,
    authInstructions: healthResult.authInstructions,
  });
}
```

### Event Listeners

#### Settings UI Status Indicator

**Location**: VSCode settings contribution (package.json)

```typescript
/**
 * Update settings UI with provider status indicator
 */
onCLIProviderAvailabilityChanged((event) => {
  // Update settings description to show status
  if (event.status === 'available') {
    updateSettingDescription(
      'gofer.cliProvider',
      `✓ ${event.providerId} is available`
    );
  } else {
    updateSettingDescription(
      'gofer.cliProvider',
      `✗ ${event.providerId}: ${event.errorMessage}`
    );
  }
});
```

#### Notification Handler

```typescript
/**
 * Show notification when provider becomes unavailable
 */
onCLIProviderAvailabilityChanged((event) => {
  if (event.status === 'unavailable') {
    const message = event.errorMessage || 'CLI provider is unavailable';
    const actions: string[] = [];

    if (event.installInstructions) {
      actions.push('Install');
    }
    if (event.authInstructions) {
      actions.push('Authenticate');
    }

    vscode.window.showWarningMessage(message, ...actions).then((selection) => {
      if (selection === 'Install' && event.installInstructions) {
        vscode.window.showInformationMessage(event.installInstructions);
      } else if (selection === 'Authenticate' && event.authInstructions) {
        vscode.window.showInformationMessage(event.authInstructions);
      }
    });
  }
});
```

**Serves**:

- FR-011: Display installation instructions
- FR-012: Display authentication instructions
- US-3: Helpful error notifications

---

## 4. Custom Event: onCLIProcessError

**Description**: Event emitted when CLI process encounters an error (spawn
failure, timeout, exit code non-zero).

**Event Type**: `vscode.EventEmitter<CLIProcessErrorEvent>`

**Serves**:

- FR-013 (Graceful CLI process failure handling)
- US-3 (Helpful errors)

### Event Definition

```typescript
/**
 * Event emitted when CLI process fails
 */
export interface CLIProcessErrorEvent {
  /** Event type discriminator */
  eventType: 'process-error';

  /** Provider ID */
  providerId: ProviderId;

  /** Error type */
  errorType: 'spawn-failed' | 'timeout' | 'exit-code' | 'parse-error';

  /** Error message */
  errorMessage: string;

  /** CLI command that was executed */
  command: string;

  /** Exit code (if applicable) */
  exitCode?: number;

  /** stderr output (if available) */
  stderr?: string;

  /** ISO-8601 timestamp */
  timestamp: string;

  /** Whether error is recoverable via retry */
  recoverable: boolean;
}

/**
 * Event emitter for CLI process errors
 */
export const processErrorEventEmitter =
  new vscode.EventEmitter<CLIProcessErrorEvent>();

/**
 * Event listener registration
 */
export const onCLIProcessError = processErrorEventEmitter.event;
```

### Event Emission

**Trigger**: CLI adapter error handling in `CLIProviderAdapter`

```typescript
/**
 * Emit process error event
 * Called when CLI process fails
 */
protected emitProcessError(
  errorType: CLIProcessErrorEvent['errorType'],
  error: Error,
  command: string,
  exitCode?: number,
  stderr?: string
): void {
  processErrorEventEmitter.fire({
    eventType: 'process-error',
    providerId: this.id,
    errorType,
    errorMessage: error.message,
    command,
    exitCode,
    stderr,
    timestamp: new Date().toISOString(),
    recoverable: errorType === 'timeout' || (exitCode !== undefined && exitCode < 128),
  });
}
```

### Event Listeners

#### Error Logger

```typescript
/**
 * Log CLI process errors to output channel
 */
onCLIProcessError((event) => {
  const outputChannel = vscode.window.createOutputChannel('Gofer CLI Errors');
  outputChannel.appendLine(`[${event.timestamp}] CLI Process Error:`);
  outputChannel.appendLine(`  Provider: ${event.providerId}`);
  outputChannel.appendLine(`  Type: ${event.errorType}`);
  outputChannel.appendLine(`  Command: ${event.command}`);
  outputChannel.appendLine(`  Message: ${event.errorMessage}`);
  if (event.exitCode !== undefined) {
    outputChannel.appendLine(`  Exit Code: ${event.exitCode}`);
  }
  if (event.stderr) {
    outputChannel.appendLine(`  stderr: ${event.stderr}`);
  }
  outputChannel.show(true);
});
```

#### Retry Handler

```typescript
/**
 * Automatic retry for recoverable errors
 */
onCLIProcessError(async (event) => {
  if (event.recoverable && shouldRetry(event.providerId)) {
    await retryWithBackoff(event.providerId, event.command);
  }
});
```

**Serves**:

- FR-013: Graceful error handling with retry
- NFR-005: Error validation and logging

---

## 5. Custom Event: onProviderSwitchCompleted

**Description**: Event emitted when provider switch has completed successfully
and all dependent components have been notified.

**Event Type**: `vscode.EventEmitter<ProviderSwitchCompletedEvent>`

**Serves**:

- FR-004 (Immediate switching)
- US-2 (Transparent switching)

### Event Definition

```typescript
/**
 * Event emitted when provider switch completes
 */
export interface ProviderSwitchCompletedEvent {
  /** Event type discriminator */
  eventType: 'switch-completed';

  /** New active provider */
  providerId: ProviderId;

  /** Switch duration in milliseconds */
  durationMs: number;

  /** ISO-8601 timestamp */
  timestamp: string;

  /** Components that were updated */
  componentsUpdated: string[];
}

/**
 * Event emitter for switch completion
 */
export const switchCompletedEventEmitter =
  new vscode.EventEmitter<ProviderSwitchCompletedEvent>();

/**
 * Event listener registration
 */
export const onProviderSwitchCompleted = switchCompletedEventEmitter.event;
```

### Event Emission

**Trigger**: End of `handleCLIProviderChange()` after all listeners complete

```typescript
/**
 * Emit switch completed event
 * Called after provider switch and all listener notifications
 */
async function handleCLIProviderChange(): Promise<void> {
  const startTime = Date.now();
  const componentsUpdated: string[] = [];

  try {
    // ... switch provider logic ...

    // Track components that were notified
    componentsUpdated.push(
      'AutonomousDriver',
      'ClaudeCodeBridge',
      'UsageLogger'
    );

    // Emit completion event
    switchCompletedEventEmitter.fire({
      eventType: 'switch-completed',
      providerId: provider.id,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      componentsUpdated,
    });
  } catch (error) {
    // Handle error...
  }
}
```

### Event Listeners

#### Performance Monitor

```typescript
/**
 * Monitor provider switch performance
 */
onProviderSwitchCompleted((event) => {
  if (event.durationMs > 500) {
    console.warn(`Provider switch took ${event.durationMs}ms (target: <500ms)`);
  }
});
```

**Serves**:

- NFR-001: Provider switching completes in <500ms

---

## 6. Custom Event: onUsageDataUpdated

**Description**: Event emitted when CLI usage data is updated (new log entries
parsed, provider switched, usage aggregated).

**Event Type**: `vscode.EventEmitter<UsageDataUpdatedEvent>`

**Serves**:

- FR-017 (Token usage tracking)
- FR-020 (Display in usage panel)
- US-5 (Usage tracking across providers)

### Event Definition

```typescript
/**
 * Event emitted when usage data is updated
 */
export interface UsageDataUpdatedEvent {
  /** Event type discriminator */
  eventType: 'usage-updated' | 'provider-switched';

  /** Provider that generated the usage */
  providerId: ProviderId;

  /** New usage entries added */
  newEntries?: UsageEntry[];

  /** Updated aggregate totals */
  aggregateTotals?: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
  };

  /** ISO-8601 timestamp */
  timestamp: string;
}

/**
 * Event emitter for usage data updates
 */
export const usageDataEventEmitter =
  new vscode.EventEmitter<UsageDataUpdatedEvent>();

/**
 * Event listener registration
 */
export const onUsageDataUpdated = usageDataEventEmitter.event;
```

### Event Emission

**Trigger**: After CLI query completes and usage is logged

```typescript
/**
 * Emit usage data updated event
 * Called by UsageLogger after parsing new log entries
 */
function emitUsageDataUpdated(
  providerId: ProviderId,
  newEntries: UsageEntry[],
  aggregateTotals: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
  }
): void {
  usageDataEventEmitter.fire({
    eventType: 'usage-updated',
    providerId,
    newEntries,
    aggregateTotals,
    timestamp: new Date().toISOString(),
  });
}
```

### Event Listeners

#### AI Usage Panel Refresh

**Location**: AI Usage Panel webview

```typescript
/**
 * Refresh usage panel when data updates
 */
onUsageDataUpdated((event) => {
  // Update webview with new usage data
  aiUsagePanel.webview.postMessage({
    command: 'updateUsage',
    providerId: event.providerId,
    entries: event.newEntries,
    totals: event.aggregateTotals,
  });
});
```

#### Cost Alert Monitor

```typescript
/**
 * Monitor usage for budget thresholds
 */
onUsageDataUpdated((event) => {
  const budgetMax = ConfigManager.getInstance().getBudgetMaxCostUsd();

  if (event.aggregateTotals && event.aggregateTotals.totalCostUsd > budgetMax) {
    vscode.window.showWarningMessage(
      `CLI usage cost ($${event.aggregateTotals.totalCostUsd.toFixed(2)}) exceeds budget ($${budgetMax.toFixed(2)})`,
      'View Usage',
      'Adjust Budget'
    );
  }
});
```

**Serves**:

- FR-017: Track usage separately per provider
- FR-020: Display provider name in panel
- US-5: Aggregate usage across providers

---

## Event Coordination Sequence

### Provider Switch Flow

```
User changes gofer.cliProvider setting
         ↓
vscode.workspace.onDidChangeConfiguration fires
         ↓
handleCLIProviderChange() called
         ↓
1. ConfigManager.refresh()
2. getPreferredCLIProvider()
3. ProviderFactory.createCLIProvider()
4. updateActiveCLIProvider()
         ↓
onCLIProviderChanged event emitted
         ↓
Listeners update:
  - AutonomousDriver updates provider reference
  - ClaudeCodeBridge updates provider reference
  - UsageLogger switches adapter
         ↓
onProviderSwitchCompleted event emitted
         ↓
User notification: "CLI provider switched to {name}"
```

### Auto-Detection Flow

```
Extension activation
         ↓
ProviderFactory.autoDetectCLI()
         ↓
Parallel health checks:
  - isCLIAvailable('claude')
  - isCLIAvailable('codex')
         ↓
First available CLI detected → 'claude' | 'codex' | null
         ↓
If found:
  onCLIProviderChanged event emitted
  onProviderSwitchCompleted event emitted
If not found:
  onCLIProviderAvailabilityChanged event emitted
  User notification with install instructions
```

### CLI Process Error Flow

```
CLI query executed
         ↓
Process spawn fails OR timeout OR exit code non-zero
         ↓
CLIProviderAdapter.mapExitCodeToError()
         ↓
onCLIProcessError event emitted
         ↓
Listeners respond:
  - Error logger writes to output channel
  - Retry handler attempts recovery (if recoverable)
  - Availability tracker updates status
         ↓
If persistent failure:
  onCLIProviderAvailabilityChanged event emitted
  Provider status set to 'unavailable'
```

---

## Event Summary

### Total Events: 6

| #   | Event                            | Type                | Trigger         | Listeners                       |
| --- | -------------------------------- | ------------------- | --------------- | ------------------------------- |
| 1   | onDidChangeConfiguration         | VSCode Built-in     | Settings change | 1 (handleCLIProviderChange)     |
| 2   | onCLIProviderChanged             | Custom EventEmitter | Provider switch | 3 (Driver, Bridge, Logger)      |
| 3   | onCLIProviderAvailabilityChanged | Custom EventEmitter | Health check    | 2 (Settings UI, Notifications)  |
| 4   | onCLIProcessError                | Custom EventEmitter | CLI failure     | 2 (Error logger, Retry handler) |
| 5   | onProviderSwitchCompleted        | Custom EventEmitter | Switch done     | 1 (Performance monitor)         |
| 6   | onUsageDataUpdated               | Custom EventEmitter | Usage tracked   | 2 (Usage panel, Budget monitor) |

### User Stories Served

| Event                            | US-1 | US-2 | US-3 | US-4 | US-5 |
| -------------------------------- | ---- | ---- | ---- | ---- | ---- |
| onDidChangeConfiguration         | ✓    | ✓    |      |      |      |
| onCLIProviderChanged             |      | ✓    |      |      |      |
| onCLIProviderAvailabilityChanged |      |      | ✓    |      |      |
| onCLIProcessError                |      |      | ✓    |      |      |
| onProviderSwitchCompleted        |      | ✓    |      |      |      |
| onUsageDataUpdated               |      |      |      |      | ✓    |

**Legend**:

- US-1: Provider Selection
- US-2: Transparent Provider Switching
- US-3: Auto-Detection and Helpful Errors
- US-4: Provider-Specific Feature Graceful Degradation
- US-5: Usage Tracking Across Providers

### Functional Requirements Served

**Provider Switching**: FR-004 (immediate switching via config events) **History
Maintenance**: FR-005 (onCLIProviderChanged preserves history) **Error
Handling**: FR-011, FR-012, FR-013 (availability and process error events)
**Usage Tracking**: FR-017, FR-020 (onUsageDataUpdated)

---

## Event Testing Strategy

### Unit Tests

```typescript
describe('CLI Provider Events', () => {
  it('should emit onCLIProviderChanged when provider switches', async () => {
    const listener = jest.fn();
    onCLIProviderChanged(listener);

    await handleCLIProviderChange();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'provider-changed',
        providerId: 'codex-cli',
      })
    );
  });

  it('should emit onCLIProviderAvailabilityChanged when health check fails', async () => {
    const listener = jest.fn();
    onCLIProviderAvailabilityChanged(listener);

    await mockHealthCheckFailure('claude-cli');

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'availability-changed',
        status: 'unavailable',
        errorMessage: expect.any(String),
      })
    );
  });

  it('should emit onCLIProcessError on CLI spawn failure', async () => {
    const listener = jest.fn();
    onCLIProcessError(listener);

    await mockCLISpawnFailure();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'process-error',
        errorType: 'spawn-failed',
      })
    );
  });
});
```

### Integration Tests

```typescript
describe('Provider Switch Integration', () => {
  it('should coordinate events when provider switches', async () => {
    const events: string[] = [];

    onCLIProviderChanged(() => events.push('provider-changed'));
    onProviderSwitchCompleted(() => events.push('switch-completed'));

    await vscode.workspace
      .getConfiguration('gofer')
      .update('cliProvider', 'codex', vscode.ConfigurationTarget.Global);

    // Wait for async event handling
    await sleep(100);

    expect(events).toEqual(['provider-changed', 'switch-completed']);
  });
});
```

### E2E Tests

```typescript
describe('Provider Switch E2E', () => {
  it('should switch from Claude to Codex and maintain functionality', async () => {
    // Start with Claude
    await vscode.workspace
      .getConfiguration('gofer')
      .update('cliProvider', 'claude', vscode.ConfigurationTarget.Global);

    // Run pipeline stage
    const claudeResult = await runPipelineStage('gofer_plan');

    // Switch to Codex
    await vscode.workspace
      .getConfiguration('gofer')
      .update('cliProvider', 'codex', vscode.ConfigurationTarget.Global);

    // Run same pipeline stage
    const codexResult = await runPipelineStage('gofer_plan');

    // Both should succeed with same structure
    expect(claudeResult.success).toBe(true);
    expect(codexResult.success).toBe(true);
    expect(claudeResult.outputStructure).toEqual(codexResult.outputStructure);
  });
});
```

---

## Performance Considerations

### Event Throttling

For high-frequency events (e.g., usage data updates), implement throttling:

```typescript
/**
 * Throttled usage data event emitter
 * Batches events within 1000ms window
 */
let usageUpdateBatch: UsageEntry[] = [];
let usageUpdateTimer: NodeJS.Timeout | null = null;

function emitUsageDataUpdatedThrottled(entry: UsageEntry): void {
  usageUpdateBatch.push(entry);

  if (usageUpdateTimer) {
    clearTimeout(usageUpdateTimer);
  }

  usageUpdateTimer = setTimeout(() => {
    if (usageUpdateBatch.length > 0) {
      usageDataEventEmitter.fire({
        eventType: 'usage-updated',
        providerId: entry.providerId,
        newEntries: usageUpdateBatch,
        timestamp: new Date().toISOString(),
      });
      usageUpdateBatch = [];
    }
  }, 1000);
}
```

### Event Listener Cleanup

Ensure event listeners are disposed when components are deactivated:

```typescript
export function deactivate() {
  cliProviderEventEmitter.dispose();
  availabilityEventEmitter.dispose();
  processErrorEventEmitter.dispose();
  switchCompletedEventEmitter.dispose();
  usageDataEventEmitter.dispose();
}
```

---

## Backward Compatibility

All custom events are new additions and do not affect existing functionality:

- No breaking changes to existing event listeners
- VSCode `onDidChangeConfiguration` listener is additive (checks specific
  settings)
- Event emitters follow VSCode EventEmitter pattern for consistency
- Dispose pattern ensures cleanup during deactivation

Default behavior (auto-detection preferring Claude) maintains backward
compatibility with existing hardcoded Claude CLI dependency.
