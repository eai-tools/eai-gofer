#!/bin/bash

# Script to fix VS Code errors and clean up configuration

echo "🔧 Fixing VS Code errors and cleaning up configuration..."

# 1. Clear Monaco Editor cache and webview cache
echo "1. Clearing Monaco Editor and WebView caches..."
rm -rf ~/Library/Application\ Support/Code/CachedExtensions
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/monaco-*
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/webview-*

# 2. Remove problematic extension references
echo "2. Cleaning up extension references..."
# Check if openai.chatgpt extension is installed and offer to remove it
if ls ~/.vscode/extensions/openai.chatgpt* >/dev/null 2>&1; then
    echo "Found OpenAI ChatGPT extension that's causing API errors."
    echo "Consider uninstalling it: code --uninstall-extension openai.chatgpt"
fi

# 3. Clean up MCP configuration
echo "3. Cleaning up MCP configuration..."
SETTINGS_FILE="$HOME/Library/Application Support/Code/User/settings.json"

# Remove any orphaned MCP references
if grep -q "pylanceMcp" "$SETTINGS_FILE" 2>/dev/null; then
    echo "Found orphaned Pylance MCP references in settings"
    # Create backup
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup-$(date +%Y%m%d-%H%M%S)"
    # Remove problematic Pylance MCP entries (this would need manual editing)
    echo "Manual action needed: Check VS Code settings for pylanceMcp references"
fi

# 4. Clear VS Code logs
echo "4. Clearing VS Code logs..."
rm -rf ~/Library/Application\ Support/Code/logs/*

# 5. Reset webview and extension host cache
echo "5. Resetting extension host cache..."
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/ms-vscode.vscode-json/
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/ms-vscode.vscode-json/

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Restart VS Code completely (Cmd+Q, then reopen)"
echo "2. If Monaco Editor errors persist, try: Help > Reset Zoom (Cmd+Numpad0)"
echo "3. If you see OpenAI ChatGPT extension errors, uninstall it:"
echo "   code --uninstall-extension openai.chatgpt"
echo ""
echo "The HubSpot MCP errors should stop appearing after VS Code restarts."