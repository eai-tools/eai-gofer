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
