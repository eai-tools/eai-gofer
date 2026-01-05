/**
 * Test Agent - Executes and validates tests with optional LLM Council integration
 *
 * Features:
 * - Run unit, integration, and e2e tests
 * - Parse Vitest and Playwright output
 * - Optional LLM council for test analysis and recommendations
 * - Track test coverage and failures
 *
 * @see .specify/specs/003-orchestrator-agents/data-model.md
 * @see .specify/specs/009-llm-council-integration/spec.md
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  TestResult,
  TestFailure,
  CoverageReport,
  AcceptanceCriterion,
} from '../types/index.js';

const execAsync = promisify(exec);

/**
 * Test execution options
 */
export interface TestOptions {
  /** Working directory for test execution */
  workspaceDir?: string;
  /** Test type to run */
  testType?: 'unit' | 'integration' | 'e2e';
  /** Timeout in milliseconds */
  timeout?: number;
  /** Collect coverage data */
  coverage?: boolean;
  /** Use LLM council for analysis (requires API keys) */
  useCouncil?: boolean;
}

/**
 * Vitest JSON output format
 */
interface VitestResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  success: boolean;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed' | 'pending';
    message?: string;
    assertionResults?: Array<{
      title: string;
      status: 'passed' | 'failed';
      failureMessages?: string[];
    }>;
  }>;
}

/**
 * Playwright JSON output format
 */
interface PlaywrightResult {
  config: Record<string, unknown>;
  suites: Array<{
    title: string;
    specs: Array<{
      title: string;
      tests: Array<{
        title: string;
        status: 'passed' | 'failed' | 'skipped' | 'timedOut';
        duration: number;
        error?: { message: string; stack?: string };
      }>;
    }>;
  }>;
}

/**
 * Test Agent for running and analyzing test suites
 */
export class TestAgent {
  private workspaceDir: string;

  constructor(workspaceDir: string = process.cwd()) {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Run tests with a specific command
   */
  async runTests(testCommand: string, taskId = ''): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: this.workspaceDir,
        timeout: 300000, // 5 minute timeout
      });

      const result = this.parseTestResults(stdout + stderr, taskId);
      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      // Command failed, try to parse any output
      const errorOutput =
        error instanceof Error ? (error as { stdout?: string; stderr?: string }).stdout || '' : '';
      const result = this.parseTestResults(errorOutput, taskId);
      result.passed = false;
      result.duration = Date.now() - startTime;

      if (result.failures.length === 0) {
        result.failures.push({
          testName: 'Test Execution',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return result;
    }
  }

  /**
   * Run tests for specific acceptance criteria
   */
  async runAcceptanceTests(
    criteria: AcceptanceCriterion[],
    options: TestOptions = {}
  ): Promise<TestResult> {
    const taskId = crypto.randomUUID();
    const startTime = Date.now();
    const failures: TestFailure[] = [];
    let totalTests = 0;
    let passedTests = 0;

    for (const criterion of criteria) {
      totalTests++;

      try {
        // Determine test command based on criterion description
        const testCommand = this.inferTestCommand(criterion, options);

        if (testCommand) {
          const result = await this.runTests(testCommand, criterion.id);

          if (result.passed) {
            passedTests++;
          } else {
            failures.push(...result.failures);
          }
        } else {
          // No test command could be inferred
          failures.push({
            testName: criterion.id,
            error: `No test command could be inferred for criterion: ${criterion.description}`,
          });
        }
      } catch (error) {
        failures.push({
          testName: criterion.id,
          error: error instanceof Error ? error.message : 'Test execution failed',
        });
      }
    }

    const result: TestResult = {
      id: crypto.randomUUID(),
      taskId,
      timestamp: new Date().toISOString(),
      testType: options.testType || 'unit',
      passed: failures.length === 0,
      totalTests,
      passedTests,
      failedTests: failures.length,
      skippedTests: 0,
      duration: Date.now() - startTime,
      failures,
    };

    // Add coverage if requested
    if (options.coverage) {
      result.coverage = await this.collectCoverage();
    }

    return result;
  }

  /**
   * Parse test output into structured results
   */
  parseTestResults(output: string, taskId = ''): TestResult {
    // Try to parse as Vitest JSON
    const vitestResult = this.parseVitestOutput(output);
    if (vitestResult) {
      return vitestResult;
    }

    // Try to parse as Playwright JSON
    const playwrightResult = this.parsePlaywrightOutput(output);
    if (playwrightResult) {
      return playwrightResult;
    }

    // Fall back to basic parsing
    return this.parseBasicOutput(output, taskId);
  }

  /**
   * Parse Vitest JSON output
   */
  private parseVitestOutput(output: string): TestResult | null {
    try {
      // Look for JSON in output
      const jsonMatch = output.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const data: VitestResult = JSON.parse(jsonMatch[0]);

      const failures: TestFailure[] = [];
      for (const test of data.testResults || []) {
        if (test.status === 'failed') {
          failures.push({
            testName: test.name,
            error: test.message || 'Test failed',
          });

          for (const assertion of test.assertionResults || []) {
            if (assertion.status === 'failed') {
              failures.push({
                testName: `${test.name} > ${assertion.title}`,
                error: assertion.failureMessages?.join('\n') || 'Assertion failed',
              });
            }
          }
        }
      }

      return {
        id: crypto.randomUUID(),
        taskId: '',
        timestamp: new Date().toISOString(),
        testType: 'unit',
        passed: data.success,
        totalTests: data.numTotalTests,
        passedTests: data.numPassedTests,
        failedTests: data.numFailedTests,
        skippedTests: data.numPendingTests,
        duration: 0,
        failures,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse Playwright JSON output
   */
  private parsePlaywrightOutput(output: string): TestResult | null {
    try {
      // Look for Playwright JSON format
      const jsonMatch = output.match(/\{[\s\S]*"suites"[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const data: PlaywrightResult = JSON.parse(jsonMatch[0]);

      const failures: TestFailure[] = [];
      let totalTests = 0;
      let passedTests = 0;
      let skippedTests = 0;

      for (const suite of data.suites || []) {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            totalTests++;

            if (test.status === 'passed') {
              passedTests++;
            } else if (test.status === 'skipped') {
              skippedTests++;
            } else {
              failures.push({
                testName: `${suite.title} > ${spec.title} > ${test.title}`,
                error: test.error?.message || `Test ${test.status}`,
                stackTrace: test.error?.stack,
              });
            }
          }
        }
      }

      return {
        id: crypto.randomUUID(),
        taskId: '',
        timestamp: new Date().toISOString(),
        testType: 'e2e',
        passed: failures.length === 0,
        totalTests,
        passedTests,
        failedTests: failures.length,
        skippedTests,
        duration: 0,
        failures,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse basic test output (regex patterns)
   */
  private parseBasicOutput(output: string, taskId: string): TestResult {
    const failures: TestFailure[] = [];

    // Common patterns
    const passMatch = output.match(/(\d+)\s*(?:passing|passed)/i);
    const failMatch = output.match(/(\d+)\s*(?:failing|failed)/i);
    const skipMatch = output.match(/(\d+)\s*(?:skipped|pending)/i);

    const passedTests = passMatch ? parseInt(passMatch[1]) : 0;
    const failedTests = failMatch ? parseInt(failMatch[1]) : 0;
    const skippedTests = skipMatch ? parseInt(skipMatch[1]) : 0;
    const totalTests = passedTests + failedTests + skippedTests;

    // Look for failure messages
    const failurePattern =
      /(?:FAIL|FAILED|✕|✖)\s*(.+?)(?:\n\s+(?:Error|AssertionError):\s*(.+))?/g;
    let match;
    while ((match = failurePattern.exec(output)) !== null) {
      failures.push({
        testName: match[1].trim(),
        error: match[2]?.trim() || 'Test failed',
      });
    }

    // Check for overall pass/fail indicators
    const passed =
      failedTests === 0 &&
      !output.includes('FAIL') &&
      !output.includes('Error:') &&
      (passedTests > 0 || output.includes('passed') || output.includes('PASS'));

    return {
      id: crypto.randomUUID(),
      taskId,
      timestamp: new Date().toISOString(),
      testType: 'unit',
      passed,
      totalTests: totalTests || (passed ? 1 : 0),
      passedTests,
      failedTests: failures.length || failedTests,
      skippedTests,
      duration: 0,
      failures,
    };
  }

  /**
   * Infer test command from acceptance criterion
   */
  private inferTestCommand(criterion: AcceptanceCriterion, options: TestOptions): string | null {
    const desc = criterion.description.toLowerCase();

    // Check for specific test file references
    const fileMatch = criterion.description.match(/tests?\/[\w\-/]+\.(?:test|spec)\.\w+/i);
    if (fileMatch) {
      return `npm test -- ${fileMatch[0]}`;
    }

    // Infer based on description
    if (desc.includes('e2e') || desc.includes('end-to-end') || desc.includes('playwright')) {
      return 'npm run test:e2e';
    }

    if (desc.includes('integration')) {
      return 'npm run test:integration';
    }

    if (desc.includes('unit')) {
      return 'npm run test:unit';
    }

    // Default to running all tests
    if (options.testType) {
      return `npm run test:${options.testType}`;
    }

    return null;
  }

  /**
   * Collect coverage information
   */
  private async collectCoverage(): Promise<CoverageReport | undefined> {
    try {
      const coveragePath = path.join(this.workspaceDir, 'coverage', 'coverage-summary.json');
      const content = await fs.readFile(coveragePath, 'utf-8');
      const data = JSON.parse(content);

      const total = data.total || {};
      return {
        line: total.lines?.pct ?? 0,
        branch: total.branches?.pct ?? 0,
        function: total.functions?.pct ?? 0,
        statement: total.statements?.pct ?? 0,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Check if Playwright is available
   */
  async hasPlaywright(): Promise<boolean> {
    try {
      await execAsync('npx playwright --version', { cwd: this.workspaceDir });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Vitest is available
   */
  async hasVitest(): Promise<boolean> {
    try {
      await execAsync('npx vitest --version', { cwd: this.workspaceDir });
      return true;
    } catch {
      return false;
    }
  }
}
