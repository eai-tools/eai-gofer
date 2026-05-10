---
date: 2026-02-13T00:00:00Z
researcher: Claude
feature: 'Context Window Accuracy'
status: complete
---

# Research: Context Window Accuracy

## Feature Summary

Replace the hardcoded percentage estimates in the Context Window sidebar panel
with accurate token counts computed by reading the actual files that Claude Code
loads into its context window. Currently, `contextWindowProvider.ts` uses fake
percentages (15%/10%/8%/40%/22%/5%) applied against the total token count — none
of these reflect reality. The fix requires reading Claude Code's auto memory,
agent files, command files, project rules, CLAUDE.md hierarchy, and computing
real token counts for each category.

## Codebase Analysis

### Where to Implement

| Component                | Location                                                    | Purpose                                                                                 |
| ------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| ContextWindowProvider    | `extension/src/contextWindowProvider.ts`                    | PRIMARY FIX — replace hardcoded `CONTEXT_CATEGORIES` percentages with real token counts |
| ClaudeCodeContextScanner | NEW: `extension/src/autonomous/ClaudeCodeContextScanner.ts` | Scans all files Claude Code loads and returns per-category token counts                 |
| ClaudeSessionReader      | `extension/src/autonomous/ClaudeSessionReader.ts`           | Existing path encoding (`encodeWorkspacePath`) and `getProjectDir()` to reuse           |
| ContextContentPanel      | `extension/src/ui/ContextContentPanel.ts`                   | Update detail views to show actual file contents per category                           |
| WorkspaceContextProvider | `extension/src/autonomous/WorkspaceContextProvider.ts`      | `estimateSystemFileTokens()` only reads 3 files — needs expansion                       |
| Hook bridge              | `.specify/scripts/hooks/post-tool-use.mjs`                  | Provides `totalContextTokens` from API — the ground truth denominator                   |

### What Claude Code Actually Loads Into Context

Based on research of the Claude Code CLI and local file inspection:

#### Always Loaded (Every Turn)

| Source              | Path Pattern                                               | Tokens (this project) | Notes                           |
| ------------------- | ---------------------------------------------------------- | --------------------- | ------------------------------- |
| System Prompt       | (invisible, baked in)                                      | ~3,200                | Cannot be measured from outside |
| Tool Schemas        | (invisible, baked in)                                      | ~11,600               | Cannot be measured from outside |
| CLAUDE.md (project) | `{workspace}/CLAUDE.md`                                    | ~7,970                | Always loaded                   |
| CLAUDE.md (user)    | `~/.claude/CLAUDE.md`                                      | varies                | If exists                       |
| CLAUDE.md (local)   | `{workspace}/.claude/CLAUDE.md`                            | varies                | If exists                       |
| Auto Memory         | `~/.claude/projects/{encoded}/memory/MEMORY.md`            | ~1,066                | First 200 lines                 |
| Auto Memory topics  | `~/.claude/projects/{encoded}/memory/*.md` (not MEMORY.md) | varies                | All topic files                 |
| Project rules       | `{workspace}/.claude/rules/*.md`                           | varies                | All files                       |
| User rules          | `~/.claude/rules/*.md`                                     | varies                | All files                       |

#### Loaded On Demand

| Source               | Path Pattern                        | Tokens (this project) | Notes                                |
| -------------------- | ----------------------------------- | --------------------- | ------------------------------------ |
| Agent files          | `{workspace}/.claude/agents/*.md`   | ~9,913 total          | Loaded when Task tool references one |
| Command/skill files  | `{workspace}/.claude/commands/*.md` | ~45,689 total         | Only the invoked one loads           |
| Conversation history | (in API messages)                   | varies                | Grows with session                   |
| Tool results         | (in API messages)                   | varies                | Grows with tool calls                |

### The Core Problem

In `contextWindowProvider.ts:29-36`:

```typescript
const CONTEXT_CATEGORIES = [
  {
    name: 'Spec Artifacts',
    icon: 'file-code',
    estimatePct: 0.15,
    expandable: false,
  },
  {
    name: 'Memories & Hints',
    icon: 'brain',
    estimatePct: 0.1,
    expandable: false,
  },
  { name: 'System Files', icon: 'gear', estimatePct: 0.08, expandable: false },
  {
    name: 'Conversation History',
    icon: 'comment-discussion',
    estimatePct: 0.4,
    expandable: true,
  },
  {
    name: 'Tool Outputs',
    icon: 'terminal',
    estimatePct: 0.22,
    expandable: false,
  },
  {
    name: 'Masked Observations',
    icon: 'eye-closed',
    estimatePct: 0.05,
    expandable: false,
  },
];
```

Then at line 191: `Math.round(totalContextTokens * cat.estimatePct)` — this is
pure fiction.

### Existing Patterns to Follow

#### Pattern 1: Token Estimation via Byte Count

Found in: `extension/src/ui/ContextContentPanel.ts:256` and throughout codebase

```typescript
const estTokens = Math.ceil(bytes / 4);
```

Why relevant: Consistent token estimation approach already established. Use
`Math.ceil(Buffer.byteLength(content, 'utf-8') / 4)` for accuracy.

#### Pattern 2: Path Encoding for ~/.claude/projects/

Found in: `extension/src/autonomous/ClaudeSessionReader.ts:101-106`

```typescript
encodeWorkspacePath(workspacePath: string): string {
  const normalized = workspacePath.replace(/\\/g, '/');
  return normalized.replace(/\//g, '-');
}

getProjectDir(): string {
  const encoded = this.encodeWorkspacePath(this.workspacePath);
  return path.join(os.homedir(), '.claude', 'projects', encoded);
}
```

Why relevant: Reuse this exact pattern to find auto memory and project-specific
Claude files.

#### Pattern 3: Filesystem Scanning with sumFileSizes()

Found in: `extension/src/autonomous/WorkspaceContextProvider.ts:396-416`

```typescript
private sumFileSizes(dirPath: string, extensions: string[]): number
```

Why relevant: Existing utility for recursively scanning directories. Can extend
to return per-file breakdowns.

#### Pattern 4: Bridge Data as Ground Truth

Found in: `extension/src/autonomous/HookBridgeWatcher.ts:23-50`

The `BridgeData.context.totalContextTokens` comes from the Anthropic API
response and represents the REAL total token count. The per-category breakdown
should sum to (approximately) this total, with "Conversation + Tool Results"
being the residual.

#### Pattern 5: Transcript Reading

Found in: `extension/src/ui/ContextContentPanel.ts:411-454`

```typescript
export function readTranscript(sessionId: string): TranscriptEntry[];
export function classifyTranscript(
  entries: TranscriptEntry[]
): ClassifiedTranscript;
```

Why relevant: Already reads `~/.claude/projects/` paths for transcript data.
Same access pattern needed for auto memory files.

### Integration Points

1. **ClaudeSessionReader.getProjectDir()** → Provides the
   `~/.claude/projects/{encoded}/` base path for auto memory and topic files
2. **BridgeData.context.totalContextTokens** → Ground truth total from API;
   per-category sums should approximate this
3. **ContextWindowProvider.getCategoryItems()** → Where fake percentages are
   applied; must be replaced with real scanner results
4. **ContextContentPanel.showCategory()** → Detail view that shows what's in
   each category; must reflect the real files
5. **MultiSessionBridgeWatcher** → Triggers tree refresh on bridge updates;
   scanner should run on each refresh

### Related Code

- `extension/src/contextWindowProvider.ts:190-191` — Fake token calc:
  `Math.round(totalTokens * cat.estimatePct)`
- `extension/src/autonomous/ClaudeSessionReader.ts:117-120` — Path encoding for
  `~/.claude/projects/`
- `extension/src/autonomous/WorkspaceContextProvider.ts:361-380` —
  `estimateSystemFileTokens()` only reads 3 files
- `extension/src/ui/ContextContentPanel.ts:285` — `renderSystemFiles()` only
  reads CLAUDE.md, AGENTS.md
- `extension/src/ui/ContextContentPanel.ts:411-454` — `readTranscript()` reads
  session JSONL

## Technology Decisions

### Decision 1: Categories to Display

- **Choice**: Restructure categories to reflect what Claude Code actually loads:
  1. **CLAUDE.md & Rules** — project CLAUDE.md + user CLAUDE.md + local
     CLAUDE.md + all rules files
  2. **Auto Memory** — MEMORY.md (first 200 lines) + topic files
  3. **Agents & Commands** — agent files + any currently-loaded command
  4. **Conversation History** (expandable) — user prompts, assistant responses,
     tool calls, system
  5. **System Overhead** — invisible system prompt + tool schemas (fixed
     estimate: ~14,800 tokens)
  6. **Spec Artifacts** — constitution.md + .specify files loaded via Gofer
- **Rationale**: These map to what Claude Code actually puts in the API messages
  array. The old categories ("Memories & Hints", "Tool Outputs", "Masked
  Observations") don't correspond to real context content.
- **Alternatives considered**: Keeping the old 6 categories and just fixing the
  percentages — rejected because the categories themselves are wrong.

### Decision 2: Token Counting Method

- **Choice**: Read actual files from disk, compute `Math.ceil(bytes / 4)` for
  each
- **Rationale**: Consistent with existing codebase pattern. Accurate enough
  (within ~10% of tiktoken). Avoids adding a tokenizer dependency.
- **Alternatives considered**: Using tiktoken npm package for exact counts —
  rejected due to package size and complexity for marginal accuracy gain.

### Decision 3: Conversation History as Residual

- **Choice**: Calculate "Conversation History" tokens = `totalContextTokens`
  (from API) minus sum of all file-based categories
- **Rationale**: We can measure file-based content exactly, but conversation
  history grows dynamically and is only known to the API. Using the residual
  ensures our breakdown sums to 100% of the real total.
- **Alternatives considered**: Reading full transcript JSONL and summing content
  sizes — this is the SENT content, not what's in context after compaction. The
  residual approach is more accurate.

### Decision 4: Caching and Performance

- **Choice**: Cache scanner results for 30 seconds; invalidate on bridge updates
- **Rationale**: Scanning ~20 files on every tree refresh would add latency.
  File content changes rarely within a session. Bridge updates (every tool call)
  trigger refresh, so 30s cache ensures fresh-enough data.
- **Alternatives considered**: No caching (too slow), 5-minute cache (too
  stale).

## Constraints & Considerations

- **System prompt and tool schemas are invisible**: We cannot measure these from
  outside Claude Code. Use a fixed estimate of ~14,800 tokens (3,200 system +
  11,600 tools) based on research. This is a known approximation.
- **Auto memory truncation**: MEMORY.md is truncated to first 200 lines. The
  scanner must respect this by only counting bytes of the first 200 lines.
- **Command/skill files load on demand**: Only the currently invoked command is
  in context. We can't know which one without transcript analysis. Show all
  agent files (always loaded) but note commands are on-demand.
- **Compaction changes history**: After `/compact`, conversation history is
  replaced with a summary. The residual calculation handles this naturally since
  `totalContextTokens` reflects post-compaction state.
- **Privacy**: Already established in ClaudeSessionReader — only read file
  sizes/content for non-sensitive paths. Auto memory MEMORY.md is the user's own
  data in their home directory.

## Recommendations

1. Create a `ClaudeCodeContextScanner` class that returns a structured breakdown
   of all measurable context content
2. Replace `CONTEXT_CATEGORIES` hardcoded percentages with real scanner output
3. Use residual calculation for Conversation History (totalContextTokens -
   measured categories)
4. Cache scanner results with 30s TTL, invalidated on bridge updates
5. Update `ContextContentPanel` to show actual file contents for each new
   category
6. Keep `estimateSystemOverhead()` as a documented constant (~14,800 tokens)
   with inline explanation
