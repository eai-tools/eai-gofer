import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * Manages the orchestrator Node.js process
 */
export class OrchestratorProcess {
  private workspacePath: string;
  private apiKey: string;
  private process: ChildProcess | undefined;
  private outputChannel: vscode.OutputChannel;

  constructor(workspacePath: string, apiKey: string) {
    this.workspacePath = workspacePath;
    this.apiKey = apiKey;
    this.outputChannel = vscode.window.createOutputChannel('Spec Orchestrator');
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Orchestrator process is already running');
    }

    this.outputChannel.show();
    this.outputChannel.appendLine('Starting orchestrator process...');

    // Check if we need to build first
    const projectRoot = path.join(this.workspacePath);

    // Set environment variables
    const env = {
      ...process.env,
      ANTHROPIC_API_KEY: this.apiKey,
      WORKSPACE_DIR: this.workspacePath,
      SPEC_DIR: path.join('.specify', 'specs'),
    };

    // Start the orchestrator process
    // First, try to use the built version, fallback to dev version
    this.process = spawn('npm', ['start'], {
      cwd: projectRoot,
      env,
      shell: true,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputChannel.appendLine(`[STDOUT] ${output}`);

      // Parse for important events
      if (output.includes('Orchestrator started')) {
        vscode.window.showInformationMessage('Orchestrator started successfully');
      } else if (output.includes('ERROR') || output.includes('Error')) {
        vscode.window.showErrorMessage(`Orchestrator error: ${output}`);
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.outputChannel.appendLine(`[STDERR] ${output}`);
    });

    this.process.on('error', (error: Error) => {
      this.outputChannel.appendLine(`[ERROR] ${error.message}`);
      vscode.window.showErrorMessage(`Orchestrator process error: ${error.message}`);
    });

    this.process.on('exit', (code: number | null, signal: string | null) => {
      this.outputChannel.appendLine(
        `[EXIT] Process exited with code ${code} and signal ${signal}`
      );

      if (code !== 0 && code !== null) {
        vscode.window.showErrorMessage(`Orchestrator exited with code ${code}`);
      }

      this.process = undefined;
    });

    this.outputChannel.appendLine('Orchestrator process started');
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    this.outputChannel.appendLine('Stopping orchestrator process...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('exit', () => {
        this.outputChannel.appendLine('Orchestrator process stopped');
        this.process = undefined;
        resolve();
      });

      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.outputChannel.appendLine('Force killing orchestrator process...');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  isRunning(): boolean {
    return this.process !== undefined && !this.process.killed;
  }

  /**
   * Send a signal to the orchestrator process
   */
  sendSignal(signal: NodeJS.Signals): boolean {
    if (!this.process) {
      return false;
    }

    return this.process.kill(signal);
  }

  /**
   * Get the output channel for displaying logs
   */
  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }
}
