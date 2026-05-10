#!/bin/bash

# Script to remove HubSpot MCP server from VS Code

SETTINGS_FILE="$HOME/Library/Application Support/Code/User/settings.json"

echo "Fixing HubSpot MCP issue in VS Code..."

# Create a backup
cp "$SETTINGS_FILE" "$SETTINGS_FILE.backup-$(date +%Y%m%d-%H%M%S)"

# Use sed to disable Claude Desktop MCP discovery
sed -i '' 's/"claude-desktop": true/"claude-desktop": false/' "$SETTINGS_FILE"

echo "✅ Disabled Claude Desktop MCP discovery in VS Code"
echo "✅ Backup created at: $SETTINGS_FILE.backup-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "Now restart VS Code to apply the changes."
echo ""
echo "If you still see HubSpot MCP errors, run:"
echo "  rm -rf ~/Library/Application Support/Code/CachedExtensions"
echo "  rm -rf ~/Library/Application Support/Code/logs"
echo ""
echo "Alternative: Open VS Code settings (Cmd+,) and search for 'mcp discovery'"
echo "Then disable 'Chat › MCP › Discovery › Enabled: Claude Desktop'"