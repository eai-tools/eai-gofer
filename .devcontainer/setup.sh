#!/bin/bash
set -e

echo "🚀 Setting up SpecGofer development environment..."

# Install uv package manager
echo "📦 Installing uv..."
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH for all sessions
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Install extension dependencies
echo "📦 Installing extension dependencies..."
cd extension && npm install && cd ..

# Install language server dependencies
echo "📦 Installing language server dependencies..."
cd language-server && npm install && cd ..

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps

echo "✅ Development environment setup complete!"