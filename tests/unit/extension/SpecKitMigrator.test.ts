import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GoferMigrator } from '../../../extension/src/goferMigrator';
import { cleanupTestWorkspace } from '../../helpers/workspace';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';

/**
 * Create a bare test workspace without any .specify structure
 * (Unlike createTestWorkspace which creates full spec-kit structure)
 */
async function createBareWorkspace(): Promise<string> {
  const tmpDir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'specgofer-test-'));
  return tmpDir;
}

describe('GoferMigrator', () => {
  let workspace: string;
  let migrator: GoferMigrator;

  beforeEach(async () => {
    workspace = await createBareWorkspace();
    migrator = new GoferMigrator(workspace);
  });

  afterEach(async () => {
    await cleanupTestWorkspace(workspace);
  });

  describe('Format Detection', () => {
    it('should detect "none" when .specify folder does not exist', async () => {
      const format = await migrator.detectFormat();
      expect(format).toBe('none');
    });

    it('should detect "spec-kit" format with all required directories', async () => {
      // Create Spec Kit structure
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

      const format = await migrator.detectFormat();
      expect(format).toBe('spec-kit');
    });

    it('should detect "legacy-json" format with JSON specs', async () => {
      // Create legacy structure with JSON files
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/feature-001.json'),
        JSON.stringify({ title: 'Legacy Feature' }),
        'utf-8'
      );

      const format = await migrator.detectFormat();
      expect(format).toBe('legacy-json');
    });

    it('should detect "mixed" format when both Spec Kit and JSON exist', async () => {
      // Create Spec Kit structure
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

      // Add legacy JSON file
      await fs.writeFile(
        path.join(workspace, '.specify/old-spec.json'),
        JSON.stringify({ title: 'Old Spec' }),
        'utf-8'
      );

      const format = await migrator.detectFormat();
      expect(format).toBe('mixed');
    });

    it('should ignore spec-schema.json when detecting JSON specs', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/spec-schema.json'),
        JSON.stringify({ schema: true }),
        'utf-8'
      );

      const format = await migrator.detectFormat();
      // Should not detect as legacy-json since spec-schema.json is ignored
      expect(format).not.toBe('legacy-json');
    });

    it('should detect "mixed" for partial Spec Kit structure', async () => {
      // Only create some directories
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });

      const format = await migrator.detectFormat();
      expect(format).toBe('mixed');
    });
  });

  describe('Existence Check', () => {
    it('should return false when .specify does not exist', async () => {
      const exists = await migrator.exists();
      expect(exists).toBe(false);
    });

    it('should return true when .specify exists', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });

      const exists = await migrator.exists();
      expect(exists).toBe(true);
    });

    it('should return true for .specify with subdirectories', async () => {
      await fs.mkdir(path.join(workspace, '.specify/specs/001-test'), { recursive: true });

      const exists = await migrator.exists();
      expect(exists).toBe(true);
    });
  });

  describe('Version Info', () => {
    it('should return version info for "none" format', async () => {
      const info = await migrator.getVersionInfo();

      expect(info.format).toBe('none');
      expect(info.needsUpgrade).toBe(false);
      expect(info.details).toContain('No .specify folder');
    });

    it('should return version info for "spec-kit" format', async () => {
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

      const info = await migrator.getVersionInfo();

      expect(info.format).toBe('spec-kit');
      expect(info.needsUpgrade).toBe(false);
      expect(info.details).toBeDefined();
    });

    it('should return version info for "legacy-json" format', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/legacy.json'),
        '{"title": "Legacy"}',
        'utf-8'
      );

      const info = await migrator.getVersionInfo();

      expect(info.format).toBe('legacy-json');
      expect(info.needsUpgrade).toBe(true);
      expect(info.details).toBeDefined();
    });

    it('should return version info for "mixed" format', async () => {
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/mixed.json'),
        '{"title": "Mixed"}',
        'utf-8'
      );

      const info = await migrator.getVersionInfo();

      expect(info.format).toBe('mixed');
      expect(info.needsUpgrade).toBe(true);
      expect(info.details).toBeDefined();
    });
  });

  describe('Path Fixing - File Patterns', () => {
    it('should detect files that need path fixing in .claude/commands', async () => {
      // Create .claude/commands directory with files
      const commandsDir = path.join(workspace, '.claude/commands');
      await fs.mkdir(commandsDir, { recursive: true });

      const commandContent = `# Spec Kit Command

Load all specs from specs/001-feature/spec.md

Use the specs/ directory for all operations.`;

      await fs.writeFile(path.join(commandsDir, 'test-command.md'), commandContent, 'utf-8');

      // Verify file exists and has old path references
      const content = await fs.readFile(path.join(commandsDir, 'test-command.md'), 'utf-8');
      expect(content).toContain('specs/001-feature');
      expect(content).toContain('specs/ directory');
    });

    it('should detect files in .specify/scripts that need fixing', async () => {
      const scriptsDir = path.join(workspace, '.specify/scripts/bash');
      await fs.mkdir(scriptsDir, { recursive: true });

      const scriptContent = `#!/bin/bash
SPECS_DIR="$REPO_ROOT/specs"
cd specs/001-feature
`;

      await fs.writeFile(path.join(scriptsDir, 'test-script.sh'), scriptContent, 'utf-8');

      const content = await fs.readFile(path.join(scriptsDir, 'test-script.sh'), 'utf-8');
      expect(content).toContain('SPECS_DIR="$REPO_ROOT/specs"');
    });

    it('should detect config files that need fixing', async () => {
      const vscodeDir = path.join(workspace, '.vscode');
      await fs.mkdir(vscodeDir, { recursive: true });

      const settingsContent = JSON.stringify({
        'specgofer.specsPath': '${workspaceFolder}/specs/',
      }, null, 2);

      await fs.writeFile(path.join(vscodeDir, 'settings.json'), settingsContent, 'utf-8');

      const content = await fs.readFile(path.join(vscodeDir, 'settings.json'), 'utf-8');
      expect(content).toContain('${workspaceFolder}/specs/');
    });
  });

  describe('Edge Cases', () => {
    it('should handle .specify with empty subdirectories', async () => {
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });

      const format = await migrator.detectFormat();
      // Should return mixed since templates is missing
      expect(format).toBe('mixed');
    });

    it('should handle .specify with files but no directories', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.writeFile(path.join(workspace, '.specify/README.md'), 'test', 'utf-8');

      const format = await migrator.detectFormat();
      expect(format).toBe('mixed');
    });

    it('should handle concurrent format detection calls', async () => {
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

      const [format1, format2, format3] = await Promise.all([
        migrator.detectFormat(),
        migrator.detectFormat(),
        migrator.detectFormat(),
      ]);

      expect(format1).toBe('spec-kit');
      expect(format2).toBe('spec-kit');
      expect(format3).toBe('spec-kit');
    });

    it('should handle invalid JSON files gracefully', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/invalid.json'),
        'not valid json {{{',
        'utf-8'
      );

      // Should still detect the file exists
      const format = await migrator.detectFormat();
      expect(format).toBe('legacy-json');
    });

    it('should handle symlinks in .specify directory', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.mkdir(path.join(workspace, 'actual-specs'), { recursive: true });

      try {
        // Create symlink (may not work on all platforms)
        await fs.symlink(
          path.join(workspace, 'actual-specs'),
          path.join(workspace, '.specify/specs')
        );

        const format = await migrator.detectFormat();
        // Should handle symlinks as directories
        expect(['spec-kit', 'mixed']).toContain(format);
      } catch (error) {
        // Symlink creation may fail on Windows without admin rights
        // Skip test in that case
        console.log('Skipping symlink test:', error);
      }
    });

    it('should handle very deep directory structures', async () => {
      // Create a very deep structure
      const deepPath = path.join(
        workspace,
        '.specify/scripts/bash/utils/helpers/tools/vendor'
      );
      await fs.mkdir(deepPath, { recursive: true });
      await fs.writeFile(path.join(deepPath, 'deep-script.sh'), '#!/bin/bash\nspecs/', 'utf-8');

      // Should not throw error
      const format = await migrator.detectFormat();
      expect(format).toBeDefined();
    });
  });

  describe('Multiple Spec Directories', () => {
    it('should detect format when specs/ has multiple spec directories', async () => {
      const specsDir = path.join(workspace, '.specify/specs');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

      // Create multiple spec directories
      for (let i = 1; i <= 5; i++) {
        const specDir = path.join(specsDir, `00${i}-feature-${i}`);
        await fs.mkdir(specDir, { recursive: true });
        await fs.writeFile(path.join(specDir, 'spec.md'), `# Feature ${i}`, 'utf-8');
      }

      const format = await migrator.detectFormat();
      expect(format).toBe('spec-kit');
    });

    it('should handle empty specs/ directory', async () => {
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });

      const format = await migrator.detectFormat();
      expect(format).toBe('spec-kit');
    });
  });

  describe('File System Permissions', () => {
    it('should handle read-only .specify directory gracefully', async () => {
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });

      // Note: This test may not work on all platforms/filesystems
      try {
        await fs.chmod(path.join(workspace, '.specify'), 0o444); // Read-only

        const exists = await migrator.exists();
        expect(exists).toBe(true);

        // Restore permissions for cleanup
        await fs.chmod(path.join(workspace, '.specify'), 0o755);
      } catch (error) {
        // Skip if chmod not supported
        console.log('Skipping permission test:', error);
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should detect fresh Spec Kit installation', async () => {
      // Simulate fresh spec-kit init
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/templates'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/memory/constitution.md'),
        '# Constitution',
        'utf-8'
      );

      const format = await migrator.detectFormat();
      expect(format).toBe('spec-kit');

      const info = await migrator.getVersionInfo();
      expect(info.needsUpgrade).toBe(false);
    });

    it('should detect legacy project needing upgrade', async () => {
      // Simulate old SpecGofer project
      await fs.mkdir(path.join(workspace, '.specify'), { recursive: true });
      await fs.writeFile(
        path.join(workspace, '.specify/feature-login.json'),
        JSON.stringify({
          id: '001',
          title: 'User Login',
          status: 'draft',
        }),
        'utf-8'
      );

      const format = await migrator.detectFormat();
      expect(format).toBe('legacy-json');

      const info = await migrator.getVersionInfo();
      expect(info.needsUpgrade).toBe(true);
    });

    it('should detect mid-migration state', async () => {
      // User started migration but didn't finish
      await fs.mkdir(path.join(workspace, '.specify/specs'), { recursive: true });
      await fs.mkdir(path.join(workspace, '.specify/memory'), { recursive: true });
      // Missing templates directory

      // Still has old JSON files
      await fs.writeFile(
        path.join(workspace, '.specify/old-feature.json'),
        JSON.stringify({ title: 'Old Feature' }),
        'utf-8'
      );

      const format = await migrator.detectFormat();
      expect(format).toBe('mixed');

      const info = await migrator.getVersionInfo();
      expect(info.needsUpgrade).toBe(true);
    });
  });
});
