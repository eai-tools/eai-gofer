# Quickstart Guide: Memory and Learning System

**Feature**: Memory and Learning System **Audience**: Developers implementing
this feature **Last Updated**: 2025-10-31

## Overview

This guide helps you quickly understand and start implementing the Memory and
Learning System for SpecGofer. It covers setup, architecture, and the first
implementation steps following TDD principles.

## Prerequisites

Before starting implementation:

- ✅ Completed Feature 005 (Autonomous Claude Driver)
- ✅ Familiar with TypeScript and VSCode Extension API
- ✅ Read [spec.md](./spec.md) and [plan.md](./plan.md)
- ✅ Node.js 18+ and npm installed
- ✅ VSCode Extension development environment set up

## Architecture Overview

### Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    VSCode Extension                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Memory    │   │    Hint      │   │  Dependency  │ │
│  │  Commands   │   │   Loader     │   │    Graph     │ │
│  └──────┬──────┘   └──────┬───────┘   └──────┬───────┘ │
│         │                  │                   │         │
│         └──────────────────┼───────────────────┘         │
│                            │                             │
│                     ┌──────▼────────┐                    │
│                     │   Context     │                    │
│                     │   Builder     │                    │
│                     └──────┬────────┘                    │
│                            │                             │
│                     ┌──────▼────────┐                    │
│                     │  Autonomous   │                    │
│                     │    Driver     │                    │
│                     └──────┬────────┘                    │
│                            │                             │
│                     ┌──────▼────────┐                    │
│                     │   Context     │                    │
│                     │  Compactor    │                    │
│                     └───────────────┘                    │
│                                                           │
└──────────────────────────────────────────────────────────┘

Storage:
  • Local:  .specify/memory/local.json
  • Global: VSCode globalState
  • Hints:  .specify/hints/**/*.md
  • Graph:  .specify/memory/dependency-graph.json
```

### Data Flow

1. **User Command** → Memory Commands → MemoryManager → Storage
2. **Autonomous Execution Start** → ContextBuilder → Load Memories + Hints
3. **Task Execution** → AutonomousDriver → Inject Context → LLM
4. **Context Full** → ContextCompactor → Summarize → Continue

## Quick Setup

### 1. Install Dependencies

```bash
cd extension
npm install graphlib fast-glob ajv
npm install --save-dev @types/graphlib
```

### 2. Create Directory Structure

```bash
# From repository root
mkdir -p extension/src/autonomous
mkdir -p extension/src/commands
mkdir -p extension/src/ui
mkdir -p tests/unit/autonomous
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p .specify/memory
mkdir -p .specify/hints
```

### 3. Copy Contracts

Copy TypeScript interfaces from `contracts/` to your working directories:

```bash
cp .specify/specs/001-memory-learning-system/contracts/*.ts \
   extension/src/autonomous/
```

## Implementation Order (TDD)

Follow this order to implement the feature using Test-Driven Development:

### Phase 1: Memory Extension (P1) - Weeks 1-3

**Priority**: HIGHEST - Foundation for all other features

#### Step 1: MemoryManager Tests (Day 1-2)

```typescript
// tests/unit/autonomous/MemoryManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager } from '../../../extension/src/autonomous/MemoryManager';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager({
      localStoragePath: '.specify/memory/test-local.json',
      globalState: mockGlobalState,
    });
  });

  describe('save()', () => {
    it('should generate UUID and timestamps for new memory', async () => {
      const memory = await manager.save({
        category: 'test',
        tags: ['#test'],
        scope: 'local',
        content: 'Test memory',
        usedCount: 0,
        lastUsed: Date.now(),
        learnedFrom: 'test',
      });

      expect(memory.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(memory.created).toBeGreaterThan(0);
    });

    it('should throw error for invalid memory', async () => {
      await expect(
        manager.save({
          category: '', // Invalid: empty category
          tags: [],
          scope: 'local',
          content: '',
          usedCount: 0,
          lastUsed: 0,
          learnedFrom: '',
        })
      ).rejects.toThrow('Category must be 1-50 characters');
    });
  });

  // ... more tests
});
```

#### Step 2: Implement MemoryManager (Day 3-5)

```typescript
// extension/src/autonomous/MemoryManager.ts
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import type {
  Memory,
  MemoryQuery,
  MemoryManager as IMemoryManager,
} from './memory';

export class MemoryManager implements IMemoryManager {
  constructor(
    private localStoragePath: string,
    private globalState: vscode.Memento
  ) {}

  async save(memory: Omit<Memory, 'id' | 'created'>): Promise<Memory> {
    // Validate
    this.validate(memory);

    // Create complete memory
    const complete: Memory = {
      ...memory,
      id: uuidv4(),
      created: Date.now(),
    };

    // Save based on scope
    if (complete.scope === 'local') {
      await this.saveLocal(complete);
    } else {
      await this.saveGlobal(complete);
    }

    return complete;
  }

  // ... implement other methods
}
```

#### Step 3: VSCode Commands (Day 6-7)

```typescript
// extension/src/commands/memoryCommands.ts
import * as vscode from 'vscode';
import { MemoryManager } from '../autonomous/MemoryManager';

export async function registerMemoryCommands(
  context: vscode.ExtensionContext,
  manager: MemoryManager
): Promise<void> {
  // Remember command
  context.subscriptions.push(
    vscode.commands.registerCommand('specGofer.remember', async () => {
      const content = await vscode.window.showInputBox({
        prompt: 'What should I remember?',
        placeHolder: 'e.g., Use Vitest for all tests',
      });

      if (!content) return;

      const scope = await vscode.window.showQuickPick(['local', 'global'], {
        placeHolder: 'Scope: local (project) or global (user-wide)?',
      });

      const category = await vscode.window.showInputBox({
        prompt: 'Category?',
        value: 'preferences',
      });

      await manager.save({
        content,
        scope: scope as 'local' | 'global',
        category: category || 'preferences',
        tags: [],
        usedCount: 0,
        lastUsed: Date.now(),
        learnedFrom: 'user_interaction',
      });

      vscode.window.showInformationMessage('✅ Memory saved');
    })
  );

  // ... register other commands
}
```

---

### Phase 2: Hierarchical Hints (P2) - Weeks 4-5

#### Step 1: HintLoader Tests

```typescript
// tests/unit/autonomous/HintLoader.test.ts
describe('HintLoader', () => {
  it('should discover hints in directory hierarchy', async () => {
    const loader = new HintLoader('.specify/hints');
    const hints = await loader.discoverHints('.');

    expect(hints).toHaveLength(3);
    expect(hints[0].scope).toBe('global');
    expect(hints[1].scope).toBe('directory');
  });

  it('should merge hints with correct precedence', () => {
    const hints = [
      { priority: 1, content: 'Global standard' },
      { priority: 10, content: 'Directory specific' },
    ];

    const merged = loader.mergeHints(hints);
    expect(merged).toContain('Directory specific');
    expect(merged).toContain('Global standard');
  });
});
```

#### Step 2: Implement HintLoader

```typescript
// extension/src/autonomous/HintLoader.ts
import fg from 'fast-glob';
import * as fs from 'fs-extra';
import * as path from 'path';

export class HintLoader implements IHintLoader {
  private cache = new Map<string, HintFile[]>();

  async discoverHints(directory: string): Promise<HintFile[]> {
    // Check cache first
    if (this.cache.has(directory)) {
      return this.cache.get(directory)!;
    }

    // Discover using fast-glob
    const pattern = path.join(directory, '**/*.md');
    const paths = await fg(pattern, { onlyFiles: true });

    // Load and classify each hint file
    const hints = await Promise.all(paths.map((p) => this.loadHintFile(p)));

    // Cache results
    this.cache.set(directory, hints);
    return hints;
  }

  // ... implement other methods
}
```

---

### Phase 3: Dependency Graph (P3) - Weeks 6-9

#### Step 1: DependencyGraph Tests

```typescript
// tests/unit/autonomous/DependencyGraph.test.ts
describe('DependencyGraph', () => {
  it('should detect circular dependencies', () => {
    const graph = new DependencyGraph();
    graph.addDependency('spec-A', 'spec-B', 'required_by');
    graph.addDependency('spec-B', 'spec-C', 'required_by');

    expect(() => {
      graph.addDependency('spec-C', 'spec-A', 'required_by');
    }).toThrow('Circular dependency detected');
  });

  it('should return topological sort', () => {
    const graph = new DependencyGraph();
    graph.addDependency('spec-B', 'spec-A', 'required_by');
    graph.addDependency('spec-C', 'spec-B', 'required_by');

    const order = graph.getExecutionOrder();
    expect(order).toEqual(['spec-A', 'spec-B', 'spec-C']);
  });
});
```

#### Step 2: Implement DependencyGraph

```typescript
// extension/src/autonomous/DependencyGraph.ts
import { Graph, alg } from 'graphlib';

export class DependencyGraph implements IDependencyGraph {
  private graph = new Graph();
  private edges: SpecDependency[] = [];

  addDependency(from: string, to: string, type: DependencyType): void {
    // Check for cycles first
    this.graph.setEdge(from, to);
    const cycles = alg.findCycles(this.graph);

    if (cycles.length > 0) {
      this.graph.removeEdge(from, to); // Rollback
      throw new Error(
        `Circular dependency detected: ${cycles[0].join(' -> ')}`
      );
    }

    // Add to edges list
    this.edges.push({
      fromSpecId: from,
      toSpecId: to,
      dependencyType: type,
      declared: true,
    });
  }

  detectCycles(): DependencyCycle[] | null {
    const cycles = alg.findCycles(this.graph);
    if (cycles.length === 0) return null;

    return cycles.map((cycle) => ({
      path: cycle,
      description: cycle.join(' → ') + ' → ' + cycle[0],
    }));
  }

  // ... implement other methods
}
```

---

### Phase 4: Auto-Compaction (P4) - Weeks 10-11

#### Step 1: ContextCompactor Tests

```typescript
// tests/unit/autonomous/ContextCompactor.test.ts
describe('ContextCompactor', () => {
  it('should detect when compaction is needed', async () => {
    const compactor = new ContextCompactor({ threshold: 0.8 });
    const session = createMockSession({ contextSize: 170000 }); // 85% of 200K

    const shouldCompact = await compactor.shouldCompact(session);
    expect(shouldCompact).toBe(true);
  });

  it('should preserve last N tasks', async () => {
    const compactor = new ContextCompactor({
      strategy: { preserveLastN: 10 },
    });

    const session = createMockSession({ completedTasks: 50 });
    const summary = await compactor.compact(session);

    expect(summary.preservedTasks).toHaveLength(10);
    expect(summary.tasksCompacted).toHaveLength(40);
  });
});
```

#### Step 2: Implement ContextCompactor

```typescript
// extension/src/autonomous/ContextCompactor.ts
export class ContextCompactor implements IContextCompactor {
  private threshold: number;

  estimateTokenUsage(context: string): number {
    // Fast approximation: chars / 4
    return Math.ceil(context.length / 4);
  }

  async shouldCompact(session: Session): Promise<boolean> {
    const tokens = this.estimateTokenUsage(session.context);
    const percentage = tokens / 200_000; // Assuming 200K context window

    return percentage > this.threshold;
  }

  async compact(session: Session): Promise<CompactionSummary> {
    // Preserve last N tasks
    const tasksToPreserve = session.completedTasks.slice(-10);
    const tasksToCompact = session.completedTasks.slice(0, -10);

    // Summarize old tasks
    const summaryText = await this.summarizeTasks(tasksToCompact);

    // Build new context
    const newContext = this.buildCompactedContext(
      session,
      summaryText,
      tasksToPreserve
    );

    // Calculate savings
    const tokensBefore = this.estimateTokenUsage(session.context);
    const tokensAfter = this.estimateTokenUsage(newContext);

    return {
      sessionId: session.id,
      tasksCompacted: tasksToCompact,
      summaryText,
      tokensSaved: tokensBefore - tokensAfter,
      compactedAt: Date.now(),
      preservedTasks: tasksToPreserve,
      strategy: this.getDefaultStrategy(),
    };
  }

  // ... implement other methods
}
```

---

## Testing Strategy

### Unit Tests (85% coverage target)

```bash
# Run all unit tests
npm run test:unit

# Run specific module tests
npm run test:unit -- MemoryManager.test.ts

# Run with coverage
npm run test:unit -- --coverage
```

**Critical paths requiring 100% coverage**:

- MemoryManager persistence logic
- DependencyGraph cycle detection
- ContextCompactor token estimation

### Integration Tests

```typescript
// tests/integration/memoryIntegration.test.ts
describe('Memory Integration', () => {
  it('should persist memory across VSCode restart', async () => {
    // Save memory
    await manager.save({ content: 'Test', scope: 'local', ... });

    // Simulate restart
    const newManager = new MemoryManager(samePath, globalState);

    // Load and verify
    const memories = await newManager.load('local');
    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe('Test');
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/memoryPersistence.spec.ts
import { test, expect } from '@playwright/test';

test('memory persists across VSCode restart', async ({ page }) => {
  // Open VSCode
  await page.goto('vscode://');

  // Execute "Remember" command
  await page.keyboard.press('F1');
  await page.fill('[placeholder="Type command"]', 'SpecGofer: Remember');
  await page.keyboard.press('Enter');

  // Enter memory
  await page.fill(
    '[placeholder="What should I remember?"]',
    'Use Vitest for tests'
  );
  await page.keyboard.press('Enter');

  // Restart VSCode
  await page.evaluate(() =>
    vscode.commands.executeCommand('workbench.action.reloadWindow')
  );

  // Verify memory exists
  // ... verification steps
});
```

---

## Common Development Tasks

### Add New Memory Category

1. No code changes needed - categories are user-defined strings
2. Document common categories in user guide

### Add New Hint Scope

```typescript
// 1. Update type in contracts/hints.ts
export type HintScope = 'global' | 'project' | 'directory' | 'file';

// 2. Update classification logic in HintLoader.ts
classifyHint(filePath: string): { scope: HintScope; priority: number } {
  if (path.basename(filePath) === 'global.md') return { scope: 'global', priority: 1 };
  // ... add new scope logic
}
```

### Add New Dependency Type

```typescript
// 1. Update type in contracts/dependencies.ts
export type DependencyType =
  | 'required_by'
  | 'uses_api_from'
  | 'blocks'
  | 'enhances';

// 2. Handle in DependencyGraph logic
// 3. Update UI labels
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// extension/src/config.ts
export const DEBUG = process.env.SPECGOFER_DEBUG === 'true';

// In your code
if (DEBUG) {
  console.log('[MemoryManager] Saving memory:', memory);
}
```

### Inspect VSCode Global State

```typescript
// In VSCode Extension Host debugger console
await context.globalState.keys(); // List all keys
await context.globalState.get('specgofer.memories.global'); // View memories
```

### View Dependency Graph

```bash
# Pretty-print dependency graph
cat .specify/memory/dependency-graph.json | jq .
```

---

## Performance Optimization

### Memory Search Optimization

```typescript
// Bad: Linear search every time
search(query) {
  return this.memories.filter(m => m.content.includes(query.keywords));
}

// Good: Build index for fast lookup
class MemoryManager {
  private index = new Map<string, Set<string>>(); // category -> memory IDs

  rebuildIndex() {
    this.index.clear();
    for (const memory of this.memories) {
      if (!this.index.has(memory.category)) {
        this.index.set(memory.category, new Set());
      }
      this.index.get(memory.category)!.add(memory.id);
    }
  }

  search(query) {
    // Use index for category filter
    if (query.category) {
      const ids = this.index.get(query.category) || new Set();
      return this.memories.filter(m => ids.has(m.id));
    }
    // ... fallback to linear search for keywords
  }
}
```

### Hint Loading Optimization

```typescript
// Use caching to avoid repeated file reads
private cache = new Map<string, HintFile[]>();

async discoverHints(directory: string): Promise<HintFile[]> {
  if (this.cache.has(directory)) {
    return this.cache.get(directory)!; // <1ms
  }

  // ... discover and cache
}

// Invalidate cache on file changes (via VSCode FileSystemWatcher)
setupFileWatcher() {
  const watcher = vscode.workspace.createFileSystemWatcher('.specify/hints/**/*.md');

  watcher.onDidChange(() => this.invalidateCache());
  watcher.onDidCreate(() => this.invalidateCache());
  watcher.onDidDelete(() => this.invalidateCache());
}
```

---

## Troubleshooting

### Issue: "Memory not persisting after VSCode restart"

**Check**:

1. Verify globalState key: `specgofer.memories.global` (not `memories`)
2. Check file permissions on `.specify/memory/local.json`
3. Ensure `await` is used on all save operations

### Issue: "Hint files not loading"

**Check**:

1. File extension is `.md`
2. Files are in `.specify/hints/` directory
3. Cache hasn't gone stale (try `invalidateCache()`)

### Issue: "Circular dependency not detected"

**Check**:

1. Graph is being updated before validation
2. Using graphlib correctly (edges added before cycle check)
3. Test with minimal reproduction case

---

## Next Steps

1. ✅ Complete P1 (Memory Extension) - 2-3 weeks
2. ⏭️ Complete P2 (Hierarchical Hints) - 1-2 weeks
3. ⏭️ Complete P3 (Dependency Graph) - 3-4 weeks
4. ⏭️ Complete P4 (Auto-Compaction) - 1-2 weeks

**After implementation**: Run `/speckit.tasks` to break down into detailed
tasks.

---

## Resources

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Research Findings](./research.md)
- [Data Model](./data-model.md)
- [TypeScript Contracts](./contracts/)
- [SpecGofer Constitution](../../../.specify/memory/constitution.md)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [graphlib Documentation](https://github.com/dagrejs/graphlib/wiki)
