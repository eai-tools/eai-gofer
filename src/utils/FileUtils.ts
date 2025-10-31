/**
 * File System Utilities with Atomic Writes and Conflict Detection
 * Task: T012
 *
 * Features:
 * - Atomic file writes (write to temp, then rename)
 * - mtime tracking for conflict detection
 * - File conflict detection with WARNING logs (FR-017)
 *
 * @see .specify/specs/003-orchestrator-agents/contracts/file-protocol.md
 * @see .specify/specs/003-orchestrator-agents/research.md (R2)
 */

import { promises as fs } from 'fs';
import { logger } from './Logger.js';

/**
 * File system utilities with atomic writes and conflict detection
 */
export class FileUtils {
  private mtimeCache: Map<string, Date> = new Map();

  /**
   * Atomically write content to a file
   *
   * Uses write-to-temp-then-rename strategy to ensure atomicity.
   * Tracks mtime and detects external modifications (FR-017).
   *
   * @param filePath - Target file path
   * @param content - Content to write
   * @throws Error if path is invalid or write fails
   */
  async atomicWrite(filePath: string, content: string): Promise<void> {
    if (!filePath || filePath.trim() === '') {
      throw new Error('File path cannot be empty');
    }

    const tempPath = `${filePath}.tmp`;

    try {
      // Check for external modifications (FR-017)
      await this.detectConflict(filePath);

      // Write to temporary file
      await fs.writeFile(tempPath, content, 'utf-8');

      // Atomically rename to target
      await fs.rename(tempPath, filePath);

      // Update mtime cache
      const stats = await fs.stat(filePath);
      this.mtimeCache.set(filePath, stats.mtime);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Get cached mtime for a file
   *
   * @param filePath - File path
   * @returns Cached mtime or undefined if not tracked
   */
  getMtime(filePath: string): Date | undefined {
    return this.mtimeCache.get(filePath);
  }

  /**
   * Detect if file was modified externally since last write
   *
   * Implements last-write-wins with WARNING log (FR-017, R2).
   *
   * @param filePath - File path to check
   */
  private async detectConflict(filePath: string): Promise<void> {
    const cachedMtime = this.mtimeCache.get(filePath);

    if (!cachedMtime) {
      // First write, no conflict possible
      return;
    }

    try {
      const stats = await fs.stat(filePath);
      const currentMtime = stats.mtime;

      // Check if file was modified externally
      if (currentMtime.getTime() > cachedMtime.getTime()) {
        logger.warn({
          event: 'file_conflict_detected',
          context: {
            path: filePath,
            message: 'File modified externally during task execution',
            action: 'overwriting_with_status_update',
            lastKnown: cachedMtime.toISOString(),
            current: currentMtime.toISOString(),
          },
        });
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, no conflict
        return;
      }
      // Other errors are not conflicts
    }
  }
}
