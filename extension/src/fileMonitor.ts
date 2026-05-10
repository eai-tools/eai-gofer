import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ClaudeCodeBridge } from './claudeCodeBridge';
import { ProgressProvider } from './progressProvider';

/**
 * Monitors .claude-input.txt and automatically processes prompts through Claude,
 * writing responses to .claude-output.txt
 */
export class FileMonitor {
  private workspacePath: string;
  private claudeBridge: ClaudeCodeBridge;
  private progressProvider: ProgressProvider;
  private watcher: chokidar.FSWatcher | undefined;
  private lastInputContent = '';
  private isProcessing = false;

  constructor(
    workspacePath: string,
    claudeBridge: ClaudeCodeBridge,
    progressProvider: ProgressProvider
  ) {
    this.workspacePath = workspacePath;
    this.claudeBridge = claudeBridge;
    this.progressProvider = progressProvider;
  }

  async start(): Promise<void> {
    const inputPath = path.join(this.workspacePath, '.claude-input.txt');
    const questionPath = path.join(this.workspacePath, '.claude-question.txt');

    // Initialize files if they don't exist
    await this.ensureFileExists(inputPath);
    await this.ensureFileExists(questionPath);

    // Load initial content to avoid processing on startup
    try {
      this.lastInputContent = await fs.readFile(inputPath, 'utf-8');
    } catch {
      this.lastInputContent = '';
    }

    // Watch for changes to input and question files
    this.watcher = chokidar.watch([inputPath, questionPath], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', async (filePath: string) => {
      if (filePath === inputPath) {
        await this.handleInputChange(inputPath);
      } else if (filePath === questionPath) {
        await this.handleQuestionChange(questionPath);
      }
    });

    vscode.window.showInformationMessage('Automated Claude Code integration active');
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }
  }

  /**
   * Handle changes to .claude-input.txt
   */
  private async handleInputChange(inputPath: string): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    try {
      const content = await fs.readFile(inputPath, 'utf-8');
      const trimmedContent = content.trim();

      // Ignore if content hasn't changed or is empty
      if (!trimmedContent || trimmedContent === this.lastInputContent.trim()) {
        return;
      }

      this.lastInputContent = content;
      this.isProcessing = true;

      vscode.window.showInformationMessage('Processing new task from orchestrator...');

      // Process the prompt through Claude
      const response = await this.claudeBridge.processPrompt(trimmedContent);

      // Write response to output file
      const outputPath = path.join(this.workspacePath, '.claude-output.txt');
      await fs.writeFile(outputPath, response, 'utf-8');

      vscode.window.showInformationMessage('Task completed! Response sent to orchestrator.');

      // Refresh progress view
      this.progressProvider.refresh();

      // Save conversation history
      await this.claudeBridge.saveConversationHistory();
    } catch (error) {
      console.error('Error processing input:', error);
      vscode.window.showErrorMessage(
        `Error processing prompt: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle changes to .claude-question.txt
   */
  private async handleQuestionChange(questionPath: string): Promise<void> {
    try {
      const question = await fs.readFile(questionPath, 'utf-8');
      const trimmedQuestion = question.trim();

      if (!trimmedQuestion) {
        return;
      }

      // Show question to user and get answer
      const userAnswer = await vscode.window.showInputBox({
        prompt: 'Question from Claude Code',
        placeHolder: 'Type your answer here...',
        value: trimmedQuestion,
        ignoreFocusOut: true,
      });

      if (userAnswer) {
        // Write answer to a response file
        const answerPath = path.join(this.workspacePath, '.claude-answer.txt');
        await fs.writeFile(answerPath, userAnswer, 'utf-8');

        // Clear the question file
        await fs.writeFile(questionPath, '', 'utf-8');
      } else {
        vscode.window.showWarningMessage("No answer provided for Claude's question");
      }
    } catch (error) {
      console.error('Error handling question:', error);
      vscode.window.showErrorMessage(
        `Error handling question: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Ensure a file exists, create it if it doesn't
   */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '', 'utf-8');
    }
  }
}
