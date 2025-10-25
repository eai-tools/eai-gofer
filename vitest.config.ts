import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts'
    ],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
      'dist/**',
      'extension/**',
      'language-server/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.ts'
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
        'src/index.ts'
      ],
      all: true,
      skipFull: false,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@extension': path.resolve(__dirname, './extension/src'),
      '@language-server': path.resolve(__dirname, './language-server/src'),
    },
  },
});
