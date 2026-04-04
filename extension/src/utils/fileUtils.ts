import * as fs from 'fs/promises';
import * as path from 'path';
import { getWorkspacePaths, VALIDATION } from '../config';
import { Logger } from './logger';

/**
 * File system utilities for .specify/ folder operations
 * Provides safe, validated file operations with proper error handling
 */

export interface FileInfo {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  size?: number;
  modified?: Date;
  created?: Date;
}

export interface DirectoryStructure {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryStructure[];
  size?: number;
  modified?: Date;
}

/**
 * Utility class for file system operations
 */
export class FileUtils {
  private static logger = Logger.for('FileUtils');

  /**
   * Check if a file or directory exists
   */
  public static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file information
   */
  public static async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        exists: true,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
      };
    } catch {
      return {
        path: filePath,
        exists: false,
        isDirectory: false,
        isFile: false,
      };
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  public static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.debug(`Directory ensured: ${dirPath}`);
    } catch (error) {
      this.logger.error(`Failed to ensure directory: ${dirPath}`, error as Error);
      throw error;
    }
  }

  /**
   * Read a text file safely
   */
  public static async readTextFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.logger.debug(`Read file: ${filePath} (${content.length} chars)`);
      return content;
    } catch (error) {
      this.logger.error(`Failed to read file: ${filePath}`, error as Error);
      throw error;
    }
  }

  /**
   * Write a text file safely
   */
  public static async writeTextFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
      this.logger.debug(`Wrote file: ${filePath} (${content.length} chars)`);
    } catch (error) {
      this.logger.error(`Failed to write file: ${filePath}`, error as Error);
      throw error;
    }
  }

  /**
   * Append to a text file safely
   */
  public static async appendTextFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(filePath));
      await fs.appendFile(filePath, content, 'utf-8');
      this.logger.debug(`Appended to file: ${filePath} (${content.length} chars)`);
    } catch (error) {
      this.logger.error(`Failed to append to file: ${filePath}`, error as Error);
      throw error;
    }
  }

  /**
   * Copy a file
   */
  public static async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.copyFile(sourcePath, destinationPath);
      this.logger.debug(`Copied file: ${sourcePath} → ${destinationPath}`);
    } catch (error) {
      this.logger.error(`Failed to copy file: ${sourcePath} → ${destinationPath}`, error as Error);
      throw error;
    }
  }

  /**
   * Move/rename a file
   */
  public static async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await this.ensureDirectory(path.dirname(destinationPath));
      await fs.rename(sourcePath, destinationPath);
      this.logger.debug(`Moved file: ${sourcePath} → ${destinationPath}`);
    } catch (error) {
      this.logger.error(`Failed to move file: ${sourcePath} → ${destinationPath}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  public static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.debug(`Deleted file: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete a directory recursively
   */
  public static async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      this.logger.debug(`Deleted directory: ${dirPath}`);
    } catch (error) {
      this.logger.error(`Failed to delete directory: ${dirPath}`, error as Error);
      throw error;
    }
  }

  /**
   * List directory contents
   */
  public static async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath);
      this.logger.debug(`Listed directory: ${dirPath} (${entries.length} entries)`);
      return entries;
    } catch (error) {
      this.logger.error(`Failed to list directory: ${dirPath}`, error as Error);
      throw error;
    }
  }

  /**
   * Get directory structure recursively
   */
  public static async getDirectoryStructure(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): Promise<DirectoryStructure> {
    const info = await this.getFileInfo(dirPath);
    const structure: DirectoryStructure = {
      name: path.basename(dirPath),
      path: dirPath,
      type: info.isDirectory ? 'directory' : 'file',
      size: info.size,
      modified: info.modified,
    };

    if (info.isDirectory && currentDepth < maxDepth) {
      try {
        const entries = await this.listDirectory(dirPath);
        structure.children = [];

        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry);
          const childStructure = await this.getDirectoryStructure(entryPath, maxDepth, currentDepth + 1);
          structure.children.push(childStructure);
        }

        // Sort children: directories first, then files, both alphabetically
        structure.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      } catch (error) {
        this.logger.warn(`Failed to read directory contents: ${dirPath}`, undefined, error as Error);
      }
    }

    return structure;
  }

  /**
   * Find files matching a pattern
   */
  public static async findFiles(rootPath: string, pattern: RegExp, maxResults: number = 100): Promise<string[]> {
    const results: string[] = [];

    async function search(currentPath: string, depth: number = 0): Promise<void> {
      if (results.length >= maxResults || depth > 10) {
        return;
      }

      try {
        const entries = await fs.readdir(currentPath);

        for (const entry of entries) {
          if (results.length >= maxResults) {
            break;
          }

          const fullPath = path.join(currentPath, entry);
          const info = await FileUtils.getFileInfo(fullPath);

          if (info.isFile && pattern.test(entry)) {
            results.push(fullPath);
          } else if (info.isDirectory && !entry.startsWith('.') && entry !== 'node_modules') {
            await search(fullPath, depth + 1);
          }
        }
      } catch (_error) {
        // Skip directories we can't read
      }
    }

    await search(rootPath);
    this.logger.debug(`Found ${results.length} files matching pattern in ${rootPath}`);
    return results;
  }

  /**
   * Get total size of directory
   */
  public static async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    async function calculateSize(currentPath: string): Promise<void> {
      try {
        const info = await FileUtils.getFileInfo(currentPath);

        if (info.isFile) {
          totalSize += info.size || 0;
        } else if (info.isDirectory) {
          const entries = await fs.readdir(currentPath);
          for (const entry of entries) {
            await calculateSize(path.join(currentPath, entry));
          }
        }
      } catch (_error) {
        // Skip files/directories we can't access
      }
    }

    await calculateSize(dirPath);
    this.logger.debug(`Directory size: ${dirPath} = ${totalSize} bytes`);
    return totalSize;
  }
}

/**
 * .specify/ folder specific utilities
 */
export class SpecifyFolderUtils {
  private static logger = Logger.for('SpecifyFolderUtils');

  /**
   * Check if .specify folder exists and is valid
   */
  public static async validateSpecifyFolder(workspacePath: string): Promise<{ isValid: boolean; errors: string[] }> {
    const paths = getWorkspacePaths(workspacePath);
    const errors: string[] = [];

    // Check if .specify exists
    if (!await FileUtils.exists(paths.specify)) {
      errors.push('.specify folder does not exist');
      return { isValid: false, errors };
    }

    // Check required subdirectories
    if (!await FileUtils.exists(paths.specs)) {
      errors.push('.specify/specs/ folder missing');
    }

    if (!await FileUtils.exists(paths.memory)) {
      errors.push('memory/ folder missing');
    }

    // Check constitution file
    if (!await FileUtils.exists(paths.constitution)) {
      errors.push('constitution.md missing');
    }

    const isValid = errors.length === 0;
    this.logger.debug(`Validated .specify folder: ${isValid ? 'valid' : 'invalid'}`, { errors });

    return { isValid, errors };
  }

  /**
   * Get all spec directories
   */
  public static async getSpecDirectories(workspacePath: string): Promise<string[]> {
    const paths = getWorkspacePaths(workspacePath);
    
    if (!await FileUtils.exists(paths.specs)) {
      return [];
    }

    try {
      const entries = await FileUtils.listDirectory(paths.specs);
      const specDirs: string[] = [];

      for (const entry of entries) {
        const specPath = path.join(paths.specs, entry);
        const info = await FileUtils.getFileInfo(specPath);
        
        if (info.isDirectory) {
          // Check if it has a spec.md file
          const specFile = path.join(specPath, 'spec.md');
          if (await FileUtils.exists(specFile)) {
            specDirs.push(specPath);
          }
        }
      }

      this.logger.debug(`Found ${specDirs.length} spec directories`);
      return specDirs.sort();
    } catch (error) {
      this.logger.error('Failed to get spec directories', error as Error);
      return [];
    }
  }

  /**
   * Get all spec files with metadata
   */
  public static async getSpecFiles(workspacePath: string): Promise<Array<{ path: string; name: string; modified: Date }>> {
    const specDirs = await this.getSpecDirectories(workspacePath);
    const specFiles: Array<{ path: string; name: string; modified: Date }> = [];

    for (const specDir of specDirs) {
      const specFile = path.join(specDir, 'spec.md');
      const info = await FileUtils.getFileInfo(specFile);
      
      if (info.exists && info.isFile) {
        specFiles.push({
          path: specFile,
          name: path.basename(specDir),
          modified: info.modified || new Date(0),
        });
      }
    }

    // Sort by modification date (newest first)
    specFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    
    this.logger.debug(`Found ${specFiles.length} spec files`);
    return specFiles;
  }

  /**
   * Create the basic .specify folder structure
   */
  public static async createSpecifyStructure(workspacePath: string): Promise<void> {
    const paths = getWorkspacePaths(workspacePath);

    try {
      // Create directories
      await FileUtils.ensureDirectory(paths.specify);
      await FileUtils.ensureDirectory(paths.specs);
      await FileUtils.ensureDirectory(paths.memory);
      await FileUtils.ensureDirectory(paths.templates);

      // Create basic constitution if it doesn't exist
      if (!await FileUtils.exists(paths.constitution)) {
        const constitutionContent = `# Project Constitution

## Core Principles

### Code Quality
- Use TypeScript with strict mode enabled
- Maintain test coverage above 80%
- Follow Test-Driven Development (TDD)
- Keep files under 300 lines
- No \`any\` types allowed

### Security
- Never commit secrets or API keys
- Use environment variables for configuration
- JWT tokens expire within 1 hour
- Validate all user inputs

### Performance
- API responses under 500ms (95th percentile)
- UI interactions under 100ms response time
- Optimize for mobile and desktop
- Use lazy loading where appropriate

### Documentation
- All public APIs documented
- README files in all packages
- Inline comments for complex logic
- Architecture decisions recorded

## Development Workflow

1. Create specification first
2. Write tests
3. Implement feature
4. Validate against constitution
5. Deploy with monitoring

## Quality Gates

All code must pass:
- TypeScript compilation
- ESLint checks
- Unit tests (80%+ coverage)
- Integration tests
- Security scans
- Performance benchmarks

*This constitution is enforced by automated tools and peer review.*
`;

        await FileUtils.writeTextFile(paths.constitution, constitutionContent);
      }

      // Create .gitignore entries
      const gitignorePath = path.join(workspacePath, '.gitignore');
      const gitignoreEntries = [
        '# Gofer temp files',
        '.claude-input.txt',
        '.claude-output.txt',
        '',
        '# Gofer cache',
        '.specify/.cache/',
        '.specify/_backup/',
        '',
      ].join('\n');

      if (await FileUtils.exists(gitignorePath)) {
        const existingContent = await FileUtils.readTextFile(gitignorePath);
        if (!existingContent.includes('.claude-input.txt')) {
          await FileUtils.appendTextFile(gitignorePath, '\n' + gitignoreEntries);
        }
      } else {
        await FileUtils.writeTextFile(gitignorePath, gitignoreEntries);
      }

      this.logger.info('Created .specify folder structure');
    } catch (error) {
      this.logger.error('Failed to create .specify structure', error as Error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  public static async cleanupTempFiles(workspacePath: string): Promise<void> {
    const paths = getWorkspacePaths(workspacePath);
    const tempFiles = [paths.claudeInput, paths.claudeOutput];

    let cleanedCount = 0;
    for (const tempFile of tempFiles) {
      if (await FileUtils.exists(tempFile)) {
        try {
          await FileUtils.deleteFile(tempFile);
          cleanedCount++;
        } catch (error) {
          this.logger.warn(`Failed to clean temp file: ${tempFile}`, undefined, error as Error);
        }
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} temporary files`);
    }
  }

  /**
   * Validate file is within .specify folder (security check)
   */
  public static validateSpecifyPath(filePath: string, workspacePath: string): boolean {
    return VALIDATION.isSpecifyPath(filePath, workspacePath);
  }

  /**
   * Get .specify folder statistics
   */
  public static async getSpecifyStats(workspacePath: string): Promise<{
    totalSpecs: number;
    totalFiles: number;
    totalSize: number;
    lastModified: Date;
  }> {
    const paths = getWorkspacePaths(workspacePath);
    
    if (!await FileUtils.exists(paths.specify)) {
      return {
        totalSpecs: 0,
        totalFiles: 0,
        totalSize: 0,
        lastModified: new Date(0),
      };
    }

    const specFiles = await this.getSpecFiles(workspacePath);
    const structure = await FileUtils.getDirectoryStructure(paths.specify, 5);
    const totalSize = await FileUtils.getDirectorySize(paths.specify);

    // Count all files recursively
    function countFiles(dir: DirectoryStructure): number {
      let count = dir.type === 'file' ? 1 : 0;
      if (dir.children) {
        for (const child of dir.children) {
          count += countFiles(child);
        }
      }
      return count;
    }

    const totalFiles = countFiles(structure);
    const lastModified = specFiles.length > 0 ? specFiles[0].modified : new Date(0);

    return {
      totalSpecs: specFiles.length,
      totalFiles,
      totalSize,
      lastModified,
    };
  }
}
