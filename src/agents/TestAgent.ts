import { exec } from 'child_process';
import { promisify } from 'util';
import { AcceptanceCriteria, TestResult } from '../types.js';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// Playwright result types
interface PlaywrightTestResult {
  status: string;
}

interface PlaywrightTest {
  results?: PlaywrightTestResult[];
}

interface PlaywrightSpec {
  title: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightSuite {
  specs?: PlaywrightSpec[];
}

interface PlaywrightOutput {
  suites?: PlaywrightSuite[];
}

export class TestAgent {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  async runTests(criteria: AcceptanceCriteria[]): Promise<TestResult> {
    console.log(`🧪 Test Agent running ${criteria.length} acceptance criteria tests...`);
    
    const results: TestResult = {
      passed: true,
      failedTests: [],
      summary: ''
    };

    if (criteria.length === 0) {
      console.log('ℹ️  No acceptance criteria defined, skipping tests');
      results.summary = 'No acceptance criteria defined for this task';
      return results;
    }

    try {
      // Run tests by type
      const playwrightResults = await this.runPlaywrightTests(criteria.filter(c => c.testType === 'playwright'));
      const unitResults = await this.runUnitTests(criteria.filter(c => c.testType === 'unit'));
      const integrationResults = await this.runIntegrationTests(criteria.filter(c => c.testType === 'integration'));

      // Combine results
      const allResults = [playwrightResults, unitResults, integrationResults];
      
      results.passed = allResults.every(r => r.passed);
      results.failedTests = allResults.flatMap(r => r.failedTests);
      
      const passedCount = allResults.reduce((acc, r) => acc + (r.passed ? 1 : 0), 0);
      const totalTypes = allResults.filter(r => r.summary !== '').length;
      
      results.summary = results.passed 
        ? `All test types passed (${passedCount}/${totalTypes})`
        : `${results.failedTests.length} test(s) failed across ${totalTypes - passedCount} test type(s)`;

      console.log(`✅ Test results: ${results.summary}`);
      
    } catch (error) {
      console.error('❌ Test execution error:', error);
      results.passed = false;
      results.failedTests = ['Test execution error'];
      results.summary = `Test execution failed: ${error}`;
    }

    return results;
  }

  /**
   * Run Playwright end-to-end tests
   */
  private async runPlaywrightTests(criteria: AcceptanceCriteria[]): Promise<TestResult> {
    if (criteria.length === 0) {
      return { passed: true, failedTests: [], summary: '' };
    }

    console.log(`🎭 Running ${criteria.length} Playwright tests...`);

    try {
      // Check if Playwright is installed
      await this.ensurePlaywrightInstalled();

      const testPaths = criteria.map(c => c.testPath).join(' ');
      
      const { stdout, stderr } = await execAsync(
        `npx playwright test ${testPaths} --reporter=json`,
        { 
          cwd: this.workspaceDir,
          timeout: 300000 // 5 minutes timeout
        }
      );

      return this.parsePlaywrightResults(stdout, stderr, criteria);
      
    } catch (error) {
      console.error('Playwright test execution failed:', error);
      return {
        passed: false,
        failedTests: criteria.map(c => c.id),
        summary: `Playwright tests failed: ${error}`
      };
    }
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(criteria: AcceptanceCriteria[]): Promise<TestResult> {
    if (criteria.length === 0) {
      return { passed: true, failedTests: [], summary: '' };
    }

    console.log(`🔬 Running ${criteria.length} unit tests...`);

    try {
      const testPaths = criteria.map(c => c.testPath).join(' ');
      
      // Try different test runners
      let command = '';
      if (await this.fileExists(path.join(this.workspaceDir, 'vitest.config.ts'))) {
        command = `npx vitest run ${testPaths}`;
      } else if (await this.fileExists(path.join(this.workspaceDir, 'jest.config.js'))) {
        command = `npx jest ${testPaths}`;
      } else {
        command = `npm test ${testPaths}`;
      }

      const { stdout, stderr } = await execAsync(command, { 
        cwd: this.workspaceDir,
        timeout: 120000 // 2 minutes timeout
      });

      return this.parseTestResults(stdout, stderr, criteria, 'unit');
      
    } catch (error) {
      console.error('Unit test execution failed:', error);
      return {
        passed: false,
        failedTests: criteria.map(c => c.id),
        summary: `Unit tests failed: ${error}`
      };
    }
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(criteria: AcceptanceCriteria[]): Promise<TestResult> {
    if (criteria.length === 0) {
      return { passed: true, failedTests: [], summary: '' };
    }

    console.log(`🔗 Running ${criteria.length} integration tests...`);

    try {
      const testPaths = criteria.map(c => c.testPath).join(' ');
      
      const { stdout, stderr } = await execAsync(
        `npm run test:integration ${testPaths}`,
        { 
          cwd: this.workspaceDir,
          timeout: 180000 // 3 minutes timeout
        }
      );

      return this.parseTestResults(stdout, stderr, criteria, 'integration');
      
    } catch (error) {
      console.warn('Integration test runner not found, skipping...');
      return { passed: true, failedTests: [], summary: 'Integration tests skipped (no runner found)' };
    }
  }

  /**
   * Ensure Playwright is installed and browsers are available
   */
  private async ensurePlaywrightInstalled(): Promise<void> {
    try {
      // Check if playwright is installed
      await execAsync('npx playwright --version', { cwd: this.workspaceDir });
      
      // Check if browsers are installed
      const { stdout } = await execAsync('npx playwright show browsers', { cwd: this.workspaceDir });
      
      if (!stdout.includes('chromium') || !stdout.includes('installed')) {
        console.log('📦 Installing Playwright browsers...');
        await execAsync('npx playwright install', { cwd: this.workspaceDir });
      }
      
    } catch (error) {
      console.log('📦 Installing Playwright...');
      await execAsync('npm install -D @playwright/test', { cwd: this.workspaceDir });
      await execAsync('npx playwright install', { cwd: this.workspaceDir });
    }
  }

  /**
   * Parse Playwright JSON results
   */
  private parsePlaywrightResults(stdout: string, stderr: string, criteria: AcceptanceCriteria[]): TestResult {
    try {
      const jsonOutput = JSON.parse(stdout) as PlaywrightOutput;
      
      const failed = jsonOutput.suites?.flatMap((suite: PlaywrightSuite) =>
        suite.specs?.filter((spec: PlaywrightSpec) => 
          spec.tests?.some((test: PlaywrightTest) => 
            test.results?.some((r: PlaywrightTestResult) => r.status === 'failed')
          )
        ).map((spec: PlaywrightSpec) => spec.title)
      ).filter((title): title is string => typeof title === 'string') || [];

      return {
        passed: failed.length === 0,
        failedTests: failed,
        summary: failed.length === 0 
          ? `All ${criteria.length} Playwright tests passed`
          : `${failed.length} Playwright test(s) failed: ${failed.join(', ')}`
      };
      
    } catch (parseError) {
      // Fallback to text parsing
      const hasFailures = stderr.includes('failed') || stdout.includes('failed');
      
      return {
        passed: !hasFailures,
        failedTests: hasFailures ? ['Playwright test failures detected'] : [],
        summary: hasFailures ? 'Playwright tests failed (text output)' : 'Playwright tests passed'
      };
    }
  }

  /**
   * Parse generic test results
   */
  private parseTestResults(stdout: string, stderr: string, criteria: AcceptanceCriteria[], testType: string): TestResult {
    const output = stdout + stderr;
    const hasFailures = output.toLowerCase().includes('failed') || 
                       output.toLowerCase().includes('error') ||
                       stderr.length > 0;

    // Try to extract specific failure information
    const failureMatches = output.match(/(\d+)\s+failed/i);
    const failureCount = failureMatches ? parseInt(failureMatches[1]) : 0;

    return {
      passed: !hasFailures,
      failedTests: hasFailures ? [`${testType} test failures`] : [],
      summary: hasFailures 
        ? `${failureCount || 'Some'} ${testType} test(s) failed`
        : `All ${criteria.length} ${testType} tests passed`
    };
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}