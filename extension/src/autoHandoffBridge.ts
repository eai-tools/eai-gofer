/**
 * Bridge module for wiring Claude Code terminal to AutoHandoffTrigger.
 *
 * Extracted from extension.ts to break the circular dependency:
 *   extension.ts → autonomousCommands.ts → extension.ts
 *
 * Both modules now import from this bridge instead of each other.
 */

import type * as vscode from 'vscode';
import type { AutoHandoffTrigger } from './autonomous/AutoHandoffTrigger';

let autoHandoffInstance: AutoHandoffTrigger | undefined;

/**
 * Register the AutoHandoffTrigger instance (called from extension.ts).
 */
export function setAutoHandoffTrigger(trigger: AutoHandoffTrigger | undefined): void {
  autoHandoffInstance = trigger;
}

/**
 * Wire a VSCode terminal to AutoHandoffTrigger for automated
 * context save/resume when Claude Code is launched in normal terminal mode
 * (called from ContextHealthStatusBar).
 */
export function wireClaudeTerminalToAutoHandoff(terminal: vscode.Terminal | null): void {
  if (autoHandoffInstance) {
    autoHandoffInstance.setClaudeVscodeTerminal(terminal);
  }
}
