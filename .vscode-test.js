import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: [
    'extension/out/test/suite/**/*.test.js',
    'extension/out/test/suite/**/*.integration.test.js',
  ],
  extensionDevelopmentPath: './extension',
  version: 'stable',
  workspaceFolder: './extension/test-workspace',
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
