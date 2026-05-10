/**
 * Path Sanitizer
 *
 * Validates and sanitizes file paths to prevent path traversal attacks
 * and unauthorized file system access.
 *
 * Engineering Remediation Phase 5 - T040 (US8 - Security)
 */

import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Path validation result
 */
export interface PathValidationResult {
  valid: boolean;
  sanitizedPath: string | null;
  error?: string;
}

/**
 * Sanitize and validate file path
 *
 * Security checks:
 * - Prevents path traversal (../, ../../, etc.)
 * - Ensures path is within workspace
 * - Rejects absolute paths outside workspace
 * - Normalizes path separators
 * - Blocks suspicious patterns (null bytes, etc.)
 *
 * @param inputPath - User-provided path
 * @param workspacePath - Optional workspace root (default: first workspace folder)
 * @returns Sanitized absolute path or null if invalid
 *
 * @example
 * ```typescript
 * // Valid relative path
 * sanitizePath('.specify/specs/feature/spec.md') // → '/workspace/.specify/specs/feature/spec.md'
 *
 * // Invalid path traversal
 * sanitizePath('../../../etc/passwd') // → null
 *
 * // Invalid absolute path
 * sanitizePath('/etc/passwd') // → null
 * ```
 */
export function sanitizePath(inputPath: string, workspacePath?: string): string | null {
  const result = validatePath(inputPath, workspacePath);
  return result.sanitizedPath;
}

/**
 * Validate path with detailed error information
 *
 * @param inputPath - User-provided path
 * @param workspacePath - Optional workspace root
 * @returns Validation result with error details
 */
export function validatePath(inputPath: string, workspacePath?: string): PathValidationResult {
  // Get workspace path
  const workspace =
    workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspace) {
    return {
      valid: false,
      sanitizedPath: null,
      error: 'No workspace folder open',
    };
  }

  // Check for null bytes (common injection technique)
  if (inputPath.includes('\0')) {
    return {
      valid: false,
      sanitizedPath: null,
      error: 'Path contains null byte',
    };
  }

  // Check for suspicious characters
  if (inputPath.match(/[<>"|?*]/)) {
    return {
      valid: false,
      sanitizedPath: null,
      error: 'Path contains invalid characters',
    };
  }

  // Normalize path separators
  const normalizedPath = inputPath.replace(/\\/g, '/');

  // Resolve to absolute path
  let resolvedPath: string;

  if (path.isAbsolute(normalizedPath)) {
    // Absolute path - verify it's within workspace
    resolvedPath = path.normalize(normalizedPath);
  } else {
    // Relative path - resolve against workspace
    resolvedPath = path.resolve(workspace, normalizedPath);
  }

  // Normalize to remove any remaining . or .. segments
  resolvedPath = path.normalize(resolvedPath);

  // Verify resolved path is within workspace
  const workspaceNormalized = path.normalize(workspace);

  if (!isPathWithinWorkspace(resolvedPath, workspaceNormalized)) {
    return {
      valid: false,
      sanitizedPath: null,
      error: `Path escapes workspace: ${resolvedPath} is outside ${workspaceNormalized}`,
    };
  }

  // Check for path traversal patterns (even after normalization)
  if (hasPathTraversalPattern(inputPath)) {
    return {
      valid: false,
      sanitizedPath: null,
      error: 'Path contains traversal pattern (../)',
    };
  }

  return {
    valid: true,
    sanitizedPath: resolvedPath,
  };
}

/**
 * Check if path is within workspace boundaries
 *
 * @param targetPath - Resolved absolute path
 * @param workspacePath - Workspace root path
 * @returns True if path is within workspace
 */
function isPathWithinWorkspace(targetPath: string, workspacePath: string): boolean {
  // Ensure paths use consistent separators
  const normalizedTarget = targetPath.replace(/\\/g, '/');
  const normalizedWorkspace = workspacePath.replace(/\\/g, '/');

  // Check if target starts with workspace path
  // Add trailing slash to prevent partial matches
  const workspaceWithSlash = normalizedWorkspace.endsWith('/')
    ? normalizedWorkspace
    : normalizedWorkspace + '/';

  return (
    normalizedTarget === normalizedWorkspace ||
    normalizedTarget.startsWith(workspaceWithSlash)
  );
}

/**
 * Check for path traversal patterns
 *
 * Detects patterns like:
 * - ../
 * - ..\\
 * - %2e%2e/ (URL encoded)
 * - %252e%252e/ (double encoded)
 *
 * @param inputPath - Raw input path
 * @returns True if traversal pattern detected
 */
function hasPathTraversalPattern(inputPath: string): boolean {
  const patterns = [
    /\.\.\//g, // ../
    /\.\.\\/g, // ..\
    /%2e%2e\//gi, // URL encoded ../
    /%252e%252e\//gi, // Double URL encoded ../
    /\.\.%2f/gi, // Mixed encoding
    /\.\.%5c/gi, // Mixed encoding (backslash)
  ];

  return patterns.some((pattern) => pattern.test(inputPath));
}

/**
 * Sanitize array of paths
 *
 * @param paths - Array of user-provided paths
 * @param workspacePath - Optional workspace root
 * @returns Array of sanitized paths (invalid paths filtered out)
 */
export function sanitizePaths(paths: string[], workspacePath?: string): string[] {
  return paths
    .map((p) => sanitizePath(p, workspacePath))
    .filter((p): p is string => p !== null);
}

/**
 * Sanitize path or throw error
 *
 * @param inputPath - User-provided path
 * @param workspacePath - Optional workspace root
 * @returns Sanitized path
 * @throws Error if path is invalid
 */
export function sanitizePathOrThrow(inputPath: string, workspacePath?: string): string {
  const result = validatePath(inputPath, workspacePath);

  if (!result.valid) {
    throw new Error(`Invalid path: ${result.error}`);
  }

  return result.sanitizedPath!;
}

/**
 * Check if path is safe (without sanitizing)
 *
 * @param inputPath - User-provided path
 * @param workspacePath - Optional workspace root
 * @returns True if path is safe
 */
export function isPathSafe(inputPath: string, workspacePath?: string): boolean {
  const result = validatePath(inputPath, workspacePath);
  return result.valid;
}

/**
 * Get safe file name from path
 *
 * Extracts filename and sanitizes it for safe filesystem use.
 * Removes directory traversal, special characters, etc.
 *
 * @param inputPath - User-provided path
 * @returns Safe filename or null if invalid
 */
export function getSafeFileName(inputPath: string): string | null {
  // Extract just the filename
  const fileName = path.basename(inputPath);

  // Check for suspicious patterns
  if (fileName.includes('..') || fileName.includes('\0') || fileName.match(/[<>"|?*]/)) {
    return null;
  }

  // Limit length (most filesystems have 255 byte limit)
  if (fileName.length > 255) {
    return null;
  }

  // Reject empty or hidden files starting with . (except .specify, .claude, etc.)
  if (fileName === '' || fileName === '.') {
    return null;
  }

  return fileName;
}
