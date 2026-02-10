/**
 * CheckpointValidator — validates session handoff YAML frontmatter
 *
 * Ensures checkpoint files have required fields and stay within
 * size budgets. Warnings only — never blocks saves.
 *
 * 018 T061/T063: Enhanced with git state capture and required field validation.
 *
 * @see .specify/specs/016-top5-context-gaps/plan.md Fix 8 (E5)
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface CheckpointValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/** 018 T061: Git state captured with checkpoint */
export interface GitState {
  branch: string;
  status: string;
  stashCount: number;
  headCommit: string;
}

const REQUIRED_FIELDS = ['session_id', 'timestamp', 'stage', 'status'];
const MAX_TOKEN_BUDGET = 5000;

export class CheckpointValidator {
  private workspaceRoot?: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot;
  }

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

  /**
   * 018 T063: Validate required fields are present and non-empty.
   */
  validateRequiredFields(data: Record<string, unknown>): CheckpointValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      if (!(field in data) || data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Missing or empty required field: ${field}`);
      }
    }

    // Validate timestamp format
    if (data.timestamp && typeof data.timestamp === 'string') {
      const parsed = Date.parse(data.timestamp);
      if (isNaN(parsed)) {
        warnings.push(`Invalid timestamp format: ${data.timestamp}`);
      }
    }

    // Validate stage is a known stage
    const validStages = ['research', 'specify', 'plan', 'tasks', 'implement', 'validate', 'unknown'];
    if (data.stage && typeof data.stage === 'string' && !validStages.includes(data.stage)) {
      warnings.push(`Unknown stage: ${data.stage}`);
    }

    return { valid: errors.length === 0, warnings, errors };
  }

  /**
   * 018 T061: Capture current git state for checkpoint context.
   */
  async captureGitState(): Promise<GitState> {
    const cwd = this.workspaceRoot;
    if (!cwd) {
      return { branch: 'unknown', status: '', stashCount: 0, headCommit: '' };
    }

    const opts = { cwd };
    const gitState: GitState = { branch: 'unknown', status: '', stashCount: 0, headCommit: '' };

    try {
      const { stdout: branch } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts);
      gitState.branch = branch.trim();
    } catch { /* not a git repo */ }

    try {
      const { stdout: status } = await execFileAsync('git', ['status', '--porcelain', '--short'], opts);
      gitState.status = status.trim().slice(0, 500); // Limit size
    } catch { /* ignore */ }

    try {
      const { stdout: stash } = await execFileAsync('git', ['stash', 'list'], opts);
      gitState.stashCount = stash.split('\n').filter(Boolean).length;
    } catch { /* ignore */ }

    try {
      const { stdout: head } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], opts);
      gitState.headCommit = head.trim();
    } catch { /* ignore */ }

    return gitState;
  }
}
