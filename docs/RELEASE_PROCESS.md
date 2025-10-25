# Release Process Guide

## Quick Start

To create a new release, simply run:

```bash
./release-auto.sh [patch|minor|major] ["Optional commit message"]
```

Examples:

```bash
./release-auto.sh patch                    # 1.11.0 → 1.11.1
./release-auto.sh minor "Add new feature"  # 1.11.0 → 1.12.0
./release-auto.sh major "Breaking changes" # 1.11.0 → 2.0.0
```

## What the Script Does

The `release-auto.sh` script performs a complete automated release:

### 1. Pre-flight Checks ✈️

- Verifies you're on the `main` branch
- Checks for uncommitted changes
- Pulls latest changes from origin
- Validates repository structure

### 2. Version Management 🔢

- Reads current version from `extension/package.json`
- Calculates new version based on release type (patch/minor/major)
- Updates version in `extension/package.json`
- Updates `extension/CHANGELOG.md` with new version and date

### 3. Build Process 🔨

- Syncs language-server files to extension bundle
- Builds VSIX package using `@vscode/vsce package`
- Copies VSIX to `docs/releases/` for GitHub Pages hosting
- Updates `docs/releases.json` with:
  - New version number
  - Download URL (GitHub Pages)
  - Actual file size
  - Release notes
  - Timestamp

### 4. Git Operations 📦

- Commits all changes with structured commit message
- Creates git tag `vX.Y.Z`
- Pushes commits to `origin/main`
- Pushes tags to origin

### 5. Deployment Verification ✅

- Waits 30 seconds for GitHub Actions to start
- Polls GitHub Pages (up to 6 attempts, 15 seconds apart)
- Verifies `releases.json` shows the new version
- Confirms users can update via extension update button

## Complete Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Developer runs: ./release-auto.sh patch                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Script validates: main branch, no uncommitted changes    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Bumps version: 1.11.0 → 1.11.1                          │
│    Updates: package.json, CHANGELOG.md                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Builds VSIX: specgofer-1.11.1.vsix (7.2 MB)             │
│    Copies to: docs/releases/                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Updates docs/releases.json:                              │
│    {                                                         │
│      "latest_version": "1.11.1",                            │
│      "download_url": "https://eai-tools.github.io/..."     │
│    }                                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Git commit & tag & push to origin/main                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. GitHub Actions triggers (.github/workflows/pages.yml)    │
│    Detects changes to docs/** on main branch                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. GitHub Pages deploys docs/ folder                        │
│    Site: https://eai-tools.github.io/specgofer/            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Script verifies deployment (polls releases.json)         │
│    Confirms: latest_version = "1.11.1"                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. ✅ COMPLETE! Users can now update via extension button  │
└─────────────────────────────────────────────────────────────┘
```

## File Changes During Release

### Modified Files

- `extension/package.json` - Version bump
- `extension/CHANGELOG.md` - New entry added
- `extension/language-server/**` - Synced from root `language-server/`
- `docs/releases.json` - New release entry added

### New Files Created

- `specgofer-X.Y.Z.vsix` - In project root (local only)
- `docs/releases/specgofer-X.Y.Z.vsix` - Deployed to GitHub Pages

### Git Operations

- New commit: `release: vX.Y.Z`
- New tag: `vX.Y.Z`
- Push to: `origin/main` and `origin/tags`

## How Users Update

### Automatic Detection

1. Extension checks `https://eai-tools.github.io/specgofer/releases.json`
2. Compares `latest_version` with installed version
3. Shows notification if newer version available
4. User clicks "Update" button
5. Extension downloads VSIX from GitHub Pages URL
6. VSCode installs the new version
7. User reloads window

### Manual Installation

Users can also manually install from:

- **GitHub Pages**: <https://eai-tools.github.io/specgofer/releases/specgofer-X.Y.Z.vsix>
- **Local file**: After running release script, VSIX is in project root

## Troubleshooting

### Problem: "Must be on main branch"

**Solution**: Switch to main first:

```bash
git checkout main
git pull origin main
./release-auto.sh patch
```

### Problem: "Uncommitted changes"

**Solution**: Commit or stash your changes:

```bash
git add .
git commit -m "Your changes"
./release-auto.sh patch
```

### Problem: "Failed to build VSIX package"

**Possible causes**:

1. Missing dependencies in extension folder
2. TypeScript compilation errors
3. Missing language-server files

**Solution**:

```bash
cd extension
npm install
cd ../language-server
npm install
cd ..
./release-auto.sh patch
```

### Problem: "GitHub Pages deployment taking longer than expected"

**This is normal** - GitHub Pages can take 2-5 minutes to deploy.

**Verify deployment**:

1. Check workflow:
   <https://github.com/eai-tools/specgofer/actions/workflows/pages.yml>
2. Wait for green checkmark
3. Manually test:
   `curl https://eai-tools.github.io/specgofer/releases.json | jq .latest_version`

### Problem: "Update button still shows old version"

**Possible causes**:

1. GitHub Pages hasn't deployed yet (wait 2-5 minutes)
2. Browser/extension cache
3. CDN propagation delay

**Solution**:

```bash
# Force check after waiting
RELEASES_URL="https://eai-tools.github.io/specgofer/releases.json"
curl "${RELEASES_URL}?cachebust=$(date +%s)" | jq .latest_version

# Should show your new version
```

In the extension, click "Check for Updates" again after GitHub Pages
deployment completes.

## Testing Before Release

Run the pre-flight test script:

```bash
./test-release.sh
```

This validates:

- ✅ Correct branch (main)
- ✅ No uncommitted changes
- ✅ Repository structure
- ✅ Required scripts exist
- ✅ GitHub Pages is accessible
- ✅ Version calculation logic

## Semantic Versioning Guide

SpecGofer follows [Semantic Versioning 2.0.0](https://semver.org/):

### PATCH (x.y.Z) - Bug Fixes

```bash
./release-auto.sh patch "Fix language server crash on startup"
```

- Bug fixes
- Performance improvements
- Documentation updates
- Dependency updates (no breaking changes)

### MINOR (x.Y.z) - New Features

```bash
./release-auto.sh minor "Add spec validation tool"
```

- New features (backwards compatible)
- New MCP tools
- Enhanced functionality
- Deprecations (not removals)

### MAJOR (X.y.z) - Breaking Changes

```bash
./release-auto.sh major "Rewrite MCP protocol handler"
```

- Breaking API changes
- Removed features
- Major architecture changes
- Incompatible with previous versions

## CI/CD Integration

The release process integrates with GitHub Actions:

### Triggered Workflows

1. **pages.yml** - Deploys docs/ to GitHub Pages
2. **ci.yml** - Runs tests (if configured)
3. **release.yml** - Creates GitHub Release (if configured)

### GitHub Pages Configuration

- **Source**: `main` branch, `/docs` folder
- **Custom domain**: eai-tools.github.io/specgofer
- **Deployment**: Automatic on push to `docs/**`

## Security Considerations

### What Gets Published

- ✅ VSIX package (docs/releases/)
- ✅ releases.json metadata (docs/)
- ✅ Version information
- ❌ Source code (in VSIX but compiled)
- ❌ API keys or secrets
- ❌ Development dependencies

### VSIX Contents

The VSIX package contains:

- Bundled extension code (extension.js)
- Language server (dist/ + node_modules)
- Package manifest (package.json)
- README and LICENSE
- Resources and icons

**Not included**: Development files, tests, .git history

## Advanced: Manual Release Steps

If you need to release manually (script fails), follow these steps:

### 1. Update Version

```bash
cd extension
npm version patch  # or minor, major
cd ..
```

### 2. Update CHANGELOG

```bash
# Add entry manually to extension/CHANGELOG.md
```

### 3. Build VSIX

```bash
cd extension
npx @vscode/vsce package
mv specgofer-X.Y.Z.vsix ../docs/releases/
cd ..
```

### 4. Update releases.json

```bash
node docs/update-releases.js X.Y.Z "Release notes" "https://eai-tools.github.io/specgofer/releases/specgofer-X.Y.Z.vsix"
```

### 5. Commit and Push

```bash
git add extension/package.json extension/CHANGELOG.md docs/
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

### 6. Wait for GitHub Pages

```bash
# Monitor at:
# https://github.com/eai-tools/specgofer/actions/workflows/pages.yml
```

## Support

For issues with the release process:

1. Check this guide's troubleshooting section
2. Run `./test-release.sh` to diagnose issues
3. Review GitHub Actions logs
4. Check GitHub Pages deployment status

---

**Last Updated**: 2025-10-25  
**Script Version**: release-auto.sh v2.0  
**Maintainer**: Enterprise AI Pty Ltd
