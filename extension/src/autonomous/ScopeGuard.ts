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
import { Logger } from '../utils/logger';
import type { ToolAuditLogger, ToolAuditEntry } from './ToolAuditLogger';

/** Error thrown when ScopeGuard is in blocking mode and a violation occurs */
export class ScopeViolationError extends Error {
  public readonly filePath: string;
  public readonly protectedPattern: string;
  public readonly enforcement: ScopeEnforcementMode;

  constructor(filePath: string, protectedPattern: string, enforcement: ScopeEnforcementMode) {
    super(`Scope violation blocked: ${filePath} matches protected pattern "${protectedPattern}"`);
    this.name = 'ScopeViolationError';
    this.filePath = filePath;
    this.protectedPattern = protectedPattern;
    this.enforcement = enforcement;
  }
}

export interface ScopeViolation {
  file: string;
  protectedPattern: string;
  timestamp: number;
  /** 018 T064: Enforcement level of this violation */
  enforcement: ScopeEnforcementMode;
}

/** 018 T064: Enforcement modes for scope guard */
export type ScopeEnforcementMode = 'advisory' | 'warning' | 'blocking';

export class ScopeGuard {
  private readonly scopeLogger = Logger.for('ScopeGuard');
  private protectedPatterns: string[] = [];
  private readonly workspaceRoot: string;
  private violations: ScopeViolation[] = [];
  /** Current enforcement mode — default is 'warning' */
  private enforcementMode: ScopeEnforcementMode = 'warning';
  private auditLogger?: ToolAuditLogger;
  private agentName = 'unknown';

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /** Wire a ToolAuditLogger for audit trail */
  setToolAuditLogger(logger: ToolAuditLogger): void {
    this.auditLogger = logger;
  }

  /** Set the agent name for audit entries */
  setAgentName(name: string): void {
    this.agentName = name;
  }

  /**
   * 018 T064: Set the enforcement mode.
   */
  setEnforcementMode(mode: ScopeEnforcementMode): void {
    this.enforcementMode = mode;
  }

  /**
   * 018 T064: Get the current enforcement mode.
   */
  getEnforcementMode(): ScopeEnforcementMode {
    return this.enforcementMode;
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
   * In blocking mode, throws ScopeViolationError instead of returning.
   */
  check(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');

    for (const pattern of this.protectedPatterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');
      if (normalized.includes(normalizedPattern) || normalized.endsWith(normalizedPattern)) {
        const violation: ScopeViolation = {
          file: filePath,
          protectedPattern: pattern,
          timestamp: Date.now(),
          enforcement: this.enforcementMode,
        };
        this.violations.push(violation);

        const outcome: ToolAuditEntry['outcome'] =
          this.enforcementMode === 'blocking'
            ? 'blocked'
            : this.enforcementMode === 'warning'
              ? 'warned'
              : 'warned';

        // Log to audit trail
        this.emitAuditEntry(filePath, pattern, outcome);

        if (this.enforcementMode === 'blocking') {
          throw new ScopeViolationError(filePath, pattern, this.enforcementMode);
        }

        this.scopeLogger.warn(
          `Scope violation: ${filePath} matches protected pattern "${pattern}"`
        );
        return pattern;
      }
    }

    // Log allowed access
    this.emitAuditEntry(filePath, '', 'allowed');

    return null;
  }

  /** Emit an audit entry to the ToolAuditLogger if wired */
  private emitAuditEntry(
    filePath: string,
    protectedPattern: string,
    outcome: ToolAuditEntry['outcome']
  ): void {
    if (!this.auditLogger) return;
    this.auditLogger
      .logCheck({
        timestamp: new Date().toISOString(),
        runId: '',
        agent: this.agentName,
        filePath,
        protectedPattern,
        enforcement: this.enforcementMode,
        outcome,
      })
      .catch(() => {
        /* non-fatal */
      });
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

  /**
   * 019 T062-T064: Generate structured brownfield analysis for research pipeline.
   * Returns markdown documenting constraints, deprecated patterns, downstream dependencies,
   * and integration requirements for existing codebases.
   */
  generateBrownfieldAnalysis(): string {
    if (!this.detectBrownfield()) {
      return '## Brownfield Analysis\n\nProject appears to be greenfield (new). No brownfield constraints detected.\n';
    }

    const lines: string[] = ['## Brownfield Analysis', ''];

    // Constraints from package.json
    const pkgPath = path.join(this.workspaceRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        lines.push('### Constraints & Limitations', '');
        lines.push('| Constraint Type | Description | Impact |');
        lines.push('|-----------------|-------------|--------|');

        if (pkg.engines?.node) {
          lines.push(`| Node.js | Requires ${pkg.engines.node} | Limits API availability |`);
        }
        const depCount = Object.keys(pkg.dependencies || {}).length;
        const devDepCount = Object.keys(pkg.devDependencies || {}).length;
        lines.push(
          `| Dependencies | ${depCount} runtime, ${devDepCount} dev | Compatibility constraints |`
        );

        if (pkg.type === 'module') {
          lines.push('| Module System | ESM (`type: module`) | Import/export patterns |');
        }
        lines.push('');
      } catch {
        // Skip pkg analysis on error
      }
    }

    // Protected patterns as "Areas Requiring Extra Caution"
    if (this.protectedPatterns.length > 0) {
      lines.push('### Areas Requiring Extra Caution', '');
      for (const pattern of this.protectedPatterns) {
        lines.push(`- **\`${pattern}\`**: Protected boundary — do not modify`);
      }
      lines.push('');
    }

    // Test directories found
    const testDirs = ['tests', 'test', '__tests__', 'spec'].filter((dir) =>
      fs.existsSync(path.join(this.workspaceRoot, dir))
    );
    if (testDirs.length > 0) {
      lines.push('### Existing Test Infrastructure', '');
      lines.push(`Test directories found: ${testDirs.join(', ')}`);
      lines.push('Existing tests must continue to pass after modifications.');
      lines.push('');
    }

    // Scope violations as known issues
    if (this.violations.length > 0) {
      lines.push('### Known Scope Violations', '');
      for (const v of this.violations.slice(-10)) {
        lines.push(`- \`${v.file}\` — matches \`${v.protectedPattern}\` (${v.enforcement})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 018 T074: Auto-detect brownfield project from workspace analysis.
   * Returns true if the project has hallmarks of an existing codebase
   * (many source files, existing tests, package.json with deps).
   */
  detectBrownfield(): boolean {
    try {
      const pkgPath = path.join(this.workspaceRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const depCount =
          Object.keys(pkg.dependencies || {}).length +
          Object.keys(pkg.devDependencies || {}).length;
        if (depCount > 5) return true;
      }
      // Check for existing source files
      const srcDir = path.join(this.workspaceRoot, 'src');
      if (fs.existsSync(srcDir)) {
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        const sourceFiles = entries.filter((e) => e.isFile() && /\.(ts|js|tsx|jsx)$/.test(e.name));
        if (sourceFiles.length > 3) return true;
      }
      // Check for test directories
      const testDirs = ['tests', 'test', '__tests__', 'spec'];
      for (const dir of testDirs) {
        if (fs.existsSync(path.join(this.workspaceRoot, dir))) return true;
      }
    } catch {
      // Cannot determine — assume greenfield
    }
    return false;
  }
}
