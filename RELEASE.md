# Release Process

This repository includes automated release scripts to handle version bumping, changelog updates, building, and GitHub releases.

## Quick Release (Recommended)

Use the automatic release script for quick releases:

```bash
# Patch release (1.3.3 -> 1.3.4)
./release-auto.sh patch

# Minor release with custom message (1.3.4 -> 1.4.0)
./release-auto.sh minor "Add new LSP features"

# Major release (1.4.0 -> 2.0.0)
./release-auto.sh major "Breaking: Complete rewrite"
```

**What it does automatically:**
1. ✅ Bumps version in `extension/package.json`
2. ✅ Updates `extension/CHANGELOG.md` with new version and date
3. ✅ Builds the VSIX package
4. ✅ Commits with "Version X.X.X" message
5. ✅ Creates git tag `vX.X.X`
6. ✅ Pushes to GitHub (triggers Actions)
7. ✅ GitHub Actions builds and creates the release

## Manual Release (More Control)

Use this if you want to edit the CHANGELOG manually:

```bash
./release.sh patch
# Script pauses to let you edit CHANGELOG.md
# Press Enter when done to continue
```

## What Happens on GitHub

When you push a tag (`v*`), GitHub Actions automatically:

1. Checks out the code
2. Installs dependencies
3. Builds the extension
4. Packages the VSIX
5. Extracts changelog notes for this version
6. Creates a GitHub release
7. Uploads the VSIX to the release

Monitor at: https://github.com/eai-tools/specgofer/actions

## Version Bump Types

- **patch**: Bug fixes, small updates (1.3.3 → 1.3.4)
- **minor**: New features, backward compatible (1.3.4 → 1.4.0)
- **major**: Breaking changes (1.4.0 → 2.0.0)

## Troubleshooting

### If GitHub Actions fails

View the workflow run:
```bash
gh run list --limit 5
gh run view <run-id> --log-failed
```

### If you need to undo a release

Before pushing:
```bash
git reset --hard HEAD~1
git tag -d vX.X.X
```

After pushing:
```bash
git push --delete origin vX.X.X
gh release delete vX.X.X
```

### If the VSIX build fails

Build manually to see full output:
```bash
cd extension
npx @vscode/vsce package
```

## Files Modified by Release Scripts

- `extension/package.json` - version field updated
- `extension/CHANGELOG.md` - new version section added
- Creates `specgofer-X.X.X.vsix` in root directory

## Auto-Update Detection

The extension checks for updates by:
1. Fetching latest release from GitHub API
2. Comparing semantic versions
3. Showing update notification if newer version available
4. Offering one-click install via "Update Now" button
