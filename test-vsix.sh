#!/bin/bash
# Test VSIX Installation Script
set -e

VSIX_FILE="/Users/douglaswross/Code/specgofer/specgofer-3.0.17.vsix"

echo "🔧 Installing SpecGofer v3.0.17..."

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
echo "   Then try: 'SpecGofer: Start Claude Code Terminal'"
