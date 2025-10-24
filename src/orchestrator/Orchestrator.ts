import { Spec, Task, AgentResponse } from '../types.js';
import { SpecLoader } from './SpecLoader.js';
import { QAEngine } from './QAEngine.js';
import { TestAgent } from '../agents/TestAgent.js';
import { EngineerAgent } from '../agents/EngineerAgent.js';
import { ClaudeCodeInterceptor } from '../interceptor/ClaudeCodeInterceptor.js';
import { NotificationService } from '../utils/NotificationService.js';

export class Orchestrator {
  private specLoader: SpecLoader;
  private qaEngine: QAEngine;
  private testAgent: TestAgent;
  private engineerAgent: EngineerAgent;
  private interceptor: ClaudeCodeInterceptor;
  private notificationService: NotificationService;
  private currentSpec: Spec | null = null;
  private currentTask: Task | null = null;
  private isProcessing = false;

  constructor(
    specDir: string,
    apiKey: string,
    twilioConfig: any,
    workspaceDir: string
  ) {
    this.specLoader = new SpecLoader(specDir);
    this.testAgent = new TestAgent(workspaceDir);
    this.engineerAgent = new EngineerAgent(apiKey);
    this.notificationService = new NotificationService(twilioConfig);
    this.interceptor = new ClaudeCodeInterceptor();

    // Initialize QA engine (will load specs async)
    this.qaEngine = new QAEngine(apiKey, []);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const specs = await this.specLoader.loadAllSpecs();
    this.qaEngine.updateSpecs(specs);
    console.log(`Loaded ${specs.length} specifications`);
  }

  async start(workspaceDir?: string): Promise<void> {
    console.log('🚀 Starting Spec-Driven Development Orchestrator...');

    // Set up Claude Code interceptor
    this.interceptor.onResponse(async (response) => {
      await this.handleClaudeCodeResponse(response);
    });

    this.interceptor.onQuestion(async (question) => {
      await this.handleClaudeCodeQuestion(question);
    });

    // Start file watching if workspace directory is provided
    if (workspaceDir) {
      console.log('📁 Starting file monitoring...');
      await this.interceptor.start(workspaceDir);
    }

    // Start processing specs
    await this.processNextSpec();
  }

  private async processNextSpec(): Promise<void> {
    if (this.isProcessing) {return;}

    const specs = await this.specLoader.loadAllSpecs();
    const pendingSpec = specs.find(s => s.tasks.some(t => t.status !== 'completed'));

    if (!pendingSpec) {
      console.log('✅ All specifications completed!');
      return;
    }

    this.currentSpec = pendingSpec;
    console.log(`\n📋 Processing spec: ${pendingSpec.title}`);

    await this.processNextTask();
  }

  private async processNextTask(): Promise<void> {
    if (!this.currentSpec) {return;}

    // Find next task that has all dependencies completed
    const nextTask = this.currentSpec.tasks.find(task => {
      if (task.status === 'completed') {return false;}
      if (task.status === 'in_progress' || task.status === 'testing') {return true;}

      // Check if all dependencies are completed
      return task.dependencies.every(depId =>
        this.currentSpec!.tasks.find(t => t.id === depId)?.status === 'completed'
      );
    });

    if (!nextTask) {
      console.log(`✅ Spec "${this.currentSpec.title}" completed!`);
      this.currentSpec = null;
      await this.processNextSpec();
      return;
    }

    this.currentTask = nextTask;

    if (nextTask.status === 'pending') {
      console.log(`\n🔨 Starting task: ${nextTask.description}`);
      await this.specLoader.updateTaskStatus(this.currentSpec.id, nextTask.id, 'in_progress');

      // Send delivery prompt to Claude Code
      await this.interceptor.sendToClaudeCode(nextTask.deliveryPrompt);
      this.isProcessing = true;
    } else if (nextTask.status === 'testing') {
      // Already sent to Claude, waiting for validation
      console.log(`⏳ Waiting for task validation: ${nextTask.description}`);
    }
  }

  private async handleClaudeCodeResponse(response: string): Promise<void> {
    if (!this.currentSpec || !this.currentTask) {return;}

    console.log('\n📥 Received response from Claude Code');

    // Step 1: Run tests
    console.log('🧪 Running Playwright tests...');
    await this.specLoader.updateTaskStatus(this.currentSpec.id, this.currentTask.id, 'testing');

    const testResult = await this.testAgent.runTests(
      this.currentSpec.acceptanceCriteria.filter(ac => ac.testType === 'playwright')
    );

    if (!testResult.passed) {
      console.log(`❌ Tests failed: ${testResult.failedTests.join(', ')}`);

      // Step 2: Engineer agent validates and suggests fixes
      console.log('🔍 Engineer agent analyzing issues...');
      const validation = await this.engineerAgent.validate(
        this.currentTask.description,
        response,
        testResult
      );

      if (!validation.isValid) {
        console.log(`🔧 Requesting fixes from Claude Code...`);

        const fixPrompt = `The implementation has issues:\n\nFailed tests:\n${testResult.failedTests.join('\n')}\n\nIssues found:\n${validation.issues.join('\n')}\n\nSuggestions:\n${validation.suggestions.join('\n')}\n\nPlease fix these issues.`;

        await this.interceptor.sendToClaudeCode(fixPrompt);

        // Track attempt
        this.currentTask.attempts = (this.currentTask.attempts || 0) + 1;

        if (this.currentTask.attempts > 3) {
          console.log('⚠️  Max attempts reached, requesting human intervention');
          await this.notificationService.sendSMS(
            `Task "${this.currentTask.description}" failed after 3 attempts.\n\nLast error: ${testResult.summary}\n\nPlease review.`
          );

          await this.specLoader.updateTaskStatus(this.currentSpec.id, this.currentTask.id, 'failed');
          this.isProcessing = false;
          return;
        }

        return; // Wait for Claude to respond with fixes
      }
    }

    // Success!
    console.log(`✅ Task completed: ${this.currentTask.description}`);
    await this.specLoader.updateTaskStatus(this.currentSpec.id, this.currentTask.id, 'completed');

    this.isProcessing = false;
    this.currentTask = null;

    // Process next task
    await this.processNextTask();
  }

  private async handleClaudeCodeQuestion(question: string): Promise<void> {
    console.log(`\n❓ Claude Code asked: "${question}"`);

    // Try to answer from specs
    const qaResult = await this.qaEngine.answerQuestion(question);

    if (qaResult.needsHuman) {
      console.log('🤷 Cannot answer from spec, asking human...');

      await this.notificationService.sendSMS(
        `Claude Code has a question:\n\n"${question}"\n\nThe spec cannot answer this with confidence. Please respond.`
      );

      // In a real implementation, you'd wait for human response
      // For now, we'll just log it
      console.log('⏳ Waiting for human response...');
    } else {
      console.log(`💡 Answered from spec (${qaResult.confidence} confidence): ${qaResult.answer}`);

      // Send answer back to Claude Code
      await this.interceptor.sendToClaudeCode(qaResult.answer!);
    }
  }

  async handleManualQuestion(question: string): Promise<void> {
    const qaResult = await this.qaEngine.answerQuestion(question);
    console.log(`\nQuestion: ${question}`);
    console.log(`Answer: ${qaResult.answer || 'Cannot determine from spec'}`);
    console.log(`Confidence: ${qaResult.confidence}`);
    console.log(`Needs human: ${qaResult.needsHuman}`);
  }
}
