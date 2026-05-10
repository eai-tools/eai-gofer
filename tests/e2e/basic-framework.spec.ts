import { test, expect } from '@playwright/test';

/**
 * Basic E2E Test - Verification that Playwright E2E framework is working
 */

test.describe('Gofer E2E Framework', () => {
  test('E2E test framework is operational', async () => {
    // Basic functionality test
    expect(true).toBe(true);
    expect(typeof test).toBe('function');
    expect(typeof expect).toBe('function');
  });

  test('Node.js environment is accessible', async () => {
    // Test Node.js APIs are available (NODE_ENV may not be set in CI)
    expect(typeof process.env).toBe('object');
    expect(typeof process.version).toBe('string');
  });

  test('file system operations work', async () => {
    const { promises: fs } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');
    
    // Create temporary file for testing
    const testFile = join(tmpdir(), 'gofer-e2e-test.txt');
    const testContent = 'E2E framework test';
    
    await fs.writeFile(testFile, testContent);
    const content = await fs.readFile(testFile, 'utf-8');
    
    expect(content).toBe(testContent);
    
    // Cleanup
    await fs.unlink(testFile);
  });

  test('dynamic imports work', async () => {
    // Test that we can dynamically import modules
    const pathModule = await import('path');
    expect(typeof pathModule.join).toBe('function');
    
    const fsModule = await import('fs');
    expect(typeof fsModule.promises.readFile).toBe('function');
  });
});