/**
 * Bridge module for wiring Claude Code PTY to AutoHandoffTrigger.
 *
 * Extracted from extension.ts to break the circular dependency:
 *   extension.ts → autonomousCommands.ts → extension.ts
 *
 * Both modules now import from this bridge instead of each other.
 */

import type { AutoHandoffTrigger } from './autonomous/AutoHandoffTrigger';

let autoHandoffInstance: AutoHandoffTrigger | undefined;

/**
 * Register the AutoHandoffTrigger instance (called from extension.ts).
 */
export function setAutoHandoffTrigger(trigger: AutoHandoffTrigger | undefined): void {
  autoHandoffInstance = trigger;
}

/**
 * Wire a Claude Code PTY process to AutoHandoffTrigger for automated
 * context save/resume (called from autonomousCommands.ts).
 */
export function wireClaudePtyToAutoHandoff(pty: any): void {
  if (autoHandoffInstance) {
    autoHandoffInstance.setClaudePtyProcess(pty);
  }
}
