/**
 * Example test demonstrating how to use test fixtures
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  TestFixtureFactory,
  TestEnvironment,
  MockClaudeAPI,
  MockWhatsAppAPI,
  MockVSCodeAPI,
  TestDataGenerator,
} from '../fixtures/index.js';

describe('Test Fixtures Usage Examples', () => {
  beforeAll(() => {
    TestEnvironment.setupTestEnv();
  });

  afterAll(async () => {
    await TestEnvironment.cleanup();
    TestEnvironment.resetTestEnv();
  });

  describe('Direct Mock Usage', () => {
    it('should create and use Claude API mock', async () => {
      const claudeMock = new MockClaudeAPI();

      const response = claudeMock.createValidationResponse(true, []);

      expect(response.isValid).toBe(true);
      expect(response.issues).toHaveLength(0);
      expect(response.qualityScore).toBeGreaterThan(80);
    });

    it('should create and use WhatsApp API mock', async () => {
      const whatsappMock = new MockWhatsAppAPI();
      whatsappMock.setReady(true);

      const message = await whatsappMock.sendMessage({
        to: '1234567890@c.us',
        body: 'Test message',
      });

      expect(message.id).toMatch(/^msg_/);
      expect(message.status).toBe('queued');
      expect(message.body).toBe('Test message');
    });

    it('should create and use VSCode API mock', () => {
      const vscodeMock = new MockVSCodeAPI();

      const vscode = vscodeMock.getVSCodeMock();

      expect(vscode.workspace).toBeDefined();
      expect(vscode.window).toBeDefined();
      expect(vscode.commands).toBeDefined();
    });
  });

  describe('Factory Usage', () => {
    it('should create mocks via factory', async () => {
      const claudeMock = await TestFixtureFactory.createClaudeMock();
      const whatsappMock = await TestFixtureFactory.createWhatsAppMock();
      const vscodeMock = await TestFixtureFactory.createVSCodeMock();

      expect(claudeMock).toBeInstanceOf(MockClaudeAPI);
      expect(whatsappMock).toBeInstanceOf(MockWhatsAppAPI);
      expect(vscodeMock).toBeInstanceOf(MockVSCodeAPI);
    });

    it('should generate test data via factory', async () => {
      const spec = await TestFixtureFactory.generateSpec();
      const specs = await TestFixtureFactory.generateSpecs(3);
      const tasks = await TestFixtureFactory.generateTasks(2, 5);
      const project = await TestFixtureFactory.generateProject('web');

      expect(spec.id).toMatch(/^spec_/);
      expect(spec.title).toBeTruthy();
      expect(specs).toHaveLength(3);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.length).toBeLessThanOrEqual(5);
      expect(project.type).toBe('web');
      expect(project.files).toBeDefined();
    });
  });

  describe('Direct Data Generation', () => {
    it('should generate realistic specs', () => {
      const spec = TestDataGenerator.generateSpec({
        status: 'in_progress',
        title: 'Custom Test Spec',
      });

      expect(spec.status).toBe('in_progress');
      expect(spec.title).toBe('Custom Test Spec');
      expect(spec.tasks).toBeDefined();
      expect(spec.acceptanceCriteria).toBeDefined();
    });

    it('should generate project structures', () => {
      const webProject = TestDataGenerator.generateProjectStructure('web');
      const apiProject = TestDataGenerator.generateProjectStructure('api');

      expect(webProject.type).toBe('web');
      expect(webProject.dependencies).toContain('react');

      expect(apiProject.type).toBe('api');
      expect(apiProject.dependencies).toContain('express');
    });

    it('should generate file content', () => {
      const tsContent = TestDataGenerator.generateFileContent('typescript');
      const jsContent = TestDataGenerator.generateFileContent('javascript');
      const jsonContent = TestDataGenerator.generateFileContent('json');

      expect(tsContent).toContain('interface');
      expect(tsContent).toContain('export class');

      expect(jsContent).toContain('class Calculator');
      expect(jsContent).toContain('module.exports');

      expect(() => JSON.parse(jsonContent)).not.toThrow();
    });
  });

  describe('Test Scenarios', () => {
    it('should provide pre-configured test scenarios', () => {
      const scenarios = TestDataGenerator.generateTestScenarios();

      expect(scenarios.successful_validation).toBeDefined();
      expect(scenarios.validation_failure).toBeDefined();
      expect(scenarios.test_failure).toBeDefined();
      expect(scenarios.empty_spec).toBeDefined();

      // Test successful validation scenario
      const successScenario = scenarios.successful_validation as {
        expectedOutput: { isValid: boolean; qualityScore: number };
      };
      expect(successScenario.expectedOutput.isValid).toBe(true);
      expect(successScenario.expectedOutput.qualityScore).toBeGreaterThan(90);
    });
  });

  describe('Environment Setup', () => {
    it('should setup test environment correctly', () => {
      expect(TestEnvironment.isTestEnvironment()).toBe(true);
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.GOFER_TEST_CLI_SESSION).toBe('mock');
    });

    it('should provide workspace paths', () => {
      const workspacePath = TestEnvironment.getWorkspacePath();
      const fixturesPath = TestEnvironment.getFixturesPath();

      expect(workspacePath).toBeTruthy();
      expect(fixturesPath).toContain('tests/fixtures');
    });

    it('should create temporary directories', async () => {
      const tempDir = await TestEnvironment.createTempDir('test-example');

      expect(tempDir).toContain('test-example');

      // Verify directory exists
      const fs = await import('fs');
      try {
        await fs.promises.access(tempDir);
        expect(true).toBe(true); // Directory exists
      } catch {
        expect(false).toBe(true); // Directory doesn't exist
      }
    });
  });

  describe('Integration Test Example', () => {
    it('should simulate a complete workflow', async () => {
      // Setup mocks
      const claudeMock = new MockClaudeAPI();
      const whatsappMock = new MockWhatsAppAPI();
      const vscodeMock = new MockVSCodeAPI();

      // Generate test data
      const spec = TestDataGenerator.generateSpec({
        status: 'in_progress',
        title: 'Integration Test Feature',
      });

      // Simulate Claude validation
      const validation = claudeMock.createValidationResponse(true, []);
      expect(validation.isValid).toBe(true);

      // Simulate test execution
      const testResult = claudeMock.createTestExecutionResponse(true, 85.5, []);
      expect(testResult.passed).toBe(true);
      expect(testResult.coverage).toBe(85.5);

      // Simulate WhatsApp notification
      whatsappMock.setReady(true);
      const notification = await whatsappMock.sendMessage({
        to: '1234567890@c.us',
        body: `Spec "${spec.title}" validation completed successfully`,
      });

      expect(notification.status).toBe('queued');
      expect(notification.body).toContain('validation completed successfully');

      // Simulate VSCode interaction
      const vscode = vscodeMock.getVSCodeMock();
      const window = vscode.window as Record<string, unknown>;
      expect(window.showInformationMessage).toBeDefined();

      // Simulate calling the method
      if (typeof window.showInformationMessage === 'function') {
        await window.showInformationMessage('Test completed successfully');
      }
    });
  });
});
