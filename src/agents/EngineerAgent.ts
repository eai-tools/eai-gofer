import Anthropic from '@anthropic-ai/sdk';
import { TestResult, ValidationResult } from '../types.js';

export class EngineerAgent {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async validate(
    taskDescription: string,
    implementation: string,
    testResult: TestResult
  ): Promise<ValidationResult> {
    const prompt = `You are an expert software engineer reviewing an implementation.

Task Description:
${taskDescription}

Implementation (Claude Code's response):
${implementation}

Test Results:
- Passed: ${testResult.passed}
- Failed Tests: ${testResult.failedTests.join(', ')}
- Summary: ${testResult.summary}

Your job is to:
1. Analyze why the tests failed
2. Identify specific issues in the implementation
3. Provide actionable suggestions for fixes

Format your response as:

VALID: [true/false]

ISSUES:
- [issue 1]
- [issue 2]
...

SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]
...`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse response
    const validMatch = text.match(/VALID:\s*(true|false)/i);
    const isValid = validMatch?.[1]?.toLowerCase() === 'true';

    const issuesSection = text.match(/ISSUES:(.*?)(?=SUGGESTIONS:|$)/s)?.[1] || '';
    const issues = issuesSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());

    const suggestionsSection = text.match(/SUGGESTIONS:(.*?)$/s)?.[1] || '';
    const suggestions = suggestionsSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());

    return {
      isValid,
      issues: issues.length > 0 ? issues : ['Tests failed without clear cause'],
      suggestions: suggestions.length > 0 ? suggestions : ['Review test requirements and implementation']
    };
  }

  async reviewCode(code: string, requirements: string): Promise<{
    approved: boolean;
    feedback: string[];
  }> {
    const prompt = `Review this code against the requirements.

Requirements:
${requirements}

Code:
${code}

Provide:
APPROVED: [true/false]

FEEDBACK:
- [feedback point 1]
- [feedback point 2]
...`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    const approvedMatch = text.match(/APPROVED:\s*(true|false)/i);
    const approved = approvedMatch?.[1]?.toLowerCase() === 'true';

    const feedbackSection = text.match(/FEEDBACK:(.*?)$/s)?.[1] || '';
    const feedback = feedbackSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(1).trim());

    return { approved, feedback };
  }
}
