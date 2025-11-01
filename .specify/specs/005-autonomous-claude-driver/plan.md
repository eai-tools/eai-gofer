# Implementation Plan: Autonomous Claude Code Driver

**Spec ID**: 005 **Feature**: Autonomous Claude Code Driver **Status**: Planning
**Created**: 2025-10-31

## Technical Context

### Technology Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+ (VSCode extension host)
- **Framework**: VSCode Extension API 1.85+
- **Terminal API**: `vscode.window.createTerminal()`,
  `vscode.window.onDidWriteTerminalData()`
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build**: Webpack 5.x for bundling

### Architecture Decisions

#### 1. Terminal Output Capture Strategy

**Decision**: Use VSCode's `onDidWriteTerminalData` event listener with circular
buffer

**Rationale**:

- Native VSCode API (no shell hacks or PTY manipulation)
- Real-time streaming (no polling delays)
- Memory-efficient (10K line rolling buffer)
- Cross-platform (works on Windows/macOS/Linux)

**Alternatives Considered**:

- File-based (`.claude-output.txt`): Too slow, polling overhead
- PTY raw access: Too low-level, platform-specific issues
- Shell command wrapping: Fragile, breaks interactive commands

#### 2. State Persistence Model

**Decision**: Event-sourced state with periodic snapshots to
`.specify/state/progress.json`

**Data Model**:

```typescript
interface AutonomousSession {
  sessionId: string;
  specId: string;
  startedAt: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  terminals: TerminalState[];
  completedTasks: string[];
  currentTask: string | null;
  tokenCount: number;
  errorHistory: ErrorEvent[];
  questionHistory: QuestionEvent[];
}
```

**Rationale**:

- Survives VSCode restarts (users can close/reopen)
- Enables session resume after crashes
- Provides audit trail for debugging
- Small file size (<1MB for typical sessions)

#### 3. Error Recovery State Machine

**Decision**: 3-level retry with exponential backoff and context escalation

**States**:

```
RUNNING → ERROR_DETECTED → RETRY_1 (send error) → RETRY_2 (+ file context) → RETRY_3 (+ constitution) → ESCALATE
```

**Timeouts**:

- Detection: 5s from error output
- Retry wait: 10s, 30s, 60s (exponential)
- User response: 4 hours before auto-pause

**Rationale**:

- Gives Claude progressively more context to self-recover
- Prevents infinite loops (hard cap at 3 retries)
- User escalation is last resort (maintains autonomy)

#### 4. Context Window Tracking

**Decision**: Character-based estimation with conservative thresholds

**Formula**: `tokens ≈ chars / 3.5` (Anthropic's published ratio)

**Thresholds**:

- Warning: 160K tokens (70% of 200K limit)
- Action: 180K tokens (90% of limit)
- Emergency cutoff: 195K tokens (safety margin)

**Rationale**:

- Conservative estimate prevents mid-task cutoff
- 20K token buffer allows for summary generation
- Character counting is fast (<1ms overhead)

**Alternative**: Use `@anthropic-ai/sdk` to count exact tokens

- **Rejected**: Too slow (50-100ms overhead per message)
- **Rejected**: Requires API key in extension (security concern)

#### 5. Question Detection

**Decision**: Regex-based pattern matching with confidence scoring

**Patterns** (in priority order):

```typescript
const QUESTION_PATTERNS = [
  /Option [A-Z]:/gi, // "Option A: ... Option B: ..."
  /Which (approach|method|pattern)/i, // "Which approach should I use?"
  /Should I (use|implement|create)/i, // "Should I use Redis?"
  /I'm blocked on/i, // "I'm blocked on authentication"
  /\?$/m, // Questions ending with ?
];
```

**Confidence Scoring**:

- Multiple patterns match: High confidence (send immediately)
- Single pattern + context markers: Medium (wait 10s for more context)
- Question mark only: Low (ignore - likely just commentary)

**Rationale**:

- Regex is fast (<1ms per check)
- Pattern-based works for 90%+ of Claude's question formats
- Confidence scoring reduces false positives

**Alternative**: LLM-based classification

- **Rejected**: Too slow (100-500ms per message)
- **Rejected**: Requires API calls (cost + latency)
- **Future**: Could add as fallback for edge cases

#### 6. Parallel Agent Coordination

**Decision**: Leader-follower pattern with file-based synchronization

**Model**:

```
Engineer (Leader):
  - Executes implementation tasks
  - Writes to tasks.md on completion
  - Waits for Tester signal before next task

Tester (Follower):
  - Watches tasks.md for updates (chokidar)
  - Runs tests on completed task
  - Writes result to .specify/state/test-results.json
  - Signals Engineer via file write
```

**Rationale**:

- No complex IPC/messaging needed
- File system is the synchronization primitive
- Both agents can read shared state (tasks.md)
- VSCode file watcher handles notification

**Alternatives Considered**:

- Message passing (VSCode events): Too tightly coupled
- Shared memory: Not possible in VSCode extension architecture
- Database: Overkill for simple coordination

### Integration Points

**Existing Components** (already built):

1. **ProgressProvider** (`src/progressProvider.ts`):
   - Call `updateTaskStatus(specId, taskId, status)` when tasks complete
   - Call `refresh()` after batch updates

2. **SpecLoader** (via Language Server):
   - Read `tasks.md` via MCP tool `specgofer_get_specs`
   - Parse task dependencies and order

3. **WhatsAppClient** (`src/utils/WhatsAppClient.ts`):
   - Call `sendMessage(phoneNumber, message)` for questions
   - Existing rate limiting (1 msg / 5 min)

4. **MCP Tools** (via Language Server):
   - Claude Code already uses these during `/speckit.implement`
   - No changes needed

**New Dependencies**:

- **Chokidar**: File watching for parallel agent coordination
  - Already in package.json (used elsewhere)
  - Version: `^3.5.3`

### File Structure

```
extension/src/
├── autonomous/                       # NEW MODULE
│   ├── index.ts                      # Public API exports
│   ├── AutonomousDriver.ts           # Main orchestrator
│   ├── TerminalManager.ts            # Terminal lifecycle
│   ├── OutputMonitor.ts              # Stream parsing
│   ├── ErrorRecovery.ts              # Retry logic
│   ├── ContextManager.ts             # Token tracking
│   ├── QuestionRouter.ts             # Question detection
│   ├── ParallelCoordinator.ts        # Engineer + Tester
│   └── ProgressReporter.ts           # UI updates
│
├── extension.ts                      # Register new commands
│   └── registerCommand('specGofer.startAutonomous', ...)
│
└── progressProvider.ts               # Add "▶️ Start" button
    └── getTreeItem() → add context menu
```

## Constitution Check

✅ **Test-Driven Development**: Will write tests BEFORE implementation for all
classes ✅ **MCP-First**: Uses existing MCP tools, no new protocols needed ✅
**Spec Kit Format**: Reads specs via existing parsers ✅ **Strict TypeScript**:
All classes with explicit types, no `any` ✅ **Security**: No secrets in logs,
sanitizes output before external notifications ✅ **Performance**: <500ms for
all operations (terminal creation, parsing) ✅ **80% Coverage**: Unit +
integration + E2E tests for all modules

## Implementation Phases

### Phase 0: Setup & Research

**Objective**: Validate technical approach and resolve unknowns

**Tasks**:

1. Research VSCode Terminal API output capture (verify `onDidWriteTerminalData`
   works)
2. Prototype token counting accuracy (chars / 3.5 vs actual)
3. Test regex patterns against sample Claude outputs
4. Verify file watching performance (chokidar on tasks.md)

**Deliverables**:

- `research.md` with findings
- Proof-of-concept for terminal output capture
- Performance benchmark results

### Phase 1: Core Infrastructure

**Objective**: Build terminal management and output monitoring

**Tasks**:

1. Implement `TerminalManager`:
   - Create/destroy terminals
   - Send commands
   - Capture output stream
2. Implement `OutputMonitor`:
   - Parse task completion markers
   - Detect error patterns
   - Detect question patterns
3. Write unit tests (100% coverage target)

**Deliverables**:

- `TerminalManager.ts` with tests
- `OutputMonitor.ts` with tests
- Integration test: spawn terminal → send command → parse output

### Phase 2: Error Handling & Context Management

**Objective**: Build retry logic and context window management

**Tasks**:

1. Implement `ErrorRecovery`:
   - 3-level retry state machine
   - Error categorization
   - Escalation logic
2. Implement `ContextManager`:
   - Token counting
   - Summary generation
   - Context switch triggering
3. Write unit + integration tests

**Deliverables**:

- `ErrorRecovery.ts` with tests
- `ContextManager.ts` with tests
- Integration test: error → retry → escalation flow

### Phase 3: Question Routing & Notifications

**Objective**: Build question detection and user notification

**Tasks**:

1. Implement `QuestionRouter`:
   - Regex pattern matching
   - Confidence scoring
   - Channel routing (WhatsApp/VSCode/Email)
2. Implement notification handlers
3. Write integration tests

**Deliverables**:

- `QuestionRouter.ts` with tests
- Integration test: question detected → WhatsApp sent → response received

### Phase 4: Progress Tracking & State Persistence

**Objective**: Build UI integration and session persistence

**Tasks**:

1. Implement `ProgressReporter`:
   - Update `tasks.md` checkboxes
   - Call `ProgressProvider.updateTaskStatus()`
   - Save session state every 30s
2. Add status bar integration
3. Add Output panel logging
4. Write integration tests

**Deliverables**:

- `ProgressReporter.ts` with tests
- Session state schema in `data-model.md`
- Integration test: task complete → UI updates → state saved

### Phase 5: Main Orchestrator

**Objective**: Tie everything together with `AutonomousDriver`

**Tasks**:

1. Implement `AutonomousDriver`:
   - Coordinate all modules
   - Handle lifecycle (start/stop/pause/resume)
   - Event callbacks (onProgress, onQuestion, etc.)
2. Implement session resume logic
3. Write integration tests

**Deliverables**:

- `AutonomousDriver.ts` with tests
- Integration test: full autonomous session start → completion

### Phase 6: Parallel Execution (Optional)

**Objective**: Build Engineer + Tester parallel mode

**Tasks**:

1. Implement `ParallelCoordinator`:
   - Spawn two terminals
   - File-based synchronization
   - Race condition prevention
2. Write integration tests

**Deliverables**:

- `ParallelCoordinator.ts` with tests
- Integration test: parallel execution with handoff

### Phase 7: VSCode Integration

**Objective**: Add UI elements and commands

**Tasks**:

1. Add "▶️ Start Autonomous Implementation" button to sidebar
2. Register command `specGofer.startAutonomous`
3. Add settings:
   - `specGofer.autonomous.showTerminals` (default: true)
   - `specGofer.autonomous.enableParallelTester` (default: false)
   - `specGofer.autonomous.notificationChannel` (default: "vscode")
4. Add Output panel channel "SpecGofer Autonomous"

**Deliverables**:

- Updated `extension.ts`
- Updated `progressProvider.ts`
- Updated `package.json` with new commands/settings

### Phase 8: E2E Testing & Polish

**Objective**: Full system testing and bug fixes

**Tasks**:

1. Create test spec: `001-sample-feature` with 5 simple tasks
2. Run full autonomous execution
3. Test error scenarios (syntax error, test failure, question)
4. Test context window rollover
5. Fix bugs and edge cases

**Deliverables**:

- E2E test suite
- Bug fix list
- Performance tuning results

## Quality Gates

**Before each phase completion**:

- ✅ All unit tests pass (80%+ coverage)
- ✅ Integration tests pass
- ✅ TypeScript compiles with strict mode
- ✅ ESLint passes (zero warnings)
- ✅ Code review completed

**Before final release**:

- ✅ E2E tests pass on sample spec
- ✅ Memory profiling shows <200MB usage
- ✅ Performance benchmarks meet NFR-001
- ✅ Security review completed (no secrets in logs)
- ✅ Documentation updated (README, CHANGELOG)

## Risks & Mitigations

| Risk                                              | Probability | Impact | Mitigation                                      |
| ------------------------------------------------- | ----------- | ------ | ----------------------------------------------- |
| VSCode Terminal API changes in future versions    | Low         | High   | Add version checks, maintain backwards compat   |
| Terminal output parsing misses errors             | Medium      | High   | Extensive test suite with real Claude outputs   |
| Context window estimation inaccurate              | Medium      | Medium | Conservative thresholds (180K not 195K)         |
| File watching performance degrades on large repos | Low         | Medium | Debounce file events, watch specific files only |
| Parallel agents cause race conditions             | Medium      | Medium | File locking, sequential task handoff           |
| Users never respond to questions (4hr timeout)    | Low         | Low    | Auto-pause and notify, allow resume             |

## Success Criteria

**MVP (Phase 5 complete)**:

- ✅ Can spawn Claude Code terminal automatically
- ✅ Can send `/speckit.implement` command
- ✅ Can detect task completion and update UI
- ✅ Can detect errors and retry 3 times
- ✅ Can escalate questions to user

**Full Release (Phase 8 complete)**:

- ✅ All acceptance criteria from spec.md pass
- ✅ 80%+ test coverage
- ✅ Performance meets NFR-001
- ✅ Works on Windows, macOS, Linux
- ✅ Users can resume sessions after VSCode restart

## Timeline Estimate

| Phase                        | Estimated Time    |
| ---------------------------- | ----------------- |
| Phase 0: Research            | 2 days            |
| Phase 1: Core Infrastructure | 3 days            |
| Phase 2: Error & Context     | 3 days            |
| Phase 3: Question Routing    | 2 days            |
| Phase 4: Progress Tracking   | 2 days            |
| Phase 5: Main Orchestrator   | 3 days            |
| Phase 6: Parallel Execution  | 3 days (optional) |
| Phase 7: VSCode Integration  | 2 days            |
| Phase 8: E2E Testing         | 3 days            |
| **Total**                    | **20-23 days**    |

## Next Steps

1. Run `/speckit.tasks` to generate task breakdown
2. Start Phase 0 research (validate terminal API approach)
3. Create proof-of-concept for output capture
4. Proceed with Phase 1 implementation
