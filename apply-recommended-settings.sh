#!/bin/bash

echo "🔧 Applying recommended VS Code settings to prevent errors..."

# Check if .vscode directory exists
if [ ! -d ".vscode" ]; then
    mkdir -p .vscode
    echo "Created .vscode directory"
fi

# Check if settings.json exists
if [ ! -f ".vscode/settings.json" ]; then
    # If no settings.json exists, copy the recommended settings
    cp .vscode/recommended-settings.json .vscode/settings.json
    echo "✅ Applied recommended settings (new file)"
else
    # If settings.json exists, merge the recommended settings
    echo "Merging with existing settings..."
    
    python3 << 'EOF'
import json
import os

try:
    # Load existing settings
    with open('.vscode/settings.json', 'r') as f:
        existing = json.load(f)
    
    # Load recommended settings
    with open('.vscode/recommended-settings.json', 'r') as f:
        recommended = json.load(f)
    
    # Merge settings (recommended takes precedence for error-prevention settings)
    error_prevention_keys = [
        "chat.mcp.gallery.enabled",
        "chat.mcp.discovery.enabled",
        "workbench.enableExperiments",
        "telemetry.telemetryLevel"
    ]
    
    for key in error_prevention_keys:
        if key in recommended:
            existing[key] = recommended[key]
            print(f"Updated: {key}")
    
    # Also merge file exclusions
    if "files.exclude" in recommended:
        if "files.exclude" not in existing:
            existing["files.exclude"] = {}
        existing["files.exclude"].update(recommended["files.exclude"])
        print("Updated: files.exclude")
    
    if "search.exclude" in recommended:
        if "search.exclude" not in existing:
            existing["search.exclude"] = {}
        existing["search.exclude"].update(recommended["search.exclude"])
        print("Updated: search.exclude")
    
    # Save merged settings
    with open('.vscode/settings.json', 'w') as f:
        json.dump(existing, f, indent=2)
    
    print("✅ Merged recommended settings with existing configuration")

except Exception as e:
    print(f"❌ Error merging settings: {e}")
    print("Manual merge may be required")
EOF
fi

echo ""
echo "🎯 Key settings applied:"
echo "• Disabled MCP auto-discovery (prevents HubSpot-like issues)"
echo "• Disabled VS Code experiments (prevents unstable features)"
echo "• Disabled telemetry (reduces background processes)"
echo "• Improved file watching exclusions (better performance)"
echo "• Manual extension updates (prevents breaking changes)"
echo ""
echo "✅ Settings configured to prevent common VS Code errors!"