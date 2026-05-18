/**
 * Manual test to verify ClaudeCodeUsageAdapter syncs real data correctly
 * Run with: npm test -- tests/manual/test-real-sync.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ClaudeCodeUsageAdapter } from '../../extension/src/autonomous/ClaudeCodeUsageAdapter';
import { UsageLogger } from '../../extension/src/council/UsageLogger';

describe.skip('Real Sync Test', () => {
  it('should sync real context-usage.jsonl data to council log', async () => {
    const workspacePath = '/Users/douglaswross/Code/eai-gofer';
    const councilLogPath = path.join(workspacePath, '.specify/logs/council-usage.jsonl');

    // Clear existing council log
    if (fs.existsSync(councilLogPath)) {
      fs.unlinkSync(councilLogPath);
    }

    // Run sync
    const adapter = new ClaudeCodeUsageAdapter(workspacePath);
    const isInstalled = adapter.isClaudeCodeInstalled();
    console.log('Claude Code installed:', isInstalled);

    expect(isInstalled).toBe(true);

    const synced = await adapter.syncToCouncilLog();
    console.log('Synced', synced, 'sessions');

    expect(synced).toBeGreaterThan(0);

    // Verify council log was created with correct format
    expect(fs.existsSync(councilLogPath)).toBe(true);

    const content = fs.readFileSync(councilLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    console.log('Council log has', lines.length, 'entries');
    expect(lines).toHaveLength(synced);

    // Verify format of first entry
    const firstEntry = JSON.parse(lines[0]);
    console.log('\nFirst entry format:');
    console.log(JSON.stringify(firstEntry, null, 2));

    // Check it's in UsageLogEntry format (not old format)
    expect(firstEntry).toHaveProperty('stage');
    expect(firstEntry).toHaveProperty('councilMode');
    expect(firstEntry).toHaveProperty('estimatedCostUsd');
    expect(firstEntry).toHaveProperty('providers');
    expect(firstEntry).toHaveProperty('inputTokens');
    expect(firstEntry).toHaveProperty('outputTokens');

    // Verify it does NOT have old format fields
    expect(firstEntry).not.toHaveProperty('provider');
    expect(firstEntry).not.toHaveProperty('model');
    expect(firstEntry).not.toHaveProperty('source');

    // Verify UsageLogger can read it
    const usageLogger = new UsageLogger(workspacePath);
    const summary = await usageLogger.getUsageSummary();

    console.log('\nUsageLogger summary:');
    console.log('Total cost:', summary.totalCostUsd.toFixed(2), 'USD');
    console.log('Total tokens:', summary.totalInputTokens + summary.totalOutputTokens);
    console.log('Providers:', Object.keys(summary.byProvider));

    expect(summary.totalCostUsd).toBeGreaterThan(0);
    expect(summary.totalInputTokens + summary.totalOutputTokens).toBeGreaterThan(0);
    expect(summary.byProvider).toHaveProperty('anthropic');
  }, 30000);
});
