---
feature: Context Window Accuracy
spec: spec.md
research: research.md
status: ready
created: 2026-02-13
---

# Implementation Plan: Context Window Accuracy

## Technical Context

### Tech Stack

- **Language**: TypeScript 5.7.2
- **Framework**: VSCode Extension API
- **Testing**: Vitest
- **Build**: Webpack (existing)

### Architecture

```
BridgeData (totalContextTokens from API)
    │
    ▼
ContextWindowProvider (tree view)
    │
    ├── ClaudeCodeContextScanner (NEW) ──► reads files on disk
    │       ├── CLAUDE.md hierarchy
    │       ├── Auto Memory (~/.claude/projects/{encoded}/memory/)
    │       ├── Agent files (.claude/agents/)
    │       ├── Rules files (.claude/rules/, ~/.claude/rules/)
    │       ├── Spec artifacts (.specify/)
    │       └── System overhead (fixed estimate)
    │
    └── Conversation History = totalContextTokens - sum(file categories)
            │
            └── readTranscript() / classifyTranscript() (existing)
```

### Integration Points

| Component                | File                                                   | Integration Type                      |
| ------------------------ | ------------------------------------------------------ | ------------------------------------- |
| ContextWindowProvider    | `extension/src/contextWindowProvider.ts`               | MODIFY — replace hardcoded categories |
| ClaudeCodeContextScanner | `extension/src/autonomous/ClaudeCodeContextScanner.ts` | NEW — file scanner                    |
| ClaudeSessionReader      | `extension/src/autonomous/ClaudeSessionReader.ts`      | REUSE — path encoding                 |
| ContextContentPanel      | `extension/src/ui/ContextContentPanel.ts`              | MODIFY — new render methods           |
| extension.ts             | `extension/src/extension.ts`                           | MODIFY — instantiate scanner          |

### Key Dependencies

- `ClaudeSessionReader.encodeWorkspacePath()` / `getProjectDir()` for
  `~/.claude/projects/` lookup
- `BridgeData.context.totalContextTokens` as ground truth denominator
- `readTranscript()` / `classifyTranscript()` for conversation subcategories

## Implementation Phases

### Phase 1: ClaudeCodeContextScanner

**Goal**: Create the scanner that reads all files Claude Code loads and returns
per-category token counts

**Files**:

- NEW: `extension/src/autonomous/ClaudeCodeContextScanner.ts`
- NEW: `tests/unit/autonomous/ClaudeCodeContextScanner.test.ts`

**Tasks**:

- [ ] T001 [Setup] Define `ScanResult` interface with per-category token counts
      and per-file breakdowns
- [ ] T002 [Core] Implement `scanClaudeMdAndRules()` — reads workspace
      CLAUDE.md, user CLAUDE.md, local CLAUDE.md, project rules, user rules
- [ ] T003 [Core] Implement `scanAutoMemory()` — reads MEMORY.md (first 200
      lines), topic files from `~/.claude/projects/{encoded}/memory/`
- [ ] T004 [Core] Implement `scanAgentsAndCommands()` — reads all
      `.claude/agents/*.md` files
- [ ] T005 [Core] Implement `scanSpecArtifacts()` — reads constitution.md and
      other Gofer-loaded files
- [ ] T006 [Core] Implement `getSystemOverhead()` — returns fixed estimate
      (~14,800 tokens) with breakdown
- [ ] T007 [Core] Implement `scan()` orchestrator method — calls all scan
      methods, returns aggregated `ScanResult`
- [ ] T008 [Core] Add 30-second caching with `invalidate()` method
- [ ] T009 [Test] Unit tests for scanner with mock filesystem (temp dirs with
      known file sizes)

**Verification**:

- Scanner returns correct token counts for known file sizes
- Missing files/directories return 0 tokens without errors
- Cache returns same result within 30s, fresh result after invalidation

### Phase 2: Replace Hardcoded Categories in ContextWindowProvider

**Goal**: Remove fake `CONTEXT_CATEGORIES` percentages, use real scanner output

**Files**:

- MODIFY: `extension/src/contextWindowProvider.ts`
- MODIFY: `tests/unit/contextWindowProvider.test.ts`

**Tasks**:

- [ ] T010 [Core] Remove `CONTEXT_CATEGORIES` const array with `estimatePct`
      fields
- [ ] T011 [Core] Add `setScanner(scanner: ClaudeCodeContextScanner)` method to
      ContextWindowProvider
- [ ] T012 [Core] Rewrite `getCategoryItems()` to use scanner results: build
      categories from `ScanResult` with real token counts
- [ ] T013 [Core] Calculate Conversation History as residual:
      `totalContextTokens - sum(fileBased categories)`
- [ ] T014 [Core] Update tree item descriptions: show `~{N}k tokens` (real
      count) instead of `~{N}k tokens (est.)`
- [ ] T015 [Test] Update existing contextWindowProvider tests to work with
      scanner

**Verification**:

- Tree shows new categories: CLAUDE.md & Rules, Auto Memory, Agents & Commands,
  Conversation History, System Overhead, Spec Artifacts
- Token counts match actual file sizes
- Sum of all categories approximates totalContextTokens

### Phase 3: Update ContextContentPanel Detail Views

**Goal**: Show actual file contents when clicking each new category

**Files**:

- MODIFY: `extension/src/ui/ContextContentPanel.ts`
- MODIFY: `tests/unit/contextContentPanel.test.ts`

**Tasks**:

- [ ] T016 [Core] Add `renderClaudeMdAndRules()` — shows each CLAUDE.md and
      rules file with path, size, token count, content preview
- [ ] T017 [Core] Add `renderAutoMemory()` — shows MEMORY.md (first 200 lines)
      and topic files with per-file token counts
- [ ] T018 [Core] Add `renderAgentsAndCommands()` — shows all agent files with
      per-file token counts
- [ ] T019 [Core] Add `renderSystemOverhead()` — shows fixed estimate with
      explanation of what's invisible
- [ ] T020 [Core] Update `renderCategory()` switch statement to dispatch to new
      methods; remove old methods for defunct categories
- [ ] T021 [Test] Update ContextContentPanel tests for new categories

**Verification**:

- Clicking each category shows the correct files
- Per-file token counts match actual file sizes / 4
- System Overhead shows the explanation text

### Phase 4: Wiring & Integration

**Goal**: Wire scanner to provider and ensure end-to-end data flow

**Files**:

- MODIFY: `extension/src/extension.ts`
- MODIFY: `extension/src/contextWindowProvider.ts`

**Tasks**:

- [ ] T022 [Integration] Instantiate `ClaudeCodeContextScanner` in
      `extension.ts` (alongside ContextWindowProvider creation)
- [ ] T023 [Integration] Call `contextWindowProvider.setScanner(scanner)` during
      activation
- [ ] T024 [Integration] Invalidate scanner cache on bridge watcher
      `session-update` events
- [ ] T025 [Integration] Pass scanner to ContextContentPanel for detail view
      rendering (optional: or let panel call scanner directly)
- [ ] T026 [Test] Integration test: mock filesystem → scanner → provider →
      correct tree items

**Verification**:

- End-to-end: bridge update → cache invalidation → tree refresh → correct token
  counts
- Scanner instantiated once, shared between provider and panel

## File Structure

```
extension/src/
├── autonomous/
│   ├── ClaudeCodeContextScanner.ts    # NEW — file scanner
│   ├── ClaudeSessionReader.ts         # REUSE — path encoding
│   └── WorkspaceContextProvider.ts    # UNCHANGED
├── ui/
│   └── ContextContentPanel.ts         # MODIFY — new render methods
├── contextWindowProvider.ts           # MODIFY — replace hardcoded categories
└── extension.ts                       # MODIFY — wire scanner

tests/unit/
├── autonomous/
│   └── ClaudeCodeContextScanner.test.ts   # NEW
├── contextWindowProvider.test.ts          # MODIFY
└── contextContentPanel.test.ts            # MODIFY
```

## Risk Assessment

| Risk                                                       | Impact | Mitigation                                                                       |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Auto memory path encoding differs from ClaudeSessionReader | High   | Reuse existing `encodeWorkspacePath()` directly                                  |
| MEMORY.md 200-line truncation logic is wrong               | Medium | Read Claude Code docs; if wrong, token count will be slightly off but not broken |
| System overhead estimate (14,800 tokens) is too far off    | Low    | Document as approximation; can be tuned later based on user feedback             |
| Scanner slows tree refresh                                 | Medium | 30-second cache ensures <10ms for cached results                                 |
| Files missing on user's machine                            | Low    | All scan methods return 0 for missing paths — graceful degradation               |

## Spec Traceability

### User Story Coverage

| Story                            | Status  | Plan References                                                     |
| -------------------------------- | ------- | ------------------------------------------------------------------- |
| US1 (P1): Accurate Breakdown     | COVERED | Phase 1 (scanner), Phase 2 (replace categories), Phase 4 (wiring)   |
| US2 (P1): File Detail Views      | COVERED | Phase 3 (new render methods)                                        |
| US3 (P2): Conversation Breakdown | COVERED | Phase 2 (residual calc), existing readTranscript/classifyTranscript |

### Requirement Coverage

| Requirement                       | Status  | Plan Reference               |
| --------------------------------- | ------- | ---------------------------- |
| FR1: Context Scanner              | COVERED | Phase 1: T001-T009           |
| FR2: Replace Hardcoded Categories | COVERED | Phase 2: T010-T015           |
| FR3: Residual Conversation        | COVERED | Phase 2: T013                |
| FR4: Scanner Caching              | COVERED | Phase 1: T008, Phase 4: T024 |
| FR5: Updated Detail Views         | COVERED | Phase 3: T016-T021           |

Coverage: 100% of user stories, 100% of functional requirements
