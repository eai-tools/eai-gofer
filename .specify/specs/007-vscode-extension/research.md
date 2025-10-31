# Research: VSCode Extension - Core Infrastructure

**Phase**: 0 (Outline & Research) **Date**: 2025-10-22 **Status**: Complete

## Research Questions

Based on Technical Context analysis, all dependencies and technologies are
well-established in the existing codebase. This research documents the
architectural decisions already made and validates best practices.

## 1. VSCode Extension API Architecture

### Decision

Use VSCode Extension API 1.85.0+ with TypeScript strict mode, Webpack bundling,
and Language Server Protocol.

### Rationale

- **VSCode Extension API**: Industry standard for VSCode extensibility
- **TypeScript 5.7.2**: Type safety, IntelliSense, compile-time error detection
- **Webpack**: Required for bundling Language Server with extension
- **LSP**: Standard protocol for language tooling, well-documented and stable

### Alternatives Considered

| Alternative                | Rejected Because                                             |
| -------------------------- | ------------------------------------------------------------ |
| JavaScript without types   | Constitution requires TypeScript strict mode                 |
| Rollup/ESBuild             | Webpack has better VSCode extension support and LSP bundling |
| Standalone Language Server | Must bundle with extension for seamless installation         |

### Best Practices

- Use activation events sparingly (performance)
- Bundle all dependencies to reduce installation time
- Use TreeDataProvider for dynamic content
- Implement proper disposal for resources
- Cache parsed data to avoid re-parsing

### References

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

## 2. Model Context Protocol (MCP) Integration

### Decision

Auto-generate `.vscode/mcp.json` configuration pointing to the bundled Language
Server for Claude Code integration.

### Rationale

- VSCode 1.102+ has native MCP support
- Claude Code extension reads MCP config from `.vscode/mcp.json`
- Language Server exposes 6 MCP tools via stdio protocol
- Auto-creation ensures zero-config experience for users

### Implementation Pattern

```typescript
// mcpConfig.ts
export function createMCPConfig(workspacePath: string, serverPath: string) {
  return {
    mcp: {
      servers: {
        specgofer: {
          command: 'node',
          args: [serverPath],
          env: {
            ANTHROPIC_API_KEY: '${env:ANTHROPIC_API_KEY}',
          },
        },
      },
    },
  };
}
```

### Best Practices

- Use environment variable references (`${env:VAR}`) for secrets
- Absolute paths for Language Server location
- Create config only if not exists (don't overwrite user customizations)
- Validate config schema before writing

### References

- [VSCode MCP Support](https://code.visualstudio.com/docs/copilot/copilot-extensibility-overview)
- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)

## 3. GitHub Spec Kit Format Parsing

### Decision

Use `gray-matter` for YAML frontmatter parsing + custom Markdown parser for task
lists with dependency tracking.

### Rationale

- **gray-matter**: Battle-tested, 6M+ weekly downloads, handles YAML/TOML/JSON
  frontmatter
- **Custom parser**: Task dependency syntax is specific to SpecGofer (e.g.,
  `deps: T001, T002`)
- **Markdown AST**: Not needed for simple task list parsing (YAGNI principle)

### Format Specification

```markdown
---
id: "001-feature"
title: "Feature Name"
status: "draft" | "in_progress" | "completed"
created: "2025-10-22"
---

# Feature Description

## Tasks

- [ ] #T001 Task description (deps: none)
- [x] #T002 Another task (deps: T001)
```

### Parsing Strategy

1. Extract YAML frontmatter with `gray-matter`
2. Parse Markdown body for `## Tasks` section
3. Regex match task pattern: `/- \[([ x])\] #(T\d+) (.+?) \(deps: (.+?)\)/`
4. Build dependency graph
5. Validate: no circular dependencies, all dependency IDs exist

### Best Practices

- Validate YAML schema (required fields: id, title, status, created)
- Graceful error handling for malformed specs
- Cache parsed specs in memory (invalidate on file change)
- Use Chokidar for file watching (debounce 300ms)

### References

- [gray-matter](https://github.com/jonschlinkert/gray-matter)
- [GitHub Spec Kit Research](../../docs/archive/GITHUB_SPEC_KIT_RESEARCH.md)

## 4. Tree View Providers

### Decision

Implement `TreeDataProvider<T>` interface for specs/tasks (ProgressProvider) and
constitution (ConstitutionProvider).

### Rationale

- VSCode standard pattern for hierarchical data
- Auto-refresh via `_onDidChangeTreeData` event emitter
- Supports icons, tooltips, context menus, drag-and-drop

### Implementation Pattern

```typescript
export class ProgressProvider implements vscode.TreeDataProvider<SpecItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SpecItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SpecItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecItem): Promise<SpecItem[]> {
    // Return specs if no element, return tasks if spec element
  }
}
```

### Best Practices

- Lazy load children (don't load all specs upfront)
- Use `collapsibleState` appropriately
- Implement `getParent()` for `reveal()` support
- Use ThemeIcons for consistency with VSCode UI
- Debounce refresh calls (prevent UI thrashing)

### References

- [Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view)

## 5. Legacy JSON Migration

### Decision

Provide one-time migration command that converts legacy JSON specs to GitHub
Spec Kit Markdown format with automatic backup.

### Rationale

- Support existing users with JSON specs
- One-way migration (JSON → Markdown, no round-trip)
- Preserve all data: tasks, dependencies, acceptance criteria, QA rules
- Backup to `.specify/_backup/` with timestamp for safety

### Migration Process

1. Detect legacy format: `*.json` files in `.specify/` root or `specs/` folders
2. Parse JSON schema
3. Convert to Markdown:
   - JSON fields → YAML frontmatter
   - `description` → Markdown body
   - `tasks` → `## Tasks` section with checkbox syntax
   - `acceptanceCriteria` → `## Acceptance Criteria`
4. Write to `.specify/specs/###-name/spec.md`
5. Backup original to `.specify/_backup/specs-{timestamp}/`

### Best Practices

- Atomic operations (all or nothing)
- Validate both input and output schemas
- Show progress indicator for large migrations
- Provide rollback instructions
- Log migration report (files converted, errors encountered)

### References

- [Spec Kit Migration Doc](../../docs/archive/SPEC_KIT_MIGRATION.md)

## 6. Branch-Specific Spec Management

### Decision

Watch for Git branch changes and reload specs from the active branch using
Chokidar + simple-git.

### Rationale

- Different branches may have different specs in development
- Git doesn't trigger filesystem events on checkout (need to poll or hook)
- Simple-git provides programmatic Git access

### Implementation Pattern

```typescript
export class BranchSpecManager {
  private currentBranch: string;

  async onBranchChange(): Promise<void> {
    const newBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    if (newBranch !== this.currentBranch) {
      this.currentBranch = newBranch;
      await this.reloadSpecs();
    }
  }
}
```

### Best Practices

- Poll Git status every 2 seconds (balance responsiveness vs CPU)
- Debounce spec reload (prevent multiple reloads)
- Cache last known branch to minimize Git calls
- Handle detached HEAD state gracefully
- Notify user when specs change due to branch switch

## 7. Auto-Update from GitHub Releases

### Decision

Check GitHub API for latest release on extension activation (throttled to once
per 24 hours) and show notification if update available.

### Rationale

- Keep users on latest version without manual checking
- GitHub Releases API is free and rate-limited (60 req/hour unauthenticated)
- Non-blocking (async check after activation complete)
- User control (notification, not forced update)

### Implementation Pattern

```typescript
export class AutoUpdater {
  async checkForUpdates(): Promise<UpdateInfo | null> {
    const response = await fetch(
      'https://api.github.com/repos/eai-tools/specgofer/releases/latest'
    );
    const data = await response.json();
    if (semver.gt(data.tag_name, currentVersion)) {
      return { version: data.tag_name, url: data.html_url };
    }
    return null;
  }
}
```

### Best Practices

- Cache last check time in workspace state (24-hour throttle)
- Handle network errors gracefully (silent fail)
- Parse semver correctly (strip 'v' prefix if present)
- Show actionable notification (link to download page)
- Don't check on every activation (performance)

### References

- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)

## 8. Testing Strategy

### Decision

Multi-layered testing: Unit tests (Vitest), Integration tests (VSCode Test
Runner), Manual E2E tests.

### Rationale

- **Unit tests**: Fast, isolated, 80%+ coverage requirement
- **Integration tests**: VSCode API interactions, real extension host
- **Manual E2E**: Full user workflows (activation, tree views, commands)

### Unit Test Targets

- `specKitParser.ts`: YAML parsing, task extraction, dependency validation
- `specKitMigrator.ts`: JSON → Markdown conversion logic
- `mcpConfig.ts`: Config generation, path resolution
- `progressProvider.ts`: Tree item creation, hierarchy logic

### Integration Test Targets

- Extension activation in workspace with/without `.specify/`
- LSP client connection and communication
- Tree view refresh on file changes
- Command execution (initialize, migrate, etc.)

### Best Practices

- Mock filesystem in unit tests
- Use test fixtures for spec samples
- Test error cases (malformed YAML, circular dependencies)
- Measure activation time (must be <500ms)
- CI/CD integration (run tests on PR)

### References

- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

## Summary

All technical unknowns resolved. No NEEDS CLARIFICATION items remaining. Ready
to proceed to Phase 1 (Design & Contracts).

### Key Decisions

1. ✅ VSCode Extension API 1.85.0+ with TypeScript 5.7.2
2. ✅ Webpack bundling with Language Server included
3. ✅ Auto-generated MCP config for Claude Code
4. ✅ gray-matter for YAML parsing + custom task parser
5. ✅ TreeDataProvider for specs and constitution views
6. ✅ One-time migration with automatic backup
7. ✅ Git branch watching with Chokidar
8. ✅ GitHub API for auto-updates (24-hour throttle)
9. ✅ Vitest + VSCode Test Runner for testing

### Next Steps

- **Phase 1**: Generate data-model.md, contracts/, quickstart.md
- **Phase 2**: Generate tasks.md with detailed implementation tasks
