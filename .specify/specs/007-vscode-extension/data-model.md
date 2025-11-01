# Data Model: VSCode Extension - Core Infrastructure

**Phase**: 1 (Design & Contracts) **Date**: 2025-10-22 **Prerequisites**:
research.md complete

## Overview

This document defines the data structures, entities, and state management for
the SpecGofer VSCode extension. All interfaces follow TypeScript strict mode
conventions.

## Core Entities

### 1. Spec (Specification)

Represents a feature specification in GitHub Spec Kit format.

```typescript
interface Spec {
  // From YAML frontmatter
  id: string; // e.g., "001-vscode-extension"
  title: string; // e.g., "VSCode Extension - Core Infrastructure"
  status: SpecStatus;
  created: string; // ISO 8601 date
  updated?: string; // ISO 8601 date
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;

  // From Markdown body
  filePath: string; // Absolute path to spec.md
  tasks: Task[];
  acceptanceCriteria?: AcceptanceCriterion[];
}

type SpecStatus =
  | 'draft'
  | 'ready-for-planning'
  | 'in_progress'
  | 'completed'
  | 'blocked';
```

**Validation Rules**:

- `id` must match pattern `^\d{3}-[\w-]+$`
- `title` must be 5-200 characters
- `status` must be one of defined enum values
- `created` must be valid ISO 8601 date
- `filePath` must exist and be readable

**State Transitions**:

```
draft → ready-for-planning → in_progress → completed
                              ↓
                            blocked → in_progress
```

### 2. Task

Represents an individual task within a spec.

```typescript
interface Task {
  id: string; // e.g., "T001"
  description: string; // Full task description
  dependencies: string[]; // Array of task IDs (e.g., ["T001", "T002"])
  status: TaskStatus;
  specId: string; // Parent spec ID
  completed?: boolean; // Derived from checkbox [ ] or [x]
}

type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'failed';
```

**Validation Rules**:

- `id` must match pattern `^T\d+$`
- `description` must be non-empty
- `dependencies` IDs must reference existing tasks in same spec
- No circular dependencies allowed
- `status` must be one of defined enum values

**Dependency Resolution**:

- Tasks can only start when ALL dependencies are `completed`
- Failed tasks block dependent tasks
- Dependency graph must be acyclic (validate on parse)

### 3. AcceptanceCriterion

Represents an acceptance criterion for a spec.

```typescript
interface AcceptanceCriterion {
  id: string; // e.g., "AC1", "AC2"
  title: string; // Brief title
  scenario: string; // Given/When/Then format
  testType?: 'unit' | 'integration' | 'e2e' | 'manual';
  testPath?: string; // Path to test file
  passed?: boolean; // Test execution result
}
```

### 4. Constitution Article

Represents an article in the project constitution.

```typescript
interface ConstitutionArticle {
  id: string; // e.g., "I", "II", "III"
  title: string; // e.g., "Test-Driven Development (NON-NEGOTIABLE)"
  content: string; // Full article text
  principles: string[]; // Bullet points extracted from content
}
```

### 5. MCPConfiguration

Represents the MCP configuration for Claude Code integration.

```typescript
interface MCPConfiguration {
  mcp: {
    servers: {
      [serverName: string]: {
        command: string; // e.g., "node"
        args: string[]; // e.g., ["/path/to/server.js"]
        env?: Record<string, string>; // e.g., { "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}" }
      };
    };
  };
}
```

**Validation Rules**:

- `command` must be valid executable
- `args` must include valid path to Language Server
- Environment variables should use `${env:VAR}` syntax for secrets

### 6. SpecKitTemplate

Represents a downloadable Spec Kit template from GitHub releases.

```typescript
interface SpecKitTemplate {
  name: string; // e.g., "spec-kit-template-claude-sh"
  version: string; // e.g., "v1.2.3"
  downloadUrl: string; // GitHub release download URL
  zipFileName: string; // e.g., "spec-kit-template-claude-sh-v1.2.3.zip"
  targetAgent: 'claude' | 'copilot';
  extractPath: string; // Target extraction path (.specify/templates or .specify/scripts)
}

interface TemplateDownloadResult {
  success: boolean;
  template: SpecKitTemplate;
  filesExtracted: string[];
  errors: string[];
}
```

**Validation Rules**:

- `version` must follow semantic versioning (vX.Y.Z)
- `downloadUrl` must be valid HTTPS URL from github.com domain
- `targetAgent` must be either 'claude' or 'copilot'
- `extractPath` must be within workspace `.specify/` directory

## UI State Management

### 7. SpecTreeItem

Tree view item for specs (extends VSCode TreeItem).

```typescript
class SpecTreeItem extends vscode.TreeItem {
  constructor(
    public readonly spec: Spec,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(spec.title, collapsibleState);
    this.tooltip = `${spec.id} - ${spec.status}`;
    this.description = spec.status;
    this.contextValue = 'spec';
    this.iconPath = this.getIconForStatus(spec.status);
    this.command = {
      command: 'specgofer.openSpec',
      title: 'Open Spec',
      arguments: [spec.filePath],
    };
  }

  private getIconForStatus(status: SpecStatus): vscode.ThemeIcon {
    const iconMap: Record<SpecStatus, string> = {
      draft: 'file',
      'ready-for-planning': 'clock',
      in_progress: 'sync',
      completed: 'check',
      blocked: 'error',
    };
    return new vscode.ThemeIcon(iconMap[status]);
  }
}
```

### 7. TaskTreeItem

Tree view item for tasks (extends VSCode TreeItem).

```typescript
class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly spec: Spec
  ) {
    super(task.description, vscode.TreeItemCollapsibleState.None);
    this.tooltip = `${task.id} - deps: ${task.dependencies.join(', ') || 'none'}`;
    this.description = task.status;
    this.contextValue = 'task';
    this.iconPath = task.completed
      ? new vscode.ThemeIcon('check')
      : new vscode.ThemeIcon('circle-outline');
    this.checkboxState = task.completed
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked;
  }
}
```

## File System Structures

### 9. SpecKitWorkspace

Represents the `.specify/` folder structure with template management.

```typescript
interface SpecKitWorkspace {
  rootPath: string; // Absolute path to .specify/
  specsPath: string; // Absolute path to .specify/specs/ (ALWAYS this location)
  memoryPath: string; // Absolute path to .specify/memory/
  templatesPath: string; // Absolute path to .specify/templates/
  scriptsPath: string; // Absolute path to .specify/scripts/
  constitutionPath: string; // Absolute path to constitution.md
  specs: Spec[]; // All loaded specs from .specify/specs/
  constitution: ConstitutionArticle[];
  availableTemplates: SpecKitTemplate[]; // Latest templates from GitHub
  installedTemplateVersions: Record<string, string>; // Track installed versions
}
```

**Important**: All specifications MUST be located at `.specify/specs/`, never at
repository root.

### 10. MigrationReport

Result of legacy JSON → Spec Kit migration.

```typescript
interface MigrationReport {
  success: boolean;
  filesConverted: number;
  filesFailed: number;
  backupPath: string; // Path to backup directory
  errors: MigrationError[];
}

interface MigrationError {
  filePath: string;
  error: string;
  details?: string;
}
```

## State Management

### 10. ExtensionState

Global state persisted in workspace or global storage.

```typescript
interface ExtensionState {
  lastUpdateCheck?: string; // ISO 8601 timestamp
  currentBranch?: string; // Git branch name
  migrationCompleted?: boolean; // Has migration been done
  acceptedLicense?: boolean; // Has user accepted terms
}
```

**Storage Location**: VSCode's `workspaceState` (per-workspace) or `globalState`
(cross-workspace)

## Error Types

### 11. SpecKitError

Custom error types for better error handling.

```typescript
class SpecKitError extends Error {
  constructor(
    message: string,
    public readonly code: SpecKitErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'SpecKitError';
  }
}

enum SpecKitErrorCode {
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  INVALID_FORMAT = 'INVALID_FORMAT',
  LSP_CONNECTION_FAILED = 'LSP_CONNECTION_FAILED',
  MCP_CONFIG_ERROR = 'MCP_CONFIG_ERROR',
}
```

## Relationships

```
SpecKitWorkspace
  ├── specs: Spec[]
  │     ├── tasks: Task[]
  │     └── acceptanceCriteria: AcceptanceCriterion[]
  └── constitution: ConstitutionArticle[]

ProgressProvider (Tree View)
  ├── SpecTreeItem (parent)
  │     └── TaskTreeItem[] (children)

ConstitutionProvider (Tree View)
  └── ArticleTreeItem[]
```

## Performance Considerations

### Caching Strategy

- **Parsed Specs**: Cache in memory, invalidate on file change (Chokidar watch)
- **Tree View Data**: Lazy load children, don't pre-load all tasks
- **Git Status**: Poll every 2 seconds, cache last known branch
- **Update Check**: Cache last check time, throttle to 24 hours

### Memory Limits

- Maximum 1000 specs in memory (graceful degradation if exceeded)
- Maximum 500 tasks per spec (warning if exceeded)
- Tree view virtualization (VSCode handles automatically)

## Security Considerations

### Path Validation

```typescript
function validatePath(userPath: string, workspaceRoot: string): boolean {
  const resolved = path.resolve(workspaceRoot, userPath);
  return resolved.startsWith(workspaceRoot) && fs.existsSync(resolved);
}
```

### Input Sanitization

- All user input in commands must be validated
- File paths must be absolute and within workspace
- Spec IDs must match regex pattern (prevent injection)
- YAML parsing must handle malicious input gracefully

## Summary

All data structures defined and validated. Ready for contract definition in
Phase 1.

### Key Entities

1. ✅ Spec - Core specification entity
2. ✅ Task - Individual task with dependencies
3. ✅ AcceptanceCriterion - Test scenarios
4. ✅ ConstitutionArticle - Project principles
5. ✅ MCPConfiguration - Claude Code integration
6. ✅ TreeItem classes - UI representation
7. ✅ SpecKitWorkspace - Folder structure
8. ✅ MigrationReport - Conversion results
9. ✅ ExtensionState - Persistent state
10. ✅ SpecKitError - Error handling

### Next Steps

- Generate contracts/ directory with API definitions
- Create quickstart.md for developers
- Update agent context with new technologies
