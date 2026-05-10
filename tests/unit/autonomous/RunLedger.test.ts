import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RunLedger } from '../../../extension/src/autonomous/RunLedger';
import type { RunLedgerEntry } from '../../../extension/src/autonomous/RunLedger';

describe('RunLedger', () => {
  let tmpDir: string;
  let ledger: RunLedger;

  const makeEntry = (overrides: Partial<RunLedgerEntry> = {}): RunLedgerEntry => ({
    runId: 'test-run-id',
    timestamp: new Date().toISOString(),
    eventType: 'stage_start',
    stage: '1_research',
    feature: 'test-feature',
    source: 'test',
    severity: 'info',
    ...overrides,
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ledger-test-'));
    ledger = new RunLedger(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('log', () => {
    it('should create log file on first write', async () => {
      await ledger.log(makeEntry());

      expect(fs.existsSync(ledger.getLogPath())).toBe(true);
    });

    it('should write valid JSON per line', async () => {
      await ledger.log(makeEntry());
      await ledger.log(makeEntry({ eventType: 'stage_complete' }));

      const content = fs.readFileSync(ledger.getLogPath(), 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(2);

      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('runId');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('eventType');
      }
    });
  });

  describe('readLog', () => {
    it('should return all entries', async () => {
      await ledger.log(makeEntry());
      await ledger.log(makeEntry({ eventType: 'stage_complete' }));
      await ledger.log(makeEntry({ eventType: 'stage_error' }));

      const entries = await ledger.readLog();
      expect(entries).toHaveLength(3);
    });

    it('should return empty array when no log file exists', async () => {
      const entries = await ledger.readLog();
      expect(entries).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await ledger.log(makeEntry({ stage: `stage_${i}` }));
      }

      const entries = await ledger.readLog(3);
      expect(entries).toHaveLength(3);
    });
  });

  describe('filterByRunId', () => {
    it('should return only matching entries', async () => {
      await ledger.log(makeEntry({ runId: 'run-1' }));
      await ledger.log(makeEntry({ runId: 'run-2' }));
      await ledger.log(makeEntry({ runId: 'run-1' }));
      await ledger.log(makeEntry({ runId: 'run-3' }));

      const entries = await ledger.filterByRunId('run-1');
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.runId === 'run-1')).toBe(true);
    });
  });

  describe('filterByEventType', () => {
    it('should return only matching entries', async () => {
      await ledger.log(makeEntry({ eventType: 'stage_start' }));
      await ledger.log(makeEntry({ eventType: 'stage_complete' }));
      await ledger.log(makeEntry({ eventType: 'stage_start' }));
      await ledger.log(makeEntry({ eventType: 'health_warning' }));

      const entries = await ledger.filterByEventType('stage_start');
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.eventType === 'stage_start')).toBe(true);
    });
  });

  describe('filterByStage', () => {
    it('should return only matching entries', async () => {
      await ledger.log(makeEntry({ stage: '1_research' }));
      await ledger.log(makeEntry({ stage: '2_specify' }));
      await ledger.log(makeEntry({ stage: '1_research' }));

      const entries = await ledger.filterByStage('1_research');
      expect(entries).toHaveLength(2);
      expect(entries.every((e) => e.stage === '1_research')).toBe(true);
    });
  });

  describe('concurrent writes', () => {
    it('should not corrupt data on parallel writes', async () => {
      const promises = Array.from({ length: 20 }, (_, i) =>
        ledger.log(makeEntry({ stage: `stage_${i}` }))
      );
      await Promise.all(promises);

      const entries = await ledger.readLog();
      expect(entries).toHaveLength(20);
    });
  });

  describe('getLogPath', () => {
    it('should return correct path', () => {
      expect(ledger.getLogPath()).toBe(
        path.join(tmpDir, '.specify', 'logs', 'gofer-run-ledger.jsonl')
      );
    });
  });
});
