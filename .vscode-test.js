import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: ['tests/e2e/**/*.test.ts', '!tests/e2e/workflow.test.ts'],
  version: 'stable',
  workspaceFolder: './test-workspace',
  mocha: {
    ui: 'bdd',
    timeout: 20000,
    color: true
  },
  launchArgs: [
    '--disable-extensions',
    '--disable-workspace-trust'
  ]
});
