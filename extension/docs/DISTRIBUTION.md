# Extension Distribution Guide

This document explains how to build, package, and distribute the Gofer VSCode extension.

## 🚀 Quick Start

### Local Development Build

```bash
# Build and package the extension
./scripts/package-extension.sh

# Clean build with tests
./scripts/package-extension.sh --clean

# Skip tests for faster packaging
./scripts/package-extension.sh --skip-tests
```

### Install Locally

```bash
# Install the generated VSIX
code --install-extension dist/gofer-*.vsix
```

## 📦 Packaging Options

### Automated Packaging Script

The `scripts/package-extension.sh` script provides comprehensive packaging:

```bash
# Show all options
./scripts/package-extension.sh --help

# Common scenarios
./scripts/package-extension.sh --clean --output ./build
./scripts/package-extension.sh --version 1.2.3 --skip-tests
./scripts/package-extension.sh --skip-checks  # For CI environments
```

**What the script does:**
1. ✅ Checks dependencies (Node.js, npm, vsce)
2. 🧹 Optionally cleans previous builds
3. 📦 Installs all dependencies
4. 🏗️ Builds Language Server
5. 🔧 Prepares extension bundle
6. 🧪 Runs linting and tests
7. 📋 Packages VSIX file
8. ✅ Validates package

### Manual Packaging

```bash
# Install dependencies
cd extension && npm ci
cd ../language-server && npm ci

# Build Language Server
cd ../language-server && npm run build

# Prepare extension
cd ../extension
npm run prepare-language-server
npm run package

# Create VSIX
npx @vscode/vsce package --no-dependencies
```

## 🔄 Release Workflow

### Automated Release (Recommended)

The repository includes GitHub Actions for automated releases:

#### 1. Tag-based Release (Production)

```bash
# Create and push a version tag
git tag v1.2.3
git push origin v1.2.3
```

**What happens:**
1. 🔨 Builds and tests extension
2. 📦 Packages VSIX file  
3. 🎯 Creates GitHub release
4. 🚀 Publishes to VS Code Marketplace
5. 📢 Publishes to Open VSX Registry

#### 2. Manual Release (Development)

Use GitHub's "Actions" tab:
1. Go to "Release Extension" workflow
2. Click "Run workflow"
3. Enter version number (e.g., `1.2.3`)
4. Choose if it's a pre-release
5. Click "Run workflow"

**Result:** Creates a draft release with VSIX attached

### Manual Release Process

#### 1. Prepare Release

```bash
# Update version in package.json
cd extension
npm version 1.2.3 --no-git-tag-version

# Update CHANGELOG.md
# Add release notes for version 1.2.3

# Commit changes
git add .
git commit -m "Prepare release v1.2.3"
```

#### 2. Package Extension

```bash
./scripts/package-extension.sh --version 1.2.3
```

#### 3. Create GitHub Release

```bash
# Create and push tag
git tag v1.2.3
git push origin v1.2.3

# Upload VSIX to GitHub release page manually
```

#### 4. Publish to Marketplace

```bash
# Install vsce if not already installed
npm install -g @vscode/vsce

# Login to marketplace (one-time setup)
vsce login <publisher-name>

# Publish
vsce publish --packagePath dist/gofer-1.2.3.vsix
```

## 🏪 Marketplace Publishing

### Prerequisites

1. **VS Code Marketplace Publisher Account**
   - Visit: https://marketplace.visualstudio.com/manage
   - Create publisher account for "EnterpriseAI"
   - Generate Personal Access Token (PAT)

2. **Environment Setup**
   ```bash
   # Store PAT securely
   export VSCE_PAT="your-marketplace-token"
   
   # For Open VSX Registry
   export OVSX_PAT="your-ovsx-token"
   ```

### Publishing Commands

```bash
# Publish to VS Code Marketplace
vsce publish --packagePath dist/gofer-1.2.3.vsix

# Publish to Open VSX Registry  
npx ovsx publish dist/gofer-1.2.3.vsix

# Publish pre-release
vsce publish --pre-release --packagePath dist/gofer-1.2.3-beta.vsix
```

### Marketplace Settings

The `extension/package.json` contains marketplace metadata:
- **Publisher**: `EnterpriseAI`
- **Categories**: `AI`, `Testing`, `Other`
- **Keywords**: `spec-driven`, `claude`, `copilot`, `ai`
- **Icon**: `icon.png`
- **Repository**: GitHub URL for source code

## 🧪 Testing Distribution

### Local Testing

```bash
# Package extension
./scripts/package-extension.sh

# Install in VS Code
code --install-extension dist/gofer-*.vsix

# Test in VS Code
# 1. Open a workspace
# 2. Run "Gofer: Initialize Repository"
# 3. Verify extension activates correctly
```

### CI Testing

The GitHub Actions workflow runs:
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests (with `SKIP_NETWORK_TESTS=true`)
- ✅ Linting and formatting
- ✅ Package validation

### Pre-release Testing

```bash
# Create pre-release version
./scripts/package-extension.sh --version 1.2.3-beta.1

# Test with limited users
code --install-extension dist/gofer-1.2.3-beta.1.vsix
```

## 📊 Release Checklist

### Before Release

- [ ] All tests pass locally
- [ ] CHANGELOG.md updated with release notes
- [ ] Version bumped in `extension/package.json`
- [ ] README.md updated if needed
- [ ] Documentation updated for new features
- [ ] Extension tested in clean VS Code installation

### Release Process

- [ ] Create and push version tag
- [ ] Verify GitHub Actions workflow completes
- [ ] Verify GitHub release created
- [ ] Verify VSIX published to marketplace
- [ ] Test installation from marketplace

### After Release

- [ ] Test marketplace installation
- [ ] Update issue templates if needed
- [ ] Announce release (if applicable)
- [ ] Monitor for installation issues

## 🔧 Troubleshooting

### Common Issues

**VSCE packaging fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run prepare-language-server
```

**GitHub Actions fails**
- Check if secrets `VSCE_PAT` and `OVSX_PAT` are set
- Verify Node.js version compatibility
- Check for test failures in CI

**Marketplace publishing fails**
- Verify publisher account permissions
- Check PAT token validity
- Ensure unique version number

**Extension doesn't activate**
- Check activation events in `package.json`
- Verify Language Server is bundled correctly
- Check VS Code version compatibility

### Debug Package Contents

```bash
# List files in VSIX
npx @vscode/vsce ls dist/gofer-*.vsix

# Extract VSIX for inspection
unzip -l dist/gofer-*.vsix
```

### Manual Verification

```bash
# Test VSIX validity
npx @vscode/vsce verify dist/gofer-*.vsix

# Check package size
du -h dist/gofer-*.vsix

# Validate manifest
node -e "console.log(JSON.stringify(require('./extension/package.json'), null, 2))"
```

## 📈 Monitoring

### Download Statistics

- **VS Code Marketplace**: https://marketplace.visualstudio.com/items?itemName=EnterpriseAI.specgofer
- **GitHub Releases**: https://github.com/eai-tools/gofer/releases

### User Feedback

- **Issues**: Monitor GitHub Issues for bug reports
- **Reviews**: Check marketplace reviews and ratings
- **Usage**: Anonymous telemetry (if enabled by users)

## 🔄 Version Strategy

- **Major** (X.0.0): Breaking changes, new core features
- **Minor** (x.Y.0): New features, backwards compatible
- **Patch** (x.y.Z): Bug fixes, minor improvements
- **Pre-release** (x.y.z-beta.N): Testing versions

**Example progression:**
```
1.0.0 → 1.0.1 → 1.1.0 → 1.1.1 → 2.0.0-beta.1 → 2.0.0
```

## 🚀 Automation

The repository provides:
- **GitHub Actions** for automated CI/CD
- **Package script** for local development
- **Release workflow** for consistent publishing
- **Testing automation** for quality assurance

This ensures reliable, repeatable releases with minimal manual intervention.