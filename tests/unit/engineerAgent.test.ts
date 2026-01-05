/**
 * EngineerAgent Unit Tests
 *
 * Tests for EngineerAgent prompt building and response parsing logic.
 * Uses real test data (not mocks) per project testing philosophy.
 *
 * For integration tests with real API calls,
 * see tests/integration/engineerAgent.integration.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EngineerAgent } from '../../src/agents/EngineerAgent.js';
import { ClaudeClient } from '../../src/utils/ClaudeClient.js';
import type { TestResult } from '../../src/types/index.js';

// Helper to check if API key is available for integration tests
const hasApiKey = (): boolean => {
  const key = process.env.ANTHROPIC_API_KEY;
  return key !== undefined && key.length > 0;
};

describe('EngineerAgent', () => {
  describe('Unit Tests (no API calls)', () => {
    let engineerAgent: EngineerAgent;
    let mockClaudeClient: ClaudeClient;

    beforeEach(() => {
      // Create a ClaudeClient with a dummy key for unit tests
      // These tests don't make actual API calls
      mockClaudeClient = new ClaudeClient('dummy-key-for-unit-tests');
      engineerAgent = new EngineerAgent(mockClaudeClient);
    });

    describe('buildValidationPrompt', () => {
      const sampleCode = `
        export class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
        }
      `;

      const sampleConstitution = `
        # Coding Standards
        1. Use TypeScript strict mode
        2. Add JSDoc comments to public methods
        3. Handle edge cases
      `;

      it('should build prompt with task description, code, and constitution', () => {
        const prompt = engineerAgent.buildValidationPrompt(
          'Implement a calculator class',
          sampleCode,
          sampleConstitution
        );

        expect(prompt).toContain('Implement a calculator class');
        expect(prompt).toContain('Calculator');
        expect(prompt).toContain('Coding Standards');
        expect(prompt).toContain('TypeScript strict mode');
      });

      it('should include test results when provided', () => {
        const testResult: TestResult = {
          id: 'test-123',
          taskId: 'task-456',
          timestamp: new Date().toISOString(),
          testType: 'unit',
          passed: false,
          totalTests: 5,
          passedTests: 3,
          failedTests: 2,
          skippedTests: 0,
          duration: 1500,
          failures: [
            { testName: 'should add numbers', error: 'Expected 5, got 4' },
            { testName: 'should handle negatives', error: 'Overflow error' },
          ],
        };

        const prompt = engineerAgent.buildValidationPrompt(
          'Implement calculator',
          sampleCode,
          sampleConstitution,
          { testResult }
        );

        expect(prompt).toContain('Test Results');
        expect(prompt).toContain('Passed: false');
        expect(prompt).toContain('Total Tests: 5');
        expect(prompt).toContain('Passed Tests: 3');
        expect(prompt).toContain('Failed Tests: 2');
        expect(prompt).toContain('should add numbers');
        expect(prompt).toContain('Expected 5, got 4');
      });

      it('should include validation instructions with JSON format', () => {
        const prompt = engineerAgent.buildValidationPrompt(
          'Test task',
          'test code',
          'test constitution'
        );

        expect(prompt).toContain('Validation Instructions');
        expect(prompt).toContain('JSON');
        expect(prompt).toContain('isValid');
        expect(prompt).toContain('issues');
        expect(prompt).toContain('suggestions');
        expect(prompt).toContain('constitutionChecks');
      });

      it('should include severity categories explanation', () => {
        const prompt = engineerAgent.buildValidationPrompt(
          'Test task',
          'test code',
          'test constitution'
        );

        expect(prompt).toContain('blocker');
        expect(prompt).toContain('critical');
        expect(prompt).toContain('major');
        expect(prompt).toContain('minor');
      });

      it('should include issue categories explanation', () => {
        const prompt = engineerAgent.buildValidationPrompt(
          'Test task',
          'test code',
          'test constitution'
        );

        expect(prompt).toContain('functional');
        expect(prompt).toContain('security');
        expect(prompt).toContain('performance');
        expect(prompt).toContain('quality');
        expect(prompt).toContain('constitution');
      });
    });

    describe('parseValidationResponse', () => {
      it('should parse valid JSON response', () => {
        const jsonResponse = JSON.stringify({
          isValid: true,
          issues: [],
          suggestions: ['Add unit tests'],
          constitutionChecks: { 'TypeScript strict': true },
          assessment: 'Code looks good',
        });

        const result = engineerAgent.parseValidationResponse(jsonResponse);

        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
        expect(result.suggestions).toContain('Add unit tests');
        expect(result.constitutionChecks['TypeScript strict']).toBe(true);
      });

      it('should parse JSON response with issues', () => {
        const jsonResponse = JSON.stringify({
          isValid: false,
          issues: [
            {
              category: 'security',
              severity: 'critical',
              description: 'SQL injection vulnerability',
              location: 'src/db.ts:42',
            },
            {
              category: 'quality',
              severity: 'minor',
              description: 'Missing error handling',
            },
          ],
          suggestions: ['Use parameterized queries', 'Add try-catch blocks'],
          constitutionChecks: { 'Security first': false },
        });

        const result = engineerAgent.parseValidationResponse(jsonResponse);

        expect(result.isValid).toBe(false);
        expect(result.issues).toHaveLength(2);
        expect(result.issues[0].category).toBe('security');
        expect(result.issues[0].severity).toBe('critical');
        expect(result.issues[0].description).toContain('SQL injection');
        expect(result.issues[0].location).toBe('src/db.ts:42');
        expect(result.suggestions).toHaveLength(2);
      });

      it('should parse JSON embedded in text', () => {
        const response = `
          Here is my analysis:

          ${JSON.stringify({
            isValid: true,
            issues: [],
            suggestions: [],
            constitutionChecks: {},
          })}

          That's my assessment.
        `;

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.isValid).toBe(true);
      });

      it('should fall back to structured text parsing when JSON fails', () => {
        const structuredResponse = `
          VALID: false

          CONSTITUTIONAL_ISSUES:
          - Missing type annotations
          - No error handling

          TASK_ISSUES:
          - Does not implement all requirements

          TECHNICAL_ISSUES:
          - Performance could be improved

          SUGGESTIONS:
          - Add TypeScript types
          - Add try-catch blocks
          - Optimize loops

          ASSESSMENT:
          Code needs work.
        `;

        const result = engineerAgent.parseValidationResponse(structuredResponse);

        expect(result.isValid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it('should extract constitutional issues from structured text', () => {
        const response = `
          VALID: false

          CONSTITUTIONAL_ISSUES:
          - Violates coding standards
          - Missing documentation

          TASK_ISSUES:

          TECHNICAL_ISSUES:

          SUGGESTIONS:

          ASSESSMENT: Fix issues.
        `;

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.issues.some((i) => i.category === 'constitution')).toBe(true);
        expect(result.issues.some((i) => i.description.includes('coding standards'))).toBe(true);
      });

      it('should extract task issues from structured text', () => {
        const response = `
          VALID: false

          CONSTITUTIONAL_ISSUES:

          TASK_ISSUES:
          - Missing feature X
          - Wrong behavior for Y

          TECHNICAL_ISSUES:

          SUGGESTIONS:

          ASSESSMENT: Incomplete.
        `;

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.issues.some((i) => i.category === 'functional')).toBe(true);
      });

      it('should extract technical issues from structured text', () => {
        const response = `
          VALID: true

          CONSTITUTIONAL_ISSUES:

          TASK_ISSUES:

          TECHNICAL_ISSUES:
          - Could optimize memory usage
          - Consider caching

          SUGGESTIONS:

          ASSESSMENT: Good but could be better.
        `;

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.issues.some((i) => i.category === 'quality')).toBe(true);
      });

      it('should handle response with no issues', () => {
        const response = `
          VALID: true

          CONSTITUTIONAL_ISSUES:

          TASK_ISSUES:

          TECHNICAL_ISSUES:

          SUGGESTIONS:

          ASSESSMENT: Perfect implementation.
        `;

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should handle malformed response gracefully', () => {
        const malformedResponse = 'This is not a valid response format at all.';

        const result = engineerAgent.parseValidationResponse(malformedResponse);

        expect(result).toBeDefined();
        expect(result.isValid).toBe(false);
      });

      it('should include timestamp and ID in result', () => {
        const response = JSON.stringify({
          isValid: true,
          issues: [],
          suggestions: [],
          constitutionChecks: {},
        });

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.id).toBeDefined();
        expect(result.timestamp).toBeDefined();
        expect(new Date(result.timestamp).getTime()).not.toBeNaN();
      });

      it('should set taskId from test result when provided', () => {
        const response = JSON.stringify({
          isValid: true,
          issues: [],
          suggestions: [],
          constitutionChecks: {},
        });

        const result = engineerAgent.parseValidationResponse(response, {
          testResult: {
            id: 'test-id',
            taskId: 'my-task-123',
            timestamp: new Date().toISOString(),
            testType: 'unit',
            passed: true,
            totalTests: 1,
            passedTests: 1,
            failedTests: 0,
            skippedTests: 0,
            duration: 100,
            failures: [],
          },
        });

        expect(result.taskId).toBe('my-task-123');
      });

      it('should handle issues without optional fields', () => {
        const response = JSON.stringify({
          isValid: false,
          issues: [
            { description: 'Some issue without category or severity' },
            { description: 'Another basic issue' },
          ],
          suggestions: [],
          constitutionChecks: {},
        });

        const result = engineerAgent.parseValidationResponse(response);

        expect(result.issues).toHaveLength(2);
        // Should default to 'quality' category and 'minor' severity
        expect(result.issues[0].category).toBe('quality');
        expect(result.issues[0].severity).toBe('minor');
      });
    });

    describe('constructor', () => {
      it('should create instance with ClaudeClient', () => {
        const client = new ClaudeClient('test-key');
        const agent = new EngineerAgent(client);
        expect(agent).toBeInstanceOf(EngineerAgent);
      });
    });
  });

  describe('Integration Tests (Real API Calls)', () => {
    let engineerAgent: EngineerAgent;

    beforeEach(() => {
      if (hasApiKey()) {
        const claudeClient = new ClaudeClient(process.env.ANTHROPIC_API_KEY!);
        engineerAgent = new EngineerAgent(claudeClient);
      }
    });

    it.runIf(hasApiKey())(
      'should validate simple code successfully',
      async () => {
        const code = `
          export function add(a: number, b: number): number {
            return a + b;
          }
        `;

        const constitution = `
          # Coding Standards
          - Use TypeScript
          - Functions should have return types
        `;

        const result = await engineerAgent.validate(
          'Implement an add function',
          code,
          constitution
        );

        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(result.id).toBeDefined();
        expect(result.timestamp).toBeDefined();
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should detect issues in problematic code',
      async () => {
        const badCode = `
          function process(data) {
            eval(data);  // Security vulnerability
            return data.toUpperCase();  // Missing null check
          }
        `;

        const constitution = `
          # Security Standards
          - Never use eval()
          - Always validate inputs
        `;

        const result = await engineerAgent.validate(
          'Process user input safely',
          badCode,
          constitution
        );

        expect(result.isValid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should perform quick validation',
      async () => {
        const code = `
          export const greet = (name: string): string => \`Hello, \${name}!\`;
        `;

        const result = await engineerAgent.quickValidate('Create a greeting function', code);

        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(typeof result.summary).toBe('string');
        expect(result.summary.length).toBeGreaterThan(0);
      },
      { timeout: 30000 }
    );

    it.runIf(hasApiKey())(
      'should check specific principle compliance',
      async () => {
        const code = `
          export function divide(a: number, b: number): number {
            return a / b;
          }
        `;

        const result = await engineerAgent.checkPrinciple(
          code,
          'Functions should handle edge cases like division by zero'
        );

        expect(result).toBeDefined();
        expect(typeof result.compliant).toBe('boolean');
        expect(typeof result.explanation).toBe('string');
        // This code doesn't handle division by zero, so it should fail
        expect(result.compliant).toBe(false);
      },
      { timeout: 30000 }
    );
  });
});
