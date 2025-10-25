/**
 * Unit tests for MCPToolHandler
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MCPToolHandler } from '../mcp/toolHandler';
import { SpecKitLoader } from '../utils/specKitLoader';
import { Connection } from 'vscode-languageserver';

// Mock dependencies
vi.mock('../utils/specKitLoader');
vi.mock('vscode-languageserver');

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}));

describe('MCPToolHandler', () => {
  let toolHandler: MCPToolHandler;
  let mockConnection: Connection;
  let mockSpecKitLoader: SpecKitLoader;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock connection
    mockConnection = {
      sendNotification: vi.fn(),
      onNotification: vi.fn(),
      onRequest: vi.fn()
    } as any;

    // Create tool handler
    toolHandler = new MCPToolHandler('/test/workspace', mockConnection);
    
    // Get the mocked SpecKitLoader instance
    mockSpecKitLoader = (toolHandler as any).specKitLoader;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Security Validation', () => {
    describe('validateSpecId', () => {
      it('should accept valid spec IDs', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', 'T001', 'completed');
        expect(result.success).toBe(true);
      });

      it('should reject empty spec ID', async () => {
        const result = await toolHandler.updateTaskStatus('', 'T001', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('non-empty string');
        expect(result.errorCode).toBe('INVALID_SPEC_ID');
      });

      it('should reject spec ID with path traversal', async () => {
        const result = await toolHandler.updateTaskStatus('../../etc/passwd', 'T001', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('path traversal');
        expect(result.errorCode).toBe('INVALID_SPEC_ID');
      });

      it('should reject spec ID with forward slashes', async () => {
        const result = await toolHandler.updateTaskStatus('some/path/spec', 'T001', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('path traversal');
      });

      it('should reject spec ID with backslashes', async () => {
        const result = await toolHandler.updateTaskStatus('some\\path\\spec', 'T001', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('path traversal');
      });

      it('should reject spec ID that is too long', async () => {
        const longSpecId = 'a'.repeat(101);
        const result = await toolHandler.updateTaskStatus(longSpecId, 'T001', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('too long');
      });

      it('should reject spec ID with invalid characters', async () => {
        const result = await toolHandler.updateTaskStatus('spec@#$%', 'T001', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('alphanumeric characters');
      });

      it('should log security violations', async () => {
        const consoleSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        
        await toolHandler.updateTaskStatus('../../etc/passwd', 'T001', 'completed');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Security Violation')
        );
        expect(mockConnection.sendNotification).toHaveBeenCalledWith(
          'specKit/securityViolation',
          expect.objectContaining({
            type: 'SECURITY_VIOLATION',
            message: 'Path traversal attempt in specId'
          })
        );
        
        consoleSpy.mockRestore();
      });
    });

    describe('validateTaskId', () => {
      it('should accept valid task IDs', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', 'T001', 'completed');
        expect(result.success).toBe(true);
      });

      it('should accept numeric task IDs', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', '123', 'completed');
        expect(result.success).toBe(true);
      });

      it('should accept hash-prefixed task IDs', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', '#123', 'completed');
        expect(result.success).toBe(true);
      });

      it('should reject empty task ID', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', '', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('non-empty string');
        expect(result.errorCode).toBe('INVALID_TASK_ID');
      });

      it('should reject task ID that is too long', async () => {
        const longTaskId = 'T' + '1'.repeat(20);
        const result = await toolHandler.updateTaskStatus('001-valid-spec', longTaskId, 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('too long');
      });

      it('should reject task ID with invalid format', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', 'invalid-task', 'completed');
        expect(result.success).toBe(false);
        expect(result.error).toContain('must match format');
      });
    });

    describe('status validation', () => {
      it('should accept valid status values', async () => {
        const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'failed'];
        
        for (const status of validStatuses) {
          const result = await toolHandler.updateTaskStatus('001-valid-spec', 'T001', status);
          expect(result.success).toBe(true);
        }
      });

      it('should reject invalid status values', async () => {
        const result = await toolHandler.updateTaskStatus('001-valid-spec', 'T001', 'invalid-status');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid status');
        expect(result.errorCode).toBe('INVALID_STATUS');
      });
    });
  });

  describe('MCP Tools', () => {
    describe('getSpecs', () => {
      it('should return all specs with task counts', async () => {
        const mockSpecs = [
          {
            id: '001-test-spec',
            title: 'Test Spec',
            status: 'in_progress',
            tasks: [
              { id: 'T001', description: 'Task 1', status: 'completed', dependencies: [], parallel: false, attempts: 0 },
              { id: 'T002', description: 'Task 2', status: 'pending', dependencies: ['T001'], parallel: false, attempts: 0 }
            ]
          }
        ];

        mockSpecKitLoader.loadAllSpecs = vi.fn().mockResolvedValue(mockSpecs);

        const result = await toolHandler.getSpecs();

        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
        expect(result.specs).toHaveLength(1);
        expect(result.specs[0]).toMatchObject({
          id: '001-test-spec',
          title: 'Test Spec',
          status: 'in_progress',
          taskCount: 2,
          completedTasks: 1
        });
      });

      it('should handle empty specs directory', async () => {
        mockSpecKitLoader.loadAllSpecs = vi.fn().mockResolvedValue([]);

        const result = await toolHandler.getSpecs();

        expect(result.success).toBe(true);
        expect(result.count).toBe(0);
        expect(result.specs).toHaveLength(0);
      });

      it('should handle loading errors', async () => {
        mockSpecKitLoader.loadAllSpecs = vi.fn().mockRejectedValue(new Error('File system error'));

        const result = await toolHandler.getSpecs();

        expect(result.success).toBe(false);
        expect(result.error).toContain('File system error');
      });
    });

    describe('getNextTask', () => {
      it('should return next available task', async () => {
        const mockSpecs = [
          {
            id: '001-test-spec',
            title: 'Test Spec',
            status: 'in_progress',
            tasks: [
              { id: 'T001', description: 'Task 1', status: 'completed', dependencies: [], parallel: false, attempts: 0 },
              { id: 'T002', description: 'Task 2', status: 'pending', dependencies: ['T001'], parallel: false, attempts: 0 }
            ]
          }
        ];

        mockSpecKitLoader.loadAllSpecs = vi.fn().mockResolvedValue(mockSpecs);

        const result = await toolHandler.getNextTask();

        expect(result.success).toBe(true);
        expect(result.task).toMatchObject({
          id: 'T002',
          description: 'Task 2',
          status: 'pending'
        });
        expect(result.spec).toMatchObject({
          id: '001-test-spec',
          title: 'Test Spec'
        });
      });

      it('should return null when no tasks available', async () => {
        const mockSpecs = [
          {
            id: '001-test-spec',
            title: 'Test Spec',
            status: 'completed',
            tasks: [
              { id: 'T001', description: 'Task 1', status: 'completed', dependencies: [], parallel: false, attempts: 0 }
            ]
          }
        ];

        mockSpecKitLoader.loadAllSpecs = vi.fn().mockResolvedValue(mockSpecs);

        const result = await toolHandler.getNextTask();

        expect(result.success).toBe(true);
        expect(result.task).toBeNull();
        expect(result.spec).toBeNull();
      });
    });

    describe('executeTask', () => {
      it('should return task context for valid task', async () => {
        const mockSpec = {
          id: '001-test-spec',
          title: 'Test Spec',
          description: 'Test description',
          status: 'in_progress',
          tasks: [
            { id: 'T001', description: 'Task 1', status: 'pending', dependencies: [], parallel: false, attempts: 0 }
          ]
        };

        mockSpecKitLoader.loadSpec = vi.fn().mockResolvedValue(mockSpec);

        const result = await toolHandler.executeTask('001-test-spec', 'T001');

        expect(result.success).toBe(true);
        expect(result.task).toMatchObject({
          id: 'T001',
          description: 'Task 1'
        });
        expect(result.spec).toMatchObject({
          id: '001-test-spec',
          title: 'Test Spec'
        });
      });

      it('should handle non-existent spec', async () => {
        mockSpecKitLoader.loadSpec = vi.fn().mockResolvedValue(null);

        const result = await toolHandler.executeTask('non-existent-spec', 'T001');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Spec not found');
      });

      it('should handle non-existent task', async () => {
        const mockSpec = {
          id: '001-test-spec',
          title: 'Test Spec',
          tasks: []
        };

        mockSpecKitLoader.loadSpec = vi.fn().mockResolvedValue(mockSpec);

        const result = await toolHandler.executeTask('001-test-spec', 'T999');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Task not found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle SpecKitLoader errors gracefully', async () => {
      mockSpecKitLoader.loadAllSpecs = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await toolHandler.getSpecs();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockSpecKitLoader.updateTaskStatus = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      const result = await toolHandler.updateTaskStatus('001-test-spec', 'T001', 'completed');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});