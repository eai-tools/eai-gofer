#!/bin/bash

# SpecGofer Extension Packaging Script
# Builds and packages the VSCode extension for distribution

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
EXTENSION_DIR="$ROOT_DIR/extension"
LANGUAGE_SERVER_DIR="$ROOT_DIR/language-server"
DIST_DIR="$ROOT_DIR/dist"

# Default options
CLEAN_BUILD=false
RUN_TESTS=true
SKIP_CHECKS=false
OUTPUT_DIR="$DIST_DIR"
VERSION=""

# Help function
show_help() {
    cat << EOF
SpecGofer Extension Packaging Script

Usage: $0 [OPTIONS]

OPTIONS:
    -c, --clean         Clean build (remove all generated files first)
    -t, --skip-tests    Skip running tests
    -s, --skip-checks   Skip linting and validation checks
    -o, --output DIR    Output directory for VSIX file (default: ./dist)
    -v, --version VER   Set specific version (e.g., 1.0.0)
    -h, --help          Show this help message

EXAMPLES:
    $0                          # Standard build
    $0 --clean --output ./build # Clean build with custom output
    $0 --version 1.2.3 --skip-tests # Version bump without tests

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        -t|--skip-tests)
            RUN_TESTS=false
            shift
            ;;
        -s|--skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Utility functions
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    print_step "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    # Check vsce
    if ! command -v vsce &> /dev/null; then
        print_warning "vsce not found, installing globally..."
        npm install -g @vscode/vsce
    fi
    
    print_success "All dependencies available"
}

clean_build() {
    if [ "$CLEAN_BUILD" = true ]; then
        print_step "Cleaning previous builds..."
        
        # Remove dist directories
        rm -rf "$EXTENSION_DIR/dist"
        rm -rf "$EXTENSION_DIR/out"
        rm -rf "$LANGUAGE_SERVER_DIR/dist"
        rm -rf "$DIST_DIR"
        
        # Remove node_modules if requested
        if [ "$SKIP_CHECKS" = false ]; then
            print_step "Removing node_modules for clean install..."
            rm -rf "$EXTENSION_DIR/node_modules"
            rm -rf "$LANGUAGE_SERVER_DIR/node_modules"
            rm -rf "$ROOT_DIR/node_modules"
        fi
        
        print_success "Clean completed"
    fi
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Install root dependencies
    cd "$ROOT_DIR"
    npm ci
    
    # Install language server dependencies
    cd "$LANGUAGE_SERVER_DIR"
    npm ci
    
    # Install extension dependencies
    cd "$EXTENSION_DIR"
    npm ci
    
    print_success "Dependencies installed"
}

build_language_server() {
    print_step "Building Language Server..."
    
    cd "$LANGUAGE_SERVER_DIR"
    npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Language Server build failed"
        exit 1
    fi
    
    print_success "Language Server built successfully"
}

prepare_extension() {
    print_step "Preparing extension..."
    
    cd "$EXTENSION_DIR"
    
    # Update version if specified
    if [ -n "$VERSION" ]; then
        print_step "Updating version to $VERSION..."
        npm version "$VERSION" --no-git-tag-version
    fi
    
    # Prepare language server for bundling
    npm run prepare-language-server
    
    if [ $? -ne 0 ]; then
        print_error "Extension preparation failed"
        exit 1
    fi
    
    print_success "Extension prepared"
}

run_checks() {
    if [ "$SKIP_CHECKS" = false ]; then
        print_step "Running linting and checks..."
        
        cd "$EXTENSION_DIR"
        
        # Run linting
        npm run lint
        if [ $? -ne 0 ]; then
            print_error "Linting failed"
            exit 1
        fi
        
        print_success "Checks passed"
    else
        print_warning "Skipping linting and checks"
    fi
}

run_tests() {
    if [ "$RUN_TESTS" = true ]; then
        print_step "Running tests..."
        
        cd "$EXTENSION_DIR"
        
        # Set environment for headless testing
        export DISPLAY=:99
        export SKIP_NETWORK_TESTS=true
        
        # Start virtual display if on Linux
        if command -v Xvfb &> /dev/null; then
            Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
            XVFB_PID=$!
        fi
        
        # Run tests
        npm test
        TEST_RESULT=$?
        
        # Clean up virtual display
        if [ -n "$XVFB_PID" ]; then
            kill $XVFB_PID 2>/dev/null || true
        fi
        
        if [ $TEST_RESULT -ne 0 ]; then
            print_error "Tests failed"
            exit 1
        fi
        
        print_success "Tests passed"
    else
        print_warning "Skipping tests"
    fi
}

build_extension() {
    print_step "Building extension..."
    
    cd "$EXTENSION_DIR"
    npm run package
    
    if [ $? -ne 0 ]; then
        print_error "Extension build failed"
        exit 1
    fi
    
    print_success "Extension built successfully"
}

package_extension() {
    print_step "Packaging extension..."
    
    cd "$EXTENSION_DIR"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Package with vsce
    vsce package --no-dependencies
    
    if [ $? -ne 0 ]; then
        print_error "Extension packaging failed"
        exit 1
    fi
    
    # Get the generated VSIX name
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    VSIX_NAME="specgofer-${PACKAGE_VERSION}.vsix"
    
    # Move to output directory if different
    if [ "$OUTPUT_DIR" != "$EXTENSION_DIR" ]; then
        mv "$VSIX_NAME" "$OUTPUT_DIR/"
        VSIX_PATH="$OUTPUT_DIR/$VSIX_NAME"
    else
        VSIX_PATH="$EXTENSION_DIR/$VSIX_NAME"
    fi
    
    # Verify VSIX was created
    if [ ! -f "$VSIX_PATH" ]; then
        print_error "VSIX file was not created: $VSIX_PATH"
        exit 1
    fi
    
    print_success "Extension packaged: $VSIX_PATH"
    
    # Show file info
    echo
    echo -e "${BLUE}Package Information:${NC}"
    echo "  Version: $PACKAGE_VERSION"
    echo "  File: $VSIX_PATH"
    echo "  Size: $(du -h "$VSIX_PATH" | cut -f1)"
    echo
}

validate_package() {
    print_step "Validating package..."
    
    # List package contents
    vsce ls "$VSIX_PATH" > /dev/null
    
    if [ $? -ne 0 ]; then
        print_error "Package validation failed"
        exit 1
    fi
    
    print_success "Package validation passed"
}

show_installation_instructions() {
    echo
    echo -e "${GREEN}🎉 Extension packaging completed successfully!${NC}"
    echo
    echo -e "${BLUE}Installation Instructions:${NC}"
    echo
    echo "1. Install via VS Code Command Palette:"
    echo "   - Open VS Code"
    echo "   - Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"
    echo "   - Type: 'Extensions: Install from VSIX...'"
    echo "   - Select: $VSIX_PATH"
    echo
    echo "2. Install via command line:"
    echo "   code --install-extension \"$VSIX_PATH\""
    echo
    echo "3. Publish to marketplace:"
    echo "   vsce publish --packagePath \"$VSIX_PATH\""
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "- Test the extension in VS Code"
    echo "- Update CHANGELOG.md with release notes"
    echo "- Create a git tag for the release"
    echo "- Push to GitHub to trigger automatic publishing"
    echo
}

# Main execution
main() {
    echo -e "${GREEN}SpecGofer Extension Packaging${NC}"
    echo "========================================="
    echo
    
    check_dependencies
    clean_build
    install_dependencies
    build_language_server
    prepare_extension
    run_checks
    run_tests
    build_extension
    package_extension
    validate_package
    show_installation_instructions
}

# Run main function
main "$@"