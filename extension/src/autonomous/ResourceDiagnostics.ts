import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

interface ResourceSnapshotConfig {
  enabled: boolean;
  intervalMs: number;
}

const DEFAULT_RESOURCE_SNAPSHOT_CONFIG: ResourceSnapshotConfig = {
  enabled: true,
  intervalMs: 5 * 60 * 1000,
};

interface InstrumentedProcess extends NodeJS.Process {
  _getActiveHandles?: () => unknown[];
  _getActiveRequests?: () => unknown[];
}

interface ResourceSnapshot {
  activeHandleCount?: number;
  activeRequestCount?: number;
  arrayBuffersMb: number;
  externalMb: number;
  heapTotalMb: number;
  heapUsedMb: number;
  pid: number;
  reason: string;
  rssMb: number;
  uptimeSec: number;
  workspacePath: string;
}

function toMegabytes(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(1));
}

export class ResourceDiagnostics implements vscode.Disposable {
  private static readonly MIN_INTERVAL_MS = 60 * 1000;

  private readonly logger = Logger.for('ResourceDiagnostics');
  private disposed = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly workspacePath: string,
    private readonly config: ResourceSnapshotConfig = DEFAULT_RESOURCE_SNAPSHOT_CONFIG
  ) {}

  public start(): void {
    if (this.disposed || !this.config.enabled || this.intervalId) {
      return;
    }

    this.captureSnapshot('startup');

    this.intervalId = setInterval(
      () => {
        this.captureSnapshot('periodic');
      },
      Math.max(this.config.intervalMs, ResourceDiagnostics.MIN_INTERVAL_MS)
    );

    this.logger.info('Resource diagnostics started', {
      intervalMs: Math.max(this.config.intervalMs, ResourceDiagnostics.MIN_INTERVAL_MS),
      workspacePath: this.workspacePath,
    });
  }

  public captureSnapshot(reason: string): void {
    if (this.disposed || !this.config.enabled) {
      return;
    }

    const instrumentedProcess = process as InstrumentedProcess;
    const memoryUsage = process.memoryUsage();
    const snapshot: ResourceSnapshot = {
      activeHandleCount: instrumentedProcess._getActiveHandles?.().length,
      activeRequestCount: instrumentedProcess._getActiveRequests?.().length,
      arrayBuffersMb: toMegabytes(memoryUsage.arrayBuffers),
      externalMb: toMegabytes(memoryUsage.external),
      heapTotalMb: toMegabytes(memoryUsage.heapTotal),
      heapUsedMb: toMegabytes(memoryUsage.heapUsed),
      pid: process.pid,
      reason,
      rssMb: toMegabytes(memoryUsage.rss),
      uptimeSec: Number(process.uptime().toFixed(1)),
      workspacePath: this.workspacePath,
    };

    this.logger.info('Resource snapshot', snapshot);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.config.enabled) {
      this.captureSnapshot('dispose');
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.disposed = true;
  }
}
