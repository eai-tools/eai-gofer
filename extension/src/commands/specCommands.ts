/**
 * Spec Execution Commands
 *
 * Provides commands for executing specifications with dependency ordering.
 * - Execute All Pending Specs (with topological sort)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ProgressProvider } from '../progressProvider';
import type { Spec } from '../goferParser';
import { Logger } from '../utils/logger';

const logger = Logger.for('SpecCommands');

/**
 * Registers all spec execution commands.
 *
 * @param context - VSCode extension context
 * @param progressProvider - ProgressProvider instance
 */
export function registerSpecCommands(
  context: vscode.ExtensionContext,
  progressProvider: ProgressProvider
): void {
  // T116: Register "Execute All Pending Specs" command
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.executeAllPendingSpecs', async () => {
      await executeAllPendingSpecsCommand(progressProvider);
    })
  );

  // Hydrate Spec integration
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.hydrateSpec', async (uri: vscode.Uri) => {
      await hydrateSpecCommand(context, uri);
    })
  );
}

/**
 * Hydrates a spec from existing code using RPI prompt.
 */
async function hydrateSpecCommand(
  context: vscode.ExtensionContext,
  uri?: vscode.Uri
): Promise<void> {
  const targetPath = uri ? uri.fsPath : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!targetPath) {
    vscode.window.showErrorMessage('No workspace or folder selected.');
    return;
  }

  try {
    const promptPath = path.join(
      context.extensionPath,
      'resources',
      'claude-commands',
      'gofer_hydrate.md'
    );
    const promptContent = await fs.readFile(promptPath, 'utf-8');

    // Copy to clipboard
    await vscode.env.clipboard.writeText(promptContent);

    vscode.window
      .showInformationMessage(
        `Hydrate Prompt copied to clipboard! Run it in Claude Code to generate specs for: ${path.basename(targetPath)}`,
        'Open Terminal'
      )
      .then((selection) => {
        if (selection === 'Open Terminal') {
          vscode.commands.executeCommand('workbench.action.terminal.toggleTerminal');
        }
      });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to load hydrate prompt: ${(err as Error).message}`);
  }
}

/**
 * T116: "Execute All Pending Specs" command implementation.
 *
 * Gets all pending specs and executes them in dependency-respecting order
 * using topological sort from the DependencyGraph.
 *
 * @param progressProvider - ProgressProvider instance
 */
async function executeAllPendingSpecsCommand(progressProvider: ProgressProvider): Promise<void> {
  try {
    // Get dependency graph
    const dependencyGraph = progressProvider.getDependencyGraph();

    // Get all specs from the progress provider
    const allSpecs = await getAllSpecs(progressProvider);

    if (allSpecs.length === 0) {
      vscode.window.showInformationMessage('No specs found in workspace.');
      return;
    }

    // Filter pending specs (status: 'draft', 'ready', or 'in_progress')
    const pendingSpecs = allSpecs.filter(
      (spec) => spec.status === 'draft' || spec.status === 'ready' || spec.status === 'in_progress'
    );

    if (pendingSpecs.length === 0) {
      vscode.window.showInformationMessage(
        'No pending specs to execute. All specs are completed or blocked.'
      );
      return;
    }

    // Extract spec IDs
    const pendingSpecIds = pendingSpecs.map((spec) => spec.id);

    // Get topologically sorted execution order
    let executionOrder: string[];
    try {
      executionOrder = dependencyGraph.getExecutionOrder(pendingSpecIds);
    } catch (error) {
      // Handle cycle detection errors
      if (error instanceof Error && error.message.includes('cycles detected')) {
        vscode.window.showErrorMessage(
          `Cannot execute specs: Circular dependencies detected.\n\n${error.message}`
        );
        return;
      }
      throw error;
    }

    // Show confirmation dialog with execution order
    const orderList = executionOrder
      .map((id, index) => {
        const spec = pendingSpecs.find((s) => s.id === id);
        const title = spec ? spec.title : id;
        return `${index + 1}. ${title} (${id})`;
      })
      .join('\n');

    const message = `Execute ${executionOrder.length} pending specs in dependency order?\n\n${orderList}`;

    const choice = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Execute All',
      'Cancel'
    );

    if (choice !== 'Execute All') {
      return; // User cancelled
    }

    // Execute specs in order
    let successCount = 0;
    let failedCount = 0;
    const failedSpecs: string[] = [];

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Executing pending specs',
        cancellable: false,
      },
      async (progress) => {
        for (let i = 0; i < executionOrder.length; i++) {
          const specId = executionOrder[i];
          const spec = pendingSpecs.find((s) => s.id === specId);

          if (!spec) {
            continue;
          }

          // Report progress
          const progressPercent = (i / executionOrder.length) * 100;
          progress.report({
            message: `${i + 1}/${executionOrder.length}: ${spec.title}`,
            increment: progressPercent,
          });

          // Execute the spec
          try {
            await executeSpec(spec);
            successCount++;
          } catch (error) {
            failedCount++;
            failedSpecs.push(spec.id);
            const resolvedError = error instanceof Error ? error : new Error(String(error));
            logger.error(`Failed to execute spec ${spec.id}`, resolvedError, {
              specId: spec.id,
            });
          }
        }
      }
    );

    // Show completion message
    if (failedCount === 0) {
      vscode.window.showInformationMessage(
        `✓ Successfully executed ${successCount} specs in dependency order.`
      );
    } else {
      vscode.window.showWarningMessage(
        `Executed ${successCount} specs successfully, ${failedCount} failed:\n${failedSpecs.join(', ')}`
      );
    }

    // Refresh the tree view
    progressProvider.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to execute pending specs: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all specs from the ProgressProvider.
 *
 * This is a helper function that accesses the private specs array via getChildren.
 *
 * @param progressProvider - ProgressProvider instance
 * @returns Array of all specs
 */
async function getAllSpecs(progressProvider: ProgressProvider): Promise<Spec[]> {
  const rootItems = await progressProvider.getChildren();
  const specs: Spec[] = [];

  for (const item of rootItems) {
    if (item.spec) {
      specs.push(item.spec);
    }
  }

  return specs;
}

/**
 * Execute a single spec using autonomous execution.
 *
 * This is a placeholder that will be enhanced by T117-T119 with pre-execution checks.
 *
 * @param spec - Spec to execute
 */
async function executeSpec(spec: Spec): Promise<void> {
  // T116: Basic execution - trigger autonomous execution command
  // This will be enhanced in T117-T119 with dependency checks
  await vscode.commands.executeCommand('gofer.startAutonomous', spec);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    const errnoError = error as NodeJS.ErrnoException;
    if (errnoError.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * Show spec picker for Claude Code Terminal Integration
 *
 * Displays a quick pick menu of all available specs and returns the selected one.
 *
 * @returns Selected spec object with id, or undefined if cancelled
 */
export async function showSpecPicker(): Promise<Spec | undefined> {
  // Get workspace path
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return undefined;
  }

  let workspacePath = workspaceFolder.uri.fsPath;

  // Check if .specify/specs exists, if not check parent directory
  const specsPath = path.join(workspacePath, '.specify', 'specs');

  try {
    if (!(await pathExists(specsPath))) {
      const parentPath = path.dirname(workspacePath);
      const parentSpecsPath = path.join(parentPath, '.specify', 'specs');

      if (await pathExists(parentSpecsPath)) {
        workspacePath = parentPath;
      }
    }

    const progressProvider = new ProgressProvider(workspacePath);
    const specs = await getAllSpecs(progressProvider);

    if (specs.length === 0) {
      vscode.window.showWarningMessage('No specs found in .specify/specs/');
      return undefined;
    }

    const items = specs.map((spec) => ({
      label: spec.title || spec.id,
      description: spec.id,
      detail: spec.description || '',
      spec: spec,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a specification to execute with Claude Code',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    return selected?.spec;
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to load specs for picker', resolvedError, { workspacePath });
    vscode.window.showErrorMessage(`Failed to load specs: ${resolvedError.message}`);
    return undefined;
  }
}
