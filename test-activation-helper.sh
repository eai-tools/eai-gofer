#!/bin/bash

# Helper script to test VSIX activation independently of VSCode
# This script is designed to be run from a separate process, not from within VSCode

set -e

VSIX_PATH="$1"
WORKSPACE_PATH="$2"

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

if [ -z "$VSIX_PATH" ] || [ -z "$WORKSPACE_PATH" ]; then
    print_error "Usage: $0 <vsix_path> <workspace_path>"
    exit 1
fi

# Find VSCode CLI
CODE_BIN=""
if command -v code &> /dev/null; then
    CODE_BIN="code"
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
    print_error "VSCode CLI not found"
    exit 1
fi

# Step 1: Close VSCode
if pgrep -f "Visual Studio Code" > /dev/null; then
    print_info "Closing VSCode..."
    osascript -e 'quit app "Visual Studio Code"' 2>/dev/null || true
    sleep 3

    # Wait for VSCode to close
    WAIT_COUNT=0
    while pgrep -f "Visual Studio Code" > /dev/null && [ $WAIT_COUNT -lt 15 ]; do
        print_info "Waiting for VSCode to close... ($WAIT_COUNT/15)"
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done

    if pgrep -f "Visual Studio Code" > /dev/null; then
        print_error "VSCode did not close after 15 seconds"
        exit 1
    fi
    print_success "VSCode closed"
fi

# Step 2: Install extension
print_info "Installing extension..."
if ! $CODE_BIN --install-extension "$VSIX_PATH" --force > /dev/null 2>&1; then
    print_error "Failed to install extension"
    exit 1
fi
print_success "Extension installed"

# Step 3: Open VSCode and wait for activation
print_info "Opening VSCode..."
open -a "Visual Studio Code" "$WORKSPACE_PATH"

print_info "Waiting for VSCode to start and activate extension (20 seconds)..."
sleep 20

# Step 4: Check logs
LOG_DIR="$HOME/Library/Application Support/Code/logs"
if [ ! -d "$LOG_DIR" ]; then
    print_error "Log directory not found"
    exit 1
fi

LATEST_LOG=$(ls -t "$LOG_DIR" | head -1)
EXTHOST_LOGS=$(find "$LOG_DIR/$LATEST_LOG" -name "exthost.log" 2>/dev/null)

if [ -z "$EXTHOST_LOGS" ]; then
    print_error "No extension host logs found"
    exit 1
fi

print_info "Checking logs: $LOG_DIR/$LATEST_LOG"

ACTIVATION_ERRORS=0
ACTIVATION_SUCCESS=0

for log in $EXTHOST_LOGS; do
    if grep -q "Activating extension EnterpriseAI.specgofer failed" "$log"; then
        print_error "Extension activation FAILED!"
        echo ""
        grep -A 10 "Activating extension EnterpriseAI.specgofer failed" "$log"
        ACTIVATION_ERRORS=1
    fi

    if grep -q "ExtensionService#_doActivateExtension EnterpriseAI.specgofer" "$log"; then
        ACTIVATION_SUCCESS=1
    fi
done

if [ $ACTIVATION_ERRORS -eq 1 ]; then
    print_error "VSIX activation test FAILED"
    exit 1
fi

if [ $ACTIVATION_SUCCESS -eq 1 ]; then
    print_success "Extension activated successfully!"
    exit 0
else
    print_warning "Could not confirm activation in logs"
    exit 1
fi
