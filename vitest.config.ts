import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
    ],
    exclude: [
      'tests/e2e/**',
      'tests/manual/**',
      'tests/integration/council/**',
      'tests/integration/claude-api-flow.test.ts',
      'tests/integration/TerminalLifecycle.test.ts',
      'tests/integration/spec-loading-flow.test.ts',
      'tests/integration/orchestrator.test.ts',
      'tests/integration/lsp-mcp/**',
      'tests/integration/autonomous/AIUsageAutoDiscovery.integration.test.ts',
      'node_modules/**',
      'dist/**',
      'extension/**',
      'language-server/**',
      'src/**/*.test.ts', // Exclude VSCode extension tests (use VSCode test runner)
      // Exclude WIP feature tests that import non-existent modules or cause NODE_MODULE_VERSION errors
      'tests/unit/autonomous/CodexUsageAdapter.test.ts',
      'tests/unit/autonomous/ClaudeCodeUsageAdapter.test.ts',
      'tests/unit/autonomous/observation-tracking.test.ts',
      'tests/unit/autonomousCommands.test.ts',
      'tests/unit/autonomous/acc-integration.test.ts',
      'tests/unit/autonomous/contextbuilder-wiring.test.ts',
      'tests/unit/exponentialBackoff.test.ts',
    ],
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results/vitest-results.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.ts',
        'extension/src/**/*.ts',
        'language-server/src/**/*.ts'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/tests/**',
        '**/*.config.ts',
        '**/*.config.js',
        'src/types.ts',
        'src/index.ts',
        'extension/src/test/**',
        'language-server/src/test/**'
      ],
      all: true,
      skipFull: false,
      perFile: true,
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    retry: 2
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@extension': path.resolve(__dirname, './extension/src'),
      '@language-server': path.resolve(__dirname, './language-server/src'),
    },
  },
  server: {
    deps: {
      inline: ['@anthropic-ai/sdk', '@google/generative-ai'],
    },
  },
});
