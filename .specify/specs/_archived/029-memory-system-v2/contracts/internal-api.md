---
id: 029-memory-system-v2-internal-api
title: Internal TypeScript API Contracts - Memory System v2
status: draft
created: 2026-03-19T22:30:00Z
updated: 2026-03-19T22:30:00Z
author: Claude Sonnet 4.5
---

# Internal API Contracts: Memory System v2

## Overview

This document defines the internal TypeScript API contracts for Memory System
v2. These are NOT REST endpoints but TypeScript interfaces and methods used
within the Gofer extension architecture. All APIs extend existing components
with backward compatibility.

**Coverage**: 15 API methods across 5 interfaces, covering all functional
requirements requiring API surface.

---

## 1. MemoryManager API Extensions

### 1.1 Load Memories by Priority with Layer Selection

**Purpose**: Load prioritized memories with tiered context layers (L0/L1/L2) for
efficient token usage.

**Functional Requirements**: FR-001 (tiered loading), FR-003 (sub-agent
injection), FR-016 (validation context)

**Signature**:

```typescript
interface MemoryLoadOptions {
  limit?: number;               // Max memories to load (default: 10)
  layer?: 'L0' | 'L1' | 'L2';   // Context layer depth (default: 'L0')
  taskContext?: string;         // Task description for relevance scoring
  scope?: 'local' | 'global' | 'all';  // Memory scope (default: 'all')
  category?: MemoryCategory;    // Filter by category
  tags?: string[];              // Filter by tags (e.g., ['#security', '#validation'])
  minPriority?: number;         // Minimum priority score threshold (0-100)
}

interface Memory {
  id: string;
  category: MemoryCategory;
  type: MemoryCognitiveType;
  content: string;              // Full content (L2 layer)
  abstract?: string;            // L0 layer: ~100 tokens, one-sentence summary
  overview?: string;            // L1 layer: ~2k tokens, key points
  tags: string[];
  citations?: Citation[];
  priority: number;             // 0-100 score
  created: number;
  lastUsed?: number;
  usedCount: number;
  relatedMemories?: string[];   // IDs of related memories
}

async loadByPriority(options: MemoryLoadOptions): Promise<Memory[]>
```

**Request Parameters**:

- `limit`: Controls maximum number of memories returned
- `layer`: Specifies which content layer to load:
  - `'L0'`: Load only `abstract` field (~100 tokens per memory)
  - `'L1'`: Load `abstract` + `overview` fields (~2k tokens per memory)
  - `'L2'`: Load full `content` (unlimited tokens)
- `taskContext`: Natural language description used for TF-IDF keyword extraction
  and relevance scoring
- `category`: Filter by memory category (e.g., `'validation_pattern'`,
  `'lesson'`, `'codebase_pattern'`)
- `tags`: Array of tags for filtering (supports multiple, AND logic)

**Response**:

```typescript
// Example: Load 5 validation patterns with L1 layer
const memories = await memoryManager.loadByPriority({
  limit: 5,
  layer: 'L1',
  taskContext: 'Validate security for authentication feature',
  category: 'validation_pattern',
  tags: ['#security'],
});

// Result: Array of Memory objects with abstract + overview populated
// [
//   {
//     id: 'mem-abc123',
//     category: 'validation_pattern',
//     abstract: 'SQL injection via string concatenation in query builder',
//     overview: '**Pattern**: Direct string concatenation...\n**Detection**: Grep for...',
//     content: '', // Not loaded in L1 mode
//     tags: ['#security', '#validation'],
//     priority: 87.3,
//     usageCount: 12,
//   },
//   // ... 4 more memories
// ]
```

**Error Conditions**:

- `InvalidLayerError`: Layer not one of 'L0' | 'L1' | 'L2'
- `MemoryStorageError`: JSONL file corrupted or unreadable (non-fatal - skips
  corrupted lines)

**Token Budget Estimation**:

- L0: ~100 tokens per memory
- L1: ~2k tokens per memory
- L2: Variable (average 3k-5k tokens per memory)

**Observable Logging** (FR-021):

```json
{
  "eventType": "memory_load",
  "options": {
    "limit": 5,
    "layer": "L1",
    "category": "validation_pattern",
    "tags": ["#security"]
  },
  "results": {
    "count": 5,
    "totalTokens": 9874,
    "priorities": [87.3, 82.1, 78.9, 71.2, 68.5]
  },
  "timestamp": "2026-03-19T22:30:00Z"
}
```

---

### 1.2 Save Memory with Automatic Layer Generation

**Purpose**: Save new memory with automatic generation of L0/L1 layers if not
provided.

**Functional Requirements**: FR-006 (validation extraction), FR-007 (engineering
review), FR-008 (codebase patterns)

**Signature**:

```typescript
interface MemorySaveInput {
  category: MemoryCategory;
  type: MemoryCognitiveType;
  content: string;              // Full content (required)
  abstract?: string;            // L0 layer (auto-generated if missing)
  overview?: string;            // L1 layer (auto-generated if missing)
  tags?: string[];
  citations?: Citation[];
  scope?: 'local' | 'global';   // Default: 'local'
  agentId?: string;             // Which agent created this memory
  metadata?: Record<string, unknown>;
}

async save(memory: MemorySaveInput): Promise<Memory>  // Returns saved Memory object
```

**Auto-Generation Logic**:

If `abstract` or `overview` is missing:

1. Call LLM (Claude Haiku) with prompt:
   ```
   Summarize this memory in one sentence (~100 tokens):
   {content}
   ```
2. For overview: Extract key points, citations, and navigation info (~2k tokens)
3. Store all three layers in JSONL

**Request Example**:

```typescript
// Save validation finding with only content (layers auto-generated)
const memoryId = await memoryManager.save({
  category: 'validation_pattern',
  type: 'procedural',
  content: `**Pattern**: Missing null check before array access

**Detection**:
- Search for array access without prior null/undefined check
- Common in: map/filter/reduce chains, optional chaining abuse

**Example**:
\`\`\`typescript
function processUsers(users?: User[]) {
  return users.map(u => u.name);  // RED: No null check on users
}
\`\`\`

**Fix**: Add null guard or use optional chaining with default`,
  tags: ['#correctness', '#validation'],
  citations: [{ file: 'extension/src/api/handlers.ts', line: 145 }],
  agentId: 'validation-correctness',
});

// Returns: 'mem-def456'
```

**Response**:

- Memory ID (string): Hash-based ID generated from content
- Side effect: Memory appended to `.specify/memory/memories.jsonl`
- Side effect: If content >500 chars, detail saved to
  `.specify/memory/memory-notes/{id}.md`
- Side effect: In-memory index updated

**Error Conditions**:

- `ValidationError`: Missing required fields (category, content)
- `StorageError`: Disk quota exceeded (graceful degradation - logs warning,
  skips save, continues execution)

**Observable Logging** (FR-020):

```json
{
  "eventType": "memory_save",
  "memoryId": "mem-def456",
  "category": "validation_pattern",
  "layers": {
    "abstract": "generated",
    "overview": "generated",
    "content": "provided"
  },
  "tokens": { "L0": 98, "L1": 1847, "L2": 4521 },
  "agentId": "validation-correctness",
  "timestamp": "2026-03-19T22:30:00Z"
}
```

---

### 1.3 Save Immediate (Foreground Write)

**Purpose**: Save memory immediately during long-running tasks (not deferred to
consolidation).

**Functional Requirements**: FR-009 (real-time pattern discoveries)

**Signature**:

```typescript
async saveImmediate(memory: MemorySaveInput): Promise<Memory>
```

**Behavior**:

- Same as `save()` but bypasses consolidation queue
- Non-blocking async write
- Tagged with `#real-time` automatically
- Use case: Discovered utilities, error patterns fixed, performance
  optimizations

**Request Example**:

```typescript
// During implementation - discover reusable utility
await memoryManager.saveImmediate({
  category: 'implementation_pattern',
  type: 'procedural',
  content: 'Created `retryWithBackoff()` utility for resilient API calls...',
  tags: ['#implement', '#utility'],
});
```

**Difference from `save()`**:

- `save()`: Queued for next consolidation cycle (30-min intervals)
- `saveImmediate()`: Written to JSONL immediately (non-blocking)

---

### 1.4 Update Importance Scores

**Purpose**: Recalculate priority scores based on usage patterns (background
consolidation task).

**Functional Requirements**: FR-014 (importance scoring)

**Signature**:

```typescript
interface ImportanceScoreResult {
  memoryId: string;
  oldPriority: number;
  newPriority: number;
  factors: {
    usageScore: number;      // 0-100
    recencyScore: number;    // 0-100
    ageBonus: number;        // 0-100
  };
}

async updateImportanceScores(): Promise<ImportanceScoreResult[]>
```

**Algorithm** (existing pattern from research.md:171-186):

```typescript
Priority = usageScore * 0.4 + recencyScore * 0.35 + ageBonus * 0.25;

Where: usageScore = min(100, log10(usedCount + 1) * 50);
recencyScore = max(0, 100 - (daysSinceLastUsed / 30) * 100);
ageBonus = min(100, (daysOld / 90) * 100 * min(1, usedCount / 5));
```

**Response Example**:

```typescript
[
  {
    memoryId: 'mem-abc123',
    oldPriority: 65.2,
    newPriority: 87.3,
    factors: {
      usageScore: 75.0, // log10(12 + 1) * 50 = 75.0
      recencyScore: 95.0, // Last used 1.5 days ago
      ageBonus: 85.0, // Created 60 days ago, used 12 times
    },
  },
  // ... more memories
];
```

**Trigger**: Called by consolidation timer (30-minute intervals)

---

### 1.5 Set/Get Transient Memory

**Purpose**: Store ephemeral state (loop variables, intermediate results)
separate from durable JSONL-backed memories.

**Functional Requirements**: FR-010 (transient vs. durable separation)

**Signature**:

```typescript
// In-memory only, cleared at session end
setTransient(key: string, value: unknown): void
getTransient<T = unknown>(key: string): T | undefined
clearTransient(): void
```

**Usage Example**:

```typescript
class ValidationAgent {
  async validate(files: string[]) {
    for (const file of files) {
      // Transient: loop iteration state
      memoryManager.setTransient('currentFile', file);
      memoryManager.setTransient('checkpointIndex', files.indexOf(file));

      // ... validation logic ...

      // Durable: discovered pattern (persisted to JSONL)
      if (patternFound) {
        await memoryManager.save({
          category: 'validation_pattern',
          content: pattern,
        });
      }
    }

    // Clear transient state after loop
    memoryManager.clearTransient();
  }
}
```

**Storage**: In-memory `Map<string, unknown>`, not logged to JSONL

**Lifecycle**: Cleared when:

- Agent calls `clearTransient()`
- Session ends (extension deactivates)
- Explicit call to `reinitializeExtension()`

---

## 2. GoferURI API (New Component)

### 2.1 Resolve URI to Memory or File Content

**Purpose**: Resolve `gofer://` URIs to absolute file paths or memory objects.

**Functional Requirements**: FR-002 (URI resolution), FR-004 (gofer://
abstraction)

**Signature**:

```typescript
interface GoferURI {
  scheme: 'gofer';
  scope: 'specs' | 'memory' | 'agent' | 'session' | 'user';
  path: string;
}

class GoferURIResolver {
  /**
   * Resolve URI to memory object (if scope=memory) or file content (if scope=specs/agent/session/user)
   */
  async resolve(uri: string): Promise<Memory | string>;

  /**
   * Parse URI string into structured GoferURI object
   */
  parse(uri: string): GoferURI;

  /**
   * Format GoferURI object into URI string
   */
  format(uri: GoferURI): string;
}
```

**Scope Mapping** (FR-002):

| Scope     | Filesystem Path                      | Purpose                     |
| --------- | ------------------------------------ | --------------------------- |
| `specs`   | `.specify/specs/{feature}/`          | Feature specifications      |
| `memory`  | `.specify/memory/`                   | Project-wide memories       |
| `agent`   | `.specify/memory/agent/`             | Learned agent patterns      |
| `session` | `.specify/specs/{feature}/session-*` | Active session state        |
| `user`    | `~/.claude/projects/.../memory/`     | Cross-workspace preferences |

**Request Examples**:

```typescript
// Example 1: Resolve memory URI to Memory object
const resolver = new GoferURIResolver(memoryManager);

const memory = await resolver.resolve('gofer://memory/core/task-context.md');
// Returns: Memory object with L0/L1/L2 layers

// Example 2: Resolve spec URI to file content
const specContent = await resolver.resolve(
  'gofer://specs/029-memory-system-v2/research.md'
);
// Returns: String (file contents)

// Example 3: Glob pattern support
const patterns = await resolver.resolve(
  'gofer://agent/patterns/validation-*.md'
);
// Returns: Array of Memory objects matching pattern
```

**Parsing Example**:

```typescript
const uri = resolver.parse('gofer://memory/core/task-context.md');
// Returns: { scheme: 'gofer', scope: 'memory', path: 'core/task-context.md' }

const uriString = resolver.format(uri);
// Returns: 'gofer://memory/core/task-context.md'
```

**Error Conditions**:

- `URIParseError`: Invalid URI format (e.g., `http://invalid`, missing scope)
- `URIResolutionError`: URI cannot be resolved (scope exists but path not found)
  - Error message includes suggestions: fuzzy matched URIs, list of available
    scopes
- `ScopeNotFoundError`: Unknown scope (not one of
  specs/memory/agent/session/user)

**Error Response Example**:

```json
{
  "error": "URIResolutionError",
  "uri": "gofer://memory/cor/task-context.md",
  "message": "Path not found in scope 'memory'",
  "suggestions": [
    "gofer://memory/core/task-context.md",
    "gofer://memory/core/task-tracking.md"
  ],
  "availableScopes": ["specs", "memory", "agent", "session", "user"]
}
```

**Non-Blocking**: Resolution failures do not crash agent - agent continues
without that memory (FR-004 edge case)

---

## 3. SubAgentContextFactory API (New Component)

### 3.1 Build Validation Context

**Purpose**: Generate targeted context sections for validation sub-agents
filtered by category.

**Functional Requirements**: FR-016 (validation context), FR-018 (memory
metadata), FR-019 (markdown formatting)

**Signature**:

```typescript
type ValidationType =
  | 'correctness'
  | 'security'
  | 'performance'
  | 'integration'
  | 'test-quality'
  | 'standards';

interface ValidationContext {
  specAbstract: string; // L1 layer of spec.md (~2k tokens)
  memories: Memory[]; // 5-10 prioritized memories for this category
  patterns: Memory[]; // Past validation patterns for this category
  totalTokens: number; // Estimated token count
  metadata: {
    category: ValidationType;
    featureId: string;
    agentId: string;
    timestamp: string;
  };
}

class SubAgentContextFactory {
  async buildValidationContext(
    category: ValidationType,
    featureDir: string
  ): Promise<ValidationContext>;
}
```

**Request Example**:

```typescript
const factory = new SubAgentContextFactory(contextBuilder, memoryManager);

const context = await factory.buildValidationContext(
  'security',
  '/Users/douglaswross/Code/eai-gofer/.specify/specs/029-memory-system-v2'
);
```

**Response Example**:

```typescript
{
  specAbstract: `# Feature: Memory System v2

## Overview (L1)
Design and implement comprehensive memory system...
[~2k tokens of key points]`,

  memories: [
    {
      id: 'mem-sec001',
      category: 'validation_pattern',
      abstract: 'SQL injection via string concatenation',
      overview: '**Pattern**: Direct string concatenation in queries...',
      tags: ['#security', '#validation'],
      priority: 87.3,
      usageCount: 12,
      citations: [{ file: 'extension/src/db/queries.ts', line: 45 }],
    },
    // ... 4-9 more memories
  ],

  patterns: [
    {
      id: 'mem-sec002',
      category: 'validation_pattern',
      abstract: 'Missing input sanitization before sensitive operations',
      // ...
    },
    // ... 2-4 patterns
  ],

  totalTokens: 9847,

  metadata: {
    category: 'security',
    featureId: '029-memory-system-v2',
    agentId: 'validation-security',
    timestamp: '2026-03-19T22:30:00Z',
  }
}
```

**Markdown Formatting** (FR-019):

The context factory also provides a `formatAsMarkdown()` method:

```typescript
formatAsMarkdown(context: ValidationContext): string
```

**Formatted Output**:

```markdown
# Validation Context: Security

## Spec Overview

[spec abstract L1 layer]

## Relevant Memories

### Memory: SQL injection via string concatenation

**Category**: validation_pattern **Priority**: 87.3 **Used**: 12 times **Last
used**: 2 days ago **Citations**: extension/src/db/queries.ts:45

**Pattern**: Direct string concatenation in SQL queries enables SQL injection
attacks...

---

### Memory: Missing input sanitization

[... similar format ...]

## Past Validation Patterns

[3-5 patterns specific to security category]

## Your Task

Evaluate the implementation in `/Users/.../029-memory-system-v2/` for
**security** concerns. Reference the patterns above when detecting issues.
```

**Token Budget**: 5k-10k tokens per agent (FR-003)

**Observable Logging** (FR-020):

```json
{
  "eventType": "subagent_context_build",
  "agentType": "validation",
  "category": "security",
  "memoriesInjected": 8,
  "patternsInjected": 3,
  "totalTokens": 9847,
  "timestamp": "2026-03-19T22:30:00Z"
}
```

---

### 3.2 Build Research Context

**Purpose**: Generate targeted context sections for research sub-agents filtered
by research domain.

**Functional Requirements**: FR-017 (research context), FR-018 (memory
metadata), FR-019 (markdown formatting)

**Signature**:

```typescript
type ResearchDomain =
  | 'codebase-location'    // Finding files/modules
  | 'codebase-analysis'    // Understanding architecture
  | 'codebase-patterns'    // Identifying patterns
  | 'integration-points'   // Cross-module dependencies
  | 'technical-debt';      // Known issues/limitations

interface ResearchContext {
  featureDescription: string;     // Business scenario
  codebasePatterns: Memory[];     // Past patterns found in codebase
  integrationPoints: Memory[];    // Known integration points
  technicalDebt: Memory[];        // Known issues to be aware of
  totalTokens: number;
  metadata: {
    domain: ResearchDomain;
    featureId: string;
    agentId: string;
    timestamp: string;
  };
}

async buildResearchContext(
  domain: ResearchDomain,
  featureDir: string
): Promise<ResearchContext>;
```

**Request Example**:

```typescript
const context = await factory.buildResearchContext(
  'codebase-patterns',
  '/Users/douglaswross/Code/eai-gofer/.specify/specs/029-memory-system-v2'
);
```

**Response Example**:

```typescript
{
  featureDescription: `Design memory system serving all Gofer agents...`,

  codebasePatterns: [
    {
      id: 'mem-pat001',
      category: 'codebase_pattern',
      abstract: 'MemoryManager uses JSONL append-only storage with in-memory index',
      overview: '**Pattern**: JSONL append-only for concurrency...',
      tags: ['#architecture', '#memory'],
      citations: [{ file: 'extension/src/autonomous/MemoryManager.ts', line: 223 }],
    },
    // ... 4-9 more patterns
  ],

  integrationPoints: [
    {
      id: 'mem-int001',
      category: 'integration_point',
      abstract: 'ContextBuilder loads memories via MemoryLayerManager',
      citations: [
        { file: 'extension/src/autonomous/ContextBuilder.ts', line: 889 }
      ],
    },
    // ... more integration points
  ],

  technicalDebt: [
    {
      id: 'mem-debt001',
      abstract: 'Context bridge has 60-second staleness window',
      // ...
    },
  ],

  totalTokens: 8234,

  metadata: {
    domain: 'codebase-patterns',
    featureId: '029-memory-system-v2',
    agentId: 'codebase-pattern-finder',
    timestamp: '2026-03-19T22:30:00Z',
  }
}
```

**Token Budget**: 5k-10k tokens per agent

---

## 4. ContextBuilder API Extensions

### 4.1 Load Specific Layer of Artifact

**Purpose**: Load spec/research artifacts with tiered layers (not just
memories).

**Functional Requirements**: FR-001 (tiered loading for spec artifacts)

**Signature**:

```typescript
type ContextLayer = 'L0' | 'L1' | 'L2';

interface LayeredContent {
  abstract: string;      // L0: One-sentence summary (~100 tokens)
  overview: string;      // L1: Key points, navigation (~2k tokens)
  detail: () => string;  // L2: Lazy-loaded full content
}

async loadLayer(
  path: string,           // Absolute file path or gofer:// URI
  layer: ContextLayer
): Promise<string>;
```

**Request Examples**:

```typescript
// Load research.md with L1 layer only
const overview = await contextBuilder.loadLayer(
  'gofer://specs/029-memory-system-v2/research.md',
  'L1'
);
// Returns: ~2k tokens of key research findings

// Load spec.md with L0 layer (abstract only)
const abstract = await contextBuilder.loadLayer(
  '/Users/douglaswross/Code/eai-gofer/.specify/specs/029-memory-system-v2/spec.md',
  'L0'
);
// Returns: ~100 tokens of one-sentence summary
```

**Layer Generation**:

If file doesn't have layers in frontmatter:

1. Read full file content
2. Generate layers via LLM (Claude Haiku):
   - L0: "Summarize in one sentence"
   - L1: "Extract key points and structure"
3. Cache layers in `.specify/memory/artifact-cache/{hash}.json`
4. Return requested layer

**Caching**:

```json
{
  "sourceFile": ".specify/specs/029-memory-system-v2/research.md",
  "hash": "sha256-abc123...",
  "layers": {
    "L0": "Memory System v2 research on OpenViking, MemGPT, and tiered loading patterns",
    "L1": "## Executive Summary\nGofer already implements sophisticated memory...",
    "L2": "[full file content]"
  },
  "generatedAt": "2026-03-19T22:30:00Z"
}
```

**Token Savings**:

- Research.md: 20k-40k tokens → 2k tokens (L1) = 90% reduction
- Spec.md: 10k-25k tokens → 2k tokens (L1) = 88% reduction

---

### 4.2 Build Context with Enhanced Loading Decisions

**Purpose**: Assemble full context with observable loading decisions for each
memory/artifact.

**Functional Requirements**: FR-021 (loading decision events), FR-004 (coverage
calculation)

**Signature**:

```typescript
interface TaskContext {
  description: string;        // Task description for keyword extraction
  stage: string;              // Pipeline stage (research, implement, validate, etc.)
  tokenBudget?: number;       // Max context tokens (default: 50000)
  forceLoad?: string[];       // URIs to force load regardless of coverage
}

interface LoadingDecision {
  source: string;             // Memory ID or file path
  sourceType: 'memory' | 'research' | 'spec' | 'hints' | 'constitution';
  decision: 'loaded' | 'skipped' | 'blocked';
  reason: string;             // Human-readable explanation
  tokens: number;             // Estimated token count
  priority?: number;          // Priority score (if memory)
  coverage?: number;          // Coverage percentage (if skipped due to coverage)
  layer?: ContextLayer;       // Which layer was loaded
}

interface ContextBuildResult {
  fullContext: string;        // Assembled markdown context
  loadingDecisions: LoadingDecision[];
  totalTokens: number;
  budgetRemaining: number;
}

async buildContext(task: TaskContext): Promise<ContextBuildResult>;
```

**Request Example**:

```typescript
const result = await contextBuilder.buildContext({
  description: 'Implement tiered memory loading for L0/L1/L2 layers',
  stage: 'implement',
  tokenBudget: 50000,
  forceLoad: ['gofer://memory/core/task-context.md'],
});
```

**Response Example**:

```typescript
{
  fullContext: `# Context for Implementation

## Constitution
[constitution.md content]

## Memories
[prioritized memories formatted]

## Spec Overview
[spec.md L1 layer]

[... other sections ...]`,

  loadingDecisions: [
    {
      source: 'mem-abc123',
      sourceType: 'memory',
      decision: 'loaded',
      reason: 'Priority score 87.3 exceeds threshold',
      tokens: 1847,
      priority: 87.3,
      layer: 'L1',
    },
    {
      source: '.specify/specs/029-memory-system-v2/research.md',
      sourceType: 'research',
      decision: 'skipped',
      reason: 'Coverage 85.3% meets threshold 30%',
      tokens: 0,
      coverage: 85.3,
    },
    {
      source: 'mem-def456',
      sourceType: 'memory',
      decision: 'blocked',
      reason: 'Token budget exhausted',
      tokens: 0,
      priority: 68.5,
    },
    // ... more decisions
  ],

  totalTokens: 43812,
  budgetRemaining: 6188,
}
```

**Coverage Calculation** (FR-004):

```typescript
// Extract task keywords via TF-IDF
const keywords = extractKeywords(task.description);

// Calculate coverage: (matched keywords / total keywords) * 100
const coverage = calculateCoverage(keywords, loadedMemories);

// Decision logic
if (coverage >= 30) {
  decision = 'skipped';
  reason = `Coverage ${coverage}% meets threshold 30%`;
}
```

**Observable Logging** (FR-021):

Each loading decision emitted as event to `context-usage.jsonl`:

```json
{
  "eventType": "loading_decision",
  "source": "mem-abc123",
  "sourceType": "memory",
  "decision": "loaded",
  "reason": "Priority score 87.3 exceeds threshold",
  "tokens": 1847,
  "priority": 87.3,
  "layer": "L1",
  "timestamp": "2026-03-19T22:30:00Z"
}
```

---

## 5. MemoryConsolidator API Extensions

### 5.1 Extract Memories from Pipeline Runs

**Purpose**: Automatically extract patterns, lessons, and decisions from
completed pipeline stages.

**Functional Requirements**: FR-006 (validation extraction), FR-007 (engineering
review), FR-011 (consolidation extraction)

**Signature**:

```typescript
interface ExtractionSource {
  pipelineLog: string;           // Path to .specify/logs/pipeline.jsonl
  validationReports: string[];   // Paths to validation-report.md files
  engineeringReviews: string[];  // Paths to engineering-review-report.md files
  contextUsageLog: string;       // Path to .specify/logs/context-usage.jsonl
}

interface ExtractionResult {
  memoriesExtracted: number;
  patterns: Memory[];            // validation_pattern memories
  lessons: Memory[];             // lesson memories
  decisions: Memory[];           // decision memories
  errors?: string[];             // Non-fatal extraction errors
}

async extractFromPipelineRuns(
  sources?: ExtractionSource  // Optional, uses defaults if not provided
): Promise<ExtractionResult>;
```

**Default Sources**:

```typescript
{
  pipelineLog: '.specify/logs/pipeline.jsonl',
  validationReports: glob('.specify/specs/*/validation-report.md'),
  engineeringReviews: glob('.specify/specs/*/engineering-review-report.md'),
  contextUsageLog: '.specify/logs/context-usage.jsonl',
}
```

**Request Example**:

```typescript
const consolidator = new MemoryConsolidator(memoryManager);

const result = await consolidator.extractFromPipelineRuns();
```

**Response Example**:

```typescript
{
  memoriesExtracted: 12,

  patterns: [
    {
      id: 'mem-ext001',
      category: 'validation_pattern',
      type: 'procedural',
      content: 'Missing null check before array access in validation-correctness agent',
      abstract: 'Null check missing before array operations',
      tags: ['#correctness', '#validation', '#red'],
      citations: [
        { file: 'extension/src/api/handlers.ts', line: 145, severity: 'red' }
      ],
      agentId: 'validation-correctness',
      created: new Date('2026-03-19T22:30:00Z'),
    },
    // ... 4 more patterns from validation reports
  ],

  lessons: [
    {
      id: 'mem-ext002',
      category: 'lesson',
      type: 'episodic',
      content: 'Engineering review flagged inconsistent error handling in async functions',
      abstract: 'Inconsistent async error handling across modules',
      tags: ['#lesson', '#stage-validate', '#yellow'],
      citations: [
        { file: 'extension/src/autonomous/MemoryManager.ts', line: 274 }
      ],
      agentId: 'engineering-review',
      created: new Date('2026-03-19T22:30:00Z'),
    },
    // ... 3 more lessons
  ],

  decisions: [
    {
      id: 'mem-ext003',
      category: 'decision',
      type: 'semantic',
      content: 'Adopted L0/L1/L2 tiered loading from OpenViking pattern',
      abstract: 'Use OpenViking tiered loading pattern',
      tags: ['#decision', '#architecture'],
      created: new Date('2026-03-19T22:30:00Z'),
    },
    // ... 3 more decisions
  ],

  errors: [
    'Failed to parse validation-report.md for feature 027 (malformed YAML frontmatter)'
  ]
}
```

**Extraction Logic** (FR-006, FR-007):

1. **Validation Reports**:
   - Red findings → `validation_pattern` memories with category tag
   - Yellow findings → `lesson` memories with stage context
   - Extract: pattern description, affected files, line numbers, severity

2. **Engineering Reviews**:
   - All findings → `lesson` memories
   - Extract: issue description, fix recommendation, file citations

3. **Pipeline Log**:
   - Stage completion events → `decision` memories
   - Extract: key decisions, architectural choices, trade-offs

4. **Context Usage Log**:
   - Memory access patterns → update importance scores
   - Frequently accessed memories get priority boost

**LLM Provider** (FR-011): Claude Haiku for cost-effectiveness (~$0.001 per
extraction run)

**Non-Blocking** (FR-011): Extraction failures logged but do not crash
extension. Consolidation continues with dedup/archival even if extraction fails.

**Observable Logging**:

```json
{
  "eventType": "extraction_complete",
  "memoriesExtracted": 12,
  "patterns": 5,
  "lessons": 4,
  "decisions": 3,
  "errors": 1,
  "llmCalls": 3,
  "timestamp": "2026-03-19T22:30:00Z"
}
```

---

## 6. Supporting Type Definitions

### 6.1 Memory Category Enum

```typescript
type MemoryCategory =
  | 'validation_pattern' // Patterns found in validation
  | 'lesson' // Lessons from engineering review or corrections
  | 'codebase_pattern' // Code patterns discovered during research
  | 'decision' // Architectural decisions
  | 'user_preference' // User preferences/corrections
  | 'task_context' // Task execution context
  | 'observation'; // Observations from execution
```

### 6.2 Memory Cognitive Type Enum

```typescript
type MemoryCognitiveType =
  | 'procedural' // How-to knowledge (patterns, procedures)
  | 'episodic' // Past events (validation runs, corrections)
  | 'semantic' // Facts and concepts (decisions, architecture)
  | 'prospective'; // Future intentions (planned improvements)
```

### 6.3 Citation Interface

```typescript
interface Citation {
  file: string; // Absolute file path or relative to workspace root
  line?: number; // Line number (optional)
  column?: number; // Column number (optional)
  severity?: 'red' | 'yellow'; // Finding severity (optional)
  context?: string; // Surrounding code snippet (optional)
}
```

---

## 7. API Coverage Matrix

### Functional Requirements Coverage

| FR     | Requirement                             | API Method(s)                                                          |
| ------ | --------------------------------------- | ---------------------------------------------------------------------- |
| FR-001 | Tiered memory loading (L0/L1/L2)        | `MemoryManager.loadByPriority()`, `ContextBuilder.loadLayer()`         |
| FR-002 | gofer:// URI resolution                 | `GoferURIResolver.resolve()`, `.parse()`, `.format()`                  |
| FR-003 | Sub-agent memory injection (5-10 mems)  | `SubAgentContextFactory.buildValidationContext()`                      |
| FR-004 | Memory coverage calculation (TF-IDF)    | `ContextBuilder.buildContext()` (coverage in LoadingDecision)          |
| FR-006 | Auto-extract validation patterns        | `MemoryConsolidator.extractFromPipelineRuns()`                         |
| FR-007 | Auto-extract engineering review lessons | `MemoryConsolidator.extractFromPipelineRuns()`                         |
| FR-008 | Auto-extract codebase patterns          | `MemoryConsolidator.extractFromPipelineRuns()`                         |
| FR-009 | Immediate write API for real-time saves | `MemoryManager.saveImmediate()`                                        |
| FR-010 | Transient vs. durable memory separation | `MemoryManager.setTransient()`, `.getTransient()`, `.clearTransient()` |
| FR-011 | Consolidation with extraction           | `MemoryConsolidator.extractFromPipelineRuns()`                         |
| FR-014 | Importance score updates                | `MemoryManager.updateImportanceScores()`                               |
| FR-016 | Validation agent context                | `SubAgentContextFactory.buildValidationContext()`                      |
| FR-017 | Research agent context                  | `SubAgentContextFactory.buildResearchContext()`                        |
| FR-018 | Memory metadata in injected context     | All `buildContext()` methods include metadata                          |
| FR-019 | Markdown formatting for context         | `SubAgentContextFactory.formatAsMarkdown()`                            |
| FR-020 | Log memory injection events             | Observable logging in all methods                                      |
| FR-021 | Loading decision events                 | `ContextBuilder.buildContext()` returns `LoadingDecision[]`            |

**Total Coverage**: 17 FRs requiring APIs → 17 FRs covered (100%)

---

## 8. User Story Mapping

### Priority 1 (Critical)

| User Story | API Support                                                                            |
| ---------- | -------------------------------------------------------------------------------------- |
| US-P1-01   | Sub-agent memory injection: `SubAgentContextFactory.buildValidationContext()`          |
| US-P1-02   | Auto-extract validation patterns: `MemoryConsolidator.extractFromPipelineRuns()`       |
| US-P1-03   | Tiered context loading: `MemoryManager.loadByPriority()`, `ContextBuilder.loadLayer()` |
| US-P1-04   | gofer:// URI abstraction: `GoferURIResolver.*` methods                                 |

### Priority 2 (Important)

| User Story | API Support                                                                            |
| ---------- | -------------------------------------------------------------------------------------- |
| US-P2-01   | Research agent memory access: `SubAgentContextFactory.buildResearchContext()`          |
| US-P2-02   | Memory coverage calculation: `ContextBuilder.buildContext()` coverage logic            |
| US-P2-03   | Memory consolidation with extraction: `MemoryConsolidator.extractFromPipelineRuns()`   |
| US-P2-04   | Observable memory loading: `ContextBuilder.buildContext()` returns `LoadingDecision[]` |

### Priority 3 (Nice-to-Have)

| User Story | API Support                                                                              |
| ---------- | ---------------------------------------------------------------------------------------- |
| US-P3-02   | Real-time memory updates: `MemoryManager.saveImmediate()`                                |
| US-P3-03   | Transient vs. durable separation: `setTransient()`, `getTransient()`, `clearTransient()` |

**Total User Stories**: 10 → 10 APIs mapped (100%)

---

## 9. Error Handling Patterns

All APIs follow these error handling conventions:

### Non-Fatal Errors (Warnings Only)

Per CheckpointValidator pattern (research.md:426-456), these errors log warnings
but never block execution:

- **Memory validation failures**: Malformed JSONL lines skipped, valid lines
  processed
- **LLM extraction failures**: Logged, retried on next consolidation cycle
- **URI resolution failures**: Return error with suggestions, agent continues
  without that memory
- **Disk quota exceeded**: Log warning, skip save, continue execution

### Fatal Errors (Throw Exception)

Only throw for developer errors (contract violations):

- **InvalidLayerError**: Layer parameter not one of 'L0' | 'L1' | 'L2'
- **ValidationError**: Missing required fields (category, content)
- **URIParseError**: Malformed URI format

### Error Logging

All errors logged to:

- VSCode Output Channel (user-visible)
- `.specify/logs/context-usage.jsonl` (structured events)
- Extension console (developer debugging)

---

## 10. Performance Characteristics

### Method Performance Targets (NFR-002, NFR-003, NFR-004, NFR-005)

| API Method                           | Target Latency | Token Budget   | Notes                          |
| ------------------------------------ | -------------- | -------------- | ------------------------------ |
| `loadByPriority()` (L1, 10 memories) | <500ms         | ~20k tokens    | NFR-002: sub-500ms for 10 mems |
| `buildValidationContext()`           | <1s            | 5k-10k tokens  | NFR-005: 1s per agent          |
| `buildResearchContext()`             | <1s            | 5k-10k tokens  | NFR-005: 1s per agent          |
| `extractFromPipelineRuns()`          | <5s            | N/A            | NFR-004: 5s for 1000 memories  |
| `updateImportanceScores()`           | <5s            | N/A            | NFR-004: 5s for 1000 memories  |
| `resolve()` (memory URI)             | <100ms         | Variable       | In-memory index lookup         |
| `resolve()` (file URI)               | <200ms         | Variable       | Filesystem read                |
| `buildContext()`                     | <2s            | 30k-50k tokens | NFR-001: <50k by stage 5       |

### Caching Strategy

- **In-memory index**: Sub-100ms search/filter for up to 1000 memories (NFR-003)
- **Artifact layer cache**: Generated L0/L1 layers cached in
  `.specify/memory/artifact-cache/`
- **URI resolution cache**: Resolved paths cached for 60 seconds (context bridge
  pattern)

---

## 11. Backward Compatibility

### API Compatibility

All new APIs are **additive only** (FR-030):

- Existing `MemoryManager.load()` → Still works, defaults to L2 (full content)
- Existing `MemoryManager.save()` → Auto-generates L0/L1 if missing (FR-026)
- Existing `ContextBuilder.buildContext()` → Extended with `LoadingDecision[]`
  return, old return type still works

### Migration Support

For memories without L0/L1/L2 layers (FR-026):

```typescript
// Old memory format (pre-v2)
{
  id: 'mem-old001',
  content: 'Full content here...',
  // No abstract or overview fields
}

// Loading behavior
const memory = await memoryManager.loadByPriority({ layer: 'L1' });
// Returns: Loads via detail tier (full content) as fallback
// Warning logged: "Memory mem-old001 missing L1 layer, loaded L2 instead"
```

**Migration Command**: `gofer.migrateMemoriesToLayered` (FR-028)

- Processes all memories in `.specify/memory/memories.jsonl`
- Generates L0/L1 layers via LLM (Claude Haiku)
- Preserves original memories as backup

---

## 12. Example Usage Flows

### Flow 1: Validation Agent Receives Memory Context

```typescript
// 1. Command: /6_gofer_validate invoked
const orchestrator = new ValidationOrchestrator();

// 2. Build context for each validation category
const factory = new SubAgentContextFactory(contextBuilder, memoryManager);
const securityContext = await factory.buildValidationContext(
  'security',
  '/Users/.../specs/029-memory-system-v2'
);

// 3. Format as markdown for sub-agent prompt
const contextMarkdown = factory.formatAsMarkdown(securityContext);

// 4. Dispatch validation agent with injected context
await taskDispatcher.dispatch({
  agent: 'validation-security',
  prompt: `${contextMarkdown}\n\n## Your Task\nValidate security...`,
});

// 5. Observable logging
// → context-usage.jsonl: memory_load events (8 memories, 9847 tokens)
// → context-usage.jsonl: subagent_context_build event
```

**Result**: Security validation agent starts with 8 relevant memories (9.8k
tokens) instead of zero context.

---

### Flow 2: Automatic Pattern Extraction After Validation

```typescript
// 1. Validation completes, produces validation-report.md with 3 Red findings
const report = parseValidationReport(
  '.specify/specs/029-*/validation-report.md'
);

// 2. Consolidation timer triggers (30-min interval)
const consolidator = new MemoryConsolidator(memoryManager);
const result = await consolidator.extractFromPipelineRuns();

// 3. Extract patterns from Red findings
// Input: "**Finding**: Missing null check before array access"
// Output: validation_pattern memory with L0/L1/L2 layers

// 4. Save extracted memories
// → 3 new memories in memories.jsonl
// → context-usage.jsonl: extraction_complete event

console.log(`Extracted ${result.memoriesExtracted} memories`);
// Output: "Extracted 12 memories" (3 patterns + 4 lessons + 3 decisions + 2 observations)
```

**Result**: Future validation agents automatically receive these 3 patterns in
their context.

---

### Flow 3: Tiered Loading for Context Budget Control

```typescript
// 1. Build context for implement stage with 50k token budget
const result = await contextBuilder.buildContext({
  description: 'Implement tiered memory loading',
  stage: 'implement',
  tokenBudget: 50000,
});

// 2. Context builder loads:
// - Constitution: 3k tokens (always)
// - Memories (L1): 10 × 2k = 20k tokens
// - Spec.md (L1): 2k tokens
// - Research.md: SKIPPED (coverage 85% > 30% threshold)
// - Total: 25k tokens

// 3. Observe loading decisions
result.loadingDecisions.forEach((d) => {
  console.log(`${d.source}: ${d.decision} (${d.reason})`);
});

// Output:
// "mem-abc123: loaded (Priority score 87.3 exceeds threshold)"
// "research.md: skipped (Coverage 85.3% meets threshold 30%)"
// "mem-def456: blocked (Token budget exhausted)"

// 4. Token savings
const savings = ((20000 - result.totalTokens) / 20000) * 100;
console.log(`Token savings: ${savings}%`);
// Output: "Token savings: 60%" (research.md skipped due to coverage)
```

**Result**: 60% context reduction while preserving necessary information.

---

## 13. Testing Strategy

### Unit Tests (Per API Method)

```typescript
describe('MemoryManager.loadByPriority', () => {
  it('loads L0 layer only when layer=L0', async () => {
    const memories = await memoryManager.loadByPriority({
      layer: 'L0',
      limit: 5,
    });
    expect(memories).toHaveLength(5);
    expect(memories[0].abstract).toBeDefined();
    expect(memories[0].overview).toBeUndefined();
    expect(memories[0].content).toBe('');
  });

  it('falls back to L2 for memories without layers', async () => {
    // Create old-format memory without layers
    await memoryManager.save({ content: 'Old memory', category: 'lesson' });

    const memories = await memoryManager.loadByPriority({
      layer: 'L1',
      limit: 1,
    });
    expect(memories[0].content).toBe('Old memory'); // Full content loaded as fallback
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('missing L1 layer, loaded L2 instead')
    );
  });

  it('filters by category and tags', async () => {
    const memories = await memoryManager.loadByPriority({
      category: 'validation_pattern',
      tags: ['#security'],
      limit: 10,
    });

    expect(memories.every((m) => m.category === 'validation_pattern')).toBe(
      true
    );
    expect(memories.every((m) => m.tags.includes('#security'))).toBe(true);
  });
});
```

### Integration Tests (Cross-Component)

```typescript
describe('Sub-Agent Context Injection', () => {
  it('builds validation context with prioritized memories', async () => {
    // Setup: Create 10 validation patterns with varying priorities
    await seedValidationPatterns(10);

    // Execute
    const context = await factory.buildValidationContext(
      'security',
      featureDir
    );

    // Assert
    expect(context.memories).toHaveLength(5); // Top 5 by priority
    expect(context.totalTokens).toBeLessThan(10000); // Within budget
    expect(context.metadata.category).toBe('security');

    // Verify observable logging
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'subagent_context_build',
        memoriesInjected: 5,
      })
    );
  });
});
```

### Performance Tests (NFR Validation)

```typescript
describe('Performance Requirements', () => {
  it('loads 10 memories (L1) in <500ms', async () => {
    const start = performance.now();
    await memoryManager.loadByPriority({ layer: 'L1', limit: 10 });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500); // NFR-002
  });

  it('consolidation completes in <5s for 1000 memories', async () => {
    await seed1000Memories();

    const start = performance.now();
    await consolidator.extractFromPipelineRuns();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000); // NFR-004
  });
});
```

---

## 14. API Summary

### Total API Surface

**5 Interfaces**:

1. MemoryManager (extended)
2. GoferURIResolver (new)
3. SubAgentContextFactory (new)
4. ContextBuilder (extended)
5. MemoryConsolidator (extended)

**15 API Methods**:

1. `MemoryManager.loadByPriority()` - Tiered memory loading
2. `MemoryManager.save()` - Save with auto-layer generation
3. `MemoryManager.saveImmediate()` - Foreground write
4. `MemoryManager.updateImportanceScores()` - Background scoring
5. `MemoryManager.setTransient()` - In-memory state
6. `MemoryManager.getTransient()` - Retrieve transient
7. `MemoryManager.clearTransient()` - Clear transient
8. `GoferURIResolver.resolve()` - URI to content
9. `GoferURIResolver.parse()` - String to GoferURI
10. `GoferURIResolver.format()` - GoferURI to string
11. `SubAgentContextFactory.buildValidationContext()` - Validation context
12. `SubAgentContextFactory.buildResearchContext()` - Research context
13. `ContextBuilder.loadLayer()` - Tiered artifact loading
14. `ContextBuilder.buildContext()` - Full context assembly
15. `MemoryConsolidator.extractFromPipelineRuns()` - Auto-extraction

**Functional Requirements Covered**: 17/17 (100%)

**User Stories Supported**: 10/10 (100%)

**Performance Targets**: 8 NFRs with quantified latency/token budgets

---

## Appendix A: Observable Event Schemas

All events logged to `.specify/logs/context-usage.jsonl`:

### Memory Load Event

```json
{
  "eventType": "memory_load",
  "options": {
    "limit": 5,
    "layer": "L1",
    "category": "validation_pattern",
    "tags": ["#security"]
  },
  "results": {
    "count": 5,
    "totalTokens": 9874,
    "priorities": [87.3, 82.1, 78.9, 71.2, 68.5]
  },
  "timestamp": "2026-03-19T22:30:00Z"
}
```

### Memory Save Event

```json
{
  "eventType": "memory_save",
  "memoryId": "mem-def456",
  "category": "validation_pattern",
  "layers": {
    "abstract": "generated",
    "overview": "generated",
    "content": "provided"
  },
  "tokens": { "L0": 98, "L1": 1847, "L2": 4521 },
  "agentId": "validation-correctness",
  "timestamp": "2026-03-19T22:30:00Z"
}
```

### Loading Decision Event

```json
{
  "eventType": "loading_decision",
  "source": "mem-abc123",
  "sourceType": "memory",
  "decision": "loaded",
  "reason": "Priority score 87.3 exceeds threshold",
  "tokens": 1847,
  "priority": 87.3,
  "layer": "L1",
  "timestamp": "2026-03-19T22:30:00Z"
}
```

### Sub-Agent Context Build Event

```json
{
  "eventType": "subagent_context_build",
  "agentType": "validation",
  "category": "security",
  "memoriesInjected": 8,
  "patternsInjected": 3,
  "totalTokens": 9847,
  "timestamp": "2026-03-19T22:30:00Z"
}
```

### Extraction Complete Event

```json
{
  "eventType": "extraction_complete",
  "memoriesExtracted": 12,
  "patterns": 5,
  "lessons": 4,
  "decisions": 3,
  "errors": 1,
  "llmCalls": 3,
  "timestamp": "2026-03-19T22:30:00Z"
}
```

---

**END OF API CONTRACTS**
