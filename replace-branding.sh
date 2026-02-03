#!/bin/bash
set -euo pipefail

# Replace SpecGofer with EAIGofer and specGofer with eaiGofer throughout the codebase

echo "Starting brand replacement: SpecGofer → EAIGofer, specGofer → eaiGofer"

# Find all relevant files (excluding node_modules, .git, dist, out, coverage)
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.sh" -o -name "*.js" -o -name "*.mjs" -o -name "*.html" -o -name "*.txt" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/out/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.vscode-test/*" \
  -not -path "*/playwright-report/*" \
  -not -path "*/.specify/logs/*" \
  -not -path "*/docs/releases/*" \
  -not -name "replace-branding.sh" \
  -print0 | while IFS= read -r -d '' file; do
    # Check if file contains either pattern
    if grep -q "SpecGofer\|specGofer" "$file" 2>/dev/null; then
      echo "Processing: $file"
      # Use sed to replace both patterns
      # macOS/BSD sed needs -i '' while GNU sed needs -i
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' -e 's/SpecGofer/EAIGofer/g' -e 's/specGofer/eaiGofer/g' "$file"
      else
        sed -i -e 's/SpecGofer/EAIGofer/g' -e 's/specGofer/eaiGofer/g' "$file"
      fi
    fi
  done

echo "✅ Replacement complete!"
echo ""
echo "Summary:"
echo "  SpecGofer → EAIGofer"
echo "  specGofer → eaiGofer"
echo ""
echo "Please review the changes with: git diff"
