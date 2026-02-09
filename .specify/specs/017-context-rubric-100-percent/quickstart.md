# Quickstart: Context Management Rubric 100%

## Prerequisites

- Node.js 20.x LTS
- VSCode with Gofer extension installed
- Anthropic API key (optional — for LLM features in Phase 5)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile extension:
   ```bash
   cd extension && npm run compile
   ```

3. (Optional) Configure API key for LLM features:
   - VSCode Settings → Gofer → `gofer.anthropicApiKey`

## Testing After Each Phase

### Phase 1 — Turn Counter + Quick Wins
```bash
npm test -- tests/unit/autonomous/observation-tracking.test.ts
npm test -- tests/unit/autonomous/ObservationMasker.test.ts
```

Verify:
- Turn counter increments (check extension output log)
- Observation cache file exists: `.specify/memory/observation-cache/index.json`
- Status bar shows `(real)` or `(est)` suffix

### Phase 2 — Dead Code Wiring
```bash
npm test -- tests/unit/autonomous/
```

Verify:
- Command Palette → "Gofer: Check for Slop" produces output
- Extension output shows `[Gofer] CitationVerifier initialized`

### Phase 3 — Three-Tier Decay
```bash
npm test -- tests/unit/autonomous/ObservationMasker.test.ts
```

Verify:
- Status bar shows tier counts (e.g., "3 full, 2 key-points, 1 masked")

### Phase 4 — Knowledge Graph + Memory
```bash
npm test -- tests/unit/autonomous/KnowledgeGraph.test.ts
npm test -- tests/unit/autonomous/ContextBuilder.test.ts
```

### Phase 5 — LLM Integration
```bash
npm test -- tests/unit/autonomous/LLMProvider.test.ts
npm test -- tests/unit/autonomous/ResearchSummarizer.test.ts
```

### All Tests
```bash
npm test
```

Expected: Same 5 pre-existing failures (agent-stop-extraction.test.ts), no new failures.

## Key Files

| File | Purpose |
|------|---------|
| `extension/src/extension.ts` | Component initialization and wiring |
| `extension/src/autonomous/ObservationMasker.ts` | Three-tier decay, fold levels |
| `extension/src/autonomous/ContextBuilder.ts` | Central context assembly |
| `extension/src/autonomous/LLMProvider.ts` | Shared LLM utility (new) |
| `extension/src/autonomous/SubAgentDispatcher.ts` | Advisory delegation (new) |
| `extension/src/autonomous/MemoryLayerManager.ts` | MemGPT three-layer API (new) |

## Common Issues

### Observation masking not working
**Problem**: Observations never transition from `full` to `key-points`
**Solution**: Check that `incrementTurn()` is being called. Look for `[Gofer] Turn counter:` in extension output.

### LLM features not activating
**Problem**: Deterministic fallbacks always used
**Solution**: Ensure `gofer.anthropicApiKey` is set in VSCode settings. Check extension output for `[Gofer] LLM provider initialized`.

### KnowledgeGraph empty after file reads
**Problem**: `loadGraphContext()` returns empty
**Solution**: Graph producers require hook bridge events. Ensure Claude Code is running with hooks enabled.
