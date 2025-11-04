---
id: '008-memory-learning-system'
title: 'Memory and Learning System'
status: 'draft'
created: '2025-10-31'
updated: '2025-11-05'
priority: 'high'
assignee: 'engineer-agent'
---

# Feature Specification: Memory and Learning System

**Feature Branch**: `001-memory-learning-system` **Created**: 2025-10-31
**Status**: Draft **Input**: User description: "Implement Memory and Learning
System for SpecGofer based on Goose analysis. Include: 1) Memory Extension with
local/global storage, user commands (remember/forget/search), auto-suggestions,
and pattern detection. 2) Enhanced Hints Hierarchy replacing single
constitution.md with hierarchical .specify/hints/ structure. 3) Spec Dependency
Graph tracking relationships and impact analysis. 4) Auto-Compaction for context
window management at 80% threshold. Enable SpecGofer to learn from interactions,
remember user preferences, understand spec dependencies, and handle large specs
gracefully."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Persistent Memory Across Sessions (Priority: P1)

As a developer using SpecGofer, I want the system to remember my project
preferences and coding standards across sessions so I don't have to repeatedly
explain the same information every time I work on a feature.

**Why this priority**: This is the foundation of the learning system and
delivers immediate value by eliminating repetitive explanations. It provides the
most dramatic improvement to user experience with minimal dependencies on other
features.

**Independent Test**: Can be fully tested by teaching SpecGofer a preference
(e.g., "Remember that we use Vitest for all tests"), closing VSCode, reopening,
and verifying that SpecGofer applies this preference in a new autonomous
execution without being reminded.

**Acceptance Scenarios**:

1. **Given** I'm working on a project, **When** I tell SpecGofer "Remember that
   our API errors use format { error: { code, message } }", **Then** SpecGofer
   saves this to local project memory
2. **Given** I've saved a project-specific memory, **When** I start a new spec
   that involves API development, **Then** SpecGofer automatically applies the
   remembered error format without prompting
3. **Given** I want a preference applied across all projects, **When** I tell
   SpecGofer "Remember globally that I prefer Vitest over Jest", **Then**
   SpecGofer saves this to global memory
4. **Given** I've saved a global preference, **When** I work on any project
   requiring test setup, **Then** SpecGofer uses Vitest by default
5. **Given** I need to find what SpecGofer remembers, **When** I run command
   "SpecGofer: Search Memory" with query "API", **Then** all memories related to
   APIs are displayed
6. **Given** a remembered preference is outdated, **When** I tell SpecGofer
   "Forget about Vitest preference", **Then** the specific memory is removed and
   no longer applied
7. **Given** SpecGofer detects I've explained the same pattern 3 times, **When**
   the pattern is detected, **Then** SpecGofer suggests "Would you like me to
   remember this?"

---

### User Story 2 - Hierarchical Context Hints (Priority: P2)

As a developer, I want to provide directory-specific coding standards and
patterns so that SpecGofer applies appropriate context based on which part of
the codebase it's working on.

**Why this priority**: Builds on the memory foundation (P1) but provides more
sophisticated, structured context management. This is valuable for larger
codebases where different modules have different standards, but it's not
required for basic learning functionality.

**Independent Test**: Can be tested by creating
`.specify/hints/api/rest-conventions.md` with API-specific guidelines, then
running autonomous execution on an API-related spec. Verify that SpecGofer
follows the API conventions without them being mentioned in the spec itself.

**Acceptance Scenarios**:

1. **Given** I create `.specify/hints/global.md` with my coding standards,
   **When** SpecGofer executes any task, **Then** the global hints are
   automatically included in context
2. **Given** I create `.specify/hints/api/conventions.md` with REST API
   patterns, **When** SpecGofer works on files in the `src/api/` directory,
   **Then** both global and API-specific hints are included
3. **Given** I have hints at multiple levels (global, directory, subdirectory),
   **When** SpecGofer builds context for a task, **Then** all applicable hints
   are merged in hierarchical order (global → project → directory →
   subdirectory)
4. **Given** a spec declares required hints in frontmatter
   (`hints: [api-design, testing]`), **When** autonomous execution begins,
   **Then** SpecGofer loads and applies the specified hint files
5. **Given** hints conflict (global says one thing, directory says another),
   **When** context is built, **Then** more specific hints (directory-level)
   take precedence over general hints (global)

---

### User Story 3 - Spec Dependency Tracking (Priority: P3)

As a developer managing multiple related specs, I want SpecGofer to understand
dependencies between specs so it can warn me about impact when I modify one spec
and intelligently order execution when specs depend on each other.

**Why this priority**: This is valuable for complex projects with many
interdependent features, but it's not essential for single-spec workflows or
independent features. It builds on the memory foundation but adds relationship
intelligence.

**Independent Test**: Can be tested by creating two specs where spec-002 depends
on spec-001, modifying spec-001, and verifying that SpecGofer warns "This change
may impact spec-002 (user-profile)" before proceeding.

**Acceptance Scenarios**:

1. **Given** I create spec-002 that depends on APIs from spec-001, **When** I
   declare `depends_on: [001-authentication]` in spec-002 frontmatter, **Then**
   SpecGofer records the dependency relationship
2. **Given** spec-002 depends on spec-001, **When** I view the spec tree in
   VSCode, **Then** spec-002 shows a dependency indicator and is visually linked
   to spec-001
3. **Given** spec-002 depends on incomplete spec-001, **When** I try to start
   autonomous execution of spec-002, **Then** SpecGofer warns "spec-001 must be
   completed first" and offers to run spec-001
4. **Given** I'm modifying spec-001 that has dependents, **When** I save changes
   to spec-001, **Then** SpecGofer displays "This change may impact: spec-002,
   spec-003" notification
5. **Given** spec-003 depends on spec-002 which depends on spec-001, **When** I
   request impact analysis, **Then** SpecGofer shows the full dependency chain
   and affected files
6. **Given** I have multiple specs with dependencies, **When** I request
   "execute all pending specs", **Then** SpecGofer automatically orders
   execution based on dependency graph (spec-001 → spec-002 → spec-003)

---

### User Story 4 - Automatic Context Compaction (Priority: P4)

As a developer working on large specs with 100+ tasks, I want SpecGofer to
automatically manage context window limits by summarizing completed work so I
can execute massive specs without manual intervention or hitting token limits.

**Why this priority**: This solves a specific problem (very large specs) that
most users won't encounter initially. It's valuable for power users and
enterprise scenarios but not essential for typical 20-50 task specs. Depends on
the basic memory system being in place.

**Independent Test**: Can be tested by creating a spec with 100+ tasks,
monitoring context usage during autonomous execution, and verifying that when
usage reaches 80%, SpecGofer automatically compacts by summarizing completed
tasks while preserving recent context.

**Acceptance Scenarios**:

1. **Given** autonomous execution is running, **When** context window usage
   reaches 80%, **Then** SpecGofer automatically triggers compaction
2. **Given** compaction is triggered, **When** summarizing completed tasks,
   **Then** the last 10 tasks remain in full detail while older tasks are
   summarized
3. **Given** context has been compacted, **When** compaction completes, **Then**
   context usage drops to approximately 40% and execution continues seamlessly
4. **Given** compaction occurs, **When** the user views session history,
   **Then** a notification appears: "Context compacted: 42 tasks summarized,
   last 10 tasks in full detail"
5. **Given** I want to review what was compacted, **When** I click "View
   Summary", **Then** a readable summary of completed work is displayed with key
   decisions and outcomes
6. **Given** I want to customize compaction behavior, **When** I configure
   `specGofer.autonomous.compactionThreshold`, **Then** compaction triggers at
   my specified percentage (default 80%)
7. **Given** a critical task fails after compaction, **When** error recovery
   needs context, **Then** SpecGofer can retrieve detailed context from session
   state even if compacted from LLM context

---

### Edge Cases

- What happens when a memory conflicts with explicit instructions in a spec
  (e.g., memory says "use Jest" but spec says "use Vitest")? → Spec instructions
  take precedence, memory is treated as default preference
- What happens when local and global memories conflict? → Local
  (project-specific) memory takes precedence over global
- What happens when a user tries to create circular dependencies in the spec
  graph (spec-A depends on spec-B which depends on spec-A)? → System detects
  circular dependency and displays error: "Circular dependency detected: spec-A
  → spec-B → spec-A"
- What happens when hint files have malformed YAML frontmatter or markdown
  syntax errors? → System logs warning, skips malformed hint file, continues
  with other valid hints
- What happens when context window fills up faster than expected (before 80%
  threshold reached, but compaction needed)? → System triggers emergency
  compaction at 90% and notifies user of unusual context growth
- What happens when a dependency spec is deleted but other specs still reference
  it? → System shows warning in dependent spec: "Missing dependency:
  spec-001-authentication (deleted)"
- What happens when auto-compaction fails (e.g., summarization LLM call fails)?
  → System falls back to truncation strategy: removes oldest messages, preserves
  last 20, notifies user
- What happens when memory storage files become corrupted or too large? → System
  creates backup, attempts recovery, notifies user if recovery fails, allows
  continuing with empty memory
- What happens when hints from different levels give contradictory guidance? →
  More specific (directory-level) takes precedence over general (global), with
  precedence order: spec frontmatter > directory > project > global
- What happens when impact analysis reveals 50+ dependent specs? → UI shows
  summary "50+ specs affected" with expandable list, prioritizes direct
  dependencies in notification

## Requirements _(mandatory)_

### Functional Requirements

#### Memory Extension

- **FR-001**: System MUST store memories in two scopes: local (project-specific
  at `.specify/memory/local.json`) and global (user-wide in VSCode global state)
- **FR-002**: System MUST provide user commands: "SpecGofer: Remember [info]",
  "SpecGofer: Search Memory [query]", "SpecGofer: Forget [info]", "SpecGofer:
  Clear Memory"
- **FR-003**: Each memory MUST include: unique ID, category, tags, scope
  (local/global), content, creation timestamp, last used timestamp, usage count
- **FR-004**: System MUST automatically load all relevant memories at the start
  of each autonomous execution session
- **FR-005**: System MUST inject loaded memories into LLM context before each
  task execution
- **FR-006**: System MUST detect patterns when user explains the same concept 3+
  times and suggest saving to memory
- **FR-007**: Search functionality MUST support queries by: content keywords,
  category, tags, date range, scope
- **FR-008**: System MUST allow users to view all memories in a searchable UI
  panel
- **FR-009**: Memories MUST persist across VSCode restarts and remain available
  indefinitely unless explicitly deleted
- **FR-010**: System MUST track memory usage statistics: times used, last used
  date, associated specs

#### Enhanced Hints Hierarchy

- **FR-011**: System MUST support hierarchical hint files at: global
  (`.specify/hints/global.md`), project root (`.specify/hints/`), and
  directory-specific levels
- **FR-012**: System MUST automatically discover and load hint files based on
  task's affected files
- **FR-013**: Spec frontmatter MUST support declaring required hints via
  `hints: [hint-name-1, hint-name-2]` field
- **FR-014**: System MUST merge hints in hierarchical order: global → project →
  directory → spec-declared
- **FR-015**: More specific hints MUST take precedence when conflicts occur
  (directory > project > global)
- **FR-016**: System MUST validate hint file markdown syntax and log warnings
  for malformed files without blocking execution
- **FR-017**: Hint files MUST support standard markdown with optional YAML
  frontmatter for metadata
- **FR-018**: System MUST provide command "SpecGofer: Create Hint File" to
  generate hint template at specified location

#### Spec Dependency Graph

- **FR-019**: Spec frontmatter MUST support `depends_on: [spec-id-1, spec-id-2]`
  field to declare dependencies
- **FR-020**: System MUST store dependency relationships in graph structure
  (nodes = specs, edges = dependencies)
- **FR-021**: System MUST detect circular dependencies and prevent their
  creation with error message
- **FR-022**: System MUST provide impact analysis: given a spec ID, return all
  specs that depend on it (direct and transitive)
- **FR-023**: VSCode tree view MUST display dependency indicators next to specs
  (e.g., "→ depends on: spec-001, spec-002")
- **FR-024**: When modifying a spec with dependents, system MUST show
  notification: "This change may impact: [list of dependent specs]"
- **FR-025**: When executing multiple specs, system MUST order execution based
  on dependency graph (dependencies first)
- **FR-026**: System MUST handle missing dependencies gracefully: warn user,
  offer to execute dependency first, or allow skipping
- **FR-027**: Dependency graph MUST be queryable: get dependencies of spec, get
  dependents of spec, find all specs in dependency chain
- **FR-028**: System MUST persist dependency graph to
  `.specify/memory/dependency-graph.json`

#### Auto-Compaction

- **FR-029**: System MUST monitor context window usage during autonomous
  execution
- **FR-030**: System MUST trigger automatic compaction when context usage
  reaches configured threshold (default 80%)
- **FR-031**: Compaction MUST preserve: last 10 tasks in full detail, current
  active task, all memories, critical error context
- **FR-032**: Compaction MUST summarize: completed tasks (>10 tasks ago),
  exploratory conversations, redundant explanations
- **FR-033**: Summary generation MUST use cost-optimized LLM (fallback model if
  configured) to minimize compaction cost
- **FR-034**: System MUST notify user when compaction occurs: "Context
  compacted: [X] tasks summarized, usage: 85% → 40%"
- **FR-035**: Compacted session state MUST remain accessible for error recovery
  even after LLM context compaction
- **FR-036**: Users MUST be able to view detailed compaction summary via "View
  Summary" button in notification
- **FR-037**: Configuration setting `specGofer.autonomous.compactionThreshold`
  MUST control when compaction triggers (range: 50-95%, default: 80%)
- **FR-038**: If compaction fails, system MUST fall back to truncation: remove
  oldest messages, preserve last 20 messages, notify user

### Key Entities

- **Memory**: Represents a learned piece of information. Attributes: id,
  category (string), tags (array), scope (local|global), content (string),
  created (timestamp), lastUsed (timestamp), usedCount (integer), learnedFrom
  (spec-id or "user_interaction")

- **Hint File**: Represents a context injection file. Attributes: path (file
  path), scope (global|project|directory), priority (integer for conflict
  resolution), content (markdown), metadata (optional YAML frontmatter)

- **Spec Dependency**: Represents a relationship between two specs. Attributes:
  fromSpecId (string), toSpecId (string), dependencyType
  (required_by|uses_api_from|blocks), declared (boolean - explicit in
  frontmatter or inferred), metadata (notes about why dependency exists)

- **Compaction Summary**: Represents a summarized context. Attributes: sessionId
  (string), tasksCompacted (array of task IDs), summaryText (string),
  tokensSaved (integer), compactedAt (timestamp), preservedTasks (array of last
  N tasks kept in detail)

- **Dependency Graph**: Graph structure tracking spec relationships. Nodes: spec
  IDs. Edges: dependencies with metadata. Supports: cycle detection, topological
  sort, impact analysis queries

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can save a preference once and SpecGofer remembers it across
  all future sessions without re-prompting (100% memory persistence rate)
- **SC-002**: Users report 80% reduction in repetitive explanations after
  enabling memory extension (measured via user survey)
- **SC-003**: SpecGofer successfully executes specs with 150+ tasks without
  manual context management (previously limited to ~70 tasks)
- **SC-004**: Context compaction completes in under 10 seconds and reduces
  context usage by 40-60% on average
- **SC-005**: Dependency graph correctly identifies 100% of circular
  dependencies before they cause execution issues
- **SC-006**: Impact analysis completes in under 2 seconds for projects with up
  to 100 specs
- **SC-007**: Hint file loading adds less than 500ms to autonomous execution
  startup time
- **SC-008**: Memory search returns relevant results in under 1 second for
  memory stores with up to 1000 entries
- **SC-009**: Auto-suggestion for saving memories achieves 70%+ user acceptance
  rate (users click "yes" to save suggestion)
- **SC-010**: Zero data loss incidents: all memories and dependencies persist
  correctly across VSCode restarts, extension updates, and system crashes
- **SC-011**: Users successfully create and apply hierarchical hints (global +
  directory-specific) in 90% of multi-module projects
- **SC-012**: Dependency-based execution ordering prevents 95%+ of "missing API"
  or "undefined dependency" errors that would occur with random execution order

### User Experience Outcomes

- **UX-001**: First-time users understand how to teach SpecGofer a preference
  within 5 minutes of feature introduction
- **UX-002**: Memory suggestions feel helpful, not intrusive (measured by
  acceptance rate >70% and disable rate <5%)
- **UX-003**: Impact analysis notifications provide actionable information
  (users can decide whether to proceed based on notification alone)
- **UX-004**: Compaction happens transparently - users notice better
  performance, not the compaction mechanism itself
- **UX-005**: Dependency visualizations in tree view are immediately
  understandable without requiring documentation

## Assumptions

- **A-001**: Users have basic understanding of file hierarchies and can create
  markdown files in appropriate directories
- **A-002**: VSCode global state storage is reliable and persistent (standard
  VSCode API assumption)
- **A-003**: Most users will have <1000 memories and <100 specs, making linear
  search and simple graph algorithms sufficient
- **A-004**: Context window size is 200K tokens (Claude Code default) for
  compaction threshold calculations
- **A-005**: Users can articulate their preferences clearly enough for memory
  storage (e.g., "use Vitest" vs vague statements)
- **A-006**: Spec IDs are unique and stable (don't change after dependencies are
  declared)
- **A-007**: Hint files are primarily markdown documentation, not executable
  code or complex DSLs
- **A-008**: LLM provider (Claude, OpenAI, etc.) has sufficient context window
  for summarization during compaction
- **A-009**: Users working on large specs (100+ tasks) have sufficient LLM quota
  for potential increased token usage
- **A-010**: File system operations (read/write to .specify/ directory) are
  reliable and fast enough for real-time usage

## Dependencies

- **DEP-001**: Requires existing AutonomousDriver implementation (Feature 005)
  to integrate memory injection and compaction
- **DEP-002**: Requires VSCode Extension API for global state storage, commands,
  and UI notifications
- **DEP-003**: Requires spec frontmatter parsing capability to read `depends_on`
  and `hints` fields
- **DEP-004**: Requires multi-LLM support (from roadmap) for cost-optimized
  compaction summaries using fallback model
- **DEP-005**: Requires JSON schema validation for memory and dependency graph
  file formats

## Out of Scope

- **OOS-001**: Machine learning or model fine-tuning (this is retrieval-based
  memory, not ML training)
- **OOS-002**: Real-time collaboration on shared memories across multiple users
  (single-user memory only)
- **OOS-003**: Cloud sync of memories between different machines (local VSCode
  storage only)
- **OOS-004**: Visual graph editor for dependencies (text-based frontmatter
  declaration only)
- **OOS-005**: Automatic dependency inference by analyzing code (dependencies
  must be explicitly declared)
- **OOS-006**: Memory encryption or security features (stored as plain
  JSON/markdown in .specify/ directory)
- **OOS-007**: Version control or history for memories (no undo/rollback - must
  manually delete and re-create)
- **OOS-008**: Import/export of memories to share between projects (manual copy
  only)
- **OOS-009**: Natural language understanding of complex multi-step preferences
  (simple key-value storage only)
- **OOS-010**: Automatic hint file generation from existing code analysis (hint
  files must be manually authored)

## Future Enhancements

- **FE-001**: Community recipe marketplace for sharing common hint files and
  memory templates
- **FE-002**: AI-powered dependency inference by analyzing API usage in code
- **FE-003**: Memory analytics dashboard showing most-used memories, unused
  memories, memory effectiveness metrics
- **FE-004**: Cross-project memory import/export with conflict resolution
- **FE-005**: Visual dependency graph viewer with interactive navigation
- **FE-006**: Automatic hint file suggestions based on code analysis and common
  patterns
- **FE-007**: Memory versioning and history with rollback capabilities
- **FE-008**: Integration with team knowledge bases (Confluence, Notion) for
  hint file synchronization
- **FE-009**: Smart compaction strategies based on task importance scoring (keep
  critical tasks in detail longer)
- **FE-010**: Memory search with semantic similarity (vector embeddings) instead
  of keyword-only search
