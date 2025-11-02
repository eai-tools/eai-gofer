# SpecGofer Development Guidelines for Claude

This file contains specific guidelines for Claude when working on the SpecGofer
project.

**IMPORTANT**: For complete linting, formatting, and code quality guidelines,
see [AGENTS.md](./AGENTS.md).

## Critical Rules

### 🚨 NEVER Manually Release - ALWAYS Use release-auto.sh

**When the user asks you to create a release, cut a release, or bump the
version:**

```bash
# For bug fixes (2.0.4 -> 2.0.5)
./release-auto.sh patch "Fixed bug with X"

# For new features (2.0.5 -> 2.1.0)
./release-auto.sh minor "Added feature Y"

# For breaking changes (2.0.5 -> 3.0.0)
./release-auto.sh major "Breaking: Changed API Z"
```

**NEVER run these commands manually:**

- ❌ `npm version major|minor|patch`
- ❌ `npx @vscode/vsce package`
- ❌ `git tag v2.x.x`
- ❌ `gh release create v2.x.x`
- ❌ Manual edits to version in package.json
- ❌ Manual edits to docs/releases.json

**Why?** The release script (`release-auto.sh`) ensures:

1. ✅ All package.json files stay in sync (root, extension, language-server)
2. ✅ CHANGELOG.md is properly updated with the release notes
3. ✅ VSIX package is built with the current code
4. ✅ VSIX is copied to docs/releases/ for GitHub Pages hosting
5. ✅ docs/releases.json is updated for extension auto-updater
6. ✅ Tests and linting pass before release
7. ✅ Git tag is created and pushed
8. ✅ GitHub release is created with the VSIX file
9. ✅ GitHub Pages deployment happens automatically

**What happens if you ignore this?**

- Users won't see the new version in the extension auto-updater
- The VSIX file won't be available for download
- The changelog won't be updated
- Version numbers will be out of sync across files
- You'll have to manually fix everything later

### Version Detection

The extension version is read from `extension/package.json` at runtime via
`config.ts`:

```typescript
// extension/src/config.ts
export const EXTENSION_VERSION = require('../../package.json').version;
```

**NEVER hardcode the version** in config.ts or anywhere else. It must always
read from package.json.

## Project Structure

This is a monorepo with three main packages:

```text
spec-driven-dev-system/
├── extension/              # VSCode extension
│   ├── src/               # Extension source code
│   ├── package.json       # Extension manifest (version here!)
│   └── CHANGELOG.md       # User-facing changelog
├── language-server/       # Language Server Protocol implementation
│   ├── src/
│   └── package.json       # LSP server package
├── docs/                  # GitHub Pages content
│   ├── releases/          # VSIX files for distribution
│   └── releases.json      # Auto-updater version info
├── package.json           # Root package (keep in sync)
├── AGENTS.md              # Complete AI agent guidelines
└── release-auto.sh        # Release automation script
```

## Technologies

- **Language**: TypeScript
- **Framework**: VSCode Extension API
- **Language Server**: vscode-languageclient/vscode-languageserver
- **Testing**: Vitest for unit tests, Playwright for E2E
- **Build**: Webpack for bundling
- **Packaging**: @vscode/vsce for VSIX creation

## Common Tasks

### Development

```bash
# Install dependencies
npm install

# Compile extension
cd extension && npm run compile

# Run in watch mode
cd extension && npm run watch

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Release Process (CRITICAL)

**Only use the release automation script:**

```bash
# Patch release (bug fixes)
./release-auto.sh patch "Optional commit message"

# Minor release (new features)
./release-auto.sh minor "Optional commit message"

# Major release (breaking changes)
./release-auto.sh major "Optional commit message"
```

The script will:

1. Ask for confirmation
2. Bump versions in all package.json files
3. Update CHANGELOG.md
4. Build and package the extension
5. Run tests and linting
6. Copy VSIX to docs/releases/
7. Update docs/releases.json
8. Commit, tag, and push
9. Create GitHub release
10. Trigger GitHub Pages deployment

### Upgrading the Extension

Users can upgrade via:

1. **Auto-update check**: Extension checks GitHub Pages `releases.json` every 24
   hours
2. **Manual check**: Command Palette → "SpecGofer: Check for Updates"
3. **Manual install**: Download VSIX from GitHub releases or GitHub Pages

The auto-updater reads from:
`https://eai-tools.github.io/specgofer/releases.json`

## Code Style Guidelines

**See [AGENTS.md](./AGENTS.md) for complete guidelines**. Key points:

- Use explicit return types for all functions
- Avoid `any` type (use `unknown` or proper types)
- Use ES6 imports, never `require()`
- Follow conventional commit messages
- All markdown must pass markdownlint
- All TypeScript must pass ESLint
- Format with Prettier before committing

## Testing

- Unit tests: `tests/unit/**/*.test.ts`
- Integration tests: `tests/integration/**/*.test.ts`
- E2E tests: `tests/e2e/**/*.spec.ts`

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- path/to/test.test.ts
```

## SpecGofer-Specific Conventions

### Path Conventions

SpecGofer uses `.specify/specs/` instead of SpecKit's default `specs/` location:

- Specs: `.specify/specs/`
- Templates: `.specify/templates/`
- Scripts: `.specify/scripts/`
- Constitution: `.specify/memory/constitution.md`

### Upgrade Process

The `specKitMigrator.ts` handles upgrades:

- `fixSpecPathReferences()`: Updates path references from `specs/` to
  `.specify/specs/`
- `fixExistingSpecs()`: Adds YAML frontmatter and checkbox tasks
- `installSpecKitCLI()`: Installs CLI tools and templates

### Commands vs Scripts

- Claude commands: Stay in `.claude/commands/` (SpecGofer convention)
- Bash scripts: In `.specify/scripts/bash/`
- During upgrade: Fix path references in content, don't move files

## Recent Changes

- 006-test-feature: Added TypeScript 5.3+, Node.js 20.x LTS + Dagger SDK for
  TypeScript, @vscode/test-electron, VSCode Extension API

- 001-memory-learning-system: Added TypeScript 5.3+ (existing SpecGofer
  codebase)

### v2.0.4 (Latest)

- Fixed path reference updating during upgrade (content-based, no file moving)

### v2.0.3

### v2.0.2

## Important Files to Know

- `extension/src/config.ts`: Extension configuration and version
- `extension/src/specKitMigrator.ts`: Handles upgrades and migrations
- `extension/src/autoUpdater.ts`: Auto-update checking logic
- `extension/src/progressProvider.ts`: Tree view provider for specs
- `docs/releases.json`: Version info for auto-updater
- `release-auto.sh`: Release automation script (USE THIS!)

## When in Doubt

1. Check [AGENTS.md](./AGENTS.md) for code quality guidelines
2. Use `./release-auto.sh` for all releases
3. Run `npm run lint` before committing
4. Ask the user if you're unsure about approach

---

**Remember**: The release automation script is there to prevent mistakes. Always
use it for releases, no exceptions!

## Active Technologies

- TypeScript 5.3+, Node.js 20.x LTS + Dagger SDK for TypeScript,
  @vscode/test-electron, VSCode Extension API (006-test-feature)
- File-based test data versioning in `.specify/test-data/`, Dagger cache for
  artifacts (006-test-feature)

- TypeScript 5.3+ (existing SpecGofer codebase) (001-memory-learning-system)
