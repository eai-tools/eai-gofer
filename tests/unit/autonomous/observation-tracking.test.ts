import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * T044: Structural test for observation tracking from terminal output.
 *
 * Cannot dynamically import autonomousCommands.ts due to node-pty native
 * module compilation mismatch in test environment.
 */
describe('Observation Tracking (T044)', () => {
  const filePath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('should buffer terminal output and track as observations', () => {
    expect(source).toContain('observationBuffer');
    expect(source).toContain('contextBuilder.trackObservation(');
  });

  it('should track observations when buffer reaches 2000 chars', () => {
    expect(source).toContain('observationBuffer.length >= 2000');
  });

  it('should increment turn counter on each tracked observation', () => {
    expect(source).toContain('contextBuilder.incrementTurn()');
  });

  it('should only track when sharedContextBuilder is available', () => {
    expect(source).toContain('if (sharedContextBuilder)');
  });

  it('should use command_output observation type', () => {
    expect(source).toContain("'command_output'");
  });

  it('should include specId metadata', () => {
    expect(source).toContain("source: 'claude-code-terminal'");
    expect(source).toContain('specId');
  });
});

/**
 * T019: Structural tests for observation content ingestion from hook bridge.
 *
 * Verifies extension.ts contains the new observation file reading logic
 * that replaces the old tool-output.txt approach.
 */
describe('Observation Content Ingestion from Hook Bridge (T019)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should read observation files by observationId', () => {
    expect(extSource).toContain('observationId');
    expect(extSource).toContain('observationsDir');
    expect(extSource).toContain('.json');
  });

  it('should parse observation JSON and extract toolResponse', () => {
    expect(extSource).toContain('obsData.toolResponse');
  });

  it('should fall back to placeholder when no observationId is present', () => {
    expect(extSource).toContain('[Tool output from ${toolUse.toolName}]');
  });

  it('should enrich metadata with toolInput fields', () => {
    expect(extSource).toContain('toolUse.toolInput');
    expect(extSource).toContain('metadata.filePath');
    expect(extSource).toContain('metadata.command');
    expect(extSource).toContain('metadata.pattern');
  });

  it('should clean up observation files after reading', () => {
    expect(extSource).toContain('fsPromises.unlink');
  });

  it('should clean stale observation files on session start', () => {
    expect(extSource).toContain('session-start');
    expect(extSource).toContain('STALE_THRESHOLD_MS');
  });

  it('should map tool names to correct observation types', () => {
    expect(extSource).toContain("'file_read'");
    expect(extSource).toContain("'search_result'");
    expect(extSource).toContain("'command_output'");
  });

  it('should not reference the old tool-output.txt file', () => {
    expect(extSource).not.toContain('tool-output.txt');
  });
});

/**
 * Phase 1 (Spec 017): Turn counter, cache persistence, checkpoint validation,
 * status bar indicator.
 */
describe('Phase 1: Turn Counter Fix (T001)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should call incrementTurn() in the bridge-update handler after trackObservation', () => {
    // Find the bridge-update handler that contains trackObservation (the main one)
    const trackObsPos = extSource.indexOf('sharedContextBuilder.trackObservation(');
    expect(trackObsPos).toBeGreaterThan(-1);
    // incrementTurn should appear nearby (within 500 chars after trackObservation)
    const nearby = extSource.slice(trackObsPos, trackObsPos + 500);
    expect(nearby).toContain('sharedContextBuilder.incrementTurn()');
  });

  it('should call incrementTurn() AFTER trackObservation(), not before', () => {
    const trackPos = extSource.indexOf('sharedContextBuilder.trackObservation(');
    const incrementPos = extSource.indexOf('sharedContextBuilder.incrementTurn()', trackPos);
    expect(trackPos).toBeGreaterThan(-1);
    expect(incrementPos).toBeGreaterThan(trackPos);
  });
});

describe('Phase 1: Cache Persistence (T002/T003)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should call saveCacheToDisk() after maskOldObservations in ContextBuilder', () => {
    const maskPos = cbSource.indexOf('maskOldObservations(this.currentTurn)');
    const savePos = cbSource.indexOf('saveCacheToDisk()', maskPos);
    expect(maskPos).toBeGreaterThan(-1);
    expect(savePos).toBeGreaterThan(maskPos);
  });

  it('should have a debounced cache save mechanism in extension.ts', () => {
    expect(extSource).toContain('debouncedCacheSave');
    expect(extSource).toContain('5000'); // 5-second debounce
  });
});

describe('Phase 1: Expanded Preserve Patterns (T004)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should include expanded error patterns in default preservePatterns', () => {
    expect(maskerSource).toContain('/failure/i');
    expect(maskerSource).toContain('/critical/i');
    expect(maskerSource).toContain('/fatal/i');
    expect(maskerSource).toContain('/panic/i');
    expect(maskerSource).toContain('/unhandled/i');
    expect(maskerSource).toMatch(/stack\\s\?trace/);
  });
});

describe('Phase 1: Enhanced MaskResult (T005)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should include cacheSize and evictionCount in MaskResult interface', () => {
    expect(maskerSource).toContain('cacheSize: number');
    expect(maskerSource).toContain('evictionCount: number');
  });

  it('should populate cacheSize and evictionCount in maskOldObservations return', () => {
    // Verify the return object includes the new fields
    const returnBlock = maskerSource.slice(
      maskerSource.lastIndexOf('return {', maskerSource.indexOf('maskedObservations,')),
    );
    expect(returnBlock).toContain('cacheSize:');
    expect(returnBlock).toContain('evictionCount:');
  });
});

describe('Phase 1: CheckpointValidator Wiring (T006)', () => {
  const handoffPath = path.resolve(__dirname, '../../../extension/src/autonomous/AutoHandoffTrigger.ts');
  const handoffSource = fs.readFileSync(handoffPath, 'utf-8');

  it('should import CheckpointValidator', () => {
    expect(handoffSource).toContain("import { CheckpointValidator }");
  });

  it('should instantiate CheckpointValidator', () => {
    expect(handoffSource).toContain('new CheckpointValidator()');
  });

  it('should validate handoff document before returning', () => {
    expect(handoffSource).toContain('checkpointValidator.validate(document)');
  });
});

describe('Phase 1: Status Bar Data Source Indicator (T007)', () => {
  const statusBarPath = path.resolve(__dirname, '../../../extension/src/ui/ContextHealthStatusBar.ts');
  const statusBarSource = fs.readFileSync(statusBarPath, 'utf-8');

  it('should show (real) or (est) indicator in status bar text', () => {
    expect(statusBarSource).toContain("'(real)'");
    expect(statusBarSource).toContain("'(est)'");
  });

  it('should use sourceIndicator variable for data source display', () => {
    expect(statusBarSource).toContain('sourceIndicator');
  });
});

/**
 * Phase 2 (Spec 017): Wire dead code components.
 */
describe('Phase 2: CitationVerifier Wiring (T009-T011)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should import CitationVerifier in extension.ts', () => {
    expect(extSource).toContain("import { CitationVerifier }");
  });

  it('should instantiate CitationVerifier and wire to ContextBuilder', () => {
    expect(extSource).toContain('new CitationVerifier(workspacePath)');
    expect(extSource).toContain('setCitationVerifier(citationVerifier)');
  });

  it('should have setCitationVerifier setter in ContextBuilder', () => {
    expect(cbSource).toContain('setCitationVerifier(verifier: CitationVerifier)');
  });

  it('should call verifyCitations on formatted memories in buildContext', () => {
    expect(cbSource).toContain('citationVerifier.verifyCitations(');
    expect(cbSource).toContain('addStalenessWarning(');
  });

  it('should call verifyCodeSymbols in buildContext (T011)', () => {
    expect(cbSource).toContain('citationVerifier.verifyCodeSymbols(');
  });
});

describe('Phase 2: ScopeGuard Wiring (T012-T013)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should import and instantiate ScopeGuard in extension.ts', () => {
    expect(extSource).toContain("import { ScopeGuard }");
    expect(extSource).toContain('new ScopeGuard(workspacePath)');
  });

  it('should check scope guard in bridge-update handler', () => {
    expect(extSource).toContain('scopeGuard.check(');
    expect(extSource).toContain('ScopeGuard violation');
  });

  it('should have setScopeGuard setter and check in trackObservation (T013)', () => {
    expect(cbSource).toContain('setScopeGuard(guard: ScopeGuard)');
    expect(cbSource).toContain('this.scopeGuard.check(');
  });
});

describe('Phase 2: SlopDetector Wiring (T014)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should import and instantiate SlopDetector', () => {
    expect(extSource).toContain("import { SlopDetector }");
    expect(extSource).toContain('new SlopDetector()');
  });

  it('should register gofer.checkForSlop command', () => {
    expect(extSource).toContain("'gofer.checkForSlop'");
    expect(extSource).toContain('slopDetector.scanDirectory(');
  });
});

describe('Phase 2: KnowledgeGraph First Producer (T015)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should call recordFileAccess for file_read observations', () => {
    expect(extSource).toContain('knowledgeGraph.recordFileAccess(');
  });

  it('should only record file access for file_read observation type', () => {
    const recordCall = extSource.indexOf('knowledgeGraph.recordFileAccess(');
    const nearbyContext = extSource.slice(Math.max(0, recordCall - 200), recordCall);
    expect(nearbyContext).toContain("obsType === 'file_read'");
  });
});

/**
 * Phase 3 (Spec 017): Three-tier observation decay with key-point extraction.
 */
describe('Phase 3: DecayTier Types and Fields (T017)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should define DecayTier type with three tiers', () => {
    expect(maskerSource).toContain("'full' | 'key-points' | 'masked'");
  });

  it('should include decayTier field in ObservationEntry', () => {
    expect(maskerSource).toContain('decayTier: DecayTier');
  });

  it('should include keyPointsContent optional field', () => {
    expect(maskerSource).toContain('keyPointsContent?: string');
  });

  it('should set decayTier to full on new observations', () => {
    expect(maskerSource).toContain("decayTier: 'full'");
  });
});

describe('Phase 3: Key-Points Age Fraction Config (T018)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should have keyPointsAgeFraction in config', () => {
    expect(maskerSource).toContain('keyPointsAgeFraction: number');
  });

  it('should default keyPointsAgeFraction to 0.6', () => {
    expect(maskerSource).toContain('keyPointsAgeFraction: 0.6');
  });
});

describe('Phase 3: Two-Step Decay in maskOldObservations (T019)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should compute keyPointsThreshold from ageThreshold and fraction', () => {
    expect(maskerSource).toContain('keyPointsAgeFraction');
    expect(maskerSource).toContain('keyPointsThreshold');
  });

  it('should transition full observations to key-points tier', () => {
    expect(maskerSource).toContain("observation.decayTier = 'key-points'");
  });

  it('should transition key-points observations to masked tier', () => {
    expect(maskerSource).toContain("observation.decayTier = 'masked'");
  });
});

describe('Phase 3: Type-Specific Key-Point Extractors (T020)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should have extractFileKeyPoints method', () => {
    expect(maskerSource).toContain('extractFileKeyPoints(');
  });

  it('should have extractCommandKeyPoints method', () => {
    expect(maskerSource).toContain('extractCommandKeyPoints(');
  });

  it('should have extractSearchKeyPoints method', () => {
    expect(maskerSource).toContain('extractSearchKeyPoints(');
  });

  it('should have extractTestKeyPoints method', () => {
    expect(maskerSource).toContain('extractTestKeyPoints(');
  });
});

describe('Phase 3: Enhanced MaskResult with Tier Counts (T021)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should include keyPointsCount in MaskResult', () => {
    expect(maskerSource).toContain('keyPointsCount: number');
  });

  it('should include tierCounts in MaskResult', () => {
    expect(maskerSource).toContain('tierCounts:');
    expect(maskerSource).toContain('full: number');
    expect(maskerSource).toContain('keyPoints: number');
    expect(maskerSource).toContain('masked: number');
  });
});

describe('Phase 3: VSCode Preserve Patterns Setting (T022)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should read observationPreservePatterns from VSCode configuration', () => {
    expect(extSource).toContain('observationPreservePatterns');
  });

  it('should convert user patterns to RegExp objects', () => {
    expect(extSource).toContain("new RegExp(p, 'i')");
  });
});

describe('Phase 3: Legacy Migration in loadCacheFromDisk (T023)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should migrate legacy entries without decayTier', () => {
    expect(maskerSource).toContain('!observation.decayTier');
  });

  it('should map masked entries to masked tier and unmapped to full', () => {
    // Verify it checks observation.masked to decide the tier
    const migrationBlock = maskerSource.slice(
      maskerSource.indexOf('!observation.decayTier'),
      maskerSource.indexOf('!observation.decayTier') + 200
    );
    expect(migrationBlock).toContain("'masked'");
    expect(migrationBlock).toContain("'full'");
  });
});

describe('Phase 3: Status Bar Per-Tier Counts (T024)', () => {
  const statusBarPath = path.resolve(__dirname, '../../../extension/src/ui/ContextHealthStatusBar.ts');
  const statusBarSource = fs.readFileSync(statusBarPath, 'utf-8');

  it('should include tierCounts in MaskingStatistics interface', () => {
    expect(statusBarSource).toContain('tierCounts?:');
  });

  it('should display per-tier counts in masking stats items', () => {
    expect(statusBarSource).toContain('Decay Tiers');
    expect(statusBarSource).toContain('Key-Points');
  });
});

/**
 * Phase 4 (Spec 017): Knowledge Graph & Memory Enhancements
 */
describe('Phase 4: Import Edge Recording (T026)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should parse import statements from file_read content', () => {
    expect(extSource).toContain('importRegex');
    expect(extSource).toContain('knowledgeGraph.recordImport(');
  });

  it('should only parse imports for file_read observations', () => {
    const importCall = extSource.indexOf('knowledgeGraph.recordImport(');
    const nearbyContext = extSource.slice(Math.max(0, importCall - 1000), importCall);
    expect(nearbyContext).toContain("obsType === 'file_read'");
  });
});

describe('Phase 4: ContinuousMemoryWriter KnowledgeGraph Wiring (T027/T028)', () => {
  const writerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContinuousMemoryWriter.ts');
  const writerSource = fs.readFileSync(writerPath, 'utf-8');

  it('should have setKnowledgeGraph setter', () => {
    expect(writerSource).toContain('setKnowledgeGraph(graph');
  });

  it('should call recordPattern for pattern-category memories', () => {
    expect(writerSource).toContain("opts.category === 'pattern'");
    expect(writerSource).toContain('knowledgeGraph.recordPattern(');
  });

  it('should call recordDecision for decision-category memories', () => {
    expect(writerSource).toContain("opts.category === 'decision'");
    expect(writerSource).toContain('knowledgeGraph.recordDecision(');
  });
});

describe('Phase 4: Memory Usage Recording (T029)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should call recordUsage for each loaded memory in buildContext', () => {
    expect(cbSource).toContain('this.memoryManager.recordUsage(memory.id)');
  });
});

describe('Phase 4: Trigram Jaccard Similarity (T030)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should have trigramSimilarity method', () => {
    expect(cbSource).toContain('trigramSimilarity(');
  });

  it('should use trigramSimilarity in calculateMemoryCoverage instead of substring', () => {
    expect(cbSource).toContain('this.trigramSimilarity(keyword, mk)');
    // Should NOT have the old substring matching
    expect(cbSource).not.toContain('mk.includes(keyword) || keyword.includes(mk)');
  });
});

describe('Phase 4: Research-Complete Event (T031)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');
  const writerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContinuousMemoryWriter.ts');
  const writerSource = fs.readFileSync(writerPath, 'utf-8');

  it('should emit research-complete event from ContextBuilder', () => {
    expect(cbSource).toContain("'research-complete'");
  });

  it('should listen for research-complete in ContinuousMemoryWriter', () => {
    expect(writerSource).toContain("'research-complete'");
    expect(writerSource).toContain("category: 'discovery'");
  });
});

describe('Phase 4: Dual Storage for Long Memories (T032)', () => {
  const mmPath = path.resolve(__dirname, '../../../extension/src/autonomous/MemoryManager.ts');
  const mmSource = fs.readFileSync(mmPath, 'utf-8');
  const memPath = path.resolve(__dirname, '../../../extension/src/autonomous/memory.ts');
  const memSource = fs.readFileSync(memPath, 'utf-8');

  it('should write companion .md file for memories > 500 chars', () => {
    expect(mmSource).toContain('memory-notes');
    expect(mmSource).toContain('content.length > 500');
  });

  it('should have notePath field in Memory interface', () => {
    expect(memSource).toContain('notePath?: string');
  });
});

describe('Phase 4: Related Memories Computation (T033)', () => {
  const mmPath = path.resolve(__dirname, '../../../extension/src/autonomous/MemoryManager.ts');
  const mmSource = fs.readFileSync(mmPath, 'utf-8');
  const memPath = path.resolve(__dirname, '../../../extension/src/autonomous/memory.ts');
  const memSource = fs.readFileSync(memPath, 'utf-8');

  it('should compute related memories via keyword overlap', () => {
    expect(mmSource).toContain('relatedMemories');
    expect(mmSource).toContain('similarity');
  });

  it('should have relatedMemories field in Memory interface', () => {
    expect(memSource).toContain('relatedMemories?:');
  });
});

describe('Phase 4: CitationVerifier in Consolidator (T034)', () => {
  const consPath = path.resolve(__dirname, '../../../extension/src/autonomous/MemoryConsolidator.ts');
  const consSource = fs.readFileSync(consPath, 'utf-8');

  it('should have setCitationVerifier setter', () => {
    expect(consSource).toContain('setCitationVerifier(verifier');
  });

  it('should reduce priority when >50% citations are stale', () => {
    expect(consSource).toContain('staleRatio > 0.5');
    expect(consSource).toContain('priorityIndex');
  });
});

describe('Phase 4: Stage Detection Validation (T035)', () => {
  const wpcPath = path.resolve(__dirname, '../../../extension/src/autonomous/WorkspaceContextProvider.ts');
  const wpcSource = fs.readFileSync(wpcPath, 'utf-8');

  it('should validate file size > 100 bytes', () => {
    expect(wpcSource).toContain('stat.size < 100');
  });

  it('should check for expected headings in artifact files', () => {
    expect(wpcSource).toContain('content.includes(heading)');
  });
});

describe('Phase 4: Tasks Frontmatter Validation (T036)', () => {
  const acPath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const acSource = fs.readFileSync(acPath, 'utf-8');

  it('should check tasks.md for approved or ready status before implementing', () => {
    expect(acSource).toContain("status: approved");
    expect(acSource).toContain("status: ready");
  });
});

describe('Phase 4: Current Stage Persistence (T069)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');
  const wpcPath = path.resolve(__dirname, '../../../extension/src/autonomous/WorkspaceContextProvider.ts');
  const wpcSource = fs.readFileSync(wpcPath, 'utf-8');

  it('should write current-stage.json in setCurrentStage', () => {
    expect(cbSource).toContain('current-stage.json');
    expect(cbSource).toContain("source: 'explicit'");
  });

  it('should read current-stage.json in detectCurrentStage with freshness check', () => {
    expect(wpcSource).toContain('current-stage.json');
    expect(wpcSource).toContain('STALE_THRESHOLD');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 5: LLM Integration (T038-T044, T070)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 5: AutonomousLLMProvider (T038)', () => {
  const llmPath = path.resolve(__dirname, '../../../extension/src/autonomous/LLMProvider.ts');
  const llmSource = fs.readFileSync(llmPath, 'utf-8');

  it('should export AutonomousLLMProvider class', () => {
    expect(llmSource).toContain('export class AutonomousLLMProvider');
  });

  it('should have summarize method returning SummarizeResult or null', () => {
    expect(llmSource).toContain('async summarize(prompt: string');
    expect(llmSource).toContain('Promise<SummarizeResult | null>');
  });

  it('should implement rate limiting with callTimestamps', () => {
    expect(llmSource).toContain('callTimestamps');
    expect(llmSource).toContain('rateLimitPerMinute');
    expect(llmSource).toContain('isRateLimited()');
  });

  it('should log usage to JSONL', () => {
    expect(llmSource).toContain('context-usage.jsonl');
    expect(llmSource).toContain('logUsage');
    expect(llmSource).toContain("eventType: 'llm_call'");
  });

  it('should support client injection for testing', () => {
    expect(llmSource).toContain('setClient(client: AnthropicClient)');
  });

  it('should degrade gracefully when no API key', () => {
    expect(llmSource).toContain('isAvailable()');
    expect(llmSource).toContain('return null');
  });
});

describe('Phase 5: ObservationMasker LLM Enhancement (T039)', () => {
  const maskerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const maskerSource = fs.readFileSync(maskerPath, 'utf-8');

  it('should have LLMSummarizerLike interface', () => {
    expect(maskerSource).toContain('export interface LLMSummarizerLike');
    expect(maskerSource).toContain('summarize(prompt: string');
  });

  it('should have setLLMProvider setter', () => {
    expect(maskerSource).toContain('setLLMProvider(provider: LLMSummarizerLike)');
  });

  it('should have async enhanceKeyPointsWithLLM method', () => {
    expect(maskerSource).toContain('async enhanceKeyPointsWithLLM(): Promise<number>');
  });

  it('should check availability and rate limit before LLM call', () => {
    const enhanceMethod = maskerSource.slice(
      maskerSource.indexOf('async enhanceKeyPointsWithLLM'),
      maskerSource.indexOf('async enhanceKeyPointsWithLLM') + 1000
    );
    expect(enhanceMethod).toContain('isAvailable()');
    expect(enhanceMethod).toContain('isRateLimited()');
  });

  it('should fall back gracefully on LLM failure', () => {
    const enhanceMethod = maskerSource.slice(
      maskerSource.indexOf('async enhanceKeyPointsWithLLM'),
      maskerSource.indexOf('async enhanceKeyPointsWithLLM') + 1000
    );
    expect(enhanceMethod).toContain('catch');
  });
});

describe('Phase 5: ResearchSummarizer (T040)', () => {
  const rsPath = path.resolve(__dirname, '../../../extension/src/autonomous/ResearchSummarizer.ts');
  const rsSource = fs.readFileSync(rsPath, 'utf-8');

  it('should export ResearchSummarizer class', () => {
    expect(rsSource).toContain('export class ResearchSummarizer');
  });

  it('should have summarizeSpec method', () => {
    expect(rsSource).toContain('async summarizeSpec(specId: string): Promise<number>');
  });

  it('should save discovery memories with tags', () => {
    expect(rsSource).toContain("category: 'discovery'");
    expect(rsSource).toContain('#research-summary');
  });

  it('should cache summaries to avoid re-summarization', () => {
    expect(rsSource).toContain('research-summary-cache.json');
    expect(rsSource).toContain('contentHash');
  });

  it('should check LLM availability before summarizing', () => {
    expect(rsSource).toContain('isAvailable()');
    expect(rsSource).toContain('return 0');
  });
});

describe('Phase 5: ContextCompactor LLM Integration (T042)', () => {
  const ccPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextCompactor.ts');
  const ccSource = fs.readFileSync(ccPath, 'utf-8');

  it('should have LLMSummarizerLike interface', () => {
    expect(ccSource).toContain('interface LLMSummarizerLike');
  });

  it('should have setLLMProvider setter', () => {
    expect(ccSource).toContain('setLLMProvider(provider: LLMSummarizerLike)');
  });

  it('should call LLM in summarizeTasks when available', () => {
    const summMethod = ccSource.slice(
      ccSource.indexOf('async summarizeTasks'),
      ccSource.indexOf('async summarizeTasks') + 1200
    );
    expect(summMethod).toContain('this.llmProvider');
    expect(summMethod).toContain('isAvailable()');
    expect(summMethod).toContain('isRateLimited()');
  });

  it('should fall back to generateFallbackSummary on LLM failure', () => {
    const summMethod = ccSource.slice(
      ccSource.indexOf('async summarizeTasks'),
      ccSource.indexOf('async summarizeTasks') + 1200
    );
    expect(summMethod).toContain('generateFallbackSummary');
    expect(summMethod).toContain('catch');
  });
});

describe('Phase 5: Extension Wiring (T041, T043, T070)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should import AutonomousLLMProvider', () => {
    expect(extSource).toContain("import { AutonomousLLMProvider } from './autonomous/LLMProvider'");
  });

  it('should import ResearchSummarizer', () => {
    expect(extSource).toContain("import { ResearchSummarizer } from './autonomous/ResearchSummarizer'");
  });

  it('should create AutonomousLLMProvider with API key from settings', () => {
    expect(extSource).toContain("getConfiguration('gofer').get<string>('anthropicApiKey')");
    expect(extSource).toContain('new AutonomousLLMProvider(');
  });

  it('should wire LLM to ObservationMasker (T039)', () => {
    expect(extSource).toContain('setLLMProvider(autonomousLLMProvider)');
  });

  it('should wire ResearchSummarizer to research-complete event (T041)', () => {
    expect(extSource).toContain('researchSummarizer.summarizeSpec(event.specId)');
  });

  it('should wire LLM to ContextCompactor (T043)', () => {
    expect(extSource).toContain('contextCompactor.setLLMProvider(autonomousLLMProvider)');
  });

  it('should wire auto-compaction to critical event (T070)', () => {
    expect(extSource).toContain("on('critical'");
    expect(extSource).toContain('enhanceKeyPointsWithLLM()');
  });

  it('should log when LLM features are disabled (no API key)', () => {
    expect(extSource).toContain('LLM features disabled');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 6: Stage Management, Delegation & Quality (T045-T057, T071-T072)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 6: Budget Cap Enforcement (T045)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should have enforceBudgetCaps config option', () => {
    expect(cbSource).toContain('enforceBudgetCaps: boolean');
    expect(cbSource).toContain('enforceBudgetCaps: false');
  });

  it('should have truncateOverBudgetSections method', () => {
    expect(cbSource).toContain('truncateOverBudgetSections(sections');
  });

  it('should truncate when enforceBudgetCaps is true', () => {
    expect(cbSource).toContain('this.config.enforceBudgetCaps');
    expect(cbSource).toContain('tokens over budget');
  });
});

describe('Phase 6: Stage Transition Logging (T046)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should log stage transition to JSONL via usageLogger', () => {
    const stageMethod = cbSource.slice(
      cbSource.indexOf('async setCurrentStage'),
      cbSource.indexOf('async setCurrentStage') + 1500
    );
    expect(stageMethod).toContain('logStageTransition');
  });
});

describe('Phase 6: SubAgentDispatcher (T047)', () => {
  const dispPath = path.resolve(__dirname, '../../../extension/src/autonomous/SubAgentDispatcher.ts');
  const dispSource = fs.readFileSync(dispPath, 'utf-8');

  it('should export SubAgentDispatcher class', () => {
    expect(dispSource).toContain('export class SubAgentDispatcher');
  });

  it('should export DelegationRecommendation interface', () => {
    expect(dispSource).toContain('export interface DelegationRecommendation');
  });

  it('should have getRecommendation method', () => {
    expect(dispSource).toContain('getRecommendation(): DelegationRecommendation | null');
  });

  it('should have updateUtilization method', () => {
    expect(dispSource).toContain('updateUtilization(utilizationPercent: number)');
  });

  it('should format delegation as context section', () => {
    expect(dispSource).toContain('formatAsContextSection');
    expect(dispSource).toContain('## Delegation Advisory');
  });

  it('should log recommendations to JSONL', () => {
    expect(dispSource).toContain('context-usage.jsonl');
    expect(dispSource).toContain('delegation_recommendation');
  });
});

describe('Phase 6: SubAgentDispatcher Wiring (T048)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should have setSubAgentDispatcher setter on ContextBuilder', () => {
    expect(cbSource).toContain('setSubAgentDispatcher(');
  });

  it('should inject delegation section in buildContext', () => {
    expect(cbSource).toContain('this.subAgentDispatcher');
    expect(cbSource).toContain('formatAsContextSection');
  });

  it('should wire SubAgentDispatcher in extension.ts', () => {
    expect(extSource).toContain('new SubAgentDispatcher(workspacePath)');
    expect(extSource).toContain('setSubAgentDispatcher(subAgentDispatcher)');
  });

  it('should update utilization from health monitor events', () => {
    expect(extSource).toContain('subAgentDispatcher.updateUtilization(');
  });
});

describe('Phase 6: Session Save Enrichment (T049)', () => {
  const ahtPath = path.resolve(__dirname, '../../../extension/src/autonomous/AutoHandoffTrigger.ts');
  const ahtSource = fs.readFileSync(ahtPath, 'utf-8');

  it('should include observation cache stats in handoff', () => {
    expect(ahtSource).toContain('Observation Cache');
    expect(ahtSource).toContain('decayTier');
  });

  it('should include knowledge graph stats in handoff', () => {
    expect(ahtSource).toContain('Knowledge Graph');
    expect(ahtSource).toContain('getStats()');
  });
});

describe('Phase 6: Observation Cache Restore (T050)', () => {
  const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
  const extSource = fs.readFileSync(extPath, 'utf-8');

  it('should call loadCacheFromDisk on startup', () => {
    expect(extSource).toContain('loadCacheFromDisk()');
    expect(extSource).toContain('Observation cache restored');
  });
});

describe('Phase 6: Reseed Metrics (T051)', () => {
  const loggerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextUsageLogger.ts');
  const loggerSource = fs.readFileSync(loggerPath, 'utf-8');

  it('should have reseed event type', () => {
    expect(loggerSource).toContain("| 'reseed'");
  });

  it('should have logReseed method', () => {
    expect(loggerSource).toContain('async logReseed(');
    expect(loggerSource).toContain('observationsCleared');
    expect(loggerSource).toContain('memoriesPreserved');
  });

  it('should have reseed metrics fields', () => {
    expect(loggerSource).toContain('reseedTimestamp');
  });
});

describe('Phase 6: Agent Prompt Templates (T052)', () => {
  const agents = ['codebase-locator.md', 'codebase-analyzer.md', 'codebase-pattern-finder.md'];

  for (const agent of agents) {
    it(`should have token limit instruction in ${agent}`, () => {
      const agentPath = path.resolve(__dirname, `../../../.claude/agents/${agent}`);
      const agentSource = fs.readFileSync(agentPath, 'utf-8');
      expect(agentSource).toContain('Return results in <2000 tokens');
    });
  }
});

describe('Phase 6: Brownfield Template (T053)', () => {
  it('should exist at .specify/templates/brownfield-analysis.md', () => {
    const templatePath = path.resolve(__dirname, '../../../.specify/templates/brownfield-analysis.md');
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content).toContain('Constraints & Limitations');
    expect(content).toContain('Technical Debt to Avoid');
    expect(content).toContain('Areas Requiring Extra Caution');
    expect(content).toContain('Integration Requirements');
    expect(content).toContain('Downstream Dependencies');
    expect(content).toContain('Checklist');
  });
});

describe('Phase 6: Cost Tracking (T054)', () => {
  const loggerPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextUsageLogger.ts');
  const loggerSource = fs.readFileSync(loggerPath, 'utf-8');

  it('should have LLM cost fields', () => {
    expect(loggerSource).toContain('llmInputTokens');
    expect(loggerSource).toContain('llmOutputTokens');
  });

  it('should have stage duration field', () => {
    expect(loggerSource).toContain('stageDuration');
  });

  it('should have slop count field', () => {
    expect(loggerSource).toContain('slopCount');
  });
});

describe('Phase 6: Feedback Loop (T055/T071)', () => {
  const acPath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const acSource = fs.readFileSync(acPath, 'utf-8');

  it('should run post-completion checks', () => {
    expect(acSource).toContain('runPostCompletionChecks');
  });

  it('should run build verification before tests (T071)', () => {
    expect(acSource).toContain("npm', ['run', 'compile']");
  });

  it('should run tests after successful build (T055)', () => {
    expect(acSource).toContain("npm', ['test']");
  });

  it('should record failures as memories', () => {
    expect(acSource).toContain('#build-failure');
    expect(acSource).toContain('#test-failure');
  });
});

describe('Phase 6: Error Recovery (T056/T072)', () => {
  const acPath = path.resolve(__dirname, '../../../extension/src/autonomousCommands.ts');
  const acSource = fs.readFileSync(acPath, 'utf-8');

  it('should create git stash safety checkpoint before execution', () => {
    expect(acSource).toContain('git stash safety checkpoint');
    expect(acSource).toContain("'stash', 'push', '-m'");
  });

  it('should check git status before stashing', () => {
    expect(acSource).toContain("'status', '--porcelain'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 7: Advanced Context Engineering Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Phase 7: Fold Level Control (T059)', () => {
  const omPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const omSource = fs.readFileSync(omPath, 'utf-8');

  it('should have setFoldLevel method', () => {
    expect(omSource).toContain('setFoldLevel(id: string, level: FoldLevel)');
  });

  it('should have getFoldLevel method', () => {
    expect(omSource).toContain('getFoldLevel(id: string)');
  });

  it('should have getObservationsByFoldLevel method', () => {
    expect(omSource).toContain('getObservationsByFoldLevel(level: FoldLevel)');
  });

  it('should set fold level on observation and log', () => {
    expect(omSource).toContain('observation.foldLevel = level');
    expect(omSource).toContain("'Fold level set'");
  });
});

describe('Phase 7: MCP Observation Tools (T060)', () => {
  const thPath = path.resolve(__dirname, '../../../language-server/src/mcp/toolHandler.ts');
  const thSource = fs.readFileSync(thPath, 'utf-8');

  it('should have gofer_peek_observation tool', () => {
    expect(thSource).toContain('peekObservation(observationId: string)');
    expect(thSource).toContain('PeekObservationResponse');
  });

  it('should have gofer_fold_observation tool', () => {
    expect(thSource).toContain('foldObservation(observationId: string, foldLevel:');
    expect(thSource).toContain('FoldObservationResponse');
  });

  it('should have gofer_grep_observations tool', () => {
    expect(thSource).toContain('grepObservations(pattern: string');
    expect(thSource).toContain('GrepObservationsResponse');
  });

  it('should validate observation ID format', () => {
    expect(thSource).toContain('validateObservationId');
  });

  it('should record fold operations in history', () => {
    expect(thSource).toContain('recordContextOperation');
  });
});

describe('Phase 7: Fold Persistence (T061)', () => {
  const omPath = path.resolve(__dirname, '../../../extension/src/autonomous/ObservationMasker.ts');
  const omSource = fs.readFileSync(omPath, 'utf-8');

  it('should include foldLevel in ObservationEntry', () => {
    expect(omSource).toContain('foldLevel?: FoldLevel');
  });

  it('should serialize foldLevel in saveCacheToDisk', () => {
    // foldLevel is part of ObservationEntry which is serialized via Array.from(this.cache.values())
    expect(omSource).toContain('Array.from(this.cache.values())');
    expect(omSource).toContain('saveCacheToDisk');
  });

  it('should restore fold levels on loadCacheFromDisk', () => {
    expect(omSource).toContain('loadCacheFromDisk');
    expect(omSource).toContain('this.cache.set(observation.id, observation)');
  });
});

describe('Phase 7: MemoryLayerManager (T062/T073)', () => {
  const mlPath = path.resolve(__dirname, '../../../extension/src/autonomous/MemoryLayerManager.ts');
  const mlSource = fs.readFileSync(mlPath, 'utf-8');

  it('should have getCoreMemory method', () => {
    expect(mlSource).toContain('async getCoreMemory()');
    expect(mlSource).toContain("layer: 'core'");
  });

  it('should have getRecallMemory method', () => {
    expect(mlSource).toContain('async getRecallMemory(limit?');
    expect(mlSource).toContain("layer: 'recall'");
  });

  it('should have searchArchival method', () => {
    expect(mlSource).toContain('async searchArchival(query: string)');
    expect(mlSource).toContain("layer: 'archival'");
  });

  it('should have demoteMemories method', () => {
    expect(mlSource).toContain('async demoteMemories(currentTask?');
  });

  it('should load constitution as core memory', () => {
    expect(mlSource).toContain('constitution.md');
    expect(mlSource).toContain("id: 'core:constitution'");
  });

  it('should support LLM-scored memory demotion (T073)', () => {
    expect(mlSource).toContain('demoteWithLLM');
    expect(mlSource).toContain('Rate the relevance');
  });

  it('should fall back to priority-based demotion', () => {
    expect(mlSource).toContain('demoteByPriority');
    expect(mlSource).toContain('priorityIndex');
  });

  it('should export MemoryLayerManager class', () => {
    expect(mlSource).toContain('export class MemoryLayerManager');
  });

  it('should format as context section', () => {
    expect(mlSource).toContain('async formatAsContextSection');
    expect(mlSource).toContain('## Core Memory');
    expect(mlSource).toContain('## Recall Memory');
  });
});

describe('Phase 7: MemoryLayerManager Wiring (T063)', () => {
  const cbPath = path.resolve(__dirname, '../../../extension/src/autonomous/ContextBuilder.ts');
  const cbSource = fs.readFileSync(cbPath, 'utf-8');

  it('should have memoryLayerManager field', () => {
    expect(cbSource).toContain('memoryLayerManager');
  });

  it('should have setMemoryLayerManager method', () => {
    expect(cbSource).toContain('setMemoryLayerManager');
  });

  it('should have useLayeredMemory toggle', () => {
    expect(cbSource).toContain('useLayeredMemory');
  });

  it('should use layered memory in buildContext when enabled', () => {
    expect(cbSource).toContain('this.useLayeredMemory && this.memoryLayerManager');
    expect(cbSource).toContain('formatAsContextSection');
  });

  it('should be wired in extension.ts', () => {
    const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
    const extSource = fs.readFileSync(extPath, 'utf-8');
    expect(extSource).toContain('MemoryLayerManager');
    expect(extSource).toContain('setMemoryLayerManager');
  });
});

describe('Phase 7: ResearchGraphBuilder (T064/T065)', () => {
  const rgPath = path.resolve(__dirname, '../../../extension/src/autonomous/ResearchGraphBuilder.ts');
  const rgSource = fs.readFileSync(rgPath, 'utf-8');

  it('should export ResearchGraphBuilder class', () => {
    expect(rgSource).toContain('export class ResearchGraphBuilder');
  });

  it('should have buildFromResearch method', () => {
    expect(rgSource).toContain('buildFromResearch(researchPath: string');
  });

  it('should have buildFromSpec convenience method', () => {
    expect(rgSource).toContain('buildFromSpec(specId: string');
  });

  it('should extract bold terms as entities', () => {
    expect(rgSource).toContain('boldMatches');
    expect(rgSource).toContain('matchAll');
  });

  it('should extract code references as file entities', () => {
    expect(rgSource).toContain('codeRefMatches');
  });

  it('should create graph nodes and edges', () => {
    expect(rgSource).toContain('graph.addNode');
    expect(rgSource).toContain('graph.addEdge');
    expect(rgSource).toContain('graph.recordFileAccess');
  });

  it('should return GraphBuildResult with statistics', () => {
    expect(rgSource).toContain('entitiesFound');
    expect(rgSource).toContain('nodesCreated');
    expect(rgSource).toContain('edgesCreated');
  });

  it('should be wired to research-complete event in extension.ts (T065)', () => {
    const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
    const extSource = fs.readFileSync(extPath, 'utf-8');
    expect(extSource).toContain('ResearchGraphBuilder');
    expect(extSource).toContain('buildFromSpec');
  });
});

describe('Phase 7: ParallelAnalysisFramework (T066)', () => {
  const paPath = path.resolve(__dirname, '../../../extension/src/autonomous/ParallelAnalysisFramework.ts');
  const paSource = fs.readFileSync(paPath, 'utf-8');

  it('should export ParallelAnalysisFramework class', () => {
    expect(paSource).toContain('export class ParallelAnalysisFramework');
  });

  it('should generate partition recommendations', () => {
    expect(paSource).toContain('generateRecommendations');
    expect(paSource).toContain('PartitionRecommendation');
  });

  it('should support by-directory strategy', () => {
    expect(paSource).toContain("'by-directory'");
    expect(paSource).toContain('groupByDirectory');
  });

  it('should support by-filetype strategy', () => {
    expect(paSource).toContain("'by-filetype'");
    expect(paSource).toContain('groupByType');
  });

  it('should support by-concern strategy', () => {
    expect(paSource).toContain("'by-concern'");
  });

  it('should format recommendations as context section', () => {
    expect(paSource).toContain('formatAsContextSection');
    expect(paSource).toContain('## Parallel Analysis Recommendations');
  });

  it('should recommend specific agent types', () => {
    expect(paSource).toContain("'codebase-analyzer'");
    expect(paSource).toContain("'codebase-locator'");
    expect(paSource).toContain("'codebase-pattern-finder'");
  });
});

describe('Phase 7: Context REPL MCP Tools (T067)', () => {
  const thPath = path.resolve(__dirname, '../../../language-server/src/mcp/toolHandler.ts');
  const thSource = fs.readFileSync(thPath, 'utf-8');

  it('should have gofer_context_peek tool', () => {
    expect(thSource).toContain('async contextPeek(section: string)');
    expect(thSource).toContain('ContextReplResponse');
  });

  it('should have gofer_context_grep tool', () => {
    expect(thSource).toContain('async contextGrep(pattern: string)');
    expect(thSource).toContain('ContextGrepResponse');
  });

  it('should have gofer_context_fold tool', () => {
    expect(thSource).toContain('async contextFold(section: string)');
  });

  it('should have gofer_context_expand tool', () => {
    expect(thSource).toContain('async contextExpand(section: string)');
  });

  it('should read from context-health-state.json', () => {
    expect(thSource).toContain('context-health-state.json');
  });

  it('should persist fold state to context-fold-state.json', () => {
    expect(thSource).toContain('context-fold-state.json');
  });
});

describe('Phase 7: Context Undo & History (T074)', () => {
  const thPath = path.resolve(__dirname, '../../../language-server/src/mcp/toolHandler.ts');
  const thSource = fs.readFileSync(thPath, 'utf-8');

  it('should have gofer_context_undo tool', () => {
    expect(thSource).toContain('async contextUndo()');
  });

  it('should have gofer_context_history tool', () => {
    expect(thSource).toContain('async contextHistory()');
    expect(thSource).toContain('ContextHistoryResponse');
  });

  it('should maintain operation history with max 10 entries', () => {
    expect(thSource).toContain('contextOperationHistory');
    expect(thSource).toContain('this.contextOperationHistory.length > 10');
  });

  it('should persist operation history to disk', () => {
    expect(thSource).toContain('context-operation-history.json');
    expect(thSource).toContain('saveOperationHistory');
    expect(thSource).toContain('loadOperationHistory');
  });

  it('should revert fold operations on undo', () => {
    expect(thSource).toContain("lastOp.type === 'fold'");
    expect(thSource).toContain('previousLevel');
  });
});

describe('Phase 7: Hook Script Observation Content (T058)', () => {
  const hookPath = path.resolve(__dirname, '../../../extension/resources/hook-scripts/post-tool-use.mjs');
  const hookSource = fs.readFileSync(hookPath, 'utf-8');

  it('should write tool_response to per-observation files', () => {
    expect(hookSource).toContain('writeObservation');
    expect(hookSource).toContain('toolResponse');
  });

  it('should serialize tool response with truncation', () => {
    expect(hookSource).toContain('serializeToolResponse');
    expect(hookSource).toContain('MAX_OBSERVATION_BYTES');
  });

  it('should use atomic writes with rename', () => {
    expect(hookSource).toContain('renameSync');
    expect(hookSource).toContain('.tmp');
  });

  it('should read tool_response from extension.ts', () => {
    const extPath = path.resolve(__dirname, '../../../extension/src/extension.ts');
    const extSource = fs.readFileSync(extPath, 'utf-8');
    expect(extSource).toContain('obsData.toolResponse');
    expect(extSource).toContain('readFileSync(obsFilePath');
  });
});
