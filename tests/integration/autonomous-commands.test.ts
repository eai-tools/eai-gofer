import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockSendText = vi.fn();
const mockTerminal = {
  sendText: mockSendText,
  show: vi.fn(),
  dispose: vi.fn(),
};
const mockOutputChannel = {
  appendLine: vi.fn(),
  clear: vi.fn(),
  show: vi.fn(),
  dispose: vi.fn(),
};
const mockExecuteCommand = vi.fn();
const mockShowInfo = vi.fn(() => Promise.resolve(undefined));

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => mockOutputChannel),
    createTerminal: vi.fn(() => mockTerminal),
    onDidCloseTerminal: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTerminalShellIntegration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidEndTerminalShellExecution: vi.fn(() => ({ dispose: vi.fn() })),
    showInformationMessage: mockShowInfo,
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'autonomousMode') return false;
        if (key === 'anthropicApiKey') return '';
        return defaultValue;
      }),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    })),
  },
  env: {
    isTelemetryEnabled: false,
  },
  commands: {
    executeCommand: mockExecuteCommand,
  },
}));

describe('Autonomous command routing integration (T047)', () => {
  let workspacePath: string;
  let moduleUnderTest: typeof import('../../extension/src/autonomousCommands');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-auto-routing-'));

    fs.mkdirSync(path.join(workspacePath, '.specify', 'specs', 'feature-123'), { recursive: true });
    fs.writeFileSync(
      path.join(workspacePath, '.specify', 'specs', 'feature-123', 'tasks.md'),
      `---
status: approved
---

# Tasks`
    );

    const vscode = await import('vscode');
    vi.mocked(vscode.workspace).workspaceFolders = [
      { uri: { fsPath: workspacePath }, name: 'tmp', index: 0 },
    ] as unknown as typeof vscode.workspace.workspaceFolders;

    moduleUnderTest = await import('../../extension/src/autonomousCommands');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(workspacePath, { recursive: true, force: true });
  });

  it('routes initial command through CrossPlatformCommandRouter before execution', async () => {
    const routeSpy = vi.fn(() => ({
      commandName: '5_gofer_implement',
      platform: 'claude',
      filePath: path.join(workspacePath, '.claude', 'commands', '5_gofer_implement.md'),
      metadata: {
        name: '5_gofer_implement',
        description: 'implement',
        platform: 'claude',
        filePath: '',
        frontmatter: {},
        content: '',
        supportsAutoChain: true,
        supportsParallelAgents: false,
        invocationSyntax: {
          platform: 'claude',
          prefix: '/',
          example: '/5_gofer_implement',
          pattern: '^/5_gofer_implement$',
          supportsArguments: true,
        },
        extractedAt: new Date(),
      },
      syntax: '/5_gofer_implement',
      isAvailable: true,
    }));
    const syntaxSpy = vi.fn(() => '/5_gofer_implement');

    const mockRouter = {
      routeCommand: routeSpy,
      getCommandSyntax: syntaxSpy,
    };

    moduleUnderTest.setSharedCrossPlatformCommandRouter(
      mockRouter as unknown as import('../../extension/src/council/CrossPlatformCommandRouter').CrossPlatformCommandRouter
    );

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(routeSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude');
    expect(syntaxSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude');
    expect(mockSendText).toHaveBeenCalledWith('claude');
    expect(mockSendText).toHaveBeenCalledWith('/5_gofer_implement');
  });
});
