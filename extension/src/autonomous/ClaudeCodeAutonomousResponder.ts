/**
 * Claude Code Autonomous Responder
 *
 * Monitors Claude Code terminal output for questions and automatically
 * responds using Claude 3.5 Haiku with full context (constitution, spec, tasks).
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

export interface QuestionContext {
  specId: string;
  question: string;
  terminalOutput: string; // Full terminal context (up to 10,000 chars)
  constitutionPath?: string;
  specPath?: string;
  planPath?: string;
  tasksPath?: string;
}

export class ClaudeCodeAutonomousResponder {
  private anthropic: Anthropic | null = null;
  private outputChannel: vscode.OutputChannel;
  private isProcessing = false;
  private terminalBuffer: string[] = [];
  private readonly bufferSize = 100; // Keep last 100 lines

  constructor(
    private apiKey: string,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Add line to terminal buffer for monitoring
   */
  addTerminalOutput(line: string): void {
    this.terminalBuffer.push(line);
    if (this.terminalBuffer.length > this.bufferSize) {
      this.terminalBuffer.shift();
    }
  }

  /**
   * Check if recent terminal output contains a question waiting for input
   * Handles multiple patterns to catch various Claude Code question styles
   */
  detectQuestion(): { detected: boolean; question: string; context: string } {
    const fullContext = this.terminalBuffer.join('\n');
    const last10k = fullContext.slice(-10000);
    const lastLines = this.terminalBuffer.slice(-20);
    const lastLine = lastLines[lastLines.length - 1] || '';
    const recentText = lastLines.join('\n');

    // Pattern 1: "(esc)" text input prompt
    if (lastLine.includes('(esc)')) {
      return { detected: true, question: lastLine, context: last10k };
    }

    // Pattern 2: Multiple choice with "> " prompt and numbered options
    const hasNumberedOptions = /\d+\.\s+/.test(recentText);
    const hasPrompt = lastLine.trim() === '>' || lastLine.includes('> ');
    const hasQuestion = /\?/.test(recentText);

    if (hasNumberedOptions && hasPrompt && hasQuestion) {
      return { detected: true, question: lastLine, context: last10k };
    }

    // Pattern 3: Yes/No questions with prompt
    const hasYesNo = /\b(yes|no|y\/n)\b/i.test(recentText);
    if (hasYesNo && hasPrompt && hasQuestion) {
      return { detected: true, question: lastLine, context: last10k };
    }

    // Pattern 4: General question with input prompt (fallback)
    // If we see a question mark in recent output and a prompt waiting
    const hasRecentQuestion = recentText
      .split('\n')
      .slice(-5)
      .some((line) => line.includes('?'));
    const looksLikePrompt =
      lastLine.trim() === '>' ||
      lastLine.endsWith('> ') ||
      (lastLine.includes('─') && lastLines[lastLines.length - 2]?.includes('?'));

    if (hasRecentQuestion && looksLikePrompt) {
      return { detected: true, question: lastLine, context: last10k };
    }

    return { detected: false, question: '', context: '' };
  }

  /**
   * Load context files for the spec
   */
  private async loadContext(
    workspacePath: string,
    specId: string
  ): Promise<{ constitution: string; spec: string; plan: string; tasks: string }> {
    const specifyPath = path.join(workspacePath, '.specify');
    const specPath = path.join(specifyPath, 'specs', specId);

    const context = {
      constitution: '',
      spec: '',
      plan: '',
      tasks: '',
    };

    try {
      // Load constitution
      const constitutionPath = path.join(specifyPath, 'memory', 'constitution.md');
      context.constitution = await fs.readFile(constitutionPath, 'utf-8').catch(() => '');

      // Load spec.md
      const specMdPath = path.join(specPath, 'spec.md');
      context.spec = await fs.readFile(specMdPath, 'utf-8').catch(() => '');

      // Load plan.md
      const planMdPath = path.join(specPath, 'plan.md');
      context.plan = await fs.readFile(planMdPath, 'utf-8').catch(() => '');

      // Load tasks.md
      const tasksMdPath = path.join(specPath, 'tasks.md');
      context.tasks = await fs.readFile(tasksMdPath, 'utf-8').catch(() => '');
    } catch (error) {
      this.outputChannel.appendLine(
        `⚠ Warning loading context: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return context;
  }

  /**
   * Get autonomous response from Claude using full context
   */
  async getAutonomousResponse(
    workspacePath: string,
    context: QuestionContext
  ): Promise<string | null> {
    if (!this.anthropic) {
      this.outputChannel.appendLine('✗ Anthropic API client not initialized (no API key)');
      return null;
    }

    if (this.isProcessing) {
      this.outputChannel.appendLine('⚠ Already processing a question, skipping...');
      return null;
    }

    this.isProcessing = true;

    try {
      this.outputChannel.appendLine('\n' + '='.repeat(80));
      this.outputChannel.appendLine('🤖 AUTONOMOUS QUESTION ANSWERING');
      this.outputChannel.appendLine('='.repeat(80));
      this.outputChannel.appendLine(`Question detected: ${context.question.substring(0, 100)}...`);

      // Load full context
      this.outputChannel.appendLine('📚 Loading context files...');
      const fullContext = await this.loadContext(workspacePath, context.specId);

      // Build prompt for Claude
      const systemPrompt = `You are an autonomous development assistant helping answer questions during feature implementation.

You have access to:
- The project constitution (principles and standards)
- The feature specification
- The implementation plan
- The task list
- The recent terminal output showing Claude Code's question

Your job is to analyze the question in context and provide the appropriate answer.

QUESTION TYPES AND RESPONSES:

1. MULTIPLE CHOICE (numbered options like "1. Option A" "2. Option B"):
   - Analyze which option best aligns with the spec, plan, and constitution
   - Respond with ONLY the number of your choice (e.g., "1")
   - DO NOT add explanation or reasoning, just the number

2. TEXT INPUT (questions with "(esc)" prompt):
   - Provide a FULL, CLEAR answer (2-4 sentences)
   - Explain your reasoning based on the spec and plan
   - Be specific about WHY you're making this decision

DECISION PRINCIPLES:
- Always align with the constitution principles
- Follow the specification requirements
- Choose options that help progress through tasks efficiently
- Default to proceeding with implementation unless it clearly contradicts the spec
- Make reasonable decisions without over-engineering

Example multiple choice response: "1"
Example text input response: "Yes, proceed with creating the test file. The spec requires comprehensive test coverage and this aligns with task T016."

The goal is to keep implementation moving forward efficiently.`;

      const userPrompt = `# Recent Terminal Output (last 10,000 characters):
${context.terminalOutput}

# Constitution:
${fullContext.constitution || 'No constitution found'}

# Specification:
${fullContext.spec || 'No specification found'}

# Implementation Plan:
${fullContext.plan || 'No plan found'}

# Tasks:
${fullContext.tasks || 'No tasks found'}

---

Analyze the terminal output above to understand what Claude Code is asking. The last line shows "(esc)" which means Claude Code is waiting for a text response. Provide a clear, well-reasoned answer based on the specification, plan, and tasks. Explain your reasoning in 2-4 sentences.`;

      this.outputChannel.appendLine('🤔 Asking Claude 3.5 Haiku for decision...');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-latest', // Using latest Haiku model
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const answer = response.content[0].type === 'text' ? response.content[0].text : null;

      if (answer) {
        this.outputChannel.appendLine('\n✓ Claude decided:');
        this.outputChannel.appendLine('─'.repeat(80));
        this.outputChannel.appendLine(answer);
        this.outputChannel.appendLine('─'.repeat(80) + '\n');
      }

      return answer;
    } catch (error) {
      this.outputChannel.appendLine(
        `✗ Error getting autonomous response: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send response to terminal (legacy method for regular terminals)
   */
  async sendResponseToTerminal(terminal: vscode.Terminal, response: string): Promise<void> {
    try {
      this.outputChannel.appendLine('⌨️  Sending response to terminal...');

      // Press ESC to enter text mode (based on Claude Code behavior)
      await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
        text: '\x1B', // ESC key
      });

      await this.delay(500);

      // Type the response
      terminal.sendText(response, false);
      this.outputChannel.appendLine(`   Typed: "${response}"`);

      await this.delay(500);

      // Press Enter to submit
      await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {
        text: '\x0D', // Enter key
      });

      this.outputChannel.appendLine('   ✓ Response sent!\n');
    } catch (error) {
      this.outputChannel.appendLine(
        `✗ Error sending response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send response directly to pty process
   * Used when we have direct access to node-pty
   */
  async sendResponseToPty(ptyProcess: any, response: string): Promise<void> {
    try {
      this.outputChannel.appendLine('⌨️  Sending response to Claude Code...');

      // Check if this is a numbered choice (just a digit) or text input
      const isNumberedChoice = /^\d+$/.test(response.trim());

      if (!isNumberedChoice) {
        // For text input, press ESC to enter text mode first
        ptyProcess.write('\x1B');
        this.outputChannel.appendLine('   → Sent ESC key (text input mode)');
        await this.delay(500);
      } else {
        this.outputChannel.appendLine('   → Numbered choice detected, skipping ESC');
      }

      // TYPE 1: Type the response first (don't send \r yet!)
      ptyProcess.write(response);
      this.outputChannel.appendLine(
        `   → Typed: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`
      );

      // DELAY: Wait 500ms before sending Enter key (critical for Claude Code)
      await this.delay(500);

      // TYPE 2: Send Enter key separately - METHOD 5 (the only working method)
      ptyProcess.write('\r');
      this.outputChannel.appendLine('   → Sent Enter key (\\r) after 500ms delay');

      this.outputChannel.appendLine('   ✓ Response sent!\n');
    } catch (error) {
      this.outputChannel.appendLine(
        `✗ Error sending response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear terminal buffer
   */
  clearBuffer(): void {
    this.terminalBuffer = [];
  }
}
