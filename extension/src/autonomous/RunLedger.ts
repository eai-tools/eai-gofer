import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';

export type RunLedgerEventType =
  | 'stage_start'
  | 'stage_complete'
  | 'stage_error'
  | 'health_warning'
  | 'health_critical'
  | 'scope_violation'
  | 'slop_fix'
  | 'validation_finding'
  | 'budget_warning'
  | 'budget_exceeded';

export interface RunLedgerEntry {
  runId: string;
  timestamp: string;
  eventType: RunLedgerEventType;
  stage: string;
  feature: string;
  source: string;
  severity: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export class RunLedger {
  private readonly logger = Logger.for('RunLedger');
  private initialized = false;
  private readonly logPath: string;
  private currentRunId: string = '';

  constructor(private readonly workspaceRoot: string) {
    this.logPath = path.join(workspaceRoot, '.specify', 'logs', 'gofer-run-ledger.jsonl');
  }

  /**
   * 002 AC-3.3: Set the current pipeline runId for correlation.
   * Callers that pass runId='' will have it auto-filled with this value.
   */
  setRunId(runId: string): void {
    this.currentRunId = runId;
  }

  /** Get the current pipeline runId */
  getRunId(): string {
    return this.currentRunId;
  }

  async log(entry: RunLedgerEntry): Promise<void> {
    try {
      await this.ensureDirectory();
      // 002 AC-3.3: Auto-fill empty runId with the current pipeline runId
      const resolvedEntry = entry.runId ? entry : { ...entry, runId: this.currentRunId };
      const line = JSON.stringify(resolvedEntry) + '\n';
      await fs.promises.appendFile(this.logPath, line, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to write ledger entry: ${error}`);
    }
  }

  async readLog(limit?: number): Promise<RunLedgerEntry[]> {
    try {
      const content = await fs.promises.readFile(this.logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines.map((line) => JSON.parse(line) as RunLedgerEntry);

      if (limit && limit > 0) {
        return entries.slice(-limit);
      }
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      this.logger.error(`Failed to read ledger: ${error}`);
      return [];
    }
  }

  async filterByRunId(runId: string): Promise<RunLedgerEntry[]> {
    const entries = await this.readLog();
    return entries.filter((entry) => entry.runId === runId);
  }

  async filterByEventType(eventType: RunLedgerEventType): Promise<RunLedgerEntry[]> {
    const entries = await this.readLog();
    return entries.filter((entry) => entry.eventType === eventType);
  }

  async filterByStage(stage: string): Promise<RunLedgerEntry[]> {
    const entries = await this.readLog();
    return entries.filter((entry) => entry.stage === stage);
  }

  getLogPath(): string {
    return this.logPath;
  }

  private async ensureDirectory(): Promise<void> {
    if (this.initialized) {return;}
    const logDir = path.dirname(this.logPath);
    await fs.promises.mkdir(logDir, { recursive: true });
    this.initialized = true;
  }
}
