---
spec: 012-context-health-integration
title: Internal API Contracts
---

# Internal API Contracts

## State File Format

### `.specify/memory/context-health-state.json`

Written by extension, read by language server.

```typescript
interface ContextHealthState {
  timestamp: number; // Unix timestamp (ms)
  status: 'healthy' | 'warning' | 'critical';
  utilizationPercent: number; // 0-100
  tokensUsed: number;
  tokensLimit: number;
  breakdown: {
    specArtifacts: number;
    memories: number;
    hints: number;
    observations: number;
    systemFiles: number;
    conversation: number;
  };
  recommendations: string[];
  sessionId?: string;
  stage?: string;
}
```

**Freshness:** State is considered stale if `timestamp` is more than 30 seconds
old.

---

## JSONL Log Format

### `.specify/logs/context-usage.jsonl`

```typescript
interface BaseLogEntry {
  timestamp: string; // ISO 8601
  sessionId: string;
  eventType: EventType;
}

type EventType =
  | 'health_check'
  | 'masking'
  | 'stage_transition'
  | 'handoff'
  | 'session_start'
  | 'session_end'
  | 'memory_save'
  | 'memory_search'
  | 'memory_load'
  | 'loading_decision';
```

### Health Check Event

```typescript
interface HealthCheckLogEntry extends BaseLogEntry {
  eventType: 'health_check';
  status: 'healthy' | 'warning' | 'critical';
  utilizationPercent: number;
  tokensUsed: number;
  tokensLimit: number;
  stage?: string;
}
```

### Memory Save Event

```typescript
interface MemorySaveLogEntry extends BaseLogEntry {
  eventType: 'memory_save';
  memoryId: string;
  category: string;
  scope: 'local' | 'global';
  tags?: string[];
}
```

### Memory Search Event

```typescript
interface MemorySearchLogEntry extends BaseLogEntry {
  eventType: 'memory_search';
  query: string;
  resultCount: number;
  searchTimeMs: number;
}
```

### Memory Load Event

```typescript
interface MemoryLoadLogEntry extends BaseLogEntry {
  eventType: 'memory_load';
  memoriesLoaded: number;
  coveragePercent: number;
  tokensUsed?: number;
}
```

### Loading Decision Event

```typescript
interface LoadingDecisionLogEntry extends BaseLogEntry {
  eventType: 'loading_decision';
  source: 'memory' | 'research' | 'hints';
  decision: 'loaded' | 'skipped';
  reason: string;
  tokensUsed?: number;
  coveragePercent?: number;
}
```

### Handoff Event

```typescript
interface HandoffLogEntry extends BaseLogEntry {
  eventType: 'handoff';
  stage: string;
  status: 'healthy' | 'warning' | 'critical';
  tokensUsed: number;
  tokensLimit: number;
  utilization: number;
  reason?: string;
}
```

---

## Component Interfaces

### ContextUsageLogger Methods

```typescript
interface ContextUsageLogger {
  // Existing methods
  logHealthCheck(input: HealthCheckLogInput): Promise<void>;
  logMaskingEvent(input: MaskingEventLogInput): Promise<void>;
  logStageTransition(input: StageTransitionLogInput): Promise<void>;
  logHandoff(
    sessionId,
    stage,
    status,
    tokensUsed,
    tokensLimit,
    utilization,
    reason?
  ): Promise<void>;
  logSessionStart(sessionId: string, stage: string): Promise<void>;
  logSessionEnd(
    sessionId,
    stage,
    status,
    tokensUsed,
    tokensLimit,
    utilization
  ): Promise<void>;

  // New methods (Phase 2)
  logMemorySave(input: MemorySaveLogInput): Promise<void>;
  logMemorySearch(input: MemorySearchLogInput): Promise<void>;
  logMemoryLoad(input: MemoryLoadLogInput): Promise<void>;
  logLoadingDecision(input: LoadingDecisionLogInput): Promise<void>;
}
```

### ContextHealthMonitor State Persistence

```typescript
interface ContextHealthMonitor {
  // New method (Phase 3)
  persistState(status: ContextHealthStatus): Promise<void>;
}
```

### MemoryManager Logger Integration

```typescript
interface MemoryManager {
  // New method (Phase 4)
  setUsageLogger(logger: ContextUsageLogger): void;
}
```

---

## Event Wiring

```
ContextHealthMonitor Events → Extension Handlers → Logger Methods
────────────────────────────────────────────────────────────────

'healthy'     → on('healthy', ...)    → logHealthCheck()
'warning'     → on('warning', ...)    → logHealthCheck()
'critical'    → on('critical', ...)   → logHealthCheck()
'status-change' → on('status-change', ...) → statusBar.updateDisplay()

MemoryManager Operations → Logger Methods
─────────────────────────────────────────

saveMemory()     → logMemorySave()
searchMemories() → logMemorySearch()
loadMemories()   → logMemoryLoad()

ContextBuilder Decisions → Logger Methods
─────────────────────────────────────────

loadFromMemory() → logLoadingDecision({ source: 'memory' })
skipResearch()   → logLoadingDecision({ source: 'research', decision: 'skipped' })
loadResearch()   → logLoadingDecision({ source: 'research', decision: 'loaded' })
```
