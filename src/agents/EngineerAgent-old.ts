import Anthropic from '@anthropic-ai/sdk';
import { TestResult, ValidationResult } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class EngineerAgent {
  private anthropic: Anthropic;
  private constitutionPath: string;

  constructor(apiKey: string, workspaceDir?: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.constitutionPath = workspaceDir ? 
      path.join(workspaceDir, '.specify', 'memory', 'constitution.md') : 
      '.specify/memory/constitution.md';
  }

  async validate(
    taskDescription: string,
    implementation: string,
    testResult: TestResult
  ): Promise<ValidationResult> {
    // Load constitution for validation context
    const constitution = await this.loadConstitution();
    
    const prompt = `You are a senior software engineer conducting a thorough code review.

## Constitutional Requirements
${constitution}

## Task Description
${taskDescription}

## Implementation (Claude Code's response)
${implementation}

## Test Results
- Passed: ${testResult.passed}
- Failed Tests: ${testResult.failedTests.join(', ')}
- Summary: ${testResult.summary}

## Your Review Task
Analyze this implementation against:
1. Constitutional requirements (code quality, security, performance)
2. Task requirements fulfillment
3. Test results analysis
4. Best practices compliance

Provide actionable feedback for improvement.

## Response Format
VALID: [true/false]

CONSTITUTIONAL_ISSUES:
- [Any violations of constitution requirements]

TASK_ISSUES:
- [Any deviations from task requirements]

TECHNICAL_ISSUES:
- [Code quality, security, performance issues]

SUGGESTIONS:
- [Specific, actionable improvement suggestions]

ASSESSMENT:
[Brief overall assessment of the implementation quality]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return this.parseValidationResponse(content);
      
    } catch (error) {
      console.error('Engineer Agent validation error:', error);
      return {
        isValid: false,
        issues: ['Engineer Agent encountered an error during validation'],
        suggestions: ['Please retry the validation or escalate to human review']
      };
    }
  }

  /**
   * Validate code against constitutional requirements specifically
   */
  async validateConstitution(filePaths: string[]): Promise<ValidationResult> {
    const constitution = await this.loadConstitution();
    const codeFiles: string[] = [];

    // Read all specified files
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        codeFiles.push(`// File: ${filePath}\n${content}`);
      } catch (error) {
        console.warn(`Could not read file ${filePath}:`, error);
      }
    }

    const prompt = `You are conducting a constitutional compliance review of code files.

## Constitutional Requirements
${constitution}

## Code Files to Review
${codeFiles.join('\n\n---\n\n')}

## Review Task
Check each file against constitutional requirements:
- Code Quality standards
- Security requirements
- Performance guidelines
- Testing requirements
- Architecture compliance

## Response Format
VALID: [true/false]

VIOLATIONS:
- [List specific constitutional violations with file references]

RECOMMENDATIONS:
- [Specific actions to achieve constitutional compliance]

SCORE: [1-10 constitutional compliance score]`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return this.parseValidationResponse(content);
      
    } catch (error) {
      console.error('Constitutional validation error:', error);
      return {
        isValid: false,
        issues: ['Constitutional validation encountered an error'],
        suggestions: ['Please retry validation or review manually']
      };
    }
  }

  /**
   * Load constitution from .specify/memory/constitution.md
   */
  private async loadConstitution(): Promise<string> {
    try {
      return await fs.readFile(this.constitutionPath, 'utf-8');
    } catch (error) {
      console.warn('Could not load constitution, using defaults');
      return `# Default Constitutional Requirements

## Code Quality
- Use TypeScript strict mode
- No \`any\` types
- Maximum 300 lines per file
- Proper error handling

## Security
- No plaintext passwords
- JWT tokens expire within 1 hour
- Input validation required

## Performance
- API responses under 500ms p95
- UI interactions under 100ms

## Testing
- Minimum 80% code coverage
- Test-driven development
- Integration tests for critical paths`;
    }
  }

  /**
   * Parse validation response from Claude
   */
  private parseValidationResponse(content: string): ValidationResult {
    const lines = content.split('\n');
    let isValid = false;
    const issues: string[] = [];
    const suggestions: string[] = [];

    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('VALID:')) {
        isValid = trimmed.toLowerCase().includes('true');
      } else if (trimmed.includes('ISSUES:') || trimmed.includes('VIOLATIONS:')) {
        currentSection = 'issues';
      } else if (trimmed.includes('SUGGESTIONS:') || trimmed.includes('RECOMMENDATIONS:')) {
        currentSection = 'suggestions';
      } else if (trimmed.startsWith('-') && currentSection === 'issues') {
        issues.push(trimmed.substring(1).trim());
      } else if (trimmed.startsWith('-') && currentSection === 'suggestions') {
        suggestions.push(trimmed.substring(1).trim());
      }
    }

    return {
      isValid,
      issues,
      suggestions
    };
  }
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
