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

const SECRET_PATTERNS = [
  {
    pattern: /(?:API_KEY|APIKEY|SECRET_KEY|SECRET|TOKEN)\s*[=:]\s*["']?([a-zA-Z0-9_-]{12,})["']?/gi,
    description: 'Possible hard-coded credential',
  },
  {
    pattern: /sk-[a-zA-Z0-9_-]{16,}/g,
    description: 'Possible model provider API key',
  },
];

export class ValidationService {
  constructor(private readonly workspaceRoot: string) {}

  async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const constitution = await this.loadConstitution();
      const issues = this.validateContent(fileContent, filePath, constitution);
      const criticalIssues = issues.filter((issue) => issue.severity === 'critical');

      return {
        isValid: criticalIssues.length === 0,
        issues,
        suggestions: this.buildSuggestions(issues),
        message:
          criticalIssues.length === 0
            ? 'Static validation passed'
            : `Static validation found ${criticalIssues.length} critical issue(s)`,
      };
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
      const constitutionPath = path.join(
        this.workspaceRoot,
        '.specify',
        'memory',
        'constitution.md'
      );
      return await fs.readFile(constitutionPath, 'utf-8');
    } catch {
      return [
        '# Constitution',
        '',
        '- TypeScript strict mode required.',
        '- Avoid unsafe `any` usage.',
        '- Do not hard-code secrets.',
      ].join('\n');
    }
  }

  private validateContent(
    content: string,
    filePath: string,
    constitution: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (content.trim().length === 0) {
      issues.push({
        severity: 'critical',
        category: 'Content',
        description: 'File is empty',
      });
    }

    this.findSecrets(content, issues);

    if (/\bany\b/.test(content) && /no ['`]?any['`]? type|avoid unsafe `any`/i.test(constitution)) {
      issues.push({
        severity: 'warning',
        category: 'Type Safety',
        description: 'File contains `any`; verify this is necessary and constrained.',
      });
    }

    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      this.validateTypeScript(content, issues);
    }

    return issues;
  }

  private findSecrets(content: string, issues: ValidationIssue[]): void {
    for (const { pattern, description } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        issues.push({
          severity: 'critical',
          category: 'Security',
          description,
          location: `L${this.lineForIndex(content, match.index)}`,
        });
      }
    }
  }

  private validateTypeScript(content: string, issues: ValidationIssue[]): void {
    if (content.includes('console.log(')) {
      issues.push({
        severity: 'info',
        category: 'Maintainability',
        description: 'File contains console.log; ensure this is intentional.',
      });
    }

    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push({
        severity: 'info',
        category: 'Completeness',
        description: 'File contains TODO/FIXME markers.',
      });
    }
  }

  private buildSuggestions(issues: ValidationIssue[]): string[] {
    const suggestions = new Set<string>();

    for (const issue of issues) {
      if (issue.category === 'Security') {
        suggestions.add(
          'Move secrets to environment variables, secret stores, or CLI login state.'
        );
      }
      if (issue.category === 'Type Safety') {
        suggestions.add('Replace `any` with a specific type or a narrow unknown guard.');
      }
      if (issue.category === 'Content') {
        suggestions.add('Add implementation content or remove the empty file.');
      }
    }

    return Array.from(suggestions);
  }

  private lineForIndex(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }
}
