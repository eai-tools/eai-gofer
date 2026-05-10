/**
 * ToolAuditLogger — logs every ScopeGuard check to tool-audit.jsonl
 *
 * Records all file access checks (allowed, warned, blocked) for audit
 * trail purposes. Optionally emits scope_violation events to RunLedger
 * for warned/blocked outcomes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

/** A single tool audit log entry */
export interface ToolAuditEntry {
  timestamp: string;
  runId: string;
  agent: string;
  filePath: string;
  protectedPattern: string;
  enforcement: string;
  outcome: 'allowed' | 'warned' | 'blocked';
}

export class ToolAuditLogger {
  private readonly logger = Logger.for('ToolAuditLogger');
  private readonly logPath: string;
  private dirInitialized = false;
  private runLedger?: import('./RunLedger').RunLedger;

  constructor(
    private readonly workspaceRoot: string,
    runLedger?: import('./RunLedger').RunLedger
  ) {
    this.logPath = path.join(workspaceRoot, '.specify', 'logs', 'tool-audit.jsonl');
    this.runLedger = runLedger;
  }

  /** Append an audit entry to tool-audit.jsonl */
  async logCheck(entry: ToolAuditEntry): Promise<void> {
    try {
      await this.ensureDirectory();
      await fs.promises.appendFile(this.logPath, JSON.stringify(entry) + '\n');
    } catch {
      // Non-fatal — don't block the caller
    }

    // Emit scope_violation to RunLedger for warned/blocked outcomes
    if (this.runLedger && (entry.outcome === 'warned' || entry.outcome === 'blocked')) {
      this.runLedger
        .log({
          runId: entry.runId,
          timestamp: entry.timestamp,
          eventType: 'scope_violation',
          stage: '',
          feature: '',
          source: 'ToolAuditLogger',
          severity: entry.outcome === 'blocked' ? 'error' : 'warning',
          data: {
            agent: entry.agent,
            filePath: entry.filePath,
            protectedPattern: entry.protectedPattern,
            enforcement: entry.enforcement,
            outcome: entry.outcome,
          },
        })
        .catch(() => {
          /* non-fatal */
        });
    }
  }

  /** Read audit log entries, optionally limited */
  async readLog(limit?: number): Promise<ToolAuditEntry[]> {
    try {
      const content = await fs.promises.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines.map((line) => JSON.parse(line) as ToolAuditEntry);
      return limit ? entries.slice(-limit) : entries;
    } catch {
      return [];
    }
  }

  /** Get the path to the audit log file */
  getLogPath(): string {
    return this.logPath;
  }

  private async ensureDirectory(): Promise<void> {
    if (this.dirInitialized) {return;}
    const dir = path.dirname(this.logPath);
    await fs.promises.mkdir(dir, { recursive: true });
    this.dirInitialized = true;
  }
}
