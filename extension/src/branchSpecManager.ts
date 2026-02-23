import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Manages branch-specific .specify folders
 *
 * Structure:
 * - .specify/ (main branch, shared resources)
 * - .specify/<branch-name>/ (branch-specific extensions)
 *
 * Branch-specific folders inherit from main and can override/extend
 *
 * IMPORTANT: All git operations are async (no execSync) to avoid
 * blocking the Node.js event loop during extension activation.
 */
export class BranchSpecManager {
  private workspacePath: string;
  private currentBranch: string = 'main';
  private mainBranch: string = 'main';
  private _initialized: boolean = false;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    // Git operations are deferred to initialize() to avoid blocking
    // the event loop with synchronous execSync calls.
  }

  /**
   * Async initialization - must be called after construction.
   * Replaces the previous execSync calls in the constructor that
   * blocked the event loop for up to 15 seconds.
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }
    this.currentBranch = await this.detectCurrentBranch();
    this.mainBranch = await this.detectMainBranch();
    this._initialized = true;
  }

  /**
   * Get current git branch name (async, non-blocking)
   */
  private async detectCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: this.workspacePath,
        timeout: 5000,
      });
      return stdout.trim() || 'main';
    } catch (error) {
      console.warn('[BranchSpecManager] Failed to get current branch:', error);
      return 'main';
    }
  }

  /**
   * Get main branch name (async, non-blocking)
   */
  private async detectMainBranch(): Promise<string> {
    try {
      // Try to get default branch from remote
      const { stdout: remoteBranch } = await execFileAsync(
        'git',
        ['symbolic-ref', 'refs/remotes/origin/HEAD'],
        { cwd: this.workspacePath, timeout: 5000 }
      );

      const trimmed = remoteBranch.trim();
      if (trimmed) {
        return trimmed.replace('refs/remotes/origin/', '');
      }
    } catch {
      // Remote HEAD not set — fall through to branch check
    }

    try {
      // Fall back to checking if main or master exists
      const { stdout: branches } = await execFileAsync('git', ['branch', '-a'], {
        cwd: this.workspacePath,
        timeout: 5000,
      });

      if (branches.includes('main')) {
        return 'main';
      } else if (branches.includes('master')) {
        return 'master';
      }
    } catch (error) {
      console.warn('[BranchSpecManager] Failed to detect main branch:', error);
    }

    return 'main';
  }

  /**
   * Get the effective .specify path for current branch
   * Always returns .specify since we use the Gofer format
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
    // Ensure git detection has completed
    if (!this._initialized) {
      await this.initialize();
    }

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
   * Since we use Gofer format, all specs are in .specify/specs/
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
    } catch (error) {}

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
    this.currentBranch = await this.detectCurrentBranch();
    await this.initializeBranchStructure();
  }
}
