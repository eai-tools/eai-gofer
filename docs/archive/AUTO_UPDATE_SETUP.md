# Auto-Update Setup Guide

## TL;DR - Best Options

1. **Public VSCode Marketplace** → Auto-updates work automatically ✅ BEST
2. **Private GitHub Releases** → Semi-automatic (notifications + manual download)
3. **Private NPM Registry** → For enterprise use

---

## Option 1: VSCode Marketplace (Recommended)

### Pros
- ✅ **Fully automatic updates** - VSCode handles everything
- ✅ **Professional distribution** - Appears in Extensions search
- ✅ **User trust** - Official marketplace
- ✅ **Free for open source**

### Setup Steps

**1. Create Microsoft Account**
```bash
# Visit: https://marketplace.visualstudio.com/
# Sign in with Microsoft/GitHub account
```

**2. Create Publisher**
```bash
# Install vsce globally
npm install -g @vscode/vsce

# Create publisher (one-time)
vsce create-publisher your-publisher-name
```

**3. Get Personal Access Token**
```
1. Go to: https://dev.azure.com/
2. Click "User Settings" → "Personal Access Tokens"
3. Click "New Token"
4. Name: "VSCode Marketplace"
5. Organization: "All accessible organizations"
6. Scopes: Select "Marketplace" → "Manage"
7. Click "Create"
8. Copy token (save it somewhere safe!)
```

**4. Login to Publisher**
```bash
vsce login your-publisher-name
# Paste your Personal Access Token
```

**5. Update package.json**
```json
{
  "publisher": "your-publisher-name",
  "version": "1.0.0"
}
```

**6. Publish**
```bash
cd /Users/douglaswross/spec-driven-dev-system/extension

# First time
vsce publish

# Future updates
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish patch  # 1.0.0 → 1.0.1
vsce publish major  # 1.0.0 → 2.0.0
```

**After Publishing:**
- Extension appears in marketplace in ~5-10 minutes
- Users search "Spec Kit Orchestrator" → Install
- VSCode auto-checks for updates daily
- Users get notification when update available
- One-click update

---

## Option 2: GitHub Releases (Private Distribution)

### Pros
- ✅ **Private repository** - Not public
- ✅ **Version control** - Git-based releases
- ✅ **Free** - No marketplace fees
- ⚠️ **Semi-automatic** - Notifies but manual download

### Setup Steps

**1. Create GitHub Repository**
```bash
cd /Users/douglaswross/spec-driven-dev-system
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub first, then:
git remote add origin https://github.com/yourusername/spec-kit-orchestrator.git
git push -u origin main
```

**2. Update package.json**
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/spec-kit-orchestrator"
  }
}
```

**3. Create Release Workflow**

Create `.github/workflows/release.yml`:
```yaml
name: Release Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd extension
          npm install

      - name: Package extension
        run: |
          cd extension
          npx @vscode/vsce package

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: extension/*.vsix
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**4. Release New Version**
```bash
# Update version in package.json
# Then:
git add .
git commit -m "Release v1.1.0"
git tag v1.1.0
git push origin main --tags

# GitHub Actions automatically:
# - Builds extension
# - Creates release
# - Uploads .vsix file
```

**5. Users Install/Update**

**Initial Install:**
```bash
# Download from releases page
curl -L https://github.com/yourusername/spec-kit-orchestrator/releases/latest/download/spec-kit-orchestrator-1.0.0.vsix -o spec-kit.vsix

# Install
code --install-extension spec-kit.vsix
```

**Auto-Update Notifications:**

Add to `extension/src/extension.ts`:
```typescript
import { AutoUpdater } from './autoUpdater';

export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Setup auto-updater
  const packageJson = require('../package.json');
  const updater = new AutoUpdater(
    'yourusername/spec-kit-orchestrator',  // GitHub repo
    packageJson.version                     // Current version
  );

  // Check for updates every 24 hours
  updater.startPeriodicChecks(context);

  // Manual check command
  context.subscriptions.push(
    vscode.commands.registerCommand('specKit.checkForUpdates', async () => {
      await updater.manualCheck();
    })
  );
}
```

Add command to `package.json`:
```json
{
  "contributes": {
    "commands": [
      {
        "command": "specKit.checkForUpdates",
        "title": "Spec Kit: Check for Updates"
      }
    ]
  }
}
```

**User Experience:**
1. Extension checks GitHub every 24 hours
2. If new version found:
   → Notification: "🎉 Spec Kit v1.1.0 available!"
   → Click "Download Update"
   → Opens GitHub releases page
   → Download .vsix
   → Run: `code --install-extension spec-kit-orchestrator-1.1.0.vsix`

---

## Option 3: Private NPM Registry (Enterprise)

For companies with private NPM registry:

```bash
# Publish to private registry
npm publish --registry https://npm.yourcompany.com/

# Users install via registry
npm install -g @yourcompany/spec-kit-orchestrator
```

---

## Comparison

| Feature | Marketplace | GitHub Releases | Private NPM |
|---------|------------|-----------------|-------------|
| Fully Automatic | ✅ Yes | ⚠️ Notifications only | ⚠️ Notifications only |
| Public/Private | Public | Either | Private |
| Cost | Free | Free | Hosting cost |
| Setup Complexity | Medium | Easy | Complex |
| User Trust | High | Medium | High |
| Update Speed | Instant | Manual download | Manual install |

---

## Recommended Approach

### For You (Douglas):

**Start with:** GitHub Releases
- Keep it private initially
- Add auto-update notifications
- Test with your team
- Easy to publish to marketplace later

**Eventually:** VSCode Marketplace
- When ready for public release
- Fully automatic updates
- Professional distribution

---

## Implementation Steps for GitHub Auto-Updates

**1. Add AutoUpdater to extension:**
```bash
# Already created: extension/src/autoUpdater.ts ✅
```

**2. Update extension.ts:**
```typescript
// Add at top
import { AutoUpdater } from './autoUpdater';

// In activate():
const packageJson = require('../package.json');
const updater = new AutoUpdater(
  'douglaswross/spec-kit-orchestrator',  // Your GitHub repo
  packageJson.version
);
updater.startPeriodicChecks(context);

// Add manual check command
context.subscriptions.push(
  vscode.commands.registerCommand('specKit.checkForUpdates', () => {
    updater.manualCheck();
  })
);
```

**3. Add command to package.json:**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "specKit.checkForUpdates",
        "title": "Spec Kit: Check for Updates"
      }
    ]
  }
}
```

**4. Create GitHub repo and push:**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/douglaswross/spec-kit-orchestrator.git
git push -u origin main
```

**5. Create first release:**
```bash
# Tag version
git tag v1.0.0
git push --tags

# On GitHub: Releases → Create Release
# Upload: spec-kit-orchestrator-1.0.0.vsix
```

**6. Future updates:**
```bash
# Update version in package.json
npm version patch  # 1.0.0 → 1.0.1

# Rebuild and package
npm run compile
npx @vscode/vsce package

# Create release
git add .
git commit -m "Release v1.0.1"
git tag v1.0.1
git push origin main --tags

# Upload new .vsix to GitHub release
```

**7. Users get notified:**
- Extension checks GitHub daily
- Sees new version
- Shows notification with download link
- One command to update

---

## Quick Decision Matrix

**Choose Marketplace if:**
- ✅ Want public distribution
- ✅ Want fully automatic updates
- ✅ Don't mind public code

**Choose GitHub Releases if:**
- ✅ Want to keep it private
- ✅ Okay with semi-automatic (notifications + manual download)
- ✅ Want version control integration

**Choose Private NPM if:**
- ✅ Enterprise environment
- ✅ Already have private registry
- ✅ Need fine-grained access control

---

## What I Recommend for You

1. **Now:** GitHub Releases with auto-updater
   - Private initially
   - Semi-automatic updates
   - Easy to test

2. **Later:** VSCode Marketplace
   - When ready for public
   - Fully automatic updates
   - Wider distribution

Want me to:
1. Set up the GitHub auto-updater integration?
2. Help you publish to VSCode Marketplace?
3. Both?
