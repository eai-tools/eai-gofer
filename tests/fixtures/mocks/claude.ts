/**
 * Mock Claude API responses for testing
 */

import { vi } from 'vitest';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ValidationResponse {
  isValid: boolean;
  issues: string[];
  qualityScore: number;
  suggestions?: string[];
}

export interface TestExecutionResponse {
  passed: boolean;
  coverage: number;
  failedTests: string[];
  duration?: string;
}

export interface TestResults {
  [key: string]: {
    passed: number;
    failed: number;
    duration?: string;
  };
}

export interface AnthropicCreateParams {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

export class MockClaudeAPI {
  private responses: Map<string, ClaudeResponse> = new Map();
  private defaultResponse: ClaudeResponse;

  constructor() {
    this.defaultResponse = {
      id: 'msg_test_default',
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: 'This is a mock response from Claude.'
      }],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 50,
        output_tokens: 20
      }
    };
  }

  /**
   * Set up a mock response for a specific prompt pattern
   */
  public mockResponse(promptPattern: string, response: Partial<ClaudeResponse>): void {
    const fullResponse: ClaudeResponse = {
      ...this.defaultResponse,
      ...response,
      id: response.id || `msg_test_${Date.now()}`,
      content: response.content || [{
        type: 'text',
        text: 'Mock response'
      }]
    };
    
    this.responses.set(promptPattern, fullResponse);
  }

  /**
   * Get mock response for a given prompt
   */
  public getResponse(prompt: string): ClaudeResponse {
    for (const [pattern, response] of this.responses.entries()) {
      if (prompt.includes(pattern)) {
        return response;
      }
    }
    return this.defaultResponse;
  }

  /**
   * Create validation response mock
   */
  public createValidationResponse(isValid: boolean, issues: string[] = []): ValidationResponse {
    return {
      isValid,
      issues,
      suggestions: isValid ? [] : ['Consider refactoring for better maintainability'],
      qualityScore: isValid ? 95 : 65
    };
  }

  /**
   * Create test execution response mock
   */
  public createTestExecutionResponse(passed: boolean, coverage = 85.5, failedTests: string[] = []): TestExecutionResponse {
    return {
      passed,
      coverage,
      failedTests,
      duration: '2.5s'
    };
  }

  /**
   * Create Claude API response with validation data
   */
  public createValidationClaudeResponse(isValid: boolean, issues: string[] = []): ClaudeResponse {
    const validationResult = this.createValidationResponse(isValid, issues);

    return {
      ...this.defaultResponse,
      id: `msg_validation_${Date.now()}`,
      content: [{
        type: 'text',
        text: JSON.stringify(validationResult, null, 2)
      }]
    };
  }

  /**
   * Create Claude API response with test execution data
   */
  public createTestExecutionClaudeResponse(passed: boolean, coverage = 85.5, failedTests: string[] = []): ClaudeResponse {
    const testResult = this.createTestExecutionResponse(passed, coverage, failedTests);

    return {
      ...this.defaultResponse,
      id: `msg_test_execution_${Date.now()}`,
      content: [{
        type: 'text',
        text: JSON.stringify(testResult, null, 2)
      }]
    };
  }

  /**
   * Reset all mocked responses
   */
  public reset(): void {
    this.responses.clear();
  }

  /**
   * Get Anthropic SDK mock
   */
  public getAnthropicMock(): { messages: { create: ReturnType<typeof vi.fn> } } {
    return {
      messages: {
        create: vi.fn().mockImplementation(async (params: AnthropicCreateParams) => {
          const prompt = params.messages?.[0]?.content || '';
          return this.getResponse(prompt);
        })
      }
    };
  }
}

export default MockClaudeAPI;