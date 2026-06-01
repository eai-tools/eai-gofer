/**
 * ObservationBridge
 *
 * Connects hook-based observation files to the ContextBuilder's ObservationMasker.
 * When Claude Code's PostToolUse hook writes an observation file, this bridge
 * ingests it so ACC stages 2-4 have actual data to operate on.
 *
 * Works independently of terminal launch mode: it listens to
 * MultiSessionBridgeWatcher's 'bridge-update' event, which fires regardless
 * of how Claude Code was launched.
 */

import * as fs from 'fs';
import * as path from 'path';
import type * as vscode from 'vscode';
import type { ContextBuilder } from './ContextBuilder';
import type { ObservationType } from './ObservationMasker';
import type { MultiSessionBridgeWatcher } from './MultiSessionBridgeWatcher';
import type { BridgeData } from './HookBridgeWatcher';
import { Logger } from '../utils/logger';

/** Maps Claude Code tool names to ObservationType */

const TOOL_TYPE_MAP = new Map<string, ObservationType>([
  ['Read', 'file_read'],
  ['Bash', 'command_output'],
  ['Glob', 'search_result'],
  ['Grep', 'search_result'],
  ['WebFetch', 'api_response'],
  ['WebSearch', 'api_response'],
]);

export class ObservationBridge implements vscode.Disposable {
  private readonly logger: Logger;
  private readonly observationsDir: string;
  private listener: ((data: BridgeData) => void) | null = null;
  private watcher: MultiSessionBridgeWatcher | null = null;

  constructor(
    private readonly contextBuilder: ContextBuilder,
    workspacePath: string
  ) {
    this.logger = Logger.for('ObservationBridge');
    this.observationsDir = path.join(workspacePath, '.specify', 'hooks', 'observations');
  }

  /**
   * Connect to a MultiSessionBridgeWatcher to receive bridge-update events.
   */
  connect(watcher: MultiSessionBridgeWatcher): void {
    this.watcher = watcher;

    this.listener = (data: BridgeData) => {
      this.onBridgeUpdate(data);
    };

    watcher.on('bridge-update', this.listener);
    this.logger.debug('Connected to MultiSessionBridgeWatcher');
  }

  private onBridgeUpdate(data: BridgeData): void {
    const observationId = data.lastToolUse?.observationId;
    if (!observationId) {
      return;
    }

    const toolName = data.lastToolUse?.toolName ?? 'unknown';
    const toolInput = data.lastToolUse?.toolInput;

    this.ingestObservation(observationId, toolName, toolInput);
  }

  private ingestObservation(
    observationId: string,
    toolName: string,
    toolInput?: Record<string, unknown>
  ): void {
    const filePath = path.join(this.observationsDir, `${observationId}.json`);

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      this.logger.debug(`Observation file not found: ${observationId}`);
      return;
    }

    let toolResponse: string;
    try {
      const parsed = JSON.parse(content);
      // Hook writes the key as "toolResponse", not "response"
      toolResponse = typeof parsed.toolResponse === 'string' ? parsed.toolResponse : content;
    } catch {
      toolResponse = content;
    }

    const type: ObservationType = TOOL_TYPE_MAP.get(toolName) ?? 'command_output';

    this.contextBuilder.trackObservation(type, toolResponse, {
      toolName,
      observationId,
      ...toolInput,
    });

    this.contextBuilder.incrementTurn();

    this.logger.debug(`Ingested observation: ${observationId} (${toolName} → ${type})`);
  }

  dispose(): void {
    if (this.listener && this.watcher) {
      this.watcher.off('bridge-update', this.listener);
      this.listener = null;
      this.watcher = null;
    }
  }
}
