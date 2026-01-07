import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ValidationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  description: string;
  location?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
  message?: string;
}

export class ValidationService {
  private anthropic: Anthropic;
  private workspaceRoot: string;

  constructor(apiKey: string, workspaceRoot: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.workspaceRoot = workspaceRoot;
  }

  async validateWithCouncil(
    filePath: string,
    useCouncil: boolean = true
  ): Promise<ValidationResult> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const constitution = await this.loadConstitution();

      // Core validation (Chairman)
      const chairmanResult = await this.validateAsRole(
        'Senior Architect',
        constitution,
        fileContent,
        filePath
      );

      if (!useCouncil || !chairmanResult.isValid) {
        return chairmanResult;
      }

      // Peer Review (Security)
      const securityResult = await this.validateAsRole(
        'Security Specialist',
        constitution,
        fileContent,
        filePath
      );

      // Peer Review (QA)
      const qaResult = await this.validateAsRole('QA Lead', constitution, fileContent, filePath);

      // Synthesize
      return this.synthesizeResults([chairmanResult, securityResult, qaResult]);
    } catch (error) {
      return {
        isValid: false,
        issues: [
          {
            severity: 'critical',
            category: 'System',
            description: `Failed to read file or validate: ${(error as Error).message}`,
          },
        ],
        suggestions: [],
      };
    }
  }

  private async loadConstitution(): Promise<string> {
    try {
      const p = path.join(this.workspaceRoot, '.specify', 'memory', 'constitution.md');
      return await fs.readFile(p, 'utf-8');
    } catch {
      return `
# Constitution

- No mocking allowed.
- TypeScript strict mode required.
- No 'any' type.
      `;
    }
  }

  private async validateAsRole(
    role: string,
    constitution: string,
    code: string,
    filePath: string
  ): Promise<ValidationResult> {
    const prompt = `
      You are a ${role} in the "Council" of automated code reviewers.
      Your job is to strictly validate the following code file against our Constitution.
      
      FILE: ${filePath}
      
      CONSTITUTION:
      ${constitution}
      
      CODE:
      ${code}
      
      Respond only with a JSON object in this format:
      {
        "isValid": boolean,
        "issues": [ { "severity": "critical|warning", "category": "string", "description": "string", "location": "string" } ],
        "suggestions": ["string"]
      }
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      // Extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ValidationResult;
      }
      return {
        isValid: false,
        issues: [
          {
            severity: 'critical',
            category: 'Parsing',
            description: 'Failed to parse validation response',
          },
        ],
        suggestions: [],
      };
    } catch (e) {
      return {
        isValid: false,
        issues: [
          {
            severity: 'critical',
            category: 'System',
            description: 'Validation failed: ' + (e as Error).message,
          },
        ],
        suggestions: [],
      };
    }
  }

  private synthesizeResults(results: ValidationResult[]): ValidationResult {
    const allIssues = results.flatMap((r) => r.issues);

    // Deduplicate issues by description
    const seen = new Set();
    const uniqueIssues = allIssues.filter((i) => {
      const key = `${i.category}:${i.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    const criticalIssues = uniqueIssues.filter((i) => i.severity === 'critical');
    const isValid = criticalIssues.length === 0;

    return {
      isValid,
      issues: uniqueIssues,
      suggestions: [...new Set(results.flatMap((r) => r.suggestions))],
      message: isValid
        ? 'Approved by Council'
        : `Rejected by Council (${criticalIssues.length} critical issues)`,
    };
  }
}
