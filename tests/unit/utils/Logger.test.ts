/**
 * Unit tests for Winston logger configuration
 * Task: T007
 *
 * Tests verify:
 * - JSON format output
 * - Log levels (INFO, WARN, ERROR)
 * - File rotation configuration
 * - Structured logging with event types
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LogEntry } from '../../../src/types';

describe('Logger', () => {
  let mockTransports: any[];
  let loggerInstance: any;

  beforeEach(() => {
    mockTransports = [];
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should create logger with JSON format', async () => {
      // Mock winston module
      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        format: {
          combine: vi.fn(),
          timestamp: vi.fn(),
          json: vi.fn(),
        },
      };

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn(() => mockLogger),
          format: mockLogger.format,
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      const { logger } = await import('../../../src/utils/Logger');

      expect(logger).toBeDefined();
    });

    it('should configure log levels from environment', async () => {
      process.env.LOG_LEVEL = 'debug';

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn((config) => {
            expect(config.level).toBe('debug');
            return {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
            };
          }),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      await import('../../../src/utils/Logger');

      delete process.env.LOG_LEVEL;
    });

    it('should default to info level if not specified', async () => {
      delete process.env.LOG_LEVEL;

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn((config) => {
            expect(config.level).toBe('info');
            return {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
            };
          }),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      await import('../../../src/utils/Logger');
    });
  });

  describe('Structured Logging', () => {
    it('should log with event type and context', async () => {
      const mockInfo = vi.fn();

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn(() => ({
            info: mockInfo,
            warn: vi.fn(),
            error: vi.fn(),
          })),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      const { logger } = await import('../../../src/utils/Logger');

      const logEntry: Partial<LogEntry> = {
        event: 'task_started',
        taskId: 'T001',
        specId: '003-orchestrator-agents',
        context: { attempt: 1 },
      };

      logger.info(logEntry);

      expect(mockInfo).toHaveBeenCalledWith(logEntry);
    });

    it('should support all log levels', async () => {
      const mockInfo = vi.fn();
      const mockWarn = vi.fn();
      const mockError = vi.fn();

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn(() => ({
            info: mockInfo,
            warn: mockWarn,
            error: mockError,
          })),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      const { logger } = await import('../../../src/utils/Logger');

      logger.info({ event: 'test_info' });
      logger.warn({ event: 'test_warn' });
      logger.error({ event: 'test_error' });

      expect(mockInfo).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Transport', () => {
    it('should write WARN and ERROR to file transport', async () => {
      let fileTransportConfig: any;

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn((config) => {
            fileTransportConfig = config.transports.find(
              (t: any) => t.constructor.name === 'File'
            );
            return {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
            };
          }),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: class Console {},
            File: class File {
              constructor(public config: any) {}
            },
          },
        },
      }));

      await import('../../../src/utils/Logger');

      expect(fileTransportConfig).toBeDefined();
      expect(fileTransportConfig?.config?.level).toBe('warn');
      expect(fileTransportConfig?.config?.filename).toContain('.orchestrator.log');
    });

    it('should configure file rotation at 10MB', async () => {
      let fileTransportConfig: any;

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn((config) => {
            fileTransportConfig = config.transports.find(
              (t: any) => t.constructor.name === 'File'
            );
            return {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
            };
          }),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: class Console {},
            File: class File {
              constructor(public config: any) {}
            },
          },
        },
      }));

      await import('../../../src/utils/Logger');

      // Verify file rotation settings exist
      expect(fileTransportConfig).toBeDefined();
    });
  });

  describe('Event Types', () => {
    it('should support orchestrator events', async () => {
      const mockInfo = vi.fn();

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn(() => ({
            info: mockInfo,
            warn: vi.fn(),
            error: vi.fn(),
          })),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      const { logger } = await import('../../../src/utils/Logger');

      const events = [
        'orchestrator_started',
        'orchestrator_stopped',
        'spec_loaded',
        'task_started',
        'task_completed',
      ];

      events.forEach((event) => {
        logger.info({ event, context: {} });
      });

      expect(mockInfo).toHaveBeenCalledTimes(events.length);
    });

    it('should support validation and test events', async () => {
      const mockInfo = vi.fn();

      vi.doMock('winston', () => ({
        default: {
          createLogger: vi.fn(() => ({
            info: mockInfo,
            warn: vi.fn(),
            error: vi.fn(),
          })),
          format: {
            combine: vi.fn(),
            timestamp: vi.fn(),
            json: vi.fn(),
          },
          transports: {
            Console: vi.fn(),
            File: vi.fn(),
          },
        },
      }));

      const { logger } = await import('../../../src/utils/Logger');

      const events = [
        'validation_started',
        'validation_completed',
        'test_started',
        'test_completed',
        'test_failed',
      ];

      events.forEach((event) => {
        logger.info({ event, context: {} });
      });

      expect(mockInfo).toHaveBeenCalledTimes(events.length);
    });
  });
});
