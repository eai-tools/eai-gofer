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
    local expect_fail="${3:-false}"

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
        if [ "$expect_fail" = "true" ]; then
            print_warning "  Command succeeded but was expected to fail gracefully"
            cat "$TEMP_OUTPUT"
            return 1
        else
            print_success "  Command registered and callable"
            return 0
        fi
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
        if [ "$expect_fail" = "true" ]; then
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

# Core initialization commands
test_command "gofer.initialize" "Initialize Spec Kit structure" "true" || FAILED_COMMANDS+=("gofer.initialize")
test_command "gofer.upgrade" "Upgrade to latest version" "true" || FAILED_COMMANDS+=("gofer.upgrade")

# Spec management commands
test_command "gofer.createSpec" "Create new spec" "true" || FAILED_COMMANDS+=("gofer.createSpec")
test_command "gofer.generatePlan" "Generate plan for spec" "true" || FAILED_COMMANDS+=("gofer.generatePlan")
test_command "gofer.generateTasks" "Generate tasks from spec" "true" || FAILED_COMMANDS+=("gofer.generateTasks")
test_command "gofer.executeTasks" "Execute spec tasks" "true" || FAILED_COMMANDS+=("gofer.executeTasks")
test_command "gofer.validateSpec" "Validate spec structure" "true" || FAILED_COMMANDS+=("gofer.validateSpec")
test_command "gofer.checkDependencies" "Check spec dependencies" "true" || FAILED_COMMANDS+=("gofer.checkDependencies")

# Autonomous execution commands
test_command "gofer.startAutonomous" "Start autonomous execution" "true" || FAILED_COMMANDS+=("gofer.startAutonomous")
test_command "gofer.stopAutonomous" "Stop autonomous execution" "true" || FAILED_COMMANDS+=("gofer.stopAutonomous")
test_command "gofer.pauseAutonomous" "Pause autonomous execution" "true" || FAILED_COMMANDS+=("gofer.pauseAutonomous")
test_command "gofer.resumeAutonomous" "Resume autonomous execution" "true" || FAILED_COMMANDS+=("gofer.resumeAutonomous")

# View commands
test_command "gofer.refreshProgress" "Refresh progress view" "true" || FAILED_COMMANDS+=("gofer.refreshProgress")
test_command "gofer.showTaskDetails" "Show task details" "true" || FAILED_COMMANDS+=("gofer.showTaskDetails")
test_command "gofer.markTaskComplete" "Mark task as complete" "true" || FAILED_COMMANDS+=("gofer.markTaskComplete")
test_command "gofer.openSpecFile" "Open spec file" "true" || FAILED_COMMANDS+=("gofer.openSpecFile")
test_command "gofer.openPlanFile" "Open plan file" "true" || FAILED_COMMANDS+=("gofer.openPlanFile")
test_command "gofer.openTasksFile" "Open tasks file" "true" || FAILED_COMMANDS+=("gofer.openTasksFile")

# Constitution commands
test_command "gofer.editConstitution" "Edit constitution" "true" || FAILED_COMMANDS+=("gofer.editConstitution")
test_command "gofer.validateConstitution" "Validate constitution" "true" || FAILED_COMMANDS+=("gofer.validateConstitution")

# Memory commands
test_command "gofer.openMemoryFile" "Open memory file" "true" || FAILED_COMMANDS+=("gofer.openMemoryFile")
test_command "gofer.clearMemory" "Clear memory" "true" || FAILED_COMMANDS+=("gofer.clearMemory")
test_command "gofer.exportMemory" "Export memory" "true" || FAILED_COMMANDS+=("gofer.exportMemory")

# Utility commands
test_command "gofer.checkForUpdates" "Check for updates" || FAILED_COMMANDS+=("gofer.checkForUpdates")
test_command "gofer.openDocumentation" "Open documentation" || FAILED_COMMANDS+=("gofer.openDocumentation")
test_command "gofer.showWelcome" "Show welcome message" || FAILED_COMMANDS+=("gofer.showWelcome")

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