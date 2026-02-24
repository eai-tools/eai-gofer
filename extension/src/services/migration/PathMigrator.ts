/**
 * Path Migrator Service
 *
 * Handles path migrations during upgrades (specs/ → .specify/specs/).
 * Extracted from goferMigrator.ts (2499 LOC → focused service).
 *
 * Engineering Remediation Phase 4 - T029
 */

import { injectable } from 'tsyringe';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../Logger';

/**
 * Path Migrator Service
 *
 * Responsible for migrating path references from legacy formats to Gofer format.
 * Updates references in scripts, commands, and configuration files.
 */
@injectable()
export class PathMigrator {
  private workspacePath: string = '';
  private specifyPath: string = '';

  constructor(private readonly logger: Logger) {}

  /**
   * Initialize with workspace paths
   */
  public setWorkspacePath(workspacePath: string): void {
    this.workspacePath = workspacePath;
    this.specifyPath = path.join(workspacePath, '.specify');
  }

  /**
   * Migrate path references from specs/ to .specify/specs/
   *
   * Updates path references in:
   * - Claude commands (.claude/commands/)
   * - Scripts (.specify/scripts/)
   * - VSCode settings (.vscode/settings.json)
   * - Other configuration files
   */
  public async migratePaths(): Promise<void> {
    try {
      this.logger.info('PathMigrator', 'Starting path migration');

      const filesToFix = await this.findFilesToFix();
      this.logger.debug('PathMigrator', `Found ${filesToFix.length} files to check`);

      let fixedCount = 0;
      for (const filePath of filesToFix) {
        const wasFixed = await this.fixPathReferences(filePath);
        if (wasFixed) {
          fixedCount++;
        }
      }

      if (fixedCount > 0) {
        this.logger.info('PathMigrator', `Fixed path references in ${fixedCount} files`);
      } else {
        this.logger.debug('PathMigrator', 'No files needed path updates');
      }
    } catch (error) {
      this.logger.error('PathMigrator', error as Error, { operation: 'migratePaths' });
      // Don't throw - this is not critical
    }
  }

  /**
   * Find all files that may need path reference updates
   */
  private async findFilesToFix(): Promise<string[]> {
    const filesToFix: string[] = [];

    // Check .claude/commands/ for command files
    await this.findCommandFiles(filesToFix);

    // Check .specify/scripts/ for bash scripts
    await this.findScriptFiles(filesToFix);

    // Check configuration files
    await this.findConfigFiles(filesToFix);

    return filesToFix;
  }

  /**
   * Find Claude command files that may need updating
   */
  private async findCommandFiles(filesToFix: string[]): Promise<void> {
    const claudeCommandsDir = path.join(this.workspacePath, '.claude', 'commands');
    try {
      const files = await fs.readdir(claudeCommandsDir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          filesToFix.push(path.join(claudeCommandsDir, file));
        }
      }
      this.logger.debug('PathMigrator', `Found ${files.length} command files`);
    } catch {
      // .claude/commands doesn't exist
      this.logger.debug('PathMigrator', 'No .claude/commands directory found');
    }
  }

  /**
   * Find script files that may need updating
   */
  private async findScriptFiles(filesToFix: string[]): Promise<void> {
    const scriptsDir = path.join(this.specifyPath, 'scripts');
    try {
      await this.findScriptsRecursively(scriptsDir, filesToFix);
      this.logger.debug('PathMigrator', 'Searched scripts directory');
    } catch {
      // Scripts directory doesn't exist
      this.logger.debug('PathMigrator', 'No scripts directory found');
    }
  }

  /**
   * Recursively find script files in a directory
   */
  private async findScriptsRecursively(dir: string, filesToFix: string[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.findScriptsRecursively(fullPath, filesToFix);
      } else if (entry.name.endsWith('.sh') || entry.name.endsWith('.md')) {
        filesToFix.push(fullPath);
      }
    }
  }

  /**
   * Find configuration files that may need updating
   */
  private async findConfigFiles(filesToFix: string[]): Promise<void> {
    const configFiles = [
      path.join(this.workspacePath, '.vscode', 'settings.json'),
      path.join(this.workspacePath, '.copilot', 'config.json'),
      path.join(this.workspacePath, '.github', 'copilot-instructions.md'),
    ];

    for (const configFile of configFiles) {
      try {
        await fs.access(configFile);
        filesToFix.push(configFile);
      } catch {
        // File doesn't exist
      }
    }

    this.logger.debug('PathMigrator', 'Checked configuration files');
  }

  /**
   * Fix path references in a single file
   * @returns true if the file was modified
   */
  private async fixPathReferences(filePath: string): Promise<boolean> {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const originalContent = content;

      // Replace various forms of specs/ path references
      content = this.replacePathReferences(content);

      if (content !== originalContent) {
        await fs.writeFile(filePath, content);
        this.logger.debug('PathMigrator', `Updated: ${path.relative(this.workspacePath, filePath)}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('PathMigrator', error as Error, {
        operation: 'fixPathReferences',
        file: filePath,
      });
      return false;
    }
  }

  /**
   * Replace all path references in content
   */
  private replacePathReferences(content: string): string {
    // Replace specs/ with .specify/specs/ (with negative lookbehind to avoid double replacement)
    content = content.replace(/(?<!\.specify\/)specs\//g, '.specify/specs/');

    // Replace ${workspaceFolder}/specs/ with ${workspaceFolder}/.specify/specs/
    content = content.replace(
      /\$\{workspaceFolder\}\/specs\//g,
      '${workspaceFolder}/.specify/specs/'
    );

    // Fix variable assignments: SPECS_DIR="$REPO_ROOT/specs" → SPECS_DIR="$REPO_ROOT/.specify/specs"
    content = content.replace(
      /SPECS_DIR="\$REPO_ROOT\/specs"/g,
      'SPECS_DIR="$REPO_ROOT/.specify/specs"'
    );

    // Fix without quotes
    content = content.replace(
      /SPECS_DIR=\$REPO_ROOT\/specs\b/g,
      'SPECS_DIR=$REPO_ROOT/.specify/specs'
    );

    // Fix other variable patterns
    content = content.replace(
      /SPECS_DIR="\$\{REPO_ROOT\}\/specs"/g,
      'SPECS_DIR="${REPO_ROOT}/.specify/specs"'
    );

    content = content.replace(
      /specs_dir="\$repo_root\/specs"/g,
      'specs_dir="$repo_root/.specify/specs"'
    );

    // Fix paths in find/cd/ls commands: "specs" at end of path
    content = content.replace(/"\$REPO_ROOT\/specs"/g, '"$REPO_ROOT/.specify/specs"');
    content = content.replace(/'\$REPO_ROOT\/specs'/g, "'$REPO_ROOT/.specify/specs'");

    // Fix concatenated paths without variable: /path/to/specs → /path/to/.specify/specs
    content = content.replace(/(['"]\$[A-Z_]+)\/specs(['"])/g, '$1/.specify/specs$2');

    return content;
  }

  /**
   * Verify that path migration was successful
   *
   * Checks if any files still contain legacy path references
   * @returns true if all paths have been migrated
   */
  public async verifyMigration(): Promise<boolean> {
    try {
      this.logger.info('PathMigrator', 'Verifying path migration');

      const filesToCheck = await this.findFilesToFix();
      let legacyReferencesFound = 0;

      for (const filePath of filesToCheck) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');

          // Check for legacy patterns (simplified check)
          const hasLegacyReferences =
            content.includes('specs/') && !content.includes('.specify/specs/');

          if (hasLegacyReferences) {
            legacyReferencesFound++;
            this.logger.warn('PathMigrator', `Legacy references found in ${path.relative(this.workspacePath, filePath)}`);
          }
        } catch (error) {
          this.logger.error('PathMigrator', error as Error, {
            operation: 'verifyMigration',
            file: filePath,
          });
        }
      }

      if (legacyReferencesFound > 0) {
        this.logger.warn('PathMigrator', `Found ${legacyReferencesFound} files with legacy references`);
        return false;
      }

      this.logger.info('PathMigrator', 'Path migration verified successfully');
      return true;
    } catch (error) {
      this.logger.error('PathMigrator', error as Error, { operation: 'verifyMigration' });
      return false;
    }
  }

  /**
   * Rollback path migration (revert .specify/specs/ back to specs/)
   *
   * This is useful if migration fails or needs to be undone.
   * Should be used with caution as it modifies many files.
   */
  public async rollbackMigration(): Promise<void> {
    try {
      this.logger.warn('PathMigrator', 'Rolling back path migration');

      const filesToFix = await this.findFilesToFix();
      let rolledBackCount = 0;

      for (const filePath of filesToFix) {
        try {
          let content = await fs.readFile(filePath, 'utf-8');
          const originalContent = content;

          // Reverse the migration: .specify/specs/ → specs/
          content = content.replace(/\.specify\/specs\//g, 'specs/');
          content = content.replace(
            /\$\{workspaceFolder\}\/\.specify\/specs\//g,
            '${workspaceFolder}/specs/'
          );

          // Reverse variable assignments
          content = content.replace(
            /SPECS_DIR="\$REPO_ROOT\/\.specify\/specs"/g,
            'SPECS_DIR="$REPO_ROOT/specs"'
          );

          if (content !== originalContent) {
            await fs.writeFile(filePath, content);
            rolledBackCount++;
            this.logger.debug('PathMigrator', `Rolled back: ${path.relative(this.workspacePath, filePath)}`);
          }
        } catch (error) {
          this.logger.error('PathMigrator', error as Error, {
            operation: 'rollbackMigration',
            file: filePath,
          });
        }
      }

      this.logger.warn('PathMigrator', `Rolled back path migration in ${rolledBackCount} files`);
    } catch (error) {
      this.logger.error('PathMigrator', error as Error, { operation: 'rollbackMigration' });
    }
  }
}
