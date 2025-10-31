/**
 * Terminal Manager
 *
 * Manages Claude Code terminal lifecycle: creation, command sending,
 * output capture, health monitoring, and cleanup.
 */

import * as vscode from 'vscode';
import type { TerminalState, TerminalRole } from './types';
import { v4 as uuidv4 } from 'uuid';

export class TerminalManager {
  private terminals: Map<string, TerminalState>;
  private vscodeTerminals: Map<string, vscode.Terminal>;

  constructor() {
    this.terminals = new Map();
    this.vscodeTerminals = new Map();
  }

  /**
   * Create a new Claude Code terminal
   * Performance requirement: <500ms
   */
  async createTerminal(
    name: string,
    role: TerminalRole = 'engineer',
    showTerminal: boolean = true
  ): Promise<TerminalState> {
    const terminalId = uuidv4();

    // Create VSCode terminal
    const terminal = vscode.window.createTerminal({
      name,
      hideFromUser: !showTerminal,
    });

    if (showTerminal) {
      terminal.show();
    }

    // Get process ID
    const pid = await terminal.processId;

    // Create terminal state
    const state: TerminalState = {
      terminalId,
      terminalName: name,
      role,
      createdAt: new Date().toISOString(),
      closedAt: null,
      isAlive: true,
      pid: pid ?? null,
      outputBuffer: [],
      tokenCount: 0,
      currentCommand: null,
      lastActivity: new Date().toISOString(),
    };

    this.terminals.set(terminalId, state);
    this.vscodeTerminals.set(terminalId, terminal);

    return state;
  }

  /**
   * Send command to terminal
   */
  async sendCommand(terminalId: string, command: string): Promise<void> {
    const state = this.terminals.get(terminalId);
    const terminal = this.vscodeTerminals.get(terminalId);

    if (!state) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    if (!state.isAlive) {
      throw new Error(`Terminal ${terminalId} is not alive`);
    }

    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    // Send command
    terminal.sendText(command);

    // Update state
    state.currentCommand = command;
    state.lastActivity = new Date().toISOString();
  }

  /**
   * Capture output from terminal
   * Returns an async iterator for streaming output
   *
   * NOTE: This is a placeholder implementation. The full implementation requires
   * VSCode 1.93+ for `onDidWriteTerminalData` API. For now, this method
   * yields the buffered output that's manually tracked.
   *
   * TODO: Upgrade to VSCode 1.93+ and implement real-time streaming
   */
  async *captureOutput(terminalId: string): AsyncIterableIterator<string> {
    const state = this.terminals.get(terminalId);

    if (!state) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    // Placeholder: Yield buffered output
    // In production, this will use onDidWriteTerminalData for real-time streaming
    for (const line of state.outputBuffer) {
      yield line;
    }
  }

  /**
   * Manually add output to terminal buffer
   * This is a temporary method for testing until we can use onDidWriteTerminalData
   *
   * @internal
   */
  _addOutputToBuffer(terminalId: string, output: string): void {
    const state = this.terminals.get(terminalId);

    if (!state) {
      return;
    }

    // Add to circular buffer (max 10,000 lines)
    state.outputBuffer.push(output);
    if (state.outputBuffer.length > 10000) {
      state.outputBuffer.shift();
    }

    // Update token count estimate
    state.tokenCount += Math.ceil(output.length / 3.5);
    state.lastActivity = new Date().toISOString();
  }

  /**
   * Check if terminal is alive
   */
  isAlive(terminalId: string): boolean {
    const state = this.terminals.get(terminalId);
    return state?.isAlive ?? false;
  }

  /**
   * Close terminal and cleanup
   */
  async closeTerminal(terminalId: string): Promise<void> {
    const terminal = this.vscodeTerminals.get(terminalId);
    const state = this.terminals.get(terminalId);

    if (terminal) {
      terminal.dispose();
      this.vscodeTerminals.delete(terminalId);
    }

    if (state) {
      state.isAlive = false;
      state.closedAt = new Date().toISOString();
    }
  }

  /**
   * Restart a crashed terminal
   */
  async restartTerminal(terminalId: string): Promise<TerminalState> {
    const oldState = this.terminals.get(terminalId);

    if (!oldState) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    // Close old terminal
    await this.closeTerminal(terminalId);

    // Create new terminal with same settings
    const newState = await this.createTerminal(oldState.terminalName, oldState.role, true);

    // Restore last command if needed
    if (oldState.currentCommand) {
      await this.sendCommand(newState.terminalId, oldState.currentCommand);
    }

    return newState;
  }

  /**
   * Get terminal state
   */
  getTerminalState(terminalId: string): TerminalState | undefined {
    return this.terminals.get(terminalId);
  }

  /**
   * Get all active terminals
   */
  getActiveTerminals(): TerminalState[] {
    return Array.from(this.terminals.values()).filter((t) => t.isAlive);
  }

  /**
   * Cleanup all terminals
   */
  async disposeAll(): Promise<void> {
    const terminalIds = Array.from(this.terminals.keys());
    await Promise.all(terminalIds.map((id) => this.closeTerminal(id)));
  }
}
