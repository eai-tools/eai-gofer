/**
 * Spec Execution Commands
 *
 * Provides commands for executing specifications with dependency ordering.
 * - Execute All Pending Specs (with topological sort)
 */

import * as vscode from 'vscode';
import type { ProgressProvider } from '../progressProvider';
import type { Spec } from '../specKitParser';

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
    vscode.commands.registerCommand('specGofer.executeAllPendingSpecs', async () => {
      await executeAllPendingSpecsCommand(progressProvider);
    })
  );
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
            console.error(`[SpecGofer] Failed to execute spec ${spec.id}:`, error);
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
  await vscode.commands.executeCommand('specGofer.startAutonomous', spec);
}
