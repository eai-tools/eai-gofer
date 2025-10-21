# SpecRunner - Auto-Update Release Guide

## 🎉 **Complete! Auto-Update System Integrated**

Your extension now has **automatic update notifications** from the private GitHub repo `eai-tools/specrunner`.

---

## ✅ **What's Been Implemented**

### 1. Auto-Updater Code
- ✅ `extension/src/autoUpdater.ts` - Checks GitHub API for new releases
- ✅ Integrated into `extension.ts` - Runs on startup
- ✅ Checks every 24 hours for updates
- ✅ Manual check command available

### 2. GitHub Actions Workflow
- ✅ `.github/workflows/release.yml` - Automated release process
- ✅ Builds extension on tag push
- ✅ Creates GitHub release
- ✅ Uploads .vsix file

### 3. Commands Added
- ✅ `Spec Kit: Check for Updates` - Manual update check
- ✅ Shows notification when new version available

---

## 🚀 **How It Works**

### For Users (Installing the Extension)

**1. Initial Install:**
```bash
# Download from GitHub Releases
curl -L https://github.com/eai-tools/specrunner/releases/latest/download/specrunner-1.0.0.vsix -o specrunner.vsix

# Install
code --install-extension specrunner.vsix
```

**2. Automatic Update Notifications:**
```
Day 1: Extension installed, version 1.0.0
Day 2: Extension checks GitHub, sees 1.0.0 (no update)
Day 3: You release v1.1.0
Day 4: Extension checks GitHub, sees 1.1.0!

Notification appears:
┌─────────────────────────────────────┐
│ 🎉 SpecRunner v1.1.0 available!    │
│ (Current: v1.0.0)                  │
│                                     │
│ [View Release] [Download] [Later]  │
└─────────────────────────────────────┘
```

**3. User Updates:**
```bash
# Click "Download" → Opens GitHub releases
# Download specrunner-1.1.0.vsix
code --install-extension specrunner-1.1.0.vsix
```

---

## 📦 **For You: Releasing New Versions**

### Quick Release Process

**Step 1: Update Version**
```bash
cd extension

# Bump version (choose one)
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

**Step 2: Commit and Tag**
```bash
# Commit changes
git add .
git commit -m "Release v1.0.1"

# Tag the release
git tag v1.0.1

# Push (this triggers GitHub Actions!)
git push origin main --tags
```

**Step 3: GitHub Actions Automatically:**
- ✅ Builds the extension
- ✅ Packages it as .vsix
- ✅ Creates GitHub Release
- ✅ Uploads .vsix file
- ✅ Generates release notes

**Step 4: Users Get Notified**
- Extension checks GitHub within 24 hours
- Sees new version
- Shows notification automatically!

---

## 🔧 **Manual Release (Alternative)**

If you prefer manual control:

```bash
# 1. Build
cd extension
npm run compile

# 2. Package
npx @vscode/vsce package

# 3. Create release on GitHub
# Go to: https://github.com/eai-tools/specrunner/releases
# Click "Draft a new release"
# Tag: v1.0.1
# Upload: specrunner-1.0.1.vsix
# Publish release

# Done! Auto-updater will find it.
```

---

## 📋 **Testing the Auto-Update**

### Test Locally

**1. Install current version:**
```bash
code --install-extension specrunner-1.0.0.vsix
```

**2. Manually trigger update check:**
```
Cmd+Shift+P → "Spec Kit: Check for Updates"
```

**3. Should see:**
```
✅ You're on the latest version (v1.0.0)
```

**4. Create a test release:**
```bash
# Bump to 1.0.1
npm version patch

# Tag and push
git tag v1.0.1-test
git push --tags

# Wait for GitHub Actions to complete (~2 min)
```

**5. Check again:**
```
Cmd+Shift+P → "Spec Kit: Check for Updates"
```

**6. Should see:**
```
🎉 SpecRunner v1.0.1-test available!
(Current: v1.0.0)
[View Release] [Download Update] [Later]
```

---

## 🌐 **GitHub Release URLs**

Your extension will check these URLs:

**API Endpoint (for version check):**
```
https://api.github.com/repos/eai-tools/specrunner/releases/latest
```

**Download URL (for users):**
```
https://github.com/eai-tools/specrunner/releases/latest/download/specrunner-VERSION.vsix
```

**Releases Page:**
```
https://github.com/eai-tools/specrunner/releases
```

---

## 🎯 **Release Checklist**

Before each release:

- [ ] Update CHANGELOG.md
- [ ] Test all new features
- [ ] Bump version: `npm version patch/minor/major`
- [ ] Update README if needed
- [ ] Commit changes
- [ ] Tag: `git tag v1.0.1`
- [ ] Push: `git push origin main --tags`
- [ ] Wait for GitHub Actions (~2 min)
- [ ] Verify release created on GitHub
- [ ] Test auto-update notification

---

## 🔐 **Private Repository Notes**

Your repo is private at `eai-tools/specrunner`.

**For Private Access:**

Users need GitHub access to download releases:
```bash
# They'll need a GitHub PAT (Personal Access Token)
export GITHUB_TOKEN=ghp_xxxxx

curl -L \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/octet-stream" \
  https://api.github.com/repos/eai-tools/specrunner/releases/latest/assets/ASSET_ID \
  -o specrunner.vsix
```

**Or** make releases public while keeping code private:
```
Settings → Danger Zone → Make releases public
```

---

## 📝 **Version Numbering Strategy**

Follow semantic versioning:

**MAJOR.MINOR.PATCH**

- **PATCH** (1.0.0 → 1.0.1): Bug fixes, small updates
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

Example:
```
v1.0.0 - Initial release
v1.0.1 - Fix auto-upgrade bug
v1.1.0 - Add Claude terminal integration
v1.2.0 - Add Copilot integration
v2.0.0 - Major architecture change
```

---

## 🚨 **Troubleshooting**

### Update Check Not Working

**Check 1: Is GitHub reachable?**
```bash
curl https://api.github.com/repos/eai-tools/specrunner/releases/latest
```

**Check 2: Is version in package.json correct?**
```bash
cd extension
grep version package.json
```

**Check 3: Check extension logs**
```
VSCode → Help → Toggle Developer Tools → Console
Look for "Update check failed" or "Checking for updates"
```

### GitHub Actions Failed

**Check workflow:**
```
https://github.com/eai-tools/specrunner/actions
```

**Common issues:**
- Missing package-lock.json → Run `npm install` in extension/
- Permission issues → Check GITHUB_TOKEN has right scopes
- Build errors → Check `npm run compile` works locally

### Users Not Getting Notifications

**Possible reasons:**
1. They haven't restarted VSCode (update check runs on startup)
2. It's been < 24 hours since last check
3. They're offline
4. Private repo access issues

**Solution:**
```
Tell them to run:
Cmd+Shift+P → "Spec Kit: Check for Updates"
```

---

## 📊 **Current Status**

✅ **Extension packaged:** `specrunner-1.0.0.vsix`
✅ **Auto-updater integrated:** Checks GitHub daily
✅ **GitHub Actions workflow:** Ready to build releases
✅ **Repository configured:** `eai-tools/specrunner`
✅ **Commands added:** Manual update check available

---

## 🎬 **Next Steps**

### Immediate (Ready Now)
```bash
# 1. Install the current version
code --install-extension /Users/douglaswross/spec-driven-dev-system/extension/specrunner-1.0.0.vsix

# 2. Test it in any repo
# Open VSCode → Any folder → Extension should activate

# 3. Commit and create first release
git add .
git commit -m "Add auto-update feature"
git tag v1.0.0
git push origin main --tags
```

### Soon (When Ready)
- Test auto-update by releasing v1.0.1
- Add Claude terminal integration
- Add Copilot Chat integration
- Invite team members to test

---

## 🎉 **Success Metrics**

You'll know it's working when:

1. ✅ Extension installs without errors
2. ✅ Opens any repo and shows .specify detection
3. ✅ Can upgrade old JSON specs to Markdown
4. ✅ Update check shows "You're on latest version"
5. ✅ After releasing v1.0.1, users get notification

---

**Your extension now has enterprise-grade auto-update capabilities!** 🚀

Users install once, get notified of updates automatically, and can update with one command.
