# Gofer Releases

This directory contains the GitHub Pages site for Gofer releases.

## Files

- `index.html` - Main release page with download links and release notes
- `releases.json` - JSON API for the extension auto-updater
- `update-releases.js` - Script to automatically update releases.json

## Setup GitHub Pages

1. Go to repository settings: https://github.com/eai-tools/gofer/settings/pages
2. Under "Source", select "Deploy from a branch"
3. Choose "main" branch and "/docs" folder
4. Save

The site will be available at: https://eai-tools.github.io/specgofer

## API Endpoints

- `https://eai-tools.github.io/gofer/releases.json` - JSON API for latest release info
- `https://eai-tools.github.io/gofer/` - Human-readable release page

## Updating Releases

When creating a new release:

1. Update `releases.json` with new version info
2. Commit and push to main branch
3. GitHub Pages will automatically update

## Auto-Update Integration

The VSCode extension can use this API instead of GitHub's private API:

```typescript
// Instead of: api.github.com/repos/eai-tools/gofer/releases/latest
// Use: eai-tools.github.io/gofer/releases.json
```