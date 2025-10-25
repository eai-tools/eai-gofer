# AI Agent Guidelines for Code and Documentation Quality

This document provides guidelines for AI agents (Claude, Copilot, etc.) working on this project to ensure all generated code and documentation is lint-error free.

## Table of Contents

- [General Principles](#general-principles)
- [Markdown Linting (markdownlint)](#markdown-linting-markdownlint)
- [TypeScript Linting (ESLint)](#typescript-linting-eslint)
- [Code Formatting (Prettier)](#code-formatting-prettier)
- [Git Commit Messages](#git-commit-messages)
- [Testing Requirements](#testing-requirements)

## General Principles

### Before Writing Code or Documentation

1. **Understand the context**: Read existing code/documentation in the same area to match the style
2. **Check linting rules**: Review `.markdownlintrc`, `eslint.config.mjs`, and `.prettierrc` files
3. **Run linters before committing**: Always validate your changes before suggesting them
4. **Fix, don't ignore**: Address linting errors rather than adding ignore comments

### Quality Standards

- **Zero tolerance for linting errors**: All code and documentation must pass linting
- **Type safety**: Use explicit types in TypeScript, avoid `any` unless absolutely necessary
- **Documentation**: Keep README files, comments, and JSDoc up to date
- **Test coverage**: Maintain or improve test coverage with new code

## Markdown Linting (markdownlint)

### Configuration

The project uses markdownlint with rules defined in `.markdownlintrc`. Key rules:

### Common Rules and Fixes

#### MD022: Blanks around headings

**Rule**: Headings must be surrounded by blank lines.

**Bad**:

```markdown
## Heading
Content starts immediately
```

**Good**:

```markdown
## Heading

Content starts after blank line
```

#### MD032: Blanks around lists

**Rule**: Lists must be surrounded by blank lines.

**Bad**:

```markdown
Some text
- List item 1
- List item 2
More text
```

**Good**:

```markdown
Some text

- List item 1
- List item 2

More text
```

#### MD040: Fenced code language

**Rule**: Fenced code blocks must specify a language.

**Bad**:

\`\`\`
code here
\`\`\`

**Good**:

```typescript
code here
```

or

```bash
command here
```

#### MD036: No emphasis as heading

**Rule**: Don't use emphasis (bold/italic) instead of proper headings.

**Bad**:

```markdown
**This is a section**

Content here
```

**Good**:

```markdown
### This is a section

Content here
```

#### MD009: No trailing spaces

**Rule**: Lines should not have trailing spaces (except 2 spaces for line breaks).

**Fix**: Remove trailing whitespace from all lines.

#### MD012: No multiple blank lines

**Rule**: Use only single blank lines between content.

**Bad**:

```markdown
Paragraph 1


Paragraph 2
```

**Good**:

```markdown
Paragraph 1

Paragraph 2
```

#### MD031: Blanks around fences

**Rule**: Fenced code blocks must be surrounded by blank lines.

**Bad**:

```markdown
Text before
\`\`\`bash
code
\`\`\`
Text after
```

**Good**:

```markdown
Text before

\`\`\`bash
code
\`\`\`

Text after
```

### How to Write Lint-Free Markdown

1. **Always add blank lines**:
   - After headings
   - Before and after lists
   - Before and after code blocks
   - Between sections

2. **Always specify code block languages**:
   - Use `bash`, `typescript`, `javascript`, `json`, `text`, `markdown`, etc.
   - Never use plain ``` without a language

3. **Use proper heading levels**:
   - Don't skip levels (h1 → h3)
   - Don't use bold text as headings
   - Structure: h1 (title) → h2 (major sections) → h3 (subsections)

4. **Clean up whitespace**:
   - No trailing spaces
   - No multiple consecutive blank lines
   - Consistent indentation (2 or 4 spaces)

## TypeScript Linting (ESLint)

### Configuration

The project uses ESLint with TypeScript support configured in `eslint.config.mjs`.

### Common Rules and Fixes

#### @typescript-eslint/explicit-function-return-type

**Rule**: Functions must have explicit return types.

**Bad**:

```typescript
function getName() {
  return "John";
}
```

**Good**:

```typescript
function getName(): string {
  return "John";
}
```

**For test functions**:

```typescript
describe('test suite', (): void => {
  it('should do something', (): void => {
    expect(true).toBe(true);
  });
});
```

#### @typescript-eslint/no-explicit-any

**Rule**: Avoid using `any` type.

**Bad**:

```typescript
function process(data: any): void {
  console.log(data);
}
```

**Good**:

```typescript
function process(data: unknown): void {
  console.log(data);
}

// Or with proper types
interface ProcessData {
  id: string;
  name: string;
}

function process(data: ProcessData): void {
  console.log(data);
}
```

**When `any` is unavoidable**: Use `unknown` and narrow with type guards, or use proper generic types.

#### @typescript-eslint/no-var-requires

**Rule**: Use ES6 imports instead of `require()`.

**Bad**:

```typescript
const fs = require('fs');
```

**Good**:

```typescript
import * as fs from 'fs';
// or
import fs from 'fs';
```

#### @typescript-eslint/no-unused-vars

**Rule**: Remove unused variables and imports.

**Bad**:

```typescript
import { foo, bar } from './utils';

function test(): void {
  console.log(foo);
  // 'bar' is imported but never used
}
```

**Good**:

```typescript
import { foo } from './utils';

function test(): void {
  console.log(foo);
}
```

### How to Write Lint-Free TypeScript

1. **Always add return types**:
   - For all functions and methods
   - For arrow functions
   - For test functions (use `: void`)

2. **Avoid `any`**:
   - Use `unknown` for truly unknown types
   - Create proper interfaces/types
   - Use generics where appropriate

3. **Use ES6 imports**:
   - Never use `require()`
   - Import only what you need
   - Remove unused imports

4. **Handle implicit any**:
   - Add types to function parameters
   - Add types to variables when not obvious
   - Configure tsconfig.json with `"noImplicitAny": true`

5. **Use strict mode**:
   - Enable `"strict": true` in tsconfig.json
   - Fix all strict mode errors

## Code Formatting (Prettier)

### Configuration

The project uses Prettier for code formatting. Configuration in `.prettierrc`.

### Key Settings

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### How to Ensure Proper Formatting

1. **Run Prettier before committing**:

   ```bash
   npm run format
   ```

2. **Let Prettier handle**:
   - Line length
   - Indentation
   - Semicolons
   - Quote style
   - Trailing commas

3. **Don't fight Prettier**: Accept its formatting decisions to maintain consistency

## Git Commit Messages

### Format

```text
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, build changes

### Examples

```bash
feat(language-server): add spec caching layer

Implement in-memory caching for parsed specs to improve performance.
Invalidates cache on file changes using file system watcher.

Closes #123
```

```bash
fix(extension): resolve markdown lint errors in README

- Add blank lines around headings
- Specify languages for all code blocks
- Fix emphasis used as headings
```

## Testing Requirements

### Test File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('ComponentName', (): void => {
  beforeEach((): void => {
    // Setup
  });

  afterEach((): void => {
    // Cleanup
  });

  it('should do something specific', (): void => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Coverage Requirements

- Minimum coverage: 80%
- Critical paths: 100%
- Run coverage: `npm test -- --coverage`

## Checklist for AI Agents

Before suggesting code or documentation changes:

### For Markdown Files

- [ ] All headings have blank lines before and after
- [ ] All lists have blank lines before and after
- [ ] All code blocks have a language specified
- [ ] All code blocks have blank lines before and after
- [ ] No trailing spaces
- [ ] No multiple consecutive blank lines
- [ ] No emphasis used as headings
- [ ] Proper heading hierarchy (no skipped levels)

### For TypeScript Files

- [ ] All functions have explicit return types
- [ ] No use of `any` type (use `unknown` or proper types)
- [ ] No `require()` statements (use ES6 imports)
- [ ] No unused variables or imports
- [ ] All parameters have explicit types
- [ ] Code follows existing patterns in the codebase
- [ ] Tests added/updated for new functionality
- [ ] JSDoc comments for public APIs

### For All Changes

- [ ] Run `npm run lint` and fix all errors
- [ ] Run `npm run format` to format code
- [ ] Run `npm test` and ensure all tests pass
- [ ] Update relevant documentation
- [ ] Add/update tests for new functionality
- [ ] Commit message follows conventions

## Commands Reference

### Linting

```bash
# Run all linters
npm run lint

# Run markdown linter
npm run lint:md

# Run TypeScript linter
npm run lint:ts

# Fix auto-fixable issues
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.test.ts
```

### Building

```bash
# Build extension
cd extension && npm run compile

# Build language server
cd language-server && npm run compile

# Build everything
npm run build
```

## Troubleshooting

### "Multiple consecutive blank lines" error

**Problem**: Too many blank lines between sections

**Fix**: Use only one blank line between content blocks

### "Fenced code blocks should have a language specified"

**Problem**: Code block without language: ` ``` `

**Fix**: Add language: ` ```typescript ` or ` ```bash ` or ` ```text `

### "Missing return type on function"

**Problem**: Function without return type

**Fix**: Add return type annotation

```typescript
// Before
function test() { }

// After
function test(): void { }
```

### "Unexpected any"

**Problem**: Using `any` type

**Fix**: Use proper types or `unknown`

```typescript
// Before
function handle(data: any) { }

// After
function handle(data: unknown) { }
```

## Additional Resources

- [Markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Remember**: Quality over speed. Taking time to write lint-free code saves time in code review and maintenance.
