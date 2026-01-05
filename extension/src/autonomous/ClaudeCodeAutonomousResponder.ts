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
  checkType?: 'IDLE_DETECTION' | 'COMPREHENSIVE_CHECK'; // Type of monitoring check
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
  private logFilePath: string | null = null; // Path to detailed log file

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
   * Initialize log file for detailed debugging
   */
  async initializeLogFile(workspacePath: string): Promise<void> {
    const logDir = path.join(workspacePath, '.specify', 'logs');
    await fs.mkdir(logDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    this.logFilePath = path.join(logDir, `autonomous-responder-${timestamp}.log`);

    await this.writeLog('='.repeat(80));
    await this.writeLog('AUTONOMOUS RESPONDER DEBUG LOG');
    await this.writeLog(`Started: ${new Date().toISOString()}`);
    await this.writeLog('='.repeat(80) + '\n');
  }

  /**
   * Write detailed log entry to file
   */
  private async writeLog(message: string): Promise<void> {
    if (!this.logFilePath) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      await fs.appendFile(this.logFilePath, logEntry, 'utf-8');
    } catch (error) {
      // Silently fail to avoid disrupting operation
      console.error('Failed to write log:', error);
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
   * Strip ONLY ANSI escape codes (keep spinner characters for pattern matching)
   */
  private stripAnsiOnly(str: string): string {
    // Remove ANSI escape codes: ESC[...m and similar patterns
    let cleaned = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    // Remove ANSI cursor control: ESC[K (erase line), ESC[?25l/h (hide/show cursor), etc
    cleaned = cleaned.replace(/\x1b\[[0-9;?]*[hlK]/g, '');
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

    // Log new terminal line
    this.writeLog(`TERMINAL: ${cleanLine.substring(0, 200)}`).catch(() => {});

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
   * Simple approach: No spinner = Claude Code idle, ask Haiku to analyze
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

    // Log to file with full buffer context
    this.writeLog('\n' + '='.repeat(80)).catch(() => {});
    this.writeLog('QUESTION DETECTION STARTED').catch(() => {});
    this.writeLog(`Buffer size: ${this.terminalBuffer.length} lines`).catch(() => {});
    this.writeLog('\nLast 30 lines of terminal buffer:').catch(() => {});
    lastLines.forEach((line, i) => {
      this.writeLog(`  [${i}] ${this.stripAnsi(line)}`).catch(() => {});
    });

    // ONLY CHECK: Is there a spinner? If yes, Claude Code is still working - NOT ready!
    // Note: The ">" prompt is always present, even when working, so we don't check for it
    const spinnerPatterns = [
      /^[✳✶✻✽✢·⏺]\s+.+…/i, // Matches any spinner with text ending in ellipsis (including multi-word like "Verifying project setup…")
      /^[·∴]\s+(Thinking|Generating|Processing)/i, // Matches "∴ Thinking…", "· Generating…"
      /^[⎿⌞└]\s+Next:/i, // Matches "⎿  Next: Complete Phase 1..." (Claude showing next action)
      /\(esc to interrupt/i, // Matches "(esc to interrupt · ctrl+t to show todos · 13s · ↓ 1.1k tokens)" - strong indicator Claude is working
    ];

    // CRITICAL FIX: Only check last 5 lines for ACTIVE spinner, not historical ones
    // Old spinner lines get buried in the buffer but don't represent current state
    const recentLines = lastLines.slice(-5); // Only check last 5 lines
    let spinnerLine: string | null = null;
    const hasSpinner = recentLines.some((line) => {
      const cleanLine = this.stripAnsiOnly(line); // Strip ANSI codes before testing
      const matches = spinnerPatterns.some((pattern) => pattern.test(cleanLine));
      if (matches) {
        spinnerLine = cleanLine.substring(0, 80); // Save for debug logging
      }
      return matches;
    });

    this.outputChannel.appendLine(`   ✓ Check - Has spinner (still working): ${hasSpinner}`);
    if (spinnerLine) {
      this.outputChannel.appendLine(`   ✓ Spinner line: "${spinnerLine}"`);
    }

    this.writeLog(
      `\nChecking last ${recentLines.length} lines for ACTIVE spinner (not historical):`
    ).catch(() => {});
    recentLines.forEach((line, i) => {
      const actualIndex = lastLines.length - recentLines.length + i;
      this.writeLog(`  [${actualIndex}] ${this.stripAnsi(line).substring(0, 100)}`).catch(() => {});
    });
    this.writeLog(`\nSpinner check: ${hasSpinner}`).catch(() => {});
    if (spinnerLine) {
      this.writeLog(`Spinner line found: "${spinnerLine}"`).catch(() => {});
    } else {
      this.writeLog(`No active spinner in last ${recentLines.length} lines`).catch(() => {});
    }

    // NEW APPROACH: Always ask Haiku to monitor, even when spinner is present
    // Haiku will decide whether to interrupt based on whether Claude is on track
    const workState = hasSpinner ? 'WORKING' : 'IDLE';

    if (hasSpinner) {
      this.outputChannel.appendLine('   🔄 Spinner detected - Claude Code is actively working\n');
      this.outputChannel.appendLine(
        '   → Will ask Haiku to monitor and interrupt ONLY if going wrong direction\n'
      );
      this.writeLog('STATUS: Spinner detected - Claude actively working').catch(() => {});
    } else {
      this.outputChannel.appendLine('   ✅ No spinner - Claude Code is idle\n');
      this.outputChannel.appendLine(
        '   → Will ask Haiku to evaluate situation and decide next action\n'
      );
      this.writeLog('STATUS: No spinner - Claude idle').catch(() => {});
    }

    this.writeLog(`Context length for Haiku: ${last20k.length} characters`).catch(() => {});

    return {
      detected: true,
      question: `haiku-monitor:${workState}`, // Pass work state to Haiku
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

      // Read configuration settings
      const config = vscode.workspace.getConfiguration('specGofer.autonomous');
      const enableEngReview = config.get<boolean>('enableEngineeringReview', true);
      const enablePerfReview = config.get<boolean>('enablePerformanceReview', true);

      // Build dynamic response types based on settings
      let responseTypes = `1. ANSWER A QUESTION - If Claude Code is explicitly asking for input:
   - MULTIPLE CHOICE: Respond with ONLY the number (e.g., "1")
   - TEXT INPUT: Provide a clear 2-4 sentence answer with newline at end
   - Example: "1" or "Yes, proceed with the test file. This aligns with task T016."

2. NO INTERRUPT NEEDED - If Claude is on track and doesn't need guidance:
   - Respond with: ACTION: NO_INTERRUPT
   - Use when: Claude just finished work naturally, next steps are clear, Claude can decide on its own
   - Sends: Nothing (let Claude continue without interruption)

3. CONTINUE IMPLEMENTATION - If Claude needs explicit direction to keep going:
   - Respond with: ACTION: CONTINUE_IMPLEMENT
   - Use when: Claude might not know what to do next
   - Sends: /speckit.implement`;

      if (enableEngReview) {
        responseTypes += `

4. ENGINEERING REVIEW - If strategic checkpoint needed:
   - Respond with: ACTION: ENGINEERING_REVIEW
   - Use when: Completion is enough or a major milestone just reached, worth validating
   - Sends: Prompt asking Claude to review implementation against specification and latest best practices from an internet search of the technologies being used`;
      }

      if (enablePerfReview) {
        responseTypes += `

5. PERFORMANCE REVIEW - If architecture review needed:
   - Respond with: ACTION: PERFORMANCE_REVIEW
   - Use when: Completion is enough, core features done, worth checking performance
   - Sends: Prompt asking Claude for performance and architecture analysis`;
      }

      // Add workflow routing actions
      responseTypes += `

6. WORKFLOW ROUTING - To transition between workflow phases:
   SpecKit flow:
   - ACTION: ROUTE_SPECKIT_SPECIFY - Start new specification
   - ACTION: ROUTE_SPECKIT_PLAN - Move to planning phase
   - ACTION: ROUTE_SPECKIT_TASKS - Generate tasks from plan
   - ACTION: ROUTE_SPECKIT_IMPLEMENT - Begin implementation

   RPI flow:
   - ACTION: ROUTE_RPI_RESEARCH - Start codebase research
   - ACTION: ROUTE_RPI_PLAN - Create implementation plan
   - ACTION: ROUTE_RPI_IMPLEMENT - Execute the plan
   - ACTION: ROUTE_RPI_RESUME - Resume saved session`;

      // Determine Claude's work state from question field
      const isWorking = context.question.includes('WORKING');

      // Determine check type (idle detection vs comprehensive check)
      const isIdleDetection = context.checkType === 'IDLE_DETECTION';

      // Build dynamic work state text based on check type
      let workStateText: string;

      if (isIdleDetection) {
        // IDLE DETECTION mode: Focus on answering questions immediately
        workStateText = `CLAUDE CODE CURRENT STATE: IDLE (no spinner detected)

CRITICAL: This is an IDLE DETECTION check. Claude has stopped working and is waiting for input.

YOUR PRIMARY JOB: Look for and ANSWER any question Claude is asking.

Common question patterns:
- "Which feature would you like me to implement? 1. ... 2. ..."
- "Should I proceed with X?"
- "Please choose: A) ... B) ..."
- Any numbered or lettered choices

If you see a question:
- ANSWER IT DIRECTLY (just the number, letter, or brief text response)
- DO NOT respond with "NO_INTERRUPT" or suggest the human should answer
- DO NOT provide meta-analysis about whether to interrupt
- Example answers: "1", "001-claude-terminal-integration", "Yes, proceed with the test file"

If there's truly no question and Claude just finished naturally:
- Respond with: ACTION: NO_INTERRUPT
- This lets Claude continue on its own`;
      } else {
        // COMPREHENSIVE CHECK mode: Monitor progress and direction
        workStateText = isWorking
          ? `CLAUDE CODE CURRENT STATE: ACTIVELY WORKING (spinner present)

CRITICAL: This is a COMPREHENSIVE CHECK (runs every 60 seconds). Claude is actively working.

You should ONLY interrupt if:
- Claude is going in the WRONG direction (deviating from constitution, spec, plan, or latest best practices)
- Claude is using outdated/deprecated approaches
- Claude is violating constitution principles
- There's a clear mistake that needs immediate correction

DO NOT interrupt if Claude is making correct progress, even if slowly.
Default to: ACTION: NO_INTERRUPT`
          : `CLAUDE CODE CURRENT STATE: IDLE (no spinner)

This is a COMPREHENSIVE CHECK (runs every 60 seconds). Claude has finished work and is idle.

You can:
- Answer questions if asked
- Provide next direction if needed (ACTION: CONTINUE_IMPLEMENT)
- Let Claude continue on its own if next steps are obvious (ACTION: NO_INTERRUPT)`;
      }

      // Get system prompt from settings and replace variables
      const systemPromptTemplate = config.get<string>(
        'haikuSystemPrompt',
        "You are an autonomous development assistant managing Claude Code's feature implementation workflow.\n\nYou have access to:\n- The project constitution (principles and standards)\n- The feature specification\n- The implementation plan\n- The task list\n- The recent terminal output from Claude Code\n- Latest best practices (you should consider current industry standards)\n\nYour job is to monitor Claude Code and decide whether to interrupt based on the situation.\n\n{WORK_STATE}\n\nRESPONSE TYPES:\n\n{RESPONSE_TYPES}\n\nDECISION PRINCIPLES:\n- If there's a question, answer it first (takes priority)\n- Otherwise, decide next action based on completion percentage\n- Keep work moving forward efficiently\n- Reviews are checkpoints, not blockers - use them strategically\n- Always align with constitution, spec, and plan\n\nThe goal is to autonomously drive feature completion with quality checks at appropriate milestones."
      );

      const systemPrompt = systemPromptTemplate
        .replace(/\{WORK_STATE\}/g, workStateText)
        .replace(/\{RESPONSE_TYPES\}/g, responseTypes);

      // Build detailed work state instructions based on check type
      let workStateInstructions: string;

      if (isIdleDetection) {
        // IDLE DETECTION mode: Laser focus on answering questions
        workStateInstructions = `
**IDLE DETECTION MODE - Answer Questions Immediately**

**Your ONLY job is to look for a question and answer it.**

**Step 1: Scan the terminal output for a question**
Look for these patterns:
- Numbered choices: "1. Option A  2. Option B" or "Which feature? 1. ... 2. ..."
- Yes/no questions: "Should I proceed with X?"
- Multiple choice: "Please choose: A) ... B) ..."
- Feature selection: "Which feature would you like me to implement?"

**Step 2: If you see a question, ANSWER IT DIRECTLY**
- For numbered choices: Respond with ONLY the number (e.g., "1")
- For feature selection: Respond with the feature ID (e.g., "001-claude-terminal-integration")
- For yes/no: Respond with "Yes" or "No" plus brief context
- DO NOT say "NO_INTERRUPT" or suggest the human should answer
- DO NOT provide meta-analysis or rationale
- Just answer the question directly and concisely

**Step 3: If there's NO question**
- Claude just finished working naturally
- Respond with: ACTION: NO_INTERRUPT
- This lets Claude continue on its own

**CRITICAL**: This is NOT the time for meta-analysis. If you see a question, answer it. Period.
`;
      } else if (isWorking) {
        // COMPREHENSIVE CHECK mode with WORKING state
        workStateInstructions = `
**COMPREHENSIVE CHECK - Monitor for Course Corrections Only**

**Step 1: Review what Claude is currently doing**
- Look at the terminal to see what Claude is working on
- Check the "Next:" indicator or spinner text for current focus

**Step 2: Evaluate if Claude is on the right track**
- Does this align with the spec, plan, and current task?
- Is Claude using best practices and modern approaches?
- Is Claude following constitution principles?
- Is there an obvious mistake or wrong direction?

**Step 3: Decide whether to interrupt**
- **Claude going WRONG direction**: Provide brief course correction (interrupt)
- **Claude using deprecated/outdated approach**: Suggest better approach (interrupt)
- **Claude violating constitution**: Provide correction (interrupt)
- **Claude making correct progress**: ACTION: NO_INTERRUPT (don't interrupt, let it continue)

**DEFAULT**: When in doubt, choose NO_INTERRUPT. Only interrupt if you're confident there's a problem.
`;
      } else {
        // COMPREHENSIVE CHECK mode with IDLE state
        workStateInstructions = `
**COMPREHENSIVE CHECK - Idle State Decision Making**

**Step 1: Check for Questions**
Look for:
- Numbered options like "1. Option A  2. Option B"
- Questions with "Which...", "Please either:", "Should I..."
- Input prompts asking for decisions

If question found: Provide the answer (number only for multiple choice, clear text for open questions)

**Step 2: If No Question, Evaluate Direction & Decide Next Action**

**First, evaluate if Claude is on the right track:**
- Review what Claude just completed in the terminal output
- Check if it aligns with the spec, plan, and tasks
- Verify it follows constitution principles and best practices
- Assess: Is Claude making correct progress, or going the wrong direction?

**Then decide next action based on:**
- What % of tasks are complete? (look for "X of Y tasks" or completion percentage)
- What phase is the feature in? (early dev, mid-implementation, or polish phase)
- Is Claude on track or does it need correction?

**Decision rules (prioritize NO_INTERRUPT when Claude is on track):**
- **Explicit question asked**: Provide the answer
- **Claude off track or needs correction**: Provide brief correction/guidance
- **Claude on track + just finished task naturally + next steps obvious**: ACTION: NO_INTERRUPT (let Claude continue)
- **Claude on track + might not know next step**: ACTION: CONTINUE_IMPLEMENT
- **Claude on track + major milestone + worth validating**: ACTION: ENGINEERING_REVIEW
- **Claude on track + core done + worth checking performance**: ACTION: PERFORMANCE_REVIEW

**DEFAULT**: Prefer NO_INTERRUPT when Claude is making good progress autonomously.
`;
      }

      // Get user prompt template from settings and replace all variables
      const userPromptTemplate = config.get<string>(
        'haikuUserPromptTemplate',
        '# Recent Terminal Output (last 20,000 characters):\n{terminalOutput}\n\n# Constitution:\n{constitution}\n\n# Specification:\n{spec}\n\n# Implementation Plan:\n{plan}\n\n# Tasks:\n{tasks}\n\n---\n\nANALYZE THE TERMINAL AND DECIDE NEXT ACTION:\n\n{workState}\n\n**Your response must be ONE of:**\n- A direct answer (number or text)\n- ACTION: NO_INTERRUPT\n- ACTION: CONTINUE_IMPLEMENT\n- ACTION: ENGINEERING_REVIEW\n- ACTION: PERFORMANCE_REVIEW\n\nDecide NOW:'
      );

      const userPrompt = userPromptTemplate
        .replace(/\{terminalOutput\}/g, context.terminalOutput)
        .replace(/\{constitution\}/g, fullContext.constitution || 'No constitution found')
        .replace(/\{spec\}/g, fullContext.spec || 'No specification found')
        .replace(/\{plan\}/g, fullContext.plan || 'No plan found')
        .replace(/\{tasks\}/g, fullContext.tasks || 'No tasks found')
        .replace(/\{workState\}/g, workStateInstructions);

      this.outputChannel.appendLine('🤔 Asking Claude 3.5 Haiku to analyze context...');

      // Log full prompt details to file
      await this.writeLog('\n' + '='.repeat(80));
      await this.writeLog('HAIKU API CALL STARTED');
      await this.writeLog('='.repeat(80));
      await this.writeLog('\n--- SYSTEM PROMPT ---');
      await this.writeLog(systemPrompt);
      await this.writeLog('\n--- USER PROMPT ---');
      await this.writeLog(userPrompt);
      await this.writeLog('\n' + '='.repeat(80));
      await this.writeLog('Sending to Claude 3.5 Haiku (model: claude-3-5-haiku-20241022)...');

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

      // Log Haiku's response
      await this.writeLog('\n--- HAIKU RESPONSE ---');
      await this.writeLog(answer || '(null response)');
      await this.writeLog('='.repeat(80) + '\n');

      if (answer) {
        const trimmedAnswer = answer.trim();

        // Check for ACTION commands anywhere in the response (not just at start)
        // This handles cases where Haiku adds preambles like "After analyzing..."
        if (trimmedAnswer.includes('ACTION: NO_INTERRUPT')) {
          this.outputChannel.appendLine('   ✓ Haiku decided: No interruption needed\n');
          this.outputChannel.appendLine(
            '   → Claude is on track, letting it continue naturally...\n'
          );
          await this.writeLog('DECISION: NO_INTERRUPT - Claude on track, not interrupting');
          return null; // Don't send anything to terminal - DO NOTHING
        }

        if (trimmedAnswer.includes('ACTION: CONTINUE_IMPLEMENT')) {
          this.outputChannel.appendLine('   🚀 Haiku decided: Continue implementation\n');
          this.outputChannel.appendLine('   → Sending /speckit.implement command...\n');
          await this.writeLog('DECISION: CONTINUE_IMPLEMENT - sending /speckit.implement');
          return '/speckit.implement\n';
        }

        if (trimmedAnswer.includes('ACTION: ENGINEERING_REVIEW')) {
          // Check if engineering review is enabled
          const config = vscode.workspace.getConfiguration('specGofer.autonomous');
          const enableEngReview = config.get<boolean>('enableEngineeringReview', true);

          if (!enableEngReview) {
            this.outputChannel.appendLine(
              '   ⚠️  Engineering review disabled in settings, falling back to CONTINUE_IMPLEMENT\n'
            );
            await this.writeLog(
              'DECISION: ENGINEERING_REVIEW requested but disabled - falling back to CONTINUE_IMPLEMENT'
            );
            return '/speckit.implement\n';
          }

          this.outputChannel.appendLine('   🔍 Haiku decided: Engineering review needed\n');
          this.outputChannel.appendLine(
            '   → Requesting review of implementation vs specification...\n'
          );
          await this.writeLog('DECISION: ENGINEERING_REVIEW - requesting code review');

          // Use custom prompt from settings
          const reviewPrompt = config.get<string>(
            'engineeringReviewPrompt',
            `Please perform an engineering review of the work completed so far:

1. Compare the implemented code against the original specification
2. Identify any gaps or deviations from the spec
3. Check if the implementation aligns with the constitution principles
4. Verify that completed tasks match their requirements in tasks.md

Provide a brief summary of findings and recommendations for next steps.`
          );
          return reviewPrompt;
        }

        if (trimmedAnswer.includes('ACTION: PERFORMANCE_REVIEW')) {
          // Check if performance review is enabled
          const config = vscode.workspace.getConfiguration('specGofer.autonomous');
          const enablePerfReview = config.get<boolean>('enablePerformanceReview', true);

          if (!enablePerfReview) {
            this.outputChannel.appendLine(
              '   ⚠️  Performance review disabled in settings, falling back to CONTINUE_IMPLEMENT\n'
            );
            await this.writeLog(
              'DECISION: PERFORMANCE_REVIEW requested but disabled - falling back to CONTINUE_IMPLEMENT'
            );
            return '/speckit.implement\n';
          }

          this.outputChannel.appendLine('   ⚡ Haiku decided: Performance review needed\n');
          this.outputChannel.appendLine(
            '   → Requesting architecture and performance analysis...\n'
          );
          await this.writeLog('DECISION: PERFORMANCE_REVIEW - requesting performance analysis');

          // Use custom prompt from settings
          const perfPrompt = config.get<string>(
            'performanceReviewPrompt',
            `Please perform a performance and architecture analysis of the implementation:

1. Review the code against current best practices for each technology used
2. Identify potential performance bottlenecks or optimization opportunities
3. Check for architectural patterns that could be improved
4. Verify proper error handling and edge case coverage
5. Suggest any improvements for maintainability and scalability

Provide specific, actionable recommendations.`
          );
          return perfPrompt;
        }

        // Workflow routing actions - SpecKit flow
        if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_SPECIFY')) {
          this.outputChannel.appendLine('   📝 Routing to SpecKit: specify phase\n');
          await this.writeLog('ROUTING: /speckit.specify');
          return '/speckit.specify\n';
        }

        if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_PLAN')) {
          this.outputChannel.appendLine('   📋 Routing to SpecKit: plan phase\n');
          await this.writeLog('ROUTING: /speckit.plan');
          return '/speckit.plan\n';
        }

        if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_TASKS')) {
          this.outputChannel.appendLine('   📊 Routing to SpecKit: tasks phase\n');
          await this.writeLog('ROUTING: /speckit.tasks');
          return '/speckit.tasks\n';
        }

        if (trimmedAnswer.includes('ACTION: ROUTE_SPECKIT_IMPLEMENT')) {
          this.outputChannel.appendLine('   🔨 Routing to SpecKit: implement phase\n');
          await this.writeLog('ROUTING: /speckit.implement');
          return '/speckit.implement\n';
        }

        // Workflow routing actions - RPI flow
        if (trimmedAnswer.includes('ACTION: ROUTE_RPI_RESEARCH')) {
          this.outputChannel.appendLine('   🔍 Routing to RPI: research phase\n');
          await this.writeLog('ROUTING: /1_research_codebase');
          return '/1_research_codebase\n';
        }

        if (trimmedAnswer.includes('ACTION: ROUTE_RPI_PLAN')) {
          this.outputChannel.appendLine('   📋 Routing to RPI: create plan phase\n');
          await this.writeLog('ROUTING: /2_create_plan');
          return '/2_create_plan\n';
        }

        if (trimmedAnswer.includes('ACTION: ROUTE_RPI_IMPLEMENT')) {
          this.outputChannel.appendLine('   🔨 Routing to RPI: implement plan phase\n');
          await this.writeLog('ROUTING: /4_implement_plan');
          return '/4_implement_plan\n';
        }

        if (trimmedAnswer.includes('ACTION: ROUTE_RPI_RESUME')) {
          this.outputChannel.appendLine('   ▶️  Routing to RPI: resume work\n');
          await this.writeLog('ROUTING: /6_resume_work');
          return '/6_resume_work\n';
        }

        // Otherwise it's a direct answer to a question
        this.outputChannel.appendLine('\n✓ Haiku provided answer:');
        this.outputChannel.appendLine('─'.repeat(80));
        this.outputChannel.appendLine(answer);
        this.outputChannel.appendLine('─'.repeat(80) + '\n');

        await this.writeLog('DECISION: Haiku provided direct answer - will send to terminal');
        await this.writeLog(`Answer to send: ${answer}`);

        return answer + '\n'; // Add newline to submit the answer
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
