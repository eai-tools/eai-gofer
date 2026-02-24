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
import { Logger } from '../Logger';
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
      const targetPath = path.join(targetSubdir.startsWith('/') ? '' : this.specifyPath, targetSubdir);

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

        this.logger.info('ResourceSyncer', `Successfully copied ${copiedCount} ${resourceType} files`);
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
        const specId = spec.id || `${specNumber.toString().padStart(3, '0')}-${this.slugify(spec.title)}`;

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

  public async createBashScripts(): Promise<void> {
    await this.copyBundledResources(
      'bash scripts',
      'bash-scripts',
      'scripts/bash',
      ['*.sh'],
      true
    );
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

  public async createVSCodeSettings(): Promise<void> {
    // Will be implemented - placeholder for now
    this.logger.info('ResourceSyncer', 'VSCode settings creation not yet implemented');
  }

  public async fixExistingSpecs(): Promise<void> {
    // Will be implemented - placeholder for now
    this.logger.info('ResourceSyncer', 'Spec fixing not yet implemented');
  }

  public async fixSpecPathReferences(): Promise<void> {
    // This will be handled by PathMigrator (T029)
    this.logger.debug('ResourceSyncer', 'Path fixing delegated to PathMigrator');
  }

  public async fixClaudeCommands(): Promise<void> {
    // Will be implemented - placeholder for now
    this.logger.info('ResourceSyncer', 'Claude command fixing not yet implemented');
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
    // Will be implemented - placeholder for now
    this.logger.info('ResourceSyncer', 'Gitignore update not yet implemented');
  }

  public async installHooksConfig(): Promise<void> {
    // Will be implemented - placeholder for now
    this.logger.info('ResourceSyncer', 'Hooks configuration installation not yet implemented');
  }

  public async copyBundledTemplates(): Promise<void> {
    await this.copyBundledResources('templates', 'templates', 'templates', ['*.md', '*.yaml'], false);
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
      this.logger.error('ResourceSyncer', error as Error, { operation: 'cleanupOldCopilotPrompts' });
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
