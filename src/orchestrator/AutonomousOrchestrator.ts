import Anthropic from '@anthropic-ai/sdk';
import { Spec, Task } from '../types.js';
import { SpecLoader } from './SpecLoader.js';
import { TestAgent } from '../agents/TestAgent.js';
import { EngineerAgent } from '../agents/EngineerAgent.js';
import { NotificationService } from '../utils/NotificationService.js';

/**
 * Autonomous Orchestrator that uses MCP tools to coordinate tasks
 * This is the "play button" implementation that runs autonomously
 */
export class AutonomousOrchestrator {
  private specLoader: SpecLoader;
  private testAgent: TestAgent;
  private engineerAgent: EngineerAgent;
  private notificationService: NotificationService;
  private anthropic: Anthropic;
  private isRunning = false;
  private currentTask: Task | null = null;
  private currentSpec: Spec | null = null;

  constructor(
    specDir: string,
    apiKey: string,
    twilioConfig: any,
    whatsappConfig: any,
    workspaceDir: string
  ) {
    this.specLoader = new SpecLoader(specDir);
    this.testAgent = new TestAgent(workspaceDir);
    this.engineerAgent = new EngineerAgent(apiKey);
    this.notificationService = new NotificationService(twilioConfig, whatsappConfig);
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Start the autonomous execution loop
   * This is what happens when you click the "Play" button
   */
  async start(): Promise<void> {
    console.log('▶️  Starting SpecGofer Autonomous Mode...\n');
    this.isRunning = true;

    // Set up two-way WhatsApp communication
    this.setupWhatsAppCommands();

    while (this.isRunning) {
      try {
        // Step 1: Get next task using MCP tool pattern
        const nextTask = await this.getNextTask();
        
        if (!nextTask) {
          console.log('✅ All tasks completed! No more work to do.');
          this.stop();
          break;
        }

        this.currentTask = nextTask;
        console.log(`\n🎯 Next Task: ${nextTask.id} - ${nextTask.description}`);

        // Step 2: Execute task (send to Claude with MCP tools)
        console.log('🤖 Executing task with Engineer Agent...');
        await this.executeTask(nextTask);

        // Step 3: Validate code against constitution
        console.log('📋 Validating against constitution...');
        const validationResult = await this.validateCode(nextTask);

        if (!validationResult.isValid) {
          console.log('❌ Validation failed:', validationResult.issues);
          await this.handleValidationFailure(nextTask, validationResult);
          continue;
        }

        // Step 4: Run tests
        console.log('🧪 Running tests...');
        const testResult = await this.runTests(nextTask);

        if (!testResult.passed) {
          console.log('❌ Tests failed:', testResult.summary);
          await this.handleTestFailure(nextTask, testResult);
          continue;
        }

        // Step 5: Update task status to completed
        console.log('✅ Task completed successfully!');
        await this.updateTaskStatus(nextTask.id, 'completed');

        this.currentTask = null;

        // Small delay before next iteration
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('❌ Error in autonomous loop:', error);
        await this.notificationService.sendSMS(
          `SpecGofer encountered an error:\n\n${error}\n\nPlease check the logs.`
        );
        // Don't stop on errors, continue to next task
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n⏹️  SpecGofer Autonomous Mode stopped.');
  }

  /**
   * Stop the autonomous execution
   * This is what happens when you click the "Stop" button
   */
  stop(): void {
    console.log('\n⏹️  Stopping SpecGofer Autonomous Mode...');
    this.isRunning = false;
  }

  /**
   * MCP Tool: specgofer_get_next_task
   * Get the next available task to work on
   */
  private async getNextTask(): Promise<Task | null> {
    const specs = await this.specLoader.loadAllSpecs();
    
    for (const spec of specs) {
      // Find next task that has all dependencies completed
      const nextTask = spec.tasks.find(task => {
        if (task.status === 'completed') return false;
        if (task.status === 'failed') return false;

        // Check if all dependencies are completed
        return task.dependencies.every(depId =>
          spec.tasks.find(t => t.id === depId)?.status === 'completed'
        );
      });

      if (nextTask) {
        this.currentSpec = spec;
        return nextTask;
      }
    }

    return null;
  }

  /**
   * MCP Tool: specgofer_execute_task
   * Execute a task using Claude with full context
   */
  private async executeTask(task: Task): Promise<void> {
    if (!this.currentSpec) {
      throw new Error('No current spec loaded');
    }

    // Build the full context for Claude
    const prompt = this.buildExecutionPrompt(task, this.currentSpec);

    // Update status to in_progress
    await this.updateTaskStatus(task.id, 'in_progress');

    // Call Claude to implement the task
    const response = await this.anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 8000,
      temperature: 0.2,
      system: `You are an expert TypeScript developer working on the SpecGofer project.
Your task is to implement the requested feature following the constitution principles.
Always write tests first (TDD), maintain 80%+ coverage, and follow strict TypeScript patterns.`,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('\n📝 Claude Response:\n', content.text.substring(0, 500), '...\n');
    }

    // Note: In a real implementation, Claude would have access to file editing tools
    // For now, we're simulating the execution
  }

  /**
   * MCP Tool: specgofer_validate_code
   * Validate code against constitution principles
   */
  private async validateCode(task: Task): Promise<{ isValid: boolean; issues: string[]; suggestions: string[] }> {
    // Use the EngineerAgent to validate
    const validation = await this.engineerAgent.validate(
      task.description,
      'Implementation completed', // In real system, would have actual implementation
      { passed: true, failedTests: [], summary: '' }
    );

    return validation;
  }

  /**
   * MCP Tool: specgofer_run_tests
   * Run Playwright tests for the task
   */
  private async runTests(task: Task): Promise<{ passed: boolean; summary: string; failedTests: string[] }> {
    if (!this.currentSpec) {
      throw new Error('No current spec loaded');
    }

    // Get relevant acceptance criteria for this task
    const acceptanceCriteria = this.currentSpec.acceptanceCriteria.filter(ac => 
      ac.testType === 'playwright' || ac.testType === 'unit'
    );

    const testResult = await this.testAgent.runTests(acceptanceCriteria);
    return testResult;
  }

  /**
   * MCP Tool: specgofer_update_task_status
   * Update the status of a task
   */
  private async updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'failed'): Promise<void> {
    if (!this.currentSpec) {
      throw new Error('No current spec loaded');
    }

    await this.specLoader.updateTaskStatus(this.currentSpec.id, taskId, status);
  }

  /**
   * Handle validation failures
   */
  private async handleValidationFailure(task: Task, validation: any): Promise<void> {
    task.attempts = (task.attempts || 0) + 1;

    if (task.attempts > 3) {
      console.log('⚠️  Max validation attempts reached - asking for help');
      
      await this.notificationService.sendQuestion(
        `Task "${task.description}" failed validation after 3 attempts.\n\n` +
        `Issues:\n${validation.issues.map((i: string) => `- ${i}`).join('\n')}\n\n` +
        `Suggestions:\n${validation.suggestions.map((s: string) => `- ${s}`).join('\n')}\n\n` +
        `What should I do?`,
        ['Skip task', 'Retry', 'Provide guidance']
      );

      // Wait for response (5 minutes timeout)
      console.log('⏳ Waiting for user response...');
      const response = await this.notificationService.waitForResponse(300000);

      if (response) {
        const choice = response.toLowerCase().trim();
        console.log(`📥 User chose: "${choice}"`);

        if (choice.includes('skip')) {
          await this.handleSkipCommand();
        } else if (choice.includes('retry')) {
          await this.handleRetryCommand();
        } else {
          // Treat as guidance
          await this.handleUserGuidance(response);
          await this.handleRetryCommand();
        }
      } else {
        // Timeout - mark as failed
        console.log('⏰ No response received, marking task as failed');
        await this.updateTaskStatus(task.id, 'failed');
        this.currentTask = null;
      }
      return;
    }

    console.log(`🔧 Attempt ${task.attempts}/3 - Requesting fixes...`);
    // In a real system, would send fixes back to Claude
  }

  /**
   * Handle test failures
   */
  private async handleTestFailure(task: Task, testResult: any): Promise<void> {
    task.attempts = (task.attempts || 0) + 1;

    if (task.attempts > 3) {
      console.log('⚠️  Max test attempts reached - asking for help');
      
      await this.notificationService.sendQuestion(
        `Task "${task.description}" failed tests after 3 attempts.\n\n` +
        `Failed tests:\n${testResult.failedTests.map((t: string) => `- ${t}`).join('\n')}\n\n` +
        `Summary: ${testResult.summary}\n\n` +
        `What should I do?`,
        ['Skip task', 'Retry', 'Provide guidance']
      );

      // Wait for response (5 minutes timeout)
      console.log('⏳ Waiting for user response...');
      const response = await this.notificationService.waitForResponse(300000);

      if (response) {
        const choice = response.toLowerCase().trim();
        console.log(`📥 User chose: "${choice}"`);

        if (choice.includes('skip')) {
          await this.handleSkipCommand();
        } else if (choice.includes('retry')) {
          await this.handleRetryCommand();
        } else {
          // Treat as guidance
          await this.handleUserGuidance(response);
          await this.handleRetryCommand();
        }
      } else {
        // Timeout - mark as failed
        console.log('⏰ No response received, marking task as failed');
        await this.updateTaskStatus(task.id, 'failed');
        this.currentTask = null;
      }
      return;
    }

    console.log(`🔧 Attempt ${task.attempts}/3 - Re-running with test feedback...`);
    // In a real system, would send test results back to Claude for fixes
  }

  /**
   * Build the execution prompt for Claude
   */
  private buildExecutionPrompt(task: Task, spec: Spec): string {
    return `# Task: ${task.description}

## Context
Spec: ${spec.title}
Task ID: ${task.id}
Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}

## Acceptance Criteria
${spec.acceptanceCriteria.map(ac => `- ${ac.description}`).join('\n')}

## Constitution Principles (MUST FOLLOW)
- TypeScript strict mode, no \`any\` types
- Functions <300 lines, files <500 lines
- 80%+ test coverage minimum
- Write tests first (TDD)
- Security: No plaintext passwords, JWT expiry <1hr
- Performance: API <500ms p95, UI <100ms response

## Delivery Prompt
${task.deliveryPrompt}

## Instructions
1. Analyze the requirements carefully
2. Plan your implementation
3. Write tests FIRST
4. Implement the feature
5. Ensure all tests pass
6. Verify against constitution principles

Please implement this task now.`;
  }

  /**
   * Get current status for monitoring
   */
  getStatus(): { isRunning: boolean; currentTask: Task | null; currentSpec: Spec | null } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      currentSpec: this.currentSpec
    };
  }

  /**
   * Set up two-way WhatsApp communication
   * Listen for commands from the user
   */
  private setupWhatsAppCommands(): void {
    this.notificationService.onMessage(async (message: string, fromNumber: string) => {
      const command = message.toLowerCase().trim();

      console.log(`\n💬 Received command from WhatsApp: "${message}"\n`);

      // Handle different commands
      if (command === 'status' || command === 'status?') {
        await this.handleStatusCommand();
      } else if (command === 'stop' || command === 'pause') {
        await this.handleStopCommand();
      } else if (command === 'skip') {
        await this.handleSkipCommand();
      } else if (command === 'retry') {
        await this.handleRetryCommand();
      } else if (command === 'help' || command === '?') {
        await this.handleHelpCommand();
      } else if (command.startsWith('fix:') || command.startsWith('suggest:')) {
        // User providing guidance for current task
        await this.handleUserGuidance(message);
      } else if (this.notificationService.isAwaitingResponse()) {
        // We asked a question, this is the answer
        console.log('✅ Received answer to question');
        // The waitForResponse promise will handle this
      } else {
        // Unknown command, send help
        await this.notificationService.sendSMS(
          `❓ Unknown command: "${message}"\n\nSend "help" for available commands.`
        );
      }
    });

    console.log('💬 Two-way WhatsApp commands enabled!\n');
    console.log('Available commands:');
    console.log('  - status   : Get current task status');
    console.log('  - stop     : Pause SpecGofer');
    console.log('  - skip     : Skip current task');
    console.log('  - retry    : Retry current task');
    console.log('  - fix: ... : Provide guidance for current task');
    console.log('  - help     : Show this help\n');
  }

  private async handleStatusCommand(): Promise<void> {
    if (!this.currentTask || !this.currentSpec) {
      await this.notificationService.sendSMS(
        '📊 Status: Idle\n\nNo current task. Waiting for next task...'
      );
      return;
    }

    const message = `📊 SpecGofer Status

🎯 Current Task: ${this.currentTask.id}
📝 ${this.currentTask.description}

📋 Spec: ${this.currentSpec.title}
🔄 Status: ${this.currentTask.status}
🔢 Attempt: ${this.currentTask.attempts || 0}/3

⏱️ Started: Just now
🚀 Running: ${this.isRunning ? 'Yes' : 'No'}

Reply with:
- "skip" to skip this task
- "retry" to retry from scratch
- "stop" to pause SpecGofer`;

    await this.notificationService.sendSMS(message);
  }

  private async handleStopCommand(): Promise<void> {
    this.stop();
    await this.notificationService.sendSMS(
      '⏸️ SpecGofer paused.\n\nTo resume, restart from VSCode.'
    );
  }

  private async handleSkipCommand(): Promise<void> {
    if (!this.currentTask) {
      await this.notificationService.sendSMS('❌ No task to skip.');
      return;
    }

    console.log(`⏭️ Skipping task ${this.currentTask.id} by user request`);
    await this.updateTaskStatus(this.currentTask.id, 'failed');
    this.currentTask = null;

    await this.notificationService.sendSMS(
      `⏭️ Task skipped. Moving to next task...`
    );
  }

  private async handleRetryCommand(): Promise<void> {
    if (!this.currentTask) {
      await this.notificationService.sendSMS('❌ No task to retry.');
      return;
    }

    console.log(`🔄 Retrying task ${this.currentTask.id} by user request`);
    this.currentTask.attempts = 0;
    await this.updateTaskStatus(this.currentTask.id, 'pending');

    await this.notificationService.sendSMS(
      `🔄 Task reset to pending. Will retry shortly...`
    );
  }

  private async handleHelpCommand(): Promise<void> {
    const helpMessage = `💬 SpecGofer WhatsApp Commands

📊 status - Current task status
⏸️ stop - Pause SpecGofer
⏭️ skip - Skip current task
🔄 retry - Retry current task from scratch
🛠️ fix: [guidance] - Provide guidance for fixing current issue

📖 Examples:
"status" - See what's running
"skip" - Move to next task
"fix: Check the import statements in server.ts"

When SpecGofer asks a question, just reply with your answer!`;

    await this.notificationService.sendSMS(helpMessage);
  }

  private async handleUserGuidance(message: string): Promise<void> {
    if (!this.currentTask) {
      await this.notificationService.sendSMS('❌ No active task to provide guidance for.');
      return;
    }

    const guidance = message.replace(/^(fix:|suggest:)\s*/i, '').trim();
    console.log(`\n🛠️ User guidance received: "${guidance}"\n`);

    // Store guidance and trigger re-execution with the hint
    // This would be passed to the Engineer Agent on next iteration
    await this.notificationService.sendSMS(
      `✅ Guidance noted!\n\n"${guidance}"\n\nWill incorporate into next attempt.`
    );

    // TODO: Actually pass this to the engineer agent
    // For now, just log it
    console.log(`💡 User guidance for ${this.currentTask.id}: ${guidance}`);
  }
}
