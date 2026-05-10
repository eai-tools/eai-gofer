/**
 * Integration Test Runner for VSCode Extension Tests
 *
 * This file serves as the entry point for integration tests that run
 * in a real VSCode instance using @vscode/test-electron.
 *
 * Following VSCode extension testing best practices from:
 * https://code.visualstudio.com/api/working-with-extensions/testing-extension
 */

import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  // Create the mocha test runner
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: 10000, // 10 second timeout for integration tests
  });

  const testsRoot = __dirname;

  try {
    // Find all integration test files
    const files = await glob('**/*.integration.test.js', { cwd: testsRoot });

    // Add files to the test suite
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    // Run the mocha test suite
    return new Promise((resolve, reject) => {
      mocha.run(failures => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Error loading integration tests:', error);
    throw error;
  }
}
