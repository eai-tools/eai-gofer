/**
 * LLM Council Commands
 *
 * VSCode commands for managing and displaying LLM Council providers.
 */

import * as vscode from 'vscode';
import { getProviderFactory, ProviderFactory } from '../council/providers';
import { PROVIDER_NAMES, DEFAULT_MODELS } from '../council/types';
import { getUsageLogger } from '../council/UsageLogger';

/**
 * Display current provider status in an information message
 */
export async function showProviderStatus(): Promise<void> {
  const factory = getProviderFactory();
  const providerIds = ['anthropic', 'google', 'openai'] as const;

  const statusLines: string[] = [];
  const availableProviders: string[] = [];
  const unavailableProviders: string[] = [];

  for (const providerId of providerIds) {
    const apiKey = factory.getApiKey(providerId);
    const hasKey = !!apiKey;
    const providerName = PROVIDER_NAMES[providerId];

    if (hasKey) {
      try {
        const provider = factory.createProvider(providerId);
        const isHealthy = await provider.healthCheck();

        if (isHealthy) {
          availableProviders.push(providerName);
          statusLines.push(`✅ ${providerName}: Available (${provider.model})`);
        } else {
          unavailableProviders.push(providerName);
          statusLines.push(`⚠️ ${providerName}: API key configured but validation failed`);
        }
      } catch (error) {
        unavailableProviders.push(providerName);
        const message = error instanceof Error ? error.message : 'Unknown error';
        statusLines.push(`❌ ${providerName}: Error - ${message}`);
      }
    } else {
      statusLines.push(`⚪ ${providerName}: Not configured`);
    }
  }

  // Build summary
  const summary =
    availableProviders.length > 0
      ? `${availableProviders.length} provider(s) available`
      : 'No providers configured';

  // Show output in output channel for detailed view
  const outputChannel = vscode.window.createOutputChannel('LLM Council Status');
  outputChannel.clear();
  outputChannel.appendLine('=== LLM Council Provider Status ===\n');
  outputChannel.appendLine(`Summary: ${summary}\n`);
  outputChannel.appendLine('Provider Details:');
  statusLines.forEach((line) => outputChannel.appendLine(`  ${line}`));
  outputChannel.appendLine(
    '\nTo configure providers, go to Settings > Gofer and add your API keys.'
  );

  // Add usage summary if workspace is available
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const usageLogger = getUsageLogger(workspaceFolders[0].uri.fsPath);
    try {
      const usageSummary = await usageLogger.getUsageSummary();
      if (usageSummary.totalSessions > 0) {
        outputChannel.appendLine('\n' + usageLogger.formatSummary(usageSummary));
      } else {
        outputChannel.appendLine('\n=== LLM Council Usage Summary ===\n');
        outputChannel.appendLine('No usage data recorded yet.');
      }
    } catch (error) {
      console.warn(
        '[Gofer] Failed to load council usage summary:',
        error instanceof Error ? error.message : error
      );
    }
  }

  outputChannel.show();

  // Also show a quick information message
  if (availableProviders.length > 0) {
    vscode.window
      .showInformationMessage(`LLM Council: ${availableProviders.join(', ')} ready`, 'Show Details')
      .then((selection) => {
        if (selection === 'Show Details') {
          outputChannel.show();
        }
      });
  } else {
    vscode.window
      .showWarningMessage(
        'LLM Council: No providers configured. Add API keys in Settings > Gofer.',
        'Open Settings'
      )
      .then((selection) => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'gofer');
        }
      });
  }
}

/**
 * Check health of all configured providers
 */
export async function checkAllProviderHealth(): Promise<{
  available: string[];
  unavailable: string[];
}> {
  const factory = getProviderFactory();
  const providerIds = ['anthropic', 'google', 'openai'] as const;

  const available: string[] = [];
  const unavailable: string[] = [];

  for (const providerId of providerIds) {
    const apiKey = factory.getApiKey(providerId);
    if (!apiKey) {
      continue;
    }

    try {
      const provider = factory.createProvider(providerId);
      const isHealthy = await provider.healthCheck();

      if (isHealthy) {
        available.push(providerId);
      } else {
        unavailable.push(providerId);
      }
    } catch {
      unavailable.push(providerId);
    }
  }

  return { available, unavailable };
}

/**
 * Register all council-related commands
 */
export function registerCouncilCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.showCouncilStatus', showProviderStatus)
  );
}
