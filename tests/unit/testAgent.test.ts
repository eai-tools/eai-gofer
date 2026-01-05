/**
 * TestAgent Unit Tests
 *
 * Tests for TestAgent parsing logic and helper methods.
 * Uses real test data (not mocks) per project testing philosophy.
 *
 * For integration tests that execute actual test commands,
 * see tests/integration/testAgent.integration.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestAgent } from '../../src/agents/TestAgent.js';

describe('TestAgent', () => {
  let testAgent: TestAgent;

  beforeEach(() => {
    testAgent = new TestAgent('/test/workspace');
  });

  describe('constructor', () => {
    it('should set workspace directory', () => {
      const agent = new TestAgent('/custom/workspace');
      expect(agent).toBeInstanceOf(TestAgent);
    });

    it('should default to current working directory', () => {
      const agent = new TestAgent();
      expect(agent).toBeInstanceOf(TestAgent);
    });
  });

  describe('parseTestResults', () => {
    describe('Vitest JSON output parsing', () => {
      it('should parse Vitest JSON output with all tests passing', () => {
        const vitestOutput = JSON.stringify({
          numTotalTests: 5,
          numPassedTests: 5,
          numFailedTests: 0,
          numPendingTests: 0,
          success: true,
          testResults: [
            { name: 'test1.ts', status: 'passed' },
            { name: 'test2.ts', status: 'passed' },
          ],
        });

        const result = testAgent.parseTestResults(vitestOutput, 'task-001');

        expect(result.passed).toBe(true);
        expect(result.totalTests).toBe(5);
        expect(result.passedTests).toBe(5);
        expect(result.failedTests).toBe(0);
        expect(result.failures).toHaveLength(0);
      });

      it('should parse Vitest JSON output with failed tests', () => {
        const vitestOutput = JSON.stringify({
          numTotalTests: 5,
          numPassedTests: 3,
          numFailedTests: 2,
          numPendingTests: 0,
          success: false,
          testResults: [
            { name: 'test1.ts', status: 'passed' },
            { name: 'test2.ts', status: 'failed', message: 'Assertion failed' },
            {
              name: 'test3.ts',
              status: 'failed',
              message: 'Type error',
              assertionResults: [
                {
                  title: 'should work',
                  status: 'failed',
                  failureMessages: ['Expected true, got false'],
                },
              ],
            },
          ],
        });

        const result = testAgent.parseTestResults(vitestOutput, 'task-001');

        expect(result.passed).toBe(false);
        expect(result.totalTests).toBe(5);
        expect(result.passedTests).toBe(3);
        expect(result.failedTests).toBe(2);
        expect(result.failures.length).toBeGreaterThan(0);
        expect(result.failures[0].testName).toBe('test2.ts');
      });

      it('should handle pending/skipped tests', () => {
        const vitestOutput = JSON.stringify({
          numTotalTests: 10,
          numPassedTests: 7,
          numFailedTests: 0,
          numPendingTests: 3,
          success: true,
          testResults: [],
        });

        const result = testAgent.parseTestResults(vitestOutput, 'task-001');

        expect(result.passed).toBe(true);
        expect(result.skippedTests).toBe(3);
      });
    });

    describe('Playwright JSON output parsing', () => {
      it('should parse Playwright JSON output with all tests passing', () => {
        const playwrightOutput = JSON.stringify({
          config: {},
          suites: [
            {
              title: 'E2E Tests',
              specs: [
                {
                  title: 'Login Spec',
                  tests: [
                    { title: 'should login', status: 'passed', duration: 1500 },
                    { title: 'should logout', status: 'passed', duration: 800 },
                  ],
                },
              ],
            },
          ],
        });

        const result = testAgent.parseTestResults(playwrightOutput, 'task-002');

        expect(result.passed).toBe(true);
        expect(result.totalTests).toBe(2);
        expect(result.passedTests).toBe(2);
        expect(result.failedTests).toBe(0);
        expect(result.testType).toBe('e2e');
      });

      it('should parse Playwright JSON output with failed tests', () => {
        const playwrightOutput = JSON.stringify({
          config: {},
          suites: [
            {
              title: 'E2E Tests',
              specs: [
                {
                  title: 'Login Spec',
                  tests: [
                    { title: 'should login', status: 'passed', duration: 1500 },
                    {
                      title: 'should handle error',
                      status: 'failed',
                      duration: 2000,
                      error: { message: 'Element not found', stack: 'at line 42' },
                    },
                  ],
                },
              ],
            },
          ],
        });

        const result = testAgent.parseTestResults(playwrightOutput, 'task-002');

        expect(result.passed).toBe(false);
        expect(result.totalTests).toBe(2);
        expect(result.passedTests).toBe(1);
        expect(result.failedTests).toBe(1);
        expect(result.failures[0].error).toContain('Element not found');
      });

      it('should handle skipped tests', () => {
        const playwrightOutput = JSON.stringify({
          config: {},
          suites: [
            {
              title: 'E2E Tests',
              specs: [
                {
                  title: 'Feature Spec',
                  tests: [
                    { title: 'should work', status: 'passed', duration: 500 },
                    { title: 'should skip', status: 'skipped', duration: 0 },
                  ],
                },
              ],
            },
          ],
        });

        const result = testAgent.parseTestResults(playwrightOutput, 'task-003');

        expect(result.passed).toBe(true);
        expect(result.skippedTests).toBe(1);
      });

      it('should handle timed out tests', () => {
        const playwrightOutput = JSON.stringify({
          config: {},
          suites: [
            {
              title: 'Slow Tests',
              specs: [
                {
                  title: 'Timeout Spec',
                  tests: [
                    {
                      title: 'should not timeout',
                      status: 'timedOut',
                      duration: 30000,
                      error: { message: 'Test timeout of 30000ms exceeded' },
                    },
                  ],
                },
              ],
            },
          ],
        });

        const result = testAgent.parseTestResults(playwrightOutput, 'task-004');

        expect(result.passed).toBe(false);
        expect(result.failures[0].error).toContain('timeout');
      });
    });

    describe('Basic text output parsing', () => {
      it('should parse basic passing test output', () => {
        const output = `
          Running tests...
          5 passing
          0 failing
          Test run complete!
        `;

        const result = testAgent.parseTestResults(output, 'task-005');

        expect(result.passed).toBe(true);
        expect(result.passedTests).toBe(5);
        expect(result.failedTests).toBe(0);
      });

      it('should parse basic failing test output', () => {
        const output = `
          Running tests...
          3 passing
          2 failing
          FAIL src/tests/feature.test.ts
            Error: Expected 1, got 2
        `;

        const result = testAgent.parseTestResults(output, 'task-006');

        expect(result.passed).toBe(false);
        expect(result.passedTests).toBe(3);
      });

      it('should parse output with skipped tests', () => {
        const output = `
          8 passing
          0 failing
          2 skipped
        `;

        const result = testAgent.parseTestResults(output, 'task-007');

        expect(result.passed).toBe(true);
        expect(result.passedTests).toBe(8);
        expect(result.skippedTests).toBe(2);
      });

      it('should detect FAIL markers in output', () => {
        const output = `
          FAIL tests/unit/parser.test.ts
            Expected value to be true

          1 passed
          1 failed
        `;

        const result = testAgent.parseTestResults(output, 'task-008');

        expect(result.passed).toBe(false);
        expect(result.failures.length).toBeGreaterThan(0);
      });

      it('should handle output with passed indicator', () => {
        const output = `
          All tests PASS
        `;

        const result = testAgent.parseTestResults(output, 'task-009');

        expect(result.passed).toBe(true);
      });

      it('should handle empty output gracefully', () => {
        const result = testAgent.parseTestResults('', 'task-010');

        expect(result.passed).toBe(false);
        expect(result.totalTests).toBe(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle malformed JSON gracefully', () => {
        const malformedOutput = '{ "numTotalTests": broken }';

        const result = testAgent.parseTestResults(malformedOutput, 'task-011');

        // Should fall back to basic parsing
        expect(result).toBeDefined();
        expect(result.testType).toBe('unit');
      });

      it('should set correct testType for Vitest', () => {
        const vitestOutput = JSON.stringify({
          numTotalTests: 1,
          numPassedTests: 1,
          numFailedTests: 0,
          numPendingTests: 0,
          success: true,
          testResults: [],
        });

        const result = testAgent.parseTestResults(vitestOutput, 'task-012');

        expect(result.testType).toBe('unit');
      });

      it('should set correct testType for Playwright', () => {
        const playwrightOutput = JSON.stringify({
          config: {},
          suites: [],
        });

        const result = testAgent.parseTestResults(playwrightOutput, 'task-013');

        expect(result.testType).toBe('e2e');
      });

      it('should include timestamp in result', () => {
        const result = testAgent.parseTestResults('1 passing', 'task-014');

        expect(result.timestamp).toBeDefined();
        expect(new Date(result.timestamp).getTime()).not.toBeNaN();
      });

      it('should generate unique IDs for each result', () => {
        const result1 = testAgent.parseTestResults('1 passing', 'task-015');
        const result2 = testAgent.parseTestResults('1 passing', 'task-016');

        expect(result1.id).not.toBe(result2.id);
      });
    });
  });
});
