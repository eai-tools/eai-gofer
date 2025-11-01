# File Formats Contract

**Phase**: 1 (Design & Contracts) **Date**: 2025-10-22

## Overview

This document defines the file format specifications for SpecGofer, including
GitHub Spec Kit format, MCP configuration, and legacy JSON format.

## GitHub Spec Kit Format

### spec.md

```markdown
---
id: "001-feature-name"
title: "Feature Title"
status: "draft" | "ready-for-planning" | "in_progress" | "completed" | "blocked"
created: "2025-10-22"
updated: "2025-10-22"
priority: "low" | "medium" | "high" | "critical"
assignee: "engineer-agent"
---

# Feature Title

## Overview

Brief description of the feature.

## Problem Statement

What problem does this solve?

## Solution

How will we solve it?

## Acceptance Criteria

### AC1: Criterion Title

- **Given** initial state
- **When** action occurs
- **Then** expected outcome

## Tasks

- [ ] #T001 Task description (deps: none)
- [x] #T002 Another task (deps: T001)
- [ ] #T003 Final task (deps: T001, T002)

## Technical Design

Technical implementation details.

## Dependencies

Internal and external dependencies.
```

### YAML Frontmatter Schema

```typescript
interface SpecFrontmatter {
  id: string; // Pattern: ^\d{3}-[\w-]+$
  title: string; // Required, 5-200 chars
  status: SpecStatus; // Required enum
  created: string; // Required ISO 8601
  updated?: string; // Optional ISO 8601
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string; // Optional
}
```

### Task List Format

**Pattern**: `- [checkbox] #TaskID Description (deps: Dep1, Dep2)`

**Regex**: `/^- \[([ x])\] #(T\d+) (.+?) \(deps: (.+?)\)$/`

**Examples**:

```markdown
- [ ] #T001 Create entry point (deps: none)
- [ ] #T002 Setup routing (deps: T001)
- [x] #T003 Add tests (deps: T001, T002)
```

**Validation**:

- Task ID must be unique within spec
- Dependencies must reference existing tasks
- No circular dependencies
- Checkbox must be `[ ]` or `[x]`

## MCP Configuration Format

### .vscode/mcp.json

```json
{
  "mcp": {
    "servers": {
      "specgofer": {
        "command": "node",
        "args": ["/absolute/path/to/language-server/dist/server.js"],
        "env": {
          "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}"
        }
      }
    }
  }
}
```

### Schema

```typescript
interface MCPConfig {
  mcp: {
    servers: {
      [serverName: string]: {
        command: string; // Executable name or path
        args: string[]; // Command arguments
        env?: {
          // Environment variables
          [key: string]: string; // Use ${env:VAR} for references
        };
      };
    };
  };
}
```

### Generation Rules

- Use absolute paths for `args[0]` (Language Server path)
- Reference environment variables as `${env:VAR_NAME}`
- Create only if file doesn't exist (don't overwrite)
- File permissions: 0644 (readable by user/group)

## Legacy JSON Format (Deprecated)

### feature-###.json

```json
{
  "id": "feature-001",
  "title": "User Login",
  "description": "Implement user authentication",
  "status": "in_progress",
  "tasks": [
    {
      "id": "T001",
      "description": "Create login UI",
      "dependencies": [],
      "status": "completed"
    }
  ],
  "acceptanceCriteria": [
    {
      "id": "AC1",
      "description": "User can log in with valid credentials",
      "testPath": "tests/login.spec.ts"
    }
  ],
  "qaRules": [
    {
      "question": "What happens on invalid login?",
      "answer": "Show error message",
      "confidence": "high"
    }
  ]
}
```

### Migration Mapping

| JSON Field             | Markdown Location                  |
| ---------------------- | ---------------------------------- |
| `id`                   | YAML frontmatter `id`              |
| `title`                | YAML frontmatter `title`           |
| `description`          | `## Overview` section              |
| `status`               | YAML frontmatter `status`          |
| `tasks[]`              | `## Tasks` section (checkbox list) |
| `acceptanceCriteria[]` | `## Acceptance Criteria` section   |
| `qaRules[]`            | `## Clarifications` section        |

## Constitution Format

### constitution.md

Standard Markdown with sections for each principle.

```markdown
# SpecGofer Constitution

## Core Principles

### I. Principle Name

Description and requirements.

**Rationale**: Why this principle exists.

### II. Next Principle

...
```

**Parsing**: Extract H3 headings as article titles, content until next H3 as
article body.

## Validation Rules

### Path Validation

```typescript
function isValidSpecPath(filePath: string, workspaceRoot: string): boolean {
  // Must be inside .specify/specs/
  // Must end with .md
  // Must follow ###-name/spec.md pattern
  const pattern = /\.specify\/specs\/\d{3}-[\w-]+\/spec\.md$/;
  return pattern.test(filePath) && filePath.startsWith(workspaceRoot);
}
```

### Content Validation

- YAML frontmatter must parse without errors
- All required fields must be present
- Task IDs must be unique
- Dependencies must reference existing tasks
- Status values must be valid enums

## Summary

All file formats defined with validation rules and migration mappings. Parsers
can be implemented using `gray-matter` (YAML) and regex (tasks).
