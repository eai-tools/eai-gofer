import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EngineerAgent } from '../../src/agents/EngineerAgent.js';
import type { TestResult } from '../../src/types.js';

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate
      }
    }))
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn()
}));

describe('EngineerAgent', () => {
  let engineerAgent: EngineerAgent;
  let mockTestResult: TestResult;

  beforeEach(() => {
    vi.clearAllMocks();
    engineerAgent = new EngineerAgent('test-api-key', '/test/workspace');
    
    mockTestResult = {
      passed: true,
      failedTests: [],
      summary: 'All tests passed'
    };
  });

  describe('validate', () => {
    const mockImplementation = `
      export class TestClass {
        constructor(private name: string) {}
        
        greet(): string {
          return \`Hello, \${this.name}!\`;
        }
      }
    `;

    it('should validate code successfully', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: `VALID: true

CONSTITUTIONAL_ISSUES:

TASK_ISSUES:

TECHNICAL_ISSUES:

SUGGESTIONS:

ASSESSMENT:
Code looks good and follows all requirements.`
        }]
      };

      // Mock constitution file
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockResolvedValue(mockResponse);

      const result = await engineerAgent.validate(
        'Implement a greeting class',
        mockImplementation,
        mockTestResult
      );

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should identify validation issues', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: `VALID: false

CONSTITUTIONAL_ISSUES:
- Missing type annotations in several places
- No error handling for user input

TASK_ISSUES:
- Implementation doesn't match specification

TECHNICAL_ISSUES:
- Performance could be improved

SUGGESTIONS:
- Add TypeScript types
- Add try-catch blocks
- Add input validation

ASSESSMENT:
Code needs improvements to meet requirements.`
        }]
      };

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockResolvedValue(mockResponse);

      const result = await engineerAgent.validate(
        'Implement a greeting class',
        mockImplementation,
        mockTestResult
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(4);
      expect(result.suggestions).toHaveLength(3);
      expect(result.issues[0]).toBe('Missing type annotations in several places');
    });

    it('should handle API errors gracefully', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await engineerAgent.validate(
        'Implement a greeting class',
        mockImplementation,
        mockTestResult
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Engineer Agent encountered an error during validation');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Invalid response format without expected structure'
        }]
      };

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockResolvedValue(mockResponse);

      const result = await engineerAgent.validate(
        'Implement a greeting class',
        mockImplementation,
        mockTestResult
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should include test results in validation when provided', async () => {
      const failedTestResult: TestResult = {
        passed: false,
        failedTests: ['Test case 1 failed', 'Test case 2 failed'],
        summary: 'Tests failed'
      };

      const mockResponse = {
        content: [{
          type: 'text',
          text: `VALID: false

CONSTITUTIONAL_ISSUES:

TASK_ISSUES:
- Code fails tests

TECHNICAL_ISSUES:

SUGGESTIONS:
- Fix failing test cases

ASSESSMENT:
Code needs to pass tests.`
        }]
      };

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockResolvedValue(mockResponse);

      await engineerAgent.validate('Test task', mockImplementation, failedTestResult);

      // Verify that the test result was included in the API call
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Test Results')
            })
          ])
        })
      );
    });

    it('should validate against constitution principles', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: `VALID: true

CONSTITUTIONAL_ISSUES:

TASK_ISSUES:

TECHNICAL_ISSUES:

SUGGESTIONS:

ASSESSMENT:
Code follows constitutional requirements.`
        }]
      };

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockResolvedValue(mockResponse);

      await engineerAgent.validate('Test task', mockImplementation, mockTestResult);

      // Verify constitution was included in validation prompt
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Constitutional Requirements')
            })
          ])
        })
      );
    });

    it('should handle missing constitution file gracefully', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: Constitution file not found'));

      const mockResponse = {
        content: [{
          type: 'text',
          text: `VALID: true

CONSTITUTIONAL_ISSUES:

TASK_ISSUES:

TECHNICAL_ISSUES:

SUGGESTIONS:

ASSESSMENT:
Code looks good.`
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await engineerAgent.validate(
        'Test task',
        mockImplementation,
        mockTestResult
      );

      // Should still validate even without constitution
      expect(result.isValid).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should use correct Anthropic model and parameters', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: `VALID: true

ASSESSMENT:
Code is valid.`
        }]
      };

      const fs = await import('fs/promises');
      vi.mocked(fs.readFile).mockResolvedValue('# Constitution\nCode quality standards...');

      mockCreate.mockResolvedValue(mockResponse);

      await engineerAgent.validate('Test task', 'test code', mockTestResult);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringMatching(/claude-3/),
          max_tokens: expect.any(Number)
        })
      );
    });
  });
});