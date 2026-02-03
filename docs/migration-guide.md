# Migration Guide: Memory & Learning System

**Version**: 2.1.0 **Feature**: 001-memory-learning-system **Date**: 2025-11-01

This guide helps you migrate to Gofer's new Memory & Learning System
(Feature 001), which introduces persistent memory, contextual hints, dependency
tracking, and intelligent context management.

## Table of Contents

- [Overview](#overview)
- [What's New](#whats-new)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [Feature-by-Feature Migration](#feature-by-feature-migration)
- [Updating Existing Code](#updating-existing-code)
- [Testing Your Migration](#testing-your-migration)
- [Rollback Plan](#rollback-plan)
- [FAQs](#faqs)

## Overview

The Memory & Learning System is a **fully backward-compatible** addition to
Gofer. Existing workflows will continue to work without modification.

**Migration is optional** - you can adopt features incrementally:

- ✅ Keep using Gofer without the Memory & Learning System
- ✅ Add memory storage to autonomous execution (recommended)
- ✅ Create hint files for contextual guidance (recommended)
- ✅ Track dependencies between specs (optional)
- ✅ Enable automatic context compaction (optional)

**Estimated Time**: 15-30 minutes for basic setup, 1-2 hours for full adoption

## What's New

### 1. Persistent Memory (MemoryManager)

**Before** (v2.0.x):

- No long-term memory across sessions
- Decisions and learnings lost after execution
- Manual tracking in markdown files

**After** (v2.1.0):

- Persistent storage with global/spec/session scopes
- Search memories by category, tags, or content
- JSON-based storage in `.specify/memory/local.json`
- VSCode global state for cross-project knowledge

### 2. Contextual Hints (HintLoader)

**Before** (v2.0.x):

- No built-in guidance system
- Manual instructions in spec files
- Repetitive documentation across features

**After** (v2.1.0):

- YAML hint files in `.specify/hints/`
- Context-aware loading (spec, task, phase)
- Caching for performance
- Priority-based application

### 3. Dependency Tracking (DependencyGraph)

**Before** (v2.0.x):

- Manual dependency management
- No cycle detection
- Unclear execution order

**After** (v2.1.0):

- Graph-based relationship tracking
- Automatic cycle detection
- Topological sorting for execution order
- Impact analysis for changes

### 4. Context Compaction (ContextCompactor)

**Before** (v2.0.x):

- Manual context management
- Hit token limits frequently
- Lost work when context exceeded

**After** (v2.1.0):

- Automatic summarization at 80% threshold
- Intelligent task preservation (last N tasks)
- Session backup/restore
- Configurable compaction strategy

## Breaking Changes

**None!** This release is fully backward compatible.

### What Stays The Same

- ✅ Existing .specify folder structure
- ✅ Spec file format (YAML frontmatter + Markdown)
- ✅ Task format (`- [ ] T001: Task description`)
- ✅ VSCode commands and tree views
- ✅ Claude command integration
- ✅ Auto-updater functionality

### What's Added

- ✨ New `.specify/hints/` directory (optional)
- ✨ New `.specify/memory/` directory (auto-created)
- ✨ New `.specify/state/` directory (auto-created)
- ✨ New TypeScript interfaces in `extension/src/autonomous/`
- ✨ New VSCode commands for memory and dependencies

## Migration Steps

### Step 1: Update Gofer Extension

**Option A: Auto-Update (Recommended)**

```
1. Cmd+Shift+P → Gofer: Check for Updates
2. Click "Install Update" button
3. Reload VSCode when prompted
```

**Option B: Manual Installation**

```bash
# Download latest VSIX
curl -LO https://github.com/eai-tools/gofer/releases/download/v2.1.0/gofer-2.1.0.vsix

# Install
code --install-extension gofer-2.1.0.vsix

# Reload VSCode
# Cmd+Shift+P → Developer: Reload Window
```

### Step 2: Verify Installation

```
1. Cmd+Shift+P → Gofer: Initialize
2. Check VSCode Output panel for "Gofer v2.1.0"
3. Verify new directories created:
   - .specify/memory/
   - .specify/state/
```

### Step 3: (Optional) Create Hint Files

```bash
# Create hints directory
mkdir -p .specify/hints/general

# Copy example hints
cp .specify/hints/examples/*.yaml .specify/hints/general/

# Customize for your project
code .specify/hints/general/testing-pattern.yaml
```

### Step 4: (Optional) Add Dependencies to Specs

Edit your spec frontmatter:

```yaml
---
id: 002-user-auth
title: User Authentication
dependencies:
  - id: 001-database
    type: required_by
    reason: Requires database for user storage
---
```

### Step 5: Test the Migration

```
1. Cmd+Shift+P → Gofer: Refresh Specs
2. Verify specs load correctly
3. Check that tasks are still visible
4. Run a simple task to test memory storage
```

## Feature-by-Feature Migration

### Migrating to MemoryManager

**Before**: Manual tracking in NOTES.md or comments

```markdown
<!-- NOTES.md -->

## Decisions

- Used JWT for auth (2025-01-15)
- Decided on PostgreSQL over MySQL (2025-01-20)
```

**After**: Programmatic memory storage

```typescript
import { MemoryManager } from './autonomous/MemoryManager';

const memoryManager = new MemoryManager(context, workspaceRoot);

// Store decision
await memoryManager.save({
  category: 'decision',
  scope: 'spec',
  specId: '002-user-auth',
  content: 'Used JWT for auth with 1-hour expiration',
  tags: ['authentication', 'security'],
  metadata: { date: '2025-01-15' },
});

// Later, search
const decisions = await memoryManager.search({
  category: 'decision',
  tags: ['authentication'],
});
```

**Migration Steps**:

1. Convert existing NOTES.md entries to memories
2. Add memory storage to autonomous execution loops
3. Use `memoryManager.search()` to retrieve context

### Migrating to HintLoader

**Before**: Inline comments or spec documentation

```typescript
// Remember: Always validate user input!
// Remember: Use Logger.for() for component logging!
// Remember: Mock VSCode API in tests!
```

**After**: Centralized hint files

```yaml
# .specify/hints/general/best-practices.yaml
context:
  applies_to: ['*']
  priority: 5

guidance: |
  **Best Practices**:
  - Always validate user input
  - Use Logger.for() for component logging
  - Mock VSCode API in tests

examples:
  - |
    // Validation example
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('Invalid userId');
    }
```

**Migration Steps**:

1. Extract repeated guidance from code comments
2. Create hint files in `.specify/hints/`
3. Organize by specificity (general vs spec-specific)
4. Load hints in autonomous execution context

### Migrating to DependencyGraph

**Before**: Manual dependency tracking in README

```markdown
## Dependencies

- 002-user-auth requires 001-database
- 003-admin-panel requires 002-user-auth
- 004-api requires 002-user-auth
```

**After**: Structured dependency graph

```yaml
# In 002-user-auth/spec.md
---
id: 002-user-auth
dependencies:
  - id: 001-database
    type: required_by
    reason: Requires database for user storage
---
```

```typescript
// Programmatic access
const graph = new DependencyGraph(workspaceRoot);
await graph.loadFromSpecs();

const order = graph.getExecutionOrder();
// ['001-database', '002-user-auth', '003-admin-panel', '004-api']

const impacted = graph.getImpactedSpecs('002-user-auth');
// ['003-admin-panel', '004-api']
```

**Migration Steps**:

1. Add `dependencies` section to spec YAML frontmatter
2. Remove manual dependency documentation
3. Use `graph.getExecutionOrder()` for orchestration
4. Run `graph.validate()` to check for cycles

### Migrating to ContextCompactor

**Before**: Manual context management

```typescript
// Hit token limit? Time to manually summarize...
let context = buildFullContext(); // 180k tokens
if (context.length > 160000) {
  // Manually copy-paste important parts
  // Hope we didn't miss anything critical
}
```

**After**: Automatic compaction

```typescript
const compactor = new ContextCompactor(workspaceRoot, {
  threshold: 0.8, // 80%
  defaultStrategy: {
    preserveLastN: 10, // Keep last 10 tasks
    summarizeBatchSize: 5,
    targetReduction: 50, // 50% reduction
  },
});

// Automatic compaction
if (await compactor.shouldCompact(session)) {
  const summary = await compactor.compact(session);
  console.log(`Saved ${summary.tokensSaved} tokens`);
}
```

**Migration Steps**:

1. Initialize ContextCompactor in autonomous execution
2. Check `shouldCompact()` after each task
3. Call `compact()` when threshold reached
4. Configure strategy based on task complexity

## Updating Existing Code

### If You Have Custom Autonomous Execution

**Before**:

```typescript
async function executeSpec(specId: string): Promise<void> {
  const spec = loadSpec(specId);
  const tasks = parseTasks(spec);

  for (const task of tasks) {
    await executeTask(task);
    // No memory storage
    // No hints loaded
    // No dependency checking
  }
}
```

**After**:

```typescript
async function executeSpec(
  specId: string,
  memoryManager: MemoryManager,
  hintLoader: HintLoader
): Promise<void> {
  // Load dependencies first
  const graph = new DependencyGraph(workspaceRoot);
  await graph.loadFromSpecs();
  const executionOrder = graph.getExecutionOrder();

  if (!executionOrder.includes(specId)) {
    throw new Error(`Spec ${specId} has dependency cycle!`);
  }

  const spec = loadSpec(specId);
  const tasks = parseTasks(spec);

  // Load relevant hints
  const hints = await hintLoader.getHintsForContext({
    specId,
    phase: 'implementation',
  });

  for (const task of tasks) {
    // Get task-specific hints
    const taskHints = await hintLoader.getHintsForContext({
      specId,
      taskId: task.id,
    });

    await executeTask(task, taskHints);

    // Store learnings in memory
    await memoryManager.save({
      category: 'pattern',
      scope: 'session',
      specId,
      content: `Completed ${task.id}: ${task.description}`,
      tags: [task.id, specId],
    });
  }
}
```

### If You Have Custom Task Execution

Add memory storage for errors and solutions:

```typescript
async function executeTask(task: Task): Promise<void> {
  try {
    await runTask(task);
  } catch (error) {
    // Store error for future reference
    await memoryManager.save({
      category: 'error',
      scope: 'spec',
      specId: task.specId,
      content: `Error in ${task.id}: ${error.message}`,
      tags: ['error', task.id],
      metadata: {
        stack: error.stack,
        timestamp: Date.now(),
      },
    });

    // Check if we've seen this before
    const similar = await memoryManager.search({
      category: 'solution',
      content: error.message.slice(0, 50), // Partial match
    });

    if (similar.length > 0) {
      console.log('Found similar error solution:', similar[0].content);
    }

    throw error;
  }
}
```

## Testing Your Migration

### Checklist

- [ ] Gofer v2.1.0 installed
- [ ] `.specify/memory/` directory created
- [ ] `.specify/state/` directory created
- [ ] Existing specs still load correctly
- [ ] Task tree view displays properly
- [ ] Can create new memories
- [ ] Can search existing memories
- [ ] Hint files load without errors
- [ ] Dependency graph validates successfully
- [ ] Context compaction triggers at threshold

### Test Commands

```bash
# Verify version
code --list-extensions --show-versions | grep specgofer

# Verify directory structure
ls -la .specify/
# Should show: hints/, memory/, state/, specs/, templates/

# Verify memory storage
# (Create a memory via VSCode command)
cat .specify/memory/local.json

# Verify hint discovery
# (Check Output panel: Gofer)
# Should see: "Found X hint files"
```

### Manual Testing

1. **Test Memory Storage**:

   ```
   Cmd+Shift+P → Gofer: View Memory
   Create a test memory
   Verify it appears in tree view
   Search for it
   Delete it
   ```

2. **Test Hint Loading**:

   ```
   Create .specify/hints/general/test.yaml
   Cmd+Shift+P → Gofer: Reload Hints
   Check Output panel for hint discovery log
   ```

3. **Test Dependency Validation**:
   ```
   Add dependency to spec frontmatter
   Cmd+Shift+P → Gofer: Validate Dependencies
   Check for cycle detection
   ```

## Rollback Plan

If you encounter issues, you can safely roll back:

### Rollback to v2.0.6

```bash
# Download v2.0.6
curl -LO https://github.com/eai-tools/gofer/releases/download/v2.0.6/gofer-2.0.6.vsix

# Uninstall v2.1.0
code --uninstall-extension eai-tools.specgofer

# Install v2.0.6
code --install-extension gofer-2.0.6.vsix

# Reload VSCode
```

### Cleanup (Optional)

If you want to remove all Memory & Learning System files:

```bash
# Backup first!
cp -r .specify .specify.backup

# Remove new directories
rm -rf .specify/hints
rm -rf .specify/memory
rm -rf .specify/state

# Note: This will delete all stored memories and hints!
```

### Data Preservation

Your data is safe:

- ✅ Specs are unchanged (only frontmatter additions)
- ✅ Tasks are unchanged
- ✅ Constitution is unchanged
- ✅ Memory stored in `.specify/memory/local.json` (can be backed up)
- ✅ Hints in `.specify/hints/` (can be versioned in git)

## FAQs

### Q: Do I need to migrate existing specs?

**A**: No! Existing specs work without modification. Dependencies and hints are
optional.

### Q: Will my autonomous execution still work?

**A**: Yes! The Memory & Learning System is additive. Existing workflows
continue unchanged.

### Q: How much disk space does memory storage use?

**A**: Very little. A typical project uses <1MB:

- Memory: ~10-100 KB (JSON)
- Hints: ~5-50 KB per file
- State: ~10-100 KB (sessions)

### Q: Can I use the Memory & Learning System without autonomous execution?

**A**: Yes! Components work standalone:

- Use MemoryManager for project notes
- Use HintLoader for documentation
- Use DependencyGraph for spec planning

### Q: What happens if I don't create hint files?

**A**: Nothing! The HintLoader will simply return empty arrays. No errors, no
impact.

### Q: Are memories shared across projects?

**A**: Only if you use `scope: 'global'`. Otherwise, memories are stored
per-workspace in `.specify/memory/local.json`.

### Q: Can I export/import memories?

**A**: Yes! Memories are stored in JSON format:

```bash
# Export
cp .specify/memory/local.json ~/backups/project-memories.json

# Import
cp ~/backups/project-memories.json .specify/memory/local.json
```

### Q: How do I debug hint loading issues?

**A**: Check the Output panel:

```
1. View → Output
2. Select "Gofer" from dropdown
3. Look for "Hint discovery" and "Loaded hint" messages
```

### Q: What if my dependency graph has a cycle?

**A**: The DependencyGraph will detect it and throw an error:

```
Error: Cannot add dependency from 003-feature to 001-base: would create a cycle
```

Fix by removing or reordering dependencies.

### Q: Can I disable auto-compaction?

**A**: Yes! Set `autoCompact: false` in config:

```typescript
const compactor = new ContextCompactor(workspaceRoot, {
  autoCompact: false,
});
```

### Q: Does compaction lose any information?

**A**: No! Compaction summarizes older tasks but preserves recent work. You can
also restore from backups:

```typescript
await compactor.rollbackCompaction(session);
```

## Need Help?

- **Documentation**:
  [Memory & Learning System Guide](./memory-learning-system.md)
- **Issues**: [GitHub Issues](https://github.com/eai-tools/gofer/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/eai-tools/gofer/discussions)
- **Email**: support@gofer.com

---

**Last Updated**: 2025-11-01 **Version**: 2.1.0 **Migration Tested**: ✅ v2.0.6
→ v2.1.0
