---
generated: "2026-03-11T22:14:00Z"
source_commit: "29a322a5fd292b6346a0cf0d2ae981a59ffe4a4c"
---

# Patterns and Tech Debt

## Design Patterns Identified

### 1. Dependency Injection (tsyringe)

**Pattern:** Constructor injection with decorators

**Location:**
- `extension/src/di.ts` - Container setup
- `extension/src/services/` - Service definitions
- Used throughout extension codebase

**Implementation:**
```typescript
// Service definition
@injectable()
class ContextBuilder {
  constructor(
    @inject(Logger) private logger: Logger,
    @inject(MemoryManager) private memory: MemoryManager
  ) {}
}

// Container registration
container.register(ContextBuilder, { useClass: ContextBuilder });

// Resolution
const builder = container.resolve(ContextBuilder);
```

**Strengths:**
- ✅ Clear dependency graph
- ✅ Easy to test (mock injection)
- ✅ Centralized container management
- ✅ Follows SOLID principles

**Usage Examples:**
- `extension/src/services/Logger.ts`
- `extension/src/services/StateManager.ts`
- `extension/src/autonomous/ContextBuilder.ts`

---

### 2. Provider Pattern (VSCode TreeDataProvider)

**Pattern:** Tree view data providers with refresh events

**Location:**
- `extension/src/progressProvider.ts` - Spec tree
- `extension/src/constitutionProvider.ts` - Constitution tree
- `extension/src/memoryProvider.ts` - Memory tree
- `extension/src/contextWindowProvider.ts` - Context health

**Implementation:**
```typescript
class ProgressProvider implements vscode.TreeDataProvider<SpecItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SpecItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SpecItem): Promise<SpecItem[]> {
    // Return tree structure
  }
}
```

**Strengths:**
- ✅ Consistent pattern across all tree views
- ✅ Reactive updates via EventEmitter
- ✅ Leverages VSCode platform features

---

### 3. Observer Pattern (Event Emitters)

**Pattern:** Event-driven state updates

**Location:**
- `extension/src/autonomous/ContextHealthMonitor.ts`
- `extension/src/autonomous/HookBridgeWatcher.ts`
- Used extensively for cross-component communication

**Implementation:**
```typescript
class ContextHealthMonitor {
  private _onDidChangeHealth = new vscode.EventEmitter<ContextHealth>();
  readonly onDidChangeHealth = this._onDidChangeHealth.event;

  updateHealth(health: ContextHealth) {
    this._onDidChangeHealth.fire(health);
  }
}

// Consumers subscribe
monitor.onDidChangeHealth((health) => {
  statusBar.updateHealth(health);
});
```

**Strengths:**
- ✅ Decoupled components
- ✅ Reactive UI updates
- ✅ Type-safe events

**Usage Examples:**
- Spec refresh events
- Context health updates
- Memory compaction triggers
- Cost budget alerts

---

### 4. Strategy Pattern (Memory Layers)

**Pattern:** Pluggable memory storage strategies

**Location:**
- `extension/src/autonomous/MemoryLayerManager.ts`
- Three layers: Core, Recall, Archival

**Implementation:**
```typescript
interface MemoryLayer {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  search(query: string): Promise<string[]>;
}

class CoreLayer implements MemoryLayer { ... }
class RecallLayer implements MemoryLayer { ... }
class ArchivalLayer implements MemoryLayer { ... }
```

**Strengths:**
- ✅ Flexible storage backends
- ✅ MemGPT-inspired architecture
- ✅ Easy to add new layers

**Usage:**
- Core: Always-loaded high-priority memories
- Recall: Recent session context (last 20 interactions)
- Archival: Long-term searchable storage

---

### 5. Command Pattern

**Pattern:** Encapsulated command execution

**Location:**
- `extension/src/extension.ts` - 30+ command registrations
- `extension/src/commands/` - Command implementations

**Implementation:**
```typescript
commands.registerCommand('gofer.initialize', async () => {
  await initializationService.initializeRepository();
});

commands.registerCommand('gofer.refreshSpecs', async () => {
  progressProvider.refresh();
});
```

**Strengths:**
- ✅ Consistent pattern for all commands
- ✅ Easy to add new commands
- ✅ Keyboard shortcut integration

**Command Categories:**
- Repository management
- Specification CRUD
- Memory operations
- Claude Code integration
- Quality checks

---

### 6. Singleton Pattern (DI Container)

**Pattern:** Single instance per service

**Location:**
- `extension/src/di.ts`
- `extension/src/services/`

**Implementation:**
```typescript
export function getContainer(): DependencyContainer {
  return container; // Global singleton
}

// Services registered as singletons
container.register(Logger, { useClass: Logger }, { lifecycle: Lifecycle.Singleton });
```

**Strengths:**
- ✅ Shared state management
- ✅ Consistent service access
- ✅ Memory efficient

**Usage:**
- Logger - Centralized logging
- StateManager - Extension state
- ConfigManager - Configuration access

---

### 7. Factory Pattern

**Pattern:** Object creation abstraction

**Location:**
- `extension/src/autonomous/LLMProvider.ts`
- Creates different LLM client instances

**Implementation:**
```typescript
class LLMProviderFactory {
  create(provider: string): LLMClient {
    switch (provider) {
      case 'anthropic': return new AnthropicClient();
      case 'google': return new GoogleClient();
      case 'openai': return new OpenAIClient();
    }
  }
}
```

**Strengths:**
- ✅ Unified interface for multiple providers
- ✅ Easy to add new providers
- ✅ Runtime provider switching

**Usage:**
- LLM council multi-provider validation
- Cost calculation per provider
- Rate limit handling

---

### 8. Repository Pattern (Spec Loading)

**Pattern:** Data access abstraction

**Location:**
- `language-server/src/utils/goferLoader.ts`
- `extension/src/autonomous/SpecLoader.ts`

**Implementation:**
```typescript
class SpecRepository {
  async loadSpec(feature: string): Promise<Spec> {
    const content = await fs.readFile(path);
    return this.parse(content);
  }

  async saveSpec(spec: Spec): Promise<void> {
    const content = this.serialize(spec);
    await fs.writeFile(path, content);
  }
}
```

**Strengths:**
- ✅ Separates data access from business logic
- ✅ Caching layer possible
- ✅ Easy to swap storage backend

---

## Anti-Patterns Found

### 1. God Object (Extension Entry Point)

**Location:** `extension/src/extension.ts`

**Issue:**
- 800+ lines
- Handles initialization, commands, events, disposal
- High complexity

**Impact:** Medium
- Hard to test in isolation
- Difficult to navigate
- Potential for bugs in lifecycle management

**Recommendation:**
- Extract command handlers → `extension/src/commands/`
- Extract event handlers → `extension/src/events/`
- Keep only activation/deactivation logic in main file

---

### 2. Incomplete Separation (Spec Parsing)

**Location:**
- `language-server/src/utils/goferLoader.ts`
- `extension/src/autonomous/SpecLoader.ts`

**Issue:**
- Spec parsing logic duplicated
- Slight variations in implementation
- No shared utility package

**Impact:** Low
- Code duplication (~200 lines)
- Potential for divergence
- Maintenance burden

**Recommendation:**
- Create `@gofer/spec-parser` shared package
- Use in both extension and language server
- Single source of truth for parsing logic

---

### 3. Magic Numbers (Context Thresholds)

**Location:**
- `extension/src/autonomous/ContextHealthMonitor.ts`
- `extension/src/autonomous/AutoHandoffTrigger.ts`

**Issue:**
- Hardcoded thresholds scattered throughout
- Example: `0.5`, `0.7`, `0.65` for context levels

**Impact:** Low
- Hard to maintain consistency
- No single source of truth
- Difficult to tune

**Recommendation:**
- Extract to `ContextThresholds` class
- Document threshold rationale
- Make configurable via settings

**Mitigation in place:**
- Most thresholds configurable via VSCode settings
- Default values documented

---

### 4. Incomplete Error Handling (Large File Reads)

**Location:** `extension/src/autonomous/ContextBuilder.ts`

**Issue:**
- Large file reads without size limits
- No timeout handling
- Could hang on massive files

**Impact:** Medium
- Extension could freeze
- Poor user experience
- No fallback behavior

**Recommendation:**
- Add file size check before read
- Implement streaming for large files
- Add timeout with fallback

---

### 5. Callback Hell (Legacy Terminal Code)

**Location:** `extension/src/autonomous/ClaudeCodeTerminal.ts` (older versions)

**Issue:**
- Some promise chains mixed with callbacks
- Inconsistent async patterns

**Impact:** Low
- Mostly refactored to async/await
- Remaining instances isolated

**Recommendation:**
- Convert remaining `.then()` to `await`
- Standardize on async/await throughout

---

## Tech Debt Table

| Item | Severity | Location | Recommendation | Effort |
|------|----------|----------|----------------|--------|
| **God Object - extension.ts** | Medium | `extension/src/extension.ts` | Extract command/event handlers | 1-2 days |
| **Spec Parsing Duplication** | Low | `extension/`, `language-server/` | Create shared package | 4-6 hours |
| **Magic Number Thresholds** | Low | `autonomous/ContextHealthMonitor.ts` | Extract to constants/config | 2-3 hours |
| **Missing Size Limits** | Medium | `autonomous/ContextBuilder.ts` | Add file size checks, streaming | 4-6 hours |
| **Legacy Filename** | Low | `orchestrator/AutonomousOrchestrator_new.ts` | Rename or remove old version | 1 hour |
| **Incomplete Error Boundaries** | Medium | `autonomous/ContextBuilder.ts` | Add timeout and fallback | 4-6 hours |
| **Race Condition Risk** | Medium | `autonomous/HookBridgeWatcher.ts` | Add mutex for context updates | 2-3 hours |
| **Synchronous File Ops** | Low | `goferMigrator.ts` | Convert to async | 2-3 hours |
| **String Concatenation** | Low | `autonomous/ContextBuilder.ts` | Use array join | 1-2 hours |
| **Command Injection Risk** | Low | `autonomous/ClaudeCodeTerminal.ts` | Whitelist commands | 2-3 hours |

**Total Estimated Effort:** 3-4 weeks for all items

**Priority Order:**
1. God Object refactoring (improves maintainability)
2. Race condition fix (prevents bugs)
3. Missing error boundaries (improves robustness)
4. File size limits (prevents hangs)
5. Rest can be deferred to future releases

---

## Spec vs Implementation Alignment

### Feature 023: Documentation Site

**Spec Location:** `.specify/specs/023-documentation-site/spec.md`

**Status:** Draft → Implementation in progress

**Alignment Notes:**
- Spec defines user stories and acceptance criteria
- Implementation follows planned architecture
- No major deviations identified

### Feature 024: Wire ContextBuilder + ACC

**Spec Location:** `.specify/specs/024-wire-contextbuilder-acc/`

**Status:** Recently completed

**Alignment Notes:**
- ✅ Implementation matches spec requirements
- ✅ All acceptance criteria met
- ✅ ACCOrchestrator wired correctly
- ⚠️ Memory leak fixed in v1.17.1 (post-spec)

**Deviations:**
- None major - memory leak was discovered during implementation and fixed

---

## Pattern Consistency Across Modules

### Consistent Patterns ✅

**Service Layer:**
- All services use dependency injection
- Consistent constructor pattern
- Clear interface definitions

**Tree Views:**
- All use `TreeDataProvider` pattern
- Consistent refresh mechanism
- Standard `getTreeItem`/`getChildren` implementation

**Commands:**
- All registered in `extension.ts`
- Consistent async/await pattern
- Standard error handling

**Event Emitters:**
- Consistent naming (`_onDidChange*` private, `onDidChange*` public)
- Type-safe event payloads
- Standard subscription pattern

### Inconsistent Patterns ⚠️

**File I/O:**
- Mix of `fs.readFile` and `fs.readFileSync`
- Some use promises, some use callbacks
- **Recommendation:** Standardize on async/await with promises

**Error Handling:**
- Some functions throw, others return error objects
- No consistent error type hierarchy
- **Recommendation:** Define error hierarchy and usage guidelines

**Logging:**
- Mix of `console.log` and `Logger` service
- Inconsistent log levels
- **Recommendation:** Use Logger service exclusively

---

## Architectural Trade-offs

### Trade-off 1: Monorepo vs. Separate Repos

**Decision:** Monorepo with three main directories

**Pros:**
- ✅ Easier to coordinate changes across components
- ✅ Single version number for all components
- ✅ Shared dev dependencies

**Cons:**
- ⚠️ Larger repository size
- ⚠️ All tests run even if only one component changed

**Assessment:** Good trade-off for this project size

---

### Trade-off 2: Language Server in Extension vs. Separate

**Decision:** Include language server in extension (bundled)

**Pros:**
- ✅ Simpler installation (single VSIX)
- ✅ Version alignment guaranteed
- ✅ Easier to debug

**Cons:**
- ⚠️ Larger VSIX file
- ⚠️ Language server can't be used standalone

**Assessment:** Good trade-off for user experience

---

### Trade-off 3: File-Based Storage vs. Database

**Decision:** File-based (markdown + YAML)

**Pros:**
- ✅ Git-friendly (version control)
- ✅ Human-readable
- ✅ No database dependencies
- ✅ Portable

**Cons:**
- ⚠️ No ACID transactions
- ⚠️ Potential file conflicts with concurrent edits
- ⚠️ Slower for large datasets

**Assessment:** Correct choice for this use case

---

### Trade-off 4: Polling vs. Hook-Based Monitoring

**Decision:** Hook-based (v1.17.0)

**Pros:**
- ✅ 80% CPU reduction
- ✅ More accurate
- ✅ Real-time updates

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Depends on hook infrastructure

**Assessment:** Excellent improvement in v1.17.0

---

## Refactoring Opportunities

### Opportunity 1: Extract Command Handlers

**Current:** All commands registered inline in `extension.ts`

**Proposed:**
```typescript
// extension/src/commands/initializeCommand.ts
export function registerInitializeCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('gofer.initialize', async () => {
      // Implementation
    })
  );
}
```

**Benefits:**
- Improved testability
- Better organization
- Easier to find command implementations

**Effort:** 1-2 days

---

### Opportunity 2: Unified Spec Parser Package

**Current:** Duplicated parsing in extension and language server

**Proposed:**
```typescript
// packages/spec-parser/src/index.ts
export class SpecParser {
  parse(content: string): Spec { ... }
  serialize(spec: Spec): string { ... }
}

// Used by both extension and language server
```

**Benefits:**
- Single source of truth
- Easier to maintain
- Consistent behavior

**Effort:** 4-6 hours

---

### Opportunity 3: Context Builder Optimization

**Current:** Large context strings built with concatenation

**Proposed:**
```typescript
class ContextBuilder {
  build(): string {
    const parts: string[] = [];
    parts.push(this.buildHeader());
    parts.push(this.buildResearch());
    parts.push(this.buildMemories());
    return parts.join('\n\n');
  }
}
```

**Benefits:**
- Better performance
- Lower memory usage
- Easier to debug

**Effort:** 1-2 hours

---

## Conclusion

Gofer demonstrates **strong architectural patterns** with consistent application across the codebase. The use of dependency injection, event-driven architecture, and well-known design patterns makes the code maintainable and extensible.

**Key Strengths:**
- Excellent use of TypeScript and DI
- Consistent provider pattern for UI components
- Clear separation of concerns
- Strong testing infrastructure

**Key Opportunities:**
- Refactor large classes (extension.ts)
- Extract shared spec parser
- Strengthen error boundaries
- Address minor tech debt

**Overall Assessment:** The patterns and architecture are **production-quality** with minor refactoring opportunities that can be addressed incrementally.
