import { exec } from 'child_process';
import { promisify } from 'util';
import { AcceptanceCriteria, TestResult } from '../types.js';
import path from 'path';

const execAsync = promisify(exec);

export class TestAgent {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  async runTests(criteria: AcceptanceCriteria[]): Promise<TestResult> {
    const results: TestResult = {
      passed: true,
      failedTests: [],
      summary: ''
    };

    try {
      // Run all Playwright tests for this criteria
      const testPaths = criteria.map(c => c.testPath).join(' ');

      const { stdout, stderr } = await execAsync(
        `npx playwright test ${testPaths} --reporter=json`,
        { cwd: this.workspaceDir }
      );

      // Parse Playwright JSON output
      try {
        const jsonOutput = JSON.parse(stdout);
        const failed = jsonOutput.suites?.flatMap((suite: any) =>
          suite.specs?.filter((spec: any) => spec.tests?.some((test: any) => test.results?.some((r: any) => r.status === 'failed')))
            .map((spec: any) => spec.title)
        ) || [];

        results.passed = failed.length === 0;
        results.failedTests = failed;
        results.summary = results.passed
          ? `All ${criteria.length} acceptance criteria tests passed`
          : `${failed.length} test(s) failed: ${failed.join(', ')}`;

      } catch (parseError) {
        // If JSON parsing fails, try to extract info from text output
        results.passed = !stderr && !stdout.includes('failed');
        results.summary = stdout + stderr;
      }

    } catch (error: any) {
      results.passed = false;
      results.failedTests = criteria.map(c => c.id);
      results.summary = `Test execution failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`;
    }

    return results;
  }

  async runSingleTest(testPath: string): Promise<boolean> {
    try {
      await execAsync(`npx playwright test ${testPath}`, { cwd: this.workspaceDir });
      return true;
    } catch {
      return false;
    }
  }

  async generateTestReport(criteria: AcceptanceCriteria[]): Promise<string> {
    const result = await this.runTests(criteria);

    return `
# Test Report

**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}

## Summary
${result.summary}

## Test Coverage
${criteria.map(c => `- [${c.testPath}] ${c.description}`).join('\n')}

${result.failedTests.length > 0 ? `## Failed Tests\n${result.failedTests.join('\n')}` : ''}
`;
  }
}
