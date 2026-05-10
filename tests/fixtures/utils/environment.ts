/**
 * Test environment utilities
 */

export interface TestEnvironmentConfig {
  workspace: string;
  tempDir: string;
  fixtures: string;
  timeout: number;
  cleanupAfterTest: boolean;
}

export class TestEnvironment {
  private static config: TestEnvironmentConfig = {
    workspace: process.cwd(),
    tempDir: '/tmp/gofer-tests',
    fixtures: 'tests/fixtures',
    timeout: 30000,
    cleanupAfterTest: true
  };

  /**
   * Get current test environment configuration
   */
  public static getConfig(): TestEnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Update test environment configuration
   */
  public static setConfig(config: Partial<TestEnvironmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get workspace root path
   */
  public static getWorkspacePath(): string {
    return this.config.workspace;
  }

  /**
   * Get temporary directory for tests
   */
  public static getTempDir(): string {
    return this.config.tempDir;
  }

  /**
   * Get fixtures directory path
   */
  public static getFixturesPath(): string {
    return `${this.config.workspace}/${this.config.fixtures}`;
  }

  /**
   * Create a temporary directory for test
   */
  public static async createTempDir(testName: string): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    
    const tempPath = path.join(this.config.tempDir, testName);
    
    await fs.promises.mkdir(tempPath, { recursive: true });
    return tempPath;
  }

  /**
   * Clean up temporary directories
   */
  public static async cleanup(): Promise<void> {
    if (!this.config.cleanupAfterTest) {
      return;
    }
    
    const fs = await import('fs');
    
    try {
      await fs.promises.rm(this.config.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Set up test environment variables
   */
  public static setupTestEnv(): void {
    process.env.NODE_ENV = 'test';
    process.env.SPEC_DIR = '.specify';
    process.env.WORKSPACE_DIR = this.config.workspace;
    
    // Mock API keys for testing
    process.env.ANTHROPIC_API_KEY = 'test-claude-key-12345';
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PHONE_NUMBER = '1234567890@c.us';
  }

  /**
   * Reset test environment
   */
  public static resetTestEnv(): void {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.WHATSAPP_ENABLED;
    delete process.env.WHATSAPP_PHONE_NUMBER;
  }

  /**
   * Check if running in test environment
   */
  public static isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

export default TestEnvironment;