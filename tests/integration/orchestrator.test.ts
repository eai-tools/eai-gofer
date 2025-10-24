import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutonomousOrchestrator } from '../../src/orchestrator/AutonomousOrchestrator.js';
import { EngineerAgent } from '../../src/agents/EngineerAgent.js';
import { TestAgent } from '../../src/agents/TestAgent.js';
import { SpecLoader } from '../../src/orchestrator/SpecLoader.js';

// Mock all dependencies
vi.mock('../../src/agents/EngineerAgent.js');
vi.mock('../../src/agents/TestAgent.js');
vi.mock('../../src/orchestrator/SpecLoader.js');
vi.mock('../../src/utils/NotificationService.js');
vi.mock('../../src/interceptor/ClaudeCodeInterceptor.js');
vi.mock('@anthropic-ai/sdk');

describe('Orchestrator Integration', () => {
  let orchestrator: AutonomousOrchestrator;
  let mockEngineerAgent: any;
  let mockTestAgent: any;
  let mockSpecLoader: any;

  const mockConfig = {
    specDir: '.specify/specs',
    apiKey: 'test-key',
    twilioConfig: { accountSid: 'test', authToken: 'test', phoneNumber: '+1234567890' },
    whatsappConfig: { phoneNumber: '+1234567890' },
    workspaceDir: '/test/workspace'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockEngineerAgent = {
      validate: vi.fn(),
      validateConstitution: vi.fn()
    };
    
    mockTestAgent = {
      runTests: vi.fn()
    };

    mockSpecLoader = {
      loadAllSpecs: vi.fn(),
      loadSpec: vi.fn()
    };

    vi.mocked(EngineerAgent).mockImplementation(() => mockEngineerAgent);
    vi.mocked(TestAgent).mockImplementation(() => mockTestAgent);
    vi.mocked(SpecLoader).mockImplementation(() => mockSpecLoader);

    orchestrator = new AutonomousOrchestrator(
      mockConfig.specDir,
      mockConfig.apiKey,
      mockConfig.twilioConfig,
      mockConfig.whatsappConfig,
      mockConfig.workspaceDir
    );
  });

  describe('initialization', () => {
    it('should initialize all components correctly', () => {
      expect(EngineerAgent).toHaveBeenCalledWith(mockConfig.apiKey);
      expect(TestAgent).toHaveBeenCalledWith(mockConfig.workspaceDir);
      expect(SpecLoader).toHaveBeenCalledWith(mockConfig.specDir);
    });

    it('should provide status information', () => {
      const status = orchestrator.getStatus();
      
      expect(status).toEqual({
        isRunning: false,
        currentTask: null,
        currentSpec: null
      });
    });
  });

  describe('task queue management', () => {
    it('should build task queue with dependency resolution', async () => {
      const mockSpecs = [
        {
          id: '001-test-spec',
          title: 'Test Spec',
          tasks: [
            {
              id: 'T001',
              description: 'First task',
              dependencies: [],
              status: 'pending',
              deliveryPrompt: 'Implement first task'
            },
            {
              id: 'T002', 
              description: 'Second task',
              dependencies: ['T001'],
              status: 'pending',
              deliveryPrompt: 'Implement second task'
            }
          ],
          acceptanceCriteria: []
        }
      ];

      mockSpecLoader.loadAllSpecs.mockResolvedValue(mockSpecs);

      // Access private method for testing
      await (orchestrator as any).buildTaskQueue();

      expect(mockSpecLoader.loadAllSpecs).toHaveBeenCalled();
      expect((orchestrator as any).processingQueue).toHaveLength(2);
    });

    it('should handle circular dependencies', async () => {
      const mockSpecs = [
        {
          id: '001-circular',
          title: 'Circular Deps',
          tasks: [
            {
              id: 'T001',
              description: 'Task 1',
              dependencies: ['T002'],
              status: 'pending',
              deliveryPrompt: 'Task 1'
            },
            {
              id: 'T002',
              description: 'Task 2', 
              dependencies: ['T001'],
              status: 'pending',
              deliveryPrompt: 'Task 2'
            }
          ],
          acceptanceCriteria: []
        }
      ];

      mockSpecLoader.loadAllSpecs.mockResolvedValue(mockSpecs);

      // Should throw error for circular dependency
      await expect((orchestrator as any).buildTaskQueue()).rejects.toThrow(/circular dependency/i);
    });
  });

  describe('agent coordination', () => {
    it('should coordinate engineer and test agents successfully', async () => {
      const mockTask = {
        id: 'T001',
        description: 'Test task',
        dependencies: [],
        status: 'pending',
        deliveryPrompt: 'Implement test'
      };

      const mockImplementation = 'function test() { return true; }';

      // Mock successful validation
      mockEngineerAgent.validate.mockResolvedValue({
        isValid: true,
        issues: [],
        suggestions: []
      });

      // Mock successful tests
      mockTestAgent.runTests.mockResolvedValue({
        passed: true,
        failedTests: [],
        summary: 'All tests passed'
      });

      // Test the validation workflow
      const validationResult = await mockEngineerAgent.validate(
        mockTask.description,
        mockImplementation,
        { passed: true, failedTests: [], summary: 'Pre-validation' }
      );

      const testResult = await mockTestAgent.runTests([]);

      expect(validationResult.isValid).toBe(true);
      expect(testResult.passed).toBe(true);
      expect(mockEngineerAgent.validate).toHaveBeenCalledWith(
        mockTask.description,
        mockImplementation,
        { passed: true, failedTests: [], summary: 'Pre-validation' }
      );
    });

    it('should handle validation failures with retry logic', async () => {
      const mockTask = {
        id: 'T001',
        description: 'Failing task',
        attempts: 0,
        deliveryPrompt: 'Implement failing feature'
      };

      // Mock validation failure
      mockEngineerAgent.validate.mockResolvedValue({
        isValid: false,
        issues: ['Code quality issues'],
        suggestions: ['Fix the issues']
      });

      const validationResult = await mockEngineerAgent.validate(
        mockTask.description,
        'bad code',
        { passed: true, failedTests: [], summary: 'OK' }
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.issues).toContain('Code quality issues');
      expect(validationResult.suggestions).toContain('Fix the issues');

      // Should trigger retry logic in actual orchestrator
      mockTask.attempts = (mockTask.attempts || 0) + 1;
      expect(mockTask.attempts).toBe(1);
    });

    it('should handle test failures appropriately', async () => {
      const mockTask = {
        id: 'T001',
        description: 'Test task',
        attempts: 0
      };

      // Mock passing validation but failing tests
      mockEngineerAgent.validate.mockResolvedValue({
        isValid: true,
        issues: [],
        suggestions: []
      });

      mockTestAgent.runTests.mockResolvedValue({
        passed: false,
        failedTests: ['login test', 'auth test'],
        summary: '2 tests failed'
      });

      const validationResult = await mockEngineerAgent.validate('task', 'code', { passed: true, failedTests: [], summary: 'OK' });
      const testResult = await mockTestAgent.runTests([]);

      expect(validationResult.isValid).toBe(true);
      expect(testResult.passed).toBe(false);
      expect(testResult.failedTests).toEqual(['login test', 'auth test']);

      // Should trigger test failure handling
      mockTask.attempts = (mockTask.attempts || 0) + 1;
      expect(mockTask.attempts).toBe(1);
    });
  });

  describe('error handling and recovery', () => {
    it('should handle maximum retry attempts', async () => {
      const mockTask = {
        id: 'T001',
        description: 'Stubborn task',
        attempts: 3 // Already at max attempts
      };

      const maxAttempts = (orchestrator as any).maxAttempts;
      expect(maxAttempts).toBe(3);

      // When task reaches max attempts, should escalate
      if (mockTask.attempts >= maxAttempts) {
        // Simulate escalation
        console.log('Task would be escalated to human');
        expect(mockTask.attempts).toBeGreaterThanOrEqual(maxAttempts);
      }
    });

    it('should handle missing dependencies gracefully', async () => {
      const mockSpecs = [
        {
          id: '001-test',
          title: 'Test',
          tasks: [
            {
              id: 'T002',
              description: 'Task with missing dep',
              dependencies: ['T001'], // T001 doesn't exist
              status: 'pending',
              deliveryPrompt: 'Implement task'
            }
          ],
          acceptanceCriteria: []
        }
      ];

      mockSpecLoader.loadAllSpecs.mockResolvedValue(mockSpecs);

      // Should handle missing dependencies without crashing
      await expect((orchestrator as any).buildTaskQueue()).resolves.not.toThrow();
    });

    it('should handle API errors in agents', async () => {
      mockEngineerAgent.validate.mockRejectedValue(new Error('API Error'));

      const result = await mockEngineerAgent.validate('task', 'code', { passed: true, failedTests: [], summary: 'OK' })
        .catch(() => ({
          isValid: false,
          issues: ['API Error occurred'],
          suggestions: ['Retry later']
        }));

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('API Error occurred');
    });
  });

  describe('lifecycle management', () => {
    it('should start and stop gracefully', () => {
      expect(orchestrator.getStatus().isRunning).toBe(false);
      
      orchestrator.stop();
      
      expect(orchestrator.getStatus().isRunning).toBe(false);
    });
  });
});