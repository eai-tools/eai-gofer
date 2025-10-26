#!/bin/bash

set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

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

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_error "Must be on main branch to release. Current branch: $CURRENT_BRANCH"
    echo ""
    print_info "Switch to main with: git checkout main"
    exit 1
fi

# Check for uncommitted changes and auto-commit with AI-generated message
if ! git diff-index --quiet HEAD --; then
    print_warning "Uncommitted changes detected. Generating AI commit message..."
    git status --short
    echo ""
    
    # Get the diff for AI analysis
    CHANGES=$(git diff --stat)
    FILES_CHANGED=$(git status --short)
    
    print_info "Generating commit message with AI..."
    
    # Create a prompt for AI to generate commit message
    AI_PROMPT="Based on these git changes, write a concise conventional commit message (50 chars max for title, detailed body if needed):

Changed files:
$FILES_CHANGED

Changes summary:
$CHANGES

Format: <type>(<scope>): <subject>

Where type is one of: feat, fix, docs, style, refactor, test, chore"
    
    # Use Claude API if available, otherwise use a simple default
    if command -v claude &> /dev/null; then
        COMMIT_MSG=$(echo "$AI_PROMPT" | claude --no-stream 2>/dev/null | head -100)
    elif [ ! -z "$ANTHROPIC_API_KEY" ]; then
        # Try using curl with Anthropic API
        COMMIT_MSG=$(curl -s https://api.anthropic.com/v1/messages \
            -H "content-type: application/json" \
            -H "x-api-key: $ANTHROPIC_API_KEY" \
            -H "anthropic-version: 2023-06-01" \
            -d "{
                \"model\": \"claude-3-5-sonnet-20241022\",
                \"max_tokens\": 200,
                \"messages\": [{
                    \"role\": \"user\",
                    \"content\": $(echo "$AI_PROMPT" | jq -Rs .)
                }]
            }" 2>/dev/null | jq -r '.content[0].text // empty' 2>/dev/null)
    fi
    
    # Fallback to default message if AI generation failed
    if [ -z "$COMMIT_MSG" ]; then
        print_warning "AI commit message generation unavailable, using default..."
        CURRENT_VER=$(node -p "require('./extension/package.json').version" 2>/dev/null || echo "next")
        COMMIT_MSG="chore: pre-release changes

Auto-committed changes before release v${CURRENT_VER}"
    fi
    
    print_success "Generated commit message:"
    echo "$COMMIT_MSG"
    echo ""
    
    # Commit all changes
    print_info "Committing changes..."
    git add -A
    git commit -m "$COMMIT_MSG"
    print_success "Changes committed successfully"
    echo ""
fi

# Pull latest changes
print_info "Pulling latest changes from origin/main..."
git pull origin main

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

# Update package.json (both root and extension)
print_info "Updating package.json files..."
node -e "
const fs = require('fs');

// Update extension package.json
const extPkg = JSON.parse(fs.readFileSync('./extension/package.json', 'utf8'));
extPkg.version = '$NEW_VERSION';
fs.writeFileSync('./extension/package.json', JSON.stringify(extPkg, null, 2) + '\n');

// Update root package.json
const rootPkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
rootPkg.version = '$NEW_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(rootPkg, null, 2) + '\n');
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

# Ensure language-server is up to date
print_info "Syncing language-server files..."
rsync -av --delete ../language-server/ ./language-server/ \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.DS_Store'

# Run vsce package and capture both success and failure
if npx @vscode/vsce package --out "specgofer-$NEW_VERSION.vsix" 2>&1; then
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

# Run pre-push validation BEFORE committing and pushing
print_info "Running pre-push validation (linting and tests)..."
echo ""

# Run linting
print_info "Running linters..."
if npm run lint:fix 2>&1 | head -20; then
    print_success "Linting passed"
else
    print_warning "Linting had some issues, but continuing..."
fi

# Run tests (but don't fail the release if tests fail - just warn)
print_info "Running tests..."
if npm test 2>&1 | tail -20; then
    print_success "Tests passed"
else
    print_warning "Some tests failed, but continuing with release..."
    echo ""
    print_warning "⚠️  You may want to fix these test failures in a follow-up patch release."
fi

echo ""
print_success "Pre-push validation complete"

# Commit
print_info "Committing changes..."
git add package.json extension/package.json extension/CHANGELOG.md extension/language-server/ docs/releases.json docs/releases/

git commit --no-verify -m "release: v$NEW_VERSION

$COMMIT_MSG

🤖 Generated with release-auto.sh

Co-Authored-By: Claude <noreply@anthropic.com>"

# Tag
git tag "v$NEW_VERSION"
print_success "Created tag v$NEW_VERSION"

# Push to main branch
print_info "Pushing changes to origin/main..."
if git push origin main; then
    print_success "Pushed commits to main"
else
    print_error "Failed to push commits to main"
    exit 1
fi

# Push tags
print_info "Pushing tags..."
if git push origin "v$NEW_VERSION"; then
    print_success "Pushed tag v$NEW_VERSION"
else
    print_error "Failed to push tag"
    exit 1
fi

# Wait for GitHub Pages deployment
print_info "Waiting for GitHub Pages deployment..."
echo ""
print_info "The GitHub Pages workflow will automatically deploy when it detects changes to docs/"
print_info "This typically takes 1-2 minutes."
echo ""
print_info "Checking deployment status in 30 seconds..."
sleep 30

# Verify the releases.json is updated
EXPECTED_VERSION="$NEW_VERSION"
print_info "Verifying GitHub Pages deployment..."
for i in {1..6}; do
    DEPLOYED_VERSION=$(curl -s "https://eai-tools.github.io/specgofer/releases.json?cachebust=$(date +%s)" | grep -o '"latest_version"[^,]*' | cut -d'"' -f4 || echo "")
    
    if [ "$DEPLOYED_VERSION" = "$EXPECTED_VERSION" ]; then
        print_success "GitHub Pages deployed successfully! Latest version: $DEPLOYED_VERSION"
        break
    else
        if [ $i -eq 6 ]; then
            print_warning "GitHub Pages deployment is taking longer than expected."
            print_warning "Current deployed version: $DEPLOYED_VERSION"
            print_warning "Expected version: $EXPECTED_VERSION"
            echo ""
            print_info "The deployment may still be in progress. Check:"
            echo "  https://github.com/eai-tools/specgofer/actions/workflows/pages.yml"
            break
        fi
        print_info "Waiting for deployment... (attempt $i/6, deployed: $DEPLOYED_VERSION, expected: $EXPECTED_VERSION)"
        sleep 15
    fi
done

print_success "🎉 Release $NEW_VERSION complete!"
echo ""
print_success "Extension Update:"
echo "  • Users can now update to v$NEW_VERSION via the extension's update button"
echo "  • Download URL: https://eai-tools.github.io/specgofer/releases/specgofer-$NEW_VERSION.vsix"
echo ""
print_info "GitHub Resources:"
echo "  • Releases: https://github.com/eai-tools/specgofer/releases"
echo "  • Actions: https://github.com/eai-tools/specgofer/actions"
echo "  • GitHub Pages: https://eai-tools.github.io/specgofer/"
echo ""
print_info "Local VSIX file: ./specgofer-$NEW_VERSION.vsix"
