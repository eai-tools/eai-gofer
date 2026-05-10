import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolAuditLogger } from '../../../extension/src/autonomous/ToolAuditLogger';
import type { ToolAuditEntry } from '../../../extension/src/autonomous/ToolAuditLogger';
import { RunLedger } from '../../../extension/src/autonomous/RunLedger';

describe('ToolAuditLogger', () => {
  let tmpDir: string;
  let logger: ToolAuditLogger;

  const makeEntry = (overrides: Partial<ToolAuditEntry> = {}): ToolAuditEntry => ({
    timestamp: new Date().toISOString(),
    runId: 'test-run-id',
    agent: 'test-agent',
    filePath: 'src/foo.ts',
    protectedPattern: 'src/foo.ts',
    enforcement: 'warning',
    outcome: 'warned',
    ...overrides,
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-audit-test-'));
    logger = new ToolAuditLogger(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create log file on first logCheck', async () => {
    await logger.logCheck(makeEntry());
    expect(fs.existsSync(logger.getLogPath())).toBe(true);
  });

  it('should write valid JSON per line', async () => {
    await logger.logCheck(makeEntry());
    await logger.logCheck(makeEntry({ outcome: 'blocked' }));

    const content = fs.readFileSync(logger.getLogPath(), 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);

    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('runId');
      expect(parsed).toHaveProperty('agent');
      expect(parsed).toHaveProperty('filePath');
      expect(parsed).toHaveProperty('outcome');
    }
  });

  it('should return entries via readLog', async () => {
    await logger.logCheck(makeEntry());
    await logger.logCheck(makeEntry({ outcome: 'allowed' }));
    await logger.logCheck(makeEntry({ outcome: 'blocked' }));

    const entries = await logger.readLog();
    expect(entries).toHaveLength(3);
  });

  it('should respect limit in readLog', async () => {
    for (let i = 0; i < 10; i++) {
      await logger.logCheck(makeEntry({ agent: `agent-${i}` }));
    }
    const entries = await logger.readLog(3);
    expect(entries).toHaveLength(3);
  });

  it('should emit scope_violation to RunLedger on warned outcome', async () => {
    const ledger = new RunLedger(tmpDir);
    const loggerWithLedger = new ToolAuditLogger(tmpDir, ledger);

    await loggerWithLedger.logCheck(makeEntry({ outcome: 'warned' }));

    // Small delay for async ledger write
    await new Promise((r) => setTimeout(r, 50));

    const ledgerEntries = await ledger.readLog();
    expect(ledgerEntries.length).toBeGreaterThanOrEqual(1);
    const violation = ledgerEntries.find((e) => e.eventType === 'scope_violation');
    expect(violation).toBeDefined();
    expect(violation?.severity).toBe('warning');
  });

  it('should emit scope_violation to RunLedger on blocked outcome', async () => {
    const ledger = new RunLedger(tmpDir);
    const loggerWithLedger = new ToolAuditLogger(tmpDir, ledger);

    await loggerWithLedger.logCheck(makeEntry({ outcome: 'blocked' }));

    await new Promise((r) => setTimeout(r, 50));

    const ledgerEntries = await ledger.readLog();
    const violation = ledgerEntries.find((e) => e.eventType === 'scope_violation');
    expect(violation).toBeDefined();
    expect(violation?.severity).toBe('error');
  });

  it('should NOT emit to RunLedger on allowed outcome', async () => {
    const ledger = new RunLedger(tmpDir);
    const loggerWithLedger = new ToolAuditLogger(tmpDir, ledger);

    await loggerWithLedger.logCheck(makeEntry({ outcome: 'allowed', protectedPattern: '' }));

    await new Promise((r) => setTimeout(r, 50));

    const ledgerEntries = await ledger.readLog();
    const violations = ledgerEntries.filter((e) => e.eventType === 'scope_violation');
    expect(violations).toHaveLength(0);
  });

  it('should return correct log path', () => {
    expect(logger.getLogPath()).toBe(path.join(tmpDir, '.specify', 'logs', 'tool-audit.jsonl'));
  });

  it('should have all required fields in entries', async () => {
    await logger.logCheck(makeEntry());
    const entries = await logger.readLog();
    const entry = entries[0];

    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('runId');
    expect(entry).toHaveProperty('agent');
    expect(entry).toHaveProperty('filePath');
    expect(entry).toHaveProperty('protectedPattern');
    expect(entry).toHaveProperty('enforcement');
    expect(entry).toHaveProperty('outcome');
  });
});
