import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Bridge between the orchestrator and Claude Code.
 * Monitors .claude-input.txt and automatically sends prompts to Claude,
 * then writes responses to .claude-output.txt.
 */
export class ClaudeCodeBridge {
  private anthropic: Anthropic;
  private workspacePath: string;
  private context: vscode.ExtensionContext;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private isProcessing = false;

  constructor(workspacePath: string, apiKey: string, context: vscode.ExtensionContext) {
    this.workspacePath = workspacePath;
    this.context = context;
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async start(): Promise<void> {}

  async stop(): Promise<void> {
    this.conversationHistory = [];
  }

  /**
   * Process a prompt from the orchestrator and send it to Claude
   */
  async processPrompt(prompt: string): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Already processing a prompt. Please wait.');
    }

    this.isProcessing = true;

    try {
      // Show progress
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Claude is processing...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Sending prompt to Claude...' });

          // Add user message to history
          this.conversationHistory.push({
            role: 'user',
            content: prompt,
          });

          // Call Claude API
          const response = await this.anthropic.messages.create({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 8096,
            messages: this.conversationHistory,
            system: this.getSystemPrompt(),
          });

          // Extract text response
          const textContent = response.content
            .filter((block: any): block is Anthropic.TextBlock => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');

          // Add assistant response to history
          this.conversationHistory.push({
            role: 'assistant',
            content: textContent,
          });

          progress.report({ message: 'Response received' });

          return textContent;
        }
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a question to Claude and get an answer
   */
  async askQuestion(question: string): Promise<string> {
    const prompt = `Question from the orchestrator: ${question}\n\nPlease provide a brief, direct answer.`;
    return this.processPrompt(prompt);
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [];
    vscode.window.showInformationMessage('Conversation history reset');
  }

  /**
   * Get the system prompt for Claude
   */
  private getSystemPrompt(): string {
    return `You are Claude Code, an AI software engineer working within a VSCode environment.

You are part of an automated spec-driven development system. You receive tasks from an orchestrator that:
1. Breaks down specifications into individual tasks
2. Sends you tasks to implement
3. Runs Playwright tests to validate your work
4. Requests fixes if tests fail

Your responsibilities:
- Implement tasks according to the specifications provided
- Write clean, well-tested code
- Follow the project's existing patterns and conventions
- Ask clarifying questions if requirements are unclear
- Fix issues when tests fail

The workspace path is: ${this.workspacePath}

When implementing tasks:
1. Read relevant files to understand the codebase
2. Implement the requested feature or fix
3. Write or update tests as needed
4. Ensure code quality and consistency

If you need clarification on requirements, ask questions. The orchestrator will either:
- Answer from the specification
- Escalate to the human developer via SMS

Work autonomously but ask for help when needed.`;
  }

  /**
   * Get conversation history for debugging
   */
  getConversationHistory(): Anthropic.MessageParam[] {
    return [...this.conversationHistory];
  }

  /**
   * Load conversation history from file
   */
  async loadConversationHistory(): Promise<void> {
    const historyPath = path.join(this.workspacePath, '.claude-history.json');
    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      this.conversationHistory = JSON.parse(data);
    } catch (error) {}
  }

  /**
   * Save conversation history to file
   */
  async saveConversationHistory(): Promise<void> {
    const historyPath = path.join(this.workspacePath, '.claude-history.json');
    await fs.writeFile(historyPath, JSON.stringify(this.conversationHistory, null, 2), 'utf-8');
  }
}
