/**
 * Integration tests for 002-gofer-gap-remediation cross-component boundaries.
 *
 * Tests real component interactions without mocks:
 * 1. RunLedger + PipelineStateManager: runId propagation
 * 2. ScopeGuard + ToolAuditLogger: boundary violation audit trail
 * 3. CostBudgetEnforcer + RunLedger: budget events written to disk
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PipelineStateManager } from '../../extension/src/autonomous/PipelineStateManager';
import { RunLedger } from '../../extension/src/autonomous/RunLedger';
import { ScopeGuard, ScopeViolationError } from '../../extension/src/autonomous/ScopeGuard';
import { ToolAuditLogger } from '../../extension/src/autonomous/ToolAuditLogger';
import { CostBudgetEnforcer } from '../../extension/src/autonomous/CostBudgetEnforcer';

describe('Gap Remediation Integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gap-remediation-int-'));
    // Create .specify/logs/ and .specify/specs/ directories
    fs.mkdirSync(path.join(tmpDir, '.specify', 'logs'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.specify', 'specs'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('RunLedger + PipelineStateManager: runId propagation', () => {
    it('should propagate runId from pipeline state to ledger entries on disk', async () => {
      // Create a real PipelineStateManager and initialize state
      const psm = new PipelineStateManager(tmpDir);
      const featureDir = path.join(tmpDir, '.specify', 'specs', 'test-feature');
      const state = await psm.init(featureDir, 'test-feature');

      // Verify we got a real runId
      expect(state.runId).toBeTruthy();
      expect(state.runId.length).toBeGreaterThan(8);

      // Create a real RunLedger and set the runId from pipeline state
      const runLedger = new RunLedger(tmpDir);
      runLedger.setRunId(state.runId);

      // Log an event with empty runId — should auto-fill from pipeline runId
      await runLedger.log({
        runId: '',
        timestamp: new Date().toISOString(),
        eventType: 'stage_start',
        stage: '1_research',
        feature: 'test-feature',
        source: 'integration-test',
        severity: 'info',
      });

      // Read the JSONL file directly and verify runId was propagated
      const logPath = runLedger.getLogPath();
      const content = await fs.promises.readFile(logPath, 'utf-8');
      const entries = content
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      expect(entries).toHaveLength(1);
      expect(entries[0].runId).toBe(state.runId);
      expect(entries[0].eventType).toBe('stage_start');
      expect(entries[0].feature).toBe('test-feature');
    });

    it('should read runId back from pipeline state file', async () => {
      const psm = new PipelineStateManager(tmpDir);
      const featureDir = path.join(tmpDir, '.specify', 'specs', 'another-feature');
      const state = await psm.init(featureDir, 'another-feature');

      // Read state back from disk
      const readBack = await psm.readState();
      expect(readBack).not.toBeNull();
      expect(readBack!.runId).toBe(state.runId);
      expect(readBack!.featureId).toBe('another-feature');
    });
  });

  describe('ScopeGuard + ToolAuditLogger: violation audit trail', () => {
    it('should write audit entries to JSONL when ScopeGuard detects violations', async () => {
      // Create a real ToolAuditLogger writing to temp directory
      const auditLogger = new ToolAuditLogger(tmpDir);

      // Create a real ScopeGuard and wire the audit logger
      const scopeGuard = new ScopeGuard(tmpDir);
      scopeGuard.setToolAuditLogger(auditLogger);
      scopeGuard.setAgentName('test-agent');
      scopeGuard.setEnforcementMode('warning');

      // Manually add protected patterns (simulating loadFromSpec)
      const specPath = path.join(tmpDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `# Test Spec

## Protected Boundaries

- extension/src/config.ts
- tests/fixtures/
`,
        'utf-8'
      );
      scopeGuard.loadFromSpec(specPath);

      // Check a file that matches a protected pattern — should return violation
      const result = scopeGuard.check('extension/src/config.ts');
      expect(result).toBe('extension/src/config.ts');

      // Check a file that's allowed — should return null
      const allowed = scopeGuard.check('extension/src/newFile.ts');
      expect(allowed).toBeNull();

      // Wait briefly for async audit log writes to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Read the audit JSONL and verify entries
      const auditEntries = await auditLogger.readLog();
      expect(auditEntries.length).toBeGreaterThanOrEqual(2);

      // Find the violation entry
      const violationEntry = auditEntries.find((e) => e.outcome === 'warned');
      expect(violationEntry).toBeDefined();
      expect(violationEntry!.agent).toBe('test-agent');
      expect(violationEntry!.filePath).toBe('extension/src/config.ts');
      expect(violationEntry!.protectedPattern).toBe('extension/src/config.ts');
      expect(violationEntry!.enforcement).toBe('warning');

      // Find the allowed entry
      const allowedEntry = auditEntries.find((e) => e.outcome === 'allowed');
      expect(allowedEntry).toBeDefined();
    });

    it('should throw ScopeViolationError in blocking mode and log to audit', async () => {
      const auditLogger = new ToolAuditLogger(tmpDir);
      const scopeGuard = new ScopeGuard(tmpDir);
      scopeGuard.setToolAuditLogger(auditLogger);
      scopeGuard.setEnforcementMode('blocking');

      const specPath = path.join(tmpDir, 'spec.md');
      fs.writeFileSync(
        specPath,
        `# Spec\n\n## Protected Boundaries\n\n- critical/path.ts\n`,
        'utf-8'
      );
      scopeGuard.loadFromSpec(specPath);

      // Blocking mode should throw
      expect(() => scopeGuard.check('critical/path.ts')).toThrow(ScopeViolationError);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditEntries = await auditLogger.readLog();
      const blocked = auditEntries.find((e) => e.outcome === 'blocked');
      expect(blocked).toBeDefined();
      expect(blocked!.enforcement).toBe('blocking');
    });
  });

  describe('CostBudgetEnforcer + RunLedger: budget events on disk', () => {
    it('should write budget_warning event to RunLedger JSONL when threshold crossed', async () => {
      // Create a real RunLedger (not mocked)
      const runLedger = new RunLedger(tmpDir);
      runLedger.setRunId('integration-test-run');

      // Create CostBudgetEnforcer with a small budget and the real RunLedger
      const enforcer = new CostBudgetEnforcer(
        {
          maxCostUsd: 1.0,
          warningThreshold: 0.8,
        },
        runLedger
      );

      // Record enough usage to cross 80% warning threshold
      // anthropic input rate: $0.003/1k tokens
      // $0.80 = 266,667 tokens, use 270,000 to be safe
      enforcer.recordUsage(270_000, 0);

      const snapshot = enforcer.getSnapshot();
      expect(snapshot.status).toBe('warning');

      // Wait for async ledger write
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Read the ledger JSONL directly
      const logPath = runLedger.getLogPath();
      const content = await fs.promises.readFile(logPath, 'utf-8');
      const entries = content
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));

      // Should have a budget_warning event
      const warningEntry = entries.find(
        (e: Record<string, unknown>) => e.eventType === 'budget_warning'
      );
      expect(warningEntry).toBeDefined();
      expect(warningEntry.source).toBe('CostBudgetEnforcer');
      expect(warningEntry.severity).toBe('warning');
      expect(warningEntry.runId).toBe('integration-test-run');
      expect(warningEntry.data.currentCostUsd).toBeGreaterThan(0);
      expect(warningEntry.data.maxCostUsd).toBe(1.0);
    });

    it('should write budget_exceeded event when budget is fully exceeded', async () => {
      const runLedger = new RunLedger(tmpDir);
      runLedger.setRunId('exceed-test-run');

      const enforcer = new CostBudgetEnforcer(
        {
          maxCostUsd: 0.01,
        },
        runLedger
      );

      // Record enough to exceed $0.01 budget
      enforcer.recordUsage(10_000, 0); // 10000 * 0.003/1000 = $0.03

      expect(enforcer.getSnapshot().status).toBe('exceeded');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const entries = await runLedger.readLog();
      const exceededEntry = entries.find((e) => e.eventType === 'budget_exceeded');
      expect(exceededEntry).toBeDefined();
      expect(exceededEntry!.severity).toBe('error');
      expect(exceededEntry!.source).toBe('CostBudgetEnforcer');
    });
  });
});
