/**
 * Test fixtures index - exports all mocks and test data
 */

// Mocks
export { MockClaudeAPI, type ClaudeResponse } from './mocks/claude.js';
export { MockWhatsAppAPI, type WhatsAppMessage } from './mocks/whatsapp.js';
export { MockVSCodeAPI } from './mocks/vscode.js';

// Data generators
export { 
  TestDataGenerator,
  type SpecData,
  type TaskData,
  type ProjectStructure,
  type FileStructure 
} from './data/generators.js';

// Utilities
export { TestEnvironment } from './utils/environment.js';

/**
 * Factory functions for creating test fixtures
 */
export class TestFixtureFactory {
  /**
   * Create a new Claude API mock
   */
  public static async createClaudeMock(): Promise<import('./mocks/claude.js').MockClaudeAPI> {
    const { MockClaudeAPI } = await import('./mocks/claude.js');
    return new MockClaudeAPI();
  }

  /**
   * Create a new WhatsApp API mock
   */
  public static async createWhatsAppMock(): Promise<import('./mocks/whatsapp.js').MockWhatsAppAPI> {
    const { MockWhatsAppAPI } = await import('./mocks/whatsapp.js');
    return new MockWhatsAppAPI();
  }

  /**
   * Create a new VSCode API mock
   */
  public static async createVSCodeMock(): Promise<import('./mocks/vscode.js').MockVSCodeAPI> {
    const { MockVSCodeAPI } = await import('./mocks/vscode.js');
    return new MockVSCodeAPI();
  }

  /**
   * Generate test spec data
   */
  public static async generateSpec(overrides?: Partial<import('./data/generators.js').SpecData>): Promise<import('./data/generators.js').SpecData> {
    const { TestDataGenerator } = await import('./data/generators.js');
    return TestDataGenerator.generateSpec(overrides);
  }

  /**
   * Generate multiple test specs
   */
  public static async generateSpecs(count: number): Promise<import('./data/generators.js').SpecData[]> {
    const { TestDataGenerator } = await import('./data/generators.js');
    return TestDataGenerator.generateSpecs(count);
  }

  /**
   * Generate test tasks
   */
  public static async generateTasks(min = 1, max = 10): Promise<import('./data/generators.js').TaskData[]> {
    const { TestDataGenerator } = await import('./data/generators.js');
    return TestDataGenerator.generateTasks(min, max);
  }

  /**
   * Generate project structure
   */
  public static async generateProject(type: 'web' | 'api' | 'cli' | 'library' | 'mobile' = 'web'): Promise<import('./data/generators.js').ProjectStructure> {
    const { TestDataGenerator } = await import('./data/generators.js');
    return TestDataGenerator.generateProjectStructure(type);
  }

  /**
   * Get test scenarios
   */
  public static async getTestScenarios(): Promise<Record<string, unknown>> {
    const { TestDataGenerator } = await import('./data/generators.js');
    return TestDataGenerator.generateTestScenarios();
  }
}

/**
 * Quick access to commonly used test data (synchronous versions)
 */
export const TestFixtures = {
  // Factory methods
  Factory: TestFixtureFactory
} as const;

export default TestFixtures;