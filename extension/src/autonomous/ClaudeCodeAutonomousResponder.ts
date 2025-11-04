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
  private recentLines: Set<string> = new Set(); // Track recent unique lines
  private readonly dedupeWindow = 50; // Check last 50 lines for duplicates
  private lineBuffer = ''; // Buffer for incomplete lines from pty chunks
  private lastBufferUpdateTime = 0; // Timestamp of last buffer content change
  private lastBufferSnapshot = ''; // Last buffer content for stability detection
  private readonly stabilityDelayMs = 10000; // 10 seconds stability required

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
   * Strip ANSI escape codes and normalize spinner characters
   */
  private stripAnsi(str: string): string {
    // Remove ANSI escape codes: ESC[...m and similar patterns
    let cleaned = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    // Remove ANSI cursor control: ESC[K (erase line), ESC[?25l/h (hide/show cursor), etc
    cleaned = cleaned.replace(/\x1b\[[0-9;?]*[hlK]/g, '');
    // Normalize spinner characters to a single character for deduplication
    cleaned = cleaned.replace(/[✳✶✻✽✢·⏺]/g, '•');
    return cleaned.trim();
  }

  /**
   * Check if a line is likely a progress/spinner update
   */
  private isProgressLine(line: string): boolean {
    const progressPatterns = [
      /^[✳✶✻✽✢·]\s+(Propagating|Loading|Processing|Waiting)/,
      /^⏺\s+Bash\(.+\)\s+⎿\s+(Waiting|Running)/,
    ];
    return progressPatterns.some((pattern) => pattern.test(line));
  }

  /**
   * Add line to terminal buffer for monitoring
   * Implements deduplication and line buffering for pty chunks
   */
  addTerminalOutput(chunk: string): void {
    // Add chunk to line buffer
    this.lineBuffer += chunk;

    // Split on newlines, keeping incomplete line in buffer
    const lines = this.lineBuffer.split(/\r\n|\r|\n/);
    this.lineBuffer = lines.pop() || ''; // Keep last incomplete line

    // Process complete lines
    for (const line of lines) {
      this.processLine(line);
    }
  }

  /**
   * Process a single complete line with deduplication
   */
  private processLine(line: string): void {
    // Skip empty lines
    if (!line || !line.trim()) {
      return;
    }

    // Strip ANSI codes for duplicate detection
    const cleanLine = this.stripAnsi(line);

    // Skip if this exact line was recently added (deduplication)
    if (this.recentLines.has(cleanLine)) {
      return;
    }

    // For progress/spinner lines, check if we have a similar one already
    if (this.isProgressLine(line)) {
      // Only keep the most recent spinner state
      const basePattern = cleanLine.replace(/•\s+/, ''); // Remove normalized spinner
      const hasSimilar = Array.from(this.recentLines).some((recent) =>
        recent.includes(basePattern)
      );
      if (hasSimilar) {
        return; // Skip this spinner update
      }
    }

    // Add to buffer
    this.terminalBuffer.push(line);
    if (this.terminalBuffer.length > this.bufferSize) {
      this.terminalBuffer.shift();
    }

    // Track in dedupe window
    this.recentLines.add(cleanLine);

    // Keep dedupe set size reasonable (sliding window)
    if (this.recentLines.size > this.dedupeWindow) {
      // Remove oldest entries by clearing and rebuilding from recent buffer
      const recentClean = this.terminalBuffer
        .slice(-this.dedupeWindow)
        .map((l) => this.stripAnsi(l));
      this.recentLines = new Set(recentClean);
    }

    // Update stability tracking
    const currentSnapshot = this.terminalBuffer.slice(-10).join('\n');
    if (currentSnapshot !== this.lastBufferSnapshot) {
      this.lastBufferSnapshot = currentSnapshot;
      this.lastBufferUpdateTime = Date.now();
    }
  }

  /**
   * Check if recent terminal output contains a question waiting for input
   * Simple approach: No spinner + prompt present = ask Haiku to analyze
   */
  detectQuestion(): { detected: boolean; question: string; context: string } {
    const fullContext = this.terminalBuffer.join('\n');
    const last20k = fullContext.slice(-20000); // Context for Haiku
    const lastLines = this.terminalBuffer.slice(-30); // Check last 30 lines

    // DEBUG LOGGING
    this.outputChannel.appendLine('\n🔍 QUESTION DETECTION DEBUG:');
    this.outputChannel.appendLine(`   Buffer size: ${this.terminalBuffer.length} lines`);
    this.outputChannel.appendLine(`   Last 15 lines:`);
    const last15 = lastLines.slice(-15);
    last15.forEach((line, i) => {
      this.outputChannel.appendLine(`   [${i}] ${line.substring(0, 100)}`);
    });

    // Check 1: Is there a spinner? If yes, Claude Code is still working - NOT ready!
    const spinnerPatterns = [
      /^[✳✶✻✽✢·⏺]\s+\w+ing…/i, // Matches "✶ Enchanting…", "✳ Flibbertigibbeting…", etc.
      /^[✳✶✻✽✢·⏺]\s+\w+…/i, // Matches other spinner patterns
    ];
    const hasSpinner = lastLines.some((line) =>
      spinnerPatterns.some((pattern) => pattern.test(line.trim()))
    );
    this.outputChannel.appendLine(`   ✓ Check 1 - Has spinner (still working): ${hasSpinner}`);

    if (hasSpinner) {
      this.outputChannel.appendLine('   ✗ Spinner detected - Claude Code still working\n');
      return { detected: false, question: '', context: '' };
    }

    // Check 2: Is there a ">" prompt line?
    const hasPrompt = lastLines.some((line) => {
      const trimmed = line.trim();
      return trimmed === '>' || trimmed.startsWith('> ');
    });
    this.outputChannel.appendLine(`   ✓ Check 2 - Has ">" prompt: ${hasPrompt}`);

    if (!hasPrompt) {
      this.outputChannel.appendLine('   ✗ No ">" prompt found\n');
      return { detected: false, question: '', context: '' };
    }

    // Checks passed - will ask Haiku to analyze if there's a question
    this.outputChannel.appendLine('   ✅ PRE-CHECK PASSED: No spinner + prompt present\n');
    this.outputChannel.appendLine('   → Will ask Haiku to analyze context for question\n');

    return {
      detected: true,
      question: 'haiku-will-analyze',
      context: last20k,
    };
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

      const userPrompt = `# Recent Terminal Output (last 20,000 characters):
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

INSTRUCTIONS:
1. First, analyze the terminal output to determine if Claude Code is asking a question that requires a response.
2. If there IS a question requiring an answer:
   - Provide a clear, well-reasoned answer based on the constitution, specification, plan, and tasks
   - Answer directly with the best answer
   - Explain your reasoning in 2-4 sentences
3. If there is NO question requiring an answer (e.g., just informational output, or already answered):
   - Respond with exactly: NO_QUESTION

Remember: Only provide an answer if Claude Code is actively waiting for user input on a decision.`;

      this.outputChannel.appendLine('🤔 Asking Claude 3.5 Haiku to analyze context...');

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022', // Claude 3.5 Haiku (latest version)
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
        if (answer.trim() === 'NO_QUESTION') {
          this.outputChannel.appendLine('   ℹ Haiku determined: No question needs answering\n');
          return null;
        }

        this.outputChannel.appendLine('\n✓ Haiku provided answer:');
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
   * Clear terminal buffer, deduplication tracking, and line buffer
   */
  clearBuffer(): void {
    this.terminalBuffer = [];
    this.recentLines.clear();
    this.lineBuffer = '';
  }
}
