import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Gofer E2E Test Suite Global Teardown');

  // Clean up test environment
  const fs = require('fs').promises;
  const workspaceDir = process.env.WORKSPACE_DIR;

  if (workspaceDir && workspaceDir.includes('gofer-e2e-test')) {
    try {
      await fs.rmdir(workspaceDir, { recursive: true });
      console.log('✅ Test workspace cleaned up');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️  Failed to clean up test workspace:', errorMessage);
      // Don't fail the entire suite for cleanup issues
    }
  }

  // Kill any remaining processes
  try {
    const { exec } = require('child_process');
    await new Promise((resolve) => {
      exec('pkill -f "gofer-e2e"', () => {
        console.log('✅ Test processes cleaned up');
        resolve(undefined);
      });
    });
  } catch (error) {
    console.warn('⚠️  Process cleanup completed');
  }

  console.log('🏁 Global teardown completed');
}

export default globalTeardown;