import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Creates a temporary test workspace with .specify structure
 * @returns Absolute path to the temporary workspace
 */
export async function createTestWorkspace(): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-test-'));

  // Create .specify structure
  await fs.promises.mkdir(path.join(tmpDir, '.specify/specs'), { recursive: true });
  await fs.promises.mkdir(path.join(tmpDir, '.specify/memory'), { recursive: true });
  await fs.promises.mkdir(path.join(tmpDir, '.specify/templates'), { recursive: true });
  await fs.promises.mkdir(path.join(tmpDir, '.specify/scripts/bash'), { recursive: true });

  return tmpDir;
}

/**
 * Cleans up a test workspace with retry logic for Windows file locking
 * @param dir - Workspace directory to clean up
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 */
export async function cleanupTestWorkspace(dir: string, maxRetries: number = 3): Promise<void> {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
      return; // Success!
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) {
        // Don't fail tests on cleanup errors, just warn
        console.warn(`Failed to clean up ${dir} after ${maxRetries} attempts:`, error);
        return;
      }
      // Exponential backoff: 100ms, 200ms, 400ms
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempts - 1)));
    }
  }
}

/**
 * Creates a test spec file with YAML frontmatter and content
 * @param workspace - Workspace root directory
 * @param specId - Spec ID (e.g., "001-example-feature")
 * @param content - Spec file content
 * @returns Absolute path to the created spec file
 */
export async function createTestSpec(
  workspace: string,
  specId: string,
  content: string
): Promise<string> {
  const specPath = path.join(workspace, `.specify/specs/${specId}/spec.md`);
  await fs.promises.mkdir(path.dirname(specPath), { recursive: true });
  await fs.promises.writeFile(specPath, content, 'utf-8');
  return specPath;
}

/**
 * Creates a test tasks.md file
 * @param workspace - Workspace root directory
 * @param specId - Spec ID
 * @param content - Tasks file content
 * @returns Absolute path to the created tasks file
 */
export async function createTestTasks(
  workspace: string,
  specId: string,
  content: string
): Promise<string> {
  const tasksPath = path.join(workspace, `.specify/specs/${specId}/tasks.md`);
  await fs.promises.mkdir(path.dirname(tasksPath), { recursive: true });
  await fs.promises.writeFile(tasksPath, content, 'utf-8');
  return tasksPath;
}
