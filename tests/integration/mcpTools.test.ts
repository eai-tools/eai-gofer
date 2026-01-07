import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPToolHandler } from '../../language-server/src/mcp/toolHandler.js';
import { SpecKitLoader } from '../../language-server/src/utils/specKitLoader.js';

// Mock the dependencies
vi.mock('../../language-server/src/utils/specKitLoader.js');
vi.mock('@anthropic-ai/sdk');
vi.mock('vscode-languageserver');

describe('MCP Tools Integration', () => {
  let mcpHandler: MCPToolHandler;
  let mockSpecKitLoader: InstanceType<typeof SpecKitLoader>;
  let mockConnection: { sendNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock connection
    mockConnection = {
      sendNotification: vi.fn(),
    };

    // Setup mock SpecKitLoader
    mockSpecKitLoader = {
      loadAllSpecs: vi.fn(),
      loadSpec: vi.fn(),
      updateTaskStatus: vi.fn(),
    };

    vi.mocked(SpecKitLoader).mockImplementation(() => mockSpecKitLoader);

    mcpHandler = new MCPToolHandler('/test/workspace', mockConnection);
  });

  const mockSpecs = [
    {
      id: '001-language-server',
      title: 'Language Server Implementation',
      status: 'completed',
      description: 'Implement LSP with MCP tools',
      tasks: [
        {
          id: 'T001',
          description: 'Implement LSP base functionality',
          status: 'completed',
          dependencies: [],
          parallel: false,
          attempts: 0,
        },
        {
          id: 'T002',
          description: 'Add MCP tool support',
          status: 'completed',
          dependencies: ['T001'],
          parallel: false,
          attempts: 0,
        },
      ],
      dependencies: [],
      created: new Date(),
      updated: new Date(),
    },
    {
      id: '002-orchestrator',
      title: 'Orchestrator Agents',
      status: 'in_progress',
      description: 'Implement agent coordination',
      tasks: [
        {
          id: 'T003',
          description: 'Implement EngineerAgent',
          status: 'completed',
          dependencies: [],
          parallel: false,
          attempts: 0,
        },
        {
          id: 'T004',
          description: 'Implement TestAgent',
          status: 'in_progress',
          dependencies: ['T003'],
          parallel: false,
          attempts: 0,
        },
      ],
      dependencies: [],
      created: new Date(),
      updated: new Date(),
    },
  ];

  describe('getSpecs tool', () => {
    it('should return all specifications', async () => {
      mockSpecKitLoader.loadAllSpecs.mockResolvedValue(mockSpecs);

      const result = await mcpHandler.getSpecs();

      expect(result).toEqual({
        success: true,
        count: 2,
        specs: [
          {
            id: '001-language-server',
            title: 'Language Server Implementation',
            status: 'completed',
            taskCount: 2,
            completedTasks: 2,
            tasks: [
              {
                id: 'T001',
                description: 'Implement LSP base functionality',
                status: 'completed',
                dependencies: [],
              },
              {
                id: 'T002',
                description: 'Add MCP tool support',
                status: 'completed',
                dependencies: ['T001'],
              },
            ],
          },
          {
            id: '002-orchestrator',
            title: 'Orchestrator Agents',
            status: 'in_progress',
            taskCount: 2,
            completedTasks: 1,
            tasks: [
              {
                id: 'T003',
                description: 'Implement EngineerAgent',
                status: 'completed',
                dependencies: [],
              },
              {
                id: 'T004',
                description: 'Implement TestAgent',
                status: 'in_progress',
                dependencies: ['T003'],
              },
            ],
          },
        ],
      });
      expect(mockSpecKitLoader.loadAllSpecs).toHaveBeenCalled();
    });

    it('should handle empty specs directory', async () => {
      mockSpecKitLoader.loadAllSpecs.mockResolvedValue([]);

      const result = await mcpHandler.getSpecs();

      expect(result).toEqual({
        success: true,
        count: 0,
        specs: [],
      });
    });

    it('should handle loading errors gracefully', async () => {
      mockSpecKitLoader.loadAllSpecs.mockRejectedValue(new Error('Directory not found'));

      const result = await mcpHandler.getSpecs();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Directory not found');
    });
  });

  describe('getNextTask tool', () => {
    beforeEach(() => {
      mockSpecKitLoader.loadAllSpecs.mockResolvedValue(mockSpecs);
    });

    it('should return next available task', async () => {
      const result = await mcpHandler.getNextTask();

      expect(result.success).toBe(true);
      expect(result.task.id).toBe('T004');
      expect(result.spec.id).toBe('002-orchestrator');
    });

    it('should return null when no tasks available', async () => {
      const completedSpecs = mockSpecs.map((spec) => ({
        ...spec,
        status: 'completed',
        tasks: spec.tasks.map((task) => ({ ...task, status: 'completed' })),
      }));

      mockSpecKitLoader.loadAllSpecs.mockResolvedValue(completedSpecs);

      const result = await mcpHandler.getNextTask();

      expect(result.success).toBe(true);
      expect(result.task).toBeNull();
      expect(result.message).toContain('No tasks available');
    });

    it('should respect task dependencies', async () => {
      const specsWithDeps = [
        {
          id: '003-test-spec',
          title: 'Test Spec',
          status: 'pending',
          description: 'Test spec with dependencies',
          tasks: [
            {
              id: 'T005',
              description: 'Dependent task',
              status: 'pending',
              dependencies: ['T006'],
              parallel: false,
              attempts: 0,
            },
            {
              id: 'T006',
              description: 'Independent task',
              status: 'pending',
              dependencies: [],
              parallel: false,
              attempts: 0,
            },
          ],
          dependencies: [],
          created: new Date(),
          updated: new Date(),
        },
      ];

      mockSpecKitLoader.loadAllSpecs.mockResolvedValue(specsWithDeps);

      const result = await mcpHandler.getNextTask();

      expect(result.success).toBe(true);
      expect(result.task.id).toBe('T006'); // Should return independent task first
    });
  });

  describe('executeTask tool', () => {
    beforeEach(() => {
      const mockSpec = mockSpecs[1]; // spec with T004 task
      mockSpecKitLoader.loadSpec.mockResolvedValue(mockSpec);
    });

    it('should return task context for execution', async () => {
      const result = await mcpHandler.executeTask('002-orchestrator', 'T004');

      expect(result.success).toBe(true);
      expect(result.task?.id).toBe('T004');
      expect(result.spec?.id).toBe('002-orchestrator');
    });

    it('should reject execution of non-existent task', async () => {
      const result = await mcpHandler.executeTask('002-orchestrator', 'T999');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task T999 not found');
    });

    it('should validate spec ID format', async () => {
      const result = await mcpHandler.executeTask('../malicious', 'T004');

      expect(result.success).toBe(false);
      expect(result.error).toContain('path traversal');
    });
  });

  describe('updateTaskStatus tool', () => {
    beforeEach(() => {
      mockSpecKitLoader.updateTaskStatus.mockResolvedValue(undefined);
    });

    it('should update task status successfully', async () => {
      const result = await mcpHandler.updateTaskStatus('002-orchestrator', 'T004', 'completed');

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated to completed');
      expect(mockSpecKitLoader.updateTaskStatus).toHaveBeenCalledWith(
        '002-orchestrator',
        'T004',
        'completed'
      );
      expect(mockConnection.sendNotification).toHaveBeenCalledWith(
        'specGofer/taskProgress',
        expect.objectContaining({
          specId: '002-orchestrator',
          taskId: 'T004',
          status: 'completed',
        })
      );
    });

    it('should reject invalid status values', async () => {
      const result = await mcpHandler.updateTaskStatus(
        '002-orchestrator',
        'T004',
        'invalid_status'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('should validate spec and task IDs', async () => {
      const result = await mcpHandler.updateTaskStatus('../malicious', 'T004', 'completed');

      expect(result.success).toBe(false);
      expect(result.error).toContain('path traversal');
    });
  });

  describe('validateCode tool', () => {
    it('should validate code files', async () => {
      const result = await mcpHandler.validateCode(['src/test.ts']);

      expect(result.success).toBe(true);
      // Message varies based on whether ValidationService is initialized (API key present)
      expect(result.message).toBeDefined();
      expect(result.files).toEqual(['src/test.ts']);
    });
  });

  describe('runTests tool', () => {
    it('should run tests for a specification', async () => {
      const result = await mcpHandler.runTests('002-orchestrator');

      expect(result.success).toBe(true);
      expect(result.message).toContain('not yet implemented');
      expect(result.specId).toBe('002-orchestrator');
    });
  });

  describe('error handling', () => {
    it('should handle SpecKitLoader errors', async () => {
      mockSpecKitLoader.loadAllSpecs.mockRejectedValue(new Error('File system error'));

      const result = await mcpHandler.getSpecs();

      expect(result.success).toBe(false);
      expect(result.error).toContain('File system error');
    });

    it('should validate input parameters', async () => {
      const result = await mcpHandler.executeTask('', 'T001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-empty string');
    });

    it('should handle connection notification errors gracefully', async () => {
      mockSpecKitLoader.updateTaskStatus.mockResolvedValue(undefined);
      mockConnection.sendNotification.mockImplementation(() => {
        throw new Error('Connection error');
      });

      const result = await mcpHandler.updateTaskStatus('002-orchestrator', 'T004', 'completed');

      // Should fail if notification fails since it's in the try block
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection error');
    });
  });

  describe('integration workflow', () => {
    it('should support complete task workflow', async () => {
      mockSpecKitLoader.loadAllSpecs.mockResolvedValue(mockSpecs);
      mockSpecKitLoader.loadSpec.mockResolvedValue(mockSpecs[1]);
      mockSpecKitLoader.updateTaskStatus.mockResolvedValue(undefined);

      // 1. Get all specs
      const specsResult = await mcpHandler.getSpecs();
      expect(specsResult.success).toBe(true);

      // 2. Get next task
      const nextTaskResult = await mcpHandler.getNextTask();
      expect(nextTaskResult.success).toBe(true);
      const taskId = nextTaskResult.task.id;
      const specId = nextTaskResult.spec.id;

      // 3. Execute task
      const executeResult = await mcpHandler.executeTask(specId, taskId);
      expect(executeResult.success).toBe(true);

      // 4. Validate code
      const validateResult = await mcpHandler.validateCode(['src/task.ts']);
      expect(validateResult.success).toBe(true);

      // 5. Run tests
      const testResult = await mcpHandler.runTests(specId);
      expect(testResult.success).toBe(true);

      // 6. Update status
      const updateResult = await mcpHandler.updateTaskStatus(specId, taskId, 'completed');
      expect(updateResult.success).toBe(true);
    });
  });
});
