/**
 * CheckpointValidator — validates session handoff YAML frontmatter
 *
 * Ensures checkpoint files have required fields and stay within
 * size budgets. Warnings only — never blocks saves.
 *
 * @see .specify/specs/016-top5-context-gaps/plan.md Fix 8 (E5)
 */

export interface CheckpointValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

const REQUIRED_FIELDS = ['session_id', 'timestamp', 'stage', 'status'];
const MAX_TOKEN_BUDGET = 5000;

export class CheckpointValidator {
  /**
   * Validate a session handoff markdown document.
   * Checks YAML frontmatter required fields and overall size.
   */
  validate(content: string): CheckpointValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      errors.push('Missing YAML frontmatter (expected --- delimiters)');
      return { valid: false, warnings, errors };
    }

    const frontmatter = frontmatterMatch[1];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      const pattern = new RegExp(`^${field}\\s*:`, 'm');
      if (!pattern.test(frontmatter)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check sections
    const expectedSections = ['# Session Handoff', 'Resume with'];
    for (const section of expectedSections) {
      if (!content.includes(section)) {
        warnings.push(`Missing section: "${section}"`);
      }
    }

    // Check token budget (chars / 4)
    const estimatedTokens = Math.ceil(content.length / 4);
    if (estimatedTokens > MAX_TOKEN_BUDGET) {
      warnings.push(
        `Checkpoint is ${estimatedTokens} tokens (budget: ${MAX_TOKEN_BUDGET}). Consider trimming.`
      );
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }
}
