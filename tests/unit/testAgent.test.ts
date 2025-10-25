import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AcceptanceCriteria } from '../../src/types.js';

// Mock child_process and util BEFORE importing TestAgent
const mockExecAsync = vi.fn();
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecAsync)
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  access: vi.fn().mockResolvedValue(undefined)
}));

// Now import TestAgent after mocks are set up
const { TestAgent } = await import('../../src/agents/TestAgent.js');

describe('TestAgent', () => {
  let testAgent: InstanceType<typeof TestAgent>;

  beforeEach(() => {
    vi.clearAllMocks();
    testAgent = new TestAgent('/test/workspace');
  });

  describe('runTests', () => {
    it('should handle empty acceptance criteria', async () => {
      const result = await testAgent.runTests([]);

      expect(result.passed).toBe(true);
      expect(result.failedTests).toHaveLength(0);
      expect(result.summary).toBe('No acceptance criteria defined for this task');
    });

    it('should run Playwright tests successfully', async () => {
      const mockCriteria: AcceptanceCriteria[] = [
        {
          id: 'AC001',
          description: 'Test feature works',
          testType: 'playwright',
          testPath: 'tests/e2e/feature.test.ts',
          passed: true
        }
      ];

      const mockPlaywrightOutput = JSON.stringify({
        config: {},
        suites: [{
          title: 'Feature Tests',
          specs: [{
            title: 'Feature Spec',
            tests: [{
              title: 'should work',
              results: [{
                status: 'passed',
                duration: 1000
              }]
            }]
          }]
        }]
      });

      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'Playwright 1.0.0', stderr: '' }) // version check
        .mockResolvedValueOnce({ stdout: 'chromium installed', stderr: '' }) // browser check
        .mockResolvedValueOnce({ stdout: mockPlaywrightOutput, stderr: '' }); // test run

      const result = await testAgent.runTests(mockCriteria);

      expect(result.passed).toBe(true);
      expect(result.failedTests).toHaveLength(0);
    });

    it('should handle Playwright test failures', async () => {
      const mockCriteria: AcceptanceCriteria[] = [
        {
          id: 'AC001',
          description: 'Test feature works',
          testType: 'playwright',
          testPath: 'tests/e2e/feature.test.ts',
          passed: false
        }
      ];

      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'Playwright 1.0.0', stderr: '' }) // version check
        .mockResolvedValueOnce({ stdout: 'chromium installed', stderr: '' }) // browser check
        .mockRejectedValueOnce(new Error('Tests failed')); // test run fails

      const result = await testAgent.runTests(mockCriteria);

      expect(result.passed).toBe(false);
      expect(result.failedTests.length).toBeGreaterThan(0);
    });

    it('should run unit tests successfully', async () => {
      const mockCriteria: AcceptanceCriteria[] = [
        {
          id: 'AC002',
          description: 'Unit tests pass',
          testType: 'unit',
          testPath: 'tests/unit/feature.test.ts',
          passed: true
        }
      ];

      mockExecAsync.mockResolvedValue({ stdout: 'Tests passed: 5/5', stderr: '' });

      const result = await testAgent.runTests(mockCriteria);

      expect(result.passed).toBe(true);
    });

    it('should run integration tests successfully', async () => {
      const mockCriteria: AcceptanceCriteria[] = [
        {
          id: 'AC003',
          description: 'Integration tests pass',
          testType: 'integration',
          testPath: 'tests/integration/feature.test.ts',
          passed: true
        }
      ];

      mockExecAsync.mockResolvedValue({ stdout: 'Integration tests passed', stderr: '' });

      const result = await testAgent.runTests(mockCriteria);

      expect(result.passed).toBe(true);
    });

    it('should handle mixed test results', async () => {
      const mockCriteria: AcceptanceCriteria[] = [
        {
          id: 'AC001',
          description: 'Playwright test',
          testType: 'playwright',
          testPath: 'tests/e2e/feature.test.ts',
          passed: true
        },
        {
          id: 'AC002',
          description: 'Unit test',
          testType: 'unit',
          testPath: 'tests/unit/feature.test.ts',
          passed: false
        }
      ];

      let callCount = 0;
      mockExecAsync.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Playwright version check
          return Promise.resolve({ stdout: 'Playwright 1.0.0', stderr: '' });
        } else if (callCount === 2) {
          // Browser check
          return Promise.resolve({ stdout: 'chromium installed', stderr: '' });
        } else if (callCount === 3) {
          // Playwright test passes
          const stdout = JSON.stringify({
            config: {},
            suites: [{
              title: 'E2E Tests',
              tests: [{ title: 'should work', status: 'passed', duration: 1000 }]
            }]
          });
          return Promise.resolve({ stdout, stderr: '' });
        } else {
          // Unit tests fail
          return Promise.reject(new Error('Unit tests failed'));
        }
      });

      const result = await testAgent.runTests(mockCriteria);

      expect(result.passed).toBe(false);
      expect(result.failedTests.length).toBeGreaterThan(0);
    });

    it('should handle test execution errors', async () => {
      const mockCriteria: AcceptanceCriteria[] = [
        {
          id: 'AC001',
          description: 'Test feature works',
          testType: 'playwright',
          testPath: 'tests/e2e/feature.test.ts',
          passed: false
        }
      ];

      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'Playwright 1.0.0', stderr: '' }) // version check
        .mockRejectedValueOnce(new Error('Command not found')); // browser check fails

      const result = await testAgent.runTests(mockCriteria);

      expect(result.passed).toBe(false);
      expect(result.failedTests).toContain('AC001');
    });
  });

  describe('constructor', () => {
    it('should set workspace directory', () => {
      const agent = new TestAgent('/custom/workspace');
      expect(agent).toBeInstanceOf(TestAgent);
    });
  });
});