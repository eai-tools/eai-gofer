# Quick Start: VSCode Extension Development

**Phase**: 1 (Design & Contracts) **Date**: 2025-10-22 **Audience**: Developers
implementing the SpecGofer VSCode extension

## Prerequisites

- Node.js 18+
- VSCode 1.85.0+
- TypeScript 5.7+
- Git

## Project Structure

```
extension/
├── src/                      # TypeScript source
│   ├── extension.ts         # Entry point
│   ├── lspClient.ts         # LSP client
│   ├── mcpConfig.ts         # MCP config generator
│   ├── progressProvider.ts  # Specs tree view
│   ├── constitutionProvider.ts  # Constitution tree view
│   ├── specKitParser.ts     # Spec Kit parser
│   ├── specKitMigrator.ts   # JSON → MD migrator
│   ├── branchSpecManager.ts # Git branch handling
│   ├── autoUpdater.ts       # Update checker
│   └── __tests__/           # Unit tests
├── dist/                     # Webpack output
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── webpack.config.js         # Bundler config
└── README.md                 # Documentation
```

## Setup

### 1. Install Dependencies

```bash
cd extension
npm install
```

### 2. Build Extension

```bash
npm run compile  # TypeScript → JavaScript
```

Or for watch mode during development:

```bash
npm run watch
```

### 3. Run Extension in Development

Press `F5` in VSCode or:

```bash
code --extensionDevelopmentPath=/path/to/extension
```

This opens a new VSCode window with the extension loaded.

## Development Workflow

### 1. Make Changes

Edit files in `src/`. TypeScript compiler will catch errors.

### 2. Test Changes

**Unit Tests**:

```bash
npm test
```

**Manual Testing**:

- Press `F5` to launch Extension Development Host
- Open a workspace with `.specify/` folder
- Test commands via Command Palette (`Cmd+Shift+P`)
- Check tree views in activity bar

### 3. Debug

- Set breakpoints in VSCode
- Press `F5` to start debugging
- Extension runs in separate window
- Debug console shows logs

## Key Implementation Patterns

### Parsing Specs

```typescript
import matter from 'gray-matter';

function parseSpec(filePath: string): Spec {
  const content = fs.readFileSync(filePath, 'utf8');
  const { data, content: markdown } = matter(content);

  // data = YAML frontmatter
  // markdown = body content

  const tasks = parseTaskList(markdown);

  return {
    id: data.id,
    title: data.title,
    status: data.status,
    created: data.created,
    filePath,
    tasks,
  };
}
```

### Tree View Provider

```typescript
export class ProgressProvider implements vscode.TreeDataProvider<SpecTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SpecTreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SpecTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecTreeItem): Promise<SpecTreeItem[]> {
    if (!element) {
      // Return top-level specs
      return this.loadSpecs();
    } else {
      // Return tasks for this spec
      return element.spec.tasks.map((t) => new TaskTreeItem(t, element.spec));
    }
  }
}
```

### File Watching

```typescript
import * as chokidar from 'chokidar';

const watcher = chokidar.watch('.specify/specs/**/*.md', {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 300 },
});

watcher.on('change', (path) => {
  progressProvider.refresh();
});
```

## Testing

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { parseSpec } from '../specKitParser';

describe('specKitParser', () => {
  it('should parse valid spec', () => {
    const spec = parseSpec('./fixtures/valid-spec.md');
    expect(spec.id).toBe('001-test');
    expect(spec.tasks).toHaveLength(3);
  });

  it('should throw on invalid YAML', () => {
    expect(() => parseSpec('./fixtures/invalid.md')).toThrow();
  });
});
```

### Integration Tests

```typescript
import * as vscode from 'vscode';

describe('Extension', () => {
  it('should activate on workspace open', async () => {
    const ext = vscode.extensions.getExtension('eai-tools.specgofer');
    await ext?.activate();
    expect(ext?.isActive).toBe(true);
  });
});
```

## Packaging

### Build for Production

```bash
npm run compile
npx @vscode/vsce package
```

Creates `specgofer-X.Y.Z.vsix` file.

### Install Locally

```bash
code --install-extension specgofer-X.Y.Z.vsix
```

## Debugging Tips

### Check Output Channel

View → Output → Select "SpecGofer Language Server"

### Inspect Tree View State

```typescript
console.log('Tree view state:', progressProvider.getChildren());
```

### Test LSP Communication

```typescript
const result = await lspClient.sendRequest('specgofer/loadSpecs', {});
console.log('Specs loaded:', result);
```

## Common Issues

### Extension Not Activating

- Check `.specify/` folder exists
- Check `activationEvents` in package.json
- Check Output channel for errors

### Tree View Not Updating

- Ensure `refresh()` is called
- Check file watcher is running
- Verify spec parsing succeeds

### LSP Connection Failed

- Check Language Server is built (`cd language-server && npm run build`)
- Check server path in LSP client
- Check stdio communication logs

## Template Management

### GitHub Template Download

The extension downloads templates from GitHub releases:

```typescript
import JSZip from 'jszip';

async function downloadTemplate(version: string): Promise<void> {
  const url = `https://github.com/github/spec-kit/releases/download/${version}/spec-kit-template-claude-sh-${version}.zip`;

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const zip = new JSZip();
  const contents = await zip.loadAsync(buffer);

  // Extract to .specify/templates/
  for (const fileName in contents.files) {
    const file = contents.files[fileName];
    if (!file.dir) {
      const data = await file.async('string');
      await fs.writeFile(path.join('.specify/templates', fileName), data);
    }
  }
}
```

### Template Version Management

Templates are cached locally with version tracking:

```typescript
interface TemplateMetadata {
  version: string;
  downloadedAt: string;
  templates: Array<{
    name: string;
    type: 'claude' | 'copilot';
    path: string;
  }>;
}

// Stored in .specify/templates/metadata.json
```

### Fallback Strategy

1. **Network available**: Download latest from GitHub
2. **Network failure**: Use bundled templates
3. **No templates**: Create minimal spec structure

## Next Steps

After reading this guide:

1. Review [extension-api.md](./contracts/extension-api.md) for API contracts
2. Review [data-model.md](./data-model.md) for data structures
3. Implement components following [tasks.md](./tasks.md) (Phase 2)
4. Write tests alongside implementation (TDD)

## Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
