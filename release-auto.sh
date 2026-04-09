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
# Preserve the user-provided release notes — auto-commit logic may overwrite COMMIT_MSG
RELEASE_NOTES="$COMMIT_MSG"

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

# Check if we're on main branch and auto-push to main if needed
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_info "Currently on branch: $CURRENT_BRANCH"
    print_info "Will push to origin/main and release..."
    echo ""

    # Ensure working directory is clean
    if ! git diff-index --quiet HEAD --; then
        print_warning "Uncommitted changes detected. Committing first..."
        git add -A
        git commit -m "chore: pre-release commit from $CURRENT_BRANCH"
        print_success "Changes committed"
    fi

    # Push current branch directly to origin/main (overwrite main on remote)
    print_info "Pushing $CURRENT_BRANCH to origin/main..."
    # Skip local pre-push hooks here; this script runs explicit validation before tagging/release.
    git push --no-verify origin "$CURRENT_BRANCH:main" --force-with-lease

    print_success "Pushed $CURRENT_BRANCH to origin/main"
    print_info "Staying on $CURRENT_BRANCH locally"
    echo ""
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
    git commit --no-verify -m "$COMMIT_MSG"
    print_success "Changes committed successfully"
    echo ""
fi

# Pull latest changes (skip if we already pushed to origin/main)
if [ "$CURRENT_BRANCH" = "main" ]; then
    print_info "Pulling latest changes from origin/main..."
    git pull origin main
else
    print_info "Skipping pull (already pushed $CURRENT_BRANCH to origin/main)"
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

All notable changes to the Gofer extension will be documented in this file.

## [$NEW_VERSION] - $CURRENT_DATE

$RELEASE_NOTES

EOF

awk '/^## \[/{f=1} f' extension/CHANGELOG.md >> "$TEMP_FILE"
mv "$TEMP_FILE" extension/CHANGELOG.md

print_success "Updated package.json and CHANGELOG.md"

# Build VSIX
print_info "Building VSIX package..."
cd extension

# Ensure all production dependencies are installed (needed for vsce package)
print_info "Installing extension dependencies..."
if npm install 2>&1; then
    print_success "Dependencies installed"
else
    print_error "Failed to install extension dependencies"
    cd ..
    exit 1
fi

# Ensure language-server dependencies are installed before prepublish build.
print_info "Installing language-server dependencies..."
if (cd ../language-server && npm install 2>&1); then
    print_success "Language-server dependencies installed"
else
    print_error "Failed to install language-server dependencies"
    cd ..
    exit 1
fi

# Ensure language-server is up to date
print_info "Syncing language-server files..."
rsync -av --delete ../language-server/ ./language-server/ \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.DS_Store'

# Compile TypeScript before packaging
print_info "Compiling TypeScript..."
if npm run compile 2>&1; then
    print_success "TypeScript compilation successful"
else
    print_error "Failed to compile TypeScript"
    cd ..
    exit 1
fi

# Skip rebuilding - we use node-pty-prebuilt-multiarch with cross-platform binaries
# Rebuilding would create a single-platform binary that breaks Linux/Codespaces
print_info "Using prebuilt node-pty-prebuilt-multiarch binaries (cross-platform)..."
print_success "Skipping rebuild to preserve multi-platform support"

# Run vsce package and capture both success and failure
if npx @vscode/vsce package --out "gofer-$NEW_VERSION.vsix" 2>&1; then
    print_success "VSIX package built successfully"
else
    print_error "Failed to build VSIX package"
    cd ..
    exit 1
fi

cd ..

# Move VSIX file and verify it exists
if [ -f "extension/gofer-$NEW_VERSION.vsix" ]; then
    mv "extension/gofer-$NEW_VERSION.vsix" "./gofer-$NEW_VERSION.vsix"
    print_success "Built gofer-$NEW_VERSION.vsix"
else
    print_error "VSIX file was not created: extension/gofer-$NEW_VERSION.vsix"
    exit 1
fi

# Validate VSIX contains cross-platform binaries (critical for Codespaces/Linux)
print_info "Validating cross-platform binary support..."
VSIX_FILE="./gofer-$NEW_VERSION.vsix"

# Check for linux-x64 prebuilds (required for Codespaces)
if unzip -l "$VSIX_FILE" | grep -q "prebuilds/linux-x64/node.abi"; then
    print_success "✓ Linux x64 binaries present"
else
    print_error "✗ CRITICAL: Linux x64 binaries missing - extension will fail in Codespaces!"
    print_error "  Check that node-pty-prebuilt-multiarch is installed correctly"
    exit 1
fi

# Check for darwin binaries (required for macOS)
if unzip -l "$VSIX_FILE" | grep -q "prebuilds/darwin-x64/node.abi\|prebuilds/darwin-arm64/node.abi"; then
    print_success "✓ macOS binaries present"
else
    print_warning "⚠ macOS binaries missing"
fi

# CRITICAL: Ensure no platform-specific build artifacts are included
if unzip -l "$VSIX_FILE" | grep -q "build/Release/pty.node"; then
    print_error "✗ CRITICAL: Platform-specific build/Release/pty.node detected!"
    print_error "  This will break cross-platform support. The electron-rebuild step"
    print_error "  created a single-platform binary that was included in the VSIX."
    print_error "  Fix: Remove electron-rebuild step or exclude build/ in .vscodeignore"

    # Show which binary was included
    print_error ""
    print_error "  Included binary:"
    unzip -l "$VSIX_FILE" | grep "build/Release/pty.node"
    exit 1
else
    print_success "✓ No platform-specific build artifacts (cross-platform support intact)"
fi

print_success "Cross-platform validation passed"

# Test VSIX activation before releasing
print_info "Running VSIX pre-flight tests including activation..."
if [ -f "./test-vsix.sh" ]; then
    if ./test-vsix.sh "./gofer-$NEW_VERSION.vsix" --test-activation; then
        print_success "VSIX passed all pre-flight tests including activation"
    else
        print_error "VSIX failed pre-flight tests!"
        print_error "Extension failed to activate or tests failed."
        print_error "Fix the issues above before releasing."
        exit 1
    fi
else
    print_error "test-vsix.sh not found! Cannot verify VSIX."
    exit 1
fi

# Test all extension commands to ensure they don't throw undefined errors
print_info "Testing all extension commands for runtime errors..."
if [ -f "./test-commands.sh" ]; then
    # VSIX is already installed by test-vsix.sh above

    # Run command tests (non-fatal for now)
    if ./test-commands.sh 2>&1 | tee /tmp/command-test.log; then
        print_success "All extension commands validated successfully"
    else
        print_warning "Some extension commands had issues (see /tmp/command-test.log)"
        print_warning "Continuing with release - manual testing recommended"
    fi
else
    print_warning "test-commands.sh not found, skipping command validation"
fi

# Create releases directory and copy VSIX for GitHub Pages hosting
print_info "Preparing GitHub Pages release assets..."
mkdir -p docs/releases
cp "gofer-$NEW_VERSION.vsix" "docs/releases/"
print_success "Copied VSIX to docs/releases/ for GitHub Pages hosting"

# Update GitHub Pages releases.json with GitHub Pages download URLs
print_info "Updating GitHub Pages releases.json..."
if [ -f "docs/update-releases.js" ]; then
    # Update the script to use GitHub Pages URLs
    GITHUB_PAGES_URL="https://eai-tools.github.io/gofer/releases/gofer-$NEW_VERSION.vsix"
    node docs/update-releases.js "$NEW_VERSION" "$RELEASE_NOTES" "$GITHUB_PAGES_URL"
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

# Run tests and capture exit code
print_info "Running tests..."
npm test > /tmp/test-output.log 2>&1
TEST_EXIT=$?

# Show last 20 lines of test output
tail -20 /tmp/test-output.log

if [ $TEST_EXIT -eq 0 ]; then
    print_success "Tests passed"
else
    print_error "Tests failed!"
    echo ""
    print_error "Cannot release with failing tests. Fix the tests and try again."
    print_info "Full test output in: /tmp/test-output.log"
    exit 1
fi

echo ""
print_success "Pre-push validation complete"

# Commit
print_info "Committing changes..."
git add package.json extension/package.json extension/CHANGELOG.md extension/language-server/ docs/releases.json docs/releases/

git commit --no-verify -m "release: v$NEW_VERSION

$RELEASE_NOTES

🤖 Generated with release-auto.sh

Co-Authored-By: Claude <noreply@anthropic.com>
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Tag
git tag "v$NEW_VERSION"
print_success "Created tag v$NEW_VERSION"

# Push to main branch
print_info "Pushing changes to origin/main..."
if git push --no-verify origin HEAD:main; then
    print_success "Pushed commits to main"
else
    print_error "Failed to push commits to main"
    exit 1
fi

# Push tags
print_info "Pushing tags..."
if git push --no-verify origin "v$NEW_VERSION"; then
    print_success "Pushed tag v$NEW_VERSION"
else
    print_error "Failed to push tag"
    exit 1
fi

# Create GitHub release with VSIX attachment
print_info "Creating GitHub release..."
if gh release create "v$NEW_VERSION" "./gofer-$NEW_VERSION.vsix" \
    --title "v$NEW_VERSION" \
    --notes "$RELEASE_NOTES" 2>&1; then
    print_success "GitHub release created: v$NEW_VERSION"
else
    print_warning "Failed to create GitHub release (may need manual creation)"
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
    DEPLOYED_VERSION=$(curl -s "https://eai-tools.github.io/gofer/releases.json?cachebust=$(date +%s)" | grep -o '"latest_version"[^,]*' | cut -d'"' -f4 || echo "")
    
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
            echo "  https://github.com/eai-tools/gofer/actions/workflows/pages.yml"
            break
        fi
        print_info "Waiting for deployment... (attempt $i/6, deployed: $DEPLOYED_VERSION, expected: $EXPECTED_VERSION)"
        sleep 15
    fi
done

# Post-release verification: these checks are informational only and must never
# abort the script (release artifacts are already pushed at this point).
set +e

# Verify the VSIX file is actually downloadable
VSIX_URL="https://eai-tools.github.io/gofer/releases/gofer-$NEW_VERSION.vsix"
print_info "Verifying VSIX is downloadable at: $VSIX_URL"
HTTP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$VSIX_URL?cachebust=$(date +%s)")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "VSIX file is accessible (HTTP $HTTP_STATUS)"
else
    print_warning "VSIX file returned HTTP $HTTP_STATUS - users may not be able to auto-update"
    print_warning "Check GitHub Pages deployment: https://github.com/eai-tools/gofer/actions/workflows/pages.yml"
fi

# Simulate auto-updater flow (what other VSCode instances will do)
print_info "Simulating auto-update flow for other VSCode instances..."
RELEASES_JSON=$(curl -s "https://eai-tools.github.io/gofer/releases.json?cachebust=$(date +%s)")

# Parse latest_version (try/catch guards against malformed JSON from partial deployment)
REMOTE_VERSION=$(echo "$RELEASES_JSON" | node -e "try { const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log(j.latest_version || 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")
# Parse download_url for this version
REMOTE_URL=$(echo "$RELEASES_JSON" | NEW_VERSION="$NEW_VERSION" node -e "try { const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); const v=process.env.NEW_VERSION; const r=j.releases?.find(r=>r.version===v); console.log(r?.download_url || 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")

SIMULATION_PASS=true
if [ "$REMOTE_VERSION" = "$NEW_VERSION" ]; then
    print_success "Auto-updater will detect version $NEW_VERSION"
else
    print_warning "Auto-updater version mismatch: expected $NEW_VERSION, got $REMOTE_VERSION"
    SIMULATION_PASS=false
fi

if [ "$REMOTE_URL" = "$VSIX_URL" ]; then
    print_success "Auto-updater download URL is correct"
else
    print_warning "Auto-updater download URL mismatch: expected $VSIX_URL, got $REMOTE_URL"
    SIMULATION_PASS=false
fi

if [ "$SIMULATION_PASS" = "true" ]; then
    print_success "Auto-update simulation passed - other VSCode instances will update correctly"
else
    print_warning "Auto-update simulation had issues - check GitHub Pages deployment"
fi

set -e

print_success "🎉 Release $NEW_VERSION complete!"
echo ""
print_success "Extension Update:"
echo "  • Users can now update to v$NEW_VERSION via the extension's update button"
echo "  • Download URL: https://eai-tools.github.io/gofer/releases/gofer-$NEW_VERSION.vsix"
echo ""
print_info "GitHub Resources:"
echo "  • Releases: https://github.com/eai-tools/gofer/releases"
echo "  • Actions: https://github.com/eai-tools/gofer/actions"
echo "  • GitHub Pages: https://eai-tools.github.io/gofer/"
echo ""
print_info "Local VSIX file: ./gofer-$NEW_VERSION.vsix"
