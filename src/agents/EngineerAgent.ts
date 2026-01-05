/**
 * Engineer Agent - Validates code against task requirements and constitution
 *
 * Features:
 * - Code validation against specifications
 * - Constitution compliance checking
 * - Issue detection and suggestions
 * - Optional LLM council for multi-perspective validation
 *
 * @see .specify/specs/003-orchestrator-agents/data-model.md
 * @see .specify/specs/009-llm-council-integration/spec.md
 */

import { ClaudeClient } from '../utils/ClaudeClient.js';
import type { ValidationResult, ValidationIssue, TestResult } from '../types/index.js';

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Include test results in validation */
  testResult?: TestResult;
  /** Use LLM council for multi-perspective validation */
  useCouncil?: boolean;
  /** Maximum response tokens */
  maxTokens?: number;
}

/**
 * Raw validation response from LLM
 */
interface ValidationResponse {
  isValid: boolean;
  issues: Array<{
    category?: string;
    severity?: string;
    description: string;
    location?: string;
  }>;
  suggestions: string[];
  constitutionChecks: Record<string, boolean>;
  assessment?: string;
}

/**
 * Engineer Agent for code validation and quality assessment
 */
export class EngineerAgent {
  private claudeClient: ClaudeClient;

  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Validate code against task requirements and constitution
   */
  async validate(
    taskDescription: string,
    code: string,
    constitution: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const prompt = this.buildValidationPrompt(taskDescription, code, constitution, options);

    try {
      const response = await this.claudeClient.sendMessage(prompt, options.maxTokens || 2048);
      return this.parseValidationResponse(response, options);
    } catch (error) {
      // Return error result
      return {
        id: crypto.randomUUID(),
        taskId: '',
        timestamp: new Date().toISOString(),
        isValid: false,
        issues: [
          {
            category: 'quality',
            severity: 'critical',
            description: `Engineer Agent encountered an error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        suggestions: ['Review the code manually and retry validation'],
        constitutionChecks: {},
      };
    }
  }

  /**
   * Quick validation check (less thorough, faster)
   */
  async quickValidate(
    taskDescription: string,
    code: string
  ): Promise<{ isValid: boolean; summary: string }> {
    const prompt = `You are a code reviewer. Quickly assess if this code implements the task correctly.

Task: ${taskDescription}

Code:
\`\`\`
${code}
\`\`\`

Respond with exactly two lines:
VALID: [true|false]
SUMMARY: [one sentence summary]`;

    try {
      const response = await this.claudeClient.sendMessage(prompt, 256);
      const validMatch = response.match(/VALID:\s*(true|false)/i);
      const summaryMatch = response.match(/SUMMARY:\s*(.+)/i);

      return {
        isValid: validMatch?.[1]?.toLowerCase() === 'true',
        summary: summaryMatch?.[1] || 'Validation completed',
      };
    } catch {
      return {
        isValid: false,
        summary: 'Validation failed due to error',
      };
    }
  }

  /**
   * Build the validation prompt
   */
  buildValidationPrompt(
    taskDescription: string,
    code: string,
    constitution: string,
    options: ValidationOptions = {}
  ): string {
    let prompt = `You are a senior software engineer validating code against requirements and coding standards.

## Task Description
${taskDescription}

## Code to Validate
\`\`\`
${code}
\`\`\`

## Constitutional Requirements (Coding Standards)
${constitution}
`;

    // Include test results if provided
    if (options.testResult) {
      prompt += `
## Test Results
- Passed: ${options.testResult.passed}
- Total Tests: ${options.testResult.totalTests}
- Passed Tests: ${options.testResult.passedTests}
- Failed Tests: ${options.testResult.failedTests}
${
  options.testResult.failures.length > 0
    ? `\nFailures:\n${options.testResult.failures.map((f) => `- ${f.testName}: ${f.error}`).join('\n')}`
    : ''
}
`;
    }

    prompt += `
## Validation Instructions

Analyze the code and respond with JSON in this exact format:
{
  "isValid": boolean,
  "issues": [
    {
      "category": "functional|security|performance|quality|constitution",
      "severity": "blocker|critical|major|minor",
      "description": "Clear description of the issue",
      "location": "optional: file path or line reference"
    }
  ],
  "suggestions": [
    "Actionable improvement suggestions"
  ],
  "constitutionChecks": {
    "principle_name": true/false
  },
  "assessment": "Brief overall assessment"
}

Categories:
- functional: Does not implement requirements correctly
- security: Security vulnerabilities (injection, XSS, etc.)
- performance: Performance issues
- quality: Code quality issues (naming, structure, etc.)
- constitution: Violates constitutional coding standards

Severities:
- blocker: Must fix before merge
- critical: Should fix before merge
- major: Should fix soon
- minor: Nice to fix

Be thorough but practical. Focus on real issues, not style preferences.`;

    return prompt;
  }

  /**
   * Parse the LLM validation response
   */
  parseValidationResponse(response: string, options: ValidationOptions = {}): ValidationResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed: ValidationResponse = JSON.parse(jsonMatch[0]);

      // Convert issues to proper format
      const issues: ValidationIssue[] = (parsed.issues || []).map((issue) => ({
        category: (issue.category as ValidationIssue['category']) || 'quality',
        severity: (issue.severity as ValidationIssue['severity']) || 'minor',
        description: issue.description,
        location: issue.location,
      }));

      return {
        id: crypto.randomUUID(),
        taskId: options.testResult?.taskId || '',
        timestamp: new Date().toISOString(),
        isValid: parsed.isValid,
        issues,
        suggestions: parsed.suggestions || [],
        constitutionChecks: parsed.constitutionChecks || {},
      };
    } catch (error) {
      // Try to parse as structured text (fallback)
      return this.parseStructuredTextResponse(response, options);
    }
  }

  /**
   * Parse structured text response (fallback when JSON parsing fails)
   */
  private parseStructuredTextResponse(
    response: string,
    options: ValidationOptions = {}
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    const constitutionChecks: Record<string, boolean> = {};

    // Parse VALID: line
    const validMatch = response.match(/VALID:\s*(true|false)/i);
    const isValid = validMatch?.[1]?.toLowerCase() === 'true';

    // Parse CONSTITUTIONAL_ISSUES section
    const constitutionalMatch = response.match(/CONSTITUTIONAL_ISSUES:[\s\n]*((?:[-•]\s*.+\n?)*)/i);
    if (constitutionalMatch?.[1]) {
      const lines = constitutionalMatch[1].match(/[-•]\s*(.+)/g) || [];
      for (const line of lines) {
        const desc = line.replace(/^[-•]\s*/, '').trim();
        if (desc) {
          issues.push({
            category: 'constitution',
            severity: 'major',
            description: desc,
          });
        }
      }
    }

    // Parse TASK_ISSUES section
    const taskMatch = response.match(/TASK_ISSUES:[\s\n]*((?:[-•]\s*.+\n?)*)/i);
    if (taskMatch?.[1]) {
      const lines = taskMatch[1].match(/[-•]\s*(.+)/g) || [];
      for (const line of lines) {
        const desc = line.replace(/^[-•]\s*/, '').trim();
        if (desc) {
          issues.push({
            category: 'functional',
            severity: 'major',
            description: desc,
          });
        }
      }
    }

    // Parse TECHNICAL_ISSUES section
    const technicalMatch = response.match(/TECHNICAL_ISSUES:[\s\n]*((?:[-•]\s*.+\n?)*)/i);
    if (technicalMatch?.[1]) {
      const lines = technicalMatch[1].match(/[-•]\s*(.+)/g) || [];
      for (const line of lines) {
        const desc = line.replace(/^[-•]\s*/, '').trim();
        if (desc) {
          issues.push({
            category: 'quality',
            severity: 'minor',
            description: desc,
          });
        }
      }
    }

    // Parse SUGGESTIONS section
    const suggestionsMatch = response.match(/SUGGESTIONS:[\s\n]*((?:[-•]\s*.+\n?)*)/i);
    if (suggestionsMatch?.[1]) {
      const lines = suggestionsMatch[1].match(/[-•]\s*(.+)/g) || [];
      for (const line of lines) {
        const desc = line.replace(/^[-•]\s*/, '').trim();
        if (desc) {
          suggestions.push(desc);
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      taskId: options.testResult?.taskId || '',
      timestamp: new Date().toISOString(),
      isValid,
      issues,
      suggestions,
      constitutionChecks,
    };
  }

  /**
   * Check if code follows specific constitution principles
   */
  async checkPrinciple(
    code: string,
    principle: string
  ): Promise<{ compliant: boolean; explanation: string }> {
    const prompt = `Does this code comply with the following principle?

Principle: ${principle}

Code:
\`\`\`
${code}
\`\`\`

Respond with:
COMPLIANT: [true|false]
EXPLANATION: [brief explanation]`;

    try {
      const response = await this.claudeClient.sendMessage(prompt, 256);
      const compliantMatch = response.match(/COMPLIANT:\s*(true|false)/i);
      const explanationMatch = response.match(/EXPLANATION:\s*(.+)/i);

      return {
        compliant: compliantMatch?.[1]?.toLowerCase() === 'true',
        explanation: explanationMatch?.[1] || 'Check completed',
      };
    } catch {
      return {
        compliant: false,
        explanation: 'Failed to check principle',
      };
    }
  }
}
