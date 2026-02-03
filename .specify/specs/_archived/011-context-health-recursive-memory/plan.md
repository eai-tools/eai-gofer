---
feature: Context Health and Recursive Memory Enhancement
spec: spec.md
research: research.md
status: ready
created: '2026-01-25'
branch: 011-context-health-recursive-memory
---

# Implementation Plan: Context Health and Recursive Memory Enhancement

## Summary

Enhance Gofer's context window management and memory systems to maintain
high-quality agent performance throughout the entire development lifecycle. The
implementation follows the recommended phased approach from spec.md, starting
with quick wins (observation masking, stage profiles, memory-first loading)
before advancing to more sophisticated techniques.

**Primary goals**:

1. 50% context reduction via observation masking
2. Automatic context health monitoring with threshold-triggered handoffs
3. Stage-aware context profiles for optimal resource allocation
4. Memory-first loading to leverage existing memory system

---

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2 (strict mode)
- **Framework**: VSCode Extension API + Language Server Protocol
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Storage**: File-based (JSON, JSONL, Markdown)
- **Build**: Webpack bundling

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTEXT HEALTH ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ContextHealthMonitor (NEW)                                   │   │
│  │  - Real-time context usage tracking                          │   │
│  │  - Threshold-based alerts (50%/70%)                          │   │
│  │  - Auto-trigger handoff at critical threshold                │   │
│  │  - Status bar integration                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ObservationMasker (NEW)                                      │   │
│  │  - Track observation history with timestamps                 │   │
│  │  - Mask observations older than N turns                      │   │
│  │  - Preserve action/reasoning history                         │   │
│  │  - On-demand expansion via MCP tool                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ContextBuilder (MODIFY)                                      │   │
│  │  - Add masking step after context merge                      │   │
│  │  - Integrate health monitoring                               │   │
│  │  - Stage-aware loading profiles                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MemoryManager (MODIFY)                                       │   │
│  │  - Memory-first loading preference                           │   │
│  │  - Priority-based retrieval ordering                         │   │
│  │  - Integration with spec-010 AgenticMemory                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Storage:                                                            │
│  .specify/                                                           │
│  ├── memory/                                                         │
│  │   ├── local.json              (existing memories)                │
│  │   ├── context-profiles.yaml   (NEW: stage profiles)             │
│  │   └── observation-cache/      (NEW: masked observation storage) │
│  └── logs/                                                           │
│      ├── context-usage.jsonl     (NEW: context health log)          │
│      └── council-usage.jsonl     (existing)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Integration Points

| Component            | File                                                   | Integration Type                 |
| -------------------- | ------------------------------------------------------ | -------------------------------- |
| ContextBuilder       | `extension/src/autonomous/ContextBuilder.ts:116`       | Modify - add masking             |
| MemoryManager        | `extension/src/autonomous/MemoryManager.ts:115`        | Modify - priority ordering       |
| CompactionStrategy   | `extension/src/autonomous/compaction.ts:43`            | Extend - add masking config      |
| TelemetryIntegration | `extension/src/autonomous/telemetryIntegration.ts:290` | Extend - add tracking            |
| Session interface    | `extension/src/autonomous/compaction.ts:99`            | Extend - add observation history |
| UsageLogger          | `extension/src/council/UsageLogger.ts:96`              | Pattern to follow                |

### Key Dependencies

**Existing to leverage**:

- `MemoryManager` - Memory CRUD operations
- `ContextBuilder` - Context merging pipeline
- `CompactionStrategy` - Compaction configuration
- `UsageLogger` - JSONL logging pattern
- `check-context-health.sh` - Reference implementation

**New to create**:

- `ContextHealthMonitor` - Real-time monitoring
- `ObservationMasker` - Observation tracking and masking
- `StageContextProfile` - Stage-aware configuration
- `ContextUsageLogger` - Context-specific JSONL logging

---

## Constitution Check

Verifying alignment with `.specify/memory/constitution.md`:

- [x] **I. Test-Driven Development**: Tests written before implementation for
      all new classes
- [x] **II. MCP-First Architecture**: New MCP tool `gofer_expand_observation`
      follows naming convention
- [x] **III. Spec Kit Format Compliance**: All artifacts in
      `.specify/specs/011-*/`
- [x] **IV. Strict TypeScript**: No `any` types, strict mode, functions ≤300
      lines
- [x] **V. Security by Default**: No secrets, validated inputs, path traversal
      prevention
- [x] **VI. Performance Requirements**: Masking <10ms, health check <50ms,
      memory loading <200ms
- [x] **VII. 80% Test Coverage Minimum**: Target 85%+ for new modules

---

## Implementation Phases

### Phase 1: Foundation - Observation Masking (Week 1)

**Goal**: Implement observation masking to achieve 50% context reduction

**User Stories Addressed**: US1 (Context Health), US2 (Observation Masking)

#### 1.1 Create ObservationMasker Module

**File**: `extension/src/autonomous/ObservationMasker.ts`

```typescript
// Core interfaces
interface ObservationEntry {
  id: string;
  timestamp: number;
  type: 'file_read' | 'command_output' | 'api_response' | 'search_result';
  contentHash: string;
  tokenEstimate: number;
  originalContent: string;
  metadata: Record<string, unknown>;
}

interface MaskResult {
  maskedContent: string;
  maskedCount: number;
  tokensSaved: number;
  maskedObservations: ObservationEntry[];
}

interface ObservationMaskerConfig {
  ageThresholdTurns: number; // Default: 10
  preserveErrorMessages: boolean; // Default: true
  preservePatterns: RegExp[]; // Patterns to never mask
  maxCacheSize: number; // Default: 100 observations
}
```

**Tasks**:

- [ ] T001 [Setup] Create ObservationMasker class with config interface
- [ ] T002 [Core] Implement observation tracking (add, get, clear)
- [ ] T003 [Core] Implement mask() method with age-based filtering
- [ ] T004 [Core] Implement placeholder generation with metadata
- [ ] T005 [Core] Implement observation cache storage/retrieval
- [ ] T006 [Test] Unit tests for ObservationMasker (target 90% coverage)

#### 1.2 Create MCP Tool for Observation Expansion

**File**: `language-server/src/mcp/toolHandler.ts` (extend)

**Tasks**:

- [ ] T007 [API] Add `gofer_expand_observation` MCP tool definition
- [ ] T008 [API] Implement tool handler with observation ID lookup
- [ ] T009 [Test] Integration tests for expand tool

#### 1.3 Integrate with ContextBuilder

**File**: `extension/src/autonomous/ContextBuilder.ts` (modify)

**Tasks**:

- [ ] T010 [Integration] Add ObservationMasker to ContextBuilder constructor
- [ ] T011 [Integration] Call maskObservations() after mergeContextSections()
- [ ] T012 [Integration] Track observation history during context building
- [ ] T013 [Test] Update ContextBuilder tests for masking integration

**Verification**:

- [ ] All unit tests pass
- [ ] Integration tests demonstrate 50% context reduction
- [ ] Observation expansion works via MCP tool
- [ ] No regression in existing functionality

---

### Phase 2: Context Health Monitoring (Week 1-2)

**Goal**: Implement automatic context health monitoring with threshold alerts

**User Stories Addressed**: US1 (Context Health Monitoring)

#### 2.1 Create ContextHealthMonitor Module

**File**: `extension/src/autonomous/ContextHealthMonitor.ts`

```typescript
interface ContextHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  utilizationPercent: number;
  tokensUsed: number;
  tokensLimit: number;
  breakdown: {
    specArtifacts: number;
    memories: number;
    hints: number;
    observations: number;
    systemFiles: number;
  };
  recommendations: string[];
  timestamp: number;
}

interface ContextHealthConfig {
  warningThreshold: number; // Default: 0.5 (50%)
  criticalThreshold: number; // Default: 0.7 (70%)
  effectiveContextLimit: number; // Default: 120000
  checkIntervalMs: number; // Default: 5000
  autoHandoffEnabled: boolean; // Default: true
}
```

**Tasks**:

- [ ] T014 [Setup] Create ContextHealthMonitor class with config
- [ ] T015 [Core] Implement analyzeContext() method (TypeScript port of shell
      script)
- [ ] T016 [Core] Implement token counting for each breakdown category
- [ ] T017 [Core] Implement threshold checking with recommendations
- [ ] T018 [Core] Implement periodic monitoring with event emitter
- [ ] T019 [Test] Unit tests for ContextHealthMonitor (target 90% coverage)

#### 2.2 Create Context Usage Logger

**File**: `extension/src/autonomous/ContextUsageLogger.ts`

**Tasks**:

- [ ] T020 [Logging] Create ContextUsageLogger following UsageLogger pattern
- [ ] T021 [Logging] Implement JSONL append to
      `.specify/logs/context-usage.jsonl`
- [ ] T022 [Logging] Add log entry structure with breakdown fields
- [ ] T023 [Test] Unit tests for logger

#### 2.3 VSCode Status Bar Integration

**File**: `extension/src/ui/contextHealthStatusBar.ts` (new)

**Tasks**:

- [ ] T024 [UI] Create status bar item for context health
- [ ] T025 [UI] Implement color-coded status display (green/yellow/red)
- [ ] T026 [UI] Add click handler to show detailed breakdown
- [ ] T027 [Integration] Register status bar in extension activation
- [ ] T028 [Test] UI integration tests

#### 2.4 Auto-Handoff Trigger

**File**: `extension/src/autonomous/ContextHealthMonitor.ts` (extend)

**Tasks**:

- [ ] T029 [Core] Implement auto-handoff trigger at critical threshold
- [ ] T030 [Core] Show notification with handoff recommendation
- [ ] T031 [Integration] Integrate with /7_gofer_save command
- [ ] T032 [Test] E2E test for auto-handoff flow

**Verification**:

- [ ] Status bar displays accurate context health
- [ ] Warning notification at 50% threshold
- [ ] Auto-handoff trigger at 70% threshold
- [ ] JSONL logging captures all health checks
- [ ] All tests pass with 90%+ coverage

---

### Phase 3: Stage-Aware Context Profiles (Week 2)

**Goal**: Implement stage-specific context budget allocation

**User Stories Addressed**: US5 (Stage-Aware Context Profiles)

#### 3.1 Create Stage Profile Configuration

**File**: `.specify/memory/context-profiles.yaml`

```yaml
version: 1
profiles:
  research:
    researchBudget: 0.40
    memoryBudget: 0.10
    codeBudget: 0.30
    observationWindow: 20
    description: 'High research, low code'

  specify:
    researchBudget: 0.30
    memoryBudget: 0.20
    codeBudget: 0.20
    observationWindow: 15
    description: 'Balanced for specification'

  plan:
    researchBudget: 0.25
    memoryBudget: 0.25
    codeBudget: 0.30
    observationWindow: 15
    description: 'Architecture focus'

  tasks:
    researchBudget: 0.15
    memoryBudget: 0.20
    codeBudget: 0.20
    observationWindow: 10
    description: 'Task breakdown focus'

  implement:
    researchBudget: 0.10
    memoryBudget: 0.25
    codeBudget: 0.50
    observationWindow: 15
    description: 'Code-heavy implementation'

  validate:
    researchBudget: 0.15
    memoryBudget: 0.20
    codeBudget: 0.40
    observationWindow: 20
    description: 'Testing and validation'
```

**Tasks**:

- [ ] T033 [Config] Create context-profiles.yaml template
- [ ] T034 [Config] Create StageContextProfile TypeScript interface
- [ ] T035 [Config] Implement YAML config loader with validation
- [ ] T036 [Test] Unit tests for config loading

#### 3.2 Integrate Profiles with ContextBuilder

**File**: `extension/src/autonomous/ContextBuilder.ts` (modify)

**Tasks**:

- [ ] T037 [Integration] Add currentStage property to ContextBuilder
- [ ] T038 [Integration] Load stage profile at context build time
- [ ] T039 [Integration] Implement budget enforcement with warnings
- [ ] T040 [Integration] Add profile switching on stage transition
- [ ] T041 [Test] Integration tests for stage profiles

**Verification**:

- [ ] Stage profiles load correctly from YAML
- [ ] Budget warnings appear when exceeded
- [ ] Profile switching works at stage transitions
- [ ] All tests pass

---

### Phase 4: Memory-First Loading (Week 2)

**Goal**: Load memories before research documents for better relevance

**User Stories Addressed**: US4 (Memory-First Loading)

#### 4.1 Enhance MemoryManager for Priority Loading

**File**: `extension/src/autonomous/MemoryManager.ts` (modify)

**Tasks**:

- [ ] T042 [Core] Add priority-based sorting to search() results
- [ ] T043 [Core] Implement loadByPriority() method
- [ ] T044 [Core] Add relevance scoring for task context
- [ ] T045 [Test] Unit tests for priority loading

#### 4.2 Update ContextBuilder Loading Order

**File**: `extension/src/autonomous/ContextBuilder.ts` (modify)

**Tasks**:

- [ ] T046 [Integration] Load memories before research in buildContext()
- [ ] T047 [Integration] Track memory coverage vs research gaps
- [ ] T048 [Integration] Implement lazy research loading for gaps
- [ ] T049 [Test] Integration tests for loading order

**Verification**:

- [ ] Memories loaded first in context
- [ ] Research loaded only for gaps
- [ ] 40% reduction in average context usage
- [ ] All tests pass

---

### Phase 5: Research Document Chunking (Week 3)

**Goal**: Split research documents for on-demand loading

**User Stories Addressed**: US3 (Research Document Optimization)

#### 5.1 Create ResearchChunker Module

**File**: `extension/src/autonomous/ResearchChunker.ts`

```typescript
interface ResearchChunk {
  id: string;
  sectionTitle: string;
  content: string;
  tokenEstimate: number;
  relevanceKeywords: string[];
  order: number;
}

interface ResearchIndex {
  totalTokens: number;
  chunkCount: number;
  chunks: Array<{
    id: string;
    title: string;
    tokens: number;
    keywords: string[];
  }>;
}
```

**Tasks**:

- [ ] T050 [Core] Create ResearchChunker class
- [ ] T051 [Core] Implement semantic chunking by markdown sections
- [ ] T052 [Core] Implement index generation
- [ ] T053 [Core] Implement on-demand chunk loading
- [ ] T054 [Test] Unit tests for chunker

#### 5.2 Create MCP Tool for Chunk Loading

**File**: `language-server/src/mcp/toolHandler.ts` (extend)

**Tasks**:

- [ ] T055 [API] Add `gofer_load_research_chunk` MCP tool
- [ ] T056 [API] Implement chunk lookup and retrieval
- [ ] T057 [Test] Integration tests for chunk loading

#### 5.3 Integrate with ContextBuilder

**Tasks**:

- [ ] T058 [Integration] Load research index instead of full document
- [ ] T059 [Integration] Implement relevance scoring for chunks
- [ ] T060 [Integration] Load top-N chunks based on task context
- [ ] T061 [Test] Integration tests for chunked loading

**Verification**:

- [ ] Research index loads instead of full document
- [ ] Chunks loaded on-demand
- [ ] 60% reduction in research context usage
- [ ] All tests pass

---

### Phase 6: Telemetry and Observability (Week 3)

**Goal**: Add comprehensive tracking for context management

**User Stories Addressed**: Cross-cutting observability

#### 6.1 Extend TelemetryIntegration

**File**: `extension/src/autonomous/telemetryIntegration.ts` (modify)

**Tasks**:

- [ ] T062 [Telemetry] Add trackContextHealthCheck() method
- [ ] T063 [Telemetry] Add trackObservationMasked() method
- [ ] T064 [Telemetry] Add trackStageProfileSwitch() method
- [ ] T065 [Telemetry] Add trackMemoryFirstHit() method
- [ ] T066 [Test] Unit tests for new telemetry methods

#### 6.2 Dashboard Integration

**Tasks**:

- [ ] T067 [UI] Add context health section to existing dashboard
- [ ] T068 [UI] Display masking statistics
- [ ] T069 [UI] Display stage profile usage
- [ ] T070 [Test] UI tests for dashboard

**Verification**:

- [ ] All context operations tracked
- [ ] Dashboard displays accurate metrics
- [ ] JSONL logs queryable for analysis

---

### Phase 7: Integration Testing and Polish (Week 4)

**Goal**: Ensure all components work together seamlessly

#### 7.1 End-to-End Testing

**Tasks**:

- [ ] T071 [E2E] Test full Gofer pipeline with context management
- [ ] T072 [E2E] Test observation masking across multiple stages
- [ ] T073 [E2E] Test auto-handoff trigger flow
- [ ] T074 [E2E] Test memory-first loading with research fallback

#### 7.2 Performance Validation

**Tasks**:

- [ ] T075 [Perf] Validate observation masking <10ms
- [ ] T076 [Perf] Validate health check <50ms
- [ ] T077 [Perf] Validate memory loading <200ms
- [ ] T078 [Perf] Validate overall context reduction ≥40%

#### 7.3 Documentation

**Tasks**:

- [ ] T079 [Docs] Update CLAUDE.md with new context management features
- [ ] T080 [Docs] Add context management section to README
- [ ] T081 [Docs] Document MCP tools in API reference

**Verification**:

- [ ] All E2E tests pass
- [ ] Performance requirements met
- [ ] Documentation complete
- [ ] No regression in existing functionality

---

## File Structure

```
extension/src/autonomous/
├── ObservationMasker.ts           # NEW - Observation tracking and masking
├── ContextHealthMonitor.ts        # NEW - Real-time health monitoring
├── ContextUsageLogger.ts          # NEW - JSONL logging for context
├── ResearchChunker.ts             # NEW - Research document chunking
├── StageContextProfile.ts         # NEW - Stage profile configuration
├── ContextBuilder.ts              # MODIFY - Integration point
├── MemoryManager.ts               # MODIFY - Priority loading
├── compaction.ts                  # MODIFY - Extend interfaces
├── telemetryIntegration.ts        # MODIFY - New tracking methods
└── __tests__/
    ├── ObservationMasker.test.ts
    ├── ContextHealthMonitor.test.ts
    ├── ContextUsageLogger.test.ts
    ├── ResearchChunker.test.ts
    └── StageContextProfile.test.ts

extension/src/ui/
├── contextHealthStatusBar.ts      # NEW - Status bar widget
└── __tests__/
    └── contextHealthStatusBar.test.ts

language-server/src/mcp/
├── toolHandler.ts                 # MODIFY - Add new MCP tools
└── __tests__/
    └── toolHandler.test.ts        # MODIFY - New tool tests

.specify/
├── memory/
│   ├── context-profiles.yaml      # NEW - Stage configuration
│   └── observation-cache/         # NEW - Cached observations
└── logs/
    └── context-usage.jsonl        # NEW - Context health log
```

---

## Risk Assessment

| Risk                                | Impact | Likelihood | Mitigation                                      |
| ----------------------------------- | ------ | ---------- | ----------------------------------------------- |
| Performance regression from masking | High   | Low        | Benchmark all operations, cache aggressively    |
| Information loss from over-masking  | High   | Medium     | Preserve error messages, allow manual expansion |
| Complexity in stage transitions     | Medium | Medium     | Thorough integration testing                    |
| Memory storage growth               | Low    | Medium     | Implement observation cache pruning             |
| Breaking existing workflows         | High   | Low        | Comprehensive regression tests                  |

---

## Spec Traceability

### User Story Coverage

| Story                       | Priority | Plan Phase(s) | Components                              | Status   |
| --------------------------- | -------- | ------------- | --------------------------------------- | -------- |
| US1 (Context Health)        | P1       | Phase 2       | ContextHealthMonitor, StatusBar, Logger | COVERED  |
| US2 (Observation Masking)   | P1       | Phase 1       | ObservationMasker, MCP Tool             | COVERED  |
| US3 (Research Optimization) | P2       | Phase 5       | ResearchChunker, MCP Tool               | COVERED  |
| US4 (Memory-First Loading)  | P1       | Phase 4       | MemoryManager, ContextBuilder           | COVERED  |
| US5 (Stage Profiles)        | P2       | Phase 3       | StageContextProfile, YAML Config        | COVERED  |
| US6 (RLM-Lite)              | P3       | Future        | Not in this plan                        | DEFERRED |

### Requirement Coverage

| Requirement               | Plan Phase | Task Group | Status  |
| ------------------------- | ---------- | ---------- | ------- |
| Observation masking layer | Phase 1    | T001-T013  | COVERED |
| MCP tool for expansion    | Phase 1    | T007-T009  | COVERED |
| Context health monitoring | Phase 2    | T014-T032  | COVERED |
| JSONL logging             | Phase 2    | T020-T023  | COVERED |
| Status bar integration    | Phase 2    | T024-T028  | COVERED |
| Auto-handoff trigger      | Phase 2    | T029-T032  | COVERED |
| Stage profiles            | Phase 3    | T033-T041  | COVERED |
| Memory-first loading      | Phase 4    | T042-T049  | COVERED |
| Research chunking         | Phase 5    | T050-T061  | COVERED |
| Telemetry tracking        | Phase 6    | T062-T070  | COVERED |

**Coverage**: 100% of user stories (5/5 P1-P2), 100% of Phase 1-2 requirements

---

## Notes

- Phase 1-2 are highest priority (observation masking + health monitoring)
- Memory-first loading (Phase 4) leverages existing spec-010 memory system
- RLM-Lite (US6) deferred to future work due to complexity
- All modifications preserve existing API compatibility
- Performance benchmarks required before each phase completion
