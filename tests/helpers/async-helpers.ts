import * as fs from 'fs';

/**
 * Waits for a condition to become true within a timeout period
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Polling interval in milliseconds (default: 100)
 * @throws Error if condition is not met within timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Waits for a file to be modified (mtime changes)
 * @param filePath - Absolute path to the file
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @throws Error if file is not modified within timeout
 */
export async function waitForFileChange(filePath: string, timeout: number = 5000): Promise<void> {
  let initialMtime: number;

  try {
    const stats = await fs.promises.stat(filePath);
    initialMtime = stats.mtimeMs;
  } catch (error) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  await waitForCondition(async () => {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.mtimeMs > initialMtime;
    } catch (error) {
      // File might have been deleted
      return false;
    }
  }, timeout);
}

/**
 * Waits for a file to exist
 * @param filePath - Absolute path to the file
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @throws Error if file doesn't exist within timeout
 */
export async function waitForFile(filePath: string, timeout: number = 5000): Promise<void> {
  await waitForCondition(async () => {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }, timeout);
}

/**
 * Delays execution for a specified time
 * @param ms - Milliseconds to delay
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
