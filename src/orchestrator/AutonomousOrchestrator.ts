import Anthropic from '@anthropic-ai/sdk';
import { Spec, Task, ValidationResult, TestResult } from '../types.js';
import { SpecLoader } from './SpecLoader.js';
import { TestAgent } from '../agents/TestAgent.js';
import { EngineerAgent } from '../agents/EngineerAgent.js';
import { NotificationService, WhatsAppConfig } from '../utils/NotificationService.js';
import { ClaudeCodeInterceptor } from '../interceptor/ClaudeCodeInterceptor.js';
import { QAEngine } from './QAEngine.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Enhanced Autonomous Orchestrator with file monitoring and agent coordination
 * This is the "play button" implementation that runs autonomously
 */
export class AutonomousOrchestrator {
  private specLoader: SpecLoader;
  private testAgent: TestAgent;
  private engineerAgent: EngineerAgent;
  private notificationService: NotificationService;
  private interceptor: ClaudeCodeInterceptor;
  private qaEngine: QAEngine;
  private anthropic: Anthropic;
  private isRunning = false;
  private currentTask: Task | null = null;
  private currentSpec: Spec | null = null;
  private workspaceDir: string;
  private maxAttempts = 3;
  private processingQueue: Task[] = [];
  private pendingResponse: string | null = null;

  constructor(
    specDir: string,
    apiKey: string,
    whatsappConfig: WhatsAppConfig,
    workspaceDir: string
  ) {
    this.workspaceDir = workspaceDir;
    this.specLoader = new SpecLoader(specDir);
    this.testAgent = new TestAgent(workspaceDir);
    this.engineerAgent = new EngineerAgent(apiKey);
    this.notificationService = new NotificationService(whatsappConfig);
    this.interceptor = new ClaudeCodeInterceptor();
    this.qaEngine = new QAEngine(apiKey, []); // Will load specs after initialization
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Start the autonomous execution loop with file monitoring
   * This is what happens when you click the "Play" button
   */
  async start(): Promise<void> {
    console.log('▶️  Starting SpecGofer Autonomous Mode...\n');
    this.isRunning = true;

    // Set up file monitoring for Claude Code communication
    await this.setupFileMonitoring();

    // Set up two-way WhatsApp communication
    this.setupWhatsAppCommands();

    // Load initial specs and build task queue
    await this.buildTaskQueue();

    // Start the main execution loop
    while (this.isRunning) {
      try {
        // Step 1: Get next task from queue
        const nextTask = await this.getNextTaskFromQueue();
        
        if (!nextTask) {
          console.log('⏳ No tasks ready. Waiting for dependencies or new tasks...');
          await this.waitForChanges();
          continue;
        }

        this.currentTask = nextTask;
        console.log(`\n🎯 Processing Task: ${nextTask.id} - ${nextTask.description}`);

        // Step 2: Update task status to in_progress
        await this.updateTaskStatus(nextTask.id, 'in_progress');

        // Step 3: Create task prompt for Claude Code
        await this.sendTaskToClaudeCode(nextTask);

        // Step 4: Wait for Claude Code response (handled by file monitoring)
        console.log('⏳ Waiting for Claude Code response...');
        const response = await this.waitForClaudeResponse();

        if (!response) {
          console.log('⚠️  No response from Claude Code, retrying...');
          continue;
        }

        // Step 5: Validate implementation with Engineer Agent
        console.log('👨‍💻 Engineer Agent validating implementation...');
        const validationResult = await this.engineerAgent.validate(
          nextTask.description,
          response,
          { passed: true, failedTests: [], summary: 'Pre-validation' }
        );

        if (!validationResult.isValid) {
          console.log('❌ Engineer validation failed:', validationResult.issues);
          await this.handleValidationFailure(nextTask, validationResult, response);
          continue;
        }

        // Step 6: Run tests with Test Agent
        console.log('🧪 Test Agent running acceptance tests...');
        const testResult = await this.testAgent.runTests(this.currentSpec?.acceptanceCriteria || []);

        if (!testResult.passed) {
          console.log('❌ Tests failed:', testResult.summary);
          await this.handleTestFailure(nextTask, testResult, response);
          continue;
        }

        // Step 7: Task completed successfully
        console.log('✅ Task completed successfully!');
        await this.updateTaskStatus(nextTask.id, 'completed');
        this.currentTask = null;

        // Small delay before next iteration
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('❌ Error in orchestrator loop:', error);
        await this.handleOrchestrationError(error);
        
        // Brief delay on error to prevent tight error loops
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('🛑 SpecGofer Autonomous Mode stopped.');
  }

  /**
   * Stop the autonomous execution
   */
  stop(): void {
    console.log('\n⏹️  Stopping SpecGofer Autonomous Mode...');
    this.isRunning = false;
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): { isRunning: boolean; currentTask: Task | null; currentSpec: Spec | null } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
      currentSpec: this.currentSpec
    };
  }

  /**
   * Set up file monitoring for Claude Code communication
   */
  private async setupFileMonitoring(): Promise<void> {
    console.log('📁 Setting up file monitoring for Claude Code integration...');
    
    // Set up interceptor to handle Claude Code responses
    this.interceptor.onResponse(async (response) => {
      console.log('📥 Received Claude Code response');
      this.pendingResponse = response;
    });

    this.interceptor.onQuestion(async (question) => {
      console.log('❓ Claude Code has a question:', question);
      await this.handleClaudeQuestion(question);
    });

    // Start file watching
    await this.interceptor.start(this.workspaceDir);
  }

  /**
   * Build task queue with dependency resolution
   */
  private async buildTaskQueue(): Promise<void> {
    console.log('📋 Building task queue with dependency resolution...');

    const specs = await this.specLoader.loadAllSpecs();
    const allTasks: Task[] = [];

    // Update QAEngine with current specs for question answering
    const apiKey = this.anthropic.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.qaEngine = new QAEngine(apiKey, specs);

    // Collect all tasks from all specs
    for (const spec of specs) {
      for (const task of spec.tasks) {
        if (task.status !== 'completed') {
          allTasks.push(task);
        }
      }
    }

    // Sort by dependencies (topological sort)
    this.processingQueue = this.topologicalSort(allTasks);

    console.log(`📊 Task queue built: ${this.processingQueue.length} tasks ready`);
  }

  /**
   * Get next task from queue that's ready to execute
   */
  private async getNextTaskFromQueue(): Promise<Task | null> {
    // Refresh specs to get latest status
    const specs = await this.specLoader.loadAllSpecs();
    
    for (const task of this.processingQueue) {
      // Skip completed or in-progress tasks
      if (task.status === 'completed' || task.status === 'in_progress') {
        continue;
      }

      // Check if all dependencies are completed
      const areDependenciesReady = task.dependencies.every(depId => {
        return specs.some(spec => 
          spec.tasks.some(t => t.id === depId && t.status === 'completed')
        );
      });

      if (areDependenciesReady) {
        // Find the spec this task belongs to
        for (const spec of specs) {
          if (spec.tasks.some(t => t.id === task.id)) {
            this.currentSpec = spec;
            return task;
          }
        }
      }
    }

    return null;
  }

  /**
   * Send task to Claude Code via file system
   */
  private async sendTaskToClaudeCode(task: Task): Promise<void> {
    const inputFile = path.join(this.workspaceDir, '.claude-input.txt');
    
    const prompt = `# Task: ${task.id}

## Description
${task.description}

## Delivery Prompt
${task.deliveryPrompt}

## Context
- Spec: ${this.currentSpec?.title}
- Dependencies: ${task.dependencies.join(', ') || 'None'}

## Instructions
Please implement this task according to the specification. When complete, your response will be saved and validated by our Engineer Agent, then tested by our Test Agent.

Focus on:
1. Following the delivery prompt exactly
2. Writing clean, maintainable code
3. Including appropriate error handling
4. Adding comments where helpful
`;

    await fs.writeFile(inputFile, prompt, 'utf-8');
    console.log(`📤 Task sent to Claude Code: ${inputFile}`);
  }

  /**
   * Wait for Claude Code response
   */
  private async waitForClaudeResponse(): Promise<string | null> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 1000; // 1 second
    let elapsed = 0;

    while (elapsed < maxWaitTime && this.isRunning) {
      if (this.pendingResponse) {
        const response = this.pendingResponse;
        this.pendingResponse = null;
        return response;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;
    }

    return null; // Timeout
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    // Base delay: 5 seconds, exponentially increasing
    const baseDelay = 5000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);

    // Add jitter (random 0-25% variation) to prevent thundering herd
    const jitter = Math.random() * 0.25 * exponentialDelay;

    // Cap at 2 minutes
    return Math.min(exponentialDelay + jitter, 120000);
  }

  /**
   * Handle validation failure
   */
  private async handleValidationFailure(
    task: Task,
    validation: ValidationResult,
    response: string
  ): Promise<void> {
    task.attempts = (task.attempts || 0) + 1;

    if (task.attempts >= this.maxAttempts) {
      console.log(`💥 Task ${task.id} failed validation ${this.maxAttempts} times. Escalating to human.`);

      await this.notificationService.sendSMS(
        `Task ${task.id} failed validation multiple times:\n\n${validation.issues?.join('\n')}\n\nNeeds human intervention.`
      );

      await this.updateTaskStatus(task.id, 'failed');
      return;
    }

    // Calculate backoff delay
    const delay = this.calculateBackoffDelay(task.attempts - 1);
    console.log(`⏱️  Waiting ${Math.round(delay / 1000)}s before retry (exponential backoff)...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Create feedback prompt for Claude Code
    const feedbackPrompt = `# Validation Failed - Task: ${task.id}

## Engineer Agent Feedback
${validation.issues?.join('\n')}

## Suggestions
${validation.suggestions?.join('\n')}

## Previous Implementation
\`\`\`
${response}
\`\`\`

Please fix the issues and implement the task correctly.`;

    const inputFile = path.join(this.workspaceDir, '.claude-input.txt');
    await fs.writeFile(inputFile, feedbackPrompt, 'utf-8');

    console.log(`🔄 Retry ${task.attempts}/${this.maxAttempts} - Feedback sent to Claude Code`);
  }

  /**
   * Handle test failure
   */
  private async handleTestFailure(
    task: Task,
    testResult: TestResult,
    response: string
  ): Promise<void> {
    task.attempts = (task.attempts || 0) + 1;

    if (task.attempts >= this.maxAttempts) {
      console.log(`💥 Task ${task.id} failed tests ${this.maxAttempts} times. Escalating to human.`);

      await this.notificationService.sendSMS(
        `Task ${task.id} failed tests multiple times:\n\n${testResult.summary}\n\nNeeds human intervention.`
      );

      await this.updateTaskStatus(task.id, 'failed');
      return;
    }

    // Calculate backoff delay
    const delay = this.calculateBackoffDelay(task.attempts - 1);
    console.log(`⏱️  Waiting ${Math.round(delay / 1000)}s before retry (exponential backoff)...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Get detailed feedback from Engineer Agent
    const engineerFeedback = await this.engineerAgent.validate(
      task.description,
      response,
      testResult
    );

    const feedbackPrompt = `# Tests Failed - Task: ${task.id}

## Test Results
- Failed Tests: ${testResult.failedTests.join(', ')}
- Summary: ${testResult.summary}

## Engineer Agent Analysis
${engineerFeedback.issues?.join('\n')}

## Suggestions
${engineerFeedback.suggestions?.join('\n')}

## Previous Implementation
\`\`\`
${response}
\`\`\`

Please fix the failing tests and implement the task correctly.`;

    const inputFile = path.join(this.workspaceDir, '.claude-input.txt');
    await fs.writeFile(inputFile, feedbackPrompt, 'utf-8');
    
    console.log(`🔄 Retry ${task.attempts}/${this.maxAttempts} - Test feedback sent to Claude Code`);
  }

  /**
   * Handle Claude Code questions
   */
  private async handleClaudeQuestion(question: string): Promise<void> {
    console.log('🤔 Handling Claude Code question...');

    try {
      // First, try to answer using QAEngine
      const qaResult = await this.qaEngine.answerQuestion(question);

      if (qaResult.answer && (qaResult.confidence === 'high' || qaResult.confidence === 'medium') && !qaResult.needsHuman) {
        // High or medium confidence answer - send it back to Claude Code
        console.log(`✅ QAEngine answered with ${qaResult.confidence} confidence`);

        const answerPath = path.join(this.workspaceDir, '.claude-output.txt');
        await fs.writeFile(
          answerPath,
          `Answer to your question:\n\n${qaResult.answer}\n\n(Confidence: ${qaResult.confidence})`,
          'utf-8'
        );
        return;
      }

      // Low confidence or no answer - escalate to human
      console.log(`⚠️  QAEngine confidence too low (${qaResult.confidence}), escalating to human`);
    } catch (error) {
      console.error('❌ QAEngine error:', error);
    }

    // Fallback: send question to human via SMS
    await this.notificationService.sendSMS(
      `Claude Code has a question:\n\n${question}\n\nPlease respond via WhatsApp.`
    );
  }

  /**
   * Handle orchestration errors
   */
  private async handleOrchestrationError(error: Error | unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('🚨 Orchestration error:', error);
    
    await this.notificationService.sendSMS(
      `SpecGofer orchestration error:\n\n${errorMessage}\n\nCheck logs for details.`
    );
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    if (!this.currentSpec) {
      console.warn(`⚠️  Cannot update task ${taskId}: no current spec`);
      return;
    }

    try {
      await this.specLoader.updateTaskStatus(this.currentSpec.id, taskId, status as any);
      console.log(`📝 Task ${taskId} status updated to: ${status}`);

      // Update the task in memory as well
      const task = this.currentSpec.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status as any;
      }
    } catch (error) {
      console.error(`❌ Failed to update task status for ${taskId}:`, error);
    }
  }

  /**
   * Wait for changes in specs or external triggers
   */
  private async waitForChanges(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  }

  /**
   * Topological sort for task dependencies
   */
  private topologicalSort(tasks: Task[]): Task[] {
    const sorted: Task[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (task: Task) => {
      if (visiting.has(task.id)) {
        throw new Error(`Circular dependency detected involving task ${task.id}`);
      }
      
      if (visited.has(task.id)) {
        return;
      }

      visiting.add(task.id);

      // Visit dependencies first
      for (const depId of task.dependencies) {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask) {
          visit(depTask);
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task);
      }
    }

    return sorted;
  }

  /**
   * Set up WhatsApp commands for human interaction
   */
  private setupWhatsAppCommands(): void {
    // This would set up WhatsApp webhook handling
    console.log('📱 WhatsApp commands ready');
  }
}