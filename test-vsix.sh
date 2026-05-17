#!/bin/bash
# Test VSIX Installation Script
set -e

# If VSIX file passed as argument, use it; otherwise find the latest one
if [ -n "$1" ]; then
    VSIX_FILE="$1"
else
    # Find the most recent VSIX file in the current directory
    VSIX_FILE=$(ls -t eai-gofer-*.vsix 2>/dev/null | head -1)
    if [ -z "$VSIX_FILE" ]; then
        echo "❌ No VSIX file found!"
        exit 1
    fi
    VSIX_FILE="/Users/douglaswross/Code/eai-gofer/$VSIX_FILE"
fi

# Extract version from filename
VERSION=$(basename "$VSIX_FILE" | sed 's/eai-gofer-\(.*\)\.vsix/\1/')

echo "🔧 Installing Gofer v$VERSION..."

# Find the code command
if command -v code &> /dev/null; then
    CODE_CMD="code"
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CODE_CMD="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
    echo "❌ VSCode 'code' command not found!"
    exit 1
fi

echo "✅ Found VSCode at: $CODE_CMD"
echo "📦 Installing extension..."
"$CODE_CMD" --install-extension "$VSIX_FILE" --force

echo ""
echo "✅ Installation complete!"
echo ""
echo "🔄 Please reload VSCode:"
echo "   Cmd+Shift+P → 'Developer: Reload Window'"
echo "   Then try: 'Gofer: Start Claude Code Terminal'"
