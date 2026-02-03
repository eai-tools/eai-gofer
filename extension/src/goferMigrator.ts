import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { setUpgradeState } from './extension';

/**
 * Detects .specify folder format and handles migration/upgrade
 */
export class GoferMigrator {
  private workspacePath: string;
  private specifyPath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.specifyPath = path.join(workspacePath, '.specify');
  }

  /**
   * Check if .specify folder exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.specifyPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect the format of .specify folder
   */
  async detectFormat(): Promise<'none' | 'legacy-json' | 'gofer' | 'mixed'> {
    const exists = await this.exists();
    if (!exists) {
      return 'none';
    }

    const hasSpecs = await this.hasDirectory('specs');
    const hasMemory = await this.hasDirectory('memory');
    const hasTemplates = await this.hasDirectory('templates');
    const hasJsonSpecs = await this.hasJsonSpecs();

    // Gofer format has specs/, memory/, templates/
    const isGofer = hasSpecs && hasMemory && hasTemplates;

    // Legacy format has JSON files in root
    const isLegacy = hasJsonSpecs && !hasSpecs;

    if (isGofer && hasJsonSpecs) {
      return 'mixed'; // Has both formats
    } else if (isGofer) {
      return 'gofer';
    } else if (isLegacy) {
      return 'legacy-json';
    } else {
      return 'mixed'; // Partial or unknown
    }
  }

  /**
   * Check if a directory exists in .specify
   */
  private async hasDirectory(name: string): Promise<boolean> {
    try {
      const dirPath = path.join(this.specifyPath, name);
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if there are JSON spec files
   */
  private async hasJsonSpecs(): Promise<boolean> {
    try {
      const files = await fs.readdir(this.specifyPath);
      return files.some((f) => f.endsWith('.json') && f !== 'spec-schema.json');
    } catch {
      return false;
    }
  }

  /**
   * Get version info from .specify folder
   */
  async getVersionInfo(): Promise<{ format: string; needsUpgrade: boolean; details: string }> {
    const format = await this.detectFormat();

    switch (format) {
      case 'none':
        return {
          format: 'none',
          needsUpgrade: false,
          details: 'No .specify folder found',
        };

      case 'legacy-json':
        return {
          format: 'legacy-json',
          needsUpgrade: true,
          details: 'Old JSON format detected. Upgrade to Gofer Markdown format?',
        };

      case 'gofer':
        return {
          format: 'gofer',
          needsUpgrade: false,
          details: 'Gofer format (up to date)',
        };

      case 'mixed':
        return {
          format: 'mixed',
          needsUpgrade: true,
          details: 'Mixed formats detected. Migrate remaining JSON specs to Markdown?',
        };

      default:
        return {
          format: 'unknown',
          needsUpgrade: false,
          details: 'Unknown format',
        };
    }
  }

  /**
   * Check if critical bundled resources are missing and need to be synced.
   * This handles the case where someone opens the repo on a new machine
   * (e.g., Codespaces) and the bundled resources weren't committed to git.
   */
  async checkMissingResources(): Promise<{
    hasMissingResources: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    // Critical paths that should exist if Gofer is properly initialized
    const criticalPaths = [
      { path: path.join(this.workspacePath, '.claude', 'commands'), name: 'Claude commands' },
      { path: path.join(this.workspacePath, '.claude', 'agents'), name: 'Claude agents' },
      { path: path.join(this.specifyPath, 'scripts', 'bash'), name: 'Bash scripts' },
      {
        path: path.join(this.specifyPath, 'scripts', 'hooks', 'post-tool-use.mjs'),
        name: 'Hook scripts',
      },
      { path: path.join(this.specifyPath, 'templates'), name: 'Templates' },
    ];

    for (const item of criticalPaths) {
      try {
        const files = await fs.readdir(item.path);
        // Check if directory exists but is empty or has very few files
        if (files.length === 0) {
          missing.push(item.name);
        }
      } catch {
        // Directory doesn't exist
        missing.push(item.name);
      }
    }

    return {
      hasMissingResources: missing.length > 0,
      missing,
    };
  }

  /**
   * Sync missing bundled resources without full upgrade.
   * This is lighter than a full upgrade and just copies missing files.
   */
  async syncMissingResources(): Promise<void> {
    console.log('[syncMissingResources] Checking for missing resources...');

    const { hasMissingResources, missing } = await this.checkMissingResources();

    if (!hasMissingResources) {
      console.log('[syncMissingResources] All critical resources present');
      return;
    }

    console.log('[syncMissingResources] Missing resources:', missing);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Syncing Gofer resources...',
        cancellable: false,
      },
      async (progress) => {
        const packageJson = require('../../package.json');
        console.log(`[Gofer v${packageJson.version}] Syncing missing resources...`);

        if (missing.includes('Claude commands')) {
          progress.report({ message: 'Syncing Claude commands...' });
          await this.setupClaudeCommands();
        }

        if (missing.includes('Claude agents')) {
          progress.report({ message: 'Syncing Claude agents...' });
          await this.setupClaudeAgents();
        }

        if (missing.includes('Bash scripts')) {
          progress.report({ message: 'Syncing bash scripts...' });
          await this.createBashScripts();
        }

        if (missing.includes('Hook scripts')) {
          progress.report({ message: 'Syncing hook scripts...' });
          await this.installHooksConfig();
        }

        if (missing.includes('Templates')) {
          progress.report({ message: 'Syncing templates...' });
          await this.copyBundledTemplates();
        }

        // Update version file after sync
        const versionFilePath = path.join(this.specifyPath, '.gofer-version');
        await fs.writeFile(versionFilePath, packageJson.version);
        console.log(`[syncMissingResources] Updated version to ${packageJson.version}`);

        console.log('[syncMissingResources] Sync complete');
      }
    );

    vscode.window.showInformationMessage(`✅ Gofer resources synced: ${missing.join(', ')}`);
  }

  /**
   * Upgrade .specify folder to Gofer format
   */
  async upgrade(): Promise<void> {
    const format = await this.detectFormat();

    if (format === 'gofer') {
      // Even if already in gofer format, check if templates need updating
      // Skip confirmation when called from Initialize command - user already initiated action
      await this.updateGoferTemplates(true);
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      `Install/Upgrade to Gofer format?\n\nThis will:\n- Create proper folder structure\n- Install latest templates from Gofer\n- Set up Claude commands\n- Keep original files as backup`,
      { modal: true },
      'Upgrade',
      'Cancel'
    );

    if (choice !== 'Upgrade') {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Installing Gofer...',
        cancellable: false,
      },
      async (progress) => {
        // Log version info
        const packageJson = require('../../package.json');
        console.log(`[Gofer v${packageJson.version}] Starting initialization...`);

        progress.report({ message: 'Installing bundled resources...' });
        console.log('[Gofer] Installing bundled resources...');
        await this.installGoferCLI();

        progress.report({ message: 'Creating folder structure...' });
        console.log('[Gofer] Creating folder structure...');
        await this.createGoferStructure();

        progress.report({ message: 'Migrating specifications...' });
        console.log('[Gofer] Migrating specifications...');
        await this.migrateJsonSpecs();

        progress.report({ message: 'Setting up Claude commands...' });
        console.log('[Gofer] Setting up Claude commands...');
        await this.setupClaudeCommands();

        progress.report({ message: 'Setting up Claude agents...' });
        console.log('[Gofer] Setting up Claude agents...');
        await this.setupClaudeAgents();

        progress.report({ message: 'Setting up GitHub Copilot prompts...' });
        console.log('[Gofer] Setting up GitHub Copilot prompts...');
        await this.setupCopilotPrompts();

        progress.report({ message: 'Setting up GitHub Copilot instructions...' });
        console.log('[Gofer] Setting up GitHub Copilot instructions...');
        await this.setupCopilotInstructions();

        progress.report({ message: 'Creating bash scripts...' });
        console.log('[Gofer] Creating bash scripts...');
        await this.createBashScripts();

        progress.report({ message: 'Creating Node.js scripts...' });
        console.log('[Gofer] Creating Node.js scripts...');
        await this.createNodeScripts();

        progress.report({ message: 'Configuring VSCode settings...' });
        console.log('[Gofer] Configuring VSCode settings...');
        await this.createVSCodeSettings();

        progress.report({ message: 'Verifying Claude commands...' });
        console.log('[Gofer] Ensuring Claude commands are up to date...');
        await this.fixClaudeCommands();

        progress.report({ message: 'Finalizing...' });
        console.log('[Gofer] Creating README...');
        await this.createReadme();

        progress.report({ message: 'Updating .gitignore...' });
        console.log('[Gofer] Updating .gitignore with state files...');
        await this.updateGitignore();

        progress.report({ message: 'Installing hooks config...' });
        console.log('[Gofer] Installing Claude Code hooks...');
        await this.installHooksConfig();

        console.log('[Gofer] Installation complete!');
      }
    );

    vscode.window
      .showInformationMessage('✅ Gofer installed successfully!', 'View Constitution')
      .then((choice) => {
        if (choice === 'View Constitution') {
          const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');
          vscode.workspace.openTextDocument(constitutionPath).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
        }
      });
  }

  /**
   * Install gofer structure using bundled resources from this extension.
   * This replaces the previous approach of pulling from external repositories.
   */
  private async installGoferCLI(): Promise<void> {
    try {
      console.log('[installGoferCLI] Using bundled resources from this extension...');

      // IMPORTANT: Backup existing constitution before creating structure
      const constitutionPath = path.join(
        this.workspacePath,
        '.specify',
        'memory',
        'constitution.md'
      );
      let existingConstitution: string | null = null;

      try {
        existingConstitution = await fs.readFile(constitutionPath, 'utf-8');
        console.log('[installGoferCLI] Backed up existing constitution for preservation');
      } catch {
        // No existing constitution - that's fine
      }

      // Create the folder structure manually using bundled resources
      await this.createGoferStructureManually();

      // Copy bundled templates
      await this.copyBundledTemplates();

      // IMPORTANT: Restore existing constitution if it was backed up
      if (existingConstitution) {
        await fs.writeFile(constitutionPath, existingConstitution);
        console.log('[installGoferCLI] Restored existing constitution');
      }

      // Fix path references in commands/scripts: specs/ → .specify/specs/
      await this.fixSpecPathReferences();

      // Save the extension version to track future upgrades
      const packageJson = require('../../package.json');
      const versionFilePath = path.join(this.specifyPath, '.gofer-version');
      await fs.writeFile(versionFilePath, packageJson.version);
      console.log(`[installGoferCLI] Saved version ${packageJson.version}`);

      console.log('[installGoferCLI] Bundled resources installed successfully');
      vscode.window.showInformationMessage('✓ Gofer templates installed successfully!');
    } catch (error: any) {
      console.error('[installGoferCLI] Failed to install:', error);
      vscode.window.showWarningMessage(
        `Could not install Gofer structure (${error.message}).`,
        'OK'
      );
    }
  }

  /**
   * Update gofer templates for existing installation
   */
  private async updateGoferTemplates(skipConfirmation: boolean = false): Promise<void> {
    console.log('[updateGoferTemplates] Starting... skipConfirmation:', skipConfirmation);

    if (!skipConfirmation) {
      const choice = await vscode.window.showInformationMessage(
        'Update Gofer templates to latest version?',
        'Update',
        'Cancel'
      );

      if (choice !== 'Update') {
        console.log('[updateGoferTemplates] User cancelled update');
        return;
      }
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Updating Gofer templates...',
        cancellable: false,
      },
      async (progress) => {
        const packageJson = require('../../package.json');
        console.log(`[Gofer v${packageJson.version}] Updating existing installation...`);

        progress.report({ message: 'Installing bundled templates...' });
        console.log('[Gofer Update] Copying bundled templates...');
        await this.copyBundledTemplates();

        progress.report({ message: 'Updating Claude commands...' });
        console.log('[Gofer Update] Setting up Claude commands...');
        await this.setupClaudeCommands();

        progress.report({ message: 'Updating Claude agents...' });
        console.log('[Gofer Update] Setting up Claude agents...');
        await this.setupClaudeAgents();

        progress.report({ message: 'Updating GitHub Copilot prompts...' });
        console.log('[Gofer Update] Setting up GitHub Copilot prompts...');
        await this.setupCopilotPrompts();

        progress.report({ message: 'Updating GitHub Copilot instructions...' });
        console.log('[Gofer Update] Setting up GitHub Copilot instructions...');
        await this.setupCopilotInstructions();

        progress.report({ message: 'Updating bash scripts...' });
        console.log('[Gofer Update] Creating bash scripts...');
        await this.createBashScripts();

        progress.report({ message: 'Updating Node.js scripts...' });
        console.log('[Gofer Update] Creating Node.js scripts...');
        await this.createNodeScripts();

        progress.report({ message: 'Updating VSCode settings...' });
        console.log('[Gofer Update] Configuring VSCode settings...');
        await this.createVSCodeSettings();

        progress.report({ message: 'Fixing existing specs and tasks...' });
        console.log('[Gofer Update] Fixing spec.md and tasks.md files...');
        await this.fixExistingSpecs();

        progress.report({ message: 'Fixing spec path references...' });
        console.log('[Gofer Update] Ensuring all scripts use .specify/specs/...');
        await this.fixSpecPathReferences();

        progress.report({ message: 'Checking Claude commands format...' });
        console.log('[Gofer Update] Ensuring speckit.tasks includes issues generation...');
        await this.fixClaudeCommands();

        progress.report({ message: 'Updating .gitignore...' });
        console.log('[Gofer Update] Updating .gitignore with state files...');
        await this.updateGitignore();

        progress.report({ message: 'Installing hooks config...' });
        console.log('[Gofer Update] Installing Claude Code hooks...');
        await this.installHooksConfig();

        progress.report({ message: 'Updating README...' });
        console.log('[Gofer Update] Updating .specify/README.md...');
        await this.createReadme();

        console.log('[Gofer Update] Update complete!');

        // Save the extension version to track upgrades
        progress.report({ message: 'Saving version info...' });
        const versionFilePath = path.join(this.specifyPath, '.gofer-version');
        await fs.writeFile(versionFilePath, packageJson.version);
        console.log(`[Gofer Update] Saved version ${packageJson.version} to ${versionFilePath}`);
      }
    );

    vscode.window.showInformationMessage(
      '✅ Templates updated and existing specs fixed successfully!'
    );
  }

  /**
   * Setup Claude commands from gofer
   */
  private async setupClaudeCommands(): Promise<void> {
    try {
      console.log('[setupClaudeCommands] Starting...');

      // Get the extension's bundled commands - try multiple methods
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;

      // Fallback: derive from __dirname (dist/extension.js -> extension root)
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
        console.log('[setupClaudeCommands] Using __dirname fallback:', extensionPath);
      }

      if (!extensionPath) {
        console.warn('[setupClaudeCommands] Could not find extension path for Claude commands');
        return;
      }

      console.log('[setupClaudeCommands] Extension path:', extensionPath);

      // Check if we have Claude commands in the extension bundle
      const bundledCommandsPath = path.join(extensionPath, 'resources', 'claude-commands');
      // Note: Gofer installs to .claude/commands/, we keep them there
      // but fix path references to use .specify/specs/ instead of specs/
      const claudeDir = path.join(this.workspacePath, '.claude');
      const commandsDir = path.join(claudeDir, 'commands');

      console.log('[setupClaudeCommands] Bundled commands path:', bundledCommandsPath);
      console.log('[setupClaudeCommands] Target commands dir:', commandsDir);

      // Ensure .claude/commands directory exists
      await fs.mkdir(commandsDir, { recursive: true });
      console.log('[setupClaudeCommands] Created directory:', commandsDir);

      try {
        // Try to copy from bundled resources first
        const files = await fs.readdir(bundledCommandsPath);
        console.log('[setupClaudeCommands] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          // Copy all markdown command files (gofer.*, numbered commands like 0_, 1_, etc.)
          if (file.endsWith('.md')) {
            const source = path.join(bundledCommandsPath, file);
            const target = path.join(commandsDir, file);
            await fs.copyFile(source, target);
            copiedCount++;
            console.log('[setupClaudeCommands] Copied:', file);
          }
        }
        console.log('[setupClaudeCommands] Successfully copied', copiedCount, 'command files');
      } catch (error) {
        // If no bundled commands, try to get from GitHub or local gofer installation
        console.error('[setupClaudeCommands] Error reading bundled commands:', error);
        console.log(
          '[setupClaudeCommands] No bundled Claude commands found, checking for gofer installation'
        );

        // Check if gofer created the commands in .claude/commands/
        const goferCommandsDir = path.join(this.workspacePath, '.claude', 'commands');
        try {
          const files = await fs.readdir(goferCommandsDir);
          const hasGoferCommands = files.some((f) => f.startsWith('speckit.'));

          if (!hasGoferCommands) {
            console.warn('[setupClaudeCommands] No gofer Claude commands found after installation');
          } else {
            console.log('[setupClaudeCommands] Found gofer commands from CLI installation');
          }
        } catch {
          console.warn('[setupClaudeCommands] Claude commands directory not found');
        }
      }
    } catch (error) {
      console.error('[setupClaudeCommands] Failed to setup Claude commands:', error);
    }
  }

  /**
   * Setup Claude agents from bundled resources
   * Deploys parallel agents (codebase-locator, codebase-analyzer, codebase-pattern-finder)
   */
  private async setupClaudeAgents(): Promise<void> {
    try {
      console.log('[setupClaudeAgents] Starting...');

      // Get the extension's bundled agents - try multiple methods
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;

      // Fallback: derive from __dirname (dist/extension.js -> extension root)
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
        console.log('[setupClaudeAgents] Using __dirname fallback:', extensionPath);
      }

      if (!extensionPath) {
        console.warn('[setupClaudeAgents] Could not find extension path for Claude agents');
        return;
      }

      console.log('[setupClaudeAgents] Extension path:', extensionPath);

      // Check if we have Claude agents in the extension bundle
      const bundledAgentsPath = path.join(extensionPath, 'resources', 'claude-agents');
      const claudeDir = path.join(this.workspacePath, '.claude');
      const agentsDir = path.join(claudeDir, 'agents');

      console.log('[setupClaudeAgents] Bundled agents path:', bundledAgentsPath);
      console.log('[setupClaudeAgents] Target agents dir:', agentsDir);

      // Ensure .claude/agents directory exists
      await fs.mkdir(agentsDir, { recursive: true });
      console.log('[setupClaudeAgents] Created directory:', agentsDir);

      try {
        // Copy from bundled resources
        const files = await fs.readdir(bundledAgentsPath);
        console.log('[setupClaudeAgents] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.md')) {
            const source = path.join(bundledAgentsPath, file);
            const target = path.join(agentsDir, file);
            await fs.copyFile(source, target);
            copiedCount++;
            console.log('[setupClaudeAgents] Copied:', file);
          }
        }
        console.log('[setupClaudeAgents] Successfully copied', copiedCount, 'agent files');
      } catch (error) {
        console.error('[setupClaudeAgents] Error reading bundled agents:', error);
        console.log('[setupClaudeAgents] No bundled Claude agents found');
      }
    } catch (error) {
      console.error('[setupClaudeAgents] Failed to setup Claude agents:', error);
    }
  }

  /**
   * Setup GitHub Copilot prompt files from .github/prompts/
   * These are the Copilot equivalent of Claude commands
   */
  private async setupCopilotPrompts(): Promise<void> {
    try {
      console.log('[setupCopilotPrompts] Starting...');

      const githubDir = path.join(this.workspacePath, '.github');
      const promptsDir = path.join(githubDir, 'prompts');

      // Ensure .github/prompts directory exists
      await fs.mkdir(promptsDir, { recursive: true });
      console.log('[setupCopilotPrompts] Created directory:', promptsDir);

      // Clean up old gofer.* prompts (deprecated naming convention)
      await this.cleanupOldCopilotPrompts(promptsDir);

      // Copy prompt files from the repo's .github/prompts to workspace
      // The extension bundles these from the repo during packaging
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
      }

      // Check for bundled copilot prompts
      const bundledPromptsPath = path.join(extensionPath, 'resources', 'copilot-prompts');
      try {
        const files = await fs.readdir(bundledPromptsPath);
        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.prompt.md')) {
            const source = path.join(bundledPromptsPath, file);
            const target = path.join(promptsDir, file);
            await fs.copyFile(source, target);
            copiedCount++;
            console.log('[setupCopilotPrompts] Copied:', file);
          }
        }
        console.log('[setupCopilotPrompts] Successfully copied', copiedCount, 'prompt files');
      } catch {
        console.log('[setupCopilotPrompts] No bundled Copilot prompts found, skipping');
      }
    } catch (error) {
      console.error('[setupCopilotPrompts] Failed to setup Copilot prompts:', error);
    }
  }

  /**
   * Clean up old gofer.* prompt files that use deprecated naming convention
   * These should be replaced with the unified gofer_* naming
   */
  private async cleanupOldCopilotPrompts(promptsDir: string): Promise<void> {
    try {
      console.log('[cleanupOldCopilotPrompts] Checking for deprecated prompts...');

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
        'gofer.prompt.md', // Old unified gofer (replaced by 0_business_scenario)
      ];

      let deletedCount = 0;
      for (const file of deprecatedPatterns) {
        const filePath = path.join(promptsDir, file);
        try {
          await fs.unlink(filePath);
          deletedCount++;
          console.log('[cleanupOldCopilotPrompts] Deleted deprecated:', file);
        } catch {
          // File doesn't exist, that's fine
        }
      }

      if (deletedCount > 0) {
        console.log(
          '[cleanupOldCopilotPrompts] Cleaned up',
          deletedCount,
          'deprecated prompt files'
        );
      } else {
        console.log('[cleanupOldCopilotPrompts] No deprecated prompts found');
      }
    } catch (error) {
      console.error('[cleanupOldCopilotPrompts] Error during cleanup:', error);
    }
  }

  /**
   * Setup GitHub Copilot path-specific instructions from .github/instructions/
   * These provide context-aware coding guidelines
   */
  private async setupCopilotInstructions(): Promise<void> {
    try {
      console.log('[setupCopilotInstructions] Starting...');

      const githubDir = path.join(this.workspacePath, '.github');
      const instructionsDir = path.join(githubDir, 'instructions');

      // Ensure .github/instructions directory exists
      await fs.mkdir(instructionsDir, { recursive: true });
      console.log('[setupCopilotInstructions] Created directory:', instructionsDir);

      // Copy instructions files from the repo's .github/instructions to workspace
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
      }

      // Check for bundled copilot instructions
      const bundledInstructionsPath = path.join(extensionPath, 'resources', 'copilot-instructions');
      try {
        const files = await fs.readdir(bundledInstructionsPath);
        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.instructions.md')) {
            const source = path.join(bundledInstructionsPath, file);
            const target = path.join(instructionsDir, file);
            await fs.copyFile(source, target);
            copiedCount++;
            console.log('[setupCopilotInstructions] Copied:', file);
          }
        }
        console.log(
          '[setupCopilotInstructions] Successfully copied',
          copiedCount,
          'instruction files'
        );
      } catch {
        console.log('[setupCopilotInstructions] No bundled Copilot instructions found, skipping');
      }
    } catch (error) {
      console.error('[setupCopilotInstructions] Failed to setup Copilot instructions:', error);
    }
  }

  /**
   * Copy bundled templates from extension resources to .specify/templates/
   * This ensures templates always come from this repo, not external sources.
   */
  private async copyBundledTemplates(): Promise<void> {
    try {
      console.log('[copyBundledTemplates] Starting...');

      // Get the extension's bundled templates - try multiple methods
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;

      // Fallback: derive from __dirname (dist/extension.js -> extension root)
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
        console.log('[copyBundledTemplates] Using __dirname fallback:', extensionPath);
      }

      if (!extensionPath) {
        console.warn('[copyBundledTemplates] Could not find extension path for templates');
        // Fall back to inline templates
        await this.createTemplates();
        return;
      }

      console.log('[copyBundledTemplates] Extension path:', extensionPath);

      const bundledTemplatesPath = path.join(extensionPath, 'resources', 'templates');
      const targetTemplatesPath = path.join(this.specifyPath, 'templates');

      console.log('[copyBundledTemplates] Bundled templates path:', bundledTemplatesPath);
      console.log('[copyBundledTemplates] Target templates path:', targetTemplatesPath);

      // Ensure target directory exists
      await fs.mkdir(targetTemplatesPath, { recursive: true });
      console.log('[copyBundledTemplates] Created directory:', targetTemplatesPath);

      try {
        // Copy all template files from bundled resources
        const files = await fs.readdir(bundledTemplatesPath);
        console.log('[copyBundledTemplates] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.yaml')) {
            const source = path.join(bundledTemplatesPath, file);
            const target = path.join(targetTemplatesPath, file);
            await fs.copyFile(source, target);
            copiedCount++;
            console.log('[copyBundledTemplates] Copied:', file);
          }
        }
        console.log('[copyBundledTemplates] Successfully copied', copiedCount, 'template files');
      } catch (error) {
        console.error('[copyBundledTemplates] Error reading bundled templates:', error);
        console.log('[copyBundledTemplates] Falling back to inline templates');
        // Fall back to inline templates
        await this.createTemplates();
      }
    } catch (error) {
      console.error('[copyBundledTemplates] Failed to copy templates:', error);
      // Fall back to inline templates
      await this.createTemplates();
    }
  }

  /**
   * Create Gofer folder structure manually (fallback)
   */
  private async createGoferStructureManually(): Promise<void> {
    const folders = ['memory', 'scripts/bash', 'scripts/powershell', 'specs', 'templates'];

    for (const folder of folders) {
      const folderPath = path.join(this.specifyPath, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }

    // Create constitution if it doesn't exist
    const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');
    try {
      await fs.access(constitutionPath);
    } catch {
      await this.createConstitution();
    }

    // Create proper templates from gofer format
    console.log('[Gofer Fallback] Creating templates...');
    await this.createTemplates();

    // Setup Claude commands from bundled resources
    console.log('[Gofer Fallback] Setting up Claude commands...');
    await this.setupClaudeCommands();

    // Create bash scripts from bundled resources
    console.log('[Gofer Fallback] Creating bash scripts...');
    await this.createBashScripts();

    // Create Node.js scripts from bundled resources
    console.log('[Gofer Fallback] Creating Node.js scripts...');
    await this.createNodeScripts();

    // Configure VSCode settings
    console.log('[Gofer Fallback] Configuring VSCode settings...');
    await this.createVSCodeSettings();

    // Verify Claude commands
    console.log('[Gofer Fallback] Ensuring Claude commands are up to date...');
    await this.fixClaudeCommands();

    // Create README
    console.log('[Gofer Fallback] Creating README...');
    await this.createReadme();

    // Update .gitignore
    console.log('[Gofer Fallback] Updating .gitignore...');
    await this.updateGitignore();

    console.log('[Gofer Fallback] Manual setup complete!');
  }

  /**
   * Create Gofer folder structure
   */
  private async createGoferStructure(): Promise<void> {
    // Ensure all gofer directories exist
    const folders = ['memory', 'scripts/bash', 'scripts/powershell', 'specs', 'templates'];

    for (const folder of folders) {
      const folderPath = path.join(this.specifyPath, folder);
      await fs.mkdir(folderPath, { recursive: true });
    }
  }

  /**
   * Migrate JSON specs to Markdown format
   */
  private async migrateJsonSpecs(): Promise<void> {
    const files = await fs.readdir(this.specifyPath);
    const jsonFiles = files.filter((f) => f.endsWith('.json') && f !== 'spec-schema.json');

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
  }

  /**
   * Convert JSON spec to Markdown with modern YAML frontmatter
   */
  private convertJsonToMarkdown(spec: any, specId: string): string {
    const now = new Date().toISOString().split('T')[0];

    // Modern YAML frontmatter format
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

    // Build Markdown content
    let markdown = `---\n${yamlStr}---\n\n`;

    // Feature Overview
    markdown += `# Feature Overview\n\n${spec.description || spec.title}\n\n`;

    // User Stories (if exists)
    if (spec.userStories && spec.userStories.length > 0) {
      markdown += `## User Stories\n\n`;
      spec.userStories.forEach((story: string) => {
        markdown += `- ${story}\n`;
      });
      markdown += `\n`;
    }

    // Functional Requirements (from tasks)
    if (spec.tasks && spec.tasks.length > 0) {
      markdown += `## Functional Requirements\n\n`;
      spec.tasks.forEach((task: any, i: number) => {
        markdown += `${i + 1}. **FR-${(i + 1).toString().padStart(3, '0')}**: ${task.description}\n`;
      });
      markdown += `\n`;
    }

    // Success Criteria (from acceptanceCriteria)
    if (spec.acceptanceCriteria && spec.acceptanceCriteria.length > 0) {
      markdown += `## Success Criteria\n\n`;
      spec.acceptanceCriteria.forEach((ac: any) => {
        markdown += `- ${ac.description}\n`;
      });
      markdown += `\n`;
    }

    // Key Entities (placeholder)
    markdown += `## Key Entities\n\n`;
    markdown += `[To be defined based on implementation]\n\n`;

    // Assumptions (placeholder)
    markdown += `## Assumptions\n\n`;
    markdown += `- Standard web browser environment\n`;
    markdown += `- Users have necessary permissions\n\n`;

    // Clarifications (from qaRules)
    if (spec.qaRules && spec.qaRules.length > 0) {
      markdown += `## Clarifications\n\n`;
      spec.qaRules.forEach((rule: any, i: number) => {
        markdown += `### Question ${i + 1}: ${rule.question}\n`;
        markdown += `**Q:** ${rule.question}\n`;
        markdown += `**A:** ${rule.answer}\n`;
        markdown += `**Confidence:** ${rule.confidence}\n\n`;
      });
    }

    return markdown;
  }

  /**
   * Create constitution.md from template
   */
  private async createConstitution(): Promise<void> {
    const constitutionPath = path.join(this.specifyPath, 'memory', 'constitution.md');

    // Read from the template we created earlier
    const templatePath = path.join(__dirname, '../../..', '.specify', 'memory', 'constitution.md');

    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      await fs.writeFile(constitutionPath, template);
    } catch {
      // If template doesn't exist, create a minimal one
      const minimalConstitution = `# Project Constitution

## Article I: Code Quality

All code must:
- Follow language best practices
- Include appropriate documentation
- Pass linting and type checking
- Maintain reasonable complexity

## Article II: Testing Standards

- Minimum 80% code coverage
- All features must have tests
- Tests must be reliable and fast

## Article III: User Experience

- Performance: API responses under 500ms
- All features must be accessible
- Error messages must be helpful

For the complete constitution template, see the Gofer documentation.
`;
      await fs.writeFile(constitutionPath, minimalConstitution);
    }
  }

  /**
   * Create template files with proper gofer format
   */
  private async createTemplates(): Promise<void> {
    const templatesDir = path.join(this.specifyPath, 'templates');

    // spec-template.md - modern Gofer format
    const specTemplate = `---
id: "[###-feature-name]"
title: "[Feature Title]"
status: "draft"
created: "[YYYY-MM-DD]"
updated: "[YYYY-MM-DD]"
priority: "medium"
assignee: "engineer-agent"
---

# [Feature Title]

**Feature Branch**: \`[###-feature-name]\`
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
`;

    await fs.writeFile(path.join(templatesDir, 'spec-template.md'), specTemplate);

    // plan-template.md - proper gofer format
    const planTemplate = `# Technical Plan: [Feature Name]

## Technology Stack

- **Language/Runtime**: [e.g., TypeScript/Node.js 20+]
- **Framework**: [e.g., Express, React]
- **Database**: [e.g., PostgreSQL, Redis]
- **Testing**: [e.g., Jest, Playwright]
- **Infrastructure**: [e.g., AWS, Docker]

## Architecture

### System Architecture
[Describe the overall system architecture, including high-level components and their interactions]

### Component Design
[Detail the specific components that will be built or modified]

### Data Flow
[Explain how data moves through the system]

## API Design

### Endpoints
- **GET /api/[resource]**: [Description]
  - Request: [Format]
  - Response: [Format]

- **POST /api/[resource]**: [Description]
  - Request: [Format]
  - Response: [Format]

### Data Models
\`\`\`typescript
interface [ModelName] {
  id: string;
  // other fields
}
\`\`\`

## Implementation Strategy

### Phase 1: [Foundation]
- [ ] Set up project structure
- [ ] Configure development environment
- [ ] Set up testing framework

### Phase 2: [Core Features]
- [ ] Implement [feature]
- [ ] Add [capability]

### Phase 3: [Polish]
- [ ] Performance optimization
- [ ] Error handling improvements

## Security Considerations

- **Authentication**: [Approach]
- **Authorization**: [Strategy]
- **Data Protection**: [Methods]
- **Audit Logging**: [What will be logged]

## Performance Requirements

- **Response Time**: [Target latency]
- **Throughput**: [Requests per second]
- **Concurrent Users**: [Expected load]
- **Data Volume**: [Storage requirements]

## Testing Strategy

### Unit Tests
- [What will be unit tested]
- Coverage target: [percentage]

### Integration Tests
- [Integration points to test]

### E2E Tests
- [User flows to test]

### Performance Tests
- [Load testing scenarios]

## Monitoring and Observability

- **Metrics**: [What to measure]
- **Logging**: [What to log]
- **Alerting**: [Alert conditions]
- **Dashboards**: [Key visualizations]

## Migration Plan

- [ ] Data migration strategy
- [ ] Rollback plan
- [ ] Feature flag configuration

## Documentation Requirements

- [ ] API documentation
- [ ] Developer guide
- [ ] User documentation
- [ ] Runbook for operations

## Dependencies

### Libraries
- [package-name]: [version] - [purpose]

### Services
- [service-name]: [purpose]

### Infrastructure
- [resource]: [specification]

## Implementation Notes

[Special considerations, gotchas, or important details for developers]

## References

- [Link to design documents]
- [Link to related specifications]
- [External documentation]
`;

    await fs.writeFile(path.join(templatesDir, 'plan-template.md'), planTemplate);

    // tasks-template.md - proper gofer format
    const tasksTemplate = `# Task Breakdown: [Feature Name]

## Overview
Total Tasks: [count]
Estimated Effort: [time estimate]
Priority: [High/Medium/Low]

## Task Categories

### Setup & Configuration
Foundational tasks that prepare the development environment and project structure.

### Testing Infrastructure
Tasks to establish testing capabilities before implementation.

### Core Implementation
The main feature development tasks.

### Integration & Polish
Tasks to integrate the feature and refine the implementation.

## Tasks

### T001: [P] Set up development environment
**Category**: Setup
**Priority**: High
**Effort**: 1-2 hours
**Dependencies**: None
**Description**:
- Configure local development environment
- Install required dependencies
- Set up development database
- Verify build and test scripts work

**Acceptance Criteria**:
- [ ] All dependencies installed
- [ ] Tests can be run successfully
- [ ] Development server starts without errors

---

### T002: [P] Create test structure and fixtures
**Category**: Testing
**Priority**: High
**Effort**: 2-3 hours
**Dependencies**: T001
**Description**:
- Set up test directory structure
- Create test fixtures and mocks
- Configure test database
- Write initial smoke tests

**Acceptance Criteria**:
- [ ] Test framework configured
- [ ] Test fixtures created
- [ ] At least one passing test

---

### T003: [P] Write unit tests for [component]
**Category**: Testing
**Priority**: High
**Effort**: 3-4 hours
**Dependencies**: T002
**Description**:
- Write comprehensive unit tests
- Achieve >80% code coverage
- Include edge cases

**Acceptance Criteria**:
- [ ] All public methods have tests
- [ ] Edge cases covered
- [ ] Tests are maintainable and clear

---

### T004: Implement [core feature]
**Category**: Implementation
**Priority**: High
**Effort**: 4-6 hours
**Dependencies**: T003
**Description**:
- Implement the main functionality
- Follow established patterns
- Add appropriate logging

**Acceptance Criteria**:
- [ ] Feature works as specified
- [ ] All tests pass
- [ ] Code reviewed and approved

---

### T005: Add integration tests
**Category**: Testing
**Priority**: Medium
**Effort**: 2-3 hours
**Dependencies**: T004
**Description**:
- Write integration tests for API endpoints
- Test database interactions
- Verify error handling

**Acceptance Criteria**:
- [ ] All endpoints tested
- [ ] Error cases handled
- [ ] Database transactions verified

---

### T006: Implement error handling and logging
**Category**: Implementation
**Priority**: Medium
**Effort**: 2-3 hours
**Dependencies**: T004
**Description**:
- Add comprehensive error handling
- Implement structured logging
- Add monitoring hooks

**Acceptance Criteria**:
- [ ] All errors handled gracefully
- [ ] Logging provides debugging info
- [ ] Monitoring integration complete

---

### T007: Performance optimization
**Category**: Polish
**Priority**: Low
**Effort**: 2-4 hours
**Dependencies**: T005
**Description**:
- Profile and optimize performance
- Add caching where appropriate
- Optimize database queries

**Acceptance Criteria**:
- [ ] Performance targets met
- [ ] No N+1 queries
- [ ] Response times under threshold

---

### T008: Documentation and deployment
**Category**: Documentation
**Priority**: Medium
**Effort**: 2-3 hours
**Dependencies**: T006
**Description**:
- Write API documentation
- Update README
- Create deployment guide
- Add to changelog

**Acceptance Criteria**:
- [ ] API fully documented
- [ ] Setup instructions clear
- [ ] Deployment process documented

## Task Dependencies Diagram

\`\`\`
T001 (Setup)
  └── T002 (Test Structure)
       └── T003 (Unit Tests)
            └── T004 (Implementation)
                 ├── T005 (Integration Tests)
                 ├── T006 (Error Handling)
                 │    └── T007 (Performance)
                 └── T008 (Documentation)
\`\`\`

## Risk Mitigation

- **Blocked on T001**: Have fallback development container ready
- **T004 takes longer**: Can be split into subtasks
- **Performance issues in T007**: Consider phased optimization

## Notes

- Tasks marked with [P] should be done in pair programming or with review
- Update task estimates based on actual time spent
- Add new tasks as discovered during implementation
`;

    await fs.writeFile(path.join(templatesDir, 'tasks-template.md'), tasksTemplate);

    // issues-template.md - GitHub issues generation template
    const issuesTemplate = `---
description: "GitHub issues template - ready to convert to actual GitHub issues"
---

# GitHub Issues: [FEATURE NAME]

**Generated from**: tasks.md
**Feature ID**: [###-feature-name]
**Total Issues**: [COUNT]

This file contains GitHub-ready issue definitions for each task. Each issue follows the Requirements Ticket template from enterpriseaigroup/Issues2025.

---

## Issue #1: [Task ID] - [Task Title]

**Labels**: \`enhancement\`, \`phase-1-setup\`, \`[story-label]\`
**Assignees**: @MikeNowosadko
**Title**: [Feature]: [Task Description]

### Screen described (Mike)

[Description of the UI/functionality this task creates or modifies. If backend-only, describe the API/service behavior.]

### Business Rationale

**Problem**: [What problem does this task solve?]

**Value**: [What value does completing this task provide?]

**Impact**: [How does this contribute to the overall feature goal?]

**Priority**: [P1/P2/P3] - [Reason for priority level]

### Fields required (Mike)

| Field | Type | Source | Validation |
|-------|------|--------|------------|
| [field-name] | [string/number/boolean/etc] | [where the data comes from] | [validation rules] |

[If no fields: "N/A - This is a backend/infrastructure task"]

### Acceptance Criteria

- [ ] [Specific testable condition 1]
- [ ] [Specific testable condition 2]
- [ ] [Specific testable condition 3]

### Data needed (Mike)

[What data entities, sources, and APIs does this task require?]

**Entities**: [Entity name and description]

**Sources**: [System/API name and what data it provides]

### Integrations Needed (Team)

[External or internal systems this task must integrate with]

[If no integrations: "N/A - Standalone implementation"]

### Navigation (Mike)

[How users reach this functionality, or how this code is accessed]

### Blocks needed (Team)

**New Components**: [List components to build]

**Reusable Components**: [List components to reuse]

### Definition of Ready

- [ ] Mock up screen signed off (Mike)
- [ ] Business Content (Mike)
- [ ] Screen Understood by Dev team (Mike, Gareth & Team)
- [ ] Requirements Documented: Data (Mike & Team)
- [ ] Requirements Documented: Integrations (Mike & Team)
- [ ] Requirements Documented: Navigation (Mike & Team)
- [ ] Requirements Documented: Fields (Mike & Team)
- [ ] Requirements Documented: Blocks (Mike & Team)
- [ ] Dependencies Identified
- [ ] AC Agreed
- [ ] Identify if we can re-use components (Doug)
- [ ] Effort is sized and prioritised

### Definition of Done

- [ ] Functional: Works as described in acceptance criteria
- [ ] Documented: Architecture changes and implementation documented
- [ ] Demonstrated: Can show it working
- [ ] Stable: No critical bugs
- [ ] Reviewed: PO confirmed

**File Path**: \`[file-path-from-task]\`
**Estimated Effort**: [S/M/L or hours]

---

## Notes

- This template is auto-populated by: \`.specify/scripts/node/generate-issues.js\`
- Run after creating tasks.md: \`node .specify/scripts/node/generate-issues.js <feature-dir>\`
- All issues follow the enterprise Requirements Ticket template
- See tasks.md for complete task definitions
`;

    await fs.writeFile(path.join(templatesDir, 'issues-template.md'), issuesTemplate);
  }

  /**
   * Create bash scripts from bundled resources
   */
  private async createBashScripts(): Promise<void> {
    try {
      console.log('[createBashScripts] Starting...');

      // Get the extension's bundled scripts - try multiple methods
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;

      // Fallback: derive from __dirname (dist/extension.js -> extension root)
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
        console.log('[createBashScripts] Using __dirname fallback:', extensionPath);
      }

      if (!extensionPath) {
        console.warn('[createBashScripts] Could not find extension path for bash scripts');
        return;
      }

      console.log('[createBashScripts] Extension path:', extensionPath);

      const bundledScriptsPath = path.join(extensionPath, 'resources', 'bash-scripts');
      const targetScriptsPath = path.join(this.specifyPath, 'scripts', 'bash');

      console.log('[createBashScripts] Bundled scripts path:', bundledScriptsPath);
      console.log('[createBashScripts] Target scripts path:', targetScriptsPath);

      // Ensure target directory exists
      await fs.mkdir(targetScriptsPath, { recursive: true });
      console.log('[createBashScripts] Created directory:', targetScriptsPath);

      try {
        // Copy all .sh files from bundled resources
        const files = await fs.readdir(bundledScriptsPath);
        console.log('[createBashScripts] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.sh')) {
            const source = path.join(bundledScriptsPath, file);
            const target = path.join(targetScriptsPath, file);
            await fs.copyFile(source, target);

            // Make scripts executable
            await fs.chmod(target, 0o755);
            copiedCount++;
            console.log('[createBashScripts] Copied and made executable:', file);
          }
        }
        console.log('[createBashScripts] Successfully created', copiedCount, 'bash scripts');
      } catch (error) {
        console.error('[createBashScripts] Error reading bundled scripts:', error);
        console.warn('[createBashScripts] No bundled bash scripts found, skipping script creation');
      }
    } catch (error) {
      console.error('[createBashScripts] Failed to create bash scripts:', error);
    }
  }

  /**
   * Create Node.js scripts from bundled resources
   */
  private async createNodeScripts(): Promise<void> {
    try {
      console.log('[createNodeScripts] Starting...');

      // Get the extension's bundled scripts - try multiple methods
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;

      // Fallback: derive from __dirname (dist/extension.js -> extension root)
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
        console.log('[createNodeScripts] Using __dirname fallback:', extensionPath);
      }

      if (!extensionPath) {
        console.warn('[createNodeScripts] Could not find extension path for Node.js scripts');
        return;
      }

      console.log('[createNodeScripts] Extension path:', extensionPath);

      const bundledScriptsPath = path.join(extensionPath, 'resources', 'node-scripts');
      const targetScriptsPath = path.join(this.specifyPath, 'scripts', 'node');

      console.log('[createNodeScripts] Bundled scripts path:', bundledScriptsPath);
      console.log('[createNodeScripts] Target scripts path:', targetScriptsPath);

      // Ensure target directory exists
      await fs.mkdir(targetScriptsPath, { recursive: true });
      console.log('[createNodeScripts] Created directory:', targetScriptsPath);

      try {
        // Copy all .js files from bundled resources
        const files = await fs.readdir(bundledScriptsPath);
        console.log('[createNodeScripts] Found bundled files:', files.length);

        let copiedCount = 0;
        for (const file of files) {
          if (file.endsWith('.js')) {
            const source = path.join(bundledScriptsPath, file);
            const target = path.join(targetScriptsPath, file);
            await fs.copyFile(source, target);

            // Make scripts executable
            await fs.chmod(target, 0o755);
            copiedCount++;
            console.log('[createNodeScripts] Copied and made executable:', file);
          }
        }
        console.log('[createNodeScripts] Successfully created', copiedCount, 'Node.js scripts');
      } catch (error) {
        console.error('[createNodeScripts] Error reading bundled scripts:', error);
        console.warn(
          '[createNodeScripts] No bundled Node.js scripts found, skipping script creation'
        );
      }
    } catch (error) {
      console.error('[createNodeScripts] Failed to create Node.js scripts:', error);
    }
  }

  /**
   * Create or update VSCode settings.json for Gofer
   */
  private async createVSCodeSettings(): Promise<void> {
    try {
      console.log('[createVSCodeSettings] Starting...');

      const vscodeDir = path.join(this.workspacePath, '.vscode');
      const settingsPath = path.join(vscodeDir, 'settings.json');

      console.log('[createVSCodeSettings] VSCode dir:', vscodeDir);
      console.log('[createVSCodeSettings] Settings path:', settingsPath);

      // Ensure .vscode directory exists
      await fs.mkdir(vscodeDir, { recursive: true });
      console.log('[createVSCodeSettings] Created directory:', vscodeDir);

      // Read existing settings or start with empty object
      let settings: any = {};
      try {
        const existingContent = await fs.readFile(settingsPath, 'utf-8');
        settings = JSON.parse(existingContent);
        console.log('[createVSCodeSettings] Loaded existing settings');
      } catch {
        console.log('[createVSCodeSettings] No existing settings found, creating new');
      }

      // Add Gofer specific settings
      const goferSettings = {
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
          console.log('[createVSCodeSettings] Added setting:', key);
        } else {
          // Merge nested objects
          settings[key] = { ...value, ...settings[key] };
          console.log('[createVSCodeSettings] Merged setting:', key);
        }
      }

      // Write back to file
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      console.log('[createVSCodeSettings] Successfully updated .vscode/settings.json');
    } catch (error) {
      console.error('[createVSCodeSettings] Failed to create VSCode settings:', error);
    }
  }

  /**
   * Create README in .specify folder
   */
  private async createReadme(): Promise<void> {
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
  }

  /**
   * Update .gitignore to exclude Gofer runtime files.
   * Adds entries for hooks directory, memory files, and state files.
   */
  private async updateGitignore(): Promise<void> {
    try {
      console.log('[updateGitignore] Starting...');

      const gitignorePath = path.join(this.workspacePath, '.gitignore');

      // All entries that should be gitignored
      const requiredEntries = [
        '.specify/hooks/',
        '.specify/memory/local.json',
        '.specify/memory/dependency-graph.json',
        '.specify/specs/*/.branch-info.json',
      ];

      // Read existing .gitignore or create empty content
      let gitignoreContent = '';
      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        console.log('[updateGitignore] Found existing .gitignore');
      } catch {
        console.log('[updateGitignore] No .gitignore found, creating new one');
      }

      // Find which entries are missing
      const missingEntries = requiredEntries.filter((entry) => !gitignoreContent.includes(entry));

      if (missingEntries.length === 0) {
        console.log('[updateGitignore] .gitignore already contains all Gofer runtime entries');
        return;
      }

      let updatedContent = gitignoreContent;

      // Ensure file ends with newline before adding
      if (updatedContent.length > 0 && !updatedContent.endsWith('\n')) {
        updatedContent += '\n';
      }

      // Check if any Gofer section header exists
      const hasOldHeader = updatedContent.includes('# Gofer state files');
      const hasNewHeader = updatedContent.includes('# Gofer runtime files');

      if (!hasOldHeader && !hasNewHeader) {
        // No existing section — add full block
        updatedContent += '\n# Gofer runtime files (auto-generated, should not be committed)\n';
        for (const entry of missingEntries) {
          updatedContent += entry + '\n';
        }
        console.log(
          `[updateGitignore] Added Gofer runtime section with ${missingEntries.length} entries`
        );
      } else {
        // Section exists — add individual missing entries
        for (const entry of missingEntries) {
          updatedContent += entry + '\n';
          console.log(`[updateGitignore] Added missing entry: ${entry}`);
        }
      }

      // Write back to file
      await fs.writeFile(gitignorePath, updatedContent);
      console.log('[updateGitignore] Successfully updated .gitignore');
    } catch (error) {
      console.error('[updateGitignore] Failed to update .gitignore:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Install Claude Code hooks configuration.
   * Creates or merges hooks into .claude/settings.json so that
   * hook scripts in .specify/scripts/hooks/ are called automatically.
   */
  async installHooksConfig(): Promise<void> {
    try {
      console.log('[installHooksConfig] Starting...');

      const claudeDir = path.join(this.workspacePath, '.claude');
      const settingsPath = path.join(claudeDir, 'settings.json');

      // Ensure .claude directory exists
      await fs.mkdir(claudeDir, { recursive: true });

      // Define hooks config (no timeout field — Claude Code uses its own default)
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

      // Read existing settings or start with empty object
      let settings: Record<string, unknown> = {};
      try {
        const existing = await fs.readFile(settingsPath, 'utf-8');
        settings = JSON.parse(existing);
        console.log('[installHooksConfig] Loaded existing settings.json');
      } catch {
        console.log('[installHooksConfig] No existing settings.json, creating new');
      }

      // Always overwrite hooks to ensure latest format
      const existingHooks = (settings.hooks as Record<string, unknown>) || {};

      for (const [hookName, hookConfig] of Object.entries(hooksConfig)) {
        existingHooks[hookName] = hookConfig;
        console.log(`[installHooksConfig] Set ${hookName} hook`);
      }

      settings.hooks = existingHooks;
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      console.log('[installHooksConfig] Successfully wrote .claude/settings.json');

      // Ensure hook scripts directory exists
      const hooksScriptDir = path.join(this.specifyPath, 'scripts', 'hooks');
      await fs.mkdir(hooksScriptDir, { recursive: true });

      // Copy hook scripts from bundled resources
      await this.copyHookScripts();
    } catch (error) {
      console.error('[installHooksConfig] Failed:', error);
      // Non-critical — don't throw
    }
  }

  /**
   * Copy hook scripts from bundled extension resources to .specify/scripts/hooks/
   */
  private async copyHookScripts(): Promise<void> {
    try {
      let extensionPath = vscode.extensions.getExtension('EnterpriseAI.gofer')?.extensionPath;
      if (!extensionPath) {
        extensionPath = path.resolve(__dirname, '..');
        console.log('[copyHookScripts] Using __dirname fallback:', extensionPath);
      }

      const bundledHooksPath = path.join(extensionPath, 'resources', 'hook-scripts');
      const targetHooksPath = path.join(this.specifyPath, 'scripts', 'hooks');
      console.log('[copyHookScripts] Source:', bundledHooksPath);
      console.log('[copyHookScripts] Target:', targetHooksPath);

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
            console.log('[copyHookScripts] Copied:', file);
          }
        }
        console.log('[copyHookScripts] Successfully copied', copiedCount, 'hook scripts');
      } catch (readErr) {
        console.log(
          '[copyHookScripts] No bundled hook scripts found at',
          bundledHooksPath,
          readErr
        );
      }
    } catch (error) {
      console.error('[copyHookScripts] Failed:', error);
    }
  }

  /**
   * Fix path references in commands, scripts, and config files
   * Changes specs/ → .specify/specs/ throughout the codebase
   */
  private async fixSpecPathReferences(): Promise<void> {
    try {
      console.log('[Fix Paths] Searching for files with specs/ references...');

      const filesToFix: string[] = [];

      // Check .claude/commands/ for command files
      const claudeCommandsDir = path.join(this.workspacePath, '.claude', 'commands');
      try {
        const files = await fs.readdir(claudeCommandsDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            filesToFix.push(path.join(claudeCommandsDir, file));
          }
        }
      } catch {
        // .claude/commands doesn't exist
      }

      // Check .specify/scripts/ for bash scripts
      const scriptsDir = path.join(this.specifyPath, 'scripts');
      try {
        const findScripts = async (dir: string) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await findScripts(fullPath);
            } else if (entry.name.endsWith('.sh') || entry.name.endsWith('.md')) {
              filesToFix.push(fullPath);
            }
          }
        };
        await findScripts(scriptsDir);
      } catch {
        // Scripts directory doesn't exist
      }

      // Check .vscode/settings.json and other config files
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

      // Now fix the path references in each file
      let fixedCount = 0;
      for (const filePath of filesToFix) {
        try {
          let content = await fs.readFile(filePath, 'utf-8');
          const originalContent = content;

          // Replace various forms of specs/ path references
          content = content.replace(/(?<!\.specify\/)specs\//g, '.specify/specs/');
          content = content.replace(
            /\$\{workspaceFolder\}\/specs\//g,
            '${workspaceFolder}/.specify/specs/'
          );
          // Note: Line 1605 already handles specs/ → .specify/specs/ with proper lookbehind
          // This redundant line was removed as it had a buggy lookahead that caused corruption

          // Fix variable assignments: SPECS_DIR="$REPO_ROOT/specs" → SPECS_DIR="$REPO_ROOT/.specify/specs"
          content = content.replace(
            /SPECS_DIR="\$REPO_ROOT\/specs"/g,
            'SPECS_DIR="$REPO_ROOT/.specify/specs"'
          );
          // Also fix without quotes
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

          if (content !== originalContent) {
            await fs.writeFile(filePath, content);
            fixedCount++;
            console.log(`[Fix Paths] Updated: ${path.relative(this.workspacePath, filePath)}`);
          }
        } catch (error) {
          console.error(`[Fix Paths] Error fixing ${filePath}:`, error);
        }
      }

      if (fixedCount > 0) {
        console.log(`[Fix Paths] Fixed path references in ${fixedCount} files`);
      } else {
        console.log('[Fix Paths] No files needed path updates');
      }
    } catch (error) {
      console.error('[Fix Paths] Error fixing path references:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Fix Claude commands to ensure they include latest features
   * Checks gofer.tasks.md for issues.md generation step
   */
  private async fixClaudeCommands(): Promise<void> {
    try {
      console.log('[Fix Commands] Checking Claude commands for updates...');

      const claudeCommandsDir = path.join(this.workspacePath, '.claude', 'commands');
      const tasksCommandPath = path.join(claudeCommandsDir, 'gofer.tasks.md');

      // Check if gofer.tasks.md exists
      try {
        await fs.access(tasksCommandPath);
      } catch {
        console.log('[Fix Commands] gofer.tasks.md not found, skipping check');
        return;
      }

      let content = await fs.readFile(tasksCommandPath, 'utf-8');
      const originalContent = content;
      let needsUpdate = false;

      // Check if it includes the issues.md generation step
      if (!content.includes('generate-issues.js')) {
        console.log('[Fix Commands] gofer.tasks.md is missing issues.md generation step');
        needsUpdate = true;

        // Find the "Report" section and add issues generation before it
        const reportSectionRegex = /(\d+)\.\s+\*\*Report\*\*:/;
        const reportMatch = content.match(reportSectionRegex);

        if (reportMatch) {
          const reportNumber = parseInt(reportMatch[1]);
          const issuesNumber = reportNumber;
          const newReportNumber = reportNumber + 1;

          // Create the issues.md generation section
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

          // Replace the old Report section
          content = content.replace(
            /\d+\.\s+\*\*Report\*\*:[^\n]*\n(?:   - [^\n]*\n)*/,
            issuesSection
          );

          console.log('[Fix Commands] Added issues.md generation step to gofer.tasks.md');
        } else {
          console.warn('[Fix Commands] Could not find Report section to update');
          needsUpdate = false;
        }
      }

      // Write the updated content if changes were made
      if (needsUpdate && content !== originalContent) {
        await fs.writeFile(tasksCommandPath, content, 'utf-8');
        console.log('[Fix Commands] Updated gofer.tasks.md with issues generation');
      } else if (content.includes('generate-issues.js')) {
        console.log('[Fix Commands] gofer.tasks.md already includes issues generation');
      }
    } catch (error) {
      console.error('[Fix Commands] Error fixing Claude commands:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Fix existing spec.md and tasks.md files to ensure proper format
   * Adds/updates YAML frontmatter to modern format and checkbox task lists
   */
  private async fixExistingSpecs(): Promise<void> {
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
            // Has YAML frontmatter - check if it's in old format or needs updating
            const existingYaml = frontmatterMatch[1];
            const bodyContent = frontmatterMatch[2];

            // Parse existing YAML
            const existingData = yaml.parse(existingYaml);

            // Check if using old format (feature: instead of id: and title:)
            if (existingData.feature && (!existingData.id || !existingData.title)) {
              console.log(
                `[Fix Specs] Converting ${specDir.name}/spec.md from old 'feature:' format to modern 'id:'/'title:' format`
              );
              needsUpdate = true;

              // Extract title from first heading in content
              const titleMatch = bodyContent.match(/^#\s+(?:Feature Overview:\s*)?(.+)$/m);
              title = titleMatch
                ? titleMatch[1].replace('Feature Specification:', '').trim()
                : existingData.feature;

              // Preserve existing values
              status = existingData.status || status;
              created = existingData.created || created;
              updated = new Date().toISOString().split('T')[0]; // Always update to today
              priority = existingData.priority || priority;
              assignee = existingData.assignee || assignee;

              // Build new frontmatter with modern format
              const newFrontmatter = `---
id: "${specDir.name}"
title: "${title}"
status: "${status}"
created: "${created}"
updated: "${updated}"
priority: "${priority}"
assignee: "${assignee}"
---

`;
              specContent = newFrontmatter + bodyContent;
            } else if (existingData.id && existingData.title) {
              // Already has modern format - just update the 'updated' date if it's old
              const existingUpdated = existingData.updated || '';
              const today = new Date().toISOString().split('T')[0];

              if (existingUpdated !== today) {
                console.log(`[Fix Specs] Updating timestamp in ${specDir.name}/spec.md`);
                needsUpdate = true;

                // Preserve all values but update the date
                title = existingData.title;
                status = existingData.status || status;
                created = existingData.created || created;
                updated = today;
                priority = existingData.priority || priority;
                assignee = existingData.assignee || assignee;

                const newFrontmatter = `---
id: "${specDir.name}"
title: "${title}"
status: "${status}"
created: "${created}"
updated: "${updated}"
priority: "${priority}"
assignee: "${assignee}"
---

`;
                specContent = newFrontmatter + bodyContent;
              }
            }
          } else {
            // No YAML frontmatter - add it
            console.log(`[Fix Specs] Adding YAML frontmatter to ${specDir.name}/spec.md`);
            needsUpdate = true;

            // Extract title from first heading or inline metadata
            const titleMatch = specContent.match(/^#\s+(?:Feature Specification:\s*)?(.+)$/m);
            if (titleMatch) {
              title = titleMatch[1].replace('Feature Specification:', '').trim();
            }

            // Try to extract metadata from inline format (GitHub Gofer style)
            const statusMatch = specContent.match(/\*\*Status\*\*:\s*(\w+)/i);
            if (statusMatch) {
              status = statusMatch[1].toLowerCase();
            }

            const createdMatch = specContent.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2})/i);
            if (createdMatch) {
              created = createdMatch[1];
            }

            // Build frontmatter
            const frontmatter = `---
id: "${specDir.name}"
title: "${title}"
status: "${status}"
created: "${created}"
updated: "${updated}"
priority: "${priority}"
assignee: "${assignee}"
---

`;
            specContent = frontmatter + specContent;
          }

          // Write updated content if needed
          if (needsUpdate) {
            await fs.writeFile(specFile, specContent);
            console.log(`[Fix Specs] Updated ${specDir.name}/spec.md`);
          }
        } catch (error) {
          console.log(`[Fix Specs] No spec.md found for ${specDir.name}:`, error);
        }

        // Fix tasks.md - ensure it has checkbox task list
        try {
          let tasksContent = await fs.readFile(tasksFile, 'utf-8');

          // Check if it has checkbox tasks at the top
          const hasCheckboxes = /^-\s+\[[xX ]\]\s+T\d+/m.test(tasksContent);

          if (!hasCheckboxes) {
            console.log(`[Fix Specs] Adding checkbox task list to ${specDir.name}/tasks.md`);

            // Extract tasks from the content
            const taskMatches = tasksContent.matchAll(
              /###\s+(T\d+)[^\n]*\n[^\n]*\n\*\*Status\*\*:\s*([^*\n]+)/g
            );
            const tasks: Array<{ id: string; completed: boolean }> = [];

            for (const match of taskMatches) {
              const id = match[1];
              const status = match[2].toLowerCase();
              const completed = status.includes('complet') || status.includes('✅');
              tasks.push({ id, completed });
            }

            // Create checkbox list
            if (tasks.length > 0) {
              let checkboxList = '\n## Task List\n\n';
              for (const task of tasks) {
                const checkbox = task.completed ? '[x]' : '[ ]';
                checkboxList += `- ${checkbox} ${task.id}\n`;
              }
              checkboxList += '\n';

              // Insert after the first heading
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
        } catch (error) {
          console.log(`[Fix Specs] No tasks.md found for ${specDir.name}`);
        }
      }

      console.log('[Fix Specs] All existing specs have been reviewed and fixed');
    } catch (error) {
      console.error('[Fix Specs] Error fixing specs:', error);
    }
  }

  /**
   * Convert string to slug format
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
