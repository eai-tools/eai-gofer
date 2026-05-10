#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if release type is provided
if [ -z "$1" ]; then
    print_error "Usage: ./release.sh [patch|minor|major]"
    echo ""
    echo "Examples:"
    echo "  ./release.sh patch  # 1.3.3 -> 1.3.4"
    echo "  ./release.sh minor  # 1.3.3 -> 1.4.0"
    echo "  ./release.sh major  # 1.3.3 -> 2.0.0"
    exit 1
fi

RELEASE_TYPE=$1

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

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    print_warning "You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborting release"
        exit 1
    fi
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./extension/package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $RELEASE_TYPE in
    patch)
        PATCH=$((PATCH + 1))
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
print_success "New version: $NEW_VERSION"

# Update package.json version
print_info "Updating extension/package.json version..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./extension/package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('./extension/package.json', JSON.stringify(pkg, null, 2) + '\n');
"
print_success "Updated package.json"

# Get current date
CURRENT_DATE=$(date +%Y-%m-%d)

# Update CHANGELOG.md - add new version section at the top
print_info "Updating CHANGELOG.md..."
TEMP_FILE=$(mktemp)

cat > "$TEMP_FILE" << EOF
# Changelog

All notable changes to the Gofer extension will be documented in this file.

## [$NEW_VERSION] - $CURRENT_DATE

### Added
-

### Fixed
-

### Changed
-

EOF

# Append everything after the first "## [" from the old changelog
awk '/^## \[/{f=1} f' extension/CHANGELOG.md >> "$TEMP_FILE"
mv "$TEMP_FILE" extension/CHANGELOG.md

print_warning "Please edit extension/CHANGELOG.md to add release notes"
echo ""
read -p "Press Enter after editing CHANGELOG.md to continue..."

# Build the VSIX package
print_info "Building VSIX package..."
cd extension
npx @vscode/vsce package --out "gofer-$NEW_VERSION.vsix"
cd ..
print_success "Built gofer-$NEW_VERSION.vsix"

# Move VSIX to root
mv "extension/gofer-$NEW_VERSION.vsix" "./gofer-$NEW_VERSION.vsix"

# Commit changes
print_info "Committing changes..."
git add extension/package.json extension/CHANGELOG.md

git commit -m "$(cat <<EOF
Version $NEW_VERSION

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
print_success "Committed changes"

# Create git tag
print_info "Creating git tag v$NEW_VERSION..."
git tag "v$NEW_VERSION"
print_success "Created tag v$NEW_VERSION"

# Push to GitHub
echo ""
print_info "Ready to push to GitHub"
echo ""
echo "This will:"
echo "  1. Push the commit to main"
echo "  2. Push the tag v$NEW_VERSION"
echo "  3. Trigger GitHub Actions to build and create a release"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Pushing to GitHub..."
    git push && git push --tags
    print_success "Pushed to GitHub!"

    echo ""
    print_success "Release process complete!"
    echo ""
    print_info "GitHub Actions will now:"
    echo "  - Build the extension"
    echo "  - Create a GitHub release"
    echo "  - Upload the VSIX file"
    echo ""
    print_info "Monitor the workflow at:"
    echo "  https://github.com/eai-tools/gofer/actions"
    echo ""
    print_info "Local VSIX available at:"
    echo "  ./gofer-$NEW_VERSION.vsix"
else
    print_warning "Push cancelled"
    echo ""
    print_info "To push manually later, run:"
    echo "  git push && git push --tags"
    echo ""
    print_info "To undo this release, run:"
    echo "  git reset --hard HEAD~1"
    echo "  git tag -d v$NEW_VERSION"
fi
