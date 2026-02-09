import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * T044: Structural test for observation tracking from terminal output.
 *
 * Cannot dynamically import autonomousCommands.ts due to node-pty native
 * module compilation mismatch in test environment.
 */
describe('Observation Tracking (T044)', () => {
  const filePath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('should buffer terminal output and track as observations', () => {
    expect(source).toContain('observationBuffer');
    expect(source).toContain('contextBuilder.trackObservation(');
  });

  it('should track observations when buffer reaches 2000 chars', () => {
    expect(source).toContain('observationBuffer.length >= 2000');
  });

  it('should increment turn counter on each tracked observation', () => {
    expect(source).toContain('contextBuilder.incrementTurn()');
  });

  it('should only track when sharedContextBuilder is available', () => {
    expect(source).toContain('if (sharedContextBuilder)');
  });

  it('should use command_output observation type', () => {
    expect(source).toContain("'command_output'");
  });

  it('should include specId metadata', () => {
    expect(source).toContain("source: 'claude-code-terminal'");
    expect(source).toContain('specId');
  });
});

/**
 * T019: Structural tests for observation content ingestion from hook bridge.
 *
 * Verifies extension.ts contains the new observation file reading logic
 * that replaces the old tool-output.txt approach.
 */
describe('Observation Content Ingestion from Hook Bridge (T019)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should read observation files by observationId', () => {
    expect(extSource).toContain('observationId');
    expect(extSource).toContain('observationsDir');
    expect(extSource).toContain('.json');
  });

  it('should parse observation JSON and extract toolResponse', () => {
    expect(extSource).toContain('obsData.toolResponse');
  });

  it('should fall back to placeholder when no observationId is present', () => {
    expect(extSource).toContain('[Tool output from ${toolUse.toolName}]');
  });

  it('should enrich metadata with toolInput fields', () => {
    expect(extSource).toContain('toolUse.toolInput');
    expect(extSource).toContain('metadata.filePath');
    expect(extSource).toContain('metadata.command');
    expect(extSource).toContain('metadata.pattern');
  });

  it('should clean up observation files after reading', () => {
    expect(extSource).toContain('fsPromises.unlink');
  });

  it('should clean stale observation files on session start', () => {
    expect(extSource).toContain('session-start');
    expect(extSource).toContain('STALE_THRESHOLD_MS');
  });

  it('should map tool names to correct observation types', () => {
    expect(extSource).toContain("'file_read'");
    expect(extSource).toContain("'search_result'");
    expect(extSource).toContain("'command_output'");
  });

  it('should not reference the old tool-output.txt file', () => {
    expect(extSource).not.toContain('tool-output.txt');
  });
});
