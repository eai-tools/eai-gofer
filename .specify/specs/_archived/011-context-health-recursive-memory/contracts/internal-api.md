# Internal API Contract: Context Health Enhancement

## Overview

This document defines the internal TypeScript APIs for context health management
components. These are used within the extension, not exposed externally.

---

## ObservationMasker API

### Class: ObservationMasker

```typescript
import {
  ObservationMasker,
  ObservationMaskerConfig,
  ObservationEntry,
} from './ObservationMasker';

class ObservationMasker {
  constructor(config?: Partial<ObservationMaskerConfig>);

  // Core operations
  trackObservation(
    entry: Omit<ObservationEntry, 'id' | 'masked' | 'maskedAt'>
  ): string;
  maskOldObservations(currentTurn: number): MaskResult;
  expandObservation(id: string): ObservationEntry | null;

  // Cache management
  getObservation(id: string): ObservationEntry | null;
  getAllObservations(): ObservationEntry[];
  clearCache(): void;
  pruneCache(maxSize?: number): number;

  // Persistence
  saveCacheToDisk(): Promise<void>;
  loadCacheFromDisk(): Promise<void>;

  // Configuration
  updateConfig(config: Partial<ObservationMaskerConfig>): void;
  getConfig(): ObservationMaskerConfig;
}
```

### Interfaces

```typescript
interface ObservationMaskerConfig {
  ageThresholdTurns: number;
  preserveErrorMessages: boolean;
  preservePatterns: RegExp[];
  maxCacheSize: number;
  cacheDirectory: string;
}

interface ObservationEntry {
  id: string;
  timestamp: number;
  turnNumber: number;
  type:
    | 'file_read'
    | 'command_output'
    | 'api_response'
    | 'search_result'
    | 'test_output';
  contentHash: string;
  tokenEstimate: number;
  originalContent: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  masked: boolean;
  maskedAt?: number;
}

interface MaskResult {
  maskedContent: string;
  maskedCount: number;
  tokensSaved: number;
  maskedObservations: ObservationEntry[];
}
```

### Usage Example

```typescript
const masker = new ObservationMasker({
  ageThresholdTurns: 10,
  preserveErrorMessages: true,
});

// Track a new observation
const id = masker.trackObservation({
  timestamp: Date.now(),
  turnNumber: 5,
  type: 'file_read',
  contentHash: sha256(content),
  tokenEstimate: 1500,
  originalContent: content,
  metadata: { filePath: 'src/service.ts' },
});

// Mask old observations
const result = masker.maskOldObservations(currentTurn: 15);
console.log(`Masked ${result.maskedCount} observations, saved ${result.tokensSaved} tokens`);

// Expand when needed
const observation = masker.expandObservation(id);
```

---

## ContextHealthMonitor API

### Class: ContextHealthMonitor

```typescript
import {
  ContextHealthMonitor,
  ContextHealthConfig,
  ContextHealthStatus,
} from './ContextHealthMonitor';
import { EventEmitter } from 'events';

class ContextHealthMonitor extends EventEmitter {
  constructor(config?: Partial<ContextHealthConfig>);

  // Core operations
  analyzeContext(): Promise<ContextHealthStatus>;
  startMonitoring(): void;
  stopMonitoring(): void;

  // Status queries
  getCurrentStatus(): ContextHealthStatus | null;
  getStatusHistory(limit?: number): ContextHealthStatus[];

  // Configuration
  updateConfig(config: Partial<ContextHealthConfig>): void;
  getConfig(): ContextHealthConfig;

  // Events
  on(event: 'healthy', listener: (status: ContextHealthStatus) => void): this;
  on(event: 'warning', listener: (status: ContextHealthStatus) => void): this;
  on(event: 'critical', listener: (status: ContextHealthStatus) => void): this;
  on(
    event: 'handoff-recommended',
    listener: (status: ContextHealthStatus) => void
  ): this;
}
```

### Interfaces

```typescript
interface ContextHealthConfig {
  warningThreshold: number;
  criticalThreshold: number;
  effectiveContextLimit: number;
  checkIntervalMs: number;
  autoHandoffEnabled: boolean;
  logToJsonl: boolean;
}

interface ContextHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  utilizationPercent: number;
  tokensUsed: number;
  tokensLimit: number;
  breakdown: TokenBreakdown;
  recommendations: string[];
  timestamp: number;
  sessionId?: string;
}

interface TokenBreakdown {
  specArtifacts: number;
  memories: number;
  hints: number;
  observations: number;
  systemFiles: number;
  conversation: number;
}
```

### Usage Example

```typescript
const monitor = new ContextHealthMonitor({
  warningThreshold: 0.5,
  criticalThreshold: 0.7,
  autoHandoffEnabled: true,
});

// Listen for events
monitor.on('warning', (status) => {
  console.log(`Context at ${status.utilizationPercent}% - consider saving`);
});

monitor.on('critical', (status) => {
  console.log('Context critical - triggering handoff');
  triggerHandoff(status);
});

// Start monitoring
monitor.startMonitoring();

// Manual check
const status = await monitor.analyzeContext();
```

---

## ContextUsageLogger API

### Class: ContextUsageLogger

```typescript
import { ContextUsageLogger, ContextUsageLogEntry } from './ContextUsageLogger';

class ContextUsageLogger {
  constructor(logPath?: string);

  // Logging
  log(entry: Omit<ContextUsageLogEntry, 'timestamp'>): Promise<void>;
  logHealthCheck(status: ContextHealthStatus, action?: string): Promise<void>;
  logMaskingEvent(maskedCount: number, tokensSaved: number): Promise<void>;

  // Querying
  getRecentEntries(limit?: number): Promise<ContextUsageLogEntry[]>;
  getEntriesBySession(sessionId: string): Promise<ContextUsageLogEntry[]>;
  getEntriesByDateRange(
    start: Date,
    end: Date
  ): Promise<ContextUsageLogEntry[]>;

  // Maintenance
  rotateLog(maxSize?: number): Promise<void>;
}
```

### Interfaces

```typescript
interface ContextUsageLogEntry {
  timestamp: string; // ISO-8601
  sessionId: string;
  stage: string;
  status: 'healthy' | 'warning' | 'critical';
  tokensUsed: number;
  tokensLimit: number;
  utilizationPercent: number;
  action?: string;
  breakdown?: TokenBreakdown;
  maskedObservations?: number;
  tokensSaved?: number;
}
```

---

## StageContextProfile API

### Class: StageContextProfileLoader

```typescript
import {
  StageContextProfileLoader,
  StageContextProfile,
} from './StageContextProfile';

class StageContextProfileLoader {
  constructor(configPath?: string);

  // Loading
  loadProfiles(): Promise<Map<string, StageContextProfile>>;
  getProfile(stage: string): StageContextProfile | null;
  getDefaultProfile(): StageContextProfile;

  // Watching
  watchForChanges(
    callback: (profiles: Map<string, StageContextProfile>) => void
  ): vscode.Disposable;

  // Validation
  validateProfiles(profiles: unknown): profiles is StageContextProfileConfig;
}
```

### Interfaces

```typescript
interface StageContextProfile {
  stage: string;
  researchBudget: number;
  memoryBudget: number;
  codeBudget: number;
  observationWindow: number;
  description?: string;
}

interface StageContextProfileConfig {
  version: number;
  profiles: Record<string, Omit<StageContextProfile, 'stage'>>;
}
```

---

## ResearchChunker API

### Class: ResearchChunker

```typescript
import {
  ResearchChunker,
  ResearchChunk,
  ResearchIndex,
} from './ResearchChunker';

class ResearchChunker {
  constructor(options?: ResearchChunkerOptions);

  // Indexing
  indexResearchFile(filePath: string): Promise<ResearchIndex>;
  getIndex(specId: string): ResearchIndex | null;

  // Chunk operations
  getChunk(specId: string, chunkId: string): ResearchChunk | null;
  getChunksByRelevance(
    specId: string,
    query: string,
    limit?: number
  ): ResearchChunk[];
  loadChunksForTask(specId: string, taskContext: string): ResearchChunk[];

  // Cache management
  clearIndexCache(): void;
  refreshIndex(specId: string): Promise<ResearchIndex>;
}
```

### Interfaces

```typescript
interface ResearchChunkerOptions {
  minChunkSize: number;
  maxChunkSize: number;
  overlapTokens: number;
}

interface ResearchChunk {
  id: string;
  sourceFile: string;
  sectionTitle: string;
  content: string;
  tokenEstimate: number;
  relevanceKeywords: string[];
  order: number;
  headingLevel: number;
}

interface ResearchIndex {
  sourceFile: string;
  totalTokens: number;
  chunkCount: number;
  created: number;
  chunks: ChunkSummary[];
}

interface ChunkSummary {
  id: string;
  title: string;
  tokens: number;
  keywords: string[];
}
```

---

## ContextBuilder Extensions

### Extended ContextBuilder Interface

```typescript
// Additions to existing ContextBuilder class

interface ContextBuilderOptions {
  // Existing options...

  // New options
  enableObservationMasking?: boolean;
  observationMaskerConfig?: Partial<ObservationMaskerConfig>;
  enableHealthMonitoring?: boolean;
  healthMonitorConfig?: Partial<ContextHealthConfig>;
  enableStageProfiles?: boolean;
  currentStage?: string;
  enableResearchChunking?: boolean;
}

class ContextBuilder {
  // Existing methods...

  // New methods
  setCurrentStage(stage: string): void;
  getObservationMasker(): ObservationMasker;
  getHealthMonitor(): ContextHealthMonitor;

  // Modified signature
  buildContext(
    task: TaskContext,
    options?: BuildContextOptions
  ): Promise<BuiltContext>;
}

interface BuildContextOptions {
  skipMasking?: boolean;
  skipHealthCheck?: boolean;
  forceFullResearch?: boolean;
}

interface BuiltContext {
  // Existing fields...

  // New fields
  contextHealth?: ContextHealthStatus;
  maskedObservations?: number;
  tokensSaved?: number;
  loadedChunks?: string[];
}
```

---

## Event Bus

### ContextEventBus

Centralized event bus for context-related events across components.

```typescript
import { ContextEventBus } from './ContextEventBus';

// Singleton instance
const eventBus = ContextEventBus.getInstance();

// Event types
type ContextEvent =
  | { type: 'observation-created'; payload: ObservationEntry }
  | {
      type: 'observation-masked';
      payload: { count: number; tokensSaved: number };
    }
  | { type: 'health-changed'; payload: ContextHealthStatus }
  | { type: 'stage-changed'; payload: { from: string; to: string } }
  | { type: 'handoff-triggered'; payload: { reason: string; file: string } };

// Usage
eventBus.emit({
  type: 'observation-masked',
  payload: { count: 5, tokensSaved: 3000 },
});
eventBus.on('health-changed', (event) => {
  if (event.payload.status === 'critical') {
    // Handle critical status
  }
});
```

---

## Error Types

```typescript
// Custom error types for context health module

class ContextHealthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ContextHealthError';
  }
}

class ObservationNotFoundError extends ContextHealthError {
  constructor(id: string) {
    super(`Observation not found: ${id}`, 'OBSERVATION_NOT_FOUND');
  }
}

class ChunkNotFoundError extends ContextHealthError {
  constructor(specId: string, chunkId: string) {
    super(`Chunk not found: ${chunkId} in spec ${specId}`, 'CHUNK_NOT_FOUND');
  }
}

class ConfigurationError extends ContextHealthError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
  }
}
```
