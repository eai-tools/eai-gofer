/**
 * Unit tests for ObservationBridge
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import { EventEmitter } from 'events';

// Mock vscode
vi.mock('vscode', () => ({}));

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../src/utils/logger', () => ({
  Logger: {
    for: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { readFileSync } from 'fs';
import { ObservationBridge } from '../../../src/autonomous/ObservationBridge';

const mockReadFileSync = vi.mocked(readFileSync);

describe('ObservationBridge', () => {
  let bridge: ObservationBridge;
  let mockContextBuilder: any;
  let mockWatcher: EventEmitter;
  const workspacePath = '/fake/workspace';

  beforeEach(() => {
    vi.clearAllMocks();

    mockContextBuilder = {
      trackObservation: vi.fn().mockReturnValue('obs-123'),
      incrementTurn: vi.fn().mockReturnValue(1),
    };

    mockWatcher = new EventEmitter();

    bridge = new ObservationBridge(mockContextBuilder, workspacePath);
    bridge.connect(mockWatcher as any);
  });

  it('ingests observation when bridge-update has observationId', () => {
    const obsFile = path.join(
      workspacePath,
      '.specify',
      'hooks',
      'observations',
      'abc-123.json'
    );
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ toolResponse: 'file contents here' })
    );

    mockWatcher.emit('bridge-update', {
      lastToolUse: {
        toolName: 'Read',
        timestamp: Date.now(),
        observationId: 'abc-123',
        toolInput: { file_path: '/some/file.ts' },
      },
    });

    expect(mockReadFileSync).toHaveBeenCalledWith(obsFile, 'utf-8');
    expect(mockContextBuilder.trackObservation).toHaveBeenCalledWith(
      'file_read',
      'file contents here',
      expect.objectContaining({
        toolName: 'Read',
        observationId: 'abc-123',
        file_path: '/some/file.ts',
      })
    );
    expect(mockContextBuilder.incrementTurn).toHaveBeenCalled();
  });

  it('is a no-op when bridge-update has no observationId', () => {
    mockWatcher.emit('bridge-update', {
      lastToolUse: {
        toolName: 'Read',
        timestamp: Date.now(),
      },
    });

    expect(mockContextBuilder.trackObservation).not.toHaveBeenCalled();
    expect(mockContextBuilder.incrementTurn).not.toHaveBeenCalled();
  });

  it('is a no-op when lastToolUse is null', () => {
    mockWatcher.emit('bridge-update', {
      lastToolUse: null,
    });

    expect(mockContextBuilder.trackObservation).not.toHaveBeenCalled();
  });

  it('does not crash on missing observation file', () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    expect(() => {
      mockWatcher.emit('bridge-update', {
        lastToolUse: {
          toolName: 'Read',
          timestamp: Date.now(),
          observationId: 'missing-id',
        },
      });
    }).not.toThrow();

    expect(mockContextBuilder.trackObservation).not.toHaveBeenCalled();
  });

  it('maps tool names to correct ObservationType', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ toolResponse: 'data' }));

    const toolMappings: Array<[string, string]> = [
      ['Read', 'file_read'],
      ['Bash', 'command_output'],
      ['Glob', 'search_result'],
      ['Grep', 'search_result'],
      ['WebFetch', 'api_response'],
      ['WebSearch', 'api_response'],
      ['UnknownTool', 'command_output'],
    ];

    for (const [toolName, expectedType] of toolMappings) {
      mockContextBuilder.trackObservation.mockClear();

      mockWatcher.emit('bridge-update', {
        lastToolUse: {
          toolName,
          timestamp: Date.now(),
          observationId: `obs-${toolName}`,
        },
      });

      expect(mockContextBuilder.trackObservation).toHaveBeenCalledWith(
        expectedType,
        'data',
        expect.objectContaining({ toolName })
      );
    }
  });

  it('increments turn on each bridge-update with observation', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ toolResponse: 'x' }));

    mockWatcher.emit('bridge-update', {
      lastToolUse: { toolName: 'Bash', timestamp: Date.now(), observationId: 'a' },
    });
    mockWatcher.emit('bridge-update', {
      lastToolUse: { toolName: 'Read', timestamp: Date.now(), observationId: 'b' },
    });

    expect(mockContextBuilder.incrementTurn).toHaveBeenCalledTimes(2);
  });

  it('falls back to raw content when toolResponse key is missing', () => {
    const rawJson = JSON.stringify({ someOtherKey: 'value' });
    mockReadFileSync.mockReturnValue(rawJson);

    mockWatcher.emit('bridge-update', {
      lastToolUse: {
        toolName: 'Bash',
        timestamp: Date.now(),
        observationId: 'fallback-obs',
      },
    });

    // Should pass the entire JSON string as content (fallback)
    expect(mockContextBuilder.trackObservation).toHaveBeenCalledWith(
      'command_output',
      rawJson,
      expect.objectContaining({ toolName: 'Bash' })
    );
  });

  it('disconnects on dispose', () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ toolResponse: 'x' }));

    bridge.dispose();

    mockWatcher.emit('bridge-update', {
      lastToolUse: { toolName: 'Read', timestamp: Date.now(), observationId: 'c' },
    });

    expect(mockContextBuilder.trackObservation).not.toHaveBeenCalled();
  });
});
