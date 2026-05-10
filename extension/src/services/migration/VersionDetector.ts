/**
 * Version Detector Service
 *
 * Detects .specify folder format and version information.
 * Extracted from goferMigrator.ts (2499 LOC → focused service).
 *
 * Engineering Remediation Phase 4 - T026
 */

import { injectable } from 'tsyringe';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../Logger';

export type FormatType = 'none' | 'legacy-json' | 'gofer' | 'mixed';

export interface VersionInfo {
  format: FormatType;
  needsUpgrade: boolean;
  details: string;
}

/**
 * Version Detector Service
 *
 * Responsible for detecting the current .specify folder format
 * and determining if an upgrade is needed.
 */
@injectable()
export class VersionDetector {
  constructor(private readonly logger: Logger) {}

  /**
   * Check if .specify folder exists
   *
   * @param workspacePath - Root path of the workspace
   * @returns True if .specify folder exists
   */
  public async exists(workspacePath: string): Promise<boolean> {
    try {
      const specifyPath = path.join(workspacePath, '.specify');
      await fs.access(specifyPath);
      return true;
    } catch {
      return this.hasRootLegacySpecBundle(workspacePath);
    }
  }

  /**
   * Detect the format of .specify folder
   *
   * Detects one of four format types:
   * - 'none': No .specify folder exists
   * - 'legacy-json': Old JSON format (needs upgrade)
   * - 'gofer': Current Gofer Markdown format (up to date)
   * - 'mixed': Contains both formats (needs migration)
   *
   * @param workspacePath - Root path of the workspace
   * @returns Format type detected
   */
  public async detectFormat(workspacePath: string): Promise<FormatType> {
    const hasRootLegacyBundle = await this.hasRootLegacySpecBundle(workspacePath);
    const exists = await this.exists(workspacePath);
    if (!exists) {
      this.logger.debug('VersionDetector', 'No .specify folder found', { workspacePath });
      return hasRootLegacyBundle ? 'legacy-json' : 'none';
    }

    const specifyPath = path.join(workspacePath, '.specify');

    const hasSpecs = await this.hasDirectory(specifyPath, 'specs');
    const hasMemory = await this.hasDirectory(specifyPath, 'memory');
    const hasTemplates = await this.hasDirectory(specifyPath, 'templates');
    const hasJsonSpecs = await this.hasJsonSpecs(specifyPath);


    // Gofer format has specs/, memory/, templates/
    const isGofer = hasSpecs && hasMemory && hasTemplates;

    // Legacy format has JSON files in root
    const isLegacy = !hasSpecs && (hasJsonSpecs || hasRootLegacyBundle);

    if (isGofer && (hasJsonSpecs || hasRootLegacyBundle)) {
      this.logger.info('VersionDetector', 'Mixed format detected', { workspacePath });
      return 'mixed'; // Has both formats
    } else if (isGofer) {
      this.logger.debug('VersionDetector', 'Gofer format detected', { workspacePath });
      return 'gofer';
    } else if (isLegacy) {
      this.logger.info('VersionDetector', 'Legacy JSON format detected', { workspacePath });
      return 'legacy-json';
    } else {
      this.logger.warn('VersionDetector', 'Mixed/partial format detected', { workspacePath });
      return 'mixed'; // Partial or unknown
    }
  }

  /**
   * Get version info from .specify folder
   *
   * Returns detailed version information including:
   * - Current format type
   * - Whether an upgrade is needed
   * - Details about the detected format
   *
   * @param workspacePath - Root path of the workspace
   * @returns Version information object
   */
  public async getVersionInfo(workspacePath: string): Promise<VersionInfo> {
    const format = await this.detectFormat(workspacePath);

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
          format: 'none',
          needsUpgrade: false,
          details: 'Unknown format',
        };
    }
  }

  /**
   * Compare two semantic versions
   *
   * Returns:
   * - Negative number if version a < version b
   * - 0 if versions are equal
   * - Positive number if version a > version b
   *
   * Supports semantic versioning (e.g., "1.2.3", "2.0.0-beta")
   *
   * @param a - First version string
   * @param b - Second version string
   * @returns Comparison result (-1, 0, or 1)
   */
  public compareVersions(a: string, b: string): number {
    // Remove 'v' prefix if present
    const cleanA = a.replace(/^v/, '');
    const cleanB = b.replace(/^v/, '');

    // Split into parts (major.minor.patch)
    const partsA = cleanA.split(/[.-]/).map((part) => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });

    const partsB = cleanB.split(/[.-]/).map((part) => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });

    // Compare each part
    const maxLength = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA < partB) {
        return -1;
      } else if (partA > partB) {
        return 1;
      }
    }

    // Versions are equal
    return 0;
  }

  /**
   * Check if a directory exists in .specify
   *
   * @param specifyPath - Path to .specify folder
   * @param name - Directory name to check
   * @returns True if directory exists
   */
  private async hasDirectory(specifyPath: string, name: string): Promise<boolean> {
    try {
      const dirPath = path.join(specifyPath, name);
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if there are JSON spec files
   *
   * @param specifyPath - Path to .specify folder
   * @returns True if JSON spec files exist
   */
  private async hasJsonSpecs(specifyPath: string): Promise<boolean> {
    try {
      const files = await fs.readdir(specifyPath);
      const hasJson = files.some((f) => f.endsWith('.json') && f !== 'spec-schema.json');
      return hasJson;
    } catch {
      return false;
    }
  }

  /**
   * Check for legacy root-level specs.json bundle.
   */
  private async hasRootLegacySpecBundle(workspacePath: string): Promise<boolean> {
    try {
      const bundlePath = path.join(workspacePath, 'specs.json');
      const stat = await fs.stat(bundlePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get the current version as a string
   *
   * Returns the detected format type as a version string.
   * This is used for logging and display purposes.
   *
   * @param workspacePath - Root path of the workspace
   * @returns Version string
   */
  public async detectCurrentVersion(workspacePath: string): Promise<string> {
    const format = await this.detectFormat(workspacePath);
    return format;
  }
}
