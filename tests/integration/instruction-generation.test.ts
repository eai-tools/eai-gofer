/**
 * Integration Test: Instruction Generation Re-Detection
 *
 * Verifies that when project manifest files change (e.g., adding tsconfig.json),
 * re-running ProjectDetector and InstructionGenerator produces updated content
 * reflecting the new project characteristics.
 *
 * This test uses real file I/O (no mocked FileUtils) to exercise the full
 * detection and generation pipeline on actual temp directories.
 *
 * Closes T035b test gap from 010-addclaudeinstructions validation.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';

// Unmock FileUtils for this integration test -- we need real file system access
vi.unmock('../../../extension/src/utils/fileUtils');

// Dynamically import after unmocking
const { ProjectDetector } = await import('../../extension/src/services/ProjectDetector');
const { InstructionGenerator } = await import('../../extension/src/services/InstructionGenerator');

const TEMPLATES_PATH = path.join(
  __dirname,
  '..',
  '..',
  'extension',
  'resources',
  'instruction-templates'
);

describe('Instruction Generation Re-Detection (Integration)', () => {
  let workspace: string;

  afterEach(async () => {
    if (workspace) {
      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('re-detects language from JavaScript to TypeScript when tsconfig.json is added', async () => {
    // Setup: create temp workspace with package.json only (JavaScript project)
    workspace = fsSync.mkdtempSync(path.join(os.tmpdir(), 'gofer-integ-'));
    await fs.writeFile(
      path.join(workspace, 'package.json'),
      JSON.stringify({ name: 'test-js-project', scripts: { test: 'vitest' } }),
      'utf-8'
    );

    const generator = new InstructionGenerator(TEMPLATES_PATH);

    // First detection: should be JavaScript
    const infoJs = await ProjectDetector.detect(workspace);
    expect(infoJs.language).toBe('javascript');

    const agentsMdJs = await generator.generateAgentsMd(infoJs);
    expect(agentsMdJs).toContain('JavaScript');

    // Add tsconfig.json to workspace
    await fs.writeFile(
      path.join(workspace, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'es2020' } }),
      'utf-8'
    );

    // Re-detection: should now be TypeScript
    const infoTs = await ProjectDetector.detect(workspace);
    expect(infoTs.language).toBe('typescript');
    expect(infoTs.hasTypeScript).toBe(true);

    const agentsMdTs = await generator.generateAgentsMd(infoTs);
    expect(agentsMdTs).toContain('TypeScript');
  });
});
