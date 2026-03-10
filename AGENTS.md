# AI Agent Code Quality Guidelines

## TypeScript Rules

- **Explicit return types** on all functions: `function foo(): string {}`
- **No `any`** - use `unknown` or proper interfaces
- **ES6 imports only** - never `require()`
- **Remove unused** variables and imports
- **Strict mode** enabled in tsconfig

## Markdown Rules

- Blank lines around headings, lists, and code blocks
- Always specify language on fenced code blocks (typescript, bash, text)
- Use proper heading hierarchy (no skipped levels, no bold-as-heading)
- No trailing spaces, no multiple consecutive blank lines

## Formatting (Prettier)

Config: `{ semi: true, trailingComma: "es5", singleQuote: true, printWidth: 100, tabWidth: 2 }`
Run `npm run format` before committing. Don't fight Prettier.

## Git Commits

Format: `type(scope): subject` where type is feat|fix|docs|style|refactor|test|chore.

## Testing

- Unit: `tests/unit/**/*.test.ts`, Integration: `tests/integration/**/*.test.ts`
- Use Arrange/Act/Assert pattern. Add `: void` return types to test functions.
- Minimum 80% coverage, 100% on critical paths

## Commands

```bash
npm run lint          # Run all linters
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format all files
npm test              # Run all tests
npm test -- --coverage  # With coverage
cd extension && npm run compile  # Build extension
```

## Pre-Commit Checklist

1. `npm run lint` passes
2. `npm run format` applied
3. `npm test` passes
4. No `any` types, no `require()`, no unused imports
5. All functions have explicit return types
6. Commit message follows conventional format

**Releases**: ALWAYS use `./release-auto.sh patch|minor|major "message"`. Never manually bump versions.
