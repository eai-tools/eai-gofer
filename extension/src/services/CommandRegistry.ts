/**
 * Command Registry Service
 *
 * Centralized command registration for all Gofer VSCode commands.
 * Extracted from extension.ts:registerCommands() (1156 LOC → <600 LOC).
 *
 * Engineering Remediation Phase 3 - T020
 */

import { injectable } from 'tsyringe';
import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './Logger';
import { GoferMigrator } from '../goferMigrator';

/**
 * Dependencies required for command registration
 *
 * These are module-level globals from extension.ts that commands need access to.
 * In T025, these will be converted to injectable services.
 */
export interface CommandDependencies {
  workspacePath: string;
  migrator: GoferMigrator;
  progressProvider?: any;
  constitutionProvider?: any;
  memoryProvider?: any;
  contextWindowProvider?: any;
  branchSpecManager?: any;
  sharedContextBuilder?: any;
  memoryManager?: any;
  scopeGuard?: any;
  researchChunker?: any;
  isUpgrading: () => boolean;
  setUpgradeState: (state: boolean) => void;
}

/**
 * Command Registry Service
 *
 * Registers all Gofer commands with VSCode.
 * Preserves all existing command IDs for backward compatibility.
 */
@injectable()
export class CommandRegistry {
  private workspaceCommandsRegistered = false;

  constructor(private readonly logger: Logger) {}

  /**
   * Register all workspace-specific commands
   *
   * @param context - VSCode extension context
   * @param deps - Command dependencies
   */
  public registerAll(context: vscode.ExtensionContext, deps: CommandDependencies): void {
    // Guard against duplicate registration
    if (this.workspaceCommandsRegistered) {
      this.logger.warn('CommandRegistry', 'Commands already registered, skipping');
      return;
    }

    this.workspaceCommandsRegistered = true;
    this.logger.info('CommandRegistry', 'Registering workspace commands');

    // Register command groups
    this.registerUpgradeCommands(context, deps);
    this.registerSpecCommands(context, deps);
    this.registerMemoryCommands(context, deps);
    this.registerClaudeCodeCommands(context, deps);
    this.registerViewCommands(context, deps);
    this.registerCheckpointCommands(context, deps);
    this.registerSlopCommands(context, deps);

    this.logger.info('CommandRegistry', 'All workspace commands registered successfully');
  }

  /**
   * Register upgrade and migration commands
   */
  private registerUpgradeCommands(
    context: vscode.ExtensionContext,
    deps: CommandDependencies
  ): void {
    // gofer.upgrade - Upgrade .specify format
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.upgrade', async () => {
        await deps.migrator.upgrade();
        deps.progressProvider?.refresh();
      })
    );

    // gofer.checkVersion - Show version info
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.checkVersion', async () => {
        const versionInfo = await deps.migrator.getVersionInfo();
        const choice = await vscode.window.showInformationMessage(
          `Gofer Status:\n\nFormat: ${versionInfo.format}\n${versionInfo.details}`,
          versionInfo.needsUpgrade ? 'Upgrade' : 'OK'
        );
        if (choice === 'Upgrade') {
          vscode.commands.executeCommand('gofer.upgrade');
        }
      })
    );

    // gofer.fixSpecPaths - Fix path references
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.fixSpecPaths', async () => {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Fixing spec path references...',
            cancellable: false,
          },
          async () => {
            await (deps.migrator as any).fixSpecPathReferences();
            vscode.window.showInformationMessage(
              'Spec paths fixed! All scripts now use .specify/specs/ instead of specs/',
              'OK'
            );
          }
        );
      })
    );

    // gofer.updateTemplates - Update templates
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.updateTemplates', async () => {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
          vscode.window.showErrorMessage('No workspace folder open');
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Updating Gofer Templates',
            cancellable: false,
          },
          async (progress) => {
            try {
              const { TemplateDownloader } = await import('../templateDownloader');
              const cacheDir = path.join(context.globalStorageUri.fsPath, 'templates');
              const downloader = TemplateDownloader.getInstance(cacheDir);

              const manifest = await downloader.downloadLatestTemplates(workspacePath, {
                force: true,
                progress: (update) => {
                  progress.report({
                    message: update.message,
                    increment: update.progress ? update.progress / 5 : undefined,
                  });
                },
              });

              vscode.window.showInformationMessage(
                `✅ Templates updated to version ${manifest.version}`
              );
              deps.progressProvider?.refresh();
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to update templates: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
        );
      })
    );
  }

  /**
   * Register spec-related commands
   */
  private registerSpecCommands(context: vscode.ExtensionContext, deps: CommandDependencies): void {
    // gofer.createSpec - Create new specification
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.createSpec', async () => {
        const specName = await vscode.window.showInputBox({
          prompt: 'Enter specification name (e.g., "user-authentication")',
          placeHolder: 'my-feature',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Specification name is required';
            }
            if (!/^[a-z0-9-]+$/.test(value.trim())) {
              return 'Name must be lowercase with dashes only (a-z, 0-9, -)';
            }
            return null;
          },
        });

        if (!specName) return;

        const specsPath = path.join(deps.workspacePath, '.specify', 'specs', specName.trim());
        const specFile = path.join(specsPath, 'spec.md');

        try {
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(specsPath));

          const specTitle = specName
            .trim()
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());

          const specTemplate = this.generateSpecTemplate(specName.trim(), specTitle);
          await vscode.workspace.fs.writeFile(vscode.Uri.file(specFile), Buffer.from(specTemplate));

          const doc = await vscode.workspace.openTextDocument(specFile);
          await vscode.window.showTextDocument(doc);

          deps.progressProvider?.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to create spec: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    // gofer.openSpec - Open spec file
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.openSpec', async (uri?: vscode.Uri) => {
        const specFile = uri?.fsPath || '';
        if (!specFile) return;

        try {
          const doc = await vscode.workspace.openTextDocument(specFile);
          await vscode.window.showTextDocument(doc);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to open spec: ${error}`);
        }
      })
    );
  }

  /**
   * Register memory-related commands
   */
  private registerMemoryCommands(
    context: vscode.ExtensionContext,
    deps: CommandDependencies
  ): void {
    // Memory commands are registered separately in registerMemoryCommands
    // This is a placeholder for future consolidation
  }

  /**
   * Register Claude Code terminal commands
   */
  private registerClaudeCodeCommands(
    context: vscode.ExtensionContext,
    deps: CommandDependencies
  ): void {
    // Claude Code commands (start, stop, pause, resume)
    // are registered in autonomousCommands.ts and imported separately
    // This is a placeholder for future consolidation
  }

  /**
   * Register view-related commands (show details, refresh, etc.)
   */
  private registerViewCommands(context: vscode.ExtensionContext, deps: CommandDependencies): void {
    // gofer.refreshSpecs
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.refreshSpecs', () => {
        deps.progressProvider?.refresh();
      })
    );

    // gofer.refreshConstitution
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.refreshConstitution', () => {
        deps.constitutionProvider?.refresh();
      })
    );

    // gofer.refreshMemory
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.refreshMemory', () => {
        deps.memoryProvider?.refresh();
      })
    );

    // gofer.refreshContextWindow
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.refreshContextWindow', () => {
        deps.contextWindowProvider?.refresh();
      })
    );

    // Show details commands
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.showSpecDetails', async (item: any) => {
        if (item?.uri) {
          const doc = await vscode.workspace.openTextDocument(item.uri);
          await vscode.window.showTextDocument(doc);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.showTaskDetails', async (item: any) => {
        if (item?.uri) {
          const doc = await vscode.workspace.openTextDocument(item.uri);
          await vscode.window.showTextDocument(doc);
        }
      })
    );
  }

  /**
   * Register checkpoint and rollback commands
   */
  private registerCheckpointCommands(
    context: vscode.ExtensionContext,
    deps: CommandDependencies
  ): void {
    // gofer.createPreOpCheckpoint
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.createPreOpCheckpoint', async () => {
        vscode.window.showInformationMessage('Checkpoint feature coming soon!');
      })
    );

    // gofer.rollbackToCheckpoint
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.rollbackToCheckpoint', async () => {
        vscode.window.showInformationMessage('Rollback feature coming soon!');
      })
    );

    // gofer.viewCompactionHistory
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.viewCompactionHistory', async () => {
        const historyPath = path.join(
          deps.workspacePath,
          '.specify',
          'logs',
          'compaction-history.jsonl'
        );
        try {
          const doc = await vscode.workspace.openTextDocument(historyPath);
          await vscode.window.showTextDocument(doc);
        } catch {
          vscode.window.showWarningMessage('No compaction history found');
        }
      })
    );

    // gofer.resumeSession
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.resumeSession', async () => {
        vscode.window.showInformationMessage('Resume session feature coming soon!');
      })
    );
  }

  /**
   * Register slop detection and reduction commands
   */
  private registerSlopCommands(context: vscode.ExtensionContext, deps: CommandDependencies): void {
    // gofer.checkForSlop
    context.subscriptions.push(
      vscode.commands.registerCommand('gofer.checkForSlop', async () => {
        if (!deps.scopeGuard) {
          vscode.window.showWarningMessage('ScopeGuard not initialized');
          return;
        }

        const violations = deps.scopeGuard.getViolations();
        if (violations.length === 0) {
          vscode.window.showInformationMessage('✅ No slop patterns detected');
        } else {
          vscode.window.showWarningMessage(
            `⚠️ Found ${violations.length} slop violations. Check Problems panel.`
          );
        }
      })
    );
  }

  /**
   * Generate spec template content
   */
  private generateSpecTemplate(specName: string, specTitle: string): string {
    return `---
id: "${specName}"
title: "${specTitle}"
status: "draft"
created: "${new Date().toISOString().split('T')[0]}"
priority: "P1"
---

# Feature Specification: ${specTitle}

<!--
  To generate a complete implementation, use the Gofer pipeline in Claude Code:
  /0_business_scenario ${specTitle}

  Or run individual stages:
  /1_gofer_research  → Creates research.md
  /2_gofer_specify   → Updates this spec.md
  /3_gofer_plan      → Creates plan.md, data-model.md, contracts/
  /4_gofer_tasks     → Creates tasks.md
  /5_gofer_implement → Implements the code
  /6_gofer_validate  → Validates implementation
-->

## User Scenarios & Testing

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]

### Non-Functional Requirements

- **NFR-001**: Performance - [requirement]
- **NFR-002**: Security - [requirement]

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| [Metric 1] | [Target] | [How measured] |

## Assumptions

- [Assumption 1]
- [Assumption 2]

## Out of Scope

- [What this feature does NOT include]
`;
  }
}
