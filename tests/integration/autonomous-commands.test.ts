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
const mockShowError = vi.fn();
let workflowProfileValue: 'standard' | 'enterpriseai' = 'standard';
let enterpriseAiUseExternalReferences = false;
let originalFetch: typeof globalThis.fetch | undefined;

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => mockOutputChannel),
    createTerminal: vi.fn(() => mockTerminal),
    onDidCloseTerminal: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTerminalShellIntegration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidEndTerminalShellExecution: vi.fn(() => ({ dispose: vi.fn() })),
    showInformationMessage: mockShowInfo,
    showWarningMessage: vi.fn(),
    showErrorMessage: mockShowError,
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'autonomousMode') return false;
        if (key === 'anthropicApiKey') return '';
        if (key === 'workflowProfile') return workflowProfileValue;
        if (key === 'enterpriseAiUseExternalReferences') return enterpriseAiUseExternalReferences;
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

describe('Autonomous command routing integration', () => {
  let workspacePath: string;
  let moduleUnderTest: typeof import('../../extension/src/autonomousCommands');

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    workflowProfileValue = 'standard';
    enterpriseAiUseExternalReferences = false;
    originalFetch = globalThis.fetch;

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
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      Reflect.deleteProperty(globalThis, 'fetch');
    }
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
    const loadSkillSpy = vi.fn(() => Promise.resolve('mock skill content'));

    const mockRouter = {
      routeCommand: routeSpy,
      loadSkillForPlatform: loadSkillSpy,
      getCommandSyntax: syntaxSpy,
    };

    moduleUnderTest.setSharedCrossPlatformCommandRouter(
      mockRouter as unknown as import('../../extension/src/council/CrossPlatformCommandRouter').CrossPlatformCommandRouter
    );

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(routeSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude', 'standard');
    expect(loadSkillSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude', 'standard');
    expect(syntaxSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude');
    expect(mockSendText).toHaveBeenCalledWith('claude');
    expect(mockSendText).toHaveBeenCalledWith('/5_gofer_implement');
  });

  it('routes initial command using the real CrossPlatformCommandRouter implementation', async () => {
    const { CrossPlatformCommandRouter } =
      await import('../../extension/src/council/CrossPlatformCommandRouter');
    const router = new CrossPlatformCommandRouter(process.cwd());
    moduleUnderTest.setSharedCrossPlatformCommandRouter(router);

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(mockSendText).toHaveBeenCalledWith('claude');
    expect(mockSendText).toHaveBeenCalledWith('/5_gofer_implement');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('runs EnterpriseAI reference preflight before routed execution', async () => {
    workflowProfileValue = 'enterpriseai';
    createFallbackReferenceFiles(workspacePath);

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
    const loadSkillSpy = vi.fn(() => Promise.resolve('mock skill content'));

    const mockRouter = {
      routeCommand: routeSpy,
      loadSkillForPlatform: loadSkillSpy,
      getCommandSyntax: syntaxSpy,
    };

    moduleUnderTest.setSharedCrossPlatformCommandRouter(
      mockRouter as unknown as import('../../extension/src/council/CrossPlatformCommandRouter').CrossPlatformCommandRouter
    );

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(routeSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude', 'enterpriseai');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('uses external EnterpriseAI references when external mode is enabled', async () => {
    workflowProfileValue = 'enterpriseai';
    enterpriseAiUseExternalReferences = true;
    createFallbackReferenceFiles(workspacePath);
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200 }) as unknown) as typeof fetch;

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
    const loadSkillSpy = vi.fn(() => Promise.resolve('mock skill content'));

    const mockRouter = {
      routeCommand: routeSpy,
      loadSkillForPlatform: loadSkillSpy,
      getCommandSyntax: syntaxSpy,
    };

    moduleUnderTest.setSharedCrossPlatformCommandRouter(
      mockRouter as unknown as import('../../extension/src/council/CrossPlatformCommandRouter').CrossPlatformCommandRouter
    );

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(routeSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude', 'enterpriseai');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('falls back to local references when external EnterpriseAI references are unreachable', async () => {
    workflowProfileValue = 'enterpriseai';
    enterpriseAiUseExternalReferences = true;
    createFallbackReferenceFiles(workspacePath);
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network unavailable');
    }) as typeof fetch;

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
    const loadSkillSpy = vi.fn(() => Promise.resolve('mock skill content'));

    const mockRouter = {
      routeCommand: routeSpy,
      loadSkillForPlatform: loadSkillSpy,
      getCommandSyntax: syntaxSpy,
    };

    moduleUnderTest.setSharedCrossPlatformCommandRouter(
      mockRouter as unknown as import('../../extension/src/council/CrossPlatformCommandRouter').CrossPlatformCommandRouter
    );

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(routeSpy).toHaveBeenCalledWith('5_gofer_implement', 'claude', 'enterpriseai');
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('shows an error and skips routing when EnterpriseAI fallback references are missing', async () => {
    workflowProfileValue = 'enterpriseai';

    const routeSpy = vi.fn();
    const loadSkillSpy = vi.fn(() => Promise.resolve('mock skill content'));
    const syntaxSpy = vi.fn(() => '/5_gofer_implement');
    const mockRouter = {
      routeCommand: routeSpy,
      loadSkillForPlatform: loadSkillSpy,
      getCommandSyntax: syntaxSpy,
    };

    moduleUnderTest.setSharedCrossPlatformCommandRouter(
      mockRouter as unknown as import('../../extension/src/council/CrossPlatformCommandRouter').CrossPlatformCommandRouter
    );

    await moduleUnderTest.launchClaudeCode('feature-123');

    expect(routeSpy).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });

  function createFallbackReferenceFiles(rootPath: string): void {
    const fallbackDir = path.join(rootPath, '.specify', 'references', 'eai');
    fs.mkdirSync(fallbackDir, { recursive: true });
    fs.writeFileSync(path.join(fallbackDir, 'eai-cli.md'), '# EAI CLI');
    fs.writeFileSync(path.join(fallbackDir, 'vertical-template.md'), '# Vertical Template');
    fs.writeFileSync(path.join(fallbackDir, 'deployment-repo.md'), '# Deployment Repo');
  }
});
