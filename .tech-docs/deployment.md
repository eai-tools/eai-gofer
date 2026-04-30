---
generated: "2026-04-30T22:52:00Z"
source_commit: "42dbe8f354ac8928bfa3d1e6c5b42989a9b6c55f"
---

# Deployment

## Deployment Model

Gofer is a **VSCode extension** distributed via:

1. **GitHub Releases** (primary)
2. **VSCode Marketplace** (planned)
3. **Manual VSIX installation**

No cloud infrastructure required - runs entirely locally in VSCode.

---

## Build Pipeline

### Local Build

**Prerequisites:**

- Node.js 20.x
- npm 10.x
- Git

**Build Steps:**

```bash
# 1. Install dependencies
npm install
cd extension && npm install
cd ../language-server && npm install

# 2. Build all components
npm run build:all
# Runs:
# - tsc (root)
# - webpack (extension)
# - tsc (language-server)

# 3. Package extension
cd extension
npm run package
# Creates: dist/extension.js (minified)

# 4. Build VSIX
npx vsce package
# Creates: gofer-3.1.0.vsix
```

**Output:**

- `extension/dist/extension.js` - Bundled extension
- `language-server/dist/server.js` - Language server
- `gofer-3.1.0.vsix` - Installable package

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File:** `.github/workflows/release.yml`

**Trigger:**

- Manual: `./release-auto.sh patch|minor|major "message"`
- Creates git tag and GitHub release

**Pipeline Stages:**

```mermaid
flowchart LR
    TRIGGER[Release Script] --> VERSION[Bump Version]
    VERSION --> BUILD[Build All]
    BUILD --> TEST[Run Tests]
    TEST --> PACKAGE[Create VSIX]
    PACKAGE --> TAG[Git Tag]
    TAG --> RELEASE[GitHub Release]
    RELEASE --> UPLOAD[Upload VSIX]
```

**Workflow:**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version, for example v2.0.5'
        required: true
      prerelease:
        description: 'Mark as prerelease'
        type: boolean

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install Dependencies
        run: |
          npm ci
          npm --prefix extension ci
          npm --prefix language-server ci

      - name: Run Tests
        run: npm test

      - name: Build Components
        run: |
          npm run build
          npm --prefix extension run compile
          npm --prefix language-server run build

      - name: Package VS Code Extension
        working-directory: ./extension
        run: npx @vscode/vsce package --out "gofer-${{ steps.version.outputs.version }}.vsix"

      - name: Publish GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            gofer-${{ steps.version.outputs.tag_name }}.tar.gz
            extension/gofer-${{ steps.version.outputs.version }}.vsix
```

---

## Release Process

### Automated Release

**Command:**

```bash
./release-auto.sh patch "Fix: Context monitoring accuracy"
# or
./release-auto.sh minor "Feature: Cost budget enforcement"
# or
./release-auto.sh major "Breaking: New MCP protocol v2"
```

**What it does:**

1. Validates clean working tree
2. Runs tests
3. Bumps version in all `package.json` files
4. Creates git commit
5. Creates git tag (`v1.17.2`)
6. Pushes to GitHub
7. Triggers GitHub Actions release workflow

**Important:** NEVER manually edit versions. Always use `release-auto.sh`.

---

## Installation Methods

### 1. From GitHub Releases (Recommended)

```bash
# Download latest VSIX
gh release download --repo eai-tools/gofer --pattern "*.vsix"

# Install in VSCode
code --install-extension gofer-3.1.0.vsix

# Or via UI:
# Extensions > ... > Install from VSIX
```

### 2. From Marketplace (Future)

```bash
code --install-extension EnterpriseAI.gofer
```

**Status:** Not yet published to marketplace

### 3. Development Installation

```bash
# Clone repository
git clone https://github.com/eai-tools/gofer.git
cd gofer

# Build
npm run build:all

# Open in VSCode
code .

# Press F5 to launch Extension Development Host
```

---

## Runtime Environment

### Extension Host

**Process:** VSCode main process **Resources:**

- Memory: ~100MB baseline
- CPU: Low (event-driven)
- Disk: Reads `.specify/` on demand

### Language Server

**Process:** Separate Node.js process **Communication:** stdio (JSON-RPC)
**Resources:**

- Memory: ~50MB baseline
- CPU: Low (request/response)
- Lifecycle: Starts with extension, stops on deactivate

### Orchestrator (Optional)

**Process:** Optional separate Node.js process **Communication:** Terminal
emulation (node-pty) **Resources:**

- Memory: ~150MB baseline
- CPU: Medium (monitoring Claude Code)
- Lifecycle: Manual start/stop via commands

---

## GitHub Codespaces

### Automatic Installation

**File:** `.devcontainer/devcontainer.json`

```json
{
  "postCreateCommand": "bash .devcontainer/install-gofer.sh",
  "customizations": {
    "vscode": {
      "extensions": []
    }
  }
}
```

**Installation Script:** `.devcontainer/install-gofer.sh`

```bash
#!/bin/bash
# 1. Check for GitHub release
LATEST=$(gh release view --repo eai-tools/gofer --json assets)
VSIX_URL=$(echo $LATEST | jq -r '.assets[] | select(.name | endswith(".vsix")) | .url')

# 2. Download VSIX
wget $VSIX_URL -O gofer.vsix

# 3. Install extension
code --install-extension gofer.vsix

# 4. Fallback: Build from source if no release
if [ ! -f gofer.vsix ]; then
  npm run build:all
  cd extension && npx vsce package
  code --install-extension *.vsix
fi
```

**Auto-activate:** Extension activates on `onStartupFinished`

---

## Health Checks

### Extension Health

**Status Bar Indicators:**

| Indicator | Meaning                   |
| --------- | ------------------------- |
| 🟢 Gofer  | Initialized, specs loaded |
| 🟡 Gofer  | Warning (context > 50%)   |
| 🔴 Gofer  | Critical (context > 70%)  |
| ⚫ Gofer  | Not initialized           |

**Diagnostic Commands:**

```bash
# Check extension activation
Developer: Show Running Extensions

# Check language server
Output > Gofer Language Server

# Check logs
.specify/logs/
```

### Language Server Health

**Check Connection:**

```typescript
// Extension connects via LSP client
const client = new LanguageClient('gofer', serverOptions, clientOptions);
await client.start();

// Client.state shows connection status
client.state === State.Running; // ✅ Healthy
```

**Log Location:**

- VSCode Output > Gofer Language Server
- `.specify/logs/lsp.log`

**Common Issues:**

| Issue                   | Solution                              |
| ----------------------- | ------------------------------------- |
| Server not starting     | Check Node.js version (20.x required) |
| MCP tools not available | Run `Gofer: Initialize Repository`    |
| Spec parsing errors     | Validate YAML frontmatter syntax      |

---

## Rollback Procedures

### Rollback Extension

```bash
# 1. Uninstall current version
code --uninstall-extension EnterpriseAI.gofer

# 2. Install previous version
gh release download v1.17.0 --repo eai-tools/gofer --pattern "*.vsix"
code --install-extension gofer-1.17.0.vsix

# 3. Reload VSCode
Developer: Reload Window
```

### Rollback Specification Changes

```bash
# Specs are git-tracked, so use git
git log .specify/specs/

# Restore previous version
git checkout HEAD~1 -- .specify/specs/auth-001/
```

**No database migrations to rollback** - all data is file-based.

---

## Monitoring

### Extension Telemetry

**Logged to:** `.specify/logs/`

**Log Files:**

| File                        | Content                    |
| --------------------------- | -------------------------- |
| `task-execution.jsonl`      | Task start/complete events |
| `tool-audit.jsonl`          | MCP tool calls             |
| `context-usage.jsonl`       | Context window metrics     |
| `gofer-run-ledger.jsonl`    | Cost and token usage       |
| `slop-reduction.jsonl`      | Code quality fixes         |
| `validation-findings.jsonl` | Constitution violations    |

**No external telemetry sent** - all logs are local.

### Performance Metrics

**Available via:**

```bash
# Quality dashboard (CLI)
npm run dashboard

# Outputs:
# - Test coverage
# - Performance benchmarks
# - Build times
```

---

## Security

### Code Signing

**Status:** Not yet code-signed

**Future:** Will sign VSIX with certificate for marketplace publication.

### Update Verification

**Auto-Updater:**

1. Checks GitHub releases API
2. Compares semver
3. Prompts user to install
4. Downloads VSIX from GitHub releases
5. Verifies file integrity (SHA256)

**Security:**

- Downloads only from `github.com/eai-tools/gofer`
- Verifies release is from authenticated GitHub account
- User must approve installation

---

## Disaster Recovery

### Backup Strategy

**What to backup:**

- `.specify/specs/` - All specifications
- `.specify/memory/` - Constitution and memories
- `.specify/logs/` - Execution history (optional)

**Recommended:**

```bash
# Backup command
tar -czf gofer-backup-$(date +%Y%m%d).tar.gz .specify/

# Restore
tar -xzf gofer-backup-20250115.tar.gz
```

**Git-based backup:**

- Commit `.specify/` to git (recommended)
- Push to remote repository
- Automatic versioning and history

### Recovery Procedures

**Corrupt spec files:**

```bash
# 1. Check git history
git log .specify/specs/

# 2. Restore from last good commit
git restore .specify/specs/

# 3. Refresh in VSCode
Gofer: Refresh Specifications
```

**Extension crash:**

```bash
# 1. Check VSCode logs
Help > Toggle Developer Tools > Console

# 2. Reload extension
Developer: Reload Window

# 3. Re-initialize if needed
Gofer: Initialize Repository
```

**Language server crash:**

```bash
# Server auto-restarts on crash
# Check logs:
Output > Gofer Language Server

# Manual restart:
Developer: Reload Window
```

---

## Scaling Considerations

### Per-Workspace Limits

**Tested with:**

- 100+ specifications
- 1000+ tasks
- 10MB+ memory storage
- 100MB+ log files

**Performance:**

- Spec loading: O(n) - cached after first load
- Task lookup: O(1) - indexed by ID
- Memory compaction: O(n log n)

### Multi-Workspace

Each VSCode workspace has independent:

- Extension instance
- Language server process
- `.specify/` directory
- Memory and logs

**No cross-workspace communication.**

### Concurrent Users

**Single-user focused** - not designed for multi-user collaboration.

For teams:

- Each developer has own VSCode instance
- Share `.specify/` via git
- Resolve conflicts in spec files manually

---

## Container Deployment

### Docker (Not Applicable)

Gofer is a VSCode extension, not a containerized service.

**However:** Works in containerized VSCode:

- GitHub Codespaces ✅
- VSCode Dev Containers ✅
- Gitpod ✅

**Setup:** Add `.devcontainer/devcontainer.json` with installation script.
