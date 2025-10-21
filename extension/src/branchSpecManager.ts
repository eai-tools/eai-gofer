import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Manages branch-specific .specify folders
 *
 * Structure:
 * - .specify/ (main branch, shared resources)
 * - .specify/<branch-name>/ (branch-specific extensions)
 *
 * Branch-specific folders inherit from main and can override/extend
 */
export class BranchSpecManager {
  private workspacePath: string;
  private currentBranch: string;
  private mainBranch: string = 'main';

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.currentBranch = this.getCurrentBranch();
    this.mainBranch = this.getMainBranch();
  }

  /**
   * Get current git branch name
   */
  private getCurrentBranch(): string {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.workspacePath,
        encoding: 'utf-8',
      }).trim();
      return branch;
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return 'main';
    }
  }

  /**
   * Get main branch name (main or master)
   */
  private getMainBranch(): string {
    try {
      // Try to get default branch from remote
      const remoteBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo ""', {
        cwd: this.workspacePath,
        encoding: 'utf-8',
      }).trim();

      if (remoteBranch) {
        return remoteBranch.replace('refs/remotes/origin/', '');
      }

      // Fall back to checking if main or master exists
      const branches = execSync('git branch -a', {
        cwd: this.workspacePath,
        encoding: 'utf-8',
      }).trim();

      if (branches.includes('main')) {
        return 'main';
      } else if (branches.includes('master')) {
        return 'master';
      }
    } catch (error) {
      console.error('Failed to get main branch:', error);
    }

    return 'main';
  }

  /**
   * Get the effective .specify path for current branch
   * Returns branch-specific path if not on main branch
   */
  getSpecifyPath(): string {
    if (this.isMainBranch()) {
      return path.join(this.workspacePath, '.specify');
    }
    return path.join(this.workspacePath, '.specify', this.currentBranch);
  }

  /**
   * Get the main .specify path (always returns main)
   */
  getMainSpecifyPath(): string {
    return path.join(this.workspacePath, '.specify');
  }

  /**
   * Check if current branch is main branch
   */
  isMainBranch(): boolean {
    return this.currentBranch === this.mainBranch || this.currentBranch === 'master';
  }

  /**
   * Get current branch name
   */
  getBranch(): string {
    return this.currentBranch;
  }

  /**
   * Initialize branch-specific .specify folder structure
   * Creates symlinks/references to main folder and sets up branch-specific extensions
   */
  async initializeBranchStructure(): Promise<void> {
    if (this.isMainBranch()) {
      // On main branch, just ensure .specify exists
      const mainPath = this.getMainSpecifyPath();
      await this.ensureDirectory(mainPath);
      await this.ensureDirectory(path.join(mainPath, 'specs'));
      await this.ensureDirectory(path.join(mainPath, 'memory'));
      await this.ensureDirectory(path.join(mainPath, 'templates'));
      return;
    }

    const branchPath = this.getSpecifyPath();
    const mainPath = this.getMainSpecifyPath();

    // Ensure branch-specific directory exists
    await this.ensureDirectory(branchPath);

    // Create branch-specific folders
    await this.ensureDirectory(path.join(branchPath, 'specs'));
    await this.ensureDirectory(path.join(branchPath, 'memory'));

    // Create a README explaining the structure
    const readmePath = path.join(branchPath, 'README.md');
    const readmeExists = await this.fileExists(readmePath);

    if (!readmeExists) {
      await fs.writeFile(
        readmePath,
        `# Branch-Specific Specifications

This folder contains specifications specific to the \`${this.currentBranch}\` branch.

## Structure

- **specs/**: Branch-specific specifications that extend or override main branch specs
- **memory/**: Branch-specific context and learnings
- **Main specs**: Inherited from \`.specify/specs/\` (parent directory)
- **Main constitution**: Inherited from \`.specify/memory/constitution.md\`

## Usage

Specifications in this folder are only active when working on the \`${this.currentBranch}\` branch.
When you switch branches, the SpecGofer extension will automatically load the appropriate specs.

## Inheritance

- Specs with the same ID as main branch specs will override them
- New specs are branch-specific and won't affect main branch
- The constitution is inherited from main branch (cannot be overridden per branch)
`,
        'utf-8'
      );
    }

    // Create a link info file
    const linkInfoPath = path.join(branchPath, '.branch-info.json');
    await fs.writeFile(
      linkInfoPath,
      JSON.stringify(
        {
          branch: this.currentBranch,
          mainBranch: this.mainBranch,
          created: new Date().toISOString(),
          inheritsFrom: '../',
        },
        null,
        2
      ),
      'utf-8'
    );
  }

  /**
   * Get all specs for current branch (including inherited from main)
   */
  async getAllSpecPaths(): Promise<string[]> {
    const specs: string[] = [];
    const mainSpecsPath = path.join(this.getMainSpecifyPath(), 'specs');
    const branchSpecsPath = path.join(this.getSpecifyPath(), 'specs');

    // Get main branch specs
    try {
      const mainEntries = await fs.readdir(mainSpecsPath, { withFileTypes: true });
      for (const entry of mainEntries) {
        if (entry.isDirectory()) {
          specs.push(path.join(mainSpecsPath, entry.name));
        }
      }
    } catch (error) {
      // Main specs may not exist yet
      console.log('No main specs found');
    }

    // Get branch-specific specs (if not on main branch)
    if (!this.isMainBranch()) {
      try {
        const branchEntries = await fs.readdir(branchSpecsPath, { withFileTypes: true });
        for (const entry of branchEntries) {
          if (entry.isDirectory()) {
            const branchSpecPath = path.join(branchSpecsPath, entry.name);
            // Override main spec if it exists
            const mainSpecIndex = specs.findIndex((s) => s.endsWith(entry.name));
            if (mainSpecIndex >= 0) {
              specs[mainSpecIndex] = branchSpecPath;
            } else {
              specs.push(branchSpecPath);
            }
          }
        }
      } catch (error) {
        // Branch specs may not exist yet
        console.log('No branch-specific specs found');
      }
    }

    return specs;
  }

  /**
   * Get constitution path (always from main branch)
   */
  getConstitutionPath(): string {
    return path.join(this.getMainSpecifyPath(), 'memory', 'constitution.md');
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get branch-specific memory path
   */
  getBranchMemoryPath(): string {
    return path.join(this.getSpecifyPath(), 'memory');
  }

  /**
   * Update branch info when branch changes
   */
  async refreshBranch(): Promise<void> {
    this.currentBranch = this.getCurrentBranch();
    await this.initializeBranchStructure();
  }
}
