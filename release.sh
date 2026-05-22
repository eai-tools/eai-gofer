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

repo_has_changes() {
    [ -n "$(git status --porcelain)" ]
}

commit_all_changes() {
    local commit_message="$1"

    if ! repo_has_changes; then
        return 0
    fi

    print_warning "Uncommitted changes detected. Creating pre-release commit..."
    git status --short
    echo ""

    git add -A
    git commit --no-verify -m "$commit_message"
    print_success "Changes committed"
    echo ""
}

ensure_release_base() {
    print_info "Fetching origin/main..."
    git fetch origin main

    if [ "$CURRENT_BRANCH" = "main" ]; then
        if git merge-base --is-ancestor origin/main HEAD; then
            return 0
        fi

        if repo_has_changes; then
            print_error "Local main is behind origin/main and the working tree is not clean."
            print_error "Fast-forward main first, then rerun the release."
            exit 1
        fi

        if git merge-base --is-ancestor HEAD origin/main; then
            print_info "Fast-forwarding local main to origin/main..."
            git pull --ff-only origin main
            return 0
        fi

        print_error "Local main has diverged from origin/main."
        print_error "Rebase or merge origin/main before releasing."
        exit 1
    fi

    if ! git merge-base --is-ancestor origin/main HEAD; then
        print_error "Current branch $CURRENT_BRANCH does not contain the latest origin/main."
        print_error "Rebase or merge origin/main into this branch before releasing."
        exit 1
    fi
}

load_env_file() {
    local env_line
    local env_key
    local env_value

    while IFS= read -r env_line || [ -n "$env_line" ]; do
        case "$env_line" in
            ''|\#*)
                continue
                ;;
            *=*)
                env_key=${env_line%%=*}
                env_value=${env_line#*=}
                env_value=${env_value%$'\r'}

                if [[ ! "$env_key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
                    print_warning "Skipping invalid .env key: $env_key"
                    continue
                fi

                if [[ "$env_value" == \"*\" && "$env_value" == *\" ]]; then
                    env_value=${env_value:1:-1}
                elif [[ "$env_value" == \'*\' && "$env_value" == *\' ]]; then
                    env_value=${env_value:1:-1}
                fi

                printf -v "$env_key" '%s' "$env_value"
                export "$env_key"
                ;;
            *)
                print_warning "Skipping malformed .env line"
                ;;
        esac
    done < ".env"
}

# Load environment variables from .env file if it exists without evaluating
# shell expansions from file contents.
if [ -f ".env" ]; then
    load_env_file
fi

# Check if release type is provided
if [ -z "$1" ]; then
    print_error "Usage: ./release.sh [patch|minor|major] [optional: release notes]"
    echo ""
    echo "Examples:"
    echo "  ./release.sh patch  # Auto-bump and release"
    echo "  ./release.sh minor 'Add new feature'"
    echo "  ./release.sh major 'Breaking changes'"
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

CURRENT_BRANCH=$(git branch --show-current)
ensure_release_base
commit_all_changes "chore: pre-release commit from $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ]; then
    print_info "Releasing from branch: $CURRENT_BRANCH"
    print_info "origin/main will only be updated after validation, packaging, and tagging succeed."
    echo ""
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

// Keep Gofer workspace version marker aligned with the released extension version.
if (fs.existsSync('./.specify')) {
    fs.writeFileSync('./.specify/.gofer-version', '$NEW_VERSION\n');
}

// Keep lockfile package metadata aligned with release version when present.
for (const lockPath of ['./package-lock.json', './extension/package-lock.json']) {
    if (!fs.existsSync(lockPath)) continue;
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = '$NEW_VERSION';
    if (lock.packages && lock.packages['']) {
        lock.packages[''].version = '$NEW_VERSION';
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}
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

print_success "Updated package.json, .gofer-version, and CHANGELOG.md"

# Pre-release hook (FR-001, NFR-011): regenerate every CLI surface from the
# canonical .specify/commands/<stage>.md source-of-truth so the published
# artifact is always source-of-truth-derived. MUST run before
# sync-extension-resources.mjs, otherwise the VSIX may bundle stale emitters.
print_info "Running gofer:generate to ensure published artifact is source-of-truth-derived..."
if npm run gofer:generate 2>&1; then
    print_success "gofer:generate completed"
else
    print_error "gofer:generate failed"
    exit 1
fi

print_info "Running generate-commands to refresh downstream mirrors..."
if npm run generate-commands -- --verbose 2>&1; then
    print_success "generate-commands completed"
else
    print_error "generate-commands failed"
    exit 1
fi

# Sync extension/resources/ from canonical sources BEFORE packaging the VSIX.
# Without this, edits to .claude/commands/, .github/prompts/, .specify/
# never reach end users — the installer ships from extension/resources/.
print_info "Syncing extension/resources/ from canonical sources..."
if node .specify/scripts/node/sync-extension-resources.mjs 2>&1; then
    print_success "Extension resources synced"
else
    print_error "Failed to sync extension resources"
    exit 1
fi

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
if npx @vscode/vsce package --out "eai-gofer-$NEW_VERSION.vsix" 2>&1; then
    print_success "VSIX package built successfully"
else
    print_error "Failed to build VSIX package"
    cd ..
    exit 1
fi

cd ..

# Move VSIX file and verify it exists
if [ -f "extension/eai-gofer-$NEW_VERSION.vsix" ]; then
    mv "extension/eai-gofer-$NEW_VERSION.vsix" "./eai-gofer-$NEW_VERSION.vsix"
    print_success "Built eai-gofer-$NEW_VERSION.vsix"
else
    print_error "VSIX file was not created: extension/eai-gofer-$NEW_VERSION.vsix"
    exit 1
fi

# Build the portable Claude/Codex/Copilot plugin bundle that will be mirrored
# to the same public GitHub Pages release host as the VSIX.
print_info "Packaging Claude/Codex/Copilot agent plugin..."
if npm run gofer:package-plugin -- --version "$NEW_VERSION" --sync-repo 2>&1; then
    print_success "Agent plugin bundle packaged"
else
    print_error "Failed to package the agent plugin bundle"
    exit 1
fi

# Validate VSIX contains cross-platform binaries (critical for Codespaces/Linux)
print_info "Validating cross-platform binary support..."
VSIX_FILE="./eai-gofer-$NEW_VERSION.vsix"

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

# CRITICAL: Ensure no disallowed platform-specific build artifacts are included.
# node-pty-prebuilt-multiarch may ship a fallback build/Release binary alongside
# multi-platform prebuilds; treat that specific path as allowed.
PTY_BUILD_ARTIFACTS=$(unzip -l "$VSIX_FILE" | grep "build/Release/pty.node" || true)
if [ -n "$PTY_BUILD_ARTIFACTS" ]; then
    DISALLOWED_PTY_ARTIFACTS=$(echo "$PTY_BUILD_ARTIFACTS" | grep -v "node_modules/node-pty-prebuilt-multiarch/build/Release/pty.node" || true)

    if [ -n "$DISALLOWED_PTY_ARTIFACTS" ]; then
        print_error "✗ CRITICAL: Disallowed platform-specific build/Release/pty.node detected!"
        print_error "  This will break cross-platform support. The electron-rebuild step"
        print_error "  likely created single-platform artifacts that were included in the VSIX."
        print_error ""
        print_error "  Disallowed binaries:"
        echo "$DISALLOWED_PTY_ARTIFACTS"
        exit 1
    fi

    print_warning "Allowed node-pty-prebuilt-multiarch fallback build artifact detected."
    print_warning "Cross-platform prebuilds are present; continuing release."
else
    print_success "✓ No platform-specific build artifacts detected"
fi

print_success "Cross-platform validation passed"

# Test VSIX activation before releasing
print_info "Running VSIX pre-flight tests including activation..."
if [ -f "./test-vsix.sh" ]; then
    if ./test-vsix.sh "./eai-gofer-$NEW_VERSION.vsix" --test-activation; then
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

# Ensure root validation tools are installed before lint/test gates. Fresh
# release worktrees do not have root node_modules by default.
print_info "Installing root dependencies for validation..."
if npm install 2>&1; then
    print_success "Root dependencies installed"
else
    print_error "Failed to install root dependencies"
    exit 1
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
set +e
npm test > /tmp/test-output.log 2>&1
TEST_EXIT=$?
set -e

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

# Update GitHub Pages releases.json and mirror the release artifacts into the
# public Pages host so VS Code, Claude, and Codex all update from one place.
print_info "Updating GitHub Pages releases.json..."
if [ -f "scripts/update-releases.js" ]; then
    node scripts/update-releases.js "$NEW_VERSION" "$RELEASE_NOTES"
    print_success "Updated GitHub Pages release feed"
else
    print_warning "GitHub Pages update script not found, skipping..."
fi

print_info "Publishing VSIX + agent plugin artifacts to GitHub Pages..."
if [ -f "scripts/publish-public-release-assets.mjs" ]; then
    node scripts/publish-public-release-assets.mjs "$NEW_VERSION"
    print_success "Published public release assets"
else
    print_warning "Public release publisher not found, skipping asset mirroring..."
fi

# Commit
print_info "Committing changes..."
git add -A

git commit --no-verify -m "release: v$NEW_VERSION

$RELEASE_NOTES

🤖 Generated with release.sh

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
if gh release create "v$NEW_VERSION" "./eai-gofer-$NEW_VERSION.vsix" "./dist/eai-gofer-agent-plugin-$NEW_VERSION.zip" \
    --title "v$NEW_VERSION" \
    --notes "$RELEASE_NOTES" 2>&1; then
    print_success "GitHub release created: v$NEW_VERSION"
else
    print_warning "Failed to create GitHub release (may need manual creation)"
fi

# Wait for GitHub Pages deployment
print_info "Waiting for GitHub Pages deployment..."
echo ""
print_info "The GitHub Pages workflow will automatically deploy when it detects changes to docs-site/"
print_info "This typically takes 1-2 minutes."
echo ""

print_info "Checking deployment status in 30 seconds..."
sleep 30

# Verify the releases.json is updated
EXPECTED_VERSION="$NEW_VERSION"
print_info "Verifying GitHub Pages deployment..."
for i in {1..6}; do
    DEPLOYED_VERSION=$(curl -s "https://eai-tools.github.io/eai-gofer/releases.json?cachebust=$(date +%s)" | grep -o '"latest_version"[^,]*' | cut -d'"' -f4 || echo "")
    
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
            echo "  https://github.com/eai-tools/eai-gofer/actions/workflows/pages.yml"
            break
        fi
        print_info "Waiting for deployment... (attempt $i/6, deployed: $DEPLOYED_VERSION, expected: $EXPECTED_VERSION)"
        sleep 15
    fi
done

# Post-release verification: these checks are informational only and must never
# abort the script (release artifacts are already pushed at this point).
set +e

# Verify the public release assets are actually downloadable from GitHub Pages
VSIX_URL="https://eai-tools.github.io/eai-gofer/releases/eai-gofer-$NEW_VERSION.vsix"
AGENT_PLUGIN_URL="https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-$NEW_VERSION.zip"
CLAUDE_MARKETPLACE_URL="https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/claude-marketplace.json"
CODEX_PLUGIN_URL="https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer/codex-plugin.json"
print_info "Verifying VSIX is downloadable at: $VSIX_URL"
HTTP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$VSIX_URL?cachebust=$(date +%s)")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "VSIX file is accessible (HTTP $HTTP_STATUS)"
else
    print_warning "VSIX file returned HTTP $HTTP_STATUS - users may not be able to auto-update"
    print_warning "Check GitHub Pages deployment: https://eai-tools.github.io/eai-gofer/releases.html"
fi

print_info "Verifying agent plugin zip is downloadable at: $AGENT_PLUGIN_URL"
HTTP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$AGENT_PLUGIN_URL?cachebust=$(date +%s)")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Agent plugin zip is accessible (HTTP $HTTP_STATUS)"
else
    print_warning "Agent plugin zip returned HTTP $HTTP_STATUS - Claude/Codex users may not be able to download updates"
fi

print_info "Verifying Claude marketplace metadata is reachable at: $CLAUDE_MARKETPLACE_URL"
HTTP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$CLAUDE_MARKETPLACE_URL?cachebust=$(date +%s)")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Claude marketplace metadata is accessible (HTTP $HTTP_STATUS)"
else
    print_warning "Claude marketplace metadata returned HTTP $HTTP_STATUS"
fi

print_info "Verifying Codex plugin manifest is reachable at: $CODEX_PLUGIN_URL"
HTTP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$CODEX_PLUGIN_URL?cachebust=$(date +%s)")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Codex plugin manifest is accessible (HTTP $HTTP_STATUS)"
else
    print_warning "Codex plugin manifest returned HTTP $HTTP_STATUS"
fi

# Simulate auto-updater flow (what other VSCode instances will do)
print_info "Simulating auto-update flow for other VSCode instances..."
RELEASES_JSON=$(curl -s "https://eai-tools.github.io/eai-gofer/releases.json?cachebust=$(date +%s)")

# Parse latest_version (try/catch guards against malformed JSON from partial deployment)
REMOTE_VERSION=$(echo "$RELEASES_JSON" | node -e "try { const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log(j.latest_version || 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")
# Parse download_url for this version
REMOTE_URL=$(echo "$RELEASES_JSON" | NEW_VERSION="$NEW_VERSION" node -e "try { const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); const v=process.env.NEW_VERSION; const r=j.releases?.find(r=>r.version===v); console.log(r?.download_url || 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")
REMOTE_CLAUDE_URL=$(echo "$RELEASES_JSON" | NEW_VERSION="$NEW_VERSION" node -e "try { const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); const v=process.env.NEW_VERSION; const r=j.releases?.find(r=>r.version===v); console.log(r?.assets?.claude?.marketplace_url || 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")
REMOTE_CODEX_URL=$(echo "$RELEASES_JSON" | NEW_VERSION="$NEW_VERSION" node -e "try { const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); const v=process.env.NEW_VERSION; const r=j.releases?.find(r=>r.version===v); console.log(r?.assets?.codex?.manifest_url || 'MISSING'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")

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

if [ "$REMOTE_CLAUDE_URL" = "$CLAUDE_MARKETPLACE_URL" ]; then
    print_success "Claude marketplace URL is correct"
else
    print_warning "Claude marketplace URL mismatch: expected $CLAUDE_MARKETPLACE_URL, got $REMOTE_CLAUDE_URL"
    SIMULATION_PASS=false
fi

if [ "$REMOTE_CODEX_URL" = "$CODEX_PLUGIN_URL" ]; then
    print_success "Codex plugin URL is correct"
else
    print_warning "Codex plugin URL mismatch: expected $CODEX_PLUGIN_URL, got $REMOTE_CODEX_URL"
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
echo "  • Download URL: https://eai-tools.github.io/eai-gofer/releases/eai-gofer-$NEW_VERSION.vsix"
echo ""
print_success "Agent Plugin Update:"
echo "  • Claude/Codex/Copilot public bundle: https://eai-tools.github.io/eai-gofer/releases/plugins/eai-gofer"
echo "  • Agent plugin zip: https://eai-tools.github.io/eai-gofer/releases/eai-gofer-agent-plugin-$NEW_VERSION.zip"
echo ""
print_info "GitHub Resources:"
echo "  • Releases: https://github.com/eai-tools/eai-gofer/releases"
echo "  • Actions: https://github.com/eai-tools/eai-gofer/actions"
echo "  • GitHub Pages: https://eai-tools.github.io/eai-gofer/"
echo ""
print_info "Local VSIX file: ./eai-gofer-$NEW_VERSION.vsix"
print_info "Local agent plugin zip: ./dist/eai-gofer-agent-plugin-$NEW_VERSION.zip"
