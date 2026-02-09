/**
 * ScopeGuard — warns when agent accesses files outside spec boundaries
 *
 * Parses the "Protected Boundaries" section from spec.md and logs
 * warnings when bridge-update events reference protected paths.
 *
 * @see .specify/specs/016-top5-context-gaps/plan.md Fix 15 (J1)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ScopeViolation {
  file: string;
  protectedPattern: string;
  timestamp: number;
}

export class ScopeGuard {
  private protectedPatterns: string[] = [];
  private readonly workspaceRoot: string;
  private violations: ScopeViolation[] = [];

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Load protected boundaries from a spec.md file.
   * Parses the "Protected Boundaries" section for file/directory patterns.
   */
  loadFromSpec(specPath: string): void {
    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      const boundaryMatch = content.match(
        /## Protected Boundaries\s*\n([\s\S]*?)(?=\n##|\n---|\n$)/
      );
      if (!boundaryMatch) return;

      const section = boundaryMatch[1];
      const lines = section.split('\n');

      this.protectedPatterns = [];
      for (const line of lines) {
        // Match list items like "- extension/src/config.ts" or "- tests/"
        const itemMatch = line.match(/^[-*]\s+(.+)/);
        if (itemMatch) {
          const pattern = itemMatch[1].trim().replace(/[`[\]]/g, '');
          if (pattern && !pattern.startsWith('List') && !pattern.startsWith('[')) {
            this.protectedPatterns.push(pattern);
          }
        }
      }
    } catch {
      // Spec file doesn't exist or can't be read
    }
  }

  /**
   * Check if a file path violates protected boundaries.
   * Returns the matching protected pattern or null if no violation.
   */
  check(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');

    for (const pattern of this.protectedPatterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');
      if (
        normalized.includes(normalizedPattern) ||
        normalized.endsWith(normalizedPattern)
      ) {
        const violation: ScopeViolation = {
          file: filePath,
          protectedPattern: pattern,
          timestamp: Date.now(),
        };
        this.violations.push(violation);
        console.warn(
          `[Gofer] Scope violation: ${filePath} matches protected pattern "${pattern}"`
        );
        return pattern;
      }
    }

    return null;
  }

  /**
   * Get all recorded violations.
   */
  getViolations(): ScopeViolation[] {
    return [...this.violations];
  }

  /**
   * Get loaded protected patterns.
   */
  getProtectedPatterns(): string[] {
    return [...this.protectedPatterns];
  }

  /**
   * Reset violations (e.g., on new session).
   */
  reset(): void {
    this.violations = [];
  }
}
