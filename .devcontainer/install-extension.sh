#!/bin/bash
set -e

echo "🔌 Installing SpecGofer extension..."

# Try to install from GitHub releases
install_from_github() {
  echo "   Attempting to install from GitHub releases..."
  RELEASES_JSON="https://eai-tools.github.io/specgofer/releases.json"
  
  # Try to get latest version
  LATEST_VERSION=$(curl -s "$RELEASES_JSON" 2>/dev/null | grep -o '"latest_version": "[^"]*"' | cut -d'"' -f4)
  
  if [ -n "$LATEST_VERSION" ]; then
    VSIX_URL="https://eai-tools.github.io/specgofer/releases/specgofer-${LATEST_VERSION}.vsix"
    VSIX_FILE="/tmp/specgofer-${LATEST_VERSION}.vsix"
    
    echo "   Downloading version $LATEST_VERSION..."
    if curl -L -o "$VSIX_FILE" "$VSIX_URL" 2>/dev/null; then
      echo "   Installing extension..."
      if code --install-extension "$VSIX_FILE" --force; then
        rm "$VSIX_FILE"
        echo "✅ SpecGofer extension v$LATEST_VERSION installed from GitHub releases!"
        return 0
      fi
    fi
  fi
  
  echo "⚠️  Could not install from GitHub releases"
  return 1
}

# Build and install from local source
install_from_source() {
  echo "   Building extension from source..."
  cd /workspaces/specgofer/extension
  
  # Build the extension
  if npm run compile 2>/dev/null && npx @vscode/vsce package --out /tmp/specgofer-local.vsix 2>/dev/null; then
    echo "   Installing locally built extension..."
    if code --install-extension /tmp/specgofer-local.vsix --force; then
      rm /tmp/specgofer-local.vsix
      echo "✅ SpecGofer extension installed from local build!"
      cd /workspaces/specgofer
      return 0
    fi
  fi
  
  cd /workspaces/specgofer
  echo "❌ Failed to build and install extension from source"
  return 1
}

# Check if extension is already installed
if code --list-extensions 2>/dev/null | grep -q "EnterpriseAI.specgofer"; then
  echo "ℹ️  SpecGofer extension already installed, reinstalling to ensure latest version..."
  code --uninstall-extension EnterpriseAI.specgofer 2>/dev/null || true
fi

# Try GitHub releases first, fall back to local build
if ! install_from_github; then
  echo "   Falling back to local build..."
  if ! install_from_source; then
    echo "❌ Failed to install SpecGofer extension"
    echo "   You can manually install by running:"
    echo "   cd /workspaces/specgofer && ./test-vsix.sh"
    exit 1
  fi
fi

echo "✅ SpecGofer extension installation complete!"
