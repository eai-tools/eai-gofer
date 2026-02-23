---
date: '2026-02-12T09:30:00Z'
researcher: Claude
feature: 'YOLO Slop Reduction Mode'
status: complete
---

# Research: YOLO Slop Reduction Mode

## Feature Summary

A VSCode setting that enables automatic code quality cleanup during development.
When enabled, the system auto-detects and auto-fixes common "slop" patterns
(console.log in production code, `as any` casts, TODOs without issue refs,
debugger statements, etc.), keeps a JSONL log of all changes made with reasons,
and shows a notification every N fixes (configurable, default 10).

## Codebase Analysis

### Where to Implement

| Component             | Location                                   | Purpose                                                           |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| SlopDetector (exists) | `extension/src/autonomous/SlopDetector.ts` | Detection-only slop scanning — needs auto-fix extension           |
| SlopReducer (new)     | `extension/src/autonomous/SlopReducer.ts`  | Auto-fix engine that applies safe transformations                 |
| Config additions      | `extension/src/config.ts`                  | New CONFIG_KEYS and DEFAULTS for slop reduction settings          |
| Settings declaration  | `extension/package.json`                   | `gofer.yoloSlopReduction.*` settings in contributes.configuration |
| Extension integration | `extension/src/extension.ts`               | Wire SlopReducer into file-save watcher and hook bridge           |
| JSONL logger          | Inline in SlopReducer                      | Append-only log at `.specify/logs/slop-reduction.jsonl`           |

### Existing Patterns to Follow

#### Pattern 1: SlopDetector (Detection Engine)

Found in: `extension/src/autonomous/SlopDetector.ts:40-83`

```typescript
const SLOP_PATTERNS: SlopPattern[] = [
  {
    regex: /\bconsole\.log\b/,
    severity: 'info',
    name: 'console-log',
    message: '...',
  },
  {
    regex: /\bas\s+any\b/,
    severity: 'warning',
    name: 'as-any',
    message: '...',
  },
  {
    regex: /\bTODO\b(?!.*(?:#\d+|[A-Z]+-\d+))/,
    severity: 'warning',
    name: 'todo-no-issue',
    message: '...',
  },
  // 7 patterns total
];
```

Why relevant: SlopReducer will extend this with `fix` functions per pattern. The
existing `SlopMatch` interface provides the detection data needed to apply
fixes.

#### Pattern 2: ConfigManager Singleton

Found in: `extension/src/config.ts:103-154`

```typescript
export class ConfigManager {
  private static instance: ConfigManager;
  private config: vscode.WorkspaceConfiguration;
  public static getInstance(): ConfigManager { ... }
  public refresh(): void { this.config = vscode.workspace.getConfiguration('gofer'); }
  public getClaudeCodeMode(): 'standard' | 'yolo' | 'custom' { ... }
}
```

Why relevant: Add `getSlopReductionEnabled()` and
`getSlopReductionNotifyEvery()` methods following this exact pattern.

#### Pattern 3: JSONL Logging

Found in: `extension/src/extension.ts:1821-1837`

```typescript
const logDir = path.join(workspacePath, '.specify', 'logs');
const logPath = path.join(logDir, 'slop-scan.jsonl');
require('fs').mkdirSync(logDir, { recursive: true });
const entry = { timestamp: new Date().toISOString(), filesScanned: ..., totalIssues: ... };
require('fs').appendFileSync(logPath, JSON.stringify(entry) + '\n');
```

Why relevant: Exact same pattern for `slop-reduction.jsonl`. Each entry logs:
timestamp, file, pattern, line, original snippet, replacement, reason.

#### Pattern 4: Settings Declaration in package.json

Found in: `extension/package.json` under `contributes.configuration.properties`

```json
"gofer.claudeCodeMode": {
  "type": "string",
  "default": "standard",
  "enum": ["standard", "yolo", "custom"],
  "description": "..."
}
```

Why relevant: New settings follow this exact format. Need
`gofer.yoloSlopReduction.enabled` (boolean) and
`gofer.yoloSlopReduction.notifyEvery` (number).

#### Pattern 5: File Save Watcher

Found in: `extension/src/extension.ts` (multiple places)

```typescript
vscode.workspace.onDidSaveTextDocument((doc) => { ... });
```

Why relevant: The primary trigger for auto-fix — when a file is saved, run
SlopReducer on it.

#### Pattern 6: Notification Throttling

Found in: `extension/src/autonomous/AutoHandoffTrigger.ts`

```typescript
private lastNotificationTime = 0;
if (Date.now() - this.lastNotificationTime < this.cooldownMs) return;
```

Why relevant: Notification batching — show notification every N fixes, not on
every fix.

### Integration Points

1. **SlopDetector → SlopReducer**: SlopReducer calls `scanFile()` to get
   `SlopMatch[]`, then applies fix functions for each match. Detection stays
   separate from fixing.
2. **ConfigManager**: Add two new getters for the YOLO slop reduction settings.
3. **extension.ts activation**: Create SlopReducer instance, wire to
   `onDidSaveTextDocument` when enabled.
4. **package.json contributes**: Declare settings so they appear in VSCode
   Settings UI.
5. **Existing slop-scan.jsonl**: Keep separate from slop-reduction.jsonl —
   detection log vs. fix log.

### Related Code

- `extension/src/autonomous/SlopDetector.ts` - Detection engine (extend, don't
  replace)
- `extension/src/config.ts:64-88` - CONFIG_KEYS and DEFAULTS
- `extension/src/extension.ts:1790-1870` - Existing slop integration
  (diagnostics + logging)
- `extension/src/extension.ts:1840-1870` - Hook bridge auto-trigger on task
  completion
- `extension/src/utils/logger.ts` - Logger utility for SlopReducer's own logging
- `extension/package.json:421+` - Settings declaration

## Technology Decisions

### Decision 1: Separate SlopReducer class vs. extending SlopDetector

- **Choice**: New `SlopReducer` class that uses `SlopDetector` for detection
- **Rationale**: SlopDetector is detection-only by design (its docstring says
  "does NOT modify files"). Adding mutation to it violates SRP. SlopReducer
  composes with SlopDetector.
- **Alternatives considered**: Adding `fix()` methods directly to SlopDetector —
  rejected because it would conflate detection (safe, read-only) with mutation
  (risky, writes files).

### Decision 2: Fix strategy per pattern

- **Choice**: Pattern registry with optional `fix` function — patterns without a
  `fix` are detection-only
- **Rationale**: Not all slop patterns have safe auto-fixes. `console.log` →
  remove line is safe. `as any` → `unknown` might break compilation. Start with
  safe fixes, make extensible.
- **Alternatives considered**: Fix all patterns — rejected because some fixes
  require context (e.g., `as any` → correct type requires type inference).

### Decision 3: Trigger mechanism

- **Choice**: `onDidSaveTextDocument` event + existing hook bridge
- **Rationale**: File save is the natural trigger. Hook bridge provides
  integration with Gofer pipeline stages. Both triggers serve different use
  cases (interactive editing vs. automated pipeline).
- **Alternatives considered**: File watcher polling — rejected (wasteful).
  Pre-commit hook — rejected (outside VSCode extension scope).

### Decision 4: Safe fix patterns (initial set)

| Pattern              | Auto-Fix                           | Safety                                   |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| `console.log`        | Remove entire line                 | Safe — leftover debug output             |
| `debugger`           | Remove entire line                 | Safe — must not ship                     |
| `// @ts-ignore`      | Replace with `// @ts-expect-error` | Safe — same suppression, better practice |
| `TODO` without issue | Add `// TODO(no-ref):` prefix      | Safe — marks for triage                  |
| `as any`             | **No auto-fix**                    | Unsafe — needs type context              |
| Empty catch          | **No auto-fix**                    | Unsafe — might need error handling       |
| Disabled test        | **No auto-fix**                    | Unsafe — intentional skip                |

## Constraints & Considerations

- **File write safety**: Must not corrupt files. Read → transform → write
  atomically. Skip binary files. Only operate on `.ts/.tsx/.js/.jsx`.
- **Performance**: File save handler must be fast (<50ms). SlopReducer operates
  on single files, not directories.
- **Undo support**: VSCode tracks file changes in undo stack. Since we write to
  disk after save, the user can revert via git. JSONL log provides audit trail.
- **Test files**: Should NOT auto-fix test files — `console.log` in tests is
  intentional. Filter by path: skip `**/tests/**`, `**/*.test.ts`,
  `**/*.spec.ts`.
- **Race conditions**: `onDidSaveTextDocument` fires after save. If we modify
  the file, it triggers another save event. Use a guard flag to prevent infinite
  loops.

## Brownfield Analysis

### Constraints & Limitations

| Constraint Type         | Description                                   | Impact on Implementation        |
| ----------------------- | --------------------------------------------- | ------------------------------- |
| Existing SlopDetector   | Detection-only, sync I/O (`readFileSync`)     | Must compose with, not modify   |
| ConfigManager singleton | All settings go through `gofer.*` namespace   | Follow existing key pattern     |
| Extension activation    | Settings must be available at activation time | Register in `activate()`        |
| JSONL logging pattern   | Append-only, lazy directory creation          | Reuse pattern from extension.ts |

### Downstream Dependencies

- `extension/src/extension.ts:1860` — calls `slopDetector.scanDirectory()` —
  unchanged
- Existing diagnostics integration — unchanged, still shows detection results
- Hook bridge watcher — can optionally trigger SlopReducer after detection

## Open Questions

- [x] Should auto-fix run on ALL workspace files or only the saved file? →
      **Only the saved file** (performance + safety)
- [x] Should `as any` have an auto-fix? → **No** — too risky without type
      context
- [ ] Should there be a `gofer.yoloSlopReduction.patterns` setting to
      enable/disable specific pattern fixes?
- [ ] Should there be a "dry run" mode that shows what would be fixed without
      fixing?

## Recommendations

1. **Start with 3 safe auto-fix patterns** (console.log, debugger, @ts-ignore)
   and make the system extensible for more
2. **Compose with existing SlopDetector** — don't duplicate detection logic
3. **Use file-save trigger** as primary, hook bridge as secondary
4. **Log every fix to JSONL** with before/after snippets for full audit trail
5. **Batch notifications** — show info message every N fixes (default 10) with
   cumulative count
6. **Skip test files** — auto-fix should only target production code
