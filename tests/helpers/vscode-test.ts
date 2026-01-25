import * as path from 'path';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

/**
 * VSCode Test Harness Configuration
 * Provides utilities for running tests in a real VSCode instance
 */

export interface VSCodeTestOptions {
  /** VSCode version to test against (default: 'stable') */
  version?: string;
  /** Extension development path (default: extension/) */
  extensionDevelopmentPath?: string;
  /** Test files glob pattern */
  extensionTestsPath?: string;
  /** Workspace to open in VSCode */
  launchArgs?: string[];
  /** Environment variables */
  extensionTestsEnv?: Record<string, string>;
}

/**
 * Downloads VSCode for testing
 * @param version - VSCode version ('stable', 'insiders', or specific version)
 * @returns Path to VSCode executable
 */
export async function setupVSCode(version: string = 'stable'): Promise<string> {
  try {
    const vscodeExecutablePath = await downloadAndUnzipVSCode(version);
    return vscodeExecutablePath;
  } catch (error) {
    throw new Error(`Failed to download VSCode ${version}: ${error}`);
  }
}

/**
 * Runs integration/E2E tests in a VSCode instance
 * @param options - Test configuration options
 * @returns Exit code (0 = success, non-zero = failure)
 */
export async function runVSCodeTests(options: VSCodeTestOptions = {}): Promise<number> {
  const {
    version = 'stable',
    extensionDevelopmentPath = path.resolve(__dirname, '../../extension'),
    extensionTestsPath = path.resolve(__dirname, '../integration/index.ts'),
    launchArgs = [],
    extensionTestsEnv = {},
  } = options;

  try {
    // Download VSCode if needed
    const vscodeExecutablePath = await setupVSCode(version);

    // Run the tests
    const exitCode = await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs,
      extensionTestsEnv: {
        ...process.env,
        ...extensionTestsEnv,
        // Ensure test mode is enabled
        SPECGOFER_TEST_MODE: 'true',
      },
    });

    return exitCode;
  } catch (error) {
    console.error('Failed to run VSCode tests:', error);
    return 1;
  }
}

/**
 * Creates a test runner entry point for integration tests
 * This should be called from tests/integration/index.ts
 */
export function createTestRunner(): void {
  // This will be implemented in the integration test index file
  // The pattern follows VSCode extension testing best practices
}

/**
 * Waits for VSCode extension to activate
 * @param timeout - Maximum wait time in milliseconds (default: 5000)
 */
export async function waitForExtensionActivation(timeout: number = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if extension is activated
    // This will be implemented in actual integration tests with access to vscode API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Gets a reference to the Gofer extension
 * Must be called from within a VSCode test context
 */
export async function getGoferExtension(): Promise<any> {
  // This will be implemented in integration tests with access to vscode.extensions API
  // Return type will be the extension's API
  return null;
}
