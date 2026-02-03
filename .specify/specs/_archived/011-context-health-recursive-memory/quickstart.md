# Quickstart: Context Health and Recursive Memory Enhancement

## Prerequisites

- Node.js 20.x LTS
- VSCode 1.85+
- Gofer extension installed
- Existing `.specify/` directory in workspace

## Setup

### 1. Install Dependencies

```bash
cd extension
npm install
```

### 2. Configure Context Profiles (Optional)

Create or modify `.specify/memory/context-profiles.yaml`:

```yaml
version: 1
profiles:
  research:
    researchBudget: 0.40
    memoryBudget: 0.10
    codeBudget: 0.30
    observationWindow: 20

  implement:
    researchBudget: 0.10
    memoryBudget: 0.25
    codeBudget: 0.50
    observationWindow: 15
```

### 3. Configure Health Monitoring (Optional)

Settings are available in VSCode Settings under "Gofer":

- `gofer.contextHealth.warningThreshold`: Warning at % (default: 50)
- `gofer.contextHealth.criticalThreshold`: Critical at % (default: 70)
- `gofer.contextHealth.autoHandoff`: Auto-trigger handoff (default: true)

## Testing the Feature

### Manual Testing

#### 1. Check Context Health

Run from Command Palette: **Gofer: Check Context Health**

Or use the MCP tool:

```
Use the gofer_get_context_health tool to check current context status
```

Expected output:

```json
{
  "status": "healthy",
  "utilizationPercent": 35.2,
  "recommendations": []
}
```

#### 2. Test Observation Masking

1. Start a Gofer session with multiple file reads
2. After 10+ turns, check that older observations show as placeholders:
   ```
   <observation_masked id="abc123" type="file_read" file="src/service.ts" tokens="1500" />
   ```
3. Request expansion:
   ```
   Use gofer_expand_observation with id "abc123" to see the full content
   ```

#### 3. Test Research Chunking

1. Check available chunks:
   ```
   Use gofer_get_research_index for spec "011-context-health-recursive-memory"
   ```
2. Load specific chunk:
   ```
   Use gofer_load_research_chunk with specId and chunkId
   ```

#### 4. Test Auto-Handoff

1. Simulate high context usage (or set threshold low for testing)
2. Observe notification: "Context at 72%. Handoff recommended."
3. Confirm handoff creates `session-handoff.md`

### Automated Tests

```bash
# Run all context health tests
npm test -- extension/src/autonomous/__tests__/ObservationMasker.test.ts
npm test -- extension/src/autonomous/__tests__/ContextHealthMonitor.test.ts
npm test -- extension/src/autonomous/__tests__/ResearchChunker.test.ts

# Run with coverage
npm test -- --coverage extension/src/autonomous/

# Run E2E tests
npm run test:e2e -- --grep "context health"
```

## Key Files

| File                                               | Purpose                          |
| -------------------------------------------------- | -------------------------------- |
| `extension/src/autonomous/ObservationMasker.ts`    | Observation tracking and masking |
| `extension/src/autonomous/ContextHealthMonitor.ts` | Health monitoring and alerts     |
| `extension/src/autonomous/ResearchChunker.ts`      | Research document chunking       |
| `extension/src/autonomous/ContextUsageLogger.ts`   | JSONL logging                    |
| `extension/src/ui/contextHealthStatusBar.ts`       | Status bar widget                |
| `.specify/memory/context-profiles.yaml`            | Stage profile configuration      |
| `.specify/logs/context-usage.jsonl`                | Context health logs              |

## Common Issues

### Issue 1: Status bar not showing

**Problem**: Context health status bar item not visible

**Solution**:

1. Ensure Gofer extension is activated (check Output panel)
2. Reload VSCode window: `Cmd+Shift+P` → "Developer: Reload Window"
3. Check that a workspace with `.specify/` is open

### Issue 2: Observations not being masked

**Problem**: Old observations still showing full content

**Solution**:

1. Check `ageThresholdTurns` configuration (default: 10)
2. Verify turn numbers are being tracked correctly
3. Check logs for masking errors:
   ```bash
   tail -f .specify/logs/context-usage.jsonl
   ```

### Issue 3: Research chunks not loading

**Problem**: `gofer_load_research_chunk` returns error

**Solution**:

1. Ensure `research.md` exists in spec folder
2. Run index generation manually:
   ```typescript
   const chunker = new ResearchChunker();
   await chunker.indexResearchFile(researchPath);
   ```
3. Check for valid markdown headings in research.md

### Issue 4: Auto-handoff not triggering

**Problem**: Context exceeds threshold but no handoff

**Solution**:

1. Check `autoHandoffEnabled` setting (default: true)
2. Verify monitoring is started:
   ```typescript
   monitor.startMonitoring();
   ```
3. Check for errors in extension output panel

## Configuration Reference

### ObservationMasker Defaults

```typescript
{
  ageThresholdTurns: 10,
  preserveErrorMessages: true,
  preservePatterns: [/error/i, /exception/i, /failed/i],
  maxCacheSize: 100,
  cacheDirectory: '.specify/memory/observation-cache'
}
```

### ContextHealthMonitor Defaults

```typescript
{
  warningThreshold: 0.5,
  criticalThreshold: 0.7,
  effectiveContextLimit: 120000,
  checkIntervalMs: 5000,
  autoHandoffEnabled: true,
  logToJsonl: true
}
```

### Stage Profile Defaults

| Stage     | Research | Memory | Code | Observation Window |
| --------- | -------- | ------ | ---- | ------------------ |
| research  | 40%      | 10%    | 30%  | 20 turns           |
| specify   | 30%      | 20%    | 20%  | 15 turns           |
| plan      | 25%      | 25%    | 30%  | 15 turns           |
| tasks     | 15%      | 20%    | 20%  | 10 turns           |
| implement | 10%      | 25%    | 50%  | 15 turns           |
| validate  | 15%      | 20%    | 40%  | 20 turns           |

## Verifying Success

After implementation, verify these metrics:

- [ ] Context usage reduced by ≥40% for typical sessions
- [ ] Observation masking completes in <10ms
- [ ] Health check completes in <50ms
- [ ] Memory loading completes in <200ms
- [ ] All existing tests continue to pass
- [ ] 85%+ code coverage on new modules
