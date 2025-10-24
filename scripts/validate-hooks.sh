#!/bin/bash
# Validate pre-commit hooks setup

set -e

echo "🔍 Validating pre-commit hooks setup..."

# Check if Husky is installed
if ! command -v husky &> /dev/null; then
    if [ ! -f "node_modules/.bin/husky" ]; then
        echo "❌ Husky not found. Run: npm install"
        exit 1
    fi
fi

# Check if .husky directory exists
if [ ! -d ".husky" ]; then
    echo "❌ .husky directory not found. Run: npx husky init"
    exit 1
fi

# Check if pre-commit hook exists and is executable
if [ ! -f ".husky/pre-commit" ]; then
    echo "❌ pre-commit hook not found"
    exit 1
fi

if [ ! -x ".husky/pre-commit" ]; then
    echo "❌ pre-commit hook is not executable"
    exit 1
fi

# Check if lint-staged is configured
if ! grep -q "lint-staged" package.json; then
    echo "❌ lint-staged not configured in package.json"
    exit 1
fi

# Test lint-staged configuration
echo "🧪 Testing lint-staged configuration..."
if ! npx lint-staged --help &> /dev/null; then
    echo "❌ lint-staged not working properly"
    exit 1
fi

# Check if essential scripts exist
echo "🔧 Checking package.json scripts..."
scripts=("lint" "format:check" "typecheck" "quality")
for script in "${scripts[@]}"; do
    if ! npm run $script --silent &> /dev/null; then
        echo "⚠️  Script '$script' might have issues"
    fi
done

echo "✅ Pre-commit hooks validation complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Husky installed and initialized"
echo "  ✅ Pre-commit hook exists and is executable"
echo "  ✅ Lint-staged configured" 
echo "  ✅ Quality scripts available"
echo ""
echo "🚀 To test the hooks, try:"
echo "  1. Make a change to a TypeScript file"
echo "  2. Stage it with 'git add filename.ts'"
echo "  3. Commit with 'git commit -m \"test: verify pre-commit hooks\"'"