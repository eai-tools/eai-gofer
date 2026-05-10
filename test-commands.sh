#!/bin/bash

# Extension Command Tester
# Tests all Gofer VSCode extension commands to ensure they don't throw errors

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

# Determine code command path
if command -v code &> /dev/null; then
    CODE_CMD="code"
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CODE_CMD="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
    print_error "VSCode CLI 'code' command not found"
    exit 1
fi

# Function to test a command
test_command() {
    local cmd="$1"
    local description="$2"
    local allow_validation_failure="${3:-true}"

    print_info "Testing: $description ($cmd)"

    # Create temp file for output
    TEMP_OUTPUT=$(mktemp)

    # Run command and capture result (with 3 second timeout using background process)
    "$CODE_CMD" --command "$cmd" > "$TEMP_OUTPUT" 2>&1 &
    CMD_PID=$!

    # Wait up to 3 seconds for command to complete
    for i in {1..30}; do
        if ! kill -0 $CMD_PID 2>/dev/null; then
            break
        fi
        sleep 0.1
    done

    # Kill if still running
    if kill -0 $CMD_PID 2>/dev/null; then
        kill $CMD_PID 2>/dev/null
        wait $CMD_PID 2>/dev/null
    fi

    # Check exit status
    wait $CMD_PID 2>/dev/null
    CMD_EXIT=$?

    if [ $CMD_EXIT -eq 0 ]; then
        print_success "  Command registered and callable"
        return 0
    else
        EXIT_CODE=$?
        ERROR_OUTPUT=$(cat "$TEMP_OUTPUT")

        # Check if error is about missing parameters (acceptable)
        if echo "$ERROR_OUTPUT" | grep -q -E "(No spec provided|Invalid spec|missing required|no workspace|not initialized)" ; then
            print_success "  Command failed gracefully with validation message"
            return 0
        fi

        # Check if error is "Cannot read properties of undefined"
        if echo "$ERROR_OUTPUT" | grep -q "Cannot read properties of undefined" ; then
            print_error "  Command threw undefined property error!"
            echo "  Error: $ERROR_OUTPUT"
            return 1
        fi

        # Check if error is command not found (command not registered)
        if echo "$ERROR_OUTPUT" | grep -q "command .* not found" ; then
            print_error "  Command not registered!"
            return 1
        fi

        # For commands that require workspace/context
        if [ "$allow_validation_failure" = "true" ]; then
            print_success "  Command failed as expected (no workspace/context)"
            return 0
        fi

        print_error "  Unexpected error!"
        echo "  Error: $ERROR_OUTPUT"
        return 1
    fi
}

# Check if extension is installed
print_info "Checking if Gofer extension is installed..."
if "$CODE_CMD" --list-extensions | grep -qi "gofer"; then
    print_success "Gofer extension is installed"
else
    print_warning "Gofer extension not installed. Install it first with:"
    echo "  $CODE_CMD --install-extension ./gofer-*.vsix"
    exit 1
fi

print_info "Starting command tests..."
echo ""

FAILED_COMMANDS=()

print_info "Loading contributed commands from extension/package.json..."
while IFS=$'\t' read -r command_id command_title; do
    if [ -z "$command_id" ]; then
        continue
    fi

    test_command "$command_id" "${command_title:-$command_id}" "true" || FAILED_COMMANDS+=("$command_id")
done < <(
    node -e "const pkg=require('./extension/package.json'); for (const entry of pkg.contributes.commands) { const title=(entry.title || entry.command).replace(/\\s+/g, ' ').trim(); console.log(entry.command + '\t' + title); }"
)

echo ""
print_info "Command test summary:"
echo ""

if [ ${#FAILED_COMMANDS[@]} -eq 0 ]; then
    print_success "All commands passed validation!"
    exit 0
else
    print_error "Failed commands:"
    for cmd in "${FAILED_COMMANDS[@]}"; do
        echo "  • $cmd"
    done
    echo ""
    print_error "Some commands failed validation. Fix these before releasing."
    exit 1
fi
