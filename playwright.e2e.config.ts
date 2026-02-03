import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 
 * Configures Playwright for Gofer E2E testing including:
 * - VSCode Extension tests
 * - Language Server tests  
 * - Integration tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Test timeout
  timeout: 60000,
  
  // Test execution settings
  fullyParallel: false, // Sequential execution for E2E tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  
  // Global test settings
  use: {
    // Action timeout
    actionTimeout: 10000,
    
    // Video and screenshot settings
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    // Test trace
    trace: 'retain-on-failure',
  },

  // Test projects - organize tests by component
  projects: [
    {
      name: 'extension',
      testDir: './tests/e2e/extension',
      use: {
        // Extension-specific settings
      },
    },
    {
      name: 'language-server',
      testDir: './tests/e2e/language-server',
      use: {
        // Language server specific settings
      },
    },
    {
      name: 'integration',
      testDir: './tests/e2e/integration',
      use: {
        // Integration test settings
      },
    },
  ],

  // Global setup and teardown
  // globalSetup: './tests/helpers/setup.ts',
  
  // Output directory
  outputDir: 'test-results/e2e-artifacts',
});