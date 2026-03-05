import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructionGenerator } from '../../../extension/src/services/InstructionGenerator';
import { ProjectInfo } from '../../../extension/src/services/ProjectDetector';
import { FileUtils } from '../../../extension/src/utils/fileUtils';
import * as path from 'path';

// Mock vscode module
vi.mock('vscode', () => ({
  extensions: {
    getExtension: vi.fn().mockReturnValue(undefined),
  },
}));

vi.mock('../../../extension/src/utils/fileUtils');

const TEMPLATES_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'extension',
  'resources',
  'instruction-templates'
);

function makeProjectInfo(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
  return {
    name: 'test-project',
    language: 'typescript',
    framework: null,
    testRunner: 'vitest',
    testCommand: 'npm test',
    buildCommand: 'npm run build',
    lintCommand: 'npm run lint',
    formatCommand: 'npm run format',
    packageManager: 'npm',
    hasTypeScript: true,
    hasEslint: true,
    hasPrettier: true,
    ...overrides,
  };
}

describe('InstructionGenerator', () => {
  let generator: InstructionGenerator;

  beforeEach(() => {
    vi.resetAllMocks();
    // Use real template files
    generator = new InstructionGenerator(TEMPLATES_PATH);

    // Mock FileUtils.readTextFile to read actual template files
    vi.mocked(FileUtils.readTextFile).mockImplementation(async (filePath: string) => {
      const fs = await import('fs/promises');
      return fs.readFile(filePath, 'utf-8');
    });
  });

  describe('generateAgentsMd()', () => {
    it('generates AGENTS.md for TypeScript project', async () => {
      const info = makeProjectInfo({
        name: 'my-app',
        framework: 'React',
      });

      const content = await generator.generateAgentsMd(info);

      expect(content).toContain('# AGENTS.md');
      expect(content).toContain('**Project**: my-app');
      expect(content).toContain('**Language**: TypeScript');
      expect(content).toContain('**Framework**: React');
      expect(content).toContain('**Build**: `npm run build`');
      expect(content).toContain('**Test**: `npm test`');
      expect(content).toContain('**Lint**: `npm run lint`');
      expect(content).toContain('strict mode');
      expect(content).toContain('Simplicity First');
      expect(content).toContain('conventional commit');
    });

    it('generates AGENTS.md for Python project', async () => {
      const info = makeProjectInfo({
        name: 'django-api',
        language: 'python',
        framework: 'Django',
        testRunner: 'pytest',
        testCommand: null,
        buildCommand: null,
        lintCommand: null,
        formatCommand: null,
        packageManager: 'poetry',
        hasTypeScript: false,
        hasEslint: false,
        hasPrettier: false,
      });

      const content = await generator.generateAgentsMd(info);

      expect(content).toContain('**Language**: Python');
      expect(content).toContain('**Framework**: Django');
      expect(content).toContain('type hints');
      expect(content).toContain('**Test Runner**: pytest');
    });

    it('generates AGENTS.md for Go project without framework', async () => {
      const info = makeProjectInfo({
        name: 'go-service',
        language: 'go',
        framework: null,
        testRunner: null,
        testCommand: null,
        buildCommand: null,
        lintCommand: null,
        formatCommand: null,
        packageManager: null,
        hasTypeScript: false,
        hasEslint: false,
        hasPrettier: false,
      });

      const content = await generator.generateAgentsMd(info);

      expect(content).toContain('**Language**: Go');
      expect(content).not.toContain('**Framework**');
      expect(content).toContain('handle errors');
    });

    it('generates AGENTS.md for unknown project with generic fragment', async () => {
      const info = makeProjectInfo({
        name: 'mystery',
        language: 'unknown',
        framework: null,
        testRunner: null,
        testCommand: null,
        buildCommand: null,
        lintCommand: null,
        formatCommand: null,
        packageManager: null,
        hasTypeScript: false,
        hasEslint: false,
        hasPrettier: false,
      });

      const content = await generator.generateAgentsMd(info);

      expect(content).toContain('**Language**: Unknown');
      expect(content).toContain('Follow existing code style');
    });

    it('includes workflow principles from example.md content', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateAgentsMd(info);

      // Verify all 6 workflow principles from example.md are present
      expect(content).toContain('Plan First');
      expect(content).toContain('Subagent');
      expect(content).toContain('Self-Improvement');
      expect(content).toContain('Verify Before Done');
      expect(content).toContain('Demand Elegance');
      expect(content).toContain('Autonomous Bug Fixing');

      // Core principles
      expect(content).toContain('Simplicity First');
      expect(content).toContain('No Laziness');
      expect(content).toContain('Minimal Impact');
    });
  });

  describe('generateClaudeMd()', () => {
    it('generates CLAUDE.md under 60 lines', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateClaudeMd(info);
      const lineCount = content.split('\n').length;

      expect(lineCount).toBeLessThan(80);
      expect(content).toContain('# CLAUDE.md');
      expect(content).toContain('@AGENTS.md');
    });

    it('includes Gofer pipeline commands', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateClaudeMd(info);

      expect(content).toContain('/0_business_scenario');
      expect(content).toContain('/5_gofer_implement');
      expect(content).toContain('/7_gofer_save');
    });

    it('includes workflow principles (brief form)', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateClaudeMd(info);

      expect(content).toContain('Plan First');
      expect(content).toContain('Verify Before Done');
    });
  });

  describe('generateCopilotMd()', () => {
    it('generates copilot-instructions.md with project overview', async () => {
      const info = makeProjectInfo({
        name: 'my-react-app',
        framework: 'React',
      });

      const content = await generator.generateCopilotMd(info);

      expect(content).toContain('# Copilot Instructions');
      expect(content).toContain('my-react-app');
      expect(content).toContain('TypeScript');
      expect(content).toContain('React');
      expect(content).toContain('Gofer');
    });

    it('includes language-specific code quality section', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateCopilotMd(info);

      expect(content).toContain('strict mode');
      expect(content).toContain('ESM imports');
    });
  });

  describe('content partitioning', () => {
    it('AGENTS.md contains behavioral guidelines, not procedural workflows', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateAgentsMd(info);

      // Should have principles, not specific Gofer pipeline commands
      expect(content).toContain('Simplicity First');
      expect(content).not.toContain('/0_business_scenario');
    });

    it('CLAUDE.md contains procedural workflows and references AGENTS.md', async () => {
      const info = makeProjectInfo();
      const content = await generator.generateClaudeMd(info);

      expect(content).toContain('@AGENTS.md');
      expect(content).toContain('/0_business_scenario');
    });
  });
});
