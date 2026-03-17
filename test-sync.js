#!/usr/bin/env node

/**
 * Test script to manually run ClaudeCodeUsageAdapter sync
 */

const path = require('path');
const fs = require('fs');

// Import the adapter (use require since this is CommonJS)
const workspacePath = process.cwd();

async function testSync() {

  // Dynamic import for ESM module
  const { ClaudeCodeUsageAdapter } = await import('./extension/dist/autonomous/ClaudeCodeUsageAdapter.js');

  const adapter = new ClaudeCodeUsageAdapter(workspacePath);

  // Check installation
  const isInstalled = adapter.isClaudeCodeInstalled();

  if (!isInstalled) {
    process.exit(1);
  }

  // Get current session
  const session = adapter.getCurrentSession();

  // Check context log
  const contextLogPath = path.join(workspacePath, '.specify/logs/context-usage.jsonl');
  const contextLogExists = fs.existsSync(contextLogPath);

  if (contextLogExists) {
    const stats = fs.statSync(contextLogPath);
  }

  // Run sync
  const synced = await adapter.syncToCouncilLog();

  // Check results
  const councilLogPath = path.join(workspacePath, '.specify/logs/council-usage.jsonl');
  if (fs.existsSync(councilLogPath)) {
    const content = fs.readFileSync(councilLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    if (lines.length > 0) {
      const firstEntry = JSON.parse(lines[0]);

      console.log('\n💰 Total cost:', lines.reduce((sum, line) => {
        const entry = JSON.parse(line);
        return sum + (entry.estimatedCostUsd || 0);
      }, 0).toFixed(2), 'USD');
    }
  }
}

testSync().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
