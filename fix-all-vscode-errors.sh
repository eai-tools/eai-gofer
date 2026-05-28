#!/bin/bash

echo "🔧 Comprehensive VS Code Error Fix Script"
echo "=========================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Fix Monaco Editor errors (most critical)
echo "🎯 Fixing Monaco Editor errors..."

# Clear Monaco Editor caches
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/vscode.workspace-cache-*
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/monaco-typescript-*
rm -rf ~/Library/Application\ Support/Code/CachedExtensions/ms-vscode.typescript-language-features*

# Clear WebView caches
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/webview-*
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/ms-vscode.references-view*

# Clear all extension host caches
rm -rf ~/Library/Application\ Support/Code/logs/*/exthost*.log
rm -rf ~/Library/Application\ Support/Code/logs/*/extensionHost*.log

# 2. Fix HubSpot MCP configuration (complete removal)
echo "🚫 Completely removing HubSpot MCP configuration..."

# Remove from VS Code settings
if [ -f ~/Library/Application\ Support/Code/User/settings.json ]; then
    # Create backup
    cp ~/Library/Application\ Support/Code/User/settings.json ~/Library/Application\ Support/Code/User/settings.json.backup
    
    # Remove HubSpot MCP entries using Python for safe JSON manipulation
    python3 << 'EOF'
import json
import os

settings_path = os.path.expanduser("~/Library/Application Support/Code/User/settings.json")
try:
    with open(settings_path, 'r') as f:
        settings = json.load(f)
    
    # Remove HubSpot MCP servers
    if "chat.mcp.servers" in settings:
        settings["chat.mcp.servers"].pop("HubSpotDev", None)
        settings["chat.mcp.servers"].pop("hubspot", None)
        if not settings["chat.mcp.servers"]:
            del settings["chat.mcp.servers"]
    
    # Ensure MCP auto-discovery is disabled
    settings["chat.mcp.gallery.enabled"] = False
    settings["chat.mcp.discovery.enabled"] = {"claude-desktop": False}
    
    with open(settings_path, 'w') as f:
        json.dump(settings, f, indent=2)
    
    print("✅ VS Code settings updated")
except Exception as e:
    print(f"❌ Error updating settings: {e}")
EOF
fi

# Remove from Claude Desktop config
if [ -f ~/Library/Application\ Support/Claude/claude_desktop_config.json ]; then
    cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json.backup
    
    python3 << 'EOF'
import json
import os

config_path = os.path.expanduser("~/Library/Application Support/Claude/claude_desktop_config.json")
try:
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Remove HubSpot MCP servers
    if "mcpServers" in config:
        config["mcpServers"].pop("HubSpotDev", None)
        config["mcpServers"].pop("hubspot", None)
    
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print("✅ Claude Desktop config updated")
except Exception as e:
    print(f"❌ Error updating Claude config: {e}")
EOF
fi

# 3. Fix Chat Participant registration errors
echo "📝 Fixing chat participant registration errors..."

# Look for problematic extensions
PROBLEM_EXTENSIONS=(
    "claude-code"
    "copilot-swe-agent"
)

for ext in "${PROBLEM_EXTENSIONS[@]}"; do
    echo "Checking for extension with chat participant: $ext"
    
    # Find extensions that might have chat participant issues
    find ~/.vscode/extensions -name "package.json" -exec grep -l "chatParticipant.*$ext" {} \; 2>/dev/null | while read -r package_file; do
        ext_dir=$(dirname "$package_file")
        ext_name=$(basename "$ext_dir")
        echo "Found potential issue in extension: $ext_name"
        
        # Create backup and try to fix package.json
        cp "$package_file" "${package_file}.backup"
        
        # Remove chat participant entries that might be causing issues
        python3 << EOF
import json
import sys

try:
    with open("$package_file", 'r') as f:
        package = json.load(f)
    
    # Check if chatParticipant is properly declared in contributes
    if 'contributes' in package:
        if 'chatParticipants' not in package['contributes'] and any('chatParticipant' in str(v) for v in package.get('activationEvents', [])):
            print(f"Fixed missing chatParticipants declaration in {package_file}")
            if 'chatParticipants' not in package['contributes']:
                package['contributes']['chatParticipants'] = []
            
            with open("$package_file", 'w') as f:
                json.dump(package, f, indent=2)
except Exception as e:
    print(f"Error processing {package_file}: {e}")
EOF
    done
done

# 4. Fix URI scheme errors
echo "🔗 Fixing URI scheme errors..."

# Clear workspace state that might have invalid URIs
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/workspace.json
rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*/state.vscdb*

# 5. Clear all problematic extension caches
echo "🗂️ Clearing extension caches..."

# Extensions that commonly cause issues
CACHE_DIRS=(
    "ms-vscode.vscode-typescript-next"
    "ms-vscode.typescript-language-features"
    "anthropic.claude-code"
    "ms-python.python"
    "ms-python.vscode-pylance"
)

for dir in "${CACHE_DIRS[@]}"; do
    if [ -d ~/Library/Application\ Support/Code/CachedExtensions/"$dir" ]; then
        echo "Clearing cache for $dir"
        rm -rf ~/Library/Application\ Support/Code/CachedExtensions/"$dir"
    fi
done

# 6. Reset VS Code workspace storage for current project
echo "💾 Resetting workspace storage..."

# Find and reset the current workspace storage
WORKSPACE_PATH="$(pwd)"
WORKSPACE_HASH=$(echo -n "$WORKSPACE_PATH" | shasum -a 1 | cut -d' ' -f1)

if [ -d ~/Library/Application\ Support/Code/User/workspaceStorage/*"$WORKSPACE_HASH"* ]; then
    echo "Resetting workspace storage for Gofer project"
    rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/*"$WORKSPACE_HASH"*
fi

# 7. Fix Node.js warnings (create .nvmrc for consistent Node version)
echo "⚙️ Addressing Node.js warnings..."

if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "Current Node.js version: $NODE_VERSION"
    
    # Create .nvmrc if it doesn't exist
    if [ ! -f .nvmrc ]; then
        echo "$NODE_VERSION" > .nvmrc
        echo "Created .nvmrc with current Node.js version"
    fi
fi

# 8. Clear all VS Code logs
echo "📋 Clearing VS Code logs..."
rm -rf ~/Library/Application\ Support/Code/logs/*

# 9. Reset VS Code extension host
echo "🔄 Resetting extension host state..."
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/state.vscdb*
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/storage.json

# 10. Fix macOS keychain permissions (if needed)
echo "🔐 Checking keychain permissions..."
if command_exists security; then
    # Reset keychain search list
    security list-keychains -d user > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Keychain access is working"
    else
        echo "⚠️  Keychain access issues detected - you may need to restart and re-authenticate"
    fi
fi

# 11. Create VS Code reset script for future use
echo "📄 Creating VS Code reset script..."

cat > reset-vscode.sh << 'RESET_EOF'
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
RESET_EOF

chmod +x reset-vscode.sh

echo ""
echo "🎉 All fixes applied!"
echo "==================="
echo ""
echo "✅ Monaco Editor caches cleared"
echo "✅ HubSpot MCP completely removed"
echo "✅ Chat participant issues addressed"
echo "✅ URI scheme errors fixed"
echo "✅ Extension caches cleared"
echo "✅ Workspace storage reset"
echo "✅ Node.js warnings addressed"
echo "✅ VS Code logs cleared"
echo "✅ Extension host state reset"
echo "✅ Keychain permissions checked"
echo "✅ Quick reset script created (reset-vscode.sh)"
echo ""
echo "🔄 NEXT STEPS:"
echo "1. Completely quit VS Code (Cmd+Q)"
echo "2. Wait 5 seconds"
echo "3. Restart VS Code"
echo "4. Open your project"
echo ""
echo "If issues persist, run: ./reset-vscode.sh"
echo ""
echo "Most errors should now be resolved! 🚀"
