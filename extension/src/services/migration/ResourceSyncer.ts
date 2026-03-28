/**
 * Resource Syncer Service
 *
 * Manages resource synchronization during upgrades and migrations.
 * Extracted from goferMigrator.ts (2499 LOC → focused service).
 *
 * Engineering Remediation Phase 4 - T028
 */

import { injectable } from 'tsyringe';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../Logger';
import { FileUtils } from '../../utils/fileUtils';
import { IResourceOperations } from './UpgradeService';
import * as yaml from 'yaml';

/**
 * Resource Syncer Service
 *
 * Responsible for syncing resources from the extension bundle to the workspace:
 * - Templates, scripts, commands, agents
 * - Configuration files
 * - Documentation
 *
 * This service implements IResourceOperations interface.
 */
@injectable()
export class ResourceSyncer implements IResourceOperations {
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
   * Get extension path with fallbacks
   */
  private getExtensionPath(): string {
    let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;

    // Fallback: derive from __dirname (dist/extension.js -> extension root)
    if (!extensionPath) {
      extensionPath = path.resolve(__dirname, '..');
      this.logger.debug('ResourceSyncer', 'Using __dirname fallback', { extensionPath });
    }

    return extensionPath || '';
  }

  /**
   * Copy bundled resources from extension to workspace
   */
  private async copyBundledResources(
    resourceType: string,
    sourceSubdir: string,
    targetSubdir: string,
    filePatterns: string[],
    makeExecutable: boolean = false
  ): Promise<void> {
    try {
      this.logger.info('ResourceSyncer', `Copying ${resourceType}`, {
        sourceSubdir,
        targetSubdir,
      });

      const extensionPath = this.getExtensionPath();
      if (!extensionPath) {
        this.logger.warn('ResourceSyncer', `Could not find extension path for ${resourceType}`);
        return;
      }

      const sourcePath = path.join(extensionPath, 'resources', sourceSubdir);
      const targetPath = path.join(
        targetSubdir.startsWith('/') ? '' : this.specifyPath,
        targetSubdir
      );

      this.logger.debug('ResourceSyncer', 'Resource paths', { sourcePath, targetPath });

      // Ensure target directory exists
      await fs.mkdir(targetPath, { recursive: true });

      try {
        const files = await fs.readdir(sourcePath);
        let copiedCount = 0;

        for (const file of files) {
          // Check if file matches any pattern
          const matches = filePatterns.some((pattern) => {
            if (pattern.startsWith('*.')) {
              return file.endsWith(pattern.slice(1));
            }
            return file === pattern;
          });

          if (matches) {
            const source = path.join(sourcePath, file);
            const target = path.join(targetPath, file);
            await fs.copyFile(source, target);

            // Make executable if requested
            if (makeExecutable) {
              await fs.chmod(target, 0o755);
            }

            copiedCount++;
            this.logger.debug('ResourceSyncer', `Copied: ${file}`);
          }
        }

        this.logger.info(
          'ResourceSyncer',
          `Successfully copied ${copiedCount} ${resourceType} files`
        );
      } catch (error) {
        this.logger.error('ResourceSyncer', error as Error, {
          operation: `copy ${resourceType}`,
          sourcePath,
        });
        this.logger.warn('ResourceSyncer', `No bundled ${resourceType} found, skipping`);
      }
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, {
        operation: `copyBundledResources for ${resourceType}`,
      });
    }
  }

  public async installGoferCLI(): Promise<void> {
    this.logger.info('ResourceSyncer', 'Installing Gofer CLI resources');

    // Backup existing constitution before creating structure
    const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');
    let existingConstitution: string | null = null;

    try {
      existingConstitution = await fs.readFile(constitutionPath, 'utf-8');
      this.logger.debug('ResourceSyncer', 'Backed up existing constitution');
    } catch {
      // No existing constitution - that's fine
    }

    // Create structure and resources
    await this.createGoferStructure();
    await this.copyBundledTemplates();

    // Restore constitution if it existed
    if (existingConstitution) {
      await fs.writeFile(constitutionPath, existingConstitution);
      this.logger.debug('ResourceSyncer', 'Restored existing constitution');
    }

    // Save version
    const packageJson = require('../../../package.json');
    const versionFilePath = path.join(this.specifyPath, '.gofer-version');
    await fs.writeFile(versionFilePath, packageJson.version);

    this.logger.info('ResourceSyncer', 'Gofer CLI resources installed successfully');
  }

  public async createGoferStructure(): Promise<void> {
    this.logger.info('ResourceSyncer', 'Creating Gofer folder structure');

    const folders = ['memory', 'scripts/bash', 'scripts/powershell', 'specs', 'templates'];

    for (const folder of folders) {
      const folderPath = path.join(this.specifyPath, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }

    this.logger.debug('ResourceSyncer', 'Created all Gofer folders');
  }

  public async migrateJsonSpecs(): Promise<void> {
    this.logger.info('ResourceSyncer', 'Migrating JSON specs to Markdown');

    try {
      const files = await fs.readdir(this.specifyPath);
      const jsonFiles = files.filter((f) => f.endsWith('.json') && f !== 'spec-schema.json');

      if (jsonFiles.length === 0) {
        this.logger.debug('ResourceSyncer', 'No JSON specs found to migrate');
        return;
      }

      let specNumber = 1;

      for (const jsonFile of jsonFiles) {
        const jsonPath = path.join(this.specifyPath, jsonFile);
        const content = await fs.readFile(jsonPath, 'utf-8');
        const spec = JSON.parse(content);

        // Generate spec ID
        const specId =
          spec.id || `${specNumber.toString().padStart(3, '0')}-${this.slugify(spec.title)}`;

        // Create spec directory
        const specDir = path.join(this.specifyPath, 'specs', specId);
        await fs.mkdir(specDir, { recursive: true });

        // Convert to Markdown
        const markdown = this.convertJsonToMarkdown(spec, specId);

        // Write spec.md
        await fs.writeFile(path.join(specDir, 'spec.md'), markdown);

        // Backup original JSON
        const backupDir = path.join(this.specifyPath, '_backup');
        await fs.mkdir(backupDir, { recursive: true });
        await fs.copyFile(jsonPath, path.join(backupDir, jsonFile));

        specNumber++;
      }

      this.logger.info('ResourceSyncer', `Migrated ${jsonFiles.length} JSON specs to Markdown`);
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'migrateJsonSpecs' });
    }
  }

  public async setupClaudeCommands(): Promise<void> {
    await this.copyBundledResources(
      'Claude commands',
      'claude-commands',
      path.join(this.workspacePath, '.claude', 'commands'),
      ['*.md'],
      false
    );
  }

  public async setupClaudeAgents(): Promise<void> {
    await this.copyBundledResources(
      'Claude agents',
      'claude-agents',
      path.join(this.workspacePath, '.claude', 'agents'),
      ['*.md'],
      false
    );
  }

  public async setupCopilotPrompts(): Promise<void> {
    const promptsDir = path.join(this.workspacePath, '.github', 'prompts');

    // Clean up old deprecated prompts first
    await this.cleanupOldCopilotPrompts(promptsDir);

    await this.copyBundledResources(
      'Copilot prompts',
      'copilot-prompts',
      promptsDir,
      ['*.prompt.md'],
      false
    );
  }

  public async setupCopilotInstructions(): Promise<void> {
    await this.copyBundledResources(
      'Copilot instructions',
      'copilot-instructions',
      path.join(this.workspacePath, '.github', 'instructions'),
      ['*.instructions.md'],
      false
    );
  }

  public async setupCodexSkills(): Promise<void> {
    this.logger.info('ResourceSyncer', 'Generating Codex CLI skills from Claude commands');

    try {
      const { CommandGenerator } = await import('../../council/CommandGenerator');
      const generator = new CommandGenerator(this.workspacePath);

      // Generate all Codex skills from Claude commands
      const generatedPaths = await generator.generateCommands('codex', false);

      this.logger.info('ResourceSyncer', `Generated ${generatedPaths.length} Codex skills`, {
        paths: generatedPaths,
      });
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, {
        operation: 'setupCodexSkills',
      });
      throw error;
    }
  }

  /**
   * Setup global Codex symlink for CLI access from any directory
   *
   * Creates symlink: ~/.codex/skills/{project-name} -> {workspace}/.system/skills
   * This enables Codex CLI to discover Gofer skills globally without needing
   * to be run from the workspace directory.
   */
  public async setupCodexGlobalSymlink(): Promise<void> {
    this.logger.info('ResourceSyncer', 'Setting up global Codex CLI symlink');

    try {
      // Get workspace folder name for symlink name
      const workspaceName = path.basename(this.workspacePath);
      const homeDir = os.homedir();
      const codexSkillsDir = path.join(homeDir, '.codex', 'skills');
      const symlinkPath = path.join(codexSkillsDir, workspaceName);
      const targetPath = path.join(this.workspacePath, '.system', 'skills');

      // Check if source directory exists
      const sourceExists = await FileUtils.exists(targetPath);
      if (!sourceExists) {
        this.logger.warn('ResourceSyncer', 'Codex skills directory does not exist yet', {
          path: targetPath,
        });
        return;
      }

      // Ensure ~/.codex/skills directory exists
      await fs.mkdir(codexSkillsDir, { recursive: true });

      // Check if symlink already exists
      let needsCreation = true;
      try {
        const stats = await fs.lstat(symlinkPath);
        if (stats.isSymbolicLink()) {
          // Verify it points to the correct target
          const currentTarget = await fs.readlink(symlinkPath);
          const resolvedCurrent = path.resolve(path.dirname(symlinkPath), currentTarget);
          const resolvedTarget = path.resolve(targetPath);

          if (resolvedCurrent === resolvedTarget) {
            this.logger.info(
              'ResourceSyncer',
              'Codex global symlink already exists and is correct',
              {
                symlink: symlinkPath,
                target: targetPath,
              }
            );
            needsCreation = false;
          } else {
            // Symlink exists but points to wrong location, remove it
            this.logger.info('ResourceSyncer', 'Removing outdated Codex symlink', {
              current: currentTarget,
              new: targetPath,
            });
            await fs.unlink(symlinkPath);
          }
        } else {
          // Path exists but is not a symlink (file/directory), remove it
          this.logger.warn('ResourceSyncer', 'Path exists but is not a symlink, removing', {
            path: symlinkPath,
          });
          await fs.rm(symlinkPath, { recursive: true, force: true });
        }
      } catch (error: unknown) {
        // Symlink doesn't exist, which is fine
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      // Create symlink if needed
      if (needsCreation) {
        // Windows requires 'junction' type for directories without admin privileges
        // Unix systems use default 'dir' symlink
        const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';

        await fs.symlink(targetPath, symlinkPath, symlinkType);

        this.logger.info('ResourceSyncer', 'Created global Codex CLI symlink', {
          symlink: symlinkPath,
          target: targetPath,
          type: symlinkType,
        });

        // Show success message to user
        void vscode.window.showInformationMessage(
          `Codex CLI global access enabled: Skills available as "$ $0_business_scenario" from any directory`,
          'Dismiss'
        );
      }
    } catch (error) {
      // Non-blocking error: Log but don't throw
      // Users can still use Codex from the workspace directory
      this.logger.error('ResourceSyncer', error as Error, {
        operation: 'setupCodexGlobalSymlink',
        note: 'Codex CLI will still work from workspace directory',
      });

      // Show user-friendly error (Windows admin rights, permission issues, etc.)
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error creating symlink';

      void vscode.window.showWarningMessage(
        `Could not enable Codex CLI global access: ${errorMessage}. You can still use Codex from the workspace directory.`,
        'Dismiss'
      );
    }
  }

  public async setupDefaultInstructions(): Promise<void> {
    try {
      const { ProjectDetector } = await import('../ProjectDetector');
      const { InstructionGenerator } = await import('../InstructionGenerator');

      const projectInfo = await ProjectDetector.detect(this.workspacePath);
      const generator = new InstructionGenerator();

      // AGENTS.md at workspace root
      const agentsPath = path.join(this.workspacePath, 'AGENTS.md');
      if (!(await FileUtils.exists(agentsPath))) {
        const agentsContent = await generator.generateAgentsMd(projectInfo);
        await FileUtils.writeTextFile(agentsPath, agentsContent);
        this.logger.info('ResourceSyncer', 'Created AGENTS.md');
      }

      // CLAUDE.md at workspace root
      const claudePath = path.join(this.workspacePath, 'CLAUDE.md');
      if (!(await FileUtils.exists(claudePath))) {
        const claudeContent = await generator.generateClaudeMd(projectInfo);
        await FileUtils.writeTextFile(claudePath, claudeContent);
        this.logger.info('ResourceSyncer', 'Created CLAUDE.md');
      }

      // .github/copilot-instructions.md
      const copilotPath = path.join(this.workspacePath, '.github', 'copilot-instructions.md');
      if (!(await FileUtils.exists(copilotPath))) {
        await FileUtils.ensureDirectory(path.join(this.workspacePath, '.github'));
        const copilotContent = await generator.generateCopilotMd(projectInfo);
        await FileUtils.writeTextFile(copilotPath, copilotContent);
        this.logger.info('ResourceSyncer', 'Created .github/copilot-instructions.md');
      }
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, {
        operation: 'setupDefaultInstructions',
      });
    }
  }

  public async createBashScripts(): Promise<void> {
    await this.copyBundledResources('bash scripts', 'bash-scripts', 'scripts/bash', ['*.sh'], true);
  }

  public async createNodeScripts(): Promise<void> {
    await this.copyBundledResources(
      'Node.js scripts',
      'node-scripts',
      'scripts/node',
      ['*.js'],
      true
    );
  }

  public async createPowerShellScripts(): Promise<void> {
    await this.copyBundledResources(
      'PowerShell scripts',
      'powershell-scripts',
      'scripts/powershell',
      ['*.ps1'],
      false
    );
  }

  public async createVSCodeSettings(): Promise<void> {
    try {
      this.logger.info('ResourceSyncer', 'Creating VSCode settings');

      const vscodeDir = path.join(this.workspacePath, '.vscode');
      const settingsPath = path.join(vscodeDir, 'settings.json');

      // Ensure .vscode directory exists
      await fs.mkdir(vscodeDir, { recursive: true });

      // Read existing settings or start with empty object
      let settings: Record<string, unknown> = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf-8');
        settings = JSON.parse(existingContent);
        this.logger.debug('ResourceSyncer', 'Loaded existing settings');
      } catch {
        this.logger.info('ResourceSyncer', 'No existing settings found, creating new');
      }

      // Add Gofer specific settings
      const goferSettings: Record<string, Record<string, unknown>> = {
        'files.associations': {
          '**/.specify/**/*.md': 'markdown',
          '**/.claude/commands/*.md': 'markdown',
        },
        'search.exclude': {
          '**/.specify/_backup/**': true,
          '**/.specify/_archive/**': true,
        },
        'files.exclude': {
          '**/.specify/_backup/**': true,
        },
      };

      // Merge settings (don't overwrite existing)
      for (const [key, value] of Object.entries(goferSettings)) {
        if (!settings[key]) {
          settings[key] = value;
          this.logger.debug('ResourceSyncer', `Added setting: ${key}`);
        } else {
          // Merge nested objects
          settings[key] = { ...value, ...(settings[key] as Record<string, unknown>) };
          this.logger.debug('ResourceSyncer', `Merged setting: ${key}`);
        }
      }

      // Write back to file
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      this.logger.info('ResourceSyncer', 'Successfully updated .vscode/settings.json');
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'createVSCodeSettings' });
    }
  }

  public async fixExistingSpecs(): Promise<void> {
    const specsDir = path.join(this.specifyPath, 'specs');

    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      const specDirs = entries.filter((e) => e.isDirectory());

      for (const specDir of specDirs) {
        const specPath = path.join(specsDir, specDir.name);
        const specFile = path.join(specPath, 'spec.md');
        const tasksFile = path.join(specPath, 'tasks.md');

        // Fix spec.md - add or update YAML frontmatter to modern format
        try {
          let specContent = await fs.readFile(specFile, 'utf-8');
          let needsUpdate = false;
          let title = specDir.name;
          let status = 'draft';
          let created = new Date().toISOString().split('T')[0];
          let updated = new Date().toISOString().split('T')[0];
          let priority = 'medium';
          let assignee = 'engineer-agent';

          // Check if it has YAML frontmatter
          const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
          const frontmatterMatch = specContent.match(frontmatterRegex);

          if (frontmatterMatch) {
            const existingYaml = frontmatterMatch[1];
            const bodyContent = frontmatterMatch[2];
            const existingData = yaml.parse(existingYaml);

            // Check if using old format (feature: instead of id: and title:)
            if (existingData.feature && (!existingData.id || !existingData.title)) {
              this.logger.debug(
                'ResourceSyncer',
                `Converting ${specDir.name}/spec.md from old format to modern format`
              );
              needsUpdate = true;

              const titleMatch = bodyContent.match(/^#\s+(?:Feature Overview:\s*)?(.+)$/m);
              title = titleMatch
                ? titleMatch[1].replace('Feature Specification:', '').trim()
                : existingData.feature;

              status = existingData.status || status;
              created = existingData.created || created;
              updated = new Date().toISOString().split('T')[0];
              priority = existingData.priority || priority;
              assignee = existingData.assignee || assignee;

              const newFrontmatter = `---\nid: "${specDir.name}"\ntitle: "${title}"\nstatus: "${status}"\ncreated: "${created}"\nupdated: "${updated}"\npriority: "${priority}"\nassignee: "${assignee}"\n---\n\n`;
              specContent = newFrontmatter + bodyContent;
            } else if (existingData.id && existingData.title) {
              const existingUpdated = existingData.updated || '';
              const today = new Date().toISOString().split('T')[0];

              if (existingUpdated !== today) {
                this.logger.info('ResourceSyncer', `Updating timestamp in ${specDir.name}/spec.md`);
                needsUpdate = true;

                title = existingData.title;
                status = existingData.status || status;
                created = existingData.created || created;
                updated = today;
                priority = existingData.priority || priority;
                assignee = existingData.assignee || assignee;

                const newFrontmatter = `---\nid: "${specDir.name}"\ntitle: "${title}"\nstatus: "${status}"\ncreated: "${created}"\nupdated: "${updated}"\npriority: "${priority}"\nassignee: "${assignee}"\n---\n\n`;
                specContent = newFrontmatter + bodyContent;
              }
            }
          } else {
            // No YAML frontmatter - add it
            this.logger.debug(
              'ResourceSyncer',
              `Adding YAML frontmatter to ${specDir.name}/spec.md`
            );
            needsUpdate = true;

            const titleMatch = specContent.match(/^#\s+(?:Feature Specification:\s*)?(.+)$/m);
            if (titleMatch) {
              title = titleMatch[1].replace('Feature Specification:', '').trim();
            }

            const statusMatch = specContent.match(/\*\*Status\*\*:\s*(\w+)/i);
            if (statusMatch) {
              status = statusMatch[1].toLowerCase();
            }

            const createdMatch = specContent.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/i);
            if (createdMatch) {
              created = createdMatch[1];
            }

            const frontmatter = `---\nid: "${specDir.name}"\ntitle: "${title}"\nstatus: "${status}"\ncreated: "${created}"\nupdated: "${updated}"\npriority: "${priority}"\nassignee: "${assignee}"\n---\n\n`;
            specContent = frontmatter + specContent;
          }

          if (needsUpdate) {
            await fs.writeFile(specFile, specContent);
            this.logger.debug('ResourceSyncer', `Updated ${specDir.name}/spec.md`);
          }
        } catch {
          this.logger.debug('ResourceSyncer', `No spec.md found for ${specDir.name}`);
        }

        // Fix tasks.md - ensure it has checkbox task list
        try {
          let tasksContent = await fs.readFile(tasksFile, 'utf-8');
          const hasCheckboxes = /^-\s+\[[xX ]\]\s+T\d+/m.test(tasksContent);

          if (!hasCheckboxes) {
            this.logger.debug(
              'ResourceSyncer',
              `Adding checkbox task list to ${specDir.name}/tasks.md`
            );

            const taskMatches = tasksContent.matchAll(
              /###\s+(T\d+)[^\n]*\n[^\n]*\n\*\*Status\*\*:\s*([^*\n]+)/g
            );
            const tasks: Array<{ id: string; completed: boolean }> = [];

            for (const match of taskMatches) {
              const id = match[1];
              const statusStr = match[2].toLowerCase();
              const completed = statusStr.includes('complet') || statusStr.includes('\u2705');
              tasks.push({ id, completed });
            }

            if (tasks.length > 0) {
              let checkboxList = '\n## Task List\n\n';
              for (const task of tasks) {
                const checkbox = task.completed ? '[x]' : '[ ]';
                checkboxList += `- ${checkbox} ${task.id}\n`;
              }
              checkboxList += '\n';

              const headingMatch = tasksContent.match(/^(#[^\n]+\n)/);
              if (headingMatch) {
                tasksContent = tasksContent.replace(
                  headingMatch[0],
                  headingMatch[0] + checkboxList
                );
                await fs.writeFile(tasksFile, tasksContent);
              }
            }
          }
        } catch {
          this.logger.debug('ResourceSyncer', `No tasks.md found for ${specDir.name}`);
        }
      }

      this.logger.debug('ResourceSyncer', 'All existing specs have been reviewed and fixed');
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'fixExistingSpecs' });
    }
  }

  public async fixSpecPathReferences(): Promise<void> {
    // This will be handled by PathMigrator (T029)
    this.logger.debug('ResourceSyncer', 'Path fixing delegated to PathMigrator');
  }

  public async fixClaudeCommands(): Promise<void> {
    try {
      this.logger.debug('ResourceSyncer', 'Checking Claude commands for updates...');

      const claudeCommandsDir = path.join(this.workspacePath, '.claude', 'commands');
      const tasksCommandPath = path.join(claudeCommandsDir, 'gofer.tasks.md');

      // Check if gofer.tasks.md exists
      try {
        await fs.access(tasksCommandPath);
      } catch {
        this.logger.debug('ResourceSyncer', 'gofer.tasks.md not found, skipping check');
        return;
      }

      let content = await fs.readFile(tasksCommandPath, 'utf-8');
      const originalContent = content;
      let needsUpdate = false;

      // Check if it includes the issues.md generation step
      if (!content.includes('generate-issues.js')) {
        this.logger.debug('ResourceSyncer', 'gofer.tasks.md is missing issues.md generation step');
        needsUpdate = true;

        const reportSectionRegex = /(\d+)\.\s+\*\*Report\*\*:/;
        const reportMatch = content.match(reportSectionRegex);

        if (reportMatch) {
          const reportNumber = parseInt(reportMatch[1]);
          const issuesNumber = reportNumber;
          const newReportNumber = reportNumber + 1;

          const issuesSection = `${issuesNumber}. **Generate issues.md**: After creating tasks.md, run the issues generator:

   \`\`\`bash
   node .specify/scripts/node/generate-issues.js "$FEATURE_DIR"
   \`\`\`

   This will create issues.md with GitHub-ready issue definitions for each task.

${newReportNumber}. **Report**: Output path to generated tasks.md and issues.md with summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)
   - Issues.md confirmation: Number of GitHub issues generated`;

          content = content.replace(
            /\d+\.\s+\*\*Report\*\*:[^\n]*\n(?:   - [^\n]*\n)*/,
            issuesSection
          );
          this.logger.debug('ResourceSyncer', 'Added issues.md generation step to gofer.tasks.md');
        } else {
          this.logger.warn('ResourceSyncer', 'Could not find Report section to update');
          needsUpdate = false;
        }
      }

      if (needsUpdate && content !== originalContent) {
        await fs.writeFile(tasksCommandPath, content, 'utf-8');
        this.logger.debug('ResourceSyncer', 'Updated gofer.tasks.md with issues generation');
      } else if (content.includes('generate-issues.js')) {
        this.logger.debug('ResourceSyncer', 'gofer.tasks.md already includes issues generation');
      }
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'fixClaudeCommands' });
    }
  }

  public async createReadme(): Promise<void> {
    const readme = `# Gofer - Specification Directory

This folder contains all project specifications for AI-driven feature development.

## Structure

- **memory/** - Constitution, decisions, and project principles
- **specs/** - Feature specifications (numbered: 001-feature-name/)
- **templates/** - Templates for specs, plans, and tasks
- **scripts/** - Helper scripts for workflow automation
- **logs/** - Execution logs (council usage, etc.)

## Quick Start

### Using VSCode Extension

1. Open Command Palette (\`Cmd/Ctrl+Shift+P\`)
2. Run: **"Gofer: Create New Specification"**
3. Follow the prompts to create your feature spec

### Using Claude Code (Recommended)

Run the unified Gofer pipeline with a single command:

\`\`\`
/0_business_scenario Add user authentication with OAuth2 and JWT
\`\`\`

This automatically chains through all stages:
1. **Research** → Explores codebase and technology
2. **Specify** → Creates spec.md from requirements
3. **Plan** → Generates architecture and design
4. **Tasks** → Breaks down into executable tasks
5. **Implement** → Executes tasks phase by phase
6. **Validate** → Verifies against spec and constitution

## Unified Gofer Pipeline

| Stage | Command | Output |
|-------|---------|--------|
| 1. Research | \`/1_gofer_research\` | research.md |
| 2. Specify | \`/2_gofer_specify\` | spec.md |
| 3. Plan | \`/3_gofer_plan\` | plan.md, data-model.md, contracts/ |
| 4. Tasks | \`/4_gofer_tasks\` | tasks.md, issues.md |
| 5. Implement | \`/5_gofer_implement\` | Source code |
| 6. Validate | \`/6_gofer_validate\` | validation-report.md |

All artifacts are stored in: \`.specify/specs/{feature}/\`

## Constitution

Define your project principles in \`memory/constitution.md\`:
- Coding standards and patterns
- Technology choices
- Security requirements
- Testing policies

AI agents validate code against the constitution before implementation.

## Learn More

- **Full Documentation**: https://github.com/eai-tools/gofer
- **AI Agent Guidelines**: See AGENTS.md in your project root
- **Gofer Extension**: View specs and progress in VSCode sidebar
`;

    await fs.writeFile(path.join(this.specifyPath, 'README.md'), readme);
    this.logger.info('ResourceSyncer', 'Created README.md');
  }

  public async updateGitignore(): Promise<void> {
    try {
      this.logger.info('ResourceSyncer', 'Updating .gitignore');

      const gitignorePath = path.join(this.workspacePath, '.gitignore');

      const requiredEntries = [
        '.specify/hooks/',
        '.specify/memory/local.json',
        '.specify/memory/dependency-graph.json',
        '.specify/specs/*/.branch-info.json',
        '.specify/logs/',
        '.specify/memory/checkpoints/',
        '.specify/memory/context-health-state.json',
        '.specify/memory/observation-cache/',
        '.specify/specs/*/research-index.json',
      ];

      let gitignoreContent = '';
      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        this.logger.debug('ResourceSyncer', 'Found existing .gitignore');
      } catch {
        this.logger.info('ResourceSyncer', 'No .gitignore found, creating new one');
      }

      const missingEntries = requiredEntries.filter((entry) => !gitignoreContent.includes(entry));

      if (missingEntries.length === 0) {
        this.logger.debug(
          'ResourceSyncer',
          '.gitignore already contains all Gofer runtime entries'
        );
        return;
      }

      let updatedContent = gitignoreContent;

      if (updatedContent.length > 0 && !updatedContent.endsWith('\n')) {
        updatedContent += '\n';
      }

      const hasOldHeader = updatedContent.includes('# Gofer state files');
      const hasNewHeader = updatedContent.includes('# Gofer runtime files');

      if (!hasOldHeader && !hasNewHeader) {
        updatedContent += '\n# Gofer runtime files (auto-generated, should not be committed)\n';
        for (const entry of missingEntries) {
          updatedContent += entry + '\n';
        }
        this.logger.debug(
          'ResourceSyncer',
          `Added Gofer runtime section with ${missingEntries.length} entries`
        );
      } else {
        for (const entry of missingEntries) {
          updatedContent += entry + '\n';
          this.logger.debug('ResourceSyncer', `Added missing entry: ${entry}`);
        }
      }

      await fs.writeFile(gitignorePath, updatedContent);
      this.logger.info('ResourceSyncer', 'Successfully updated .gitignore');
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'updateGitignore' });
    }
  }

  public async installHooksConfig(): Promise<void> {
    try {
      this.logger.info('ResourceSyncer', 'Installing hooks configuration');

      const claudeDir = path.join(this.workspacePath, '.claude');
      const settingsPath = path.join(claudeDir, 'settings.json');

      await fs.mkdir(claudeDir, { recursive: true });

      const hooksConfig: Record<string, unknown[]> = {
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: 'node "$CLAUDE_PROJECT_DIR/.specify/scripts/hooks/user-prompt-submit.mjs"',
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: '',
            hooks: [
              {
                type: 'command',
                command: 'node "$CLAUDE_PROJECT_DIR/.specify/scripts/hooks/post-tool-use.mjs"',
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              {
                type: 'command',
                command: 'node "$CLAUDE_PROJECT_DIR/.specify/scripts/hooks/agent-stop.mjs"',
              },
            ],
          },
        ],
      };

      let settings: Record<string, unknown> = {};
      try {
        const existing = await fs.readFile(settingsPath, 'utf-8');
        settings = JSON.parse(existing);
        this.logger.debug('ResourceSyncer', 'Loaded existing settings.json');
      } catch {
        this.logger.info('ResourceSyncer', 'No existing settings.json, creating new');
      }

      // Always overwrite hooks to ensure latest format
      const existingHooks = (settings.hooks as Record<string, unknown>) || {};

      for (const [hookName, hookConfig] of Object.entries(hooksConfig)) {
        existingHooks[hookName] = hookConfig;
        this.logger.debug('ResourceSyncer', `Set ${hookName} hook`);
      }

      settings.hooks = existingHooks;
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      this.logger.info('ResourceSyncer', 'Successfully wrote .claude/settings.json');

      // Ensure hook scripts directory exists and copy scripts
      const hooksScriptDir = path.join(this.specifyPath, 'scripts', 'hooks');
      await fs.mkdir(hooksScriptDir, { recursive: true });

      await this.copyHookScripts();
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'installHooksConfig' });
    }
  }

  /**
   * Copy hook scripts from bundled extension resources to .specify/scripts/hooks/
   */
  private async copyHookScripts(): Promise<void> {
    try {
      const extensionPath = this.getExtensionPath();
      if (!extensionPath) {
        this.logger.warn('ResourceSyncer', 'Could not find extension path for hook scripts');
        return;
      }

      const bundledHooksPath = path.join(extensionPath, 'resources', 'hook-scripts');
      const targetHooksPath = path.join(this.specifyPath, 'scripts', 'hooks');

      this.logger.debug('ResourceSyncer', 'Hook script paths', {
        source: bundledHooksPath,
        target: targetHooksPath,
      });

      await fs.mkdir(targetHooksPath, { recursive: true });

      try {
        const files = await fs.readdir(bundledHooksPath);
        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.mjs')) {
            const source = path.join(bundledHooksPath, file);
            const target = path.join(targetHooksPath, file);
            await fs.copyFile(source, target);
            copiedCount++;
            this.logger.debug('ResourceSyncer', `Copied: ${file}`);
          }
        }
        this.logger.info('ResourceSyncer', `Successfully copied ${copiedCount} hook scripts`);
      } catch {
        this.logger.debug('ResourceSyncer', `No bundled hook scripts found at ${bundledHooksPath}`);
      }
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, { operation: 'copyHookScripts' });
    }
  }

  public async copyBundledTemplates(): Promise<void> {
    await this.copyBundledResources(
      'templates',
      'templates',
      'templates',
      ['*.md', '*.yaml'],
      false
    );
  }

  /**
   * Clean up old deprecated Copilot prompt files
   */
  private async cleanupOldCopilotPrompts(promptsDir: string): Promise<void> {
    try {
      this.logger.info('ResourceSyncer', 'Checking for deprecated prompts');

      const deprecatedPatterns = [
        'gofer.specify.prompt.md',
        'gofer.plan.prompt.md',
        'gofer.tasks.prompt.md',
        'gofer.implement.prompt.md',
        'gofer.analyze.prompt.md',
        'gofer.clarify.prompt.md',
        'gofer.constitution.prompt.md',
        'gofer.checklist.prompt.md',
        'gofer.taskstoissues.prompt.md',
        'gofer.prompt.md',
      ];

      let deletedCount = 0;
      for (const file of deprecatedPatterns) {
        const filePath = path.join(promptsDir, file);
        try {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.debug('ResourceSyncer', `Deleted deprecated: ${file}`);
        } catch {
          // File doesn't exist, that's fine
        }
      }

      if (deletedCount > 0) {
        this.logger.info('ResourceSyncer', `Cleaned up ${deletedCount} deprecated prompt files`);
      }
    } catch (error) {
      this.logger.error('ResourceSyncer', error as Error, {
        operation: 'cleanupOldCopilotPrompts',
      });
    }
  }

  /**
   * Convert JSON spec to Markdown with YAML frontmatter
   */
  private convertJsonToMarkdown(spec: any, specId: string): string {
    const now = new Date().toISOString().split('T')[0];

    const frontmatter = {
      id: specId,
      title: spec.title || specId,
      status: spec.status || 'draft',
      created: now,
      updated: now,
      priority: spec.priority || 'medium',
      assignee: 'engineer-agent',
    };

    const yamlStr = yaml.stringify(frontmatter);
    let markdown = `---\n${yamlStr}---\n\n`;

    markdown += `# Feature Overview\n\n${spec.description || spec.title}\n\n`;

    if (spec.userStories && spec.userStories.length > 0) {
      markdown += `## User Stories\n\n`;
      spec.userStories.forEach((story: string) => {
        markdown += `- ${story}\n`;
      });
      markdown += `\n`;
    }

    if (spec.tasks && spec.tasks.length > 0) {
      markdown += `## Functional Requirements\n\n`;
      spec.tasks.forEach((task: any, i: number) => {
        markdown += `${i + 1}. **FR-${(i + 1).toString().padStart(3, '0')}**: ${task.description}\n`;
      });
      markdown += `\n`;
    }

    if (spec.acceptanceCriteria && spec.acceptanceCriteria.length > 0) {
      markdown += `## Success Criteria\n\n`;
      spec.acceptanceCriteria.forEach((ac: any) => {
        markdown += `- ${ac.description}\n`;
      });
      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * Convert string to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
