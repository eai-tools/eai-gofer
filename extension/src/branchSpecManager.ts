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
   * Always returns .specify since we use the Spec Kit format
   */
  getSpecifyPath(): string {
    return path.join(this.workspacePath, '.specify');
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
   * Creates branch info file in .specify/specs/<branch-name>/ folder
   */
  async initializeBranchStructure(): Promise<void> {
    const mainPath = this.getMainSpecifyPath();
    
    // Ensure main .specify structure exists
    await this.ensureDirectory(mainPath);
    await this.ensureDirectory(path.join(mainPath, 'specs'));
    await this.ensureDirectory(path.join(mainPath, 'memory'));
    await this.ensureDirectory(path.join(mainPath, 'templates'));

    // If on main branch, nothing more to do
    if (this.isMainBranch()) {
      return;
    }

    // For feature branches, create .branch-info.json inside .specify/specs/<branch-name>/
    const branchSpecPath = path.join(mainPath, 'specs', this.currentBranch);
    
    // Only create .branch-info.json if the spec folder exists
    const specFolderExists = await this.fileExists(branchSpecPath);
    if (!specFolderExists) {
      return;
    }

    // Create a branch info file
    const linkInfoPath = path.join(branchSpecPath, '.branch-info.json');
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
   * Get all specs for current branch
   * Since we use Spec Kit format, all specs are in .specify/specs/
   */
  async getAllSpecPaths(): Promise<string[]> {
    const specs: string[] = [];
    const specsPath = path.join(this.getMainSpecifyPath(), 'specs');

    try {
      const entries = await fs.readdir(specsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          specs.push(path.join(specsPath, entry.name));
        }
      }
    } catch (error) {
      console.log('No specs found in .specify/specs/');
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
