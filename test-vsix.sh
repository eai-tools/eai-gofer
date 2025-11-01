#!/bin/bash

# Test VSIX before release
# Usage: ./test-vsix.sh path/to/specgofer-x.x.x.vsix

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

if [ -z "$1" ]; then
    print_error "Usage: ./test-vsix.sh path/to/specgofer-x.x.x.vsix"
    exit 1
fi

VSIX_PATH="$1"

if [ ! -f "$VSIX_PATH" ]; then
    print_error "VSIX file not found: $VSIX_PATH"
    exit 1
fi

print_info "Testing VSIX: $VSIX_PATH"
echo ""

# Extract version from filename
VERSION=$(basename "$VSIX_PATH" | sed 's/specgofer-//' | sed 's/.vsix//')
print_info "Version: $VERSION"

# 1. Check VSIX structure
print_info "Checking VSIX structure..."
TEMP_DIR=$(mktemp -d)
unzip -q "$VSIX_PATH" -d "$TEMP_DIR"

# Check for required files
REQUIRED_FILES=(
    "extension/dist/extension.js"
    "extension/package.json"
    "extension.vsixmanifest"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$TEMP_DIR/$file" ]; then
        print_error "Missing required file: $file"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
done
print_success "VSIX structure is valid"

# 2. Check extension.js size
EXT_SIZE=$(ls -lh "$TEMP_DIR/extension/dist/extension.js" | awk '{print $5}')
print_info "extension.js size: $EXT_SIZE"

if [ -f "$TEMP_DIR/extension/dist/extension.js" ]; then
    # Check if extension.js is too small (indicates it might not be compiled)
    SIZE_BYTES=$(wc -c < "$TEMP_DIR/extension/dist/extension.js")
    if [ $SIZE_BYTES -lt 500000 ]; then
        print_warning "extension.js seems small ($EXT_SIZE). Expected >500KB"
    else
        print_success "extension.js size looks good"
    fi
fi

# 3. Check for critical commands in compiled code
print_info "Checking for critical commands..."
COMMANDS=("refreshSpecs" "updateNow" "checkForUpdates" "initialize")
MISSING_COMMANDS=()

for cmd in "${COMMANDS[@]}"; do
    if grep -q "specGofer\.$cmd" "$TEMP_DIR/extension/dist/extension.js"; then
        print_success "Found command: specGofer.$cmd"
    else
        print_error "Missing command: specGofer.$cmd"
        MISSING_COMMANDS+=("$cmd")
    fi
done

if [ ${#MISSING_COMMANDS[@]} -gt 0 ]; then
    print_error "Missing ${#MISSING_COMMANDS[@]} critical commands!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 4. Verify package.json version matches
PKG_VERSION=$(grep '"version"' "$TEMP_DIR/extension/package.json" | head -1 | sed 's/.*: "\(.*\)".*/\1/')
if [ "$PKG_VERSION" != "$VERSION" ]; then
    print_error "Version mismatch: package.json has $PKG_VERSION, but VSIX is $VERSION"
    rm -rf "$TEMP_DIR"
    exit 1
fi
print_success "Version matches: $VERSION"

# 5. Check main entry point
MAIN_ENTRY=$(grep '"main"' "$TEMP_DIR/extension/package.json" | sed 's/.*: "\(.*\)".*/\1/')
if [ "$MAIN_ENTRY" != "./dist/extension.js" ]; then
    print_error "Main entry point is incorrect: $MAIN_ENTRY (expected ./dist/extension.js)"
    rm -rf "$TEMP_DIR"
    exit 1
fi
print_success "Main entry point is correct: $MAIN_ENTRY"

# Cleanup
rm -rf "$TEMP_DIR"

# 6. Install VSIX and check activation logs (optional, requires --test-activation flag)
if [ "$2" == "--test-activation" ]; then
    print_info "Installing VSIX and checking activation..."

    # Find VSCode CLI
    CODE_BIN=""
    if command -v code &> /dev/null; then
        CODE_BIN="code"
    elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
        CODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
    else
        print_error "VSCode CLI not found. Skipping activation test."
        exit 1
    fi

    # Detect if running from VSCode integrated terminal
    if [ -n "$VSCODE_PID" ] || [ -n "$TERM_PROGRAM" ] && [ "$TERM_PROGRAM" = "vscode" ]; then
        print_error "Cannot run activation test from VSCode's integrated terminal!"
        print_error "VSCode would be closed, killing this script."
        echo ""
        print_info "To run the full activation test, execute this from an EXTERNAL terminal:"
        echo ""
        echo "  # Open Terminal.app or iTerm2, then run:"
        ABS_VSIX_PATH=$(cd "$(dirname "$VSIX_PATH")" && pwd)/$(basename "$VSIX_PATH")
        echo "  cd $PWD"
        echo "  ./test-activation-helper.sh \"$ABS_VSIX_PATH\" \"$PWD\""
        echo ""
        print_warning "Skipping activation test. Structural checks passed."
        print_warning "The VSIX is ready, but activation has NOT been tested."
        exit 0
    fi

    # Use helper script to test activation independently
    HELPER_SCRIPT="$(dirname "$0")/test-activation-helper.sh"

    if [ ! -f "$HELPER_SCRIPT" ]; then
        print_error "Helper script not found: $HELPER_SCRIPT"
        exit 1
    fi

    print_info "Launching independent activation test..."
    print_warning "This will close and restart VSCode to test activation."

    # Get absolute path to VSIX
    ABS_VSIX_PATH=$(cd "$(dirname "$VSIX_PATH")" && pwd)/$(basename "$VSIX_PATH")

    # Run helper script and capture output
    if bash "$HELPER_SCRIPT" "$ABS_VSIX_PATH" "$PWD"; then
        print_success "Activation test passed!"
    else
        print_error "Activation test FAILED!"
        exit 1
    fi

    echo ""
    print_success "✅ All automated checks passed!"
    echo ""
    print_warning "⚠️  Manual command testing still recommended:"
    echo "  1. Reload VSCode: Command Palette → 'Developer: Reload Window'"
    echo "  2. Test commands:"
    echo "     - SpecGofer: Initialize"
    echo "     - SpecGofer: Check for Updates"
    echo "     - SpecGofer: Refresh Specs"
    echo "     - Click 'Update Now' button in SpecGofer view"
else
    echo ""
    print_success "✅ All pre-flight checks passed!"
    echo ""
    print_warning "⚠️  Manual testing required:"
    echo "  1. Install VSIX: code --install-extension \"$VSIX_PATH\""
    echo "  2. Reload VSCode: Command Palette → 'Developer: Reload Window'"
    echo "  3. Test commands:"
    echo "     - SpecGofer: Initialize"
    echo "     - SpecGofer: Check for Updates"
    echo "     - SpecGofer: Refresh Specs"
    echo "     - Click 'Update Now' button in SpecGofer view"
    echo ""
    print_info "Run with --test-activation flag to automatically install and check logs"
fi

echo ""
print_info "If all commands work, the VSIX is ready for release!"
