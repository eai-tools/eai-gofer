#!/bin/bash
echo "🔄 Quick VS Code Reset"
echo "===================="

# Kill VS Code processes
pkill -f "Visual Studio Code" 2>/dev/null || true
sleep 2

# Clear caches
rm -rf ~/Library/Application\ Support/Code/CachedExtensions/*
rm -rf ~/Library/Application\ Support/Code/logs/*
rm -rf ~/Library/Caches/com.microsoft.VSCode*

# Clear workspace storage
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/vscode.workspace-cache-*

echo "✅ VS Code reset complete. Restart VS Code now."
