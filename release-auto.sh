#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Check if release type is provided
if [ -z "$1" ]; then
    print_error "Usage: ./release-auto.sh [patch|minor|major] [optional: commit message]"
    echo ""
    echo "Examples:"
    echo "  ./release-auto.sh patch  # Auto-bump and release"
    echo "  ./release-auto.sh minor 'Add new feature'"
    echo "  ./release-auto.sh major 'Breaking changes'"
    exit 1
fi

RELEASE_TYPE=$1
COMMIT_MSG="${2:-Auto-release}"

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    print_error "Invalid release type. Must be: patch, minor, or major"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "extension/package.json" ]; then
    print_error "Must be run from the repository root"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./extension/package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $RELEASE_TYPE in
    patch) PATCH=$((PATCH + 1)) ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
print_success "New version: $NEW_VERSION"

# Update package.json
print_info "Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./extension/package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./extension/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update CHANGELOG with placeholder
CURRENT_DATE=$(date +%Y-%m-%d)
print_info "Updating CHANGELOG.md..."

TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << EOF
# Changelog

All notable changes to the SpecGofer extension will be documented in this file.

## [$NEW_VERSION] - $CURRENT_DATE

$COMMIT_MSG

EOF

awk '/^## \[/{f=1} f' extension/CHANGELOG.md >> "$TEMP_FILE"
mv "$TEMP_FILE" extension/CHANGELOG.md

print_success "Updated package.json and CHANGELOG.md"

# Build VSIX
print_info "Building VSIX package..."
cd extension

# Run vsce package and capture both success and failure
if npx @vscode/vsce package --out "specgofer-$NEW_VERSION.vsix"; then
    print_success "VSIX package built successfully"
else
    print_error "Failed to build VSIX package"
    cd ..
    exit 1
fi

cd ..

# Move VSIX file and verify it exists
if [ -f "extension/specgofer-$NEW_VERSION.vsix" ]; then
    mv "extension/specgofer-$NEW_VERSION.vsix" "./specgofer-$NEW_VERSION.vsix"
    print_success "Built specgofer-$NEW_VERSION.vsix"
else
    print_error "VSIX file was not created: extension/specgofer-$NEW_VERSION.vsix"
    exit 1
fi

# Create releases directory and copy VSIX for GitHub Pages hosting
print_info "Preparing GitHub Pages release assets..."
mkdir -p docs/releases
cp "specgofer-$NEW_VERSION.vsix" "docs/releases/"
print_success "Copied VSIX to docs/releases/ for GitHub Pages hosting"

# Update GitHub Pages releases.json with GitHub Pages download URLs
print_info "Updating GitHub Pages releases.json..."
if [ -f "docs/update-releases.js" ]; then
    # Update the script to use GitHub Pages URLs
    GITHUB_PAGES_URL="https://eai-tools.github.io/specgofer/releases/specgofer-$NEW_VERSION.vsix"
    node docs/update-releases.js "$NEW_VERSION" "$COMMIT_MSG" "$GITHUB_PAGES_URL"
    git add docs/releases.json docs/releases/
    print_success "Updated GitHub Pages release data with assets"
else
    print_warning "GitHub Pages update script not found, skipping..."
fi

# Commit
print_info "Committing changes..."
git add extension/package.json extension/CHANGELOG.md

git commit -m "Version $NEW_VERSION

$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Tag
git tag "v$NEW_VERSION"
print_success "Created tag v$NEW_VERSION"

# Push
print_info "Pushing to GitHub (main branch)..."
git push origin HEAD:main && git push --tags

print_success "🎉 Release $NEW_VERSION complete!"
echo ""
print_info "GitHub Actions will create the release at:"
echo "  https://github.com/eai-tools/specgofer/releases/tag/v$NEW_VERSION"
echo ""
print_info "Monitor workflow at:"
echo "  https://github.com/eai-tools/specgofer/actions"
